/**
 * Poolen og transaksjonshjelperen mot SQL Server for F0b (#419, DL-U1).
 *
 * Konteksten står i `SESSION_CONTEXT`, som gjelder sesjonen, og `mssql`
 * nullstiller ikke en forbindelse når poolen gir den ut igjen (SQ-02).
 * `transaksjon` reserverer derfor forbindelsen fra lånet til den er nullstilt
 * med `sp_reset_connection` og kontrollert. Feiler BEGIN, ROLLBACK,
 * nullstillingen eller kontrollen, sendes ikke COMMIT, eller feiler COMMIT uten
 * at serveren har rullet tilbake, forkastes forbindelsen: den lukkes, poolen tar
 * den ikke i bruk igjen, og serveren ruller tilbake det som var åpent. `koe_tx`
 * binder i tillegg konteksten til transaksjonen (SQ-03).
 *
 * Tilkoblingen tar en `mssql`-konfigurasjon, så pålogging med SQL-bruker
 * (testbasen) og Entra/managed identity (Azure, A4 i #78) går gjennom samme vei.
 *
 * Hjelperen bruker interne deler av `mssql` og `tedious` (#533): at
 * `ConnectionPool.acquire`/`release` gir ut forbindelsen fra `tedious`, at en
 * `Transaction` henter og gir tilbake forbindelsen gjennom forelderens
 * `acquire(requester, callback)`, `release` og `config`, lytteren `_abort` og
 * `_abortReason` og `_activeRequest` på transaksjonen, hendelsen
 * `rollbackTransaction`, `reset`, `close`, `hasError` og `databaseCollation` på
 * forbindelsen. Versjonen av `mssql` er låst
 * i `package.json`, `tedious` i `package-lock.json`, og CI-jobben «SQL Server
 * (testbasen for datalaget)» kjører testene som vokter delene.
 */

import sql from 'mssql';

export { sql };
export type Pool = sql.ConnectionPool;

export interface Kontekst {
  /** `app_users.id`. */
  aktor: string;
  prosjekt: string;
  side?: 'TE' | 'BH';
  /**
   * Teamet i `catenda_id()`-formen, 32 små heksadesimale tegn som
   * `catenda_contract_teams.team_id`. Kalleren setter det bare når det er
   * entydig og et av prosjektets kontraktsteam på avsenderens side (DL-U4).
   */
  team?: string;
}

/**
 * Nøklene i `SESSION_CONTEXT`, med samme navn som prøven (02_sikkerhet.sql): de
 * fem første setter `transaksjon`, og `koe_skriving` setter
 * `koe_api.skriv_hendelse`. Ingen av dem har verdi etter nullstillingen.
 */
export const KONTEKSTNOEKLER = [
  'koe_aktor',
  'koe_prosjekt',
  'koe_side',
  'koe_team',
  'koe_tx',
  'koe_skriving',
] as const;

/**
 * Feilnummeret fra SQL Server: 2627 for brudd på en unik nøkkel, et eget nummer
 * fra THROW osv. `mssql` har det på feilen selv, og en feil gjennom `tedious`
 * har det i `originalError.info`.
 */
export function feilnummer(feil: unknown): number | undefined {
  const f = feil as { number?: unknown; originalError?: { info?: { number?: unknown } } };
  // En `RequestError` uten `info` har koden fra `tedious` ('ETIMEOUT') i `number` (#926).
  for (const n of [f?.number, f?.originalError?.info?.number]) if (typeof n === 'number') return n;
  return undefined;
}

/**
 * Feilnumrene fra basen som serveren oversetter. Numrene er kontrakter med
 * prosedyrene i `database/migrasjoner/`; meningen står i hver prosedyre.
 */
