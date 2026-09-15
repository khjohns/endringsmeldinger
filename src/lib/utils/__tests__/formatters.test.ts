import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isHtmlEmpty,
  formatDateDayMonth,
  formatCurrency,
  formatCurrencyCompact,
  formatDays,
  formatDaysCompact,
  formatBoolean,
  boolToSegment,
  formatDateShort,
  formatDateMedium,
  formatPercent,
  formatVederlagsmetode,
  formatVarselMetode,
  formatBHResultat,
  getResultatLabel,
  getApprovalAge,
} from '../formatters';

/**
 * Normaliserer nb-NO-formatering: hardt mellomrom som tusenskille og U+2212
 * MINUS SIGN. Merk at formatCurrencyCompact bygger fortegnet selv med vanlig
 * bindestrek, så de to beløpsformattererne bruker ulikt minustegn.
 */
const n = (s: string) => s.replace(/[\u00a0\u202f\u2007]/g, ' ').replace(/\u2212/g, '-');

describe('isHtmlEmpty', () => {
  it('regner markup uten tekst som tomt', () => {
    expect(isHtmlEmpty('')).toBe(true);
    expect(isHtmlEmpty('<p></p>')).toBe(true);
    expect(isHtmlEmpty('<p>   </p>')).toBe(true);
    expect(isHtmlEmpty('<p>Begrunnelse</p>')).toBe(false);
  });
});

describe('formatCurrency', () => {
  it('formaterer beløp med norsk tusenskille', () => {
    expect(n(formatCurrency(50_000))).toBe('50 000 kr');
    expect(n(formatCurrency(0))).toBe('0 kr');
    expect(n(formatCurrency(-1500))).toBe('-1 500 kr');
  });

  it('skiller manglende verdi fra null', () => {
    expect(formatCurrency(undefined)).toBe('-');
    expect(formatCurrency(null)).toBe('-');
    expect(n(formatCurrency(0))).toBe('0 kr');
  });
});

describe('formatCurrencyCompact', () => {
  it('forkorter tusen og million', () => {
    expect(formatCurrencyCompact(450_000)).toBe('450k');
    expect(n(formatCurrencyCompact(2_400_000))).toBe('2,4M');
    expect(formatCurrencyCompact(3_000_000)).toBe('3M');
  });

  it('viser beløp under 10 000 i sin helhet', () => {
    expect(n(formatCurrencyCompact(1200))).toBe('1 200');
    expect(formatCurrencyCompact(0)).toBe('0');
  });

  it('beholder fortegn for negative beløp', () => {
    expect(formatCurrencyCompact(-450_000)).toBe('-450k');
    expect(n(formatCurrencyCompact(-2_400_000))).toBe('-2,4M');
  });

  it('gir em-strek for manglende verdi', () => {
    expect(formatCurrencyCompact(undefined)).toBe('—');
    expect(formatCurrencyCompact(null)).toBe('—');
  });
});

describe('formatDays og formatDaysCompact', () => {
  it('bøyer dag/dager riktig', () => {
    expect(formatDays(1)).toBe('1 dag');
    expect(formatDays(5)).toBe('5 dager');
    expect(formatDays(0)).toBe('0 dager');
  });

  it('gir bindestrek for manglende verdi', () => {
    expect(formatDays(undefined)).toBe('-');
    expect(formatDaysCompact(undefined)).toBe('—');
    expect(formatDaysCompact(30)).toBe('30d');
  });
});

describe('formatBoolean og boolToSegment', () => {
  it('skiller usatt fra nei', () => {
    expect(formatBoolean(true)).toBe('Ja');
    expect(formatBoolean(false)).toBe('Nei');
    expect(formatBoolean(undefined)).toBe('-');
    expect(boolToSegment(true)).toBe('ja');
    expect(boolToSegment(false)).toBe('nei');
    expect(boolToSegment(undefined)).toBeUndefined();
  });
});

describe('formatPercent', () => {
  it('tar en andel, ikke et prosenttall', () => {
    expect(n(formatPercent(0.75))).toBe('75 %');
    expect(n(formatPercent(1.5))).toBe('150 %');
    expect(n(formatPercent(0))).toBe('0 %');
    expect(formatPercent(undefined)).toBe('-');
  });
});

