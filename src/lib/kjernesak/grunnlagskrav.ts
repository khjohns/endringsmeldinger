/**
 * Kommandoene skjemaet for ny sak sender på TS-stien (#666, B-17): opprettelsen
 * og grunnlagskravet. Skjemaet har katalogens koder, og kjernen sine; de
 * oversettes her med tabellene i `koder.ts`. Datoen TE oppgir, er feltet kjernen
 * velger for kategorien (VS-U26), og endringsordren har sin dato eller sitt nummer
 * i stedet (GR-U16).
 */

import { oppgittDato, type OppgittDato } from '$kjerne/format/format';
import {
  fraKatalogen,
  HOVEDKATEGORI_FRA_KATALOGEN,
  UNDERKATEGORI_FRA_KATALOGEN,
} from '$kjerne/format/koder';

export interface Grunnlagsvalg {
  /** Katalogens kode, som `ENDRING`. */
  hovedkategori: string;
  /** Katalogens kode, som `IRREG`. */
  underkategori: string;
  /** Datoene TE har oppgitt, under feltet de ble oppgitt for. */
  datoer: Partial<Record<OppgittDato, string>>;
  /** Endringsordrens dato eller nummer, bare i underkategorien endringsordre. */
  endringsordre: string;
  /** TEs beskrivelse som ren tekst. Den er utdypningen under kravet (GR-U15). */
  utdypning: string;
}

const hoved = (kode: string) => fraKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, kode);
const under = (kode: string) => fraKatalogen(UNDERKATEGORI_FRA_KATALOGEN, kode);

/** Feltet for datoen TE oppgir i kategorien fra katalogen, eller `null` (VS-U26). */
export const datofelt = (hovedkategori: string, underkategori: string): OppgittDato | null =>
  oppgittDato(hoved(hovedkategori), under(underkategori));

/** Kategorien har endringsordrens dato eller nummer (GR-U16). */
export const gjelderEndringsordre = (underkategori: string) =>
  under(underkategori) === 'endringsordre';

/**
 * Katalogens underkategori har en kode i kjernen. Force majeure har ingen, og
 * kravet kan ikke uttrykkes i formatet ennå (#367), så det tilbys ikke (OV-U1).
 */
export const kanSendesTilKjernen = (underkategori: string) =>
  Object.hasOwn(UNDERKATEGORI_FRA_KATALOGEN, underkategori);

export const opprettelse = (sakstittel: string) => ({
  type: 'opprett_sak' as const,
  sakstittel: sakstittel.trim(),
});

/**
 * Grunnlagskravet. Tittelen er sakstittelen i opprettelsen, og kravet har ingen
 * egen tittel på forholdet (oppdragsgiver 16.10, avgjørelse 2 i #666). En dato som er oppgitt
 * for et annet felt enn kategorien har, følger ikke med.
 */
export function grunnlagskrav(valg: Grunnlagsvalg): Record<string, unknown> {
  const felt = datofelt(valg.hovedkategori, valg.underkategori);
  const dato = felt ? valg.datoer[felt] : undefined;
  const endringsordre = valg.endringsordre.trim();
  const utdypning = valg.utdypning.trim();
  return {
    type: 'krav',
    spor: 'grunnlag',
    innhold: {
      hovedkategori: hoved(valg.hovedkategori),
      underkategori: under(valg.underkategori),
      ...(felt && dato ? { [felt]: dato } : {}),
      ...(gjelderEndringsordre(valg.underkategori) && endringsordre ? { endringsordre } : {}),
    },
    ...(utdypning ? { utdypning } : {}),
  };
}
