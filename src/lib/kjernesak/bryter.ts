/**
 * Bryteren som velger TS-stien for nye KOE-saker (B-17, #655). Den er av til
 * skrivestien er aktivert, og settes med `VITE_KOE_TS_STIEN=true` ved bygget.
 * Backend har sin egen bryter, som stenger Python-skrivingen (#668).
 */
export const tsStienForNyeKoeSaker = (
  verdi: unknown = import.meta.env.VITE_KOE_TS_STIEN
): boolean => verdi === 'true';
