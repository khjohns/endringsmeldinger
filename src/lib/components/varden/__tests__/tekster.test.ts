/**
 * Hardt mellomrom etter «punkt», «pkt.» og «kl.» foran et tall i tekstene i visningen (språkfila,
 * «Hardt mellomrom», svaret 16.11 i #2049).
 */
import { describe, expect, it } from 'vitest';
import * as TEKSTER from '#lib/components/varden/tekster/index.ts';
import { haerdet, hjemmelsmerke, kl } from '#lib/components/varden/tekster/index.ts';

const VANLIG = /(?<!\p{L})([Pp]unkt|[Pp]kt\.|[Kk]l\.) (?=\d)/u;

/** Tekstene i et objekt eller en liste, med stien dit. */
function tekstene(v: unknown, sti: string): [string, string][] {
  if (typeof v === 'string') return [[sti, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => tekstene(x, `${sti}[${i}]`));
  if (v !== null && typeof v === 'object')
    return Object.entries(v).flatMap(([k, x]) => tekstene(x, `${sti}.${k}`));
  return [];
}

describe('hardt mellomrom i tekstene i visningen (#2049)', () => {
  it('ingen fast tekst har vanlig mellomrom etter «punkt», «pkt.» eller «kl.» foran et tall', () => {
    const alle = Object.entries(TEKSTER).flatMap(([navn, v]) => tekstene(v, navn));
    expect(alle.length).toBeGreaterThan(100);
    expect(alle.filter(([, t]) => VANLIG.test(t)).map(([sti]) => sti)).toEqual([]);
  });

  it('en tekst en funksjon lager, får hardt mellomrom, også i en liste', () => {
    expect(TEKSTER.FRISTKRAV.fristerHjelp).toContain('punkt 1.2');
    expect(hjemmelsmerke('33.4')).toBe('pkt. 33.4');
    expect(kl('2026-11-17T09:15:00Z')).toBe('kl. 10.15');
    expect(haerdet(() => ['etter punkt 33.4', 3])()).toEqual(['etter punkt 33.4', 3]);
  });

  it('kontrollsak: «punkter 3» og «pkt. a» er ikke henvisninger etter regelen og står uendret', () => {
    expect(haerdet('punkter 3 og pkt. a')).toBe('punkter 3 og pkt. a');
  });
});
