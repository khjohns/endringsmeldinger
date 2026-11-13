/**
 * Feilinnføringene for kjernen (#304, #308, #273). F1–F7 er avsnitt 4 i
 * modellforslaget, F8–F10 feilklassene reviewet av PR #306 fant, skrevet om etter
 * MM-U9 og GR-U10, F11–F26 grensene #308 la til, og F27–F47 formatet (#273): 7.2
 * i designnotatet, GR-U12 og registeret (#320). F48 er hvitelisten fra #329,
 * F49–F51 og F54–F58 versjoneringen (#316), F52–F53 registrert korrespondanse
 * (#336), F59–F60 kodene i formatet og predikatet for endringsordre
 * (#335, #351), F61–F104 byggedel 1 av #309, F105–F131 brevteksten (#369),
 * F132–F134 LV-U5 (#414), F135–F148 MM-U20 (opphevet av MM-U43) (#405) og VS-U15 (#411), F153–F156
 * regelversjonen i kommandoen (#386), F157–F168 den senere begrunnelsen (#448) og F169–F177 hullene fra
 * samspillsreviewet av den og KA-U36 (opphevet av KA-U46) (#468), F178–F202 byggherrens vurderinger
 * etter § 34.1.2, § 34.2.2 og § 33.6.1 (#479, #341), F204 påberopelsen etter
 * § 33.4 mot varselet (#309, KK-07), F208–F209 innsigelsen brevet viser til og gir opp
 * (#407, #309, #500), F215–F216 frafall der pålegget er byggherrens eget (GR-U18, #511),
 * F222 og F224 innsigelsen etter VS-U24 (#498, #517), F223 et registrert brev (HF-U4, OV-U4), og
 * F246–F247 registrerte brev som dokumentasjon (OV-U4, OV-U6, #574), og F248–F255
 * opprettelsen og datoen etter VS-U26 (#664), og F296–F300 varselet med vedlegg i
 * fristkravet (OV-U5, #828) og datoen for varselet (#968), og F301–F303
 * protesten, påberopt passivitet og den senere begrunnelsen, som avvises etter
 * OV-U7 (#587), og F170 og F304 den leste begrunnelsen og passiviteten etter at
 * kravene er avgjort (OV-U7, #994), og F312–F315 det som foreligger i et lukket spor
 * og etter et frafall (#1050), og F330–F333 tegnene PDF-en av brevet ikke kan vise (#801), og F353–F356 brevet registrert som dokumentasjon (OV-U4, OV-U16, #1045), og F406–F411 forbeholdet for ubesvart forhold og oppgjør som fast sum (GR-U26, LV-U31, OV-U33, #1239, #1240), og F412–F414 postlisten og avsnittene per lag i svarbrevet (#1047, #1267), og F415–F418 beløpsvurderingen som motsier beløpet og brøkdeler av øre (#1301, OV-U58), og F419–F420 «delvis» med det krevde eller 0 kr (KA-U42), og F434–F435 vedleggene ved påberopelsen (VS-U38, #1487), og F456–F464 korrigeringen av datoen (MM-U41 (opphevet av MM-U52) punkt 10 og 11, MM-U51, #1308), og F467–F469 lagene svaret på forholdet opptok foran sporet i brevet (OV-U32, OV-U33, #1449), og F470–F475 en ny versjon av påberopelsen og endringsordren som står (LV-U56, MM-U52 punkt 14, #1615), og F517–F522 varselet om forholdet før datoen i grunnlagskravet (VS-U58, VS-U59, #1730), og F523–F524 et ukjent felt i vurderingene i svaret på forholdet og fristen (MM-U2, #1732), og F525–F526 kravet som er det første varselet, i korrigeringen (VS-U60, #1753), og F552 det tidligste av det egne varselet og kravet (VS-U66, #1754), og F553 formen på merkingen (LV-U48, #1588), og F544–F546 lagene i vederlagssvaret (OV-U32, #1774), og F547–F548 rigg og drift i vederlagskravet (MM-U2, #1775). Én mutasjon om gangen per arbeidskopi, Vitest over hele `kjerne/`
 * og `sprakprove/kjernelagring/` uten isolasjon mellom filene, og originalteksten
 * settes tilbake etterpå. Med `FEILINNFOERING_UTVALG=1`, som workflowen setter på en
 * PR, kjører hver mutasjon bare filene med målene sine (#934), og hvert slikt utvalg
 * kjøres først én gang uten mutasjon (#945). For
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
 * samlingen. Med et utvalg fordeles mutasjonene med lagringstester for seg, så delene
 * tar om lag like lang tid, og kontrollkjøringen over hele samlingen går i én kopi.
 * Workflowen fordeler delene på flere jobber, og en ny mutasjon havner
 * i en av dem uten videre. Fra-strengene kontrolleres for alle delene.
 *
 * Kjøres fra repoets rot, med SQL Server oppe og `KOE_SQLSERVER_TILKOBLING` satt:
 *   node kjerne/tester/feilinnfoering.ts [F1 F2 ...]
 * Med `--ankre` kontrolleres bare at hver fra-streng finnes nøyaktig én gang i
 * fila (#430), at mutasjonen ikke gir en ny feil med kode 2304 eller 2552 i fila
 * (#1360), og at hvert mål er en del av navnet på en test (#432), uten å
 * fortsette i et ord eller en ID (#436). Navnene leses med `vitest list` uten
 * kopier, base eller testkjøring. Det tar under ett minutt og kjøres før hver push som
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
import ts from 'typescript';
import { treffer } from './maltreff.ts';
import type { Suitefeil } from './suitefeil.ts';

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
        '  // kravene er avgjort, sperrer ikke.\n  if (u.forholdAvvist)',
        // Statusen leses uten å endre utfallet, så bare arkitekturtestene skal feile (#1122).
        '  // kravene er avgjort, sperrer ikke.\n  if (u.forholdAvvist && visning(u, { versjon: 0, gjelderVarslingsplikten: () => true, gjelderVarslingspliktenForVederlag: () => true }).status !== undefined)',
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
    // F-MM-E3 er ikke mål: et svar flyttet til et annet krav stopper også på postene (OV-U23).
    mal: ['F-MM-E1'],
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
        "  sammenfallStemmer,\n} from '../frosset/standpunkt.ts';",
        "  sammenfallStemmer,\n  virkninger as regn,\n} from '../frosset/standpunkt.ts';",
      ],
      [
        '  const svar = svarberegninger(alleSvar, spor);',
        '  const svar = svarberegninger(alleSvar, spor, regler);',
      ],
      [
        '  spor: Record<Spor, Sporutledning>\n): Record<string, Svarberegning> {',
        '  spor: Record<Spor, Sporutledning>,\n  regler: Regelsett\n): Record<string, Svarberegning> {',
      ],
      [
        '      virkninger: s.beslutningsgrunnlag.virkninger,',
        '      virkninger: regn(s, spor.forhold.krav.find((k) => k.id === s.gjelder) ?? spor.forhold.krav.at(-1), regler),',
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
    feilklasse:
      'serveren godtar en aksept forhåndsvist med en annen regelversjon (B-13, KA-U10 (opphevet av MM-U50))',
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
        '      !erVarselhjemmel(p.hjemmel) ||\n      erKravpostvarselhjemmel(p.hjemmel)\n    )\n      return false;',
        "      p.hjemmel !== '34.1.2' ||\n      erKravpostvarselhjemmel(p.hjemmel)\n    )\n      return false;",
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
    feilklasse: 'et godkjent forhold er ikke enighet ved sammenfall (GR-U10, #312)',
    fil: `${K}/spor/forhold/frysing.ts`,
    endringer: [
      [
        "godkjennerHeleKravet: (svar) => standpunktet(svar, 'forhold')?.resultat === 'godkjent',",
        'godkjennerHeleKravet: () => false,',
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
    feilklasse:
      'en ny kravversjon i et spor med registrert enighet avvises, som før MM-U34 punkt 9',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        '      // MM-U34 punkt 9: også i et spor med registrert enighet, fram til endringsordren.\n',
        "      if (s.enighet) return avvis('ENIGHET_I_SPORET', 'Partene er enige om svaret.');\n",
      ],
    ],
    mal: [
      'TE kan sende en ny kravversjon i et spor med enighet ved aksept eller sammenfall',
      'TE kan sende en ny påberopelsesversjon når godkjenningen av forholdet gir enighet',
    ],
  },
  {
    id: 'F12b',
    feilklasse:
      'en ny kravversjon i et spor med registrert enighet gjør saken ikke forstått, som før MM-U34 punkt 9 (MM-U18 (opphevet av MM-U43))',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "  if (u.spor[k.spor].ingenKrav) return 'en kravversjon i et spor med «ingen krav» (KA-U12)';\n",
        "  if (u.spor[k.spor].ingenKrav) return 'en kravversjon i et spor med «ingen krav» (KA-U12)';\n  if (u.spor[k.spor].enighet) return 'en ny kravversjon i et spor med enighet';\n",
      ],
    ],
    mal: ['TE kan sende en ny kravversjon i et spor med enighet ved aksept eller sammenfall'],
  },
  {
    id: 'F13',
    feilklasse:
      'saken kan inngå i en endringsordre etter at TE har godtatt avslaget på forholdet (GR-U27, MM-U34 punkt 20)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [['!== null && !u.forholdAvvist && !u.spor', '!== null && !u.spor']],
    mal: ['ikke når TE har godtatt avslaget på forholdet (GR-U27, MM-U34 punkt 20)'],
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
        '    e.beslutningsgrunnlag,',
        "    e.beslutningsgrunnlag ?? { regelversjon: 0, virkninger: standpunkter.map((s) => ({ standpunkt: s.id, lag: 1 })), linje: '-', sammenfall: false, ...(spor === 'forhold' ? { varslingsplikt: false } : {}) },",
      ],
    ],
    mal: ['et svar uten beslutningsgrunnlag'],
  },
  {
    id: 'F15',
    feilklasse: 'en regel leser det lagrede utfallet i et svar (MM-U11, MM-U50, #329)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        '            : `Byggherren har ikke svart på ${kravet(h.spor)}.`\n        );\n',
        "            : `Byggherren har ikke svart på ${kravet(h.spor)}.`\n        );\n      if (s.gjeldendeSvar.utregning.resultat === 'avslaatt') return null;\n",
      ],
    ],
    mal: ['reglene leser bare det LESBART tillater (#308, #329) kommandoer/forutsetninger.ts'],
  },
  {
    id: 'F16',
    feilklasse:
      'enighet ved sammenfall leses ikke fra brevet (GR-U7, GR-U10, KA-U10 (opphevet av MM-U50))',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['else if (g.beslutningsgrunnlag.sammenfall)', 'else if (g.standpunkter.length < 0)'],
    ],
    mal: ['F-MM-A', 'F-MM-G10', 'F-MM-K1'],
  },
  {
    id: 'F17',
    feilklasse:
      'saken kan inngå i en endringsordre etter at TE har trukket forholdet (GR-U27, MM-U34 punkt 20)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [[' && !u.spor.forhold.trukket;', ';']],
    mal: ['ikke når TE har trukket forholdet (GR-U27, MM-U34 punkt 20)'],
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
        'return beslutningsgrunnlag(innhold, paaberopelse, regler, forskyvning, kravet);',
        'return beslutningsgrunnlag(innhold, undefined, regler, forskyvning, kravet);',
      ],
    ],
    mal: ['registrert korrespondanse fryses med kategorien', 'F-MM-C', 'F-MM-G18'],
  },
  {
    id: 'F23',
    feilklasse:
      'TE trekker forholdet når partene er enige ved sammenfall med varslingsplikt (KA-U13)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        'if (trekkAvPaaberopelsenErSperret(u))',
        'if (trekkAvPaaberopelsenErSperret(u) && u.frafalt)',
      ],
    ],
    mal: ['F-MM-G10'],
  },
  {
    id: 'F24',
    feilklasse: 'forbudet mot trekk gjelder også kategorier § 32.2 ikke gjelder for (KA-U13)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      ['blirEndringsordre(svaret.beslutningsgrunnlag)', '(svaret.beslutningsgrunnlag.sammenfall)'],
    ],
    mal: ['F-MM-G13', 'F-MM-G14', 'F-MM-G19'],
  },
  {
    id: 'F25',
    feilklasse: 'om godkjenningen er en endringsordre, leses av dagens regelsett (MM-U9, KA-U13)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    ...forholdet(spor, elementer, svar, dokumenter),',
        "    ...forholdet(spor, elementer, svar, dokumenter),\n    endringsordre: spor.forhold.svar.some((svaret) => svaret.beslutningsgrunnlag.sammenfall && regler.gjelderVarslingsplikten(String(spor.forhold.gjeldendeKrav?.innhold.hovedkategori), String(spor.forhold.gjeldendeKrav?.innhold.underkategori)) && !erRegistrert(dokumenter.get(svaret.dokument)!.opplysninger)) ? 'ja' : 'nei',",
      ],
    ],
    mal: ['F-MM-G15'],
  },
  {
    id: 'F26',
    feilklasse: 'trekk av forholdet sperres av ethvert svar, også avslag og frafall (KA-U13)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      [
        'blirEndringsordre(svaret.beslutningsgrunnlag)',
        '(svaret.beslutningsgrunnlag.varslingsplikt === true)',
      ],
    ],
    mal: ['F-MM-G16', 'F-MM-G17'],
  },
  {
    id: 'F26b',
    feilklasse:
      'en ny påberopelsesversjon tar bort sperren mot trekk etter en godkjenning som er en endringsordre (EO-U12)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      ['endringsordre: spor.forhold.svar.some(', 'endringsordre: (gSvar ? [gSvar] : []).some('],
    ],
    mal: ['etter en ny påberopelsesversjon kan TE fortsatt ikke trekke forholdet'],
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
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      [
        'blirEndringsordre(svaret.beslutningsgrunnlag)',
        "(svaret.beslutningsgrunnlag.sammenfall && svaret.standpunkter.some((p) => p.art === 'rettidighet' && p.hjemmel === '32.2'))",
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
    endringer: [["      gjelder: varseletForNyttSvar(u, '33.4'),\n", '']],
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
    endringer: [['...(forrige ? { erstatter: forrige.id } : {}),', '']],
    mal: ['F-MM-E1', 'F-MM-K1'],
  },
  {
    id: 'F35',
    feilklasse: '«ingen krav» i begge sporene avgjør ikke kravene (KA-U12, #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [[' || KRAVSPOR.every((n) => u.spor[n].ingenKrav)', '']],
    mal: ['«ingen krav» i begge spor avgjør kravene'],
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
    fil: `${K}/format/skjema.ts`,
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
    feilklasse: '«ingen krav» før forholdet er sendt, leses (KA-U15)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [[' ||\n      !spor.forhold.krav.some((k) => bakover(i.id, k.id))\n', '\n']],
    mal: ['«ingen krav» før forholdet er sendt'],
  },
  {
    id: 'F43',
    feilklasse:
      'opplysningen om at § 31.3 ikke er oppfylt, gir unntaket i OV-U6 likevel (OV-U6, GR-U13)',
    fil: `${K}/spor/forhold/utledning.ts`,
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
      // Strid-kontrollen (MM-U43 punkt 6) fanger det samme; begge må muteres.
      [
        '  if (sporet && u.spor[sporet].enighet && u.spor[sporet].gjeldendeSvar?.id === gjelder)',
        '  if (false)',
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
      ['    u.forholdAvklart &&\n', '    (u.ferdig ?? u.forholdAvklart) &&\n'],
    ],
    mal: ['reglene leser bare det LESBART tillater (#308, #329) utledning/utled.ts'],
  },
  {
    id: 'F49',
    feilklasse:
      'kjernen leser bare formatet den skriver, så en versjon som leser et nytt format, stopper saken (B-10, #316)',
    fil: `${K}/utledning/utled.ts`,
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
      'visningen merker et svar sendt fra appen, ikke det registrerte, som appens vurdering ved registreringen (MM-U17, MM-U50, #336)',
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
      'byggherrens registrerte endringsordre fryses med reglene da den ble sendt, ikke ved registreringen (MM-U17 (opphevet av MM-U50), OV-U6)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        "import { avvisning } from './avvisning.ts';",
        "import { avvisning } from './avvisning.ts';\nimport { GJELDENDE_REGLER } from '../regler/regelsett.ts';",
      ],
      [
        'kravene.find((k) => k.id === s.gjelder),\n    kjerne\n',
        'kravene.find((k) => k.id === s.gjelder),\n    { ...kjerne, regler: GJELDENDE_REGLER }\n',
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
    fil: `${K}/spor/forhold/format.ts`,
    endringer: [['  anyOf: KATEGORIPAR,\n', '']],
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
        'standpunkter: forholdsstandpunkter(vurderinger, krav.id,',
        'standpunkter: forholdsstandpunkter({ resultat: vurderinger.resultat }, krav.id,',
      ],
    ],
    mal: ['svarutkastet blir en endringsordre som brevet det gir'],
  },
  // Byggedel 1 av #309: #344, #373, #342, MM-U18 (opphevet av MM-U43) (#326), KA-U16/KA-U20, KA-U22, § 5,
  // VS-U11, VS-U12 og «ingen krav».
  {
    id: 'F61',
    feilklasse: 'en importert verdi leses i en annen funksjon enn den den er avgrenset til (#344)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      [
        '/**\n * KA-U13 og KA-U14',
        'export const proeve = (s: Svar, v: Parameters<typeof forholdetErAvklart>[1]) =>\n  forholdetErAvklart(s, v);\n\n/**\n * KA-U13 og KA-U14',
      ],
    ],
    mal: ['reglene leser bare det LESBART tillater (#308, #329) spor/forhold/utledning.ts'],
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
      'subsidiariteten leses av gjeldende påberopelsesversjon, ikke av den svaret ble regnet mot (#342, GR-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    const fra = paaberopelseskjede.findIndex((k) => k.id === sistBesvart?.paaberopelse);',
        '    const fra = paaberopelseskjede.findIndex((k) => k.id === (sistBesvart && spor.forhold.gjeldendeKrav?.id));',
      ],
    ],
    mal: ['F-MM-S342'],
  },
  {
    id: 'F65',
    feilklasse:
      'leseren godtar en påberopelsesversjon som ikke er en påberopelse før svaret (#342, HF-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      (s.paaberopelse !== null &&', '      (s.paaberopelse === undefined &&']],
    mal: [
      'et lagret svar med et vederlagskrav som påberopelsesversjon er ikke forstått',
      'et lagret svar med en påberopelsesversjon som ikke finnes er ikke forstått',
    ],
  },
  {
    id: 'F67',
    feilklasse:
      'en hendelse som endrer utfallet etter at saken er lukket, leses med virkning (MM-U43 punkt 6, SK-01, KA-U11)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ["  u.forholdAvvist\n    ? 'TE har godtatt svaret", "  false\n    ? 'TE har godtatt svaret"],
    ],
    mal: ['F-MM-U326h'],
  },
  {
    id: 'F68',
    feilklasse: 'en aksept av et frafall leses som enighet (MM-U43 punkt 6, GR-U9)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "  if (x.art === 'aksept' && x.gjelder === u.spor.forhold.gjeldendeSvar?.id && u.frafalt)",
        "  if (x.art === 'aksept' && x.gjelder === u.spor.forhold.gjeldendeSvar?.id && !u)",
      ],
    ],
    mal: ['F-MM-U326b'],
  },
  {
    id: 'F69',
    feilklasse:
      'leseren kontrollerer ikke at sammenfallet stemmer med standpunktene (MM-U43 punkt 8, #326)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    if (!sammenfallStemmer(s))', '    if (!sammenfallStemmer(s) && !s)']],
    mal: ['et avslag lagret med sammenfall er ikke forstått'],
  },
  {
    id: 'F70',
    feilklasse:
      'et registrert brev som strider mot en enighet eller et trekk, gjør saken ikke forstått (MM-U43 punkt 9, OV-U4)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      if (!registrert) konflikter.push(', '      if (true) konflikter.push(']],
    mal: ['F-MM-U326l'],
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
    feilklasse: 'TE kan si «ingen krav» før forholdet er sendt (KA-U15)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "      if (!paaberopelseSendt)\n        return avvis(\n          'PAABEROPELSE_IKKE_SENDT',\n          'Grunnlaget må være sendt før du kan si «ingen krav».'",
        "      if (!paaberopelseSendt && !s)\n        return avvis(\n          'PAABEROPELSE_IKKE_SENDT',\n          'Grunnlaget må være sendt før du kan si «ingen krav».'",
      ],
    ],
    mal: ['F-MM-IK4'],
  },
  {
    id: 'F82',
    feilklasse:
      'en innsigelse mot det en registrert enighet omfatter, avvises, som før MM-U34 punkt 13',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        '      return kanFaaInnsigelse(maal, part)\n        ? null\n',
        "      return kanFaaInnsigelse(maal, part)\n        ? (['forhold', 'vederlag', 'frist'] as const).some((n) => u.spor[n].enighet !== null)\n          ? avvis('ENIGHETEN_OMFATTER', 'Partene er enige.')\n          : null\n",
      ],
    ],
    mal: [
      'innsigelsen mot fristkravet og svaret partene er enige om ved sammenfall, godtas',
      'innsigelsen mot en påberopelse med registrert enighet ved en endringsordre godtas',
      'godtas byggherrens innsigelse mot et varsel og mot kravet enigheten omfatter',
    ],
  },
  {
    id: 'F82e',
    feilklasse: 'en innsigelse avvises når kravene er avgjort (OV-U3, KA-U11)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        '      // VS-U1, VS-U14: et varsel, krav eller svar fra motparten.\n',
        "      if (kraveneErAvgjort(u)) return avvis('KRAVENE_AVGJORT', 'Kravene er avgjort.');\n",
      ],
      [
        "import { fristkravErFremmet, kanFaaInnsigelse, type Utledning } from '../utledning/utled.ts';",
        "import { fristkravErFremmet, kanFaaInnsigelse, kraveneErAvgjort, type Utledning } from '../utledning/utled.ts';",
      ],
    ],
    mal: ['godtas byggherrens innsigelse mot et varsel og mot kravet enigheten omfatter'],
  },
  {
    id: 'F84',
    feilklasse:
      'en påberopt passivitet mot en påberopelsesversjon uten virkning stopper saken (MM-U43 punkt 6, VS-U12)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '  kontrollerHenvisningene(henvisninger, elementer, kravMedUten, besvart, bakover, ugyldig);',
        '  kontrollerHenvisningene(henvisninger, elementer, alleKrav, besvart, bakover, ugyldig);',
      ],
    ],
    mal: ['en påberopt passivitet sendt herfra mot den er forstått'],
  },
  {
    id: 'F90',
    feilklasse:
      'subsidiariteten går tilbake til svaret på versjonen det ble regnet mot, når forholdet er besvart igjen (GR-U1, GR-U4)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['            .slice(fra)', '            .slice(fra, fra + 1)']],
    mal: ['F-MM-S342b'],
  },
  {
    id: 'F92',
    feilklasse: 'en kravversjon etter trekk leses med virkning (MM-U43 punkt 6, GR-U5)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['  if (u.spor[k.spor].trukket)', '  if (u.spor[k.spor].trukket && !k)']],
    mal: ['F-MM-IK6b'],
  },
  {
    id: 'F93',
    feilklasse:
      'en kravversjon etter «ingen krav» stopper saken også når den er registrert (MM-U19 (opphevet av MM-U43), KA-U12)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['  if (u.spor[k.spor].ingenKrav)', '  if (u.spor[k.spor].ingenKrav && !k)']],
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
        "    if (krav && krav.spor !== 'forhold') return '33.4';\n    if (krav)\n",
      ],
    ],
    mal: [
      'uten eget varsel er en innsigelse mot det første fristkravet ingen påberopelse',
      'et «i tide» om varselet gir ikke opp en innsigelse mot fristkravet',
      'et «i tide» om varselet nevner ikke en innsigelse mot en tidligere kravversjon',
      'gir et «i tide» opp bare den mot varselet',
    ],
  },
  {
    id: 'F99',
    feilklasse:
      'påberopelsen etter § 33.4 viser til kravversjonen svaret gjelder, ikke det første fristkravet (VS-U20, OV-U5, KK-07)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    krav,\n    () => true,', '    krav.slice(-1),\n    () => true,']],
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
    mal: ['et «i tide» i forholdet gir ikke opp innsigelsen mot fristvarselet'],
  },
  {
    id: 'F105',
    feilklasse: 'brevet for trekk av forholdet sier ikke hva trekket ikke opphever (KA-U22)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        ' Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`',
        '`',
      ],
    ],
    mal: ['trekk av forholdet'],
  },
  {
    id: 'F106',
    feilklasse: '«ingen krav» i vederlaget sier ikke at forseringsvederlaget er unntatt (KA-U25)',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [[' Avkallet omfatter ikke vederlag for forsering etter NS 8407 punkt 33.8.`', '`']],
    mal: ['«ingen krav» i vederlaget'],
  },
  {
    id: 'F107',
    feilklasse:
      'et standpunkt appen regner som uten virkning, står ikke i brevet (LV-U3, HF-U2, VS-U11)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '    ...s.standpunkter.filter(harTekst).map((p) => {',
        "    ...s.standpunkter.filter(harTekst).filter((p) => virkning.get(p.id) !== 'uten_virkning').map((p) => {",
      ],
      [
        '  for (const p of s.standpunkter.filter(harTekst)) {',
        "  for (const p of s.standpunkter.filter(harTekst).filter((p) => virkning.get(p.id) !== 'uten_virkning')) {",
      ],
    ],
    mal: ['et standpunkt appen regner som uten virkning', 'gir byggherren innsigelsen opp'],
  },
  {
    id: 'F108',
    feilklasse:
      'begrunnelsen i svaret faller ut av brevteksten (B-13 om begrunnelsestekst, KA-U31)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        '    utdypninger.set(id, { utdypning: s.utdypning, utdypninger: s.utdypninger });',
        '    utdypninger.set(id, { utdypninger: s.utdypninger });',
      ],
    ],
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
    feilklasse: 'leseren godtar brevtekst fra appen i et registrert brev (MM-U17, MM-U50)',
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
      [
        'const innsigelsene = aapneInnsigelser(s, nytt.avsender, j, regler);',
        'const innsigelsene: Innsigelse[] = [];',
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
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      ["k.spor === 'forhold' && gjelderVarslingsplikten(", 'false && gjelderVarslingsplikten('],
    ],
    mal: ['uten beskrivelse av pålegget avvises'],
  },
  {
    id: 'F119',
    feilklasse:
      'svaret på vederlag og frist sier ikke at forholdet er avslått eller prekludert (A2, B-13 05.10)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      ["  if (s.spor === 'forhold') return [];", '  return [];'],
      ["  if (s.spor === 'forhold') return ingen;", '  return ingen;'],
    ],
    mal: [
      'forholdet avslått i samme brev',
      'forholdet prekludert og avslått subsidiært i et tidligere brev',
      'innledningen nevner sporet',
    ],
  },
  {
    id: 'F120',
    feilklasse: 'et svar på påberopelsen i et tidligere brev omtales som i samme brev (A2, LV-U3)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['  if (g.dokument === nytt.id) {', '  if (true) {']],
    // LV-U72: svaret på fristen har dagens tekst.
    mal: ['nevner hjemmelen etter § 32.2-preklusjonen (LV-U5)'],
  },
  {
    id: 'F121',
    feilklasse:
      'aksepten av et subsidiært svar sier ikke at TE er uenig i forholdet (LV-U4 punkt 6, GR-U7)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [["svar.spor === 'forhold' || !saken.subsidiaer[svar.spor].length", 'true']],
    mal: ['sier aksepten at TE ikke er enig'],
  },
  {
    id: 'F122',
    feilklasse:
      'godkjenningen som er en endringsordre, sier ikke hva endringen går ut på (GR-U14, § 31.3)',
    fil: `${K}/spor/forhold/tekst.ts`,
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
    fil: `${K}/spor/forhold/tekst.ts`,
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
    fil: `${K}/spor/forhold/format.ts`,
    endringer: [["      required: ['endringsordre'],\n", '']],
    mal: ['uten endringsordrens dato eller nummer'],
  },
  {
    id: 'F128',
    feilklasse:
      'avslaget der § 32.2 gjelder, sier ikke at kravet på endringsordre avslås (§ 32.3 b)',
    fil: `${K}/spor/forhold/tekst.ts`,
    endringer: [
      [
        "      if (varslingsplikt)\n        return 'byggherren avslår kravet på endringsordre",
        "      if (false)\n        return 'byggherren avslår kravet på endringsordre",
      ],
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
        '  return `${VARSELET[p.hjemmel]} i ',
        "  return `${VARSELET[p.hjemmel === '32.2' ? '33.4' : '32.2']} i ",
      ],
      [
        'const omVarselet = `${VARSELET_I_SVARET[p.hjemmel]} i ',
        "const omVarselet = `${VARSELET_I_SVARET[p.hjemmel === '32.2' ? '34.1.2' : '32.2']} i ",
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
      'et svar i et trukket spor, i en rad som ikke er registrert, er ikke en strid (MM-U43 punkt 6)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['  if (u.spor[s.spor].trukket) return', '  if (false) return']],
    mal: ['F-MM-U20a', 'F-MM-U20c', 'F-MM-U20d'],
  },
  {
    id: 'F136',
    feilklasse:
      'en aksept av et svar i et trukket spor, i en rad som ikke er registrert, er ikke en strid (MM-U43 punkt 6)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['  if (sporet && u.spor[sporet].trukket)', '  if (sporet && false)']],
    mal: ['F-MM-U20b'],
  },
  {
    id: 'F137',
    feilklasse: 'aksepten kontrolleres mot et annet spor enn svaret den gjelder (MM-U43 punkt 6)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '      ? SPOR.find((n) => u.spor[n].svar.some((s) => s.id === x.gjelder))',
        "      ? SPOR.find((n) => n === 'forhold')",
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
        'at TE vil kreve ${VIL_KREVE[hjemmel]} som følge av forholdet i ${sak}.`',
        'at TE vil kreve ${VIL_KREVE[hjemmel]}.`',
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
      ['      return [{ type, spor: k.spor }];', "      return [{ type: 'krav', spor: 'frist' }];"],
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
      'serveren godtar en aksept regnet ut med en høyere regelversjon (B-13, KA-U10 (opphevet av MM-U50), #386)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['if (k.regelversjon !== regler.versjon)', 'if (k.regelversjon < regler.versjon)']],
    mal: ['en aksept, med serverens regelversjon én lavere enn kommandoens'],
  },
  {
    id: 'F154',
    feilklasse:
      'serveren godtar en aksept regnet ut med en lavere regelversjon (B-13, KA-U10 (opphevet av MM-U50), #386)',
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
    feilklasse:
      'leseren godtar en begrunnelse som gjelder noe annet enn et svar (KA-U34 (opphevet av KA-U46), MM-U2)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["return maal.art === 'svar';", "return maal.art !== 'opplysning';"]],
    mal: ['en begrunnelse fra TE eller av noe annet enn et svar gjør saken ikke forstått'],
  },
  {
    id: 'F165',
    feilklasse: 'leseren godtar en begrunnelse fra TE (KA-U34 (opphevet av KA-U46), MM-U2)',
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
        "  for (const k of u.spor.forhold.krav) ut.push({ type: 'passivitet', gjelder: k.id });\n  return ut;\n",
      ],
      [
        '.filter((h) => forutsetninger(h, part, u) === null)',
        ".filter((h) => ['protest', 'passivitet', 'begrunne'].includes(h.type) || forutsetninger(h, part, u) === null)",
      ],
    ],
    mal: [
      'protest, påberopt passivitet og senere begrunnelse tilbys ingen av partene, også med en innsigelse, et dokument, en påberopelse og et svar',
    ],
  },
  {
    id: 'F488',
    feilklasse:
      'den tilbudte handlingen får sporet fra nøkkelen, ikke fra elementet den gjelder (#1703)',
    fil: `${K}/kommandoer/handlinger.ts`,
    endringer: [["  for (const o of u.datoopplysninger) sporet.set(o.id, 'forhold');\n", '']],
    mal: ['hver handling unntatt registreringen av et brev hører til et spor'],
  },
  {
    id: 'F489',
    feilklasse: 'varselet i sporet får ikke hjemmelen i den tilbudte handlingen (OV-U5, #1703)',
    fil: `${K}/kommandoer/handlinger.ts`,
    endringer: [['        ? VARSEL_I_SPORET[h.spor]\n', '        ? null\n']],
    mal: ['et varsel får hjemmelen og sporet etter OV-U5'],
  },
  {
    id: 'F170',
    feilklasse:
      'en lest senere begrunnelse kan endre utfallet (KA-U34 (opphevet av KA-U46), OV-U7)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "['aksept', 'trekk', 'ingen_krav', 'varsel']",
        "['aksept', 'trekk', 'ingen_krav', 'varsel', 'begrunnelse']",
      ],
    ],
    mal: ['en lest senere begrunnelse etter at saken er lukket etter GR-U27'],
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
    fil: `${K}/spor/vederlag/kommando.ts`,
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
    fil: `${K}/frosset/byggeklosser.ts`,
    endringer: [["if (hjemmel === '34.1.2')", "if (hjemmel === ('' as Hjemmel))"]],
    mal: ['F-MM-V-34-1-2-nei', '§ 34.1.2 «nei»: byggherren påberoper prinsipalt'],
  },
  {
    id: 'F180',
    feilklasse:
      'aksept av et svar med preklusjon etter § 34.1.2 gir det subsidiære beløpet (VS-U3)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [
      [
        'prekludert ? { beloep: 0 } : prinsipaltIVederlaget(svar, v)',
        'prinsipaltIVederlaget(svar, v)',
      ],
    ],
    mal: ['en aksept av svaret med § 34.1.2 og § 34.1.3 påberopt gir 0'],
  },
  {
    id: 'F181',
    feilklasse: 'vurderingen etter § 34.1.2 godtas for en endring, der bestemmelsen ikke gjelder',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['v.hovedkrav_varslet_i_tide != null &&', 'false &&']],
    mal: ['F-MM-V-34-1-2-endring'],
  },
  {
    id: 'F182',
    feilklasse: 'beløpsstandpunktet leses som det prinsipale beløpet, ikke det vurderte (B-13)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [
      [
        'const total = utregning.subsidiaert_godkjent_beloep ?? utregning.godkjent_beloep;',
        'const total = utregning.godkjent_beloep;',
      ],
    ],
    mal: ['F-MM-V-34-1-2-nei', '§ 34.1.2 «nei»: byggherren påberoper prinsipalt'],
  },
  {
    id: 'F183',
    feilklasse: 'det subsidiære beløpet ved preklusjon etter § 34.1.2 lagres ikke (VS-U3, B-13)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [
      [
        'if (r.subsidiaer_resultat !== null) {\n    ut.subsidiaert_resultat = r.subsidiaer_resultat;\n    ut.subsidiaert_godkjent_beloep',
        'if (false) {\n    ut.subsidiaert_resultat = r.subsidiaer_resultat;\n    ut.subsidiaert_godkjent_beloep',
      ],
    ],
    mal: ['F-MM-V-34-1-2-nei', '§ 34.1.2 «nei»: byggherren påberoper prinsipalt'],
  },
  {
    id: 'F185',
    feilklasse:
      'påberopelsen etter § 34.1.2 knyttes til kravversjonen svaret gjelder, ikke det første vederlagskravet (arbeidsvalget i #479)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [["gjelder: varseletForNyttSvar(u, '34.1.2'),", 'gjelder: krav.id,']],
    mal: ['F-MM-V-34-1-2-ny-kravversjon'],
  },
  {
    id: 'F186',
    feilklasse:
      'en lagret påberopelse etter § 34.1.2 som viser til en senere kravversjon, forstås (HF-U1)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '  if (erVarselhjemmel(p.hjemmel) && !erKravpostvarselhjemmel(p.hjemmel)) {\n    const n',
        "  if (p.hjemmel === '33.4') {\n    const n",
      ],
    ],
    mal: ['påberopelsen etter § 34.1.2 viser til kravversjonen svaret gjelder'],
  },
  {
    id: 'F187',
    feilklasse: 'godkjenningen av oppgjør som fast sum står uten lag (OV-U33, LV-U31)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [
      [
        "if (s.art === 'beloep' && s.saerskilt) return posten ? foerste + 1 : ellers;",
        "if (s.art === 'oppgjoersform' && s.aksepterer) return 'uten_virkning';\n      if (s.art === 'beloep' && s.saerskilt) return posten ? foerste + 1 : ellers;",
      ],
    ],
    mal: ['F-MM-V-34-2-2-ja', 'justeringen ellers er upåvirket'],
  },
  {
    id: 'F188',
    feilklasse: 'byggherren kan avslå tilbudet etter § 34.2.2 uten å oppgi metoden',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      [
        '  else if (p.aksepterer === false && p.oensket_oppgjoersform == null && !kreverTilbud)',
        '  else if (false && p.oensket_oppgjoersform == null && !kreverTilbud)',
      ],
    ],
    mal: ['F-MM-V-34-2-2-nei'],
  },
  {
    id: 'F189',
    feilklasse: 'byggherrens vurdering etter § 34.2.2 lagres ikke som standpunkt (#341)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [
      ["  if (typeof svar.aksepterer === 'boolean')", "  if (typeof svar.aksepterer === 'string')"],
    ],
    mal: ['F-MM-V-34-2-2-nei', 'F-MM-V-34-2-2-ja'],
  },
  {
    id: 'F190',
    feilklasse: 'spesifisering i tide får virkning etter § 33.6.1',
    fil: `${K}/frosset/byggeklosser.ts`,
    endringer: [
      ["const virkning = s.iTide ? 'uten_virkning' : iLaget();", 'const virkning = iLaget();'],
    ],
    mal: ['F-MM-F-33-6-1-ja'],
  },
  {
    id: 'F191',
    feilklasse:
      'de vurderte dagene står prinsipalt ved siden av påberopelsen etter § 33.6.1 (VS-U4)',
    fil: `${K}/frosset/byggeklosser.ts`,
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
    fil: `${K}/frosset/utregning.ts`,
    endringer: [['ut.godkjent_dager = maatteForstaa;', 'ut.godkjent_dager = r.godkjent_dager;']],
    mal: ['serverens utregning gir dagene byggherren måtte forstå at TE hadde krav på, prinsipalt'],
  },
  {
    id: 'F194',
    feilklasse: 'de prinsipale dagene etter § 33.6.1 kan være flere enn de vurderte',
    fil: `${K}/regler/svarkontroll.ts`,
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
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [
      [
        "(e.aksepterer && 'oensket_oppgjoersform' in e) ||\n        (!e.aksepterer && !kreverTilbud && !('oensket_oppgjoersform' in e))",
        'false',
      ],
    ],
    mal: ['tilbudet er ikke akseptert, men oppgjørsformen mangler'],
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
      'et tilbud byggherren ikke aksepterer, gir sammenfall når utregningen sier «godkjent» (arbeidsvalget i #479, MM-U43 punkt 8)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [['if (tilbudetIkkeAkseptert(svar)) return false;', 'void 0;']],
    mal: ['sammenfall med et tilbud byggherren ikke aksepterer'],
  },
  {
    id: 'F201',
    feilklasse:
      'en påberopelse etter § 33.6.1 gir sammenfall (arbeidsvalget i #479, MM-U43 punkt 8)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['v.some((p) => p.standpunkt === spesifisering.id && laget(p.virkning))', 'false']],
    mal: ['sammenfall med en påberopelse etter § 33.6.1', 'F-MM-F-33-6-1-alle-dagene'],
  },
  {
    id: 'F202',
    feilklasse:
      'brevet sier at byggherren godkjenner hele beløpet for en kravpost «av de krevde» når tilbudet for en annen kravpost ikke er akseptert (B-13)',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [
      [
        'const resultat = erBeloepetGodkjentFullt(krevd, godkjent)',
        "const resultat = p.resultat === 'godkjent'",
      ],
    ],
    mal: ['med to kravposter står beløpet for den kravposten der tilbudet er akseptert'],
  },
  {
    id: 'F203',
    feilklasse: 'hele beløpet sammenliknes til nærmeste krone, ikke i hele øre (OV-U59)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      ['return godkjent >= krevd;', 'return (godkjent + 50n) / 100n >= (krevd + 50n) / 100n;'],
    ],
    mal: ['kontrollsak: «delvis» med 1 øre og med 1 øre under det krevde godtas'],
  },
  {
    id: 'F204',
    feilklasse:
      'leseren godtar en påberopelse etter § 33.4 mot kravversjonen svaret gjelder (VS-U20, HF-U1, KK-07)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'if (p.gjelder !== tidligste && p.gjelder !== egetFoerst)',
        'if (p.gjelder !== tidligste && p.gjelder !== egetFoerst && p.gjelder !== s.gjelder)',
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
    ],
  },
  {
    id: 'F209',
    feilklasse:
      'svaret på en ny påberopelsesversjon gjentar eller gir ikke opp innsigelsen mot en tidligere (arbeidsvalget 15.10 i #500)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '    const gjelder =\n      hjemmel === HJEMMEL[svar.spor]',
        "    const gjelder =\n      ((svar.spor !== 'forhold' || i.gjelder === svar.gjelder) && hjemmel === HJEMMEL[svar.spor])",
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
        '      regler.gjelderVarslingspliktenForVederlag(svar.hovedkategori) &&\n      svar.varslet_i_tide === false',
        '      gjelderVarslingspliktenForVederlag(svar.hovedkategori) &&\n      svar.varslet_i_tide === false',
      ],
    ],
    mal: ['et regelsett der § 34.1.2 gjelder en endring'],
  },
  {
    id: 'F213',
    feilklasse:
      'linjen sier «subsidiært» også fra tredje ledd, ikke «videre subsidiært» (HF-U2, #492)',
    fil: `${K}/frosset/byggeklosser.ts`,
    endringer: [["lag === 2 ? 'subsidiært' : 'videre subsidiært'", "'subsidiært'"]],
    mal: ['linjen ordner byggherrens standpunkter'],
  },
  {
    id: 'F215',
    feilklasse:
      'frafall avvises i samordning og svar på varsel, som er byggherrens pålegg (GR-U18)',
    fil: `${K}/regler/forhold.ts`,
    endringer: [["  'samordning',\n  'svar_paa_varsel',\n", '']],
    mal: ['frafall godtas i samordning', 'frafall godtas i svar_paa_varsel'],
  },
  {
    id: 'F216',
    feilklasse: 'frafall godtas ved gebyr, som ikke er byggherrens eget pålegg (GR-U18)',
    fil: `${K}/regler/forhold.ts`,
    endringer: [["  'svar_paa_varsel',\n];", "  'svar_paa_varsel',\n  'gebyrer_og_avgifter',\n];"]],
    mal: ['frafall avvises i gebyrer_og_avgifter'],
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
      'en innsigelse mot en påberopelsesversjon der § 32.2 ikke gjelder, leses som en påberopelse etter § 32.2 (VS-U24, GR-U11)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "krav.spor === 'forhold' && !kravetErDokumentasjon(d) && varslingsplikt(krav)",
        "krav.spor === 'forhold' && !kravetErDokumentasjon(d) && true",
      ],
    ],
    mal: [
      'en innsigelse mot en versjon der § 32.2 ikke gjelder, gjentas ikke og gis ikke opp i svaret på en senere versjon',
    ],
  },
  {
    id: 'F225',
    feilklasse: 'en ny påberopelsesversjon med en annen hjemmel godtas (GR-U22, #569)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        "  if (k.spor !== 'forhold' || !u.spor.forhold.gjeldendeKrav) return null;",
        "  if (k.spor !== 'forhold' || !u.spor.forhold.gjeldendeKrav || u) return null;",
      ],
    ],
    mal: ['irregulær endring til svikt', 'svikt til andre forhold', 'F-MM-G39'],
  },
  {
    id: 'F226',
    feilklasse:
      'en ny påberopelsesversjon med en annen underkategori i samme hovedkategori godtas (GR-U22, #569)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [['    tekst(k.innhold.underkategori) !== forrige.underkategori\n', '    false\n']],
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
    id: 'F234',
    feilklasse:
      'en ny påberopelsesversjon etter frafallet gjør forholdet uavklart til byggherren svarer (GR-U23, OV-U3, #510)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [['  const venterEtterFrafall =', '  const venterEtterFrafall = false &&']],
    mal: ['forholdet er avklart ved frafallet', 'F-MM-G42'],
  },
  {
    id: 'F235',
    feilklasse:
      'utledningen sier at en påberopelsesversjon venter på svar når saken er lukket (GR-U27, #510, #580)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [[' && !s.trukket && !sporetErLukket(u);', ' && !s.trukket;']],
    mal: ['SK-01: når TE godtar avslaget av forholdet, venter ubesvarte krav'],
  },
  {
    id: 'F236',
    feilklasse:
      'en endringsordre byggherren har registrert, er en endringsordre i saken og sperrer TEs trekk av forholdet (OV-U6, #594)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      ['    !erRegistrert(dokumenter.get(svaret.dokument)!.opplysninger)\n', '    true\n'],
    ],
    mal: ['F-MM-G43', 'F-MM-G18', 'F-MM-G45'],
  },
  {
    id: 'F241',
    feilklasse:
      'en revisjon som tar tilbake aksepten av fast sum, avvises, som før MM-U34 punkt 15 (HF-U14 opphevet)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        "        return avvis('FEIL_SVARREFERANSE', 'Svaret er endret eller gjelder et tidligere krav.');\n",
        "        return avvis('FEIL_SVARREFERANSE', 'Svaret er endret eller gjelder et tidligere krav.');\n      if (forrige?.standpunkter.some((p) => p.art === 'oppgjoersform' && p.aksepterer) && ((k.svar.vurderinger as { kravposter?: { aksepterer?: unknown }[] }).kravposter ?? []).some((p) => p.aksepterer === false))\n        return avvis('SENKER_INNROEMMELSE', 'Aksepten av fast sum tas tilbake.');\n",
      ],
    ],
    mal: ['en revisjon som tar tilbake aksepten av fast sum, godtas'],
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
    feilklasse: 'en påberopelse fra appen uten datoen godtas (VS-U26, #664)',
    fil: `${K}/spor/forhold/kommando.ts`,
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
    fil: `${K}/spor/forhold/format.ts`,
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
    fil: `${K}/spor/forhold/tekst.ts`,
    endringer: [
      ["          ...dato('paalegg_mottatt'),\n        ]\n", '        ]\n'],
      ["rettidigheten.\n          ...dato('paalegg_mottatt'),", 'rettidigheten.'],
    ],
    mal: [
      'en endring der § 32.2 gjelder, med varselet',
      'en ny grunnlagsversjon kan ikke endre datoen',
    ],
  },
  {
    id: 'F254',
    feilklasse: 'brevet sier ikke datoen TE ble klar over forholdet (VS-U26, #664)',
    fil: `${K}/spor/forhold/tekst.ts`,
    endringer: [["...dato('klar_over_forholdet'),", '']],
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
    feilklasse: 'et beløp som ikke er et tall, avvises uten at meldingen sier feltet (#550)',
    // `kontroller` leser hvert beløp med `lesOere` før utregningen (#1301). Uten den fanger
    // `kontrollerSvar` i nyttelast.ts feilen, med meldingen fra `heleOere`.
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['if (!(e instanceof UgyldigBeloep)) throw e;', 'throw e;']],
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
    fil: `${K}/spor/forhold/frysing.ts`,
    endringer: [
      [
        "if (typeof v.grunnlag_varslet_i_tide === 'boolean')",
        "if (typeof v.hovedkrav_varslet_i_tide === 'boolean')",
      ],
      ['i_tide: v.grunnlag_varslet_i_tide,', 'i_tide: v.hovedkrav_varslet_i_tide,'],
    ],
    mal: ['påberoper «for sent» etter § 32.2 etter «i tide», godtas og leses som påberopelse'],
  },
  {
    id: 'F267',
    feilklasse:
      'opplysningen om § 31.3 godtas ved et registrert brev som ikke er byggherrens endringsordre (OV-U13, OV-U6, #669)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      ['    if (!brev.svar.some((s) => erRegistrertEndringsordre(s, brev)))', '    if (false)'],
    ],
    mal: ['opplysningen om § 31.3 ved'],
  },
  {
    id: 'F270',
    feilklasse:
      'en innsigelse mot en påberopelse i et registrert brev regnes som påberopelse etter § 32.2 (arbeidsvalg 1 i #770, #536)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['&& !kravetErDokumentasjon(d) &&', '&& true &&']],
    mal: ['brevteksten gjentar den ikke i svaret'],
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
  // K-1 B1 (#770): T5 om grenene i `strid` og referansekontrollen (#669), #776 p1 og #522.
  {
    id: 'F276',
    feilklasse:
      'en revisjon av et svar med registrert enighet gjør saken ikke forstått, som før MM-U34 punkt 11 (MM-U18 (opphevet av MM-U43))',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "  if (utenVirkning(s.erstatter)) return 'svaret viser til et element uten virkning';\n",
        "  if (s.erstatter !== null && u.spor[s.spor].enighet) return 'en revisjon i et spor med enighet';\n  if (utenVirkning(s.erstatter)) return 'svaret viser til et element uten virkning';\n",
      ],
    ],
    mal: [
      'en revisjon av en godkjenning av forholdet med registrert enighet gir ingen grunn',
      'byggherren kan revidere et svar TE har godtatt, og saken er forstått',
      'byggherren kan revidere en godkjenning av forholdet som er en endringsordre, og saken er forstått',
    ],
  },
  {
    id: 'F276b',
    feilklasse:
      'byggherren kan ikke revidere et svar TE har godtatt eller som stemmer med kravet, som før MM-U34 punkt 11',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        '      // MM-U34 punkt 11, EO-U12: også et svar TE har godtatt eller som stemmer med kravet.\n',
        "      if (s.enighet) return avvis('ENIGHET_I_SPORET', 'Partene er enige om svaret.');\n",
      ],
    ],
    mal: [
      'byggherren kan revidere et svar TE har godtatt',
      'byggherren kan revidere et svar som stemmer med kravet',
      'byggherren kan revidere en godkjenning av forholdet som er en endringsordre',
    ],
  },
  {
    id: 'F277',
    feilklasse: 'en aksept av et svar med registrert enighet gir ingen strid (GR-U8, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '  if (sporet && u.spor[sporet].enighet && u.spor[sporet].gjeldendeSvar?.id === gjelder)',
        '  if (false)',
      ],
    ],
    mal: ['en aksept av et svar med registrert enighet (GR-U8)'],
  },
  {
    id: 'F278',
    feilklasse:
      'en aksept av et svar i et trukket spor gir ingen strid (MM-U43 punkt 6, GR-U5, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['  if (sporet && u.spor[sporet].trukket)', '  if (false)']],
    mal: ['en aksept av et svar i et spor etter at kravet er trukket (MM-U43, GR-U5)'],
  },
  {
    id: 'F279',
    feilklasse:
      'et utsagn kan vise til et element uten virkning uten krav til art og part (VS-U1, MM-U43 punkt 6, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '  kontrollerHenvisningene(henvisninger, elementer, kravMedUten, besvart, bakover, ugyldig);',
        '  kontrollerHenvisningene(henvisninger, elementer, kravMedUten, besvart, bakover, ugyldig, uten);',
      ],
      [
        '  ugyldig: Ugyldig\n): void {\n  for (const x of henvisninger) {',
        '  ugyldig: Ugyldig,\n  uten: Map<string, unknown>\n): void {\n  for (const x of henvisninger) {',
      ],
      [
        '      !kanGjelde(x.art, maal, elementer[x.id].part, x.gjelder, elementer, kravMedUten)',
        '      !(uten.has(x.gjelder) || kanGjelde(x.art, maal, elementer[x.id].part, x.gjelder, elementer, kravMedUten))',
      ],
    ],
    mal: ['en innsigelse mot egen endringsordre uten virkning viser ikke til noe den kan gjelde'],
  },
  {
    id: 'F280',
    feilklasse: 'en revisjon av et svar uten virkning gir ingen strid (MM-U43 punkt 6, #669)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['  if (utenVirkning(s.erstatter))', '  if (false)']],
    mal: ['en revisjon av et svar uten virkning (MM-U43 punkt 6)'],
  },
  {
    id: 'F282',
    feilklasse: 'påberopelsen etter § 34.1.2 leses av feltet for § 32.2 (HF-U4, #522)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [
      [
        "if (typeof v.hovedkrav_varslet_i_tide === 'boolean')",
        "if (typeof v.grunnlag_varslet_i_tide === 'boolean')",
      ],
      ['i_tide: v.hovedkrav_varslet_i_tide,', 'i_tide: v.grunnlag_varslet_i_tide,'],
    ],
    mal: ['påberoper «for sent» etter § 34.1.2 etter «i tide», godtas og leses som påberopelse'],
  },
  {
    id: 'F283',
    feilklasse:
      'et svar som utelater vurderingen etter § 34.1.2, påberoper at varselet kom for sent (HF-U4, KA-U4, #522)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [
      [
        "if (typeof v.hovedkrav_varslet_i_tide === 'boolean')",
        'if (v.hovedkrav_varslet_i_tide !== true)',
      ],
      ['i_tide: v.hovedkrav_varslet_i_tide,', 'i_tide: v.hovedkrav_varslet_i_tide === true,'],
    ],
    mal: ['kontrollsak: forholdet godkjent gir ingen prinsipal grunn fra forholdet'],
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
        "['type', 'spor', 'hjemmel', 'sendt', 'korrespondansetype', 'dokumentasjon']",
        "['type', 'spor', 'hjemmel', 'sendt', 'korrespondansetype']",
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
    fil: `${K}/spor/forhold/format.ts`,
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
        "  if (k.type === 'varsel') return { dato: k.sendt, gjelder: varseletSendt(k.hjemmel), av: 'TE' };",
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
        "k.varsel ? { dato: k.varsel.sendt, gjelder: varseletSendt('33.4'), av: 'TE' } : null,",
        'null,',
      ],
    ],
    mal: ['en dato for varselet etter § 33.4 etter brevets dato avvises'],
  },
  {
    id: 'F300',
    feilklasse: 'vedleggene i varselet i fristkravet slås ikke opp (OV-U5, LV-U14)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [[": { sti: '$.varsel.', ...k.varsel }", ": { sti: '$.varsel.' }"]],
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
    mal: ['protest, påberopt passivitet og senere begrunnelse avvises fra begge parter'],
  },
  {
    id: 'F302',
    feilklasse: 'påberopt passivitet godtas i første versjon (OV-U7)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["    case 'protest':\n    case 'passivitet':\n", "    case 'protest':\n"]],
    mal: ['protest, påberopt passivitet og senere begrunnelse avvises fra begge parter'],
  },
  {
    id: 'F303',
    feilklasse: 'den senere begrunnelsen godtas i første versjon (OV-U7)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [["    case 'passivitet':\n    case 'begrunne':\n", "    case 'passivitet':\n"]],
    mal: ['protest, påberopt passivitet og senere begrunnelse avvises fra begge parter'],
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
    mal: ['en lest påberopt passivitet etter at saken er lukket etter GR-U27'],
  },
  {
    id: 'F306',
    feilklasse: 'et spor uten krav hindrer at kravene er avgjort (OV-U3, #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['(n) => !sendt(n) || u.spor[n].trukket ||', '(n) => u.spor[n].trukket ||']],
    mal: ['et spor uten krav hindrer ikke'],
  },
  {
    id: 'F307',
    feilklasse: 'kravene er avgjort uten et sendt vederlags- eller fristkrav (OV-U3, #493)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['(KRAVSPOR.some(sendt) || ', '(true || ']],
    mal: ['uten et sendt vederlags- eller fristkrav er kravene ikke avgjort'],
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
      'endringsordren krever registrert enighet i vederlag eller frist, som før MM-U34 punkt 20',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      [
        "import { innholdIForholdet, oppgittDato } from './format.ts';",
        "import { KRAVSPOR } from '../../typer.ts';\nimport { innholdIForholdet, oppgittDato } from './format.ts';",
      ],
      [
        'u.spor.forhold.gjeldendeKrav !== null && !u.forholdAvvist',
        'u.spor.forhold.gjeldendeKrav !== null && KRAVSPOR.some((n) => u.spor[n].enighet !== null) && !u.forholdAvvist',
      ],
    ],
    mal: [
      'også uten registrert enighet i noe spor, men ikke før forholdet er sendt',
      '«ingen krav» i begge spor avgjør kravene, og saken kan inngå i en endringsordre',
    ],
  },
  {
    id: 'F311b',
    feilklasse:
      'et frafall etter § 32.3 c hindrer at saken inngår i en endringsordre, som før GR-U28',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [['!u.spor.forhold.trukket;', '!u.spor.forhold.trukket && !u.frafalt;']],
    mal: [
      'også når byggherren har frafalt pålegget etter § 32.3 c (GR-U28)',
      'forholdet er avklart ved frafallet',
    ],
  },
  {
    id: 'F312',
    feilklasse:
      'et krav venter på svar og et svar står som ikke godtatt etter at avslaget av forholdet er godtatt (SK-01, #1050, #1067)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'export const sporetErLukket = (u: Utledning): boolean => u.forholdAvvist;',
        'export const sporetErLukket = (u: Utledning): boolean => u.forholdAvvist && false;',
      ],
    ],
    mal: [
      'SK-01: når TE godtar avslaget av forholdet, venter ubesvarte krav',
      'SK-01: når TE godtar avslaget av forholdet i forløp A',
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
    feilklasse: 'et trukket forhold gir «Trukket» i et spor der ingenting er sendt (GR-U25, #1137)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['u.spor[spor].trukket && sendt(u, spor)', 'u.spor[spor].trukket']],
    mal: ['et trukket forhold gir ingen betegnelse i et spor der ingenting er sendt'],
  },
  {
    id: 'F343',
    feilklasse:
      'en ubesvart forespørsel etter § 33.6.2 gir betegnelsen også når sporet er lukket (MM-U31, #1137)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      ['    !sporetErLukket(u) &&\n    u.spor.frist.foresporsler', '    u.spor.frist.foresporsler'],
    ],
    mal: ['en ubesvart forespørsel etter § 33.6.2 gir ingen betegnelse etter at avslaget'],
  },
  {
    id: 'F344',
    feilklasse:
      'en ubesvart forespørsel etter § 33.6.2 gir betegnelsen etter at forholdet er trukket (MM-U31, #1137)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['    !u.spor.forhold.trukket &&\n', '']],
    mal: [
      'en ubesvart forespørsel etter § 33.6.2 gir ingen betegnelse etter at forholdet er trukket',
    ],
  },
  {
    id: 'F313',
    feilklasse: 'svarIkkeGodtatt leser ikke at sporet er lukket (SK-01, OV-U3, #1050)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    !sporetErLukket(u) &&\n    kontrollerI(spor).svaretKanGodtas(u)',
        '    kontrollerI(spor).svaretKanGodtas(u)',
      ],
    ],
    mal: ['SK-01: når TE godtar avslaget av forholdet i forløp A'],
  },
  {
    id: 'F314',
    feilklasse:
      'et frafall står som et svar TE ikke har godtatt (GR-U9, arbeidsvalget 20.10 i #1050)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [['  svaretKanGodtas: (u) => !u.frafalt,', '  svaretKanGodtas: () => true,']],
    mal: ['GR-U9: et frafall står ikke som et svar TE ikke har godtatt'],
  },
  {
    id: 'F315',
    feilklasse:
      'tallet i svaret er ikke subsidiært når svaret på forholdet avviser ansvaret (MM-U9, OV-U32, #1050)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    s.subsidiaer.length > 0 ||\n    (s.gjeldendeSvar', '    (s.gjeldendeSvar']],
    mal: ['SK-01: når TE godtar avslaget av forholdet i forløp A'],
  },
  {
    id: 'F316',
    feilklasse:
      'frafallet skjuler et svar TE ikke har godtatt i vederlag og frist (arbeidsvalget 20.10 i #1050)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    kontrollerI(spor).svaretKanGodtas(u)\n', '    !u.frafalt\n']],
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
      'fristkravet som viser til forespørselen, leses ikke som svar på den (HF-U1, LV-U18 setning 3)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [['      if (f) Object.assign(f, { svar: krav.id, medKrav: true });', '']],
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
    mal: [
      'VS-U29: innsigelsen mot begrunnelsen',
      'etter «i tide» etter § 33.6.2 gir svaret på en senere kravversjon ikke opp innsigelsen',
    ],
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
    feilklasse: 'bare byggherrens brev vises ved kravet (OV-U62)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        '.filter((b) => b.rettetAv === null && (b.spor',
        ".filter((b) => b.avsender === 'BH' && b.rettetAv === null && (b.spor",
      ],
    ],
    mal: ['OV-U62: ved hvert krav som venter, vises begge partenes brev'],
  },
  {
    id: 'F362',
    feilklasse: 'et rettet brev vises fortsatt ved kravet (OV-U18, OV-U62)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['.filter((b) => b.rettetAv === null && (b.spor', '.filter((b) => (b.spor']],
    mal: [
      'OV-U18: brevet i feil sak rettes bort',
      'OV-U62: ved hvert krav som venter, vises begge partenes brev',
    ],
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
    endringer: [
      ['return forstaatt && elementer > 0 && dokumentasjonIBrevet(d).size === 0', 'return false'],
    ],
    mal: [
      'OV-U44: hver journalpost har én kilde',
      'OV-U19: et varsel registrert med virkning teller ikke',
      'OV-U19: en endringsordre registrert med virkning teller ikke',
    ],
  },
  {
    id: 'F367',
    feilklasse: 'et svar registrert som dokumentasjon er ikke dokumentasjon (OV-U4, OV-U19)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '...d.svar.filter((s) => !erRegistrertEndringsordre(s, d))',
        '...d.svar.filter(() => false)',
      ],
    ],
    mal: ['OV-U19: en endringsordre registrert med virkning teller ikke'],
  },
  {
    id: 'F368',
    feilklasse:
      'et registrert utsagn som ikke er et varsel, er ikke dokumentasjon (OV-U19, OV-U4, KA-U35 (opphevet av KA-U46), punkt 4 i #1167)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        "...d.utsagn.filter((x) => x.art !== 'varsel')",
        "...d.utsagn.filter((x) => x.art === 'aksept' || x.art === 'trekk')",
      ],
    ],
    mal: ['OV-U19, OV-U4: en registrert begrunnelse', 'punkt 4 i #1167: alt i et registrert brev'],
  },
  {
    id: 'F369',
    feilklasse:
      'et varsel eller en endringsordre teller ikke mens saken ikke er forstått (OV-U21, MM-U2)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'return forstaatt && elementer > 0 && dokumentasjonIBrevet(d).size === 0',
        'return elementer > 0 && dokumentasjonIBrevet(d).size === 0',
      ],
    ],
    mal: [
      'OV-U21, MM-U2: mens saken ikke er forstått',
      'OV-U44, MM-U2: en hendelse kjernen ikke forstår',
    ],
  },
  {
    id: 'F370',
    feilklasse:
      'et varsel eller en endringsordre uten virkning teller som brev appen ikke vurderer (OV-U19, MM-U19 (opphevet av MM-U43))',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        'u.ikkeVurderteBrev.length > 0;',
        'u.ikkeVurderteBrev.length > 0 || u.utenVirkning.length > 0;',
      ],
    ],
    mal: ['OV-U19, MM-U19 (opphevet av MM-U43): en endringsordre uten virkning'],
  },
  {
    id: 'F425',
    feilklasse: 'vurderingsgrunnlaget tar med en rettet registrering (OV-U44, OV-U17)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['if (!j.kilde || j.rettet || d?.ikkeISaken)', 'if (!j.kilde || d?.ikkeISaken)']],
    mal: ['OV-U44: hver journalpost har én kilde'],
  },
  {
    id: 'F427',
    feilklasse:
      'vurderingsgrunnlaget tar med rettingen om at brevet ikke hører til saken (OV-U18, svar 2B)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['if (!j.kilde || j.rettet || d?.ikkeISaken)', 'if (!j.kilde || j.rettet)']],
    mal: ['OV-U44, OV-U18: rettingen som sier at brevet ikke hører til saken'],
  },
  {
    id: 'F428',
    feilklasse:
      'vurderingsgrunnlaget viser ikke partens dato for varselet i et krav sendt herfra (HF-U1, svar 3A)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [["      j.kilde === 'sendt_herfra' &&", '      false &&']],
    mal: ['OV-U44, HF-U1: et fristkrav sendt herfra'],
  },
  {
    id: 'F430',
    feilklasse:
      'vurderingsgrunnlaget viser partens dato for varselet mens saken ikke er forstått (MM-U2, OV-U21)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [['      u.forstaatt &&', '      true &&']],
    mal: ['OV-U44, HF-U1: et fristkrav sendt herfra'],
  },
  {
    id: 'F429',
    feilklasse: 'hendelsen som oppretter saken, får ingen kilde (svar 1A)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [["          : ('sendt_herfra' as const),", '          : null,']],
    mal: ['OV-U44: hver journalpost har én kilde'],
  },
  {
    id: 'F426',
    feilklasse: '«Varsel ikke registrert» står også etter fristkravet (#1126)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        "!u.spor.frist.varsler['33.4'] && u.spor.frist.krav.length === 0",
        "!u.spor.frist.varsler['33.4']",
      ],
    ],
    mal: ['står ikke etter fristkravet'],
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
    fil: `${K}/frosset/linje.ts`,
    endringer: [
      [
        "rettidighet: `${sene.join(' og ')} kom for sent`",
        'rettidighet: `${sene[0]} kom for sent`',
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
      ["sak?.art === 'sak' && teksten.includes(`«${sak.tittel}»`)", "sak?.art === 'sak'"],
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
    mal: ['en virksom enighet og et avklart forhold gir verken'],
  },
  {
    id: 'F350',
    feilklasse: 'visningen sier at forholdet er «avklart» (MM-U23, #1136)',
    fil: `${K}/spor/forhold/visning.ts`,
    endringer: [
      [
        "    if (virkning && !u.spor.forhold.trukket) ut.push('enige');",
        "    if (u.forholdAvklart) ut.push('avklart');\n    if (virkning && !u.spor.forhold.trukket) ut.push('enige');",
      ],
    ],
    mal: ['en virksom enighet og et avklart forhold gir verken'],
  },
  {
    id: 'F351',
    feilklasse:
      'et trukket forhold gir etiketten «trukket» i et spor der ingenting er sendt (GR-U25, #1140)',
    fil: `${K}/utledning/visning.ts`,
    endringer: [
      [
        "  if (FORELIGGER.trukket(u, spor)) ut.push('trukket');",
        "  if (s.trukket) ut.push('trukket');",
      ],
    ],
    mal: ['et trukket forhold gir ikke etiketten «trukket» i et spor der ingenting er sendt'],
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
    endringer: [['if (s.varsler[hjemmel])', 'if (Object.keys(s.varsler).length)']],
    mal: ['saken har ett registrert varsel per hjemmel'],
  },
  {
    id: 'F373',
    feilklasse: 'det særskilte varselet etter § 34.1.3 avvises etter vederlagskravet (OV-U8)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      ["if ('hjemmel' in h) return null;", "if ('hjemmel' in h && !s.krav.length) return null;"],
    ],
    mal: ['det særskilte varselet kan sendes etter vederlagskravet'],
  },
  {
    id: 'F374',
    feilklasse:
      'vederlagskravet krever kravposter, også med posten etter § 34.1.3 (OV-U89 punkt 6)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [
      [
        "    anyOf: [{ required: ['kravposter'] }, { required: ['saerskilt'] }],\n",
        "    anyOf: [{ required: ['kravposter'] }],\n",
      ],
    ],
    mal: ['vederlagskravet kan ha bare posten'],
  },
  {
    id: 'F375',
    feilklasse: 'kravet uten kravposter og uten postene utenfor godtas (OV-U89 punkt 6)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [
      [
        "    anyOf: [{ required: ['kravposter'] }, { required: ['saerskilt'] }],\n",
        '    anyOf: [],\n',
      ],
    ],
    mal: ['vederlagskravet kan ha bare posten'],
  },
  {
    id: 'F376',
    feilklasse: 'en grunn etter den andre åpner ikke et nytt lag, så dagene står i lag 2 (OV-U32)',
    fil: `${K}/frosset/byggeklosser.ts`,
    endringer: [['      if (!s.oppfylt) lag++;', '      if (!s.oppfylt) lag = 2;']],
    mal: ['§ 33.4 for sent, ingen hindring og dagene står i lag 1, 2 og 3'],
  },
  {
    id: 'F377',
    feilklasse: 'et standpunkt i lag 3 regnes ikke som subsidiært (OV-U32)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [["typeof v.virkning === 'number' && v.virkning > 1", 'v.virkning === 2']],
    mal: ['§ 33.4 for sent, ingen hindring og dagene står i lag 1, 2 og 3'],
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
    endringer: [
      [
        "standpunkt: ID, lag: { type: 'integer', minimum: 1 }",
        "standpunkt: ID, lag: { type: 'integer' }",
      ],
    ],
    mal: ['formatet lagrer laget som et heltall fra 1'],
  },
  {
    id: 'F381',
    feilklasse:
      'et forhold som er både prekludert og avslått, flytter lagene i sporet bare ett lag (OV-U32, A2)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '  const forskyvning = forholdet.length;',
        '  const forskyvning = forholdet.length ? 1 : 0;',
      ],
      [
        '    return { forskyvning: grunner.length, ledd: [], henvisninger };',
        '    return { forskyvning: grunner.length ? 1 : 0, ledd: [], henvisninger };',
      ],
    ],
    mal: ['forholdet prekludert og avslått subsidiært i samme brev'],
  },
  {
    id: 'F382',
    feilklasse: 'linjen etiketterer uten forskyvningen fra forholdet (OV-U32, OV-U33, #1199)',
    fil: `${K}/frosset/frysing.ts`,
    endringer: [
      [
        'linje: beslutningslinje(svar, v, paaberopelse, forskyvning, kravet),',
        'linje: beslutningslinje(svar, v, paaberopelse, 0, kravet),',
      ],
    ],
    mal: [
      'avslått forhold gir beløpet etiketten for andre lag, som brevet',
      'prinsipalt § 32.2 og subsidiært avslag gir beløpet etiketten for tredje lag',
      'lagene i fristsporet flyttes ned hver for seg',
      'en revisjon har sitt eget beslutningsgrunnlag og viser til svaret den erstatter',
    ],
  },
  {
    id: 'F383',
    feilklasse: 'linjen ser bort fra gjeldende svar på påberopelsen før brevet (OV-U32, #1199)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['lagFraForholdet(gjeldende, gjeldende.beslutningsgrunnlag.virkninger)', '0']],
    mal: [
      'en revisjon har sitt eget beslutningsgrunnlag og viser til svaret den erstatter',
      'registrert korrespondanse fryses med forskyvningen fra gjeldende svar på påberopelsen',
    ],
  },
  {
    id: 'F384',
    feilklasse: 'et frafall av pålegget flytter lagene som et avslag (GR-U7, OV-U33)',
    fil: `${K}/spor/forhold/frysing.ts`,
    endringer: [
      [
        "if (standpunktet(svar, 'forhold')?.resultat === 'avslaatt') ut.push('avslaatt');",
        "if (standpunktet(svar, 'forhold')?.resultat !== 'godkjent') ut.push('avslaatt');",
      ],
    ],
    mal: ['et frafall av pålegget flytter ikke lagene'],
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
    feilklasse: 'leseren godtar upåvirket i svaret på forholdet (OV-U32)',
    fil: `${K}/format/leser.ts`,
    endringer: [["    (spor === 'forhold' ||", '    (false ||']],
    mal: ['upåvirket i svaret på forholdet er ikke forstått'],
  },
  {
    id: 'F389',
    feilklasse: 'leseren godtar upåvirket uten en påberopelse i sporet (OV-U33)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      ["(spor === 'forhold' || !virkninger.some(paaberoper))", "(spor === 'forhold' || false)"],
    ],
    mal: ['upåvirket uten en påberopelse i sporet er ikke forstått'],
  },
  {
    id: 'F501',
    feilklasse:
      'et standpunkt uten lag står under etiketten for et senere lag (spørsmål 8 i spørsmålsfila for #1663, OV-U32)',
    fil: `${K}/frosset/tekst.ts`,
    endringer: [
      ['.map((l) => ({ l, k: plass(l) ?? foerste }))', '.map((l) => ({ l, k: plass(l) ?? 99 }))'],
    ],
    mal: [
      'en kravpost som verken beregningsregelen byggherren ikke godtar eller innsigelsene for den rammer, er upåvirket',
    ],
  },
  {
    id: 'F391',
    feilklasse: 'en begrensning etter § 34.1.3 i første lag avviser hele vederlagskravet (VS-U5)',
    fil: `${K}/frosset/standpunkt.ts`,
    endringer: [
      [
        "(s?.art === 'rettidighet' && (s.hjemmel === '34.1.2' || !s.hjemmel.startsWith('34')))",
        "s?.art === 'rettidighet'",
      ],
    ],
    mal: ['en aksept av svaret gir prinsipalt beløp etter begrensningen, ikke 0'],
  },
  {
    id: 'F392',
    feilklasse: 'justeringen ellers er upåvirket også når forholdet er avslått (OV-U33)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [['rammer && !hele && forskyvning === 0', 'rammer && !hele']],
    mal: ['med avslått forhold er justeringen ellers i sporets første lag og ikke upåvirket'],
  },
  {
    id: 'F393',
    feilklasse: 'preklusjonen etter § 34.1.2 rammer ikke posten etter § 34.1.3 annet ledd (OV-U27)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      [
        'beloep: i + 1 < foerste ? NULL_OERE',
        'beloep: i + 1 < foerste && !erProduktivitet(post) ? NULL_OERE',
      ],
    ],
    mal: ['preklusjonen etter § 34.1.2 gjelder hele kravet, også posten'],
  },
  {
    id: 'F394',
    feilklasse:
      'beløpet etter begrensningen kan være høyere enn det byggherren godtar for posten (valg 2 i #1047)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['else if (b > godkjent)', 'else if (b > krevd)']],
    mal: ['beløpet etter begrensningen er høyere enn det byggherren godtar for posten'],
  },
  {
    id: 'F397',
    feilklasse:
      'leseren godtar poster som ikke summerer til det subsidiære beløpet (OV-U31, MM-U2)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [['if (samlet !== beloep(total))', 'if (samlet < 0n)']],
    mal: ['poster som ikke summerer til det subsidiære beløpet, er ikke forstått'],
  },
  {
    id: 'F398',
    feilklasse: 'svaret gjentar ikke byggherrens innsigelse mot det særskilte varselet (VS-U24)',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [["ogsaaInnsigelserEtter: ['34.1.3'],", 'ogsaaInnsigelserEtter: [],']],
    mal: ['svaret gjentar byggherrens egen innsigelse mot det særskilte varselet'],
  },
  {
    id: 'F399',
    feilklasse: 'en begrensning etter § 34.1.3 i et lag gir sammenfall (VS-U5, #479)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [['if (begrensningen(svar, v)) return false;', '']],
    mal: ['en begrensning i et lag gir ikke sammenfall'],
  },
  {
    id: 'F400',
    feilklasse: 'linjen gjentar etiketten for hvert standpunkt i samme lag (OV-U32)',
    fil: `${K}/frosset/linje.ts`,
    endringer: [
      [
        'if (!ordnet || lag === null || merket.has(lag)) return l.tekst;',
        'if (!ordnet || lag === null) return l.tekst;',
      ],
    ],
    mal: [
      'begge påberopt: § 34.1.2 prinsipalt',
      'med avslått forhold er justeringen ellers i sporets første lag',
    ],
  },
  {
    id: 'F401',
    feilklasse: 'linjen setter etikett når svaret har ett lag og ingen påberopelse (OV-U33)',
    fil: `${K}/frosset/linje.ts`,
    endringer: [
      ['const ordnet = ledd.some((l) => (plass(l) ?? 0) > 1);', 'const ordnet = ledd.length > 1;'],
    ],
    mal: ['uten påberopelse har svaret ett lag, og linjen har ingen etikett for postene'],
  },
  {
    id: 'F402',
    feilklasse:
      'leseren godtar et beløp etter begrensningen over det byggherren godtar for posten (valg 2 i #1047, MM-U2)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [['beloep(begrenset.begrenset)! > beloep(post.godkjent)!', 'false']],
    mal: ['et beløp etter begrensningen over det byggherren godtar for posten, er ikke forstått'],
  },
  // GR-U26, LV-U31 og OV-U33: forbeholdet for ubesvart forhold, oppgjør som fast sum og
  // metoden i laget til beløpet (#1239, #1240).
  {
    id: 'F406',
    feilklasse:
      'svaret på vederlag eller frist uten svar på forholdet har ikke forbeholdet (GR-U26)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      ['    ...forbeholdForForholdet(s, t),\n', ''],
      ['  const forbehold = forbeholdetForForholdet(s, t);', '  const forbehold: string[] = [];'],
    ],
    mal: [
      'det første svaret på vederlaget har forbeholdet',
      'forløpet i #1239',
      'forbeholdet i hvert svaravsnitt',
    ],
  },
  {
    id: 'F407',
    feilklasse: 'forbeholdet skrives når forholdet er avklart ved frafall (GR-U23, GR-U26)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['avklartVedFrafall: u.frafalt,', 'avklartVedFrafall: false,']],
    mal: ['etter et frafall er forholdet avklart mens en ny versjon venter'],
  },
  {
    id: 'F408',
    feilklasse: 'forbeholdet skrives når forholdet besvares i samme brev (GR-U26)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [["    !nytt.svar.some((x) => x.spor === 'forhold')\n", '    true\n']],
    mal: ['kontrollsak: med forholdet godkjent i samme brev har svaret ikke forbeholdet'],
  },
  {
    id: 'F409',
    feilklasse: 'brevet betegner oppgjør som fast sum som aksept av tilbudet (LV-U31)',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [
      [
        "? `byggherren godkjenner oppgjør som fast sum${post ? ` for ${post}` : ''} med beløpet og forbeholdene som fremgår av svaret.`",
        "? 'byggherren aksepterer beregningsmåten i TEs tilbud (NS 8407 § 34.2.2).'",
      ],
    ],
    mal: ['LV-U31 med lavere beløp', 'LV-U32 med hele beløpet'],
  },
  {
    id: 'F410',
    feilklasse: 'oppgjørsformen får ikke etiketten for laget sitt (OV-U33)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'plass: lag !== null ? lag + forskyvning : null,',
        "plass: lag !== null && p.art !== 'oppgjoersform' ? lag + forskyvning : null,",
      ],
      [
        '    const plass = plassen(p.id);',
        "    const plass = p.art === 'oppgjoersform' ? null : plassen(p.id);",
      ],
    ],
    mal: [
      '§ 34.1.2 «nei»: byggherren påberoper prinsipalt at varselet kom for sent',
      'avslått forhold gir beløpet etiketten for andre lag, som brevet',
    ],
  },
  {
    id: 'F411',
    feilklasse: 'en revisjon mens forholdet ikke er besvart, mister forbeholdet (GR-U26, GR-08)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      ["    s.spor !== 'forhold' &&\n", "    s.spor !== 'forhold' &&\n    !s.erstatter &&\n"],
    ],
    mal: ['GR-08: en revisjon av vederlagssvaret mens en ny påberopelsesversjon venter'],
  },
  {
    id: 'F412',
    feilklasse:
      'en påberopelse etter § 34.1.3 uten virkning begrenser posten i postlisten (presiseringen 24.10 i #1047, VS-U5)',
    fil: `${K}/spor/vederlag/frysing.ts`,
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
    feilklasse: 'postlisten mister lagene svaret på forholdet opptar foran sporet (OV-U32)',
    fil: `${K}/frosset/byggeklosser.ts`,
    endringer: [
      [
        '    const lag = virkning === undefined ? null : laget(virkning);\n    return lag === null ? null : lag + forskyvning;',
        '    const lag = virkning === undefined ? null : laget(virkning);\n    return lag;',
      ],
    ],
    mal: ['lagene fra svaret på forholdet står foran postene'],
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
    // LV-U72: svaret på fristen har dagens struktur med avsnitt per lag.
    mal: ['nevner hjemmelen etter § 32.2-preklusjonen (LV-U5)'],
  },
  {
    id: 'F415',
    feilklasse: '«godkjent» med et annet beløp enn det krevde godtas (#1301, KA-U9)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      ["    if (vurd === 'godkjent' && g !== k)", "    if (vurd === 'godkjent' && false)"],
    ],
    mal: [
      '«kravposten» vurdert «godkjent»',
      '«produktivitet» vurdert «godkjent»',
      'meldingen sier posten, vurderingen og beløpene',
      '«godkjent» med et annet beløp og «avslått» med et beløp avvises',
    ],
  },
  {
    id: 'F416',
    feilklasse: '«avslått» med et beløp som ikke er 0, godtas (#1301, KA-U9)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      [
        "    else if (vurd === 'avslaatt' && g !== NULL_OERE)",
        "    else if (vurd === 'avslaatt' && false)",
      ],
    ],
    mal: [
      '«kravposten» vurdert «avslaatt»',
      '«produktivitet» vurdert «avslaatt»',
      '«godkjent» med et annet beløp og «avslått» med et beløp avvises',
    ],
  },
  {
    id: 'F417',
    feilklasse: 'et beløp med brøkdeler av øre rundes av til hele øre (OV-U58)',
    fil: `${K}/regler/beloep.ts`,
    endringer: [
      [
        '    if (streng && tall % deler !== 0n) throw new BroekdelAvOere(`${tekst} har brøkdeler av øre`);\n',
        '',
      ],
    ],
    mal: [
      'et godkjent beløp med brøkdeler av øre avvises',
      'beløpet etter begrensningen etter § 34.1.3 med brøkdeler av øre avvises',
      'et krevd beløp med brøkdeler av øre avvises',
    ],
  },
  {
    id: 'F418',
    feilklasse: 'formkontrollen av vederlagskravet godtar brøkdeler av øre (OV-U58)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [['  if (!feil.length) feil.push(...oerefeil(innhold as Innhold));\n', '']],
    mal: ['et krevd beløp med brøkdeler av øre avvises'],
  },
  {
    id: 'F419',
    feilklasse: '«delvis» med hele det krevde beløpet godtas (#1301, KA-U42)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['(g === k || g === NULL_OERE)', '(false || g === NULL_OERE)']],
    mal: [
      '«kravposten» vurdert «delvis» med 150000 kr avvises',
      '«produktivitet» vurdert «delvis» med 40000 kr avvises',
      '«delvis» med det krevde eller 0 kr avvises for hver post',
      'F-MM-KA-U42',
    ],
  },
  {
    id: 'F420',
    feilklasse: '«delvis» med 0 kr godtas (#1301, KA-U42)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['(g === k || g === NULL_OERE)', '(g === k || false)']],
    mal: [
      '«kravposten» vurdert «delvis» med 0 kr avvises',
      '«produktivitet» vurdert «delvis» med 0 kr avvises',
      '«delvis» med det krevde eller 0 kr avvises for hver post',
      'F-MM-KA-U42',
    ],
  },
  {
    id: 'F422',
    feilklasse:
      'innsigelsen etter § 34.1.3 står som forutsetning for hele vederlagssvaret i utkastet (OV-U22, OV-U33, #1400)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [
      [
        "if (s.art === 'beloep' && s.saerskilt && paaberopt('34.1.3'))",
        "if (egen !== '34.1.3' && paaberopt('34.1.3'))",
      ],
    ],
    mal: ['§ 34.1.3 rammer bare posten etter annet ledd', 'justeringen ellers bare § 34.1.2'],
  },
  {
    id: 'F423',
    feilklasse:
      'lagene i utkastet flyttes ikke ned med lagene fra svaret på forholdet (OV-U32, OV-U33, #1400)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [["typeof vi === 'number' ? vi + grunner.length : vi", 'vi']],
    mal: [
      'beløpet står subsidiært, bare med avslaget foran',
      'preklusjon etter § 32.2 og avslag står foran sporet',
      'de samme lagene som brevet fryser',
    ],
  },
  {
    id: 'F424',
    feilklasse:
      'grunnene fra svaret på forholdet står ikke som forutsetninger i utkastet (S2-A i #1400)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [['rammer.push(...grunner.map((grunn) => ({ grunn })));', '']],
    mal: [
      'beløpet står subsidiært, bare med avslaget foran',
      'preklusjon etter § 32.2 og avslag står foran sporet',
    ],
  },
  {
    id: 'F431',
    feilklasse:
      'varselet etter § 32.2 kan ikke registreres med samme dag som påberopelsen (VS-U38)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [['  if (dag > paaberopelsen)', '  if (dag >= paaberopelsen)']],
    mal: ['datoen kan ikke være senere enn påberopelsen'],
  },
  {
    id: 'F432',
    feilklasse:
      'varselet etter § 32.2 registreres der varslingsplikten ikke gjelder kategorien (VS-U39)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      ['if (!gjelderVarslingsplikten(u.spor.forhold.gjeldendeKrav, regler))', 'if (false)'],
    ],
    mal: ['registreres bare der varslingsplikten'],
  },
  {
    id: 'F433',
    feilklasse:
      'byggherren tilbys innsigelse mot det registrerte varselet etter § 32.2, som ikke har brevtekst (S-4 i #807)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [["u.spor.forhold.varsler['32.2']?.id === gjelder", 'false']],
    mal: ['byggherren tilbys ikke innsigelse mot det registrerte varselet'],
  },
  {
    id: 'F434',
    feilklasse: 'vedleggene ved påberopelsen slås ikke opp (VS-U38, LV-U14)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [["? { sti: '$.', dokumentasjon: k.dokumentasjon }", "? { sti: '$.' }"]],
    mal: ['påberopelsen lagrer vedlegget med ID, filnavn og sum'],
  },
  {
    id: 'F435',
    feilklasse: 'et fristkrav godtar vedlegg utenfor varselet (VS-U38, OV-U5)',
    fil: `${K}/kommandoer/kommando.ts`,
    endringer: [["if (!form.vedleggVedKravet && 'dokumentasjon' in k)", 'if (false)']],
    mal: ['et vedlegg ved et fristkrav utenfor varselet avvises i formen'],
  },
  {
    id: 'F436',
    feilklasse:
      'et registrert svar etter frafallet tar bort at forholdet er avklart ved frafallet mens en ny versjon venter (GR-U20, GR-U23, OV-U4, #1388)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      [
        'spor.forhold.svar.filter((s) => sendtFraAppen({ elementer }, s)).at(-1);',
        'spor.forhold.svar.at(-1);',
      ],
    ],
    mal: ['en registrert endringsordre som godkjenner versjon 2 og en ny versjon 3'],
  },
  {
    id: 'F437',
    feilklasse: 'løsningens brev får det høyeste nummeret i saken, ikke det neste (LV-U44, LV-U45)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      ['Math.max(0, ...lest', 'Math.max(1, ...lest'],
      ['(h.dokument.brevnummer ?? 0) : 0))) + 1', '(h.dokument.brevnummer ?? 0) : 0))) + 0'],
    ],
    mal: ['løsningens brev får nummeret etter det høyeste i saken'],
  },
  {
    id: 'F438',
    feilklasse: 'leseren godtar en påberopelse med tittelen for et annet forhold (GR-U31, #1533)',
    fil: `${K}/frosset/brevtittel.ts`,
    endringer: [
      ['if (forventet ? !somForventet : paaberoper)', 'if (forventet ? !paaberoper : paaberoper)'],
    ],
    mal: ['en påberopelse med tittelen for et annet forhold er ikke forstått'],
  },
  {
    id: 'F441',
    feilklasse: 'leseren godtar tekst etter forholdet i påberopelsens tittel (GR-U31, #1533)',
    fil: `${K}/frosset/brevtittel.ts`,
    endringer: [['SAKSKODE_ETTER_TITTELEN.test(tittel.slice(forventet.length))', 'true']],
    mal: ['en påberopelse med tittelen for et annet forhold er ikke forstått'],
  },
  {
    id: 'F439',
    feilklasse:
      'leseren godtar en tittel i et brev løsningen ikke gir en tittel (MM-U3, MM-U50, #1533)',
    fil: `${K}/frosset/brevtittel.ts`,
    endringer: [['if (lagBrevtittel(d) === null)', 'if (false)']],
    mal: ['en bestridelse med tittelen fra innsigelsen er ikke forstått'],
  },
  {
    id: 'F440',
    feilklasse: 'brevtittelen fryses uten sakens kode (LV-U27, LV-U44)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['tittel && medSakskode(tittel, sakskode)', 'tittel']],
    mal: ['tittelen har sakens kode uten utfylling, og leseren forstår den'],
  },
  {
    id: 'F442',
    feilklasse: 'henvisningen bruker brevnummeret, ikke merkingen frosset på brevet (LV-U53)',
    fil: `${K}/frosset/brevdeler.ts`,
    endringer: [['`brev ${d.merking} av', '`brev ${d.brevnummer} av']],
    mal: ['et brev fra løsningen omtales med merkingen og datoen'],
  },
  {
    id: 'F443',
    feilklasse: 'registrert korrespondanse omtales med feil type (LV-U42)',
    fil: `${K}/frosset/brevdeler.ts`,
    endringer: [["{ brev: 'brev', e_post: 'e-post' }", "{ brev: 'brev', e_post: 'brev' }"]],
    mal: ['registrert korrespondanse omtales med parten, typen og datoen'],
  },
  {
    id: 'F444',
    feilklasse: 'leseren godtar registrert korrespondanse uten typen (LV-U42, MM-U2)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      [
        'if (erRegistrert(dokument.opplysninger) !== (data.korrespondansetype !== undefined))',
        'if (!erRegistrert(dokument.opplysninger) && data.korrespondansetype !== undefined)',
      ],
    ],
    mal: [
      'registrert korrespondanse uten typen, og typen i et brev fra løsningen, er ikke forstått',
    ],
  },
  {
    id: 'F445',
    feilklasse: 'brevteksten omtaler saken med sak-ID-en, ikke koden (S3 i #1497, LV-U44)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      ['sak: `sak ${sakensKode(saken.sakskode)} («', 'sak: `sak ${saken.tittel.length} («'],
    ],
    mal: ['et brev fra løsningen omtales med merkingen og datoen'],
  },
  {
    id: 'F446',
    feilklasse: 'merkingen i henvisningen har to sifre i løpenummeret (LV-U53, LV-U48)',
    fil: `${K}/frosset/brevtittel.ts`,
    // Skrivingen og leseren endres sammen; ellers stopper selvkontrollen i skrivingen brevet (MM-U2).
    endringer: [
      ['utfylt(s.loepenummer, 3)', 'utfylt(s.loepenummer, 2)'],
      ['(00[1-9]|0[1-9]\\\\d|[1-9]\\\\d{2,})', '(0[1-9]|[1-9]\\\\d+)'],
    ],
    mal: [
      'merkingen i henvisningen har sakens kode og tre sifre i løpenummeret',
      'brevmerkingen har tre sifre i løpenummeret og to i brevnummeret',
    ],
  },
  {
    id: 'F447',
    feilklasse:
      'merkingen fryses ikke med forkortelsen prosjektet har når brevet skrives (LV-U53, LV-U24)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        'brevmerking(kontekst.kontraktsforkortelse, kontekst.sakskode, brevnummer)',
        "brevmerking('K201', kontekst.sakskode, brevnummer)",
      ],
    ],
    mal: ['henvisningen beholder merkingen fra brevet når kontraktsforkortelsen er endret etterpå'],
  },
  {
    id: 'F448',
    feilklasse: 'leseren godtar en merking som ikke slutter med brevnummeret (LV-U48, MM-U2)',
    fil: `${K}/frosset/brevtittel.ts`,
    endringer: [
      ["    return 'merkingen slutter ikke med brevnummeret (LV-U48)';", '    return null;'],
    ],
    mal: ['en merking som ikke slutter med brevnummeret, eller står uten nummeret'],
  },
  // #1489: varselet etter § 32.2 er det første grunnlagskravet (VS-U43 punkt 6 og 10).
  {
    id: 'F449',
    feilklasse: 'påberopelsen etter § 32.2 gjelder versjonen svaret gjelder (VS-U43 punkt 6)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        "forholdsstandpunkter(v, varseletForNyttSvar(u, '32.2'), nyId)",
        'forholdsstandpunkter(v, _krav.id, nyId)',
      ],
    ],
    mal: ['svaret på versjon 2 påberoper varselet i den første versjonen'],
  },
  {
    id: 'F450',
    feilklasse:
      'en lagret påberopelse etter § 32.2 som viser til en senere versjon, forstås (VS-U43 punkt 6)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '  if (erVarselhjemmel(p.hjemmel) && !erKravpostvarselhjemmel(p.hjemmel)) {\n    const n',
        "  if (p.hjemmel !== '32.2' && erVarselhjemmel(p.hjemmel) && !erKravpostvarselhjemmel(p.hjemmel)) {\n    const n",
      ],
    ],
    mal: ['en lagret påberopelse etter § 32.2 som viser til versjon 2, gjør saken ikke forstått'],
  },
  {
    id: 'F451',
    feilklasse: 'brevet nevner ikke brevet med det første grunnlagskravet (VS-U43 designdelen)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        'const omVarselet = `${VARSELET_I_SVARET[p.hjemmel]} i ${j.brevet(j.dokumentetTil(p.gjelder))}`;',
        'const omVarselet = `${VARSELET_I_SVARET[p.hjemmel]} i ${j.brevet(krav.dokument)}`;',
      ],
    ],
    mal: ['svaret på versjon 2 påberoper varselet i den første versjonen'],
  },
  {
    id: 'F452',
    feilklasse:
      'svaret på grunnlaget tilbys og skrives med et registrert varsel etter § 32.2 som ikke har brevtekst (VS-U43 E3, #1600)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      ["  return registrert && varseletForNyttSvar(u, '32.2') === registrert.id", '  return false'],
    ],
    mal: [
      'byggherrens svar på grunnlaget når varselet etter § 32.2 er registrert',
      'revisjonen av svaret på grunnlaget etter at varselet etter § 32.2 er registrert',
    ],
  },
  {
    id: 'F453',
    feilklasse:
      'sperren for et registrert varsel etter § 32.2 mangler i revisjonen og stopper svaret i de andre sporene (VS-U43 E3, #1600)',
    fil: `${K}/kommandoer/forutsetninger.ts`,
    endringer: [
      [
        "      return forutsetningerI(h.spor).svaret(u, 'Revisjonen');",
        "      return h.spor === 'forhold' ? null : forutsetningerI(h.spor).svaret(u, 'Revisjonen');",
      ],
      [
        "      return forutsetningerI(h.spor).svaret(u, 'Svaret');",
        "      return forutsetningerI('forhold').svaret(u, 'Svaret');",
      ],
    ],
    mal: ['revisjonen av svaret på grunnlaget etter at varselet etter § 32.2 er registrert'],
  },
  {
    id: 'F454',
    feilklasse:
      'kravet sendt mens forespørselen etter § 33.6.2 er ubesvart, viser ikke til den (HF-U1, #1567)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['...(foresporsel ? { gjelder: foresporsel.foresporsel } : {}),', '']],
    mal: ['kravet sendt mens forespørselen er ubesvart, viser til den'],
  },
  {
    id: 'F455',
    feilklasse:
      'et lest fristkrav uten henvisning til den ubesvarte forespørselen godtas (HF-U1, #1567)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      k.gjelder === undefined &&', '      false &&']],
    mal: ['fristkrav uten henvisning til den ubesvarte forespørselen'],
  },

  // #1308: TEs korrigering av datoen etter punkt 10 og 11 i samlevedtaket for retting av sendt
  // brev (MM-U41 (opphevet av MM-U52)), i en lukket sak (MM-U51), og den nye grunnlagsversjonen (LV-U56).
  {
    id: 'F456',
    feilklasse:
      'korrigeringen godtas med henvisning til noe annet enn TEs siste opplysning (arbeidsvalget i #1308)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [['  return siste.id === gjelder', '  return siste.id === gjelder || true']],
    mal: [
      'korrigeringen avvises når henvisningen er ugyldig',
      'en ny korrigering viser til den forrige',
      'F-MM-KORR1',
    ],
  },
  {
    id: 'F457',
    feilklasse: 'korrigeringen godtas med uendret dato (arbeidsvalget i #1308)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        '  return sisteDatoopplysning(u, felt)?.dato === dato',
        '  return sisteDatoopplysning(u, felt)?.dato === null',
      ],
    ],
    mal: ['korrigeringen avvises når datoen er uendret', 'F-MM-KORR1'],
  },
  {
    id: 'F458',
    feilklasse: 'en ny grunnlagsversjon kan endre datoen (MM-U41 (opphevet av MM-U52) punkt 10)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        '  if (felt === null || siste === null || k.innhold[felt] === siste.dato) return null;',
        '  if (felt === null || siste === null || k.innhold[felt] !== null) return null;',
      ],
    ],
    mal: ['en ny grunnlagsversjon kan ikke endre datoen', 'F-MM-KORR3'],
  },
  {
    id: 'F459',
    feilklasse: 'korrigeringen avvises i en sak lukket etter GR-U27 (MM-U51)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        '  const krav = u.spor.forhold.gjeldendeKrav;\n  if (!krav)',
        "  const krav = u.spor.forhold.gjeldendeKrav;\n  if (u.forholdAvvist) return avvis('FORHOLD_AVVIST', '');\n  if (!krav)",
      ],
    ],
    mal: ['F-MM-KORR1'],
  },
  {
    id: 'F460',
    feilklasse:
      'korrigeringen viser ikke til brevet med opplysningen (MM-U41 (opphevet av MM-U52) punkt 10, LV-U53)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '. I ${j.brevet(dokument)} oppga totalentreprenøren ${norskDato(tidligere)}.`;',
        '. Totalentreprenøren oppga tidligere ${norskDato(tidligere)}.`;',
      ],
    ],
    mal: ['brevet har teksten i punkt 10', 'i svikt og andre forhold gjelder korrigeringen'],
  },
  {
    id: 'F462',
    feilklasse:
      'svaret leses som om det gjaldt TEs senere opplysning (MM-U41 (opphevet av MM-U52) designdelen og punkt 11)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['versjonen(o.id) < versjonen(b.svar.id)', 'versjonen(o.id) > 0']],
    mal: ['den nye opplysningen gjelder straks', 'F-MM-KORR1', 'F-MM-KORR2'],
  },
  {
    id: 'F463',
    feilklasse:
      'korrigeringen i underkategorien endringsordre avvises ikke som en kategori uten dato (MM-U41 (opphevet av MM-U52) punkt 10)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [["      'INGEN_DATO_I_KATEGORIEN',", "      'UGYLDIG_KORRIGERING',"]],
    mal: ['korrigeringen avvises i underkategorien endringsordre', 'F-MM-KORR4'],
  },
  {
    id: 'F464',
    feilklasse:
      'en ny kravversjon som gjengir datoen, leses som en ny opplysning (MM-U41 (opphevet av MM-U52) punkt 10)',
    fil: `${K}/spor/forhold/utledning.ts`,
    endringer: [
      [
        "typeof dato !== 'string' || sisteOm(felt)?.dato === dato) continue;",
        "typeof dato !== 'string') continue;",
      ],
    ],
    mal: ['en ny grunnlagsversjon kan ikke endre datoen'],
  },
  {
    id: 'F465',
    feilklasse: 'brevet med korrigeringen av datoen får ingen tittel (LV-U55)',
    fil: `${K}/frosset/brevtittel.ts`,
    endringer: [
      ["x.art === 'innsigelse' ||\n      x.art === 'korrigering'\n", "x.art === 'innsigelse'\n"],
    ],
    mal: ['brevet har tittelen «Korrigering av datoen i sak <kode>»'],
  },
  {
    id: 'F466',
    feilklasse: 'TEs forklaring i korrigeringen av datoen kommer ikke med i brevet (MM-U53)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [
      [
        "if (k.utdypning !== undefined) utdypninger.set(id, { utdypning: k.utdypning });\n      return { utsagn: [{ id, art: 'korrigering'",
        "return { utsagn: [{ id, art: 'korrigering'",
      ],
    ],
    mal: ['TEs forklaring står i fritekst under den vedtatte teksten'],
  },
  {
    id: 'F467',
    feilklasse:
      'lagene i et sendt svar følger det siste svaret på forholdet, ikke brevet (OV-U32, OV-U33, #1449)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    b.forholdssvaret = kilde?.id ?? null;',
        '    b.forholdssvaret = forhold.at(-1)?.id ?? null;',
      ],
    ],
    mal: [
      'forholdet godkjent og revidert til avslått etter brevet: posten har fortsatt ingen lag',
      'forholdet avslått og revidert til godkjent etter brevet: posten står fortsatt subsidiært',
    ],
  },
  {
    id: 'F468',
    feilklasse: 'svaret på forholdet i samme brev står ikke foran sporet (OV-U32, OV-U33, #1449)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['      forhold.find((g) => g.dokument === s.dokument) ??\n', '']],
    mal: ['forholdet avslått i samme brev: svaret i brevet står foran, og posten subsidiært'],
  },
  {
    id: 'F469',
    feilklasse: 'grunnene fra forholdet foran sporet får feil lag (OV-U32, LV-U4 punkt 4, #1449)',
    fil: `${K}/frosset/byggeklosser.ts`,
    endringer: [['grunn: (i) => plass(i + 1)', 'grunn: (i) => plass(i)']],
    mal: ['avslag og påberopt preklusjon etter § 32.2 opptar første og andre lag, posten tredje'],
  },

  // #1615: en ny versjon av påberopelsen (LV-U56) og endringsordren som står (MM-U52 punkt 14).
  {
    id: 'F470',
    feilklasse: 'en ny påberopelsesversjon kan endre endringsordren (MM-U52 punkt 14)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      ['  if (tekst(k.innhold.endringsordre) !== forrige.endringsordre)', '  if (false)'],
    ],
    mal: [
      'en annen endringsordre med uendret underkategori',
      'meldingen ved en annen endringsordre',
    ],
  },
  {
    id: 'F471',
    feilklasse:
      'en ny påberopelsesversjon nevner ikke de tidligere datoene etter en korrigering (LV-U56)',
    fil: `${K}/spor/forhold/tekst.ts`,
    endringer: [
      [
        '    const tidligere = nyVersjon ? opplysninger.slice(0, -1) : [];',
        '    const tidligere = opplysninger.slice(0, 0);',
      ],
    ],
    mal: [
      'en ny grunnlagsversjon kan ikke endre datoen',
      'nevner hver tidligere dato, den opprinnelige først',
      'nevner datoen i en versjon fra en annen skriver',
    ],
  },
  {
    id: 'F472',
    feilklasse: 'de tidligere datoene står ikke med den opprinnelige først (LV-U56)',
    fil: `${K}/spor/forhold/tekst.ts`,
    endringer: [
      [
        '    const tidligere = nyVersjon ? opplysninger.slice(0, -1) : [];',
        '    const tidligere = nyVersjon ? opplysninger.slice(0, -1).reverse() : [];',
      ],
    ],
    mal: ['nevner hver tidligere dato, den opprinnelige først'],
  },
  {
    id: 'F473',
    feilklasse:
      'en ny påberopelsesversjon gjentar teksten i det første brevet, med varselet etter punkt 32.2 (LV-U56)',
    fil: `${K}/spor/forhold/tekst.ts`,
    endringer: [['  const nyVersjon = k.erstatter !== null;', '  const nyVersjon = false;']],
    mal: [
      'underkategorien endringsordre har ingen dato',
      'en ny grunnlagsversjon kan ikke endre datoen',
    ],
  },
  {
    id: 'F474',
    feilklasse: 'en ny påberopelsesversjon sier at den erstatter det tidligere kravet (LV-U56)',
    fil: `${K}/spor/forhold/tekst.ts`,
    endringer: [['  nevnerErstattet: false,', '  nevnerErstattet: true,']],
    mal: ['underkategorien endringsordre har ingen dato'],
  },
  {
    id: 'F475',
    feilklasse:
      'en ny versjon av vederlags- eller fristkravet viser ikke til kravet den erstatter (KA-U52 punkt 4)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '  if (k.erstatter && brevtekstI(k.spor).nevnerErstattet)',
        '  if (k.erstatter && !brevtekstI(k.spor).nevnerErstattet)',
      ],
    ],
    mal: ['en ny kravversjon viser til den den erstatter'],
  },
  {
    id: 'F476',
    feilklasse: 'en ny kravversjon kan utelate en kravpost uten å trekke den (KA-U56)',
    fil: `${K}/spor/poster/utledning.ts`,
    endringer: [['  return mangler.length\n', '  return mangler.length && false\n']],
    mal: ['verken tar med eller trekker P1'],
  },
  {
    id: 'F549',
    feilklasse: 'en trukket kravpost avvises når den tas med igjen (KA-U75)',
    fil: `${K}/spor/poster/utledning.ts`,
    endringer: [
      [
        '    if (id !== undefined && !kjent && !lagret)',
        '    if (id !== undefined && !forrige.has(id) && !lagret)',
      ],
    ],
    mal: ['en trukket kravpost kan tas med igjen'],
  },
  {
    id: 'F551',
    feilklasse:
      'en kravpost som tas med igjen, sammenlignes med forrige versjon, der den mangler (KA-U75)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [
      [
        '    const somFoer = [...tidligere]\n      .reverse()',
        '    const somFoer = tidligere\n      .slice(-1)',
      ],
    ],
    mal: ['kan vise til varselet den viste til før trekket'],
  },
  {
    id: 'F552',
    feilklasse:
      'det egne varselet går foran kravet som er det første varselet, også når kravet er tidligere (VS-U66)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '  return [s.varsler[hjemmel], kravet].filter((v) => v !== undefined);',
        '  return [s.varsler[hjemmel] ?? kravet].filter((v) => v !== undefined);',
      ],
    ],
    mal: ['et eget varsel registrert etter det første fristkravet, skjuler ikke kravet'],
  },
  {
    id: 'F554',
    feilklasse:
      'leseren forstår et punkt i brevteksten der overskriften ikke står først i den låste delen (MM-U2, LV-U70)',
    fil: `${K}/format/leser.ts`,
    endringer: [
      ['(a.laast !== a.overskrift && !a.laast.startsWith(`${a.overskrift}\\n\\n`))', 'false'],
    ],
    mal: ['en overskrift som ikke står først, gjør saken ikke forstått'],
  },
  {
    id: 'F556',
    feilklasse:
      'leseren forstår to avsnitt i brevteksten for samme punkt i et element (MM-U2, LV-U70)',
    fil: `${K}/format/leser.ts`,
    endringer: [['if (sett.has(`${a.gjelder}\\u0000${a.punkt}`))', 'if (false)']],
    mal: ['avsnitt som ikke står etter hverandre per punkt'],
  },
  {
    id: 'F558',
    feilklasse:
      'leseren forstår et avsnitt med punkt for et element som verken er et krav eller et svar (MM-U2, LV-U70)',
    fil: `${K}/format/leser.ts`,
    endringer: [["!dokument.svar.some((s) => s.id === a.gjelder && s.spor !== 'frist')", 'false']],
    mal: ['et avsnitt med punkt for et element som ikke er et krav'],
  },
  {
    id: 'F559',
    feilklasse:
      'påberopelsen og punktet om varselet gjelder det egne varselet også når det første kravet er sendt før (VS-U70, VS-U66)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        'return varselet === null || kravetSendt < varselet ? kravet.id : eget.id;',
        'return varselet === null ? kravet.id : eget.id;',
      ],
    ],
    mal: ['et eget varsel datert etter det første kravet: det første kravet'],
  },
  {
    id: 'F560',
    feilklasse:
      'leseren godtar bare det egne varselet i påberopelsen, ikke det første kravet som ble sendt før det (VS-U70)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      ['if (p.gjelder !== tidligste && p.gjelder !== egetFoerst)', 'if (p.gjelder !== egetFoerst)'],
    ],
    mal: ['byggherrens påberopelse etter § 34.1.2 gjelder det første kravet'],
  },
  {
    id: 'F557',
    feilklasse:
      'brevteksten mister en utdypning for et punkt brevet ikke har, i stedet for å avvise kommandoen (LV-U71)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['    if (ukjent.length)', '    if (false)']],
    mal: ['en utdypning for et punkt brevet ikke har, avvises'],
  },
  {
    id: 'F555',
    feilklasse:
      'vederlagskravet nevner varselet etter § 34.1.2 der varslingsplikten ikke gjelder forholdet (VS-U3, OV-U15, #1824)',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [["if (hjemmelenGjelder('34.1.2', saken.paaberopelse, regler))", 'if (true)']],
    mal: ['ved en endring nevner kravet ikke varselet etter punkt 34.1.2'],
  },
  {
    id: 'F553',
    feilklasse:
      'leseren forstår en merking som slutter med brevnummeret, men ikke har formen fra brevmerkingen (LV-U44, LV-U48, #1588)',
    fil: `${K}/frosset/brevtittel.ts`,
    endringer: [
      ["  if (!MERKINGEN.test(merking.slice(0, merking.lastIndexOf('-'))))", '  if (false)'],
    ],
    mal: ['som ikke har formen fra brevmerkingen, er ikke forstått'],
  },
  {
    id: 'F550',
    feilklasse: 'en trukket kravpost som tas med igjen, får ikke betegnelsen sin tilbake (KA-U75)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [
      [
        '    tidligere.flatMap((k) => kravposterI(k)).map((p) => [p.id, p.betegnelse])',
        '    (tidligere.length ? kravposterI(tidligere.at(-1)!) : []).map((p) => [p.id, p.betegnelse])',
      ],
    ],
    mal: ['en trukket kravpost kan tas med igjen'],
  },
  {
    id: 'F478',
    feilklasse: 'en ny kravpost får en betegnelse som er brukt før i sporet (KA-U53, KA-U75)',
    fil: `${K}/spor/poster/utledning.ts`,
    endringer: [
      [
        '  return new Set(versjoner.flatMap((poster) => poster.map((p) => p.betegnelse)));',
        '  return new Set((versjoner.at(-1) ?? []).map((p) => p.betegnelse));',
      ],
    ],
    mal: ['en trukket kravpost kan tas med igjen'],
  },
  {
    id: 'F479',
    feilklasse: 'kravposten er varselet etter punkt 34.4 også i en senere versjon (VS-U48)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [
      [
        '    if (hjemmel === null || hattFoer(p, hjemmel, tidligere)) continue;',
        '    if (hjemmel === null) continue;',
      ],
    ],
    mal: ['er varselet i den første versjonen den står i'],
  },
  {
    id: 'F481',
    feilklasse:
      'svaret godkjenner et beløp for en kravpost etter en beregningsregel (OV-U95 punkt 5, #1663)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      ['    if (regelen(p)) {\n      const grunn =', '    if (false) {\n      const grunn ='],
    ],
    mal: ['byggherren som godtar beregningsregelen, tar ikke stilling til et beløp'],
  },
  {
    id: 'F482',
    feilklasse: 'et varsel før det første kravet gjelder ikke kravpostene i det kravet (D-16)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [['(tidligere.length ? undefined : varsler.find(', '(undefined && varsler.find(']],
    mal: [
      'et varsel sendt før det første kravet gjelder',
      'et varsel registrert før det første kravet',
    ],
  },
  {
    id: 'F483',
    feilklasse: 'et varsel etter punkt 34.4 gjelder kravpostene med justerte enhetspriser (D-16)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [["    ? '34.4'\n", "    ? '34.3.3'\n"]],
    mal: ['et varsel registrert før det første kravet'],
  },
  {
    id: 'F484',
    feilklasse: 'et varsel etter det første kravet gjelder en ny kravpost uten valg (D-16, D-19)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [['(tidligere.length ? undefined : varsler', '(varsler']],
    mal: ['et varsel etter det første kravet gjelder ikke en ny kravpost'],
  },
  {
    id: 'F485',
    feilklasse: 'saken kan bare ha ett varsel etter punkt 34.3.3 og 34.4 (VS-U48, VS-U52)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [['    if (erKravpostvarselhjemmel(hjemmel)) continue;\n', '']],
    mal: ['saken kan ha flere varsler etter punkt 34.3.3 og 34.4'],
  },
  {
    id: 'F486',
    feilklasse: 'byggherren kan sende innsigelse mot varselet etter punkt 34.3.3 før økt 2 (G-9)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [['u.spor.vederlag.kravpostvarsler.some((v) => v.id === gjelder)', 'false']],
    mal: ['byggherrens innsigelse mot varselet etter punkt 34.3.3 eller 34.4 venter'],
  },
  {
    id: 'F487',
    feilklasse:
      'kravet viser ikke til varselet etter punkt 34.4 gitt før det første kravet (VS-U55)',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [
      [
        "gitt(varselet, 'Varselet før regningsarbeidet settes i gang (NS 8407 punkt 34.4)', t)",
        "''",
      ],
    ],
    mal: ['et varsel sendt før det første kravet gjelder'],
  },
  {
    id: 'F490',
    feilklasse:
      'en påberopelse etter § 34.1.3 mot rigg og drift godtas og forsvinner (OV-U89 punkt 9)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      ['else if (p.varslet_i_tide !== null && p.varslet_i_tide !== undefined)', 'else if (false)'],
    ],
    mal: ['en påberopelse etter § 34.1.3 mot rigg og drift avvises'],
  },
  {
    id: 'F491',
    feilklasse: 'et ukjent felt i vurderingene i svaret på vederlaget godtas uten virkning (MM-U2)',
    fil: `${K}/frosset/byggeklosser.ts`,
    endringer: [['  if (ukjente.length)', '  if (false)']],
    mal: ['et ukjent felt i vurderingene i svaret på vederlaget avvises'],
  },
  {
    id: 'F502',
    feilklasse: 'et svar på en kravpost kravet ikke har, godtas uten virkning (OV-U23)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [
      [
        '    if (!post)\n      throw new UgyldigVurdering({\n',
        '    if (!post) continue;\n    if (false)\n      throw new UgyldigVurdering({\n',
      ],
    ],
    mal: ['en kravpost kravet ikke har avvises med UGYLDIG_VURDERING'],
  },
  {
    id: 'F503',
    feilklasse: 'det siste svaret på en kravpost som er besvart to ganger, gjelder (KA-U57 (d))',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [['    if (svarene.has(post.id))\n', '    if (false)\n']],
    mal: ['samme kravpost to ganger avvises med UGYLDIG_VURDERING'],
  },
  {
    id: 'F504',
    feilklasse: 'et ukjent felt i svaret på en kravpost godtas uten virkning (MM-U2)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [['    if (ukjent)\n', '    if (false)\n']],
    mal: ['et felt kjernen ikke leser i svaret på kravposten avvises med UGYLDIG_VURDERING'],
  },
  {
    id: 'F505',
    feilklasse:
      'svaret godtar beregningsregelen og krever samtidig tilbud for kravposten (KA-U71, #1663)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['  else if (kreverTilbud && p.aksepterer !== false)', '  else if (false)']],
    mal: ['kravet om tilbud kan ikke stå sammen med en godtatt beregningsregel'],
  },
  {
    id: 'F506',
    feilklasse:
      'brevet sier ikke hvilken kravpost beløpet gjelder når kravet har flere (KA-U57 (c))',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [['...(alle.length > 1 ? { foerst:', '...(false ? { foerst:']],
    mal: ['svaret på to kravposter med fast sum navngir kravposten'],
  },
  {
    id: 'F507',
    feilklasse:
      'utfallet sier ikke at en kravpost ikke har fast beløp prinsipalt (OV-U73, svar 6 A i #1663)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [['...(uten.length ? { uten_fast_beloep: uten } : {})', '...{}']],
    mal: ['svaret på to kravposter med fast sum navngir kravposten'],
  },
  {
    id: 'F508',
    feilklasse:
      'linjen sier ikke hvilken kravpost standpunktet gjelder når kravet har flere (KA-U57 (c) og (d))',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [['    kravposter.length > 1 ? kravposter.find', '    false ? kravposter.find']],
    mal: ['svaret på to kravposter med fast sum navngir kravposten'],
  },
  {
    id: 'F509',
    feilklasse:
      'lagene skjemaet får fra kjernen, sier ikke hvilken kravpost de gjelder (KA-U57 (c) og (d))',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [
      [
        "        ...((s.art === 'beloep' || s.art === 'oppgjoersform' || s.art === 'justering') &&\n        s.gjelder !== undefined",
        '        ...(false &&\n        s.gjelder !== undefined',
      ],
    ],
    mal: [
      'med to kravposter sier hvert lag for beløpet og oppgjørsformen hvilken kravpost det gjelder',
    ],
  },
  {
    id: 'F492',
    feilklasse:
      'et svar på vederlaget med beløp for andre poster enn dem kravet har, er forstått (OV-U23)',
    fil: `${K}/utledning/utled.ts`,
    endringer: [
      [
        '    if (krav?.spor === s.spor) kontrollerI(s.spor).svaret(s, krav, ugyldig);',
        '    void krav;',
      ],
    ],
    mal: [
      'beløpet viser til en kravpost som ikke står i kravet',
      'beløpet for kravposten er ført som posten etter § 34.1.3 annet ledd',
    ],
  },
  {
    id: 'F493',
    feilklasse: 'en tilbakeholdelse som ikke er boolsk, godtas som ingen tilbakeholdelse (MM-U2)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [
      [
        "  if ((v.hold_tilbake ?? false) !== false) return 'hold_tilbake er verken true eller false';",
        '  void 0;',
      ],
    ],
    mal: ['tilbakeholdelse etter § 30.2 med en verdi som ikke er boolsk'],
  },
  {
    id: 'F494',
    feilklasse: 'et tilbud som ikke er akseptert, gir et eget lag for beløpet i svaret (KA-U72)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [
      [
        "      if ('gjelder' in s && s.gjelder !== undefined && tilbudet.has(s.gjelder)) return foerste;",
        "      if (s.art === 'beloep' && s.godkjent === undefined) return foerste + 1;\n      if ('gjelder' in s && s.gjelder !== undefined && tilbudet.has(s.gjelder)) return foerste;",
      ],
    ],
    mal: ['F-MM-V-34-2-2-nei', 'tilbudet ikke akseptert og § 34.1.3 påberopt'],
  },
  {
    id: 'F495',
    feilklasse:
      'en kravpost der tilbudet ikke er akseptert, får 0 kr i utregningen, som et avslag (KA-U72, OV-U73)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      [
        'const godkjent =\n      ikkeAkseptert(post) || regelen(post)\n        ? null',
        'const godkjent =\n      ikkeAkseptert(post) || regelen(post)\n        ? NULL_OERE',
      ],
    ],
    mal: ['svaret lagres med standpunktet til beløpet uten beløp og ett lag uten beløp'],
  },
  {
    id: 'F496',
    feilklasse: 'utfallet regner med en kravpost uten fast beløp (KA-U72, OV-U73)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [
      [
        '    else if (!p.saerskilt && ((p.lag ?? 1) > 1 || p.godkjent === undefined))',
        '    else if (!p.saerskilt && (p.lag ?? 1) > 1)',
      ],
      [
        '    else beloepet += beloep(p.godkjent)!;',
        '    else beloepet += beloep(p.godkjent) ?? 0n;',
      ],
    ],
    mal: ['svaret på to kravposter med fast sum navngir kravposten'],
  },
  {
    id: 'F497',
    feilklasse:
      'leseren godtar en utregning der det prinsipale beløpet ikke er summen av det første laget (OV-U31)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [['if (summen(0) !== beloep(', 'if (false && summen(0) !== beloep(']],
    mal: ['totalen er ikke summen av det første laget'],
  },
  {
    id: 'F498',
    feilklasse:
      'leseren godtar et lag uten beløp for en kravpost der tilbudet er akseptert (KA-U72)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [["if (r.lag.some((l) => !('beloep' in l)))", 'if (false)']],
    mal: ['et lag mangler beløpet når tilbudet er akseptert'],
  },
  {
    id: 'F499',
    feilklasse:
      'leddene i samme lag står ikke under én etikett når standpunktene ikke står i lagenes rekkefølge (OV-U32)',
    fil: `${K}/frosset/tekst.ts`,
    endringer: [['.sort((a, b) => a.k - b.k)', '.sort(() => 0)']],
    mal: ['standpunktene ordnes slik brevet ordner dem'],
  },
  {
    id: 'F510',
    feilklasse: 'svaret godtar en vurdering av beløpet når tilbudet ikke er akseptert (KA-U72)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [
      [
        '    if (ikkeAkseptert(p)) {\n',
        '    if (ikkeAkseptert(p) && vurd == null && godkjent == null) {\n',
      ],
    ],
    mal: ['§ 34.2.2 «nei» med et beløp avvises'],
  },
  {
    id: 'F512',
    feilklasse:
      'leseren godtar standpunktet til beløpet med beløp når tilbudet ikke er akseptert, og uten beløp når det er akseptert (KA-U72)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [['(s.godkjent === undefined) !== utenBeloep.has(s.gjelder!))', 'false)']],
    mal: [
      'en rad med standpunktet til beløpet uten beløp for en kravpost der tilbudet er akseptert, avvises',
      'en rad med et beløp for en kravpost der tilbudet ikke er akseptert, avvises',
    ],
  },
  {
    id: 'F513',
    feilklasse: 'en vurdering av beløpet kjernen ikke kjenner, regnes som 0 kr (#1663)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['if (!BELOEPSVURDERINGER.includes(vurd)) {', 'if (false) {']],
    mal: ['svaret avvises med en vurdering kjernen ikke kjenner'],
  },
  {
    id: 'F515',
    feilklasse:
      'leseren godtar et beløp i et lag før det siste for en kravpost der tilbudet ikke er akseptert (KA-U72, MM-U2)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [
      [
        "n < prekludert ? beloep(l.beloep) !== 0n : 'beloep' in l",
        "n < prekludert ? false : 'beloep' in l",
      ],
    ],
    mal: ['et lag før det siste har et beløp, men tilbudet er ikke akseptert'],
  },
  {
    id: 'F516',
    feilklasse:
      'leseren godtar 0 kr i et lag uten preklusjon etter § 34.1.2 for en kravpost der tilbudet ikke er akseptert (KA-U72, OV-U27)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [
      [
        "n < prekludert ? beloep(l.beloep) !== 0n : 'beloep' in l",
        "n < 1 ? beloep(l.beloep) !== 0n && 'beloep' in l : 'beloep' in l",
      ],
    ],
    mal: ['et lag uten preklusjon har 0 kr, men tilbudet er ikke akseptert'],
  },
  {
    id: 'F517',
    feilklasse:
      'et varsel om forholdet avvises når det er oppgitt sendt samme dag som datoen i grunnlagskravet (VS-U58)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '  if (grunnlag === null || dag === null || dag >= grunnlag.dag) return null;',
        '  if (grunnlag === null || dag === null || dag > grunnlag.dag) return null;',
      ],
    ],
    mal: [
      'varselet etter § 32.2 oppgitt sendt før datoen pålegget ble mottatt, avvises, samme dag godtas',
    ],
  },
  {
    id: 'F518',
    feilklasse:
      'kontrollen mot datoen i grunnlagskravet gjelder bare varselet etter § 32.2, ikke § 33.4, § 34.1.2 og § 34.1.3 (VS-U58)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        "const VARSLER_OM_FORHOLDET = ['32.2', '33.4', '34.1.2', '34.1.3'] as const;",
        "const VARSLER_OM_FORHOLDET = ['32.2'] as const;",
      ],
    ],
    mal: ['oppgitt sendt før datoen TE ble klar over forholdet, avvises'],
  },
  {
    id: 'F519',
    feilklasse:
      'et fristkrav med varselet etter § 33.4 sendt før datoen i grunnlagskravet godtas (VS-U58)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['      if (foer) return foer;', '']],
    mal: ['et fristkrav med varselet etter § 33.4 sendt før datoen i grunnlagskravet'],
  },
  {
    id: 'F520',
    feilklasse:
      'varselet kontrolleres mot den første datoen i grunnlagskravet, ikke den korrigerte (VS-U58, MM-U52 punkt 10)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '  const siste = felt === null ? null : sisteDatoopplysning(u, felt);\n  const dag = siste === null',
        '  const siste = felt === null ? null : (u.datoopplysninger.find((o) => o.felt === felt) ?? null);\n  const dag = siste === null',
      ],
    ],
    mal: ['kontrollerer varselet mot den korrigerte datoen'],
  },
  {
    id: 'F521',
    feilklasse:
      'en korrigering kan flytte datoen i grunnlagskravet til etter et varsel om forholdet (VS-U59)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '      return kontrollerKorrigering(k, u) ?? korrigeringEtterVarslene(k, u, regler);',
        '      return kontrollerKorrigering(k, u);',
      ],
    ],
    mal: [
      'en korrigering til en dato etter et registrert varsel avvises',
      'en korrigering til en dato etter et varsel sendt fra løsningen avvises',
    ],
  },
  {
    id: 'F522',
    feilklasse: 'en korrigering til samme dag som et varsel om forholdet avvises (VS-U59)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      ['    if (sendt !== null && sendt < ny)', '    if (sendt !== null && sendt <= ny)'],
    ],
    mal: ['en korrigering til en dato etter et registrert varsel avvises, til samme dag godtas'],
  },
  {
    id: 'F523',
    feilklasse: 'et ukjent felt i vurderingene i svaret på forholdet godtas uten virkning (MM-U2)',
    fil: `${K}/spor/forhold/frysing.ts`,
    endringer: [["  avvisUkjenteFelt(v, FORHOLDSVURDERINGER, 'forholdet');\n", '']],
    mal: ['et ukjent felt i vurderingene i svaret på forholdet og fristen avvises'],
  },
  {
    id: 'F524',
    feilklasse: 'et ukjent felt i vurderingene i svaret på fristen godtas uten virkning (MM-U2)',
    fil: `${K}/frosset/utregning.ts`,
    endringer: [["  avvisUkjenteFelt(v, FRISTVURDERINGER, 'fristen');\n", '']],
    mal: ['et ukjent felt i vurderingene i svaret på forholdet og fristen avvises'],
  },
  {
    id: 'F525',
    feilklasse:
      'en korrigering til en dato etter kravet som er det første varselet, godtas (VS-U60)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [['    ? kravSomVarsler(hjemmel, s.krav)[0]\n', '    ? undefined\n']],
    mal: [
      'uten eget varsel avvises en korrigering til en dato etter påberopelsen',
      'uten eget varsel avvises en korrigering til en dato etter det første fristkravet',
      'uten eget varsel avvises en korrigering til en dato etter den første kravversjonen i vederlaget',
    ],
  },
  {
    id: 'F526',
    feilklasse:
      'påberopelsen regnes som varsel etter § 32.2 også der varslingsplikten ikke gjelder (VS-U60, VS-U43 punkt 6)',
    fil: `${K}/kommandoer/nyttelast.ts`,
    endringer: [
      [
        '  const kravet = hjemmelenGjelder(hjemmel, u.spor.forhold.gjeldendeKrav, regler)\n',
        '  const kravet = true\n',
      ],
    ],
    mal: ['i svikt er påberopelsen ikke et varsel etter § 32.2'],
  },
  {
    id: 'F527',
    feilklasse:
      'en beregningsregel byggherren ikke godtar, gjør ikke de andre kravpostene upåvirket (arbeidsvalg 1 punkt 2 i #1663, OV-U33)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [["          (s.art === 'oppgjoersform' && !s.aksepterer))", '          false)']],
    mal: ['en kravpost som verken beregningsregelen byggherren ikke godtar'],
  },
  {
    id: 'F528',
    feilklasse:
      'innsigelsen etter § 34.3.3 står som grunn for hele svaret i linjen, ikke ved kravposten (KA-U64, VS-U56)',
    fil: `${K}/frosset/linje.ts`,
    endringer: [['        !forKravposten.has(p.standpunkt)', '        true']],
    mal: ['linjen nevner innsigelsen etter punkt 34.3.3 ved kravposten'],
  },
  {
    id: 'F529',
    feilklasse:
      'et tilbud byggherren ikke aksepterer, gjør ikke de andre kravpostene upåvirket (arbeidsvalget 10.11 i #1760, OV-U33)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [['    tilbudet.size > 0 ||\n', '']],
    mal: ['et tilbud byggherren ikke aksepterer, rammer bare sin egen kravpost'],
  },
  {
    id: 'F530',
    feilklasse:
      'standpunktene for kravposten med tilbudet som ikke er akseptert, er upåvirket i stedet for i det første laget (#1760, KA-U72)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [
      [
        "      if ('gjelder' in s && s.gjelder !== undefined && tilbudet.has(s.gjelder)) return foerste;\n",
        '',
      ],
    ],
    mal: ['et tilbud byggherren ikke aksepterer, rammer bare sin egen kravpost'],
  },
  {
    id: 'F531',
    feilklasse:
      'leseren regner ikke et tilbud byggherren ikke aksepterer, som en påberopelse ved siden av en upåvirket kravpost (#1760, OV-U33)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [
      [
        "(s.art === 'oppgjoersform' && !s.aksepterer ? [s.id] : [])",
        "(s.art === 'oppgjoersform' && !s.aksepterer && s.hjemmel !== '34.2.2' ? [s.id] : [])",
      ],
    ],
    mal: ['et tilbud byggherren ikke aksepterer, rammer bare sin egen kravpost'],
  },
  {
    id: 'F532',
    feilklasse:
      'en innsigelse mot et krav, svar eller varsel får et annet spor enn elementet (#1713)',
    fil: `${K}/kommandoer/handlinger.ts`,
    endringer: [
      ['      if (e) sporet.set(e.id, spor);', "      if (e) sporet.set(e.id, 'vederlag');"],
    ],
    mal: ['en innsigelse hører til sporet elementet den gjelder'],
  },
  {
    id: 'F533',
    feilklasse: 'varselet kravposten viser til, leses ikke (VS-U50, VS-U54)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [['      p.varsel ?? (tidligere.length', '      (tidligere.length']],
    mal: [
      'en ny kravpost i en senere kravversjon viser til et varsel sendt etter det første kravet',
      'har saken flere varsler før det første kravet, viser kravet til det TE velger',
    ],
  },
  {
    id: 'F534',
    feilklasse: 'kravposten kan vise til et varsel etter en annen bestemmelse (VS-U50)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [['v.id === p.varsel && v.hjemmel === hjemmel', 'v.id === p.varsel']],
    mal: ['kravposten kan bare vise til et varsel etter samme bestemmelse i saken'],
  },
  {
    id: 'F535',
    feilklasse:
      'kravet sier ikke at TE opplyser varselet i et dokument som er vedlagt (VS-U51, U-14 i BF-14)',
    fil: `${K}/spor/vederlag/tekst.ts`,
    endringer: [
      ['  return dokumentet.length && dokumentet.every(', '  return false && dokumentet.every('],
    ],
    mal: ['dokumentet står som et eget registrert varsel før kravet'],
  },
  {
    id: 'F536',
    feilklasse: 'dokumentet fra kravskjemaet legges ikke ved kravet (VS-U51)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['[...vedleggI(k), ...vedKravet]', '[...vedleggI(k)]']],
    mal: ['dokumentet står som et eget registrert varsel før kravet'],
  },
  {
    id: 'F537',
    feilklasse:
      'et vederlagskrav med et vedlegg som ikke er dokumentet med varselet for en kravpost, gjør saken forstått (VS-U51, MM-U2)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [
      [
        '    if (ved.some((v) => !varslene.has(v.vedlegg_id)))',
        '    if (ved.some((v) => !varslene.has(v.vedlegg_id) && false))',
      ],
    ],
    mal: ['et vederlagskrav med et vedlegg som ikke er dokumentet med varselet for en kravpost'],
  },
  {
    id: 'F538',
    feilklasse:
      'varselet fra kravskjemaet gis før kjernen har prøvd kravet, så et avvist krav etterlater varselet (VS-U53)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [
      ['  if (skriving.sendes) {\n    const proeve', '  if (!skriving.sendes) {\n    const proeve'],
    ],
    mal: ['avvises kravet, gis ingen rad, heller ikke varselet'],
  },
  {
    id: 'F539',
    feilklasse:
      'dokumentet fra kravskjemaet for én kravpost blir også varselet for en annen post i det første kravet (VS-U51, D-16)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [
      [
        '(v) => !dokumenter.get(v.dokument)?.dokumentasjon.some((d) => vedlagte.has(d.vedlegg_id))',
        '(v) => !!v',
      ],
    ],
    mal: ['dokumentet for én kravpost er ikke varselet for en annen post'],
  },
  {
    id: 'F540',
    feilklasse:
      'et varsel i saken som én kravpost viser til, gjelder ikke en annen post med samme beregningsregel (D-16)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [
      [
        'varsler.find((v) => v.hjemmel === hjemmel)?.id)',
        'varsler.find((v) => v.hjemmel === hjemmel && !kravposterI(krav).some((q) => q.varsel === v.id))?.id)',
      ],
    ],
    mal: ['et varsel i saken som én kravpost viser til, gjelder også en annen post'],
  },
  {
    id: 'F541',
    feilklasse: 'en kravpost i en ny versjon kan ikke gjenta varselet den viste til (KA-U56)',
    fil: `${K}/spor/vederlag/utledning.ts`,
    endringer: [['somFoer?.varsel !== p.varsel', 'true']],
    mal: ['en kravpost i en ny versjon kan gjenta varselet'],
  },
  {
    id: 'F542',
    feilklasse:
      'samme dokument for flere kravposter blir et varsel bare etter den første bestemmelsen (VS-U52, VS-U53)',
    fil: `${K}/kommandoer/skriving.ts`,
    endringer: [['[k.hjemmel, ...ogsaaEtter].map(', '[k.hjemmel].map(']],
    mal: ['samme dokument for to kravposter er ett registrert brev'],
  },
  {
    id: 'F543',
    feilklasse: 'samme dokument med ulik dato for to kravposter godtas (VS-U53)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [['if ((dokumentene.get(id) ?? like) !== like)', 'if (false)']],
    mal: ['samme dokument med ulik dato eller med andre vedlegg'],
  },
  {
    id: 'F544',
    feilklasse:
      'utregningen gir en kravpost etter en beregningsregel ett lag mer enn virkningene (OV-U32, #1774)',
    fil: `${K}/regler/vederlag.ts`,
    endringer: [['return lag?.beloepet ?? 0;', 'return lag ? lag.beloepet + 1 : 0;']],
    mal: ['antallet lag i utregningen er det høyeste laget i virkningene'],
  },
  {
    id: 'F545',
    feilklasse:
      'virkningene gir beløpet for en kravpost etter en beregningsregel et lag utregningen ikke har (OV-U32, #1774)',
    fil: `${K}/spor/vederlag/frysing.ts`,
    endringer: [['      lag.beloepet\n', '      lag.beloepet + 1\n']],
    mal: ['antallet lag i utregningen er det høyeste laget i virkningene'],
  },
  {
    id: 'F546',
    feilklasse:
      'leseren godtar en utregning med flere lag enn beslutningsgrunnlaget (OV-U32, MM-U2, #1774)',
    fil: `${K}/spor/poster/format.ts`,
    endringer: [['if (rader.length > 0 && antall !== lagIGrunnlaget)', 'if (false)']],
    mal: ['utregningen har to lag, men beslutningsgrunnlaget ett'],
  },
  {
    id: 'F547',
    feilklasse:
      'formatet forstår rigg og drift i et lagret vederlagskrav før posten er bygget (MM-U2, #1775)',
    fil: `${K}/spor/vederlag/format.ts`,
    endringer: [
      [
        "saerskilt: objekt({ produktivitet: BELOEPSPOST }, ['produktivitet']),",
        'saerskilt: objekt({ produktivitet: BELOEPSPOST, rigg_og_drift: BELOEPSPOST }, []),',
      ],
    ],
    mal: ['en lagret rad med rigg og drift i vederlagskravet er ikke forstått'],
  },
  {
    id: 'F548',
    feilklasse:
      'kravet med rigg og drift avvises uten at meldingen sier at posten ikke er bygget ennå (#1775)',
    fil: `${K}/spor/vederlag/kommando.ts`,
    endringer: [['const rigg = harRiggOgDrift(innhold);', 'const rigg = false;']],
    mal: ['avvises med posten i meldingen'],
  },
  {
    id: 'F561',
    feilklasse:
      'en påberopelse av at varselet etter § 32.2 kom for sent, krever ingen begrunnelse (KA-U46 punkt 2–3)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        'const paaberoper = v.grunnlag_varslet_i_tide === false;',
        'const paaberoper = false as boolean;',
      ],
    ],
    mal: ['påberopt preklusjon etter § 32.2 (KA-U21, KA-U47)'],
  },
  {
    id: 'F562',
    feilklasse: 'begrunnelsen kreves for avslag også der § 32.2 ikke gjelder (KA-U46 punkt 1)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        "const avslaar = v.resultat === 'avslaatt' && gjelderVarslingsplikten(krav, regler);",
        "const avslaar = v.resultat === 'avslaatt';",
      ],
    ],
    mal: ['der § 32.2 ikke gjelder, godtas uten begrunnelse også ved avslag'],
  },
  {
    id: 'F563',
    feilklasse:
      'begrunnelsen i punktet om et varsel i tide oppfyller kravet ved avslag (KA-U46 punkt 3)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        "const punktene = paaberoper ? ['forhold', '32.2'] : ['forhold'];",
        "const punktene = ['forhold', '32.2'];",
      ],
    ],
    mal: ['ikke i punktet om et varsel i tide'],
  },
  {
    id: 'F564',
    feilklasse:
      'utdypningen for hele svaret under «Forbehold» oppfyller kravet til begrunnelse (KA-U46 punkt 3)',
    fil: `${K}/spor/forhold/kommando.ts`,
    endringer: [
      [
        'if (punktene.some((p) => s.utdypninger?.[p]?.trim())) return null;',
        'if (punktene.some((p) => s.utdypninger?.[p]?.trim()) || s.utdypning) return null;',
      ],
    ],
    mal: ['men ikke under «Forbehold»'],
  },
  {
    id: 'F565',
    feilklasse:
      'punktet «Forholdet» i svaret på vederlaget sier ikke hvilket tidligere brev svaret på forholdet står i (OV-U32, LV-U3)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['const brevet = j.brevet(g.dokument);', "const brevet = 'samme brev';"]],
    mal: ['forholdet avslått i et tidligere brev', 'subsidiært i et tidligere brev'],
  },
  {
    id: 'F566',
    feilklasse:
      'leseren forstår et avsnitt med punkt i svaret på fristen, som har dagens struktur (MM-U2, LV-U72)',
    fil: `${K}/format/leser.ts`,
    endringer: [[" && s.spor !== 'frist')", ')']],
    mal: ['et avsnitt med punkt i svaret på fristen'],
  },
  {
    id: 'F567',
    feilklasse:
      'tabellen regner lagene fra forholdet med, så første kolonne ikke er beløpet i utregningen (OV-U73)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['      lagene - fra.forskyvning,\n', '      lagene,\n']],
    mal: ['tabellen regner lagene i sporet'],
  },
  {
    id: 'F568',
    feilklasse: 'et standpunkt uten lag står etter et standpunkt med etikett i punktet (OV-U32)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [
      [
        '.sort((a, b) => (a.plass ?? 0) - (b.plass ?? 0));',
        '.sort((a, b) => (a.plass ?? 99) - (b.plass ?? 99));',
      ],
    ],
    mal: ['standpunktet til varselet etter punkt 34.4 får ingen virkning'],
  },
  {
    id: 'F569',
    feilklasse:
      'svaret på forholdet ved svikt i et tidligere brev omtales som et avslag (LV-U41, MM-U50)',
    fil: `${K}/frosset/brevtekst.ts`,
    endringer: [['          : harRisikoen(j.krav(g.gjelder))', '          : false']],
    mal: ['står med ordene det hadde: byggherren har ikke risikoen'],
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
  /** Feilene på filene og i hver `describe`, fra `suitefeil.ts` (#1133). */
  suitefeil: Suitefeil[];
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
  filer = ['kjerne/', 'sprakprove/kjernelagring/'],
  arbeidere = arbeiderePerKopi
): Promise<Rapport> {
  try {
    return await kjoerVitestEnGang(k, filer, arbeidere);
  } catch (e) {
    if (!(e instanceof IngenRapport)) throw e;
    console.error(`${e.message}\nKjøres én gang til.`);
    return kjoerVitestEnGang(k, filer, arbeidere);
  }
}

