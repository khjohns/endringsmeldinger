"""Backend-only identity/session storage and atomic Catenda snapshots."""

from datetime import UTC, datetime


def utcnow() -> str:
    return datetime.now(UTC).isoformat()


class AuthRepository:
    def __init__(self, client=None):
        if client is None:
            from lib.supabase.client import get_shared_client

            client = get_shared_client()
        self.client = client

    def all_rows(self, table, columns="*", **filters):
        rows = []
        for offset in range(0, 100000, 500):
            query = self.client.table(table).select(columns).order("id")
            for key, value in filters.items():
                query = query.eq(key, value)
            page = query.range(offset, offset + 499).execute().data
            rows.extend(page)
            if len(page) < 500:
                return rows
        raise RuntimeError("Database pagination limit")

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
        rows = []
        for offset in range(0, 100000, 500):
            page = (
                self.client.table("catenda_project_configs")
                .select("internal_project_id,catenda_project_id")
                .eq("is_active", True)
                .order("internal_project_id")
                .range(offset, offset + 499)
                .execute()
                .data
            )
            rows.extend(page)
            if len(page) < 500:
                return rows
        raise RuntimeError("Project pagination limit")

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
