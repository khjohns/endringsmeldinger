/**
 * «Andre handlinger» i Varden: lista vises bare når kjernen tilbyr en handling (MM-U25). Hver
 * rad har tittelen, virkningen og pila, og en brevtype som ikke er bygget i Varden, sier ved et
 * klikk at den ikke er bygget (#1636, oppdragsgiver 06.11 i #1631).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Brevtyper from '$lib/components/varden/Brevtyper.svelte';
import { HANDLINGENE } from '$lib/components/varden/tekster';

afterEach(cleanup);

const lag = (handlinger: string[], bygget: string[] = []) =>
  render(Brevtyper, {
    tittel: 'Andre handlinger',
    handlinger,
    bygget,
    beskrivelseFor: (n: string) =>
      n === 'trekke:vederlag' ? 'Kravet kan ikke tas opp igjen.' : null,
    onvelg: () => {},
  });

describe('Brevtyper', () => {
  it('lista vises ikke når kjernen ikke tilbyr noen handling (MM-U25)', () => {
    lag([]);
    expect(screen.queryByText('Andre handlinger')).toBeNull();
  });

  it('hver handling står én gang i fast rekkefølge, og en brevtype som ikke er bygget, er en knapp med virkningen', () => {
    lag(['svare:vederlag', 'krav:vederlag', 'trekke:vederlag', 'varsle:vederlag'], ['svare']);
    expect(screen.getByRole('button', { name: 'Svar på kravet' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    const trekk = screen.getByRole('button', { name: /^Trekk kravet/ });
    expect(trekk).toHaveTextContent('Kravet kan ikke tas opp igjen.');
    expect(
      [...document.querySelectorAll('[data-handling]')].map((e) => e.getAttribute('data-handling'))
    ).toEqual(['svare:vederlag', 'krav:vederlag', 'varsle:vederlag', 'trekke:vederlag']);
  });

  it('en brevtype som ikke er bygget, ser ut som de andre handlingene, og et klikk sier at den ikke er bygget (oppdragsgiver 06.11, #1636)', async () => {
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
      'Følger opp påberopelsen i brev 1. Du kan ikke lenger godta svaret i brev 2 i denne saken. Byggherren svarer på det nye brevet.'
    );
    expect(HANDLINGENE.virkning.nyVersjon('vederlag', brev(3), null)).toBe(
      'Følger opp kravet i brev 3. Byggherren svarer på det nye brevet.'
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
