"""BR-01: BHs beregnede resultat lagres slik klienten sendte det.

Et BH-svar på vederlag eller frist bærer både vurderingene (portene) og
`beregnings_resultat`, som frontenden regner ut av dem. Testene sender et svar
der de to spriker, gjennom begge inngangene for BH-svar: `/api/events` og, når
prosjektet har godkjenningspolicy, `/api/cases/<sak>/approvals`. Validator,
parser, forretningsregler, godkjenningstjeneste, hendelseslager og tidslinje
er ekte. Autentisering, metadata og Catenda er byttet ut.

Assertionene er nøytrale mellom alternativ (1) og (2) under B-13 i hovedplanen:
enten avvises svaret, eller tilstanden viser resultatet vurderingene gir.
Velges alternativ (3), der begge lagres og avviket vises, må testene skrives
om. Hvert svar sendes først med riktig resultat på en kontrollsak. Blir
kontrollen lagret, er resultatet det eneste som skiller, og en avvisning av
svaret gjelder resultatet. Andre utfall gir `pytest.fail`, som en streng
`xfail` med `raises=AssertionError` ikke skjuler.

DRF-01 ble funnet i samme kartlegging og bruker samme oppsett. Begge er
beskrevet i `docs/kartlegging-domeneregler-frontend-2026-09-23.md`.
"""

import json
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from models.events import (
    FristBeregningResultat,
    SporStatus,
    VederlagBeregningResultat,
    parse_event,
    parse_event_from_request,
)
from repositories.event_repository import JsonFileEventRepository
from routes import event_routes
from routes.approval_routes import approval_bp
from services.timeline_service import TimelineService

SAK = "KOE-BR01"
HEADERS = {"X-Project-ID": "p", "X-CSRF-Token": "csrf"}

SPESIFISERT_FRISTKRAV = {
    "varsel_type": "spesifisert",
    "antall_dager": 30,
    "begrunnelse": "Forsinket råbygg.",
}
NOYTRALT_FRISTVARSEL = {
    "varsel_type": "varsel",
    "frist_varsel": {"dato_sendt": "2026-09-02", "metode": ["digital_oversendelse"]},
}

# Kravet er 500 000 kr i kategorien ENDRING, så § 34.1.2 gir ingen preklusjon.
# Metoden aksepteres og ingenting holdes tilbake (§ 30.2). Med ingenting
# godkjent gir reglene «avslått».
VEDERLAG_AVSLATT = {
    "aksepterer_metode": True,
    "hold_tilbake": False,
    "hovedkrav_vurdering": "avslatt",
    "hovedkrav_godkjent_belop": 0,
    "total_godkjent_belop": 0,
    "total_krevd_belop": 500000,
    "begrunnelse": "Kravet avslås.",
}

# Varslene er i tide, men forholdet har ikke hindret fremdriften (§ 33.1).
# Da gir reglene «avslått» uansett antall dager.
FRIST_AVSLATT = {
    "frist_varsel_ok": True,
    "spesifisert_krav_ok": True,
    "vilkar_oppfylt": False,
    "godkjent_dager": 0,
    "begrunnelse": "Ingen hindring.",
}


def _hendelse(sak_id, event_type, aktor_rolle, data, **felt):
    return parse_event_from_request(
        {
            "sak_id": sak_id,
            "event_type": event_type,
            "aktor_id": aktor_rolle.lower(),
            "aktor_rolle": aktor_rolle,
            "data": data,
            **felt,
        }
    )


