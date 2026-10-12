/**
 * Feilinnføringene for kjernen (#304, #308, #273). F1–F7 er avsnitt 4 i
 * modellforslaget, F8–F10 feilklassene reviewet av PR #306 fant, skrevet om etter
 * MM-U9 og GR-U10, F11–F26 grensene #308 la til, og F27–F47 formatet (#273): 7.2
 * i designnotatet, GR-U12 og registeret (#320). F48 er hvitelisten fra #329,
 * F49–F51 og F54–F58 versjoneringen (#316), F52–F53 registrert korrespondanse
 * (#336), F59–F60 kodene i formatet og predikatet for endringsordre
 * (#335, #351), F61–F104 byggedel 1 av #309, F105–F131 brevteksten (#369) og
 * F132–F133 LV-U5 (#414). Én mutasjon om gangen per arbeidskopi, Vitest over hele `kjerne/`
 * og `sprakprove/kjernelagring/`, og originalteksten settes tilbake etterpå. For
 * hver mutasjon kreves det at de forventede målassertions feiler, og at alle
 * feil er assertions, ikke import, oppsett eller en brutt forutsetning
 * (`.claude/rules/tester.md`).
 *
 * Mutasjonene fordeles på flere kopier av arbeidstreet, med lokale endringer,
 * som kjører samtidig (#378). Hver kopi har sin egen testbase i samme
 * PostgreSQL; de ekstra basene bygges fra tom og slettes etterpå, så brukeren i
 * `KOE_TESTBASE_URL` må kunne opprette baser. Arbeidstreet muteres ikke.
 * `FEILINNFOERING_ARBEIDSKOPIER` overstyrer antallet, som ellers er antallet
 * prosessorer. `FEILINNFOERING_DEL=i/n` kjører bare del i av n: hver n-te
 * mutasjon fra og med nummer i, med sin egen kontrollkjøring over hele
 * samlingen. Workflowen fordeler delene på flere jobber, og en ny mutasjon havner
 * i en av dem uten videre. Fra-strengene kontrolleres for alle delene.
 *
 * Kjøres fra repoets rot, med testbasen oppe og `KOE_TESTBASE_URL` satt:
 *   node kjerne/tester/feilinnfoering.ts [F1 F2 ...]
 * Forventet: «oppdaget» for hver mutasjon. Hopper kontrollkjøringen over en
 * test, for eksempel lagringstestene uten testbasen, avsluttes skriptet med
 * kode 2 før noen mutasjon (#353).
 */

