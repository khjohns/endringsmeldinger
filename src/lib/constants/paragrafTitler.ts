/**
 * Paragrafoverskrifter fra NS 8407:2011
 *
 * Kun paragrafene som brukes i forhåndsvisningspanelet.
 * Titler er parafrasert — ikke ordrett fra standarden.
 */
export const PARAGRAF_TITLER: Record<string, string> = {
  // Endringer
  '31.3': 'Endringsordre',
  '32.1': 'Endring i form av pålegg',
  '32.2': 'Totalentreprenørens varslingsplikt',
  '32.3': 'Byggherrens svarplikt',

  // Krav til kontraktsgjenstanden
  '14.4': 'Lover, forskrifter og offentlige vedtak',
  '14.6': 'Valg av løsninger',
  '15.2': 'Forandringer i lover, forskrifter mv.',

  // Koordinering
  '21.4': 'Totalentreprenørens samordningsplikt',

  // Byggherrens ytelser
  '22': 'Byggherrens medvirkning',
  '23.1': 'Uforutsette forhold ved grunnen',
  '23.3': 'Kulturminner',
  '24.1': 'Byggherrens prosjekteringsrisiko',
  '24.2.2': 'Avtalt risikoovergang — svar på varsel',

  // Varsling og undersøkelse
  '25.1.2': 'Undersøkelse av forhold som forstyrrer gjennomføringen',

  // Vederlag
  '26.3': 'Offentlige gebyrer og avgifter',

  // Kontraktsmedhjelpere
  '10.2': 'Nektelse av kontraktsmedhjelper',

  // Skade og risiko
  '19.1': 'Risiko for skade',

  // Stans
  '29.2': 'Stansing ved betalingsmislighold',

  // Fristforlengelse
  '33.1 a)': 'Fristforlengelse — endringer',
  '33.1 b)': 'Fristforlengelse — svikt ved byggherrens ytelser',
  '33.1 c)': 'Fristforlengelse — andre forhold',
  '33.3': 'Fristforlengelse — force majeure',
  '33.4': 'Varsel om fristforlengelse',
  '33.6': 'Spesifisering av fristkrav',
  '33.6.1': 'Fremsatt krav om fristforlengelse',
  '33.7': 'Svarplikt ved fristkrav',
  '33.8': 'Forsering ved uberettiget avslag',

  // Vederlagsjustering
  '34.1': 'Retten til vederlagsjustering',
  '34.1.1': 'Vederlagsjustering — endringer',
  '34.1.2': 'Vederlagsjustering — svikt/andre forhold',
  '34.1.3': 'Særskilt varsel — rigg, drift, produktivitet',
  '34.2': 'Generelle regler for vederlagsjustering',
  '34.3': 'Vederlagsjustering — enhetspriser',
  '34.3.3': 'Justering av enhetspriser',
  '34.4': 'Vederlagsjustering — regningsarbeid',

  // Brukstakelse
  '38.1 annet ledd': 'Brukstakelse',
};

/**
 * Hent paragraftittel. Returnerer null hvis ukjent.
 */
export function getParagrafTittel(paragraf: string): string | null {
  return PARAGRAF_TITLER[paragraf] ?? null;
}
