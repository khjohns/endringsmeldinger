import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
  const search = new URLSearchParams(url.search);
  search.set('spor', 'ansvar');
  search.set('mode', 'form');
  search.set('rolle', 'TE');
  redirect(
    307,
    `/${encodeURIComponent(params.prosjektId)}/${encodeURIComponent(params.sakId)}?${search}`
  );
};
