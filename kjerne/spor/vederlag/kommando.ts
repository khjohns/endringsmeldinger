/**
 * Kommandoene i vederlaget (#1783): standpunktene i svaret, slik brevet lagrer dem
 * (`STANDPUNKTER_I_VEDERLAGET`), og lagene i et vederlagssvar byggherren ennå fyller ut
 * (#1400), så skjemaet kan vise hvilke innsigelser et subsidiært spørsmål bygger på, uten å
 * avgjøre det selv. Lagene regnes som brevet ville regnet dem med standpunktene som er
 * besvart (OV-U32, OV-U33, arbeidsvalget S1-A og S2-A i #1400, 30.10).
 */

import { HJEMMEL } from '../../format/format.ts';
import {
  beregningsregelLag,
  kravpostvurderinger,
  kontrollerProduktivitetsposten,
  PRODUKTIVITETSFELT,
  svaretFraVurderingene,
  vederlagsposter,
  type Kravpostvurdering,
} from './frysing.ts';
import { kategori } from '../forhold/format.ts';
import { omtalen } from '../../frosset/brevdeler.ts';
import { innholdetIDokumentet, innholdetIVedleggene } from '../../kommandoer/vedlegg.ts';
import {
  kontroller as kontrollerVederlaget,
  kontrollerOppgivelsenEtter344,
  kontrollerOppgjoersformen,
  kontrollerVarseletForVederlag,
  ubesvartIKravposten,
  ubesvarteSpoersmaal,
  type UbesvartIVederlaget,
  type Vederlagssvar,
} from '../../regler/vederlag.ts';
import { hjemmelenGjelder, laget, type Svarvurdering } from '../../frosset/byggeklosser.ts';
import {
  denAndreRegelen,
  justerteEnhetspriser,
  kravposterI,
  krevdRigg,
  OPPGJOERSHJEMMEL,
  vederlagsinnhold,
} from './format.ts';
import { erObjekt, feilI, objekt } from '../../format/skjema.ts';
import { brukteBetegnelser, nesteBetegnelse } from '../poster/utledning.ts';
import {
  kravposteneStrider,
  saerskiltStrider,
  kravpostvarseletStrider,
  kravpostvarslene,
  varselhjemmel,
} from './utledning.ts';
import { beloep, BroekdelAvOere, heleOere, tilTall } from '../../regler/beloep.ts';
import type { Subsidiaergrunn } from '../../regler/forhold.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import { standpunkterISvaret } from '../../format/leser.ts';
import {
  avvis,
  erKravpostvarselhjemmel,
  type Avvisning,
  type Dokument,
  type Domenehendelse,
  type Hjemmel,
  type Journalrad,
  type Krav,
  type Kravpost,
  type Kravpostvarselet,
  type Kravpostvarselhjemmel,
  type Standpunkt,
} from '../../typer.ts';
import {
  datoenDetBleSendt,
  paaberopelseFor,
  varseletForNyttSvar,
  type Utledning,
} from '../../utledning/utled.ts';
import { dokumenterI, erRegistrert, foerDagen } from '../../format/leser.ts';
import type { Innhold, Kommando, Kravform, Svarutkast } from '../../kommandoer/kommando.ts';
import type { Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type {
  Kontekst,
  LestSak,
  Sakssperre,
  Skrivesteg,
  Sporsskriving,
  Utfall,
} from '../../kommandoer/skriving.ts';
import type { Utkastlag } from '../poster/kommando.ts';
import { avvisteFelt, lageneIUtkastet, utenom } from '../../kommandoer/utkastlag.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter } from '../../kommandoer/standpunkter.ts';

type Data = Record<string, unknown>;

/** Standpunktene i vederlaget, i rekkefølgen brevet setter dem (`standpunkter`). */
export const STANDPUNKTER_I_VEDERLAGET: Sporsstandpunkter = (v, krav, u, nyId) => {
  const ut: Data[] = [];
  // VS-U20, OV-U5, HF-U1: varselet før svaret, som i fristen.
  if (typeof v.hovedkrav_varslet_i_tide === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varseletForNyttSvar(u, '34.1.2'),
      hjemmel: HJEMMEL.vederlag,
      i_tide: v.hovedkrav_varslet_i_tide,
    });
  // OV-U26, OV-U28, KA-U57: oppgjørsformen og beløpet for kravposten, begrensningen etter
  // § 34.1.3 og posten etter annet ledd, hver for seg. Beløpet etter begrensningen er det
  // byggherren oppgir (VS-U5).
  for (const post of vederlagsposter(v, krav)) {
    if ('gjelder' in post) ut.push(...kravpoststandpunkter(post.gjelder, post.svar, krav, nyId));
    if ('saerskilt' in post && typeof v.produktivitet_varslet_i_tide === 'boolean')
      ut.push({
        id: nyId(),
        art: 'rettidighet',
        gjelder: varseletForNyttSvar(u, '34.1.3'),
        hjemmel: '34.1.3',
        i_tide: v.produktivitet_varslet_i_tide,
        ...(v.produktivitet_varslet_i_tide
          ? {}
          : { begrenset_beloep: tilTall(beloep(v.produktivitet_begrenset_beloep as number)!) }),
      });
    // KA-U72: uten aksept av tilbudet står standpunktet til beløpet uten beløp.
    ut.push({
      id: nyId(),
      art: 'beloep',
      ...(post.godkjent === null ? {} : { beloep: post.godkjent }),
      ...('gjelder' in post ? { gjelder: post.gjelder } : { saerskilt: post.saerskilt }),
    });
  }
  return ut;
};

/**
 * Standpunktene for én kravpost foran beløpet: oppgjørsformen med kravet om tilbud (KA-U69,
 * KA-U71), varselet etter § 34.3.3 eller § 34.4 (KA-U64) og justeringen (KA-U68).
 */
