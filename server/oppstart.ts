/**
 * Det som hindrer TS-serveren i å bruke basen, kontrollert før den lytter
 * (`start.ts`):
 * - Forbindelsen skal være kjøretidens: medlem av `koe_runtime`, uten en fast
 *   eller egen rolle i basen ellers, uten `CONTROL` eller en annen rettighet på
 *   hele basen, uten `IMPERSONATE` på `dbo`, uten rettigheter gitt rett til
 *   brukeren og ikke `sysadmin` på serveren (#707
 *   punkt 3, #858 punkt 2, #885 punkt 1). Med flere rettigheter gjelder ikke de
 *   kjøretiden er prøvd med (`tester/tilgang.test.ts`), og med `sa` uten database
 *   er basen `master`. Et vilkår som ikke kan leses, er et brudd (#885 punkt 2).
 * - Historikken skal være filene i `database/migrasjoner/`, og hver fil anvendt.
 *   En nyere utgivelse kan ha anvendt migrasjoner som bare legger til; dem kan
 *   serveren starte mot (DL-U16, `vurder` i `migrering.ts`).
 */

import { utenKontekst, type Pool } from './datalag.ts';
import { vurder, type Anvendt, type Migrasjon } from './migrering.ts';

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
 * Funnene fra `vurder()`, og de nye filene, som runneren ville anvendt. De som
 * kommer foran den høyeste anvendte, står alt i funnene (#726 punkt 5).
 */
export function migrasjonsavvik(anvendt: Anvendt[], filer: Migrasjon[]): string[] {
  const { funn, nye } = vurder(anvendt, filer);
  return [...funn, ...nye.map((f) => `${f.filnavn} er ikke anvendt.`)];
}

/**
 * Rettighetene på hele basen som `public` har i hver base, og `CONNECT`. En annen
 * rettighet på basen gjelder alle objekter, også dem kjøretiden ikke er prøvd mot.
 */
const BASERETTIGHETER = [
  'CONNECT',
  'VIEW ANY COLUMN ENCRYPTION KEY DEFINITION',
  'VIEW ANY COLUMN MASTER KEY DEFINITION',
];

const liste = (navn: string[]) => navn.map((n) => `N'${n}'`).join(', ');

/** Det basen svarer om forbindelsens roller og rettigheter. NULL er ikke lest. */
export interface Rollesvar {
  kjoeretid: number | null;
  /** De faste rollene forbindelsen er, eller kan være, medlem av. */
  roller: string | null;
  /** Rollene utenom `public`, `koe_runtime` og de faste. */
  egne: string | null;
  kontroll: number | null;
  /** Rettighetene på hele basen utenom `BASERETTIGHETER`. */
  rettigheter: string | null;
  /** `IMPERSONATE` på `dbo`. */
  utgir: number | null;
  /**
   * Rettighetene gitt rett til forbindelsens bruker, en gruppe den er med i eller
   * `public`, på et objekt, et skjema eller en annen bruker, utenom systemobjektene
   * `public` kan lese. Rettighetene på hele basen og `IMPERSONATE` på `dbo` står i
   * `rettigheter` og `utgir`.
   */
  direkte: string | null;
  sysadmin: number | null;
}

async function rollesvar(pool: Pool): Promise<Rollesvar> {
  return (
    await utenKontekst(pool).query<Rollesvar>(
      // `sys.user_token` har hver rolle sesjonen er medlem av, også gjennom en annen
      // rolle, uten at kjøretiden må kunne se rollen i `sys.database_principals`.
      `SELECT IS_ROLEMEMBER(N'koe_runtime') AS kjoeretid,
              (SELECT STRING_AGG(r.navn + IIF(IS_ROLEMEMBER(r.navn) IS NULL, N' (medlemskapet kunne ikke leses)', N''), N', ')
                      WITHIN GROUP (ORDER BY r.nr)
                 FROM (VALUES ${FASTE_ROLLER.map((r, i) => `(${i}, N'${r}')`).join(', ')}) AS r (nr, navn)
                WHERE ISNULL(IS_ROLEMEMBER(r.navn), 1) <> 0) AS roller,
              (SELECT STRING_AGG(t.name, N', ') WITHIN GROUP (ORDER BY t.name)
                 FROM sys.user_token AS t
                WHERE t.type = N'ROLE'
                  AND t.name NOT IN (N'public', N'koe_runtime', N'db_denydatareader', N'db_denydatawriter', ${liste(FASTE_ROLLER)})) AS egne,
              HAS_PERMS_BY_NAME(DB_NAME(), N'DATABASE', N'CONTROL') AS kontroll,
              (SELECT STRING_AGG(p.permission_name, N', ') WITHIN GROUP (ORDER BY p.permission_name)
                 FROM fn_my_permissions(NULL, N'DATABASE') AS p
                WHERE p.permission_name NOT IN (${liste(BASERETTIGHETER)})) AS rettigheter,
              HAS_PERMS_BY_NAME(N'dbo', N'USER', N'IMPERSONATE') AS utgir,
              (SELECT STRING_AGG(r.rettighet, N', ') WITHIN GROUP (ORDER BY r.rettighet)
                 FROM (SELECT DISTINCT CONVERT(nvarchar(max), p.permission_name + N' (' + p.class_desc + N')') AS rettighet
                         FROM sys.database_permissions AS p
                         JOIN sys.user_token AS t ON t.principal_id = p.grantee_principal_id
                        WHERE (t.type <> N'ROLE' OR t.name = N'public') AND p.state IN ('G', 'W')
                          AND p.class <> 0
                          AND NOT (p.class = 1 AND p.major_id < 0)
                          AND NOT (p.class = 4 AND p.major_id = USER_ID(N'dbo') AND p.permission_name = N'IMPERSONATE')) AS r) AS direkte,
              IS_SRVROLEMEMBER(N'sysadmin') AS sysadmin`
    )
  ).recordset[0];
}

/** Vilkårene for kjøretiden som `svar` bryter, som ledd i én setning. */
export function rollebrudd(svar: Rollesvar): string[] {
  const brudd: string[] = [];
  if (svar.kjoeretid === null) brudd.push('koe_runtime finnes ikke i basen eller kan ikke leses');
  else if (svar.kjoeretid !== 1) brudd.push('den er ikke medlem av koe_runtime');
  if (svar.roller) brudd.push(`den er medlem av ${svar.roller}`);
  if (svar.egne) brudd.push(`den er også medlem av ${svar.egne}`);
  if (svar.kontroll === null) brudd.push('om den har CONTROL på basen, kunne ikke leses');
  else if (svar.kontroll !== 0) brudd.push('den har CONTROL på basen');
  // CONTROL, en fast rolle og sysadmin gir rettigheter på hele basen; da gjentas de ikke.
  const alle = svar.kontroll === 1 || svar.roller || svar.sysadmin === 1;
  if (svar.rettigheter && !alle) brudd.push(`den har ${svar.rettigheter} på hele basen`);
  if (svar.utgir === null) brudd.push('om den kan utgi seg for dbo, kunne ikke leses');
  else if (svar.utgir !== 0 && !alle) brudd.push('den har IMPERSONATE på dbo');
  if (svar.direkte && !alle) brudd.push(`den har fått ${svar.direkte} direkte`);
  if (svar.sysadmin === null) brudd.push('om den er sysadmin på serveren, kunne ikke leses');
  else if (svar.sysadmin !== 0) brudd.push('den er sysadmin på serveren');
  return brudd;
}

export async function hindringer(pool: Pool, filer: Migrasjon[]): Promise<string[]> {
  const brudd = rollebrudd(await rollesvar(pool));
  if (brudd.length) return [`Forbindelsen er ikke kjøretidens: ${brudd.join(', ')}.`];
  const anvendt = (await utenKontekst(pool).execute<Anvendt>('koe_api.migrasjonshistorikk'))
    .recordset;
  return migrasjonsavvik(anvendt, filer);
}
