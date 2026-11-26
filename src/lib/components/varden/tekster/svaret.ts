import { opplistet, PARTEN, stor } from '#kjerne/frosset/brevdeler.ts';
import { dager, kroner } from '#kjerne/frosset/tekst.ts';
import type { Subsidiaergrunn } from '#kjerne/regler/forhold.ts';
import type { Kravpost, Oppgjoersform, Part, Vederlagsvarselhjemmel } from '#kjerne/typer.ts';
import type { Regel } from '../kommandoer';
import type { Brevref } from '../lesing';
import { BREVSTEG, brevref, brevrefStor, metodenavn } from './felles';
import { dato, kl, haerdet } from './format';

/** Forutsetningen om et sent varsel i svarskjemaene (#2183, G-2). */
export const innsigelsenOmVarselet = haerdet(
  (hjemmel: string) => `innsigelsen om at varselet etter punkt ${hjemmel} kom for sent`
);

export const SKJEMA = haerdet({
  overskrift: 'Svar på kravet',
  // Omtalen av registrert korrespondanse har datoen i seg (LV-U45).
  svarerPaa: (b: Brevref & { avsender: Part; sendt: string | null }) =>
    b.nummer === null && b.omtale
      ? `Svarer på ${b.omtale}`
      : `Svarer på ${brevref(b)} fra ${PARTEN[b.avsender]}, ${dato(b.sendt ?? b.registrert)}`,
  // U-13 og T-2 i BF-08.
  forrigeSvar: (b: Brevref) =>
    `Det forrige svaret er ${brevref(b)}, og det står som det ble sendt.`,
  // På smal skjerm åpnes brevet i skjemaet, ikke ved siden av.
  lesBrevet: 'Les brevet ved siden av',
  lesBrevetHer: 'Les brevet',
  lukkBrevet: 'Lukk brevet',
  varselPunktTittel: 'Varselet om vederlagsjustering',
  varselSpoersmaal: 'Kom varselet om kravet i tide?',
  iTide: 'Varslet i tide',
  forSent: 'Varslet for sent',
  klarOver: (d: string, b: Brevref) =>
    `Totalentreprenøren oppgir at totalentreprenøren ble klar over forholdet ${dato(d)} (${brevref(b)}).`,
  // For registrert korrespondanse har omtalen datoen totalentreprenøren oppgir, og avstanden regnes til den
  // (LV-U45, #1596).
  kravSendt: (d: string, b: Brevref) =>
    b.omtale && b.art === 'registrert'
      ? `Kravet om vederlagsjustering står i ${b.omtale}.`
      : `Kravet om vederlagsjustering ble sendt ${dato(d)} (${brevref(b)}).`,
  avstand: (dager: number) =>
    `${dager} kalenderdager fra datoen totalentreprenøren oppgir til kravet ble sendt.`,
  // Svaret på oppgjørsformen, for fast sum og for en beregningsregel (#1756, prototype v3 `#svar`).
  formSpoersmaal: 'Oppgjørsformen (punkt 34.2.2)',
  formSpoersmaalRegel: 'Oppgjørsformen',
  godkjenner: (m: Oppgjoersform) => `${m === 'tilbud' ? 'Godkjenner' : 'Godtar'} ${metodenavn(m)}`,
  menerForm: (m: Regel) => `Mener ${metodenavn(m)}`,
  godkjennerIkkeRegel: (m: Regel) => `Godtar ikke ${metodenavn(m)}`,
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
  // Svaret på varselet som står alene (VS-U77 punkt 31, S-16).
  varseletKomForSent: 'Du gjør gjeldende at varselet kom for sent.',
  gjoerGjeldendeForSent: 'Varselet kom for sent',
  ingenInnsigelseLikevel: 'Ingen innsigelse likevel',
  // VS-U77 punkt 9, 10, 30 og 31: innsigelsen mot varselet for kravposten står fra et tidligere svar.
  varselJustering: 'Varselet om justering av enhetsprisene (punkt 34.3.3).',
  innsigelsenStaar: (b: Brevref, hjemmel: Vederlagsvarselhjemmel, ikkeGitt = true) =>
    `Du har gjort gjeldende i ${brevref(b)} at varselet ${innsigelsesordene(hjemmel, ikkeGitt)}.`,
  gjentarInnsigelsen: 'Svaret gjentar innsigelsen.',
  girOppInnsigelsen: 'Du gir opp innsigelsen.',
  girOppInnsigelsenKnapp: 'Gi opp innsigelsen',
  gjentaInnsigelsenKnapp: 'Gjenta innsigelsen',
  // VS-U77 punkt 8 og 30: «i tide» står mot senere kravversjoner.
  varseletITideFoer: (b: Brevref) => `Du har godkjent i ${brevref(b)} at varselet kom i tide.`,
  justeringSpoersmaal: 'Justeringen av enhetsprisene (punkt 34.3.2)',
  // Spørsmålene i et punkt med egen overskrift, i svaret på varselet som står alene.
  varselSpoersmaalKort: 'Kom varselet i tide?',
  justeringSpoersmaalKort: 'Godtar du justeringen av enhetsprisene?',
  godkjennerJustering: 'Godtar justeringen',
  bestriderJustering: 'Bestrider justeringen',
  /** Til høyre på linja med labelen eller spørsmålet over et valgfritt felt (`Valgfri`). */
  valgfri: 'Valgfri',
  // Beløpet står etter tittelen i komponenten, med mono (#1467).
  beloepTittel: 'Vederlagsjustering',
  beloepSpoersmaal: 'Hvor mye av beløpet godkjenner du?',
  kravpostene: 'Kravpostene',
  ettSvarPerPost: 'Ett svar per kravpost. Åpne en kravpost for å svare på den.',
  godkjennAlleFormer: 'Godkjenn fast sum for alle kravpostene',
  godkjennAlle: 'Godkjenn alle kravpostene som krevd',
  // Med en kravpost etter en beregningsregel (U-9 i BF-14).
  godkjennAlleFormerRegel: 'Godta oppgjørsformen totalentreprenøren krever for alle kravpostene',
  godkjennAlleFormerBlandet: 'Godkjenn fast sum og godta beregningsreglene for alle kravpostene',
  godkjennAlleFaste: 'Godkjenn alle kravpostene med fast sum som krevd',
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
  // Posten etter punkt 34.1.3 annet ledd (VS-U5, #2422).
  saerskiltPosten: 'Særskilt vederlagsjustering',
  teKreverSaerskilt: (beloep: number) => `Totalentreprenøren krever ${kroner(beloep)}`,
  begrensetEtikett: 'Beløpet du godkjenner etter begrensningen',
  begrensetHjelp: 'Kan være 0 kr. Det kan ikke være høyere enn beløpet du godkjenner under.',
  godkjennerEtterBegrensningen: (beloep: string) => `godkjenner ${beloep} kr etter begrensningen`,
  manglerSaerskiltITide: 'Velg om varselet om særskilt vederlagsjustering kom i tide.',
  manglerBegrenset: 'Skriv beløpet du godkjenner etter begrensningen.',
  begrensetOver:
    'Beløpet etter begrensningen er høyere enn beløpet du godkjenner under. Endre ett av beløpene.',
  ikkeBesvart: 'Ikke besvart',
  endre: 'Endre',
  svarPaa: 'Svar',
  endrePost: (post: string) => `Endre svaret på ${post}`,
  svarPaaPost: (post: string) => `Svar på ${post}`,
  ferdig: 'Ferdig',
  gjelderHvis: 'Gjelder hvis',
  standpunktetTilFormen: 'standpunktet ditt til oppgjørsformen',
  grunnen: (grunn: Subsidiaergrunn, brev: Brevref) =>
    grunn === 'avslaatt'
      ? `avslaget av forholdet i ${brevref(brev)}`
      : `${innsigelsenOmVarselet('32.2')} (${brevref(brev)})`,
  ikkeFoererFrem: 'ikke fører frem',
  hele: 'Hele beløpet',
  deler: 'Deler av beløpet',
  ingenting: 'Ingenting',
  belopEtikett: 'Beløpet du godkjenner',
  belopHjelp: (krevd: number) => `Mer enn 0 kr og mindre enn ${kroner(krevd)}.`,
  begrunnelse: 'Begrunnelse',
  begrunnelseHjelp:
    'Begrunnelsen står i brevet under punktet den gjelder, og kan vise til et annet punkt.',
  // #2359: ordet brevet bruker (`FORBEHOLDSPUNKTET` i `kjerne/frosset/brevtekst.ts`).
  forbehold: 'Forbehold',
  skrevet: 'Skrevet',
  staarIBrevet: 'Står i brevet',
  ikkeSkrevet: 'Ikke skrevet',
  forholdspunktet: 'Forholdet',
  forbeholdHjelp: 'Står sist i brevet. Det erstatter ikke begrunnelsen i et punkt.',
  mangler: 'Dette mangler før brevet kan lages:',
  lagfeil: 'Vi kunne ikke beregne vilkårene for svaret. Prøv å laste saken på nytt.',
  manglerITide: 'Velg om varselet kom i tide.',
  manglerForm: (m: Oppgjoersform) =>
    `Velg om du ${m === 'tilbud' ? 'godkjenner' : 'godtar'} ${metodenavn(m)}.`,
  manglerJustering: 'Velg om du godtar justeringen av enhetsprisene.',
  manglerBeloep: 'Velg hvor mye av beløpet du godkjenner.',
  manglerDelbeloep: 'Skriv beløpet du godkjenner.',
  /** Med flere kravposter sier meldingen hvilken den gjelder. */
  iPosten: (post: string | null, tekst: string) => (post ? `${post}: ${tekst}` : tekst),
  forkast: 'Forkast utkast',
  behold: 'Behold utkastet',
  /** Hinderet kjernen gir for kravet (`hindrerSvarPaaKravet`). */
  ikkeStoettetHinder: (hinder: string) =>
    `${hinder}. Svaret på det kan ikke skrives i denne prøven av Varden ennå.`,
});

