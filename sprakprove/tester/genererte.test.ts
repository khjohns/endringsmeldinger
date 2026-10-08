/** De genererte forløpene i `sprakprove/genererte-forlop.json` mot TS-kjernen (P1-6). */

import { describe, expect, it } from 'vitest';
import oppsett from '../genererte-forlop.json' with { type: 'json' };
import { offentligTilstand } from '../kjerne/offentlig.ts';
import { fraRad, tilRad } from '../kjerne/rad.ts';
import { gjeldendeSvar, projiser } from '../kjerne/sak.ts';
import type { Spor } from '../kjerne/typer.ts';
import { KORPUS, minnebane } from './korpus.ts';

type Handling = Record<string, unknown> & { handling: string };

/** x = (1103515245·x + 12345) mod 2^31, som `genererte_forlop` i Python. */
export function* lcg(seed: number): Generator<number> {
  let x = BigInt(seed);
  for (;;) {
    x = (1103515245n * x + 12345n) % 2147483648n;
    yield Number(x);
  }
}

export function forlopene(): Handling[][] {
  const tall = lcg(oppsett.seed);
  const handlinger = oppsett.handlinger as Handling[];
  return Array.from({ length: oppsett.antall }, () =>
    Array.from(
      { length: oppsett.lengde },
      () => handlinger[(tall.next().value >> 16) % handlinger.length]
    )
  );
}

describe('genererte forløp mot TS-kjernen', () => {
  it('er like mange og like lange som oppsettet sier', () => {
    const f = forlopene();
    expect(f).toHaveLength(oppsett.antall);
    expect(f.every((s) => s.length === oppsett.lengde)).toBe(true);
  });

  it.each(forlopene().map((s, i) => [i, s] as const))('forløp %i', (i, steg) => {
    const bane = minnebane();
    for (const h of KORPUS.prefikser[oppsett.start]) expect(bane.send(h).godtatt).toBe(true);
    steg.forEach((h, n) => {
      const hvor = `seed ${oppsett.seed}, forløp ${i}, steg ${n + 1} (${h.handling})`;
      const for_ = bane.sak();
      const journalFor = bane.journal.length;
      const u = bane.send(h);
      if (!u.godtatt) {
        expect(bane.journal.length, `INV-AVVIST-UENDRET ${hvor}`).toBe(journalFor);
      } else if (h.handling === 'aksept') {
        const spor = h.spor as Spor;
        expect(u.hendelse.refererer_til_event_id, `INV-AKSEPT-GJELDENDE ${hvor}`).toBe(
          gjeldendeSvar(for_[spor])?.eventId
        );
        expect(
          offentligTilstand(bane.sak())[spor].te_akseptert,
          `INV-AKSEPT-GJELDENDE ${hvor}`
        ).toBe(true);
      }
      const tilstand = offentligTilstand(bane.sak());
      const venter = (['grunnlag', 'vederlag', 'frist'] as const).some(
        (s) => tilstand[s].krav_event_id !== null && tilstand[s].gjeldende_respons_event_id === null
      );
      if (venter)
        expect(tilstand.overordnet_status, `INV-UBESVART-IKKE-OMFORENT ${hvor}`).not.toBe(
          'OMFORENT'
        );
      const gjenlest = JSON.parse(JSON.stringify(bane.journal.map((h) => tilRad(h, 'p')))).map(
        fraRad
      );
      expect(offentligTilstand(projiser(bane.sakId, gjenlest)), `INV-GJENLESING ${hvor}`).toEqual(
        tilstand
      );
    });
  });
});
