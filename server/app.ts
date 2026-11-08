/**
 * TS-serveren for KOE-sakene (B-18), med kjernen i `kjerne/` som eneste
 * regelkilde. Skiva i #347: et krav fra skjemaet går gjennom tilgangskontrollen
 * og kjernen til journalen og leveringsoppdraget, og tilbake til visningen.
 *
 * Hver inngang står i `RUTER` med tilgangen den krever. Ruteren kontrollerer
 * innlogging (med CSRF), prosjekttilgang og kontraktsrolle fra registeret før
 * behandleren kalles, så en behandler ikke kan glemme dem. En inngang uten
 * prosjekt eller uten sesjon står i registeret med en skriftlig begrunnelse,
 * og det gjør også en inngang til prosjektet selv, uten sak. Hvert område har sin modul med ruter, som `innlogging.ts`. Testen i
 * `tester/register.test.ts` prøver hver inngang i registeret over HTTP.
 *
 * Leveringen stopper ved det frosne oppdraget og kaller ikke Catenda (#371). En ny
 * sak får topicen i Catenda av jobbkjøreren i `jobber.ts` etter commit (#741).
 */

import { randomUUID } from 'node:crypto';
import { STATUS_CODES, type IncomingMessage, type ServerResponse } from 'node:http';
import { KJERNE } from '../kjerne/versjon.ts';
import { ulagringsbarTekst } from '../kjerne/format/skjema.ts';
import {
  krevInnlogging,
  krevKontraktsrolle,
  krevLesing,
  krevProsjekttilgang,
  krevSesjon,
  Nektet,
  UTEN_STI,
  type FraSti,
} from './autorisasjon.ts';
import { INNLOGGINGSRUTER } from './innlogging.ts';
import { feilsvar, FOR_STOR, lesInntil, loggFeil, reserveFor, svarhoder } from './inngang.ts';
import { PROSJEKTRUTER } from './prosjekter.ts';
import { SAKSLISTERUTER } from './saksliste.ts';
import { lesFil, VEDLEGG_FOER_SAKEN, VEDLEGGSRUTER } from './vedlegg.ts';
import { BREVRUTER } from './brev.ts';
import { WEBHOOKRUTER } from './webhook.ts';
import { KJERNERUTER, OPPRETTELSE, SAKSKODE_FOR_NY_SAK } from './saker.ts';
import {
  erAapen,
  erOpprettelse,
  erUtenProsjekt,
  erUtenSak,
  medSide,
  uventet,
  type Avhengigheter,
  type Felles,
  type Opprettelsesrute,
  type Prosjektrute,
  type Rute,
  type Saksrute,
  type Svar,
  type Tilgang,
} from './rutetyper.ts';

// Midlertidig for `saksliste.ts`, som eies av #1695: fjernes når importen der er flyttet til `rutetyper.ts`.
export type { Avhengigheter, Prosjektforespoersel, Rute, Svar } from './rutetyper.ts';

const STORSTE_KROPP = 1_000_000;

async function lesKropp(
  foresporsel: IncomingMessage
): Promise<{ verdi: unknown } | { feil: Nektet }> {
  const kropp = await lesInntil(foresporsel, STORSTE_KROPP);
  if (!kropp) return { feil: new Nektet(413, ...FOR_STOR) };
  const tekst = kropp.toString('utf8');
  if (!tekst) return { verdi: {} };
  let verdi: unknown;
  try {
    verdi = JSON.parse(tekst);
  } catch {
    return { feil: new Nektet(400, 'UGYLDIG_FORESPOERSEL', 'Kroppen er ikke gyldig JSON.') };
  }
  const galt = kroppsfeil(verdi);
  // Kroppen gis ikke til tilgangskontrollen; den avvises etter kontrollen, som ugyldig JSON.
  return galt ? { feil: new Nektet(400, 'UGYLDIG_FORESPOERSEL', galt) } : { verdi };
}

/** Dypere enn dette har ingen kommando. */
const STORSTE_DYBDE = 32;

