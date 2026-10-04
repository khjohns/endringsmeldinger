"""Regelmodulen for byggherrens svar på vederlagskrav (BR-01, B-13, #63).

Oversatt fra `src/lib/domain/__tests__/vederlagDomain.test.ts`, som er
spesifikasjonen (B-13, hovedplanen 3.1). Hver test viser til testen i TS-fila
med `describe › it` og til bestemmelsen i NS 8407 der den finnes.

To forventninger skiller seg fra TS-fila, og begge viser til vedtaket:

- 99 %-terskelen utgår: «godkjent» bare når hele kravet er godkjent, til
  nærmeste krone (B-13, 3.1, 24.09).
- Subsidiært resultat med 0 kr godkjent er «avslått», som det prinsipale
  (oppdragsgiver 04.10, ført i #63). TS-fila har ingen test for tilfellet.

Ikke oversatt, fordi de er veiledning (gruppe 1 i kartleggingen) eller bygger
nyttelasten og ikke resultatet: `getDefaults`, `harPreklusjonsSteg`,
`maSvarePaJustering`, og i `buildEventData` hendelsestype, referanser,
`begrunnelse`, `auto_begrunnelse` og `dato_endret`.
"""

from decimal import Decimal

import pytest

from models.events import (
    BelopVurdering,
    GrunnlagResponsResultat,
    SubsidiaerTrigger,
    VederlagBeregningResultat,
    VederlagsMetode,
)
from regler import UgyldigVurdering
from regler.vederlag import (
    Preklusjon,
    Vederlagskrav,
    Vederlagsvurdering,
    beregn_godkjent_belop,
    beregn_preklusjon,
    beregn_totaler,
    beregn_vederlag,
    er_hele_vederlaget_subsidiaert,
    er_kravlinje_gyldig,
    har_34_1_2_preklusjon,
    kan_holde_tilbake,
    prinsipalt_resultat,
    subsidiaer_triggers,
    subsidiaert_resultat,
)

G = BelopVurdering.GODKJENT
D = BelopVurdering.DELVIS
A = BelopVurdering.AVSLATT
GODKJENT = VederlagBeregningResultat.GODKJENT
DELVIS = VederlagBeregningResultat.DELVIS_GODKJENT
AVSLATT = VederlagBeregningResultat.AVSLATT
HOLD_TILBAKE = VederlagBeregningResultat.HOLD_TILBAKE

INGEN_PREKLUSJON = Preklusjon(hovedkrav=False, rigg=False, produktivitet=False)


def vurdering(**endringer) -> Vederlagsvurdering:
    """Som `makeState` i TS-fila: alt varslet i tide, metoden akseptert, hovedkravet godkjent."""
    felt = {
        "hovedkrav_varslet_i_tide": True,
        "rigg_varslet_i_tide": True,
        "produktivitet_varslet_i_tide": True,
        "aksepterer_metode": True,
        "hold_tilbake": False,
        "hovedkrav_vurdering": G,
    }
    felt.update(endringer)
    return Vederlagsvurdering(**felt)


def krav(**endringer) -> Vederlagskrav:
    """Som `makeConfig` i TS-fila: enhetspriser, 100 000 kr, ingen særskilte krav."""
    felt = {
        "metode": VederlagsMetode.ENHETSPRISER,
        "hovedkrav_belop": 100000,
        "krever_justert_ep": False,
        "grunnlag_varslet_i_tide": True,
    }
    felt.update(endringer)
    return Vederlagskrav(**felt)


def kr(verdi) -> Decimal:
    return Decimal(str(verdi)).quantize(Decimal("0.01"))


# ---------------------------------------------------------------------------
# Preklusjon, § 34.1.2 og § 34.1.3
# ---------------------------------------------------------------------------


class TestHar3412Preklusjon:
    """vederlagDomain.test.ts › har34_1_2Preklusjon. NS 8407 § 34.1.1 og § 34.1.2:
    preklusjonsregelen gjelder svikt og andre forhold, ikke endringer."""

    @pytest.mark.parametrize(
        ("hovedkategori", "forventet"),
        [
            ("SVIKT", True),  # 'returns true for SVIKT'
            ("ANDRE", True),  # 'returns true for ANDRE'
            ("ENDRING", False),  # 'returns false for ENDRING'
            ("FORCE_MAJEURE", False),  # 'returns false for FORCE_MAJEURE'
            (None, False),  # 'returns false when undefined'
        ],
    )
    def test_kategori(self, hovedkategori, forventet):
        assert har_34_1_2_preklusjon(hovedkategori) is forventet


