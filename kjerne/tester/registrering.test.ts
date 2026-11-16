/**
 * OV-U98 (#2011): et krav, et svar og en aksept sendt utenfor løsningen og lagt til med datoen
 * de ble sendt. Svaret godtas når kravversjonen det gjelder, var gjeldende på sendedatoen, og
 * aksepten når svaret den godtar, var byggherrens gjeldende svar da. Et krav sendt før det siste
 * står utenfor rekken (OV-U102). Hver kontroll har en kontrollsak som bare skiller seg i datoen.
 *
 * Klokka går én dag per handling, så prefikset `krav_irreg` sender grunnlagskravet 21.09,
 * vederlagskravet 22.09 og fristkravet 23.09, og steg n i forløpet skrives 23.09 + n dager.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjoer, type Forloep, type Kontroll } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import type { Klokke } from './testmiljoe.ts';
import { varseletFoerSvaret } from '../utledning/utled.ts';
import { elementenesSpor } from '../kommandoer/handlinger.ts';
import type { Utfall } from '../kommandoer/skriving.ts';
import { SOM_BREV } from './brevet.ts';

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

/**
 * Kjører forløpet og prøver handlingen `h` som en registrering sendt `sendt`. Et felt i `felt`
 * med verdien `undefined` tas bort.
 */
async function provRegistrering(
  steg: Handling[],
  h: Handling,
  sendt: string,
  felt: Record<string, unknown> = { ...SOM_BREV, dokumentasjon: [VEDLEGG] }
) {
  const forloep: Forloep = {
    id: 'registrering',
    rader: [],
    start: 'krav_irreg',
    steg,
    kontroller: [],
  };
  const k = await kjoer(forloep, minnebane(), { valg: { klokke: dagklokke() } });
  // ID-ene i hendelsene skrives med navnene i forløpet.
  const navngitt = (utfall: Utfall) => k.navn.navngi(utfall) as Utfall;
  return navngitt(
    await k.prov(h, (kommando) => {
      // Et registrert svar har ingen tekst fra løsningen (OV-U80).
      for (const s of [kommando.svar ?? []].flat() as Record<string, unknown>[])
        if (typeof s === 'object') {
          delete s.utdypning;
          delete s.utdypninger;
        }
      Object.assign(kommando, { sendt, ...felt });
      for (const [felt, verdi] of Object.entries(kommando))
        if (verdi === undefined) delete kommando[felt];
    })
  );
}

const VEDLEGG = '00000000-0000-4000-8000-000000002011';

describe('kommandoene for svar og aksept sendt utenfor løsningen (OV-U80, OV-U98)', () => {
  const aksept: Handling = { handling: 'aksept', spor: 'forhold', svar: 'S-g1' };

  it('en aksept sendt etter svaret godtas og lagres med datoen, typen og vedlegget, uten brevtekst', async () => {
    const utfall = await provRegistrering([avslag('S-g1')], aksept, '2026-09-24');
    expect(utfall.godtatt).toBe(true);
    if (!utfall.godtatt) return;
    const data = utfall.hendelser[0].data as Record<string, unknown>;
    expect(data.opplysninger).toEqual([
      { id: expect.any(String), hva: 'sendt', dato: '2026-09-24' },
    ]);
    expect(data.korrespondansetype).toBe('brev');
    expect(data.dokumentasjon).toEqual([expect.objectContaining({ vedlegg_id: VEDLEGG })]);
    expect(data.brevtekst).toBeUndefined();
  });

  it('kontrollsak: en aksept oppgitt sendt før svaret avvises', async () => {
    const utfall = await provRegistrering([avslag('S-g1')], aksept, '2026-09-23');
    expect(utfall).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'IKKE_GJELDENDE_PAA_SENDEDATOEN' },
    });
  });

  it('en aksept av et svar som senere er revidert, godtas når den ble sendt før revisjonen', async () => {
    const revisjon: Handling = {
      handling: 'revisjon',
      spor: 'forhold',
      resultat: 'avslaatt',
      varslet_i_tide: false,
      navn: 'S-g2',
    };
    const foer = await provRegistrering([avslag('S-g1'), revisjon], aksept, '2026-09-24');
    expect(foer.godtatt).toBe(true);
    const etter = await provRegistrering([avslag('S-g1'), revisjon], aksept, '2026-09-26');
    expect(etter).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'IKKE_GJELDENDE_PAA_SENDEDATOEN' },
    });
  });

  it('et svar sendt etter grunnlagskravet godtas, og et svar oppgitt sendt før det avvises', async () => {
    const svar = avslag('S-r');
    const godtatt = await provRegistrering([], svar, '2026-09-22');
    expect(godtatt.godtatt ? null : godtatt.avvisning).toBeNull();
    expect(await provRegistrering([], svar, '2026-09-20')).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'IKKE_GJELDENDE_PAA_SENDEDATOEN' },
    });
  });

  it('akseptfristen i et registrert svar regnes fra dagen svaret ble sendt, ikke dagen det legges til (HF-U23 punkt 1, OV-U98)', async () => {
    // Svaret på vederlagskravet (22.09) sendt 23.09 legges til 24.09, med fristen 23.09.
    const svar = (akseptfrist: string): Handling => ({
      handling: 'brev',
      svar: [
        { spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000, navn: 'S-r', akseptfrist },
      ],
    });
    const godtatt = await provRegistrering([], svar('2026-09-23'), '2026-09-23');
    expect(godtatt.godtatt ? null : godtatt.avvisning).toBeNull();
    expect(
      await provRegistrering([], svar('2026-09-22'), '2026-09-23'),
      'kontrollsak: en frist før svaret ble sendt'
    ).toMatchObject({ godtatt: false, avvisning: { regel: 'AKSEPTFRIST_UGYLDIG_DATO' } });
  });

  it('en aksept av et svar totalentreprenøren alt har godtatt, avvises også når svaret senere er revidert (GR-U8, MM-U43 punkt 9)', async () => {
    const svaret: Handling = {
      handling: 'brev',
      svar: [{ spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000, navn: 'S-v' }],
    };
    const revisjon: Handling = {
      handling: 'revisjon',
      spor: 'vederlag',
      vurdering: 'delvis',
      godkjent_belop: 50000,
      navn: 'S-v2',
    };
    const aksepten: Handling = { handling: 'aksept', spor: 'vederlag', svar: 'S-v' };
    // Svaret 24.09, aksepten fra løsningen 25.09, revisjonen 26.09; den nye aksepten er sendt 25.09.
    expect(
      await provRegistrering([svaret, aksepten, revisjon], aksepten, '2026-09-25')
    ).toMatchObject({ godtatt: false, avvisning: { regel: 'IKKE_GJELDENDE_PAA_SENDEDATOEN' } });
    const kontroll = await provRegistrering([svaret, revisjon], aksepten, '2026-09-24');
    expect(kontroll.godtatt ? null : kontroll.avvisning, 'kontrollsak: uten aksepten').toBeNull();
  });

  it('en registrering uten typen eller vedlegget avvises som feil form', async () => {
    const utenType = await provRegistrering([avslag('S-g1')], aksept, '2026-09-24', {
      dokumentasjon: [VEDLEGG],
    });
    expect(utenType).toMatchObject({ godtatt: false, avvisning: { regel: 'UGYLDIG_FORM' } });
    const utenVedlegg = await provRegistrering([avslag('S-g1')], aksept, '2026-09-24', {
      korrespondansetype: 'e_post',
    });
    expect(utenVedlegg).toMatchObject({ godtatt: false, avvisning: { regel: 'UGYLDIG_FORM' } });
  });
});

