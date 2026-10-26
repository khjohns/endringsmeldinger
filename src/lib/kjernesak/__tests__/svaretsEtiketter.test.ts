/**
 * Etikettene ved byggherrens svar, som visningen og brevkontrollen ved aksept viser (VG-B-02, #732).
 * Forventningen er vedtakene bak etikettene i `visning`: et svar på vederlaget etter at grunnlaget
 * er avslått, er subsidiært (OV-U33, A2).
 */
import { describe, expect, it } from 'vitest';
import { utledJournal } from '$kjerne/kommandoer/skriving';
import { visning } from '$kjerne/utledning/visning';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad } from '$kjerne/typer';
import { lagSaksbilde } from '../saksbilde';
import { etiketterVedSvaret } from '../svaretsEtiketter';
import { medGrunnlag, skrevet } from './provejournal';

const vedSvaret = (journal: Journalrad[]) => {
  const u = utledJournal(journal, KJERNE);
  const bilde = lagSaksbilde(journal, [], u, visning(u, KJERNE.regler));
  return { bilde, etiketter: etiketterVedSvaret(bilde, u, 'vederlag') };
};

const svar = (
  journal: Journalrad[],
  spor: 'grunnlag' | 'vederlag',
  vurderinger: object,
  resultat: object = {}
) =>
  skrevet(journal, 'BH', {
    type: 'brev',
    svar: [
      {
        spor,
        gjelder: utledJournal(journal, KJERNE).spor[spor].gjeldendeKrav!.id,
        regelversjon: KJERNE.regler.versjon,
        vurderinger,
        resultat,
        utdypning: 'Svaret.',
      },
    ],
  });

describe('etikettene ved svaret', () => {
  const avslaatt = svar(medGrunnlag, 'grunnlag', {
    resultat: 'avslaatt',
    grunnlag_varslet_i_tide: true,
  });
  const krav = skrevet(avslaatt, 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', beloep: 250_000 },
    utdypning: 'Tilbudet.',
  });

  it('OV-U33: svaret på vederlaget etter avslått grunnlag har etiketten «Subsidiært standpunkt»', () => {
    const journal = svar(
      krav,
      'vederlag',
      {
        hovedkrav_vurdering: 'delvis',
        hovedkrav_godkjent_belop: 150_000,
        aksepterer_metode: true,
      },
      { resultat: 'delvis_godkjent', godkjent_beloep: 150_000 }
    );
    expect(vedSvaret(journal).etiketter).toEqual([
      { kode: 'subsidiaert', tekst: 'Subsidiært standpunkt' },
    ]);
  });

  it('uten svar i sporet er det ingen etiketter ved svaret, selv om kravet står subsidiært', () => {
    const { bilde, etiketter } = vedSvaret(krav);
    const alle = bilde.spor.find((s) => s.spor === 'vederlag')!.etiketter.map((e) => e.kode);
    expect(alle).toContain('subsidiaert');
    expect(etiketter).toEqual([]);
  });

  it('uten saksbilde er det ingen etiketter', () => {
    expect(etiketterVedSvaret(null, null, 'vederlag')).toEqual([]);
  });
});
