/**
 * Det som hindrer TS-serveren i å bruke basen, kontrollert før den lytter
 * (`start.ts`):
 * - Forbindelsen skal være kjøretidens: medlem av `koe_runtime` og verken eier av
 *   basen eller `sysadmin` på serveren (#707 punkt 3). Som eier eller `sa`
 *   gjelder ikke rettighetene kjøretiden er prøvd med (`tester/tilgang.test.ts`),
 *   og med `sa` uten database er basen `master`.
 * - Historikken skal være filene i `database/migrasjoner/`, og hver fil anvendt.
 */

import type { Pool } from './datalag.ts';
import { avvik, type Anvendt, type Migrasjon } from './migrering.ts';

/**
 * `avvik()`, og filene som ikke er anvendt og kommer etter den høyeste anvendte.
 * De som kommer foran, melder `avvik()` alt (#726 punkt 5).
 */
export function migrasjonsavvik(anvendt: Anvendt[], filer: Migrasjon[]): string[] {
  const hoeyeste = anvendt.reduce((m, a) => (a.versjon > m ? a.versjon : m), '');
  const kjent = new Set(anvendt.map((a) => a.versjon));
  return [
    ...avvik(anvendt, filer),
    ...filer
      .filter((f) => !kjent.has(f.versjon) && f.versjon > hoeyeste)
      .map((f) => `${f.filnavn} er ikke anvendt.`),
  ];
}

export async function hindringer(pool: Pool, filer: Migrasjon[]): Promise<string[]> {
  const rolle = (
    await pool
      .request()
      .query<{ kjoeretid: number | null; eier: number | null; sysadmin: number | null }>(
        `SELECT IS_ROLEMEMBER(N'koe_runtime') AS kjoeretid, IS_MEMBER(N'db_owner') AS eier,
              IS_SRVROLEMEMBER(N'sysadmin') AS sysadmin`
      )
  ).recordset[0];
  if (rolle.kjoeretid !== 1 || rolle.eier !== 0 || rolle.sysadmin !== 0)
    return [
      'Forbindelsen er ikke kjøretidens: den skal være medlem av koe_runtime og verken eier av basen eller sysadmin.',
    ];
  const anvendt = (await pool.request().execute<Anvendt>('koe_api.migrasjonshistorikk')).recordset;
  return migrasjonsavvik(anvendt, filer);
}