/** Totalentreprenørens grunnlagskrav, lagt til med datoen det ble sendt. */
const registrertGrunnlagskrav = (navn: string, sendt: string): Handling => ({
  handling: 'rad',
  krav: true,
  part: 'TE',
  spor: 'forhold',
  underkategori: 'irregulaer_endring',
  navn,
  sendt,
});

/** Byggherrens avslag fra løsningen, som påberoper at varselet etter § 32.2 kom for sent. */
const forSent = (navn: string): Handling => ({
  handling: 'brev',
  svar: [{ spor: 'forhold', resultat: 'avslaatt', varslet_i_tide: false, navn }],
});

const KILDE_ELDRE = ['OV-U98', 'OV-U102'];

describe('et krav sendt før totalentreprenørens siste krav står utenfor rekken, og datoen regnes med (OV-U102)', () => {
  it('kravet blir ikke gjeldende, og saken er forstått', () =>
    prov(
      'eldre-krav-utenfor-rekken',
      [registrertGrunnlagskrav('K-g0', '2026-09-19')],
      [
        {
          etter: 1,
          rolle: 'mal',
          kilde: KILDE_ELDRE,
          forventet: {
            forstaatt: true,
            uten_virkning: [],
            'gjeldende_krav.forhold': 'K-g1',
            'krav_utenfor_rekken.forhold': ['K-g0'],
          },
        },
      ]
    ));

  it('kontrollsak: et krav sendt etter det siste blir gjeldende krav', () =>
    prov(
      'nytt-krav-i-rekken',
      [registrertGrunnlagskrav('K-g0', '2026-09-24')],
      [
        {
          etter: 1,
          rolle: 'kontroll',
          kilde: ['OV-U80', 'OV-U98'],
          forventet: {
            forstaatt: true,
            'gjeldende_krav.forhold': 'K-g0',
            'krav_utenfor_rekken.forhold': [],
          },
        },
      ]
    ));

  it('et krav sendt samme dag som det siste blir gjeldende etter rekkefølgen (OV-U104)', () =>
    prov(
      'krav-samme-dag',
      [registrertGrunnlagskrav('K-g0', '2026-09-21')],
      [
        {
          etter: 1,
          rolle: 'mal',
          kilde: ['OV-U104'],
          forventet: {
            forstaatt: true,
            'gjeldende_krav.forhold': 'K-g0',
            'krav_utenfor_rekken.forhold': [],
            'visning.merknader': { inneholder: ['sendt_samme_dag'] },
          },
        },
      ]
    ));

  it('et svar sendt etterpå påberoper det eldre kravet som varselet etter § 32.2', () =>
    prov(
      'eldre-krav-er-varselet',
      [registrertGrunnlagskrav('K-g0', '2026-09-19'), forSent('S-g1')],
      [
        {
          etter: 2,
          rolle: 'mal',
          kilde: KILDE_ELDRE,
          forventet: { forstaatt: true, 'standpunkt.S-g1.rettidighet.gjelder': 'K-g0' },
        },
      ]
    ));

  it('kontrollsak: uten det eldre kravet påberoper svaret den første kravversjonen', () =>
    prov(
      'foerste-kravversjon-er-varselet',
      [forSent('S-g1')],
      [
        {
          etter: 1,
          rolle: 'kontroll',
          kilde: ['VS-U43'],
          forventet: { forstaatt: true, 'standpunkt.S-g1.rettidighet.gjelder': 'K-g1' },
        },
      ]
    ));

  it('en påberopelse i et svar lagt til før det eldre kravet, står med varselet den viste til', () =>
    prov(
      'paaberopelse-foer-eldre-krav',
      [forSent('S-g1'), registrertGrunnlagskrav('K-g0', '2026-09-19')],
      [
        {
          etter: 2,
          rolle: 'mal',
          kilde: ['OV-U102', 'MM-U50'],
          forventet: {
            forstaatt: true,
            'gjeldende_svar.forhold': 'S-g1',
            'standpunkt.S-g1.rettidighet.gjelder': 'K-g1',
          },
        },
      ]
    ));
});

