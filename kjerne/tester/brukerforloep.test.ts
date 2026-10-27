/**
 * Brukerforløpene i `docs/domenetabell/brukerforlop/` mot kjernen i minnet (#1330), og
 * vakttestene for formatet, dekningsoversikten og startjournalene demoruta laster. Samme
 * forløp går gjennom testbasen i `sprakprove/kjernelagring/brukerforloep.test.ts`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import regler from '../../docs/domenetabell/regler.json' with { type: 'json' };
import { avvikFraFormatet, utenAvsnitt } from './formatprove.ts';
import { MAALMODELL } from './kjoerer.ts';
import {
  BRUKERFORLOEP,
  demonavnerom,
  forloepsfiler,
  genererte,
  kildebruk,
  kjoerBrukerforloep,
  kjoerbare,
  kontrollerI,
  lagret,
  MAPPE,
  somForloep,
  type Brukerforloep,
} from './brukerforloep.ts';
import { fasteIder } from './testmiljoe.ts';

const paastand = (holder: boolean, melding: string) => expect(holder, melding).toBe(true);

describe('brukerforløpene i minnet', () => {
  it.each(kjoerbare().map((b) => [b.id, b] as const))('%s', async (_id, b) => {
    const { k, bane } = await kjoerBrukerforloep(b, { paastand });
    // 7.1.2 og LV-U3, som for bevis-sakene i forloep.test.ts.
    const skrevet = (await bane.journal()).filter((r) => k.skrevet.includes(r.event_id));
    expect(skrevet.flatMap(avvikFraFormatet)).toEqual([]);
    expect(skrevet.flatMap(utenAvsnitt)).toEqual([]);
  });

  it('en omstart gir samme journal, med samme ID-er og tidsstempler', async () => {
    for (const b of kjoerbare()) {
      const en = await (await kjoerBrukerforloep(b)).bane.journal();
      const to = await (await kjoerBrukerforloep(b)).bane.journal();
      expect(to).toEqual(en);
    }
  });

  it('to forløp som kjører samtidig, deler ingen ID og ingen journal', async () => {
    const b = kjoerbare()[0];
    const alene = await (await kjoerBrukerforloep(b)).bane.journal();
    const [a, c] = await Promise.all([kjoerBrukerforloep(b), kjoerBrukerforloep(b)]);
    expect(await a.bane.journal()).toEqual(alene);
    expect(await c.bane.journal()).toEqual(alene);
    expect((await a.k.send({ handling: 'krav', spor: 'frist', dager: 10 }))?.godtatt).toBe(true);
    expect((await a.bane.journal()).length).toBe(alene.length + 1);
    expect(await c.bane.journal()).toEqual(alene);
  });

  it('navnerommene til forløpene og demoruta gir ulike ID-er', () => {
    const navnerom = BRUKERFORLOEP.flatMap((b) => [b.id, demonavnerom(b)]);
    const foersteId = navnerom.map((n) => fasteIder(n)());
    expect(new Set(foersteId).size).toBe(navnerom.length);
  });

  it('journalen ved et kontrollpunkt er begynnelsen av hele journalen', async () => {
    for (const b of kjoerbare()) {
      const hele = await (await kjoerBrukerforloep(b)).bane.journal();
      for (const p of b.kontrollpunkter ?? []) {
        const del = await (await kjoerBrukerforloep(b, { til: p.id })).bane.journal();
        expect(del).toEqual(hele.slice(0, del.length));
      }
    }
  });

  it('et planlagt forløp kjøres ikke', () => {
    const planlagt = BRUKERFORLOEP.find((b) => b.status === 'planlagt')!;
    expect(() => somForloep(planlagt)).toThrow(/planlagt og kjøres ikke/);
  });
});

/** Vedtakene i vedtaksfila og radene i domenetabellen, som kildene kan vise til. */
const KILDER = new Set([
  ...[
    ...readFileSync(join(MAPPE, '../../plans/vedtak.md'), 'utf8').matchAll(
      /<a id="([a-z0-9-]+)">/g
    ),
  ].map((m) => m[1].toUpperCase()),
  ...(regler as { rader: { id: string }[] }).rader.map((r) => r.id),
]);
const BEVIS = new Set(MAALMODELL.forlop.map((f) => f.id));

