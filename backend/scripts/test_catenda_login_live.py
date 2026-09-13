"""Real Catenda OAuth with the app's routes and a disposable local repository.

This verifies OAuth/user/membership/session integration, NOT Supabase persistence.
No provider tokens, .env values or remote memberships are written.
"""

import os
import time
import webbrowser
from datetime import UTC, datetime
from uuid import uuid4

from flask import Flask, g, jsonify
from werkzeug.serving import WSGIRequestHandler, make_server

from lib.auth.catenda_oauth import CatendaOAuth
from lib.auth.domain import catenda_id
from lib.auth.session import require_auth
from routes.auth_routes import auth_bp, callback
from services.auth_service import AuthService


class DisposableRepository:
    """Single-threaded test store, discarded when the callback server exits."""

    def __init__(self, project_id):
        self.users = {}
        self.identities = {}
        self.attempts = {}
        self.sessions = {}
        self.members = {}
        self.snapshots = {}
        self.project_configs = [
            {
                "internal_project_id": "live-test-project",
                "catenda_project_id": project_id,
            }
        ]

    def identity(self, provider, issuer, subject, email, name):
        key = (provider, issuer, subject)
        user_id = self.identities.setdefault(key, str(uuid4()))
        self.users[user_id] = {"id": user_id, "email": email, "name": name}
        return user_id

    def create_attempt(self, row):
        self.attempts[row["state_hash"]] = row

    def consume_attempt(self, state_hash, browser_hash):
        row = self.attempts.get(state_hash)
        if (
            row
            and row["browser_hash"] == browser_hash
            and datetime.fromisoformat(row["expires_at"]) > datetime.now(UTC)
        ):
            return self.attempts.pop(state_hash)

    def create_session(self, row):
        self.sessions[row["token_hash"]] = row

    def session(self, token_hash):
        row = self.sessions.get(token_hash)
        if row and datetime.fromisoformat(row["expires_at"]) > datetime.now(UTC):
            return {**row, "app_users": self.users[row["user_id"]]}

    def delete_session(self, token_hash):
        self.sessions.pop(token_hash, None)

    def configs(self):
        return self.project_configs

    def memberships(self, **filters):
        return [
            row
            for row in self.members.values()
            if all(row.get(key) == value for key, value in filters.items())
        ]

    def membership(self, project_id, user_id):
        rows = self.memberships(project_id=project_id, user_id=user_id, active=True)
        return rows[0] if rows else None

    def sync_state(self, project_id):
        return self.snapshots.get(project_id)

    def reconcile(self, project_id, catenda_project_id, members, started_at):
        for row in self.members.values():
            if row["project_id"] == project_id:
                row["active"] = False
        for member in members:
            user_id = self.identity(
                "catenda",
                CatendaOAuth.BASE,
                member["subject"],
                member["email"],
                member["name"],
            )
            self.members[(project_id, user_id)] = {
                "project_id": project_id,
                "user_id": user_id,
                "catenda_subject": member["subject"],
                "role": member["role"],
                "active": True,
                "viewer_override": False,
            }
        self.snapshots[project_id] = {
            "synced_at": started_at,
            "catenda_project_id": catenda_project_id,
        }
        print(f"Live membership snapshot: {len(members)} users", flush=True)
        return True

    def deactivate_user_projects(self, user_id, project_ids):
        for row in self.memberships(user_id=user_id):
            if row["project_id"] in project_ids:
                row["active"] = False


class QuietRequestHandler(WSGIRequestHandler):
    def log_request(self, code="-", size="-"):
        # Callback query parameters contain the single-use OAuth code.
        pass


def main():
    redirect_uri = os.getenv("CATENDA_REDIRECT_URI", "")
    if redirect_uri != "http://127.0.0.1:18080/callback":
        raise ValueError(
            "This local test requires the registered 127.0.0.1:18080/callback URI"
        )
    project_id = catenda_id(os.environ["CATENDA_PROJECT_ID"])
    os.environ["APP_ENV"] = "development"
    os.environ["DISABLE_AUTH"] = "false"
    os.environ["AUTH_FRONTEND_URL"] = "http://127.0.0.1:18080"
    oauth = CatendaOAuth(
        os.environ["CATENDA_CLIENT_ID"],
        os.environ["CATENDA_CLIENT_SECRET"],
        redirect_uri,
    )
    service = AuthService(repo=DisposableRepository(project_id), oauth=oauth)
    service.validate_config()
    app = Flask(__name__)
    app.extensions["koe_auth"] = service
    app.register_blueprint(auth_bp)
    # Local alias only: production callback routing is unchanged.
    app.add_url_rule("/callback", view_func=callback)
    outcome = {"done": False, "passed": False}

    @app.get("/done")
    @require_auth
    def done():
        projects = service.user_projects(g.user["id"])
        role = service.role("live-test-project", g.user["id"]) if projects else None
        outcome.update(done=True, passed=True)
        print(
            f"LIVE LOGIN PASSED: personal identity, state, callback and cookie session. Project role: {role or 'no access'}",
            flush=True,
        )
        response = jsonify(
            result="Innlogging og sesjon bekreftet mot Catenda",
            project_access=bool(projects),
            role=role,
            note="Midlertidig testlager. Supabase og lagrede integrasjonstokens er ikke endret.",
        )
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/login")
    def failed():
        outcome.update(done=True)
        print(
            "LIVE LOGIN FAILED: see sanitized callback error category above", flush=True
        )
        return jsonify(result="Innloggingen kunne ikke fullføres."), 400

    with make_server(
        "127.0.0.1", 18080, app, request_handler=QuietRequestHandler
    ) as server:
        server.timeout = 1
        url = "http://127.0.0.1:18080/api/auth/catenda/login?return_to=/done"
        print("Local login test ready: " + url, flush=True)
        print(
            "Authorize in your browser. Waiting up to 10 minutes; no .env/database writes.",
            flush=True,
        )
        webbrowser.open(url)
        deadline = time.monotonic() + 600
        while not outcome["done"] and time.monotonic() < deadline:
            server.handle_request()
    return 0 if outcome["passed"] else 1
