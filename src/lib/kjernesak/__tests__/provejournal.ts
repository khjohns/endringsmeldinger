/** Journalen for prøvene av TS-saken i Kontrollrommet, skrevet av kjernen selv (#718). */

import { forhaandsvis, utledJournal } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad, Part } from '$kjerne/typer';

export const SAK = 'sak-1';

const opprettet: Journalrad = {
  event_id: 'e-1',
  sak_id: SAK,
  event_type: 'sak_opprettet',
  versjon: 1,
  tidsstempel: '2026-10-16T08:00:00.000Z',
  aktor_id: 'te',
  aktor_rolle: 'TE',
  aktor_team_id: null,
  refererer_til_event_id: null,
  format: 1,
  data: { sakstittel: 'Ny peling', sakstype: 'standard' },
};

export function skrevet(journal: Journalrad[], part: Part, kommando: unknown): Journalrad[] {
  const utfall = forhaandsvis(
    kommando,
    {
      sakId: SAK,
      aktoerId: part.toLowerCase(),
      part,
      teamId: null,
      tidspunkt: () =>
        new Date(`2026-10-16T${String(journal.length + 8).padStart(2, '0')}:00:00.000Z`),
      nyId: () => crypto.randomUUID(),
    },
    journal,
    KJERNE
  );
  if (!utfall.godtatt) throw new Error(`Kjernen avviste kommandoen: ${utfall.avvisning.melding}`);
  return [...journal, { ...utfall.hendelser[0], versjon: journal.length + 1 }];
}

export const medGrunnlag = skrevet([opprettet], 'TE', {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: 'BH påla ny peling.',
});
export const medVederlag = skrevet(medGrunnlag, 'TE', {
  type: 'krav',
  spor: 'vederlag',
  innhold: { metode: 'tilbud', beloep: 250000 },
  utdypning: 'Tilbudet gjelder pelingen.',
});

const kravId = (journal: Journalrad[], spor: string) =>
  utledJournal(journal, KJERNE).spor[spor as 'grunnlag'].gjeldendeKrav!.id;

export const medSvar = skrevet(medVederlag, 'BH', {
  type: 'brev',
  svar: [
    {
      spor: 'grunnlag',
      gjelder: kravId(medVederlag, 'grunnlag'),
      regelversjon: KJERNE.regler.versjon,
      vurderinger: { resultat: 'godkjent', grunnlag_varslet_i_tide: true },
      resultat: {},
      utdypning: 'Godkjent.',
    },
  ],
});
