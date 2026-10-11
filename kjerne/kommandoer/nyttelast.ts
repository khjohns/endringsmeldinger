/**
 * Nyttelastkontrollen: referansene i kommandoen og serverens utregning (B-13).
 * Kjøres etter forutsetningene. Serveren regner svaret på nytt og avviser en
 * kommando der klientens verdier er andre. En aksept bærer bare svaret og
 * regelversjonen; innholdet står i brevet (KA-U10).
 */

import { UgyldigVurdering } from '../regler/feil.ts';
import { avvis } from './forutsetninger.ts';
import { datoFor, sammeSlag } from '../format/leser.ts';
import type { Kommando, Svarutkast } from './kommando.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import {
  gjelderVarslingsplikten,
  likeResultatfelt,
  regnUtSvar,
  SAMMENLIKNES,
  utenforOmfanget,
} from '../frosset/standpunkt.ts';
import type { Utledning } from '../utledning/utled.ts';
import type { Avvisning } from '../typer.ts';

function kontrollerSvar(s: Svarutkast, u: Utledning, regler: Regelsett): Avvisning | null {
  const krav = u.spor[s.spor].gjeldendeKrav!;
  if (s.gjelder !== krav.id)
    return avvis('FEIL_KRAVREFERANSE', 'Svaret må gjelde gjeldende krav i dette sporet.');
  if (s.regelversjon !== regler.versjon)
    return avvis(
      'ANNEN_REGELVERSJON',
      `Svaret er regnet ut med regelversjon ${s.regelversjon}, serveren bruker ${regler.versjon}.`
    );
  // VS-U11 (S5 til oppdragsgiver 11.10, foreslått): har byggherren gjort innsigelse
  // mot varselet eller kravet, gjentar eller oppgir svaret den uttrykkelig.
  const varsel = u.spor.frist.varsel?.id;
  if (
    s.spor === 'frist' &&
    typeof s.vurderinger.frist_varsel_ok !== 'boolean' &&
    u.innsigelser.some((i) => i.part === 'BH' && (i.gjelder === krav.id || i.gjelder === varsel))
  )
    return avvis(
      'INNSIGELSE_UTEN_STANDPUNKT',
      'Byggherren har gjort innsigelse mot varselet. Svaret må gjenta den eller oppgi den.'
    );
  const utenfor = utenforOmfanget(s.spor, s.vurderinger as Record<string, unknown>);
  if (utenfor)
    return avvis('VURDERING_UTENFOR_KJERNEN', `Kjernen kan ikke lagre vurderingen: ${utenfor}.`);
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
      return avvis('UGYLDIG_VURDERING', `Vurderingene kan ikke regnes ut: ${feil.message}.`);
    throw feil;
  }
  const avvik = SAMMENLIKNES[s.spor].filter((f) => !likeResultatfelt(f, s.resultat[f], server[f]));
  if (avvik.length)
    return avvis(
      'ANNET_RESULTAT',
      `Serveren regner ut ${avvik.map((f) => `${f}=${String(server[f])}`).join(', ')}.`
    );
  return null;
}

export function nyttelastkontroll(k: Kommando, u: Utledning, regler: Regelsett): Avvisning | null {
  switch (k.type) {
    case 'krav': {
      const varsel = u.spor.frist.varsel;
      if (k.spor !== 'frist' || !k.varsel || !varsel) return null;
      const sendt = datoFor(
        varsel,
        'sendt',
        u.opplysninger.map((o) => o.opplysning)
      );
      // SK-12: et registrert varsel beholder datoen det fikk første gang (rad KA-19).
      return sendt?.dato === k.varsel.sendt
        ? null
        : avvis(
            'VARSEL_REGISTRERT',
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
        return avvis('FEIL_SVARREFERANSE', 'Svaret er endret eller gjelder et tidligere krav.');
      return kontrollerSvar(k.svar, u, regler);
    case 'aksept': {
      // KA-U1, KT-U1: aksepten gjelder sporets gjeldende svar.
      if (k.svar !== u.spor[k.spor].gjeldendeSvar?.id)
        return avvis('IKKE_GJELDENDE_SVAR', 'Aksepten må gjelde gjeldende svar i dette sporet.');
      if (k.regelversjon !== regler.versjon)
        return avvis(
          'ANNEN_REGELVERSJON',
          `Aksepten er forhåndsvist med regelversjon ${k.regelversjon}, serveren bruker ${regler.versjon}. Last inn saken på nytt.`
        );
      return null;
    }
    case 'bestridelse': {
      // MM-U7: en opplysning om § 31.3 bestrides som det, en dato som sendt eller mottatt.
      const o = u.opplysninger.find((x) => x.opplysning.id === k.gjelder)?.opplysning;
      return o && !sammeSlag(o.hva, k.hva)
        ? avvis('FEIL_BESTRIDELSE', `Opplysningen gjelder ${o.hva}, ikke ${k.hva}.`)
        : null;
    }
    case 'passivitet': {
      // VS-U12 og GR-U11: passivitetsregelen gjelder bare der § 32.2 gjelder.
      const krav = u.spor.grunnlag.krav.find((x) => x.id === k.gjelder);
      return gjelderVarslingsplikten(krav, regler)
        ? null
        : avvis(
            'VARSLINGSPLIKT_GJELDER_IKKE',
            '§ 32.2 gjelder ikke kategorien, så § 32.3 annet ledd gjelder heller ikke (GR-U11).'
          );
    }
    case 'trekk':
    case 'varsel':
    case 'ingen_krav':
    case 'innsigelse':
    case 'protest':
    case 'merking':
    case 'avklaring':
      return null;
  }
}
