#!/usr/bin/env python3
"""Admin CLI for Catenda prosjekter, medlemskap og teamtilknytning.

Kommandoer:
    # 1. Vis status for registrerte prosjekter
    python scripts/catenda_admin.py list

    # 2. Registrer nytt prosjekt (henter navn automatisk fra Catenda om --name utelates)
    python scripts/catenda_admin.py register \
        --id "oslobygg" \
        --catenda-project-id "5c3a6c4036e04b5a806998d02a98b040" \
        --library-id "53243191e3ec4e4b8a4119bfcfc7a429" \
        --folder-id "7251477c8d1a43e88afb5a6c19971467" \
        --topic-board-id "ffc8413d1ec54834878b2955db96e734"

    # 3. Synkroniser/oppdater prosjektnavn fra Catenda for eksisterende prosjekt
    python scripts/catenda_admin.py sync-name [project_id]

    # 4. Synkroniser medlemmer for et eller alle registrerte prosjekter
    python scripts/catenda_admin.py sync-members [project_id]

    # 5. Vis teams og teammedlemmer fra Catenda (spesielt BH og TE)
    python scripts/catenda_admin.py teams [project_id] [--all]
"""

import argparse
import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from core.container import get_container
from lib.auth.domain import catenda_id
from lib.supabase.client import get_shared_client
from repositories.auth_repository import AuthRepository
from services.auth_service import AuthService


def to_uuid_str(val: str | None) -> str | None:
    if not val or not val.strip():
        return None
    return str(UUID(val.strip()))


def fetch_catenda_project_name(catenda_project_id: str) -> str | None:
    """Hent offisielt prosjektnavn fra Catenda API."""
    client = get_container().catenda_client
    if not client.ensure_authenticated():
        return None
    details = client.get_project_details(catenda_project_id)
    if details and "name" in details:
        return details["name"]
    return None


def cmd_list(args):
    """List alle registrerte prosjekter og status."""
    client = get_shared_client()
    projects = client.table("projects").select("*").execute().data
    configs = {
        c["internal_project_id"]: c
        for c in client.table("catenda_project_configs").select("*").execute().data
    }
    boards = {
        b["internal_project_id"]: b["topic_board_id"]
        for b in client.table("catenda_topic_board_configs").select("*").execute().data
    }

    if not projects:
        print("Ingen prosjekter registrert i databasen.")
        return

    print(f"\n{'='*80}")
    print(f"{'ID':<15} | {'Navn':<35} | {'Catenda Prosjekt ID':<36}")
    print(f"{'-'*80}")
    for p in projects:
        pid = p["id"]
        cfg = configs.get(pid, {})
        cat_id_str = cfg.get("catenda_project_id", "(mangler config)")
        print(f"{pid:<15} | {p['name'][:35]:<35} | {cat_id_str:<36}")
        if cfg:
            member_count = len(
                client.table("app_project_memberships")
                .select("id")
                .eq("project_id", pid)
                .eq("active", True)
                .execute()
                .data
            )
            print(f"   ↳ Bibliotek:   {cfg.get('library_id')}")
            print(f"   ↳ Mappe (PDF): {cfg.get('folder_id') or '(ingen)'}")
            print(f"   ↳ Topic Board: {boards.get(pid, '(ingen)')}")
            print(f"   ↳ Medlemmer:   {member_count} aktive synkronisert")
    print(f"{'='*80}\n")


def cmd_sync_name(args):
    """Oppdater prosjektnavn fra Catenda API."""
    client = get_shared_client()
    configs = client.table("catenda_project_configs").select("*").execute().data

    target = args.project_id
    updated = 0
    for cfg in configs:
        pid = cfg["internal_project_id"]
        if target and pid != target:
            continue
        cat_pid = cfg["catenda_project_id"]
        print(f"Henter navn fra Catenda for {pid} ({cat_pid})...")
        name = fetch_catenda_project_name(cat_pid)
        if name:
            client.table("projects").update({"name": name}).eq("id", pid).execute()
            print(f"  ✓ Prosjekt '{pid}' oppdatert til: '{name}'")
            updated += 1
        else:
            print(f"  ✗ Kunne ikke hente navn fra Catenda for '{pid}'", file=sys.stderr)

    if updated == 0 and target:
        print(f"Fant ingen prosjektkonfigurasjon for ID '{target}'.")


