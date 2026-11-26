/**
 * Byggherrens svar på et varsel etter punkt 34.3.3 første ledd eller 34.4 som står alene (G-9 i
 * BF-14, #2177). Svaret er et vanlig svar i sporet vederlag, og `gjelder` er varselet (VS-U79).
 * Innholdet står i VS-U77 punkt 30–35.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { handlinger, tilbudte } from '../kommandoer/handlinger.ts';
import { regnUtSvar } from '../frosset/utregning.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import { KJERNE } from '../versjon.ts';
import { KLAR_OVER, laast, MOT, PAABEROPELSE, sak, svar, tilbud, type Data } from './brevsak.ts';

const sendVarsel = (hjemmel: '34.3.3' | '34.4') => ({
  type: 'send_varsel',
  varsler: [{ hjemmel, arbeid: 'Graving ved kum 4' }],
});

/** Byggherrens svar lagt til med datoen det ble sendt (OV-U98, OV-U105). */
const lagtTil = (sendt: string, svarene: Data[], erstatter?: string) => ({
  type: erstatter ? 'revisjon' : 'brev',
  ...(erstatter ? { erstatter, svar: svarene[0] } : { svar: svarene }),
  sendt,
  korrespondansetype: 'e_post',
  beskrivelse: 'Svar på varselet',
  dokumentasjon: [randomUUID()],
});

const dagen = (s: ReturnType<typeof sak>) => s.journal.at(-1)!.tidsstempel.slice(0, 10);

function medVarsel(hjemmel: '34.3.3' | '34.4') {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  s.send('TE', sendVarsel(hjemmel));
  const varsel = s.u().spor.vederlag.kravpostvarsler.at(-1)!.id;
  return { s, varsel };
}

const vederlagskrav = (kravposter: Data[]) => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: { kravposter },
});

describe('svaret på varselet etter punkt 34.3.3 som står alene (VS-U77 punkt 30, VS-U79)', () => {
  it('byggherren får tilbud om å svare på varselet, ikke om å erstatte et svar som ikke finnes (punkt 33)', () => {
    const { s, varsel } = medVarsel('34.3.3');
    const bh = handlinger(s.u(), 'BH');
    expect(bh).toContain(`svare:${varsel}`);
    expect(bh).not.toContain(`revidere:${varsel}`);
    expect(handlinger(s.u(), 'TE')).not.toContain(`svare:${varsel}`);
  });

  it('svaret er et svar i vederlaget med standpunktene til varselet og justeringen, begge med varselet som gjelder (VS-U79)', () => {
    const { s, varsel } = medVarsel('34.3.3');
    s.send(
      'BH',
      lagtTil(dagen(s), [
        svar('vederlag', varsel, { varslet_i_tide: false, godtar_justering: false }, {}, null),
      ])
    );
    const [svaret] = s.u().spor.vederlag.svarPaaVarsler;
    expect(svaret.gjelder).toBe(varsel);
    expect(svaret.standpunkter.map((p) => [p.art, 'gjelder' in p && p.gjelder])).toEqual([
      ['rettidighet', varsel],
      ['justering', varsel],
    ]);
    expect(s.u().spor.vederlag.svar, 'svaret på varselet er ikke et svar på et krav').toEqual([]);
    expect(svaret.beslutningsgrunnlag.sammenfall).toBe(false);
    // VS-U4: innsigelsen prinsipalt og justeringen subsidiært.
    expect(svaret.beslutningsgrunnlag.virkninger.map((v) => v.virkning)).toEqual([1, 2]);
    expect(svaret.beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: prinsipalt varselet etter punkt 34.3.3 kom for sent, subsidiært justeringen av enhetsprisene bestridt (punkt 34.3.2).'
    );
    expect(handlinger(s.u(), 'BH')).toEqual(expect.arrayContaining([`revidere:${varsel}`]));
    expect(handlinger(s.u(), 'BH')).not.toContain(`svare:${varsel}`);
  });

  it('svaret på varselet etter punkt 34.3.3 må ha standpunktet til justeringen (punkt 30), og kan si uttrykkelig at varselet kom i tide (svar 3 A)', () => {
    const { s, varsel } = medVarsel('34.3.3');
    expect(
      s.avvisning(
        'BH',
        lagtTil(dagen(s), [svar('vederlag', varsel, { varslet_i_tide: false }, {}, null)])
      )?.melding ?? ''
    ).toContain('varselet.godtar_justering');
    expect(
      s.avvist(
        'BH',
        lagtTil(dagen(s), [
          svar('vederlag', varsel, { varslet_i_tide: true, godtar_justering: true }, {}, null),
        ])
      )
    ).toBeNull();
  });

  it('svaret kan ikke gis når en sendt kravversjon har en kravpost som gjelder varselet (punkt 33)', () => {
    const { s, varsel } = medVarsel('34.3.3');
    s.send(
      'TE',
      vederlagskrav([
        {
          beskrivelse: 'Spunt',
          oppgjoersform: 'enhetspriser',
          justert: true,
          varsel: { art: 'gitt', varsel },
        },
      ])
    );
    expect(handlinger(s.u(), 'BH')).not.toContain(`svare:${varsel}`);
    expect(
      s.avvist(
        'BH',
        lagtTil(dagen(s), [
          svar('vederlag', varsel, { varslet_i_tide: false, godtar_justering: false }, {}, null),
        ])
      )
    ).toBe('VARSELET_GJELDER_EN_KRAVPOST');
  });
});

