/**
 * Det et svar fryser når brevet sendes (MM-U9, MM-U11 (opphevet av MM-U50), GR-U12): standpunktene i
 * formen de lagres i, og beslutningsgrunnlaget av dem. Skrivingen og predikatet
 * for et svarutkast på forholdet (#351) bruker de samme funksjonene. Modulen
 * når ikke utledningen, så klienten kan bruke predikatet uten skrivestien.
 */

import { HJEMMEL } from '../format/format.ts';
import { standpunkterISvaret } from '../format/leser.ts';
import { Uforstaatt } from '../format/skjema.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { blirEndringsordre, godkjennerHeleKravet, virkninger } from './standpunkt.ts';
import { gjelderVarslingsplikten, type Svarinnhold, type Svarvurdering } from './byggeklosser.ts';
import { beslutningslinje } from './tekst.ts';
import type { Beslutningsgrunnlag, Krav, Spor } from '../typer.ts';

type Data = Record<string, unknown>;

/**
 * Brevet frosset når det sendes (MM-U9, MM-U11 (opphevet av MM-U50)). For forholdet fryses også om
 * § 32.2 gjaldt kategorien i kravversjonen (GR-U12). `forskyvning` er `lagFraForholdet`
 * for svaret på forholdet brevteksten setter foran sporet, og 0 for forholdet selv. `kravet` er
 * kravet svaret gjelder, som linjen navngir kravpostene i.
 */
export function beslutningsgrunnlag(
  svar: Svarinnhold,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number,
  kravet?: Krav | null
): Beslutningsgrunnlag {
  const v = virkninger(svar, paaberopelse, regler, forskyvning);
  return {
    regelversjon: regler.versjon,
    virkninger: v,
    linje: beslutningslinje(svar, v, paaberopelse, forskyvning, kravet),
    sammenfall: godkjennerHeleKravet(svar, v),
    ...(svar.spor === 'forhold'
      ? { varslingsplikt: gjelderVarslingsplikten(paaberopelse, regler) }
      : {}),
  };
}

/**
 * Brevet frosset i et svar i formen det lagres i (MM-U9, MM-U11 (opphevet av MM-U50), GR-U12).
 * `paaberopelse` er kravet et svar på påberopelsen gjelder, ellers gjeldende
 * påberopelse. `forskyvning` er lagene svaret på forholdet opptar foran sporet
 * (`lagFraForholdet`), og `kravet` kravet svaret gjelder. Kaster `Uforstaatt` når
 * standpunktene ikke kan leses.
 */
export function frys(
  svar: Data,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number,
  kravet?: Krav | null
) {
  const spor = svar.spor as Spor;
  const innhold = {
    spor,
    standpunkter: standpunkterISvaret(spor, svar),
    utregning: (svar.utregning ?? {}) as Data,
  };
  return beslutningsgrunnlag(innhold, paaberopelse, regler, forskyvning, kravet);
}

/**
 * Standpunktene i et svar på forholdet (§ 32.2 og § 32.3). `varselet` er det rettidigheten
 * etter § 32.2 gjelder (VS-U43 punkt 6 og 10).
 */
export function forholdsstandpunkter(
  v: Svarvurdering,
  varselet: string,
  nyId: () => string
): Data[] {
  const ut: Data[] = [];
  if (typeof v.grunnlag_varslet_i_tide === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varselet,
      hjemmel: HJEMMEL.forhold,
      i_tide: v.grunnlag_varslet_i_tide,
    });
  ut.push({ id: nyId(), art: 'forhold', resultat: v.resultat });
  return ut;
}

/**
 * Om et svar på forholdet med disse vurderingene blir en endringsordre etter
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
    spor: 'forhold',
    dokument: 'utkast',
    erstatter: null,
    innhold: { ...kategori },
  };
  let n = 0;
  const svar = {
    spor: 'forhold',
    standpunkter: forholdsstandpunkter(vurderinger, krav.id, () => `standpunkt-${++n}`),
  };
  try {
    return blirEndringsordre(frys(svar, krav, regler, 0));
  } catch (feil) {
    if (feil instanceof Uforstaatt) return false;
    throw feil;
  }
}
