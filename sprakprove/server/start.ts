/**
 * Start TS-serveren mot den kastbare testbasen (#274, port 2):
 *
 *   KOE_TESTBASE_URL=… SPRAKPROVE_TEAMMEDLEMMER='{"<team-id>": ["<subjekt>"]}' \
 *     node sprakprove/server/start.ts [port]
 *
 * Serveren lytter på 127.0.0.1 og skriver «lytter på http://127.0.0.1:<port>»
 * når den er klar. Port 0 gir en ledig port.
 *
 * - Den nekter å starte mot en base som ikke er merket kastbar av
 *   `scripts/testbase/bygg_testbase.sh`.
 * - `SPRAKPROVE_TEAMMEDLEMMER` står for Catendas team-API, som er utenfor
 *   prøven. Synkronisering av medlemmer mot Catenda er ikke portet.
 * - Godkjenningspolicyen (`BH_APPROVAL_POLICIES`) er ikke portet. Er den satt,
 *   starter ikke serveren, fordi byggherrens svar ellers kunne gå utenom den.
 */

import { createServer } from 'node:http';
import { lagServer } from './app.ts';
import type { Catenda } from './autorisasjon.ts';
import { kobleTilKastbarTestbase } from '../kastbar.ts';

function teamFraMiljo(): Catenda {
  const team = JSON.parse(process.env.SPRAKPROVE_TEAMMEDLEMMER ?? '{}') as Record<string, string[]>;
  return {
    async synkroniser() {
      throw new Error('Medlemssynkronisering mot Catenda er ikke portet i språkprøven.');
    },
    async teammedlemmer(_prosjekt, teamId) {
      const funnet = Object.entries(team).find(
        ([id]) => id.replaceAll('-', '').toLowerCase() === teamId
      );
      return new Set(funnet?.[1] ?? []);
    },
  };
}

const url = process.env.KOE_TESTBASE_URL;
if (!url) throw new Error('KOE_TESTBASE_URL er ikke satt');
const policy = (process.env.BH_APPROVAL_POLICIES ?? '').trim();
if (policy && policy !== '{}')
  throw new Error('Godkjenningspolicyen er ikke portet i språkprøven.');

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
