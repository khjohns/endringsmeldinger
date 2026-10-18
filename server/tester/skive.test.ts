/**
 * Skiva i #347 mot testbasen: et grunnlagskrav og et vederlagskrav fra TE går
 * over HTTP gjennom tilgangskontrollen og kjernen til journalen og
 * leveringsoppdraget i SQL Server, og tilbake til visningen. Krever
 * `KOE_SQLSERVER_TILKOBLING`. Lagringsgarantiene for brevet og oppdraget (én
 * transaksjon, uforanderlige rader, prosjektgrensen) prøves mot basen i
 * `journal.test.ts`, `kommandoer.test.ts` og `tilgang.test.ts`.
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
import { lesSaken } from '../lager.ts';
import { gjengirTro } from '../../kjerne/frosset/brevtekst.ts';
import { forhaandsvis, laastTekst } from '../../kjerne/kommandoer/skriving.ts';
import type { Avsnitt } from '../../kjerne/typer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { gjengiOppdrag, kanonisk, OPPDRAGSFORMAT, sjekksum } from '../levering.ts';
import { sql } from './sqlserver.ts';
import { iTransaksjon } from './sqlserver_migrert.ts';
import {
  catendaFra,
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  somJobbkjoerer,
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
    paalegg_mottatt: '2026-10-01',
  },
  // GR-U15: TEs varsel etter § 32.2 beskriver pålegget.
  utdypning: 'Byggherren har pålagt en annen fundamentering.',
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
    /** Prosjektet i konteksten for lesingen under radsikkerheten. */
    const leser = () => ({ aktor: o.te.id, prosjekt: o.prosjekt.id });
    const journalen = async (sakId: string) =>
      (await lesSaken(o.datalag.kjoeretid.pool, leser(), sakId)).journal;
    /**
     * Kommandoen med den låste teksten klienten viste (A1 i paragrafmatrisen, LV-U2),
     * laget av kjernen mot journalen i basen slik nettleseren gjør (B-15).
     */
    const send = async (sakId: string, kropp: unknown, bruker = o.te) => {
      const k = (kropp as { kommando?: unknown }).kommando;
      if (k && typeof k === 'object' && !('brevtekst' in k)) {
        const journal = await journalen(sakId);
        const vist = forhaandsvis(
          k,
          {
            sakId,
            aktoerId: bruker.id,
            part: bruker === o.bh ? 'BH' : 'TE',
            teamId: null,
            tidspunkt: () => new Date(),
            nyId: randomUUID,
          },
          journal,
          KJERNE
        );
        const tekst = vist.godtatt ? laastTekst(vist.hendelser[0]) : null;
        if (tekst) kropp = { ...(kropp as object), kommando: { ...k, brevtekst: tekst } };
      }
      return kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
        bruker,
        prosjektId: o.prosjekt.id,
        kropp,
      });
    };
    const oppdragene = async (sakId: string): Promise<Oppdragsrad[]> => {
      const svar = await iTransaksjon(
        o.datalag.base.pool,
        { ...leser(), side: 'TE', team: null },
        (r) =>
          r()
            .input('sak_id', sql.NVarChar(36), sakId)
            .query<Oppdragsrad & { innhold: string }>(
              `SELECT LOWER(CONVERT(nvarchar(36), o.id)) AS id, o.prosjekt_id, o.sak_id, o.event_id,
                    o.dokumentnoekkel, o.innhold, o.innhold_sha256
               FROM koe.leveringsoppdrag o JOIN koe.hendelse h ON h.event_id = o.event_id
              WHERE o.sak_id = @sak_id ORDER BY h.versjon`
            )
      );
      return svar.recordset.map((x) => ({ ...x, innhold: JSON.parse(x.innhold) }));
    };
    /** Sakens topic i Catenda, lagt inn av eieren som kjøreveien, `koe_jobbkjoerer` (#741). */
    const settTopic = (sakId: string, board: string, topic: string) =>
      somJobbkjoerer(
        o,
        `INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id)
         VALUES (@sak_id, @prosjekt_id, @board, @topic)`,
        { sak_id: sakId, prosjekt_id: o.prosjekt.id, board, topic }
      );

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
      const journal = await journalen(sakId);
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
        });
        expect(x.innhold.oppdragsformat).toBe(OPPDRAGSFORMAT);
        // LV-U2: teksten i oppdraget er den kjernen frøs i brevet, og hvert utsagn står i den (LV-U3).
        expect(x.innhold.brev.brevtekst).toEqual(rad.data.brevtekst);
        expect((x.innhold.brev.brevtekst as Avsnitt[]).map((a) => a.gjelder)).toEqual(
          (rad.data.krav as { id: string }[]).map((k) => k.id)
        );
        expect(x.innhold.brev.avsender).toEqual({
          part: 'TE',
          aktor_id: o.te.id,
          team_id: rad.aktor_team_id,
        });
        expect(x.innhold.maal).toMatchObject({
          catenda_project_id: o.prosjekt.catendaProsjekt,
          library_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          folder_id: null,
          board_id: null,
          topic_id: null,
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

    it('oppdraget kan gjengis uten journalen, og gjengivelsen er tro mot teksten (LV-U1, LV-U2, B-17)', async () => {
      const sakId = await opprettKjernesak(o);
      expect((await send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV })).status).toBe(
        201
      );
      expect((await send(sakId, { expected_version: 2, kommando: VEDERLAGSKRAV })).status).toBe(
        201
      );
      // Bare oppdragene, slik basen gir dem tilbake; journalen leses ikke.
      const innhold = (await oppdragene(sakId)).map((x) => structuredClone(x.innhold));
      const [g, v] = innhold.map((i) => gjengiOppdrag(i)!);
      const tekst = (i: (typeof innhold)[number]) => i.brev.brevtekst as Avsnitt[];
      expect(gjengirTro(g, tekst(innhold[0]))).toBe(true);
      expect(gjengirTro(v, tekst(innhold[1]))).toBe(true);
      expect(g).toContain(`Sak ${sakId}, brev 2`);
      expect(g).toContain('«Endret fundamentering»');
      expect(g).toContain(GRUNNLAGSKRAV.utdypning);
      expect(v).toContain('125\u00a0000\u00a0kr');
      // Kontrollsak: gjengivelsen av et annet brev er ikke tro mot dette.
      expect(gjengirTro(v, tekst(innhold[0]))).toBe(false);
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
      expect(await journalen(sakId)).toHaveLength(1);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('tekst basen ikke kan lagre, gir 400 og skriver ingenting', async () => {
      const sakId = await opprettKjernesak(o);
      for (const [hva, innhold] of [
        ['NUL', { ...GRUNNLAGSKRAV.innhold, tittel: 'a\u0000b' }],
        ['enslig surrogat', { ...GRUNNLAGSKRAV.innhold, tittel: '\ud800' }],
        ['NUL i en nøkkel', { ...GRUNNLAGSKRAV.innhold, 'a\u0000': 'b' }],
      ] as const) {
        const kommando = { ...GRUNNLAGSKRAV, innhold };
        const svar = await send(sakId, { expected_version: 1, kommando });
        expect(svar.status, hva).toBe(400);
        expect(svar.kropp).toMatchObject({
          error: 'UGYLDIG_FORESPOERSEL',
          message: 'Teksten har tegn som ikke kan lagres.',
        });
      }
      expect(await journalen(sakId)).toHaveLength(1);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('en dypt nestet kropp gir 401 uten sesjon og 400 med, ikke 500', async () => {
      const sakId = await opprettKjernesak(o);
      const dybde = 200_000;
      const kropp = `{"expected_version":1,"kommando":${'['.repeat(dybde)}${']'.repeat(dybde)}}`;
      const sti = `${server.url}/api/kjerne/saker/${sakId}/kommandoer`;
      const hoder = (med: boolean): Record<string, string> => ({
        'X-Project-ID': o.prosjekt.id,
        'Content-Type': 'application/json',
        ...(med ? { Cookie: `__Host-koe_session=${o.te.token}`, 'X-CSRF-Token': o.te.csrf } : {}),
      });
      const uten = await fetch(sti, { method: 'POST', headers: hoder(false), body: kropp });
      expect(uten.status).toBe(401);
      const med = await fetch(sti, { method: 'POST', headers: hoder(true), body: kropp });
      expect(med.status).toBe(400);
      expect((await med.json()).message).toBe('Kroppen er for dypt nestet.');
      expect(await journalen(sakId)).toHaveLength(1);
    });

    it('en kommando kjernen avviser, skriver ingenting', async () => {
      const sakId = await opprettKjernesak(o);
      const svar = await send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV }, o.bh);
      expect(svar.status).toBe(400);
      expect(svar.kropp.error).toBe('REGELBRUDD');
      expect(await journalen(sakId)).toHaveLength(1);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('en annen versjon enn journalens gir versjonskonflikt og skriver ingenting', async () => {
      const sakId = await opprettKjernesak(o);
      for (const forventet of [0, 2]) {
        const svar = await send(sakId, { expected_version: forventet, kommando: GRUNNLAGSKRAV });
        expect(svar.status).toBe(409);
        expect(svar.kropp).toMatchObject({ error: 'VERSJONSKONFLIKT', current_version: 1 });
      }
      expect(await journalen(sakId)).toHaveLength(1);
      expect(await oppdragene(sakId)).toEqual([]);
    });

    it('to samtidige kommandoer på samme versjon gir ett brev og ett oppdrag', async () => {
      const sakId = await opprettKjernesak(o);
      const svar = await Promise.all([
        send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV }),
        send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV }),
      ]);
      expect(svar.map((s) => s.status).sort()).toEqual([201, 409]);
      expect(await journalen(sakId)).toHaveLength(2);
      expect(await oppdragene(sakId)).toHaveLength(1);
    });

    it('en sak TS-kjernen ikke har skrevet, finnes ikke for lesingen eller en kommando (#705, #716 punkt 1)', async () => {
      const sakId = await opprettKjernesak(o, o.prosjekt, null);
      const lest = await kall(server.url, `/api/kjerne/saker/${sakId}`, {
        bruker: o.te,
        prosjektId: o.prosjekt.id,
      });
      expect(lest.status).toBe(404);
      const svar = await send(sakId, {
        expected_version: 1,
        kommando: { ...GRUNNLAGSKRAV, brevtekst: [] },
      });
      expect(svar.status).toBe(404);
      expect(svar.kropp.error).toBe('SAK_FINNES_IKKE');
      // Kontrollsak: samme kommando i en sak kjernen har skrevet, går gjennom.
      const kjernesak = await opprettKjernesak(o);
      expect((await send(kjernesak, { expected_version: 1, kommando: GRUNNLAGSKRAV })).status).toBe(
        201
      );
    });

    it('sakens topic i Catenda fryses i oppdraget når saken har en (LV-U1)', async () => {
      const sakId = await opprettKjernesak(o);
      const [board, topic] = [randomUUID(), randomUUID()];
      await settTopic(sakId, board, topic);
      expect((await send(sakId, { expected_version: 1, kommando: GRUNNLAGSKRAV })).status).toBe(
        201
      );
      const [x] = await oppdragene(sakId);
      expect(x.innhold.maal).toMatchObject({ board_id: board, topic_id: topic });
      // Kontrollsak: en sak uten topic fryser topic lik null, som i PG-stien.
      const utenTopic = await opprettKjernesak(o);
      expect((await send(utenTopic, { expected_version: 1, kommando: GRUNNLAGSKRAV })).status).toBe(
        201
      );
      expect((await oppdragene(utenTopic))[0].innhold.maal).toMatchObject({
        board_id: null,
        topic_id: null,
      });
    });

    it('sjekksummen er uavhengig av rekkefølgen på nøklene', () => {
      expect(kanonisk({ b: 1, a: [{ d: null, c: 'x' }] })).toBe('{"a":[{"c":"x","d":null}],"b":1}');
      expect(sjekksum({ a: 1, b: 2 })).toBe(sjekksum({ b: 2, a: 1 }));
    });
  }
);

