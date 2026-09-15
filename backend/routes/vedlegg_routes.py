"""Vedleggsruter: opplasting, liste og nedlasting.

Dokumentene lever i Catendas bibliotek — appen holder ingen egen kopi. Det gir
én autoritativ fil per vedlegg, som er det en kontraktstvist trenger: to kopier
kan divergere, og «hvilken fil ble faktisk sendt» må ha ett svar.

Tilgangskontroll er vår, ikke Catendas. Backend snakker med Catenda gjennom
appens tjenestekonto (`lib/catenda_factory.get_catenda_client`), ikke brukerens
egen Catenda-tilgang, så bibliotekets team-rettigheter begrenser ikke hva appen
kan lese. Hver forespørsel autoriseres derfor her, mot `VedleggRegistry`, som
binder et vedlegg til nøyaktig én sak i ett prosjekt.

Catendas `/token`-endepunkt, som utsteder en signert nedlastings-URL uten
autentisering i én time, brukes bevisst ikke. En slik URL ville vært en
omgåelig lenke til et dokument i en tvistesak.
"""

from flask import Blueprint, g, jsonify, request
from werkzeug.utils import secure_filename

from lib.auth.contract_role import require_contract_role
from lib.auth.csrf_protection import require_csrf
from lib.auth.project_access import require_project_access
from lib.auth.session import require_auth
from lib.decorators import handle_service_errors
from services.vedlegg_registry import VedleggRegistry
from utils.logger import get_logger

logger = get_logger(__name__)

vedlegg_bp = Blueprint("vedlegg", __name__)

# Grensen gjelder én fil. Flask avviser hele forespørselen over
# MAX_CONTENT_LENGTH (16 MiB), så denne må ligge under den.
MAKS_VEDLEGG_BYTES = 15 * 1024 * 1024


def _registry() -> VedleggRegistry:
    return VedleggRegistry()


def _catenda_context(sak_id: str):
    """Gjenbruker innsendingsrutens Catenda-oppsett.

    Importeres bevisst i stedet for å bygge en ny prosjekt-/bibliotek-mapping:
    den globale rutingen er dokumentert som eget, avtalt arbeid i
    docs/catenda-dataflyt.md og skal ikke improviseres et nytt sted.
    """
    from routes.event_routes import _prepare_catenda_context

    return _prepare_catenda_context(sak_id)


@vedlegg_bp.route("/api/cases/<sak_id>/vedlegg", methods=["GET"])
@require_auth
@require_project_access()
@handle_service_errors
def list_vedlegg(sak_id: str):
    """Vedlegg registrert på saken."""
    return jsonify({"vedlegg": _registry().list(g.project_id, sak_id)})


@vedlegg_bp.route("/api/cases/<sak_id>/vedlegg", methods=["POST"])
@require_csrf
@require_auth
@require_project_access(min_role="member")
@require_contract_role()
@handle_service_errors
def last_opp_vedlegg(sak_id: str):
    """Last opp et vedlegg til sakens dokumentbibliotek i Catenda."""
    opplastet = request.files.get("file")
    if opplastet is None or not opplastet.filename:
        return jsonify(
            error="MANGLER_FIL", message="Velg en fil å laste opp."
        ), 400

    # secure_filename fjerner stier og uheldige tegn. Blir navnet tomt —
    # for eksempel «..» eller bare spesialtegn — er det ikke et filnavn.
    navn = secure_filename(opplastet.filename)
    if not navn:
        return jsonify(
            error="UGYLDIG_FILNAVN", message="Filnavnet kan ikke brukes."
        ), 400

    innhold = opplastet.read()
    if not innhold:
        return jsonify(error="TOM_FIL", message="Filen er tom."), 400
    if len(innhold) > MAKS_VEDLEGG_BYTES:
        return jsonify(
            error="FOR_STOR_FIL",
            message=f"Filen er større enn {MAKS_VEDLEGG_BYTES // (1024 * 1024)} MB.",
        ), 413

    ctx = _catenda_context(sak_id)
    if ctx is None:
        return jsonify(
            error="CATENDA_UTILGJENGELIG",
            message="Dokumentbiblioteket er ikke tilgjengelig.",
        ), 503

    import os
    import tempfile

    sti = None
    try:
        # upload_document leser fra disk. Filen ryddes uansett utfall, slik at
        # kontraktsinnhold ikke blir liggende i /tmp (jf. PDF-03).
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"-{navn}") as tmp:
            tmp.write(innhold)
            sti = tmp.name
        item = ctx.service.upload_document(
            project_id=ctx.project_id,
            file_path=sti,
            filename=navn,
            folder_id=ctx.folder_id,
        )
    finally:
        if sti:
            try:
                os.remove(sti)
            except OSError:
                pass

    if not item or not item.get("id"):
        return jsonify(
            error="OPPLASTING_FEILET",
            message="Dokumentet ble ikke lastet opp. Prøv igjen.",
        ), 502

    vedlegg_id = item["id"]
    _registry().record(
        g.project_id,
        sak_id,
        vedlegg_id,
        navn,
        len(innhold),
        g.user.get("name") or g.user.get("email") or g.user["id"],
        g.contract_role,
    )
    logger.info(f"Vedlegg lastet opp for sak {sak_id}: {vedlegg_id}")

    return jsonify(
        {
            "id": vedlegg_id,
            "navn": navn,
            "storrelse": len(innhold),
            "lastet_opp_rolle": g.contract_role,
        }
    ), 201


@vedlegg_bp.route("/api/cases/<sak_id>/vedlegg/<vedlegg_id>", methods=["GET"])
@require_auth
@require_project_access()
@handle_service_errors
def last_ned_vedlegg(sak_id: str, vedlegg_id: str):
    """Last ned et vedlegg som hører til saken.

    Autorisasjonen er at vedlegget er registrert på nøyaktig denne saken i
    dette prosjektet. En ukjent ID gir 404 — ikke 403 — slik at svaret ikke
    røper om et dokument finnes i et annet prosjekt.
    """
    registry = _registry()
    if not registry.belongs_to_case(g.project_id, sak_id, vedlegg_id):
        return jsonify(
            error="IKKE_FUNNET", message="Vedlegget finnes ikke på denne saken."
        ), 404

    ctx = _catenda_context(sak_id)
    if ctx is None:
        return jsonify(
            error="CATENDA_UTILGJENGELIG",
            message="Dokumentbiblioteket er ikke tilgjengelig.",
        ), 503

    resultat = ctx.service.download_document(ctx.project_id, vedlegg_id)
    if resultat is None:
        return jsonify(
            error="NEDLASTING_FEILET", message="Dokumentet kunne ikke hentes."
        ), 502

    innhold, catenda_navn = resultat
    # Det registrerte navnet er vårt eget og er allerede saneringsbehandlet;
    # Catendas navn brukes bare som reserve.
    registrert = next(
        (v["navn"] for v in registry.list(g.project_id, sak_id) if v["id"] == vedlegg_id),
        None,
    )
    filnavn = registrert or secure_filename(catenda_navn or "") or "vedlegg"

    from flask import Response

    return Response(
        innhold,
        mimetype="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filnavn}"',
            "Content-Length": str(len(innhold)),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )
