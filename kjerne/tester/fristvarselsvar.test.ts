/**
 * Byggherrens svar på varselet om fristforlengelse etter punkt 33.4 som står alene (#2456, K3).
 * Svaret er et svar i sporet frist, og `gjelder` er varselet (VS-U79). Innholdet står i VS-U96
 * punkt 31–34.
 */

import { describe, expect, it } from 'vitest';
import { elementenesSpor, handlinger } from '../kommandoer/handlinger.ts';
import { regnUtSvar } from '../frosset/utregning.ts';
import { KJERNE } from '../versjon.ts';
import { lagForUtkastet } from '../kommandoer/lag.ts';
import type { Svarutkast } from '../kommandoer/kommando.ts';
import { innsigelsenMotFristvarselet } from '../spor/frist/kommando.ts';
import { standpunkterISvaret } from '../format/leser.ts';
import { Uforstaatt } from '../format/skjema.ts';
import { FRISTKRAV, laast, medFristen, PAABEROPELSE, sak, svar, type Data } from './brevsak.ts';

const brev2 = 'brev K201-KOE-017-02 av 3. oktober 2026';
const brev3 = 'brev K201-KOE-017-03 av 4. oktober 2026';
const OVERSKRIFT = '1. Varselet om fristforlengelse (punkt\u00a033.4)';

/** Forholdet i brev 1 og varselet etter § 33.4 i brev 2. */
function medVarselet() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '33.4' }] });
  const varsel = s.u().spor.frist.varsler['33.4']!.id;
  return { s, varsel };
}

const paaVarselet = (varsel: string, v: Data) => ({
  type: 'brev',
  svar: [svar('frist', varsel, v, {}, null)],
});

/** Kravet om fristforlengelse, uten varsel i kravskjemaet: varselet står alt i saken. */
const FRISTKRAVET = {
  type: 'krav',
  spor: 'frist',
  innhold: FRISTKRAV.innhold,
  utdypning: 'Fire uker.',
};

/** Svaret på gjeldende fristkrav med standpunktet `iTide` etter § 33.4, og resultatet kjernen regner ut. */
function svarPaaKravet(s: ReturnType<typeof sak>, iTide: boolean) {
  const u = s.u();
  const k = u.spor.frist.gjeldendeKrav!;
  const v = medFristen({
    frist_varsel_ok: iTide,
    spesifisert_krav_ok: true,
    vilkar_oppfylt: true,
    dager: 20,
  });
  const r = regnUtSvar(
    'frist',
    v,
    { krav: k, paaberopelse: u.spor.forhold.gjeldendeKrav },
    KJERNE.regler
  );
  return { type: 'brev', svar: [svar('frist', k.id, v, r as unknown as Data, null)] };
}

const brevet = (s: ReturnType<typeof sak>) => laast(s.journal.at(-1)!).join('\n\n');