def _opprett_sak(lager, sak_id, fristkrav=SPESIFISERT_FRISTKRAV):
    """Sak med godkjent grunnlag og ett ubesvart krav i hvert pengespor."""
    grunnlag = _hendelse(
        sak_id,
        "grunnlag_opprettet",
        "TE",
        {
            "tittel": "Endret fundamentering",
            "hovedkategori": "ENDRING",
            "underkategori": "EO",
            "beskrivelse": "Byggherren endret fundamenteringen.",
            "dato_oppdaget": "2026-09-01",
        },
    )
    vederlag = _hendelse(
        sak_id,
        "vederlag_krav_sendt",
        "TE",
        {
            "metode": "FASTPRIS_TILBUD",
            "belop_direkte": 500000,
            "begrunnelse": "Merarbeid.",
        },
    )
    frist = _hendelse(sak_id, "frist_krav_sendt", "TE", fristkrav)
    hendelser = [
        parse_event_from_request(
            {
                "sak_id": sak_id,
                "event_type": "sak_opprettet",
                "aktor_id": "te",
                "aktor_rolle": "TE",
                "sakstittel": "Endret fundamentering",
                "prosjekt_id": "p",
            }
        ),
        grunnlag,
        _hendelse(
            sak_id,
            "respons_grunnlag",
            "BH",
            {"resultat": "godkjent", "begrunnelse": "Byggherrens risiko."},
            refererer_til_event_id=grunnlag.event_id,
        ),
        vederlag,
        frist,
    ]
    for versjon, hendelse in enumerate(hendelser):
        lager.append(hendelse, versjon)
    return SimpleNamespace(sak_id=sak_id, vederlag=vederlag, frist=frist)


@pytest.fixture
def sak(monkeypatch, tmp_path):
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("BH_APPROVAL_POLICIES", raising=False)

    lager = JsonFileEventRepository(str(tmp_path / "events"))

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(event_routes.events_bp)
    app.register_blueprint(approval_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "bh-bruker", "email": "bh@example.test", "name": "BH"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "BH"
    auth.contract_membership.return_value = ("BH", "bh-team")
    app.extensions["koe_auth"] = auth

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id=None
    )
    container.event_repository = lager
    container.timeline_service = TimelineService()
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    monkeypatch.setattr("core.container.get_container", lambda: container)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(client=client, lager=lager)


def _svar(sak, sak_id, event_type, krav_id, data):
    _, versjon = sak.lager.get_events(sak_id)
    return sak.client.post(
        "/api/events",
        json={
            "sak_id": sak_id,
            "expected_version": versjon,
            "event": {
                "event_type": event_type,
                "refererer_til_event_id": krav_id,
                "data": data,
            },
        },
        headers=HEADERS,
    )


def _lagret_tilstand(sak, sak_id):
    raw, _ = sak.lager.get_events(sak_id)
    return TimelineService().compute_state([parse_event(e) for e in raw])


def _send_svar(sak, sak_id, spor, krav, vurderinger, resultat):
    return _svar(
        sak,
        sak_id,
        f"respons_{spor}",
        krav.event_id,
        {f"{spor}_krav_id": krav.event_id, **vurderinger, "beregnings_resultat": resultat},
    )


def _kontroller(sak, spor, vurderinger, resultat):
    """Samme svar med riktig resultat skal lagres på en egen sak.

    Da er resultatet det eneste som skiller, og en avvisning av svaret med feil
    resultat gjelder resultatet.
    """
    sak_id = f"{SAK}-{spor}-kontroll"
    krav = getattr(_opprett_sak(sak.lager, sak_id), spor)
    svar = _send_svar(sak, sak_id, spor, krav, vurderinger, resultat)
    if svar.status_code != 201:
        pytest.fail(f"Kontrollen ble ikke lagret: {svar.status_code} {svar.get_json()}")


