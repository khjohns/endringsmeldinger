/**
 * Feil i forbindelsen fra `tedious`, injisert for ett lån og ett kall: COMMIT som
 * ikke når serveren, eller som lykkes mens klienten får feil (#419, #418).
 */

import type { Forbindelse, Pool } from '../datalag.ts';

/** Endrer forbindelsen poolen gir ut ved neste lån, før `transaksjon` får den. */
export function vedNesteLaan(pool: Pool, endre: (f: Forbindelse) => void): void {
  const utlaan = pool as unknown as { acquire: (...a: unknown[]) => Promise<Forbindelse> };
  const ekte = utlaan.acquire;
  utlaan.acquire = async (...a) => {
    utlaan.acquire = ekte;
    const f = await ekte.apply(pool, a);
    endre(f);
    return f;
  };
}

export type Kall = (callback: (feil?: Error) => void, ...rest: unknown[]) => void;

/** Erstatter metoden for ett kall; den opprinnelige brukes igjen etterpå. */
export function enGang(
  f: Forbindelse,
  metode: 'commitTransaction' | 'reset' | 'close',
  erstatning: (ekte: Kall) => Kall
) {
  const objekt = f as unknown as Record<string, Kall>;
  const ekte = objekt[metode].bind(f);
  objekt[metode] = (...a) => {
    objekt[metode] = ekte;
    return erstatning(ekte)(...a);
  };
}

export const tidsavbrudd = () =>
  Object.assign(new Error('Timeout: Request failed to complete in 60000ms'), { code: 'ETIMEOUT' });
