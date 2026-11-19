import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { feilnummer } from './sqlfeil.ts';

type Loggkontekst = {
  korrelasjons_id: string;
  aktor_id?: string;
  prosjekt_id?: string;
  jobb_id?: string;
  innkommende_hendelse_id?: string;
};

const lager = new AsyncLocalStorage<Loggkontekst>();

export function medLoggkontekst<T>(arbeid: () => T, kjent: Partial<Loggkontekst> = {}): T {
  return lager.run({ ...kjent, korrelasjons_id: kjent.korrelasjons_id ?? randomUUID() }, arbeid);
}

export const korrelasjonsId = () => lager.getStore()?.korrelasjons_id;

export function tilgangsfelter(): Pick<Loggkontekst, 'aktor_id' | 'prosjekt_id'> {
  const { aktor_id, prosjekt_id } = lager.getStore() ?? {};
  return { aktor_id, prosjekt_id };
}

export function kjenteLoggfelter(kjent: Pick<Loggkontekst, 'aktor_id' | 'prosjekt_id'>): void {
  const kontekst = lager.getStore();
  if (kontekst) Object.assign(kontekst, kjent);
}

type Nivaa = 'info' | 'warn' | 'error';
export type Loggmottaker = Record<Nivaa, (linje: string) => void>;

type Loggfelter = {
  adresse?: string;
  antall?: number;
  utfall?: string;
  statuskode?: number;
  rute?: string;
};

function skrivLogg(
  nivaa: Nivaa,
  sted: string,
  felt:
    | Loggfelter
    | {
        feilklasse: string;
        feilnummer?: number;
        feilkode?: string;
        kallstakk?: string[];
      },
  mottaker: Loggmottaker = console
): void {
  mottaker[nivaa](
    JSON.stringify({
      tidspunkt: new Date().toISOString(),
      nivaa,
      sted,
      ...(lager.getStore() ?? { korrelasjons_id: randomUUID() }),
      ...felt,
    })
  );
}

export function loggInfo(sted: string, felt?: Loggfelter, mottaker?: Loggmottaker): void {
  skrivLogg('info', sted, felt ?? {}, mottaker);
}

export function loggAdvarsel(sted: string, felt?: Loggfelter): void {
  skrivLogg('warn', sted, felt ?? {});
}

/** En kode fra Node, `tedious` eller `mssql`, som `ETIMEOUT` eller `UND_ERR_SOCKET`. */
const KODE = /^[A-Z][A-Z0-9_]{0,39}$/;

/**
 * Logger en feil serveren ikke kan svare på annet enn generelt: stedet,
 * feilklassen, feilnummeret fra basen, eller koden når feilen ikke har et nummer,
 * og kallstakken, uten meldingen. Meldingen kan bære et token, et navn eller et
 * svar fra Catenda (CLAUDE.md, #867 punkt 5). Koden skiller et tidsavbrudd fra en
 * lukket forbindelse og en parameterfeil (#926).
 */
export function loggFeil(
  hvor: string,
  feil: unknown,
  nivaa: 'error' | 'warn' = 'error',
  mottaker?: Loggmottaker
): void {
  skrivLogg(nivaa, hvor, feilfelter(feil), mottaker);
}

function feilfelter(feil: unknown) {
  const standard = { feilklasse: typeof feil };
  try {
    const prototype = feil == null ? null : Object.getPrototypeOf(feil);
    const navn: unknown = prototype?.constructor?.name;
    const klasse =
      typeof navn === 'string' && /^[A-Za-z0-9_$]{1,64}$/.test(navn) ? navn : standard.feilklasse;
    const indre = (feil as { cause?: unknown } | null)?.cause;
    const nummer = feilnummer(feil) ?? feilnummer(indre);
    const kode =
      (feil as { code?: unknown } | null)?.code ?? (indre as { code?: unknown } | null)?.code;
    const rammer = rammene(feil);
    return {
      feilklasse: klasse,
      ...(nummer !== undefined
        ? { feilnummer: nummer }
        : typeof kode === 'string' && KODE.test(kode)
          ? { feilkode: kode }
          : {}),
      ...(rammer ? { kallstakk: rammer.split('\n') } : {}),
    };
  } catch {
    return standard;
  }
}

/**
 * En ramme fra V8: `at sted (fil:linje:kolonne)` eller `at fil:linje:kolonne`, også
 * med mellomrom i stien og som eval-ramme, `at eval (eval at f (fil:1:1), <anonymous>:1:1)`.
 */
const RAMME = /^\s+at (?:.* \((?:.+:\d+:\d+|<anonymous>|native|index \d+)\)|.+:\d+:\d+)$/;

/**
 * Rammene i kallstakken, uten hodet med navnet og meldingen, der en linje også kan
 * begynne med «at». Hodet lages som `Error.prototype.toString`, også i formen
 * `navn [kode]: melding` for Nodes egne feil. Står ikke et av dem alene på
 * første linje eller linjene, gis ingen rammer, og bare linjer med en plassering
 * regnes som rammer.
 */
function rammene(feil: unknown): string {
  try {
    const { stack, name, message, code } = feil as Error & { code?: unknown };
    if (typeof stack !== 'string') return '';
    const melding = message === undefined ? '' : String(message);
    const hode = (navn: string) => (!navn ? melding : !melding ? navn : `${navn}: ${melding}`);
    const navn = name === undefined ? 'Error' : String(name);
    const hoder = [hode(navn)];
    if (typeof code === 'string') hoder.push(hode(`${navn} [${code}]`));
    const funnet = hoder.find(
      (h) => stack.startsWith(h) && (stack.length === h.length || stack[h.length] === '\n')
    );
    if (funnet === undefined) return '';
    return stack
      .slice(funnet.length)
      .split('\n')
      .filter((l) => RAMME.test(l))
      .join('\n');
  } catch {
    return '';
  }
}
