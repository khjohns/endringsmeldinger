/**
 * Feilinnføringene for kjernen (#304, #308, #273). F1–F7 er avsnitt 4 i
 * modellforslaget, F8–F10 feilklassene reviewet av PR #306 fant, skrevet om etter
 * MM-U9 og GR-U10, F11–F26 grensene #308 la til, og F27–F40 formatet (#273): 7.2
 * i designnotatet, GR-U12 og registeret (#320). Én mutasjon om gangen i
 * arbeidskopien, Vitest over `kjerne/` og `sprakprove/kjernelagring/`, og
 * originalteksten settes tilbake etterpå. For hver mutasjon kreves det at de
 * forventede målassertions feiler, og at alle feil er assertions, ikke import,
 * oppsett eller en brutt forutsetning (`.claude/rules/tester.md`).
 *
 * Kjøres fra repoets rot, med testbasen oppe for å ta med lagringstestene:
 *   node kjerne/tester/feilinnfoering.ts [F1 F2 ...]
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
    feilklasse:
      'leseren knytter svaret til kravet etter plassen i journalen, ikke til `gjelder` (7.2)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        '    if (alleKrav.get(s.gjelder)?.spor !== s.spor || !bakover(s.id, s.gjelder))',
        '    (s as { gjelder: string }).gjelder = spor[s.spor].krav.filter((k) => bakover(s.id, k.id)).at(-1)?.id ?? s.gjelder;\n    if (alleKrav.get(s.gjelder)?.spor !== s.spor || !bakover(s.id, s.gjelder))',
      ],
    ],
    mal: ['F-MM-E1', 'F-MM-E3'],
  },
  {
    id: 'F3',
    feilklasse: 'en ukjent hendelse hoppes over',
    fil: `${K}/leser.ts`,
    endringer: [
      [
        'if (feil instanceof Uforstaatt) return ukjent(feil.message);',
        "if (feil instanceof Uforstaatt) return { ...felles, art: 'sak' };",
      ],
    ],
    mal: ['F-MM-E5'],
  },
  {
    id: 'F4',
    feilklasse: 'et sendt brev vurderes på nytt med dagens regler (MM-U9)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        "import { enighetsgrunnlag, prinsipalt, standpunktet, utfall } from './standpunkt.ts';",
        "import { enighetsgrunnlag, prinsipalt, standpunktet, utfall, virkninger as regn } from './standpunkt.ts';",
      ],
      [
        '      virkninger: s.beslutningsgrunnlag.virkninger,',
        '      virkninger: regn(s, spor.grunnlag.krav.find((k) => k.id === s.gjelder) ?? spor.grunnlag.krav.at(-1), regler),',
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
    endringer: [['p.gjelder !== varselNaa(s)', 'p.gjelder === undefined']],
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
        "if (svar.spor === 'grunnlag') return standpunktet(svar, 'grunnlag')?.resultat === 'godkjent';",
        "if (svar.spor === 'grunnlag') return false;",
      ],
    ],
    mal: ['F-MM-G10', 'F-MM-A5b'],
  },
  {
    id: 'F9',
    feilklasse: 'to første svar på samme kravversjon stopper ikke saken',
    fil: `${K}/utled.ts`,
    endringer: [
      ['if (neste.length > 0 || kjede.size !== paaKravet.length)', 'if (neste.length > 1)'],
    ],
    mal: ['F-MM-E4'],
  },
  {
    id: 'F10',
    feilklasse: 'innsigelsen om fremdriftshindring (§ 33.1) forsvinner når brevet skrives',
    fil: `${K}/skriving.ts`,
    endringer: [
      ["ut.push({ id: nyId(), art: 'hindring', oppfylt: v.vilkar_oppfylt });", 'void 0;'],
    ],
    mal: ['avslår prinsipalt, med dagene som subsidiært standpunkt'],
  },
  // F11–F26 er grensene #308 la til.
  {
    id: 'F11',
    feilklasse: 'kjernen importerer fra språkprøven og pg',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        "import type { Regelsett } from './regler/regelsett.ts';",
        "import type { Regelsett } from './regler/regelsett.ts';\nimport type { Pool } from 'pg';\nimport type { Hendelse } from '../sprakprove/kjerne/typer.ts';\nexport type Ute = [Pool, Hendelse];",
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
      [
        '  kontroller(verdi, skjemaer[n], sti);',
        "  kontroller(verdi, { ...skjemaer[n], required: ((skjemaer[n].required ?? []) as string[]).filter((f) => f !== 'beslutningsgrunnlag') }, sti);",
      ],
      [
        '      e.beslutningsgrunnlag,',
        "      e.beslutningsgrunnlag ?? { regelversjon: 0, virkninger: standpunkter.map((s) => ({ standpunkt: s.id, virkning: 'prinsipalt' })), linje: '-', sammenfall: false, ...(spor === 'grunnlag' ? { varslingsplikt: false } : {}) },",
      ],
    ],
    mal: ['et svar uten beslutningsgrunnlag'],
  },
  {
    id: 'F15',
    feilklasse: 'en regel leser en oppsummerende verdi',
    fil: `${K}/forutsetninger.ts`,
    endringer: [
      ['  if (kraveneErAvgjort(u))', '  const avsluttet = kraveneErAvgjort(u);\n  if (avsluttet)'],
    ],
    mal: ['reglene leser ingen status eller oppsummering (#308) forutsetninger.ts'],
  },
  {
    id: 'F16',
    feilklasse: 'enighet ved sammenfall leses ikke fra brevet (GR-U7, GR-U10, KA-U10)',
    fil: `${K}/utled.ts`,
    endringer: [
      ['else if (g.beslutningsgrunnlag.sammenfall)', 'else if (g.standpunkter.length < 0)'],
    ],
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
  {
    id: 'F18',
    feilklasse: 'leseren godtar en aksept eller et svar fra feil part',
    fil: `${K}/leser.ts`,
    endringer: [
      ['if (part !== null && avsender !== part)', 'if (part !== null && avsender === undefined)'],
    ],
    mal: ['en rad fra feil part er ikke forstått'],
  },
  {
    id: 'F19',
    feilklasse: 'skjemakontrollen godtar navn fra prototypen som kjente felt',
    fil: `${K}/skjema.ts`,
    endringer: [['if (Object.hasOwn(egenskaper, navn))', 'if (navn in egenskaper)']],
    mal: ['avviser constructor i innholdet'],
  },
  {
    id: 'F20',
    feilklasse: 'et rettidig varsel blir uavklart når et varsel registreres senere (MM-U8)',
    fil: `${K}/utled.ts`,
    endringer: [['            !p.iTide &&\n', '']],
    mal: ['F-MM-D-itide'],
  },
  {
    id: 'F21',
    feilklasse: 'et krav på 0 dager godtas (KA-U8)',
    fil: `${K}/format.ts`,
    endringer: [
      [
        "properties: { dager: { type: 'integer', minimum: 1 } },",
        "properties: { dager: { type: 'integer', minimum: 0 } },",
      ],
    ],
    mal: ['F-MM-K0', 'et krav på 0 dager'],
  },
  {
    id: 'F22',
    feilklasse: 'brevet fryses uten kategorien svaret gjelder (MM-U9, § 32.2, GR-U12)',
    fil: `${K}/skriving.ts`,
    endringer: [
      [
        'return lagret(beslutningsgrunnlag(innhold, grunnlagskrav, kjerne.regler));',
        'return lagret(beslutningsgrunnlag(innhold, undefined, kjerne.regler));',
      ],
    ],
    mal: ['registrert korrespondanse fryses med kategorien', 'F-MM-C', 'F-MM-G18'],
  },
  {
    id: 'F23',
    feilklasse: 'TE trekker grunnlaget etter at godkjenningen er en endringsordre (KA-U13)',
    fil: `${K}/forutsetninger.ts`,
    endringer: [
      [
        "if (h.spor === 'grunnlag' && u.godkjenningErEndringsordre)",
        "if (h.spor === 'grunnlag' && u.godkjenningErEndringsordre && u.frafalt)",
      ],
    ],
    mal: ['F-MM-G10', 'F-MM-G18'],
  },
  {
    id: 'F24',
    feilklasse: 'forbudet mot trekk gjelder også kategorier § 32.2 ikke gjelder for (KA-U13)',
    fil: `${K}/utled.ts`,
    endringer: [['gSvar?.beslutningsgrunnlag.varslingsplikt === true', 'true']],
    mal: ['F-MM-G13', 'F-MM-G14', 'F-MM-G19'],
  },
  {
    id: 'F25',
    feilklasse: 'om godkjenningen er en endringsordre, leses av dagens regelsett (MM-U9, KA-U13)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        'gSvar?.beslutningsgrunnlag.varslingsplikt === true',
        'regler.gjelderVarslingsplikten(String(spor.grunnlag.gjeldendeKrav?.innhold.hovedkategori), String(spor.grunnlag.gjeldendeKrav?.innhold.underkategori))',
      ],
    ],
    mal: ['F-MM-G15'],
  },
  {
    id: 'F26',
    feilklasse: 'trekk av grunnlaget sperres av ethvert svar, også avslag og frafall (KA-U13)',
    fil: `${K}/utled.ts`,
    endringer: [["eg?.grunnlag.kilde === 'sammenfall' && gSvar?", 'gSvar !== null && gSvar?']],
    mal: ['F-MM-G16', 'F-MM-G17'],
  },
  // F27–F40 er formatet (#273): feilklassene i 7.2 i designnotatet, GR-U12, registeret (#320) og samspillsreviewet.
  {
    id: 'F27',
    feilklasse: 'en referanse kan peke framover i journalen (4.2)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        '(plass.get(til)?.versjon ?? Infinity) < (plass.get(fra)?.versjon ?? -Infinity);',
        'plass.has(til) && til !== fra;',
      ],
    ],
    mal: ['en revisjon som peker framover i journalen'],
  },
  {
    id: 'F28',
    feilklasse:
      'om godkjenningen er en endringsordre, leses av et utsagn om varslingen i brevet (GR-U12)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        'gSvar?.beslutningsgrunnlag.varslingsplikt === true',
        "gSvar?.standpunkter.some((p) => p.art === 'rettidighet' && p.hjemmel === '32.2') === true",
      ],
    ],
    mal: ['F-MM-G18'],
  },
  {
    id: 'F29',
    feilklasse: 'skriveren utelater `gjelder` i svaret (7.2)',
    fil: `${K}/skriving.ts`,
    endringer: [['    gjelder: s.gjelder,\n    ...(erstatter', '    ...(erstatter']],
    mal: ['F-MM-A', 'hvert dokument er én rad med format 1'],
  },
  {
    id: 'F30',
    feilklasse: 'skriveren utelater `gjelder` i et standpunkt om rettidighet (7.2)',
    fil: `${K}/skriving.ts`,
    endringer: [['        gjelder: u.spor.frist.varsel?.id ?? krav.id,\n', '']],
    mal: ['F-MM-D', 'F-MM-A'],
  },
  {
    id: 'F31',
    feilklasse: 'skriveren utelater `gjelder` i aksepten (7.2)',
    fil: `${K}/skriving.ts`,
    endringer: [["art: 'aksept', gjelder: k.svar, ", "art: 'aksept', "]],
    mal: ['F-MM-A', 'F-MM-A5a'],
  },
  {
    id: 'F32',
    feilklasse: 'skriveren utelater `gjelder` i trekket (7.2)',
    fil: `${K}/skriving.ts`,
    endringer: [["art: 'trekk', gjelder: u.spor[k.spor].gjeldendeKrav!.id }", "art: 'trekk' }"]],
    mal: ['F-MM-B2', 'F-MM-B3'],
  },
  {
    id: 'F33',
    feilklasse: 'skriveren utelater `erstatter` i revisjonen (7.2)',
    fil: `${K}/skriving.ts`,
    endringer: [['    ...(erstatter ? { erstatter } : {}),\n', '']],
    mal: ['F-MM-A', 'F-MM-A5a'],
  },
  {
    id: 'F34',
    feilklasse: 'skriveren utelater `erstatter` i en ny kravversjon (7.2)',
    fil: `${K}/skriving.ts`,
    endringer: [['...(forrige ? { erstatter: forrige.id } : {}), ', '']],
    mal: ['F-MM-E1', 'F-MM-K1'],
  },
  {
    id: 'F35',
    feilklasse: '«ingen krav» teller ikke som avgjort i sporet (KA-U12, KA-U11)',
    fil: `${K}/utled.ts`,
    endringer: [['u.spor[n].trukket || u.spor[n].ingenKrav ||', 'u.spor[n].trukket ||']],
    mal: ['F-MM-IK1'],
  },
  {
    id: 'F36',
    feilklasse: '«ingen krav» i et spor med en kravversjon stopper ikke saken (KA-U12, 4.2)',
    fil: `${K}/utled.ts`,
    endringer: [['      spor[i.spor].krav.length ||\n', '']],
    mal: ['F-MM-IK2'],
  },
  {
    id: 'F37',
    feilklasse: 'leseren godtar et ukjent felt i `data` (4.4, MM-U2)',
    fil: `${K}/format.ts`,
    endringer: [['  additionalProperties: false,', '  additionalProperties: true,']],
    mal: ['et ukjent felt i et svar', 'en aksept med et ukjent felt'],
  },
  {
    id: 'F38',
    feilklasse: 'kjernen skriver et felt registeret ikke har (#320)',
    fil: `${K}/format.ts`,
    endringer: [
      [
        "trekk: objekt({ ...artfelt('trekk'), gjelder: ID }, ['id', 'art', 'gjelder']),",
        "trekk: objekt({ ...artfelt('trekk'), gjelder: ID, begrunnelse: TEKST }, ['id', 'art', 'gjelder']),",
      ],
    ],
    mal: ['har feltene skjemaene har'],
  },
  {
    id: 'F39',
    feilklasse: 'leseren godtar en rad uten format (B-17, 4.4)',
    fil: `${K}/leser.ts`,
    endringer: [
      [
        'if (!Number.isInteger(h.format) || (h.format as number) < 1)',
        'if (h.format !== null && (!Number.isInteger(h.format) || (h.format as number) < 1))',
      ],
    ],
    mal: ['en rad uten format'],
  },
  {
    id: 'F41',
    feilklasse: '«ingen krav» før grunnlaget er sendt, leses (oppdragsgiver 10.10)',
    fil: `${K}/utled.ts`,
    endringer: [[' ||\n      !spor.grunnlag.krav.some((k) => bakover(i.id, k.id))\n', '\n']],
    mal: ['«ingen krav» før grunnlaget er sendt'],
  },
  {
    id: 'F40',
    feilklasse:
      'en aksept av et svar med sammenfall leses, så godkjenningen slutter å være en endringsordre (GR-U8, GR-U12)',
    fil: `${K}/utled.ts`,
    endringer: [
      [
        'else if (alleSvar.get(a.gjelder)!.beslutningsgrunnlag.sammenfall)',
        'else if (alleSvar.get(a.gjelder)!.beslutningsgrunnlag.sammenfall && a.id === undefined)',
      ],
    ],
    mal: ['en aksept av et svar med sammenfall er ikke forstått'],
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
