/**
 * Byggherrens svar bare på varselet når kravet selv er varselet etter punkt 33.4, 34.3.3 første
 * ledd eller 34.4 (#2456, K2). Svaret har kravversjonen i `gjelder` og `bare_varselet: true`
 * (svaret på spørsmål 3 i #2456), og standpunktene viser til varselet som i svaret på kravet.
 * Innholdet står i VS-U96 punkt 31, 33, 34, 38 og 39.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { handlinger } from '../kommandoer/handlinger.ts';
import { regnUtSvar } from '../frosset/utregning.ts';
import { betegnelse } from '../utledning/visning.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import { KJERNE } from '../versjon.ts';
import { laast, medFristen, PAABEROPELSE, sak, svar, type Data } from './brevsak.ts';

const brev2 = 'brev K201-KOE-017-02 av 3. oktober 2026';
const brev3 = 'brev K201-KOE-017-03 av 4. oktober 2026';
const IKKE_TATT_STILLING = 'Byggherren har ikke tatt stilling til kravet.';

/** Fristkravet uten varsel før: kravet er varselet etter § 33.4 (VS-U96 punkt 7). */
const FRISTKRAVET = {
  type: 'krav',
  spor: 'frist',
  innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
  utdypning: 'Pelingen tar fire uker lenger.',
};

function medFristkravet() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  s.send('TE', FRISTKRAVET);
  return { s, krav: s.u().spor.frist.gjeldendeKrav!.id };
}

const bareVarselet = (spor: string, gjelder: string, v: Data) => ({
  ...svar(spor, gjelder, v, {}, null),
  bare_varselet: true,
});
const brev = (spor: string, gjelder: string, v: Data) => ({
  type: 'brev',
  svar: [bareVarselet(spor, gjelder, v)],
});