function kravpoststandpunkter(
  gjelder: string,
  svar: Kravpostvurdering,
  krav: Krav,
  nyId: () => string
): Data[] {
  const kravpost = kravposterI(krav).find((p) => p.id === gjelder)!;
  const ut: Data[] = [];
  if (typeof svar.aksepterer === 'boolean')
    ut.push({
      id: nyId(),
      art: 'oppgjoersform',
      gjelder,
      hjemmel: OPPGJOERSHJEMMEL[kravpost.oppgjoersform],
      aksepterer: svar.aksepterer,
      ...(svar.oensket_oppgjoersform != null
        ? { oensket_oppgjoersform: svar.oensket_oppgjoersform }
        : {}),
      ...(svar.krever_tilbud === true ? { krever_tilbud: true } : {}),
    });
  const hjemmel = varselhjemmel(kravpost);
  if (hjemmel && typeof svar.varslet_i_tide === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder,
      hjemmel,
      i_tide: svar.varslet_i_tide,
    });
  if (typeof svar.godtar_justering === 'boolean')
    ut.push({
      id: nyId(),
      art: 'justering',
      gjelder,
      hjemmel: '34.3.2',
      godtar: svar.godtar_justering,
    });
  return ut;
}

/** OV-U58: beløpene i kravet, også anslag og overslag, i hele øre. Formatet har allerede kontrollert at de er tall. */
function oerefeil(innhold: Innhold): string[] {
  const saerskilt = (innhold.saerskilt ?? {}) as Record<string, { beloep?: unknown }>;
  const poster = (innhold.kravposter ?? []) as Record<string, unknown>[];
  const beloepene: [string, unknown][] = [
    ...poster.flatMap((p, i) =>
      (['beloep', 'anslag', 'kostnadsoverslag'] as const).map((f): [string, unknown] => [
        `$.innhold.kravposter[${i}].${f}`,
        p[f],
      ])
    ),
    ['$.innhold.saerskilt.produktivitet.beloep', saerskilt.produktivitet?.beloep],
  ];
  return beloepene.flatMap(([sti, verdi]) => {
    if (typeof verdi !== 'number') return [];
    try {
      heleOere(verdi);
      return [];
    } catch (e) {
      if (!(e instanceof BroekdelAvOere)) throw e;
      return [
        `${sti}: ${verdi} har brøkdeler av øre; beløpet oppgis i kroner med høyst to desimaler`,
      ];
    }
  });
}

/** Kravet har posten for rigg og drift i forlenget byggetid, som formatet ikke har ennå (#1775). */
const harRiggOgDrift = (innhold: unknown): boolean => {
  const saerskilt: unknown = erObjekt(innhold) ? (innhold as Innhold).saerskilt : undefined;
  return erObjekt(saerskilt) && Object.hasOwn(saerskilt, 'rigg_og_drift');
};

/** Feilene i innholdet i vederlagskravet (`formfeil`). */
function kravfeil(innhold: unknown): string[] {
  const { properties, required, anyOf } = vederlagsinnhold(false);
  const rigg = harRiggOgDrift(innhold);
  const feil = rigg
    ? [
        '$.innhold.saerskilt.rigg_og_drift: posten for rigg og drift i forlenget byggetid er ikke bygget ennå, så kravet kan ikke sendes med den',
      ]
    : feilI(innhold, objekt(properties, required, anyOf), '$.innhold');
  if (!feil.length) feil.push(...oerefeil(innhold as Innhold));
  return feil;
}

/** Dokumentene kravskjemaet legger til som varsel for en kravpost (VS-U51, VS-U53, `vedleggI`). */
const vedleggIKravpostene = (innhold: Innhold): string[] =>
  ((innhold.kravposter ?? []) as { varsel?: unknown }[]).flatMap((p) =>
    typeof p.varsel === 'object' && p.varsel !== null
      ? ((p.varsel as { dokumentasjon?: string[] }).dokumentasjon ?? [])
      : []
  );

/** Formen på vederlagskravet (`formfeil`, `vedleggI`). */
export const KRAVFORM_I_VEDERLAGET = {
  feil: kravfeil,
  vedleggIInnholdet: vedleggIKravpostene,
  varselVedKravet: false,
} satisfies Kravform;

/**
 * KA-U56 og KA-U75: kravpostene mot de tidligere kravversjonene, KA-U83: den særskilte
 * vederlagsjusteringen mot forrige versjon, og VS-U50: varselet for posten.
 */
function kravpostsperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  if (k.spor !== 'vederlag') return null;
  const strid =
    kravposteneStrider(k.innhold, u.spor.vederlag.krav, false) ??
    saerskiltStrider({ innhold: k.innhold }, u.spor.vederlag.krav);
  if (strid) return avvis('KRAVPOSTENE', `Kravversjonen ${strid}.`);
  const varselet = kravpostvarseletStrider(
    { innhold: k.innhold },
    u.spor.vederlag.krav,
    u.spor.vederlag.kravpostvarsler
  );
  return varselet ? avvis('KRAVPOSTVARSELET', `I kravversjonen ${varselet}.`) : null;
}

/** Det som hindrer innsigelsen mot varselet etter § 34.1.2 (`nyttelastkontroll`). */
function innsigelseMotVarselet(gjelder: string, u: Utledning, regler: Regelsett): Avvisning | null {
  // OV-U15, KA-46: der TE krever endring, tar byggherren ikke stilling
  // til rettidigheten etter § 34.1.2, så innsigelsen mot varselet avvises som vurderingen.
  if (
    gjelder === u.spor.vederlag.varsler['34.1.2']?.id &&
    !hjemmelenGjelder('34.1.2', u.spor.forhold.gjeldendeKrav, regler)
  )
    return avvis(
      'VARSLINGSPLIKT_GJELDER_IKKE',
      'Punkt 34.1.2 gjelder bare svikt og andre forhold, ikke forholdet som er påberopt, så byggherren tar ikke stilling til om varselet kom i tide.'
    );
  return null;
}

/** Byggherrens siste standpunkt til varselet for en kravpost i svarene på vederlaget. */
export interface StandpunktTilVarselet {
  gjelder: string;
  hjemmel: Kravpostvarselhjemmel;
  iTide: boolean;
  /** Brevet standpunktet står i. */
  dokument: string;
}

