import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, expect, it } from 'vitest';
import KonsekvensVarslerMedBinding from './KonsekvensVarslerMedBinding.svelte';
import { VARSEL_LABELS } from '$lib/domain/konsekvensVarsler';

afterEach(cleanup);

it('valgte varsler og forklaringer står når hovedkategorien endres til force majeure', async () => {
  const screen = render(KonsekvensVarslerMedBinding, {
    hovedkategori: 'ENDRING',
    tittel: 'Hindring',
  });
  for (const label of Object.values(VARSEL_LABELS)) {
    await fireEvent.click(screen.getByRole('checkbox', { name: label }));
  }
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Varseltekst: Vederlagsjustering' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Forklaring: Vederlagsjustering' }));
  const explanation = `Supplerende forklaring: ${VARSEL_LABELS.vederlag}`;
  await fireEvent.input(screen.getByRole('textbox', { name: explanation }), {
    target: { value: 'TE mener BH har risikoen.' },
  });
  await screen.rerender({ hovedkategori: 'FORCE_MAJEURE' });
  for (const label of Object.values(VARSEL_LABELS)) {
    expect(screen.getByRole('checkbox', { name: label })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: label })).toBeEnabled();
  }
  expect(screen.getByRole('textbox', { name: explanation })).toHaveValue(
    'TE mener BH har risikoen.'
  );
  expect(screen.getByText(/Force majeure gir ikke i seg selv/)).toBeVisible();
  await screen.rerender({ hovedkategori: 'SVIKT' });
  expect(screen.getByRole('checkbox', { name: VARSEL_LABELS.vederlag })).toBeChecked();
  expect(screen.getByRole('textbox', { name: explanation })).toHaveValue(
    'TE mener BH har risikoen.'
  );
});