describe('kommandoen for et krav sendt utenfor løsningen (OV-U80, OV-U98, OV-U102)', () => {
  const vederlagskrav: Handling = { handling: 'krav', spor: 'vederlag', belop: 90000 };
  const provKravet = (sendt: string) => provRegistrering([], vederlagskrav, sendt);

  it('et krav sendt etter det siste godtas og lagres med datoen, typen og vedlegget, uten brevtekst', async () => {
    const utfall = await provKravet('2026-09-23');
    expect(utfall.godtatt ? null : utfall.avvisning).toBeNull();
    if (!utfall.godtatt) return;
    const data = utfall.hendelser[0].data as Record<string, unknown>;
    expect(data.opplysninger).toEqual([
      { id: expect.any(String), hva: 'sendt', dato: '2026-09-23' },
    ]);
    expect(data.korrespondansetype).toBe('brev');
    expect(data.brevtekst).toBeUndefined();
  });

  it('et krav sendt før det siste godtas, utenfor rekken, og erstatter ikke det siste (OV-U102)', async () => {
    const utfall = await provKravet('2026-09-21');
    expect(utfall.godtatt ? null : utfall.avvisning).toBeNull();
    if (!utfall.godtatt) return;
    const [krav] = (utfall.hendelser[0].data as { krav: Record<string, unknown>[] }).krav;
    expect(krav.erstatter).toBeUndefined();
    const kontroll = await provKravet('2026-09-23');
    expect(
      kontroll.godtatt &&
        (kontroll.hendelser[0].data as { krav: Record<string, unknown>[] }).krav[0].erstatter,
      'kontrollsak: et krav sendt etter det siste erstatter det'
    ).toEqual(expect.any(String));
  });

  it('et krav lagt til med en utdypning, eller med typen uten datoen, avvises som feil form', async () => {
    const medUtdypning = await provRegistrering([], vederlagskrav, '2026-09-23', {
      ...SOM_BREV,
      dokumentasjon: [VEDLEGG],
      utdypning: 'Tekst fra løsningen.',
    });
    expect(medUtdypning).toMatchObject({ godtatt: false, avvisning: { regel: 'UGYLDIG_FORM' } });
    const utenDato = await provRegistrering([], vederlagskrav, '2026-09-23', {
      ...SOM_BREV,
      sendt: undefined,
    });
    expect(utenDato).toMatchObject({ godtatt: false, avvisning: { regel: 'UGYLDIG_FORM' } });
    expect(await provKravet('2026-02-30'), 'en dato som ikke finnes (OV-U98)').toMatchObject({
      godtatt: false,
      avvisning: { regel: 'UGYLDIG_FORM' },
    });
  });
});

describe('varselet en påberopelse etter § 33.4 gjelder, med et krav utenfor rekken (VS-U70, OV-U102)', () => {
  const eget = { id: 'V', dokument: 'D-v' };
  const krav = [
    { id: 'K1', dokument: 'D-1' },
    { id: 'K0', dokument: 'D-0' },
  ];
  const varselet = (datoer: Record<string, string>) =>
    varseletFoerSvaret(
      '33.4',
      [eget],
      krav,
      () => true,
      (x) => datoer[x.id] ?? null
    );

  it('det eldre kravet gjelder når det ble sendt før det egne varselet', () =>
    expect(varselet({ V: '2026-09-18', K1: '2026-09-20', K0: '2026-09-17' })).toBe('K0'));

  it('kontrollsak: med samme dato som det egne varselet gjelder det egne varselet', () =>
    expect(varselet({ V: '2026-09-18', K1: '2026-09-20', K0: '2026-09-18' })).toBe('V'));
});

