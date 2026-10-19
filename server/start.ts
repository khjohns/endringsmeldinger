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
 *   leveringsoppdragene, som en innlogging i rollen `koe_runtime`. Den nekter å
 *   starte som eier av basen eller `sysadmin`, når historikken i basen avviker
 *   fra `database/migrasjoner/` eller en fil ikke er anvendt (`oppstart.ts`).
 *   Navnet er et annet enn `KOE_SQLSERVER_TILKOBLING`, som hooken og testene
 *   bruker: den strengen er `sa` mot serveren, og testene lager baser og
 *   kjøretidsinnlogginger med den (`opprettKjoeretid` i `tester/sqlserver.ts`).
 * - `APP_ENV` må være den Python har. Med `development` heter sesjonskapselen
 *   `koe_session`, ellers `__Host-koe_session`, som krever HTTPS (B18-01).
 *   Vite-proxyen sender innloggingen, `/api/csrf-token`, prosjektene og
 *   `/api/kjerne` til port 8090.
 * - Innloggingen og Catenda leser `AUTH_FRONTEND_URL`, `CATENDA_CLIENT_ID`,
 *   `CATENDA_CLIENT_SECRET`, `CATENDA_LOGIN_REDIRECT_URI` og `CATENDA_ACCESS_TOKEN`,
 *   som Python. Medlemslistene og teamene hentes med integrasjonens eget token.
 *   Mangler oppsettet for innloggingen eller er det ugyldig, svarer innloggingen
 *   503; mangler Catenda-oppsettet, gir også en medlemsliste som må hentes, 503. `CATENDA_GRUNNADRESSE` peker Catenda mot
 *   token-brokeren (#806) eller en testleverandør på localhost i utvikling.
 * - Med både innloggingen og Catenda satt opp starter jobbkjøreren (`jobber.ts`, #741), som lager
 *   topicen for en ny sak med integrasjonens token. Lenken i topicen peker til
 *   `AUTH_FRONTEND_URL`. Uten Catenda venter jobbene i basen.
 */

import { createServer } from 'node:http';
import { constants } from 'node:os';
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
import { opprettPool, sql } from './datalag.ts';
import { innloggingFraMiljoe, type Innlogging } from './innlogging.ts';
import { webhookFraMiljoe, type Webhook } from './webhook.ts';
import { startJobbkjoerer, type Jobbkjoerer } from './jobber.ts';
import { lesMigrasjoner } from './migrering.ts';
import { hindringer } from './oppstart.ts';

const utenCatenda: Catenda = {
  async medlemmer() {
    throw new CatendaUtilgjengelig('Catenda er ikke satt opp');
  },
  async teammedlemmer() {
    throw new CatendaUtilgjengelig('Catenda er ikke satt opp');
  },
};

kontrollerSkrifter();

const tilkobling = process.env.KOE_DATALAG_TILKOBLING;
if (!tilkobling) throw new Error('KOE_DATALAG_TILKOBLING er ikke satt');

const datalag = await opprettPool(sql.ConnectionPool.parseConnectionString(tilkobling));
datalag.on('error', (feil) =>
  console.error('Forbindelsen til SQL Server ble brutt:', feil.message)
);

const funn = await hindringer(datalag, lesMigrasjoner());
if (funn.length) throw new Error(`Serveren kan ikke bruke basen:\n${funn.join('\n')}`);

// Innloggingen bruker integrasjonens klient, så uten Catenda er den heller ikke
// satt opp (#726 punkt 4). Et feil oppsett av innloggingen stenger ikke
// integrasjonen. Meldingene har ingen verdier fra oppsettet, så hemmeligheten
// når ikke loggen.
let klient: ReturnType<typeof catendaFraMiljoe> | null = null;
let catenda = utenCatenda;
try {
  klient = catendaFraMiljoe();
  catenda = integrasjonen(klient);
} catch (feil) {
  console.warn(`Catenda er ikke satt opp: ${(feil as Error).message}`);
}
let innlogging: Innlogging | null = null;
try {
  if (!klient) throw new Error('Catenda er ikke satt opp');
  innlogging = innloggingFraMiljoe(process.env, klient);
} catch (feil) {
  console.warn(`Innloggingen er ikke satt opp: ${(feil as Error).message}`);
}
// Uten hemmeligheten svarer webhooken 404, og meldingen har ikke verdien (INT-01).
let webhook: Webhook | null = null;
try {
  webhook = webhookFraMiljoe();
} catch (feil) {
  console.warn(`Webhooken fra Catenda er ikke satt opp: ${(feil as Error).message}`);
}
let jobber: Jobbkjoerer | null = null;
if (klient && innlogging) {
  const { frontend } = innlogging;
  jobber = startJobbkjoerer({
    datalag,
    catenda: topicoppretter(klient),
    dokumenter: dokumentleverandoer(klient),
    saksadresse: (prosjektId, sakId) =>
      `${frontend}/${encodeURIComponent(prosjektId)}/${encodeURIComponent(sakId)}/kjerne`,
  });
}

const server = createServer(
  lagServer({ datalag, catenda, innlogging, webhook, vekkJobbkjoereren: () => jobber?.vekk() })
);
server.listen(Number(process.argv[2] ?? 0), '127.0.0.1', () => {
  const adresse = server.address();
  const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
  console.log(`lytter på http://127.0.0.1:${port}`);
});

// Poolen lukkes først når løkka har kvittert (#778). Et nytt signal mens stoppen
// pågår, avslutter med en gang, så en stopp som henger, ikke krever SIGKILL (#813 punkt 3).
let stoppes = false;
const stopp = (signal: NodeJS.Signals) => {
  if (stoppes) {
    console.error(`${signal} mens stoppen pågår: avslutter uten å vente på serveren og jobbene`);
    process.exit(128 + constants.signals[signal]);
  }
  stoppes = true;
  void new Promise<void>((lukket) => server.close(() => lukket()))
    .then(() => jobber?.stopp())
    .then(() => datalag.close());
};
process.on('SIGTERM', stopp);
process.on('SIGINT', stopp);
