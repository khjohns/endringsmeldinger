/**
 * Mottaket for webhooken fra Catenda (W-1a, #819): hendelsen lagres i
 * `koe.innkommende_hendelse` før svaret 200, og samme `event.id` lagres én gang
 * (INT-02). Behandlingen kommer i W-1b.
 *
 * Catenda signerer ikke kallet. Kontrollen er den hemmelige stien
 * `/webhook/catenda/{hemmelighet}`, som Python-stien bruker
 * (`backend/routes/catenda_webhook_routes.py`), sammenlignet i konstant tid (INT-01).
 * Stien står aldri i en logg.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { AapenRute, Svar } from './app.ts';
import { feilnummer, sql, utenKontekst, type Pool as Datalag } from './datalag.ts';
import { lesInntil } from './inngang.ts';

export interface Webhook {
  hemmelighet: string;
}

/** Kortere enn dette kan gjettes; da er mottaket ikke satt opp. */
const KORTESTE_HEMMELIGHET = 32;

/** Variabelen er den samme som i Python, så adressen registrert i Catenda gjelder for begge. */
export function webhookFraMiljoe(miljoe: NodeJS.ProcessEnv = process.env): Webhook {
  const hemmelighet = miljoe.WEBHOOK_SECRET_PATH ?? '';
  if (hemmelighet.length < KORTESTE_HEMMELIGHET)
    throw new Error(
      `WEBHOOK_SECRET_PATH mangler eller er kortere enn ${KORTESTE_HEMMELIGHET} tegn`
    );
  if (!/^[A-Za-z0-9_-]+$/.test(hemmelighet))
    throw new Error('WEBHOOK_SECRET_PATH kan bare ha bokstavene a–z, sifre, - og _');
  return { hemmelighet };
}

const sum = (tekst: string) => createHash('sha256').update(tekst, 'utf8').digest();

/** Like summer har lik lengde, så sammenligningen tar like lang tid uansett hva som er sendt. */
const rettHemmelighet = (mottatt: string, forventet: string) =>
  timingSafeEqual(sum(mottatt), sum(forventet));

/** Catendas hendelser er noen få kilobyte. */
export const STOERSTE_HENDELSE = 256 * 1024;

const STI = /^\/webhook\/catenda\/([^/]+)$/;

const svar = (status: number, error: string, message: string): Svar => [
  status,
  { success: false, error, message },
];
/** Samme svar som for en sti som ikke finnes, så en feil hemmelighet ikke skiller seg ut. */
const ukjent = () => svar(404, 'NOT_FOUND', 'Ukjent rute.');
const ugyldig = (melding: string) => svar(400, 'UGYLDIG_FORESPOERSEL', melding);

/** Basen avviste raden i en kontroll (547), for eksempel kroppen som ikke er JSON etter `ISJSON`. */
const KONTROLL = 547;

/** En ID eller type fra Catenda: synlige ASCII-tegn, som tegnklassen i tabellen krever. */
const erKode = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 100 && /^[!-~]+$/.test(v);

/** `event.id` og `event.type`, eller hva som mangler. */
export function hendelsen(tekst: string): { id: string; type: string } | { feil: string } {
  let verdi: unknown;
  try {
    verdi = JSON.parse(tekst);
  } catch {
    return { feil: 'Kroppen er ikke gyldig JSON.' };
  }
  const event = (verdi as { event?: unknown } | null)?.event as
    | { id?: unknown; type?: unknown }
    | undefined;
  if (typeof verdi !== 'object' || Array.isArray(verdi) || typeof event !== 'object' || !event)
    return { feil: 'Kroppen mangler event.' };
  if (!erKode(event.id)) return { feil: 'event.id mangler eller er ugyldig.' };
  if (!erKode(event.type)) return { feil: 'event.type mangler eller er ugyldig.' };
  return { id: event.id, type: event.type };
}

/** Lagrer hendelsen, og gir `true` når den er ny. */
export async function mottaHendelse(
  datalag: Datalag,
  hendelse: { id: string; type: string },
  kropp: string
): Promise<boolean> {
  const { output } = await utenKontekst(datalag)
    .input('kilde', sql.NVarChar(4000), 'catenda')
    .input('hendelse_id', sql.NVarChar(4000), hendelse.id)
    .input('hendelsestype', sql.NVarChar(4000), hendelse.type)
    .input('kropp', sql.NVarChar(sql.MAX), kropp)
    .output('ny', sql.Bit)
    .execute('koe_api.motta_hendelse');
  return output.ny === true;
}

async function taImot(
  foresporsel: IncomingMessage,
  datalag: Datalag,
  webhook: Webhook | null
): Promise<Svar> {
  const mottatt = (foresporsel.url ?? '').split('?')[0].match(STI)?.[1] ?? '';
  if (!webhook || !rettHemmelighet(mottatt, webhook.hemmelighet)) return ukjent();
  const bytes = await lesInntil(foresporsel, STOERSTE_HENDELSE);
  if (!bytes) return svar(413, 'PAYLOAD_TOO_LARGE', 'Forespørselen er for stor.');
  let tekst: string;
  try {
    tekst = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return ugyldig('Kroppen er ikke UTF-8.');
  }
  const hendelse = hendelsen(tekst);
  if ('feil' in hendelse) return ugyldig(hendelse.feil);
  try {
    const ny = await mottaHendelse(datalag, hendelse, tekst);
    return [200, { success: true, status: ny ? 'mottatt' : 'allerede_mottatt' }];
  } catch (feil) {
    if (feilnummer(feil) === KONTROLL) return ugyldig('Basen avviste kroppen.');
    throw feil;
  }
}

export const WEBHOOKRUTER: readonly AapenRute[] = [
  {
    metode: 'POST',
    sti: STI,
    eksempel: () => '/webhook/catenda/<hemmelighet>',
    tilgang: {
      utenSesjon:
        'Catenda kaller uten sesjon. Den hemmelige stien er kontrollen (INT-01), og hendelsen lagres bare i innboksen.',
    },
    behandle: (foresporsel, avh) => taImot(foresporsel, avh.datalag, avh.webhook),
  },
];
