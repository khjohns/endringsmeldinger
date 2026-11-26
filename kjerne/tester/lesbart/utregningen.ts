/**
 * Radene i `LESBART` for området: utregningen av svaret, standpunktene og det brevet fryser (`frosset/`).
 * Klassene og formen står i `klasse.ts`, og testen i `../arkitektur.test.ts`.
 */

import type { Lesbar } from './klasse.ts';

export const UTREGNINGEN: Lesbar[] = [
  // Utregningen av svaret (utregning.ts), standpunktene (standpunkt.ts) og det brevet fryser.
  ['frosset/utregning.ts', 'regelsett', `regnUtSvar avvikIResultatet utenforOmfanget`],
  ['frosset/byggeklosser.ts', 'frosset', 'prinsipalt'],
  // Lagene i forholdet og fristen, som begge slår opp i (#1783).
  [
    'frosset/byggeklosser.ts',
    'frosset',
    'virkningerIForholdetOgFristen',
    ['spor/frist/frysing.ts', 'spor/forhold/frysing.ts'],
  ],
  // GR-U11: varslingsplikten etter § 32.2 gjelder kategorien. KA-46: innsigelsen mot
  // varselet etter § 34.1.2 avvises der § 34.1.2 ikke gjelder kategorien.
  [
    'frosset/byggeklosser.ts',
    'regelsett',
    'gjelderVarslingsplikten hjemmelenGjelder',
    [
      'kommandoer/nyttelast.ts',
      'spor/forhold/kommando.ts:utdypningIForholdet',
      'spor/forhold/kommando.ts:begrunnelseIForholdet',
      'spor/forhold/kommando.ts:lagIForholdet',
      'spor/forhold/kommando.ts:varseletEtter322',
      'spor/vederlag/kommando.ts',
      'frosset/frysing.ts:beslutningsgrunnlag',
      'spor/vederlag/frysing.ts',
      // #1824: varselet etter § 34.1.2 står i vederlagskravet der det gjelder.
      'spor/vederlag/tekst.ts:vederlagstekst',
      // LV-U78: hjemmelen i overskriften for posten i brevet.
      'spor/vederlag/tekst.ts:svarpunkteneIVederlaget',
    ],
  ],
  // § 32.3 første ledd a for et brev sendt i appen, lest av beslutningsgrunnlaget (GR-U12, #351).
  [
    'spor/forhold/frysing.ts',
    'frosset',
    'blirEndringsordre',
    ['spor/forhold/utledning.ts', 'frosset/frysing.ts'],
  ],
  ['frosset/byggeklosser.ts', 'utsagn', 'standpunktet'],
  // Standpunktene til oppgjørsformen etter § 34.2.2, ett per kravpost (KA-U57 (d)).
  ['frosset/standpunkt.ts', 'predikat', 'enighetsgrunnlag'],
  // Vedtaket 05.10: hvorfor svaret i sporet er subsidiært til forholdet. Brevteksten sier
  // det samme (A2).
  [
    'spor/forhold/frysing.ts',
    'predikat',
    'grunnerFraForholdet',
    [
      'utledning/utled.ts:settSubsidiaer',
      'frosset/brevtekst.ts:forholdetsLag',
      // LV-U82: «Prinsipalt» på avslaget når et standpunkt i brevet står subsidiært til det.
      'frosset/brevtekst.ts:lagBrevtekst',
      'frosset/brevtekst.ts:innsigelseneIForesporselen',
      'kommandoer/utkastlag.ts:lageneIUtkastet',
    ],
  ],
  // OV-U32, OV-U33: lagene forholdet opptar foran sporet, som linjen etiketteres med.
  [
    'spor/forhold/frysing.ts',
    'predikat',
    'lagFraForholdet',
    ['kommandoer/skriving.ts:frysSvarene'],
  ],
  // GR-U7 med unntaket i MM-U13: utledningen regner `forholdAvklart` og `forholdAvvist` av den.
  [
    'spor/forhold/frysing.ts',
    'predikat',
    'forholdetErAvklart',
    ['spor/forhold/utledning.ts:forholdssvaretsVirkning'],
  ],
  // MM-U13, HF-U35 punkt 10: utledningen regner `preklusjonGodtatt` av den.
  [
    'spor/forhold/frysing.ts',
    'predikat',
    'preklusjonPaaberopt',
    ['spor/forhold/utledning.ts:forholdssvaretsVirkning'],
  ],
  // VS-U77 punkt 8–12: byggherrens siste standpunkt til varselet for en kravpost, likt i
  // kommandoen, skjemaet og brevteksten.
  [
    'frosset/standpunkt.ts',
    'relasjon',
    'sisteStandpunktTilVarslene',
    ['frosset/brevtekst.ts:innsigelsenFoer', 'spor/vederlag/utledning.ts:standpunkteneTilVarslene'],
  ],
  // MM-U43 punkt 8: sammenfallet stemmer med standpunktene i samme frosne brev.
  [
    'frosset/standpunkt.ts',
    'frosset',
    'sammenfallStemmer',
    ['utledning/utled.ts:kontrollerSvarene'],
  ],
  ['frosset/utregning.ts:regnUtSvar', 'utsagn', 'krav paaberopelse'],
  [
    'frosset/byggeklosser.ts',
    'regelsett',
    'avvisUkjenteFelt',
    ['spor/frist/frysing.ts', 'spor/forhold/frysing.ts', 'spor/vederlag/frysing.ts'],
  ],
  // #1783: det som er sporets eget i utregningen av svaret.
  ['Svarsutregning', 'regelsett', 'regnUt utenforOmfanget', ['frosset/utregning.ts']],
  ['Utregningsgrunnlag', 'utsagn', 'krav paaberopelse'],
  ['Utregningsgrunnlag', 'relasjon', 'foresporsel'],
  // VS-U80, VS-U81: innsigelsene fra svarene før.
  ['Utregningsgrunnlag', 'relasjon', 'staar'],
  [
    'spor/vederlag/frysing.ts',
    'regelsett',
    'UTREGNING_I_VEDERLAGET SAMMENLIKNES_I_VEDERLAGET',
    ['frosset/utregning.ts'],
  ],
  ['spor/forhold/frysing.ts', 'regelsett', 'UTREGNING_I_FORHOLDET', ['frosset/utregning.ts']],
  [
    'spor/frist/frysing.ts',
    'regelsett',
    'UTREGNING_I_FRISTEN SAMMENLIKNES_I_FRISTEN',
    ['frosset/utregning.ts'],
  ],
  ['frosset/utregning.ts:regnUtSvar', 'relasjon', 'foresporsel staar'],
  // OV-U115 punkt 19–22: kravpostene og beløpene i dem, som brevet og versjonsreglene leser,
  // og utledningen, som prøver postene i svaret mot dem (OV-U23).
  [
    'spor/vederlag/format.ts',
    'utsagn',
    'kravposterI',
    [
      // KA-U57 (c) og (d): linjen navngir kravposten når kravet har flere.
      'spor/vederlag/tekst.ts',
      'frosset/brevdeler.ts',
      // VS-U77 punkt 34: kravpostene som viser til varselet byggherren har svart på.
      'frosset/brevtekst.ts:rettidighetstekst',
      'spor/vederlag/utledning.ts',
      // KA-U54, KA-U64, KA-U68: TEs oppgjørsform for standpunktene til kravposten.
      'spor/vederlag/kommando.ts',
    ],
  ],
  // KA-U68, OV-U115 punkt 1 og 5: justerte enhetspriser og den andre beregningsregelen, for
  // utfyllingen av lagene i et svarutkast (#1925) og kontrollen av oppgjørsformen (#2025 punkt 2).
  ['Kravpost', 'utsagn', 'justert', ['spor/vederlag/format.ts:justerteEnhetspriser']],
  [
    'spor/vederlag/format.ts',
    'predikat',
    'justerteEnhetspriser denAndreRegelen',
    [
      'spor/vederlag/kommando.ts',
      'regler/vederlag.ts:kontrollerOppgjoersformen',
      'regler/vederlag.ts:ubesvartIKravposten',
      'regler/vederlag.ts:stiltIKravposten',
    ],
  ],
  // KA-U64, KA-U68: varselet og justeringen gjelder justerte enhetspriser (#2025 punkt 2).
  ['spor/vederlag/format.ts', 'predikat', 'justerteEnhetspriser', ['spor/vederlag/utledning.ts']],
  // #2025 punkt 6: vurderingen av beløpet for hver særskilt post i utkastet.
  ['VURDERINGEN_AV_SAERSKILT', 'kommando', 'produktivitet', ['spor/vederlag/kommando.ts:besvart']],
  // KA-U64: varselet en kravpost trenger, for standpunktet til varselet i svaret.
  [
    'spor/vederlag/format.ts',
    'predikat',
    'varselhjemmel',
    ['spor/vederlag/kommando.ts', 'spor/vederlag/utledning.ts', 'spor/vederlag/frysing.ts'],
  ],
  // KA-U57 (d), KA-U54: hjemmelen i standpunktet til oppgjørsformen etter TEs oppgjørsform.
  [
    'spor/vederlag/format.ts',
    'skjema',
    'OPPGJOERSHJEMMEL',
    ['spor/vederlag/kommando.ts', 'spor/vederlag/utledning.ts'],
  ],
  [
    'OPPGJOERSHJEMMEL',
    'skjema',
    'tilbud enhetspriser regningsarbeid',
    ['spor/vederlag/kommando.ts', 'spor/vederlag/utledning.ts'],
  ],
  ['OPPGJOERSFORM_I_HJEMMELEN', 'skjema', '34.2.2 34.3 34.4', ['spor/vederlag/format.ts']],
  // Kravposten standpunktene gjelder (KA-U57 (c) og (d)).
  ['spor/vederlag/frysing.ts:beregningsregelLag', 'relasjon', 'gjelder'],
  // KA-U59: til svaret per kravpost er bygget, avvises et svar på et krav med rigg og drift (#1663).
  [
    'spor/vederlag/format.ts',
    'regelsett',
    'krevdRigg',
    ['spor/vederlag/kommando.ts:hindrerSvarPaaKravet', 'spor/vederlag/tekst.ts'],
  ],
  [
    'spor/vederlag/format.ts',
    'regelsett',
    'krevdIKravposten',
    // KA-U72: en kravpost der tilbudet ikke er akseptert, regnes ikke med i beløpet.
    ['spor/vederlag/tekst.ts', 'spor/vederlag/frysing.ts'],
  ],
  // OV-U23, OV-U26: det samlede krevde beløpet og beløpet byggherren godkjenner for hver post.
  ['spor/vederlag/frysing.ts', 'regelsett', 'vederlagsposter', ['spor/vederlag/kommando.ts']],
  ['spor/vederlag/frysing.ts:vederlagsposter', 'regelsett', 'godkjent gjelder saerskilt svar'],
  // KA-U57 (c) og (d), KA-U59: svaret på hver kravpost i kommandoen, lest ett sted.
  ['spor/vederlag/frysing.ts', 'regelsett', 'kravpostvurderinger', ['spor/vederlag/kommando.ts']],
  ['spor/vederlag/frysing.ts:kravpostvurderinger', 'regelsett', 'post svar'],
  [
    'Kravpostvurdering',
    'utsagn',
    'gjelder vurdering godkjent_beloep aksepterer oensket_oppgjoersform krever_tilbud varslet_i_tide godtar_justering',
  ],
  // #1925: standpunktet og laget utfyllingen gir det, i lagene i et svarutkast på vederlaget.
  ['spor/vederlag/kommando.ts:lagIUtfyllingen', 'relasjon', 's lag'],
  // OV-U32, OV-U33: plassen hvert standpunkt har i det frosne brevet, som postlisten og
  // visningen leser.
  [
    'frosset/byggeklosser.ts:plassene',
    'frosset',
    'standpunkt',
    ['spor/vederlag/frysing.ts:postlisten'],
  ],
  ['frosset/byggeklosser.ts', 'frosset', 'plassene', ['spor/vederlag/frysing.ts:postlisten']],
  // Valg 4 i #1047: postene i det frosne brevet, med beløpet etter en virksom begrensning.
  // Utfallet summerer dem; visningen leser resten av postlisten.
  [
    'spor/vederlag/frysing.ts:postlisten',
    'frosset',
    'poster',
    ['spor/vederlag/frysing.ts:prinsipaltIVederlaget'],
  ],
  [
    'Vederlagspost',
    'utsagn',
    'godkjent begrensning saerskilt gjelder',
    ['spor/vederlag/frysing.ts:prinsipaltIVederlaget'],
  ],
  // OV-U73: en kravpost med beløpet i et senere lag regnes ikke med i det prinsipale.
  ['Plass', 'frosset', 'lag', ['spor/vederlag/frysing.ts:prinsipaltIVederlaget']],
  [
    'Vederlagspost.begrensning',
    'utsagn',
    'beloep',
    ['spor/vederlag/frysing.ts:prinsipaltIVederlaget'],
  ],
  // OV-U23, OV-U24: posten etter § 34.1.3 leses ett sted, av brevet og første kjente varsel.
  [
    'spor/vederlag/format.ts',
    'regelsett',
    'krevdProduktivitet harProduktivitetspost',
    [
      'utledning/utled.ts',
      'spor/vederlag/utledning.ts',
      'spor/vederlag/frysing.ts',
      'spor/vederlag/tekst.ts',
      // LV-U78: beløpet etter begrensningen står i punktet for den særskilte justeringen.
      'frosset/brevtekst.ts',
      // VS-U87 punkt 33: svaret på varselet etter § 34.1.3 sperres av en sendt kravversjon med posten.
      'spor/vederlag/kommando.ts:hindrerSvaretPaaVarselet',
    ],
  ],
  // #814: standpunktene og utregningen nyttelastkontrollen leste, er de brevet lagrer.
  ['Bygde', 'regelsett', 'standpunkter utregning', ['kommandoer/skriving.ts:svar']],
  // #342, #2011: påberopelsen nyttelastkontrollen regnet svaret mot, er den brevet lagrer.
  ['Bygde', 'relasjon', 'paaberopelse', ['kommandoer/skriving.ts:svar']],
  ['spor/forhold/format.ts:kategori', 'utsagn', 'hovedkategori underkategori'],
  // OV-U23, OV-U115 punkt 19: kravet har kravposter i vederlagsjusteringen.
  ['spor/vederlag/format.ts', 'regelsett', 'kravposterI', ['spor/vederlag/frysing.ts']],
  [
    'Svarvurdering',
    'utsagn',
    `resultat grunnlag_varslet_i_tide hovedkrav_varslet_i_tide kravposter
     frist_varsel_ok spesifisert_krav_ok foresporsel_svar_ok vilkar_oppfylt
     frister produktivitet_vurdering
     produktivitet_godkjent_beloep produktivitet_varslet_i_tide produktivitet_begrenset_beloep
     rigg_varslet_i_tide hold_tilbake`,
  ],
  // #1663, 2a-1b: kommandoens felt oversatt til postene i regelen, og feilene tilbake.
  ['spor/vederlag/frysing.ts:svaretFraVurderingene', 'regelsett', 'svar felt'],
  // #2025 punkt 3: spørsmålene regelen krever svar på i et svarutkast, lest av svaret regelen
  // kontrollerer, med feltene for posten etter § 34.1.3 annet ledd.
  [
    'spor/vederlag/frysing.ts',
    'regelsett',
    'svaretFraVurderingene PRODUKTIVITETSFELT',
    [
      'spor/vederlag/kommando.ts:spoersmaaleneIVederlaget',
      'spor/vederlag/kommando.ts:ugyldigIVederlaget',
      'spor/vederlag/kommando.ts:lagIVederlaget',
    ],
  ],
  // #2171: posten etter § 34.1.3 annet ledd når kravet ikke har den, i utkastet som i utregningen.
  [
    'spor/vederlag/frysing.ts',
    'regelsett',
    'kontrollerProduktivitetsposten',
    ['spor/vederlag/kommando.ts:ugyldigIVederlaget'],
  ],
  [
    'PRODUKTIVITETSFELT',
    'kommando',
    'vurdering godkjent_beloep varslet_i_tide begrenset_beloep',
    ['spor/vederlag/kommando.ts:spoersmaaleneIVederlaget'],
  ],
  [
    'regler/vederlag.ts',
    'regelsett',
    'stilteSpoersmaal stiltIKravposten ubesvartIKravposten',
    [
      'spor/vederlag/kommando.ts:spoersmaaleneIVederlaget',
      // #2140: utfyllingen og `besvart` for oppgjørsformen byggherren mener.
      'spor/vederlag/kommando.ts:lagIVederlaget.regelGodtatt',
      'spor/vederlag/kommando.ts:besvart',
    ],
  ],
  ['UbesvartIVederlaget', 'regelsett', 'post felt'],
  // #2279: spørsmålene regelen stiller i utkastet, besvart eller ikke.
  ['StiltIVederlaget', 'regelsett', 'besvart'],
  ['Utkastlag', 'kommando', 'stilt ubesvart', ['spor/vederlag/kommando.ts:lagIVederlaget']],
  [
    'regler/vederlag.ts:ubesvartIKravposten',
    'utsagn',
    'aksepterer oensket_oppgjoersform krever_tilbud godtar_justering',
  ],
  [
    'UgyldigVurdering',
    'regelsett',
    'feil',
    ['spor/vederlag/frysing.ts', 'kommandoer/utkastlag.ts:avvisteFelt'],
  ],
  // Kontrollene av vurderingene i svaret, med feltene fra `Svarvurdering` (#1695).
  ['regler/svarkontroll.ts', 'regelsett', 'kontrollerSpesifiseringen', ['spor/frist/frysing.ts']],
  // D-5, #2025: dagene byggherren måtte forstå, påkrevd i et svarutkast som ved sending.
  [
    'regler/svarkontroll.ts',
    'regelsett',
    'maatteForstaaUbesvart',
    ['spor/frist/kommando.ts:lagIFristen'],
  ],
  [
    'regler/svarkontroll.ts:maatteForstaaUbesvart',
    'utsagn',
    'spesifisert_krav_ok dager_maatte_forstaa',
  ],
  [
    'regler/svarkontroll.ts',
    'regelsett',
    'kontrollerForholdet',
    ['spor/forhold/frysing.ts', 'spor/forhold/kommando.ts:lagIForholdet'],
  ],
  [
    'regler/vederlag.ts',
    'regelsett',
    'kontrollerVarseletForVederlag kontrollerOppgjoersformen',
    [
      'spor/vederlag/frysing.ts',
      'spor/vederlag/kommando.ts:ugyldigIVederlaget',
      'spor/vederlag/kommando.ts:feilIOppgjoersformen',
    ],
  ],
  // VS-U63: «i tide» etter § 34.4 er oppgivelsen av en innsigelse som står.
  [
    'regler/vederlag.ts',
    'regelsett',
    'kontrollerOppgivelsenEtter344',
    [
      'spor/vederlag/kommando.ts:oppgivelseUtenInnsigelse',
      'spor/vederlag/kommando.ts:feilIOppgjoersformen',
    ],
  ],
  ['regler/vederlag.ts:kontrollerOppgivelsenEtter344', 'utsagn', 'varslet_i_tide oppgjoersform'],
  // VS-U80: et svar fra løsningen gjentar innsigelsen som står, eller gir den opp.
  [
    'regler/vederlag.ts',
    'regelsett',
    'kontrollerInnsigelsenSomStaar',
    [
      'spor/vederlag/kommando.ts:oppgivelseUtenInnsigelse',
      'spor/vederlag/kommando.ts:vurderingeneISvaretPaaVarselet',
    ],
  ],
  ['regler/vederlag.ts:kontrollerInnsigelsenSomStaar', 'utsagn', 'varslet_i_tide'],
  // OV-U98: svarene med standpunktet til varselet etter § 34.3.3 og § 34.4 leses i rekkefølgen
  // de ble sendt.
  ['frosset/standpunkt.ts:sisteStandpunktTilVarslene', 'relasjon', 's dag lagtTil paaVarselet'],
  ['spor/vederlag/utledning.ts:standpunkteneTilVarslene', 'relasjon', 'dag'],
  // VS-U79: varselet svaret på et varsel gjelder, og dagen kravene ble sendt.
  [
    'spor/vederlag/kommando.ts',
    'relasjon',
    'hindrerSvaretPaaVarselet',
    ['kommandoer/forutsetninger.ts:henvisning'],
  ],
  // VS-U79, VS-U77 punkt 30 og 31: standpunktene i svaret på et varsel som står alene.
  [
    'spor/vederlag/kommando.ts:standpunkterPaaVarselet(v)',
    'utsagn',
    'varslet_i_tide godtar_justering',
  ],
  [
    'spor/vederlag/kommando.ts',
    'relasjon',
    'standpunkterPaaVarselet',
    ['kommandoer/standpunkter.ts:standpunkter'],
  ],
  [
    'spor/vederlag/kommando.ts',
    'relasjon',
    'vurderingeneISvaretPaaVarselet',
    ['kommandoer/nyttelast.ts:kontrollerSvaretPaaVarselet'],
  ],
  [
    'regler/vederlag.ts',
    'regelsett',
    'kontrollerSvaretPaaVarselet',
    ['spor/vederlag/kommando.ts:vurderingeneISvaretPaaVarselet'],
  ],
  [
    'regler/vederlag.ts:kontrollerSvaretPaaVarselet(v)',
    'utsagn',
    'varslet_i_tide godtar_justering',
  ],
  [
    'spor/vederlag/format.ts',
    'predikat',
    'svaretGjelderEtVarsel',
    // VS-U79: tittelen på svaret på varselet.
    ['spor/vederlag/frysing.ts', 'spor/vederlag/tekst.ts', 'frosset/brevtittel.ts'],
  ],
  // VS-U77 punkt 8–12: byggherrens siste standpunkt til varselet for en kravpost.
  ['StandpunktTilVarselet', 'relasjon', 'gjelder hjemmel iTide dokument'],
  // OV-U104: brevene lagt til, som gjør rekkefølgen samme dag ukjent.
  [
    'Dokument',
    'relasjon',
    'id',
    [
      'spor/vederlag/utledning.ts:standpunkteneTilVarslene',
      'spor/vederlag/kommando.ts:hindrerSvaretPaaVarselet',
    ],
  ],
  ['regler/svarkontroll.ts:kontrollerForholdet', 'utsagn', 'resultat grunnlag_varslet_i_tide'],
  // D-7, #2035: når svaret på forholdet må ha en begrunnelse, og punktene den kan stå i.
  ['regler/forhold.ts:begrunnelseskravet', 'utsagn', 'resultat grunnlag_varslet_i_tide'],
  // Vedtaket 05.10 for #235, #2120: frafallet etter kategorien og påberopelsen av § 32.2.
  ['regler/forhold.ts:kanFrafalle', 'regelsett', 'varslingsplikt resultater'],
  ['regler/forhold.ts', 'regelsett', 'kanFrafalle', ['regler/svarkontroll.ts']],
  [
    'regler/forhold.ts',
    'regelsett',
    'begrunnelseskravet BEGRUNNELSESPUNKTENE',
    ['spor/forhold/kommando.ts'],
  ],
  ['regler/vederlag.ts:kontrollerVarseletForVederlag', 'utsagn', 'hovedkrav_varslet_i_tide'],
  [
    'regler/vederlag.ts:kontrollerOppgjoersformen',
    'utsagn',
    'aksepterer oensket_oppgjoersform krever_tilbud varslet_i_tide godtar_justering',
  ],
  ['regler/vederlag.ts:kontrollerOppgjoersformen', 'utsagn', 'oppgjoersform'],
  // #2171: spørsmålene om oppgjørsformen for kravposten, gitt svaret så langt.
  ['regler/vederlag.ts:stiltIKravposten', 'utsagn', 'aksepterer oppgjoersform'],
  [
    'regler/svarkontroll.ts:kontrollerSpesifiseringen',
    'utsagn',
    'spesifisert_krav_ok dager_maatte_forstaa dager',
  ],
  ['spor/vederlag/frysing.ts:utenforOmfanget(v)', 'utsagn', `hold_tilbake rigg_vurdering`],
  // KA-U74: byggherrens vurdering av dagene for hver frist, i kravets rekkefølge.
  ['spor/frist/frysing.ts:fristvurderinger(x)', 'utsagn', 'dager dager_maatte_forstaa'],
  ['Dagvurdering', 'relasjon', 'gjelder'],
  ['Dagvurdering', 'utsagn', 'dager dager_maatte_forstaa'],
  ['spor/frist/frysing.ts', 'regelsett', 'fristvurderinger', ['spor/frist/kommando.ts']],
];
