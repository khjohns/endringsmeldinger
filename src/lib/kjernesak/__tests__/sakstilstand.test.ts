/**
 * TS-saken projisert til det Kontrollrommet leser (FK-8b, #718). Kildene er
 * oversettelsestabellene i `kjerne/format/koder.ts` (katalogens koder), TEs
 * utdypning under kravet (LV-U2) og oppdragsgivers svar 17.10 i #718: byggherrens
 * svar vises bare som at svar finnes, uten resultat og beløp.
 */

import { describe, expect, it } from 'vitest';
import { utledJournal } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import { kravversjon, sporvisning, tilSakState, tilTidslinje } from '$lib/kjernesak/sakstilstand';
import {
  skrevet,
  SAK,
  medFristvarsel,
  medGrunnlag,
  medSvar,
  medVederlag,
  medVederlagsvarsel,
} from './provejournal';

describe('TS-saken som Kontrollrommet leser den', () => {
  it('kategorien og metoden står med katalogens koder, og TEs utdypning er begrunnelsen', () => {
    const u = utledJournal(medVederlag, KJERNE);
    const sak = tilSakState(SAK, 'Ny peling', medVederlag, u);
    expect(sak.sakstittel).toBe('Ny peling');
    expect(sak.grunnlag).toMatchObject({
      hovedkategori: 'ENDRING',
      underkategori: 'IRREG',
      beskrivelse: 'BH påla ny peling.',
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
    expect(() => sak.grunnlag.bh_resultat).toThrow(/projiseres ikke/);
    expect(sak.grunnlag.bh_begrunnelse).toBeUndefined();
    const grunnlag = sporvisning(sak, u, 'ansvar');
    expect(grunnlag).toMatchObject({
      bhHarSvart: true,
      bhPosition: 'BH har svart',
      isDisputed: false,
    });
    expect(sporvisning(sak, u, 'vederlag').bhHarSvart).toBe(false);
  });

  it('statusfeltene projiseres ikke, så en lesing av dem kaster (#718, #313)', () => {
    const u = utledJournal(medSvar, KJERNE);
    const sak = tilSakState(SAK, null, medSvar, u);
    expect(() => sak.overordnet_status).toThrow(/overordnet_status projiseres ikke/);
    expect(() => sak.kan_utstede_eo).toThrow(/projiseres ikke/);
    expect(() => sak.er_subsidiaert_vederlag).toThrow(/projiseres ikke/);
    for (const spor of [sak.grunnlag, sak.vederlag, sak.frist]) {
      expect(() => spor.status).toThrow(/status projiseres ikke/);
      expect(() => spor.antall_versjoner).toThrow(/projiseres ikke/);
      expect(() => spor.bh_resultat).toThrow(/projiseres ikke/);
    }
    expect(() => sak.grunnlag.laast).toThrow(/projiseres ikke/);
    // Spredningen kopierer ikke getterne, så den kaster ikke.
    expect({ ...sak.vederlag }).not.toHaveProperty('status');
  });

  it('et registrert varsel etter § 33.4 gir fristsporet et varsel uten krevde dager', () => {
    const uten = utledJournal(medVederlag, KJERNE);
    expect(sporvisning(tilSakState(SAK, null, medVederlag, uten), uten, 'frist').hasNotice).toBe(
      false
    );

    const u = utledJournal(medFristvarsel, KJERNE);
    expect(sporvisning(tilSakState(SAK, null, medFristvarsel, u), u, 'frist')).toMatchObject({
      hasNotice: true,
      unspecified: true,
    });
  });

  it('et registrert varsel etter § 34.1.2 gir vederlagssporet et varsel uten krevd beløp (OV-U5)', () => {
    const u = utledJournal(medVederlagsvarsel, KJERNE);
    expect(sporvisning(tilSakState(SAK, null, medVederlagsvarsel, u), u, 'vederlag')).toMatchObject(
      { hasNotice: true, unspecified: true }
    );
  });

  it('hovedbeløpet står i belop_direkte, som skjemaet sender, og ikke i kostnads_overslag (#872, OV-U1)', () => {
    const u = utledJournal(medVederlag, KJERNE);
    const tilbud = tilSakState(SAK, null, medVederlag, u).vederlag;
    // Feltene leses ett og ett: getterne for statusfeltene kaster (#718).
    expect([
      tilbud.belop_direkte,
      tilbud.kostnads_overslag,
      tilbud.saerskilt_krav,
      tilbud.krevd_belop,
    ]).toEqual([250000, undefined, undefined, 250000]);
  });

  // OV-U23: kravet er justeringen ellers og posten etter § 34.1.3 annet ledd, og hovedbeløpet
  // kan mangle. Det krevde er summen, som i sakslisten (#1218).
  it.each([
    ['bare posten', { produktivitet: 40000 }, undefined, 40000],
    ['hovedbeløpet og posten', { beloep: 250000, produktivitet: 40000.5 }, 250000, 290000.5],
  ] as const)(
    'et krav med %s gir posten i saerskilt_krav og summen som det krevde (OV-U23)',
    (_n, krav, hovedbeloep, sum) => {
      const journal = skrevet(medGrunnlag, 'TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: {
          metode: 'tilbud',
          ...('beloep' in krav ? { beloep: krav.beloep } : {}),
          saerskilt: { produktivitet: { beloep: krav.produktivitet } },
        },
      });
      const u = utledJournal(journal, KJERNE);
      const sak = tilSakState(SAK, null, journal, u);
      expect([
        sak.vederlag.belop_direkte,
        sak.vederlag.saerskilt_krav,
        sak.vederlag.krevd_belop,
      ]).toEqual([hovedbeloep, { produktivitet: { belop: krav.produktivitet } }, sum]);
      expect(sporvisning(sak, u, 'vederlag')).toMatchObject({
        unspecified: false,
        krevdValue: sum,
      });
    }
  );

  it('kravversjonen telles langs erstatter, og en syklus i erstatter stopper tellingen (#737 p6)', () => {
    const u = utledJournal(medVederlag, KJERNE);
    expect(kravversjon(u, 'vederlag')).toBe(1);
    expect(kravversjon(u, 'frist')).toBe(0);

    // Kjernen lager ingen syklus; den settes inn for å vise at tellingen stopper.
    const syklus = structuredClone(u);
    const krav = syklus.spor.vederlag.gjeldendeKrav!;
    krav.erstatter = krav.id;
    syklus.spor.vederlag.krav = [krav];
    expect(kravversjon(syklus, 'vederlag')).toBe(1);
  });

  it('aktøren i tidslinjen er navnet serveren slo opp, ikke bare rollen (#835 p1)', () => {
    const u = utledJournal(medSvar, KJERNE);
    const rader = medSvar.map((r, i) =>
      i === 3 ? { ...r, aktor_navn: 'Byggherrens saksbehandler' } : r
    );
    const tidslinje = tilTidslinje('p-1', SAK, rader, u, {});
    expect(tidslinje[3]).toMatchObject({ actor: 'Byggherrens saksbehandler', actorrole: 'BH' });
    expect(tidslinje[0].actor).toBeUndefined();
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

  it('et trukket grunnlag gir «Trukket» bare i spor der noe er sendt (GR-U25, #1140)', () => {
    const journal = skrevet(medVederlag, 'TE', { type: 'trekk', spor: 'grunnlag' });
    const u = utledJournal(journal, KJERNE);
    const sak = tilSakState(SAK, null, journal, u);
    expect(sporvisning(sak, u, 'ansvar').isWithdrawn).toBe(true);
    expect(sporvisning(sak, u, 'vederlag').isWithdrawn).toBe(true);
    expect(sporvisning(sak, u, 'frist').isWithdrawn).toBe(false);
  });
});
