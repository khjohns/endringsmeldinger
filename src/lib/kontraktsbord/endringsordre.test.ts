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
import { buildEventData, forsteUnderkategori } from '$lib/domain/grunnlagDomain';
import type { ReviewItem } from '$lib/approval/types';
import type { SakState } from '$lib/types/timeline';
import {
  ENDRINGSORDREVARSEL,
  brevetBlirEndringsordre,
  erEndringsordre,
  type Grunnlagsvurdering,
} from './endringsordre';

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
      'Svaret blir en endringsordre etter § 32.3 første ledd a, fordi byggherren godkjenner grunnlaget uten å påberope at varselet kom for sent (§ 32.2). Totalentreprenøren blir forpliktet til å utføre endringsarbeidet (§ 31.3 annet ledd). Byggherren kan ikke endre godkjenningen av grunnlaget etterpå.'
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

    it.each(['avslatt', undefined])('resultatet %s er ikke en endringsordre', (r) => {
      expect(erEndringsordre(kategori, { resultat: r, varsletITide: true })).toBe(false);
    });
  });

  // Frafall kan bare velges for et pålegg (§ 32.3 c, IRREG og VALGRETT).
  it.each(['IRREG', 'VALGRETT'])('frafall i %s er ikke en endringsordre etter a', (u) => {
    const kategori = skjemaetsKategori('ENDRING', u);
    expect(erEndringsordre(kategori, { resultat: 'frafalt', varsletITide: true })).toBe(false);
    expect(erEndringsordre(kategori, { resultat: 'frafalt' })).toBe(false);
    expect(erEndringsordre(kategori, godkjentITide)).toBe(true);
  });
});

describe('varselet i godkjenningsvisningen', () => {
  /**
   * Posten med formen `prepare` i `approval/context.svelte.ts` gir den: svaret er
   * nyttelasten skjemaet bygger (`buildEventData`), sendt gjennom JSON. `basis`
   * er en kopi av hvordan `prepare` bygger den, ikke et kall dit.
   */
  function grunnlagspost(varsletITide: boolean): Pick<ReviewItem, 'track' | 'basis' | 'data'> {
    const grunnlag = { hovedkategori: 'ENDRING', underkategori: ['IRREG'] };
    const config = deriveGrunnlagDomainConfig({ grunnlag } as unknown as SakState);
    const data = buildEventData(
      {
        varsletITide,
        resultat: 'godkjent',
        resultatError: false,
        begrunnelse: '',
        begrunnelseValidationError: undefined,
      },
      { ...config, grunnlagEventId: 'krav' }
    );
    return {
      track: 'grunnlag',
      data: JSON.parse(JSON.stringify(data)),
      basis: {
        claimId: 'krav',
        resultat: null,
        varsletITide: null,
        hovedkategori: grunnlag.hovedkategori ?? null,
        underkategori: forsteUnderkategori(grunnlag.underkategori) ?? null,
      },
    };
  }
  const iTide = [grunnlagspost(true)];

  it('kladden: godkjent uten påberopt preklusjon gir varsel', () => {
    expect(brevetBlirEndringsordre(iTide, undefined, false)).toBe(true);
  });

  // Får nøkkelen et annet navn i skjemaet eller her, blir verdien `undefined`, som betyr at svaret ikke sier noe om varslingen.
  it('påberopt preklusjon gir ikke varsel', () => {
    const prekludert = [grunnlagspost(false)];
    expect(brevetBlirEndringsordre(prekludert, undefined, false)).toBe(false);
  });

  it('et brev uten svar på grunnlaget gir ikke varsel', () => {
    const vederlag = [{ ...grunnlagspost(true), track: 'vederlag' as const }];
    expect(brevetBlirEndringsordre(vederlag, undefined, false)).toBe(false);
  });

  it.each([
    ['til_godkjenning', true],
    ['sendt', false],
    ['returnert', false],
    ['trukket', false],
    ['godkjent', false],
    ['publisering_feilet', false],
  ] as const)('et brev med status %s: varsel %s (MM-U9)', (status, forventet) => {
    expect(brevetBlirEndringsordre(iTide, { status }, false)).toBe(forventet);
  });

  it('et utdatert krav gir ikke varsel', () => {
    expect(brevetBlirEndringsordre(iTide, undefined, true)).toBe(false);
    expect(brevetBlirEndringsordre(iTide, { status: 'til_godkjenning' }, true)).toBe(false);
  });
});
