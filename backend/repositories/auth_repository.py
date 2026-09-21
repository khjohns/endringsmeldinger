"""Backend-only identity/session storage and atomic Catenda snapshots."""

from datetime import UTC, datetime

from lib.supabase import alle_rader


def utcnow() -> str:
    return datetime.now(UTC).isoformat()


class AuthRepository:
    def __init__(self, client=None):
        if client is None:
            from lib.supabase.client import get_shared_client

            client = get_shared_client()
        self.client = client

    def all_rows(self, table, columns="*", **filters):
        def side(start, slutt):
            query = self.client.table(table).select(columns).order("id")
            for key, value in filters.items():
                query = query.eq(key, value)
            return query.range(start, slutt).execute().data

        return alle_rader(side)

    def user_name(self, user_id):
        """Navnet på en bruker, eller None. Tom streng regnes som ikke satt."""
        if not user_id:
            return None
        rader = (
            self.client.table("app_users")
            .select("name")
            .eq("id", user_id)
            .limit(1)
            .execute()
            .data
        )
        return rader[0]["name"] if rader and rader[0].get("name") else None

    def user_id_for_subject(self, provider, subject):
        """app_users.id for en ekstern identitet, eller None når den ikke er entydig.

        Leser app_identities, som skrives av databasefunksjonen
        koe_resolve_identity ved innlogging. En Catenda-forfatter som aldri har
        logget inn hos oss, finnes ikke der.
        """
        if not subject:
            return None
        rader = (
            self.client.table("app_identities")
            .select("user_id")
            .eq("provider", provider)
            .eq("subject", subject)
            .limit(2)
            .execute()
            .data
            or []
        )
        if len(rader) != 1:
            return None
        return rader[0]["user_id"]

    def identity(self, provider, issuer, subject, email, name):
        return (
            self.client.rpc(
                "koe_resolve_identity",
                {
                    "p_provider": provider,
                    "p_issuer": issuer,
                    "p_subject": subject,
                    "p_email": email,
                    "p_name": name,
                },
            )
            .execute()
            .data
        )

    def create_attempt(self, row):
        self.client.table("app_oauth_attempts").insert(row).execute()

    def consume_attempt(self, state_hash, browser_hash):
        rows = (
            self.client.table("app_oauth_attempts")
            .delete()
            .eq("state_hash", state_hash)
            .eq("browser_hash", browser_hash)
            .gt("expires_at", utcnow())
            .execute()
            .data
        )
        return rows[0] if rows else None

    def create_session(self, row):
        self.client.table("app_sessions").insert(row).execute()

    def deactivate_user_projects(self, user_id, project_ids):
        if project_ids:
            (
                self.client.table("app_project_memberships")
                .update({"active": False, "updated_at": utcnow()})
                .eq("user_id", user_id)
                .in_("project_id", project_ids)
                .execute()
            )

    def cleanup_expired(self):
        for table in ("app_sessions", "app_oauth_attempts"):
            self.client.table(table).delete().lt("expires_at", utcnow()).execute()

    def session(self, token_hash):
        rows = (
            self.client.table("app_sessions")
            .select("*, app_users(*)")
            .eq("token_hash", token_hash)
            .gt("expires_at", utcnow())
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None

    def delete_session(self, token_hash):
        self.client.table("app_sessions").delete().eq(
            "token_hash", token_hash
        ).execute()

    def configs(self):
        def side(start, slutt):
            return (
                self.client.table("catenda_project_configs")
                .select("internal_project_id,catenda_project_id")
                .eq("is_active", True)
                .order("internal_project_id")
                .range(start, slutt)
                .execute()
                .data
            )

        return alle_rader(side)

    def project_config(self, project_id):
        """Direkte oppslag på ett aktivt prosjekt."""
        rows = (
            self.client.table("catenda_project_configs")
            .select("internal_project_id,catenda_project_id")
            .eq("internal_project_id", project_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None

    def contract_teams(self, project_id):
        """Hent kontraktsteam for et prosjekt fra databasen.

        Returnerer:
            {"BH": {team_id, ...}, "TE": {team_id, ...}}
            hvor team_id er normalisert med catenda_id().
        """
        from lib.auth.domain import catenda_id

        rows = (
            self.client.table("catenda_contract_teams")
            .select("team_id,contract_role")
            .eq("internal_project_id", project_id)
            .execute()
            .data
        )
        result = {"BH": set(), "TE": set()}
        for row in rows:
            role = row["contract_role"]
            if role in result:
                result[role].add(catenda_id(str(row["team_id"])))
        return result

    def set_contract_teams(self, project_id, teams):
        """Atomisk erstatning av kontraktsteams via RPC-funksjon.

        Args:
            project_id: Internt prosjekt-ID
            teams: Liste av {"team_id": "<UUID>", "contract_role": "BH"|"TE"}
        """
        return (
            self.client.rpc(
                "koe_set_contract_teams",
                {
                    "p_project": project_id,
                    "p_teams": teams,
                },
            )
            .execute()
            .data
        )

    def register_project(
        self,
        project_id: str,
        name: str,
        catenda_project_id: str,
        library_id: str,
        organisasjon_id: str,
        folder_id: str | None = None,
        topic_board_id: str | None = None,
        description: str | None = None,
        teams: list[dict] | None = None,
    ):
        """Atomisk registrering av prosjekt, integrasjonskonfigurasjon og eventuelle teams."""
        return (
            self.client.rpc(
                "koe_register_project",
                {
                    "p_project_id": project_id,
                    "p_name": name,
                    "p_description": description,
                    "p_organisasjon_id": organisasjon_id,
                    "p_catenda_project_id": catenda_project_id,
                    "p_library_id": library_id,
                    "p_folder_id": folder_id,
                    "p_topic_board_id": topic_board_id,
                    "p_teams": teams,
                },
            )
            .execute()
            .data
        )

    def sync_state(self, project_id):
        rows = (
            self.client.table("app_membership_sync")
            .select("*")
            .eq("project_id", project_id)
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None

    def reconcile(self, project_id, catenda_project_id, members, started_at):
        return (
            self.client.rpc(
                "koe_reconcile_memberships",
                {
                    "p_project": project_id,
                    "p_catenda_project": catenda_project_id,
                    "p_members": members,
                    "p_started_at": started_at,
                },
            )
            .execute()
            .data
        )

    def membership(self, project_id, user_id):
        rows = (
            self.client.table("app_project_memberships")
            .select("*")
            .eq("project_id", project_id)
            .eq("user_id", user_id)
            .eq("active", True)
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None

    def memberships(self, **filters):
        return self.all_rows("app_project_memberships", **filters)

    def viewer_override(self, project_id, member_id, value):
        return (
            self.client.table("app_project_memberships")
            .update({"viewer_override": value, "updated_at": utcnow()})
            .eq("project_id", project_id)
            .eq("id", member_id)
            .eq("active", True)
            .execute()
            .data
        )
