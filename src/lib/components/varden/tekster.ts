/**
 * TEKSTER (#1331). Spørsmålene, forklaringene og virkningstekstene Varden viser,
 * samlet her så de kan kontrolleres med linse A i `design-review` før brukertesten. De er
 * ikke vedtatt brevtekst eller produktdesign. Teksten i brevene kommer fra kjernen, og
 * teksten om svarets virkning er arbeidsvalget 26.10 (`$lib/kjernesak/svarvirkning`).
 *
 * En tekst formulerer et strukturert resultat fra kjernen (et standpunkt, et beløp, et
 * brevnummer). Den finner ikke på virkningen.
 */

import { FORHOLDSGRUPPER as KJERNENS_FORHOLD } from '$kjerne/frosset/forholdene';
import { kroner } from '$kjerne/frosset/standpunkt';
import type { Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { Betegnelse } from '$kjerne/utledning/visning';
import type { Part, Spor, Standpunkt } from '$kjerne/typer';
import type { Brevet, Brevref, OppgittDato } from './lesing';

export const PARTNAVN: Record<Part, string> = { TE: 'totalentreprenøren', BH: 'byggherren' };

export const SPORNAVN: Record<Spor, string> = {
  forhold: 'Forholdet',
  vederlag: 'Vederlagsjustering',
  frist: 'Fristforlengelse',
};

/** Kravet i bestemt form, slik visningen omtaler det (språkfila, «Kravet, ikke sporet»). */
const SAKSDELEN: Record<Spor, string> = {
  forhold: 'forholdet',
  vederlag: 'vederlagsjusteringen',
  frist: 'kravet om fristforlengelse',
};
const KRAVET: Record<Spor, string> = {
  forhold: 'forholdet',
  vederlag: 'vederlagsjustering',
  frist: 'fristforlengelse',
};

/**
 * Forholdene med kjernens kode og navnet, i gruppene fra kjernen (OV-U77, OV-U78). Lista har
 * hjemmet sitt i `kjerne/frosset/forholdene.ts`, så brevet og velgeren sier det samme (svaret
 * på Q3 i #1488).
 */
export const FORHOLDSGRUPPER: { navn: string; forhold: [kode: string, navn: string][] }[] =
  KJERNENS_FORHOLD.map((g) => ({
    navn: g.navn,
    forhold: g.forhold.map((f): [string, string] => [f.kode, f.navn]),
  }));

/**
 * Tittelen som ble frosset med brevet, med sakens kode (LV-U27, MM-U3 (opphevet av MM-U50)). Et registrert brev har
 * ingen, og får etiketten «Korrespondanse» (MM-U17 (opphevet av MM-U50)).
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
export const brevrefStor = (b: Brevref) => brevref(b)[0].toUpperCase() + brevref(b).slice(1);

/**
 * Overskriften for brevet: «K201-KOE-017-03 · tittelen» med merkingen (LV-U53), og bare
 * tittelen for et brev uten merking.
 */
export const brevhode = (b: Pick<Brevet, 'merking' | 'art' | 'brevtittel'>) =>
  b.merking === null ? brevtittel(b) : `${b.merking} · ${brevtittel(b)}`;

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
  paalegg_mottatt: 'Pålegget mottatt',
  klar_over_forholdet: 'Klar over forholdet',
  sendt: 'Dokumentet sendt',
  mottatt: 'Dokumentet mottatt',
};

const METODE: Record<string, string> = {
  tilbud: 'fast sum (punkt 34.2.1)',
  enhetspriser: 'enhetspriser (punkt 34.3)',
  regningsarbeid: 'regningsarbeid (punkt 34.4)',
};
export const metodenavn = (m: unknown) => METODE[m as string] ?? 'metoden TE oppgir';

/** En grunn fra svaret på grunnlaget i brevet `brev`, som utsagn fra byggherren. */
export const grunntekst = (grunn: Subsidiaergrunn, du: boolean, brev: Brevref) =>
  grunn === 'avslaatt'
    ? `${du ? 'Du' : 'BH'} har avslått forholdet i ${brevref(brev)}`
    : `${du ? 'Du' : 'BH'} har gjort gjeldende i ${brevref(brev)} at varselet om forholdet kom for sent (punkt 32.2)`;

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
        ? `${hvem} godkjenner at varselet etter punkt ${s.hjemmel} kom i tide`
        : `${hvem} gjør gjeldende at varselet etter punkt ${s.hjemmel} kom for sent` +
            (s.begrenset !== undefined
              ? `, og godkjenner ${kroner(s.begrenset)} etter begrensningen`
              : '');
    case 'metode':
      return s.aksepterer
        ? `${hvem} godkjenner beregningsmetoden TE krever`
        : `${hvem} godkjenner ikke beregningsmetoden TE krever` +
            (s.oensket ? `, og mener vederlaget skal justeres etter ${metodenavn(s.oensket)}` : '');
    case 'beloep': {
      const post = s.saerskilt ? 'Særskilt vederlagsjustering' : 'Vederlagsjustering';
      const av = krevd !== undefined ? ` av ${kroner(krevd)}` : '';
      return `${post}: ${hvemLiten} godkjenner ${kroner(s.godkjent)}${av}`;
    }
    case 'forhold':
      return `${hvem} svarer på forholdet: ${s.resultat}`;
    default:
      return `${hvem} tar stilling til ${s.art}`;
  }
}

