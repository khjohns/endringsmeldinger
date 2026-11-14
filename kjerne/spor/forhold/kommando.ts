/**
 * Kommandoene i forholdet (#1783): formen på påberopelsen, nyttelastkontrollen,
 * forutsetningene, standpunktene i svaret og skrivingen av kravet. Regelsettet for sporet
 * står i `regler/forhold.ts`.
 */

import { KRAVINNHOLD } from '../../format/format.ts';
import { erKalenderdato, feilI, objekt, tekst } from '../../format/skjema.ts';
import { kalenderdag } from '../../format/leser.ts';
import { norskDato } from '../../frosset/brevdeler.ts';
import { gjelderVarslingsplikten } from '../../frosset/byggeklosser.ts';
import { datoenDetBleSendt, varseletForNyttSvar, type Utledning } from '../../utledning/utled.ts';
import { avvis, type Avvisning, type Krav, type OppgittDatofelt } from '../../typer.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import type { Innhold, Kommando, Kravform, Svarutkast } from '../../kommandoer/kommando.ts';
import type { OppgittDato, Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter } from '../../kommandoer/standpunkter.ts';
import type { Sporsskriving } from '../../kommandoer/skriving.ts';
import { DATOEN_GJELDER, innholdIForholdet, kategori, oppgittDato } from './format.ts';
import { forholdsstandpunkter } from './frysing.ts';
import { sisteDatoopplysning, trekkAvPaaberopelsenErSperret } from './utledning.ts';

/** Feltet og datoen i korrigeringen. Formen har nøyaktig ett av feltene. */
export function korrigertDato(k: Extract<Kommando, { type: 'korrigering' }>): {
  felt: OppgittDatofelt;
  dato: string;
} {
  return k.paalegg_mottatt !== undefined
    ? { felt: 'paalegg_mottatt', dato: k.paalegg_mottatt }
    : { felt: 'klar_over_forholdet', dato: k.klar_over_forholdet! };
}

/**
 * VS-U26: en påberopelse fra appen har datoen kategorien har, som en dato.
 * Formatet binder feltet til kategorien; her kreves det.
 */
function datofeil(innhold: Innhold): string[] {
  const felt = oppgittDato(innhold.hovedkategori, innhold.underkategori);
  if (felt === null) return [];
  const dato = innhold[felt];
  if (dato === undefined)
    return [
      `$.innhold.${felt}: totalentreprenøren må oppgi datoen ${DATOEN_GJELDER[felt]} (VS-U26)`,
    ];
  return erKalenderdato(dato)
    ? []
    : [`$.innhold.${felt}: ${JSON.stringify(dato)} er ikke en dato på formen ÅÅÅÅ-MM-DD`];
}

/** Formen på påberopelsen (`formfeil`, `vedleggI`). */
export const KRAVFORM_I_FORHOLDET = {
  feil: (innhold) => {
    const { properties, required, anyOf } = KRAVINNHOLD.forhold;
    const feil = feilI(innhold, objekt(properties, required, anyOf), '$.innhold');
    return feil.length ? feil : datofeil(innhold as Innhold);
  },
  vedleggIInnholdet: () => [],
  vedleggVedKravet: true,
  varselVedKravet: false,
} satisfies Kravform;

/**
 * KA-U46 punkt 1–3 og KA-U47: avslår byggherren kravet på endringsordre (punkt 32.3 første
 * ledd b), eller påberoper byggherren at varselet etter punkt 32.2 kom for sent, må punktet
 * om forholdet ha en begrunnelse. Punktet om varselet holder også (arbeidsvalg 1 i #1433,
 * 6544660600). Utdypningen for hele svaret står under «Forbehold» og holder ikke.
 */
