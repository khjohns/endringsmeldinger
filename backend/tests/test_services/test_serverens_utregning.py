"""Serveren regner ut byggherrens svar og avviser et annet resultat (B-13, BR-01, #63).

Kilden for forventningene er vedtakene om B-13 i hovedplanen 3.1 (24.09):
alternativ (2) i streng form, regelversjonen fra klienten, og at serverens
avrundede verdier lagres. Sammenlikningen gjøres i forretningsreglene, som
`/api/events`, `/api/events/batch` og `ApprovalService.validate_items` kaller.

Regelen prøves først uten lager. Testene mot rutene bruker oppsettet i
BR-01-testene og flyttes med dem når `JsonFileEventRepository` går ut i F0b.
"""

import json
from pathlib import Path
from uuid import uuid4

import pytest

from models.events import parse_event
from regler import REGELVERSJON
from regler.sammenlikning import Avvik, FeilRegelversjon, kontroller_svar
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService
from tests.test_security.test_beregningsresultat_br01_20260923 import (  # noqa: F401
    FRIST_AVSLATT,
    HEADERS,
    VEDERLAG_AVSLATT,
    _hendelse,
    _lagret_tilstand,
    _opprett_sak,
    sak,
)

regler = BusinessRuleValidator()


def _krav_og_tilstand(lager, sak_id):
    krav = _opprett_sak(lager, sak_id)
    raw, _ = lager.get_events(sak_id)
    return krav, TimelineService().compute_state([parse_event(e) for e in raw])


def _vederlagssvar(krav, **endringer):
    """Delvis godkjent: 123 456,785 kr av 500 000 kr (ENDRING, fastpris)."""
    data = {
        "regelversjon": REGELVERSJON,
        "vederlag_krav_id": krav.event_id,
        "aksepterer_metode": True,
        "hold_tilbake": False,
        "hovedkrav_vurdering": "delvis",
        "hovedkrav_godkjent_belop": 123456.785,
        "beregnings_resultat": "delvis_godkjent",
        "total_godkjent_belop": 123456.79,
        "total_krevd_belop": 500000,
        "begrunnelse": "Delvis.",
        **endringer,
    }
    return _hendelse(
        krav.sak_id, "respons_vederlag", "BH", data, refererer_til_event_id=krav.event_id
    )


# =============================================================================
# Regelen, uten lager
# =============================================================================


def test_like_verdier_godtas_og_serverens_avrundede_verdier_lagres(sak):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak.lager, "S-like")
    svar = _vederlagssvar(krav.vederlag)
    assert regler.validate(svar, tilstand).is_valid
    assert svar.data.hovedkrav_godkjent_belop == 123456.79
    assert svar.data.total_godkjent_belop == 123456.79
    assert svar.data.rigg_godkjent_belop is None


def test_flyttall_sammenliknes_til_hele_oere(sak):  # noqa: F811
    """Designnotatet avsnitt 4: klienten regner med flyttall, serveren med Decimal."""
    krav, tilstand = _krav_og_tilstand(sak.lager, "S-flyt")
    svar = _vederlagssvar(
        krav.vederlag,
        hovedkrav_godkjent_belop=0.1 + 0.2,
        total_godkjent_belop=0.30000000000000004,
    )
    assert regler.validate(svar, tilstand).is_valid
    assert svar.data.total_godkjent_belop == 0.3


def test_avvik_avvises_med_serverens_verdi(sak):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak.lager, "S-avvik")
    svar = _vederlagssvar(krav.vederlag, total_godkjent_belop=123457)
    resultat = regler.validate(svar, tilstand)
    assert resultat.violated_rule == "RESULT_MISMATCH"
    assert "total_godkjent_belop=123456.79 (sendt: 123457.00)" in resultat.message
    with pytest.raises(Avvik):
        kontroller_svar("vederlag", svar.data, tilstand)


def test_triggere_sammenliknes_som_mengde(sak):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak.lager, "S-triggere")
    data = {**FRIST_AVSLATT, "frist_varsel_ok": False, "vilkar_oppfylt": False}
    data["subsidiaer_triggers"] = ["ingen_hindring", "preklusjon_varsel"]
    svar = _hendelse(
        "S-triggere",
        "respons_frist",
        "BH",
        {**data, "frist_krav_id": krav.frist.event_id, "beregnings_resultat": "avslatt"},
        refererer_til_event_id=krav.frist.event_id,
    )
    assert regler.validate(svar, tilstand).is_valid


