/**
 * `handlinger(u, part)`: det brukeren får tilbud om (`pending_actions`). Leser
 * de samme predikatene som forutsetningene, men uttrykker dem som tilbud.
 * Serveren snevrer inn til det parten også er autorisert for (`capabilities`).
 */

import { nokkel } from './forutsetninger.ts';
import type { Utledning } from './utled.ts';
import { SPOR, type Part } from './typer.ts';

export function handlinger(u: Utledning, part: Part): string[] {
  if (!u.forstatt || u.avsluttet) return [];
  const ut: string[] = [];
  const grunnlagSendt = u.spor.grunnlag.gjeldendeKrav !== null;
  for (const spor of SPOR) {
    const s = u.spor[spor];
    if (part === 'TE') {
      if (!s.trukket && (spor === 'grunnlag' ? !u.grunnlagLaast : grunnlagSendt))
        ut.push(nokkel({ type: 'krav', spor }));
      const alleredeEnige = s.enighet !== null || (spor === 'grunnlag' && u.grunnlagAvklart);
      if (
        !s.trukket &&
        s.gjeldendeSvar &&
        !alleredeEnige &&
        u.svar[s.gjeldendeSvar.id].avvik !== true
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
  for (const { opplysning, bestridelser } of u.opplysninger) {
    if (opplysning.oppgittAv !== part && !bestridelser.some((b) => b.part === part))
      ut.push(nokkel({ type: 'bestride', gjelder: opplysning.id }));
  }
  return ut;
}