export const SKJEMA = {
  overskrift: 'Svar på kravet',
  // KA-U19: skjemaet sier at virkningen regnes ut fra valgene; OV-U81: i et infotips.
  omSvaret: 'Om svaret',
  // Omtalen av registrert korrespondanse har datoen i seg (LV-U42).
  svarerPaa: (b: Brevref) =>
    b.nummer === null && b.omtale
      ? `Svar på ${b.omtale}`
      : `Svar på ${brevref(b)} fra TE · ${kortDato(b.registrert)}`,
  lesBrevet: 'Les brevet ved siden av',
  // På smal skjerm åpnes brevet i skjemaet, ikke ved siden av.
  lesBrevetHer: 'Les brevet',
  lukkBrevet: 'Lukk brevet',
  synlig: 'Bare synlig for teamet ditt til det er sendt',
  tilTE: 'Til totalentreprenøren (TE)',
  tilBH: 'Til byggherren (BH)',
  varselTittel: 'Varselet om kravet',
  varselSpoersmaal: 'Kom varselet om kravet i tide?',
  iTide: 'Varslet i tide',
  forSent: 'Varslet for sent',
  datoGrense: 'Om varselet kom i tide, avgjør partene.',
  datoInfo:
    'Datoene er de partene har oppgitt i brevene. Løsningen regner ut dagene mellom dem, men vurderer ikke om varselet kom i tide.',
  datoInfoNavn: 'Om datoene',
  klarOver: (d: string, b: Brevref) =>
    `TE oppgir at TE ble klar over forholdet ${dato(d)} (${brevref(b)}).`,
  kravSendt: (d: string, b: Brevref) =>
    // Avstanden under regnes til `registrert`, så den datoen står med for registrert
    // korrespondanse, der omtalen har datoen parten oppgir (LV-U42).
    b.omtale && b.art === 'registrert'
      ? `Kravet om vederlagsjustering står i ${b.omtale}, registrert ${dato(d)}.`
      : `Kravet om vederlagsjustering ble sendt ${dato(d)} (${brevref(b)}).`,
  avstand: (dager: number) => `${dager} kalenderdager fra datoen TE oppgir til kravet ble sendt.`,
  metodeTittel: 'Beregningsmetode',
  metodeSpoersmaal: (m: unknown) => `TE krever oppgjør etter ${metodenavn(m)}. Godkjenner du det?`,
  godtarMetode: 'Godkjenner metoden',
  godtarIkkeMetode: 'Godkjenner ikke metoden',
  oensketSpoersmaal: 'Hvilken metode mener du vederlaget skal justeres etter?',
  // Beløpet står etter tittelen i komponenten, med mono (#1467).
  beloepTittel: 'Vederlagsjustering',
  beloepSpoersmaal: 'Hvor mye av vederlagsjusteringen godkjenner du?',
  gjelderHvis: 'Gjelder hvis',
  innsigelsenSenVarsling: 'innsigelsen om sen varsling',
  // Grunnene fra svaret på grunnlaget har ikke noe felt i skjemaet; brevet står i teksten.
  grunnen: (grunn: Subsidiaergrunn, brev: Brevref) =>
    grunn === 'avslaatt'
      ? `avslaget av forholdet i ${brevref(brev)}`
      : `innsigelsen i ${brevref(brev)} om at varselet om forholdet kom for sent (punkt 32.2)`,
  ikkeFoererFrem: 'ikke fører frem',
  hele: 'Hele beløpet',
  deler: 'Deler av beløpet',
  ingenting: 'Ingenting',
  belopEtikett: 'Beløpet du godkjenner',
  belopHjelp: (krevd: number) => `Mer enn 0 kr og mindre enn ${kroner(krevd)}.`,
  begrunnelse: 'Begrunnelse',
  begrunnelseHjelp: 'Kommer i brevet under standpunktene.',
  mangler: 'Dette mangler før brevet kan lages:',
  manglerITide: 'Velg om varselet kom i tide.',
  manglerMetode: 'Velg om du godkjenner beregningsmetoden.',
  manglerOensket: 'Velg metoden du mener vederlaget skal justeres etter.',
  manglerBeloep: 'Velg hvor mye av vederlagsjusteringen du godkjenner.',
  manglerDelbeloep: 'Skriv beløpet du godkjenner.',
  forkast: 'Forkast utkast',
  forkastSpoersmaal: 'Forkaste utkastet? Valgene og begrunnelsen slettes.',
  forkastJa: 'Forkast',
  behold: 'Behold utkastet',
  ikkeStoettet:
    'Kravet har en post for særskilt vederlagsjustering (punkt 34.1.3). Den kan ikke besvares i denne prøven av Varden. Bruk dagens visning for dette svaret.',
};

export const HOVEDLINJER = {
  tittel: 'Hovedlinjene i svaret',
  tom: 'Velg et svar på spørsmålene, så står standpunktene her.',
  alternativer: 'alternativer, ikke tillegg',
  krevd: (b: number) => `${kroner(b)} krevd`,
  seBrevet: 'Se brevet før sending',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  beloepUtenfor: (krevd: number) =>
    `Beløpet du godkjenner må være mer enn 0 kr og mindre enn ${kroner(krevd)}.`,
};

export const BREVKONTROLL = {
  utkast: 'Utkast · ikke sendt',
  tilbake: (hva: string) => `Tilbake til ${hva}`,
  fra: 'Fra',
  til: 'Til',
  mottaker: 'Mottaker',
  svarerPaa: 'Svarer på',
  viserTil: 'Viser til',
  svarerPaaBrev: (b: Brevref) => brevrefStor(b),
  datoSettes: 'Settes ved sending',
  detteSender: 'Dette sender du',
  /** Virkningen av sendingen, adskilt fra innholdet (oppdragsgiver 06.11, PR 1650). */
  naarDuSender: 'Når du sender',
  akseptOmfatter: 'Godtar TE svaret, omfatter aksepten hele svaret, også at varselet kom for sent.',
  kontrollert: 'Jeg har kontrollert brevet',
  hvorforIkke: 'Kryss av for at du har kontrollert brevet, så kan du sende.',
  sender: 'Sender …',
  sendSvaret: 'Send svaret til TE',
  sendAksepten: 'Send aksepten til BH',
};

export const MOTTATT = {
  fra: (n: number, part: Part, d: string) =>
    `Brev ${n} · ${part} · mottatt ${dato(d)} kl. ${klokke(d)}`,
  sendt: (d: string) =>
    `Sendt herfra ${dato(d)} kl. ${klokke(d)}. Dette er brevet slik det ble sendt, og det kan ikke endres.`,
  sendtMerke: (d: string) => `Sendt ${dato(d)}`,
  ingenBrev: 'Ingen brev ennå.',
  dittBrev: 'Brevet ditt er sendt.',
  forkastet: 'Utkastet er forkastet.',
};