class TestHeleVederlagetSubsidiaert:
    """vederlagDomain.test.ts › erHelVederlagSubsidiaerPgaGrunnlag og › erSubsidiaer.
    NS 8407 § 32.2: grunnlaget varslet for sent ved endring."""

    def test_endring_varslet_for_sent(self):
        # erHelVederlagSubsidiaerPgaGrunnlag › 'returns true for ENDRING with grunnlagVarsletForSent'
        k = krav(hovedkategori="ENDRING", grunnlag_varslet_i_tide=False)
        assert er_hele_vederlaget_subsidiaert(k) is True

    def test_endring_varslet_i_tide(self):
        # erHelVederlagSubsidiaerPgaGrunnlag › 'returns false for ENDRING without grunnlagVarsletForSent'
        k = krav(hovedkategori="ENDRING", grunnlag_varslet_i_tide=True)
        assert er_hele_vederlaget_subsidiaert(k) is False

    def test_svikt_selv_om_varslet_for_sent(self):
        # erHelVederlagSubsidiaerPgaGrunnlag › 'returns false for SVIKT even with grunnlagVarsletForSent'
        k = krav(hovedkategori="SVIKT", grunnlag_varslet_i_tide=False)
        assert er_hele_vederlaget_subsidiaert(k) is False

    def test_grunnlag_avslatt(self):
        # erSubsidiaer › 'returns true when grunnlag is avslått'
        k = krav(
            hovedkategori="ENDRING",
            grunnlag_resultat=GrunnlagResponsResultat.AVSLATT,
        )
        assert er_hele_vederlaget_subsidiaert(k) is True

    def test_grunnlag_godkjent_men_varslet_for_sent(self):
        # erSubsidiaer › 'returns true when grunnlag varslet for sent (§32.2)'
        k = krav(
            hovedkategori="ENDRING",
            grunnlag_resultat=GrunnlagResponsResultat.GODKJENT,
            grunnlag_varslet_i_tide=False,
        )
        assert er_hele_vederlaget_subsidiaert(k) is True

    def test_grunnlag_godkjent_utenfor_32_2(self):
        # erSubsidiaer › 'returns false when grunnlag is godkjent and not §32.2'
        k = krav(
            hovedkategori="ENDRING",
            grunnlag_resultat=GrunnlagResponsResultat.GODKJENT,
        )
        assert er_hele_vederlaget_subsidiaert(k) is False

    def test_formell_endringsordre_er_utenfor_32_2(self):
        # Ingen TS-test. Vedtaket om `grunnlag_varslet_i_tide` (B-13, 3.1, 24.09)
        # snevrer omfanget inn til § 32.2: endring som ikke er formell endringsordre.
        k = krav(
            hovedkategori="ENDRING", underkategori="EO", grunnlag_varslet_i_tide=False
        )
        assert er_hele_vederlaget_subsidiaert(k) is False


class TestBeregnPreklusjon:
    """vederlagDomain.test.ts › beregnHovedkravPrekludert, › beregnRiggPrekludert og
    › beregnProduktivitetPrekludert. NS 8407 § 34.1.2 annet ledd og § 34.1.3 tredje ledd."""

    def test_hovedkrav_svikt_varslet_for_sent(self):
        # beregnHovedkravPrekludert › 'precluded when SVIKT and varslet for sent'
        p = beregn_preklusjon(
            vurdering(hovedkrav_varslet_i_tide=False), krav(hovedkategori="SVIKT")
        )
        assert p.hovedkrav is True

    def test_hovedkrav_svikt_varslet_i_tide(self):
        # beregnHovedkravPrekludert › 'not precluded when SVIKT and varslet i tide'
        p = beregn_preklusjon(
            vurdering(hovedkrav_varslet_i_tide=True), krav(hovedkategori="SVIKT")
        )
        assert p.hovedkrav is False

    def test_hovedkrav_aldri_ved_endring(self):
        # beregnHovedkravPrekludert › 'never precluded for ENDRING (§34.1.2 does not apply)'
        p = beregn_preklusjon(
            vurdering(hovedkrav_varslet_i_tide=False), krav(hovedkategori="ENDRING")
        )
        assert p.hovedkrav is False

    def test_rigg_varslet_for_sent(self):
        # beregnRiggPrekludert › 'precluded when harRiggKrav and varslet for sent'
        p = beregn_preklusjon(
            vurdering(rigg_varslet_i_tide=False), krav(rigg_belop=30000)
        )
        assert p.rigg is True

    def test_rigg_uten_krav(self):
        # beregnRiggPrekludert › 'not precluded when no rigg krav'
        p = beregn_preklusjon(vurdering(rigg_varslet_i_tide=False), krav())
        assert p.rigg is False

    def test_produktivitet_varslet_for_sent(self):
        # beregnProduktivitetPrekludert › 'precluded when harProduktivitetKrav and varslet for sent'
        p = beregn_preklusjon(
            vurdering(produktivitet_varslet_i_tide=False),
            krav(produktivitet_belop=20000),
        )
        assert p.produktivitet is True


