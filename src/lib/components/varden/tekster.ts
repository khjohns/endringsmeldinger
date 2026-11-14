/**
 * TEKSTER (#1331). Spørsmålene, forklaringene og virkningstekstene Varden viser,
 * samlet her så de kan kontrolleres med linse A i `design-review` før brukertesten. De er
 * ikke vedtatt brevtekst eller produktdesign. Teksten i brevene kommer fra kjernen, og
 * teksten om svarets virkning er arbeidsvalget 26.10 (`$lib/kjernesak/svarvirkning`).
 *
 * En tekst formulerer et strukturert resultat fra kjernen (et standpunkt, et beløp, et
 * brevnummer). Den finner ikke på virkningen.
 */

import { opplistet } from '$kjerne/frosset/brevdeler';
import { dager, kroner } from '$kjerne/frosset/tekst';
import type { Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { Betegnelse } from '$kjerne/utledning/visning';
import type { Kravpost, Oppgjoersform, Part, Spor, Standpunkt } from '$kjerne/typer';
import { OPPGJOERSHJEMMEL } from '$kjerne/spor/vederlag/format';
import type { Regel } from './kommandoer';
import type { Brevet, Brevref, OppgittDato, Standpunktet } from './lesing';

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
const KORT_AAR = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Oslo',
});
/** «1. okt. 2026», for datoen i en smal rad. */
export const kortDatoMedAar = (d: string) => KORT_AAR.format(new Date(d));
export const klokke = (d: string) => KLOKKE.format(new Date(d)).replace(':', '.');

/** Dagens dato i Oslo, ÅÅÅÅ-MM-DD, for `max` i et datofelt og dagene til i dag. */
export const dagensDato = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

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

const METODE: Record<Oppgjoersform, string> = {
  tilbud: 'fast sum (punkt 34.2.1)',
  enhetspriser: 'enhetspriser (punkt 34.3)',
  regningsarbeid: 'regningsarbeid (punkt 34.4)',
};
export const metodenavn = (m: unknown) =>
  METODE[m as Oppgjoersform] ?? 'metoden totalentreprenøren oppgir';

/** Oppgjørsformen etter hjemmelen i standpunktet, som kjernen fører i `OPPGJOERSHJEMMEL`. */
const oppgjoersformEtter = (hjemmel: string): Oppgjoersform | undefined =>
  (Object.keys(OPPGJOERSHJEMMEL) as Oppgjoersform[]).find((f) => OPPGJOERSHJEMMEL[f] === hjemmel);

/** En grunn fra svaret på grunnlaget i brevet `brev`, som utsagn fra byggherren. */
export const grunntekst = (grunn: Subsidiaergrunn, du: boolean, brev: Brevref) =>
  grunn === 'avslaatt'
    ? `${du ? 'Du' : 'Byggherren'} har avslått forholdet i ${brevref(brev)}`
    : `${du ? 'Du' : 'Byggherren'} har gjort gjeldende i ${brevref(brev)} at varselet om forholdet kom for sent (punkt 32.2)`;

/**
 * Standpunktet i den lukkede kravposten, kort og uten kravposten, som raden navngir (prototype v3,
 * `leselinje`). Bare standpunktene til oppgjørsformen, beløpet, varselet etter § 34.3.3 eller
 * § 34.4 og justeringen gjelder én kravpost; ellers `null`.
 */
function kortStandpunkt(s: Standpunkt, krevd?: number): string | null {
  switch (s.art) {
    case 'oppgjoersform': {
      const form = metodenavn(oppgjoersformEtter(s.hjemmel));
      return (
        (s.aksepterer
          ? `Godkjenner ${form}`
          : s.oensket
            ? `Mener ${metodenavn(s.oensket)}`
            : `Godkjenner ikke ${form}`) + (s.kreverTilbud ? `, ${SKJEMA.kreverTilbudKort}` : '')
      );
    }
    // Byggherrens standpunkt, ikke løsningens konklusjon.
    case 'rettidighet':
      if (s.hjemmel === '34.4')
        return 'Gjør gjeldende at varselet etter punkt 34.4 ikke ble gitt eller kom for sent';
      if (s.hjemmel !== '34.3.3') return null;
      return s.iTide
        ? 'Godkjenner at varselet etter punkt 34.3.3 kom i tide'
        : 'Gjør gjeldende at varselet etter punkt 34.3.3 kom for sent';
    case 'justering':
      return s.godtar ? 'Godkjenner justeringen' : 'Bestrider justeringen';
    case 'beloep':
      // KA-U72: uten aksept av tilbudet står ingen linje for beløpet.
      if (s.godkjent === undefined) return null;
      if (krevd === undefined) return `${kroner(s.godkjent)} godkjent`;
      if (s.godkjent === krevd) return `${kroner(s.godkjent)}, godkjent som krevd`;
      return `${kroner(s.godkjent)} av ${kroner(krevd)} godkjent`;
    default:
      return null;
  }
}

/** Leselinjene for kravposten `post` av linjene i svaret, med etiketten for laget foran. */
export function leselinjene(linjer: Standpunktet[], post: Kravpost): string[] {
  return linjer.flatMap((l) => {
    if (!('standpunkt' in l)) return [];
    const s = l.standpunkt;
    if (!('gjelder' in s) || s.gjelder !== post.id) return [];
    const t = kortStandpunkt(
      s,
      s.art === 'beloep' && !s.saerskilt ? (post.beloep ?? 0) : undefined
    );
    if (!t) return [];
    return [
      l.lag ? `${l.lag[0].toUpperCase()}${l.lag.slice(1)}: ${t[0].toLowerCase()}${t.slice(1)}` : t,
    ];
  });
}

/**
 * Standpunktet som utsagn fra byggherren, med «du» når byggherren leser det selv og
 * «byggherren» ellers. `krevd` er det totalentreprenøren krevde for posten. `post` er betegnelsen på kravposten
 * standpunktet gjelder, når kravet har flere (KA-U57).
 */