function kjoerVitestEnGang(k: Arbeidskopi, filer: string[], arbeidere: number): Promise<Rapport> {
  const ut = `${k.rot}-rapport.json`;
  const suiteut = `${k.rot}-suitefeil.json`;
  rmSync(ut, { force: true });
  rmSync(suiteut, { force: true });
  // Vitest 3.2 gir ikke `--hookTimeout` videre til prosjektene, så grensen går gjennom
  // `vite.config.ts`. `vi.setConfig` i lagringstestene virker bare for den første filen i
  // en arbeider uten isolasjon, så grensen er den samme som `GRENSER` der.
  const env = { ...process.env, KOE_HOOKGRENSE: '240000', FEILINNFOERING_SUITEFEIL: suiteut };
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
        // grønn slik, og `utvalgskontroll` at hvert utvalg er det (#934, #945).
        '--no-isolate',
        // Kopiene deler prosessorene. Et tidsavbrudd er ikke en assertion og gir en ny
        // kjøring (#1015), så grensen heves over den i `vite.config.ts`.
        '--testTimeout=60000',
        // Prosessorene deles mellom kopiene, ikke ganges med dem.
        `--maxWorkers=${arbeidere}`,
        '--reporter=json',
        `--outputFile=${ut}`,
        '--reporter=./kjerne/tester/suitefeil.ts',
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
          ok({
            ...(JSON.parse(readFileSync(ut, 'utf8')) as Rapport),
            suitefeil: JSON.parse(readFileSync(suiteut, 'utf8')) as Suitefeil[],
          });
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

/** «Cannot find name», med og uten forslag til et annet navn. */
const NAVNEFEIL = new Set([2304, 2552]);

/**
 * #1360: feilene med kode 2304 og 2552 hver mutasjon gir i fila si, utover dem fila har fra
 * før. Et navn som ikke er i omfang, gir `ReferenceError` og ikke feilen mutasjonen skal
 * innføre. Fila leses av én språktjeneste per fil, med den muterte teksten i minnet.
 */
function navnefeil(muterte: { m: Mutasjon; tekst: string }[]): Map<string, string[]> {
  const feil = new Map<string, string[]>();
  // Tjenestene deler de umuterte filene, så hver fil og hver typedefinisjon leses én gang.
  const register = ts.createDocumentRegistry();
  for (const fil of new Set(muterte.map(({ m }) => m.fil))) {
    const sti = join(ROT, fil);
    const konfig = ts.findConfigFile(dirname(sti), ts.sys.fileExists);
    const valg = konfig
      ? ts.getParsedCommandLineOfConfigFile(
          konfig,
          {},
          {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic: () => {},
          }
        )?.options
      : undefined;
    let tekst = readFileSync(sti, 'utf8');
    let versjon = 0;
    const tjeneste = ts.createLanguageService(
      {
        getCompilationSettings: () => valg ?? {},
        getScriptFileNames: () => [sti],
        getScriptVersion: (f) => (f === sti ? String(versjon) : '0'),
        getScriptSnapshot: (f) => {
          const t = f === sti ? tekst : ts.sys.readFile(f);
          return t === undefined ? undefined : ts.ScriptSnapshot.fromString(t);
        },
        getCurrentDirectory: () => ROT,
        getDefaultLibFileName: ts.getDefaultLibFilePath,
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: ts.sys.readDirectory,
        directoryExists: ts.sys.directoryExists,
        getDirectories: ts.sys.getDirectories,
      },
      register
    );
    const navn = () =>
      tjeneste
        .getSemanticDiagnostics(sti)
        .filter((d) => NAVNEFEIL.has(d.code))
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));
    const forhold = navn();
    for (const { m, tekst: mutert } of muterte.filter((u) => u.m.fil === fil)) {
      tekst = mutert;
      versjon++;
      const nye = navn();
      for (const n of forhold) {
        const i = nye.indexOf(n);
        if (i >= 0) nye.splice(i, 1);
      }
      if (nye.length)
        feil.set(
          m.id,
          nye.map((n) => `${m.id}: mutasjonen gir en navnefeil i ${fil}: ${n}`)
        );
    }
  }
  return feil;
}

