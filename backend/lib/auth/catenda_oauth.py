"""Request-scoped Catenda OAuth client. Never reuse the integration client."""

from urllib.parse import urlencode

import requests

from .domain import catenda_id, normalize_members


class CatendaUnavailable(RuntimeError):
    pass


class CatendaOAuth:
    BASE = "https://api.catenda.com"

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    def authorize_url(self, state: str) -> str:
        return (
            self.BASE
            + "/oauth2/authorize?"
            + urlencode(
                {
                    "client_id": self.client_id,
                    "redirect_uri": self.redirect_uri,
                    "response_type": "code",
                    "response_mode": "query",
                    "state": state,
                }
            )
        )

    def exchange(self, code: str) -> str:
        # PKCE is intentionally absent until enabled for this app by Catenda.
        data = self._request(
            "POST",
            "/oauth2/token",
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": self.redirect_uri,
                "grant_type": "authorization_code",
                "code": code,
            },
        )
        if not isinstance(data, dict) or not isinstance(data.get("access_token"), str):
            raise CatendaUnavailable("Invalid token response")
        # Provider tokens are used only during this request, never persisted.
        return data["access_token"]

    def _request(self, method: str, path: str, token: str | None = None, **kwargs):
        try:
            response = requests.request(
                method,
                self.BASE + path,
                timeout=15,
                allow_redirects=False,
                headers={
                    "Accept": "application/json",
                    **({"Authorization": f"Bearer {token}"} if token else {}),
                },
                **kwargs,
            )
            if response.status_code != 200:
                raise CatendaUnavailable("Catenda request failed")
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            # Never expose/log request bodies, codes, tokens or provider responses.
            raise CatendaUnavailable("Catenda request failed") from exc

    def user(self, token: str) -> dict:
        user = self._request("GET", "/v2/user", token)
        if not isinstance(user, dict) or user.get("type") != "user":
            raise CatendaUnavailable("Expected a user identity")
        return {
            "subject": catenda_id(user["id"]),
            "email": user.get("email") or "",
            "name": user.get("name") or "",
        }

    def collection(self, path: str, token: str, **params) -> list[dict]:
        result = []
        seen = set()
        # A cap makes a broken/ignored pagination parameter fail, never truncate.
        for page in range(1, 1001):
            rows = self._request(
                "GET", path, token, params={**params, "page": page, "pageSize": 100}
            )
            if not isinstance(rows, list):
                raise CatendaUnavailable("Invalid collection")
            for row in rows:
                key = row.get("id") or row.get("user", {}).get("id")
                if not key or key in seen:
                    raise CatendaUnavailable("Incomplete collection")
                seen.add(key)
            result.extend(rows)
            if len(rows) < 100:
                return result
        raise CatendaUnavailable("Collection exceeds pagination limit")

    def projects(self, token: str) -> set[str]:
        return {catenda_id(p["id"]) for p in self.collection("/v2/projects", token)}

    def members(self, project_id: str, token: str) -> list[dict]:
        return normalize_members(
            self.collection(
                f"/v2/projects/{catenda_id(project_id)}/members",
                token,
                userType="user",
            )
        )
