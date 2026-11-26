/**
 * Innlegget i fritekst fra begge parter (#1377, BF-03). Forventningene står i BF-03 D-2, D-3,
 * D-4, D-6 og D-10, med vedtakene der: MM-U47 punkt 1–6, 10 og 12, MM-U44, MM-U56, GR-U27 og
 * LV-U53. Kontrollpunktet etter en endringsordre (G-5) venter på sperren i #1378 (G-13).
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { regnUtSvar } from '../frosset/utregning.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { sporetErLukket } from '../utledning/utled.ts';
import { KJERNE } from '../versjon.ts';
import { innholdssummen, medKravpostIder } from './klient.ts';
import { SOM_BREV } from './brevet.ts';
import {
  type Data,
  FRIST_FULLT,
  VEDERLAG_DELVIS,
  laast,
  medFristen,
  sak,
  sakMedKrav,
  svar,
  tekst,
} from './brevsak.ts';
import type { Journalrad } from '../typer.ts';

type Sak = ReturnType<typeof sak>;
type Sporet = 'forhold' | 'vederlag' | 'frist';

const VEDLEGGET = '7f1c2d3e-0000-4000-8000-000000001377';
const TEKSTEN = 'Varselet kom i tide. Vi viser til møtereferatet 12. september.';

const innlegg = (gjelder: string, ekstra: Data = {}): Data => ({
  type: 'innlegg',
  gjelder,
  tittel: 'Varselet om vederlagsjustering kom i tide',
  utdypning: TEKSTEN,
  ...ekstra,
});

const utregnet = (s: Sak, spor: Sporet, v: Data) => {
  const u = s.u();
  const krav = u.spor[spor].gjeldendeKrav!;
  const paaberopelse = u.spor.forhold.gjeldendeKrav;
  v = medKravpostIder(v, krav);
  return svar(
    spor,
    krav.id,
    v,
    regnUtSvar(spor, medFristen(v), { krav, paaberopelse }, KJERNE.regler)
  );
};

/** Saken med krav i alle tre spor, og byggherrens svar på dem i ett brev. */
function medSvaret(forholdet: Data = { resultat: 'godkjent', grunnlag_varslet_i_tide: true }) {
  const s = sakMedKrav();
  const brev = s.send('BH', {
    type: 'brev',
    svar: [
      utregnet(s, 'forhold', forholdet),
      utregnet(s, 'vederlag', VEDERLAG_DELVIS[0]),
      utregnet(s, 'frist', FRIST_FULLT[0]),
    ],
  });
  return { s, brev };
}

const godtar = (s: Sak, spor: Sporet) =>
  s.send('TE', {
    type: 'aksept',
    spor,
    svar: s.u().spor[spor].gjeldendeSvar!.id,
    regelversjon: KJERNE.regler.versjon,
  });

describe('innlegget er et eget brev med henvisning til ett brev i saken (BF-03 D-2, D-3)', () => {
  it('totalentreprenørens innlegg viser til byggherrens svar med merkingen og datoen, og teksten følger (MM-U47 punkt 2, LV-U53)', () => {
    const { s, brev } = medSvaret();
    const rad = s.send('TE', innlegg(brev.event_id, { dokumentasjon: [VEDLEGGET] }));
    expect(tekst(rad)).toEqual([
      {
        gjelder: (rad.data.utsagn as Data[])[0]!.id,
        laast: `Totalentreprenøren viser til brev ${brev.data.merking} av 5. oktober 2026:`,
        utdypning: TEKSTEN,
      },
      // A4 i paragrafmatrisen: vedleggene står til sist, som i de andre brevene.
      { gjelder: rad.event_id, laast: `Brevet har vedlegg: «${VEDLEGGET}.pdf».` },
    ]);
    expect(rad.data.utsagn).toEqual([
      { id: expect.any(String), art: 'innlegg', gjelder: brev.event_id },
    ]);
    expect(rad.data.brevtittel).toBe('Varselet om vederlagsjustering kom i tide i sak KOE-17');
    expect(rad.data.dokumentasjon).toEqual([
      expect.objectContaining({ vedlegg_id: VEDLEGGET, filnavn: `${VEDLEGGET}.pdf` }),
    ]);
    // LV-U27: Deres ref. er motpartens brev innlegget viser til.
    expect(rad.data.deres_ref).toEqual([brev.data.merking]);
  });

  it('byggherrens senere begrunnelse er et innlegg som viser til totalentreprenørens innlegg (D-10, KA-U46 punkt 9)', () => {
    const { s, brev } = medSvaret();
    const te = s.send('TE', innlegg(brev.event_id));
    const bh = s.send('BH', innlegg(te.event_id, { tittel: 'Begrunnelse for svaret' }));
    expect(laast(bh)).toEqual([`Byggherren viser til brev ${te.data.merking} av 6. oktober 2026:`]);
    expect(bh.data.deres_ref).toEqual([te.data.merking]);
  });

  it('et innlegg som viser til partens eget brev, har ingen Deres ref. (LV-U27)', () => {
    const { s, brev } = medSvaret();
    const rad = s.send('BH', innlegg(brev.event_id));
    expect(laast(rad)).toEqual([
      `Byggherren viser til brev ${brev.data.merking} av 5. oktober 2026:`,
    ]);
    expect(rad.data.deres_ref).toBeUndefined();
  });

  it('et registrert brev uten merking omtales med parten, typen og datoen (LV-U53, LV-U42)', () => {
    const s = sakMedKrav();
    const registrert = s.send('BH', {
      type: 'registrert_brev',
      ...SOM_BREV,
      sendt: '2026-10-04',
      dokumentasjon: [VEDLEGGET],
    });
    const rad = s.send('TE', innlegg(registrert.event_id));
    expect(laast(rad)).toEqual([
      'Totalentreprenøren viser til byggherrens brev av 4. oktober 2026:',
    ]);
  });
});

