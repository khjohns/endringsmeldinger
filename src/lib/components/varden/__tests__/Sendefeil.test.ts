/** Sikre sendefeil og kontrollsakene i brevkontrollen (#2188, punkt 2, feilmeldingene.html). */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { ApiError } from '#lib/api/client.ts';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { aksepten } from '#lib/components/varden/kommandoer.ts';
import Brevkontroll, { kontrollbrev } from '#lib/components/varden/Brevkontroll.svelte';

vi.mock('$app/state', () => ({
  page: { url: new URL('http://localhost/p-1/s-1?spor=vederlag') },
}));

afterEach(cleanup);

async function sendeforsok(feil: ApiError, nyMerking?: string) {
  const demosak = lagDemosak(finnForloep('BF-01')!, 'te-har-mottatt-svaret', 'TE');
  const send = vi.fn().mockRejectedValue(feil);
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part: 'TE',
    hent: demosak.hent,
    send,
  });
  await kjernesak.last();
  const kommando = aksepten(
    'vederlag',
    kjernesak.utledning!.spor.vederlag.gjeldendeSvar!.id,
    kjernesak.regelversjon
  );
  const brev = kontrollbrev(kjernesak.brev(kommando));
  if (!brev) throw new Error('BF-01 må ha et akseptbrev før sendingen prøves.');
  const onsendt = vi.fn();
  const { rerender } = render(Brevkontroll, {
    kjernesak,
    kommando,
    ...brev,
    svarerPaa: null,
    virkninger: [],
    sendTekst: 'Send til byggherren',
    tilbakeTil: 'utkastet',
    ontilbake: () => {},
    onsendt,
    onavvist: nyMerking ? () => rerender({ merking: nyMerking }) : undefined,
  });
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
  const melding = await screen.findByRole('alert');
  expect(send).toHaveBeenCalledTimes(1);
  return { kjernesak, melding, send, onsendt };
}

describe('sendefeil i et eksisterende brev (#2188, E-2)', () => {
  it('403 viser beklagelse og innlogging tilbake til saken i en ny fane, så utkastet står, uten rå servertekst', async () => {
    const { kjernesak, melding } = await sendeforsok(new ApiError(403, 'INTERN TILGANGSFEIL'));
    expect(melding).toHaveTextContent('Brevet ble ikke sendt');
    expect(melding).toHaveTextContent('Beklager, du har ikke tilgang til å sende brev i saken nå.');
    // Svar 6A 19.11 i #2209: 403 er oftest manglende tilgang, så rådet nevner også administratoren.
    expect(melding).toHaveTextContent(
      'Mangler du tilgang, kontakt den som administrerer prosjektet.'
    );
    const lenke = within(melding).getByRole('link', { name: 'Logg inn på nytt i en ny fane' });
    expect(lenke).toHaveAttribute('href', '/login?return_to=%2Fp-1%2Fs-1%3Fspor%3Dvederlag');
    expect(lenke).toHaveAttribute('target', '_blank');
    expect(melding).not.toHaveTextContent('INTERN TILGANGSFEIL');
    expect(kjernesak.sendeavvisning).toEqual({ status: 403 });
    kjernesak.fjernFeil();
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(kjernesak.sendeavvisning).toBeNull();
  });

  it('500 med sikker feilkode viser beklagelse og rådet om å prøve senere', async () => {
    const { kjernesak, melding } = await sendeforsok(
      new ApiError(500, 'Kommandoen ble ikke lagret: INTERN SERVERFEIL', {
        error: 'INTERNAL_ERROR',
      })
    );
    expect(melding).toHaveTextContent('Brevet ble ikke sendt');
    expect(melding).toHaveTextContent(
      'Beklager, det oppstod en feil hos oss. Utkastet er som før.'
    );
    expect(melding).toHaveTextContent('Prøv igjen om litt.');
    expect(melding).not.toHaveTextContent(/Kommandoen|INTERN SERVERFEIL/);
    expect(kjernesak.sendeavvisning).toEqual({ status: 500 });
    expect(kjernesak.ventende).toBeNull();
  });

  it('409 med nytt nummer ber avsenderen kontrollere brevet på nytt (LV-U46)', async () => {
    const { melding } = await sendeforsok(
      new ApiError(409, 'Intern nummerkonflikt.', { error: 'LOEPENUMMER_TATT' }),
      'KOE-99'
    );
    expect(melding).toHaveTextContent('Brevet ble ikke sendt');
    expect(within(melding).getByRole('link', { name: 'Se over brevet' })).toBeInTheDocument();
    expect(melding).not.toHaveTextContent('Intern nummerkonflikt.');
    expect(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' })).not.toBeChecked();
  });

  it.each([400, 409])('%i viser avvisningsgrunnen under tittelen (#2234)', async (status) => {
    const { melding } = await sendeforsok(new ApiError(status, 'Begrunnelsen fra serveren.'));
    expect(melding.querySelector('strong')).toHaveTextContent('Brevet ble ikke sendt');
    expect(within(melding).getByText('Begrunnelsen fra serveren.')).toBeVisible();
    expect(within(melding).queryByRole('link', { name: /Logg inn/ })).toBeNull();
  });

  it.each([
    ['brudd i forbindelsen', new ApiError(0, 'Forbindelsen ble brutt.')],
    ['500 uten feilkode', new ApiError(500, 'Et svar uten feilkode.')],
    ['UTFALL_USIKKERT', new ApiError(503, 'Usikkert.', { error: 'UTFALL_USIKKERT' })],
  ])('%s lar forsøket stå som ventende (#418, #816)', async (_tilfelle, feil) => {
    const { kjernesak, melding } = await sendeforsok(feil);
    expect(melding).toHaveTextContent('Vi vet ikke om brevet ble sendt');
    expect(melding).toHaveTextContent('Brevet sendes ikke to ganger.');
    expect(melding).toHaveAttribute('data-art', 'info');
    expect(screen.getByRole('button', { name: 'Prøv å sende igjen' })).toBeEnabled();
    expect(melding).not.toHaveTextContent('Brevet ble ikke sendt');
    expect(melding).not.toHaveTextContent('Prøv igjen om litt.');
    expect(kjernesak.sendeavvisning).toBeNull();
    expect(kjernesak.ventende).not.toBeNull();
  });
  it('prøver igjen med samme versjon, kommando-ID og innhold (#2188 punkt 3, #418)', async () => {
    const { send, onsendt } = await sendeforsok(new ApiError(0, 'Forbindelsen ble brutt.'));
    send.mockResolvedValueOnce({});
    await fireEvent.click(screen.getByRole('button', { name: 'Prøv å sende igjen' }));
    await waitFor(() => expect(onsendt).toHaveBeenCalledOnce());
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
  });
});
