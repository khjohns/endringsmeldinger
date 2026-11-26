/**
 * Radene i `LESBART` for området: formatet: skjemaene radene leses og kommandoene kontrolleres mot (`format/`).
 * Klassene og formen står i `klasse.ts`, og testen i `../arkitektur.test.ts`.
 */

import type { Lesbar } from './klasse.ts';

export const FORMATET: Lesbar[] = [
  // Formatet (format.ts): skjemaene radene leses og kommandoene kontrolleres mot.
  [
    'format/format.ts',
    'rad',
    `BESLUTNINGSGRUNNLAG DOKUMENT KRAV OPPLYSNING SAK_OPPRETTET STANDPUNKT TILLATTE_STANDPUNKTER
     SVAR UTSAGN`,
    ['format/leser.ts'],
  ],
  [
    'format/format.ts',
    'rad',
    'HJEMMEL',
    [
      'format/leser.ts',
      'spor/frist/frysing.ts:standpunkterIFristen',
      'spor/vederlag/kommando.ts',
      'spor/forhold/frysing.ts',
      'frosset/standpunkt.ts',
    ],
  ],
  ['format/format.ts', 'kontekst', 'FORMAT LESERFORMAT', ['versjon.ts']],
  // Arbeidsvalget i #479: metodene byggherren kan oppgi etter § 34.2.2.
  [
    'spor/vederlag/format.ts',
    'skjema',
    'METODER',
    ['regler/vederlag.ts:kontrollerOppgjoersformen'],
  ],
  [
    'format/format.ts',
    'skjema',
    'KRAVINNHOLD OPPLYSNINGSSLAG',
    ['kommandoer/kommando.ts', 'spor/forhold/kommando.ts'],
  ],
  [
    'format/skjema.ts',
    'skjema',
    'DATO ID liste objekt TEKST',
    [
      'format/format.ts',
      'kommandoer/kommando.ts',
      'spor/forhold/format.ts',
      'spor/vederlag/format.ts',
      'spor/frist/format.ts',
    ],
  ],
  [
    'format/skjema.ts',
    'skjema',
    'objekt',
    ['spor/vederlag/kommando.ts:kravfeil', 'spor/forhold/kommando.ts', 'spor/frist/kommando.ts'],
  ],
  // VS-U26: datoen TE oppgir i påberopelsen. Bare formkontrollen, kontrollen mot
  // brevets dato og brevteksten leser den, så ingen regel vurderer rettidigheten av den.
  ['OPPGITT_DATO', 'skjema', 'endring svikt andre_forhold', ['spor/forhold/format.ts']],
  [
    'spor/forhold/format.ts',
    'skjema',
    'oppgittDato',
    [
      'spor/forhold/kommando.ts:datofeil',
      'spor/forhold/kommando.ts:oppgittDatoIForholdet',
      'spor/forhold/kommando.ts:datosperre',
      'spor/forhold/kommando.ts:kontrollerKorrigering',
      'kommandoer/nyttelast.ts:grunnlagsdatoen',
      'spor/forhold/kommando.ts:korrigering',
      'spor/forhold/utledning.ts:opplysningerOmDatoen',
    ],
  ],
  // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U59): TEs korrigering av datoen
  // etter VS-U26, og TEs opplysninger om datoen i grunnlagskravet og i korrigeringene. Den
  // siste er TEs siste opplysning; ingen regel vurderer rettidigheten (punkt 11).
  ['Utsagn', 'utsagn', 'felt dato'],
  ['Utledning', 'utsagn', 'datoopplysninger'],
  ['Datoopplysning', 'relasjon', 'id'],
  ['Datoopplysning', 'utsagn', 'felt dato'],
  ['Dokument', 'relasjon', 'id', ['spor/forhold/utledning.ts:opplysningerOmDatoen']],
  ['Forholdsinnhold', 'utsagn', 'datoer', ['spor/forhold/utledning.ts:opplysningerOmDatoen']],
  ['spor/forhold/utledning.ts:kontrollerKorrigeringene(elementer)', 'relasjon', '*'],
  [
    'spor/forhold/utledning.ts',
    'utsagn',
    'sisteDatoopplysning',
    [
      'spor/forhold/kommando.ts:korrigering',
      'spor/forhold/kommando.ts:datosperre',
      'spor/forhold/kommando.ts:kontrollerKorrigering',
      'kommandoer/nyttelast.ts:grunnlagsdatoen',
    ],
  ],
  // VS-U86 punkt 12–14 (VS-U82–VS-U85): kunnskapsdatoen etter § 34.1.3 annet ledd, i varselet,
  // i vederlagskravet og i det egne utsagnet. Formkontrollen, kontrollen mot datoen brevet er
  // sendt (VS-U83), at den bare endres i det egne utsagnet (VS-U85) og brevteksten leser den;
  // ingen regel vurderer rettidigheten (punkt 16).
  ['Utsagn', 'utsagn', 'klar_over_utgiftene'],
  ['format/leser.ts:lesDokument(e)', 'rad', 'klar_over_utgiftene'],
  ['Kommando', 'kommando', 'klar_over_utgiftene'],
  [
    'Vederlagsinnhold.saerskilt',
    'utsagn',
    'produktivitet produktivitet.klar_over_utgiftene',
    ['spor/vederlag/format.ts:kunnskapsdatoIKravet'],
  ],
  [
    'spor/vederlag/format.ts',
    'utsagn',
    'kunnskapsdatoIKravet',
    [
      'kommandoer/kommando.ts:kunnskapsdatoIKommandoen',
      'spor/vederlag/kommando.ts:kunnskapsdatoISperren',
      'spor/vederlag/kommando.ts:kravfeil',
      'spor/vederlag/utledning.ts:kontrollerKunnskapsdatoene',
      'spor/vederlag/utledning.ts:opplysningerOmKunnskapsdatoen',
      'spor/vederlag/tekst.ts:vederlagstekst',
    ],
  ],
  ['kommandoer/kommando.ts:formfeil(kommando)', 'kommando', 'klar_over_utgiftene'],
  [
    'kommandoer/kommando.ts',
    'kommando',
    'kunnskapsdatoIKommandoen',
    ['kommandoer/nyttelast.ts:kunnskapsdatoEtterBrevet'],
  ],
  ['Utledning', 'utsagn', 'kunnskapsdatoer'],
  ['Kunnskapsopplysning', 'relasjon', 'id'],
  ['Kunnskapsopplysning', 'utsagn', 'dato'],
  // VS-U85: den første opplysningen og hvert eget utsagn blir TEs siste.
  ['Kunnskapsopplysning', 'predikat', 'blirSiste'],
  ['Dokument', 'relasjon', 'id', ['spor/vederlag/utledning.ts:opplysningerOmKunnskapsdatoen']],
  [
    'spor/vederlag/utledning.ts',
    'predikat',
    'kontrollerKunnskapsdatoene opplysningerOmKunnskapsdatoen',
    ['utledning/utled.ts:utledSporene'],
  ],
  [
    'spor/vederlag/utledning.ts',
    'utsagn',
    'sisteKunnskapsdato',
    [
      'spor/vederlag/kommando.ts:kunnskapsdatoenErOppgitt',
      'spor/vederlag/kommando.ts:kontrollerKunnskapsdatoen',
      'kommandoer/skriving.ts:brevtekstFor',
    ],
  ],
  [
    'spor/vederlag/kommando.ts',
    'predikat',
    'kunnskapsdatoen',
    ['kommandoer/forutsetninger.ts:henvisning'],
  ],
  [
    'spor/vederlag/kommando.ts',
    'predikat',
    'kunnskapsdatoIVarselet kontrollerKunnskapsdatoen',
    ['kommandoer/nyttelast.ts:nyttelastkontroll'],
  ],
  // VS-U58: datoen i grunnlagskravet, som varselet om forholdet kontrolleres mot.
  ['kommandoer/nyttelast.ts:grunnlagsdatoen', 'utsagn', 'felt dag'],
  [
    'Kommando',
    'kommando',
    'paalegg_mottatt klar_over_forholdet',
    ['spor/forhold/kommando.ts:korrigertDato'],
  ],
  ['spor/forhold/kommando.ts:korrigertDato', 'kommando', 'felt dato'],
  [
    'spor/forhold/kommando.ts',
    'kommando',
    'korrigertDato',
    [
      'kommandoer/nyttelast.ts',
      'kommandoer/skriving.ts:dokument',
      'kommandoer/kommando.ts:formfeil',
    ],
  ],
  [
    'spor/forhold/kommando.ts:datofeil(innhold)',
    'kommando',
    'hovedkategori underkategori paalegg_mottatt klar_over_forholdet',
    ['spor/forhold/kommando.ts:datofeil'],
  ],
  // OV-U58: beløpene TE krever, som formkontrollen leser for å avvise brøkdeler av øre.
  [
    'spor/vederlag/kommando.ts:oerefeil(innhold)',
    'kommando',
    'kravposter saerskilt saerskilt.produktivitet',
    ['spor/vederlag/kommando.ts:oerefeil'],
  ],
  // #1775: rigg og drift i forlenget byggetid avvises til #1724 har satt formen.
  [
    'spor/vederlag/kommando.ts:harRiggOgDrift(innhold)',
    'kommando',
    'saerskilt',
    ['spor/vederlag/kommando.ts:harRiggOgDrift'],
  ],
  [
    'spor/vederlag/kommando.ts:oerefeil(p)',
    'kommando',
    'beloep anslag kostnadsoverslag',
    ['spor/vederlag/kommando.ts:oerefeil'],
  ],
  [
    'spor/vederlag/kommando.ts:oerefeil',
    'kommando',
    'beloep',
    ['spor/vederlag/kommando.ts:oerefeil'],
  ],
  // OV-U115 punkt 19–22, arbeidsvalget 07.11 i domenetabellen: skjemaet for vederlagskravet i kommandoen.
  [
    'spor/vederlag/format.ts',
    'skjema',
    'vederlagsinnhold',
    ['spor/vederlag/kommando.ts:kravfeil', 'format/format.ts'],
  ],
  [
    'spor/vederlag/format.ts:vederlagsinnhold',
    'skjema',
    'properties required anyOf',
    ['spor/vederlag/kommando.ts:kravfeil'],
  ],
  [
    'spor/frist/format.ts:fristinnhold',
    'skjema',
    'properties required anyOf',
    ['spor/frist/kommando.ts'],
  ],
  ['spor/frist/format.ts', 'skjema', 'fristinnhold', ['spor/frist/kommando.ts']],
  // #1783: formatet for vederlaget i sporet.
  [
    'spor/vederlag/format.ts',
    'skjema',
    'TILLATTE_STANDPUNKTER_I_VEDERLAGET STANDPUNKT_I_VEDERLAGET UTREGNINGSSKJEMA_I_VEDERLAGET',
    ['format/format.ts'],
  ],
  [
    'format/skjema.ts',
    'skjema',
    'artfelt',
    [
      'format/format.ts',
      'spor/forhold/format.ts',
      'spor/vederlag/format.ts',
      'spor/frist/format.ts',
    ],
  ],
  // #1783: formatet for fristen i sporet.
  [
    'spor/frist/format.ts',
    'skjema',
    'TILLATTE_STANDPUNKTER_I_FRISTEN STANDPUNKT_I_FRISTEN fristinnhold RELASJON_I_FRISTKRAVET UTREGNINGSSKJEMA_I_FRISTEN',
    ['format/format.ts'],
  ],
  // #1783: formatet for forholdet i sporet.
  [
    'spor/forhold/format.ts',
    'skjema',
    'TILLATTE_STANDPUNKTER_I_FORHOLDET STANDPUNKT_I_FORHOLDET FORHOLDSINNHOLD',
    ['format/format.ts'],
  ],
  // KA-U53, KA-U56, KA-U75: kravpostene en ny versjon får id og betegnelse for, og
  // versjonsreglene kommandoen og lesingen av journalen bruker.
  [
    'spor/vederlag/kommando.ts:medKravposter(innhold)',
    'kommando',
    'kravposter',
    ['spor/vederlag/kommando.ts:medKravposter'],
  ],
  [
    'spor/vederlag/kommando.ts:medKravposter(p)',
    'kommando',
    'id',
    ['spor/vederlag/kommando.ts:medKravposter'],
  ],
  [
    'Kravversjonsinndata',
    'kommando',
    'kravposter trekker',
    ['spor/vederlag/utledning.ts:kravposteneStrider'],
  ],
  // #1778: versjonsregelen for postene, som vederlaget bruker for kravpostene.
  ['Versjonsinndata', 'kommando', 'poster trekker', ['spor/poster/utledning.ts:posteneStrider']],
  ['Postinndata', 'kommando', 'id betegnelse', ['spor/poster/utledning.ts:posteneStrider']],
  ['Post', 'relasjon', 'id betegnelse', ['spor/poster/utledning.ts']],
  [
    'spor/poster/utledning.ts',
    'predikat',
    'posteneStrider',
    ['spor/vederlag/utledning.ts:kravposteneStrider'],
  ],
  ['spor/vederlag/utledning.ts', 'predikat', 'kravposteneStrider', ['spor/vederlag/kommando.ts']],
  ['spor/vederlag/utledning.ts', 'predikat', 'saerskiltStrider', ['spor/vederlag/kommando.ts']],
  // #1956: fristen deler kontrollen av trekket og av postene som mangler.
  [
    'spor/poster/utledning.ts',
    'predikat',
    'trekketStrider utelattUtenTrekk',
    ['spor/frist/utledning.ts:fristeneStrider'],
  ],
  // KA-U83: den særskilte vederlagsjusteringen mangler som en post uten trekk.
  [
    'spor/poster/utledning.ts',
    'predikat',
    'trekketStrider utelattUtenTrekk',
    ['spor/vederlag/utledning.ts:saerskiltStrider'],
  ],
  [
    'spor/poster/utledning.ts',
    'relasjon',
    'brukteBetegnelser',
    ['spor/vederlag/kommando.ts:medKravposter'],
  ],
  [
    'spor/poster/utledning.ts',
    'relasjon',
    'nesteBetegnelse',
    ['spor/vederlag/kommando.ts:medKravposter'],
  ],
  // VS-U49, D-16, VS-U55: varselet for hver kravpost, lest av skriveren for brevteksten (A6).
  [
    'spor/vederlag/utledning.ts',
    'relasjon',
    'kravpostvarslene',
    ['spor/vederlag/kommando.ts:kravpostvarslerIBrevet'],
  ],
  [
    'spor/vederlag/utledning.ts:kravpostvarslene',
    'utsagn',
    'hjemmel id',
    ['spor/vederlag/utledning.ts:kravpostvarslene'],
  ],
  // VS-U50: om kravposten viser til et varsel etter samme bestemmelse før kravet.
  [
    'spor/vederlag/utledning.ts',
    'predikat',
    'kravpostvarseletStrider',
    ['spor/vederlag/kommando.ts'],
  ],
  [
    'spor/vederlag/utledning.ts:kravpostvarseletStrider',
    'utsagn',
    'hjemmel id',
    ['spor/vederlag/utledning.ts:kravpostvarseletStrider'],
  ],
  [
    'Kommando.innhold',
    'kommando',
    'hovedkategori underkategori paalegg_mottatt klar_over_forholdet',
    ['spor/forhold/kommando.ts:oppgittDatoIForholdet', 'spor/forhold/kommando.ts:datosperre'],
  ],
  // Datoen parten oppgir, det den gjelder og hvem som oppgir den, som bare kontrollen mot
  // brevets dato leser.
  [
    'kommandoer/nyttelast.ts:OppgittDato',
    'kommando',
    'dato gjelder av',
    ['kommandoer/nyttelast.ts:oppgittDatoEtterBrevet'],
  ],
  [
    'kommandoer/nyttelast.ts',
    'kommando',
    'oppgittDatoEtterBrevet',
    ['kommandoer/avvisning.ts:avvisning'],
  ],
  // #698, #1952: det datoen gjelder, med de samme ordene i meldingene, skjemaet og brevet.
  [
    'spor/forhold/format.ts',
    'brevtekst',
    'DATOEN_GJELDER',
    [
      'kommandoer/nyttelast.ts',
      'spor/forhold/kommando.ts',
      'spor/forhold/tekst.ts',
      'frosset/brevtekst.ts',
    ],
  ],
  // Brevets dato er serverens tidspunkt i norsk tid (VS-U8).
  ['format/leser.ts', 'kontekst', 'registrertDato', ['kommandoer/skriving.ts:skriv']],
  // VS-U38, OV-U98: dagen påberopelsen fra appen eller et brev lagt til ble sendt. OV-U105,
  // OV-U104: et svar gir opp innsigelsen fra dagen det ble sendt.
  [
    'format/leser.ts',
    'kontekst',
    'dagenSendt',
    [
      'utledning/utled.ts:datoenDetBleSendt',
      'frosset/brevtekst.ts:aapneInnsigelser',
      // VS-U77 punkt 9 og 12: dagen et svar med standpunktet til varselet for kravposten ble sendt.
      'frosset/brevtekst.ts:varseltekst',
      'spor/vederlag/utledning.ts:standpunkteneTilVarslene',
      'spor/vederlag/kommando.ts:hindrerSvaretPaaVarselet',
      // OV-U109, OV-U104: dagen forespørselen og fristkravet ble sendt.
      'spor/frist/frysing.ts:svarPaaForesporsler',
      'utledning/utled.ts:partensPaaberopelser',
    ],
  ],
  // HF-U23: akseptfristen i svaret, som brevet ved aksepten sammenlikner med dagen den sendes.
  ['format/leser.ts', 'kontekst', 'registrertDato', ['frosset/brevtekst.ts:utsagnstekst']],
  [
    'Svar',
    'utsagn',
    'akseptfrist',
    ['frosset/brevtekst.ts:utsagnstekst', 'frosset/brevtekst.ts:akseptfristpunktet'],
  ],
  [
    'regler/akseptfrist.ts',
    'regelsett',
    'etterAkseptfristen',
    ['frosset/brevtekst.ts:utsagnstekst'],
  ],
  ['Svarutkast', 'kommando', 'akseptfrist', ['kommandoer/skriving.ts:svar']],
  ['format/skjema.ts', 'skjema', 'KALENDERDAG', ['format/format.ts', 'kommandoer/kommando.ts']],
  // #1588: merkingen og tittelen i samme brev nevner samme sak (LV-U27, LV-U48).
  [
    'frosset/brevtittel.ts',
    'brevtekst',
    'ulikSakIMerkingenOgTittelen',
    ['format/leser.ts:lesDokument'],
  ],
  ['format/leser.ts:lesSvar(e)', 'rad', 'akseptfrist', ['format/leser.ts']],
  // HF-U23 punkt 1 og 2: kontrollen av akseptfristen leser svarene slik brevet fryser dem.
  [
    'kommandoer/nyttelast.ts:akseptfristeneIBrevet(s)',
    'frosset svar',
    'akseptfrist spor utregning beslutningsgrunnlag',
    ['kommandoer/nyttelast.ts:akseptfristeneIBrevet'],
  ],
  [
    'UTEN_AKSEPTFRIST',
    'brevtekst',
    'forholdet avslag hele_kravet',
    ['kommandoer/nyttelast.ts:akseptfristeneIBrevet'],
  ],
  [
    'regler/akseptfrist.ts',
    'regelsett',
    'utenAkseptfrist ugyldigAkseptfrist',
    ['kommandoer/nyttelast.ts:akseptfristeneIBrevet', 'kommandoer/nyttelast.ts:ugyldigFrist'],
  ],
  [
    'spor/vederlag/format.ts',
    'frosset svar',
    'godkjennerBeloepIEtLag',
    ['kommandoer/nyttelast.ts'],
  ],
  ['spor/frist/format.ts', 'frosset svar', 'godkjennerDagerIEtLag', ['kommandoer/nyttelast.ts']],
  ['Svaretsomfang', 'frosset svar', 'spor godkjennerNoe sammenfall', ['regler/akseptfrist.ts']],
  ['regler/hverdager.ts', 'regelsett', 'erHverdag erLoerdag', ['regler/akseptfrist.ts']],
  [
    'kommandoer/nyttelast.ts',
    'kommando',
    'akseptfristeneIBrevet',
    ['kommandoer/skriving.ts:skriv'],
  ],
  ['kommandoer/skriving.ts:skriv(data)', 'rad', 'svar', ['kommandoer/skriving.ts:skriv']],
  ['TILLATTE_STANDPUNKTER', 'rad', 'art paakrevd', ['format/leser.ts']],
  ['KRAVINNHOLD', 'skjema', 'properties required anyOf'],
  // Kodene i formatet for kategoriene (#335): formen på påberopelsen.
  ['format/koder.ts', 'skjema', 'HOVEDKATEGORIER UNDERKATEGORIER', ['spor/forhold/format.ts']],
  // #516: kategoriene står i regelsettet, så reglene types mot dem.
  ['regler/typer.ts', 'skjema', 'KATEGORIER', ['spor/forhold/format.ts', 'format/koder.ts']],
  ['KATEGORIER', 'skjema', 'endring svikt andre_forhold force_majeure', ['spor/forhold/format.ts']],
  // Oversettelsen fra katalogens koder, for klienten og språkprøven (#335).
  ['format/koder.ts:fraKatalogen(tabell)', 'kommando', '*', ['format/koder.ts']],
  [
    'format/koder.ts:kategoriFraKatalogen',
    'kommando',
    'hovedkategori underkategori',
    ['format/koder.ts'],
  ],
  ['regler/typer.ts', 'regelsett', 'FRISTRESULTATER', ['spor/frist/format.ts']],
  ['regler/typer.ts', 'regelsett', 'FORHOLDSRESULTATER', ['spor/forhold/format.ts']],
  ['regler/typer.ts', 'regelsett', 'VEDERLAGSRESULTATER SAERSKILTE', ['spor/vederlag/format.ts']],
];
