/**
 * `avvisning(kommando, part, u, regler, svarstandpunkter, brevetsDato, utdypningKreves)`:
 * kommandovalideringen, delt i forutsetningene og nyttelastkontrollen (2.6 i
 * modellforslaget), med kontrollen av datoen TE oppgir mot brevets dato til sist
 * (VS-U26). `regler` er regelsettet svarene regnes ut med. `svarstandpunkter` gir
 * standpunktene i et svar fra utregningen, slik skrivingen lagrer dem, og registrerer
 * dem og utregningen for skrivingen (#814). `brevetsDato` er en kalenderdag fra
 * `registrertDato`. `utdypningKreves` er usann i forhåndsvisningen. Serveren legger
 * til prosjekt, team og kontraktsside før kjernen spørres; kjernen får parten.
 */

import { forutsetninger, type Handlingsnoekkel } from './forutsetninger.ts';
import type { Kommando } from './kommando.ts';
import { nyttelastkontroll, oppgittDatoEtterBrevet, type Svarstandpunkter } from './nyttelast.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import type { Utledning } from '../utledning/utled.ts';
import type { Avvisning, Part } from '../typer.ts';

/** Handlingene kommandoen utfører. Et brev med flere svar er ett svar per spor. */
export function handlingsnoekler(k: Kommando): Handlingsnoekkel[] {
  switch (k.type) {
    case 'krav':
      return [{ type: 'krav', spor: k.spor }];
    case 'brev':
      return k.svar.map((s) => ({ type: 'svare', spor: s.spor }));
    case 'revisjon':
      return [{ type: 'revidere', spor: k.svar.spor }];
    case 'aksept':
      return [{ type: 'godta', spor: k.spor }];
    case 'trekk':
      return [{ type: 'trekke', spor: k.spor }];
    case 'varsel':
      return [{ type: 'varsle', spor: k.spor }];
    case 'send_varsel':
      return [{ type: 'sende_varsel', spor: k.spor }];
    case 'registrert_brev':
    case 'ikke_i_saken':
      return [{ type: 'registrere_brev' }];
    case 'foresporsel':
      return [{ type: 'sende_foresporsel', spor: 'frist' }];
    case 'foresporselssvar':
      return [{ type: 'svare_paa_foresporsel', gjelder: k.gjelder }];
    case 'bestridelse':
      return [{ type: 'bestride', gjelder: k.gjelder }];
    case 'ingen_krav':
      return [{ type: 'ingen_krav', spor: k.spor }];
    case 'innsigelse':
    case 'protest':
    case 'passivitet':
      return [{ type: k.type, gjelder: k.gjelder }];
    case 'merking':
      return [{ type: 'merke', gjelder: k.gjelder }];
    case 'avklaring':
      return [{ type: 'avklare', gjelder: k.gjelder }];
    case 'begrunnelse':
      return [{ type: 'begrunne', gjelder: k.gjelder }];
  }
}

export function avvisning(
  k: Kommando,
  part: Part,
  u: Utledning,
  regler: Regelsett,
  svarstandpunkter: Svarstandpunkter,
  brevetsDato: string,
  utdypningKreves = true
): Avvisning | null {
  for (const h of handlingsnoekler(k)) {
    const brudd = forutsetninger(h, part, u);
    if (brudd) return brudd;
  }
  return (
    nyttelastkontroll(k, part, u, regler, svarstandpunkter, utdypningKreves) ??
    oppgittDatoEtterBrevet(k, brevetsDato)
  );
}
