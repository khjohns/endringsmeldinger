/**
 * Jobbkjøreren (L-1a, #741): løkka som gjør jobbene i `koe.jobb` etter commit.
 * Drivmekanismen er arbeidsvalget 18.10 for B-07 i #741: `koe_api.hent_jobb` henter
 * med `READPAST, UPDLOCK` og gir jobben en lease, og løkka i serverprosessen poller.
 * `vekk()` etter en opprettelse korter ventetiden, men det er pollingen som sikrer
 * at jobben blir gjort. Løkka krever en instans som alltid kjører (B-07, B-12).
 *
 * Jobbene er topicen for en ny sak og leveringen av et brev med vedleggene (L-1b, #371;
 * V-3, #790).
 * Bare en gyldig lease kvitterer (invariant 7). Et usikkert eller varig avvist
 * utfall parkeres og logges, og driften starter jobben på nytt med `koe_api.start_jobb_paa_nytt`
 * (svaret «Driften» 18.10, #371). Prosedyrene for løkka kjører som
 * `koe_jobbkjoerer` i basen, fordi løkka ikke har noen aktør i konteksten
 * (`database/migrasjoner/20261018100000_jobber.sql`).
 */

import { catendaId } from './autorisasjon.ts';
import {
  CatendaAvvisning,
  CatendaOppsettfeil,
  CatendaUtilgjengelig,
  UsikkertCatendautfall,
  type Brevdokument,
  type Dokumentleverandoer,
  type Dokumentmaal,
  type Referanse,
  type Topicoppretter,
} from './catenda.ts';
import { feilnummer, sql, type Pool } from './datalag.ts';
import { brevdokument, dokumentnavn, pdfsum, UgjengivbartBrev, vedleggsnavn } from './levering.ts';

/**
 * Lengre enn ett steg: tidsavbruddet mot Catenda (15 s) ganger de fem kallene for ett
 * dokument, med kvitteringene. Leveringen fornyer leasen før hvert vedlegg og før brevet.
 */
export const LEASETID_S = 120;
export const POLLEINTERVALL_MS = 10_000;

interface Jobbrad {
  jobb_id: string;
  jobbtype: string;
  lease: string;
  sak_id: string;
  prosjekt_id: string;
  catenda_board_id: string | null;
  tittel: string | null;
  dokumentnoekkel: string | null;
  oppdrag: string | null;
  topic_board_id: string | null;
  topic_id: string | null;
  dokument_id: string | null;
}

export interface Jobbavhengigheter {
  datalag: Pool;
  catenda: Topicoppretter;
  dokumenter: Dokumentleverandoer;
  /** Adressen til saken i appen, for beskrivelsen i topicen (#741 punkt 15). */
  saksadresse: (prosjektId: string, sakId: string) => string;
  logg?: Pick<Console, 'info' | 'warn' | 'error'>;
}

/** Jobben kan ikke gjøres av denne kjøreren, uten at noe er prøvd i Catenda. */
class UgjennomfoerbarJobb extends Error {}

/** En kvittering som ble avvist etter at endringen i Catenda er gjort. */
class AvvistKvittering extends Error {}

type Utfall = 'feilet' | 'usikkert' | 'avvist';

/**
 * Feilnumrene fra SQL Server som går over: vranglås, tidsavbrudd for en lås, og
 * Azure SQL som er opptatt eller flytter basen. En feil fra basen uten nummer gjelder
 * forbindelsen og går også over.
 */
const FORBIGAAENDE_SQL = new Set([
  1205, 1222, 4060, 10928, 10929, 40197, 40501, 40613, 49918, 49919, 49920,
]);

function forbigaaendeISql(feil: unknown): boolean {
  if (!(feil instanceof sql.MSSQLError)) return false;
  const nummer = feilnummer(feil);
  return nummer === undefined || FORBIGAAENDE_SQL.has(nummer);
}

/**
 * Meldingene fra catenda.ts, levering.ts og kjøreren har ingen svarkropp eller token;
 * andre feil lagres ikke. Bare Catenda og basen kan svikte forbigående (#795 punkt 1).
 * En annen feil går ikke over av seg selv og parkeres (#783 punkt 2): som avvist når
 * forsøket ikke har bedt Catenda om noen endring, ellers som usikker, fordi den kan
 * komme etter en endring i Catenda (#813 punkt 5).
 */
