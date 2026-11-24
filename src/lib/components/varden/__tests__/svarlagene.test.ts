/**
 * Lagene i vederlagssvaret klassifiserer innsigelsene med vederlagets predikat i kjernen, ikke med
 * fristens (#2242, kravet fra reviewet av #2249 22.11). Fristens predikat er byttet ut med et som
 * aldri gir en innsigelse, så prøven blir rød hvis vederlaget leser det igjen.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { minnebane } from '#kjerne/tester/bane.ts';
import { kjoer, type Forloep } from '#kjerne/tester/kjoerer.ts';
import type { Handling } from '#kjerne/tester/klient.ts';
import { START } from '#kjerne/tester/brukerforloep.ts';
import { testklokke } from '#kjerne/tester/testmiljoe.ts';
import { kravetOgSvaret } from '#lib/components/varden/vederlagsoversikt.ts';
import { brevene } from '#lib/components/varden/lesing.ts';
import { erInnsigelseIFristen } from '#kjerne/spor/frist/format.ts';

vi.mock('#kjerne/spor/frist/format.ts', { spy: true });

const BF44 = JSON.parse(readFileSync('docs/domenetabell/brukerforlop/BF-44.json', 'utf8')) as {
  steg: Handling[];
};

describe('Lagene i vederlagssvaret (#2242)', () => {
  it('vilkåret for lagene etter innsigelsene om varselet kommer fra vederlagets predikat, også når fristens predikat ikke gir noen innsigelse (OV-U32, LV-U34)', async () => {
    const forloep: Forloep = {
      id: 'svarlagene',
      rader: [],
      start: null,
      steg: BF44.steg,
      kontroller: [],
    };
    const u = await (
      await kjoer(forloep, minnebane({ sakstittel: 'Pelingen' }), {
        valg: { klokke: testklokke(START) },
      })
    ).utledning();
    // Byttes etter kjøringen, så bare lesingen i visningen rammes, ikke kjernen.
    vi.mocked(erInnsigelseIFristen).mockReturnValue(false);
    expect(kravetOgSvaret(u, brevene(u))!.lagene.map((l) => l.vilkaar)).toEqual([
      [],
      [{ art: 'varsel', hjemmel: '34.1.2' }],
      [{ art: 'varsel', hjemmel: '34.1.3' }],
    ]);
  });
});
