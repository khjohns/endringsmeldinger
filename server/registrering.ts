/**
 * Driftsskriptet for prosjektregistreringen, kontraktsteamene og partsnavnene (F-1, #820),
 * etter `register` og `contract-teams` i `backend/scripts/catenda_admin.py`.
 * Registreringen er ingen inngang i appen; skriptet kjører prosedyrene i
 * `koe_drift`, som bare `koe_driftsrolle` kan kjøre
 * (`database/migrasjoner/20261019140000_registrering.sql`; `registrer_prosjekt` er
 * sist definert i `20261020122000_registrering_bibliotek.sql`).
 *
 *   KOE_DRIFT_TILKOBLING=… node server/registrering.ts registrer \
 *     --prosjekt oslobygg --navn "Oslobygg" --organisasjon org-1 \
 *     --catenda-prosjekt <uuid> --bibliotek <uuid> [--mappe <uuid>] [--board <uuid>] \
 *     [--beskrivelse …] [--bh <team> … --te <team> … --en-totalentreprenoer]
 *   KOE_DRIFT_TILKOBLING=… node server/registrering.ts kontraktsteam oslobygg \
 *     [--bh … --te … --en-totalentreprenoer]
 *   KOE_DRIFT_TILKOBLING=… node server/registrering.ts kontraktsparter oslobygg \
 *     [--byggherre "…" --totalentreprenoer "…"]
 *
 * `KOE_DRIFT_TILKOBLING` er tilkoblingsstrengen for en bruker med
 * `koe_driftsrolle`. Med `--bh` og `--te` kontrolleres teamene mot Catenda-
 * prosjektet med integrasjonens token (`catendaFraMiljoe`), som i Python, og med
 * `--board` boardet (#836).
 * Uten dem viser `kontraktsteam` teamene som står. Som i Python kan én `--bh` eller
 * `--te` ha flere team (`--bh a b`). Med `--en-totalentreprenoer` bekrefter drift at
 * alle TE-teamene hører til samme totalentreprenør, og uten den avvises teamene (DL-U14).
 * `kontraktsparter` setter navnene på byggherren og totalentreprenøren, begge sammen,
 * og viser dem uten flaggene (#1398).
 */

import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { catendaId, uuidMedBindestreker } from './autorisasjon.ts';
import { catendaFraMiljoe, type CatendaOAuth } from './catenda.ts';
import { opprettPool, sql, utenKontekst, type Pool } from './datalag.ts';
import type { Part } from '../kjerne/typer.ts';

export interface Kontraktsteam {
  team_id: string;
  contract_role: Part;
}

export interface Registrering {
  prosjekt: string;
  navn: string;
  beskrivelse: string | null;
  organisasjon: string;
  catendaProsjekt: string;
  bibliotek: string;
  mappe: string | null;
  board: string | null;
  team: Kontraktsteam[] | null;
}

export class Registreringsfeil extends Error {}

function uuid(verdi: string, navn: string): string {
  const id = uuidMedBindestreker(verdi);
  if (!id) throw new Registreringsfeil(`${navn} er ikke en UUID: ${verdi}`);
  return id;
}

/**
 * Teamene fra `--bh` og `--te` i `catenda_id()`-formen. Begge sider må ha minst
 * ett team, og samme team kan ikke stå på begge sider, som i Python.
 */
export function kontraktsteamFra(bh: string[], te: string[]): Kontraktsteam[] {
  if (!bh.length || !te.length)
    throw new Registreringsfeil('Både --bh og --te må oppgis for å sette kontraktsteamene.');
  const team: Kontraktsteam[] = [];
  for (const [side, ider] of [
    ['BH', bh],
    ['TE', te],
  ] as const)
    for (const verdi of ider) {
      const id = catendaId(verdi);
      if (!id) throw new Registreringsfeil(`Team-ID-en er ikke en Catenda-ID: ${verdi}`);
      const fra = team.find((t) => t.team_id === id);
      if (fra && fra.contract_role !== side)
        throw new Registreringsfeil(`Teamet ${id} kan ikke stå på både BH og TE.`);
      if (!fra) team.push({ team_id: id, contract_role: side });
    }
  return team;
}