/**
 * VS-U77 punkt 8–12, 30 og 31: byggherrens siste standpunkt til varselet etter § 34.3.3 eller
 * § 34.4 for hver kravpost i svarene på vederlaget. Et svar som ikke sier noe om varselet, endrer
 * ikke standpunktet: en innsigelse står (punkt 9 og 12), og et «i tide» etter § 34.3.3 står mot
 * senere kravversjoner (punkt 8). Svarene leses i rekkefølgen de ble sendt, også et svar lagt til
 * utenfor rekken, som har samme virkning for påberopelsen (punkt 12, OV-U103, OV-U105). Er to
 * standpunkter fra samme dag, og minst ett av svarene er lagt til, er rekkefølgen ukjent
 * (OV-U104), og innsigelsen kan stå. Et svar lagt til, sendt på dagen `sendt`, leser bare
 * svarene sendt før den dagen (OV-U98, OV-U104).
 */
export function standpunkteneTilVarslene(
  u: Utledning,
  sendt: string | null
): StandpunktTilVarselet[] {
  const { svar, svarUtenforRekken } = u.spor.vederlag;
  const lagtTil = new Set(
    [...dokumenterI(u.journal)].filter((d) => erRegistrert(d.opplysninger)).map((d) => d.id)
  );
  const svarene = [...svar, ...svarUtenforRekken]
    .map((s) => ({ s, dag: datoenDetBleSendt(u, s) ?? '', lagtTil: lagtTil.has(s.dokument) }))
    .filter(({ dag }) => sendt === null || foerDagen(dag, sendt))
    .sort((a, b) => (a.dag < b.dag ? -1 : a.dag > b.dag ? 1 : 0));
  const siste = new Map<string, StandpunktTilVarselet & { dag: string; lagtTil: boolean }>();
  for (const { s, dag, lagtTil } of svarene)
    for (const p of s.standpunkter) {
      if (p.art !== 'rettidighet' || !erKravpostvarselhjemmel(p.hjemmel)) continue;
      const noekkel = `${p.hjemmel} ${p.gjelder}`;
      const foer = siste.get(noekkel);
      if (foer && !foer.iTide && foer.dag === dag && (foer.lagtTil || lagtTil)) continue;
      siste.set(noekkel, {
        gjelder: p.gjelder,
        hjemmel: p.hjemmel,
        iTide: p.iTide,
        dokument: s.dokument,
        dag,
        lagtTil,
      });
    }
  return [...siste.values()].map(({ gjelder, hjemmel, iTide, dokument }) => ({
    gjelder,
    hjemmel,
    iTide,
    dokument,
  }));
}

/** VS-U63: kravpostene der byggherrens innsigelse mot varselet etter § 34.4 står. */
const innsigelseneEtter344 = (u: Utledning, sendt: string | null): Set<string> =>
  new Set(
    standpunkteneTilVarslene(u, sendt).flatMap((x) =>
      x.hjemmel === '34.4' && !x.iTide ? [x.gjelder] : []
    )
  );

/** Det i svaret som strider mot byggherrens tidligere svar i vederlaget (`svarsperre`). */
function oppgivelseUtenInnsigelse(
  s: Svarutkast,
  krav: Krav,
  u: Utledning,
  sendt: string | null
): Avvisning | null {
  const staar = innsigelseneEtter344(u, sendt);
  const feil = avvisteFelt(() => {
    for (const { post, svar } of kravpostvurderinger(s.vurderinger, krav))
      kontrollerOppgivelsenEtter344(post.betegnelse, svar, post, staar.has(post.id));
  });
  const grunner = Object.entries(feil).map(([felt, grunn]) => `${felt}: ${grunn}`);
  return grunner.length
    ? avvis('UGYLDIG_VURDERING', `Vurderingene kan ikke godtas: ${grunner.join('; ')}.`)
    : null;
}

/** Nyttelastkontrollen i vederlaget (`nyttelastkontroll`). */
export const NYTTELAST_I_VEDERLAGET = {
  begrunnelse: () => null,
  svarsperre: oppgivelseUtenInnsigelse,
  kravsperre: kravpostsperre,
  innsigelse: innsigelseMotVarselet,
  utdypning: () => null,
  oppgittDatoIKravet: () => null,
} satisfies Sporsnyttelast;

/**
 * Kravpostene slik de lagres: en ny kravpost får `id` fra serveren og neste betegnelse i
 * sporet, og en kravpost fra en tidligere versjon beholder sin, også etter et trekk (KA-U53, KA-U75,
 * arbeidsvalget 07.11 i domenetabellen).
 */
function medKravposter(
  innhold: Record<string, unknown>,
  u: Utledning,
  nyId: () => string
): Record<string, unknown> {
  if (!innhold.kravposter) return innhold;
  const tidligere = u.spor.vederlag.krav;
  const betegnelsen = new Map(
    tidligere.flatMap((k) => kravposterI(k)).map((p) => [p.id, p.betegnelse])
  );
  const brukte = brukteBetegnelser(tidligere.map(kravposterI));
  const kravposter = (innhold.kravposter as Record<string, unknown>[]).map((p) => {
    if (typeof p.id === 'string') return { ...p, betegnelse: betegnelsen.get(p.id)! };
    const betegnelse = nesteBetegnelse(brukte);
    brukte.add(betegnelse);
    return { id: nyId(), betegnelse, ...p };
  });
  return { ...innhold, kravposter };
}

/** Skrivingen i vederlaget (`skriv`). */
type Dokumentvarsel = {
  sendt: string;
  korrespondansetype: string;
  sendemaate?: string;
  beskrivelse?: string;
  dokumentasjon: string[];
};
const erDokumentvarsel = (v: unknown): v is Dokumentvarsel => typeof v === 'object' && v !== null;

/**
 * Vederlagskravet som flere rader, eller `null`. Et dokument TE legger til i kravskjemaet som
 * varselet for en kravpost, skrives som et registrert varsel før kravet, og kravposten viser
 * til det (VS-U51, VS-U53, VS-U54). Hele handlingen prøves før den første raden gis, så en
 * avvisning av kravet kommer før noe skrives.
 */
