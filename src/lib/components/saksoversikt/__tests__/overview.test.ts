import { describe, expect, it } from 'vitest';
import { iUtvalg, velgSaker, type Saksutvalg } from '../overview';
import { lagSakslinje } from '$lib/mocks/sakslinje';

const ingenting = {
  betegnelse: null,
  venter_paa_svar: false,
  svar_ikke_godtatt: false,
  kravet_staar: false,
};

const venter = lagSakslinje({
  sak_id: 'KOE-1',
  sakstittel: 'Grunnforhold',
  frist: {
    ...ingenting,
    venter_paa_svar: true,
    kravet_staar: true,
    krav: { dager: 10 },
    svar: null,
    enighet: null,
  },
});
const svart = lagSakslinje({
  sak_id: 'KOE-2',
  sakstittel: 'Fasade',
  vederlag: {
    ...ingenting,
    svar_ikke_godtatt: true,
    kravet_staar: true,
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

  it('fristkravene er de serveren sier står (`kravet_staar`), som flisen teller (#1068)', () => {
    const staarIkke = lagSakslinje({
      sak_id: 'KOE-5',
      frist: {
        ...ingenting,
        betegnelse: 'trukket',
        kravet_staar: false,
        krav: { dager: 5 },
        svar: null,
        enighet: null,
      },
    });
    expect(velgSaker([venter, staarIkke], '', 'alle', true)).toEqual([venter]);
  });
});
