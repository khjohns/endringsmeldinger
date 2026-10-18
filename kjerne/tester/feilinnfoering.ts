/**
 * Feilinnføringene for kjernen (#304, #308, #273). F1–F7 er avsnitt 4 i
 * modellforslaget, F8–F10 feilklassene reviewet av PR #306 fant, skrevet om etter
 * MM-U9 og GR-U10, F11–F26 grensene #308 la til, og F27–F47 formatet (#273): 7.2
 * i designnotatet, GR-U12 og registeret (#320). F48 er hvitelisten fra #329,
 * F49–F51 og F54–F58 versjoneringen (#316), F52–F53 registrert korrespondanse
 * (#336), F59–F60 kodene i formatet og predikatet for endringsordre
 * (#335, #351), F61–F104 byggedel 1 av #309, F105–F131 brevteksten (#369),
 * F132–F134 LV-U5 (#414), F135–F148 MM-U20 (#405) og VS-U15 (#411), F153–F156
 * regelversjonen i kommandoen (#386), F157–F168 den senere begrunnelsen (#448) og F169–F177 hullene fra
 * samspillsreviewet av den og KA-U36 (#468), F178–F202 byggherrens vurderinger
 * etter § 34.1.2, § 34.2.2 og § 33.6.1 (#479, #341), F204 påberopelsen etter
 * § 33.4 mot varselet (#309, KK-07), F208–F209 innsigelsen brevet viser til og gir opp
 * (#407, #309, #500), F215–F216 frafall der pålegget er byggherrens eget (GR-U18, #511),
 * F217–F220 et «i tide» som binder byggherren (HF-U4, HF-U8, #498), F221–F222 og F224
 * innsigelsen etter VS-U24 (#498, #517), F223 et registrert brev (HF-U4, OV-U4), og
 * F246–F247 registrerte brev som dokumentasjon (OV-U4, OV-U6, #574), og F248–F255
 * opprettelsen og datoen etter VS-U26 (#664). Én mutasjon
 * om gangen per arbeidskopi, Vitest over hele `kjerne/`
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
 * Med `--ankre` kontrolleres bare at hver fra-streng finnes nøyaktig én gang i
 * fila (#430), og at hvert mål er en del av navnet på en test (#432), uten å
 * fortsette i et ord eller en ID (#436). Navnene leses med `vitest list` uten
 * kopier, base eller testkjøring. Det tar sekunder og kjøres før hver push som
 * rører `kjerne/`. Begge kontrollene gjøres også før en full kjøring.
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
import { treffer } from './maltreff.ts';

interface Mutasjon {
  id: string;
  feilklasse: string;
  fil: string;
  /** Tekst som erstattes, hver nøyaktig én gang i fila. */
  endringer: [fra: string, til: string][];
  /** Deler av testnavnet (`fullName`) som må feile, avgrenset som i `treffer`. */
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
        "  if (visning(u, { versjon: 0, gjelderVarslingsplikten: () => true, gjelderVarslingspliktenForVederlag: () => true }).status.kode === 'avsluttet_oppgjort' || kraveneErAvgjort(u))",
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
      'visningen sier ikke at standpunktet om varselet gjaldt et annet varsel enn det registrerte (OV-U5)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "p.hjemmel === '33.4' && annetVarsel(p.gjelder)",
        "p.hjemmel === '32.2' && annetVarsel(p.gjelder)",
      ],
    ],
    mal: ['F-MM-D', 'F-MM-D-godtatt', 'visningen sier at svaret gjaldt et annet varsel'],
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
    fil: `${K}/kommandoer/standpunkter.ts`,
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
    feilklasse:
      'visningen sier ikke at svaret gjaldt et annet varsel enn det som er registrert nå (OV-U5)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['gjelder !== spor.frist.varsel.id;', 'gjelder === spor.frist.varsel.id;']],
    mal: ['F-MM-D-itide', 'visningen sier at svaret gjaldt et annet varsel'],
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
        'return beslutningsgrunnlag(innhold, grunnlagskrav, regler);',
        'return beslutningsgrunnlag(innhold, undefined, regler);',
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
    mal: ['F-MM-G10'],
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
    mal: ['korrespondanse som bare er mottatt, er også registrert'],
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
    fil: `${K}/kommandoer/standpunkter.ts`,
    endringer: [['        gjelder: varseletForNyttSvar(u),\n', '']],
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
    id: 'F43',
    feilklasse:
      'opplysningen om at § 31.3 ikke er oppfylt, gir unntaket i OV-U6 likevel (OV-U6, GR-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "o.hva === 'endringsordre' && o.brev === s.dokument && o.oppfylt",
        "o.hva === 'endringsordre' && o.brev === s.dokument",
      ],
    ],
    mal: ['F-MM-G21'],
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
    feilklasse:
      'en sak som ikke er forstått, avviser ikke bestridelsen med SAK_IKKE_FORSTAATT (MM-U2, MM-U14)',
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
        '    else if (sporet && u.spor[sporet].enighet && u.spor[sporet].gjeldendeSvar?.id === gjelder)',
        '    else if (false)',
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
      'byggherrens registrerte endringsordre fryses med reglene da den ble sendt, ikke ved registreringen (MM-U17, OV-U6)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        "import { avvisning } from './avvisning.ts';",
        "import { avvisning } from './avvisning.ts';\nimport { GJELDENDE_REGLER } from '../regler/regelsett.ts';",
      ],
      [
        '    s.beslutningsgrunnlag = lagret(frys(s, krav, kjerne.regler));',
        '    s.beslutningsgrunnlag = lagret(frys(s, krav, GJELDENDE_REGLER));',
      ],
    ],
    mal: ['F-MM-G45-regel'],
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
      'avviser endringsordrens dato eller nummer i en annen underkategori',
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
    fil: `${K}/format/skjema.ts`,
    endringer: [
      [
        '  return harUlagringsbarTekst(kommando)',
        '  return !kommando && harUlagringsbarTekst(kommando)',
      ],
    ],
    mal: ['gir TEKST_KAN_IKKE_LAGRES', 'avviser en tittel basen ikke kan lagre (#373)'],
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
    feilklasse:
      'et registrert brev som strider mot en enighet eller et trekk, gjør saken ikke forstått (MM-U18, OV-U4)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      if (!registrert) konflikter.push(', '      if (true) konflikter.push(']],
    mal: ['F-MM-U326n', 'F-MM-G37'],
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
    id: 'F90',
    feilklasse:
      'subsidiariteten går tilbake til svaret på versjonen det ble regnet mot, når grunnlaget er besvart igjen (GR-U1, GR-U4)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['            .slice(fra)', '            .slice(fra, fra + 1)']],
    mal: ['F-MM-S342b'],
  },
  {
    id: 'F92',
    feilklasse: 'en kravversjon etter trekk leses med virkning (MM-U18, MM-U19, GR-U5)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['    else if (u.spor[k.spor].trukket)', '    else if (u.spor[k.spor].trukket && !k)'],
    ],
    mal: ['F-MM-IK6b'],
  },
  {
    id: 'F93',
    feilklasse:
      'en kravversjon etter «ingen krav» stopper saken også når den er registrert (MM-U19, KA-U12)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['    else if (u.spor[k.spor].ingenKrav)', '    else if (u.spor[k.spor].ingenKrav && !k)'],
    ],
    mal: ['F-MM-IK5b'],
  },
  {
    id: 'F98',
    feilklasse:
      'en innsigelse mot fristkravet leses som en påberopelse etter § 33.4 (VS-U24, #500)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        '    if (krav)\n',
        "    if (krav && krav.spor !== 'grunnlag') return '33.4';\n    if (krav)\n",
      ],
    ],
    mal: [
      'uten eget varsel er en innsigelse mot det første fristkravet ingen påberopelse',
      'et «i tide» om varselet gir ikke opp en innsigelse mot fristkravet',
      'et «i tide» om varselet nevner ikke en innsigelse mot en tidligere kravversjon',
      'gir et «i tide» opp bare den mot varselet',
      'F-MM-V10',
    ],
  },
  {
    id: 'F99',
    feilklasse:
      'påberopelsen etter § 33.4 viser til kravversjonen svaret gjelder, ikke det første fristkravet (VS-U20, OV-U5, KK-07)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'frist.varsel ? [frist.varsel] : [], frist.krav, () => true',
        'frist.varsel ? [frist.varsel] : [], frist.krav.slice(-1), () => true',
      ],
    ],
    mal: [
      'uten registrert varsel gjelder den det første fristkravet',
      'brevet sier at varselet er det første fristkravet',
    ],
  },
  {
    id: 'F100',
    feilklasse: 'en innsigelse mot TEs varsel etter § 32.2 leses ikke som en påberopelse (VS-U24)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [["        ? '32.2'", '        ? null']],
    mal: [
      'svaret gjentar innsigelsen og viser til den',
      'gir byggherren innsigelsen opp, sier brevet det uttrykkelig',
      'F-MM-V7c',
    ],
  },
  {
    id: 'F101',
    feilklasse: 'et standpunkt i et annet spor gir opp innsigelsen (VS-U9, VS-U11)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['    .filter((x) => x.spor === spor)', '    .filter((x) => x.spor === x.spor)']],
    mal: ['et «i tide» i grunnlaget gir ikke opp innsigelsen mot fristvarselet'],
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
    endringer: [
      [
        'const innsigelser = aapneInnsigelser(s, nytt.avsender, j, regler);',
        'const innsigelser = [];',
      ],
    ],
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
    endringer: [["if (!fulltGodkjent) ut.push('dager", "if (false) ut.push('dager"]],
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
    endringer: [['  if (nytt.dokumentasjon.length)\n    legg(', '  if (false)\n    legg(']],
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
  {
    id: 'F134',
    feilklasse: 'standpunktet om rettidighet nevner feil varsel (LV-U4 punkt 5, LV-U5)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      ['          ? `${VARSELET[p.hjemmel]} i ', "          ? `${VARSELET['32.2']} i "],
      [
        '          : VARSELET[p.hjemmel];',
        "          : VARSELET[p.hjemmel === '32.2' ? '33.4' : '32.2'];",
      ],
    ],
    mal: [
      'nevner hjemmelen etter § 32.2-preklusjonen (LV-U5)',
      'nevner brevet varselet etter § 33.4 (LV-U5)',
      'gir byggherren innsigelsen opp, sier brevet det uttrykkelig (VS-U11)',
    ],
  },
  {
    id: 'F135',
    feilklasse:
      'et svar i et trukket spor, i en rad som ikke er registrert, er ikke en strid (MM-U20)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    else if (u.spor[s.spor].trukket)\n', '    else if (false)\n']],
    mal: ['F-MM-U20a', 'F-MM-U20c', 'F-MM-U20d'],
  },
  {
    id: 'F136',
    feilklasse:
      'en aksept av et svar i et trukket spor, i en rad som ikke er registrert, er ikke en strid (MM-U20)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['    else if (sporet && u.spor[sporet].trukket)', '    else if (sporet && false)'],
    ],
    mal: ['F-MM-U20b'],
  },
  {
    id: 'F137',
    feilklasse: 'aksepten kontrolleres mot et annet spor enn svaret den gjelder (MM-U20)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '        ? SPOR.find((n) => u.spor[n].svar.some((s) => s.id === x.gjelder))',
        "        ? SPOR.find((n) => n === 'grunnlag')",
      ],
    ],
    mal: ['F-MM-U20b'],
  },
  {
    id: 'F138',
    feilklasse:
      'varselet fra appen har ingen tekst etter VS-U15, og kjernen kan ikke skrive brevet',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '      if (dato === undefined && nytt.utsagn.length === 1 && !nytt.krav.length && !nytt.svar.length)\n        return `TE varsler etter',
        "      if (dato === undefined && nytt.utsagn.length === 1 && !nytt.krav.length && !nytt.svar.length)\n        throw new KanIkkeUttrykkes('et varsel i et brev fra appen har datoen det ble sendt');\n      if (false)\n        return `TE varsler etter",
      ],
    ],
    mal: ['med teksten i VS-U15', 'F-VS-U15a'],
  },
  {
    id: 'F139',
    feilklasse: 'brevteksten i varselet fra appen viser ikke til saken (VS-U15)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'at TE vil kreve fristforlengelse som følge av forholdet i ${sak}.`',
        'at TE vil kreve fristforlengelse.`',
      ],
    ],
    mal: ['med teksten i VS-U15'],
  },
  {
    id: 'F140',
    feilklasse:
      'varselet fra appen skrives som et varsel registrert med en dato fra klienten (VS-U15, VS-U8)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        "      return { utsagn: [{ id: nyId(), art: 'varsel', hjemmel: k.hjemmel }] };",
        "      return { utsagn: [{ id: nyId(), art: 'varsel', hjemmel: k.hjemmel }], opplysninger: [{ id: nyId(), hva: 'sendt', dato: '2026-09-02' }] };",
      ],
    ],
    mal: ['med teksten i VS-U15', 'F-VS-U15a'],
  },
  {
    id: 'F141',
    feilklasse: 'varselet fra appen har ikke forutsetningene for et varsel (SK-12, VS-U15)',
    fil: `${K}/kommandoer/avvisning.ts`,
    endringer: [
      [
        "      return [{ type: 'sende_varsel', spor: 'frist' }];",
        "      return [{ type: 'krav', spor: 'frist' }];",
      ],
    ],
    mal: ['F-VS-U15a'],
  },
  {
    id: 'F145',
    feilklasse: 'et varsel fra appen godtas etter at fristkravet er sendt (VS-U16)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["      if (h.type === 'sende_varsel' && s.krav.length)", '      if (false)']],
    mal: ['F-VS-U15c'],
  },
  {
    id: 'F148',
    feilklasse: 'et varsel uten dato i et brev med krav får teksten i VS-U15',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '      if (dato === undefined && nytt.utsagn.length === 1 && !nytt.krav.length && !nytt.svar.length)\n',
        '      if (dato === undefined)\n',
      ],
    ],
    mal: ['et varsel uten dato i et brev med krav'],
  },
  {
    id: 'F153',
    feilklasse:
      'serveren godtar en aksept regnet ut med en høyere regelversjon (B-13, KA-U10, #386)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['if (k.regelversjon !== regler.versjon)', 'if (k.regelversjon < regler.versjon)']],
    mal: ['en aksept, med serverens regelversjon én lavere enn kommandoens'],
  },
  {
    id: 'F154',
    feilklasse:
      'serveren godtar en aksept regnet ut med en lavere regelversjon (B-13, KA-U10, #386)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['if (k.regelversjon !== regler.versjon)', 'if (k.regelversjon > regler.versjon)']],
    mal: ['en aksept, med serverens regelversjon én høyere enn kommandoens'],
  },
  {
    id: 'F155',
    feilklasse:
      'serveren godtar et svar eller en revisjon regnet ut med en høyere regelversjon (B-13, #386)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['if (s.regelversjon !== regler.versjon)', 'if (s.regelversjon < regler.versjon)']],
    mal: [
      'et svar, med serverens regelversjon én lavere enn kommandoens',
      'en revisjon av svaret, med serverens regelversjon én lavere enn kommandoens',
    ],
  },
  {
    id: 'F156',
    feilklasse:
      'serveren godtar et svar eller en revisjon regnet ut med en lavere regelversjon (B-13, #386)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['if (s.regelversjon !== regler.versjon)', 'if (s.regelversjon > regler.versjon)']],
    mal: [
      'et svar, med serverens regelversjon én høyere enn kommandoens',
      'en revisjon av svaret, med serverens regelversjon én høyere enn kommandoens',
    ],
  },
  {
    id: 'F157',
    feilklasse: 'en senere begrunnelse avvises når kravene er avgjort (KA-U34, KA-U11)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "    case 'begrunne':\n",
        "    case 'begrunne':\n      if (kraveneErAvgjort(u)) return avvis('KRAVENE_AVGJORT', '');\n",
      ],
    ],
    mal: ['godtas når kravene er avgjort, mens en revisjon avvises', 'F-MM-BG2'],
  },
  {
    id: 'F158',
    feilklasse: 'TE kan sende en senere begrunnelse (KA-U34)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["  begrunne: 'BH',", '  begrunne: null,']],
    mal: ['avvises fra TE, når den ikke gjelder et svar, og uten tekst', 'F-MM-BG1'],
  },
  {
    id: 'F159',
    feilklasse: 'en senere begrunnelse kan gjelde noe annet enn et svar (KA-U34)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["return maal?.art === 'svar'\n", 'return maal !== undefined\n']],
    mal: ['avvises fra TE, når den ikke gjelder et svar, og uten tekst', 'F-MM-BG1'],
  },
  {
    id: 'F160',
    feilklasse: 'leseren godtar en begrunnelse som gjelder noe annet enn et svar (KA-U34, MM-U2)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["return maal.art === 'svar';", "return maal.art !== 'opplysning';"]],
    mal: ['en begrunnelse fra TE eller av noe annet enn et svar gjør saken ikke forstått'],
  },
  {
    id: 'F161',
    feilklasse: 'brevteksten for den senere begrunnelsen avviker fra KA-U34',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'Byggherren begrunner sitt svar på ${SVARET_GJELDER[svar.spor]}',
        'Byggherren begrunner sitt svar på ${SPORNAVN[svar.spor]}',
      ],
    ],
    mal: ['brevet begrunner svaret på'],
  },
  {
    id: 'F162',
    feilklasse: 'en senere begrunnelse uten tekst godtas (KA-U34)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['return k.sendt === undefined && !k.utdypning?.trim()', 'return false']],
    mal: ['avvises fra TE, når den ikke gjelder et svar, og uten tekst', 'F-MM-BG1'],
  },
  {
    id: 'F163',
    feilklasse: 'meldingen for avgjorte krav kaller «ingen krav» et trekk (KA-U11, KA-U12)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      ['    u.spor[n].trukket\n      ?', '    u.spor[n].trukket || u.spor[n].ingenKrav\n      ?'],
    ],
    mal: ['når TE ikke krever fristforlengelse, er kravene avgjort, og meldingen sier hvorfor'],
  },
  {
    id: 'F164',
    feilklasse: 'en registrert begrunnelse godtas uten brevet som vedlegg (KA-U35)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [['if (!k.dokumentasjon?.length)', 'if (false)']],
    mal: ['en registrert begrunnelse uten brevet som vedlegg eller med tekst avvises', 'F-MM-BG1'],
  },
  {
    id: 'F165',
    feilklasse: 'leseren godtar en begrunnelse fra TE (KA-U34, MM-U2)',
    fil: `${K}/format/leser.ts`,
    endringer: [["  begrunnelse: 'BH',", '  begrunnelse: null,']],
    mal: ['en begrunnelse fra TE eller av noe annet enn et svar gjør saken ikke forstått'],
  },
  {
    id: 'F166',
    feilklasse: 'en registrert begrunnelse kan ha tekst (KA-U35)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [["if ('utdypning' in k) feil.push", 'if (false) feil.push']],
    mal: ['en registrert begrunnelse uten brevet som vedlegg eller med tekst avvises'],
  },
  {
    id: 'F167',
    feilklasse: 'en registrert begrunnelse skrives som et brev fra appen (KA-U35, MM-U17)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [["          opplysninger: [{ id: nyId(), hva: 'sendt', dato: k.sendt }],\n", '']],
    mal: ['en begrunnelse sendt utenfor appen registreres uten tekst', 'F-MM-BG1'],
  },
  {
    id: 'F168',
    feilklasse: 'byggherren får ikke tilbud om å begrunne et svar (KA-U34, INV-MM-1)',
    fil: `${K}/kommandoer/handlinger.ts`,
    endringer: [["    ut.push({ type: 'begrunne', gjelder: id });\n", '']],
    mal: ['F-MM-BG1', 'F-MM-BG2', 'F-MM-B1'],
  },
  {
    id: 'F169',
    feilklasse: 'meldingen for avgjorte krav kaller et frafall en godkjenning (KA-U11, GR-U9)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [['  const grunnlag = u.frafalt\n', '  const grunnlag = false\n']],
    mal: ['når byggherren har frafalt pålegget, sier meldingen det'],
  },
  {
    id: 'F170',
    feilklasse: 'en senere begrunnelse kan endre utfallet (KA-U34)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "['aksept', 'trekk', 'ingen_krav', 'varsel']",
        "['aksept', 'trekk', 'ingen_krav', 'varsel', 'begrunnelse']",
      ],
    ],
    mal: ['godtas når kravene er avgjort, mens en revisjon avvises', 'F-MM-BG2'],
  },
  {
    id: 'F173',
    feilklasse: 'datoen for et svar fra appen er i UTC, ikke i norsk tid (KA-U37)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      ['  const dag = kalenderdag(d.registrert);', '  const dag = d.registrert.slice(0, 10);'],
    ],
    mal: ['brevets dato er datoen i norsk tid, ikke i UTC'],
  },
  {
    id: 'F178',
    feilklasse: 'byggherrens vurdering etter § 34.1.2 lagres ikke som standpunkt (#341, KA-U4)',
    fil: `${K}/kommandoer/standpunkter.ts`,
    endringer: [
      [
        "if (typeof v.hovedkrav_varslet_i_tide === 'boolean')",
        "if (typeof v.hovedkrav_varslet_i_tide === 'string')",
      ],
    ],
    mal: ['F-MM-V-34-1-2-nei', 'F-MM-V-34-1-2-ja', '§ 34.1.2 «ja»'],
  },
  {
    id: 'F179',
    feilklasse: 'påberopelsen etter § 34.1.2 får ingen virkning for svikt (VS-U3)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [["if (hjemmel === '34.1.2')", "if (hjemmel === ('' as Hjemmel))"]],
    mal: ['F-MM-V-34-1-2-nei', '§ 34.1.2 «nei»: byggherren påberoper prinsipalt'],
  },
  {
    id: 'F180',
    feilklasse:
      'aksept av et svar med preklusjon etter § 34.1.2 gir det subsidiære beløpet (VS-U3)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "beloep: prekludert ? 0 : standpunktet(svar, 'beloep')!.godkjent",
        "beloep: standpunktet(svar, 'beloep')!.godkjent",
      ],
    ],
    mal: ['F-MM-V-34-1-2-nei'],
  },
  {
    id: 'F181',
    feilklasse: 'vurderingen etter § 34.1.2 godtas for en endring, der bestemmelsen ikke gjelder',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['v.hovedkrav_varslet_i_tide != null &&', 'false &&']],
    mal: ['F-MM-V-34-1-2-endring'],
  },
  {
    id: 'F182',
    feilklasse: 'beløpsstandpunktet leses som det prinsipale beløpet, ikke det vurderte (B-13)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      [
        '(utregning.subsidiaert_godkjent_beloep ?? utregning.godkjent_beloep)',
        '(utregning.godkjent_beloep)',
      ],
    ],
    mal: ['F-MM-V-34-1-2-nei', '§ 34.1.2 «nei»: byggherren påberoper prinsipalt'],
  },
  {
    id: 'F183',
    feilklasse: 'det subsidiære beløpet ved preklusjon etter § 34.1.2 lagres ikke (VS-U3, B-13)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        'if (r.subsidiaer_resultat !== null) {\n      ut.subsidiaert_resultat = r.subsidiaer_resultat;\n      ut.subsidiaert_godkjent_beloep',
        'if (false) {\n      ut.subsidiaert_resultat = r.subsidiaer_resultat;\n      ut.subsidiaert_godkjent_beloep',
      ],
    ],
    mal: ['F-MM-V-34-1-2-nei', '§ 34.1.2 «nei»: byggherren påberoper prinsipalt'],
  },
  {
    id: 'F184',
    feilklasse: 'påberopelsen etter § 34.1.2 krever ingen begrunnelse (KA-U24)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        "if (v.hovedkrav_varslet_i_tide === false) ut.push('påberopt preklusjon etter § 34.1.2');",
        'void 0;',
      ],
    ],
    mal: ['§ 34.1.2 «nei» med hele beløpet godkjent subsidiært må ha en begrunnelse'],
  },
  {
    id: 'F185',
    feilklasse:
      'påberopelsen etter § 34.1.2 knyttes til kravversjonen svaret gjelder, ikke det første vederlagskravet (arbeidsvalget i #479)',
    fil: `${K}/kommandoer/standpunkter.ts`,
    endringer: [['gjelder: u.spor.vederlag.krav[0]!.id,', 'gjelder: krav.id,']],
    mal: ['F-MM-V-34-1-2-ny-kravversjon'],
  },
  {
    id: 'F186',
    feilklasse:
      'en lagret påberopelse etter § 34.1.2 som viser til en senere kravversjon, forstås (HF-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['if (p.gjelder !== spor.vederlag.krav[0]?.id)', "if (p.gjelder === ('' as string))"],
    ],
    mal: ['påberopelsen etter § 34.1.2 viser til kravversjonen svaret gjelder'],
  },
  {
    id: 'F187',
    feilklasse: '«ja» og «nei» på § 34.2.2 får motsatt virkning',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "} else if (s.art === 'metode' && s.aksepterer) {",
        "} else if (s.art === 'metode' && !s.aksepterer) {",
      ],
    ],
    // Virkningen av «nei» leses ikke av noen regel, så den overlever der (#490).
    mal: ['F-MM-V-34-2-2-ja'],
  },
  {
    id: 'F188',
    feilklasse: 'byggherren kan avslå tilbudet etter § 34.2.2 uten å oppgi metoden',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        'if (v.aksepterer_metode === false && !METODER.includes(',
        'if (false && !METODER.includes(',
      ],
    ],
    mal: ['F-MM-V-34-2-2-nei'],
  },
  {
    id: 'F189',
    feilklasse: 'byggherrens vurdering etter § 34.2.2 lagres ikke som standpunkt (#341)',
    fil: `${K}/kommandoer/standpunkter.ts`,
    endringer: [
      [
        "if (typeof v.aksepterer_metode === 'boolean')",
        "if (typeof v.aksepterer_metode === 'string')",
      ],
    ],
    mal: ['F-MM-V-34-2-2-nei', 'F-MM-V-34-2-2-ja'],
  },
  {
    id: 'F190',
    feilklasse: 'spesifisering i tide får virkning etter § 33.6.1',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "const virkning = s.iTide ? 'uten_virkning' : etterGrunn();",
        'const virkning = etterGrunn();',
      ],
    ],
    mal: ['F-MM-F-33-6-1-ja'],
  },
  {
    id: 'F191',
    feilklasse:
      'de vurderte dagene står prinsipalt ved siden av påberopelsen etter § 33.6.1 (VS-U4)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['if (!s.iTide) harGrunn = true;', 'void 0;']],
    mal: ['F-MM-F-33-6-1-nei'],
  },
  {
    id: 'F192',
    feilklasse:
      'aksept av et svar med påberopelse etter § 33.6.1 gir de vurderte dagene, ikke de prinsipale (VS-U4)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        'return { dager: spesifisering.dager! };',
        "return { dager: standpunktet(svar, 'dager')!.vurdert };",
      ],
    ],
    mal: ['F-MM-F-33-6-1-nei'],
  },
  {
    id: 'F193',
    feilklasse:
      'serverens utregning gir de vurderte dagene prinsipalt ved påberopelse etter § 33.6.1 (B-13, VS-U4)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['ut.godkjent_dager = maatteForstaa;', 'ut.godkjent_dager = r.godkjent_dager;']],
    mal: ['serverens utregning gir dagene byggherren måtte forstå at TE hadde krav på, prinsipalt'],
  },
  {
    id: 'F194',
    feilklasse: 'de prinsipale dagene etter § 33.6.1 kan være flere enn de vurderte',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['if (d > (v.dager as number))', 'if (false)']],
    mal: ['F-MM-F-33-6-1-flere-enn-vurdert'],
  },
  {
    id: 'F195',
    feilklasse: 'byggherrens vurdering etter § 33.6.1 lagres ikke som standpunkt (#341)',
    fil: `${K}/kommandoer/standpunkter.ts`,
    endringer: [
      [
        "if (typeof v.spesifisert_krav_ok === 'boolean')",
        "if (typeof v.spesifisert_krav_ok === 'string')",
      ],
    ],
    mal: ['F-MM-F-33-6-1-nei', 'F-MM-F-33-6-1-ja'],
  },
  {
    id: 'F196',
    feilklasse: 'påberopelsen etter § 33.6.1 krever ingen begrunnelse (KA-U24)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['if (v.spesifisert_krav_ok === false) ut.push(', 'if (false) ut.push(']],
    mal: ['et svar med påberopt spesifisering for sent etter § 33.6.1 må ha en begrunnelse'],
  },
  {
    id: 'F197',
    feilklasse:
      'en lagret spesifisering som viser til en annen kravversjon enn svaret, forstås (HF-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "if (p.art === 'spesifisering' && p.gjelder !== s.gjelder)",
        "if (p.art === 'spesifisering' && p.gjelder === ('' as string))",
      ],
    ],
    mal: ['spesifiseringen viser til en annen kravversjon enn svaret'],
  },
  {
    id: 'F198',
    feilklasse: 'en lagret avslått metode uten byggherrens metode forstås',
    fil: `${K}/format/leser.ts`,
    endringer: [["if (e.aksepterer === 'oensket_metode' in e)", 'if (e.aksepterer === undefined)']],
    mal: ['tilbudet er ikke akseptert, men metoden mangler'],
  },
  {
    id: 'F199',
    feilklasse: 'en lagret spesifisering i tide med prinsipale dager forstås (VS-U4)',
    fil: `${K}/format/leser.ts`,
    endringer: [["if (e.i_tide === 'dager' in e)", 'if (e.i_tide === undefined)']],
    mal: ['spesifiseringen er i tide, men har prinsipale dager'],
  },
  {
    id: 'F200',
    feilklasse:
      'et tilbud byggherren ikke aksepterer, gir sammenfall når utregningen sier «godkjent» (arbeidsvalget i #479, MM-U18)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      ["if (standpunktet(svar, 'metode')?.aksepterer === false) return false;", 'void 0;'],
    ],
    mal: ['sammenfall med et tilbud byggherren ikke aksepterer'],
  },
  {
    id: 'F201',
    feilklasse: 'en påberopelse etter § 33.6.1 gir sammenfall (arbeidsvalget i #479, MM-U18)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "v.some((p) => p.standpunkt === spesifisering.id && p.virkning !== 'uten_virkning')",
        'false',
      ],
    ],
    mal: ['sammenfall med en påberopelse etter § 33.6.1', 'F-MM-F-33-6-1-alle-dagene'],
  },
  {
    id: 'F202',
    feilklasse:
      'brevet sier at byggherren godkjenner hele beløpet «av de krevde» når tilbudet ikke er akseptert',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      ["p.resultat === 'delvis_godkjent' && heleBeloepet ? 'godkjent' : p.resultat", 'p.resultat'],
    ],
    mal: [
      '§ 34.2.2 «nei» med hele beløpet godkjent',
      '§ 34.2.2 «nei» med beløpet godkjent til nærmeste krone',
    ],
  },
  {
    id: 'F203',
    feilklasse: 'hele beløpet regnes i øre, ikke til nærmeste krone (B-13)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['return tilKrone(godkjent) >= tilKrone(krevd);', 'return godkjent >= krevd;']],
    mal: ['§ 34.2.2 «nei» med beløpet godkjent til nærmeste krone'],
  },
  {
    id: 'F204',
    feilklasse:
      'leseren godtar en påberopelse etter § 33.4 mot kravversjonen svaret gjelder (VS-U20, HF-U1, KK-07)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'if (p.gjelder !== varseletFoerSvaret(varsler, spor.frist.krav, (v) => bakover(s.id, v)))',
        'if (p.gjelder !== varseletFoerSvaret(varsler, spor.frist.krav, (v) => bakover(s.id, v)) && p.gjelder !== s.gjelder)',
      ],
    ],
    mal: ['en påberopelse som viser til kravversjonen svaret gjelder, gjør saken ikke forstått'],
  },
  {
    id: 'F208',
    feilklasse:
      'en innsigelse mot varselet etter § 33.4 leses ikke som en påberopelse (VS-U24, VS-U11)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "    if (utsagn) return utsagn.art === 'varsel' ? '33.4' : null;",
        '    if (utsagn) return null;',
      ],
    ],
    mal: [
      'gir byggherren opp innsigelsen mot fristvarselet',
      'gir et «i tide» opp bare den mot varselet',
      'F-MM-V10',
    ],
  },
  {
    id: 'F209',
    feilklasse:
      'svaret på en ny grunnlagsversjon gjentar eller gir ikke opp innsigelsen mot en tidligere (arbeidsvalget 15.10 i #500)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'innsigelsenPaaberoper(i.gjelder, j.dokumenter, (k) => gjelderVarslingsplikten(k, regler)) ===',
        "(svar.spor !== 'grunnlag' || i.gjelder === svar.gjelder) && innsigelsenPaaberoper(i.gjelder, j.dokumenter, (k) => gjelderVarslingsplikten(k, regler)) ===",
      ],
    ],
    mal: [
      'et «i tide» på den nye versjonen gir opp innsigelsen mot den første',
      'et «for sent» på den nye versjonen gjentar innsigelsen mot den første',
    ],
  },
  {
    id: 'F211',
    feilklasse:
      'utregningen leser § 34.1.2 av modulfunksjonen, ikke av regelsettet som standpunktet (#490)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      [
        '      regler.gjelderVarslingspliktenForVederlag(krav.hovedkategori) &&',
        '      gjelderVarslingspliktenForVederlag(krav.hovedkategori) &&',
      ],
    ],
    mal: ['et regelsett der § 34.1.2 gjelder en endring'],
  },
  {
    id: 'F212',
    feilklasse:
      'et beløp som er godkjent fullt til nærmeste krone, krever en begrunnelse når tilbudet ikke er akseptert (B-13, #490)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        'if (!erBeloepetGodkjentFullt(krevd, beloep(godkjent as number)!))',
        "if ((server.subsidiaert_resultat ?? server.resultat) !== 'godkjent')",
      ],
    ],
    mal: ['§ 34.2.2 «nei» med beløpet godkjent til nærmeste krone krever en begrunnelse'],
  },
  {
    id: 'F213',
    feilklasse:
      'linjen sier «subsidiært» også fra tredje ledd, ikke «videre subsidiært» (HF-U2, #492)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [["i === 1 ? 'subsidiært' : 'videre subsidiært'", "'subsidiært'"]],
    mal: ['linjen ordner byggherrens standpunkter'],
  },
  {
    id: 'F214',
    feilklasse: 'et avslag (0 kr) av et krav under 0,50 kr regnes som hele beløpet (B-13, KA-U24)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['  if (godkjent === NULL_OERE) return false;\n', '']],
    mal: ['avslag på et krav under 0,50 kr'],
  },
  {
    id: 'F215',
    feilklasse:
      'frafall avvises i samordning og svar på varsel, som er byggherrens pålegg (GR-U18)',
    fil: `${K}/regler/grunnlag.ts`,
    endringer: [["  'samordning',\n  'svar_paa_varsel',\n", '']],
    mal: ['frafall godtas i samordning', 'frafall godtas i svar_paa_varsel'],
  },
  {
    id: 'F216',
    feilklasse: 'frafall godtas ved gebyr, som ikke er byggherrens eget pålegg (GR-U18)',
    fil: `${K}/regler/grunnlag.ts`,
    endringer: [["  'svar_paa_varsel',\n];", "  'svar_paa_varsel',\n  'gebyrer_og_avgifter',\n];"]],
    mal: ['frafall avvises i gebyrer_og_avgifter'],
  },
  {
    id: 'F217',
    feilklasse: 'et «for sent» etter et «i tide» fra appen godtas (HF-U4, #498)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['.find((r) => harSagtITide(u, spor, r))', '.find(() => false)']],
    mal: [
      'en revisjon som påberoper «for sent» etter «i tide», avvises',
      'F-MM-HF-U4-33-4',
      'F-MM-HF-U8-32-2',
    ],
  },
  {
    id: 'F219',
    feilklasse: 'et «i tide» binder bare gjeldende kravversjon (HF-U4, HF-U8, #498)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '  return u.spor[spor].svar.some(',
        '  return u.spor[spor].svar.filter((x) => x.gjelder === u.spor[spor].gjeldendeKrav?.id).some(',
      ],
    ],
    mal: [
      'et svar på en senere kravversjon kan ikke påberope «for sent»',
      '«i tide» står mot en senere grunnlagsversjon',
      'F-MM-HF-U8-32-2',
    ],
  },
  {
    id: 'F220',
    feilklasse: 'et «i tide» etter § 33.6.1 binder også senere kravversjoner (HF-U1, HF-U4, #498)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "p.art === 'spesifisering' && p.gjelder === r.gjelder && p.iTide",
        "p.art === 'spesifisering' && p.iTide",
      ],
    ],
    mal: ['som gjelder kravversjonen (HF-U4, HF-U1)'],
  },
  {
    id: 'F221',
    feilklasse:
      'en innsigelse mot varselet etter et «i tide» fra appen godtas (HF-U4, VS-U24, del 2 av #498)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '      const hjemmel = innsigelsenEtterITide(k.gjelder, part, u);',
        '      const hjemmel = null && innsigelsenEtterITide(k.gjelder, part, u);',
      ],
    ],
    mal: ['F-MM-V10', 'F-MM-V7c'],
  },
  {
    id: 'F222',
    feilklasse:
      'et svar på vederlaget etter en innsigelse mot vederlagskravet avvises (VS-U24, #517)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '  const utenfor = utenforOmfanget(s.spor, s.vurderinger as Record<string, unknown>);',
        "  const utenfor =\n    s.spor === 'vederlag' && Object.values(u.elementer).some((e) => e.art === 'innsigelse')\n      ? 'innsigelse'\n      : utenforOmfanget(s.spor, s.vurderinger as Record<string, unknown>);",
      ],
    ],
    mal: ['F-MM-V3b'],
  },
  {
    id: 'F223',
    feilklasse: 'et «i tide» i et registrert brev gir opp innsigelsen i brevteksten (HF-U4, OV-U4)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '    if (!erRegistrert(d.opplysninger)) svarFraParten.push(...d.svar);',
        '    svarFraParten.push(...d.svar);',
      ],
    ],
    mal: [
      'et «i tide» i et registrert brev gir ikke opp innsigelsen, så et «for sent» fra appen på en ny versjon gjentar den',
    ],
  },
  {
    id: 'F224',
    feilklasse:
      'en innsigelse mot en grunnlagsversjon der § 32.2 ikke gjelder, leses som en påberopelse etter § 32.2 (VS-U24, GR-U11)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "krav.spor === 'grunnlag' && !kravetErDokumentasjon(d) && varslingsplikt(krav)",
        "krav.spor === 'grunnlag' && !kravetErDokumentasjon(d) && true",
      ],
    ],
    mal: [
      'en innsigelse mot en versjon der § 32.2 ikke gjelder, gjentas ikke og gis ikke opp i svaret på en senere versjon',
      'etter et «i tide» etter § 32.2 avvises ikke en innsigelse mot en versjon der § 32.2 ikke gjelder',
    ],
  },
  {
    id: 'F225',
    feilklasse: 'en ny grunnlagsversjon med en annen hjemmel godtas (GR-U22, #569)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        "  if (k.spor !== 'grunnlag' || !forrige) return null;",
        "  if (k.spor !== 'grunnlag' || !forrige || u) return null;",
      ],
    ],
    mal: ['irregulær endring til svikt', 'svikt til andre forhold', 'F-MM-G39'],
  },
  {
    id: 'F226',
    feilklasse:
      'en ny grunnlagsversjon med en annen underkategori i samme hovedkategori godtas (GR-U22, #569)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ['    tekst(k.innhold.underkategori) === tekst(forrige.innhold.underkategori)', '    true'],
    ],
    mal: [
      'grunnforhold til medvirkning, i samme hovedkategori',
      'irregulær endring til lovendring, der § 32.2 gjelder i begge',
      'irregulær endring til endringsordre',
      'endringsordre til irregulær endring',
      'F-MM-G28',
      'F-MM-G34',
    ],
  },
  {
    id: 'F227',
    feilklasse:
      'et felt som ikke gjelder kategorien, avvises som «i tide» før utregningen (#520, HF-U4)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '  const utenfor = utenforOmfanget(s.spor, s.vurderinger as Record<string, unknown>);',
        "  if (s.vurderinger.grunnlag_varslet_i_tide === false && paaberoptEtterITide(u, s.spor, [{ id: '', art: 'rettidighet', gjelder: '', hjemmel: '32.2', iTide: false }]))\n    return avvis('SAGT_I_TIDE', '');\n  const utenfor = utenforOmfanget(s.spor, s.vurderinger as Record<string, unknown>);",
      ],
    ],
    mal: ['på en registrert versjon i svikt avvises av utregningen'],
  },
  {
    id: 'F228',
    feilklasse:
      'en revisjon eller et nytt svar fra frafall til avslag godtas (GR-U17, GR-U20, #510)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        "  if (s.spor === 'grunnlag' && s.vurderinger.resultat === 'avslaatt' && frafalletBinder(u))",
        "  if (s.spor === 'grunnlag' && s.vurderinger.resultat === 'avslaatt' && frafalletBinder(u) && !u)",
      ],
    ],
    mal: ['en revisjon fra frafall til avslag avvises', 'F-MM-G37', 'F-MM-G38'],
  },
  {
    id: 'F230',
    feilklasse: 'frafallet faller bort med en ny grunnlagsversjon (GR-U20, #510)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'binder(u, s) && frafaller(s));',
        'binder(u, s) && frafaller(s) && s.gjelder === u.spor.grunnlag.gjeldendeKrav?.id);',
      ],
    ],
    mal: ['byggherren kan svare med frafall eller endringsordre, ikke med avslag', 'F-MM-G38'],
  },
  {
    id: 'F231',
    feilklasse:
      'et avslag etter frafallet i et brev utenfor kommandoene leses med virkning (GR-U17, MM-U18, MM-U19, #510)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "      standpunktet(s, 'grunnlag')?.resultat === 'avslaatt'\n",
        "      standpunktet(s, 'grunnlag')?.resultat === 'avslaatt' &&\n      !u\n",
      ],
    ],
    mal: ['gjør saken ikke forstått'],
  },
  {
    id: 'F233',
    feilklasse:
      'en påberopelse etter § 32.2 etter frafallet i et brev utenfor kommandoene leses med virkning (GR-U17, MM-U18, MM-U19, #510)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "    else if (bundet && s.spor === 'grunnlag' && paaberoperVarselet(s))",
        "    else if (bundet && s.spor === 'grunnlag' && paaberoperVarselet(s) && !u)",
      ],
    ],
    mal: ['en påberopelse etter § 32.2 i et brev'],
  },
  {
    id: 'F234',
    feilklasse:
      'en ny grunnlagsversjon etter frafallet gjør grunnlaget uavklart til byggherren svarer (GR-U23, OV-U3, #510)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['  const venterEtterFrafall =', '  const venterEtterFrafall = false &&']],
    mal: ['grunnlaget er avklart ved frafallet', 'F-MM-G42'],
  },
  {
    id: 'F235',
    feilklasse:
      'utledningen sier at en grunnlagsversjon venter på svar når kravene er avgjort (GR-U24, #510, #580)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [[' && !s.trukket && !kraveneErAvgjort(u);', ' && !s.trukket;']],
    mal: ['svaret på versjon 2 avvises (GR-U24'],
  },
  {
    id: 'F236',
    feilklasse:
      'en endringsordre byggherren har registrert, er en endringsordre i saken og sperrer TEs trekk av grunnlaget (OV-U6, #594)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['    !erRegistrert(dokumenter.get(gSvar.dokument)!.opplysninger)\n', '    true\n'],
    ],
    mal: ['F-MM-G43', 'F-MM-G18', 'F-MM-G45'],
  },
  {
    id: 'F240',
    feilklasse: 'en revisjon sammenliknes ikke med svaret den erstatter (HF-U5)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['return forrige && binding(forrige, nye);', 'return null;']],
    mal: [
      'et lavere godkjent beløp avvises',
      'færre godkjente dager avvises',
      'F-MM-HF-U5-vederlag',
      'F-MM-HF-U5-frist',
      'F-MM-HF-U5-grunnlag',
    ],
  },
  {
    id: 'F241',
    feilklasse: 'aksepten av beregningsmåten sammenliknes ikke (HF-U14)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [['if (ny(f)?.aksepterer === false)', 'if (false)']],
    mal: ['aksepten av beregningsmåten kan ikke tas tilbake', 'F-MM-HF-U14'],
  },
  {
    id: 'F242',
    feilklasse:
      'byggherren er fri for svaret i vederlaget etter en ny grunnlagsversjon, som før HF-U21',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '  return forrige && binding(forrige, nye);\n',
        '  if (forrige?.grunnlagskrav && forrige.grunnlagskrav !== u.spor.grunnlag.gjeldendeKrav?.id) return null;\n  return forrige && binding(forrige, nye);\n',
      ],
    ],
    mal: ['bindingen i vederlaget står etter en ny grunnlagsversjon', 'F-MM-HF-U21'],
  },
  {
    id: 'F243',
    feilklasse:
      'revisjonen sammenliknes med det første svaret på kravversjonen, ikke det den erstatter',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        'return forrige && binding(forrige, nye);',
        'return forrige && binding(u.spor[s.spor].svar.find((x) => x.gjelder === forrige.gjelder)!, nye);',
      ],
    ],
    mal: ['sammenliknes med svaret revisjonen erstatter'],
  },
  {
    id: 'F244',
    feilklasse: 'beløpet sammenliknes i hele kroner, ikke til hele øre (B-13)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [
      ['      if (nytt < godkjent)', '      if (Math.floor(n.godkjent) < Math.floor(f.godkjent))'],
    ],
    mal: ['beløpet sammenliknes til hele øre'],
  },
  {
    id: 'F246',
    feilklasse:
      'et krav, svar, en aksept eller et trekk i et registrert brev får virkning igjen (OV-U4, #574)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['  if (!erRegistrert(d.opplysninger)) return new Set(krav);', '  return new Set();'],
    ],
    mal: ['F-MM-G44', 'F-MM-G45-kontroll', 'F-MM-G46'],
  },
  {
    id: 'F247',
    feilklasse:
      'byggherrens registrerte endringsordre er dokumentasjon uten virkning (OV-U6, #574)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    ...d.svar.filter((s) => !erRegistrertEndringsordre(s, d)).map((s) => s.id),',
        '    ...d.svar.map((s) => s.id),',
      ],
    ],
    mal: ['F-MM-G45', 'F-MM-G18', 'F-MM-G43'],
  },
  {
    id: 'F248',
    feilklasse: 'et grunnlagskrav fra appen uten datoen godtas (VS-U26, #664)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [['  if (dato === undefined) return [`', '  if (dato === undefined) return []; [`']],
    mal: [
      'et krav fra appen i endring/irregulaer_endring',
      'et krav fra appen i svikt/grunnforhold',
    ],
  },
  {
    id: 'F249',
    feilklasse: 'datoen godtas i en kategori den ikke hører til (VS-U26, #664)',
    fil: `${K}/format/format.ts`,
    endringer: [
      [
        "...ikkeI(['endringsordre', ...OPPGITTE_DATOER.filter((d) => d !== dato)]),",
        "...ikkeI(['endringsordre']),",
      ],
    ],
    mal: ['avviser datoen for pålegget mottatt i svikt', 'datoen i feil kategori er det ikke'],
  },
  {
    id: 'F250',
    feilklasse: 'en dato etter brevets dato godtas (arbeidsvalg 1 i #664)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['dag <= brevetsDato) return null;', 'dag <= brevetsDato || true) return null;']],
    mal: ['en dato etter brevets dato avvises'],
  },
  {
    id: 'F251',
    feilklasse: 'en dato samme dag som brevet avvises (arbeidsvalg 1 i #664)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['dag <= brevetsDato) return null;', 'dag < brevetsDato) return null;']],
    mal: ['samme dag godtas', 'brevets dato er datoen i norsk tid'],
  },
  {
    id: 'F252',
    feilklasse: 'brevets dato regnes i UTC, ikke i norsk tid (VS-U8, #664)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        'registrertDato({ registrert: tidspunkt.toISOString() })',
        'tidspunkt.toISOString().slice(0, 10)',
      ],
    ],
    mal: ['brevets dato er datoen i norsk tid'],
  },
  {
    id: 'F253',
    feilklasse: 'brevet sier ikke datoen pålegget ble mottatt (VS-U26, #664)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [["if (typeof k.innhold.paalegg_mottatt === 'string')", 'if (false)']],
    mal: ['en endring der § 32.2 gjelder, med varselet', 'en ny kravversjon kan rette datoen'],
  },
  {
    id: 'F254',
    feilklasse: 'brevet sier ikke datoen TE ble klar over forholdet (VS-U26, #664)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [["if (typeof k.innhold.klar_over_forholdet === 'string')", 'if (false)']],
    mal: ['svikt viser til § 33.1 b og § 34.1.2', 'annet forhold etter § 33.1 c'],
  },
  {
    id: 'F255',
    feilklasse: 'byggherren kan opprette en KOE-sak (OV-U1, #664)',
    fil: `${K}/kommandoer/opprettelse.ts`,
    endringer: [["  if (part !== 'TE')", '  if (false)']],
    mal: ['byggherren kan ikke opprette en KOE-sak'],
  },
  {
    id: 'F256',
    feilklasse: 'et beløp som ikke er et tall, gir en feil på serveren, ikke en avvisning (#550)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        'if (feil instanceof UgyldigVurdering || feil instanceof UgyldigBeloep)',
        'if (feil instanceof UgyldigVurdering)',
      ],
    ],
    mal: ['et godkjent beløp som ikke er et tall, avvises som en ugyldig vurdering'],
  },
  {
    id: 'F257',
    feilklasse:
      'en lagret dato med klokkeslett sammenliknes som tekst, ikke som kalenderdag (SK-12, #474, #766)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      [
        '  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(dato)) return erKalenderdato(dato) ? dato : null;',
        '  return dato;',
      ],
    ],
    mal: ['en lagret varseldato med klokkeslett sammenliknes som dagen i norsk tid'],
  },
  // K-1 økt A (#770): MM-U27, OV-U13, #766 punkt 1 og #522.
  {
    id: 'F258',
    feilklasse:
      'en hendelse utenfor kommandoene som bryter bindingen etter HF-U4 eller HF-U5, leses med virkning (MM-U27)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    if (!registrert)\n      for (const x of bryterBindingen(',
        '    if (false)\n      for (const x of bryterBindingen(',
      ],
    ],
    mal: [
      'en revisjon som senker det godkjente beløpet, gjør saken ikke forstått',
      'etter at BH har sagt at varselet kom i tide (MM-U27, HF-U4)',
    ],
  },
  {
    id: 'F259',
    feilklasse: 'et registrert brev som bryter bindingen, gjør saken ikke forstått (MM-U27, OV-U4)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    if (!registrert)\n      for (const x of bryterBindingen(',
        '    if (true)\n      for (const x of bryterBindingen(',
      ],
    ],
    mal: ['den samme revisjonen i et registrert brev gjør ikke saken uforstått'],
  },
  {
    id: 'F260',
    feilklasse:
      'en revisjon utenfor kommandoene som senker en innrømmelse, leses med virkning (MM-U27, HF-U5)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      senketInnroemmelse(forrige, s.standpunkter)', '      false']],
    mal: ['en revisjon som senker det godkjente beløpet, gjør saken ikke forstått'],
  },
  {
    id: 'F261',
    feilklasse:
      '«for sent» etter § 33.6.1 utenfor kommandoene leses med virkning etter «i tide» (MM-U27, HF-U4)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [[": p.art === 'spesifisering' && !p.iTide", ': false && !p.iTide']],
    mal: ['en revisjon som sier at spesifiseringen etter § 33.6.1 kom for sent'],
  },
  {
    id: 'F262',
    feilklasse:
      'en innsigelse utenfor kommandoene leses med virkning etter «i tide» (MM-U27, HF-U4, VS-U24)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "    if (x.art === 'innsigelse' && innsigelsenEtterITide(x.gjelder, d.avsender, u))",
        '    if (false)',
      ],
    ],
    mal: ['etter at BH har sagt at varselet kom i tide (MM-U27, HF-U4)'],
  },
  {
    id: 'F263',
    feilklasse: 'SK-12 sammenlikner den lagrede varseldatoen som tekst (#766)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ['return registrert === kalenderdag(k.varsel.sendt)', 'return sendt.dato === k.varsel.sendt'],
    ],
    mal: ['en lagret varseldato med klokkeslett sammenliknes som dagen i norsk tid'],
  },
  {
    id: 'F265',
    feilklasse: 'påberopelsen etter § 32.2 leses av feltet for § 34.1.2 (HF-U4, #522)',
    fil: `${K}/frosset/frysing.ts`,
    endringer: [
      [
        "if (typeof v.grunnlag_varslet_i_tide === 'boolean')",
        "if (typeof v.hovedkrav_varslet_i_tide === 'boolean')",
      ],
      ['i_tide: v.grunnlag_varslet_i_tide,', 'i_tide: v.hovedkrav_varslet_i_tide,'],
    ],
    mal: ['en revisjon som påberoper «for sent» etter «i tide», avvises'],
  },
  {
    id: 'F267',
    feilklasse:
      'opplysningen om § 31.3 godtas ved et registrert brev som ikke er byggherrens endringsordre (OV-U13, OV-U6, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['    if (!brev.svar.some((s) => erRegistrertEndringsordre(s, brev)))', '    if (false)'],
    ],
    mal: ['opplysningen om § 31.3 ved'],
  },
  {
    id: 'F269',
    feilklasse: 'en innsigelse fra TE regnes som brudd på byggherrens «i tide» (MM-U27, HF-U4)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["  if (part !== 'BH') return null;", '  if (false) return null;']],
    mal: ['en innsigelse fra TE mot eget grunnlagskrav etter «i tide»'],
  },
  {
    id: 'F270',
    feilklasse:
      'en innsigelse mot et grunnlagskrav i et registrert brev regnes som påberopelse etter § 32.2 (arbeidsvalg 1 i #770, #536)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['&& !kravetErDokumentasjon(d) &&', '&& true &&']],
    mal: [
      'brevteksten gjentar den ikke i svaret',
      'kommandoene avviser den ikke etter et «i tide»',
    ],
  },
  {
    id: 'F271',
    feilklasse: 'et tidspunkt uten tidssone tolkes i vertens tidssone (T1 i #770, #766)',
    fil: `${K}/format/leser.ts`,
    endringer: [['  if (!TIDSPUNKT.test(dato) || ', '  if (false || ']],
    mal: ['kalenderdagen for 2026-10-02T23:30:00 er null'],
  },
  {
    id: 'F273',
    feilklasse: 'et tidspunkt med en dag som ikke finnes, rulles over til en annen dag (T1 i #770)',
    fil: `${K}/format/leser.ts`,
    endringer: [['|| !erKalenderdato(dato.slice(0, 10))) return null;', ') return null;']],
    mal: ['kalenderdagen for 2026-02-30T10:00:00Z er null'],
  },
  {
    id: 'F275',
    feilklasse: 'et tidspunkt klokka 24 rulles over til neste dag (T1 i #770)',
    fil: `${K}/format/leser.ts`,
    endringer: [['T([01]\\d|2[0-3]):[0-5]\\d', 'T\\d{2}:\\d{2}']],
    mal: ['kalenderdagen for 2026-10-02T24:00:00+02:00 er null'],
  },
  {
    id: 'F274',
    feilklasse: 'SK-12 sier at en lagret varseldato som ikke kan leses, er en annen dato (#766)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['      if (registrert === null)', '      if (false)']],
    mal: ['en lagret varseldato uten tidssone kan ikke leses'],
  },
  {
    id: 'F272',
    feilklasse: 'et beløp som mangler i svaret, sammenliknes som null kroner (HF-U5, #627)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [['      if (nytt === null || godkjent === null)', '      if (false)']],
    mal: ['sammenliknes ikke og avvises'],
  },
  {
    id: 'F292',
    feilklasse: 'dager som mangler i svaret, sammenliknes som null dager (HF-U5, #814)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [
      [
        "      if (typeof n.vurdert !== 'number' || typeof f.vurdert !== 'number')",
        '      if (false)',
      ],
    ],
    mal: ['dagene sammenliknes ikke, og revisjonen avvises'],
  },
  // K-1 B1 (#770): T5 om grenene i `strid` og referansekontrollen (#669), #776 p1 og #522.
  {
    id: 'F276',
    feilklasse:
      'en revisjon av et svar partene er enige om, leses med virkning (GR-U10, KA-U7, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    else if (s.erstatter !== null && u.spor[s.spor].enighet)',
        '    else if (s.erstatter !== null && u.spor[s.spor].enighet && !s)',
      ],
    ],
    mal: ['en revisjon av et svar partene er enige om (GR-U10, KA-U7)'],
  },
  {
    id: 'F277',
    feilklasse:
      'en aksept av et svar partene alt er enige om, gir ingen strid (GR-U8, KA-U7, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    else if (sporet && u.spor[sporet].enighet && u.spor[sporet].gjeldendeSvar?.id === gjelder)',
        '    else if (false)',
      ],
    ],
    mal: ['en aksept av et svar partene alt er enige om (GR-U8, KA-U7)'],
  },
  {
    id: 'F278',
    feilklasse: 'en aksept av et svar i et trukket spor gir ingen strid (MM-U20, GR-U5, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    else if (sporet && u.spor[sporet].trukket)', '    else if (false)']],
    mal: ['en aksept av et svar i et spor etter at kravet er trukket (MM-U20, GR-U5)'],
  },
  {
    id: 'F279',
    feilklasse:
      'et utsagn kan vise til et element uten virkning uten krav til art og part (VS-U1, MM-U18, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      !kanGjelde(x.art, maal, elementer[x.id].part, x.gjelder)',
        '      !(uten.has(x.gjelder) || kanGjelde(x.art, maal, elementer[x.id].part, x.gjelder))',
      ],
    ],
    mal: ['en innsigelse mot egen endringsordre uten virkning viser ikke til noe den kan gjelde'],
  },
  {
    id: 'F280',
    feilklasse: 'en revisjon av et svar uten virkning gir ingen strid (MM-U18, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    else if (utenVirkning(s.erstatter))', '    else if (false)']],
    mal: ['en revisjon av et svar uten virkning (MM-U18)'],
  },
  {
    id: 'F281',
    feilklasse:
      'hjemmelen for en innsigelse leses uten varslingsplikten som ble frosset i svaret (MM-U18, GR-U12, #776)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['        s.beslutningsgrunnlag.varslingsplikt === true &&\n', '']],
    mal: ['hjemmelen for innsigelsen leses av svaret som sa «i tide», ikke av et nyere regelsett'],
  },
  {
    id: 'F282',
    feilklasse: 'påberopelsen etter § 34.1.2 leses av feltet for § 32.2 (HF-U4, #522)',
    fil: `${K}/kommandoer/standpunkter.ts`,
    endringer: [
      [
        "if (typeof v.hovedkrav_varslet_i_tide === 'boolean')",
        "if (typeof v.grunnlag_varslet_i_tide === 'boolean')",
      ],
      ['i_tide: v.hovedkrav_varslet_i_tide,', 'i_tide: v.grunnlag_varslet_i_tide,'],
    ],
    mal: ['en revisjon som påberoper «for sent» etter «i tide», avvises'],
  },
  {
    id: 'F283',
    feilklasse:
      'et svar som utelater vurderingen etter § 34.1.2, påberoper at varselet kom for sent (HF-U4, KA-U4, #522)',
    fil: `${K}/kommandoer/standpunkter.ts`,
    endringer: [
      [
        "if (typeof v.hovedkrav_varslet_i_tide === 'boolean')",
        'if (v.hovedkrav_varslet_i_tide !== true)',
      ],
      ['i_tide: v.hovedkrav_varslet_i_tide,', 'i_tide: v.hovedkrav_varslet_i_tide === true,'],
    ],
    mal: ['kontrollsak: grunnlaget godkjent gir ingen prinsipal grunn fra grunnlaget', 'F-MM-B1'],
  },
  {
    id: 'F284',
    feilklasse: 'et «i tide» etter § 33.6.1 binder byggherren etter § 33.4 (HF-U4, #522)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '  const bundet = paaberoptEtterITide(u, s.spor, nye);',
        "  const bundet = paaberoptEtterITide(\n    forrige\n      ? { ...u, spor: { ...u.spor, frist: { ...u.spor.frist, svar: u.spor.frist.svar.map((x) => ({ ...x, standpunkter: x.standpunkter.map((p) => (p.art === 'spesifisering' ? { ...p, art: 'rettidighet' as const, hjemmel: '33.4' as const } : p)) })) } } }\n      : u,\n    s.spor,\n    nye\n  );",
      ],
    ],
    mal: ['«i tide» etter § 33.6.1 sier ingenting om § 33.4'],
  },
  {
    id: 'F285',
    feilklasse:
      'brevteksten leser ikke regelsettet for om en innsigelse er en påberopelse etter § 32.2 (VS-U24, #798)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['(k) => gjelderVarslingsplikten(k, regler)) ===', '() => false) ===']],
    mal: ['ikke av et nyere regelsett'],
  },
  {
    id: 'F286',
    feilklasse:
      'et «i tide» etter § 32.2 binder bare versjoner i samme kategori (HF-U8, arbeidsvalget i #798, #804)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      binder(u, s) &&\n      s.standpunkter.some((p) =>',
        "      binder(u, s) &&\n      (spor !== 'grunnlag' ||\n        sammeKategori(\n          u.spor.grunnlag.krav.find((k) => k.id === s.gjelder)!,\n          u.spor.grunnlag.gjeldendeKrav!\n        )) &&\n      s.standpunkter.some((p) =>",
      ],
    ],
    mal: ['når et svar utenfor kommandoene har besvart den'],
  },
  {
    id: 'F287',
    feilklasse:
      'kjernen godtar et vedlegg serveren ikke fant i saken (LV-U14, arbeidsvalg 3 i #790)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      ['(id) => !vedlegg.has(id.toLowerCase())', '() => false'],
      [
        'vedlegg.get(id.toLowerCase())!',
        "(vedlegg.get(id.toLowerCase()) ?? { vedlegg_id: id, filnavn: id, innhold_sha256: '0'.repeat(64) })",
      ],
    ],
    mal: ['et vedlegg serveren ikke fant i saken, avvises'],
  },
  {
    id: 'F288',
    feilklasse:
      'brevet lagrer ID-en fra klienten uten filnavnet og summen fra mellomlageret (LV-U14)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        'ider.map((id) => vedlegg.get(id.toLowerCase())!)',
        'ider.map((id) => ({ ...vedlegg.get(id.toLowerCase())!, vedlegg_id: id }))',
      ],
    ],
    mal: ['et vedlegg serveren ikke fant i saken, avvises, og ID-en lagres med små bokstaver'],
  },
  {
    id: 'F289',
    feilklasse: 'et registrert varsel godtas uten brevet som vedlegg (OV-U4)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [
      [
        "['type', 'spor', 'hjemmel', 'sendt', 'dokumentasjon']",
        "['type', 'spor', 'hjemmel', 'sendt']",
      ],
    ],
    mal: ['avviser et registrert varsel uten vedlegg'],
  },
  {
    id: 'F290',
    feilklasse: 'samme vedlegg godtas to ganger i en kommando (#790)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [['.size !== vedlegg.length', '.size < 0']],
    mal: ['med samme vedlegg to ganger'],
  },
  {
    id: 'F291',
    feilklasse: 'brevteksten lister vedleggenes ID i stedet for filnavnet (arbeidsvalg 10 i #790)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['`«${v.filnavn}»`', '`«${v.vedlegg_id}»`']],
    mal: ['et brev med vedlegg får et avsnitt som lister filnavnene'],
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

/** Navnet på hver test i samlingen, i formen `fullName` har i rapporten. */
function testnavn(): string[] {
  const mappe = mkdtempSync(join(tmpdir(), 'feilinnfoering-navn-'));
  try {
    const ut = join(mappe, 'navn.json');
    const r = spawnSync(
      'npx',
      ['vitest', 'list', 'kjerne/', 'sprakprove/kjernelagring/', `--json=${ut}`],
      {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        timeout: 300_000,
        env: { ...process.env, KOE_TESTBASE_URL: 'postgresql://feilinnfoering.invalid/navn' },
      }
    );
    if (r.status !== 0 || !existsSync(ut))
      throw new Error(
        `vitest list feilet (status ${r.status}, signal ${r.signal}, ${r.error ?? 'ingen feil fra spawn'}):\n${r.stderr}\n${r.stdout}`
      );
    return (JSON.parse(readFileSync(ut, 'utf8')) as { name: string }[]).map((t) => t.name);
  } finally {
    rmSync(mappe, { recursive: true, force: true });
  }
}

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
  const manglerMal = m.mal.filter((mal) => !feilet.some((t) => treffer(t.fullName, mal)));
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

const argumenter = process.argv.slice(2);
const bareAnkre = argumenter.includes('--ankre');
const valgt = argumenter.filter((a) => a !== '--ankre');
const ukjente = valgt.filter((id) => !MUTASJONER.some((m) => m.id === id));
if (ukjente.length) throw new Error(`Ukjente feilinnføringer: ${ukjente.join(', ')}`);
const valgte = MUTASJONER.filter((m) => !valgt.length || valgt.includes(m.id));
// Endringene i én feilinnføring gjøres etter hverandre, så hvert anker slås opp i teksten
// slik den er etter de foregående.
const ankerfeil = valgte.flatMap((m) => {
  let tekst = readFileSync(m.fil, 'utf8');
  return m.endringer.flatMap(([fra, til]) => {
    if (tekst.split(fra).length !== 2)
      return [`${m.id}: «${fra}» finnes ikke nøyaktig én gang i ${m.fil}`];
    tekst = tekst.replace(fra, til);
    return [];
  });
});
if (ankerfeil.length) throw new Error(ankerfeil.join('\n'));
const delform = /^(\d+)\/(\d+)$/.exec(process.env.FEILINNFOERING_DEL ?? '1/1');
const [del, deler] = [Number(delform?.[1]), Number(delform?.[2])];
if (!delform || del < 1 || del > deler)
  throw new Error(`FEILINNFOERING_DEL må ha formen i/n, ikke «${process.env.FEILINNFOERING_DEL}»`);
// #432: målene er deler av testnavnene, lest med `vitest list` uten å kjøre testene. Med en
// adresse til testbasen hopper ikke lagringstestene over seg selv; de kobler seg til i
// hookene, som ikke kjøres.
const navn = testnavn();
const malfeil = valgte.flatMap((m) =>
  m.mal
    // `vitest list` skiller nivåene med ` > `, rapporten med mellomrom.
    .filter((mal) => !navn.some((n) => treffer(n, mal) || treffer(n.split(' > ').join(' '), mal)))
    .map(
      (mal) =>
        `${m.id}: målet «${mal}» er ikke en del av navnet på noen test (et mål treffer ikke midt i et ord eller en ID)`
    )
);
if (malfeil.length) throw new Error(malfeil.join('\n'));
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

if (bareAnkre)
  console.log(
    `Ankrene i ${valgte.length} feilinnføringer finnes nøyaktig én gang, og målene er deler av navnene på ${navn.length} tester.`
  );
else
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
