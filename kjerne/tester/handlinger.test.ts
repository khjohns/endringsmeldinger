/**
 * Sporet og hjemmelen i hver tilbudt handling (#1703). Visningen leser feltene og deler ikke
 * nøkkelen, så kjernen må gi dem for hver handling den tilbyr. Prøvd i hvert steg i
 * startjournalene demoruta laster, for begge parter.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjoer } from './kjoerer.ts';
import type { Journalrad, Part, Spor } from '../typer.ts';
import { KJERNE } from '../versjon.ts';
import { lesJournal } from '../format/leser.ts';
import { utled, type Utledning } from '../utledning/utled.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { handlinger, tilbudte, type TilbudtHandling } from '../kommandoer/handlinger.ts';

const STARTJOURNALER = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../docs/domenetabell/brukerforlop/startjournaler.json'
);

const forloepene = (
  JSON.parse(readFileSync(STARTJOURNALER, 'utf8')) as {
    forlop: { id: string; journal: Journalrad[] }[];
  }
).forlop;

/** Hver tilbudt handling i hvert steg av hvert forløp, med parten og forløpet. */
const alle: {
  forloep: string;
  part: Part;
  h: TilbudtHandling;
  noekler: string[];
  u: Utledning;
}[] = [];
for (const f of forloepene)
  for (let i = 1; i <= f.journal.length; i++) {
    const u = utled(lesJournal(f.journal.slice(0, i), KJERNE.leserformat), GJELDENDE_REGLER);
    if (!u.forstaatt) continue;
    for (const part of ['TE', 'BH'] as const) {
      const noekler = handlinger(u, part);
      for (const h of tilbudte(u, part)) alle.push({ forloep: f.id, part, h, noekler, u });
    }
  }

/**
 * Sporet og varselet for hver hjemmel: § 33.4 i fristen og § 34.1.2 i vederlaget (OV-U5),
 * § 34.1.3 tredje ledd i vederlaget (OV-U25), og § 34.3.3 og § 34.4 i vederlaget (VS-U48,
 * VS-U52).
 */
const VARSLENE: Record<string, Spor> = {
  '33.4': 'frist',
  '34.1.2': 'vederlag',
  '34.1.3': 'vederlag',
  '34.3.3': 'vederlag',
  '34.4': 'vederlag',
};

describe('sporet og hjemmelen i de tilbudte handlingene (#1703)', () => {
  it('startjournalene gir handlinger å prøve', () => {
    expect(alle.length).toBeGreaterThan(50);
  });

  it('nøklene er de samme som handlinger() gir, i samme rekkefølge', () => {
    for (const { noekler, h } of alle) expect(noekler).toContain(h.noekkel);
  });

  it('hver handling unntatt registreringen av et brev hører til et spor (OV-U16)', () => {
    const utenSpor = alle
      .filter(({ h }) => h.spor === null && h.type !== 'registrere_brev')
      .map(({ forloep, part, h }) => `${forloep} ${part} ${h.noekkel}`);
    expect(utenSpor).toEqual([]);
    expect(alle.filter(({ h }) => h.type === 'registrere_brev').every(({ h }) => !h.spor)).toBe(
      true
    );
  });

  it('et varsel får hjemmelen og sporet etter OV-U5, OV-U25, VS-U48 og VS-U52', () => {
    const varslene = alle.filter(({ h }) => h.type === 'varsle' || h.type === 'sende_varsel');
    for (const { h } of varslene) {
      expect(h.hjemmel, h.noekkel).not.toBeNull();
      expect(h.spor, h.noekkel).toBe(VARSLENE[h.hjemmel!]);
    }
    expect(new Set(varslene.map(({ h }) => h.hjemmel))).toEqual(new Set(Object.keys(VARSLENE)));
  });

  it('svaret på en forespørsel hører til fristen (§ 33.6.2), korrigeringen til forholdet (MM-U55)', () => {
    for (const { h } of alle) {
      if (h.type === 'svare_paa_foresporsel') expect(h.spor).toBe('frist');
      if (h.type === 'korrigere') expect(h.spor).toBe('forhold');
      if (h.gjelder !== null) expect(h.noekkel).toBe(`${h.type}:${h.gjelder}`);
    }
  });

  it('en innsigelse hører til sporet elementet den gjelder, står i i utledningen (#1713)', async () => {
    /** Arten og sporet til elementet `id`, lest av listene i hvert spor i utledningen. */
    const elementet = (u: Utledning, id: string): [string, Spor][] =>
      (Object.keys(u.spor) as Spor[]).flatMap((spor) => {
        const s = u.spor[spor];
        const arter: [string, { id: string }[]][] = [
          ['krav', s.krav],
          ['svar', s.svar],
          ['varsel', Object.values(s.varsler).filter((v) => v !== null && v !== undefined)],
          ['kravpostvarsel', s.kravpostvarsler],
        ];
        return arter.flatMap(([art, e]) =>
          e.some((x) => x.id === id) ? [[art, spor] as [string, Spor]] : []
        );
      });
    // Startjournalene har ingen innsigelse mot et varsel, så saken her har varslene i hvert spor.
    const k = await kjoer(
      {
        id: 'varslene',
        rader: [],
        start: null,
        steg: [
          { handling: 'krav', spor: 'forhold', underkategori: 'irregulaer_endring', navn: 'K-g1' },
          { handling: 'varsel', spor: 'frist', navn: 'V-f1' },
          { handling: 'varsel', spor: 'vederlag', navn: 'V-v1' },
          { handling: 'varsel', spor: 'vederlag', hjemmel: '34.1.3', navn: 'V-v2' },
        ],
        kontroller: [],
      },
      minnebane({ sakstittel: 'Varslene' })
    );
    const u = await k.utledning();
    const innsigelsene = [...alle, ...tilbudte(u, 'BH').map((h) => ({ u, h }))].filter(
      ({ h }) => h.type === 'innsigelse'
    );
    const arter = new Set<string>();
    for (const { u, h } of innsigelsene) {
      const funnet = elementet(u, h.gjelder!);
      expect(funnet, h.noekkel).toHaveLength(1);
      expect(h.spor, h.noekkel).toBe(funnet[0][1]);
      arter.add(funnet[0][0]);
    }
    expect([...arter].sort(), 'forutsetning: artene testen prøver').toEqual(
      expect.arrayContaining(['krav', 'svar', 'varsel'])
    );
    expect(new Set(innsigelsene.map(({ h }) => h.spor)).size).toBeGreaterThan(1);
  });
});
