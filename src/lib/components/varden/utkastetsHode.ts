import { brevmerking, medSakskode } from '#kjerne/frosset/brevtittel.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import type { Saksmerking } from '#lib/kjernesak/brevtekst.ts';
import { brevene } from './lesing';

/** Brevhodet før kommandoen kan forhåndsvises. Kjernen fastsetter og fryser hodet ved sending. */
export function utkastetsHode(
  u: Utledning | null,
  sak: Saksmerking | null | undefined,
  tittel: string,
  foerste = false
): { tittel: string; nummer: number | null; merking: string | null } {
  const nummer = foerste ? 1 : u ? Math.max(0, ...brevene(u).map((b) => b.nummer ?? 0)) + 1 : null;
  return {
    tittel: sak?.sakskode ? medSakskode(tittel, sak.sakskode) : tittel,
    nummer,
    merking:
      nummer !== null && sak?.sakskode && sak.kontraktsforkortelse
        ? brevmerking(sak.kontraktsforkortelse, sak.sakskode, nummer)
        : null,
  };
}
