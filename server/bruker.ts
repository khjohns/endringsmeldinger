/**
 * Det `autorisasjon.ts` og `sesjon.ts` begge trenger, så de ikke importerer
 * hverandre (#707 punkt 6).
 */

import { createHash } from 'node:crypto';

export interface Bruker {
  id: string;
  email: string;
  name: string;
}

export function sha256(tekst: string): string {
  return createHash('sha256').update(tekst).digest('hex');
}
