/**
 * Kontraktsforhold og Kontraktshjemmel (NS 8407)
 * Based on NS 8407 Norwegian Standard Building Contract
 *
 * Enhanced with complete legal references and claim type information
 * from Komplett_Python_Datasett_NS 8407.py
 *
 * VIKTIG: To parallelle varslingsplikter for prosjekteringsfeil (§25):
 *
 * §25.1.2: Forhold som FORSTYRRER GJENNOMFØRINGEN
 *   - Aktsomhet: "burde" (normal faglig aktsomhet)
 *   - TE må aktivt undersøke og varsle
 *
 * §25.2: Prosjektering UEGNET til å oppfylle §14-krav (funksjonskrav)
 *   - Aktsomhet: "måtte" (kun åpenbare feil)
 *   - TE vurderer "i rimelig utstrekning"
 *
 * Begge kan gjelde for samme prosjekteringsfeil, men med ulik terskel.
 */

export interface DropdownOption {
  value: string;
  label: string;
}

// Vederlagsmetode type for standard methods
export type StandardVederlagsmetode =
  | 'Enhetspriser (34.3)'
  | 'Regningsarbeid (34.4)'
  | 'Ingen (Kun fristforlengelse)'
  | 'Avtalt/Tilbud (34.2.1)';

// Type krav - what can be claimed
export type TypeKrav = 'Tid' | 'Penger' | 'Tid og Penger';

// Kontraktshjemmel — den juridiske underkategorien (f.eks. §32.1 Irregulær endring)
export interface Kontraktshjemmel {
  kode: string;
  label: string;
  hjemmel_basis: string; // The triggering paragraph
  beskrivelse: string;
  varselkrav_ref: string; // Legal reference for notification requirement
  gruppe?: string; // Optional grouping for UI display
}

// Kontraktsforhold — hovedkategorien for kravet (f.eks. Endring, Svikt, Force Majeure)
export interface Kontraktsforhold {
  kode: string;
  label: string;
  beskrivelse: string;
  hjemmel_frist: string; // Reference in section 33
  hjemmel_vederlag: string | null; // Reference in section 34 (null for FM)
  standard_vederlagsmetode: StandardVederlagsmetode;
  type_krav: TypeKrav;
  hjemler: Kontraktshjemmel[];
}

