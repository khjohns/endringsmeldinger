/**
 * Start TS-serveren mot den kastbare testbasen (B-18, skiva i #347):
 *
 *   KOE_TESTBASE_URL=… TESTMILJO_TEAMMEDLEMMER='{"<team-id>": ["<subjekt>"]}' \
 *     npm run server -- [port]
 *
 * Serveren lytter på 127.0.0.1 og skriver «lytter på http://127.0.0.1:<port>»
 * når den er klar. Port 0 gir en ledig port.
 *
 * - Den nekter å starte mot en base som ikke er merket kastbar av
 *   `scripts/testbase/bygg_testbase.sh`. Skiva er for testmiljøet.
 * - `TESTMILJO_TEAMMEDLEMMER` står for Catendas team-API. Medlemssynkronisering
 *   mot Catenda er ikke bygget; et medlemskap som ikke er ferskt, gir 503.
 */

import { createServer } from 'node:http';
import { lagServer } from './app.ts';
import { catendaId, type Catenda } from './autorisasjon.ts';
import { kobleTilKastbarTestbase } from './kastbar.ts';

function teamFraMiljo(): Catenda {
  const team = JSON.parse(process.env.TESTMILJO_TEAMMEDLEMMER ?? '{}') as Record<string, string[]>;
  return {
    async synkroniser() {
      throw new Error('Medlemssynkronisering mot Catenda er ikke bygget i TS-serveren.');
    },
    async teammedlemmer(_prosjekt, teamId) {
      const funnet = Object.entries(team).find(([id]) => catendaId(id) === teamId);
      return new Set(funnet?.[1] ?? []);
    },
  };
}

const url = process.env.KOE_TESTBASE_URL;
if (!url) throw new Error('KOE_TESTBASE_URL er ikke satt');

const pool = await kobleTilKastbarTestbase(url);

const server = createServer(lagServer({ pool, catenda: teamFraMiljo() }));
server.listen(Number(process.argv[2] ?? 0), '127.0.0.1', () => {
  const adresse = server.address();
  const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
  console.log(`lytter på http://127.0.0.1:${port}`);
});

const stopp = () => server.close(() => void pool.end());
process.on('SIGTERM', stopp);
process.on('SIGINT', stopp);
