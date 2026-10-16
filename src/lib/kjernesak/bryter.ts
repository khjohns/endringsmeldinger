/**
 * Bryteren som velger TS-stien for nye KOE-saker (B-17, #655). Den er av til
 * skrivestien er aktivert, og settes med `VITE_KOE_TS_STIEN=true` ved bygget.
 * Backend har sin egen bryter, som stenger Python-skrivingen (#668).
 */
export const tsStienForNyeKoeSaker = (
  verdi: unknown = import.meta.env.VITE_KOE_TS_STIEN
): boolean => verdi === 'true';

export type Sakskilde = 'python' | 'ts' | 'venter';

/**
 * Hvem saksruta leser saken fra. Med bryteren av kalles bare Python. Med bryteren
 * på spørres TS-serveren først, og Python brukes bare når saken ikke er en TS-sak
 * (`finnes` i sakskonteksten), så Python kalles ikke for en TS-sak (#665).
 */
export function sakskilde(bryterPaa: boolean, finnesITs: boolean | null): Sakskilde {
  if (!bryterPaa || finnesITs === false) return 'python';
  return finnesITs ? 'ts' : 'venter';
}
