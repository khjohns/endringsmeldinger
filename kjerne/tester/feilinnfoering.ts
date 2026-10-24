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
 * opprettelsen og datoen etter VS-U26 (#664), og F296–F300 varselet med vedlegg i
 * fristkravet (OV-U5, #828) og datoen for varselet (#968), og F301–F303
 * protesten, påberopt passivitet og den senere begrunnelsen, som avvises etter
 * OV-U7 (#587), og F170 og F304 den leste begrunnelsen og passiviteten etter at
 * kravene er avgjort (OV-U7, #994), og F312–F315 det som foreligger i et lukket spor
 * og etter et frafall (#1050), og F330–F333 tegnene PDF-en av brevet ikke kan vise (#801), og F353–F356 brevet registrert som dokumentasjon (OV-U4, OV-U16, #1045), og F406–F411 forbeholdet for ubesvart grunnlag og oppgjør som fast sum (GR-U26, LV-U31, OV-U33, #1239, #1240), og F412–F414 postlisten og avsnittene per lag i svarbrevet (#1047, #1267). Én mutasjon om gangen per arbeidskopi, Vitest over hele `kjerne/`
 * og `sprakprove/kjernelagring/` uten isolasjon mellom filene, og originalteksten
 * settes tilbake etterpå. Med `FEILINNFOERING_UTVALG=1`, som workflowen setter på en
 * PR, kjører hver mutasjon bare filene med målene sine (#934). For
 * hver mutasjon kreves det at de forventede målassertions feiler, og at alle
 * feil er assertions, ikke import, oppsett eller en brutt forutsetning
 * (`.claude/rules/tester.md`).
 *
 * Mutasjonene fordeles på flere kopier av arbeidstreet, med lokale endringer,
 * som kjører samtidig (#378). Lagringstestene i `sprakprove/kjernelagring/` lager
 * hver sin base fra malen på SQL Server-serveren i `KOE_SQLSERVER_TILKOBLING`
 * (`server/tester/testbase.ts`, #932), så kopiene deler serveren, ikke basene.
 * Arbeidstreet muteres ikke.
 * `FEILINNFOERING_ARBEIDSKOPIER` overstyrer antallet, som ellers er antallet
 * prosessorer. `FEILINNFOERING_DEL=i/n` kjører bare del i av n: hver n-te
 * mutasjon fra og med nummer i, med sin egen kontrollkjøring over hele
 * samlingen. Workflowen fordeler delene på flere jobber, og en ny mutasjon havner
 * i en av dem uten videre. Fra-strengene kontrolleres for alle delene.
 *
 * Kjøres fra repoets rot, med SQL Server oppe og `KOE_SQLSERVER_TILKOBLING` satt:
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
import { createRequire } from 'node:module';
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
        "  if (h.type !== 'varsle' && h.type !== 'sende_varsel' && varAvgjort(u, h.spor))",
        // Statusen leses uten å endre utfallet, så bare arkitekturtestene skal feile (#1122).
        "  if (h.type !== 'varsle' && h.type !== 'sende_varsel' && varAvgjort(u, h.spor) && visning(u, { versjon: 0, gjelderVarslingsplikten: () => true, gjelderVarslingspliktenForVederlag: () => true }).status !== undefined)",
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
        "if (p.art !== 'rettidighet' || !erVarselhjemmel(p.hjemmel)) return false;",
        "if (p.art !== 'rettidighet' || p.hjemmel !== '34.1.2') return false;",
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
    mal: ['F-MM-A', 'F-MM-G10', 'F-MM-G30'],
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
        "      e.beslutningsgrunnlag ?? { regelversjon: 0, virkninger: standpunkter.map((s) => ({ standpunkt: s.id, lag: 1 })), linje: '-', sammenfall: false, ...(spor === 'grunnlag' ? { varslingsplikt: false } : {}) },",
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
    endringer: [['p.gjelder !== varsel.id;', 'p.gjelder === varsel.id;']],
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
        'return beslutningsgrunnlag(innhold, grunnlagskrav, regler, forskyvning);',
        'return beslutningsgrunnlag(innhold, undefined, regler, forskyvning);',
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
    endringer: [["        gjelder: varseletForNyttSvar(u, '33.4'),\n", '']],
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
    feilklasse: '«ingen krav» i begge sporene avgjør ikke kravene (KA-U12, #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [[' || KRAVSPOR.every((n) => u.spor[n].ingenKrav)', '']],
    mal: ['når byggherren har frafalt pålegget, sier meldingen det'],
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
    endringer: [['OR b.saksversjon <> h.versjon)', ')']],
    mal: ['finner en sak med en ny hendelse etter bufferen, og bare den'],
  },
  {
    id: 'F51',
    feilklasse: 'gjenoppbyggingen skriver mer enn bufferen (merknaden 07.10 til B-10, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [
      [
        'UPDATE koe.kjernebuffer',
        "UPDATE koe.projects SET name = CONCAT(N'Regel ', @regelversjon) WHERE id = @prosjekt_id;\n             UPDATE koe.kjernebuffer",
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
        's.grunnlagskrav)),\n    kjerne\n',
        's.grunnlagskrav)),\n    { ...kjerne, regler: GJELDENDE_REGLER }\n',
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
    endringer: [['AND format > @leserformat', 'AND format >= @leserformat']],
    mal: ['lister sakene med en rad i et format kjernen ikke leser'],
  },
  {
    id: 'F56',
    feilklasse:
      'spørringen etter utdaterte buffere tar med saker uten rader fra kjernen (B-17, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [['GROUP BY sak_id HAVING COUNT(format) > 0) h', 'GROUP BY sak_id) h']],
    mal: ['tar ikke med en sak uten rader fra kjernen'],
  },
  {
    id: 'F57',
    feilklasse: 'bufferen leses på tvers av prosjektgrensen (AGENTS.md, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [
      [
        'FROM koe.kjernebuffer WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt_id`',
        'FROM koe.kjernebuffer WHERE sak_id = @sak_id AND @prosjekt_id IS NOT NULL`',
      ],
    ],
    mal: ['lar bufferen holde seg i prosjektet'],
  },
  {
    id: 'F58',
    feilklasse: 'bufferen skrives på tvers av prosjektgrensen (AGENTS.md, #316)',
    fil: 'sprakprove/kjernelagring/bane.ts',
    endringer: [
      [
        'WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt_id;',
        'WHERE sak_id = @sak_id AND @prosjekt_id IS NOT NULL;',
      ],
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
        "    u.grunnlagAvvist\n      ? 'TE har godtatt avslaget av grunnlaget (SK-01)'\n      : (spor ? varAvgjort(u, spor) : kraveneErAvgjort(u))",
        "    false\n      ? 'TE har godtatt avslaget av grunnlaget (SK-01)'\n      : false",
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
        'registrert ? [registrert] : [], krav, () => true',
        'registrert ? [registrert] : [], krav.slice(-1), () => true',
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
    feilklasse:
      'et standpunkt i et annet spor eller etter en annen bestemmelse gir opp innsigelsen (VS-U9, VS-U11)',
    fil: `${K}/frosset/standpunkt.ts`,
    // Hjemmelen skiller også sporene, så begge filtrene muteres.
    endringer: [
      ['    .filter((x) => x.spor === spor)', '    .filter((x) => x.spor === x.spor)'],
      ["p.art === 'rettidighet' && p.hjemmel === hjemmel", "p.art === 'rettidighet' && true"],
    ],
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
        '    ...s.standpunkter.map((p) => {',
        "    ...s.standpunkter.filter((p) => virkning.get(p.id) !== 'uten_virkning').map((p) => {",
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
    endringer: [['  if (s.erstatter) {', '  if (false) {']],
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
      [
        "  if (p.hjemmel === '32.2') return VARSELET[p.hjemmel];",
        "  if (p.hjemmel === '32.2') return VARSELET['33.4'];",
      ],
      ['  return `${VARSELET[p.hjemmel]} i ', "  return `${VARSELET['32.2']} i "],
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
        'at TE vil kreve ${VIL_KREVE[u.hjemmel]} som følge av forholdet i ${sak}.`',
        'at TE vil kreve ${VIL_KREVE[u.hjemmel]}.`',
      ],
    ],
    mal: ['med teksten i VS-U15', 'med teksten i LV-U19'],
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
      ['          : { type, spor: k.spor },', "          : { type: 'krav', spor: 'frist' },"],
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
    id: 'F160',
    feilklasse: 'leseren godtar en begrunnelse som gjelder noe annet enn et svar (KA-U34, MM-U2)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["return maal.art === 'svar';", "return maal.art !== 'opplysning';"]],
    mal: ['en begrunnelse fra TE eller av noe annet enn et svar gjør saken ikke forstått'],
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
    id: 'F165',
    feilklasse: 'leseren godtar en begrunnelse fra TE (KA-U34, MM-U2)',
    fil: `${K}/format/leser.ts`,
    endringer: [["  begrunnelse: 'BH',", '  begrunnelse: null,']],
    mal: ['en begrunnelse fra TE eller av noe annet enn et svar gjør saken ikke forstått'],
  },
  {
    id: 'F168',
    feilklasse:
      'protest, påberopt passivitet og senere begrunnelse tilbys uten forutsetningene (OV-U7, INV-MM-1)',
    fil: `${K}/kommandoer/handlinger.ts`,
    endringer: [
      [
        "    if (KAN_FAA_INNSIGELSE.has(e.art)) ut.push({ type: 'innsigelse', gjelder: id });\n",
        "    if (KAN_FAA_INNSIGELSE.has(e.art)) ut.push({ type: 'innsigelse', gjelder: id });\n    if (e.innsigelse || e.art === 'dokument') ut.push({ type: 'protest', gjelder: id });\n    if (e.art === 'svar') ut.push({ type: 'begrunne', gjelder: id });\n",
      ],
      [
        '  return ut;\n',
        "  for (const k of u.spor.grunnlag.krav) ut.push({ type: 'passivitet', gjelder: k.id });\n  return ut;\n",
      ],
      [
        '.filter((h) => forutsetninger(h, part, u) === null)',
        ".filter((h) => ['protest', 'passivitet', 'begrunne'].includes(h.type) || forutsetninger(h, part, u) === null)",
      ],
    ],
    mal: [
      'protest, påberopt passivitet og senere begrunnelse tilbys ingen av partene, også med en innsigelse, et dokument, et grunnlagskrav og et svar',
    ],
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
    feilklasse: 'en lest senere begrunnelse kan endre utfallet (KA-U34, OV-U7)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "['aksept', 'trekk', 'ingen_krav', 'varsel']",
        "['aksept', 'trekk', 'ingen_krav', 'varsel', 'begrunnelse']",
      ],
    ],
    mal: ['en lest senere begrunnelse etter at kravene er avgjort'],
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
      ['beloep: prekludert ? 0 : prinsipaltBeloep(svar, v)', 'beloep: prinsipaltBeloep(svar, v)'],
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
    endringer: [["gjelder: varseletForNyttSvar(u, '34.1.2'),", 'gjelder: krav.id,']],
    mal: ['F-MM-V-34-1-2-ny-kravversjon'],
  },
  {
    id: 'F186',
    feilklasse:
      'en lagret påberopelse etter § 34.1.2 som viser til en senere kravversjon, forstås (HF-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['if (erVarselhjemmel(p.hjemmel)) {', "if (p.hjemmel === '33.4') {"]],
    mal: ['påberopelsen etter § 34.1.2 viser til kravversjonen svaret gjelder'],
  },
  {
    id: 'F187',
    feilklasse: 'godkjenningen av oppgjør som fast sum står uten lag (OV-U33, LV-U31)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "if (s.art === 'beloep' && s.saerskilt) return foerste + Number(posten);",
        "if (s.art === 'metode' && s.aksepterer) return 'uten_virkning';\n      if (s.art === 'beloep' && s.saerskilt) return foerste + Number(posten);",
      ],
    ],
    mal: ['F-MM-V-34-2-2-ja', 'justeringen ellers er upåvirket'],
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
      ["const virkning = s.iTide ? 'uten_virkning' : iLaget();", 'const virkning = iLaget();'],
    ],
    mal: ['F-MM-F-33-6-1-ja'],
  },
  {
    id: 'F191',
    feilklasse:
      'de vurderte dagene står prinsipalt ved siden av påberopelsen etter § 33.6.1 (VS-U4)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['if (!s.iTide) lag++;', 'void 0;']],
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
    endringer: [['v.some((p) => p.standpunkt === spesifisering.id && laget(p.virkning))', 'false']],
    mal: ['sammenfall med en påberopelse etter § 33.6.1', 'F-MM-F-33-6-1-alle-dagene'],
  },
  {
    id: 'F202',
    feilklasse:
      'brevet sier at byggherren godkjenner hele beløpet «av de krevde» når tilbudet ikke er akseptert',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'const resultat = erBeloepetGodkjentFullt(krevd, godkjent)',
        "const resultat = p.resultat === 'godkjent'",
      ],
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
        'if (p.gjelder !== varseletFoerSvaret(varslene, krav, (v) => bakover(s.id, v)))',
        'if (p.gjelder !== varseletFoerSvaret(varslene, krav, (v) => bakover(s.id, v)) && p.gjelder !== s.gjelder)',
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
        "      return utsagn.art === 'varsel'\n        ? utsagn.hjemmel",
        '      return false\n        ? utsagn.hjemmel',
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
        '    const gjelder =\n      hjemmel === HJEMMEL[svar.spor]',
        "    const gjelder =\n      ((svar.spor !== 'grunnlag' || i.gjelder === svar.gjelder) && hjemmel === HJEMMEL[svar.spor])",
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
        'if (!erBeloepetGodkjentFullt(krevdSamlet(krav), godkjent))',
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
    endringer: [["lag === 2 ? 'subsidiært' : 'videre subsidiært'", "'subsidiært'"]],
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
    endringer: [['            p.gjelder === r.gjelder &&\n', '']],
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
    endringer: [[' && !s.trukket && !sporetErLukket(u, spor)\n', ' && !s.trukket\n']],
    mal: [
      'svaret på versjon 2 avvises (GR-U24',
      'SK-01: når TE godtar avslaget av grunnlaget, venter ubesvarte krav',
    ],
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
    endringer: [
      ['return forrige && binding(forrige, nye, forskyvningIBrevet(forrige, u));', 'return null;'],
    ],
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
        '  return forrige && binding(forrige, nye, forskyvningIBrevet(forrige, u));\n',
        '  if (forrige?.grunnlagskrav && forrige.grunnlagskrav !== u.spor.grunnlag.gjeldendeKrav?.id) return null;\n  return forrige && binding(forrige, nye, forskyvningIBrevet(forrige, u));\n',
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
        'return forrige && binding(forrige, nye,',
        'return forrige && binding(u.spor[s.spor].svar.find((x) => x.gjelder === forrige.gjelder)!, nye,',
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
    endringer: [
      ['  if (dato === undefined)\n    return [`', '  if (dato === undefined)\n    return []; [`'],
    ],
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
    // I `kalenderdag` selv ville mutasjonen også gjøre registreringsdatoen til et tidspunkt,
    // og datokontrollen kaster da i hver kommando (#870).
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ['      const registrert = kalenderdag(sendt.dato);', '      const registrert = sendt.dato;'],
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
    endringer: [
      [
        '      senketInnroemmelse(forrige, s.standpunkter, forskyvningIBrevet(forrige, u))',
        '      false',
      ],
    ],
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
        '      x.grunn === undefined &&\n      innsigelsenEtterITide(x.gjelder, d.avsender, u)',
        '      false',
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
    feilklasse: 'en revisjon uten beløp slipper gjennom uten sammenlikning (HF-U5, #627, #787)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [
      ['      if (nytt === null)', '      if (nytt === null) continue;\n      if (false)'],
    ],
    mal: ['sammenliknes ikke og avvises'],
  },
  {
    id: 'F292',
    feilklasse: 'dager som mangler i svaret, sammenliknes som null dager (HF-U5, #814)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [
      ['      if (!Number.isFinite(n.vurdert) || !Number.isFinite(f.vurdert))', '      if (false)'],
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
    mal: ['kontrollsak: grunnlaget godkjent gir ingen prinsipal grunn fra grunnlaget'],
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
    endringer: [['(k) =>\n      gjelderVarslingsplikten(k, regler)\n    );', '() => false);']],
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
      [
        'const funnet = vedlegg.get(id.toLowerCase());',
        "const funnet = vedlegg.get(id.toLowerCase()) ?? { vedlegg_id: id, filnavn: id, innhold_sha256: '0'.repeat(64) };",
      ],
    ],
    mal: ['et vedlegg serveren ikke fant i saken, avvises'],
  },
  {
    id: 'F288',
    feilklasse:
      'brevet lagrer ID-en fra klienten uten filnavnet og summen fra mellomlageret (LV-U14)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['bundne.push(funnet);', 'bundne.push({ ...funnet, vedlegg_id: id });']],
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
  // Runde 9, gruppe K: #870 p1 og p3, tillegg b til #698.
  {
    id: 'F293',
    feilklasse: 'dagene som mangler i revisjonen, sammenliknes (HF-U5, #870)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [
      [
        '      if (!Number.isFinite(n.vurdert) || !Number.isFinite(f.vurdert))',
        '      if (!Number.isFinite(f.vurdert))',
      ],
    ],
    mal: ['dagene mangler i revisjonen: revisjonen avvises'],
  },
  {
    id: 'F294',
    feilklasse:
      'skrivingen gjør formkontrollen før kontrollen av tekst basen ikke kan lagre (#373, #870)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        '  if (ulagringsbar) return ugyldigForm(ulagringsbar);\n  const feil = formfeil(kommando);\n',
        '  const feil = formfeil(kommando);\n  if (ulagringsbar && !feil.length) return ugyldigForm(ulagringsbar);\n',
      ],
    ],
    mal: ['NUL i en tekst gir TEKST_KAN_IKKE_LAGRES'],
  },
  {
    id: 'F295',
    feilklasse: 'endringsordrens dato eller nummer godtas i en annen underkategori (GR-U16, #698)',
    fil: `${K}/format/format.ts`,
    endringer: [
      [
        "        ...ikkeI(['endringsordre', ...OPPGITTE_DATOER.filter((d) => d !== dato)]),",
        '        ...ikkeI(OPPGITTE_DATOER.filter((d) => d !== dato)),',
      ],
    ],
    mal: ['avviser endringsordrens dato eller nummer i en annen underkategori'],
  },
  // Runde 13, S-2a.3a: varselet i fristkravet med vedlegg (OV-U5, #828) og datoen (#968).
  {
    id: 'F296',
    feilklasse: 'fristkravet registrerer varselet uten brevet med det (OV-U5, #828)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['        return k.varsel.dokumentasjon\n', '        return true\n']],
    mal: ['et fristkrav som registrerer varselet uten brevet med det, avvises'],
  },
  {
    id: 'F297',
    feilklasse: 'brevet med varselet bindes ikke til fristkravet (OV-U5, #828)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['      if (bundne.length) data.dokumentasjon = bundne;', '']],
    mal: ['fristkravet har datoen for varselet og brevet med det'],
  },
  {
    id: 'F298',
    feilklasse: 'datoen i registreringen av varselet kontrolleres ikke mot brevets dato (#968)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        "  if (k.type === 'varsel') return { dato: k.sendt, gjelder: varseletSendt(k.hjemmel) };",
        '',
      ],
    ],
    mal: ['en dato for varselet etter § 33.4 etter brevets dato avvises'],
  },
  {
    id: 'F299',
    feilklasse: 'datoen for varselet i fristkravet kontrolleres ikke mot brevets dato (#968)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        "    return k.varsel ? { dato: k.varsel.sendt, gjelder: varseletSendt('33.4') } : null;",
        '    return null;',
      ],
    ],
    mal: ['en dato for varselet etter § 33.4 etter brevets dato avvises'],
  },
  {
    id: 'F300',
    feilklasse: 'vedleggene i varselet i fristkravet slås ikke opp (OV-U5, LV-U14)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [["? { sti: '$.varsel.', ...k.varsel }", "? { sti: '$.varsel.' }"]],
    mal: [
      'fristkravet har datoen for varselet og brevet med det',
      'samme vedlegg to ganger i varselet',
    ],
  },
  {
    id: 'F301',
    feilklasse: 'protesten godtas i første versjon (OV-U7)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["    case 'avklare':\n    case 'protest':\n", "    case 'avklare':\n"]],
    mal: [
      'protest, påberopt passivitet og senere begrunnelse avvises fra begge parter, og ingen hendelse skrives',
    ],
  },
  {
    id: 'F302',
    feilklasse: 'påberopt passivitet godtas i første versjon (OV-U7)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["    case 'protest':\n    case 'passivitet':\n", "    case 'protest':\n"]],
    mal: [
      'protest, påberopt passivitet og senere begrunnelse avvises fra begge parter, og ingen hendelse skrives',
    ],
  },
  {
    id: 'F303',
    feilklasse: 'den senere begrunnelsen godtas i første versjon (OV-U7)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["    case 'passivitet':\n    case 'begrunne':\n", "    case 'passivitet':\n"]],
    mal: [
      'protest, påberopt passivitet og senere begrunnelse avvises fra begge parter, og ingen hendelse skrives',
    ],
  },
  {
    id: 'F304',
    feilklasse: 'en lest påberopt passivitet kan endre utfallet (VS-U12, OV-U7)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "['aksept', 'trekk', 'ingen_krav', 'varsel']",
        "['aksept', 'trekk', 'ingen_krav', 'varsel', 'passivitet']",
      ],
    ],
    mal: ['en lest påberopt passivitet etter at kravene er avgjort'],
  },
  {
    id: 'F305',
    feilklasse:
      'sperren for det som var avgjort, faller når et første krav i et annet spor gjør at kravene ikke lenger er avgjort (OV-U3, #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '): boolean => u.avgjorteSpor.includes(spor);',
        '): boolean => kraveneErAvgjort(u) && u.avgjorteSpor.includes(spor);',
      ],
    ],
    mal: [
      'det første kravet i sporet gjør at kravene ikke lenger er avgjort',
      'en rad som trekker et krav som var avgjort',
    ],
  },
  {
    id: 'F306',
    feilklasse: 'et spor uten krav hindrer at kravene er avgjort (OV-U3, #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['(n) => !sendt(n) || u.spor[n].trukket ||', '(n) => u.spor[n].trukket ||']],
    mal: ['et spor uten krav hindrer ikke', 'F-MM-K1'],
  },
  {
    id: 'F307',
    feilklasse: 'kravene er avgjort uten et sendt vederlags- eller fristkrav (OV-U3, #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['(KRAVSPOR.some(sendt) || ', '(true || ']],
    mal: ['uten et sendt vederlags- eller fristkrav er kravene ikke avgjort'],
  },
  {
    id: 'F308',
    feilklasse:
      'varselet og TEs opplysning om varseldato avvises når kravene er avgjort (OV-U3, OV-U5, #493)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["h.type !== 'varsle' && h.type !== 'sende_varsel' && varAvgjort", 'varAvgjort']],
    mal: ['TEs opplysning om varseldato godtas i et spor som var avgjort', 'F-MM-B1', 'F-MM-EO1'],
  },
  {
    id: 'F309',
    feilklasse:
      'et varsel etter at kravene er avgjort, gjør saken ikke forstått (OV-U3, OV-U5, MM-U18, #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "      x.art === 'varsel'\n        ? u.grunnlagAvvist",
        '      false\n        ? u.grunnlagAvvist',
      ],
    ],
    mal: ['TEs opplysning om varseldato godtas i et spor som var avgjort'],
  },
  {
    id: 'F310',
    feilklasse: 'visningen sier ikke at saken har brev sendt utenfor appen (OV-U10, #493)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        "kode === 'alle_krav_avgjort' && harIkkeVurdertBrev(u)",
        "kode === 'alle_krav_avgjort' && false",
      ],
    ],
    mal: ['med et registrert brev sier visningen også'],
  },
  {
    id: 'F311',
    feilklasse:
      'saken kan inngå i en endringsordre med et spor TE fortsatt kan sende (EO-U5, arbeidsvalget i #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['    KRAVSPOR.every((n) => u.spor[n].krav.length > 0 || u.spor[n].ingenKrav) &&\n', ''],
    ],
    mal: ['et spor uten krav hindrer ikke'],
  },
  {
    id: 'F312',
    feilklasse:
      'et krav venter på svar og et svar står som ikke godtatt etter at avslaget av grunnlaget er godtatt (SK-01, #1050, #1067)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['  u.grunnlagAvvist || varAvgjort(u, spor);', '  varAvgjort(u, spor);']],
    mal: [
      'SK-01: når TE godtar avslaget av grunnlaget, venter ubesvarte krav',
      'SK-01: når TE godtar avslaget av grunnlaget i forløp A',
    ],
  },
  {
    id: 'F340',
    feilklasse: '«Krav sendt» går foran «Enige» i rekkefølgen for betegnelsen (MM-U30, #1043)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        "  'enige',\n  'svar_ikke_godtatt',\n  'krav_sendt',\n",
        "  'krav_sendt',\n  'enige',\n  'svar_ikke_godtatt',\n",
      ],
    ],
    mal: ['en enighet i sporet går foran «Krav sendt»'],
  },
  {
    id: 'F341',
    feilklasse: 'en ubesvart forespørsel etter § 33.6.2 gir ikke betegnelsen (MM-U30, #1043)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['u.spor.frist.foresporsler.some((f) => f.svar === null)', 'false']],
    mal: ['en ubesvart forespørsel etter § 33.6.2 går foran varselet'],
  },
  {
    id: 'F342',
    feilklasse:
      'et trukket grunnlag gir «Trukket» i et spor der ingenting er sendt (GR-U25, #1137)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['u.spor[spor].trukket && sendt(u, spor)', 'u.spor[spor].trukket']],
    mal: ['et trukket grunnlag gir ingen betegnelse i et spor der ingenting er sendt'],
  },
  {
    id: 'F343',
    feilklasse:
      'en ubesvart forespørsel etter § 33.6.2 gir betegnelsen også når sporet er lukket (MM-U31, #1137)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        '    !sporetErLukket(u, spor) &&\n    u.spor.frist.foresporsler',
        '    u.spor.frist.foresporsler',
      ],
    ],
    mal: ['en ubesvart forespørsel etter § 33.6.2 gir ingen betegnelse etter at avslaget'],
  },
  {
    id: 'F344',
    feilklasse:
      'en ubesvart forespørsel etter § 33.6.2 gir betegnelsen etter at grunnlaget er trukket (MM-U31, #1137)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['    !u.spor.grunnlag.trukket &&\n', '']],
    mal: [
      'en ubesvart forespørsel etter § 33.6.2 gir ingen betegnelse etter at grunnlaget er trukket',
    ],
  },
  {
    id: 'F313',
    feilklasse: 'svarIkkeGodtatt leser ikke at sporet er lukket (SK-01, OV-U3, #1050)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ["    !sporetErLukket(u, spor) &&\n    !(spor === 'grunnlag'", "    !(spor === 'grunnlag'"],
    ],
    mal: ['SK-01: når TE godtar avslaget av grunnlaget i forløp A'],
  },
  {
    id: 'F314',
    feilklasse:
      'et frafall står som et svar TE ikke har godtatt (GR-U9, arbeidsvalget 20.10 i #1050)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["    !(spor === 'grunnlag' && u.frafalt)\n", '    true\n']],
    mal: ['GR-U9: et frafall står ikke som et svar TE ikke har godtatt'],
  },
  {
    id: 'F315',
    feilklasse:
      'tallet i svaret er ikke subsidiært når svaret på grunnlaget avviser ansvaret (MM-U9, MM-U28, #1050)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    s.subsidiaer.length > 0 ||\n    (s.gjeldendeSvar', '    (s.gjeldendeSvar']],
    mal: ['SK-01: når TE godtar avslaget av grunnlaget i forløp A'],
  },
  {
    id: 'F316',
    feilklasse:
      'frafallet skjuler et svar TE ikke har godtatt i vederlag og frist (arbeidsvalget 20.10 i #1050)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["    !(spor === 'grunnlag' && u.frafalt)\n", '    !u.frafalt\n']],
    mal: ['GR-U9: et frafall står ikke som et svar TE ikke har godtatt'],
  },
  {
    id: 'F317',
    feilklasse: 'forespørselen etter § 33.6.2 godtas etter et fristkrav (VS-U19)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [['      if (fristkravErFremmet(u))', '      if (false)']],
    mal: ['VS-U19: forespørselen avvises når TE har krevd dager'],
  },
  {
    id: 'F318',
    feilklasse:
      'at TE svarte for sent på forespørselen, prekluderer ikke kravet (§ 33.6.2 tredje ledd, VS-U17)',
    fil: `${K}/regler/frist.ts`,
    endringer: [
      [
        '    (krav.er_svar_paa_foresporsel || krav.har_begrunnelse_etter_b) &&\n    v.foresporsel_svar_ok === false',
        '    false',
      ],
    ],
    mal: ['VS-U17: «svaret kom for sent»', 'VS-U29: innsigelsen mot begrunnelsen'],
  },
  {
    id: 'F319',
    feilklasse:
      'det første fristkravet etter forespørselen leses ikke som svar på den (LV-U18 setning 3)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['    if (krav && !kravetErDokumentasjon(d))', '    if (false)']],
    mal: ['kravet som svarer på forespørselen, sier det'],
  },
  {
    id: 'F320',
    feilklasse:
      'innsigelsen mot begrunnelsen etter § 33.6.2 annet ledd b er ingen påberopelse (VS-U29)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        ": utsagn.art === 'foresporselssvar'\n          ? '33.6.2'",
        ": false\n          ? '33.6.2'",
      ],
    ],
    mal: ['VS-U29: innsigelsen mot begrunnelsen', 'HF-U4: etter «i tide» etter § 33.6.2'],
  },
  {
    id: 'F321',
    feilklasse: 'svaret kan påberope § 33.6.2 mot begrunnelsen uten en egen innsigelse (VS-U29)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["  if (f?.art !== 'begrunnelse') return f;", '  return f;']],
    mal: ['et krav etter begrunnelsen svarer ikke på forespørselen'],
  },
  {
    id: 'F322',
    feilklasse: '«ikke et svar etter annet ledd» leses som en påberopelse etter § 33.6.2 (VS-U29)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "x.art === 'innsigelse' && x.gjelder === f.gjelder && x.grunn === undefined",
        "x.art === 'innsigelse' && x.gjelder === f.gjelder",
      ],
    ],
    mal: ['«ikke et svar etter annet ledd» registreres uten virkning'],
  },
  {
    id: 'F323',
    feilklasse: 'to begrunnelser godtas mot samme forespørsel (KA-U1)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [['      if (f.svar !== null)', '      if (false)']],
    mal: ['KA-U1, VS-U27: én begrunnelse per forespørsel'],
  },
  {
    id: 'F324',
    feilklasse: 'et fristkrav i et registrert brev sperrer forespørselen (VS-U33)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "    if (!kravetErDokumentasjon(d) && d.krav.some((k) => k.spor === 'frist')) return true;",
        "    if (d.krav.some((k) => k.spor === 'frist')) return true;",
      ],
    ],
    mal: ['VS-U33: et fristkrav i et registrert brev stopper ikke forespørselen'],
  },
  {
    id: 'F357',
    feilklasse:
      'et fristkrav i et registrert brev gjør forespørselen ugyldig i utledningen (VS-U33)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "      if (k.spor === 'frist' && !kravetErDokumentasjon(d)) fristkravIAppen.push(k);",
        "      if (k.spor === 'frist') fristkravIAppen.push(k);",
      ],
    ],
    mal: ['VS-U33: et fristkrav i et registrert brev stopper ikke forespørselen'],
  },
  {
    id: 'F358',
    feilklasse: 'motparten kan rette en registrering (OV-U17)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['  if (brev.avsender !== part)', '  if (false)']],
    mal: ['OV-U17: bare samme side retter'],
  },
  {
    id: 'F359',
    feilklasse: 'en rettet registrering kan rettes igjen (#1045)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['  if (brev.rettetAv !== null)', '  if (false)']],
    mal: ['en rettet registrering rettes ikke igjen'],
  },
  {
    id: 'F360',
    feilklasse: 'en retting fra motparten forstås (OV-U17)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      if (!rettet || rettet.avsender !== d.avsender || rettet.rettetAv !== null) {',
        '      if (!rettet || rettet.rettetAv !== null) {',
      ],
    ],
    mal: ['en retting som er fra motparten'],
  },
  {
    id: 'F361',
    feilklasse: 'brev fra begge sider vises ved kravet (OV-U20)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [["b.avsender === 'BH' && b.rettetAv", 'true && b.rettetAv']],
    mal: ['OV-U20: ved hvert krav som venter, vises motpartens brev'],
  },
  {
    id: 'F362',
    feilklasse: 'et rettet brev vises fortsatt ved kravet (OV-U18, OV-U20)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [["b.avsender === 'BH' && b.rettetAv === null &&", "b.avsender === 'BH' &&"]],
    mal: ['OV-U18: brevet i feil sak rettes bort'],
  },
  {
    id: 'F363',
    feilklasse: 'en registrering rettet bort gir fortsatt merknaden for saken (OV-U19)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['erRegistrert(d.opplysninger) && !rettet.has(d.id)', 'erRegistrert(d.opplysninger)'],
    ],
    mal: ['OV-U18: brevet i feil sak rettes bort'],
  },
  {
    id: 'F364',
    feilklasse: 'merknaden for saken står også når kravene er avgjort (OV-U19, OV-U10)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        "  if (kode !== 'alle_krav_avgjort' && harIkkeVurdertBrev(u))",
        '  if (harIkkeVurdertBrev(u))',
      ],
    ],
    mal: ['OV-U19: når kravene er avgjort'],
  },
  {
    id: 'F365',
    feilklasse:
      'et varsel registrert med virkning gir merknaden og statusen for saken (OV-U19, HF-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    d.svar.length + d.utsagn.length > 0 &&', '    false &&']],
    mal: [
      'OV-U19: et varsel registrert med virkning teller ikke',
      'OV-U19: en endringsordre registrert med virkning teller ikke',
    ],
  },
  {
    id: 'F367',
    feilklasse:
      'et svar registrert som dokumentasjon regnes som et brev appen vurderer (OV-U4, OV-U19)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['d.svar.every((s) => erRegistrertEndringsordre(s, d))', 'true']],
    mal: ['OV-U19: en endringsordre registrert med virkning teller ikke'],
  },
  {
    id: 'F368',
    feilklasse:
      'en registrert begrunnelse regnes som et brev appen vurderer (OV-U19, OV-U4, KA-U35)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["d.utsagn.every((x) => x.art === 'varsel')", 'true']],
    mal: ['OV-U19, OV-U4: en registrert begrunnelse'],
  },
  {
    id: 'F369',
    feilklasse:
      'et varsel eller en endringsordre teller ikke mens saken ikke er forstått (OV-U21, MM-U2)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['.filter((d) => !forstaatt || !vurdert(d))', '.filter((d) => !vurdert(d))']],
    mal: ['OV-U21, MM-U2: mens saken ikke er forstått'],
  },
  {
    id: 'F370',
    feilklasse:
      'et varsel eller en endringsordre uten virkning teller som brev appen ikke vurderer (OV-U19, MM-U19)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        'u.ikkeVurderteBrev.length > 0;',
        'u.ikkeVurderteBrev.length > 0 || u.utenVirkning.length > 0;',
      ],
    ],
    mal: ['OV-U19, MM-U19: en endringsordre uten virkning'],
  },
  {
    id: 'F366',
    feilklasse: 'avvisningen etter en retting om feil sak ber om å rette rettingen (OV-U18)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ['      !u.registrerteBrev.some((b) => b.dokument === brev.rettetAv)', '      false'],
    ],
    mal: ['OV-U18: etter en retting om feil sak viser avvisningen'],
  },
  {
    id: 'F325',
    feilklasse: 'svaret kan tie om innsigelsen mot begrunnelsen (VS-U29, VS-U11)',
    fil: `${K}/regler/frist.ts`,
    endringer: [
      [
        'foresporsel_svar_ok: krav.er_svar_paa_foresporsel || krav.har_begrunnelse_etter_b === true,',
        'foresporsel_svar_ok: krav.er_svar_paa_foresporsel,',
      ],
    ],
    mal: ['VS-U29, VS-U11: etter en innsigelse mot begrunnelsen må svaret'],
  },
  {
    id: 'F327',
    feilklasse: 'beslutningslinjen viser bare den første preklusjonen i fristsvaret',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "rettidighet: `prekludert (${hjemler.join(' og ')})`",
        'rettidighet: `prekludert (${hjemler[0]})`',
      ],
    ],
    mal: ['beslutningslinjen nevner begge bestemmelsene'],
  },
  {
    id: 'F328',
    feilklasse: 'en ny forespørsel godtas etter TEs begrunnelse (VS-U30)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      ['      if (s.foresporsler.some((f) => f.svar !== null && !f.medKrav))', '      if (false)'],
    ],
    mal: ['VS-U30: etter TEs begrunnelse avvises en ny forespørsel'],
  },
  {
    id: 'F329',
    feilklasse:
      'protesten mot påberopelsen etter § 33.6.2 omtaler den som for sen varsling (LV-U20)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['erPaaberopelseEtter3362(id, e.svar)', 'false']],
    mal: ['LV-U20: protesten mot påberopelsen etter § 33.6.2'],
  },
  {
    id: 'F330',
    feilklasse: 'et brev med et tegn PDF-en ikke kan vise, godtas (#801)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['kommandoenHarTegnSomIkkeKanVises(kommando) ??', 'null ??']],
    mal: ['en emoji i utdypningen avvises med tegnet, kodepunktet og feltet'],
  },
  {
    id: 'F331',
    feilklasse: 'den låste teksten kontrolleres ikke for tegn PDF-en ikke kan vise (#801)',
    fil: `${K}/kommandoer/skriving.ts`,
    // Teksten kontrolleres som sikring for en kilde uten egen kontroll, her TEs beskrivelse (#1229).
    endringer: [
      ['funnet ?? tegnSomIkkeKanVises(a.laast,', 'funnet ?? void tegnSomIkkeKanVises(a.laast,'],
    ],
    mal: ['en beskrivelse med et slikt tegn fra før stopper godkjenningen som siterer den'],
  },
  {
    id: 'F403',
    feilklasse: 'et tegn i sakstittelen meldes som et tegn i den låste teksten (#1138)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [["tegnSomIkkeKanVises(sak.tittel, 'Sakstittelen')", 'null']],
    mal: [
      'en sakstittel med et slikt tegn fra før stopper brevet i den låste teksten, og meldingen nevner sakstittelen',
      'ved sending nevner meldingen sakstittelen',
    ],
  },
  {
    id: 'F404',
    feilklasse: 'et tegn i filnavnet til et vedlegg meldes som et tegn i den låste teksten (#1138)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['? tegnSomIkkeKanVises(v.filnavn,', '? void tegnSomIkkeKanVises(v.filnavn,']],
    mal: ['et filnavn med et slikt tegn fra før stopper brevet, og meldingen nevner vedlegget'],
  },
  {
    id: 'F405',
    feilklasse: 'en sakstittel som ikke står i teksten, stopper brevet (#801, #1138)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      ["sak?.art === 'sak' && teksten.includes(`(«${sak.tittel}»)`)", "sak?.art === 'sak'"],
    ],
    mal: [
      'en sakstittel med et slikt tegn stopper ikke et brev der sakstittelen ikke står i teksten',
    ],
  },
  {
    id: 'F332',
    feilklasse: 'opprettelsen godtar en sakstittel med et tegn PDF-en ikke kan vise (#801)',
    fil: `${K}/kommandoer/opprettelse.ts`,
    endringer: [['if (tegn) return ugyldig(tegn);', 'void tegn;']],
    mal: ['en sakstittel med et tegn PDF-en av brevet ikke kan vise, avvises'],
  },
  {
    id: 'F333',
    feilklasse: 'linjeskift og tab avvises som tegn PDF-en ikke kan vise (#801)',
    fil: `${K}/format/skjema.ts`,
    endringer: [['  if (SOM_MELLOMROM.test(tegn)) return true;\n', '']],
    mal: ['et usynlig tegn avvises, mens myk bindestrek, → og linjeskift godtas'],
  },
  {
    id: 'F345',
    feilklasse: 'en ny forespørsel godtas når saken alt har en fra appen (VS-U31)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [['      if (s.foresporsler.length)', '      if (false)']],
    mal: ['VS-U31: en ny forespørsel fra appen avvises'],
  },
  {
    id: 'F346',
    feilklasse: 'utledningen godtar en andre forespørsel i saken (VS-U31)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    else if (f !== foresporsler[0])', '    else if (false)']],
    mal: ['VS-U31: en lest rad med en andre forespørsel'],
  },
  {
    id: 'F347',
    feilklasse: '«i tide» etter § 33.6.2 gir ikke opp innsigelsen mot begrunnelsen (HF-U4)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "p.art === 'rettidighet' && p.hjemmel === hjemmel",
        "p.art === 'rettidighet' && p.hjemmel === hjemmel && p.hjemmel !== '33.6.2'",
      ],
    ],
    mal: ['HF-U4, VS-U29: etter «i tide» etter § 33.6.2 gir svaret på en senere kravversjon'],
  },
  {
    id: 'F348',
    feilklasse: 'svaret om § 33.6.2 omtaler ikke innsigelsen mot begrunnelsen (VS-U29)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'innsigelser.filter((i) => i.hjemmel === p.hjemmel)',
        "innsigelser.filter((i) => i.hjemmel === p.hjemmel && i.hjemmel !== '33.6.2')",
      ],
    ],
    mal: ['VS-U29: innsigelsen mot begrunnelsen er en påberopelse etter § 33.6.2'],
  },
  {
    id: 'F349',
    feilklasse: 'visningen sier at en virksom enighet er «oppgjort» (MM-U23, #1136)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        "    if (virkning === 'betinget') ut.push('enige_betinget');",
        "    if (virkning === 'betinget') ut.push('enige_betinget');\n    if (virkning === 'virksom') ut.push('oppgjort');",
      ],
    ],
    mal: ['en virksom enighet og et avklart grunnlag gir verken'],
  },
  {
    id: 'F350',
    feilklasse: 'visningen sier at grunnlaget er «avklart» (MM-U23, #1136)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        "    if (virkning && !s.trukket) ut.push('enige');",
        "    if (u.grunnlagAvklart) ut.push('avklart');\n    if (virkning && !s.trukket) ut.push('enige');",
      ],
    ],
    mal: ['en virksom enighet og et avklart grunnlag gir verken'],
  },
  {
    id: 'F351',
    feilklasse:
      'et trukket grunnlag gir etiketten «trukket» i et spor der ingenting er sendt (GR-U25, #1140)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        "  if (FORELIGGER.trukket(u, spor)) ut.push('trukket');",
        "  if (s.trukket) ut.push('trukket');",
      ],
    ],
    mal: ['et trukket grunnlag gir ikke etiketten «trukket» i et spor der ingenting er sendt'],
  },
  {
    id: 'F352',
    feilklasse: 'saken får en samlet status utenom de fire tilfellene i MM-U22 (#1136)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        '  const kode = sak && STATUS_FOR[sak];',
        "  const kode = sak ? STATUS_FOR[sak] : ('alle_krav_avgjort' as const);",
      ],
    ],
    mal: ['saken har ingen samlet status mens kravene venter på svar'],
  },
  {
    id: 'F353',
    feilklasse: 'registreringen av et brev avvises når saken ikke er forstått (OV-U4, #1045)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "  if (h.type === 'registrere_brev') return null;",
        "  if (h.type === 'registrere_brev' && u.forstaatt) return null;",
      ],
    ],
    mal: ['registreringen godtas når saken ikke er forstått'],
  },
  {
    id: 'F354',
    feilklasse:
      'leseren godtar et brev registrert som dokumentasjon med utsagn (OV-U4, OV-U16, #1045)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      [
        '  if (d.krav.length || d.svar.length || d.utsagn.length)',
        '  if (d.krav.length || d.svar.length)',
      ],
    ],
    mal: ['leseren forstår ikke et brev registrert som dokumentasjon med et utsagn'],
  },
  {
    id: 'F355',
    feilklasse:
      'et brev registrert som dokumentasjon kan ha en dato etter registreringsdagen (#1045)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['    return dag !== null && dag > brevetsDato', '    return dag === null']],
    mal: ['avviser en dato etter dagen brevet registreres'],
  },
  {
    id: 'F356',
    feilklasse:
      'sporene et brev registrert som dokumentasjon hører til, lagres ikke (OV-U16, #1045)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['        ...(k.spor ? { spor: k.spor } : {}),\n', '']],
    mal: ['lagres med beskrivelsen, sporene, datoen og vedlegget'],
  },
  {
    id: 'F371',
    feilklasse:
      'det første kjente varselet etter § 34.1.3 er det første vederlagskravet, også uten posten (OV-U24)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["hjemmel === '34.1.3' ? krav.filter(harProduktivitetspost) : krav", 'krav']],
    mal: [
      'uten registrert varsel er det første kjente varselet den første kravversjonen med posten',
    ],
  },
  {
    id: 'F372',
    feilklasse:
      'sporet har ett registrert varsel, så det særskilte varselet sperrer varselet etter § 34.1.2 (SK-12)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "s.varsler['hjemmel' in h ? h.hjemmel : VARSEL_I_SPORET[h.spor]]",
        'Object.keys(s.varsler).length',
      ],
    ],
    mal: ['saken har ett registrert varsel per hjemmel'],
  },
  {
    id: 'F373',
    feilklasse: 'det særskilte varselet etter § 34.1.3 avvises etter vederlagskravet (OV-U8)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["if ('hjemmel' in h)\n", "if ('hjemmel' in h && !s.krav.length)\n"]],
    mal: ['det særskilte varselet kan sendes etter vederlagskravet'],
  },
  {
    id: 'F374',
    feilklasse: 'vederlagskravet krever hovedbeløpet, også med posten etter § 34.1.3 (OV-U23)',
    fil: `${K}/format/format.ts`,
    endringer: [["    required: ['metode'],\n", "    required: ['metode', 'beloep'],\n"]],
    mal: ['vederlagskravet kan ha bare posten'],
  },
  {
    id: 'F375',
    feilklasse: 'kravet uten hovedbeløp og uten posten godtas (OV-U23)',
    fil: `${K}/format/format.ts`,
    endringer: [["    anyOf: [{ required: ['beloep'] }, { required: ['saerskilt'] }],\n", '']],
    mal: ['vederlagskravet kan ha bare posten'],
  },
  {
    id: 'F376',
    feilklasse: 'en grunn etter den andre åpner ikke et nytt lag, så dagene står i lag 2 (OV-U32)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['      if (!s.oppfylt) lag++;', '      if (!s.oppfylt) lag = 2;']],
    mal: ['§ 33.4 for sent, ingen hindring og dagene står i lag 1, 2 og 3'],
  },
  {
    id: 'F377',
    feilklasse: 'et standpunkt i lag 3 regnes ikke som subsidiært (OV-U32, MM-U28)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["typeof v.virkning === 'number' && v.virkning > 1", 'v.virkning === 2']],
    mal: ['§ 33.4 for sent, ingen hindring og dagene står i lag 1, 2 og 3'],
  },
  {
    id: 'F378',
    feilklasse: 'meldingen om en senket revisjon sier ikke etiketten fra lag 3 (OV-U32)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [['lag !== null && lag + forskyvning > 1', 'lag === 2']],
    mal: ['meldingen om en senket revisjon sier etiketten for laget dagene sto i'],
  },
  {
    id: 'F379',
    feilklasse: 'formatet tar ikke upåvirket som egen virkning (OV-U32, HF-U2)',
    fil: `${K}/format/format.ts`,
    endringer: [['    upaavirket: liste(ID),\n', '']],
    mal: ['formatet lagrer laget som et heltall fra 1'],
  },
  {
    id: 'F380',
    feilklasse: 'formatet tar lag 0 (OV-U32)',
    fil: `${K}/format/format.ts`,
    endringer: [["lag: { type: 'integer', minimum: 1 }", "lag: { type: 'integer' }"]],
    mal: ['formatet lagrer laget som et heltall fra 1'],
  },
  {
    id: 'F381',
    feilklasse:
      'et grunnlag som er både prekludert og avslått, flytter lagene i sporet bare ett lag (OV-U32, A2)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '  const forskyvning = grunnlaget.length;',
        '  const forskyvning = grunnlaget.length ? 1 : 0;',
      ],
    ],
    mal: ['grunnlaget prekludert og avslått subsidiært i samme brev'],
  },
  {
    id: 'F382',
    feilklasse: 'linjen etiketterer uten forskyvningen fra grunnlaget (OV-U32, OV-U33, #1199)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        'linje: beslutningslinje(svar, v, grunnlagskrav, forskyvning),',
        'linje: beslutningslinje(svar, v, grunnlagskrav, 0),',
      ],
    ],
    mal: [
      'avslått grunnlag gir beløpet etiketten for andre lag, som brevet',
      'prinsipalt § 32.2 og subsidiært avslag gir beløpet etiketten for tredje lag',
      'lagene i fristsporet flyttes ned hver for seg',
      'en revisjon har sitt eget beslutningsgrunnlag og viser til svaret den erstatter',
    ],
  },
  {
    id: 'F383',
    feilklasse: 'linjen ser bort fra gjeldende grunnlagssvar før brevet (OV-U32, #1199)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['lagFraGrunnlaget(gjeldende, gjeldende.beslutningsgrunnlag.virkninger)', '0']],
    mal: [
      'en revisjon har sitt eget beslutningsgrunnlag og viser til svaret den erstatter',
      'registrert korrespondanse fryses med forskyvningen fra gjeldende grunnlagssvar',
    ],
  },
  {
    id: 'F384',
    feilklasse: 'et frafall av pålegget flytter lagene som et avslag (GR-U7, OV-U33)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "if (standpunktet(svar, 'grunnlag')?.resultat === 'avslaatt') ut.push('avslaatt');",
        "if (standpunktet(svar, 'grunnlag')?.resultat !== 'godkjent') ut.push('avslaatt');",
      ],
    ],
    mal: ['et frafall av pålegget flytter ikke lagene'],
  },
  {
    id: 'F385',
    feilklasse: 'meldingen om en senket revisjon etiketterer uten forskyvningen (#1199)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ['binding(forrige, nye, forskyvningIBrevet(forrige, u))', 'binding(forrige, nye, 0)'],
    ],
    mal: ['meldingen sier etiketten brevet ga beløpet når grunnlaget er avslått'],
  },
  {
    id: 'F386',
    feilklasse: 'visningen regner upåvirket som en annen virkning enn første lag (OV-U33, #1047)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [["p.virkning === 'upaavirket' ? 1 : p.virkning", 'p.virkning']],
    mal: ['upåvirket er samme virkning som første lag'],
  },
  {
    id: 'F387',
    feilklasse: 'en upåvirket spesifisering hindrer sammenfall (OV-U32, #479)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        'p.standpunkt === spesifisering.id && laget(p.virkning)',
        "p.standpunkt === spesifisering.id && p.virkning !== 'uten_virkning'",
      ],
    ],
    mal: ['en upåvirket spesifisering hindrer ikke sammenfall'],
  },
  {
    id: 'F388',
    feilklasse: 'leseren godtar upåvirket i svaret på grunnlaget (OV-U32)',
    fil: `${K}/format/leser.ts`,
    endringer: [["    (spor === 'grunnlag' ||", '    (false ||']],
    mal: ['upåvirket i svaret på grunnlaget er ikke forstått'],
  },
  {
    id: 'F389',
    feilklasse: 'leseren godtar upåvirket uten en påberopelse i sporet (OV-U33)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      [
        "!virkninger.some((p) => PAABEROPELSER.has(p.art) && typeof p.virkning === 'number')",
        'false',
      ],
    ],
    mal: ['upåvirket uten en påberopelse i sporet er ikke forstått'],
  },
  {
    id: 'F390',
    feilklasse:
      'meldingen om en senket revisjon regner etiketten fra grunnlagssvaret nå, ikke det brevet ble skrevet mot (MM-U11, #1199)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        'binding(forrige, nye, forskyvningIBrevet(forrige, u))',
        'binding(forrige, nye, u.spor[forrige.spor].subsidiaer.length)',
      ],
    ],
    mal: [
      'meldingen sier etiketten brevet ga, også når grunnlaget er godkjent etter brevet',
      'meldingen sier etiketten brevet ga, også når en ny grunnlagsversjon er avslått uten § 32.2 etter brevet',
    ],
  },
  {
    id: 'F391',
    feilklasse: 'en begrensning etter § 34.1.3 i første lag avviser hele vederlagskravet (VS-U5)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "s?.art === 'hindring' || (s?.art === 'rettidighet' && s.hjemmel !== '34.1.3')",
        "s?.art === 'hindring' || s?.art === 'rettidighet'",
      ],
    ],
    mal: ['en aksept av svaret gir prinsipalt beløp etter begrensningen, ikke 0'],
  },
  {
    id: 'F392',
    feilklasse: 'justeringen ellers er upåvirket også når grunnlaget er avslått (OV-U33)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['posten && !hele && forskyvning === 0', 'posten && !hele']],
    mal: ['med avslått grunnlag er justeringen ellers i sporets første lag og ikke upåvirket'],
  },
  {
    id: 'F393',
    feilklasse: 'preklusjonen etter § 34.1.2 rammer ikke posten etter § 34.1.3 annet ledd (OV-U27)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['p.hovedkrav ? NULL_OERE : (begrenset ?? godkjent)', '(begrenset ?? godkjent)']],
    mal: ['preklusjonen etter § 34.1.2 gjelder hele kravet, også posten'],
  },
  {
    id: 'F394',
    feilklasse:
      'beløpet etter begrensningen kan være høyere enn det byggherren godtar for posten (valg 2 i #1047)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['else if (b > godkjent)', 'else if (b > beloep(krav.produktivitet_belop)!)']],
    mal: ['beløpet etter begrensningen er høyere enn det byggherren godtar for posten'],
  },
  {
    id: 'F395',
    feilklasse:
      'en begrensning etter § 34.1.3 krever ingen begrunnelse når beløpene er like (KA-U24, valg d)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        'if (v.produktivitet_varslet_i_tide === false)',
        'if (v.produktivitet_varslet_i_tide === null)',
      ],
    ],
    mal: ['en begrensning krever begrunnelse, også når beløpet etter den er likt'],
  },
  {
    id: 'F396',
    feilklasse: 'en revisjon kan senke beløpet etter begrensningen etter § 34.1.3 (HF-U5, valg 4)',
    fil: `${K}/utledning/innroemmelse.ts`,
    endringer: [['beloep(n.begrenset)! < beloep(f.begrenset)!', 'beloep(n.begrenset)! < 0n']],
    mal: ['en revisjon som senker posten eller beløpet etter begrensningen, avvises'],
  },
  {
    id: 'F397',
    feilklasse:
      'leseren godtar poster som ikke summerer til det subsidiære beløpet (OV-U31, MM-U2)',
    fil: `${K}/format/leser.ts`,
    endringer: [['if (samlet !== beloep(total))', 'if (samlet < 0n)']],
    mal: ['poster som ikke summerer til det subsidiære beløpet, er ikke forstått'],
  },
  {
    id: 'F398',
    feilklasse: 'svaret gjentar ikke byggherrens innsigelse mot det særskilte varselet (VS-U24)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [["(svar.spor === 'vederlag' && hjemmel === '34.1.3')", 'false']],
    mal: ['svaret gjentar byggherrens egen innsigelse mot det særskilte varselet'],
  },
  {
    id: 'F399',
    feilklasse: 'en begrensning etter § 34.1.3 i et lag gir sammenfall (VS-U5, #479)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['if (begrensningen(svar, v)) return false;', '']],
    mal: ['en begrensning i et lag gir ikke sammenfall'],
  },
  {
    id: 'F400',
    feilklasse: 'linjen gjentar etiketten for hvert standpunkt i samme lag (OV-U32)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        'if (!ordnet || lag === null || merket.has(lag)) return l.tekst;',
        'if (!ordnet || lag === null) return l.tekst;',
      ],
    ],
    mal: [
      'begge påberopt: § 34.1.2 prinsipalt',
      'med avslått grunnlag er justeringen ellers i sporets første lag',
    ],
  },
  {
    id: 'F401',
    feilklasse: 'linjen setter etikett når svaret har ett lag og ingen påberopelse (OV-U33)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      ['const ordnet = ledd.some((l) => (plass(l) ?? 0) > 1);', 'const ordnet = ledd.length > 1;'],
    ],
    mal: ['uten påberopelse har svaret ett lag, og linjen har ingen etikett for postene'],
  },
  {
    id: 'F402',
    feilklasse:
      'leseren godtar et beløp etter begrensningen over det byggherren godtar for posten (valg 2 i #1047, MM-U2)',
    fil: `${K}/format/leser.ts`,
    endringer: [['beloep(begrenset.begrenset)! > beloep(post.godkjent)!', 'false']],
    mal: ['et beløp etter begrensningen over det byggherren godtar for posten, er ikke forstått'],
  },
  // GR-U26, LV-U31 og OV-U33: forbeholdet for ubesvart grunnlag, oppgjør som fast sum og
  // metoden i laget til beløpet (#1239, #1240).
  {
    id: 'F406',
    feilklasse:
      'svaret på vederlag eller frist uten svar på grunnlaget har ikke forbeholdet (GR-U26)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['    ...forbeholdForGrunnlaget(s, t),\n', '']],
    mal: [
      'det første svaret på vederlaget har forbeholdet',
      'forløpet i #1239',
      'forbeholdet i hvert svaravsnitt',
    ],
  },
  {
    id: 'F407',
    feilklasse: 'forbeholdet skrives når grunnlaget er avklart ved frafall (GR-U23, GR-U26)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['avklartVedFrafall: u.frafalt,', 'avklartVedFrafall: false,']],
    mal: ['etter et frafall er grunnlaget avklart mens en ny versjon venter'],
  },
  {
    id: 'F408',
    feilklasse: 'forbeholdet skrives når grunnlaget besvares i samme brev (GR-U26)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [["  if (nytt.svar.some((x) => x.spor === 'grunnlag')) return [];\n", '']],
    mal: ['kontrollsak: med grunnlaget godkjent i samme brev har svaret ikke forbeholdet'],
  },
  {
    id: 'F409',
    feilklasse: 'brevet betegner oppgjør som fast sum som aksept av tilbudet (LV-U31)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        "'byggherren godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret.'",
        "'byggherren aksepterer beregningsmåten i TEs tilbud (NS 8407 § 34.2.2).'",
      ],
    ],
    mal: ['LV-U31 med lavere beløp', 'LV-U32 med hele beløpet'],
  },
  {
    id: 'F410',
    feilklasse: 'metoden får ikke etiketten for laget sitt (OV-U33)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'plass: lag !== null ? lag + forskyvning : null,',
        "plass: lag !== null && p.art !== 'metode' ? lag + forskyvning : null,",
      ],
    ],
    mal: [
      '§ 34.1.2 «nei»: byggherren påberoper prinsipalt at varselet kom for sent',
      'avslått grunnlag gir beløpet etiketten for andre lag, som brevet',
    ],
  },
  {
    id: 'F411',
    feilklasse: 'en revisjon mens grunnlaget ikke er besvart, mister forbeholdet (GR-U26, GR-08)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        "  if (nytt.svar.some((x) => x.spor === 'grunnlag')) return [];\n",
        "  if (nytt.svar.some((x) => x.spor === 'grunnlag')) return [];\n  if (s.erstatter) return [];\n",
      ],
    ],
    mal: ['GR-08: en revisjon av vederlagssvaret mens en ny grunnlagsversjon venter'],
  },
  {
    id: 'F412',
    feilklasse:
      'en påberopelse etter § 34.1.3 uten virkning begrenser posten i postlisten (presiseringen 24.10 i #1047, VS-U5)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        '  const begrenset = begrensningen(svar, v);\n  const poster = svar.standpunkter',
        "  const begrenset = svar.standpunkter.find(\n    (x): x is Extract<Standpunkt, { art: 'rettidighet' }> =>\n      x.art === 'rettidighet' && x.begrenset !== undefined\n  );\n  const poster = svar.standpunkter",
      ],
    ],
    mal: ['en påberopelse uten virkning står som byggherrens utsagn uten lag'],
  },
  {
    id: 'F413',
    feilklasse: 'postlisten mister lagene svaret på grunnlaget opptar foran sporet (OV-U32)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        '    const lag = virkning === undefined ? null : laget(virkning);\n    return lag === null ? null : lag + forskyvning;',
        '    const lag = virkning === undefined ? null : laget(virkning);\n    return lag;',
      ],
    ],
    mal: ['lagene fra svaret på grunnlaget står foran postene'],
  },
  {
    id: 'F414',
    feilklasse: 'lagene i svarbrevet står i ett avsnitt (#1267 punkt 4)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        "    .map((a) => a.join(' '))\n    .join('\\n\\n');",
        "    .map((a) => a.join(' '))\n    .join(' ');",
      ],
    ],
    mal: [
      '§ 34.1.2 «nei»: byggherren påberoper prinsipalt at varselet kom for sent',
      'bare § 34.1.3 påberopt: justeringen ellers er upåvirket',
    ],
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

