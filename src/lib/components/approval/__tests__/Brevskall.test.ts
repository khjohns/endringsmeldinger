/**
 * Brevskallet (#711) med de to brukerne: Brevkontroll på TS-stien og ClaimLetterView på
 * Python-stien. Forventningene er tekstene og gangen i de to komponentene før skallet ble
 * trukket ut (FK-8a, #718): atferden skal være uendret.
 */
import { cleanup, fireEvent, render, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Brevkontroll from '$lib/components/kjernesak/Brevkontroll.svelte';
import ClaimLetterView from '$lib/components/kontraktsbord/ClaimLetterView.svelte';
import type { BrevInnhold } from '$lib/components/kontraktsbord/letterTypes';

afterEach(cleanup);

const seksjon = (tekst: string) => ({ tittel: '', originalTekst: tekst, redigertTekst: tekst });
const brev: BrevInnhold = {
  tittel: 'Krav om endring',
  mottaker: { navn: 'Byggherre AS', rolle: 'BH' },
  avsender: { navn: 'Entreprenør AS', rolle: 'TE' },
  referanser: {
    sakId: 'sak-1',
    sakstittel: 'Fundament',
    eventId: 'e-1',
    sporType: 'grunnlag',
    dato: '2026-10-17',
  },
  seksjoner: {
    innledning: seksjon('Innledning.'),
    begrunnelse: seksjon('Begrunnelse.'),
    avslutning: seksjon('Avslutning.'),
  },
};

describe('Brevskall', () => {
  it('Brevkontroll viser den låste teksten, sender først etter bekreftelsen og har ingen fremdrift', async () => {
    const onbekreft = vi.fn();
    const onavbryt = vi.fn();
    const screen = render(Brevkontroll, {
      tekst: ['Første avsnitt.', 'Andre avsnitt.'],
      utdypning: 'Utdypet.',
      tittel: 'Grunnlag – Fundament',
      beskrivelse: 'Kravet sendes først når du bekrefter.',
      onbekreft,
      onavbryt,
    });
    const kontroll = within(screen.getByRole('region', { name: 'Brevkontroll' }));
    expect(kontroll.getByTestId('laast-tekst').querySelectorAll('p')).toHaveLength(2);
    expect(kontroll.getByTestId('utdypning')).toHaveTextContent('Utdypet.');
    expect(kontroll.queryByRole('list', { name: 'Fremdrift' })).toBeNull();
    const send = kontroll.getByRole('button', { name: 'Send til byggherren' });
    expect(send).toBeDisabled();
    await fireEvent.click(kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    await fireEvent.click(send);
    expect(onbekreft).toHaveBeenCalledOnce();
    await fireEvent.click(kontroll.getByRole('button', { name: 'Tilbake til skjemaet' }));
    expect(onavbryt).toHaveBeenCalledOnce();
  });

  it('ClaimLetterView viser fremdriften, mottakeren i fotnoten og sender først etter bekreftelsen', async () => {
    const review = { letter: brev, confirm: vi.fn(), cancel: vi.fn() };
    const screen = render(ClaimLetterView, { review, stepLabel: 'Grunnlag' });
    const kontroll = within(screen.getByRole('region', { name: 'Brevkontroll' }));
    expect(kontroll.getByRole('list', { name: 'Fremdrift' })).toHaveTextContent('Grunnlag');
    expect(kontroll.getByText(/Byggherre AS får brevet straks/)).toBeInTheDocument();
    const send = kontroll.getByRole('button', { name: 'Send til byggherren' });
    expect(send).toBeDisabled();
    await fireEvent.click(
      kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet og vedleggene.' })
    );
    await fireEvent.click(send);
    expect(review.confirm).toHaveBeenCalledOnce();
    await fireEvent.click(kontroll.getByRole('button', { name: 'Tilbake til kravet' }));
    expect(review.cancel).toHaveBeenCalledOnce();
  });
});
