"""Reproduksjoner fra strukturkartleggingen av spor D (2026-10-05).

Dokumentet er `docs/kartlegging-struktur-spor-d-2026-10-05.md`. Hvert forløp
går gjennom forretningsreglene før hendelsen legges til, slik `/api/events`
gjør, og svarene bærer verdiene regelmodulen regner ut. Testene er strenge
`xfail` med funn-ID eller issuenummer; forutsetninger feiler med `pytest.fail`.
"""

import pytest

from models.events import (
    EventType,
    FristData,
    FristEvent,
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
    SubsidiaerTrigger,
    TEAkseptererResponsData,
    TEAkseptererResponsEvent,
    VarselInfo,
    VederlagData,
    VederlagEvent,
    VederlagResponsData,
    VederlagsMetode,
    WithdrawalData,
    WithdrawalEvent,
)
from models.sak_state import LUKKEDE_STATUSER
from regler import REGELVERSJON
from regler.frist import Fristkrav, Fristvurdering, beregn_frist
from regler.vederlag import Vederlagskrav, Vederlagsvurdering, beregn_vederlag
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService

SAK = "S-1"
GRUNNLAGSTRIGGERE = {
    SubsidiaerTrigger.GRUNNLAG_AVSLATT,
    SubsidiaerTrigger.GRUNNLAG_PREKLUDERT_32_2,
}