def cmd_register(args):
    """Registrer nytt eller oppdater eksisterende prosjekt atomisk."""
    if args.bh or args.te:
        print(KONTRAKTSTEAM_I_TS, file=sys.stderr)
        sys.exit(2)

    repo = AuthRepository()

    cat_proj_uuid = to_uuid_str(args.catenda_project_id)
    lib_uuid = to_uuid_str(args.library_id)
    folder_uuid = to_uuid_str(args.folder_id)
    board_uuid = to_uuid_str(args.topic_board_id)

    # 1. Hent navn fra Catenda dersom ikke oppgitt
    name = args.name
    if not name:
        print(f"Henter prosjektnavn automatisk fra Catenda ({cat_proj_uuid})...")
        name = fetch_catenda_project_name(cat_proj_uuid)
        if name:
            print(f"  Fant navn: '{name}'")
        else:
            name = args.id
            print(f"  Advarsel: Kunne ikke hente navn fra Catenda, bruker '{name}'.")

    # 3. Utfør samlet atomisk registrering i databasen via RPC
    print(f"Registrerer prosjekt '{args.id}' atomisk i databasen...")
    try:
        repo.register_project(
            project_id=args.id,
            name=name,
            catenda_project_id=cat_proj_uuid,
            library_id=lib_uuid,
            organisasjon_id=args.organisasjon_id,
            folder_id=folder_uuid,
            topic_board_id=board_uuid,
            description=args.description,
        )
        print(f"\n✓ Prosjekt '{args.id}' ('{name}') er fullt og atomisk registrert!")
        print(f"Kjør 'python scripts/catenda_admin.py sync-members {args.id}' for å synke medlemmer.")
    except Exception as e:
        print(f"Feil under atomisk registrering i databasen: {e}", file=sys.stderr)


def cmd_sync_members(args):
    """Synkroniser medlemmer fra Catenda til databasen."""
    service = AuthService()
    configs = service.repo.configs()
    target = args.project_id

    for cfg in configs:
        pid = cfg["internal_project_id"]
        if target and pid != target:
            continue
        try:
            print(f"Synkroniserer medlemmer for '{pid}'...")
            res = service.sync(cfg)
            print(f"  ✓ Fullført: {res['members']} medlemmer synkronisert ({res['deactivated']} deaktivert).")
        except Exception as e:
            print(f"  ✗ Feil under synk for '{pid}': {e}", file=sys.stderr)


def cmd_teams(args):
    """Hent og vis Catenda-teams og teammedlemmer."""
    client = get_container().catenda_client
    if not client.ensure_authenticated():
        print("Kunne ikke autentisere mot Catenda API.", file=sys.stderr)
        return

    db_client = get_shared_client()
    target = args.project_id or "oslobygg"
    cfgs = (
        db_client.table("catenda_project_configs")
        .select("*")
        .eq("internal_project_id", target)
        .execute()
        .data
    )
    if not cfgs:
        print(f"Fant ikke prosjekt '{target}' i databasen.")
        return

    cat_pid = cfgs[0]["catenda_project_id"]
    url = f"{client.base_url}/v2/projects/{cat_pid}/teams"
    resp = client._safe_request("GET", url)
    if not resp:
        print("Kunne ikke hente teamliste fra Catenda.", file=sys.stderr)
        return

    raw_items = resp.json()
    teams = [item["user"] for item in raw_items if item.get("user", {}).get("type") == "team"]

    # Sjekk kontraktsteams fra databasen
    repo = AuthRepository()
    contract_mapping = repo.contract_teams(target)
    bh_configured_ids = contract_mapping.get("BH", set())
    te_configured_ids = contract_mapping.get("TE", set())

    print(f"\nCatenda Teams for prosjekt '{target}' ({len(teams)} teams funnet):")
    print(f"{'='*80}")

    for t in teams:
        tid = t["id"]
        tname = t.get("name", "")
        normalized_tid = catenda_id(tid)

        is_bh = normalized_tid in bh_configured_ids or "byggherre" in tname.lower() or "bh" in tname.lower()
        is_te = normalized_tid in te_configured_ids or "te" in tname.lower() or "pgl" in tname.lower()

        # Hvis ikke --all er valgt, vis kun relevante / matcher
        if not args.all and not (is_bh or is_te):
            continue

        role_tag = ""
        if normalized_tid in bh_configured_ids:
            role_tag = " [KONFIGURERT SOM BH]"
        elif normalized_tid in te_configured_ids:
            role_tag = " [KONFIGURERT SOM TE]"

        # Hent medlemmer i teamet
        m_url = f"{client.base_url}/v2/projects/{cat_pid}/teams/{tid}/members"
        m_resp = client._safe_request("GET", m_url)
        members = m_resp.json() if m_resp else []

        print(f"\n▶ Team: '{tname}' (ID: {tid}){role_tag}")
        print(f"  Medlemmer ({len(members)}):")
        if not members:
            print("    (ingen medlemmer)")
        for m in members:
            u = m.get("user", {})
            print(f"    - {u.get('name')} <{u.get('email')}> [ID: {u.get('id')}]")

    print(f"\n{'='*80}")
    print("Nåværende kontraktsteams i databasen:")
    print(f"  BH: {list(bh_configured_ids) or '(ikke konfigurert)'}")
    print(f"  TE: {list(te_configured_ids) or '(ikke konfigurert)'}")
    print(f"{'='*80}\n")


