/**
 * Det brevet setter foran BHs svar på vederlaget (`grunnlagetForSvaret`), som Varden leser
 * for forbeholdet i skjemaet (`kjernesak.forbehold`). Forventningene sto i den fjernede
 * testen av lagene i vederlagssvaret (#1678).
 */

import { describe, expect, it } from 'vitest';
import { utledJournal } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad } from '$kjerne/typer';
import { grunnlagetForSvaret } from '../vederlagssvar';
import { medGrunnlag, skrevet } from './provejournal';

const grunnlagssvar = (journal: Journalrad[], vurderinger: Record<string, unknown>) =>
  skrevet(journal, 'BH', {
    type: 'brev',
    svar: [
      {
        spor: 'forhold',
        gjelder: utledJournal(journal, KJERNE).spor.forhold.gjeldendeKrav!.id,
        regelversjon: KJERNE.regler.versjon,
        vurderinger,
        resultat: {},
        utdypning: 'Svaret på grunnlaget.',
      },
    ],
  });

const grunnlaget = (journal: Journalrad[]) => grunnlagetForSvaret(utledJournal(journal, KJERNE));

describe('grunnlaget foran svaret på vederlaget', () => {
  it('GR-U26: grunnlaget ubesvart gir forbeholdet og ingen grunn', () => {
    expect(grunnlaget(medGrunnlag)).toEqual({ grunner: [], forbehold: true });
  });

  it('OV-U33: grunnlaget avslått gir avslaget som grunn og ikke forbeholdet', () => {
    const journal = grunnlagssvar(medGrunnlag, {
      resultat: 'avslaatt',
      grunnlag_varslet_i_tide: true,
    });
    expect(grunnlaget(journal)).toEqual({ grunner: ['avslaatt'], forbehold: false });
  });

  it('GR-U7, GR-U23: frafall etter § 32.3 c gir ingen grunn og ikke forbeholdet', () => {
    const journal = grunnlagssvar(medGrunnlag, {
      resultat: 'paalegg_frafalt',
      grunnlag_varslet_i_tide: true,
    });
    expect(grunnlaget(journal)).toEqual({ grunner: [], forbehold: false });
  });

  it('GR-U23: etter et frafall venter en ny versjon av grunnlaget på svar, og det gir ikke forbeholdet', () => {
    const frafall = grunnlagssvar(medGrunnlag, {
      resultat: 'paalegg_frafalt',
      grunnlag_varslet_i_tide: true,
    });
    const journal = skrevet(frafall, 'TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: {
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        paalegg_mottatt: '2026-10-01',
      },
      utdypning: 'Påberopelsen i versjon 2.',
    });
    const u = utledJournal(journal, KJERNE);
    expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
    expect(grunnlagetForSvaret(u)).toEqual({ grunner: [], forbehold: false });
  });

  it('OV-U32: preklusjon etter § 32.2 gir preklusjonen som grunn', () => {
    const journal = grunnlagssvar(medGrunnlag, {
      resultat: 'godkjent',
      grunnlag_varslet_i_tide: false,
    });
    expect(grunnlaget(journal)).toEqual({ grunner: ['prekludert'], forbehold: false });
  });

  it('OV-U32: preklusjon etter § 32.2 og avslag gir to grunner, preklusjonen først', () => {
    const journal = grunnlagssvar(medGrunnlag, {
      resultat: 'avslaatt',
      grunnlag_varslet_i_tide: false,
    });
    expect(grunnlaget(journal).grunner).toEqual(['prekludert', 'avslaatt']);
  });
});
