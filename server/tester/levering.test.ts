/**
 * Leveringen av brevet til Catenda mot testbasen i SQL Server (L-1b, #371 del 1).
 * Forventningene har kilde i LV-U1, B-03, invariant 6 og 7 i hovedplanen (2.3) og
 * arbeidsvalgene 18.10 i #371: brevet er levert når dokumentet ligger i biblioteket og
 * referansen står på topicen, og etter et tapt svar avstemmes det mot navnet.
 * Akseptkriteriene står i PR-en, med nummeret (L) i testnavnet.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { forhaandsvis, laastTekst } from '../../kjerne/kommandoer/skriving.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import {
  CatendaAvvisning,
  CatendaUtilgjengelig,
  UsikkertCatendautfall,
  type Brevdokument,
  type Dokumentleverandoer,
  type Dokumentmaal,
} from '../catenda.ts';
import type { Pool } from '../datalag.ts';
import { kjoerEnJobb, LEASETID_S } from '../jobber.ts';
import { lesSaken } from '../lager.ts';
import { gjengirTro } from '../../kjerne/frosset/brevtekst.ts';
import type { Avsnitt } from '../../kjerne/typer.ts';
import { lesBrevPdf } from '../brevpdf.ts';
import { pdfsum } from '../levering.ts';
import { sql } from './sqlserver.ts';
import { avvisning } from './sqlserver_migrert.ts';
import {
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
  utdypning: 'Byggherren har pålagt en annen fundamentering.',
};

const LEASE_UGYLDIG = 54001;
const UFORANDERLIG = 51001;
const INGEN_RETT = 229;
const FREMMEDNOEKKEL = 547;
const BRUTT_SJEKK = 547;

interface Kvittering {
  operasjon: string;
  catenda_id: string;
  forsoek_id: string;
}

/** Catenda i minnet: biblioteket som navn → dokument, og referansene per topic. */
class FalskCatenda implements Dokumentleverandoer {
  bibliotek = new Map<string, { id: string; innhold: Uint8Array; maal: Dokumentmaal }>();
  referanser = new Map<string, { id: string; dokumentId: string }[]>();
  opplastinger = 0;
  nyeReferanser = 0;
  /** Kalles før hver operasjon; kaster den, gjør operasjonen ingenting. */
  foer: Partial<Record<keyof Dokumentleverandoer, () => void>> = {};
  /** Kalles etter at endringen er gjort; kaster den, er svaret tapt. */
  etter: Partial<Record<keyof Dokumentleverandoer, () => void>> = {};

  async finnDokument(_maal: Dokumentmaal, navn: string) {
    this.foer.finnDokument?.();
    return this.bibliotek.get(navn)?.id ?? null;
  }
  async lastOppDokument(maal: Dokumentmaal, dokument: Brevdokument) {
    this.foer.lastOppDokument?.();
    if (this.bibliotek.has(dokument.navn)) return null;
    this.opplastinger++;
    const id = randomUUID().replaceAll('-', '');
    this.bibliotek.set(dokument.navn, {
      id,
      innhold: dokument.innhold,
      maal,
    });
    this.etter.lastOppDokument?.();
    return id;
  }
  async dokumentreferanser(_board: string, topic: string) {
    this.foer.dokumentreferanser?.();
    return this.referanser.get(topic) ?? [];
  }
  async opprettDokumentreferanse(_board: string, topic: string, dokumentId: string) {
    this.foer.opprettDokumentreferanse?.();
    this.nyeReferanser++;
    const id = randomUUID();
    this.referanser.set(topic, [...(this.referanser.get(topic) ?? []), { id, dokumentId }]);
    this.etter.opprettDokumentreferanse?.();
    return id;
  }
}

