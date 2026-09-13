import { API_BASE_URL, apiFetch, ApiError, clearCsrfToken } from './client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function getSession(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' });
  if (!response.ok) throw new ApiError(response.status, 'Kunne ikke bekrefte innlogging.');
  return (await response.json()).user;
}

export function loginUrl(returnTo = '/'): string {
  return `${API_BASE_URL}/api/auth/catenda/login?return_to=${encodeURIComponent(returnTo)}`;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  clearCsrfToken();
  window.location.replace('/login');
}
