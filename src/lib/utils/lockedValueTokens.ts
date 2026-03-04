/**
 * Locked Value Tokens
 *
 * Token format for non-editable inline values in rich text.
 * Format: {{type:value:display}}
 *
 * Examples:
 *   {{dager:20:20 dager}}
 *   {{belop:150000:kr 150 000,-}}
 *   {{prosent:67:67%}}
 */

export type LockedValueType = 'dager' | 'belop' | 'prosent' | 'dato' | 'paragraf' | 'tekst';

export function createLockedValueToken(
  type: LockedValueType,
  value: string | number,
  display: string
): string {
  return `{{${type}:${value}:${display}}}`;
}

export const lockedValueFormatters = {
  dager: (value: number): string => createLockedValueToken('dager', value, `${value} dager`),

  belop: (value: number): string => {
    const formatted = `kr ${value.toLocaleString('nb-NO')},-`;
    return createLockedValueToken('belop', value, formatted);
  },

  prosent: (value: number): string => createLockedValueToken('prosent', value, `${value}%`),

  dato: (value: string): string => {
    const date = new Date(value);
    const formatted = date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return createLockedValueToken('dato', value, formatted);
  },

  paragraf: (value: string): string => createLockedValueToken('paragraf', value, value),

  tekst: (value: string): string => createLockedValueToken('tekst', value, value),
};