describe('svaret på varselet etter punkt 34.4 som står alene (VS-U77 punkt 31, VS-U79)', () => {
  it('byggherren kan gjøre gjeldende at varselet kom for sent, men ikke si at det kom i tide uten en innsigelse å gi opp', () => {
    const { s, varsel } = medVarsel('34.4');
    expect(
      s.avvisning(
        'BH',
        lagtTil(dagen(s), [svar('vederlag', varsel, { varslet_i_tide: true }, {}, null)])
      )?.melding ?? ''
    ).toContain('ingen innsigelse å gi opp');
    expect(
      s.avvisning(
        'BH',
        lagtTil(dagen(s), [svar('vederlag', varsel, { godtar_justering: true }, {}, null)])
      )?.melding ?? ''
    ).toContain('varselet.godtar_justering');
    s.send(
      'BH',
      lagtTil(dagen(s), [svar('vederlag', varsel, { varslet_i_tide: false }, {}, null)])
    );
    const [svaret] = s.u().spor.vederlag.svarPaaVarsler;
    // KA-U64: standpunktet til varselet etter § 34.4 har ingen virkning.
    expect(svaret.beslutningsgrunnlag.virkninger.map((v) => v.virkning)).toEqual(['uten_virkning']);
  });

  it('totalentreprenørens innsigelse mot svaret på varselet hører til vederlaget (#1713, VS-U79)', () => {
    const { s, varsel } = medVarsel('34.4');
    s.send(
      'BH',
      lagtTil(dagen(s), [svar('vederlag', varsel, { varslet_i_tide: false }, {}, null)])
    );
    const svaret = s.u().spor.vederlag.svarPaaVarsler[0].id;
    expect(tilbudte(s.u(), 'TE').find((h) => h.noekkel === `innsigelse:${svaret}`)?.spor).toBe(
      'vederlag'
    );
  });

  it('et nytt svar på varselet erstatter det forrige og kan gi opp innsigelsen (punkt 31 og 33)', () => {
    const { s, varsel } = medVarsel('34.4');
    s.send(
      'BH',
      lagtTil(dagen(s), [svar('vederlag', varsel, { varslet_i_tide: false }, {}, null)])
    );
    const foerste = s.u().spor.vederlag.svarPaaVarsler[0].id;
    s.send(
      'BH',
      lagtTil(dagen(s), [svar('vederlag', varsel, { varslet_i_tide: true }, {}, null)], foerste)
    );
    const svarene = s.u().spor.vederlag.svarPaaVarsler;
    expect(svarene.map((x) => x.erstatter)).toEqual([null, foerste]);
    expect(s.u().forstaatt).toBe(true);
  });

  it('et nytt svar på varselet etter punkt 34.3.3 lagt til, som ikke sier noe om varselet, fryser justeringen subsidiært når innsigelsen står (VS-U80, VS-U81, VS-U77 punkt 30)', () => {
    const justeringen = (foer: Data) => {
      const { s, varsel } = medVarsel('34.3.3');
      s.send('BH', lagtTil(dagen(s), [svar('vederlag', varsel, foer, {}, null)]));
      const foerste = s.u().spor.vederlag.svarPaaVarsler[0].id;
      const taus = svar('vederlag', varsel, { godtar_justering: true }, {}, null);
      s.send('BH', lagtTil(dagen(s), [taus], foerste));
      expect(s.u().forstaatt).toBe(true);
      const nytt = s.u().spor.vederlag.svarPaaVarsler.at(-1)!;
      return nytt.beslutningsgrunnlag.virkninger.map((v) => [v.art, v.virkning]);
    };
    expect(justeringen({ varslet_i_tide: false, godtar_justering: true })).toEqual([
      ['justering', 2],
    ]);
    expect(
      justeringen({ varslet_i_tide: true, godtar_justering: true }),
      'kontrollsak: byggherren sa at varselet kom i tide'
    ).toEqual([['justering', 1]]);
  });

  it('linjen i et nytt svar på varselet lagt til, som ikke sier noe om varselet, har innsigelsen fra svaret før prinsipalt (VS-U81)', () => {
    const { s, varsel } = medVarsel('34.3.3');
    s.send(
      'BH',
      lagtTil(dagen(s), [
        svar('vederlag', varsel, { varslet_i_tide: false, godtar_justering: false }, {}, null),
      ])
    );
    const foerste = s.u().spor.vederlag.svarPaaVarsler[0].id;
    const taus = svar('vederlag', varsel, { godtar_justering: false }, {}, null);
    s.send('BH', lagtTil(dagen(s), [taus], foerste));
    expect(s.u().spor.vederlag.svarPaaVarsler.at(-1)!.beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: prinsipalt varselet etter punkt\u00a034.3.3 kom for sent, som gjort gjeldende i et tidligere svar, subsidiært justeringen av enhetsprisene bestridt (punkt\u00a034.3.2).'
    );
  });

  it('et nytt svar på varselet etter punkt 34.3.3 fra løsningen som ikke sier noe om varselet der innsigelsen står, avvises (VS-U80, VS-U77 punkt 9)', () => {
    const nyttSvar = (foer: Data) => {
      const { s, varsel } = medVarsel('34.3.3');
      s.send('BH', lagtTil(dagen(s), [svar('vederlag', varsel, foer, {}, null)]));
      return s.avvisning('BH', {
        type: 'revisjon',
        erstatter: s.u().spor.vederlag.svarPaaVarsler[0].id,
        svar: svar('vederlag', varsel, { godtar_justering: true }, {}, null),
      });
    };
    expect(nyttSvar({ varslet_i_tide: false, godtar_justering: true })?.melding).toContain(
      'varselet.varslet_i_tide: mangler'
    );
    expect(
      nyttSvar({ varslet_i_tide: true, godtar_justering: true }),
      'kontrollsak: uten en innsigelse som står'
    ).toBeNull();
  });

  it('et nytt svar lagt til samme dag som svaret det erstatter, kan gi opp innsigelsen (punkt 31 og 33, OV-U104)', () => {
    const { s, varsel } = medVarsel('34.4');
    s.send('BH', brev(varsel, { varslet_i_tide: false }));
    const foerste = s.u().spor.vederlag.svarPaaVarsler[0].id;
    expect(
      s.avvisning(
        'BH',
        lagtTil(dagen(s), [svar('vederlag', varsel, { varslet_i_tide: true }, {}, null)], foerste)
      )
    ).toBeNull();
  });

  it.each([
    ['står mot kravposten som gjelder varselet, så den kan gis opp der', true],
    ['kontrollsak: uten svaret på varselet er det ingen innsigelse å gi opp', false],
  ])('innsigelsen i svaret på varselet %s (punkt 34)', (_, medSvaret) => {
    const { s, varsel } = medVarsel('34.4');
    if (medSvaret)
      s.send(
        'BH',
        lagtTil(dagen(s), [svar('vederlag', varsel, { varslet_i_tide: false }, {}, null)])
      );
    s.send(
      'TE',
      vederlagskrav([
        {
          beskrivelse: 'Pumping',
          oppgjoersform: 'regningsarbeid',
          varsel: { art: 'gitt', varsel },
        },
      ])
    );
    const krav = s.krav('vederlag');
    const post = (s.u().spor.vederlag.gjeldendeKrav!.innhold.kravposter as { id: string }[])[0].id;
    const oppgitt = lagtTil(dagen(s), [
      svar(
        'vederlag',
        krav,
        { kravposter: [{ gjelder: post, aksepterer: true, varslet_i_tide: true }] },
        {},
        null
      ),
    ]);
    const melding = s.avvisning('BH', oppgitt)?.melding ?? '';
    if (medSvaret) expect(melding).not.toContain('ingen innsigelse å gi opp');
    else expect(melding).toContain('ingen innsigelse å gi opp');
  });
});

