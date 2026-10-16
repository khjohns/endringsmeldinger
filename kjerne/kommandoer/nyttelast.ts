/**
 * Nyttelastkontrollen: referansene i kommandoen og serverens utregning (B-13).
 * Kjøres etter forutsetningene. Serveren regner svaret på nytt og avviser en
 * kommando der klientens verdier er andre. En aksept bærer bare svaret og
 * regelversjonen; innholdet står i brevet (KA-U10).
 */

import { beloep } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { erBeloepetGodkjentFullt } from '../regler/vederlag.ts';
import { avvis } from './forutsetninger.ts';
import { norskDato } from '../frosset/brevtekst.ts';
import { datoFor, sammeSlag } from '../format/leser.ts';
import { tekst } from '../format/skjema.ts';
import type { Kommando, Svarutkast } from './kommando.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import {
  gjelderVarslingsplikten,
  innsigelsenPaaberoper,
  likeResultatfelt,
  regnUtSvar,
  SAMMENLIKNES,
  utenforOmfanget,
} from '../frosset/standpunkt.ts';
import {
  frafalletBinder,
  harSagtITide,
  type Rettidighet,
  type Utledning,
} from '../utledning/utled.ts';
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
  // #520: et felt som ikke gjelder kategorien, avvises av utregningen før dette.
  const bundet = paaberopt(s, krav.id).find((r) => harSagtITide(u, s.spor, r));
  if (bundet)
    return avvis(
      'SAGT_I_TIDE',
      'gjelder' in bundet
        ? 'Byggherren har i et svar sendt fra appen sagt at kravet ble spesifisert i tide etter § 33.6.1, og kan ikke nå påberope at det kom for sent (HF-U4).'
        : `Byggherren har i et svar sendt fra appen sagt at varselet kom i tide etter § ${bundet.hjemmel}, og kan ikke nå påberope at det kom for sent (HF-U4, HF-U8).`
    );
  if (s.spor === 'grunnlag' && s.vurderinger.resultat === 'avslaatt' && frafalletBinder(u))
    return avvis(
      'FRAFALT',
      'Byggherren har i et svar sendt fra appen frafalt pålegget etter § 32.3 c, og kan ikke nå avslå grunnlaget, heller ikke i en ny grunnlagsversjon (GR-U17, GR-U20).'
    );
  const avvik = SAMMENLIKNES[s.spor].filter((f) => !likeResultatfelt(f, s.resultat[f], server[f]));
  if (avvik.length)
    return avvis(
      'ANNET_RESULTAT',
      `Serveren regner ut ${avvik.map((f) => `${f}=${String(server[f])}`).join(', ')}.`
    );
  const grunner = avgrensninger(s, server, krav.innhold.beloep);
  if (utdypningKreves && grunner.length && !s.utdypning?.trim())
    return avvis(
      'BEGRUNNELSE_MANGLER',
      `Svaret må ha en begrunnelse, fordi det har ${grunner.join(', ')} (KA-U24, KA-U31).`
    );
  return null;
}

/** Påberopelsene i svaret av at varselet kom for sent, eller at kravet ble spesifisert for sent. */
function paaberopt(s: Svarutkast, krav: string): Rettidighet[] {
  const v = s.vurderinger;
  if (s.spor === 'grunnlag')
    return v.grunnlag_varslet_i_tide === false ? [{ hjemmel: '32.2' }] : [];
  if (s.spor === 'vederlag')
    return v.hovedkrav_varslet_i_tide === false ? [{ hjemmel: '34.1.2' }] : [];
  return [
    ...(v.frist_varsel_ok === false ? [{ hjemmel: '33.4' as const }] : []),
    ...(v.spesifisert_krav_ok === false ? [{ hjemmel: '33.6.1' as const, gjelder: krav }] : []),
  ];
}

/**
 * KA-U24, KA-U32: de selvstendige innsigelsene og avgrensningene i svaret som gjør
 * det mindre gunstig for TE enn kravet, og som krever en begrunnelse. Dagens
 * tilfeller står som liste; § 34.1.3 kommer med når den
 * bygges. At et svar bare er subsidiært fordi grunnlaget er avslått, krever ingen
 * egen begrunnelse. Leser vurderingene og serverens utregning, ikke teksten.
 */