function begrunnelseIForholdet(s: Svarutkast, krav: Krav, regler: Regelsett): Avvisning | null {
  const v = s.vurderinger;
  const paaberoper = v.grunnlag_varslet_i_tide === false;
  const avslaar = v.resultat === 'avslaatt' && gjelderVarslingsplikten(krav, regler);
  if (!paaberoper && !avslaar) return null;
  const punktene = paaberoper ? ['forhold', '32.2'] : ['forhold'];
  if (punktene.some((p) => s.utdypninger?.[p]?.trim())) return null;
  return avvis(
    'BEGRUNNELSE_MANGLER',
    paaberoper
      ? 'Du gjør gjeldende at varselet etter punkt 32.2 kom for sent, så punktet om forholdet eller punktet om varselet må ha en begrunnelse.'
      : 'Du avslår kravet på endringsordre, så punktet om forholdet må ha en begrunnelse.'
  );
}

/** Beskrivelsen av pålegget i et varsel etter § 32.2 (`kravetsUtdypning`). */
function utdypningIForholdet(
  k: Extract<Kommando, { type: 'krav' }>,
  regler: Regelsett
): Avvisning | null {
  if (k.spor === 'forhold' && gjelderVarslingsplikten(k, regler))
    return avvis(
      'BESKRIVELSE_MANGLER',
      'Varselet etter NS 8407 § 32.2 må beskrive pålegget, så en godkjenning kan si hva endringen går ut på (GR-U15).'
    );
  return null;
}

/**
 * GR-U40 punkt 7 og 9: når forholdet er sendt, står hovedkategorien, underkategorien og,
 * i underkategorien endringsordre, endringsordren. En annen hjemmel eller en annen endringsordre
 * går i en ny sak. Om det er samme forhold, avgjør ikke appen (MM-U12 (opphevet av MM-U50)).
 */
function kategorisperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  if (k.spor !== 'forhold' || !u.spor.forhold.gjeldendeKrav) return null;
  const forrige = innholdIForholdet(u.spor.forhold.gjeldendeKrav);
  if (
    tekst(k.innhold.hovedkategori) !== forrige.hovedkategori ||
    tekst(k.innhold.underkategori) !== forrige.underkategori
  )
    return avvis(
      'ANNEN_HJEMMEL',
      'Påberopelsen er sendt, så en oppdatert påberopelse kan ikke endre forholdet eller gruppen det hører til. Et annet forhold påberopes i en ny sak.'
    );
  if (tekst(k.innhold.endringsordre) !== forrige.endringsordre)
    return avvis(
      'ANNEN_ENDRINGSORDRE',
      `Påberopelsen er sendt, så en oppdatert påberopelse kan ikke endre endringsordren «${forrige.endringsordre}». En annen endringsordre påberopes i en ny sak.`
    );
  return null;
}

/**
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U55): en ny grunnlagsversjon kan ikke
 * endre datoen etter VS-U26, og gjengir TEs siste opplysning. Datoen endres i en korrigering.
 */
function datosperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  if (k.spor !== 'forhold') return null;
  const felt = oppgittDato(k.innhold.hovedkategori, k.innhold.underkategori);
  const siste = felt === null ? null : sisteDatoopplysning(u, felt);
  if (felt === null || siste === null || k.innhold[felt] === siste.dato) return null;
  return avvis(
    'DATOEN_KAN_IKKE_ENDRES',
    `En oppdatert påberopelse kan ikke endre datoen ${DATOEN_GJELDER[felt]}. Totalentreprenørens siste opplysning er ${norskDato(siste.dato)}. Datoen korrigeres i et eget brev.`
  );
}

/** Datoen varslingsplikten løper fra i påberopelsen (VS-U26). */
function oppgittDatoIForholdet(k: Extract<Kommando, { type: 'krav' }>): OppgittDato | null {
  const felt = oppgittDato(k.innhold.hovedkategori, k.innhold.underkategori);
  return felt === null
    ? null
    : { dato: k.innhold[felt], gjelder: DATOEN_GJELDER[felt], av: 'Totalentreprenøren' };
}

/**
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U55): korrigeringen har datoen
 * kategorien har, og endrer TEs siste opplysning (arbeidsvalget i avgrensningen av #1308).
 * Forutsetningene har kontrollert at den viser til den siste opplysningen.
 */