class Forlop:
    """En sak bygget hendelse for hendelse gjennom forretningsreglene."""

    def __init__(self):
        self.timeline = TimelineService()
        self.validator = BusinessRuleValidator()
        self.events = [
            SakOpprettetEvent(
                sak_id=SAK, aktor_id="te", aktor_rolle="TE", sakstittel="Sak", prosjekt_id="p"
            )
        ]

    @property
    def state(self):
        return self.timeline.compute_state(self.events)

    def valider(self, event):
        return self.validator.validate(event, self.state)

    def legg_til(self, event):
        resultat = self.valider(event)
        if not resultat.is_valid:
            pytest.fail(f"Forutsetning: {event.event_type.value} avvist: {resultat.message}")
        self.events.append(event)

    def grunnlag(self, underkategori):
        self.legg_til(
            GrunnlagEvent(
                sak_id=SAK,
                aktor_id="te",
                aktor_rolle="TE",
                event_type=EventType.GRUNNLAG_OPPRETTET,
                data=GrunnlagData(
                    tittel="Endret fundamentering",
                    hovedkategori="ENDRING",
                    underkategori=underkategori,
                    beskrivelse="Byggherren endret fundamenteringen.",
                    dato_oppdaget="2026-09-01",
                ),
            )
        )

    def vederlagskrav(self, belop, oppdatert=False):
        return VederlagEvent(
            sak_id=SAK,
            aktor_id="te",
            aktor_rolle="TE",
            event_type=EventType.VEDERLAG_KRAV_OPPDATERT
            if oppdatert
            else EventType.VEDERLAG_KRAV_SENDT,
            data=VederlagData(
                metode=VederlagsMetode.FASTPRIS_TILBUD,
                belop_direkte=belop,
                begrunnelse="Kostnader",
            ),
        )

    def fristkrav(self, dager):
        self.legg_til(
            FristEvent(
                sak_id=SAK,
                aktor_id="te",
                aktor_rolle="TE",
                event_type=EventType.FRIST_KRAV_SENDT,
                data=FristData(
                    varsel_type=FristVarselType.SPESIFISERT,
                    antall_dager=dager,
                    begrunnelse="Hindret",
                    spesifisert_varsel=VarselInfo(dato_sendt="2026-09-02", metode=["epost"]),
                ),
            )
        )

    def grunnlagssvar_hendelse(self, resultat, varslet_i_tide):
        return ResponsEvent(
            sak_id=SAK,
            aktor_id="bh",
            aktor_rolle="BH",
            event_type=EventType.RESPONS_GRUNNLAG,
            spor=SporType.GRUNNLAG,
            refererer_til_event_id=self.state.grunnlag.krav_event_id,
            data=GrunnlagResponsData(
                resultat=resultat,
                begrunnelse="Vurdert",
                grunnlag_varslet_i_tide=varslet_i_tide,
                regelversjon=REGELVERSJON,
            ),
        )

    def grunnlagssvar(self, resultat, varslet_i_tide):
        self.legg_til(self.grunnlagssvar_hendelse(resultat, varslet_i_tide))

    def vederlagssvar_hendelse(self, vurdering, godkjent=None):
        sak = self.state
        vurderinger = {"hovedkrav_vurdering": vurdering, "aksepterer_metode": True}
        if godkjent is not None:
            vurderinger["hovedkrav_godkjent_belop"] = godkjent
        r = beregn_vederlag(Vederlagskrav.fra_tilstand(sak), Vederlagsvurdering(**vurderinger))
        data = {
            **vurderinger,
            "regelversjon": REGELVERSJON,
            "begrunnelse": "Vurdert",
            "beregnings_resultat": r.beregnings_resultat,
            "total_godkjent_belop": float(r.total_godkjent_belop),
            "total_krevd_belop": float(r.total_krevd_belop),
            "hovedkrav_godkjent_belop": float(r.hovedkrav_godkjent_belop),
            "subsidiaer_triggers": list(r.subsidiaer_triggers) or None,
        }
        v = sak.vederlag
        oppdatert = v.respons_event_id is not None and v.bh_respondert_versjon == max(
            0, v.antall_versjoner - 1
        )
        if oppdatert:
            data["original_respons_id"] = v.respons_event_id
        else:
            data["vederlag_krav_id"] = v.krav_event_id
        hendelse = ResponsEvent(
            sak_id=SAK,
            aktor_id="bh",
            aktor_rolle="BH",
            event_type=EventType.RESPONS_VEDERLAG_OPPDATERT
            if oppdatert
            else EventType.RESPONS_VEDERLAG,
            spor=SporType.VEDERLAG,
            refererer_til_event_id=v.krav_event_id,
            data=VederlagResponsData(**data),
        )
        return hendelse, r

    def vederlagssvar(self, vurdering, godkjent=None):
        hendelse, r = self.vederlagssvar_hendelse(vurdering, godkjent)
        self.legg_til(hendelse)
        return r

    def fristsvar(self, vilkar_oppfylt=True):
        sak = self.state
        vurderinger = {
            "frist_varsel_ok": True,
            "spesifisert_krav_ok": True,
            "vilkar_oppfylt": vilkar_oppfylt,
            "godkjent_dager": sak.frist.krevd_dager,
        }
        r = beregn_frist(Fristkrav.fra_tilstand(sak), Fristvurdering(**vurderinger))
        self.legg_til(
            ResponsEvent(
                sak_id=SAK,
                aktor_id="bh",
                aktor_rolle="BH",
                event_type=EventType.RESPONS_FRIST,
                spor=SporType.FRIST,
                refererer_til_event_id=sak.frist.krav_event_id,
                data=FristResponsData(
                    **{k: v for k, v in vurderinger.items() if k != "godkjent_dager"},
                    regelversjon=REGELVERSJON,
                    begrunnelse="Vurdert",
                    frist_krav_id=sak.frist.krav_event_id,
                    beregnings_resultat=r.beregnings_resultat,
                    godkjent_dager=r.godkjent_dager,
                    subsidiaer_triggers=list(r.subsidiaer_triggers) or None,
                    subsidiaer_resultat=r.subsidiaer_resultat,
                    subsidiaer_godkjent_dager=r.subsidiaer_godkjent_dager,
                ),
            )
        )
        return r

    def aksept(self, spor):
        self.legg_til(
            TEAkseptererResponsEvent(
                sak_id=SAK,
                aktor_id="te",
                aktor_rolle="TE",
                spor=spor,
                data=TEAkseptererResponsData(),
            )
        )


