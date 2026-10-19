/**
 * Lesingen av vedleggene i `skrivHendelse` (#827 punkt 2 og 4) mot en base bygget fra
 * migrasjonene. Forventningene har kilde i #827:
 * - punkt 2: et vedlegg som slettes i en transaksjon som ennå ikke er ferdig, finnes
 *   ikke for kjernen når slettingen blir stående, så kommandoen avvises med
 *   `VEDLEGG_FINNES_IKKE`, som når vedlegget aldri fantes;
 * - punkt 4: med `vedlegg` leses bare de oppgitte vedleggene, og ingen når lista er tom;
 *   uten leses alle kommandoen kan binde.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { sql } from '../datalag.ts';
import { forhaandsvis, laastTekst } from '../../kjerne/kommandoer/skriving.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { skrivHendelse } from '../kommandoer.ts';
import { lesSaken } from '../lager.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';
import { iTransaksjon } from './sqlserver_migrert.ts';

const PDF = Buffer.from('%PDF-1.7\nInnhold\n');

const GRUNNLAGSKRAV = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Endret fundamentering',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: 'Byggherren har pålagt en annen fundamentering.',
};

const varsel = (dokumentasjon: string[]) => ({
  type: 'varsel',
  spor: 'frist',
  hjemmel: '33.4',
  sendt: '2026-10-01',
  dokumentasjon,
});

describe.skipIf(!TESTBASE_URL)('lesingen av vedleggene i skrivingen', () => {
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

  const teKontekst = () => ({
    aktor: o.te.id,
    prosjekt: o.prosjekt.id,
    side: 'TE' as const,
    team: catendaId(o.prosjekt.teTeam)!,
  });

  const journal = async (sakId: string) =>
    (await lesSaken(o.datalag.kjoeretid.pool, { aktor: o.te.id, prosjekt: o.prosjekt.id }, sakId))
      .journal;

  async function lastOpp(bruker: Testbruker, sakId: string, filnavn: string): Promise<string> {
    const svar = await fetch(`${server.url}/api/kjerne/saker/${sakId}/vedlegg`, {
      method: 'POST',
      headers: {
        Cookie: `__Host-koe_session=${bruker.token}`,
        'X-CSRF-Token': bruker.csrf,
        'X-Project-ID': o.prosjekt.id,
        'Content-Type': 'application/octet-stream',
        'X-Filnavn': encodeURIComponent(filnavn),
      },
      body: new Uint8Array(PDF),
    });
    if (svar.status !== 201) throw new Error(`Opplastingen ble avvist: ${svar.status}`);
    return ((await svar.json()) as { vedlegg: { vedlegg_id: string } }).vedlegg.vedlegg_id;
  }

  const send = (sakId: string, versjon: number, kommando: unknown) =>
    kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: { expected_version: versjon, kommando_id: randomUUID(), kommando },
    });

  /** Saken med TEs grunnlagskrav, så et varsel kan registreres (versjon 2). */
  async function sakMedGrunnlag(): Promise<string> {
    const sakId = await opprettKjernesak(o);
    const vist = forhaandsvis(
      GRUNNLAGSKRAV,
      {
        sakId,
        aktoerId: o.te.id,
        part: 'TE',
        teamId: null,
        tidspunkt: () => new Date(),
        nyId: randomUUID,
      },
      await journal(sakId),
      KJERNE
    );
    if (!vist.godtatt) throw new Error('Kravet ble ikke godtatt i forhåndsvisningen');
    const svar = await send(sakId, 1, {
      ...GRUNNLAGSKRAV,
      brevtekst: laastTekst(vist.hendelser[0]),
    });
    if (svar.status !== 201) throw new Error(`Kravet ble avvist: ${svar.status}`);
    return sakId;
  }

  it('et vedlegg som slettes i en åpen transaksjon mens varselet skrives, avvises med VEDLEGG_FINNES_IKKE når slettingen blir stående, og ingenting skrives (#827 punkt 2)', async () => {
    const sakId = await sakMedGrunnlag();
    const id = await lastOpp(o.te, sakId, 'varsel.pdf');
    let svar: ReturnType<typeof send> | undefined;
    await iTransaksjon(o.datalag.kjoeretid.pool, teKontekst(), async (r) => {
      const slettet = await r()
        .input('vedlegg_id', sql.UniqueIdentifier, id)
        .input('sak_id', sql.NVarChar(36), sakId)
        .query<{
          slettet: number;
        }>('EXEC koe_api.slett_vedlegg @vedlegg_id = @vedlegg_id, @sak_id = @sak_id');
      expect(slettet.recordset[0].slettet, 'forutsetning: slettingen fant vedlegget').toBe(1);
      const { spid } = (await r().query<{ spid: number }>('SELECT @@SPID AS spid')).recordset[0];
      svar = send(sakId, 2, varsel([id]));
      for (let forsoek = 0; ; forsoek++) {
        const venter = await o.datalag.base.pool
          .request()
          .input('spid', spid)
          .query<{ antall: number }>(
            `SELECT COUNT(*) AS antall FROM sys.dm_exec_requests
              WHERE blocking_session_id = @spid AND wait_type LIKE 'LCK%'`
          );
        if (venter.recordset[0].antall > 0) break;
        if (forsoek === 100) throw new Error('Skrivingen ventet aldri på slettingen');
        await new Promise((ferdig) => setTimeout(ferdig, 50));
      }
    });
    const utfall = await svar!;
    expect(utfall.status, JSON.stringify(utfall.kropp)).toBe(400);
    expect(utfall.kropp.rule).toBe('VEDLEGG_FINNES_IKKE');
    expect((await journal(sakId)).length).toBe(2);
  });

  describe('vedleggene skrivingen leser (#827 punkt 4)', () => {
    let sakId: string;
    let foerste: string;
    let andre: string;

    beforeAll(async () => {
      sakId = await opprettKjernesak(o);
      foerste = await lastOpp(o.te, sakId, 'foerste.pdf');
      andre = await lastOpp(o.te, sakId, 'andre.pdf');
    });

    /** ID-ene i oppslaget `lag` fikk. Kjernen avviser ikke; `lag` avbryter uten å skrive. */
    async function lest(valg?: { vedlegg?: readonly string[] }): Promise<string[]> {
      let ider: string[] = [];
      const utfall = await skrivHendelse(
        o.datalag.kjoeretid.pool,
        teKontekst(),
        sakId,
        1,
        { id: randomUUID(), sha256: 'a'.repeat(64) },
        ({ vedlegg }) => {
          ider = [...vedlegg.keys()].sort();
          return { skriv: false, avvisning: null };
        },
        valg
      );
      expect(utfall.skriv).toBe(false);
      return ider;
    }

    it('uten valget leses alle vedleggene kommandoen kan binde (kontrollsak)', async () => {
      expect(await lest()).toEqual([foerste, andre].sort());
    });

    it('med en tom liste leses ingen vedlegg, selv om saken har ubundne vedlegg', async () => {
      expect(await lest({ vedlegg: [] })).toEqual([]);
    });

    it('med én ID leses bare det vedlegget', async () => {
      expect(await lest({ vedlegg: [foerste] })).toEqual([foerste]);
    });
  });
});
