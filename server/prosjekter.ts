/**
 * Prosjektinngangene (F0b-6, #660): brukerens prosjekter og ett prosjekt, med
 * samme stier og svar som `list_projects` og `get_project` i
 * `backend/routes/project_routes.py`, så frontenden ikke endres når rutingen
 * flyttes (F0b-8).
 *
 * Lista synkroniserer et medlemskap som er for gammelt, før den leses, som
 * `AuthService.user_projects` gjør gjennom `role()`. Prosjektet krever
 * prosjekttilgang, og stien må være prosjektet i `X-Project-ID`.
 *
 * `koe.projects` har ikke `settings` og `created_by`; svaret har `{}` og
 * `null`, som Python gir et prosjekt uten dem (#660).
 */

import type { Avhengigheter, Innlogget, Prosjektforespoersel, Rute, Svar } from './app.ts';
import { ferskeMedlemmer } from './autorisasjon.ts';
import { sql, type Pool } from './datalag.ts';

interface Prosjektrad {
  id: string;
  organisasjon_id: string;
  name: string;
  description: string | null;
  created_at: Date;
  is_active: boolean;
}

/** `Project` i `src/lib/types/project.ts`. */
const prosjektet = (r: Prosjektrad) => ({
  id: r.id,
  organisasjon_id: r.organisasjon_id,
  name: r.name,
  description: r.description,
  settings: {},
  created_at: r.created_at.toISOString(),
  created_by: null,
  is_active: r.is_active,
});

async function lesBrukerensProsjekter(db: Pool, aktor: string): Promise<Prosjektrad[]> {
  const svar = await db
    .request()
    .input('aktor', sql.UniqueIdentifier, aktor)
    .execute<Prosjektrad>('koe_api.brukerens_prosjekter');
  return svar.recordset;
}

async function brukerensProsjekter(
  { sesjon }: Innlogget,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  try {
    const foer = await lesBrukerensProsjekter(avh.datalag, sesjon.bruker.id);
    if (!foer.length) return [200, { projects: [] }];
    for (const p of foer) await ferskeMedlemmer(avh.datalag, avh.catenda, p.id);
    // Synkroniseringen kan ha fjernet et medlemskap; den legger ikke til et prosjekt som ikke var med.
    const ider = new Set(foer.map((p) => p.id));
    const etter = await lesBrukerensProsjekter(avh.datalag, sesjon.bruker.id);
    return [200, { projects: etter.filter((p) => ider.has(p.id)).map(prosjektet) }];
  } catch {
    return [
      503,
      {
        success: false,
        error: 'ACCESS_UNAVAILABLE',
        message: 'Tilgang kunne ikke bekreftes. Prøv igjen senere.',
      },
    ];
  }
}

async function visProsjektet(
  { bruker, prosjekt }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const svar = await avh.datalag
    .request()
    .input('aktor', sql.UniqueIdentifier, bruker.id)
    .input('prosjekt', sql.NVarChar(4000), prosjekt.prosjektId)
    .execute<Prosjektrad>('koe_api.prosjekt');
  const rad = svar.recordset[0];
  if (!rad) return [404, { success: false, error: 'NOT_FOUND', message: 'Prosjekt ikke funnet' }];
  return [200, prosjektet(rad)];
}

export const PROSJEKTRUTER: readonly Rute[] = [
  {
    metode: 'GET',
    sti: /^\/api\/projects$/,
    eksempel: () => '/api/projects',
    tilgang: {
      utenProsjekt:
        'Lista over prosjektene brukeren er medlem i; den velger prosjektet, så den kan ikke kreve ett.',
    },
    behandle: brukerensProsjekter,
  },
  {
    metode: 'GET',
    sti: /^\/api\/projects\/([^/]+)$/,
    eksempel: (p) => `/api/projects/${p}`,
    tilgang: {
      prosjektrolle: 'viewer',
      utenSak:
        'Prosjektet selv, som frontenden henter før en side i prosjektet vises; det finnes ingen sak.',
    },
    behandle: visProsjektet,
  },
];
