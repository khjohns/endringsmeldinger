/**
 * Mottaket for webhooken fra Catenda (W-1a, #819): hendelsen lagres i
 * `koe.innkommende_hendelse` før svaret 200, og samme `event.id` lagres én gang
 * (INT-02). Jobbløkka behandler den (`server/hendelser.ts`).
 *
 * Catenda signerer ikke kallet. Kontrollen er den hemmelige stien
 * `/webhook/catenda/{hemmelighet}`, som Python-stien bruker
 * (`backend/routes/catenda_webhook_routes.py`), sammenlignet i konstant tid (INT-01).
 * Stien står aldri i en logg.
 */

import { korrelasjonsId, loggAdvarsel, loggInfo } from './logg.ts';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { AapenRute, Svar } from './rutetyper.ts';
import { feilnummer, sql, utenKontekst, type Pool as Datalag } from './datalag.ts';
import { feilsvar, FOR_STOR, lesInntil, ugyldig } from './inngang.ts';

export interface Webhook {
  hemmelighet: string;
  /**
   * Den forrige hemmeligheten, som gjelder ved siden av mens den byttes i Catenda, med en egen
   * grense, så kall med den ikke kan stenge ute leveringene på den nye (#1059).
   */
  forrige?: { hemmelighet: string; grense: Kallgrense };
  grense: Kallgrense;
}

export interface Kallgrense {
  /** Sann når kallet er innenfor grensen, og telles da. */
  tillat(naa?: number): boolean;
}

/**
 * Høyst `perMinutt` kall i hvert minutt, som `limit_webhook` i Python (fast vindu, #819).
 * Python teller per adresse. Her telles alle kall med rett hemmelighet samlet, fordi
 * avsenderens adresse bak en mellomtjener ikke kan prøves.
 */
export function kallgrense(perMinutt: number): Kallgrense {
  let vindu = -1;
  let antall = 0;
  return {
    tillat(naa = Date.now()) {
      const dette = Math.floor(naa / 60_000);
      if (dette !== vindu) {
        vindu = dette;
        antall = 0;
      }
      if (antall >= perMinutt) return false;
      antall += 1;
      return true;
    },
  };
}

/** Kortere enn dette kan gjettes; da er mottaket ikke satt opp. */
const KORTESTE_HEMMELIGHET = 32;

function hemmelighetFra(miljoe: NodeJS.ProcessEnv, variabel: string): string {
  const hemmelighet = miljoe[variabel] ?? '';
  if (hemmelighet.length < KORTESTE_HEMMELIGHET)
    throw new Error(`${variabel} mangler eller er kortere enn ${KORTESTE_HEMMELIGHET} tegn`);
  if (!/^[A-Za-z0-9_-]+$/.test(hemmelighet))
    throw new Error(`${variabel} kan bare ha bokstavene a–z, sifre, - og _`);
  return hemmelighet;
}

/**
 * `WEBHOOK_SECRET_PATH` er variabelen fra Python, så adressen registrert i Catenda gjelder for
 * begge. `WEBHOOK_SECRET_PATH_FORRIGE` er valgfri: den forrige hemmeligheten, som også godtas
 * til den er byttet i Catenda og variabelen fjernes (#1059). En ugyldig forrige hemmelighet
 * brukes ikke, med en advarsel, og slår ikke av mottaket for den nye.
 */
export function webhookFraMiljoe(miljoe: NodeJS.ProcessEnv = process.env): Webhook {
  const hemmelighet = hemmelighetFra(miljoe, 'WEBHOOK_SECRET_PATH');
  const perMinutt = Number(miljoe.RATE_LIMIT_WEBHOOK ?? '100');
  if (!Number.isInteger(perMinutt) || perMinutt < 1)
    throw new Error('RATE_LIMIT_WEBHOOK må være et heltall ≥ 1');
  let forrige: Webhook['forrige'];
  if (miljoe.WEBHOOK_SECRET_PATH_FORRIGE)
    try {
      forrige = {
        hemmelighet: hemmelighetFra(miljoe, 'WEBHOOK_SECRET_PATH_FORRIGE'),
        grense: kallgrense(perMinutt),
      };
    } catch {
      loggAdvarsel('Den forrige webhook-hemmeligheten er ugyldig og brukes ikke', {
        hindringer: ['WEBHOOK_SECRET_PATH_FORRIGE'],
      });
    }
  return { hemmelighet, ...(forrige ? { forrige } : {}), grense: kallgrense(perMinutt) };
}

const sum = (tekst: string) => createHash('sha256').update(tekst, 'utf8').digest();

/** Like summer har lik lengde, så sammenligningen tar like lang tid uansett hva som er sendt. */
const lik = (mottatt: string, forventet: string) => timingSafeEqual(sum(mottatt), sum(forventet));

/**
 * Grensen for hemmeligheten kallet har, eller `null` for en feil hemmelighet. Begge
 * sammenligningene gjøres, så tiden ikke sier hvilken hemmelighet som traff.
 */
function grenseForHemmelighet(mottatt: string, webhook: Webhook): Kallgrense | null {
  const naa = lik(mottatt, webhook.hemmelighet);
  const foer = lik(mottatt, webhook.forrige?.hemmelighet ?? webhook.hemmelighet);
  if (naa) return webhook.grense;
  if (foer && webhook.forrige) {
    loggInfo('Webhooken ble kalt med den forrige hemmeligheten');
    return webhook.forrige.grense;
  }
  return null;
}

/** Catendas hendelser er noen få kilobyte. */
export const STOERSTE_HENDELSE = 256 * 1024;

const STI = /^\/webhook\/catenda\/([^/]+)$/;

/** Samme svar som for en sti som ikke finnes, så en feil hemmelighet ikke skiller seg ut. */
const ukjent = () => feilsvar(404, 'NOT_FOUND', 'Ukjent rute.');

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
    .input('korrelasjons_id', sql.UniqueIdentifier, korrelasjonsId() ?? null)
    .output('ny', sql.Bit)
    .execute('koe_api.motta_hendelse');
  return output.ny === true;
}

async function taImot(
  foresporsel: IncomingMessage,
  datalag: Datalag,
  webhook: Webhook | null,
  mottatt: string
): Promise<Svar> {
  const grense = webhook && grenseForHemmelighet(mottatt, webhook);
  if (!grense) return ukjent();
  // Etter hemmeligheten, så kall med feil sti ikke kan stenge ute leveringene fra Catenda.
  if (!grense.tillat())
    return feilsvar(429, 'RATE_LIMITED', 'For mange kall. Prøv igjen om et minutt.');
  const bytes = await lesInntil(foresporsel, STOERSTE_HENDELSE);
  if (!bytes) return feilsvar(413, ...FOR_STOR);
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
        'Catenda kaller uten sesjon. Den hemmelige stien er kontrollen (INT-01), kallene er begrenset per minutt, og hendelsen lagres bare i innboksen.',
    },
    behandle: (foresporsel, avh, treff) => taImot(foresporsel, avh.datalag, avh.webhook, treff[1]),
  },
];