describe('et svar sendt før byggherrens gjeldende svar på kravversjonen står utenfor rekken (OV-U103)', () => {
  const foerste = (sendt: string): Handling => registrertSvar('K-g1', sendt);
  const revisjon: Handling = {
    handling: 'revisjon',
    spor: 'forhold',
    resultat: 'avslaatt',
    varslet_i_tide: false,
    navn: 'S-g2',
  };

  it('et første svar sendt før det gjeldende står utenfor rekken, og det gjeldende svaret står', () =>
    prov(
      'svar-foer-gjeldende-svar',
      [avslag('S-g1'), foerste('2026-09-23')],
      [
        {
          etter: 2,
          rolle: 'mal',
          kilde: ['OV-U103', 'OV-U104'],
          forventet: {
            forstaatt: true,
            uten_virkning: [],
            'svar_utenfor_rekken.forhold': ['S-r'],
            'gjeldende_svar.forhold': 'S-g1',
            'visning.merknader': { mangler: ['sendt_samme_dag'] },
          },
        },
      ]
    ));

  it('kontrollsak: et første svar sendt etter det gjeldende gjør svarene tvetydige, og saken stopper', () =>
    prov(
      'svar-etter-gjeldende-svar',
      [avslag('S-g1'), foerste('2026-09-25')],
      [
        {
          etter: 2,
          rolle: 'kontroll',
          kilde: ['OV-U103'],
          forventet: { forstaatt: false },
        },
      ]
    ));

  it('kontrollsak: en revisjon sendt samme dag som svaret erstatter det (OV-U104)', () =>
    prov(
      'revisjon-samme-dag',
      [avslag('S-g1'), { ...foerste('2026-09-24'), erstatter: 'S-g1' }],
      [
        {
          etter: 2,
          rolle: 'kontroll',
          kilde: ['OV-U103', 'OV-U104'],
          forventet: {
            forstaatt: true,
            uten_virkning: [],
            'svar_utenfor_rekken.forhold': [],
            'gjeldende_svar.forhold': 'S-r',
          },
        },
        {
          etter: 2,
          rolle: 'mal',
          kilde: ['OV-U104'],
          forventet: { 'visning.merknader': { inneholder: ['sendt_samme_dag'] } },
        },
      ]
    ));

  it('kommandoen godtar et svar sendt før det gjeldende med svarskjemaet, og lagrer det uten erstatter', async () => {
    const utfall = await provRegistrering([avslag('S-g1')], avslag('S-r'), '2026-09-23');
    expect(utfall.godtatt ? null : utfall.avvisning).toBeNull();
    if (!utfall.godtatt) return;
    const [svar] = (utfall.hendelser[0].data as { svar: Record<string, unknown>[] }).svar;
    expect(svar.erstatter).toBeUndefined();
    expect(await provRegistrering([avslag('S-g1')], avslag('S-r'), '2026-09-24')).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'ALLEREDE_SVART' },
    });
  });

  it('kommandoen godtar et svar sendt før det gjeldende med revisjonsskjemaet, uten erstatter', async () => {
    const foer = await provRegistrering([avslag('S-g1')], revisjon, '2026-09-23');
    expect(foer.godtatt ? null : foer.avvisning).toBeNull();
    if (!foer.godtatt) return;
    const [svar] = (foer.hendelser[0].data as { svar: Record<string, unknown>[] }).svar;
    expect(svar.erstatter).toBeUndefined();
    const etter = await provRegistrering([avslag('S-g1')], revisjon, '2026-09-25');
    expect(etter.godtatt, 'kontrollsak: sendt etter svaret').toBe(true);
    if (!etter.godtatt) return;
    const [revidert] = (etter.hendelser[0].data as { svar: Record<string, unknown>[] }).svar;
    expect(revidert.erstatter, 'kontrollsak: sendt etter svaret').toEqual(expect.any(String));
  });

  it('en aksept av svaret utenfor rekken, sendt før det gjeldende svaret, gir enighet om det eldre svaret (OV-U103)', () =>
    prov(
      'aksept-av-svar-utenfor-rekken',
      [avslag('S-g1'), foerste('2026-09-23'), registrertAksept('S-r', '2026-09-23')],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['OV-U103', 'OV-U110'],
          forventet: {
            forstaatt: true,
            uten_virkning: [],
            'enighet.forhold': null,
            'enigheter_om_eldre_svar.forhold': ['S-r'],
            'gjeldende_svar.forhold': 'S-g1',
          },
        },
      ]
    ));

  it('en aksept av svaret utenfor rekken, sendt etter det gjeldende svaret, får ingen virkning (OV-U98)', () =>
    prov(
      'aksept-av-svar-utenfor-rekken-etter',
      [avslag('S-g1'), foerste('2026-09-23'), registrertAksept('S-r', '2026-09-25')],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['OV-U98', 'OV-U103'],
          forventet: {
            forstaatt: true,
            uten_virkning: ['A-r#aksept'],
            'enigheter_om_eldre_svar.forhold': [],
          },
        },
      ]
    ));

  it('en aksept av det gjeldende svaret gir enighet, også når et eldre svar står utenfor rekken', () =>
    prov(
      'aksept-av-gjeldende-svar',
      [avslag('S-g1'), foerste('2026-09-23'), registrertAksept('S-g1', '2026-09-25')],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['OV-U98', 'OV-U103'],
          forventet: {
            forstaatt: true,
            'enighet.forhold': 'finnes',
            'enigheter_om_eldre_svar.forhold': [],
          },
        },
      ]
    ));

  it('et element som viser til svaret utenfor rekken, får sporet til svaret, som en aksept (OV-U103)', async () => {
    const k = await kjoer(
      {
        id: 'sporet-til-svaret-utenfor-rekken',
        rader: [],
        start: 'krav_irreg',
        steg: [avslag('S-g1'), foerste('2026-09-23')],
        kontroller: [],
      },
      minnebane(),
      { valg: { klokke: dagklokke() } }
    );
    const sporet = elementenesSpor(await k.utledning());
    expect(sporet.get(k.navn.id('S-g1')), 'kontrollsak: det gjeldende svaret').toBe('forhold');
    expect(sporet.get(k.navn.id('S-r'))).toBe('forhold');
  });

  it('kommandoen godtar en aksept av svaret utenfor rekken, sendt før det gjeldende svaret (OV-U103)', async () => {
    const aksept: Handling = { handling: 'aksept', spor: 'forhold', svar: 'S-r' };
    const steg = [avslag('S-g1'), foerste('2026-09-23')];
    const foer = await provRegistrering(steg, aksept, '2026-09-23');
    expect(foer.godtatt ? null : foer.avvisning).toBeNull();
    expect(
      await provRegistrering(steg, aksept, '2026-09-25'),
      'kontrollsak: sendt etter det gjeldende svaret'
    ).toMatchObject({ godtatt: false, avvisning: { regel: 'IKKE_GJELDENDE_PAA_SENDEDATOEN' } });
  });
});

