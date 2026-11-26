/**
 * Radene i `LESBART` for området: utledningen (`utledning/`).
 * Klassene og formen står i `klasse.ts`, og testen i `../arkitektur.test.ts`.
 */

import type { Lesbar } from './klasse.ts';

/** Stedene som slår opp et svar etter ID-en i `Utledning.svar`. */
const SVARET_MED_ID = [
  'utledning/utled.ts:vurdertVedRegistreringen',
  'utledning/utled.ts:registreringenStrider',
  'utledning/utled.ts:utsagnetStrider',
  'kommandoer/nyttelast.ts:nyttelastkontroll',
];

const ELDRE_KRAV = 'spor/vederlag/utledning.ts:eldreKravFoer';
const VARSLER_I_ELDRE_KRAV = 'spor/vederlag/utledning.ts:varslerIEldreKrav';

export const UTLEDNINGEN: Lesbar[] = [
  // Utledningen (utled.ts).
  ['Utledning', 'predikat', 'forstaatt spor opplysninger forholdAvvist preklusjonGodtatt frafalt'],
  // § 31.3 for godkjenningen av forholdet (GR-U13, KA-U14): ja, nei eller ikke avklart,
  // utledet av opplysningene. Leses bare av sperren mot trekk (OV-U6).
  [
    'Utledning',
    'predikat',
    'endringsordre',
    ['spor/forhold/utledning.ts:trekkAvPaaberopelsenErSperret'],
  ],
  // Hvorfor saken ikke er forstått, i meldingen når kjernen ikke forstår det den skriver.
  [
    'Utledning',
    'predikat',
    'begrensninger',
    ['kommandoer/skriving.ts:skriv', 'utledning/utled.ts:utled'],
  ],
  ['Utledning.begrensninger', 'predikat', 'grunn hendelse', ['kommandoer/skriving.ts:skriv']],
  // «Avklart» etter GR-U7 brukes bare der vedtakene sier det (MM-U13): vilkåret for
  // enigheten (GR-U7) og at kravene er avgjort (KA-U11, som EO-U5 (opphevet av MM-U34) bygger på).
  [
    'Utledning',
    'predikat',
    'forholdAvklart',
    ['utledning/utled.ts:enighetensVirkning', 'utledning/utled.ts:kraveneErAvgjort'],
  ],
  ['Utledning.opplysninger', 'utsagn', 'opplysning'],
  // Hvem som sa hvert element, og hva det er (§ 5, VS-U12, KA-U20, MM-U43).
  ['Utledning', 'relasjon', 'elementer'],
  ['Utledning.elementer', 'relasjon', '*'],
  ['utledning/utled.ts:Element', 'relasjon', 'hendelse part art innsigelse'],
  // VS-U1, MP-U6: hva en innsigelse og en protest kan gjelde, delt av utledningen og kommandoene.
  ['utledning/utled.ts', 'relasjon', 'kanFaaInnsigelse KAN_FAA_INNSIGELSE'],
  ['utledning/utled.ts:kanFaaProtest(elementer)', 'relasjon', '*'],
  ['utledning/utled.ts:kontrollerHenvisningene(elementer)', 'relasjon', '*'],
  ['spor/frist/utledning.ts:kontrollerSvaretPaaForesporselen(elementer)', 'relasjon', '*'],
  ['utledning/utled.ts:paaberopelser(elementer)', 'relasjon', '*'],
  // MM-U43 punkt 6: stridene ett dokument har med journalen før det.
  ['Strid', 'predikat', 'element grunn utenforRekken', ['utledning/utled.ts:utled']],
  [
    'Sporutledning',
    'predikat',
    'krav kravUtenforRekken svar svarUtenforRekken gjeldendeKrav gjeldendeSvar enighet trukket varsler',
  ],
  // § 33.6.2 (VS-U17, VS-U19, VS-U27): hver forespørsel og kravet eller begrunnelsen som
  // svarte, utledet av rekkefølgen i journalen, og hvordan fristkravene står til den.
  ['Sporutledning', 'relasjon', 'foresporsler'],
  // VS-U48, VS-U52: varslene etter § 34.3.3 og § 34.4, utledet av utsagnene i journalen.
  ['Sporutledning', 'relasjon', 'kravpostvarsler'],
  // VS-U79: svarene på varslene etter § 34.3.3 og § 34.4, utledet av utsagnene i journalen.
  ['Sporutledning', 'relasjon', 'svarPaaVarsler'],
  // OV-U109: kravet sendt før forespørselen, utledet av datoene.
  ['ForesporselOgSvar', 'relasjon', 'foresporsel svar medKrav kravFoer'],
  // OV-U98: dagen forespørselen ble sendt.
  ['ForesporselOgSvar', 'utsagn', 'sendt'],
  ['Foresporselsrelasjon', 'relasjon', 'art gjelder'],
  ['spor/frist/frysing.ts', 'relasjon', 'svarPaaForesporsler foresporselsrelasjon erUbesvart'],
  ['spor/frist/utledning.ts', 'relasjon', 'foresporselForFristsvar foresporselenKravetSvarerPaa'],
  // OV-U104, OV-U105: påberopelsene et svar lagt til sammenliknes med.
  [
    'Partspaaberopelse',
    'relasjon',
    'id dag hjemmel etter',
    ['utledning/utled.ts:registreringenStrider'],
  ],
  // VS-U9, VS-U11, HF-U4: partens svar etter påberopelsen, i rekkefølgen de ble sendt, som i
  // `aapneInnsigelser` (#2090).
  [
    'utledning/utled.ts:partensPaaberopelser',
    'relasjon',
    'dag svar',
    ['utledning/utled.ts:partensPaaberopelser'],
  ],
  [
    'Utledning',
    'utsagn',
    'journal',
    [
      'utledning/utled.ts:datoenDetBleSendt',
      // GR-U8, OV-U98: aksepten av et svar som ikke lenger er gjeldende, er alt godtatt.
      'utledning/utled.ts:utsagnetStrider',
      'spor/frist/utledning.ts:foresporselForFristsvar',
      'spor/frist/utledning.ts:fristkravErFremmet',
      'utledning/utled.ts:partensPaaberopelser',
      // OV-U104: om svaret med standpunktet etter § 34.4 er lagt til.
      'spor/vederlag/utledning.ts:standpunkteneTilVarslene',
      'spor/vederlag/kommando.ts:hindrerSvaretPaaVarselet',
    ],
  ],
  // VS-U79: om svaret gjelder et varsel, og om det står alene.
  ['utledning/utled.ts:erSvarPaaVarselet(elementer)', 'relasjon', '*'],
  // VS-U19: om TE har krevd dager i saken, kontrollert likt i kommandoene og utledningen.
  ['spor/frist/utledning.ts', 'predikat', 'fristkravErFremmet', ['spor/frist/kommando.ts']],
  // KA-U76, KA-U79: versjonsregelen for fristene i kravet, og hvilken frist i kontrakten som har
  // stått med hvilken `id`.
  ['spor/frist/utledning.ts', 'predikat', 'fristeneStrider', ['spor/frist/kommando.ts']],
  [
    'spor/frist/utledning.ts',
    'relasjon',
    'fristeneISporet fristnoekkel',
    ['spor/frist/kommando.ts', 'spor/frist/tekst.ts'],
  ],
  ['spor/frist/utledning.ts:fristeneISporet', 'relasjon', 'forrige sist eier'],
  ['spor/frist/utledning.ts:fristeneStrider', 'kommando', 'frister trekker'],
  ['Fristinndata', 'kommando', 'id frist_id nummer navn', ['spor/frist/utledning.ts']],
  ['spor/frist/kommando.ts:fristeneSomLagres(innhold)', 'kommando', 'frister'],
  ['spor/frist/kommando.ts:fristeneSomLagres(p)', 'kommando', 'id frist_id dager'],
  ['spor/frist/kommando.ts:fristIkkeRegistrert(p)', 'kommando', 'frist_id'],
  // VS-U20, OV-U5, HF-U1, VS-U86 punkt 6: varselet en påberopelse i et nytt svar gjelder, og
  // sperren for svaret på grunnlaget med et registrert varsel etter § 32.2 (#496, #766, #1600).
  [
    'utledning/utled.ts',
    'relasjon',
    'varseletForNyttSvar',
    ['spor/frist/kommando.ts', 'spor/vederlag/kommando.ts', 'spor/forhold/kommando.ts'],
  ],
  // #1824: varselet etter § 34.1.2 og § 34.1.3 før brevet, som vederlagskravet viser til.
  // VS-U85: det egne utsagnet om kunnskapsdatoen viser til det første varselet etter § 34.1.3.
  [
    'utledning/utled.ts',
    'relasjon',
    'varseletFoerBrevet',
    [
      'kommandoer/skriving.ts:brevtekstFor',
      'kommandoer/handlinger.ts:kandidater',
      'spor/vederlag/kommando.ts:kunnskapsdatoen',
      'spor/vederlag/kommando.ts:kunnskapsdatoISperren',
    ],
  ],
  // VS-U60, VS-U66: kravet som er det første varselet, ved siden av et eget varsel.
  [
    'utledning/utled.ts',
    'relasjon',
    'kravSomVarsler',
    [
      'kommandoer/nyttelast.ts:varslerOmForholdet',
      'spor/forhold/kommando.ts:varseletEtter322',
      'kommandoer/vedlegg.ts:kravetErVarselet',
    ],
  ],
  // VS-U38, OV-U102: påberopelsen som ble sendt først, som utledningen leser den.
  [
    'utledning/utled.ts',
    'relasjon',
    'varseletFoerSvaret',
    ['spor/forhold/kommando.ts:varseletEtter322'],
  ],
  // VS-U38: varselet etter § 32.2 kan ikke være sendt etter påberopelsen. VS-U59: en korrigering
  // kan ikke flytte datoen i grunnlagskravet til etter et varsel om forholdet.
  [
    'utledning/utled.ts',
    'relasjon',
    'datoenDetBleSendt',
    [
      'spor/forhold/kommando.ts:varseletEtter322.dagen',
      'kommandoer/nyttelast.ts:korrigeringEtterVarslene',
      // VS-U86 punkt 9: et vederlagskrav lagt til, sendt før varselet etter § 34.1.3.
      'spor/vederlag/kommando.ts:datoenForVarselet',
      // VS-U87 punkt 23: varslene et krav lagt til kan vise til.
      'spor/vederlag/kommando.ts:varselvalgetMangler',
    ],
  ],
  ['utledning/utled.ts:settSubsidiaer(svar)', 'relasjon', '*'],
  ['spor/forhold/utledning.ts:forholdssvaretsVirkning(svar)', 'relasjon', '*'],
  // MM-U17, MM-U50: om svaret er registrert korrespondanse, for visningen.
  // Svaret med ID-en, også et svar utenfor rekken (OV-U103): det en aksept gjelder.
  ['Utledning', 'relasjon', 'svar', SVARET_MED_ID],
  ['Utledning.svar', 'relasjon', '*', SVARET_MED_ID],
  ['Svarberegning', 'relasjon', 'svar'],
  ['Svarberegning', 'frosset', 'virkninger'],
  ['Enighet', 'predikat', 'grunnlag'],
  ['Enighetsgrunnlag', 'predikat', 'kilde vilkaar'],
  ['utledning/utled.ts', 'predikat', 'utled utledJournal'],
  ['spor/forhold/utledning.ts', 'predikat', 'trekkAvPaaberopelsenErSperret'],
  // GR-U7, GR-U34 punkt 12: enigheten om vederlag og frist får ingen virkning.
  [
    'spor/forhold/utledning.ts',
    'predikat',
    'forholdetErAvvistVedEnighet',
    ['utledning/utled.ts:enighetensVirkning', 'spor/frist/utledning.ts:forlengelseneISaken'],
  ],
  ['utledning/utled.ts', 'relasjon', 'paaberopelseFor'],
  ['utledning/utled.ts:paaberopelseFor', 'relasjon', 'paaberopelse'],
  // Plassen hvert element har i journalen: dokumentet og saksversjonen (4.2 i designnotatet).
  ['utledning/utled.ts:utledSporene', 'relasjon', 'hendelse versjon'],
  ['utledning/utled.ts:utledSporene.plasser', 'relasjon', 'id versjon'],
  ['utledning/utled.ts:utledSporene.registrer', 'relasjon', 'id'],
  // OV-U120: et krav utenfor rekken som varsel for en kravpost, og standpunktene i svarene før
  // det eldre kravet ble lagt til.
  ['format/leser.ts', 'rad', 'dokumenterI', [ELDRE_KRAV, VARSLER_I_ELDRE_KRAV]],
  ['format/leser.ts', 'kontekst', 'dagenSendt', [ELDRE_KRAV, `${VARSLER_I_ELDRE_KRAV}.sendt`]],
  ['Utledning', 'utsagn', 'journal', [ELDRE_KRAV, VARSLER_I_ELDRE_KRAV]],
  ['Dokument', 'relasjon', 'id', [ELDRE_KRAV, VARSLER_I_ELDRE_KRAV]],
  [
    'Krav',
    'relasjon',
    'dokument',
    [ELDRE_KRAV, VARSLER_I_ELDRE_KRAV, `${VARSLER_I_ELDRE_KRAV}.sendt`],
  ],
  [`${VARSLER_I_ELDRE_KRAV}.kjent`, 'relasjon', 'dokument', [`${VARSLER_I_ELDRE_KRAV}.kjent`]],
  [
    'spor/vederlag/utledning.ts:sendtFoer',
    'relasjon',
    'k sendt',
    ['spor/vederlag/utledning.ts:sendtFoer'],
  ],
  [`${VARSLER_I_ELDRE_KRAV}(varslene)`, 'relasjon', '*', [VARSLER_I_ELDRE_KRAV]],
  ['Kravpostvarselet', 'relasjon', 'art varsel', [VARSLER_I_ELDRE_KRAV]],
  [
    'spor/vederlag/utledning.ts',
    'relasjon',
    'eldreKravFoer',
    [
      'spor/vederlag/kommando.ts:kravpostsperre',
      'spor/vederlag/kommando.ts:kravpostvarslerIBrevet',
      'spor/vederlag/kommando.ts:varselvalgetMangler',
    ],
  ],
  // VS-U87 punkt 22 og 23: om kravet ellers ville vært varselet for kravposten.
  [
    'spor/vederlag/utledning.ts',
    'relasjon',
    'kravetVilleVaertVarselet',
    ['spor/vederlag/kommando.ts:varselvalgetMangler'],
  ],
  [
    'spor/vederlag/utledning.ts',
    'relasjon',
    'varslerIEldreKrav',
    ['kommandoer/skriving.ts:brevtekstFor'],
  ],
  ['VarselIEtEldreKrav', 'relasjon', 'gjelder hjemmel dokument', ['frosset/standpunkt.ts']],
  [
    'frosset/standpunkt.ts',
    'relasjon',
    'utenStandpunkterForanEldreKrav',
    ['frosset/brevtekst.ts:innsigelsenFoer', 'spor/vederlag/utledning.ts:standpunkteneTilVarslene'],
  ],
  ['Saken', 'relasjon', 'varslerIEldreKrav', ['frosset/brevtekst.ts:innsigelsenFoer']],
];
