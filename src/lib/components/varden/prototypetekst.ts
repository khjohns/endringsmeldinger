/**
 * PROTOTYPETEKST (#1331). Spørsmålene, forklaringene og virkningstekstene Varden viser,
 * samlet her så de kan kontrolleres med linse A i `design-review` før brukertesten. De er
 * ikke vedtatt brevtekst eller produktdesign. Teksten i brevene kommer fra kjernen, og
 * teksten om svarets virkning er arbeidsvalget 26.10 (`$lib/kjernesak/svarvirkning`).
 *
 * En tekst formulerer et strukturert resultat fra kjernen (et standpunkt, et beløp, et
 * brevnummer). Den finner ikke på virkningen.
 */

import { kroner } from '$kjerne/frosset/standpunkt';
import type { Part, Spor, Standpunkt } from '$kjerne/typer';
import type { Brevet, OppgittDato } from './lesing';

export const PARTNAVN: Record<Part, string> = { TE: 'entreprenøren', BH: 'byggherren' };

export const SPORNAVN: Record<Spor, string> = {
  grunnlag: 'Grunnlag',
  vederlag: 'Vederlag',
  frist: 'Frist',
};

const KRAV: Record<Spor, string> = {
  grunnlag: 'Krav om endring',
  vederlag: 'Krav om vederlagsjustering',
  frist: 'Krav om fristforlengelse',
};

const SVAR: Record<Spor, string> = {
  grunnlag: 'Svar på grunnlaget',
  vederlag: 'Svar på krav om vederlagsjustering',
  frist: 'Svar på krav om fristforlengelse',
};

/** Tittelen på brevet, av hva det inneholder og sporet det hører til. */
export function brevtittel(b: Pick<Brevet, 'art' | 'spor'>): string {
  const spor = b.spor[0];
  if (b.art === 'krav' && spor) return KRAV[spor];
  if (b.art === 'svar' && spor) return SVAR[spor];
  if (b.art === 'aksept') return 'Aksept av svaret';
  if (b.art === 'trekk') return 'Trekk av kravet';
  if (b.art === 'innsigelse') return 'Innsigelse etter § 5';
  if (b.art === 'registrert') return 'Brev registrert utenfor appen';
  return 'Brev';
}

const DATO = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Oslo',
});
const KORT = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Oslo',
});
const KLOKKE = new Intl.DateTimeFormat('nb-NO', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Oslo',
});

/** «15. september 2026» for en dato («2026-09-15») eller et tidspunkt. */
export const dato = (d: string) =>
  DATO.format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d));
export const kortDato = (d: string) => KORT.format(new Date(d));
export const klokke = (d: string) => KLOKKE.format(new Date(d)).replace(':', '.');

/** Kalenderdagene fra `fra` til `til`, regnet på datoene i Oslo. Ingen vurdering av fristen. */
export function kalenderdager(fra: string, til: string): number {
  const dag = (d: string) => {
    const [aar, mnd, dg] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' })
      .format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d))
      .split('-')
      .map(Number);
    return Date.UTC(aar, mnd - 1, dg);
  };
  return Math.round((dag(til) - dag(fra)) / 86_400_000);
}

export const OPPGITT: Record<OppgittDato['hva'], string> = {
  klar_over_forholdet: 'Klar over forholdet',
  sendt: 'Dokumentet sendt',
  mottatt: 'Dokumentet mottatt',
};

const METODE: Record<string, string> = {
  tilbud: 'fast sum (§ 34.2.1)',
  enhetspriser: 'enhetspriser (§ 34.3)',
  regningsarbeid: 'regningsarbeid (§ 34.4)',
};
export const metodenavn = (m: unknown) => METODE[m as string] ?? 'metoden TE oppgir';

/**
 * Standpunktet som utsagn fra byggherren, med «du» når byggherren leser det selv og
 * «BH» ellers. `krevd` er det TE krevde for posten.
 */
export function standpunkttekst(s: Standpunkt, du: boolean, krevd?: number): string {
  const hvem = du ? 'Du' : 'BH';
  const hvemLiten = du ? 'du' : 'BH';
  switch (s.art) {
    case 'rettidighet':
      return s.iTide
        ? `${hvem} godtar at varselet etter § ${s.hjemmel} kom i tide`
        : `${hvem} gjør gjeldende at varselet etter § ${s.hjemmel} kom for sent` +
            (s.begrenset !== undefined
              ? `, og godtar ${kroner(s.begrenset)} etter begrensningen`
              : '');
    case 'metode':
      return s.aksepterer
        ? `${hvem} godtar beregningsmetoden TE krever`
        : `${hvem} godtar ikke beregningsmetoden TE krever` +
            (s.oensket ? `, og mener vederlaget skal justeres etter ${metodenavn(s.oensket)}` : '');
    case 'beloep': {
      const post = s.saerskilt ? 'Produktivitetstapet' : 'Hovedkravet';
      const av = krevd !== undefined ? ` av ${kroner(krevd)}` : '';
      return `${post}: ${hvemLiten} godtar ${kroner(s.godkjent)}${av}`;
    }
    case 'grunnlag':
      return `${hvem} svarer på grunnlaget: ${s.resultat}`;
    default:
      return `${hvem} tar stilling til ${s.art}`;
  }
}

