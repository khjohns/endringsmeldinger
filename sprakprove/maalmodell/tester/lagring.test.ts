/**
 * Forløp A–E mot testbasen (#304): hver kommando lagres i `hendelse` med
 * lageret fra språkprøven, og journalen leses fra basen før hver utledning.
 * Krever `KOE_TESTBASE_URL`. Kjør ikke samtidig med pytest mot samme base.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Versjonskonflikt } from '../../server/lager.ts';
import { lagOppsett, rydd, TESTBASE_URL, type Oppsett } from '../../tester/testbase.ts';
import { basebane } from './bane.ts';
import { Kjoring, kjor, MAALMODELL } from './kjorer.ts';

describe.skipIf(!TESTBASE_URL)('forløp A–E gjennom testbasen', () => {
  let o: Oppsett;
  beforeAll(async () => {
    o = await lagOppsett();
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  it.each(MAALMODELL.forlop.map((f) => [f.id, f] as const))('%s', async (_id, forlop) => {
    await kjor(forlop, await basebane(o), {
      pastand: (holder, melding) => expect(holder, melding).toBe(true),
    });
  });

  it('avviser en aksept forhåndsvist før en senere hendelse, og journalen er uendret (expected_version, 2.5)', async () => {
    const forlop = MAALMODELL.forlop.find((f) => f.id === 'F-MM-A1')!;
    const bane = await basebane(o);
    const k = new Kjoring(bane);
    for (const h of MAALMODELL.prefikser[forlop.start!])
      expect((await k.send(h))?.godtatt).toBe(true);
    const foran = (await bane.journal()).at(-1)!.versjon;
    const aksept = await k.prov({ handling: 'aksept', spor: 'vederlag' });
    if (!aksept.godtatt)
      throw new Error(`Forutsetning: aksepten ble avvist: ${aksept.avvisning.regel}`);

    // Byggherren reviderer svaret mens TE ser på forhåndsvisningen.
    expect(
      (
        await k.send({
          handling: 'revisjon',
          spor: 'vederlag',
          vurdering: 'delvis',
          godkjent_belop: 65000,
        })
      )?.godtatt
    ).toBe(true);
    const etterRevisjon = await bane.journal();
    await expect(bane.skriv(aksept.hendelser, foran)).rejects.toBeInstanceOf(Versjonskonflikt);
    expect(await bane.journal()).toEqual(etterRevisjon);

    // Kontrollsak: samme aksept på versjonen den ble regnet fra, lagres.
    const ny = await k.prov({ handling: 'aksept', spor: 'vederlag' });
    if (!ny.godtatt) throw new Error(`Forutsetning: aksepten ble avvist: ${ny.avvisning.regel}`);
    await bane.skriv(ny.hendelser, etterRevisjon.at(-1)!.versjon);
    expect((await k.utledning()).spor.vederlag.enighet?.grunnlag.utfall.belop).toBe(65000);
  });
});
