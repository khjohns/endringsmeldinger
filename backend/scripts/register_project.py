#!/usr/bin/env python3
"""Register or seed projects in Supabase (projects + catenda_project_configs).

Usage:
    # Seed default project from backend/.env:
    python scripts/register_project.py

    # Or register custom project:
    python scripts/register_project.py \
        --id "prosjekt-2" \
        --name "Nytt Prosjekt" \
        --catenda-project-id "<UUID>" \
        --library-id "<UUID>" \
        [--folder-id "<UUID>"] \
        [--topic-board-id "<UUID>"]
"""

import argparse
import os
import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from lib.supabase.client import get_shared_client


def to_uuid_str(val: str | None) -> str | None:
    if not val or not val.strip():
        return None
    return str(UUID(val.strip()))


def register_project(
    internal_id: str,
    name: str,
    catenda_project_id: str,
    library_id: str,
    folder_id: str | None = None,
    topic_board_id: str | None = None,
    description: str | None = None,
):
    client = get_shared_client()
    cat_proj_uuid = to_uuid_str(catenda_project_id)
    lib_uuid = to_uuid_str(library_id)
    folder_uuid = to_uuid_str(folder_id)
    board_uuid = to_uuid_str(topic_board_id)

    print(f"Registering project '{internal_id}' ({name})...")

    # 1. Upsert into projects
    client.table("projects").upsert(
        {
            "id": internal_id,
            "name": name,
            "description": description or f"Prosjekt {name}",
            "is_active": True,
            "created_by": "system",
        }
    ).execute()
    print("  ✓ Upserted into 'projects'")

    # 2. Upsert into catenda_project_configs
    client.table("catenda_project_configs").upsert(
        {
            "internal_project_id": internal_id,
            "catenda_project_id": cat_proj_uuid,
            "library_id": lib_uuid,
            "folder_id": folder_uuid,
            "is_active": True,
        }
    ).execute()
    print("  ✓ Upserted into 'catenda_project_configs'")

    # 3. Upsert into catenda_topic_board_configs if provided
    if board_uuid:
        client.table("catenda_topic_board_configs").upsert(
            {
                "topic_board_id": board_uuid,
                "internal_project_id": internal_id,
                "is_active": True,
            }
        ).execute()
        print("  ✓ Upserted into 'catenda_topic_board_configs'")

    print(f"Successfully registered project '{internal_id}'!\n")


def main():
    parser = argparse.ArgumentParser(description="Register projects for Catenda sync")
    parser.add_argument("--id", help="Internal project ID (e.g. 'oslobygg')")
    parser.add_argument("--name", help="Display name for the project")
    parser.add_argument("--catenda-project-id", help="Catenda project UUID")
    parser.add_argument("--library-id", help="Catenda library UUID")
    parser.add_argument("--folder-id", help="Catenda folder UUID (optional)")
    parser.add_argument("--topic-board-id", help="Catenda topic board UUID (optional)")
    parser.add_argument("--description", help="Project description (optional)")

    args = parser.parse_args()

    if args.id:
        if not (args.name and args.catenda_project_id and args.library_id):
            parser.error("--name, --catenda-project-id and --library-id are required when --id is given.")
        register_project(
            internal_id=args.id,
            name=args.name,
            catenda_project_id=args.catenda_project_id,
            library_id=args.library_id,
            folder_id=args.folder_id,
            topic_board_id=args.topic_board_id,
            description=args.description,
        )
    else:
        # Default: seed from .env
        cat_id = os.getenv("CATENDA_PROJECT_ID")
        lib_id = os.getenv("CATENDA_LIBRARY_ID")
        if not cat_id or not lib_id:
            print("Feil: Fant ikke CATENDA_PROJECT_ID eller CATENDA_LIBRARY_ID i .env", file=sys.stderr)
            sys.exit(1)

        print("Seeding default project 'oslobygg' from backend/.env...")
        register_project(
            internal_id="oslobygg",
            name="Oslobygg",
            catenda_project_id=cat_id,
            library_id=lib_id,
            folder_id=os.getenv("CATENDA_FOLDER_ID"),
            topic_board_id=os.getenv("CATENDA_TOPIC_BOARD_ID"),
            description="Standard prosjekt",
        )


if __name__ == "__main__":
    main()
