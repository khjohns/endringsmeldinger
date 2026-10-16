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
 * `_abortReason` på transaksjonen, hendelsen `rollbackTransaction`,
 * `reset`, `close` og `hasError` på forbindelsen. Versjonen av `mssql` er låst
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
  const f = feil as { number?: number; originalError?: { info?: { number?: number } } };
  return f?.number ?? f?.originalError?.info?.number;
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

/** Forbindelsen fra `tedious`, med det `transaksjon` bruker. */
export interface Forbindelse {
  reset(callback: (feil?: Error) => void): void;
  close(): void;
  on(hendelse: 'rollbackTransaction', lytter: () => void): void;
  removeListener(hendelse: 'rollbackTransaction', lytter: () => void): void;
  listeners(hendelse: 'rollbackTransaction'): unknown[];
  hasError?: boolean;
}

interface Utlaan {
  acquire(requester: unknown): Promise<Forbindelse>;
  release(forbindelse: Forbindelse): void;
}

/**
 * En pool der hver forbindelse har `xact_abort` på. `tedious` setter det ved
 * innloggingen og etter hver nullstilling. `maks` går foran `konfig.pool.max`,
 * og standarden er 10.
 */
export async function opprettPool(
  konfig: sql.config,
  { maks }: { maks?: number } = {}
): Promise<Pool> {
  const max = maks ?? konfig.pool?.max ?? 10;
  const min = konfig.pool?.min ?? 0;
  if (min > max) throw new RangeError(`Poolen har min ${min}, som er over maks ${max}.`);
  return new sql.ConnectionPool({
    ...konfig,
    options: { encrypt: true, ...konfig.options, abortTransactionOnError: true },
    pool: { ...konfig.pool, min, max },
  }).connect();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
 * Forelderen til transaksjonen og forespørslene: den gir ut den reserverte
 * forbindelsen og gir den aldri tilbake til poolen. `mssql` gir forbindelsen
 * tilbake før kallerens callback når COMMIT eller ROLLBACK er ferdig, også når
 * de feiler (#419); her blir det en tom operasjon.
 */
function reservasjon(pool: Pool, forbindelse: Forbindelse) {
  const { config } = pool as unknown as { config: unknown };
  return {
    config,
    get connected() {
      return pool.connected;
    },
    acquire(_requester: unknown, callback: (...a: unknown[]) => void) {
      setImmediate(callback, null, forbindelse, config);
      return this;
    },
    release() {
      return this;
    },
  } as unknown as sql.ConnectionPool;
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
function forkast(pool: Pool, forbindelse: Forbindelse): void {
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

/**
 * Én transaksjon med konteksten satt først, skrivebeskyttet for sesjonen og
 * bundet til transaksjonen med `koe_tx`. Kaster `arbeid`, rulles transaksjonen
 * tilbake og feilen kastes videre. Har serveren rullet tilbake uten at arbeidet
 * kastet, eller under COMMIT, kastes `TransaksjonAvbrutt`. Feiler COMMIT uten
 * det, kastes `UsikkertUtfall`.
 * Forbindelsen går tilbake i poolen bare når transaksjonen er avsluttet og
 * forbindelsen er nullstilt og kontrollert; ellers forkastes den.
 */
export async function transaksjon<T>(
  pool: Pool,
  kontekst: Kontekst,
  arbeid: (foresp: () => sql.Request) => Promise<T>
): Promise<T> {
  kontroller(kontekst);
  const utlaan = pool as unknown as Utlaan;
  const forbindelse = await utlaan.acquire(pool);
  const forelder = reservasjon(pool, forbindelse);
  let gjenbrukbar = false;
  try {
    const utfall = await iTransaksjon(forelder, forbindelse, kontekst, arbeid);
    if (utfall.avsluttet) gjenbrukbar = await nullstillOgKontroller(forbindelse, forelder);
    if ('feil' in utfall) throw utfall.feil;
    return utfall.svar;
  } finally {
    if (gjenbrukbar) utlaan.release(forbindelse);
    else forkast(pool, forbindelse);
  }
}

/** `avsluttet` er sann når serveren har bekreftet COMMIT eller ROLLBACK. */
type Utfall<T> = { svar: T; avsluttet: true } | { feil: unknown; avsluttet: boolean };

async function iTransaksjon<T>(
  forelder: sql.ConnectionPool,
  forbindelse: Forbindelse,
  kontekst: Kontekst,
  arbeid: (foresp: () => sql.Request) => Promise<T>
): Promise<Utfall<T>> {
  const tx = new sql.Transaction(forelder);
  let avbruttAvServeren = false;
  tx.on('rollback', (avbrutt: boolean) => (avbruttAvServeren ||= avbrutt));
  try {
    await tx.begin();
  } catch (feil) {
    return { feil, avsluttet: false };
  }
  const foresp = () => new sql.Request(tx);
  let svar: T;
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
  if (avbruttAvServeren)
    return {
      feil: new TransaksjonAvbrutt('Serveren rullet tilbake transaksjonen før COMMIT.', {
        cause: (tx as unknown as { _abortReason?: unknown })._abortReason,
      }),
      avsluttet: true,
    };
  return committ(tx, forbindelse, svar);
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
  svar: T
): Promise<Utfall<T>> {
  const { _abort: avbryt } = tx as unknown as { _abort: () => void };
  if (!forbindelse.listeners('rollbackTransaction').includes(avbryt))
    return {
      feil: new Error('Transaksjonen i mssql lytter ikke med `_abort`; COMMIT sendes ikke.'),
      avsluttet: false,
    };
  let rulletTilbake = false;
  const merk = () => (rulletTilbake = true);
  forbindelse.removeListener('rollbackTransaction', avbryt);
  forbindelse.on('rollbackTransaction', merk);
  try {
    await tx.commit();
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
