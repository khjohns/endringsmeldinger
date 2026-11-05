// @vitest-environment jsdom
/**
 * Saksruta leser saken bare fra TS-serveren (#1025, svaret fra oppdragsgiver 20.10, punkt 1).
 * En sak serveren ikke kjenner, gir «Fant ikke saken» (B-17: Python-sakene tas ikke vare på),
 * og en annen feil kan prøves på nytt. Saken vises i Varden (#1414).
 */
import { cleanup, render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { falskKjernesak } from './saksrutefake.svelte';

const t = vi.hoisted(() => ({
  kontekst: null as ReturnType<typeof falskKjernesak> | null,
}));

const side = vi.hoisted(() => ({
  params: { prosjektId: 'p-1', sakId: 'sak-1' },
  url: new URL('http://lokal/p-1/sak-1'),
  state: {},
}));
vi.mock('$app/state', () => ({ page: side }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: () => '/p-1' }));
vi.mock('$lib/kjernesak/kontekst.svelte', () => ({ lagKjernesak: () => t.kontekst }));

const Saksruta = (await import('../../../routes/[prosjektId]/[sakId]/+page.svelte')).default;

beforeEach(() => {
  t.kontekst = falskKjernesak();
  side.url = new URL('http://lokal/p-1/sak-1');
});
afterEach(cleanup);

describe('saksruta mot TS-serveren', () => {
  it('viser at saken lastes mens TS-serveren ikke har svart', () => {
    const screen = render(Saksruta);
    expect(screen.getByText(/Laster saken/)).toHaveAttribute('role', 'status');
  });

  it('en sak TS-serveren ikke kjenner, gir «Saken finnes ikke» uten «Prøv igjen»', () => {
    const screen = render(Saksruta);
    t.kontekst!.finnes = false;
    t.kontekst!.feil = 'Saken finnes ikke.';
    flushSync();
    expect(screen.getByRole('alert')).toHaveTextContent('Saken finnes ikke');
    expect(screen.queryByRole('button', { name: 'Prøv igjen' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Til sakslisten' })).toHaveAttribute('href', '/p-1');
  });

  it('en annen feil fra TS-serveren vises med «Prøv igjen»', () => {
    const screen = render(Saksruta);
    t.kontekst!.feil = 'Saken kunne ikke hentes.';
    flushSync();
    expect(screen.getByRole('alert')).toHaveTextContent('Saken kunne ikke hentes.');
    expect(screen.getByRole('button', { name: 'Prøv igjen' })).toBeInTheDocument();
  });
});

describe('sporet saken åpner i (S5 i #1414)', () => {
  async function aapne(spor: string) {
    const { lagKjernesak } = await vi.importActual<typeof import('$lib/kjernesak/kontekst.svelte')>(
      '$lib/kjernesak/kontekst.svelte'
    );
    const { finnForloep, lagDemosak } = await import('$lib/kjernesak/demosak');
    const demosak = lagDemosak(finnForloep('BF-01')!, 'bh-har-mottatt-vederlagskravet', 'TE');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'TE',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    t.kontekst = kjernesak as unknown as typeof t.kontekst;
    side.url = new URL(`http://lokal/p-1/sak-1?spor=${spor}`);
    const screen = render(Saksruta);
    return (await screen.findAllByRole('button')).filter((b) => b.hasAttribute('aria-current'));
  }

  it('`?spor=frist` fra omdirigeringene åpner fristen', async () => {
    const [valgt] = await aapne('frist');
    expect(valgt).toHaveTextContent('Fristforlengelse');
  });

  it('et sporparameter som er en arvet nøkkel (`constructor`), åpner forholdet', async () => {
    const [valgt] = await aapne('constructor');
    // Forholdet heter det TE påberoper i sporlista (OV-U78).
    expect(valgt).toHaveTextContent(/^Manglende medvirkning eller leveranser fra byggherren/);
  });
});
