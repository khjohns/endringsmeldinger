import { expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { MERKING, linje, skrevet } from '#lib/kjernesak/__tests__/provejournal.ts';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { registrerOppsett } from './vardenOppsett.ts';

registrerOppsett();

it('viser det nyeste brevet i vederlagstråden til høyre (BF-08, #2242)', async () => {
  const demosak = lagDemosak(finnForloep('BF-08')!, 'te-har-mottatt-svaret', 'TE');
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part: 'TE',
    hent: demosak.hent,
    send: demosak.send,
  });
  await kjernesak.last();
  render(Vardensak, { kjernesak, spor: 'vederlag' });

  const brev = await screen.findByRole('region', { name: 'Brevet' });
  expect(within(brev).getByText(/\bbrev 2$/)).toBeVisible();
  const raden = screen.getByText('Vises til høyre').closest('li')!;
  expect(within(raden).getByText(/\bbrev 2$/)).toBeVisible();
});

it('viser det nyeste brevet med tekst i fristtråden til høyre også når et senere brev i et annet spor har tekst (BF-45, #2242)', async () => {
  const demosak = lagDemosak(finnForloep('BF-45')!, 'bh-har-registrert-fremdriftsplanen', 'TE');
  const journal = skrevet(demosak.journal(), 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [{ beskrivelse: 'Tilleggspeling', oppgjoersform: 'tilbud', beloep: 120000 }],
    },
    utdypning: 'Tilbud på pelingen.',
  });
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part: 'TE',
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part: 'TE',
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      catenda_lenke: null,
      sakskode: null,
      kontraktsforkortelse: null,
      kan_foreslaa_sakskode: false,
      merking: MERKING,
    }),
    send: demosak.send,
  });
  await kjernesak.last();
  const siste = kjernesak.utledning!.journal.at(-1);
  expect(siste?.art === 'dokument' && siste.dokument.brevnummer).toBe(5);
  expect(siste?.art === 'dokument' && siste.dokument.brevtekst).not.toBeNull();
  render(Vardensak, { kjernesak, spor: 'frist' });

  const brev = await screen.findByRole('region', { name: 'Brevet' });
  expect(within(brev).getByText(/\bbrev 4$/)).toBeVisible();
  const raden = screen.getByText('Vises til høyre').closest('li')!;
  expect(within(raden).getByText(/\bbrev 4$/)).toBeVisible();
});