/**
 * Brevtypene kjernen kan tilby i sporet, i fast rekkefølge, med teksten de vises med. En
 * handling kjernen tilbyr som ikke står her, vises med `ukjentHandling`, så ingen faller bort.
 */
export const BREVTYPER: { type: string; tekst: string }[] = [
  { type: 'svare', tekst: 'Svar på kravet' },
  { type: 'revidere', tekst: 'Send revidert svar' },
  { type: 'godta', tekst: 'Godta svaret' },
  { type: 'krav', tekst: 'Send ny versjon av kravet' },
  { type: 'sende_varsel', tekst: 'Send varsel' },
  { type: 'varsle', tekst: 'Registrer et varsel som er sendt på annen måte' },
  { type: 'trekke', tekst: 'Trekk kravet' },
  // Står ved datoen, ikke i «Andre handlinger» (skissen i BF-02A, #1615).
  { type: 'korrigere', tekst: 'Korriger datoen' },
];
export const ukjentHandling = (noekkel: string) => `Handlingen ${noekkel}`;

/** Varselet med hjemmelen: § 34.1.3 når nøkkelen har den, ellers varselet i sporet (OV-U5). */
const VARSEL_I_SPORET: Record<string, string> = { vederlag: '34.1.2', frist: '33.4' };
export const varselet = (type: string, hva: string) =>
  `${type === 'sende_varsel' ? 'Send varsel' : 'Registrer et varsel som er sendt på annen måte'} etter punkt ${VARSEL_I_SPORET[hva] ?? hva}`;

/** Kortet «Det du kan gjøre nå», som i prototypen `grunnlagsoversikt.html`. */
export const HANDLINGENE = {
  andre: 'Andre handlinger',
  /** En brevtype som ikke er bygget, i demoruta uten dagens visning (#1636). */
  ikkeBygget: 'Denne handlingen er ikke bygget i prøven ennå.',
  godta: (avslag: boolean) => `Godta ${avslag ? 'avslaget' : 'svaret'}`,
  /** Den nye kravversjonen etter byggherrens svar i vederlaget og fristen (oppdragsgiver 06.11, #1631). */
  revidertKrav: 'Revider krav',
  /** Linja under handlingen i «Andre handlinger»: hva den gjør med saken. */
  virkning: {
    godta: (svar: Brevref) =>
      `Du godtar hele svaret i ${brevref(svar)}. Du ser brevet før det sendes.`,
    /**
     * Etter svaret: hjemmelen, kategorien og datoen står (punkt 10 og 14 i samlevedtaket for
     * retting av sendt brev, MM-U52), så den nye versjonen utdyper begrunnelsen (oppdragsgiver
     * 06.11, #1631). Hva TE gjør gjeldende, følger hovedkategorien i § 33.1 og § 33.3.
     */
    oppdaterPaaberopelse: (hovedkategori: string | null) =>
      hovedkategori === 'endring'
        ? 'Redegjør nærmere for hvorfor dette er en endring.'
        : hovedkategori === 'force_majeure'
          ? 'Redegjør nærmere for hvorfor dette er force majeure.'
          : hovedkategori === 'svikt' || hovedkategori === 'andre_forhold'
            ? 'Redegjør nærmere for hvorfor dette er et forhold byggherren har risikoen for.'
            : 'Utdyp beskrivelsen og begrunnelsen. Byggherren svarer på nytt.',
    reviderKrav: 'Juster kravet eller begrunnelsen. Byggherren svarer på nytt.',
    /**
     * En ny kravversjon er den byggherren svarer på, og sporet venter på nytt svar. Teksten sier
     * hvilket brev det nye følger opp, ikke hva brevene sier i forhold til hverandre, og «brev»,
     * ikke «versjon» (språkfila, «Brev, ikke versjon»). Svaret på den
     * tidligere versjonen kan da ikke godtas i løsningen, og løsningen sier ikke at det er
     * avslått (MM-U34 punkt 1 og 2).
     */
    nyVersjon: (spor: Spor, krav: Brevref | null, svar: Brevref | null) => {
      const hva = spor === 'forhold' ? 'påberopelsen' : 'kravet';
      if (!krav) return 'Byggherren svarer på det nye brevet.';
      if (!svar)
        return `Følger opp ${hva} i ${brevref(krav)}. Byggherren svarer på det nye brevet.`;
      return `Følger opp ${hva} i ${brevref(krav)}. Du kan ikke lenger godta svaret i ${brevref(svar)} i denne saken. Byggherren svarer på det nye brevet.`;
    },
    // Et trukket forhold trekker kravene som bygger på det (GR-U5, GR-U25), og et trukket krav
    // kan ikke tas opp igjen (GR-U5).
    trekkForholdet: 'Trekker også kravene om vederlag og frist. Kan ikke tas opp igjen.',
    trekkKravet: 'Kravet kan ikke tas opp igjen.',
  },
};

export const STILLING = {
  /** Når kjernen ikke kan lage akseptbrevet og ikke sier hvorfor. */
  godta: 'Aksepten kan ikke lages nå.',
  omfatter: (hjemmel: string) =>
    `Aksepten omfatter også at BH gjør gjeldende at varselet etter punkt ${hjemmel} kom for sent, ikke bare det subsidiære beløpet.`,
  beloep: (beloep: number, b: Brevref) =>
    `Godtar du, er beløpet dere er enige om for vederlagsjusteringen ${kroner(beloep)}, etter ${brevref(b)} slik det ble sendt.`,
  vilkaar: 'Enigheten får virkning når forholdet er avklart.',
  kilde: (b: Brevref) => `Virkningen er regnet ut fra ${brevref(b)} slik det ble sendt.`,
  godtarBrev: (b: Brevref) => `Du godtar hele svaret i ${brevref(b)}`,
};

