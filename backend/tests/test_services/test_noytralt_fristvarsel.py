"""Innsigelse og forespørsel på et fristkrav uten dager (TFR-06, DRF-01, #62).

Kilden for forventningene er vedtaket om nøytralt fristvarsel i hovedplanen
3.1 (23.09): innsigelse mot sen varsling (§ 5) og forespørsel om spesifisert
krav (§ 33.6.2) er egne handlinger. De setter ikke resultat, gjør ikke sporet
avslått og åpner ikke forsering. Et svar med dager og resultat avvises til TE
har spesifisert kravet (§ 33.7). Svarfristen er valgfri, og handlingene går
utenom intern godkjenning (oppdragsgiver 2026-10-04).

Reglene prøves mot `BusinessRuleValidator` og `TimelineService` uten lager, så
de kan flyttes når `JsonFileEventRepository` går ut i F0b. Testene mot
`/api/events` bruker oppsettet i BR-01-testene.
"""

import json
from datetime import date

import pytest
from pydantic import ValidationError

from models.events import (
    BH_BINDENDE_EVENTS,
    EventType,
    FristBeregningResultat,
    FristData,
    FristEvent,
    FristForesporselData,
    FristForesporselEvent,
    FristInnsigelseData,
    FristInnsigelseEvent,
    FristResponsData,
    FristVarselType,
    GrunnlagData,
    GrunnlagEvent,
    GrunnlagResponsData,
    GrunnlagResponsResultat,
    ResponsEvent,
    SakOpprettetEvent,
    SporStatus,
    SporType,
    VarselInfo,
    parse_event,
)
from models.letter_document import LetterSnapshot
from services.approval_policy import public_event_block_reason
from services.business_rules import BusinessRuleValidator
from services.catenda_comment_generator import CatendaCommentGenerator
from services.timeline_service import TimelineService
from tests.test_security.test_beregningsresultat_br01_20260923 import (  # noqa: F401
    HEADERS,
    NOYTRALT_FRISTVARSEL,
    _brev,
    _lagret_tilstand,
    _opprett_sak,
    _svar,
    sak,
)

timeline = TimelineService()
regler = BusinessRuleValidator()


def _sak_med_godkjent_grunnlag() -> list:
    opprettet = SakOpprettetEvent(
        sak_id="S-1", aktor_id="te", aktor_rolle="TE", sakstittel="Sak", prosjekt_id="p"
    )
    grunnlag = GrunnlagEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type=EventType.GRUNNLAG_OPPRETTET,
        data=GrunnlagData(
            tittel="Endret fundamentering",
            hovedkategori="ENDRING",
            underkategori="EO",
            beskrivelse="Byggherren endret fundamenteringen.",
            dato_oppdaget="2026-09-01",
        ),
    )
    svar = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type=EventType.RESPONS_GRUNNLAG,
        spor=SporType.GRUNNLAG,
        refererer_til_event_id=grunnlag.event_id,
        data=GrunnlagResponsData(
            resultat=GrunnlagResponsResultat.GODKJENT, begrunnelse="Byggherrens risiko"
        ),
    )
    return [opprettet, grunnlag, svar]


def _varsel(varsel_type="varsel", antall_dager=None, event_type=EventType.FRIST_KRAV_SENDT):
    return FristEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type=event_type,
        data=FristData(
            varsel_type=varsel_type,
            frist_varsel=VarselInfo(dato_sendt="2026-09-02", metode=["digital_oversendelse"]),
            antall_dager=antall_dager,
            begrunnelse="Krav" if antall_dager is not None else None,
        ),
    )


def _brevmodell() -> LetterSnapshot:
    return LetterSnapshot.model_validate(_brev("S-1", "Byggherren ber om spesifisert krav."))


def _innsigelse(krav_id, aktor_rolle="BH"):
    return FristInnsigelseEvent(
        sak_id="S-1",
        aktor_id=aktor_rolle.lower(),
        aktor_rolle=aktor_rolle,
        refererer_til_event_id=krav_id,
        data=FristInnsigelseData(
            frist_krav_id=krav_id, begrunnelse="Varselet kom tre måneder etter hindringen."
        ),
    )


def _foresporsel(krav_id, svarfrist=None):
    return FristForesporselEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        refererer_til_event_id=krav_id,
        data=FristForesporselData(
            frist_krav_id=krav_id,
            begrunnelse="Byggherren ber om spesifisert krav.",
            svarfrist=svarfrist,
            brev=_brevmodell(),
        ),
    )


def _fullt_svar(krav_id):
    return ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type=EventType.RESPONS_FRIST,
        spor=SporType.FRIST,
        refererer_til_event_id=krav_id,
        data=FristResponsData(
            frist_krav_id=krav_id,
            frist_varsel_ok=True,
            spesifisert_krav_ok=True,
            vilkar_oppfylt=True,
            beregnings_resultat=FristBeregningResultat.GODKJENT,
            godkjent_dager=10,
            begrunnelse="Godkjent",
        ),
    )