function avgrensninger(
  s: Svarutkast,
  server: Record<string, unknown>,
  krevdBeloep: unknown
): string[] {
  const v = s.vurderinger;
  const ut: string[] = [];
  const fulltGodkjent = (server.subsidiaert_resultat ?? server.resultat) === 'godkjent';
  if (s.spor === 'grunnlag') {
    if (v.grunnlag_varslet_i_tide === false) ut.push('påberopt preklusjon etter § 32.2 (KA-U21)');
    if (v.resultat === 'avslaatt') ut.push('avslag av grunnlaget');
    if (v.resultat === 'paalegg_frafalt') ut.push('frafall etter § 32.3 c (KA-U32)');
  } else if (s.spor === 'vederlag') {
    if (v.hovedkrav_varslet_i_tide === false) ut.push('påberopt preklusjon etter § 34.1.2');
    if (v.aksepterer_metode === false) ut.push('et tilbud som ikke er akseptert (§ 34.2.2)');
    // B-13: beløpet alene, også uten aksept av tilbudet; da gjelder grunnen over i tillegg.
    const godkjent = server.subsidiaert_godkjent_beloep ?? server.godkjent_beloep;
    const krevd = beloep((krevdBeloep as number | undefined) ?? 0)!;
    if (!erBeloepetGodkjentFullt(krevd, beloep(godkjent as number)!))
      ut.push('et beløp som ikke er godkjent fullt');
  } else {
    if (v.frist_varsel_ok === false) ut.push('påberopt preklusjon etter § 33.4');
    if (v.vilkar_oppfylt === false) ut.push('«ingen hindring» etter § 33.1 (VS-U13)');
    if (v.spesifisert_krav_ok === false) ut.push('påberopt spesifisering for sent etter § 33.6.1');
    if (!fulltGodkjent) ut.push('dager som ikke er godkjent fullt');
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
 * GR-U19: en ny grunnlagsversjon beholder hovedkategorien i gjeldende versjon, og
 * underkategorien kan bare endres når § 32.2 gjelder likt før og etter. Vil TE
 * omklassifisere ut over det, trekkes kravet og sendes som en ny sak.
 */
function kategorisperre(
  k: Extract<Kommando, { type: 'krav' }>,
  u: Utledning,
  regler: Regelsett
): Avvisning | null {
  const forrige = u.spor.grunnlag.gjeldendeKrav;
  if (k.spor !== 'grunnlag' || !forrige) return null;
  const foer = tekst(forrige.innhold.hovedkategori);
  if (tekst(k.innhold.hovedkategori) !== foer)
    return avvis(
      'ANNEN_HOVEDKATEGORI',
      `Kravet har hovedkategorien ${foer}, og en ny versjon kan ikke endre den. Vil TE omklassifisere, trekkes kravet og sendes som en ny sak (GR-U19).`
    );
  const gjaldt = gjelderVarslingsplikten(forrige, regler);
  if (gjelderVarslingsplikten(k, regler) !== gjaldt)
    return avvis(
      'ANNEN_VARSLINGSPLIKT',
      `§ 32.2 ${gjaldt ? 'gjelder' : 'gjelder ikke'} underkategorien i kravet, og en ny versjon kan ikke endre det. Vil TE omklassifisere, trekkes kravet og sendes som en ny sak (GR-U19).`
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
      const sperre = kategorisperre(k, u, regler);
      if (sperre) return sperre;
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
    case 'protest':
    case 'merking':
    case 'avklaring':
      return null;
    case 'innsigelse': {
      // VS-U24, HF-U4: en innsigelse mot varselet etter § 33.4 eller TEs varsel etter § 32.2
      // er en påberopelse etter bestemmelsen. Har byggherren sagt i et svar fra appen at
      // varselet kom i tide, avvises den (del 2 av #498).
      const maal = u.elementer[k.gjelder];
      const hjemmel = innsigelsenPaaberoper(
        maal && { art: maal.art, krav: u.spor.grunnlag.krav.find((x) => x.id === k.gjelder) },
        regler
      );
      return hjemmel && harSagtITide(u, hjemmel === '33.4' ? 'frist' : 'grunnlag', { hjemmel })
        ? avvis(
            'SAGT_I_TIDE',
            `Byggherren har i et svar sendt fra appen sagt at varselet kom i tide etter § ${hjemmel}, og kan ikke nå påberope at det kom for sent (HF-U4, VS-U24).`
          )
        : null;
    }
    case 'begrunnelse': {
      // Datoen kontrolleres også i forhåndsvisningen; teksten bare når den sendes.
      const tekst = utdypningKreves ? begrunnelsensTekst(k) : null;
      return tekst ?? begrunnelsensDato(k, u);
    }
  }
}
