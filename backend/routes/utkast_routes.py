"""Ruter for felles arbeidsutkast i en sak.

Utkastet deles av organisasjonen: alle i samme Catenda-team arbeider i samme
tekst, og ingen andre ser den. Det erstatter lokal nettleserlagring, som ikke
hadde noen bekreftet eier — en ny bruker i samme nettleser kunne få den forrige
brukerens kravtekst.

Tilgangskontrollen er vår, ikke Catendas. Catenda er kilden for hvem som sitter
i hvilket team, men backend snakker med Catenda gjennom appens tjenestekonto,
ikke brukerens, så bibliotekets teamrettigheter begrenser ikke hva appen kan
lese. `require_contract_role` slår derfor opp medlemskapet på nytt ved hver
forespørsel, og teamet må være entydig for at det skal finnes et utkast i det
hele tatt: treffer brukeren flere team på samme side, gir `contract_membership`
`None`, og da avvises forespørselen i stedet for å falle tilbake på siden.

Utkastet er ikke en del av sakens hendelsesstrøm. Det er arbeid før innsending,
og innsendingen er fortsatt det som fryser grunnlaget — derfor er revisjonen en
del av utkastets identitet, og en lagring her endrer aldri et sendt brev.
"""

from flask import Blueprint, g, jsonify, request

from lib.auth.contract_role import require_contract_role
from lib.auth.project_access import require_project_access
from lib.auth.session import require_auth
from lib.decorators import handle_service_errors
from models.events import SporType
from services.utkast_registry import UtkastKonflikt, UtkastRegistry

utkast_bp = Blueprint("utkast", __name__)

GYLDIGE_SPOR = frozenset(spor.value for spor in SporType)


def _registry() -> UtkastRegistry:
    return UtkastRegistry()


def _team_eller_avvis():
    """Leserens organisasjon, eller et 403-svar når den ikke er entydig.

    Fail-closed med vilje: «vet ikke hvilken organisasjon» er ikke en egen delt
    bøtte å legge utkast i. Samme regel som interne notater bruker.
    """
    team = getattr(g, "contract_team", None)
    if not team:
        return None, (
            jsonify(
                error="UKJENT_ORGANISASJON",
                message="Utkast krever entydig teamtilknytning i prosjektet.",
            ),
            403,
        )
    return team, None


def _spor_eller_avvis(spor: str):
    if spor not in GYLDIGE_SPOR:
        return None, (jsonify(error="UKJENT_SPOR", message="Ukjent spor."), 400)
    return spor, None


def _revisjon_eller_avvis(verdi):
    """Revisjonen er en del av utkastets identitet og må være et konkret tall."""
    if isinstance(verdi, bool) or verdi is None:
        return None, (
            jsonify(error="UGYLDIG_REVISJON", message="Revisjon mangler."),
            400,
        )
    try:
        revisjon = int(verdi)
    except (TypeError, ValueError):
        return None, (
            jsonify(error="UGYLDIG_REVISJON", message="Revisjon må være et tall."),
            400,
        )
    if revisjon < 0:
        return None, (
            jsonify(error="UGYLDIG_REVISJON", message="Revisjon må være et tall."),
            400,
        )
    return revisjon, None


@utkast_bp.route("/api/cases/<sak_id>/utkast/<spor>", methods=["GET"])
@require_auth
@require_project_access()
@require_contract_role()
@handle_service_errors
def hent_utkast(sak_id: str, spor: str):
    """Teamets arbeidsutkast for sporet og revisjonen.

    Et tomt utkast er ikke en feil: skjemaet er bare ikke påbegynt ennå.
    """
    spor, avvist = _spor_eller_avvis(spor)
    if avvist:
        return avvist
    revisjon, avvist = _revisjon_eller_avvis(request.args.get("revisjon"))
    if avvist:
        return avvist
    team, avvist = _team_eller_avvis()
    if avvist:
        return avvist

    return jsonify(
        utkast=_registry().hent(g.project_id, sak_id, spor, revisjon, team),
        team_id=team,
        user_id=g.user["id"],
    )


@utkast_bp.route("/api/cases/<sak_id>/utkast/<spor>", methods=["PUT"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role()
@handle_service_errors
def lagre_utkast(sak_id: str, spor: str):
    """Skriv teamets utkast, men bare hvis ingen andre har skrevet imens.

    `forventet_versjon` er versjonen klienten leste — `null` betyr at klienten
    mener utkastet ikke finnes. Stemmer den ikke, svarer vi 409 med teksten som
    faktisk står lagret, slik at klienten kan vise den i stedet for å overskrive
    en kollega stille. Dette er konfliktdeteksjon, ikke fletting.
    """
    spor, avvist = _spor_eller_avvis(spor)
    if avvist:
        return avvist

    kropp = request.get_json(silent=True) or {}
    if not isinstance(kropp, dict):
        return jsonify(error="UGYLDIG_KROPP", message="Ugyldig forespørsel."), 400

    revisjon, avvist = _revisjon_eller_avvis(kropp.get("revisjon"))
    if avvist:
        return avvist
    team, avvist = _team_eller_avvis()
    if avvist:
        return avvist

    innhold = kropp.get("innhold")
    if not isinstance(innhold, dict):
        return jsonify(
            error="UGYLDIG_INNHOLD", message="Utkastet må være et objekt."
        ), 400

    forventet_versjon = kropp.get("forventet_versjon")
    if forventet_versjon is not None and not isinstance(forventet_versjon, int):
        return jsonify(
            error="UGYLDIG_VERSJON", message="Forventet versjon må være et tall."
        ), 400

    try:
        lagret = _registry().lagre(
            g.project_id,
            sak_id,
            spor,
            revisjon,
            team,
            g.contract_role,
            innhold,
            g.user.get("email") or g.user.get("name") or g.user["id"],
            forventet_versjon,
        )
    except UtkastKonflikt as konflikt:
        return jsonify(
            error="UTKAST_KONFLIKT",
            message="Utkastet er endret av en annen i teamet.",
            utkast=konflikt.gjeldende,
        ), 409

    return jsonify(utkast=lagret)


@utkast_bp.route("/api/cases/<sak_id>/utkast/<spor>", methods=["DELETE"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role()
@handle_service_errors
def slett_utkast(sak_id: str, spor: str):
    """Forkast teamets utkast — normalt etter at hendelsen er sendt."""
    spor, avvist = _spor_eller_avvis(spor)
    if avvist:
        return avvist
    revisjon, avvist = _revisjon_eller_avvis(request.args.get("revisjon"))
    if avvist:
        return avvist
    team, avvist = _team_eller_avvis()
    if avvist:
        return avvist

    _registry().slett(g.project_id, sak_id, spor, revisjon, team)
    return "", 204
