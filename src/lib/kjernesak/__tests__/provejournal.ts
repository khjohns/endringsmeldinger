/** Journalen for prøvene av TS-saken i Kontrollrommet, skrevet av kjernen selv (#718). */

import { forhaandsvis, utledJournal, type Vedleggsoppslag } from '$kjerne/kommandoer/skriving';
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

export function skrevet(
  journal: Journalrad[],
  part: Part,
  kommando: unknown,
  vedlegg: Vedleggsoppslag = new Map()
): Journalrad[] {
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
    KJERNE,
    vedlegg
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

export const medVederlagssvar = skrevet(medVederlag, 'BH', {
  type: 'brev',
  svar: [
    {
      spor: 'vederlag',
      gjelder: kravId(medVederlag, 'vederlag'),
      regelversjon: KJERNE.regler.versjon,
      vurderinger: {
        hovedkrav_vurdering: 'godkjent',
        hovedkrav_godkjent_belop: 250000,
        aksepterer_metode: true,
      },
      resultat: { resultat: 'godkjent', godkjent_beloep: 250000 },
      utdypning: 'Tilbudet godtas.',
    },
  ],
});

/** Varselet registrert med brevet som vedlegg (OV-U4). */
const VARSELBREVET = '0b6f3c2e-1d4a-4e8b-9c7f-2a5d6e8f9a10';

export const medFristvarsel = skrevet(
  medGrunnlag,
  'TE',
  {
    type: 'varsel',
    spor: 'frist',
    hjemmel: '33.4',
    sendt: '2026-10-10',
    dokumentasjon: [VARSELBREVET],
  },
  new Map([
    [
      VARSELBREVET,
      { vedlegg_id: VARSELBREVET, filnavn: 'varsel.pdf', innhold_sha256: '0'.repeat(64) },
    ],
  ])
);

/** Varselet etter § 34.1.2 sendt utenfor appen og registrert (OV-U5). */
export const medVederlagsvarsel = skrevet(
  medGrunnlag,
  'TE',
  {
    type: 'varsel',
    spor: 'vederlag',
    hjemmel: '34.1.2',
    sendt: '2026-10-10',
    dokumentasjon: [VARSELBREVET],
  },
  new Map([
    [
      VARSELBREVET,
      { vedlegg_id: VARSELBREVET, filnavn: 'varsel.pdf', innhold_sha256: '0'.repeat(64) },
    ],
  ])
);

export const medTrukketVederlag = skrevet(medVederlag, 'TE', { type: 'trekk', spor: 'vederlag' });

/** En hendelse kjernen ikke kjenner, så saken ikke kan utledes (MM-U2). */
export const medUkjentHendelse: Journalrad[] = [
  ...medGrunnlag,
  { ...medGrunnlag[1], event_id: 'e-ukjent', event_type: 'ukjent_hendelse', versjon: 3, data: {} },
];