export const TIDSLINJE = {
  tittel: 'Tidslinje',
  oppfoeringer: (n: number) => `${n} ${n === 1 ? 'oppføring' : 'oppføringer'}`,
  oppgitt: (part: Part, b: Brevref) => `Oppgitt av ${part} i ${brevref(b)}`,
  /** Hva brevet gjør, kort, som i prototypen `grunnlagsoversikt.html`: «Krav om fristforlengelse». */
  hva: (b: Pick<Brevet, 'art' | 'spor' | 'avsender' | 'brevtittel'>) => {
    const spor = (['forhold', 'vederlag', 'frist'] as const).filter((s) => b.spor.includes(s));
    const om = (navn: Record<Spor, string>) => spor.map((s) => navn[s]).join(' og ');
    if (b.art === 'registrert') return FORHOLDET.registrertTittel(b.avsender);
    if (b.art === 'krav' && spor.length)
      return spor.includes('forhold') ? 'Påberopelse av forholdet' : `Krav om ${om(KRAVET)}`;
    if (b.art === 'svar' && spor.length) return `Svar på ${om(SAKSDELEN)}`;
    if (b.art === 'trekk' && spor.length)
      return spor.includes('forhold') ? 'Trekk av påberopelsen' : `Trekk av ${om(SAKSDELEN)}`;
    if (b.art === 'aksept' && spor.length) return `Godtar svaret på ${om(SAKSDELEN)}`;
    if (b.art === 'innsigelse') return 'Innsigelse';
    return brevtittel(b);
  },
  sendt: (part: Part, b: Brevref) => `${brevrefStor(b)} sendt av ${part}`,
  registrert: (part: Part, lagtTil: string) => `Sendt ifølge ${part}, lagt til ${dato(lagtTil)}`,
  tom: 'Ingen datoer eller brev ennå.',
};

/** Betegnelsene i MM-U30, slik lista står i system.md. */
export const BETEGNELSE: Record<Betegnelse, string> = {
  trukket: 'Trukket',
  spesifisert_krav_etterspurt: 'Byggherren har bedt om spesifisert krav (punkt 33.6.2)',
  venter_paa_svar: 'Svar ikke registrert',
  paalegg_frafalt: 'Byggherren har frafalt pålegget',
  enige: 'Enige',
  svar_ikke_godtatt: 'Svaret er ikke godtatt',
  krav_sendt: 'Krav sendt',
  ingen_krav: 'Ingen krav',
  varslet: 'Varslet',
};

const stor = (t: string) => t[0].toUpperCase() + t.slice(1);

/** Siden for forholdet (#1449, prototypen `grunnlagsoversikt.html`, OV-U76–OV-U78). */
/** Korrigeringen i en lukket sak (D-6 og U-6 i BF-02A; oppdragsgiver 06.11, #1646). */
const KORRIGERT_I_LUKKET =
  'Saken står lukket, og korrigeringen endrer ikke utfallet. Byggherren kan ta stilling til den nye datoen i et innlegg. Innlegg kan ikke sendes fra løsningen ennå.';

