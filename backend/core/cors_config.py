"""Credentialed API requests are restricted to explicit frontend origins."""

import os
from flask_cors import CORS


def _get_allowed_origins():
    return [value.strip() for value in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if value.strip()]


def setup_cors(app):
    origins = _get_allowed_origins()
    if any("*" in value for value in origins):
        raise ValueError("Credentialed CORS requires explicit origins")
    CORS(app, resources={r"/api/*": {
        "origins": origins,
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-CSRF-Token", "X-Project-ID"],
        "expose_headers": ["X-RateLimit-Remaining", "X-RateLimit-Reset"],
        "supports_credentials": True,
        "max_age": 3600,
    }})