/** Teamene i Catenda-prosjektet, med navnet. Prosjektet og teamene er i `catenda_id()`-formen. */
async function catendaTeam(
  oauth: CatendaOAuth,
  token: string,
  catendaProsjekt: string
): Promise<Map<string, string>> {
  const team = new Map<string, string>();
  for (const rad of await oauth.samling(`/v2/projects/${catendaProsjekt}/teams`, token)) {
    const bruker = rad.user as { id?: unknown; type?: unknown; name?: unknown } | undefined;
    const teamId = bruker?.type === 'team' ? catendaId(bruker.id) : null;
    if (teamId) team.set(teamId, typeof bruker?.name === 'string' ? bruker.name : '');
  }
  return team;
}

interface Registrert {
  nytt: boolean;
  organisasjon_id: string;
  mappe: string | null;
  board: string | null;
}

async function registrer(pool: Pool, r: Registrering): Promise<Registrert> {
  const svar = await utenKontekst(pool)
    .input('prosjekt', sql.NVarChar(4000), r.prosjekt)
    .input('navn', sql.NVarChar(4000), r.navn)
    .input('beskrivelse', sql.NVarChar(sql.MAX), r.beskrivelse)
    .input('organisasjon', sql.NVarChar(4000), r.organisasjon)
    .input('catenda_prosjekt', sql.UniqueIdentifier, r.catendaProsjekt)
    .input('bibliotek', sql.UniqueIdentifier, r.bibliotek)
    .input('mappe', sql.UniqueIdentifier, r.mappe)
    .input('board', sql.UniqueIdentifier, r.board)
    .input('team', sql.NVarChar(sql.MAX), r.team && JSON.stringify(r.team))
    .execute<Registrert>('koe_drift.registrer_prosjekt');
  return svar.recordset[0]!;
}

/**
 * Avviser et bytte av Catenda-prosjekt eller bibliotek i et prosjekt med saker, med
 * vilkåret og meldingen fra `koe_drift.kontroller_bytte`, som `registrer_prosjekt`
 * også kaller (#879 punkt 5).
 */
async function kontrollerBytte(pool: Pool, r: Registrering): Promise<void> {
  try {
    await utenKontekst(pool)
      .input('prosjekt', sql.NVarChar(4000), r.prosjekt)
      .input('catenda_prosjekt', sql.UniqueIdentifier, r.catendaProsjekt)
      .input('bibliotek', sql.UniqueIdentifier, r.bibliotek)
      .execute('koe_drift.kontroller_bytte');
  } catch (feil) {
    const { number, message } = feil as { number?: unknown; message?: unknown };
    if (number === 52066)
      throw new Registreringsfeil(`${String(message)} (52066).`, {
        cause: feil,
      });
    throw feil;
  }
}

async function settKontraktsteam(
  pool: Pool,
  prosjekt: string,
  team: Kontraktsteam[]
): Promise<void> {
  await utenKontekst(pool)
    .input('prosjekt', sql.NVarChar(4000), prosjekt)
    .input('team', sql.NVarChar(sql.MAX), JSON.stringify(team))
    .execute('koe_drift.sett_kontraktsteam');
}

export interface Kontraktsparter {
  byggherre_navn: string;
  totalentreprenor_navn: string;
}

/** Navnene på partene, eller `null` når de ikke er satt. */
export async function lesKontraktsparter(
  pool: Pool,
  prosjekt: string
): Promise<Kontraktsparter | null> {
  const svar = await utenKontekst(pool)
    .input('prosjekt', sql.NVarChar(4000), prosjekt)
    .execute<Kontraktsparter>('koe_drift.kontraktsparter');
  return svar.recordset[0] ?? null;
}

async function settKontraktsparter(
  pool: Pool,
  prosjekt: string,
  parter: Kontraktsparter
): Promise<void> {
  try {
    await utenKontekst(pool)
      .input('prosjekt', sql.NVarChar(4000), prosjekt)
      .input('byggherre', sql.NVarChar(4000), parter.byggherre_navn)
      .input('totalentreprenor', sql.NVarChar(4000), parter.totalentreprenor_navn)
      .execute('koe_drift.sett_kontraktsparter');
  } catch (feil) {
    const { number, message } = feil as { number?: unknown; message?: unknown };
    if (number === 52065 || number === 52073)
      throw new Registreringsfeil(`${String(message)} (${number}).`, { cause: feil });
    throw feil;
  }
}

