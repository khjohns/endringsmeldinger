/**
 * Nyttelastkontrollen: referansene i kommandoen og serverens utregning (B-13).
 * Kjøres etter forutsetningene. Serveren regner svaret på nytt og avviser en
 * kommando der klientens verdier er andre. En aksept bærer bare svaret og
 * regelversjonen; innholdet står i brevet (KA-U10).
 */

import { beloep, UgyldigBeloep } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { erBeloepetGodkjentFullt } from '../regler/vederlag.ts';
import { avvis } from './forutsetninger.ts';
import { norskDato } from '../frosset/brevtekst.ts';
import { oppgittDato, type OppgittDato } from '../format/format.ts';
import { datoFor, kalenderdag } from '../format/leser.ts';
import { tekst } from '../format/skjema.ts';
import type { Kommando, Svarutkast } from './kommando.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import {
  gjelderVarslingsplikten,
  likeResultatfelt,
  regnUtSvar,
  SAMMENLIKNES,
  utenforOmfanget,
} from '../frosset/standpunkt.ts';
import {
  frafalletBinder,
  harSagtITide,
  innsigelsenEtterITide,
  type Rettidighet,
  type Utledning,
} from '../utledning/utled.ts';
import { senketStandpunkt, standpunkter } from './standpunkter.ts';
import type { Avvisning, Krav, Part, Svar } from '../typer.ts';

