/**
 * Lokal gjenopprettingsbuffer for skjemaer.
 *
 * Utkastet lagres under en nøkkel som bærer hvem som skrev det. Uten en
 * bekreftet eier leses og skrives ingenting: et utkast vi ikke kan tilskrive
 * noen, skal ikke gjenopprettes automatisk til neste person i samme nettleser.
 *
 * Utkast fra før eierstempelet — nøkkelen uten eier — leses aldri og skrives
 * aldri over. De blir liggende urørt, slik det ble avklart i
 * docs/audit-utkast-samarbeid-2026-09-14.md.
 */

import { browser } from '$app/environment';
import { draftOwner } from './draftOwner';

const PREFIX = 'koe-draft';

export function draftKey(route: string, id?: string): string {
  return id ? `${PREFIX}-${route}-${id}` : `${PREFIX}-${route}`;
}

/** Nøkkelen utkastet faktisk ligger under, eller null når eieren er ukjent. */
function eierNokkel(key: string): string | null {
  const eier = draftOwner();
  return eier ? `${key}::${encodeURIComponent(eier)}` : null;
}

export function loadDraft<T>(key: string): T | null {
  if (!browser) return null;
  const nokkel = eierNokkel(key);
  if (!nokkel) return null;
  try {
    const raw = localStorage.getItem(nokkel);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, data: Record<string, unknown>): void {
  if (!browser) return;
  const nokkel = eierNokkel(key);
  if (!nokkel) return;
  try {
    localStorage.setItem(nokkel, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export function clearDraft(key: string): void {
  if (!browser) return;
  const nokkel = eierNokkel(key);
  if (!nokkel) return;
  localStorage.removeItem(nokkel);
}