function avvik(b: Brukerforloep, fil: string): string[] {
  const ut: string[] = [];
  const krev = (holder: unknown, hva: string) => void (holder || ut.push(`${b.id}: ${hva}`));
  krev(fil === `${b.id}.json`, `fila heter ${fil}`);
  krev(b.tittel && b.brukerhistorie && b.utgangspunkt?.beskrivelse, 'mangler tekst');
  krev(['kjørbar', 'planlagt'].includes(b.status), `ukjent status ${b.status}`);
  krev(
    b.endringer.length &&
      b.endringer.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.dato) && e.grunnlag),
    'en endring mangler dato eller vedtak eller issue'
  );
  krev(
    b.visninger.every((v) => v === 'demoruta' || v === 'saksruta'),
    'ukjent visning'
  );
  for (const id of b.bevis_saker) krev(BEVIS.has(id), `bevis-saken ${id} finnes ikke`);
  for (const k of b.kilder ?? []) krev(KILDER.has(k), `kilden ${k} finnes ikke`);
  if (b.bestilling) krev(lagret(b.bestilling) !== null, `bestillingen ${b.bestilling} finnes ikke`);
  if (b.status === 'planlagt') {
    krev(b.venter_paa?.length, 'et planlagt forløp sier hva det venter på');
    krev(!b.steg?.length && !b.kontrollpunkter?.length, 'et planlagt forløp har ingen steg');
    krev(!b.visninger.length, 'et planlagt forløp er ikke prøvd i noen visning');
    return ut;
  }
  const steg = b.steg ?? [];
  const punkter = b.kontrollpunkter ?? [];
  krev(steg.length && punkter.length, 'et kjørbart forløp har steg og kontrollpunkter');
  krev(
    new Set(punkter.map((p) => p.id)).size === punkter.length,
    'kontrollpunktene har like ID-er'
  );
  for (const p of punkter) {
    krev(Number.isInteger(p.etter) && p.etter >= 0 && p.etter <= steg.length, `${p.id}: etter`);
    const kontroller = kontrollerI(p);
    krev(kontroller.length, `${p.id} har ingen kontroll`);
    for (const k of kontroller)
      for (const kilde of k.kilde) krev(KILDER.has(kilde), `${p.id}: kilden ${kilde} finnes ikke`);
    for (const f of p.forstaaelse) {
      krev(f.tekst && f.kilde?.length, `${p.id}: en forståelse mangler tekst eller kilde`);
      for (const kilde of f.kilde ?? [])
        krev(KILDER.has(kilde), `${p.id}: kilden ${kilde} finnes ikke`);
    }
  }
  return ut;
}

