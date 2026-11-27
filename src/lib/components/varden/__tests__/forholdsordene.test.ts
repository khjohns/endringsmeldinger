/**
 * Byggherrens standpunkt til forholdet i tråden og under tittelen, med kontraktens ord etter
 * forholdet (#2035). Forventningen er ordene brevet har for hvert tilfelle (GR-U32, LV-U41,
 * `STANDPUNKTENE_I_FORHOLDET` i `kjerne/spor/forhold/tekst.ts`): «avslår forholdet» gjelder
 * bare et forhold uten varslingsplikt og uten risiko.
 */
import { describe, expect, it } from 'vitest';
import type { Forholdsresultat } from '#kjerne/regler/typer.ts';
import type { Forholdsordene } from '#kjerne/spor/forhold/tekst.ts';
import type { Brevinnholdet } from '#lib/components/varden/lesing.ts';
import { FORHOLDET } from '#lib/components/varden/tekster/index.ts';

const ord = (o: Partial<Forholdsordene>): Forholdsordene => ({
  endringsordre: false,
  varslingsplikt: false,
  risiko: false,
  ...o,
});

const tilfellene: [string, Forholdsresultat, Forholdsordene, string][] = [
  [
    'endringsordre etter punkt\u00a032.3 a',
    'godkjent',
    ord({ endringsordre: true, varslingsplikt: true }),
    'Byggherren er enig, og svaret er en endringsordre (punkt\u00a032.3 første ledd a).',
  ],
  [
    'enighet om endring når varselet kom for sent',
    'godkjent',
    ord({ varslingsplikt: true }),
    'Byggherren er enig i at pålegget innebærer en endring.',
  ],
  [
    'avslag ved irregulær endring',
    'avslaatt',
    ord({ varslingsplikt: true }),
    'Byggherren avslår kravet på endringsordre (punkt\u00a032.3 første ledd b).',
  ],
  ['svikt, godkjent', 'godkjent', ord({ risiko: true }), 'Byggherren har risikoen for forholdet.'],
  [
    'svikt, avslått',
    'avslaatt',
    ord({ risiko: true }),
    'Byggherren har ikke risikoen for forholdet.',
  ],
  [
    'endringsordre etter punkt\u00a031.3, godkjent',
    'godkjent',
    ord({}),
    'Byggherren er enig i at forholdet er en endringsordre (punkt\u00a031.3).',
  ],
  [
    'endringsordre etter punkt\u00a031.3, avslått',
    'avslaatt',
    ord({}),
    'Byggherren avslår forholdet.',
  ],
  [
    'frafall av pålegget',
    'paalegg_frafalt',
    ord({ varslingsplikt: true }),
    'Byggherren frafaller pålegget (punkt\u00a032.3 første ledd c).',
  ],
];

describe('ordene for standpunktet til forholdet (GR-U32, LV-U41)', () => {
  it.each(tilfellene)('%s', (_, resultat, f, setning) => {
    expect(FORHOLDET.standpunkt({ id: 's', art: 'forhold', resultat }, null, f)).toBe(setning);
  });

  it('med en innsigelse om varselet sier roten i «Tilknyttede krav» begge lagene, med ordene i tråden (#2040)', () => {
    const ordene = ord({ varslingsplikt: true });
    const linjer: Brevinnholdet['standpunkter'] = [
      {
        standpunkt: { id: 'v', art: 'rettidighet', gjelder: 'k', hjemmel: '32.2', iTide: false },
        lag: 'prinsipalt',
        brev: null,
        ordene,
      },
      {
        standpunkt: { id: 's', art: 'forhold', resultat: 'godkjent' },
        lag: 'subsidiært',
        brev: null,
        ordene,
      },
    ];
    expect(
      FORHOLDET.forholdsrot('Irregulær endring', {
        rader: linjer,
        brev: {
          id: 'b3',
          nummer: 3,
          omtale: null,
          registrert: '2026-11-15T10:00:00Z',
          art: 'svar',
        },
      })
    ).toBe(
      'Irregulær endring · Brev 3: byggherren gjør gjeldende at varselet etter punkt\u00a032.2 kom for sent. Subsidiært er byggherren enig i at pålegget innebærer en endring'
    );
  });
});
