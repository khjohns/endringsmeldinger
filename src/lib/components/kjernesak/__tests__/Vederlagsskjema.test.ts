/**
 * Vederlagskravet fra Kontrollrommet på TS-stien (#667, #718). Konteksten er den ekte, med
 * falske `hent` og `send`; at serveren lagrer kravet, prøves i
 * `sprakprove/skrivesti/vederlagskrav.test.ts`. Kildene er formatet i kjernen
 * (bare tilbud, OV-U1), avgjørelsen om valgfri utdypning (oppdragsgiver 17.10) og
 * leserens side fra serveren (#705).
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import Kjernesakrom from '../Kjernesakrom.svelte';
import type { Journallinje, Kjernesak } from '$lib/api/kjerne';
import { ApiError } from '$lib/api/client';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { forhaandsvis } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad, Part } from '$kjerne/typer';

const SAK = 'sak-1';

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

function medKrav(foer: Journalrad[], kommando: Record<string, unknown>): Journalrad[] {
  const utfall = forhaandsvis(
    kommando,
    {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE',
      teamId: null,
      tidspunkt: () => new Date('2026-10-16T09:00:00.000Z'),
      nyId: () => crypto.randomUUID(),
    },
    foer,
    KJERNE
  );
  if (!utfall.godtatt) throw new Error(utfall.avvisning.melding);
  return [...foer, { ...utfall.hendelser[0], versjon: foer.length + 1 }];
}

const journal = medKrav([opprettet], {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    paalegg_mottatt: '2026-10-01',
  },
});
const svar = (part: Part | null, rader = journal): Kjernesak => ({
  versjon: rader.length,
  part,
  visning: {} as Kjernesak['visning'],
  journal: rader.map(
    ({ event_id, versjon, event_type, tidsstempel, aktor_rolle, format, data }): Journallinje => ({
      event_id,
      versjon,
      event_type,
      tidsstempel,
      aktor_rolle,
      format,
      data,
    })
  ),
  leveringsoppdrag: [],
});

const VIEW = { track: 'vederlag', mode: 'read', role: 'BH' } as const;

const visRom = (kjernesak: ReturnType<typeof lagKjernesak>) =>
  render(Kjernesakrom, {
    kjernesak,
    projectId: 'p-1',
    view: VIEW,
    onviewchange: () => {},
    onnewcase: () => {},
  });

async function vis(part: Part | null) {
  const send = vi.fn().mockResolvedValue({ event_id: 'e-3', leveringsoppdrag: 'l-1', versjon: 3 });
  const kjernesak = lagKjernesak({ sakId: SAK, hent: async () => svar(part), send });
  await kjernesak.last();
  visRom(kjernesak);
  return { send };
}

const leseflate = () => document.querySelector('.read-content');

describe('vederlagskravet fra Kontrollrommet', () => {
  it('TE sender tilbudet med den låste teksten og uten utdypning når begrunnelsen er tom', async () => {
    const { send } = await vis('TE');
    await fireEvent.click(screen.getByRole('button', { name: 'Send krav om vederlagsjustering' }));

    // Bare tilbud kan sendes; de andre metodene, de særskilte kravene og varslene vises ikke.
    const skjema = within(document.querySelector('.vederlagsskjema') as HTMLElement);
    expect(skjema.getByText('Fastpris')).toBeInTheDocument();
    for (const ikke of [/Regningsarbeid/, /Enhetspris/, /Rigg og drift/, /Produktivitet/, /Varsel/])
      expect(skjema.queryByText(ikke)).toBeNull();
    expect(skjema.queryByText(/vedlegg/i)).toBeNull();
    expect(leseflate()).toBeNull();

    const knapp = screen.getByRole('button', { name: 'Se brev og send' });
    expect(knapp).toBeDisabled();
    await fireEvent.input(screen.getByLabelText('Fast pris'), { target: { value: '250000' } });
    await fireEvent.click(knapp);

    const kontroll = within(await screen.findByRole('region', { name: 'Brevkontroll' }));
    expect(kontroll.getByRole('heading', { name: 'Vederlag – Ny peling' })).toBeInTheDocument();
    const laast = kontroll.getByTestId('laast-tekst').textContent ?? '';
    expect(laast).not.toBe('');
    expect(kontroll.queryByTestId('utdypning')).toBeNull();
    await fireEvent.click(kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    await fireEvent.click(kontroll.getByRole('button', { name: 'Send til byggherren' }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    // Etter sendingen er skjemaet lukket, og sporet vises igjen.
    await waitFor(() => expect(leseflate()).not.toBeNull());
    expect(document.querySelector('.vederlagsskjema')).toBeNull();
    const [sakId, versjon, kommando] = send.mock.calls[0];
    expect(sakId).toBe(SAK);
    expect(versjon).toBe(2);
    expect(kommando).toEqual({
      type: 'krav',
      spor: 'vederlag',
      innhold: { metode: 'tilbud', beloep: 250000 },
      brevtekst: expect.any(Array),
    });
    expect((kommando.brevtekst as string[]).join('')).toBe(laast);
  });

  it('TEs begrunnelse følger kravet som utdypning (oppdragsgiver 17.10)', async () => {
    const user = userEvent.setup();
    const { send } = await vis('TE');
    await fireEvent.click(screen.getByRole('button', { name: 'Send krav om vederlagsjustering' }));
    await fireEvent.input(screen.getByLabelText('Fast pris'), { target: { value: '1000' } });
    (document.querySelector('.tiptap') as HTMLElement).focus();
    await user.keyboard('Tilbudet gjelder ny peling');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brev og send' }));
    const kontroll = within(await screen.findByRole('region', { name: 'Brevkontroll' }));
    expect(kontroll.getByTestId('utdypning')).toHaveTextContent('Tilbudet gjelder ny peling');
    await fireEvent.click(kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    await fireEvent.click(kontroll.getByRole('button', { name: 'Send til byggherren' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send.mock.calls[0][2]).toMatchObject({ utdypning: 'Tilbudet gjelder ny peling' });
  });

  it('når saken ikke kan lastes på nytt etter sendingen, sier Kontrollrommet at kravet er lagret, og hvorfor saken ikke er oppdatert', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-3', leveringsoppdrag: 'l-1', versjon: 3 });
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar('TE'))
      .mockRejectedValueOnce(new ApiError(503, 'Catenda svarte ikke.'));
    const kjernesak = lagKjernesak({ sakId: SAK, hent, send });
    await kjernesak.last();
    visRom(kjernesak);
    await fireEvent.click(screen.getByRole('button', { name: 'Send krav om vederlagsjustering' }));
    await fireEvent.input(screen.getByLabelText('Fast pris'), { target: { value: '1000' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Se brev og send' }));
    const kontroll = within(await screen.findByRole('region', { name: 'Brevkontroll' }));
    await fireEvent.click(kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    await fireEvent.click(kontroll.getByRole('button', { name: 'Send til byggherren' }));

    await waitFor(() => expect(leseflate()).not.toBeNull());
    expect(send).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Kommandoen er lagret, men saken kunne ikke lastes på nytt. Catenda svarte ikke.'
    );
  });

  it('når sporet har et vederlagskrav, tilbys ikke skjemaet, selv om kjernen tilbyr ny versjon (#667)', async () => {
    const rader = medKrav(journal, {
      type: 'krav',
      spor: 'vederlag',
      innhold: { metode: 'tilbud', beloep: 1000 },
    });
    const kjernesak = lagKjernesak({ sakId: SAK, hent: async () => svar('TE', rader) });
    await kjernesak.last();
    expect(kjernesak.handlinger).toContain('krav:vederlag');
    visRom(kjernesak);
    expect(screen.queryByRole('button', { name: 'Send krav om vederlagsjustering' })).toBeNull();
  });

  it.each([['BH'], [null]] as const)(
    'en leser med siden %s fra serveren får ikke tilbud om vederlagskravet (#705)',
    async (part) => {
      await vis(part);
      expect(screen.queryByRole('button', { name: 'Send krav om vederlagsjustering' })).toBeNull();
    }
  );
});