export function kontrollerKorrigering(
  k: Extract<Kommando, { type: 'korrigering' }>,
  u: Utledning
): Avvisning | null {
  const { felt, dato } = korrigertDato(k);
  const { hovedkategori, underkategori } = kategori(u.spor.forhold.gjeldendeKrav);
  const kategoriensFelt = oppgittDato(hovedkategori, underkategori);
  if (felt !== kategoriensFelt)
    return avvis(
      'UGYLDIG_KORRIGERING',
      `For forholdet som er påberopt, oppgir totalentreprenøren datoen ${DATOEN_GJELDER[kategoriensFelt!]}, ikke datoen ${DATOEN_GJELDER[felt]}.`
    );
  return sisteDatoopplysning(u, felt)?.dato === dato
    ? avvis(
        'DATOEN_ER_UENDRET',
        `Totalentreprenøren har alt oppgitt at ${DATOEN_GJELDER[felt]} ${norskDato(dato)}. Korrigeringen må oppgi en annen dato.`
      )
    : null;
}

/**
 * VS-U38, VS-U39: varselet etter § 32.2 sendt utenfor løsningen registreres bare der
 * varslingsplikten gjelder kategorien i påberopelsen, og det kan ikke være sendt etter
 * påberopelsen. Forutsetningene har alt krevd at påberopelsen er sendt.
 */