describe('et svar i rekken erstattes også av et svar utenfor rekken sendt etter det (OV-U98, OV-U103)', () => {
  // Svaret 24.09, et vederlagskrav 25.09 bare for å gi en dag mellom, revisjonen 26.09, og et svar
  // på samme kravversjon sendt 25.09, lagt til 27.09, som står utenfor rekken.
  const steg = (aksept: string): Handling[] => [
    avslag('S-g1'),
    { handling: 'krav', spor: 'vederlag', belop: 120000, navn: 'K-v2' },
    {
      handling: 'revisjon',
      spor: 'forhold',
      resultat: 'avslaatt',
      varslet_i_tide: false,
      navn: 'S-g2',
    },
    registrertSvar('K-g1', '2026-09-25'),
    registrertAksept('S-g1', aksept),
  ];

  it('en aksept av det første svaret, sendt etter svaret utenfor rekken, får ingen virkning', () =>
    prov('aksept-etter-svar-utenfor-rekken', steg('2026-09-26'), [
      {
        etter: 4,
        rolle: 'mal',
        kilde: ['OV-U103'],
        forventet: { forstaatt: true, 'svar_utenfor_rekken.forhold': ['S-r'] },
      },
      {
        etter: 5,
        rolle: 'mal',
        kilde: ['OV-U98', 'OV-U103'],
        forventet: { forstaatt: true, uten_virkning: ['A-r#aksept'] },
      },
    ]));

  it('en aksept av det første svaret, sendt samme dag som svaret utenfor rekken, har virkning (OV-U104)', () =>
    prov('aksept-samme-dag-som-svar-utenfor-rekken', steg('2026-09-25'), [
      {
        etter: 5,
        rolle: 'mal',
        kilde: ['OV-U98', 'OV-U104'],
        forventet: { forstaatt: true, uten_virkning: [] },
      },
    ]));
});

describe('en aksept som legges til, prøves mot svaret den gjelder, ikke mot det gjeldende svaret (OV-U98, #2022)', () => {
  const delvis = (navn: string, beloep: number): Handling => ({
    handling: 'brev',
    svar: [{ spor: 'vederlag', vurdering: 'delvis', godkjent_belop: beloep, navn }],
  });
  /** Revisjonen godkjenner hele kravet (K-v1, 100 000), så partene er enige ved sammenfall. */
  const godkjentRevisjon: Handling = {
    handling: 'revisjon',
    spor: 'vederlag',
    vurdering: 'godkjent',
    godkjent_belop: 100000,
    navn: 'S-v2',
  };
  const aksept: Handling = { handling: 'aksept', spor: 'vederlag', svar: 'S-v' };

  it('en aksept av det eldre svaret, sendt før revisjonen, godtas selv om sporet har enighet om revisjonen', async () => {
    // Svaret 24.09, revisjonen 25.09.
    const steg = [delvis('S-v', 60000), godkjentRevisjon];
    const foer = await provRegistrering(steg, aksept, '2026-09-24');
    expect(foer.godtatt ? null : foer.avvisning).toBeNull();
    expect(
      await provRegistrering(steg, aksept, '2026-09-26'),
      'kontrollsak: sendt etter revisjonen'
    ).toMatchObject({ godtatt: false, avvisning: { regel: 'IKKE_GJELDENDE_PAA_SENDEDATOEN' } });
  });

  it('kontrollsak: en aksept fra løsningen gjelder det gjeldende svaret, og avvises når partene alt er enige (GR-U8)', async () => {
    const s = await kjoer(
      {
        id: 'aksept-fra-loesningen',
        rader: [],
        start: 'krav_irreg',
        steg: [delvis('S-v', 60000), godkjentRevisjon],
        kontroller: [],
      },
      minnebane(),
      { valg: { klokke: dagklokke() } }
    );
    expect(await s.prov({ handling: 'aksept', spor: 'vederlag', svar: 'S-v2' })).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'ENIGHET_I_SPORET' },
    });
  });

  /** Byggherrens svar på grunnlagskravet, med `resultat`. */
  const forholdssvar = (navn: string, resultat: string): Handling => ({
    handling: 'brev',
    svar: [{ spor: 'forhold', resultat, varslet_i_tide: true, navn }],
  });
  const avslagSomRevisjon: Handling = {
    handling: 'revisjon',
    spor: 'forhold',
    resultat: 'avslaatt',
    varslet_i_tide: true,
    navn: 'S-g2',
  };

  const godkjenningSomRevisjon: Handling = {
    handling: 'revisjon',
    spor: 'forhold',
    resultat: 'godkjent',
    varslet_i_tide: true,
    navn: 'S-g2',
  };

  it('en aksept av et avslag på grunnlaget, lagt til etter byggherrens nye svar, lukker ikke saken (OV-U112, GR-U27)', () =>
    prov(
      'aksept-av-erstattet-avslag-lukker-ikke',
      [
        forholdssvar('S-g1', 'avslaatt'),
        godkjenningSomRevisjon,
        registrertAksept('S-g1', '2026-09-24'),
      ],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['OV-U112', 'GR-U27', 'OV-U98'],
          forventet: {
            forstaatt: true,
            uten_virkning: [],
            'enigheter_om_eldre_svar.forhold': ['S-g1'],
            forhold_avvist: false,
            forhold_avklart: true,
            'handlinger.TE': { inneholder: ['krav:frist'] },
          },
        },
      ]
    ));

  it('kontrollsak: en aksept av det gjeldende avslaget lukker saken (GR-U27)', () =>
    prov(
      'aksept-av-gjeldende-avslag-lukker',
      [forholdssvar('S-g1', 'avslaatt'), registrertAksept('S-g1', '2026-09-24')],
      [
        {
          etter: 2,
          rolle: 'kontroll',
          kilde: ['GR-U27'],
          forventet: { forstaatt: true, forhold_avvist: true },
        },
      ]
    ));

  it('en aksept av et frafall i et svar som senere er revidert, får ingen virkning (GR-U9, #2022 punkt 3)', () =>
    prov(
      'aksept-av-erstattet-frafall',
      [
        forholdssvar('S-g1', 'paalegg_frafalt'),
        avslagSomRevisjon,
        registrertAksept('S-g1', '2026-09-24'),
      ],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['GR-U9', 'OV-U98'],
          forventet: {
            forstaatt: true,
            uten_virkning: ['A-r#aksept'],
            'enigheter_om_eldre_svar.forhold': [],
          },
        },
      ]
    ));

  it('kontrollsak: en aksept av et avslag i et svar som senere er revidert, har virkning', () =>
    prov(
      'aksept-av-erstattet-avslag',
      [forholdssvar('S-g1', 'avslaatt'), avslagSomRevisjon, registrertAksept('S-g1', '2026-09-24')],
      [
        {
          etter: 3,
          rolle: 'kontroll',
          kilde: ['OV-U98'],
          forventet: { forstaatt: true, uten_virkning: [] },
        },
      ]
    ));

  it('kommandoen avviser en aksept av et frafall i et svar som senere er revidert (GR-U9)', async () => {
    const steg = [forholdssvar('S-g1', 'paalegg_frafalt'), avslagSomRevisjon];
    const frafallet: Handling = { handling: 'aksept', spor: 'forhold', svar: 'S-g1' };
    const utfall = await provRegistrering(steg, frafallet, '2026-09-24');
    expect(utfall).toMatchObject({ godtatt: false });
    expect(utfall.godtatt ? null : utfall.avvisning.melding).toContain('frafall');
  });
});

