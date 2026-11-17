import { opplistet } from '#kjerne/frosset/brevdeler.ts';
import { dager, kroner } from '#kjerne/frosset/tekst.ts';
import type { Subsidiaergrunn } from '#kjerne/regler/forhold.ts';
import type { Kravpost, Oppgjoersform, Part } from '#kjerne/typer.ts';
import type { Regel } from '../kommandoer';
import type { Brevref } from '../lesing';
import { brevref, brevrefStor, metodenavn } from './felles';
import { dato, kl, kortDato } from './format';

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
  // Svaret på oppgjørsformen, for fast sum og for en beregningsregel (#1756, prototype v3 `#svar`).
  formSpoersmaal: 'Oppgjørsformen (punkt 34.2.2)',
  formSpoersmaalRegel: 'Oppgjørsformen',
  godkjenner: (m: Oppgjoersform) => `Godkjenner ${metodenavn(m)}`,
  menerForm: (m: Regel) => `Mener ${metodenavn(m)}`,
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
  /** Til høyre på linja med labelen eller spørsmålet over et valgfritt felt (`Valgfri`). */
  valgfri: 'Valgfri',
  // Beløpet står etter tittelen i komponenten, med mono (#1467).
  beloepTittel: 'Vederlagsjustering',
  beloepSpoersmaal: 'Hvor mye av beløpet godkjenner du?',
  ettSvarPerPost: 'Ett svar per kravpost. Åpne en kravpost for å svare på den.',
  godkjennAlleFormer: 'Godkjenn fast sum for alle kravpostene',
  godkjennAlle: 'Godkjenn alle kravpostene som krevd',
  // Med en kravpost etter en beregningsregel (U-9 i BF-14).
  godkjennAlleFormerRegel: 'Godkjenn oppgjørsformen totalentreprenøren krever for alle kravpostene',
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
    'Begrunnelsen står i brevet under punktet den gjelder, og kan vise til et annet punkt.',
  forbehold: 'Forbehold for hele svaret',
  forbeholdHjelp: 'Står sist i brevet. Det erstatter ikke begrunnelsen i et punkt.',
  mangler: 'Dette mangler før brevet kan lages:',
  manglerITide: 'Velg om varselet kom i tide.',
  manglerForm: (m: Oppgjoersform) => `Velg om du godkjenner ${metodenavn(m)}.`,
  manglerVarselJustering: 'Velg om varselet om justering av enhetsprisene kom i tide.',
  manglerJustering: 'Velg om du godkjenner justeringen av enhetsprisene.',
  manglerBeloep: 'Velg hvor mye av beløpet du godkjenner.',
  manglerDelbeloep: 'Skriv beløpet du godkjenner.',
  /** Med flere kravposter sier meldingen hvilken den gjelder. */
  iPosten: (post: string | null, tekst: string) => (post ? `${post}: ${tekst}` : tekst),
  forkast: 'Forkast utkast',
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
  fra: (n: number, part: Part, d: string) => `Brev ${n} · ${part} · mottatt ${dato(d)} ${kl(d)}`,
  sendt: (d: string) =>
    `Sendt herfra ${dato(d)} ${kl(d)}. Dette er brevet slik det ble sendt, og det kan ikke endres.`,
  sendtMerke: (d: string) => `Sendt ${dato(d)}`,
  dittBrev: 'Brevet ditt er sendt.',
  forkastet: 'Utkastet er forkastet.',
  sakenEndret:
    'Brevet ble ikke sendt, fordi saken er endret siden du åpnet brevkontrollen. Se over saken og brevet på nytt før du sender.',
};
