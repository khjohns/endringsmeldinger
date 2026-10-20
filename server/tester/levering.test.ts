/**
 * Leveringen av brevet til Catenda mot testbasen i SQL Server (L-1b, #371 del 1).
 * Forventningene har kilde i LV-U1, B-03, invariant 6 og 7 i hovedplanen (2.3) og
 * arbeidsvalgene 18.10 i #371: brevet er levert når dokumentet ligger i biblioteket og
 * referansen står på topicen, og etter et tapt svar avstemmes det mot navnet.
 * Akseptkriteriene står i PR-en, med nummeret (L) i testnavnet.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CatendaAvvisning,
  CatendaUtilgjengelig,
  merkEndring,
  sammenlignbarDokumentId,
  UsikkertCatendautfall,
  VarigCatendaavvik,
  type Brevdokument,
  type Dokumentleverandoer,
  type Dokumentmaal,
  type Topicoppretter,
} from '../catenda.ts';
import type { Pool } from '../datalag.ts';
import { kjoerEnJobb, LEASETID_S } from '../jobber.ts';
import { lesSaken } from '../lager.ts';
import { gjengirTro } from '../../kjerne/frosset/brevtekst.ts';
import type { Avsnitt } from '../../kjerne/typer.ts';
import { lesBrevPdf } from '../brevpdf.ts';
import { pdfsum, vedleggsnavn } from '../levering.ts';
import { sql } from './sqlserver.ts';
import { avvisning } from './sqlserver_migrert.ts';
import {
  kall,
  type KjorendeServer,
  lagOppsett,
  opprettKjernesak,
  type Oppsett,
  rydd,
  sendKommando,
  somJobbkjoerer,
  startServer,
  TESTBASE_URL,
} from './testbase.ts';

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
  nyDokumentId = () => randomUUID().replaceAll('-', '');
  /** Kalles før hver operasjon; kaster den, gjør operasjonen ingenting. */
  foer: Partial<Record<keyof Dokumentleverandoer, () => void>> = {};
  /** Kalles etter at endringen er gjort; kaster den, er svaret tapt. */
  etter: Partial<Record<keyof Dokumentleverandoer, () => void>> = {};

  async finnDokument(_maal: Dokumentmaal, navn: string) {
    this.foer.finnDokument?.();
    return this.bibliotek.get(navn)?.id ?? null;
  }
  /**
   * Som `forespoersel`: en endring Catenda avviser (`CatendaAvvisning`, også 409 for et navn
   * som finnes), setter ikke flagget.
   */
  private endring(foer?: () => void, avvist = false) {
    try {
      foer?.();
    } catch (feil) {
      if (!(feil instanceof CatendaAvvisning)) merkEndring();
      throw feil;
    }
    if (!avvist) merkEndring();
  }

  async lastOppDokument(maal: Dokumentmaal, dokument: Brevdokument) {
    const finnes = this.bibliotek.has(dokument.navn);
    this.endring(this.foer.lastOppDokument, finnes);
    if (finnes) return null;
    this.opplastinger++;
    const id = this.nyDokumentId();
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
    return (this.referanser.get(topic) ?? []).map((r) => ({
      ...r,
      dokumentId: sammenlignbarDokumentId(r.dokumentId),
    }));
  }
  async opprettDokumentreferanse(_board: string, topic: string, dokumentId: string) {
    this.endring(this.foer.opprettDokumentreferanse);
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
  // `SYSUTCDATETIME()` i SQL Server på Linux tikker i steg på omtrent 33 ms, så
  // forsøk rett etter hverandre kan få samme `avsluttet`. Rekkefølgen leses derfor av
  // hvilke forsøk som er nye etter hvert steg, ikke av tidspunktet (#856).
  const forsoeksloggen = (sakId: string) => {
    const kjente = new Set<string>();
    return async () => {
      const nye = (
        await somKjoerer<{ forsoek_id: string; utfall: string; melding: string | null }>(
          `SELECT LOWER(CONVERT(nvarchar(36), f.forsoek_id)) AS forsoek_id, f.utfall, f.melding
             FROM koe.jobbforsoek f JOIN koe.jobb j ON j.jobb_id = f.jobb_id
            WHERE j.sak_id = @sak AND j.jobbtype = N'levering'`,
          { sak: sakId }
        )
      ).recordset.filter((f) => !kjente.has(f.forsoek_id));
      for (const f of nye) kjente.add(f.forsoek_id);
      return nye.map((f) => [f.utfall, f.melding]);
    };
  };
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
  const provIgjenNaa = (sakId: string) =>
    somKjoerer(
      `UPDATE koe.jobb SET neste_forsoek = DATETRUNC(millisecond, SYSUTCDATETIME())
        WHERE sak_id = @sak AND jobbtype = N'levering'`,
      { sak: sakId }
    );
  const startPaaNytt = async (sakId: string) => {
    const { jobb_id } = (await leveringen(sakId)).find((j) => j.tilstand === 'parkert')!;
    await o.datalag.base.pool
      .request()
      .input('jobb_id', sql.UniqueIdentifier, jobb_id)
      .execute('koe_api.start_jobb_paa_nytt');
  };

  /** Brevet med kravet om grunnlag, med den låste teksten klienten viste (LV-U2). */
  async function sendBrev(sakId: string) {
    const svar = await sendKommando(server.url, o, sakId, { versjon: 1 });
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

  // Kilde: B-03 og #876 punkt 4: leveringen avstemmes mot navnet, så et tapt svar gir et
  // nytt forsøk, ikke parkering.
  it('L3: et tapt svar ved opplastingen prøves igjen, og neste forsøk finner dokumentet på navnet (invariant 7, B-03)', async () => {
    const sakId = await sakMedBrev();
    const nyeForsoek = forsoeksloggen(sakId);
    catenda.etter.lastOppDokument = () => {
      throw new UsikkertCatendautfall('Catenda svarte ikke');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('venter');
    expect(await nyeForsoek()).toEqual([['feilet', 'Catenda svarte ikke']]);

    catenda.etter = {};
    await provIgjenNaa(sakId);
    expect(await kjoer()).toBe(true);
    expect(catenda.opplastinger).toBe(1);
    expect(await nyeForsoek()).toEqual([['utfoert', null]]);
    expect((await kvitteringene(sakId)).map((k) => k.operasjon)).toEqual([
      'dokument',
      'dokumentreferanse',
    ]);
  });

  // Kilde: #876: Catenda lover ikke at dokument-ID-en er en UUID, så referansen finnes
  // igjen også når den ikke er det.
  it.each([
    ['en UUID', () => randomUUID()],
    ['ingen UUID', () => `dok-${randomUUID()}`],
  ])(
    'L3: et tapt svar ved referansen prøves igjen, og neste forsøk lager ingen referanse til (dokument-ID-en er %s)',
    async (_n, nyDokumentId) => {
      const sakId = await sakMedBrev();
      catenda.nyDokumentId = nyDokumentId;
      catenda.etter.opprettDokumentreferanse = () => {
        throw new UsikkertCatendautfall('Catenda svarte ikke');
      };
      expect(await kjoer()).toBe(true);
      expect((await leveringen(sakId))[0].tilstand).toBe('venter');

      catenda.etter = {};
      await provIgjenNaa(sakId);
      expect(await kjoer()).toBe(true);
      expect(catenda.opplastinger).toBe(1);
      expect(catenda.nyeReferanser).toBe(1);
      expect((await leveringen(sakId))[0].tilstand).toBe('utfoert');
    }
  );

  it('L4: en sikker feil ved referansen prøves igjen, og neste forsøk laster ikke opp dokumentet på nytt', async () => {
    const sakId = await sakMedBrev();
    const nyeForsoek = forsoeksloggen(sakId);
    catenda.foer.opprettDokumentreferanse = () => {
      throw new CatendaUtilgjengelig('Catenda svarte med feil');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('venter');
    expect((await kvitteringene(sakId)).map((k) => k.operasjon)).toEqual(['dokument']);
    expect(await nyeForsoek()).toEqual([['feilet', 'Catenda svarte med feil']]);

    catenda.foer = {};
    catenda.foer.finnDokument = () => {
      throw new Error('Dokumentet er kvittert og skal ikke slås opp igjen');
    };
    await provIgjenNaa(sakId);
    expect(await kjoer()).toBe(true);
    expect(catenda.opplastinger).toBe(1);
    expect(await nyeForsoek()).toEqual([['utfoert', null]]);
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

  // Kilde: oppdragsgiver 19.10 og 20.10 (#764, #921): avvist når Catenda ikke er endret.
  it('L5: en varig avvisning fra Catenda av den første endringen parkerer leveringen som avvist (#778)', async () => {
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

  // Kilde: oppdragsgiver 20.10 (#921): en avvisning etter at brevet er lastet opp, parkeres
  // som usikker, fordi Catenda er endret.
  it('L5: en varig avvisning av referansen etter opplastingen parkerer leveringen som usikker (#921)', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.opprettDokumentreferanse = () => {
      throw new CatendaAvvisning(404);
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');
    expect(await forsoekene(sakId)).toEqual([
      ['usikkert', 'Catenda avviste forespørselen med status 404'],
    ]);
  });

  // Kilde: oppdragsgiver 19.10 (#764): et varig avvik før noe er sendt, parkeres som avvist
  // uten nytt forsøk. To dokumenter med samme navn er et varig avvik (#895-6).
  it('L5: et varig avvik i biblioteket før opplastingen parkerer leveringen som avvist (#876)', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.finnDokument = () => {
      throw new VarigCatendaavvik('Flere dokumenter har samme navn');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');
    expect(await forsoekene(sakId)).toEqual([['avvist', 'Flere dokumenter har samme navn']]);
  });

  // Kilde: oppdragsgiver 20.10 (#921), som leser svaret 19.10 (#764) for tilfellet før noe er
  // sendt: en referanse uten dokument etter at brevet er lastet opp, parkeres som usikker.
  it('L5: en referanse på topicen uten dokument etter opplastingen parkerer leveringen som usikker (#876, #921)', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.dokumentreferanser = () => {
      throw new VarigCatendaavvik(
        'Referansen nr. 1 på topicen viser verken til et dokument eller en lenke'
      );
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');
    expect(await forsoekene(sakId)).toEqual([
      ['usikkert', 'Referansen nr. 1 på topicen viser verken til et dokument eller en lenke'],
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
      `UPDATE koe.jobb SET neste_forsoek = DATETRUNC(millisecond, SYSUTCDATETIME()) WHERE sak_id = @sak AND jobbtype = N'levering'`,
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
      const pdfene = kall.mock.calls.flatMap(([prosedyre], i) =>
        prosedyre === 'koe_api.lagre_brevdokument'
          ? [
              (kall.mock.contexts[i] as { parameters: { pdf: { value: unknown } } }).parameters.pdf
                .value,
            ]
          : []
      );
      expect(pdfene, 'bare den lagrede hentes, uten en ny PDF (#805 punkt 5)').toEqual([null]);
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
  /** Laster opp et vedlegg til saken som TE og gir ID-en. */
  async function lastOppVedlegg(sakId: string, filnavn: string, innhold: Uint8Array<ArrayBuffer>) {
    const svar = await fetch(`${server.url}/api/kjerne/saker/${sakId}/vedlegg`, {
      method: 'POST',
      headers: {
        Cookie: `__Host-koe_session=${o.te.token}`,
        'X-CSRF-Token': o.te.csrf,
        'X-Project-ID': o.prosjekt.id,
        'Content-Type': 'application/octet-stream',
        'X-Filnavn': filnavn,
      },
      body: innhold,
    });
    if (svar.status !== 201) throw new Error(`Vedlegget ble avvist: ${svar.status}`);
    return ((await svar.json()) as { vedlegg: { vedlegg_id: string } }).vedlegg.vedlegg_id;
  }

  /** Registrerer et varsel om frist med vedleggene (OV-U4: brevet ligger ved). */
  async function registrerVarsel(sakId: string, versjon: number, vedlegg: string[]) {
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: {
        expected_version: versjon,
        kommando_id: randomUUID(),
        kommando: {
          type: 'varsel',
          spor: 'frist',
          hjemmel: '33.4',
          sendt: '2026-10-01',
          dokumentasjon: vedlegg,
        },
      },
    });
    if (svar.status !== 201)
      throw new Error(`Varselet ble avvist: ${svar.status} ${JSON.stringify(svar.kropp)}`);
  }

  const vedlegget = async (vedleggId: string) =>
    (
      await somKjoerer<{ filnavn: string; innhold_sha256: string; innhold: Buffer | null }>(
        `SELECT filnavn, innhold_sha256, innhold FROM koe.vedlegg WHERE vedlegg_id = @id`,
        { id: vedleggId }
      )
    ).recordset[0];
  const vedleggskvitteringene = async (vedleggId: string) =>
    (
      await somKjoerer<{ operasjon: string; catenda_id: string }>(
        `SELECT operasjon, catenda_id FROM koe.vedleggskvittering WHERE vedlegg_id = @id ORDER BY operasjon`,
        { id: vedleggId }
      )
    ).recordset;
  const VARSELET = new Uint8Array(Buffer.from('%PDF-1.7\nVarselet\n'));

  /** Saken med brevet levert og et registrert varsel med vedlegget, med leveringsjobben klar. */
  async function sakMedRegistrertVarsel() {
    const sakId = await sakMedBrev();
    expect(await kjoer()).toBe(true);
    const vedleggId = await lastOppVedlegg(sakId, 'varsel.pdf', VARSELET);
    await registrerVarsel(sakId, 2, [vedleggId]);
    return { sakId, vedleggId };
  }

  // Kilde: LV-U11 (registrert brev blir ikke eget dokument, vedlegget lagres i Catenda),
  // LV-U12 (filen slettes etter kvitteringen, hash og frosset grunnlag beholdes) og
  // arbeidsvalg 7 i #790 (samme bibliotek og mappe, referanse på topicen).
  it('L9: et registrert brev blir ikke et eget dokument, men vedlegget leveres til topicen, og innholdet slettes etter kvitteringen', async () => {
    const { sakId, vedleggId } = await sakMedRegistrertVarsel();
    const { journal, oppdrag } = await lesSaken(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id },
      sakId
    );
    const registrert = oppdrag.find((x) => x.event_id === journal.at(-1)!.event_id)!;
    expect(registrert.innhold).toMatchObject({ dokument: null, brev: { brevtekst: null } });
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId)).map((j) => j.tilstand)).toEqual(['utfoert', 'utfoert']);
    expect(await forsoekene(sakId)).toEqual([
      ['utfoert', null],
      ['utfoert', null],
    ]);

    const navn = `varsel-${vedleggId}.pdf`;
    const levert = catenda.bibliotek.get(navn)!;
    expect(levert.innhold).toEqual(VARSELET);
    expect(catenda.opplastinger, 'brevet og vedlegget, ikke det registrerte brevet').toBe(2);
    const [topic] = [...catenda.referanser.keys()];
    expect(catenda.referanser.get(topic)!.map((r) => r.dokumentId)).toContain(levert.id);
    const kvitteringer = await vedleggskvitteringene(vedleggId);
    expect(kvitteringer.map((k) => k.operasjon)).toEqual(['dokument', 'dokumentreferanse']);
    expect(kvitteringer[0].catenda_id).toBe(levert.id);
    expect(await vedlegget(vedleggId)).toEqual({
      filnavn: 'varsel.pdf',
      innhold_sha256: pdfsum(VARSELET),
      innhold: null,
    });
    expect(
      (await kvitteringene(sakId)).map((k) => k.operasjon),
      'bare brevet med tekst fra appen har kvitteringer for et dokument'
    ).toEqual(['dokument', 'dokumentreferanse']);
  });

  // Kilde: #876 punkt 4: et tapt svar på et vedlegg gir et nytt forsøk med avstemming.
  it('L9: et tapt svar ved opplastingen av vedlegget prøves igjen, og neste forsøk finner det på navnet (invariant 7)', async () => {
    const { sakId, vedleggId } = await sakMedRegistrertVarsel();
    catenda.etter.lastOppDokument = () => {
      throw new UsikkertCatendautfall('Catenda svarte ikke');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId)).map((j) => j.tilstand).sort()).toEqual(['utfoert', 'venter']);
    expect(
      (await vedlegget(vedleggId)).innhold,
      'innholdet ligger til Catenda har kvittert'
    ).not.toBeNull();
    catenda.etter = {};
    await provIgjenNaa(sakId);
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId)).map((j) => j.tilstand)).toEqual(['utfoert', 'utfoert']);
    expect(catenda.opplastinger).toBe(2);
    expect((await vedlegget(vedleggId)).innhold).toBeNull();
  });

  // Kilde: LV-U11 og LV-U12. Basen holder reglene, ikke bare kjøreren.
  it('L9: basen kvitterer ikke leveringen før vedlegget står på topicen, og en kvittering for vedlegget gjelder én gang', async () => {
    const { vedleggId } = await sakMedRegistrertVarsel();
    const lease = await hentLease();
    const kjoeretid = o.datalag.kjoeretid.pool;
    expect(
      await avvisning(
        kjoeretid
          .request()
          .input('lease', sql.UniqueIdentifier, lease)
          .input('referanse_id', sql.NVarChar(100), null)
          .execute('koe_api.kvitter_levering')
      )
    ).toBe(51422);
    expect(
      await avvisning(
        kjoeretid
          .request()
          .input('lease', sql.UniqueIdentifier, lease)
          .input('referanse_id', sql.NVarChar(100), 'r')
          .execute('koe_api.kvitter_levering')
      ),
      'det registrerte brevet har ikke noe dokument å vise til'
    ).toBe(51422);
    const kvitterVedlegg = (id: string, operasjon: string, catendaId: string) =>
      kjoeretid
        .request()
        .input('lease', sql.UniqueIdentifier, lease)
        .input('vedlegg_id', sql.UniqueIdentifier, id)
        .input('operasjon', sql.NVarChar(20), operasjon)
        .input('catenda_id', sql.NVarChar(100), catendaId)
        .execute('koe_api.kvitter_vedlegg');
    expect(
      await avvisning(kvitterVedlegg(randomUUID(), 'dokument', 'd')),
      'et vedlegg utenfor brevet'
    ).toBe(51422);
    await kvitterVedlegg(vedleggId, 'dokument', 'd');
    await kvitterVedlegg(vedleggId, 'dokument', 'd');
    expect(
      await avvisning(kvitterVedlegg(vedleggId, 'dokument', 'annen')),
      'kvittert med en annen ID'
    ).toBe(51409);
    expect((await vedlegget(vedleggId)).innhold).toBeNull();
    expect(await vedleggskvitteringene(vedleggId)).toEqual([
      { operasjon: 'dokument', catenda_id: 'd' },
    ]);
  });

  /**
   * Skriver ID-en i vedleggslista til oppdraget om som eier. Kjernen lager ikke et slikt
   * oppdrag, så vernene mot endring og radsikkerheten slås av i transaksjonen.
   */
  async function skrivOmVedleggIOppdraget(sakId: string, fra: string, til: string) {
    const { oppdrag } = (await leveringen(sakId)).find((j) => j.tilstand === 'venter')!;
    await o.datalag.base.pool
      .request()
      .input('oppdrag', sql.UniqueIdentifier, oppdrag)
      .input('fra', sql.NVarChar(100), fra)
      .input('til', sql.NVarChar(100), til).query(`
        SET XACT_ABORT ON;
        BEGIN TRANSACTION;
        ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = OFF);
        DISABLE TRIGGER koe.leveringsoppdrag_uforanderlig ON koe.leveringsoppdrag;
        UPDATE koe.leveringsoppdrag SET innhold = REPLACE(innhold, @fra, @til) WHERE id = @oppdrag;
        IF @@ROWCOUNT <> 1 THROW 50000, N'Oppdraget ble ikke skrevet om', 1;
        ENABLE TRIGGER koe.leveringsoppdrag_uforanderlig ON koe.leveringsoppdrag;
        ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = ON);
        COMMIT;`);
  }

  // Kilde: kommentaren i #876. Leveringen kvitteres bare når hvert vedlegg i brevet er
  // bundet i jobbens sak og prosjekt, ikke bare kvittert på topicen et annet sted.
  it('L9: basen kvitterer ikke leveringen når brevet viser til et vedlegg som er levert fra en annen sak', async () => {
    const fremmed = await sakMedRegistrertVarsel();
    expect(await kjoer()).toBe(true);
    expect(
      (await vedleggskvitteringene(fremmed.vedleggId)).map((k) => k.operasjon),
      'kontrollsaken: vedlegget er levert og kvittert i sin egen sak'
    ).toEqual(['dokument', 'dokumentreferanse']);
    const { sakId, vedleggId } = await sakMedRegistrertVarsel();
    await skrivOmVedleggIOppdraget(sakId, vedleggId, fremmed.vedleggId);
    const lease = await hentLease();
    await expect(
      o.datalag.kjoeretid.pool
        .request()
        .input('lease', sql.UniqueIdentifier, lease)
        .input('referanse_id', sql.NVarChar(100), null)
        .execute('koe_api.kvitter_levering')
    ).rejects.toMatchObject({ number: 51422, message: 'Et vedlegg i brevet står ikke på topicen' });
  });

  // Kilde: #886, reviewet. Kjøreren sender ID-en som `uniqueidentifier`, så lista gir ID-en
  // til det bundne vedlegget, også når brevet skriver den i en annen form.
  it('L9: et vedlegg som brevet skriver med klammer og store bokstaver, leveres med ID-en til vedlegget', async () => {
    const { sakId, vedleggId } = await sakMedRegistrertVarsel();
    await skrivOmVedleggIOppdraget(sakId, vedleggId, `{${vedleggId.toUpperCase()}}`);
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId)).map((j) => j.tilstand)).not.toContain('parkert');
    expect((await vedleggskvitteringene(vedleggId)).map((k) => k.operasjon)).toEqual([
      'dokument',
      'dokumentreferanse',
    ]);
  });

  // Kilde: #876 r2. Leasetiden gjelder ett steg, ikke hele leveringen med alle vedleggene.
  it('L11: forny_lease forlenger en gyldig lease fra nå, og en utløpt lease fornyes ikke', async () => {
    const sakId = await sakMedBrev();
    const lease = await hentLease();
    const forny = () =>
      o.datalag.kjoeretid.pool
        .request()
        .input('lease', sql.UniqueIdentifier, lease)
        .input('leasetid_sekunder', sql.Int, 3600)
        .execute('koe_api.forny_lease');
    const igjen = async () =>
      (
        await somKjoerer<{ sekunder: number }>(
          `SELECT DATEDIFF(second, SYSUTCDATETIME(), lease_utloeper) AS sekunder
             FROM koe.jobb WHERE sak_id = @sak AND jobbtype = N'levering'`,
          { sak: sakId }
        )
      ).recordset[0].sekunder;
    expect(await igjen()).toBeLessThanOrEqual(LEASETID_S);
    await forny();
    expect(await igjen()).toBeGreaterThan(LEASETID_S);
    await somKjoerer(
      `UPDATE koe.jobb SET lease_utloeper = DATEADD(second, -1, SYSUTCDATETIME())
        WHERE sak_id = @sak AND jobbtype = N'levering'`,
      { sak: sakId }
    );
    expect(await avvisning(forny())).toBe(LEASE_UGYLDIG);
  });

  // Kilde: #783 punkt 2: en lokal feil som ikke går over, skal ikke prøves i det uendelige.
  it('L10: en uventet lokal feil etter opplastingen parkerer jobben som usikker, uten feilmeldingen', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.dokumentreferanser = () => {
      throw new RangeError('hemmelig detalj');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');
    expect(await forsoekene(sakId)).toEqual([['usikkert', 'Uventet feil i jobben']]);
  });

  // Kilde: #813 punkt 5: en feil før Catenda er bedt om noe, er ikke et usikkert utfall.
  it('L10: en uventet lokal feil før kjøreren har bedt Catenda om en endring, parkerer jobben som avvist', async () => {
    const sakId = await sakMedBrev();
    catenda.foer.finnDokument = () => {
      throw new RangeError('hemmelig detalj');
    };
    expect(await kjoer()).toBe(true);
    expect((await leveringen(sakId))[0].tilstand).toBe('parkert');
    expect(await forsoekene(sakId)).toEqual([['avvist', 'Uventet feil i jobben']]);
    expect(catenda.opplastinger).toBe(0);
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

// Kilde: #795 punkt 1 og #783 punkt 2: en varig feil fra basen prøves ikke igjen i det
// uendelige, mens en vranglås eller en tapt forbindelse går over.
describe('kjøreren og feil fra basen (#795)', () => {
  // Kilde: #877 p14 for feilene uten nummer: bare en feil i forbindelsen går over. En feil
  // fra tedious uten `info` får koden som `number` når mssql pakker den inn.
  it.each<[string, string, { number?: number | string; code?: string }]>([
    ['brudd på en CHECK (547)', 'avvist', { number: 547 }],
    ['en rett som mangler (229)', 'avvist', { number: 229 }],
    ['en vranglås (1205)', 'feilet', { number: 1205 }],
    ['en feil uten nummer, i forbindelsen (ESOCKET)', 'feilet', { code: 'ESOCKET' }],
    ['et tidsavbrudd uten nummer (ETIMEOUT)', 'feilet', { code: 'ETIMEOUT' }],
    [
      'et tidsavbrudd i forespørselen, pakket av mssql (ETIMEOUT)',
      'feilet',
      { number: 'ETIMEOUT', code: 'ETIMEOUT' },
    ],
    ['en parameter tedious avviser (EPARAM)', 'avvist', { code: 'EPARAM' }],
  ])('%s før Catenda er bedt om noe, gir utfallet %s', async (_n, utfall, egenskaper) => {
    const registrert: Record<string, unknown>[] = [];
    const datalag = {
      request() {
        const parametre: Record<string, unknown> = {};
        const r = {
          input(navn: string, _type: unknown, verdi: unknown) {
            parametre[navn] = verdi;
            return r;
          },
          async execute(prosedyre: string) {
            if (prosedyre === 'koe_api.hent_jobb')
              return {
                recordset: [
                  { jobb_id: 'j', jobbtype: 'levering', lease: 'l', oppdrag: '{"maal":{}}' },
                ],
              };
            if (prosedyre === 'koe_api.registrer_jobbfeil') {
              registrert.push(parametre);
              return { recordset: [] };
            }
            throw Object.assign(new sql.RequestError('fra basen'), egenskaper);
          },
        };
        return r;
      },
    } as unknown as Pool;
    const ikkeKall = async (): Promise<never> => {
      throw new Error('Catenda skal ikke kalles');
    };
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
    });
    expect(registrert).toEqual([{ lease: 'l', utfall, melding: 'Uventet feil i jobben' }]);
  });
});

