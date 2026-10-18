/**
 * HF-U5, HF-U14: sammenlikningen av en revisjon med svaret den erstatter. Kommandoene
 * avviser revisjonen, og utledningen gjør saken ikke forstått når en hendelse utenfor
 * kommandoene gjør det samme (MM-U27).
 */

import { beloep } from '../regler/beloep.ts';
import { dager, GRUNNLAGSSVARET, kroner } from '../frosset/standpunkt.ts';
import type { Grunnlagsresultat } from '../regler/typer.ts';
import type { Standpunkt, Svar } from '../typer.ts';

/** Arbeidsvalget i kartleggingen 16.10 på #502: godkjenning over frafall over avslag. */
const RANG: Record<Grunnlagsresultat, number> = { avslaatt: 0, paalegg_frafalt: 1, godkjent: 2 };

/**
 * HF-U5, HF-U14: det revisjonen senker av det byggherren har innrømmet i svaret den
 * erstatter, standpunkt for standpunkt, som en setning til meldingen, eller `null`.
 * Hvert standpunkt sammenliknes med standpunktet av samme art på samme plass i
 * revisjonen (detalj 4 i HF-U5). Beløpet og dagene sammenliknes slik de står, prinsipalt
 * eller subsidiært, så en revisjon som senker ett standpunkt, avvises også når den hever
 * et annet. Mangler grunnlaget, beløpet eller dagene i revisjonen, kan standpunktet ikke
 * sammenliknes, og revisjonen avvises når svaret innrømmer noe i det, eller, for beløpet,
 * når beløpet mangler i svaret (#627).
 * Rettidigheten sammenliknes ikke her: et «i tide» sperres av `SAGT_I_TIDE` (HF-U4).
 * Byggherrens ønskede metode sammenliknes ikke (MM-U12).
 */
export function senketInnroemmelse(
  forrige: Pick<Svar, 'standpunkter' | 'beslutningsgrunnlag'>,
  nye: Standpunkt[]
): string | null {
  /** Standpunktet i revisjonen med samme art og plass som `f` i svaret. */
  const ny = <A extends Standpunkt['art']>(f: Extract<Standpunkt, { art: A }>) =>
    nye.filter((p): p is Extract<Standpunkt, { art: A }> => p.art === f.art)[
      forrige.standpunkter.filter((p) => p.art === f.art).indexOf(f)
    ];
  const mangler = (art: string) =>
    `Revisjonen mangler standpunktet om ${art} i svaret, så den kan ikke sammenliknes med svaret`;
  const subsidiaert = (id: string) =>
    forrige.beslutningsgrunnlag.virkninger.some(
      (p) => p.standpunkt === id && p.virkning === 'subsidiaert'
    )
      ? 'subsidiært '
      : '';
  for (const f of forrige.standpunkter) {
    if (f.art === 'grunnlag') {
      const n = ny(f);
      if (!n) {
        if (RANG[f.resultat] > RANG.avslaatt) return mangler('grunnlaget');
      } else if (RANG[n.resultat] < RANG[f.resultat])
        return `I svaret er grunnlaget ${subsidiaert(f.id)}${GRUNNLAGSSVARET[f.resultat]}, og revisjonen endrer det til ${GRUNNLAGSSVARET[n.resultat]}`;
    } else if (f.art === 'beloep') {
      const n = ny(f);
      const [nytt, godkjent] = [n ? beloep(n.godkjent) : null, beloep(f.godkjent)];
      // #627: et beløp som mangler, er ikke null kroner. Revisjonen kan da ikke sammenliknes.
      if (nytt === null || godkjent === null)
        return 'Beløpet mangler i svaret eller i revisjonen, så revisjonen kan ikke sammenliknes med svaret';
      if (nytt < godkjent)
        return `Svaret godkjenner ${subsidiaert(f.id)}${kroner(f.godkjent)}, og revisjonen senker beløpet til ${kroner(n!.godkjent)}`;
    } else if (f.art === 'dager') {
      const n = ny(f);
      if (!n) return mangler('dagene');
      if (n.vurdert < f.vurdert)
        return `Svaret godkjenner ${subsidiaert(f.id)}${dager(f.vurdert)}, og revisjonen senker dagene til ${dager(n.vurdert)}`;
    } else if (f.art === 'spesifisering' && !f.iTide) {
      // VS-U4: dagene byggherren måtte forstå at TE hadde krav på, når begge svar sier «for sent».
      const n = ny(f);
      if (n && !n.iTide && n.dager! < f.dager!)
        return `Svaret sier at byggherren måtte forstå at TE hadde krav på ${dager(f.dager!)} (§ 33.6.1), og revisjonen senker det til ${dager(n.dager!)}`;
    } else if (f.art === 'hindring' && f.oppfylt) {
      if (ny(f)?.oppfylt === false)
        return 'Svaret godtar at fremdriften er hindret som følge av forholdet (§ 33.1), og revisjonen tar det tilbake';
    } else if (f.art === 'metode' && f.aksepterer) {
      if (ny(f)?.aksepterer === false)
        return 'Svaret aksepterer beregningsmåten i tilbudet (§ 34.2.2, HF-U14), og revisjonen tar aksepten tilbake';
    }
  }
  return null;
}
