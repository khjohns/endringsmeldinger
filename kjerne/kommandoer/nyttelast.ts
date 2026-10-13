/**
 * Nyttelastkontrollen: referansene i kommandoen og serverens utregning (B-13).
 * Kjøres etter forutsetningene. Serveren regner svaret på nytt og avviser en
 * kommando der klientens verdier er andre. En aksept bærer bare svaret og
 * regelversjonen; innholdet står i brevet (KA-U10).
 */

import { UgyldigVurdering } from '../regler/feil.ts';
import { avvis } from './forutsetninger.ts';
import { norskDato } from '../frosset/brevtekst.ts';
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

function kontrollerSvar(
  s: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  utdypningKreves: boolean
): Avvisning | null {
  const krav = u.spor[s.spor].gjeldendeKrav!;
  if (s.gjelder !== krav.id)
    return avvis('FEIL_KRAVREFERANSE', 'Svaret må gjelde gjeldende krav i dette sporet.');
  if (s.regelversjon !== regler.versjon)
    return avvis(
      'ANNEN_REGELVERSJON',
      `Svaret er regnet ut med regelversjon ${s.regelversjon}, serveren bruker ${regler.versjon}.`
    );
  // VS-U9 og OV-U1: svaret skulle gjentatt byggherrens innsigelse mot vederlagskravet,
  // men preklusjon etter § 34.1 er ikke bygget.
  if (s.spor === 'vederlag' && u.innsigelser.some((i) => i.part === 'BH' && i.gjelder === krav.id))
    return avvis(
      'VURDERING_UTENFOR_KJERNEN',
      'Kjernen kan ikke lagre vurderingen: preklusjon etter § 34.1 etter en innsigelse er ikke i kjernen ennå.'
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
  const grunner = avgrensninger(s, server);
  if (utdypningKreves && grunner.length && !s.utdypning?.trim())
    return avvis(
      'BEGRUNNELSE_MANGLER',
      `Svaret må ha en begrunnelse, fordi det har ${grunner.join(', ')} (KA-U24, KA-U31).`
    );
  return null;
}

/**
 * KA-U24, KA-U32: de selvstendige innsigelsene og avgrensningene i svaret som gjør
 * det mindre gunstig for TE enn kravet, og som krever en begrunnelse. Dagens
 * tilfeller står som liste; § 34.1.3 kommer med når den
 * bygges. At et svar bare er subsidiært fordi grunnlaget er avslått, krever ingen
 * egen begrunnelse. Leser vurderingene og serverens utregning, ikke teksten.
 */
function avgrensninger(s: Svarutkast, server: Record<string, unknown>): string[] {
  const v = s.vurderinger;
  const ut: string[] = [];
  if (s.spor === 'grunnlag') {
    if (v.grunnlag_varslet_i_tide === false) ut.push('påberopt preklusjon etter § 32.2 (KA-U21)');
    if (v.resultat === 'avslaatt') ut.push('avslag av grunnlaget');
    if (v.resultat === 'paalegg_frafalt') ut.push('frafall etter § 32.3 c (KA-U32)');
  } else if (s.spor === 'vederlag') {
    if (v.hovedkrav_varslet_i_tide === false) ut.push('påberopt preklusjon etter § 34.1.2');
    if (v.aksepterer_metode === false) ut.push('et tilbud som ikke er akseptert (§ 34.2.2)');
    if (server.resultat !== 'godkjent' && server.subsidiaert_resultat !== 'godkjent')
      ut.push('et beløp som ikke er godkjent fullt');
  } else {
    if (v.frist_varsel_ok === false) ut.push('påberopt preklusjon etter § 33.4');
    if (v.vilkar_oppfylt === false) ut.push('«ingen hindring» etter § 33.1 (VS-U13)');
    if (v.spesifisert_krav_ok === false) ut.push('påberopt spesifisering for sent etter § 33.6.1');
    if ((server.subsidiaert_resultat ?? server.resultat) !== 'godkjent')
      ut.push('dager som ikke er godkjent fullt');
  }
  return ut;
}

/**
 * Det TEs krav må ha under den låste teksten: beskrivelsen av pålegget i et varsel
 * etter § 32.2 (GR-U15) og begrunnelsen for dagene i et fristkrav (§ 33.6.1,
 * KA-U33). Leser bare om utdypningen finnes; appen vurderer ikke om den er
 * tilstrekkelig (KA-U19).
 */
function kravetsUtdypning(
  k: Extract<Kommando, { type: 'krav' }>,
  regler: Regelsett
): Avvisning | null {
  if (k.utdypning?.trim()) return null;
  if (k.spor === 'frist')
    return avvis(
      'BEGRUNNELSE_MANGLER',
      'Kravet om fristforlengelse må begrunne antallet dager (NS 8407 § 33.6.1, KA-U33).'
    );
  if (k.spor === 'grunnlag' && gjelderVarslingsplikten(k, regler))
    return avvis(
      'BESKRIVELSE_MANGLER',
      'Varselet etter NS 8407 § 32.2 må beskrive pålegget, så en godkjenning kan si hva endringen går ut på (GR-U15).'
    );
  return null;
}

/**
 * KA-U34: en begrunnelse fra appen må ha teksten. Appen kontrollerer at den finnes,
 * ikke hva den sier (KA-U19). En registrert begrunnelse har ingen (KA-U35).
 */
function begrunnelsensTekst(k: Extract<Kommando, { type: 'begrunnelse' }>): Avvisning | null {
  return k.sendt === undefined && !k.utdypning?.trim()
    ? avvis('BEGRUNNELSE_MANGLER', 'Begrunnelsen har ingen tekst.')
    : null;
}

/**
 * KA-U36: en registrert begrunnelse kan ikke være sendt før svaret den begrunner.
 * Datoen for svaret står i utledningen (KA-U37–KA-U39). Om begrunnelsen kom i tide,
 * vurderes ikke.
 */
function begrunnelsensDato(
  k: Extract<Kommando, { type: 'begrunnelse' }>,
  u: Utledning
): Avvisning | null {
  const svaret = u.svarSendt[k.gjelder];
  if (k.sendt === undefined || !svaret || k.sendt >= svaret) return null;
  return avvis(
    'BEGRUNNELSE_FOER_SVARET',
    `Begrunnelsen er oppgitt sendt ${norskDato(k.sendt)}, men svaret den begrunner, ble sendt ${norskDato(svaret)}.`
  );
}

/**
 * `utdypningKreves` er usann i forhåndsvisningen: utdypningen endrer ikke den låste
 * teksten, så klienten kan vise teksten før begrunnelsen er skrevet (A1).
 */
export function nyttelastkontroll(
  k: Kommando,
  u: Utledning,
  regler: Regelsett,
  utdypningKreves = true
): Avvisning | null {
  switch (k.type) {
    case 'krav': {
      const utdypning = utdypningKreves ? kravetsUtdypning(k, regler) : null;
      if (utdypning) return utdypning;
      const varsel = u.spor.frist.varsel;
      if (k.spor !== 'frist' || !k.varsel || !varsel) return null;
      const sendt = datoFor(
        varsel,
        'sendt',
        u.opplysninger.map((o) => o.opplysning)
      );
      // SK-12, VS-U15: et varsel uten sendedato, som et varsel sendt fra appen med serverens
      // dato, får ingen dato fra kravet.
      if (sendt === undefined)
        return avvis(
          'VARSEL_REGISTRERT',
          'Varselet er sendt fra appen eller registrert uten dato for sendingen, og kravet kan ikke oppgi en (SK-12).'
        );
      // SK-12: et registrert varsel beholder datoen det fikk første gang (rad KA-19).
      return sendt.dato === k.varsel.sendt
        ? null
        : avvis(
            'VARSEL_REGISTRERT',
            'Varselet er registrert med en annen dato og kan ikke flyttes (SK-12).'
          );
    }
    case 'brev':
      for (const s of k.svar) {
        const a = kontrollerSvar(s, u, regler, utdypningKreves);
        if (a) return a;
      }
      return null;
    case 'revisjon':
      if (k.erstatter !== u.spor[k.svar.spor].gjeldendeSvar?.id)
        return avvis('FEIL_SVARREFERANSE', 'Svaret er endret eller gjelder et tidligere krav.');
      return kontrollerSvar(k.svar, u, regler, utdypningKreves);
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
    case 'send_varsel':
    case 'ingen_krav':
    case 'innsigelse':
    case 'protest':
    case 'merking':
    case 'avklaring':
      return null;
    case 'begrunnelse': {
      // Datoen kontrolleres også i forhåndsvisningen; teksten bare når den sendes.
      const tekst = utdypningKreves ? begrunnelsensTekst(k) : null;
      return tekst ?? begrunnelsensDato(k, u);
    }
  }
}