def _sak_med_svar(underkategori, resultat, varslet_i_tide):
    forlop = Forlop()
    forlop.grunnlag(underkategori)
    forlop.legg_til(forlop.vederlagskrav(100000.0))
    forlop.fristkrav(20)
    forlop.grunnlagssvar(resultat, varslet_i_tide)
    return forlop


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "SK-01: TE kan godta en § 32.2-preklusjon; grunnlaget blir GODKJENT, saken "
        "OMFORENT og EO kan utstedes mens vederlag og frist er subsidiære"
    ),
)
def test_godtatt_preklusjon_etter_32_2_er_godtatt_avslag():
    """Vedtak 05.10 (oppdragsgiver, hovedplanen 3.1): godtar TE byggherrens svar
    om at grunnlaget er varslet for sent etter § 32.2, er det et godtatt avslag.
    Saken blir LUKKET_AVSLATT, og EO kan ikke utstedes (som vedtaket om #213)."""
    forlop = _sak_med_svar("IRREG", GrunnlagResponsResultat.GODKJENT, False)
    forlop.vederlagssvar("godkjent")
    forlop.fristsvar()
    sak = forlop.state
    if sak.grunnlag.status != SporStatus.UNDER_FORHANDLING or not sak.er_subsidiaert_vederlag:
        pytest.fail("Forutsetning: § 32.2-preklusjonen gir ikke tvist og subsidiært vederlag")

    forlop.aksept(SporType.GRUNNLAG)
    sak = forlop.state
    assert sak.grunnlag.status == SporStatus.AVSLATT_AKSEPTERT
    assert sak.overordnet_status == "LUKKET_AVSLATT"
    assert sak.kan_utstede_eo is False


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "SK-02: et oppdatert krav etter full godkjenning beholder status GODKJENT, "
        "og saken blir OMFORENT med et krav byggherren ikke har svart på"
    ),
)
def test_oppdatert_krav_etter_full_godkjenning_venter_paa_nytt_svar():
    """Vedtak 05.10 (oppdragsgiver, hovedplanen 3.1): et oppdatert krav fra TE
    åpner sporet igjen, og det venter på nytt svar."""
    forlop = _sak_med_svar("EO", GrunnlagResponsResultat.GODKJENT, None)
    forlop.vederlagssvar("godkjent")
    if forlop.state.vederlag.status != SporStatus.GODKJENT:
        pytest.fail("Forutsetning: vederlaget er ikke godkjent")

    forlop.legg_til(forlop.vederlagskrav(250000.0, oppdatert=True))
    forlop.fristsvar()
    sak = forlop.state
    if sak.vederlag.krevd_belop != 250000.0 or sak.frist.status != SporStatus.GODKJENT:
        pytest.fail("Forutsetning: kravet eller fristsvaret står ikke som ventet")
    assert sak.vederlag.status == SporStatus.SENDT
    assert sak.overordnet_status != "OMFORENT"
    assert sak.kan_utstede_eo is False


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "SK-02: et oppdatert krav etter at TE har godtatt svaret, lar status "
        "GODKJENT og aksepten stå"
    ),
)
def test_oppdatert_krav_etter_aksept_opphever_aksepten():
    """Vedtak 05.10 (oppdragsgiver, hovedplanen 3.1): et oppdatert krav fra TE
    åpner sporet igjen, og aksepten faller."""
    forlop = _sak_med_svar("EO", GrunnlagResponsResultat.GODKJENT, None)
    forlop.vederlagssvar("delvis", godkjent=50000.0)
    forlop.aksept(SporType.VEDERLAG)
    if not forlop.state.vederlag.te_akseptert:
        pytest.fail("Forutsetning: aksepten er ikke registrert")

    forlop.legg_til(forlop.vederlagskrav(80000.0, oppdatert=True))
    sak = forlop.state
    assert sak.vederlag.te_akseptert is False
    assert sak.vederlag.status == SporStatus.SENDT


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="SK-02: et trukket krav kan oppdateres, og sporet står som TRUKKET",
)
def test_trukket_krav_kan_ikke_oppdateres():
    """Vedtak 05.10 (oppdragsgiver, hovedplanen 3.1): et krav TE har trukket,
    kan ikke tas opp igjen med en oppdatering. Kontrollsaken er samme
    oppdatering uten tilbaketrekking, som skal godtas."""
    forlop = Forlop()
    forlop.grunnlag("EO")
    forlop.legg_til(forlop.vederlagskrav(100000.0))
    forlop.fristkrav(20)
    if not forlop.valider(forlop.vederlagskrav(50000.0, oppdatert=True)).is_valid:
        pytest.fail("Kontrollsak: oppdateringen avvises også uten tilbaketrekking")

    forlop.legg_til(
        WithdrawalEvent(
            sak_id=SAK,
            aktor_id="te",
            aktor_rolle="TE",
            event_type=EventType.VEDERLAG_KRAV_TRUKKET,
            data=WithdrawalData(),
        )
    )
    if forlop.state.vederlag.status != SporStatus.TRUKKET:
        pytest.fail("Forutsetning: vederlagskravet er ikke trukket")
    assert not forlop.valider(forlop.vederlagskrav(50000.0, oppdatert=True)).is_valid


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="SK-03: byggherren kan revidere et svar TE har godtatt",
)
def test_byggherren_kan_ikke_revidere_et_godtatt_svar():
    """Vedtak 05.10 (oppdragsgiver, hovedplanen 3.1): et svar TE har godtatt,
    kan byggherren ikke revidere. Kontrollsaken er den samme revisjonen før
    aksepten, som skal godtas."""
    forlop = _sak_med_svar("EO", GrunnlagResponsResultat.GODKJENT, None)
    forlop.vederlagssvar("delvis", godkjent=50000.0)
    revisjon, _ = forlop.vederlagssvar_hendelse("delvis", godkjent=20000.0)
    if not forlop.valider(revisjon).is_valid:
        pytest.fail("Kontrollsak: revisjonen avvises også før aksepten")

    forlop.aksept(SporType.VEDERLAG)
    revisjon, _ = forlop.vederlagssvar_hendelse("delvis", godkjent=20000.0)
    assert not forlop.valider(revisjon).is_valid


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "SK-04: frafall gir grunnlaget TRUKKET; når TE godtar avslagene på vederlag "
        "og frist, blir samlet status UKJENT"
    ),
)
def test_frafall_med_godtatte_avslag_gir_ikke_ukjent():
    """AGENTS.md: en status som mangler i rollupen, gir «UKJENT» på en sak som
    er oppgjort. Aksept av avslag gir AVSLATT_AKSEPTERT (hovedplanen 3.1,
    TFR-01). Vedtak 05.10 (3.1): frafall er avklart grunnlag, så saken er
    oppgjort og lukket."""
    forlop = _sak_med_svar("IRREG", GrunnlagResponsResultat.FRAFALT, True)
    forlop.vederlagssvar("avslatt")
    forlop.fristsvar(vilkar_oppfylt=False)
    forlop.aksept(SporType.VEDERLAG)
    forlop.aksept(SporType.FRIST)
    sak = forlop.state
    if (sak.vederlag.status, sak.frist.status) != (
        SporStatus.AVSLATT_AKSEPTERT,
        SporStatus.AVSLATT_AKSEPTERT,
    ):
        pytest.fail("Forutsetning: avslagene er ikke godtatt")
    assert sak.overordnet_status in LUKKEDE_STATUSER


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "#234: grunnlagsårsaken i subsidiaer_triggers lagres for frist ved avslag, "
        "men ikke ved § 32.2, og aldri for vederlag"
    ),
)
def test_grunnlagsaarsaken_behandles_likt_i_vederlag_og_frist():
    """Vedtak 05.10 under B-13 (hovedplanen 3.1): at hele svaret er subsidiært,
    utledes av grunnlaget. Merknaden samme dag til `grunnlag_varslet_i_tide`:
    fullmakt, brev, projeksjonen og skjemaet bruker samme regel. Testen tar ikke
    stilling til om årsaken skal lagres, bare til at de to sporene og de to
    årsakene behandles likt."""
    lagret = {}
    for navn, underkategori, resultat, varslet_i_tide in (
        ("avslag", "EO", GrunnlagResponsResultat.AVSLATT, None),
        ("preklusjon_32_2", "IRREG", GrunnlagResponsResultat.GODKJENT, False),
    ):
        forlop = _sak_med_svar(underkategori, resultat, varslet_i_tide)
        vederlag = forlop.vederlagssvar("godkjent")
        frist = forlop.fristsvar()
        if not (vederlag.hele_vederlaget_subsidiaert and frist.hele_fristen_subsidiaer):
            pytest.fail(f"Forutsetning ({navn}): hele svaret regnes ikke som subsidiært")
        lagret[(navn, "vederlag")] = bool(set(vederlag.subsidiaer_triggers) & GRUNNLAGSTRIGGERE)
        lagret[(navn, "frist")] = bool(set(frist.subsidiaer_triggers) & GRUNNLAGSTRIGGERE)
    assert len(set(lagret.values())) == 1, lagret


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="#235: frafall godtas sammen med at grunnlaget er varslet for sent (§ 32.2)",
)
def test_frafall_kan_ikke_kombineres_med_preklusjon_etter_32_2():
    """Vedtak 05.10 (oppdragsgiver, hovedplanen 3.1), etter § 32.3 bokstav c:
    frafall skjer mot endringsordre for utført arbeid, og kan ikke kombineres
    med at TE har tapt retten etter § 32.2. Kontrollsaken er frafall der
    grunnlaget er varslet i tide, som skal godtas."""
    forlop = Forlop()
    forlop.grunnlag("IRREG")
    forlop.legg_til(forlop.vederlagskrav(100000.0))
    kontroll = forlop.grunnlagssvar_hendelse(GrunnlagResponsResultat.FRAFALT, True)
    if not forlop.valider(kontroll).is_valid:
        pytest.fail("Kontrollsak: frafall avvises også når grunnlaget er varslet i tide")
    svar = forlop.grunnlagssvar_hendelse(GrunnlagResponsResultat.FRAFALT, False)
    assert not forlop.valider(svar).is_valid


