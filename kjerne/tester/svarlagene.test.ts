/**
 * Lagene i svaret: et frist- eller vederlagssvar som ikke er ferdig utfylt, forutsetningene i
 * forholdssvaret, spørsmålene regelen krever svar på og lagene i utregningen.
 * Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { describe, expect, it } from 'vitest';
import { regnUtSvar } from '../frosset/utregning.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import {
  kontrollerOppgjoersformen,
  stiltIKravposten,
  ubesvartIKravposten,
} from '../regler/vederlag.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import { innholdIFristen } from '../spor/frist/format.ts';
import { lagForUtkastet } from '../kommandoer/lag.ts';
import { P1, medKravpostIder, medP1 } from './klient.ts';
import type { Svarutkast } from '../kommandoer/kommando.ts';
import { KJERNE } from '../versjon.ts';
import { lagFraForholdet } from '../spor/forhold/frysing.ts';
import {
  type Data,
  FRISTKRAV,
  KLAR_OVER,
  PAABEROPELSE,
  sak,
  svar,
  tilbud,
  utenFelt,
} from './brevsak.ts';

describe('lagene i et fristsvar som ikke er ferdig utfylt (M-8 i BF-20, KA-U78, OV-U32, OV-U33)', () => {
  /** Forholdet, BHs svar på det og fristkravet med varselet etter § 33.4 i et tidligere brev. */
  const saken = (forhold: Data) => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [svar('forhold', s.krav('forhold'), { grunnlag_varslet_i_tide: true, ...forhold })],
    });
    s.send('TE', FRISTKRAV);
    return s;
  };
  const lagene = (s: ReturnType<typeof sak>, vurderinger: Data) =>
    lagForUtkastet(
      svar('frist', s.krav('frist'), vurderinger) as Svarutkast & { spor: 'frist' },
      s.u(),
      KJERNE.regler
    ).standpunkter.map(({ art, hjemmel, gjelder, ...rest }) => ({
      standpunkt: [art, hjemmel].filter(Boolean).join(' '),
      ...(gjelder === undefined ? {} : { gjelder: gjelder === fristen(s) ? 'fristen' : gjelder }),
      ...rest,
    }));
  const fristen = (s: ReturnType<typeof sak>) =>
    innholdIFristen(s.u().spor.frist.gjeldendeKrav!).frister[0]!.id;

  it('kontrollsak: med godkjent forhold og ingenting besvart står spørsmålene ubesvart og uten virkning, og dagene uten lag og uten forutsetninger (S1-A, #1925)', () => {
    const s = saken({ resultat: 'godkjent' });
    expect(lagene(s, { frister: [{}] })).toEqual([
      {
        standpunkt: 'rettidighet 33.4',
        besvart: false,
        virkning: 'uten_virkning',
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'hindring',
        besvart: false,
        virkning: 'uten_virkning',
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'spesifisering',
        besvart: false,
        virkning: 'uten_virkning',
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'dager',
        gjelder: 'fristen',
        besvart: false,
        virkning: 1,
        etikett: null,
        forutsetninger: [],
      },
    ]);
  });

  it.each([true, false])(
    'KA-U84: hindringen i utkastet får vilkåret fra varselet når varselet kom i tide = %s',
    (fristVarselOk) => {
      const s = saken({ resultat: 'godkjent' });
      const punkter = lagene(s, {
        frist_varsel_ok: fristVarselOk,
        vilkar_oppfylt: true,
        spesifisert_krav_ok: true,
        frister: [{ dager: 10 }],
      });
      const vilkaar = fristVarselOk ? [] : [{ innsigelse: '33.4' }];
      expect(punkter.find((p) => p.standpunkt === 'hindring')).toMatchObject({
        besvart: true,
        virkning: fristVarselOk ? 'uten_virkning' : 2,
        forutsetninger: vilkaar,
      });
      expect(punkter.find((p) => p.standpunkt === 'dager')?.forutsetninger).toEqual(vilkaar);
    }
  );

  it('KA-U78: varselet for sent, ikke hindret og spesifisert for sent gir fire lag, med innsigelsene foran i brevets rekkefølge', () => {
    const s = saken({ resultat: 'godkjent' });
    const lag = lagene(s, {
      frist_varsel_ok: false,
      vilkar_oppfylt: false,
      spesifisert_krav_ok: false,
      frister: [{ dager: 10, dager_maatte_forstaa: 5 }],
    });
    expect(lag.map((l) => [l.standpunkt, l.virkning, l.etikett, l.forutsetninger])).toEqual([
      ['rettidighet 33.4', 1, 'prinsipalt', []],
      ['hindring', 2, 'subsidiært', [{ innsigelse: '33.4' }]],
      [
        'spesifisering',
        3,
        'videre subsidiært',
        [{ innsigelse: '33.4' }, { innsigelse: 'hindring' }],
      ],
      [
        'dager',
        4,
        'videre subsidiært',
        [{ innsigelse: '33.4' }, { innsigelse: 'hindring' }, { innsigelse: '33.6.1' }],
      ],
    ]);
    expect(lag.at(-1)!.besvart).toBe(true);
  });

  it('varselet i tide og hindret er uten virkning og ingen forutsetning for dagene (OV-U33)', () => {
    const s = saken({ resultat: 'godkjent' });
    const lag = lagene(s, {
      frist_varsel_ok: true,
      vilkar_oppfylt: true,
      spesifisert_krav_ok: true,
      frister: [{ dager: 20 }],
    });
    expect(lag.map((l) => [l.standpunkt, l.virkning, l.etikett, l.forutsetninger])).toEqual([
      ['rettidighet 33.4', 'uten_virkning', null, []],
      ['hindring', 'uten_virkning', null, []],
      ['spesifisering', 'uten_virkning', null, []],
      ['dager', 1, null, []],
    ]);
  });

  it('avslått forhold står foran sporet: dagene står subsidiært med avslaget foran (OV-U32, S1-A)', () => {
    const s = saken({ resultat: 'avslaatt' });
    expect(lagene(s, { vilkar_oppfylt: false, frister: [{}] })).toEqual([
      {
        standpunkt: 'rettidighet 33.4',
        besvart: false,
        virkning: 'uten_virkning',
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'hindring',
        besvart: true,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }],
      },
      {
        standpunkt: 'spesifisering',
        besvart: false,
        virkning: 'uten_virkning',
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'dager',
        gjelder: 'fristen',
        besvart: false,
        virkning: 3,
        etikett: 'videre subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }, { innsigelse: 'hindring' }],
      },
    ]);
  });

  // Fristen kan stå uten feltet eller med null, og begge fylles med 0 dager (#1971). Testen
  // ser at `lagene` ikke kaster, så feilinnføringene feiler på en assertion.
  it.each([
    ['uten feltet', {}],
    ['med null', { dager_maatte_forstaa: null }],
  ])(
    'spesifisert for sent uten dagene byggherren måtte forstå, %s, gir lagene, med spesifiseringen besvart (#1925)',
    (_, frist) => {
      const s = saken({ resultat: 'godkjent' });
      const v = { spesifisert_krav_ok: false, frister: [frist] };
      expect(() => lagene(s, v)).not.toThrow();
      expect(lagene(s, v).map((l) => [l.standpunkt, l.besvart, l.virkning])).toEqual([
        ['rettidighet 33.4', false, 'uten_virkning'],
        ['hindring', false, 'uten_virkning'],
        ['spesifisering', true, 1],
        ['dager', false, 2],
      ]);
    }
  );

  it('når kravet svarer på forespørselen, står spørsmålet om forespørselen ubesvart og spesifiseringen ikke (KA-U78 siste setning, #1925)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { grunnlag_varslet_i_tide: true, resultat: 'godkjent' }),
      ],
    });
    s.send('BH', { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(lagene(s, { frister: [{}] }).map((l) => [l.standpunkt, l.besvart])).toEqual([
      ['rettidighet 33.4', false],
      ['rettidighet 33.6.2', false],
      ['hindring', false],
      ['dager', false],
    ]);
    expect(
      lagene(s, { foresporsel_svar_ok: true, frister: [{}] }).find(
        (l) => l.standpunkt === 'rettidighet 33.6.2'
      )?.besvart,
      'besvart'
    ).toBe(true);
  });

  it('vurderingene må være én per frist i kravet, som i svaret (KA-U74)', () => {
    const s = saken({ resultat: 'godkjent' });
    expect(() => lagene(s, {})).toThrow(UgyldigVurdering);
  });
});

