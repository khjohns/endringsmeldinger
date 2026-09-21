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
        --organisasjon-id "<virksomhet>" \
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

from repositories.auth_repository import AuthRepository


def to_uuid_str(val: str | None) -> str | None:
    if not val or not val.strip():
        return None
    return str(UUID(val.strip()))


def register_project(
    internal_id: str,
    name: str,
    catenda_project_id: str,
    library_id: str,
    organisasjon_id: str,
    folder_id: str | None = None,
    topic_board_id: str | None = None,
    description: str | None = None,
):
    """Registrer prosjektet atomisk gjennom `koe_register_project`.

    Skriving rett i tabellene ville gått utenom skrankene RPC-en håndhever —
    blant dem at en ny registrering ikke flytter prosjektet til en annen
    virksomhet.
    """
    print(f"Registering project '{internal_id}' ({name})...")

    AuthRepository().register_project(
        project_id=internal_id,
        name=name,
        catenda_project_id=to_uuid_str(catenda_project_id),
        library_id=to_uuid_str(library_id),
        organisasjon_id=organisasjon_id,
        folder_id=to_uuid_str(folder_id),
        topic_board_id=to_uuid_str(topic_board_id),
        description=description,
    )

    print(f"Successfully registered project '{internal_id}'!\n")


def main():
    parser = argparse.ArgumentParser(description="Register projects for Catenda sync")
    parser.add_argument("--id", help="Internal project ID (e.g. 'oslobygg')")
    parser.add_argument("--name", help="Display name for the project")
    parser.add_argument("--catenda-project-id", help="Catenda project UUID")
    parser.add_argument("--library-id", help="Catenda library UUID")
    parser.add_argument("--organisasjon-id", help="Virksomheten prosjektet tilhører")
    parser.add_argument("--folder-id", help="Catenda folder UUID (optional)")
    parser.add_argument("--topic-board-id", help="Catenda topic board UUID (optional)")
    parser.add_argument("--description", help="Project description (optional)")

    args = parser.parse_args()

    if args.id:
        if not (args.name and args.catenda_project_id and args.library_id and args.organisasjon_id):
            parser.error(
                "--name, --catenda-project-id, --library-id og --organisasjon-id er påkrevd når --id er gitt."
            )
        register_project(
            internal_id=args.id,
            name=args.name,
            catenda_project_id=args.catenda_project_id,
            library_id=args.library_id,
            organisasjon_id=args.organisasjon_id,
            folder_id=args.folder_id,
            topic_board_id=args.topic_board_id,
            description=args.description,
        )
    else:
        # Default: seed from .env
        cat_id = os.getenv("CATENDA_PROJECT_ID")
        lib_id = os.getenv("CATENDA_LIBRARY_ID")
        org_id = os.getenv("ORGANISASJON_ID")
        mangler = [
            navn
            for navn, verdi in (
                ("CATENDA_PROJECT_ID", cat_id),
                ("CATENDA_LIBRARY_ID", lib_id),
                ("ORGANISASJON_ID", org_id),
            )
            if not verdi
        ]
        if mangler:
            sys.exit(f"Feil: Fant ikke {', '.join(mangler)} i .env")

        print("Seeding default project 'oslobygg' from backend/.env...")
        register_project(
            internal_id="oslobygg",
            name="Oslobygg",
            catenda_project_id=cat_id,
            library_id=lib_id,
            organisasjon_id=org_id,
            folder_id=os.getenv("CATENDA_FOLDER_ID"),
            topic_board_id=os.getenv("CATENDA_TOPIC_BOARD_ID"),
            description="Standard prosjekt",
        )


if __name__ == "__main__":
    main()