describe('svaret på varselet etter punkt 33.4 som står alene (VS-U96 punkt 32 og 33)', () => {
  it('byggherren får tilbud om å svare på varselet, ikke om å erstatte et svar som ikke finnes', () => {
    const { s, varsel } = medVarselet();
    expect(handlinger(s.u(), 'BH')).toContain(`svare:${varsel}`);
    expect(handlinger(s.u(), 'BH')).not.toContain(`revidere:${varsel}`);
    expect(handlinger(s.u(), 'TE')).not.toContain(`svare:${varsel}`);
  });

  it('byggherren kan si at varselet kom for sent; svaret er et svar i fristen på varselet, ikke på et krav (punkt 32, VS-U79)', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    const [svaret] = s.u().spor.frist.svarPaaVarsler;
    expect(svaret.gjelder).toBe(varsel);
    expect(svaret.standpunkter).toEqual([
      expect.objectContaining({
        art: 'rettidighet',
        gjelder: varsel,
        hjemmel: '33.4',
        iTide: false,
      }),
    ]);
    expect(s.u().spor.frist.svar, 'svaret på varselet er ikke et svar på et krav').toEqual([]);
    expect(svaret.beslutningsgrunnlag.sammenfall).toBe(false);
    expect(elementenesSpor(s.u()).get(svaret.id)).toBe('frist');
    const rad = s.journal.at(-1)!;
    expect(rad.data.brevtittel).toBe('Svar på varsel om fristforlengelse i sak KOE-17');
    expect(laast(rad).slice(0, 2)).toEqual([
      `Byggherren svarer på totalentreprenørens varsel om fristforlengelse etter NS 8407 punkt\u00a033.4 i ${brev2}.`,
      `${OVERSKRIFT}\n\nByggherren gjør gjeldende at varselet kom for sent.`,
    ]);
  });

  it('byggherren kan si at varselet kom i tide (punkt 32, #2456 svar 1 A)', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: true }));
    expect(laast(s.journal.at(-1)!)[1]).toBe(
      `${OVERSKRIFT}\n\nByggherren gjør ikke gjeldende at varselet kom for sent.`
    );
    expect(s.u().spor.frist.svarPaaVarsler[0].beslutningsgrunnlag.linje).toBe(
      'Byggherrens standpunkt: varselet etter punkt\u00a033.4 kom i tide.'
    );
  });

  it('et nytt svar på varselet erstatter det forrige og gir opp innsigelsen uttrykkelig (punkt 32 og 33)', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    const [svaret] = s.u().spor.frist.svarPaaVarsler;
    expect(handlinger(s.u(), 'BH')).toContain(`revidere:${varsel}`);
    expect(handlinger(s.u(), 'BH')).not.toContain(`svare:${varsel}`);
    expect(s.avvist('BH', paaVarselet(varsel, { varslet_i_tide: true }))).toBe('ALLEREDE_SVART');
    s.send('BH', {
      type: 'revisjon',
      erstatter: svaret.id,
      svar: svar('frist', varsel, { varslet_i_tide: true }, {}, null),
    });
    expect(laast(s.journal.at(-1)!)[1]).toBe(
      `${OVERSKRIFT}\n\nByggherren gir opp innsigelsen i ${brev3} og gjør ikke gjeldende at varselet kom for sent.`
    );
    expect(s.u().spor.frist.svarPaaVarsler.map((x) => x.erstatter)).toEqual([null, svaret.id]);
  });

  it.each([
    ['uten standpunktet til varselet', {}, 'varselet.varslet_i_tide: mangler'],
    [
      'med et felt kjernen ikke leser',
      { varslet_i_tide: false, godtar_justering: true },
      'varselet.godtar_justering',
    ],
    [
      'med et standpunkt som verken er true eller false',
      { varslet_i_tide: 'nei' },
      'varselet.varslet_i_tide: er verken true eller false',
    ],
  ])('svaret %s avvises (punkt 32)', (_, vurderinger, melding) => {
    const { s, varsel } = medVarselet();
    const a = s.avvisning('BH', paaVarselet(varsel, vurderinger));
    expect(a?.regel).toBe('UGYLDIG_VURDERING');
    expect(a?.melding).toContain(melding);
  });

  it('svaret kan gis etter kravet om fristforlengelse, til byggherren har svart på det (punkt 33)', () => {
    const { s, varsel } = medVarselet();
    s.send('TE', FRISTKRAVET);
    expect(handlinger(s.u(), 'BH')).toContain(`svare:${varsel}`);
    expect(s.avvist('BH', paaVarselet(varsel, { varslet_i_tide: false }))).toBeNull();
    s.send('BH', svarPaaKravet(s, true));
    expect(handlinger(s.u(), 'BH')).not.toContain(`svare:${varsel}`);
    expect(s.avvist('BH', paaVarselet(varsel, { varslet_i_tide: false }))).toBe(
      'KRAVET_ER_BESVART'
    );
  });

  it('det nye svaret på varselet kan sendes til byggherren har svart på kravet (punkt 33)', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    const [svaret] = s.u().spor.frist.svarPaaVarsler;
    const nytt = {
      type: 'revisjon',
      erstatter: svaret.id,
      svar: svar('frist', varsel, { varslet_i_tide: true }, {}, null),
    };
    s.send('TE', FRISTKRAVET);
    expect(s.avvist('BH', nytt)).toBeNull();
    s.send('BH', svarPaaKravet(s, false));
    expect(handlinger(s.u(), 'BH')).not.toContain(`revidere:${varsel}`);
    expect(s.avvist('BH', nytt)).toBe('KRAVET_ER_BESVART');
  });

  it('svaret på varselet med en akseptfrist avvises, fordi det ikke godkjenner dager (HF-U23, punkt 32)', () => {
    const { s, varsel } = medVarselet();
    const medFrist = paaVarselet(varsel, { varslet_i_tide: false });
    (medFrist.svar[0] as Data).akseptfrist = '2026-12-15';
    expect(s.avvist('BH', medFrist)).toBe('AKSEPTFRIST_IKKE_TILLATT');
  });

  it('et lagret svar på kravet uten utregning er ikke forstått (MM-U2); bare svaret på varselet har ingen utregning', () => {
    const rettidighet = {
      id: 'r',
      art: 'rettidighet',
      gjelder: 'v',
      hjemmel: '33.4',
      i_tide: false,
    };
    const dager = { id: 'd', art: 'dager', gjelder: 'f' };
    expect(() =>
      standpunkterISvaret('frist', { standpunkter: [rettidighet, dager], utregning: {} })
    ).toThrow(Uforstaatt);
    expect(
      standpunkterISvaret('frist', { standpunkter: [rettidighet], utregning: {} }),
      'kontrollsak: svaret på varselet'
    ).toHaveLength(1);
  });

  it('svaret kan ikke gis i vederlaget (VS-U79)', () => {
    const { s, varsel } = medVarselet();
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [svar('vederlag', varsel, { varslet_i_tide: false }, {}, null)],
      })
    ).not.toBeNull();
  });
});

