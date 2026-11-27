/**
 * Nyttelastkontrollen: referansene i kommandoen og serverens utregning (B-13).
 * Kjøres etter forutsetningene. Serveren regner svaret på nytt og avviser en
 * kommando der klientens verdier er andre. En aksept bærer bare svaret og
 * regelversjonen; innholdet står i brevet (KA-U10 (opphevet av MM-U50)).
 */

import {
  kontrollerKunnskapsdatoen,
  kunnskapsdatoIVarselet,
  NYTTELAST_I_VEDERLAGET,
  vurderingeneISvaretBarePaaVarselet,
  vurderingeneISvaretPaaVarselet,
} from '../spor/vederlag/kommando.ts';
import { svaretsVarsel, type Svaretsvarsel, type VarsleneIKravet } from './standpunkter.ts';
import { UgyldigBeloep } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { ELDRE_SVAR } from './forutsetninger.ts';
import { detSomRettes, type DetSomRettes } from './rettingen.ts';
import { klarOverUtgiftene, norskDato, opplistet, PARTEN, PARTENS } from '../frosset/brevdeler.ts';
import { datoFor, dokumenterI, kalenderdag } from '../format/leser.ts';
import { erKalenderdato } from '../format/skjema.ts';
import {
  BARE_LAGT_TIL,
  erRegistrering,
  kunnskapsdatoIKommandoen,
  type Kommando,
  type Svarutkast,
} from './kommando.ts';
import {
  korrigertDato,
  kontrollerKorrigering,
  NYTTELAST_I_FORHOLDET,
  varseletEtter322,
} from '../spor/forhold/kommando.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { hjemmelenGjelder, iSporet } from '../frosset/byggeklosser.ts';
import { avvikIResultatet, regnUtSvar, utenforOmfanget } from '../frosset/utregning.ts';
import { svaretBlirEndringsordre } from '../frosset/frysing.ts';
import {
  datoenSomGjelder,
  kravSomVarsler,
  kravversjonenPaaDagen,
  rettedeBrev,
  sendtFoerGjeldendeSvar,
  svarkjeden,
  type Utledning,
} from '../utledning/utled.ts';
import { foresporselForFristsvar } from '../spor/frist/utledning.ts';
import { standpunkteneTilVarslene } from '../spor/vederlag/utledning.ts';
import {
  NYTTELAST_I_FRISTEN,
  vurderingeneISvaretPaaFristvarselet,
} from '../spor/frist/kommando.ts';
import { godkjennerDagerIEtLag } from '../spor/frist/format.ts';
import { godkjennerBeloepIEtLag } from '../spor/vederlag/format.ts';
import { ugyldigAkseptfrist, utenAkseptfrist } from '../regler/akseptfrist.ts';
import { sisteDatoopplysning } from '../spor/forhold/utledning.ts';
import {
  avvis,
  VARSELSPOR,
  varseletSendt,
  type Avvisning,
  type Krav,
  type Kravspor,
  type OppgittDatofelt,
  type Part,
  type Spor,
  type Standpunkt,
  type Varselhjemmel,
} from '../typer.ts';
import { DATOEN_GJELDER, oppgittDato, kategori } from '../spor/forhold/format.ts';

/**
 * Standpunktene i et svarutkast med serverens utregning, lest slik brevet lagrer dem.
 * Skrivingen bygger dem én gang per svar, og brevet lagrer de samme (#804).
 */
export type Svarstandpunkter = (
  s: Svarutkast,
  utregning: Record<string, unknown>,
  /** Kravversjonen svaret gjelder, eller varselet som står alene (VS-U79). */
  krav: Krav | Svaretsvarsel | VarsleneIKravet,
  /** Påberopelsen svaret er regnet mot (#342), `null` i forholdet. */
  paaberopelse: Krav | null
) => Standpunkt[];

