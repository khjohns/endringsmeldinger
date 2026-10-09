/**
 * Nyttelastkontrollen: referansene i kommandoen og serverens utregning (B-13).
 * Kjøres etter forutsetningene. Serveren regner svaret og enighetsgrunnlaget
 * på nytt og avviser en kommando der klientens verdier er andre.
 */

import { UgyldigVurdering } from './regler/feil.ts';
import { avvis } from './forutsetninger.ts';
import type { Kommando, Svarutkast } from './kommando.ts';
import type { Regelsett } from './regler/regelsett.ts';
import { likeResultatfelt, regnUtSvar, SAMMENLIKNES, utenforProven } from './standpunkt.ts';
import { forhandsvisAksept, type Utledning } from './utled.ts';
import type { Avvisning } from './typer.ts';

/** Like som JSON, uavhengig av rekkefølgen på nøklene. */
export function likeVerdier(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const na = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const nb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return (
    na.length === nb.length &&
    na.every((k) =>
      likeVerdier((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    )
  );
}

function kontrollerSvar(s: Svarutkast, u: Utledning, regler: Regelsett): Avvisning | null {
  const krav = u.spor[s.spor].gjeldendeKrav!;
  if (s.gjelder !== krav.id)
    return avvis('RESPONSE_REFERENCE', 'Svaret må gjelde gjeldende krav i dette sporet.');
  if (s.regelversjon !== regler.versjon)
    return avvis(
      'RULE_VERSION',
      `Svaret er regnet ut med regelversjon ${s.regelversjon}, serveren bruker ${regler.versjon}.`
    );
  const utenfor = utenforProven(s.spor, s.vurderinger as Record<string, unknown>);
  if (utenfor)
    return avvis('ASSESSMENT_UNSUPPORTED', `Vurderingen kan ikke lagres i prøven: ${utenfor}.`);
  let server: Record<string, unknown>;
  try {
    server = regnUtSvar(
      s.spor,
      s.vurderinger,
      { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
      regler
    );
  } catch (feil) {
    if (feil instanceof UgyldigVurdering)
      return avvis('ASSESSMENT_INVALID', `Vurderingene kan ikke regnes ut: ${feil.message}.`);
    throw feil;
  }
  const avvik = SAMMENLIKNES[s.spor].filter((f) => !likeResultatfelt(f, s.resultat[f], server[f]));
  if (avvik.length)
    return avvis(
      'RESULT_MISMATCH',
      `Serveren regner ut ${avvik.map((f) => `${f}=${String(server[f])}`).join(', ')}.`
    );
  return null;
}

export function nyttelastkontroll(k: Kommando, u: Utledning, regler: Regelsett): Avvisning | null {
  switch (k.type) {
    case 'krav': {
      const varsel = u.spor.frist.varsel;
      if (k.spor !== 'frist' || !k.varsel || !varsel) return null;
      const sendt = u.opplysninger.find((o) => o.opplysning.id === `${varsel.dokument}#sendt`);
      // SK-12: et registrert varsel beholder datoen det fikk første gang (rad KA-19).
      return sendt?.opplysning.verdi === k.varsel.sendt
        ? null
        : avvis(
            'NOTICE_REGISTERED',
            'Varselet er registrert med en annen dato og kan ikke flyttes (SK-12).'
          );
    }
    case 'brev':
      for (const s of k.svar) {
        const a = kontrollerSvar(s, u, regler);
        if (a) return a;
      }
      return null;
    case 'revisjon':
      if (k.erstatter !== u.spor[k.svar.spor].gjeldendeSvar?.id)
        return avvis('RESPONSE_REFERENCE', 'Svaret er endret eller gjelder et tidligere krav.');
      return kontrollerSvar(k.svar, u, regler);
    case 'aksept': {
      // KA-U1, KT-U1: aksepten gjelder sporets gjeldende svar.
      if (k.svar !== u.spor[k.spor].gjeldendeSvar?.id)
        return avvis('CURRENT_RESPONSE', 'Aksepten må gjelde gjeldende svar i dette sporet.');
      if (k.regelversjon !== regler.versjon)
        return avvis(
          'RULE_VERSION',
          `Aksepten er forhåndsvist med regelversjon ${k.regelversjon}, serveren bruker ${regler.versjon}. Last inn saken på nytt.`
        );
      // 2.5: serveren fryser bare det TE fikk se.
      const server = forhandsvisAksept(u, k.svar, regler);
      if (server === null || !likeVerdier(k.enighetsgrunnlag, server))
        return avvis(
          'RESULT_MISMATCH',
          'Enighetsgrunnlaget avviker fra serverens. Last inn saken på nytt.'
        );
      return null;
    }
    case 'trekk':
    case 'varsel':
    case 'bestridelse':
      return null;
  }
}