function medDokumentvarslene(
  k: Extract<Kommando, { type: 'krav' }>,
  skriving: Skrivesteg
): Utfall | null {
  const poster = (k.innhold.kravposter ?? []) as Record<string, unknown>[];
  if (!poster.some((p) => erDokumentvarsel(p.varsel))) return null;
  // VS-U51, VS-U53: et dokument står i saken som ett brev. Kravpostene det gjelder, oppgir det
  // likt, og et vedlegg hører til ett dokument.
  const dokumentene = new Map<string, string>();
  for (const p of poster) {
    if (!erDokumentvarsel(p.varsel)) continue;
    const { sendt, korrespondansetype, sendemaate, beskrivelse } = p.varsel;
    const like = JSON.stringify([
      dokumentnoekkel(p.varsel),
      sendt,
      korrespondansetype,
      sendemaate,
      beskrivelse,
    ]);
    for (const id of dokumentnoekkel(p.varsel)) {
      if ((dokumentene.get(id) ?? like) !== like)
        return {
          godtatt: false,
          feil: 'UGYLDIG_FORM',
          avvisning: {
            regel: 'UGYLDIG_FORM',
            melding:
              'Kravpostene oppgir samme dokument som varsel med ulik dato, type, sendemåte, beskrivelse eller andre vedlegg. Et dokument oppgis likt for hver kravpost det gjelder.',
          },
        };
      dokumentene.set(id, like);
    }
  }
  return skriving.proevd((kx, jx) => medVarslene(k, [], kx, jx, skriving));
}

/** Vedleggene i dokumentet, med små bokstaver og sortert, som skiller ett dokument fra et annet. */
const dokumentnoekkel = (d: Dokumentvarsel): string[] =>
  [...new Set(d.dokumentasjon.map((id) => id.toLowerCase()))].sort();

/**
 * Det første dokumentet i kravskjemaet som registrert varsel, og kravet med resten som
 * `neste`; uten flere dokumenter kravet, med dokumentene ved (VS-U51, VS-U53). Gjelder dokumentet
 * flere kravposter, er det ett brev med ett varsel per bestemmelse, og hver kravpost viser til
 * varselet etter sin (VS-U52).
 */
function medVarslene(
  k: Extract<Kommando, { type: 'krav' }>,
  vedKravet: string[],
  kontekst: Kontekst,
  journal: Journalrad[],
  skriving: Skrivesteg
): Utfall {
  const poster = k.innhold.kravposter as Record<string, unknown>[];
  const i = poster.findIndex((p) => erDokumentvarsel(p.varsel));
  if (i < 0) return skriving.skriv(k, kontekst, journal, vedKravet);
  type Dokumentpost = Omit<Kravpost, 'varsel'> & { varsel: Dokumentvarsel };
  const dokumentet = (poster[i] as unknown as Dokumentpost).varsel;
  const noekkel = JSON.stringify(dokumentnoekkel(dokumentet));
  const gruppen = poster.flatMap((p, j) =>
    erDokumentvarsel(p.varsel) && JSON.stringify(dokumentnoekkel(p.varsel)) === noekkel
      ? [[j, p as unknown as Dokumentpost] as const]
      : []
  );
  const hjemler: Kravpostvarselhjemmel[] = [];
  for (const [j, p] of gruppen) {
    const hjemmel = varselhjemmel(p);
    if (hjemmel === null)
      return {
        godtatt: false,
        feil: 'REGELBRUDD',
        avvisning: avvis(
          'KRAVPOSTVARSELET',
          `Kravpost nr. ${j + 1} har et varsel, men oppgjørsformen krever ikke varsel etter punkt 34.3.3 eller 34.4.`
        ),
      };
    if (!hjemler.includes(hjemmel)) hjemler.push(hjemmel);
  }
  const kommando = { type: 'varsel', spor: 'vederlag', hjemmel: hjemler[0], ...dokumentet };
  const varselet =
    skriving.formen(kommando) ??
    skriving.skriv(kommando as Kommando, kontekst, journal, [], hjemler.slice(1));
  if (!varselet.godtatt)
    return {
      ...varselet,
      avvisning: {
        ...varselet.avvisning,
        melding: `Varselet for kravpost nr. ${i + 1}: ${varselet.avvisning.melding}`,
      },
    };
  // VS-U55 (#1993): ellers holder `foranKravet` varselet i saken utenfor for de andre kravpostene.
  // `journal` har ikke dokumentet (VS-U51, VS-U53).
  const iVarslene = vedleggIVarslene(skriving.saken(journal));
  if (dokumentnoekkel(dokumentet).some((id) => iVarslene.has(id)))
    return {
      godtatt: false,
      feil: 'REGELBRUDD',
      avvisning: vedleggVedEtVarsel(`i varselet for kravpost nr. ${i + 1}`),
    };
  const [rad] = varselet.hendelser;
  const utsagn = new Map(
    (rad!.data.utsagn as { id: string; hjemmel: string }[]).map((x) => [x.hjemmel, x.id])
  );
  const resten = {
    ...k,
    innhold: {
      ...k.innhold,
      kravposter: poster.map((p, j) => {
        const medlem = gruppen.find(([g]) => g === j);
        return medlem ? { ...p, varsel: utsagn.get(varselhjemmel(medlem[1])!) } : p;
      }),
    },
  };
  return {
    godtatt: true,
    hendelser: [rad!],
    neste: (kx, jx) =>
      medVarslene(resten, [...vedKravet, ...dokumentnoekkel(dokumentet)], kx, jx, skriving),
  };
}

/**
 * Varslene etter § 34.3.3 og § 34.4 før kravet, uten dokumentene kravskjemaet la til i samme
 * handling: kravet legger dem ved, og de gjelder bare kravposten som viser til dem (VS-U51, VS-U53).
 */
function foranKravet(nytt: Dokument, lest: readonly Domenehendelse[], u: Utledning) {
  const vedlagte = new Set(nytt.dokumentasjon.map((v) => v.vedlegg_id));
  const dokumenter = new Map(
    lest.flatMap((h) => (h.art === 'dokument' ? [[h.id, h.dokument] as const] : []))
  );
  return u.spor.vederlag.kravpostvarsler.filter(
    (v) => !dokumenter.get(v.dokument)?.dokumentasjon.some((d) => vedlagte.has(d.vedlegg_id))
  );
}

/** Varselet for hver kravpost i vederlagskravet som trenger et, til brevteksten (A6). */
const kravpostvarslerIBrevet = (
  k: Krav,
  nytt: Dokument,
  lest: readonly Domenehendelse[],
  u: Utledning
): Record<string, Kravpostvarselet> =>
  kravpostvarslene(k, u.spor.vederlag.krav, foranKravet(nytt, lest, u));