describe('forutsetningene i forholdssvaret (#2181, OV-U32, OV-U33, GR-U11)', () => {
  const saken = (varsling: boolean) => {
    const s = sak();
    s.send(
      'TE',
      varsling
        ? PAABEROPELSE
        : {
            type: 'krav',
            spor: 'forhold',
            innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
          }
    );
    return s;
  };
  const lagene = (s: ReturnType<typeof sak>, vurderinger: Data) =>
    lagForUtkastet(
      svar('forhold', s.krav('forhold'), vurderinger) as Svarutkast & { spor: 'forhold' },
      s.u(),
      KJERNE.regler
    );

  it('stiller varselet etter punkt 32.2 bare der varslingsplikten gjelder, også når det er besvart (GR-U12, #2279)', () => {
    const spoersmaal = (lag: ReturnType<typeof lagene>) => lag.stilt.map((x) => x.spoersmaal);
    expect(spoersmaal(lagene(saken(true), {}))).toEqual(['grunnlag_varslet_i_tide', 'resultat']);
    expect(
      spoersmaal(lagene(saken(true), { grunnlag_varslet_i_tide: true, resultat: 'godkjent' }))
    ).toEqual(['grunnlag_varslet_i_tide', 'resultat']);
    expect(spoersmaal(lagene(saken(false), {})), 'svikt').toEqual(['resultat']);
  });

  it('har varslingsplikt og en virksom innsigelse etter 32.2, så forholdet får forutsetningen med varselet som kilde', () => {
    const s = saken(true);
    const lag = lagene(s, { grunnlag_varslet_i_tide: false });
    expect(lag.standpunkter.find((x) => x.art === 'rettidighet')).toMatchObject({
      hjemmel: '32.2',
    });
    expect(lag.standpunkter.find((x) => x.art === 'rettidighet')).not.toHaveProperty('gjelder');
    expect(lag.standpunkter.find((x) => x.art === 'forhold')).toMatchObject({
      besvart: false,
      virkning: 2,
      etikett: 'subsidiært',
      forutsetninger: [{ innsigelse: '32.2', gjelder: s.krav('forhold') }],
    });
  });

  it.each([
    [true, true],
    [true, undefined],
    [false, false],
    [false, true],
    [false, undefined],
  ])(
    'uten virksom innsigelse gir varslingsplikt %s og i tide %s ingen forutsetning',
    (varsling, iTide) => {
      const s = saken(varsling);
      const lag = lagene(s, {
        resultat: 'avslaatt',
        ...(iTide === undefined ? {} : { grunnlag_varslet_i_tide: iTide }),
      });
      expect(lag.standpunkter.find((x) => x.art === 'forhold')).toMatchObject({
        besvart: true,
        virkning: 1,
        etikett: null,
        forutsetninger: [],
      });
    }
  );

  it('har bare egne lag selv om det tidligere svaret på forholdet opptok to lag', () => {
    const s = saken(true);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
          {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: false,
          },
          undefined,
          'Pålegget innebærer ingen endring.'
        ),
      ],
    });
    expect(
      lagene(s, { resultat: 'godkjent', grunnlag_varslet_i_tide: false }).standpunkter.find(
        (x) => x.art === 'forhold'
      )?.virkning
    ).toBe(2);
  });

  it('skiller ubesvarte spørsmål fra svar kontrollen ikke godtar', () => {
    const s = saken(true);
    expect(lagene(s, {}).ubesvart).toEqual([
      { spoersmaal: 'grunnlag_varslet_i_tide' },
      { spoersmaal: 'resultat' },
    ]);
    expect(lagene(s, {}).ugyldig).toEqual([]);
    expect(lagene(s, { grunnlag_varslet_i_tide: 'ukjent', resultat: 'ukjent' }).ugyldig).toEqual([
      { spoersmaal: 'resultat' },
      { spoersmaal: 'grunnlag_varslet_i_tide' },
    ]);
    expect(lagene(s, { grunnlag_varslet_i_tide: true, resultat: 'ukjent' }).ugyldig).toEqual([
      { spoersmaal: 'resultat' },
    ]);
  });
});

