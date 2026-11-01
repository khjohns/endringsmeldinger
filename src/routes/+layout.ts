export const ssr = false;
export const prerender = false;

import { redirect, error } from '@sveltejs/kit';
import { getSession } from '$lib/api/auth';
import { ApiError } from '$lib/api/client';
import { setDraftOwner } from '$lib/utils/draftOwner';
import { OM_VARDEN_STI } from '$lib/components/om-varden/sti';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
  // Mockup-sidene og demoruta for brukerforløpene (#1330) bruker lokale data og trenger ingen sesjon.
  // «Om Varden» leses før innloggingen og henter ingen data (#1452).
  const demo = ['/mockup', '/demo'].find(
    (d) => url.pathname === d || url.pathname.startsWith(`${d}/`)
  );
  if (url.pathname === '/login' || url.pathname === OM_VARDEN_STI || demo) {
    // Demoen har ingen innlogget bruker, men skal beholde sine egne utkast.
    // Eieren er konstant fordi demodataene ikke tilhører noen.
    setDraftOwner(demo ? demo.slice(1) : null);
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
