import type { SaksoversiktHendelse, SporHendelseType } from '$lib/mocks/saksoversikt';

export interface TidslinjeNode {
  type: SporHendelseType;
  dato: string;
  label: string;
  pos: number;
  besvart: boolean;
}

export interface TidslinjeKlynge {
  pos: number;
  items: TidslinjeNode[];
}

export interface TidslinjeAkseMerke {
  label: string;
  pos: number;
}

const KLYNGE_TERSKEL = 8; // % avstand for å slå sammen

const MAANED_KORT: Record<number, string> = {
  0: 'JAN',
  1: 'FEB',
  2: 'MAR',
  3: 'APR',
  4: 'MAI',
  5: 'JUN',
  6: 'JUL',
  7: 'AUG',
  8: 'SEP',
  9: 'OKT',
  10: 'NOV',
  11: 'DES',
};

export function beregnTidslinje(
  hendelser: SaksoversiktHendelse[],
  minDato: Date,
  maksDato: Date
): TidslinjeKlynge[] {
  const spenn = maksDato.getTime() - minDato.getTime();
  if (spenn <= 0) return [];

  // Map events to positioned nodes
  const noder: TidslinjeNode[] = hendelser
    .map((h) => ({
      type: h.type,
      dato: h.dato,
      label: h.label,
      pos: ((new Date(h.dato).getTime() - minDato.getTime()) / spenn) * 100,
      besvart: h.besvart ?? false,
    }))
    .sort((a, b) => a.pos - b.pos);

  // Cluster nodes that are close together
  const klynger: TidslinjeKlynge[] = [];
  for (const node of noder) {
    const siste = klynger[klynger.length - 1];
    if (siste && node.pos - siste.pos < KLYNGE_TERSKEL) {
      siste.items.push(node);
    } else {
      klynger.push({ pos: node.pos, items: [node] });
    }
  }

  return klynger;
}

/** Priority for cluster display: F > V > K */
export function klyngePrioritet(items: TidslinjeNode[]): SporHendelseType {
  if (items.some((i) => i.type === 'F')) return 'F';
  if (items.some((i) => i.type === 'V')) return 'V';
  return 'K';
}

/** Spor breakdown string for badge: "2K 1V" */
export function sporFordeling(items: TidslinjeNode[]): string {
  const teller: Partial<Record<SporHendelseType, number>> = {};
  for (const item of items) {
    teller[item.type] = (teller[item.type] ?? 0) + 1;
  }
  // Show in K, V, F order — omit zero
  const deler: string[] = [];
  for (const spor of ['K', 'V', 'F'] as SporHendelseType[]) {
    const n = teller[spor];
    if (n) deler.push(`${n}${spor}`);
  }
  return deler.join(' ');
}

/** Grouped tooltip: "Kontraktsforhold: Varslet, Svarte\nVederlag: Sendte krav" */
export function gruppertTooltip(items: TidslinjeNode[]): string {
  const SPOR_LABEL: Record<SporHendelseType, string> = {
    K: 'Kontraktsforhold',
    V: 'Vederlag',
    F: 'Frist',
  };
  const grupper = new Map<SporHendelseType, string[]>();
  for (const item of items) {
    const list = grupper.get(item.type);
    if (list) {
      list.push(item.label);
    } else {
      grupper.set(item.type, [item.label]);
    }
  }
  const linjer: string[] = [];
  for (const spor of ['K', 'V', 'F'] as SporHendelseType[]) {
    const labels = grupper.get(spor);
    if (labels) {
      linjer.push(`${SPOR_LABEL[spor]}: ${labels.join(', ')}`);
    }
  }
  return linjer.join('\n');
}

/**
 * Generate axis marks for the timeline.
 * Uses weekly marks if span < 90 days, monthly marks otherwise.
 */
export function genererAkseMerker(
  min: Date,
  maks: Date,
  maksPosisjon = 92,
  minAvstand = 10
): TidslinjeAkseMerke[] {
  const spenn = maks.getTime() - min.getTime();
  if (spenn <= 0) return [];
  const merker: TidslinjeAkseMerke[] = [];
  let sistePos = -Infinity;

  const spennDager = spenn / (1000 * 60 * 60 * 24);
  const brukUker = spennDager < 90;

  if (brukUker) {
    // Weekly marks: start from first Monday on or after min
    const ukeStart = new Date(min);
    const dag = ukeStart.getDay();
    const dagerTilMandag = dag === 0 ? 1 : dag === 1 ? 0 : 8 - dag;
    ukeStart.setDate(ukeStart.getDate() + dagerTilMandag);

    while (ukeStart <= maks) {
      const pos = ((ukeStart.getTime() - min.getTime()) / spenn) * 100;
      if (pos > maksPosisjon) break;
      if (pos >= 0 && pos - sistePos >= minAvstand) {
        const d = ukeStart.getDate();
        const m = MAANED_KORT[ukeStart.getMonth()];
        merker.push({ label: `${d}. ${m}`, pos });
        sistePos = pos;
      }
      ukeStart.setDate(ukeStart.getDate() + 7);
    }
  } else {
    // Monthly marks
    const start = new Date(min.getFullYear(), min.getMonth(), 1);
    while (start <= maks) {
      const pos = ((start.getTime() - min.getTime()) / spenn) * 100;
      if (pos > maksPosisjon) break;
      if (pos >= 0 && pos - sistePos >= minAvstand) {
        const aar = String(start.getFullYear()).slice(2);
        merker.push({
          label: `${MAANED_KORT[start.getMonth()]} ${aar}`,
          pos,
        });
        sistePos = pos;
      }
      start.setMonth(start.getMonth() + 1);
    }
  }

  return merker;
}

export function finnDatospenn(alleSaker: { hendelser: SaksoversiktHendelse[] }[]): {
  min: Date;
  maks: Date;
} {
  let min = Infinity;
  let maks = -Infinity;

  for (const sak of alleSaker) {
    for (const h of sak.hendelser) {
      const t = new Date(h.dato).getTime();
      if (t < min) min = t;
      if (t > maks) maks = t;
    }
  }

  if (!isFinite(min) || !isFinite(maks)) {
    const now = new Date();
    return { min: now, maks: now };
  }

  const spenn = maks - min;
  const padding = spenn * 0.03;

  return {
    min: new Date(min - padding),
    maks: new Date(maks + padding),
  };
}