# ---------------------------------------------------------------------------
# Tilbakeholdelse, § 30.2
# ---------------------------------------------------------------------------


class TestKanHoldeTilbake:
    """vederlagDomain.test.ts › kanHoldeTilbake. NS 8407 § 30.2 første ledd: byggherren
    kan holde tilbake betalingen for regningsarbeid inntil kostnadsoverslaget foreligger."""

    def test_regningsarbeid_uten_overslag(self):
        # 'true for REGNINGSARBEID without kostnadsoverslag'
        assert kan_holde_tilbake(krav(metode=VederlagsMetode.REGNINGSARBEID)) is True

    def test_regningsarbeid_med_overslag(self):
        # 'false for REGNINGSARBEID with kostnadsoverslag'
        k = krav(metode=VederlagsMetode.REGNINGSARBEID, kostnads_overslag=50000)
        assert kan_holde_tilbake(k) is False

    def test_enhetspriser(self):
        # 'false for ENHETSPRISER'
        assert kan_holde_tilbake(krav(metode=VederlagsMetode.ENHETSPRISER)) is False


# ---------------------------------------------------------------------------
# Beløp per post, § 34.2–34.4
# ---------------------------------------------------------------------------


class TestBeregnGodkjentBelop:
    """vederlagDomain.test.ts › beregnGodkjentBelop."""

    def test_godkjent_gir_hele_kravet(self):
        # 'returns full amount when godkjent'
        assert beregn_godkjent_belop(G, kr(100000), None) == kr(100000)

    def test_delvis_gir_oppgitt_belop(self):
        # 'returns delvis amount when delvis'
        assert beregn_godkjent_belop(D, kr(100000), kr(60000)) == kr(60000)

    def test_delvis_uten_belop_gir_0(self):
        # 'returns 0 when delvis but no amount specified'. Selve svaret avvises
        # av `beregn_vederlag`; se TestKontroll.
        assert beregn_godkjent_belop(D, kr(100000), None) == kr(0)

    def test_avslatt_gir_0(self):
        # 'returns 0 when avslatt'
        assert beregn_godkjent_belop(A, kr(100000), None) == kr(0)

    def test_prekludert_gir_0(self):
        # 'returns 0 when prekludert regardless of vurdering'
        assert beregn_godkjent_belop(G, kr(100000), None, prekludert=True) == kr(0)


class TestErKravlinjeGyldig:
    """vederlagDomain.test.ts › erKravlinjeGyldig."""

    @pytest.mark.parametrize(
        ("vurdering_", "belop", "forventet"),
        [
            (None, None, False),  # 'returns false when vurdering is undefined'
            (G, None, True),  # 'returns true when godkjent'
            (A, None, True),  # 'returns true when avslatt'
            (D, None, False),  # 'returns false when delvis without beløp'
            (D, 50000, True),  # 'returns true when delvis with beløp'
            (D, 0, True),  # 'returns true when delvis with zero beløp'
        ],
    )
    def test_linje(self, vurdering_, belop, forventet):
        assert er_kravlinje_gyldig(vurdering_, belop) is forventet