describe('vakttestene for brukerforløpene', () => {
  it('hvert forløp har formatet, og kildene og bevis-sakene finnes', () => {
    const filer = forloepsfiler();
    expect(filer.length).toBeGreaterThan(0);
    expect(BRUKERFORLOEP.flatMap((b, i) => avvik(b, filer[i]))).toEqual([]);
  });

  it('vakten kjenner igjen et forløp som bryter formatet', () => {
    const b = structuredClone(BRUKERFORLOEP.find((x) => x.status === 'kjørbar')!);
    b.kontrollpunkter![0].kontroller = [{ rolle: 'mal', kilde: ['UKJENT-KILDE'], forventet: {} }];
    b.kontrollpunkter![0].kontrollsett = [];
    b.kontrollpunkter![0].forstaaelse = [
      { tekst: 'Uten kilde.', kilde: [] },
      { tekst: 'Med en ukjent kilde.', kilde: ['UKJENT-FORSTAAELSE'] },
    ];
    b.endringer = [];
    const p = b.kontrollpunkter![0].id;
    expect(avvik(b, `${b.id}.json`)).toEqual([
      `${b.id}: en endring mangler dato eller vedtak eller issue`,
      `${b.id}: ${p}: kilden UKJENT-KILDE finnes ikke`,
      `${b.id}: ${p}: en forståelse mangler tekst eller kilde`,
      `${b.id}: ${p}: kilden UKJENT-FORSTAAELSE finnes ikke`,
    ]);
    const planlagt = structuredClone(BRUKERFORLOEP.find((x) => x.status === 'planlagt')!);
    planlagt.steg = [{ handling: 'trekk', spor: 'grunnlag' }];
    planlagt.venter_paa = [];
    planlagt.bestilling = 'FINNES-IKKE.md';
    expect(avvik(planlagt, `${planlagt.id}.json`)).toEqual([
      `${planlagt.id}: bestillingen FINNES-IKKE.md finnes ikke`,
      `${planlagt.id}: et planlagt forløp sier hva det venter på`,
      `${planlagt.id}: et planlagt forløp har ingen steg`,
    ]);
  });

  // Kilde: #1330, punkt 4. OV-U52 er ikke bygget (#1308, #1309), og handlingen og
  // brevteksten etter OV-U54 er ikke kontrollert som bygget (#276).
  it('korrigeringen (4A) og den avviste rettingen (4C) er planlagt', () => {
    const status = Object.fromEntries(BRUKERFORLOEP.map((b) => [b.id, b.status]));
    expect(status['BF-02A']).toBe('planlagt');
    expect(status['BF-02C']).toBe('planlagt');
  });

  it('et kjørbart forløp etter OV-U54 (4B) har en kontroll med OV-U54 som kilde', () => {
    for (const b of BRUKERFORLOEP.filter((x) => x.kilder?.includes('OV-U54'))) {
      if (b.status === 'planlagt') continue;
      const kilder = (b.kontrollpunkter ?? []).flatMap(kontrollerI).flatMap((k) => k.kilde);
      expect(kilder, b.id).toContain('OV-U54');
    }
    expect(BRUKERFORLOEP.find((b) => b.id === 'BF-02B')?.status).toBe('planlagt');
  });

  it('kildeoversikten skiller kontroller, forståelse og planlagte forløp', () => {
    const kjoerbart = structuredClone(BRUKERFORLOEP.find((x) => x.status === 'kjørbar')!);
    kjoerbart.kontrollpunkter = [
      {
        id: 'p',
        etter: 0,
        beskrivelse: '',
        kontrollsett: [{ sett: 'bh_har_mottatt_krav', med: { spor: 'vederlag', krav: 'K' } }],
        kontroller: [{ rolle: 'mal', kilde: ['GR-U7'], forventet: {} }],
        forstaaelse: [{ tekst: 'x', kilde: ['GR-U7', 'OV-U27'] }],
      },
    ];
    kjoerbart.kilder = ['OV-U27'];
    const planlagt: Brukerforloep = {
      ...kjoerbart,
      id: 'BF-P',
      status: 'planlagt',
      kontrollpunkter: [],
    };
    const id = kjoerbart.id;
    expect(Object.fromEntries(kildebruk([kjoerbart, planlagt]))).toEqual({
      'GR-U7': { kontroll: [`${id} p`], forstaaelse: [`${id} p`], planlagt: [] },
      'KA-01': { kontroll: [`${id} p`], forstaaelse: [], planlagt: [] },
      'KA-U2': { kontroll: [`${id} p`], forstaaelse: [], planlagt: [] },
      'OV-U27': { kontroll: [], forstaaelse: [`${id} p`], planlagt: ['BF-P'] },
    });
  });

  it('dekningsoversikten og startjournalene stemmer med forløpsfilene', async () => {
    for (const [fil, innhold] of Object.entries(await genererte()))
      expect(lagret(fil), `${fil}: kjør node kjerne/tester/brukerforloep.ts --skriv`).toBe(innhold);
  });
});