/** Varselet i vederlaget med navnet i skjemaene for svaret på det. */
const VARSELNAVNET = {
  '34.1.2': 'varselet om vederlagsjustering',
  '34.1.3': 'varselet om særskilt vederlagsjustering',
  '34.3.3': 'varselet om justering av enhetsprisene',
  '34.4': 'varselet om regningsarbeid',
} as const satisfies Record<Vederlagsvarselhjemmel, string>;

/**
 * Ordene for innsigelsen mot varselet, med `ikkeGitt` for innsigelsen etter § 34.4 i svaret på
 * kravposten (VS-U77 punkt 31).
 */
export const innsigelsesordene = (hjemmel: Vederlagsvarselhjemmel, ikkeGitt = true) =>
  hjemmel === '34.4' && ikkeGitt ? 'ikke ble gitt eller kom for sent' : 'kom for sent';

/** Svaret på et varsel i vederlaget som står alene (G-9 i BF-14, VS-U79, VS-U87 punkt 32). */
export const VARSELSVARET = haerdet({
  punktet: (h: Vederlagsvarselhjemmel) => `${stor(VARSELNAVNET[h])} (punkt ${h})`,
  // #2359: ordene brevet bruker (`TEMAENE_I_SVARET_PAA_VARSELET` i `kjerne/frosset/brevtekst.ts`).
  justeringen: 'Justering av enhetsprisene (punkt 34.3.2)',
  // VS-U77 punkt 31: uten innsigelse trenger byggherren ikke svare.
  manglerInnsigelse:
    'Ingenting å sende. Varselet krever ikke svar. Gjør gjeldende at det kom for sent, eller forkast utkastet.',
  // VS-U87 punkt 32, OV-U89 punkt 13.
  krevesIkke: 'Ingenting å sende. Punkt 34.1.2 krever ikke varsel. Forkast utkastet.',
  /** Punktet og panelet, uten noe å velge. */
  krevesIkkeLinje:
    'Saken gjelder en endring, og da krever ikke punkt 34.1.2 varsel. Du tar ikke stilling til om varselet kom i tide.',
  // Med brevet når saken har flere varsler etter samme bestemmelse (VS-U77 punkt 27).
  /** Med arbeidet etter VS-U87 punkt 27. */
  svar: (h: Vederlagsvarselhjemmel, b?: Brevref, arbeid?: string) =>
    `Svar på ${VARSELNAVNET[h]}${b ? ` i ${brevref(b)}` : ''}${arbeid ? `: ${arbeid}` : ''}`,
  nyttSvar: (h: Vederlagsvarselhjemmel, b?: Brevref, arbeid?: string) =>
    `Nytt svar på ${VARSELNAVNET[h]}${b ? ` i ${brevref(b)}` : ''}${arbeid ? `: ${arbeid}` : ''}`,
  /** U-8 i BF-37: arbeidet under navnet på varselet. */
  arbeidet: (arbeid: string) => `Arbeidet varselet gjelder: ${arbeid}`,
  // Kortet med svarene fra forrige brev i høyre kolonne i svaret på varselet (VS-U65).
  svareneFoer: (b: Brevref) => `Svarene på kravet i ${brevref(b)}`,
  svareneStaar: 'Svaret på varselet endrer ikke disse svarene.',
  endreDem: 'Vil du endre dem, sender du et nytt svar på kravet.',
  svaretI: (b: Brevref) => `Svaret i ${brevref(b)}`,
  nyttSvarPaaKravet: 'Nytt svar på kravet',
});

