/**
 * Nyttelastkontrollen: referansene i kommandoen og serverens utregning (B-13).
 * Kjøres etter forutsetningene. Serveren regner svaret på nytt og avviser en
 * kommando der klientens verdier er andre. En aksept bærer bare svaret og
 * regelversjonen; innholdet står i brevet (KA-U10 (opphevet av MM-U50)).
 */

import { beloep, UgyldigBeloep } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { erBeloepetGodkjentFullt } from '../regler/vederlag.ts';
import { avvis, ELDRE_SVAR } from './forutsetninger.ts';
import { norskDato } from '../frosset/brevtekst.ts';
import { DATOEN_GJELDER, oppgittDato } from '../format/format.ts';
import { datoFor, kalenderdag } from '../format/leser.ts';
import { erKalenderdato, tekst } from '../format/skjema.ts';
import { korrigertDato, type Kommando, type Svarutkast } from './kommando.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import {
  gjelderVarslingsplikten,
  hjemmelenGjelder,
  krevdSamlet,
  likeResultatfelt,
  regnUtSvar,
  SAMMENLIKNES,
  utenforOmfanget,
} from '../frosset/standpunkt.ts';
import {
  datoenKravetBleSendt,
  foresporselForFristsvar,
  sisteDatoopplysning,
  type Utledning,
} from '../utledning/utled.ts';
import type { Avvisning, Krav, Part, Standpunkt } from '../typer.ts';

/**
 * Standpunktene i et svarutkast med serverens utregning, lest slik brevet lagrer dem.
 * Skrivingen bygger dem én gang per svar, og brevet lagrer de samme (#804).
 */
export type Svarstandpunkter = (s: Svarutkast, utregning: Record<string, unknown>) => Standpunkt[];

/**
 * MM-U34 punkt 4, 6 og 7: også en revisjon som senker det byggherren har godkjent, en
 * påberopelse etter et «i tide» og et avslag etter et frafall godtas. Løsningen avgjør
 * ikke om endringen er rettslig virksom (MM-U12 (opphevet av MM-U50)).
 */
function kontrollerSvar(
  s: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  svarstandpunkter: Svarstandpunkter,
  utdypningKreves: boolean
): Avvisning | null {
  const krav = u.spor[s.spor].gjeldendeKrav!;
  if (s.gjelder !== krav.id)
    return avvis('FEIL_KRAVREFERANSE', 'Svaret må gjelde den gjeldende versjonen av kravet.');
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
      {
        krav,
        paaberopelse: u.spor.forhold.gjeldendeKrav,
        foresporsel: foresporselForFristsvar(u),
      },
      regler
    );
  } catch (feil) {
    // #550: et beløp som ikke er et tall, er en ugyldig vurdering, ikke en feil på serveren.
    if (feil instanceof UgyldigVurdering || feil instanceof UgyldigBeloep)
      return avvis('UGYLDIG_VURDERING', `Vurderingene kan ikke regnes ut: ${feil.message}.`);
    throw feil;
  }
  // #520: et felt som ikke gjelder kategorien, avvises av utregningen før dette. Skrivingen
  // registrerer standpunktene og utregningen for brevet her (#814).
  svarstandpunkter(s, server);
  const avvik = SAMMENLIKNES[s.spor].filter((f) => !likeResultatfelt(f, s.resultat[f], server[f]));
  if (avvik.length)
    return avvis(
      'ANNET_RESULTAT',
      `Serveren regner ut ${avvik.map((f) => `${f}=${String(server[f])}`).join(', ')}.`
    );
  // KA-U24 (opphevet av KA-U46), KA-U31: grunnene til at svaret må ha en begrunnelse.
  const grunner = avgrensninger(s, server, krav);
  if (utdypningKreves && grunner.length && !s.utdypning?.trim())
    return avvis(
      'BEGRUNNELSE_MANGLER',
      `Svaret må ha en begrunnelse, fordi du ${grunner.slice(0, -1).join(', ')}${grunner.length > 1 ? ' og ' : ''}${grunner.at(-1)}.`
    );
  return null;
}

/**
 * KA-U24, KA-U32: de selvstendige innsigelsene og avgrensningene i svaret som gjør
 * det mindre gunstig for TE enn kravet, og som krever en begrunnelse. Begrensningen etter
 * § 34.1.3 krever begrunnelse også når beløpene er like (valg d i #1047). At et svar bare er subsidiært fordi forholdet er avslått, krever ingen
 * egen begrunnelse. Leser vurderingene og serverens utregning, ikke teksten. Hver grunn
 * står uten subjekt, så meldingen kan si «fordi du …» (#1279).
 */
