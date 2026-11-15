/**
 * OV-U98 (#2011): et svar og en aksept sendt utenfor løsningen og lagt til med datoen de ble
 * sendt. Svaret godtas når kravversjonen det gjelder, var gjeldende på sendedatoen, og aksepten
 * når svaret den godtar, var byggherrens gjeldende svar da. Hver kontroll har en kontrollsak som
 * bare skiller seg i datoen.
 *
 * Klokka går én dag per handling, så prefikset `krav_irreg` sender grunnlagskravet 21.09,
 * vederlagskravet 22.09 og fristkravet 23.09, og steg n i forløpet skrives 23.09 + n dager.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjoer, type Forloep, type Kontroll } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import type { Klokke } from './testmiljoe.ts';

/** Én dag per hendelse, fra 21.09 kl. 10 norsk tid. */
function dagklokke(): Klokke {
  let t = Date.parse('2026-09-20T08:00:00.000Z');
  return { naa: () => new Date(t), neste: () => new Date((t += 86_400_000)) };
}

async function prov(id: string, steg: Handling[], kontroller: Kontroll[]): Promise<void> {
  const forloep: Forloep = { id, rader: [], start: 'krav_irreg', steg, kontroller };
  await kjoer(forloep, minnebane(), {
    paastand: (holder, melding) => expect(holder, melding).toBe(true),
    valg: { klokke: dagklokke() },
  });
}

/** Byggherrens svar på grunnlagskravet, registrert med datoen det ble sendt. */
const registrertSvar = (gjelder: string, sendt: string): Handling => ({
  handling: 'rad',
  part: 'BH',
  spor: 'forhold',
  navn: 'S-r',
  dokument: 'D-r',
  gjelder,
  resultat: 'avslaatt',
  varslet_i_tide: true,
  sendt,
});

/** Totalentreprenørens aksept av svaret `gjelder`, registrert med datoen den ble sendt. */
const registrertAksept = (gjelder: string, sendt: string): Handling => ({
  handling: 'rad',
  part: 'TE',
  art: 'aksept',
  navn: 'A-r',
  gjelder,
  sendt,
});

const avslag = (navn: string): Handling => ({
  handling: 'brev',
  svar: [{ spor: 'forhold', resultat: 'avslaatt', varslet_i_tide: true, navn }],
});

const KILDE = ['OV-U98'];

describe('et svar som legges til, godtas når kravversjonen var gjeldende da det ble sendt (OV-U98)', () => {
  it('et svar sendt etter grunnlagskravet blir byggherrens gjeldende svar', () =>
    prov(
      'registrert-svar-paa-gjeldende-versjon',
      [registrertSvar('K-g1', '2026-09-22')],
      [
        {
          etter: 1,
          rolle: 'mal',
          kilde: KILDE,
          forventet: { forstaatt: true, uten_virkning: [], 'gjeldende_svar.forhold': 'S-r' },
        },
      ]
    ));

  it('kontrollsak: et svar oppgitt sendt før grunnlagskravet får ingen virkning', () =>
    prov(
      'registrert-svar-foer-kravet',
      [registrertSvar('K-g1', '2026-09-20')],
      [
        {
          etter: 1,
          rolle: 'kontroll',
          kilde: KILDE,
          forventet: { forstaatt: true, uten_virkning: ['S-r'], 'gjeldende_svar.forhold': null },
        },
      ]
    ));

  it('et svar på den forrige versjonen, sendt før den ble erstattet, står med virkning uten å svare på den nye', () =>
    prov(
      'registrert-svar-paa-erstattet-versjon',
      [
        { handling: 'krav', spor: 'forhold', underkategori: 'irregulaer_endring', navn: 'K-g2' },
        registrertSvar('K-g1', '2026-09-23'),
      ],
      [
        {
          etter: 2,
          rolle: 'mal',
          kilde: KILDE,
          forventet: {
            forstaatt: true,
            uten_virkning: [],
            'gjeldende_krav.forhold': 'K-g2',
            'gjeldende_svar.forhold': null,
          },
        },
      ]
    ));

  it('kontrollsak: et svar på den forrige versjonen, sendt etter at den ble erstattet, får ingen virkning', () =>
    prov(
      'registrert-svar-etter-ny-versjon',
      [
        { handling: 'krav', spor: 'forhold', underkategori: 'irregulaer_endring', navn: 'K-g2' },
        registrertSvar('K-g1', '2026-09-25'),
      ],
      [
        {
          etter: 2,
          rolle: 'kontroll',
          kilde: KILDE,
          forventet: { forstaatt: true, uten_virkning: ['S-r'] },
        },
      ]
    ));
});

describe('en aksept som legges til, godtas når svaret var byggherrens gjeldende svar da den ble sendt (OV-U98)', () => {
  it('en aksept av gjeldende svar gir enighet', () =>
    prov(
      'registrert-aksept-av-gjeldende-svar',
      [avslag('S-g1'), registrertAksept('S-g1', '2026-09-24')],
      [
        {
          etter: 2,
          rolle: 'mal',
          kilde: KILDE,
          forventet: { forstaatt: true, uten_virkning: [], 'enighet.forhold': 'finnes' },
        },
      ]
    ));

  it('kontrollsak: en aksept oppgitt sendt før svaret får ingen virkning', () =>
    prov(
      'registrert-aksept-foer-svaret',
      [avslag('S-g1'), registrertAksept('S-g1', '2026-09-23')],
      [
        {
          etter: 2,
          rolle: 'kontroll',
          kilde: KILDE,
          forventet: { forstaatt: true, uten_virkning: ['A-r#aksept'], 'enighet.forhold': null },
        },
      ]
    ));

  it('en aksept av et svar som senere er revidert, godtas når den ble sendt før revisjonen', () =>
    prov(
      'registrert-aksept-foer-revisjonen',
      [
        avslag('S-g1'),
        {
          handling: 'revisjon',
          spor: 'forhold',
          resultat: 'avslaatt',
          varslet_i_tide: false,
          navn: 'S-g2',
        },
        registrertAksept('S-g1', '2026-09-24'),
      ],
      [{ etter: 3, rolle: 'mal', kilde: KILDE, forventet: { forstaatt: true, uten_virkning: [] } }]
    ));

  it('kontrollsak: en aksept av svaret, sendt etter at det ble revidert, får ingen virkning', () =>
    prov(
      'registrert-aksept-etter-revisjonen',
      [
        avslag('S-g1'),
        {
          handling: 'revisjon',
          spor: 'forhold',
          resultat: 'avslaatt',
          varslet_i_tide: false,
          navn: 'S-g2',
        },
        registrertAksept('S-g1', '2026-09-26'),
      ],
      [
        {
          etter: 3,
          rolle: 'kontroll',
          kilde: KILDE,
          forventet: { forstaatt: true, uten_virkning: ['A-r#aksept'] },
        },
      ]
    ));
});
