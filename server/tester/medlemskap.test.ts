/**
 * Medlemssynkroniseringen og deaktiveringen ved innlogging i SQL Server (#53, del
 * 3b), i en base bygget fra `database/migrasjoner/`. Kildene er DL-U7
 * (hentetidspunktet og Catenda-prosjektet lagres, en eldre liste skriver ikke over
 * en nyere), DL-U8 (en liste hentet før deaktiveringen ved innlogging gjør ikke
 * medlemmet aktivt igjen), B-04 punkt 1 (basens klokke) og 4 (alderen på listen),
 * sikkerhetsinvariantene i AGENTS.md (én brukerrad per person, normalisert subjekt)
 * og arbeidsvalget 16.10 i #53 (koblingen settes av driften). At innloggingen ikke
 * endrer et prosjekt med en liste hentet senere, og at innloggingen gjelder ved
 * samme tidspunkt, er arbeidsvalg i #53 som følger av DL-U7 og DL-U8.
 * Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  basensKlokke,
  deaktiverVedInnlogging,
  FeilCatendaProsjekt,
  MedlemskapetLaast,
  medlemslistensAlder,
  synkroniserMedlemskap,
  UgyldigInnlogging,
  UgyldigMedlemsliste,
  UgyldigProsjekt,
  type Medlem,
} from '../medlemskap.ts';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import {
  feilnummer,
  opprettKjoeretid,
  sql,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

const INGEN_RETT = 229;
const CHECK_BRUDD = 547;

const subjekt = () => randomBytes(16).toString('hex');
const medlem = (s = subjekt(), rolle: Medlem['rolle'] = 'member'): Medlem => ({
  subjekt: s,
  epost: `${s.slice(0, 6)}@eksempel.no`,
  navn: `Medlem ${s.slice(0, 6)}`,
  rolle,
});
const sekunder = (n: number) => new Date(Date.now() + n * 1000);

interface Medlemsrad {
  catenda_subject: string;
  role: string;
  active: boolean;
  viewer_override: boolean;
  deactivated_at: Date | null;
}

describe.skipIf(!SQLSERVER_TILKOBLING)('medlemssynkroniseringen i SQL Server', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };

  beforeAll(async () => {
    base = await opprettMigrertTestbase('medlemskap', { maks: 24 });
    kjoeretid = await opprettKjoeretid(base, { maks: 12 });
  }, 240_000);
  afterAll(async () => {
    await kjoeretid?.slett();
    await base?.slett();
  }, 60_000);

  /**
   * Et nytt prosjekt koblet til et nytt Catenda-prosjekt, satt av driften (eieren).
   * `kobling: 'ingen'` lager prosjektet uten kobling.
   */
  async function prosjekt(
    kobling: 'aktiv' | 'inaktiv' | 'ingen' = 'aktiv',
    id = `medlemskap-${randomBytes(4).toString('hex')}`
  ) {
    const catenda = randomUUID();
    await base.pool
      .request()
      .input('id', sql.NVarChar(100), id)
      .input('catenda', sql.UniqueIdentifier, catenda)
      .input('kobling', sql.NVarChar(10), kobling).query(`
        INSERT koe.projects (id, name, organisasjon_id, is_active) VALUES (@id, @id, N'oslobygg', 1);
        IF @kobling <> N'ingen'
          INSERT koe.catenda_project_configs (internal_project_id, catenda_project_id, is_active)
          VALUES (@id, @catenda, IIF(@kobling = N'aktiv', 1, 0));`);
    return { id, catenda };
  }

  function synk(
    p: { id: string; catenda: string },
    medlemmer: Medlem[],
    hentet: Date,
    pool: Pool = kjoeretid.pool
  ) {
    return synkroniserMedlemskap(pool, {
      prosjekt: p.id,
      catendaProsjekt: p.catenda,
      hentet,
      medlemmer,
    });
  }

  async function medlemskap(prosjektId: string): Promise<Medlemsrad[]> {
    const svar = await base.pool.request().input('p', sql.NVarChar(100), prosjektId)
      .query<Medlemsrad>(`SELECT catenda_subject, role, active, viewer_override, deactivated_at
                            FROM koe.app_project_memberships WHERE project_id = @p ORDER BY catenda_subject`);
    return svar.recordset;
  }

  const aktive = async (prosjektId: string) =>
    (await medlemskap(prosjektId)).filter((m) => m.active).map((m) => m.catenda_subject);

  async function synkrad(prosjektId: string) {
    const svar = await base.pool.request().input('p', sql.NVarChar(100), prosjektId).query<{
      catenda_project_id: string;
      synced_at: Date;
    }>(`SELECT catenda_project_id, synced_at FROM koe.app_membership_sync WHERE project_id = @p`);
    return svar.recordset[0];
  }

  async function brukere(subjekter: string[]) {
    const svar = await base.pool
      .request()
      .input('s', sql.NVarChar(sql.MAX), JSON.stringify(subjekter))
      .query<{ antall: number }>(
        `SELECT COUNT(*) AS antall FROM koe.app_identities
          WHERE subject IN (SELECT value FROM OPENJSON(@s))`
      );
    return svar.recordset[0].antall;
  }

  it('kontrollsak: kjøretiden skriver listen, medlemmene og når og fra hvilket Catenda-prosjekt den ble hentet (DL-U7)', async () => {
    const p = await prosjekt();
    const [a, b] = [medlem(subjekt(), 'admin'), medlem()];
    const hentet = sekunder(-60);
    expect(await synk(p, [a, b], hentet)).toBe(true);
    const rader = await medlemskap(p.id);
    expect(rader.map((r) => [r.catenda_subject, r.role, r.active, r.viewer_override])).toEqual(
      [
        [a.subjekt, 'admin', true, false],
        [b.subjekt, 'member', true, false],
      ].sort((x, y) => String(x[0]).localeCompare(String(y[0])))
    );
    const rad = await synkrad(p.id);
    expect(rad.catenda_project_id.toLowerCase()).toBe(p.catenda);
    expect(rad.synced_at.getTime()).toBe(hentet.getTime());
  });

  it('et medlem som ikke står i en nyere liste, blir inaktivt, og en enda nyere liste gjør det aktivt igjen', async () => {
    const p = await prosjekt();
    const [a, b] = [medlem(), medlem()];
    await synk(p, [a, b], sekunder(-30));
    const fjernet = sekunder(-20);
    expect(await synk(p, [a], fjernet)).toBe(true);
    const rad = (await medlemskap(p.id)).find((m) => m.catenda_subject === b.subjekt);
    expect(rad).toMatchObject({ active: false });
    expect(rad?.deactivated_at?.getTime()).toBe(fjernet.getTime());
    expect(await synk(p, [a, b], sekunder(-10))).toBe(true);
    expect(await aktive(p.id)).toEqual([a.subjekt, b.subjekt].sort());
  });

  it('en eldre liste, eller en med samme tidspunkt, skriver ikke over en nyere og gjør ikke et fjernet medlem aktivt (DL-U7)', async () => {
    const p = await prosjekt();
    const [a, b] = [medlem(), medlem()];
    const nyest = sekunder(-10);
    await synk(p, [a], nyest);
    const eldre = medlem(a.subjekt, 'admin');
    expect(await synk(p, [eldre, b], sekunder(-20))).toBe(false);
    expect(await synk(p, [eldre, b], nyest)).toBe(false);
    expect((await medlemskap(p.id)).map((m) => [m.catenda_subject, m.role])).toEqual([
      [a.subjekt, 'member'],
    ]);
    expect((await synkrad(p.id)).synced_at.getTime()).toBe(nyest.getTime());
  });

  it('samtidige synkroniseringer ender med listen som ble hentet sist, og hvert subjekt får én bruker', async () => {
    const p = await prosjekt();
    const felles = medlem();
    const lister = Array.from({ length: 8 }, (_, i) => ({
      medlemmer: [felles, medlem()],
      hentet: sekunder(-100 + i),
    }));
    await synk(p, [felles], sekunder(-200));
    // Eieren holder medlemsradene låst, så alle kallene er i gang før det første kan skrive.
    const laas = new sql.Transaction(base.pool);
    await laas.begin();
    await laas
      .request()
      .input('p', sql.NVarChar(100), p.id)
      .query(
        'SELECT COUNT(*) AS n FROM koe.app_project_memberships WITH (UPDLOCK, HOLDLOCK) WHERE project_id = @p'
      );
    const kall = [...lister].reverse().map((l) => synk(p, l.medlemmer, l.hentet));
    await new Promise((ferdig) => setTimeout(ferdig, 1500));
    await laas.commit();
    const svar = await Promise.all(kall);
    expect(svar).toContain(true);
    const sist = lister[lister.length - 1];
    expect((await synkrad(p.id)).synced_at.getTime()).toBe(sist.hentet.getTime());
    expect(await aktive(p.id)).toEqual(sist.medlemmer.map((m) => m.subjekt).sort());
    expect(await brukere([felles.subjekt])).toBe(1);
  });

  it('samtidige synkroniseringer av to prosjekter med de samme nye medlemmene gir én bruker per subjekt', async () => {
    const [p1, p2] = [await prosjekt(), await prosjekt()];
    const felles = Array.from({ length: 5 }, () => medlem());
    const hentet = sekunder(-5);
    await Promise.all([synk(p1, felles, hentet), synk(p2, [...felles].reverse(), hentet)]);
    expect(await brukere(felles.map((m) => m.subjekt))).toBe(felles.length);
    expect(await aktive(p1.id)).toEqual(await aktive(p2.id));
  });

  it.each<[string, (p: { id: string; catenda: string }) => Promise<unknown>]>([
    [
      'et annet Catenda-prosjekt',
      (p) =>
        synkroniserMedlemskap(kjoeretid.pool, {
          prosjekt: p.id,
          catendaProsjekt: randomUUID(),
          hentet: sekunder(-1),
          medlemmer: [medlem()],
        }),
    ],
    [
      'Catenda-prosjektet til et annet prosjekt',
      async (p) => {
        const annet = await prosjekt();
        return synkroniserMedlemskap(kjoeretid.pool, {
          prosjekt: p.id,
          catendaProsjekt: annet.catenda,
          hentet: sekunder(-1),
          medlemmer: [medlem()],
        });
      },
    ],
  ])('en liste fra %s avvises, og ingenting skrives', async (_, kall) => {
    const p = await prosjekt();
    await expect(kall(p)).rejects.toBeInstanceOf(FeilCatendaProsjekt);
    expect(await medlemskap(p.id)).toEqual([]);
    expect(await synkrad(p.id)).toBeUndefined();
  });

  it('en liste for et prosjekt med inaktiv kobling avvises', async () => {
    const p = await prosjekt('inaktiv');
    await expect(synk(p, [medlem()], sekunder(-1))).rejects.toBeInstanceOf(FeilCatendaProsjekt);
    expect(await synkrad(p.id)).toBeUndefined();
  });

  it.each<[string, (s: string) => string]>([
    ['store bokstaver', (s) => s.toUpperCase()],
    [
      'UUID med bindestreker',
      (s) =>
        `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`,
    ],
    ['mellomrom til slutt', (s) => `${s} `],
    ['for kort', (s) => s.slice(1)],
    ['tomt', () => ''],
  ])(
    'et subjekt som ikke er normalisert (%s), avvises før noe skrives (AGENTS.md)',
    async (_, form) => {
      const p = await prosjekt();
      const gyldig = medlem();
      const feil = form(subjekt());
      await expect(synk(p, [gyldig, medlem(feil)], sekunder(-1))).rejects.toSatisfy(
        (e: unknown) => e instanceof UgyldigMedlemsliste && feilnummer((e as Error).cause) === 52022
      );
      expect(await medlemskap(p.id)).toEqual([]);
      expect(await brukere([gyldig.subjekt])).toBe(0);
    }
  );

  it('kontrollsak: samme liste med normaliserte subjekter skrives', async () => {
    const p = await prosjekt();
    expect(await synk(p, [medlem(), medlem()], sekunder(-1))).toBe(true);
  });

  it.each<[string, string]>([
    ['samme subjekt to ganger', 'duplikat'],
    ['en ukjent rolle', 'rolle'],
    ['en rolle med mellomrom til slutt', 'rolle med mellomrom'],
    ['et element som ikke er et objekt', 'tall'],
    ['et objekt i stedet for en liste', 'objekt'],
  ])('en liste med %s avvises (52041)', async (_, art) => {
    const p = await prosjekt();
    const a = medlem();
    const json =
      art === 'duplikat'
        ? JSON.stringify([a, a].map((m) => ({ subject: m.subjekt, role: m.rolle })))
        : art === 'rolle'
          ? JSON.stringify([{ subject: a.subjekt, role: 'viewer' }])
          : art === 'rolle med mellomrom'
            ? JSON.stringify([{ subject: a.subjekt, role: 'member ' }])
            : art === 'tall'
              ? '[1]'
              : JSON.stringify({ subject: a.subjekt, role: 'member' });
    const feil = await base.pool
      .request()
      .input('prosjekt', sql.NVarChar(100), p.id)
      .input('catenda_prosjekt', sql.UniqueIdentifier, p.catenda)
      .input('medlemmer', sql.NVarChar(sql.MAX), json)
      .input('hentet', sql.DateTime2(3), sekunder(-1))
      .output('skrevet', sql.Bit)
      .execute('koe_api.synkroniser_medlemskap')
      .then(() => null, feilnummer);
    expect(feil).toBe(52041);
    expect(await medlemskap(p.id)).toEqual([]);
  });

  it('et hentetidspunkt etter basens klokke avvises, også ett sekund; basens klokke godtas (B-04 punkt 1, #616)', async () => {
    const p = await prosjekt();
    const naa = await basensKlokke(kjoeretid.pool);
    await expect(synk(p, [medlem()], new Date(naa.getTime() + 1000))).rejects.toSatisfy(
      (e: unknown) => e instanceof UgyldigMedlemsliste && feilnummer((e as Error).cause) === 52042
    );
    expect(await synkrad(p.id)).toBeUndefined();
    expect(await synk(p, [medlem()], naa)).toBe(true);
  });

  it('en prosjekt-ID med mellomrom til slutt avvises og treffer ikke prosjektet uten', async () => {
    const p = await prosjekt();
    await expect(
      synkroniserMedlemskap(kjoeretid.pool, {
        prosjekt: `${p.id} `,
        catendaProsjekt: p.catenda,
        hentet: sekunder(-1),
        medlemmer: [medlem()],
      })
    ).rejects.toBeInstanceOf(UgyldigProsjekt);
    expect(await medlemskap(p.id)).toEqual([]);
    await expect(medlemslistensAlder(kjoeretid.pool, `${p.id} `)).rejects.toBeInstanceOf(
      UgyldigProsjekt
    );
  });

  it('en prosjekt-ID over 100 tegn avvises og treffer ikke prosjektet med de første 100 (#619)', async () => {
    const p = await prosjekt(
      'aktiv',
      `medlemskap-${randomBytes(4).toString('hex')}`.padEnd(100, 'x')
    );
    await expect(
      synkroniserMedlemskap(kjoeretid.pool, {
        prosjekt: `${p.id}y`,
        catendaProsjekt: p.catenda,
        hentet: sekunder(-1),
        medlemmer: [medlem()],
      })
    ).rejects.toBeInstanceOf(UgyldigProsjekt);
    expect(await medlemskap(p.id)).toEqual([]);
    await synk(p, [medlem()], sekunder(-1));
    await expect(medlemslistensAlder(kjoeretid.pool, `${p.id}y`)).rejects.toBeInstanceOf(
      UgyldigProsjekt
    );
    expect(await medlemslistensAlder(kjoeretid.pool, p.id)).not.toBeNull();
  });

  it('uten e-post og navn på listen beholder medlemskapet dem, og et nytt medlem får tomme verdier (#615)', async () => {
    const p = await prosjekt();
    const a = medlem();
    await synk(p, [a], sekunder(-20));
    await synk(
      p,
      [
        { ...a, epost: '', navn: '' },
        { ...medlem(), epost: '', navn: '' },
      ],
      sekunder(-10)
    );
    const svar = await base.pool.request().input('p', sql.NVarChar(100), p.id).query<{
      catenda_subject: string;
      user_email: string;
      display_name: string;
    }>(`SELECT catenda_subject, user_email, display_name FROM koe.app_project_memberships WHERE project_id = @p`);
    const rader = Object.fromEntries(svar.recordset.map((r) => [r.catenda_subject, r]));
    expect(rader[a.subjekt]).toMatchObject({ user_email: a.epost, display_name: a.navn });
    expect(Object.values(rader).filter((r) => r.catenda_subject !== a.subjekt)).toMatchObject([
      { user_email: '', display_name: '' },
    ]);
  });

  it.each<[string, string]>([
    [
      'catenda_project_configs.internal_project_id',
      `INSERT koe.catenda_project_configs (internal_project_id, catenda_project_id, is_active)
       VALUES (@p, NEWID(), 1)`,
    ],
    [
      'app_membership_sync.project_id',
      `INSERT koe.app_membership_sync (project_id, catenda_project_id, synced_at)
       VALUES (@p, NEWID(), SYSUTCDATETIME())`,
    ],
  ])('%s avviser mellomrom til slutt, også fra eieren (547)', async (kolonne, setning) => {
    const p = await prosjekt('ingen');
    const feil = await base.pool
      .request()
      .input('p', sql.NVarChar(100), `${p.id} `)
      .query(setning)
      .then(
        () => null,
        (f: Error) => ({ nummer: feilnummer(f), melding: f.message })
      );
    expect(feil?.nummer).toBe(CHECK_BRUDD);
    expect(feil?.melding).toContain(`${kolonne.replace('.', '_')}_uten_mellomrom`);
  });

  it('leserollen (viewer_override) står seg gjennom synkroniseringen', async () => {
    const p = await prosjekt();
    const a = medlem();
    await synk(p, [a], sekunder(-30));
    await base.pool
      .request()
      .input('p', sql.NVarChar(100), p.id)
      .query(`UPDATE koe.app_project_memberships SET viewer_override = 1 WHERE project_id = @p`);
    await synk(p, [medlem(a.subjekt, 'admin')], sekunder(-20));
    await synk(p, [], sekunder(-15));
    await synk(p, [a], sekunder(-10));
    expect(await medlemskap(p.id)).toMatchObject([
      { catenda_subject: a.subjekt, viewer_override: true, active: true },
    ]);
  });

  describe('deaktiveringen ved innlogging (DL-U8)', () => {
    const logginn = (s: string, catendaProsjekter: string[], hentet: Date) =>
      deaktiverVedInnlogging(kjoeretid.pool, { subjekt: s, catendaProsjekter, hentet });

    /** Eieren holder applåsen for prosjektet til `slipp()` kalles. */
    async function holdLaasen(prosjektId: string) {
      const laas = new sql.Transaction(base.pool);
      await laas.begin();
      await laas
        .request()
        .input('r', sql.NVarChar(255), `koe.medlemskap:${prosjektId}`)
        .query(
          `DECLARE @svar int; EXEC @svar = sp_getapplock @Resource = @r, @LockMode = 'Exclusive', @LockOwner = 'Transaction';
           IF @svar < 0 THROW 50000, N'Fikk ikke låsen i testen', 1;`
        );
      return { slipp: () => laas.commit() };
    }

    it('kontrollsak: medlemskapet i et koblet prosjekt som ikke står i brukerens liste, blir inaktivt med innloggingens tidspunkt', async () => {
      const [p1, p2] = [await prosjekt(), await prosjekt()];
      const [a, b] = [medlem(), medlem()];
      await synk(p1, [a], sekunder(-60));
      await synk(p2, [a, b], sekunder(-60));
      const hentet = await basensKlokke(kjoeretid.pool);
      expect(await logginn(a.subjekt, [p1.catenda], hentet)).toEqual([p2.id]);
      expect(await aktive(p1.id)).toEqual([a.subjekt]);
      expect(await aktive(p2.id)).toEqual([b.subjekt]);
      const rad = (await medlemskap(p2.id)).find((m) => m.catenda_subject === a.subjekt);
      expect(rad?.deactivated_at?.getTime()).toBe(hentet.getTime());
    });

    it('en liste hentet før innloggingen gjør ikke medlemmet aktivt igjen; en liste hentet etter gjør det', async () => {
      const p = await prosjekt();
      const a = medlem();
      await synk(p, [a], sekunder(-60));
      expect(await logginn(a.subjekt, [], sekunder(-30))).toContain(p.id);
      expect(await synk(p, [a], sekunder(-40))).toBe(true);
      expect(await medlemskap(p.id)).toMatchObject([{ active: false }]);
      expect(await synk(p, [a], sekunder(-20))).toBe(true);
      expect(await medlemskap(p.id)).toMatchObject([{ active: true, deactivated_at: null }]);
    });

    it('en liste med medlemmet, hentet etter innloggingens liste og alt skrevet, gjør at innloggingen ikke endrer prosjektet (DL-U7)', async () => {
      const p = await prosjekt();
      const a = medlem();
      await synk(p, [a], sekunder(-10));
      expect(await logginn(a.subjekt, [], sekunder(-20))).not.toContain(p.id);
      expect(await aktive(p.id)).toEqual([a.subjekt]);
    });

    it('ved samme tidspunkt som listen gjelder innloggingen, i begge rekkefølger', async () => {
      const a = medlem();
      const [p1, p2] = [await prosjekt(), await prosjekt()];
      const t = sekunder(-10);
      await synk(p2, [a], sekunder(-20));
      await synk(p1, [a], t);
      await logginn(a.subjekt, [p2.catenda], t);
      expect(await aktive(p1.id)).toEqual([]);
      await logginn(a.subjekt, [p1.catenda], t);
      await synk(p2, [a], t);
      expect(await aktive(p2.id)).toEqual([]);
    });

    it('et medlemskap som alt er inaktivt, får innloggingens tidspunkt, så en liste hentet mellom de to ikke gjør det aktivt', async () => {
      const p = await prosjekt();
      const [a, b] = [medlem(), medlem()];
      await synk(p, [a, b], sekunder(-60));
      await synk(p, [b], sekunder(-50));
      expect(await logginn(a.subjekt, [], sekunder(-30))).toContain(p.id);
      expect(await synk(p, [a, b], sekunder(-40))).toBe(true);
      expect(await aktive(p.id)).toEqual([b.subjekt]);
    });

    it('et prosjekt med inaktiv kobling, uten kobling eller som står i listen, endres ikke', async () => {
      const a = medlem();
      const [aktiv, inaktiv, uten] = [await prosjekt(), await prosjekt(), await prosjekt()];
      for (const p of [aktiv, inaktiv, uten]) await synk(p, [a], sekunder(-30));
      await base.pool
        .request()
        .input('i', sql.NVarChar(100), inaktiv.id)
        .input('u', sql.NVarChar(100), uten.id).query(`
          UPDATE koe.catenda_project_configs SET is_active = 0 WHERE internal_project_id = @i;
          DELETE koe.catenda_project_configs WHERE internal_project_id = @u;`);
      const endret = await logginn(a.subjekt, [aktiv.catenda], sekunder(-1));
      expect(endret.filter((id) => [aktiv.id, inaktiv.id, uten.id].includes(id))).toEqual([]);
      for (const p of [aktiv, inaktiv, uten]) expect(await aktive(p.id)).toEqual([a.subjekt]);
    });

    it('et subjekt uten bruker endrer ingenting', async () => {
      expect(await logginn(subjekt(), [], sekunder(-1))).toEqual([]);
    });

    it.each<[string, () => [string, string[], Date] | Promise<[string, string[], Date]>, number]>([
      [
        'et subjekt som ikke er normalisert',
        () => [subjekt().toUpperCase(), [], sekunder(-1)],
        52022,
      ],
      ['en Catenda-ID som ikke er en UUID', () => [subjekt(), ['abc'], sekunder(-1)], 52045],
      [
        'en Catenda-ID uten bindestreker',
        () => [subjekt(), [randomUUID().replaceAll('-', '')], sekunder(-1)],
        52045,
      ],
      [
        'et tidspunkt etter basens klokke',
        async () => [
          subjekt(),
          [],
          new Date((await basensKlokke(kjoeretid.pool)).getTime() + 1000),
        ],
        52042,
      ],
    ])('%s avvises (UgyldigInnlogging)', async (_, argumenter, nummer) => {
      const [s, liste, hentet] = await argumenter();
      await expect(logginn(s, liste, hentet)).rejects.toSatisfy(
        (e: unknown) => e instanceof UgyldigInnlogging && feilnummer((e as Error).cause) === nummer
      );
    });

    it('en prosjektliste som ikke er en JSON-liste, avvises', async () => {
      const feil = await kjoeretid.pool
        .request()
        .input('subjekt', sql.NVarChar(400), subjekt())
        .input('catenda_prosjekter', sql.NVarChar(sql.MAX), '{}')
        .input('hentet', sql.DateTime2(3), sekunder(-1))
        .execute('koe_api.deaktiver_ved_innlogging')
        .then(() => null, feilnummer);
      expect(feil).toBe(52045);
    });

    it('innloggingen venter på applåsen synkroniseringen tar for prosjektet', async () => {
      const p = await prosjekt();
      const a = medlem();
      await synk(p, [a], sekunder(-60));
      const laas = await holdLaasen(p.id);
      const kall = logginn(a.subjekt, [], sekunder(-30));
      await new Promise((ferdig) => setTimeout(ferdig, 1500));
      expect(await aktive(p.id)).toEqual([a.subjekt]);
      await laas.slipp();
      expect(await kall).toContain(p.id);
      expect(await aktive(p.id)).toEqual([]);
    });

    it('en applås som ikke blir ledig innen 10 s, gir MedlemskapetLaast for både innloggingen og synkroniseringen (#615, #617)', async () => {
      const p = await prosjekt();
      const a = medlem();
      await synk(p, [a], sekunder(-60));
      const laas = await holdLaasen(p.id);
      try {
        const [innlogging, synkronisering] = await Promise.allSettled([
          logginn(a.subjekt, [], sekunder(-30)),
          synk(p, [], sekunder(-30)),
        ]);
        expect(innlogging).toMatchObject({ status: 'rejected' });
        expect(synkronisering).toMatchObject({ status: 'rejected' });
        for (const svar of [innlogging, synkronisering])
          expect((svar as PromiseRejectedResult).reason).toBeInstanceOf(MedlemskapetLaast);
      } finally {
        await laas.slipp();
      }
      expect(await aktive(p.id)).toEqual([a.subjekt]);
    }, 30_000);

    it.each<[string, number, boolean]>([
      ['hentet før innloggingen', -40, false],
      ['hentet etter innloggingen', -20, true],
    ])(
      'samtidig med synkroniseringen av en liste %s ender medlemmet likt i hver rekkefølge (DL-U8)',
      async (_, listeHentet, aktivTilSlutt) => {
        const a = medlem();
        const prosjekter = await Promise.all(Array.from({ length: 6 }, () => prosjekt()));
        for (const p of prosjekter) await synk(p, [a], sekunder(-60));
        const innlogging = sekunder(-30);
        const liste = sekunder(listeHentet);
        const laaser = await Promise.all(prosjekter.map((p) => holdLaasen(p.id)));
        const kall = prosjekter.flatMap((p, i) =>
          i % 2 === 0
            ? [synk(p, [a], liste), logginn(a.subjekt, [], innlogging)]
            : [logginn(a.subjekt, [], innlogging), synk(p, [a], liste)]
        );
        await new Promise((ferdig) => setTimeout(ferdig, 1000));
        for (const l of [...laaser].reverse()) await l.slipp();
        await Promise.all(kall);
        for (const p of prosjekter)
          expect(await aktive(p.id)).toEqual(aktivTilSlutt ? [a.subjekt] : []);
      },
      30_000
    );
  });

  describe('alderen på listen (B-04 punkt 4)', () => {
    it('gir når listen ble hentet og alderen etter basens klokke', async () => {
      const p = await prosjekt();
      expect(await medlemslistensAlder(kjoeretid.pool, p.id)).toBeNull();
      const hentet = sekunder(-120);
      await synk(p, [medlem()], hentet);
      const alder = await medlemslistensAlder(kjoeretid.pool, p.id);
      expect(alder?.hentet.getTime()).toBe(hentet.getTime());
      expect(alder?.alderSekunder).toBeGreaterThanOrEqual(110);
      expect(alder?.alderSekunder).toBeLessThan(180);
    });

    it('en liste fra Catenda-prosjektet prosjektet var koblet til før, gjelder ikke', async () => {
      const p = await prosjekt();
      await synk(p, [medlem()], sekunder(-10));
      await base.pool
        .request()
        .input('p', sql.NVarChar(100), p.id)
        .input('c', sql.UniqueIdentifier, randomUUID())
        .query(
          `UPDATE koe.catenda_project_configs SET catenda_project_id = @c WHERE internal_project_id = @p`
        );
      expect(await medlemslistensAlder(kjoeretid.pool, p.id)).toBeNull();
    });

    it('gjelder ikke når koblingen er inaktiv', async () => {
      const p = await prosjekt();
      await synk(p, [medlem()], sekunder(-10));
      await base.pool
        .request()
        .input('p', sql.NVarChar(100), p.id)
        .query(
          `UPDATE koe.catenda_project_configs SET is_active = 0 WHERE internal_project_id = @p`
        );
      expect(await medlemslistensAlder(kjoeretid.pool, p.id)).toBeNull();
    });
  });

  it.each([
    'SELECT * FROM koe.app_membership_sync',
    'SELECT * FROM koe.catenda_project_configs',
    'SELECT * FROM koe.app_project_memberships',
    'UPDATE koe.app_project_memberships SET active = 1 WHERE 1 = 0',
    "INSERT koe.catenda_project_configs (internal_project_id, catenda_project_id, is_active) VALUES (N'x', NEWID(), 1)",
  ])('kjøretiden kan ikke lese eller skrive tabellene direkte: %s (229)', async (setning) => {
    const feil = await kjoeretid.pool
      .request()
      .query(setning)
      .then(() => null, feilnummer);
    expect(feil).toBe(INGEN_RETT);
  });
});
