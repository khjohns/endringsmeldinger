import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { datoenDetBleSendt, varseletFoerBrevet } from '../utledning/utled.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import { standpunkteneTilVarslene } from '../spor/vederlag/utledning.ts';
import {
  KLAR_OVER,
  PAABEROPELSE,
  VEDERLAG_DELVIS,
  laast,
  sak,
  svar,
  tilbud,
  type Data,
} from './brevsak.ts';
import { SOM_BREV } from './brevet.ts';

const HJEMLER = ['34.1.3', '34.3.3', '34.4'] as const;
type Hjemmel = (typeof HJEMLER)[number];
const ARBEIDET = 'Graving ved kum 4';
const OGSAA = 'Dette er også et varsel om vederlagsjustering etter NS 8407 punkt\u00a034.1.2.';
const VEDERLAGSKRAV = { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) };

function paaberopt(hovedkategori: 'svikt' | 'endring' = 'svikt') {
  const s = sak();
  s.send(
    'TE',
    hovedkategori === 'endring'
      ? PAABEROPELSE
      : {
          ...PAABEROPELSE,
          innhold: { hovedkategori, underkategori: 'medvirkning', ...KLAR_OVER },
        }
  );
  return s;
}

const sendVarsel = (hjemmel: Hjemmel | '34.1.2' | '33.4') => ({
  type: 'send_varsel',
  varsler: [
    hjemmel === '34.3.3' || hjemmel === '34.4' ? { hjemmel, arbeid: ARBEIDET } : { hjemmel },
  ],
});
const leggTilVarsel = (sendt: string, ...hjemler: (Hjemmel | '34.1.2' | '33.4')[]) => ({
  type: 'varsel',
  ...SOM_BREV,
  varsler: hjemler.map((hjemmel) => ({ hjemmel })),
  sendt,
  dokumentasjon: [randomUUID()],
});
const eldreKrav = (sendt: string) => ({
  ...VEDERLAGSKRAV,
  ...SOM_BREV,
  sendt,
  dokumentasjon: [randomUUID()],
});
const utsagn = (r: { data: Data }) => r.data.utsagn as { id: string }[];
const rettidigheten = (r: { data: Data }) =>
  (r.data.svar as { standpunkter: Data[] }[])
    .flatMap((svar) => svar.standpunkter)
    .find((p) => p.art === 'rettidighet' && p.hjemmel === '34.1.2')!;

function svarPaaKravet(s: ReturnType<typeof sak>, iTide: boolean) {
  return s.send('BH', {
    type: 'brev',
    svar: [
      svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
      svar(
        'vederlag',
        s.krav('vederlag'),
        { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: iTide },
        iTide ? VEDERLAG_DELVIS[1] : { resultat: 'avslaatt', godkjent_beloep: 0 }
      ),
    ],
  });
}

