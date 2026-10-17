/**
 * TS-saken projisert til det Kontrollrommet leser (FK-8b, #718). Kildene er
 * oversettelsestabellene i `kjerne/format/koder.ts` (katalogens koder), TEs
 * utdypning under kravet (LV-U2) og oppdragsgivers svar 17.10 i #718: byggherrens
 * svar vises bare som at svar finnes, uten resultat og beløp.
 */

import { describe, expect, it } from 'vitest';
import { utledJournal } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import { sporvisning, tilSakState, tilTidslinje } from '$lib/kjernesak/sakstilstand';
import { SAK, medSvar, medVederlag } from './provejournal';

describe('TS-saken som Kontrollrommet leser den', () => {
  it('kategorien og metoden står med katalogens koder, og TEs utdypning er begrunnelsen', () => {
    const u = utledJournal(medVederlag, KJERNE);
    const sak = tilSakState(SAK, 'Ny peling', medVederlag, u);
    expect(sak.sakstittel).toBe('Ny peling');
    expect(sak.grunnlag).toMatchObject({
      hovedkategori: 'ENDRING',
      underkategori: 'IRREG',
      beskrivelse: 'BH påla ny peling.',
      antall_versjoner: 1,
    });
    expect(sak.vederlag).toMatchObject({
      metode: 'FASTPRIS_TILBUD',
      krevd_belop: 250000,
      begrunnelse: 'Tilbudet gjelder pelingen.',
    });
    expect(sak.frist.krevd_dager).toBeUndefined();
    expect(sporvisning(sak, u, 'vederlag')).toMatchObject({
      krevdValue: 250000,
      unspecified: false,
    });
    expect(sporvisning(sak, u, 'frist')).toMatchObject({ unspecified: true, antallVersjoner: 0 });
  });

  it('byggherrens svar vises bare som at svar finnes, uten resultat (oppdragsgiver 17.10, #718)', () => {
    const uten = utledJournal(medVederlag, KJERNE);
    expect(sporvisning(tilSakState(SAK, null, medVederlag, uten), uten, 'ansvar').bhHarSvart).toBe(
      false
    );

    const u = utledJournal(medSvar, KJERNE);
    const sak = tilSakState(SAK, null, medSvar, u);
    expect(sak.grunnlag.bh_resultat).toBeUndefined();
    expect(sak.grunnlag.bh_begrunnelse).toBeUndefined();
    const grunnlag = sporvisning(sak, u, 'ansvar');
    expect(grunnlag).toMatchObject({
      bhHarSvart: true,
      bhPosition: 'BH har svart',
      isDisputed: false,
    });
    expect(sporvisning(sak, u, 'vederlag').bhHarSvart).toBe(false);
  });

  it('journalen blir tidslinjen i rekkefølgen og med sporet hendelsen har krav eller svar i', () => {
    const u = utledJournal(medSvar, KJERNE);
    const tidslinje = tilTidslinje('p-1', SAK, medSvar, u, { 'e-1': 'Saken er opprettet' });
    expect(tidslinje.map((e) => [e.streamposition, e.actorrole, e.spor])).toEqual([
      [1, 'TE', null],
      [2, 'TE', 'grunnlag'],
      [3, 'TE', 'vederlag'],
      [4, 'BH', 'grunnlag'],
    ]);
    expect(tidslinje[0]).toMatchObject({
      id: 'e-1',
      source: '/projects/p-1/cases/sak-1',
      summary: 'Saken er opprettet',
    });
  });
});