/** Byggherrens svar sendt fra løsningen, så brevet får tekst og tittel (LV-U2, LV-U25). */
const brev = (gjelder: string, vurderinger: Data, resultat: Data = {}) => ({
  type: 'brev',
  svar: [svar('vederlag', gjelder, vurderinger, resultat, null)],
});

const FORBEHOLDET_I_PUNKT = (n: number) =>
  `${n}. Forbehold\n\nByggherren har ennå ikke svart på totalentreprenørens påberopelse av irregulær endring i brev K201-KOE-017-01 av 2. oktober 2026. Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.`;

describe('innsigelsen i svaret på varselet og et svar på en eldre kravversjon (VS-U77 punkt 34, OV-U103)', () => {
  it.each([
    [
      'står mot kravposten som er trukket i den gjeldende versjonen, så svaret faller ikke sammen med kravet',
      true,
    ],
    ['kontrollsak: uten svaret på varselet faller svaret sammen med kravet', false],
  ])('innsigelsen %s', (_, medSvaret) => {
    const { s, varsel } = medVarsel('34.4');
    if (medSvaret) s.send('BH', brev(varsel, { varslet_i_tide: false }));
    s.send(
      'TE',
      vederlagskrav([
        {
          beskrivelse: 'Pumping',
          oppgjoersform: 'regningsarbeid',
          varsel: { art: 'gitt', varsel },
        },
        { beskrivelse: 'Graving', oppgjoersform: 'regningsarbeid', varsel: { art: 'kravet' } },
      ])
    );
    const v1 = s.krav('vederlag');
    const sendtV1 = dagen(s);
    const poster = (s.u().spor.vederlag.gjeldendeKrav!.innhold.kravposter as { id: string }[]).map(
      (p) => p.id
    );
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: {
        kravposter: [{ beskrivelse: 'Graving', oppgjoersform: 'regningsarbeid', betegnelse: 'P2' }],
        trekker: [poster[0]],
      },
    });
    s.send(
      'BH',
      lagtTil(sendtV1, [
        svar(
          'vederlag',
          v1,
          { kravposter: poster.map((gjelder) => ({ gjelder, aksepterer: true })) },
          { resultat: 'godkjent', godkjent_beloep: 0 },
          null
        ),
      ])
    );
    const { svar: svarene, svarUtenforRekken } = s.u().spor.vederlag;
    const svaret = [...svarene, ...svarUtenforRekken].find((x) => x.gjelder === v1)!;
    expect(svaret.beslutningsgrunnlag.sammenfall).toBe(!medSvaret);
  });
});

