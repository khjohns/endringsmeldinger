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
 *     [--byggherre "…" --totalentreprenoer "…" --kontraktsforkortelse K201]
 *   KOE_DRIFT_TILKOBLING=… node server/registrering.ts kontraktsfrister oslobygg \
 *     [kontraktssum <kroner> | ny | rett <frist-id> | fjern <frist-id>] \
 *     [--nummer E.1.2 | --uten-nummer] [--frist "Sluttfrist"] [--dato 2027-06-30] \
 *     [--ikke-dagmulktbelagt | --dagmulktbelagt [--standardsats | \
 *       --promille 1 --minstebeloep 3000 [--delens-verdi <kroner>] | --beloep-per-dag <kroner>]]
 *
 * `KOE_DRIFT_TILKOBLING` er tilkoblingsstrengen for en bruker med
 * `koe_driftsrolle`. Med `--bh` og `--te` kontrolleres teamene mot Catenda-
 * prosjektet med integrasjonens token (`catendaFraMiljoe`), som i Python, og med
 * `--board` boardet (#836).
 * Uten dem viser `kontraktsteam` teamene som står. Som i Python kan én `--bh` eller
 * `--te` ha flere team (`--bh a b`). Med `--en-totalentreprenoer` bekrefter drift at
 * alle TE-teamene hører til samme totalentreprenør, og uten den avvises teamene (DL-U14).
 * `kontraktsparter` setter navnene på byggherren og totalentreprenøren og
 * kontraktsforkortelsen, alle sammen, og viser dem uten flaggene (#1398, #1497).
 * `kontraktsfrister` viser kontraktssummen og fristtabellen med satsen, setter
 * kontraktssummen, registrerer en ny frist, retter det som oppgis for en frist og
 * lar resten stå, eller fjerner en frist så lenge prosjektet ikke har saker (GFK-U16, GFK-U18, GFK-U22).
 * Med `--promille` og `--minstebeloep` regnes satsen av kontraktssummen, og med
 * `--delens-verdi` i tillegg av verdien av delen; `--beloep-per-dag` er et avtalt fast
 * beløp. `--standardsats` er 1 ‰ av kontraktssummen og minst 3000 kr etter § 40.3 a
 * (GFK-U16), skrevet som vanlige verdier; ellers oppgis promillen og minstebeløpet.
 * `--nummer` er kontraktens nummer på fristen, som brevet viser med navnet. Fristens ID
 * er skriptets og basens nøkkel og står ikke i brevet.
 */

import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { catendaId, uuidMedBindestreker } from './autorisasjon.ts';
import { catendaFraMiljoe, type CatendaOAuth } from './catenda.ts';
import { opprettPool, sql, utenKontekst, type Pool } from './datalag.ts';
import type { Part } from '../kjerne/typer.ts';
import {
  betegnelse,
  fristtabell,
  STANDARDSATS,
  type Fristrad,
  type Fristtabell,
  type Satsopplysninger,
} from './kontraktsfrister.ts';

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
  /** K201 i merkingen `K201-KOE-17-03` (LV-U44). Bare A–Z og 0–9. */
  kontraktsforkortelse: string;
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
      .input('kontraktsforkortelse', sql.NVarChar(4000), parter.kontraktsforkortelse)
      .execute('koe_drift.sett_kontraktsparter');
  } catch (feil) {
    const { number, message } = feil as { number?: unknown; message?: unknown };
    if (number === 52043 || number === 52065 || number === 52073 || number === 52074)
      throw new Registreringsfeil(`${String(message)} (${number}).`, { cause: feil });
    throw feil;
  }
}

const FRISTFEIL = [52073, 52075, 52076, 52077, 52078, 52079, 52080, 52081, 52082, 52083];

async function iDriften<T>(arbeid: Promise<T>): Promise<T> {
  try {
    return await arbeid;
  } catch (feil) {
    const { number, message } = feil as { number?: unknown; message?: unknown };
    if (typeof number === 'number' && FRISTFEIL.includes(number))
      throw new Registreringsfeil(`${String(message)} (${number}).`, { cause: feil });
    throw feil;
  }
}

/** Kontraktssummen og fristene, med satsen regnet ut (`server/kontraktsfrister.ts`). */
export async function lesFristtabell(pool: Pool, prosjekt: string): Promise<Fristtabell> {
  const svar = await utenKontekst(pool)
    .input('prosjekt', sql.NVarChar(4000), prosjekt)
    .execute('koe_drift.kontraktsfrister');
  const [sum, rader] = svar.recordsets as unknown as [{ kontraktssum: unknown }[], Fristrad[]];
  return fristtabell(sum, rader);
}

