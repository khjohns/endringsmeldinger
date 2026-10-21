/**
 * Den lokale rutingen mellom TS-serveren og SPA-en i `vite.config.ts` (F0b-8, #662).
 * Ruteren i Azure er `nginx.conf` (#376).
 */

/**
 * Det TS-serveren svarer på: hele `/api` og webhooken fra Catenda (#1026). En sti
 * som ikke står i registeret i `server/app.ts`, får 404 der, før noen behandler kalles.
 */
export function tilTsServeren(url: string): boolean {
  const sti = url.split('?', 1)[0];
  return /^\/api(\/|$)/.test(sti) || /^\/webhook\/catenda(\/|$)/.test(sti);
}
