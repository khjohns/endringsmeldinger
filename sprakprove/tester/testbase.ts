/**
 * Oppsettet for kjernens lagringstester i `sprakprove/kjernelagring/` mot den
 * kastbare testbasen i PostgreSQL. Radene er de innloggingen og
 * medlemssynkroniseringen ellers skriver: bruker, prosjektmedlemskap, registrert
 * prosjekt, fersk synkronisering og kontraktsteam. Alt får ID-er unike for
 * kjøringen og slettes av `rydd`.
 */

import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { kobleTilKastbarTestbase } from '../kastbar.ts';

export const TESTBASE_URL = process.env.KOE_TESTBASE_URL ?? '';

export interface Testbruker {
  id: string;
  subjekt: string;
}

export interface Testprosjekt {
  id: string;
  catendaProsjekt: string;
  teTeam: string;
  bhTeam: string;
}

export interface Oppsett {
  pool: pg.Pool;
  prosjekt: Testprosjekt;
  annetProsjekt: Testprosjekt;
  te: Testbruker;
  bh: Testbruker;
}

async function prosjekt(pool: pg.Pool, navn: string): Promise<Testprosjekt> {
  const p: Testprosjekt = {
    id: `p-test-${navn}-${randomUUID().slice(0, 8)}`,
    catendaProsjekt: randomUUID(),
    teTeam: randomUUID(),
    bhTeam: randomUUID(),
  };
  await pool.query(
    "INSERT INTO projects (id, name, organisasjon_id) VALUES ($1, 'Testmiljøet', 'org-test')",
    [p.id]
  );
  await pool.query(
    'INSERT INTO catenda_project_configs (internal_project_id, catenda_project_id, library_id) VALUES ($1, $2, $3)',
    [p.id, p.catendaProsjekt, randomUUID()]
  );
  await pool.query(
    'INSERT INTO app_membership_sync (project_id, catenda_project_id, synced_at) VALUES ($1, $2, now())',
    [p.id, p.catendaProsjekt]
  );
  await pool.query(
    "INSERT INTO catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES ($1, $2, 'TE'), ($1, $3, 'BH')",
    [p.id, p.teTeam, p.bhTeam]
  );
  return p;
}

async function bruker(pool: pg.Pool, prosjektId: string, navn: string): Promise<Testbruker> {
  const b: Testbruker = {
    id: randomUUID(),
    subjekt: randomUUID(),
  };
  await pool.query('INSERT INTO app_users (id, email, name) VALUES ($1, $2, $3)', [
    b.id,
    `${navn}@test.example`,
    navn,
  ]);
  await pool.query(
    "INSERT INTO app_project_memberships (project_id, user_id, catenda_subject, role) VALUES ($1, $2, $3, 'member')",
    [prosjektId, b.id, b.subjekt]
  );
  return b;
}

export async function lagOppsett(): Promise<Oppsett> {
  const pool = await kobleTilKastbarTestbase(TESTBASE_URL, 4);
  const p = await prosjekt(pool, 'a');
  const annet = await prosjekt(pool, 'b');
  const te = await bruker(pool, p.id, 'te');
  const bh = await bruker(pool, p.id, 'bh');
  return { pool, prosjekt: p, annetProsjekt: annet, te, bh };
}

export async function rydd(o: Oppsett): Promise<void> {
  const prosjekter = [o.prosjekt.id, o.annetProsjekt.id];
  const brukere = [o.te, o.bh].map((b) => b.id);
  try {
    await o.pool.query('DELETE FROM sak_metadata WHERE prosjekt_id = ANY($1)', [prosjekter]);
    await o.pool.query('DELETE FROM projects WHERE id = ANY($1)', [prosjekter]);
    await o.pool.query('DELETE FROM app_users WHERE id = ANY($1::uuid[])', [brukere]);
  } finally {
    await o.pool.end();
  }
}
