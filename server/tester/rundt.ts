/**
 * Testhjelpere som lar en prøve gripe inn i ett prosedyrekall gjennom poolen, uten
 * å endre basen: en feil, en ventetid eller en tilstand rett før kallet.
 */

import type { Pool } from './sqlserver.ts';

/** `pool`, der hvert kall til prosedyren `prosedyre` går gjennom `rundt`. */
export function medRundt(
  pool: Pool,
  prosedyre: string,
  rundt: <T>(kjoer: () => Promise<T>) => Promise<T>
): Pool {
  return new Proxy(pool, {
    get(maal, navn) {
      if (navn === 'request')
        return () => {
          const foresp = maal.request();
          const utfoer = foresp.execute.bind(foresp);
          foresp.execute = (async (p: string) =>
            p === prosedyre ? rundt(() => utfoer(p)) : utfoer(p)) as typeof foresp.execute;
          return foresp;
        };
      const verdi = Reflect.get(maal, navn, maal);
      return typeof verdi === 'function' ? verdi.bind(maal) : verdi;
    },
  });
}

/** `pool`, der `foer` kjøres før hvert kall til prosedyren `prosedyre`. */
export const medFoer = (pool: Pool, prosedyre: string, foer: () => Promise<void>): Pool =>
  medRundt(pool, prosedyre, async (kjoer) => {
    await foer();
    return kjoer();
  });