/**
 * Skjemaet for byggherrens svar på kravet om fristforlengelse (G-4 i BF-20, prototypene
 * `fristsvar.html` og `fristkrav-te.html#svar`). Ordene som er felles med svaret på vederlaget,
 * står i `SKJEMA`.
 */
export const FRISTSVAR = haerdet({
  varselSpoersmaal: 'Kom varselet i tide?',
  kravSendt: (d: string, b: Brevref) =>
    b.omtale && b.art === 'registrert'
      ? `Kravet om fristforlengelse står i ${b.omtale}.`
      : `Kravet om fristforlengelse ble sendt ${dato(d)} (${brevref(b)}).`,
  foresporselSpoersmaal: 'Kom svaret på forespørselen om dagene i tide?',
  foresporselITide: 'Svarte i tide',
  foresporselForSent: 'Svarte for sent',
  // VS-U95: i stedet for spørsmålet om svaret kom i tide, og spørsmålet nevner begge.
  begrunnelseSpoersmaal: 'Hva gjør du gjeldende om totalentreprenørens begrunnelse?',
  begrunnelseIkkeSvar: 'Begrunnelsen er ikke et svar',
  begrunnelseIkkeSvarForklaring: (b: Brevref | null) =>
    `Totalentreprenørens begrunnelse${b ? ` i ${brevref(b)}` : ''} er ikke et svar på forespørselen etter punkt 33.6.2 annet ledd.`,
  // KA-U81: spørsmålet og valgene nevner begge vilkårene.
  hindringTittel: 'Hindringen',
  hindringSpoersmaal:
    'Legger du til grunn at fremdriften er hindret, og at hindringen skyldes forholdet?',
  hindret: 'Ja, fremdriften er hindret, og hindringen skyldes forholdet',
  ikkeHindret: 'Nei, fremdriften er ikke hindret, eller hindringen skyldes ikke forholdet',
  hindringHjelp:
    'Svaret gjelder hele kravet. Mener du at fremdriften ikke er hindret for én av fristene, avslår du dagene for den fristen og begrunner det.',
  spesifiseringSpoersmaal: 'Ble kravet spesifisert i tide?',
  spesifisertITide: 'Spesifisert i tide',
  spesifisertForSent: 'Spesifisert for sent',
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
  maatteForstaaHjelp: (grense: number | undefined) =>
    grense === undefined
      ? 'Høyst like mange dager som du godkjenner.'
      : `Høyst ${dager(grense)}. Det er dagene du godkjenner.`,
  dagerSpoersmaal: 'Hvor mange av dagene godkjenner du?',
  // U-14: når du gjør gjeldende at kravet ble spesifisert for sent.
  dagerSpoersmaalITide: 'Dagene du godkjenner hvis kravet ble spesifisert i tide',
  maatteForstaaLinje: (n: number) => `${dager(n)} du måtte forstå`,
  maatteForstaaPerFrist: (linjer: string[]) => `: ${opplistet(linjer)}`,
  alle: (krevd: number) => (krevd === 1 ? 'Den ene dagen' : `Alle ${krevd} dagene`),
  deler: 'Delvis',
  avslaatt: 'Avslått',
  deldagerEtikett: 'Godkjente dager',
  deldagerHjelp: 'Valget oppdateres når du skriver antall dager.',
  innsigelsenForesporsel:
    'innsigelsen om at svaret på forespørselen etter punkt 33.6.2 kom for sent',
  standpunktetHindring: 'standpunktet ditt om at fremdriften ikke er hindret av forholdet',
  innsigelsenSpesifisering: 'innsigelsen om at kravet ble spesifisert for sent',
  manglerVarsel: 'Velg om varselet kom i tide.',
  manglerForesporsel: 'Velg om svaret på forespørselen kom i tide.',
  manglerHindring: 'Velg om du legger til grunn at fremdriften er hindret av forholdet.',
  manglerSpesifisering: 'Velg om kravet ble spesifisert i tide.',
  manglerDager: 'Velg hvor mange av dagene du godkjenner.',
  manglerDeldager: 'Skriv et helt antall dager.',
  ugyldigeDeldager: 'Skriv et positivt helt antall dager.',
  deldagerUtenfor: (krevd: number) =>
    `Totalentreprenøren krever ${dager(krevd)}. Du kan ikke godkjenne flere.`,
  manglerMaatteForstaa:
    'Skriv dagene du måtte forstå at totalentreprenøren hadde krav på, som et helt antall.',
  maatteForstaaHoeyst: (grense: number) => `Skriv høyst ${dager(grense)}.`,
  leselinjeDager: (n: number, krevd: number) =>
    n === 0
      ? 'Avslått'
      : n === krevd
        ? n === 1
          ? '1 dag godkjent'
          : `Alle ${n} dagene godkjent`
        : `${n} av ${dager(krevd)} godkjent`,
});

