"""
Supabase JWT token validation.

Supabase exposes the public signing keys for a project through its JWKS
endpoint. The backend uses those keys to verify user access tokens without
holding the project's private JWT signing secret.
"""

import os
from functools import lru_cache, wraps

import jwt
from flask import g, jsonify, request

JWT_ALGORITHMS = ["ES256", "RS256"]
DEFAULT_JWT_AUDIENCE = "authenticated"


def _get_jwks_url() -> str:
    return os.environ.get("SUPABASE_JWKS_URL", "").strip()


def _get_supabase_issuer() -> str:
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    return f"{supabase_url}/auth/v1" if supabase_url else ""


@lru_cache(maxsize=1)
def _get_jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    """Create a cached JWKS client for the configured project endpoint."""
    # Supabase's edge cache is valid for 10 minutes. Keep the local cache at
    # the same upper bound so signing-key rotation can take effect promptly.
    return jwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=600)


def validate_supabase_token(token: str) -> dict | None:
    """Validate a Supabase Auth access token against the project's JWKS."""
    jwks_url = _get_jwks_url()
    issuer = _get_supabase_issuer()
    if not jwks_url or not issuer:
        return None

    try:
        signing_key = _get_jwks_client(jwks_url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=JWT_ALGORITHMS,
            audience=os.environ.get("SUPABASE_JWT_AUDIENCE", DEFAULT_JWT_AUDIENCE),
            issuer=issuer,
        )
    except (jwt.PyJWTError, ValueError):
        return None


def require_supabase_auth(f):
    """
    Decorator that requires valid Supabase JWT token.

    Token must be sent in Authorization header as Bearer token. If Supabase
    JWKS is not configured, the existing magic-link development flow is used.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Allow bypassing auth for testing (NOT for production!).
        if os.environ.get("DISABLE_AUTH", "").lower() == "true":
            g.current_user = {
                "id": "test-user",
                "email": "test@example.com",
                "role": "authenticated",
            }
            return f(*args, **kwargs)

        if not _get_jwks_url() or not _get_supabase_issuer():
            from .magic_link import require_magic_link

            return require_magic_link(f)(*args, **kwargs)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify(
                {
                    "success": False,
                    "error": "UNAUTHORIZED",
                    "message": "Missing authorization header",
                }
            ), 401

        token = auth_header.removeprefix("Bearer ").strip()
        claims = validate_supabase_token(token)
        if not claims:
            return jsonify(
                {
                    "success": False,
                    "error": "UNAUTHORIZED",
                    "message": "Invalid or expired token",
                }
            ), 401

        g.current_user = {
            "id": claims.get("sub"),
            "email": claims.get("email"),
            "role": claims.get("role", "authenticated"),
        }
        return f(*args, **kwargs)

    return decorated_function


def get_current_user() -> dict | None:
    """Return the current authenticated user from Flask's request context."""
    return getattr(g, "current_user", None)
