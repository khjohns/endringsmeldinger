import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { MERKING, linje, skrevet } from '#lib/kjernesak/__tests__/provejournal.ts';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { registrerOppsett, versjonVed, nyeRader, aapne } from './vardenOppsett.ts';

registrerOppsett();

describe('Varden med brukerforløpet BF-01', () => {
  it.each(['vederlag', 'frist'] as const)(
    'lenken fra avslaget i %s-svaret åpner forholdet og bevarer utkastet ved retur (#2183 G-5, BF-01 S-8)',
    async (spor) => {
      const demosak = lagDemosak(finnForloep('BF-04')!, 'bh-har-mottatt-vederlagskravet', 'BH');
      const journal =
        spor === 'frist'
          ? skrevet(demosak.journal(), 'TE', {
              type: 'krav',
              spor: 'frist',
              innhold: { frister: [{ navn: 'Sluttfristen', dager: 10 }] },
              utdypning: 'Tegningene forsinket arbeidet.',
            })
          : demosak.journal();
      const kjernesak = lagKjernesak({
        sakId: demosak.sakId,
        prosjektId: 'demo',
        part: 'BH',
        hent: async () => ({
          versjon: journal.at(-1)!.versjon,
          part: 'BH',
          visning: null as never,
          journal: journal.map(linje),
          leveringsoppdrag: [],
          catenda_lenke: null,
          sakskode: null,
          kontraktsforkortelse: null,
          kan_foreslaa_sakskode: false,
          merking: MERKING,
        }),
      });
      await kjernesak.last();
      render(Vardensak, { kjernesak, spor });
      await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
      await fireEvent.click(screen.getByRole('radio', { name: 'Kom for sent' }));
      const utkastversjon = kjernesak.versjon;
      const avslaget = screen.getAllByRole('button', { name: 'avslaget av forholdet i brev 2' })[0];
      await fireEvent.click(avslaget);
      expect(screen.queryByRole('form')).toBeNull();
      expect(
        screen.getByRole('heading', { name: /^Manglende medvirkning/, level: 2 })
      ).toHaveFocus();
      expect(kjernesak.versjon).toBe(utkastversjon);
      const panelet = within(
        screen.getByRole('navigation', { name: 'Forholdet og kravene i saken' })
      );
      await fireEvent.click(
        panelet.getByRole('button', {
          name: spor === 'frist' ? /^Fristforlengelse/ : /^Vederlagsjustering/,
        })
      );
      await fireEvent.click(screen.getByRole('button', { name: 'Fortsett utkastet' }));
      expect(screen.getByRole('radio', { name: 'Kom for sent' })).toBeChecked();
    }
  );

  it('«Forkast utkast» spør først i en dialog, «Behold utkastet» lar valgene stå, og «Forkast utkast» tømmer dem uten å sende (BF-01 S-8, #1391, #1925)', async () => {
    // jsdom har ikke den modale dialogen.
    vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (
      this: HTMLDialogElement
    ) {
      this.setAttribute('open', '');
    });
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement
    ) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });
    const demosak = aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Kom for sent' }));
    const forkast = screen.getByRole('button', { name: 'Forkast utkast' });

    await fireEvent.click(forkast);
    const dialogen = within(screen.getByRole('dialog', { name: 'Forkaste utkastet?' }));
    await fireEvent.click(dialogen.getByRole('button', { name: 'Behold utkastet' }));
    expect(screen.getByRole('radio', { name: 'Kom for sent' })).toBeChecked();
    expect(document.activeElement).toBe(forkast);

    await fireEvent.click(forkast);
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Forkast utkast' })
    );
    expect(screen.queryByRole('form')).toBeNull();
    const melding = screen.getByText('Utkastet er forkastet.');
    // Kvitteringen står i den levende regionen som finnes før meldingen kommer.
    expect(melding.closest('[role="status"]')).not.toBeNull();
    expect(document.activeElement).toBe(melding.closest('[role="status"]'));
    expect(nyeRader(demosak(), versjonVed('bh-har-mottatt-vederlagskravet'))).toHaveLength(0);
    // Et nytt svar begynner tomt.
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    expect(screen.getByRole('radio', { name: 'Kom for sent' })).not.toBeChecked();
  });

  it('utkastet står når BH velger et annet spor, og merket «Utkast» står i panelet bare mens et annet spor er valgt (BF-01 S-8, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Kom for sent' }));
    const panelet = within(
      screen.getByRole('navigation', { name: 'Forholdet og kravene i saken' })
    );
    const vederlag = () => panelet.getByRole('button', { name: /^Vederlag/ });
    // #1391: mens utkastet er åpent, står ikke kortet med handlingene.
    expect(screen.queryByRole('heading', { name: 'Det du kan gjøre nå' })).toBeNull();
    expect(vederlag().textContent).not.toMatch(/Utkast/);

    // Forholdet heter det TE påberoper (OV-U78).
    await fireEvent.click(panelet.getByRole('button', { name: /^Manglende medvirkning/ }));
    expect(screen.queryByRole('form')).toBeNull();
    expect(vederlag().textContent).toMatch(/Utkast/);

    // #2179: fanen åpner oversikten. Fortsett og tilbake bevarer valget.
    await fireEvent.click(vederlag());
    expect(screen.queryByRole('form')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Fortsett utkastet' }));
    expect(screen.getByRole('radio', { name: 'Kom for sent' })).toBeChecked();
    const hode = screen.getByRole('heading', { name: /^Svar på krav om vederlagsjustering/ });
    expect(document.activeElement).toBe(hode);
    await fireEvent.click(screen.getByRole('link', { name: 'Tilbake til vederlagsjusteringen' }));
    expect(screen.queryByRole('form')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Fortsett utkastet' }));
    expect(screen.getByRole('radio', { name: 'Kom for sent' })).toBeChecked();
    expect(vederlag().textContent).not.toMatch(/Utkast/);
  });
});
