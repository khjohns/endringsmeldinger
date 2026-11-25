import { describe, expect, it } from 'vitest';
import startjournaler from '../../../../docs/domenetabell/brukerforlop/startjournaler.json';
import { KJERNE } from '#kjerne/versjon.ts';
import { utledJournal } from '#kjerne/utledning/utled.ts';
import { brevFor, harTekst, laastTekstI } from '../brevtekst.ts';
import { finnForloep, FORLOEP, lagDemosak, medGjeldendeRegelversjon } from '../demosak.ts';

/** Hver verdi med feltet `regelversjon` i `data`, i alle nivåer. */
function regelversjonene(data: unknown): unknown[] {
  if (Array.isArray(data)) return data.flatMap(regelversjonene);
  if (typeof data !== 'object' || data === null) return [];
  return Object.entries(data).flatMap(([felt, verdi]) =>
    felt === 'regelversjon' ? [verdi] : regelversjonene(verdi)
  );
}

describe('startjournalene i demoruta (#2116)', () => {
  it('en startjournal skrevet med en eldre regelversjon får gjeldende versjon i beslutningsgrunnlaget og aksepten', () => {
    const eldre = KJERNE.regler.versjon - 1;
    const journal = {
      svar: [{ beslutningsgrunnlag: { regelversjon: eldre, linje: 'regelversjon' } }],
      utsagn: [{ art: 'aksept', regelversjon: eldre }],
    };
    expect(medGjeldendeRegelversjon(journal)).toEqual({
      svar: [
        { beslutningsgrunnlag: { regelversjon: KJERNE.regler.versjon, linje: 'regelversjon' } },
      ],
      utsagn: [{ art: 'aksept', regelversjon: KJERNE.regler.versjon }],
    });
  });

  it('forløpene i demoruta har gjeldende regelversjon der startjournalene har en', () => {
    const iFila = regelversjonene(startjournaler);
    expect(iFila.length, 'forutsetning: fila har regelversjoner').toBeGreaterThan(0);
    const iDemoen = regelversjonene(FORLOEP);
    expect(iDemoen).toHaveLength(iFila.length);
    expect(new Set(iDemoen)).toEqual(new Set([KJERNE.regler.versjon]));
  });
});

describe('klokka i demoruta (BF-46 G-1, U-5)', () => {
  /** TE godtar byggherrens svar på fristkravet i demoen, med brevet brevkontrollen lager. */
  async function godtaFristsvaret(forloep: string, punkt: string) {
    const demosak = lagDemosak(finnForloep(forloep)!, punkt, 'TE');
    const saken = await demosak.hent(demosak.sakId, '');
    const journal = demosak.journal();
    const svar = utledJournal(journal, KJERNE).spor.frist.gjeldendeSvar!.id;
    const kommando = { type: 'aksept', spor: 'frist', svar, regelversjon: KJERNE.regler.versjon };
    const brev = brevFor(kommando, demosak.sakId, 'TE', saken.merking!, journal, KJERNE);
    if (!harTekst(brev)) throw new Error(`Brevkontrollen ga ingen tekst: ${JSON.stringify(brev)}`);
    const tekst = laastTekstI(brev)!;
    await demosak.send(demosak.sakId, saken.versjon, '', { ...kommando, brevtekst: tekst }, '');
    return { tekst: tekst.join(' '), sendt: demosak.journal().at(-1)!.tidsstempel };
  }

  // Kilder: BF-46 U-5 og D-3, HF-U23 punkt 7.
  it('etter tiden_gaar lager brevkontrollen teksten med demoens dato, og sendingen godtar den', async () => {
    const { tekst, sendt } = await godtaFristsvaret('BF-46', 'te-etter-akseptfristen');
    expect(sendt.slice(0, 10)).toBe('2026-10-16');
    expect(tekst).toContain('Aksepten er sendt etter akseptfristen 15. oktober 2026');
  });

  // Kilder: BF-46 U-5 og D-3, HF-U23 punkt 2 og 7, LV-U2. Demoens dato er 1. oktober 2026, før
  // akseptfristen; nettleserens klokke er en annen dag.
  it('uten tiden_gaar bruker brevkontrollen demoens dato før akseptfristen, ikke nettleserens', async () => {
    const { tekst, sendt } = await godtaFristsvaret('BF-45', 'te-har-mottatt-svaret');
    expect(sendt.slice(0, 10)).toBe('2026-10-01');
    expect(tekst).toContain('godtar byggherrens svar');
    expect(tekst).not.toContain('etter akseptfristen');
  });
});