/** Meldingen Vitest gir når en test eller en hook går over grensen sin. */
const TIDSAVBRUDD = /\b(Test|Hook) timed out in \d+ms/;

/**
 * Feilene som ikke hører til én test: fra reporteren, og for en fil som feilet uten en slik
 * feil og uten en test som feilet, meldingen i JSON-rapporten.
 */
function suitefeilene(rapport: Rapport): Suitefeil[] {
  const medFeil = new Set(rapport.suitefeil.map((f) => f.fil));
  return [
    ...rapport.suitefeil,
    ...rapport.testResults
      .filter(
        (f) =>
          f.status === 'failed' &&
          !medFeil.has(f.name) &&
          !f.assertionResults.some((t) => t.status === 'failed')
      )
      .map((f) => ({ fil: f.name, suite: '', melding: f.message })),
  ];
}

const suitenavn = (f: Suitefeil, k: Arbeidskopi) =>
  `${relative(k.rot, f.fil)}${f.suite ? ` > ${f.suite}` : ''}`;

/**
 * Utfallet av én mutasjon. `tidsavbrudd` er satt når den ikke ble oppdaget og tidsavbrudd
 * forklarer det: da er utfallet uavgjort, ikke en overlevende mutasjon (#1122, #1133).
 */
interface Utfall {
  oppdaget: boolean;
  tidsavbrudd: boolean;
  linjer: string[];
}

