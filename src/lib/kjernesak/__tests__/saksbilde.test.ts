/**
 * Saksbildet for en TS-sak (#665, #1701): tittelen fra journalen og betegnelsen per spor fra
 * `visning`, med teksten i MM-U30. Journalen er skrevet av kjernen selv, så forventningene er
 * kjernens egne.
 */

import { MERKING } from './provejournal';
import { describe, expect, it } from 'vitest';
import { lagSaksbilde } from '$lib/kjernesak/saksbilde';
import { forhaandsvis, utledJournal } from '$kjerne/kommandoer/skriving';
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
  spor: 'forhold',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: 'BH påla ny peling i akse C.',
};
const vederlagskrav = {
  type: 'krav',
  spor: 'vederlag',
  innhold: { kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 250000 }] },
};

const VEDLEGG = '00000000-0000-4000-8000-000000000001';
const vedlegg = new Map([
  [VEDLEGG, { vedlegg_id: VEDLEGG, filnavn: 'varsel.pdf', innhold_sha256: '0'.repeat(64) }],
]);

function skrevet(kommando: unknown, journal: Journalrad[], part: 'TE' | 'BH' = 'TE'): Journalrad {
  const utfall = forhaandsvis(
    kommando,
    {
      sakId: SAK,
      aktoerId: '',
      part,
      teamId: null,
      ...MERKING,
      tidspunkt: () => new Date('2026-10-16T09:00:00.000Z'),
      nyId: () => crypto.randomUUID(),
    },
    journal,
    KJERNE,
    vedlegg
  );
  if (!utfall.godtatt) throw new Error(`Kjernen avviste kommandoen: ${utfall.avvisning.melding}`);
  return { ...utfall.hendelser[0], versjon: journal.length + 1 };
}

function bildeAv(journal: Journalrad[]) {
  const u = utledJournal(journal, KJERNE);
  const vist = visning(u, KJERNE.regler);
  return { bilde: lagSaksbilde(journal, vist), u, vist };
}

describe('saksbildet for en TS-sak', () => {
  const g = skrevet(grunnlagskrav, [opprettet]);
  const v = skrevet(vederlagskrav, [opprettet, g]);
  const journal = [opprettet, g, v];

  it('har tittelen fra opprettelsen av saken', () => {
    expect(bildeAv(journal).bilde.tittel).toBe('Ny peling');
  });

  it('tar betegnelsen per spor fra visningen, med teksten i MM-U30', () => {
    const { bilde, vist } = bildeAv(journal);
    for (const s of bilde.spor)
      expect(s.betegnelse?.kode ?? null).toBe(vist.spor[s.spor].betegnelse);
    expect(bilde.spor.map((s) => s.betegnelse)).toEqual([
      { kode: 'venter_paa_svar', tekst: 'Kravet venter på byggherrens svar' },
      { kode: 'venter_paa_svar', tekst: 'Kravet venter på byggherrens svar' },
      null,
    ]);
  });
});
