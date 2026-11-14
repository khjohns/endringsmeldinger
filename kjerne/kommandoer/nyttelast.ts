/**
 * Nyttelastkontrollen: referansene i kommandoen og serverens utregning (B-13).
 * Kjøres etter forutsetningene. Serveren regner svaret på nytt og avviser en
 * kommando der klientens verdier er andre. En aksept bærer bare svaret og
 * regelversjonen; innholdet står i brevet (KA-U10 (opphevet av MM-U50)).
 */

import { NYTTELAST_I_VEDERLAGET } from '../spor/vederlag/kommando.ts';
import { UgyldigBeloep } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { ELDRE_SVAR } from './forutsetninger.ts';
import { norskDato, PARTEN } from '../frosset/brevdeler.ts';
import { datoFor, kalenderdag } from '../format/leser.ts';
import { erKalenderdato } from '../format/skjema.ts';
import type { Kommando, Svarutkast } from './kommando.ts';
import {
  korrigertDato,
  kontrollerKorrigering,
  NYTTELAST_I_FORHOLDET,
  varseletEtter322,
} from '../spor/forhold/kommando.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { gjelderVarslingsplikten, hjemmelenGjelder, iSporet } from '../frosset/byggeklosser.ts';
import { avvikIResultatet, regnUtSvar, utenforOmfanget } from '../frosset/utregning.ts';
import { datoenDetBleSendt, kravSomVarsler, type Utledning } from '../utledning/utled.ts';
import { foresporselForFristsvar } from '../spor/frist/utledning.ts';
import { NYTTELAST_I_FRISTEN } from '../spor/frist/kommando.ts';
import { sisteDatoopplysning } from '../spor/forhold/utledning.ts';
import {
  avvis,
  SPOR,
  VARSELSPOR,
  varseletSendt,
  type Avvisning,
  type Krav,
  type OppgittDatofelt,
  type Part,
  type Spor,
  type Standpunkt,
} from '../typer.ts';
import { DATOEN_GJELDER, oppgittDato, kategori } from '../spor/forhold/format.ts';

/**
 * Standpunktene i et svarutkast med serverens utregning, lest slik brevet lagrer dem.
 * Skrivingen bygger dem én gang per svar, og brevet lagrer de samme (#804).
 */
export type Svarstandpunkter = (s: Svarutkast, utregning: Record<string, unknown>) => Standpunkt[];

/** Det som er sporets eget i nyttelastkontrollen (#1783). */
export interface Sporsnyttelast {
  /** Det som hindrer svaret fordi en begrunnelse mangler (KA-U46 punkt 1–3), eller `null`. */
  begrunnelse(s: Svarutkast, krav: Krav, regler: Regelsett): Avvisning | null;
  /** Det i kravet som strider mot kravversjonene før i sporet, eller `null`. */
  kravsperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null;
  /** Det som hindrer en innsigelse mot `gjelder` i sporet, eller `null`. */
  innsigelse(gjelder: string, u: Utledning, regler: Regelsett): Avvisning | null;
  /** Utdypningen kravet i sporet må ha under den låste teksten (`kravetsUtdypning`), eller `null`. */
  utdypning(k: Extract<Kommando, { type: 'krav' }>, regler: Regelsett): Avvisning | null;
  /** Datoen TE oppgir i kravet i sporet og det den gjelder (`oppgittDatoI`), eller `null`. */
  oppgittDatoIKravet(k: Extract<Kommando, { type: 'krav' }>): OppgittDato | null;
}

/** Nyttelastkontrollen i hvert spor. */
const NYTTELAST: Record<Spor, Sporsnyttelast> = {
  forhold: NYTTELAST_I_FORHOLDET,
  vederlag: NYTTELAST_I_VEDERLAGET,
  frist: NYTTELAST_I_FRISTEN,
};

/** Nyttelastkontrollen i sporet (`iSporet`). */
const nyttelastI = (spor: Spor): Sporsnyttelast => iSporet(NYTTELAST, spor);

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
  const avvik = avvikIResultatet(s.spor, s.resultat, server);
  if (avvik.length)
    return avvis(
      'ANNET_RESULTAT',
      `Serveren regner ut ${avvik.map((a) => `${a.sti}=${a.serveren}`).join(', ')}.`
    );
  return utdypningKreves ? nyttelastI(s.spor).begrunnelse(s, krav, regler) : null;
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
  return nyttelastI(k.spor).utdypning(k, regler);
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

