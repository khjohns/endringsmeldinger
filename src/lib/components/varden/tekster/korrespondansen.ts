import { liste, stor } from '#kjerne/frosset/brevdeler.ts';
import { KORRESPONDANSETYPEN } from '#kjerne/frosset/tekst.ts';
import type { Korrespondansetype, Part, Sendemaate, Spor, Varselhjemmel } from '#kjerne/typer.ts';
import type { Brevet, Brevref } from '../lesing';
import { GRENSEN_FOR_VEDLEGG, SPORNAVN, brevref, brevrefStor } from './felles';
import type { Korrespondansehva, Korrespondansekategori } from './typer';
import { dato, haerdet } from './format';
import { KRAVSKJEMA } from './kravskjema';

const KORRESPONDANSEORD: Record<
  Korrespondansehva,
  {
    bestemt: string;
    typen: string;
    typenMangler: string;
    dokumentet: string;
    dokumentMangler: string;
  }
> = {
  korrespondanse: {
    bestemt: 'korrespondansen',
    typen: 'Hva legger du til?',
    typenMangler: 'Velg hva du legger til.',
    dokumentet: 'Dokumentet',
    dokumentMangler: 'Legg ved dokumentet.',
  },
  varsel: {
    bestemt: 'varselet',
    typen: 'Hvordan ble varselet gitt?',
    typenMangler: 'Velg hvordan varselet ble gitt.',
    dokumentet: 'Dokumentet du varslet i',
    dokumentMangler: 'Legg ved dokumentet du varslet i.',
  },
  krav: {
    bestemt: 'kravet',
    typen: 'Hvordan ble kravet sendt?',
    typenMangler: 'Velg hvordan kravet ble sendt.',
    dokumentet: 'Dokumentet med kravet',
    dokumentMangler: 'Legg ved dokumentet med kravet.',
  },
  svar: {
    bestemt: 'svaret',
    typen: 'Hvordan ble svaret sendt?',
    typenMangler: 'Velg hvordan svaret ble sendt.',
    dokumentet: 'Dokumentet med svaret',
    dokumentMangler: 'Legg ved dokumentet med svaret.',
  },
  aksept: {
    bestemt: 'aksepten',
    typen: 'Hvordan ble aksepten sendt?',
    typenMangler: 'Velg hvordan aksepten ble sendt.',
    dokumentet: 'Dokumentet med aksepten',
    dokumentMangler: 'Legg ved dokumentet med aksepten.',
  },
};

/**
 * Korrespondansen sendt utenfor løsningen, i den felles komponenten for varselet, kravet, svaret
 * og aksepten (OV-U79, OV-U80, OV-U98, VS-U34, A1 i #2056). Ordene følger fristkravet (#2063).
 */
