/**
 * Radene i `LESBART` for området: brevteksten (`frosset/brevtekst.ts`).
 * Klassene og formen står i `klasse.ts`, og testen i `../arkitektur.test.ts`.
 */

import type { Lesbar } from './klasse.ts';

export const BREVTEKSTEN: Lesbar[] = [
  // Brevteksten (frosset/brevtekst.ts, LV-U2, LV-U3, #369). Leses bare når brevet skrives.
  [
    'format/leser.ts:lesDokument',
    'rad',
    'brevtekst brevtittel brevnummer merking deres_ref korrespondansetype sendemaate',
    ['format/leser.ts'],
  ],
  ['Avsnitt', 'brevtekst', 'gjelder', ['format/leser.ts', 'frosset/brevdeler.ts']],
  ['Avsnitt', 'brevtekst', 'laast utdypning', ['frosset/brevtekst.ts', 'frosset/brevdeler.ts']],
  // LV-U70: leseren prøver at hvert element har ett avsnitt, eller ett per punkt, og at
  // overskriften står først i den låste delen. Teksten lager punktene.
  ['Avsnitt', 'brevtekst', 'laast punkt overskrift poster', ['format/leser.ts']],
  ['Brevpunkt', 'brevtekst', 'punkt overskrift avsnitt poster', ['frosset/brevtekst.ts']],
  // LV-U71: utdypningen per punkt kopieres til teksten under punktet.
  ['Utdypning', 'brevtekst', 'utdypning utdypninger forbehold', ['frosset/brevtekst.ts']],
  [
    'frosset/brevtekst.ts:lagBrevtekst.leggPunkter',
    'brevtekst',
    'punkt overskrift',
    ['frosset/brevtekst.ts'],
  ],
  // Stedet i brevteksten en avvisning for tegnene viser til (`avsnittsnavn`).
  ['Avsnitt', 'brevtekst', 'gjelder punkt overskrift', ['kommandoer/skriving.ts:avsnittsnavn']],
  // Et element med punkter har ingen utdypning for hele elementet (`Journalen.utdypning`).
  ['Avsnitt', 'brevtekst', 'punkt', ['frosset/brevdeler.ts', 'frosset/brevtekst.ts:gjengi']],
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'UtdypningUtenPunkt',
    ['frosset/brevtekst.ts', 'kommandoer/skriving.ts:skriv'],
  ],
  ['frosset/brevdeler.ts', 'brevtekst', 'utenOverskrift', ['spor/forhold/tekst.ts']],
  ['Journalrad.data', 'rad', 'sakstittel', ['format/leser.ts']],
  // #801, #1138: skriv kontrollerer tegnene i sakstittelen og filnavnene i brevet.
  [
    'Domenehendelse',
    'brevtekst',
    'tittel',
    ['kommandoer/skriving.ts:brevtekstFor', 'kommandoer/skriving.ts:skriv'],
  ],
  // Utdypningen kopieres til teksten. Kontrollene leser bare om den finnes (A6 i
  // paragrafmatrisen, KA-U31–KA-U34 (opphevet av KA-U46), GR-U15).
  ['Svarutkast', 'kommando', 'utdypning', ['kommandoer/skriving.ts:svar']],
  // KA-U46 punkt 3 og KA-U47: kontrollen leser bare om punktet om forholdet har en begrunnelse.
  [
    'Svarutkast',
    'kommando',
    'utdypninger utdypninger.*',
    ['kommandoer/skriving.ts:svar', 'spor/forhold/kommando.ts:begrunnelseIForholdet'],
  ],
  ['Kommando', 'kommando', 'utdypninger', ['kommandoer/skriving.ts:dokument']],
  // KA-U82, LV-U74: forbeholdet i kravet står i brevteksten og leses ikke av noen regel.
  ['Kommando', 'kommando', 'forbehold', ['kommandoer/skriving.ts:dokument']],
  [
    'Kommando',
    'kommando',
    'utdypning',
    [
      'kommandoer/skriving.ts:dokument',
      'kommandoer/nyttelast.ts:kravetsUtdypning',
      'kommandoer/nyttelast.ts:begrunnelsensTekst',
    ],
  ],
  // A1: den låste teksten klienten viste, sammenliknet med teksten serveren lager.
  ['Brevtekst', 'kommando', 'brevtekst', ['kommandoer/skriving.ts:skriv']],
  // #864: brevteksten i en lagret rad leses ett sted, med formen i formatet.
  ['Journalrad.data', 'rad', 'brevtekst', ['format/leser.ts:brevtekstI']],
  ['format/format.ts', 'skjema', 'BREVTEKST', ['format/leser.ts:brevtekstI']],
  ['format/leser.ts', 'rad', 'brevtekstI', ['kommandoer/skriving.ts:laastTekst']],
  [
    'Avsnitt',
    'brevtekst',
    'laast',
    ['kommandoer/skriving.ts:laastTekstIAvsnittene', 'kommandoer/skriving.ts:tekstavvik'],
  ],
  [
    'frosset/brevtekst.ts',
    'brevtekst',
    'lagBrevtekst lagDeresRef forbeholdetBestrider',
    ['kommandoer/skriving.ts:brevtekstFor'],
  ],
  ['frosset/brevdeler.ts', 'brevtekst', 'BrevetAvvises', ['kommandoer/skriving.ts:skriv']],
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'KanIkkeUttrykkes',
    ['kommandoer/skriving.ts:brevtekstFor'],
  ],
  // MM-U3, MM-U50, #1536: brevtittelen fryses med teksten, og leseren avviser en tittel skrivingen ikke lager (#1533).
  [
    'frosset/brevtittel.ts',
    'brevtekst',
    'lagBrevtittel avvikITittelen medSakskode',
    ['kommandoer/skriving.ts:brevtekstFor', 'format/leser.ts:lesDokument'],
  ],
  ['UTSAGNSTITTEL', 'brevtekst', 'aksept trekk innsigelse korrigering', ['frosset/brevtittel.ts']],
  // VS-U77 punkt 30 og 31, VS-U79: tittelen på svaret på varselet.
  ['SVARTITTEL_PAA_VARSELET', 'brevtekst', '34.3.3 34.4', ['frosset/brevtittel.ts']],
  // LV-U44, LV-U45: brevets nummer i saken, det neste etter det høyeste.
  ['Dokument', 'brevtekst', 'brevnummer', ['kommandoer/skriving.ts:nesteBrevnummer']],
  // LV-U49, U-2 i BF-07: Deres ref. står i rekkefølgen etter brevnummeret.
  ['Dokument', 'brevtekst', 'brevnummer', ['frosset/brevtekst.ts:lagDeresRef']],
  // LV-U42: registrert korrespondanse omtales med parten, typen og datoen.
  ['Dokument', 'brevtekst', 'korrespondansetype', ['frosset/brevdeler.ts']],
  [
    'kommandoer/skriving.ts:brevtekstFor',
    'brevtekst',
    'tekst tittel deresRef',
    ['kommandoer/skriving.ts:skriv'],
  ],
  ['BrevetAvvises', 'brevtekst', 'regel', ['kommandoer/skriving.ts:skriv']],
  ['frosset/tekst.ts', 'brevtekst', 'FORBEHOLDET', ['frosset/brevtekst.ts']],
  // #2145: punktet med forholdet i svaret på vederlaget og fristen har ingen begrunnelse.
  [
    'frosset/tekst.ts',
    'brevtekst',
    'FORHOLDET',
    ['frosset/brevtekst.ts', 'spor/frist/tekst.ts', 'spor/vederlag/tekst.ts'],
  ],
  // LV-U71, #2153: punktene i svaret som ikke tar en utdypning.
  [
    'frosset/tekst.ts',
    'brevtekst',
    'UTEN_BEGRUNNELSE_I_SVARET AKSEPTFRISTEN',
    ['frosset/brevtekst.ts'],
  ],
  // Svaret 16.11 i #1997: leseren kontrollerer nøklene i punktet med tabellen.
  ['frosset/tekst.ts', 'brevtekst', 'OVERSIKTEN', ['frosset/brevtekst.ts', 'format/leser.ts']],
  ['frosset/tekst.ts', 'brevtekst', 'postradene tabellenIAvsnittet', ['format/leser.ts']],
  ['frosset/tekst.ts:tabellenIAvsnittet', 'brevtekst', 'laast overskrift', ['frosset/tekst.ts']],
  // Svaret 16.11 i #2049: hardt mellomrom etter «punkt», «pkt.» og «kl.» i brevet.
  [
    'frosset/tekst.ts',
    'brevtekst',
    'medHardeMellomrom',
    ['frosset/brevtekst.ts', 'frosset/linje.ts', 'frosset/brevtittel.ts'],
  ],
  // LV-U71, KA-U53.
  ['Avsnitt', 'brevtekst', 'laast punkt overskrift', ['frosset/tekst.ts:punkteneMedBegrunnelse']],
  [
    'frosset/tekst.ts',
    'brevtekst',
    'INNLEDNINGEN',
    ['frosset/brevtekst.ts', 'spor/frist/tekst.ts', 'spor/vederlag/tekst.ts'],
  ],
  ['frosset/tekst.ts', 'brevtekst', 'dager', ['spor/frist/tekst.ts']],
  ['frosset/tekst.ts', 'brevtekst', 'kroner', ['frosset/brevdeler.ts', 'frosset/brevtekst.ts']],
  // OV-U79, LV-U45: typen korrespondanse i omtalen i brevet, med ordene skjemaet og visningen
  // deler (#807).
  ['frosset/tekst.ts', 'brevtekst', 'KORRESPONDANSETYPEN', ['frosset/brevdeler.ts']],
  ['KORRESPONDANSETYPEN', 'brevtekst', 'ubestemt', ['frosset/brevdeler.ts']],
  // Oppslaget i sporet for en rolle, og virkningen av et standpunkt (#1783).
  [
    'frosset/byggeklosser.ts',
    'frosset',
    'iSporet',
    [
      'frosset/brevtekst.ts',
      'frosset/linje.ts',
      'frosset/standpunkt.ts',
      'frosset/utregning.ts',
      'utledning/utled.ts',
      'kommandoer/standpunkter.ts',
      'kommandoer/forutsetninger.ts',
      'kommandoer/kommando.ts',
      'kommandoer/nyttelast.ts',
      'kommandoer/skriving.ts',
      'kommandoer/lag.ts',
    ],
  ],
  [
    'frosset/byggeklosser.ts',
    'frosset',
    'virkningen',
    ['spor/frist/tekst.ts', 'spor/forhold/tekst.ts', 'spor/vederlag/tekst.ts'],
  ],
  // Teksten i sporene, som brevteksten og linjen slår opp (#1783).
  [
    'Sporsbrevtekst',
    'brevtekst',
    'krav svaretGjelder utdypningensPunkt innledning temaer punktet erInnsigelse rettidighetUtenVarsel oversikt ingenBeloep',
    ['frosset/brevtekst.ts'],
  ],
  // LV-U34 og OV-U73: temaene og beløpene per lag i byggherrens svar.
  ['Tema', 'brevtekst', 'punkt overskrift foerst', ['frosset/brevtekst.ts']],
  ['Lagbeloep', 'brevtekst', 'post plass beloep', ['spor/vederlag/tekst.ts']],
  // OV-U73: tabellen får lagene i sporet, uten lagene fra forholdet.
  ['Lagbeloep', 'brevtekst', 'plass', ['frosset/brevtekst.ts']],
  ['PostenIOversikten', 'brevtekst', 'post navn krevd', ['spor/vederlag/tekst.ts']],
  // Svaret 16.11 i #1997: tabellen fryses med nøkkelen til posten i hver rad.
  ['Oversikten', 'brevtekst', 'tabell poster', ['frosset/brevtekst.ts']],
  ['Kravsporsbrevtekst', 'brevtekst', 'enigI kravetOm trukket', ['frosset/brevtekst.ts']],
  [
    'spor/vederlag/tekst.ts',
    'brevtekst',
    'BREVTEKSTEN_I_VEDERLAGET STANDPUNKTENE_I_VEDERLAGET justeringstekst',
    ['frosset/brevtekst.ts'],
  ],
  ['Sporslinje', 'brevtekst', 'grunner egetLedd ledd', ['frosset/linje.ts']],
  ['spor/vederlag/tekst.ts', 'brevtekst', 'LINJEN_I_VEDERLAGET', ['frosset/linje.ts']],
  [
    'spor/frist/tekst.ts',
    'brevtekst',
    'BREVTEKSTEN_I_FRISTEN STANDPUNKTENE_I_FRISTEN',
    ['frosset/brevtekst.ts'],
  ],
  ['spor/frist/tekst.ts', 'brevtekst', 'LINJEN_I_FRISTEN', ['frosset/linje.ts']],
  [
    'spor/forhold/tekst.ts',
    'brevtekst',
    'BREVTEKSTEN_I_FORHOLDET STANDPUNKTENE_I_FORHOLDET paaberopelsenAvForholdet harRisikoen',
    ['frosset/brevtekst.ts'],
  ],
  ['spor/forhold/tekst.ts', 'brevtekst', 'LINJEN_I_FORHOLDET', ['frosset/linje.ts']],
  // Byggeklossene i brevteksten (#1783).
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'Journalen KanIkkeUttrykkes PRODUKTIVITET eksMva erDato kravpostenI norskDato opplistet punktum tidligere',
    [
      'frosset/brevtekst.ts',
      'spor/forhold/tekst.ts',
      'spor/vederlag/tekst.ts',
      'spor/frist/tekst.ts',
    ],
  ],
  ['frosset/brevdeler.ts', 'brevtekst', 'verdi', ['spor/vederlag/tekst.ts']],
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'kravetErstatter',
    ['spor/frist/tekst.ts', 'spor/vederlag/tekst.ts'],
  ],
  // LV-U35: partene skrives fullt ut, i eiendomsform, i brevteksten.
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'PARTENS',
    ['frosset/brevtekst.ts', 'kommandoer/nyttelast.ts:retting'],
  ],
  // Byggeklossene i brevteksten som teksten i sporene også bruker (#1783).
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'liste stor',
    ['frosset/brevtekst.ts', 'spor/forhold/tekst.ts', 'spor/vederlag/tekst.ts'],
  ],
  ['frosset/brevdeler.ts', 'brevtekst', 'BrevetAvvises', ['spor/forhold/tekst.ts']],
  // VS-U55: varselet gitt før kravet, i vederlaget og fristen.
  ['frosset/brevdeler.ts', 'brevtekst', 'gitt', ['spor/vederlag/tekst.ts', 'spor/frist/tekst.ts']],
  // OV-U32: etiketten brevet bruker for laget.
  [
    'frosset/byggeklosser.ts',
    'brevtekst',
    'etikett',
    [
      'frosset/brevtekst.ts',
      'kommandoer/utkastlag.ts',
      'frosset/linje.ts',
      'spor/vederlag/tekst.ts',
      'spor/forhold/kommando.ts:lagIForholdet',
    ],
  ],
  ['Linjeledd', 'brevtekst', 'tekst', ['frosset/linje.ts']],
  [
    'frosset/linje.ts:beslutningslinje(grunntekst)',
    'brevtekst',
    'forhold beloep oppgjoersform justering hindring spesifisering dager',
    ['frosset/linje.ts:beslutningslinje'],
  ],
  ['frosset/linje.ts:beslutningslinje.plass', 'brevtekst', 'virkning', ['frosset/linje.ts']],
  // OV-U32: leddene i samme lag under én etikett, i linjen og brevteksten.
  ['frosset/tekst.ts:iLagene', 'brevtekst', 'k l', ['frosset/tekst.ts']],
  ['frosset/tekst.ts', 'brevtekst', 'iLagene', ['frosset/linje.ts']],
  // MM-U9: linjen i beslutningsgrunnlaget, frosset når brevet sendes.
  ['frosset/linje.ts', 'brevtekst', 'beslutningslinje', ['frosset/frysing.ts:beslutningsgrunnlag']],
  [
    'frosset/tekst.ts',
    'brevtekst',
    'kroner SENT_I_LINJEN',
    ['frosset/linje.ts', 'spor/vederlag/tekst.ts'],
  ],
  // Arbeidsvalget i #479: metoden byggherren ønsker, slik brevet sier den.
  ['METODEN', 'brevtekst', 'enhetspriser regningsarbeid', ['spor/vederlag/tekst.ts']],
  ['REGELEN', 'brevtekst', '34.3 34.4', ['spor/vederlag/tekst.ts']],
  // A2 og LV-U4 punkt 6: svaret på påberopelsen og om sporene er subsidiære, lest av
  // utledningen før brevet, så `frosset/` ikke når utledningen (A6).
  // MM-U9, OV-U32: om tallet i gjeldende svar er subsidiært, som den gamle sakslisten leser til #1545 (#1050).
  [
    'Sporutledning',
    'predikat',
    'subsidiaer',
    ['kommandoer/skriving.ts:brevtekstFor', 'utledning/utled.ts:standpunktetErSubsidiaert'],
  ],
  // GR-U26: forbeholdet for ubesvart forhold skrives ikke når forholdet er avklart ved frafall.
  [
    'Saken',
    'brevtekst',
    'sakskode tittel svarPaaPaaberopelsen datoopplysninger subsidiaer avklartVedFrafall',
    ['frosset/brevtekst.ts', 'spor/forhold/tekst.ts'],
  ],
  // VS-U49, VS-U55: varselet for hver kravpost, utledet før brevet (`kravpostvarslene`, A6).
  ['Saken', 'relasjon', 'kravpostvarsler kravpostvarsler.*', ['spor/vederlag/tekst.ts']],
  ['Kravpostvarselet', 'relasjon', 'art varsel', ['spor/vederlag/tekst.ts']],
  [
    'Saken',
    'relasjon',
    'varsletFoer paaberopelse',
    ['spor/vederlag/tekst.ts', 'spor/frist/tekst.ts'],
  ],
  // LV-U56: TEs opplysninger om datoen, fra utledningen (`Datoopplysning`).
  ['Saken.datoopplysninger', 'utsagn', 'felt dato', ['spor/forhold/tekst.ts']],
  ['Saken.datoopplysninger', 'relasjon', 'dokument', ['spor/forhold/tekst.ts']],
  [
    'Tekst',
    'brevtekst',
    'j saken nytt sak',
    [
      'frosset/brevdeler.ts',
      'frosset/brevtekst.ts',
      'spor/forhold/tekst.ts',
      'spor/vederlag/tekst.ts',
      'spor/frist/tekst.ts',
    ],
  ],
  // LV-U34: punktene, lagene og nummereringen i byggherrens svar.
  ['Svarledd', 'brevtekst', 'punkt plass innsigelse tekst', ['frosset/brevtekst.ts']],
  ['Nummerering', 'brevtekst', 'foer nummerert ns', ['frosset/brevtekst.ts']],
  // VS-U77 punkt 30 og 31: punktene og lagene i svaret på varselet.
  [
    'frosset/brevtekst.ts:svarpunkterPaaVarselet',
    'brevtekst',
    'punkt plass tekst',
    ['frosset/brevtekst.ts'],
  ],
  [
    'frosset/brevtekst.ts:forholdetsLag',
    'brevtekst',
    'ledd forskyvning henvisninger',
    ['frosset/brevtekst.ts'],
  ],
  ['frosset/brevtekst.ts:utenGjentattNs', 'brevtekst', 'nevnt', ['frosset/brevtekst.ts']],
  ['Dokument', 'relasjon', 'id registrert', ['frosset/brevtekst.ts', 'frosset/brevdeler.ts']],
  // Datoen appen registrerte brevet.
  ['Dokument', 'relasjon', 'registrert', ['format/leser.ts:registrertDato']],
  // LV-U35: partene skrives fullt ut, også i meldingen når kommandoen avvises (#1953).
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'PARTEN',
    ['kommandoer/forutsetninger.ts:forutsetninger', 'kommandoer/nyttelast.ts:retting'],
  ],
  // Feltene i meldingen, listet som i brevet.
  ['frosset/brevdeler.ts', 'brevtekst', 'opplistet', ['kommandoer/nyttelast.ts:nyttelastkontroll']],
  // Datoene i meldingen, skrevet som i brevet.
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'norskDato',
    [
      'kommandoer/nyttelast.ts:oppgittDatoEtterBrevet',
      'kommandoer/nyttelast.ts:ugyldigFrist',
      'spor/forhold/kommando.ts:varseletEtter322',
      'spor/forhold/kommando.ts:datosperre',
      'spor/forhold/kommando.ts:kontrollerKorrigering',
      'kommandoer/nyttelast.ts:varseletFoerGrunnlagsdatoen',
      'kommandoer/nyttelast.ts:korrigeringEtterVarslene',
    ],
  ],
  // A4: vedleggene står i teksten, og et avsnitt kan gjelde dem.
  [
    'Dokument',
    'utsagn',
    'dokumentasjon',
    ['frosset/brevtekst.ts', 'format/leser.ts', 'frosset/brevdeler.ts'],
  ],
  [
    'Vedlegg',
    'relasjon',
    'vedlegg_id',
    [
      'spor/vederlag/kommando.ts:foranKravet',
      'spor/vederlag/kommando.ts:vedleggIVarslene',
      'frosset/brevdeler.ts',
    ],
  ],
  // Arbeidsvalg 10 i #790: teksten lister vedleggene med filnavnet.
  ['Vedlegg', 'utsagn', 'filnavn', ['frosset/brevtekst.ts', 'kommandoer/skriving.ts:skriv']],
  // GR-U14: TEs beskrivelse siteres fra teksten i brevet kravet står i.
  // Unntaket fra «ingen regel leser teksten»: PAALEGGET_IKKE_BESKREVET leser bare om
  // utdypningen finnes (A6).
  ['Dokument', 'brevtekst', 'brevtekst', ['frosset/brevdeler.ts']],
  [
    'Krav',
    'relasjon',
    'dokument',
    [
      'frosset/brevtekst.ts',
      'frosset/brevdeler.ts',
      'spor/forhold/tekst.ts',
      'spor/vederlag/tekst.ts',
      'spor/frist/tekst.ts',
    ],
  ],
  [
    'Krav',
    'relasjon',
    'dokument',
    ['utledning/utled.ts:datoenDetBleSendt', 'utledning/utled.ts:utledSporene.sendt'],
  ],
  ['Forholdsinnhold', 'utsagn', 'datoer', ['frosset/brevtekst.ts', 'spor/forhold/tekst.ts']],
  [
    'Journalen',
    'brevtekst',
    'legg brev brevet dokument dokumentetTil dokumentMed dokumenter element elementer erRegistrert iDokument krav svar utdypning versjon',
    [
      'frosset/brevtekst.ts',
      'frosset/brevdeler.ts',
      'spor/forhold/tekst.ts',
      'spor/vederlag/tekst.ts',
      'spor/frist/tekst.ts',
    ],
  ],
  // #1711: brevtekstens egen `Element`, ikke elementet i utledningen.
  [
    'frosset/brevdeler.ts:Element',
    'brevtekst',
    'art dokument krav opplysning standpunkt svar utsagn',
    ['frosset/brevtekst.ts', 'frosset/brevdeler.ts'],
  ],
  // Forholdene med navnet og hjemmelen (svaret på Q3 i #1488, LV-U43).
  [
    'spor/forhold/tekst.ts',
    'brevtekst',
    'paaberoptForhold paaberopelsenAv',
    ['frosset/brevtittel.ts'],
  ],
  ['FORHOLDSGRUPPER', 'brevtekst', 'forhold', ['spor/forhold/tekst.ts']],
  ['Forholdet', 'brevtekst', 'kode', ['spor/forhold/tekst.ts']],
  ['Forholdet', 'brevtekst', 'navn hjemmel', ['spor/forhold/tekst.ts']],
  ['Forholdet', 'brevtekst', 'navn', ['frosset/brevtittel.ts']],
  ['spor/forhold/tekst.ts.LEDD_I_33_1', 'brevtekst', '*', ['spor/forhold/tekst.ts']],
  ['frosset/brevtekst.ts:aapneInnsigelser', 'relasjon', 'fra dag svar', ['frosset/brevtekst.ts']],
  ['Innsigelse', 'relasjon', 'dokument gjelder hjemmel', ['frosset/brevtekst.ts']],
  // LV-U76, LV-U77, LV-U49: innsigelsene forespørselen fastholder, og varslene de gjelder.
  [
    'frosset/brevtekst.ts:innsigelseneIForesporselen.kom',
    'relasjon',
    'gjelder dokument',
    ['frosset/brevtekst.ts'],
  ],
  ['Fastholdt', 'brevtekst', 'hva varslene', ['frosset/brevtekst.ts']],
  // Teksten sier det brevet sier: § 32.2 for kravet, endringsordren etter GR-U12 og
  // innsigelsen svaret gjentar eller gir opp (VS-U9, VS-U11).
  ['frosset/standpunkt.ts', 'brevtekst', 'innsigelsenErOppgitt', ['frosset/brevtekst.ts']],
  ['spor/forhold/frysing.ts', 'brevtekst', 'blirEndringsordre', ['spor/forhold/tekst.ts']],
  [
    'frosset/byggeklosser.ts',
    'brevtekst',
    'gjelderVarslingsplikten standpunktet',
    ['frosset/brevtekst.ts', 'spor/forhold/tekst.ts'],
  ],
];
