/**
 * `handlinger(u, part)`: det brukeren får tilbud om (`pending_actions`). Leser
 * de samme predikatene som forutsetningene, men uttrykker dem som tilbud.
 * Serveren snevrer inn til det parten også er autorisert for (`capabilities`).
 */

import { nokkel } from './forutsetninger.ts';
import type { Utledning } from './utled.ts';
import { SPOR, type Part } from './typer.ts';

export function handlinger(u: Utledning, part: Part): string[] {
  if (!u.forstatt) return [];
  const ut: string[] = [];
  const grunnlagSendt = u.spor.grunnlag.gjeldendeKrav !== null;
  for (const spor of u.avsluttet ? [] : SPOR) {
    const s = u.spor[spor];
    if (part === 'TE') {
      if (!s.trukket && (spor === 'grunnlag' ? !u.grunnlagLaast : grunnlagSendt))
        ut.push(nokkel({ type: 'krav', spor }));
      const ikkeTilAksept =
        s.enighet !== null || (spor === 'grunnlag' && (u.grunnlagLaast || u.frafalt));
      // MM-U4 og MM-U6: bare et svar der brevet stemmer med dagens utledning.
      if (
        !s.trukket &&
        s.gjeldendeSvar &&
        !ikkeTilAksept &&
        u.svar[s.gjeldendeSvar.id].avvik === false
      )
        ut.push(nokkel({ type: 'godta', spor }));
      if (!s.trukket && s.gjeldendeKrav) ut.push(nokkel({ type: 'trekke', spor }));
      if (spor === 'frist' && grunnlagSendt && !s.trukket && !s.varsel)
        ut.push(nokkel({ type: 'varsle', spor }));
    } else {
      if (!s.trukket && s.gjeldendeKrav && !s.gjeldendeSvar)
        ut.push(nokkel({ type: 'svare', spor }));
      if (!s.trukket && s.gjeldendeSvar && !s.enighet) ut.push(nokkel({ type: 'revidere', spor }));
    }
  }
  // MM-U7: også i en avsluttet sak.
  for (const { opplysning, bestridelser } of u.opplysninger) {
    if (opplysning.oppgittAv !== part && !bestridelser.some((b) => b.part === part))
      ut.push(nokkel({ type: 'bestride', gjelder: opplysning.id }));
  }
  return ut;
}
