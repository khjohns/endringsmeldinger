/**
 * Mellomrom til slutt i nøkler og ID-er (#566, #581), i en base bygget fra
 * `database/migrasjoner/`. `=`, `IN`, `UNIQUE` og fremmednøkler i SQL Server ser
 * bort fra mellomrom til slutt, så `p1 ` ville truffet `p1` og blitt lagret som
 * en andre verdiform. Kilden er sikkerhetsinvariantene i AGENTS.md (én verdiform
 * i journalen, ingen andre form for prosjektet) og DL-U6 (saksnummeret er en
 * tilfeldig ID appen lager). Predikatene prøves i `tilgang.test.ts`. Krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  catendaBruker,
  type Foresp,
  iTransaksjon,
  opprettMigrertTestbase,
  type Rad,
  settInn,
} from './sqlserver_migrert.ts';
import { feilnummer, sql, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const CHECK_BRUDD = 547;
const IKKE_NORMALISERT = 52022;

const P1 = 'mellomrom-p1';
const team = () => randomBytes(16).toString('hex');
const TE1 = team();

/** Feilen fra basen med nummeret og meldingen, eller `undefined` når setningen gikk gjennom. */
async function avvisning(p: Promise<unknown>) {
  try {
    await p;
    return undefined;
  } catch (feil) {
    return { nummer: feilnummer(feil), melding: (feil as Error).message };
  }
}

/**
 * Katalogvakten (#608). En tekstkolonne i en indeksnøkkel, en fremmednøkkel
 * (begge sider) eller et argument til et predikat i radsikkerheten sammenliknes
 * med `=`, så den trenger kontrollen mot mellomrom til slutt. Vakten leser
 * kolonnene og definisjonene i katalogen, ikke navnene på kontrollene. Kontrollen
 * godtas i to former, på- og betrodd:
 * - `DATALENGTH(kol) = DATALENGTH(RTRIM(kol))`, slik `20261016130000_mellomrom.sql`
 *   skriver den;
 * - en fast form: et ledd `DATALENGTH(kol) = n` på toppnivået i en ren
 *   `AND`-kjede uten `CASE`, eventuelt etter `kol IS NULL OR`. To verdier som bare skiller seg i mellomrom til slutt,
 *   har ulik `DATALENGTH`, så bare én av dem passer.
 */
const TEKST_I_NOEKKEL = `
SELECT OBJECT_SCHEMA_NAME(c.object_id) + N'.' + OBJECT_NAME(c.object_id) AS tabell, c.name AS kolonne,
       CAST(IIF(EXISTS (SELECT 1 FROM sys.index_columns ic
                         WHERE ic.object_id = c.object_id AND ic.column_id = c.column_id AND ic.key_ordinal > 0)
             OR EXISTS (SELECT 1 FROM sys.foreign_key_columns f
                         WHERE (f.parent_object_id = c.object_id AND f.parent_column_id = c.column_id)
                            OR (f.referenced_object_id = c.object_id AND f.referenced_column_id = c.column_id)),
                1, 0) AS bit) AS i_noekkel
  FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
 WHERE t.is_ms_shipped = 0 AND TYPE_NAME(c.system_type_id) IN (N'nvarchar', N'nchar', N'varchar', N'char')`;
const PREDIKATER = `
SELECT OBJECT_SCHEMA_NAME(target_object_id) + N'.' + OBJECT_NAME(target_object_id) AS tabell,
       predicate_definition AS definisjon
  FROM sys.security_predicates`;
const KONTROLLER = `
SELECT OBJECT_SCHEMA_NAME(parent_object_id) + N'.' + OBJECT_NAME(parent_object_id) AS tabell,
       COL_NAME(parent_object_id, parent_column_id) AS kolonne, name AS navn, definition AS definisjon,
       CAST(IIF(is_disabled = 0 AND is_not_trusted = 0, 1, 0) AS bit) AS ok
  FROM sys.check_constraints`;

