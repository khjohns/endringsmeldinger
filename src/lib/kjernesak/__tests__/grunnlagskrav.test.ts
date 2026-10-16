/**
 * Kommandoene skjemaet for ny sak bygger på TS-stien (#666). Kilden til
 * forventningene er VS-U26 (datofeltet etter kategorien), GR-U16 (endringsordrens
 * dato eller nummer), GR-U15 (utdypningen) og katalogens koder (#335). At kjernen
 * godtar formen, prøves med kjernens egen formkontroll.
 */

import { describe, expect, it } from 'vitest';
import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
import {
  datofelt,
  grunnlagskrav,
  kanSendesTilKjernen,
  opprettelse,
  type Grunnlagsvalg,
} from '$lib/kjernesak/grunnlagskrav';
import { formfeil } from '$kjerne/kommandoer/kommando';
import { opprettelse as vurderOpprettelse } from '$kjerne/kommandoer/opprettelse';

const valg = (endring: Partial<Grunnlagsvalg>): Grunnlagsvalg => ({
  hovedkategori: 'ENDRING',
  underkategori: 'IRREG',
  datoer: {},
  endringsordre: '',
  utdypning: 'Byggherren har pålagt en annen fundamentering.',
  ...endring,
});

describe('grunnlagskravet fra skjemaet for ny sak', () => {
  it('endring unntatt endringsordre har datoen pålegget ble mottatt (VS-U26)', () => {
    const kommando = grunnlagskrav(
      valg({ datoer: { paalegg_mottatt: '2026-10-01', klar_over_forholdet: '2026-09-01' } })
    );
    expect(kommando).toEqual({
      type: 'krav',
      spor: 'grunnlag',
      innhold: {
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        paalegg_mottatt: '2026-10-01',
      },
      utdypning: 'Byggherren har pålagt en annen fundamentering.',
    });
    expect(formfeil(kommando)).toEqual([]);
  });

  it('svikt har datoen TE ble klar over forholdet, og en dato oppgitt for endring følger ikke med (VS-U26)', () => {
    const kommando = grunnlagskrav(
      valg({
        hovedkategori: 'SVIKT',
        underkategori: 'GRUNN',
        datoer: { paalegg_mottatt: '2026-10-01', klar_over_forholdet: '2026-09-15' },
      })
    );
    expect(kommando.innhold).toEqual({
      hovedkategori: 'svikt',
      underkategori: 'grunnforhold',
      klar_over_forholdet: '2026-09-15',
    });
    expect(formfeil(kommando)).toEqual([]);
  });

  it('endringsordren har sin dato eller sitt nummer og ingen dato etter VS-U26 (GR-U16)', () => {
    const kommando = grunnlagskrav(
      valg({
        underkategori: 'EO',
        datoer: { paalegg_mottatt: '2026-10-01' },
        endringsordre: ' EO-12 ',
      })
    );
    expect(kommando.innhold).toEqual({
      hovedkategori: 'endring',
      underkategori: 'endringsordre',
      endringsordre: 'EO-12',
    });
    expect(formfeil(kommando)).toEqual([]);
  });

  it('uten dato avviser kjernen kravet i en kategori som har en (VS-U26)', () => {
    const kommando = grunnlagskrav(valg({ hovedkategori: 'ANDRE', underkategori: 'ANDRE_ANDRE' }));
    expect(formfeil(kommando)).toEqual([
      '$.innhold.klar_over_forholdet: TE må oppgi datoen TE ble klar over forholdet (VS-U26)',
    ]);
  });

  it('en tom utdypning utelates', () => {
    const kommando = grunnlagskrav(
      valg({ datoer: { paalegg_mottatt: '2026-10-01' }, utdypning: '  ' })
    );
    expect(kommando).not.toHaveProperty('utdypning');
  });

  it('hver kategori skjemaet tilbyr på TS-stien, gir et krav kjernen godtar formen på', () => {
    const tilbudt = KRAV_STRUKTUR_NS8407.flatMap((g) =>
      g.hjemler.filter((h) => kanSendesTilKjernen(h.kode)).map((h) => [g.kode, h.kode] as const)
    );
    expect(tilbudt.length).toBe(17);
    for (const [hoved, under] of tilbudt) {
      const kommando = grunnlagskrav(
        valg({
          hovedkategori: hoved,
          underkategori: under,
          datoer: { paalegg_mottatt: '2026-10-01', klar_over_forholdet: '2026-10-01' },
          endringsordre: 'EO-1',
        })
      );
      expect(formfeil(kommando), `${hoved}/${under}`).toEqual([]);
      expect(datofelt(hoved, under) === null, `${hoved}/${under}`).toBe(under === 'EO');
    }
  });

  it('force majeure tilbys ikke, fordi kravet ikke kan uttrykkes ennå (#367)', () => {
    const fm = KRAV_STRUKTUR_NS8407.find((g) => g.kode === 'FORCE_MAJEURE')!;
    expect(fm.hjemler.filter((h) => kanSendesTilKjernen(h.kode))).toEqual([]);
  });

  it('opprettelsen har sakstittelen uten mellomrom rundt, og kjernen godtar den', () => {
    const kommando = opprettelse('  Endret fundament ');
    expect(kommando).toEqual({ type: 'opprett_sak', sakstittel: 'Endret fundament' });
    expect(vurderOpprettelse(kommando, 'TE').godtatt).toBe(true);
  });
});