class TestBeregnTotaler:
    """vederlagDomain.test.ts › beregnTotaler. NS 8407 § 34.1.2 og § 34.1.3: en
    prekludert post teller ikke prinsipalt, men vurderes subsidiært."""

    def test_bare_hovedkrav(self):
        # 'calculates totals for hovedkrav only'
        t = beregn_totaler(vurdering(), krav(), INGEN_PREKLUSJON)
        assert t.total_krevd == kr(100000)
        assert t.total_krevd_inkl_prekludert == kr(100000)
        assert t.total_godkjent == kr(100000)
        assert t.total_godkjent_inkl_prekludert == kr(100000)
        assert t.har_prekludert_krav is False

    def test_rigg_og_produktivitet(self):
        # 'includes rigg and produktivitet in totals'
        v = vurdering(
            rigg_vurdering=G,
            produktivitet_vurdering=D,
            produktivitet_godkjent_belop=15000,
        )
        k = krav(rigg_belop=30000, produktivitet_belop=20000)
        t = beregn_totaler(v, k, INGEN_PREKLUSJON)
        assert t.total_krevd == kr(150000)
        assert t.total_godkjent == kr(145000)

    def test_prekludert_post_utelates_prinsipalt(self):
        # 'excludes precluded krav from principal totals'
        v = vurdering(rigg_vurdering=G)
        k = krav(rigg_belop=30000)
        p = Preklusjon(hovedkrav=False, rigg=True, produktivitet=False)
        t = beregn_totaler(v, k, p)
        assert t.total_krevd == kr(100000)
        assert t.total_godkjent == kr(100000)
        assert t.total_krevd_inkl_prekludert == kr(130000)
        assert t.total_godkjent_inkl_prekludert == kr(130000)
        assert t.har_prekludert_krav is True

    def test_delvis_prekludert_post_subsidiaert(self):
        # 'handles delvis godkjent for precluded krav in subsidiary'
        v = vurdering(rigg_vurdering=D, rigg_godkjent_belop=10000)
        k = krav(rigg_belop=30000)
        p = Preklusjon(hovedkrav=False, rigg=True, produktivitet=False)
        t = beregn_totaler(v, k, p)
        assert t.total_godkjent == kr(100000)
        assert t.total_godkjent_inkl_prekludert == kr(110000)

    def test_metodeendring(self):
        # 'tracks harMetodeendring'
        t = beregn_totaler(vurdering(aksepterer_metode=False), krav(), INGEN_PREKLUSJON)
        assert t.har_metodeendring is True


# ---------------------------------------------------------------------------
# Prinsipalt og subsidiært resultat
# ---------------------------------------------------------------------------


class TestPrinsipaltResultat:
    """vederlagDomain.test.ts › beregnPrinsipaltResultat. NS 8407 § 30.2 og § 34.2.2."""

    def resultat(self, godkjent, krevd=100000, metodeendring=False, hold_tilbake=False):
        return prinsipalt_resultat(
            total_krevd_inkl_prekludert=kr(krevd),
            total_godkjent=kr(godkjent),
            har_metodeendring=metodeendring,
            hold_tilbake=hold_tilbake,
        )

    def test_hold_tilbake_har_forrang(self):
        # 'returns hold_tilbake when holdTilbake is true'. NS 8407 § 30.2 første ledd.
        assert self.resultat(100000, hold_tilbake=True) == HOLD_TILBAKE

    def test_alt_godkjent(self):
        # 'returns godkjent when fully approved'
        assert self.resultat(100000) == GODKJENT

    def test_delvis(self):
        # 'returns delvis_godkjent when partially approved'
        assert self.resultat(50000) == DELVIS

    def test_metodeendring_gir_delvis(self):
        # 'returns delvis_godkjent when method changed even if fully approved'
        assert self.resultat(100000, metodeendring=True) == DELVIS

    def test_ingenting_godkjent(self):
        # 'returns avslatt when nothing approved'
        assert self.resultat(0) == AVSLATT

    def test_99_prosent_er_ikke_godkjent(self):
        # 'handles 99% threshold for godkjent' forventer «godkjent». Vedtaket
        # snur forventningen: «godkjent» bare når hele kravet er godkjent, og
        # 99 %-terskelen utgår (B-13, hovedplanen 3.1, 24.09).
        assert self.resultat(99000) == DELVIS

    def test_til_naermeste_krone(self):
        # Vedtaket (B-13, 3.1, 24.09): «til nærmeste krone». Ingen TS-test.
        assert self.resultat("99999.50") == GODKJENT
        assert self.resultat("99999.49") == DELVIS