describe('brevet med svaret på varselet (VS-U77 punkt 30–34, VS-U79)', () => {
  it('etter punkt 34.3.3 står innsigelsen prinsipalt og justeringen subsidiært, med lagslinjen til innsigelsen (punkt 30, VS-U4, LV-U34)', () => {
    const { s, varsel } = medVarsel('34.3.3');
    s.send('BH', brev(varsel, { varslet_i_tide: false, godtar_justering: false }));
    const rad = s.journal.at(-1)!;
    expect(rad.data.brevtittel).toBe('Svar på varsel om justering av enhetsprisene i sak KOE-17');
    expect(laast(rad)).toEqual([
      'Byggherren svarer på totalentreprenørens varsel om justering av enhetsprisene etter NS 8407 punkt\u00a034.3.3 første ledd for arbeidet «Graving ved kum 4» i brev K201-KOE-017-02 av 3. oktober 2026.',
      '1. Varselet om justering av enhetsprisene (punkt\u00a034.3.3)\n\nPrinsipalt\n\nByggherren gjør gjeldende at varselet kom for sent, og at totalentreprenøren bare har krav på den justeringen av enhetsprisene byggherren måtte forstå at forholdet ville føre til.',
      // LV-U79: lagslinjen nevner innsigelsen med navn.
      `2. Justering av enhetsprisene (punkt\u00a034.3.2)\n\nSubsidiært, hvis ${MOT.varselet('34.3.3')} ikke fører frem\n\nByggherren bestrider at enhetsprisene skal justeres (punkt\u00a034.3.2).`,
      FORBEHOLDET_I_PUNKT(3),
    ]);
  });

  it('etter punkt 34.3.3 kan et nytt svar gi opp innsigelsen og godta justeringen, uten lag (punkt 30, 33 og svar 3 A)', () => {
    const { s, varsel } = medVarsel('34.3.3');
    s.send('BH', brev(varsel, { varslet_i_tide: false, godtar_justering: false }));
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.vederlag.svarPaaVarsler[0].id,
      svar: svar('vederlag', varsel, { varslet_i_tide: true, godtar_justering: true }, {}, null),
    });
    expect(laast(s.journal.at(-1)!).slice(0, 3)).toEqual([
      'Byggherren svarer på totalentreprenørens varsel om justering av enhetsprisene etter NS 8407 punkt\u00a034.3.3 første ledd for arbeidet «Graving ved kum 4» i brev K201-KOE-017-02 av 3. oktober 2026. Dette er byggherrens nye svar. Byggherrens forrige svar står i brev K201-KOE-017-03 av 4. oktober 2026.',
      '1. Varselet om justering av enhetsprisene (punkt\u00a034.3.3)\n\nByggherren gir opp innsigelsen i brev K201-KOE-017-03 av 4. oktober 2026 og gjør ikke gjeldende at varselet kom for sent.',
      '2. Justering av enhetsprisene (punkt\u00a034.3.2)\n\nByggherren godtar at enhetsprisene justeres (punkt\u00a034.3.2). Det godkjenner ikke priser, mengder eller beløp.',
    ]);
  });

  it('etter punkt 34.4 sier brevet at varselet kom for sent, og et nytt svar gir opp innsigelsen uttrykkelig (punkt 31 og 33)', () => {
    const { s, varsel } = medVarsel('34.4');
    s.send('BH', brev(varsel, { varslet_i_tide: false }));
    const rad = s.journal.at(-1)!;
    expect(rad.data.brevtittel).toBe('Svar på varsel om regningsarbeid i sak KOE-17');
    expect(laast(rad)).toEqual([
      'Byggherren svarer på totalentreprenørens varsel om regningsarbeid etter NS 8407 punkt\u00a034.4 for arbeidet «Graving ved kum 4» i brev K201-KOE-017-02 av 3. oktober 2026.',
      '1. Varselet om regningsarbeid (punkt\u00a034.4)\n\nByggherren gjør gjeldende at varselet kom for sent.',
      FORBEHOLDET_I_PUNKT(2),
    ]);
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.vederlag.svarPaaVarsler[0].id,
      svar: svar('vederlag', varsel, { varslet_i_tide: true }, {}, null),
    });
    expect(laast(s.journal.at(-1)!)[1]).toBe(
      '1. Varselet om regningsarbeid (punkt\u00a034.4)\n\nByggherren gir opp innsigelsen i brev K201-KOE-017-03 av 4. oktober 2026 om at varselet kom for sent.'
    );
  });

  it.each([
    ['viser til innsigelsen i svaret på varselet', true],
    ['kontrollsak: uten svaret på varselet viser det ikke til noe', false],
  ])(
    'svaret på kravposten som gjentar innsigelsen etter punkt 34.3.3, %s (punkt 34)',
    (_, medSvaret) => {
      const { s, varsel } = medVarsel('34.3.3');
      if (medSvaret) s.send('BH', brev(varsel, { varslet_i_tide: false, godtar_justering: false }));
      s.send(
        'TE',
        vederlagskrav([
          {
            beskrivelse: 'Spunt',
            oppgjoersform: 'enhetspriser',
            justert: true,
            varsel: { art: 'gitt', varsel },
          },
        ])
      );
      const post = (s.u().spor.vederlag.gjeldendeKrav!.innhold.kravposter as { id: string }[])[0]
        .id;
      s.send(
        'BH',
        brev(
          s.krav('vederlag'),
          {
            kravposter: [
              { gjelder: post, aksepterer: true, varslet_i_tide: false, godtar_justering: true },
            ],
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 0 }
        )
      );
      const varselet = laast(s.journal.at(-1)!)[1];
      const om =
        'varselet om justering av enhetsprisene etter punkt\u00a034.3.3 første ledd for P1';
      expect(varselet).toContain(
        medSvaret
          ? `Byggherren gjør gjeldende at ${om} kom for sent, jf. innsigelsen i brev K201-KOE-017-03 av 4. oktober 2026, og at`
          : `Byggherren gjør gjeldende at ${om} kom for sent, og at`
      );
    }
  );

  it('svaret på kravposten etter punkt 34.4 kan gi opp innsigelsen i svaret på varselet (punkt 31 og 34)', () => {
    const { s, varsel } = medVarsel('34.4');
    s.send('BH', brev(varsel, { varslet_i_tide: false }));
    s.send(
      'TE',
      vederlagskrav([
        {
          beskrivelse: 'Pumping',
          oppgjoersform: 'regningsarbeid',
          varsel: { art: 'gitt', varsel },
        },
      ])
    );
    const post = (s.u().spor.vederlag.gjeldendeKrav!.innhold.kravposter as { id: string }[])[0].id;
    s.send(
      'BH',
      brev(
        s.krav('vederlag'),
        { kravposter: [{ gjelder: post, aksepterer: true, varslet_i_tide: true }] },
        { resultat: 'godkjent', godkjent_beloep: 0 }
      )
    );
    // MM-U50: med ordene i svaret på varselet, som sa «kom for sent».
    expect(laast(s.journal.at(-1)!)[1]).toContain(
      'Byggherren gir opp innsigelsen i brev K201-KOE-017-03 av 4. oktober 2026 om at varselet om regningsarbeid etter NS 8407 punkt\u00a034.4 for P1 kom for sent.'
    );
  });
});

