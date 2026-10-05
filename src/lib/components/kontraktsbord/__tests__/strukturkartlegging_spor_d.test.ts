/**
 * Reproduksjoner fra strukturkartleggingen av spor D (2026-10-05), se
 * docs/kartlegging-struktur-spor-d-2026-10-05.md. Hver test er `it.fails` med
 * issuenummer; forutsetningene kontrolleres utenfor testen som feiler.
 */
import { describe, expect, it } from 'vitest';
import { svaretErSubsidiaert } from '../derive';
import { scenario2_BlandetTilstand } from '$lib/mocks/caseState';
import { caseFollowUp, type FollowUpContext } from '$lib/domain/followUp';
import { filterCases } from '$lib/components/saksoversikt/overview';
import { mockSaksoversikt } from '$lib/mocks/saksoversikt';

describe('#250: svar som var subsidiært da grunnlagssvaret falt', () => {
  // Vedtak 05.10 under B-13 (hovedplanen 3.1, #215): et svar på vederlag eller
  // frist som var gitt subsidiært, forblir subsidiært til sporet eller
  // grunnlaget besvares igjen. Serveren bærer det i `subsidiaert_til_nytt_svar`.
  function sakDerGrunnlagssvaretHarFalt() {
    const sak = structuredClone(scenario2_BlandetTilstand);
    sak.grunnlag.bh_resultat = undefined;
    sak.grunnlag.grunnlag_varslet_i_tide = undefined;
    sak.vederlag.bh_resultat = 'godkjent';
    sak.frist.bh_resultat = 'godkjent';
    sak.er_subsidiaert_vederlag = true;
    sak.er_subsidiaert_frist = true;
    Object.assign(sak.vederlag, { subsidiaert_til_nytt_svar: 'avslatt' });
    Object.assign(sak.frist, { subsidiaert_til_nytt_svar: 'avslatt' });
    return sak;
  }

  it('forutsetning: grunnlaget har ikke noe svar', () => {
    const sak = sakDerGrunnlagssvaretHarFalt();
    expect(sak.grunnlag.bh_resultat).toBeUndefined();
  });

  it.fails('viser det gamle vederlagssvaret som subsidiært, som serveren', () => {
    expect(svaretErSubsidiaert(sakDerGrunnlagssvaretHarFalt(), 'vederlag')).toBe(true);
  });

  it.fails('viser det gamle fristsvaret som subsidiært, som serveren', () => {
    expect(svaretErSubsidiaert(sakDerGrunnlagssvaretHarFalt(), 'frist')).toBe(true);
  });
});

describe('#229: LUKKET_AVSLATT er lukket', () => {
  // Vedtak 05.10 om #213 (hovedplanen 3.1): `LUKKET_AVSLATT` regnes som lukket
  // for nye hendelser og i Catenda.
  function sak(overordnet_status: string) {
    const track = { status: 'avslatt', antall_versjoner: 1, bh_resultat: 'avslatt' };
    const oppfolging: FollowUpContext = {
      sakstype: 'standard',
      overordnet_status,
      grunnlag: { ...track, status: 'avslatt_akseptert', te_akseptert: true },
      vederlag: { ...track, metode: 'ENHETSPRISER', bh_respondert_versjon: 0 },
      frist: { ...track, varsel_type: 'spesifisert', krevd_dager: 10, bh_respondert_versjon: 0 },
    };
    return { ...mockSaksoversikt[0], cached_status: overordnet_status, oppfolging };
  }

  it('forutsetning: samme sak som OMFORENT gir ingen oppgaver og står som lukket', () => {
    expect(caseFollowUp(sak('OMFORENT'))).toEqual([]);
    expect(filterCases([sak('OMFORENT')], '', 'closed')).toHaveLength(1);
  });

  it.fails('gir ingen oppfølgingsoppgaver i en sak backend har lukket', () => {
    expect(caseFollowUp(sak('LUKKET_AVSLATT'))).toEqual([]);
  });

  it.fails('står under «Avklarte og lukkede» i oversikten', () => {
    expect(filterCases([sak('LUKKET_AVSLATT')], '', 'closed')).toHaveLength(1);
  });
});