class TestSubsidiaertResultat:
    """vederlagDomain.test.ts › beregnSubsidiaertResultat. NS 8407 § 34.1.2 og § 34.1.3."""

    def resultat(self, godkjent, krevd=130000, metodeendring=False):
        return subsidiaert_resultat(
            total_krevd_inkl_prekludert=kr(krevd),
            total_godkjent_inkl_prekludert=kr(godkjent),
            har_metodeendring=metodeendring,
        )

    def test_alt_godkjent(self):
        # 'returns godkjent when fully approved ignoring preclusion'
        assert self.resultat(130000) == GODKJENT

    def test_alt_avslatt(self):
        # 'returns avslatt when all rejected'
        assert self.resultat(0) == AVSLATT

    def test_delvis(self):
        # 'returns delvis_godkjent when partially approved'
        assert self.resultat(80000) == DELVIS

    def test_metodeendring(self):
        # 'returns delvis_godkjent when method changed'
        assert self.resultat(100000, krevd=100000, metodeendring=True) == DELVIS

    def test_0_kr_er_avslatt_uansett_vurdering_av_hovedkravet(self):
        # Ingen TS-test. Frontenden gir «delvis godkjent» når hovedkravet er
        # vurdert «delvis» med 0 kr. Oppdragsgiver 04.10 (#63): 0 kr gir «avslått»,
        # som prinsipalt.
        v = vurdering(
            hovedkrav_vurdering=D,
            hovedkrav_godkjent_belop=0,
            rigg_varslet_i_tide=False,
            rigg_vurdering=A,
        )
        r = beregn_vederlag(krav(rigg_belop=30000), v)
        assert r.subsidiaer_resultat == AVSLATT
        assert r.subsidiaer_godkjent_belop == kr(0)


# ---------------------------------------------------------------------------
# Subsidiære grunner
# ---------------------------------------------------------------------------


class TestSubsidiaerTriggers:
    """vederlagDomain.test.ts › beregnSubsidiaerTriggers. NS 8407 § 34.1.2, § 34.1.3
    og § 34.3.3 første ledd."""

    def test_ingen(self):
        # 'returns empty array when no triggers'
        assert subsidiaer_triggers(vurdering(), krav(), INGEN_PREKLUSJON) == ()

    def test_hovedkrav_prekludert(self):
        # 'includes preklusjon_hovedkrav when hovedkrav precluded'
        p = Preklusjon(hovedkrav=True, rigg=False, produktivitet=False)
        assert SubsidiaerTrigger.PREKLUSJON_HOVEDKRAV in subsidiaer_triggers(
            vurdering(), krav(), p
        )

    def test_rigg_og_produktivitet_prekludert(self):
        # 'includes preklusjon_rigg and preklusjon_produktivitet'
        p = Preklusjon(hovedkrav=False, rigg=True, produktivitet=True)
        t = subsidiaer_triggers(vurdering(), krav(), p)
        assert SubsidiaerTrigger.PREKLUSJON_RIGG in t
        assert SubsidiaerTrigger.PREKLUSJON_PRODUKTIVITET in t

    def test_ep_justering_varslet_for_sent(self):
        # 'includes reduksjon_ep_justering when EP varslet for sent'. § 34.3.3 første ledd.
        t = subsidiaer_triggers(
            vurdering(varsel_justert_ep_ok=False),
            krav(krever_justert_ep=True),
            INGEN_PREKLUSJON,
        )
        assert SubsidiaerTrigger.REDUKSJON_EP_JUSTERING in t

    def test_metode_avslatt(self):
        # 'includes metode_avslatt when method rejected'
        t = subsidiaer_triggers(
            vurdering(aksepterer_metode=False), krav(), INGEN_PREKLUSJON
        )
        assert SubsidiaerTrigger.METODE_AVSLATT in t

    def test_flere_samtidig(self):
        # 'collects multiple triggers simultaneously'
        t = subsidiaer_triggers(
            vurdering(aksepterer_metode=False, varsel_justert_ep_ok=False),
            krav(krever_justert_ep=True),
            Preklusjon(hovedkrav=True, rigg=True, produktivitet=False),
        )
        assert set(t) == {
            SubsidiaerTrigger.PREKLUSJON_HOVEDKRAV,
            SubsidiaerTrigger.PREKLUSJON_RIGG,
            SubsidiaerTrigger.REDUKSJON_EP_JUSTERING,
            SubsidiaerTrigger.METODE_AVSLATT,
        }
        assert len(t) == 4


