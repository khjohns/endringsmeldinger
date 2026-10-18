/**
 * Brevskallet (#711) med de to brukerne: Brevkontroll på TS-stien og ClaimLetterView på
 * Python-stien. De to første testene karakteriserer tekstene og gangen i de to brukerne
 * slik de er på `main` 945abd6 (#718, kommentaren 6230282330). Den tredje gjelder én
 * avkrysning per brev, som i TS-stien (PR #728), og de to siste at avkrysningen følger
 * brevet og ikke komponenten (#729). Ingen av dem er et vedtak.
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

  it('ClaimLetterView krever ny avkrysning når brevet lukkes og åpnes igjen', async () => {
    const tjeneste = { confirm: vi.fn(), cancel: vi.fn() };
    const screen = render(ClaimLetterView, { review: { letter: brev, ...tjeneste } });
    await fireEvent.click(
      screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet og vedleggene.' })
    );
    await screen.rerender({ review: { letter: null, ...tjeneste } });
    expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull();
    await screen.rerender({ review: { letter: brev, ...tjeneste } });
    expect(
      screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet og vedleggene.' })
    ).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Send til byggherren' })).toBeDisabled();
  });

  it('ClaimLetterView krever ny avkrysning når et annet brev vises uten at skallet lukkes', async () => {
    const tjeneste = { confirm: vi.fn(), cancel: vi.fn() };
    const screen = render(ClaimLetterView, { review: { letter: brev, ...tjeneste } });
    await fireEvent.click(
      screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet og vedleggene.' })
    );
    expect(screen.getByRole('button', { name: 'Send til byggherren' })).toBeEnabled();
    const annet = { ...brev, tittel: 'Krav om vederlagsjustering' };
    await screen.rerender({ review: { letter: annet, ...tjeneste } });
    expect(
      screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet og vedleggene.' })
    ).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Send til byggherren' })).toBeDisabled();
  });

  it('Brevkontroll krever ny avkrysning når den låste teksten endres, og etter sendingen', async () => {
    const props = {
      tekst: ['Første avsnitt.'],
      tittel: 'Grunnlag – Fundament',
      beskrivelse: 'Kravet sendes først når du bekrefter.',
      onbekreft: vi.fn(),
      onavbryt: vi.fn(),
    };
    const screen = render(Brevkontroll, props);
    const avkrysning = () => screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' });
    const send = () => screen.getByRole('button', { name: 'Send til byggherren' });
    await fireEvent.click(avkrysning());
    await fireEvent.click(send());
    expect(props.onbekreft).toHaveBeenCalledOnce();
    await screen.rerender({ ...props, tekst: ['Første avsnitt, endret.'] });
    expect(avkrysning()).not.toBeChecked();
    expect(send()).toBeDisabled();
    await screen.rerender({ ...props, tekst: ['Første avsnitt.'], utdypning: 'Utdypet.' });
    expect(avkrysning()).not.toBeChecked();
  });
});
