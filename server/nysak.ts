/**
 * Kroppen som oppretter en sak med den første påberopelsen (KT-U11, #1487), prøvd før
 * kjernen ser den. Modulen er ren og importerer ingenting, så demoruta prøver kroppen
 * med samme funksjon som serveren (#1526 punkt 3, `src/lib/kjernesak/demosak.ts`).
 */

const NY_SAK = new Set([
  'kommando_id',
  'ny_sak_id',
  'tittel',
  'paaberopelse',
  'brevtekst',
  'varsel',
]);

/** Kjernen prøver verdiene, også at korrespondansetypen er oppgitt (LV-U42, D1 A i #1497). */
const VARSEL_I_NY_SAK = new Set(['sendt', 'korrespondansetype', 'dokumentasjon']);

/** En UUID med små bokstaver, som basen krever (51422). Samme mønster som `UUID` i `datalag.ts`. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const tekstliste = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

const erObjekt = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Vedleggene påberopelsen viser til, uten dubletter og med små bokstaver. */
export const vedleggIder = (paaberopelse: Record<string, unknown>): string[] =>
  tekstliste(paaberopelse.dokumentasjon)
    ? [...new Set(paaberopelse.dokumentasjon.map((v) => v.toLowerCase()))]
    : [];

/** Meldingen for det første som gjør kroppen ugyldig, eller `null` når kjernen kan prøve den. */
export function feilINySak(kropp: Record<string, unknown>): string | null {
  const ukjente = Object.keys(kropp).filter((k) => !NY_SAK.has(k));
  if (ukjente.length) return `Ukjente felt: ${ukjente.join(', ')}.`;
  if (typeof kropp.kommando_id !== 'string' || !UUID.test(kropp.kommando_id))
    return 'kommando_id mangler eller er ikke en UUID med små bokstaver.';
  const { ny_sak_id: sakId, tittel, paaberopelse, varsel } = kropp;
  if (typeof sakId !== 'string' || !UUID.test(sakId))
    return 'ny_sak_id mangler eller er ikke en UUID med små bokstaver.';
  if (typeof tittel !== 'string' || !tittel.trim()) return 'tittel mangler eller er ikke en tekst.';
  // Kjernen trimmer sakstittelen, men ikke tittelen i påberopelsen; én verdi krever begge like (LV-U43).
  if (tittel !== tittel.trim())
    return 'tittel begynner eller slutter med mellomrom eller et annet blankt tegn.';
  if (!erObjekt(paaberopelse) || paaberopelse.type !== 'krav' || paaberopelse.spor !== 'forhold')
    return 'paaberopelse må være et krav i sporet forhold.';
  if (!erObjekt(paaberopelse.innhold) || 'tittel' in paaberopelse.innhold)
    return 'paaberopelse.innhold må være et objekt uten tittel; tittelen står i tittel.';
  if ('brevtekst' in paaberopelse) return 'paaberopelse har ikke brevtekst; den står i brevtekst.';
  if (varsel !== undefined) {
    if (!erObjekt(varsel))
      return 'varsel må være et objekt med sendt, korrespondansetype og dokumentasjon.';
    const ukjenteIVarsel = Object.keys(varsel).filter((k) => !VARSEL_I_NY_SAK.has(k));
    if (ukjenteIVarsel.length) return `Ukjente felt i varsel: ${ukjenteIVarsel.join(', ')}.`;
    if (!tekstliste(varsel.dokumentasjon) || !varsel.dokumentasjon.length)
      return 'varsel.dokumentasjon mangler eller er ikke en liste med vedlegg.';
    const ider = vedleggIder(paaberopelse);
    const utenfor = varsel.dokumentasjon.filter((v) => !ider.includes(v.toLowerCase()));
    if (utenfor.length)
      return `Dokumentet med varselet legges ved påberopelsen (VS-U38), men ${utenfor.join(', ')} står ikke i paaberopelse.dokumentasjon.`;
  }
  return null;
}
