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
om. Hvilket resultat vurderingene gir, følger reglene i `src/lib/domain/`;
kartleggingen står i `docs/kartlegging-domeneregler-frontend-2026-09-23.md`.

DRF-01 ble funnet i samme kartlegging og bruker samme oppsett: byggherrens
forespørsel etter § 33.6.2, slik skjemaet sender den, når ikke journalen.
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
SAK_VARSEL = "KOE-DRF01"
HEADERS = {"X-Project-ID": "p", "X-CSRF-Token": "csrf"}

# Kravet er 500 000 kr i kategorien ENDRING, så § 34.1.2 gir ingen preklusjon.
# Metoden aksepteres og ingenting holdes tilbake (§ 30.2). Med ingenting
# godkjent gir reglene «avslått».
VEDERLAG_AVSLATT_MELDT_GODKJENT = {
    "aksepterer_metode": True,
    "hold_tilbake": False,
    "hovedkrav_vurdering": "avslatt",
    "hovedkrav_godkjent_belop": 0,
    "total_godkjent_belop": 0,
    "total_krevd_belop": 500000,
    "begrunnelse": "Kravet avslås.",
    "beregnings_resultat": "godkjent",
}

# Varslene er i tide, men forholdet har ikke hindret fremdriften (§ 33.1).
# Da gir reglene «avslått» uansett antall dager.
FRIST_AVSLATT_MELDT_GODKJENT = {
    "frist_varsel_ok": True,
    "spesifisert_krav_ok": True,
    "vilkar_oppfylt": False,
    "godkjent_dager": 0,
    "begrunnelse": "Ingen hindring.",
    "beregnings_resultat": "godkjent",
}


def _hendelse(event_type, aktor_rolle, data, **felt):
    return parse_event_from_request(
        {
            "sak_id": SAK,
            "event_type": event_type,
            "aktor_id": aktor_rolle.lower(),
            "aktor_rolle": aktor_rolle,
            "data": data,
            **felt,
        }
    )


@pytest.fixture
def sak(monkeypatch, tmp_path):
    """Sak med godkjent grunnlag og ett ubesvart krav i hvert pengespor."""
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("BH_APPROVAL_POLICIES", raising=False)

    lager = JsonFileEventRepository(str(tmp_path / "events"))
    opprettet = parse_event_from_request(
        {
            "sak_id": SAK,
            "event_type": "sak_opprettet",
            "aktor_id": "te",
            "aktor_rolle": "TE",
            "sakstittel": "Endret fundamentering",
            "prosjekt_id": "p",
        }
    )
    grunnlag = _hendelse(
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
    godkjent = _hendelse(
        "respons_grunnlag",
        "BH",
        {"resultat": "godkjent", "begrunnelse": "Byggherrens risiko."},
        refererer_til_event_id=grunnlag.event_id,
    )
    vederlag = _hendelse(
        "vederlag_krav_sendt",
        "TE",
        {
            "metode": "FASTPRIS_TILBUD",
            "belop_direkte": 500000,
            "begrunnelse": "Merarbeid.",
        },
    )
    frist = _hendelse(
        "frist_krav_sendt",
        "TE",
        {
            "varsel_type": "spesifisert",
            "antall_dager": 30,
            "begrunnelse": "Forsinket råbygg.",
        },
    )
    for versjon, hendelse in enumerate(
        [opprettet, grunnlag, godkjent, vederlag, frist]
    ):
        lager.append(hendelse, versjon)

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
    return SimpleNamespace(client=client, lager=lager, vederlag=vederlag, frist=frist)


def _svar(sak, event_type, refererer_til, data):
    _, versjon = sak.lager.get_events(SAK)
    return sak.client.post(
        "/api/events",
        json={
            "sak_id": SAK,
            "expected_version": versjon,
            "event": {
                "event_type": event_type,
                "refererer_til_event_id": refererer_til,
                "data": data,
            },
        },
        headers=HEADERS,
    )


def _lagret_tilstand(sak):
    raw, _ = sak.lager.get_events(SAK)
    return TimelineService().compute_state([parse_event(e) for e in raw])


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "BR-01: /api/events lagrer beregnings_resultat=godkjent på et vederlagssvar "
        "der hovedkravet er avslått og godkjent beløp er 0; sporet blir GODKJENT"
    ),
)
def test_vederlagssvar_med_resultat_som_ikke_folger_av_vurderingene(sak):
    svar = _svar(
        sak,
        "respons_vederlag",
        sak.vederlag.event_id,
        {"vederlag_krav_id": sak.vederlag.event_id, **VEDERLAG_AVSLATT_MELDT_GODKJENT},
    )

    if svar.status_code != 201:
        assert svar.status_code == 400, svar.get_json()
        return
    vederlag = _lagret_tilstand(sak).vederlag
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
    svar = _svar(
        sak,
        "respons_frist",
        sak.frist.event_id,
        {"frist_krav_id": sak.frist.event_id, **FRIST_AVSLATT_MELDT_GODKJENT},
    )

    if svar.status_code != 201:
        assert svar.status_code == 400, svar.get_json()
        return
    frist = _lagret_tilstand(sak).frist
    assert frist.bh_resultat == FristBeregningResultat.AVSLATT, (
        f"Vurderingene gir avslått, men sporet lagret bh_resultat={frist.bh_resultat}, "
        f"status={frist.status}, vilkar_oppfylt={frist.vilkar_oppfylt}"
    )
    assert frist.status == SporStatus.AVSLATT


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
    """Samme vederlagssvar, gjennom intern godkjenning.

    Saksbehandleren har ubegrenset fullmakt, så pakken godkjennes ved
    innsending og kan publiseres straks.
    """
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
    data = {"vederlag_krav_id": sak.vederlag.event_id, **VEDERLAG_AVSLATT_MELDT_GODKJENT}

    def kommando(action, **felt):
        versjon = sak.client.get(
            f"/api/cases/{SAK}/approvals", headers=HEADERS
        ).get_json()["state"]["version"]
        svar = sak.client.post(
            f"/api/cases/{SAK}/approvals",
            json={
                "action": action,
                "commandId": str(uuid4()),
                "expectedVersion": versjon,
                **felt,
            },
            headers=HEADERS,
        )
        return svar.status_code, (svar.get_json() or {}).get("state")

    status, tilstand = kommando(
        "prepare",
        item={
            "track": "vederlag",
            "eventType": "respons_vederlag",
            "claimId": sak.vederlag.event_id,
            "data": data,
        },
    )
    if status == 200:
        status, tilstand = kommando(
            "package",
            letter={
                "title": "Svar på vederlagskrav",
                "caseId": SAK,
                "caseTitle": "Endret fundamentering",
                "sender": "BH",
                "recipient": "TE",
                "date": "23. september 2026",
                "introduction": "Innledning",
                "closing": "Hilsen",
                "items": [{"id": tilstand["items"][-1]["id"]}],
            },
        )
    if status == 200:
        status, tilstand = kommando("publish", packageId=tilstand["packages"][-1]["id"])
    if status != 200:
        assert status == 400
        return

    pakke = tilstand["packages"][-1]
    if pakke["status"] != "sendt":
        assert pakke["status"] == "publisering_feilet", pakke
        return
    vederlag = _lagret_tilstand(sak).vederlag
    assert vederlag.bh_resultat == VederlagBeregningResultat.AVSLATT, (
        f"Vurderingene gir avslått, men sporet lagret bh_resultat={vederlag.bh_resultat}, "
        f"status={vederlag.status}; brevet sier "
        f"«{pakke['letter']['items'][0]['data']['beregnings_resultat']}»"
    )
    assert vederlag.status == SporStatus.AVSLATT