describe('innsigelsen i svaret på varselet etter punkt 33.4 står mot svaret på kravet (VS-U96 punkt 7, 9, 10 og 34)', () => {
  /** Varselet i brev 2, svaret på det i brev 3 og kravet i brev 4. */
  function medInnsigelsen(iTide: boolean) {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: iTide }));
    s.send('TE', FRISTKRAVET);
    return s;
  }
  const omVarselet = `varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i ${brev2}`;

  it('svaret på kravet viser til innsigelsen i svaret på varselet og gjentar den (punkt 9 og 34)', () => {
    const s = medInnsigelsen(false);
    s.send('BH', svarPaaKravet(s, false));
    expect(brevet(s)).toContain(
      `Byggherren gjør gjeldende at ${omVarselet} kom for sent, jf. innsigelsen i ${brev3}`
    );
  });

  it('svaret på kravet gir opp innsigelsen i svaret på varselet uttrykkelig (punkt 10 og 34)', () => {
    const s = medInnsigelsen(false);
    s.send('BH', svarPaaKravet(s, true));
    expect(brevet(s)).toContain(
      `Byggherren gir opp innsigelsen i ${brev3} og gjør ikke gjeldende at ${omVarselet} kom for sent.`
    );
  });

  it('etter «i tide» i svaret på varselet viser svaret på kravet ikke til noen innsigelse (kontrollsak, punkt 8)', () => {
    const s = medInnsigelsen(true);
    s.send('BH', svarPaaKravet(s, true));
    expect(brevet(s)).toContain(`Byggherren gjør ikke gjeldende at ${omVarselet} kom for sent.`);
    expect(brevet(s)).not.toContain('gir opp innsigelsen');
  });
});