export const SKJEMA = {
  overskrift: 'Svar på kravet',
  svarerPaa: (n: number, d: string) => `Svar på brev ${n} fra TE · ${kortDato(d)}`,
  lesBrevet: 'Les brevet ved siden av',
  lukkBrevet: 'Lukk brevet',
  synlig: 'Bare synlig for teamet ditt til det er sendt',
  varselTittel: 'Varselet om kravet',
  varselSpoersmaal: 'Kom varselet om kravet i tide?',
  iTide: 'Varslet i tide',
  forSent: 'Varslet for sent',
  datoGrense: 'Løsningen viser datoene. Om varselet kom i tide, avgjør partene.',
  klarOver: (d: string, n: number) =>
    `TE oppgir at TE ble klar over forholdet ${dato(d)} (brev ${n}).`,
  kravSendt: (d: string, n: number) =>
    `Kravet om vederlagsjustering ble sendt ${dato(d)} (brev ${n}).`,
  avstand: (dager: number) => `${dager} kalenderdager fra datoen TE oppgir til kravet ble sendt.`,
  metodeTittel: 'Beregningsmetode',
  metodeSpoersmaal: (m: unknown) => `TE krever oppgjør etter ${metodenavn(m)}. Godtar du det?`,
  godtarMetode: 'Godtar metoden',
  godtarIkkeMetode: 'Godtar ikke metoden',
  oensketSpoersmaal: 'Hvilken metode mener du vederlaget skal justeres etter?',
  beloepTittel: (krevd: number) => `Hovedkrav · ${kroner(krevd)}`,
  beloepSpoersmaal: 'Hvor mye av hovedkravet godtar du?',
  beloepSubsidiaert: 'Hvis innsigelsen om sen varsling ikke fører frem, hvor mye godtar du?',
  hele: 'Hele beløpet',
  deler: 'Deler av beløpet',
  ingenting: 'Ingenting',
  belopEtikett: 'Beløpet du godtar',
  belopHjelp: (krevd: number) => `Mer enn 0 kr og mindre enn ${kroner(krevd)}.`,
  begrunnelse: 'Begrunnelse',
  begrunnelseHjelp: 'Kommer i brevet under standpunktene. Begrunnelsen tolkes ikke.',
  ikkeBesvart: 'Ikke besvart',
  ikkeStoettet:
    'Kravet har en post for produktivitetstap (§ 34.1.3). Den kan ikke besvares i denne prøven av Varden. Bruk dagens visning for dette svaret.',
};

export const HOVEDLINJER = {
  tittel: 'Hovedlinjene i svaret',
  kilde: 'Samme utregning som brevet',
  tom: 'Velg et svar på spørsmålene, så står standpunktene her.',
  alternativer: 'alternativer, ikke tillegg',
  krevd: (b: number) => `${kroner(b)} krevd`,
  seBrevet: 'Se brevet før sending',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  ubesvart: 'Svar på spørsmålene i skjemaet, så kan brevet lages.',
  beloepUtenfor: (krevd: number) =>
    `Beløpet du godtar må være mer enn 0 kr og mindre enn ${kroner(krevd)}.`,
};

export const BREVKONTROLL = {
  utkast: 'Utkast · ikke sendt',
  laast: 'Teksten lages fra valgene og kan ikke endres her',
  tilbake: (hva: string) => `Tilbake til ${hva}`,
  fra: 'Fra',
  til: 'Til',
  svarerPaa: 'Svarer på',
  datoSettes: 'Settes ved sending',
  detteSender: 'Dette sender du',
  akseptOmfatter: 'Godtar TE svaret, omfatter aksepten hele svaret, også at varselet kom for sent.',
  ikkeEndres: 'Et sendt brev kan ikke endres, bare følges av et nytt brev.',
  kontrollert: 'Jeg har kontrollert brevet',
  hvorforIkke: 'Kryss av for at du har kontrollert brevet, så kan du sende.',
  sender: 'Sender …',
  sendSvaret: 'Send svaret til TE',
  sendAksepten: 'Send aksepten til BH',
  skjermvisning:
    'Skjermvisning som tåler tekstforstørrelse. Brevnummer, dato og klokkeslett settes når brevet sendes.',
};

