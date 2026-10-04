"""
Autentisering og autorisasjon.

Innlogging skjer med Catenda-sesjon (`lib/auth/session.py`); prosjekttilgang
kontrolleres med `require_project_access`.
"""

from .project_access import require_project_access

__all__ = [
    "require_project_access",
]