interface Katalog {
  kolonner: { tabell: string; kolonne: string; i_noekkel: boolean }[];
  predikater: { tabell: string; definisjon: string }[];
  kontroller: {
    tabell: string;
    kolonne: string | null;
    navn: string;
    definisjon: string;
    ok: boolean;
  }[];
}

async function lesKatalog(base: Testbase): Promise<Katalog> {
  const les = async (s: string) => (await base.pool.request().query(s)).recordset;
  return {
    kolonner: await les(TEKST_I_NOEKKEL),
    predikater: await les(PREDIKATER),
    kontroller: await les(KONTROLLER),
  };
}

/**
 * Kolonnene utenfor nøklene som #566 og #581 krever kontrollen for: verdier en
 * regel eller et predikat sammenlikner med `=` eller `IN`.
 */
const OGSAA_KONTROLL = [
  'koe.app_project_memberships.role',
  'koe.hendelse.event_type',
  'koe.hendelse.refererer_til_event_id',
  'koe.notat.refererer_til_event_id',
  'koe.notat.spor',
  'koe.projects.organisasjon_id',
  'koe.sak_metadata.sakstype',
];

/**
 * Tekstkolonnene i en nøkkel uten kontrollen, med begrunnelsen. Listen er
 * lukket: en ny kolonne får kontrollen eller en linje her, og en linje for en
 * kolonne som har fått kontrollen, gjør testen rød.
 */
const UTEN_KONTROLL: Record<string, string> = {
  'koe.hendelse.aktor_rolle':
    'nvarchar(2), og hendelse_rolle godtar bare BH og TE, så det er ikke plass til mellomrom etter (20261016130000_mellomrom.sql).',
  'koe.notat.aktor_rolle':
    'nvarchar(2), og notat_rolle godtar bare BH og TE, så det er ikke plass til mellomrom etter (20261016130000_mellomrom.sql).',
  'koe.hendelse.sak_id':
    'nvarchar(36) med fremmednøkkel til sak_metadata.sak_id, som har fast form på 36 tegn (20261016130000_mellomrom.sql).',
  'koe.notat.sak_id':
    'nvarchar(36) med fremmednøkkel til sak_metadata.sak_id, som har fast form på 36 tegn (20261016130000_mellomrom.sql).',
  'koe.kjernebuffer.sak_id':
    'nvarchar(36) med fremmednøkkel til sak_metadata.sak_id, som har fast form på 36 tegn (20261016130000_mellomrom.sql).',
  'koe.leveringsoppdrag.sak_id':
    'nvarchar(36) med fremmednøkkel til hendelse.sak_id, som igjen peker på sak_metadata.sak_id med fast form på 36 tegn.',
  'koe.leveringsoppdrag.event_id':
    'nvarchar(36) med fremmednøkkel til hendelse.event_id, som har fast form på 36 tegn (hendelse_event_id_form).',
  'koe_migrering.historikk.versjon':
    'Runnerens bokføring, ikke en migrasjon (server/migrering.ts). char(14) fylles ut med mellomrom, så verdien har bare én form.',
};

const mellomromskontroll = (k: string) => `(datalength([${k}])=datalength(rtrim([${k}])))`;

function fastForm(k: string, definisjon: string): boolean {
  if (!definisjon.startsWith('(') || !definisjon.endsWith(')')) return false;
  let kjede = definisjon.slice(1, -1);
  if (kjede.startsWith(`[${k}] IS NULL OR `)) kjede = kjede.slice(`[${k}] IS NULL OR `.length);
  if (/ OR |\bcase\b/i.test(kjede)) return false;
  const lengde = new RegExp(`^datalength\\(\\[${k}\\]\\)=\\(\\d+\\)$`);
  return leddPaaToppnivaa(kjede).some((ledd) => lengde.test(ledd));
}

/**
 * Leddene i `kjede` delt på ` AND ` utenfor parenteser, strenger og navn i
 * `[ ]`, så et ledd inne i `NOT (…)` ikke teller. `CASE` avvises før dette.
 */