export const KORRESPONDANSEN = haerdet({
  typen: (hva: Korrespondansehva) => KORRESPONDANSEORD[hva].typen,
  // G-14 i BF-49: typene og ordene er kjernens, og et notat er «dokument» der (arbeidsvalget 1 A
  // 16.11 i #807), så valget sier at det gjelder begge.
  typer: (Object.keys(KORRESPONDANSETYPEN) as Korrespondansetype[]).map((verdi) => ({
    verdi,
    tekst:
      verdi === 'notat' ? 'Notat eller annet dokument' : stor(KORRESPONDANSETYPEN[verdi].ubestemt),
  })),
  // VS-U39 ved varselet etter punkt 32.2, og VS-U72 ved varsler og krav etter kapittel 33 og 34.
  kapittelB:
    'Etter kapittel B i kontraktsgrunnlaget skal varsel om endring sendes på byggherrens skjema, som brev, som PDF i e-post eller i prosjekthotellet når prosjektet bruker det. En e-post alene eller et møtereferat er ikke nok.',
  sendemaaten: 'Hvordan ble brevet sendt?',
  sendemaater: [
    { verdi: 'post', tekst: 'Per post' },
    { verdi: 'pdf_e_post', tekst: 'Som PDF i e-post' },
    { verdi: 'prosjekthotell', tekst: 'I prosjekthotellet' },
    { verdi: 'annen_maate', tekst: 'På annen måte' },
  ] satisfies { verdi: Sendemaate; tekst: string }[],
  dato: 'Datoen det ble sendt',
  // OV-U80: datoen for varselet settes én gang.
  datoHjelp: 'Datoen avsenderen oppgir. Den settes én gang.',
  dokumentet: (hva: Korrespondansehva) => KORRESPONDANSEORD[hva].dokumentet,
  dokumentetHjelp: (hva: Korrespondansehva) =>
    hva === 'korrespondanse'
      ? `Legges til i saken. Opptil ${GRENSEN_FOR_VEDLEGG}.`
      : `Legges til i saken og ved brevet. Opptil ${GRENSEN_FOR_VEDLEGG}.`,
  dokumentetIkkeEnnaa: 'Dokumentet kan ikke legges ved ennå.',
  beskrivelse: (hva: Korrespondansehva) => `Kort beskrivelse av ${KORRESPONDANSEORD[hva].bestemt}`,
  beskrivelseHjelp: 'Kort, med egne ord.',
  mangler: (hva: Korrespondansehva) => ({
    type: KORRESPONDANSEORD[hva].typenMangler,
    sendemaate: 'Velg hvordan brevet ble sendt.',
    dato: `Oppgi datoen ${KORRESPONDANSEORD[hva].bestemt} ble sendt.`,
    dokument: KORRESPONDANSEORD[hva].dokumentMangler,
    beskrivelse: `Beskriv ${KORRESPONDANSEORD[hva].bestemt}.`,
  }),
});

/**
 * Skjemaet for korrespondanse sendt utenfor løsningen og lagt til i saken (OV-U79, OV-U80, OV-U98,
 * prototypen `grunnlagsoversikt.html#reg-skjema`, arbeidsvalget 16.11 i #807).
 */
