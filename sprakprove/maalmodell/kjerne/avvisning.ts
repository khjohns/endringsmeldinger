/**
 * `avvisning(kommando, part, u)`: kommandovalideringen, delt i forutsetningene
 * og nyttelastkontrollen (2.6 i modellforslaget). Serveren legger til
 * prosjekt, team og kontraktsside før kjernen spørres; kjernen får parten.
 */

import { forutsetninger, type Handlingsnokkel } from './forutsetninger.ts';
import type { Kommando } from './kommando.ts';
import { nyttelastkontroll } from './nyttelast.ts';
import type { Regelsett } from './regelsett.ts';
import type { Utledning } from './utled.ts';
import type { Avvisning, Part } from './typer.ts';

/** Handlingene kommandoen utfører. Et brev med flere svar er ett svar per spor. */
export function handlingsnokler(k: Kommando): Handlingsnokkel[] {
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
      return [{ type: 'varsle', spor: 'frist' }];
    case 'bestridelse':
      return [{ type: 'bestride', gjelder: k.gjelder }];
  }
}

export function avvisning(
  k: Kommando,
  part: Part,
  u: Utledning,
  regler: Regelsett
): Avvisning | null {
  for (const h of handlingsnokler(k)) {
    const brudd = forutsetninger(h, part, u);
    if (brudd) return brudd;
  }
  return nyttelastkontroll(k, u, regler);
}