export const NEKTET = 51403;
export const LAAS_FEILET = 51407;
export const LAAS_IKKE_GITT = 51408;
export const KONFLIKT = 51409;
export const ID_BRUKT = 51410;
export const INGEN_BOARD = 51412;
export const FOR_GAMMELT = 51419;
export const UGYLDIG = 51422;
/** Blokkpredikatet i radsikkerheten stoppet skrivingen. */
export const BLOKKERT = 33504;
export const UNIK_INDEKS = 2601;
export const UNIK_NOEKKEL = 2627;

/** Forespørslene i én transaksjon, med konteksten satt. */
export type Foresp = () => sql.Request;

/**
 * Utfallet «rull tilbake og svar med `svar`» fra arbeidet i `transaksjon`: ingenting
 * i transaksjonen committes, og kalleren får svaret.
 */
export class Tilbakerulling<T> {
  readonly svar: T;
  constructor(svar: T) {
    this.svar = svar;
  }
}

/** Konteksten er ugyldig. Ingen forbindelse er lånt. */
export class UgyldigKontekst extends Error {}

/**
 * COMMIT feilet eller fikk ikke svar, uten at serveren meldte tilbakerulling.
 * Serveren kan ha committet, så utfallet er usikkert. Forbindelsen er forkastet.
 */
export class UsikkertUtfall extends Error {}

/**
 * Serveren rullet tilbake transaksjonen, etter en feil med XACT_ABORT eller en
 * ROLLBACK uten at arbeidet kastet, eller under COMMIT. Utfallet er kjent:
 * transaksjonen er ikke committet. Serverfeilen står i `cause` når `mssql` har den.
 */
export class TransaksjonAvbrutt extends Error {}

/**
 * COMMIT ble ikke sendt: en forespørsel i arbeidet pågikk ennå da arbeidet var
 * ferdig, eller transaksjonen i `mssql` lytter ikke med `_abort` (#533). Forbindelsen
 * er forkastet med transaksjonen åpen, og serveren ruller den tilbake. Utfallet er
 * kjent: transaksjonen er ikke committet.
 */
export class CommitIkkeSendt extends Error {}

/**
 * Transaksjonen nådde fristen før COMMIT ble sendt, og forbindelsen er lukket, så
 * serveren ruller tilbake (RK-05, #50). Utfallet er kjent: transaksjonen er ikke
 * committet. Feilen fra arbeidet står i `cause` når den finnes.
 */
export class FristUtloept extends Error {}

/**
 * Den øvre levetiden for en transaksjon i millisekunder, fra BEGIN til COMMIT
 * sendes (RK-05, #50). Den rommer en ventetid på applåsen (10 s i
 * `database/migrasjoner/`) og en forespørsel med standardgrensen i `mssql` (15 s).
 */
export const TRANSAKSJONSFRIST_MS = 30_000;

/** Forbindelsen fra `tedious`, med det `transaksjon` bruker. */
export interface Forbindelse {
  reset(callback: (feil?: Error) => void): void;
  databaseCollation?: unknown;
  close(): void;
  on(hendelse: 'rollbackTransaction', lytter: () => void): void;
  removeListener(hendelse: 'rollbackTransaction', lytter: () => void): void;
  listeners(hendelse: 'rollbackTransaction'): unknown[];
  hasError?: boolean;
}

export interface Utlaan {
  acquire(requester: unknown): Promise<Forbindelse>;
  release(forbindelse: Forbindelse): void;
}

/**
 * En pool der hver forbindelse har `xact_abort` på. `tedious` setter det ved
 * innloggingen og etter hver nullstilling. `maks` går foran `konfig.pool.max`,
 * og standarden er 10. Grensene kontrolleres før tilkoblingen: `min` er et heltall
 * fra 0, `max` et heltall fra 1, og `min` er ikke over `max`.
 */