/** Det som er sporets eget i nyttelastkontrollen (#1783). */
export interface Sporsnyttelast {
  /** Det som hindrer svaret fordi en begrunnelse mangler (KA-U46 punkt 1–3), eller `null`. */
  begrunnelse(s: Svarutkast, krav: Krav, regler: Regelsett): Avvisning | null;
  /**
   * Det i svaret som strider mot partens tidligere svar i sporet, eller `null`. `sendt` er dagen et
   * svar lagt til ble sendt, og `null` for et svar fra løsningen.
   */
  svarsperre(s: Svarutkast, krav: Krav, u: Utledning, sendt: string | null): Avvisning | null;
  /**
   * Det i kravet som strider mot kravversjonene før i sporet, eller `null`. `sendt` er dagen et krav
   * lagt til ble sendt, og `null` for et krav fra løsningen (OV-U118).
   */
  kravsperre(
    k: Extract<Kommando, { type: 'krav' }>,
    u: Utledning,
    sendt: string | null
  ): Avvisning | null;
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
 *
 * `sendt` er dagen et svar lagt til ble sendt, og `null` for et svar fra løsningen. Et svar lagt
 * til kan gjelde en eldre kravversjon, og om den var gjeldende da svaret ble sendt, avgjør
 * `registreringenStrider`. Svaret regnes mot kravversjonen og påberopelsen slik de var den dagen
 * (OV-U98, #2011).
 */
function kontrollerSvar(
  s: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  svarstandpunkter: Svarstandpunkter,
  utdypningKreves: boolean,
  sendt: string | null
): Avvisning | null {
  const sporet = u.spor[s.spor];
  const varselet = svaretsVarsel(u, s, sendt);
  const funnet =
    sendt === null ? sporet.gjeldendeKrav : sporet.krav.find((k) => k.id === s.gjelder);
  const krav = varselet ? null : funnet;
  // VS-U96 punkt 38: svaret bare på varselet gjelder også den gjeldende kravversjonen.
  if ((!varselet || s.bare_varselet) && (!funnet || s.gjelder !== funnet.id))
    return avvis('FEIL_KRAVREFERANSE', 'Svaret må gjelde den gjeldende versjonen av kravet.');
  if (s.bare_varselet && !varselet)
    return avvis(
      'INGEN_VARSEL',
      'Svaret kan gjelde bare varselet når kravet selv er varselet etter punkt 33.4, 34.3.3 eller 34.4.'
    );
  // OV-U103 for en eldre kravversjon. Forutsetningene prøver bare den gjeldende.
  if (
    krav &&
    krav !== sporet.gjeldendeKrav &&
    sporet.svar.some((x) => x.gjelder === krav.id) &&
    !sendtFoerGjeldendeSvar(u, s.spor, krav.id, sendt)
  )
    return avvis(
      'ALLEREDE_SVART',
      'Kravversjonen har alt et svar som ble sendt samme dag eller tidligere.'
    );
  const paaberopelse = s.spor === 'forhold' ? null : kravversjonenPaaDagen(u, 'forhold', sendt);
  if (s.spor !== 'forhold' && !paaberopelse)
    return avvis('PAABEROPELSE_IKKE_SENDT', 'Påberopelsen var ikke sendt da svaret ble sendt.');
  if (s.regelversjon !== regler.versjon)
    return avvis(
      'ANNEN_REGELVERSJON',
      `Svaret er regnet ut med regelversjon ${s.regelversjon}, serveren bruker ${regler.versjon}.`
    );
  if (varselet)
    return kontrollerSvaretPaaVarselet(s, varselet, u, svarstandpunkter, paaberopelse!, sendt);
  if (!krav) throw new Error('Svaret gjelder verken et krav eller et varsel.');
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
        paaberopelse,
        foresporsel: foresporselForFristsvar(u),
        // VS-U80, VS-U81: innsigelsene fra svarene før, som i frysingen (OV-U104).
        staar:
          s.spor === 'vederlag'
            ? standpunkteneTilVarslene(u, sendt, true).filter((x) => !x.iTide)
            : [],
      },
      regler
    );
  } catch (feil) {
    // #550: et beløp som ikke er et tall, er en ugyldig vurdering, ikke en feil på serveren.
    if (feil instanceof UgyldigVurdering || feil instanceof UgyldigBeloep)
      return avvis('UGYLDIG_VURDERING', `Vurderingene kan ikke regnes ut: ${feil.message}.`);
    throw feil;
  }
  const sperre = nyttelastI(s.spor).svarsperre(s, krav, u, sendt);
  if (sperre) return sperre;
  // #520: et felt som ikke gjelder kategorien, avvises av utregningen før dette. Skrivingen
  // registrerer standpunktene og utregningen for brevet her (#814).
  svarstandpunkter(s, server, krav, paaberopelse);
  const avvik = avvikIResultatet(s.spor, s.resultat, server);
  if (avvik.length)
    return avvis(
      'ANNET_RESULTAT',
      `Serveren regner ut ${avvik.map((a) => `${a.sti}=${a.serveren}`).join(', ')}.`
    );
  return utdypningKreves ? nyttelastI(s.spor).begrunnelse(s, krav, regler) : null;
}

