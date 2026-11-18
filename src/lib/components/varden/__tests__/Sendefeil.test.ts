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
  const { rerender } = render(Brevkontroll, {
    kjernesak,
    kommando,
    ...brev,
    handling: 'Send aksepten til byggherren',
    svarerPaa: null,
    detteSender: [],
    virkninger: [],
    sendTekst: 'Send til byggherren',
    tilbakeTil: 'utkastet',
    ontilbake: () => {},
    onsendt: vi.fn(),
    onavvist: nyMerking ? () => rerender({ merking: nyMerking }) : undefined,
  });
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
  const melding = await screen.findByRole('alert');
  expect(send).toHaveBeenCalledTimes(1);
  return { kjernesak, melding };
}

describe('sendefeil i et eksisterende brev (#2188, E-2)', () => {
  it('403 viser beklagelse og innlogging tilbake til saken uten rå servertekst', async () => {
    const { kjernesak, melding } = await sendeforsok(new ApiError(403, 'INTERN TILGANGSFEIL'));
    expect(melding).toHaveTextContent('Brevet ble ikke sendt');
    expect(melding).toHaveTextContent('Beklager, du har ikke tilgang til å sende brev i saken nå.');
    expect(within(melding).getByRole('link', { name: 'Logg inn på nytt' })).toHaveAttribute(
      'href',
      '/login?return_to=%2Fp-1%2Fs-1%3Fspor%3Dvederlag'
    );
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

  it.each([400, 409])('%i beholder dagens avvisningsgrunn', async (status) => {
    const { melding } = await sendeforsok(new ApiError(status, 'Begrunnelsen fra serveren.'));
    expect(melding).toHaveTextContent('Brevet ble ikke sendt. Begrunnelsen fra serveren.');
    expect(within(melding).queryByRole('link', { name: 'Logg inn på nytt' })).toBeNull();
  });

  it.each([
    ['brudd i forbindelsen', new ApiError(0, 'Forbindelsen ble brutt.')],
    ['500 uten feilkode', new ApiError(500, 'Et svar uten feilkode.')],
    ['UTFALL_USIKKERT', new ApiError(503, 'Usikkert.', { error: 'UTFALL_USIKKERT' })],
  ])('%s lar forsøket stå som ventende (#418, #816)', async (_tilfelle, feil) => {
    const { kjernesak, melding } = await sendeforsok(feil);
    expect(melding).toHaveTextContent('Det er usikkert om brevet ble lagret.');
    expect(melding).not.toHaveTextContent('Brevet ble ikke sendt');
    expect(melding).not.toHaveTextContent('Prøv igjen om litt.');
    expect(kjernesak.sendeavvisning).toBeNull();
    expect(kjernesak.ventende).not.toBeNull();
  });
});