function leddPaaToppnivaa(kjede: string): string[] {
  const ledd: string[] = [];
  let dybde = 0;
  let start = 0;
  for (let i = 0; i < kjede.length; i++) {
    const tegn = kjede[i];
    if (tegn === "'" || tegn === '[') {
      const slutt = tegn === "'" ? "'" : ']';
      i = kjede.indexOf(slutt, i + 1);
      if (i < 0) return [];
    } else if (tegn === '(') dybde++;
    else if (tegn === ')') dybde--;
    else if (dybde === 0 && kjede.startsWith(' AND ', i)) {
      ledd.push(kjede.slice(start, i));
      start = i + ' AND '.length;
      i += ' AND '.length - 1;
    }
  }
  ledd.push(kjede.slice(start));
  return ledd;
}

/** Kolonnene vakten krever kontrollen for, som `skjema.tabell.kolonne`, sortert. */
function kolonnerMedKrav(k: Katalog): string[] {
  const tekst = new Set(k.kolonner.map((c) => `${c.tabell}.${c.kolonne}`));
  const krav = new Set(
    k.kolonner.filter((c) => c.i_noekkel).map((c) => `${c.tabell}.${c.kolonne}`)
  );
  for (const p of k.predikater)
    for (const [, navn] of p.definisjon.matchAll(/\[([^\]]+)\](?![.(])/g))
      if (tekst.has(`${p.tabell}.${navn}`)) krav.add(`${p.tabell}.${navn}`);
  for (const kolonne of OGSAA_KONTROLL) krav.add(kolonne);
  return [...krav].sort();
}

/** Kolonnene med krav som mangler en godtatt kontroll som er på og betrodd. */
function utenKontroll(k: Katalog): string[] {
  return kolonnerMedKrav(k).filter((navn) => {
    const punkt = navn.lastIndexOf('.');
    const [tabell, kolonne] = [navn.slice(0, punkt), navn.slice(punkt + 1)];
    return !k.kontroller.some(
      (c) =>
        c.tabell === tabell &&
        c.ok &&
        (c.definisjon === mellomromskontroll(kolonne) || fastForm(kolonne, c.definisjon))
    );
  });
}

/** Kontrollene som heter `…_uten_mellomrom`, men ikke er den kontrollen på sin kolonne, på og betrodd. */
function uthulteKontroller(k: Katalog): string[] {
  return k.kontroller
    .filter((c) => c.navn.endsWith('_uten_mellomrom'))
    .filter((c) => !c.ok || !c.kolonne || c.definisjon !== mellomromskontroll(c.kolonne))
    .map((c) => c.navn)
    .sort();
}