function utfallAv(feil: unknown, endringBedt: boolean): { utfall: Utfall; melding: string } {
  const kjent =
    feil instanceof CatendaUtilgjengelig ||
    feil instanceof UgjennomfoerbarJobb ||
    feil instanceof UgjengivbartBrev;
  const melding = kjent ? feil.message : 'Uventet feil i jobben';
  if (feil instanceof UsikkertCatendautfall) return { utfall: 'usikkert', melding };
  if (
    feil instanceof CatendaAvvisning ||
    feil instanceof UgjennomfoerbarJobb ||
    feil instanceof UgjengivbartBrev
  )
    return { utfall: 'avvist', melding };
  if (feil instanceof CatendaUtilgjengelig || forbigaaendeISql(feil))
    return { utfall: 'feilet', melding };
  return { utfall: endringBedt ? 'usikkert' : 'avvist', melding };
}

/** Leverandøren, med et flagg som settes før hver endring kjøreren ber Catenda om. */
function medEndringsflagg(dokumenter: Dokumentleverandoer, flagg: { endringBedt: boolean }) {
  return {
    finnDokument: (maal: Dokumentmaal, navn: string) => dokumenter.finnDokument(maal, navn),
    dokumentreferanser: (board: string, topic: string) =>
      dokumenter.dokumentreferanser(board, topic),
    lastOppDokument(maal: Dokumentmaal, dokument: Brevdokument) {
      flagg.endringBedt = true;
      return dokumenter.lastOppDokument(maal, dokument);
    },
    opprettDokumentreferanse(board: string, topic: string, dokumentId: string) {
      flagg.endringBedt = true;
      return dokumenter.opprettDokumentreferanse(board, topic, dokumentId);
    },
  } satisfies Dokumentleverandoer;
}

/**
 * Henter og gjør én jobb. Sann når en jobb ble hentet, også når den feilet.
 * En feil i basen kastes; løkka logger den og prøver igjen ved neste runde.
 */
export async function kjoerEnJobb(avh: Jobbavhengigheter): Promise<boolean> {
  const logg = avh.logg ?? console;
  const svar = await avh.datalag
    .request()
    .input('leasetid_sekunder', sql.Int, LEASETID_S)
    .execute<Jobbrad>('koe_api.hent_jobb');
  const jobb = svar.recordset[0];
  if (!jobb) return false;

  const lease = () => avh.datalag.request().input('lease', sql.UniqueIdentifier, jobb.lease);
  const kvitter: Kvitter = async (prosedyre, parametre) => {
    try {
      const foresp = lease();
      for (const [navn, [type, verdi]] of Object.entries(parametre))
        foresp.input(navn, type, verdi);
      await foresp.execute(prosedyre);
    } catch (feil) {
      // Leveringen avstemmes mot Catenda ved neste forsøk, så den prøves igjen som `feilet`.
      if (jobb.jobbtype === 'levering' && forbigaaendeISql(feil)) throw feil;
      // Endringen finnes i Catenda uten kvittering; neste henting parkerer jobben som usikker.
      const verdier = Object.entries(parametre).map(([navn, [, verdi]]) => `${navn}=${verdi}`);
      logg.error(
        `Jobben ${jobb.jobb_id} fikk ${verdier.join(', ')} fra Catenda, men kvitteringen ble avvist:`,
        feil
      );
      throw new AvvistKvittering('Kvitteringen ble avvist', { cause: feil });
    }
  };
  const flagg = { endringBedt: false };

  try {
    if (jobb.jobbtype === 'catenda_topic') {
      flagg.endringBedt = true;
      const topic = await avh.catenda.opprettTopic(jobb.catenda_board_id!, {
        tittel: jobb.tittel!,
        beskrivelse: `Saken i endringsappen: ${avh.saksadresse(jobb.prosjekt_id, jobb.sak_id)}`,
      });
      await kvitter('koe_api.kvitter_topic', { topic_id: [sql.NVarChar(100), topic] });
      logg.info(`Jobben ${jobb.jobb_id} laget topicen ${topic} for saken ${jobb.sak_id}.`);
    } else if (jobb.jobbtype === 'levering') {
      const brevPdf = async (pdf: Uint8Array | null) => {
        const lagret = await lease()
          .input('pdf', sql.VarBinary(sql.MAX), pdf && Buffer.from(pdf))
          .input('pdf_sha256', sql.NVarChar(64), pdf && pdfsum(pdf))
          .execute<{ pdf: Buffer }>('koe_api.lagre_brevdokument');
        const rad = lagret.recordset[0];
        return rad ? new Uint8Array(rad.pdf) : null;
      };
      const lager: Leveringslager = {
        async fornyLease() {
          await lease()
            .input('leasetid_sekunder', sql.Int, LEASETID_S)
            .execute('koe_api.forny_lease');
        },
        lagret: () => brevPdf(null),
        lagre: async (pdf) => (await brevPdf(pdf))!,
        vedlegg: async () =>
          (await lease().execute<Vedleggsrad>('koe_api.vedlegg_i_levering')).recordset,
        async vedleggsinnhold(vedleggId) {
          const svar = await lease()
            .input('vedlegg_id', sql.UniqueIdentifier, vedleggId)
            .execute<{ innhold: Buffer }>('koe_api.vedleggsinnhold');
          const rad = svar.recordset[0];
          return rad ? new Uint8Array(rad.innhold) : null;
        },
        kvitter,
      };
      await lever(medEndringsflagg(avh.dokumenter, flagg), jobb, lager);
      logg.info(`Jobben ${jobb.jobb_id} leverte brevet og vedleggene til topicen.`);
    } else {
      throw new UgjennomfoerbarJobb(`Jobbtypen ${jobb.jobbtype} er ukjent for kjøreren`);
    }
  } catch (feil) {
    if (feil instanceof AvvistKvittering) throw feil.cause;
    const { utfall, melding } = utfallAv(feil, flagg.endringBedt);
    if (feil instanceof CatendaOppsettfeil)
      logg.error(`Jobben ${jobb.jobb_id} venter på at driften retter oppsettet mot Catenda:`, feil);
    else if (utfall === 'feilet') logg.warn(`Jobben ${jobb.jobb_id} feilet og prøves igjen:`, feil);
    else
      logg.error(
        `Jobben ${jobb.jobb_id} er parkert som ${utfall} (${melding}). Driften starter den på nytt.`
      );
    await lease()
      .input('utfall', sql.NVarChar(20), utfall)
      .input('melding', sql.NVarChar(400), melding)
      .execute('koe_api.registrer_jobbfeil');
  }
  return true;
}

