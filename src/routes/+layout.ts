export const ssr = false;
export const prerender = false;

import { redirect, error } from '@sveltejs/kit';
import { getSession } from '$lib/api/auth';
import { ApiError } from '$lib/api/client';
import { setDraftOwner } from '$lib/utils/draftOwner';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
  // Mockup-sidene bruker lokale demodata og trenger ingen sesjon.
  if (
    url.pathname === '/login' ||
    url.pathname === '/mockup' ||
    url.pathname.startsWith('/mockup/')
  ) {
    // Demoen har ingen innlogget bruker, men skal beholde sine egne utkast.
    // Eieren er konstant fordi demodataene ikke tilhører noen.
    setDraftOwner(url.pathname.startsWith('/mockup') ? 'mockup' : null);
    return { user: null };
  }
  try {
    return { user: await getSession() };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect(303, `/login?return_to=${encodeURIComponent(url.pathname + url.search)}`);
    }
    error(503, 'Innlogging er midlertidig utilgjengelig. Prøv igjen senere.');
  }
};
