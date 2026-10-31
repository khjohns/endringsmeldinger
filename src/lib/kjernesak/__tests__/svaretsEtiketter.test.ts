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
import { etiketterVedAksepten, etiketterVedSvaret, type Aksepten } from '../svaretsEtiketter';
import { lagKravkontroll } from '../kravkontroll.svelte';
import type { Kjernesakkontekst } from '../kontekst.svelte';
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
        hovedkrav_godkjent_beloep: 150_000,
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

  describe('i brevkontrollen ved aksept (VG-B-02)', () => {
    const journal = svar(
      krav,
      'vederlag',
      {
        hovedkrav_vurdering: 'delvis',
        hovedkrav_godkjent_beloep: 150_000,
        aksepterer_metode: true,
      },
      { resultat: 'delvis_godkjent', godkjent_beloep: 150_000 }
    );
    const u = utledJournal(journal, KJERNE);
    const bilde = lagSaksbilde(journal, [], u, visning(u, KJERNE.regler));

    /** Kravkontrollen med en kjerne som avviser aksepten før brevet vises, eller lager brevet. */
    const kontroll = (avviserAksepten: boolean) =>
      lagKravkontroll({
        brev: (k: { type: string }) =>
          avviserAksepten && k.type === 'aksept' ? null : { tekst: [`Brevet for ${k.type}.`] },
        send: async () => true,
        saksbilde: bilde,
        feil: null,
        regelversjon: KJERNE.regler.versjon,
      } as unknown as Kjernesakkontekst);

    /** Som Kontrollrommet: aksepten gjelder brevet som er åpent rett etter kallet. */
    const godta = (k: ReturnType<typeof kontroll>): Aksepten | null => {
      void k.aksept('vederlag', u.spor.vederlag.gjeldendeSvar!.id);
      return k.letter ? { spor: 'vederlag', brev: k.letter } : null;
    };

    it('brevet aksepten åpnet, har etikettene ved svaret', () => {
      const k = kontroll(false);
      expect(etiketterVedAksepten(godta(k), k.letter, bilde, u)).toEqual([
        { kode: 'subsidiaert', tekst: 'Subsidiært standpunkt' },
      ]);
    });

    it('avviser kjernen aksepten før brevet vises, har neste brev TE kontrollerer ingen etiketter', () => {
      const k = kontroll(true);
      const aksepten = godta(k);
      expect(k.letter).toBeNull();
      void k.trekk('vederlag').send();
      expect(k.letter).not.toBeNull();
      expect(etiketterVedAksepten(aksepten, k.letter, bilde, u)).toEqual([]);
    });

    it('et annet brev enn det aksepten åpnet, har ingen etiketter', () => {
      const k = kontroll(false);
      const aksepten = godta(k);
      k.cancel();
      void k.trekk('vederlag').send();
      expect(etiketterVedAksepten(aksepten, k.letter, bilde, u)).toEqual([]);
    });
  });
});