export const LEGG_TIL = haerdet({
  tittel: 'Legg til korrespondanse',
  tittelPaaNytt: 'Legg til korrespondansen på nytt',
  /** U-12 i BF-49: skjemaet er utfylt fra dokumentasjonen det retter. */
  paaNytt: (lagtTil: string) =>
    `Legges til i stedet for korrespondansen lagt til ${dato(lagtTil)}. Endre det som var feil.`,
  // OV-U80: løsningen vurderer ikke innholdet, og sier ikke hva det betyr for partenes rettigheter.
  vurderes: 'Løsningen vurderer ikke innholdet i dokumentet.',
  // U-2 og U-3 i BF-49.
  avsenderen: 'Hvem sendte det?',
  avsendere: [
    { verdi: 'TE', tekst: 'Totalentreprenøren' },
    { verdi: 'BH', tekst: 'Byggherren' },
  ] satisfies { verdi: Part; tekst: string }[],
  avsenderMangler: 'Velg hvem som sendte det.',
  motparten:
    'Du legger til noe motparten har sendt. Det står som dokumentasjon til avsenderen selv sier hva det er.',
  gjelder: 'Gjelder',
  gjelderHjelp: 'Velger du ingen, står det ved saken.',
  kategorien: 'Hva er det etter kontrakten?',
  kategorier: {
    dokumentasjon: 'Dokumentasjon, for eksempel en avklaring',
    varsel: 'Et varsel',
    krav: 'Et krav',
    svar: 'Et svar',
    aksept: 'En aksept av byggherrens svar',
  } satisfies Record<Korrespondansekategori, string>,
  kategorienMangler: 'Velg hva det er etter kontrakten.',
  // OV-U80: løsningen utleder ikke noe av dokumentasjonen.
  // OV-U80: skjemaet åpnes i samme forløp og viser til korrespondansen.
  // U-5 i BF-49 og #2455: varslene i ett brev, også i flere spor.
  varslene: 'Hvilke varsler?',
  varsleneHjelp:
    'Velg ett eller flere. Datoen over blir datoen for varselet, og den settes én gang.',
  varsleneMangler: 'Velg minst ett varsel.',
  varselnavn: {
    '32.2': 'Varsel om irregulær endring',
    '33.4': 'Varsel om fristforlengelse',
    ...KRAVSKJEMA.varselnavn,
  } as Record<Varselhjemmel, string>,
  varselvalg: (navn: string, h: Varselhjemmel) => `${navn} (punkt ${h})`,
  klarOverHjelp: 'Datoen dokumentet oppgir, hvis det oppgir en.',
  neste: {
    krav: 'Når du går videre, åpnes kravskjemaet. Det viser til korrespondansen, og du fyller det ut slik kravet står i dokumentet, uten begrunnelsen.',
    svar: 'Når du går videre, åpnes svarskjemaet. Det viser til korrespondansen, og du fyller det ut slik svaret står i dokumentet, uten begrunnelsen.',
  },
  /** VS-U74. */
  kravetErVarselet:
    'Et brev som både varsler og krever, legger du til som krav. Kravet gjelder da også som varselet.',
  svaret: 'Hvilket svar godtok du?',
  svaretHjelp: 'Byggherrens svar i saken. Aksepten gjelder fra datoen du oppgir.',
  svaretMangler: 'Velg svaret aksepten gjelder.',
  svaretValg: (b: Brevet) => `${brevrefStor(b)} av ${dato(b.sendt ?? b.registrert)}`,
  leggTil: 'Legg til',
  gaaVidere: 'Gå videre',
  avbryt: 'Avbryt',
  lagtTil: {
    dokumentasjon: 'Korrespondansen er lagt til.',
    varsel: 'Varselet er lagt til.',
    krav: 'Kravet er lagt til.',
    svar: 'Svaret er lagt til.',
    aksept: 'Aksepten er lagt til.',
  },
  /** Linja øverst i krav- og svarskjemaet (OV-U80). */
  fra: (omtale: string) => `Legges til fra ${omtale}.`,
  // OV-U80: løsningen lager ingen brevtekst, og der skjemaet og dokumentet spriker, er
  // dokumentet partens meddelelse.
  fraHjelp:
    'Løsningen lager ingen brevtekst. Der skjemaet og dokumentet spriker, er det dokumentet som er sendt.',
  endre: 'Endre korrespondansen',
  utkast: 'Utkast · ikke lagt til',
  ikkeLagtTil: 'Ikke lagt til.',
  ikkeLagtTilFeil: 'Korrespondansen ble ikke lagt til.',
  mangler: 'Dette mangler før det kan legges til:',
  leggTilKravet: 'Legg til kravet',
  leggTilSvaret: 'Legg til svaret',
  /** OV-U102. */
  kravUtenforRekken: (spor: Spor) =>
    `Kravet er sendt før totalentreprenørens siste krav om ${SPORNAVN[spor].toLowerCase()}. Det blir ikke gjeldende, men datoen det ble sendt, gjelder som datoen kravet først ble sendt.`,
  /** OV-U103. */
  svarUtenforRekken:
    'Svaret er sendt før byggherrens gjeldende svar på kravet. Det blir ikke gjeldende og erstatter ikke det nyere svaret.',
  /** U-10 og U-11 i BF-49: kategorien og merket ved korrespondansen i tråden. */
  merke: {
    dokumentasjon: 'Dokumentasjon',
    varsel: 'Varsel',
    krav: 'Krav',
    svar: 'Svar',
    aksept: 'Aksept',
  } satisfies Record<Korrespondansekategori, string>,
  ikkeFyltUt: 'Skjemaet er ikke fylt ut',
  /** U-12 i BF-49. */
  leggTilPaaNytt: 'Legg til på nytt',
  leggTilPaaNyttNavn: (hva: string) => `Legg til på nytt: ${hva}`,
  retter: (lagtTil: string) =>
    `Lagt til på nytt i stedet for korrespondansen lagt til ${dato(lagtTil)}.`,
  rettet: (lagtTil: string) => `Erstattet av korrespondansen lagt til på nytt ${dato(lagtTil)}.`,
  /** OV-U104 og MM-U50 punkt 8. */
  sammeDag: (brev: readonly Brevref[]) =>
    `Sendt samme dag som ${liste([...new Set(brev.map(brevref))])}. Rekkefølgen er ikke kjent her. Det er ikke avgjort hvilket brev som kom først, eller hvem som er bundet.`,
});