describe('det første varselet etter punkt 34.1.2 (VS-U98)', () => {
  it.each(HJEMLER)(
    'et sendt varsel etter punkt %s er kandidat, og brevet sier det (VS-U102)',
    (h) => {
      const s = paaberopt();
      const rad = s.send('TE', sendVarsel(h));
      expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(utsagn(rad)[0].id);
      expect(laast(rad).join(' ')).toContain(OGSAA);
      expect(s.u().spor.vederlag.varsler['34.1.2']).toBeUndefined();
    }
  );

  it.each(HJEMLER)(
    'et varsel etter punkt %s lagt til samme dag som kravet, går foran kravet',
    (h) => {
      const s = paaberopt();
      s.send('TE', VEDERLAGSKRAV);
      const rad = s.send('TE', leggTilVarsel('2026-10-03', h));
      expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(utsagn(rad)[0].id);
      expect(rad.data.brevtekst).toBeUndefined();
    }
  );

  it('det første varselet i journalen vinner ved lik dato mellom de tre varslene', () => {
    const s = paaberopt();
    const foerste = s.send('TE', leggTilVarsel('2026-10-02', '34.4', '34.3.3'));
    s.send('TE', leggTilVarsel('2026-10-02', '34.1.3'));
    expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(utsagn(foerste)[0].id);
  });

  it('varselet med tidligst dato vinner også når det legges til sist', () => {
    const s = paaberopt();
    s.send('TE', leggTilVarsel('2026-10-02', '34.1.3'));
    const foerste = s.send('TE', leggTilVarsel('2026-10-01', '34.3.3'));
    expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(utsagn(foerste)[0].id);
  });

  it('rettingen av et kravpostvarsel endrer hvilket varsel som kommer først i nye svar (MM-U63)', () => {
    const s = paaberopt();
    const varsel = s.send('TE', leggTilVarsel('2026-10-02', '34.4'));
    const gjelder = utsagn(varsel)[0].id;
    s.send('TE', VEDERLAGSKRAV);
    expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(gjelder);
    s.send('TE', { type: 'retting', gjelder, dato: '2026-10-05' });
    expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(s.krav('vederlag'));
    expect(rettidigheten(svarPaaKravet(s, true)).gjelder).toBe(s.krav('vederlag'));
  });

  it.each(['2026-10-01', '2026-10-02'])(
    'et uttrykkelig varsel lagt til med dato %s vinner over et annet varsel fra 2. oktober',
    (dato) => {
      const s = paaberopt();
      s.send('TE', leggTilVarsel('2026-10-02', '34.4'));
      s.send('TE', VEDERLAGSKRAV);
      const uttrykkelig = s.send('TE', leggTilVarsel(dato, '34.1.2'));
      expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(utsagn(uttrykkelig)[0].id);
    }
  );

  it.each([true, false])(
    'svaret på kravet om varselet kom i tide (%s) viser til varselet',
    (iTide) => {
      const s = paaberopt();
      const varsel = s.send('TE', sendVarsel('34.4'));
      s.send('TE', VEDERLAGSKRAV);
      s.send('TE', { ...VEDERLAGSKRAV, innhold: tilbud(130000) });
      const rad = svarPaaKravet(s, iTide);
      expect(rettidigheten(rad)).toMatchObject({ gjelder: utsagn(varsel)[0].id, i_tide: iTide });
      expect(laast(rad).join(' ')).toContain(
        `varselet om regningsarbeid etter punkt\u00a034.4 for arbeidet «${ARBEIDET}»`
      );
      expect(s.u().forstaatt).toBe(true);
    }
  );

  it('lesingen avviser en ny påberopelse som feilaktig viser til kravet', () => {
    const s = paaberopt();
    const varsel = s.send('TE', sendVarsel('34.3.3'));
    s.send('TE', VEDERLAGSKRAV);
    const krav = s.krav('vederlag');
    const rad = svarPaaKravet(s, true);
    expect(rettidigheten(rad).gjelder).toBe(utsagn(varsel)[0].id);
    rettidigheten(rad).gjelder = krav;
    expect(s.u().forstaatt).toBe(false);
  });

  it('lesingen avviser en ny påberopelse som viser til et eget varsel sendt senere', () => {
    const s = paaberopt();
    const foerste = s.send('TE', sendVarsel('34.4'));
    const eget = s.send('TE', sendVarsel('34.1.2'));
    s.send('TE', VEDERLAGSKRAV);
    const rad = svarPaaKravet(s, true);
    expect(rettidigheten(rad).gjelder).toBe(utsagn(foerste)[0].id);
    rettidigheten(rad).gjelder = utsagn(eget)[0].id;
    expect(s.u().forstaatt).toBe(false);
  });

  it('et historisk svar som viser til kravet, står med virkningene det hadde (MM-U50)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.3.3'));
    s.send('TE', VEDERLAGSKRAV);
    const krav = s.krav('vederlag');
    const rad = svarPaaKravet(s, false);
    const lagret = (rad.data.svar as Data[]).find((s) => s.spor === 'vederlag')!;
    const grunnlag = lagret.beslutningsgrunnlag as Data;
    grunnlag.regelversjon = 151;
    rettidigheten(rad).gjelder = krav;
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.vederlag.gjeldendeSvar?.standpunkter).toContainEqual(
      expect.objectContaining({ art: 'rettidighet', gjelder: krav, iTide: false })
    );
    expect(u.svar[lagret.id as string].virkninger).toEqual(
      u.spor.vederlag.gjeldendeSvar?.beslutningsgrunnlag.virkninger
    );
  });

  it('et tidligere svar beholder henvisningen når et tidligere varsel legges til senere (MM-U50)', () => {
    const s = paaberopt();
    s.send('TE', VEDERLAGSKRAV);
    const krav = s.krav('vederlag');
    const svar = svarPaaKravet(s, false);
    const varsel = s.send('TE', leggTilVarsel('2026-10-02', '34.1.3'));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(rettidigheten(svar).gjelder).toBe(krav);
    expect(u.spor.vederlag.gjeldendeSvar?.standpunkter).toContainEqual(
      expect.objectContaining({ art: 'rettidighet', gjelder: krav })
    );
    expect(varseletFoerBrevet(u, '34.1.2')).toBe(utsagn(varsel)[0].id);
  });

  it.each(HJEMLER)(
    'ved endring teller ikke varselet etter punkt %s etter punkt 34.1.2 (VS-U102)',
    (h) => {
      const s = paaberopt('endring');
      const rad = s.send('TE', sendVarsel(h));
      expect(varseletFoerBrevet(s.u(), '34.1.2')).toBeUndefined();
      expect(laast(rad).join(' ')).not.toContain(OGSAA);
    }
  );
});

