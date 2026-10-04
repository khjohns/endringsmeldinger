"""Regelmodulen for byggherrens svar på ansvarsgrunnlaget (BR-01, B-13, #63).

Oversatt fra `src/lib/domain/__tests__/grunnlagDomain.test.ts`, som er
spesifikasjonen (B-13, hovedplanen 3.1). Hver test viser til testen i TS-fila
med `describe › it` og til bestemmelsen i NS 8407.

Resultatet i grunnlagssvaret er byggherrens eget valg og regnes ikke ut.
Det modulen eier, er hvilke valg som er lovlige, og om § 32.2 gjelder.
Vedtakene om `grunnlag_varslet_i_tide` og «frafalt» (B-13, 3.1, 24.09) gjør
frontendens veiledning til avvisninger her.

Ikke oversatt: `getDefaults` (veiledning), `buildTeRevisionEventData` (TEs
nyttelast), og i `buildEventData` referansene, `begrunnelse`, `dato_endret`
og `dager_siden_varsel`. Det siste feltet har ingen plass i modellen (DRF-02).
"""

from datetime import date, timedelta

import pytest

from models.events import GrunnlagResponsResultat
from regler import UgyldigVurdering
from regler.grunnlag import (
    beregn_passivitet,
    er_endring_med_32_2,
    er_paalegg,
    er_prekludert,
    gyldige_resultater,
    kontroller_grunnlagssvar,
)

GODKJENT = GrunnlagResponsResultat.GODKJENT
AVSLATT = GrunnlagResponsResultat.AVSLATT
FRAFALT = GrunnlagResponsResultat.FRAFALT
IDAG = date(2026, 10, 4)


class TestErEndringMed322:
    """grunnlagDomain.test.ts › erEndringMed32_2. NS 8407 § 32.1 og § 32.2: varslingsplikten
    gjelder pålegg som ikke er gitt som endringsordre etter § 31.3."""

    @pytest.mark.parametrize(
        ("hovedkategori", "underkategori", "forventet"),
        [
            ("ENDRING", "ANNEN", True),  # 'returns true for ENDRING with non-EO'
            ("ENDRING", "IRREG", True),  # 'returns true for ENDRING with IRREG'
            ("ENDRING", "EO", False),  # 'returns false for ENDRING with EO'
            ("FORCE_MAJEURE", None, False),  # 'returns false for FORCE_MAJEURE'
            (None, None, False),  # 'returns false for undefined event'
        ],
    )
    def test_kategori(self, hovedkategori, underkategori, forventet):
        assert er_endring_med_32_2(hovedkategori, underkategori) is forventet


class TestErPaalegg:
    """grunnlagDomain.test.ts › erPaalegg. NS 8407 § 32.3 første ledd bokstav c."""

    @pytest.mark.parametrize(
        ("underkategori", "forventet"),
        [
            ("IRREG", True),  # 'returns true for IRREG'
            ("VALGRETT", True),  # 'returns true for VALGRETT'
            ("ANNEN", False),  # 'returns false for ANNEN'
            ("EO", False),  # 'returns false for EO'
        ],
    )
    def test_underkategori(self, underkategori, forventet):
        assert er_paalegg("ENDRING", underkategori) is forventet


class TestErPrekludert:
    """grunnlagDomain.test.ts › erPrekludert. NS 8407 § 32.2 første ledd annet punktum."""

    def test_endring_varslet_for_sent(self):
        # 'returns true for ENDRING when varsletITide is false'
        assert er_prekludert("ENDRING", "ANNEN", False) is True

    def test_endring_varslet_i_tide(self):
        # 'returns false for ENDRING when varsletITide is true'
        assert er_prekludert("ENDRING", "ANNEN", True) is False

    def test_endringsordre(self):
        # 'returns false for EO even when varsletITide is false'
        assert er_prekludert("ENDRING", "EO", False) is False

    def test_force_majeure(self):
        # 'returns false for FORCE_MAJEURE'
        assert er_prekludert("FORCE_MAJEURE", None, False) is False


class TestBeregnPassivitet:
    """grunnlagDomain.test.ts › beregnPassivitet. NS 8407 § 32.3 annet ledd.

    Vedtaket (B-13, 3.1, 24.09): passivitet varsles, systemet trekker ingen
    konklusjon, og de faste 10 dagene er bare veiledning. `bor_varsles` er
    derfor ikke det samme som at pålegget «anses» som endring."""

    def test_over_10_dager(self):
        # 'returns erPassiv true when > 10 days since varsel for ENDRING'
        p = beregn_passivitet("ENDRING", "ANNEN", IDAG - timedelta(days=15), IDAG)
        assert p.bor_varsles is True
        assert p.dager_siden_varsel >= 15

    def test_inntil_10_dager(self):
        # 'returns erPassiv false when <= 10 days since varsel'
        p = beregn_passivitet("ENDRING", "ANNEN", IDAG - timedelta(days=5), IDAG)
        assert p.bor_varsles is False

    def test_grensen_er_over_10(self):
        # Ingen TS-test. Fastholder dagens regel, `dagerSidenVarsel > 10` i grunnlagDomain.ts.
        assert beregn_passivitet("ENDRING", "ANNEN", IDAG - timedelta(days=10), IDAG).bor_varsles is False
        assert beregn_passivitet("ENDRING", "ANNEN", IDAG - timedelta(days=11), IDAG).bor_varsles is True

    def test_endringsordre(self):
        # 'returns erPassiv false for EO even with old varsel'
        p = beregn_passivitet("ENDRING", "EO", IDAG - timedelta(days=30), IDAG)
        assert p.bor_varsles is False

    def test_uten_varseldato(self):
        # 'returns 0 dagerSidenVarsel when no dato_varslet'
        p = beregn_passivitet("ENDRING", "ANNEN", None, IDAG)
        assert p.dager_siden_varsel == 0
        assert p.bor_varsles is False