/** En kopi av arbeidstreet. */
interface Arbeidskopi {
  rot: string;
}

const ROT = process.cwd();
/**
 * Den nærmeste `node_modules` oppover fra roten som har Vitest, som Node søker i. I et
 * arbeidstre er den i hovedcheckouten (#1114, #1160).
 */
const PAKKEMAPPE = createRequire(join(ROT, 'package.json'))
  .resolve.paths('vitest')!
  .find((mappe) => existsSync(join(mappe, 'vitest')));
const TESTBASE = process.env.KOE_SQLSERVER_TILKOBLING;

/** En test i samlingen, med fila relativt til roten. */
interface Test {
  navn: string;
  fil: string;
}

/** Hver test i samlingen, med navnet i formen `vitest list` gir. */
function testnavn(): Test[] {
  const mappe = mkdtempSync(join(tmpdir(), 'feilinnfoering-navn-'));
  try {
    const ut = join(mappe, 'navn.json');
    const r = spawnSync(
      'npx',
      [
        'vitest',
        'list',
        'kjerne/',
        'sprakprove/kjernelagring/',
        // vitest 5 leser filene statisk og ser ikke testene hjelpefunksjonene registrerer.
        '--staticParse=false',
        `--json=${ut}`,
      ],
      {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        timeout: 300_000,
        env: { ...process.env, KOE_SQLSERVER_TILKOBLING: 'Server=feilinnfoering.invalid' },
      }
    );
    if (r.status !== 0 || !existsSync(ut))
      throw new Error(
        `vitest list feilet (status ${r.status}, signal ${r.signal}, ${r.error ?? 'ingen feil fra spawn'}):\n${r.stderr}\n${r.stdout}`
      );
    return (JSON.parse(readFileSync(ut, 'utf8')) as { name: string; file: string }[]).map((t) => ({
      navn: t.name,
      fil: relative(ROT, t.file),
    }));
  } finally {
    rmSync(mappe, { recursive: true, force: true });
  }
}

