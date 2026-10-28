/**
 * HF-U5: sammenlikningen av en revisjon med svaret den erstatter. Kommandoene
 * avviser revisjonen, og utledningen gjør saken ikke forstått når en hendelse utenfor
 * kommandoene gjør det samme (MM-U27).
 */

import { beloep } from '../regler/beloep.ts';
import { dager, etikett, GRUNNLAGSSVARET, kroner, laget } from '../frosset/standpunkt.ts';
import type { Grunnlagsresultat } from '../regler/typer.ts';
import type { Standpunkt, Svar } from '../typer.ts';

/** Arbeidsvalget i kartleggingen 16.10 på #502: godkjenning over frafall over avslag. */
const RANG: Record<Grunnlagsresultat, number> = { avslaatt: 0, paalegg_frafalt: 1, godkjent: 2 };

/**
 * HF-U5: det revisjonen senker av det byggherren har innrømmet i svaret den
 * erstatter, standpunkt for standpunkt, som en setning til meldingen, eller `null`.
 * Hvert standpunkt sammenliknes med standpunktet av samme art på samme plass i
 * revisjonen (detalj 4 i HF-U5). Beløpet sammenliknes for hver post, og beløpet etter
 * begrensningen etter § 34.1.3 når begge svar påberoper den (valg 4 i #1047). Beløpet og dagene
 * sammenliknes slik de står, prinsipalt eller subsidiært, så en revisjon som senker ett
 * standpunkt, avvises også når den hever et annet. Et beløp som mangler, er ikke 0 (#627):
 * mangler det i svaret, har byggherren ikke innrømmet noe å senke, og mangler det bare i
 * revisjonen, kan de ikke sammenliknes, og revisjonen avvises (#787, #814).
 * Rettidigheten sammenliknes ikke her: et «i tide» sperres av `SAGT_I_TIDE` (HF-U4).
 * Byggherrens ønskede metode og aksepten av beregningsmåten sammenliknes ikke (MM-U12,
 * MM-U34 punkt 15).
 * `forskyvning` er lagene svaret på grunnlaget opptok foran sporet da brevet ble sendt
 * (`forskyvningIBrevet`), så etiketten er den brevet ga (OV-U32, MM-U11, svaret i #1199).
 */
export function senketInnroemmelse(
  forrige: Pick<Svar, 'standpunkter' | 'beslutningsgrunnlag'>,
  nye: Standpunkt[],
  forskyvning: number
): string | null {
  /**
   * Standpunktet i revisjonen med samme art og plass som `f` i svaret. Beløpet gjelder samme
   * post, og rettidigheten samme hjemmel.
   */
  const samme = (a: Standpunkt, b: Standpunkt) =>
    a.art === b.art &&
    (a.art !== 'beloep' || a.saerskilt === (b as typeof a).saerskilt) &&
    (a.art !== 'rettidighet' || a.hjemmel === (b as typeof a).hjemmel);
  const ny = <A extends Standpunkt['art']>(f: Extract<Standpunkt, { art: A }>) =>
    nye.filter((p): p is Extract<Standpunkt, { art: A }> => samme(p, f))[
      forrige.standpunkter.filter((p) => samme(p, f)).indexOf(f)
    ];
  const post = (f: Extract<Standpunkt, { art: 'beloep' }>) =>
    f.saerskilt ? ' for særskilt justering (§ 34.1.3 annet ledd)' : '';
  // OV-U32: et standpunkt etter det første laget i brevet, med etiketten brevet ga det.
  const subsidiaert = (id: string) => {
    const v = forrige.beslutningsgrunnlag.virkninger.find((p) => p.standpunkt === id)?.virkning;
    const lag = v === undefined ? null : laget(v);
    return lag !== null && lag + forskyvning > 1 ? `${etikett(lag + forskyvning)} ` : '';
  };
  for (const f of forrige.standpunkter) {
    // Grunnlaget, beløpet og dagene står i hvert lest svar (`standpunkterISvaret`).
    if (f.art === 'grunnlag') {
      const n = ny(f)!;
      if (RANG[n.resultat] < RANG[f.resultat])
        return `I svaret er grunnlaget ${subsidiaert(f.id)}${GRUNNLAGSSVARET[f.resultat]}, og revisjonen endrer det til ${GRUNNLAGSSVARET[n.resultat]}`;
    } else if (f.art === 'beloep') {
      const n = ny(f);
      const [nytt, godkjent] = [beloep(n?.godkjent), beloep(f.godkjent)];
      if (godkjent === null) continue;
      if (nytt === null)
        return 'Beløpet mangler i revisjonen, så revisjonen kan ikke sammenliknes med svaret';
      if (nytt < godkjent)
        return `Svaret godkjenner ${subsidiaert(f.id)}${kroner(f.godkjent)}${post(f)}, og revisjonen senker beløpet til ${kroner(n!.godkjent)}`;
    } else if (f.art === 'rettidighet' && f.begrenset !== undefined) {
      // Valg 4 i #1047: beløpet etter begrensningen, når begge svar påberoper den.
      const n = ny(f);
      if (n?.begrenset !== undefined && beloep(n.begrenset)! < beloep(f.begrenset)!)
        return `Svaret godkjenner ${subsidiaert(f.id)}${kroner(f.begrenset)} for særskilt justering etter begrensningen (§ 34.1.3), og revisjonen senker beløpet til ${kroner(n.begrenset)}`;
    } else if (f.art === 'dager') {
      const n = ny(f)!;
      if (!Number.isFinite(n.vurdert) || !Number.isFinite(f.vurdert))
        return 'Dagene mangler i svaret eller i revisjonen, så revisjonen kan ikke sammenliknes med svaret';
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
    }
  }
  return null;
}
