/** Ekte skjemaelementer og feilkoblinger etter #2191 og system.md. */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { resolve } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import Valg from '../Valg.svelte';
import Linjefelt from '../Linjefelt.svelte';
import Datofelt from '../Datofelt.svelte';
import Tekstomraade from '../Tekstomraade.svelte';

afterEach(cleanup);
const valg = [
  { verdi: 'ja', tekst: 'Kom i tide' },
  { verdi: 'nei', tekst: 'Kom for sent' },
];

describe('skjemaelementene (#2191)', () => {
  it('beholder ekte radio i en navngitt gruppe og kobler feilen til hvert valg', async () => {
    render(Valg, {
      navn: 'varsling',
      spoersmaal: 'Når kom varselet?',
      valg,
      verdi: null,
      feil: 'Velg når varselet kom.',
    });
    expect(screen.getByRole('group', { name: 'Når kom varselet?' })).toBeTruthy();
    const radio = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radio.map((r) => r.name)).toEqual(['varsling', 'varsling']);
    for (const r of radio) {
      expect(r.checked).toBe(false);
      expect(r.getAttribute('aria-invalid')).toBe('true');
      expect(document.getElementById(r.getAttribute('aria-describedby')!)?.textContent).toBe(
        'Velg når varselet kom.'
      );
    }
    await fireEvent.click(screen.getByText('Kom i tide'));
    expect(radio[0].checked).toBe(true);
    await fireEvent.click(screen.getByText('Kom for sent'));
    expect(radio[0].checked).toBe(false);
    expect(radio[1].checked).toBe(true);
  });

  it('beholder avkrysningen og kan slå den av igjen', async () => {
    render(Valg, {
      navn: 'bekreftet',
      spoersmaal: 'Bekreft',
      valg: [valg[0]],
      verdi: null,
      avkrysning: true,
    });
    const boks = screen.getByRole('checkbox') as HTMLInputElement;
    await fireEvent.click(boks);
    expect(boks.checked).toBe(true);
    await fireEvent.click(boks);
    expect(boks.checked).toBe(false);
  });

  it.each([
    ['Linjefelt', Linjefelt],
    ['Datofelt', Datofelt],
    ['Tekstomraade', Tekstomraade],
  ])('%s kobler feltets feil og lar det være inaktivt', (_navn, komponent) => {
    const { container } = render(komponent as typeof Linjefelt, {
      id: 'svar',
      etikett: 'Svar',
      verdi: '',
      bredde: 'tall',
      feil: 'Fyll ut svaret.',
      inaktiv: true,
    });
    const felt = container.querySelector('input, textarea') as HTMLInputElement;
    expect(felt.disabled).toBe(true);
    expect(felt.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(felt.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Fyll ut svaret.'
    );
  });

  it('ingen Varden-komponent overlater tegningen til accent-color', () => {
    const mappe = resolve('src/lib/components/varden');
    const komponenter = readdirSync(mappe).filter((f) => f.endsWith('.svelte'));
    expect(komponenter.length).toBeGreaterThan(0);
    expect(
      komponenter.filter((f) => readFileSync(resolve(mappe, f), 'utf8').includes('accent-color'))
    ).toEqual([]);
  });
});