describe('et svar som legges til, kan gjelde en eldre kravversjon som var gjeldende da det ble sendt (OV-U98, #2011)', () => {
  /** Den nye versjonen av grunnlagskravet sendes fra løsningen 24.09. */
  const nyVersjon: Handling = {
    handling: 'krav',
    spor: 'forhold',
    underkategori: 'irregulaer_endring',
    navn: 'K-g2',
  };
  const svarPaaFoerste: Handling = {
    handling: 'brev',
    svar: [
      { spor: 'forhold', resultat: 'avslaatt', varslet_i_tide: true, gjelder: 'K-g1', navn: 'S-r' },
    ],
  };

  it('kommandoen godtar et svar på den forrige versjonen, sendt før den ble erstattet', async () => {
    const utfall = await provRegistrering([nyVersjon], svarPaaFoerste, '2026-09-23');
    expect(utfall.godtatt ? null : utfall.avvisning).toBeNull();
    expect(
      await provRegistrering([nyVersjon], svarPaaFoerste, '2026-09-25'),
      'kontrollsak: sendt etter den nye versjonen'
    ).toMatchObject({ godtatt: false, avvisning: { regel: 'IKKE_GJELDENDE_PAA_SENDEDATOEN' } });
  });

  it('et svar på den forrige versjonen, som alt har et svar, godtas bare når det ble sendt før det svaret (OV-U103)', async () => {
    // Svaret på den første versjonen 24.09, den nye versjonen 25.09.
    const steg = [avslag('S-g1'), nyVersjon];
    const foer = await provRegistrering(steg, svarPaaFoerste, '2026-09-23');
    expect(foer.godtatt ? null : foer.avvisning).toBeNull();
    expect(
      await provRegistrering(steg, svarPaaFoerste, '2026-09-24'),
      'kontrollsak: sendt samme dag som svaret'
    ).toMatchObject({ godtatt: false, avvisning: { regel: 'ALLEREDE_SVART' } });
  });

  it('en revisjon lagt til avvises når den gjelder en annen kravversjon enn svaret den erstatter', async () => {
    // Den nye versjonen 24.09 og svaret på den 25.09; revisjonen oppgir den forrige versjonen.
    const steg = [nyVersjon, avslag('S-g1')];
    const revisjon = (gjelder?: string): Handling => ({
      handling: 'revisjon',
      spor: 'forhold',
      resultat: 'avslaatt',
      varslet_i_tide: false,
      ...(gjelder ? { gjelder } : {}),
      navn: 'S-g2',
    });
    expect(await provRegistrering(steg, revisjon('K-g1'), '2026-09-26')).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'FEIL_SVARREFERANSE' },
    });
    const kontroll = await provRegistrering(steg, revisjon(), '2026-09-26');
    expect(
      kontroll.godtatt ? null : kontroll.avvisning,
      'kontrollsak: den gjeldende versjonen'
    ).toBeNull();
  });

  it('kontrollsak: et svar fra løsningen må gjelde den gjeldende versjonen', async () => {
    const s = await kjoer(
      {
        id: 'svar-paa-forrige-versjon',
        rader: [],
        start: 'krav_irreg',
        steg: [nyVersjon],
        kontroller: [],
      },
      minnebane(),
      { valg: { klokke: dagklokke() } }
    );
    expect(await s.prov(svarPaaFoerste)).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'FEIL_KRAVREFERANSE' },
    });
  });

  it('svaret på vederlagskravet regnes mot påberopelsen slik den var da svaret ble sendt (#342)', async () => {
    const svaret: Handling = {
      handling: 'brev',
      svar: [{ spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000, navn: 'S-v' }],
    };
    const paaberopelsen = async (sendt: string) => {
      const utfall = await provRegistrering([nyVersjon], svaret, sendt);
      if (!utfall.godtatt) throw new Error(utfall.avvisning.melding);
      const data = utfall.hendelser[0].data as { svar: { paaberopelse: string }[] };
      return data.svar[0].paaberopelse;
    };
    const [foer, etter] = [await paaberopelsen('2026-09-23'), await paaberopelsen('2026-09-25')];
    expect(foer, 'sendt før den nye versjonen av grunnlagskravet').toBe('K-g1');
    expect(etter, 'kontrollsak: sendt etter den nye versjonen').toBe('K-g2');
  });
});

