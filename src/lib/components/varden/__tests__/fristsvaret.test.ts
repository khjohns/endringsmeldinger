/**
 * Byggherrens svar på fristkravet slik Varden sender det (`fristsvaret`), fra valgene i skjemaet
 * og til kjernen tar imot kommandoen (G-4 i BF-20). Kjernen regner resultatet og lagene; testene
 * viser at skjemaet gir én vurdering per frist (KA-U74) og standpunktene for hele kravet.
 */

import { describe, expect, it } from 'vitest';
import { laastTekst, utledJournal } from '$kjerne/kommandoer/skriving';
import { lagForUtkastet } from '$kjerne/kommandoer/lag';
import { KJERNE } from '$kjerne/versjon';
import { innholdIFristen } from '$kjerne/spor/frist/format';
import { medGrunnlag, skrevet } from '$lib/kjernesak/__tests__/provejournal';
import {
  fristsvaret,
  godkjenteDager,
  godkjenteDagerIFeltet,
  heleDager,
  skrivGodkjenteDager,
  tomFrist,
  tomtFristsvar,
  velgDagene,
  type Fristsvarvalg,
} from '../fristsvar';

const medFristkrav = skrevet(medGrunnlag, 'TE', {
  type: 'krav',
  spor: 'frist',
  innhold: {
    frister: [
      { nummer: '5', navn: 'Mekanisk ferdigstillelse', dager: 25 },
      { navn: 'Sluttfristen', dager: 10 },
    ],
  },
  utdypning: 'Pelingen tar fire uker lenger.',
});
const u = utledJournal(medFristkrav, KJERNE);
const [f1, f2] = innholdIFristen(u.spor.frist.gjeldendeKrav!).frister;

const besvart = (endring: Partial<Fristsvarvalg> = {}): Fristsvarvalg => ({
  ...tomtFristsvar(),
  varselITide: true,
  hindret: true,
  spesifisertITide: true,
  frister: {
    [f1!.id]: { ...tomFrist(), dager: 'deler', deldager: '20' },
    [f2!.id]: { ...tomFrist(), dager: 'alle' },
  },
  ...endring,
});

describe('svaret på fristkravet Varden sender (G-4 i BF-20)', () => {
  it('har én vurdering per frist i kravets rekkefølge, og kjernen regner resultatet per frist (KA-U74)', () => {
    const kommando = fristsvaret(besvart(), u, KJERNE.regler)!;
    const s = kommando.svar[0];
    expect(s.vurderinger).toEqual({
      frist_varsel_ok: true,
      vilkar_oppfylt: true,
      spesifisert_krav_ok: true,
      frister: [{ dager: 20 }, { dager: 10 }],
    });
    expect((s.resultat as { frister: unknown[] }).frister).toMatchObject([
      { gjelder: f1!.id, resultat: 'delvis_godkjent', godkjent_dager: 20 },
      { gjelder: f2!.id, resultat: 'godkjent', godkjent_dager: 10 },
    ]);
    expect(() => skrevet(medFristkrav, 'BH', kommando)).not.toThrow();
  });

  it('kravet spesifisert for sent sender dagene byggherren måtte forstå per frist (D-5)', () => {
    const valg = besvart({ spesifisertITide: false });
    valg.frister[f1!.id]!.maatteForstaa = '15';
    valg.frister[f2!.id]!.maatteForstaa = '5';
    const s = fristsvaret(valg, u, KJERNE.regler)!.svar[0];
    expect(s.vurderinger.frister).toEqual([
      { dager: 20, dager_maatte_forstaa: 15 },
      { dager: 10, dager_maatte_forstaa: 5 },
    ]);
    const tekst = laastTekst(skrevet(medFristkrav, 'BH', { type: 'brev', svar: [s] }).at(-1)!)!
      .join(' ')
      .replace(/\s/g, ' ');
    expect(tekst).toContain('spesifisert for sent');
  });

  it('kontrollsak: kravet spesifisert i tide sender ikke dagene byggherren måtte forstå, selv om feltet er fylt ut', () => {
    const valg = besvart();
    valg.frister[f1!.id]!.maatteForstaa = '15';
    expect(fristsvaret(valg, u, KJERNE.regler)!.svar[0].vurderinger.frister).toEqual([
      { dager: 20 },
      { dager: 10 },
    ]);
  });

  it('ubesvarte dager gir ikke noe resultat, og kjernen avviser svaret', () => {
    const valg = besvart();
    valg.frister[f2!.id] = tomFrist();
    const kommando = fristsvaret(valg, u, KJERNE.regler)!;
    expect(kommando.svar[0].resultat).toEqual({});
    expect(() => skrevet(medFristkrav, 'BH', kommando)).toThrow();
  });

  it('begrunnelsen per punkt står bare for punktene brevet har, og forbeholdet er utdypningen', () => {
    const valg = besvart({
      begrunnelser: { hindring: 'Pelingen ligger på kritisk linje.', borte: 'x', [f1!.id]: ' ' },
      forbehold: 'Vi tar forbehold om fremdriftsplanen.',
    });
    const s = fristsvaret(valg, u, KJERNE.regler, ['hindring', f1!.id])!.svar[0];
    expect(s.utdypninger).toEqual({ hindring: 'Pelingen ligger på kritisk linje.' });
    expect(s.utdypning).toBe('Vi tar forbehold om fremdriftsplanen.');
  });

  it('lagene i utkastet regnes også før dagene er besvart (M-8 i BF-20)', () => {
    const valg = { ...tomtFristsvar(), varselITide: false };
    const lag = lagForUtkastet(fristsvaret(valg, u, KJERNE.regler)!.svar[0], u, KJERNE.regler);
    const dager = lag.standpunkter.filter((s) => s.art === 'dager');
    expect(dager.map((s) => s.gjelder)).toEqual([f1!.id, f2!.id]);
    expect(dager[0]!.forutsetninger).toContainEqual({ innsigelse: '33.4' });
  });
});