/**
 * Et vedlegg ved et krav sendt fra løsningen som alt ligger ved et varsel for en kravpost i saken
 * (VS-U73, VS-U75). Et dokument ved kravet som også er et varsel, er dokumentet kravskjemaet la til som
 * varsel i samme handling (`foranKravet`, VS-U51).
 */
function vedleggetErEtVarsel(
  k: Extract<Kommando, { type: 'krav' }>,
  sak: Sakssperre
): Avvisning | null {
  // VS-U73. Et krav lagt til har datoen det ble sendt (`erRegistrering`).
  if (k.sendt !== undefined) return null;
  // #2100: samme fil lastet opp på nytt er samme vedlegg, som i fristen.
  const vedlagte = innholdetIVedleggene(k.dokumentasjon ?? [], sak.oppslag);
  const varselet = varseldokumentene(sak).find((d) =>
    [...innholdetIDokumentet(d)].some((x) => vedlagte.has(x))
  );
  return varselet ? vedleggVedEtVarsel('ved kravet', varselet) : null;
}

/** Hva som hindrer, med varselet vedlegget ligger ved når det er kjent. */
function vedleggVedEtVarsel(hvor: string, varselet?: Dokument) {
  const omtale = varselet ? omtalen(varselet) : null;
  return avvis(
    'KRAVPOSTVARSELET',
    `Et vedlegg ${hvor} ligger alt ved varselet for en kravpost ${omtale ? `i ${omtale}` : 'i saken'}. Kravposten viser til varselet, og begrunnelsen kan vise til vedlegget der.`
  );
}

/** Dokumentene med et varsel for en kravpost i saken (VS-U55). */
function varseldokumentene({ lest, u }: LestSak): Dokument[] {
  const varslene = new Set(u.spor.vederlag.kravpostvarsler.map((v) => v.dokument));
  return lest.flatMap((h) => (h.art === 'dokument' && varslene.has(h.id) ? [h.dokument] : []));
}

/** Vedleggene ved varslene for en kravpost i saken, med små bokstaver (VS-U55). */
const vedleggIVarslene = (sak: LestSak): Set<string> =>
  new Set(
    varseldokumentene(sak).flatMap((d) => d.dokumentasjon.map((v) => v.vedlegg_id.toLowerCase()))
  );

export const SKRIVING_I_VEDERLAGET = {
  kravinnhold: (innhold, u, { nyId }) => medKravposter(innhold, u, nyId),
  saksperre: vedleggetErEtVarsel,
  handlingen: medDokumentvarslene,
  postvarsler: kravpostvarslerIBrevet,
} satisfies Sporsskriving;

/**
 * Det som hindrer byggherrens svar med standpunktene i dag, eller `null` når svaret kan gis.
 * Svaret på rigg og drift er ikke bygget; posten går i en egen bestilling (arbeidsvalg 5 i
 * spørsmålsfila 10.11 for #1663).
 */
export function hindrerSvarPaaKravet(krav: Krav): string | null {
  return krevdRigg(krav) !== null ? 'Kravet har rigg og drift i forlenget byggetid' : null;
}

/**
 * KA-U59: byggherren svarer per kravpost. Til svaret på rigg og drift er bygget, tilbys svaret
 * og revisjonen av det ikke for et krav med posten (arbeidsvalg 5 i spørsmålsfila 10.11 for #1663).
 */
function svarPerKravpost(krav: Krav): Avvisning | null {
  const hinder = hindrerSvarPaaKravet(krav);
  return hinder
    ? avvis('SVAR_PER_KRAVPOST', `${hinder}, og svaret på den er ikke bygget ennå.`)
    : null;
}

/** Forutsetningene i vederlaget (`forutsetninger`). */
export const FORUTSETNINGER_I_VEDERLAGET = {
  innsigelsenErIkkeBygget: (u, gjelder) =>
    // Byggherrens svar på et varsel etter § 34.3.3 eller § 34.4 bygges i økt 2 i #1663 (G-9 i BF-14).
    u.spor.vederlag.kravpostvarsler.some((v) => v.id === gjelder)
      ? avvis(
          'IKKE_I_FOERSTE_VERSJON',
          'Innsigelsen mot varselet etter punkt 34.3.3 eller 34.4 kan ikke sendes ennå.'
        )
      : null,
  svaret: (u) => svarPerKravpost(u.spor.vederlag.gjeldendeKrav!),
  kravet: 'kravet om vederlagsjustering',
  trekket: () => null,
  aksepten: () => null,
  foresporsel: null,
} satisfies Sporsforutsetninger;

/**
 * Det i et foregående lag som rammer standpunktet (OV-U32). `oppgjoersform` er TEs beregningsregel for
 * kravposten, når byggherren ikke godtar den (arbeidsvalg 1 punkt 4 i spørsmålsfila 09.11 for
 * #1663, VS-U56).
 */
export type Forutsetning =
  | { grunn: Subsidiaergrunn }
  | { innsigelse: '34.1.2' | '34.1.3' | '34.3.3' }
  | { oppgjoersform: string };

/** Spørsmålene i vederlaget regelen krever svar på, med feltet i vurderingene. */
export type Vederlagsspoersmaal =
  | 'hovedkrav_varslet_i_tide'
  | 'vurdering'
  | 'godkjent_beloep'
  | 'aksepterer'
  | 'oensket_oppgjoersform'
  | 'krever_tilbud'
  | 'varslet_i_tide'
  | 'godtar_justering'
  | 'produktivitet_vurdering'
  | 'produktivitet_godkjent_beloep'
  | 'produktivitet_varslet_i_tide'
  | 'produktivitet_begrenset_beloep';

/**
 * Lagene i et svarutkast på vederlaget, med den særskilte posten etter § 34.1.3 annet ledd.
 * Spørsmålene om en kravpost har `gjelder`; de om posten etter annet ledd har feltet for den.
 */
export type LagIVederlaget = Utkastlag<
  Forutsetning,
  Vederlagsspoersmaal,
  { saerskilt?: 'produktivitet' }
>;

