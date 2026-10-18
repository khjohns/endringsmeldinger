/**
 * Driftsskriptet for registreringen (F-1, #820) mot en migrert base, med en
 * innlogging som bare har `koe_driftsrolle`. Forventningene har kilde i svarene
 * 18.10: registreringen er et driftsskript mot prosedyrer bare driften kan kjøre
 * (#820), og kontraktsteamene kan bare få nye team når prosjektet har saker
 * (#764, «Runde 8: avgjort 18.10»). Kravet om begge sider og om ett team per side
 * følger `koe_set_contract_teams` og `catenda_admin.py` i Python (RV-07).
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import type { CatendaOAuth } from '../catenda.ts';
import { feilnummer, type Pool } from '../datalag.ts';
import {
  kjoer,
  kontraktsteamFra,
  lesKontraktsteam,
  Registreringsfeil,
  type Kontraktsteam,
} from '../registrering.ts';
import { opprettKjoeretid } from './sqlserver.ts';
import { lagOppsett, opprettKjernesak, rydd, TESTBASE_URL, type Oppsett } from './testbase.ts';

const team = () => catendaId(randomUUID())!;

describe('kontraktsteamFra', () => {
  it('normaliserer team-ID-ene og gir hvert team sin side', () => {
    const [b, t] = [randomUUID(), randomUUID()];
    expect(kontraktsteamFra([b.toUpperCase()], [`{${t}}`])).toEqual([
      { team_id: catendaId(b), contract_role: 'BH' },
      { team_id: catendaId(t), contract_role: 'TE' },
    ]);
  });

  it('avviser en liste uten den ene siden', () => {
    expect(() => kontraktsteamFra([team()], [])).toThrow(Registreringsfeil);
    expect(() => kontraktsteamFra([], [team()])).toThrow(Registreringsfeil);
  });

  it('avviser samme team på begge sider og en ID som ikke er en Catenda-ID', () => {
    const t = team();
    expect(() => kontraktsteamFra([t], [t])).toThrow(/både BH og TE/);
    expect(() => kontraktsteamFra(['ikke-en-id'], [team()])).toThrow(/Catenda-ID/);
  });
});

describe.skipIf(!TESTBASE_URL)('registreringen mot SQL Server', () => {
  let o: Oppsett;
  let drift: { pool: Pool; slett(): Promise<void> };
  let iCatenda: Map<string, string>;
  let catendaKall: number;
  const linjer: string[] = [];

  beforeAll(async () => {
    o = await lagOppsett();
    drift = await opprettKjoeretid(o.datalag.base, { maks: 2, rolle: 'koe_driftsrolle' });
  }, 240_000);
  afterAll(async () => {
    await drift?.slett();
    if (o) await rydd(o);
  }, 60_000);

  function skript(...argv: string[]) {
    return kjoer(argv, {
      pool: async () => drift.pool,
      catenda: () => ({
        oauth: {
          samling: async () => {
            catendaKall++;
            return [...iCatenda].map(([id, name]) => ({ user: { id, type: 'team', name } }));
          },
        } as unknown as CatendaOAuth,
        token: async () => 'token',
      }),
      skriv: (linje) => linjer.push(linje),
    });
  }

  const teamArgumenter = (t: Kontraktsteam[]) =>
    t.flatMap((x) => [`--${x.contract_role.toLowerCase()}`, x.team_id]);

  async function nyttProsjekt(t: Kontraktsteam[]) {
    const prosjekt = `p-reg-${randomUUID().slice(0, 8)}`;
    const catendaProsjekt = randomUUID();
    iCatenda = new Map(t.map((x) => [x.team_id, 'Team']));
    await skript(
      'registrer',
      '--prosjekt',
      prosjekt,
      '--navn',
      'Registrert',
      '--organisasjon',
      'org-1',
      '--catenda-prosjekt',
      catendaProsjekt,
      '--bibliotek',
      randomUUID(),
      ...teamArgumenter(t)
    );
    return { prosjekt, catendaProsjekt };
  }

  async function prosjektrad(prosjekt: string) {
    const svar = await o.datalag.base.pool.request().input('p', prosjekt).query<{
      name: string;
      organisasjon_id: string;
      is_active: boolean;
    }>('SELECT name, organisasjon_id, is_active FROM koe.projects WHERE id = @p');
    return svar.recordset[0];
  }

  async function avvisning(lover: Promise<unknown>) {
    try {
      await lover;
    } catch (feil) {
      return feilnummer(feil) ?? (feil as Error).message;
    }
    throw new Error('Kallet ble ikke avvist');
  }

  it('driftsrollen har bare EXECUTE på de tre prosedyrene, og kjøretiden har ingen rett i koe_drift', async () => {
    const svar = await o.datalag.base.pool.request().query<{ rolle: string; rett: string }>(
      `SELECT USER_NAME(p.grantee_principal_id) AS rolle,
              CONCAT(p.permission_name, N' ', OBJECT_SCHEMA_NAME(p.major_id), N'.', OBJECT_NAME(p.major_id)) AS rett
         FROM sys.database_permissions p
        WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID(N'koe_driftsrolle')
           OR (p.class = 1 AND OBJECT_SCHEMA_NAME(p.major_id) = N'koe_drift')
           OR (p.class = 3 AND SCHEMA_NAME(p.major_id) = N'koe_drift')`
    );
    expect(svar.recordset.map((r) => `${r.rolle} ${r.rett}`).sort()).toEqual([
      'koe_driftsrolle EXECUTE koe_drift.kontraktsteam',
      'koe_driftsrolle EXECUTE koe_drift.registrer_prosjekt',
      'koe_driftsrolle EXECUTE koe_drift.sett_kontraktsteam',
    ]);
    // 229: EXECUTE er nektet.
    expect(
      await avvisning(
        o.datalag.kjoeretid.pool
          .request()
          .input('p', o.prosjekt.id)
          .execute('koe_drift.kontraktsteam')
      )
    ).toBe(229);
    expect(
      await avvisning(drift.pool.request().query('SELECT COUNT(*) FROM koe.catenda_contract_teams'))
    ).toBe(229);
  });

  it('registrer lager prosjektet, koblingen og kontraktsteamene', async () => {
    const t: Kontraktsteam[] = [
      { team_id: team(), contract_role: 'BH' },
      { team_id: team(), contract_role: 'TE' },
    ];
    const { prosjekt, catendaProsjekt } = await nyttProsjekt(t);
    expect(await prosjektrad(prosjekt)).toEqual({
      name: 'Registrert',
      organisasjon_id: 'org-1',
      is_active: true,
    });
    expect(await lesKontraktsteam(drift.pool, prosjekt)).toEqual({
      catendaProsjekt,
      aktiv: true,
      harSaker: false,
      team: t,
    });
  });

  it('en ny registrering endrer navnet, men ikke virksomheten', async () => {
    const { prosjekt, catendaProsjekt } = await nyttProsjekt([
      { team_id: team(), contract_role: 'BH' },
      { team_id: team(), contract_role: 'TE' },
    ]);
    await skript(
      'registrer',
      '--prosjekt',
      prosjekt,
      '--navn',
      'Nytt navn',
      '--organisasjon',
      'org-2',
      '--catenda-prosjekt',
      catendaProsjekt,
      '--bibliotek',
      randomUUID()
    );
    expect(await prosjektrad(prosjekt)).toMatchObject({
      name: 'Nytt navn',
      organisasjon_id: 'org-1',
    });
  });

  it('kontraktsteam med både prosjektargument og --prosjekt avvises, så et ekstra team-ID ikke blir prosjektet', async () => {
    const { prosjekt } = await nyttProsjekt([
      { team_id: team(), contract_role: 'BH' },
      { team_id: team(), contract_role: 'TE' },
    ]);
    expect(await avvisning(skript('kontraktsteam', '--prosjekt', prosjekt, team()))).toMatch(
      /oppgitt to ganger/
    );
  });

  it.each([
    ['samme Catenda-prosjekt beholder boardet, som koe_register_project', true],
    [
      'et nytt Catenda-prosjekt fjerner boardet, så en ny sak ikke får en topic i det gamle prosjektet',
      false,
    ],
  ])('en ny registrering uten --board og %s', async (_tilfelle, sammeProsjekt) => {
    const prosjekt = `p-reg-${randomUUID().slice(0, 8)}`;
    const catendaProsjekt = randomUUID();
    const board = randomUUID();
    const felles = ['--prosjekt', prosjekt, '--organisasjon', 'org-1', '--bibliotek', randomUUID()];
    await skript(
      'registrer',
      ...felles,
      '--catenda-prosjekt',
      catendaProsjekt,
      '--navn',
      'Med board',
      '--board',
      board
    );
    await skript(
      'registrer',
      ...felles,
      '--catenda-prosjekt',
      sammeProsjekt ? catendaProsjekt : randomUUID(),
      '--navn',
      'Uten board'
    );
    const svar = await o.datalag.base.pool.request().input('p', prosjekt).query<{
      board: string | null;
    }>('SELECT LOWER(CONVERT(nvarchar(36), topic_board_id)) AS board FROM koe.catenda_project_configs WHERE internal_project_id = @p');
    expect(svar.recordset[0]?.board).toBe(sammeProsjekt ? board : null);
  });

  it('et team som ikke finnes i Catenda-prosjektet, avvises før noe skrives', async () => {
    const prosjekt = `p-reg-${randomUUID().slice(0, 8)}`;
    iCatenda = new Map([[team(), 'Annet']]);
    catendaKall = 0;
    const feil = await avvisning(
      skript(
        'registrer',
        '--prosjekt',
        prosjekt,
        '--navn',
        'Avvist',
        '--organisasjon',
        'org-1',
        '--catenda-prosjekt',
        randomUUID(),
        '--bibliotek',
        randomUUID(),
        '--bh',
        team(),
        '--te',
        team()
      )
    );
    expect(feil).toMatch(/finnes ikke i Catenda-prosjektet/);
    expect(catendaKall).toBe(1);
    expect(await prosjektrad(prosjekt)).toBeUndefined();
  });

  it('uten saker erstatter listen kontraktsteamene, også når et team bytter side', async () => {
    const [bh, te] = [team(), team()];
    const { prosjekt } = await nyttProsjekt([
      { team_id: bh, contract_role: 'BH' },
      { team_id: te, contract_role: 'TE' },
    ]);
    const nye: Kontraktsteam[] = [
      { team_id: te, contract_role: 'BH' },
      { team_id: team(), contract_role: 'TE' },
    ];
    iCatenda = new Map(nye.map((x) => [x.team_id, 'Team']));
    await skript('kontraktsteam', prosjekt, ...teamArgumenter(nye));
    expect((await lesKontraktsteam(drift.pool, prosjekt))?.team).toEqual(nye);
  });

  describe('når prosjektet har saker', () => {
    const naa = (): Kontraktsteam[] => [
      { team_id: catendaId(o.prosjekt.bhTeam)!, contract_role: 'BH' },
      { team_id: catendaId(o.prosjekt.teTeam)!, contract_role: 'TE' },
    ];

    beforeAll(async () => {
      await opprettKjernesak(o);
    }, 60_000);

    async function sett(t: Kontraktsteam[]) {
      iCatenda = new Map(t.map((x) => [x.team_id, 'Team']));
      return skript('kontraktsteam', o.prosjekt.id, ...teamArgumenter(t));
    }

    it('skriptet ser at prosjektet har saker', async () => {
      expect(await lesKontraktsteam(drift.pool, o.prosjekt.id)).toMatchObject({
        harSaker: true,
        team: naa(),
      });
    });

    it('samme liste godtas, og et nytt team kan legges til på hver side', async () => {
      await sett(naa());
      const nye = [...naa(), { team_id: team(), contract_role: 'BH' as const }];
      await sett(nye);
      expect((await lesKontraktsteam(drift.pool, o.prosjekt.id))?.team).toHaveLength(3);
    });

    it('et team som flyttes til den andre siden, avvises med 52064, og teamene står', async () => {
      const foer = (await lesKontraktsteam(drift.pool, o.prosjekt.id))!.team;
      const flyttet = foer.map((t) =>
        t.team_id === catendaId(o.prosjekt.teTeam) ? { ...t, contract_role: 'BH' as const } : t
      );
      expect(await avvisning(sett([...flyttet, { team_id: team(), contract_role: 'TE' }]))).toBe(
        52064
      );
      expect((await lesKontraktsteam(drift.pool, o.prosjekt.id))!.team).toEqual(foer);
    });

    it('et team som fjernes, avvises med 52064, og teamene står', async () => {
      const foer = (await lesKontraktsteam(drift.pool, o.prosjekt.id))!.team;
      const uten = foer.filter((t) => t.team_id !== catendaId(o.prosjekt.bhTeam));
      expect(await avvisning(sett(uten))).toBe(52064);
      expect((await lesKontraktsteam(drift.pool, o.prosjekt.id))!.team).toEqual(foer);
    });
  });

  it('prosedyren avviser en liste uten begge sider, en dobbel oppføring og en ugyldig form', async () => {
    const kall = (t: string) =>
      drift.pool
        .request()
        .input('prosjekt', o.annetProsjekt.id)
        .input('team', t)
        .execute('koe_drift.sett_kontraktsteam');
    const t = team();
    expect(await avvisning(kall(JSON.stringify([{ team_id: t, contract_role: 'TE' }])))).toBe(
      52062
    );
    expect(
      await avvisning(
        kall(
          JSON.stringify([
            { team_id: t, contract_role: 'TE' },
            { team_id: t, contract_role: 'BH' },
          ])
        )
      )
    ).toBe(52061);
    for (const ugyldig of [
      '{}',
      JSON.stringify([{ team_id: t.toUpperCase(), contract_role: 'TE' }]),
      JSON.stringify([{ team_id: t, contract_role: 'te' }]),
      JSON.stringify([{ team_id: t, contract_role: 'TE' }, 'BH']),
    ])
      expect(await avvisning(kall(ugyldig))).toBe(52060);
  });

  it('kontraktsteam for et prosjekt uten kobling avvises', async () => {
    expect(await avvisning(skript('kontraktsteam', 'p-finnes-ikke'))).toMatch(/ingen kobling/);
    expect(
      await avvisning(
        drift.pool
          .request()
          .input('prosjekt', 'p-finnes-ikke')
          .input('team', JSON.stringify(naaFor()))
          .execute('koe_drift.sett_kontraktsteam')
      )
    ).toBe(52063);
  });
});

function naaFor(): Kontraktsteam[] {
  return [
    { team_id: team(), contract_role: 'BH' },
    { team_id: team(), contract_role: 'TE' },
  ];
}
