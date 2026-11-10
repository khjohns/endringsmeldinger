/**
 * Kontrollene av byggherrens vurderinger i svaret før utregningen (B-13): det svaret kan
 * inneholde etter kategorien og standpunktene. Funksjonene tar kategoriene som tekst og ikke
 * kravet, så `regler/` ikke når `frosset/`. Hver kontroll kaster `UgyldigVurdering`.
 */

import { METODER } from '../format/format.ts';
import { UgyldigVurdering } from './feil.ts';
import type { Oppgjoersform } from '../typer.ts';
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
    feil.resultat = `«${String(v.resultat)}» kan ikke velges i denne kategorien (§ 32.3 c)`;
  const iTide = v.grunnlag_varslet_i_tide;
  if (regler.gjelderVarslingsplikten(hovedkategori, underkategori)) {
    if (typeof iTide !== 'boolean') feil.grunnlag_varslet_i_tide = 'mangler (§ 32.2)';
    // #235: frafall skjer mot endringsordre og kan ikke kombineres med preklusjon.
    else if (v.resultat === 'paalegg_frafalt' && !iTide)
      feil.grunnlag_varslet_i_tide =
        'frafall kan ikke kombineres med at grunnlaget er varslet for sent';
  } else if (iTide !== undefined) {
    feil.grunnlag_varslet_i_tide = 'gjelder bare § 32.2';
  }
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

/** § 34.1.2: innsigelsen mot varselet gjelder bare kategoriene der varslingsplikten gjelder. */
export function kontrollerVarseletForVederlag(
  v: { hovedkrav_varslet_i_tide?: unknown },
  hovedkategori: string | null,
  regler: Regelsett
): void {
  if (
    v.hovedkrav_varslet_i_tide != null &&
    !regler.gjelderVarslingspliktenForVederlag(hovedkategori)
  )
    throw new UgyldigVurdering({
      hovedkrav_varslet_i_tide: 'gjelder bare svikt og andre forhold (§ 34.1.2)',
    });
}

/**
 * Standpunktet til oppgjørsformen for kravposten `navn` (KA-U57 (d), KA-U54), kravet om tilbud
 * (KA-U69, KA-U71), varselet etter § 34.3.3 eller § 34.4 (KA-U64) og justeringen (KA-U68),
 * mot TEs oppgjørsform for posten. Feilene står på `<navn>.<felt>`.
 */
export function kontrollerOppgjoersformen(
  navn: string,
  p: {
    aksepterer?: unknown;
    oensket_oppgjoersform?: unknown;
    krever_tilbud?: unknown;
    varslet_i_tide?: unknown;
    godtar_justering?: unknown;
  },
  post: { oppgjoersform: Oppgjoersform; justert?: boolean }
): void {
  const feil: Record<string, string> = {};
  const felt = `${navn}.oensket_oppgjoersform`;
  const regel = post.oppgjoersform !== 'tilbud';
  const kreverTilbud = p.krever_tilbud === true;
  const hva = regel ? 'beregningsregelen ikke godtas' : 'tilbudet ikke aksepteres (§ 34.2.2)';
  // Arbeidsvalget i #479: uten aksept oppgir byggherren oppgjørsformen, ellers ikke. Svar 3 A
  // 10.11 for #1663: med kravet om tilbud er den valgfri.
  if (p.oensket_oppgjoersform != null && !METODER.includes(p.oensket_oppgjoersform as never))
    feil[felt] = `${String(p.oensket_oppgjoersform)} er ikke en oppgjørsform byggherren kan mene`;
  else if (p.aksepterer === false && p.oensket_oppgjoersform == null && !kreverTilbud)
    feil[felt] = `mangler når ${hva}`;
  else if (p.aksepterer !== false && p.oensket_oppgjoersform != null)
    feil[felt] = `gjelder bare når ${hva}`;
  // OV-U95 punkt 1 og 5: byggherren mener ikke den beregningsregelen TE krever.
  else if (regel && p.oensket_oppgjoersform === post.oppgjoersform)
    feil[felt] = 'er oppgjørsformen TE krever';
  if (p.krever_tilbud != null && typeof p.krever_tilbud !== 'boolean')
    feil[`${navn}.krever_tilbud`] = 'er verken true eller false';
  else if (kreverTilbud && !regel)
    feil[`${navn}.krever_tilbud`] =
      'gjelder bare en kravpost etter en beregningsregel (§ 34.2.1, KA-U69)';
  // KA-U71: kravet om tilbud og en godtatt beregningsregel utelukker hverandre.
  else if (kreverTilbud && p.aksepterer !== false)
    feil[`${navn}.krever_tilbud`] =
      'kan ikke stå når byggherren godtar beregningsregelen for kravposten (KA-U71)';
  const justert = post.oppgjoersform === 'enhetspriser' && post.justert === true;
  // KA-U64: varselet etter § 34.3.3 gjelder justerte enhetspriser, og § 34.4 regningsarbeid.
  const trengerVarsel = post.oppgjoersform === 'regningsarbeid' || justert;
  if (p.varslet_i_tide != null && typeof p.varslet_i_tide !== 'boolean')
    feil[`${navn}.varslet_i_tide`] = 'er verken true eller false';
  else if (p.varslet_i_tide != null && !trengerVarsel)
    feil[`${navn}.varslet_i_tide`] =
      'gjelder bare varselet etter punkt 34.3.3 for justerte enhetspriser og punkt 34.4 for regningsarbeid';
  // KA-U68: justeringen gjelder justerte enhetspriser, og byggherren tar stilling til den når
  // beregningsregelen godtas. Uten aksept står den subsidiært og er valgfri (VS-U56).
  if (p.godtar_justering != null && typeof p.godtar_justering !== 'boolean')
    feil[`${navn}.godtar_justering`] = 'er verken true eller false';
  else if (p.godtar_justering != null && !justert)
    feil[`${navn}.godtar_justering`] = 'gjelder bare en kravpost med justerte enhetspriser';
  else if (justert && p.aksepterer === true && p.godtar_justering == null)
    feil[`${navn}.godtar_justering`] = 'mangler når byggherren godtar beregningsregelen (§ 34.3.2)';
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
        dager_maatte_forstaa: 'gjelder bare når kravet er spesifisert for sent (§ 33.6.1)',
      });
    return null;
  }
  const feil = (grunn: string) => new UgyldigVurdering({ dager_maatte_forstaa: grunn });
  if (d === undefined || d === null) throw feil('mangler (§ 33.6.1)');
  if (typeof d !== 'number' || !Number.isInteger(d) || d < 0)
    throw feil('er ikke et helt antall dager');
  // `beregnFrist` har kontrollert at de vurderte dagene er høyst de krevde.
  if (d > (v.dager as number))
    throw feil('er flere enn dagene byggherren godtar om kravet kom i tide');
  return d;
}
