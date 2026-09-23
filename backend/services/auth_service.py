"""Catenda adapter, identity resolution and bounded membership cache."""

import os
from datetime import UTC, datetime
from urllib.parse import urlsplit

from lib.auth.catenda_oauth import CatendaOAuth, CatendaUnavailable
from lib.auth.domain import catenda_id, reconciliation_changes
from repositories.auth_repository import utcnow


class AuthService:
    def __init__(self, repo=None, oauth=None):
        if repo is None:
            from core.container import get_container

            repo = get_container().auth_repository
        self.repo = repo
        self.oauth = oauth or CatendaOAuth(
            os.getenv("CATENDA_CLIENT_ID", ""),
            os.getenv("CATENDA_CLIENT_SECRET", ""),
            os.getenv("CATENDA_LOGIN_REDIRECT_URI", ""),
        )
        self.frontend_url = os.getenv("AUTH_FRONTEND_URL", "").rstrip("/")
        self.max_age = int(os.getenv("AUTH_MEMBERSHIP_MAX_AGE_SECONDS", "900"))
        if not 60 <= self.max_age <= 3600:
            raise ValueError("Membership cache lifetime must be 60–3600 seconds")

    def validate_config(self):
        for value in (self.frontend_url, self.oauth.redirect_uri):
            url = urlsplit(value)
            local = os.getenv("APP_ENV") == "development" and url.hostname in {
                "localhost",
                "127.0.0.1",
            }
            if (
                not url.netloc
                or url.username
                or url.password
                or url.query
                or url.fragment
                or (url.scheme != "https" and not (local and url.scheme == "http"))
            ):
                raise ValueError("Configure static HTTPS authentication URLs")
        if urlsplit(self.frontend_url).path not in {"", "/"}:
            raise ValueError("AUTH_FRONTEND_URL must be an origin")
        if not self.oauth.client_id or not self.oauth.client_secret:
            raise ValueError("Catenda application credentials missing")

    def login(self, token):
        user = self.oauth.user(token)
        user_id = self.repo.identity("catenda", self.oauth.BASE, **user)
        available = self.oauth.projects(token)
        # Only explicitly registered projects belong to this application.
        configs = self.repo.configs()
        for config in configs:
            if catenda_id(config["catenda_project_id"]) in available:
                self.sync(config, token)
        self.repo.deactivate_user_projects(
            user_id,
            [
                c["internal_project_id"]
                for c in configs
                if catenda_id(c["catenda_project_id"]) not in available
            ],
        )
        return user_id

    def sync(self, config, token=None):
        started = utcnow()
        if token is None:
            # Separate integration credential. Never replace it with a user's token.
            from core.container import get_container

            client = get_container().catenda_client
            if not client.ensure_authenticated():
                raise CatendaUnavailable("Membership source unavailable")
            token = client.access_token
        members = self.oauth.members(config["catenda_project_id"], token)
        existing = self.repo.memberships(project_id=config["internal_project_id"])
        changes = reconciliation_changes(
            [{**m, "subject": m["catenda_subject"]} for m in existing],
            members,
        )
        self.repo.reconcile(
            config["internal_project_id"],
            config["catenda_project_id"],
            changes["upsert"],
            started,
        )
        return {"members": len(members), "deactivated": len(changes["deactivate"])}

    def project_config(self, project_id):
        """Direkte oppslag på prosjektkonfigurasjon."""
        return self.repo.project_config(project_id)

    def ensure_fresh(self, project_id):
        config = self.repo.project_config(project_id)
        if config is None:
            return False
        state = self.repo.sync_state(project_id)
        fresh = False
        if state and catenda_id(state["catenda_project_id"]) == catenda_id(
            config["catenda_project_id"]
        ):
            age = (
                datetime.now(UTC)
                - datetime.fromisoformat(state["synced_at"].replace("Z", "+00:00"))
            ).total_seconds()
            fresh = 0 <= age < self.max_age
        if not fresh:
            self.sync(config)
        return True

    def _membership(self, project_id, user_id):
        """Medlemskapet, med ett oppslag per forespørsel.

        Tilgangslaget spør to ganger om det samme: `require_project_access`
        gjennom `role()`, og `require_contract_role` gjennom
        `contract_membership()`. Memoet lever bare i forespørselens `g`, så
        dette er ikke autoritetscachen `contract_membership` bevisst unngår —
        verdien leses like ferskt som før, bare én gang i stedet for to.

        Utenfor en forespørsel (skript, direkte tjenestebruk) er det ingen `g`
        å henge memoet på, og oppslaget går rett til repoet.
        """
        from flask import g, has_request_context

        if not has_request_context():
            return self.repo.membership(project_id, user_id)
        memo = getattr(g, "_koe_membership", None)
        if memo is None:
            memo = g._koe_membership = {}
        nokkel = (project_id, user_id)
        if nokkel not in memo:
            memo[nokkel] = self.repo.membership(project_id, user_id)
        return memo[nokkel]

    def role(self, project_id, user_id):
        if not self.ensure_fresh(project_id):
            return None
        member = self._membership(project_id, user_id)
        if member:
            return "viewer" if member["viewer_override"] else member["role"]
        return None

    def contract_role(self, project_id, user_id):
        """Kontraktssiden (TE/BH) brukeren tilhører, eller None."""
        return self.contract_membership(project_id, user_id)[0]

    def contract_membership(self, project_id, user_id):
        """Read current team membership on writes; no stale authority cache.

        The mapping uses immutable team IDs from the database, never names or user-controlled data.
        Missing/ambiguous membership grants neither contract side.

        Returns:
            (rolle, team_id). Teamet er organisasjonen brukeren faktisk sitter i.
            En kontraktsside kan ha flere team — byggherre og ekstern rådgiver er
            ulike organisasjoner på samme side — så rollen alene skiller dem ikke.
            Treff i flere team på samme side gir entydig rolle, men ikke entydig
            organisasjon; da er team_id None.
        """
        member = self._membership(project_id, user_id)
        if not member or not member.get("active") or member.get("viewer_override"):
            return None, None
        return self.contract_membership_for_subject(
            project_id, member.get("catenda_subject")
        )

    def contract_membership_for_subject(self, project_id, catenda_subject):
        """Kontraktssiden et Catenda-subjekt tilhører, uten krav om app-medlemskap.

        Webhooken kjenner bare topicens forfatter fra Catenda, ikke en app-bruker.
        Attribusjonen skal likevel hvile på verifisert lagmedlemskap framfor en
        antakelse om at oppretteren er TE (audit INT-04).

        Dette gir ingen tilgang — det avgjør bare hvilken kontraktsside en hendelse
        skrives med. Tilgang går fortsatt gjennom app-medlemskapet i
        `contract_membership`.

        Returns:
            (rolle, team_id), begge None når siden ikke lar seg avgjøre entydig.
        """
        config = self.repo.project_config(project_id)
        if not config or not catenda_subject:
            return None, None

        ids = self.repo.contract_teams(project_id)
        if not isinstance(ids, dict) or not ids.get("TE") or not ids.get("BH"):
            return None, None
        if ids["TE"] & ids["BH"]:
            return None, None

        from core.container import get_container

        client = get_container().catenda_client
        if not client.ensure_authenticated():
            raise CatendaUnavailable("Team membership source unavailable")
        try:
            subject = catenda_id(str(catenda_subject))
        except (ValueError, AttributeError, TypeError):
            return None, None
        matches = set()
        for role in ("TE", "BH"):
            for raw_team_id in ids[role]:
                team_id = catenda_id(str(raw_team_id))
                members = self.oauth.team_members(
                    config["catenda_project_id"], team_id, client.access_token
                )
                if subject in members:
                    matches.add((role, team_id))
        roles = {role for role, _ in matches}
        if len(roles) != 1:
            return None, None
        found_teams = {team for _, team in matches}
        return next(iter(roles)), (
            next(iter(found_teams)) if len(found_teams) == 1 else None
        )

    def user_projects(self, user_id):
        result = []
        for member in self.repo.memberships(user_id=user_id, active=True):
            if self.role(member["project_id"], user_id):
                result.append(member["project_id"])
        return result
