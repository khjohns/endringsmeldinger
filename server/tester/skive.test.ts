/**
 * Skiva i #347 mot testbasen: et grunnlagskrav og et vederlagskrav fra TE går
 * over HTTP gjennom tilgangskontrollen og kjernen til journalen og
 * leveringsoppdraget, og tilbake til visningen. Krever `KOE_TESTBASE_URL`. Kjør
 * ikke samtidig med pytest mot samme base.
 *
 * Forventningene har kilde i vedtakene: LV-U1 (oppdraget fryses i samme
 * transaksjon som hendelsen, og et lagret oppdrag er ikke en levering), B-03,
 * dokumentet (ett dokument per brev), B-17 (Python leser oppdraget, ikke
 * journalen) og sikkerhetsinvariantene i AGENTS.md (aktørfeltene, `event_id`
 * og tidsstempelet settes av serveren). Statusen i visningen er kjernens og
 * fastholdes her bare som det serveren gir videre.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lesJournal, SakFinnesIkke, skrivMedOppdrag } from '../lager.ts';
import { kanonisk, sjekksum } from '../levering.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from './testbase.ts';

const GRUNNLAGSKRAV = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Endret fundamentering',
    beskrivelse: 'Byggherren har pålagt en annen fundamentering.',
  },
};
const VEDERLAGSKRAV = {
  type: 'krav',
  spor: 'vederlag',
  innhold: { metode: 'tilbud', beloep: 125000 },
};

interface Oppdragsrad {
  id: string;
  prosjekt_id: string;
  sak_id: string;
  event_id: string;
  dokumentnoekkel: string;
  innhold: Record<string, unknown> & {
    brev: Record<string, unknown> & { dokument: unknown; avsender: Record<string, unknown> };
    maal: Record<string, unknown>;
    status: { kode: string };
  };
  innhold_sha256: string;
}

describe.skipIf(!TESTBASE_URL)(
  'skiva: krav fra skjemaet til journalen og leveringsoppdraget',
  () => {
    let o: Oppsett;
    let server: KjorendeServer;
    const send = (sakId: string, kropp: unknown, bruker = o.te) =>
      kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
        bruker,
        prosjektId: o.prosjekt.id,
        kropp,
      });
    const oppdragene = async (sakId: string) =>
      (
        await o.pool.query<Oppdragsrad>(
          `SELECT o.id::text AS id, o.prosjekt_id, o.sak_id, o.event_id::text AS event_id,
                o.dokumentnoekkel, o.innhold, o.innhold_sha256
           FROM leveringsoppdrag o JOIN hendelse h ON h.event_id = o.event_id
          WHERE o.sak_id = $1 ORDER BY h.versjon`,
          [sakId]
        )
      ).rows;

    beforeAll(async () => {
      o = await lagOppsett();
      server = await startServer(o);
    });
    afterAll(async () => {
      await server?.stopp();
      if (o) await rydd(o);
    });

    it('grunnlagskravet og vederlagskravet blir to brev, hvert med sitt frosne oppdrag', async () => {
      const sakId = await opprettKjernesak(o);

      const grunnlag = await send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV });
      expect(grunnlag.status, JSON.stringify(grunnlag.kropp)).toBe(201);
      expect(grunnlag.kropp.versjon).toBe(2);
      const vederlag = await send(sakId, { expected_version: 2, kommando: VEDERLAGSKRAV });
      expect(vederlag.status, JSON.stringify(vederlag.kropp)).toBe(201);
      expect(vederlag.kropp.versjon).toBe(3);

      // Journalen i basen: kjernens rader, med aktøren fra sesjonen.
      const journal = await lesJournal(o.pool, sakId, o.prosjekt.id);
      expect(journal.map((r) => [r.versjon, r.event_type, r.format])).toEqual([
        [1, 'sak_opprettet', 1],
        [2, 'dokument_registrert', 1],
        [3, 'dokument_registrert', 1],
      ]);
      const [, g, v] = journal;
      expect(g.event_id).toBe(grunnlag.kropp.event_id);
      expect(v.event_id).toBe(vederlag.kropp.event_id);
      for (const rad of [g, v]) {
        expect(rad.aktor_id).toBe(o.te.id);
        expect(rad.aktor_rolle).toBe('TE');
        expect(rad.aktor_team_id).toBe(o.prosjekt.teTeam.replaceAll('-', ''));
      }
      expect((g.data.krav as Record<string, unknown>[])[0]).toMatchObject({
        spor: 'grunnlag',
        ...GRUNNLAGSKRAV.innhold,
      });
      expect((v.data.krav as Record<string, unknown>[])[0]).toMatchObject({
        spor: 'vederlag',
        ...VEDERLAGSKRAV.innhold,
      });

      // B-03: ett oppdrag og ett dokument per brev. LV-U1: det frosne er brevet slik det ble lagret.
      const oppdrag = await oppdragene(sakId);
      expect(oppdrag.map((x) => x.event_id)).toEqual([g.event_id, v.event_id]);
      expect(oppdrag.map((x) => x.id)).toEqual([
        grunnlag.kropp.leveringsoppdrag,
        vederlag.kropp.leveringsoppdrag,
      ]);
      for (const [x, rad] of [
        [oppdrag[0], g],
        [oppdrag[1], v],
      ] as const) {
        expect(x.prosjekt_id).toBe(o.prosjekt.id);
        expect(x.dokumentnoekkel).toBe(rad.event_id);
        expect(x.innhold.brev.dokument).toEqual(rad.data);
        expect(x.innhold.brev).toMatchObject({
          event_id: rad.event_id,
          saksversjon: rad.versjon,
          tidsstempel: rad.tidsstempel,
          brevtekst: null,
        });
        expect(x.innhold.brev.avsender).toEqual({
          part: 'TE',
          aktor_id: o.te.id,
          team_id: rad.aktor_team_id,
        });
        expect(x.innhold.maal).toMatchObject({
          catenda_project_id: o.prosjekt.catendaProsjekt,
        });
        // Summen kan regnes på nytt av det basen gir tilbake.
        expect(x.innhold_sha256).toBe(sjekksum(x.innhold));
      }

      // Tilbake til visningen: det skjemaet leser etter innsendingen.
      const lest = await kall(server.url, `/api/kjerne/saker/${sakId}`, {
        bruker: o.bh,
        prosjektId: o.prosjekt.id,
      });
      expect(lest.status).toBe(200);
      expect(lest.kropp.versjon).toBe(3);
      expect(lest.kropp.visning).toEqual(vederlag.kropp.visning);
      expect(oppdrag[1].innhold.status).toEqual((lest.kropp.visning as { status: unknown }).status);
      expect(
        (lest.kropp.leveringsoppdrag as { event_id: string; innhold_sha256: string }[]).map((x) => [
          x.event_id,
          x.innhold_sha256,
        ])
      ).toEqual(oppdrag.map((x) => [x.event_id, x.innhold_sha256]));
    });

    it('aktøren, event_id og tidsstempelet kan ikke settes av klienten', async () => {
      const sakId = await opprettKjernesak(o);
      for (const [hva, kropp] of [
        ['aktør i kroppen', { expected_version: 1, kommando: GRUNNLAGSKRAV, aktor_id: o.bh.id }],
        [
          'event_id i kroppen',
          { expected_version: 1, kommando: GRUNNLAGSKRAV, event_id: randomUUID() },
        ],
        [
          'aktør i kommandoen',
          { expected_version: 1, kommando: { ...GRUNNLAGSKRAV, aktor_rolle: 'BH' } },
        ],
        [
          'tidsstempel i kommandoen',
          {
            expected_version: 1,
            kommando: { ...GRUNNLAGSKRAV, tidsstempel: '2020-01-01T00:00:00Z' },
          },
        ],
      ] as const) {
        const svar = await send(sakId, kropp);
        expect(svar.status, hva).toBe(400);
      }
      expect(await lesJournal(o.pool, sakId, o.prosjekt.id)).toHaveLength(1);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('tekst basen ikke kan lagre, gir 400 og skriver ingenting', async () => {
      const sakId = await opprettKjernesak(o);
      for (const tittel of ['a\u0000b', '\ud800']) {
        const kommando = { ...GRUNNLAGSKRAV, innhold: { ...GRUNNLAGSKRAV.innhold, tittel } };
        const svar = await send(sakId, { expected_version: 1, kommando });
        expect(svar.status, JSON.stringify(tittel)).toBe(400);
      }
      expect(await lesJournal(o.pool, sakId, o.prosjekt.id)).toHaveLength(1);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('en kommando kjernen avviser, skriver ingenting', async () => {
      const sakId = await opprettKjernesak(o);
      const svar = await send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV }, o.bh);
      expect(svar.status).toBe(400);
      expect(svar.kropp.error).toBe('REGELBRUDD');
      expect(await lesJournal(o.pool, sakId, o.prosjekt.id)).toHaveLength(1);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('en annen versjon enn journalens gir versjonskonflikt og skriver ingenting', async () => {
      const sakId = await opprettKjernesak(o);
      for (const forventet of [0, 2]) {
        const svar = await send(sakId, { expected_version: forventet, kommando: GRUNNLAGSKRAV });
        expect(svar.status).toBe(409);
        expect(svar.kropp).toMatchObject({ error: 'VERSJONSKONFLIKT', current_version: 1 });
      }
      expect(await lesJournal(o.pool, sakId, o.prosjekt.id)).toHaveLength(1);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('to samtidige kommandoer på samme versjon gir ett brev og ett oppdrag', async () => {
      const sakId = await opprettKjernesak(o);
      const svar = await Promise.all([
        send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV }),
        send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV }),
      ]);
      expect(svar.map((s) => s.status).sort()).toEqual([201, 409]);
      expect(await lesJournal(o.pool, sakId, o.prosjekt.id)).toHaveLength(2);
      expect(await oppdragene(sakId)).toHaveLength(1);
    });

    it.each([
      ['en krok som kaster', async () => Promise.reject(new Error('avbrutt før COMMIT'))],
      [
        'en avbrutt forbindelse',
        async (klient: import('pg').ClientBase) =>
          void (await klient.query('SELECT pg_terminate_backend(pg_backend_pid())')),
      ],
    ] as const)('hendelsen og oppdraget lagres samlet eller ikke: %s', async (_hva, foerCommit) => {
      const sakId = await opprettKjernesak(o);
      const foer = await lesJournal(o.pool, sakId, o.prosjekt.id);
      const eventId = randomUUID();
      await expect(
        skrivMedOppdrag(
          o.pool,
          o.prosjekt.id,
          sakId,
          1,
          () => ({
            skriv: true,
            rad: { ...foer[0], event_id: eventId, versjon: 2, event_type: 'dokument_registrert' },
            oppdrag: {
              id: randomUUID(),
              event_id: eventId,
              dokumentnoekkel: eventId,
              innhold: {},
              innhold_sha256: sjekksum({}),
            },
          }),
          { foerCommit }
        )
      ).rejects.toThrow();
      expect(await lesJournal(o.pool, sakId, o.prosjekt.id)).toEqual(foer);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('lageret skriver ikke i en sak utenfor prosjektet, selv om kalleren ber om det', async () => {
      const annenSak = await opprettKjernesak(o, o.annetProsjekt);
      await expect(
        skrivMedOppdrag(o.pool, o.prosjekt.id, annenSak, 1, () => {
          throw new Error('Forutsetning: lageret skal avvise før raden lages');
        })
      ).rejects.toBeInstanceOf(SakFinnesIkke);
    });

    it('oppdraget kan ikke endres, og ikke føres til et annet prosjekt enn brevet', async () => {
      const sakId = await opprettKjernesak(o);
      const svar = await send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV });
      expect(svar.status).toBe(201);
      await expect(
        o.pool.query("UPDATE leveringsoppdrag SET innhold = '{}' WHERE sak_id = $1", [sakId])
      ).rejects.toThrow(/uforanderlig/);

      const annenSak = await opprettKjernesak(o, o.annetProsjekt);
      await expect(
        o.pool.query(
          `INSERT INTO leveringsoppdrag (id, prosjekt_id, sak_id, event_id, dokumentnoekkel, innhold, innhold_sha256)
         VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, $6)`,
          [
            randomUUID(),
            o.annetProsjekt.id,
            annenSak,
            svar.kropp.event_id,
            randomUUID(),
            sjekksum({}),
          ]
        )
      ).rejects.toThrow(/sak og prosjekt/);
    });

    it('sjekksummen er uavhengig av rekkefølgen på nøklene', () => {
      expect(kanonisk({ b: 1, a: [{ d: null, c: 'x' }] })).toBe('{"a":[{"c":"x","d":null}],"b":1}');
      expect(sjekksum({ a: 1, b: 2 })).toBe(sjekksum({ b: 2, a: 1 }));
    });
  }
);