def _avvist(svar):
    if svar.status_code not in (201, 400):
        pytest.fail(f"Uventet svar: {svar.status_code} {svar.get_json()}")
    return svar.status_code == 400


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "BR-01: /api/events lagrer beregnings_resultat=godkjent på et vederlagssvar "
        "der hovedkravet er avslått og godkjent beløp er 0; sporet blir GODKJENT"
    ),
)
def test_vederlagssvar_med_resultat_som_ikke_folger_av_vurderingene(sak):
    _kontroller(sak, "vederlag", VEDERLAG_AVSLATT, "avslatt")
    krav = _opprett_sak(sak.lager, SAK).vederlag
    if _avvist(_send_svar(sak, SAK, "vederlag", krav, VEDERLAG_AVSLATT, "godkjent")):
        return
    vederlag = _lagret_tilstand(sak, SAK).vederlag
    assert vederlag.bh_resultat == VederlagBeregningResultat.AVSLATT, (
        f"Vurderingene gir avslått, men sporet lagret bh_resultat={vederlag.bh_resultat}, "
        f"status={vederlag.status}, godkjent_belop={vederlag.godkjent_belop}"
    )
    assert vederlag.status == SporStatus.AVSLATT


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "BR-01: /api/events lagrer beregnings_resultat=godkjent på et fristsvar "
        "der vilkåret i § 33.1 ikke er oppfylt; sporet blir GODKJENT"
    ),
)
def test_fristsvar_med_resultat_som_ikke_folger_av_vurderingene(sak):
    _kontroller(sak, "frist", FRIST_AVSLATT, "avslatt")
    krav = _opprett_sak(sak.lager, SAK).frist
    if _avvist(_send_svar(sak, SAK, "frist", krav, FRIST_AVSLATT, "godkjent")):
        return
    frist = _lagret_tilstand(sak, SAK).frist
    assert frist.bh_resultat == FristBeregningResultat.AVSLATT, (
        f"Vurderingene gir avslått, men sporet lagret bh_resultat={frist.bh_resultat}, "
        f"status={frist.status}, vilkar_oppfylt={frist.vilkar_oppfylt}"
    )
    assert frist.status == SporStatus.AVSLATT


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "BR-01: to svar der vurderingene avslår alt, men resultatet sier godkjent, "
        "gir overordnet_status=OMFORENT og kan_utstede_eo=True"
    ),
)
def test_selvmotsigende_svar_gjor_saken_omforent_og_eo_utstedbar(sak):
    krav = _opprett_sak(sak.lager, SAK)
    for spor, vurderinger in (("vederlag", VEDERLAG_AVSLATT), ("frist", FRIST_AVSLATT)):
        _kontroller(sak, spor, vurderinger, "avslatt")
        _avvist(_send_svar(sak, SAK, spor, getattr(krav, spor), vurderinger, "godkjent"))

    tilstand = _lagret_tilstand(sak, SAK)
    assert tilstand.overordnet_status != "OMFORENT"
    assert tilstand.kan_utstede_eo is False


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "BR-01: godkjenningsflyten publiserer beregnings_resultat=godkjent på et "
        "vederlagssvar der hovedkravet er avslått; sporet blir GODKJENT"
    ),
)
def test_godkjenningsflyten_publiserer_resultat_som_ikke_folger_av_vurderingene(
    sak, monkeypatch
):
    """Saksbehandleren har ubegrenset fullmakt, så pakken godkjennes ved innsending."""
    monkeypatch.setenv(
        "BH_APPROVAL_POLICIES",
        json.dumps(
            {
                "p": {
                    "handlers": [
                        {
                            "id": "bh@example.test",
                            "user_id": "bh-bruker",
                            "role": "Adm.dir (daglig leder)",
                        }
                    ],
                    "chain": [],
                }
            }
        ),
    )

    def kommando(sak_id, action, **felt):
        url = f"/api/cases/{sak_id}/approvals"
        versjon = sak.client.get(url, headers=HEADERS).get_json()["state"]["version"]
        svar = sak.client.post(
            url,
            json={
                "action": action,
                "commandId": str(uuid4()),
                "expectedVersion": versjon,
                **felt,
            },
            headers=HEADERS,
        )
        return svar.status_code, svar.get_json() or {}

    def publiser(sak_id, resultat):
        """Status for første steg som ikke ga 200, eller den publiserte pakken."""
        krav = _opprett_sak(sak.lager, sak_id).vederlag
        status, svar = kommando(
            sak_id,
            "prepare",
            item={
                "track": "vederlag",
                "eventType": "respons_vederlag",
                "claimId": krav.event_id,
                "data": {
                    "vederlag_krav_id": krav.event_id,
                    **VEDERLAG_AVSLATT,
                    "beregnings_resultat": resultat,
                },
            },
        )
        if status != 200:
            return status, svar
        status, svar = kommando(
            sak_id,
            "package",
            letter={
                "title": "Svar på vederlagskrav",
                "caseId": sak_id,
                "caseTitle": "Endret fundamentering",
                "sender": "BH",
                "recipient": "TE",
                "date": "23. september 2026",
                "introduction": "Innledning",
                "closing": "Hilsen",
                "items": [{"id": svar["state"]["items"][-1]["id"]}],
            },
        )
        if status != 200:
            return status, svar
        status, svar = kommando(
            sak_id, "publish", packageId=svar["state"]["packages"][-1]["id"]
        )
        return status, svar["state"]["packages"][-1] if status == 200 else svar

    status, kontroll = publiser(f"{SAK}-godkjenning-kontroll", "avslatt")
    if status != 200 or kontroll["status"] != "sendt":
        pytest.fail(f"Kontrollen ble ikke publisert: {status} {kontroll}")

    sak_id = SAK
    status, pakke = publiser(sak_id, "godkjent")
    if status == 400:
        return
    if status != 200 or pakke["status"] != "sendt":
        pytest.fail(f"Uventet utfall: {status} {pakke}")
    vederlag = _lagret_tilstand(sak, sak_id).vederlag
    assert vederlag.bh_resultat == VederlagBeregningResultat.AVSLATT, (
        f"Vurderingene gir avslått, men sporet lagret bh_resultat={vederlag.bh_resultat}, "
        f"status={vederlag.status}; brevet sier "
        f"«{pakke['letter']['items'][0]['data']['beregnings_resultat']}»"
    )
    assert vederlag.status == SporStatus.AVSLATT