// Complete NS 8407 claim structure with legal references
export const KRAV_STRUKTUR_NS8407: Kontraktsforhold[] = [
  {
    kode: 'ENDRING',
    label: 'Endringer',
    beskrivelse:
      'Avvik fra det opprinnelig avtalte, enten ved formell ordre, endrede rammebetingelser eller pålegg.',
    hjemmel_frist: '33.1 a)',
    hjemmel_vederlag: '34.1.1',
    standard_vederlagsmetode: 'Enhetspriser (34.3)',
    type_krav: 'Tid og Penger',
    hjemler: [
      {
        kode: 'EO',
        label: 'Formell endringsordre',
        hjemmel_basis: '31.3',
        beskrivelse: 'Skriftlig endringsordre utstedt av byggherren iht. §31.3.',
        varselkrav_ref: '33.4 / 34.1.1',
        gruppe: 'Endringsordrer',
      },
      {
        kode: 'IRREG',
        label: 'Irregulær endring (Pålegg)',
        hjemmel_basis: '32.1',
        beskrivelse:
          'Pålegg/anvisning som entreprenøren mener er endring, men som ikke er gitt som endringsordre.',
        varselkrav_ref: '32.2 / 33.4 / 34.1.1',
        gruppe: 'Endringsordrer',
      },
      {
        kode: 'VALGRETT',
        label: 'Begrensning av valgrett',
        hjemmel_basis: '14.6',
        beskrivelse:
          'Pålegg (jf. §32.1) som begrenser entreprenørens rett til å velge materiale, utførelse eller løsning.',
        varselkrav_ref: '32.2 / 33.4 / 34.1.1',
        gruppe: 'Endringsordrer',
      },
      {
        kode: 'SVAR_VARSEL',
        label: 'Endring via svar på varsel',
        hjemmel_basis: '24.2.2',
        // NB: §24.2.2 forutsetter avtalt risikoovergang etter §24.2.1
        beskrivelse:
          'Ved avtalt risikoovergang (§24.2.1): Byggherrens svar på varsel innebærer en endring uten at endringsordre er utstedt.',
        varselkrav_ref: '32.2 / 33.4 / 34.1.1',
        gruppe: 'Endringsordrer',
      },
      {
        kode: 'LOV_GJENSTAND',
        label: 'Endring i lover/vedtak (Gjenstand)',
        hjemmel_basis: '14.4',
        beskrivelse: 'Nye offentlige krav som krever fysisk endring av kontraktsgjenstanden.',
        varselkrav_ref: '32.2 / 33.4 / 34.1.1',
        gruppe: 'Lov og forskrift',
      },
      {
        kode: 'LOV_PROSESS',
        label: 'Endring i lover/vedtak (Prosess)',
        hjemmel_basis: '15.2',
        beskrivelse: 'Nye offentlige krav som endrer måten arbeidet må utføres på.',
        varselkrav_ref: '32.2 / 33.4 / 34.1.1',
        gruppe: 'Lov og forskrift',
      },
      {
        kode: 'GEBYR',
        label: 'Endring i gebyrer/avgifter',
        hjemmel_basis: '26.3',
        beskrivelse: 'Endringer i offentlige gebyrer/avgifter etter tilbudstidspunktet.',
        varselkrav_ref: '32.2 / 33.4 / 34.1.1',
        gruppe: 'Lov og forskrift',
      },
      {
        kode: 'SAMORD',
        label: 'Samordning/Omlegging',
        hjemmel_basis: '21.4',
        beskrivelse: 'Pålagt omlegging som følge av samordning utover det påregnelige.',
        varselkrav_ref: '32.2 / 33.4 / 34.1.1',
        gruppe: 'Koordinering',
      },
    ],
  },
  {
    kode: 'SVIKT',
    label: 'Forsinkelse eller svikt ved byggherrens ytelser',
    beskrivelse: 'Forhold definert som byggherrens ytelser eller risiko i kapittel V.',
    hjemmel_frist: '33.1 b)',
    hjemmel_vederlag: '34.1.2',
    standard_vederlagsmetode: 'Regningsarbeid (34.4)',
    type_krav: 'Tid og Penger',
    hjemler: [
      {
        kode: 'MEDVIRK',
        label: 'Manglende medvirkning/leveranser',
        hjemmel_basis: '22',
        beskrivelse:
          'Svikt i byggherrens medvirkningsplikter: lover/forskrifter (§22.1), råderett over eiendom (§22.2), fysisk arbeidsgrunnlag (§22.3) eller materialer (§22.4).',
        varselkrav_ref: '25.1.2 / 33.4 / 34.1.2',
        gruppe: 'Medvirkning',
      },
      {
        kode: 'GRUNN',
        label: 'Uforutsette grunnforhold',
        hjemmel_basis: '23.1',
        beskrivelse:
          'Forhold ved grunnen som avviker fra det entreprenøren hadde grunn til å regne med.',
        varselkrav_ref: '25.1.2 / 33.4 / 34.1.2',
        gruppe: 'Grunnforhold',
      },
      {
        kode: 'KULTURMINNER',
        label: 'Funn av kulturminner',
        hjemmel_basis: '23.3',
        beskrivelse: 'Stans i arbeidet som følge av funn av ukjente kulturminner.',
        varselkrav_ref: '23.3 annet ledd / 33.4 / 34.1.2',
        gruppe: 'Grunnforhold',
      },
      {
        kode: 'PROSJ_RISIKO',
        label: 'Svikt i byggherrens prosjektering',
        hjemmel_basis: '24.1',
        beskrivelse:
          'Feil, mangler eller uklarheter i prosjektering/løsninger byggherren har risikoen for.',
        // §25.1.2: Forhold som forstyrrer gjennomføringen ("burde" oppdaget)
        // §25.2: Prosjektering uegnet til å oppfylle §14-krav ("måtte" oppdaget - kun åpenbare feil)
        varselkrav_ref: '25.1.2 / 25.2 / 33.4 / 34.1.2',
        gruppe: 'Prosjektering',
      },
    ],
  },
  {
    kode: 'ANDRE',
    label: 'Andre forhold byggherren har risikoen for',
    beskrivelse: 'Sekkepost for risikoforhold som ikke er endringer eller "ytelser".',
    hjemmel_frist: '33.1 c)',
    hjemmel_vederlag: '34.1.2',
    standard_vederlagsmetode: 'Regningsarbeid (34.4)',
    type_krav: 'Tid og Penger',
    // For denne kategorien har vi ikke inkludert §25.1.2 som varselkrav, fordi:
    // 1. Underkategoriene gjelder forhold der BH selv har handlet aktivt (nektelse, brukstakelse, stans)
    // 2. BH vet allerede om forholdet - §25.1.2 har begrenset praktisk verdi
    // 3. Den generelle varslingsfristen i §5 gjelder uansett
    hjemler: [
      {
        kode: 'NEKT_MH',
        label: 'Nektelse av kontraktsmedhjelper',
        hjemmel_basis: '10.2',
        beskrivelse: 'Byggherren nekter å godta valgt medhjelper uten saklig grunn.',
        varselkrav_ref: '5',
        gruppe: 'Kontraktsmedhjelpere',
      },
      {
        kode: 'SKADE_BH',
        label: 'Skade forårsaket av byggherren/sideentreprenør',
        hjemmel_basis: '19.1',
        beskrivelse:
          'Skade på kontraktsgjenstanden forårsaket av byggherren eller hans kontraktsmedhjelpere.',
        varselkrav_ref: '5',
        gruppe: 'Kontraktsbrudd',
      },
      {
        kode: 'BRUKSTAKELSE',
        label: 'Urettmessig brukstakelse',
        hjemmel_basis: '38.1 annet ledd',
        beskrivelse: 'Byggherren tar kontraktsgjenstanden i bruk før overtakelse/avtalt tid.',
        varselkrav_ref: '5',
        gruppe: 'Kontraktsbrudd',
      },
      {
        kode: 'STANS_BET',
        label: 'Stans ved betalingsmislighold',
        hjemmel_basis: '29.2',
        beskrivelse:
          'Rettmessig stans pga vesentlig betalingsmislighold. Krever 24 timers skriftlig varsel.',
        varselkrav_ref: '29.2',
        gruppe: 'Stans',
      },
      {
        kode: 'ANDRE_ANDRE',
        label: 'Annet forhold',
        hjemmel_basis: '33.1 c)',
        beskrivelse:
          'Andre forhold byggherren har risikoen for som ikke dekkes av kategoriene over.',
        varselkrav_ref: '33.4 / 34.1.2',
        gruppe: 'Annet',
      },
    ],
  },
  {
    kode: 'FORCE_MAJEURE',
    label: 'Force Majeure',
    beskrivelse:
      'Ekstraordinære hendelser utenfor partenes kontroll (værforhold, offentlige påbud, streik, lockout etc.). Gjelder både parten selv og kontraktsmedhjelpere.',
    hjemmel_frist: '33.3',
    hjemmel_vederlag: null,
    standard_vederlagsmetode: 'Ingen (Kun fristforlengelse)',
    type_krav: 'Tid',
    hjemler: [],
  },
];

