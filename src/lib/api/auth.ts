import { API_BASE_URL, apiFetch, ApiError, clearCsrfToken } from './client';
import { setDraftOwner } from '$lib/utils/draftOwner';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function getSession(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' });
  if (!response.ok) throw new ApiError(response.status, 'Kunne ikke bekrefte innlogging.');
  const user = (await response.json()).user;
  // Lokale utkast følger den innloggede. Uten dette ville neste bruker i samme
  // nettleser fått forrige brukers kravtekst gjenopprettet i skjemaet.
  setDraftOwner(user?.id ?? null);
  return user;
}

export function loginUrl(returnTo = '/'): string {
  return `${API_BASE_URL}/api/auth/catenda/login?return_to=${encodeURIComponent(returnTo)}`;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  clearCsrfToken();
  setDraftOwner(null);
  window.location.replace('/login');
}