describe('et svar som legges til, fryses med lagene i svaret på forholdet slik det var da det ble sendt (OV-U98, #2057)', () => {
  const svaret: Handling = {
    handling: 'brev',
    svar: [{ spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000, navn: 'S-v' }],
  };
  const forholdet = (resultat: string, navn: string): Handling => ({
    handling: 'brev',
    svar: [{ spor: 'forhold', resultat, varslet_i_tide: true, navn }],
  });

  const linjen = async (sendt: string) => {
    const utfall = await provRegistrering(
      [
        forholdet('godkjent', 'S-1'),
        {
          handling: 'revisjon',
          spor: 'forhold',
          resultat: 'avslaatt',
          varslet_i_tide: true,
          navn: 'S-2',
        },
      ],
      svaret,
      sendt
    );
    if (!utfall.godtatt) throw new Error(utfall.avvisning.melding);
    const data = utfall.hendelser[0].data as { svar: { beslutningsgrunnlag: { linje: string } }[] };
    return data.svar[0].beslutningsgrunnlag.linje;
  };

  it('et svar sendt før avslaget på forholdet er ikke subsidiært, og et svar sendt etter er det (OV-U32, OV-U33)', async () => {
    expect(await linjen('2026-09-24'), 'sendt etter godkjenningen og før avslaget').toMatch(
      /^Byggherrens standpunkt: godkjent med 60\s000\skr\.$/
    );
    expect(await linjen('2026-09-26'), 'kontrollsak: sendt etter avslaget').toMatch(
      /^Byggherrens standpunkt: subsidiært godkjent med 60\s000\skr\.$/
    );
  });

  it('en rad uten kommando fryses på samme måte (`frysBrev`)', async () => {
    const raden = async (sendt: string) => {
      const forloep: Forloep = {
        id: 'registrert-rad',
        rader: [],
        start: 'krav_irreg',
        steg: [
          forholdet('godkjent', 'S-1'),
          {
            handling: 'revisjon',
            spor: 'forhold',
            resultat: 'avslaatt',
            varslet_i_tide: true,
            navn: 'S-2',
          },
          {
            handling: 'rad',
            part: 'BH',
            spor: 'vederlag',
            vurdering: 'delvis',
            godkjent_belop: 60000,
            gjelder: 'K-v1',
            navn: 'S-v',
            sendt,
          },
        ],
        kontroller: [],
      };
      const k = await kjoer(forloep, minnebane(), { valg: { klokke: dagklokke() } });
      const data = (await k.bane.journal()).at(-1)!.data as {
        svar: { id: string; beslutningsgrunnlag: { linje: string } }[];
      };
      // Visningen leser lagene fra samme svar på forholdet som frysingen (`forholdssvaret`).
      const u = await k.utledning();
      const forholdssvaret = u.svar[data.svar[0].id]!.forholdssvaret;
      const samme = u.sendtSammeDag
        .filter((x) => x.element === data.svar[0].id)
        .map((x) => k.navn.navngi(x.med));
      return {
        linje: data.svar[0].beslutningsgrunnlag.linje,
        forholdssvaret: k.navn.navngi(forholdssvaret),
        samme,
      };
    };
    expect(await raden('2026-09-24'), 'sendt samme dag som godkjenningen og før avslaget').toEqual({
      linje: expect.stringMatching(/^Byggherrens standpunkt: godkjent med 60\s000\skr\.$/),
      forholdssvaret: 'S-1',
      samme: ['S-1'],
    });
    expect(await raden('2026-09-26'), 'kontrollsak: sendt etter avslaget').toEqual({
      linje: expect.stringMatching(
        /^Byggherrens standpunkt: subsidiært godkjent med 60\s000\skr\.$/
      ),
      forholdssvaret: 'S-2',
      samme: [],
    });
    // OV-U104: sendt samme dag som avslaget regnes avslaget med, og merkes.
    expect(await raden('2026-09-25'), 'samme dag som avslaget').toMatchObject({
      forholdssvaret: 'S-2',
      samme: ['S-2'],
    });
  });
});

describe('varselet etter § 32.2 og et krav utenfor rekken (VS-U38, OV-U102)', () => {
  const varselet: Handling = { handling: 'varsel', spor: 'frist', sendt: '2026-09-20' };
  const felt = {
    spor: 'forhold',
    hjemmel: '32.2',
    ...SOM_BREV,
    dokumentasjon: [VEDLEGG],
  };

  it('et varsel sendt etter et eldre krav avvises, fordi påberopelsen først ble sendt med det', async () => {
    expect(
      await provRegistrering(
        [registrertGrunnlagskrav('K-g0', '2026-09-19')],
        varselet,
        '2026-09-20',
        felt
      )
    ).toMatchObject({ godtatt: false, avvisning: { regel: 'VARSEL_ETTER_PAABEROPELSEN' } });
    const kontroll = await provRegistrering([], varselet, '2026-09-20', felt);
    expect(
      kontroll.godtatt ? null : kontroll.avvisning,
      'kontrollsak: uten det eldre kravet'
    ).toBeNull();
  });
});

describe('innholdet i et krav utenfor rekken (OV-U102)', () => {
  const toPoster: Handling = {
    handling: 'krav',
    spor: 'vederlag',
    kravposter: [{ post: 'P1', belop: 60000 }, { belop: 40000 }],
  };
  const enPost: Handling = {
    handling: 'krav',
    spor: 'vederlag',
    kravposter: [{ post: 'P1', belop: 60000 }],
  };

  it('kommandoen prøver fortsatt kravpostene mot rekken, til innholdet i et krav utenfor den er avklart (dagens atferd, #2011)', async () => {
    expect(await provRegistrering([toPoster], enPost, '2026-09-23')).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'KRAVPOSTENE' },
    });
  });
});