export async function opprettPool(
  konfig: sql.config,
  { maks }: { maks?: number } = {}
): Promise<Pool> {
  const max = maks ?? konfig.pool?.max ?? 10;
  const min = konfig.pool?.min ?? 0;
  if (!Number.isInteger(max) || max < 1)
    throw new RangeError(`Poolen har maks ${max}, som ikke er et heltall fra 1.`);
  if (!Number.isInteger(min) || min < 0)
    throw new RangeError(`Poolen har min ${min}, som ikke er et heltall fra 0.`);
  if (min > max) throw new RangeError(`Poolen har min ${min}, som er over maks ${max}.`);
  return new sql.ConnectionPool({
    ...konfig,
    options: { encrypt: true, ...konfig.options, abortTransactionOnError: true },
    pool: { ...konfig.pool, min, max },
  }).connect();
}

/**
 * En UUID med små bokstaver, formen basen krever for ID-ene den sammenlikner som tekst.
 * En ID utenfra gjøres om til små bokstaver der den kommer inn (#815 punkt 3).
 */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TEAM = /^[0-9a-f]{32}$/;

function kontroller(k: Kontekst): void {
  if (typeof k?.aktor !== 'string' || !UUID.test(k.aktor))
    throw new UgyldigKontekst('Aktøren er ikke en UUID.');
  if (
    typeof k.prosjekt !== 'string' ||
    k.prosjekt.trim() !== k.prosjekt ||
    k.prosjekt === '' ||
    k.prosjekt.length > 100
  )
    throw new UgyldigKontekst('Prosjektet mangler, har mellomrom i endene eller er over 100 tegn.');
  if (k.side !== undefined && k.side !== 'TE' && k.side !== 'BH')
    throw new UgyldigKontekst('Siden er verken TE eller BH.');
  if (k.team !== undefined && (typeof k.team !== 'string' || !TEAM.test(k.team)))
    throw new UgyldigKontekst('Teamet er ikke 32 små heksadesimale tegn.');
}

/**
 * En forespørsel uten `SESSION_CONTEXT`, for prosedyrene og spørringene som ikke
 * leser konteksten: sesjonen, innloggingen, medlemskapet, tilgangskontrollen,
 * jobbene, registreringen, oppstartskontrollen og oppslagene i `prosjekter.ts`.
 * Saksdata leses og skrives i `transaksjon`. Utenom
 * datalaget, migreringen og testene er dette den eneste veien til en forespørsel
 * (#542, `server/tester/arkitektur.test.ts`).
 */
export function utenKontekst(pool: Pool): sql.Request {
  return pool.request();
}

/**
 * Forelderen til transaksjonen og forespørslene: den gir ut den reserverte
 * forbindelsen og gir den aldri tilbake til poolen. `mssql` gir forbindelsen
 * tilbake før kallerens callback når COMMIT eller ROLLBACK er ferdig, også når
 * de feiler (#419); her blir det en tom operasjon. Faller forbindelsen ut,
 * feiler de neste forespørslene i stedet for å få en ny sesjon. Migreringen
 * bruker den også (`migrering.ts`).
 */
export function reservasjon(pool: Pool, forbindelse: Forbindelse): Pool {
  const { config } = pool as unknown as { config: unknown };
  const forelder = {
    config,
    get connected() {
      return pool.connected;
    },
    // `mssql` validerer tegnparametrene mot sorteringen forbindelsen leste ved innloggingen.
    get collation() {
      return forbindelse.databaseCollation;
    },
    acquire(_requester: unknown, callback: (...a: unknown[]) => void) {
      setImmediate(callback, null, forbindelse, config);
      return this;
    },
    release() {
      return this;
    },
    request: () => new sql.Request(forelder as unknown as Pool),
  };
  return forelder as unknown as Pool;
}

function nullstill(forbindelse: Forbindelse): Promise<void> {
  return new Promise((ok, feil) => forbindelse.reset((f) => (f ? feil(f) : ok())));
}

