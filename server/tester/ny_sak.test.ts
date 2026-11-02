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
import type { Journalrad, Vedlegg } from '../../kjerne/typer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { catendaId } from '../autorisasjon.ts';
import { STOERSTE_VEDLEGG, VEDLEGG_FOER_SAKEN } from '../vedlegg.ts';
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
function brevtekst(
  sakId: string,
  aktoer: string,
  tittel = TITTEL,
  krav: Record<string, unknown> = KRAV,
  vedlegg: ReadonlyMap<string, Vedlegg> = new Map()
): unknown {
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
    { ...krav, innhold: { ...INNHOLD, tittel } },
    {
      sakId,
      aktoerId: aktoer,
      part: 'TE',
      teamId: null,
      tidspunkt: () => new Date(),
      nyId: randomUUID,
    },
    [opprettet],
    KJERNE,
    vedlegg
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
    ['en tittel med bare mellomrom', { tittel: '   ' }, 'tittel mangler'],
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

  describe('vedleggene lastet opp før saken, og varselet etter punkt 32.2 (#1037, VS-U38)', () => {
    const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');
    const UTEN_SAK = '/api/kjerne/vedlegg';
    const kontekst = () => ({
      aktor: o.te.id,
      prosjekt: o.prosjekt.id,
      side: 'TE' as const,
      team: catendaId(o.prosjekt.teTeam)!,
    });

    async function lastOpp(bruker: Testbruker = o.te, filnavn = 'varsel.pdf', innhold = PDF) {
      const svar = await fetch(`${server.url}${UTEN_SAK}`, {
        method: 'POST',
        headers: {
          Cookie: `__Host-koe_session=${bruker.token}`,
          'X-CSRF-Token': bruker.csrf,
          'X-Project-ID': o.prosjekt.id,
          'Content-Type': 'application/octet-stream',
          'X-Filnavn': encodeURIComponent(filnavn),
        },
        body: new Uint8Array(innhold),
      });
      const kropp = (await svar.json()) as Record<string, unknown> & { vedlegg?: Vedlegg };
      // Kjernen får bare feltene den leser, som serveren gir den (`lesVedleggUtenSak`).
      const v = kropp.vedlegg;
      return {
        status: svar.status,
        kropp,
        vedlegg: v && {
          vedlegg_id: v.vedlegg_id,
          filnavn: v.filnavn,
          innhold_sha256: v.innhold_sha256,
        },
      };
    }

    /** Vedleggene uten sak og vedleggene i saken, lest i teamets kontekst. */
    const vedleggene = (sakId: string) =>
      iTransaksjon(o.datalag.base.pool, kontekst(), async (r) => ({
        utenSak: (
          await r().query<{ id: string }>(
            'SELECT LOWER(CONVERT(nvarchar(36), vedlegg_id)) AS id FROM koe.vedlegg_uten_sak'
          )
        ).recordset.map((v) => v.id),
        iSaken: (
          await r()
            .input('sak_id', sql.NVarChar(36), sakId)
            .query<{ id: string; bundet: string | null }>(
              `SELECT LOWER(CONVERT(nvarchar(36), vedlegg_id)) AS id,
                      LOWER(CONVERT(nvarchar(36), bundet_av_event_id)) AS bundet
                 FROM koe.vedlegg WHERE sak_id = @sak_id`
            )
        ).recordset,
      }));

    /** Kroppen med påberopelsen, vedleggene og eventuelt varselet, med brevteksten for dem. */
    function medVedlegg(
      vedlegg: Vedlegg[],
      varsel?: { sendt: string; dokumentasjon: string[] },
      sakId = randomUUID()
    ) {
      const krav = { ...KRAV, dokumentasjon: vedlegg.map((v) => v.vedlegg_id) };
      const oppslag = new Map(vedlegg.map((v) => [v.vedlegg_id, v]));
      return kropp(sakId, {
        paaberopelse: krav,
        brevtekst: brevtekst(sakId, o.te.id, TITTEL, krav, oppslag),
        ...(varsel ? { varsel } : {}),
      });
    }

    const iDag = () => new Date().toISOString().slice(0, 10);

    it('flytter vedlegget inn i saken med samme ID, binder det til påberopelsen og skriver varselet som versjon 3 (#1037, VS-U38, KT-U11)', async () => {
      const opplastet = await lastOpp();
      expect(opplastet.status, JSON.stringify(opplastet.kropp)).toBe(201);
      const v = opplastet.vedlegg!;
      const k = medVedlegg([v], { sendt: iDag(), dokumentasjon: [v.vedlegg_id] });
      const svar = await send(k);
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);

      const { hendelser, kvitteringer } = await lagret(k.ny_sak_id);
      expect(hendelser.map((h) => [h.event_type, h.versjon])).toEqual([
        ['sak_opprettet', 1],
        ['dokument_registrert', 2],
        ['dokument_registrert', 3],
      ]);
      const varselet = JSON.parse(hendelser[2].data);
      expect(varselet.dokumentasjon).toEqual([v]);
      expect(hendelser[2].data).toContain(`"${iDag()}"`);
      // Påberopelsen og varselet har hver sin kvittering, under hver sin kommando-ID (#418).
      expect(kvitteringer).toHaveLength(2);
      expect(kvitteringer).toContainEqual({
        kommando_id: k.kommando_id,
        event_id: svar.kropp.event_id,
      });

      const { utenSak, iSaken } = await vedleggene(k.ny_sak_id);
      expect(utenSak).not.toContain(v.vedlegg_id);
      expect(iSaken).toEqual([{ id: v.vedlegg_id, bundet: hendelser[1].event_id.toLowerCase() }]);

      // Samme kommando-ID gir samme svar, uten ny sak, hendelse eller kvittering (#418).
      const foer = await antall();
      const igjen = await send(k);
      expect(igjen.status, JSON.stringify(igjen.kropp)).toBe(201);
      expect(igjen.kropp).toEqual(svar.kropp);
      expect(await antall()).toEqual(foer);

      // Uten varselet er det et annet innhold under samme kommando-ID (#418).
      const utenVarsel = await send({ ...k, varsel: undefined });
      expect(utenVarsel.status, JSON.stringify(utenVarsel.kropp)).toBe(422);
      expect(utenVarsel.kropp.error).toBe('KOMMANDO_ID_BRUKT');
      expect(await antall()).toEqual(foer);
    });

    it('avviser kjernen varselet fordi datoen er etter påberopelsen, finnes ingen sak, hendelse, kvittering eller jobb, og vedlegget ligger fortsatt uten sak (VS-U38, KT-U11)', async () => {
      const v = (await lastOpp()).vedlegg!;
      const imorgen = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
      const k = medVedlegg([v], { sendt: imorgen, dokumentasjon: [v.vedlegg_id] });
      const foer = await antall();
      const svar = await send(k);
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(400);
      expect(svar.kropp).toMatchObject({ error: 'REGELBRUDD', rule: 'VARSEL_ETTER_PAABEROPELSEN' });
      expect(await antall()).toEqual(foer);
      const { utenSak, iSaken } = await vedleggene(k.ny_sak_id);
      expect(utenSak).toContain(v.vedlegg_id);
      expect(iSaken).toEqual([]);
    });

    it('avviser kjernen påberopelsen, flyttes ikke vedlegget, og det kan brukes i en ny opprettelse (KT-U11)', async () => {
      const v = (await lastOpp()).vedlegg!;
      const k = medVedlegg([v]);
      const foer = await antall();
      const svar = await send({ ...k, brevtekst: ['Annen tekst'] });
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(400);
      expect(svar.kropp.error).toBe('REGELBRUDD');
      expect(await antall()).toEqual(foer);
      expect((await vedleggene(k.ny_sak_id)).utenSak).toContain(v.vedlegg_id);

      const igjen = await send(k);
      expect(igjen.status, JSON.stringify(igjen.kropp)).toBe(201);
      expect((await vedleggene(k.ny_sak_id)).utenSak).not.toContain(v.vedlegg_id);
    });

    it('et vedlegg som ikke er lastet opp uten sak, gir VEDLEGG_FINNES_IKKE, og ingenting skrives (#1037)', async () => {
      const ukjent: Vedlegg = {
        vedlegg_id: randomUUID(),
        filnavn: 'ukjent.pdf',
        innhold_sha256: '0'.repeat(64),
      };
      const foer = await antall();
      const svar = await send(medVedlegg([ukjent]));
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(400);
      expect(svar.kropp).toMatchObject({ error: 'REGELBRUDD', rule: 'VEDLEGG_FINNES_IKKE' });
      expect(await antall()).toEqual(foer);
    });

    it('et dokument i varselet som ikke står ved påberopelsen, gir 400 før noe skrives (svar 2 i #1487, VS-U38)', async () => {
      const v = (await lastOpp()).vedlegg!;
      const annet = (await lastOpp(o.te, 'annet.pdf')).vedlegg!;
      const k = medVedlegg([v], { sendt: iDag(), dokumentasjon: [annet.vedlegg_id] });
      const foer = await antall();
      const svar = await send(k);
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(400);
      expect(String(svar.kropp.message)).toContain('står ikke i paaberopelse.dokumentasjon');
      expect(await antall()).toEqual(foer);
      const { utenSak } = await vedleggene(k.ny_sak_id);
      expect(utenSak).toEqual(expect.arrayContaining([v.vedlegg_id, annet.vedlegg_id]));
    });

    it('BH kan ikke laste opp et vedlegg uten sak (KT-U10)', async () => {
      const svar = await lastOpp(o.bh);
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(403);
    });

    it('BH avvises før kroppen leses: en fil over 15 MiB gir 403 og ikke 413 (KT-U10, #815 punkt 1)', async () => {
      const svar = await lastOpp(o.bh, 'stor.pdf', Buffer.alloc(STOERSTE_VEDLEGG + 1, 0x41));
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(403);
      expect(svar.kropp.error).toBe('FORBIDDEN');
    });

    it('TE sletter et vedlegg uten sak, og en ny sletting gir 404 (#1037)', async () => {
      const v = (await lastOpp()).vedlegg!;
      const slett = () =>
        kall(server.url, `${UTEN_SAK}/${v.vedlegg_id}`, {
          bruker: o.te,
          prosjektId: o.prosjekt.id,
          metode: 'DELETE',
        });
      const svar = await slett();
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
      expect((await vedleggene(randomUUID())).utenSak).not.toContain(v.vedlegg_id);
      const igjen = await slett();
      expect(igjen.status).toBe(404);
      expect(igjen.kropp.error).toBe('VEDLEGG_FINNES_IKKE');
    });

    it('BH sletter ikke et vedlegg uten sak: 403 som for opplastingen, og vedlegget står (KT-U10)', async () => {
      const v = (await lastOpp()).vedlegg!;
      const svar = await kall(server.url, `${UTEN_SAK}/${v.vedlegg_id}`, {
        bruker: o.bh,
        prosjektId: o.prosjekt.id,
        metode: 'DELETE',
      });
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(403);
      expect(svar.kropp.error).toBe('FORBIDDEN');
      expect((await vedleggene(randomUUID())).utenSak).toContain(v.vedlegg_id);
    });
  });
});

describe('vedleggene før saken uten entydig team (#1037)', () => {
  // Uten team finnes det ikke noe utkast å lese eller skrive (AGENTS.md), så slettingen
  // svarer 403 før basen spørres; et datalag som kaster, viser at den ikke spørres. For
  // opplastingen avviser `lesFil` uten team før kroppen leses.
  const slett = VEDLEGG_FOER_SAKEN.find((r) => r.metode === 'DELETE')!;
  const avh = {
    get datalag(): never {
      throw new Error('Basen spørres ikke uten team.');
    },
  } as unknown as Parameters<typeof slett.behandle>[1];

  it('slettingen svarer 403 MANGLER_TEAM', async () => {
    const [status, kropp] = (await slett.behandle(
      {
        bruker: { id: randomUUID() },
        prosjekt: { prosjektId: 'p' },
        side: { rolle: 'TE', teamId: null },
        kropp: {},
        ressurs: randomUUID(),
        fil: null,
      } as unknown as Parameters<typeof slett.behandle>[0],
      avh
    )) as [number, Record<string, unknown>];
    expect(status).toBe(403);
    expect(kropp.error).toBe('MANGLER_TEAM');
  });
});
