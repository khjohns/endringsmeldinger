export const ssr = false;
export const prerender = false;

import { redirect, error } from '@sveltejs/kit';
import { getSession } from '$lib/api/auth';
import { ApiError } from '$lib/api/client';
import { fjernAndresVentende } from '$lib/components/varden/ventende';
import { OM_VARDEN_STI } from '$lib/components/om-varden/sti';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
  // Demoruta for brukerforløpene (#1330) bruker lokale data og trenger ingen sesjon.
  // «Om Varden» leses før innloggingen og henter ingen data (#1452).
  const demo = url.pathname === '/demo' || url.pathname.startsWith('/demo/');
  if (url.pathname === '/login' || url.pathname === OM_VARDEN_STI || demo) {
    return { user: null };
  }
  try {
    const user = await getSession();
    // Forrige brukers utkast for ny sak skal ikke ligge igjen i fanen (#1678).
    if (user) fjernAndresVentende(user.id);
    return { user };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect(303, `/login?return_to=${encodeURIComponent(url.pathname + url.search)}`);
    }
    error(503, 'Innlogging er midlertidig utilgjengelig. Prøv igjen senere.');
  }
};
