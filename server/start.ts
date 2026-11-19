/**
 * Start TS-serveren mot en migrert base i SQL Server (B-18, F0b-8 i #662, F0b-7 i #661):
 *
 *   KOE_DATALAG_TILKOBLING=… APP_ENV=development \
 *     AUTH_FRONTEND_URL=http://localhost:5173 CATENDA_CLIENT_ID=… \
 *     CATENDA_CLIENT_SECRET=… CATENDA_LOGIN_REDIRECT_URI=… npm run server -- 8090
 *
 * Serveren lytter på `KOE_LYTTEADRESSE`, eller 127.0.0.1 når den ikke er satt, og
 * logger «Serveren lytter» med adressen når den er klar. Port 0 gir en ledig
 * port. Bildet setter 0.0.0.0, så ruteren i en annen container når serveren (#376).
 *
 * - `KOE_DATALAG_TILKOBLING` er tilkoblingsstrengen til en migrert base i
 *   SQL Server, med sesjonen, medlemskapet, kontraktsteamene, journalen og
 *   leveringsoppdragene, som en innlogging i rollen `koe_runtime`. Den nekter å
 *   starte som eier av basen eller `sysadmin`, når historikken i basen avviker
 *   fra `database/migrasjoner/` eller en fil ikke er anvendt (`oppstart.ts`).
 *   Navnet er et annet enn `KOE_SQLSERVER_TILKOBLING`, som hooken og testene
 *   bruker: den strengen er `sa` mot serveren, og testene lager baser og
 *   kjøretidsinnlogginger med den (`opprettKjoeretid` i `tester/sqlserver.ts`).
 * - Med `APP_ENV=development` heter sesjonskapselen
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
 * - `CATENDA_NETTADRESSE` er verten for lenken fra saken til topicen i Catenda
 *   (`sakslenkeFraMiljoe` i `catenda.ts`). Uten den har saken ingen lenke.
 */

import { createServer } from 'node:http';
import { loggAdvarsel, loggFeil, loggInfo } from './logg.ts';
import { constants } from 'node:os';
import { lagServer } from './app.ts';
import type { Catenda } from './autorisasjon.ts';
import { kontrollerSkrifter } from './brevpdf.ts';
import {
  catendaFraMiljoe,
  CatendaUtilgjengelig,
  integrasjonen,
  dokumentleverandoer,
  innboksintegrasjon,
  sakslenkeFraMiljoe,
  topicoppretter,
  type Sakslenke,
} from './catenda.ts';
import { opprettPool, sql } from './datalag.ts';
import { graphFraMiljoe, type Graph } from './hrdata.ts';
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

async function start(): Promise<void> {
  try {
    kontrollerSkrifter();
  } catch (feil) {
    loggFeil('Skriftene til brev-PDF-en kan ikke brukes', feil);
    process.exitCode = 1;
    return;
  }

  const tilkobling = process.env.KOE_DATALAG_TILKOBLING;
  if (!tilkobling) {
    loggFeil('KOE_DATALAG_TILKOBLING er ikke satt', undefined);
    process.exitCode = 1;
    return;
  }

  const datalag = await opprettPool(sql.ConnectionPool.parseConnectionString(tilkobling));
  datalag.on('error', (feil) => loggFeil('Forbindelsen til SQL Server ble brutt', feil));
  try {
    await startMedDatalag(datalag);
  } catch (feil) {
    await datalag.close().catch((igjen) => loggFeil('SQL Server-poolen kunne ikke lukkes', igjen));
    throw feil;
  }
}

async function startMedDatalag(datalag: sql.ConnectionPool): Promise<void> {
  const funn = await hindringer(datalag, lesMigrasjoner());
  if (funn.length) {
    loggAdvarsel('Serveren kan ikke bruke basen', { antall: funn.length });
    await datalag.close();
    process.exitCode = 1;
    return;
  }

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
    loggFeil('Catenda er ikke satt opp', feil, 'warn');
  }
  let innlogging: Innlogging | null = null;
  try {
    if (!klient) throw new Error('Catenda er ikke satt opp');
    innlogging = innloggingFraMiljoe(process.env, klient);
  } catch (feil) {
    loggFeil('Innloggingen er ikke satt opp', feil, 'warn');
  }
  // Uten hemmeligheten svarer webhooken 404, og meldingen har ikke verdien (INT-01).
  let webhook: Webhook | null = null;
  try {
    webhook = webhookFraMiljoe();
  } catch (feil) {
    loggFeil('Webhooken fra Catenda er ikke satt opp', feil, 'warn');
  }
  let hr: Graph | null = null;
  try {
    hr = graphFraMiljoe(process.env);
  } catch (feil) {
    loggFeil('HR-synkroniseringen er ikke satt opp', feil, 'warn');
  }
  // Uten verten har saken ingen lenke til Catenda (U-15 i BF-44).
  let sakslenke: Sakslenke | null = null;
  try {
    sakslenke = sakslenkeFraMiljoe();
  } catch (feil) {
    loggFeil('Lenken til saken i Catenda er ikke satt opp', feil, 'warn');
  }
  let jobber: Jobbkjoerer | null = null;
  const server = createServer(
    lagServer({
      datalag,
      catenda,
      innlogging,
      webhook,
      sakslenke,
      vekkJobbkjoereren: () => jobber?.vekk(),
    })
  );
  const lytteadresse = process.env.KOE_LYTTEADRESSE || '127.0.0.1';
  await new Promise<void>((klar, avvist) => {
    server.once('error', avvist);
    server.listen(Number(process.argv[2] ?? 0), lytteadresse, () => {
      server.off('error', avvist);
      klar();
    });
  });
  server.on('error', (feil) => loggFeil('HTTP-serveren feilet', feil));
  if (klient && innlogging) {
    const { frontend } = innlogging;
    jobber = startJobbkjoerer({
      datalag,
      catenda: topicoppretter(klient),
      dokumenter: dokumentleverandoer(klient),
      innboks: innboksintegrasjon(klient),
      hr: hr ?? undefined,
      saksadresse: (prosjektId, sakId) =>
        `${frontend}/${encodeURIComponent(prosjektId)}/${encodeURIComponent(sakId)}`,
    });
  }

  // Poolen lukkes først når løkka har kvittert (#778). Et nytt signal mens stoppen
  // pågår, avslutter med en gang, så en stopp som henger, ikke krever SIGKILL (#813 punkt 3).
  let stoppes = false;
  const stopp = (signal: NodeJS.Signals) => {
    if (stoppes) {
      loggAdvarsel(`${signal} mens stoppen pågår: avslutter uten å vente på serveren og jobbene`);
      process.exit(128 + constants.signals[signal]);
    }
    stoppes = true;
    void new Promise<void>((lukket) => server.close(() => lukket()))
      .then(() => jobber?.stopp())
      .then(() => datalag.close())
      .catch((feil) => loggFeil('Serveren kunne ikke stoppes', feil));
  };
  process.on('SIGTERM', stopp);
  process.on('SIGINT', stopp);
  const adresse = server.address();
  const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
  loggInfo('Serveren lytter', { adresse: `http://${lytteadresse}:${port}` });
}

await start().catch((feil) => {
  loggFeil('Serveren kunne ikke startes', feil);
  process.exitCode = 1;
});
