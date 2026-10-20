// @vitest-environment jsdom
/**
 * Saksruta leser saken bare fra TS-serveren (#1025, svaret fra oppdragsgiver 20.10, punkt 1).
 * En sak serveren ikke kjenner, gir «Fant ikke saken» (B-17: Python-sakene tas ikke vare på),
 * og en annen feil kan prøves på nytt.
 */
import { cleanup, render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { falskKjernesak } from './saksrutefake.svelte';

const t = vi.hoisted(() => ({
  kontekst: null as ReturnType<typeof falskKjernesak> | null,
}));

vi.mock('$app/state', () => ({
  page: { params: { prosjektId: 'p-1', sakId: 'sak-1' }, url: new URL('http://lokal/p-1/sak-1') },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: () => '/' }));
vi.mock('$lib/kjernesak/kontekst.svelte', () => ({ lagKjernesak: () => t.kontekst }));
vi.mock('$lib/components/kjernesak/Kjernesakrom.svelte', () => import('./Tom.svelte'));

const Saksruta = (await import('../../../routes/[prosjektId]/[sakId]/+page.svelte')).default;

beforeEach(() => {
  t.kontekst = falskKjernesak();
});
afterEach(cleanup);

describe('saksruta mot TS-serveren', () => {
  it('viser at saken lastes mens TS-serveren ikke har svart', () => {
    const screen = render(Saksruta);
    expect(screen.getByRole('status')).toHaveTextContent('Laster sak');
  });

  it('en sak TS-serveren ikke kjenner, gir «Fant ikke saken» uten «Prøv igjen»', () => {
    const screen = render(Saksruta);
    t.kontekst!.finnes = false;
    t.kontekst!.feil = 'Saken finnes ikke.';
    flushSync();
    expect(screen.getByRole('alert')).toHaveTextContent('Fant ikke saken');
    expect(screen.queryByRole('button', { name: 'Prøv igjen' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Til saksoversikten' })).toBeInTheDocument();
  });

  it('en annen feil fra TS-serveren vises med «Prøv igjen»', () => {
    const screen = render(Saksruta);
    t.kontekst!.feil = 'Saken kunne ikke hentes.';
    flushSync();
    expect(screen.getByRole('alert')).toHaveTextContent('Saken kunne ikke hentes.');
    expect(screen.getByRole('button', { name: 'Prøv igjen' })).toBeInTheDocument();
  });
});
