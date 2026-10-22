import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import WorkQueue from '../WorkQueue.svelte';
import { lagSakslinje } from '$lib/mocks/sakslinje';

const ingenting = {
  betegnelse: null,
  venter_paa_svar: false,
  svar_ikke_godtatt: false,
  kravet_staar: false,
};

/** To saker der alle tre kravene venter på svar, og én der vederlagssvaret står uten enighet. */
const saker = [
  ...[0, 1].map((i) =>
    lagSakslinje({
      sak_id: `CASE-${i}`,
      grunnlag: { ...ingenting, venter_paa_svar: true, svar: null },
      vederlag: { ...ingenting, venter_paa_svar: true, krav: null, svar: null, enighet: null },
      frist: { ...ingenting, venter_paa_svar: true, krav: null, svar: null, enighet: null },
    })
  ),
  lagSakslinje({
    sak_id: 'CASE-2',
    vederlag: {
      ...ingenting,
      svar_ikke_godtatt: true,
      kravet_staar: true,
      krav: { beloep: 100, metode: 'tilbud' },
      svar: { resultat: 'avslaatt', beloep: 0, subsidiaert: false },
      enighet: null,
    },
  }),
];

it('BH ser kravene som venter på byggherrens svar, og lenken åpner sporet uten skjema (MM-U29)', async () => {
  render(WorkQueue, { saker, role: 'BH', projectId: 'P001', scenarios: { 'CASE-0': 'scenario1' } });
  expect(screen.getByText('6 krav i 2 saker')).toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(3);
  expect(
    screen.getByRole('link', { name: 'Kravet venter på byggherrens svar – Ansvar – CASE-0' })
  ).toHaveAttribute('href', '/mockup?spor=ansvar&rolle=BH&scenario=scenario1');
  await userEvent.click(screen.getByRole('button', { name: 'Se alle 6' }));
  expect(screen.getAllByRole('link')).toHaveLength(6);
});

it('TE ser svarene som står uten enighet, og ingen krav som venter på svar (MM-U29)', () => {
  render(WorkQueue, { saker, role: 'TE', projectId: 'P001' });
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(
    screen.getByRole('link', { name: 'Byggherrens svar er ikke godtatt – Vederlag – CASE-2' })
  ).toHaveAttribute('href', '/P001/CASE-2?spor=vederlag&rolle=TE');
  expect(
    screen.getByText('Vederlag: byggherren har svart, og partene er ikke enige.')
  ).toBeInTheDocument();
});

it('teksten sier hva som foreligger, ikke at parten har plikt eller neste trekk (MM-U29)', async () => {
  const result = render(WorkQueue, { saker: [], role: 'BH', projectId: 'P001' });
  expect(screen.getByText('Ingen krav venter på byggherrens svar.')).toBeInTheDocument();
  await result.rerender({ role: 'TE' });
  expect(screen.getByText('Ingen svar fra byggherren står uten enighet.')).toBeInTheDocument();
  expect(screen.queryByText(/oppfølging|handling/i)).not.toBeInTheDocument();
});
