export const ssr = false;
export const prerender = false;

import { redirect, error } from '@sveltejs/kit';
import { getSession } from '$lib/api/auth';
import { ApiError } from '$lib/api/client';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
  // Mockup-sidene bruker lokale demodata og trenger ingen sesjon.
  if (
    url.pathname === '/login' ||
    url.pathname === '/mockup' ||
    url.pathname.startsWith('/mockup/')
  )
    return { user: null };
  try {
    return { user: await getSession() };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect(303, `/login?return_to=${encodeURIComponent(url.pathname + url.search)}`);
    }
    error(503, 'Innlogging er midlertidig utilgjengelig. Prøv igjen senere.');
  }
};
