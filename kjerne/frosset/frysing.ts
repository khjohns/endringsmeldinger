/**
 * Det et svar fryser når brevet sendes (MM-U9, MM-U11, GR-U12): standpunktene i
 * formen de lagres i, og beslutningsgrunnlaget av dem. Skrivingen og predikatet
 * for et svarutkast på grunnlaget (#351) bruker de samme funksjonene. Modulen
 * når ikke utledningen, så klienten kan bruke predikatet uten skrivestien.
 */

import { HJEMMEL } from '../format/format.ts';
import { standpunkterISvaret, Uforstaatt } from '../format/leser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { beslutningsgrunnlag, blirEndringsordre, type Svarvurdering } from './standpunkt.ts';
import type { Krav, Spor } from '../typer.ts';

type Data = Record<string, unknown>;

/**
 * Brevet frosset i et svar i formen det lagres i (MM-U9, MM-U11, GR-U12).
 * `grunnlagskrav` er kravet et grunnlagssvar gjelder, ellers gjeldende
 * grunnlagskrav. `forskyvning` er lagene svaret på grunnlaget opptar foran sporet
 * (`lagFraGrunnlaget`). Kaster `Uforstaatt` når standpunktene ikke kan leses.
 */
export function frys(
  svar: Data,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number
) {
  const spor = svar.spor as Spor;
  const innhold = {
    spor,
    standpunkter: standpunkterISvaret(spor, svar),
    utregning: (svar.utregning ?? {}) as Data,
  };
  return beslutningsgrunnlag(innhold, grunnlagskrav, regler, forskyvning);
}

/** Standpunktene i et svar på grunnlaget (§ 32.2 og § 32.3). */
export function grunnlagsstandpunkter(v: Svarvurdering, krav: Krav, nyId: () => string): Data[] {
  const ut: Data[] = [];
  if (typeof v.grunnlag_varslet_i_tide === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: krav.id,
      hjemmel: HJEMMEL.grunnlag,
      i_tide: v.grunnlag_varslet_i_tide,
    });
  ut.push({ id: nyId(), art: 'grunnlag', resultat: v.resultat });
  return ut;
}

/**
 * Om et svar på grunnlaget med disse vurderingene blir en endringsordre etter
 * § 32.3 første ledd a når brevet sendes i appen (GR-U12, #351). Standpunktene
 * og beslutningsgrunnlaget lages som når brevet skrives, og sammensetningen er
 * den utledningen leser. Kategorien har kjernens koder (#335). Vurderingene
 * kontrolleres ikke (`regnUtSvar`): skjemaet viser varselet mens svaret fylles
 * ut, også før § 32.2 er besvart. Et resultat kjernen ikke kjenner, gir ingen
 * endringsordre.
 */
export function svaretBlirEndringsordre(
  vurderinger: Svarvurdering,
  kategori: { hovedkategori?: string | null; underkategori?: string | null },
  regler: Regelsett
): boolean {
  const krav: Krav = {
    id: 'utkast',
    spor: 'grunnlag',
    dokument: 'utkast',
    erstatter: null,
    innhold: { ...kategori },
  };
  let n = 0;
  const svar = {
    spor: 'grunnlag',
    standpunkter: grunnlagsstandpunkter(vurderinger, krav, () => `standpunkt-${++n}`),
  };
  try {
    return blirEndringsordre(frys(svar, krav, regler, 0));
  } catch (feil) {
    if (feil instanceof Uforstaatt) return false;
    throw feil;
  }
}
