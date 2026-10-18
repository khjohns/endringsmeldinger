/**
 * Jobbkjøreren (L-1a, #741): løkka som gjør jobbene i `koe.jobb` etter commit.
 * Drivmekanismen er arbeidsvalget 18.10 for B-07 i #741: `koe_api.hent_jobb` henter
 * med `READPAST, UPDLOCK` og gir jobben en lease, og løkka i serverprosessen poller.
 * `vekk()` etter en opprettelse korter ventetiden, men det er pollingen som sikrer
 * at jobben blir gjort. Løkka krever en instans som alltid kjører (B-07, B-12).
 *
 * Bare en gyldig lease kvitterer (invariant 7). Et usikkert utfall parkeres og
 * logges, og driften starter jobben på nytt med `koe_api.start_jobb_paa_nytt`
 * (svaret «Driften» 18.10, #371). Prosedyrene for løkka kjører som
 * `koe_jobbkjoerer` i basen, fordi løkka ikke har noen aktør i konteksten
 * (`database/migrasjoner/20261018100000_jobber.sql`).
 */

import { CatendaUtilgjengelig, UsikkertUtfall, type Topicoppretter } from './catenda.ts';
import { sql, type Pool } from './datalag.ts';

/** Lengre enn tidsavbruddet mot Catenda (15 s), med kvitteringen etterpå. */
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
}

export interface Jobbavhengigheter {
  datalag: Pool;
  catenda: Topicoppretter;
  /** Adressen til saken i appen, for beskrivelsen i topicen (#741 punkt 15). */
  saksadresse: (prosjektId: string, sakId: string) => string;
  logg?: Pick<Console, 'info' | 'warn' | 'error'>;
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
  if (jobb.jobbtype !== 'catenda_topic')
    throw new Error(`Jobben ${jobb.jobb_id} har en ukjent jobbtype: ${jobb.jobbtype}`);

  let topic: string;
  try {
    topic = await avh.catenda.opprettTopic(jobb.catenda_board_id!, {
      tittel: jobb.tittel!,
      beskrivelse: `Saken i endringsappen: ${avh.saksadresse(jobb.prosjekt_id, jobb.sak_id)}`,
    });
  } catch (feil) {
    const usikkert = feil instanceof UsikkertUtfall;
    // Meldingene fra catenda.ts har ingen svarkropp eller token; andre feil lagres ikke.
    const melding =
      feil instanceof CatendaUtilgjengelig ? feil.message : 'Uventet feil før kallet til Catenda';
    if (usikkert)
      logg.error(
        `Jobben ${jobb.jobb_id} er parkert: topicen kan være laget i Catenda (${melding}).`
      );
    else logg.warn(`Jobben ${jobb.jobb_id} feilet og prøves igjen:`, feil);
    await avh.datalag
      .request()
      .input('lease', sql.UniqueIdentifier, jobb.lease)
      .input('usikkert', sql.Bit, usikkert)
      .input('melding', sql.NVarChar(400), melding)
      .execute('koe_api.registrer_jobbfeil');
    return true;
  }
  try {
    await avh.datalag
      .request()
      .input('lease', sql.UniqueIdentifier, jobb.lease)
      .input('topic_id', sql.NVarChar(100), topic)
      .execute('koe_api.kvitter_topic');
  } catch (feil) {
    // Topicen finnes i Catenda uten kvittering; neste henting parkerer jobben som usikker.
    logg.error(`Jobben ${jobb.jobb_id} laget topicen ${topic}, men kvitteringen ble avvist:`, feil);
    throw feil;
  }
  logg.info(`Jobben ${jobb.jobb_id} laget topicen ${topic} for saken ${jobb.sak_id}.`);
  return true;
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