const iKravpost = (
  x: UbesvartIVederlaget
): x is Extract<UbesvartIVederlaget, { post: { gjelder: string } }> =>
  x.post !== null && 'gjelder' in x.post;
const iSaerskilt = (
  x: UbesvartIVederlaget
): x is Extract<UbesvartIVederlaget, { post: { saerskilt: string } }> =>
  x.post !== null && 'saerskilt' in x.post;

/**
 * Spørsmålene i utkastet regelen krever svar på, og som er ubesvart (`ubesvarteSpoersmaal` og
 * `ubesvartIKravposten`, #2025): varselet etter § 34.1.2 først, så postene i kravets rekkefølge.
 */
function ubesvartIVederlaget(
  svaret: Vederlagssvar,
  v: Svarvurdering,
  krav: Krav,
  regler: Regelsett
): LagIVederlaget['ubesvart'] {
  const ubesvarte = ubesvarteSpoersmaal(svaret, regler);
  const iPosten = (gjelder: string) =>
    ubesvarte.flatMap((x) => (iKravpost(x) && x.post.gjelder === gjelder ? [x.felt] : []));
  return [
    ...(ubesvarte.some((x) => x.post === null)
      ? [{ spoersmaal: 'hovedkrav_varslet_i_tide' as const }]
      : []),
    ...kravpostvurderinger(v, krav).flatMap(({ post, svar }) =>
      [...iPosten(post.id), ...ubesvartIKravposten(svar, post)].map((spoersmaal) => ({
        spoersmaal,
        gjelder: post.id,
      }))
    ),
    ...ubesvarte.flatMap((x) =>
      iSaerskilt(x) && x.post.saerskilt === 'produktivitet'
        ? [{ spoersmaal: PRODUKTIVITETSFELT[x.felt] }]
        : []
    ),
  ];
}

/** Feltene for en kravpost kontrollene av vederlaget fører feil for, med kravposten i nøkkelen. */
const KRAVPOSTFELT = [
  'vurdering',
  'godkjent_beloep',
  'aksepterer',
  'oensket_oppgjoersform',
  'krever_tilbud',
  'varslet_i_tide',
  'godtar_justering',
] as const;

/**
 * Svarene i utkastet kjernen avviser når svaret sendes (#2156, #2171), lest av de samme
 * kontrollene som utregningen gjør (`regnUtVederlag`): varselet etter § 34.1.2 der
 * varslingsplikten ikke gjelder kategorien, posten etter § 34.1.3 annet ledd når kravet ikke har
 * den, standpunktet til oppgjørsformen for hver kravpost (`kontrollerOppgjoersformen`), og
 * beløpet for hver post (`kontroller` i regelsettet). Feltene følger nøklene kontrollene fører,
 * også de de i dag bare fører som ubesvarte; de ubesvarte tar kalleren ut. Tilbakeholdelsen og
 * rigg og drift (`utenforOmfanget`) er ikke spørsmål i utkastet og står ikke her.
 */
function ugyldigIVederlaget(
  svaret: Vederlagssvar,
  v: Svarvurdering,
  krav: Krav,
  hovedkategori: string | null,
  iOppgjoersformen: Map<string, Record<string, string>>,
  regler: Regelsett
): LagIVederlaget['ugyldig'] {
  const feil = {
    ...avvisteFelt(() => kontrollerVarseletForVederlag(v, hovedkategori, regler)),
    ...avvisteFelt(() => kontrollerProduktivitetsposten(v, krav)),
    ...avvisteFelt(() => kontrollerVederlaget(svaret, regler)),
  };
  return [
    ...(feil.varslet_i_tide || feil.hovedkrav_varslet_i_tide
      ? [{ spoersmaal: 'hovedkrav_varslet_i_tide' as const }]
      : []),
    ...kravposterI(krav).flatMap((post) => {
      const iPosten = { ...feil, ...iOppgjoersformen.get(post.id) };
      return KRAVPOSTFELT.filter((felt) => iPosten[`${post.id}.${felt}`]).map((spoersmaal) => ({
        spoersmaal,
        gjelder: post.id,
      }));
    }),
    ...Object.entries(PRODUKTIVITETSFELT).flatMap(([felt, spoersmaal]) =>
      feil[`produktivitet.${felt}`] || feil[spoersmaal] ? [{ spoersmaal }] : []
    ),
  ];
}

/**
 * Feilene `kontrollerOppgjoersformen` og `kontrollerOppgivelsenEtter344` fører for svaret på hver
 * kravpost, etter kravpostens `id` (#2171, VS-U63).
 */
const feilIOppgjoersformen = (v: Svarvurdering, krav: Krav, u: Utledning, sendt: string | null) => {
  const staar = innsigelseneEtter344(u, sendt);
  return new Map(
    kravpostvurderinger(v, krav).map(({ post, svar }) => [
      post.id,
      {
        ...avvisteFelt(() => kontrollerOppgjoersformen(post.id, svar, post)),
        ...avvisteFelt(() =>
          kontrollerOppgivelsenEtter344(post.id, svar, post, staar.has(post.id))
        ),
      },
    ])
  );
};

/**
 * Vurderingene uten svarene på kravpostene `kontrollerOppgjoersformen` avviser, så lagene for
 * resten av utkastet kan regnes mens `ugyldig` sier hvilke svar kjernen ikke godtar (#2171).
 */
function utenAvvisteSvar(
  v: Svarvurdering,
  krav: Krav,
  iOppgjoersformen: Map<string, Record<string, string>>
): Svarvurdering {
  if (![...iOppgjoersformen.values()].some((f) => Object.keys(f).length)) return v;
  return {
    ...v,
    kravposter: kravpostvurderinger(v, krav).map(({ post, svar }) => {
      const feil = iOppgjoersformen.get(post.id) ?? {};
      return Object.fromEntries(
        Object.entries({ ...svar, gjelder: post.id }).filter(
          ([felt]) => !feil[`${post.id}.${felt}`]
        )
      );
    }),
  };
}

