/**
 * Varselet om endringsordre i byggherrens svar på grunnlaget (GR-U12, #313).
 *
 * Testene går samme vei som skjemaet: kategorien leses av saken med
 * `deriveGrunnlagDomainConfig`, med kodene saksskjemaet skriver
 * (`KRAV_STRUKTUR_NS8407`). Skriver kjernen kodene på en annen måte (#335),
 * blir testen rød.
 */
import { describe, expect, it } from 'vitest';
import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
import { deriveGrunnlagDomainConfig } from '$lib/domain/deriveConfig';
import type { SakState } from '$lib/types/timeline';
import { ENDRINGSORDREVARSEL, erEndringsordre, type Grunnlagsvurdering } from './endringsordre';

/** GR-U11: § 32.2 gjelder alle underkategorier under ENDRING unntatt EO. */
const MED_VARSLINGSPLIKT = [
  'IRREG',
  'VALGRETT',
  'SVAR_VARSEL',
  'LOV_GJENSTAND',
  'LOV_PROSESS',
  'GEBYR',
  'SAMORD',
];

function skjemaetsKategori(hovedkategori: string, underkategori: string | string[]) {
  const sak = { grunnlag: { hovedkategori, underkategori }, er_subsidiaert_vederlag: false };
  return deriveGrunnlagDomainConfig(sak as unknown as SakState).grunnlagEvent;
}

const godkjentITide: Grunnlagsvurdering = { resultat: 'godkjent', varsletITide: true };

const alle = KRAV_STRUKTUR_NS8407.flatMap((h) => h.hjemler.map((u) => [h.kode, u.kode] as const));

describe('endringsordre etter § 32.3 første ledd a (GR-U12)', () => {
  it('varselet har teksten oppdragsgiver godkjente', () => {
    // Arbeidsvalget 10.10 i #313 (GR-U10, GR-U12), ordrett.
    expect(ENDRINGSORDREVARSEL).toBe(
      'Svaret blir en endringsordre etter § 32.3 første ledd a, fordi byggherren godkjenner grunnlaget uten å påberope at varselet kom for sent (§ 32.2). Totalentreprenøren blir forpliktet til å utføre endringsarbeidet (§ 31.3 annet ledd). Du kan ikke endre godkjenningen etterpå.'
    );
  });

  it('saksskjemaet har underkategoriene GR-U11 nevner', () => {
    const endring = alle.filter(([h]) => h === 'ENDRING').map(([, u]) => u);
    expect(endring.filter((u) => u !== 'EO').sort()).toEqual([...MED_VARSLINGSPLIKT].sort());
  });

  it.each(alle)(
    'godkjent uten påberopt preklusjon i %s/%s er en endringsordre bare der § 32.2 gjelder',
    (hovedkategori, underkategori) => {
      const forventet = hovedkategori === 'ENDRING' && MED_VARSLINGSPLIKT.includes(underkategori);
      expect(erEndringsordre(skjemaetsKategori(hovedkategori, underkategori), godkjentITide)).toBe(
        forventet
      );
    }
  );

  it('flere underkategorier: den første avgjør, som i skjemaet', () => {
    expect(
      erEndringsordre(skjemaetsKategori('ENDRING', ['LOV_GJENSTAND', 'EO']), godkjentITide)
    ).toBe(true);
    expect(
      erEndringsordre(skjemaetsKategori('ENDRING', ['EO', 'LOV_GJENSTAND']), godkjentITide)
    ).toBe(false);
  });

  describe('i en underkategori der § 32.2 gjelder', () => {
    const kategori = skjemaetsKategori('ENDRING', 'LOV_GJENSTAND');

    it('påberoper byggherren preklusjon, er svaret ikke en endringsordre', () => {
      expect(erEndringsordre(kategori, { resultat: 'godkjent', varsletITide: false })).toBe(false);
    });

    // GR-U12: «… er svaret en endringsordre etter § 32.3 første ledd a, også når brevet ikke sier noe om varslingen.»
    it('et svar som ikke sier noe om varslingen, er en endringsordre', () => {
      expect(erEndringsordre(kategori, { resultat: 'godkjent' })).toBe(true);
    });

    it.each(['avslatt', 'frafalt', undefined])('resultatet %s er ikke en endringsordre', (r) => {
      expect(erEndringsordre(kategori, { resultat: r, varsletITide: true })).toBe(false);
    });
  });
});
