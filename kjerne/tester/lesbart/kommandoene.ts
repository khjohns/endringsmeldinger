/**
 * Radene i `LESBART` for området: kommandoene og kontrollen av dem (`kommandoer/`).
 * Klassene og formen står i `klasse.ts`, og testen i `../arkitektur.test.ts`.
 */

import type { Lesbar } from './klasse.ts';

export const KOMMANDOENE: Lesbar[] = [
  // Kommandoene og kontrollen av dem.
  [
    'Kommando',
    'kommando',
    'type spor svar innhold varsel erstatter regelversjon sendt hjemmel dokumentasjon gjelder grunn',
  ],
  // OV-U5: varselet i fristkravet har datoen og brevet som vedlegg.
  ['Kommando.varsel', 'kommando', 'sendt dokumentasjon'],
  // VS-U34: er varselet registrert, står typen, sendemåten og beskrivelsen i brevet med det.
  [
    'Kommando.varsel',
    'kommando',
    'korrespondansetype sendemaate beskrivelse',
    ['kommandoer/nyttelast.ts:nyttelastkontroll'],
  ],
  ['BARE_LAGT_TIL', 'kommando', 'korrespondansetype sendemaate beskrivelse'],
  [
    'kommandoer/kommando.ts',
    'kommando',
    'BARE_LAGT_TIL',
    ['kommandoer/nyttelast.ts:nyttelastkontroll'],
  ],
  // GR-U22: hjemmelen i en ny påberopelsesversjon sammenliknes med gjeldende versjon.
  [
    'Kommando.innhold',
    'utsagn',
    'hovedkategori underkategori',
    ['spor/forhold/kommando.ts:kategorisperre'],
  ],
  // GR-U40 punkt 7: endringsordren i underkategorien endringsordre står.
  ['Kommando.innhold', 'utsagn', 'endringsordre', ['spor/forhold/kommando.ts:kategorisperre']],
  // KA-U79, GFK-U23: fristene i fristkravet kontrolleres mot fristtabellen.
  ['Kommando.innhold', 'kommando', 'frister', ['spor/frist/kommando.ts:fristIkkeRegistrert']],
  ['Svarutkast', 'kommando', 'spor gjelder regelversjon vurderinger'],
  ['Svarutkast', 'kommando', 'resultat', ['kommandoer/nyttelast.ts']],
  // B-13: feltene klienten regnet ut, sammenliknet med serverens (`SAMMENLIKNES`).
  ['frosset/utregning.ts:avvikIResultatet(klient)', 'kommando', '*'],
  ['frosset/utregning.ts:avvikIResultatet(server)', 'regelsett', '*'],
  ['frosset/utregning.ts:avvikIResultatet(fra)', 'kommando', '*'],
  ['frosset/utregning.ts:avvikIResultatet(rad)', 'regelsett', '*'],
  [
    'frosset/utregning.ts:avvikIResultatet',
    'regelsett',
    'sti serveren',
    ['kommandoer/nyttelast.ts:kontrollerSvar'],
  ],
  ['Handlingsnoekkel', 'kommando', 'type spor gjelder hjemmel'],
  // #1703: nøkkelen i den tilbudte handlingen. De andre feltene leses bare av visningen.
  ['TilbudtHandling', 'kommando', 'noekkel'],
  // LV-U14: ID-ene i kommandoen slås opp i vedleggene serveren leste (arbeidsvalg 3 i #790).
  ['kommandoer/kommando.ts', 'kommando', 'formfeil vedleggI'],
  // VS-U51, VS-U53: dokumentet kravskjemaet legger til som varselet for en kravpost, skrives
  // som et registrert varsel før kravet, og kravet er neste rad i samme handling.
  [
    'Kommando.innhold',
    'kommando',
    'kravposter',
    ['spor/vederlag/kommando.ts:medDokumentvarslene', 'spor/vederlag/kommando.ts:medVarslene'],
  ],
  [
    'spor/vederlag/kommando.ts:vedleggIKravpostene(innhold)',
    'kommando',
    'kravposter',
    ['spor/vederlag/kommando.ts:vedleggIKravpostene'],
  ],
  ['spor/vederlag/kommando.ts:vedleggIKravpostene', 'kommando', 'varsel dokumentasjon'],
  ['spor/vederlag/kommando.ts:medDokumentvarslene(p)', 'kommando', 'varsel'],
  ['spor/vederlag/kommando.ts:medVarslene(p)', 'kommando', 'varsel'],
  ['Dokumentvarsel', 'kommando', 'dokumentasjon sendt korrespondansetype sendemaate beskrivelse'],
  ['kommandoer/skriving.ts:Utfall', 'kommando', 'godtatt hendelser neste avvisning'],
  [
    'Avvisning',
    'kommando',
    'melding',
    ['spor/vederlag/kommando.ts:medVarslene', 'spor/frist/kommando.ts'],
  ],
  ['Journalrad.data', 'rad', 'utsagn', ['spor/vederlag/kommando.ts:medVarslene']],
  ['spor/vederlag/kommando.ts:medVarslene', 'rad', 'id'],
  ['spor/vederlag/kommando.ts:medVarslene', 'utsagn', 'hjemmel'],
  ['Dokumentpost', 'kommando', 'varsel'],
  // VS-U51, VS-U53: dokumentet fra kravskjemaet gjelder bare kravposten som viser til det.
  [
    'Dokument',
    'utsagn',
    'dokumentasjon',
    ['spor/vederlag/kommando.ts:foranKravet', 'spor/vederlag/kommando.ts:vedleggIVarslene'],
  ],
  [
    'Utsagn',
    'relasjon',
    'dokument',
    [
      'spor/vederlag/kommando.ts:foranKravet',
      'spor/vederlag/kommando.ts:varseldokumentene',
      'spor/frist/kommando.ts:varseldokumentetISaken',
    ],
  ],
  ['kommandoer/kommando.ts:formfeil', 'kommando', 'type spor innhold svar dokumentasjon hjemmel'],
  // OV-U79: bare et brev har sendemåten, også i varselet i fristkravet.
  ['kommandoer/kommando.ts:formfeil(kommando)', 'kommando', 'varsel'],
  // OV-U16, OV-U79: en beskrivelse med bare mellomrom er ingen beskrivelse.
  ['kommandoer/kommando.ts:formfeil(k)', 'kommando', 'beskrivelse'],
  ['kommandoer/kommando.ts:sendemaatefeil(k)', 'kommando', 'korrespondansetype'],
  // OV-U79, arbeidsvalget 2 A i #807: sendemåten for et brev lagt til.
  ['kommandoer/kommando.ts:korrespondansefeil(k)', 'kommando', 'korrespondansetype'],
  // OV-U79: sendemåten lagres slik avsenderen oppga den, og ingen regel leser den.
  ['Kommando', 'kommando', 'sendemaate', ['kommandoer/skriving.ts:dokument']],
  // OV-U79, OV-U80: avsenderen av korrespondanse motparten har sendt.
  ['Kommando', 'kommando', 'avsender', ['kommandoer/skriving.ts:dokument']],
  // OV-U16: beskrivelsen lagres slik avsenderen skrev den, og ingen regel leser den.
  ['Kommando', 'kommando', 'beskrivelse', ['kommandoer/skriving.ts:dokument']],
  // LV-U42: typen registrert korrespondanse lagres slik avsenderen oppga den.
  ['Kommando', 'kommando', 'korrespondansetype', ['kommandoer/skriving.ts:dokument']],
  // OV-U80, OV-U98: et svar eller en aksept lagt til med datoen det ble sendt.
  [
    'Registrering',
    'kommando',
    'sendt korrespondansetype sendemaate beskrivelse dokumentasjon',
    [
      'kommandoer/kommando.ts',
      'kommandoer/nyttelast.ts',
      'kommandoer/skriving.ts:registrering',
      // HF-U23 punkt 1, OV-U98: akseptfristen regnes fra dagen svaret ble sendt.
      'kommandoer/skriving.ts:skriv',
    ],
  ],
  [
    'kommandoer/kommando.ts',
    'predikat',
    'erRegistrering',
    [
      'kommandoer/skriving.ts:skriv',
      'kommandoer/skriving.ts:dokument',
      'kommandoer/nyttelast.ts:oppgittDatoI',
      'kommandoer/avvisning.ts:avvisning',
    ],
  ],
  // OV-U102: et krav lagt til, sendt før det siste, står utenfor rekken.
  ['utledning/utled.ts', 'relasjon', 'sendtFoerSisteKrav', ['kommandoer/skriving.ts:dokument']],
  ['format/leser.ts', 'relasjon', 'kalenderdag', ['kommandoer/skriving.ts:dokument']],
  ['Registrering', 'kommando', 'sendt', ['kommandoer/skriving.ts:dokument']],
  // OV-U103: et svar lagt til, sendt før det gjeldende svaret, står utenfor rekken.
  [
    'utledning/utled.ts',
    'relasjon',
    'sendtFoerGjeldendeSvar',
    [
      'kommandoer/skriving.ts:dokument',
      'kommandoer/forutsetninger.ts:forutsetninger',
      'kommandoer/nyttelast.ts:kontrollerSvar',
    ],
  ],
  // OV-U98, #2011: et svar lagt til regnes mot påberopelsen slik den var da det ble sendt.
  [
    'utledning/utled.ts',
    'relasjon',
    'kravversjonenPaaDagen',
    ['kommandoer/nyttelast.ts:kontrollerSvar', 'kommandoer/utkastlag.ts:lageneIUtkastet'],
  ],
  // OV-U98, #2057: et svar lagt til fryses med lagene i svaret på forholdet som gjaldt da.
  [
    'utledning/utled.ts',
    'relasjon',
    'svaretPaaForholdetPaaDagen',
    [
      'kommandoer/skriving.ts:frosneSvar',
      'kommandoer/skriving.ts:frysBrev',
      // #2090: forhåndsvisningen av et svar lagt til leser lagene fra det samme.
      'kommandoer/utkastlag.ts:lageneIUtkastet',
    ],
  ],
  ['Journalrad.data', 'rad', 'opplysninger', ['kommandoer/skriving.ts:frysBrev']],
  ['format/leser.ts', 'relasjon', 'kalenderdag', ['kommandoer/skriving.ts:frysBrev']],
  ['format/leser.ts', 'relasjon', 'kalenderdag', ['kommandoer/avvisning.ts:avvisning']],
  ['Registrering', 'kommando', 'sendt', ['kommandoer/avvisning.ts:avvisning']],
  // VS-U73: et krav lagt til.
  [
    'Registrering',
    'kommando',
    'sendt',
    [
      'spor/frist/kommando.ts:varseldokumentetISaken',
      'spor/vederlag/kommando.ts:vedleggetErEtVarsel',
    ],
  ],
  // OV-U109: dagen forespørselen og fristkravet ble sendt.
  [
    'Dokument',
    'relasjon',
    'id',
    ['spor/frist/frysing.ts:svarPaaForesporsler', 'utledning/utled.ts:partensPaaberopelser'],
  ],
  // MM-U43 punkt 9: et svar uten virkning gir ikke opp innsigelsen (OV-U105).
  ['Utledning', 'relasjon', 'utenVirkning', ['kommandoer/skriving.ts:brevtekstFor']],
  ['Utledning.utenVirkning', 'relasjon', 'element', ['kommandoer/skriving.ts:brevtekstFor']],
  ['Saken', 'relasjon', 'utenVirkning', ['frosset/brevtekst.ts:aapneInnsigelser.utenVirkning']],
  ['Saken', 'relasjon', 'utenVirkning', ['frosset/brevtekst.ts:innsigelseneIForesporselen']],
  ['Saken', 'relasjon', 'utenVirkning', ['frosset/brevtekst.ts:rettidighetstekst']],
  // OV-U104: sammenlikningene samme dag.
  ['Utledning.sendtSammeDag', 'relasjon', 'element med'],
  // OV-U80: et registrert svar har ingen tekst fra løsningen.
  ['Svarutkast', 'kommando', 'utdypning utdypninger', ['kommandoer/kommando.ts:formfeil']],
  // OV-U98: en registrering godtas bare når utledningen gir den virkning.
  ['Utledning', 'relasjon', 'utenVirkning', ['kommandoer/skriving.ts:skriv']],
  ['Dokument', 'relasjon', 'id', ['utledning/utled.ts:registreringenStrider.dag']],
  ['Utledning.utenVirkning', 'relasjon', 'hendelse grunn', ['kommandoer/skriving.ts:skriv']],
  // OV-U17, OV-U18: registreringen en retting viser til, kontrollert mot utledningen.
  [
    'Kommando',
    'kommando',
    'retter',
    ['kommandoer/nyttelast.ts:nyttelastkontroll', 'kommandoer/skriving.ts:dokument'],
  ],
  // OV-U4, OV-U16: brevene registrert som dokumentasjon og rettingene av dem. Bare
  // kontrollen av rettingen leser dem; beskrivelsen og sporene går uendret til visningen.
  ['Dokument', 'relasjon', 'id retter', ['utledning/utled.ts:registreringer']],
  // OV-U19: brevene appen ikke vurderer, for visningen. Ingen regel leser dem.
  ['Dokument', 'relasjon', 'id', ['utledning/utled.ts:ikkeVurderte']],
  // VS-U70: datoen varselet og kravet ble sendt, i kontrollen av påberopelsen.
  [
    'Dokument',
    'relasjon',
    'id',
    ['utledning/utled.ts:datoenDetBleSendt', 'utledning/utled.ts:utledSporene'],
  ],
  ['Dokument', 'relasjon', 'registrert', ['utledning/utled.ts:utledSporene.sendt']],
  ['RegistrertBrev', 'relasjon', 'dokument rettetAv', ['utledning/utled.ts:ikkeVurderte']],
  [
    'Dokument',
    'relasjon',
    'ikkeISaken',
    ['kommandoer/skriving.ts:brevtekstFor', 'utledning/utled.ts:kilden'],
  ],
  ['Dokument', 'utsagn', 'beskrivelse spor dokumentasjon', ['utledning/utled.ts:registreringer']],
  ['utledning/utled.ts:registreringer', 'relasjon', 'brev feil', ['utledning/utled.ts']],
  [
    'Utledning',
    'relasjon',
    'registrerteBrev',
    ['kommandoer/nyttelast.ts:retting', 'utledning/utled.ts:utled'],
  ],
  [
    'RegistrertBrev',
    'relasjon',
    'dokument lagtTilAv rettetAv',
    ['utledning/utled.ts:registreringer', 'kommandoer/nyttelast.ts:retting'],
  ],
  // #984: datoen og vedleggene i kommandoen, med stien feilmeldingene viser til.
  ['kommandoer/kommando.ts:brevfelt', 'kommando', 'sti sendt dokumentasjon'],
  // OV-U5: sporet og bestemmelsen i TEs varsel, også det registrerte etter § 32.2 (VS-U34),
  // og varslene etter § 34.3.3 og § 34.4 (VS-U48, VS-U52).
  ['Hjemmelsvarsel', 'kommando', 'spor hjemmel'],
  // OV-U5: varselet i sporet, som handlingsnøkkelen uten hjemmel gjelder.
  // #1703: også hjemmelen i den tilbudte handlingen, så visningen ikke utleder den.
  [
    'VARSEL_I_SPORET',
    'relasjon',
    'frist vederlag',
    ['kommandoer/forutsetninger.ts', 'kommandoer/handlinger.ts:handling'],
  ],
  ['kommandoer/forutsetninger.ts', 'relasjon', 'VARSEL_I_SPORET', ['kommandoer/handlinger.ts']],
  ['kommandoer/forutsetninger.ts', 'predikat', 'forutsetninger noekkel'],
  // KA-U1, HF-U8: meldingen når aksepten ikke gjelder det gjeldende svaret, lik i
  // forutsetningene og nyttelastkontrollen.
  ['kommandoer/forutsetninger.ts', 'brevtekst', 'ELDRE_SVAR', ['kommandoer/nyttelast.ts']],
  ['kommandoer/nyttelast.ts', 'predikat', 'nyttelastkontroll'],
  ['kommandoer/avvisning.ts', 'predikat', 'avvisning'],
  [
    'typer.ts',
    'relasjon',
    'SPOR KRAVSPOR VARSELSPOR erVarselhjemmel erKravpostvarselhjemmel utenGren',
  ],
  // Avvisningen med regelkoden og meldingen, felles for forutsetningene, nyttelasten og skrivingen.
  ['typer.ts', 'predikat', 'avvis'],
  // Det en oppgitt dato for et varsel gjelder, i avvisningene (#1783).
  ['typer.ts', 'predikat', 'varseletSendt', ['kommandoer/nyttelast.ts']],
  // OV-U32: laget en fryst virkning står i, og laget i et svarutkast (#1400).
  [
    'frosset/byggeklosser.ts',
    'frosset',
    'laget',
    [
      'frosset/brevtekst.ts',
      'spor/vederlag/kommando.ts',
      'frosset/linje.ts',
      'spor/frist/frysing.ts',
      'kommandoer/utkastlag.ts',
      'spor/vederlag/frysing.ts',
      'spor/vederlag/tekst.ts',
      'spor/forhold/kommando.ts:lagIForholdet',
    ],
  ],
  // OV-U32, OV-U33: lagene i et svarutkast regnes som brevet regner dem (S1-A i #1400).
  [
    'frosset/standpunkt.ts',
    'predikat',
    'virkninger',
    [
      'kommandoer/utkastlag.ts:lageneIUtkastet',
      'frosset/frysing.ts:beslutningsgrunnlag',
      'spor/forhold/kommando.ts:lagIForholdet',
    ],
  ],
  // GR-U7 og MM-U9: sammenfallet og begrensningen etter § 34.1.3 (VS-U5), lest når brevet fryses.
  // VS-U77 punkt 9 og 12, OV-U115 punkt 25: et svar som ikke sier noe om varselet der
  // innsigelsen står, gir ikke sammenfall (#2316).
  ['frosset/standpunkt.ts', 'frosset', 'sammenfallet', ['frosset/frysing.ts:beslutningsgrunnlag']],
  ['spor/vederlag/frysing.ts', 'frosset', 'begrensningen', ['spor/vederlag/tekst.ts']],
  // #1783: det som er sporets eget i frysingen av svaret.
  [
    'Svarsfrysing',
    'frosset',
    'virkninger utfall godkjennerHeleKravet tausOmVarselet vilkaar hvertITideGirOppInnsigelsen ogsaaInnsigelserEtter',
    ['frosset/standpunkt.ts'],
  ],
  // VS-U77 punkt 9 og 12: varslene i kravet svaret ikke sier noe om (#2316).
  ['VarselIKravet', 'relasjon', 'gjelder hjemmel', ['frosset/standpunkt.ts']],
  ['spor/forhold/frysing.ts', 'frosset', 'FRYSING_I_FORHOLDET', ['frosset/standpunkt.ts']],
  ['spor/vederlag/frysing.ts', 'frosset', 'FRYSING_I_VEDERLAGET', ['frosset/standpunkt.ts']],
  ['spor/frist/frysing.ts', 'frosset', 'FRYSING_I_FRISTEN', ['frosset/standpunkt.ts']],
  // #1783: lesereglene i 4.2 som er sporets egne.
  [
    'Sporskontroller',
    'predikat',
    'kravet kravene svaret kanFaaPassivitet leserDatoen svaretKanGodtas saken',
    ['utledning/utled.ts'],
  ],
  // Skrivingen i sporet (#1783).
  [
    'Sporsskriving',
    'kommando',
    'kravinnhold handlingen postvarsler kontekstsperre saksperre',
    ['kommandoer/skriving.ts'],
  ],
  // VS-U51, VS-U53: skrivingen gir sporet stegene for en handling med flere rader.
  [
    'Skrivesteg',
    'kommando',
    'formen skriv proevd saken sakenFoer',
    ['spor/vederlag/kommando.ts', 'spor/frist/kommando.ts'],
  ],
  // VS-U55 (#1993): dokumentet fra kravskjemaet prøves mot varslene i saken før det skrives.
  ['LestSak', 'kommando', 'lest u', ['spor/vederlag/kommando.ts:varseldokumentene']],
  // VS-U73, #2100: vedleggene ved kravet prøves mot varslene for en kravpost på innholdet.
  ['Sakssperre', 'kommando', 'oppslag', ['spor/vederlag/kommando.ts:vedleggetErEtVarsel']],
  // VS-U34, C1 i #2056: fristkravet skriver varselet først når saken ikke har det.
  ['LestSak', 'kommando', 'u', ['spor/frist/kommando.ts:medVarselet']],
  // #2082, OV-U80, OV-U84: brevet med varselet i fristkravet prøves mot korrespondansen i saken.
  // #2076: `skriv` leser saken gjennom `Skrivesteg.saken`, så hver journal utledes én gang.
  ['LestSak', 'kommando', 'lest u', ['kommandoer/skriving.ts:skriv']],
  // #2100: brevet med varselet prøves mot saken før handlingen, med vedleggene i handlingen.
  [
    'Sakssperre',
    'kommando',
    'foer vedKravet oppslag',
    ['spor/frist/kommando.ts:varseldokumentetISaken'],
  ],
  ['LestSak', 'kommando', 'lest u', ['spor/frist/kommando.ts:varseldokumentetISaken']],
  ['Dokument', 'relasjon', 'retter', ['spor/frist/kommando.ts:varseldokumentetISaken']],
  ['Dokument', 'utsagn', 'dokumentasjon', ['kommandoer/vedlegg.ts:innholdetIDokumentet']],
  // #2100: samme fil lastet opp på nytt er samme brev, så vedleggene sammenliknes på innholdet.
  [
    'Vedlegg',
    'relasjon',
    'innhold_sha256',
    ['kommandoer/vedlegg.ts:innholdetIVedleggene', 'kommandoer/vedlegg.ts:innholdetIDokumentet'],
  ],
  // VS-U74, #2133: samme brev som et krav som gjelder som varselet, er ikke et varsel etter samme
  // bestemmelse.
  ['kommandoer/vedlegg.ts', 'relasjon', 'kravetErVarselet', ['kommandoer/skriving.ts:skriv']],
  ['kommandoer/vedlegg.ts:kravetErVarselet', 'kommando', 'lest u'],
  ['Krav', 'relasjon', 'dokument', ['kommandoer/vedlegg.ts:kravetErVarselet']],
  ['Dokument', 'relasjon', 'retter', ['kommandoer/vedlegg.ts:kravetErVarselet']],
  [
    'kommandoer/vedlegg.ts',
    'relasjon',
    'sammeDokument',
    ['spor/frist/kommando.ts:varseldokumentetISaken'],
  ],
  [
    'kommandoer/vedlegg.ts',
    'relasjon',
    'innholdetIVedleggene innholdetIDokumentet',
    [
      'spor/frist/kommando.ts:varseldokumentetISaken',
      'spor/vederlag/kommando.ts:vedleggetErEtVarsel',
    ],
  ],
  [
    'frosset/brevdeler.ts',
    'brevtekst',
    'omtalen',
    ['spor/frist/kommando.ts:som', 'spor/vederlag/kommando.ts:vedleggVedEtVarsel'],
  ],
  ['spor/vederlag/kommando.ts', 'kommando', 'SKRIVING_I_VEDERLAGET', ['kommandoer/skriving.ts']],
  // VS-U77 punkt 9 og 12: innsigelsene fra svarene før, når svaret fryses (#2316).
  [
    'spor/vederlag/kommando.ts',
    'relasjon',
    'standpunkteneTilVarslene',
    ['kommandoer/skriving.ts:frosneSvar', 'kommandoer/skriving.ts:frysBrev'],
  ],
  ['spor/forhold/kommando.ts', 'kommando', 'SKRIVING_I_FORHOLDET', ['kommandoer/skriving.ts']],
  // Lagene i et svarutkast i sporet (#1778).
  ['spor/vederlag/kommando.ts', 'predikat', 'lagIVederlaget', ['kommandoer/lag.ts']],
  ['spor/forhold/kommando.ts', 'predikat', 'lagIForholdet', ['kommandoer/lag.ts']],
  ['spor/forhold/kommando.ts:lagIForholdet(feil)', 'regelsett', 'resultat grunnlag_varslet_i_tide'],
  ['spor/frist/kommando.ts', 'predikat', 'lagIFristen', ['kommandoer/lag.ts']],
  // #1925: et ubesvart spørsmål i svarutkastet regnes som besvart uten innsigelse (S1-A).
  [
    'spor/frist/kommando.ts:utfylt',
    'kommando',
    'v ubesvart paakrevde',
    ['spor/frist/kommando.ts:lagIFristen'],
  ],
  [
    'spor/frist/kommando.ts',
    'relasjon',
    'SPOERSMAALET.*',
    ['spor/frist/kommando.ts:fristspoersmaalForPunkt'],
  ],
  ['spor/frist/kommando.ts:utfylt(r)', 'kommando', 'dager_maatte_forstaa'],
  // Spørsmålene regelsettet krever svar på i fristen, også i lagene i et svarutkast (#1925, #2025).
  ['regler/frist.ts', 'regelsett', 'paakrevdeSpoersmaal', ['spor/frist/kommando.ts:utfylt']],
  [
    'spor/frist/frysing.ts',
    'predikat',
    'fristkravet',
    ['spor/frist/kommando.ts:utfylt', 'spor/frist/kommando.ts:ugyldigIFristen'],
  ],
  // #2156 punkt 1: svarene i et svarutkast kontrollene avviser når svaret sendes, lest av de
  // samme kontrollene, med feltene i feilene.
  [
    'regler/frist.ts',
    'regelsett',
    'kontroller',
    ['spor/frist/kommando.ts:ugyldigIFristen', 'spor/frist/frysing.ts:regnUtFrist'],
  ],
  [
    'spor/frist/frysing.ts',
    'regelsett',
    'vurderingenAvFristen dagerMaatteForstaa',
    ['spor/frist/kommando.ts:ugyldigIFristen'],
  ],
  [
    'regler/vederlag.ts',
    'regelsett',
    'kontroller',
    ['spor/vederlag/kommando.ts:ugyldigIVederlaget'],
  ],
  [
    'spor/frist/kommando.ts:ugyldigIFristen(feil)',
    'regelsett',
    'godkjent_dager spesifisert_krav_ok',
  ],
  [
    'kommandoer/utkastlag.ts',
    'regelsett',
    'avvisteFelt',
    [
      'spor/frist/kommando.ts:ugyldigIFristen',
      'spor/vederlag/kommando.ts:ugyldigIVederlaget',
      'spor/vederlag/kommando.ts:feilIOppgjoersformen',
      'spor/vederlag/kommando.ts:oppgivelseUtenInnsigelse',
      'spor/forhold/kommando.ts:lagIForholdet',
    ],
  ],
  // #2171: svarene på kravposten kontrollen av oppgjørsformen avviser, tas ut før lagene regnes.
  ['spor/vederlag/kommando.ts:utenAvvisteSvar(iOppgjoersformen.get(post.id))', 'regelsett', '*'],
  [
    'kommandoer/utkastlag.ts',
    'kommando',
    'utenom',
    ['spor/frist/kommando.ts:lagIFristen', 'spor/vederlag/kommando.ts:lagIVederlaget'],
  ],
  ['SpoersmaalIUtkastet', 'kommando', 'spoersmaal gjelder', ['kommandoer/utkastlag.ts']],
  // OV-U32, OV-U33: lagene i utkastet regnet som brevet regner dem, felles for sporene.
  [
    'kommandoer/utkastlag.ts',
    'predikat',
    'lageneIUtkastet',
    ['spor/vederlag/kommando.ts', 'spor/frist/kommando.ts'],
  ],
  [
    'kommandoer/utkastlag.ts:lageneIUtkastet',
    'predikat',
    'grunner virket virkning lag etikett',
    ['spor/vederlag/kommando.ts', 'spor/frist/kommando.ts'],
  ],
  // Nyttelastkontrollen i sporet (#1783).
  [
    'Sporsnyttelast',
    'predikat',
    'begrunnelse svarsperre kravsperre innsigelse utdypning oppgittDatoIKravet',
    ['kommandoer/nyttelast.ts'],
  ],
  ['spor/vederlag/kommando.ts', 'predikat', 'NYTTELAST_I_VEDERLAGET', ['kommandoer/nyttelast.ts']],
  [
    'spor/forhold/kommando.ts',
    'predikat',
    'NYTTELAST_I_FORHOLDET kontrollerKorrigering varseletEtter322',
    ['kommandoer/nyttelast.ts'],
  ],
  // Formen på kravet i sporet (#1783).
  ['Kravform', 'kommando', 'feil vedleggIInnholdet varselVedKravet', ['kommandoer/kommando.ts']],
  ['spor/vederlag/kommando.ts', 'kommando', 'KRAVFORM_I_VEDERLAGET', ['kommandoer/kommando.ts']],
  ['spor/forhold/kommando.ts', 'kommando', 'KRAVFORM_I_FORHOLDET', ['kommandoer/kommando.ts']],
  [
    'Sporsforutsetninger',
    'predikat',
    'innsigelsenErIkkeBygget svaret kravet trekket aksepten foresporsel',
    ['kommandoer/forutsetninger.ts'],
  ],
  // VS-U19, VS-U27, VS-U30, VS-U31: forespørselen etter § 33.6.2 i sporet som har den (#1783).
  ['Foresporselsforutsetninger', 'predikat', 'sende svare', ['kommandoer/forutsetninger.ts']],
  [
    'spor/vederlag/kommando.ts',
    'predikat',
    'FORUTSETNINGER_I_VEDERLAGET',
    ['kommandoer/forutsetninger.ts'],
  ],
  [
    'spor/forhold/kommando.ts',
    'predikat',
    'FORUTSETNINGER_I_FORHOLDET korrigering',
    ['kommandoer/forutsetninger.ts'],
  ],
  [
    'spor/frist/kommando.ts',
    'predikat',
    'FORUTSETNINGER_I_FRISTEN',
    ['kommandoer/forutsetninger.ts'],
  ],
  ['spor/frist/kommando.ts', 'predikat', 'NYTTELAST_I_FRISTEN', ['kommandoer/nyttelast.ts']],
  ['spor/frist/kommando.ts', 'kommando', 'KRAVFORM_I_FRISTEN', ['kommandoer/kommando.ts']],
  ['spor/frist/kommando.ts', 'kommando', 'SKRIVING_I_FRISTEN', ['kommandoer/skriving.ts']],
  ['spor/vederlag/utledning.ts', 'predikat', 'KONTROLLER_I_VEDERLAGET', ['utledning/utled.ts']],
  ['spor/forhold/utledning.ts', 'predikat', 'KONTROLLER_I_FORHOLDET', ['utledning/utled.ts']],
  ['spor/frist/utledning.ts', 'predikat', 'KONTROLLER_I_FRISTEN', ['utledning/utled.ts']],
  // § 33.6.2 (VS-U19, VS-U31, HF-U1): utsagnene i saken lesereglene for forespørselen leser,
  // gjennom `Sporskontroller.saken` (#1783).
  [
    'Saksutsagn',
    'relasjon',
    'dokumenter foresporsler henvisninger elementer kravMedUten besvart',
    ['spor/frist/utledning.ts'],
  ],
  // Det utledningen leser av forholdet (#1783), som var i utled.ts før flyttingen.
  [
    'spor/forhold/utledning.ts',
    'predikat',
    'kontrollerEndringsordrene kontrollerKorrigeringene opplysningerOmDatoen forholdssvaretsVirkning',
    ['utledning/utled.ts'],
  ],
  // GR-U9: en aksept av et frafall, også i et svar som ikke er gjeldende (#2022 punkt 3).
  ['spor/forhold/utledning.ts', 'predikat', 'frafaller', ['utledning/utled.ts:utsagnetStrider']],
  [
    'spor/forhold/format.ts',
    'utsagn',
    'kategori',
    [
      'spor/frist/format.ts:hindringenEtter',
      'spor/forhold/frysing.ts',
      'frosset/byggeklosser.ts',
      'spor/vederlag/frysing.ts',
      'spor/vederlag/kommando.ts:lagIVederlaget',
      'spor/forhold/kommando.ts:korrigering',
      'spor/forhold/kommando.ts:kontrollerKorrigering',
      'spor/forhold/kommando.ts:lagIForholdet',
      'kommandoer/nyttelast.ts:grunnlagsdatoen',
    ],
  ],
  [
    'spor/forhold/format.ts',
    'utsagn',
    'innholdIForholdet',
    [
      'frosset/brevtekst.ts',
      'spor/forhold/tekst.ts',
      'spor/forhold/utledning.ts:opplysningerOmDatoen',
      'spor/forhold/kommando.ts:kategorisperre',
    ],
  ],
  [
    'spor/vederlag/format.ts',
    'utsagn',
    'innholdIVederlaget',
    ['spor/vederlag/utledning.ts', 'spor/vederlag/tekst.ts'],
  ],
  [
    'spor/frist/format.ts',
    'utsagn',
    'innholdIFristen',
    [
      'spor/frist/tekst.ts',
      'spor/frist/frysing.ts',
      'spor/frist/utledning.ts',
      'spor/frist/kommando.ts:lagIFristen',
      'spor/frist/kommando.ts:ugyldigIFristen',
    ],
  ],
  // U-1, KA-U79: fristen slik kontrakten betegner den, i brevet og i meldingene.
  [
    'spor/frist/format.ts',
    'brevtekst',
    'betegnelsen',
    ['spor/frist/tekst.ts', 'spor/frist/utledning.ts'],
  ],
  // Hjemmelen for hindringen, i brevet og skjemaene (KA-U81, #1925).
  ['spor/frist/format.ts', 'brevtekst', 'hindringenEtter', ['spor/frist/tekst.ts']],
  [
    'spor/frist/format.ts',
    'predikat',
    'erInnsigelseIFristen',
    ['spor/frist/tekst.ts', 'spor/frist/kommando.ts'],
  ],
  // #2242: innsigelsen i vederlagssvaret, i brevet og visningen.
  ['spor/vederlag/format.ts', 'predikat', 'erInnsigelseIVederlaget', ['spor/vederlag/tekst.ts']],
  ['VARSELSPOR', 'relasjon', '32.2 33.4 34.1.2 34.1.3 34.3.3 34.4'],
  ['format/skjema.ts', 'skjema', 'erObjekt feilI tekst erKalenderdato ukjenteFelt'],
  // #373: det basen ikke kan lagre, avvises før kommandoen vurderes.
  [
    'format/skjema.ts',
    'skjema',
    'tekstSomIkkeKanLagres',
    ['kommandoer/skriving.ts:formen', 'kommandoer/opprettelse.ts:opprettelse'],
  ],
  // #801: et tegn PDF-en av brevet ikke kan vise, avvises før brevet skrives.
  [
    'format/skjema.ts',
    'skjema',
    'kommandoenHarTegnSomIkkeKanVises',
    ['kommandoer/skriving.ts:skriv', 'kommandoer/opprettelse.ts:opprettelse'],
  ],
  ['format/skjema.ts', 'skjema', 'tegnSomIkkeKanVises', ['kommandoer/skriving.ts:skriv']],
  ['format/tegnsett.ts', 'skjema', 'SETTBARE_TEGN', ['format/skjema.ts:kanSettes']],
  ['Avsnitt', 'brevtekst', 'laast', ['kommandoer/skriving.ts:skriv']],
  // Opprettelsen av saken (#664): kommandoen og raden `sak_opprettet` den gir.
  ['Opprettelse', 'kommando', 'sakstittel', ['kommandoer/opprettelse.ts:opprettelse']],
  ['format/skjema.ts', 'skjema', 'objekt TEKST', ['kommandoer/opprettelse.ts']],
  ['format/format.ts', 'rad', 'FORMAT SAK_OPPRETTET', ['kommandoer/opprettelse.ts:opprettelse']],
  ['format/skjema.ts.TYPER', 'skjema', '*'],
  [
    'format/skjema.ts:feilI(s)',
    'skjema',
    `$ref anyOf type const enum minLength pattern minItems minimum exclusiveMinimum items properties
     required additionalProperties`,
  ],
  ['format/skjema.ts:feilI(s).properties', 'skjema', '*'],
  ['format/skjema.ts:oppslag(d)', 'skjema', '*'],
  [
    'Kontekst',
    'kontekst',
    'sakId aktoerId part teamId tidspunkt nyId sakskode kontraktsforkortelse kontraktsfrister',
  ],
  // GFK-U23, KA-U79: fristtabellen for prosjektet, som serveren leser i skrivetransaksjonen.
  ['Registrertfrist', 'kontekst', 'fristId nummer navn', ['spor/frist/kommando.ts']],
  // LV-U27, LV-U44: sakens kode i tittelen.
  ['Sakskode', 'kontekst', 'kode loepenummer', ['frosset/brevtittel.ts', 'frosset/tekst.ts']],
  // LV-U44, S3 i #1497: brevteksten omtaler saken og tidligere brev med koden.
  [
    'frosset/tekst.ts',
    'brevtekst',
    'sakensKode',
    ['frosset/brevtekst.ts', 'frosset/brevtittel.ts', 'spor/forhold/tekst.ts'],
  ],
  // LV-U53, LV-U24: merkingen fryses i brevet når det skrives, og leseren prøver den (#1570).
  [
    'frosset/brevtittel.ts',
    'brevtekst',
    'brevmerking avvikIMerkingen',
    ['kommandoer/skriving.ts:skriv', 'format/leser.ts:lesDokument'],
  ],
  // LV-U53: henvisningen til et tidligere brev bruker merkingen som er frosset på det.
  ['Dokument', 'brevtekst', 'merking', ['frosset/brevtekst.ts', 'frosset/brevdeler.ts']],
  // LV-U42, D1 A i #1497: typen registrert korrespondanse, i skjemaene.
  [
    'typer.ts',
    'skjema',
    'KORRESPONDANSETYPER',
    ['format/format.ts', 'kommandoer/kommando.ts', 'spor/vederlag/format.ts'],
  ],
  // OV-U79: sendemåten for et brev, i skjemaene.
  [
    'typer.ts',
    'skjema',
    'SENDEMAATER',
    ['format/format.ts', 'kommandoer/kommando.ts', 'spor/vederlag/format.ts'],
  ],
  ['Kjerne', 'kontekst', 'regler format leserformat'],
];