/**
 * Lagene i et svarutkast på vederlag, også før alle spørsmålene er besvart (OV-U33, #1925). Hvert
 * standpunkt står i laget én av tre utfyllinger av de ubesvarte spørsmålene gir det:
 * - beløpet og varselet etter § 34.1.2 og § 34.1.3: en ubesvart beregningsregel regnes som
 *   godtatt (#1756 punkt 1), et ubesvart varsel gir ikke noe standpunkt (S1-A), og en
 *   oppgjørsform byggherren mener som ikke er valgt, fylles ut med en regel byggherren kan mene
 *   (#2140);
 * - oppgjørsformen: hver beregningsregel som ikke godtatt, med den andre regelen, og fast sum som
 *   godtatt, uansett svaret (OV-U33, LV-U31, VS-U4);
 * - varselet etter § 34.3.3 og justeringen: som beløpet, og en ubesvart innsigelse mot dem som
 *   gjort gjeldende (VS-U4, VS-U56).
 * For oppgjørsformen, varselet og justeringen er `virkning` og `etikett` derfor laget i
 * utfyllingen, ikke i svaret slik det er besvart. `besvart` er `false` for et ubesvart spørsmål om
 * beløpet, oppgjørsformen, varselet etter § 34.3.3 eller § 34.4 og justeringen.
 * Lagene fra forholdet leses som frysingen leser dem når brevet ikke selv har et svar på
 * forholdet (`lageneIUtkastet`). Beløpene påvirker ikke lagene og tas ut før standpunktene
 * bygges. Svarene på en kravpost `kontrollerOppgjoersformen` avviser, står i `ugyldig` og
 * tas ut før lagene regnes. Kaster `UgyldigVurdering` for svar på kravpostene som
 * `kravpostvurderinger` avviser.
 */
export function lagIVederlaget(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  sendt: string | null
): LagIVederlaget {
  const krav = u.spor.vederlag.gjeldendeKrav!;
  const iOppgjoersformen = feilIOppgjoersformen(utkast.vurderinger, krav, u, sendt);
  const v = utenAvvisteSvar(utkast.vurderinger, krav, iOppgjoersformen);
  const svarene = kravpostvurderinger(v, krav);
  const utfylt = (fyll: (svar: Kravpostvurdering, post: Kravpost) => Kravpostvurdering) => ({
    ...v,
    kravposter: svarene.map(({ post, svar }) => fyll({ ...svar, gjelder: post.id }, post)),
  });
  // #2140: oppgjørsformen byggherren mener, når tilbudet eller regelen ikke godtas og den ikke er
  // valgt, fylles ut med en regel byggherren kan mene. Lagene leser ikke hvilken.
  const regelGodtatt = (svar: Kravpostvurdering, post: Kravpost) =>
    post.oppgjoersform !== 'tilbud' && typeof svar.aksepterer !== 'boolean'
      ? { ...svar, aksepterer: true }
      : ubesvartIKravposten(svar, post).includes('oensket_oppgjoersform')
        ? {
            ...svar,
            oensket_oppgjoersform:
              post.oppgjoersform === 'tilbud'
                ? 'regningsarbeid'
                : denAndreRegelen(post.oppgjoersform),
          }
        : svar;
  const lagI = (fylt: Svarvurdering) => lagIUtfyllingen(fylt, utkast, u, regler, sendt);
  const beloepet = lagI(utfylt(regelGodtatt));
  const formene = lagI(
    utfylt((_, post) =>
      post.oppgjoersform === 'tilbud'
        ? { gjelder: post.id, aksepterer: true }
        : {
            gjelder: post.id,
            aksepterer: false,
            oensket_oppgjoersform: denAndreRegelen(post.oppgjoersform),
          }
    )
  ).filter(({ s }) => s.art === 'oppgjoersform');
  // Uten justerte enhetspriser er utfyllingen for varselet den samme som for beløpet.
  const justeres = svarene.some(({ post }) => justerteEnhetspriser(post));
  const varslene = (
    justeres
      ? lagI(
          utfylt((svar, post) => {
            const fylt = regelGodtatt(svar, post);
            return justerteEnhetspriser(post)
              ? {
                  ...fylt,
                  varslet_i_tide: fylt.varslet_i_tide ?? false,
                  godtar_justering: fylt.godtar_justering ?? false,
                }
              : fylt;
          })
        )
      : beloepet
  ).filter(({ s }) => s.art !== 'oppgjoersform' && iKravposten(s));
  const iPosten = (liste: typeof formene, gjelder: string) =>
    liste.filter(({ s }) => 'gjelder' in s && s.gjelder === gjelder).map(({ lag }) => lag);
  const { hovedkategori } = kategori(paaberopelseFor(utkast, u));
  const besvart = utkast.vurderinger;
  const svaret = svaretFraVurderingene(besvart, krav, hovedkategori).svar;
  const ubesvart = ubesvartIVederlaget(svaret, besvart, krav, regler);
  return {
    ubesvart,
    ugyldig: utenom(
      ugyldigIVederlaget(svaret, besvart, krav, hovedkategori, iOppgjoersformen, regler),
      ubesvart
    ),
    standpunkter: beloepet.flatMap(({ s, lag }) => {
      if (iKravposten(s)) return [];
      if (s.art !== 'beloep' || s.saerskilt || s.gjelder === undefined) return [lag];
      // Brevets rekkefølge: oppgjørsformen, varselet og justeringen foran beløpet i kravposten.
      return [...iPosten(formene, s.gjelder), ...iPosten(varslene, s.gjelder), lag];
    }),
  };
}

/** Standpunktene for en kravpost foran beløpet, som står i laget utfyllingen for dem gir. */
const iKravposten = (s: Standpunkt) =>
  s.art === 'oppgjoersform' ||
  s.art === 'justering' ||
  (s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel));

/**
 * Lagene i svarutkastet med de utfylte vurderingene `v` (`lagIVederlaget`). Om et standpunkt er
 * besvart, leses av utkastet.
 */
