/**
 * Feilinnføringene for målmodellen (#304). F1–F7 er avsnitt 4 i modellforslaget,
 * F8–F10 feilklassene reviewet av PR #306 fant. Én mutasjon om gangen i arbeidskopien, Vitest over `kjerne/` og `sprakprove/kjernelagring/`, og
 * originalteksten settes tilbake etterpå. For hver mutasjon kreves det at de
 * forventede målassertions feiler, og at alle feil er assertions, ikke import,
 * oppsett eller en brutt forutsetning (`.claude/rules/tester.md`).
 *
 * Kjøres fra repoets rot, med testbasen oppe for å ta med lagringstestene:
 *   node kjerne/tester/feilinnforing.ts [F1 F2 ...]
 * Forventet: «oppdaget» for hver mutasjon, og arbeidskopien er ren etterpå.
 * Skriptet starter ikke når en fil det muterer, har lokale endringer. Commit
 * aldri en mutert fil.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface Mutasjon {
  id: string;
  feilklasse: string;
  fil: string;
  /** Tekst som erstattes, hver nøyaktig én gang i fila. */
  endringer: [fra: string, til: string][];
  /** Deler av testnavnet (`fullName`) som må feile. */
  mal: string[];
}

const K = 'kjerne';

const MUTASJONER: Mutasjon[] = [
  {
    id: 'F1',
    feilklasse: 'reglene leser samlet status igjen (forbudt import av visningen)',
    fil: `${K}/forutsetninger.ts`,
    endringer: [
      [
        "import type { Utledning } from './utled.ts';",
        "import type { Utledning } from './utled.ts';\nimport { visning } from './visning.ts';",
      ],
      ['  if (u.avsluttet) return', "  if (visning(u).status.kode.startsWith('avsluttet')) return"],
    ],
    mal: [
      'forutsetninger.ts når ikke visningen',
      'avvisning.ts når ikke visningen',
      'skriving.ts når ikke visningen',
    ],
  },
  {
    id: 'F2',
    feilklasse: 'anvend knytter svaret til gjeldende krav',
    fil: `${K}/leser.ts`,
    endringer: [
      [
        '  const gjelder = referanser[0];',
        '  const gjelder = stand.sisteKrav[spor] ?? referanser[0];',
      ],
    ],
    mal: ['F-MM-E1'],
  },
  {
    id: 'F3',
    feilklasse: 'en ukjent hendelse hoppes over',
    fil: `${K}/leser.ts`,
    endringer: [["art: 'ukjent', grunn: feil.message }", "art: 'sak' }"]],
    mal: ['F-MM-E5'],
  },
  {
    id: 'F4',
    feilklasse: 'virkningen av en godtatt preklusjon regnes på nytt etter en regelendring',
    fil: `${K}/utled.ts`,
    endringer: [['grunnlag: frosset ?? enighetsgrunnlag(', 'grunnlag: enighetsgrunnlag(']],
    mal: ['F-MM-C3c', 'lar beslutningsgrunnlag, enighetsgrunnlag og lagrede rader stå'],
  },
  {
    id: 'F5',
    feilklasse: 'serveren fryser sitt eget enighetsgrunnlag uten å sammenlikne med klientens',
    fil: `${K}/nyttelast.ts`,
    endringer: [
      [
        '!likeVerdier(k.enighetsgrunnlag, server)',
        '!likeVerdier(k.enighetsgrunnlag, k.enighetsgrunnlag)',
      ],
    ],
    mal: ['F-MM-C3d-kontroll'],
  },
  {
    id: 'F6',
    feilklasse: 'en aksept godtas selv om brevet avviker fra dagens utledning',
    fil: `${K}/forutsetninger.ts`,
    endringer: [['gjeldendeSvar.id].avvik === true)', 'gjeldendeSvar.id].avvik === undefined)']],
    mal: ['F-MM-C3d', 'avviser en aksept av det avvikende svaret'],
  },
  {
    id: 'F7',
    feilklasse: 'et bufret resultat fra en nyere kjerne brukes etter en tilbakerulling',
    fil: `${K}/buffer.ts`,
    endringer: [['b.versjon[n] === egen[n]', 'b.versjon[n] >= egen[n]']],
    mal: [
      'brukes ikke med nyere projeksjonsversjon',
      'brukes ikke med nyere regelversjon',
      'brukes ikke med nyere format',
    ],
  },
  // F8–F10 er feilklassene reviewet av PR #306 fant i samspillet mellom reglene.
  {
    id: 'F8',
    feilklasse: 'et avvikende grunnlagssvar avklarer grunnlaget (MM-U5)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        'const gAvviker = !eg && gSvar !== null && svar[gSvar.id].avvik === true;',
        'const gAvviker = false;',
      ],
    ],
    mal: ['F-MM-AC'],
  },
  {
    id: 'F9',
    feilklasse: 'en revisjonskjede med selvreferanse eller sirkel stopper ikke saken',
    fil: `${K}/utled.ts`,
    endringer: [
      ['if (neste.length > 0 || kjede.size !== paaKravet.length)', 'if (neste.length > 1)'],
    ],
    mal: ['F-MM-E6', 'F-MM-E7'],
  },
  {
    id: 'F10',
    feilklasse: 'innsigelsen om fremdriftshindring (§ 33.1) forsvinner ved lesing',
    fil: `${K}/leser.ts`,
    endringer: [['    if (hindring !== null)\n', '    if (hindring === undefined)\n']],
    mal: ['avslår prinsipalt, med dagene som subsidiært standpunkt'],
  },
];