// ========== LEGACY DROPDOWN OPTIONS (for backwards compatibility) ==========

export const HOVEDKATEGORI_OPTIONS: DropdownOption[] = [
  { value: '', label: '— Velg —' },
  ...KRAV_STRUKTUR_NS8407.map((k) => ({
    value: k.kode,
    label: k.label,
  })),
];

// Generate HJEMMEL_MAP (kontraktshjemler per kontraktsforhold) from structure
export const HJEMMEL_MAP: Record<string, DropdownOption[]> = KRAV_STRUKTUR_NS8407.reduce(
  (acc, forhold) => {
    acc[forhold.kode] = forhold.hjemler.map((h) => ({
      value: h.kode,
      label: `${h.label} (§${h.hjemmel_basis})`,
    }));
    return acc;
  },
  {} as Record<string, DropdownOption[]>
);

// Legacy alias
export const UNDERKATEGORI_MAP = HJEMMEL_MAP;

// ========== HELPER FUNCTIONS ==========

// Get hjemler (kontraktshjemler) for a given kontraktsforhold
export function getHjemler(kontraktsforholdKode: string): DropdownOption[] {
  return HJEMMEL_MAP[kontraktsforholdKode] || [];
}

// Legacy alias
export const getUnderkategorier = getHjemler;

// Get kontraktsforhold label from code (case-insensitive)
export function getKontraktsforholdLabel(code: string | string[] | undefined | null): string {
  if (!code) return '';
  const codeStr = Array.isArray(code) ? code[0] : code;
  if (!codeStr) return '';
  const upperCode = codeStr.toUpperCase();
  const forhold = KRAV_STRUKTUR_NS8407.find((k) => k.kode.toUpperCase() === upperCode);
  return forhold?.label || codeStr;
}

// Legacy alias
export const getHovedkategoriLabel = getKontraktsforholdLabel;

// Get kontraktshjemmel label from code (case-insensitive)
export function getHjemmelLabel(code: string | string[] | undefined | null): string {
  if (!code) return '';
  const codeStr = Array.isArray(code) ? code[0] : code;
  if (!codeStr) return '';
  const upperCode = codeStr.toUpperCase();
  for (const forhold of KRAV_STRUKTUR_NS8407) {
    const hjemmel = forhold.hjemler.find((h) => h.kode.toUpperCase() === upperCode);
    if (hjemmel) return hjemmel.label;
  }
  return codeStr;
}