describe('katalogvakten for mellomrom (#608), på en katalog i minnet', () => {
  const kontroll = (
    tabell: string,
    kolonne: string,
    definisjon: string,
    navn = `${kolonne}_k`
  ) => ({
    tabell,
    kolonne,
    navn,
    definisjon,
    ok: true,
  });
  const katalog = (): Katalog => ({
    kolonner: [
      { tabell: 'koe.projects', kolonne: 'id', i_noekkel: true },
      { tabell: 'koe.projects', kolonne: 'name', i_noekkel: false },
      { tabell: 'koe.notat', kolonne: 'aktor_team_id', i_noekkel: false },
      { tabell: 'koe.notat', kolonne: 'refererer_til_event_id', i_noekkel: false },
    ],
    predikater: [
      { tabell: 'koe.notat', definisjon: '([koe_sikkerhet].[notat_synlig]([aktor_team_id]))' },
    ],
    kontroller: [
      kontroll('koe.projects', 'id', mellomromskontroll('id'), 'projects_id_uten_mellomrom'),
      kontroll(
        'koe.notat',
        'aktor_team_id',
        "(datalength([aktor_team_id])=(64) AND NOT ([aktor_team_id]) collate Latin1_General_100_BIN2_UTF8 like N'%[^0-9a-f]%')"
      ),
      kontroll(
        'koe.notat',
        'refererer_til_event_id',
        '([refererer_til_event_id] IS NULL OR TRY_CAST([refererer_til_event_id] AS [uniqueidentifier]) IS NOT NULL AND datalength([refererer_til_event_id])=(72))'
      ),
    ],
  });
  /** Avvikene blant kolonnene i katalogen i minnet; `OGSAA_KONTROLL` finnes bare i basen. */
  const krav = (k: Katalog) =>
    utenKontroll(k).filter((n) => k.kolonner.some((c) => `${c.tabell}.${c.kolonne}` === n));

  it('kontrollsak: kolonnene med kontrollen eller en fast form gir ingen avvik', () => {
    expect(krav(katalog())).toEqual([]);
    expect(uthulteKontroller(katalog())).toEqual([]);
  });

  it('en ny tabell med prosjekt_id i en nøkkel uten kontrollen gir avvik', () => {
    const k = katalog();
    k.kolonner.push({ tabell: 'koe.ny', kolonne: 'prosjekt_id', i_noekkel: true });
    expect(krav(k)).toEqual(['koe.ny.prosjekt_id']);
  });

  it('et predikatargument uten kontrollen gir avvik, også når kolonnen ikke er i en nøkkel', () => {
    const k = katalog();
    k.kontroller = k.kontroller.filter((c) => c.kolonne !== 'aktor_team_id');
    expect(krav(k)).toEqual(['koe.notat.aktor_team_id']);
  });

  it('en kontroll med riktig navn og innholdet byttet til 1=1 gir avvik', () => {
    const k = katalog();
    k.kontroller[0].definisjon = '((1)=(1))';
    expect(krav(k)).toEqual(['koe.projects.id']);
    expect(uthulteKontroller(k)).toEqual(['projects_id_uten_mellomrom']);
  });

  it('en kontroll som er slått av eller ikke betrodd, gir avvik', () => {
    const k = katalog();
    k.kontroller[0].ok = false;
    expect(krav(k)).toEqual(['koe.projects.id']);
    expect(uthulteKontroller(k)).toEqual(['projects_id_uten_mellomrom']);
  });

  it('en fast form med OR eller uten fast lengde godtas ikke', () => {
    const k = katalog();
    k.kontroller[1].definisjon = '(datalength([aktor_team_id])=(64) OR (1)=(1))';
    k.kontroller[2].definisjon =
      '([refererer_til_event_id] IS NULL OR len([refererer_til_event_id])>(0))';
    expect(krav(k)).toEqual(['koe.notat.aktor_team_id', 'koe.notat.refererer_til_event_id']);
  });

  it.each([
    ['inne i NOT (…)', '(NOT (NOT (1)=(1) AND datalength([aktor_team_id])=(64) AND (1)=(1)))'],
    [
      'inne i NOT (…) med en parentes i en streng',
      "(NOT ([aktor_team_id] like N')' AND datalength([aktor_team_id])=(64) AND [aktor_team_id] like N'('))",
    ],
    [
      'inne i NOT (…) med en parentes i et navn',
      '(NOT ([x)y]=(1) AND datalength([aktor_team_id])=(64) AND [p(q]=(1)))',
    ],
    [
      'i et CASE WHEN',
      '(case when (1)=(0) AND datalength([aktor_team_id])=(64) AND (1)=(0) then (0) else (1) end=(1))',
    ],
  ])('en fast lengde %s godtas ikke', (_, definisjon) => {
    const k = katalog();
    k.kontroller[1].definisjon = definisjon;
    expect(krav(k)).toEqual(['koe.notat.aktor_team_id']);
  });
});