// Arbeidsvalget 26.10 i #1303, GR-U7, GR-U23, GR-U26 og OV-U45.
export const VIRKNING = haerdet({
  sammenfall: (kravet: 'fristforlengelse' | 'vederlagsjustering') =>
    `Svaret samsvarer med totalentreprenørens krav om ${kravet}. Enigheten registreres uten at totalentreprenøren må godta svaret.`,
  forbehold:
    'Byggherren har ikke svart på påberopelsen. Byggherren har heller ikke avklart forholdet ved å frafalle pålegget. Standpunktene i svaret gjelder hvis forholdet gir rett til kravet. Godtar totalentreprenøren et avslag på forholdet, får enigheten om kravet ingen virkning.',
});

export const HOVEDLINJER = haerdet({
  tittel: BREVSTEG.punktene,
  tom: 'Velg et svar på spørsmålene, så står standpunktene her.',
  alternativer: 'Beløpene er alternativer, ikke tillegg.',
  krevd: (b: number) => `${kroner(b)} krevd`,
  seBrevet: 'Se brevet før sending',
  seHovedlinjene: 'Se hovedlinjene',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  beloepUtenfor: (krevd: number) =>
    `Beløpet du godkjenner må være mer enn 0 kr og mindre enn ${kroner(krevd)}.`,
});

