/**
 * Kravpostene i vederlagskravet og svaret på dem: beløpsvurderingen, svaret etter en
 * beregningsregel og punktene i totalentreprenørens krav.
 * Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { regnUtSvar } from '../frosset/utregning.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { harProduktivitetspost, kravposterI } from '../spor/vederlag/format.ts';
import { punkteneMedBegrunnelse } from '../frosset/tekst.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { P1, medP1 } from './klient.ts';
import type { Avsnitt } from '../typer.ts';
import { visning } from '../utledning/visning.ts';
import { standpunkteneTilVarslene } from '../spor/vederlag/kommando.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';
import {
  type Data,
  FORBEHOLDET,
  FRISTKRAV,
  KLAR_OVER,
  KR,
  PAABEROPELSE,
  VEDERLAG_DELVIS,
  kr,
  laast,
  p1I,
  sak,
  sakMedKrav,
  svar,
  tekst,
  tilbud,
  utenFelt,
} from './brevsak.ts';

/**
 * #1301 (VG-F-01): vurderingen og beløpet byggherren oppgir for en post, må si det samme
 * (KA-U9, B-13). OV-U58: beløpene oppgis i kroner med høyst to desimaler, og brøkdeler av
 * øre avvises før beløpskontrollen og resultatet. OV-U59: beløpene sammenliknes i hele øre.
 * Kravet i brev 5 er 150 000 kr for justeringen ellers og 40 000 kr for posten etter
 * § 34.1.3 annet ledd. Rigg og drift er ikke i formatet (#1171) og prøves i `kjerne.test.ts`.
 */
describe('beløpsvurderingen må stemme med beløpet, i hele øre (#1301, OV-U58, OV-U59)', () => {
  const sakMedPost = () => {
    const s = sakMedKrav();
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(150000, { saerskilt: { produktivitet: { beloep: 40000 } } }),
    });
    return s;
  };
  const godkjentPost = { produktivitet_vurdering: 'godkjent' };
  const godkjentHovedkrav = P1({ vurdering: 'godkjent' });
  const brevet = (s: ReturnType<typeof sak>, vurderinger: Data, resultat: Data) => ({
    type: 'brev',
    svar: [
      svar(
        'vederlag',
        s.krav('vederlag'),
        // Tilbudet er akseptert, med mindre `vurderinger` sier noe annet om P1.
        medP1(
          { produktivitet_varslet_i_tide: true, ...vurderinger },
          { aksepterer: true, ...(vurderinger.kravposter as Data[] | undefined)?.[0] }
        ),
        resultat
      ),
    ],
  });
  const fullt = { resultat: 'godkjent', godkjent_beloep: 190000 };

  /** Feltet i kommandoen for posten, foran `godkjent_beloep`. */
  const felt = { kravposten: 'P1.', produktivitet: 'produktivitet_' } as const;
  const postsvar = (
    post: keyof typeof felt,
    resten: Data,
    vurdering: string,
    beloep: number
  ): Data =>
    post === 'kravposten'
      ? medP1(resten, { vurdering, godkjent_beloep: beloep })
      : { ...resten, produktivitet_vurdering: vurdering, produktivitet_godkjent_beloep: beloep };

  it.each([
    ['kravposten', 'godkjent', 90000, godkjentPost],
    ['kravposten', 'avslaatt', 10000, godkjentPost],
    ['produktivitet', 'godkjent', 30000, godkjentHovedkrav],
    ['produktivitet', 'avslaatt', 0.01, godkjentHovedkrav],
  ] as const)(
    '«%s» vurdert «%s» med %s kr avvises med UGYLDIG_VURDERING, også når resultatet er det serveren ellers ville regnet ut',
    (post, vurdering, beloep, resten) => {
      const s = sakMedPost();
      const vurderinger = postsvar(post, resten, vurdering, beloep);
      // Resultatet serveren regnet ut før #1301, når beløpet ble oversett, og resultatet av beløpet.
      const forRetting =
        vurdering === 'godkjent'
          ? fullt
          : {
              resultat: 'delvis_godkjent',
              godkjent_beloep: post === 'kravposten' ? 40000 : 150000,
            };
      for (const resultat of [
        forRetting,
        { resultat: 'delvis_godkjent', godkjent_beloep: beloep },
      ]) {
        const a = s.avvisning('BH', brevet(s, vurderinger, resultat));
        expect(a?.regel).toBe('UGYLDIG_VURDERING');
        expect(a?.melding).toContain(
          `${felt[post]}godkjent_beloep: er ${beloep}, men vurderingen «`
        );
      }
      expect(s.u().spor.vederlag.gjeldendeSvar, 'ingenting er lagret').toBeNull();
    }
  );

  it('meldingen sier posten, vurderingen og beløpene som motsier hverandre', () => {
    const s = sakMedPost();
    expect(
      s.avvisning(
        'BH',
        brevet(
          s,
          medP1({ ...godkjentPost }, { vurdering: 'godkjent', godkjent_beloep: 90000 }),
          fullt
        )
      )?.melding
    ).toBe(
      'Vurderingene kan ikke regnes ut: P1.godkjent_beloep: er 90000, men vurderingen «godkjent» gjelder hele det krevde beløpet, 150000.'
    );
  });

  it.each([
    ['kravposten', 150000, godkjentPost, 'godkjent', 190000],
    ['kravposten', 0, godkjentPost, 'delvis_godkjent', 40000],
    ['produktivitet', 40000, godkjentHovedkrav, 'godkjent', 190000],
    ['produktivitet', 0, godkjentHovedkrav, 'delvis_godkjent', 150000],
  ] as const)(
    '«%s» vurdert «delvis» med %s kr avvises med UGYLDIG_VURDERING, også med resultatet serveren regnet ut før (KA-U42)',
    (post, beloep, resten, forRetting, sum) => {
      const s = sakMedPost();
      const vurderinger = postsvar(post, resten, 'delvis', beloep);
      const a = s.avvisning(
        'BH',
        brevet(s, vurderinger, { resultat: forRetting, godkjent_beloep: sum })
      );
      expect(a?.regel).toBe('UGYLDIG_VURDERING');
      expect(a?.melding).toContain(
        `${felt[post]}godkjent_beloep: er ${beloep}, men vurderingen «delvis» gjelder mer enn 0 og mindre enn det krevde beløpet`
      );
      expect(s.u().spor.vederlag.gjeldendeSvar, 'ingenting er lagret').toBeNull();
    }
  );

  it('kontrollsak: «delvis» med 1 øre og med 1 øre under det krevde godtas (KA-U42)', () => {
    for (const [beloep, sum] of [
      [0.01, 40000.01],
      [149999.99, 189999.99],
    ]) {
      const s = sakMedPost();
      expect(
        s.avvist(
          'BH',
          brevet(s, medP1({ ...godkjentPost }, { vurdering: 'delvis', godkjent_beloep: beloep }), {
            resultat: 'delvis_godkjent',
            godkjent_beloep: sum,
          })
        )
      ).toBeNull();
    }
  });

  it('kontrollsakene godtas: «godkjent» uten beløp, «godkjent» med beløpet likt det krevde og «avslått» med 0', () => {
    for (const hovedkrav of [
      P1({ vurdering: 'godkjent' }),
      P1({ vurdering: 'godkjent', godkjent_beloep: 150000 }),
      P1({ vurdering: 'godkjent', godkjent_beloep: 150000.0 }),
    ]) {
      const s = sakMedPost();
      expect(s.avvist('BH', brevet(s, { ...godkjentPost, ...hovedkrav }, fullt))).toBeNull();
    }
    const s = sakMedPost();
    expect(
      s.avvist(
        'BH',
        brevet(
          s,
          {
            ...godkjentHovedkrav,
            produktivitet_vurdering: 'avslaatt',
            produktivitet_godkjent_beloep: 0,
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 150000 }
        )
      )
    ).toBeNull();
  });

  it('et godkjent beløp med brøkdeler av øre avvises og rundes ikke av, heller ikke til det krevde (OV-U58)', () => {
    const s = sakMedPost();
    const delvis = (beloep: number) =>
      brevet(s, medP1({ ...godkjentPost }, { vurdering: 'delvis', godkjent_beloep: beloep }), {
        resultat: 'delvis_godkjent',
        godkjent_beloep: Math.round(beloep * 100) / 100 + 40000,
      });
    expect(s.avvisning('BH', delvis(100000.405))).toEqual({
      regel: 'UGYLDIG_VURDERING',
      melding:
        'Vurderingene kan ikke regnes ut: P1.godkjent_beloep: 100000.405 har brøkdeler av øre.',
    });
    // Rundet til hele øre ville beløpet vært det krevde, og svaret godkjent fullt uten begrunnelse.
    expect(s.avvist('BH', delvis(149999.995))).toBe('UGYLDIG_VURDERING');
    expect(s.avvist('BH', delvis(100000.4)), 'kontrollsak: 100 000 kr og 40 øre').toBeNull();
  });

  it('beløpet etter begrensningen etter § 34.1.3 med brøkdeler av øre avvises (OV-U58)', () => {
    const s = sakMedPost();
    const begrenset = (beloep: number) =>
      brevet(
        s,
        {
          ...godkjentHovedkrav,
          produktivitet_vurdering: 'godkjent',
          produktivitet_varslet_i_tide: false,
          produktivitet_begrenset_beloep: beloep,
        },
        {
          resultat: 'delvis_godkjent',
          godkjent_beloep: 150000 + beloep,
          subsidiaert_resultat: 'godkjent',
          subsidiaert_godkjent_beloep: 190000,
        }
      );
    expect(s.avvisning('BH', begrenset(10000.001))?.melding).toBe(
      'Vurderingene kan ikke regnes ut: produktivitet_begrenset_beloep: 10000.001 har brøkdeler av øre.'
    );
    expect(s.avvist('BH', begrenset(10000.01)), 'kontrollsak').toBeNull();
  });

  it('et krevd beløp med brøkdeler av øre avvises i formen, i justeringen ellers og i posten (OV-U58)', () => {
    const s = sakMedKrav();
    const krav = (innhold: Data) => ({
      type: 'krav',
      spor: 'vederlag',
      innhold,
    });
    expect(s.avvisning('TE', krav(tilbud(100000.405)))).toEqual({
      regel: 'UGYLDIG_FORM',
      melding:
        '$.innhold.kravposter[0].beloep: 100000.405 har brøkdeler av øre; beløpet oppgis i kroner med høyst to desimaler',
    });
    expect(s.avvist('TE', krav({ saerskilt: { produktivitet: { beloep: 40000.001 } } }))).toBe(
      'UGYLDIG_FORM'
    );
    const anslag = { beskrivelse: 'P2', oppgjoersform: 'enhetspriser', anslag: 5000.001 };
    expect(s.avvisning('TE', krav({ ...tilbud(100000), kravposter: [anslag] }))?.melding).toContain(
      '$.innhold.kravposter[0].anslag: 5000.001 har brøkdeler av øre'
    );
    expect(s.avvist('TE', krav(tilbud(100000.4))), 'kontrollsak: 100 000 kr og 40 øre').toBeNull();
  });
});

