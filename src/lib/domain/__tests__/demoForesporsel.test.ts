import { describe, it, expect } from 'vitest';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { deriveFristDomainConfig } from '../deriveConfig';

describe('demoen: svar på forespørselen (#181)', () => {
  it('gjelder kravet som besvarte forespørselen, ikke en senere revisjon', () => {
    const demo = createDemoStore();
    demo.demo.selectScenario('scenario1');
    demo.sendFristVarselHandling('foresporsel', { begrunnelse: 'Spesifiser kravet' });
    expect(deriveFristDomainConfig(demo.sak).erSvarPaForesporsel).toBe(false);

    demo.sendTeFrist(20, 'spesifisert', 'Svar på forespørselen');
    expect(deriveFristDomainConfig(demo.sak).erSvarPaForesporsel).toBe(true);

    demo.sendTeFrist(25, 'spesifisert', 'Revidert krav');
    expect(deriveFristDomainConfig(demo.sak).erSvarPaForesporsel).toBe(false);
  });
});
