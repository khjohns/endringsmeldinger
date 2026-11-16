/**
 * Vakta for handlingsregisteret (#2003, OV-U97): `docs/datamodell/handlinger.toml` skal ha en rad
 * for hver handlingsnøkkel, kommandotype og betegnelse i kjernen, og kjernen skal ikke tilby en
 * handling med status `venter`, `innlegg` eller `opphevet` utenom den lukkede listen `[[avvik]]`.
 * Formen på registeret, kildene og skjemaene i Varden prøves i
 * `verktoy/tester/test_datamodell/test_handlinger.py`.
 *
 * Tilbudet prøves i hvert steg av startjournalene demoruta laster, for begge parter. En handling
 * startjournalene aldri gjør mulig, prøves ikke for tilbudet, bare for raden.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Journalrad } from '../typer.ts';
import { KJERNE } from '../versjon.ts';
import { lesJournal } from '../format/leser.ts';
import { utled } from '../utledning/utled.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { BETEGNELSER, SAKSBETEGNELSER } from '../utledning/visning.ts';
import { kandidater, tilbudte, type TilbudtHandling } from '../kommandoer/handlinger.ts';
import { HANDLINGSTYPER, noekkel } from '../kommandoer/forutsetninger.ts';
import { KOMMANDOTYPER } from '../kommandoer/kommando.ts';
import { lesRegister, type Oppfoering } from './registerleser.ts';

const HER = dirname(fileURLToPath(import.meta.url));
const register = lesRegister(
  readFileSync(join(HER, '../../docs/datamodell/handlinger.toml'), 'utf8')
);
const forloepene = (
  JSON.parse(
    readFileSync(join(HER, '../../docs/domenetabell/brukerforlop/startjournaler.json'), 'utf8')
  ) as { forlop: { journal: Journalrad[] }[] }
).forlop;

const radene = register.handling ?? [];
const betegnelsene = register.betegnelse ?? [];
const avvikene = register.avvik ?? [];
const liste = (o: Oppfoering, felt: string) => (o[felt] ?? []) as string[];

/** Nøkkelen slik registeret skriver den: `type:*` for en handling som viser til et element. */
const iRegisteret = (h: Pick<TilbudtHandling, 'type' | 'noekkel' | 'gjelder'>) =>
  h.gjelder === null ? h.noekkel : `${h.type}:*`;
const typen = (n: string) => n.split(':')[0];

/** Hver nøkkel kjernen kan lage i startjournalene, og hver nøkkel den tilbyr, per steg og part. */
const kandidatnoekler = new Set<string>();
const tilbudt = new Set<string>();
for (const f of forloepene)
  for (let i = 1; i <= f.journal.length; i++) {
    const u = utled(lesJournal(f.journal.slice(0, i), KJERNE.leserformat), GJELDENDE_REGLER);
    if (!u.forstaatt) continue;
    for (const h of kandidater(u)) kandidatnoekler.add('gjelder' in h ? `${h.type}:*` : noekkel(h));
    for (const part of ['TE', 'BH'] as const)
      for (const h of tilbudte(u, part)) tilbudt.add(iRegisteret(h));
  }

const noeklerIRegisteret = radene.flatMap((r) => liste(r, 'noekler'));
const IKKE_TILBUDT = new Set(['venter', 'innlegg', 'opphevet']);

describe('handlingsregisteret og kjernen (#2003, OV-U97)', () => {
  it('startjournalene gir nøkler og tilbud å prøve', () => {
    expect(kandidatnoekler.size).toBeGreaterThan(20);
    expect(tilbudt.size).toBeGreaterThan(10);
  });

  it('hver nøkkel står i én rad', () => {
    expect(noeklerIRegisteret.filter((n, i) => noeklerIRegisteret.indexOf(n) !== i)).toEqual([]);
  });

  it('hver handlingsnøkkel kjernen kan lage, har rad', () => {
    expect([...kandidatnoekler].filter((n) => !noeklerIRegisteret.includes(n))).toEqual([]);
  });

  it('hver type i handlingsnøklene har rad, også de kjernen ikke tilbyr', () => {
    const typer = new Set(noeklerIRegisteret.map(typen));
    expect(HANDLINGSTYPER.filter((t) => !typer.has(t))).toEqual([]);
  });

  it('hver nøkkel i registeret har en type kjernen kjenner', () => {
    // Nøkkelen for en registrering, som `varsle:32.2`, er ikke en kandidat og prøves bare på typen.
    expect(noeklerIRegisteret.filter((n) => !HANDLINGSTYPER.includes(typen(n) as never))).toEqual(
      []
    );
  });

  it('hver kommandotype har rad, og hver kommando i registeret finnes i kjernen', () => {
    const iRegisteret = new Set(radene.flatMap((r) => liste(r, 'kommandoer')));
    expect(KOMMANDOTYPER.filter((k) => !iRegisteret.has(k))).toEqual([]);
    expect([...iRegisteret].filter((k) => !KOMMANDOTYPER.includes(k as never))).toEqual([]);
  });

  it('kjernen tilbyr ingen handling med status venter, innlegg eller opphevet, utenom avvikene', () => {
    const avvik = new Set(avvikene.flatMap((a) => liste(a, 'noekler')));
    const ikkeTilbudt = radene
      .filter((r) => IKKE_TILBUDT.has(r.status as string))
      .flatMap((r) => liste(r, 'noekler'));
    expect(ikkeTilbudt.filter((n) => tilbudt.has(n) && !avvik.has(n))).toEqual([]);
  });

  it('hvert avvik tilbys fortsatt og gjelder en rad som ikke skal tilbys, så lista ikke blir stående', () => {
    for (const a of avvikene) {
      const rad = radene.find((r) => r.id === a.handling);
      expect(rad?.status, `${a.handling}`).toSatisfy((s) => IKKE_TILBUDT.has(s as string));
      for (const n of liste(a, 'noekler')) {
        expect(liste(rad!, 'noekler'), `${a.handling}: ${n}`).toContain(n);
        expect(tilbudt.has(n), `avviket ${n} (#${a.issue}) tilbys ikke lenger`).toBe(true);
      }
    }
  });

  it('hver betegnelse i kjernen har rad med status holder, og en betegnelse som utgår eller er ny, finnes ikke', () => {
    const iKjernen = [
      ...BETEGNELSER.map((b) => `spor:${b}`),
      ...SAKSBETEGNELSER.map((b) => `sak:${b}`),
    ].sort();
    const med = (...status: string[]) =>
      betegnelsene
        .filter((b) => status.includes(b.status as string))
        .map((b) => `${b.nivaa as string}:${b.noekkel as string}`);
    expect(med('holder').sort()).toEqual(iKjernen);
    expect(med('utgaar', 'ny', 'endres').filter((b) => iKjernen.includes(b))).toEqual([]);
  });
});
