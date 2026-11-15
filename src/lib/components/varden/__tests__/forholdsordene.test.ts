/**
 * Byggherrens standpunkt til forholdet i tråden og under tittelen, med kontraktens ord etter
 * forholdet (#2035). Forventningen er ordene brevet har for hvert tilfelle (GR-U32, LV-U41,
 * `STANDPUNKTENE_I_FORHOLDET` i `kjerne/spor/forhold/tekst.ts`): «avslår forholdet» gjelder
 * bare et forhold uten varslingsplikt og uten risiko.
 */
import { describe, expect, it } from 'vitest';
import type { Forholdsresultat } from '$kjerne/regler/typer';
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
    /^Byggherren ga endringsordre /,
  ],
  [
    'enighet om endring når varselet kom for sent',
    'godkjent',
    ord({ varslingsplikt: true }),
    'Byggherren er enig i at pålegget innebærer en endring.',
    /^Byggherren var enig .* i at pålegget innebærer en endring\.$/,
  ],
  [
    'avslag ved irregulær endring',
    'avslaatt',
    ord({ varslingsplikt: true }),
    'Byggherren avslår kravet på endringsordre (punkt 32.3 første ledd b).',
    /^Byggherren avslo kravet på endringsordre /,
  ],
  [
    'svikt, godkjent',
    'godkjent',
    ord({ risiko: true }),
    'Byggherren har risikoen for forholdet.',
    /at byggherren har risikoen for forholdet\.$/,
  ],
  [
    'svikt, avslått',
    'avslaatt',
    ord({ risiko: true }),
    'Byggherren har ikke risikoen for forholdet.',
    /at byggherren ikke har risikoen for forholdet\.$/,
  ],
  [
    'endringsordre etter punkt 31.3, godkjent',
    'godkjent',
    ord({}),
    'Byggherren er enig i at forholdet er en endringsordre (punkt 31.3).',
    /i at forholdet er en endringsordre\.$/,
  ],
  [
    'endringsordre etter punkt 31.3, avslått',
    'avslaatt',
    ord({}),
    'Byggherren avslår forholdet.',
    /^Byggherren avslo forholdet /,
  ],
  [
    'frafall av pålegget',
    'paalegg_frafalt',
    ord({ varslingsplikt: true }),
    'Byggherren frafaller pålegget (punkt 32.3 første ledd c).',
    /^Byggherren frafalt pålegget /,
  ],
];

describe('ordene for standpunktet til forholdet (GR-U32, LV-U41)', () => {
  it.each(tilfellene)('%s', (_, resultat, f, setning, utfall) => {
    expect(FORHOLDET.standpunkt({ id: 's', art: 'forhold', resultat }, null, f)).toBe(setning);
    expect(FORHOLDET.utfall(resultat, '2026-11-03T10:00:00Z', f)).toMatch(utfall);
  });
});