type Kvitter = (
  prosedyre: string,
  parametre: Record<string, [type: sql.ISqlType | (() => sql.ISqlType), verdi: string | null]>
) => Promise<void>;

interface Vedleggsrad {
  vedlegg_id: string;
  filnavn: string;
  finnes: boolean;
  dokument_id: string | null;
  referanse_id: string | null;
}

/** Det leveringen leser og skriver i basen, med leasen til forsøket. */
interface Leveringslager {
  fornyLease: () => Promise<void>;
  lagret: () => Promise<Uint8Array | null>;
  lagre: (pdf: Uint8Array) => Promise<Uint8Array>;
  vedlegg: () => Promise<Vedleggsrad[]>;
  /** `null` når innholdet er slettet etter kvitteringen (LV-U12). */
  vedleggsinnhold: (vedleggId: string) => Promise<Uint8Array | null>;
  kvitter: Kvitter;
}

/**
 * Leverer brevet (B-03, #371) og vedleggene det binder (V-3, #790): hvert dokument i
 * biblioteket, så referansen på topicen, hver operasjon kvittert for seg. Vedleggene
 * leveres først. Et vedlegg som alt står på topicen, leveres ikke igjen. Et registrert
 * brev har ikke noe dokument, bare vedlegg (LV-U11). Til slutt kvitterer
 * `koe_api.kvitter_levering` leveringen som fullført.
 *
 * PDF-en av brevet lagres før opplastingen, og det er den lagrede som lastes opp. Har
 * et tidligere forsøk lagret den, lages ingen ny (#371 del 2, #795 punkt 4). Hvert steg
 * avstemmes først, mot navnet i biblioteket og mot referansene på topicen, så et forsøk
 * etter en omstart ikke lager et dokument eller en referanse til.
 */