describe('svaret på varselet etter et avslått forhold (VS-U4, OV-U32, LV-U34)', () => {
  it('lagene i svaret på varselet står etter avslaget av forholdet, i brevet som i linjen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
      ],
    });
    s.send('TE', sendVarsel('34.3.3'));
    const varsel = s.u().spor.vederlag.kravpostvarsler.at(-1)!.id;
    s.send('BH', brev(varsel, { varslet_i_tide: false, godtar_justering: false }));
    expect(laast(s.journal.at(-1)!).slice(1)).toEqual([
      '1. Forholdet\n\nPrinsipalt\n\nByggherren har avslått kravet på endringsordre i brev K201-KOE-017-02 av 3. oktober 2026.',
      `2. Varselet om justering av enhetsprisene (punkt\u00a034.3.3)\n\nSubsidiært, hvis ${MOT.forholdet} ikke fører frem\n\nByggherren gjør gjeldende at varselet kom for sent, og at totalentreprenøren bare har krav på den justeringen av enhetsprisene byggherren måtte forstå at forholdet ville føre til.`,
      `3. Justering av enhetsprisene (punkt\u00a034.3.2)\n\nVidere subsidiært, hvis heller ikke ${MOT.varselet('34.3.3')} fører frem\n\nByggherren bestrider at enhetsprisene skal justeres (punkt\u00a034.3.2).`,
    ]);
    expect(s.u().spor.vederlag.svarPaaVarsler[0].beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: subsidiært varselet etter punkt\u00a034.3.3 kom for sent, videre subsidiært justeringen av enhetsprisene bestridt (punkt\u00a034.3.2).'
    );
  });
});

