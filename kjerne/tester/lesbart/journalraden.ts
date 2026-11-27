/**
 * Radene i `LESBART` for området: journalraden i format 1 (`format/leser.ts`, `kommandoer/skriving.ts`).
 * Klassene og formen står i `klasse.ts`, og testen i `../arkitektur.test.ts`.
 */

import type { Lesbar } from './klasse.ts';

export const JOURNALRADEN: Lesbar[] = [
  // Journalraden i format 1 (leser.ts, skriving.ts). `data` er uten type, så feltene har
  // funksjonen og parameteren som eier.
  [
    'Journalrad',
    'rad',
    'event_id event_type versjon tidsstempel aktor_rolle refererer_til_event_id format data',
    ['format/leser.ts', 'kommandoer/skriving.ts', 'spor/vederlag/kommando.ts:medVarslene'],
  ],
  ['Journalrad.data', 'rad', 'svar', ['kommandoer/skriving.ts']],
  ['format/leser.ts:element(verdi)', 'rad', 'art hva spor', ['format/leser.ts']],
  ['format/leser.ts:element(skjemaer)', 'rad', '*', ['format/leser.ts']],
  [
    'format/leser.ts:lesDokument',
    'rad',
    'krav svar utsagn opplysninger dokumentasjon beskrivelse spor retter ikke_i_saken avsender ikke_fylt_ut',
    ['format/leser.ts'],
  ],
  ['format/leser.ts:ikkeISaken(data)', 'rad', 'retter', ['format/leser.ts']],
  [
    'format/leser.ts:lesDokument(e)',
    'rad',
    'id art spor erstatter gjelder innhold hjemmel paalegg_mottatt klar_over_forholdet',
    ['format/leser.ts'],
  ],
  ['format/leser.ts:lesDokument(o)', 'rad', 'id hva dato gjelder oppfylt', ['format/leser.ts']],
  ['format/leser.ts:lesDokument(s)', 'rad', 'spor', ['format/leser.ts']],
  [
    'format/leser.ts:lesSvar(e)',
    'rad',
    'id spor gjelder erstatter paaberopelse utregning beslutningsgrunnlag',
    ['format/leser.ts'],
  ],
  [
    'format/leser.ts:standpunkterISvaret(e)',
    'rad',
    'id art gjelder hjemmel i_tide begrenset_beloep',
    ['format/leser.ts'],
  ],
  [
    'spor/frist/format.ts:standpunktIFristen(e)',
    'rad',
    'id art gjelder i_tide oppfylt maatte_forstaa',
    ['spor/frist/format.ts'],
  ],
  [
    'spor/forhold/format.ts:standpunktIForholdet(e)',
    'rad',
    'id art resultat',
    ['spor/forhold/format.ts'],
  ],
  [
    'spor/vederlag/format.ts:standpunktIVederlaget(e)',
    'rad',
    'id art gjelder hjemmel aksepterer oensket_oppgjoersform beloep saerskilt krever_tilbud godtar',
    ['spor/vederlag/format.ts'],
  ],
  // #1783: det som er sporets eget i lesingen av svaret.
  [
    'Svarlesing',
    'skjema',
    `gjentas rettidighet subsidiaertVerdi standpunkt kontrollerHjemlene kontrollerStandpunktene
     kontrollerUtregningen innsigelserMotPosten`,
    ['format/leser.ts'],
  ],
  ['spor/forhold/format.ts', 'rad', 'LESING_I_FORHOLDET', ['format/leser.ts']],
  ['spor/vederlag/format.ts', 'rad', 'LESING_I_VEDERLAGET', ['format/leser.ts']],
  ['spor/frist/format.ts', 'rad', 'LESING_I_FRISTEN', ['format/leser.ts']],
  // OV-U31, KA-U57 (e): radene i utregningen per post og lag, mot standpunktene og totalene.
  // Resultatet og dagene i standpunktet leses av utregningen (4.3 i designnotatet, #331 punkt 4).
  // Utregningen leses med typen for sporet (#1777).
  [
    'format/leser.ts:standpunkterISvaret(svar)',
    'rad',
    'standpunkter utregning',
    ['format/leser.ts'],
  ],
  ['spor/frist/format.ts', 'rad', 'utregningIFristen', ['spor/frist/frysing.ts:fristenGodkjent']],
  [
    'spor/vederlag/format.ts',
    'rad',
    'utregningIVederlaget',
    ['spor/vederlag/frysing.ts:godkjennerHeleKravet'],
  ],
  [
    'Vederlagsutregning',
    'rad',
    'resultat subsidiaert_resultat godkjent_beloep subsidiaert_godkjent_beloep poster',
    ['spor/vederlag/format.ts'],
  ],
  ['Fristutregning', 'rad', 'frister', ['spor/frist/format.ts']],
  [
    'Fristrad',
    'rad',
    'gjelder resultat godkjent_dager subsidiaert_resultat subsidiaert_godkjent_dager lag',
    ['spor/frist/format.ts'],
  ],
  // KA-U78, OV-U32: dagene for fristen i hvert lag.
  ['Fristlag', 'rad', 'dager', ['spor/frist/format.ts']],
  ['Utregningsrad', 'rad', 'gjelder lag', ['spor/vederlag/format.ts']],
  // HF-U29 punkt 8: den særskilte posten i beløpene per lag.
  ['Utregningsrad', 'rad', 'saerskilt', ['spor/vederlag/format.ts:beloepeneILagene']],
  ['Utregningslag', 'rad', 'beloep', ['spor/vederlag/format.ts']],
  // #1778: radene per post og lagene i dem, som vederlaget kontrollerer med beløpene.
  ['Postrad', 'rad', 'lag lag.lag', ['spor/poster/format.ts:kontrollerRadene']],
  ['Postnoekkel', 'rad', 'gjelder saerskilt', ['spor/poster/format.ts:kontrollerRadene']],
  // #2242: utregningen i fristen regner lagene og dagene i dem slik lesingen kontrollerer dem.
  ['spor/poster/format.ts', 'rad', 'lagIGrunnlaget', ['spor/frist/frysing.ts:regnUtFristen']],
  ['spor/frist/format.ts', 'rad', 'dagerILaget', ['spor/frist/frysing.ts:regnUtFristen']],
  // #2242: kommandoen og utregningen lager standpunktene i fristen av vurderingene likt.
  ['spor/frist/frysing.ts', 'rad', 'standpunkterIFristen', ['spor/frist/kommando.ts']],
  [
    'spor/poster/format.ts',
    'rad',
    'kontrollerRadene',
    [
      'spor/vederlag/format.ts:kontrollerUtregningenPerPost',
      'spor/frist/format.ts:kontrollerUtregningenIFristen',
    ],
  ],
  [
    'format/leser.ts:lesBeslutningsgrunnlag(v)',
    'rad',
    'regelversjon virkninger upaavirket uten_virkning linje sammenfall varslingsplikt',
    ['format/leser.ts'],
  ],
  ['format/leser.ts:lesBeslutningsgrunnlag(p)', 'rad', 'standpunkt lag', ['format/leser.ts']],
  ['format/leser.ts:datoFor', 'relasjon', 'id dokument', ['format/leser.ts']],
  // Det brevet fryser, som skrivingen og predikatet for et svarutkast deler (#351).
  ['frosset/frysing.ts', 'regelsett', 'frys', ['kommandoer/skriving.ts']],
  [
    'spor/forhold/frysing.ts',
    'regelsett',
    'forholdsstandpunkter',
    ['spor/forhold/kommando.ts', 'frosset/frysing.ts'],
  ],
  // Standpunktene i et svarutkast, som skrivingen lagrer og revisjonen sammenliknes med (HF-U5).
  ['kommandoer/standpunkter.ts', 'utsagn', 'standpunkter', ['kommandoer/skriving.ts']],
  // Standpunktene i vederlaget, som standpunktene i et svarutkast og lagene slår opp i (#1783).
  [
    'spor/vederlag/kommando.ts',
    'utsagn',
    'STANDPUNKTER_I_VEDERLAGET',
    ['kommandoer/standpunkter.ts'],
  ],
  // Standpunktene i forholdet (#1783).
  [
    'spor/forhold/kommando.ts',
    'utsagn',
    'STANDPUNKTER_I_FORHOLDET',
    ['kommandoer/standpunkter.ts'],
  ],
  // Standpunktene i fristen (#1783).
  ['spor/frist/kommando.ts', 'utsagn', 'STANDPUNKTER_I_FRISTEN', ['kommandoer/standpunkter.ts']],
  ['frosset/frysing.ts:frys(svar)', 'rad', 'spor utregning', ['frosset/frysing.ts']],
  [
    'kommandoer/skriving.ts:frysBrev(s)',
    'rad',
    'spor gjelder paaberopelse',
    ['kommandoer/skriving.ts'],
  ],
  ['kommandoer/skriving.ts:frysSvarene(s)', 'rad', 'spor', ['kommandoer/skriving.ts']],
  // #342, #2011: også påberopelsen svaret er regnet mot, som svaret lagrer.
  [
    'kommandoer/skriving.ts:frosneSvar(s)',
    'rad',
    'spor gjelder paaberopelse',
    ['kommandoer/skriving.ts'],
  ],
  ['kommandoer/skriving.ts:lagret(?)', 'frosset', 'resten', ['kommandoer/skriving.ts']],
  // Dokumentene i journalen (#787), som var i utled.ts (#1783).
  [
    'format/leser.ts',
    'rad',
    'dokumenterI',
    [
      'utledning/utled.ts',
      'spor/frist/utledning.ts',
      'spor/vederlag/utledning.ts:standpunkteneTilVarslene',
      'spor/vederlag/kommando.ts:besvarteVederlagskrav',
      'spor/frist/kommando.ts:hindrerSvaretPaaFristvarselet',
    ],
  ],
  [
    'format/leser.ts',
    'rad',
    'lesJournal',
    ['kommandoer/skriving.ts', 'utledning/utled.ts:utledJournal'],
  ],
  [
    'format/leser.ts',
    'rad',
    'standpunkterISvaret',
    [
      'frosset/frysing.ts',
      'kommandoer/skriving.ts',
      'spor/vederlag/kommando.ts',
      'spor/frist/kommando.ts',
      'spor/frist/frysing.ts:regnUtFrist',
      'spor/forhold/kommando.ts:lagIForholdet',
    ],
  ],
  [
    'format/skjema.ts',
    'rad',
    'Uforstaatt',
    [
      'format/leser.ts',
      'kommandoer/skriving.ts',
      'frosset/frysing.ts',
      'spor/vederlag/format.ts',
      'spor/frist/tekst.ts',
      'spor/frist/format.ts',
      'spor/frist/frysing.ts:lest',
    ],
  ],
  // Leseregler som deles: registrert korrespondanse, datoen for et varsel og bestridelsen
  // av samme slag (MM-U1, MM-U7).
  ['format/leser.ts', 'relasjon', 'erRegistrert datoFor'],
  // #2088 punkt 1: datoen parten oppga for dokumentet, lest ett sted.
  [
    'format/leser.ts',
    'relasjon',
    'datoForDokumentet',
    [
      'utledning/utled.ts:registreringer',
      'kommandoer/skriving.ts:frysBrev',
      // #2140 punkt 2: datoen i omtalen av brevet.
      'frosset/brevdeler.ts:omtalen',
    ],
  ],
  // Et svar som ikke er gitt, for spørsmålene regelen krever svar på (#2025).
  ['regler/typer.ts', 'predikat', 'mangler'],
  // OV-U98, OV-U104: dagene sammenliknes som kalenderdager, og samme dag meldes der de sammenliknes.
  ['format/leser.ts', 'relasjon', 'foerDagen'],
  // OV-U32, OV-U98, #2057: dagen et svar ble sendt, og om brevet er lagt til, for svaret på
  // forholdet svaret regnes med.
  ['Dokument', 'relasjon', 'id', ['utledning/utled.ts:dagene']],
  ['format/leser.ts', 'kontekst', 'dagenSendt', ['utledning/utled.ts:dagene']],
  // OV-U118: dagen et krav lagt til ble sendt, for kravversjonene det prøves mot.
  ['format/leser.ts', 'kontekst', 'dagenSendt', ['utledning/utled.ts:kravetStrider']],
  [
    'utledning/utled.ts:dagene',
    'relasjon',
    'dagen lagtTil',
    ['utledning/utled.ts:settForholdssvarene'],
  ],
  // U-8 i BF-48: dagen et svar lagt til ble sendt, for kunnskapsdatoen som gjaldt da.
  ['utledning/utled.ts:dagene', 'relasjon', 'dagen', ['utledning/utled.ts:utledSporene']],
  // #474: datoene i KA-U36 (opphevet av KA-U46) og VS-U26 sammenliknes som kalenderdager.
  [
    'format/leser.ts',
    'relasjon',
    'kalenderdag',
    [
      'kommandoer/nyttelast.ts',
      'spor/forhold/kommando.ts:varseletEtter322',
      'frosset/brevdeler.ts',
      'utledning/utled.ts:utledSporene.sendt',
      'utledning/utled.ts:registreringenStrider.dag',
    ],
  ],
];