/** VS-U58. */
const VARSLER_OM_FORHOLDET = ['32.2', '33.4', '34.1.2', '34.1.3'] as const;
type VarselOmForholdet = (typeof VARSLER_OM_FORHOLDET)[number];
const erVarselOmForholdet = (hjemmel: string): hjemmel is VarselOmForholdet =>
  (VARSLER_OM_FORHOLDET as readonly string[]).includes(hjemmel);

/**
 * Datoen TE har oppgitt i grunnlagskravet etter VS-U26 (VS-U43 punkt 1–5), med en korrigering
 * etter MM-U55 punkt 10. `null` når kategorien ikke har en dato, eller datoen ikke kan leses.
 */
function grunnlagsdatoen(u: Utledning): { felt: OppgittDatofelt; dag: string } | null {
  const { hovedkategori, underkategori } = kategori(u.spor.forhold.gjeldendeKrav);
  const felt = oppgittDato(hovedkategori, underkategori);
  const siste = felt === null ? null : sisteDatoopplysning(u, felt);
  const dag = siste === null ? null : kalenderdag(siste.dato);
  return felt === null || dag === null ? null : { felt, dag };
}

/**
 * VS-U58: et varsel om forholdet er ikke oppgitt sendt før datoen i grunnlagskravet. Samme dag
 * godtas. Mangler en av datoene, eller kan den ikke leses, kontrolleres ingenting.
 */
function varseletFoerGrunnlagsdatoen(
  hjemmel: VarselOmForholdet,
  sendt: unknown,
  u: Utledning
): Avvisning | null {
  const grunnlag = grunnlagsdatoen(u);
  const dag = typeof sendt === 'string' ? kalenderdag(sendt) : null;
  if (grunnlag === null || dag === null || dag >= grunnlag.dag) return null;
  return avvis(
    'VARSEL_FOER_GRUNNLAGSDATOEN',
    `Varselet etter punkt ${hjemmel} er oppgitt sendt ${norskDato(dag)}, før datoen ${DATOEN_GJELDER[grunnlag.felt]}, ${norskDato(grunnlag.dag)}, slik totalentreprenøren har oppgitt den i påberopelsen.`
  );
}

/**
 * VS-U60 og VS-U66: det egne varselet etter hjemmelen og kravet som er det første varselet
 * løsningen kjenner (VS-U43 punkt 6–9). Ulikt `varseletForNyttSvar` gir den begge, og kalleren
 * bruker det tidligste.
 */
function varslerOmForholdet(
  hjemmel: VarselOmForholdet,
  u: Utledning,
  regler: Regelsett
): Pick<Krav, 'id' | 'dokument'>[] {
  const s = u.spor[VARSELSPOR[hjemmel]];
  const kravet = hjemmelenGjelder(hjemmel, u.spor.forhold.gjeldendeKrav, regler)
    ? kravSomVarsler(hjemmel, s.krav)[0]
    : undefined;
  return [s.varsler[hjemmel], kravet].filter((v) => v !== undefined);
}

/** VS-U59, VS-U60 og VS-U66: det tidligste varselet om forholdet etter hver hjemmel. */
function korrigeringEtterVarslene(
  k: Extract<Kommando, { type: 'korrigering' }>,
  u: Utledning,
  regler: Regelsett
): Avvisning | null {
  const { felt, dato } = korrigertDato(k);
  const ny = kalenderdag(dato);
  if (ny === null) return null;
  for (const hjemmel of VARSLER_OM_FORHOLDET) {
    const [sendt = null] = varslerOmForholdet(hjemmel, u, regler)
      .map((v) => datoenDetBleSendt(u, v))
      .filter((d) => d !== null)
      .sort();
    if (sendt !== null && sendt < ny)
      return avvis(
        'VARSEL_FOER_GRUNNLAGSDATOEN',
        `Korrigeringen oppgir at ${DATOEN_GJELDER[felt]} ${norskDato(ny)}, etter at varselet etter punkt ${hjemmel} ble sendt ${norskDato(sendt)}.`
      );
  }
  return null;
}

export type OppgittDato = {
  dato: unknown;
  gjelder: string;
  av: 'Totalentreprenøren' | 'Byggherren';
};