/** `vitest list` skiller nivåene med ` > `, rapporten med mellomrom. */
const harMal = (navn: string, mal: string) =>
  treffer(navn, mal) || treffer(navn.split(' > ').join(' '), mal);

/** Vitest avsluttet uten å skrive rapporten. */
class IngenRapport extends Error {}

/** Slutten av stderr fra Vitest som tas med i feilen. */
const STDERR_SLUTT = 4000;

/**
 * Kjører `filer`, eller hele samlingen, i `k`. Skriver Vitest ingen rapport, kjøres den én
 * gang til før feilen går videre (#1156).
 */
async function kjoerVitest(
  k: Arbeidskopi,
  filer = ['kjerne/', 'sprakprove/kjernelagring/']
): Promise<Rapport> {
  try {
    return await kjoerVitestEnGang(k, filer);
  } catch (e) {
    if (!(e instanceof IngenRapport)) throw e;
    console.error(`${e.message}\nKjøres én gang til.`);
    return kjoerVitestEnGang(k, filer);
  }
}

function kjoerVitestEnGang(k: Arbeidskopi, filer: string[]): Promise<Rapport> {
  const ut = `${k.rot}-rapport.json`;
  rmSync(ut, { force: true });
  // Vitest 3.2 gir ikke `--hookTimeout` videre til prosjektene, så grensen går gjennom
  // `vite.config.ts`. `vi.setConfig` i lagringstestene virker bare for den første filen i
  // en arbeider uten isolasjon, så grensen er den samme som `GRENSER` der.
  const env = { ...process.env, KOE_HOOKGRENSE: '240000' };
  let stderr = '';
  return new Promise((ok, feil) => {
    const vitest = spawn(
      'npx',
      [
        'vitest',
        'run',
        ...filer,
        '--no-cache',
        // Filene deler modulene i en arbeider. Kontrollkjøringen viser at hele samlingen er
        // grønn slik; et utvalg grupperer filene annerledes (#934).
        '--no-isolate',
        // Kopiene deler prosessorene. Et tidsavbrudd er ikke en assertion og gir en ny
        // kjøring (#1015), så grensen heves over den i `vite.config.ts`.
        '--testTimeout=60000',
        // Prosessorene deles mellom kopiene, ikke ganges med dem.
        `--maxWorkers=${arbeiderePerKopi}`,
        '--reporter=json',
        `--outputFile=${ut}`,
      ],
      // Egen prosessgruppe, så et avbrudd kan stoppe Vitest og arbeiderne den har startet.
      { cwd: k.rot, env, stdio: ['ignore', 'ignore', 'pipe'], detached: true }
    );
    vitest.stderr!.setEncoding('utf8').on('data', (d: string) => {
      stderr = (stderr + d).slice(-STDERR_SLUTT);
    });
    vitest
      .on('spawn', function (this: ChildProcess) {
        grupper.add(this.pid!);
      })
      .on('error', feil)
      .on('close', function (this: ChildProcess, kode: number | null, signal: string | null) {
        grupper.delete(this.pid!);
        try {
          ok(JSON.parse(readFileSync(ut, 'utf8')) as Rapport);
        } catch (e) {
          // Arbeidere som overlevde Vitest, ville ellers delt base med det nye forsøket.
          try {
            process.kill(-this.pid!, 'SIGKILL');
          } catch {
            // Gruppen er alt borte.
          }
          feil(
            new IngenRapport(
              `Vitest skrev ingen rapport i ${k.rot} (exitkode ${kode}, signal ${signal}). Slutten av stderr:\n${stderr || '(tom)'}`,
              { cause: e }
            )
          );
        }
      });
  });
}

