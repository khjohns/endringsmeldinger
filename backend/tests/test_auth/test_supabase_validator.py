"""Tests for Supabase JWT validation through the project's JWKS endpoint."""

from types import SimpleNamespace

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from lib.auth import supabase_validator


def _signed_token(private_key, **claims):
    return jwt.encode(
        {
            "sub": "user-123",
            "email": "user@example.com",
            "role": "authenticated",
            "aud": "authenticated",
            "iss": "https://project.supabase.co/auth/v1",
            "exp": 4_102_444_800,
            **claims,
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )


def test_validate_supabase_token_uses_project_jwks(monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = _signed_token(private_key)
    fake_client = SimpleNamespace(
        get_signing_key_from_jwt=lambda received: SimpleNamespace(
            key=private_key.public_key()
        )
    )

    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv(
        "SUPABASE_JWKS_URL",
        "https://project.supabase.co/auth/v1/.well-known/jwks.json",
    )
    monkeypatch.setattr(supabase_validator, "_get_jwks_client", lambda _: fake_client)

    claims = supabase_validator.validate_supabase_token(token)

    assert claims["sub"] == "user-123"
    assert claims["role"] == "authenticated"


def test_validate_supabase_token_rejects_invalid_signature(monkeypatch):
    signing_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    wrong_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = _signed_token(signing_key)
    fake_client = SimpleNamespace(
        get_signing_key_from_jwt=lambda received: SimpleNamespace(
            key=wrong_key.public_key()
        )
    )

    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_JWKS_URL", "https://project.supabase.co/jwks.json")
    monkeypatch.setattr(supabase_validator, "_get_jwks_client", lambda _: fake_client)

    assert supabase_validator.validate_supabase_token(token) is None


def test_validate_supabase_token_rejects_wrong_issuer(monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = _signed_token(private_key, iss="https://another-project.supabase.co/auth/v1")
    fake_client = SimpleNamespace(
        get_signing_key_from_jwt=lambda received: SimpleNamespace(
            key=private_key.public_key()
        )
    )

    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_JWKS_URL", "https://project.supabase.co/jwks.json")
    monkeypatch.setattr(supabase_validator, "_get_jwks_client", lambda _: fake_client)

    assert supabase_validator.validate_supabase_token(token) is None


def test_validate_supabase_token_requires_jwks_configuration(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_JWKS_URL", raising=False)

    assert supabase_validator.validate_supabase_token("not-a-token") is None