export const FORHOLDET = {
  utenNavn: 'Forholdet',
  siste: (b: Brevref, part: Part) =>
    `Siste brev: ${brevrefFra(b, part)}${b.nummer === null ? '' : `, ${dato(b.registrert)}`}.`,
  traad: 'Brevene om forholdet',
  tittel: (b: Pick<Brevet, 'nummer' | 'art' | 'brevtittel'>) =>
    b.nummer === null ? brevtittel(b) : `Brev ${b.nummer} · ${brevtittel(b)}`,
  registrertTittel: (part: Part) => `Korrespondanse fra ${PARTNAVN[part]}`,
  dokumentasjon: 'Dokumentasjon',
  sendtHerfra: (part: Part, d: string) => `${stor(PARTNAVN[part])} · ${dato(d)}`,
  sendtIfoelge: (part: Part, sendt: string, registrert: string) =>
    `Sendt ${dato(sendt)}, ifølge ${PARTNAVN[part]} · lagt til ${dato(registrert)}`,
  lagtTil: (part: Part, registrert: string) =>
    `Fra ${PARTNAVN[part]} · lagt til ${dato(registrert)}`,
  lesBrevet: 'Les brevet',
  tilbake: 'Tilbake til forholdet',
  svarIkkeRegistrert: 'Svar ikke registrert.',
  trukket: (b: Brevref | null) =>
    b ? `Påberopelsen er trukket i ${brevref(b)}.` : 'Påberopelsen er trukket.',
  omKorrespondansen: 'Om korrespondansen',
  omKorrespondansenTekst:
    'Løsningen vurderer ikke innholdet i dokumentet, og avgjør ikke hvilken betydning det har for partenes rettigheter og plikter.',
  tilknyttede: 'Tilknyttede krav',
  tilknyttedeKilde: 'Kravene som bygger på forholdet',
  ingenKrav: 'Ingen krav om vederlagsjustering eller fristforlengelse ennå.',
  aapne: 'Åpne',
  /** Navnet på lenken for skjermleseren sier hvor den fører (språkfila), og begynner med «Åpne». */
  aapneNavn: (spor: Spor) => `Åpne ${SAKSDELEN[spor]}`,
  krevd: 'Krevd',
  byggherren: 'Byggherren',
  ikkeSvart: 'Svar ikke registrert',
  forholdsrot: (navn: string, svar: { resultat: string; brev: Brevref } | null) =>
    svar ? `${navn} · ${svar.resultat} i ${brevref(svar.brev)}` : navn,
  resultat: {
    godkjent: 'godkjent',
    avslaatt: 'avslått',
    paalegg_frafalt: 'pålegget frafalt',
  } as Record<string, string>,
  /** Hvorfor svaret er subsidiært til forholdet (vedtaket 05.10), som vilkår. */
  gjelderHvis: (grunner: Subsidiaergrunn[]) =>
    `Gjelder hvis ${[
      ...(grunner.includes('prekludert') ? ['varselet om forholdet kom i tide'] : []),
      ...(grunner.includes('avslaatt') ? ['forholdet gir grunnlag for kravet'] : []),
    ].join(' og ')}.`,
  blirSubsidiaert: (b: Brevref) =>
    `Et svar blir subsidiært så lenge byggherren står fast på ${brevref(b)}.`,
  trekk: 'Trekk påberopelsen',
  /**
   * Den nye versjonen av påberopelsen, før og etter byggherrens svar (oppdragsgiver 06.11, #1631,
   * og 07.11, PR 1650).
   */
  oppdater: 'Oppdater påberopelse',
  /** Hvor saken står, under tittelen på oversikten (oppdragsgiver 06.11, PR 1650). */
  utfall: (resultat: string, d: string) =>
    `Byggherren ${{ godkjent: 'godtok forholdet', avslaatt: 'avslo forholdet', paalegg_frafalt: 'frafalt pålegget' }[resultat] ?? 'svarte'} ${dato(d)}.`,
  venter: (d: string) => `Sendt til byggherren ${dato(d)}. Svar ikke registrert.`,
  /** BF-10 U-2: en annen hjemmel eller endringsordre går i en ny sak (GR-U22, OV-U57). */
  annen: 'Annen hjemmel eller endringsordre?',
  annenLenke: 'Opprett ny sak',
  nyFane: '(åpnes i ny fane)',
  /** BHs primærhandling i forholdet (oppdragsgiver 06.11, #1649). */
  svar: 'Svar på påberopelsen',
  svarNyVersjon: 'Svar på det nye brevet',
  handlinger: 'Det du kan gjøre nå',
  beskrivelse: (paalegg: boolean) => `Beskrivelse av ${paalegg ? 'pålegget' : 'forholdet'}`,
  begrunnelsen: 'Begrunnelsen',
  forklaringen: 'Forklaringen',
  oppgitt: (hva: 'paalegg_mottatt' | 'klar_over_forholdet', d: string, part: Part) =>
    `${hva === 'paalegg_mottatt' ? 'Pålegget mottatt' : 'Klar over forholdet'} ${dato(d)}, ifølge ${PARTNAVN[part]}.`,
  // Korrigeringen av datoen (BF-02A, MM-U52 punkt 10 og designdelen).
  korriger: 'Korriger datoen',
  korrigerNavn: (hva: 'paalegg_mottatt' | 'klar_over_forholdet') =>
    `Korriger datoen ${hva === 'paalegg_mottatt' ? 'pålegget ble mottatt' : 'du ble klar over forholdet'}`,
  korrigerer: (forrige: { dato: string; brev: Brevref }) =>
    `Korrigerer ${dato(forrige.dato)}, oppgitt i ${brevref(forrige.brev)}.`,
  korrigertI: (b: Brevref) => `Korrigert i ${brevref(b)}.`,
  korrigerILukket: KORRIGERT_I_LUKKET,
  omKorrigeringen: 'Om korrigeringen',
  avgjoerIkke:
    'Løsningen avgjør ikke hvilken dato som er riktig, når varslingsfristen begynte å løpe eller om varselet kom i tide.',
  /**
   * Hva korrigeringen gjør med saken (D-2, D-6 og U-6 i BF-02A; oppdragsgiver 06.11, #1646),
   * og `null` når byggherren ikke har svart.
   */
  korrigeringenStaar: (lukket: boolean, svar: Brevref | null): string | null =>
    lukket
      ? KORRIGERT_I_LUKKET
      : svar
        ? `Svaret i ${brevref(svar)} står som det ble sendt. Byggherren kan ta stilling til den nye datoen i et senere svar.`
        : null,
  lagene: 'Standpunktene i svaret',
  /** Byggherrens standpunkt i svaret på forholdet, som setning (språkfila: partene fullt ut). */
  standpunkt: (s: Standpunkt, brev: Brevref | null): string => {
    const i = brev ? ` i ${brevref(brev)}` : '';
    if (s.art === 'rettidighet')
      return s.iTide
        ? `Byggherren godkjenner at varselet etter punkt ${s.hjemmel}${i} kom i tide.`
        : `Byggherren gjør gjeldende at varselet etter punkt ${s.hjemmel}${i} kom for sent.`;
    if (s.art === 'forhold')
      return {
        godkjent: 'Byggherren godkjenner forholdet.',
        avslaatt: 'Byggherren avslår forholdet.',
        paalegg_frafalt: 'Byggherren frafaller pålegget (punkt 32.3 første ledd c).',
      }[s.resultat];
    return `${standpunkttekst(s, false)}.`;
  },
};

