/**
 * Opprettelsen av en KOE-sak (#664, kjernedelen av #370). Kjernen godtar bare TE
 * som oppretter; byggherrens endring er EO-saken, som ikke er med i første versjon
 * (OV-U1, arbeidsvalget i #655). Saken opprettes før grunnlagskravet, fordi den
 * låste teksten har saksnummeret (LV-U2, DL-U6).
 */

import { describe, expect, it } from 'vitest';
import { lesJournal } from '../format/leser.ts';
import { opprettelse } from '../kommandoer/opprettelse.ts';
import { vurder } from '../kommandoer/skriving.ts';
import type { Journalrad } from '../typer.ts';
import { KJERNE } from '../versjon.ts';

const SAK = '0f8b2a3e-5c1d-4e7f-9a6b-2d3c4e5f6a7b';

describe('opprettelsen av en KOE-sak (#664)', () => {
  it('TE får `sak_opprettet` i formatet, med tittelen uten mellomrom rundt og sakstypen standard', () => {
    expect(opprettelse({ type: 'opprett_sak', sakstittel: '  Ny peling ' }, 'TE')).toEqual({
      godtatt: true,
      format: 1,
      data: { sakstittel: 'Ny peling', sakstype: 'standard' },
    });
  });

  it('byggherren kan ikke opprette en KOE-sak (OV-U1)', () => {
    expect(opprettelse({ type: 'opprett_sak', sakstittel: 'Ny peling' }, 'BH')).toEqual({
      godtatt: false,
      feil: 'REGELBRUDD',
      avvisning: { regel: 'FEIL_PART', melding: 'Bare TE kan opprette en KOE-sak.' },
    });
  });

  it.each([
    ['uten tittel', { type: 'opprett_sak' }],
    ['med en tittel av bare mellomrom', { type: 'opprett_sak', sakstittel: ' \n ' }],
    ['med sakstypen fra klienten', { type: 'opprett_sak', sakstittel: 'A', sakstype: 'standard' }],
    ['med aktøren fra klienten', { type: 'opprett_sak', sakstittel: 'A', aktor_id: 'x' }],
    ['med en annen type', { type: 'krav', sakstittel: 'A' }],
    ['som ikke er et objekt', 'opprett_sak'],
  ])('avviser kommandoen %s', (_n, kommando) => {
    const utfall = opprettelse(kommando, 'TE');
    expect(utfall.godtatt).toBe(false);
    expect(!utfall.godtatt && utfall.avvisning.regel).toBe('UGYLDIG_FORM');
  });

  it('avviser en tittel basen ikke kan lagre (#373)', () => {
    const utfall = opprettelse({ type: 'opprett_sak', sakstittel: 'A\u0000' }, 'TE');
    expect(!utfall.godtatt && utfall.avvisning.regel).toBe('TEKST_KAN_IKKE_LAGRES');
  });

  it('raden leses som saken, og grunnlagskravet etter den har saksnummeret og tittelen (LV-U2)', () => {
    const utfall = opprettelse({ type: 'opprett_sak', sakstittel: 'Ny peling' }, 'TE');
    if (!utfall.godtatt) expect.fail('Forutsetning: saken ble ikke opprettet');
    const rad: Journalrad = {
      event_id: 'e1',
      sak_id: SAK,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: '2026-10-01T08:00:00.000Z',
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: utfall.format,
      data: utfall.data,
    };
    expect(lesJournal([rad], KJERNE.leserformat)[0]).toMatchObject({
      art: 'sak',
      tittel: 'Ny peling',
    });
    const krav = vurder(
      {
        type: 'krav',
        spor: 'grunnlag',
        innhold: {
          hovedkategori: 'svikt',
          underkategori: 'grunnforhold',
          klar_over_forholdet: '2026-10-01',
        },
      },
      {
        sakId: SAK,
        aktoerId: 'te',
        part: 'TE',
        teamId: null,
        tidspunkt: () => new Date('2026-10-02T08:00:00Z'),
        nyId: () => crypto.randomUUID(),
      },
      [rad],
      KJERNE,
      new Map()
    );
    // Uten den låste teksten avvises kravet, og avvisningen viser at alt annet holdt.
    expect(!krav.godtatt && krav.avvisning.regel).toBe('BREVTEKST_MANGLER');
  });
});
