/**
 * Beløpsfeltet for et redusert beløp i byggherrens svar. Forventningen: KA-U42, «delvis» er
 * mer enn 0 kr og mindre enn det krevde, i hele øre (OV-U59). Kjernen avviser det samme.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import BelopFelt from '../components/BelopFelt.svelte';

afterEach(cleanup);

const mellomrom = (t: string) => t.replace(/\s/g, ' ');

function felt(redusert?: { fullt: string; null: string }) {
  const onugyldig = vi.fn();
  const skjerm = render(BelopFelt, {
    id: 'belop',
    label: 'Godkjent beløp',
    maks: 150000,
    redusert,
    onchange: () => {},
    onugyldig,
  });
  const input = skjerm.getByRole('textbox', { name: 'Godkjent beløp' }) as HTMLInputElement;
  const skriv = async (tekst: string) => {
    await fireEvent.input(input, { target: { value: tekst } });
    await fireEvent.blur(input);
  };
  return { skjerm, input, skriv, ugyldig: () => onugyldig.mock.lastCall?.[0] };
}

describe('redusert beløp: mer enn 0 kr og mindre enn det krevde (KA-U42)', () => {
  it('hele det krevde beløpet gir en feil som sier hva byggherren velger i stedet', async () => {
    const { skjerm, input, skriv, ugyldig } = felt({ fullt: 'Godkjent', null: 'Avslått' });
    await skriv('150 000');
    expect(mellomrom(skjerm.getByRole('alert').textContent ?? '')).toBe(
      'Beløpet er hele det krevde, 150 000 kr. Velg «Godkjent», eller skriv et lavere beløp.'
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(ugyldig()).toBe(true);
  });

  it('0 kr gir en feil som sier hva byggherren velger i stedet', async () => {
    const { skjerm, skriv, ugyldig } = felt({ fullt: 'Fullt beløp', null: 'Null' });
    await skriv('0');
    expect(skjerm.getByRole('alert').textContent).toBe(
      'Beløpet er 0 kr. Velg «Null», eller skriv et høyere beløp.'
    );
    expect(ugyldig()).toBe(true);
  });

  it('kontrollsaker: 1 øre og 1 øre under det krevde godtas, og uten valgene godtas begge grensene', async () => {
    for (const tekst of ['0,01', '149 999,99']) {
      const { skjerm, skriv, ugyldig } = felt({ fullt: 'Godkjent', null: 'Avslått' });
      await skriv(tekst);
      expect(skjerm.queryByRole('alert')).toBeNull();
      expect(ugyldig()).toBe(false);
      cleanup();
    }
    for (const tekst of ['0', '150 000']) {
      const { skjerm, skriv, ugyldig } = felt();
      await skriv(tekst);
      expect(skjerm.queryByRole('alert')).toBeNull();
      expect(ugyldig()).toBe(false);
      cleanup();
    }
  });
});
