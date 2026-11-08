/** Typene for TEs varsler om konsekvensene i tidslinjen (`timeline.ts`). */
export type VarselKind = 'vederlag' | 'rigg_drift' | 'produktivitet' | 'frist';
export type KonsekvensVarsler = Partial<Record<VarselKind, string>>;
export interface SendtKonsekvensVarsel {
  type: VarselKind;
  tekst: string;
  tidsstempel: string;
  event_id: string;
}