@pytest.mark.parametrize("versjon", [None, REGELVERSJON - 1, REGELVERSJON + 1])
def test_annen_regelversjon_avvises(sak, versjon):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak.lager, "S-versjon")
    svar = _vederlagssvar(krav.vederlag, regelversjon=versjon)
    resultat = regler.validate(svar, tilstand)
    assert resultat.violated_rule == "RULE_VERSION"
    with pytest.raises(FeilRegelversjon):
        kontroller_svar("vederlag", svar.data, tilstand)


def test_regelversjonen_lagres_i_hendelsen(sak):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak.lager, "S-lagres")
    svar = _vederlagssvar(krav.vederlag)
    assert regler.validate(svar, tilstand).is_valid
    lagret = json.loads(svar.model_dump_json())
    assert lagret["data"]["regelversjon"] == REGELVERSJON


def test_en_delvis_oppdatering_avvises(sak):  # noqa: F811
    """B-13: en oppdatering må ha med hele svaret."""
    krav, tilstand = _krav_og_tilstand(sak.lager, "S-delvis")
    svar = _vederlagssvar(krav.vederlag, hovedkrav_vurdering=None)
    resultat = regler.validate(svar, tilstand)
    assert resultat.violated_rule == "ASSESSMENT_INVALID"
    assert "hovedkrav_vurdering: mangler" in resultat.message


# =============================================================================
# /api/events/batch
# =============================================================================


def _batch(sak, sak_id, hendelser):  # noqa: F811
    _, versjon = sak.lager.get_events(sak_id)
    return sak.client.post(
        "/api/events/batch",
        json={"sak_id": sak_id, "expected_version": versjon, "events": hendelser},
        headers=HEADERS,
    )


def _batchsvar(spor, krav, data, resultat):
    return {
        "event_type": f"respons_{spor}",
        "refererer_til_event_id": krav.event_id,
        "data": {f"{spor}_krav_id": krav.event_id, **data, "beregnings_resultat": resultat},
    }


def test_batch_avviser_et_resultat_som_ikke_folger_av_vurderingene(sak):  # noqa: F811
    krav = _opprett_sak(sak.lager, "S-batch")
    _, for_batch = sak.lager.get_events("S-batch")
    svar = _batch(
        sak,
        "S-batch",
        [
            _batchsvar("frist", krav.frist, FRIST_AVSLATT, "avslatt"),
            _batchsvar("vederlag", krav.vederlag, VEDERLAG_AVSLATT, "godkjent"),
        ],
    )
    assert svar.status_code == 400, svar.get_json()
    assert svar.get_json()["rule"] == "RESULT_MISMATCH"
    assert svar.get_json()["failed_event_type"] == "respons_vederlag"
    assert sak.lager.get_events("S-batch")[1] == for_batch


def test_batch_lagrer_like_svar(sak):  # noqa: F811
    """Kontrollsaken: samme batch med riktig resultat lagres."""
    krav = _opprett_sak(sak.lager, "S-batch-kontroll")
    svar = _batch(
        sak,
        "S-batch-kontroll",
        [
            _batchsvar("frist", krav.frist, FRIST_AVSLATT, "avslatt"),
            _batchsvar("vederlag", krav.vederlag, VEDERLAG_AVSLATT, "avslatt"),
        ],
    )
    assert svar.status_code == 201, svar.get_json()
    tilstand = _lagret_tilstand(sak, "S-batch-kontroll")
    assert tilstand.vederlag.bh_resultat.value == "avslatt"
    assert tilstand.frist.bh_resultat.value == "avslatt"


# =============================================================================
# Godkjenningsflyten: regelversjonen kontrolleres på nytt ved publish
# =============================================================================


def _godkjenningsflyt(sak, monkeypatch):  # noqa: F811
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
            json={"action": action, "commandId": str(uuid4()), "expectedVersion": versjon, **felt},
            headers=HEADERS,
        )
        return svar.status_code, svar.get_json() or {}

    return kommando


def _godkjent_pakke(kommando, krav, sak_id):
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
                "beregnings_resultat": "avslatt",
            },
        },
    )
    assert status == 200, svar
    status, svar = kommando(
        sak_id,
        "package",
        letter={
            "title": "Svar på vederlagskrav",
            "caseId": sak_id,
            "caseTitle": "Endret fundamentering",
            "sender": "BH",
            "recipient": "TE",
            "date": "4. oktober 2026",
            "introduction": "Innledning",
            "closing": "Hilsen",
            "items": [{"id": svar["state"]["items"][-1]["id"]}],
        },
    )
    assert status == 200, svar
    pakke = svar["state"]["packages"][-1]
    assert pakke["status"] == "godkjent", pakke
    return pakke


