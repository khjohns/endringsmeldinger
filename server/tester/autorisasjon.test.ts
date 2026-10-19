/**
 * Tilgangsoppslagene i `server/autorisasjon.ts` mot en base bygget fra
 * `database/migrasjoner/`, med kjøretidens egne rettigheter (#658).
 * Forventningene har disse kildene:
 * - `require_project_access` i `backend/lib/auth/project_access.py`: aktiv kobling,
 *   aktivt medlemskap, leserollen, prosjektgrensen for hver sak det vises til (RV-07);
 * - `AuthService.ensure_fresh`: en liste som mangler eller er for gammel, synkroniseres;
 *   listen hentes fra koblingen tilgangskontrollen alt har lest, samtidige
 *   forespørsler deler hentingen, og en liste som ikke er fersk etter
 *   synkroniseringen, gir 503 (#726 punkt 2 og 3, #707 kommentar a);
 * - `require_contract_role` og `contract_membership`: én entydig side, ellers 403;
 * - #53, kommentar 6212192068: teamet er et kontraktsteam på avsenderens side, og
 *   `null` når avsenderen er med i flere av dem;
 * - sikkerhetsinvariantene i AGENTS.md: ingen defaultverdi for prosjektet, og en
 *   `X-Project-ID` som basen ville tolket som et annet prosjekt (52043), nektes.
 * Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  catendaId,
  ferskeProsjekter,
  krevKontraktsrolle,
  krevProsjekttilgang,
  type FraSti,
  Nektet,
  type Bruker,
  type Catenda,
} from '../autorisasjon.ts';
import type { Medlem as Medlemsrad } from '../medlemskap.ts';
import {
  catendaBruker,
  iTransaksjon,
  opprettMigrertTestbase,
  settInn,
} from './sqlserver_migrert.ts';
import {
  opprettKjoeretid,
  slettAlle,
  sql,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

const hex = () => randomBytes(16).toString('hex');

/** `pool`, der hvert kall til prosedyren `prosedyre` går gjennom `rundt`. */
function medRundt(
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
const medFoer = (pool: Pool, prosedyre: string, foer: () => Promise<void>): Pool =>
  medRundt(pool, prosedyre, async (kjoer) => {
    await foer();
    return kjoer();
  });

/** En sperre som slipper når `antall` har nådd den. */
function sperre(antall: number) {
  let slipp!: () => void;
  const sluppet = new Promise<void>((ok) => (slipp = ok));
  let ventende = 0;
  return () => {
    if (++ventende >= antall) slipp();
    return sluppet;
  };
}

interface Medlemsvalg {
  rolle?: 'viewer' | 'member' | 'admin';
  leserolle?: boolean;
  aktiv?: boolean;
}

interface Prosjekt {
  id: string;
  catenda: string;
  te: string[];
  bh: string[];
}

interface Medlem {
  bruker: Bruker;
  subjekt: string;
}

/**
 * Catendas team-API som et kart fra team til subjekter, og hvilke Catenda-prosjekter
 * medlemslisten hentes fra.
 */
function catendaMed(
  team: Record<string, string[]> = {},
  medlemmer: () => Promise<Medlemsrad[]> = async () => []
) {
  const kall: string[] = [];
  const catenda: Catenda = {
    async medlemmer(catendaProsjekt) {
      kall.push(catendaProsjekt);
      return medlemmer();
    },
    async teammedlemmer(_prosjekt, teamId) {
      return new Set(team[teamId] ?? []);
    },
  };
  return { catenda, kall };
}

const foresporsel = (prosjektId?: string) =>
  ({
    method: 'GET',
    headers: prosjektId === undefined ? {} : { 'x-project-id': prosjektId },
  }) as unknown as IncomingMessage;

async function nektet(p: Promise<unknown>): Promise<{ status: number; error: unknown } | null> {
  try {
    await p;
    return null;
  } catch (feil) {
    if (!(feil instanceof Nektet)) throw feil;
    return { status: feil.status, error: feil.kropp.error };
  }
}

describe.skipIf(!SQLSERVER_TILKOBLING)('tilgangsoppslagene i SQL Server', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };

  beforeAll(async () => {
    base = await opprettMigrertTestbase('autorisasjon', { maks: 8 });
    kjoeretid = await opprettKjoeretid(base, { maks: 4 });
  }, 240_000);
  afterAll(() => slettAlle(kjoeretid, base), 60_000);

  const r = () => base.pool.request();

  /** Et prosjekt med to kontraktsteam per side, koblet og med fersk liste når ikke annet er valgt. */
  async function prosjekt({
    kobling = 'aktiv',
    liste = 'fersk',
  }: {
    kobling?: 'aktiv' | 'inaktiv' | 'ingen';
    liste?: 'fersk' | 'gammel' | 'ingen';
  } = {}): Promise<Prosjekt> {
    const p: Prosjekt = {
      id: `autorisasjon-${randomBytes(4).toString('hex')}`,
      catenda: randomUUID(),
      te: [hex(), hex()],
      bh: [hex(), hex()],
    };
    await settInn(r, 'projects', {
      id: p.id,
      name: p.id,
      organisasjon_id: 'org-test',
      is_active: true,
    });
    if (kobling !== 'ingen')
      await settInn(r, 'catenda_project_configs', {
        internal_project_id: p.id,
        catenda_project_id: p.catenda,
        library_id: randomUUID(),
        is_active: kobling === 'aktiv',
      });
    if (liste !== 'ingen')
      await settInn(r, 'app_membership_sync', {
        project_id: p.id,
        catenda_project_id: p.catenda,
        synced_at: {
          sql: liste === 'fersk' ? 'SYSUTCDATETIME()' : 'DATEADD(second, -3600, SYSUTCDATETIME())',
        },
      });
    for (const [side, team] of [
      ['TE', p.te],
      ['BH', p.bh],
    ] as const)
      for (const t of team)
        await settInn(r, 'catenda_contract_teams', {
          internal_project_id: p.id,
          team_id: t,
          contract_role: side,
        });
    return p;
  }

  async function medlem(p: Prosjekt, valg: Medlemsvalg = {}): Promise<Medlem> {
    const subjekt = hex();
    const id = await catendaBruker(base.pool, subjekt);
    await settInn(r, 'app_project_memberships', {
      project_id: p.id,
      user_id: id,
      catenda_subject: subjekt,
      user_email: `${subjekt.slice(0, 6)}@test.example`,
      display_name: 'Testbruker',
      role: valg.rolle ?? 'member',
      viewer_override: valg.leserolle ?? false,
      active: valg.aktiv ?? true,
    });
    return { bruker: { id, email: '', name: '' }, subjekt };
  }

  async function sak(p: Prosjekt, te: Medlem): Promise<string> {
    const sakId = randomUUID();
    const kontekst = { aktor: te.bruker.id, prosjekt: p.id, side: 'TE', team: p.te[0] };
    await iTransaksjon(base.pool, kontekst, (f) =>
      settInn(f, 'sak_metadata', {
        sak_id: sakId,
        prosjekt_id: p.id,
        sakstype: 'standard',
        created_by: te.bruker.id,
      })
    );
    return sakId;
  }

  const tilgang = (
    m: Medlem,
    prosjektId: string | undefined,
    {
      catenda = catendaMed().catenda,
      minsteRolle = 'viewer' as const as 'viewer' | 'member' | 'admin',
      nyttelast = {} as unknown,
      fraSti = null as FraSti,
      pool = kjoeretid.pool,
    } = {}
  ) =>
    krevProsjekttilgang(
      pool,
      catenda,
      foresporsel(prosjektId),
      m.bruker,
      minsteRolle,
      nyttelast,
      fraSti
    );

  describe('prosjekttilgangen', () => {
    it('et aktivt medlem med fersk liste får tilgang uten synkronisering (kontroll)', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      const { catenda, kall } = catendaMed();
      const t = await tilgang(m, p.id, { catenda, minsteRolle: 'member' });
      expect(t).toMatchObject({
        prosjektId: p.id,
        aktor: m.bruker.id,
        rolle: 'member',
        oppsett: { catendaProsjekt: p.catenda.toLowerCase() },
      });
      expect(kall).toEqual([]);
    });

    it('et inaktivt medlemskap gir 403', async () => {
      const p = await prosjekt();
      const m = await medlem(p, { aktiv: false });
      expect(await nektet(tilgang(m, p.id))).toEqual({ status: 403, error: 'FORBIDDEN' });
    });

    it('leserollen gir rollen viewer, og 403 der inngangen krever member', async () => {
      const p = await prosjekt();
      const m = await medlem(p, { rolle: 'admin', leserolle: true });
      expect((await tilgang(m, p.id)).rolle).toBe('viewer');
      expect(await nektet(tilgang(m, p.id, { minsteRolle: 'member' }))).toEqual({
        status: 403,
        error: 'FORBIDDEN',
      });
    });

    it('en inaktiv kobling og et prosjekt uten kobling gir 403', async () => {
      for (const kobling of ['inaktiv', 'ingen'] as const) {
        const p = await prosjekt({ kobling });
        const m = await medlem(p);
        expect(await nektet(tilgang(m, p.id)), kobling).toEqual({
          status: 403,
          error: 'FORBIDDEN',
        });
      }
    });

    it('et medlem av et annet prosjekt får 403 i dette', async () => {
      const p = await prosjekt();
      const annet = await prosjekt();
      const m = await medlem(annet);
      expect(await nektet(tilgang(m, p.id))).toEqual({ status: 403, error: 'FORBIDDEN' });
    });

    it('et annet prosjekt i stien enn i X-Project-ID gir 403, også for et medlem av prosjektet i hodet (#724 punkt 1)', async () => {
      const p = await prosjekt();
      const annet = await prosjekt();
      const m = await medlem(p);
      expect(await nektet(tilgang(m, p.id, { fraSti: { prosjektId: annet.id } }))).toEqual({
        status: 403,
        error: 'FORBIDDEN',
      });
      // Kontrollsak: samme prosjekt i stien og i hodet gir tilgang.
      expect((await tilgang(m, p.id, { fraSti: { prosjektId: p.id } })).prosjektId).toBe(p.id);
    });

    it('uten X-Project-ID er prosjektet ukjent og gir 403', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      for (const id of [undefined, ''])
        expect(await nektet(tilgang(m, id)), String(id)).toEqual({
          status: 403,
          error: 'FORBIDDEN',
        });
    });

    it('en prosjekt-ID med mellomrom i endene eller over 100 tegn gir 403', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      for (const id of [`${p.id} `, ` ${p.id}`, `${p.id}\t`, 'p'.repeat(101)])
        expect(await nektet(tilgang(m, id)), JSON.stringify(id)).toEqual({
          status: 403,
          error: 'FORBIDDEN',
        });
    });

    it('prosedyrene avviser en prosjekt-ID med mellomrom til slutt, som basen ellers ville likestilt', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      for (const [prosedyre, medAktor] of [
        ['koe_api.prosjektkobling', false],
        ['koe_api.prosjektmedlemskap', true],
        ['koe_api.kontraktsteam', true],
      ] as const) {
        const kall = (prosjektId: string) => {
          const f = kjoeretid.pool.request().input('prosjekt', sql.NVarChar(4000), prosjektId);
          if (medAktor) f.input('aktor', sql.UniqueIdentifier, m.bruker.id);
          return f.execute(prosedyre);
        };
        expect((await kall(p.id)).recordset.length, prosedyre).toBeGreaterThan(0);
        await expect(kall(`${p.id} `), prosedyre).rejects.toMatchObject({ number: 52043 });
      }
    });

    it('prosjekt_id i nyttelasten for et annet prosjekt gir 403', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      expect(await tilgang(m, p.id, { nyttelast: { prosjekt_id: p.id } })).toBeTruthy();
      expect(await nektet(tilgang(m, p.id, { nyttelast: { prosjekt_id: `${p.id} ` } }))).toEqual({
        status: 403,
        error: 'FORBIDDEN',
      });
    });

    it('en sak i et annet prosjekt gir 403, i stien og i en relasjon', async () => {
      const p = await prosjekt();
      const annet = await prosjekt();
      const m = await medlem(p);
      const egen = await sak(p, m);
      const fremmed = await sak(annet, await medlem(annet));
      expect(await tilgang(m, p.id, { fraSti: { sakId: egen } })).toBeTruthy();
      expect(
        await tilgang(m, p.id, {
          fraSti: { sakId: egen },
          nyttelast: { relaterte_koe_saker: [egen] },
        })
      ).toBeTruthy();
      for (const valg of [
        { fraSti: { sakId: fremmed } },
        { nyttelast: { sak_id: fremmed } },
        { fraSti: { sakId: egen }, nyttelast: { relaterte_koe_saker: [egen, fremmed] } },
        { fraSti: { sakId: egen }, nyttelast: { data: { relatert_sak_id: fremmed } } },
        { fraSti: { sakId: randomUUID() } },
      ])
        expect(await nektet(tilgang(m, p.id, valg)), JSON.stringify(valg)).toEqual({
          status: 403,
          error: 'FORBIDDEN',
        });
    });

    it('en gammel eller manglende liste hentes fra Catenda-prosjektet i koblingen, en fersk ikke', async () => {
      for (const [liste, forventet] of [
        ['fersk', 0],
        ['gammel', 1],
        ['ingen', 1],
      ] as const) {
        const p = await prosjekt({ liste });
        const m = await medlem(p);
        const { catenda, kall } = catendaMed({}, async () => [
          { subjekt: m.subjekt, epost: '', navn: '', rolle: 'member' },
        ]);
        expect(await tilgang(m, p.id, { catenda }), liste).toBeTruthy();
        expect(kall, liste).toEqual(Array(forventet).fill(p.catenda));
      }
    });

    it('en ny liste uten medlemmet gir 403', async () => {
      const p = await prosjekt({ liste: 'gammel' });
      const m = await medlem(p);
      const { catenda } = catendaMed();
      expect(await nektet(tilgang(m, p.id, { catenda }))).toEqual({
        status: 403,
        error: 'FORBIDDEN',
      });
    });

    it('samtidige forespørsler med gammel liste deler én henting fra Catenda (#726 punkt 3)', async () => {
      const p = await prosjekt({ liste: 'gammel' });
      const m = await medlem(p);
      const { catenda, kall } = catendaMed({}, async () => [
        { subjekt: m.subjekt, epost: '', navn: '', rolle: 'member' },
      ]);
      // De tre første svarene på alderen venter til alle tre har lest den, så hver
      // forespørsel har sett den gamle listen før en henting kan bli ferdig (#858).
      const lest = sperre(3);
      let kallTilAlderen = 0;
      const pool = medRundt(kjoeretid.pool, 'koe_api.medlemsliste_alder', async (kjoer) => {
        const svar = await kjoer();
        if (++kallTilAlderen <= 3) await lest();
        return svar;
      });
      const svar = await Promise.all([1, 2, 3].map(() => tilgang(m, p.id, { catenda, pool })));
      expect(svar.every(Boolean)).toBe(true);
      expect(kall).toEqual([p.catenda]);
      // Bare forespørselen som startet hentingen, har synkroniseringen (#825 punkt 7).
      expect(svar.filter((t) => t.synkronisert)).toHaveLength(1);
    });

    it('tar hentingen lenger enn den største alderen, godtas listen den skrev (#858 punkt 1)', async () => {
      const p = await prosjekt({ liste: 'gammel' });
      const m = await medlem(p);
      const { catenda, kall } = catendaMed({}, async () => [
        { subjekt: m.subjekt, epost: '', navn: '', rolle: 'member' },
      ]);
      // Etter hentingen sier basen at listen er eldre enn den største alderen, slik
      // den gjør når hentingen og ventingen på låsen tar så lang tid.
      let kallTilAlderen = 0;
      const pool = medRundt(kjoeretid.pool, 'koe_api.medlemsliste_alder', async (kjoer) => {
        const svar = await kjoer();
        const rad = (svar as { recordset: { alder_sekunder: number }[] }).recordset[0];
        if (++kallTilAlderen > 1 && rad) rad.alder_sekunder = 100_000;
        return svar;
      });
      const t = await tilgang(m, p.id, { catenda, pool });
      expect(kall).toEqual([p.catenda]);
      expect(kallTilAlderen).toBe(2);
      // Synkroniseringen denne forespørselen gjorde, følger tilgangen (#825 punkt 7).
      expect(t.synkronisert).toMatchObject({ skrevet: true, medlemmer: 1 });
      // Tidspunktet for hentingen blir i autorisasjonen (#638 punkt 2).
      expect(t.synkronisert).not.toHaveProperty('hentet');
    });

    it('er listen i basen etter hentingen eldre enn hentingen, gir det 503 (#858 punkt 1)', async () => {
      const p = await prosjekt({ liste: 'gammel' });
      const m = await medlem(p);
      const { catenda } = catendaMed({}, async () => [
        { subjekt: m.subjekt, epost: '', navn: '', rolle: 'member' },
      ]);
      let kallTilAlderen = 0;
      const pool = medRundt(kjoeretid.pool, 'koe_api.medlemsliste_alder', async (kjoer) => {
        const svar = await kjoer();
        const rad = (svar as { recordset: { hentet: Date; alder_sekunder: number }[] })
          .recordset[0];
        if (++kallTilAlderen > 1 && rad)
          Object.assign(rad, { hentet: new Date(0), alder_sekunder: 0 });
        return svar;
      });
      const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        expect(await nektet(tilgang(m, p.id, { catenda, pool }))).toEqual({
          status: 503,
          error: 'ACCESS_UNAVAILABLE',
        });
      } finally {
        logg.mockRestore();
      }
    });

    it('er listen fersk, følger ingen synkronisering tilgangen (#825 punkt 7)', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      const { catenda, kall } = catendaMed();
      const t = await tilgang(m, p.id, { catenda });
      expect(kall).toEqual([]);
      expect(t).not.toHaveProperty('synkronisert');
    });

    it('endres koblingen under kontrollen, hentes listen fra koblingen som ble lest først, og basen avviser den med 503 (#726 punkt 2)', async () => {
      const p = await prosjekt({ liste: 'gammel' });
      const m = await medlem(p);
      const ny = randomUUID();
      // Koblingen flyttes etter at tilgangskontrollen har lest den, rett før alderen leses.
      const pool = medFoer(kjoeretid.pool, 'koe_api.medlemsliste_alder', async () => {
        await r()
          .input('prosjekt', sql.NVarChar(100), p.id)
          .input('ny', sql.UniqueIdentifier, ny)
          .query(
            `UPDATE koe.catenda_project_configs SET catenda_project_id = @ny
              WHERE internal_project_id = @prosjekt AND catenda_project_id <> @ny`
          );
      });
      const { catenda, kall } = catendaMed({}, async () => [
        { subjekt: m.subjekt, epost: '', navn: '', rolle: 'member' },
      ]);
      expect(await nektet(tilgang(m, p.id, { catenda, pool }))).toEqual({
        status: 503,
        error: 'ACCESS_UNAVAILABLE',
      });
      expect(kall).toEqual([p.catenda]);
    });

    it('skriver ikke synkroniseringen fordi listen er markert nyere, og listen er fortsatt ikke fersk, gir det 503 (#707 kommentar a)', async () => {
      const p = await prosjekt({ liste: 'gammel' });
      const m = await medlem(p);
      // Det triggeren på koblingen etterlater når koblingen endres under hentingen:
      // en markør uten Catenda-prosjekt, satt etter `hentet`.
      const { catenda, kall } = catendaMed({}, async () => {
        await r()
          .input('prosjekt', sql.NVarChar(100), p.id)
          .query(
            `UPDATE koe.app_membership_sync
                SET catenda_project_id = '00000000-0000-0000-0000-000000000000',
                    synced_at = DATEADD(second, 1, SYSUTCDATETIME())
              WHERE project_id = @prosjekt`
          );
        return [{ subjekt: m.subjekt, epost: '', navn: '', rolle: 'member' }];
      });
      expect(await nektet(tilgang(m, p.id, { catenda }))).toEqual({
        status: 503,
        error: 'ACCESS_UNAVAILABLE',
      });
      expect(kall).toEqual([p.catenda]);
    });

    it('ferskeProsjekter henter listene for gamle prosjekter samtidig, og ikke for et ferskt (#724 punkt 5)', async () => {
      const [a, b, c] = [
        await prosjekt({ liste: 'gammel' }),
        await prosjekt({ liste: 'ingen' }),
        await prosjekt(),
      ];
      let aktive = 0;
      let flest = 0;
      // Hver henting venter til begge har begynt (#858). Hentes de etter hverandre,
      // slipper tidsgrensen den første, og `flest` blir 1.
      const begge = sperre(2);
      const { catenda, kall } = catendaMed({}, async () => {
        flest = Math.max(flest, ++aktive);
        await Promise.race([begge(), new Promise((ferdig) => setTimeout(ferdig, 5_000))]);
        aktive--;
        return [];
      });
      await ferskeProsjekter(kjoeretid.pool, catenda, [a.id, b.id, c.id]);
      expect(kall.sort()).toEqual([a.catenda, b.catenda].sort());
      expect(flest).toBe(2);
    });

    it('feiler synkroniseringen, gir det 503 og ikke tilgang, og årsaken logges (#867 punkt 1)', async () => {
      const p = await prosjekt({ liste: 'gammel' });
      const m = await medlem(p);
      const nede = new Error('Catenda er nede');
      const { catenda } = catendaMed({}, async () => {
        throw nede;
      });
      const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        expect(await nektet(tilgang(m, p.id, { catenda }))).toEqual({
          status: 503,
          error: 'ACCESS_UNAVAILABLE',
        });
        // Loggen har stedet og feilklassen, ikke meldingen (#867 punkt 5).
        const [linje] = logg.mock.calls[0] as [string];
        expect(linje).toMatch(/^Prosjekttilgangen kunne ikke avgjøres \(Error\)\n\s+at /);
        expect(linje).not.toContain(nede.message);
      } finally {
        logg.mockRestore();
      }
    });
  });

  describe('kontraktsrollen', () => {
    async function kontrakt(p: Prosjekt, m: Medlem, team: Record<string, string[]>) {
      const { catenda } = catendaMed(team);
      const t = await tilgang(m, p.id, { catenda });
      return krevKontraktsrolle(kjoeretid.pool, catenda, t);
    }

    it('teamet er kontraktsteamet på avsenderens side', async () => {
      const p = await prosjekt();
      const te = await medlem(p);
      const bh = await medlem(p);
      const team = { [p.te[1]]: [te.subjekt], [p.bh[0]]: [bh.subjekt], [hex()]: [te.subjekt] };
      expect(await kontrakt(p, te, team)).toEqual({ rolle: 'TE', teamId: p.te[1] });
      expect(await kontrakt(p, bh, team)).toEqual({ rolle: 'BH', teamId: p.bh[0] });
    });

    it('med i to kontraktsteam på samme side gir siden og teamet null', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      const team = { [p.te[0]]: [m.subjekt], [p.te[1]]: [m.subjekt] };
      expect(await kontrakt(p, m, team)).toEqual({ rolle: 'TE', teamId: null });
    });

    it('subjektet fra Catenda sammenliknes i catendaId-formen', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      const uuid = m.subjekt.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
      expect(catendaId(uuid.toUpperCase())).toBe(m.subjekt);
      expect(await kontrakt(p, m, { [p.bh[1]]: [uuid.toUpperCase()] })).toEqual({
        rolle: 'BH',
        teamId: p.bh[1],
      });
    });

    it('med i team på begge sider gir 403', async () => {
      const p = await prosjekt();
      const m = await medlem(p);
      const team = { [p.te[0]]: [m.subjekt], [p.bh[0]]: [m.subjekt] };
      await expect(kontrakt(p, m, team)).rejects.toMatchObject({
        status: 403,
        kropp: { error: 'CONTRACT_ROLE_REQUIRED' },
      });
    });

    it('uten kontraktsteam og med leserollen gir 403', async () => {
      const p = await prosjekt();
      const utenTeam = await medlem(p);
      const leser = await medlem(p, { leserolle: true });
      const team = { [p.te[0]]: [leser.subjekt], [hex()]: [utenTeam.subjekt] };
      for (const m of [utenTeam, leser])
        await expect(kontrakt(p, m, team)).rejects.toMatchObject({
          status: 403,
          kropp: { error: 'CONTRACT_ROLE_REQUIRED' },
        });
    });

    it('koe_api.kontraktsteam gir bare rader for et aktivt medlem med handlingsrett', async () => {
      const p = await prosjekt();
      const annet = await prosjekt();
      const medlemmer = {
        aktivt: await medlem(p),
        inaktivt: await medlem(p, { aktiv: false }),
        leserolle: await medlem(p, { leserolle: true }),
        annetProsjekt: await medlem(annet),
      };
      const rader: Record<string, number> = {};
      for (const [navn, m] of Object.entries(medlemmer)) {
        const svar = await kjoeretid.pool
          .request()
          .input('aktor', sql.UniqueIdentifier, m.bruker.id)
          .input('prosjekt', sql.NVarChar(4000), p.id)
          .execute('koe_api.kontraktsteam');
        rader[navn] = svar.recordset.length;
      }
      expect(rader).toEqual({ aktivt: 4, inaktivt: 0, leserolle: 0, annetProsjekt: 0 });
    });
  });
});