/** Etter nullstillingen: ingen åpen transaksjon og ingen kontekstnøkkel med verdi. */
async function kontrollerRen(forelder: sql.ConnectionPool): Promise<void> {
  const svar = await new sql.Request(forelder).query<{ trancount: number; satt: number }>(
    `SELECT @@TRANCOUNT AS trancount,
            (SELECT COUNT(*) FROM (VALUES ${KONTEKSTNOEKLER.map((n) => `(N'${n}')`).join(', ')}) AS n (navn)
              WHERE SESSION_CONTEXT(n.navn) IS NOT NULL) AS satt`
  );
  const { trancount, satt } = svar.recordset[0];
  if (trancount !== 0 || satt !== 0)
    throw new Error(
      `Etter nullstillingen: @@TRANCOUNT ${trancount}, ${satt} kontekstnøkler med verdi.`
    );
}

/**
 * Lukker forbindelsen og gir den til poolen, som forkaster den ved valideringen.
 * En feil her erstatter ikke svaret eller feilen fra transaksjonen; den logges.
 */
export function forkast(pool: Pool, forbindelse: Forbindelse): void {
  forbindelse.hasError = true;
  for (const steg of [
    () => forbindelse.close(),
    () => (pool as unknown as Utlaan).release(forbindelse),
  ]) {
    try {
      steg();
    } catch (feil) {
      console.error('Datalaget: forkastingen av forbindelsen feilet:', feil);
    }
  }
}

/**
 * Nullstiller forbindelsen og kontrollerer den. Usann betyr at den må forkastes,
 * og årsaken logges, så en feil som gjentar seg, er synlig.
 */
async function nullstillOgKontroller(
  forbindelse: Forbindelse,
  forelder: sql.ConnectionPool
): Promise<boolean> {
  try {
    await nullstill(forbindelse);
    await kontrollerRen(forelder);
    return true;
  } catch (feil) {
    console.error('Datalaget: forbindelsen forkastes etter nullstillingen:', feil);
    return false;
  }
}

/** Fristen for én transaksjon: om den er utløpt, og om COMMIT er sendt. */
interface Frist {
  utloept: boolean;
  commitSendt: boolean;
}

/**
 * Én transaksjon med konteksten satt først, skrivebeskyttet for sesjonen og
 * bundet til transaksjonen med `koe_tx`. Kaster `arbeid`, rulles transaksjonen
 * tilbake og feilen kastes videre. Returnerer `arbeid` en `Tilbakerulling`, rulles
 * transaksjonen tilbake og svaret i den returneres; feiler ROLLBACK, forkastes
 * forbindelsen, så serveren ruller tilbake, og svaret returneres likevel. Har serveren rullet tilbake uten at arbeidet
 * kastet, eller under COMMIT, kastes `TransaksjonAvbrutt`. Feiler COMMIT uten
 * det, kastes `UsikkertUtfall`. Sendes ikke COMMIT, kastes `CommitIkkeSendt`.
 * Forbindelsen går tilbake i poolen bare når transaksjonen er avsluttet og
 * forbindelsen er nullstilt og kontrollert; ellers forkastes den.
 *
 * Er COMMIT ikke sendt innen `frist` millisekunder fra lånet, lukkes forbindelsen:
 * en pågående forespørsel avbrytes, serveren ruller tilbake, og `FristUtloept`
 * kastes, også når arbeidet returnerer en `Tilbakerulling`. COMMIT som er sendt,
 * avbrytes ikke, for da ville et kjent utfall blitt usikkert; den har grensen til
 * forespørselen. `frist` kan bare settes lavere enn `TRANSAKSJONSFRIST_MS`.
 */