def test_publish_stopper_en_pakke_med_annen_regelversjon(sak, monkeypatch):  # noqa: F811
    """Vedtaket om regelversjon (3.1, 24.09): endres reglene mellom `prepare`
    og `publish`, stopper `publish` pakken, og den må godkjennes på nytt."""
    kommando = _godkjenningsflyt(sak, monkeypatch)
    krav = _opprett_sak(sak.lager, "S-publish").vederlag
    pakke = _godkjent_pakke(kommando, krav, "S-publish")

    monkeypatch.setattr("regler.sammenlikning.REGELVERSJON", REGELVERSJON + 1)
    status, svar = kommando("S-publish", "publish", packageId=pakke["id"])

    publisert = next(p for p in svar["state"]["packages"] if p["id"] == pakke["id"])
    assert publisert["status"] != "sendt"
    assert "regelversjon" in json.dumps(svar, ensure_ascii=False)
    assert _lagret_tilstand(sak, "S-publish").vederlag.bh_resultat is None


def test_publish_med_samme_regelversjon_sendes(sak, monkeypatch):  # noqa: F811
    """Kontrollsaken: uten endret regelversjon publiseres pakken."""
    kommando = _godkjenningsflyt(sak, monkeypatch)
    krav = _opprett_sak(sak.lager, "S-publish-kontroll").vederlag
    pakke = _godkjent_pakke(kommando, krav, "S-publish-kontroll")
    status, svar = kommando("S-publish-kontroll", "publish", packageId=pakke["id"])
    assert status == 200, svar
    assert svar["state"]["packages"][-1]["status"] == "sendt"
    tilstand = _lagret_tilstand(sak, "S-publish-kontroll")
    assert tilstand.vederlag.bh_resultat.value == "avslatt"


# =============================================================================
# Fullmakten regnes av regelmodulens tall
# =============================================================================


def test_fullmakten_regnes_av_serverens_tall(sak, tmp_path):  # noqa: F811
    """Designnotatet avsnitt 4: `exposure` regnes av modulens utregning, ikke
    av tallene i pakken."""
    from services.approval_service import ApprovalService

    krav = _opprett_sak(sak.lager, "S-fullmakt").vederlag
    tjeneste = ApprovalService(
        tmp_path / "fullmakt.sqlite", sak.lager, TimelineService(), regler
    )
    data = _vederlagssvar(krav, total_godkjent_belop=123456.7899).data.model_dump(
        mode="json", exclude_none=True
    )
    item = {
        "track": "vederlag",
        "eventType": "respons_vederlag",
        "claimId": krav.event_id,
        "owner": "bh",
        "data": data,
    }
    [serverens] = tjeneste.med_serverens_utregning("S-fullmakt", [item])
    assert data["total_godkjent_belop"] == 123456.7899
    assert serverens["data"]["total_godkjent_belop"] == 123456.79


# =============================================================================
# Nyttelasten skjemaene sender, gjennom /api/events og lest tilbake fra lageret
# =============================================================================

NYTTELAST = json.loads(
    (Path(__file__).resolve().parents[1] / "fixtures/skjemaenes_nyttelast.json").read_text()
)


def _som_skjemaet_ser_saken(sak, sak_id):  # noqa: F811
    tilstand = sak.client.get(f"/api/cases/{sak_id}/state", headers=HEADERS).get_json()
    tilstand = tilstand.get("state", tilstand)
    return {
        spor: {felt: tilstand[spor][felt] for felt in felter}
        for spor, felter in NYTTELAST["sak"].items()
    }


@pytest.mark.parametrize("navn", sorted(NYTTELAST["svar"]))
def test_skjemaets_svar_lagres_med_regelversjonen_i_journalen(sak, navn):  # noqa: F811
    """Fixturen lages av `buildEventData` i `src/lib/kontraktsbord/skjemanyttelast.test.ts`."""
    sak_id = f"S-skjema-{navn}"
    krav = _opprett_sak(sak.lager, sak_id)
    assert _som_skjemaet_ser_saken(sak, sak_id) == NYTTELAST["sak"]

    spor = "frist" if "frist" in navn else "vederlag"
    krav_id = getattr(krav, spor).event_id
    data = {**NYTTELAST["svar"][navn], f"{spor}_krav_id": krav_id}
    _, versjon = sak.lager.get_events(sak_id)
    svar = sak.client.post(
        "/api/events",
        json={
            "sak_id": sak_id,
            "expected_version": versjon,
            "event": {
                "event_type": f"respons_{spor}",
                "refererer_til_event_id": krav_id,
                "data": data,
            },
        },
        headers=HEADERS,
    )
    assert svar.status_code == 201, svar.get_json()

    lagret, _ = sak.lager.get_events(sak_id)
    assert lagret[-1]["data"]["regelversjon"] == REGELVERSJON
    assert lagret[-1]["data"]["beregnings_resultat"] == data["beregnings_resultat"]