export function standpunkttekst(s: Standpunkt, du: boolean, krevd?: number, post?: string): string {
  const forPosten = post ? ` for ${post}` : '';
  const hvemLiten = du ? 'du' : PARTNAVN.BH;
  const hvem = `${hvemLiten[0]!.toUpperCase()}${hvemLiten.slice(1)}`;
  switch (s.art) {
    case 'rettidighet':
      // VS-U63.
      if (s.hjemmel === '34.4')
        return `${hvem} gjør gjeldende at varselet etter punkt 34.4${forPosten} ikke ble gitt eller kom for sent`;
      if (s.hjemmel === '33.6.2')
        return s.iTide
          ? `${hvem} godkjenner at svaret på forespørselen etter punkt 33.6.2 kom i tide`
          : `${hvem} gjør gjeldende at svaret på forespørselen etter punkt 33.6.2 kom for sent`;
      return s.iTide
        ? `${hvem} godkjenner at varselet etter punkt ${s.hjemmel}${forPosten} kom i tide`
        : `${hvem} gjør gjeldende at varselet etter punkt ${s.hjemmel}${forPosten} kom for sent` +
            (s.begrenset !== undefined
              ? `, og godkjenner ${kroner(s.begrenset)} etter begrensningen`
              : '');
    case 'oppgjoersform':
      return (
        (s.aksepterer
          ? `${hvem} godkjenner oppgjørsformen totalentreprenøren krever${forPosten}`
          : `${hvem} godkjenner ikke oppgjørsformen totalentreprenøren krever${forPosten}` +
            (s.oensket
              ? `, og mener vederlaget skal justeres etter ${metodenavn(s.oensket)}`
              : '')) + (s.kreverTilbud ? `, og krever et spesifisert tilbud (punkt 34.2.1)` : '')
      );
    case 'justering':
      return s.godtar
        ? `${hvem} godkjenner justeringen av enhetsprisene${forPosten} (punkt 34.3.2)`
        : `${hvem} bestrider justeringen av enhetsprisene${forPosten} (punkt 34.3.2)`;
    case 'beloep': {
      const hva = s.saerskilt ? 'Særskilt vederlagsjustering' : `Vederlagsjustering${forPosten}`;
      const av = krevd !== undefined ? ` av ${kroner(krevd)}` : '';
      // `standpunktene` i `lesing.ts` tar ikke med et beløp uten standpunkt (KA-U72).
      return `${hva}: ${hvemLiten} godkjenner ${kroner(s.godkjent!)}${av}`;
    }
    case 'forhold':
      return `${hvem} svarer på forholdet: ${s.resultat}`;
    // KA-U81: standpunktet om hindringen nevner begge vilkårene.
    case 'hindring':
      return s.oppfylt
        ? `${hvem} legger til grunn at fremdriften er hindret, og at hindringen skyldes forholdet`
        : `${hvem} legger ikke til grunn at fremdriften er hindret, eller at en hindring skyldes forholdet`;
    case 'spesifisering':
      return s.iTide
        ? `${hvem} godkjenner at kravet ble spesifisert i tide (punkt 33.6.1)`
        : `${hvem} gjør gjeldende at kravet ble spesifisert for sent (punkt 33.6.1)`;
    case 'dager': {
      const hva = `Fristforlengelse${forPosten}`;
      if (s.resultat === 'avslaatt') return `${hva}: ${hvemLiten} avslår dagene`;
      if (s.vurdert === krevd)
        return `${hva}: ${hvemLiten} godkjenner ${dager(s.vurdert)}, som krevd`;
      return `${hva}: ${hvemLiten} godkjenner ${dager(s.vurdert)}${krevd !== undefined ? ` av ${dager(krevd)}` : ''}`;
    }
    default:
      return `${hvem} tar stilling til ${(s satisfies never as Standpunkt).art}`;
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
      : `Svar på ${brevref(b)} fra totalentreprenøren · ${kortDato(b.registrert)}`,
  lesBrevet: 'Les brevet ved siden av',
  // På smal skjerm åpnes brevet i skjemaet, ikke ved siden av.
  lesBrevetHer: 'Les brevet',
  lukkBrevet: 'Lukk brevet',
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
    `Totalentreprenøren oppgir at totalentreprenøren ble klar over forholdet ${dato(d)} (${brevref(b)}).`,
  // For registrert korrespondanse har omtalen datoen totalentreprenøren oppgir, og avstanden regnes til den
  // (LV-U42, #1596).
  kravSendt: (d: string, b: Brevref) =>
    b.omtale && b.art === 'registrert'
      ? `Kravet om vederlagsjustering står i ${b.omtale}.`
      : `Kravet om vederlagsjustering ble sendt ${dato(d)} (${brevref(b)}).`,
  avstand: (dager: number) =>
    `${dager} kalenderdager fra datoen totalentreprenøren oppgir til kravet ble sendt.`,
  formSpoersmaal: 'Oppgjørsformen (punkt 34.2.2)',
  godkjennerForm: `Godkjenner ${metodenavn('tilbud')}`,
  menerForm: (m: Regel) => `Mener ${metodenavn(m)}`,
  // Kravposten etter en beregningsregel (#1756, prototype v3 `#svar`).
  formSpoersmaalRegel: 'Oppgjørsformen',
  godkjennerRegel: (m: Regel) => `Godkjenner ${metodenavn(m)}`,
  godkjennerIkkeRegel: (m: Regel) => `Godkjenner ikke ${metodenavn(m)}`,
  kreverTilbudKort: 'krever spesifisert tilbud',
  tilbudSpoersmaal: 'Spesifisert tilbud (punkt 34.2.1)',
  kreverTilbud: (post: string | null) =>
    `Krev at totalentreprenøren gir et spesifisert tilbud for ${post ?? 'kravposten'}`,
  varselJusteringSpoersmaal: 'Varselet om justering av enhetsprisene (punkt 34.3.3)',
  komITide: 'Kom i tide',
  komForSent: 'Kom for sent',
  // Punkt 34.4: normalsvaret er en setning, unntaket en lenke (prototype v4, VS-U63).
  varselRegning: 'Varselet før regningsarbeidet settes i gang (punkt 34.4).',
  ingenInnsigelse: 'Ingen innsigelse.',
  ikkeGittEllerForSent: 'Du gjør gjeldende at varselet ikke ble gitt eller kom for sent.',
  gjoerGjeldendeVarsel: 'Varselet ble ikke gitt eller kom for sent',
  ingenInnsigelseLikevel: 'Ingen innsigelse likevel',
  justeringSpoersmaal: 'Justeringen av enhetsprisene (punkt 34.3.2)',
  godkjennerJustering: 'Godkjenner justeringen',
  bestriderJustering: 'Bestrider justeringen',
  valgfritt: (spoersmaal: string) => `${spoersmaal} (valgfritt)`,
  // Beløpet står etter tittelen i komponenten, med mono (#1467).
  beloepTittel: 'Vederlagsjustering',
  beloepSpoersmaal: 'Hvor mye av beløpet godkjenner du?',
  ettSvarPerPost: 'Ett svar per kravpost. Åpne en kravpost for å svare på den.',
  godkjennAlleFormer: 'Godkjenn fast sum for alle kravpostene',
  godkjennAlle: 'Godkjenn alle kravpostene som krevd',
  // Med en kravpost etter en beregningsregel (U-9 i BF-14).
  godkjennAlleFormerRegel: 'Godkjenn oppgjørsformen totalentreprenøren krever for alle kravpostene',
  godkjennAlleFaste: 'Godkjenn alle kravpostene med fast sum som krevd',
  svaretKolonne: 'Svaret',
  teKrever: (beloep: number, pns?: string) =>
    `Totalentreprenøren krever fast sum, ${kroner(beloep)}${pns ? ` · PNS ${pns}` : ''}`,
  /** Kravposten etter en beregningsregel, med anslaget eller overslaget TE oppgir (KA-U66). */
  teKreverRegel: (p: Kravpost) => {
    const regel =
      p.oppgjoersform === 'regningsarbeid'
        ? 'regningsarbeid'
        : p.justert
          ? 'justerte enhetspriser'
          : 'kontraktens enhetspriser';
    const opplysning =
      p.oppgjoersform === 'regningsarbeid'
        ? p.kostnadsoverslag !== undefined && `kostnadsoverslag ${kroner(p.kostnadsoverslag)}`
        : p.anslag !== undefined && `anslag ${kroner(p.anslag)}`;
    return `Totalentreprenøren krever ${regel}${opplysning ? `, ${opplysning}` : ''}${p.pns ? ` · PNS ${p.pns}` : ''}`;
  },
  ikkeBesvart: 'Ikke besvart',
  endre: 'Endre',
  svarPaa: 'Svar',
  endrePost: (post: string) => `Endre svaret på ${post}`,
  svarPaaPost: (post: string) => `Svar på ${post}`,
  ferdig: 'Ferdig',
  gjelderHvis: 'Gjelder hvis',
  innsigelsenSenVarsling: 'innsigelsen om sen varsling',
  innsigelsenSaerskilt: 'innsigelsen om at varselet etter punkt 34.1.3 kom for sent',
  innsigelsenJustering: 'innsigelsen om at varselet etter punkt 34.3.3 kom for sent',
  standpunktetTilFormen: 'standpunktet ditt til oppgjørsformen',
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
  begrunnelseHjelp:
    'Valgfritt. Begrunnelsen står i brevet under punktet den gjelder, og kan vise til et annet punkt.',
  forbehold: 'Forbehold for hele svaret',
  forbeholdHjelp: 'Valgfritt. Står sist i brevet. Det erstatter ikke begrunnelsen i et punkt.',
  mangler: 'Dette mangler før brevet kan lages:',
  manglerITide: 'Velg om varselet kom i tide.',
  manglerForm: 'Velg om du godkjenner fast sum.',
  manglerFormRegel: (m: Regel) => `Velg om du godkjenner ${m}.`,
  manglerVarselJustering: 'Velg om varselet om justering av enhetsprisene kom i tide.',
  manglerJustering: 'Velg om du godkjenner justeringen av enhetsprisene.',
  manglerBeloep: 'Velg hvor mye av beløpet du godkjenner.',
  manglerDelbeloep: 'Skriv beløpet du godkjenner.',
  /** Med flere kravposter sier meldingen hvilken den gjelder. */
  iPosten: (post: string | null, tekst: string) => (post ? `${post}: ${tekst}` : tekst),
  forkast: 'Forkast utkast',
  forkastSpoersmaal: 'Forkaste utkastet? Valgene og begrunnelsen slettes.',
  forkastJa: 'Forkast',
  behold: 'Behold utkastet',
  ikkeStoettet:
    'Kravet har en post for særskilt vederlagsjustering (punkt 34.1.3). Den kan ikke besvares i denne prøven av Varden ennå.',
  /** Hinderet kjernen gir for kravet (`hindrerSvarPaaKravet`). */
  ikkeStoettetHinder: (hinder: string) =>
    `${hinder}. Svaret på det kan ikke skrives i denne prøven av Varden ennå.`,
};

/**
 * Skjemaet for byggherrens svar på kravet om fristforlengelse (G-4 i BF-20, prototypene
 * `fristsvar.html` og `fristkrav-te.html#svar`). Ordene som er felles med svaret på vederlaget,
 * står i `SKJEMA`.
 */
export const FRISTSVAR = {
  varselTittel: 'Varselet om fristforlengelse',
  varselSpoersmaal: 'Kom varselet i tide?',
  kravSendt: (d: string, b: Brevref) =>
    b.omtale && b.art === 'registrert'
      ? `Kravet om fristforlengelse står i ${b.omtale}.`
      : `Kravet om fristforlengelse ble sendt ${dato(d)} (${brevref(b)}).`,
  foresporselTittel: 'Svaret på forespørselen',
  foresporselSpoersmaal: 'Kom svaret på forespørselen om dagene i tide?',
  foresporselITide: 'Svarte i tide',
  foresporselForSent: 'Svarte for sent',
  // KA-U81: spørsmålet og valgene nevner begge vilkårene.
  hindringTittel: 'Hindringen',
  hindringSpoersmaal:
    'Legger du til grunn at fremdriften er hindret, og at hindringen skyldes forholdet?',
  hindret: 'Ja, fremdriften er hindret, og hindringen skyldes forholdet',
  ikkeHindret: 'Nei, fremdriften er ikke hindret, eller hindringen skyldes ikke forholdet',
  hindringHjelp:
    'Svaret gjelder hele kravet. Mener du at fremdriften ikke er hindret for én av fristene, avslår du dagene for den fristen og begrunner det.',
  spesifiseringTittel: 'Spesifiseringen av kravet',
  spesifiseringSpoersmaal: 'Ble kravet spesifisert i tide?',
  spesifisertITide: 'Spesifisert i tide',
  spesifisertForSent: 'Spesifisert for sent',
  spesifiseringGrense: 'Om kravet ble spesifisert i tide, avgjør partene.',
  dagerTittel: 'Fristforlengelse',
  heleKravetTapt: (hjemmel: '33.4' | '33.6.2') =>
    hjemmel === '33.4'
      ? 'du gjør gjeldende at varselet etter punkt 33.4 kom for sent, og at kravet er tapt for alle fristene'
      : 'du gjør gjeldende at svaret på forespørselen etter punkt 33.6.2 kom for sent, og at kravet er tapt for alle fristene',
  heleKravetIkkeHindret:
    'du legger ikke til grunn at fremdriften er hindret av forholdet, og ingen av fristene forlenges',
  forHeleKravet: (linjer: string[]) => `For hele kravet. ${linjer.map((l) => `${l}.`).join(' ')}`,
  ettSvarPerFrist: 'Ett svar per frist. Åpne en frist for å svare på den.',
  godkjennAlle: 'Godkjenn dagene som krevd for alle fristene',
  teKrever: (n: number) => `Totalentreprenøren krever ${dager(n)}`,
  maatteForstaaEtikett: 'Dagene du måtte forstå at totalentreprenøren hadde krav på',
  maatteForstaaHjelp: (krevd: number) =>
    `Er kravet spesifisert for sent, har totalentreprenøren bare krav på det du måtte forstå. Krevd: ${dager(krevd)}.`,
  dagerSpoersmaal: 'Hvor mange av dagene godkjenner du?',
  // U-14: når du gjør gjeldende at kravet ble spesifisert for sent.
  dagerSpoersmaalITide: 'Dagene du godtar hvis kravet ble spesifisert i tide',
  maatteForstaaLinje: (n: number) => `${dager(n)} du måtte forstå`,
  maatteForstaaPerFrist: (linjer: string[]) => `: ${opplistet(linjer)}`,
  alle: (krevd: number) => `Som krevd, ${dager(krevd)}`,
  deler: 'Delvis',
  avslaatt: 'Avslått',
  deldagerEtikett: 'Godkjente dager',
  deldagerHjelp: 'Valget over følger tallet.',
  innsigelsenVarsel: 'innsigelsen om at varselet etter punkt 33.4 kom for sent',
  innsigelsenForesporsel:
    'innsigelsen om at svaret på forespørselen etter punkt 33.6.2 kom for sent',
  standpunktetHindring: 'standpunktet ditt om at fremdriften ikke er hindret av forholdet',
  innsigelsenSpesifisering: 'innsigelsen om at kravet ble spesifisert for sent',
  manglerVarsel: 'Velg om varselet kom i tide.',
  manglerForesporsel: 'Velg om svaret på forespørselen kom i tide.',
  manglerHindring: 'Velg om du legger til grunn at fremdriften er hindret av forholdet.',
  manglerSpesifisering: 'Velg om kravet ble spesifisert i tide.',
  manglerDager: 'Velg hvor mange av dagene du godkjenner.',
  manglerDeldager: 'Skriv dagene du godkjenner, som et helt antall.',
  deldagerUtenfor: (krevd: number) =>
    `Totalentreprenøren krever ${dager(krevd)}. Du kan ikke godkjenne flere.`,
  manglerMaatteForstaa:
    'Skriv dagene du måtte forstå at totalentreprenøren hadde krav på, som et helt antall.',
  maatteForstaaForMange: 'Dagene du måtte forstå kan ikke være flere enn dagene du godkjenner.',
  forkastTekst:
    'Valgene og begrunnelsene du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  leselinjeDager: (n: number, krevd: number) =>
    n === krevd
      ? `${dager(n)}, godkjent som krevd`
      : n === 0
        ? 'Avslått'
        : `${n} av ${dager(krevd)} godkjent`,
};

export const HOVEDLINJER = {
  tittel: 'Hovedlinjene i svaret',
  tom: 'Velg et svar på spørsmålene, så står standpunktene her.',
  alternativer: 'alternativer, ikke tillegg',
  krevd: (b: number) => `${kroner(b)} krevd`,
  seBrevet: 'Se brevet før sending',
  seHovedlinjene: 'Se hovedlinjene',
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
  akseptOmfatter:
    'Godtar totalentreprenøren svaret, omfatter aksepten hele svaret, også at varselet kom for sent.',
  kontrollert: 'Jeg har kontrollert brevet',
  hvorforIkke: 'Kryss av for at du har kontrollert brevet, så kan du sende.',
  sender: 'Sender …',
  sendSvaret: 'Send svaret til totalentreprenøren',
  sendAksepten: 'Send aksepten til byggherren',
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
  sakenEndret:
    'Brevet ble ikke sendt, fordi saken er endret siden du åpnet brevkontrollen. Se over saken og brevet på nytt før du sender.',
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
  { type: 'svare_paa_foresporsel', tekst: 'Svar på forespørselen om dagene' },
  { type: 'trekke', tekst: 'Trekk kravet' },
  // Står ved datoen, ikke i «Andre handlinger» (skissen i BF-02A, #1615).
  { type: 'korrigere', tekst: 'Korriger datoen' },
];
export const ukjentHandling = (noekkel: string) => `Handlingen ${noekkel}`;

/** Varselet med hjemmelen kjernen gir handlingen (OV-U5, #1703). */
export const varselet = (type: string, hjemmel: string) =>
  `${type === 'sende_varsel' ? 'Send varsel' : 'Registrer et varsel som er sendt på annen måte'} etter punkt ${hjemmel}`;

/** Kortet «Det du kan gjøre nå», som i prototypen `grunnlagsoversikt.html`. */
export const HANDLINGENE = {
  andre: 'Andre handlinger',
  /** En brevtype som ikke er bygget i Varden (#1636). */
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
    /** Byggherrens nye svar (U-16 i BF-44). */
    nyttSvar: (svar: Brevref) =>
      `Nytt brev med svaret. Svaret i ${brevref(svar)} står som det ble sendt.`,
  },
};