describe('etiketter', () => {
  it('oversetter vederlagsmetode', () => {
    expect(formatVederlagsmetode('ENHETSPRISER')).toBe('Enhetspriser');
    expect(formatVederlagsmetode('REGNINGSARBEID')).toBe('Regningsarbeid');
    expect(formatVederlagsmetode(undefined)).toBe('-');
  });

  it('håndterer varselmetode som liste', () => {
    expect(formatVarselMetode([])).toBe('-');
    expect(formatVarselMetode(undefined)).toBe('-');
    expect(formatVarselMetode(['epost', 'brev'])).toContain(',');
  });

  it('gir etikett og fargeklasse for BH-resultat', () => {
    expect(formatBHResultat('godkjent').label).toBe('Godkjent');
    expect(formatBHResultat('avslatt').label).toBe('Avslått');
    expect(formatBHResultat('delvis_godkjent').label).toBe('Delvis godkjent');
    expect(formatBHResultat(undefined)).toEqual({ label: '-', colorClass: '' });
  });

  it('faller tilbake til råverdien for ukjent resultat', () => {
    expect(formatBHResultat('noe_annet').label).toBe('noe_annet');
    expect(getResultatLabel('noe_annet')).toBe('noe_annet');
    expect(getResultatLabel('hold_tilbake')).toBe('Hold tilbake betaling (§30.2)');
  });
});

describe('datoformatering', () => {
  it('formaterer gyldige datoer', () => {
    expect(formatDateDayMonth('2025-12-22T14:30:00Z')).toBe('22. des');
    expect(formatDateShort('2025-12-22T14:30:00Z')).toBe('22.12.2025');
    expect(formatDateMedium('2025-12-22T14:30:00Z')).toBe('22. des. 2025');
  });

  it('gir dokumentert fallback for manglende verdi', () => {
    expect(formatDateDayMonth(null)).toBe('—');
    expect(formatDateShort(null)).toBe('-');
    expect(formatDateMedium(undefined)).toBe('-');
  });

  it('lekker aldri «Invalid Date» til visningen', () => {
    for (const v of ['ikke-en-dato', '2025-13-45', 'null']) {
      expect(formatDateDayMonth(v), v).not.toContain('Invalid Date');
      expect(formatDateShort(v), v).not.toContain('Invalid Date');
      expect(formatDateMedium(v), v).not.toContain('Invalid Date');
    }
    expect(formatDateShort('ikke-en-dato')).toBe('-');
    expect(formatDateMedium('ikke-en-dato')).toBe('ikke-en-dato');
  });
});

describe('getApprovalAge', () => {
  afterEach(() => vi.useRealTimers());

  function atNow(iso: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  }

  it('gir alvorsgrad etter SLA-tersklene', () => {
    atNow('2025-01-10T10:00:00Z');
    expect(getApprovalAge('2025-01-10T10:00:00Z')).toMatchObject({
      days: 0,
      label: 'I dag',
      severity: 'ok',
    });
    expect(getApprovalAge('2025-01-09T10:00:00Z')).toMatchObject({
      days: 1,
      label: '1 dag siden',
      severity: 'ok',
    });
    expect(getApprovalAge('2025-01-08T10:00:00Z')).toMatchObject({ days: 2, severity: 'ok' });
    expect(getApprovalAge('2025-01-07T10:00:00Z')).toMatchObject({ days: 3, severity: 'warning' });
    expect(getApprovalAge('2025-01-05T10:00:00Z')).toMatchObject({ days: 5, severity: 'warning' });
    expect(getApprovalAge('2025-01-04T10:00:00Z')).toMatchObject({ days: 6, severity: 'overdue' });
  });

  it('gir null for manglende verdi', () => {
    expect(getApprovalAge(undefined)).toBeNull();
  });

  it('gir null for ugyldig dato i stedet for et rødt NaN-merke', () => {
    atNow('2025-01-10T10:00:00Z');
    expect(getApprovalAge('ikke-en-dato')).toBeNull();
    expect(getApprovalAge('2025-13-45')).toBeNull();
  });
});