/** `forrige` er svaret en revisjon erstatter, så bindingen kontrolleres (HF-U5). */
function kontrollerSvar(
  s: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  utdypningKreves: boolean,
  forrige: Svar | null = null
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
  // #766: et ugyldig beløp i det lagrede kravet er ikke byggherrens vurdering.
  if (s.spor === 'vederlag') beloep(krav.innhold.beloep as number | undefined);
  let server: Record<string, unknown>;
  try {
    server = regnUtSvar(
      s.spor,
      s.vurderinger,
      { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
      regler
    );
  } catch (feil) {
    // #550: et beløp som ikke er et tall, er en ugyldig vurdering, ikke en feil på serveren.
    if (feil instanceof UgyldigVurdering || feil instanceof UgyldigBeloep)
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
  return forrige && binding(s, forrige, krav, u, server);
}

/**
 * HF-U5, HF-U14, HF-U21: en revisjon av et svar TE ikke har godtatt, kan ikke senke noe
 * byggherren har innrømmet i svaret, også etter en ny grunnlagsversjon med samme hjemmel.
 * En ny kravversjon gir et nytt svar, ikke en revisjon (HF-U8). Et registrert svar med
 * virkning er bare byggherrens endringsordre etter OV-U6, som gir enighet ved sammenfall,
 * så revisjonen av det er avvist før dette (GR-U10, KA-U7). `server` er serverens
 * utregning av revisjonen.
 */
function binding(
  s: Svarutkast,
  forrige: Svar,
  krav: Krav,
  u: Utledning,
  server: Record<string, unknown>
): Avvisning | null {
  let n = 0;
  const senket = senketStandpunkt(
    forrige,
    standpunkter(s, krav, u, () => `revisjon-${++n}`),
    server
  );
  return senket
    ? avvis(
        'SENKER_INNROEMMELSE',
        `${senket}. Byggherren er bundet av det svaret innrømmer, til TE godtar det eller sender en ny kravversjon, og kan bare revidere svaret i TEs favør (HF-U5).`
      )
    : null;
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
 * GR-U22: når grunnlaget er sendt, står hjemmelen, hovedkategorien og underkategorien.
 * En ny versjon med samme hjemmel kan for eksempel rette endringsordrens dato eller
 * nummer (GR-U16). Om det er samme forhold, avgjør ikke appen (MM-U12).
 */
function kategorisperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  const forrige = u.spor.grunnlag.gjeldendeKrav;
  if (k.spor !== 'grunnlag' || !forrige) return null;
  return tekst(k.innhold.hovedkategori) === tekst(forrige.innhold.hovedkategori) &&
    tekst(k.innhold.underkategori) === tekst(forrige.innhold.underkategori)
    ? null
    : avvis(
        'ANNEN_HJEMMEL',
        'Grunnlaget er sendt, og en ny versjon kan ikke endre hovedkategorien eller underkategorien (GR-U22).'
      );
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

const OPPGITT: Record<OppgittDato, string> = {
  paalegg_mottatt: 'pålegget ble mottatt',
  klar_over_forholdet: 'TE ble klar over forholdet',
};

/**
 * Datoen TE oppgir etter VS-U26, kan ikke være etter brevets dato, som er
 * serverens (VS-U8) i norsk tid. Det er en kontroll av en dato som ikke kan
 * stemme; om varselet kom i tide, vurderes ikke (arbeidsvalg 1 i #664, samme form
 * som KA-U36).
 */
export function oppgittDatoEtterBrevet(k: Kommando, brevetsDato: string): Avvisning | null {
  if (k.type !== 'krav' || k.spor !== 'grunnlag') return null;
  const felt = oppgittDato(k.innhold.hovedkategori, k.innhold.underkategori);
  const dato = felt === null ? undefined : k.innhold[felt];
  // #766: en dato som ikke kan tolkes, kontrolleres ikke her, som når den mangler (KA-U38).
  const dag = typeof dato === 'string' ? kalenderdag(dato) : null;
  const brevet = kalenderdag(brevetsDato);
  if (felt === null || dag === null || brevet === null || dag <= brevet) return null;
  return avvis(
    'DATO_ETTER_BREVET',
    `TE har oppgitt at ${OPPGITT[felt]} ${norskDato(dag)}, etter brevets dato ${norskDato(brevetsDato)}.`
  );
}

/**
 * `utdypningKreves` er usann i forhåndsvisningen: utdypningen endrer ikke den låste
 * teksten, så klienten kan vise teksten før begrunnelsen er skrevet (A1).
 */
export function nyttelastkontroll(
  k: Kommando,
  part: Part,
  u: Utledning,
  regler: Regelsett,
  utdypningKreves = true
): Avvisning | null {
  switch (k.type) {
    case 'krav': {
      const sperre = kategorisperre(k, u);
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
      const registrert = kalenderdag(sendt.dato);
      if (registrert === null)
        return avvis(
          'VARSEL_REGISTRERT',
          'Datoen varselet er registrert med, kan ikke leses som en dato, så kravet kan ikke kontrolleres mot den (SK-12).'
        );
      // SK-12: et registrert varsel beholder datoen det fikk første gang (rad KA-19).
      return registrert === kalenderdag(k.varsel.sendt)
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
    case 'revisjon': {
      const forrige = u.spor[k.svar.spor].gjeldendeSvar;
      if (k.erstatter !== forrige?.id)
        return avvis('FEIL_SVARREFERANSE', 'Svaret er endret eller gjelder et tidligere krav.');
      return kontrollerSvar(k.svar, u, regler, utdypningKreves, forrige);
    }
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
    case 'bestridelse':
    case 'merking':
    case 'avklaring':
      return null;
    case 'innsigelse': {
      // VS-U24, HF-U4: en innsigelse mot varselet etter § 33.4 eller TEs varsel etter § 32.2
      // er en påberopelse etter bestemmelsen. Har byggherren sagt i et svar fra appen at
      // varselet kom i tide, avvises den (del 2 av #498).
      const hjemmel = innsigelsenEtterITide(k.gjelder, part, u);
      return hjemmel
        ? avvis(
            'SAGT_I_TIDE',
            `Byggherren har i et svar sendt fra appen sagt at varselet kom i tide etter § ${hjemmel}, og kan ikke nå påberope at det kom for sent (HF-U4, VS-U24).`
          )
        : null;
    }
    case 'begrunnelse': {
      // OV-U7: datokontrollene for registrert begrunnelse (KA-U36–KA-U39) bygges ikke.
      return utdypningKreves ? begrunnelsensTekst(k) : null;
    }
  }
}