describe('datoen for et krav utenfor rekken (VS-U98, OV-U102, OV-U104)', () => {
  it.each(HJEMLER)('et eldre krav med samme dato som varselet etter punkt %s merkes', (h) => {
    const s = paaberopt();
    const varsel = s.send('TE', leggTilVarsel('2026-10-02', h));
    s.send('TE', VEDERLAGSKRAV);
    const krav = s.send('TE', eldreKrav('2026-10-02'));
    const u = s.u();
    expect(u.sendtSammeDag).toContainEqual({
      element: (krav.data.krav as Data[])[0].id,
      med: utsagn(varsel)[0].id,
    });
    expect(varseletFoerBrevet(u, '34.1.2')).toBe(utsagn(varsel)[0].id);
  });

  it.each(HJEMLER)(
    'et varsel etter punkt %s lagt til med samme dato som et eldre krav merkes',
    (h) => {
      const s = paaberopt();
      s.send('TE', VEDERLAGSKRAV);
      const krav = s.send('TE', eldreKrav('2026-10-02'));
      const varsel = s.send('TE', leggTilVarsel('2026-10-02', h));
      expect(s.u().sendtSammeDag).toContainEqual({
        element: utsagn(varsel)[0].id,
        med: (krav.data.krav as Data[])[0].id,
      });
    }
  );
});

describe('eget varsel og varsel lagt til (VS-U99, VS-U101)', () => {
  it.each(HJEMLER)(
    'et eget varsel kan sendes etter varselet etter punkt %s før kravet (VS-U99)',
    (h) => {
      const s = paaberopt();
      const rad = s.send('TE', sendVarsel(h));
      s.send('TE', sendVarsel('34.1.2'));
      expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(utsagn(rad)[0].id);
    }
  );

  it.each(HJEMLER)(
    'etter kravet avvises et eget varsel også når punkt %s er varslet (VS-U99)',
    (h) => {
      const s = paaberopt();
      s.send('TE', sendVarsel(h));
      s.send('TE', VEDERLAGSKRAV);
      expect(s.avvist('TE', sendVarsel('34.1.2'))).toBe('VEDERLAGSKRAV_SENDT');
    }
  );

  it.each(HJEMLER)('ett brev lagt til bevarer punkt %s og 34.1.2 med samme dato (VS-U101)', (h) => {
    const s = paaberopt();
    const rad = s.send('TE', leggTilVarsel('2026-10-02', h, '34.1.2', '33.4'));
    const u = s.u();
    const vederlag = u.spor.vederlag;
    const varslene = [
      h === '34.1.3' ? vederlag.varsler[h]! : vederlag.kravpostvarsler[0],
      vederlag.varsler['34.1.2']!,
      u.spor.frist.varsler['33.4']!,
    ];
    expect(varslene.map((v) => v.hjemmel)).toEqual([h, '34.1.2', '33.4']);
    expect(varslene.map((v) => v.dokument)).toEqual(Array(3).fill(rad.event_id));
    expect(varslene.map((v) => datoenDetBleSendt(u, v))).toEqual(Array(3).fill('2026-10-02'));
    expect(varseletFoerBrevet(u, '34.1.2')).toBe(varslene[1].id);
  });
});

describe('korrespondanse som kjernen ikke leser som varsel (VS-U98, VS-U103)', () => {
  it.each(['30.2', '34.2.2'])(
    'et brev om punkt %s regnes ikke som varselet etter punkt 34.1.2',
    (h) => {
      const s = paaberopt();
      s.send('TE', {
        type: 'registrert_brev',
        ...SOM_BREV,
        beskrivelse: `Varsel etter punkt ${h} annet ledd`,
        sendt: '2026-10-02',
        dokumentasjon: [randomUUID()],
      });
      expect(varseletFoerBrevet(s.u(), '34.1.2')).toBeUndefined();
      s.send('TE', VEDERLAGSKRAV);
      expect(varseletFoerBrevet(s.u(), '34.1.2')).toBe(s.krav('vederlag'));
    }
  );
});

