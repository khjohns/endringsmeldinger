/**
 * Det korrespondansen er etter kontrakten (OV-U80), som bestemmer ordene i komponenten.
 * `korrespondanse` er ordene før parten har svart.
 */
export type Korrespondansehva = 'korrespondanse' | 'varsel' | 'krav' | 'svar' | 'aksept';

/** Kategorien i «Hva er det etter kontrakten?» (OV-U80). */
export type Korrespondansekategori = 'dokumentasjon' | 'varsel' | 'krav' | 'svar' | 'aksept';
