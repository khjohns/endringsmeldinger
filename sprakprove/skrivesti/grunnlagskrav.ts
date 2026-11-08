/**
 * Grunnlagskravet i kjernens format, av katalogens koder, til prøvene av skrivestien. Datoen
 * TE oppgir, er feltet kjernen velger for kategorien (VS-U26), og endringsordren har sin dato
 * eller sitt nummer i stedet (GR-U16).
 */

import { oppgittDato, type OppgittDato } from '../../kjerne/format/format.ts';
import { kategoriFraKatalogen } from '../../kjerne/format/koder.ts';

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

export function grunnlagskrav(valg: Grunnlagsvalg) {
  const kjernen = kategoriFraKatalogen(valg);
  const felt = oppgittDato(kjernen.hovedkategori, kjernen.underkategori);
  const dato = felt ? valg.datoer[felt] : undefined;
  const endringsordre = valg.endringsordre.trim();
  const utdypning = valg.utdypning.trim();
  return {
    type: 'krav' as const,
    spor: 'forhold' as const,
    innhold: {
      hovedkategori: kjernen.hovedkategori,
      underkategori: kjernen.underkategori,
      ...(felt && dato ? { [felt]: dato } : {}),
      ...(kjernen.underkategori === 'endringsordre' && endringsordre ? { endringsordre } : {}),
    },
    ...(utdypning ? { utdypning } : {}),
  };
}