/** Svaret på gjeldende fristkrav med standpunktet `iTide` etter § 33.4. */
function svarPaaFristkravet(s: ReturnType<typeof sak>, iTide: boolean) {
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

const brevet = (s: ReturnType<typeof sak>) => laast(s.journal.at(-1)!);

describe('svaret bare på varselet etter punkt 33.4 når kravet er varselet (VS-U96 punkt 38 og 39)', () => {
  it('byggherren får tilbud om å svare bare på varselet i kravet, ved siden av svaret på kravet', () => {
    const { s, krav } = medFristkravet();
    expect(handlinger(s.u(), 'BH')).toEqual(
      expect.arrayContaining([`svare:${krav}`, 'svare:frist'])
    );
    expect(handlinger(s.u(), 'BH')).not.toContain(`revidere:${krav}`);
    expect(handlinger(s.u(), 'TE')).not.toContain(`svare:${krav}`);
  });

  it('svaret gjelder bare varselet, standpunktet viser til kravet, og kravet venter fortsatt på svar (punkt 38 og 39)', () => {
    const { s, krav } = medFristkravet();
    s.send('BH', brev('frist', krav, { varslet_i_tide: false }));
    const u = s.u();
    expect(u.spor.frist.svarPaaVarsler).toHaveLength(1);
    const [svaret] = u.spor.frist.svarPaaVarsler;
    expect(svaret.gjelder).toBe(krav);
    expect(svaret.bareVarselet).toBe(true);
    expect(svaret.standpunkter).toEqual([
      expect.objectContaining({ art: 'rettidighet', gjelder: krav, hjemmel: '33.4', iTide: false }),
    ]);
    expect(u.spor.frist.svar, 'svaret bare på varselet er ikke et svar på kravet').toEqual([]);
    expect(betegnelse(u, 'frist')).toBe('venter_paa_svar');
    expect(handlinger(u, 'BH')).toEqual(
      expect.arrayContaining([`revidere:${krav}`, 'svare:frist'])
    );
    expect(handlinger(u, 'BH')).not.toContain(`svare:${krav}`);
    expect(s.journal.at(-1)!.data.brevtittel).toBe(
      'Svar på varsel om fristforlengelse i sak KOE-17'
    );
    expect(brevet(s).slice(0, 2)).toEqual([
      `Byggherren svarer bare på varselet i totalentreprenørens krav om fristforlengelse i ${brev2}. ${IKKE_TATT_STILLING}`,
      `1. Varselet om fristforlengelse (punkt\u00a033.4)\n\nByggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i ${brev2} kom for sent.`,
    ]);
  });

  it('et nytt svar bare på varselet erstatter det forrige og gir opp innsigelsen uttrykkelig (punkt 33 og 38)', () => {
    const { s, krav } = medFristkravet();
    s.send('BH', brev('frist', krav, { varslet_i_tide: false }));
    expect(s.u().spor.frist.svarPaaVarsler).toHaveLength(1);
    const [forrige] = s.u().spor.frist.svarPaaVarsler;
    expect(s.avvist('BH', brev('frist', krav, { varslet_i_tide: true }))).toBe('ALLEREDE_SVART');
    s.send('BH', {
      type: 'revisjon',
      erstatter: forrige.id,
      svar: bareVarselet('frist', krav, { varslet_i_tide: true }),
    });
    expect(s.u().spor.frist.svarPaaVarsler.map((x) => x.erstatter)).toEqual([null, forrige.id]);
    expect(brevet(s)[1]).toContain(
      `Byggherren gir opp innsigelsen i ${brev3} og gjør ikke gjeldende at varselet om fristforlengelse`
    );
  });

  it('etter en ny kravversjon er det nye svaret bare på varselet en revisjon av det forrige (punkt 33 og 38, LV-U73)', () => {
    const { s, krav } = medFristkravet();
    s.send('BH', brev('frist', krav, { varslet_i_tide: false }));
    expect(s.u().spor.frist.svarPaaVarsler).toHaveLength(1);
    const [forrige] = s.u().spor.frist.svarPaaVarsler;
    s.send('TE', { ...FRISTKRAVET, innhold: { frister: [{ navn: 'Sluttfristen', dager: 25 }] } });
    const v2 = s.u().spor.frist.gjeldendeKrav!.id;
    expect(v2).not.toBe(krav);
    expect(handlinger(s.u(), 'BH')).toContain(`revidere:${v2}`);
    expect(handlinger(s.u(), 'BH')).not.toContain(`svare:${v2}`);
    expect(s.avvist('BH', brev('frist', v2, { varslet_i_tide: true }))).toBe('ALLEREDE_SVART');
    s.send('BH', {
      type: 'revisjon',
      erstatter: forrige.id,
      svar: bareVarselet('frist', v2, { varslet_i_tide: true }),
    });
    expect(s.u().forstaatt).toBe(true);
    expect(s.u().spor.frist.svarPaaVarsler.map((x) => [x.gjelder, x.erstatter])).toEqual([
      [krav, null],
      [v2, forrige.id],
    ]);
    expect(brevet(s)[0]).toContain('Dette er byggherrens nye svar.');
  });

  it('en revisjon av svaret bare på varselet uten feltet er en revisjon av svaret på kravet, som ikke finnes', () => {
    const { s, krav } = medFristkravet();
    s.send('BH', brev('frist', krav, { varslet_i_tide: false }));
    expect(s.u().spor.frist.svarPaaVarsler).toHaveLength(1);
    const [forrige] = s.u().spor.frist.svarPaaVarsler;
    expect(
      s.avvist('BH', {
        type: 'revisjon',
        erstatter: forrige.id,
        svar: svar('frist', krav, { varslet_i_tide: true }, {}, null),
      })
    ).not.toBeNull();
  });

  it('svaret på kravet viser til innsigelsen i svaret bare på varselet og gjentar den (punkt 34)', () => {
    const { s, krav } = medFristkravet();
    s.send('BH', brev('frist', krav, { varslet_i_tide: false }));
    s.send('BH', svarPaaFristkravet(s, false));
    expect(brevet(s).join('\n\n')).toContain(`kom for sent, jf. innsigelsen i ${brev3}`);
  });

  it('etter svaret på kravet tilbys ikke svaret bare på varselet, og det avvises (punkt 33)', () => {
    const { s, krav } = medFristkravet();
    s.send('BH', svarPaaFristkravet(s, true));
    expect(handlinger(s.u(), 'BH')).not.toContain(`svare:${krav}`);
    expect(s.avvist('BH', brev('frist', krav, { varslet_i_tide: false }))).toBe(
      'KRAVET_ER_BESVART'
    );
  });

  it('med et varsel etter punkt 33.4 før kravet er kravet ikke varselet, og svaret bare på varselet avvises (punkt 38, kontrollsak)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '33.4' }] });
    s.send('TE', FRISTKRAVET);
    const krav = s.u().spor.frist.gjeldendeKrav!.id;
    expect(handlinger(s.u(), 'BH')).not.toContain(`svare:${krav}`);
    expect(s.avvist('BH', brev('frist', krav, { varslet_i_tide: false }))).toBe('INGEN_VARSEL');
  });

  it('svaret bare på varselet med en akseptfrist avvises, fordi det ikke godkjenner dager (HF-U23)', () => {
    const { s, krav } = medFristkravet();
    const k = brev('frist', krav, { varslet_i_tide: false });
    (k.svar[0] as Data).akseptfrist = '2026-10-20';
    expect(s.avvist('BH', k)).toBe('AKSEPTFRIST_IKKE_TILLATT');
  });

  it('svaret bare på varselet i forholdet avvises (punkt 38 gjelder 33.4, 34.3.3 og 34.4)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = s.u().spor.forhold.gjeldendeKrav!.id;
    expect(s.avvist('BH', brev('forhold', krav, { varslet_i_tide: false }))).not.toBeNull();
  });
});