export const STILLING = {
  /** Når kjernen ikke kan lage akseptbrevet og ikke sier hvorfor. */
  godta: 'Aksepten kan ikke lages nå.',
  // Etter § 34.3.3 står justeringen subsidiært, ikke beløpet (VS-U4, KA-U64).
  omfatter: (hjemmel: string) =>
    `Aksepten omfatter også at byggherren gjør gjeldende at varselet etter punkt ${hjemmel} kom for sent, ikke bare ${hjemmel === '34.3.3' ? 'det subsidiære standpunktet til justeringen' : 'det subsidiære beløpet'}.`,
  beloep: (beloep: number, b: Brevref) =>
    `Godtar du, er beløpet dere er enige om for vederlagsjusteringen ${kroner(beloep)}, etter ${brevref(b)} slik det ble sendt.`,
  /**
   * Beløpet i enigheten, og kravpostene uten fast beløp prinsipalt, som beløpet ikke regner med
   * (OV-U73, svar 6 A i #1663). Uten noe fast beløp står bare kravpostene, ikke 0 kr.
   */
  beloepet: (beloep: number, uten: string[], b: Brevref): string[] => {
    if (!uten.length) return [STILLING.beloep(beloep, b)];
    const liste = uten.length > 1 ? `${uten.slice(0, -1).join(', ')} og ${uten.at(-1)}` : uten[0];
    return beloep === 0
      ? [
          `Godtar du, har ${liste} ikke et fast beløp prinsipalt, og dere er ikke enige om et beløp for ${uten.length > 1 ? 'dem' : 'den'}.`,
        ]
      : [
          STILLING.beloep(beloep, b),
          `${liste} har ikke et fast beløp prinsipalt og er ikke regnet med i beløpet.`,
        ];
  },
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
  registrertTittel: (part: Part) => `Korrespondanse fra ${PARTNAVN[part]}`,
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
  /** En frist byggherrens svar ikke har dager for (KA-U74). */
  ikkeISvaret: 'Ikke i svaret',
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
  /** Antallet poster uten fast beløp ved summen (KA-U61, KA-U72; oppdragsgiver 12.11 i #1752). */
  utenFastBeloep: (n: number) => `${n} ${n === 1 ? 'post' : 'poster'} uten fast beløp`,
  ingenFastBeloep: 'Ingen poster med fast beløp',
};

