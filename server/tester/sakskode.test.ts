/**
 * Sakens kode og løpenummer i `koe.sak_kode`, mot testbasen i SQL Server (#1497).
 *
 * Kildene:
 * - LV-U44: saken får koden fra sitt første brev, KOE-nn når totalentreprenøren sender
 *   det og EO-nn når byggherren gjør det, med løpenummer per kode;
 * - LV-U46: saken får koden og løpenummeret når det første brevet sendes, nummeret er
 *   det neste ubrukte for koden i prosjektet, et brev med et nummer en annen sak har
 *   fått, sendes ikke, og nummerrekken har ingen hull;
 * - LV-U47: registrert korrespondanse gir ikke saken en kode, og til det første brevet
 *   er sendt fra løsningen, har saken ingen kode;
 * - arbeidsvalget N2 04.11 i #1497: tabellen skrives én gang, og koden er `koe` eller `eo`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { sql, transaksjon, type Kontekst } from '../datalag.ts';
import type { Sakslinje } from '../saksliste.ts';
import { avvisning } from './sqlserver_migrert.ts';
import {
  kall,
  type KjorendeServer,
  lagOppsett,
  opprettKjernesak,
  type Oppsett,
  rydd,
  sendKommando,
  startServer,
  TESTBASE_URL,
} from './testbase.ts';

const heks = () => randomBytes(32).toString('hex');

describe.skipIf(!TESTBASE_URL)('sakens kode og løpenummer (#1497)', () => {
  let o: Oppsett;
  let server: KjorendeServer;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  const kontekst = (side: 'TE' | 'BH'): Kontekst =>
    side === 'TE'
      ? { aktor: o.te.id, prosjekt: o.prosjekt.id, side, team: catendaId(o.prosjekt.teTeam)! }
      : { aktor: o.bh.id, prosjekt: o.prosjekt.id, side, team: catendaId(o.prosjekt.bhTeam)! };

  /** Radene i `koe.sak_kode` i prosjektet, lest av eieren med konteksten satt. */
  const koder = () =>
    transaksjon(o.datalag.base.pool, kontekst('TE'), async (f) => {
      const svar = await f().query<{ sak_id: string; kode: string; loepenummer: number }>(
        'SELECT sak_id, kode, loepenummer FROM koe.sak_kode ORDER BY kode, loepenummer'
      );
      return svar.recordset;
    });
  const kodenTil = async (sakId: string) => {
    const rad = (await koder()).find((k) => k.sak_id === sakId);
    return rad ? { kode: rad.kode, loepenummer: rad.loepenummer } : null;
  };
  const nesteFor = async (kode: string) =>
    1 + Math.max(0, ...(await koder()).filter((k) => k.kode === kode).map((k) => k.loepenummer));

  /**
   * Skriver ett dokument med `koe_api.skriv_hendelse` som kjøretiden. Et brev fra
   * løsningen har brevteksten; et registrert brev har ingen (MM-U17).
   */
  const skriv = (
    side: 'TE' | 'BH',
    sakId: string,
    forventet: number,
    { brev, loepenummer }: { brev: boolean; loepenummer: number | null }
  ) =>
    transaksjon(o.datalag.kjoeretid.pool, kontekst(side), async (f) => {
      const tid = await f()
        .output('tidspunkt', sql.DateTime2(3))
        .execute('koe_api.skrivetidspunkt');
      await f()
        .input('sak_id', sql.NVarChar(4000), sakId)
        .input('forventet_versjon', sql.Int, forventet)
        .input('event_id', sql.NVarChar(4000), randomUUID())
        .input('event_type', sql.NVarChar(4000), 'dokument_registrert')
        .input('tidsstempel', sql.DateTime2(3), tid.output.tidspunkt as Date)
        .input('format', sql.Int, 1)
        .input(
          'data',
          sql.NVarChar(sql.MAX),
          JSON.stringify(brev ? { brevtekst: [] } : { beskrivelse: 'Brev sendt utenfor løsningen' })
        )
        .input('oppdrag_id', sql.NVarChar(4000), randomUUID())
        .input('dokumentnoekkel', sql.NVarChar(4000), `brev-${randomUUID()}`)
        .input('oppdrag', sql.NVarChar(sql.MAX), '{}')
        .input('oppdrag_sha256', sql.NVarChar(4000), heks())
        .input('kommando_id', sql.NVarChar(4000), randomUUID())
        .input('kommando_sha256', sql.NVarChar(4000), heks())
        .input('loepenummer', sql.Int, loepenummer)
        .execute('koe_api.skriv_hendelse');
    });

  const lista = async () => {
    const svar = await kall(server.url, `/api/projects/${o.prosjekt.id}/saker`, {
      bruker: o.bh,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
    return (svar.kropp as { saker: Sakslinje[] }).saker;
  };

  it('TEs første brev fra løsningen gir saken KOE og det neste løpenummeret, og senere brev endrer det ikke (LV-U44, LV-U46)', async () => {
    const foerste = await opprettKjernesak(o);
    const andre = await opprettKjernesak(o);
    const neste = await nesteFor('koe');
    for (const sak of [foerste, andre]) {
      const svar = await sendKommando(server.url, o, sak, { versjon: 1 });
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    }
    expect(await kodenTil(foerste)).toEqual({ kode: 'koe', loepenummer: neste });
    expect(await kodenTil(andre)).toEqual({ kode: 'koe', loepenummer: neste + 1 });
    const igjen = await sendKommando(server.url, o, foerste, {
      versjon: 2,
      kommando: {
        type: 'krav',
        spor: 'vederlag',
        innhold: { metode: 'tilbud', beloep: 100000 },
      },
    });
    expect(igjen.status, JSON.stringify(igjen.kropp)).toBe(201);
    expect(await kodenTil(foerste)).toEqual({ kode: 'koe', loepenummer: neste });
  });

  it('brevkontrollen leser nummeret sakens første brev vil få, og etter brevet koden saken fikk; BH får ikke nummeret for en ny sak (LV-U46, LV-U44)', async () => {
    const les = (sti: string, bruker = o.te) =>
      kall(server.url, sti, { bruker, prosjektId: o.prosjekt.id });
    const neste = await nesteFor('koe');
    const forNySak = await les('/api/kjerne/sakskode');
    expect(forNySak.status, JSON.stringify(forNySak.kropp)).toBe(200);
    expect(forNySak.kropp).toMatchObject({ kode: 'koe', loepenummer: neste, tildelt: false });
    // Kilde: KT-U10, bare TE oppretter en sak.
    expect((await les('/api/kjerne/sakskode', o.bh)).status).toBe(403);

    const sak = await opprettKjernesak(o);
    const foer = await les(`/api/kjerne/saker/${sak}/sakskode`);
    expect(foer.kropp).toMatchObject({ kode: 'koe', loepenummer: neste, tildelt: false });
    // Lesingen holder ikke av nummeret; en annen sak kan få det før brevet sendes.
    expect(await kodenTil(sak)).toBeNull();
    expect((await sendKommando(server.url, o, sak, { versjon: 1 })).status).toBe(201);
    const etter = await les(`/api/kjerne/saker/${sak}/sakskode`);
    expect(etter.kropp).toMatchObject({ kode: 'koe', loepenummer: neste, tildelt: true });
    // Kontrollsak: BH leser samme kode for saken, ikke et EO-nummer.
    const forBh = await les(`/api/kjerne/saker/${sak}/sakskode`, o.bh);
    expect(forBh.kropp).toMatchObject({ kode: 'koe', loepenummer: neste, tildelt: true });
  });

  it('en sak uten brev fra løsningen har ingen kode, og sakslisten gir koden og løpenummeret videre (LV-U47)', async () => {
    const uten = await opprettKjernesak(o);
    const med = await opprettKjernesak(o);
    const svar = await sendKommando(server.url, o, med, { versjon: 1 });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    const kode = await kodenTil(med);
    expect(kode?.kode).toBe('koe');
    const linjer = await lista();
    const linje = (sakId: string) => linjer.find((l) => l.sak_id === sakId)!;
    expect(await kodenTil(uten)).toBeNull();
    expect([linje(uten).kode, linje(uten).loepenummer]).toEqual([null, null]);
    expect([linje(med).kode, linje(med).loepenummer]).toEqual(['koe', kode!.loepenummer]);
  });

  it('registrert korrespondanse gir ikke saken en kode, og løpenummeret avvises for den (LV-U47)', async () => {
    const sak = await opprettKjernesak(o);
    const neste = await nesteFor('koe');
    expect(await avvisning(skriv('TE', sak, 1, { brev: false, loepenummer: neste }))).toBe(51422);
    await skriv('TE', sak, 1, { brev: false, loepenummer: null });
    expect(await kodenTil(sak)).toBeNull();
    await skriv('TE', sak, 2, { brev: true, loepenummer: neste });
    expect(await kodenTil(sak)).toEqual({ kode: 'koe', loepenummer: neste });
  });

  it('byggherrens første brev gir saken EO, med egen rekke for koden (LV-U44)', async () => {
    const sak = await opprettKjernesak(o);
    const nesteKoe = await nesteFor('koe');
    await skriv('BH', sak, 1, { brev: true, loepenummer: await nesteFor('eo') });
    expect((await kodenTil(sak))?.kode).toBe('eo');
    expect(await nesteFor('koe')).toBe(nesteKoe);
  });

  it('et løpenummer som ikke er det neste for koden, avvises, og ingenting skrives (LV-U46)', async () => {
    const sak = await opprettKjernesak(o);
    const neste = await nesteFor('koe');
    for (const feil of [neste - 1, neste + 1])
      expect(await avvisning(skriv('TE', sak, 1, { brev: true, loepenummer: feil }))).toBe(51411);
    expect(await avvisning(skriv('TE', sak, 1, { brev: true, loepenummer: null }))).toBe(51422);
    expect(await kodenTil(sak)).toBeNull();
    // Versjonen er fortsatt 1: ingen av forsøkene skrev brevet.
    await skriv('TE', sak, 1, { brev: true, loepenummer: neste });
    expect(await kodenTil(sak)).toEqual({ kode: 'koe', loepenummer: neste });
    // Saken har koden; et nytt brev fra løsningen får ikke et nytt nummer.
    expect(await avvisning(skriv('TE', sak, 2, { brev: true, loepenummer: neste + 1 }))).toBe(
      51422
    );
  });

  it('sakens kode endres og slettes ikke, heller ikke av eieren (N2)', async () => {
    const sak = await opprettKjernesak(o);
    await skriv('TE', sak, 1, { brev: true, loepenummer: await nesteFor('koe') });
    for (const setning of [
      'UPDATE koe.sak_kode SET loepenummer = loepenummer + 1000 WHERE sak_id = @sak_id',
      'DELETE koe.sak_kode WHERE sak_id = @sak_id',
    ])
      expect(
        await avvisning(
          transaksjon(o.datalag.base.pool, kontekst('TE'), (f) =>
            f().input('sak_id', sql.NVarChar(36), sak).query(setning)
          )
        )
      ).toBe(51001);
  });

  it('første brev i to saker samtidig med samme nummer i teksten: det ene sendes, det andre sendes først med det nye nummeret, uten hull og uten dobbelt nummer (LV-U46)', async () => {
    const saker = [await opprettKjernesak(o), await opprettKjernesak(o)];
    const neste = await nesteFor('koe');
    // Begge tekstene har nummeret brevkontrollen viste før noen av dem var sendt.
    const svar = await Promise.all(
      saker.map((sak) => sendKommando(server.url, o, sak, { versjon: 1 }))
    );
    expect(svar.map((s) => s.status).sort()).toEqual([201, 400]);
    const taperen = saker[svar.findIndex((s) => s.status === 400)];
    expect(svar.find((s) => s.status === 400)!.kropp.rule).toBe('ANNEN_BREVTEKST');
    expect(await kodenTil(taperen), 'brevet med det tatte nummeret er ikke sendt').toBeNull();
    // Avsenderen ser brevet med det nye nummeret og godkjenner det på nytt.
    const igjen = await sendKommando(server.url, o, taperen, { versjon: 1 });
    expect(igjen.status, JSON.stringify(igjen.kropp)).toBe(201);
    const numre = await Promise.all(saker.map(async (s) => (await kodenTil(s))?.loepenummer));
    expect(numre.sort()).toEqual([neste, neste + 1]);
    const rekke = (await koder()).filter((k) => k.kode === 'koe').map((k) => k.loepenummer);
    expect(rekke).toEqual(rekke.map((_, i) => i + 1));
  });
});
