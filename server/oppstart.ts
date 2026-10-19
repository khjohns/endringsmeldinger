/**
 * Det som hindrer TS-serveren i å bruke basen, kontrollert før den lytter
 * (`start.ts`):
 * - Forbindelsen skal være kjøretidens: medlem av `koe_runtime`, uten en fast
 *   rolle i basen, uten `CONTROL` på basen og ikke `sysadmin` på serveren (#707
 *   punkt 3, #858 punkt 2). Med flere rettigheter gjelder ikke de kjøretiden er
 *   prøvd med (`tester/tilgang.test.ts`), og med `sa` uten database er basen
 *   `master`.
 * - Historikken skal være filene i `database/migrasjoner/`, og hver fil anvendt.
 */

import { utenKontekst, type Pool } from './datalag.ts';
import { avvik, ikkeAnvendt, type Anvendt, type Migrasjon } from './migrering.ts';

/** De faste rollene i basen som gir rettigheter. `db_denydata*` tar bare bort. */
const FASTE_ROLLER = [
  'db_owner',
  'db_securityadmin',
  'db_accessadmin',
  'db_backupoperator',
  'db_ddladmin',
  'db_datawriter',
  'db_datareader',
];

/**
 * `avvik()`, og filene som ikke er anvendt og kommer etter den høyeste anvendte.
 * De som kommer foran, melder `avvik()` alt (#726 punkt 5).
 */
export function migrasjonsavvik(anvendt: Anvendt[], filer: Migrasjon[]): string[] {
  return [
    ...avvik(anvendt, filer),
    ...ikkeAnvendt(anvendt, filer).etter.map((f) => `${f.filnavn} er ikke anvendt.`),
  ];
}

/** Vilkårene for kjøretiden som forbindelsen bryter, som ledd i én setning. */
async function rollebrudd(pool: Pool): Promise<string[]> {
  const svar = (
    await utenKontekst(pool).query<{
      kjoeretid: number | null;
      roller: string | null;
      kontroll: number | null;
      sysadmin: number | null;
    }>(
      `SELECT IS_ROLEMEMBER(N'koe_runtime') AS kjoeretid,
              (SELECT STRING_AGG(r.navn + IIF(IS_ROLEMEMBER(r.navn) IS NULL, N' (medlemskapet kunne ikke leses)', N''), N', ')
                      WITHIN GROUP (ORDER BY r.nr)
                 FROM (VALUES ${FASTE_ROLLER.map((r, i) => `(${i}, N'${r}')`).join(', ')}) AS r (nr, navn)
                WHERE ISNULL(IS_ROLEMEMBER(r.navn), 1) <> 0) AS roller,
              HAS_PERMS_BY_NAME(DB_NAME(), N'DATABASE', N'CONTROL') AS kontroll,
              IS_SRVROLEMEMBER(N'sysadmin') AS sysadmin`
    )
  ).recordset[0];
  const brudd: string[] = [];
  if (svar.kjoeretid !== 1) brudd.push('den er ikke medlem av koe_runtime');
  if (svar.roller) brudd.push(`den er medlem av ${svar.roller}`);
  if (svar.kontroll !== 0) brudd.push('den har CONTROL på basen');
  if (svar.sysadmin !== 0) brudd.push('den er sysadmin på serveren');
  return brudd;
}

export async function hindringer(pool: Pool, filer: Migrasjon[]): Promise<string[]> {
  const brudd = await rollebrudd(pool);
  if (brudd.length)
    return [
      `Forbindelsen er ikke kjøretidens: ${brudd.join(', ')}. Kjøretiden skal være medlem av ` +
        'koe_runtime, uten en fast rolle i basen, uten CONTROL på basen og ikke sysadmin.',
    ];
  const anvendt = (await utenKontekst(pool).execute<Anvendt>('koe_api.migrasjonshistorikk'))
    .recordset;
  return migrasjonsavvik(anvendt, filer);
}