let tempmappe: string | undefined;

const grupper = new Set<number>();

function rydd() {
  for (const g of grupper)
    try {
      process.kill(-g, 'SIGKILL');
    } catch {
      // Gruppen er alt borte.
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
 * ikke ignorerer, og deler `node_modules` som pakkene lastes fra.
 */
function lagArbeidskopier(antall: number): Arbeidskopi[] {
  if (!PAKKEMAPPE) throw new Error(`Fant ingen node_modules med Vitest oppover fra ${ROT}`);
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
    symlinkSync(PAKKEMAPPE, join(rot, 'node_modules'));
    return { rot };
  });
}

/** Meldingen Vitest gir når en test eller en hook går over grensen sin. */
const TIDSAVBRUDD = /\b(Test|Hook) timed out in \d+ms/;

/**
 * Utfallet av én mutasjon. `tidsavbrudd` er satt når den ikke ble oppdaget og en test eller
 * en hook gikk over grensen: da er utfallet uavgjort, ikke en overlevende mutasjon (#1122).
 */
interface Utfall {
  oppdaget: boolean;
  tidsavbrudd: boolean;
  linjer: string[];
}

function vurder(m: Mutasjon, rapport: Rapport, k: Arbeidskopi): Utfall {
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
  const tidsavbrudd =
    !oppdaget &&
    [...ikkeAssertion.flatMap((t) => t.failureMessages), ...suitefeil.map((f) => f.message)].some(
      (melding) => TIDSAVBRUDD.test(melding)
    );
  return {
    oppdaget,
    tidsavbrudd,
    linjer: [
      `\n${m.id} ${m.feilklasse}: ${oppdaget ? 'oppdaget' : tidsavbrudd ? 'IKKE AVGJORT (tidsavbrudd)' : 'IKKE OPPDAGET'}`,
      ...m.endringer.map(([fra, til]) => `  ${m.fil}: ${fra.trim()} → ${til.trim()}`),
      ...feilet.map((t) => `  feilet: ${t.fullName}\n    ${t.failureMessages[0]?.split('\n')[0]}`),
      ...suitefeil.map(
        (f) => `  suitefeil: ${relative(k.rot, f.name)}: ${f.message.split('\n')[0]}`
      ),
      ...ikkeAssertion.map(
        (t) =>
          `  ${TIDSAVBRUDD.test(t.failureMessages.join('\n')) ? 'tidsavbrudd' : 'ikke en assertion'}: ${t.fullName}`
      ),
      ...manglerMal.map((mal) => `  målet feilet ikke: ${mal}`),
    ],
  };
}