function avgrensninger(s: Svarutkast, server: Record<string, unknown>, krav: Krav): string[] {
  const v = s.vurderinger;
  const ut: string[] = [];
  const fulltGodkjent = (server.subsidiaert_resultat ?? server.resultat) === 'godkjent';
  if (s.spor === 'forhold') {
    // KA-U21
    if (v.grunnlag_varslet_i_tide === false)
      ut.push('gjør gjeldende at varselet etter § 32.2 kom for sent');
    if (v.resultat === 'avslaatt') ut.push('avslår grunnlaget');
    // KA-U32
    if (v.resultat === 'paalegg_frafalt') ut.push('frafaller pålegget etter § 32.3 c');
  } else if (s.spor === 'vederlag') {
    if (v.hovedkrav_varslet_i_tide === false)
      ut.push('gjør gjeldende at varselet etter § 34.1.2 kom for sent');
    // VS-U5: begrensningen etter § 34.1.3.
    if (v.produktivitet_varslet_i_tide === false)
      ut.push('gjør gjeldende at varselet etter § 34.1.3 kom for sent');
    if (v.aksepterer_metode === false) ut.push('ikke aksepterer tilbudet (§ 34.2.2)');
    // B-13: beløpet alene, også uten aksept av tilbudet; da gjelder grunnen over i tillegg.
    const godkjent = beloep(
      (server.subsidiaert_godkjent_beloep ?? server.godkjent_beloep) as number | undefined
    );
    if (godkjent === null)
      throw new Error('Utregningen av vederlaget har ikke godkjent beløp (#508).');
    if (!erBeloepetGodkjentFullt(krevdSamlet(krav), godkjent))
      ut.push('ikke godkjenner hele beløpet');
  } else {
    if (v.frist_varsel_ok === false)
      ut.push('gjør gjeldende at varselet etter § 33.4 kom for sent');
    // VS-U17
    if (v.foresporsel_svar_ok === false)
      ut.push('gjør gjeldende at svaret på forespørselen etter § 33.6.2 kom for sent');
    // VS-U13: uten hjemmel, som er § 33.3 i force majeure.
    if (v.vilkar_oppfylt === false)
      ut.push('gjør gjeldende at fremdriften ikke er hindret som følge av forholdet');
    if (v.spesifisert_krav_ok === false)
      ut.push('gjør gjeldende at kravet ble spesifisert for sent (§ 33.6.1)');
    if (!fulltGodkjent) ut.push('ikke godkjenner alle dagene');
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
  if (k.spor === 'forhold' && gjelderVarslingsplikten(k, regler))
    return avvis(
      'BESKRIVELSE_MANGLER',
      'Varselet etter NS 8407 § 32.2 må beskrive pålegget, så en godkjenning kan si hva endringen går ut på (GR-U15).'
    );
  return null;
}

/**
 * GR-U22: når forholdet er sendt, står hjemmelen, hovedkategorien og underkategorien.
 * En ny versjon med samme hjemmel kan for eksempel rette endringsordrens dato eller
 * nummer (GR-U16). Om det er samme forhold, avgjør ikke appen (MM-U12 (opphevet av MM-U50)).
 */
function kategorisperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  const forrige = u.spor.forhold.gjeldendeKrav;
  if (k.spor !== 'forhold' || !forrige) return null;
  return tekst(k.innhold.hovedkategori) === tekst(forrige.innhold.hovedkategori) &&
    tekst(k.innhold.underkategori) === tekst(forrige.innhold.underkategori)
    ? null
    : avvis(
        'ANNEN_HJEMMEL',
        'Grunnlaget er sendt, og en ny versjon kan ikke endre hovedkategorien eller underkategorien (GR-U22).'
      );
}

/**
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41): en ny grunnlagsversjon kan ikke
 * endre datoen etter VS-U26, og gjengir TEs siste opplysning. Datoen endres i en korrigering.
 */
function datosperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  if (k.spor !== 'forhold') return null;
  const felt = oppgittDato(k.innhold.hovedkategori, k.innhold.underkategori);
  const siste = felt === null ? null : sisteDatoopplysning(u, felt);
  if (felt === null || siste === null || k.innhold[felt] === siste.dato) return null;
  return avvis(
    'DATOEN_KAN_IKKE_ENDRES',
    `En ny versjon av grunnlaget kan ikke endre datoen ${DATOEN_GJELDER[felt]}. TEs siste opplysning er ${norskDato(siste.dato)}. Datoen korrigeres i et eget brev.`
  );
}

