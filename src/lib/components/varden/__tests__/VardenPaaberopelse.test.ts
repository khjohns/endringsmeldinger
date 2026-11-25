import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { registrerOppsett, sendBrevet } from './vardenOppsett.ts';

registrerOppsett();

describe('svaret på påberopelsen av forholdet (BF-08, #2009)', () => {
  it('BH åpner svaret fra «Svar på påberopelsen», utkastet står når BH bytter spor, og svaret sendes som svar på gjeldende versjon (G-3 i BF-08, BF-01 S-8)', async () => {
    const demosak = lagDemosak(finnForloep('BF-08')!, 'bh-har-mottatt-paaberopelsen', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    expect(kjernesak.handlinger).toContain('svare:forhold');
    const paaberopelsen = kjernesak.utledning!.spor.forhold.gjeldendeKrav!.id;
    render(Vardensak, { kjernesak, spor: 'forhold' });

    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på påberopelsen' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Nei' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Enig. Svaret er en endringsordre' }));

    // Utkastet står til det er sendt eller forkastet, også når et annet spor velges (BF-01 S-8).
    await fireEvent.click(screen.getByRole('button', { name: /^Vederlagsjustering/ }));
    await fireEvent.click(screen.getByRole('button', { name: /^Irregulær endring/ }));
    expect(screen.queryByRole('form')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Fortsett utkastet' }));
    expect(screen.getByRole('radio', { name: 'Enig. Svaret er en endringsordre' })).toBeChecked();

    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await sendBrevet('Send til totalentreprenøren');
    await screen.findByText('Brevet er sendt til totalentreprenøren.');
    const svaret = kjernesak.utledning!.spor.forhold.gjeldendeSvar;
    expect(svaret?.gjelder).toBe(paaberopelsen);
    expect(screen.queryByRole('radio', { name: 'Enig. Svaret er en endringsordre' })).toBeNull();
  });
});