export interface NyFrist {
  /** Kontraktens nummer på fristen, eller `null`. */
  nummer: string | null;
  navn: string;
  /** `ÅÅÅÅ-MM-DD`. */
  dato: string;
  dagmulktbelagt: boolean;
  satsopplysninger: Satsopplysninger | null;
}

/** Registrerer fristen når `fristId` er `null`, og retter ellers fristen. Gir ID-en. */
async function settKontraktsfrist(
  pool: Pool,
  prosjekt: string,
  fristId: number | null,
  f: NyFrist
): Promise<number> {
  const s = f.satsopplysninger;
  const svar = await iDriften(
    utenKontekst(pool)
      .input('prosjekt', sql.NVarChar(4000), prosjekt)
      .input('frist_id', sql.Int, fristId)
      .input('nummer', sql.NVarChar(4000), f.nummer)
      .input('navn', sql.NVarChar(4000), f.navn)
      .input('dato', sql.NVarChar(10), f.dato)
      .input('dagmulktbelagt', sql.Bit, f.dagmulktbelagt)
      .input('satsgrunnlag', sql.NVarChar(4000), s?.grunnlag ?? null)
      .input('promille', sql.Decimal(9, 4), s && 'promille' in s ? s.promille : null)
      .input('minstebeloep', sql.Decimal(15, 2), s && 'minstebeloep' in s ? s.minstebeloep : null)
      .input(
        'delens_verdi',
        sql.Decimal(15, 2),
        s?.grunnlag === 'delens_verdi' ? s.delensVerdi : null
      )
      .input(
        'beloep_per_dag',
        sql.Decimal(15, 2),
        s?.grunnlag === 'fast_beloep' ? s.beloepPerDag : null
      )
      .execute<{ frist_id: number }>('koe_drift.sett_kontraktsfrist')
  );
  return svar.recordset[0]!.frist_id;
}

const kroner = (n: number) =>
  `${n.toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr`;

function beskrivSats(s: Satsopplysninger): string {
  if (s.grunnlag === 'fast_beloep') return `avtalt ${kroner(s.beloepPerDag)} per dag`;
  const av =
    s.grunnlag === 'kontraktssum'
      ? 'kontraktssummen'
      : `verdien av delen, ${kroner(s.delensVerdi)}`;
  return `${s.promille} ‰ av ${av}, minst ${kroner(s.minstebeloep)}`;
}

/**
 * Et tall med punktum som desimaltegn, i formen kolonnen tar: et beløp har høyst 13
 * sifre før og 2 etter, en promille høyst 5 før og 4 etter.
 */
function desimaltall(verdi: string, navn: string, form: 'beloep' | 'promille'): number {
  const [foer, etter] = form === 'beloep' ? [13, 2] : [5, 4];
  if (!new RegExp(`^\\d{1,${foer}}(\\.\\d{1,${etter}})?$`).test(verdi))
    throw new Registreringsfeil(
      `--${navn} er ikke et tall med høyst ${foer} sifre, ${etter} desimaler og punktum: ${verdi}`
    );
  return Number(verdi);
}

function fristId(verdi: string | undefined): number {
  if (!verdi || !/^[1-9]\d{0,8}$/.test(verdi))
    throw new Registreringsfeil(`Fristens ID er ikke et positivt heltall: ${verdi ?? '(mangler)'}`);
  return Number(verdi);
}

function erDato(verdi: string): boolean {
  const d = new Date(`${verdi}T00:00:00Z`);
  return (
    /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(verdi) &&
    !isNaN(d.getTime()) &&
    d.toISOString().startsWith(verdi)
  );
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
  kontraktsforkortelse: { type: 'string' },
  frist: { type: 'string' },
  dato: { type: 'string' },
  nummer: { type: 'string' },
  'uten-nummer': { type: 'boolean' },
  dagmulktbelagt: { type: 'boolean' },
  standardsats: { type: 'boolean' },
  'ikke-dagmulktbelagt': { type: 'boolean' },
  promille: { type: 'string' },
  minstebeloep: { type: 'string' },
  'delens-verdi': { type: 'string' },
  'beloep-per-dag': { type: 'string' },
} as const;

