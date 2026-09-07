import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
  const search = new URLSearchParams(url.search);
  search.set('spor', 'frist');
  search.set('mode', 'form');
  search.set('rolle', 'BH');
  redirect(
    307,
    `/${encodeURIComponent(params.prosjektId)}/${encodeURIComponent(params.sakId)}?${search}`
  );
};
