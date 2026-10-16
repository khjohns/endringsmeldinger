/**
 * Poolen og transaksjonshjelperen mot SQL Server for F0b (#419, DL-U1).
 *
 * Konteksten står i `SESSION_CONTEXT`, som gjelder sesjonen, og `mssql`
 * nullstiller ikke en forbindelse når poolen gir den ut igjen (SQ-02).
 * `transaksjon` reserverer derfor forbindelsen fra lånet til den er nullstilt
 * med `sp_reset_connection` og kontrollert. Feiler COMMIT, ROLLBACK,
 * nullstillingen eller kontrollen, forkastes forbindelsen og går ikke tilbake
 * i poolen, og serveren ruller tilbake det som var åpent. `koe_tx` binder i
 * tillegg konteksten til transaksjonen (SQ-03).
 *
 * Tilkoblingen tar en `mssql`-konfigurasjon, så pålogging med SQL-bruker
 * (testbasen) og Entra/managed identity (Azure, A4 i #78) går gjennom samme vei.
 */

import sql from 'mssql';

export { sql };
export type Pool = sql.ConnectionPool;

export interface Kontekst {
  /** `app_users.id`. */
  aktor: string;
  prosjekt: string;
  side?: 'TE' | 'BH';
  /** SHA-256 i heks av team-ID-en, som i prøven. */
  team?: string;
}

/** Nøklene `transaksjon` setter i `SESSION_CONTEXT`, med samme navn som prøven (02_sikkerhet.sql). */
export const KONTEKSTNOEKLER = [
  'koe_aktor',
  'koe_prosjekt',
  'koe_side',
  'koe_team',
  'koe_tx',
] as const;

/** Konteksten er ugyldig. Ingen forbindelse er lånt. */
export class UgyldigKontekst extends Error {}

/**
 * COMMIT feilet eller fikk ikke svar. Serveren kan ha committet, så utfallet er
 * usikkert. Forbindelsen er forkastet.
 */
export class UsikkertUtfall extends Error {}

/**
 * Serveren rullet tilbake transaksjonen, etter en feil med XACT_ABORT eller en
 * ROLLBACK, uten at arbeidet kastet. Utfallet er kjent: transaksjonen er ikke
 * committet. Serverfeilen står i `cause` når `mssql` har den.
 */
export class TransaksjonAvbrutt extends Error {}

/** Forbindelsen fra `tedious`, med det `transaksjon` bruker. */
export interface Forbindelse {
  reset(callback: (feil?: Error) => void): void;
  close(): void;
  commitTransaction(callback: (feil?: Error) => void, ...rest: unknown[]): void;
  hasError?: boolean;
}

interface Utlaan {
  acquire(requester: unknown): Promise<Forbindelse>;
  release(forbindelse: Forbindelse): void;
}

/**
 * En pool der hver forbindelse har `xact_abort` på. `tedious` setter det ved
 * innloggingen og etter hver nullstilling.
 */
export async function opprettPool(
  konfig: sql.config,
  { maks = 10 }: { maks?: number } = {}
): Promise<Pool> {
  return new sql.ConnectionPool({
    ...konfig,
    options: { encrypt: true, ...konfig.options, abortTransactionOnError: true },
    pool: { min: 0, ...konfig.pool, max: maks },
  }).connect();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEAM = /^[0-9a-f]{64}$/;

function kontroller(k: Kontekst): void {
  if (typeof k?.aktor !== 'string' || !UUID.test(k.aktor))
    throw new UgyldigKontekst('Aktøren er ikke en UUID.');
  if (typeof k.prosjekt !== 'string' || k.prosjekt.trim() === '' || k.prosjekt.length > 100)
    throw new UgyldigKontekst('Prosjektet mangler eller er lengre enn 100 tegn.');
  if (k.side !== undefined && k.side !== 'TE' && k.side !== 'BH')
    throw new UgyldigKontekst('Siden er verken TE eller BH.');
  if (k.team !== undefined && (typeof k.team !== 'string' || !TEAM.test(k.team)))
    throw new UgyldigKontekst('Teamet er ikke 64 tegn heks.');
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
    acquire(_requester: unknown, callback?: (...a: unknown[]) => void) {
      if (callback) {
        setImmediate(callback, null, forbindelse, config);
        return this;
      }
      return Promise.resolve(forbindelse);
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

/** Lukker forbindelsen og gir den til poolen, som forkaster den ved valideringen. */
function forkast(pool: Pool, forbindelse: Forbindelse): void {
  forbindelse.hasError = true;
  try {
    forbindelse.close();
  } finally {
    (pool as unknown as Utlaan).release(forbindelse);
  }
}

/** Nullstiller forbindelsen og kontrollerer den. Usann betyr at den må forkastes. */
async function nullstillOgKontroller(
  forbindelse: Forbindelse,
  forelder: sql.ConnectionPool
): Promise<boolean> {
  try {
    await nullstill(forbindelse);
    await kontrollerRen(forelder);
    return true;
  } catch {
    return false;
  }
}

/**
 * Én transaksjon med konteksten satt først, skrivebeskyttet for sesjonen og
 * bundet til transaksjonen med `koe_tx`. Kaster `arbeid`, rulles transaksjonen
 * tilbake og feilen kastes videre. Har serveren rullet tilbake uten at arbeidet
 * kastet, kastes `TransaksjonAvbrutt`. Feiler COMMIT, kastes `UsikkertUtfall`.
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
    const utfall = await iTransaksjon(forelder, kontekst, arbeid);
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
      .input('team', sql.NVarChar(64), kontekst.team ?? null)
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
  try {
    await tx.commit();
  } catch (feil) {
    return {
      feil: new UsikkertUtfall('COMMIT feilet eller fikk ikke svar; utfallet er usikkert.', {
        cause: feil,
      }),
      avsluttet: false,
    };
  }
  return { svar, avsluttet: true };
}
