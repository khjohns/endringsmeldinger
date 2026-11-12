/**
 * Kommandoene i vederlaget (#1783): standpunktene i svaret, slik brevet lagrer dem
 * (`STANDPUNKTER_I_VEDERLAGET`), og lagene i et vederlagssvar byggherren ennå fyller ut
 * (#1400), så skjemaet kan vise hvilke innsigelser et subsidiært spørsmål bygger på, uten å
 * avgjøre det selv. Lagene regnes som brevet ville regnet dem med standpunktene som er
 * besvart (OV-U32, OV-U33, arbeidsvalget S1-A og S2-A i #1400, 30.10).
 */

import { HJEMMEL } from '../../format/format.ts';
import { virkninger } from '../../frosset/standpunkt.ts';
import {
  beregningsregelLag,
  kravpostvurderinger,
  vederlagsposter,
  type Kravpostvurdering,
} from './frysing.ts';
import {
  etikett,
  hjemmelenGjelder,
  laget,
  type Svarvurdering,
} from '../../frosset/byggeklosser.ts';
import {
  kravposterI,
  krevdIKravposten,
  krevdRigg,
  krevdSamlet,
  OPPGJOERSHJEMMEL,
  vederlagsinnhold,
} from './format.ts';
import { erObjekt, feilI, objekt } from '../../format/skjema.ts';
import { brukteBetegnelser } from '../poster/utledning.ts';
import {
  kravposteneStrider,
  kravpostvarseletStrider,
  kravpostvarslene,
  nesteBetegnelse,
  varselhjemmel,
} from './utledning.ts';
import { erBeloepetGodkjentFullt } from '../../regler/vederlag.ts';
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
  type Virkning,
} from '../../typer.ts';
import { paaberopelseFor, varseletForNyttSvar, type Utledning } from '../../utledning/utled.ts';
import type { Innhold, Kommando, Kravform, Svarutkast } from '../../kommandoer/kommando.ts';
import type { Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type { Kontekst, Skrivesteg, Sporsskriving, Utfall } from '../../kommandoer/skriving.ts';
import type { Utkastlag } from '../poster/kommando.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter } from '../../kommandoer/standpunkter.ts';
import { grunnerFraForholdet } from '../forhold/frysing.ts';

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
        `${sti}: ${verdi} har brøkdeler av øre; beløpet oppgis i kroner med høyst to desimaler (OV-U58)`,
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
} satisfies Kravform;

/** Avgrensningene i svaret på vederlaget som krever en begrunnelse (`avgrensninger`). */
function avgrensningerIVederlaget(
  v: Svarvurdering,
  server: Record<string, unknown>,
  krav: Krav
): string[] {
  const ut: string[] = [];
  if (v.hovedkrav_varslet_i_tide === false)
    ut.push('gjør gjeldende at varselet etter § 34.1.2 kom for sent');
  // VS-U5: begrensningen etter § 34.1.3.
  if (v.produktivitet_varslet_i_tide === false)
    ut.push('gjør gjeldende at varselet etter § 34.1.3 kom for sent');
  const ikkeAkseptert = kravpostvurderinger(v, krav).filter(
    ({ svar }) => svar.aksepterer === false
  );
  if (ikkeAkseptert.length) ut.push('ikke aksepterer tilbudet (§ 34.2.2)');
  // B-13: beløpet for postene svaret tar stilling til. KA-U72, OV-U73: en kravpost der tilbudet
  // ikke er akseptert, har ikke beløp og regnes ikke med.
  const godkjent = beloep(
    (server.subsidiaert_godkjent_beloep ?? server.godkjent_beloep) as number | undefined
  );
  if (godkjent === null)
    throw new Error('Utregningen av vederlaget har ikke godkjent beløp (#508).');
  const krevd = ikkeAkseptert.reduce(
    (sum, { post }) => sum - (krevdIKravposten(krav, post) ?? 0n),
    krevdSamlet(krav)
  );
  if (!erBeloepetGodkjentFullt(krevd, godkjent)) ut.push('ikke godkjenner hele beløpet');
  return ut;
}

/** KA-U56 og KA-U75: kravpostene mot de tidligere kravversjonene, og VS-U50: varselet for posten. */
function kravpostsperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  if (k.spor !== 'vederlag') return null;
  const strid = kravposteneStrider(k.innhold, u.spor.vederlag.krav, false);
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
      '§ 34.1.2 gjelder bare svikt og andre forhold, ikke kategorien i grunnlaget, så byggherren tar ikke stilling til om varselet kom i tide (KA-46).'
    );
  return null;
}

