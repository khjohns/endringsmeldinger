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
 *
 * Medlemsinngangene (F-1a, #820) har stiene og svarene fra
 * `backend/routes/membership_routes.py`. Medlemskapet har ingen egen ID i SQL
 * Server, så `id` i svaret og i stien er brukeren.
 */

import type { Avhengigheter, Innlogget, Prosjektforespoersel, Rute, Svar } from './app.ts';
import { ferskeProsjekter } from './autorisasjon.ts';
import { sql, utenKontekst, UUID, type Pool } from './datalag.ts';
import { fast, lagret, loggFeil } from './inngang.ts';
import { erLaast, synkroniserProsjekt } from './medlemskap.ts';

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
  const svar = await utenKontekst(db)
    .input('aktor', sql.UniqueIdentifier, aktor)
    .execute<Prosjektrad>('koe_api.brukerens_prosjekter');
  return svar.recordset;
}

/**
 * Høyst så mange av lista synkroniseres samtidig. En synkronisering holder en
 * forbindelse mens prosedyren venter på applåsen, opptil 10 s, så uten tak kan én
 * bruker med mange prosjekter ta hele poolen (standard 10) fra resten av serveren (#877).
 */
const SAMTIDIGE_SYNKRONISERINGER = 3;

/**
 * `kjoer` for hvert element, med høyst `tak` samtidig. Feiler ett, startes ingen
 * nye, og feilen kastes videre, som fra `Promise.all`.
 */
async function hverMedTak<T>(
  elementer: T[],
  tak: number,
  kjoer: (element: T) => Promise<void>
): Promise<void> {
  const gjenstaar = [...elementer];
  const arbeider = async () => {
    for (let e = gjenstaar.shift(); e !== undefined; e = gjenstaar.shift()) {
      try {
        await kjoer(e);
      } catch (feil) {
        gjenstaar.length = 0;
        throw feil;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(tak, gjenstaar.length) }, arbeider));
}

