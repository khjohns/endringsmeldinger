/**
 * Frysingen av svaret på vederlaget: lagene standpunktene står i, postene og påberopelsene i
 * brevet, det byggherren godtar prinsipalt og sammenfallet. `frosset/standpunkt.ts` slår opp
 * her gjennom `FRYSING` (#1783).
 */

import { beloep, tilTall } from '../../regler/beloep.ts';
import { lagIKravposten } from '../../regler/vederlag.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import {
  hjemmelenGjelder,
  laget,
  plassene,
  type Plass,
  type Svarinnhold,
  type Svarsfrysing,
} from '../../frosset/byggeklosser.ts';
import { utregningIVederlaget } from './format.ts';
import { erKravpostvarselhjemmel } from '../../typer.ts';
import type {
  Hjemmel,
  Krav,
  Standpunkt,
  Standpunktsvirkning,
  Utfall,
  Virkning,
} from '../../typer.ts';

/**
 * OV-U27, OV-U33, KA-U60, KA-U64: lagene i vederlaget. Påberopelsen etter § 34.1.2 gjelder hele
 * kravet og står i det første laget. I laget etter står begrensningen etter § 34.1.3, som bare
 * rammer den særskilte posten: den står i laget etter (arbeidsvalg 1.3 i spørsmålsfila 09.11
 * for #1663). Et tilbud som ikke er akseptert, gir ikke et eget lag, fordi svaret da ikke tar
 * stilling til beløpet (KA-U72): standpunktene for posten står i det første laget. En post som
 * ingen innsigelse rammer, er upåvirket, så sant
 * forholdet verken er avslått eller prekludert (OV-U33), og ellers i laget etter § 34.1.2
 * (arbeidsvalg 1.1).
 */
function vederlagsvirkninger(
  svar: Svarinnhold,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number
): Standpunktsvirkning[] {
  const sent = (hjemmel: Hjemmel) =>
    svar.standpunkter.some(
      (s) =>
        s.art === 'rettidighet' &&
        s.hjemmel === hjemmel &&
        !s.iTide &&
        hjemmelenGjelder(hjemmel, paaberopelse, regler)
    );
  const [hele, posten] = [sent('34.1.2'), sent('34.1.3')];
  const foerste = hele ? 2 : 1;
  const iKravposten = beregningsregelLag(svar.standpunkter, foerste);
  // Et tilbud byggherren ikke aksepterer, rammer bare posten, i det første laget (#1760).
  const tilbudet = new Set(
    svar.standpunkter.flatMap((s) =>
      s.art === 'oppgjoersform' && s.hjemmel === '34.2.2' && !s.aksepterer ? [s.gjelder] : []
    )
  );
  // OV-U33: upåvirket bare ved en påberopelse i sporet. Innsigelsen etter § 34.3.3, en
  // beregningsregel byggherren ikke godtar og et tilbud byggherren ikke aksepterer, rammer bare
  // posten (arbeidsvalg 1 punkt 2 i spørsmålsfila 09.11 for #1663, #1760).
  const rammer =
    posten ||
    tilbudet.size > 0 ||
    svar.standpunkter.some(
      (s) =>
        iKravposten.has(s.id) &&
        ((s.art === 'rettidighet' && s.hjemmel === '34.3.3') ||
          (s.art === 'oppgjoersform' && !s.aksepterer))
    );
  const ellers: Virkning = rammer && !hele && forskyvning === 0 ? 'upaavirket' : foerste;
  return svar.standpunkter.map((s): Standpunktsvirkning => {
    const virkning = (): Virkning => {
      if (iKravposten.has(s.id)) return iKravposten.get(s.id)!;
      if (s.art === 'rettidighet') {
        if (s.hjemmel === '34.1.2') return hele ? 1 : 'uten_virkning';
        return s.hjemmel === '34.1.3' && posten ? foerste : 'uten_virkning';
      }
      if ('gjelder' in s && s.gjelder !== undefined && tilbudet.has(s.gjelder)) return foerste;
      if (s.art === 'beloep' && s.saerskilt) return posten ? foerste + 1 : ellers;
      return ellers;
    };
    return { standpunkt: s.id, art: s.art, virkning: virkning() };
  });
}

