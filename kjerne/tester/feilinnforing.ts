/**
 * Feilinnføringene for kjernen (#304, #308). F1–F7 er avsnitt 4 i modellforslaget,
 * F8–F10 feilklassene reviewet av PR #306 fant, skrevet om etter MM-U9 og
 * GR-U10, og F11–F17 grensene #308 la til. Én mutasjon om gangen i
 * arbeidskopien, Vitest over `kjerne/` og `sprakprove/kjernelagring/`, og
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
        "import { kraveneErAvgjort, type Utledning } from './utled.ts';",
        "import { kraveneErAvgjort, type Utledning } from './utled.ts';\nimport { visning } from './visning.ts';",
      ],
      [
        '  if (kraveneErAvgjort(u))',
        "  if (visning(u, { versjon: 0, gjelderVarslingsplikten: () => true }).status.kode === 'avsluttet_oppgjort' || kraveneErAvgjort(u))",
      ],
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
    feilklasse: 'et sendt brev vurderes på nytt med dagens regler (MM-U9)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        "import { enighetsgrunnlag, utfall } from './standpunkt.ts';",
        "import { enighetsgrunnlag, standpunkter, utfall } from './standpunkt.ts';",
      ],
      [
        '      standpunkter: s.beslutningsgrunnlag.standpunkter,',
        '      standpunkter: standpunkter(s, spor.grunnlag.krav.find((k) => k.id === s.gjelder) ?? spor.grunnlag.krav.at(-1), regler),',
      ],
    ],
    mal: [
      'F-MM-C3b',
      'F-MM-AC',
      'lar brevet beholde virkningen og viser regelendringen bare som merknad',
    ],
  },
  {
    id: 'F5',
    feilklasse: 'serveren godtar en aksept forhåndsvist med en annen regelversjon (B-13, KA-U10)',
    fil: `${K}/nyttelast.ts`,
    endringer: [['if (k.regelversjon !== regler.versjon)', 'if (k.regelversjon === undefined)']],
    mal: ['F-MM-C3d-kontroll'],
  },
  {
    id: 'F6',
    feilklasse:
      'en preklusjon er avklart selv om et annet varsel er registrert etter brevet (MM-U8)',
    fil: `${K}/utled.ts`,
    endringer: [['u.gjelder !== varselNaa(s)', 'u.gjelder === undefined']],
    mal: ['F-MM-D', 'F-MM-D-godtatt', 'avviser aksepten når et varsel er registrert etter brevet'],
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
  {
    id: 'F8',
    feilklasse: 'et godkjent grunnlag er ikke enighet ved sammenfall (GR-U10, #312)',
    fil: `${K}/standpunkt.ts`,
    endringer: [
      [
        "if (svar.spor === 'grunnlag') return utsagnet(svar, 'ansvar')?.resultat === 'godkjent';",
        "if (svar.spor === 'grunnlag') return false;",
      ],
    ],
    mal: ['F-MM-G10', 'F-MM-A5b'],
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
  // F11–F17 er grensene #308 la til.
  {
    id: 'F11',
    feilklasse: 'kjernen importerer fra språkprøven og pg',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        "import { utledetVarsel } from './leser.ts';",
        "import { utledetVarsel } from './leser.ts';\nimport type { Pool } from 'pg';\nimport type { Hendelse } from '../sprakprove/kjerne/typer.ts';\nexport type Ute = [Pool, Hendelse];",
      ],
    ],
    mal: ['utled.ts importerer ingenting utenfor kjernen'],
  },
  {
    id: 'F12',
    feilklasse: 'en ny kravversjon opphever enigheten i stedet for å avvises (KA-U7)',
    fil: `${K}/forutsetninger.ts`,
    endringer: [
      [
        "      if (s.enighet)\n        return avvis('ENIGHET_I_SPORET', 'Partene er enige om svaret. Kravet kan ikke endres.');\n",
        '',
      ],
    ],
    mal: ['F-MM-K1', 'F-MM-K2', 'F-MM-K3', 'F-MM-G10'],
  },
  {
    id: 'F13',
    feilklasse: 'et trukket spor hindrer endringsordre (EO-U2, #312)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        'KRAVSPOR.some((n) => !u.spor[n].trukket && u.spor[n].enighet !== null)',
        'KRAVSPOR.every((n) => !u.spor[n].trukket && u.spor[n].enighet !== null)',
      ],
    ],
    mal: ['F-MM-EO1'],
  },
  {
    id: 'F14',
    feilklasse: 'et svar uten beslutningsgrunnlag leses med et tomt brev',
    fil: `${K}/leser.ts`,
    endringer: [
      ['  if (utkast)\n    return {', '  if (utkast || !data.beslutningsgrunnlag)\n    return {'],
    ],
    mal: ['et svar uten beslutningsgrunnlag'],
  },
  {
    id: 'F15',
    feilklasse: 'en regel leser en oppsummerende verdi',
    fil: `${K}/handlinger.ts`,
    endringer: [
      [
        '  const ut = u.grunnlagAvvist || kraveneErAvgjort(u) ? [] : sporhandlinger(u, part);',
        '  const avsluttet = u.grunnlagAvvist || kraveneErAvgjort(u);\n  const ut = avsluttet ? [] : sporhandlinger(u, part);',
      ],
    ],
    mal: ['reglene leser ingen status eller oppsummering (#308) handlinger.ts'],
  },
  {
    id: 'F16',
    feilklasse: 'enighet ved sammenfall leses ikke fra brevet (GR-U7, GR-U10, KA-U10)',
    fil: `${K}/utled.ts`,
    endringer: [['else if (g.beslutningsgrunnlag.sammenfall)', 'else if (g.utsagn.length < 0)']],
    mal: ['F-MM-A', 'F-MM-G10', 'F-MM-K1'],
  },
  {
    id: 'F17',
    feilklasse: 'et trukket spor gir alene grunnlag for endringsordre (EO-U5)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        'KRAVSPOR.some((n) => !u.spor[n].trukket && u.spor[n].enighet !== null)',
        'KRAVSPOR.some((n) => u.spor[n].trukket || u.spor[n].enighet !== null)',
      ],
    ],
    mal: ['F-MM-EO3'],
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

function kjoerVitest(): Rapport {
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

const kontroll = kjoerVitest();
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
    rapport = kjoerVitest();
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