class TestGyldigeResultater:
    """grunnlagDomain.test.ts › getVerdictOptions (bare verdiene, ikke etiketter og ikoner).
    NS 8407 § 32.3 første ledd bokstav c."""

    def test_vanlig_endring(self):
        # 'returns godkjent and avslatt for normal ENDRING'
        assert gyldige_resultater("ENDRING", "ANNEN") == (GODKJENT, AVSLATT)

    @pytest.mark.parametrize("underkategori", ["IRREG", "VALGRETT"])
    def test_paalegg_kan_frafalles(self, underkategori):
        # 'includes frafalt for IRREG (paaleg)' og 'includes frafalt for VALGRETT (paaleg)'
        assert gyldige_resultater("ENDRING", underkategori) == (GODKJENT, AVSLATT, FRAFALT)

    def test_endringsordre(self):
        # 'does not include frafalt for EO'
        assert FRAFALT not in gyldige_resultater("ENDRING", "EO")

    def test_force_majeure(self):
        # 'does not include frafalt for FORCE_MAJEURE'
        assert FRAFALT not in gyldige_resultater("FORCE_MAJEURE", None)


class TestKontrollerGrunnlagssvar:
    """grunnlagDomain.test.ts › buildEventData, om `grunnlag_varslet_i_tide`, og
    vedtakene om `grunnlag_varslet_i_tide` og «frafalt» (B-13, 3.1, 24.09)."""

    def test_varslet_i_tide_ved_endring(self):
        # 'builds create mode event data' og 'includes grunnlag_varslet_i_tide in
        # update mode for ENDRING': feltet hører med ved § 32.2.
        kontroller_grunnlagssvar("ENDRING", "ANNEN", GODKJENT, True)
        kontroller_grunnlagssvar("ENDRING", "ANNEN", GODKJENT, False)

    def test_varslet_i_tide_avvises_ved_endringsordre(self):
        # 'omits grunnlag_varslet_i_tide for EO'. Vedtaket: avvises utenfor § 32.2.
        with pytest.raises(UgyldigVurdering, match="grunnlag_varslet_i_tide"):
            kontroller_grunnlagssvar("ENDRING", "EO", GODKJENT, False)

    def test_varslet_i_tide_avvises_utenfor_endring(self):
        with pytest.raises(UgyldigVurdering, match="grunnlag_varslet_i_tide"):
            kontroller_grunnlagssvar("SVIKT", "GRUNN", AVSLATT, True)

    def test_varslet_i_tide_kreves_ved_32_2(self):
        # Vedtaket om B-13 (3.1): en oppdatering må ha med hele svaret. Et
        # manglende svar på § 32.2 er ikke «i tide».
        with pytest.raises(UgyldigVurdering, match="grunnlag_varslet_i_tide"):
            kontroller_grunnlagssvar("ENDRING", "ANNEN", GODKJENT, None)

    def test_utenfor_32_2_uten_feltet(self):
        kontroller_grunnlagssvar("ENDRING", "EO", GODKJENT, None)
        kontroller_grunnlagssvar("SVIKT", "GRUNN", AVSLATT, None)

    def test_frafalt_ved_paalegg(self):
        kontroller_grunnlagssvar("ENDRING", "IRREG", FRAFALT, True)

    @pytest.mark.parametrize(
        ("hovedkategori", "underkategori"),
        [("ENDRING", "ANNEN"), ("ENDRING", "EO"), ("FORCE_MAJEURE", None)],
    )
    def test_frafalt_avvises_utenfor_paalegg(self, hovedkategori, underkategori):
        # Vedtaket: «frafalt» (§ 32.3 c) avvises utenfor irregulær endring og valgrett.
        varslet = True if er_endring_med_32_2(hovedkategori, underkategori) else None
        with pytest.raises(UgyldigVurdering, match="resultat"):
            kontroller_grunnlagssvar(hovedkategori, underkategori, FRAFALT, varslet)

    def test_mangler_resultat(self):
        with pytest.raises(UgyldigVurdering, match="resultat"):
            kontroller_grunnlagssvar("SVIKT", "GRUNN", None, None)