describe.skipIf(!TESTBASE_URL)('leveringen av brevet til Catenda (#371)', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  let catenda: FalskCatenda;
  const logg = { info() {}, warn() {}, error() {} };

  const somKjoerer = <T>(setning: string, parametre: Record<string, unknown> = {}) =>
    somJobbkjoerer<T>(o, setning, parametre);
  const kjoer = () =>
    kjoerEnJobb({
      datalag: o.datalag.kjoeretid.pool,
      catenda: { opprettTopic: async () => `topic-${randomUUID()}` },
      dokumenter: catenda,
      saksadresse: () => 'x',
      logg,
    });
  const leveringen = async (sakId: string) =>
    (
      await somKjoerer<{
        jobb_id: string;
        tilstand: string;
        catenda_project_id: string;
        oppdrag: string;
      }>(
        `SELECT LOWER(CONVERT(nvarchar(36), j.jobb_id)) AS jobb_id, j.tilstand,
                LOWER(CONVERT(nvarchar(36), j.catenda_project_id)) AS catenda_project_id,
                LOWER(CONVERT(nvarchar(36), o.id)) AS oppdrag
           FROM koe.jobb j JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
          WHERE j.sak_id = @sak AND j.jobbtype = N'levering'`,
        { sak: sakId }
      )
    ).recordset;
  const forsoekene = async (sakId: string) =>
    (
      await somKjoerer<{ utfall: string; melding: string | null }>(
        `SELECT f.utfall, f.melding FROM koe.jobbforsoek f JOIN koe.jobb j ON j.jobb_id = f.jobb_id
          WHERE j.sak_id = @sak AND j.jobbtype = N'levering' ORDER BY f.avsluttet, f.utfall`,
        { sak: sakId }
      )
    ).recordset.map((f) => [f.utfall, f.melding]);
  const kvitteringene = async (sakId: string) =>
    (
      await somKjoerer<Kvittering>(
        `SELECT k.operasjon, k.catenda_id, LOWER(CONVERT(nvarchar(36), k.forsoek_id)) AS forsoek_id
           FROM koe.leveringskvittering k JOIN koe.leveringsoppdrag o ON o.id = k.leveringsoppdrag_id
          WHERE o.sak_id = @sak ORDER BY k.operasjon`,
        { sak: sakId }
      )
    ).recordset;
  const brevdokumentene = async (sakId: string) =>
    (
      await somKjoerer<{ pdf_sha256: string; pdf: Buffer }>(
        `SELECT d.pdf_sha256, d.pdf FROM koe.brevdokument d
           JOIN koe.leveringsoppdrag o ON o.id = d.leveringsoppdrag_id WHERE o.sak_id = @sak`,
        { sak: sakId }
      )
    ).recordset.map((d) => ({ pdf_sha256: d.pdf_sha256, pdf: new Uint8Array(d.pdf) }));
  const hentLease = async () =>
    (
      await o.datalag.kjoeretid.pool
        .request()
        .input('leasetid_sekunder', sql.Int, LEASETID_S)
        .execute<{ lease: string }>('koe_api.hent_jobb')
    ).recordset[0].lease;
  const lagre = (lease: string, pdf: Uint8Array, sum = pdfsum(pdf)) =>
    o.datalag.kjoeretid.pool
      .request()
      .input('lease', sql.UniqueIdentifier, lease)
      .input('pdf', sql.VarBinary(sql.MAX), Buffer.from(pdf))
      .input('pdf_sha256', sql.NVarChar(64), sum)
      .execute<{ pdf: Buffer }>('koe_api.lagre_brevdokument');
  const startPaaNytt = async (sakId: string) => {
    const [{ jobb_id }] = await leveringen(sakId);
    await o.datalag.base.pool
      .request()
      .input('jobb_id', sql.UniqueIdentifier, jobb_id)
      .execute('koe_api.start_jobb_paa_nytt');
  };

  /** Brevet med kravet om grunnlag, med den låste teksten klienten viste (LV-U2). */
  async function sendBrev(sakId: string) {
    const { journal } = await lesSaken(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id },
      sakId
    );
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
      journal,
      KJERNE
    );
    if (!vist.godtatt) throw new Error('Kravet ble ikke godtatt i forhåndsvisningen');
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: {
        expected_version: 1,
        kommando_id: randomUUID(),
        kommando: { ...GRUNNLAGSKRAV, brevtekst: laastTekst(vist.hendelser[0]) },
      },
    });
    if (svar.status !== 201 && svar.status !== 200)
      throw new Error(`Brevet ble avvist: ${svar.status}`);
  }

  /** Saken med topicen kvittert og brevet sendt, med leveringsjobben klar. */
  async function sakMedBrev(): Promise<string> {
    const sakId = await opprettKjernesak(o);
    expect(await kjoer()).toBe(true);
    await sendBrev(sakId);
    return sakId;
  }

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });
  beforeEach(async () => {
    catenda = new FalskCatenda();
    await somKjoerer(
      `UPDATE koe.jobb SET tilstand = N'parkert', lease = NULL, lease_startet = NULL, lease_utloeper = NULL
        WHERE tilstand = N'venter'`
    );
  });

  it('L1: brevet får leveringsjobben i samme transaksjon som oppdraget, med Catenda-prosjektet fra målet (LV-U1)', async () => {
    const sakId = await opprettKjernesak(o);
    await sendBrev(sakId);
    const jobber = await leveringen(sakId);
    expect(jobber).toEqual([
      expect.objectContaining({
        tilstand: 'venter',
        catenda_project_id: o.prosjekt.catendaProsjekt,
      }),
    ]);
  });

  it('L1: leveringen hentes ikke før saken har topic, og den teller ikke som forsøk', async () => {
    const sakId = await opprettKjernesak(o);
    // Topicjobben parkeres, så saken står uten topic.
    await somKjoerer(`UPDATE koe.jobb SET tilstand = N'parkert' WHERE sak_id = @sak`, {
      sak: sakId,
    });
    await sendBrev(sakId);
    expect(await kjoer()).toBe(false);
    expect(await forsoekene(sakId)).toEqual([]);
    expect(catenda.opplastinger).toBe(0);
  });

  it('L2: kjøreren laster opp brevet med dokumentnøkkelen i navnet, setter referansen og kvitterer hver operasjon (B-03)', async () => {
    const sakId = await sakMedBrev();
    const leser = { aktor: o.te.id, prosjekt: o.prosjekt.id };
    expect((await lesSaken(o.datalag.kjoeretid.pool, leser, sakId)).oppdrag[0].levert).toBeNull();
    expect(await kjoer()).toBe(true);

    const [[navn, dokument]] = [...catenda.bibliotek];
    const { journal, oppdrag: oppdragene } = await lesSaken(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id },
      sakId
    );
    const brev = journal.at(-1)!;
    const oppdrag = oppdragene.find((x) => x.event_id === brev.event_id)!;
    expect(navn).toBe(`brev-${sakId}-2-${brev.event_id}.pdf`);
    const { brevtekst } = oppdrag.innhold.brev as { brevtekst: Avsnitt[] };
    expect(gjengirTro(lesBrevPdf(dokument.innhold), brevtekst)).toBe(true);
    expect(lesBrevPdf(dokument.innhold)).toContain(`Sak ${sakId}, brev 2`);
    expect(await brevdokumentene(sakId)).toEqual([
      { pdf_sha256: pdfsum(dokument.innhold), pdf: dokument.innhold },
    ]);
    expect(dokument.maal).toMatchObject({ catenda_project_id: o.prosjekt.catendaProsjekt });

    const [referanse] = [...catenda.referanser.values()].flat();
    expect(referanse.dokumentId).toBe(dokument.id);
    expect(await kvitteringene(sakId)).toEqual([
      expect.objectContaining({ operasjon: 'dokument', catenda_id: dokument.id }),
      expect.objectContaining({ operasjon: 'dokumentreferanse', catenda_id: referanse.id }),
    ]);
    expect(await forsoekene(sakId)).toEqual([['utfoert', null]]);
    expect((await leveringen(sakId))[0].tilstand).toBe('utfoert');
    expect(await kjoer()).toBe(false);

    // Kilde: oppdragsgiver 18.10 (#764): «levert» er tidspunktet i kvitteringen for
    // dokumentreferansen, og leses av medlemmet under radsikkerheten.
    const [{ kvittert }] = (
      await somKjoerer<{ kvittert: Date }>(
        `SELECT k.kvittert FROM koe.leveringskvittering k
           JOIN koe.leveringsoppdrag o ON o.id = k.leveringsoppdrag_id
          WHERE o.sak_id = @sak AND k.operasjon = N'dokumentreferanse'`,
        { sak: sakId }
      )
    ).recordset;
    expect(oppdrag.levert).toBe(kvittert.toISOString());
  });

  it('L3: et tapt svar ved opplastingen parkeres, og forsøket etter omstarten finner dokumentet på navnet (invariant 7, B-03)', async () => {
    const sakId = await sakMedBrev();
    catenda.etter.lastOppDokument = () => {
      throw new UsikkertCatendautfall('Catenda svarte ikke');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');
    expect(await kjoer()).toBe(false);

    catenda.etter = {};
    await startPaaNytt(sakId);
    expect(await kjoer()).toBe(true);
    expect(catenda.opplastinger).toBe(1);
    expect((await forsoekene(sakId)).map(([utfall]) => utfall)).toEqual([
      'usikkert',
      'startet_paa_nytt',
      'utfoert',
    ]);
    expect((await kvitteringene(sakId)).map((k) => k.operasjon)).toEqual([
      'dokument',
      'dokumentreferanse',
    ]);
  });

  it('L3: et tapt svar ved referansen parkeres, og forsøket etter omstarten lager ingen referanse til', async () => {
    const sakId = await sakMedBrev();
    catenda.etter.opprettDokumentreferanse = () => {
      throw new UsikkertCatendautfall('Catenda svarte ikke');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');

    catenda.etter = {};
    await startPaaNytt(sakId);
    expect(await kjoer()).toBe(true);
    expect(catenda.opplastinger).toBe(1);
    expect(catenda.nyeReferanser).toBe(1);
    expect((await leveringen(sakId))[0].tilstand).toBe('utfoert');
  });

  it('L4: en sikker feil ved referansen prøves igjen, og neste forsøk laster ikke opp dokumentet på nytt', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.opprettDokumentreferanse = () => {
      throw new CatendaUtilgjengelig('Catenda svarte med feil');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('venter');
    expect((await kvitteringene(sakId)).map((k) => k.operasjon)).toEqual(['dokument']);

    catenda.foer = {};
    catenda.foer.finnDokument = () => {
      throw new Error('Dokumentet er kvittert og skal ikke slås opp igjen');
    };
    await somKjoerer(
      `UPDATE koe.jobb SET neste_forsoek = DATETRUNC(millisecond, SYSUTCDATETIME())
        WHERE sak_id = @sak AND jobbtype = N'levering'`,
      { sak: sakId }
    );
    expect(await kjoer()).toBe(true);
    expect(catenda.opplastinger).toBe(1);
    expect(await forsoekene(sakId)).toEqual([
      ['feilet', 'Catenda svarte med feil'],
      ['utfoert', null],
    ]);
  });

  it('L4: et dokument som alt finnes med navnet (409), slås opp i stedet for å lastes opp igjen', async () => {
    const sakId = await sakMedBrev();
    // Dokumentet finnes ikke ved første oppslag, men opplastingen møter det.
    const opprinnelig = catenda.finnDokument.bind(catenda);
    let foersteOppslag = true;
    catenda.finnDokument = async (maal, navn) => {
      if (foersteOppslag) {
        foersteOppslag = false;
        catenda.bibliotek.set(navn, { id: 'finnes1234', innhold: new Uint8Array(), maal });
        return null;
      }
      return opprinnelig(maal, navn);
    };
    expect(await kjoer()).toBe(true);
    expect(catenda.opplastinger).toBe(0);
    expect((await kvitteringene(sakId))[0]).toMatchObject({ catenda_id: 'finnes1234' });
  });

  it('L5: en varig avvisning fra Catenda parkerer leveringen som avvist (#778)', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.lastOppDokument = () => {
      throw new CatendaAvvisning(404);
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');
    expect(await forsoekene(sakId)).toEqual([
      ['avvist', 'Catenda avviste forespørselen med status 404'],
    ]);
  });

  it('L6: et bibliotek som er byttet etter frysingen, parkerer leveringen uten kall til Catenda (invariant 6)', async () => {
    const sakId = await sakMedBrev();
    const bibliotek = async (verdi: string | null) =>
      (
        await o.datalag.base.pool
          .request()
          .input('p', o.prosjekt.id)
          .input('b', sql.UniqueIdentifier, verdi)
          .query<{ b: string }>(
            `DECLARE @gammel uniqueidentifier = (SELECT library_id FROM koe.catenda_project_configs WHERE internal_project_id = @p);
             UPDATE koe.catenda_project_configs SET library_id = ISNULL(@b, NEWID()) WHERE internal_project_id = @p;
             SELECT LOWER(CONVERT(nvarchar(36), @gammel)) AS b;`
          )
      ).recordset[0].b;
    const gammel = await bibliotek(null);
    try {
      catenda.foer.finnDokument = () => {
        throw new Error('Catenda skal ikke kalles');
      };
      expect(await kjoer()).toBe(false);
      expect(await forsoekene(sakId)).toEqual([
        [
          'kobling_endret',
          'Koblingen, boardet, biblioteket eller Catenda-prosjektet er endret etter at jobben ble lagt inn.',
        ],
      ]);
    } finally {
      await bibliotek(gammel);
    }
  });

  // Kilde: merknaden 12.10 i #371: PDF-en lagres én gang per oppdrag, før første
  // forsøk, med SHA-256, og den som kommer sist, sender den som er lagret.
  it('L8: PDF-en lagres før opplastingen, også når opplastingen feiler, og bare én gang per oppdrag', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.lastOppDokument = () => {
      throw new CatendaUtilgjengelig('Catenda svarte med feil');
    };
    expect(await kjoer()).toBe(true);
    const [lagret] = await brevdokumentene(sakId);
    expect(lagret.pdf_sha256).toBe(pdfsum(lagret.pdf));
    expect(catenda.opplastinger).toBe(0);

    await somKjoerer(
      `UPDATE koe.jobb SET neste_forsoek = SYSUTCDATETIME() WHERE sak_id = @sak AND jobbtype = N'levering'`,
      { sak: sakId }
    );
    const annen = new TextEncoder().encode('%PDF-1.7 en annen fil');
    const svar = await lagre(await hentLease(), annen);
    expect(new Uint8Array(svar.recordset[0].pdf)).toEqual(lagret.pdf);
    expect(await brevdokumentene(sakId)).toEqual([lagret]);
  });

  it('L8: et nytt forsøk laster opp PDF-en som er lagret, uten å lage og lagre en ny (#795 punkt 4)', async () => {
    const sakId = await sakMedBrev();
    const lagretFoer = new TextEncoder().encode('%PDF-1.7 lagret av et tidligere forsøk');
    await lagre(await hentLease(), lagretFoer);
    await somKjoerer(
      `UPDATE koe.jobb SET lease_utloeper = DATEADD(second, -1, SYSUTCDATETIME())
        WHERE sak_id = @sak AND jobbtype = N'levering'`,
      { sak: sakId }
    );
    // Leasen utløp uten kvittering, så jobben parkeres, og driften starter den på nytt.
    expect(await kjoer()).toBe(false);
    await startPaaNytt(sakId);

    const kall = vi.spyOn(sql.Request.prototype, 'execute');
    try {
      expect(await kjoer()).toBe(true);
      expect(kall.mock.calls.map(([prosedyre]) => prosedyre)).not.toContain(
        'koe_api.lagre_brevdokument'
      );
    } finally {
      kall.mockRestore();
    }
    const [[, dokument]] = [...catenda.bibliotek];
    expect(dokument.innhold).toEqual(lagretFoer);
  });

  it('L8: basen avviser en PDF med feil sum, og et lagret brevdokument endres ikke', async () => {
    const sakId = await sakMedBrev();
    const lease = await hentLease();
    const pdf = new TextEncoder().encode('%PDF-1.7');
    expect(await avvisning(lagre(lease, pdf, pdfsum(new Uint8Array([1]))))).toBe(BRUTT_SJEKK);
    expect(await brevdokumentene(sakId)).toEqual([]);
    await lagre(lease, pdf);
    expect(
      await avvisning(o.datalag.base.pool.request().query(`UPDATE koe.brevdokument SET pdf = 0x00`))
    ).toBe(UFORANDERLIG);
    expect(
      await avvisning(o.datalag.kjoeretid.pool.request().query(`SELECT pdf FROM koe.brevdokument`))
    ).toBe(INGEN_RETT);
  });

  // Kilde: LV-U11 18.10: et registrert brev blir ikke et eget dokument i Catenda.
  it('L9: et registrert brev får oppdraget uten dokument og ingen leveringsjobb, så ingen forsøk', async () => {
    const sakId = await sakMedBrev();
    expect(await kjoer()).toBe(true);
    // OV-U4: det registrerte varselet har brevet som vedlegg.
    const opplastet = await fetch(`${server.url}/api/kjerne/saker/${sakId}/vedlegg`, {
      method: 'POST',
      headers: {
        Cookie: `__Host-koe_session=${o.te.token}`,
        'X-CSRF-Token': o.te.csrf,
        'X-Project-ID': o.prosjekt.id,
        'Content-Type': 'application/octet-stream',
        'X-Filnavn': 'varsel.pdf',
      },
      body: new Uint8Array(Buffer.from('%PDF-1.7\nVarselet\n')),
    });
    const { vedlegg } = (await opplastet.json()) as { vedlegg: { vedlegg_id: string } };
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: {
        expected_version: 2,
        kommando_id: randomUUID(),
        kommando: {
          type: 'varsel',
          spor: 'frist',
          hjemmel: '33.4',
          sendt: '2026-10-01',
          dokumentasjon: [vedlegg.vedlegg_id],
        },
      },
    });
    expect(svar.status).toBe(201);
    const { journal, oppdrag } = await lesSaken(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id },
      sakId
    );
    const registrert = oppdrag.find((x) => x.event_id === journal.at(-1)!.event_id)!;
    expect(registrert.innhold).toMatchObject({ dokument: null, brev: { brevtekst: null } });
    const jobbene = await leveringen(sakId);
    expect(jobbene.map((j) => j.tilstand)).toEqual(['utfoert']);
    expect(jobbene[0].oppdrag).not.toBe(registrert.id.toLowerCase());
    expect(await kjoer()).toBe(false);
    expect(await forsoekene(sakId)).toEqual([['utfoert', null]]);
    expect(catenda.opplastinger).toBe(1);
  });

  // Kilde: #783 punkt 2: en lokal feil som ikke går over, skal ikke prøves i det uendelige.
  it('L10: en uventet lokal feil i leveringen parkerer jobben som usikker, uten feilmeldingen', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.dokumentreferanser = () => {
      throw new RangeError('hemmelig detalj');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');
    expect(await forsoekene(sakId)).toEqual([['usikkert', 'Uventet feil i jobben']]);
  });

  it('L7: kvitteringen krever en gyldig lease, og referansen krever kvittert dokument', async () => {
    const sakId = await sakMedBrev();
    const [{ lease }] = (
      await o.datalag.kjoeretid.pool
        .request()
        .input('leasetid_sekunder', sql.Int, LEASETID_S)
        .execute<{ lease: string }>('koe_api.hent_jobb')
    ).recordset;
    const kvitter = (prosedyre: string, felt: string, l: string) =>
      o.datalag.kjoeretid.pool
        .request()
        .input('lease', sql.UniqueIdentifier, l)
        .input(felt, sql.NVarChar(100), 'x')
        .execute(prosedyre);
    expect(await avvisning(kvitter('koe_api.kvitter_levering', 'referanse_id', lease))).toBe(
      FREMMEDNOEKKEL
    );
    expect(await avvisning(kvitter('koe_api.kvitter_topic', 'topic_id', lease))).toBe(
      LEASE_UGYLDIG
    );
    expect(await avvisning(kvitter('koe_api.kvitter_dokument', 'dokument_id', randomUUID()))).toBe(
      LEASE_UGYLDIG
    );
    await somKjoerer(
      `UPDATE koe.jobb SET lease_utloeper = DATEADD(second, -1, SYSUTCDATETIME())
        WHERE sak_id = @sak AND jobbtype = N'levering'`,
      { sak: sakId }
    );
    expect(await avvisning(kvitter('koe_api.kvitter_dokument', 'dokument_id', lease))).toBe(
      LEASE_UGYLDIG
    );
    expect(await kvitteringene(sakId)).toEqual([]);
  });

  it('L7: en kvittering endres ikke, og kjøretiden kan ikke skrive den direkte', async () => {
    const sakId = await sakMedBrev();
    expect(await kjoer()).toBe(true);
    const eier = o.datalag.base.pool;
    expect(
      await avvisning(
        eier.request().query(`UPDATE koe.leveringskvittering SET catenda_id = N'annen'`)
      )
    ).toBe(UFORANDERLIG);
    const [{ oppdrag }] = await leveringen(sakId);
    expect(
      await avvisning(
        o.datalag.kjoeretid.pool
          .request()
          .input('o', sql.UniqueIdentifier, oppdrag)
          .query(
            `INSERT koe.leveringskvittering (leveringsoppdrag_id, operasjon, prosjekt_id, catenda_id, forsoek_id)
             VALUES (@o, N'dokument', N'p', N'x', NEWID())`
          )
      )
    ).toBe(INGEN_RETT);
    expect(await kvitteringene(sakId)).toHaveLength(2);
  });
});

