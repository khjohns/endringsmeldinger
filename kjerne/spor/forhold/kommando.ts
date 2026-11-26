/**
 * Kommandoene i forholdet (#1783): formen på påberopelsen, nyttelastkontrollen,
 * forutsetningene, standpunktene i svaret og skrivingen av kravet. Regelsettet for sporet
 * står i `regler/forhold.ts`.
 */

import { standpunkterISvaret } from '../../format/leser.ts';
import { virkninger } from '../../frosset/standpunkt.ts';
import { etikett, laget } from '../../frosset/byggeklosser.ts';
import { kontrollerForholdet } from '../../regler/svarkontroll.ts';
import { mangler } from '../../regler/typer.ts';
import { avvisteFelt, forutsetningene } from '../../kommandoer/utkastlag.ts';
import type { Utkastlag } from '../poster/kommando.ts';
import { KRAVINNHOLD } from '../../format/format.ts';
import { erKalenderdato, feilI, objekt, tekst } from '../../format/skjema.ts';
import { foerDagen, kalenderdag } from '../../format/leser.ts';
import { norskDato } from '../../frosset/brevdeler.ts';
import { gjelderVarslingsplikten } from '../../frosset/byggeklosser.ts';
import { BEGRUNNELSESPUNKTENE, begrunnelseskravet } from '../../regler/forhold.ts';
import {
  datoenDetBleSendt,
  paaberopelseFor,
  kravSomVarsler,
  sendtFoerSisteKrav,
  varseletFoerSvaret,
  varseletForNyttSvar,
  type Utledning,
} from '../../utledning/utled.ts';
import { avvis, type Avvisning, type Krav, type OppgittDatofelt } from '../../typer.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import type { Innhold, Kommando, Kravform, Svarutkast } from '../../kommandoer/kommando.ts';
import type { OppgittDato, Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter } from '../../kommandoer/standpunkter.ts';
import type { Sporsskriving } from '../../kommandoer/skriving.ts';
import {
  DATOEN_GJELDER,
  innholdIForholdet,
  innsigelsenIForholdet,
  kategori,
  oppgittDato,
  type ForutsetningIForholdet,
} from './format.ts';
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
    return [`$.innhold.${felt}: totalentreprenøren må oppgi datoen ${DATOEN_GJELDER[felt]}`];
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
  varselVedKravet: false,
} satisfies Kravform;

/**
 * KA-U46 punkt 1–3 og KA-U47: avslår byggherren kravet på endringsordre (punkt 32.3 første
 * ledd b), eller påberoper byggherren at varselet etter punkt 32.2 kom for sent, må punktet
 * om forholdet ha en begrunnelse. Punktet om varselet holder også (arbeidsvalg 1 i #1433,
 * 6544660600). Utdypningen for hele svaret står under «Forbehold» og holder ikke.
 */
function begrunnelseIForholdet(s: Svarutkast, krav: Krav, regler: Regelsett): Avvisning | null {
  const grunn = begrunnelseskravet(s.vurderinger, gjelderVarslingsplikten(krav, regler));
  if (!grunn || BEGRUNNELSESPUNKTENE[grunn].some((p) => s.utdypninger?.[p]?.trim())) return null;
  return avvis(
    'BEGRUNNELSE_MANGLER',
    grunn === 'for_sent'
      ? 'Du gjør gjeldende at varselet etter punkt 32.2 kom for sent, så punktet om forholdet eller punktet om varselet må ha en begrunnelse.'
      : 'Du avslår kravet på endringsordre, så punktet om forholdet må ha en begrunnelse.'
  );
}

/** GR-U15: beskrivelsen av pålegget i et varsel etter § 32.2 (`kravetsUtdypning`). */
function utdypningIForholdet(
  k: Extract<Kommando, { type: 'krav' }>,
  regler: Regelsett
): Avvisning | null {
  if (k.spor === 'forhold' && gjelderVarslingsplikten(k, regler))
    return avvis(
      'BESKRIVELSE_MANGLER',
      'Varselet etter NS 8407 punkt 32.2 må beskrive pålegget, så en godkjenning kan si hva endringen går ut på.'
    );
  return null;
}

/**
 * GR-U40 punkt 7 og 9: når forholdet er sendt, står hovedkategorien, underkategorien og,
 * i underkategorien endringsordre, endringsordren. En annen hjemmel eller en annen endringsordre
 * går i en ny sak. Om det er samme forhold, avgjør ikke appen (MM-U12 (opphevet av MM-U50)).
 */