function lagIUtfyllingen(
  v: Svarvurdering,
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  sendt: string | null
): { s: Standpunkt; lag: LagIVederlaget['standpunkter'][number] }[] {
  const utenBeloep: Svarvurdering = {
    ...v,
    kravposter: kravpostvurderinger(v, u.spor.vederlag.gjeldendeKrav!).map(({ post, svar }) => ({
      gjelder: post.id,
      aksepterer: svar.aksepterer,
      oensket_oppgjoersform: svar.oensket_oppgjoersform,
      krever_tilbud: svar.krever_tilbud,
      varslet_i_tide: svar.varslet_i_tide,
      godtar_justering: svar.godtar_justering,
    })),
    produktivitet_vurdering: undefined,
    produktivitet_godkjent_beloep: undefined,
    produktivitet_begrenset_beloep: v.produktivitet_varslet_i_tide === false ? 0 : undefined,
  };
  let n = 0;
  const lagret = STANDPUNKTER_I_VEDERLAGET(
    utenBeloep,
    u.spor.vederlag.gjeldendeKrav!,
    u,
    () => `utkast-${n++}`
  );
  const svar = {
    spor: 'vederlag' as const,
    standpunkter: standpunkterISvaret('vederlag', {
      standpunkter: lagret,
      utregning: { godkjent_beloep: 0 },
    }),
    utregning: {},
  };
  const { grunner, virket, virkning, lag, etikett } = lageneIUtkastet(svar, u, regler, sendt);
  const svaretPaaKravpostene = new Map(
    kravpostvurderinger(utkast.vurderinger, u.spor.vederlag.gjeldendeKrav!).map(
      ({ post, svar }) => [post.id, svar]
    )
  );
  // Innsigelsene i sporet som er gjort gjeldende og har virkning (OV-U27, OV-U22).
  const paaberopt = (h: Hjemmel) =>
    svar.standpunkter.some(
      (s, i) => s.art === 'rettidighet' && s.hjemmel === h && laget(virket[i].virkning) !== null
    );
  return svar.standpunkter.map((s, i) => {
    const l = lag[i];
    const rammer: Forutsetning[] = [];
    if (l !== null) {
      rammer.push(...grunner.map((grunn) => ({ grunn })));
      const egen = s.art === 'rettidighet' ? s.hjemmel : null;
      // § 34.1.2 rammer hele kravet; § 34.1.3 bare posten etter annet ledd (OV-U22, VS-U5).
      if (egen !== '34.1.2' && paaberopt('34.1.2')) rammer.push({ innsigelse: '34.1.2' });
      if (s.art === 'beloep' && s.saerskilt && paaberopt('34.1.3'))
        rammer.push({ innsigelse: '34.1.3' });
      rammer.push(...innenforKravposten(svar.standpunkter, i));
    }
    const lagt = {
      art: s.art,
      ...(s.art === 'rettidighet' ? { hjemmel: s.hjemmel } : {}),
      ...(s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel)
        ? { gjelder: s.gjelder }
        : {}),
      ...(s.art === 'beloep' && s.saerskilt ? { saerskilt: s.saerskilt } : {}),
      ...((s.art === 'beloep' || s.art === 'oppgjoersform' || s.art === 'justering') &&
      s.gjelder !== undefined
        ? { gjelder: s.gjelder }
        : {}),
      besvart: besvart(svaretPaaKravpostene, utkast.vurderinger, u, s),
      virkning: virkning[i]!,
      etikett: etikett[i]!,
      forutsetninger: rammer,
    };
    return { s, lag: lagt };
  });
}

/**
 * Standpunktene foran standpunktet `i` for samme kravpost etter en beregningsregel som åpner et
 * lag (`beregningsregelLag`): beregningsregelen byggherren ikke godtar, og innsigelsen etter
 * § 34.3.3 (VS-U4, VS-U56).
 */
function innenforKravposten(standpunkter: Standpunkt[], i: number): Forutsetning[] {
  const g = (standpunkter[i] as { gjelder?: string }).gjelder;
  if (g === undefined || standpunkter[i]!.art === 'beloep') return [];
  const lagene = beregningsregelLag(standpunkter, 1);
  return standpunkter.slice(0, i).flatMap((s): Forutsetning[] => {
    if ((s as { gjelder?: string }).gjelder !== g || !lagene.has(s.id)) return [];
    if (s.art === 'oppgjoersform') return [{ oppgjoersform: g }];
    if (s.art === 'rettidighet') return [{ innsigelse: '34.3.3' }];
    return [];
  });
}

/** Vurderingen av beløpet for hver særskilt post i utkastet. */
const VURDERINGEN_AV_SAERSKILT = {
  produktivitet: 'produktivitet_vurdering',
} as const satisfies Record<
  NonNullable<Extract<Standpunkt, { art: 'beloep' }>['saerskilt']>,
  keyof Svarvurdering
>;

/**
 * Om spørsmålet standpunktet svarer på, er besvart i vurderingene `v` i utkastet, med svaret på
 * hver kravpost i `svaret` (#1925).
 */
function besvart(
  svaret: ReadonlyMap<string, Kravpostvurdering>,
  v: Svarvurdering,
  u: Utledning,
  s: Standpunkt
): boolean {
  if (s.art === 'beloep' && s.saerskilt)
    return typeof v[VURDERINGEN_AV_SAERSKILT[s.saerskilt]] === 'string';
  const gjelder = 'gjelder' in s ? s.gjelder : undefined;
  if (s.art === 'beloep' && utenFastBeloepIKravposten(u, gjelder)) return true;
  const svar = gjelder === undefined ? undefined : svaret.get(gjelder);
  if (s.art === 'beloep') return typeof svar?.vurdering === 'string';
  if (s.art === 'oppgjoersform')
    return (
      typeof svar?.aksepterer === 'boolean' &&
      !ubesvartIKravposten(svar, kravposten(u, gjelder)!).includes('oensket_oppgjoersform')
    );
  if (s.art === 'justering') return typeof svar?.godtar_justering === 'boolean';
  if (s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel))
    return typeof svar?.varslet_i_tide === 'boolean';
  return true;
}

/** Kravposten `gjelder` i gjeldende krav. */
const kravposten = (u: Utledning, gjelder: string | undefined): Kravpost | undefined =>
  kravposterI(u.spor.vederlag.gjeldendeKrav!).find((p) => p.id === gjelder);

/** En kravpost etter en beregningsregel har ikke et beløp å besvare (OV-U115 punkt 5). */
const utenFastBeloepIKravposten = (u: Utledning, gjelder: string | undefined): boolean =>
  gjelder !== undefined && kravposten(u, gjelder)?.oppgjoersform !== 'tilbud';