export const BREVKONTROLL = haerdet({
  utkast: 'Utkast · ikke sendt',
  tilbake: (hva: string) => `Tilbake til ${hva}`,
  mottaker: 'Mottaker',
  svarerPaa: 'Svarer på',
  viserTil: 'Viser til',
  svarerPaaBrev: (b: Brevref) => brevrefStor(b),
  datoSettes: 'Settes ved sending',
  /** Virkningen av sendingen, adskilt fra innholdet (oppdragsgiver 06.11, PR 1650). */
  naarDuSender: 'Når du sender',
  akseptOmfatter:
    'Godtar totalentreprenøren svaret, omfatter aksepten hele svaret, også at varselet kom for sent.',
  kontrollert: 'Jeg har kontrollert brevet',
  hvorforIkke: 'Kryss av for at du har kontrollert brevet, så kan du sende.',
  sender: 'Sender …',
  sendSvaret: 'Send til totalentreprenøren',
  sendAksepten: 'Send til byggherren',
});

/** Sikre sendefeil i brevkontrollen (#2188, E-2). */
export const SENDEFEIL = haerdet({
  tittel: 'Brevet ble ikke sendt',
  ingenTilgang: 'Beklager, du har ikke tilgang til å sende brev i saken nå.',
  loggInn: 'Logg inn på nytt i en ny fane',
  /** Svar 6A fra oppdragsgiver 19.11 (#2209): 403 er oftest manglende tilgang, ikke utløpt innlogging. */
  kontaktAdministrator: 'Mangler du tilgang, kontakt den som administrerer prosjektet.',
  serverfeil: 'Beklager, det oppstod en feil hos oss. Utkastet er som før.',
  proevSenere: 'Prøv igjen om litt.',
  seOverBrevet: 'Se over brevet',
  nyttNummer: 'En annen sak fikk nummeret i brevet. Brevet har nå det nye nummeret.',
});