describe('innsigelsen mot varselet etter punkt 33.4 i skjemaet for svaret på kravet (VS-U96 punkt 34)', () => {
  const lagene = (s: ReturnType<typeof sak>, vurderinger: Data, sendt: string | null = null) =>
    lagForUtkastet(
      svar('frist', s.krav('frist'), vurderinger) as Svarutkast & { spor: 'frist' },
      s.u(),
      KJERNE.regler,
      sendt
    );
  const varselet = (s: ReturnType<typeof sak>, vurderinger: Data) =>
    lagene(s, vurderinger).standpunkter.find((l) => l.hjemmel === '33.4')!;

  it('innsigelsen i svaret på varselet står mot svaret på kravet, med brevet den ble gjort gjeldende i', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    s.send('TE', FRISTKRAVET);
    const { dokument } = s.u().spor.frist.svarPaaVarsler[0]!;
    expect(innsigelsenMotFristvarselet(s.u(), null)).toEqual({ gjelder: varsel, dokument });
  });

  it('svarutkastet gjentar innsigelsen som utgangspunkt: det ubesvarte spørsmålet om varselet står i første lag og rammer dagene', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    s.send('TE', FRISTKRAVET);
    const v = varselet(s, { frister: [{}] });
    expect(v.besvart, 'byggherren må fortsatt svare på spørsmålet').toBe(false);
    expect(v.virkning).toBe(1);
    expect(
      lagene(s, { frister: [{}] }).standpunkter.find((l) => l.art === 'dager')!.forutsetninger
    ).toContainEqual({ innsigelse: '33.4' });
  });

  it('svarutkastet som gir opp innsigelsen, har ikke virkningen (punkt 10)', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    s.send('TE', FRISTKRAVET);
    expect(varselet(s, { frist_varsel_ok: true, frister: [{}] }).virkning).toBe('uten_virkning');
  });

  it('innsigelsen i et svar på kravet står mot svaret på en ny kravversjon (punkt 7 og 9)', () => {
    const { s } = medVarselet();
    s.send('TE', FRISTKRAVET);
    s.send('BH', svarPaaKravet(s, false));
    const brev4 = s.u().spor.frist.svar[0]!.dokument;
    s.send('TE', { ...FRISTKRAVET, utdypning: 'Fem uker.' });
    expect(innsigelsenMotFristvarselet(s.u(), null)?.dokument).toBe(brev4);
    expect(varselet(s, { frister: [{}] }).virkning).toBe(1);
  });

  it('innsigelsen i svaret bare på varselet i kravet står mot svaret på kravet (punkt 34 og 38)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', FRISTKRAVET);
    const krav = s.u().spor.frist.gjeldendeKrav!.id;
    s.send('BH', {
      type: 'brev',
      svar: [{ ...svar('frist', krav, { varslet_i_tide: false }, {}, null), bare_varselet: true }],
    });
    expect(innsigelsenMotFristvarselet(s.u(), null)?.dokument).toBe(
      s.u().spor.frist.svarPaaVarsler[0]!.dokument
    );
    expect(varselet(s, { frister: [{}] }).virkning).toBe(1);
  });

  it('kontrollsak: uten innsigelse, eller etter «i tide» i svaret på varselet, regnes det ubesvarte spørsmålet som uten innsigelse (S1-A, punkt 8)', () => {
    for (const foer of [null, true]) {
      const { s, varsel } = medVarselet();
      if (foer !== null) s.send('BH', paaVarselet(varsel, { varslet_i_tide: foer }));
      s.send('TE', FRISTKRAVET);
      expect(innsigelsenMotFristvarselet(s.u(), null)).toBeNull();
      expect(varselet(s, { frister: [{}] }).virkning).toBe('uten_virkning');
    }
  });

  it('innsigelsen som er gitt opp i et nytt svar på varselet, står ikke (punkt 10 og 33)', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    const forrige = s.u().spor.frist.svarPaaVarsler[0]!.id;
    s.send('BH', {
      type: 'revisjon',
      erstatter: forrige,
      svar: svar('frist', varsel, { varslet_i_tide: true }, {}, null),
    });
    s.send('TE', FRISTKRAVET);
    expect(innsigelsenMotFristvarselet(s.u(), null)).toBeNull();
  });
});

describe('forespørselen etter punkt 33.6.2 fastholder innsigelsen i svaret på varselet etter punkt 33.4 (VS-U96 punkt 34, LV-U84 punkt 18)', () => {
  const foresporsel = { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' };

  it('forespørselen sier at byggherren fastholder innsigelsen, med brevet den ble gjort gjeldende i', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    s.send('BH', foresporsel);
    expect(brevet(s)).toContain(
      `Byggherren fastholder prinsipalt at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i ${brev2} kom for sent, jf. innsigelsen i ${brev3}. Forespørselen sendes for det tilfellet at innsigelsen ikke fører frem.`
    );
  });

  it('en innsigelse byggherren har gitt opp, fastholdes ikke (kontrollsak)', () => {
    const { s, varsel } = medVarselet();
    s.send('BH', paaVarselet(varsel, { varslet_i_tide: false }));
    const [svaret] = s.u().spor.frist.svarPaaVarsler;
    s.send('BH', {
      type: 'revisjon',
      erstatter: svaret.id,
      svar: svar('frist', varsel, { varslet_i_tide: true }, {}, null),
    });
    s.send('BH', foresporsel);
    expect(brevet(s)).not.toContain('fastholder');
  });
});
