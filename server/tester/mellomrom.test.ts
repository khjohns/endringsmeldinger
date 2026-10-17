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
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  avvisningMedMelding,
  catendaBruker,
  type Foresp,
  iTransaksjon,
  opprettMigrertTestbase,
  type Rad,
  settInn,
} from './sqlserver_migrert.ts';
import { sql, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const CHECK_BRUDD = 547;
const IKKE_NORMALISERT = 52022;

const P1 = 'mellomrom-p1';
const team = () => randomBytes(16).toString('hex');
const TE1 = team();

/**
 * Katalogvakten (#608, #643). En tekstkolonne trenger kontrollen mot mellomrom
 * til slutt når den sammenliknes med `=`: i en indeksnøkkel, i en fremmednøkkel
 * (begge sider), i en kontroll som godtar en lukket mengde verdier, eller når
 * policyen eller en funksjon i `koe_sikkerhet` leser den
 * (`sys.sql_expression_dependencies`). Resten står i `OGSAA_KONTROLL`. Vakten
 * leser kolonnene og definisjonene i katalogen, ikke navnene på kontrollene.
 * Kontrollen må være på og betrodd, og definisjonen må være lik en av `MALER`,
 * slik basen normaliserer den.
 */
const TEKSTKOLONNER = `
SELECT OBJECT_SCHEMA_NAME(c.object_id) + N'.' + OBJECT_NAME(c.object_id) + N'.' + c.name AS kolonne,
       TYPE_NAME(c.system_type_id) AS type, c.max_length AS bytes,
       CAST(IIF(EXISTS (SELECT 1 FROM sys.index_columns ic
                         WHERE ic.object_id = c.object_id AND ic.column_id = c.column_id AND ic.key_ordinal > 0)
             OR EXISTS (SELECT 1 FROM sys.foreign_key_columns f
                         WHERE (f.parent_object_id = c.object_id AND f.parent_column_id = c.column_id)
                            OR (f.referenced_object_id = c.object_id AND f.referenced_column_id = c.column_id)),
                1, 0) AS bit) AS i_noekkel,
       CAST(IIF(EXISTS (SELECT 1 FROM sys.sql_expression_dependencies d
                         WHERE d.referenced_id = c.object_id AND d.referenced_minor_id = c.column_id
                           AND (OBJECT_SCHEMA_NAME(d.referencing_id) = N'koe_sikkerhet'
                                OR d.referencing_id IN (SELECT object_id FROM sys.security_policies))),
                1, 0) AS bit) AS i_sikkerhet
  FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
 WHERE t.is_ms_shipped = 0 AND TYPE_NAME(c.system_type_id) IN (N'nvarchar', N'nchar', N'varchar', N'char')`;
/**
 * `sys.sql_expression_dependencies` har kolonnen bare for en referanse med
 * `SCHEMABINDING`; ellers er `referenced_minor_id` 0, og kravet ville ikke blitt
 * utledet. Policyen binder predikatfunksjonene (`tilgang.test.ts`), så dette
 * gjelder de andre funksjonene i `koe_sikkerhet`.
 */
const UBUNDNE_SIKKERHETSFUNKSJONER = `
SELECT OBJECT_SCHEMA_NAME(m.object_id) + N'.' + OBJECT_NAME(m.object_id) AS funksjon
  FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id
 WHERE OBJECT_SCHEMA_NAME(m.object_id) = N'koe_sikkerhet' AND o.type IN ('FN', 'IF', 'TF')
   AND m.is_schema_bound = 0`;
const KONTROLLER = `
SELECT OBJECT_SCHEMA_NAME(parent_object_id) + N'.' + OBJECT_NAME(parent_object_id) AS tabell,
       COL_NAME(parent_object_id, parent_column_id) AS kolonne, name AS navn, definition AS definisjon,
       CAST(IIF(is_disabled = 0 AND is_not_trusted = 0, 1, 0) AS bit) AS ok
  FROM sys.check_constraints`;
const FREMMEDNOEKLER = `
SELECT OBJECT_SCHEMA_NAME(f.parent_object_id) + N'.' + OBJECT_NAME(f.parent_object_id) + N'.'
         + COL_NAME(fc.parent_object_id, fc.parent_column_id) AS fra,
       OBJECT_SCHEMA_NAME(f.referenced_object_id) + N'.' + OBJECT_NAME(f.referenced_object_id) + N'.'
         + COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS til,
       CAST(IIF(f.is_disabled = 0 AND f.is_not_trusted = 0, 1, 0) AS bit) AS ok
  FROM sys.foreign_keys f JOIN sys.foreign_key_columns fc ON fc.constraint_object_id = f.object_id`;

interface Katalog {
  kolonner: {
    kolonne: string;
    type: string;
    bytes: number;
    i_noekkel: boolean;
    i_sikkerhet: boolean;
  }[];
  kontroller: {
    tabell: string;
    kolonne: string | null;
    navn: string;
    definisjon: string;
    ok: boolean;
  }[];
  fremmednoekler: { fra: string; til: string; ok: boolean }[];
}

async function lesKatalog(base: Testbase): Promise<Katalog> {
  const les = async (s: string) => (await base.pool.request().query(s)).recordset;
  return {
    kolonner: await les(TEKSTKOLONNER),
    kontroller: await les(KONTROLLER),
    fremmednoekler: await les(FREMMEDNOEKLER),
  };
}

/**
 * Kolonnene utenfor det vakten utleder som #566 og #581 krever kontrollen for,
 * med grunnen. Listen er lukket: en linje for en kolonne vakten alt utleder,
 * gjør testen rød.
 */
const OGSAA_KONTROLL: Record<string, string> = {
  'koe.hendelse.event_type':
    'Hendelsestypen sammenliknes med = i koe_api.skriv_hendelse (20261016120000_kommandoer.sql) og i kjernen.',
  'koe.hendelse.refererer_til_event_id': 'Viser til en event_id og sammenliknes med den (#566).',
  'koe.notat.refererer_til_event_id': 'Viser til en event_id og sammenliknes med den (#566).',
  'koe.projects.organisasjon_id': 'Organisasjonen er en ID og sammenliknes med = (#581).',
  'koe.sak_metadata.sakstype':
    'Sakstypen velger regelsettet og sammenliknes med = (20261016230000_skranker.sql).',
};

/**
 * Hvorfor en kolonne med krav kan stå uten kontrollen. Hver grunn kontrolleres
 * mot katalogen:
 * - `verdiene_fyller_kolonnen`: kontrollen godtar bare verdier som fyller hele
 *   kolonnen, så det er ikke plass til mellomrom etter;
 * - `fremmednoekkel`: kolonnen peker på en kolonne med fast lengde og er ikke
 *   lengre enn den, så en verdi med mellomrom etter svarer ikke til noen rad;
 * - `fast_bredde`: `char` og `nchar` fylles ut med mellomrom, så verdien har
 *   bare én form.
 */
type Grunn =
  | { grunn: 'verdiene_fyller_kolonnen'; kontroll: string }
  | { grunn: 'fremmednoekkel'; til: string }
  | { grunn: 'fast_bredde' };

/**
 * Tekstkolonnene med krav uten kontrollen. Listen er lukket: en ny kolonne får
 * kontrollen eller en linje her, og en linje for en kolonne som har fått
 * kontrollen, gjør testen rød.
 */
const UTEN_KONTROLL: Record<string, Grunn> = {
  'koe.hendelse.aktor_rolle': { grunn: 'verdiene_fyller_kolonnen', kontroll: 'hendelse_rolle' },
  'koe.notat.aktor_rolle': { grunn: 'verdiene_fyller_kolonnen', kontroll: 'notat_rolle' },
  'koe.catenda_contract_teams.contract_role': {
    grunn: 'verdiene_fyller_kolonnen',
    kontroll: 'contract_teams_role',
  },
  'koe.hendelse.sak_id': { grunn: 'fremmednoekkel', til: 'koe.sak_metadata.sak_id' },
  'koe.notat.sak_id': { grunn: 'fremmednoekkel', til: 'koe.sak_metadata.sak_id' },
  'koe.kjernebuffer.sak_id': { grunn: 'fremmednoekkel', til: 'koe.sak_metadata.sak_id' },
  'koe.sak_catenda_topic.sak_id': { grunn: 'fremmednoekkel', til: 'koe.sak_metadata.sak_id' },
  'koe.leveringsoppdrag.sak_id': { grunn: 'fremmednoekkel', til: 'koe.hendelse.sak_id' },
  'koe.leveringsoppdrag.event_id': { grunn: 'fremmednoekkel', til: 'koe.hendelse.event_id' },
  'koe_migrering.historikk.versjon': { grunn: 'fast_bredde' },
};

/**
 * De normaliserte formene basen lager for kontrollen, med `{k}` for kolonnen og
 * `{n}` for en fast lengde i byte. Mengden er lukket: en annen form godtas ikke,
 * også når den er like streng.
 */
const MALER = [
  '(datalength([{k}])=datalength(rtrim([{k}])))',
  "(datalength([{k}])=({n}) AND NOT ([{k}]) collate Latin1_General_100_BIN2_UTF8 like N'%[^0-9a-f]%')",
  '(TRY_CAST([{k}] AS [uniqueidentifier]) IS NOT NULL AND datalength([{k}])=({n}) AND ([{k}]) collate Latin1_General_100_BIN2_UTF8=lower([{k}]))',
  '([{k}] IS NULL OR TRY_CAST([{k}] AS [uniqueidentifier]) IS NOT NULL AND datalength([{k}])=({n}) AND ([{k}]) collate Latin1_General_100_BIN2_UTF8=lower([{k}]))',
  // Den lukkede tegnklassen for hendelsestypen og sakstypen, og for dokumentnøkkelen (#609).
  "(NOT ([{k}]) collate Latin1_General_100_BIN2_UTF8 like N'%[^a-z_]%')",
  "(NOT ([{k}]) collate Latin1_General_100_BIN2_UTF8 like N'%[^-a-z0-9_]%')",
];

const iRegExp = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mellomromskontroll = (k: string) => MALER[0].replaceAll('{k}', k);

/** Malen definisjonen er lik for kolonnen `k`, med den faste lengden når malen har en. */
function form(k: string, definisjon: string): { lengde?: number } | undefined {
  for (const mal of MALER) {
    const moenster = mal
      .split(/(\{k\}|\{n\})/)
      .map((d) => (d === '{k}' ? iRegExp(k) : d === '{n}' ? '(\\d+)' : iRegExp(d)))
      .join('');
    const treff = new RegExp(`^${moenster}$`).exec(definisjon);
    if (treff) return treff[1] === undefined ? {} : { lengde: Number(treff[1]) };
  }
  return undefined;
}

/** Verdiene i en kontroll på formen `([k]=N'a' OR [k]='b' …)`, ellers `undefined`. */
function verdimengde(k: string, definisjon: string): string[] | undefined {
  const literal = "N?'((?:[^']|'')*)'";
  const ledd = `\\[${iRegExp(k)}\\]=${literal}`;
  if (!new RegExp(`^\\(${ledd}(?: OR ${ledd})*\\)$`).test(definisjon)) return undefined;
  return [...definisjon.matchAll(new RegExp(`=${literal}`, 'g'))].map((t) =>
    t[1].replaceAll("''", "'")
  );
}

function del(kolonne: string): [string, string] {
  const punkt = kolonne.lastIndexOf('.');
  return [kolonne.slice(0, punkt), kolonne.slice(punkt + 1)];
}

const kontrollerPaa = (k: Katalog, kolonne: string) =>
  k.kontroller.filter((c) => c.tabell === del(kolonne)[0]);

/** Kolonnene vakten selv utleder krav for, som `skjema.tabell.kolonne`. */
function utledet(k: Katalog): Set<string> {
  return new Set(
    k.kolonner
      .filter(
        (c) =>
          c.i_noekkel ||
          c.i_sikkerhet ||
          kontrollerPaa(k, c.kolonne).some((kt) => verdimengde(del(c.kolonne)[1], kt.definisjon))
      )
      .map((c) => c.kolonne)
  );
}

/** Kolonnene vakten krever kontrollen for, sortert. */
function kolonnerMedKrav(k: Katalog): string[] {
  return [...new Set([...utledet(k), ...Object.keys(OGSAA_KONTROLL)])].sort();
}

/** Malene som kolonnen har en kontroll for, på og betrodd. */
const former = (k: Katalog, kolonne: string) =>
  kontrollerPaa(k, kolonne)
    .filter((c) => c.ok)
    .map((c) => form(del(kolonne)[1], c.definisjon))
    .filter((f) => f !== undefined);

/** Kolonnene med krav som mangler en kontroll etter en av malene, på og betrodd. */
function utenKontroll(k: Katalog): string[] {
  return kolonnerMedKrav(k).filter((kolonne) => former(k, kolonne).length === 0);
}

/** Den faste lengden i byte på kolonnen: fra kontrollen, eller fra fremmednøkkelen den peker med. */
function fastLengde(k: Katalog, kolonne: string): number | undefined {
  const fra = former(k, kolonne).find((f) => f.lengde !== undefined)?.lengde;
  if (fra !== undefined) return fra;
  const bytes = k.kolonner.find((c) => c.kolonne === kolonne)?.bytes ?? -1;
  for (const f of k.fremmednoekler.filter((f) => f.fra === kolonne && f.ok)) {
    const lengde = fastLengde(k, f.til);
    if (lengde !== undefined && bytes > 0 && bytes <= lengde) return lengde;
  }
  return undefined;
}

/** Linjene i `grunner` der grunnen ikke holder i katalogen. */
function uholdbareGrunner(k: Katalog, grunner: Record<string, Grunn> = UTEN_KONTROLL): string[] {
  return Object.entries(grunner)
    .filter(([kolonne, g]) => {
      const c = k.kolonner.find((c) => c.kolonne === kolonne);
      if (!c) return true;
      if (g.grunn === 'fast_bredde') return c.type !== 'char' && c.type !== 'nchar';
      if (g.grunn === 'fremmednoekkel')
        return (
          !k.fremmednoekler.some((f) => f.fra === kolonne && f.til === g.til && f.ok) ||
          fastLengde(k, kolonne) === undefined
        );
      const kontroll = kontrollerPaa(k, kolonne).find((kt) => kt.navn === g.kontroll && kt.ok);
      const verdier = kontroll && verdimengde(del(kolonne)[1], kontroll.definisjon);
      const tegnbytes = c.type.startsWith('n') ? 2 : 1;
      return !verdier || verdier.some((v) => v.length * tegnbytes !== c.bytes);
    })
    .map(([kolonne]) => kolonne)
    .sort();
}

/** Kontrollene som heter `…_uten_mellomrom`, men ikke er den kontrollen på sin kolonne, på og betrodd. */
function uthulteKontroller(k: Katalog): string[] {
  return k.kontroller
    .filter((c) => c.navn.endsWith('_uten_mellomrom'))
    .filter((c) => !c.ok || !c.kolonne || c.definisjon !== mellomromskontroll(c.kolonne))
    .map((c) => c.navn)
    .sort();
}

describe('katalogvakten for mellomrom (#608, #643), på en katalog i minnet', () => {
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
  const kolonne = (
    kolonne: string,
    bytes: number,
    valg: { noekkel?: boolean; sikkerhet?: boolean } = {}
  ) => ({
    kolonne,
    type: 'nvarchar',
    bytes,
    i_noekkel: valg.noekkel ?? false,
    i_sikkerhet: valg.sikkerhet ?? false,
  });
  const katalog = (): Katalog => ({
    kolonner: [
      kolonne('koe.projects.id', 200, { noekkel: true }),
      kolonne('koe.projects.name', 400),
      kolonne('koe.notat.aktor_team_id', 64, { sikkerhet: true }),
      kolonne('koe.notat.refererer_til_event_id', 72),
      kolonne('koe.notat.aktor_rolle', 4, { sikkerhet: true }),
      kolonne('koe.sak_metadata.sak_id', 72, { noekkel: true }),
      kolonne('koe.notat.sak_id', 72, { noekkel: true }),
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
        '([refererer_til_event_id] IS NULL OR TRY_CAST([refererer_til_event_id] AS [uniqueidentifier]) IS NOT NULL AND datalength([refererer_til_event_id])=(72) AND ([refererer_til_event_id]) collate Latin1_General_100_BIN2_UTF8=lower([refererer_til_event_id]))'
      ),
      kontroll(
        'koe.notat',
        'aktor_rolle',
        "([aktor_rolle]=N'BH' OR [aktor_rolle]=N'TE')",
        'notat_rolle'
      ),
      kontroll(
        'koe.sak_metadata',
        'sak_id',
        '(TRY_CAST([sak_id] AS [uniqueidentifier]) IS NOT NULL AND datalength([sak_id])=(72) AND ([sak_id]) collate Latin1_General_100_BIN2_UTF8=lower([sak_id]))'
      ),
    ],
    fremmednoekler: [{ fra: 'koe.notat.sak_id', til: 'koe.sak_metadata.sak_id', ok: true }],
  });
  const grunner: Record<string, Grunn> = {
    'koe.notat.aktor_rolle': { grunn: 'verdiene_fyller_kolonnen', kontroll: 'notat_rolle' },
    'koe.notat.sak_id': { grunn: 'fremmednoekkel', til: 'koe.sak_metadata.sak_id' },
  };
  /** Avvikene blant kolonnene i katalogen i minnet; `OGSAA_KONTROLL` finnes bare i basen. */
  const krav = (k: Katalog) =>
    utenKontroll(k).filter((n) => k.kolonner.some((c) => c.kolonne === n) && !(n in grunner));

  it('kontrollsak: kolonnene med kontrollen etter en mal eller en grunn som holder, gir ingen avvik', () => {
    expect(krav(katalog())).toEqual([]);
    expect(uholdbareGrunner(katalog(), grunner)).toEqual([]);
    expect(uthulteKontroller(katalog())).toEqual([]);
  });

  it('en ny tabell med prosjekt_id i en nøkkel uten kontrollen gir avvik', () => {
    const k = katalog();
    k.kolonner.push(kolonne('koe.ny.prosjekt_id', 200, { noekkel: true }));
    expect(krav(k)).toEqual(['koe.ny.prosjekt_id']);
  });

  it('en kolonne koe_sikkerhet leser, uten kontrollen, gir avvik også når den ikke er i en nøkkel', () => {
    const k = katalog();
    k.kontroller = k.kontroller.filter((c) => c.kolonne !== 'aktor_team_id');
    expect(krav(k)).toEqual(['koe.notat.aktor_team_id']);
  });

  it.each([
    ['N foran verdiene', "([spor]=N'frist' OR [spor]=N'vederlag')"],
    ['verdiene uten N foran', "([spor]='frist' OR [spor]='vederlag')"],
    ['et escapet anførselstegn', "([spor]=N'frist' OR [spor]=N'a''b')"],
  ])('en kolonne med en lukket verdimengde (%s) uten kontrollen gir avvik', (_, definisjon) => {
    const k = katalog();
    k.kolonner.push(kolonne('koe.notat.spor', 40));
    k.kontroller.push(kontroll('koe.notat', 'spor', definisjon));
    expect(krav(k)).toEqual(['koe.notat.spor']);
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

  it.each([
    [
      'med OR',
      "(datalength([aktor_team_id])=(64) AND NOT ([aktor_team_id]) collate Latin1_General_100_BIN2_UTF8 like N'%[^0-9a-f]%' OR (1)=(1))",
    ],
    ['uten fast lengde', '(len([aktor_team_id])>(0))'],
    ['inne i NOT (…)', '(NOT (NOT (1)=(1) AND datalength([aktor_team_id])=(64) AND (1)=(1)))'],
    [
      'inne i NOT (…) med en parentes i en streng',
      "(NOT ([aktor_team_id] like N')' AND datalength([aktor_team_id])=(64) AND [aktor_team_id] like N'('))",
    ],
    [
      'i et CASE WHEN',
      '(case when (1)=(0) AND datalength([aktor_team_id])=(64) AND (1)=(0) then (0) else (1) end=(1))',
    ],
    [
      'for en annen kolonne',
      "(datalength([x])=(64) AND NOT ([x]) collate Latin1_General_100_BIN2_UTF8 like N'%[^0-9a-f]%')",
    ],
  ])('en definisjon utenfor malene, %s, godtas ikke', (_, definisjon) => {
    const k = katalog();
    k.kontroller[1].definisjon = definisjon;
    expect(krav(k)).toEqual(['koe.notat.aktor_team_id']);
  });

  it('verdiene_fyller_kolonnen holder ikke når kolonnen blir bredere enn verdiene', () => {
    const k = katalog();
    k.kolonner.find((c) => c.kolonne === 'koe.notat.aktor_rolle')!.bytes = 20;
    expect(uholdbareGrunner(k, grunner)).toEqual(['koe.notat.aktor_rolle']);
  });

  it('fremmednoekkel holder ikke når kolonnen blir lengre enn målet, eller nøkkelen slås av', () => {
    const bredere = katalog();
    bredere.kolonner.find((c) => c.kolonne === 'koe.notat.sak_id')!.bytes = 74;
    expect(uholdbareGrunner(bredere, grunner)).toEqual(['koe.notat.sak_id']);
    const avslaatt = katalog();
    avslaatt.fremmednoekler[0].ok = false;
    expect(uholdbareGrunner(avslaatt, grunner)).toEqual(['koe.notat.sak_id']);
  });

  it('fast_bredde holder ikke for nvarchar', () => {
    expect(uholdbareGrunner(katalog(), { 'koe.projects.name': { grunn: 'fast_bredde' } })).toEqual([
      'koe.projects.name',
    ]);
  });
});

/** Fila fra repoets rot. */
const lesFil = (sti: string) => readFileSync(new URL(`../../${sti}`, import.meta.url), 'utf8');

/** `navn` i hver `[[hendelse]]` i et register i `docs/datamodell/`. */
function hendelsesnavn(sti: string): string[] {
  return lesFil(sti)
    .split(/^\[\[/m)
    .filter((blokk) => blokk.startsWith('hendelse]]'))
    .map((blokk) => /^navn = "([^"]*)"$/m.exec(blokk)?.[1] ?? `${sti}: blokk uten navn`);
}

/** Verdiene i `class SaksType(str, Enum)` i Python. */
function pythonsSakstyper(): string[] {
  const klasse = /^class SaksType\(str, Enum\):\n([\s\S]*?)\n(?=\S)/m.exec(
    lesFil('backend/models/sak_state.py')
  );
  return [...(klasse?.[1] ?? '').matchAll(/^ {4}[A-Z_]+ = "([^"]*)"$/gm)].map((t) => t[1]);
}

/**
 * De kjente verdiene for kolonnene med den lukkede tegnklassen (#609): Pythons 34
 * hendelsestyper (`hendelser.toml`, som pytest holder lik `EventType`), kjernens
 * typer (`kjernehendelser.toml`, som `register.test.ts` holder lik kjernen) og
 * sakstypene i Python og kjernen.
 */
const KJENTE_VERDIER: Record<string, string[]> = {
  'koe.hendelse.event_type': [
    ...hendelsesnavn('docs/datamodell/hendelser.toml'),
    ...hendelsesnavn('docs/datamodell/kjernehendelser.toml'),
  ],
  'koe.sak_metadata.sakstype': [
    ...pythonsSakstyper(),
    /sakstype: \{ const: '([^']*)' \}/.exec(lesFil('kjerne/format/format.ts'))?.[1] ?? 'mangler',
  ],
};

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
        'sak_metadata_sakstype_form',
      ],
      ['hendelse', 'prosjekt_id', { prosjekt_id: `${P1} ` }, 'hendelse_prosjekt_id_uten_mellomrom'],
      ['hendelse', 'event_type', { event_type: 'sak_opprettet ' }, 'hendelse_event_type_form'],
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
        'leveringsoppdrag_dokumentnoekkel_form',
      ],
      [
        'kjernebuffer',
        'prosjekt_id',
        { prosjekt_id: `${P1} ` },
        'kjernebuffer_prosjekt_id_uten_mellomrom',
      ],
    ])('%s.%s avviser mellomrom til slutt (547)', async (tabell, _, rad, begrensning) => {
      const feil = await avvisningMedMelding(lagreSak({ tabell, rad }));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain(begrensning);
    });

    it.each(
      ['\t', '\u00a0', '\u3000', '\u200b', 'A'].flatMap(
        (tegn) =>
          [
            [
              'sak_metadata',
              { sakstype: `endringsforespoersel${tegn}` },
              'sak_metadata_sakstype_form',
            ],
            ['hendelse', { event_type: `sak_opprettet${tegn}` }, 'hendelse_event_type_form'],
            [
              'leveringsoppdrag',
              { dokumentnoekkel: `nokkel${tegn}` },
              'leveringsoppdrag_dokumentnoekkel_form',
            ],
          ] as [string, Rad, string][]
      )
    )(
      '%s avviser et tegn utenfor tegnklassen (547, #609): %o',
      async (tabell, rad, begrensning) => {
        const feil = await avvisningMedMelding(lagreSak({ tabell, rad }));
        expect(feil?.nummer).toBe(CHECK_BRUDD);
        expect(feil?.melding).toContain(begrensning);
      }
    );

    it.each<[string, () => string]>([
      ['med store bokstaver', () => randomUUID().toUpperCase()],
      ['med mellomrom til slutt', () => `${randomUUID().slice(0, 35)} `],
      ['uten bindestreker', () => randomUUID().replaceAll('-', '')],
      ['som ikke er en UUID', () => 'sak-1'],
    ])('sak_metadata.sak_id avviser en ID %s (DL-U6)', async (_, sakId) => {
      const feil = await avvisningMedMelding(
        lagreSak({ tabell: 'sak_metadata', rad: { sak_id: sakId() } })
      );
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('sak_metadata_sak_id_form');
    });

    it.each<[string, string, string]>([
      ['hendelse', 'med store bokstaver', randomUUID().toUpperCase()],
      ['hendelse', 'med mellomrom til slutt', `${randomUUID().slice(0, 35)} `],
      ['notat', 'med store bokstaver', randomUUID().toUpperCase()],
      ['notat', 'med mellomrom til slutt', `${randomUUID().slice(0, 35)} `],
    ])('%s.refererer_til_event_id avviser en ID %s', async (tabell, _, verdi) => {
      const feil = await avvisningMedMelding(
        lagreSak({ tabell, rad: { refererer_til_event_id: verdi } })
      );
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
      const feil = await avvisningMedMelding(nyttProsjekt(`mp-${randomUUID()} `));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('projects_id_uten_mellomrom');
    });

    it('projects.organisasjon_id avviser mellomrom til slutt (547)', async () => {
      const feil = await avvisningMedMelding(nyttProsjekt(`mp-${randomUUID()}`, 'org '));
      expect(feil?.nummer).toBe(CHECK_BRUDD);
      expect(feil?.melding).toContain('projects_organisasjon_id_uten_mellomrom');
    });

    it.each<[string, string, string]>([
      ['project_id', `${P1} `, 'member'],
      ['role', P1, 'member '],
    ])(
      'app_project_memberships.%s avviser mellomrom til slutt (547)',
      async (kolonne, p, rolle) => {
        const feil = await avvisningMedMelding(
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
      const feil = await avvisningMedMelding(
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
        const feil = await avvisningMedMelding(identitet(p, i, s));
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
        const feil = await avvisningMedMelding(resolve(...med(s)));
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
    expect(uholdbareGrunner(k), 'grunnen i UTEN_KONTROLL holder ikke i katalogen').toEqual([]);
    expect(
      Object.keys(OGSAA_KONTROLL).filter((kolonne) => utledet(k).has(kolonne)),
      'vakten utleder kravet selv; linjen i OGSAA_KONTROLL skal ut'
    ).toEqual([]);
    expect(uthulteKontroller(k)).toEqual([]);
  });

  it('kontrollsak: hver kjent hendelsestype og sakstype passer kontrollene på kolonnen i katalogen (#609)', async () => {
    expect(KJENTE_VERDIER['koe.hendelse.event_type'].length).toBe(34 + 2);
    expect(KJENTE_VERDIER['koe.sak_metadata.sakstype']).toEqual([
      'standard',
      'forsering',
      'endringsordre',
      'standard',
    ]);
    const kontroller = (await base.pool.request().query(KONTROLLER)).recordset;
    for (const [kolonne, verdier] of Object.entries(KJENTE_VERDIER)) {
      const [tabell, navn] = del(kolonne);
      const egne = kontroller.filter((r) => r.tabell === tabell && r.kolonne === navn);
      expect(egne.length, `${kolonne} har ingen kontroll`).toBeGreaterThan(0);
      const vilkaar = egne
        .map((r) => (r.definisjon as string).replaceAll(`[${navn}]`, '[v]'))
        .join(' AND ');
      const avvist = await base.pool
        .request()
        .input('verdier', sql.NVarChar(sql.MAX), JSON.stringify(verdier))
        .query(
          `SELECT v FROM OPENJSON(@verdier) WITH (v nvarchar(4000) '$') WHERE NOT (${vilkaar})`
        );
      expect(
        avvist.recordset.map((r) => r.v),
        `${kolonne}: verdien avvises av ${vilkaar}`
      ).toEqual([]);
    }
  });

  it('katalogvakten: hver funksjon i koe_sikkerhet har SCHEMABINDING, så kolonnene den leser, utledes', async () => {
    const ubundne = (await base.pool.request().query(UBUNDNE_SIKKERHETSFUNKSJONER)).recordset;
    expect(
      ubundne.map((r) => r.funksjon),
      'funksjonen i koe_sikkerhet er uten SCHEMABINDING, så kolonnene den leser, står ikke i sys.sql_expression_dependencies'
    ).toEqual([]);
  });
});
