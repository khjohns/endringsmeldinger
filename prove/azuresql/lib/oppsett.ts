/**
 * En kastbar base per testfil: skjemaet fra `sql/`, en eventuell
 * feilinnføring fra `PROVE_MUTASJON`, og to prosjekter med brukere og
 * kontraktsteam. Brukerne opprettes gjennom den smale identitetsinngangen,
 * som innloggingen ville gjort. Medlemskap og team skrives av `sa`, som
 * synkroniseringen og driften ville gjort; de er ikke en del av prøven.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  feilnummer,
  koble,
  MUTASJON,
  RUNTIME_PASSORD,
  sql,
  transaksjon,
  type Kontekst,
  type Pool,
} from './forbindelse.ts';

const SQL = join(dirname(fileURLToPath(import.meta.url)), '..', 'sql');

export type Part = 'TE' | 'BH';

export interface Bruker {
  id: string;
  navn: string;
}

export interface Prosjekt {
  id: string;
  team: Record<Part, string>;
}

export interface Oppsett {
  database: string;
  admin: Pool;
  runtime: Pool;
  a: Prosjekt;
  b: Prosjekt;
  /** TE og BH i A; `tilskuer` leser i A; `inaktiv` er tidligere medlem av A; `begge` er TE i A og B; `bte` er TE i B. */
  brukere: Record<'te' | 'bh' | 'tilskuer' | 'inaktiv' | 'begge' | 'bte', Bruker>;
}

/** Et team i `catenda_id()`-form. */
export const nyttTeam = (): string => randomBytes(16).toString('hex');

/** Batchene i en fil, delt på `GO`. */
export async function batcher(fil: string): Promise<string[]> {
  const tekst = await readFile(fil, 'utf8');
  return tekst
    .split(/^\s*GO\s*$/im)
    .map((b) => b.trim())
    .filter(Boolean);
}

export async function kjoerFil(pool: Pool, fil: string): Promise<void> {
  for (const batch of await batcher(fil)) await pool.request().batch(batch);
}

export function kontekst(bruker: Bruker, prosjekt: Prosjekt, side?: Part): Kontekst {
  return {
    aktor: bruker.id,
    prosjekt: prosjekt.id,
    side,
    team: side ? prosjekt.team[side] : undefined,
  };
}

export async function byggBase(navn: string): Promise<Oppsett> {
  const database = `prove_${navn}_${randomBytes(4).toString('hex')}`;
  const master = await koble('sa', 'master', 1);
  try {
    await master
      .request()
      .batch(`CREATE DATABASE [${database}] COLLATE Latin1_General_100_BIN2_UTF8`);
    await master
      .request()
      .input('passord', sql.NVarChar(200), RUNTIME_PASSORD)
      .batch(
        `IF SUSER_ID(N'koe_runtime_login') IS NULL
         BEGIN
           DECLARE @sql nvarchar(max) = N'CREATE LOGIN koe_runtime_login WITH PASSWORD = '
             + QUOTENAME(@passord, N'''') + N', CHECK_POLICY = OFF';
           EXEC (@sql);
         END`
      )
      // Testfilene kjører samtidig; en annen fil kan ha opprettet innloggingen imens.
      .catch((feil: unknown) => {
        if (feilnummer(feil) !== 15025) throw feil;
      });
  } finally {
    await master.close();
  }

  const admin = await koble('sa', database, 4);
  for (const fil of ['01_skjema.sql', '02_sikkerhet.sql', '03_kommandoer.sql'])
    await kjoerFil(admin, join(SQL, fil));
  if (MUTASJON) await kjoerFil(admin, MUTASJON);
  await kjoerFil(admin, join(SQL, '04_tilgang.sql'));
  const runtime = await koble('runtime', database, 8);

  const bruker = async (navn: string): Promise<Bruker> => {
    const r = await runtime
      .request()
      .input('subjekt', sql.NVarChar(400), nyttTeam())
      .input('epost', sql.NVarChar(320), `${navn}@prove.invalid`)
      .input('navn', sql.NVarChar(400), navn)
      .output('bruker', sql.UniqueIdentifier)
      .execute('koe_api.catenda_identitet');
    return { id: String(r.output.bruker).toLowerCase(), navn };
  };
  const brukere = {
    te: await bruker('te'),
    bh: await bruker('bh'),
    tilskuer: await bruker('tilskuer'),
    inaktiv: await bruker('inaktiv'),
    begge: await bruker('begge'),
    bte: await bruker('bte'),
  };
  const a: Prosjekt = { id: `a-${randomUUID()}`, team: { TE: nyttTeam(), BH: nyttTeam() } };
  const b: Prosjekt = { id: `b-${randomUUID()}`, team: { TE: nyttTeam(), BH: nyttTeam() } };
  const medlem = (p: Prosjekt, u: Bruker, rolle: string, aktiv = 1) =>
    `INSERT koe.app_project_memberships (project_id, user_id, role, viewer_override, active)
     VALUES (N'${p.id}', '${u.id}', N'${rolle}', 0, ${aktiv});`;
  const team = (p: Prosjekt) =>
    `INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role)
     VALUES (N'${p.id}', N'${p.team.TE}', N'TE'), (N'${p.id}', N'${p.team.BH}', N'BH');`;
  await admin.request().batch(
    `INSERT koe.projects (id, name, is_active) VALUES (N'${a.id}', N'A', 1), (N'${b.id}', N'B', 1);
     ${team(a)} ${team(b)}
     ${medlem(a, brukere.te, 'member')} ${medlem(a, brukere.bh, 'member')}
     ${medlem(a, brukere.tilskuer, 'viewer')} ${medlem(a, brukere.inaktiv, 'member', 0)}
     ${medlem(a, brukere.begge, 'member')} ${medlem(b, brukere.begge, 'member')}
     ${medlem(b, brukere.bte, 'member')}`
  );
  return { database, admin, runtime, a, b, brukere };
}

export async function rydd(o: Oppsett): Promise<void> {
  await o.runtime.close();
  await o.admin.close();
  const master = await koble('sa', 'master', 1);
  try {
    await master
      .request()
      .batch(
        `ALTER DATABASE [${o.database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${o.database}]`
      );
  } finally {
    await master.close();
  }
}

/** En ny sak i prosjektet, opprettet av brukeren på siden. */
export async function nySak(o: Oppsett, k: Kontekst): Promise<string> {
  return transaksjon(o.runtime, k, async (f) => {
    const r = await f()
      .input('sakstype', sql.NVarChar(40), 'standard')
      .output('sak_id', sql.NVarChar(36))
      .execute('koe_api.opprett_sak');
    return r.output.sak_id as string;
  });
}
