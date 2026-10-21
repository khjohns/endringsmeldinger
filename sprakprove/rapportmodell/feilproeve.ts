import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mappe = dirname(fileURLToPath(import.meta.url));
const rot = resolve(mappe, '../..');
const kilde = readFileSync(join(mappe, 'projektor.ts'), 'utf8');
const kilder = ['forloep.ts', 'projektor.ts', 'projektor.test.ts'];
const resultater: object[] = [];
const prov = (
  navn: string,
  endre: (s: string) => string,
  testnavn: string,
  forventetFeil: string | null
) => {
  const kopi = mkdtempSync(join(rot, 'sprakprove/rapportmodell-feil-'));
  try {
    for (const fil of kilder) cpSync(join(mappe, fil), join(kopi, fil));
    const mutert = endre(kilde);
    if (forventetFeil) assert.notEqual(mutert, kilde, 'Feilinnføringen må treffe');
    writeFileSync(join(kopi, 'projektor.ts'), mutert);
    const rapportsti = join(kopi, 'vitest.json');
    const argumenter = [
      join(rot, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--project=node',
      join(kopi, 'projektor.test.ts'),
      '-t',
      testnavn,
      '--reporter=json',
      '--outputFile',
      rapportsti,
    ];
    const prosess = spawnSync(process.execPath, argumenter, { cwd: rot, encoding: 'utf8' });
    assert(!prosess.error, String(prosess.error));
    const rapport = JSON.parse(readFileSync(rapportsti, 'utf8'));
    const feil = rapport.testResults
      .flatMap(
        (r: { assertionResults: { status: string; failureMessages: string[] }[] }) =>
          r.assertionResults
      )
      .filter((r: { status: string }) => r.status === 'failed');
    if (forventetFeil) {
      assert.equal(prosess.status, 1);
      assert.equal(rapport.numFailedTests, 1);
      assert(feil[0].failureMessages.join('\n').includes(forventetFeil), JSON.stringify(feil));
    } else {
      assert.equal(prosess.status, 0, prosess.stdout + prosess.stderr);
      assert.equal(rapport.numPassedTests, 10);
    }
    resultater.push({
      navn,
      testfilter: testnavn,
      utfall: forventetFeil ? 'oppdaget ved forventet målassertion' : 'grønn kontroll',
      antall_feil: rapport.numFailedTests,
      forventet_feil: forventetFeil,
      faktisk_feil: feil,
      produksjonskode_endret: false,
    });
  } finally {
    rmSync(kopi, { recursive: true, force: true });
  }
};
prov('Uendret kontrollkopi', (s) => s, 'avgrenset rapportprøve', null);
prov(
  'Dobbelttell erstattet krav på 100 000',
  (s) =>
    s.replace(
      'const tall = s.gjeldendeKrav.innhold.beloep;',
      'const tall = s.krav.reduce((sum, k) => sum + Number(k.innhold.beloep), 0);'
    ),
  'teller revidert krav',
  'expected 450000 to be 350000'
);
prov(
  'Bruk siste målegrunnlag i historisk visning ved E',
  (s) =>
    s.replace(
      /r\.kjent_fra_versjon <= versjon &&\s*\(r\.kjent_til_versjon === null \|\| versjon < r\.kjent_til_versjon\)/,
      'r.kjent_til_versjon === null'
    ),
  'F blir kjent ved versjon 7',
  'expected 3 to be 7'
);
const resultat = {
  metode:
    'Midlertidige isolerte kopier av prøveprojektoren; samme testforventninger. Ingen mutasjon av kjernen.',
  projektor_sha256: createHash('sha256').update(kilde).digest('hex'),
  resultater,
};
mkdirSync(join(mappe, 'resultat'), { recursive: true });
writeFileSync(join(mappe, 'resultat/feilproever.json'), JSON.stringify(resultat, null, 2) + '\n');
console.log(
  JSON.stringify(
    resultater.map((r) => ({ ...(r as object), faktisk_feil: undefined })),
    null,
    2
  )
);
