/**
 * Jobbkjøreren (L-1a, #741): løkka som gjør jobbene i `koe.jobb` etter commit.
 * Drivmekanismen er arbeidsvalget 18.10 for B-07 i #741: `koe_api.hent_jobb` henter
 * med `READPAST, UPDLOCK` og gir jobben en lease, og løkka i serverprosessen poller.
 * `vekk()` etter en opprettelse korter ventetiden, men det er pollingen som sikrer
 * at jobben blir gjort. Løkka krever en instans som alltid kjører (B-07, B-12).
 *
 * Jobbene er topicen for en ny sak og leveringen av et brev (L-1b, #371).
 * Bare en gyldig lease kvitterer (invariant 7). Et usikkert eller varig avvist
 * utfall parkeres og logges, og driften starter jobben på nytt med `koe_api.start_jobb_paa_nytt`
 * (svaret «Driften» 18.10, #371). Prosedyrene for løkka kjører som
 * `koe_jobbkjoerer` i basen, fordi løkka ikke har noen aktør i konteksten
 * (`database/migrasjoner/20261018100000_jobber.sql`).
 */

import {
  CatendaAvvisning,
  CatendaUtilgjengelig,
  utenBindestreker,
  UsikkertCatendautfall,
  type Dokumentleverandoer,
  type Dokumentmaal,
  type Topicoppretter,
} from './catenda.ts';
import { sql, type Pool } from './datalag.ts';
import { brevdokument } from './levering.ts';

/** Lengre enn tidsavbruddet mot Catenda (15 s) ganger kallene i en levering, med kvitteringen. */
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

/** Meldingene fra catenda.ts og fra kjøreren har ingen svarkropp eller token; andre feil lagres ikke. */
function utfallAv(feil: unknown): { utfall: Utfall; melding: string } {
  const melding =
    feil instanceof CatendaUtilgjengelig || feil instanceof UgjennomfoerbarJobb
      ? feil.message
      : 'Uventet feil i jobben';
  if (feil instanceof UsikkertCatendautfall) return { utfall: 'usikkert', melding };
  if (feil instanceof CatendaAvvisning || feil instanceof UgjennomfoerbarJobb)
    return { utfall: 'avvist', melding };
  return { utfall: 'feilet', melding };
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

  const kvitter = async (prosedyre: string, felt: string, verdi: string) => {
    try {
      await avh.datalag
        .request()
        .input('lease', sql.UniqueIdentifier, jobb.lease)
        .input(felt, sql.NVarChar(100), verdi)
        .execute(prosedyre);
    } catch (feil) {
      // Endringen finnes i Catenda uten kvittering; neste henting parkerer jobben som usikker.
      logg.error(
        `Jobben ${jobb.jobb_id} fikk ${verdi} fra Catenda, men kvitteringen ble avvist:`,
        feil
      );
      throw new AvvistKvittering('Kvitteringen ble avvist', { cause: feil });
    }
  };

  try {
    if (jobb.jobbtype === 'catenda_topic') {
      const topic = await avh.catenda.opprettTopic(jobb.catenda_board_id!, {
        tittel: jobb.tittel!,
        beskrivelse: `Saken i endringsappen: ${avh.saksadresse(jobb.prosjekt_id, jobb.sak_id)}`,
      });
      await kvitter('koe_api.kvitter_topic', 'topic_id', topic);
      logg.info(`Jobben ${jobb.jobb_id} laget topicen ${topic} for saken ${jobb.sak_id}.`);
    } else if (jobb.jobbtype === 'levering') {
      const referanse = await leverBrev(avh.dokumenter, jobb, kvitter);
      logg.info(`Jobben ${jobb.jobb_id} leverte brevet med referansen ${referanse} på topicen.`);
    } else {
      throw new UgjennomfoerbarJobb(`Jobbtypen ${jobb.jobbtype} er ukjent for kjøreren`);
    }
  } catch (feil) {
    if (feil instanceof AvvistKvittering) throw feil.cause;
    const { utfall, melding } = utfallAv(feil);
    if (utfall === 'feilet') logg.warn(`Jobben ${jobb.jobb_id} feilet og prøves igjen:`, feil);
    else
      logg.error(
        `Jobben ${jobb.jobb_id} er parkert som ${utfall} (${melding}). Driften starter den på nytt.`
      );
    await avh.datalag
      .request()
      .input('lease', sql.UniqueIdentifier, jobb.lease)
      .input('utfall', sql.NVarChar(20), utfall)
      .input('melding', sql.NVarChar(400), melding)
      .execute('koe_api.registrer_jobbfeil');
  }
  return true;
}

/**
 * Leverer brevet (B-03, #371): dokumentet i biblioteket, så referansen på topicen,
 * hver operasjon kvittert for seg. Hvert steg avstemmes først, mot navnet i
 * biblioteket og mot referansene på topicen, så et forsøk etter en omstart ikke lager
 * et dokument eller en referanse til.
 */
async function leverBrev(
  catenda: Dokumentleverandoer,
  jobb: Jobbrad,
  kvitter: (prosedyre: string, felt: string, verdi: string) => Promise<void>
): Promise<string> {
  let dokumentId = jobb.dokument_id;
  if (!dokumentId) {
    const oppdrag = JSON.parse(jobb.oppdrag!) as Record<string, unknown>;
    const maal = oppdrag.maal as Dokumentmaal;
    const dokument = brevdokument(oppdrag, jobb.dokumentnoekkel!);
    if (!dokument) throw new UgjennomfoerbarJobb('Brevet har ingen tekst fra appen');
    dokumentId =
      (await catenda.finnDokument(maal, dokument.navn)) ??
      (await catenda.lastOppDokument(maal, dokument)) ??
      (await catenda.finnDokument(maal, dokument.navn));
    if (!dokumentId) throw new CatendaUtilgjengelig('Dokumentet finnes, men ble ikke funnet');
    await kvitter('koe_api.kvitter_dokument', 'dokument_id', dokumentId);
  }
  const board = jobb.topic_board_id!;
  const topic = jobb.topic_id!;
  const funnet = (await catenda.dokumentreferanser(board, topic)).find(
    (r) => r.dokumentId === utenBindestreker(dokumentId)
  );
  const referanse =
    funnet?.id ?? (await catenda.opprettDokumentreferanse(board, topic, dokumentId));
  await kvitter('koe_api.kvitter_levering', 'referanse_id', referanse);
  return referanse;
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
