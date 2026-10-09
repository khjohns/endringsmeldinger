/**
 * Domenetabellen kjørt mot TS-kjernen i minnet (#274, port 1). Samme bevis-saker
 * som Python-banene; kjente avvik i Python er ikke kjente avvik her, så alle
 * forløp i flyten skal holde.
 */

import { describe, expect, it } from 'vitest';
import { FLYTEN, FORELDET, kjor, minnebane } from './korpus.ts';
import { RADER } from '../kjerne/kontrakt.ts';
import { projiser, UkjentHendelse } from '../kjerne/sak.ts';
import type { Hendelse } from '../kjerne/typer.ts';

describe('bevis-sakene i flyten mot TS-kjernen', () => {
  it('dekker alle radene i kontrakten', () => {
    const dekket = new Set([...FLYTEN, ...FORELDET].flatMap((f) => f.rader));
    expect(RADER.filter((r) => !dekket.has(r))).toEqual([]);
  });

  it.each(FLYTEN.map((f) => [f.id, f] as const))('%s', async (_id, forlop) => {
    await kjor(forlop, minnebane(), {
      pastand: (holder, melding) => expect(holder, melding).toBe(true),
    });
  });

  it.fails.each(FORELDET.map((f) => [f.id, f] as const))(
    '%s: prøvekoden følger ikke KA-U7',
    async (_id, forlop) => {
      await kjor(forlop, minnebane(), {
        pastand: (holder, melding) => expect(holder, melding).toBe(true),
      });
    }
  );
});

describe('projeksjonen og hendelser kjernen ikke kjenner (B-10)', () => {
  const hendelse = (event_type: string, data: Record<string, unknown> = {}) =>
    ({
      event_id: `h-${event_type}`,
      sak_id: 'S',
      event_type,
      versjon: 1,
      tidsstempel: '2026-10-09T08:00:00Z',
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      data,
    }) as Hendelse;

  it('godtar opprettelsen av en vanlig sak og et internt notat', () => {
    expect(
      projiser('S', [
        hendelse('sak_opprettet', { sakstype: 'standard' }),
        hendelse('internt_notat'),
      ]).antallHendelser
    ).toBe(2);
  });

  it.each([
    ['grunnlag_trukket', {}],
    ['sak_opprettet', { sakstype: 'forsering' }],
    ['respons_vederlag', {}],
  ])('avviser %s %j', (type, data) => {
    expect(() => projiser('S', [hendelse(type, data)])).toThrow(UkjentHendelse);
  });
});