describe('standpunkt etter punkt 34.1.2 i svaret på varselet (VS-U100)', () => {
  const svarPaa = (gjelder: string, h: Hjemmel, iTide: unknown) => ({
    type: 'brev',
    svar: [
      {
        ...svar(
          'vederlag',
          gjelder,
          {
            hovedkrav_varslet_i_tide: iTide,
            varslet_i_tide: false,
            ...(h === '34.3.3' ? { godtar_justering: true } : {}),
          },
          {},
          null
        ),
      },
    ],
  });

  it.each(HJEMLER)(
    'svaret på det første varselet etter punkt %s lagrer begge standpunktene',
    (h) => {
      const s = paaberopt();
      const gjelder = utsagn(s.send('TE', sendVarsel(h)))[0].id;
      const rad = s.send('BH', svarPaa(gjelder, h, false));
      const u = s.u();
      const lagret = u.spor.vederlag.svarPaaVarsler[0];
      expect(u.forstaatt).toBe(true);
      expect(lagret.standpunkter).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ art: 'rettidighet', hjemmel: '34.1.2', gjelder, iTide: false }),
          expect.objectContaining({ art: 'rettidighet', hjemmel: h, gjelder, iTide: false }),
        ])
      );
      expect(lagret.beslutningsgrunnlag.virkninger[0]).toMatchObject({
        standpunkt: lagret.standpunkter[0].id,
        virkning: 1,
      });
      expect(laast(rad).join('\n')).toContain('Varselet om vederlagsjustering (punkt\u00a034.1.2)');
      expect(u.spor.vederlag.gjeldendeSvar).toBeNull();
    }
  );

  it.each(['svikt', 'endring'] as const)(
    'standpunktet avvises ved %s når varselet ikke kan besvares etter punkt 34.1.2',
    (h) => {
      const s = paaberopt(h);
      if (h === 'svikt') s.send('TE', sendVarsel('34.1.2'));
      const gjelder = utsagn(s.send('TE', sendVarsel('34.1.3')))[0].id;
      expect(s.avvisning('BH', svarPaa(gjelder, '34.1.3', false))).toMatchObject({
        regel: 'UGYLDIG_VURDERING',
        melding: expect.stringContaining('hovedkrav_varslet_i_tide'),
      });
      expect(s.avvist('BH', svarPaa(gjelder, '34.1.3', undefined))).toBeNull();
    }
  );

  it('linjen i varselsvaret nevner standpunktet etter punkt 34.1.2 én gang (VS-U100)', () => {
    for (const iTide of [false, true]) {
      const s = paaberopt();
      const gjelder = utsagn(s.send('TE', sendVarsel('34.1.3')))[0].id;
      s.send('BH', svarPaa(gjelder, '34.1.3', iTide));
      const { linje } = s.u().spor.vederlag.svarPaaVarsler[0].beslutningsgrunnlag;
      const tekst = `varselet etter punkt\u00a034.1.2 kom ${iTide ? 'i tide' : 'for sent'}`;
      expect(linje.split(tekst)).toHaveLength(2);
    }
  });

  it('standpunktet etter punkt 34.1.2 i et svar lagt til skjuler ikke den stående innsigelsen etter punkt 34.3.3 i linjen (VS-U96 punkt 36, VS-U100)', () => {
    const s = paaberopt();
    const gjelder = utsagn(s.send('TE', sendVarsel('34.3.3')))[0].id;
    s.send('BH', svarPaa(gjelder, '34.3.3', undefined));
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.vederlag.svarPaaVarsler[0].id,
      svar: svar(
        'vederlag',
        gjelder,
        { hovedkrav_varslet_i_tide: false, godtar_justering: false },
        {},
        null
      ),
      ...SOM_BREV,
      sendt: s.journal.at(-1)!.tidsstempel.slice(0, 10),
      dokumentasjon: [randomUUID()],
    });
    expect(s.u().spor.vederlag.svarPaaVarsler.at(-1)!.beslutningsgrunnlag.linje).toContain(
      'varselet etter punkt\u00a034.3.3 kom for sent, som gjort gjeldende i et tidligere svar'
    );
  });

  it('et tidligere datert første krav lagt til etter varselsvaret lar svaret stå med samme virkning (VS-U98, VS-U86 punkt 10)', () => {
    const s = paaberopt();
    const gjelder = utsagn(s.send('TE', leggTilVarsel('2026-10-02', '34.4')))[0].id;
    s.send('BH', svarPaa(gjelder, '34.4', false));
    const [foer] = s.u().spor.vederlag.svarPaaVarsler;

    s.send('TE', eldreKrav('2026-10-01'));
    const etter = s.u();
    expect(etter.forstaatt).toBe(true);
    expect(varseletFoerBrevet(etter, '34.1.2')).toBe(s.krav('vederlag'));
    expect(etter.spor.vederlag.svarPaaVarsler).toEqual([foer]);
  });

  it('standpunktet etter punkt 34.1.2 må være en boolsk verdi', () => {
    const s = paaberopt();
    const gjelder = utsagn(s.send('TE', sendVarsel('34.1.3')))[0].id;
    expect(s.avvisning('BH', svarPaa(gjelder, '34.1.3', 'nei'))).toMatchObject({
      regel: 'UGYLDIG_VURDERING',
      melding: expect.stringContaining('er verken true eller false'),
    });
  });

  it('et lagret svar på punkt 34.4 må ha standpunktet til selve varselet', () => {
    const s = paaberopt();
    const gjelder = utsagn(s.send('TE', sendVarsel('34.4')))[0].id;
    const rad = s.send('BH', svarPaa(gjelder, '34.4', false));
    expect(s.u().forstaatt).toBe(true);
    const lagret = (rad.data.svar as Data[])[0];
    const [hovedvarselet] = lagret.standpunkter as Data[];
    lagret.standpunkter = [hovedvarselet];
    const grunnlag = lagret.beslutningsgrunnlag as Data;
    grunnlag.virkninger = (grunnlag.virkninger as Data[]).filter(
      (v) => v.standpunkt === hovedvarselet.id
    );
    expect(s.u().forstaatt).toBe(false);
  });

  it('etter svaret på hele kravet avvises punkt 34.1.2 i et svar på kravpostvarselet', () => {
    const s = paaberopt();
    const gjelder = utsagn(s.send('TE', sendVarsel('34.4')))[0].id;
    s.send('TE', VEDERLAGSKRAV);
    svarPaaKravet(s, true);
    expect(s.avvisning('BH', svarPaa(gjelder, '34.4', false))).toMatchObject({
      regel: 'UGYLDIG_VURDERING',
      melding: expect.stringContaining('hovedkrav_varslet_i_tide'),
    });
    expect(s.avvist('BH', svarPaa(gjelder, '34.4', undefined))).toBeNull();
  });

  it('svaret bare på kravpostvarselet kan påberope punkt 34.1.2 mot hele kravet', () => {
    const s = paaberopt();
    s.send('TE', {
      ...VEDERLAGSKRAV,
      innhold: { kravposter: [{ beskrivelse: ARBEIDET, oppgjoersform: 'regningsarbeid' }] },
    });
    const krav = s.u().spor.vederlag.gjeldendeKrav!;
    const [post] = kravposterI(krav);
    const kommando = {
      type: 'brev',
      svar: [
        {
          ...svar(
            'vederlag',
            krav.id,
            {
              hovedkrav_varslet_i_tide: false,
              kravposter: [{ gjelder: post.id, varslet_i_tide: false }],
            },
            {},
            null
          ),
          bare_varselet: true,
        },
      ],
    };
    const rad = s.send('BH', kommando);
    const u = s.u();
    expect(rettidigheten(rad)).toMatchObject({ gjelder: krav.id, i_tide: false });
    expect(u.spor.vederlag.svarPaaVarsler[0].standpunkter).toContainEqual(
      expect.objectContaining({ hjemmel: '34.4', gjelder: post.id })
    );
    expect(standpunkteneTilVarslene(u, null)).toContainEqual(
      expect.objectContaining({ hjemmel: '34.1.2', gjelder: krav.id, iTide: false })
    );
    expect(u.spor.vederlag.gjeldendeSvar).toBeNull();
    expect(laast(rad).join(' ')).toContain('Varselet om vederlagsjustering (punkt\u00a034.1.2)');
  });

  it('svaret på hele kravet viser til innsigelsen fra varselet og kan gi den opp', () => {
    const s = paaberopt();
    const gjelder = utsagn(s.send('TE', sendVarsel('34.4')))[0].id;
    const foer = s.send('BH', svarPaa(gjelder, '34.4', false));
    s.send('TE', VEDERLAGSKRAV);
    const rad = svarPaaKravet(s, true);
    expect(laast(rad).join(' ')).toContain('gir opp innsigelsen i brev K201-KOE-017-03');
    expect(standpunkteneTilVarslene(s.u(), null)).toContainEqual(
      expect.objectContaining({ hjemmel: '34.1.2', gjelder, iTide: true })
    );
    expect(s.u().spor.vederlag.svarPaaVarsler[0].dokument).toBe(foer.event_id);
  });
});
