/**
 * Akseptfristen (HF-U23).
 * Saken i minnet er `sak()` i `brevsak.ts`, som i `brevtekst.test.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { etterAkseptfristen } from '../regler/akseptfrist.ts';
import { lesJournal } from '../format/leser.ts';
import { P1 } from './klient.ts';
import { visning } from '../utledning/visning.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';
import {
  BEGRUNNELSE,
  type Data,
  FRIST_FULLT,
  VEDERLAG_DELVIS,
  laast,
  sakMedKrav,
  svar,
  tekst,
} from './brevsak.ts';

/**
 * Akseptfristen i byggherrens svar, etter samlevedtaket for akseptfristen (HF-U23): hvilke svar
 * som kan ha en (punkt 1), datoene (punkt 2), at den lagres som en opplysning (punkt 4 og 5) og
 * brevet ved en aksept etter fristen (punkt 7). Sakene i `sakMedKrav()` får svaret mandag
 * 5. oktober 2026 og aksepten dagen etter.
 */
describe('akseptfristen (HF-U23)', () => {
  const medFrist = (svaret: Data, akseptfrist: string) => ({ ...svaret, akseptfrist });
  const brev = (...svarene: Data[]) => ({ type: 'brev', svar: svarene });
  const delvis = (s: ReturnType<typeof sakMedKrav>) =>
    svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]);
  const aksept = (s: ReturnType<typeof sakMedKrav>, spor: 'vederlag' | 'frist') => ({
    type: 'aksept',
    spor,
    svar: s.u().spor[spor].gjeldendeSvar!.id,
    regelversjon: KJERNE.regler.versjon,
  });

  it('et svar som godkjenner en del av beløpet, kan ha en akseptfrist, og den lagres i svaret (punkt 1 og 4)', () => {
    const s = sakMedKrav();
    s.send('BH', brev(medFrist(delvis(s), '2026-10-09')));
    expect(s.u().spor.vederlag.gjeldendeSvar!.akseptfrist).toBe('2026-10-09');
  });

  it('svarbrevet meddeler akseptfristen med datoen, sist i svaret (punkt 2, LV-U2, LV-U3, arbeidsvalget 14.11 i #502)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', brev(medFrist(delvis(s), '2026-10-09')));
    expect(laast(rad).at(-1)).toBe('Akseptfrist: 9. oktober 2026.');
    expect(tekst(rad).at(-1)?.overskrift, 'linjen har ingen overskrift').toBeUndefined();
  });

  it('linjen med akseptfristen står etter utdypningen under «Forbehold», og har ingen utdypning (punkt 5, arbeidsvalget 14.11 i #502)', () => {
    const s = sakMedKrav();
    expect(
      s.avvisning(
        'BH',
        brev({ ...medFrist(delvis(s), '2026-10-09'), utdypninger: { akseptfrist: 'Tekst.' } })
      )?.melding
    ).toBe('Linjen med akseptfristen har ingen utdypning.');
    const rad = s.send('BH', brev(medFrist(delvis(s), '2026-10-09')));
    expect(laast(rad).at(-1)).toBe('Akseptfrist: 9. oktober 2026.');
    expect(tekst(rad).at(-2)).toMatchObject({ punkt: 'forbehold', utdypning: BEGRUNNELSE });
  });

  it('en lagret akseptfrist som ikke finnes i kalenderen, er ikke forstått (MM-U2)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', brev(medFrist(delvis(s), '2026-10-09')));
    const med = (akseptfrist: string) => {
      const data = structuredClone(rad.data) as Data;
      (data.svar as Data[])[0].akseptfrist = akseptfrist;
      return lesJournal([...s.journal.slice(0, -1), { ...rad, data }], KJERNE.leserformat).at(-1)!
        .art;
    };
    expect(med('2026-10-09'), 'kontrollsak').toBe('dokument');
    expect(med('2026-02-30')).toBe('ukjent');
  });

  it('et svar uten akseptfrist har ingen (punkt 3)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', brev(delvis(s)));
    expect(s.u().spor.vederlag.gjeldendeSvar!.akseptfrist).toBeNull();
    expect(laast(rad).join('\n')).not.toContain('Akseptfrist');
  });

  it('et svar som godkjenner dagene bare subsidiært, kan ha en akseptfrist (punkt 1)', () => {
    const s = sakMedKrav();
    const subsidiaert = svar(
      'frist',
      s.krav('frist'),
      { ...FRIST_FULLT[0], frist_varsel_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    s.send('BH', brev(medFrist(subsidiaert, '2026-10-09')));
    expect(s.u().spor.frist.gjeldendeSvar!.akseptfrist).toBe('2026-10-09');
  });

  it('et svar på forholdet, et helt avslag og et svar som godkjenner hele kravet, kan ikke ha en akseptfrist (punkt 1)', () => {
    const s = sakMedKrav();
    const forholdet = svar('forhold', s.krav('forhold'), {
      resultat: 'avslaatt',
      grunnlag_varslet_i_tide: true,
    });
    const avslag = svar(
      'vederlag',
      s.krav('vederlag'),
      P1({ vurdering: 'avslaatt', aksepterer: true }),
      { resultat: 'avslaatt', godkjent_beloep: 0 }
    );
    const fullt = svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1]);
    expect(s.avvisning('BH', brev(medFrist(forholdet, '2026-10-09')))).toEqual({
      regel: 'AKSEPTFRIST_IKKE_TILLATT',
      melding: 'Et svar på påberopelsen av forholdet har ingen akseptfrist.',
    });
    expect(s.avvisning('BH', brev(medFrist(avslag, '2026-10-09')))).toEqual({
      regel: 'AKSEPTFRIST_IKKE_TILLATT',
      melding:
        'Svaret godkjenner verken beløp eller dager, prinsipalt eller subsidiært, og kan ikke ha en akseptfrist.',
    });
    expect(s.avvisning('BH', brev(medFrist(fullt, '2026-10-09')))).toEqual({
      regel: 'AKSEPTFRIST_IKKE_TILLATT',
      melding: 'Svaret godkjenner hele kravet og kan ikke ha en akseptfrist.',
    });
    expect(
      s.avvist('BH', brev(avslag, fullt)),
      'kontrollsak: de samme svarene uten frist'
    ).toBeNull();
  });

  it('fristen kan ikke ligge før datoen for svaret eller falle på en lørdag, helligdag eller høytidsdag; samme dag godtas (punkt 2)', () => {
    const s = sakMedKrav();
    const med = (dato: string) => s.avvisning('BH', brev(medFrist(delvis(s), dato)));
    expect(med('2026-10-04')).toEqual({
      regel: 'AKSEPTFRIST_UGYLDIG_DATO',
      melding: 'Akseptfristen 4. oktober 2026 er før datoen for svaret, 5. oktober 2026.',
    });
    expect(med('2026-10-10')).toEqual({
      regel: 'AKSEPTFRIST_UGYLDIG_DATO',
      melding: 'Akseptfristen 10. oktober 2026 er en lørdag.',
    });
    expect(med('2026-10-11')?.melding, 'en søndag er en helligdag').toBe(
      'Akseptfristen 11. oktober 2026 er en helligdag eller høytidsdag.'
    );
    expect(med('2026-12-25')?.regel, 'første juledag').toBe('AKSEPTFRIST_UGYLDIG_DATO');
    expect(med('2027-05-17')?.regel, 'høytidsdagen 17. mai').toBe('AKSEPTFRIST_UGYLDIG_DATO');
    expect(med('2026-02-30')?.melding).toBe('Akseptfristen 2026-02-30 finnes ikke i kalenderen.');
    expect(med('2026-10-05'), 'kontrollsak: samme dag som svaret').toBeNull();
    expect(med('2026-10-09'), 'kontrollsak: en fredag').toBeNull();
  });

  it('en frist med klokkeslett avvises som form', () => {
    const s = sakMedKrav();
    expect(s.avvist('BH', brev(medFrist(delvis(s), '2026-10-09T12:00:00Z')))).toBe('UGYLDIG_FORM');
  });

  it('godtar TE svaret etter akseptfristen, sier brevet det, og visningen viser det ved enigheten (punkt 7 og designdelen)', () => {
    const s = sakMedKrav();
    // Svaret sendes 5. oktober med frist samme dag, og aksepten 6. oktober.
    s.send('BH', brev(medFrist(delvis(s), '2026-10-05')));
    const rad = s.send('TE', aksept(s, 'vederlag'));
    expect(laast(rad)).toEqual([
      'Totalentreprenøren godtar byggherrens svar på kravet om justering av vederlaget i brev K201-KOE-017-04 av 5. oktober 2026. Aksepten er sendt etter akseptfristen 5. oktober 2026 i byggherrens svar.',
    ]);
    expect(
      s.u().spor.vederlag.enighet,
      'punkt\u00a08: registrert som andre aksepter'
    ).not.toBeNull();
    expect(visning(s.u(), KJERNE.regler).spor.vederlag.etiketter).toContain(
      'aksept_etter_akseptfristen'
    );
  });

  it('en aksept senest den dagen fristen gjelder, sier ingenting om fristen (punkt 2 og 5, kontrollsak)', () => {
    const s = sakMedKrav();
    s.send('BH', brev(medFrist(delvis(s), '2026-10-06')));
    const rad = s.send('TE', aksept(s, 'vederlag'));
    expect(laast(rad)).toEqual([
      'Totalentreprenøren godtar byggherrens svar på kravet om justering av vederlaget i brev K201-KOE-017-04 av 5. oktober 2026.',
    ]);
    expect(visning(s.u(), KJERNE.regler).spor.vederlag.etiketter).not.toContain(
      'aksept_etter_akseptfristen'
    );
  });

  it.each([
    ['innen fristen', '2026-10-06', false],
    ['etter fristen (kontrollsak)', '2026-10-07', true],
  ] as [string, string, boolean][])(
    'en aksept sendt %s utenfor løsningen og lagt til senere, merkes etter dagen den ble sendt (punkt\u00a07, OV-U98)',
    (_n, sendt, etter) => {
      const s = sakMedKrav();
      s.send('BH', brev(medFrist(delvis(s), '2026-10-06')));
      const svaret = s.u().spor.vederlag.gjeldendeSvar!.id;
      // Svaret er sendt 05.10, og aksepten legges til 06.10; dagen etter er 07.10.
      s.send('BH', {
        type: 'brev',
        svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
      });
      s.rad('TE', {
        utsagn: [
          { id: randomUUID(), art: 'aksept', gjelder: svaret, regelversjon: KJERNE.regler.versjon },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: sendt }],
        ...SOM_BREV,
      });
      const u = s.u();
      expect(u.spor.vederlag.enighet, 'forutsetning: aksepten har virkning').not.toBeNull();
      expect(
        visning(u, KJERNE.regler).spor.vederlag.etiketter.includes('aksept_etter_akseptfristen')
      ).toBe(etter);
    }
  );

  it('dagen aksepten sendes, regnes i norsk tid (punkt 2)', () => {
    expect(etterAkseptfristen('2026-10-05', '2026-10-06')).toBe(true);
    expect(etterAkseptfristen('2026-10-05', '2026-10-05')).toBe(false);
  });
});