function vurder(m: Mutasjon, rapport: Rapport, k: Arbeidskopi): Utfall {
  const tester = rapport.testResults.flatMap((f) => f.assertionResults);
  const feilet = tester.filter((t) => t.status === 'failed');
  const suitefeil = suitefeilene(rapport);
  const ikkeAssertion = feilet.filter(
    (t) => !t.failureMessages.join('\n').includes('AssertionError')
  );
  const manglerMal = m.mal.filter(
    (mal) => !feilet.some((t) => treffer(t.fullName, mal) && !ikkeAssertion.includes(t))
  );
  const oppdaget = !suitefeil.length && !ikkeAssertion.length && !manglerMal.length;
  // #1133: uavgjort bare når hver feil som ikke er en assertion, er et tidsavbrudd, og hvert mål
  // som ikke feilet på en assertion, har en test som fikk tidsavbrudd eller ikke ble kjørt. Et
  // mål som kjørte og bestod, er en overlevende mutasjon, uansett tidsavbrudd i andre tester.
  const andreFeil = [
    ...ikkeAssertion.map((t) => t.failureMessages.join('\n')),
    ...suitefeil.map((f) => f.melding),
  ];
  const ikkeKjoert = (t: Testresultat) => t.status !== 'passed' && t.status !== 'failed';
  const tidsavbrudd =
    !oppdaget &&
    andreFeil.length > 0 &&
    andreFeil.every((melding) => TIDSAVBRUDD.test(melding)) &&
    manglerMal.every((mal) =>
      tester.some((t) => treffer(t.fullName, mal) && (ikkeKjoert(t) || ikkeAssertion.includes(t)))
    );
  return {
    oppdaget,
    tidsavbrudd,
    linjer: [
      `\n${m.id} ${m.feilklasse}: ${oppdaget ? 'oppdaget' : tidsavbrudd ? 'IKKE AVGJORT (tidsavbrudd)' : 'IKKE OPPDAGET'}`,
      ...m.endringer.map(([fra, til]) => `  ${m.fil}: ${fra.trim()} → ${til.trim()}`),
      ...feilet.map((t) => `  feilet: ${t.fullName}\n    ${t.failureMessages[0]?.split('\n')[0]}`),
      ...suitefeil.map((f) => `  suitefeil: ${suitenavn(f, k)}: ${f.melding.split('\n')[0]}`),
      ...ikkeAssertion.map(
        (t) =>
          `  ${TIDSAVBRUDD.test(t.failureMessages.join('\n')) ? 'tidsavbrudd' : 'ikke en assertion'}: ${t.fullName}`
      ),
      ...manglerMal.flatMap((mal) => [
        `  målet feilet ikke på en assertion: ${mal}`,
        ...tester
          .filter((t) => treffer(t.fullName, mal) && ikkeKjoert(t))
          .map((t) => `    ikke kjørt: ${t.fullName}`),
      ]),
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
      const filer = filerFor(m);
      if (filer) await utvalgskontroll(k, filer);
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
const muterte = valgte.map((m) => {
  let tekst = readFileSync(m.fil, 'utf8');
  const feil = m.endringer.flatMap(([fra, til]) => {
    if (tekst.split(fra).length !== 2)
      return [`${m.id}: «${fra}» finnes ikke nøyaktig én gang i ${m.fil}`];
    tekst = tekst.replace(fra, til);
    return [];
  });
  return { m, tekst, feil };
});
const navnefeilene = navnefeil(muterte.filter((u) => !u.feil.length));
const ankerfeil = new Map(
  muterte.flatMap(({ m, feil }) => {
    const alle = [...feil, ...(navnefeilene.get(m.id) ?? [])];
    return alle.length ? [[m.id, alle] as const] : [];
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
// Avgjort av oppdragsgiver 19.10 (#934): på en PR kjører hver mutasjon bare filene med
// målene sine, og om natta hele samlingen. Kontrollkjøringen går alltid over hele, med et
// utvalg i én kopi: hvert utvalg har sin egen kontroll, og `ci.yml` kjører samlingen.
const utvalg = process.env.FEILINNFOERING_UTVALG === '1';
const utvalgene = new Map(
  utvalg
    ? valgte.map((m) => [
        m,
        [
          ...new Set(
            navn.filter((n) => m.mal.some((mal) => harMal(n.navn, mal))).map((n) => n.fil)
          ),
        ],
      ])
    : []
);
const filerFor = (m: Mutasjon) => utvalgene.get(m);
// Lagringstestene mot SQL Server tar det meste av tiden i et utvalg, så mutasjonene med
// slike filer fordeles for seg. Ellers avgjør rekkefølgen i lista hvor mange hver del får.
const tung = (m: Mutasjon) =>
  filerFor(m)?.some((f) => f.startsWith('sprakprove/kjernelagring/')) ?? false;
const tunge = new Set(valgte.filter(tung));
const iDelen = new Set(
  [...tunge, ...valgte.filter((m) => !tunge.has(m))].filter((_, i) => i % deler === del - 1)
);
const delen = valgte.filter((m) => iDelen.has(m));
// #967 punkt 1: en feilinnføring med ankerfeil hoppes over og meldes på slutten, så de andre
// kjøres. Kjøringen er rød likevel.
const mutasjoner = delen.filter((m) => !ankerfeil.has(m.id));
const ankerfeilIDelen = delen.flatMap((m) => ankerfeil.get(m.id) ?? []);
/** Kontrollkjøringen av hvert utvalg, etter filene (`utvalgskontroll`). */
const utvalgskontroller = new Map<string, Promise<void>>();

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
      `Ankrene i ${valgte.length} feilinnføringer finnes nøyaktig én gang, ingen av dem gir en navnefeil, og målene er deler av navnene på ${navn.length} tester.`
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
  // Uten utvalg kjøres kontrollen i hver kopi, så en kopi som avviker, stopper
  // kjøringen før noen mutasjon.
  const kontroller = utvalg
    ? [await kontrollkjoering(kopier[0], undefined, availableParallelism())]
    : await Promise.all(kopier.map((k) => kontrollkjoering(k)));
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
    `Kontroll uten mutasjon: ${[...antallTester][0]} tester grønne i ${utvalg ? 'én arbeidskopi' : `hver av ${kopier.length} arbeidskopier`}.`
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
    console.log(
      `\nHoppet over fordi ankeret ikke finnes eller mutasjonen gir en navnefeil:\n${ankerfeilIDelen.join('\n')}`
    );
  console.log(
    ikkeOppdaget.length
      ? `\nIkke alle mutasjonene ble oppdaget: ${ikkeOppdaget.length - uavgjort.length} overlevde, ${uavgjort.length} fikk tidsavbrudd to ganger.`
      : `\nAlle mutasjonene${ankerfeilIDelen.length ? ' som ble kjørt,' : ''} ble oppdaget.`
  );
  return ikkeOppdaget.length || ankerfeilIDelen.length ? 1 : 0;
}

/** Hver test, fil eller `describe` som feilet, med den første linjen i feilen. */
function kontrollfeil(kontroll: Rapport, k: Arbeidskopi): string[] {
  return [
    ...kontroll.testResults
      .flatMap((f) => f.assertionResults)
      .filter((t) => t.status === 'failed')
      .map((t) => `${t.fullName}: ${t.failureMessages[0]?.split('\n')[0]}`),
    ...suitefeilene(kontroll).map((f) => `${suitenavn(f, k)}: ${f.melding.split('\n')[0]}`),
  ];
}

/**
 * Kontrollkjøringen av `filer`, eller hele samlingen, i `k`. Feiler den bare på tidsavbrudd,
 * kjøres den én gang til, og den andre kjøringen gjelder (#1122, E2-2 i del 4).
 */
async function kontrollkjoering(
  k: Arbeidskopi,
  filer?: string[],
  arbeidere?: number
): Promise<Rapport> {
  const forste = await kjoerVitest(k, filer, arbeidere);
  const feil = kontrollfeil(forste, k);
  if (!feil.length || !feil.every((f) => TIDSAVBRUDD.test(f))) return forste;
  console.error(
    `Kontrollkjøringen i ${k.rot} fikk tidsavbrudd og kjøres én gang til: ${feil.join('; ')}`
  );
  return kjoerVitest(k, filer, arbeidere);
}

/**
 * #945: filene i et utvalg deles annerledes på arbeiderne enn i hele samlingen, så tilstand
 * som lekker mellom filene, kan gi et annet utfall. Hvert utvalg kjøres derfor én gang uten
 * mutasjon, i den kopien som først trenger det, og må være grønt uten hoppede tester.
 */
function utvalgskontroll(k: Arbeidskopi, filer: string[]): Promise<void> {
  const noekkel = [...filer].sort().join('\n');
  let kontroll = utvalgskontroller.get(noekkel);
  if (!kontroll) {
    kontroll = kontrollkjoering(k, filer).then((rapport) => {
      const feil = kontrollfeil(rapport, k);
      const hoppet = rapport.testResults
        .flatMap((f) => f.assertionResults)
        .filter((t) => t.status !== 'passed');
      if (feil.length || hoppet.length)
        throw new Error(
          `Kontrollkjøringen av utvalget ${filer.join(', ')} er ikke grønn: ${[...feil, ...hoppet.map((t) => `${t.fullName}: ${t.status}`)].join('; ')}`
        );
    });
    utvalgskontroller.set(noekkel, kontroll);
  }
  return kontroll;
}