/** Skjemaet for korrigeringen av datoen (BF-02A, skissen `korrigering-av-datoen.html`). */
const DATOEN: Record<'paalegg_mottatt' | 'klar_over_forholdet', string> = {
  paalegg_mottatt: 'pålegget ble mottatt',
  klar_over_forholdet: 'du ble klar over forholdet',
};
export const KORRIGERING = {
  tittel: (hva: keyof typeof DATOEN) => `Korriger datoen ${DATOEN[hva]}`,
  duKorrigerer: 'Du korrigerer',
  opplysningen: (o: { hva: keyof typeof DATOEN; dato: string }) =>
    `${dato(o.dato)}, datoen du oppga for når ${DATOEN[o.hva]}`,
  oppgittI: 'Oppgitt i',
  brevet: (b: Brevref) => `${brevrefStor(b)} av ${dato(b.registrert)}`,
  /** U-2: et eget brev, og påberopelsen og svaret står som de ble sendt (MM-U52 punkt 10–11). */
  egetBrev: (paaberopelse: Brevref, svar: Brevref | null) =>
    `Korrigeringen sendes som et eget brev til byggherren. ${
      svar
        ? `Påberopelsen i ${brevref(paaberopelse)} og svaret i ${brevref(svar)} står som de ble sendt.`
        : `Påberopelsen i ${brevref(paaberopelse)} står som den ble sendt.`
    } Den nye datoen gjelder straks som din siste opplysning.`,
  lukket: 'Saken står lukket. Korrigeringen endrer ikke utfallet.',
  nyDato: (hva: keyof typeof DATOEN) => `Ny dato for når ${DATOEN[hva]}`,
  datoHjelp: 'Datoen kan ikke være etter dagens dato.',
  forklaring: 'Forklaring (valgfri)',
  forklaringHjelp: 'Forklaringen står i brevet under den nye datoen.',
  skrivDatoen: (hva: keyof typeof DATOEN) => `Skriv datoen ${DATOEN[hva]}.`,
  uendret: (o: { hva: keyof typeof DATOEN; dato: string; brev: Brevref }) =>
    `Datoen er den samme som i ${brevref(o.brev)}, ${dato(o.dato)}. Skriv datoen ${DATOEN[o.hva]}.`,
  etterIdag: 'Datoen er etter dagens dato. Skriv en dato fram til i dag.',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  forkastSpoersmaal: 'Forkaste utkastet? Datoen og forklaringen slettes.',
  panel: 'Hovedlinjene i korrigeringen',
  panelTom: 'Skriv den nye datoen, så står korrigeringen her.',
  linjeNy: (hva: keyof typeof DATOEN, d: string) => `Ny dato for når ${DATOEN[hva]}: ${dato(d)}`,
  linjeTidligere: (o: { dato: string; brev: Brevref }) =>
    `Tidligere oppgitt ${dato(o.dato)} i ${brevref(o.brev)}`,
  linjeForklaring: 'Forklaringen din står under den nye datoen',
  seBrevet: 'Se brevet før sending',
  handling: 'Send korrigeringen',
  sendTekst: 'Send korrigeringen til byggherren',
  tilbakeTil: 'utkastet',
  /** U-4: datoen er TEs siste opplysning, og påberopelsen og svaret står som de ble sendt. */
  kvittering: (d: string, hva: keyof typeof DATOEN, lukket: boolean, harSvar: boolean) =>
    `Korrigeringen er sendt til byggherren. ${dato(d)} er nå din siste opplysning om når ${DATOEN[hva]}. ${lukket ? 'Saken står lukket, og utfallet er det samme.' : harSvar ? 'Påberopelsen og svaret står som de ble sendt.' : 'Påberopelsen står som den ble sendt.'}`,
};

/**
 * Skjemaet for TEs nye versjon av påberopelsen (BF-10).
 */
export const NYVERSJON = {
  /**
   * Brevet som skrives, i arbeidsraden (oppdragsgiver 07.11, PR 1650). Nummeret er det neste i
   * saken; forhåndsvisningen viser det brevet får.
   */
  radtittel: (nummer: number) => `Brev ${nummer} · Oppdatert påberopelse`,
  til: 'Til byggherren (BH)',
  tekst: 'Begrunnelse',
  /** Begrunnelsen kreves (oppdragsgiver 07.11, PR 1650). Knappen er aktiv (MM-U32). */
  manglerTekst: 'Skriv en begrunnelse for å gå videre.',
  forhaandsvis: 'Forhåndsvis brevet',
  /** Brevene TE bygger på, til høyre for utkastet. Ett er åpent om gangen. */
  tidligere: 'Tidligere brev om forholdet',
  brevrad: (b: Brevref & { avsender: Part }) =>
    `${brevrefStor(b)} · ${
      b.art === 'svar'
        ? `${stor(PARTNAVN[b.avsender])}s svar`
        : b.art === 'krav'
          ? `${stor(PARTNAVN[b.avsender])}s påberopelse`
          : stor(brevref(b))
    }`,
  utenTekst: 'Teksten i dette brevet står ikke her. Åpne det fra oversikten.',
  /**
   * Brevrelasjonene i brevkontrollen: rekkefølgen og henvisningen, ikke hva brevene sier i forhold
   * til hverandre, og uten eier på TEs eget brev (oppdragsgiver 07.11, PR 1650; språkfila).
   */
  forrigeBrev: 'Forrige brev',
  forrigeBrevet: (krav: Brevref) => `Påberopelsen i ${brevref(krav)}`,
  viserTilBrev: (svar: Brevref) => `Byggherrens svar i ${brevref(svar)}`,
  /** D-6 og 10d: en registrert enighet står (KA-U52 punkt 5). */
  enighet: (svar: Brevref) =>
    `Du godtok svaret i ${brevref(svar)}. Enigheten står, og det nye brevet avviker fra den.`,
  forkastTekst: 'Begrunnelsen du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  /** Overskriften i sendepanelet (oppdragsgiver 07.11, PR 1650). */
  kontroller: 'Kontroller og send',
  sendTekst: 'Send til byggherren',
  tilbakeTil: 'utkastet',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  kvittering: 'Brevet er sendt til byggherren.',
};

/** Utkastet som brev under arbeid (`Brevutkast.svelte`). */
export const BREVUTKAST = {
  utkast: 'Utkast',
  forkastSpoersmaal: 'Forkaste utkastet?',
};

export const SAKEN = {
  nav: 'Saken',
  kontraktsforhold: 'Kontraktsforhold',
  krav: 'Krav',
  utkast: 'Utkast',
  prototype: 'Varden · eksperimentell visning',
  kommune: 'Oslo kommune',
  foretak: 'Oslobygg KF',
  kontrakten: 'Kontrakten',
  prosjekt: 'Prosjekt',
  kontraktsform: 'Kontraktsform',
  byggherre: 'Byggherre',
  entreprenoer: 'Totalentreprenør',
  opprettet: 'Opprettet',
  merkenavn: 'Varden',
  stien: 'Du er her',
  laster: 'Laster saken …',
  lastefeil: 'Saken kunne ikke lastes',
  lastefeilBeklager: 'Beklager, saken ble ikke hentet. Prøv igjen om litt.',
  lastefeilDetaljer: (aarsak: string) => `Teknisk melding: ${aarsak}`,
  sistForsoekt: (d: string) => `Sist forsøkt kl. ${klokke(d)}.`,
  proevIgjen: 'Prøv igjen',
  proever: 'Prøver igjen …',
  finnesIkke: 'Saken finnes ikke',
  finnesIkkeForklaring:
    'Saken ble ikke funnet. Kontroller lenken, eller gå tilbake til sakslisten.',
  tilSakslisten: 'Til sakslisten',
  ikkeTilgjengelig: 'Dette er ikke bygget i denne prøven av Varden. Bruk dagens visning.',
};

