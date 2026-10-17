/**
 * Start TS-serveren mot den kastbare testbasen (B-18, F0b-8 i #662):
 *
 *   KOE_TESTBASE_URL=… KOE_DATALAG_TILKOBLING=… APP_ENV=development \
 *     AUTH_FRONTEND_URL=http://localhost:5173 CATENDA_CLIENT_ID=… \
 *     CATENDA_CLIENT_SECRET=… CATENDA_LOGIN_REDIRECT_URI=… npm run server -- 8090
 *
 * Serveren lytter på 127.0.0.1 og skriver «lytter på http://127.0.0.1:<port>»
 * når den er klar. Port 0 gir en ledig port.
 *
 * - Den nekter å starte mot en base som ikke er merket kastbar av
 *   `scripts/testbase/bygg_testbase.sh`. Skiva er for testmiljøet.
 * - `KOE_DATALAG_TILKOBLING` er tilkoblingsstrengen til en migrert base i
 *   SQL Server, med sesjonen, medlemskapet og kontraktsteamene (#658). Den nekter å
 *   starte når historikken i basen avviker fra `database/migrasjoner/` eller en fil
 *   ikke er anvendt. Journalen står i PostgreSQL fram til F0b-7 (#661).
 * - `APP_ENV` må være den Python har. Med `development` heter sesjonskapselen
 *   `koe_session`, ellers `__Host-koe_session`, som krever HTTPS (B18-01).
 *   Vite-proxyen sender innloggingen, `/api/csrf-token`, prosjektene og
 *   `/api/kjerne` til port 8090.
 * - Innloggingen og Catenda leser `AUTH_FRONTEND_URL`, `CATENDA_CLIENT_ID`,
 *   `CATENDA_CLIENT_SECRET`, `CATENDA_LOGIN_REDIRECT_URI` og `CATENDA_ACCESS_TOKEN`,
 *   som Python. Medlemslistene og teamene hentes med integrasjonens eget token.
 *   Mangler oppsettet eller er det ugyldig, svarer innloggingen 503, og en
 *   medlemsliste som må hentes, gir 503. `CATENDA_GRUNNADRESSE` peker Catenda mot en
 *   testleverandør på localhost, bare i utvikling.
 */

import { createServer } from 'node:http';
import { lagServer } from './app.ts';
import type { Catenda } from './autorisasjon.ts';
import { catendaFraMiljoe, CatendaUtilgjengelig, integrasjonen } from './catenda.ts';
import { opprettPool, sql, type Pool } from './datalag.ts';
import { innloggingFraMiljoe, type Innlogging } from './innlogging.ts';
import { kobleTilKastbarTestbase } from './kastbar.ts';
import { avvik, lesMigrasjoner, type Anvendt } from './migrering.ts';

const utenCatenda: Catenda = {
  async medlemmer() {
    throw new CatendaUtilgjengelig('Catenda er ikke satt opp');
  },
  async teammedlemmer() {
    throw new CatendaUtilgjengelig('Catenda er ikke satt opp');
  },
};

/** Det som hindrer at serveren bruker basen: avvik fra filene, eller en fil som ikke er anvendt. */
async function migrasjonsavvik(datalag: Pool): Promise<string[]> {
  const filer = lesMigrasjoner();
  const anvendt = (
    await datalag
      .request()
      .query<Anvendt>('SELECT versjon, filnavn, sha256 FROM koe_migrering.historikk')
  ).recordset;
  const kjent = new Set(anvendt.map((a) => a.versjon));
  return [
    ...avvik(anvendt, filer),
    ...filer.filter((f) => !kjent.has(f.versjon)).map((f) => `${f.filnavn} er ikke anvendt.`),
  ];
}

const url = process.env.KOE_TESTBASE_URL;
if (!url) throw new Error('KOE_TESTBASE_URL er ikke satt');
const tilkobling = process.env.KOE_DATALAG_TILKOBLING;
if (!tilkobling) throw new Error('KOE_DATALAG_TILKOBLING er ikke satt');

const pool = await kobleTilKastbarTestbase(url);
// En ledig forbindelse som brytes, sender `error` på poolen. Uten lytter faller prosessen.
pool.on('error', (feil) => console.error('Forbindelsen til basen ble brutt:', feil.message));

const datalag = await opprettPool(sql.ConnectionPool.parseConnectionString(tilkobling));
datalag.on('error', (feil) =>
  console.error('Forbindelsen til SQL Server ble brutt:', feil.message)
);

const funn = await migrasjonsavvik(datalag);
if (funn.length) throw new Error(`Basen er ikke migrert som repoet:\n${funn.join('\n')}`);

let innlogging: Innlogging | null = null;
let catenda = utenCatenda;
try {
  innlogging = innloggingFraMiljoe();
  catenda = integrasjonen(catendaFraMiljoe());
} catch (feil) {
  // Meldingen har ingen verdier fra oppsettet, så hemmeligheten når ikke loggen.
  console.warn(`Innloggingen og Catenda er ikke satt opp: ${(feil as Error).message}`);
}

const server = createServer(lagServer({ pool, datalag, catenda, innlogging }));
server.listen(Number(process.argv[2] ?? 0), '127.0.0.1', () => {
  const adresse = server.address();
  const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
  console.log(`lytter på http://127.0.0.1:${port}`);
});

const stopp = () => server.close(() => void Promise.all([pool.end(), datalag.close()]));
process.on('SIGTERM', stopp);
process.on('SIGINT', stopp);
