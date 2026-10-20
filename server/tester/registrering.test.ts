/**
 * Driftsskriptet for registreringen (F-1, #820) mot en migrert base, med en
 * innlogging som bare har `koe_driftsrolle`. Forventningene har kilde i svarene
 * 18.10: registreringen er et driftsskript mot prosedyrer bare driften kan kjøre
 * (#820), og kontraktsteamene kan bare få nye team når prosjektet har saker
 * (#764, «Runde 8: avgjort 18.10»). Kravet om begge sider følger
 * `koe_set_contract_teams`, og kravet om at et team bare står på én side, følger
 * primærnøkkelen på `catenda_contract_teams`, begge i `supabase/migrations/` (RV-07).
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

describe('argumentene til kontraktsteam, før basen og Catenda brukes', () => {
  const skript = (...argv: string[]) =>
    kjoer(argv, {
      pool: () => Promise.reject(new Error('basen ble brukt')),
      catenda: () => {
        throw new Error('Catenda ble brukt');
      },
      skriv: () => {},
    });

  it('både prosjektargument og --prosjekt avvises, så et ekstra team-ID ikke blir prosjektet', async () => {
    await expect(skript('kontraktsteam', '--prosjekt', 'p-1', team())).rejects.toThrow(
      /oppgitt to ganger/
    );
  });

  it('flere team etter én --bh blir team, ikke prosjektet (#836)', async () => {
    await expect(
      skript('kontraktsteam', '--bh', team(), team(), '--te', team(), '--en-totalentreprenoer')
    ).rejects.toThrow(/Prosjektet må oppgis/);
  });

  it('teamene avvises uten bekreftelsen av én totalentreprenør, før basen brukes (DL-U14)', async () => {
    await expect(skript('kontraktsteam', 'p-1', '--bh', team(), '--te', team())).rejects.toThrow(
      /--en-totalentreprenoer/
    );
    await expect(skript('kontraktsteam', 'p-1', '--en-totalentreprenoer')).rejects.toThrow(
      /bare sammen med --bh og --te/
    );
  });

  it.each([
    ['--board'],
    ['--navn'],
    ['--organisasjon'],
    ['--mappe'],
    ['--beskrivelse'],
    ['--catenda-prosjekt'],
    ['--bibliotek'],
  ])(
    'flagget %s gjelder bare registrer og avvises (#836, listen utledet av flaggene i #868)',
    async (flagg) => {
      await expect(skript('kontraktsteam', 'p-1', flagg, 'x')).rejects.toThrow(
        new RegExp(`${flagg} gjelder bare «registrer»`)
      );
    }
  );
});

describe.skipIf(!TESTBASE_URL)('registreringen mot SQL Server', () => {
  let o: Oppsett;
  let drift: { pool: Pool; slett(): Promise<void> };
  let iCatenda: Map<string, string>;
  /** Catenda-prosjektet til hvert board, begge i `catendaId()`-formen. */
  const boardProsjekt = new Map<string, string>();
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
          boardetsProsjekt: async (board: string) => {
            catendaKall++;
            return boardProsjekt.get(catendaId(board)!) ?? null;
          },
        } as unknown as CatendaOAuth,
        token: async () => 'token',
      }),
      skriv: (linje) => linjer.push(linje),
    });
  }

  const teamArgumenter = (t: Kontraktsteam[]) => [
    ...t.flatMap((x) => [`--${x.contract_role.toLowerCase()}`, x.team_id]),
    ...(t.length ? ['--en-totalentreprenoer'] : []),
  ];

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

  it('driftsrollen har bare EXECUTE på de ti prosedyrene, og kjøretiden har ingen rett i koe_drift', async () => {
    const svar = await o.datalag.base.pool.request().query<{ rolle: string; rett: string }>(
      `SELECT USER_NAME(p.grantee_principal_id) AS rolle,
              CONCAT(p.permission_name, N' ', OBJECT_SCHEMA_NAME(p.major_id), N'.', OBJECT_NAME(p.major_id)) AS rett
         FROM sys.database_permissions p
        WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID(N'koe_driftsrolle')
           OR (p.class = 1 AND OBJECT_SCHEMA_NAME(p.major_id) = N'koe_drift')
           OR (p.class = 3 AND SCHEMA_NAME(p.major_id) = N'koe_drift')`
    );
    expect(svar.recordset.map((r) => `${r.rolle} ${r.rett}`).sort()).toEqual([
      'koe_driftsrolle EXECUTE koe_drift.fjern_rolle',
      'koe_driftsrolle EXECUTE koe_drift.fjern_stillingstittel',
      'koe_driftsrolle EXECUTE koe_drift.koble_catenda_identitet',
      'koe_driftsrolle EXECUTE koe_drift.kontraktsteam',
      'koe_driftsrolle EXECUTE koe_drift.kontroller_bytte',
      'koe_driftsrolle EXECUTE koe_drift.registrer_entra_identitet',
      'koe_driftsrolle EXECUTE koe_drift.registrer_prosjekt',
      'koe_driftsrolle EXECUTE koe_drift.sett_kontraktsteam',
      'koe_driftsrolle EXECUTE koe_drift.sett_rolle',
      'koe_driftsrolle EXECUTE koe_drift.sett_stillingstittel',
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

  it('en ny registrering endrer navnet, men ikke virksomheten, og sier det (#836)', async () => {
    const { prosjekt, catendaProsjekt } = await nyttProsjekt([
      { team_id: team(), contract_role: 'BH' },
      { team_id: team(), contract_role: 'TE' },
    ]);
    linjer.length = 0;
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
    expect(linjer).toContain(
      'Virksomheten er uendret: org-1. En ny registrering endrer den ikke (KR-01).'
    );
  });

  async function bibliotek(prosjekt: string): Promise<string | undefined> {
    const svar = await o.datalag.base.pool
      .request()
      .input('p', prosjekt)
      .query<{ bibliotek: string }>(
        `SELECT LOWER(CONVERT(nvarchar(36), library_id)) AS bibliotek
           FROM koe.catenda_project_configs WHERE internal_project_id = @p`
      );
    return svar.recordset[0]?.bibliotek;
  }

  async function kobling(prosjekt: string) {
    const svar = await o.datalag.base.pool
      .request()
      .input('p', prosjekt)
      .query<{
        catenda: string;
        mappe: string | null;
        board: string | null;
      }>(
        `SELECT LOWER(CONVERT(nvarchar(36), catenda_project_id)) AS catenda,
              LOWER(CONVERT(nvarchar(36), folder_id)) AS mappe,
              LOWER(CONVERT(nvarchar(36), topic_board_id)) AS board
         FROM koe.catenda_project_configs WHERE internal_project_id = @p`
      );
    return svar.recordset[0];
  }

  /** Registrerer prosjektet med mappe og board, og så på nytt uten dem. */
  async function registrerPaaNytt(
    sammeProsjekt: boolean,
    nyeTeam: Kontraktsteam[] | null,
    nyttBibliotek = false
  ) {
    const t = naaFor();
    const { prosjekt, catendaProsjekt } = await nyttProsjekt(t);
    const [mappe, board, bibliotek] = [randomUUID(), randomUUID(), randomUUID()];
    boardProsjekt.set(catendaId(board)!, catendaId(catendaProsjekt)!);
    const felles = ['--prosjekt', prosjekt, '--organisasjon', 'org-1'];
    await skript(
      'registrer',
      ...felles,
      '--bibliotek',
      bibliotek,
      '--catenda-prosjekt',
      catendaProsjekt,
      '--navn',
      'Med board',
      '--mappe',
      mappe,
      '--board',
      board
    );
    const nyttCatenda = sammeProsjekt ? catendaProsjekt : randomUUID();
    if (nyeTeam) iCatenda = new Map(nyeTeam.map((x) => [x.team_id, 'Team']));
    linjer.length = 0;
    const kall = skript(
      'registrer',
      ...felles,
      '--bibliotek',
      nyttBibliotek ? randomUUID() : bibliotek,
      '--catenda-prosjekt',
      nyttCatenda,
      '--navn',
      'Uten board',
      ...teamArgumenter(nyeTeam ?? [])
    );
    return { prosjekt, catendaProsjekt, nyttCatenda, mappe, board, gamleTeam: t, kall };
  }

  it('samme Catenda-prosjekt beholder mappen og boardet uten --mappe og --board (#836, svaret 18.10 i #764)', async () => {
    const r = await registrerPaaNytt(true, null);
    await r.kall;
    expect(await kobling(r.prosjekt)).toEqual({
      catenda: r.catendaProsjekt,
      mappe: r.mappe,
      board: r.board,
    });
    expect((await lesKontraktsteam(drift.pool, r.prosjekt))?.team).toEqual(r.gamleTeam);
    expect(linjer.join('\n')).not.toMatch(/board/);
  });

  it('et nytt bibliotek i samme Catenda-prosjekt fjerner mappen, beholder boardet og sier det (#836, svaret 18.10 i #764; mappen hører til biblioteket)', async () => {
    const r = await registrerPaaNytt(true, null, true);
    await r.kall;
    expect(await kobling(r.prosjekt)).toEqual({
      catenda: r.catendaProsjekt,
      mappe: null,
      board: r.board,
    });
    expect(linjer).toContain(
      'Prosjektet har ingen mappe: dokumentene lastes opp i roten av biblioteket.'
    );
  });

  it('et nytt Catenda-prosjekt uten saker fjerner mappen og boardet, erstatter teamene og varsler om boardet (#836)', async () => {
    const nye = naaFor();
    const r = await registrerPaaNytt(false, nye);
    await r.kall;
    expect(await kobling(r.prosjekt)).toEqual({ catenda: r.nyttCatenda, mappe: null, board: null });
    expect((await lesKontraktsteam(drift.pool, r.prosjekt))?.team).toEqual(nye);
    expect(linjer).toContain(
      'Prosjektet har ikke noe board: nye saker avvises (51412) til det registreres med --board.'
    );
  });

  it('et nytt Catenda-prosjekt uten --bh og --te avvises med 52067, og koblingen og teamene står (#836)', async () => {
    const r = await registrerPaaNytt(false, null);
    expect(await avvisning(r.kall)).toBe(52067);
    expect(await kobling(r.prosjekt)).toEqual({
      catenda: r.catendaProsjekt,
      mappe: r.mappe,
      board: r.board,
    });
    expect((await lesKontraktsteam(drift.pool, r.prosjekt))?.team).toEqual(r.gamleTeam);
    expect(await prosjektrad(r.prosjekt)).toMatchObject({ name: 'Med board' });
  });

  it('et prosjekt uten kobling regnes som et bytte og krever --bh og --te (52067), og ingenting skrives (#844)', async () => {
    const { prosjekt } = await nyttProsjekt(naaFor());
    await o.datalag.base.pool
      .request()
      .input('p', prosjekt)
      .query('DELETE koe.catenda_project_configs WHERE internal_project_id = @p');
    const kall = skript(
      'registrer',
      '--prosjekt',
      prosjekt,
      '--navn',
      'Uten kobling',
      '--organisasjon',
      'org-1',
      '--catenda-prosjekt',
      randomUUID(),
      '--bibliotek',
      randomUUID()
    );
    expect(await avvisning(kall)).toBe(52067);
    expect(await prosjektrad(prosjekt)).not.toMatchObject({ name: 'Uten kobling' });
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
        team(),
        '--en-totalentreprenoer'
      )
    );
    expect(feil).toMatch(/finnes ikke i Catenda-prosjektet/);
    expect(catendaKall).toBe(1);
    expect(await prosjektrad(prosjekt)).toBeUndefined();
  });

  it('et board som ikke hører til Catenda-prosjektet, avvises før noe skrives (#836 punkt 2)', async () => {
    const prosjekt = `p-reg-${randomUUID().slice(0, 8)}`;
    const t = naaFor();
    iCatenda = new Map(t.map((x) => [x.team_id, 'Team']));
    const catendaProsjekt = randomUUID();
    // Boardet finnes, men i et annet Catenda-prosjekt.
    const board = randomUUID();
    boardProsjekt.set(catendaId(board)!, catendaId(randomUUID())!);
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
        catendaProsjekt,
        '--bibliotek',
        randomUUID(),
        '--board',
        board,
        ...teamArgumenter(t)
      )
    );
    expect(feil).toMatch(/Boardet finnes ikke i Catenda-prosjektet/);
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

  it('kontraktsteam med flere team etter én --bh lagrer alle (#836, som nargs i catenda_admin.py)', async () => {
    const { prosjekt } = await nyttProsjekt(naaFor());
    const [b1, b2, t1] = [team(), team(), team()];
    iCatenda = new Map([b1, b2, t1].map((x) => [x, 'Team']));
    await skript('kontraktsteam', prosjekt, '--bh', b1, b2, '--te', t1, '--en-totalentreprenoer');
    expect((await lesKontraktsteam(drift.pool, prosjekt))?.team).toEqual(
      [
        { team_id: b1, contract_role: 'BH' },
        { team_id: b2, contract_role: 'BH' },
        { team_id: t1, contract_role: 'TE' },
      ].sort(
        (x, y) =>
          x.contract_role.localeCompare(y.contract_role) || x.team_id.localeCompare(y.team_id)
      )
    );
  });

  it('en inaktiv kobling avvises før Catenda-kallet, og visningen sier at den er inaktiv (#836)', async () => {
    const { prosjekt } = await nyttProsjekt(naaFor());
    await o.datalag.base.pool
      .request()
      .input('p', prosjekt)
      .query('UPDATE koe.catenda_project_configs SET is_active = 0 WHERE internal_project_id = @p');
    catendaKall = 0;
    expect(await avvisning(skript('kontraktsteam', prosjekt, ...teamArgumenter(naaFor())))).toMatch(
      /Koblingen til Catenda er inaktiv/
    );
    expect(catendaKall).toBe(0);
    linjer.length = 0;
    await skript('kontraktsteam', prosjekt);
    expect(linjer).toContain('Koblingen til Catenda er inaktiv.');
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

    it('bytte av Catenda-prosjekt avvises før Catenda-kallet, også med nye team (#836, svaret 18.10 i #764; #868 punkt 2)', async () => {
      const foer = await kobling(o.prosjekt.id);
      const teamFoer = (await lesKontraktsteam(drift.pool, o.prosjekt.id))!.team;
      const nye = naaFor();
      iCatenda = new Map(nye.map((x) => [x.team_id, 'Team']));
      catendaKall = 0;
      linjer.length = 0;
      const kall = skript(
        'registrer',
        '--prosjekt',
        o.prosjekt.id,
        '--navn',
        'Byttet',
        '--organisasjon',
        'org-1',
        '--catenda-prosjekt',
        randomUUID(),
        '--bibliotek',
        randomUUID(),
        ...teamArgumenter(nye)
      );
      expect(await avvisning(kall)).toMatch(
        /har saker: Catenda-prosjektet kan ikke byttes \(52066\)/
      );
      expect(catendaKall).toBe(0);
      expect(linjer).toEqual([]);
      expect(await kobling(o.prosjekt.id)).toEqual(foer);
      expect((await lesKontraktsteam(drift.pool, o.prosjekt.id))!.team).toEqual(teamFoer);
    });

    it('prosedyren avviser bytte av Catenda-prosjekt med 52066 også uten skriptets kontroll (#836)', async () => {
      const foer = await kobling(o.prosjekt.id);
      const kall = drift.pool
        .request()
        .input('prosjekt', o.prosjekt.id)
        .input('navn', 'Byttet')
        .input('beskrivelse', null)
        .input('organisasjon', 'org-1')
        .input('catenda_prosjekt', randomUUID())
        .input('bibliotek', randomUUID())
        .input('mappe', null)
        .input('board', null)
        .input('team', JSON.stringify(naaFor()))
        .execute('koe_drift.registrer_prosjekt');
      expect(await avvisning(kall)).toBe(52066);
      expect(await kobling(o.prosjekt.id)).toEqual(foer);
    });

    it('bytte av bibliotek avvises før Catenda-kallet når prosjektet har saker (#868 punkt 3, svar 4 19.10 i #764)', async () => {
      const foer = await kobling(o.prosjekt.id);
      const bibliotekFoer = await bibliotek(o.prosjekt.id);
      catendaKall = 0;
      linjer.length = 0;
      const kall = skript(
        'registrer',
        '--prosjekt',
        o.prosjekt.id,
        '--navn',
        'Byttet',
        '--organisasjon',
        'org-1',
        '--catenda-prosjekt',
        foer.catenda!,
        '--bibliotek',
        randomUUID()
      );
      expect(await avvisning(kall)).toMatch(
        /har saker: Catenda-biblioteket kan ikke byttes \(52066\)/
      );
      expect(catendaKall).toBe(0);
      expect(linjer).toEqual([]);
      expect(await kobling(o.prosjekt.id)).toEqual(foer);
      expect(await bibliotek(o.prosjekt.id)).toBe(bibliotekFoer);
    });

    it('prosedyren avviser bytte av bibliotek med 52066 også uten skriptets kontroll (#868 punkt 3)', async () => {
      const foer = await kobling(o.prosjekt.id);
      const bibliotekFoer = await bibliotek(o.prosjekt.id);
      const kall = drift.pool
        .request()
        .input('prosjekt', o.prosjekt.id)
        .input('navn', 'Byttet')
        .input('beskrivelse', null)
        .input('organisasjon', 'org-1')
        .input('catenda_prosjekt', foer.catenda)
        .input('bibliotek', randomUUID())
        .input('mappe', null)
        .input('board', null)
        .input('team', null)
        .execute('koe_drift.registrer_prosjekt');
      expect(await avvisning(kall)).toBe(52066);
      expect(await kobling(o.prosjekt.id)).toEqual(foer);
      expect(await bibliotek(o.prosjekt.id)).toBe(bibliotekFoer);
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