export const USIKKERT_UTFALL = haerdet({
  tittel: 'Vi vet ikke om brevet ble sendt',
  forklaring: 'Brevet sendes ikke to ganger.',
  proevIgjen: 'Prøv å sende igjen',
});

export const MOTTATT = haerdet({
  fra: (n: number, part: Part, d: string) => `Brev ${n} · ${part} · mottatt ${dato(d)} ${kl(d)}`,
  sendt: (d: string) =>
    `Sendt herfra ${dato(d)} ${kl(d)}. Dette er brevet slik det ble sendt, og det kan ikke endres.`,
  sendtMerke: (d: string) => `Sendt ${dato(d)} ${kl(d)}`,
  saken: 'saken',
  /** Brevet er sidens, ikke «ditt» (`docs/sprak.md`, «Brevet er sidens»). */
  sendtTil: (mottaker: Part) => `Brevet er sendt til ${PARTEN[mottaker]}.`,
  forkastet: 'Utkastet er forkastet.',
  sakenEndret:
    'Brevet ble ikke sendt, fordi saken er endret siden du åpnet brevkontrollen. Se over saken og brevet på nytt før du sender.',
});

/** Ordene i det felles svarskjemaet (`Svarskjema.svelte`). */
export const SVARSKJEMA = haerdet({
  postKolonne: 'Post',
  fristKolonne: 'Frist',
  kravetKolonne: 'Kravet',
  svaretKolonne: 'Svaret, slik det står i brevet',
  /** Den skjulte etiketten for svaret i hver rad, der overskriften står over kolonnen. */
  svaret: 'Svaret',
  forkastTekst:
    'Valgene og begrunnelsene du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  kompaktLinje: 'Hovedlinjene og brevkontrollen',
} as const);