function kategorisperre(
  k: Extract<Kommando, { type: 'krav' }>,
  u: Utledning,
  sendt: string | null
): Avvisning | null {
  if (k.spor !== 'forhold' || !u.spor.forhold.gjeldendeKrav) return null;
  const forrige = innholdIForholdet(u.spor.forhold.gjeldendeKrav);
  // OV-U121.
  const eldre = sendtFoerSisteKrav(u, 'forhold', sendt);
  const somDokumentasjon =
    'Brevet kan legges til som dokumentasjon eller som varsel etter punkt 32.2, og et annet forhold påberopes i en ny sak.';
  if (
    tekst(k.innhold.hovedkategori) !== forrige.hovedkategori ||
    tekst(k.innhold.underkategori) !== forrige.underkategori
  )
    return avvis(
      'ANNEN_HJEMMEL',
      eldre
        ? `Påberopelsen er sendt før totalentreprenørens siste påberopelse i saken og gjelder et annet forhold eller en annen gruppe. ${somDokumentasjon}`
        : 'Påberopelsen er sendt, så en oppdatert påberopelse kan ikke endre forholdet eller gruppen det hører til. Et annet forhold påberopes i en ny sak.'
    );
  if (tekst(k.innhold.endringsordre) !== forrige.endringsordre)
    return avvis(
      'ANNEN_ENDRINGSORDRE',
      eldre
        ? `Påberopelsen er sendt før totalentreprenørens siste påberopelse i saken og gjelder en annen endringsordre enn «${forrige.endringsordre}». ${somDokumentasjon}`
        : `Påberopelsen er sendt, så en oppdatert påberopelse kan ikke endre endringsordren «${forrige.endringsordre}». Et forslag om å rette betegnelsen sendes som innlegg, og en annen endringsordre påberopes i en ny sak.`
    );
  return null;
}

/**
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U59): en ny grunnlagsversjon kan ikke
 * endre datoen etter VS-U26, og gjengir TEs siste opplysning. Datoen endres i en korrigering.
 * En påberopelse sendt før den siste prøves etter OV-U122.
 */
function datosperre(
  k: Extract<Kommando, { type: 'krav' }>,
  u: Utledning,
  sendt: string | null
): Avvisning | null {
  if (k.spor !== 'forhold') return null;
  const felt = oppgittDato(k.innhold.hovedkategori, k.innhold.underkategori);
  const siste = felt === null ? null : sisteDatoopplysning(u, felt);
  if (felt === null || siste === null) return null;
  if (sendtFoerSisteKrav(u, 'forhold', sendt)) {
    const opplysningen = kalenderdag(siste.dato);
    return opplysningen !== null && foerDagen(sendt, opplysningen)
      ? avvis(
          'OPPLYSNINGEN_ETTER_BREVET',
          `Påberopelsen er oppgitt sendt ${norskDato(sendt!)}, før datoen ${DATOEN_GJELDER[felt]}, ${norskDato(opplysningen)}, slik totalentreprenøren sist har oppgitt den. Korriger datoen i et eget brev før påberopelsen legges til.`
        )
      : null;
  }
  if (k.innhold[felt] === siste.dato) return null;
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
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U59): korrigeringen har datoen
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
  if (!gjelderVarslingsplikten(u.spor.forhold.gjeldendeKrav, regler))
    return avvis(
      'VARSLINGSPLIKT_GJELDER_IKKE',
      'Varslingsplikten etter punkt 32.2 gjelder ikke forholdet som er påberopt, så det er ikke noe varsel etter punkt 32.2 å registrere.'
    );
  // OV-U102: et krav utenfor rekken kan gi datoen påberopelsen først ble sendt.
  const dagen = (k: Pick<Krav, 'id' | 'dokument'>) => datoenDetBleSendt(u, k);
  const krav = kravSomVarsler('32.2', u.spor.forhold, () => true);
  const id = varseletFoerSvaret('32.2', [], krav, () => true, dagen);
  const foerst = krav.find((k) => k.id === id);
  const paaberopelsen = foerst ? dagen(foerst) : null;
  const dag = kalenderdag(sendt);
  if (paaberopelsen === null || dag === null)
    return avvis(
      'DATO_KAN_IKKE_LESES',
      'Datoen for varselet etter punkt 32.2 eller for påberopelsen av forholdet kan ikke leses, så det kan ikke avgjøres om varselet ble sendt før påberopelsen.'
    );
  if (dag > paaberopelsen)
    return avvis(
      'VARSEL_ETTER_PAABEROPELSEN',
      `Varselet etter punkt 32.2 er oppgitt sendt ${norskDato(dag)}, etter påberopelsen av forholdet, som ble sendt ${norskDato(paaberopelsen)}.`
    );
  return null;
}

/** Nyttelastkontrollen i forholdet (`nyttelastkontroll`). */
export const NYTTELAST_I_FORHOLDET = {
  begrunnelse: begrunnelseIForholdet,
  svarsperre: () => null,
  kravsperre: (k, u, sendt) => kategorisperre(k, u, sendt) ?? datosperre(k, u, sendt),
  utdypning: utdypningIForholdet,
  oppgittDatoIKravet: oppgittDatoIForholdet,
} satisfies Sporsnyttelast;