import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { availableParallelism, constants, tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

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
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "} from '../utledning/utled.ts';",
        "} from '../utledning/utled.ts';\nimport { visning } from '../utledning/visning.ts';",
      ],
      [
        '  if (kraveneErAvgjort(u))',
        "  if (visning(u, { versjon: 0, gjelderVarslingsplikten: () => true }).status.kode === 'avsluttet_oppgjort' || kraveneErAvgjort(u))",
      ],
    ],
    mal: [
      'kommandoer/forutsetninger.ts når ikke visningen',
      'kommandoer/avvisning.ts når ikke visningen',
      'kommandoer/skriving.ts når ikke visningen',
    ],
  },
  {
    id: 'F2',
    feilklasse:
      'leseren knytter svaret til kravet etter plassen i journalen, ikke til `gjelder` (7.2)',
    fil: `${K}/utledning/utled.ts`,
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
    fil: `${K}/format/leser.ts`,
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
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "  standpunktet,\n} from '../frosset/standpunkt.ts';",
        "  standpunktet,\n  virkninger as regn,\n} from '../frosset/standpunkt.ts';",
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
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['if (k.regelversjon !== regler.versjon)', 'if (k.regelversjon === undefined)']],
    mal: ['F-MM-C3d-kontroll'],
  },
  {
    id: 'F6',
    feilklasse:
      'en preklusjon er avklart selv om et annet varsel er registrert etter brevet (MM-U8)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['p.gjelder !== varselNaa(s)', 'p.gjelder === undefined']],
    mal: ['F-MM-D', 'F-MM-D-godtatt', 'avviser aksepten når et varsel er registrert etter brevet'],
  },
  {
    id: 'F7',
    feilklasse: 'et bufret resultat fra en nyere kjerne brukes etter en tilbakerulling',
    fil: `${K}/utledning/buffer.ts`,
    endringer: [['b.versjon[n] === egen[n]', 'b.versjon[n] >= egen[n]']],
    mal: [
      'brukes ikke med nyere projeksjonsversjon',
      'brukes ikke med nyere regelversjon',
      'brukes ikke med nyere leserformat',
    ],
  },
  {
    id: 'F8',
    feilklasse: 'et godkjent grunnlag er ikke enighet ved sammenfall (GR-U10, #312)',
    fil: `${K}/frosset/standpunkt.ts`,
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
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['if (neste.length > 0 || kjede.size !== paaKravet.length)', 'if (neste.length > 1)'],
    ],
    mal: ['F-MM-E4'],
  },
  {
    id: 'F10',
    feilklasse: 'innsigelsen om fremdriftshindring (§ 33.1) forsvinner når brevet skrives',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      ["ut.push({ id: nyId(), art: 'hindring', oppfylt: v.vilkar_oppfylt });", 'void 0;'],
    ],
    mal: ['avslår prinsipalt, med dagene som subsidiært standpunkt'],
  },
  // F11–F26 er grensene #308 la til.
  {
    id: 'F11',
    feilklasse: 'kjernen importerer fra språkprøven og pg',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "import type { Regelsett } from '../regler/regelsett.ts';",
        "import type { Regelsett } from '../regler/regelsett.ts';\nimport type { Pool } from 'pg';\nimport type { Hendelse } from '../../sprakprove/kjerne/typer.ts';\nexport type Ute = [Pool, Hendelse];",
      ],
    ],
    mal: ['utledning/utled.ts importerer ingenting utenfor kjernen'],
  },
  {
    id: 'F12',
    feilklasse: 'en ny kravversjon opphever enigheten i stedet for å avvises (KA-U7)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
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
    fil: `${K}/utledning/utled.ts`,
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
    fil: `${K}/format/leser.ts`,
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
    feilklasse: 'en regel leser det lagrede utfallet i et svar (MM-U11, #329)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "        return avvis('IKKE_GJELDENDE_SVAR', 'Aksepten må gjelde gjeldende svar i dette sporet.');\n",
        "        return avvis('IKKE_GJELDENDE_SVAR', 'Aksepten må gjelde gjeldende svar i dette sporet.');\n      if (s.gjeldendeSvar.utregning.resultat === 'avslaatt') return null;\n",
      ],
    ],
    mal: ['reglene leser bare det LESBART tillater (#308, #329) kommandoer/forutsetninger.ts'],
  },
  {
    id: 'F16',
    feilklasse: 'enighet ved sammenfall leses ikke fra brevet (GR-U7, GR-U10, KA-U10)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['else if (g.beslutningsgrunnlag.sammenfall)', 'else if (g.standpunkter.length < 0)'],
    ],
    mal: ['F-MM-A', 'F-MM-G10', 'F-MM-K1'],
  },
  {
    id: 'F17',
    feilklasse: 'et trukket spor gir alene grunnlag for endringsordre (EO-U5)',
    fil: `${K}/utledning/utled.ts`,
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
    fil: `${K}/format/leser.ts`,
    endringer: [
      ['if (part !== null && avsender !== part)', 'if (part !== null && avsender === undefined)'],
    ],
    mal: ['en rad fra feil part er ikke forstått'],
  },
  {
    id: 'F19',
    feilklasse: 'skjemakontrollen godtar navn fra prototypen som kjente felt',
    fil: `${K}/format/skjema.ts`,
    endringer: [['if (Object.hasOwn(egenskaper, navn))', 'if (navn in egenskaper)']],
    mal: ['avviser constructor i innholdet'],
  },
  {
    id: 'F20',
    feilklasse: 'et rettidig varsel blir uavklart når et varsel registreres senere (MM-U8)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['            !p.iTide &&\n', '']],
    mal: ['F-MM-D-itide'],
  },
  {
    id: 'F21',
    feilklasse: 'et krav på 0 dager godtas (KA-U8)',
    fil: `${K}/format/format.ts`,
    endringer: [
      [
        "frist: { properties: { dager: { type: 'integer', minimum: 1 } }, required: ['dager'] },",
        "frist: { properties: { dager: { type: 'integer', minimum: 0 } }, required: ['dager'] },",
      ],
    ],
    mal: ['F-MM-K0', 'et krav på 0 dager'],
  },
  {
    id: 'F22',
    feilklasse: 'brevet fryses uten kategorien svaret gjelder (MM-U9, § 32.2, GR-U12)',
    fil: `${K}/frosset/frysing.ts`,
    endringer: [
      [
        'return beslutningsgrunnlag(innhold, grunnlagskrav, regler, innsigelse);',
        'return beslutningsgrunnlag(innhold, undefined, regler, innsigelse);',
      ],
    ],
    mal: ['registrert korrespondanse fryses med kategorien', 'F-MM-C', 'F-MM-G18'],
  },
  {
    id: 'F23',
    feilklasse:
      'TE trekker grunnlaget når partene er enige ved sammenfall med varslingsplikt (KA-U13)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "if (h.spor === 'grunnlag' && trekkAvGrunnlagetErSperret(u))",
        "if (h.spor === 'grunnlag' && trekkAvGrunnlagetErSperret(u) && u.frafalt)",
      ],
    ],
    mal: ['F-MM-G10', 'F-MM-G18', 'F-MM-G20'],
  },
  {
    id: 'F24',
    feilklasse: 'forbudet mot trekk gjelder også kategorier § 32.2 ikke gjelder for (KA-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['blirEndringsordre(gSvar.beslutningsgrunnlag)', '(gSvar.beslutningsgrunnlag.sammenfall)'],
    ],
    mal: ['F-MM-G13', 'F-MM-G14', 'F-MM-G19'],
  },
  {
    id: 'F25',
    feilklasse: 'om godkjenningen er en endringsordre, leses av dagens regelsett (MM-U9, KA-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'blirEndringsordre(gSvar.beslutningsgrunnlag)',
        '(gSvar.beslutningsgrunnlag.sammenfall && regler.gjelderVarslingsplikten(String(spor.grunnlag.gjeldendeKrav?.innhold.hovedkategori), String(spor.grunnlag.gjeldendeKrav?.innhold.underkategori)))',
      ],
    ],
    mal: ['F-MM-G15'],
  },
  {
    id: 'F26',
    feilklasse: 'trekk av grunnlaget sperres av ethvert svar, også avslag og frafall (KA-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'blirEndringsordre(gSvar.beslutningsgrunnlag)',
        '(gSvar.beslutningsgrunnlag.varslingsplikt === true)',
      ],
    ],
    mal: ['F-MM-G16', 'F-MM-G17'],
  },
  // F27–F47 er formatet (#273): feilklassene i 7.2 i designnotatet, GR-U12, registeret (#320) og samspillsreviewet.
  {
    id: 'F27',
    feilklasse: 'en referanse kan peke framover i journalen (4.2)',
    fil: `${K}/utledning/utled.ts`,
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
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'blirEndringsordre(gSvar.beslutningsgrunnlag)',
        "(gSvar.beslutningsgrunnlag.sammenfall && gSvar.standpunkter.some((p) => p.art === 'rettidighet' && p.hjemmel === '32.2'))",
      ],
    ],
    mal: ['F-MM-G18'],
  },
  {
    id: 'F29',
    feilklasse: 'skriveren utelater `gjelder` i svaret (7.2)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['    gjelder: s.gjelder,\n    ...(erstatter', '    ...(erstatter']],
    mal: ['F-MM-A', 'hvert dokument er én rad med format 1'],
  },
  {
    id: 'F30',
    feilklasse: 'skriveren utelater `gjelder` i et standpunkt om rettidighet (7.2)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['        gjelder: u.spor.frist.varsel?.id ?? krav.id,\n', '']],
    mal: ['F-MM-D', 'F-MM-A'],
  },
  {
    id: 'F31',
    feilklasse: 'skriveren utelater `gjelder` i aksepten (7.2)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [["art: 'aksept', gjelder: k.svar, ", "art: 'aksept', "]],
    mal: ['F-MM-A', 'F-MM-A5a'],
  },
  {
    id: 'F32',
    feilklasse: 'skriveren utelater `gjelder` i trekket (7.2)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [["art: 'trekk', gjelder: u.spor[k.spor].gjeldendeKrav!.id }", "art: 'trekk' }"]],
    mal: ['F-MM-B2', 'F-MM-B3'],
  },
  {
    id: 'F33',
    feilklasse: 'skriveren utelater `erstatter` i revisjonen (7.2)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['    ...(erstatter ? { erstatter } : {}),\n', '']],
    mal: ['F-MM-A', 'F-MM-A5a'],
  },
  {
    id: 'F34',
    feilklasse: 'skriveren utelater `erstatter` i en ny kravversjon (7.2)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['...(forrige ? { erstatter: forrige.id } : {}), ', '']],
    mal: ['F-MM-E1', 'F-MM-K1'],
  },
  {
    id: 'F35',
    feilklasse: '«ingen krav» teller ikke som avgjort i sporet (KA-U12, KA-U11)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['u.spor[n].trukket || u.spor[n].ingenKrav ||', 'u.spor[n].trukket ||']],
    mal: ['F-MM-IK1'],
  },
  {
    id: 'F36',
    feilklasse: '«ingen krav» i et spor med en kravversjon stopper ikke saken (KA-U12, 4.2)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      spor[i.spor].krav.length ||\n', '']],
    mal: ['F-MM-IK2'],
  },
  {
    id: 'F37',
    feilklasse: 'leseren godtar et ukjent felt i `data` (4.4, MM-U2)',
    fil: `${K}/format/format.ts`,
    endringer: [['  additionalProperties: false,', '  additionalProperties: true,']],
    mal: ['et ukjent felt i et svar', 'en aksept med et ukjent felt'],
  },
  {
    id: 'F38',
    feilklasse: 'kjernen skriver et felt registeret ikke har (#320)',
    fil: `${K}/format/format.ts`,
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
    fil: `${K}/format/leser.ts`,
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
    feilklasse: '«ingen krav» før grunnlaget er sendt, leses (KA-U15)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [[' ||\n      !spor.grunnlag.krav.some((k) => bakover(i.id, k.id))\n', '\n']],
    mal: ['«ingen krav» før grunnlaget er sendt'],
  },
  {
    id: 'F42',
    feilklasse:
      'en manglende opplysning om § 31.3 leses som at godkjenningen er en endringsordre (GR-U13, KA-U14)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["    if (om313 === undefined) return 'ikke_avklart';", '']],
    mal: ['F-MM-G20'],
  },
  {
    id: 'F43',
    feilklasse: 'opplysningen om at § 31.3 ikke er oppfylt, leses ikke (GR-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "if (om313?.oppfylt === false) return 'nei';",
        "if (om313?.oppfylt === false && !om313) return 'nei';",
      ],
    ],
    mal: ['F-MM-G21'],
  },
  {
    id: 'F44',
    feilklasse: 'en manglende opplysning om § 31.3 leses som et nei (GR-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "    if (om313 === undefined) return 'ikke_avklart';",
        "    if (om313 === undefined) return 'nei';",
      ],
    ],
    mal: ['F-MM-G20'],
  },
  {
    id: 'F45',
    feilklasse: 'to opplysninger om § 31.3 for samme brev leses (MM-U12, B-16)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "opplysninger.filter((x) => x.hva === 'endringsordre' && x.brev === o.brev).length > 1 ||",
        'false ||',
      ],
    ],
    mal: ['to opplysninger om samme brev er ikke forstått'],
  },
  {
    id: 'F46',
    feilklasse: 'datoen for et varsel i kravet leses som at kravet er sendt utenfor appen (HF-U1)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['dato: k.varsel.sendt, gjelder: varsel }];', 'dato: k.varsel.sendt }];']],
    mal: ['F-MM-D-kravvarsel'],
  },
  {
    id: 'F47',
    feilklasse: 'en bestridelse godtas i en sak som ikke er forstått (MM-U14)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [['  if (!u.forstaatt)\n', "  if (!u.forstaatt && h.type !== 'bestride')\n"]],
    mal: ['F-MM-E9'],
  },
  {
    id: 'F40',
    feilklasse:
      'en aksept av et svar med sammenfall leses, så godkjenningen slutter å være en endringsordre (GR-U8, GR-U12)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'else if (alleSvar.get(a.gjelder)!.beslutningsgrunnlag.sammenfall)',
        'else if (alleSvar.get(a.gjelder)!.beslutningsgrunnlag.sammenfall && a.id === undefined)',
      ],
      // Strid-kontrollen (MM-U18) fanger det samme; begge må muteres.
      [
        '      SPOR.some((n) => u.spor[n].enighet && u.spor[n].gjeldendeSvar?.id === x.gjelder)',
        '      !x',
      ],
    ],
    mal: ['en aksept av et svar med sammenfall er ikke forstått'],
  },
  {
    id: 'F48',
    feilklasse: 'en regel leser en oppsummering under et nytt navn i utledningen (#329)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['export interface Utledning {\n', 'export interface Utledning {\n  ferdig?: boolean;\n'],
      ['    u.grunnlagAvklart &&\n', '    (u.ferdig ?? u.grunnlagAvklart) &&\n'],
    ],
    mal: ['reglene leser bare det LESBART tillater (#308, #329) utledning/utled.ts'],
  },
  {
    id: 'F49',
    feilklasse:
      'kjernen leser bare formatet den skriver, så en versjon som leser et nytt format, stopper saken (B-10, #316)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        'return utled(lesJournal(journal, kjerne.leserformat), kjerne.regler);',
        'return utled(lesJournal(journal, kjerne.format), kjerne.regler);',
      ],
    ],
    mal: ['skrevet av v2b, lest av v2a'],
  },
  {
    id: 'F50',
    feilklasse: 'spørringen etter utdaterte buffere ser bort fra saksversjonen (B-10, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [
      ['             OR m.kjerne_saksversjon IS DISTINCT FROM h.versjon)', '             )'],
    ],
    mal: ['finner en sak med en ny hendelse etter bufferen, og bare den'],
  },
  {
    id: 'F51',
    feilklasse: 'gjenoppbyggingen skriver mer enn bufferen (merknaden 07.10 til B-10, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [
      [
        'SET kjerne_visning = $2::jsonb,',
        'SET cached_status = kjerne_regelversjon::text, kjerne_visning = $2::jsonb,',
      ],
    ],
    mal: ['finner de utdaterte sakene og bygger dem på nytt uten å endre noe annet enn bufferen'],
  },
  {
    id: 'F52',
    feilklasse:
      'visningen merker et svar sendt fra appen, ikke det registrerte, som appens vurdering ved registreringen (MM-U17, #336)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        'if (s.gjeldendeSvar && vurdertVedRegistreringen(u, s.gjeldendeSvar.id))',
        'if (s.gjeldendeSvar && !vurdertVedRegistreringen(u, s.gjeldendeSvar.id))',
      ],
    ],
    mal: ['F-MM-R1-kontroll'],
  },
  {
    id: 'F53',
    feilklasse:
      'et registrert brev fryses med reglene da det ble sendt, ikke ved registreringen (MM-U17, #336)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        "import { avvisning } from './avvisning.ts';",
        "import { avvisning } from './avvisning.ts';\nimport { GJELDENDE_REGLER } from '../regler/regelsett.ts';",
      ],
      [
        '    s.beslutningsgrunnlag = lagret(frys(s, krav, kjerne.regler, innsigelse));',
        '    s.beslutningsgrunnlag = lagret(frys(s, krav, GJELDENDE_REGLER, innsigelse));',
      ],
    ],
    mal: ['F-MM-R1'],
  },
  {
    id: 'F54',
    feilklasse: 'oversikten viser en utdatert sak uten merket «Oppdateres» (MM-U15, #316)',
    fil: `${K}/utledning/buffer.ts`,
    endringer: [['oppdateres: !b || !bufferGjelder(b, kjerne, saksversjon),', 'oppdateres: !b,']],
    mal: ['viser siste kjente status i oversikten'],
  },
  {
    id: 'F55',
    feilklasse: 'lista før en tilbakerulling tar med saker kjernen leser (B-10, MM-U2, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [
      ['WHERE prosjekt_id = $1 AND format > $2', 'WHERE prosjekt_id = $1 AND format >= $2'],
    ],
    mal: ['lister sakene med en rad i et format kjernen ikke leser'],
  },
  {
    id: 'F56',
    feilklasse:
      'spørringen etter utdaterte buffere tar med saker uten rader fra kjernen (B-17, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [['GROUP BY sak_id HAVING count(format) > 0) h', 'GROUP BY sak_id) h']],
    mal: ['tar ikke med en sak uten rader fra kjernen'],
  },
  {
    id: 'F57',
    feilklasse: 'bufferen leses på tvers av prosjektgrensen (AGENTS.md, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [
      [
        'FROM sak_metadata WHERE sak_id = $1 AND prosjekt_id = $2`,',
        'FROM sak_metadata WHERE sak_id = $1 AND $2::text IS NOT NULL`,',
      ],
    ],
    mal: ['lar bufferen holde seg i prosjektet'],
  },
  {
    id: 'F58',
    feilklasse: 'bufferen skrives på tvers av prosjektgrensen (AGENTS.md, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [
      ['WHERE sak_id = $1 AND prosjekt_id = $7`,', 'WHERE sak_id = $1 AND $7::text IS NOT NULL`,'],
    ],
    mal: ['lar bufferen holde seg i prosjektet'],
  },
  {
    id: 'F59',
    feilklasse: 'kategorien er ikke et par fra den lukkede listen (#335, HF-U1)',
    fil: `${K}/format/format.ts`,
    endringer: [['    anyOf: KATEGORIPAR,\n', '']],
    mal: [
      'avviser en underkategori under feil hovedkategori',
      'en lagret rad med katalogens koder er ikke forstått',
    ],
  },
  {
    id: 'F60',
    feilklasse: 'svarutkastet får andre standpunkter enn brevet (#351)',
    fil: `${K}/frosset/frysing.ts`,
    endringer: [
      [
        'standpunkter: grunnlagsstandpunkter(vurderinger, krav,',
        'standpunkter: grunnlagsstandpunkter({ resultat: vurderinger.resultat }, krav,',
      ],
    ],
    mal: ['svarutkastet blir en endringsordre som brevet det gir'],
  },
  // Byggedel 1 av #309: #344, #373, #342, MM-U18 (#326), KA-U16/KA-U20, KA-U22, § 5,
  // VS-U11, VS-U12 og «ingen krav».
  {
    id: 'F61',
    feilklasse: 'en importert verdi leses i en annen funksjon enn den den er avgrenset til (#344)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '/**\n * KA-U13 og KA-U14',
        'export const proeve = (s: Svar, v: Standpunktsvirkning[]) => grunnlagetErAvklart(s, v);\n\n/**\n * KA-U13 og KA-U14',
      ],
    ],
    mal: ['reglene leser bare det LESBART tillater (#308, #329) utledning/utled.ts'],
  },
  {
    id: 'F62',
    feilklasse: 'kjernen gir tekst basen ikke kan lagre, en annen kode enn sin egen (#373)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        '  if (harUlagringsbarTekst(kommando))',
        '  if (!kommando && harUlagringsbarTekst(kommando))',
      ],
    ],
    mal: ['gir TEKST_KAN_IKKE_LAGRES'],
  },
  {
    id: 'F63',
    feilklasse: 'leseren godtar en lagret rad med tekst basen ikke kan lagre (#373)',
    fil: `${K}/format/skjema.ts`,
    endringer: [
      [
        "  if (typeof verdi === 'string' && ulagringsbarTekst(verdi))",
        "  if (typeof verdi === 'string' && ulagringsbarTekst(verdi) && sti === '')",
      ],
    ],
    mal: ['en lagret rad med NUL i teksten er ikke forstått'],
  },
  {
    id: 'F64',
    feilklasse:
      'subsidiariteten leses av gjeldende grunnlagsversjon, ikke av den svaret ble regnet mot (#342, GR-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    const fra = grunnlagskjede.findIndex((k) => k.id === sistBesvart?.grunnlagskrav);',
        '    const fra = grunnlagskjede.findIndex((k) => k.id === (sistBesvart && spor.grunnlag.gjeldendeKrav?.id));',
      ],
    ],
    mal: ['F-MM-S342'],
  },
  {
    id: 'F65',
    feilklasse:
      'leseren godtar en grunnlagsversjon som ikke er et grunnlagskrav før svaret (#342, HF-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      (s.grunnlagskrav !== null &&', '      (s.grunnlagskrav === undefined &&']],
    mal: [
      'et lagret svar med et vederlagskrav som grunnlagsversjon er ikke forstått',
      'et lagret svar med en grunnlagsversjon som ikke finnes er ikke forstått',
    ],
  },
  {
    id: 'F66',
    feilklasse: 'en revisjon i et spor med enighet leses med virkning (MM-U18, GR-U10)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    else if (s.erstatter !== null && u.spor[s.spor].enighet)',
        '    else if (s.erstatter !== null && u.spor[s.spor].enighet && !s)',
      ],
    ],
    mal: ['F-MM-U326e'],
  },
  {
    id: 'F67',
    feilklasse:
      'en hendelse som endrer utfallet etter at saken er lukket, leses med virkning (MM-U18, SK-01, KA-U11)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "  const lukket = u.grunnlagAvvist\n    ? 'TE har godtatt avslaget av grunnlaget (SK-01)'\n    : kraveneErAvgjort(u)",
        "  const lukket = !u\n    ? 'TE har godtatt avslaget av grunnlaget (SK-01)'\n    : !u",
      ],
    ],
    mal: ['F-MM-U326h'],
  },
  {
    id: 'F68',
    feilklasse: 'en aksept av et frafall leses som enighet (MM-U18, GR-U9)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "    else if (x.art === 'aksept' && x.gjelder === u.spor.grunnlag.gjeldendeSvar?.id && u.frafalt)",
        "    else if (x.art === 'aksept' && x.gjelder === u.spor.grunnlag.gjeldendeSvar?.id && !u)",
      ],
    ],
    mal: ['F-MM-U326b'],
  },
  {
    id: 'F69',
    feilklasse:
      'leseren kontrollerer ikke at sammenfallet stemmer med standpunktene (MM-U18, #326)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    if (!sammenfallStemmer(s))', '    if (!sammenfallStemmer(s) && !s)']],
    mal: ['et avslag lagret med sammenfall er ikke forstått'],
  },
  {
    id: 'F70',
    feilklasse: 'et registrert brev som strider mot en enighet, gjør saken ikke forstått (MM-U18)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      if (registrert) uten.set(', '      if (!registrert) uten.set(']],
    mal: ['F-MM-U326e', 'F-MM-U326f'],
  },
  {
    id: 'F71',
    feilklasse: 'TE kan godta et svar i et merket brev (KA-U16, KA-U20)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [['      if (s.forbehold)', '      if (s.forbehold && !s)']],
    mal: ['F-MM-M1'],
  },
  {
    id: 'F72',
    feilklasse: 'en endringsordre kan bygge på et merket brev (KA-U20, EO-U5)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    !SPOR.some((n) => u.spor[n].forbehold) &&', '']],
    mal: ['F-MM-M2'],
  },
  {
    id: 'F73',
    feilklasse: 'trekket godtas når appen ikke kan bevare byggherrens avtalte rettigheter (KA-U22)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        '      if (trekkKanIkkeBevareAvtalen(u, h.spor))',
        '      if (!u && trekkKanIkkeBevareAvtalen(u, h.spor))',
      ],
    ],
    mal: ['F-MM-T1'],
  },
  {
    id: 'F74',
    feilklasse:
      'sperren i KA-U22 dekker ikke trekket av grunnlaget, som trekker vederlag og frist med seg',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["  (spor === 'grunnlag' ? SPOR : [spor]).some(", '  [spor].some(']],
    mal: ['F-MM-T1'],
  },
  {
    id: 'F75',
    feilklasse:
      'en merking endrer om godkjenningen er en endringsordre, i stedet for å gi sperren (KA-U26, KA-U28)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "    if (om313 === undefined) return 'ikke_avklart';",
        "    if (om313 === undefined || spor.grunnlag.forbehold) return 'ikke_avklart';",
      ],
    ],
    mal: ['F-MM-M5', 'F-MM-T2'],
  },
  {
    id: 'F76',
    feilklasse: 'motparten kan avklare en merking av et brev den ikke sendte (KA-U20)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      ['      return u.elementer[o.opplysning.brev]?.part === part', '      return true'],
    ],
    mal: ['F-MM-M1'],
  },
  {
    id: 'F77',
    feilklasse: 'et registrert svar uten standpunkt om rettidighet leses uten innsigelsen (VS-U11)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        '    s.beslutningsgrunnlag = lagret(frys(s, krav, kjerne.regler, innsigelse));',
        '    s.beslutningsgrunnlag = lagret(frys(s, krav, kjerne.regler, innsigelse && undefined));',
      ],
    ],
    mal: ['F-MM-V2', 'F-MM-U326g'],
  },
  {
    id: 'F78',
    feilklasse: 'en part kan gjøre innsigelse mot sitt eget krav (VS-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '  maal !== undefined && maal.part !== part && KAN_FAA_INNSIGELSE.has(maal.art);',
        '  maal !== undefined && KAN_FAA_INNSIGELSE.has(maal.art);',
      ],
    ],
    mal: ['F-MM-V1', 'en innsigelse fra TE mot eget krav'],
  },
  {
    id: 'F79',
    feilklasse: 'passiviteten kan påberopes der § 32.2 ikke gjelder (VS-U12, GR-U11)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '      return gjelderVarslingsplikten(krav, regler)',
        '      return krav || gjelderVarslingsplikten(krav, regler)',
      ],
    ],
    mal: ['F-MM-V4b'],
  },
  {
    id: 'F80',
    feilklasse: '«ingen krav» godtas i et spor med krav (KA-U12)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [['      if (s.krav.length)', '      if (s.krav.length && !s)']],
    mal: ['F-MM-IK3'],
  },
  {
    id: 'F81',
    feilklasse: 'TE kan si «ingen krav» før grunnlaget er sendt (KA-U15)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "      if (!grunnlagSendt)\n        return avvis('GRUNNLAG_IKKE_SENDT', 'Grunnlaget må være sendt før du kan si «ingen krav».');",
        "      if (!grunnlagSendt && !s)\n        return avvis('GRUNNLAG_IKKE_SENDT', 'Grunnlaget må være sendt før du kan si «ingen krav».');",
      ],
    ],
    mal: ['F-MM-IK4'],
  },
  {
    id: 'F82',
    feilklasse: 'en innsigelse avvises når kravene er avgjort (KA-U11, MM-U7)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "    case 'innsigelse':\n      // VS-U1, VS-U14",
        "    case 'innsigelse':\n      if (kraveneErAvgjort(u)) return avvis('KRAVENE_AVGJORT', '');\n      // VS-U1, VS-U14",
      ],
    ],
    mal: ['F-MM-V5'],
  },
  {
    id: 'F83',
    feilklasse:
      'et registrert svar regnet mot en grunnlagsversjon uten virkning stopper saken (MM-U18, #342)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    else if (utenVirkning(s.gjelder, s.erstatter, s.grunnlagskrav))',
        '    else if (utenVirkning(s.gjelder, s.erstatter))',
      ],
    ],
    mal: ['et svar regnet mot den bevares uten virkning'],
  },
  {
    id: 'F84',
    feilklasse:
      'en påberopt passivitet mot en grunnlagsversjon uten virkning stopper saken (MM-U18, VS-U12)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "        return maal.art === 'krav' && kravMedUten.get(id)?.spor === 'grunnlag';",
        "        return maal.art === 'krav' && alleKrav.get(id)?.spor === 'grunnlag';",
      ],
    ],
    mal: ['en påberopt passivitet mot den er forstått'],
  },
  {
    id: 'F85',
    feilklasse:
      'et registrert svar som tier, leses med en innsigelse byggherren har gitt opp uttrykkelig (VS-U9, VS-U11)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        ' &&\n        !innsigelsenErOppgitt(i.gjelder, s.spor as Spor, svarFraParten.slice(i.fra))',
        '',
      ],
    ],
    mal: ['F-MM-V7'],
  },
  {
    id: 'F86',
    feilklasse: 'leseren godtar et svar lest med en innsigelse parten har gitt opp (VS-U9, VS-U11)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '        ) ||\n        innsigelsenErOppgitt(',
        '        ) ||\n        !s && innsigelsenErOppgitt(',
      ],
    ],
    mal: ['lest med en innsigelse byggherren har gitt opp uttrykkelig'],
  },
  {
    id: 'F87',
    feilklasse: 'et nytt utsagn fra motparten opphever sperren for et merket brev (KA-U20)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      (x) => elementer[x.id].part === elementer[brev].part && bakover(x.id, brev)',
        '      (x) => bakover(x.id, brev)',
      ],
    ],
    mal: ['F-MM-M4'],
  },
  {
    id: 'F88',
    feilklasse:
      'merkingen faller bort når elementet i brevet er uten virkning (KA-U26, MM-U18, MM-U19)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      (o) => o.spor.includes(n) && avklaringAv(o.id) === null && !nyttFraAvsenderen(o.brev, n)',
        '      (o) => o.spor.includes(n) && avklaringAv(o.id) === null && !nyttFraAvsenderen(o.brev, n) && !dokumenter.get(o.brev)!.svar.some((x) => uten.has(x.id))',
      ],
    ],
    mal: ['F-MM-U326i'],
  },
  {
    id: 'F89',
    feilklasse:
      'sperren gjelder brevet, ikke sporet: et svar i et annet spor holder den i live (KA-U20, KA-U26)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      (o) => o.spor.includes(n) && avklaringAv(o.id) === null && !nyttFraAvsenderen(o.brev, n)',
        '      (o) => o.spor.includes(n) && avklaringAv(o.id) === null && (!nyttFraAvsenderen(o.brev, n) || dokumenter.get(o.brev)!.svar.some((x) => spor[x.spor].gjeldendeSvar?.id === x.id))',
      ],
    ],
    mal: ['F-MM-M3'],
  },
  {
    id: 'F90',
    feilklasse:
      'subsidiariteten går tilbake til svaret på versjonen det ble regnet mot, når grunnlaget er besvart igjen (GR-U1, GR-U4)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['            .slice(fra)', '            .slice(fra, fra + 1)']],
    mal: ['F-MM-S342b'],
  },
  {
    id: 'F91',
    feilklasse:
      'innsigelsen et fristsvar er lest med, er avklart selv om TE har registrert varselet etterpå (MM-U1, MM-U8)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '        innsigelse.gjelder !== varselNaa(s) &&\n        !harTattStillingTilVarselet(s)',
        '        !innsigelse &&\n        !harTattStillingTilVarselet(s)',
      ],
    ],
    mal: ['F-MM-V8'],
  },
  {
    id: 'F92',
    feilklasse: 'en kravversjon etter trekk leses med virkning (MM-U18, MM-U19, GR-U5)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['    else if (u.spor[k.spor].trukket)', '    else if (u.spor[k.spor].trukket && !k)'],
    ],
    mal: ['F-MM-IK6', 'F-MM-IK6b'],
  },
  {
    id: 'F93',
    feilklasse:
      'en kravversjon etter «ingen krav» stopper saken også når den er registrert (MM-U19, KA-U12)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['    else if (u.spor[k.spor].ingenKrav)', '    else if (u.spor[k.spor].ingenKrav && !k)'],
    ],
    mal: ['F-MM-IK5', 'F-MM-IK5b'],
  },
  {
    id: 'F94',
    feilklasse:
      'trekket av grunnlaget slår fast at en merket godkjenning er en endringsordre (KA-U26)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "        return u.endringsordre === 'ikke_avklart' || godkjenningenErMerket(u)",
        "        return u.endringsordre === 'ikke_avklart'",
      ],
    ],
    mal: ['F-MM-M5', 'F-MM-T2'],
  },
  {
    id: 'F95',
    feilklasse:
      'art og part kontrolleres ikke når målet for en innsigelse er uten virkning (VS-U1, VS-U14)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      !kanGjelde(x.art, maal, elementer[x.id].part, x.gjelder)',
        '      !(uten.has(x.gjelder) || kanGjelde(x.art, maal, elementer[x.id].part, x.gjelder))',
      ],
    ],
    mal: ['F-MM-V9'],
  },
  {
    id: 'F96',
    feilklasse:
      'kontrollen i MM-U18 gjør vilkåret for å sende en aksept til en regel om enighet (KA-U20)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "      ut.push({ element: x.id, grunn: 'en aksept av et frafall (GR-U9)' });",
        "      ut.push({ element: x.id, grunn: 'en aksept av et frafall (GR-U9)' });\n    else if (x.art === 'aksept' && SPOR.some((n) => u.spor[n].gjeldendeSvar?.id === x.gjelder && u.spor[n].forbehold))\n      ut.push({ element: x.id, grunn: 'merket' });",
      ],
    ],
    mal: ['F-MM-M6', 'F-MM-M6b'],
  },
  {
    id: 'F97',
    feilklasse:
      'en merking av et annet brev i grunnlaget gjør godkjenningen fra appen uavklart ved trekk (KA-U26, KA-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '  u.spor.grunnlag.merket.includes(u.spor.grunnlag.gjeldendeSvar.dokument);',
        '  u.spor.grunnlag.forbehold;',
      ],
    ],
    mal: ['F-MM-T3'],
  },
  {
    id: 'F98',
    feilklasse:
      'i fristen ser oppgivelsen bare etter standpunkter om det innsigelsen gjelder, ikke om varselet (VS-U9, VS-U11)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [["(spor === 'frist' || p.gjelder === gjelder)", '(p.gjelder === gjelder)']],
    mal: ['F-MM-V7b'],
  },
  {
    id: 'F99',
    feilklasse:
      'innsigelsen et fristsvar er lest med, er uavklart selv om byggherren har tatt stilling til det registrerte varselet (MM-U1, MM-U8)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['        !harTattStillingTilVarselet(s)', '        !!s']],
    mal: ['F-MM-V8b', 'F-MM-V8c'],
  },
  {
    id: 'F100',
    feilklasse:
      'i grunnlaget gir et standpunkt om en annen kravversjon opp innsigelsen (VS-U9, VS-U11)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [["(spor === 'frist' || p.gjelder === gjelder)", '(true)']],
    mal: ['F-MM-V7c'],
  },
  {
    id: 'F101',
    feilklasse: 'et standpunkt i et annet spor gir opp innsigelsen (VS-U9, VS-U11)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['    .filter((x) => x.spor === spor)', '    .filter((x) => x.spor === x.spor)']],
    mal: ['F-MM-V7d'],
  },
  {
    id: 'F102',
    feilklasse:
      'et registrert svar på vederlaget etter en innsigelse leses som om innsigelsen er oppgitt (VS-U9, OV-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "      s.spor === 'vederlag' &&\n      henvisninger.some(",
        '      !s &&\n      henvisninger.some(',
      ],
    ],
    mal: ['F-MM-V3c'],
  },
  {
    id: 'F103',
    feilklasse:
      'en registrert aksept av et svar partene alt er enige om, stopper saken (MM-U19, GR-U8, KA-U7)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      SPOR.some((n) => u.spor[n].enighet && u.spor[n].gjeldendeSvar?.id === x.gjelder)',
        '      !x',
      ],
    ],
    mal: ['F-MM-U326l', 'F-MM-U326m'],
  },
  {
    id: 'F104',
    feilklasse:
      'en merking i ett spor sperrer trekk av en enighet i et annet spor (KA-U30, KA-U26)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    (n) => u.spor[n].enighet !== null && u.spor[n].forbehold',
        '    (n) => u.spor[n].enighet !== null && SPOR.some((m) => u.spor[m].forbehold)',
      ],
    ],
    mal: ['F-MM-T4'],
  },
  {
    id: 'F105',
    feilklasse: 'brevet for trekk av grunnlaget sier ikke hva trekket ikke opphever (KA-U22)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        ' Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`',
        '`',
      ],
    ],
    mal: ['trekk av grunnlaget'],
  },
  {
    id: 'F106',
    feilklasse: '«ingen krav» i vederlaget sier ikke at forseringsvederlaget er unntatt (KA-U25)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [[' Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.`', '`']],
    mal: ['«ingen krav» i vederlaget'],
  },
  {
    id: 'F107',
    feilklasse:
      'et standpunkt appen regner som uten virkning, står ikke i brevet (LV-U3, HF-U2, VS-U11)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '    ...s.standpunkter.map((p) => ({',
        "    ...s.standpunkter.filter((p) => virkning.get(p.id) !== 'uten_virkning').map((p) => ({",
      ],
    ],
    mal: ['et standpunkt appen regner som uten virkning', 'gir byggherren innsigelsen opp'],
  },
  {
    id: 'F108',
    feilklasse:
      'begrunnelsen i svaret faller ut av brevteksten (B-13 om begrunnelsestekst, KA-U31)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['  if (s.utdypning !== undefined) utdypninger.set(id, s.utdypning);\n', '']],
    mal: ['begrunnelsen står under svaret den gjelder'],
  },
  {
    id: 'F109',
    feilklasse: 'varselet i et fristkrav får ikke et avsnitt i brevteksten (LV-U3)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '  for (const u of nytt.utsagn) legg(',
        "  for (const u of nytt.utsagn.filter((x) => x.art !== 'varsel')) legg(",
      ],
    ],
    mal: ['fristkravet har datoen for varselet'],
  },
  {
    id: 'F110',
    feilklasse: 'leseren godtar brevtekst fra appen i et registrert brev (MM-U17)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      ['    if (erRegistrert(dokument.opplysninger))\n      throw', '    if (false)\n      throw'],
    ],
    mal: ['brevtekst i et registrert brev'],
  },
  {
    id: 'F111',
    feilklasse: 'kontrollen av gjengivelsen ser ikke rekkefølgen (LV-U2)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['    fra = plass + del.length;', '    fra = 0;']],
    mal: ['rekkefølgen er byttet'],
  },
  {
    id: 'F112',
    feilklasse: 'svaret viser ikke til innsigelsen det gjentar eller gir opp (VS-U9, VS-U11)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['  )?.dokument;', '  ) && undefined;']],
    mal: ['svaret gjentar innsigelsen', 'gir byggherren innsigelsen opp'],
  },
  {
    id: 'F113',
    feilklasse: 'serveren godtar en annen tekst enn den den lager (A1, LV-U2)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['laast.length === vist.length && laast.every((t, i) => t === vist[i])', 'true']],
    mal: ['en annen tekst enn den serveren lager'],
  },
  {
    id: 'F114',
    feilklasse: 'kontrollen av teksten er fail-open: en kommando uten tekst godtas (A1)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      ['  if (vist === undefined)\n', '  if (vist === undefined) return null;\n  if (false)\n'],
    ],
    mal: ['en kommando uten teksten avvises'],
  },
  {
    id: 'F115',
    feilklasse: 'et frafall krever ingen begrunnelse (KA-U32)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [["v.resultat === 'paalegg_frafalt'", 'false']],
    mal: ['frafall etter § 32.3 c'],
  },
  {
    id: 'F116',
    feilklasse: 'dager som ikke er godkjent fullt, krever ingen begrunnelse (KA-U24)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [["(server.subsidiaert_resultat ?? server.resultat) !== 'godkjent'", 'false']],
    mal: ['dager som ikke er godkjent fullt'],
  },
  {
    id: 'F117',
    feilklasse: 'et fristkrav uten begrunnelse godtas (§ 33.6.1, KA-U33)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ["  if (k.spor === 'frist')\n    return avvis(", '  if (false)\n    return avvis('],
    ],
    mal: ['et fristkrav uten begrunnelse avvises'],
  },
  {
    id: 'F118',
    feilklasse: 'TEs varsel etter § 32.2 uten beskrivelse av pålegget godtas (GR-U15)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ["k.spor === 'grunnlag' && gjelderVarslingsplikten(", 'false && gjelderVarslingsplikten('],
    ],
    mal: ['uten beskrivelse av pålegget avvises'],
  },
  {
    id: 'F119',
    feilklasse:
      'svaret på vederlag og frist sier ikke at grunnlaget er avslått eller prekludert (A2, B-13 05.10)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [["  if (s.spor === 'grunnlag') return [];", '  return [];']],
    mal: [
      'grunnlaget avslått i samme brev',
      'grunnlaget prekludert og avslått subsidiært i et tidligere brev',
      'innledningen nevner sporet',
    ],
  },
  {
    id: 'F120',
    feilklasse: 'et grunnlagssvar i et tidligere brev omtales som i samme brev (A2, LV-U3)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['  if (g.dokument === nytt.id) {', '  if (true) {']],
    mal: ['grunnlaget avslått i et tidligere brev'],
  },
  {
    id: 'F121',
    feilklasse:
      'aksepten av et subsidiært svar sier ikke at TE er uenig i grunnlaget (LV-U4 punkt 6, GR-U7)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [["svar.spor === 'grunnlag' || !saken.subsidiaer[svar.spor].length", 'true']],
    mal: ['sier aksepten at TE ikke er enig'],
  },
  {
    id: 'F122',
    feilklasse:
      'godkjenningen som er en endringsordre, sier ikke hva endringen går ut på (GR-U14, § 31.3)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '  return `${innledning} ${kravet}: «${beskrivelse}».`;',
        '  return `${innledning} ${kravet}.`;',
      ],
    ],
    mal: ['siterer TEs beskrivelse', 'kravversjonen svaret gjelder'],
  },
  {
    id: 'F123',
    feilklasse:
      'godkjenningen av et registrert krav siterer en beskrivelse appen ikke har (GR-U13, GR-U14)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '  if (j.erRegistrert(krav.dokument)) return `${innledning} ${kravet}.`;',
        '  if (j.erRegistrert(krav.dokument)) return `${innledning} ${kravet}: «».`;',
      ],
    ],
    mal: ['et registrert krav siteres ikke'],
  },
  {
    id: 'F124',
    feilklasse: 'godkjenningen av et krav fra appen uten beskrivelse sendes likevel (GR-U14)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['  if (!beskrivelse?.trim())\n', '  if (false)\n']],
    mal: ['et krav fra appen uten beskrivelse'],
  },
  {
    id: 'F125',
    feilklasse: 'vedleggene står ikke i brevteksten (A4, LV-U2)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['  if (nytt.dokumentasjon.length) legg(', '  if (false) legg(']],
    mal: ['et brev med vedlegg får et avsnitt'],
  },
  {
    id: 'F126',
    feilklasse: 'leseren godtar et avsnitt for dokumentet i et brev uten vedlegg (A4, HF-U1)',
    fil: `${K}/format/leser.ts`,
    endringer: [['...(dokument.dokumentasjon.length ? [id] : [])', 'id']],
    mal: ['et avsnitt for dokumentet uten vedlegg'],
  },
  {
    id: 'F127',
    feilklasse:
      'et krav i underkategorien endringsordre godtas uten endringsordrens dato eller nummer (GR-U16)',
    fil: `${K}/format/format.ts`,
    endringer: [["      required: ['endringsordre'],\n", '']],
    mal: ['uten endringsordrens dato eller nummer'],
  },
  {
    id: 'F128',
    feilklasse:
      'avslaget der § 32.2 gjelder, sier ikke at kravet på endringsordre avslås (§ 32.3 b)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      ['        return s.beslutningsgrunnlag.varslingsplikt\n', '        return false\n'],
    ],
    mal: ['avslaget der § 32.2 gjelder'],
  },
  {
    id: 'F129',
    feilklasse: 'revisjonen viser ikke til svaret den erstatter (HF-U1)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['    ...(s.erstatter\n', '    ...(false\n']],
    mal: ['en revisjon viser til svaret den erstatter'],
  },
  {
    id: 'F130',
    feilklasse: 'en begrunnelse med bare mellomrom oppfyller kravet (KA-U31, KA-U33, GR-U15)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ['  if (k.utdypning?.trim()) return null;', '  if (k.utdypning !== undefined) return null;'],
    ],
    mal: ['bare mellomrom teller ikke'],
  },
  {
    id: 'F131',
    feilklasse: 'en dato som ikke finnes i kalenderen, godtas i kommandoen (LV-U4 punkt 3)',
    fil: `${K}/format/skjema.ts`,
    endringer: [
      [
        "  if (typeof v !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(v)) return false;",
        '  return true;',
      ],
    ],
    mal: ['en dato som ikke finnes i kalenderen'],
  },
  {
    id: 'F132',
    feilklasse: 'standpunktet om at varselet kom i tide, nevner ikke hjemmelen (LV-U5)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '        : `byggherren gjør ikke gjeldende at ${varselet} kom for sent.`;',
        "        : 'byggherren gjør ikke gjeldende at varselet kom for sent.';",
      ],
    ],
    mal: ['nevner hjemmelen etter § 32.2-preklusjonen (LV-U5)'],
  },
  {
    id: 'F133',
    feilklasse: 'innsigelsen som gis opp, nevner ikke varselet etter § 33.4 (LV-U5)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'og gjør ikke gjeldende at ${varselet} kom for sent.`',
        'og gjør ikke gjeldende at varselet kom for sent.`',
      ],
    ],
    mal: ['nevner brevet varselet etter § 33.4 (LV-U5)'],
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

/** En kopi av arbeidstreet med sin egen testbase. */
interface Arbeidskopi {
  rot: string;
  base: string | undefined;
}

const ROT = process.cwd();
const TESTBASE = process.env.KOE_TESTBASE_URL;

function kjoerVitest(k: Arbeidskopi): Promise<Rapport> {
  const ut = `${k.rot}-rapport.json`;
  rmSync(ut, { force: true });
  const env = { ...process.env, KOE_TESTBASE_URL: k.base };
  if (k.base === undefined) delete env.KOE_TESTBASE_URL;
  return new Promise((ok, feil) => {
    spawn(
      'npx',
      [
        'vitest',
        'run',
        'kjerne/',
        'sprakprove/kjernelagring/',
        '--no-cache',
        // Kopiene deler prosessorene. Et tidsavbrudd er ikke en assertion og kan bare
        // gi «IKKE OPPDAGET» eller rød kontroll, så grensen heves over standarden på 5 s.
        '--testTimeout=60000',
        '--hookTimeout=60000',
        // Prosessorene deles mellom kopiene, ikke ganges med dem.
        `--maxWorkers=${arbeiderePerKopi}`,
        '--reporter=json',
        `--outputFile=${ut}`,
      ],
      // Egen prosessgruppe, så et avbrudd kan stoppe Vitest og arbeiderne den har startet.
      { cwd: k.rot, env, stdio: 'ignore', detached: true }
    )
      .on('spawn', function (this: ChildProcess) {
        grupper.add(this.pid!);
      })
      .on('error', feil)
      .on('close', function (this: ChildProcess) {
        grupper.delete(this.pid!);
        try {
          ok(JSON.parse(readFileSync(ut, 'utf8')) as Rapport);
        } catch (e) {
          feil(new Error(`Vitest skrev ingen rapport i ${k.rot}`, { cause: e }));
        }
      });
  });
}

function psql(url: string, sql: string) {
  const r = spawnSync('psql', [url, '--no-psqlrc', '--quiet', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`psql: ${sql}: ${r.stderr || r.error}`);
}

/** Basen `navn` i samme PostgreSQL som testbasen. */
function baseUrl(navn: string): string {
  const url = new URL(TESTBASE!);
  url.pathname = `/${encodeURIComponent(navn)}`;
  return url.toString();
}

const ekstraBaser: string[] = [];
let tempmappe: string | undefined;

const grupper = new Set<number>();

function rydd() {
  for (const g of grupper)
    try {
      process.kill(-g, 'SIGKILL');
    } catch {
      // Gruppen er alt borte.
    }
  for (const navn of ekstraBaser.splice(0))
    try {
      psql(TESTBASE!, `DROP DATABASE IF EXISTS "${navn}" WITH (FORCE)`);
    } catch (e) {
      console.error(`Fikk ikke slettet basen ${navn}; slett den for hånd.`, e);
    }
  try {
    if (tempmappe) rmSync(tempmappe, { recursive: true, force: true, maxRetries: 5 });
  } catch (e) {
    console.error(`Fikk ikke slettet ${tempmappe}.`, e);
  }
  tempmappe = undefined;
}

/**
 * Kopierer arbeidstreet slik det står, med lokale endringer og nye filer som git
 * ikke ignorerer, og deler `node_modules`. Den første kopien bruker testbasen;
 * de andre får hver sin base, bygget fra tom med `bygg_testbase.sh`.
 */
function lagArbeidskopier(antall: number): Arbeidskopi[] {
  tempmappe = mkdtempSync(join(tmpdir(), 'feilinnfoering-'));
  const filer = spawnSync('git', ['ls-files', '-z', '-co', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .stdout.split('\0')
    .filter((f) => f && existsSync(f));
  return Array.from({ length: antall }, (_, i) => {
    const rot = join(tempmappe!, `kopi-${i + 1}`);
    for (const f of filer) {
      mkdirSync(dirname(join(rot, f)), { recursive: true });
      cpSync(f, join(rot, f), { verbatimSymlinks: true });
    }
    symlinkSync(join(ROT, 'node_modules'), join(rot, 'node_modules'));
    if (i === 0 || TESTBASE === undefined) return { rot, base: TESTBASE };
    const navn = `${decodeURIComponent(new URL(TESTBASE).pathname.slice(1))}_feilinnfoering_${process.pid}_${i + 1}`;
    psql(TESTBASE, `CREATE DATABASE "${navn}"`);
    ekstraBaser.push(navn);
    const base = baseUrl(navn);
    const bygg = spawnSync(join(ROT, 'scripts/testbase/bygg_testbase.sh'), {
      env: { ...process.env, KOE_TESTBASE_URL: base },
      encoding: 'utf8',
    });
    if (bygg.status !== 0) throw new Error(`Bygde ikke ${navn}: ${bygg.stderr}`);
    return { rot, base };
  });
}

/** Utfallet av én mutasjon: om den ble oppdaget, og linjene som forklarer det. */
function vurder(m: Mutasjon, rapport: Rapport, k: Arbeidskopi): [boolean, string[]] {
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
  return [
    oppdaget,
    [
      `\n${m.id} ${m.feilklasse}: ${oppdaget ? 'oppdaget' : 'IKKE OPPDAGET'}`,
      ...m.endringer.map(([fra, til]) => `  ${m.fil}: ${fra.trim()} → ${til.trim()}`),
      ...feilet.map((t) => `  feilet: ${t.fullName}\n    ${t.failureMessages[0]?.split('\n')[0]}`),
      ...suitefeil.map(
        (f) => `  suitefeil: ${relative(k.rot, f.name)}: ${f.message.split('\n')[0]}`
      ),
      ...ikkeAssertion.map((t) => `  ikke en assertion: ${t.fullName}`),
      ...manglerMal.map((mal) => `  målet feilet ikke: ${mal}`),
    ],
  ];
}

/** Kjører mutasjonene i `koe` etter hverandre i `k`, til køen er tom. Feiler én, tømmes køen. */
async function arbeider(
  k: Arbeidskopi,
  koe: Mutasjon[],
  utfall: Map<string, [boolean, string[]]>,
  antall: number
) {
  for (let m = koe.shift(); m; m = koe.shift()) {
    const fil = join(k.rot, m.fil);
    const original = readFileSync(fil, 'utf8');
    let rapport: Rapport;
    try {
      writeFileSync(
        fil,
        m.endringer.reduce((t, [fra, til]) => t.replace(fra, til), original)
      );
      rapport = await kjoerVitest(k);
    } catch (e) {
      koe.length = 0;
      throw e;
    } finally {
      writeFileSync(fil, original);
    }
    utfall.set(m.id, vurder(m, rapport, k));
    console.error(`${m.id} kjørt (${utfall.size}/${antall})`);
  }
}

const valgt = process.argv.slice(2);
const valgte = MUTASJONER.filter((m) => !valgt.length || valgt.includes(m.id));
for (const m of valgte)
  for (const [fra] of m.endringer)
    if (readFileSync(m.fil, 'utf8').split(fra).length !== 2)
      throw new Error(`${m.id}: «${fra}» finnes ikke nøyaktig én gang i ${m.fil}`);
const delform = /^(\d+)\/(\d+)$/.exec(process.env.FEILINNFOERING_DEL ?? '1/1');
const [del, deler] = [Number(delform?.[1]), Number(delform?.[2])];
if (!delform || del < 1 || del > deler)
  throw new Error(`FEILINNFOERING_DEL må ha formen i/n, ikke «${process.env.FEILINNFOERING_DEL}»`);
const mutasjoner = valgte.filter((_, i) => i % deler === del - 1);

const antallKopier = Math.max(
  1,
  Math.min(
    Number(process.env.FEILINNFOERING_ARBEIDSKOPIER) || availableParallelism(),
    mutasjoner.length
  )
);
const arbeiderePerKopi = Math.max(1, Math.floor(availableParallelism() / antallKopier));
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    rydd();
    process.exit(128 + constants.signals[signal]);
  });

try {
  // Ikke `process.exit`: den venter ikke på at stdout er tømt når den går i et rør,
  // og i CI ble slutten av utfallene borte.
  process.exitCode = await kjoer();
} finally {
  rydd();
}

async function kjoer(): Promise<number> {
  const kopier = lagArbeidskopier(antallKopier);
  // Kontrollen kjøres i hver kopi, så en kopi eller en base som avviker, stopper
  // kjøringen før noen mutasjon.
  const kontroller = await Promise.all(kopier.map(kjoerVitest));
  const antallTester = new Set<number>();
  for (const kontroll of kontroller) {
    const kontrolltester = kontroll.testResults.flatMap((f) => f.assertionResults);
    const kontrollfeil = kontrolltester.filter((t) => t.status === 'failed');
    if (kontrollfeil.length || kontroll.testResults.some((f) => f.status === 'failed'))
      throw new Error(
        `Kontrollkjøringen er ikke grønn: ${kontrollfeil.map((t) => `${t.fullName}: ${t.failureMessages[0]?.split('\n')[0]}`).join('; ')}`
      );
    // #353: en hoppet test er ikke grønn. Uten testbasen hoppes lagringstestene over, og en
    // mutasjon med mål der ville ellers ikke kunne oppdages.
    const hoppet = kontrolltester.filter((t) => t.status !== 'passed');
    if (hoppet.length) {
      console.error(
        `Kontrollkjøringen hoppet over ${hoppet.length} tester${TESTBASE ? '' : ' (KOE_TESTBASE_URL er ikke satt)'}, for eksempel ${hoppet[0].fullName}. Feilinnføringene krever at alle kjører.`
      );
      return 2;
    }
    antallTester.add(kontrolltester.length);
  }
  if (antallTester.size !== 1)
    throw new Error(`Kontrollkjøringene teller ulikt: ${[...antallTester].join(', ')} tester`);
  console.log(
    `Kontroll uten mutasjon: ${[...antallTester][0]} tester grønne i hver av ${kopier.length} arbeidskopier.`
  );

  const koe = [...mutasjoner];
  const utfall = new Map<string, [boolean, string[]]>();
  const arbeidere = await Promise.allSettled(
    kopier.map((k) => arbeider(k, koe, utfall, mutasjoner.length))
  );
  for (const a of arbeidere) if (a.status === 'rejected') throw a.reason;

  let alleOppdaget = true;
  for (const m of mutasjoner) {
    const [oppdaget, linjer] = utfall.get(m.id)!;
    alleOppdaget &&= oppdaget;
    console.log(linjer.join('\n'));
  }
  console.log(
    `\n${alleOppdaget ? 'Alle mutasjonene ble oppdaget.' : 'Ikke alle mutasjonene ble oppdaget.'}`
  );
  return alleOppdaget ? 0 : 1;
}