describe.skipIf(!SQLSERVER_TILKOBLING)('mellomrom til slutt i SQL Server', () => {
  let base: Testbase;
  let bruker: string;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('mellomrom', { maks: 8 });
    bruker = await catendaBruker(base.pool);
    await base.pool
      .request()
      .input('p', sql.NVarChar(100), P1)
      .input('u', sql.UniqueIdentifier, bruker)
      .input('s', sql.NVarChar(32), team())
      .input('t', sql.NVarChar(32), TE1).batch(`
        INSERT koe.projects (id, name, organisasjon_id, is_active) VALUES (@p, N'P1', N'org', 1);
        INSERT koe.app_project_memberships
          (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
        VALUES (@p, @u, @s, N'', N'', N'member', 0, 1);
        INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES (@p, @t, N'TE');`);
  }, 240_000);
  afterAll(async () => {
    await base?.slett();
  }, 60_000);

  /** Én transaksjon som eieren, med konteksten til TE1 i P1 satt først. */
  function iKontekst<T>(arbeid: (r: Foresp) => Promise<T>) {
    return iTransaksjon(base.pool, { aktor: bruker, prosjekt: P1, side: 'TE', team: TE1 }, arbeid);
  }

  type Overstyring = { tabell: string; rad: Rad };

  /**
   * Saken, det første brevet, oppdraget, bufferen og et notat i én transaksjon,
   * med én kolonne i én tabell overstyrt.
   */
  function lagreSak(o?: Overstyring) {
    const med = (tabell: string, rad: Rad) => (o?.tabell === tabell ? { ...rad, ...o.rad } : rad);
    const sakId = randomUUID();
    const eventId = randomUUID();
    return iKontekst(async (r) => {
      const s = med('sak_metadata', {
        sak_id: sakId,
        prosjekt_id: P1,
        sakstype: 'endringsforespoersel',
        created_by: bruker,
      });
      await settInn(r, 'sak_metadata', s);
      await settInn(
        r,
        'hendelse',
        med('hendelse', {
          event_id: eventId,
          sak_id: s.sak_id,
          prosjekt_id: P1,
          event_type: 'sak_opprettet',
          versjon: 1,
          tidsstempel: new Date(),
          aktor_id: bruker,
          aktor_rolle: 'TE',
          aktor_team_id: TE1,
          refererer_til_event_id: null,
          format: 1,
          data: '{}',
          transaksjon: { sql: 'CURRENT_TRANSACTION_ID()' },
          skriving: { sql: "TRY_CAST(SESSION_CONTEXT(N'koe_skriving') AS uniqueidentifier)" },
        })
      );
      await settInn(
        r,
        'leveringsoppdrag',
        med('leveringsoppdrag', {
          id: randomUUID(),
          prosjekt_id: P1,
          sak_id: s.sak_id,
          event_id: eventId,
          dokumentnoekkel: eventId,
          innhold: '{}',
          innhold_sha256: 'a'.repeat(64),
        })
      );
      await settInn(
        r,
        'kjernebuffer',
        med('kjernebuffer', {
          sak_id: s.sak_id,
          prosjekt_id: P1,
          visning: '{}',
          projeksjonsversjon: 1,
          regelversjon: 1,
          leserformat: 1,
          saksversjon: 1,
        })
      );
      await settInn(
        r,
        'notat',
        med('notat', {
          notat_id: randomUUID(),
          sak_id: s.sak_id,
          prosjekt_id: P1,
          aktor_id: bruker,
          aktor_rolle: 'TE',
          aktor_team_id: TE1,
          tekst: 'Internt notat',
          spor: 'frist',
          refererer_til_event_id: eventId,
        })
      );
    });
  }

  describe('sakstabellene', () => {
    it('kontrollsak: saken, brevet, oppdraget, bufferen og notatet lagres i den eksakte formen', async () => {
      await lagreSak();
    });

    it.each<[string, string, Rad, string]>([
      [
        'sak_metadata',
        'prosjekt_id',
        { prosjekt_id: `${P1} ` },
        'sak_metadata_prosjekt_id_uten_mellomrom',
      ],
      [
        'sak_metadata',
        'sakstype',
        { sakstype: 'endringsforespoersel ' },
        'sak_metadata_sakstype_uten_mellomrom',
      ],
      ['hendelse', 'prosjekt_id', { prosjekt_id: `${P1} ` }, 'hendelse_prosjekt_id_uten_mellomrom'],
      [
        'hendelse',
        'event_type',
        { event_type: 'sak_opprettet ' },
        'hendelse_event_type_uten_mellomrom',
      ],
      ['notat', 'prosjekt_id', { prosjekt_id: `${P1} ` }, 'notat_prosjekt_id_uten_mellomrom'],
      ['notat', 'spor', { spor: 'frist ' }, 'notat_spor_uten_mellomrom'],
      [
        'leveringsoppdrag',
        'prosjekt_id',
        { prosjekt_id: `${P1} ` },
        'leveringsoppdrag_prosjekt_id_uten_mellomrom',
      ],
      [
        'leveringsoppdrag',
        'dokumentnoekkel',
        { dokumentnoekkel: 'nokkel ' },
        'leveringsoppdrag_dokumentnoekkel_uten_mellomrom',
      ],
      [
        'kjernebuffer',
        'prosjekt_id',
        { prosjekt_id: `${P1} ` },
        'kjernebuffer_prosjekt_id_uten_mellomrom',
      ],
    ])('%s.%s avviser mellomrom til slutt (547)', async (tabell, _, rad, begrensning) => {
      const feil = await avvisning(lagreSak({ tabell, rad }));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain(begrensning);
    });

    it.each<[string, () => string]>([
      ['med store bokstaver', () => randomUUID().toUpperCase()],
      ['med mellomrom til slutt', () => `${randomUUID().slice(0, 35)} `],
      ['uten bindestreker', () => randomUUID().replaceAll('-', '')],
      ['som ikke er en UUID', () => 'sak-1'],
    ])('sak_metadata.sak_id avviser en ID %s (DL-U6)', async (_, sakId) => {
      const feil = await avvisning(lagreSak({ tabell: 'sak_metadata', rad: { sak_id: sakId() } }));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('sak_metadata_sak_id_form');
    });

    it.each<[string, string, string]>([
      ['hendelse', 'med store bokstaver', randomUUID().toUpperCase()],
      ['hendelse', 'med mellomrom til slutt', `${randomUUID().slice(0, 35)} `],
      ['notat', 'med store bokstaver', randomUUID().toUpperCase()],
      ['notat', 'med mellomrom til slutt', `${randomUUID().slice(0, 35)} `],
    ])('%s.refererer_til_event_id avviser en ID %s', async (tabell, _, verdi) => {
      const feil = await avvisning(lagreSak({ tabell, rad: { refererer_til_event_id: verdi } }));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain(`${tabell}_refererer_til_event_id_form`);
    });
  });

  describe('identiteten og prosjektene', () => {
    async function nyttProsjekt(id: string, organisasjon = 'org') {
      return base.pool
        .request()
        .input('id', sql.NVarChar(100), id)
        .input('org', sql.NVarChar(100), organisasjon)
        .query(
          `INSERT koe.projects (id, name, organisasjon_id, is_active) VALUES (@id, N'P', @org, 1)`
        );
    }

    it('kontrollsak: et prosjekt, et medlemskap og et kontraktsteam lagres i den eksakte formen', async () => {
      const p = `mp-${randomUUID()}`;
      await nyttProsjekt(p);
      await base.pool
        .request()
        .input('p', sql.NVarChar(100), p)
        .input('u', sql.UniqueIdentifier, await catendaBruker(base.pool))
        .input('s', sql.NVarChar(32), team())
        .input('t', sql.NVarChar(32), team()).query(`
          INSERT koe.app_project_memberships
            (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
          VALUES (@p, @u, @s, N'', N'', N'member', 0, 1);
          INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES (@p, @t, N'TE');`);
    });

    it('projects.id avviser mellomrom til slutt (547)', async () => {
      const feil = await avvisning(nyttProsjekt(`mp-${randomUUID()} `));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('projects_id_uten_mellomrom');
    });

    it('projects.organisasjon_id avviser mellomrom til slutt (547)', async () => {
      const feil = await avvisning(nyttProsjekt(`mp-${randomUUID()}`, 'org '));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('projects_organisasjon_id_uten_mellomrom');
    });

    it.each<[string, string, string]>([
      ['project_id', `${P1} `, 'member'],
      ['role', P1, 'member '],
    ])(
      'app_project_memberships.%s avviser mellomrom til slutt (547)',
      async (kolonne, p, rolle) => {
        const feil = await avvisning(
          base.pool
            .request()
            .input('p', sql.NVarChar(100), p)
            .input('u', sql.UniqueIdentifier, await catendaBruker(base.pool))
            .input('s', sql.NVarChar(32), team())
            .input('r', sql.NVarChar(10), rolle).query(`
            INSERT koe.app_project_memberships
              (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
            VALUES (@p, @u, @s, N'', N'', @r, 0, 1);`)
        );
        expect(feil?.nummer).toBe(CHECK_BRUDD);
        expect(feil?.melding).toContain(`memberships_${kolonne}_uten_mellomrom`);
      }
    );

    it('catenda_contract_teams.internal_project_id avviser mellomrom til slutt (547)', async () => {
      const feil = await avvisning(
        base.pool
          .request()
          .input('p', sql.NVarChar(100), `${P1} `)
          .input('t', sql.NVarChar(32), team())
          .query(
            `INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES (@p, @t, N'TE')`
          )
      );
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('contract_teams_internal_project_id_uten_mellomrom');
    });

    function identitet(provider: string, issuer: string, subject: string) {
      return base.pool
        .request()
        .input('u', sql.UniqueIdentifier, bruker)
        .input('provider', sql.NVarChar(16), provider)
        .input('issuer', sql.NVarChar(400), issuer)
        .input('subject', sql.NVarChar(400), subject)
        .query(
          `INSERT koe.app_identities (id, user_id, provider, issuer, subject)
           VALUES (NEWID(), @u, @provider, @issuer, @subject)`
        );
    }

    it('kontrollsak: tabellen godtar en Entra-identitet i den eksakte formen', async () => {
      await identitet('entra', 'https://login.example/tenant', randomUUID());
    });

    it.each<[string, string, string, string]>([
      ['provider', 'entra ', 'https://login.example/tenant', randomUUID()],
      ['issuer', 'entra', 'https://login.example/tenant ', randomUUID()],
      ['subject', 'entra', 'https://login.example/tenant', `${randomUUID()} `],
    ])(
      'app_identities.%s avviser mellomrom til slutt, også fra eieren (547)',
      async (kolonne, p, i, s) => {
        const feil = await avvisning(identitet(p, i, s));
        expect(feil?.nummer).toBe(CHECK_BRUDD);
        expect(feil?.melding).toContain(`app_identities_${kolonne}_uten_mellomrom`);
      }
    );

    function resolve(provider: string, issuer: string, subject: string) {
      return base.pool
        .request()
        .input('provider', sql.NVarChar(16), provider)
        .input('issuer', sql.NVarChar(400), issuer)
        .input('subject', sql.NVarChar(400), subject)
        .input('email', sql.NVarChar(320), '')
        .input('name', sql.NVarChar(400), '')
        .output('user_id', sql.UniqueIdentifier)
        .execute('koe.resolve_identity');
    }

    it.each<[string, (s: string) => [string, string, string]]>([
      ['provideren', (s) => ['entra ', 'https://login.example/tenant', s]],
      ['issueren', (s) => ['entra', 'https://login.example/tenant ', s]],
      ['subjektet', (s) => ['entra', 'https://login.example/tenant', `${s} `]],
    ])(
      'koe.resolve_identity avviser mellomrom etter %s og gir ikke brukeren til den eksakte formen',
      async (_, med) => {
        const s = randomUUID();
        const eksakt = await resolve('entra', 'https://login.example/tenant', s);
        expect(eksakt.output.user_id).toBeTruthy();
        const feil = await avvisning(resolve(...med(s)));
        expect(feil?.nummer).toBe(IKKE_NORMALISERT);
      }
    );
  });

  it('katalogvakten: hver tekstkolonne i en nøkkel, en fremmednøkkel eller et predikat har kontrollen', async () => {
    const k = await lesKatalog(base);
    expect(k.kolonner.length).toBeGreaterThan(0);
    expect(utenKontroll(k), 'kolonnen mangler kontrollen eller en linje i UTEN_KONTROLL').toEqual(
      Object.keys(UTEN_KONTROLL).sort()
    );
    expect(uthulteKontroller(k)).toEqual([]);
  });
});
