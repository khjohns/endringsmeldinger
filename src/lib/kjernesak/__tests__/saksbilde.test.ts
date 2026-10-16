/**
 * Saksbildet for en TS-sak (#665): kravene per spor fra utledningen, status og
 * etiketter fra `visning`, og brevene med den låste teksten og leveringsoppdragene.
 * Journalen er skrevet av kjernen selv, så forventningene er kjernens egne.
 */

import { describe, expect, it } from 'vitest';
import type { Leveringsoppdrag } from '$lib/api/kjerne';
import { etikett, lagSaksbilde } from '$lib/kjernesak/saksbilde';
import { forhaandsvis, laastTekst, utledJournal } from '$kjerne/kommandoer/skriving';
import { visning } from '$kjerne/utledning/visning';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad } from '$kjerne/typer';

const SAK = 'sak-1';

const opprettet: Journalrad = {
  event_id: 'e-1',
  sak_id: SAK,
  event_type: 'sak_opprettet',
  versjon: 1,
  tidsstempel: '2026-10-16T08:00:00.000Z',
  aktor_id: '',
  aktor_rolle: 'TE',
  aktor_team_id: null,
  refererer_til_event_id: null,
  format: 1,
  data: { sakstittel: 'Ny peling', sakstype: 'standard' },
};

const grunnlagskrav = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Ny peling',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: 'BH påla ny peling i akse C.',
};
const vederlagskrav = {
  type: 'krav',
  spor: 'vederlag',
  innhold: { metode: 'tilbud', beloep: 250000 },
};

function skrevet(kommando: unknown, journal: Journalrad[]): Journalrad {
  const utfall = forhaandsvis(
    kommando,
    {
      sakId: SAK,
      aktoerId: '',
      part: 'TE',
      teamId: null,
      tidspunkt: () => new Date('2026-10-16T09:00:00.000Z'),
      nyId: () => crypto.randomUUID(),
    },
    journal,
    KJERNE
  );
  if (!utfall.godtatt) throw new Error(`Kjernen avviste kommandoen: ${utfall.avvisning.melding}`);
  return { ...utfall.hendelser[0], versjon: journal.length + 1 };
}

const oppdrag = (event_id: string): Leveringsoppdrag => ({
  id: `l-${event_id}`,
  event_id,
  dokumentnoekkel: `brev-${event_id}`,
  filnavn: `${event_id}.pdf`,
  innhold_sha256: '0'.repeat(64),
  opprettet: '2026-10-16T09:00:01.000Z',
});

function bildeAv(journal: Journalrad[], lev: Leveringsoppdrag[] = []) {
  const u = utledJournal(journal, KJERNE);
  const vist = visning(u, KJERNE.regler);
  return { bilde: lagSaksbilde(journal, lev, u, vist), u, vist };
}

describe('saksbildet for en TS-sak', () => {
  const g = skrevet(grunnlagskrav, [opprettet]);
  const v = skrevet(vederlagskrav, [opprettet, g]);
  const journal = [opprettet, g, v];

  it('viser kravet i sporet det står i, med brevet fra journalen', () => {
    const { bilde, u } = bildeAv(journal);
    const grunnlag = bilde.spor.find((s) => s.spor === 'grunnlag')!;
    const vederlag = bilde.spor.find((s) => s.spor === 'vederlag')!;
    const frist = bilde.spor.find((s) => s.spor === 'frist')!;

    expect(grunnlag.poster).toEqual([
      expect.objectContaining({
        art: 'krav',
        id: u.spor.grunnlag.gjeldendeKrav!.id,
        brev: 2,
        gjeldende: true,
        revidert: false,
      }),
    ]);
    expect(vederlag.poster).toEqual([
      expect.objectContaining({ art: 'krav', brev: 3, gjeldende: true }),
    ]);
    expect(frist.poster).toEqual([]);
  });

  it('tar status og etiketter fra visningen, med tekst for kodene', () => {
    const { bilde, vist } = bildeAv(journal);
    expect(bilde.status).toEqual(vist.status);
    expect(bilde.versjon).toBe(3);
    expect(bilde.tittel).toBe('Ny peling');
    for (const s of bilde.spor)
      expect(s.etiketter.map((e) => e.kode)).toEqual(vist.spor[s.spor].etiketter);
    expect(bilde.spor[0].etiketter).toContainEqual({
      kode: 'venter_paa_svar',
      tekst: 'Venter på svar',
    });
  });

  it('viser den frosne teksten i hvert brev, med utdypningen, og leveringsoppdragene koblet på hendelsen', () => {
    const { bilde } = bildeAv(journal, [oppdrag(v.event_id), oppdrag(g.event_id)]);
    const [rad1, rad2, rad3] = bilde.journal;

    expect(rad1).toMatchObject({ versjon: 1, tekst: null, oppdrag: [], tolket: true });
    expect(rad2.tekst?.map((a) => a.laast)).toEqual(laastTekst(g));
    expect(rad2.tekst?.length).toBeGreaterThan(0);
    expect(rad2.tekst?.map((a) => a.utdypning).filter(Boolean)).toEqual([
      'BH påla ny peling i akse C.',
    ]);
    expect(rad2.oppdrag.map((o) => o.id)).toEqual([`l-${g.event_id}`]);
    expect(rad3.tekst?.map((a) => a.laast)).toEqual(laastTekst(v));
    expect(rad3.oppdrag.map((o) => o.id)).toEqual([`l-${v.event_id}`]);
    expect(rad2.tittel).toBe('Brev fra TE');
  });

  it('merker en hendelse kjernen ikke forstår, og sier at saken ikke kan utledes (MM-U2)', () => {
    const ukjent: Journalrad = {
      ...opprettet,
      event_id: 'e-x',
      event_type: 'ukjent_type',
      versjon: 2,
      data: {},
    };
    const { bilde } = bildeAv([opprettet, ukjent]);
    expect(bilde.status.kode).toBe('kan_ikke_utledes');
    expect(bilde.journal[1].tolket).toBe(false);
    expect(bilde.merknader.map((m) => m.kode)).toEqual(['varsel_med_frist_utenfor_appen']);
  });

  it('viser en kode uten tekst som koden selv', () => {
    expect(etikett('ny_etikett_fra_kjernen')).toEqual({
      kode: 'ny_etikett_fra_kjernen',
      tekst: 'ny_etikett_fra_kjernen',
    });
  });
});
