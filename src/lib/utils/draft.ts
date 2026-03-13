import { browser } from '$app/environment';

const PREFIX = 'koe-draft';

export function draftKey(route: string, id?: string): string {
  return id ? `${PREFIX}-${route}-${id}` : `${PREFIX}-${route}`;
}

export function loadDraft<T>(key: string): T | null {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, data: Record<string, unknown>): void {
  if (!browser) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export function clearDraft(key: string): void {
  if (!browser) return;
  localStorage.removeItem(key);
}