export interface Prosjektteam {
  catendaProsjekt: string;
  aktiv: boolean;
  harSaker: boolean;
  team: Kontraktsteam[];
}

/** Koblingen og kontraktsteamene, eller `null` når prosjektet ikke er koblet. */
export async function lesKontraktsteam(pool: Pool, prosjekt: string): Promise<Prosjektteam | null> {
  const svar = await utenKontekst(pool)
    .input('prosjekt', sql.NVarChar(4000), prosjekt)
    .execute('koe_drift.kontraktsteam');
  const [kobling, team] = svar.recordsets as unknown as [
    { catenda_project_id: string; is_active: boolean; har_saker: boolean }[],
    Kontraktsteam[],
  ];
  if (!kobling[0]) return null;
  return {
    catendaProsjekt: kobling[0].catenda_project_id,
    aktiv: kobling[0].is_active,
    harSaker: kobling[0].har_saker,
    team: team.map((t) => ({ team_id: t.team_id, contract_role: t.contract_role })),
  };
}

export interface Avhengigheter {
  pool: () => Promise<Pool>;
  catenda: () => { oauth: CatendaOAuth; token: () => Promise<string> };
  skriv: (linje: string) => void;
}

const VALG = {
  prosjekt: { type: 'string' },
  navn: { type: 'string' },
  beskrivelse: { type: 'string' },
  organisasjon: { type: 'string' },
  'catenda-prosjekt': { type: 'string' },
  bibliotek: { type: 'string' },
  mappe: { type: 'string' },
  board: { type: 'string' },
  bh: { type: 'string', multiple: true },
  te: { type: 'string', multiple: true },
  'en-totalentreprenoer': { type: 'boolean' },
  byggherre: { type: 'string' },
  totalentreprenoer: { type: 'string' },
} as const;

type Valg = keyof typeof VALG;
const FELLES = ['prosjekt', 'bh', 'te', 'en-totalentreprenoer'];
const PARTER: Valg[] = ['byggherre', 'totalentreprenoer'];
const BARE_REGISTRER = (Object.keys(VALG) as Valg[]).filter(
  (navn) => !FELLES.includes(navn) && !PARTER.includes(navn)
);

/** `--bh a b` blir `--bh a --bh b`, som `nargs="+"` i `catenda_admin.py`. */
function flereTeam(argv: string[]): string[] {
  const ut: string[] = [];
  let flagg: string | null = null;
  let utenVerdi = false;
  for (const arg of argv) {
    const nyttFlagg = arg.startsWith('-');
    if (nyttFlagg && flagg && utenVerdi) ut.push(flagg);
    if (arg === '--bh' || arg === '--te') {
      [flagg, utenVerdi] = [arg, true];
    } else if (nyttFlagg) {
      flagg = null;
      ut.push(arg);
    } else if (flagg) {
      ut.push(flagg, arg);
      utenVerdi = false;
    } else ut.push(arg);
  }
  if (flagg && utenVerdi) ut.push(flagg);
  return ut;
}

function paakrevd(verdi: string | undefined, navn: string): string {
  if (!verdi) throw new Registreringsfeil(`--${navn} må oppgis.`);
  return verdi;
}