/**
 * Kravpostene i vederlagskravet (#1663). Kildene: OV-U115 punkt 19–22, KA-U53 (betegnelsen),
 * KA-U56 (en ny versjon tar med eller trekker hver kravpost), KA-U61 og KA-U66 (tilbud og
 * beregningsregel), VS-U48 (kravposten er varselet etter punkt 34.3.3 eller 34.4 når et slikt
 * varsel ikke er sendt før), KA-U75 (en trukket kravpost kan tas med igjen med samme betegnelse,
 * og trekket er ikke avkall) og arbeidsvalget 07.11 i domenetabellen (formatet). Brev 3 i `sakMedKrav` har P1 med fast sum 125 000 kr.
 */
describe('kravpostene i vederlagskravet (OV-U115 punkt 19–22, KA-U53, KA-U56, #1663)', () => {
  const krav = (kravposter: Data[], rest: Data = {}) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter, ...rest },
  });
  const post1 = { betegnelse: 'P1', beskrivelse: 'Ny fundamentering', oppgjoersform: 'tilbud' };
  const regning = { beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' };
  const justert = { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true };
  const poster = (s: ReturnType<typeof sakMedKrav>) =>
    kravposterI(s.u().spor.vederlag.gjeldendeKrav!).map((p) => [p.betegnelse, p.id]);

  it('en ny kravpost får neste betegnelse, og en kravpost fra forrige versjon beholder id og betegnelse (KA-U53)', () => {
    const s = sakMedKrav();
    const [[, p1]] = poster(s);
    s.send('TE', krav([{ ...post1, beloep: 130000 }, regning]));
    expect(poster(s)).toEqual([
      ['P1', p1],
      ['P2', expect.any(String)],
    ]);
  });

  it('en ny versjon som verken tar med eller trekker P1, avvises (KA-U56)', () => {
    const s = sakMedKrav();
    expect(s.avvisning('TE', krav([regning]))).toEqual({
      regel: 'KRAVPOSTENE',
      melding: 'Kravversjonen mangler P1 uten at den er trukket.',
    });
    expect(s.avvist('TE', krav([regning], { trekker: [p1I(s)] })), 'kontrollsak').toBeNull();
  });

  it('en trukket kravpost kan tas med igjen med id og betegnelse, og en ny kravpost får ikke betegnelsen til en trukket (KA-U75, KA-U53)', () => {
    const s = sakMedKrav();
    const p1 = p1I(s);
    s.send('TE', krav([regning], { trekker: [p1] }));
    expect(poster(s).map(([b]) => b)).toEqual(['P2']);
    const p2 = poster(s)[0]![1]!;
    s.send(
      'TE',
      krav([
        { ...regning, id: p2 },
        { ...post1, id: p1, beloep: 1000 },
      ])
    );
    expect(poster(s)).toEqual([
      ['P2', p2],
      ['P1', p1],
    ]);
    // En ny kravpost får P3. Den trekkes, og den neste nye kravposten får P4, selv om forrige
    // versjon bare har P2 og P1 (KA-U53).
    s.send('TE', krav([{ ...regning, id: p2 }, { ...post1, id: p1, beloep: 1000 }, justert]));
    const p3 = poster(s)[2]![1]!;
    s.send(
      'TE',
      krav(
        [
          { ...regning, id: p2 },
          { ...post1, id: p1, beloep: 1000 },
        ],
        { trekker: [p3] }
      )
    );
    s.send('TE', krav([{ ...regning, id: p2 }, { ...post1, id: p1, beloep: 1000 }, justert]));
    expect(poster(s).map(([b]) => b)).toEqual(['P2', 'P1', 'P4']);
    expect(
      s.avvist(
        'TE',
        krav([
          { ...regning, id: p2 },
          { ...post1, id: randomUUID(), beloep: 1 },
        ])
      ),
      'en kravpost som aldri har stått i sporet'
    ).toBe('KRAVPOSTENE');
  });

  it('et trekk må gjelde en kravpost i forrige versjon, og en kravpost kan ikke både tas med og trekkes (KA-U56)', () => {
    const s = sakMedKrav();
    const p1 = p1I(s);
    expect(s.avvist('TE', krav([{ ...post1, beloep: 1 }], { trekker: [randomUUID()] }))).toBe(
      'KRAVPOSTENE'
    );
    expect(s.avvist('TE', krav([{ ...post1, beloep: 1 }], { trekker: [p1] }))).toBe('KRAVPOSTENE');
  });

  it('samme kravpost kan ikke trekkes to ganger i én kravversjon (KA-U56)', () => {
    const s = sakMedKrav();
    const p1 = p1I(s);
    expect(s.avvist('TE', krav([regning], { trekker: [p1] })), 'kontrollsak').toBeNull();
    expect(s.avvist('TE', krav([regning], { trekker: [p1, p1] }))).toBe('KRAVPOSTENE');
  });

  it('en lagret kravversjon som gir P1 en annen betegnelse, gjør saken ikke forstått (MM-U2)', () => {
    const s = sakMedKrav();
    s.send('TE', krav([{ ...post1, beloep: 130000 }]));
    const lagret = s.journal
      .flatMap((r) => ((r.data as { krav?: Data[] }).krav ?? []) as Data[])
      .find((k) => k.id === s.krav('vederlag'))!;
    const p1 = (lagret.kravposter as Data[])[0]!;
    const brev = {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    };
    expect(s.avvist('BH', brev), 'kontrollsak').toBeNull();
    p1.betegnelse = 'P7';
    expect(s.avvist('BH', brev)).toBe('SAK_IKKE_FORSTAATT');
  });

  it('kravposten med regningsarbeid eller justerte enhetspriser er varselet i den første versjonen den står i, ikke i den neste (VS-U48)', () => {
    const s = sakMedKrav();
    const foerste = laast(
      s.send('TE', krav([{ ...post1, beloep: 125000 }, regning, justert]))
    ).join(' ');
    expect(foerste).toContain(
      'Totalentreprenøren krever at P2 gjøres opp som regningsarbeid etter NS 8407 punkt\u00a034.4 og punkt\u00a030. Kravet er varsel før regningsarbeidet settes i gang (NS 8407 punkt\u00a034.4).'
    );
    expect(foerste).toContain(
      'Totalentreprenøren krever at P3 gjøres opp etter kontraktens enhetspriser, justert etter NS 8407 punkt\u00a034.3.2. Kravet er varsel om justering av enhetsprisene etter NS 8407 punkt\u00a034.3.3.'
    );
    // KA-U61: brevet sier hvilke poster som er tilbud, og at de andre ikke er det.
    expect(foerste).toContain(
      'Kravet for P1 er et tilbud etter NS 8407 punkt\u00a034.2.1. P2 og P3 gjøres opp etter en beregningsregel, og kravet for dem er ikke et tilbud.'
    );
    const neste = laast(
      s.send(
        'TE',
        krav([
          { ...post1, beloep: 125000 },
          { ...regning, betegnelse: 'P2', kostnadsoverslag: 20000 },
          { ...justert, betegnelse: 'P3' },
        ])
      )
    ).join(' ');
    expect(neste).not.toContain('Kravet er varsel');
    expect(neste).toContain(
      `Kostnadsoverslaget er ${KR('20 000')} Overslaget er en opplysning og ikke et tilbud.`
    );
  });

  it('en kravpost som skifter til regningsarbeid eller justerte enhetspriser, er varselet i versjonen hun skifter i, men ikke når hun har hatt oppgjørsformen før (VS-U49)', () => {
    const s = sakMedKrav();
    const varselP1 =
      'P1 Ny fundamentering. Totalentreprenøren krever at P1 gjøres opp som regningsarbeid etter NS 8407 punkt\u00a034.4 og punkt\u00a030. Kravet er varsel før regningsarbeidet settes i gang';
    const varselP2 =
      'Totalentreprenøren krever at P2 gjøres opp som regningsarbeid etter NS 8407 punkt\u00a034.4 og punkt\u00a030. Kravet er varsel før regningsarbeidet settes i gang';
    // P1 hadde fast sum i første versjon og skifter til regningsarbeid; P2 er ny.
    const andre = laast(
      s.send(
        'TE',
        krav([{ ...regning, betegnelse: 'P1', beskrivelse: 'Ny fundamentering' }, regning])
      )
    ).join(' ');
    expect(andre).toContain(varselP1);
    expect(andre).toContain(varselP2);
    // P1 skifter tilbake til fast sum og så til regningsarbeid igjen: hun har hatt
    // oppgjørsformen før, så varselet dobles ikke.
    s.send(
      'TE',
      krav([
        { ...post1, beloep: 125000 },
        { ...regning, betegnelse: 'P2' },
      ])
    );
    const fjerde = laast(
      s.send(
        'TE',
        krav([
          { ...regning, betegnelse: 'P1', beskrivelse: 'Ny fundamentering' },
          { ...regning, betegnelse: 'P2' },
        ])
      )
    ).join(' ');
    expect(fjerde).toContain(
      'P1 Ny fundamentering. Totalentreprenøren krever at P1 gjøres opp som regningsarbeid'
    );
    expect(fjerde).not.toContain('Kravet er varsel');
    // Enhetspriser uten justering i én versjon og med justering i den neste: varselet etter
    // punkt 34.3.3 står i versjonen der justeringen kreves.
    s.send(
      'TE',
      krav([
        { ...post1, beloep: 125000 },
        { ...regning, betegnelse: 'P2' },
        { ...justert, justert: false },
      ])
    );
    const sjette = laast(
      s.send(
        'TE',
        krav([
          { ...post1, beloep: 125000 },
          { ...regning, betegnelse: 'P2' },
          { ...justert, betegnelse: 'P3' },
        ])
      )
    ).join(' ');
    expect(sjette).toContain(
      'Totalentreprenøren krever at P3 gjøres opp etter kontraktens enhetspriser, justert etter NS 8407 punkt\u00a034.3.2. Kravet er varsel om justering av enhetsprisene etter NS 8407 punkt\u00a034.3.3.'
    );
    expect(sjette).not.toContain('Kravet er varsel før regningsarbeidet');
  });

  it('enhetspriser uten justering er ikke et varsel etter punkt 34.3.3', () => {
    const s = sakMedKrav();
    const tekst = laast(
      s.send(
        'TE',
        krav([
          { ...post1, beloep: 125000 },
          { ...justert, justert: false },
        ])
      )
    ).join(' ');
    expect(tekst).toContain(
      'Totalentreprenøren krever at P2 gjøres opp etter kontraktens enhetspriser etter NS 8407 punkt\u00a034.3.1.'
    );
    expect(tekst).not.toContain('Kravet er varsel');
  });

  it('trekket av en kravpost står i brevet uten at det kalles avkall (KA-U56, KA-U75)', () => {
    const s = sakMedKrav();
    const tekst = laast(s.send('TE', krav([regning], { trekker: [p1I(s)] }))).join(' ');
    expect(tekst).toContain(
      'P1 Ny fundamentering. Totalentreprenøren trekker kravet i P1, fremsatt i brev K201-KOE-017-02 av 3. oktober 2026.'
    );
    expect(tekst).not.toContain('avkall');
  });

  it('uten flere kravposter navngir feltet for begrunnelsen ikke kravposten, og innledningen, oversikten og forbeholdet har ikke noe felt (LV-U71, KA-U53)', () => {
    expect(
      punkteneMedBegrunnelse([
        { gjelder: 'S', punkt: 'innledning', laast: 'Byggherren svarer.' },
        {
          gjelder: 'S',
          punkt: 'oversikt',
          overskrift: '1. Oversikt',
          laast: '1. Oversikt\n\nP1\t10',
        },
        {
          gjelder: 'S',
          punkt: 'P1',
          overskrift: '2. Vederlagsjustering',
          laast: '2. Vederlagsjustering\n\nByggherren godkjenner P1 med 10 kr.\n\nP1 nevnt senere.',
        },
        {
          gjelder: 'S',
          punkt: 'forbehold',
          overskrift: '3. Forbehold',
          laast: '3. Forbehold\n\nTekst.',
        },
      ])
    ).toEqual([
      { punkt: 'P1', overskrift: '2. Vederlagsjustering', foerstIPunktet: '2. Vederlagsjustering' },
    ]);
  });

  it('svaret på to kravposter med fast sum navngir kravposten i brevet og linjen, og utfallet sier hvilken kravpost som ikke har fast beløp (KA-U57 (c) og (d), KA-U72, OV-U73, svar 6 A)', () => {
    const s = sakMedKrav();
    s.send(
      'TE',
      krav([
        { ...post1, beloep: 125000 },
        { ...post1, betegnelse: 'P2', beskrivelse: 'Pumping', beloep: 40000 },
      ])
    );
    const [[, p1], [, p2]] = poster(s);
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            kravposter: [
              { gjelder: p1, vurdering: 'delvis', godkjent_beloep: 100000, aksepterer: true },
              { gjelder: p2, aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' },
            ],
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 100000 }
        ),
      ],
    });
    // KA-U72: tilbudet for P2 er ikke akseptert, og svaret tar ikke stilling til beløpet for P2,
    // så svaret har ett lag og ingen etiketter.
    // LV-U34: oppgjørsformen for hver kravpost står i «Beregningsmetode», og med flere
    // kravposter begynner punktet om beløpet med kravposten (rettingen i #1433).
    expect(laast(rad)).toEqual([
      'Byggherren svarer på totalentreprenørens krav om justering av vederlaget i brev K201-KOE-017-04 av 5. oktober 2026. Beløpene i brevet er eks. mva.',
      '1. Beregningsmetode (punkt\u00a034.2)\n\nByggherren godkjenner oppgjør som fast sum for P1 med beløpet og forbeholdene som fremgår av svaret.\n\nByggherren aksepterer ikke totalentreprenørens tilbud for P2 (NS 8407 punkt\u00a034.2.2 første ledd), og mener vederlaget for kravposten skal justeres som regningsarbeid (punkt\u00a034.4).',
      `2. Vederlagsjustering (punkt\u00a034.1.1)\n\nP1 Ny fundamentering.\n\nByggherren godkjenner ${kr('100 000')} av de krevde ${kr('125 000')}.`,
      `3. Forbehold\n\n${FORBEHOLDET}`,
    ]);
    // LV-U71, KA-U53: feltet for begrunnelsen i punktet om beløpet sier hvilken kravpost det
    // gjelder; innledningen og forbeholdet har ikke noe felt.
    expect(punkteneMedBegrunnelse(tekst(rad))).toEqual([
      {
        punkt: 'metode',
        overskrift: '1. Beregningsmetode (punkt\u00a034.2)',
        foerstIPunktet: '1. Beregningsmetode (punkt\u00a034.2)',
      },
      {
        punkt: 'P1',
        overskrift: '2. Vederlagsjustering (punkt\u00a034.1.1)',
        kravpost: 'P1 Ny fundamentering.',
        foerstIPunktet: '2. Vederlagsjustering (punkt\u00a034.1.1)',
      },
    ]);
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.linje).toBe(
      'Byggherrens standpunkt: godkjent med 100\u00a0000\u00a0kr for P1, tilbudet for P2 ikke akseptert (punkt\u00a034.2.2).'
    );
    // OV-U73: P2 har ikke fast beløp og regnes ikke med.
    const utregning = (rad.data.svar as Data[])[0].utregning as Data;
    expect(utregning).toMatchObject({ godkjent_beloep: 100000 });
    expect(utregning.subsidiaert_godkjent_beloep).toBeUndefined();
    s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    // Svar 6 A (#1663): utfallet sier at P2 ikke har fast beløp, så 100 000 kr ikke leses som
    // at P2 er avslått.
    expect(s.u().spor.vederlag.enighet?.grunnlag.utfall).toEqual({
      beloep: 100000,
      uten_fast_beloep: [p2],
    });
  });

  it('byggherren kan ikke svare med ett beløp på et krav med flere kravposter, og et beløp for en kravpost etter en beregningsregel avvises (KA-U59, OV-U115 punkt 5)', () => {
    const s = sakMedKrav();
    const svaret = () => ({
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    });
    expect(s.avvist('BH', svaret()), 'kontrollsak: bare P1 med fast sum').toBeNull();
    expect(handlinger(s.u(), 'BH'), 'kontrollsak').toContain('svare:vederlag');
    // To kravposter med fast sum: byggherren svarer per kravpost (KA-U59).
    s.send(
      'TE',
      krav([
        { ...post1, beloep: 125000 },
        { ...post1, betegnelse: 'P2', beloep: 5000 },
      ])
    );
    // Svaret tilbys, og svaret uten P2 avvises på P2.
    expect(handlinger(s.u(), 'BH')).toContain('svare:vederlag');
    expect(s.avvist('BH', svaret())).toBe('UGYLDIG_VURDERING');
    expect(s.avvisning('BH', svaret())?.melding).toContain('P2.vurdering');
    // Én kravpost etter en beregningsregel: svaret tilbys, og et beløp for posten avvises
    // (OV-U115 punkt 5).
    s.send(
      'TE',
      krav([{ ...regning, oppgjoersform: 'regningsarbeid' }], {
        trekker: poster(s).map(([, id]) => id),
      })
    );
    expect(handlinger(s.u(), 'BH')).toContain('svare:vederlag');
    const u = s.u();
    const gjeldende = u.spor.vederlag.gjeldendeKrav!;
    const [post] = kravposterI(gjeldende);
    const v = {
      kravposter: [
        { gjelder: post!.id, vurdering: 'delvis', godkjent_beloep: 100000, aksepterer: true },
      ],
    };
    const feilen = (f: () => unknown) => {
      try {
        f();
      } catch (e) {
        return e instanceof UgyldigVurdering ? e.feil : e;
      }
      return null;
    };
    const grunn =
      'kravposten følger en beregningsregel, og svaret godkjenner ikke noe beløp for den';
    expect(
      feilen(() =>
        regnUtSvar(
          'vederlag',
          v,
          { krav: gjeldende, paaberopelse: u.spor.forhold.gjeldendeKrav },
          KJERNE.regler
        )
      )
    ).toEqual({
      [`${post!.betegnelse}.vurdering`]: grunn,
      [`${post!.betegnelse}.godkjent_beloep`]: grunn,
    });
  });
});

