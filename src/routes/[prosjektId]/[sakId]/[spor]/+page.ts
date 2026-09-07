import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
  const spor = params.spor === 'grunnlag' ? 'ansvar' : params.spor;
  if (spor !== 'ansvar' && spor !== 'vederlag' && spor !== 'frist') {
    error(404, 'Ukjent spor');
  }
  const search = new URLSearchParams(url.search);
  search.set('spor', spor);
  search.set('mode', 'read');
  redirect(
    307,
    `/${encodeURIComponent(params.prosjektId)}/${encodeURIComponent(params.sakId)}?${search}`
  );
};
