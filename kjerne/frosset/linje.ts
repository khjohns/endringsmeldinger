/**
 * Linjen for byggherrens standpunkt i beslutningsgrunnlaget (MM-U9), med leddene i sporet.
 */

import { etikett, iSporet, laget, type Svarinnhold } from './byggeklosser.ts';
import { LINJEN_I_FORHOLDET } from '../spor/forhold/tekst.ts';
import { LINJEN_I_VEDERLAGET } from '../spor/vederlag/tekst.ts';
import { LINJEN_I_FRISTEN } from '../spor/frist/tekst.ts';
import { iLagene, medHardeMellomrom, SENT_I_LINJEN } from './tekst.ts';
import {
  erKravpostvarselhjemmel,
  type Krav,
  type Spor,
  type Standpunktsvirkning,
  type Virkning,
} from '../typer.ts';

/**
 * Linjen i brevet for svaret: byggherrens standpunkt, med den prinsipale grunnen først
 * (vedtaket 05.10 om avslag sammen med § 32.2). Leddene ordnes og etiketteres som i
 * brevteksten (HF-U2, VS-U3), med lagene i sporet flyttet ned med `forskyvning`, lagene
 * svaret på forholdet opptar foran sporet (OV-U32, OV-U33, svaret i #1199). `kravet` er
 * kravet svaret gjelder; med flere kravposter navngir linjen kravposten (KA-U57 (c) og (d)).
 */
export function beslutningslinje(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  paaberopelse: Krav | null | undefined,
  forskyvning: number,
  kravet?: Krav | null
): string {
  // Et upåvirket standpunkt eller et uten virkning er ingen grunn (OV-U32, HF-U2).
  // Et standpunkt om rettidighet som er et eget ledd i sporet, er ingen grunn (VS-U5).
  const egetLedd = iSporet(LINJE, svar.spor).egetLedd(svar, v);
  // KA-U64, VS-U56: varselet etter § 34.3.3 eller § 34.4 for en kravpost står ved posten, ikke
  // som grunn. Etter § 34.4 har det ingen virkning og står ikke i linjen.
  const forKravposten = new Set(
    svar.standpunkter.flatMap((s) =>
      s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel) ? [s.id] : []
    )
  );
  const grunntekst: Record<string, string> = iSporet(LINJE, svar.spor).grunner(
    svar,
    paaberopelse,
    kravet
  );
  const virkninger = new Map(v.map((p) => [p.standpunkt, p.virkning]));
  const grunner = svar.standpunkter.flatMap((s): Linjeledd[] => {
    const virkning = virkninger.get(s.id);
    if (typeof virkning !== 'number') return [];
    const tekst =
      s.art === 'rettidighet'
        ? !s.iTide && s.id !== egetLedd && !forKravposten.has(s.id)
          ? `${SENT_I_LINJEN[s.hjemmel]} kom for sent`
          : undefined
        : grunntekst[s.art];
    return tekst === undefined ? [] : [{ tekst, virkning }];
  });
  const sine = iSporet(LINJE, svar.spor).ledd(svar, v, kravet, forKravposten);
  // OV-U32, OV-U33: etiketten følger det fryste laget, én gang for hvert lag og bare når svaret
  // har mer enn ett lag. Et upåvirket standpunkt står uten etikett. Som i brevteksten.
  const plass = ({ virkning }: { virkning: Virkning }) => {
    const lag = laget(virkning);
    return lag === null ? null : lag + forskyvning;
  };
  const ledd = iLagene([...grunner, ...sine], plass, forskyvning + 1);
  const ordnet = ledd.some((l) => (plass(l) ?? 0) > 1);
  const merket = new Set<number>();
  const etikettert = (l: (typeof ledd)[number]) => {
    const lag = plass(l);
    if (!ordnet || lag === null || merket.has(lag)) return l.tekst;
    merket.add(lag);
    return `${etikett(lag)} ${l.tekst}`;
  };
  return medHardeMellomrom(`Byggherrens standpunkt: ${ledd.map(etikettert).join(', ')}.`);
}

/** Leddene i hvert spor. */
const LINJE: Record<Spor, Sporslinje> = {
  forhold: LINJEN_I_FORHOLDET,
  vederlag: LINJEN_I_VEDERLAGET,
  frist: LINJEN_I_FRISTEN,
};

/** Et ledd i linjen for byggherrens standpunkt, med virkningen som gir laget. */
export interface Linjeledd {
  tekst: string;
  virkning: Virkning;
}

/** Leddene i linjen i ett spor, som `frosset/linje.ts` slår opp gjennom `LINJE` (#1783). */
export interface Sporslinje {
  /**
   * Grunnene i sporet ut over rettidigheten, per art, når standpunktet har et lag. `kravet` er
   * kravet svaret gjelder.
   */
  grunner(
    svar: Svarinnhold,
    paaberopelse: Krav | null | undefined,
    kravet: Krav | null | undefined
  ): Record<string, string>;
  /** Standpunktet om rettidighet som står som et eget ledd i sporet og ikke som grunn (VS-U5). */
  egetLedd(svar: Svarinnhold, v: Standpunktsvirkning[]): string | undefined;
  /**
   * Leddene for standpunktene i sporet, etter grunnene. `forKravposten` er standpunktene om
   * varselet for en kravpost (KA-U64, VS-U56).
   */
  ledd(
    svar: Svarinnhold,
    v: Standpunktsvirkning[],
    kravet: Krav | null | undefined,
    forKravposten: ReadonlySet<string>
  ): Linjeledd[];
}
