import { describe, it, expect } from 'vitest';
import { formatDateNorwegian, formatDateTimeNorwegian } from '../dateFormatters';

/** Normaliserer hardt mellomrom fra nb-NO-formatering. */
const n = (s: string) => s.replace(/[\u00a0\u202f\u2007]/g, ' ');

describe('dateFormatters — gyldige datoer i Europe/Oslo', () => {
  it('formaterer lang dato', () => {
    expect(formatDateNorwegian('2025-12-22T14:30:00Z')).toBe('22. desember 2025');
  });

  it('formaterer dato med klokkeslett omregnet til norsk tid', () => {
    // 14:30 UTC er 15:30 i Oslo (vintertid, UTC+1).
    expect(n(formatDateTimeNorwegian('2025-12-22T14:30:00Z'))).toContain('15:30');
    expect(n(formatDateTimeNorwegian('2025-12-22T14:30:00Z'))).toContain('22. desember 2025');
  });

  it('håndterer sommertid (UTC+2)', () => {
    expect(n(formatDateTimeNorwegian('2025-07-01T14:30:00Z'))).toContain('16:30');
  });

  it('flytter datoen når UTC-tidspunktet krysser midnatt i Oslo', () => {
    // 23:30 UTC 22. des er 00:30 den 23. des i Oslo.
    expect(formatDateNorwegian('2025-12-22T23:30:00Z')).toBe('23. desember 2025');
  });

  it('godtar rene datostrenger uten klokkeslett', () => {
    expect(formatDateNorwegian('2025-12-22')).toBe('22. desember 2025');
  });
});

describe('dateFormatters — manglende verdi', () => {
  it('gir em-strek for undefined', () => {
    expect(formatDateNorwegian(undefined)).toBe('—');
    expect(formatDateTimeNorwegian(undefined)).toBe('—');
  });
});

describe('dateFormatters — ugyldig inndata', () => {
  // new Date() kaster ikke på søppel; den gir Invalid Date, og toLocale*
  // returnerer da den engelske strengen «Invalid Date». Den skal aldri nå UI-et.
  const ugyldige = ['ikke-en-dato', '2025-13-45', '99999-99-99', 'null'];

  it('lekker aldri «Invalid Date» til visningen', () => {
    for (const v of ugyldige) {
      expect(formatDateNorwegian(v), v).not.toContain('Invalid Date');
      expect(formatDateTimeNorwegian(v), v).not.toContain('Invalid Date');
    }
  });

  it('faller tilbake til den opprinnelige strengen', () => {
    expect(formatDateNorwegian('ikke-en-dato')).toBe('ikke-en-dato');
  });
});