export async function transaksjon<T>(
  pool: Pool,
  kontekst: Kontekst,
  arbeid: (foresp: Foresp) => Promise<T | Tilbakerulling<T>>,
  { frist = TRANSAKSJONSFRIST_MS }: { frist?: number } = {}
): Promise<T> {
  kontroller(kontekst);
  if (!(frist > 0 && frist <= TRANSAKSJONSFRIST_MS))
    throw new RangeError(`Fristen ${frist} ms er ikke over 0 og høyst ${TRANSAKSJONSFRIST_MS} ms.`);
  const utlaan = pool as unknown as Utlaan;
  const forbindelse = await utlaan.acquire(pool);
  const forelder = reservasjon(pool, forbindelse);
  const tilstand: Frist = { utloept: false, commitSendt: false };
  const tidtaker = setTimeout(() => {
    if (tilstand.commitSendt) return;
    tilstand.utloept = true;
    try {
      forbindelse.close();
    } catch (feil) {
      console.error('Datalaget: lukkingen ved fristen feilet:', feil);
    }
  }, frist);
  let gjenbrukbar = false;
  try {
    const utfall = await iTransaksjon(forelder, forbindelse, kontekst, arbeid, tilstand);
    if (tilstand.utloept)
      throw new FristUtloept(
        `Transaksjonen nådde fristen på ${frist} ms før COMMIT; forbindelsen er lukket.`,
        { cause: 'feil' in utfall ? utfall.feil : undefined }
      );
    if (utfall.avsluttet) gjenbrukbar = await nullstillOgKontroller(forbindelse, forelder);
    if ('feil' in utfall) throw utfall.feil;
    return 'tilbakerullet' in utfall ? utfall.tilbakerullet : utfall.svar;
  } finally {
    clearTimeout(tidtaker);
    if (gjenbrukbar) utlaan.release(forbindelse);
    else forkast(pool, forbindelse);
  }
}

/**
 * `avsluttet` er sann når serveren har bekreftet COMMIT eller ROLLBACK. `svar` er
 * bare svaret etter en bekreftet COMMIT; svaret i en `Tilbakerulling` er
 * `tilbakerullet`, også når ROLLBACK feilet (#877).
 */
type Utfall<T> =
  | { svar: T; avsluttet: true }
  | { tilbakerullet: T; avsluttet: boolean }
  | { feil: unknown; avsluttet: boolean };

async function iTransaksjon<T>(
  forelder: sql.ConnectionPool,
  forbindelse: Forbindelse,
  kontekst: Kontekst,
  arbeid: (foresp: Foresp) => Promise<T | Tilbakerulling<T>>,
  frist: Frist
): Promise<Utfall<T>> {
  const tx = new sql.Transaction(forelder);
  // Forespørslene har transaksjonen som forelder, og `mssql` validerer tegnparametrene
  // i en batch mot `parent.collation`, som `Transaction` ikke har (#894-3).
  Object.defineProperty(tx, 'collation', { get: () => forbindelse.databaseCollation });
  let avbruttAvServeren = false;
  tx.on('rollback', (avbrutt: boolean) => (avbruttAvServeren ||= avbrutt));
  try {
    await tx.begin();
  } catch (feil) {
    return { feil, avsluttet: false };
  }
  const foresp = () => new sql.Request(tx);
  let svar: T | Tilbakerulling<T>;
  try {
    await foresp()
      .input('aktor', sql.UniqueIdentifier, kontekst.aktor)
      .input('prosjekt', sql.NVarChar(100), kontekst.prosjekt)
      .input('side', sql.NVarChar(2), kontekst.side ?? null)
      .input('team', sql.NVarChar(32), kontekst.team ?? null)
      .batch(
        `DECLARE @tx bigint = CURRENT_TRANSACTION_ID();
         EXEC sp_set_session_context N'koe_aktor', @aktor, @read_only = 1;
         EXEC sp_set_session_context N'koe_prosjekt', @prosjekt, @read_only = 1;
         EXEC sp_set_session_context N'koe_side', @side, @read_only = 1;
         EXEC sp_set_session_context N'koe_team', @team, @read_only = 1;
         EXEC sp_set_session_context N'koe_tx', @tx, @read_only = 1;`
      );
    svar = await arbeid(foresp);
  } catch (feil) {
    // Med XACT_ABORT har serveren alt rullet tilbake; kontrollen etter nullstillingen bekrefter det.
    if (avbruttAvServeren) return { feil, avsluttet: true };
    try {
      await tx.rollback();
      return { feil, avsluttet: true };
    } catch {
      return { feil, avsluttet: false };
    }
  }
  // Har serveren alt rullet tilbake, er det utfallet arbeidet ba om. Tilbakerullingen
  // fra serveren kan komme i neste runde, som før COMMIT (#923).
  if (svar instanceof Tilbakerulling) {
    await new Promise((ok) => setImmediate(ok));
    if (avbruttAvServeren) return { tilbakerullet: svar.svar, avsluttet: true };
    try {
      await tx.rollback();
      return { tilbakerullet: svar.svar, avsluttet: true };
    } catch {
      return { tilbakerullet: svar.svar, avsluttet: false };
    }
  }
  const avbrutt = (): Utfall<T> | null =>
    avbruttAvServeren
      ? {
          feil: new TransaksjonAvbrutt('Serveren rullet tilbake transaksjonen før COMMIT.', {
            cause: (tx as unknown as { _abortReason?: unknown })._abortReason,
          }),
          avsluttet: true,
        }
      : null;
  return avbrutt() ?? committ(tx, forbindelse, svar, avbrutt, frist);
}