describe('kjøreren og en jobbtype den ikke kjenner (#778)', () => {
  it('jobben parkeres som avvist med en gang, uten kall til Catenda og uten å holde leasen', async () => {
    const kall: { prosedyre: string; parametre: Record<string, unknown> }[] = [];
    const datalag = {
      request() {
        const parametre: Record<string, unknown> = {};
        const r = {
          input(navn: string, _type: unknown, verdi: unknown) {
            parametre[navn] = verdi;
            return r;
          },
          async execute(prosedyre: string) {
            kall.push({ prosedyre, parametre });
            return {
              recordset:
                prosedyre === 'koe_api.hent_jobb'
                  ? [
                      {
                        jobb_id: 'j',
                        jobbtype: 'ny_type',
                        lease: 'l',
                        sak_id: 's',
                        prosjekt_id: 'p',
                      },
                    ]
                  : [],
            };
          },
        };
        return r;
      },
    } as unknown as Pool;
    const ikkeKall = async (): Promise<never> => {
      throw new Error('Catenda skal ikke kalles');
    };
    expect(
      await kjoerEnJobb({
        datalag,
        catenda: { opprettTopic: ikkeKall },
        dokumenter: {
          finnDokument: ikkeKall,
          lastOppDokument: ikkeKall,
          dokumentreferanser: ikkeKall,
          opprettDokumentreferanse: ikkeKall,
        },
        saksadresse: () => 'x',
        logg: { info() {}, warn() {}, error() {} },
      })
    ).toBe(true);
    expect(kall.map((k) => k.prosedyre)).toEqual([
      'koe_api.hent_jobb',
      'koe_api.registrer_jobbfeil',
    ]);
    expect(kall[1].parametre).toEqual({
      lease: 'l',
      utfall: 'avvist',
      melding: 'Jobbtypen ny_type er ukjent for kjøreren',
    });
  });
});
