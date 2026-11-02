/**
 * Saken og den første påberopelsen i én handling over `POST /api/kjerne/saker` med
 * `ny_sak_id`, mot testbasen i SQL Server (#1487). Tilgangen for inngangen prøves i
 * `register.test.ts`; her står det handlingen selv avgjør.
 *
 * Kildene: saken opprettes når den første påberopelsen sendes, og ikke før (KT-U11);
 * jobben for topicen legges inn i samme transaksjon (KT-U3); brevteksten har
 * saksnummeret, så ID-en er bestemt før sendingen (LV-U4, kravet i #1487); tittelen er
 * én verdi (LV-U43); samme kommando-ID med samme innhold gir kvitteringen, og med et
 * annet innhold avvises den (invariant 4, #418).
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { opprettelse } from '../../kjerne/kommandoer/opprettelse.ts';
import { forhaandsvis, laastTekst } from '../../kjerne/kommandoer/skriving.ts';
import type { Journalrad } from '../../kjerne/typer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { sql } from './sqlserver.ts';
import { iTransaksjon } from './sqlserver_migrert.ts';
import {
  PAABEROPELSE,
  kall,
  type KjorendeServer,
  lagOppsett,
  type Oppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type Testbruker,
} from './testbase.ts';

const SAKER = '/api/kjerne/saker';
const TITTEL = 'Endret fundamentering';
const INNHOLD: Record<string, unknown> = { ...PAABEROPELSE.innhold };
delete INNHOLD.tittel;
const KRAV = { ...PAABEROPELSE, innhold: INNHOLD };

/** Den låste teksten kjernen gir for påberopelsen i en sak som ennå ikke finnes (LV-U2). */
function brevtekst(sakId: string, aktoer: string, tittel = TITTEL): unknown {
  const ny = opprettelse({ type: 'opprett_sak', sakstittel: tittel }, 'TE');
  if (!ny.godtatt) throw new Error('Opprettelsen ble avvist.');
  const opprettet: Journalrad = {
    event_id: randomUUID(),
    sak_id: sakId,
    event_type: 'sak_opprettet',
    versjon: 1,
    tidsstempel: new Date().toISOString(),
    aktor_id: aktoer,
    aktor_rolle: 'TE',
    aktor_team_id: null,
    refererer_til_event_id: null,
    format: ny.format,
    data: ny.data,
  };
  const vist = forhaandsvis(
    { ...KRAV, innhold: { ...INNHOLD, tittel } },
    {
      sakId,
      aktoerId: aktoer,
      part: 'TE',
      teamId: null,
      tidspunkt: () => new Date(),
      nyId: randomUUID,
    },
    [opprettet],
    KJERNE
  );
  if (!vist.godtatt)
    throw new Error(`Forhåndsvisningen avviste: ${JSON.stringify(vist.avvisning)}`);
  return laastTekst(vist.hendelser[0]);
}