/** Kjører `m` i `k` og fjerner mutasjonen igjen. */
async function kjoerMutasjon(m: Mutasjon, k: Arbeidskopi): Promise<Utfall> {
  const fil = join(k.rot, m.fil);
  const original = readFileSync(fil, 'utf8');
  try {
    writeFileSync(
      fil,
      m.endringer.reduce((t, [fra, til]) => t.replace(fra, til), original)
    );
    return vurder(m, await kjoerVitest(k, filerFor(m)), k);
  } finally {
    writeFileSync(fil, original);
  }
}

/**
 * Kjører mutasjonene i `koe` etter hverandre i `k`, til køen er tom. Feiler én, tømmes køen.
 * Et tidsavbrudd gir én kjøring til, og den andre kjøringen avgjør utfallet (#1015).
 */
async function arbeider(
  k: Arbeidskopi,
  koe: Mutasjon[],
  utfall: Map<string, Utfall>,
  antall: number
) {
  for (let m = koe.shift(); m; m = koe.shift()) {
    let u: Utfall;
    try {
      u = await kjoerMutasjon(m, k);
      if (u.tidsavbrudd) {
        console.error(`${m.id} fikk tidsavbrudd og kjøres én gang til`);
        const andre = await kjoerMutasjon(m, k);
        u = { ...andre, linjer: [...andre.linjer, '  første kjøring fikk tidsavbrudd'] };
      }
    } catch (e) {
      koe.length = 0;
      throw e;
    }
    utfall.set(m.id, u);
    console.error(`${m.id} kjørt (${utfall.size}/${antall})`);
  }
}