/** Skjemaet for ny sak (BF-05, skissen versjon 3 med funnene F-1–F-8). */
export const NYSAK = {
  over: 'Ny sak',
  tittel: 'Nytt krav om endringsordre',
  forholdet: 'Forholdet du påberoper',
  forholdetHjelp: 'Velg bestemmelsen i kontrakten pålegget eller forholdet faller inn under.',
  sok: 'Søk etter forhold eller punkt',
  ingenTreff: 'Ingen forhold passer med søket.',
  antallTreff: (n: number) =>
    n === 0
      ? NYSAK.ingenTreff
      : n === 1
        ? 'Ett forhold passer med søket.'
        : `${n} forhold passer med søket.`,
  endre: 'Endre',
  staarFastInnledning: 'Forholdet står fast når brevet er sendt.',
  staarFast: 'Vil du påberope et annet forhold senere, oppretter du en ny sak.',
  sakstittel: 'Tittel på saken',
  sakstittelHjelp: 'Står i sakslisten og i brevet.',
  beskrivelseHjelp: 'Hva som skjedde, når og hvordan, og hvorfor du mener det er en endring.',
  endringsordre: 'Endringsordrens nummer eller dato',
  /** MM-U52 punkt 14: endringsordren står fast, som forholdet. */
  endringsordreHjelp: 'Står fast når brevet er sendt.',
  vedlegg: 'Vedlegg (valgfritt)',
  vedleggHjelp:
    'For eksempel pålegget selv, en tegning eller et referat. Hver fil kan være opptil 15 MB.',
  velgFiler: 'Velg filer',
  lasterOpp: (filnavn: string) => `Laster opp ${filnavn} …`,
  fjernVedlegg: 'Fjern',
  fjernVedleggNavn: (filnavn: string) => `Fjern ${filnavn}`,
  forStorFil: (filnavn: string) => `${filnavn} er større enn 15 MB. Velg en mindre fil.`,
  vedleggFeilet: (filnavn: string, melding: string) => `${filnavn} ble ikke lastet opp. ${melding}`,
  ventPaaOpplastingen: 'Vent til vedleggene er lastet opp.',
  // Spørsmålet sier «pålegget» eller «forholdet», som ledetekstene (F-5).
  alleredeVarslet: (paalegg: boolean) =>
    `Har du allerede varslet byggherren etter punkt 32.2, på annen måte, at ${paalegg ? 'pålegget' : 'forholdet'} er en endring?`,
  // Opplysningen fra kapittel B står ved spørsmålet uansett svar (VS-U39, F-8).
  kapittelB:
    'Etter kapittel B i kontraktsgrunnlaget skal varsel om endring sendes på byggherrens skjema, som brev, som PDF i e-post eller i prosjekthotellet når prosjektet bruker det. En e-post alene eller et møtereferat er ikke nok.',
  // Varselet som alt er sendt, med det OV-U79 krever (D-8, VS-U38). Hjelpetekstene forklarer
  // bare det det spørres om (F-3).
  varseltype: 'Hva legger du til?',
  varseltyper: [
    { verdi: 'brev', tekst: 'Brev' },
    { verdi: 'e_post', tekst: 'E-post' },
    { verdi: 'moetereferat', tekst: 'Møtereferat' },
    { verdi: 'notat', tekst: 'Notat eller annet dokument' },
  ],
  sendemaate: 'Hvordan ble brevet sendt?',
  sendemaater: [
    { verdi: 'post', tekst: 'Per post' },
    { verdi: 'pdf_e_post', tekst: 'Som PDF i e-post' },
    { verdi: 'prosjekthotell', tekst: 'I prosjekthotellet' },
    { verdi: 'annen_maate', tekst: 'På annen måte' },
  ],
  varseldato: 'Datoen det ble sendt',
  varseldatoHjelp: 'Datoen avsenderen oppgir.',
  varseldokument: 'Dokumentet',
  varseldokumentIkkeLaget: 'Dokumentet kan ikke legges ved ennå.',
  varselbeskrivelse: 'Kort beskrivelse av varselet',
  varselbeskrivelseHjelp: 'Kort, med egne ord.',
  varselMerknad:
    'Varselet legges til i saken sammen med påberopelsen, og dokumentet legges ved brevet.',
  velgVarseltypen: 'Velg hva du legger til.',
  velgSendemaaten: 'Velg sendemåten.',
  oppgiVarseldatoen: 'Oppgi datoen varselet ble sendt.',
  beskrivVarselet: 'Beskriv varselet.',
  // Lagringen venter på #807 og #1487, og setningen i brevet på #1488.
  /** LV-U46: en annen sak fikk nummeret før brevet ble sendt. */
  nyttNummer:
    'En annen sak fikk nummeret før brevet ble sendt. Se over brevet med det nye nummeret og send det på nytt.',
  ingenMerking: 'Sakens nummer kunne ikke hentes, så brevet kan ikke vises.',
  varseletKanIkkeLagres:
    'Varselet kan ikke legges til i saken ennå. Velg nei for å sende påberopelsen uten det.',
  // Panelet til høyre, som i de andre skjemaene i Varden (F-1).
  panel: 'Hovedlinjene i påberopelsen',
  panelTom: 'Velg forholdet, så står påberopelsen her.',
  // Tidslinja under panelet, med datoene TE fyller ut (oppdragsgiver 02.11, #1492).
  tidslinjeDato: (paalegg: boolean) => (paalegg ? 'Mottok pålegget' : 'Klar over forholdet'),
  oppgisIBrevet: 'Oppgis i påberopelsen',
  tidslinjeVarselet: 'Varselet som alt er sendt',
  sendtFoerSaken: 'Sendt før saken ble opprettet',
  tidslinjeSendes: 'Påberopelsen sendes',
  naarDuSender: 'I dag, når du sender',
  linjeForholdet: 'Forholdet',
  linjeTittel: 'Tittel på saken',
  linjeVarselet: 'Varsel som alt er sendt',
  // Der punkt 32.2 gjelder, sier brevet at TE varsler etter bestemmelsen (GR-U31, D-6).
  linjeVarsel: 'Varsel',
  varslerEtter322: 'Brevet varsler etter punkt 32.2',
  linjeVedlegg: 'Vedlegg',
  ingenVedlegg: 'Ingen vedlegg',
  varseldokumentetVedlegges: 'Dokumentet med varselet som alt er sendt',
  sendesTil: 'Saken opprettes og brevet sendes til byggherren når du sender.',
  seBrevet: 'Se brevet før sending',
  avbryt: 'Avbryt',
  avbrytSpoersmaal: 'Brevet sendes ikke, og ingen sak opprettes. Det du har skrevet, slettes.',
  avbrytJa: 'Ja, slett det du har skrevet',
  avbrytNei: 'Nei, fortsett å skrive',
  mangler: 'Det mangler noe før du kan se brevet',
  ingenSak: 'Ingen sak er opprettet ennå.',
  velgForholdet: 'Velg forholdet.',
  skrivTittelen: 'Skriv tittelen.',
  beskriv: (paalegg: boolean) => (paalegg ? 'Beskriv pålegget.' : 'Beskriv forholdet.'),
  oppgiDatoen: 'Oppgi datoen.',
  oppgiEndringsordren: 'Oppgi endringsordren.',
  handling: 'Send påberopelsen til byggherren',
  detteSender: (forhold: string, punkt: string) =>
    `Påberopelsen av ${forhold.toLowerCase()} etter punkt ${punkt}, som første brev i en ny sak`,
  virkning: 'Saken opprettes når brevet sendes, og forholdet står fast etter sendingen.',
  sendTekst: 'Send til byggherren',
  tilbakeTil: 'skjemaet',
  kvittering: 'Påberopelsen er sendt. Brevet sendes til Catenda.',
  avbrutt: 'Brevet er ikke sendt, og ingen sak er opprettet.',
};

