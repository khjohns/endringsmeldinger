/**
 * Kontrollene av byggherrens vurderinger i svaret før utregningen (B-13): det svaret kan
 * inneholde etter kategorien og standpunktene. Funksjonene tar kategoriene som tekst og ikke
 * kravet, så `regler/` ikke når `frosset/`. Hver kontroll kaster `UgyldigVurdering`. Kontrollene
 * for vederlaget står i `vederlag.ts` (#1783).
 */

import { UgyldigVurdering } from './feil.ts';
import type { Regelsett } from './regelsett.ts';

/** § 32.3 c og § 32.2: svaret på forholdet i kategorien i kravet. */
export function kontrollerForholdet(
  v: { resultat?: unknown; grunnlag_varslet_i_tide?: unknown },
  hovedkategori: string | null,
  underkategori: string | null,
  regler: Regelsett
): void {
  const feil: Record<string, string> = {};
  const resultat = v.resultat as never;
  if (!regler.gyldigeForholdsresultater(hovedkategori, underkategori).includes(resultat))
    feil.resultat = `«${String(v.resultat)}» kan ikke velges i denne kategorien (punkt 32.3 første ledd c)`;
  const iTide = v.grunnlag_varslet_i_tide;
  if (regler.gjelderVarslingsplikten(hovedkategori, underkategori)) {
    if (typeof iTide !== 'boolean') feil.grunnlag_varslet_i_tide = 'mangler (punkt 32.2)';
    // #235: frafall skjer mot endringsordre og kan ikke kombineres med preklusjon.
    else if (v.resultat === 'paalegg_frafalt' && !iTide)
      feil.grunnlag_varslet_i_tide =
        'frafall kan ikke kombineres med at grunnlaget er varslet for sent';
  } else if (iTide !== undefined) {
    feil.grunnlag_varslet_i_tide = 'gjelder bare punkt 32.2';
  }
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

/**
 * VS-U4: når spesifiseringen kom for sent, oppgir byggherren dagene byggherren måtte forstå at
 * TE hadde krav på, høyst de vurderte og de krevde (arbeidsvalget i #479). Gir dagene, eller `null`.
 */
export function kontrollerSpesifiseringen(v: {
  spesifisert_krav_ok?: unknown;
  dager_maatte_forstaa?: unknown;
  dager?: unknown;
}): number | null {
  const d = v.dager_maatte_forstaa;
  if (v.spesifisert_krav_ok !== false) {
    if (d != null)
      throw new UgyldigVurdering({
        dager_maatte_forstaa: 'gjelder bare når kravet er spesifisert for sent (punkt 33.6.1)',
      });
    return null;
  }
  const feil = (grunn: string) => new UgyldigVurdering({ dager_maatte_forstaa: grunn });
  if (d === undefined || d === null) throw feil('mangler (punkt 33.6.1)');
  if (typeof d !== 'number' || !Number.isInteger(d) || d < 0)
    throw feil('er ikke et helt antall dager');
  // `beregnFrist` har kontrollert at de vurderte dagene er høyst de krevde.
  if (d > (v.dager as number))
    throw feil('er flere enn dagene byggherren godtar om kravet kom i tide');
  return d;
}