describe.skipIf(!TESTBASE_URL)('saken og den første påberopelsen i én handling (#1487)', () => {
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

  const kropp = (sakId = randomUUID(), endring: Record<string, unknown> = {}) => ({
    kommando_id: randomUUID(),
    ny_sak_id: sakId,
    tittel: TITTEL,
    paaberopelse: KRAV,
    brevtekst: brevtekst(sakId, o.te.id),
    ...endring,
  });

  const send = (k: unknown, bruker: Testbruker = o.te) =>
    kall(server.url, SAKER, { bruker, prosjektId: o.prosjekt.id, kropp: k });

  /** Sakene, hendelsene, kvitteringene og jobbene i prosjektet, lest med konteksten satt. */
  const antall = () =>
    iTransaksjon(
      o.datalag.base.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE', team: null },
      async (r) => {
        const svar = await r().query<Record<string, number>>(
          `SELECT (SELECT COUNT(*) FROM koe.sak_metadata) AS saker,
                  (SELECT COUNT(*) FROM koe.hendelse) AS hendelser,
                  (SELECT COUNT(*) FROM koe.kvittering) AS kvitteringer,
                  (SELECT COUNT(*) FROM koe.jobb) AS jobber`
        );
        return svar.recordset[0];
      }
    );

  const lagret = (sakId: string) =>
    iTransaksjon(
      o.datalag.base.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE', team: null },
      async (r) => {
        const les = (tekst: string) => r().input('sak_id', sql.NVarChar(36), sakId).query(tekst);
        return {
          hendelser: (
            await les(
              `SELECT event_id, event_type, versjon, tidsstempel, aktor_rolle, data
                 FROM koe.hendelse WHERE sak_id = @sak_id ORDER BY versjon`
            )
          ).recordset,
          kvitteringer: (
            await les('SELECT kommando_id, event_id FROM koe.kvittering WHERE sak_id = @sak_id')
          ).recordset,
          jobber: (await les('SELECT jobbtype, tittel FROM koe.jobb WHERE sak_id = @sak_id'))
            .recordset,
        };
      }
    );

  it('TE oppretter saken med klientens ID og påberopelsen som versjon 2, med jobben og én kvittering (KT-U11, KT-U3)', async () => {
    const sakId = randomUUID();
    const k = kropp(sakId);
    const svar = await send(k);
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    expect(svar.kropp).toMatchObject({ success: true, sak_id: sakId, versjon: 2 });

    const { hendelser, kvitteringer, jobber } = await lagret(sakId);
    expect(hendelser.map((h) => [h.event_type, h.versjon, h.aktor_rolle])).toEqual([
      ['sak_opprettet', 1, 'TE'],
      ['dokument_registrert', 2, 'TE'],
    ]);
    // Samme klokke for begge radene, gitt av basen for skrivingen.
    expect(hendelser[0].tidsstempel).toEqual(hendelser[1].tidsstempel);
    // Tittelen er én verdi i begge radene (LV-U43).
    expect(JSON.parse(hendelser[0].data).sakstittel).toBe(TITTEL);
    expect(JSON.parse(hendelser[1].data).krav[0].tittel).toBe(TITTEL);
    // Kvitteringen gjelder påberopelsen, så kommando-ID-en har én (#418).
    expect(kvitteringer).toEqual([{ kommando_id: k.kommando_id, event_id: svar.kropp.event_id }]);
    // Topicen lages av jobben, og brevet leveres etter den (KT-U3, LV-U9).
    expect(jobber.map((j) => j.jobbtype).sort()).toEqual(['catenda_topic', 'levering']);
    expect(jobber.find((j) => j.jobbtype === 'catenda_topic')?.tittel).toBe(TITTEL);
  });

  it('avviser kjernen påberopelsen, finnes ingen sak, ingen hendelse, ingen kvittering og ingen jobb, og ID-en er ledig (KT-U11)', async () => {
    const sakId = randomUUID();
    const foer = await antall();
    const svar = await send(kropp(sakId, { brevtekst: ['Annen tekst'] }));
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(400);
    expect(svar.kropp.error).toBe('REGELBRUDD');
    expect(await antall()).toEqual(foer);

    const igjen = await send(kropp(sakId));
    expect(igjen.status, JSON.stringify(igjen.kropp)).toBe(201);
  });

  it('BH avvises med FEIL_PART, og ingenting skrives (OV-U1, KT-U10)', async () => {
    const foer = await antall();
    const svar = await send(kropp(), o.bh);
    expect(svar.status).toBe(400);
    expect(svar.kropp).toMatchObject({ error: 'REGELBRUDD', rule: 'FEIL_PART' });
    expect(await antall()).toEqual(foer);
  });

  it('samme kommando-ID med samme innhold gir samme svar uten ny sak; med et annet innhold avvises den (#418)', async () => {
    const k = kropp();
    const foerste = await send(k);
    expect(foerste.status, JSON.stringify(foerste.kropp)).toBe(201);
    const etter = await antall();

    const igjen = await send(k);
    expect(igjen.status, JSON.stringify(igjen.kropp)).toBe(201);
    expect(igjen.kropp).toEqual(foerste.kropp);
    expect(await antall()).toEqual(etter);

    const annenSak = randomUUID();
    for (const endret of [
      { ...k, tittel: 'Annen tittel', brevtekst: brevtekst(k.ny_sak_id, o.te.id, 'Annen tittel') },
      // Samme brevtekst, så bare saks-ID-en skiller kommandoene.
      { ...k, ny_sak_id: annenSak },
    ]) {
      const avvist = await send(endret);
      expect(avvist.status, JSON.stringify(avvist.kropp)).toBe(422);
      expect(avvist.kropp.error).toBe('KOMMANDO_ID_BRUKT');
    }
    expect(await antall()).toEqual(etter);
  });

  it('en brukt saks-ID avvises med SAK_ID_BRUKT, og ingenting skrives (#1487)', async () => {
    const sakId = randomUUID();
    expect((await send(kropp(sakId))).status).toBe(201);
    const foer = await antall();
    const svar = await send(kropp(sakId));
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(409);
    expect(svar.kropp.error).toBe('SAK_ID_BRUKT');
    expect(await antall()).toEqual(foer);
  });

  it.each([
    ['et ukjent felt', { aktor_id: 'x' }, 'Ukjente felt: aktor_id.'],
    ['en saks-ID som ikke er en UUID', { ny_sak_id: 'SAK-1' }, 'ny_sak_id mangler'],
    [
      'en saks-ID med store bokstaver',
      { ny_sak_id: randomUUID().toUpperCase() },
      'ny_sak_id mangler',
    ],
    ['ingen tittel', { tittel: undefined }, 'tittel mangler'],
    // Kjernen trimmer sakstittelen og ville gitt to verdier for én tittel (LV-U43).
    [
      'en tittel med mellomrom i kanten',
      { tittel: ` ${TITTEL} ` },
      'tittel begynner eller slutter',
    ],
    [
      'en annen kommando enn kravet om forholdet',
      { paaberopelse: { ...KRAV, spor: 'vederlag' } },
      'paaberopelse må være',
    ],
    ['tittelen i innholdet', { paaberopelse: PAABEROPELSE }, 'paaberopelse.innhold må være'],
    [
      'brevteksten i påberopelsen',
      { paaberopelse: { ...KRAV, brevtekst: [] } },
      'paaberopelse har ikke brevtekst',
    ],
  ])('avviser %s med 400 før noe skrives', async (_navn, endring, melding) => {
    const foer = await antall();
    const svar = await send(kropp(undefined, endring));
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(400);
    expect(String(svar.kropp.message)).toContain(melding);
    expect(await antall()).toEqual(foer);
  });
});
