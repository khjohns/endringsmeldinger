/**
 * Testoppsettet nekter en testbase som er eldre enn migrasjonene (#379).
 * Arbeidstreet etterliknes med en kopi av stubben og migrasjonene, så basen
 * ikke røres. Krever `KOE_TESTBASE_URL`.
 */

import { appendFileSync, cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { kobleTilKastbarTestbase } from '../kastbar.ts';
import { TESTBASE_URL } from './testbase.ts';

const ROT = fileURLToPath(new URL('../..', import.meta.url));

describe.skipIf(!TESTBASE_URL)('testbasen og migrasjonene i arbeidstreet', () => {
  let kopi: string;

  beforeEach(() => {
    kopi = mkdtempSync(join(tmpdir(), 'koe-arbeidstre-'));
    for (const fil of ['scripts/testbase/plattformstubb.sql', 'supabase/migrations']) {
      cpSync(join(ROT, fil), join(kopi, fil), { recursive: true });
    }
  });
  afterEach(() => rmSync(kopi, { recursive: true, force: true }));

  it('godtar basen bygget av arbeidstreet', async () => {
    const pool = await kobleTilKastbarTestbase(TESTBASE_URL, 1, kopi);
    await pool.end();
  });

  it('nekter basen når en migrasjon er kommet til etter byggingen', async () => {
    writeFileSync(join(kopi, 'supabase/migrations/99991231000000_senere.sql'), 'SELECT 1;\n');
    await expect(kobleTilKastbarTestbase(TESTBASE_URL, 1, kopi)).rejects.toThrow(
      /ikke bygget av migrasjonene i arbeidstreet.*bygg_paa_nytt\.sh/
    );
  });

  it('nekter basen når en migrasjon er endret etter byggingen', async () => {
    const forste = readdirSync(join(kopi, 'supabase/migrations')).sort()[0];
    appendFileSync(join(kopi, 'supabase/migrations', forste), '\n-- endret\n');
    await expect(kobleTilKastbarTestbase(TESTBASE_URL, 1, kopi)).rejects.toThrow(
      /ikke bygget av migrasjonene i arbeidstreet/
    );
  });
});