/**
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41): korrigeringen har datoen
 * kategorien har, og endrer TEs siste opplysning (arbeidsvalget i avgrensningen av #1308).
 * Forutsetningene har kontrollert at den viser til den siste opplysningen.
 */
function kontrollerKorrigering(
  k: Extract<Kommando, { type: 'korrigering' }>,
  u: Utledning
): Avvisning | null {
  const { felt, dato } = korrigertDato(k);
  const krav = u.spor.forhold.gjeldendeKrav!;
  const kategoriensFelt = oppgittDato(krav.innhold.hovedkategori, krav.innhold.underkategori);
  if (felt !== kategoriensFelt)
    return avvis(
      'UGYLDIG_KORRIGERING',
      `I kategorien i grunnlaget oppgir TE datoen ${DATOEN_GJELDER[kategoriensFelt!]}, ikke datoen ${DATOEN_GJELDER[felt]}.`
    );
  return sisteDatoopplysning(u, felt)?.dato === dato
    ? avvis(
        'DATOEN_ER_UENDRET',
        `TE har alt oppgitt at ${DATOEN_GJELDER[felt]} ${norskDato(dato)}. Korrigeringen må oppgi en annen dato.`
      )
    : null;
}

/**
 * KA-U34 (opphevet av KA-U46): en begrunnelse fra appen må ha teksten. Appen kontrollerer at den finnes,
 * ikke hva den sier (KA-U19). En registrert begrunnelse har ingen (KA-U35 (opphevet av KA-U46)).
 */
function begrunnelsensTekst(k: Extract<Kommando, { type: 'begrunnelse' }>): Avvisning | null {
  return k.sendt === undefined && !k.utdypning?.trim()
    ? avvis('BEGRUNNELSE_MANGLER', 'Begrunnelsen har ingen tekst.')
    : null;
}

/**
 * VS-U38, VS-U39: varselet etter § 32.2 sendt utenfor løsningen registreres bare der
 * varslingsplikten gjelder kategorien i påberopelsen, og det kan ikke være sendt etter
 * påberopelsen. Forutsetningene har alt krevd at påberopelsen er sendt.
 */
function varseletEtter322(sendt: string, u: Utledning, regler: Regelsett): Avvisning | null {
  const [foerste] = u.spor.forhold.krav;
  if (!gjelderVarslingsplikten(u.spor.forhold.gjeldendeKrav, regler))
    return avvis(
      'VARSLINGSPLIKT_GJELDER_IKKE',
      'Varslingsplikten etter punkt 32.2 gjelder ikke forholdet som er påberopt, så det er ikke noe varsel etter punkt 32.2 å registrere (VS-U39).'
    );
  const paaberopelsen = foerste ? datoenKravetBleSendt(u, foerste) : null;
  const dag = kalenderdag(sendt);
  if (paaberopelsen === null || dag === null)
    return avvis(
      'DATO_KAN_IKKE_LESES',
      'Datoen for varselet etter punkt 32.2 eller for påberopelsen av forholdet kan ikke leses, så det kan ikke avgjøres om varselet ble sendt før påberopelsen (VS-U38).'
    );
  if (dag > paaberopelsen)
    return avvis(
      'VARSEL_ETTER_PAABEROPELSEN',
      `Varselet etter punkt 32.2 er oppgitt sendt ${norskDato(dag)}, etter påberopelsen av forholdet, som ble sendt ${norskDato(paaberopelsen)} (VS-U38).`
    );
  return null;
}

const varseletSendt = (hjemmel: string) => `varselet etter § ${hjemmel} ble sendt`;

type OppgittDato = { dato: unknown; gjelder: string; av: 'TE' | 'Byggherren' };

/**
 * Datoen parten oppgir i kommandoen og det den gjelder: datoen varslingsplikten løper
 * fra i påberopelsen (VS-U26), datoen et varsel etter § 33.4, § 34.1.2 eller § 34.1.3 ble
 * sendt utenfor appen, registrert for seg eller i fristkravet (OV-U5), og datoen
 * byggherrens registrerte begrunnelse ble sendt (KA-U35 (opphevet av KA-U46)).
 */
