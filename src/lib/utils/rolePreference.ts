import { browser } from '$app/environment';
import type { Role } from '$lib/components/kontraktsbord/types';

export function readPreferredRole(): Role {
  if (!browser) return 'BH';
  return localStorage.getItem('koe-user-role') === 'TE' ? 'TE' : 'BH';
}

export function savePreferredRole(role: Role) {
  if (!browser) return;
  localStorage.setItem('koe-user-role', role);
  window.dispatchEvent(new StorageEvent('storage', { key: 'koe-user-role', newValue: role }));
}
