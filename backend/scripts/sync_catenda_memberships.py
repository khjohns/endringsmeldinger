"""Refresh registered project memberships and clean expired login/session rows.

Run from backend: venv/bin/python scripts/sync_catenda_memberships.py
Suitable for a scheduler (e.g. every five minutes). Uses backend credentials.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from services.auth_service import AuthService


def main():
    service = AuthService()
    failed = 0
    for config in service.repo.configs():
        try:
            result = service.sync(config)
            print(
                f"Updated {config['internal_project_id']}: {result['members']} members"
            )
        except Exception:
            failed += 1
            print(f"Could not update {config['internal_project_id']}", file=sys.stderr)
    service.repo.cleanup_expired()
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
