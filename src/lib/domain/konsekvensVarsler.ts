export const VARSEL_LABELS = {
  vederlag: 'Varsel om krav på vederlagsjustering',
  rigg_drift: 'Særskilt varsel om økte utgifter til kapitalytelser, rigg og drift',
  produktivitet: 'Særskilt varsel om nedsatt produktivitet eller forstyrrelser på annet arbeid',
  frist: 'Varsel om krav på fristforlengelse',
} as const;

export type VarselKind = keyof typeof VARSEL_LABELS;
export type VarselValg = Partial<Record<VarselKind, { valgt: boolean; forklaring: string }>>;
export type KonsekvensVarsler = Partial<Record<VarselKind, string>>;
export interface SendtKonsekvensVarsel {
  type: VarselKind;
  tekst: string;
  tidsstempel: string;
  event_id: string;
}

/** Freeze the declaration without narrowing it by category. See docs/adr/001-varsling-og-kontraktsforhold.md. */
export function buildKonsekvensVarsler(
  valg: VarselValg,
  _hovedkategori: string,
  tittel: string,
  includeFrist = true
): KonsekvensVarsler {
  const result: KonsekvensVarsler = {};
  for (const kind of Object.keys(VARSEL_LABELS) as VarselKind[]) {
    if (!valg[kind]?.valgt || (kind === 'frist' && !includeFrist)) continue;
    const hjemmel = kind === 'frist' ? '33.4' : kind === 'vederlag' ? '34.1' : '34.1.3';
    const declaration =
      kind === 'frist'
        ? 'Totalentreprenøren varsler at det vil bli krevd fristforlengelse.'
        : kind === 'vederlag'
          ? 'Totalentreprenøren varsler at det vil bli krevd vederlagsjustering.'
          : kind === 'rigg_drift'
            ? 'Totalentreprenøren varsler særskilt at økte utgifter til kapitalytelser, rigging, drift og nedrigging vil påløpe, og at det vil bli krevd vederlagsjustering for disse.'
            : 'Totalentreprenøren varsler særskilt at økte utgifter som følge av nedsatt produktivitet eller forstyrrelser på annet arbeid vil påløpe, og at det vil bli krevd vederlagsjustering for disse.';
    result[kind] =
      `${VARSEL_LABELS[kind]} (pkt. ${hjemmel}). ${declaration} Varselet gjelder forholdet «${tittel.trim()}», som beskrevet i ansvarsgrunnlaget. Omfanget er ikke spesifisert.${valg[kind]?.forklaring.trim() ? ` ${valg[kind]!.forklaring.trim()}` : ''}`;
  }
  return result;
}