def _godtatt(hendelse, hendelser) -> bool:
    return regler.validate(hendelse, timeline.compute_state(hendelser)).is_valid


def _avvist_av(hendelse, hendelser) -> str | None:
    resultat = regler.validate(hendelse, timeline.compute_state(hendelser))
    return None if resultat.is_valid else resultat.violated_rule


# =============================================================================
# Handlingene setter ikke resultat, gjør ikke sporet avslått, åpner ikke forsering
# =============================================================================


@pytest.mark.parametrize("handling", [_innsigelse, _foresporsel])
def test_handlingen_lar_resultat_og_status_sta(handling):
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    for_handlingen = timeline.compute_state(hendelser + [varsel])
    hendelse = handling(varsel.event_id)
    assert _godtatt(hendelse, hendelser + [varsel])

    etter = timeline.compute_state(hendelser + [varsel, hendelse])

    assert etter.frist.status == SporStatus.SENDT
    assert etter.frist.bh_resultat is None
    assert etter.frist.respons_event_id is None
    assert etter.overordnet_status == for_handlingen.overordnet_status
    # ForseringService åpner forsering bare når frist.bh_resultat er «avslatt».
    assert etter.frist.bh_resultat != FristBeregningResultat.AVSLATT


def test_innsigelsen_registrerer_at_varselet_kom_for_sent():
    """§ 5 tredje ledd: innsigelsen må fremsettes for at varselet ikke skal anses i tide."""
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    innsigelse = _innsigelse(varsel.event_id)

    frist = timeline.compute_state(hendelser + [varsel, innsigelse]).frist

    assert frist.frist_varsel_ok is False
    assert frist.begrunnelse_varsel == innsigelse.data.begrunnelse


def test_foresporselen_gir_te_svarplikt():
    """§ 33.6.2 annet ledd: TE skal svare uten ugrunnet opphold."""
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    foresporsel = _foresporsel(varsel.event_id, svarfrist=date(2026, 10, 20))

    tilstand = timeline.compute_state(hendelser + [varsel, foresporsel])

    assert tilstand.frist.har_bh_foresporsel is True
    assert tilstand.frist.dato_bh_foresporsel == foresporsel.tidsstempel.date().isoformat()
    assert tilstand.frist.frist_for_spesifisering == "2026-10-20"
    assert tilstand.visningsstatus_frist == "Forespørsel om spesifisert krav sendt"


def test_foresporselen_skal_sendes_per_brev():
    """§ 33.6.2 første ledd: «Byggherrens forespørsel skal sendes per brev»."""
    with pytest.raises(ValidationError):
        FristForesporselData(frist_krav_id="k", begrunnelse="Spesifiser kravet.")


def test_handlingene_binder_ikke_byggherren():
    """Oppdragsgiver 2026-10-04: sendes uten intern godkjenning."""
    policy = {"handlers": ["bh@example.test"], "chain": []}
    for event_type in (EventType.FRIST_INNSIGELSE_SENDT, EventType.FRIST_FORESPORSEL_SENDT):
        assert event_type not in BH_BINDENDE_EVENTS
        assert public_event_block_reason(policy, {"event_type": event_type.value}) is None


# =============================================================================
# Sperren mot et fullt svar (§ 33.7)
# =============================================================================


@pytest.mark.parametrize("varsel_type", [FristVarselType.VARSEL, FristVarselType.BEGRUNNELSE_UTSATT])
def test_fullt_svar_avvises_til_kravet_har_dager(varsel_type):
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel(varsel_type=varsel_type)

    assert _avvist_av(_fullt_svar(varsel.event_id), hendelser + [varsel]) == "CLAIM_SPECIFIED"


def test_fullt_svar_godtas_etter_spesifiseringen():
    """§ 33.6.2 fjerde ledd: angir TE dager, skal BH svare etter § 33.7."""
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    foresporsel = _foresporsel(varsel.event_id)
    spesifisert = _varsel(
        varsel_type="spesifisert",
        antall_dager=30,
        event_type=EventType.FRIST_KRAV_SPESIFISERT,
    )
    hendelser += [varsel, foresporsel, spesifisert]

    assert _godtatt(_fullt_svar(spesifisert.event_id), hendelser)
    assert timeline.compute_state(hendelser).overordnet_status == "VENTER_PAA_SVAR"


def test_endret_svar_avvises_ogsa_paa_et_krav_uten_dager():
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    endret = _fullt_svar(varsel.event_id).model_copy(
        update={"event_type": EventType.RESPONS_FRIST_OPPDATERT}
    )

    assert _avvist_av(endret, hendelser + [varsel]) == "CLAIM_SPECIFIED"


# =============================================================================
# Når handlingene kan sendes
# =============================================================================


@pytest.mark.parametrize("handling", [_innsigelse, _foresporsel])
def test_handlingene_avvises_paa_et_spesifisert_krav(handling):
    """§ 33.6.2 første ledd: «så lenge TE ikke har fremmet krav etter 33.6.1»."""
    hendelser = _sak_med_godkjent_grunnlag()
    krav = _varsel(varsel_type="spesifisert", antall_dager=30)

    assert _avvist_av(handling(krav.event_id), hendelser + [krav]) == "CLAIM_UNSPECIFIED"


