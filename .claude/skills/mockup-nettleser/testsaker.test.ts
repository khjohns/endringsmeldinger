/**
 * Testsakene for saksruta (#2349) kjøres i minnet, så en testsak kjernen avviser, feiler her og
 * ikke først i nettleseren. Saksruta sender de samme stegene gjennom serveren.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from '../../../kjerne/tester/bane.ts';
import { kjoer } from '../../../kjerne/tester/kjoerer.ts';
import { kravposterI } from '../../../kjerne/spor/vederlag/format.ts';
import { TESTSAKER, somForloep } from './testsaker.ts';

describe('testsakene for saksruta (#2349)', () => {
  it.each(Object.keys(TESTSAKER))('kjernen godtar hvert steg i %s', async (navn) => {
    const bane = minnebane({ sakstittel: TESTSAKER[navn]!.tittel });
    await kjoer(somForloep(navn), bane);
    expect((await bane.journal()).length).toBeGreaterThan(TESTSAKER[navn]!.steg.length);
  });

  it('to-kravposter-i-senere-lag har to kravposter etter justerte enhetspriser og et avslått forhold (#2336)', async () => {
    const k = await kjoer(somForloep('to-kravposter-i-senere-lag'), minnebane());
    const u = await k.utledning();
    expect(u.spor.forhold.gjeldendeSvar?.standpunkter).toEqual([
      expect.objectContaining({ art: 'forhold', resultat: 'avslaatt' }),
    ]);
    expect(
      kravposterI(u.spor.vederlag.gjeldendeKrav!).map((p) => [p.oppgjoersform, p.justert])
    ).toEqual([
      ['enhetspriser', true],
      ['enhetspriser', true],
    ]);
  });
});