describe('svaret på en kravpost etter en beregningsregel (KA-U54, KA-U64, KA-U68, KA-U69, KA-U71, OV-U115 punkt 5, #1663)', () => {
  const krav = (kravposter: Data[], rest: Data = {}) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter, ...rest },
  });
  const regning = { beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' };
  const justert = { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true };
  /** Saken der vederlagskravet bare har kravpostene `kravposter`, P2 og videre (P1 er trukket). */
  const sakMed = (...kravposter: Data[]) => {
    const s = sakMedKrav();
    s.send('TE', krav(kravposter, { trekker: [p1I(s)] }));
    return s;
  };
  /** Svaret med vurderingene for kravpostene etter betegnelse, og utregningen fra regelen. */
  const svaret = (s: ReturnType<typeof sakMedKrav>, svarene: Record<string, Data>) => {
    const u = s.u();
    const k = u.spor.vederlag.gjeldendeKrav!;
    const v = {
      kravposter: kravposterI(k).map((p) => ({ gjelder: p.id, ...svarene[p.betegnelse] })),
    };
    let resultat: Data = {};
    try {
      const r = regnUtSvar(
        'vederlag',
        v,
        { krav: k, paaberopelse: u.spor.forhold.gjeldendeKrav },
        KJERNE.regler
      );
      resultat = { resultat: r.resultat, godkjent_beloep: r.godkjent_beloep };
    } catch (e) {
      if (!(e instanceof UgyldigVurdering)) throw e;
    }
    return { type: 'brev', svar: [svar('vederlag', k.id, v, resultat)] };
  };
  const gjeldende = (s: ReturnType<typeof sakMedKrav>) => s.u().spor.vederlag.gjeldendeSvar!;
  /** Laget hvert standpunkt står i, etter arten og hjemmelen. */
  const lagene = (s: ReturnType<typeof sakMedKrav>) => {
    const sv = gjeldende(s);
    const virkning = new Map(
      sv.beslutningsgrunnlag.virkninger.map((v) => [v.standpunkt, v.virkning])
    );
    return sv.standpunkter.map((p) => [
      p.art === 'rettidighet' ? `${p.art} ${p.hjemmel}` : p.art,
      virkning.get(p.id),
    ]);
  };

  it('byggherren som godtar beregningsregelen, tar ikke stilling til et beløp, og svaret faller sammen med kravet (OV-U115 punkt 5, HF-U28)', () => {
    const s = sakMed(regning);
    expect(
      s.avvist('BH', svaret(s, { P2: { aksepterer: true, vurdering: 'godkjent' } })),
      'et beløp for posten avvises'
    ).toBe('UGYLDIG_VURDERING');
    const rad = s.send('BH', svaret(s, { P2: { aksepterer: true } }));
    const sv = gjeldende(s);
    expect(sv.standpunkter.find((p) => p.art === 'oppgjoersform')).toMatchObject({
      hjemmel: '34.4',
      aksepterer: true,
    });
    expect(sv.utregning.poster).toEqual([{ gjelder: expect.any(String), lag: [{ lag: 1 }] }]);
    expect(sv.beslutningsgrunnlag.sammenfall, 'D-17: enig i beregningsregelen').toBe(true);
    expect(laast(rad).join(' ')).toContain(
      'Byggherren godtar at vederlaget justeres som regningsarbeid (NS 8407 punkt\u00a034.4). Det godkjenner ikke mengder, priser, kostnader eller noe beløp.'
    );
  });

  it('byggherren som mener den andre beregningsregelen, må oppgi den, og kan ikke mene den TE krever (OV-U115 punkt 1 og 5)', () => {
    const s = sakMed(regning);
    expect(s.avvisning('BH', svaret(s, { P2: { aksepterer: false } }))?.melding).toContain(
      'P2.oensket_oppgjoersform: mangler når beregningsregelen ikke godtas'
    );
    expect(
      s.avvisning(
        'BH',
        svaret(s, { P2: { aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' } })
      )?.melding
    ).toContain('P2.oensket_oppgjoersform: er oppgjørsformen totalentreprenøren krever');
    const rad = s.send(
      'BH',
      svaret(s, { P2: { aksepterer: false, oensket_oppgjoersform: 'enhetspriser' } })
    );
    expect(gjeldende(s).utregning.resultat, 'HF-U5').toBe('delvis_godkjent');
    expect(gjeldende(s).beslutningsgrunnlag.sammenfall).toBe(false);
    expect(laast(rad).join(' ')).toContain(
      'Byggherren godtar ikke at vederlaget justeres som regningsarbeid (NS 8407 punkt\u00a034.4), og mener det skal justeres etter enhetspriser (punkt\u00a034.3).'
    );
  });

  it('kravet om tilbud kan ikke stå sammen med en godtatt beregningsregel, og oppgjørsformen byggherren mener er da valgfri (KA-U71, svar 3 A 10.11)', () => {
    const s = sakMed(regning);
    expect(
      s.avvisning('BH', svaret(s, { P2: { aksepterer: true, krever_tilbud: true } }))?.melding
    ).toContain('P2.krever_tilbud: kan ikke stå når byggherren godtar beregningsregelen');
    const rad = s.send('BH', svaret(s, { P2: { aksepterer: false, krever_tilbud: true } }));
    expect(gjeldende(s).standpunkter.find((p) => p.art === 'oppgjoersform')).toEqual({
      id: expect.any(String),
      art: 'oppgjoersform',
      gjelder: expect.any(String),
      hjemmel: '34.4',
      aksepterer: false,
      kreverTilbud: true,
    });
    expect(gjeldende(s).beslutningsgrunnlag.sammenfall, 'KA-U71').toBe(false);
    expect(laast(rad).join(' ')).toContain(
      'Byggherren godtar ikke at vederlaget justeres som regningsarbeid (NS 8407 punkt\u00a034.4). Byggherren krever at totalentreprenøren gir et spesifisert tilbud for kravposten (punkt\u00a034.2.1 første ledd).'
    );
  });

  it('kravet om tilbud gjelder ikke en kravpost med fast sum (KA-U69)', () => {
    const s = sakMedKrav();
    const k = s.u().spor.vederlag.gjeldendeKrav!;
    const v = {
      kravposter: [
        {
          gjelder: kravposterI(k)[0]!.id,
          aksepterer: false,
          oensket_oppgjoersform: 'regningsarbeid',
          krever_tilbud: true,
        },
      ],
    };
    expect(
      s.avvisning('BH', { type: 'brev', svar: [svar('vederlag', k.id, v)] })?.melding
    ).toContain('P1.krever_tilbud: gjelder bare en kravpost etter en beregningsregel');
  });

  it('innsigelsen etter punkt 34.3.3 åpner et lag for justeringen, og avviser ikke hele kravet (VS-U4, KA-U64, arbeidsvalg 1 punkt 4)', () => {
    const s = sakMed(justert);
    expect(
      s.avvisning('BH', svaret(s, { P2: { aksepterer: true } }))?.melding,
      'KA-U68: justeringen mangler'
    ).toContain('P2.godtar_justering: mangler');
    const rad = s.send(
      'BH',
      svaret(s, { P2: { aksepterer: true, varslet_i_tide: false, godtar_justering: true } })
    );
    expect(lagene(s)).toEqual([
      ['oppgjoersform', 'upaavirket'],
      ['rettidighet 34.3.3', 1],
      ['justering', 2],
      ['beloep', 2],
    ]);
    expect(gjeldende(s).utregning.poster).toEqual([
      { gjelder: expect.any(String), lag: [{ lag: 1 }, { lag: 2 }] },
    ]);
    expect(gjeldende(s).utregning.resultat, 'ikke prekludert, uten fast beløp').toBe(
      'delvis_godkjent'
    );
    expect(gjeldende(s).beslutningsgrunnlag.sammenfall, 'D-17').toBe(false);
    const brevet = laast(rad).join(' ');
    expect(brevet).toContain(
      'Prinsipalt\n\nByggherren gjør gjeldende at varselet om justering av enhetsprisene etter punkt\u00a034.3.3 første ledd for P2 kom for sent, og at totalentreprenøren bare har krav på den justeringen av enhetsprisene byggherren måtte forstå at forholdet ville føre til.'
    );
    expect(brevet).toContain(
      // Innsigelsen står i samme punkt, så lagslinjen viser ikke til punktet selv (#1858).
      'Subsidiært, hvis innsigelsen ovenfor ikke fører frem\n\nByggherren godtar at enhetsprisene for P2 justeres (punkt\u00a034.3.2).'
    );
  });

  it('byggherren som mener regningsarbeid, kan subsidiært gjøre gjeldende at varselet etter punkt 34.3.3 kom for sent, og videre subsidiært bestride justeringen (VS-U56)', () => {
    const s = sakMed(justert);
    s.send(
      'BH',
      svaret(s, {
        P2: {
          aksepterer: false,
          oensket_oppgjoersform: 'regningsarbeid',
          varslet_i_tide: false,
          godtar_justering: false,
        },
      })
    );
    expect(lagene(s)).toEqual([
      ['oppgjoersform', 1],
      ['rettidighet 34.3.3', 2],
      ['justering', 3],
      ['beloep', 3],
    ]);
    expect(gjeldende(s).utregning.poster).toEqual([
      { gjelder: expect.any(String), lag: [{ lag: 1 }, { lag: 2 }, { lag: 3 }] },
    ]);
    // Ordlyden i linjen er design; at hvert standpunkt står i linjen med TEs oppgjørsform som
    // hjemmel, er KA-U54 og KA-U68.
    expect(gjeldende(s).beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: prinsipalt beregningsregelen ikke godtatt (punkt\u00a034.3), subsidiært varselet etter punkt\u00a034.3.3 kom for sent, videre subsidiært justeringen av enhetsprisene bestridt (punkt\u00a034.3.2).'
    );
  });

  it('standpunktet til varselet etter punkt 34.4 får ingen virkning og åpner ikke et lag, men gir ikke sammenfall (KA-U64, D-17)', () => {
    const s = sakMed(regning);
    const rad = s.send('BH', svaret(s, { P2: { aksepterer: true, varslet_i_tide: false } }));
    expect(lagene(s)).toEqual([
      ['oppgjoersform', 1],
      ['rettidighet 34.4', 'uten_virkning'],
      ['beloep', 1],
    ]);
    expect(gjeldende(s).beslutningsgrunnlag.sammenfall).toBe(false);
    // OV-U32: standpunktet uten virkning står uten etikett, foran lagene i punktet.
    expect(laast(rad).join(' ')).toContain(
      'Beregningsmetode (punkt\u00a034.2)\n\nByggherren gjør gjeldende at varselet om regningsarbeid etter NS 8407 punkt\u00a034.4 for P2 ikke ble gitt eller kom for sent.'
    );
  });

  it('VS-U63: «i tide» etter punkt 34.4 avvises når byggherren ikke har gjort gjeldende at varselet for posten ikke ble gitt eller kom for sent', () => {
    const s = sakMed(regning, { ...regning, beskrivelse: 'Lensing' });
    expect(
      s.avvisning(
        'BH',
        svaret(s, { P2: { aksepterer: true, varslet_i_tide: true }, P3: { aksepterer: true } })
      )?.melding,
      'første svar'
    ).toContain(
      'P2.varslet_i_tide: byggherren har ikke gjort gjeldende at varselet etter punkt 34.4 for kravposten ikke ble gitt eller kom for sent'
    );
    s.send(
      'BH',
      svaret(s, {
        P2: { aksepterer: true, varslet_i_tide: false },
        P3: { aksepterer: true },
      })
    );
    expect(
      s.avvisning('BH', {
        type: 'revisjon',
        erstatter: gjeldende(s).id,
        svar: svaret(s, {
          P2: { aksepterer: true },
          P3: { aksepterer: true, varslet_i_tide: true },
        }).svar[0],
      })?.melding,
      'innsigelsen mot P2 gjelder ikke P3'
    ).toContain('P3.varslet_i_tide: byggherren har ikke gjort gjeldende');
  });

  it('VS-U63: har byggherren gjort gjeldende at varselet etter punkt 34.4 ikke ble gitt eller kom for sent, er «i tide» at innsigelsen gis opp, og brevet sier det', () => {
    const s = sakMed(regning);
    s.send('BH', svaret(s, { P2: { aksepterer: true, varslet_i_tide: false } }));
    const oppgivelse = () => ({
      type: 'revisjon',
      erstatter: gjeldende(s).id,
      svar: svaret(s, { P2: { aksepterer: true, varslet_i_tide: true } }).svar[0],
    });
    const rad = s.send('BH', oppgivelse());
    // VS-U77 punkt 10: brevet sier hvilken innsigelse som gis opp.
    expect(laast(rad).join(' ')).toMatch(
      /Byggherren gir opp innsigelsen i brev .+? om at varselet om regningsarbeid etter NS 8407 punkt\u00a034\.4 for P2 ikke ble gitt eller kom for sent\./
    );
    // VS-U77 punkt 31: innsigelsen er gitt opp, så det er ingen å gi opp igjen.
    expect(s.avvisning('BH', oppgivelse())?.melding ?? '', 'etter oppgivelsen').toContain(
      'P2.varslet_i_tide: byggherren har ikke gjort gjeldende'
    );
  });

  it('VS-U63: et svar som ikke sier noe om varselet etter punkt 34.4, gir ikke opp innsigelsen (VS-U77 punkt 9 og 12)', () => {
    const s = sakMed(regning);
    s.send('BH', svaret(s, { P2: { aksepterer: true, varslet_i_tide: false } }));
    s.send('BH', {
      type: 'revisjon',
      erstatter: gjeldende(s).id,
      svar: svaret(s, { P2: { aksepterer: true } }).svar[0],
    });
    expect(
      s.avvisning('BH', {
        type: 'revisjon',
        erstatter: gjeldende(s).id,
        svar: svaret(s, { P2: { aksepterer: true, varslet_i_tide: true } }).svar[0],
      })
    ).toBeNull();
  });

  it('VS-U63: en innsigelse etter punkt 34.4 i et svar lagt til utenfor rekken står, også når et svar fra løsningen sendt senere ikke sier noe (VS-U77 punkt 12, OV-U103)', () => {
    const s = sakMed(regning);
    s.send('BH', svaret(s, { P2: { aksepterer: true } }));
    const senere = gjeldende(s).id;
    const innsigelsen = svaret(s, { P2: { aksepterer: true, varslet_i_tide: false } }).svar[0]!;
    s.send('BH', {
      type: 'brev',
      svar: [utenFelt(utenFelt(innsigelsen, 'utdypning'), 'utdypninger')],
      sendt: '2026-10-05',
      ...SOM_BREV,
      dokumentasjon: [randomUUID()],
    });
    expect(s.u().spor.vederlag.svarUtenforRekken, 'forutsetning').toHaveLength(1);
    expect(gjeldende(s).id, 'forutsetning').toBe(senere);
    expect(
      s.avvisning('BH', {
        type: 'revisjon',
        erstatter: senere,
        svar: svaret(s, { P2: { aksepterer: true, varslet_i_tide: true } }).svar[0],
      })
    ).toBeNull();
  });

  it('VS-U63: byggherrens siste standpunkt etter punkt 34.4 er det sist sendte, også når et eldre svar legges til senere (OV-U98, VS-U77 punkt 12)', () => {
    const s = sakMed(regning);
    s.send('BH', svaret(s, { P2: { aksepterer: true, varslet_i_tide: false } }));
    const oppgivelse = () => ({
      type: 'revisjon',
      erstatter: gjeldende(s).id,
      svar: svaret(s, { P2: { aksepterer: true, varslet_i_tide: true } }).svar[0],
    });
    s.send('BH', oppgivelse());
    const eldre = svaret(s, { P2: { aksepterer: true, varslet_i_tide: false } }).svar[0]!;
    s.send('BH', {
      type: 'brev',
      svar: [utenFelt(utenFelt(eldre, 'utdypning'), 'utdypninger')],
      sendt: '2026-10-05',
      ...SOM_BREV,
      dokumentasjon: [randomUUID()],
    });
    expect(
      s.avvisning('BH', oppgivelse())?.melding ?? '',
      'oppgitt etter det eldre svaret'
    ).toContain('P2.varslet_i_tide: byggherren har ikke gjort gjeldende');
  });

  it('VS-U63: gjentar et svar lagt til innsigelsen etter punkt 34.4 og gir et annet sendt samme dag den opp, er rekkefølgen ukjent, og innsigelsen kan gis opp (OV-U104)', () => {
    const utfall = (medGjentakelsen: boolean) => {
      const s = sakMed(regning);
      s.send('BH', svaret(s, { P2: { aksepterer: true, varslet_i_tide: false } }));
      const p2 = kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[0]!.id;
      s.send('TE', krav([{ ...regning, id: p2 }]));
      s.send('BH', svaret(s, { P2: { aksepterer: true } }));
      const lagtTil = (iTide: boolean) => {
        const sv = svaret(s, { P2: { aksepterer: true, varslet_i_tide: iTide } }).svar[0]!;
        s.send('BH', {
          type: 'brev',
          svar: [utenFelt(utenFelt(sv, 'utdypning'), 'utdypninger')],
          sendt: '2026-10-07',
          ...SOM_BREV,
          dokumentasjon: [randomUUID()],
        });
      };
      if (medGjentakelsen) lagtTil(false);
      lagtTil(true);
      expect(s.u().spor.vederlag.svarUtenforRekken, 'forutsetning').toHaveLength(
        medGjentakelsen ? 2 : 1
      );
      return s.avvisning('BH', {
        type: 'revisjon',
        erstatter: gjeldende(s).id,
        svar: svaret(s, { P2: { aksepterer: true, varslet_i_tide: true } }).svar[0],
      });
    };
    expect(utfall(true)).toBeNull();
    expect(utfall(false)?.melding ?? '', 'kontrollsak: oppgivelsen uten gjentakelsen').toContain(
      'P2.varslet_i_tide: byggherren har ikke gjort gjeldende'
    );
  });

  it('standpunktet til varselet og justeringen gjelder bare kravposter som har dem (KA-U64, KA-U68)', () => {
    const s = sakMed(regning);
    expect(
      s.avvisning('BH', svaret(s, { P2: { aksepterer: true, godtar_justering: true } }))?.melding
    ).toContain('P2.godtar_justering: gjelder bare en kravpost med justerte enhetspriser');
    const t = sakMedKrav();
    const k = t.u().spor.vederlag.gjeldendeKrav!;
    const v = {
      kravposter: [
        {
          gjelder: kravposterI(k)[0]!.id,
          aksepterer: true,
          vurdering: 'godkjent',
          varslet_i_tide: true,
        },
      ],
    };
    expect(
      t.avvisning('BH', { type: 'brev', svar: [svar('vederlag', k.id, v)] })?.melding
    ).toContain('P1.varslet_i_tide: gjelder bare varselet etter punkt 34.3.3');
  });

  /** Saken der vederlagskravet har P1 med fast sum og kravpostene `kravposter`, P2 og videre. */
  const sakMedP1 = (...kravposter: Data[]) => {
    const s = sakMedKrav();
    s.send('TE', krav([...(tilbud(125000).kravposter as Data[]), ...kravposter]));
    return s;
  };

  it('en kravpost som verken beregningsregelen byggherren ikke godtar eller innsigelsene for den rammer, er upåvirket (arbeidsvalg 1 punkt 2, OV-U33, OV-U32)', () => {
    const s = sakMedP1(justert);
    s.send(
      'BH',
      svaret(s, {
        P1: { aksepterer: true, vurdering: 'godkjent' },
        P2: {
          aksepterer: false,
          oensket_oppgjoersform: 'regningsarbeid',
          varslet_i_tide: true,
          godtar_justering: false,
        },
      })
    );
    expect(lagene(s)).toEqual([
      ['oppgjoersform', 'upaavirket'],
      ['beloep', 'upaavirket'],
      ['oppgjoersform', 1],
      ['rettidighet 34.3.3', 'uten_virkning'],
      ['justering', 2],
      ['beloep', 2],
    ]);
    expect(gjeldende(s).beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: godkjent med 125\u00a0000\u00a0kr for P1, prinsipalt beregningsregelen for P2 ikke godtatt (punkt\u00a034.3), subsidiært justeringen av enhetsprisene for P2 bestridt (punkt\u00a034.3.2).'
    );
  });

  it('linjen nevner innsigelsen etter punkt 34.3.3 ved kravposten og i laget den står i (KA-U64, VS-U56, OV-U32)', () => {
    const s = sakMedP1(justert, { ...justert, beskrivelse: 'Avstivning' });
    s.send(
      'BH',
      svaret(s, {
        P1: { aksepterer: true, vurdering: 'godkjent' },
        P2: { aksepterer: true, varslet_i_tide: false, godtar_justering: true },
        P3: { aksepterer: false, oensket_oppgjoersform: 'regningsarbeid', varslet_i_tide: false },
      })
    );
    expect(lagene(s)).toEqual([
      ['oppgjoersform', 'upaavirket'],
      ['beloep', 'upaavirket'],
      ['oppgjoersform', 'upaavirket'],
      ['rettidighet 34.3.3', 1],
      ['justering', 2],
      ['beloep', 2],
      ['oppgjoersform', 1],
      ['rettidighet 34.3.3', 2],
      ['beloep', 2],
    ]);
    expect(gjeldende(s).beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: godkjent med 125\u00a0000\u00a0kr for P1, prinsipalt varselet etter punkt\u00a034.3.3 for P2 kom for sent, beregningsregelen for P3 ikke godtatt (punkt\u00a034.3), subsidiært varselet etter punkt\u00a034.3.3 for P3 kom for sent.'
    );
  });

  it('et tilbud byggherren ikke aksepterer, rammer bare sin egen kravpost, i det første laget og uten et eget lag, og de andre er upåvirket (arbeidsvalget 10.11 i #1760, KA-U72, OV-U33)', () => {
    const s = sakMedP1({ beskrivelse: 'Rør', oppgjoersform: 'tilbud', beloep: 25000 });
    s.send(
      'BH',
      svaret(s, {
        P1: { aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' },
        P2: { aksepterer: true, vurdering: 'godkjent' },
      })
    );
    expect(lagene(s)).toEqual([
      ['oppgjoersform', 1],
      ['beloep', 1],
      ['oppgjoersform', 'upaavirket'],
      ['beloep', 'upaavirket'],
    ]);
    expect(s.u().forstaatt, JSON.stringify(s.u().begrensninger)).toBe(true);
  });

  it('et lagret svar med et beløp for en kravpost etter en beregningsregel er ikke forstått, også uten standpunktet til oppgjørsformen (OV-U115 punkt 5)', () => {
    const s = sakMed(regning);
    const sv = (s.send('BH', svaret(s, { P2: { aksepterer: true } })).data.svar as Data[])[0]!;
    expect(s.u().forstaatt, 'kontrollsak').toBe(true);
    const beloepet = (sv.standpunkter as Data[]).find((p) => p.art === 'beloep')!;
    sv.standpunkter = [{ ...beloepet, beloep: 5000 }];
    sv.utregning = {
      resultat: 'godkjent',
      godkjent_beloep: 5000,
      poster: [{ gjelder: beloepet.gjelder, lag: [{ lag: 1, beloep: 5000 }] }],
    };
    const grunnlag = sv.beslutningsgrunnlag as Data;
    grunnlag.virkninger = (grunnlag.virkninger as Data[]).filter(
      (v) => v.standpunkt === beloepet.id
    );
    const u = s.u();
    expect(u.forstaatt).toBe(false);
    expect(u.begrensninger.map((b) => b.grunn)).toEqual([
      'standpunktet til beløpet har et beløp for en kravpost etter en beregningsregel',
    ]);
  });

  it('godtar byggherren ikke lenger justeringen av enhetsprisene i et nytt svar, viser visningen det tidligere svaret og punkt 34.3.3 annet ledd (HF-U29 punkt 8, HF-U33)', () => {
    const s = sakMed(justert);
    s.send('BH', svaret(s, { P2: { aksepterer: true, godtar_justering: true } }));
    const tidligere = gjeldende(s).id;
    const ny = svaret(s, { P2: { aksepterer: true, godtar_justering: false } });
    s.send('BH', { type: 'revisjon', erstatter: tidligere, svar: (ny.svar as Data[])[0] });
    const p2 = kravposterI(s.u().spor.vederlag.gjeldendeKrav!).find((p) => p.betegnelse === 'P2')!;
    expect(visning(s.u(), KJERNE.regler).spor.vederlag.senkning).toEqual({
      tidligereSvar: tidligere,
      senket: [],
      justeringIkkeGodtatt: [p2.id],
      bestemmelse: '34.3.3',
    });
  });

  it('godtar byggherren justeringen av enhetsprisene bare subsidiært i et nytt svar, er det en senkning (HF-U32, HF-U33)', () => {
    const s = sakMed(justert);
    s.send('BH', svaret(s, { P2: { aksepterer: true, godtar_justering: true } }));
    const ny = svaret(s, {
      P2: { aksepterer: true, varslet_i_tide: false, godtar_justering: true },
    });
    s.send('BH', { type: 'revisjon', erstatter: gjeldende(s).id, svar: (ny.svar as Data[])[0] });
    expect(visning(s.u(), KJERNE.regler).spor.vederlag.senkning).toMatchObject({
      justeringIkkeGodtatt: [kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[0]!.id],
      bestemmelse: '34.3.3',
    });
  });

  it('avslår byggherren i et nytt svar justeringen av enhetsprisene som var godtatt subsidiært, er det en senkning (HF-U32, HF-U33)', () => {
    const s = sakMed(justert);
    const sent = (godtar: boolean) =>
      svaret(s, { P2: { aksepterer: true, varslet_i_tide: false, godtar_justering: godtar } });
    s.send('BH', sent(true));
    s.send('BH', {
      type: 'revisjon',
      erstatter: gjeldende(s).id,
      svar: (sent(false).svar as Data[])[0],
    });
    expect(visning(s.u(), KJERNE.regler).spor.vederlag.senkning?.justeringIkkeGodtatt).toEqual([
      kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[0]!.id,
    ]);
  });

  it('godtar byggherren justeringen igjen i et nytt svar, er ingenting senket (kontrollsak, HF-U29 punkt 8)', () => {
    const s = sakMed(justert);
    s.send('BH', svaret(s, { P2: { aksepterer: true, godtar_justering: false } }));
    const ny = svaret(s, { P2: { aksepterer: true, godtar_justering: true } });
    s.send('BH', { type: 'revisjon', erstatter: gjeldende(s).id, svar: (ny.svar as Data[])[0] });
    expect(visning(s.u(), KJERNE.regler).spor.vederlag.senkning).toBeNull();
  });

  describe('byggherrens siste standpunkt til varselet for kravposten (VS-U77 punkt 8–13, 30 og 31, #2177)', () => {
    const revisjon = (s: ReturnType<typeof sakMedKrav>, svarene: Record<string, Data>) => ({
      type: 'revisjon',
      erstatter: gjeldende(s).id,
      svar: (svaret(s, svarene).svar as Data[])[0],
    });
    /** Standpunktet til varselet for kravpostene etter betegnelse, med brevet det står i. */
    const standpunktene = (s: ReturnType<typeof sakMedKrav>) => {
      const u = s.u();
      const betegnelse = new Map(
        kravposterI(u.spor.vederlag.gjeldendeKrav!).map((p) => [p.id, p.betegnelse])
      );
      return standpunkteneTilVarslene(u, null).map((x) => ({
        post: betegnelse.get(x.gjelder),
        hjemmel: x.hjemmel,
        iTide: x.iTide,
        dokument: x.dokument,
      }));
    };

    it('et svar som ikke sier noe om varselet etter punkt 34.3.3, endrer ikke innsigelsen fra svaret før (VS-U77 punkt 9 og 12)', () => {
      const s = sakMed(justert);
      s.send(
        'BH',
        svaret(s, { P2: { aksepterer: true, varslet_i_tide: false, godtar_justering: true } })
      );
      const foer = gjeldende(s).dokument;
      s.send('BH', revisjon(s, { P2: { aksepterer: true, godtar_justering: true } }));
      expect(standpunktene(s)).toEqual([
        { post: 'P2', hjemmel: '34.3.3', iTide: false, dokument: foer },
      ]);
    });

    it('et svar som ikke sier noe om varselet der innsigelsen står, gir ikke sammenfall (VS-U77 punkt 9 og 12, OV-U115 punkt 25, #2316)', () => {
      const s = sakMed(justert);
      s.send(
        'BH',
        svaret(s, { P2: { aksepterer: true, varslet_i_tide: false, godtar_justering: true } })
      );
      expect(gjeldende(s).beslutningsgrunnlag.sammenfall, 'innsigelsen i svaret').toBe(false);
      s.send('BH', revisjon(s, { P2: { aksepterer: true, godtar_justering: true } }));
      expect(gjeldende(s).beslutningsgrunnlag.sammenfall, 'taus om varselet').toBe(false);
      expect(s.u().forstaatt, 'utledningen godtar brevet').toBe(true);
      // Kontrollsak: når innsigelsen er gitt opp, faller et svar som ikke sier noe om varselet,
      // sammen med kravet.
      s.send(
        'BH',
        revisjon(s, { P2: { aksepterer: true, varslet_i_tide: true, godtar_justering: true } })
      );
      s.send('BH', revisjon(s, { P2: { aksepterer: true, godtar_justering: true } }));
      expect(gjeldende(s).beslutningsgrunnlag.sammenfall, 'innsigelsen er gitt opp').toBe(true);
      expect(s.u().forstaatt).toBe(true);
    });

    it('et svar som ikke sier noe om varselet etter punkt 34.4 der innsigelsen står, gir ikke sammenfall (VS-U77 punkt 9, 12 og 31, #2316)', () => {
      const s = sakMed(regning);
      s.send('BH', svaret(s, { P2: { aksepterer: true, varslet_i_tide: false } }));
      s.send('BH', revisjon(s, { P2: { aksepterer: true } }));
      expect(gjeldende(s).beslutningsgrunnlag.sammenfall).toBe(false);
      // Kontrollsak: uten en innsigelse fra før faller samme svar sammen med kravet.
      const t = sakMed(regning);
      t.send('BH', svaret(t, { P2: { aksepterer: true } }));
      t.send('BH', revisjon(t, { P2: { aksepterer: true } }));
      expect(gjeldende(t).beslutningsgrunnlag.sammenfall).toBe(true);
    });

    it('«i tide» etter punkt 34.3.3 står mot et senere svar som ikke sier noe om varselet (VS-U77 punkt 8 og 30)', () => {
      const s = sakMed(justert);
      s.send(
        'BH',
        svaret(s, { P2: { aksepterer: true, varslet_i_tide: true, godtar_justering: true } })
      );
      const foer = gjeldende(s).dokument;
      s.send('BH', revisjon(s, { P2: { aksepterer: true, godtar_justering: true } }));
      expect(standpunktene(s)).toEqual([
        { post: 'P2', hjemmel: '34.3.3', iTide: true, dokument: foer },
      ]);
    });

    it('byggherren kan si at varselet etter punkt 34.3.3 kom i tide etter innsigelsen, og senere påberope det på nytt (VS-U77 punkt 10, 13 og 30)', () => {
      const s = sakMed(justert);
      const med = (iTide: boolean) => ({
        P2: { aksepterer: true, varslet_i_tide: iTide, godtar_justering: true },
      });
      s.send('BH', svaret(s, med(false)));
      expect(s.avvisning('BH', revisjon(s, med(true))), '«i tide» etter innsigelsen').toBeNull();
      s.send('BH', revisjon(s, med(true)));
      expect(standpunktene(s)).toEqual([
        { post: 'P2', hjemmel: '34.3.3', iTide: true, dokument: gjeldende(s).dokument },
      ]);
      s.send('BH', revisjon(s, med(false)));
      expect(standpunktene(s)).toEqual([
        { post: 'P2', hjemmel: '34.3.3', iTide: false, dokument: gjeldende(s).dokument },
      ]);
    });

    it('brevet som gir opp innsigelsen mot varselet etter punkt 34.3.3, sier hvilken innsigelse det gir opp (VS-U77 punkt 10 og 30)', () => {
      const s = sakMed(justert);
      const med = (iTide: boolean) => ({
        P2: { aksepterer: true, varslet_i_tide: iTide, godtar_justering: true },
      });
      s.send('BH', svaret(s, med(false)));
      const brevet = laast(s.send('BH', revisjon(s, med(true)))).join(' ');
      expect(brevet).toMatch(
        /Byggherren gir opp innsigelsen i brev .+? og gjør ikke gjeldende at varselet om justering av enhetsprisene etter NS 8407 punkt\u00a034\.3\.3 første ledd for P2 kom for sent\./
      );
      // Kontrollsak: uten en innsigelse fra før sier brevet bare at varselet ikke kom for sent.
      const t = sakMed(justert);
      const utenFoer = laast(t.send('BH', svaret(t, med(true)))).join(' ');
      expect(utenFoer).toContain(
        'Byggherren gjør ikke gjeldende at varselet om justering av enhetsprisene etter NS 8407 punkt\u00a034.3.3 første ledd for P2 kom for sent.'
      );
      expect(utenFoer).not.toContain('gir opp innsigelsen');
    });

    it('brevet som gjentar innsigelsen mot varselet for kravposten, viser til brevet med den første innsigelsen (VS-U77 punkt 6 og 9)', () => {
      const s = sakMed(justert, regning);
      const svarene = {
        P2: { aksepterer: true, varslet_i_tide: false, godtar_justering: true },
        P3: { aksepterer: true, varslet_i_tide: false },
      };
      const foerste = laast(s.send('BH', svaret(s, svarene))).join(' ');
      expect(foerste, 'det første svaret viser ikke til noe').not.toContain('jf. innsigelsen');
      const andre = laast(s.send('BH', revisjon(s, svarene))).join(' ');
      expect(andre).toMatch(
        /punkt\u00a034\.3\.3 første ledd for P2 kom for sent, jf\. innsigelsen i brev .+?, og at totalentreprenøren bare har krav/
      );
      expect(andre).toMatch(
        /punkt\u00a034\.4 for P3 ikke ble gitt eller kom for sent, jf\. innsigelsen i brev .+?\./
      );
      const henvisning = (tekst: string) =>
        /for P3 ikke ble gitt eller kom for sent, jf\. innsigelsen i (brev .+?)\./.exec(tekst)![1];
      const tredje = laast(s.send('BH', revisjon(s, svarene))).join(' ');
      expect(henvisning(tredje), 'den første innsigelsen, ikke gjentakelsen').toBe(
        henvisning(andre)
      );
    });

    it('standpunktet til varselet etter punkt 34.3.3 for én kravpost gjelder ikke varselet etter punkt 34.4 for en annen (VS-U77 punkt 14 og 34, OV-U117)', () => {
      const s = sakMed(justert, regning);
      s.send(
        'BH',
        svaret(s, {
          P2: { aksepterer: true, varslet_i_tide: false, godtar_justering: true },
          P3: { aksepterer: true },
        })
      );
      expect(standpunktene(s)).toEqual([
        { post: 'P2', hjemmel: '34.3.3', iTide: false, dokument: gjeldende(s).dokument },
      ]);
      expect(
        s.avvisning(
          'BH',
          revisjon(s, {
            P2: { aksepterer: true, godtar_justering: true },
            P3: { aksepterer: true, varslet_i_tide: true },
          })
        )?.melding,
        'innsigelsen mot varselet etter punkt 34.3.3 for P2 er ingen innsigelse etter punkt 34.4 for P3'
      ).toContain('P3.varslet_i_tide: byggherren har ikke gjort gjeldende');
    });
  });
});

/**
 * #1824: TEs vederlagskrav har punkter med overskrift i rekkefølgen i prototype v4 i BF-14
 * (`#brev`): varslene, kravpostene, den særskilte vederlagsjusteringen, rigg og drift og
 * forbeholdet. Ordlyden er design innenfor KA-U61 og VS-U51 (U-6 og U-14 i BF-14), og partene
 * skrives fullt ut (LV-U35).
 */
describe('punktene i totalentreprenørens vederlagskrav (#1824, prototype v4 i BF-14)', () => {
  const vederlagskrav = (innhold: Data, forbehold?: string, utdypninger?: Data) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold,
    ...(forbehold ? { forbehold } : {}),
    ...(utdypninger ? { utdypninger } : {}),
  });
  /** Svikt, der varslingsplikten etter § 34.1.2 gjelder (§ 34.1.2, VS-U3). */
  const svikt = {
    ...PAABEROPELSE,
    innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
  };
  const to = (beloep: number) => ({
    kravposter: [
      { beskrivelse: 'Graving', oppgjoersform: 'tilbud', beloep },
      { beskrivelse: 'Spunt', oppgjoersform: 'tilbud', beloep: 10000 },
    ],
  });

  it('et varsel etter punkt 34.1.2 sendt før kravet står i punktet for varselet, med brevet det ble gitt i', () => {
    const s = sak();
    s.send('TE', svikt);
    s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.2' });
    const [punkt] = tekst(s.send('TE', vederlagskrav(tilbud(125000))));
    // Varselet er brev 2; brevet viser til det med merkingen og datoen (LV-U53).
    expect(punkt).toMatchObject({
      punkt: '34.1.2',
      overskrift: '1. Varselet om vederlagsjustering',
      laast:
        '1. Varselet om vederlagsjustering\n\nVarsel om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 ble gitt i brev K201-KOE-017-02 av 3. oktober 2026.',
    });
  });

  it('uten varsel før kravet varsler kravet selv, og kontrollsaken uten den særskilte posten har ikke punktet for varselet etter 34.1.3', () => {
    const s = sak();
    s.send('TE', svikt);
    const avsnitt = tekst(s.send('TE', vederlagskrav(tilbud(125000))));
    expect(avsnitt[0]).toEqual({
      gjelder: avsnitt[0].gjelder,
      punkt: '34.1.2',
      overskrift: '1. Varselet om vederlagsjustering',
      laast:
        '1. Varselet om vederlagsjustering\n\nTotalentreprenøren varsler krav om justering av vederlaget etter NS 8407 punkt\u00a034.1.2.',
    });
    expect(avsnitt.map((a) => a.punkt)).not.toContain('34.1.3');
  });

  it('ved en endring nevner kravet ikke varselet etter punkt 34.1.2, der varslingsplikten ikke gjelder (VS-U3, OV-U15, § 34.1.1)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const avsnitt = tekst(s.send('TE', vederlagskrav(tilbud(125000))));
    expect(avsnitt[0]).toMatchObject({ punkt: 'P1', overskrift: '1. Vederlagsjustering' });
    expect(avsnitt.map((a) => a.laast).join(' ')).not.toContain('34.1.2');
  });

  it('hver kravpost er et eget avsnitt, og bare det første har overskriften (LV-U70)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const avsnitt = tekst(s.send('TE', vederlagskrav(to(125000))));
    expect(avsnitt.map((a) => [a.punkt, a.overskrift])).toEqual([
      ['P1', '1. Vederlagsjustering'],
      ['P2', undefined],
      ['tilbud', undefined],
    ]);
    expect(avsnitt[1].laast.startsWith('P2 Spunt.')).toBe(true);
  });

  it('forbeholdet står sist under sin egen overskrift, og teksten er partens utdypning, ikke den låste delen (KA-U82, LV-U74)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const forbehold = 'Totalentreprenøren tar forbehold om å justere kravet når omfanget er kjent.';
    const avsnitt = tekst(s.send('TE', vederlagskrav(tilbud(125000), forbehold)));
    expect(avsnitt.at(-1)).toEqual({
      gjelder: avsnitt[0].gjelder,
      punkt: 'forbehold',
      overskrift: '2. Forbehold',
      laast: '2. Forbehold',
      utdypning: forbehold,
    });
    // Kontrollsak: uten forbehold er det ikke noe punkt for det.
    const uten = tekst(s.send('TE', vederlagskrav(tilbud(130000))));
    expect(uten.map((a) => a.punkt)).not.toContain('forbehold');
  });

  it('utdypningen per punkt står under punktet den gjelder, begrunnelsen for hele kravet etter postene og forbeholdet sist (LV-U71, LV-U74)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const avsnitt = tekst(
      s.send('TE', {
        ...vederlagskrav(to(125000), 'Forbeholdet.', { P2: 'Spunten er prosjektert på nytt.' }),
        utdypning: 'Kalkylen er vedlagt.',
      })
    );
    expect(avsnitt.map((a) => [a.punkt, a.overskrift, a.utdypning])).toEqual([
      ['P1', '1. Vederlagsjustering', undefined],
      ['P2', undefined, 'Spunten er prosjektert på nytt.'],
      ['tilbud', undefined, undefined],
      ['begrunnelse', '2. Begrunnelse', 'Kalkylen er vedlagt.'],
      ['forbehold', '3. Forbehold', 'Forbeholdet.'],
    ]);
  });

  it('en utdypning for et punkt brevet ikke har, avvises, så teksten ikke forsvinner fra brevet (LV-U71)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(
      s.avvist('TE', vederlagskrav(to(125000), undefined, { P2: 'x' })),
      'kontrollsak'
    ).toBeNull();
    expect(s.avvist('TE', vederlagskrav(to(125000), undefined, { P3: 'x' }))).toBe('UGYLDIG_FORM');
    expect(
      s.avvist('TE', vederlagskrav(to(125000), 'Forbeholdet.', { forbehold: 'Et annet.' }))
    ).toBe('UGYLDIG_FORM');
    // Grunnlagskravet har ingen punkter.
    expect(s.avvist('TE', { ...PAABEROPELSE, utdypninger: { P1: 'x' } })).toBe('UGYLDIG_FORM');
  });

  it('en ny versjon sier først hvilket krav den erstatter, uten overskrift', () => {
    const s = sakMedKrav();
    const [innledning] = tekst(s.send('TE', vederlagskrav(tilbud(130000))));
    expect(innledning).toMatchObject({
      punkt: 'innledning',
      laast: 'Kravet erstatter totalentreprenørens krav i brev K201-KOE-017-02 av 3. oktober 2026.',
    });
    expect(innledning.overskrift).toBeUndefined();
  });

  describe('totalentreprenørens standpunkt til svaret i en ny kravversjon (LV-U75)', () => {
    const standpunktet = 'Totalentreprenøren er ikke enig i at kravet kom for sent.';
    const ingenHenvisning = (avsnitt: Avsnitt[]) =>
      expect(avsnitt.map((a) => a.laast).join('\n\n')).not.toContain('fremgår av');

    it('vederlagskravet har standpunktet rett etter setningen om kravet det erstatter, uten henvisningssetning', () => {
      const s = sakMedKrav();
      const avsnitt = tekst(
        s.send('TE', vederlagskrav(tilbud(130000), undefined, { innledning: standpunktet }))
      );
      expect(avsnitt[0]).toMatchObject({
        punkt: 'innledning',
        laast:
          'Kravet erstatter totalentreprenørens krav i brev K201-KOE-017-02 av 3. oktober 2026.',
        utdypning: standpunktet,
      });
      expect(avsnitt[0]!.overskrift).toBeUndefined();
      expect(avsnitt[1]!.punkt, 'kravpostene står etter standpunktet').toBe('P1');
      ingenHenvisning(avsnitt);
    });

    it('fristkravet har standpunktet rett etter setningen om kravet det erstatter', () => {
      const s = sakMedKrav();
      const avsnitt = tekst(
        s.send('TE', {
          ...utenFelt(FRISTKRAV, 'varsel'),
          innhold: { frister: [{ navn: 'Sluttfristen', dager: 30 }] },
          utdypninger: { innledning: standpunktet },
        })
      );
      expect(avsnitt[0]).toMatchObject({
        punkt: 'innledning',
        laast:
          'Kravet erstatter totalentreprenørens krav i brev K201-KOE-017-03 av 4. oktober 2026.',
        utdypning: standpunktet,
      });
      ingenHenvisning(avsnitt);
    });

    it('det første kravet har ingen setning om et krav det erstatter, og et standpunkt avvises (LV-U71)', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      expect(
        s.avvist('TE', vederlagskrav(tilbud(125000), undefined, { innledning: standpunktet }))
      ).toBe('UGYLDIG_FORM');
      expect(s.avvist('TE', vederlagskrav(tilbud(125000))), 'kontrollsak').toBeNull();
    });
  });

  describe('trekket av den særskilte vederlagsjusteringen (KA-U83)', () => {
    const saerskilt = { saerskilt: { produktivitet: { beloep: 40000 } } };
    const medPosten = () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('TE', vederlagskrav(tilbud(125000, saerskilt)));
      return s;
    };
    const trekk = { trekker_saerskilt: ['produktivitet'] };

    it('brevet sier at totalentreprenøren trekker kravet, og den nye versjonen har ikke posten', () => {
      const s = medPosten();
      const rad = s.send('TE', vederlagskrav(tilbud(125000, trekk)));
      const punktet: Partial<Avsnitt> = tekst(rad).find((a) => a.punkt === 'produktivitet') ?? {};
      expect(punktet).toMatchObject({
        overskrift: expect.stringMatching(/^\d+\. Særskilt vederlagsjustering$/),
      });
      expect(punktet.laast).toBe(
        `${punktet.overskrift}\n\nTotalentreprenøren trekker kravet om særskilt justering av vederlaget etter NS 8407 punkt\u00a034.1.3 annet ledd, fremsatt i brev K201-KOE-017-02 av 3. oktober 2026.`
      );
      expect(laast(rad).join(' ')).not.toContain('avkall');
      expect(laast(rad).join(' '), 'posten er ikke et tilbud lenger').not.toContain(
        'den særskilte vederlagsjusteringen er et tilbud'
      );
      expect(harProduktivitetspost(s.u().spor.vederlag.gjeldendeKrav!)).toBe(false);
      expect(s.u().forstaatt).toBe(true);
    });

    it('en ny versjon som verken tar med eller trekker posten, avvises', () => {
      const s = medPosten();
      expect(s.avvisning('TE', vederlagskrav(tilbud(125000)))).toEqual({
        regel: 'KRAVPOSTENE',
        melding: 'Kravversjonen mangler den særskilte vederlagsjusteringen uten at den er trukket.',
      });
      expect(s.avvist('TE', vederlagskrav(tilbud(125000, saerskilt))), 'tatt med').toBeNull();
      expect(s.avvist('TE', vederlagskrav(tilbud(125000, trekk))), 'trukket').toBeNull();
    });

    it('et trekk gjelder posten i forrige versjon, én gang, og posten kan ikke både tas med og trekkes', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('TE', vederlagskrav(tilbud(125000)));
      expect(s.avvist('TE', vederlagskrav(tilbud(125000, trekk))), 'ikke i forrige').toBe(
        'KRAVPOSTENE'
      );
      const m = medPosten();
      expect(m.avvist('TE', vederlagskrav(tilbud(125000, { ...saerskilt, ...trekk })))).toBe(
        'KRAVPOSTENE'
      );
      expect(
        m.avvist(
          'TE',
          vederlagskrav(tilbud(125000, { trekker_saerskilt: ['produktivitet', 'produktivitet'] }))
        )
      ).toBe('KRAVPOSTENE');
    });

    it('posten kan tas med igjen i en senere versjon', () => {
      const s = medPosten();
      s.send('TE', vederlagskrav(tilbud(125000, trekk)));
      s.send('TE', vederlagskrav(tilbud(125000, saerskilt)));
      expect(harProduktivitetspost(s.u().spor.vederlag.gjeldendeKrav!)).toBe(true);
      expect(s.u().forstaatt).toBe(true);
    });

    it('er posten den eneste i kravet, trekkes den ikke alene, og vederlagskravet trekkes i stedet (KA-U22)', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('TE', vederlagskrav(saerskilt));
      expect(s.avvisning('TE', vederlagskrav(trekk))).toEqual({
        regel: 'KRAVPOSTENE',
        melding:
          'Kravversjonen har ingen poster igjen når den særskilte vederlagsjusteringen er trukket.',
      });
      expect(s.avvist('TE', vederlagskrav(tilbud(125000, trekk))), 'kontrollsak').toBeNull();
      expect(s.avvist('TE', vederlagskrav({ trekker_saerskilt: [] })), 'tomt trekk').toBe(
        'UGYLDIG_FORM'
      );
    });

    it('et trekk uten andre poster får meldingen om det som hindrer: posten som mangler, eller posten som ikke er med i forrige versjon', () => {
      const s = medPosten();
      expect(s.avvisning('TE', vederlagskrav(trekk))?.melding).toBe(
        'Kravversjonen mangler P1 uten at den er trukket.'
      );
      const f = sak();
      f.send('TE', PAABEROPELSE);
      expect(f.avvisning('TE', vederlagskrav(trekk))?.melding).toBe(
        'Kravversjonen trekker den særskilte vederlagsjusteringen, som ikke er med i forrige kravversjon.'
      );
    });

    it('en lagret versjon uten posten og uten trekk har en begrensning, og trekket leses tilbake', () => {
      const s = medPosten();
      const rad = s.send('TE', vederlagskrav(tilbud(125000, trekk)));
      const kravet = (rad.data.krav as Data[])[0]!;
      expect(kravet.trekker_saerskilt).toEqual(['produktivitet']);
      expect(JSON.stringify(s.u().begrensninger), 'kontrollsak').not.toContain(
        'mangler den særskilte vederlagsjusteringen uten at den er trukket'
      );
      delete kravet.trekker_saerskilt;
      expect(JSON.stringify(s.u().begrensninger)).toContain(
        'mangler den særskilte vederlagsjusteringen uten at den er trukket'
      );
    });
  });

  it('et avsnitt med punkt for et element som ikke er et krav, gjør saken ikke forstått (MM-U2)', () => {
    const s = sak();
    s.send('TE', svikt);
    const varselet = s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.2' });
    expect(s.u().forstaatt, 'kontrollsak').toBe(true);
    (varselet.data.brevtekst as Avsnitt[])[0].punkt = '34.1.2';
    expect(s.u().forstaatt).toBe(false);
  });

  it('avsnitt som ikke står etter hverandre per punkt, eller en overskrift som ikke står først, gjør saken ikke forstått (MM-U2)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', vederlagskrav(to(125000)));
    expect(s.u().forstaatt, 'kontrollsak').toBe(true);
    const lagret = rad.data.brevtekst as Avsnitt[];
    const original = lagret.map((a) => ({ ...a }));
    const proev = (endre: (a: Avsnitt[]) => void) => {
      rad.data.brevtekst = original.map((a) => ({ ...a }));
      endre(rad.data.brevtekst as Avsnitt[]);
      return s.u().forstaatt;
    };
    expect(
      proev(() => {}),
      'kontrollsak'
    ).toBe(true);
    expect(proev((a) => (a[0].laast = 'Totalentreprenøren krever noe annet.'))).toBe(false);
    expect(proev((a) => (a[1].punkt = 'P1'))).toBe(false);
    expect(proev((a) => delete a[1].punkt)).toBe(false);
    expect(proev((a) => delete a[0].punkt)).toBe(false);
  });
});