/**
 * Ruller serveren tilbake under COMMIT, ville `_abort` i `mssql` nulle
 * forbindelsen før callbacket til COMMIT bruker den, og `TypeError` når
 * prosessen mens løftet aldri avgjøres (#534). Under COMMIT lytter derfor
 * hjelperen selv på `rollbackTransaction` i stedet for `_abort`.
 */
async function committ<T>(
  tx: sql.Transaction,
  forbindelse: Forbindelse,
  svar: T,
  avbrutt: () => Utfall<T> | null,
  frist: Frist
): Promise<Utfall<T>> {
  // En forespørsel arbeidet ikke ventet på, låner forbindelsen først i neste runde
  // av hendelsesløkka. Pågår den, ville COMMIT gått før den eller blitt avvist med
  // EREQINPROG (#543 punkt 3).
  await new Promise((ok) => setImmediate(ok));
  // Serveren kan ha rullet tilbake i samme runde (#894-1).
  const iVentingen = avbrutt();
  if (iVentingen) return iVentingen;
  if (frist.utloept) return { feil: undefined, avsluttet: false };
  const { _abort: avbryt, _activeRequest: aktiv } = tx as unknown as {
    _abort: () => void;
    _activeRequest: unknown;
  };
  if (aktiv)
    return {
      feil: new CommitIkkeSendt(
        'En forespørsel pågikk da arbeidet var ferdig; COMMIT sendes ikke.'
      ),
      avsluttet: false,
    };
  if (!forbindelse.listeners('rollbackTransaction').includes(avbryt))
    return {
      feil: new CommitIkkeSendt(
        'Transaksjonen i mssql lytter ikke med `_abort`; COMMIT sendes ikke.'
      ),
      avsluttet: false,
    };
  let rulletTilbake = false;
  const merk = () => (rulletTilbake = true);
  forbindelse.removeListener('rollbackTransaction', avbryt);
  forbindelse.on('rollbackTransaction', merk);
  frist.commitSendt = true;
  try {
    await tx.commit();
    // Rullet serveren tilbake uten at COMMIT feilet, er utfallet likevel kjent (#543).
    if (rulletTilbake)
      return {
        feil: new TransaksjonAvbrutt('Serveren rullet tilbake transaksjonen under COMMIT.'),
        avsluttet: true,
      };
    return { svar, avsluttet: true };
  } catch (feil) {
    if (rulletTilbake)
      return {
        feil: new TransaksjonAvbrutt('Serveren rullet tilbake transaksjonen under COMMIT.', {
          cause: feil,
        }),
        avsluttet: true,
      };
    return {
      feil: new UsikkertUtfall('COMMIT feilet eller fikk ikke svar; utfallet er usikkert.', {
        cause: feil,
      }),
      avsluttet: false,
    };
  } finally {
    forbindelse.removeListener('rollbackTransaction', merk);
  }
}