function oppgittDatoI(k: Kommando): OppgittDato | null {
  if (k.type === 'varsel') return { dato: k.sendt, gjelder: varseletSendt(k.hjemmel), av: 'TE' };
  if (k.type === 'begrunnelse')
    return k.sendt === undefined
      ? null
      : { dato: k.sendt, gjelder: 'brevet med begrunnelsen ble sendt', av: 'Byggherren' };
  if (k.type === 'korrigering') {
    const { felt, dato } = korrigertDato(k);
    return { dato, gjelder: DATOEN_GJELDER[felt], av: 'TE' };
  }
  if (k.type !== 'krav') return null;
  if (k.spor === 'frist')
    return k.varsel ? { dato: k.varsel.sendt, gjelder: varseletSendt('33.4'), av: 'TE' } : null;
  if (k.spor !== 'forhold') return null;
  const felt = oppgittDato(k.innhold.hovedkategori, k.innhold.underkategori);
  return felt === null ? null : { dato: k.innhold[felt], gjelder: DATOEN_GJELDER[felt], av: 'TE' };
}

/**
 * Datoen parten oppgir (`oppgittDatoI`), kan ikke være etter brevets dato, som er
 * serverens (VS-U8) i norsk tid. Det er en kontroll av en dato som ikke kan
 * stemme; om varselet kom i tide, vurderes ikke (arbeidsvalg 1 i #664, samme form
 * som KA-U36 (opphevet av KA-U46)). `brevetsDato` er en kalenderdag, ÅÅÅÅ-MM-DD, fra `registrertDato`;
 * dagene sammenliknes som tekst, så et tidspunkt kaster (#870).
 */
export function oppgittDatoEtterBrevet(k: Kommando, brevetsDato: string): Avvisning | null {
  if (!erKalenderdato(brevetsDato))
    throw new Error(`Brevets dato ${brevetsDato} er ikke en kalenderdag på formen ÅÅÅÅ-MM-DD.`);
  // Kartleggingen i #1045: datoen et brev registrert som dokumentasjon ble sendt, er ikke
  // etter dagen det registreres, etter mønsteret i VS-U26.
  if (k.type === 'registrert_brev') {
    const dag = kalenderdag(k.sendt);
    return dag !== null && dag > brevetsDato
      ? avvis(
          'DATO_ETTER_BREVET',
          `Brevet er oppgitt sendt ${norskDato(dag)}, etter dagen det registreres, ${norskDato(brevetsDato)}.`
        )
      : null;
  }
  const oppgitt = oppgittDatoI(k);
  // #766: en dato som ikke kan tolkes, kontrolleres ikke her, som når den mangler (KA-U38).
  const dag = typeof oppgitt?.dato === 'string' ? kalenderdag(oppgitt.dato) : null;
  if (oppgitt === null || dag === null || dag <= brevetsDato) return null;
  return avvis(
    'DATO_ETTER_BREVET',
    `${oppgitt.av} har oppgitt at ${oppgitt.gjelder} ${norskDato(dag)}, etter brevets dato ${norskDato(brevetsDato)}.`
  );
}

/**
 * OV-U17, OV-U18: en retting viser til en registrering av et brev som dokumentasjon
 * tidligere i saken, fra samme side. Er den rettet, rettes den siste i kjeden.
 */
