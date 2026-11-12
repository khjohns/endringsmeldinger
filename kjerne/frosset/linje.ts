/**
 * Linjen for byggherrens standpunkt i beslutningsgrunnlaget (MM-U9), med leddene i sporet.
 */

import { etikett, laget, standpunktet, type Svarinnhold } from './byggeklosser.ts';
import { kategori } from '../format/kravinnhold.ts';
import { LINJEN_I_VEDERLAGET } from '../spor/vederlag/tekst.ts';
import { iLagene, SENT_I_LINJEN, SVARET_PAA_PAABEROPELSEN } from './tekst.ts';
import {
  erKravpostvarselhjemmel,
  type Krav,
  type Standpunkt,
  type Spor,
  type Standpunktsvirkning,
  type Virkning,
  utenGren,
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
  const spesifisert = standpunktet(svar, 'spesifisering');
  // Fristsvaret kan prekludere etter både § 33.4 og § 33.6.2 tredje ledd (VS-U17). Begge er
  // prinsipale, så de er ett ledd med den prinsipale grunnen (vedtaket 05.10).
  // Et upåvirket standpunkt eller et uten virkning er ingen grunn (OV-U32, HF-U2).
  // Et standpunkt om rettidighet som er et eget ledd i sporet, er ingen grunn (VS-U5).
  const egetLedd = linjeI(svar.spor).egetLedd(svar, v);
  // KA-U64, VS-U56: varselet etter § 34.3.3 eller § 34.4 for en kravpost står ved posten, ikke
  // som grunn. Etter § 34.4 har det ingen virkning og står ikke i linjen.
  const forKravposten = new Set(
    svar.standpunkter.flatMap((s) =>
      s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel) ? [s.id] : []
    )
  );
  const prekluderende = v
    .filter(
      (p) =>
        p.art === 'rettidighet' &&
        laget(p.virkning) &&
        p.standpunkt !== egetLedd &&
        !forKravposten.has(p.standpunkt)
    )
    .map((p) => p.standpunkt);
  const sene = svar.standpunkter
    .filter((s): s is Extract<Standpunkt, { art: 'rettidighet' }> => prekluderende.includes(s.id))
    .map((s) => SENT_I_LINJEN[s.hjemmel]);
  const grunntekst: Record<string, string> = {
    // HF-U11, MM-U23: byggherrens påberopelse slik brevet sier den, ikke appens slutning.
    rettidighet: `${sene.join(' og ')} kom for sent`,
    // Som brevteksten: § 33.1 krever at fremdriften hindres «som følge av» forholdet.
    hindring: `avslått: fremdriften er ikke hindret som følge av forholdet (§ ${
      kategori(paaberopelse).hovedkategori === 'force_majeure' ? '33.3' : '33.1'
    })`,
    spesifisering: spesifisert?.dager
      ? `godkjent med ${spesifisert.dager} dager (§ 33.6.1)`
      : 'avslått (§ 33.6.1)',
  };
  const grunner = v.filter(
    (p) =>
      p.art in grunntekst &&
      laget(p.virkning) &&
      (p.art !== 'rettidighet' || p.standpunkt === prekluderende[0])
  );
  const sine = linjeI(svar.spor).ledd(svar, v, kravet, forKravposten);
  // OV-U32, OV-U33: etiketten følger det fryste laget, én gang for hvert lag og bare når svaret
  // har mer enn ett lag. Et upåvirket standpunkt står uten etikett. Som i brevteksten.
  const plass = ({ virkning }: { virkning: Virkning }) => {
    const lag = laget(virkning);
    return lag === null ? null : lag + forskyvning;
  };
  const ledd = iLagene(
    [...grunner.map((p) => ({ tekst: grunntekst[p.art], virkning: p.virkning })), ...sine],
    plass,
    forskyvning + 1
  );
  const ordnet = ledd.some((l) => (plass(l) ?? 0) > 1);
  const merket = new Set<number>();
  const etikettert = (l: (typeof ledd)[number]) => {
    const lag = plass(l);
    if (!ordnet || lag === null || merket.has(lag)) return l.tekst;
    merket.add(lag);
    return `${etikett(lag)} ${l.tekst}`;
  };
  return `Byggherrens standpunkt: ${ledd.map(etikettert).join(', ')}.`;
}

/** Virkningen av standpunktet `id` i svaret. */
const virkningAv = (v: Standpunktsvirkning[], id: string) =>
  v.find((p) => p.standpunkt === id)!.virkning;

/** Leddene i sporet. Et spor uten innslag kaster, som en gren som mangler (`utenGren`). */
const linjeI = (spor: Spor): Sporslinje =>
  Object.hasOwn(LINJE, spor) ? LINJE[spor] : utenGren(spor as never);

/** Leddene i hvert spor. Forholdet og fristen står her til de flyttes til sporene (#1783, #1745). */
const LINJE: Record<Spor, Sporslinje> = {
  forhold: {
    egetLedd: () => undefined,
    ledd: (svar, v) => {
      const g = standpunktet(svar, 'forhold')!;
      return [{ tekst: SVARET_PAA_PAABEROPELSEN[g.resultat], virkning: virkningAv(v, g.id) }];
    },
  },
  vederlag: LINJEN_I_VEDERLAGET,
  frist: {
    egetLedd: () => undefined,
    ledd: (svar, v) => {
      const d = standpunktet(svar, 'dager')!;
      return [
        {
          tekst: d.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${d.vurdert} dager`,
          virkning: virkningAv(v, d.id),
        },
      ];
    },
  },
};

/** Et ledd i linjen for byggherrens standpunkt, med virkningen som gir laget. */
export interface Linjeledd {
  tekst: string;
  virkning: Virkning;
}

/** Leddene i linjen i ett spor, som `frosset/linje.ts` slår opp gjennom `LINJE` (#1783). */
export interface Sporslinje {
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
