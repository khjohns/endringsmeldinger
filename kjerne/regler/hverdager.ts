/**
 * Hverdagene i en fristforlengelse, som fullmakten og 30 %-grensen ganger dagmulktssatsen med
 * (GFK-U17). En hverdag er det NS 8407 punkt 40.3 regner som hverdag (GFK-U24): mandag til
 * lørdag, unntatt søndager, helligdagene og høytidsdagene 1. og 17. mai. Helligdagene er de i
 * lov om helligdager og helligdagsfred § 2.
 */

/** En dato som `ÅÅÅÅ-MM-DD`, regnet i UTC så sommertiden ikke flytter dagen. */
type Dato = string;

const DAG = 86_400_000;

const tilTid = (dato: Dato): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dato);
  if (!m) throw new Error(`${dato} er ikke en dato på formen ÅÅÅÅ-MM-DD`);
  const tid = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (new Date(tid).toISOString().slice(0, 10) !== dato) throw new Error(`${dato} finnes ikke`);
  return tid;
};

/** Første påskedag i den gregorianske kalenderen (Meeus/Jones/Butcher). */
function paaskedag(aar: number): number {
  const a = aar % 19;
  const b = Math.floor(aar / 100);
  const c = aar % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maaned = Math.floor((h + l - 7 * m + 114) / 31);
  const dag = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(aar, maaned - 1, dag);
}

/** Helligdagene som ikke er søndager, og høytidsdagene, i året. */
function fridager(aar: number): Set<number> {
  const paaske = paaskedag(aar);
  const fraPaaske = [-3, -2, 0, 1, 39, 49, 50].map((n) => paaske + n * DAG);
  const faste = [
    [1, 1],
    [5, 1],
    [5, 17],
    [12, 25],
    [12, 26],
  ].map(([maaned, dag]) => Date.UTC(aar, maaned! - 1, dag!));
  return new Set([...fraPaaske, ...faste]);
}

/** Om dagen er en hverdag etter GFK-U24. */
export function erHverdag(dato: Dato): boolean {
  const tid = tilTid(dato);
  const d = new Date(tid);
  return d.getUTCDay() !== 0 && !fridager(d.getUTCFullYear()).has(tid);
}

/**
 * Antallet hverdager i forlengelsen av fristen `fra` med `dager` kalenderdager: dagene etter
 * fristen til og med den nye fristen (GFK-U17, GFK-U24). Kalenderdagene er dagene i kravet og
 * svaret (NS 8407 punkt 1.2).
 */
export function hverdagerIForlengelsen(fra: Dato, dager: number): number {
  if (!Number.isInteger(dager) || dager < 0)
    throw new Error(`${dager} er ikke et antall kalenderdager`);
  const start = tilTid(fra);
  let antall = 0;
  for (let n = 1; n <= dager; n++) {
    const tid = start + n * DAG;
    if (erHverdag(new Date(tid).toISOString().slice(0, 10))) antall++;
  }
  return antall;
}