# =============================================================================
# DRF-01: forespørselen etter § 33.6.2
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "DRF-01: skjemaet sender send_foresporsel, som modellen ikke kjenner; "
        "API-validatoren avviser svaret fordi spesifisert_krav_ok og "
        "vilkar_oppfylt mangler, og forespørselen etter § 33.6.2 blir aldri lagret"
    ),
)
def test_foresporsel_om_spesifisering_fra_skjemaet_registreres(sak):
    """Payloaden er den `fristDomain.buildEventData` bygger for en forespørsel."""
    sak_id = f"{SAK}-foresporsel"
    varsel = _opprett_sak(sak.lager, sak_id, fristkrav=NOYTRALT_FRISTVARSEL).frist
    begrunnelse = "Byggherren etterspør spesifisert krav iht. §33.6.2."

    svar = _svar(
        sak,
        sak_id,
        "respons_frist",
        varsel.event_id,
        {
            "frist_krav_id": varsel.event_id,
            "frist_varsel_ok": True,
            "send_foresporsel": True,
            "godkjent_dager": 0,
            "begrunnelse": begrunnelse,
            "auto_begrunnelse": begrunnelse,
            "beregnings_resultat": "avslatt",
            "krevd_dager": 0,
            "subsidiaer_triggers": ["ingen_hindring"],
            "subsidiaer_resultat": "avslatt",
            "subsidiaer_begrunnelse": begrunnelse,
            "vedlegg_ids": [],
        },
    )

    if svar.status_code != 201:
        melding = (svar.get_json() or {}).get("message", "")
        if "spesifisert_krav_ok" not in melding and "vilkar_oppfylt" not in melding:
            pytest.fail(f"Avvist av en annen grunn enn DRF-01: {svar.status_code} {melding}")
    assert svar.status_code == 201, svar.get_json()
    assert _lagret_tilstand(sak, sak_id).frist.har_bh_foresporsel is True