/**
 * VS-U79: svaret på et varsel som står alene, regnes mot påberopelsen
 * som et svar på kravet, men har ingen utregning. Vurderingene prøves etter VS-U77 punkt 30 og 31
 * og VS-U87 punkt 32 (`vurderingeneISvaretPaaVarselet`). Om svaret kan gis, også der saken gjelder
 * en endring (OV-U89 punkt 13), prøver forutsetningene (punkt 33, `hindrerSvaretPaaVarselet`).
 */
function kontrollerSvaretPaaVarselet(
  s: Svarutkast,
  varselet: Svaretsvarsel | VarsleneIKravet,
  u: Utledning,
  svarstandpunkter: Svarstandpunkter,
  paaberopelse: Krav,
  sendt: string | null
): Avvisning | null {
  const feil =
    'poster' in varselet
      ? vurderingeneISvaretBarePaaVarselet(
          s,
          varselet.poster,
          u.spor.vederlag.krav.find((k) => k.id === varselet.krav)!,
          u,
          sendt
        )
      : varselet.hjemmel === '33.4'
        ? vurderingeneISvaretPaaFristvarselet(s)
        : vurderingeneISvaretPaaVarselet(s, varselet, u, sendt);
  if (feil) return feil;
  svarstandpunkter(s, {}, varselet, paaberopelse);
  const avvik = avvikIResultatet(s.spor, s.resultat, {});
  return avvik.length
    ? avvis(
        'ANNET_RESULTAT',
        `Serveren regner ut ${avvik.map((a) => `${a.sti}=${a.serveren}`).join(', ')}.`
      )
    : null;
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

/** VS-U58. */
const VARSLER_OM_FORHOLDET = ['32.2', '33.4', '34.1.2', '34.1.3'] as const;
type VarselOmForholdet = (typeof VARSLER_OM_FORHOLDET)[number];
const erVarselOmForholdet = (hjemmel: string): hjemmel is VarselOmForholdet =>
  (VARSLER_OM_FORHOLDET as readonly string[]).includes(hjemmel);

/**
 * Det som hindrer et varsel etter `hjemmel` lagt til med datoen `sendt`, eller `null`: varselet
 * etter § 32.2 før påberopelsen (VS-U38–VS-U40), og et varsel om forholdet ikke før datoen i
 * påberopelsen (VS-U58). Tilbudet av varselet leser det samme (G-1 i BF-49, INV-MM-1).
 */
export function varseletsDato(
  hjemmel: Varselhjemmel,
  sendt: string,
  u: Utledning,
  regler: Regelsett
): Avvisning | null {
  return (
    (hjemmel === '32.2' ? varseletEtter322(sendt, u, regler) : null) ??
    (erVarselOmForholdet(hjemmel) ? varseletFoerGrunnlagsdatoen(hjemmel, sendt, u) : null)
  );
}

/**
 * Datoen TE har oppgitt i grunnlagskravet etter VS-U26 (VS-U86 punkt 1–5), med en korrigering
 * etter MM-U59 punkt 10. `null` når kategorien ikke har en dato, eller datoen ikke kan leses.
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
 * VS-U60 og VS-U66: det egne varselet etter hjemmelen og kravene som kan være det første varselet
 * løsningen kjenner (VS-U86 punkt 6–9, OV-U102). Ulikt `varseletForNyttSvar` gir den begge, og kalleren
 * bruker det tidligste.
 */
function varslerOmForholdet(
  hjemmel: VarselOmForholdet,
  u: Utledning,
  regler: Regelsett
): Pick<Krav, 'id' | 'dokument'>[] {
  const s = u.spor[VARSELSPOR[hjemmel]];
  const krav = hjemmelenGjelder(hjemmel, u.spor.forhold.gjeldendeKrav, regler)
    ? kravSomVarsler(hjemmel, s, () => true)
    : [];
  return [s.varsler[hjemmel], ...krav].filter((v) => v !== undefined);
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
      .map((v) => datoenSomGjelder(u, v))
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

/** Varselet eller kravet en retting gjelder, i meldingen. */
const DET_SOM_RETTES: Record<Spor, string> = {
  forhold: 'påberopelsen av forholdet',
  vederlag: 'kravet om vederlagsjustering',
  frist: 'kravet om fristforlengelse',
};
const detSomRettesHeter = (d: DetSomRettes): string =>
  d.art === 'varsel' ? `varselet etter punkt ${d.hjemmel}` : DET_SOM_RETTES[d.element.spor];

/**
 * D-7 i BF-50: rettingen av datoen avvises når datoen er den som gjelder, når en varseldato for
 * et varsel om forholdet er før datoen i påberopelsen (MM-U63, VS-U58), og når varselet etter
 * § 32.2 da blir senere enn påberopelsen (VS-U38). Arbeidsvalget i D-7:
 * det samme gjelder en kravdato for et krav som er det første varselet løsningen kjenner (VS-U86).
 * Datoen etter brevets dato avvises i `oppgittDatoEtterBrevet`.
 */
function kontrollerRettingen(
  k: Extract<Kommando, { type: 'retting' }>,
  u: Utledning,
  regler: Regelsett
): Avvisning | null {
  const d = detSomRettes(u, k.gjelder);
  // Forutsetningene avviser en retting uten noe å rette (`rettingen`).
  if (!d) return null;
  const ny = kalenderdag(k.dato);
  const gjelder = datoenSomGjelder(u, d.element);
  const hva = detSomRettesHeter(d);
  if (ny === null || gjelder === null)
    return avvis(
      'DATO_KAN_IKKE_LESES',
      `Datoen for ${hva} kan ikke leses, så rettingen kan ikke sammenlignes med den.`
    );
  if (ny === gjelder)
    return avvis(
      'DATOEN_ER_UENDRET',
      `Datoen som gjelder for ${hva}, er alt ${norskDato(ny)}. Rettingen må oppgi en annen dato.`
    );
  if (d.art === 'varsel')
    return erVarselOmForholdet(d.hjemmel)
      ? (varseletFoerGrunnlagsdatoen(d.hjemmel, ny, u) ??
          (d.hjemmel === '32.2' ? varseletEtter322(ny, u, regler) : null))
      : null;
  // VS-U38: varselet etter § 32.2 kan ikke være senere enn påberopelsen, også etter rettingen.
  const varselet = d.element.spor === 'forhold' ? u.spor.forhold.varsler['32.2'] : undefined;
  const varslet = varselet ? datoenSomGjelder(u, varselet) : null;
  if (varslet !== null && ny < varslet)
    return avvis(
      'VARSEL_ETTER_PAABEROPELSEN',
      `Den nye datoen for ${hva}, ${norskDato(ny)}, er før varselet etter punkt 32.2, som er oppgitt sendt ${norskDato(varslet)}. Varselet kan ikke være sendt etter påberopelsen.`
    );
  const grunnlag = grunnlagsdatoen(u);
  if (grunnlag === null || ny >= grunnlag.dag) return null;
  const varsler = VARSLER_OM_FORHOLDET.find((h) =>
    varslerOmForholdet(h, u, regler).some((v) => v.id === d.element.id)
  );
  return varsler
    ? avvis(
        'VARSEL_FOER_GRUNNLAGSDATOEN',
        `Den nye datoen for ${hva}, ${norskDato(ny)}, er før datoen ${DATOEN_GJELDER[grunnlag.felt]}, ${norskDato(grunnlag.dag)}, slik totalentreprenøren har oppgitt den i påberopelsen. Kravet er det første varselet etter punkt ${varsler} løsningen kjenner.`
      )
    : null;
}

export type OppgittDato = {
  dato: unknown;
  gjelder: string;
  av: 'Totalentreprenøren' | 'Byggherren';
};

/**
 * Datoen parten oppgir i kommandoen og det den gjelder: datoen varslingsplikten løper
 * fra i påberopelsen (VS-U26), datoen et varsel etter § 33.4, § 34.1.2 eller § 34.1.3 ble
 * sendt utenfor appen, registrert for seg eller i fristkravet (OV-U5).
 */
function oppgittDatoI(k: Kommando): OppgittDato[] {
  if (k.type === 'varsel')
    return k.varsler.map(({ hjemmel }) => ({
      dato: k.sendt,
      gjelder: varseletSendt(hjemmel),
      av: 'Totalentreprenøren',
    }));
  // OV-U98: kravet, svaret eller aksepten som legges til, er ikke sendt etter dagen det legges til.
  const registrering: OppgittDato[] = erRegistrering(k)
    ? [
        {
          dato: k.sendt,
          gjelder: 'brevet ble sendt',
          av: k.type === 'aksept' || k.type === 'krav' ? 'Totalentreprenøren' : 'Byggherren',
        },
      ]
    : [];
  if (k.type === 'korrigering') {
    const { felt, dato } = korrigertDato(k);
    return [{ dato, gjelder: DATOEN_GJELDER[felt], av: 'Totalentreprenøren' }];
  }
  // Arbeidsvalget i D-7 i BF-50, som U-3 i BF-02A.
  if (k.type === 'retting')
    return [{ dato: k.dato, gjelder: 'varselet eller kravet ble sendt', av: 'Totalentreprenøren' }];
  const iKravet = k.type === 'krav' ? nyttelastI(k.spor).oppgittDatoIKravet(k) : null;
  return [...registrering, ...(iKravet ? [iKravet] : [])];
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
  const kunnskapsdato = kunnskapsdatoEtterBrevet(k, brevetsDato);
  if (kunnskapsdato) return kunnskapsdato;
  for (const oppgitt of oppgittDatoI(k)) {
    // #766: en dato som ikke kan tolkes, kontrolleres ikke her, som når den mangler (KA-U38).
    const dag = typeof oppgitt.dato === 'string' ? kalenderdag(oppgitt.dato) : null;
    if (dag !== null && dag > brevetsDato)
      return avvis(
        'DATO_ETTER_BREVET',
        `${oppgitt.av} har oppgitt at ${oppgitt.gjelder} ${norskDato(dag)}, etter brevets dato ${norskDato(brevetsDato)}.`
      );
  }
  return null;
}

/**
 * VS-U83 (VS-U86 punkt 12a): kunnskapsdatoen etter § 34.1.3 er ikke senere enn datoen brevet med
 * opplysningen er sendt: for et brev fra løsningen brevets dato, og for korrespondanse datoen den
 * som legger den til, oppgir at den ble sendt. Andre datoer i saken sperrer ikke.
 */
function kunnskapsdatoEtterBrevet(k: Kommando, brevetsDato: string): Avvisning | null {
  const oppgitt = kunnskapsdatoIKommandoen(k);
  const dag = oppgitt === undefined ? null : kalenderdag(oppgitt);
  const lagtTil = k.type === 'varsel' || erRegistrering(k);
  const sendt = lagtTil ? kalenderdag(k.sendt) : brevetsDato;
  if (dag === null || sendt === null || dag <= sendt) return null;
  return avvis(
    'DATO_ETTER_BREVET',
    `Totalentreprenøren har oppgitt ${klarOverUtgiftene(dag)}, etter datoen brevet ${lagtTil ? 'ble sendt' : 'sendes'}, ${norskDato(sendt)}.`
  );
}

/** Hvorfor et svar ikke kan ha en akseptfrist (HF-U23 punkt 1), som meldingen sier det. */
const UTEN_AKSEPTFRIST = {
  forholdet: 'Et svar på påberopelsen av forholdet har ingen akseptfrist.',
  avslag:
    'Svaret godkjenner verken beløp eller dager, prinsipalt eller subsidiært, og kan ikke ha en akseptfrist.',
  hele_kravet: 'Svaret godkjenner hele kravet og kan ikke ha en akseptfrist.',
} as const;

/** Svaret godkjenner beløp eller dager i et av lagene, lest gjennom formatfila for sporet. */
const GODKJENNER_I_ET_LAG: Record<Kravspor, (utregning: Record<string, unknown>) => boolean> = {
  vederlag: godkjennerBeloepIEtLag,
  frist: godkjennerDagerIEtLag,
};

/** Det som hindrer akseptfristen etter HF-U23 punkt 2, som meldingen sier det. */
function ugyldigFrist(
  grunn: NonNullable<ReturnType<typeof ugyldigAkseptfrist>>,
  frist: string,
  svardato: string
): string {
  if (grunn === 'finnes_ikke') return `Akseptfristen ${frist} finnes ikke i kalenderen.`;
  const dato = `Akseptfristen ${norskDato(frist)}`;
  if (grunn === 'foer_svaret') return `${dato} er før datoen for svaret, ${norskDato(svardato)}.`;
  return `${dato} er en ${grunn === 'loerdag' ? 'lørdag' : 'helligdag eller høytidsdag'}.`;
}

/**
 * HF-U23 punkt 1 og 2: akseptfristen i hvert svar i brevet, kontrollert mot svaret slik det er
 * frosset (`sammenfall`) og mot brevets dato, en kalenderdag i norsk tid. `svarene` er svarene i
 * formen brevet lagrer dem.
 */
export function akseptfristeneIBrevet(
  svarene: readonly Record<string, unknown>[],
  brevetsDato: string
): Avvisning | null {
  for (const s of svarene) {
    const frist = s.akseptfrist;
    if (typeof frist !== 'string') continue;
    const spor = s.spor as Spor;
    const uten = utenAkseptfrist({
      spor,
      godkjennerNoe:
        spor !== 'forhold' &&
        GODKJENNER_I_ET_LAG[spor]((s.utregning ?? {}) as Record<string, unknown>),
      sammenfall: (s.beslutningsgrunnlag as { sammenfall: boolean }).sammenfall,
    });
    if (uten) return avvis('AKSEPTFRIST_IKKE_TILLATT', UTEN_AKSEPTFRIST[uten]);
    const ugyldig = ugyldigAkseptfrist(frist, brevetsDato);
    if (ugyldig)
      return avvis('AKSEPTFRIST_UGYLDIG_DATO', ugyldigFrist(ugyldig, frist, brevetsDato));
  }
  return null;
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
  if (brev.lagtTilAv !== part)
    return avvis(
      'FEIL_PART',
      `Registreringen er ${PARTENS[brev.lagtTilAv]}, og bare ${PARTEN[brev.lagtTilAv]} kan rette den.`
    );
  if (brev.rettetAv !== null)
    return avvis(
      'REGISTRERINGEN_ER_RETTET',
      // OV-U18: rettingen sier at brevet ikke hører til saken. D-13 i BF-49: et krav, svar, en
      // aksept eller et varsel lagt til retter også.
      [...dokumenterI(u.journal)].some((d) => d.id === brev.rettetAv && d.ikkeISaken)
        ? 'Registreringen er rettet bort fordi brevet ikke hører til saken. Hører det til saken likevel, registreres brevet på nytt.'
        : 'Registreringen er alt rettet. Rett den siste registreringen.'
    );
  return null;
}

/**
 * MM-U47 punkt 2: innlegget viser til ett brev i saken, også et registrert brev. Rettingen som sier
 * at et brev ikke hører til saken, er ikke et brev (OV-U18), og en rettet registrering står bare i
 * historikken (OV-U17, OV-U18), som for vedleggene (`kravetErVarselet`).
 */
function henvisningenIInnlegget(gjelder: string, u: Utledning): Avvisning | null {
  const rettet = rettedeBrev(u.registrerteBrev);
  for (const d of dokumenterI(u.journal))
    if (d.id === gjelder && !d.ikkeISaken && !rettet.has(d.id)) return null;
  return avvis(
    'INGEN_BREV',
    'Innlegget må vise til et brev i saken, eller til den siste registreringen av det.'
  );
}

/**
 * OV-U6, OV-U124, D-11 i BF-49: endringsordren byggherren legger til, er svaret på forholdet når
 * svaret blir en endringsordre etter § 31.3 (`svaretBlirEndringsordre`, som utledningen leser i
 * `erRegistrertEndringsordre`). Avvisningen bruker de eksisterende kodene (#807, 7218847960).
 */
function endringsordren(
  svar: readonly Svarutkast[],
  u: Utledning,
  regler: Regelsett
): Avvisning | null {
  const s = svar.find((x) => x.spor === 'forhold');
  if (!s) return null;
  if (u.registrerteBrev.some((b) => b.dokument === s.gjelder))
    return avvis(
      'FEIL_KRAVREFERANSE',
      'Endringsordren kan ikke legges til som svar på et krav som står som dokumentasjon. Totalentreprenøren må ha sendt kravet fra løsningen eller lagt det til som krav. Brevet kan legges til som dokumentasjon.'
    );
  const krav = u.spor.forhold.krav.find((x) => x.id === s.gjelder);
  if (krav && !svaretBlirEndringsordre(s.vurderinger, kategori(krav), regler))
    return avvis(
      'UGYLDIG_VURDERING',
      'Svaret er ikke en endringsordre etter punkt 31.3: byggherren må godkjenne forholdet uten å påberope preklusjon, og forholdet må være i en underkategori der punkt 32.2 gjelder.'
    );
  return null;
}

/**
 * `utdypningKreves` er usann i forhåndsvisningen: utdypningen endrer ikke den låste
 * teksten, så klienten kan vise teksten før begrunnelsen er skrevet (A1). `sendt` er dagen et
 * brev lagt til ble sendt, og `null` for et brev fra løsningen (OV-U98).
 */
export function nyttelastkontroll(
  k: Kommando,
  part: Part,
  u: Utledning,
  regler: Regelsett,
  svarstandpunkter: Svarstandpunkter,
  sendt: string | null,
  utdypningKreves = true
): Avvisning | null {
  // D-13 i BF-49, OV-U123 punkt 23: et krav, svar, aksept eller varsel lagt til retter
  // dokumentasjonen fra samme side, som en ny registrering som dokumentasjon (OV-U17).
  if ((erRegistrering(k) || k.type === 'varsel') && k.retter !== undefined) {
    const hinder = retting(k.retter, part, u);
    if (hinder) return hinder;
  }
  if ((k.type === 'brev' || k.type === 'revisjon') && k.endringsordre) {
    const hinder = endringsordren([k.svar].flat(), u, regler);
    if (hinder) return hinder;
  }
  switch (k.type) {
    case 'krav': {
      const sperre = nyttelastI(k.spor).kravsperre(k, u, sendt);
      if (sperre) return sperre;
      const utdypning = utdypningKreves ? kravetsUtdypning(k, regler) : null;
      if (utdypning) return utdypning;
      if (k.spor !== 'frist' || !k.varsel) return null;
      // VS-U58.
      const foer = varseletFoerGrunnlagsdatoen('33.4', k.varsel.sendt, u);
      if (foer) return foer;
      const varsel = u.spor.frist.varsler['33.4'];
      // VS-U34: uten varselet i saken skrives det som et eget brev før kravet (`medVarselet` i
      // fristen). Er varselet registrert, kreves bare samme dato (SK-12; arbeidsvalget i #909),
      // og typen, sendemåten og beskrivelsen står i det registrerte brevet.
      if (!varsel) return null;
      const oppgitt = (['korrespondansetype', 'sendemaate', 'beskrivelse'] as const).filter(
        (felt) => k.varsel![felt] !== undefined
      );
      if (oppgitt.length)
        return avvis(
          'VARSEL_REGISTRERT',
          `Varselet etter punkt 33.4 står alt i saken, så kravet kan bare oppgi datoen for det. Fjern ${opplistet(oppgitt.map((f) => BARE_LAGT_TIL[f]))}.`
        );
      const varseletSendt = datoFor(
        varsel,
        'sendt',
        u.opplysninger.map((o) => o.opplysning)
      );
      // SK-12, VS-U15: et varsel uten sendedato, som et varsel sendt fra appen med serverens
      // dato, får ingen dato fra kravet.
      if (varseletSendt === undefined)
        return avvis(
          'VARSEL_REGISTRERT',
          'Varselet er sendt herfra eller registrert uten dato for sendingen, og kravet kan ikke oppgi en.'
        );
      const registrert = kalenderdag(varseletSendt.dato);
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
      // #2451, VS-U96 punkt 33.
      if (
        k.svar.some(
          (s) => k.svar.some((x) => x !== s && x.spor === s.spor) && !svaretsVarsel(u, s, sendt)
        )
      )
        return avvis(
          'FEIL_KRAVREFERANSE',
          'To svar i samme spor i ett brev må gjelde hvert sitt varsel som står alene.'
        );
      for (const s of k.svar) {
        const a = kontrollerSvar(s, u, regler, svarstandpunkter, utdypningKreves, sendt);
        if (a) return a;
      }
      return null;
    case 'revisjon': {
      const sporet = u.spor[k.svar.spor];
      // VS-U77 punkt 33: det nye svaret på et varsel erstatter det forrige på samme varsel.
      // VS-U96 punkt 33 og 38: svarene bare på varselet er én kjede på tvers av kravversjonene.
      const kjeden = svarkjeden({ ...k.svar, bareVarselet: k.svar.bare_varselet === true });
      const forrige = svaretsVarsel(u, k.svar, sendt)
        ? sporet.svarPaaVarsler.filter((x) => svarkjeden(x) === kjeden).at(-1)
        : sporet.gjeldendeSvar;
      if (k.erstatter !== forrige?.id)
        return avvis('FEIL_SVARREFERANSE', 'Svaret er endret eller gjelder et tidligere krav.');
      if (!k.svar.bare_varselet && k.svar.gjelder !== forrige.gjelder)
        return avvis(
          'FEIL_SVARREFERANSE',
          'Revisjonen gjelder en annen versjon av kravet enn svaret den erstatter.'
        );
      return kontrollerSvar(k.svar, u, regler, svarstandpunkter, utdypningKreves, sendt);
    }
    case 'aksept': {
      // KA-U1, KT-U1: aksepten gjelder sporets gjeldende svar. En aksept som legges til, gjelder
      // svaret som var gjeldende da den ble sendt, og det prøver utledningen (OV-U98).
      // OV-U103: også et svar sendt før byggherrens gjeldende svar.
      const svaretFinnes = u.svar[k.svar]?.svar.spor === k.spor;
      if (k.sendt !== undefined ? !svaretFinnes : k.svar !== u.spor[k.spor].gjeldendeSvar?.id)
        return avvis(
          'IKKE_GJELDENDE_SVAR',
          svaretFinnes
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
    case 'registrert_brev':
      // D-12 i BF-49, svaret 27.11 i #807: det var ikke noe skjema å avbryte for motpartens brev.
      if (k.ikke_fylt_ut !== undefined && k.avsender !== undefined && k.avsender !== part)
        return avvis(
          'FEIL_PART',
          'Brevet motparten sendte, legges til som dokumentasjon uten skjemaet for et krav eller svar.'
        );
      return k.retter === undefined ? null : retting(k.retter, part, u);
    case 'ikke_i_saken':
      return k.retter === undefined ? null : retting(k.retter, part, u);
    case 'varsel':
      for (const { hjemmel } of k.varsler) {
        const hinder = varseletsDato(hjemmel, k.sendt, u, regler);
        if (hinder) return hinder;
      }
      return null;
    case 'send_varsel':
      return kunnskapsdatoIVarselet(k, u);
    case 'kunnskapsdato':
      return kontrollerKunnskapsdatoen(k, u);
    case 'trekk':
    case 'foresporsel':
    case 'foresporselssvar':
    case 'ingen_krav':
      return null;
    case 'innlegg':
      return henvisningenIInnlegget(k.gjelder, u);
    case 'korrigering':
      return kontrollerKorrigering(k, u) ?? korrigeringEtterVarslene(k, u, regler);
    case 'retting':
      return kontrollerRettingen(k, u, regler);
  }
}
