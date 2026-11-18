/**
 * Historikken for arbeidet i saken (#2179). Nettleserens historikk overlever en ny montering av
 * saksvisningen (ny sak, F5, demoen bytter side), men stegene gjør det ikke. Forventningen er
 * fra review av #2200: tilbake fra et skjema etter en ny montering viser oversikten, og
 * historikken føres videre.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';

const side = $state<{
  route: { id: string };
  url: { href: string };
  state: Record<string, unknown>;
}>({ route: { id: '/[prosjektId]/[sakId]' }, url: { href: '/p/s' }, state: {} });
const stabel: Record<string, unknown>[] = [{}];

vi.mock('$app/state', () => ({ page: side }));
vi.mock('$app/navigation', () => ({
  goto: vi.fn(
    async (_href: string, valg: { state: Record<string, unknown>; replace?: boolean }) => {
      if (valg.replace) stabel[stabel.length - 1] = valg.state;
      else stabel.push(valg.state);
      side.state = valg.state;
    }
  ),
}));

const { arbeidshistorikk } = await import('../arbeidshistorikk.svelte.ts');

function monter() {
  const vist: string[] = [];
  let h!: ReturnType<typeof arbeidshistorikk<string>>;
  const avmonter = $effect.root(() => {
    h = arbeidshistorikk<string>((v) => vist.push(v));
  });
  flushSync();
  return { h, vist, avmonter };
}

function tilbakeINettleseren() {
  stabel.pop();
  side.state = stabel[stabel.length - 1]!;
  flushSync();
}

afterEach(() => {
  stabel.splice(0, stabel.length, {});
  side.state = {};
});

describe('arbeidshistorikken (#2179)', () => {
  it('kontrollsak: tilbake fra skjemaet viser oversikten i samme montering', () => {
    const { h, vist, avmonter } = monter();
    h.lagre('oversikt', 'skjema');
    flushSync();
    expect(h.tilbake((v) => v === 'oversikt')).toBe(true);
    tilbakeINettleseren();
    expect(vist.at(-1)).toBe('oversikt');
    avmonter();
  });

  it('etter en ny montering viser tilbake fra skjemaet oversikten, og neste steg føres', () => {
    const forste = monter();
    forste.h.lagre('oversikt', 'skjema');
    flushSync();
    forste.avmonter();

    // Ny montering på den samme historikkoppføringen, med en nøkkel den ikke kjenner.
    const andre = monter();
    andre.h.lagre('oversikt', 'skjema');
    flushSync();
    expect(andre.h.tilbake((v) => v === 'oversikt')).toBe(true);
    tilbakeINettleseren();
    expect(andre.vist.at(-1)).toBe('oversikt');

    const foer = stabel.length;
    andre.h.lagre('oversikt', 'skjema');
    flushSync();
    expect(stabel.length).toBe(foer + 1);
    andre.avmonter();
  });

  it('å erstatte oversikten uten et aktivt steg gjør den til roten, så tilbake ikke forlater saken', () => {
    const { h, avmonter } = monter();
    h.lagre('oversikt', 'kvittering', true);
    flushSync();
    // Oppføringen bak er siden før saken. Tilbake går ikke dit.
    expect(h.tilbake((v) => v === 'oversikt')).toBe(false);
    h.lagre('kvittering', 'skjema');
    flushSync();
    expect(h.tilbake((v) => v === 'kvittering')).toBe(true);
    avmonter();
  });
});