const argumenter = process.argv.slice(2);
const bareAnkre = argumenter.includes('--ankre');
const valgt = argumenter.filter((a) => a !== '--ankre');
const ukjente = valgt.filter((id) => !MUTASJONER.some((m) => m.id === id));
if (ukjente.length) throw new Error(`Ukjente feilinnføringer: ${ukjente.join(', ')}`);
// #870: resultatene nøkles på ID-en, så to like ID-er ville skjult det ene resultatet.
const doble = MUTASJONER.map((m) => m.id).filter((id, i, alle) => alle.indexOf(id) !== i);
if (doble.length) throw new Error(`Feilinnføringene har samme ID: ${doble.join(', ')}`);
const valgte = MUTASJONER.filter((m) => !valgt.length || valgt.includes(m.id));
// Endringene i én feilinnføring gjøres etter hverandre, så hvert anker slås opp i teksten
// slik den er etter de foregående.
const ankerfeil = new Map(
  valgte.flatMap((m) => {
    let tekst = readFileSync(m.fil, 'utf8');
    const feil = m.endringer.flatMap(([fra, til]) => {
      if (tekst.split(fra).length !== 2)
        return [`${m.id}: «${fra}» finnes ikke nøyaktig én gang i ${m.fil}`];
      tekst = tekst.replace(fra, til);
      return [];
    });
    return feil.length ? [[m.id, feil] as const] : [];
  })
);
const delform = /^(\d+)\/(\d+)$/.exec(process.env.FEILINNFOERING_DEL ?? '1/1');
const [del, deler] = [Number(delform?.[1]), Number(delform?.[2])];
if (!delform || del < 1 || del > deler)
  throw new Error(`FEILINNFOERING_DEL må ha formen i/n, ikke «${process.env.FEILINNFOERING_DEL}»`);