async function lever(catenda: Dokumentleverandoer, jobb: Jobbrad, lager: Leveringslager) {
  const oppdrag = JSON.parse(jobb.oppdrag!) as Record<string, unknown>;
  const maal = oppdrag.maal as Dokumentmaal;
  const board = jobb.topic_board_id!;
  const topic = jobb.topic_id!;
  let referanser: Referanse[] | null = null;
  const referanse = async (dokumentId: string) => {
    referanser ??= await catenda.dokumentreferanser(board, topic);
    const id = catendaId(dokumentId);
    const funnet = referanser.find((r) => r.dokumentId === id);
    return funnet?.id ?? (await catenda.opprettDokumentreferanse(board, topic, dokumentId));
  };
  const dokument = async (navn: string, innhold: () => Promise<Uint8Array>) => {
    const id =
      (await catenda.finnDokument(maal, navn)) ??
      (await catenda.lastOppDokument(maal, { navn, innhold: await innhold() })) ??
      (await catenda.finnDokument(maal, navn));
    if (!id) throw new CatendaUtilgjengelig('Dokumentet finnes, men ble ikke funnet');
    return id;
  };

  for (const vedlegg of await lager.vedlegg()) {
    if (!vedlegg.finnes)
      throw new UgjennomfoerbarJobb('Et vedlegg i brevet er ikke bundet i saken');
    if (vedlegg.referanse_id) continue;
    await lager.fornyLease();
    const kvitterVedlegg = (operasjon: string, catenda_id: string) =>
      lager.kvitter('koe_api.kvitter_vedlegg', {
        vedlegg_id: [sql.UniqueIdentifier, vedlegg.vedlegg_id],
        operasjon: [sql.NVarChar(20), operasjon],
        catenda_id: [sql.NVarChar(100), catenda_id],
      });
    let dokumentId = vedlegg.dokument_id;
    if (!dokumentId) {
      dokumentId = await dokument(vedleggsnavn(vedlegg.filnavn, vedlegg.vedlegg_id), async () => {
        const innhold = await lager.vedleggsinnhold(vedlegg.vedlegg_id);
        if (!innhold) throw new UgjennomfoerbarJobb('Innholdet i vedlegget finnes ikke');
        return innhold;
      });
      await kvitterVedlegg('dokument', dokumentId);
    }
    await kvitterVedlegg('dokumentreferanse', await referanse(dokumentId));
  }

  if (oppdrag.dokument === null) {
    await lager.kvitter('koe_api.kvitter_levering', { referanse_id: [sql.NVarChar(100), null] });
    return;
  }
  await lager.fornyLease();
  let dokumentId = jobb.dokument_id;
  if (!dokumentId) {
    dokumentId = await dokument(
      dokumentnavn(oppdrag, jobb.dokumentnoekkel!),
      async () =>
        (await lager.lagret()) ??
        (await lager.lagre((await brevdokument(oppdrag, jobb.dokumentnoekkel!)).innhold))
    );
    await lager.kvitter('koe_api.kvitter_dokument', {
      dokument_id: [sql.NVarChar(100), dokumentId],
    });
  }
  await lager.kvitter('koe_api.kvitter_levering', {
    referanse_id: [sql.NVarChar(100), await referanse(dokumentId)],
  });
}

export interface Jobbkjoerer {
  /** Kjører neste runde straks, for eksempel etter en opprettelse. */
  vekk(): void;
  /** Stopper etter runden som pågår. */
  stopp(): Promise<void>;
}

/** Starter løkka: alle klare jobber, deretter en pause på `intervallMs` eller til `vekk()`. */
export function startJobbkjoerer(
  avh: Jobbavhengigheter,
  intervallMs = POLLEINTERVALL_MS
): Jobbkjoerer {
  const logg = avh.logg ?? console;
  let stoppet = false;
  let vekker: (() => void) | null = null;
  let vekket = false;
  const vent = () =>
    new Promise<void>((ok) => {
      if (vekket || stoppet) return ok();
      const tidtaker = setTimeout(ok, intervallMs);
      vekker = () => {
        clearTimeout(tidtaker);
        ok();
      };
    }).finally(() => {
      vekker = null;
      vekket = false;
    });
  const loekke = (async () => {
    while (!stoppet) {
      try {
        while (!stoppet && (await kjoerEnJobb(avh)));
      } catch (feil) {
        logg.error('Jobbkjøreren feilet:', feil);
      }
      await vent();
    }
  })();
  return {
    vekk() {
      vekket = true;
      vekker?.();
    },
    async stopp() {
      stoppet = true;
      vekker?.();
      await loekke;
    },
  };
}