/** Hva som er galt med innholdet i kroppen. Uten rekursjon, så dyp nesting ikke sprenger stakken. */
function kroppsfeil(verdi: unknown): string | null {
  const igjen: [unknown, number][] = [[verdi, 0]];
  while (igjen.length) {
    const [v, dybde] = igjen.pop()!;
    if (dybde > STORSTE_DYBDE) return 'Kroppen er for dypt nestet.';
    if (typeof v === 'string' && ulagringsbarTekst(v))
      return 'Teksten har tegn som ikke kan lagres.';
    if (v !== null && typeof v === 'object')
      for (const [k, del] of Object.entries(v)) igjen.push([k, dybde + 1], [del, dybde + 1]);
  }
  return null;
}
/** Registeret over inngangene. En ny inngang står her, ellers finnes den ikke. */
export const RUTER: readonly Rute[] = [
  ...KJERNERUTER,
  ...VEDLEGGSRUTER,
  ...BREVRUTER,
  OPPRETTELSE,
  SAKSKODE_FOR_NY_SAK,
  ...VEDLEGG_FOER_SAKEN,
  ...INNLOGGINGSRUTER,
  ...PROSJEKTRUTER,
  ...SAKSLISTERUTER,
  ...WEBHOOKRUTER,
];

export function lagServer(avh: Avhengigheter) {
  const full: Required<Avhengigheter> = {
    kjerne: KJERNE,
    tidspunkt: () => new Date(),
    nyId: randomUUID,
    vekkJobbkjoereren: () => {},
    ...avh,
    innlogging: avh.innlogging ?? null,
    webhook: avh.webhook ?? null,
  };

  /**
   * Innloggingen, prosjekttilgangen og kontraktsrollen fra registeret, og kroppen,
   * i én rekkefølge for hver inngang med prosjekt (#825). Uten sak i stien prøves
   * bare sakene kroppen viser til.
   */
  async function tilgangOgKropp(
    tilgang: Tilgang | Prosjektrute['tilgang'],
    metode: Felles['metode'],
    foresporsel: IncomingMessage,
    fraSti: FraSti,
    fil = false
  ) {
    // Innloggingen først, så en uinnlogget forespørsel ikke får kroppen lest og tolket.
    // En kropp som ikke kan leses, avvises etter tilgangskontrollen, som i Flask.
    const bruker = await krevInnlogging(full.datalag, foresporsel);
    const innhold = metode === 'GET' || fil ? { verdi: {} } : await lesKropp(foresporsel);
    const krav = 'kontraktsrolle' in tilgang ? tilgang.kontraktsrolle : undefined;
    const { side, ...prosjekt } = await krevProsjekttilgang(
      full.datalag,
      full.catenda,
      foresporsel,
      bruker,
      tilgang.prosjektrolle,
      'feil' in innhold ? {} : innhold.verdi,
      fraSti,
      async (t) =>
        krav === 'kreves'
          ? krevKontraktsrolle(full.datalag, full.catenda, t)
          : krav === 'lesing'
            ? krevLesing(full.datalag, full.catenda, t)
            : null
    );
    if ('feil' in innhold) throw innhold.feil;
    // `krevProsjekttilgang` har avvist en kropp som ikke er et objekt (403).
    const kropp = innhold.verdi as Record<string, unknown>;
    return { bruker, prosjekt, side, kropp };
  }

  async function saksrute(
    r: Saksrute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    let sakId: string;
    let ressurs: string | null;
    try {
      sakId = decodeURIComponent(treff[1]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent sak.');
    }
    try {
      ressurs = treff[2] === undefined ? null : decodeURIComponent(treff[2]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent ressurs i saken.');
    }
    const f = await tilgangOgKropp(r.tilgang, r.metode, foresporsel, { sakId }, r.fil);
    const fil = r.fil ? await lesFil(foresporsel, f.side) : null;
    return r.behandle({ ...f, sakId, ressurs, fil }, full);
  }

  async function opprettelsesrute(
    r: Opprettelsesrute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    let ressurs: string | null;
    try {
      ressurs = treff[1] === undefined ? null : decodeURIComponent(treff[1]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent ressurs.');
    }
    const f = await tilgangOgKropp(r.tilgang, r.metode, foresporsel, UTEN_STI, r.fil);
    if (r.bareTE !== undefined && f.side?.rolle !== 'TE')
      return feilsvar(403, 'FORBIDDEN', r.bareTE);
    const fil = r.fil ? await lesFil(foresporsel, f.side) : null;
    return r.behandle({ ...f, side: medSide(f.side), ressurs, fil }, full);
  }

  async function prosjektrute(
    r: Prosjektrute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    let prosjektId: string;
    let ressurs: string | null;
    try {
      prosjektId = decodeURIComponent(treff[1]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent prosjekt.');
    }
    try {
      ressurs = treff[2] === undefined ? null : decodeURIComponent(treff[2]);
    } catch {
      return feilsvar(404, 'NOT_FOUND', 'Ukjent ressurs i prosjektet.');
    }
    const { bruker, prosjekt, side, kropp } = await tilgangOgKropp(
      r.tilgang,
      r.metode,
      foresporsel,
      { prosjektId }
    );
    return r.behandle({ bruker, prosjekt, side, ressurs, kropp }, full);
  }

  async function kjoer(
    r: Rute,
    treff: RegExpMatchArray,
    foresporsel: IncomingMessage
  ): Promise<Svar> {
    if (erAapen(r)) return r.behandle(foresporsel, full, treff);
    if (erUtenProsjekt(r)) return r.behandle(await krevSesjon(full.datalag, foresporsel), full);
    if (erUtenSak(r)) return prosjektrute(r, treff, foresporsel);
    if (erOpprettelse(r)) return opprettelsesrute(r, treff, foresporsel);
    return saksrute(r, treff, foresporsel);
  }

  return async function behandle(foresporsel: IncomingMessage, respons: ServerResponse) {
    // Stien leses som den står; `URL.parse` ville lest `//x/api/…` som verten `x` (#763 punkt 6).
    const pathname = (foresporsel.url ?? '/').split('?')[0];
    const metode = foresporsel.method ?? 'GET';
    let funnet: { r: Rute; treff: RegExpMatchArray } | null = null;
    for (const r of RUTER) {
      const treff = pathname.match(r.sti);
      if (treff && r.metode === metode) funnet = { r, treff };
      if (funnet) break;
    }
    let svar: Svar = uventet();
    try {
      svar = funnet
        ? await kjoer(funnet.r, funnet.treff, foresporsel)
        : feilsvar(404, 'NOT_FOUND', 'Ukjent rute.');
    } catch (feil) {
      if (feil instanceof Nektet) svar = [feil.status, feil.kropp];
      else loggFeil(`${metode} ${funnet?.r.sti} feilet`, feil);
    }
    const [status, kropp] = svar;
    // Et hode Node ikke godtar, eller en kropp som ikke kan serialiseres, gir 500 (#716 punkt 2),
    // eller reservesvaret behandleren ga for en skriving som er lagret (#893).
    let tekst: string | Buffer | undefined;
    try {
      tekst = kropp === null ? undefined : Buffer.isBuffer(kropp) ? kropp : JSON.stringify(kropp);
      respons.writeHead(status, svarhoder(svar, funnet?.r.hoder));
    } catch (feil) {
      loggFeil('Svaret kunne ikke skrives', feil);
      const reserve = (reserveFor(svar) ?? uventet)();
      tekst = JSON.stringify(reserve[1]);
      // Node beholder årsaksfrasen fra det første forsøket, og rutens hoder gjelder også dette svaret.
      // Er det rutens hoder Node ikke godtar, skrives svaret uten dem, så klienten får et svar.
      const skriv = (rute?: Record<string, string>) =>
        respons.writeHead(reserve[0], STATUS_CODES[reserve[0]], svarhoder(reserve, rute));
      try {
        skriv(funnet?.r.hoder);
      } catch (igjen) {
        loggFeil('Reservesvaret kunne ikke skrives med rutens hoder', igjen);
        skriv(undefined);
      }
    }
    respons.end(tekst);
  };
}
