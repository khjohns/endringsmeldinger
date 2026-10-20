/**
 * Reproduksjoner fra strukturkartleggingen av spor D (2026-10-05), se
 * docs/kartlegging-struktur-spor-d-2026-10-05.md. Hver test er `it.fails` med
 * issuenummer; forutsetningene kontrolleres utenfor testen som feiler.
 */
import { describe, expect, it } from 'vitest';
import { svaretErSubsidiaert } from '../derive';
import { scenario2_BlandetTilstand } from '$lib/mocks/caseState';

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
