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
  felt: Record<string, unknown> = { korrespondansetype: 'brev', dokumentasjon: [VEDLEGG] }
) {
  const forloep: Forloep = {
    id: 'registrering',
    rader: [],
    start: 'krav_irreg',
    steg,
    kontroller: [],
  };
  const k = await kjoer(forloep, minnebane(), { valg: { klokke: dagklokke() } });
  return k.prov(h, (kommando) => {
    // Et registrert svar har ingen tekst fra løsningen (OV-U80).
    for (const s of [kommando.svar ?? []].flat() as Record<string, unknown>[])
      if (typeof s === 'object') {
        delete s.utdypning;
        delete s.utdypninger;
      }
    Object.assign(kommando, { sendt, ...felt });
    for (const [felt, verdi] of Object.entries(kommando))
      if (verdi === undefined) delete kommando[felt];
  });
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
      korrespondansetype: 'brev',
      dokumentasjon: [VEDLEGG],
      utdypning: 'Tekst fra løsningen.',
    });
    expect(medUtdypning).toMatchObject({ godtatt: false, avvisning: { regel: 'UGYLDIG_FORM' } });
    const utenDato = await provRegistrering([], vederlagskrav, '2026-09-23', {
      korrespondansetype: 'brev',
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

  it('en aksept av svaret utenfor rekken får ingen virkning til #2022 punkt 4 er bygget', () =>
    prov(
      'aksept-av-svar-utenfor-rekken',
      [avslag('S-g1'), foerste('2026-09-23'), registrertAksept('S-r', '2026-09-23')],
      [
        {
          etter: 3,
          rolle: 'mal',
          kilde: ['OV-U103'],
          forventet: { forstaatt: true, uten_virkning: ['A-r#aksept'], 'enighet.forhold': null },
        },
      ]
    ));

  it('kontrollsak: en aksept av det gjeldende svaret gir enighet', () =>
    prov(
      'aksept-av-gjeldende-svar',
      [avslag('S-g1'), foerste('2026-09-23'), registrertAksept('S-g1', '2026-09-25')],
      [
        {
          etter: 3,
          rolle: 'kontroll',
          kilde: KILDE,
          forventet: { forstaatt: true, uten_virkning: [], 'enighet.forhold': 'finnes' },
        },
      ]
    ));
});

describe('varselet etter § 32.2 og et krav utenfor rekken (VS-U38, OV-U102)', () => {
  const varselet: Handling = { handling: 'varsel', spor: 'frist', sendt: '2026-09-20' };
  const felt = {
    spor: 'forhold',
    hjemmel: '32.2',
    korrespondansetype: 'brev',
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