def _fristvarsel(event_type, varsel_type, dato, dager=None):
    data = {
        "varsel_type": varsel_type,
        "begrunnelse": "Hindret",
        "frist_varsel": VarselInfo(dato_sendt=dato, metode=["epost"]),
    }
    if dager is not None:
        data["antall_dager"] = dager
        data["spesifisert_varsel"] = VarselInfo(dato_sendt="2026-09-20", metode=["epost"])
    return FristEvent(
        sak_id=SAK,
        aktor_id="te",
        aktor_rolle="TE",
        event_type=event_type,
        data=FristData(**data),
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="SK-12: et senere fristkrav kan flytte datoen for varselet etter § 33.4",
)
def test_varseldatoen_kan_ikke_flyttes_av_et_senere_krav():
    """Vedtak 05.10 (oppdragsgiver, hovedplanen 3.1): datoen og metoden for et
    varsel settes én gang, og et senere krav med en annen dato avvises.
    Kontrollsaken er samme spesifisering med uendret varseldato, som skal
    godtas."""
    forlop = Forlop()
    forlop.grunnlag("EO")
    forlop.legg_til(
        _fristvarsel(EventType.FRIST_KRAV_SENDT, FristVarselType.VARSEL, "2026-09-02")
    )
    kontroll = _fristvarsel(
        EventType.FRIST_KRAV_SPESIFISERT, FristVarselType.SPESIFISERT, "2026-09-02", 20
    )
    if not forlop.valider(kontroll).is_valid:
        pytest.fail("Kontrollsak: spesifiseringen avvises også med uendret varseldato")
    flyttet = _fristvarsel(
        EventType.FRIST_KRAV_SPESIFISERT, FristVarselType.SPESIFISERT, "2026-08-01", 20
    )
    assert not forlop.valider(flyttet).is_valid