// Legacy alias
export const getUnderkategoriLabel = getHjemmelLabel;

// Get combined "Kontraktsforhold — Hjemmel" label (e.g. "Forsinkelse eller svikt ved byggherrens ytelser — Grunnforhold")
export function getKombinertKategoriLabel(
  hovedkategori: string | string[] | undefined | null,
  underkategori?: string | string[] | undefined | null
): string {
  const hk = getKontraktsforholdLabel(hovedkategori);
  if (!underkategori) return hk;
  const uk = getHjemmelLabel(underkategori);
  return uk && uk !== (Array.isArray(underkategori) ? underkategori[0] : underkategori)
    ? `${hk} — ${uk}`
    : hk;
}

// Get full kontraktsforhold object by code (case-insensitive)
export function getKontraktsforhold(
  code: string | string[] | undefined | null
): Kontraktsforhold | undefined {
  if (!code) return undefined;
  const codeStr = Array.isArray(code) ? code[0] : code;
  if (!codeStr) return undefined;
  const upperCode = codeStr.toUpperCase();
  return KRAV_STRUKTUR_NS8407.find((k) => k.kode.toUpperCase() === upperCode);
}

// Legacy alias
export const getHovedkategori = getKontraktsforhold;

// Get full kontraktshjemmel object by code (case-insensitive)
export function getHjemmelObj(
  code: string | string[] | undefined | null
): Kontraktshjemmel | undefined {
  if (!code) return undefined;
  const codeStr = Array.isArray(code) ? code[0] : code;
  if (!codeStr) return undefined;
  const upperCode = codeStr.toUpperCase();
  for (const forhold of KRAV_STRUKTUR_NS8407) {
    const hjemmel = forhold.hjemler.find((h) => h.kode.toUpperCase() === upperCode);
    if (hjemmel) return hjemmel;
  }
  return undefined;
}

// Legacy alias
export const getUnderkategoriObj = getHjemmelObj;

// Group hjemler by their gruppe field for UI display
// Returns a Map preserving insertion order (groups appear in the order they first occur)
export function getGrupperteHjemler(
  hjemler: Kontraktshjemmel[]
): Map<string | null, Kontraktshjemmel[]> {
  const grupper = new Map<string | null, Kontraktshjemmel[]>();

  for (const h of hjemler) {
    const gruppeNavn = h.gruppe ?? null;
    if (!grupper.has(gruppeNavn)) {
      grupper.set(gruppeNavn, []);
    }
    grupper.get(gruppeNavn)!.push(h);
  }

  return grupper;
}

// Legacy alias
export const getGrupperteUnderkategorier = getGrupperteHjemler;

// Check if hjemmel is a law change (requires special handling)
export function erLovendring(hjemmelKode: string): boolean {
  return ['LOV_GJENSTAND', 'LOV_PROSESS', 'GEBYR'].includes(hjemmelKode);
}

// Get the correct paragraph reference for law change hjemler
export function getLovendringParagraf(hjemmelKode: string): string | null {
  switch (hjemmelKode) {
    case 'LOV_GJENSTAND':
      return '14.4';
    case 'LOV_PROSESS':
      return '15.2';
    case 'GEBYR':
      return '26.3';
    default:
      return null;
  }
}

// Check if hovedkategori is Force Majeure (no compensation, only time)
export function erForceMajeure(hovedkategoriKode: string): boolean {
  return hovedkategoriKode === 'FORCE_MAJEURE';
}

// Check if this is an irregular change (special passivity rules apply)
export function erIrregulaerEndring(kontraktsforholdKode: string, hjemmelKode: string): boolean {
  return kontraktsforholdKode === 'ENDRING' && hjemmelKode === 'IRREG';
}

// Get type krav for a kontraktsforhold
export function getTypeKrav(kontraktsforholdKode: string): TypeKrav | undefined {
  const forhold = getKontraktsforhold(kontraktsforholdKode);
  return forhold?.type_krav;
}

// Get hjemmel references for a claim
export function getHjemmelReferanser(
  kontraktsforholdKode: string,
  hjemmelKode?: string
): { frist: string; vederlag: string | null; varsel: string } {
  const forhold = getKontraktsforhold(kontraktsforholdKode);
  const hjemmel = hjemmelKode ? getHjemmelObj(hjemmelKode) : undefined;

  return {
    frist: forhold?.hjemmel_frist || '',
    vederlag: forhold?.hjemmel_vederlag || null,
    varsel: hjemmel?.varselkrav_ref || '',
  };
}
