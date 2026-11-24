/**
 * Hva en verdi reglene leser, er. En oppsummering har ingen klasse: et utfall,
 * en status eller en etikett som står for flere utsagn, leses ikke av noen regel
 * («Kontrakten først, aldri status» i CLAUDE.md, MM-U11, MM-U50).
 */
export type Klasse =
  /** Det en part har sagt i et dokument: krav, svar, varsel, aksept, trekk, opplysning (2.2). */
  | 'utsagn'
  /** Identiteten og relasjonene mellom utsagnene: `id`, `gjelder`, `erstatter`, spor og avsender. */
  | 'relasjon'
  /** Beslutningsgrunnlaget slik brevet ble sendt (MM-U9, MM-U11 (opphevet av MM-U50)). */
  | 'frosset'
  /** Utledet av utsagnene og relasjonene, med vedtaket ved siden av (`utledning/utled.ts`, 2.6). */
  | 'predikat'
  /** Regelsettet: inndata og utdata når ett svar regnes ut av byggherrens vurderinger (B-13). */
  | 'regelsett'
  /**
   * Byggherrens frosne svar etter B-13, i serverens utregning: «godkjent eller
   * avslått, beløp eller dager» (MM-U11 (opphevet av MM-U50)). Leses bare av `godkjennerHeleKravet`,
   * når brevet fryses, og ikke av `utfall()` eller annet som kalles ved lesing.
   */
  | 'frosset svar'
  /** Kommandoen klienten sender, før den er godtatt. */
  | 'kommando'
  /** Det serveren stempler og kjernens versjoner. Klienten bestemmer ingen av dem. */
  | 'kontekst'
  /** Journalraden i lagret form. Bare leseren og skrivingen leser den. */
  | 'rad'
  /** JSON-skjemaet kommandoene kontrolleres mot. */
  | 'skjema'
  /**
   * Det brevteksten lages av og består av (LV-U2, LV-U3): utsagnene og relasjonene i
   * brevet og journalen før det, med navnene i kontrakten. Bare tekstgeneratoren og
   * skrivingen leser det, og ingen regel leser teksten.
   */
  | 'brevtekst';

/** Én rad i `LESBART`: `[eier, klasse, felt, steder]` (arkitekturtesten). */
export type Lesbar = [eier: string, klasse: Klasse, felt: string, steder?: string[]];
