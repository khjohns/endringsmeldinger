/**
 * Byggherrens svar på et varsel etter punkt 34.3.3 første ledd eller 34.4 som står alene (G-9 i
 * BF-14, #2177). Svaret er et vanlig svar i sporet vederlag, og `gjelder` er varselet (VS-U79).
 * Innholdet står i VS-U77 punkt 30–35.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { handlinger } from '../kommandoer/handlinger.ts';
import { PAABEROPELSE, sak, svar, type Data } from './brevsak.ts';

const sendVarsel = (hjemmel: '34.3.3' | '34.4') => ({
  type: 'send_varsel',
  spor: 'vederlag',
  hjemmel,
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
        { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true, varsel },
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
      vederlagskrav([{ beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid', varsel }])
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
