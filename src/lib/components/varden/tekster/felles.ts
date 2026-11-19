import { PARTENS, stor } from '#kjerne/frosset/brevdeler.ts';
import { KORRESPONDANSETYPEN } from '#kjerne/frosset/tekst.ts';
import type { Betegnelse } from '#kjerne/utledning/visning.ts';
import type { Korrespondansetype, Oppgjoersform, Part, Spor } from '#kjerne/typer.ts';
import { OPPGJOERSHJEMMEL } from '#kjerne/spor/vederlag/format.ts';
import type { Brevet, Brevref, OppgittDato } from '../lesing';
import { STOERSTE_VEDLEGG } from '../vedlegg';
import { dato, haerdet } from './format';

export const BREVSTEG = {
  stegene: 'Stegene',
  sending: 'Sending',
  skriv: 'Skriv brevet',
  kontroller: 'Kontroller og send',
  punktene: 'Punktene i brevet',
  hilsen: 'Med vennlig hilsen',
  /** KA-U49, designdelen (svar 2A 18.11 i #2194): «Når du sender» i svaret på vederlaget og fristen. */
  enigheten: 'Enigheten registreres ut fra valgene du har gjort.',
};

/** Et valgfritt spørsmål med radioknapper (oppdragsgiver 17.11 i #2137). */
export const VALG = {
  fjern: 'Fjern svaret',
  fjernNavn: (spoersmaal: string) => `Fjern svaret på «${spoersmaal}»`,
};

/** Grensen for et vedlegg, som serveren håndhever (`STOERSTE_VEDLEGG`). */
export const GRENSEN_FOR_VEDLEGG = `${STOERSTE_VEDLEGG / (1024 * 1024)} MB`;

export const SPORNAVN: Record<Spor, string> = haerdet({
  forhold: 'Forholdet',
  vederlag: 'Vederlagsjustering',
  frist: 'Fristforlengelse',
});

/** Kravet i bestemt form, slik visningen omtaler det (språkfila, «Kravet, ikke sporet»). */
export const SAKSDELEN: Record<Spor, string> = haerdet({
  forhold: 'forholdet',
  vederlag: 'vederlagsjusteringen',
  frist: 'kravet om fristforlengelse',
});

export const KRAVET: Record<Spor, string> = haerdet({
  forhold: 'forholdet',
  vederlag: 'vederlagsjustering',
  frist: 'fristforlengelse',
});

/**
 * Tittelen som ble frosset med brevet, med sakens kode (LV-U27; frosset etter LV-U2 og LV-U25,
 * med MM-U9). Et registrert brev har ingen, og får etiketten «Korrespondanse».
 */
export const brevtittel = (b: { art?: Brevet['art']; brevtittel: string | null }) =>
  b.brevtittel ?? (b.art === 'registrert' ? 'Korrespondanse' : 'Brev');

/**
 * Henvisningen til et brev i visningen, i kortform: «brev 3», med brevets nummer i saken. Brevet
 * selv viser til et tidligere brev med merkingen og datoen (LV-U53); visningen er i saken, så
 * nummeret er nok. Registrert korrespondanse har ikke noe nummer og omtales slik brevteksten gjør
 * (LV-U42, LV-U45), eller med datoen den ble registrert.
 */
export const brevref = (b: Brevref) =>
  b.nummer !== null ? `brev ${b.nummer}` : (b.omtale ?? `brevet registrert ${dato(b.registrert)}`);

/**
 * Henvisningen med avsenderen: «brev 3 fra TE». Omtalen av registrert korrespondanse nevner
 * parten selv (LV-U42), så den står ikke to ganger.
 */
export const brevrefFra = (b: Brevref, part: Part) =>
  b.nummer === null && b.omtale ? b.omtale : `${brevref(b)} fra ${part}`;

/** Henvisningen som begynner en linje: «Brev 3», eller «Brevet registrert …» uten nummer. */
export const brevrefStor = (b: Brevref) => stor(brevref(b));

/**
 * Overskriften for brevet: «K201-KOE-017-03 · tittelen» med merkingen (LV-U53), og bare
 * tittelen for et brev uten merking.
 */
export const brevhode = (b: Pick<Brevet, 'merking' | 'art' | 'brevtittel'>) =>
  b.merking === null ? brevtittel(b) : `${b.merking} · ${brevtittel(b)}`;

export const OPPGITT: Record<OppgittDato['hva'], string> = haerdet({
  paalegg_mottatt: 'Pålegget mottatt',
  klar_over_forholdet: 'Klar over forholdet',
  sendt: 'Dokumentet sendt',
  mottatt: 'Dokumentet mottatt',
});

const METODE: Record<Oppgjoersform, string> = haerdet({
  tilbud: 'fast sum (punkt 34.2.1)',
  enhetspriser: 'enhetspriser (punkt 34.3)',
  regningsarbeid: 'regningsarbeid (punkt 34.4)',
});

export const metodenavn = (m: unknown) =>
  METODE[m as Oppgjoersform] ?? 'metoden totalentreprenøren oppgir';

/** Oppgjørsformen etter hjemmelen i standpunktet, som kjernen fører i `OPPGJOERSHJEMMEL`. */
export const oppgjoersformEtter = (hjemmel: string): Oppgjoersform | undefined =>
  (Object.keys(OPPGJOERSHJEMMEL) as Oppgjoersform[]).find((f) => OPPGJOERSHJEMMEL[f] === hjemmel);

/** Betegnelsene i MM-U30, slik lista står i system.md. */
export const BETEGNELSE: Record<Betegnelse, string> = haerdet({
  trukket: 'Trukket',
  spesifisert_krav_etterspurt: 'Byggherren har bedt om spesifisert krav (punkt 33.6.2)',
  venter_paa_svar: 'Svar ikke registrert',
  paalegg_frafalt: 'Byggherren har frafalt pålegget',
  enige: 'Enige',
  byggherren_har_svart: 'Byggherren har svart',
  varslet: 'Varslet',
});

/** Korrespondansen slik et brev omtaler den (LV-U42): parten, typen og datoen. */
export const omtalenAvKorrespondansen = (part: Part, type: Korrespondansetype, d: string) =>
  `${PARTENS[part]} ${KORRESPONDANSETYPEN[type].ubestemt} av ${dato(d)}`;