# ---------------------------------------------------------------------------
# Hele svaret: beregn_vederlag
# ---------------------------------------------------------------------------


class TestBeregnVederlag:
    """vederlagDomain.test.ts › beregnAlt og verdiene `buildEventData` sender."""

    def test_enkelt_godkjent(self):
        # beregnAlt › 'computes all values for simple godkjent case'
        # buildEventData › 'builds new response event' (resultat og beløp)
        r = beregn_vederlag(krav(), vurdering())
        assert r.beregnings_resultat == GODKJENT
        assert r.total_godkjent_belop == kr(100000)
        assert r.total_krevd_belop == kr(100000)
        assert r.preklusjon.har_prekludert_krav is False
        assert r.subsidiaer_resultat is None
        assert r.subsidiaer_godkjent_belop is None
        assert r.subsidiaer_triggers == ()

    def test_svikt_med_prekludert_rigg(self):
        # beregnAlt › 'computes subsidiary for SVIKT with precluded rigg'
        # buildEventData › 'includes subsidiary data when visSubsidiaertResultat is true'
        v = vurdering(rigg_varslet_i_tide=False, rigg_vurdering=G)
        k = krav(hovedkategori="SVIKT", rigg_belop=30000)
        r = beregn_vederlag(k, v)
        assert r.preklusjon.rigg is True
        assert r.total_godkjent_belop == kr(100000)
        assert r.beregnings_resultat == DELVIS
        assert r.subsidiaer_godkjent_belop == kr(130000)
        assert r.subsidiaer_resultat == GODKJENT
        assert SubsidiaerTrigger.PREKLUSJON_RIGG in r.subsidiaer_triggers

    def test_hold_tilbake(self):
        # beregnAlt › 'computes hold_tilbake for REGNINGSARBEID without overslag'
        r = beregn_vederlag(
            krav(metode=VederlagsMetode.REGNINGSARBEID), vurdering(hold_tilbake=True)
        )
        assert r.beregnings_resultat == HOLD_TILBAKE

    def test_flere_preklusjoner_og_metodeendring(self):
        # beregnAlt › 'handles full scenario with multiple preklusjoner and metodeendring'
        v = vurdering(
            hovedkrav_vurdering=D,
            hovedkrav_godkjent_belop=60000,
            rigg_varslet_i_tide=False,
            rigg_vurdering=G,
            produktivitet_varslet_i_tide=False,
            produktivitet_vurdering=D,
            produktivitet_godkjent_belop=10000,
            aksepterer_metode=False,
            oensket_metode=VederlagsMetode.REGNINGSARBEID,
        )
        k = krav(hovedkategori="ENDRING", rigg_belop=30000, produktivitet_belop=20000)
        r = beregn_vederlag(k, v)
        assert r.preklusjon.hovedkrav is False
        assert r.preklusjon.rigg is True
        assert r.preklusjon.produktivitet is True
        assert r.total_godkjent_belop == kr(60000)
        assert r.beregnings_resultat == DELVIS
        assert r.subsidiaer_godkjent_belop == kr(100000)
        assert set(r.subsidiaer_triggers) == {
            SubsidiaerTrigger.PREKLUSJON_RIGG,
            SubsidiaerTrigger.PREKLUSJON_PRODUKTIVITET,
            SubsidiaerTrigger.METODE_AVSLATT,
        }

    def test_godkjent_belop_per_post(self):
        # buildEventData › 'calculates correct godkjent beløp per krav'
        v = vurdering(
            hovedkrav_vurdering=D,
            hovedkrav_godkjent_belop=60000,
            rigg_vurdering=G,
            produktivitet_vurdering=A,
        )
        k = krav(rigg_belop=30000, produktivitet_belop=20000)
        r = beregn_vederlag(k, v)
        assert r.hovedkrav_godkjent_belop == kr(60000)
        assert r.rigg_godkjent_belop == kr(30000)
        assert r.produktivitet_godkjent_belop == kr(0)

    def test_hovedkrav_varslet_i_tide_leses_bare_ved_34_1_2(self):
        # buildEventData › 'includes §34.1.2 fields only when applicable'.
        # Ved endring leses ikke feltet, og det kan mangle.
        r = beregn_vederlag(
            krav(hovedkategori="ENDRING"), vurdering(hovedkrav_varslet_i_tide=None)
        )
        assert r.beregnings_resultat == GODKJENT
        with pytest.raises(UgyldigVurdering, match="hovedkrav_varslet_i_tide"):
            beregn_vederlag(
                krav(hovedkategori="SVIKT"), vurdering(hovedkrav_varslet_i_tide=None)
            )

    def test_belop_avrundes_til_ore(self):
        # Designnotatet for B-13, avsnitt 4: beløp sammenliknes til hele øre, og
        # serveren regner med Decimal. Ingen TS-test.
        v = vurdering(hovedkrav_vurdering=D, hovedkrav_godkjent_belop=0.1 + 0.2)
        r = beregn_vederlag(krav(), v)
        assert r.hovedkrav_godkjent_belop == Decimal("0.30")
        assert r.total_godkjent_belop == Decimal("0.30")