describe('lagene i et vederlagssvar som ikke er ferdig utfylt (OV-U32, OV-U33, S1-A og S2-A i #1400)', () => {
  const sviktkrav = {
    type: 'krav',
    spor: 'forhold',
    innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
  };
  /** Forholdet, BHs svar på det og vederlagskravet. `svikt` gir varslingsplikt etter § 34.1.2. */
  const saken = (forhold: Data, { svikt = true, vederlag = tilbud(100000) as Data } = {}) => {
    const s = sak();
    s.send('TE', svikt ? sviktkrav : PAABEROPELSE);
    s.send('BH', { type: 'brev', svar: [svar('forhold', s.krav('forhold'), forhold)] });
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: vederlag });
    return s;
  };
  const lagene = (s: ReturnType<typeof sak>, vurderinger: Data) =>
    lagForUtkastet(
      svar(
        'vederlag',
        s.krav('vederlag'),
        medKravpostIder(vurderinger, s.u().spor.vederlag.gjeldendeKrav)
      ) as never,
      s.u(),
      KJERNE.regler
    ).standpunkter.map(({ art, hjemmel, saerskilt, ...rest }) => {
      // Kravposten står i sin egen test under; her er det lagene som prøves.
      delete rest.gjelder;
      return { standpunkt: [art, hjemmel ?? saerskilt].filter(Boolean).join(' '), ...rest };
    });

  it('med to kravposter sier hvert lag for beløpet og oppgjørsformen hvilken kravpost det gjelder (KA-U57 (c) og (d))', () => {
    const s = saken(
      { resultat: 'godkjent' },
      {
        vederlag: {
          kravposter: [
            { beskrivelse: 'Graving', oppgjoersform: 'tilbud', beloep: 100000 },
            { beskrivelse: 'Rør', oppgjoersform: 'tilbud', beloep: 40000 },
          ],
        },
      }
    );
    const [p1, p2] = kravposterI(s.u().spor.vederlag.gjeldendeKrav!);
    const lag = lagForUtkastet(
      svar(
        'vederlag',
        s.krav('vederlag'),
        medKravpostIder(
          {
            hovedkrav_varslet_i_tide: true,
            kravposter: [
              { gjelder: 'P1', aksepterer: true },
              { gjelder: 'P2', aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' },
            ],
          },
          s.u().spor.vederlag.gjeldendeKrav
        )
      ) as never,
      s.u(),
      KJERNE.regler
    );
    expect(
      lag.standpunkter
        .filter((x) => x.art === 'beloep' || x.art === 'oppgjoersform')
        .map((x) => [x.art, x.gjelder])
    ).toEqual(
      expect.arrayContaining([
        ['oppgjoersform', p1!.id],
        ['oppgjoersform', p2!.id],
        ['beloep', p1!.id],
        ['beloep', p2!.id],
      ])
    );
  });

  it('kontrollsak: med godkjent forhold og ingenting besvart står oppgjørsformen og beløpet uten lag og uten forutsetninger (#1925)', () => {
    const s = saken({ resultat: 'godkjent' });
    expect(lagene(s, {})).toEqual([
      {
        standpunkt: 'oppgjoersform',
        besvart: false,
        virkning: 1,
        etikett: null,
        forutsetninger: [],
      },
      { standpunkt: 'beloep', besvart: false, virkning: 1, etikett: null, forutsetninger: [] },
    ]);
  });

  it('avslått forhold og ubesvart varsel: beløpet står subsidiært, bare med avslaget foran (S1-A)', () => {
    const s = saken({ resultat: 'avslaatt' });
    expect(lagene(s, P1({ aksepterer: true }))).toEqual([
      {
        standpunkt: 'oppgjoersform',
        besvart: true,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }],
      },
      {
        standpunkt: 'beloep',
        besvart: false,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }],
      },
    ]);
  });

  it('avslått forhold og varselet etter § 34.1.2 for sent: beløpet står videre subsidiært med begge innsigelsene foran, før det er besvart', () => {
    const s = saken({ resultat: 'avslaatt' });
    expect(lagene(s, { hovedkrav_varslet_i_tide: false })).toEqual([
      {
        standpunkt: 'rettidighet 34.1.2',
        besvart: true,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }],
      },
      {
        standpunkt: 'oppgjoersform',
        besvart: false,
        virkning: 3,
        etikett: 'videre subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }, { innsigelse: '34.1.2' }],
      },
      {
        standpunkt: 'beloep',
        besvart: false,
        virkning: 3,
        etikett: 'videre subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }, { innsigelse: '34.1.2' }],
      },
    ]);
  });

  it('varselet etter § 34.1.2 i tide er uten virkning og ingen forutsetning for beløpet, og oppgjørsformen står ubesvart (#1925)', () => {
    const s = saken({ resultat: 'godkjent' });
    expect(lagene(s, medP1({ hovedkrav_varslet_i_tide: true }, { vurdering: 'godkjent' }))).toEqual(
      [
        {
          standpunkt: 'rettidighet 34.1.2',
          besvart: true,
          virkning: 'uten_virkning',
          etikett: null,
          forutsetninger: [],
        },
        {
          standpunkt: 'oppgjoersform',
          besvart: false,
          virkning: 1,
          etikett: null,
          forutsetninger: [],
        },
        { standpunkt: 'beloep', besvart: true, virkning: 1, etikett: null, forutsetninger: [] },
      ]
    );
  });

  // #1925: utfyllingen skjemaet gjorde selv, står i kjernen, og testen fastholder lagene slik
  // skjemaet viste dem. Laget for oppgjørsformen står uansett svaret (OV-U33, LV-U31). Varselet
  // etter § 34.3.3 og justeringen står med regelen regnet som godtatt, og justeringen i laget
  // etter innsigelsen mot varselet (VS-U56).
  it('i en kravpost etter justerte enhetspriser står oppgjørsformen, varselet etter § 34.3.3 og justeringen ubesvart, i lagene skjemaet viste, før de er besvart (OV-U33, VS-U56, #1925)', () => {
    const s = saken(
      { resultat: 'godkjent' },
      {
        vederlag: {
          kravposter: [{ beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true }],
        },
      }
    );
    expect(lagene(s, { kravposter: [{ gjelder: 'P1' }] })).toEqual([
      {
        standpunkt: 'oppgjoersform',
        besvart: false,
        virkning: 1,
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'rettidighet 34.3.3',
        besvart: false,
        virkning: 1,
        etikett: 'prinsipalt',
        forutsetninger: [],
      },
      {
        standpunkt: 'justering',
        besvart: false,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ innsigelse: '34.3.3' }],
      },
      { standpunkt: 'beloep', besvart: true, virkning: 1, etikett: null, forutsetninger: [] },
    ]);
  });

  it('innsigelsen mot varselet etter § 34.3.3 for én kravpost er forutsetning bare for justeringen i den kravposten, ikke i en annen (OV-U117, VS-U56)', () => {
    const s = saken(
      { resultat: 'godkjent' },
      {
        vederlag: {
          kravposter: [
            { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true },
            { beskrivelse: 'Peler', oppgjoersform: 'enhetspriser', justert: true },
          ],
        },
      }
    );
    const [p1, p2] = kravposterI(s.u().spor.vederlag.gjeldendeKrav!);
    const lag = lagForUtkastet(
      svar(
        'vederlag',
        s.krav('vederlag'),
        medKravpostIder(
          {
            kravposter: [
              { gjelder: 'P1', aksepterer: true, varslet_i_tide: false, godtar_justering: false },
              {
                gjelder: 'P2',
                aksepterer: false,
                oensket_oppgjoersform: 'regningsarbeid',
                varslet_i_tide: true,
                godtar_justering: false,
              },
            ],
          },
          s.u().spor.vederlag.gjeldendeKrav
        )
      ) as never,
      s.u(),
      KJERNE.regler
    );
    const justeringen = (id: string) =>
      lag.standpunkter.find((x) => x.art === 'justering' && x.gjelder === id);
    expect([justeringen(p1!.id)?.virkning, justeringen(p2!.id)?.virkning]).toEqual([2, 2]);
    expect(justeringen(p1!.id)?.forutsetninger).toEqual([{ innsigelse: '34.3.3' }]);
    expect(justeringen(p2!.id)?.forutsetninger).toEqual([{ oppgjoersform: p2!.id }]);
  });

  it('kontrollsak: med oppgjørsformen godtatt og varselet og justeringen besvart står de besvart (#1925)', () => {
    const s = saken(
      { resultat: 'godkjent' },
      {
        vederlag: {
          kravposter: [{ beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true }],
        },
      }
    );
    expect(
      lagene(s, {
        kravposter: [
          { gjelder: 'P1', aksepterer: true, varslet_i_tide: true, godtar_justering: true },
        ],
      }).map((l) => [l.standpunkt, l.besvart])
    ).toEqual([
      ['oppgjoersform', true],
      ['rettidighet 34.3.3', true],
      ['justering', true],
      ['beloep', true],
    ]);
  });

  it('preklusjon etter § 32.2 og avslag står foran sporet i brevets rekkefølge (OV-U32)', () => {
    const s = saken({ resultat: 'avslaatt', grunnlag_varslet_i_tide: false }, { svikt: false });
    expect(lagene(s, {})).toEqual([
      {
        standpunkt: 'oppgjoersform',
        besvart: false,
        virkning: 3,
        etikett: 'videre subsidiært',
        forutsetninger: [{ grunn: 'prekludert' }, { grunn: 'avslaatt' }],
      },
      {
        standpunkt: 'beloep',
        besvart: false,
        virkning: 3,
        etikett: 'videre subsidiært',
        forutsetninger: [{ grunn: 'prekludert' }, { grunn: 'avslaatt' }],
      },
    ]);
  });

  it('§ 34.1.3 rammer bare posten etter annet ledd, og justeringen ellers er upåvirket eller har bare avslaget foran (OV-U22, OV-U27, OV-U33)', () => {
    const krav = {
      svikt: false,
      vederlag: tilbud(150000, { saerskilt: { produktivitet: { beloep: 40000 } } }),
    };
    const avslaatt = saken({ resultat: 'avslaatt', grunnlag_varslet_i_tide: true }, krav);
    expect(
      lagene(avslaatt, { produktivitet_varslet_i_tide: false }).map((x) => [
        x.standpunkt,
        x.virkning,
        x.forutsetninger,
      ])
    ).toEqual([
      ['oppgjoersform', 2, [{ grunn: 'avslaatt' }]],
      ['beloep', 2, [{ grunn: 'avslaatt' }]],
      ['rettidighet 34.1.3', 2, [{ grunn: 'avslaatt' }]],
      ['beloep produktivitet', 3, [{ grunn: 'avslaatt' }, { innsigelse: '34.1.3' }]],
    ]);
    const s = saken({ resultat: 'godkjent', grunnlag_varslet_i_tide: true }, krav);
    expect(lagene(s, { produktivitet_varslet_i_tide: false })).toEqual([
      {
        standpunkt: 'oppgjoersform',
        besvart: false,
        virkning: 'upaavirket',
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'beloep',
        besvart: false,
        virkning: 'upaavirket',
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'rettidighet 34.1.3',
        besvart: true,
        virkning: 1,
        etikett: 'prinsipalt',
        forutsetninger: [],
      },
      {
        standpunkt: 'beloep produktivitet',
        besvart: false,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ innsigelse: '34.1.3' }],
      },
    ]);
  });

  it('§ 34.1.3 er ikke forutsetning for justeringen i en kravpost etter en beregningsregel, selv i et senere lag (OV-U22, VS-U5, VS-U56)', () => {
    const s = saken(
      { resultat: 'godkjent', grunnlag_varslet_i_tide: true },
      {
        svikt: false,
        vederlag: {
          kravposter: [{ beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true }],
          saerskilt: { produktivitet: { beloep: 40000 } },
        },
      }
    );
    const [p1] = kravposterI(s.u().spor.vederlag.gjeldendeKrav!);
    const lag = lagForUtkastet(
      svar(
        'vederlag',
        s.krav('vederlag'),
        medKravpostIder(
          {
            produktivitet_varslet_i_tide: false,
            kravposter: [
              {
                gjelder: 'P1',
                aksepterer: false,
                oensket_oppgjoersform: 'regningsarbeid',
                varslet_i_tide: true,
                godtar_justering: false,
              },
            ],
          },
          s.u().spor.vederlag.gjeldendeKrav
        )
      ) as never,
      s.u(),
      KJERNE.regler
    );
    const finn = (art: string, hjemmel?: string) =>
      lag.standpunkter.find(
        (x) => x.art === art && (hjemmel === undefined || x.hjemmel === hjemmel)
      )!;
    // Forutsetningen for prøven: justeringen står i et senere lag enn innsigelsen etter § 34.1.3.
    expect([finn('rettidighet', '34.1.3').virkning, finn('justering').virkning]).toEqual([1, 2]);
    expect(finn('justering').forutsetninger).toEqual([{ oppgjoersform: p1!.id }]);
  });

  it('med § 34.1.2 og § 34.1.3 for sent har posten begge innsigelsene foran, og justeringen ellers bare § 34.1.2', () => {
    const s = saken(
      { resultat: 'godkjent' },
      {
        vederlag: tilbud(150000, { saerskilt: { produktivitet: { beloep: 40000 } } }),
      }
    );
    const l = lagene(s, { hovedkrav_varslet_i_tide: false, produktivitet_varslet_i_tide: false });
    expect(l.map((x) => [x.standpunkt, x.virkning, x.forutsetninger])).toEqual([
      ['rettidighet 34.1.2', 1, []],
      ['oppgjoersform', 2, [{ innsigelse: '34.1.2' }]],
      ['beloep', 2, [{ innsigelse: '34.1.2' }]],
      ['rettidighet 34.1.3', 2, [{ innsigelse: '34.1.2' }]],
      ['beloep produktivitet', 3, [{ innsigelse: '34.1.2' }, { innsigelse: '34.1.3' }]],
    ]);
  });

  it('det ferdige svaret har de samme lagene som brevet fryser når det sendes (MM-U9)', () => {
    const s = saken({ resultat: 'avslaatt' });
    const vurderinger = {
      hovedkrav_varslet_i_tide: false,
      ...P1({ aksepterer: true, vurdering: 'delvis', godkjent_beloep: 60000 }),
    };
    const foer = lagene(s, vurderinger);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('vederlag', s.krav('vederlag'), vurderinger, {
          resultat: 'avslaatt',
          godkjent_beloep: 0,
          subsidiaert_resultat: 'delvis_godkjent',
          subsidiaert_godkjent_beloep: 60000,
        }),
      ],
    });
    const u = s.u();
    const g = u.spor.forhold.gjeldendeSvar!;
    const forskyvning = lagFraForholdet(g, g.beslutningsgrunnlag.virkninger);
    const frosset = u.spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.virkninger;
    expect(foer.map((l) => l.virkning)).toEqual(
      frosset.map((v) => (typeof v.virkning === 'number' ? v.virkning + forskyvning : v.virkning))
    );
    expect(foer.at(-1)).toMatchObject({ besvart: true, etikett: 'videre subsidiært' });
  });
});

