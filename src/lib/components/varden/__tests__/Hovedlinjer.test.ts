/**
 * Beløpene i hovedlinjene står med mono, som i prototypen (`vederlagssvar.html`, `.num`;
 * #1465, A4). Teksten ellers er uendret. Vilkåret står foran laget i klarspråk, uten lagnavnet fra
 * brevet (#2182, svar B 19.11).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import Hovedlinjer from '#lib/components/varden/Hovedlinjer.svelte';
import type { Innsigelsen } from '#lib/components/varden/svarlagene.ts';

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

  it('vilkåret står én gang foran standpunktene i samme lag, det første laget står uten vilkår, og et lag etter to lag sier «heller ikke» (#2182, svar B 19.11, LV-U4 punkt 4)', () => {
    const varselet: Innsigelsen[] = [{ art: 'varsel', hjemmel: '34.1.2' }];
    const spesifiseringen: Innsigelsen[] = [{ art: 'varsel', hjemmel: '34.1.3' }];
    const { container } = render(Hovedlinjer, {
      linjer: [
        {
          tekst: 'Du gjør gjeldende at varselet etter punkt 34.1.2 kom for sent',
          lag: 'Prinsipalt',
        },
        { tekst: 'Du godkjenner oppgjørsformen', lag: 'Subsidiært', vilkaar: varselet },
        { tekst: 'Du godkjenner 110 000 kr', lag: 'Subsidiært', vilkaar: varselet },
        {
          tekst: 'Du godkjenner 130 000 kr',
          lag: 'Videre subsidiært',
          vilkaar: spesifiseringen,
          heller: true,
        },
      ],
      alternativer: true,
    });
    const linjer = [...container.querySelectorAll('li')].map((li) =>
      [...li.children].map((c) => c.textContent!.replaceAll('\u00a0', ' '))
    );
    expect(linjer).toEqual([
      ['Du gjør gjeldende at varselet etter punkt 34.1.2 kom for sent'],
      [
        'Hvis innsigelsen om at varselet etter punkt 34.1.2 kom for sent ikke fører frem',
        'Du godkjenner oppgjørsformen',
      ],
      ['Du godkjenner 110 000 kr'],
      [
        'Hvis heller ikke innsigelsen om at varselet etter punkt 34.1.3 kom for sent fører frem',
        'Du godkjenner 130 000 kr',
      ],
    ]);
    expect(container.textContent).not.toMatch(/Prinsipalt|Subsidiært/);
  });
});