/**
 * Laget for standpunktene til en kravpost etter en beregningsregel, etter `lagIKravposten`.
 * En kravpost der ingen standpunkter åpner et lag, er ikke med, og standpunktene står som de
 * andre. Forutsetningene i skjemaet leser lagene herfra (`kommandoer/lag.ts`).
 */
export function beregningsregelLag(
  standpunkter: Standpunkt[],
  foerste: number
): Map<string, number> {
  const ut = new Map<string, number>();
  for (const regel of standpunkter) {
    if (regel.art !== 'oppgjoersform' || regel.hjemmel === '34.2.2') continue;
    const alle = standpunkter.filter((s) => (s as { gjelder?: string }).gjelder === regel.gjelder);
    const varselet = alle.find((s) => s.art === 'rettidighet' && s.hjemmel === '34.3.3');
    const justeringen = alle.find((s) => s.art === 'justering');
    const lag = lagIKravposten(
      {
        godtarRegelen: regel.aksepterer,
        varselForSent: varselet?.art === 'rettidighet' && !varselet.iTide,
        justering: justeringen !== undefined,
      },
      foerste
    );
    if (!lag) continue;
    const sett = (s: Standpunkt | undefined, l: number | null) => {
      if (s && l !== null) ut.set(s.id, l);
    };
    sett(regel, lag.regelen);
    sett(varselet, lag.varselet);
    sett(justeringen, lag.justeringen);
    sett(
      alle.find((s) => s.art === 'beloep'),
      lag.beloepet
    );
  }
  return ut;
}

/** Begrensningen etter § 34.1.3 har virkning i svaret (VS-U5, OV-U22). */
export function begrensningen(svar: Svarinnhold, v: Standpunktsvirkning[]) {
  return svar.standpunkter.find(
    (s): s is Extract<Standpunkt, { art: 'rettidighet' }> =>
      s.art === 'rettidighet' &&
      s.hjemmel === '34.1.3' &&
      v.some((p) => p.standpunkt === s.id && laget(p.virkning) !== null)
  );
}

/**
 * OV-U26, OV-U28: en post i byggherrens svar på vederlaget. `godkjent` er beløpet uten
 * begrensningen etter § 34.1.3. `begrensning` står bare når begrensningen har virkning i
 * brevet (VS-U5, OV-U22), med beløpet etter den og laget den står i.
 */
export interface Vederlagspost extends Plass {
  standpunkt: string;
  /** Kravposten beløpet gjelder (KA-U57 (c)); ikke for posten etter § 34.1.3 annet ledd. */
  gjelder?: string;
  saerskilt?: 'produktivitet';
  /** Uten beløp når tilbudet for kravposten ikke er akseptert (KA-U72). */
  godkjent?: number;
  begrensning: (Plass & { standpunkt: string; beloep: number }) | null;
}

/**
 * MM-U23, HF-U2: byggherrens påberopelse av at et varsel kom for sent, som byggherren sa den.
 * `begrenset` er beløpet byggherren oppga etter § 34.1.3. Laget er `null` når påberopelsen er
 * uten virkning; den gir da ingen post et annet beløp.
 */
export interface Paaberopt extends Plass {
  standpunkt: string;
  hjemmel: Hjemmel;
  begrenset?: number;
}

/**
 * Postene og påberopelsene i svaret på vederlaget, med lagene brevet ga dem (MM-U23, OV-U28,
 * valg 4 i #1047, `plassene`). Ingen total per lag.
 */
