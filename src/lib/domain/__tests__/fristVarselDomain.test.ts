/**
 * Byggherrens handlinger på et fristkrav uten dager. Kilden er vedtaket om
 * nøytralt fristvarsel i hovedplanen 3.1 (23.09) og NS 8407 § 5 og § 33.6.2.
 */
import { describe, it, expect } from 'vitest';
import {
  buildEventData,
  eventTypeFor,
  FORESPORSEL_FAST_TEKST,
  foresporselTekst,
  foresporselVenterSvar,
  innsigelseTekst,
  kravetErSpesifisert,
  tilgjengeligeHandlinger,
} from '../fristVarselDomain';

describe('kravetErSpesifisert', () => {
  it('krever antall dager (§ 33.7)', () => {
    expect(kravetErSpesifisert({ krevd_dager: undefined })).toBe(false);
    expect(kravetErSpesifisert({ krevd_dager: null as unknown as number })).toBe(false);
    expect(kravetErSpesifisert({ krevd_dager: 0 })).toBe(true);
  });
});

describe('tilgjengeligeHandlinger', () => {
  it('tilbyr begge før noe er sendt', () => {
    expect(tilgjengeligeHandlinger({ krav_event_id: 'v' })).toEqual({
      innsigelse: true,
      foresporsel: true,
    });
  });

  it('innsigelsen sendes én gang', () => {
    expect(tilgjengeligeHandlinger({ krav_event_id: 'v', frist_varsel_ok: false }).innsigelse).toBe(
      false
    );
  });

  it('ny forespørsel først når TE har svart på den forrige', () => {
    const venter = { krav_event_id: 'v', foresporsel_krav_id: 'v' };
    expect(foresporselVenterSvar(venter)).toBe(true);
    expect(tilgjengeligeHandlinger(venter).foresporsel).toBe(false);
    expect(
      tilgjengeligeHandlinger({ krav_event_id: 'utsatt', foresporsel_krav_id: 'v' }).foresporsel
    ).toBe(true);
  });
});

describe('teksten i brevet', () => {
  it('forespørselen sier at kravet tapes og at TE kan begrunne utsettelse (§ 33.6.2 første ledd)', () => {
    const tekst = foresporselTekst();
    expect(tekst).toContain('tapes kravet på fristforlengelse');
    expect(tekst).toContain('begrunne hvorfor grunnlaget for å beregne kravet ikke foreligger');
    expect(tekst).not.toContain('innen');
  });

  it('forespørselen nevner svarfristen etter den faste teksten, som serveren kontrollerer', () => {
    expect(foresporselTekst('20. oktober 2026')).toBe(
      `${FORESPORSEL_FAST_TEKST} Byggherren ber om svar innen 20. oktober 2026.`
    );
  });

  it('innsigelsen viser til § 5 tredje ledd og § 33.4', () => {
    const tekst = innsigelseTekst('2. september 2026');
    expect(tekst).toContain('§ 5 tredje ledd');
    expect(tekst).toContain('§ 33.4');
    expect(tekst).toContain('2. september 2026');
  });
});

describe('buildEventData', () => {
  it('bygger forespørselen med svarfrist og fast tekst først', () => {
    const data = buildEventData('foresporsel', {
      fristKravId: 'v',
      tillegg: '<p>Vi trenger fremdriftsplan.</p>',
      svarfrist: '2026-10-20',
      svarfristVist: '20. oktober 2026',
    });
    expect(data.frist_krav_id).toBe('v');
    expect(data.svarfrist).toBe('2026-10-20');
    expect(data.begrunnelse.startsWith(`<p>${foresporselTekst('20. oktober 2026')}</p>`)).toBe(
      true
    );
    expect(data.begrunnelse).toContain('fremdriftsplan');
    expect(data).not.toHaveProperty('beregnings_resultat');
  });

  it('innsigelsen har ingen svarfrist og utelater tomt tillegg', () => {
    const data = buildEventData('innsigelse', { fristKravId: 'v', tillegg: '<p></p>' });
    expect(data).not.toHaveProperty('svarfrist');
    expect(data.begrunnelse).toBe(`<p>${innsigelseTekst()}</p>`);
  });

  it('hver handling har sin egen hendelsestype', () => {
    expect(eventTypeFor('innsigelse')).toBe('frist_innsigelse_sendt');
    expect(eventTypeFor('foresporsel')).toBe('frist_foresporsel_sendt');
  });
});
