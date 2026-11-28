/**
 * Radene i `LESBART` for området: regelsettet (`regler/`).
 * Klassene og formen står i `klasse.ts`, og testen i `../arkitektur.test.ts`.
 */

import type { Lesbar } from './klasse.ts';

export const REGELSETTET: Lesbar[] = [
  // Regelsettet (regler/).
  [
    'Regelsett',
    'regelsett',
    'versjon gjelderVarslingsplikten gjelderVarslingspliktenForVederlag gyldigeForholdsresultater',
  ],
  ['regler/regelsett.ts', 'regelsett', 'GJELDENDE_REGLER'],
  ['regler/beloep.ts', 'regelsett', 'beloep heleOere tilTall NULL_OERE'],
  ['regler/feil.ts', 'regelsett', 'UgyldigVurdering'],
  // #550: et beløp som ikke er et tall, avvises som en ugyldig vurdering.
  [
    'regler/beloep.ts',
    'regelsett',
    'UgyldigBeloep',
    ['kommandoer/nyttelast.ts', 'spor/vederlag/format.ts', 'regler/vederlag.ts'],
  ],
  // OV-U58: brøkdeler av øre avvises og rundes ikke av.
  [
    'regler/beloep.ts',
    'regelsett',
    'BroekdelAvOere',
    ['regler/vederlag.ts', 'spor/vederlag/kommando.ts'],
  ],
  [
    'regler/forhold.ts',
    'regelsett',
    'erEndringMedVarslingsplikt foersteUnderkategori gyldigeResultater',
  ],
  ['regler/frist.ts', 'regelsett', 'resultatAvDager'],
  [
    'regler/vederlag.ts',
    'regelsett',
    'beregnVederlag gjelderVarslingspliktenForVederlag erBeloepetGodkjentFullt varslerOgsaaEtter3412',
  ],
  ['regler/vederlag.ts', 'regelsett', 'beregnGodkjentBeloep', ['spor/vederlag/frysing.ts']],
  // Vurderingen av beløpet er en av verdiene i regelsettet.
  ['regler/typer.ts', 'regelsett', 'BELOEPSVURDERINGER', ['regler/vederlag.ts']],
  [
    'Fristkrav',
    'regelsett',
    `krevd_dager varsel_type er_svar_paa_foresporsel har_innsigelse_mot_varsel
     har_tidligere_varsel_i_tide har_begrunnelse_etter_b er_foerste_krav`,
  ],
  [
    'Fristvurdering',
    'utsagn',
    `frist_varsel_ok spesifisert_krav_ok foresporsel_svar_ok begrunnelse_ikke_svar
     vilkar_oppfylt godkjent_dager`,
  ],
  [
    'regler/frist.ts:beregnSynlighet',
    'regelsett',
    'frist_varsel_ok spesifisert_krav_ok foresporsel_svar_ok',
  ],
  // Svaret per post (#1663, 2a-1b): kravposten med `gjelder`, de særskilte med `saerskilt`.
  ['Vederlagssvar', 'regelsett', 'hovedkategori poster'],
  ['Vederlagssvar', 'utsagn', 'varslet_i_tide'],
  ['Postbeloep', 'regelsett', 'krevd'],
  ['Postbeloep', 'utsagn', 'vurdering godkjent_beloep'],
  ['Kravpostsvar', 'relasjon', 'gjelder'],
  ['Kravpostsvar', 'utsagn', 'aksepterer beregningsregel'],
  ['Kravpostsvar.beregningsregel', 'utsagn', 'varselForSent justering'],
  ['Produktivitetssvar', 'regelsett', 'saerskilt'],
  ['Produktivitetssvar', 'utsagn', 'varslet_i_tide begrenset_beloep'],
  ['RiggOgDriftsvar', 'utsagn', 'varslet_i_tide'],
  ['Postresultat', 'regelsett', 'post krevd lag'],
  // Arbeidsvalg 1 i spørsmålsfila 09.11 for #1663: lagene i sporet og beløpet i hvert.
  ['Postlag', 'regelsett', 'lag beloep'],
  ['regler/vederlag.ts:lagene', 'regelsett', 'foerste antall'],
  // #1774: lagene for en kravpost etter en beregningsregel, lest av utregningen, virkningene og
  // forutsetningene i skjemaet.
  ['Kravpostinnsigelser', 'utsagn', 'godtarRegelen varselForSent justering'],
  ['LagIKravposten', 'regelsett', 'regelen varselet justeringen beloepet'],
  [
    'regler/vederlag.ts',
    'regelsett',
    'lagIKravposten',
    [
      'spor/vederlag/frysing.ts:beregningsregelLag',
      'spor/vederlag/frysing.ts:virkningerISvaretPaaVarselet',
    ],
  ],
  ['Preklusjon', 'regelsett', 'hovedkrav produktivitet'],
  [
    'Vederlagsberegning',
    'regelsett',
    'beregnings_resultat total_godkjent_beloep subsidiaer_resultat subsidiaer_godkjent_beloep poster',
  ],
];
