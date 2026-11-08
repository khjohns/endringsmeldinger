/**
 * Date formatting utilities for consistent Norwegian timezone display.
 *
 * All dates from the backend are stored in UTC. These functions convert
 * to Norwegian timezone (Europe/Oslo) for display.
 */

const NORWEGIAN_TIMEZONE = 'Europe/Oslo';
const NORWEGIAN_LOCALE = 'nb-NO';

/**
 * Parser en datostreng og returnerer null når den ikke er gyldig.
 *
 * `new Date(...)` kaster ikke på ugyldig inndata — den gir `Invalid Date`, og
 * `toLocaleDateString`/`toLocaleString` returnerer da den engelske strengen
 * «Invalid Date». Et `try/catch` rundt formateringen fanger derfor ingenting.
 * Funksjonene under bruker denne hjelperen for å nå sitt tiltenkte fallback.
 */
function parseDateSafe(dateStr: string): Date | null {
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format date string to Norwegian locale and timezone.
 * Assumes input is UTC ISO string from backend.
 *
 * @example formatDateNorwegian('2025-12-22T14:30:00Z') // '22. desember 2025'
 */
export function formatDateNorwegian(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const parsed = parseDateSafe(dateStr);
  if (!parsed) return dateStr;
  return parsed.toLocaleDateString(NORWEGIAN_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: NORWEGIAN_TIMEZONE,
  });
}

/**
 * Format date and time to Norwegian locale and timezone.
 *
 * @example formatDateTimeNorwegian('2025-12-22T14:30:00Z') // '22. desember 2025 kl. 15:30'
 */
export function formatDateTimeNorwegian(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const parsed = parseDateSafe(dateStr);
  if (!parsed) return dateStr;
  return parsed.toLocaleString(NORWEGIAN_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: NORWEGIAN_TIMEZONE,
  });
}