/** Sakslisten i prosjektet (#1450, prototypen `saksliste-v2.html`, MM-U37–MM-U39). */
export const SAKSLISTE = {
  saker: 'Saker',
  koe: 'Krav om endringsordre',
  eo: 'Endringsordrer',
  antall: (n: number) => `${n} ${n === 1 ? 'sak' : 'saker'}`,
  nyKoe: 'Nytt krav om endringsordre',
  sak: 'Sak',
  krevdVederlag: 'Krevd vederlag',
  krevdFrist: 'Krevd frist',
  eksMva: 'eks. mva.',
  sisteBrev: 'Siste brev',
  /** Avsenderen av sakens siste brev, til brevkoden er bygget (#1174). */
  brevFra: (avsender: string) => `Fra ${avsender}`,
  ingenBrev: 'Ingen brev',
  forholdMedPunkt: (navn: string, punkt: string) => `${navn} · pkt.\u00a0${punkt}`,
  ikkeKrevd: 'Ikke krevd',
  varslet: 'Varslet',
  trukket: 'trukket',
  metode: { regningsarbeid: 'Regningsarbeid', enhetspriser: 'Enhetspriser' } as Record<
    string,
    string
  >,
  utenTittel: 'Uten tittel',
  inngaarIEo: (kode: string) => `Inngår i ${kode}`,
  paaberopelsenTrukket: 'Påberopelsen trukket',
  avslagetGodtatt: 'Avslaget godtatt av TE',
  // Nøkkeltallene
  tallene: 'Tallene for kravene',
  vederlag: 'Vederlag',
  fristforlengelse: 'Fristforlengelse',
  krevdUtenforEo: 'Krevd utenfor EO',
  krav: (n: number) => `${n} krav`,
  varsletAntall: (n: number) => `${n} varslet`,
  utenBeloep: (n: number) => `${n} uten beløp`,
  omTallene: (spor: string) => `Om tallene for ${spor.toLowerCase()}`,
  omVederlag:
    'Summen av kravene med beløp i sakene som ikke inngår i en sendt endringsordre. Krav etter regningsarbeid eller enhetspriser har ikke beløp og telles for seg. Trukne krav og saker som TE har avsluttet, er ikke med. Krav i flere saker kan gjelde samme kostnad.',
  omFrist:
    'Antall krav i sakene som ikke inngår i en sendt endringsordre. Dagene summeres ikke, fordi forlengelser i ulike saker kan gjelde samme periode.',
  // Verktøylinja
  utvalg: 'Utvalg',
  alle: 'Alle',
  iEo: 'Inngår i EO',
  ikkeIEo: 'Ikke i EO',
  avsluttet: 'Avsluttet av TE',
  sorterEtter: 'Sorter etter',
  opprettet: 'Opprettet',
  soek: 'Søk i sakene',
  ingenTreffSoek: (q: string) => `Ingen saker passer med «${q}».`,
  ingenTreff: {
    eo: 'Ingen saker inngår i en endringsordre.',
    'ikke-eo': 'Alle sakene inngår i en endringsordre.',
    avsluttet: 'Ingen saker er avsluttet av TE.',
  } as Record<string, string>,
  visAlle: 'Vis alle sakene',
  // Tilstandene
  laster: 'Laster sakene …',
  lastefeil: 'Sakene kunne ikke lastes',
  lastefeilBeklager: 'Beklager, sakene ble ikke hentet. Prøv igjen om litt.',
  tomKoe: 'Ingen krav om endringsordre ennå.',
  tomKoeTe: 'Ingen krav om endringsordre ennå. Et nytt krav begynner med påberopelsen.',
  tomEo: 'Ingen endringsordrer ennå.',
  tomEoForklaring: 'Endringsordrene vises her når de kan føres i løsningen.',
};

/** Initialene i navnet: første bokstav i første og siste ord, «PO» for «Per Olsen». */
export function initialer(navn: string): string {
  const ord = navn.trim().split(/\s+/).filter(Boolean);
  if (!ord.length) return '';
  const forbokstav = (o: string) => [...o][0].toLocaleUpperCase('nb-NO');
  return ord.length === 1 ? forbokstav(ord[0]) : forbokstav(ord[0]) + forbokstav(ord.at(-1)!);
}
