/**
 * Radene i `LESBART` for området: dokumentene og utsagnene i dem (`typer.ts`).
 * Klassene og formen står i `klasse.ts`, og testen i `../arkitektur.test.ts`.
 */

import type { Lesbar } from './klasse.ts';

/** GFK-U26: lesingen av forlengelsene i en sak. */
const FORLENGELSENE = 'spor/frist/utledning.ts:forlengelseneISaken';

export const DOKUMENTENE: Lesbar[] = [
  // Dokumentene og utsagnene i dem (typer.ts).
  ['Dokument', 'relasjon', 'avsender'],
  // OV-U17, OV-U79: parten som la til brevet, eier registreringen og opplysningen om datoen.
  [
    'Dokument',
    'relasjon',
    'lagtTilAv',
    [
      'utledning/utled.ts:registreringer',
      'utledning/utled.ts:utledSporene.lesDokumentet',
      'spor/frist/kommando.ts:varseldokumentetISaken',
    ],
  ],
  ['Dokument', 'utsagn', 'krav svar utsagn opplysninger'],
  // OV-U16: sporene et brev registrert som dokumentasjon hører til. Ingen regel leser dem (OV-U4).
  ['Dokument', 'relasjon', 'spor', ['format/leser.ts:dokumentasjonsbrev']],
  ['Domenehendelse', 'relasjon', 'art id versjon dokument grunn'],
  // MM-U2, #2079: tittelen fra opprettelsen, til sakslisten og saksbildet.
  ['Domenehendelse', 'utsagn', 'tittel', ['format/leser.ts:sakstittelen']],
  ['Krav', 'relasjon', 'id spor erstatter gjelder'],
  ['Krav', 'utsagn', 'innhold'],
  // #1707, #1711: kravinnholdet leses gjennom den typede tilgangen i formatfila for sporet (#1783).
  ['Krav.innhold', 'utsagn', 'frister trekker', ['spor/frist/format.ts']],
  [
    'Krav.innhold',
    'utsagn',
    'hovedkategori underkategori endringsordre paalegg_mottatt klar_over_forholdet',
    ['spor/forhold/format.ts:innholdIForholdet'],
  ],
  ['Forholdsinnhold', 'utsagn', 'hovedkategori underkategori'],
  [
    'Forholdsinnhold',
    'utsagn',
    'endringsordre',
    ['spor/forhold/tekst.ts', 'spor/forhold/kommando.ts:kategorisperre'],
  ],
  // KA-U74, KA-U76, KA-U79: fristene i fristkravet med dagene for hver, og fristene TE trekker.
  ['Fristinnhold', 'utsagn', 'frister trekker'],
  ['FristIKravet', 'relasjon', 'id frist_id'],
  ['FristIKravet', 'utsagn', 'dager'],
  ['spor/frist/format.ts:betegnelsen', 'utsagn', 'nummer navn'],
  // OV-U115 punkt 19–22 og arbeidsvalget 07.11 i domenetabellen: kravpostene i vederlagskravet, og kravpostene
  // fra forrige versjon TE trekker (KA-U56).
  [
    'Vederlagsinnhold',
    'utsagn',
    'kravposter',
    ['spor/vederlag/format.ts:innholdIVederlaget', 'spor/vederlag/format.ts:kravposterI'],
  ],
  [
    'Vederlagsinnhold',
    'utsagn',
    'trekker',
    ['spor/vederlag/format.ts:innholdIVederlaget', 'spor/vederlag/tekst.ts'],
  ],
  ['Kravpost', 'relasjon', 'id betegnelse'],
  [
    'Kravpost',
    'utsagn',
    'oppgjoersform beloep',
    ['spor/vederlag/format.ts', 'spor/vederlag/tekst.ts'],
  ],
  // VS-U87 punkt 22 og 23: om kravet er varselet for posten.
  ['Kravpost', 'utsagn', 'oppgjoersform', ['spor/vederlag/format.ts:varselhjemmel']],
  // VS-U87 punkt 23 og beslutningsdelen: valget av varsel på kravposten, en relasjon til et varsel
  // i saken eller til kravet selv.
  [
    'Kravpost',
    'relasjon',
    'varsel',
    [
      'spor/vederlag/format.ts:varseletPostenViserTil',
      'spor/vederlag/utledning.ts:kravpostvarseletStrider',
      'spor/vederlag/utledning.ts:sammeValg',
      'spor/vederlag/utledning.ts:valgetRettes',
      'frosset/standpunkt.ts:sisteStandpunktTilVarslene',
      'spor/vederlag/kommando.ts:varselvalgetMangler',
    ],
  ],
  [
    'Kravpostvarselet',
    'relasjon',
    'art varsel',
    [
      'spor/vederlag/format.ts:varseletPostenViserTil',
      'spor/vederlag/utledning.ts:sammeValg',
      'spor/vederlag/utledning.ts:kravpostvarseletStrider',
      'frosset/standpunkt.ts:sisteStandpunktTilVarslene',
    ],
  ],
  [
    'spor/vederlag/format.ts',
    'relasjon',
    'varseletPostenViserTil',
    [
      'spor/vederlag/utledning.ts:kravpostvarslene',
      'spor/vederlag/utledning.ts:kravpostvarseletStrider',
      'spor/vederlag/utledning.ts:viserTilEtVarsel',
      'spor/vederlag/utledning.ts:sammeValg',
      'spor/vederlag/kommando.ts:hindrerSvaretPaaVarselet',
      'spor/vederlag/kommando.ts:vedleggetErEtVarsel',
      'spor/vederlag/kommando.ts:varselvalgetMangler',
    ],
  ],
  // KA-U54, KA-U64, KA-U68, OV-U115 punkt 5: svaret på en kravpost etter en beregningsregel.
  [
    'Kravpost',
    'utsagn',
    'oppgjoersform',
    ['spor/vederlag/frysing.ts', 'spor/vederlag/kommando.ts', 'spor/vederlag/utledning.ts'],
  ],
  [
    'Kravpost',
    'utsagn',
    'beskrivelse pns justert anslag kostnadsoverslag',
    ['spor/vederlag/tekst.ts'],
  ],
  // OV-U89 punkt 17: rigg og drift i forlenget byggetid, utenfor kravpostene.
  [
    'Vederlagsinnhold.saerskilt',
    'utsagn',
    'rigg_og_drift rigg_og_drift.beloep',
    ['spor/vederlag/format.ts:krevdRigg'],
  ],
  // OV-U23: posten etter § 34.1.3 annet ledd i vederlagskravet.
  ['Vederlagsinnhold', 'utsagn', 'saerskilt', ['spor/vederlag/format.ts']],
  // KA-U83: den særskilte vederlagsjusteringen tas med eller trekkes uttrykkelig.
  [
    'Vederlagsinnhold',
    'utsagn',
    'saerskilt saerskilt.produktivitet trekker_saerskilt',
    ['spor/vederlag/utledning.ts:saerskiltStrider'],
  ],
  [
    'Vederlagsinnhold',
    'utsagn',
    'trekker_saerskilt',
    ['spor/vederlag/format.ts:innholdIVederlaget', 'spor/vederlag/tekst.ts'],
  ],
  [
    'Vederlagsinnhold.saerskilt',
    'utsagn',
    'produktivitet',
    ['spor/vederlag/format.ts:harProduktivitetspost', 'spor/vederlag/format.ts:krevdProduktivitet'],
  ],
  [
    'Vederlagsinnhold.saerskilt',
    'utsagn',
    'produktivitet.beloep',
    ['spor/vederlag/format.ts:krevdProduktivitet'],
  ],
  ['Svar', 'relasjon', 'id spor gjelder erstatter dokument paaberopelse'],
  ['Svar', 'utsagn', 'standpunkter'],
  ['Svar', 'frosset', 'beslutningsgrunnlag'],
  [
    'Svar',
    'frosset svar',
    'utregning',
    ['spor/frist/frysing.ts:fristenGodkjent', 'spor/vederlag/frysing.ts:godkjennerHeleKravet'],
  ],
  [
    'Vederlagsutregning',
    'frosset svar',
    'resultat',
    ['spor/vederlag/frysing.ts:godkjennerHeleKravet'],
  ],
  ['Fristutregning', 'frosset svar', 'frister', ['spor/frist/frysing.ts:fristenGodkjent']],
  ['Fristrad', 'frosset svar', 'resultat', ['spor/frist/frysing.ts:fristenGodkjent']],
  // GFK-U26: dagene i første lag i byggherrens gjeldende svar, og dagene TE har godtatt.
  ['Svar', 'frosset svar', 'utregning', [FORLENGELSENE]],
  ['spor/frist/format.ts', 'frosset svar', 'utregningIFristen', [FORLENGELSENE]],
  ['Fristutregning', 'frosset svar', 'frister', [FORLENGELSENE]],
  ['Fristrad', 'frosset svar', 'gjelder lag', [FORLENGELSENE]],
  ['Fristlag', 'frosset svar', 'dager', [FORLENGELSENE]],
  ['Enighetsgrunnlag', 'frosset svar', 'utfall', [FORLENGELSENE]],
  ['Utfall', 'frosset svar', 'frister frister.gjelder frister.dager', [FORLENGELSENE]],
  // MM-U9: et fristsvar som er subsidiært til avslaget av forholdet, tas ikke med (GFK-U27, GFK-U28).
  ['Sporutledning', 'relasjon', 'subsidiaer', [FORLENGELSENE]],
  // FO-U1, #2120: forseringen leser om svaret er subsidiært til forholdet, og dagene i første lag.
  ['Sporutledning', 'relasjon', 'subsidiaer', ['spor/frist/utledning.ts:prinsipaltAvslaatteDager']],
  ['Svar', 'frosset svar', 'utregning', ['spor/frist/utledning.ts:prinsipaltAvslaatteDager']],
  [
    'spor/frist/format.ts',
    'frosset svar',
    'utregningIFristen',
    ['spor/frist/utledning.ts:prinsipaltAvslaatteDager'],
  ],
  [
    'Fristutregning',
    'frosset svar',
    'frister',
    ['spor/frist/utledning.ts:prinsipaltAvslaatteDager'],
  ],
  [
    'Fristrad',
    'frosset svar',
    'gjelder godkjent_dager',
    ['spor/frist/utledning.ts:prinsipaltAvslaatteDager'],
  ],
  // GFK-U19: fristen etter dagene i de andre sakene som forlenger den.
  [
    'Forlengelse',
    'frosset svar',
    'fristId dager',
    ['spor/frist/utledning.ts:fristenEtterForlengelsene'],
  ],
  [
    'regler/hverdager.ts',
    'regelsett',
    'forlengetFrist',
    ['spor/frist/utledning.ts:fristenEtterForlengelsene'],
  ],
  ['Utsagn', 'relasjon', 'id art gjelder'],
  ['Utsagn', 'utsagn', 'hva'],
  // OV-U5: bestemmelsen TEs varsel er gitt etter, § 33.4 eller § 34.1.2.
  ['Utsagn', 'utsagn', 'hjemmel'],
  ['Standpunkt', 'relasjon', 'id art gjelder'],
  [
    'Standpunkt',
    'utsagn',
    'hjemmel iTide resultat godkjent oppfylt vurdert aksepterer oensket godtar kreverTilbud',
  ],
  // D-5, KA-U74: dagene byggherren måtte forstå, for hver frist i kravet.
  ['Standpunkt', 'utsagn', 'maatteForstaa'],
  ['Standpunkt.maatteForstaa', 'relasjon', 'frist'],
  ['Standpunkt.maatteForstaa', 'utsagn', 'dager'],
  // OV-U26, OV-U31, VS-U5: posten beløpet gjelder, og beløpet etter begrensningen etter § 34.1.3.
  ['Standpunkt', 'utsagn', 'saerskilt begrenset'],
  ['Opplysning', 'relasjon', 'id hva gjelder dokument brev oppgittAv'],
  ['Opplysning', 'utsagn', 'dato oppfylt'],
  ['Beslutningsgrunnlag', 'frosset', 'regelversjon virkninger sammenfall varslingsplikt'],
  // GR-U32, LV-U41: ordene for standpunktet til forholdet, lest av det frosne svaret og påberopelsen.
  ['Forholdsordene', 'frosset', 'endringsordre varslingsplikt risiko', ['spor/forhold/tekst.ts']],
  ['Standpunktsvirkning', 'frosset', 'standpunkt art virkning'],
];