export function postlisten(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  forskyvning: number
): { poster: Vederlagspost[]; paaberopt: Paaberopt[] } {
  const plass = plassene(svar, v, forskyvning).standpunkt;
  const begrenset = begrensningen(svar, v);
  const poster = svar.standpunkter.flatMap((s): Vederlagspost[] =>
    s.art !== 'beloep'
      ? []
      : [
          {
            standpunkt: s.id,
            ...(s.gjelder !== undefined ? { gjelder: s.gjelder } : {}),
            ...(s.saerskilt ? { saerskilt: s.saerskilt } : {}),
            ...(s.godkjent !== undefined ? { godkjent: s.godkjent } : {}),
            ...plass(s.id),
            begrensning:
              s.saerskilt && begrenset
                ? { standpunkt: begrenset.id, beloep: begrenset.begrenset!, ...plass(begrenset.id) }
                : null,
          },
        ]
  );
  const paaberopt = svar.standpunkter.flatMap((s): Paaberopt[] =>
    s.art !== 'rettidighet' || s.iTide
      ? []
      : [
          {
            standpunkt: s.id,
            hjemmel: s.hjemmel,
            ...(s.begrenset !== undefined ? { begrenset: s.begrenset } : {}),
            ...plass(s.id),
          },
        ]
  );
  return { poster, paaberopt };
}

/**
 * Det byggherren godtar prinsipalt i vederlaget, av postene og lagene i brevet (OV-U26,
 * OV-U27): posten etter § 34.1.3 annet ledd med beløpet etter en virksom begrensning. En
 * kravpost med beløpet i et senere lag, eller uten beløp fordi tilbudet ikke er akseptert
 * (KA-U72), har ikke et fast beløp i det første og regnes ikke med (OV-U73). `uten_fast_beloep` er de kravpostene, så beløpet ikke leses som et avslag
 * (svar 6 A i #1663).
 */
function prinsipaltIVederlaget(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  let beloepet = 0n;
  const uten: string[] = [];
  for (const p of postlisten(svar, v, 0).poster) {
    if (p.begrensning) beloepet += beloep(p.begrensning.beloep)!;
    else if (!p.saerskilt && ((p.lag ?? 1) > 1 || p.godkjent === undefined)) uten.push(p.gjelder!);
    else beloepet += beloep(p.godkjent)!;
  }
  return { beloep: tilTall(beloepet), ...(uten.length ? { uten_fast_beloep: uten } : {}) };
}

/**
 * Byggherren aksepterer ikke tilbudet eller godtar ikke beregningsregelen for minst én kravpost
 * (§ 34.2.2, KA-U57 (d), KA-U71).
 */
export const tilbudetIkkeAkseptert = (svar: Svarinnhold): boolean =>
  svar.standpunkter.some((s) => s.art === 'oppgjoersform' && !s.aksepterer);

/**
 * Svaret godkjenner hele kravet i vederlaget, når ingen påberopelse i første lag avviser det
 * (`godkjennerHeleKravet` i `frosset/standpunkt.ts`).
 */
function godkjennerHeleKravet(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  // Arbeidsvalget i #479: et tilbud byggherren ikke aksepterer (§ 34.2.2) gir aldri
  // sammenfall. Leses av standpunktene.
  if (tilbudetIkkeAkseptert(svar)) return false;
  // HF-U28, D-17 i BF-14: en innsigelse etter § 34.3.3 eller § 34.4 eller en bestridt justering
  // gir ikke sammenfall (arbeidsvalg 2 i spørsmålsfila 09.11 for #1663).
  if (
    svar.standpunkter.some(
      (s) =>
        (s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel) && !s.iTide) ||
        (s.art === 'justering' && !s.godtar)
    )
  )
    return false;
  // HF-U7: en begrensning etter § 34.1.3 i et lag er en påberopelse med subsidiært standpunkt
  // og gir ikke sammenfall, også når beløpet etter den er likt det krevde (VS-U5).
  if (begrensningen(svar, v)) return false;
  return utregningIVederlaget(svar.utregning).resultat === 'godkjent';
}

export const FRYSING_I_VEDERLAGET = {
  virkninger: vederlagsvirkninger,
  utfall: (svar, v, prekludert) => (prekludert ? { beloep: 0 } : prinsipaltIVederlaget(svar, v)),
  godkjennerHeleKravet,
} satisfies Svarsfrysing;