/**
 * Brevtråden, felles for sidene for forholdet, vederlaget og fristen (#1898, U-5, U-8 og U-16 i
 * BF-44, prototypen `vederlagsoversikt.html` i oppsett B).
 */
export const TRAADEN = {
  tittel: (spor: Spor) =>
    spor === 'forhold' ? 'Brevene i saken, nyeste først' : 'Brevene, nyeste først',
  /** Hva brevet er, kort: «Svar på krav om vederlagsjustering». Et registrert brev har partens beskrivelse. */
  hva: (b: Pick<Brevet, 'art' | 'spor' | 'avsender' | 'brevtittel' | 'beskrivelse'>) => {
    if (b.art === 'registrert') return b.beskrivelse || FORHOLDET.registrertTittel(b.avsender);
    const spor = (['forhold', 'vederlag', 'frist'] as const).filter((s) => b.spor.includes(s));
    const krav = spor.filter((s) => s !== 'forhold').map((s) => `krav om ${KRAVET[s]}`);
    if (b.art === 'krav' && spor.length)
      return spor.includes('forhold')
        ? ['Påberopelse av forholdet', ...krav].join(' og ')
        : stor(krav.join(' og '));
    if (b.art === 'svar' && spor.length)
      return `Svar på ${[...(spor.includes('forhold') ? ['påberopelsen'] : []), ...krav].join(' og ')}`;
    // Den frosne tittelen nevner saken, som tråden står i («Korrigering av datoen i sak KOE-17»).
    return TIDSLINJE.hva(b).replace(/ i sak \S+$/, '');
  },
  nummer: (n: number) => `brev ${n}`,
  /** Et eldre krav, fulgt opp av et nytt brev med kravet (U-5 i BF-44). */
  fulgtOpp: (b: Brevref) => ` · fulgt opp i ${brevref(b)}`,
  /** Avsenderen for skjermleseren, som ser ringen uten tekst (oppdragsgiver 13.11). */
  fra: (part: Part) => ` fra ${PARTNAVN[part]}`,
  les: 'Les brevet',
  lukk: 'Lukk brevet',
  vises: 'Vises til høyre',
  knappenavn: (tekst: string, b: Pick<Brevet, 'nummer'>, hva: string) =>
    `${tekst}: ${b.nummer === null ? hva : `brev ${b.nummer}, ${hva}`}`,
  dokumentasjon: 'Dokumentasjon',
  registrert: (part: Part, sendt: string | null, lagtTil: string) =>
    sendt
      ? `Sendt ${dato(sendt)}, ifølge ${PARTNAVN[part]}. Lagt til ${dato(lagtTil)}.`
      : `Lagt til ${dato(lagtTil)}.`,
  vedlegg: (b: Pick<Brevet, 'nummer'>) =>
    b.nummer === null ? 'Vedlegg' : `Vedlegg til brev ${b.nummer}`,
  /** Brevet slik det ble sendt, i høyre kolonne og i raden under 1181 px (U-16). */
  brevet: 'Brevet',
  brevetSomSendt: (b: Pick<Brevet, 'nummer'>) =>
    b.nummer === null ? 'Brevet slik det ble sendt' : `Brev ${b.nummer} slik det ble sendt`,
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
  /** Panelet til venstre som saksomslaget (panel B i `vederlagsoversikt.html`, #1899). */
  sporene: 'Forholdet og kravene i saken',
  siste: (b: Brevref, part: Part) =>
    b.nummer === null && b.omtale
      ? `Siste: ${b.omtale}`
      : `Siste: ${brevref(b)} fra ${PARTNAVN[part]}`,
  /** OV-U86. */
  dokumentasjonIkkeSendt: 'Saken har dokumentasjon som er registrert, men ikke sendt herfra.',
  /** Lenkene som gjelder hele prosjektet, i topplinja (oppdragsgiver 13.11, #1899). */
  nyttKrav: 'Nytt krav om endringsordre',
  ikkeTilgjengelig: 'Dette er ikke bygget i denne prøven av Varden ennå.',
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
  /** Et fristkrav for flere frister har ingen sum (KA-U74). */
  frister: (n: number) => `${n} frister`,
  eksMva: 'eks. mva.',
  sisteBrev: 'Siste brev',
  /** Avsenderen av sakens siste brev, til brevkoden er bygget (#1174). */
  brevFra: (avsender: string) => `Fra ${avsender}`,
  ingenBrev: 'Ingen brev',
  forholdMedPunkt: (navn: string, punkt: string) => `${navn} · pkt.\u00a0${punkt}`,
  ikkeKrevd: 'Ikke krevd',
  varslet: 'Varslet',
  trukket: 'trukket',
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
    'Summen av de faste beløpene i kravene i sakene som ikke inngår i en sendt endringsordre. Kravposter etter regningsarbeid eller enhetspriser har ikke beløp, og et krav med bare slike poster telles for seg. Trukne krav og saker som TE har avsluttet, er ikke med. Krav i flere saker kan gjelde samme kostnad.',
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

/**
 * TEs krav om vederlagsjustering (BF-14, prototype v4, økt 3 i #1663). Ordene følger språkfila:
 * «vederlagsjustering» og «særskilt vederlagsjustering», partene fullt ut, «brev» og ikke
 * «versjon», og et trekk kalles ikke avkall (KA-U75, D-18).
 */
export const KRAVSKJEMA = {
  tittel: 'Krav om justering av vederlaget',
  til: 'Til byggherren (BH)',
  forholdet: (navn: string, b: Brevref) =>
    `Forholdet: ${navn}, påberopt i ${brevref(b)} · ${kortDato(b.registrert)}`,
  folgerOpp: (krav: Brevref, svar: Brevref | null) =>
    `Følger opp kravet i ${brevref(krav)}${svar ? `. Byggherren svarte i ${brevref(svar)}` : ''}`,
  lesBrevet: (b: Brevref) => `Les ${brevref(b)} ved siden av`,
  lesBrevetHer: (b: Brevref) => `Les ${brevref(b)}`,
  lukkBrevet: 'Lukk brevet',
  // 1. Vederlagsjusteringen.
  postene: 'Vederlagsjustering',
  posteneHjemmel: 'punkt 34.1.1 og 34.1.2',
  posteneIntro:
    'Del kravet i kravposter. Betegnelsen (P1, P2 …) følger posten i nye brev og i endringsordren. Beløpene er eks. mva.',
  kolonner: ['Post', 'Oppgjørsform', 'PNS', 'Beløp'],
  nyPost: 'Ny kravpost',
  // Kjernen gir betegnelsen når kravet sendes (KA-U53).
  nyBetegnelse: 'Ny',
  beskrivelse: 'Beskrivelse av posten',
  beskrivelseHjelp: 'Står i brevet og i endringsordren.',
  form: 'Oppgjørsform',
  former: [
    {
      verdi: 'tilbud' as const,
      tekst: 'Fast sum',
      forklaring:
        'Beløpet du krever, er et tilbud etter punkt 34.2.1, som byggherren kan akseptere.',
    },
    {
      verdi: 'enhetspriser' as const,
      tekst: 'Enhetspriser',
      forklaring:
        'Oppgjør etter utførte mengder med kontraktens eller justerte enhetspriser (punkt 34.3). Posten har ikke et krevd beløp.',
    },
    {
      verdi: 'regningsarbeid' as const,
      tekst: 'Regningsarbeid',
      forklaring:
        'Kostnader og påslag etter punkt 30. Skal varsles før arbeidet settes i gang (punkt 34.4). Posten har ikke et krevd beløp.',
    },
  ],
  formnavn: { tilbud: 'Fast sum', enhetspriser: 'Enhetspriser', regningsarbeid: 'Regningsarbeid' },
  beloep: 'Beløpet du krever',
  beloepHjelp: 'Eks. mva.',
  justert: 'Enhetsprisene',
  justeringer: [
    { verdi: false, tekst: 'Kontraktens enhetspriser' },
    { verdi: true, tekst: 'Justerte enhetspriser (punkt 34.3.2)' },
  ],
  anslag: 'Anslag (valgfritt)',
  anslagHjelp: 'En opplysning, ikke et tilbud.',
  overslag: 'Kostnadsoverslag (valgfritt)',
  overslagHjelp:
    'En opplysning, ikke et tilbud (punkt 30.2). Ser det ut til å bli overskredet, skal du varsle byggherren.',
  pns: 'PNS (valgfritt)',
  pnsHjelp: 'Binder ikke. Byggherren kan sette en annen i endringsordren.',
  varsellinje: (hjemmel: string, tekst: string) => `Varsel etter punkt ${hjemmel}: ${tekst}`,
  tilVarslene: 'Se under Varslene',
  ferdig: 'Ferdig',
  endre: 'Endre',
  endrePost: (post: string) => `Endre ${post}`,
  fjernNy: 'Fjern posten',
  trekk: (post: string) => `Trekk ${post}`,
  trekkes: 'Trekkes',
  trekket: (post: string) =>
    `Kravet i ${post} trekkes i dette brevet. Brevet sier det. Du kan angre før du sender.`,
  angre: 'Angre',
  angreTrekk: (post: string) => `Angre trekket av ${post}`,
  utenBeloep: 'Uten beløp',
  anslaatt: (b: string) => `anslag ${b}`,
  overslaget: (b: string) => `overslag ${b}`,
  justerte: 'justerte',
  endretFra: (brev: Brevref, foer: string, naa: string) =>
    `Endret fra ${brevref(brev)}: ${foer} → ${naa}`,
  ny: 'Ny post i dette brevet',
  sumFaste: 'Sum faste beløp i kravpostene',
  leggTil: 'Legg til kravpost',
  taMedIgjen: (post: string, beskrivelse: string) => `Ta med igjen ${post} ${beskrivelse}`,
  // 2. Den særskilte vederlagsjusteringen (OV-U89, OV-U95 punkt 3).
  saerskilt: 'Særskilt vederlagsjustering',
  saerskiltKort: 'Særskilt',
  saerskiltHjemmel: 'punkt 34.1.3 annet ledd',
  saerskiltIntro:
    'Økte utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid.',
  saerskiltBeloep: 'Beløpet du krever',
  saerskiltHjelp: 'Fast sum, eks. mva.',
  leggTilSaerskilt: 'Legg til særskilt vederlagsjustering',
  fjernSaerskilt: 'Fjern den særskilte vederlagsjusteringen',
  // 3. Varslene (prototype v4).
  varslene: 'Varslene',
  varsleneIntro:
    'Varslene kravet trenger, ut fra postene over. Har du ikke varslet før, gis varselet i dette brevet.',
  varselkolonner: ['Punkt', 'Varselet', 'Slik står det i brevet'],
  varselnavn: {
    '34.1.2': 'Varsel om vederlagsjustering',
    '34.1.3': 'Varsel om særskilt vederlagsjustering',
    '34.3.3': 'Varsel om justering av enhetsprisene',
    '34.4': 'Varsel før regningsarbeidet settes i gang',
  } as Record<string, string>,
  gjelderHele: 'Gjelder hele kravet',
  gjelderSaerskilt: 'Gjelder den særskilte posten',
  gjelderPost: (post: string) => `Gjelder ${post}`,
  ingenPostViserTil: 'Ingen kravpost viser til det',
  gisIBrevet: 'Gis i dette brevet.',
  gittIDokumentet: (type: 'brev' | 'e_post' | null, d: string) =>
    `Gitt i ${type === 'e_post' ? 'e-posten' : 'brevet'} av ${dato(d)}, som legges ved kravet.`,
  sammeDokument: (d: string) =>
    d ? `Dokumentet av ${dato(d)} legges ved én gang.` : 'Dokumentet legges ved én gang.',
  denSaerskilte: 'den særskilte vederlagsjusteringen',
  gittI: (b: Brevref) => `Gitt i ${brevref(b)}.`,
  gittMedKravet: (b: Brevref) => `Gitt med kravet i ${brevref(b)}.`,
  dagerEtterKlarOver: (dager: number, d: string) =>
    `${dager} kalenderdager etter at du ble klar over forholdet ${dato(d)}`,
  utenKravpost: (hjemmel: string) =>
    `Saken har et varsel etter punkt ${hjemmel} som ingen kravpost viser til.`,
  seVarselet: (post: string) => `Se på varselet for ${post}`,
  endreVarselet: (post: string) => `Endre varselet for ${post}`,
  gittFoer: (post: string) => `Varselet for ${post} er gitt før`,
  hvorGitt: (post: string) => `Hvor ble varselet for ${post} gitt?`,
  varselvalg: {
    kravet: 'I dette brevet',
    saken: 'I et varsel som står i saken',
    dokument: 'I et dokument sendt utenfor løsningen',
    samme: (post: string) => `Samme dokument som for ${post}`,
  },
  hvilketVarsel: 'Varselet i saken',
  varseletI: (b: Brevref) => (b.nummer === null && b.omtale ? b.omtale : brevrefStor(b)),
  ingenVarslerISaken: (hjemmel: string) =>
    `Saken har ikke noe varsel etter punkt ${hjemmel}. Legg til dokumentet i stedet.`,
  dokumenttype: 'Hva legger du til?',
  dokumenttyper: [
    { verdi: 'brev' as const, tekst: 'Brev' },
    { verdi: 'e_post' as const, tekst: 'E-post' },
  ],
  dokumentdato: 'Datoen det ble sendt',
  dokumentdatoHjelp: 'Datoen avsenderen oppgir.',
  dokumentet: 'Dokumentet',
  dokumentetHjelp: 'Legges til i saken som et eget brev og ved kravet. Opptil 15 MB.',
  // 4. Forbeholdet, som kravets utdypning til kjernen har et eget felt (svar 1 A 12.11 i #1663, #1823).
  forbehold: 'Forbehold (valgfritt)',
  forbeholdHjelp: 'Står i brevet under kravet.',
  // Det som mangler, med feltet (MM-U32, språkfila: «<Verb> <feltet>.»).
  mangler: 'Dette mangler før brevet kan lages:',
  iPosten: (post: string, tekst: string) => `${post}: ${tekst}`,
  iSaerskilt: (tekst: string) => `Særskilt vederlagsjustering: ${tekst}`,
  ingenPoster: 'Legg til en kravpost eller den særskilte vederlagsjusteringen.',
  manglerBeskrivelse: 'Beskriv posten.',
  manglerForm: 'Velg oppgjørsformen.',
  manglerBeloep: 'Skriv beløpet.',
  manglerJustert: 'Velg kontraktens eller justerte enhetspriser.',
  merEnnNull: 'Beløpet må være mer enn 0 kr.',
  manglerVarselet: 'Velg varselet i saken.',
  manglerSamme: 'Legg til dokumentet i den andre posten, eller velg et annet svar.',
  manglerType: 'Velg om dokumentet er et brev eller en e-post.',
  manglerDato: 'Oppgi datoen dokumentet ble sendt.',
  manglerDokument: 'Legg ved dokumentet.',
  // Panelet til høyre (U-15, U-16).
  punktene: 'Punktene',
  punkteneHjelp: 'Beløp eks. mva. Oppdateres mens du skriver.',
  antallPoster: (n: number) => (n === 1 ? '1 kravpost' : `${n} kravposter`),
  antallVarsler: (n: number, iBrevet: number) =>
    `${n === 1 ? '1 varsel' : `${n} varsler`} · ${iBrevet} gis i dette brevet`,
  skrevet: 'Skrevet',
  ikkeSkrevet: 'Ikke skrevet',
  forbeholdPunkt: 'Forbehold',
  fasteBeloep: 'Faste beløp',
  anslagIkkeKrevd: 'Anslag og overslag, ikke krevd',
  fordelingPns: 'Fordeling på PNS',
  pnsRad: (faste: number, anslag: number) =>
    anslag ? `${kroner(faste)} + ${kroner(anslag)} anslått` : kroner(faste),
  // U-3: veiledningen etter Del II punkt 184 stopper ikke kravet.
  pnsOver: (pns: string[], grense: number) =>
    `${pns.length === 1 ? `PNS ${pns[0]} har` : `PNS ${pns.join(' og ')} har hver`} over ${kroner(grense)}. Ved fakturering etter endringsordren skal endringen da fordeles på PNS-kodene (Del II punkt 184). PNS-en binder ikke, og byggherren kan sette en annen i endringsordren.`,
  tilbudet: (poster: string[]) =>
    `Kravet for ${opplistet(poster)} er et tilbud etter punkt 34.2.1. Byggherren kan akseptere det.`,
  regelen: (poster: string[]) =>
    `${opplistet(poster)} gjøres opp etter en beregningsregel og har ikke et krevd beløp.`,
  trekkesListe: (poster: string[]) => `${opplistet(poster)} trekkes.`,
  utkast: 'Utkast',
  ikkeSendt: 'Ikke sendt.',
  // Tidslinja (U-17).
  tidslinjeVarselet: (post: string) => `Varselet for ${post}`,
  oppgisIKravet: 'Oppgis i kravet',
  tidslinjeSendes: 'Kravet sendes',
  naarDuSender: 'I dag, når du sender',
  // Brevkontrollen og kvitteringen.
  kontroller: 'Kontroller og send',
  forrigeKravet: (krav: Brevref) => `Kravet i ${brevref(krav)}`,
  seBrevet: 'Se brevet før sending',
  sendTekst: 'Send til byggherren',
  tilbakeTil: 'utkastet',
  kvittering: 'Brevet er sendt til byggherren.',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  forkast: 'Forkast utkast',
  forkastSpoersmaal: 'Forkaste utkastet? Kravpostene og forbeholdet du har skrevet, slettes.',
  forkastJa: 'Forkast',
  behold: 'Behold utkastet',
  detteSender: {
    poster: (n: number) => `${n === 1 ? 'Én kravpost' : `${n} kravposter`} i vederlagsjusteringen`,
  },
};

/** TEs krav om fristforlengelse (G-3 i BF-20, prototypen `fristkrav-te.html#nytt-krav`). */
export const FRISTKRAV = {
  titler: {
    krav: 'Krav om fristforlengelse',
    varsel: 'Varsel om fristforlengelse etter punkt 33.4',
    svar: 'Svar på byggherrens forespørsel etter punkt 33.6.2',
  },
  nyVersjon: (krav: Brevref) => `Ny versjon av kravet i ${brevref(krav)}`,
  // 1. Varselet.
  varselTittel: 'Varselet om fristforlengelse',
  varselHjelp:
    'Varselet skal gis uten ugrunnet opphold etter at du ble eller burde ha blitt klar over forholdet, også før du kan angi dagene. Varsles det for sent, tapes kravet. Varselet gjelder hele kravet, med alle fristene.',
  kravetErVarselet: 'Dette kravet er varselet.',
  varseletSendt: (b: Brevref) => `Varselet ble sendt i ${brevref(b)}, ${dato(b.registrert)}.`,
  // U-13: varselet alene, uten dager (VS-U15).
  hvaSender: 'Hva sender du?',
  hvaValg: [
    { verdi: 'krav' as const, tekst: 'Send kravet med dagene' },
    { verdi: 'varsel' as const, tekst: 'Bare varsle etter punkt 33.4, uten dager' },
  ],
  hvaHjelp:
    'Du skal varsle uten ugrunnet opphold, også før du kan angi dagene (punkt 33.4). Sender du kravet, er det også varselet.',
  varselAleneHjelp:
    'Varsles det for sent, tapes kravet på fristforlengelse. Når du har grunnlag for å beregne omfanget, skal du uten ugrunnet opphold angi og begrunne antall dager (punkt 33.6.1).',
  hvordanVarsler: 'Hvordan varsler du?',
  varselmaate: {
    send: 'Send varselet fra løsningen nå',
    registrer: 'Registrer et brev sendt utenfor løsningen',
  },
  registrer: 'Registrer varselet',
  registrert: 'Varselet er registrert.',
  // U-6: varselet gitt før, utenfor løsningen (OV-U5, VS-U16).
  gittFoer: 'Varselet er gitt før, utenfor løsningen',
  gittFoerHjelp: 'Brevet sier når, og brevet du varslet i, legges ved.',
  likevel: 'Dette kravet er varselet likevel',
  varseldato: 'Datoen for varselet',
  varseldatoHjelp: 'Datoen settes én gang.',
  varselbrevet: 'Brevet du varslet i',
  varselbrevetHjelp: 'Legges ved. Opptil 15 MB.',
  // Datoen TE ble klar over forholdet, fra påberopelsen eller korrigeringen (MM-U52 punkt 10).
  klarOver: 'Når ble du klar over forholdet?',
  oppgittI: (b: Brevref) => `Oppgitt i ${brevref(b)}.`,
  dagerTilIDag: (d: string, n: number) =>
    `Du oppgir at du ble klar over forholdet ${dato(d)}. Sendes varselet i dag, er det ${n} kalenderdager etter.`,
  dagerTilVarselet: (d: string, varslet: string, n: number) =>
    `Du oppgir at du ble klar over forholdet ${dato(d)}. Varselet ble gitt ${dato(varslet)}, ${n} kalenderdager etter.`,
  // U-11: svaret på forespørselen etter punkt 33.6.2 (VS-U17, VS-U19).
  foresporsel: (b: Brevref, mottatt: string, dagerSiden: number) =>
    `Byggherren ber deg angi og begrunne antall dager (${brevref(b)}, ${dato(mottatt)}, mottatt ${dagerSiden === 0 ? 'i dag' : `for ${dagerSiden} ${dagerSiden === 1 ? 'dag' : 'dager'} siden`}). Svarer du ikke uten ugrunnet opphold, tapes kravet på fristforlengelse (punkt 33.6.2 tredje ledd).`,
  hvordanSvarer: 'Hvordan svarer du?',
  bokstavValg: [
    { verdi: 'a' as const, tekst: 'Angi og begrunne dagene (bokstav a)' },
    { verdi: 'b' as const, tekst: 'Begrunne hvorfor du ennå ikke kan beregne dagene (bokstav b)' },
  ],
  grunnBTittel: 'Hvorfor du ennå ikke kan beregne dagene',
  grunnBHjelp:
    'Når du kan beregne dagene, skal du uten ugrunnet opphold angi og begrunne dem. Da gjelder punkt 33.6.1 for kravet (punkt 33.6.2 femte ledd).',
  /** Linja i panelet og «Dette sender du» for varselet alene og svaret etter bokstav b. */
  dette: {
    varsel: 'Varselet etter punkt 33.4, uten dager',
    svar: 'Begrunnelse etter punkt 33.6.2 annet ledd bokstav b',
  },
  virkningB:
    'Svaret er en begrunnelse etter punkt 33.6.2 annet ledd bokstav b. For kravet du sender senere, gjelder punkt 33.6.1 (punkt 33.6.2 femte ledd).',
  virkningVarsel: (n: number | null) =>
    n === null
      ? 'Varselet etter punkt 33.4 sendes i dag. Varsles det for sent, tapes kravet.'
      : `Varselet etter punkt 33.4 sendes i dag, ${n} kalenderdager etter at du ble klar over forholdet. Varsles det for sent, tapes kravet.`,
  // 2. Fristene.
  fristerTittel: 'Fristforlengelse',
  fristerHjelp:
    'Angi dagene for hver frist kravet gjelder. Fristene står i kontrakten (Del II punkt E.1). Dagene gjelder hver frist for seg og legges ikke sammen. Dagene er kalenderdager (punkt 1.2).',
  delAvArbeidene:
    'Gjelder forlengelsen bare deler av arbeidene, beskriv det i begrunnelsen. Andelen av rigg og drift oppgis i posten for rigg og drift i vederlagskravet (Del II, tillegget til punkt 34.1.3).',
  fristEtikett: 'Fristen',
  ikkeRegistrert: 'En frist som ikke er registrert',
  ikkeRegistrertHjelp:
    'Fristen står ikke i fristtabellen for prosjektet. Skriv nummeret og navnet kontrakten gir den.',
  nummerEtikett: 'Nummer i kontrakten (valgfritt)',
  navnEtikett: 'Navnet i kontrakten',
  dagerEtikett: 'Dagene du krever',
  kalenderdager: 'Kalenderdager.',
  /** Raden før fristen er valgt, uten et tall som kan leses som nummeret i E.1 (U-1). */
  nyFrist: (n: number) => (n === 1 ? 'Ny frist' : `Ny frist ${n}`),
  nyIVersjonen: 'Ny i denne versjonen',
  trekkes: 'Trekkes',
  trekk: (navn: string) => `Trekk fristen ${navn}`,
  trekkTekst: 'Trekk fristen',
  angre: 'Angre',
  angreTrekk: (navn: string) => `Angre trekket av ${navn}`,
  fjern: 'Fjern',
  fjernFrist: (navn: string) => `Fjern ${navn}`,
  leggTil: 'Legg til frist',
  trekkHjelp:
    'En frist du tar ut, trekkes uttrykkelig. Brevet sier det, og fristen kan tas med igjen i en senere versjon.',
  // 3. Begrunnelsen.
  begrunnelseTittel: 'Begrunnelse',
  begrunnelseHjelp:
    'Kravet skal begrunnes. Fristforlengelsen skal svare til virkningen forholdet har hatt på fremdriften. Det tas blant annet hensyn til',
  hensyn: [
    'nødvendig avbrudd',
    'forskyvning av arbeidet til en ugunstigere eller gunstigere årstid',
    'den samlede virkningen av tidligere varslede forhold.',
  ],
  fremdriftsplan: 'Vis gjerne til fremdriftsplanen med kritisk linje (Del II punkt 172).',
  // Panelet.
  punktene: 'Punktene',
  ingenFrister: 'Legg til en frist, så står dagene her.',
  linje: (navn: string, d: string) => `${navn}: ${d}`,
  ikkeOppgitt: 'dagene er ikke oppgitt',
  trukketLinje: (navn: string) => `${navn}: trekkes`,
  // Det som mangler.
  manglerFrist: 'Velg fristen kravet gjelder.',
  toGanger: 'Fristen står allerede i kravet. Velg en annen frist, eller fjern denne raden.',
  ingenFristtabell:
    'Fristtabellen for prosjektet kunne ikke hentes. Last saken på nytt for å velge en frist fra den.',
  manglerNavn: 'Skriv navnet kontrakten gir fristen.',
  manglerDager: 'Skriv dagene som et helt antall.',
  nullDager: 'Et krav på 0 dager er ikke et krav. Skriv dagene du krever.',
  manglerBegrunnelse: 'Skriv begrunnelsen for kravet.',
  manglerVarseldato: 'Oppgi datoen for varselet.',
  manglerType: 'Velg om varselet ble gitt i et brev eller en e-post.',
  manglerVarselbrev: 'Legg ved brevet du varslet i.',
  manglerGrunnB: 'Skriv hvorfor du ennå ikke kan beregne dagene.',
  ingenFristerMangler: 'Kravet må gjelde minst én frist.',
  forkastTekst:
    'Fristene og begrunnelsen du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  detteSender: (n: number) => (n === 1 ? 'Kravet gjelder én frist' : `Kravet gjelder ${n} frister`),
  // «Når du sender» (U-9, U-10).
  virkningKravetErVarselet:
    'Kravet er også varselet etter punkt 33.4. Varsles det for sent, tapes kravet på fristforlengelse.',
  virkningNyVersjon: (svar: Brevref) =>
    `Etter at den nye versjonen er sendt, kan svaret i ${brevref(svar)} ikke godtas, og byggherren er ikke lenger bundet av det.`,
};
