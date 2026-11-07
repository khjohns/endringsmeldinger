/**
 * «Andre handlinger» i Varden: lista vises bare når kjernen tilbyr en handling (MM-U25). Hver
 * rad har tittelen, virkningen og pila, og en brevtype som ikke er bygget i prøven, åpner dagens
 * visning (#1391, oppdragsgiver 06.11 i #1631).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Brevtyper from '$lib/components/varden/Brevtyper.svelte';
import { HANDLINGENE } from '$lib/components/varden/tekster';

afterEach(cleanup);

const lag = (handlinger: string[], bygget: string[] = [], dagensVisning?: string) =>
  render(Brevtyper, {
    tittel: 'Andre handlinger',
    handlinger,
    bygget,
    dagensVisning,
    beskrivelseFor: (n: string) =>
      n === 'trekke:vederlag' ? 'Kravet kan ikke tas opp igjen.' : null,
    onvelg: () => {},
  });

describe('Brevtyper', () => {
  it('lista vises ikke når kjernen ikke tilbyr noen handling (MM-U25)', () => {
    lag([]);
    expect(screen.queryByText('Andre handlinger')).toBeNull();
  });

  it('en brevtype som ikke er bygget, er en lenke til dagens visning, og hver handling står én gang i fast rekkefølge', () => {
    lag(
      ['svare:vederlag', 'krav:vederlag', 'trekke:vederlag', 'varsle:vederlag'],
      ['svare'],
      '/p/s/kjerne'
    );
    expect(screen.getByRole('button', { name: 'Svar på kravet' })).toBeInTheDocument();
    const trekk = screen.getByRole('link', { name: /^Trekk kravet/ });
    expect(trekk).toHaveAttribute('href', '/p/s/kjerne');
    expect(trekk).toHaveTextContent('Kravet kan ikke tas opp igjen.');
    expect(trekk).not.toHaveTextContent(/dagens visning/);
    expect(
      [...document.querySelectorAll('[data-handling]')].map((e) => e.getAttribute('data-handling'))
    ).toEqual(['svare:vederlag', 'krav:vederlag', 'varsle:vederlag', 'trekke:vederlag']);
  });

  it('uten dagens visning ser en brevtype som ikke er bygget, ut som de andre handlingene, og et klikk sier at den ikke er bygget (oppdragsgiver 06.11, #1636)', async () => {
    lag(['trekke:vederlag'], []);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Kravet kan ikke tas opp igjen.')).toBeInTheDocument();
    expect(screen.queryByText(HANDLINGENE.ikkeBygget)).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: /Kravet kan ikke tas opp igjen/ }));
    expect(screen.getByRole('status')).toHaveTextContent(HANDLINGENE.ikkeBygget);
  });

  it('ny versjon sier hvilket brev den erstatter, og at svaret ikke kan godtas, uten å si at det er avslått (MM-U34 punkt 1 og 2)', () => {
    const brev = (nummer: number) => ({
      id: `b${nummer}`,
      nummer,
      registrert: '2026-11-06T10:00:00Z',
      omtale: null,
      art: 'krav' as const,
    });
    expect(HANDLINGENE.virkning.nyVersjon('forhold', brev(1), brev(2))).toBe(
      'Ny versjon av påberopelsen i brev 1. Du kan ikke lenger godta svaret i brev 2 i denne saken. Byggherren svarer på den nye versjonen.'
    );
    expect(HANDLINGENE.virkning.nyVersjon('vederlag', brev(3), null)).toBe(
      'Ny versjon av kravet i brev 3. Byggherren svarer på den nye versjonen.'
    );
  });

  it('korrigeringen av datoen har en tekst, så nøkkelen aldri vises rå (#1615)', () => {
    lag(['korrigere:abc'], []);
    expect(screen.getByText('Korriger datoen')).toBeInTheDocument();
    expect(screen.queryByText(/korrigere:/)).toBeNull();
  });
});

describe('linja under «Oppdater påberopelse»', () => {
  // Det TE gjør gjeldende, følger hovedkategorien: en endring (§ 33.1 a), et forhold byggherren
  // har risikoen for (§ 33.1 b og c) eller force majeure (§ 33.3). Teksten for risikoforholdet
  // er den oppdragsgiver ga 06.11 i #1631, med «har risikoen for» som i § 33.1 c.
  it.each([
    ['endring', 'Redegjør nærmere for hvorfor dette er en endring.'],
    ['svikt', 'Redegjør nærmere for hvorfor dette er et forhold byggherren har risikoen for.'],
    [
      'andre_forhold',
      'Redegjør nærmere for hvorfor dette er et forhold byggherren har risikoen for.',
    ],
    ['force_majeure', 'Redegjør nærmere for hvorfor dette er force majeure.'],
    [null, 'Utdyp beskrivelsen og begrunnelsen. Byggherren svarer på nytt.'],
  ])('hovedkategorien %s gir teksten «%s»', (hovedkategori, tekst) => {
    expect(HANDLINGENE.virkning.oppdaterPaaberopelse(hovedkategori)).toBe(tekst);
  });
});
