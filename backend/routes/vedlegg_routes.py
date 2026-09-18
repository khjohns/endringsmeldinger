"""Vedleggsruter: opplasting, liste og nedlasting.

Usendte filer mellomlagres privat for avsenders Catenda-team. Etter innsending
lastes de opp og knyttes til saken i Catenda; opplastingskvitteringen frigir
de lokale bytene. En feil i leveringen gjør ikke hendelsen usendt.

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
from lib.auth.domain import catenda_id
from lib.auth.event_visibility import reader_contract_team
from lib.auth.project_access import require_project_access
from lib.auth.session import require_auth
from lib.decorators import handle_service_errors
from lib.vedlegg_innhold import UgyldigVedlegg, kontroller_innhold
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
@require_contract_role()
@handle_service_errors
def list_vedlegg(sak_id: str):
    """Vedlegg registrert på saken.

    `min_rolle` lar klienten vise fjern-knappen bare på egne vedlegg. Det er
    en visningshjelp — sletteruten håndhever regelen uavhengig av den.
    """
    from lib.auth.event_visibility import reader_contract_role

    team = reader_contract_team()
    return jsonify(
        {
            "vedlegg": [
                v
                for v in _registry().list(g.project_id, sak_id)
                if VedleggRegistry.visible(v, team)
            ],
            "min_rolle": reader_contract_role(),
        }
    )


@vedlegg_bp.route("/api/cases/<sak_id>/vedlegg", methods=["POST"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role()
@handle_service_errors
def last_opp_vedlegg(sak_id: str):
    """Mellomlagre et valgfritt vedlegg privat for avsenders team."""
    team = reader_contract_team()
    if not team:
        return jsonify(
            error="MANGLER_TEAM",
            message="Opplasting krever entydig teamtilknytning i Catenda.",
        ), 403
    opplastet = request.files.get("file")
    if opplastet is None or not opplastet.filename:
        return jsonify(error="MANGLER_FIL", message="Velg en fil å laste opp."), 400

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

    try:
        kontroller_innhold(navn, innhold)
    except UgyldigVedlegg as e:
        return jsonify(error="UGYLDIG_INNHOLD", message=str(e)), 400

    oppforing = _registry().stage(
        g.project_id,
        sak_id,
        navn,
        innhold,
        g.user.get("name") or g.user.get("email") or g.user["id"],
        g.contract_role,
        team,
    )
    logger.info(f"Vedlegg mellomlagret for sak {sak_id}: {oppforing['id']}")

    return jsonify(oppforing), 201


@vedlegg_bp.route("/api/cases/<sak_id>/vedlegg/<vedlegg_id>", methods=["GET"])
@require_auth
@require_project_access()
@require_contract_role()
@handle_service_errors
def last_ned_vedlegg(sak_id: str, vedlegg_id: str):
    """Last ned et vedlegg som hører til saken.

    Autorisasjonen er at vedlegget er registrert på nøyaktig denne saken i
    dette prosjektet. En ukjent ID gir 404 — ikke 403 — slik at svaret ikke
    røper om et dokument finnes i et annet prosjekt.
    """
    registry = _registry()
    oppforing = registry.get(g.project_id, sak_id, vedlegg_id)
    if oppforing is None or not registry.visible(oppforing, reader_contract_team()):
        return jsonify(
            error="IKKE_FUNNET", message="Vedlegget finnes ikke på denne saken."
        ), 404

    innhold = registry.content(g.project_id, sak_id, vedlegg_id)
    if innhold is None:
        # Levert: Catenda holder dokumentet, vi holder ingen kopi.
        ctx = _catenda_context(sak_id)
        if ctx is None:
            return jsonify(
                error="CATENDA_UTILGJENGELIG",
                message="Dokumentbiblioteket er ikke tilgjengelig.",
            ), 503
        resultat = ctx.service.download_document(
            ctx.project_id, oppforing["catenda_item_id"] or vedlegg_id
        )
        if resultat is None:
            return jsonify(
                error="NEDLASTING_FEILET", message="Dokumentet kunne ikke hentes."
            ), 502
        innhold, _catenda_navn = resultat

    filnavn = oppforing["navn"]

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


def _refererte_vedlegg(sak_id: str) -> set[str]:
    """Vedlegg en lagret hendelse viser til.

    Normalt er slike allerede `delivered`, men leveringen kan ha feilet etter
    at hendelsen ble lagret. Da står vedlegget fortsatt som `staged` mens saken
    viser til det, og det må ikke kunne slettes.
    """
    from models.events import parse_event
    from routes.event_routes import _get_event_repo

    events_data, _versjon = _get_event_repo().get_events(sak_id)
    referert: set[str] = set()
    for rad in events_data or []:
        hendelse = parse_event(rad)
        for ref in getattr(getattr(hendelse, "data", None), "vedlegg_ids", None) or []:
            referert.add(catenda_id(ref))
    return referert


@vedlegg_bp.route("/api/cases/<sak_id>/vedlegg/<vedlegg_id>", methods=["DELETE"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role()
@handle_service_errors
def slett_vedlegg(sak_id: str, vedlegg_id: str):
    """Fjern et mellomlagret vedlegg.

    Et `staged` vedlegg har aldri forlatt oss, så det kan fjernes uten spor:
    ingenting er lastet opp til det delte biblioteket, og motparten har ikke
    kunnet se det. Det er hele grunnen til at opplastingen er utsatt til
    innsending.

    Et levert vedlegg er sendt og er del av sakens formelle grunnlag; det
    fjernes ikke herfra. Og bare den siden som lastet opp kan fjerne: motparten
    skal ikke kunne rydde i den andres dokumentasjon.
    """
    from services.vedlegg_registry import STAGED

    registry = _registry()
    oppforing = registry.get(g.project_id, sak_id, vedlegg_id)
    if oppforing is None:
        return jsonify(
            error="IKKE_FUNNET", message="Vedlegget finnes ikke på denne saken."
        ), 404

    if (
        not reader_contract_team()
        or oppforing.get("lastet_opp_team") != reader_contract_team()
    ):
        return jsonify(
            error="IKKE_EGEN_SIDE",
            message="Bare den som lastet opp vedlegget kan fjerne det.",
        ), 403

    if oppforing["status"] != STAGED:
        # Levert betyr at en lagret hendelse viste til vedlegget og at det er
        # sendt til motparten. Da er det del av sakens formelle grunnlag.
        return jsonify(
            error="VEDLEGG_SENDT",
            message="Vedlegget er sendt og kan ikke fjernes.",
        ), 409

    try:
        referert = _refererte_vedlegg(sak_id) | {
            catenda_id(ref) for ref in registry.approval_refs(g.project_id, sak_id)
        }
    except Exception:
        logger.exception("Kunne ikke lese hendelsene for %s", sak_id)
        return jsonify(
            error="KAN_IKKE_BEKREFTE",
            message="Kunne ikke bekrefte om vedlegget er i bruk. Prøv igjen.",
        ), 503

    if catenda_id(vedlegg_id) in referert:
        return jsonify(
            error="VEDLEGG_I_BRUK",
            message="Vedlegget er brukt i en hendelse eller ferdigstilt vurdering og kan ikke fjernes.",
        ), 409

    try:
        registry.delete(g.project_id, sak_id, vedlegg_id)
    except ValueError as error:
        return jsonify(error="VEDLEGG_I_BRUK", message=str(error)), 409
    logger.info(f"Vedlegg fjernet fra sak {sak_id}: {vedlegg_id}")

    return jsonify({"slettet": vedlegg_id}), 200


def lever_vedlegg_for_hendelser(project_id: str, sak_id: str, hendelser) -> None:
    """Last opp mellomlagrede vedlegg som hendelsene viser til.

    Kalles etter at hendelsen er lagret. Dette er øyeblikket vedlegget faktisk
    sendes: fram til nå har det ligget hos oss, usett av motparten.

    Feil her gjør ikke innsendingen mislykket — hendelsen er allerede
    committet, og en integrasjonsfeil skal ikke invitere til ny innsending
    (samme prinsipp som PDF-02). Vedlegget blir stående som mellomlagret, og
    sakens referanse til det består, slik at leveringen kan gjentas.
    """
    referert: set[str] = set()
    for hendelse in hendelser:
        for ref in getattr(getattr(hendelse, "data", None), "vedlegg_ids", None) or []:
            referert.add(catenda_id(ref))
    if not referert:
        return

    from services.vedlegg_registry import PENDING, STAGED

    registry = _registry()
    ventende = [
        oppforing
        for oppforing in registry.list(project_id, sak_id)
        if catenda_id(oppforing["id"]) in referert
        and oppforing["status"] in (STAGED, PENDING)
    ]
    if not ventende:
        return

    for oppforing in ventende:
        registry.mark_pending(project_id, sak_id, oppforing["id"])

    ctx = _catenda_context(sak_id)
    if ctx is None or not ctx.topic_id:
        logger.warning(
            "Hendelse lagret; vedlegg venter på tilgjengelig dokumentbibliotek (%s)",
            sak_id,
        )
        return

    import os
    import tempfile

    for oppforing in ventende:
        token = registry.claim_delivery(project_id, sak_id, oppforing["id"])
        if not token:
            continue
        sti = None
        try:
            # Re-read after claiming; another worker may have saved an upload receipt.
            entry = registry.get(project_id, sak_id, oppforing["id"])
            item_id = entry["catenda_item_id"]
            if not item_id:
                innhold = registry.content(project_id, sak_id, oppforing["id"])
                if innhold is None:
                    raise RuntimeError(
                        "Vedlegget mangler både innhold og Catenda-kvittering"
                    )
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=f"-{oppforing['navn']}"
                ) as tmp:
                    tmp.write(innhold)
                    sti = tmp.name
                item = ctx.service.upload_document(
                    project_id=ctx.project_id,
                    file_path=sti,
                    filename=oppforing["navn"],
                    folder_id=ctx.folder_id,
                )
                item_id = (item or {}).get("id") or (item or {}).get("library_item_id")
                if not item_id:
                    raise RuntimeError("Catenda returnerte ingen dokument-ID")
                registry.mark_uploaded(project_id, sak_id, oppforing["id"], item_id)
            from uuid import UUID

            document_guid = str(UUID(item_id))
            linked = ctx.service.create_document_reference(ctx.topic_id, document_guid)
            if not linked and document_guid != item_id:
                linked = ctx.service.create_document_reference(ctx.topic_id, item_id)
            if not linked:
                raise RuntimeError(
                    "Dokumentet er lastet opp, men kunne ikke knyttes til saken i Catenda"
                )
            registry.mark_delivered(project_id, sak_id, oppforing["id"], item_id)
            logger.info(
                "Vedlegg %s levert til Catenda for sak %s", oppforing["id"], sak_id
            )
        except Exception:
            logger.exception(
                "Hendelse lagret; opplasting av vedlegg %s feilet", oppforing["id"]
            )
            continue
        finally:
            registry.release_delivery(project_id, sak_id, oppforing["id"], token)
            if sti:
                try:
                    os.remove(sti)
                except OSError:
                    pass


def lever_vedlegg_for_hendelse(project_id: str, sak_id: str, event) -> None:
    """Enkelthendelse-variant av `lever_vedlegg_for_hendelser`."""
    lever_vedlegg_for_hendelser(project_id, sak_id, [event])


@vedlegg_bp.route("/api/cases/<sak_id>/vedlegg/retry", methods=["POST"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role()
@handle_service_errors
def retry_vedlegg(sak_id):
    """Retry committed references only; never append another public event."""
    from models.events import parse_event
    from routes.event_routes import _get_event_repo

    raw, _ = _get_event_repo().get_events(sak_id)
    lever_vedlegg_for_hendelser(g.project_id, sak_id, [parse_event(e) for e in raw])
    return jsonify(ok=True)
