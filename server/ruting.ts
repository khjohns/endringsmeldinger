/**
 * Den lokale rutingen mellom TS-serveren og Python i `vite.config.ts` (F0b-8, #662).
 * Ruteren i Azure kommer i #376.
 */

/**
 * Det TS-serveren svarer på (F0b-8, #662): innloggingen, CSRF-tokenet, kjernen,
 * `GET` av prosjektene og medlemmene (F-1a, #820), sakslisten (#1022) og webhooken fra Catenda (W-1a, #819). Resten av `/api/projects`,
 * som opprettelsen, endringen og deaktiveringen, ligger fortsatt i Python.
 */
export function tilTsServeren(metode: string, url: string): boolean {
  const sti = url.split('?', 1)[0];
  return (
    /^\/api\/(kjerne|auth)(\/|$)/.test(sti) ||
    sti === '/api/csrf-token' ||
    (metode === 'GET' && /^\/api\/projects(\/[^/]+)?\/?$/.test(sti)) ||
    /^\/api\/projects\/[^/]+\/members(\/|$)/.test(sti) ||
    /^\/api\/projects\/[^/]+\/saker$/.test(sti) ||
    /^\/webhook\/catenda(\/|$)/.test(sti)
  );
}