// #432: målene er deler av testnavnene, lest med `vitest list` uten å kjøre testene. Med en
// adresse til testbasen hopper ikke lagringstestene over seg selv; de kobler seg til i
// hookene, som ikke kjøres.
const navn = testnavn();
const malfeil = valgte.flatMap((m) => [
  // Uten mål ville ingen feilende test kreves, og utvalget ville vært hele repoet.
  ...(m.mal.length ? [] : [`${m.id}: mutasjonen har ingen mål`]),
  ...m.mal
    .filter((mal) => !navn.some((n) => harMal(n.navn, mal)))
    .map(
      (mal) =>
        `${m.id}: målet «${mal}» er ikke en del av navnet på noen test (et mål treffer ikke midt i et ord eller en ID)`
    ),
]);
if (malfeil.length) throw new Error(malfeil.join('\n'));
const delen = valgte.filter((_, i) => i % deler === del - 1);
// #967 punkt 1: en feilinnføring med ankerfeil hoppes over og meldes på slutten, så de andre
// kjøres. Kjøringen er rød likevel.
const mutasjoner = delen.filter((m) => !ankerfeil.has(m.id));
const ankerfeilIDelen = delen.flatMap((m) => ankerfeil.get(m.id) ?? []);
// Avgjort av oppdragsgiver 19.10 (#934): på en PR kjører hver mutasjon bare filene med
// målene sine, og om natta hele samlingen. Kontrollkjøringen går alltid over hele.
const utvalg = process.env.FEILINNFOERING_UTVALG === '1';
const filerFor = (m: Mutasjon) =>
  utvalg
    ? [...new Set(navn.filter((n) => m.mal.some((mal) => harMal(n.navn, mal))).map((n) => n.fil))]
    : undefined;

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

