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

import pytest

from regler import REGELVERSJON
from regler.sammenlikning import Avvik, FeilRegelversjon, kontroller_svar
from services.business_rules import BusinessRuleValidator
from tests.test_security.test_beregningsresultat_br01_20260923 import (  # noqa: F401
    FRIST_AVSLATT,
    HEADERS,
    VEDERLAG_AVSLATT,
    _hendelse,
    _lagret_tilstand,
    _opprett_sak,
    _svar,
    _svardata,
    godkjenningsflyt,
    sak,
)

regler = BusinessRuleValidator()


def _krav_og_tilstand(sak, sak_id):  # noqa: F811
    return _opprett_sak(sak.lager, sak_id), _lagret_tilstand(sak, sak_id)


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
    krav, tilstand = _krav_og_tilstand(sak, "S-like")
    svar = _vederlagssvar(krav.vederlag)
    assert regler.validate(svar, tilstand).is_valid
    assert svar.data.hovedkrav_godkjent_belop == 123456.79
    assert svar.data.total_godkjent_belop == 123456.79
    assert svar.data.rigg_godkjent_belop is None


def test_flyttall_sammenliknes_til_hele_oere(sak):  # noqa: F811
    """Designnotatet avsnitt 4: klienten regner med flyttall, serveren med Decimal."""
    krav, tilstand = _krav_og_tilstand(sak, "S-flyt")
    svar = _vederlagssvar(
        krav.vederlag,
        hovedkrav_godkjent_belop=0.1 + 0.2,
        total_godkjent_belop=0.30000000000000004,
    )
    assert regler.validate(svar, tilstand).is_valid
    assert svar.data.total_godkjent_belop == 0.3


def test_avvik_avvises_med_serverens_verdi(sak):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak, "S-avvik")
    svar = _vederlagssvar(krav.vederlag, total_godkjent_belop=123457)
    resultat = regler.validate(svar, tilstand)
    assert resultat.violated_rule == "RESULT_MISMATCH"
    assert "total_godkjent_belop=123456.79 (sendt: 123457.00)" in resultat.message
    with pytest.raises(Avvik):
        kontroller_svar("vederlag", svar.data, tilstand)


def test_triggere_sammenliknes_som_mengde(sak):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak, "S-triggere")
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


def test_triggere_serveren_ikke_har_avvises(sak):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak, "S-ekstra-trigger")
    svar = _vederlagssvar(krav.vederlag, subsidiaer_triggers=["metode_avslatt"])
    resultat = regler.validate(svar, tilstand)
    assert resultat.violated_rule == "RESULT_MISMATCH"
    assert "subsidiaer_triggers=ingen (sendt: [metode_avslatt])" in resultat.message


@pytest.mark.parametrize("versjon", [None, REGELVERSJON - 1, REGELVERSJON + 1])
def test_annen_regelversjon_avvises(sak, versjon):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak, "S-versjon")
    svar = _vederlagssvar(krav.vederlag, regelversjon=versjon)
    resultat = regler.validate(svar, tilstand)
    assert resultat.violated_rule == "RULE_VERSION"
    with pytest.raises(FeilRegelversjon):
        kontroller_svar("vederlag", svar.data, tilstand)


def test_regelversjonen_lagres_i_hendelsen(sak):  # noqa: F811
    krav, tilstand = _krav_og_tilstand(sak, "S-lagres")
    svar = _vederlagssvar(krav.vederlag)
    assert regler.validate(svar, tilstand).is_valid
    lagret = json.loads(svar.model_dump_json())
    assert lagret["data"]["regelversjon"] == REGELVERSJON


def test_en_delvis_oppdatering_avvises(sak):  # noqa: F811
    """B-13: en oppdatering må ha med hele svaret."""
    krav, tilstand = _krav_og_tilstand(sak, "S-delvis")
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
        "data": _svardata(spor, krav, data, resultat),
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
    kommando = godkjenningsflyt(sak, monkeypatch)
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
    kommando = godkjenningsflyt(sak, monkeypatch)
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


def test_pakken_baerer_serverens_tall_til_fullmakten(sak, monkeypatch):  # noqa: F811
    """Designnotatet avsnitt 4: fullmakten regnes av modulens utregning.
    `prepare` lagrer serverens verdier i vurderingen, og det er dem
    `exposure` leser."""
    kommando = godkjenningsflyt(sak, monkeypatch)
    krav = _opprett_sak(sak.lager, "S-fullmakt").vederlag
    data = _vederlagssvar(krav, hovedkrav_godkjent_belop=123456.785).data.model_dump(
        mode="json", exclude_none=True
    )
    status, svar = kommando(
        "S-fullmakt",
        "prepare",
        item={
            "track": "vederlag",
            "eventType": "respons_vederlag",
            "claimId": krav.event_id,
            "data": data,
        },
    )
    assert status == 200, svar
    assert data["hovedkrav_godkjent_belop"] == 123456.785
    assert svar["state"]["items"][-1]["data"]["hovedkrav_godkjent_belop"] == 123456.79


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
    svar = _svar(sak, sak_id, f"respons_{spor}", krav_id, data)
    assert svar.status_code == 201, svar.get_json()

    lagret, _ = sak.lager.get_events(sak_id)
    assert lagret[-1]["data"]["regelversjon"] == REGELVERSJON
    assert lagret[-1]["data"]["beregnings_resultat"] == data["beregnings_resultat"]


# =============================================================================
# Godkjenningsflyten: grunnlag og frist i samme pakke
# =============================================================================


def test_frist_vurderes_mot_grunnlaget_i_samme_pakke(tmp_path):
    """Avslår BH grunnlaget i samme pakke, er fristen subsidiær
    (`grunnlag_avslatt`). `prepare` og `package` må regne mot det samme
    grunnlaget, ellers avvises pakken ved `package`."""
    from tests.test_approval import test_approval_service as godkjenning

    tjeneste, lager, grunnlag = godkjenning.setup.__wrapped__(tmp_path)
    tjeneste.authority_policy = {"daily_rate": 10000}
    godkjenning.send_krav(lager, "frist")
    frist_krav = lager.get_events("case1")[0][-1]
    grunnlag["data"] = {**grunnlag["data"], "resultat": "avslatt"}
    grunnlag_item = godkjenning.command(tjeneste, "prepare", item=grunnlag)["items"][-1]
    frist_item = godkjenning.command(
        tjeneste,
        "prepare",
        item={
            "track": "frist",
            "eventType": "respons_frist",
            "claimId": frist_krav["event_id"],
            "data": {
                "regelversjon": REGELVERSJON,
                "frist_krav_id": frist_krav["event_id"],
                "frist_varsel_ok": True,
                "spesifisert_krav_ok": True,
                "vilkar_oppfylt": True,
                "godkjent_dager": frist_krav["data"]["antall_dager"],
                "beregnings_resultat": "godkjent",
                "subsidiaer_triggers": ["grunnlag_avslatt"],
                "begrunnelse": "Subsidiært godkjent.",
            },
        },
    )["items"][-1]
    pakke = godkjenning.command(
        tjeneste,
        "package",
        letter={
            "title": "Svar",
            "caseId": "case1",
            "caseTitle": "Endring",
            "sender": "BH",
            "recipient": "TE",
            "date": "4. oktober 2026",
            "introduction": "",
            "closing": "",
            "items": [grunnlag_item, frist_item],
        },
    )["packages"][-1]
    assert pakke["status"] in ("til_godkjenning", "godkjent")