describe('enigheten om svaret byggherren har erstattet, bevares og vises ved det svaret (OV-U110)', () => {
  const svaret: Handling = {
    handling: 'brev',
    svar: [{ spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000, navn: 'S-v' }],
  };
  const godta = (svar: string): Handling => ({ handling: 'aksept', spor: 'vederlag', svar });
  const revisjon = (beloep: number): Handling => ({
    handling: 'revisjon',
    spor: 'vederlag',
    vurdering: 'delvis',
    godkjent_belop: beloep,
    navn: 'S-v2',
  });

  it('etter byggherrens nye svar bygger sporet på det nye svaret, og enigheten om det forrige står ved det', () =>
    prov(
      'enighet-etter-nytt-svar',
      [svaret, godta('S-v'), revisjon(50000), godta('S-v2')],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['OV-U110', 'HF-U29'],
          forventet: {
            forstaatt: true,
            'enighet.vederlag': null,
            'enigheter_om_eldre_svar.vederlag': ['S-v'],
            'visning.eldre_enigheter.vederlag': ['S-v:avviker'],
            'handlinger.TE': { inneholder: ['godta:vederlag'] },
          },
        },
        {
          etter: 4,
          rolle: 'mal',
          kilde: ['OV-U110'],
          forventet: {
            'enighet.vederlag': 'finnes',
            'enighet.vederlag.svar': 'S-v2',
            'enigheter_om_eldre_svar.vederlag': ['S-v'],
          },
        },
      ]
    ));

  it('kontrollsak: uten aksepten har sporet ingen enighet om det forrige svaret', () =>
    prov(
      'nytt-svar-uten-enighet',
      [svaret, revisjon(50000)],
      [
        {
          etter: 2,
          rolle: 'kontroll',
          kilde: ['OV-U110'],
          forventet: {
            forstaatt: true,
            'enighet.vederlag': null,
            'enigheter_om_eldre_svar.vederlag': [],
            'visning.eldre_enigheter.vederlag': [],
          },
        },
      ]
    ));

  it('et nytt svar med de samme standpunktene vises som at det stemmer med enigheten (HF-U29 punkt 8)', () =>
    prov(
      'nytt-svar-som-stemmer',
      [svaret, godta('S-v'), revisjon(60000)],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['OV-U110'],
          forventet: {
            'enighet.vederlag': null,
            'visning.eldre_enigheter.vederlag': ['S-v:stemmer'],
            'handlinger.TE': { inneholder: ['godta:vederlag'] },
          },
        },
      ]
    ));

  it('kravene er ikke lenger avgjort etter byggherrens nye svar, selv om enigheten om det forrige står (OV-U110, OV-U3)', () =>
    prov(
      'kravene-avgjort-etter-nytt-svar',
      [
        {
          handling: 'brev',
          svar: [{ spor: 'forhold', resultat: 'godkjent', varslet_i_tide: true, navn: 'S-g' }],
        },
        { handling: 'trekk', spor: 'frist' },
        svaret,
        godta('S-v'),
        revisjon(50000),
      ],
      [
        {
          etter: 4,
          rolle: 'mal',
          kilde: ['OV-U3'],
          forventet: { forstaatt: true, kravene_avgjort: true },
        },
        {
          etter: 5,
          rolle: 'mal',
          kilde: ['OV-U110', 'OV-U3'],
          forventet: {
            kravene_avgjort: false,
            'enigheter_om_eldre_svar.vederlag': ['S-v'],
          },
        },
      ]
    ));

  it('enigheten ved sammenfall i svaret byggherren har erstattet, står ved det svaret (OV-U110, GR-U7)', () =>
    prov(
      'sammenfall-i-eldre-svar',
      [
        {
          handling: 'brev',
          svar: [
            {
              spor: 'vederlag',
              vurdering: 'godkjent',
              godkjent_belop: 100000,
              navn: 'S-v',
            },
          ],
        },
        revisjon(60000),
      ],
      [
        {
          etter: 1,
          rolle: 'mal',
          kilde: ['GR-U7'],
          forventet: { 'enighet.vederlag.kilde': 'sammenfall' },
        },
        {
          etter: 2,
          rolle: 'mal',
          kilde: ['OV-U110'],
          forventet: {
            'enighet.vederlag': null,
            'enigheter_om_eldre_svar.vederlag': ['S-v'],
            'visning.eldre_enigheter.vederlag': ['S-v:avviker'],
          },
        },
      ]
    ));

  it('enigheten bevares etter en ny kravversjon fra totalentreprenøren (KA-U52 punkt 5)', () =>
    prov(
      'enighet-etter-ny-kravversjon',
      [
        svaret,
        godta('S-v'),
        { handling: 'krav', spor: 'vederlag', belop: 120000, navn: 'K-v2' },
        {
          handling: 'brev',
          svar: [{ spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000, navn: 'S-v3' }],
        },
      ],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['OV-U110', 'KA-U52'],
          forventet: {
            forstaatt: true,
            'gjeldende_krav.vederlag': 'K-v2',
            'enighet.vederlag': null,
            'enigheter_om_eldre_svar.vederlag': ['S-v'],
            'visning.eldre_enigheter.vederlag': ['S-v:ikke_sammenliknet'],
          },
        },
        {
          etter: 4,
          rolle: 'mal',
          kilde: ['OV-U110', 'HF-U29'],
          forventet: {
            'gjeldende_svar.vederlag': 'S-v3',
            'enigheter_om_eldre_svar.vederlag': ['S-v'],
            'visning.eldre_enigheter.vederlag': ['S-v:ikke_sammenliknet'],
          },
        },
      ]
    ));
});
