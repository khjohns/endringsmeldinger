/**
 * Saksbildet for en TS-sak (#313, #665): tittelen fra opprettelsen slik kjernen har lest den, og
 * betegnelsen per spor fra `visning`, det Varden leser. Teksten til betegnelsen står i Varden
 * (MM-U30). Her står ingen regel, bare oppslag.
 */

import { sakstittelen } from '#kjerne/format/leser.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import type { Betegnelse, Visning } from '#kjerne/utledning/visning.ts';
import { SPOR, type Spor } from '#kjerne/typer.ts';

export interface Sporbilde {
  spor: Spor;
  /** Betegnelsen fra den faste lista (MM-U30). */
  betegnelse: { kode: Betegnelse } | null;
  /**
   * Akseptfristen i svaret TE har godtatt, når kjernen gir etiketten `aksept_etter_akseptfristen`
   * (HF-U23 punkt 7, U-6 i BF-46). Ellers `null`.
   */
  akseptEtterFristen: string | null;
}

export interface Saksbilde {
  tittel: string | null;
  spor: Sporbilde[];
}

/**
 * Akseptfristen i svaret enigheten i sporet bygger på, når visningen har etiketten
 * `aksept_etter_akseptfristen`. Ellers `null`.
 */
export function akseptEtterFristen(u: Utledning, vist: Visning, spor: Spor): string | null {
  if (!vist.spor[spor].etiketter.includes('aksept_etter_akseptfristen')) return null;
  const svar = u.spor[spor].enighet?.grunnlag.svar;
  return (svar && u.svar[svar]?.svar.akseptfrist) || null;
}

/** `tittel` er `null` når kjernen ikke forstår opprettelsen (MM-U2, #896). */
export function lagSaksbilde(u: Utledning, vist: Visning): Saksbilde {
  return {
    tittel: sakstittelen(u.journal),
    spor: SPOR.map((spor) => {
      const kode = vist.spor[spor].betegnelse;
      return {
        spor,
        betegnelse: kode && { kode },
        akseptEtterFristen: akseptEtterFristen(u, vist, spor),
      };
    }),
  };
}