class TestScenarier:
    """vederlagDomain.test.ts › 'BH Svar-Vederlag UI Scenarios'."""

    @staticmethod
    def grunnkrav(**endringer):
        felt = {
            "metode": VederlagsMetode.REGNINGSARBEID,
            "hovedkrav_belop": 1_000_000,
            "rigg_belop": 200_000,
            "produktivitet_belop": 150_000,
            "krever_justert_ep": False,
            "kostnads_overslag": 1_200_000,
            "hovedkategori": "ENDRING",
            "grunnlag_varslet_i_tide": True,
            "grunnlag_resultat": GrunnlagResponsResultat.GODKJENT,
        }
        felt.update(endringer)
        return Vederlagskrav(**felt)

    @staticmethod
    def alt_godkjent(**endringer):
        return vurdering(rigg_vurdering=G, produktivitet_vurdering=G, **endringer)

    def test_alt_godkjent(self):
        # 'godkjent alle — prinsipalt godkjent, ingen subsidiært'
        # og 'buildEventData produces correct event for new response'
        r = beregn_vederlag(self.grunnkrav(), self.alt_godkjent())
        assert r.beregnings_resultat == GODKJENT
        assert r.subsidiaer_resultat is None
        assert r.total_godkjent_belop == kr(1_350_000)
        assert r.total_krevd_belop == kr(1_350_000)

    def test_delvis_hovedkrav(self):
        # 'delvis godkjent hovedkrav — prinsipalt delvis'
        v = self.alt_godkjent(hovedkrav_vurdering=D, hovedkrav_godkjent_belop=600_000)
        r = beregn_vederlag(self.grunnkrav(), v)
        assert r.beregnings_resultat == DELVIS
        assert r.total_godkjent_belop == kr(950_000)

    def test_prekludert_rigg(self):
        # 'prekludert rigg — vises subsidiært'
        r = beregn_vederlag(self.grunnkrav(), self.alt_godkjent(rigg_varslet_i_tide=False))
        assert r.preklusjon.rigg is True
        assert r.subsidiaer_resultat is not None
        assert SubsidiaerTrigger.PREKLUSJON_RIGG in r.subsidiaer_triggers
        assert r.total_godkjent_belop == kr(1_150_000)
        assert r.subsidiaer_godkjent_belop == kr(1_350_000)

    def test_metode_avslatt(self):
        # 'metode avslått — trigger i subsidiært'
        v = self.alt_godkjent(
            aksepterer_metode=False, oensket_metode=VederlagsMetode.ENHETSPRISER
        )
        r = beregn_vederlag(self.grunnkrav(), v)
        assert SubsidiaerTrigger.METODE_AVSLATT in r.subsidiaer_triggers
        assert r.beregnings_resultat == DELVIS

    def test_grunnlag_avslatt(self):
        # 'grunnlag avslått → hele vederlag subsidiært'. Resultatet regnes
        # likevel av beløpene, som i skjemaet (oppdragsgiver 04.10, #63).
        k = self.grunnkrav(grunnlag_resultat=GrunnlagResponsResultat.AVSLATT)
        r = beregn_vederlag(k, self.alt_godkjent())
        assert r.hele_vederlaget_subsidiaert is True
        assert r.beregnings_resultat == GODKJENT

    def test_svikt_har_34_1_2(self):
        # 'SVIKT kategori → har §34.1.2 preklusjon for hovedkrav'
        assert har_34_1_2_preklusjon(self.grunnkrav(hovedkategori="SVIKT").hovedkategori)

    def test_svikt_hovedkrav_prekludert(self):
        # 'SVIKT + hovedkrav prekludert → prinsipalt delvis, subsidiært godkjent'
        k = self.grunnkrav(hovedkategori="SVIKT")
        r = beregn_vederlag(k, self.alt_godkjent(hovedkrav_varslet_i_tide=False))
        assert r.preklusjon.hovedkrav is True
        assert SubsidiaerTrigger.PREKLUSJON_HOVEDKRAV in r.subsidiaer_triggers
        assert r.beregnings_resultat == DELVIS
        assert r.subsidiaer_resultat == GODKJENT