describe('leseren kontrollerer svaret på varselet (MM-U2, VS-U79)', () => {
  const svarIRaden = (rad: { data: Data }) => (rad.data.svar as Data[])[0];

  it.each([
    ['et standpunkt etter en annen bestemmelse enn varselet gjør saken ikke forstått', true],
    ['kontrollsak: standpunktet etter bestemmelsen for varselet', false],
  ])('%s', (_, endret) => {
    const { s, varsel } = medVarsel('34.4');
    s.send('BH', brev(varsel, { varslet_i_tide: false }));
    if (endret) (svarIRaden(s.journal.at(-1)!).standpunkter as Data[])[0].hjemmel = '34.3.3';
    expect(s.u().forstaatt).toBe(!endret);
  });

  it.each([
    ['et svar som erstatter et svar som alt er erstattet, gjør saken ikke forstått', true],
    ['kontrollsak: hvert nytt svar erstatter det forrige', false],
  ])('%s (VS-U77 punkt 33)', (_, endret) => {
    const { s, varsel } = medVarsel('34.4');
    s.send('BH', brev(varsel, { varslet_i_tide: false }));
    const foerste = s.u().spor.vederlag.svarPaaVarsler[0].id;
    const nytt = (vurderinger: Data) => ({
      type: 'revisjon',
      erstatter: s.u().spor.vederlag.svarPaaVarsler.at(-1)!.id,
      svar: svar('vederlag', varsel, vurderinger, {}, null),
    });
    s.send('BH', nytt({ varslet_i_tide: true }));
    s.send('BH', nytt({ varslet_i_tide: false }));
    if (endret) svarIRaden(s.journal.at(-1)!).erstatter = foerste;
    expect(s.u().forstaatt).toBe(!endret);
  });
});

describe('svaret på varselet etter punkt 34.1.2 eller 34.1.3 som står alene (VS-U87 punkt 32 og 33, #2409)', () => {
  /** Forholdet i brev 1, svikt eller endring (OV-U89 punkt 13), og varselet i brev 2. */
  function medVarselEtter(hjemmel: '34.1.2' | '34.1.3', hovedkategori: 'svikt' | 'endring') {
    const s = sak();
    s.send(
      'TE',
      hovedkategori === 'svikt'
        ? {
            ...PAABEROPELSE,
            innhold: { hovedkategori, underkategori: 'medvirkning', ...KLAR_OVER },
          }
        : PAABEROPELSE
    );
    s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel }] });
    const varsel = s.u().spor.vederlag.varsler[hjemmel]!.id;
    return { s, varsel };
  }

  it.each([
    [
      '34.1.2',
      'Svar på varsel om vederlagsjustering i sak KOE-17',
      'om vederlagsjustering etter NS 8407 punkt 34.1.2',
      'Varselet om vederlagsjustering (punkt 34.1.2)',
      '',
    ],
    [
      '34.1.3',
      'Svar på varsel om særskilt vederlagsjustering i sak KOE-17',
      'om særskilt justering for nedsatt produktivitet eller forstyrrelser etter NS 8407 punkt 34.1.3 tredje ledd',
      'Varselet om særskilt vederlagsjustering (punkt 34.1.3)',
      ', og at totalentreprenøren har tapt retten til å påberope seg påløpte utgifter som grunnlag for kravet',
    ],
  ] as const)(
    'byggherren kan si at varselet etter punkt %s kom for sent, og et nytt svar gir opp innsigelsen uttrykkelig (punkt 32 og 33)',
    (hjemmel, tittel, om, overskrift, tap) => {
      const { s, varsel } = medVarselEtter(hjemmel, 'svikt');
      expect(handlinger(s.u(), 'BH')).toContain(`svare:${varsel}`);
      s.send('BH', brev(varsel, { varslet_i_tide: false }));
      const [svaret] = s.u().spor.vederlag.svarPaaVarsler;
      expect(svaret.gjelder).toBe(varsel);
      expect(svaret.standpunkter).toEqual([
        expect.objectContaining({ art: 'rettidighet', gjelder: varsel, hjemmel, iTide: false }),
      ]);
      expect(s.u().spor.vederlag.svar, 'svaret på varselet er ikke et svar på et krav').toEqual([]);
      expect(svaret.beslutningsgrunnlag.sammenfall).toBe(false);
      const rad = s.journal.at(-1)!;
      expect(rad.data.brevtittel).toBe(tittel);
      expect(laast(rad).slice(0, 2)).toEqual([
        `Byggherren svarer på totalentreprenørens varsel ${om} i brev K201-KOE-017-02 av 3. oktober 2026.`,
        `1. ${overskrift}\n\nByggherren gjør gjeldende at varselet kom for sent${tap}.`,
      ]);
      expect(handlinger(s.u(), 'BH')).toContain(`revidere:${varsel}`);
      s.send('BH', {
        type: 'revisjon',
        erstatter: svaret.id,
        svar: svar('vederlag', varsel, { varslet_i_tide: true }, {}, null),
      });
      expect(laast(s.journal.at(-1)!)[1]).toBe(
        `1. ${overskrift}\n\nByggherren gir opp innsigelsen i brev K201-KOE-017-03 av 4. oktober 2026 og gjør ikke gjeldende at varselet kom for sent.`
      );
    }
  );

  it('svaret sier uttrykkelig at varselet kom i tide, uten en innsigelse å gi opp (punkt 32)', () => {
    const { s, varsel } = medVarselEtter('34.1.2', 'svikt');
    s.send('BH', brev(varsel, { varslet_i_tide: true }));
    expect(laast(s.journal.at(-1)!)[1]).toBe(
      '1. Varselet om vederlagsjustering (punkt 34.1.2)\n\nByggherren gjør ikke gjeldende at varselet kom for sent.'
    );
    expect(s.u().spor.vederlag.svarPaaVarsler[0].beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: varselet etter punkt 34.1.2 kom i tide.'
    );
  });

  it.each([
    ['uten standpunktet til varselet', {}, 'varselet.varslet_i_tide'],
    [
      'med standpunktet til justeringen',
      { varslet_i_tide: false, godtar_justering: true },
      'varselet.godtar_justering',
    ],
  ])('svaret %s avvises (punkt 32)', (_, vurderinger, felt) => {
    const { s, varsel } = medVarselEtter('34.1.3', 'svikt');
    expect(s.avvisning('BH', brev(varsel, vurderinger))?.melding ?? '').toContain(felt);
  });

  it.each([
    ['34.1.2', 'VARSLINGSPLIKT_GJELDER_IKKE'],
    ['34.1.3', null],
  ] as const)(
    'der saken gjelder en endring, avvises svaret på varselet etter punkt %s når punkt 34.1.2 ikke krever varsel (OV-U89 punkt 13)',
    (hjemmel, kode) => {
      const { s, varsel } = medVarselEtter(hjemmel, 'endring');
      expect(s.avvist('BH', brev(varsel, { varslet_i_tide: false }))).toBe(kode);
    }
  );

  it.each([
    ['34.1.2', tilbud(125000), 'VEDERLAGSKRAV_SENDT'],
    ['34.1.3', tilbud(125000), null],
    [
      '34.1.3',
      tilbud(125000, { saerskilt: { produktivitet: { beloep: 40000 } } }),
      'VARSELET_GJELDER_ET_SENDT_KRAV',
    ],
  ] as const)(
    'svaret på varselet etter punkt %s etter et vederlagskrav (punkt 33)',
    (hjemmel, innhold, kode) => {
      const { s, varsel } = medVarselEtter(hjemmel, 'svikt');
      s.send('TE', { type: 'krav', spor: 'vederlag', innhold });
      expect(s.avvist('BH', brev(varsel, { varslet_i_tide: false }))).toBe(kode);
      expect(handlinger(s.u(), 'BH').includes(`svare:${varsel}`)).toBe(kode === null);
    }
  );
});