describe.skipIf(!TESTBASE_URL)('koblingen slås av under skrivingen (#739 punkt 1)', () => {
  let o: Oppsett;
  beforeAll(async () => {
    o = await lagOppsett();
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  /**
   * Serveren der eieren slår av koblingen når kontraktsrollen spør Catenda, etter
   * prosjekttilgangen. DL-U10 gjør medlemskapene inaktive i samme transaksjon, og eieren
   * setter dem aktive igjen: slik ser en skrivetransaksjon basen når koblingen slås av
   * etter at den har lest saken og før den leser leveringsmålet.
   */
  async function kommandoMedKobling(aktiv: boolean, sakId: string) {
    const catenda = catendaFra(o.teammedlemmer);
    const server = await startServer(o, {
      catenda: {
        ...catenda,
        async teammedlemmer(prosjekt, team) {
          await o.datalag.base.pool
            .request()
            .input('p', sql.NVarChar(100), o.prosjekt.id)
            .input('a', sql.Bit, aktiv).query(`
              UPDATE koe.catenda_project_configs SET is_active = @a WHERE internal_project_id = @p;
              UPDATE koe.app_project_memberships SET active = 1, deactivated_at = NULL
               WHERE project_id = @p;`);
          return catenda.teammedlemmer(prosjekt, team);
        },
      },
    });
    try {
      return await kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
        bruker: o.te,
        prosjektId: o.prosjekt.id,
        // Brevteksten er ikke den kjernen lager, så kommandoen avvises om den når kjernen.
        kropp: { expected_version: 1, kommando: { ...GRUNNLAGSKRAV, brevtekst: [] } },
      });
    } finally {
      await server.stopp();
    }
  }

  it('uten leveringsmål gir kommandoen 403 før kjernen, og ingenting skrives', async () => {
    const sakId = await opprettKjernesak(o);
    // Kontrollsak: med koblingen på når kommandoen kjernen, som avviser den.
    const kontroll = await kommandoMedKobling(true, sakId);
    expect(kontroll.status).toBe(400);
    const svar = await kommandoMedKobling(false, sakId);
    expect(svar.status).toBe(403);
    expect(svar.kropp.error).toBe('FORBIDDEN');
    const lest = await lesSaken(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id },
      sakId
    );
    expect(lest.journal).toHaveLength(1);
    expect(lest.oppdrag).toEqual([]);
  });
});
