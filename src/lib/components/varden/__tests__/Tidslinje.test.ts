/**
 * Tidslinja i Varden uten oppføringer: det er ingenting å åpne, så hodet er ingen knapp
 * (#1391, funnet fra reviewet av #1373).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import Tidslinje from '$lib/components/varden/Tidslinje.svelte';

afterEach(cleanup);

describe('Tidslinje', () => {
  it('uten oppføringer kan tidslinja ikke åpnes, og hodet sier at det ikke er noe ennå (#1391)', () => {
    const { container } = render(Tidslinje, { brev: [], datoer: [] });
    expect(container.querySelector('details, summary')).toBeNull();
    expect(screen.getByText('Ingen datoer eller brev ennå.')).toBeInTheDocument();
  });
});
