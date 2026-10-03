import { cleanup, render } from '@testing-library/svelte';
import { afterEach, expect, it } from 'vitest';
import SendteVarsler from '../SendteVarsler.svelte';
import { VARSEL_LABELS, type SendtKonsekvensVarsel } from '$lib/domain/konsekvensVarsler';

afterEach(cleanup);

it('viser vederlags- og fristvarsel fra samme grunnlagshendelse (#119)', () => {
  const felles = { tidsstempel: '2026-10-03T12:00:00Z', event_id: 'grunnlag-1' };
  const varsler: SendtKonsekvensVarsel[] = [
    { ...felles, type: 'vederlag', tekst: 'Vederlag varsles.' },
    { ...felles, type: 'frist', tekst: 'Frist varsles.' },
  ];
  const screen = render(SendteVarsler, { varsler });
  expect(screen.getByText(VARSEL_LABELS.vederlag)).toBeInTheDocument();
  expect(screen.getByText(VARSEL_LABELS.frist)).toBeInTheDocument();
});