type Valg = keyof typeof VALG;
const FELLES = ['prosjekt', 'bh', 'te', 'en-totalentreprenoer'];
const PARTER: Valg[] = ['byggherre', 'totalentreprenoer', 'kontraktsforkortelse'];
const FRISTER: Valg[] = [
  'nummer',
  'uten-nummer',
  'standardsats',
  'frist',
  'dato',
  'dagmulktbelagt',
  'ikke-dagmulktbelagt',
  'promille',
  'minstebeloep',
  'delens-verdi',
  'beloep-per-dag',
];
const BARE_REGISTRER = (Object.keys(VALG) as Valg[]).filter(
  (navn) => !FELLES.includes(navn) && !PARTER.includes(navn) && !FRISTER.includes(navn)
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
  const handling = kommando === 'kontraktsfrister' ? resten.splice(0, 2) : [];
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
  if (kommando !== 'kontraktsfrister') avvisFlagg(FRISTER, 'kontraktsfrister');

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
    if (
      v.byggherre === undefined &&
      v.totalentreprenoer === undefined &&
      v.kontraktsforkortelse === undefined
    ) {
      const parter = await lesKontraktsparter(await a.pool(), prosjekt);
      a.skriv(`Byggherre: ${parter?.byggherre_navn ?? '(ikke satt)'}`);
      a.skriv(`Totalentreprenør: ${parter?.totalentreprenor_navn ?? '(ikke satt)'}`);
      a.skriv(`Kontraktsforkortelse: ${parter?.kontraktsforkortelse ?? '(ikke satt)'}`);
      return;
    }
    const parter = {
      byggherre_navn: paakrevd(v.byggherre, 'byggherre'),
      totalentreprenor_navn: paakrevd(v.totalentreprenoer, 'totalentreprenoer'),
      kontraktsforkortelse: paakrevd(v.kontraktsforkortelse, 'kontraktsforkortelse'),
    };
    await settKontraktsparter(await a.pool(), prosjekt, parter);
    a.skriv(`Navnene og kontraktsforkortelsen i ${prosjekt} er lagret.`);
    return;
  }

  if (kommando === 'kontraktsfrister') {
    // Med --prosjekt er handlingen det første argumentet etter kommandoen.
    const [prosjekt, hva, argument, ...ukjente] = v.prosjekt
      ? [v.prosjekt, prosjektArgument, ...handling]
      : [prosjektArgument, ...handling];
    if (ukjente.length) throw new Registreringsfeil(`Ukjente argumenter: ${ukjente.join(' ')}`);
    if (!prosjekt) throw new Registreringsfeil('Prosjektet må oppgis.');
    avvisFlagg(BARE_REGISTRER, 'registrer');
    if (oppgittTeam) throw new Registreringsfeil('--bh og --te gjelder bare «kontraktsteam».');
    const medFrist = hva === 'ny' || hva === 'rett';
    if (!medFrist) avvisFlagg(FRISTER, 'kontraktsfrister ny» og «kontraktsfrister rett');
    if ((hva === 'ny' || hva === undefined) && argument !== undefined)
      throw new Registreringsfeil(`Ukjente argumenter: ${argument}`);
    const pool = await a.pool();

    if (hva === undefined) {
      const tabell = await iDriften(lesFristtabell(pool, prosjekt));
      a.skriv(
        `Kontraktssum: ${tabell.kontraktssum === null ? '(ikke satt)' : kroner(tabell.kontraktssum)}`
      );
      if (!tabell.frister.length) a.skriv('Ingen frister er registrert.');
      for (const f of tabell.frister) {
        const dagmulkt = !f.dagmulktbelagt
          ? 'ikke dagmulktbelagt'
          : !f.satsopplysninger
            ? 'dagmulktbelagt, satsen er ikke registrert'
            : `dagmulktbelagt, ${beskrivSats(f.satsopplysninger)}: ${
                f.sats === null ? 'kontraktssummen mangler' : `${kroner(f.sats)} per dag`
              }`;
        a.skriv(`ID ${f.fristId}: ${betegnelse(f)}, ${f.dato}, ${dagmulkt}`);
      }
      return;
    }
    if (hva === 'kontraktssum') {
      const sum = desimaltall(argument ?? '', 'kontraktssum', 'beloep');
      await iDriften(
        utenKontekst(pool)
          .input('prosjekt', sql.NVarChar(4000), prosjekt)
          .input('kontraktssum', sql.Decimal(15, 2), sum)
          .execute('koe_drift.sett_kontraktssum')
      );
      a.skriv(`Kontraktssummen i ${prosjekt} er lagret: ${kroner(sum)}.`);
      return;
    }
    if (hva === 'fjern') {
      const id = fristId(argument);
      await iDriften(
        utenKontekst(pool)
          .input('prosjekt', sql.NVarChar(4000), prosjekt)
          .input('frist_id', sql.Int, id)
          .execute('koe_drift.fjern_kontraktsfrist')
      );
      a.skriv(`Frist ${id} i ${prosjekt} er fjernet.`);
      return;
    }
    if (!medFrist)
      throw new Registreringsfeil(
        'Handlingen for kontraktsfrister er «kontraktssum», «ny», «rett» eller «fjern».'
      );
    if (v.dagmulktbelagt && v['ikke-dagmulktbelagt'])
      throw new Registreringsfeil('Oppgi enten --dagmulktbelagt eller --ikke-dagmulktbelagt.');
    if (v.dato !== undefined && !erDato(v.dato))
      throw new Registreringsfeil(`--dato er ikke en dato på formen ÅÅÅÅ-MM-DD: ${v.dato}`);
    const tallFra = (navn: Valg, form: 'beloep' | 'promille') => {
      const verdi = v[navn];
      return typeof verdi === 'string' ? desimaltall(verdi, navn, form) : undefined;
    };
    const sats = {
      promille: tallFra('promille', 'promille'),
      minstebeloep: tallFra('minstebeloep', 'beloep'),
      delensVerdi: tallFra('delens-verdi', 'beloep'),
      beloepPerDag: tallFra('beloep-per-dag', 'beloep'),
    };
    const satsOppgitt = Object.values(sats).some((x) => x !== undefined);
    const oppgitt = v.standardsats === true || satsOppgitt;
    let nySats: Satsopplysninger | null = null;
    if (v.standardsats) {
      if (satsOppgitt)
        throw new Registreringsfeil(
          '--standardsats kan ikke stå sammen med --promille, --minstebeloep, --delens-verdi eller --beloep-per-dag.'
        );
      nySats = STANDARDSATS;
    } else if (sats.beloepPerDag !== undefined) {
      if (
        sats.promille !== undefined ||
        sats.minstebeloep !== undefined ||
        sats.delensVerdi !== undefined
      )
        throw new Registreringsfeil(
          '--beloep-per-dag kan ikke stå sammen med --promille, --minstebeloep eller --delens-verdi.'
        );
      nySats = { grunnlag: 'fast_beloep', beloepPerDag: sats.beloepPerDag };
    } else if (oppgitt) {
      if (sats.promille === undefined || sats.minstebeloep === undefined)
        throw new Registreringsfeil('Både --promille og --minstebeloep må oppgis.');
      nySats =
        sats.delensVerdi === undefined
          ? { grunnlag: 'kontraktssum', promille: sats.promille, minstebeloep: sats.minstebeloep }
          : {
              grunnlag: 'delens_verdi',
              promille: sats.promille,
              minstebeloep: sats.minstebeloep,
              delensVerdi: sats.delensVerdi,
            };
    }
    const oppgittDagmulkt = v.dagmulktbelagt ? true : v['ikke-dagmulktbelagt'] ? false : undefined;
    if (v.nummer !== undefined && v['uten-nummer'])
      throw new Registreringsfeil('Oppgi enten --nummer eller --uten-nummer.');
    const oppgittNummer = v['uten-nummer'] ? null : v.nummer;

    const id = hva === 'rett' ? fristId(argument) : null;
    let frist: NyFrist;
    if (id === null) {
      if (oppgittDagmulkt === undefined)
        throw new Registreringsfeil('Oppgi --dagmulktbelagt eller --ikke-dagmulktbelagt.');
      frist = {
        nummer: oppgittNummer ?? null,
        navn: paakrevd(v.frist, 'frist'),
        dato: paakrevd(v.dato, 'dato'),
        dagmulktbelagt: oppgittDagmulkt,
        satsopplysninger: nySats,
      };
    } else {
      // Det som ikke er oppgitt, står som før, så en retting av datoen fjerner ikke satsen.
      if (FRISTER.every((navn) => v[navn] === undefined))
        throw new Registreringsfeil('Oppgi det som skal rettes.');
      const naa = (await iDriften(lesFristtabell(pool, prosjekt))).frister.find(
        (f) => f.fristId === id
      );
      if (!naa) throw new Registreringsfeil(`Prosjektet har ingen frist med ID-en ${id}.`);
      const dagmulktbelagt = oppgittDagmulkt ?? naa.dagmulktbelagt;
      frist = {
        nummer: oppgittNummer === undefined ? naa.nummer : oppgittNummer,
        navn: v.frist ?? naa.navn,
        dato: v.dato ?? naa.dato,
        dagmulktbelagt,
        satsopplysninger: oppgitt ? nySats : dagmulktbelagt ? naa.satsopplysninger : null,
      };
    }
    if (oppgitt && !frist.dagmulktbelagt)
      throw new Registreringsfeil('Satsen gjelder bare en dagmulktbelagt frist.');
    const lagret = await settKontraktsfrist(pool, prosjekt, id, frist);
    a.skriv(
      id === null
        ? `Frist ${lagret} i ${prosjekt} er registrert.`
        : `Frist ${lagret} i ${prosjekt} er rettet.`
    );
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
    'Kommandoen er «registrer», «kontraktsteam», «kontraktsparter» eller «kontraktsfrister».'
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
