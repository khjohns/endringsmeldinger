/**
 * Beløpene i hovedlinjene står med mono, som i prototypen (`vederlagssvar.html`, `.num`;
 * #1465, A4). Teksten ellers er uendret.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import Hovedlinjer from '$lib/components/varden/Hovedlinjer.svelte';

afterEach(cleanup);

describe('Hovedlinjer', () => {
  it('hvert beløp i en linje står i et eget mono-element, og linjeteksten er den samme (#1465)', () => {
    const tekst = 'Vederlagsjustering: du godkjenner 60 000 kr av 1 250 000,50 kr';
    const { container } = render(Hovedlinjer, {
      linjer: [
        { tekst, lag: null },
        { tekst: 'Du godkjenner oppgjørsformen totalentreprenøren krever', lag: null },
      ],
      alternativer: false,
    });
    const linjer = container.querySelectorAll('li');
    expect(linjer[0].textContent?.trim()).toBe(tekst);
    expect([...linjer[0].querySelectorAll('.num')].map((n) => n.textContent)).toEqual([
      '60 000 kr',
      '1 250 000,50 kr',
    ]);
    expect(linjer[1].querySelector('.num')).toBeNull();
  });
});
