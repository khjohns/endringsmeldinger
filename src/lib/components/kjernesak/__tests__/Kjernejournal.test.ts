/**
 * Knappen for PDF-en av et sendt brev i journalen for en TS-sak (#1054). Kildene:
 * bare et sendt brev kan lastes ned (oppdragsgiver 20.10, #1054), og et registrert
 * brev har ikke noe dokument fra appen (LV-U11). Serverens kontroll og PDF-en prøves i
 * `server/tester/brev.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import type { Leveringsoppdrag } from '$lib/api/kjerne';
import type { Journalpost, Saksbilde } from '$lib/kjernesak/saksbilde';
import Kjernejournal from '../Kjernejournal.svelte';

vi.mock('$app/state', () => ({ page: { params: { prosjektId: 'p-1', sakId: 'sak-1' } } }));

const oppdrag = (eventId: string, filnavn: string | null): Leveringsoppdrag => ({
  id: `o-${eventId}`,
  event_id: eventId,
  dokumentnoekkel: eventId,
  filnavn,
  innhold_sha256: '0'.repeat(64),
  opprettet: '2026-10-20T10:00:00Z',
  levert: null,
});

const post = (versjon: number, o: Leveringsoppdrag[]): Journalpost => ({
  hendelse: `h-${versjon}`,
  versjon,
  tidsstempel: '2026-10-20T10:00:00Z',
  tittel: `Brev ${versjon}`,
  tolket: true,
  hendelseskode: null,
  tekst: null,
  opplysninger: [],
  oppdrag: o,
  registrertBrev: null,
});

const bilde = (journal: Journalpost[]): Saksbilde => ({
  tittel: 'Sak',
  versjon: journal.length,
  status: null,
  merknader: [],
  spor: [],
  journal,
});

describe('PDF-en av et sendt brev i journalen', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:brev');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('et brev med dokument fra appen får knappen, et registrert brev og sak_opprettet får den ikke', () => {
    render(Kjernejournal, {
      bilde: bilde([
        post(1, []),
        post(2, [oppdrag('e-2', 'brev-sak-1-2.pdf')]),
        post(3, [oppdrag('e-3', null)]),
      ]),
    });
    expect(screen.getAllByRole('button', { name: /Last ned PDF/ })).toHaveLength(1);
    expect(screen.getByTestId('journal-2').querySelector('button')).not.toBeNull();
    expect(screen.getByTestId('journal-3').querySelector('button')).toBeNull();
  });

  it('knappen henter brevet i saken og prosjektet fra ruta og lagrer filen', async () => {
    fetchMock.mockResolvedValue(new Response('%PDF', { status: 200 }));
    const klikk = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(Kjernejournal, { bilde: bilde([post(2, [oppdrag('e-2', 'brev-sak-1-2.pdf')])]) });
    await fireEvent.click(screen.getByRole('button', { name: /Last ned PDF/ }));
    await vi.waitFor(() => expect(klikk).toHaveBeenCalled());
    const [url, valg] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/kjerne/saker/sak-1/brev/e-2');
    expect(valg).toMatchObject({ credentials: 'include', headers: { 'X-Project-ID': 'p-1' } });
    expect((klikk.mock.contexts[0] as HTMLAnchorElement).download).toBe('brev-sak-1-2.pdf');
    klikk.mockRestore();
  });

  it('en avvisning fra serveren vises med meldingen', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'BREV_KAN_IKKE_GJENGIS', message: 'PDF-en kan ikke lages.' }),
        {
          status: 409,
        }
      )
    );
    render(Kjernejournal, { bilde: bilde([post(2, [oppdrag('e-2', 'brev-sak-1-2.pdf')])]) });
    await fireEvent.click(screen.getByRole('button', { name: /Last ned PDF/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('PDF-en kan ikke lages.');
  });
});