const vederlagskrav = (kravposter: Data[]) => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: { kravposter },
  utdypning: 'Totalentreprenørens begrunnelse for kravet.',
});
const REGNINGSARBEID = {
  beskrivelse: 'Pumping',
  oppgjoersform: 'regningsarbeid',
  varsel: { art: 'kravet' },
};
const JUSTERT = {
  beskrivelse: 'Graving',
  oppgjoersform: 'enhetspriser',
  justert: true,
  varsel: { art: 'kravet' },
};
const FAST = { beskrivelse: 'Rigg', oppgjoersform: 'tilbud', beloep: 10000 };

function medVederlagskravet(kravposter: Data[] = [REGNINGSARBEID, JUSTERT, FAST]) {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  s.send('TE', vederlagskrav(kravposter));
  const k = s.u().spor.vederlag.gjeldendeKrav!;
  return { s, krav: k.id, poster: kravposterI(k).map((p) => p.id) };
}

describe('svaret bare på varselet etter punkt 34.3.3 og 34.4 per kravpost (VS-U96 punkt 38 og 39)', () => {
  it('byggherren svarer bare på varselet for postene, og svaret er ikke et svar på kravet', () => {
    const { s, krav, poster } = medVederlagskravet();
    expect(handlinger(s.u(), 'BH')).toEqual(
      expect.arrayContaining([`svare:${krav}`, 'svare:vederlag'])
    );
    s.send(
      'BH',
      brev('vederlag', krav, {
        kravposter: [
          { gjelder: poster[0], varslet_i_tide: false },
          { gjelder: poster[1], varslet_i_tide: false, godtar_justering: true },
        ],
      })
    );
    const u = s.u();
    expect(u.spor.vederlag.svar).toEqual([]);
    expect(betegnelse(u, 'vederlag')).toBe('venter_paa_svar');
    const [svaret] = u.spor.vederlag.svarPaaVarsler;
    expect(svaret.bareVarselet).toBe(true);
    expect(svaret.standpunkter.map((p) => [p.art, 'gjelder' in p ? p.gjelder : null])).toEqual([
      ['rettidighet', poster[0]],
      ['rettidighet', poster[1]],
      ['justering', poster[1]],
    ]);
    expect(s.journal.at(-1)!.data.brevtittel).toBe(
      'Svar på varslene i krav om vederlagsjustering i sak KOE-17'
    );
    const [innledning, p1, p2] = brevet(s);
    expect(innledning).toBe(
      `Byggherren svarer bare på varselet i totalentreprenørens krav om justering av vederlaget i ${brev2}. ${IKKE_TATT_STILLING}`
    );
    // Punkt 31: i svaret på varselet sier byggherren at varselet etter § 34.4 kom for sent.
    expect(p1).toContain(
      'Byggherren gjør gjeldende at varselet om regningsarbeid etter NS 8407 punkt 34.4 for P1 kom for sent.'
    );
    // Punkt 30, VS-U4: justeringen står subsidiært til innsigelsen etter § 34.3.3.
    expect(p2).toContain('Subsidiært, hvis innsigelsen mot varselet etter punkt 34.3.3 for P2');
    expect(p2).toContain('Byggherren godtar at enhetsprisene for P2 justeres');
  });

  it('linja leser innsigelsen som står, for justeringen til hver kravpost (punkt 36 og 38, VS-U81)', () => {
    const { s, krav, poster } = medVederlagskravet([
      REGNINGSARBEID,
      JUSTERT,
      { ...JUSTERT, beskrivelse: 'Spunting' },
    ]);
    s.send(
      'BH',
      brev('vederlag', krav, {
        kravposter: [{ gjelder: poster[1], varslet_i_tide: false, godtar_justering: true }],
      })
    );
    expect(s.u().spor.vederlag.svarPaaVarsler).toHaveLength(1);
    const [forrige] = s.u().spor.vederlag.svarPaaVarsler;
    // Svaret lagt til tier om varselet for P2 og sier at varselet etter § 34.3.3 for P3 kom i tide.
    s.send('BH', {
      type: 'revisjon',
      erstatter: forrige.id,
      svar: bareVarselet('vederlag', krav, {
        kravposter: [
          { gjelder: poster[0], varslet_i_tide: false },
          { gjelder: poster[1], godtar_justering: true },
          { gjelder: poster[2], varslet_i_tide: true, godtar_justering: false },
        ],
      }),
      sendt: s.journal.at(-1)!.tidsstempel.slice(0, 10),
      korrespondansetype: 'e_post',
      beskrivelse: 'Svar på varselet',
      dokumentasjon: [randomUUID()],
    });
    const { linje } = s.u().spor.vederlag.svarPaaVarsler.at(-1)!.beslutningsgrunnlag;
    expect(linje).toContain('kom for sent, som gjort gjeldende i et tidligere svar');
    expect(linje).toContain('varselet etter punkt\u00a034.3.3 kom i tide');
  });

  it('en kravpost uten varselplikt eller som viser til et varsel i saken, er ikke med (punkt 38 og 23)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '34.4', arbeid: 'Pumping' }] });
    const varsel = s.u().spor.vederlag.kravpostvarsler.at(-1)!.id;
    s.send(
      'TE',
      vederlagskrav([{ ...REGNINGSARBEID, varsel: { art: 'gitt', varsel } }, JUSTERT, FAST])
    );
    const k = s.u().spor.vederlag.gjeldendeKrav!;
    const [p1, p2, p3] = kravposterI(k).map((p) => p.id);
    for (const gjelder of [p1, p3]) {
      const a = s.avvisning(
        'BH',
        brev('vederlag', k.id, { kravposter: [{ gjelder, varslet_i_tide: false }] })
      );
      expect(a?.regel).toBe('UGYLDIG_VURDERING');
      expect(a?.melding).toContain('kravet er ikke selv varselet for kravposten');
    }
    s.send(
      'BH',
      brev('vederlag', k.id, {
        kravposter: [{ gjelder: p2, varslet_i_tide: true, godtar_justering: true }],
      })
    );
    expect(s.u().spor.vederlag.svarPaaVarsler).toHaveLength(1);
  });

  it('uten kravpost som kravet er varselet for, tilbys ikke svaret og avvises (punkt 38, kontrollsak)', () => {
    const { s, krav, poster } = medVederlagskravet([FAST]);
    expect(handlinger(s.u(), 'BH')).not.toContain(`svare:${krav}`);
    expect(
      s.avvist(
        'BH',
        brev('vederlag', krav, { kravposter: [{ gjelder: poster[0], varslet_i_tide: false }] })
      )
    ).toBe('INGEN_VARSEL');
  });

  it('svaret uten standpunkt til noen kravpost avvises (punkt 38)', () => {
    const { s, krav } = medVederlagskravet();
    expect(s.avvisning('BH', brev('vederlag', krav, { kravposter: [] }))?.regel).toBe(
      'UGYLDIG_VURDERING'
    );
  });

  it('svaret på kravet etter svaret bare på varselet stenger svaret bare på varselet (punkt 33)', () => {
    const { s, krav, poster } = medVederlagskravet([REGNINGSARBEID]);
    s.send(
      'BH',
      brev('vederlag', krav, { kravposter: [{ gjelder: poster[0], varslet_i_tide: false }] })
    );
    expect(handlinger(s.u(), 'BH')).toContain(`revidere:${krav}`);
    const v = {
      kravposter: [{ gjelder: poster[0], aksepterer: true, varslet_i_tide: false }],
    };
    const u = s.u();
    const r = regnUtSvar(
      'vederlag',
      v,
      { krav: u.spor.vederlag.gjeldendeKrav!, paaberopelse: u.spor.forhold.gjeldendeKrav },
      KJERNE.regler
    );
    s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          krav,
          v,
          { resultat: r.resultat, godkjent_beloep: r.godkjent_beloep },
          null
        ),
      ],
    });
    expect(handlinger(s.u(), 'BH')).not.toContain(`revidere:${krav}`);
    expect(
      s.avvist(
        'BH',
        brev('vederlag', krav, { kravposter: [{ gjelder: poster[0], varslet_i_tide: true }] })
      )
    ).toBe('ALLEREDE_SVART');
  });
});