interface Testresultat {
  fullName: string;
  status: string;
  failureMessages: string[];
}
interface Rapport {
  testResults: {
    name: string;
    status: string;
    message: string;
    assertionResults: Testresultat[];
  }[];
}

function kjorVitest(): Rapport {
  const ut = join(mkdtempSync(join(tmpdir(), 'feilinnforing-')), 'rapport.json');
  spawnSync(
    'npx',
    [
      'vitest',
      'run',
      'kjerne/',
      'sprakprove/kjernelagring/',
      '--reporter=json',
      `--outputFile=${ut}`,
    ],
    {
      stdio: 'ignore',
    }
  );
  return JSON.parse(readFileSync(ut, 'utf8')) as Rapport;
}

function ren(fil: string): boolean {
  return spawnSync('git', ['diff', '--quiet', '--', fil]).status === 0;
}

const valgt = process.argv.slice(2);
const mutasjoner = MUTASJONER.filter((m) => !valgt.length || valgt.includes(m.id));
for (const m of mutasjoner) {
  if (!ren(m.fil)) throw new Error(`${m.fil} har lokale endringer; skriptet muterer ikke den.`);
  for (const [fra] of m.endringer)
    if (readFileSync(m.fil, 'utf8').split(fra).length !== 2)
      throw new Error(`${m.id}: «${fra}» finnes ikke nøyaktig én gang i ${m.fil}`);
}

const kontroll = kjorVitest();
const kontrollfeil = kontroll.testResults
  .flatMap((f) => f.assertionResults)
  .filter((t) => t.status === 'failed');
if (kontrollfeil.length || kontroll.testResults.some((f) => f.status === 'failed'))
  throw new Error(
    `Kontrollkjøringen er ikke grønn: ${kontrollfeil.map((t) => t.fullName).join('; ')}`
  );
console.log(
  `Kontroll uten mutasjon: ${kontroll.testResults.flatMap((f) => f.assertionResults).length} tester grønne.`
);

let alleOppdaget = true;
for (const m of mutasjoner) {
  const original = readFileSync(m.fil, 'utf8');
  let rapport: Rapport;
  try {
    writeFileSync(
      m.fil,
      m.endringer.reduce((t, [fra, til]) => t.replace(fra, til), original)
    );
    rapport = kjorVitest();
  } finally {
    writeFileSync(m.fil, original);
  }
  const feilet = rapport.testResults
    .flatMap((f) => f.assertionResults)
    .filter((t) => t.status === 'failed');
  const suitefeil = rapport.testResults.filter(
    (f) => f.status === 'failed' && !f.assertionResults.length
  );
  const ikkeAssertion = feilet.filter(
    (t) => !t.failureMessages.join('\n').includes('AssertionError')
  );
  const manglerMal = m.mal.filter((mal) => !feilet.some((t) => t.fullName.includes(mal)));
  const oppdaget = !suitefeil.length && !ikkeAssertion.length && !manglerMal.length;
  alleOppdaget &&= oppdaget;
  console.log(`\n${m.id} ${m.feilklasse}: ${oppdaget ? 'oppdaget' : 'IKKE OPPDAGET'}`);
  for (const [fra, til] of m.endringer) console.log(`  ${m.fil}: ${fra.trim()} → ${til.trim()}`);
  for (const t of feilet)
    console.log(`  feilet: ${t.fullName}\n    ${t.failureMessages[0]?.split('\n')[0]}`);
  for (const f of suitefeil) console.log(`  suitefeil: ${f.name}: ${f.message.split('\n')[0]}`);
  for (const t of ikkeAssertion) console.log(`  ikke en assertion: ${t.fullName}`);
  for (const mal of manglerMal) console.log(`  målet feilet ikke: ${mal}`);
}
for (const m of mutasjoner) if (!ren(m.fil)) throw new Error(`${m.fil} er ikke satt tilbake`);
console.log(
  `\nArbeidskopien er ren. ${alleOppdaget ? 'Alle mutasjonene ble oppdaget.' : 'Ikke alle mutasjonene ble oppdaget.'}`
);
process.exit(alleOppdaget ? 0 : 1);
