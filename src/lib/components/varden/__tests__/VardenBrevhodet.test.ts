import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { ApiError } from '#lib/api/client.ts';
import { registrerOppsett, START, bhSvarerIVarden, sendBrevet } from './vardenOppsett.ts';

registrerOppsett();

describe('brevhodet og en avvist sending (A2b i #1497)', () => {
  it('brevkontrollen viser Vår ref. og Deres ref. som kjernen fryser, og etter en avvist sending lages brevet på nytt mot saken slik den er lastet (LV-U2, LV-U49, U-4 og D-5 i BF-07)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    // Driften retter kontraktsforkortelsen mens brevet står i brevkontrollen (D-2 i BF-07).
    let forkortelse = 'K201';
    const hent: typeof demosak.hent = async (...a) => {
      const sak = await demosak.hent(...a);
      return {
        ...sak,
        merking: sak.merking && { ...sak.merking, kontraktsforkortelse: forkortelse },
      };
    };
    const send = vi.fn().mockImplementationOnce(async () => {
      forkortelse = 'K202';
      throw new ApiError(409, 'Saken er endret.', {
        error: 'VERSJONSKONFLIKT',
        expected_version: 4,
        current_version: 5,
      });
    });
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent,
      send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });
    await bhSvarerIVarden();
    const krav = demosak.journal().at(-1)!;
    // Svaret er brev 4 i saken: påberopelsen, svaret på den og kravet er brev 1–3 (G-5).
    expect(screen.getByTestId('vaar-ref').textContent).toBe('K201-KOE-017-04');
    // Svaret viser til TEs krav med merkingen kjernen frøs på det (LV-U49).
    expect(screen.getByTestId('deres-ref').textContent!.trim()).toBe(krav.data.merking);

    await sendBrevet('Send til totalentreprenøren');
    await vi.waitFor(() =>
      expect(screen.getByTestId('vaar-ref').textContent).toBe('K202-KOE-017-04')
    );
    // Det nye brevet kontrolleres på nytt før det kan sendes (LV-U2).
    expect(
      (screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }) as HTMLInputElement)
        .checked
    ).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('har saken fått en ny versjon når sendingen avvises, lukkes brevkontrollen med en melding, og brevet sendes ikke på nytt (oppdragsgiver 07.11, punkt 2 i #1596)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    // En annen i byggherrens team sender det samme svaret først, så saken får en ny versjon.
    const send = vi
      .fn<typeof demosak.send>()
      .mockImplementationOnce(async (sak, versjon, _id, kommando, prosjekt) => {
        await demosak.send(sak, versjon, 'annen-kommando', kommando, prosjekt);
        throw new ApiError(409, 'Saken er endret.', { error: 'VERSJONSKONFLIKT' });
      });
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });
    await bhSvarerIVarden();
    const foer = kjernesak.versjon;

    await sendBrevet('Send til totalentreprenøren');
    await vi.waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: 'Jeg har kontrollert brevet' })).toBeNull()
    );
    expect(kjernesak.versjon).not.toBe(foer);
    expect(screen.getByText(/saken er endret siden du åpnet brevkontrollen/)).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