/**
 * VS-U86 punkt 6: standpunktet om rettidigheten i svaret på grunnlaget gjelder
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
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U59): TE korrigerer sin siste
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
  // MM-U59 punkt 10: kategoriene uten dato i `OPPGITT_DATO`, også endringsordren og force majeure.
  if (felt === null)
    return avvis(
      'INGEN_DATO_I_KATEGORIEN',
      'I påberopelsen av dette forholdet oppgir totalentreprenøren ikke når pålegget ble mottatt eller når totalentreprenøren ble klar over forholdet, så det er ingen dato å korrigere.'
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
      'Løsningen registrerer ikke en aksept av et frafall etter punkt 32.3 første ledd c. Det er en begrensning i løsningen.'
    );
  return null;
}

/** Forutsetningene i forholdet (`forutsetninger`). */
export const FORUTSETNINGER_I_FORHOLDET = {
  svaret: svaretPaaberoperRegistrertVarsel,
  kravet: 'påberopelsen av forholdet',
  trekket: trekkAvPaaberopelsen,
  aksepten: akseptAvFrafallet,
  foresporsel: null,
} satisfies Sporsforutsetninger;

/**
 * Standpunktene i svaret på forholdet (`standpunkter`). VS-U86 punkt 6 og 10: påberopelsen gjelder
 * det registrerte varselet etter § 32.2, ellers det første grunnlagskravet, ikke versjonen svaret
 * gjelder. Med et registrert varsel avviser forutsetningene svaret til #1600 er bygget.
 */
export const STANDPUNKTER_I_FORHOLDET: Sporsstandpunkter = (v, _krav, u, nyId) =>
  forholdsstandpunkter(v, varseletForNyttSvar(u, '32.2'), nyId);

/** Skrivingen av påberopelsen (`SKRIVING`): innholdet lagres som det er. */
export const SKRIVING_I_FORHOLDET = {
  kravinnhold: (innhold) => innhold,
} satisfies Sporsskriving;

type Forholdsfelt = 'grunnlag_varslet_i_tide' | 'resultat';
export type LagIForholdet = Utkastlag<ForutsetningIForholdet, Forholdsfelt>;

/** Lagene i svarutkastet regnes av de samme standpunktene og virkningene som brevet (#2181). */
export function lagIForholdet(utkast: Svarutkast, u: Utledning, regler: Regelsett): LagIForholdet {
  const krav = paaberopelseFor(utkast, u);
  if (!krav) throw new Error('Påberopelsen svarutkastet gjelder, finnes ikke.');
  const v = utkast.vurderinger;
  const { hovedkategori, underkategori } = kategori(krav);
  const varslingsplikt = gjelderVarslingsplikten(krav, regler);
  const feil = avvisteFelt(() => kontrollerForholdet(v, hovedkategori, underkategori, regler));
  const feltene = ['grunnlag_varslet_i_tide', 'resultat'] as const;
  // GR-U12, #2279.
  const stilles = (felt: Forholdsfelt) => felt === 'resultat' || varslingsplikt;
  const erUbesvart = (felt: Forholdsfelt) => mangler(v[felt]) && stilles(felt);
  const ubesvart = feltene
    .filter((felt) => feil[felt] && erUbesvart(felt))
    .map((spoersmaal) => ({ spoersmaal }));
  const ugyldig = Object.keys(feil).flatMap((felt) => {
    const spoersmaal = feltene.find((f) => f === felt);
    return spoersmaal && !erUbesvart(spoersmaal) ? [{ spoersmaal }] : [];
  });
  let n = 0;
  const svar = {
    spor: 'forhold' as const,
    utregning: {},
    standpunkter: standpunkterISvaret('forhold', {
      standpunkter: STANDPUNKTER_I_FORHOLDET(
        { ...v, ...(feil.resultat ? { resultat: 'avslaatt' } : {}) },
        krav,
        u,
        () => `utkast-${n++}`
      ),
    }),
  };
  const virket = virkninger(svar, krav, regler, 0, []);
  const flereLag = virket.some((x) => (laget(x.virkning) ?? 0) > 1);
  const forutsetninger = forutsetningene(
    svar.standpunkter,
    virket.map((x) => laget(x.virkning)),
    [],
    innsigelsenIForholdet
  );
  return {
    stilt: feltene.filter(stilles).map((spoersmaal) => ({ spoersmaal })),
    ubesvart,
    ugyldig,
    standpunkter: svar.standpunkter.map((s, i) => {
      const virkning = virket[i]!.virkning;
      const lag = laget(virkning);
      return {
        art: s.art,
        ...(s.art === 'rettidighet' ? { hjemmel: s.hjemmel } : {}),
        besvart: !mangler(v[s.art === 'forhold' ? 'resultat' : 'grunnlag_varslet_i_tide']),
        virkning,
        etikett: flereLag && lag !== null ? etikett(lag) : null,
        forutsetninger: forutsetninger[i]!,
      };
    }),
  };
}
