import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak, type Demosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import Demoforloep from '#lib/components/brukerforlop/Demoforloep.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { SMAL } from '#lib/components/varden/medie.svelte.ts';
import { registrerOppsett, BF, START, demopanel } from './vardenOppsett.ts';
import { svaretPaaVarseletErIkkeBygget } from '#lib/kjernesak/vederlagskrav.ts';
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { KJERNE } from '#kjerne/versjon.ts';

registrerOppsett();

describe('Varden med brukerforløpet BF-01', () => {
  it.each([
    ['bh-har-mottatt-vederlagskravet', 'BH'],
    ['te-har-mottatt-svaret', 'TE'],
    ['te-har-godtatt-svaret', 'TE'],
  ] as const)(
    'ved %s får %s i Varden alle handlingene kjernen tilbyr i vederlagssporet unntatt innsigelsen',
    async (punkt, part) => {
      let kjernesak: ReturnType<typeof lagKjernesak> | null = null;
      let demosak: Demosak | null = null;
      render(Demoforloep, {
        forloep: START,
        punkt,
        onpunkt: () => {},
        onstart: (d: Demosak, k: ReturnType<typeof lagKjernesak>) => {
          demosak = d;
          kjernesak = k;
        },
      });
      const radio = demopanel().getByRole('radio', { name: part });
      if (radio.getAttribute('aria-checked') !== 'true') await fireEvent.click(radio);
      await screen.findByRole('heading', { name: BF.tittel, level: 1 });
      // Handlingene kjernen gir vederlagssporet (`tilbudte` i `kjerne/kommandoer/handlinger.ts`),
      // uten svaret på et varsel etter § 34.1.2 eller § 34.1.3 som står alene, som ikke har
      // skjema ennå (#2447).
      const u = utledJournal(demosak!.journal(), KJERNE);
      const tilbudt = kjernesak!.tilbudte
        .filter(
          (h) =>
            h.spor === 'vederlag' && !(h.gjelder && svaretPaaVarseletErIkkeBygget(u, h.gjelder))
        )
        .map((h) => h.noekkel);
      const iVarden = [...document.querySelectorAll('[data-handling]')].map(
        (e) => e.getAttribute('data-handling')!
      );
      // Primærhandlingen i kortet står ikke i lista «Andre handlinger».
      if (
        screen.queryByRole('button', { name: /^Godta svaret/ }) &&
        !iVarden.includes('godta:vederlag')
      )
        iVarden.push('godta:vederlag');
      if (screen.queryByRole('button', { name: 'Svar på kravet' })) iVarden.push('svare:vederlag');
      if (
        screen.queryByRole('button', { name: 'Oppdater kravet' }) &&
        !iVarden.includes('krav:vederlag')
      )
        iVarden.push('krav:vederlag');
      expect(iVarden.sort()).toEqual([...tilbudt].sort());
    }
  );

  it('etter avslaget av forholdet er primærhandlingen for TE «Oppdater påberopelse», og godta og trekk står synlige under (oppdragsgiver 06.11, #1631, #1649)', async () => {
    const demosak = lagDemosak(finnForloep('BF-04')!, 'forholdet-er-avslaatt', 'TE');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'TE',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'forhold' });
    // Handlingen står ved brevet den svarer på, byggherrens svar (U-16 i BF-44, #1898).
    const primaer = await screen.findByRole('button', { name: 'Oppdater påberopelse' });
    const raden = within(primaer.closest('li')!);
    expect(raden.getByRole('heading', { level: 4 }).textContent).toMatch(/^Svar på forholdet/);
    expect(primaer).not.toHaveAttribute('aria-describedby');
    expect(raden.getByRole('button', { name: 'Godta avslaget' })).toBeTruthy();
    const andre = within(screen.getByRole('region', { name: 'Andre handlinger' }));
    expect(andre.getByRole('button', { name: /^Trekk påberopelsen/ })).toBeTruthy();
    expect(andre.queryByRole('button', { name: /^Godta/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ta stilling/ })).toBeNull();
  });

  it('etter svaret på vederlagskravet er primærhandlingen for TE «Oppdater kravet», og skjemaet sier at svaret ikke kan godtas her etter sendingen, uten å si at tilbudet avslås (oppdragsgiver 06.11, #1631, U-6 og D-6 i BF-44, MM-U34 punkt 1)', async () => {
    const demosak = lagDemosak(finnForloep('BF-04')!, 'te-har-mottatt-svaret', 'TE');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'TE',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    await screen.findByRole('list', { name: 'Brevene, nyeste først' });
    const kortet = within(screen.getByRole('main'));
    const primaer = kortet.getByRole('button', { name: 'Oppdater kravet' });
    expect(primaer.className).toContain('knapp-primaer');
    expect(primaer).not.toHaveAttribute('aria-describedby');
    expect(kortet.getByRole('button', { name: /^Godta svaret/ })).toBeTruthy();
    await fireEvent.click(primaer);
    expect(screen.getByText(/Når du sender brevet, kan du ikke godta det svaret her/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/avslår tilbudet/);
  });

  /** BF-04 etter svaret, der kjernen ikke gir noe brev for aksepten. Resten av saken er den ekte. */
  async function medAkseptSomIkkeLages() {
    const demosak = lagDemosak(finnForloep('BF-04')!, 'te-har-mottatt-svaret', 'TE');
    const ekte = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'TE',
      hent: demosak.hent,
      send: demosak.send,
    });
    await ekte.last();
    return new Proxy(ekte, {
      get: (t, k) => (k === 'brev' ? () => null : Reflect.get(t, k, t)),
    });
  }

  it('når kjernen ikke lager aksepten, står hindringen ved knappen med fokus, og «Godta svaret» viser til den (MM-U32, #2130)', async () => {
    render(Vardensak, { kjernesak: await medAkseptSomIkkeLages(), spor: 'vederlag' });
    await screen.findByRole('list', { name: 'Brevene, nyeste først' });
    const godta = within(screen.getByRole('main')).getByRole('button', { name: /^Godta svaret/ });
    await fireEvent.click(godta);
    const hindringen = await screen.findByText('Aksepten kan ikke lages nå.');
    await vi.waitFor(() => expect(document.activeElement).toBe(hindringen.closest('[tabindex]')));
    expect(godta.getAttribute('aria-describedby')!.split(' ')).toContain(
      hindringen.closest('[id]')!.id
    );
    expect(screen.queryByRole('region', { name: 'Sending' })).toBeNull();
  });

  it('på smal skjerm med brevet lukket står hindringen også, og hver knapp som viser til den, viser til en melding som står (#2149)', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q === SMAL,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(Vardensak, { kjernesak: await medAkseptSomIkkeLages(), spor: 'vederlag' });
    const traaden = await screen.findByRole('list', { name: 'Brevene, nyeste først' });
    // Smalt: brevene åpnes i raden, og ingen står åpen.
    expect(traaden.querySelector('[aria-expanded="true"]')).toBeNull();
    expect(traaden.querySelector('[aria-expanded="false"]')).not.toBeNull();
    await fireEvent.click(
      within(screen.getByRole('main')).getByRole('button', { name: /^Godta svaret/ })
    );
    const hindringen = await screen.findByText('Aksepten kan ikke lages nå.');
    const id = hindringen.closest('[id]')!.id;
    const viserTil = [...document.querySelectorAll('[aria-describedby]')].filter((e) =>
      e.getAttribute('aria-describedby')!.split(' ').includes(id)
    );
    expect(viserTil.map((e) => e.textContent!.trim())).toEqual([
      expect.stringMatching(/^Godta svaret/),
    ]);
    expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
  });
});
