import { describe, it, expect } from 'vitest';
import {
  formatDateNorwegian,
  formatDateTimeNorwegian,
  formatDateMinimalNorwegian,
  formatDateShortNorwegian,
  formatDateTimeCompact,
  getNowNorwegian,
} from '../dateFormatters';

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

  it('formaterer minimal og kort dato', () => {
    // nb-NO gir etterstilt punktum for 2-sifret dag/måned.
    expect(formatDateMinimalNorwegian('2025-12-22T14:30:00Z')).toBe('22.12.');
    expect(formatDateShortNorwegian('2025-12-22T14:30:00Z')).toBe('22. des. 2025');
  });

  it('formaterer kompakt dato med klokkeslett', () => {
    expect(n(formatDateTimeCompact('2025-12-22T14:30:00Z'))).toBe('22.12.2025, 15:30');
  });

  it('godtar rene datostrenger uten klokkeslett', () => {
    expect(formatDateNorwegian('2025-12-22')).toBe('22. desember 2025');
  });
});

describe('dateFormatters — manglende verdi', () => {
  it('gir em-strek for undefined', () => {
    expect(formatDateNorwegian(undefined)).toBe('—');
    expect(formatDateTimeNorwegian(undefined)).toBe('—');
    expect(formatDateMinimalNorwegian(undefined)).toBe('—');
  });

  it('gir tom streng for kort dato uten verdi', () => {
    expect(formatDateShortNorwegian(undefined)).toBe('');
  });

  it('bruker oppgitt fallback for kompakt dato', () => {
    expect(formatDateTimeCompact(undefined)).toBe('-');
    expect(formatDateTimeCompact(undefined, 'ikke satt')).toBe('ikke satt');
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
      expect(formatDateMinimalNorwegian(v), v).not.toContain('Invalid Date');
      expect(formatDateShortNorwegian(v), v).not.toContain('Invalid Date');
      expect(formatDateTimeCompact(v), v).not.toContain('Invalid Date');
    }
  });

  it('faller tilbake til den opprinnelige strengen', () => {
    expect(formatDateNorwegian('ikke-en-dato')).toBe('ikke-en-dato');
    expect(formatDateTimeCompact('ikke-en-dato')).toBe('ikke-en-dato');
  });
});

describe('getNowNorwegian', () => {
  it('gir en formatert norsk tidsangivelse', () => {
    expect(getNowNorwegian()).toMatch(/\d{1,2}\.\s\w+\s\d{4}/);
    expect(getNowNorwegian()).not.toContain('Invalid Date');
  });
});