describe('dagene i feltene', () => {
  it.each([
    ['20', 20],
    [' 7 ', 7],
    ['', undefined],
    ['2,5', undefined],
    ['-3', undefined],
  ])('«%s» leses som %s', (tekst, forventet) => {
    expect(heleDager(tekst)).toBe(forventet);
  });

  it('alle dagene er de krevde, og avslått er 0', () => {
    expect(godkjenteDager({ ...tomFrist(), dager: 'alle' }, 25)).toBe(25);
    expect(godkjenteDager({ ...tomFrist(), dager: 'avslaatt' }, 25)).toBe(0);
    expect(godkjenteDager(tomFrist(), 25)).toBeUndefined();
  });

  // U-14 og prototypen `fristkrav-te.html#svar`: tallet i «Godkjente dager» styrer valget, også et
  // tall over kravet, som skjemaet avviser før brevet lages (`deldagerFeil`).
  it.each([
    ['25', 'alle', 25],
    ['0', 'avslaatt', 0],
    ['12', 'deler', 12],
    ['30', 'deler', 30],
    ['x', 'deler', undefined],
    ['', null, undefined],
  ] as const)('«%s» i «Godkjente dager» velger %s', (tekst, valget, dagene) => {
    const f = tomFrist();
    skrivGodkjenteDager(f, tekst, 25);
    expect(f.dager).toBe(valget);
    expect(godkjenteDager(f, 25)).toBe(dagene);
  });

  it('«Delvis» står når feltet tømmes, og feltet følger valget', () => {
    const f = { ...tomFrist(), dager: 'deler' as const, deldager: '12' };
    skrivGodkjenteDager(f, '', 25);
    expect(f.dager).toBe('deler');
    expect(godkjenteDagerIFeltet({ ...tomFrist(), dager: 'alle' }, 25)).toBe('25');
    expect(godkjenteDagerIFeltet({ ...tomFrist(), dager: 'avslaatt' }, 25)).toBe('0');
    expect(godkjenteDagerIFeltet(tomFrist(), 25)).toBe('');
    // Det BH skrev, står mens det er tallet for valget.
    const skrevet = tomFrist();
    skrivGodkjenteDager(skrevet, '025', 25);
    expect(godkjenteDagerIFeltet(skrevet, 25)).toBe('025');
  });

  it('«Delvis» tar ikke med seg de krevde dagene fra «Som krevd»', () => {
    const f = tomFrist();
    skrivGodkjenteDager(f, '25', 25);
    velgDagene(f, 'deler', 25);
    expect(f).toEqual({ ...tomFrist(), dager: 'deler' });
  });
});