@pytest.mark.parametrize("handling", [_innsigelse, _foresporsel])
def test_handlingene_maa_gjelde_gjeldende_varsel(handling):
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()

    assert _avvist_av(handling("annet-krav"), hendelser + [varsel]) == "CLAIM_REFERENCE"


def test_bare_bh_kan_gjore_innsigelse():
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()

    assert _avvist_av(_innsigelse(varsel.event_id, "TE"), hendelser + [varsel]) == "ROLE_CHECK"


def test_innsigelsen_sendes_en_gang():
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    hendelser += [varsel, _innsigelse(varsel.event_id)]

    assert _avvist_av(_innsigelse(varsel.event_id), hendelser) == "NOT_ALREADY_OBJECTED"


def test_ny_foresporsel_forst_naar_te_har_svart():
    """§ 33.6.2 femte ledd: etter en begrunnelse for utsettelse gjelder § 33.6.1,
    og kravet er fortsatt ikke spesifisert, så BH kan spørre igjen."""
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    hendelser += [varsel, _foresporsel(varsel.event_id)]
    assert _avvist_av(_foresporsel(varsel.event_id), hendelser) == "REQUEST_PENDING"

    utsatt = _varsel(
        varsel_type="begrunnelse_utsatt", event_type=EventType.FRIST_KRAV_SPESIFISERT
    )
    hendelser.append(utsatt)

    assert _godtatt(_foresporsel(utsatt.event_id), hendelser)


# =============================================================================
# Visning: tidslinje, historikk og Catenda
# =============================================================================


def test_historikken_viser_handlingene():
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    hendelser += [varsel, _innsigelse(varsel.event_id), _foresporsel(varsel.event_id)]

    typer = [rad["endring_type"] for rad in timeline.get_frist_historikk(hendelser)]

    assert typer == ["sendt", "innsigelse", "foresporsel"]


def test_catenda_kommentaren_navngir_foresporselen():
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    foresporsel = _foresporsel(varsel.event_id, svarfrist=date(2026, 10, 20))
    tilstand = timeline.compute_state(hendelser + [varsel, foresporsel])

    kommentar = CatendaCommentGenerator().generate_comment(tilstand, foresporsel)

    assert "Forespørsel om spesifisert fristkrav" in kommentar
    assert "§ 33.6.2" in kommentar
    assert "2026-10-20" in kommentar


# =============================================================================
# Gjennom /api/events, med godkjenningspolicy
# =============================================================================


def test_innsigelsen_sendes_direkte_selv_med_godkjenningspolicy(sak, monkeypatch):  # noqa: F811
    monkeypatch.setenv(
        "BH_APPROVAL_POLICIES",
        json.dumps({"p": {"handlers": [{"id": "bh@example.test", "user_id": "bh-bruker"}]}}),
    )
    sak_id = "KOE-62-innsigelse"
    varsel = _opprett_sak(sak.lager, sak_id, fristkrav=NOYTRALT_FRISTVARSEL).frist

    svar = _svar(
        sak,
        sak_id,
        "frist_innsigelse_sendt",
        varsel.event_id,
        {"frist_krav_id": varsel.event_id, "begrunnelse": "Varselet kom for sent."},
    )

    assert svar.status_code == 201, svar.get_json()
    assert _lagret_tilstand(sak, sak_id).frist.frist_varsel_ok is False


def test_brevet_faar_serverens_referanser(sak):  # noqa: F811
    sak_id = "KOE-62-brev"
    varsel = _opprett_sak(sak.lager, sak_id, fristkrav=NOYTRALT_FRISTVARSEL).frist

    svar = _svar(
        sak,
        sak_id,
        "frist_foresporsel_sendt",
        varsel.event_id,
        {
            "frist_krav_id": varsel.event_id,
            "begrunnelse": "Spesifiser kravet.",
            "brev": _brev("feil-sak", "Spesifiser kravet."),
        },
    )

    assert svar.status_code == 201, svar.get_json()
    raw, _ = sak.lager.get_events(sak_id)
    lagret = parse_event(raw[-1])
    assert lagret.data.brev.referanser.eventId == svar.get_json()["event_id"]
    assert lagret.data.brev.referanser.sakId == sak_id


def test_neste_handling_er_tes_svar_paa_foresporselen():
    from models.sak_state import FristTilstand, SakState

    tilstand = SakState(
        sak_id="S-1",
        frist=FristTilstand(
            status=SporStatus.SENDT,
            varsel_type="varsel",
            krav_event_id="varsel",
            foresporsel_krav_id="varsel",
            har_bh_foresporsel=True,
        ),
    )

    assert tilstand.neste_handling["rolle"] == "TE"
    assert "33.6.2" in tilstand.neste_handling["handling"]