/**
 * Datoen parten oppgir i kommandoen og det den gjelder: datoen varslingsplikten løper
 * fra i påberopelsen (VS-U26), datoen et varsel etter § 33.4, § 34.1.2 eller § 34.1.3 ble
 * sendt utenfor appen, registrert for seg eller i fristkravet (OV-U5), og datoen
 * byggherrens registrerte begrunnelse ble sendt (KA-U35 (opphevet av KA-U46)).
 */
function oppgittDatoI(k: Kommando): OppgittDato | null {
  if (k.type === 'varsel')
    return { dato: k.sendt, gjelder: varseletSendt(k.hjemmel), av: 'Totalentreprenøren' };
  if (k.type === 'begrunnelse')
    return k.sendt === undefined
      ? null
      : { dato: k.sendt, gjelder: 'brevet med begrunnelsen ble sendt', av: 'Byggherren' };
  if (k.type === 'korrigering') {
    const { felt, dato } = korrigertDato(k);
    return { dato, gjelder: DATOEN_GJELDER[felt], av: 'Totalentreprenøren' };
  }
  return k.type === 'krav' ? nyttelastI(k.spor).oppgittDatoIKravet(k) : null;
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
    return avvis('FEIL_PART', `Bare ${PARTEN[brev.avsender]} kan rette sin egen registrering.`);
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
      const sperre = nyttelastI(k.spor).kravsperre(k, u);
      if (sperre) return sperre;
      const utdypning = utdypningKreves ? kravetsUtdypning(k, regler) : null;
      if (utdypning) return utdypning;
      if (k.spor !== 'frist' || !k.varsel) return null;
      // VS-U58.
      const foer = varseletFoerGrunnlagsdatoen('33.4', k.varsel.sendt, u);
      if (foer) return foer;
      const varsel = u.spor.frist.varsler['33.4'];
      // OV-U5: kravet registrerer varselet, og brevet med det ligger ved. Er varselet
      // registrert, kreves bare samme dato (SK-12; arbeidsvalget i #909).
      if (!varsel)
        return k.varsel.dokumentasjon
          ? null
          : avvis(
              'VEDLEGG_MANGLER',
              'Kravet oppgir datoen varselet etter punkt 33.4 ble sendt, men brevet med varselet ligger ikke ved.'
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
          'Varselet er sendt herfra eller registrert uten dato for sendingen, og kravet kan ikke oppgi en.'
        );
      const registrert = kalenderdag(sendt.dato);
      if (registrert === null)
        return avvis(
          'VARSEL_REGISTRERT',
          'Datoen varselet er registrert med, kan ikke leses som en dato, så kravet kan ikke kontrolleres mot den.'
        );
      // SK-12: et registrert varsel beholder datoen det fikk første gang (rad KA-19).
      return registrert === kalenderdag(k.varsel.sendt)
        ? null
        : avvis(
            'VARSEL_REGISTRERT',
            'Varselet er registrert med en annen dato og kan ikke flyttes.'
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
            'Varslingsplikten etter punkt 32.2 gjelder ikke forholdet som er påberopt, så punkt 32.3 annet ledd gjelder heller ikke.'
          );
    }
    case 'registrert_brev':
    case 'ikke_i_saken':
      return k.retter === undefined ? null : retting(k.retter, part, u);
    case 'varsel':
      return (
        (k.hjemmel === '32.2' ? varseletEtter322(k.sendt, u, regler) : null) ??
        (erVarselOmForholdet(k.hjemmel) ? varseletFoerGrunnlagsdatoen(k.hjemmel, k.sendt, u) : null)
      );
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
              'Bare totalentreprenørens begrunnelse etter punkt 33.6.2 annet ledd bokstav b kan påstås ikke å være et svar etter annet ledd.'
            );
      for (const spor of SPOR) {
        const hinder = nyttelastI(spor).innsigelse(k.gjelder, u, regler);
        if (hinder) return hinder;
      }
      // MM-U34 punkt 6 og 15: også en påberopelse etter at byggherren har sagt «i tide».
      return null;
    }
    case 'begrunnelse': {
      // OV-U7: datokontrollene for registrert begrunnelse (KA-U36–KA-U39, opphevet av KA-U46) bygges ikke.
      return utdypningKreves ? begrunnelsensTekst(k) : null;
    }
    case 'korrigering':
      return kontrollerKorrigering(k, u) ?? korrigeringEtterVarslene(k, u, regler);
  }
}
