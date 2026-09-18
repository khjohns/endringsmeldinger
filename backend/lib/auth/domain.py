"""Pure identity and membership rules; never infer identity from email."""

from urllib.parse import unquote
from uuid import UUID


def catenda_id(value: str) -> str:
    return UUID(value).hex


def map_catenda_role(role: str) -> str:
    if role in {"owner", "administrator"}:
        return "admin"
    if role == "member":
        return "member"
    raise ValueError("Unknown Catenda role")


def normalize_members(members: list[dict]) -> list[dict]:
    """Validate the ENTIRE snapshot before any database mutation."""
    result = {}
    for member in members:
        user = member["user"]
        if user.get("type") != "user":
            raise ValueError("Expected individual project members")
        subject = catenda_id(user["id"])
        if subject in result:
            raise ValueError("Duplicate member (possibly repeated pagination)")
        result[subject] = {
            "subject": subject,
            "email": (user.get("email") or "").strip().lower(),
            "name": user.get("name") or "",
            "role": map_catenda_role(member["role"]),
        }
    return list(result.values())


def reconciliation_changes(existing: list[dict], incoming: list[dict]) -> dict:
    """Plan a full snapshot: missing members deactivate, local limits survive."""
    old = {m["subject"]: m for m in existing}
    current = {m["subject"]: m for m in incoming}
    return {
        "upsert": [
            {
                **m,
                "active": True,
                "viewer_override": old.get(s, {}).get("viewer_override", False),
            }
            for s, m in current.items()
        ],
        "deactivate": [
            s for s in old if s not in current and old[s].get("active", True)
        ],
    }


def referenced_case_ids(value) -> set[str]:
    """Find case references in events as well as top-level request fields."""
    result = set()
    single = {"sak_id", "sakId", "koe_sak_id", "relatert_sak_id"}
    multiple = {
        "koe_sak_ids",
        "avslatte_sak_ids",
        "avslatte_fristkrav",
        "relaterte_koe_saker",
    }
    if isinstance(value, dict):
        for key, item in value.items():
            if key in single and item is not None:
                if not isinstance(item, str):
                    raise ValueError("Invalid case reference")
                result.add(item)
            elif key in multiple:
                if not isinstance(item, list) or any(
                    not isinstance(s, str) for s in item
                ):
                    raise ValueError("Invalid case references")
                result.update(item)
            elif isinstance(item, (dict, list)):
                result.update(referenced_case_ids(item))
    elif isinstance(value, list):
        for item in value:
            result.update(referenced_case_ids(item))
    return result


def safe_return_path(value: str | None) -> str:
    """Only local paths; reject encoded slashes, controls and backslashes."""
    value = value or "/"
    decoded = unquote(value)
    if (
        len(value) > 2048
        or not decoded.startswith("/")
        or decoded.startswith("//")
        or "\\" in decoded
        or any(ord(c) < 32 or ord(c) == 127 for c in decoded)
        or decoded.split("?", 1)[0].startswith(("/api/", "/login"))
    ):
        return "/"
    return value
