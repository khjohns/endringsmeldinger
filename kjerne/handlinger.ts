/**
 * `handlinger(u, part)`: det brukeren får tilbud om (`pending_actions`). Leser
 * de samme predikatene som forutsetningene, men uttrykker dem som tilbud.
 * Serveren snevrer inn til det parten også er autorisert for (`capabilities`).
 */

import { nokkel } from './forutsetninger.ts';
import { kraveneErAvgjort, type Utledning } from './utled.ts';
import { SPOR, type Part } from './typer.ts';

export function handlinger(u: Utledning, part: Part): string[] {
  if (!u.forstatt) return [];
  // SK-01, KA-U6, MM-U7: når grunnlaget er avvist ved enighet eller kravene er avgjort, tilbys bare bestridelser.
  const ut = u.grunnlagAvvist || kraveneErAvgjort(u) ? [] : sporhandlinger(u, part);
  for (const { opplysning, bestridelser } of u.opplysninger) {
    if (opplysning.oppgittAv !== part && !bestridelser.some((b) => b.part === part))
      ut.push(nokkel({ type: 'bestride', gjelder: opplysning.id }));
  }
  return ut;
}

function sporhandlinger(u: Utledning, part: Part): string[] {
  const ut: string[] = [];
  const grunnlagSendt = u.spor.grunnlag.gjeldendeKrav !== null;
  for (const spor of SPOR) {
    const s = u.spor[spor];
    if (s.trukket) continue;
    if (part === 'TE') {
      if (!s.enighet && (spor === 'grunnlag' || grunnlagSendt))
        ut.push(nokkel({ type: 'krav', spor }));
      const svar = s.gjeldendeSvar && u.svar[s.gjeldendeSvar.id];
      if (svar && !s.enighet && !(spor === 'grunnlag' && u.frafalt) && !svar.uavklart.length)
        ut.push(nokkel({ type: 'godta', spor }));
      if (s.gjeldendeKrav) ut.push(nokkel({ type: 'trekke', spor }));
      if (spor === 'frist' && grunnlagSendt && !s.varsel) ut.push(nokkel({ type: 'varsle', spor }));
    } else {
      if (s.gjeldendeKrav && !s.gjeldendeSvar) ut.push(nokkel({ type: 'svare', spor }));
      if (s.gjeldendeSvar && !s.enighet) ut.push(nokkel({ type: 'revidere', spor }));
    }
  }
  return ut;
}