export function varseletEtter322(sendt: string, u: Utledning, regler: Regelsett): Avvisning | null {
  const [foerste] = u.spor.forhold.krav;
  if (!gjelderVarslingsplikten(u.spor.forhold.gjeldendeKrav, regler))
    return avvis(
      'VARSLINGSPLIKT_GJELDER_IKKE',
      'Varslingsplikten etter punkt 32.2 gjelder ikke forholdet som er påberopt, så det er ikke noe varsel etter punkt 32.2 å registrere (VS-U39).'
    );
  const paaberopelsen = foerste ? datoenDetBleSendt(u, foerste) : null;
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

/** Nyttelastkontrollen i forholdet (`nyttelastkontroll`). */
export const NYTTELAST_I_FORHOLDET = {
  begrunnelse: begrunnelseIForholdet,
  kravsperre: (k, u) => kategorisperre(k, u) ?? datosperre(k, u),
  innsigelse: () => null,
  utdypning: utdypningIForholdet,
  oppgittDatoIKravet: oppgittDatoIForholdet,
} satisfies Sporsnyttelast;

/**
 * VS-U43 punkt 6 og E3: standpunktet om rettidigheten i svaret på grunnlaget gjelder
 * varselet fra `varseletForNyttSvar`. Er det et registrert varsel etter § 32.2, har det ingen
 * brevtekst før #1600 er bygget. Sperren gjelder også et svar uten et slikt standpunkt.
 */
function svaretPaaberoperRegistrertVarsel(u: Utledning, hva: 'Svaret' | 'Revisjonen') {
  const registrert = u.spor.forhold.varsler['32.2'];
  return registrert && varseletForNyttSvar(u, '32.2') === registrert.id
    ? avvis(
        'IKKE_I_FOERSTE_VERSJON',
        `${hva} på forholdet kan ikke sendes ennå, fordi totalentreprenøren har registrert et varsel etter punkt 32.2 sendt utenfor løsningen, og brevet kan ikke vise til det. Brevet kan registreres som dokumentasjon.`
      )
    : null;
}

/**
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U55): TE korrigerer sin siste
 * opplysning om datoen kategorien har, med henvisning til brevet med den. Brevet godtas også i et
 * spor med enighet, når kravene er avgjort og i en sak lukket etter GR-U27, også ved trekk etter
 * GR-U5 (MM-U51), så ingen av dem sperrer.
 */
export function korrigering(gjelder: string, u: Utledning): Avvisning | null {
  const krav = u.spor.forhold.gjeldendeKrav;
  if (!krav)
    return avvis(
      'PAABEROPELSE_IKKE_SENDT',
      'Påberopelsen må være sendt før datoen kan korrigeres.'
    );
  const { hovedkategori, underkategori } = kategori(krav);
  const felt = oppgittDato(hovedkategori, underkategori);
  // Punkt 10: i underkategorien endringsordre oppgir TE ingen slik dato.
  if (felt === null)
    return avvis(
      'INGEN_DATO_I_KATEGORIEN',
      'I en påberopelse av en endringsordre oppgir totalentreprenøren ikke når pålegget ble mottatt eller totalentreprenøren ble klar over forholdet, så det er ingen dato å korrigere.'
    );
  const siste = sisteDatoopplysning(u, felt);
  if (!siste)
    return avvis(
      'UGYLDIG_KORRIGERING',
      `Totalentreprenøren har ikke oppgitt datoen ${DATOEN_GJELDER[felt]}, så det er ingen opplysning å korrigere.`
    );
  return siste.id === gjelder
    ? null
    : avvis(
        'UGYLDIG_KORRIGERING',
        `Korrigeringen må vise til brevet med totalentreprenørens siste opplysning om datoen ${DATOEN_GJELDER[felt]}.`
      );
}

/** KA-U13, OV-U6: en endringsordre sendt fra appen leses ellers som bortfalt (KA-U6). */
function trekkAvPaaberopelsen(u: Utledning): Avvisning | null {
  if (trekkAvPaaberopelsenErSperret(u))
    return avvis(
      'FORHOLD_ER_ENDRINGSORDRE',
      'Byggherren har godkjent forholdet i et svar som er en endringsordre. Påberopelsen kan ikke trekkes, heller ikke etter en oppdatert påberopelse eller et nytt svar.'
    );
  return null;
}

/** GR-U9: frafall er ikke enighet, og løsningen registrerer ikke en aksept av det. */
function akseptAvFrafallet(u: Utledning): Avvisning | null {
  if (u.frafalt)
    return avvis(
      'FRAFALL_KAN_IKKE_GODTAS',
      'Løsningen registrerer ikke en aksept av et frafall etter § 32.3 c. Det er en begrensning i løsningen (GR-U9).'
    );
  return null;
}

/** Forutsetningene i forholdet (`forutsetninger`). */
export const FORUTSETNINGER_I_FORHOLDET = {
  innsigelsenErIkkeBygget: (u, gjelder) =>
    // Det registrerte varselet etter § 32.2 har ingen brevtekst før S-4 i #807 er bygget.
    u.spor.forhold.varsler['32.2']?.id === gjelder
      ? avvis(
          'IKKE_I_FOERSTE_VERSJON',
          'Innsigelsen mot det registrerte varselet etter punkt 32.2 kan ikke sendes ennå. Brevet kan registreres som dokumentasjon.'
        )
      : null,
  svaret: svaretPaaberoperRegistrertVarsel,
  kravet: 'grunnlaget for kravet',
  trekket: trekkAvPaaberopelsen,
  aksepten: akseptAvFrafallet,
  foresporsel: null,
} satisfies Sporsforutsetninger;

/**
 * Standpunktene i svaret på forholdet (`standpunkter`). VS-U43 punkt 6 og 10: påberopelsen gjelder
 * det registrerte varselet etter § 32.2, ellers det første grunnlagskravet, ikke versjonen svaret
 * gjelder. Med et registrert varsel avviser forutsetningene svaret til #1600 er bygget.
 */
export const STANDPUNKTER_I_FORHOLDET: Sporsstandpunkter = (v, _krav, u, nyId) =>
  forholdsstandpunkter(v, varseletForNyttSvar(u, '32.2'), nyId);

/** Skrivingen av påberopelsen (`SKRIVING`): innholdet lagres som det er. */
export const SKRIVING_I_FORHOLDET = {
  kravinnhold: (innhold) => innhold,
} satisfies Sporsskriving;
