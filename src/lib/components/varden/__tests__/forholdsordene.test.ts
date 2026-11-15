/**
 * Byggherrens standpunkt til forholdet i tråden og under tittelen, med kontraktens ord etter
 * forholdet (#2035). Forventningen er ordene brevet har for hvert tilfelle (GR-U32, LV-U41,
 * `STANDPUNKTENE_I_FORHOLDET` i `kjerne/spor/forhold/tekst.ts`): «avslår forholdet» gjelder
 * bare et forhold uten varslingsplikt og uten risiko.
 */
import { describe, expect, it } from 'vitest';
import type { Forholdsresultat } from '$kjerne/regler/typer';
import type { Standpunkt } from '$kjerne/typer';
import type { Forholdsordene } from '$lib/components/varden/lesing';
import { FORHOLDET } from '$lib/components/varden/tekster';

const ord = (o: Partial<Forholdsordene>): Forholdsordene => ({
  endringsordre: false,
  varslingsplikt: false,
  risiko: false,
  ...o,
});

const tilfellene: [string, Forholdsresultat, Forholdsordene, string, RegExp][] = [
  [
    'endringsordre etter punkt 32.3 a',
    'godkjent',
    ord({ endringsordre: true, varslingsplikt: true }),
    'Byggherren er enig, og svaret er en endringsordre (punkt 32.3 første ledd a).',
    /^Byggherren svarte .* med en endringsordre \(punkt 32\.3 første ledd a\)\.$/,
  ],
  [
    'enighet om endring når varselet kom for sent',
    'godkjent',
    ord({ varslingsplikt: true }),
    'Byggherren er enig i at pålegget innebærer en endring.',
    / og er enig i at pålegget innebærer en endring\.$/,
  ],
  [
    'avslag ved irregulær endring',
    'avslaatt',
    ord({ varslingsplikt: true }),
    'Byggherren avslår kravet på endringsordre (punkt 32.3 første ledd b).',
    / og avslår kravet på endringsordre \(punkt 32\.3 første ledd b\)\.$/,
  ],
  [
    'svikt, godkjent',
    'godkjent',
    ord({ risiko: true }),
    'Byggherren har risikoen for forholdet.',
    / og har risikoen for forholdet\.$/,
  ],
  [
    'svikt, avslått',
    'avslaatt',
    ord({ risiko: true }),
    'Byggherren har ikke risikoen for forholdet.',
    / og har ikke risikoen for forholdet\.$/,
  ],
  [
    'endringsordre etter punkt 31.3, godkjent',
    'godkjent',
    ord({}),
    'Byggherren er enig i at forholdet er en endringsordre (punkt 31.3).',
    / og er enig i at forholdet er en endringsordre \(punkt 31\.3\)\.$/,
  ],
  [
    'endringsordre etter punkt 31.3, avslått',
    'avslaatt',
    ord({}),
    'Byggherren avslår forholdet.',
    /^Byggherren svarte 3\. november 2026 og avslår forholdet\.$/,
  ],
  [
    'frafall av pålegget',
    'paalegg_frafalt',
    ord({ varslingsplikt: true }),
    'Byggherren frafaller pålegget (punkt 32.3 første ledd c).',
    / og frafaller pålegget \(punkt 32\.3 første ledd c\)\.$/,
  ],
];

describe('ordene for standpunktet til forholdet (GR-U32, LV-U41)', () => {
  it.each(tilfellene)('%s', (_, resultat, f, setning, utfall) => {
    expect(FORHOLDET.standpunkt({ id: 's', art: 'forhold', resultat }, null, f)).toBe(setning);
    expect(
      FORHOLDET.utfall(
        [{ standpunkt: { id: 's', art: 'forhold', resultat }, lag: null }],
        '2026-11-03T10:00:00Z',
        f
      )
    ).toMatch(utfall);
  });

  it('med en innsigelse om varselet sier statuslinjen begge lagene, med ordene i tråden (oppdragsgiver 15.11 i #2038: «B»)', () => {
    const f = ord({ varslingsplikt: true });
    const linjer = [
      {
        standpunkt: { id: 'v', art: 'rettidighet', hjemmel: '32.2', iTide: false } as Standpunkt,
        lag: 'prinsipalt',
      },
      {
        standpunkt: { id: 's', art: 'forhold', resultat: 'godkjent' } as Standpunkt,
        lag: 'subsidiært',
      },
    ];
    expect(FORHOLDET.utfall(linjer, '2026-11-15T10:00:00Z', f)).toBe(
      'Byggherren svarte 15. november 2026 og gjør gjeldende at varselet etter punkt 32.2 kom for sent. Subsidiært er byggherren enig i at pålegget innebærer en endring.'
    );
  });
});