# =============================================================================
# DRF-01: forespørselen etter § 33.6.2
# =============================================================================



def _sak_med_noytralt_fristvarsel(lager):
    grunnlag = _hendelse(
        "grunnlag_opprettet",
        "TE",
        {
            "tittel": "Endret fundamentering",
            "hovedkategori": "ENDRING",
            "underkategori": "EO",
            "beskrivelse": "Byggherren endret fundamenteringen.",
            "dato_oppdaget": "2026-09-01",
        },
        sak_id=SAK_VARSEL,
    )
    hendelser = [
        parse_event_from_request(
            {
                "sak_id": SAK_VARSEL,
                "event_type": "sak_opprettet",
                "aktor_id": "te",
                "aktor_rolle": "TE",
                "sakstittel": "Endret fundamentering",
                "prosjekt_id": "p",
            }
        ),
        grunnlag,
        _hendelse(
            "respons_grunnlag",
            "BH",
            {"resultat": "godkjent", "begrunnelse": "Byggherrens risiko."},
            refererer_til_event_id=grunnlag.event_id,
            sak_id=SAK_VARSEL,
        ),
        _hendelse(
            "frist_krav_sendt",
            "TE",
            {
                "varsel_type": "varsel",
                "frist_varsel": {
                    "dato_sendt": "2026-09-02",
                    "metode": ["digital_oversendelse"],
                },
            },
            sak_id=SAK_VARSEL,
        ),
    ]
    for versjon, hendelse in enumerate(hendelser):
        lager.append(hendelse, versjon)
    return hendelser[-1]


# Frontenden sender `send_foresporsel`, som `FristResponsData` ikke kjenner, og
# ikke `har_bh_foresporsel`, som modellen og tilstanden bruker. Payloaden er den
# `fristDomain.buildEventData` bygger når BH krysser av for forespørsel på et
# nøytralt varsel, med `undefined`-felt utelatt slik JSON gjør.
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
    varsel = _sak_med_noytralt_fristvarsel(sak.lager)
    _, versjon = sak.lager.get_events(SAK_VARSEL)

    svar = sak.client.post(
        "/api/events",
        json={
            "sak_id": SAK_VARSEL,
            "expected_version": versjon,
            "event": {
                "event_type": "respons_frist",
                "refererer_til_event_id": varsel.event_id,
                "data": {
                    "frist_krav_id": varsel.event_id,
                    "frist_varsel_ok": True,
                    "send_foresporsel": True,
                    "godkjent_dager": 0,
                    "begrunnelse": "Byggherren etterspør spesifisert krav iht. §33.6.2.",
                    "auto_begrunnelse": "Byggherren etterspør spesifisert krav iht. §33.6.2.",
                    "beregnings_resultat": "avslatt",
                    "krevd_dager": 0,
                    "subsidiaer_triggers": ["ingen_hindring"],
                    "subsidiaer_resultat": "avslatt",
                    "subsidiaer_begrunnelse": "Byggherren etterspør spesifisert krav iht. §33.6.2.",
                    "vedlegg_ids": [],
                },
            },
        },
        headers=HEADERS,
    )

    assert svar.status_code == 201, svar.get_json()
    raw, _ = sak.lager.get_events(SAK_VARSEL)
    frist = TimelineService().compute_state([parse_event(e) for e in raw]).frist
    assert frist.har_bh_foresporsel is True