/** Kjører kommandoen i `argv` (uten `node` og skriptet). */
export async function kjoer(argv: string[], a: Avhengigheter): Promise<void> {
  const { values: v, positionals } = parseArgs({
    args: flereTeam(argv),
    options: VALG,
    allowPositionals: true,
  });
  const [kommando, prosjektArgument, ...resten] = positionals;
  if (resten.length) throw new Registreringsfeil(`Ukjente argumenter: ${resten.join(' ')}`);
  const oppgittTeam = v.bh || v.te ? kontraktsteamFra(v.bh ?? [], v.te ?? []) : null;
  // Et prosjekt gjelder én entreprisekontrakt, og drift bekrefter det ved registreringen (DL-U14).
  if (oppgittTeam && !v['en-totalentreprenoer'])
    throw new Registreringsfeil(
      'Bekreft med --en-totalentreprenoer at alle TE-teamene hører til samme totalentreprenør (DL-U14).'
    );
  if (!oppgittTeam && v['en-totalentreprenoer'])
    throw new Registreringsfeil('--en-totalentreprenoer gjelder bare sammen med --bh og --te.');

  // Én klient og ett token for alle kontrollene i kjøringen (#879 punkt 1).
  let catenda: Promise<{ oauth: CatendaOAuth; token: string }> | undefined;
  function iCatenda(): Promise<{ oauth: CatendaOAuth; token: string }> {
    catenda ??= (async () => {
      const { oauth, token } = a.catenda();
      return { oauth, token: await token() };
    })();
    return catenda;
  }

  async function kontrollerTeam(catendaProsjekt: string, team: Kontraktsteam[]): Promise<void> {
    const { oauth, token } = await iCatenda();
    const iCatendaTeam = await catendaTeam(oauth, token, catendaId(catendaProsjekt)!);
    const mangler = team.filter((t) => !iCatendaTeam.has(t.team_id)).map((t) => t.team_id);
    if (mangler.length)
      throw new Registreringsfeil(`Teamet finnes ikke i Catenda-prosjektet: ${mangler.join(', ')}`);
    for (const t of team)
      a.skriv(`  ${t.contract_role}: ${iCatendaTeam.get(t.team_id)} (${t.team_id})`);
  }

  /** Boardet må høre til Catenda-prosjektet, som teamene (#836 punkt 2). */
  async function kontrollerBoard(catendaProsjekt: string, board: string): Promise<void> {
    const { oauth, token } = await iCatenda();
    const prosjekt = await oauth.boardetsProsjekt(board, token);
    if (prosjekt !== catendaId(catendaProsjekt))
      throw new Registreringsfeil(`Boardet finnes ikke i Catenda-prosjektet: ${board}`);
  }

  const avvisFlagg = (flagg: Valg[], kommando: string) => {
    const oppgitt = flagg.filter((navn) => v[navn] !== undefined);
    if (oppgitt.length)
      throw new Registreringsfeil(
        `${oppgitt.map((navn) => `--${navn}`).join(', ')} gjelder bare «${kommando}».`
      );
  };

  if (kommando !== 'kontraktsparter') avvisFlagg(PARTER, 'kontraktsparter');

  if (kommando === 'registrer') {
    if (prosjektArgument) throw new Registreringsfeil('Prosjektet oppgis med --prosjekt.');
    const r: Registrering = {
      prosjekt: paakrevd(v.prosjekt, 'prosjekt'),
      navn: paakrevd(v.navn, 'navn'),
      beskrivelse: v.beskrivelse ?? null,
      organisasjon: paakrevd(v.organisasjon, 'organisasjon'),
      catendaProsjekt: uuid(
        paakrevd(v['catenda-prosjekt'], 'catenda-prosjekt'),
        'Catenda-prosjektet'
      ),
      bibliotek: uuid(paakrevd(v.bibliotek, 'bibliotek'), 'Biblioteket'),
      mappe: v.mappe === undefined ? null : uuid(v.mappe, 'Mappen'),
      board: v.board === undefined ? null : uuid(v.board, 'Boardet'),
      team: oppgittTeam,
    };
    const pool = await a.pool();
    // Basen avviser bytte med 52066 uansett; her avvises det før Catenda-kallet (#868 punkt 2).
    await kontrollerBytte(pool, r);
    if (r.team) await kontrollerTeam(r.catendaProsjekt, r.team);
    if (r.board) await kontrollerBoard(r.catendaProsjekt, r.board);
    const utfall = await registrer(pool, r);
    a.skriv(`Prosjektet ${r.prosjekt} er registrert${r.team ? ' med kontraktsteamene' : ''}.`);
    if (!utfall.nytt && utfall.organisasjon_id !== r.organisasjon)
      a.skriv(
        `Virksomheten er uendret: ${utfall.organisasjon_id}. En ny registrering endrer den ikke (KR-01).`
      );
    if (!utfall.mappe)
      a.skriv('Prosjektet har ingen mappe: dokumentene lastes opp i roten av biblioteket.');
    if (!utfall.board)
      a.skriv(
        'Prosjektet har ikke noe board: nye saker avvises (51412) til det registreres med --board.'
      );
    return;
  }

  if (kommando === 'kontraktsparter') {
    if (prosjektArgument && v.prosjekt)
      throw new Registreringsfeil(
        `Prosjektet er oppgitt to ganger: ${prosjektArgument} og --prosjekt ${v.prosjekt}.`
      );
    const prosjekt = prosjektArgument ?? v.prosjekt;
    if (!prosjekt) throw new Registreringsfeil('Prosjektet må oppgis.');
    avvisFlagg(BARE_REGISTRER, 'registrer');
    if (oppgittTeam) throw new Registreringsfeil('--bh og --te gjelder bare «kontraktsteam».');
    if (v.byggherre === undefined && v.totalentreprenoer === undefined) {
      const parter = await lesKontraktsparter(await a.pool(), prosjekt);
      a.skriv(`Byggherre: ${parter?.byggherre_navn ?? '(ikke satt)'}`);
      a.skriv(`Totalentreprenør: ${parter?.totalentreprenor_navn ?? '(ikke satt)'}`);
      return;
    }
    const parter = {
      byggherre_navn: paakrevd(v.byggherre, 'byggherre'),
      totalentreprenor_navn: paakrevd(v.totalentreprenoer, 'totalentreprenoer'),
    };
    await settKontraktsparter(await a.pool(), prosjekt, parter);
    a.skriv(`Navnene på partene i ${prosjekt} er lagret.`);
    return;
  }

  if (kommando === 'kontraktsteam') {
    if (prosjektArgument && v.prosjekt)
      throw new Registreringsfeil(
        `Prosjektet er oppgitt to ganger: ${prosjektArgument} og --prosjekt ${v.prosjekt}.`
      );
    const prosjekt = prosjektArgument ?? v.prosjekt;
    if (!prosjekt) throw new Registreringsfeil('Prosjektet må oppgis.');
    const ukjente = BARE_REGISTRER.filter((navn) => v[navn] !== undefined);
    if (ukjente.length)
      throw new Registreringsfeil(
        `${ukjente.map((navn) => `--${navn}`).join(', ')} gjelder bare «registrer».`
      );
    const pool = await a.pool();
    const naa = await lesKontraktsteam(pool, prosjekt);
    if (!naa) throw new Registreringsfeil(`Prosjektet ${prosjekt} har ingen kobling til Catenda.`);
    if (oppgittTeam) {
      if (!naa.aktiv)
        throw new Registreringsfeil(
          `Koblingen til Catenda er inaktiv: registrer ${prosjekt} på nytt før kontraktsteamene settes.`
        );
      await kontrollerTeam(naa.catendaProsjekt, oppgittTeam);
      await settKontraktsteam(pool, prosjekt, oppgittTeam);
      a.skriv(`Kontraktsteamene i ${prosjekt} er lagret.`);
      return;
    }
    for (const side of ['BH', 'TE'] as const) {
      const ider = naa.team.filter((t) => t.contract_role === side).map((t) => t.team_id);
      a.skriv(`${side}: ${ider.join(', ') || '(ingen)'}`);
    }
    if (!naa.aktiv) a.skriv('Koblingen til Catenda er inaktiv.');
    if (naa.harSaker) a.skriv('Prosjektet har saker: kontraktsteamene kan bare få nye team.');
    return;
  }

  throw new Registreringsfeil(
    'Kommandoen er «registrer», «kontraktsteam» eller «kontraktsparter».'
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let pool: Pool | null = null;
  try {
    await kjoer(process.argv.slice(2), {
      pool: async () => {
        const tilkobling = process.env.KOE_DRIFT_TILKOBLING;
        if (!tilkobling) throw new Registreringsfeil('KOE_DRIFT_TILKOBLING er ikke satt.');
        pool = await opprettPool(sql.ConnectionPool.parseConnectionString(tilkobling), { maks: 1 });
        return pool;
      },
      catenda: () => {
        const { oauth, integrasjonsnokkel } = catendaFraMiljoe();
        return { oauth, token: () => integrasjonsnokkel.token() };
      },
      skriv: (linje) => console.log(linje),
    });
  } catch (feil) {
    console.error(feil instanceof Error ? feil.message : feil);
    process.exitCode = 1;
  } finally {
    await (pool as Pool | null)?.close();
  }
}