describe('innsigelsen i svaret på varselet etter punkt 34.1.2 eller 34.1.3 står mot svaret på kravet (VS-U87 punkt 9, 10, 12 og 34, #2429)', () => {
  /** Forholdet (svikt) i brev 1 og varselet i brev 2, med svaret på varselet i brev 3 når `forSent`. */
  function medInnsigelsen(hjemmel: '34.1.2' | '34.1.3', forSent: boolean) {
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
    });
    s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel }] });
    const varsel = s.u().spor.vederlag.varsler[hjemmel]!.id;
    if (forSent) s.send('BH', brev(varsel, { varslet_i_tide: false }));
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(
        125000,
        hjemmel === '34.1.3' ? { saerskilt: { produktivitet: { beloep: 40000 } } } : {}
      ),
    });
    return s;
  }

  /** Svaret på gjeldende vederlagskrav, med resultatet kjernen regner ut. */
  function svarPaaKravet(s: ReturnType<typeof sak>, vurderinger: Data) {
    const u = s.u();
    const k = u.spor.vederlag.gjeldendeKrav!;
    const v = {
      ...vurderinger,
      kravposter: kravposterI(k).map((p) => ({
        gjelder: p.id,
        aksepterer: true,
        vurdering: 'godkjent',
        godkjent_beloep: p.beloep,
      })),
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
      if ('subsidiaert_godkjent_beloep' in r)
        resultat.subsidiaert_godkjent_beloep = r.subsidiaert_godkjent_beloep;
      if ('poster' in r) resultat.poster = r.poster;
    } catch (e) {
      if (!(e instanceof UgyldigVurdering)) throw e;
    }
    return { type: 'brev', svar: [svar('vederlag', k.id, v, resultat, null)] };
  }

  const feltet = {
    '34.1.2': 'hovedkrav_varslet_i_tide',
    '34.1.3': 'produktivitet_varslet_i_tide',
  } as const;
  /** Svaret på kravet med standpunktet `iTide` til varselet, eller uten det. */
  const vurderingene = (hjemmel: '34.1.2' | '34.1.3', iTide?: boolean): Data => ({
    ...(hjemmel === '34.1.3'
      ? {
          hovedkrav_varslet_i_tide: true,
          produktivitet_vurdering: 'godkjent',
          ...(iTide === false ? { produktivitet_begrenset_beloep: 10000 } : {}),
        }
      : {}),
    ...(iTide === undefined ? {} : { [feltet[hjemmel]]: iTide }),
  });
  const omVarselet = {
    '34.1.2': 'varselet om vederlagsjustering etter NS 8407 punkt\u00a034.1.2',
    '34.1.3':
      // LV-U34: «NS 8407» står bare første gang, i punktet om varselet etter punkt 34.1.2.
      'varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter punkt\u00a034.1.3 tredje ledd',
  } as const;
  const brev2 = 'brev K201-KOE-017-02 av 3. oktober 2026';
  const brev3 = 'brev K201-KOE-017-03 av 4. oktober 2026';
  const brevet = (s: ReturnType<typeof sak>) => laast(s.journal.at(-1)!).join('\n\n');

  it.each(['34.1.2', '34.1.3'] as const)(
    'etter punkt %s avvises et svar fra løsningen på kravet som ikke sier noe om varselet, mens innsigelsen i svaret på varselet står (punkt 9; utregningen krever standpunktet)',
    (hjemmel) => {
      const s = medInnsigelsen(hjemmel, true);
      const avvisning = s.avvisning('BH', svarPaaKravet(s, vurderingene(hjemmel)));
      expect(avvisning?.regel).toBe('UGYLDIG_VURDERING');
      expect(avvisning?.melding).toContain(`${feltet[hjemmel]}: mangler (punkt ${hjemmel})`);
      expect(
        s.avvisning('BH', svarPaaKravet(s, vurderingene(hjemmel, false))),
        'kontrollsak'
      ).toBeNull();
    }
  );

  it.each(['34.1.2', '34.1.3'] as const)(
    'etter punkt %s viser svaret på kravet til innsigelsen i svaret på varselet og gjentar den (punkt 9 og 34)',
    (hjemmel) => {
      const s = medInnsigelsen(hjemmel, true);
      s.send('BH', svarPaaKravet(s, vurderingene(hjemmel, false)));
      expect(brevet(s)).toContain(
        `Byggherren gjør gjeldende at ${omVarselet[hjemmel]} i ${brev2} kom for sent, jf. innsigelsen i ${brev3}`
      );
    }
  );

  it.each([
    ['34.1.2', true],
    ['34.1.2', false],
    ['34.1.3', true],
    ['34.1.3', false],
  ] as const)(
    'etter punkt %s gir svaret på kravet opp innsigelsen i svaret på varselet uttrykkelig (punkt 10 og 12; %s; kontrollsak uten innsigelse)',
    (hjemmel, forSent) => {
      const s = medInnsigelsen(hjemmel, forSent);
      s.send('BH', svarPaaKravet(s, vurderingene(hjemmel, true)));
      const ikke = `og gjør ikke gjeldende at ${omVarselet[hjemmel]} i ${brev2} kom for sent.`;
      if (forSent) expect(brevet(s)).toContain(`Byggherren gir opp innsigelsen i ${brev3} ${ikke}`);
      else {
        expect(brevet(s)).toContain(`Byggherren gjør ikke gjeldende at ${omVarselet[hjemmel]}`);
        expect(brevet(s)).not.toContain('gir opp innsigelsen');
      }
    }
  );

  it('etter at svaret på kravet har gitt opp innsigelsen, viser svaret på neste kravversjon ikke til den (punkt 10 og 12)', () => {
    const s = medInnsigelsen('34.1.2', true);
    s.send('BH', svarPaaKravet(s, vurderingene('34.1.2', true)));
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(130000) });
    s.send('BH', svarPaaKravet(s, vurderingene('34.1.2', false)));
    expect(brevet(s)).toContain(
      `Byggherren gjør gjeldende at ${omVarselet['34.1.2']} i ${brev2} kom for sent`
    );
    expect(brevet(s)).not.toContain('jf. innsigelsen');
  });

  it('en gjentakelse i svaret på kravet står mot neste kravversjon med brevet innsigelsen først ble gjort gjeldende i (punkt 6 og 34)', () => {
    const s = medInnsigelsen('34.1.2', true);
    s.send('BH', svarPaaKravet(s, vurderingene('34.1.2', false)));
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(130000) });
    s.send('BH', svarPaaKravet(s, vurderingene('34.1.2', false)));
    expect(brevet(s)).toContain(`jf. innsigelsen i ${brev3}`);
  });

  it('svaret på kravet gir opp innsigelsen i svaret på varselet og tolker ikke den egne innsigelsen etter punkt 5 (punkt 10, VS-U89)', () => {
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
    });
    s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '34.1.2' }] });
    const varsel = s.u().spor.vederlag.varsler['34.1.2']!.id;
    s.send('BH', brev(varsel, { varslet_i_tide: false }));
    s.send('BH', { type: 'innsigelse', gjelder: varsel });
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    s.send('BH', svarPaaKravet(s, vurderingene('34.1.2', true)));
    expect(brevet(s)).toContain(
      `Byggherren gir opp innsigelsen i ${brev3} og gjør ikke gjeldende at ${omVarselet['34.1.2']} i ${brev2} kom for sent.`
    );
    expect(brevet(s)).not.toContain('punkt\u00a05');
  });

  it('en innsigelse som først står i svaret på kravet, leses ikke som innsigelsen i svaret på varselet (E11 i VS-U87)', () => {
    const s = medInnsigelsen('34.1.2', false);
    s.send('BH', svarPaaKravet(s, vurderingene('34.1.2', false)));
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(130000) });
    s.send('BH', svarPaaKravet(s, vurderingene('34.1.2', true)));
    expect(brevet(s)).not.toContain('gir opp innsigelsen');
  });
});