describe('kjøreren og kvitteringene for vedleggene (#876)', () => {
  const vedlegg = (id: string) => ({
    vedlegg_id: id,
    filnavn: 'a.pdf',
    finnes: true,
    dokument_id: `dokument-${id}` as string | null,
    referanse_id: null,
  });

  /**
   * Basen for én leveringsjobb, som standard med to vedlegg som har dokument, men ikke
   * referanse, og et oppdrag uten dokument.
   */
  function falskBase(
    jobbtype: string,
    feiler: {
      prosedyre: string;
      feil: { number?: number | string; code?: string };
      ganger?: number;
    } | null,
    tillegg: {
      jobb?: Record<string, unknown>;
      vedlegg?: ReturnType<typeof vedlegg>[];
      dokumenter?: Partial<Dokumentleverandoer>;
      catenda?: Partial<Topicoppretter>;
    } = {}
  ) {
    const kall: { prosedyre: string; typer: Record<string, unknown> }[] = [];
    const registrert: Record<string, unknown>[] = [];
    let feilet = 0;
    const datalag = {
      request() {
        const parametre: Record<string, unknown> = {};
        const typer: Record<string, unknown> = {};
        const r = {
          input(navn: string, type: unknown, verdi: unknown) {
            parametre[navn] = verdi;
            typer[navn] = type;
            return r;
          },
          async execute(prosedyre: string) {
            kall.push({ prosedyre, typer });
            if (prosedyre === 'koe_api.hent_jobb')
              return {
                recordset: [
                  {
                    jobb_id: 'j',
                    jobbtype,
                    lease: 'l',
                    sak_id: 's',
                    prosjekt_id: 'p',
                    catenda_board_id: 'b',
                    tittel: 't',
                    topic_board_id: 'b',
                    topic_id: 't',
                    oppdrag: '{"maal":{},"dokument":null}',
                    ...tillegg.jobb,
                  },
                ],
              };
            if (prosedyre === 'koe_api.vedlegg_i_levering')
              return { recordset: tillegg.vedlegg ?? [vedlegg('v1'), vedlegg('v2')] };
            if (prosedyre === 'koe_api.vedleggsinnhold')
              return { recordset: [{ innhold: Buffer.from('vedlegg') }] };
            if (prosedyre === 'koe_api.registrer_jobbfeil') registrert.push(parametre);
            if (prosedyre === feiler?.prosedyre && (feiler.ganger ?? Infinity) > feilet++)
              throw Object.assign(new sql.RequestError('fra basen'), feiler.feil);
            return { recordset: [] };
          },
        };
        return r;
      },
    } as unknown as Pool;
    const kjoer = () =>
      kjoerEnJobb({
        datalag,
        catenda: { opprettTopic: async () => 'topic', ...tillegg.catenda },
        dokumenter: {
          finnDokument: async () => null,
          lastOppDokument: async () => null,
          dokumentreferanser: async () => [],
          opprettDokumentreferanse: async () => 'referanse',
          ...tillegg.dokumenter,
        },
        saksadresse: () => 'x',
        logg: { info() {}, warn() {}, error() {} },
      });
    return { kall, registrert, kjoer };
  }

  const prosedyrene = (base: ReturnType<typeof falskBase>) =>
    base.kall.map((k) => k.prosedyre.replace('koe_api.', ''));

  // Kilde: #876 s3.
  it('hvert vedlegg kvitteres for seg, og parametrene i kvitteringen har typene i prosedyren', async () => {
    const base = falskBase('levering', null);
    await base.kjoer();
    expect(prosedyrene(base)).toEqual([
      'hent_jobb',
      'vedlegg_i_levering',
      'kvitter_vedlegg',
      'kvitter_vedlegg',
      'kvitter_levering',
    ]);
    const kvittering = base.kall.find((k) => k.prosedyre === 'koe_api.kvitter_vedlegg')!;
    expect(kvittering.typer.vedlegg_id).toBe(sql.UniqueIdentifier);
    expect(kvittering.typer.operasjon).toMatchObject({ type: sql.NVarChar, length: 20 });
  });

  // Kilde: #876 r3. Leveringen avstemmes mot Catenda ved neste forsøk, så en forbigående
  // feil i kvitteringen prøves igjen. En annen feil parkeres som usikker når leasen går ut.
  // Kilde: #877 p14 for EPARAM: en parameter tedious avviser, går ikke over.
  it.each<[string, string | null, { number?: number | string; code?: string }]>([
    ['en vranglås (1205)', 'feilet', { number: 1205 }],
    ['Azure SQL som flytter basen (40613)', 'feilet', { number: 40613 }],
    [
      'et tidsavbrudd i forespørselen, pakket av mssql (ETIMEOUT)',
      'feilet',
      { number: 'ETIMEOUT', code: 'ETIMEOUT' },
    ],
    ['en avvisning fra basen (51422)', null, { number: 51422 }],
    ['en parameter tedious avviser (EPARAM)', null, { code: 'EPARAM' }],
  ])('%s i kvitteringen av et vedlegg gir utfallet %s', async (_n, utfall, feil) => {
    const base = falskBase('levering', { prosedyre: 'koe_api.kvitter_vedlegg', feil });
    if (utfall) {
      await base.kjoer();
      expect(base.registrert).toEqual([{ lease: 'l', utfall, melding: 'Uventet feil i jobben' }]);
    } else {
      await expect(base.kjoer()).rejects.toMatchObject(feil);
      expect(base.registrert).toEqual([]);
    }
  });

  // Kilde: #876 r3. Topicen kan ikke avstemmes, så et nytt forsøk ville laget en til.
  it('en vranglås i kvitteringen av topicen registreres ikke som feilet', async () => {
    const base = falskBase('catenda_topic', {
      prosedyre: 'koe_api.kvitter_topic',
      feil: { number: 1205 },
    });
    await expect(base.kjoer()).rejects.toMatchObject({ number: 1205 });
    expect(base.registrert).toEqual([]);
  });

  // Arbeidsvalg i #877 p15 (alternativ B), ikke vedtatt av oppdragsgiver: registreringen
  // prøves én gang til, så leasen ikke går ut og parkerer en levering som kunne vært avstemt.
  it.each<[string, string, number]>([
    ['én vranglås', 'registreres ved andre forsøk', 1],
    ['to vranglåser', 'kastes etter andre forsøk, og leasen går ut', 2],
  ])('%s når feilen registreres: feilen %s', async (_n, _utfall, ganger) => {
    const base = falskBase(
      'levering',
      { prosedyre: 'koe_api.registrer_jobbfeil', feil: { number: 1205 }, ganger },
      {
        dokumenter: {
          opprettDokumentreferanse: async () => {
            throw new CatendaUtilgjengelig('Catenda svarte med feil');
          },
        },
      }
    );
    const kjoering = base.kjoer();
    if (ganger === 1) await kjoering;
    else await expect(kjoering).rejects.toMatchObject({ number: 1205 });
    expect(base.registrert).toHaveLength(2);
    expect(base.registrert[0]).toEqual({
      lease: 'l',
      utfall: 'feilet',
      melding: 'Catenda svarte med feil',
    });
  });

  // Kilde: #876 punkt 4. Neste forsøk finner referansen til det første vedlegget og
  // dokumentet til det andre igjen, så et tapt svar på vedlegg 2 av 2 parkeres ikke.
  it('et tapt svar på referansen til det andre vedlegget gir et nytt forsøk, ikke parkering', async () => {
    let referanser = 0;
    const base = falskBase('levering', null, {
      dokumenter: {
        async opprettDokumentreferanse() {
          merkEndring();
          if (++referanser === 2) throw new UsikkertCatendautfall('Catenda svarte ikke');
          return 'referanse';
        },
      },
    });
    await base.kjoer();
    expect(base.registrert).toEqual([
      { lease: 'l', utfall: 'feilet', melding: 'Catenda svarte ikke' },
    ]);
  });

  // Kilde: #876 r3 og #813 punkt 5. Topicen kan ikke avstemmes, så et tapt svar er usikkert.
  it('et tapt svar når topicen opprettes, parkerer jobben som usikker', async () => {
    const base = falskBase('catenda_topic', null, {
      catenda: {
        async opprettTopic() {
          merkEndring();
          throw new UsikkertCatendautfall('Catenda svarte ikke');
        },
      },
    });
    await base.kjoer();
    expect(base.registrert).toEqual([
      { lease: 'l', utfall: 'usikkert', melding: 'Catenda svarte ikke' },
    ]);
  });

  // Kilde: #877 p16 og p19. Oppslagene på topicen og i biblioteket blar side for side og
  // har ingen øvre tid, så leasen fornyes så lenge steget varer, også brevsteget.
  it('leasen fornyes mens brevsteget venter på Catenda, og ikke etter at leveringen er ferdig', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      let slipp!: () => void;
      let venter!: () => void;
      const steget = new Promise<void>((ok) => (venter = ok));
      const base = falskBase('levering', null, {
        jobb: { oppdrag: '{"maal":{},"dokument":{}}', dokument_id: 'brevdokument' },
        vedlegg: [],
        dokumenter: {
          dokumentreferanser: () => {
            venter();
            return new Promise((ok) => (slipp = () => ok([])));
          },
        },
      });
      const kjoering = base.kjoer();
      await steget;
      vi.advanceTimersByTime(LEASETID_S * 1000);
      slipp();
      await kjoering;
      vi.advanceTimersByTime(LEASETID_S * 1000);
      expect(prosedyrene(base)).toEqual([
        'hent_jobb',
        'vedlegg_i_levering',
        'forny_lease',
        'forny_lease',
        'forny_lease',
        'kvitter_levering',
      ]);
      expect(base.registrert).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
  // Kilde: #926. Fornyelsen gir 54001 når leasen ikke gjelder, og da gjør forsøket ingen
  // endring i Catenda etter det. En annen feil i fornyelsen stopper ikke leveringen.
  it.each<[string, number, 'dokumentreferanser' | 'finnDokument', string[], string[]]>([
    [
      'en tapt lease (54001) stopper leveringen før referansen opprettes',
      54001,
      'dokumentreferanser',
      ['hent_jobb', 'vedlegg_i_levering', 'forny_lease'],
      [],
    ],
    [
      'en tapt lease (54001) stopper leveringen før innholdet leses og vedlegget lastes opp',
      54001,
      'finnDokument',
      ['hent_jobb', 'vedlegg_i_levering', 'forny_lease'],
      [],
    ],
    [
      'en vranglås i fornyelsen (1205) stopper ikke leveringen',
      1205,
      'dokumentreferanser',
      ['hent_jobb', 'vedlegg_i_levering', 'forny_lease', 'kvitter_vedlegg', 'kvitter_levering'],
      ['dokument-v1'],
    ],
    [
      'en vranglås i fornyelsen (1205) stopper ikke opplastingen av vedlegget',
      1205,
      'finnDokument',
      [
        'hent_jobb',
        'vedlegg_i_levering',
        'forny_lease',
        'vedleggsinnhold',
        'kvitter_vedlegg',
        'kvitter_vedlegg',
        'kvitter_levering',
      ],
      ['opplasting', 'dokument-v1'],
    ],
  ])('%s', async (_n, nummer, venterI, kallene, endret) => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      let slipp!: () => void;
      let venter!: () => void;
      const steget = new Promise<void>((ok) => (venter = ok));
      const opprettet: string[] = [];
      const base = falskBase(
        'levering',
        { prosedyre: 'koe_api.forny_lease', feil: { number: nummer } },
        {
          vedlegg: [
            venterI === 'finnDokument' ? { ...vedlegg('v1'), dokument_id: null } : vedlegg('v1'),
          ],
          dokumenter: {
            [venterI]: () => {
              venter();
              return new Promise(
                (ok) => (slipp = () => ok(venterI === 'finnDokument' ? null : []))
              );
            },
            lastOppDokument: async () => {
              opprettet.push('opplasting');
              return 'dokument-v1';
            },
            opprettDokumentreferanse: async (_b, _t, dokumentId) => {
              opprettet.push(dokumentId);
              return 'referanse';
            },
          },
        }
      );
      const kjoering = base.kjoer();
      await steget;
      vi.advanceTimersByTime((LEASETID_S * 1000) / 3);
      await new Promise((ok) => setImmediate(ok));
      slipp();
      expect(await kjoering).toBe(true);
      expect(prosedyrene(base)).toEqual(kallene);
      expect(opprettet).toEqual(endret);
      expect(base.registrert).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('navnet vedlegget får i Catenda (#876)', () => {
  // Kilde: #876 r7. Endelsen står etter siste punktum, også når den er hele navnet.
  it.each([
    ['varsel.pdf', 'varsel-ID.pdf'],
    ['rapport.v2.pdf', 'rapport.v2-ID.pdf'],
    ['.pdf', '-ID.pdf'],
    ['uten_endelse', 'uten_endelse-ID'],
  ])('%s blir %s', (filnavn, navn) => {
    expect(vedleggsnavn(filnavn, 'ID')).toBe(navn);
  });
});