describe('innlegget endrer ikke svaret, standpunktene eller utfallet (BF-03 D-4, MM-U47 punkt 4)', () => {
  it('sporene står likt før og etter innlegget, og TE kan fortsatt godta svaret', () => {
    const { s, brev } = medSvaret();
    const foer = s.u();
    const tilbudFoer = handlinger(foer, 'TE');
    s.send('TE', innlegg(brev.event_id));
    const etter = s.u();
    expect(etter.spor).toEqual(foer.spor);
    expect(handlinger(etter, 'TE')).toEqual(tilbudFoer);
    expect(tilbudFoer).toContain('godta:vederlag');
  });

  it('begge parter får tilbud om innlegget (OV-U97, MM-U47 punkt 1)', () => {
    const { s } = medSvaret();
    expect(handlinger(s.u(), 'TE')).toContain('sende_innlegg');
    expect(handlinger(s.u(), 'BH')).toContain('sende_innlegg');
  });
});

describe('innlegget sperrer ingenting og godtas der bindende kommandoer avvises (BF-03 D-6, G-5)', () => {
  it('etter enigheten godtas innlegget, og enigheten står uendret (MM-U47 punkt 12)', () => {
    const { s, brev } = medSvaret();
    godtar(s, 'vederlag');
    const enigheten = s.u().spor.vederlag.enighet;
    expect(enigheten, 'forutsetning: enigheten er registrert').not.toBeNull();
    s.send('TE', innlegg(brev.event_id));
    s.send('BH', innlegg(brev.event_id));
    expect(s.u().spor.vederlag.enighet).toEqual(enigheten);
  });

  it('etter at totalentreprenøren har godtatt avslaget av grunnlaget, godtas innlegg fra begge parter, også i forholdet (GR-U27, MM-U47 punkt 10, MM-U56)', () => {
    const { s, brev } = medSvaret({ resultat: 'avslaatt', grunnlag_varslet_i_tide: true });
    godtar(s, 'forhold');
    const foer = s.u();
    expect(sporetErLukket(foer), 'forutsetning: saken er lukket').toBe(true);
    expect(s.avvist('TE', { type: 'trekk', spor: 'vederlag' }), 'kontrollsak').toBe(
      'FORHOLD_AVVIST'
    );
    s.send('TE', innlegg(brev.event_id, { tittel: 'Om avslaget av forholdet' }));
    s.send('BH', innlegg(brev.event_id));
    expect(sporetErLukket(s.u())).toBe(true);
    expect(s.u().spor).toEqual(foer.spor);
  });

  it('i en sak løsningen ikke forstår, godtas innlegget, og bindende kommandoer avvises (MM-U44, MM-U2)', () => {
    const { s, brev } = medSvaret();
    s.journal.push(ukjentRad(s.journal));
    expect(s.u().forstaatt, 'forutsetning: saken er ikke forstått').toBe(false);
    expect(s.avvist('TE', { type: 'trekk', spor: 'vederlag' }), 'kontrollsak').toBe(
      'SAK_IKKE_FORSTAATT'
    );
    expect(s.avvist('TE', innlegg(brev.event_id))).toBeNull();
  });
});

describe('det innlegget må ha (MM-U47 punkt 2 og designdelen)', () => {
  it('innlegget må vise til et brev i saken, ikke til et element i brevet', () => {
    const { s, brev } = medSvaret();
    expect(s.avvist('TE', innlegg(brev.event_id)), 'kontrollsak').toBeNull();
    const svaret = s.u().spor.vederlag.gjeldendeSvar!.id;
    expect(s.avvist('TE', innlegg(svaret))).toBe('INGEN_BREV');
    expect(s.avvist('TE', innlegg(randomUUID()))).toBe('INGEN_BREV');
  });

  it('innlegget må ha en tittel og en tekst', () => {
    const { s, brev } = medSvaret();
    expect(s.avvist('TE', innlegg(brev.event_id, { tittel: '  ' }))).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', innlegg(brev.event_id, { utdypning: ' ' }))).toBe('UGYLDIG_FORM');
  });

  it('innlegget har ingen dato fra avsenderen: et innlegg sendt utenfor løsningen legges til som korrespondanse (D-6)', () => {
    const { s, brev } = medSvaret();
    expect(s.avvist('TE', innlegg(brev.event_id, { sendt: '2026-10-04' }))).toBe('UGYLDIG_FORM');
  });

  it('en lagret rad med et registrert innlegg gjør saken ikke forstått (MM-U2)', () => {
    const { s, brev } = medSvaret();
    s.rad('TE', {
      utsagn: [{ id: randomUUID(), art: 'innlegg', gjelder: brev.event_id }],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-04' }],
      ...SOM_BREV,
      dokumentasjon: [
        {
          vedlegg_id: VEDLEGGET,
          filnavn: 'innlegg.pdf',
          innhold_sha256: innholdssummen(VEDLEGGET),
        },
      ],
    });
    expect(s.u().begrensninger.map((b) => b.grunn)).toEqual(['et registrert brev har et innlegg']);
  });
});

/** En hendelse kjernen ikke kjenner, som gjør saken ikke forstått (MM-U2). */
function ukjentRad(journal: Journalrad[]): Journalrad {
  const siste = journal.at(-1)!;
  return {
    ...siste,
    event_id: randomUUID(),
    event_type: 'ukjent_hendelse',
    versjon: siste.versjon + 1,
    data: {},
  };
}
