/**
 * Veien fra migrasjonsfil til base i SQL Server (#53, oppdragsgiver 16.10).
 *
 * Filene i `database/migrasjoner/` heter `ÅÅÅÅMMDDTTMMSS_navn.sql`. Prefikset er
 * versjonen, og filnavnrekkefølgen er rekkefølgen de anvendes i. Hver fil deles
 * på linjer med bare `GO` utenfor tekster og kommentarer og anvendes i én
 * transaksjon, sammen med raden i `koe_migrering.historikk`, som lagrer
 * versjonen og sha256 av hele fila. En fil som avslutter transaksjonen selv,
 * avvises før raden skrives.
 *
 * Runneren nekter å anvende noe når en anvendt fil er endret (også bare i en
 * kommentar), mangler, eller når en ny fil har lavere versjon enn en anvendt.
 * Én applås i basen, eid av runnerens sesjon, gjør at to runnere ikke anvender
 * samme fil.
 *
 * Runneren kjøres som `dbo`, databaseeieren, og avviser andre identiteter (#564).
 * Da eies skjemaene filene lager, av `dbo`, og eierskapskjeden fra `koe_api` og
 * `koe_drift` til tabellene og predikatene holder (#567). Å gi skjemaene eieren
 * `dbo` i ettertid ville fjernet rettighetene på objektene i dem. Hvem som er
 * databaseeier, hører til utrullingen (A8 og A9 i #78).
 *
 * Historikktabellen er runnerens bokføring og lages av runneren selv; alt annet
 * i skjemaet kommer fra filene (`.claude/rules/database.md`).
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';
import { reservasjon, type Forbindelse } from './datalag.ts';

export const MIGRASJONSMAPPE = fileURLToPath(new URL('../database/migrasjoner/', import.meta.url));

const FILNAVN = /^(\d{14})_[a-z0-9_]+\.sql$/;
// `\r` er med for en `GO`-linje som slutter på en enslig CR (#577).
const GO = /^[ \t\r]*GO[ \t\r]*(?:--[^\n]*)?$/i;
/** `GO` fulgt av noe annet enn et navn, som `GO 5`, `GO;` og `GO` med en blokkommentar. */
const ANNEN_GO = /^[ \t\r]*GO(?![\p{L}\p{N}_@#$])/iu;
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const APPLAAS = 'koe_migrering';
const LAASVENT = 60_000;
/**
 * Den laveste tidsgrensen for runnerens forespørsler. Den er over låseventen, så
 * en runner som venter på applåsen, avvises med `MigreringAvvist` og ikke med
 * `ETIMEOUT` fra poolen, som har 15 s som standard (#564).
 */
const TIDSGRENSE = LAASVENT + 30_000;

export interface Migrasjon {
  versjon: string;
  filnavn: string;
  sha256: string;
  satser: string[];
}

export interface Anvendt {
  versjon: string;
  filnavn: string;
  sha256: string;
}

export class MigreringAvvist extends Error {
  override name = 'MigreringAvvist';
}

type Tilstand =
  | { i: 'kode' }
  | { i: 'tekst' | 'navn' | 'sitert'; slutt: string; linje: number }
  | { i: 'kommentar'; dybde: number; linje: number };

/** Tilstanden etter `linje` (nummer `nr`), fra tilstanden før den. */
function skann(linje: string, nr: number, foer: Tilstand): Tilstand {
  let t = foer;
  for (let k = 0; k < linje.length; k++) {
    const to = linje.slice(k, k + 2);
    if (t.i === 'kode') {
      if (to === '--') return t;
      if (to === '/*') {
        t = { i: 'kommentar', dybde: 1, linje: nr };
        k++;
      } else if (linje[k] === "'") t = { i: 'tekst', slutt: "'", linje: nr };
      else if (linje[k] === '[') t = { i: 'navn', slutt: ']', linje: nr };
      else if (linje[k] === '"') t = { i: 'sitert', slutt: '"', linje: nr };
    } else if (t.i === 'kommentar') {
      if (to === '/*' || to === '*/') {
        const dybde = t.dybde + (to === '/*' ? 1 : -1);
        t = dybde === 0 ? { i: 'kode' } : { ...t, dybde };
        k++;
      }
    } else if (linje[k] === t.slutt) {
      // `''`, `]]` og `""` er tegnet selv, ikke slutten.
      if (linje[k + 1] === t.slutt) k++;
      else t = { i: 'kode' };
    }
  }
  return t;
}

const BESKRIVELSE = {
  tekst: 'Teksten',
  navn: 'Navnet i hakeparentes',
  sitert: 'Navnet i anførselstegn',
  kommentar: 'Kommentaren',
};

/**
 * Teksten delt på linjer med bare `GO`, uten tomme satser. `GO` i en tekst, et
 * navn eller en kommentar er en del av satsen. `GO` med noe annet etter enn en
 * `--`-kommentar, og en tekst eller kommentar som ikke er avsluttet, avvises med
 * linjenummeret.
 */
export function delPaaGo(tekst: string): string[] {
  const satser: string[] = [];
  let linjer: string[] = [];
  let t: Tilstand = { i: 'kode' };
  for (const [i, linje] of tekst.split(/\r?\n/).entries()) {
    if (t.i === 'kode' && GO.test(linje)) {
      satser.push(linjer.join('\n'));
      linjer = [];
      continue;
    }
    if (t.i === 'kode' && ANNEN_GO.test(linje))
      throw new MigreringAvvist(
        `Linje ${i + 1} begynner med GO, men har mer enn GO og en --kommentar. Runneren deler bare på GO alene.`
      );
    linjer.push(linje);
    t = skann(linje, i + 1, t);
  }
  if (t.i !== 'kode')
    throw new MigreringAvvist(
      `${BESKRIVELSE[t.i]} som begynner på linje ${t.linje}, er ikke avsluttet.`
    );
  satser.push(linjer.join('\n'));
  return satser.filter((s) => s.trim() !== '');
}

/** `filer` sortert på versjon. To filer med samme versjon avvises. */
function ordne(filer: Migrasjon[]): Migrasjon[] {
  const ordnet = [...filer].sort((a, b) =>
    a.versjon < b.versjon ? -1 : a.versjon > b.versjon ? 1 : 0
  );
  for (const [i, f] of ordnet.entries())
    if (i > 0 && ordnet[i - 1].versjon === f.versjon)
      throw new MigreringAvvist(`To filer har versjonen ${f.versjon}.`);
  return ordnet;
}

/**
 * Migrasjonene i `mappe`, sortert på versjon. En fil med en annen endelse eller
 * et annet navn enn formen, eller med UTF-8-BOM, avvises.
 */
export function lesMigrasjoner(mappe = MIGRASJONSMAPPE): Migrasjon[] {
  return ordne(
    readdirSync(mappe).map((filnavn) => {
      if (!filnavn.endsWith('.sql'))
        throw new MigreringAvvist(
          `${filnavn} har ikke endelsen .sql. Mappa skal bare ha migrasjonsfiler.`
        );
      const treff = FILNAVN.exec(filnavn);
      if (!treff) throw new MigreringAvvist(`${filnavn} har ikke formen ÅÅÅÅMMDDTTMMSS_navn.sql.`);
      const innhold = readFileSync(join(mappe, filnavn));
      if (innhold.subarray(0, 3).equals(BOM))
        throw new MigreringAvvist(`${filnavn} begynner med UTF-8-BOM. Lagre fila uten.`);
      let satser: string[];
      try {
        satser = delPaaGo(innhold.toString('utf8'));
      } catch (feil) {
        if (feil instanceof MigreringAvvist)
          throw new MigreringAvvist(`${filnavn}: ${somSetning(feil)}`, { cause: feil });
        throw feil;
      }
      return {
        versjon: treff[1],
        filnavn,
        sha256: createHash('sha256').update(innhold).digest('hex'),
        satser,
      };
    })
  );
}

/**
 * Det som hindrer at `filer` anvendes på en base med `anvendt`, og filene som
 * ikke er anvendt og kommer etter den høyeste anvendte versjonen, i rekkefølge.
 * Tom `funn` betyr at de anvendte filene er uendret og at de nye kommer etter dem.
 * En fil som ikke er anvendt, står enten i `funn` eller i `nye`.
 */
export function vurder(
  anvendt: Anvendt[],
  filer: Migrasjon[]
): { funn: string[]; nye: Migrasjon[] } {
  const perVersjon = new Map(filer.map((f) => [f.versjon, f]));
  const funn: string[] = [];
  for (const a of anvendt) {
    const fil = perVersjon.get(a.versjon);
    if (!fil) funn.push(`${a.filnavn} er anvendt, men finnes ikke i mappa.`);
    else if (fil.sha256 !== a.sha256 || fil.filnavn !== a.filnavn)
      funn.push(`${a.filnavn} er endret etter at den ble anvendt.`);
  }
  const hoeyeste = anvendt.reduce((m, a) => (a.versjon > m ? a.versjon : m), '');
  const kjent = new Set(anvendt.map((a) => a.versjon));
  const nye: Migrasjon[] = [];
  for (const f of filer) {
    if (kjent.has(f.versjon)) continue;
    if (f.versjon < hoeyeste)
      funn.push(`${f.filnavn} er ikke anvendt og kommer foran ${hoeyeste}, som er anvendt.`);
    else nye.push(f);
  }
  return { funn, nye };
}

/** `funn` fra `vurder()`. */
export function avvik(anvendt: Anvendt[], filer: Migrasjon[]): string[] {
  return vurder(anvendt, filer).funn;
}

const HISTORIKK = `
IF SCHEMA_ID(N'koe_migrering') IS NULL EXEC (N'CREATE SCHEMA koe_migrering');
IF OBJECT_ID(N'koe_migrering.historikk', N'U') IS NULL
  CREATE TABLE koe_migrering.historikk (
    versjon char(14) NOT NULL CONSTRAINT historikk_pk PRIMARY KEY
      CONSTRAINT historikk_versjon_tegnklasse
        CHECK (NOT versjon COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
    filnavn nvarchar(260) NOT NULL,
    sha256 char(64) NOT NULL,
    anvendt datetime2(3) NOT NULL
      CONSTRAINT historikk_anvendt DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME())
  );`;

/**
 * Tidsgrensen `mssql` gir forespørslene med `config`, i ms, der 0 er uten grense:
 * `options.requestTimeout`, så `requestTimeout`, så `timeout`, ellers 15 s, og en
 * negativ eller uendelig grense er uten grense (`tedious/connection-pool.js`).
 */
function poolensGrense(config: sql.config & { timeout?: number }): number {
  const grense =
    config.options?.requestTimeout ?? config.requestTimeout ?? config.timeout ?? 15_000;
  if (Number.isNaN(grense)) return 15_000;
  return grense < 0 || grense === Infinity ? 0 : grense;
}

/**
 * Konfigurasjonen for runnerens egen forbindelse: poolens, med én forbindelse og
 * tidsgrensen `TIDSGRENSE` når poolens er lavere. En pool uten grense beholdes
 * uten, så en lang sats får poolens grense (#564, #641). Grensen settes både på
 * toppnivå og i `options`, der `mssql` leser den først.
 */
export function egenKonfig(pool: sql.ConnectionPool): sql.config {
  const { config } = pool as unknown as { config: sql.config };
  const grense = poolensGrense(config);
  const requestTimeout = grense === 0 ? 0 : Math.max(grense, TIDSGRENSE);
  return {
    ...config,
    requestTimeout,
    options: { ...config.options, requestTimeout },
    pool: { ...config.pool, min: 1, max: 1 },
  };
}

/** Identiteten runneren krever, så skjemaene filene lager, eies av databaseeieren. */
const EIER = 'dbo';

/** Avviser en annen identitet enn `EIER` før runneren tar applåsen. */
async function kontrollerIdentitet(egen: sql.ConnectionPool): Promise<void> {
  const { bruker } = await tilstand(egen);
  if (bruker !== EIER)
    throw new MigreringAvvist(`Runneren kjøres som ${bruker}, ikke som databaseeieren ${EIER}.`);
}

/**
 * En sats byttet identiteten uten `REVERT`. Forbindelsen ryddes da ikke, for den
 * kjører som en annen og kan miste tilgangen til basen når transaksjonen rulles
 * tilbake. Serveren ruller tilbake og slipper applåsen når den lukkes.
 */
class IdentitetByttet extends MigreringAvvist {}

/**
 * Applåsen eies av sesjonen, så en `COMMIT` i en fil ikke slipper den, og av
 * `db_owner`, så en bruker utenfor rollen, som kjøretiden, ikke kan ta den
 * (#576, #564). Den slippes når forbindelsen lukkes.
 */
async function laas(egen: sql.ConnectionPool): Promise<void> {
  const svar = await egen
    .request()
    .input('ressurs', sql.NVarChar(255), APPLAAS)
    .query<{
      r: number;
    }>(
      `DECLARE @r int;
     EXEC @r = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Session',
       @LockTimeout = ${LAASVENT}, @DbPrincipal = N'db_owner';
     SELECT @r AS r;`
    );
  if (svar.recordset[0].r < 0)
    throw new MigreringAvvist(`Fikk ikke applåsen for migreringen på ${LAASVENT / 1000} s.`);
}

interface Forbindelsestilstand {
  /** Transaksjonen forbindelsen er i, og hvor mange nivåer den har. */
  id: string;
  nivaa: number;
  laas: string | null;
  /** `#koe_migrering` finnes. Runneren lager den i sin transaksjon og sletter den før COMMIT. */
  merket: boolean;
  /** `USER_NAME()`: en sats med `EXECUTE AS` uten `REVERT` bytter den for resten av sesjonen. */
  bruker: string;
}

async function tilstand(egen: sql.ConnectionPool): Promise<Forbindelsestilstand> {
  const svar = await egen
    .request()
    .input('ressurs', sql.NVarChar(255), APPLAAS)
    .input('eier', sql.NVarChar(128), EIER)
    .query<{
      id: string | null;
      nivaa: number;
      laas: string | null;
      merket: boolean;
      bruker: string;
    }>(
      // APPLOCK_MODE feiler for en bruker utenfor db_owner, så etter et
      // identitetsbytte leses den ikke, og avvisningen sier hvem satsen byttet til.
      `SELECT CONVERT(varchar(20), CURRENT_TRANSACTION_ID()) AS id, @@TRANCOUNT AS nivaa,
            CASE WHEN USER_NAME() = @eier THEN APPLOCK_MODE(N'db_owner', @ressurs, N'Session') END AS laas,
            CAST(CASE WHEN OBJECT_ID(N'tempdb..#koe_migrering') IS NULL THEN 0 ELSE 1 END AS bit) AS merket,
            USER_NAME() AS bruker`
    );
  const t = svar.recordset?.[0];
  // Uten rad, for eksempel etter `SET NOEXEC ON` i en sats, er tilstanden ukjent.
  if (!t)
    throw new MigreringAvvist('Forbindelsen svarte uten tilstanden, så den kunne ikke leses.');
  return { ...t, id: t.id ?? '' };
}

/**
 * Feilmeldingen som én setning, så teksten etter den ikke henger rett på. Et
 * punktum foran et avsluttende sitattegn eller en parentes avslutter også. En
 * `code` fra Node, `tedious` eller `mssql` står foran meldingen når meldingen
 * ikke har den, men ikke for en feil fra SQL Server (med `number`), der meldingen
 * er serverens.
 */
export function somSetning(feil: unknown): string {
  const { code, number } = (feil ?? {}) as { code?: unknown; number?: unknown };
  let tekst = (feil instanceof Error ? feil.message : String(feil)).trim() || String(feil);
  if (typeof code === 'string' && code && typeof number !== 'number' && !tekst.includes(code))
    tekst = `${code}: ${tekst}`;
  return /[.!?…]['"’”)\]]*$/.test(tekst) ? tekst : `${tekst}.`;
}

/**
 * Hva som er lagret når runnerens transaksjon ikke lenger er åpen. Finnes merket
 * da, ble transaksjonen committet av fila, ikke rullet tilbake.
 */
async function lagret(egen: sql.ConnectionPool, runnerens: Forbindelsestilstand): Promise<string> {
  let etter: Forbindelsestilstand;
  try {
    etter = await tilstand(egen);
  } catch {
    return ' Tilstanden etter feilen kunne ikke leses, så det fila gjorde før en COMMIT, kan være lagret.';
  }
  if (etter.id !== runnerens.id && etter.merket)
    return ' Fila committet runnerens transaksjon, så det den gjorde før COMMIT, er lagret uten historikkrad.';
  return ' Ingenting fra fila er lagret.';
}

/** `kall`, med en feil fra det gjort om til en avvisning med `sted` og det som er lagret. */
async function iFila<T>(
  egen: sql.ConnectionPool,
  runnerens: Forbindelsestilstand,
  sted: string,
  kall: () => Promise<T>
): Promise<T> {
  try {
    return await kall();
  } catch (feil) {
    throw new MigreringAvvist(`${sted}: ${somSetning(feil)}${await lagret(egen, runnerens)}`, {
      cause: feil,
    });
  }
}

/**
 * Anvender den første fila som ikke er anvendt, i én transaksjon med
 * historikkraden, og returnerer versjonen, eller `undefined` når alle er anvendt.
 */
async function anvendNeste(
  egen: sql.ConnectionPool,
  filer: Migrasjon[],
  kanVaereAnvendt: (versjon: string) => void
): Promise<string | undefined> {
  await egen.request().batch('BEGIN TRANSACTION; CREATE TABLE #koe_migrering (i int);');
  const runnerens = await tilstand(egen);
  if (runnerens.laas !== 'Exclusive')
    throw new MigreringAvvist('Forbindelsen har ikke lenger applåsen for migreringen.');
  await egen.request().batch(HISTORIKK);
  const anvendt = (
    await egen
      .request()
      .query<Anvendt>(
        'SELECT versjon, filnavn, sha256 FROM koe_migrering.historikk ORDER BY versjon'
      )
  ).recordset;
  const { funn, nye } = vurder(anvendt, filer);
  if (funn.length) throw new MigreringAvvist(funn.join(' '));
  const [neste] = nye;
  if (!neste) {
    await egen.request().batch('DROP TABLE #koe_migrering; COMMIT;');
    return undefined;
  }
  for (const [i, sats] of neste.satser.entries()) {
    const sted = `${neste.filnavn}, sats ${i + 1}`;
    await iFila(egen, runnerens, sted, () => egen.request().batch(sats));
    const etter = await iFila(egen, runnerens, sted, () => tilstand(egen));
    if (etter.id !== runnerens.id || etter.nivaa !== runnerens.nivaa)
      throw new MigreringAvvist(
        `${sted}: satsen avsluttet eller åpnet en transaksjon (@@TRANCOUNT ${etter.nivaa}). ` +
          'Runneren anvender hver fil i sin egen transaksjon.' +
          (await lagret(egen, runnerens))
      );
    if (!etter.merket)
      throw new MigreringAvvist(
        `${sted}: satsen slettet #koe_migrering, som runneren ser om fila committet med.` +
          (await lagret(egen, runnerens))
      );
    // Per sats, så verken resten av fila, historikkraden eller de neste filene
    // kjøres som en annen enn `EIER` (#866 punkt 2).
    if (etter.bruker !== EIER)
      throw new IdentitetByttet(
        `${sted}: satsen byttet identiteten fra ${EIER} til ${etter.bruker}.` +
          (await lagret(egen, runnerens))
      );
  }
  try {
    await iFila(egen, runnerens, `${neste.filnavn}, historikkraden`, () =>
      egen
        .request()
        .input('versjon', sql.Char(14), neste.versjon)
        .input('filnavn', sql.NVarChar(260), neste.filnavn)
        .input('sha256', sql.Char(64), neste.sha256)
        .batch(
          // Ikke alle feil avbryter satsen, heller ikke med XACT_ABORT, så uten
          // CATCH kunne COMMIT kjøres etter en feil (#884).
          `BEGIN TRY
             DROP TABLE #koe_migrering;
             INSERT koe_migrering.historikk (versjon, filnavn, sha256) VALUES (@versjon, @filnavn, @sha256);
             COMMIT;
           END TRY
           BEGIN CATCH
             IF @@TRANCOUNT > 0 ROLLBACK;
             THROW;
           END CATCH;`
        )
    );
  } catch (feil) {
    // Nådde COMMIT basen, men ikke svaret runneren, er fila anvendt. Kan raden
    // ikke leses etterpå, er det uvisst.
    const lagret = await egen
      .request()
      .input('versjon', sql.Char(14), neste.versjon)
      .query<{ n: number }>(
        'SELECT COUNT(*) AS n FROM koe_migrering.historikk WHERE versjon = @versjon'
      )
      .then(
        (svar) => (svar.recordset[0]?.n ?? 0) > 0,
        () => undefined
      );
    if (lagret !== false) kanVaereAnvendt(neste.versjon);
    throw feil;
  }
  return neste.versjon;
}

interface Utlaan {
  acquire(requester: unknown): Promise<Forbindelse>;
  release(forbindelse: Forbindelse): void;
}

/**
 * Anvender filene som ikke er anvendt, én transaksjon per fil, og returnerer
 * versjonene som ble anvendt. Avviker historikken fra filene, anvendes ingenting.
 * Hver feil etter at filene er ordnet, også fra tilkoblingen, kommer som
 * `MigreringAvvist` med filene som er anvendt i denne kjøringen.
 *
 * Runneren holder én egen forbindelse med poolens konfigurasjon, ikke en
 * `mssql`-transaksjon: en `ROLLBACK` i en fil får da ikke `mssql` til å gi
 * forbindelsen tilbake til poolen med en åpen transaksjon (#576). Til slutt, også
 * etter en feil, ruller runneren tilbake det som er åpent, slipper applåsen og
 * lukker forbindelsen. Faller forbindelsen ut, gjør serveren det samme.
 */
export async function migrer(pool: sql.ConnectionPool, filer: Migrasjon[]): Promise<string[]> {
  filer = ordne(filer);
  const egenPool = new sql.ConnectionPool(egenKonfig(pool));
  let forbindelse: Forbindelse | undefined;
  const kjoert: string[] = [];
  // Fila med historikkraden som feilet, men som kan være lagret likevel.
  let uvisst: string | undefined;
  // Runneren rydder bare en forbindelse som har tatt applåsen og fortsatt er `EIER`.
  let laast = false;
  let byttet = false;
  try {
    await egenPool.connect();
    forbindelse = await (egenPool as unknown as Utlaan).acquire(egenPool);
    const egen = reservasjon(egenPool, forbindelse);
    try {
      await egen.request().batch('SET XACT_ABORT ON;');
      await kontrollerIdentitet(egen);
      await laas(egen);
      laast = true;
      for (;;) {
        const versjon = await anvendNeste(egen, filer, (v) => (uvisst = v));
        if (versjon === undefined) return kjoert;
        kjoert.push(versjon);
      }
    } catch (feil) {
      byttet = feil instanceof IdentitetByttet;
      throw feil;
    } finally {
      if (laast && !byttet)
        await egen
          .request()
          .input('ressurs', sql.NVarChar(255), APPLAAS)
          .batch(
            `IF @@TRANCOUNT > 0 ROLLBACK;
           IF APPLOCK_MODE(N'db_owner', @ressurs, N'Session') = 'Exclusive'
             EXEC sp_releaseapplock @Resource = @ressurs, @LockOwner = 'Session', @DbPrincipal = N'db_owner';`
          )
          .catch((feil: unknown) => {
            console.error('Migreringen: transaksjonen og applåsen kunne ikke ryddes:', feil);
          });
    }
  } catch (feil) {
    const anvendt =
      ` Anvendt i denne kjøringen: ${kjoert.join(', ') || 'ingen'}.` +
      (uvisst
        ? ` ${uvisst} kan også være anvendt; koe_migrering.historikk viser om den er det.`
        : '');
    if (feil instanceof MigreringAvvist)
      throw new MigreringAvvist(`${somSetning(feil)}${anvendt}`, { cause: feil });
    // En feil utenfor en fil, som at forbindelsen ikke kommer i gang eller er
    // brutt før neste fil (#641, #866 punkt 3).
    throw new MigreringAvvist(`Migreringen stoppet utenfor en fil: ${somSetning(feil)}${anvendt}`, {
      cause: feil,
    });
  } finally {
    // Poolen lukker forbindelsen når den selv lukkes.
    if (forbindelse) (egenPool as unknown as Utlaan).release(forbindelse);
    await egenPool.close().catch((feil: unknown) => {
      console.error('Migreringen: poolen kunne ikke lukkes:', feil);
    });
  }
}
