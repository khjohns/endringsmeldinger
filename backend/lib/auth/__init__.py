"""
Authentication and authorization utilities

Supports multiple authentication methods:
- Magic Links: For external users (TE - Totalentreprenør)
- Entra ID/IDA: For internal users (BH - Byggherre/Oslobygg)
- Supabase Auth: Alternative for development
"""

from .entra_id import (
    EntraUser,
    get_entra_user,
    require_approval_role,
    require_bh_role,
    require_entra_auth,
    validate_entra_token,
)
from .magic_link import MagicLinkManager, get_magic_link_manager, require_magic_link
from .project_access import require_project_access

__all__ = [
    # Magic Links (eksterne brukere)
    "MagicLinkManager",
    "require_magic_link",
    "get_magic_link_manager",
    # Project access control
    "require_project_access",
    # Entra ID / IDA (alle brukere)
    "EntraUser",
    "validate_entra_token",
    "require_entra_auth",
    "require_approval_role",
    "require_bh_role",
    "get_entra_user",
]