KONTRAKTSTEAM_I_TS = (
    "Kontraktsteamene registreres bare med TS-verktøyet, som krever bekreftelsen "
    "--en-totalentreprenoer (DL-U14, #1072):\n"
    "  node server/registrering.ts kontraktsteam <prosjekt> --bh <team> … --te <team> … --en-totalentreprenoer\n"
    "  node server/registrering.ts registrer … --bh <team> … --te <team> … --en-totalentreprenoer"
)


def cmd_contract_teams(args):
    """Stoppet: kontraktsteamene registreres bare med `server/registrering.ts` (#1072)."""
    print(KONTRAKTSTEAM_I_TS, file=sys.stderr)
    sys.exit(2)


def main():
    parser = argparse.ArgumentParser(description="Catenda & Prosjekt Administrasjonsverktøy")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # list
    p_list = subparsers.add_parser("list", help="List alle registrerte prosjekter")
    p_list.set_defaults(func=cmd_list)

    # sync-name
    p_name = subparsers.add_parser("sync-name", help="Hent og oppdater prosjektnavn fra Catenda")
    p_name.add_argument("project_id", nargs="?", help="Valgfri intern prosjekt-ID")
    p_name.set_defaults(func=cmd_sync_name)

    # register
    p_reg = subparsers.add_parser("register", help="Registrer nytt prosjekt")
    p_reg.add_argument("--id", required=True, help="Intern prosjekt-ID (f.eks. 'oslobygg')")
    p_reg.add_argument("--catenda-project-id", required=True, help="Catenda prosjekt UUID")
    p_reg.add_argument("--library-id", required=True, help="Catenda library UUID")
    p_reg.add_argument(
        "--organisasjon-id",
        required=True,
        help="Virksomheten prosjektet tilhører. Ingen defaultverdi (MS-10)",
    )
    p_reg.add_argument("--folder-id", help="Catenda folder UUID (valgfri)")
    p_reg.add_argument("--topic-board-id", help="Catenda topic board UUID (valgfri)")
    p_reg.add_argument("--name", help="Valgfritt navn (hentes fra Catenda om utelatt)")
    p_reg.add_argument("--description", help="Valgfri beskrivelse")
    p_reg.add_argument("--bh", nargs="+", help="Stoppet: bruk server/registrering.ts (#1072)")
    p_reg.add_argument("--te", nargs="+", help="Stoppet: bruk server/registrering.ts (#1072)")
    p_reg.set_defaults(func=cmd_register)

    # sync-members
    p_sync = subparsers.add_parser("sync-members", help="Synkroniser medlemmer fra Catenda")
    p_sync.add_argument("project_id", nargs="?", help="Valgfri intern prosjekt-ID")
    p_sync.set_defaults(func=cmd_sync_members)

    # teams
    p_teams = subparsers.add_parser("teams", help="Vis teams og medlemmer fra Catenda")
    p_teams.add_argument("project_id", nargs="?", default="oslobygg", help="Intern prosjekt-ID")
    p_teams.add_argument("--all", action="store_true", help="Vis alle teams, ikke bare BH/TE")
    p_teams.set_defaults(func=cmd_teams)

    # contract-teams
    p_ct = subparsers.add_parser("contract-teams", help="Stoppet: bruk server/registrering.ts (#1072)")
    p_ct.add_argument("resten", nargs=argparse.REMAINDER, help=argparse.SUPPRESS)
    p_ct.set_defaults(func=cmd_contract_teams)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
