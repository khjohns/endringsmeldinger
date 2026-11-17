import { liste } from '#kjerne/frosset/brevdeler.ts';
import type { Korrespondansetype, Sendemaate, Spor } from '#kjerne/typer.ts';
import type { Brevet, Brevref } from '../lesing';
import { GRENSEN_FOR_VEDLEGG, SPORNAVN, brevref, brevrefStor } from './felles';
import type { Korrespondansehva, Korrespondansekategori } from './typer';
import { dato, haerdet } from './format';

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
  typer: [
    { verdi: 'brev', tekst: 'Brev' },
    { verdi: 'e_post', tekst: 'E-post' },
    { verdi: 'moetereferat', tekst: 'Møtereferat' },
    { verdi: 'notat', tekst: 'Notat eller annet dokument' },
  ] satisfies { verdi: Korrespondansetype; tekst: string }[],
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
  inngangHjelp: 'Brev, e-post, møtereferat eller notat du har sendt utenfor løsningen.',
  // Arbeidsvalget 16.11, punkt 2: bare det parten selv har sendt (avsenderen er #2069).
  egen: 'Du legger til det du selv har sendt.',
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
  neste: {
    varsel: 'Når du går videre, åpnes skjemaet for varselet med det du har fylt ut her.',
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
  /** OV-U104 og MM-U50 punkt 8. */
  sammeDag: (brev: readonly Brevref[]) =>
    `Sendt samme dag som ${liste([...new Set(brev.map(brevref))])}. Løsningen kjenner ikke rekkefølgen og har ikke avgjort hvilket brev som kom først, eller hvem som er bundet.`,
});
