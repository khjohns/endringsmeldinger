/**
 * Start TS-serveren mot en migrert base i SQL Server (B-18, F0b-8 i #662, F0b-7 i #661):
 *
 *   KOE_DATALAG_TILKOBLING=… APP_ENV=development \
 *     AUTH_FRONTEND_URL=http://localhost:5173 CATENDA_CLIENT_ID=… \
 *     CATENDA_CLIENT_SECRET=… CATENDA_LOGIN_REDIRECT_URI=… npm run server -- 8090
 *
 * Serveren lytter på 127.0.0.1 og skriver «lytter på http://127.0.0.1:<port>»
 * når den er klar. Port 0 gir en ledig port.
 *
 * - `KOE_DATALAG_TILKOBLING` er tilkoblingsstrengen til en migrert base i
 *   SQL Server, med sesjonen, medlemskapet, kontraktsteamene, journalen og
 *   leveringsoppdragene. Den nekter å starte når historikken i basen avviker fra
 *   `database/migrasjoner/` eller en fil ikke er anvendt.
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
 * - Med Catenda satt opp starter jobbkjøreren (`jobber.ts`, #741), som lager
 *   topicen for en ny sak med integrasjonens token. Lenken i topicen peker til
 *   `AUTH_FRONTEND_URL`. Uten Catenda venter jobbene i basen.
 */

import { createServer } from 'node:http';
import { lagServer } from './app.ts';
import type { Catenda } from './autorisasjon.ts';
import { kontrollerSkrifter } from './brevpdf.ts';
import {
  catendaFraMiljoe,
  CatendaUtilgjengelig,
  integrasjonen,
  dokumentleverandoer,
  topicoppretter,
} from './catenda.ts';
import { opprettPool, sql, type Pool } from './datalag.ts';
import { innloggingFraMiljoe, type Innlogging } from './innlogging.ts';
import { startJobbkjoerer, type Jobbkjoerer } from './jobber.ts';
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
  const anvendt = (await datalag.request().execute<Anvendt>('koe_api.migrasjonshistorikk'))
    .recordset;
  const kjent = new Set(anvendt.map((a) => a.versjon));
  return [
    ...avvik(anvendt, filer),
    ...filer.filter((f) => !kjent.has(f.versjon)).map((f) => `${f.filnavn} er ikke anvendt.`),
  ];
}

kontrollerSkrifter();

const tilkobling = process.env.KOE_DATALAG_TILKOBLING;
if (!tilkobling) throw new Error('KOE_DATALAG_TILKOBLING er ikke satt');

const datalag = await opprettPool(sql.ConnectionPool.parseConnectionString(tilkobling));
datalag.on('error', (feil) =>
  console.error('Forbindelsen til SQL Server ble brutt:', feil.message)
);

const funn = await migrasjonsavvik(datalag);
if (funn.length) throw new Error(`Basen er ikke migrert som repoet:\n${funn.join('\n')}`);

let innlogging: Innlogging | null = null;
let catenda = utenCatenda;
let jobber: Jobbkjoerer | null = null;
try {
  const { frontend } = (innlogging = innloggingFraMiljoe());
  const klient = catendaFraMiljoe();
  catenda = integrasjonen(klient);
  jobber = startJobbkjoerer({
    datalag,
    catenda: topicoppretter(klient),
    dokumenter: dokumentleverandoer(klient),
    saksadresse: (prosjektId, sakId) =>
      `${frontend}/${encodeURIComponent(prosjektId)}/${encodeURIComponent(sakId)}/kjerne`,
  });
} catch (feil) {
  // Meldingen har ingen verdier fra oppsettet, så hemmeligheten når ikke loggen.
  console.warn(`Innloggingen og Catenda er ikke satt opp: ${(feil as Error).message}`);
}

const server = createServer(
  lagServer({ datalag, catenda, innlogging, vekkJobbkjoereren: () => jobber?.vekk() })
);
server.listen(Number(process.argv[2] ?? 0), '127.0.0.1', () => {
  const adresse = server.address();
  const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
  console.log(`lytter på http://127.0.0.1:${port}`);
});

// Et nytt signal venter på stoppen som pågår, så poolen ikke lukkes mens løkka kvitterer (#778).
let stoppes: Promise<void> | undefined;
const stopp = () =>
  void (stoppes ??= new Promise<void>((lukket) => server.close(() => lukket()))
    .then(() => jobber?.stopp())
    .then(() => datalag.close()));
process.on('SIGTERM', stopp);
process.on('SIGINT', stopp);