if (bareAnkre) {
  if (ankerfeil.size) {
    console.log([...ankerfeil.values()].flat().join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      `Ankrene i ${valgte.length} feilinnføringer finnes nøyaktig én gang, og målene er deler av navnene på ${navn.length} tester.`
    );
} else
  try {
    // Ikke `process.exit`: den venter ikke på at stdout er tømt når den går i et rør,
    // og i CI ble slutten av utfallene borte.
    process.exitCode = await kjoer();
  } finally {
    rydd();
  }

async function kjoer(): Promise<number> {
  const kopier = lagArbeidskopier(antallKopier);
  // Kontrollen kjøres i hver kopi, så en kopi som avviker, stopper
  // kjøringen før noen mutasjon.
  const kontroller = await Promise.all(kopier.map((k) => kontrollkjoering(k)));
  const antallTester = new Set<number>();
  for (const [i, kontroll] of kontroller.entries()) {
    const kontrolltester = kontroll.testResults.flatMap((f) => f.assertionResults);
    const feil = kontrollfeil(kontroll, kopier[i]);
    if (feil.length) throw new Error(`Kontrollkjøringen er ikke grønn: ${feil.join('; ')}`);
    // #353: en hoppet test er ikke grønn. Uten testbasen hoppes lagringstestene over, og en
    // mutasjon med mål der ville ellers ikke kunne oppdages.
    const hoppet = kontrolltester.filter((t) => t.status !== 'passed');
    if (hoppet.length) {
      console.error(
        `Kontrollkjøringen hoppet over ${hoppet.length} tester${TESTBASE ? '' : ' (KOE_SQLSERVER_TILKOBLING er ikke satt)'}, for eksempel ${hoppet[0].fullName}. Feilinnføringene krever at alle kjører.`
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
  const utfall = new Map<string, Utfall>();
  const arbeidere = await Promise.allSettled(
    kopier.map((k) => arbeider(k, koe, utfall, mutasjoner.length))
  );
  for (const a of arbeidere) if (a.status === 'rejected') throw a.reason;

  const ikkeOppdaget = mutasjoner.filter((m) => !utfall.get(m.id)!.oppdaget);
  const uavgjort = ikkeOppdaget.filter((m) => utfall.get(m.id)!.tidsavbrudd);
  for (const m of mutasjoner) console.log(utfall.get(m.id)!.linjer.join('\n'));
  if (ankerfeilIDelen.length)
    console.log(`\nHoppet over fordi ankeret ikke finnes:\n${ankerfeilIDelen.join('\n')}`);
  console.log(
    ikkeOppdaget.length
      ? `\nIkke alle mutasjonene ble oppdaget: ${ikkeOppdaget.length - uavgjort.length} overlevde, ${uavgjort.length} fikk tidsavbrudd to ganger.`
      : `\nAlle mutasjonene${ankerfeilIDelen.length ? ' som ble kjørt,' : ''} ble oppdaget.`
  );
  return ikkeOppdaget.length || ankerfeilIDelen.length ? 1 : 0;
}

/** Hver test eller fil som feilet, med den første linjen i feilen. */
function kontrollfeil(kontroll: Rapport, k: Arbeidskopi): string[] {
  return kontroll.testResults.flatMap((f) => {
    const feilet = f.assertionResults.filter((t) => t.status === 'failed');
    if (feilet.length)
      return feilet.map((t) => `${t.fullName}: ${t.failureMessages[0]?.split('\n')[0]}`);
    return f.status === 'failed' ? [`${relative(k.rot, f.name)}: ${f.message.split('\n')[0]}`] : [];
  });
}

/**
 * Kontrollkjøringen i `k`. Feiler den bare på tidsavbrudd, kjøres den én gang til, og den
 * andre kjøringen gjelder (#1122, E2-2 i del 4).
 */
async function kontrollkjoering(k: Arbeidskopi): Promise<Rapport> {
  const forste = await kjoerVitest(k);
  const feil = kontrollfeil(forste, k);
  if (!feil.length || !feil.every((f) => TIDSAVBRUDD.test(f))) return forste;
  console.error(
    `Kontrollkjøringen i ${k.rot} fikk tidsavbrudd og kjøres én gang til: ${feil.join('; ')}`
  );
  return kjoerVitest(k);
}