/**
 * #2025 punkt 3: kjernen sier hvilke spørsmål regelen krever svar på i et svarutkast, og som er
 * ubesvart (`ubesvart` i `Utkastlag`). Forventningene har kilden i bestemmelsen kontrollen viser
 * til, og hvert tilfelle prøves mot avvisningen når utkastet sendes: kjernen avviser feltet med
 * «mangler». Prøven utelater rigg og drift og en revisjon av svaret.
 */
describe('spørsmålene regelen krever svar på i et svarutkast (#2025)', () => {
  const sviktkrav = {
    type: 'krav',
    spor: 'forhold',
    innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
  };
  /** Forholdet godkjent, og kravet i sporet. `svikt` gir varslingsplikt etter § 34.1.2. */
  const saken = (krav: Data, svikt = false) => {
    const s = sak();
    s.send('TE', svikt ? sviktkrav : PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
          svikt ? { resultat: 'godkjent' } : { grunnlag_varslet_i_tide: true, resultat: 'godkjent' }
        ),
      ],
    });
    s.send('TE', krav);
    return s;
  };
  const vederlagskravet = (innhold: Data): Data => ({ type: 'krav', spor: 'vederlag', innhold });
  const utkastet = (s: ReturnType<typeof sak>, spor: 'frist' | 'vederlag', vurderinger: Data) =>
    svar(
      spor,
      s.krav(spor),
      spor === 'vederlag'
        ? medKravpostIder(vurderinger, s.u().spor.vederlag.gjeldendeKrav)
        : vurderinger
    );
  /** Spørsmålene i `liste` med kravposten og fristen som betegnelse, så forventningen kan leses. */
  const spoersmaalene = (
    s: ReturnType<typeof sak>,
    spor: 'frist' | 'vederlag',
    vurderinger: Data,
    liste: 'ubesvart' | 'stilt' | 'ugyldig'
  ) => {
    const ider = new Map<string, string>([
      ...(s.u().spor.vederlag.gjeldendeKrav
        ? kravposterI(s.u().spor.vederlag.gjeldendeKrav!)
        : []
      ).map((p) => [p.id, p.betegnelse] as [string, string]),
      ...(s.u().spor.frist.gjeldendeKrav
        ? innholdIFristen(s.u().spor.frist.gjeldendeKrav!).frister.map(
            (f, i) => [f.id, `frist ${i + 1}`] as [string, string]
          )
        : []),
    ]);
    let lag: ReturnType<typeof lagForUtkastet>;
    try {
      lag = lagForUtkastet(utkastet(s, spor, vurderinger) as Svarutkast, s.u(), KJERNE.regler);
    } catch (e) {
      // Et kast er en feil i lagene, ikke i oppsettet, så testen feiler som en assertion.
      expect.fail(`lagene kastet: ${String(e)}`);
    }
    const spoersmaal = liste !== 'stilt' ? lag[liste] : lag.stilt;
    return spoersmaal.map(({ spoersmaal, gjelder }) =>
      gjelder === undefined ? spoersmaal : `${ider.get(gjelder)}.${spoersmaal}`
    );
  };
  const ubesvart = (s: ReturnType<typeof sak>, spor: 'frist' | 'vederlag', vurderinger: Data) =>
    spoersmaalene(s, spor, vurderinger, 'ubesvart');
  /** #2156 punkt 1: svarene i utkastet kjernen ikke godtar når svaret sendes. */
  const ugyldig = (s: ReturnType<typeof sak>, spor: 'frist' | 'vederlag', vurderinger: Data) =>
    spoersmaalene(s, spor, vurderinger, 'ugyldig');
  /** #2156 punkt 2: spørsmålene regelen stiller i svarutkastet på fristen, også når de er besvart. */
  const stilt = (s: ReturnType<typeof sak>, vurderinger: Data) =>
    spoersmaalene(s, 'frist', vurderinger, 'stilt');
  /** #2279: spørsmålene regelen stiller i svarutkastet på vederlaget, også når de er besvart. */
  const stiltIVederlaget = (s: ReturnType<typeof sak>, vurderinger: Data) =>
    spoersmaalene(s, 'vederlag', vurderinger, 'stilt');
  const melding = (s: ReturnType<typeof sak>, spor: 'frist' | 'vederlag', vurderinger: Data) =>
    s.avvisning('BH', { type: 'brev', svar: [utkastet(s, spor, vurderinger)] })?.melding ?? '';

  it('fristen: uten svar er varselet etter § 33.4, spesifiseringen etter § 33.6.1, hindringen etter § 33.1 og dagene etter § 33.5 påkrevd', () => {
    const s = saken(FRISTKRAV);
    expect(ubesvart(s, 'frist', { frister: [{}] })).toEqual([
      'frist_varsel_ok',
      'spesifisert_krav_ok',
      'vilkar_oppfylt',
      'frist 1.dager',
    ]);
    expect(melding(s, 'frist', { frister: [{}] })).toContain(
      'frist_varsel_ok: mangler (punkt 33.4)'
    );
  });

  it('fristen: med hvert spørsmål besvart er ingenting ubesvart, og kjernen avviser ikke svaret for et manglende svar', () => {
    const s = saken(FRISTKRAV);
    const besvart = {
      frist_varsel_ok: true,
      spesifisert_krav_ok: true,
      vilkar_oppfylt: true,
      frister: [{ dager: 20 }],
    };
    expect(ubesvart(s, 'frist', besvart)).toEqual([]);
    expect(melding(s, 'frist', besvart)).not.toContain('mangler');
  });

  it('fristen: standpunktet om at begrunnelsen ikke er et svar, besvarer spørsmålet etter § 33.6.2 uten et lag (VS-U95, VS-U88 punkt 8)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { grunnlag_varslet_i_tide: true, resultat: 'godkjent' }),
      ],
    });
    const f = s.send('BH', { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' });
    const foresporsel = ((f.data.utsagn as Data[])[0] as Data).id;
    s.send('TE', { type: 'foresporselssvar', gjelder: foresporsel, utdypning: 'Ikke kjent ennå.' });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const v = {
      frist_varsel_ok: true,
      begrunnelse_ikke_svar: true,
      vilkar_oppfylt: true,
      spesifisert_krav_ok: true,
      frister: [{ dager: 20 }],
    };
    expect(ubesvart(s, 'frist', v)).toEqual([]);
    expect(melding(s, 'frist', v)).not.toContain('mangler');
    expect(
      ubesvart(s, 'frist', { ...v, begrunnelse_ikke_svar: undefined }),
      'kontrollsak: uten standpunktet er spørsmålet ubesvart'
    ).toEqual(['foresporsel_svar_ok']);
    const lag = lagForUtkastet(utkastet(s, 'frist', v) as Svarutkast, s.u(), KJERNE.regler);
    expect(lag.standpunkter.find((x) => x.art === 'ikke_svar')).toMatchObject({
      besvart: true,
      virkning: 'uten_virkning',
    });
  });

  it('fristen: spørsmålene regelen stiller, står også når de er besvart, og er de samme som uten svar (§ 33.4, § 33.6.1, § 33.1, § 33.5, #2156)', () => {
    const s = saken(FRISTKRAV);
    const spoersmaalene = [
      'frist_varsel_ok',
      'spesifisert_krav_ok',
      'vilkar_oppfylt',
      'frist 1.dager',
    ];
    expect(stilt(s, { frister: [{}] })).toEqual(spoersmaalene);
    expect(
      stilt(s, {
        frist_varsel_ok: true,
        spesifisert_krav_ok: true,
        vilkar_oppfylt: true,
        frister: [{ dager: 20 }],
      })
    ).toEqual(spoersmaalene);
  });

  it('fristen: dagene er ubesvart til de er gitt, også når resten er besvart, og dager som er gitt, men ikke kan godtas, står ikke som ubesvart (§ 33.5)', () => {
    const s = saken(FRISTKRAV);
    const v = {
      frist_varsel_ok: true,
      spesifisert_krav_ok: true,
      vilkar_oppfylt: false,
      frister: [{}],
    };
    expect(ubesvart(s, 'frist', v)).toEqual(['frist 1.dager']);
    expect(melding(s, 'frist', v)).toContain('mangler (punkt 33.5)');
    const ugyldig = { ...v, frister: [{ dager: '20' }] };
    expect(ubesvart(s, 'frist', ugyldig)).toEqual([]);
    expect(melding(s, 'frist', ugyldig)).toContain('er ikke et helt antall dager');
  });

  it('fristen: når spesifiseringen kom for sent, er dagene byggherren måtte forstå påkrevd for hver frist (§ 33.6.1, D-5)', () => {
    const s = saken(FRISTKRAV);
    const v = {
      frist_varsel_ok: true,
      spesifisert_krav_ok: false,
      vilkar_oppfylt: true,
      frister: [{ dager: 20 }],
    };
    expect(ubesvart(s, 'frist', v)).toEqual(['frist 1.dager_maatte_forstaa']);
    expect(melding(s, 'frist', v)).toContain('dager_maatte_forstaa: mangler (punkt 33.6.1)');
    const medDagene = { ...v, frister: [{ dager: 20, dager_maatte_forstaa: 10 }] };
    expect(ubesvart(s, 'frist', medDagene)).toEqual([]);
    expect(melding(s, 'frist', medDagene)).not.toContain('mangler');
    // #2156: dagene byggherren måtte forstå er stilt også når de er gitt, og bare når
    // spesifiseringen kom for sent (VS-U4).
    expect(stilt(s, medDagene)).toEqual([
      'frist_varsel_ok',
      'spesifisert_krav_ok',
      'vilkar_oppfylt',
      'frist 1.dager',
      'frist 1.dager_maatte_forstaa',
    ]);
    expect(stilt(s, { ...v, spesifisert_krav_ok: true })).not.toContain(
      'frist 1.dager_maatte_forstaa'
    );
  });

  it('fristen: når kravet svarer på forespørselen, er spesifiseringen ikke et spørsmål, og dagene byggherren måtte forstå er ikke påkrevd (§ 33.6.2 fjerde ledd, KA-U78)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { grunnlag_varslet_i_tide: true, resultat: 'godkjent' }),
      ],
    });
    s.send('BH', { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const v = {
      frist_varsel_ok: true,
      foresporsel_svar_ok: true,
      vilkar_oppfylt: true,
      spesifisert_krav_ok: false,
      frister: [{ dager: 5 }],
    };
    expect(ubesvart(s, 'frist', v)).toEqual([]);
    const avvist = 'byggherren tar ikke stilling til spesifiseringen etter punkt 33.6.1';
    expect(melding(s, 'frist', v)).toContain(avvist);
    // KA-U78 siste setning: laget finnes ikke, så også «i tide» avvises (#1905 punkt 3).
    expect(melding(s, 'frist', { ...v, spesifisert_krav_ok: true })).toContain(avvist);
    expect(
      melding(s, 'frist', { ...v, spesifisert_krav_ok: undefined }),
      'kontrollsak: uten svar på spesifiseringen'
    ).not.toContain(avvist);
    // #2156: skjemaet leser at spørsmålet ikke stilles, også når det er besvart.
    expect(stilt(s, v)).toEqual([
      'frist_varsel_ok',
      'foresporsel_svar_ok',
      'vilkar_oppfylt',
      'frist 1.dager',
    ]);
  });

  it('vederlaget: ved en delvis godkjenning er beløpet byggherren godkjenner påkrevd (KA-U42)', () => {
    const s = saken(vederlagskravet(tilbud(100000)));
    const v = { kravposter: [{ gjelder: 'P1', aksepterer: true, vurdering: 'delvis' }] };
    expect(ubesvart(s, 'vederlag', v)).toEqual(['P1.godkjent_beloep']);
    expect(melding(s, 'vederlag', v)).toContain(
      'P1.godkjent_beloep: mangler ved delvis godkjenning'
    );
  });

  it('fristen: dager som ikke er et helt tall, er negative eller flere enn de krevde, er et svar kjernen ikke godtar, og et ubesvart spørsmål står ikke der (punkt 33.5, #2156)', () => {
    const s = saken(FRISTKRAV);
    const v = { frist_varsel_ok: true, spesifisert_krav_ok: true, vilkar_oppfylt: true };
    for (const [dager, grunn] of [
      ['20', 'er ikke et helt antall dager'],
      [2.5, 'er ikke et helt antall dager'],
      [-1, 'kan ikke være negativt'],
      [21, 'er flere enn de krevde dagene'],
    ] as const) {
      const svaret = { ...v, frister: [{ dager }] };
      expect(ugyldig(s, 'frist', svaret), String(dager)).toEqual(['frist 1.dager']);
      expect(melding(s, 'frist', svaret)).toContain(grunn);
    }
    // Kontrollsaker: de krevde dagene og 0 dager godtas, og ubesvarte dager står i `ubesvart`.
    for (const dager of [20, 0])
      expect(ugyldig(s, 'frist', { ...v, frister: [{ dager }] }), String(dager)).toEqual([]);
    expect(ugyldig(s, 'frist', { frister: [{}] })).toEqual([]);
  });

  it('fristen: dagene byggherren måtte forstå er et svar kjernen ikke godtar når de er flere enn dagene byggherren godkjenner (VS-U4, D-5, #2156)', () => {
    const s = saken(FRISTKRAV);
    const v = {
      frist_varsel_ok: true,
      spesifisert_krav_ok: false,
      vilkar_oppfylt: true,
      frister: [{ dager: 10, dager_maatte_forstaa: 11 }],
    };
    expect(ugyldig(s, 'frist', v)).toEqual(['frist 1.dager_maatte_forstaa']);
    expect(melding(s, 'frist', v)).toContain(
      'er flere enn dagene byggherren godkjenner om kravet kom i tide'
    );
    expect(
      ugyldig(s, 'frist', { ...v, frister: [{ dager: 10, dager_maatte_forstaa: 10 }] })
    ).toEqual([]);
    // Dagene som ikke kan leses, står for seg, ikke dagene byggherren måtte forstå.
    expect(
      ugyldig(s, 'frist', { ...v, frister: [{ dager: 21, dager_maatte_forstaa: 30 }] })
    ).toEqual(['frist 1.dager']);
  });

  it('fristen: når kravet svarer på forespørselen, er spesifiseringen for sent et svar kjernen ikke godtar (punkt 33.6.2 fjerde ledd, #2156)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { grunnlag_varslet_i_tide: true, resultat: 'godkjent' }),
      ],
    });
    s.send('BH', { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const v = {
      frist_varsel_ok: true,
      foresporsel_svar_ok: true,
      vilkar_oppfylt: true,
      spesifisert_krav_ok: false,
      frister: [{ dager: 5 }],
    };
    expect(ugyldig(s, 'frist', v)).toEqual(['spesifisert_krav_ok']);
    const avvist = 'byggherren tar ikke stilling til spesifiseringen etter punkt 33.6.1';
    expect(melding(s, 'frist', v)).toContain(avvist);
    // KA-U78 siste setning: laget finnes ikke, så også «i tide» avvises (#1905 punkt 3).
    expect(melding(s, 'frist', { ...v, spesifisert_krav_ok: true })).toContain(avvist);
    expect(
      melding(s, 'frist', { ...v, spesifisert_krav_ok: undefined }),
      'kontrollsak: uten svar på spesifiseringen'
    ).not.toContain(avvist);
    expect(ugyldig(s, 'frist', { ...v, spesifisert_krav_ok: undefined })).toEqual([]);
  });

  it('vederlaget: ved en delvis godkjenning er et beløp som ikke er mer enn 0 og mindre enn det krevde, et svar kjernen ikke godtar (KA-U42, #2156)', () => {
    const s = saken(vederlagskravet(tilbud(100000)));
    const delvis = (beloep: number) => ({
      kravposter: [
        { gjelder: 'P1', aksepterer: true, vurdering: 'delvis', godkjent_beloep: beloep },
      ],
    });
    for (const [beloep, grunn] of [
      [100000, 'gjelder mer enn 0 og mindre enn det krevde beløpet'],
      [0, 'gjelder mer enn 0 og mindre enn det krevde beløpet'],
      [-1, 'kan ikke være negativt'],
      [100001, 'er høyere enn det krevde beløpet'],
    ] as const) {
      expect(ugyldig(s, 'vederlag', delvis(beloep)), String(beloep)).toEqual([
        'P1.godkjent_beloep',
      ]);
      expect(melding(s, 'vederlag', delvis(beloep))).toContain(grunn);
    }
    expect(ugyldig(s, 'vederlag', delvis(50000)), 'kontrollsak').toEqual([]);
    // Et ubesvart beløp står i `ubesvart`, ikke her.
    expect(
      ugyldig(s, 'vederlag', {
        kravposter: [{ gjelder: 'P1', aksepterer: true, vurdering: 'delvis' }],
      })
    ).toEqual([]);
  });

  it('vederlaget: for posten etter § 34.1.3 annet ledd er et beløp ved en delvis godkjenning som er lik det krevde, et svar kjernen ikke godtar (KA-U42, #2156)', () => {
    const s = saken(
      vederlagskravet(tilbud(100000, { saerskilt: { produktivitet: { beloep: 40000 } } }))
    );
    const v = (beloep: number) => ({
      kravposter: [
        { gjelder: 'P1', aksepterer: true, vurdering: 'godkjent', godkjent_beloep: 100000 },
      ],
      produktivitet_vurdering: 'delvis',
      produktivitet_godkjent_beloep: beloep,
      produktivitet_varslet_i_tide: true,
    });
    expect(ugyldig(s, 'vederlag', v(40000))).toEqual(['produktivitet_godkjent_beloep']);
    expect(melding(s, 'vederlag', v(40000))).toContain(
      'gjelder mer enn 0 og mindre enn det krevde beløpet'
    );
    expect(ugyldig(s, 'vederlag', v(20000)), 'kontrollsak').toEqual([]);
  });

  /** En kravpost etter en beregningsregel, med P1 etter tilbudet først (KA-U66). */
  const medRegel = (oppgjoersform: string, rest: Data = {}) =>
    vederlagskravet({
      kravposter: [
        {
          betegnelse: 'P1',
          beskrivelse: 'Ny fundamentering',
          oppgjoersform: 'tilbud',
          beloep: 100000,
        },
        { betegnelse: 'P2', beskrivelse: 'Pumping', oppgjoersform, ...rest },
      ],
    });
  const godkjentP1 = {
    gjelder: 'P1',
    aksepterer: true,
    vurdering: 'godkjent',
    godkjent_beloep: 100000,
  };

  it('vederlaget: spørsmålene regelen stiller, står også når de er besvart: varselet etter § 34.1.2 der varslingsplikten gjelder, beløpet for en kravpost med fast sum når tilbudet ikke avslås, og oppgjørsformen (OV-U15, KA-U57 (d), KA-U66, KA-U72, #2279)', () => {
    const s = saken(vederlagskravet(tilbud(100000)), true);
    const forventet = ['hovedkrav_varslet_i_tide', 'P1.vurdering', 'P1.aksepterer'];
    expect(stiltIVederlaget(s, {})).toEqual(forventet);
    expect(
      stiltIVederlaget(s, { hovedkrav_varslet_i_tide: true, kravposter: [godkjentP1] }),
      'besvart'
    ).toEqual(forventet);
    // KA-U42: beløpet byggherren godkjenner ved en delvis godkjenning.
    expect(
      stiltIVederlaget(s, {
        kravposter: [{ gjelder: 'P1', aksepterer: true, vurdering: 'delvis' }],
      })
    ).toEqual([...forventet.slice(0, 2), 'P1.godkjent_beloep', 'P1.aksepterer']);
    // KA-U72: uten aksept av tilbudet stilles ikke beløpet, men oppgjørsformen byggherren mener.
    expect(
      stiltIVederlaget(saken(vederlagskravet(tilbud(100000))), {
        kravposter: [{ gjelder: 'P1', aksepterer: false }],
      }),
      'tilbudet avslås, og varslingsplikten gjelder ikke'
    ).toEqual(['P1.aksepterer', 'P1.oensket_oppgjoersform']);
  });

  it('vederlaget: for en kravpost etter en beregningsregel stilles ikke beløpet, men varselet etter § 34.4 og kravet om tilbud (KA-U64, KA-U66, KA-U71, #2279)', () => {
    const s = saken(medRegel('regningsarbeid'));
    expect(stiltIVederlaget(s, { kravposter: [godkjentP1, { gjelder: 'P2' }] })).toEqual([
      'P1.vurdering',
      'P1.aksepterer',
      'P2.aksepterer',
      'P2.krever_tilbud',
      'P2.varslet_i_tide',
    ]);
  });

  it('vederlaget: for posten etter § 34.1.3 annet ledd stilles beløpet, varselet og beløpet etter begrensningen når den er påberopt (OV-U23, valg 2 i #1047, #2279)', () => {
    const s = saken(
      vederlagskravet(tilbud(100000, { saerskilt: { produktivitet: { beloep: 40000 } } }))
    );
    expect(stiltIVederlaget(s, { kravposter: [godkjentP1] })).toEqual([
      'P1.vurdering',
      'P1.aksepterer',
      'produktivitet_vurdering',
      'produktivitet_varslet_i_tide',
    ]);
    expect(
      stiltIVederlaget(s, {
        kravposter: [godkjentP1],
        produktivitet_vurdering: 'godkjent',
        produktivitet_varslet_i_tide: false,
      })
    ).toEqual([
      'P1.vurdering',
      'P1.aksepterer',
      'produktivitet_vurdering',
      'produktivitet_varslet_i_tide',
      'produktivitet_begrenset_beloep',
    ]);
  });

  it('vederlaget: en oppgjørsform byggherren mener når tilbudet aksepteres, er et svar kjernen ikke godtar, i utkastet som når svaret sendes (punkt 34.2.2, arbeidsvalget i #479, #2171)', () => {
    const s = saken(vederlagskravet(tilbud(100000)));
    const v = (p1: Data) => ({ kravposter: [{ ...godkjentP1, ...p1 }] });
    const feil = v({ oensket_oppgjoersform: 'regningsarbeid' });
    expect(ugyldig(s, 'vederlag', feil)).toEqual(['P1.oensket_oppgjoersform']);
    expect(melding(s, 'vederlag', feil)).toContain('gjelder bare når tilbudet ikke aksepteres');
    expect(ugyldig(s, 'vederlag', v({})), 'kontrollsak').toEqual([]);
  });

  it('vederlaget: kravet om tilbud når byggherren godtar beregningsregelen, eller for en kravpost etter tilbudet, er et svar kjernen ikke godtar (KA-U69, KA-U71, #2171)', () => {
    const s = saken(medRegel('regningsarbeid'));
    const v = (p1: Data, p2: Data) => ({
      kravposter: [
        { ...godkjentP1, ...p1 },
        { gjelder: 'P2', ...p2 },
      ],
    });
    const godtar = v({}, { aksepterer: true, krever_tilbud: true });
    expect(ugyldig(s, 'vederlag', godtar)).toEqual(['P2.krever_tilbud']);
    expect(melding(s, 'vederlag', godtar)).toContain(
      'kan ikke stå når byggherren godtar beregningsregelen'
    );
    const tilbudet = v({ krever_tilbud: true }, { aksepterer: true });
    expect(ugyldig(s, 'vederlag', tilbudet)).toEqual(['P1.krever_tilbud']);
    expect(melding(s, 'vederlag', tilbudet)).toContain(
      'gjelder bare en kravpost etter en beregningsregel'
    );
    expect(
      ugyldig(s, 'vederlag', v({}, { aksepterer: false, krever_tilbud: true })),
      'kontrollsak'
    ).toEqual([]);
  });

  it('vederlaget: et svar på varselet etter § 34.3.3 eller § 34.4 for en kravpost etter tilbudet, og justeringen for en kravpost uten justerte enhetspriser, er svar kjernen ikke godtar (KA-U64, KA-U68, #2171)', () => {
    const s = saken(medRegel('regningsarbeid'));
    const v = (p1: Data, p2: Data) => ({
      kravposter: [
        { ...godkjentP1, ...p1 },
        { gjelder: 'P2', aksepterer: true, ...p2 },
      ],
    });
    const feil = v({ varslet_i_tide: false }, { godtar_justering: true });
    expect(ugyldig(s, 'vederlag', feil)).toEqual(['P1.varslet_i_tide', 'P2.godtar_justering']);
    expect(melding(s, 'vederlag', feil)).toContain(
      'gjelder bare varselet etter punkt 34.3.3 for justerte enhetspriser og punkt 34.4 for regningsarbeid'
    );
    expect(ugyldig(s, 'vederlag', v({}, { varslet_i_tide: false })), 'kontrollsak').toEqual([]);
  });

  it('vederlaget: «i tide» etter § 34.4 uten en innsigelse å gi opp er et svar kjernen ikke godtar, og etter innsigelsen er det oppgivelsen (VS-U63, #2278)', () => {
    const s = saken(medRegel('regningsarbeid'));
    const v = (p2: Data) => ({
      kravposter: [godkjentP1, { gjelder: 'P2', aksepterer: true, ...p2 }],
    });
    expect(ugyldig(s, 'vederlag', v({ varslet_i_tide: true }))).toEqual(['P2.varslet_i_tide']);
    expect(melding(s, 'vederlag', v({ varslet_i_tide: true }))).toContain(
      'ingen innsigelse å gi opp'
    );
    const innsigelsen = utkastet(s, 'vederlag', v({ varslet_i_tide: false }));
    s.send('BH', {
      type: 'brev',
      svar: [{ ...innsigelsen, resultat: { resultat: 'godkjent', godkjent_beloep: 100000 } }],
    });
    expect(ugyldig(s, 'vederlag', v({ varslet_i_tide: true })), 'etter innsigelsen').toEqual([]);
  });

  it('vederlaget: et svar på varselet etter § 34.1.2 når varslingsplikten ikke gjelder kategorien, er et svar kjernen ikke godtar (OV-U15, #2171)', () => {
    const s = saken(vederlagskravet(tilbud(100000)));
    const v = { hovedkrav_varslet_i_tide: true, kravposter: [godkjentP1] };
    expect(ugyldig(s, 'vederlag', v)).toEqual(['hovedkrav_varslet_i_tide']);
    expect(melding(s, 'vederlag', v)).toContain('gjelder bare svikt og andre forhold');
    expect(
      ugyldig(saken(vederlagskravet(tilbud(100000)), true), 'vederlag', v),
      'kontrollsak'
    ).toEqual([]);
  });

  it('vederlaget: et svar om posten etter § 34.1.3 annet ledd når kravet ikke har den, er et svar kjernen ikke godtar (OV-U23, OV-U26, #2171)', () => {
    const v = { kravposter: [godkjentP1], produktivitet_vurdering: 'godkjent' };
    const s = saken(vederlagskravet(tilbud(100000)));
    expect(ugyldig(s, 'vederlag', v)).toEqual(['produktivitet_vurdering']);
    expect(melding(s, 'vederlag', v)).toContain('kravet har ikke denne posten');
    expect(ugyldig(s, 'vederlag', { kravposter: [godkjentP1] }), 'kontrollsak').toEqual([]);
  });

  it('fristen: med to frister står et svar om hele kravet kjernen ikke godtar, én gang (punkt 33.6.2 fjerde ledd, #2156)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { grunnlag_varslet_i_tide: true, resultat: 'godkjent' }),
      ],
    });
    s.send('BH', { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' });
    s.send('TE', {
      ...utenFelt(FRISTKRAV, 'varsel'),
      innhold: {
        frister: [
          { navn: 'Sluttfristen', dager: 20 },
          { navn: 'Delfristen', dager: 10 },
        ],
      },
    });
    const v = {
      frist_varsel_ok: true,
      foresporsel_svar_ok: true,
      vilkar_oppfylt: true,
      spesifisert_krav_ok: false,
      frister: [{ dager: 5 }, { dager: 11 }],
    };
    expect(ugyldig(s, 'frist', v)).toEqual(['spesifisert_krav_ok', 'frist 2.dager']);
  });

  it('vederlaget: når tilbudet ikke aksepteres, gir lagene oppgjørsformen byggherren mener som ubesvart før den er valgt (arbeidsvalget i #479, #2140)', () => {
    const s = saken(vederlagskravet(tilbud(100000)));
    const v = { kravposter: [{ gjelder: 'P1', aksepterer: false }] };
    expect(ubesvart(s, 'vederlag', v)).toEqual(['P1.oensket_oppgjoersform']);
    expect(melding(s, 'vederlag', v)).toContain('oensket_oppgjoersform: mangler');
    // Standpunktet til oppgjørsformen står som ubesvart til oppgjørsformen er valgt.
    const oppgjoersformen = (vurderinger: Data) =>
      lagForUtkastet(
        utkastet(s, 'vederlag', vurderinger) as Svarutkast,
        s.u(),
        KJERNE.regler
      ).standpunkter.find((x) => x.art === 'oppgjoersform')?.besvart;
    expect(oppgjoersformen(v)).toBe(false);
    expect(
      oppgjoersformen({
        kravposter: [{ gjelder: 'P1', aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' }],
      }),
      'kontrollsak'
    ).toBe(true);
  });

  it('vederlaget: når beregningsregelen ikke godtas, gir lagene oppgjørsformen byggherren mener som ubesvart før den er valgt (arbeidsvalget i #479, #2140)', () => {
    const s = saken(
      vederlagskravet({
        kravposter: [{ betegnelse: 'P1', beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' }],
      })
    );
    const v = { kravposter: [{ gjelder: 'P1', aksepterer: false }] };
    expect(ubesvart(s, 'vederlag', v)).toEqual(['P1.oensket_oppgjoersform']);
    expect(melding(s, 'vederlag', v)).toContain('oensket_oppgjoersform: mangler');
  });

  it('vederlaget: uten svar er varselet etter § 34.1.2, beløpet og svaret på tilbudet etter § 34.2.2 påkrevd (OV-U15, KA-U57 (d))', () => {
    const s = saken(vederlagskravet(tilbud(100000)), true);
    expect(ubesvart(s, 'vederlag', {})).toEqual([
      'hovedkrav_varslet_i_tide',
      'P1.vurdering',
      'P1.aksepterer',
    ]);
    const m = melding(s, 'vederlag', {});
    expect(m).toContain('varslet_i_tide: mangler (punkt 34.1.2)');
    expect(m).toContain('P1.vurdering: mangler');
    expect(m).toContain('P1.aksepterer: mangler (punkt 34.2.2)');
  });

  it('vederlaget: varselet etter § 34.1.2 er ikke påkrevd når varslingsplikten ikke gjelder kategorien, og beløpet ikke når tilbudet ikke aksepteres (OV-U15, KA-U72)', () => {
    const s = saken(vederlagskravet(tilbud(100000)));
    const v = {
      kravposter: [{ gjelder: 'P1', aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' }],
    };
    expect(ubesvart(s, 'vederlag', v)).toEqual([]);
    expect(melding(s, 'vederlag', v)).not.toContain('mangler');
  });

  it('vederlaget: oppgjørsformen byggherren mener, er påkrevd når tilbudet ikke aksepteres (arbeidsvalget i #479)', () => {
    const s = saken(vederlagskravet(tilbud(100000)));
    const v = { kravposter: [{ gjelder: 'P1', aksepterer: false }] };
    // Lagene regnes ikke for et slikt utkast (oppfølgingen fra #2025), så regelen prøves direkte.
    expect(ubesvartIKravposten({ aksepterer: false }, { oppgjoersform: 'tilbud' })).toEqual([
      'oensket_oppgjoersform',
    ]);
    expect(melding(s, 'vederlag', v)).toContain('P1.oensket_oppgjoersform: mangler');
  });

  it('vederlaget: et spørsmål om oppgjørsformen kjernen ikke stiller for kravposten, avviser kontrollen når det besvares, og et som stilles, godtar den (KA-U57 (d), KA-U64, KA-U68, KA-U69, KA-U71, VS-U56, #2171)', () => {
    const poster = [
      { oppgjoersform: 'tilbud' },
      { oppgjoersform: 'enhetspriser' },
      { oppgjoersform: 'enhetspriser', justert: true },
      { oppgjoersform: 'regningsarbeid' },
    ] as const;
    /** Et gyldig svar på spørsmålet, med aksepten skjemaet sender sammen med det. */
    const svaret = (felt: string, post: (typeof poster)[number], aksepterer?: boolean) =>
      felt === 'oensket_oppgjoersform'
        ? {
            aksepterer,
            oensket_oppgjoersform:
              post.oppgjoersform === 'regningsarbeid' ? 'enhetspriser' : 'regningsarbeid',
          }
        : felt === 'krever_tilbud'
          ? { aksepterer: aksepterer ?? false, krever_tilbud: true }
          : { aksepterer, [felt]: felt === 'godtar_justering' };
    const avvist = (p: Record<string, unknown>, post: (typeof poster)[number]) => {
      try {
        kontrollerOppgjoersformen('P', p, post);
        return [];
      } catch (e) {
        return Object.keys((e as { feil: Record<string, string> }).feil);
      }
    };
    for (const post of poster)
      for (const aksepterer of [true, false, undefined])
        for (const felt of [
          'oensket_oppgjoersform',
          'krever_tilbud',
          'varslet_i_tide',
          'godtar_justering',
        ] as const)
          expect(
            avvist(svaret(felt, post, aksepterer), post).includes(`P.${felt}`),
            `${JSON.stringify(post)} ${String(aksepterer)} ${felt}`
          ).toBe(!stiltIKravposten({ aksepterer }, post).includes(felt));
    expect(stiltIKravposten({ aksepterer: true }, { oppgjoersform: 'tilbud' })).toEqual([
      'aksepterer',
    ]);
    expect(stiltIKravposten({}, { oppgjoersform: 'regningsarbeid' })).toEqual([
      'aksepterer',
      'krever_tilbud',
      'varslet_i_tide',
    ]);
  });

  const justert = { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true };

  it('vederlaget: med justerte enhetspriser godtatt er justeringen påkrevd, og svaret på varselet etter § 34.3.3 er det ikke (VS-U57 B, VS-U77 punkt 10 og 12, arbeidsvalg A 16.11 i #2025)', () => {
    const s = saken(vederlagskravet({ kravposter: [justert] }));
    const v = { kravposter: [{ gjelder: 'P1', aksepterer: true }] };
    expect(ubesvart(s, 'vederlag', v)).toEqual(['P1.godtar_justering']);
    expect(melding(s, 'vederlag', v)).toContain('P1.godtar_justering: mangler');
    const medJustering = {
      kravposter: [{ gjelder: 'P1', aksepterer: true, godtar_justering: true }],
    };
    expect(ubesvart(s, 'vederlag', medJustering), 'uten svar på varselet').toEqual([]);
    expect(melding(s, 'vederlag', medJustering)).not.toContain('mangler');
  });

  it('vederlaget: med kravet om tilbud etter § 34.2.1 er oppgjørsformen byggherren mener, ikke påkrevd (svar 3 A 10.11 for #1663)', () => {
    const s = saken(vederlagskravet({ kravposter: [justert] }));
    const v = { kravposter: [{ gjelder: 'P1', aksepterer: false, krever_tilbud: true }] };
    expect(ubesvart(s, 'vederlag', v)).toEqual([]);
  });

  it('vederlaget: for posten etter § 34.1.3 annet ledd er beløpet og varselet etter § 34.1.3 påkrevd', () => {
    const s = saken(
      vederlagskravet(tilbud(100000, { saerskilt: { produktivitet: { beloep: 40000 } } }))
    );
    const v = {
      kravposter: [
        { gjelder: 'P1', aksepterer: true, vurdering: 'godkjent', godkjent_beloep: 100000 },
      ],
    };
    expect(ubesvart(s, 'vederlag', v)).toEqual([
      'produktivitet_vurdering',
      'produktivitet_varslet_i_tide',
    ]);
    const m = melding(s, 'vederlag', v);
    expect(m).toContain('produktivitet_vurdering: mangler');
    expect(m).toContain('produktivitet_varslet_i_tide: mangler (punkt 34.1.3)');
  });

  it('vederlaget: når begrensningen etter § 34.1.3 er påberopt, er beløpet etter begrensningen påkrevd (valg 2 i #1047)', () => {
    const s = saken(
      vederlagskravet(tilbud(100000, { saerskilt: { produktivitet: { beloep: 40000 } } }))
    );
    const v = {
      kravposter: [
        { gjelder: 'P1', aksepterer: true, vurdering: 'godkjent', godkjent_beloep: 100000 },
      ],
      produktivitet_vurdering: 'godkjent',
      produktivitet_godkjent_beloep: 40000,
      produktivitet_varslet_i_tide: false,
    };
    expect(ubesvart(s, 'vederlag', v)).toEqual(['produktivitet_begrenset_beloep']);
    expect(melding(s, 'vederlag', v)).toContain(
      'produktivitet_begrenset_beloep: mangler (punkt 34.1.3)'
    );
    const medBeloepet = { ...v, produktivitet_begrenset_beloep: 10000 };
    expect(ubesvart(s, 'vederlag', medBeloepet)).toEqual([]);
  });
});

/**
 * #1774: utregningen og virkningene leser lagene for en kravpost etter en beregningsregel fra
 * `lagIKravposten`, og leseren kontrollerer at utregningen har like mange lag som det høyeste laget
 * i beslutningsgrunnlaget (OV-U32). Prøven går over én kravpost med fast sum, én med justerte
 * enhetspriser og én med regningsarbeid, posten etter § 34.1.3 annet ledd, påberopelsen etter
 * § 34.1.2 der den gjelder kategorien, og svaret på forholdet. Prøven utelater rigg og drift,
 * kravet om tilbud etter § 34.2.1 og en revisjon av svaret. Testen holder utregningen og virkningene
 * like. Laget for hvert standpunkt har kilden sin i testene for VS-U4, KA-U64 og KA-U72 over.
 */
describe('lagene i utregningen er lagene i beslutningsgrunnlaget (OV-U32, KA-U64, KA-U72, VS-U56, #1774)', () => {
  const sviktkravet = {
    type: 'krav',
    spor: 'forhold',
    innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
  };
  const sakMedPostene = (svikt: boolean) => {
    const s = sak();
    s.send('TE', svikt ? sviktkravet : PAABEROPELSE);
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: {
        kravposter: [
          { betegnelse: 'P1', beskrivelse: 'Fundament', oppgjoersform: 'tilbud', beloep: 100000 },
          { betegnelse: 'P2', beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true },
          { betegnelse: 'P3', beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' },
        ],
        saerskilt: { produktivitet: { beloep: 40000 } },
      },
    });
    return s;
  };
  const ja = [true, false];
  // Varslingsplikten etter § 32.2 gjelder den irregulære endringen, § 34.1.2 svikten (GR-U11).
  const tilfellene = [false, true].flatMap((svikt) =>
    (svikt ? ([null, 'avslaatt'] as const) : ([null, 'avslaatt', 'prekludert'] as const)).flatMap(
      (forholdet) => (svikt ? ja : [null]).map((hovedkrav) => ({ svikt, forholdet, hovedkrav }))
    )
  );

  it.each(tilfellene)(
    'svaret er forstått, og antallet lag i utregningen er det høyeste laget i virkningene: %o',
    ({ svikt, forholdet, hovedkrav }) => {
      const sett = new Set<number>();
      for (const p1 of ja)
        for (const [p2, varsel, justering] of ja.flatMap((a) =>
          ja.flatMap((b) => ja.map((c) => [a, b, c]))
        ))
          // VS-U63: uten en innsigelse å gi opp er standpunktet etter § 34.4 bare «for sent», eller intet.
          for (const [p3, p3Varsel] of ja.flatMap((a) => [false, undefined].map((b) => [a, b])))
            for (const produktivitet of ja) {
              const s = sakMedPostene(svikt);
              if (forholdet)
                s.send('BH', {
                  type: 'brev',
                  svar: [
                    svar(
                      'forhold',
                      s.krav('forhold'),
                      forholdet === 'avslaatt'
                        ? {
                            resultat: 'avslaatt',
                            ...(svikt ? {} : { grunnlag_varslet_i_tide: true }),
                          }
                        : { resultat: 'godkjent', grunnlag_varslet_i_tide: false }
                    ),
                  ],
                });
              const k = s.u().spor.vederlag.gjeldendeKrav!;
              const [i1, i2, i3] = kravposterI(k).map((p) => p.id);
              const v: Data = {
                ...(hovedkrav === null ? {} : { hovedkrav_varslet_i_tide: hovedkrav }),
                kravposter: [
                  p1
                    ? { gjelder: i1, aksepterer: true, vurdering: 'delvis', godkjent_beloep: 60000 }
                    : { gjelder: i1, aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' },
                  {
                    gjelder: i2,
                    aksepterer: p2,
                    ...(p2 ? {} : { oensket_oppgjoersform: 'regningsarbeid' }),
                    varslet_i_tide: varsel,
                    godtar_justering: justering,
                  },
                  {
                    gjelder: i3,
                    aksepterer: p3,
                    ...(p3 ? {} : { oensket_oppgjoersform: 'enhetspriser' }),
                    varslet_i_tide: p3Varsel,
                  },
                ],
                produktivitet_vurdering: 'delvis',
                produktivitet_godkjent_beloep: 30000,
                produktivitet_varslet_i_tide: produktivitet,
                ...(produktivitet ? {} : { produktivitet_begrenset_beloep: 10000 }),
              };
              const tilfellet = JSON.stringify(v);
              let r: ReturnType<typeof regnUtSvar>;
              try {
                r = regnUtSvar(
                  'vederlag',
                  v,
                  { krav: k, paaberopelse: s.u().spor.forhold.gjeldendeKrav },
                  KJERNE.regler
                );
              } catch (e) {
                if (!(e instanceof UgyldigVurdering)) throw e;
                expect.fail(`Utregningen avviser svaret ${tilfellet}: ${JSON.stringify(e.feil)}`);
              }
              s.send('BH', {
                type: 'brev',
                svar: [
                  svar('vederlag', k.id, v, {
                    resultat: r.resultat,
                    godkjent_beloep: r.godkjent_beloep,
                  }),
                ],
              });
              const u = s.u();
              expect(u.forstaatt, tilfellet).toBe(true);
              const sv = u.spor.vederlag.gjeldendeSvar!;
              const antall = new Set(
                (sv.utregning.poster as { lag: unknown[] }[]).map((p) => p.lag.length)
              );
              const hoeyeste = Math.max(
                1,
                ...sv.beslutningsgrunnlag.virkninger.flatMap((x) =>
                  typeof x.virkning === 'number' ? [x.virkning] : []
                )
              );
              expect([...antall], tilfellet).toEqual([hoeyeste]);
              sett.add(hoeyeste);
            }
      // § 34.1.2 åpner det første laget, og en kravpost med justerte enhetspriser kan åpne to til.
      const foerste = hovedkrav === false ? 2 : 1;
      expect(
        [...sett].sort((a, b) => a - b),
        'prøven når hvert lag'
      ).toEqual([foerste, foerste + 1, foerste + 2]);
    }
  );
});