# ---------------------------------------------------------------------------
# Kontroll av svaret
# ---------------------------------------------------------------------------


class TestKontroll:
    """Ingen TS-test. Vedtaket om B-13 (3.1, 24.09): en oppdatering må ha med hele
    svaret, og serveren regner av vurderingene. Et svar reglene ikke kan regne ut,
    avvises framfor å regnes som 0 kr."""

    def test_mangler_vurdering_av_hovedkravet(self):
        with pytest.raises(UgyldigVurdering, match="hovedkrav_vurdering"):
            beregn_vederlag(krav(), vurdering(hovedkrav_vurdering=None))

    def test_delvis_uten_belop(self):
        # erKravlinjeGyldig › 'returns false when delvis without beløp'
        with pytest.raises(UgyldigVurdering, match="hovedkrav_godkjent_belop"):
            beregn_vederlag(krav(), vurdering(hovedkrav_vurdering=D))

    def test_mangler_vurdering_av_krevd_saerskilt_post(self):
        with pytest.raises(UgyldigVurdering, match="rigg_vurdering"):
            beregn_vederlag(krav(rigg_belop=30000), vurdering())

    def test_mangler_varselspoersmaal_for_saerskilt_post(self):
        # NS 8407 § 34.1.3 tredje ledd. Et manglende svar er ikke «i tide».
        with pytest.raises(UgyldigVurdering, match="produktivitet_varslet_i_tide"):
            beregn_vederlag(
                krav(produktivitet_belop=20000),
                vurdering(produktivitet_vurdering=G, produktivitet_varslet_i_tide=None),
            )

    def test_mangler_metodespoersmaal(self):
        with pytest.raises(UgyldigVurdering, match="aksepterer_metode"):
            beregn_vederlag(krav(), vurdering(aksepterer_metode=None))

    def test_mangler_ep_varselspoersmaal(self):
        # NS 8407 § 34.3.3 første ledd.
        with pytest.raises(UgyldigVurdering, match="varsel_justert_ep_ok"):
            beregn_vederlag(krav(krever_justert_ep=True), vurdering())

    def test_delvis_over_krevd_belop(self):
        with pytest.raises(UgyldigVurdering, match="hovedkrav_godkjent_belop"):
            beregn_vederlag(
                krav(), vurdering(hovedkrav_vurdering=D, hovedkrav_godkjent_belop=100001)
            )

    def test_negativt_belop(self):
        with pytest.raises(UgyldigVurdering, match="hovedkrav_godkjent_belop"):
            beregn_vederlag(
                krav(), vurdering(hovedkrav_vurdering=D, hovedkrav_godkjent_belop=-1)
            )

    def test_hold_tilbake_bare_ved_regningsarbeid_uten_overslag(self):
        # NS 8407 § 30.2 første ledd.
        with pytest.raises(UgyldigVurdering, match="hold_tilbake"):
            beregn_vederlag(krav(), vurdering(hold_tilbake=True))

    def test_alle_feil_meldes_samlet(self):
        with pytest.raises(UgyldigVurdering) as feil:
            beregn_vederlag(
                krav(rigg_belop=30000),
                vurdering(hovedkrav_vurdering=None, aksepterer_metode=None),
            )
        assert set(feil.value.felt) == {
            "hovedkrav_vurdering",
            "aksepterer_metode",
            "rigg_vurdering",
        }

    def test_ugyldig_vurdering_er_valueerror(self):
        assert issubclass(UgyldigVurdering, ValueError)
