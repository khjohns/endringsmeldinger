/**
 * Genererte forløp mot målmodellen i minnet (#304). Handlingene står i
 * `genererte` i bevis-sakene for målmodellen, og velges med samme LCG som
 * `sprakprove/genererte-forlop.json`, uansett tilstand. Etter hvert steg prøves:
 *
 * - INV-AVVIST-UENDRET: en avvist kommando endrer ikke journalen;
 * - INV-MM-5: en regelendring endrer ikke beslutningsgrunnlag eller enighetsgrunnlag;
 * - INV-MM-6: en aksept gir enighet i sporet den gjelder, og ingen andre;
 * - INV-GJENLESING: utledningen er den samme etter serialisering av journalen.
 */

import { describe, expect, it } from 'vitest';
import { utledJournal } from '../skriving.ts';
import type { Utledning } from '../utled.ts';
import { SPOR } from '../typer.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import { MAALMODELL } from './kjoerer.ts';

const G = MAALMODELL.genererte;

/** x = (1103515245·x + 12345) mod 2^31, som `genererte_forlop` i Python og TS. */
function* lcg(seed: number): Generator<number> {
  let x = BigInt(seed);
  for (;;) {
    x = (1103515245n * x + 12345n) % 2147483648n;
    yield Number(x);
  }
}

function forloepene() {
  const tall = lcg(G.seed);
  return Array.from({ length: G.antall }, () =>
    Array.from(
      { length: G.lengde },
      () => G.handlinger[(tall.next().value >> 16) % G.handlinger.length]
    )
  );
}

const frosset = (u: Utledning) => ({
  beslutningsgrunnlag: Object.fromEntries(
    Object.values(u.svar).map((s) => [s.svar.id, s.svar.beslutningsgrunnlag])
  ),
  enighetsgrunnlag: SPOR.map((s) => u.spor[s].enighet?.grunnlag ?? null),
});

describe('genererte forløp mot målmodellen', () => {
  it('er like mange og like lange som oppsettet sier', () => {
    const f = forloepene();
    expect(f).toHaveLength(G.antall);
    expect(f.every((s) => s.length === G.lengde)).toBe(true);
  });

  it.each(forloepene().map((s, i) => [i, s] as const))('forløp %i', async (i, steg) => {
    const bane = minnebane();
    const k = await bygg(bane, [G.start]);
    for (const [n, h] of steg.entries()) {
      const hvor = `seed ${G.seed}, forløp ${i}, steg ${n + 1} (${h.handling} ${JSON.stringify(h)})`;
      const journalFor = await bane.journal();
      const foer = utledJournal(journalFor, k.kjerne);

      const u = await k.send(h);
      const journal = await bane.journal();
      const etter = utledJournal(journal, k.kjerne);
      if (u && !u.godtatt) expect(journal, `INV-AVVIST-UENDRET ${hvor}`).toEqual(journalFor);
      if (h.handling === 'regelendring')
        expect(frosset(etter), `INV-MM-5 ${hvor}`).toEqual(frosset(foer));
      if (u?.godtatt && h.handling === 'aksept') {
        for (const s of SPOR) {
          if (s === h.spor)
            expect(etter.spor[s].enighet?.grunnlag.svar, `INV-MM-6 ${hvor}`).toBe(
              u.hendelser[0].refererer_til_event_id
            );
          else
            expect(etter.spor[s].enighet?.grunnlag, `INV-MM-6 ${hvor}`).toEqual(
              foer.spor[s].enighet?.grunnlag
            );
        }
      }
      expect(
        utledJournal(JSON.parse(JSON.stringify(journal)), k.kjerne),
        `INV-GJENLESING ${hvor}`
      ).toEqual(etter);
    }
  });
});