async function brukerensProsjekter(
  { sesjon }: Innlogget,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  try {
    const foer = await lesBrukerensProsjekter(avh.datalag, sesjon.bruker.id);
    if (!foer.length) return [200, { projects: [] }];
    await hverMedTak(
      foer.map((p) => p.id),
      SAMTIDIGE_SYNKRONISERINGER,
      (p) => ferskeProsjekter(avh.datalag, avh.catenda, [p])
    );
    // Synkroniseringen kan ha fjernet et medlemskap; den legger ikke til et prosjekt som ikke var med.
    const ider = new Set(foer.map((p) => p.id));
    const etter = await lesBrukerensProsjekter(avh.datalag, sesjon.bruker.id);
    return [200, { projects: etter.filter((p) => ider.has(p.id)).map(prosjektet) }];
  } catch (feil) {
    loggFeil('Prosjektene kunne ikke leses', feil);
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
  const svar = await utenKontekst(avh.datalag)
    .input('aktor', sql.UniqueIdentifier, bruker.id)
    .input('prosjekt', sql.NVarChar(4000), prosjekt.prosjektId)
    .execute<Prosjektrad>('koe_api.prosjekt');
  const rad = svar.recordset[0];
  if (!rad) return [404, { success: false, error: 'NOT_FOUND', message: 'Prosjekt ikke funnet' }];
  return [200, prosjektet(rad)];
}

interface Medlemsrad {
  project_id: string;
  user_id: string;
  catenda_subject: string;
  user_email: string;
  display_name: string;
  role: 'admin' | 'member';
  viewer_override: boolean;
  created_at: Date;
  updated_at: Date;
}

/** `public_member` i `backend/routes/membership_routes.py`. */
const medlemmet = (m: Medlemsrad) => ({
  id: m.user_id.toLowerCase(),
  project_id: m.project_id,
  user_id: m.user_id.toLowerCase(),
  user_email: m.user_email,
  display_name: m.display_name,
  created_at: m.created_at.toISOString(),
  updated_at: m.updated_at.toISOString(),
  external_id: m.catenda_subject,
  source: 'catenda',
  role: m.viewer_override ? 'viewer' : m.role,
  catenda_role: m.role,
  viewer_override: m.viewer_override,
});

async function lesMedlemmer(db: Pool, aktor: string, prosjekt: string): Promise<Medlemsrad[]> {
  const svar = await utenKontekst(db)
    .input('aktor', sql.UniqueIdentifier, aktor)
    .input('prosjekt', sql.NVarChar(4000), prosjekt)
    .execute<Medlemsrad>('koe_api.medlemmer');
  return svar.recordset;
}

async function medlemmene(
  { bruker, prosjekt }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const rader = await lesMedlemmer(avh.datalag, bruker.id, prosjekt.prosjektId);
  return [200, { members: rader.map(medlemmet) }];
}

const IKKE_OPPDATERT: Svar = [
  503,
  {
    success: false,
    error: 'SYNC_UNAVAILABLE',
    message: 'Medlemskap kunne ikke oppdateres. Prøv igjen senere.',
  },
];

/**
 * `sync_members`: henter listen fra Catenda og skriver den. `deactivated` er
 * medlemskapene skrivingen gjorde inaktive, talt av basen under applåsen (#825
 * punkt 1); 0 når en liste hentet samtidig eller senere alt var skrevet. Har
 * tilgangskontrollen alt hentet og skrevet listen i denne forespørselen, er det
 * den synkroniseringen som gjelder, så Catenda ikke spørres to ganger (#825 punkt 7).
 */
async function synkroniser(
  { prosjekt }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  try {
    const { medlemmer, deaktivert } =
      prosjekt.synkronisert ??
      (await synkroniserProsjekt(avh.datalag, prosjekt.prosjektId, (c) =>
        avh.catenda.medlemmer(c)
      ));
    return lagret([200, { success: true, members: medlemmer, deactivated: deaktivert }]);
  } catch (feil) {
    loggFeil('Medlemmene kunne ikke synkroniseres', feil);
    return IKKE_OPPDATERT;
  }
}

/** `limit_member`: leserollen for et annet aktivt medlem; kroppen er bare `viewer_override`. */
async function begrensMedlem(
  { bruker, prosjekt, ressurs, kropp }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const verdi = kropp.viewer_override;
  if (typeof verdi !== 'boolean' || Object.keys(kropp).length !== 1)
    return [
      400,
      {
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Angi viewer_override som true eller false.',
      },
    ];
  const nekt: Svar = [
    403,
    { success: false, error: 'FORBIDDEN', message: 'Du har ikke tilgang til denne endringen.' },
  ];
  const medlem = ressurs?.toLowerCase();
  if (!medlem || !UUID.test(medlem)) return nekt;
  try {
    const svar = await utenKontekst(avh.datalag)
      .input('aktor', sql.UniqueIdentifier, bruker.id)
      .input('prosjekt', sql.NVarChar(4000), prosjekt.prosjektId)
      .input('medlem', sql.UniqueIdentifier, medlem)
      .input('leserolle', sql.Bit, verdi)
      .output('endret', sql.Bit)
      .execute('koe_api.sett_leserolle');
    return svar.output.endret === true ? lagret([200, { success: true }]) : nekt;
  } catch (feil) {
    // Applåsen er forbigående og gir 503, som synkroniseringen; annet går til ruterens 500.
    if (erLaast(feil)) return IKKE_OPPDATERT;
    throw feil;
  }
}

export const PROSJEKTRUTER: readonly Rute[] = [
  {
    metode: 'GET',
    ...fast('/api/projects'),
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
  {
    metode: 'GET',
    sti: /^\/api\/projects\/([^/]+)\/members$/,
    eksempel: (p) => `/api/projects/${p}/members`,
    tilgang: {
      prosjektrolle: 'viewer',
      utenSak: 'Medlemmene i prosjektet, fra Catenda; de hører til prosjektet, ikke til en sak.',
    },
    behandle: medlemmene,
  },
  {
    metode: 'POST',
    sti: /^\/api\/projects\/([^/]+)\/members\/sync$/,
    eksempel: (p) => `/api/projects/${p}/members/sync`,
    tilgang: {
      prosjektrolle: 'admin',
      utenSak: 'Synkroniseringen av medlemmene i prosjektet fra Catenda; den gjelder ingen sak.',
    },
    behandle: synkroniser,
  },
  {
    metode: 'PATCH',
    sti: /^\/api\/projects\/([^/]+)\/members\/([^/]+)$/,
    eksempel: (p) => `/api/projects/${p}/members/00000000-0000-0000-0000-000000000000`,
    tilgang: {
      prosjektrolle: 'admin',
      utenSak:
        'Leserollen til et medlem i prosjektet; medlemskapet hører til prosjektet, ikke til en sak.',
    },
    behandle: begrensMedlem,
  },
];