function retting(retter: string, part: Part, u: Utledning): Avvisning | null {
  const brev = u.registrerteBrev.find((b) => b.dokument === retter);
  if (!brev)
    return avvis(
      'RETTER_IKKE_EN_REGISTRERING',
      'Rettingen må gjelde et brev registrert som dokumentasjon i saken.'
    );
  if (brev.avsender !== part)
    return avvis('FEIL_PART', `Bare ${brev.avsender} kan rette sin egen registrering (OV-U17).`);
  if (brev.rettetAv !== null)
    return avvis(
      'REGISTRERINGEN_ER_RETTET',
      // En retting som ikke er en ny registrering, sier at brevet ikke hører til saken (OV-U18).
      !u.registrerteBrev.some((b) => b.dokument === brev.rettetAv)
        ? 'Registreringen er rettet bort fordi brevet ikke hører til saken. Hører det til saken likevel, registreres brevet på nytt (OV-U18).'
        : 'Registreringen er alt rettet. Rett den siste registreringen.'
    );
  return null;
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
  svarstandpunkter: Svarstandpunkter,
  utdypningKreves = true
): Avvisning | null {
  switch (k.type) {
    case 'krav': {
      const sperre = kategorisperre(k, u) ?? datosperre(k, u);
      if (sperre) return sperre;
      const utdypning = utdypningKreves ? kravetsUtdypning(k, regler) : null;
      if (utdypning) return utdypning;
      if (k.spor !== 'frist' || !k.varsel) return null;
      const varsel = u.spor.frist.varsler['33.4'];
      // OV-U5: kravet registrerer varselet, og brevet med det ligger ved. Er varselet
      // registrert, kreves bare samme dato (SK-12; arbeidsvalget i #909).
      if (!varsel)
        return k.varsel.dokumentasjon
          ? null
          : avvis(
              'VEDLEGG_MANGLER',
              'Kravet oppgir datoen varselet etter § 33.4 ble sendt, men brevet med varselet ligger ikke ved (OV-U5).'
            );
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
        const a = kontrollerSvar(s, u, regler, svarstandpunkter, utdypningKreves);
        if (a) return a;
      }
      return null;
    case 'revisjon': {
      const forrige = u.spor[k.svar.spor].gjeldendeSvar;
      if (k.erstatter !== forrige?.id)
        return avvis('FEIL_SVARREFERANSE', 'Svaret er endret eller gjelder et tidligere krav.');
      return kontrollerSvar(k.svar, u, regler, svarstandpunkter, utdypningKreves);
    }
    case 'aksept': {
      // KA-U1, KT-U1: aksepten gjelder sporets gjeldende svar.
      if (k.svar !== u.spor[k.spor].gjeldendeSvar?.id)
        return avvis(
          'IKKE_GJELDENDE_SVAR',
          u.spor[k.spor].svar.some((x) => x.id === k.svar)
            ? ELDRE_SVAR
            : 'Aksepten gjelder ikke et svar byggherren har sendt på kravet.'
        );
      if (k.regelversjon !== regler.versjon)
        return avvis(
          'ANNEN_REGELVERSJON',
          `Aksepten er forhåndsvist med regelversjon ${k.regelversjon}, serveren bruker ${regler.versjon}. Last inn saken på nytt.`
        );
      return null;
    }
    case 'passivitet': {
      // VS-U12 og GR-U11: passivitetsregelen gjelder bare der § 32.2 gjelder.
      const krav = u.spor.forhold.krav.find((x) => x.id === k.gjelder);
      return gjelderVarslingsplikten(krav, regler)
        ? null
        : avvis(
            'VARSLINGSPLIKT_GJELDER_IKKE',
            '§ 32.2 gjelder ikke kategorien, så § 32.3 annet ledd gjelder heller ikke (GR-U11).'
          );
    }
    case 'registrert_brev':
    case 'ikke_i_saken':
      return k.retter === undefined ? null : retting(k.retter, part, u);
    case 'varsel':
      return k.hjemmel === '32.2' ? varseletEtter322(k.sendt, u, regler) : null;
    case 'trekk':
    case 'send_varsel':
    case 'foresporsel':
    case 'foresporselssvar':
    case 'ingen_krav':
    case 'protest':
    case 'bestridelse':
    case 'merking':
    case 'avklaring':
      return null;
    case 'innsigelse': {
      // VS-U29: at noe ikke er et svar etter § 33.6.2 annet ledd, gjelder bare TEs begrunnelse.
      if (k.grunn !== undefined)
        return u.elementer[k.gjelder]?.art === 'foresporselssvar'
          ? null
          : avvis(
              'UGYLDIG_INNSIGELSE',
              'Bare TEs begrunnelse etter § 33.6.2 annet ledd b kan påstås ikke å være et svar etter annet ledd.'
            );
      // OV-U15, KA-46: der TE krever endring, tar byggherren ikke stilling
      // til rettidigheten etter § 34.1.2, så innsigelsen mot varselet avvises som vurderingen.
      if (
        k.gjelder === u.spor.vederlag.varsler['34.1.2']?.id &&
        !hjemmelenGjelder('34.1.2', u.spor.forhold.gjeldendeKrav, regler)
      )
        return avvis(
          'VARSLINGSPLIKT_GJELDER_IKKE',
          '§ 34.1.2 gjelder bare svikt og andre forhold, ikke kategorien i grunnlaget, så byggherren tar ikke stilling til om varselet kom i tide (KA-46).'
        );
      // MM-U34 punkt 6 og 15: også en påberopelse etter at byggherren har sagt «i tide».
      return null;
    }
    case 'begrunnelse': {
      // OV-U7: datokontrollene for registrert begrunnelse (KA-U36–KA-U39, opphevet av KA-U46) bygges ikke.
      return utdypningKreves ? begrunnelsensTekst(k) : null;
    }
    case 'korrigering':
      return kontrollerKorrigering(k, u);
  }
}
