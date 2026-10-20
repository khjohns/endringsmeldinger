import { describe, expect, it } from 'vitest';
import { iUtvalg, velgSaker, type Saksutvalg } from '../overview';
import { lagSakslinje } from '$lib/mocks/sakslinje';

const ingenting = { etiketter: [], venter_paa_svar: false, svar_ikke_godtatt: false };

const venter = lagSakslinje({
  sak_id: 'KOE-1',
  sakstittel: 'Grunnforhold',
  frist: { ...ingenting, venter_paa_svar: true, krav: { dager: 10 }, svar: null, enighet: null },
});
const svart = lagSakslinje({
  sak_id: 'KOE-2',
  sakstittel: 'Fasade',
  vederlag: {
    ...ingenting,
    svar_ikke_godtatt: true,
    krav: { beloep: 100, metode: 'tilbud' },
    svar: { resultat: 'avslaatt', beloep: 0, subsidiaert: false },
    enighet: null,
  },
});
const avgjort = lagSakslinje({ sak_id: 'KOE-3', saksbetegnelse: 'kravene_avgjort' });
const ukjent = lagSakslinje({
  sak_id: 'KOE-4',
  forstaatt: false,
  saksbetegnelse: 'ikke_forstaatt',
});
const saker = [venter, svart, avgjort, ukjent];

describe('utvalgene i prosjektoversikten leser det som foreligger, ikke en status', () => {
  it.each([
    ['alle', [venter, svart, avgjort, ukjent]],
    ['venter_paa_svar', [venter]],
    ['svar_ikke_godtatt', [svart]],
    ['med_saksbetegnelse', [avgjort]],
    ['ikke_forstaatt', [ukjent]],
  ] as [Saksutvalg, unknown[]][])('%s (MM-U22, MM-U29)', (utvalg, forventet) => {
    expect(saker.filter((l) => iUtvalg(l, utvalg))).toEqual(forventet);
  });

  it('en sak som ikke er forstått, er ikke «med saksbetegnelse» selv om den har en', () => {
    expect(iUtvalg(ukjent, 'med_saksbetegnelse')).toBe(false);
  });

  it('søket går på sak-ID og tittel uten hensyn til store bokstaver, og fristkravene kan velges', () => {
    expect(velgSaker(saker, '  GRUNNFORHOLD ', 'alle')).toEqual([venter]);
    expect(velgSaker(saker, 'koe-2', 'alle')).toEqual([svart]);
    expect(velgSaker(saker, '', 'alle', true)).toEqual([venter]);
    expect(velgSaker(saker, 'ingen treff', 'alle')).toEqual([]);
  });

  it('fristkravene er de samme som flisen teller: ikke trukket, ikke i en avsluttet sak', () => {
    const krav = { krav: { dager: 5 }, svar: null, enighet: null };
    const trukket = lagSakslinje({
      sak_id: 'KOE-5',
      frist: { ...ingenting, etiketter: ['trukket'], ...krav },
    });
    const avsluttet = lagSakslinje({
      sak_id: 'KOE-6',
      saksbetegnelse: 'avslaget_paa_grunnlaget_godtatt',
      frist: { ...ingenting, ...krav },
    });
    const grunnlagetTrukket = lagSakslinje({
      sak_id: 'KOE-7',
      saksbetegnelse: 'grunnlaget_trukket',
      frist: { ...ingenting, ...krav },
    });
    const ikkeForstaatt = lagSakslinje({
      sak_id: 'KOE-8',
      forstaatt: false,
      frist: { ...ingenting, ...krav },
    });
    expect(
      velgSaker([venter, trukket, avsluttet, grunnlagetTrukket, ikkeForstaatt], '', 'alle', true)
    ).toEqual([venter]);
  });
});