export const MOTTATT = {
  fra: (n: number, part: Part, d: string) =>
    `Brev ${n} · ${part} · mottatt ${dato(d)} kl. ${klokke(d)}`,
  iSinHelhet: (part: Part) => `Brevet fra ${part} står i sin helhet under.`,
  taStilling: 'Ta stilling til svaret',
  sendt: (d: string) =>
    `Sendt gjennom appen ${dato(d)} kl. ${klokke(d)}. Dette er brevet slik det ble sendt, og det kan ikke endres.`,
  ikkeIProeven: 'Bygges ikke i denne prøven. Bruk dagens visning.',
  ingenBrev: 'Sporet har ingen brev ennå.',
  dittBrev: 'Brevet ditt er sendt.',
};

/**
 * Brevtypene kjernen kan tilby i sporet, i fast rekkefølge, med teksten de vises med. En
 * handling kjernen tilbyr som ikke står her, vises med `ukjentHandling`, så ingen faller bort.
 */
export const BREVTYPER: { type: string; tekst: string; virkning?: string }[] = [
  { type: 'svare', tekst: 'Svar på kravet' },
  { type: 'revidere', tekst: 'Send revidert svar' },
  { type: 'godta', tekst: 'Godta svaret' },
  { type: 'krav', tekst: 'Send ny versjon av kravet' },
  { type: 'sende_varsel', tekst: 'Send varsel' },
  { type: 'varsle', tekst: 'Registrer varsel sendt utenfor appen' },
  { type: 'innsigelse', tekst: 'Innsigelse: kom for sent (§ 5 tredje ledd)' },
  // Ordlyden om virkningen av trekket er ikke besluttet (oppdragsgiver 27.10).
  { type: 'trekke', tekst: 'Trekk kravet', virkning: 'Virkningen av trekket er ikke besluttet.' },
];
export const ukjentHandling = (noekkel: string) => `Handlingen ${noekkel}`;

/** Varselet med hjemmelen: § 34.1.3 når nøkkelen har den, ellers varselet i sporet (OV-U5). */
const VARSEL_I_SPORET: Record<string, string> = { vederlag: '34.1.2', frist: '33.4' };
export const varselet = (type: string, hva: string) =>
  `${type === 'sende_varsel' ? 'Send varsel' : 'Registrer varsel sendt utenfor appen'} etter § ${VARSEL_I_SPORET[hva] ?? hva}`;

/** Innsigelsen etter § 5 tredje ledd med det den gjelder: et krav, et svar eller et varsel. */
const MAAL: Record<string, string> = { krav: 'kravet', svar: 'svaret', varsel: 'varselet' };
export const innsigelsen = (art: string, nummer: number | null) =>
  `Innsigelse: ${MAAL[art] ?? 'brevet'}${nummer ? ` i brev ${nummer}` : ''} kom for sent (§ 5 tredje ledd)`;

export const BREVMENY = {
  skriv: 'Skriv brev i sporet',
  andre: 'Andre brev og handlinger',
  ingen: 'Ingen brev er mulige i sporet nå.',
};

export const STILLING = {
  tittel: (n: number) => `Ta stilling til svaret i brev ${n}`,
  lukk: 'Lukk',
  godta: 'Godta svaret',
  hele: (n: number) => `Du godtar hele svaret i brev ${n}, med alle standpunktene i det.`,
  omfatter: (hjemmel: string) =>
    `Aksepten omfatter også at BH gjør gjeldende at varselet etter § ${hjemmel} kom for sent, ikke bare det subsidiære beløpet.`,
  beloep: (b: number, n: number) =>
    `Godtar du, er beløpet dere er enige om i vederlagssporet ${kroner(b)}, etter brev ${n} slik det ble sendt.`,
  vilkaar: 'Enigheten får virkning når grunnlaget er avklart.',
  kilde: (n: number) =>
    `Virkningen er regnet ut fra brev ${n} slik det ble sendt. Brevet er det som binder.`,
  seAksepten: 'Se akseptbrevet',
  godtarBrev: (n: number) => `Du godtar hele svaret i brev ${n}`,
  andre: 'Andre brev som er mulige i sporet nå, står under «Andre brev og handlinger».',
};

export const TIDSLINJE = {
  tittel: 'Tidslinje i sporet',
  oppfoeringer: (n: number) => `${n} ${n === 1 ? 'oppføring' : 'oppføringer'}`,
  oppgitt: (part: Part, n: number) => `Oppgitt av ${part} i brev ${n}`,
  sendt: (part: Part) => `Brev sendt av ${part}`,
  registrert: (part: Part) => `Brev registrert av ${part}`,
  tom: 'Ingen datoer eller brev i sporet ennå.',
};

export const SAKEN = {
  nav: 'Saken',
  spor: 'Spor',
  utkast: 'Utkast',
  ingenBrev: 'Ingen brev',
  sist: (n: number, part: Part) => `Siste: brev ${n} fra ${part}`,
  prototype: 'Varden · eksperimentell visning',
  laster: 'Laster saken …',
  ikkeTilgjengelig: 'Dette sporet er ikke bygget i denne prøven av Varden.',
};