/** Nyttelastkontrollen i vederlaget (`nyttelastkontroll`). */
export const NYTTELAST_I_VEDERLAGET = {
  avgrensninger: avgrensningerIVederlaget,
  kravsperre: kravpostsperre,
  innsigelse: innsigelseMotVarselet,
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
type Dokumentvarsel = { sendt: string; korrespondansetype: string; dokumentasjon: string[] };
const erDokumentvarsel = (v: unknown): v is Dokumentvarsel => typeof v === 'object' && v !== null;

/**
 * Vederlagskravet som flere rader, eller `null`. Et dokument TE legger til i kravskjemaet som
 * varselet for en kravpost, skrives som et registrert varsel før kravet, og kravposten viser
 * til det (VS-U51, VS-U53, VS-U54). Hele handlingen prøves før den første raden gis, så en
 * avvisning av kravet kommer før noe skrives.
 */
function medDokumentvarslene(
  k: Extract<Kommando, { type: 'krav' }>,
  kontekst: Kontekst,
  journal: Journalrad[],
  skriving: Skrivesteg
): Utfall | null {
  const poster = (k.innhold.kravposter ?? []) as Record<string, unknown>[];
  if (!poster.some((p) => erDokumentvarsel(p.varsel))) return null;
  // VS-U51, VS-U53: et dokument står i saken som ett brev. Kravpostene det gjelder, oppgir det
  // likt, og et vedlegg hører til ett dokument.
  const dokumentene = new Map<string, string>();
  for (const p of poster) {
    if (!erDokumentvarsel(p.varsel)) continue;
    const { sendt, korrespondansetype } = p.varsel;
    const like = JSON.stringify([dokumentnoekkel(p.varsel), sendt, korrespondansetype]);
    for (const id of dokumentnoekkel(p.varsel)) {
      if ((dokumentene.get(id) ?? like) !== like)
        return {
          godtatt: false,
          feil: 'UGYLDIG_FORM',
          avvisning: {
            regel: 'UGYLDIG_FORM',
            melding:
              'Kravpostene oppgir samme dokument som varsel med ulik dato, type eller andre vedlegg. Et dokument oppgis likt for hver kravpost det gjelder.',
          },
        };
      dokumentene.set(id, like);
    }
  }
  const kjede = (kx: Kontekst, jx: Journalrad[]) => medVarslene(k, [], kx, jx, skriving);
  if (skriving.sendes) {
    const proeve = skriving.hele(kjede(kontekst, journal), kontekst, journal);
    if (!proeve.godtatt) return proeve;
  }
  return kjede(kontekst, journal);
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
          `Kravpost nr. ${j + 1} har et varsel, men oppgjørsformen krever ikke varsel etter § 34.3.3 eller § 34.4 (VS-U50).`
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

export const SKRIVING_I_VEDERLAGET = {
  kravinnhold: medKravposter,
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

/**
 * Lagene i et svarutkast på vederlag, også før alle spørsmålene er besvart. Et ubesvart
 * varslingsspørsmål regnes som at innsigelsen ikke er gjort gjeldende, så laget kan endre
 * seg når det besvares (S1-A). Lagene fra forholdet leses av gjeldende svar på forholdet,
 * som frysingen gjør når brevet ikke selv har et svar på forholdet. Beløpene påvirker ikke
 * lagene og tas ut før standpunktene bygges. Kaster `UgyldigVurdering` for svar på
 * kravpostene som `kravpostvurderinger` avviser.
 */
export function lagIVederlaget(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett
): Utkastlag<Forutsetning> {
  const v = utkast.vurderinger;
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
  const g = u.spor.forhold.gjeldendeSvar;
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const virket = virkninger(svar, paaberopelseFor(utkast, u), regler, grunner.length);
  const forskjoevet = (vi: Virkning): Virkning =>
    typeof vi === 'number' ? vi + grunner.length : vi;
  const lag = virket.map((vi) => laget(forskjoevet(vi.virkning)));
  const flereLag = lag.some((l) => l !== null && l > 1);
  // Innsigelsene i sporet som er gjort gjeldende og har virkning (OV-U27, OV-U22).
  const paaberopt = (h: Hjemmel) =>
    svar.standpunkter.some(
      (s, i) => s.art === 'rettidighet' && s.hjemmel === h && laget(virket[i].virkning) !== null
    );
  return {
    standpunkter: svar.standpunkter.map((s, i) => {
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
      return {
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
        besvart: s.art !== 'beloep' || utenFastBeloepIKravposten(u, s.gjelder) || besvart(v, u, s),
        virkning: forskjoevet(virket[i].virkning),
        etikett: l !== null && flereLag ? etikett(l) : null,
        forutsetninger: rammer,
      };
    }),
  };
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

const besvart = (
  v: Svarvurdering,
  u: Utledning,
  s: { saerskilt?: 'produktivitet' | 'rigg_og_drift'; gjelder?: string }
) =>
  typeof (s.saerskilt
    ? v.produktivitet_vurdering
    : kravpostvurderinger(v, u.spor.vederlag.gjeldendeKrav!).find(
        ({ post }) => post.id === s.gjelder
      )?.svar.vurdering) === 'string';

/** En kravpost etter en beregningsregel har ikke et beløp å besvare (OV-U95 punkt 5). */
const utenFastBeloepIKravposten = (u: Utledning, gjelder: string | undefined): boolean =>
  gjelder !== undefined &&
  kravposterI(u.spor.vederlag.gjeldendeKrav!).find((p) => p.id === gjelder)?.oppgjoersform !==
    'tilbud';
