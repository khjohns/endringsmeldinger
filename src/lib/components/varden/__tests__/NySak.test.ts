/**
 * Skjemaet for ny sak i Varden (BF-05, #1481). Forventningene har kilde i bestillingen
 * (docs/domenetabell/brukerforlop/BF-05.md): feilene ved feltet før brevkontrollen (F-4, U-5,
 * D-2, GR-U15), ledetekstene som følger forholdet (F-5, VS-U26), og at saken først finnes når
 * påberopelsen er godtatt (KT-U11).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import NySak from '$lib/components/varden/NySak.svelte';
import { finnForloep, lagDemosak } from '$lib/kjernesak/demosak';
import type { SendNySak } from '$lib/components/varden/nysak';
import { kravMotNySak } from '$lib/kjernesak/brevtekst';
import { KJERNE } from '$kjerne/versjon';

afterEach(cleanup);

const BESKRIVELSE = 'Byggherren påla teglforblending i stedet for platekledning.';

function aapne(send = vi.fn<SendNySak>(async () => ({ sakId: 'ny-sak' }))) {
  const onsendt = vi.fn();
  const onavbrutt = vi.fn();
  render(NySak, { sakId: 'ny-sak', send, onsendt, onavbrutt });
  return { send, onsendt, onavbrutt };
}

const seBrevet = () => fireEvent.click(screen.getByRole('button', { name: 'Se brevet' }));

async function fyllIrregulaerEndring({ beskrivelse = BESKRIVELSE } = {}) {
  await fireEvent.click(screen.getByRole('radio', { name: /^Irregulær endring/ }));
  await fireEvent.input(screen.getByLabelText('Tittel på saken'), {
    target: { value: 'Teglforblending på fasaden' },
  });
  await fireEvent.input(screen.getByLabelText('Beskrivelse av pålegget'), {
    target: { value: beskrivelse },
  });
  await fireEvent.input(screen.getByLabelText('Dato du mottok pålegget'), {
    target: { value: '2026-09-15' },
  });
}

describe('skjemaet for ny sak (BF-05)', () => {
  it('F-4/U-5: uten forhold og tittel står feilene før brevkontrollen, og ingenting sendes', async () => {
    const { send } = aapne();
    await seBrevet();
    const liste = await screen.findByRole('group', {
      name: 'Det mangler noe før du kan se brevet',
    });
    expect(within(liste).getByText('Velg forholdet.')).toBeTruthy();
    expect(within(liste).getByText('Skriv tittelen.')).toBeTruthy();
    expect(within(liste).getByText('Ingen sak er opprettet ennå.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Sending' })).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('F-4: feilen for forholdet står under hjelpeteksten, før listen over forholdene', async () => {
    aapne();
    await seBrevet();
    const feilen = screen
      .getAllByText('Velg forholdet.')
      .find((e) => e.tagName === 'P') as HTMLElement;
    const forste = screen.getAllByRole('radio')[0];
    expect(feilen.compareDocumentPosition(forste) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('WCAG 4.1.3: antallet forhold som passer med søket, leses opp', async () => {
    aapne();
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'finnes ikke' } });
    expect(screen.getByRole('status').textContent).toContain('Ingen forhold passer med søket.');
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'irregulær' } });
    expect(screen.getByRole('status').textContent).toContain('Ett forhold passer med søket.');
  });

  it('D-2/GR-U15: kjernen avviser påberopelsen uten beskrivelse, og feilen står ved feltet', async () => {
    const { send } = aapne();
    await fyllIrregulaerEndring({ beskrivelse: '' });
    await seBrevet();
    const felt = screen.getByLabelText('Beskrivelse av pålegget');
    expect(felt.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByText('Beskriv pålegget.').length).toBe(2);
    expect(send).not.toHaveBeenCalled();
  });

  it('F-4: mangler datoen pålegget ble mottatt, står «Oppgi datoen.»', async () => {
    aapne();
    await fireEvent.click(screen.getByRole('radio', { name: /^Irregulær endring/ }));
    await fireEvent.input(screen.getByLabelText('Tittel på saken'), { target: { value: 'T' } });
    await seBrevet();
    expect(screen.getAllByText('Oppgi datoen.').length).toBe(2);
  });

  it('F-5/VS-U26: ved svikt følger ledetekstene forholdet, og spørsmålet om punkt 32.2 vises ikke', async () => {
    aapne();
    await fireEvent.click(screen.getByRole('radio', { name: /^Manglende medvirkning/ }));
    expect(screen.getByLabelText('Beskrivelse av forholdet')).toBeTruthy();
    expect(screen.getByLabelText('Dato du ble klar over forholdet')).toBeTruthy();
    expect(screen.queryByText(/allerede varslet byggherren etter punkt 32.2/)).toBeNull();
  });

  it('F-5: ved et pålegg der punkt 32.2 gjelder, spør skjemaet om varselet alt er sendt', async () => {
    aapne();
    await fireEvent.click(screen.getByRole('radio', { name: /^Irregulær endring/ }));
    expect(screen.getByText(/allerede varslet byggherren etter punkt 32.2/)).toBeTruthy();
  });

  it('U-3/arbeidsvalg 02.11: det valgte forholdet viser kontraktens regel, og «Endre» åpner velgeren', async () => {
    aapne();
    await fireEvent.click(screen.getByRole('radio', { name: /^Irregulær endring/ }));
    expect(screen.getByText(/varsle etter punkt 32.2/)).toBeTruthy();
    expect(screen.queryByText(/§|\bhan\b/)).toBeNull();
    expect(screen.getByText(/Forholdet står fast når brevet er sendt/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Endre' }));
    expect(screen.getByRole('radio', { name: /^Irregulær endring/ })).toBeTruthy();
  });

  it('U-6: brevkontrollen viser brevet fra kjernen, og «Tilbake» beholder det som er skrevet', async () => {
    aapne();
    await fyllIrregulaerEndring();
    await seBrevet();
    const panel = await screen.findByRole('region', { name: 'Sending' });
    expect(within(panel).getByText('Send påberopelsen til byggherren')).toBeTruthy();
    expect(screen.getByText('Påberopelse av irregulær endring')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Tilbake til skjemaet' }));
    expect((screen.getByLabelText('Tittel på saken') as HTMLInputElement).value).toBe(
      'Teglforblending på fasaden'
    );
  });

  it('KT-U11: sendingen går gjennom grensen med opprettelsen og påberopelsen samlet', async () => {
    const { send, onsendt } = aapne();
    await fyllIrregulaerEndring();
    await seBrevet();
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await vi.waitFor(() => expect(onsendt).toHaveBeenCalledWith('ny-sak'));
    const sendt = send.mock.calls[0][0];
    expect(sendt.sakId).toBe('ny-sak');
    expect(sendt.opprettelse).toEqual({
      type: 'opprett_sak',
      sakstittel: 'Teglforblending på fasaden',
    });
    expect(sendt.paaberopelse.innhold).toMatchObject({
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      paalegg_mottatt: '2026-09-15',
    });
    expect(sendt.paaberopelse.utdypning).toBe(BESKRIVELSE);
    expect(sendt.tekst.length).toBeGreaterThan(0);
  });

  it('5a: «Avbryt» spør før det som er skrevet slettes, og sender ingenting', async () => {
    const { send, onavbrutt } = aapne();
    await fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(screen.getByText(/ingen sak opprettes/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Ja, slett det du har skrevet' }));
    expect(onavbrutt).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('saken i demoruta før opprettelsen (G-1, KT-U11)', () => {
  const forloep = finnForloep('BF-05')!;
  const paaberopelse = {
    type: 'krav',
    spor: 'forhold',
    innhold: {
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      paalegg_mottatt: '2026-09-15',
    },
  };

  const opprettelse = { type: 'opprett_sak', sakstittel: 'Teglforblending' };
  const sakId = lagDemosak(forloep, 'start', 'TE').sakId;
  const brev = kravMotNySak(
    opprettelse,
    { ...paaberopelse, utdypning: BESKRIVELSE },
    'TE',
    KJERNE,
    new Map(),
    sakId
  );
  const tekst = 'tekst' in brev ? brev.tekst! : [];

  it('starter uten sak, og en avvist påberopelse etterlater ingen sak', async () => {
    const demosak = lagDemosak(forloep, 'start', 'TE');
    expect(demosak.journal()).toEqual([]);
    await expect(
      demosak.opprett({ sakId, opprettelse, paaberopelse, tekst })
    ).rejects.toMatchObject({
      data: { rule: 'BESKRIVELSE_MANGLER' },
    });
    expect(demosak.journal()).toEqual([]);
  });

  it('skriver saken og påberopelsen når kjernen godtar dem, til versjonen ved neste kontrollpunkt', async () => {
    const demosak = lagDemosak(forloep, 'start', 'TE');
    expect(tekst.length).toBeGreaterThan(0);
    await demosak.opprett({
      sakId,
      opprettelse,
      paaberopelse: { ...paaberopelse, utdypning: BESKRIVELSE },
      tekst,
    });
    const journal = demosak.journal();
    expect(journal[0].event_type).toBe('sak_opprettet');
    const neste = forloep.kontrollpunkter.find((k) => k.id === 'paaberopelsen-er-sendt')!;
    expect(journal.at(-1)!.versjon).toBe(neste.versjon);
  });
});
