/**
 * Kommandoene i vederlaget (#1783): standpunktene i svaret, slik brevet lagrer dem
 * (`STANDPUNKTER_I_VEDERLAGET`), og lagene i et vederlagssvar byggherren ennå fyller ut
 * (#1400), så skjemaet kan vise hvilke innsigelser et subsidiært spørsmål bygger på, uten å
 * avgjøre det selv. Lagene regnes som brevet ville regnet dem med standpunktene som er
 * besvart (OV-U32, OV-U33, arbeidsvalget S1-A og S2-A i #1400, 30.10).
 */

import { HJEMMEL } from '../../format/format.ts';
import {
  kravpostvurderinger,
  kontrollerProduktivitetsposten,
  PRODUKTIVITETSFELT,
  svaretFraVurderingene,
  vederlagsposter,
  type Kravpostvurdering,
} from './frysing.ts';
import { kategori } from '../forhold/format.ts';
import { klarOverUtgiftene, liste, omtalen } from '../../frosset/brevdeler.ts';
import {
  innholdetIDokumentet,
  innholdetIVedleggene,
  sammeDokument,
  vedleggsnoekkel,
} from '../../kommandoer/vedlegg.ts';
import {
  kontroller as kontrollerVederlaget,
  kontrollerInnsigelsenSomStaar,
  kontrollerHovedvarseletISvaret,
  kontrollerOppgivelsenEtter344,
  kontrollerOppgjoersformen,
  kontrollerSvaretPaaVarselet,
  kontrollerVarseletForVederlag,
  stilteSpoersmaal,
  stiltIKravposten,
  ubesvartIKravposten,
  type UbesvartIVederlaget,
  type Vederlagssvar,
} from '../../regler/vederlag.ts';
import type { Svarvurdering } from '../../frosset/byggeklosser.ts';
import {
  denAndreRegelen,
  harProduktivitetspost,
  innsigelsenIVederlaget,
  rammerKravposten,
  justerteEnhetspriser,
  kravposterI,
  krevdRigg,
  kunnskapsdatoIKravet,
  OPPGJOERSHJEMMEL,
  varselhjemmel,
  varseletPostenViserTil,
  vederlagsinnhold,
} from './format.ts';
import { erKalenderdato, erObjekt, feilI, objekt } from '../../format/skjema.ts';
import { UgyldigVurdering } from '../../regler/feil.ts';
import { brukteBetegnelser, nesteBetegnelse } from '../poster/utledning.ts';
import {
  varseletPostenGjelder,
  kravposteneStrider,
  saerskiltStrider,
  eldreKravFoer,
  kravpostvarseletStrider,
  kravpostvarslene,
  kravetVilleVaertVarselet,
  sisteKunnskapsdato,
  standpunkteneTilVarslene,
} from './utledning.ts';
import { beloep, BroekdelAvOere, heleOere, tilTall } from '../../regler/beloep.ts';
import type { Subsidiaergrunn } from '../../regler/forhold.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import { kalenderdag, standpunkterISvaret } from '../../format/leser.ts';
import {
  avvis,
  erKravpostvarselhjemmel,
  erVederlagsvarselhjemmel,
  type Avvisning,
  type Dokument,
  type Journalrad,
  type Krav,
  type Kravpost,
  type Kravpostvarselet,
  type Kravpostvarselhjemmel,
  type Standpunkt,
  type Vederlagsvarselhjemmel,
} from '../../typer.ts';
import {
  datoenDetBleSendt,
  datoenSomGjelder,
  kravversjoneneKravetProevesMot,
  kravversjonenPaaDagen,
  varseletFoerBrevet,
  varseletGjelderOgsaa3412,
  varselEtter3412KrevesIkke,
  varseletForNyttSvar,
  type Utledning,
} from '../../utledning/utled.ts';
import { dagenSendt, dokumenterI, foerDagen } from '../../format/leser.ts';
import type { Innhold, Kommando, Kravform, Svarutkast } from '../../kommandoer/kommando.ts';
import type { Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type {
  Kontekst,
  LestSak,
  Sakssperre,
  Skrivesteg,
  Sporsskriving,
  Utfall,
  Vedleggsoppslag,
} from '../../kommandoer/skriving.ts';
import type { Utkastlag } from '../poster/kommando.ts';
import {
  avvisteFelt,
  avvisteVurderinger,
  forutsetningene,
  kravetUtkastetGjelder,
  lageneIUtkastet,
  utenom,
} from '../../kommandoer/utkastlag.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter, Svaretsvarsel } from '../../kommandoer/standpunkter.ts';

type Data = Record<string, unknown>;

/** Standpunktene i vederlaget, i rekkefølgen brevet setter dem (`standpunkter`). */
export const STANDPUNKTER_I_VEDERLAGET: Sporsstandpunkter = (v, krav, u, nyId, sendt) => {
  const ut: Data[] = [];
  // VS-U20, OV-U5, HF-U1: varselet før svaret, som i fristen.
  if (typeof v.hovedkrav_varslet_i_tide === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varseletForNyttSvar(u, '34.1.2', sendt),
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
  // VS-U86 punkt 12: datoen i posten er en kalenderdag.
  const dato = feil.length ? undefined : kunnskapsdatoIKravet({ innhold: innhold as Innhold });
  if (dato !== undefined && !erKalenderdato(dato))
    feil.push(
      `$.innhold.saerskilt.produktivitet.klar_over_utgiftene: ${JSON.stringify(dato)} er ikke en dato på formen ÅÅÅÅ-MM-DD`
    );
  return feil;
}

/** Dokumentene kravskjemaet legger til som varsel for en kravpost (VS-U51, VS-U53, `vedleggI`). */
const vedleggIKravpostene = (innhold: Innhold): string[] =>
  ((innhold.kravposter ?? []) as { varsel?: unknown }[]).flatMap(
    (p) => dokumentvarselet(p)?.dokumentasjon ?? []
  );

/** Formen på vederlagskravet (`formfeil`, `vedleggI`). */
export const KRAVFORM_I_VEDERLAGET = {
  feil: kravfeil,
  vedleggIInnholdet: vedleggIKravpostene,
  varselVedKravet: false,
} satisfies Kravform;

/**
 * KA-U56 og KA-U75: kravpostene mot de tidligere kravversjonene, KA-U83: den særskilte
 * vederlagsjusteringen mot forrige versjon, og VS-U50: varselet for posten. Et krav lagt til
 * prøves mot kravversjonene sendt før det (OV-U118).
 */
function kravpostsperre(
  k: Extract<Kommando, { type: 'krav' }>,
  u: Utledning,
  sendt: string | null,
  dag: string
): Avvisning | null {
  if (k.spor !== 'vederlag') return null;
  const { tidligere, andre } = kravversjoneneKravetProevesMot(u, 'vederlag', sendt);
  const strid =
    kravposteneStrider(k.innhold, tidligere, false, andre) ??
    saerskiltStrider({ innhold: k.innhold }, tidligere);
  if (strid) return avvis('KRAVPOSTENE', `Kravversjonen ${strid}.`);
  const varselet = kravpostvarseletStrider(
    { innhold: k.innhold },
    tidligere,
    u.spor.vederlag.kravpostvarsler,
    eldreKravFoer(u, dag)
  );
  return varselet ? avvis('KRAVPOSTVARSELET', `I kravversjonen ${varselet}.`) : null;
}

const VARSLINGSPLIKTEN_GJELDER_IKKE = avvis(
  'VARSLINGSPLIKT_GJELDER_IKKE',
  'Punkt 34.1.2 gjelder bare svikt og andre forhold, ikke forholdet som er påberopt, så byggherren tar ikke stilling til om varselet kom i tide.'
);

/**
 * VS-U96 punkt 33: det som hindrer byggherrens svar på varselet `gjelder` som står alene, eller et
 * nytt svar som erstatter det forrige (`hva`). Et svar lagt til, sendt på dagen `sendt`, prøves mot
 * byggherrens svar på kravene sendt til og med den dagen (OV-U98).
 */
export function hindrerSvaretPaaVarselet(
  u: Utledning,
  gjelder: string,
  hva: 'Svaret' | 'Revisjonen',
  sendt: string | null
): Avvisning | null {
  const varselet = varseletSvaretGjelder(u, gjelder);
  if (!varselet)
    return avvis(
      'INGEN_VARSEL',
      `${hva} må gjelde et varsel etter punkt 33.4, 34.1.2, 34.1.3, 34.3.3 eller 34.4 fra totalentreprenøren.`
    );
  // VS-U87 punkt 32, OV-U89 punkt 13: der saken gjelder en endring, krever § 34.1.2 ikke varsel.
  if (varselet.hjemmel === '34.1.2' && varselEtter3412KrevesIkke(u, sendt))
    return VARSLINGSPLIKTEN_GJELDER_IKKE;
  const iKjeden = hindrerSvaretIKjeden(u, gjelder, hva);
  if (iKjeden) return iKjeden;
  // VS-U96 punkt 33: byggherrens svar med virkning på kravversjonene med det varselet gjelder.
  const besvartIKravet = besvarteVederlagskrav(u, sendt).some(
    (k) =>
      varselet.hjemmel === '34.1.2' ||
      (varselet.hjemmel === '34.1.3'
        ? harProduktivitetspost(k)
        : kravposterI(k).some((p) => varseletPostenGjelder(u, k, p.id) === gjelder))
  );
  if (!besvartIKravet) return null;
  const ikke = `${hva} kan ikke gjelde varselet, fordi byggherren har svart på`;
  return avvis(
    'KRAVET_ER_BESVART',
    varselet.hjemmel === '34.1.2'
      ? `${ikke} vederlagskravet. Byggherren tar stilling til varselet i svaret på vederlagskravet.`
      : varselet.hjemmel === '34.1.3'
        ? `${ikke} en kravversjon med den særskilte vederlagsjusteringen. Byggherren tar stilling til varselet i svaret på vederlagskravet.`
        : `${ikke} en kravversjon med en kravpost som gjelder det. Byggherren tar stilling til varselet i svaret på kravposten.`
  );
}

/** VS-U96 punkt 38: en kravpost i kravversjonen der kravet selv er varselet. */
export interface VarseletIKravposten {
  id: string;
  hjemmel: Kravpostvarselhjemmel;
}

/**
 * Det som hindrer svaret på varselet `gjelder` eller revisjonen av det i kjeden av svar på varselet
 * (`hva`): kravet er trukket, eller byggherren har svart (VS-U96 punkt 33).
 */
function hindrerSvaretIKjeden(
  u: Utledning,
  gjelder: string,
  hva: 'Svaret' | 'Revisjonen'
): Avvisning | null {
  const sporet = u.spor.vederlag;
  if (sporet.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
  // VS-U96 punkt 33 og 38: svarene bare på varselet i kravet er én kjede (`svarkjeden`).
  const bare = sporet.krav.some((k) => k.id === gjelder);
  const forrige = sporet.svarPaaVarsler.some((x) =>
    bare ? x.bareVarselet : x.gjelder === gjelder
  );
  if (hva === 'Svaret' && forrige)
    return avvis('ALLEREDE_SVART', 'Du har allerede svart på varselet. Send et nytt svar.');
  if (hva === 'Revisjonen' && !forrige)
    return avvis('INGEN_SVAR', 'Det finnes ikke noe svar på varselet å erstatte.');
  return null;
}

/**
 * VS-U96 punkt 33, OV-U98: vederlagskravene byggherren har svart på med virkning, med svarene sendt
 * til og med dagen `sendt`. Et krav står én gang per svar.
 */
function besvarteVederlagskrav(u: Utledning, sendt: string | null): Krav[] {
  const sporet = u.spor.vederlag;
  const dokumentene = [...dokumenterI(u.journal)];
  const kravene = new Map(dokumentene.flatMap((d) => d.krav.map((k) => [k.id, k] as const)));
  const medVirkning = new Set([...sporet.svar, ...sporet.svarUtenforRekken].map((x) => x.id));
  return dokumentene.flatMap((d) =>
    d.svar.flatMap((x) => {
      const k = kravene.get(x.gjelder);
      return medVirkning.has(x.id) &&
        k?.spor === 'vederlag' &&
        (sendt === null || !foerDagen(sendt, dagenSendt({ id: x.id, dokument: d.id }, d) ?? ''))
        ? [k]
        : [];
    })
  );
}

/**
 * VS-U96 punkt 38 og 22: kravpostene i kravversjonen `gjelder` der kravet selv er varselet etter
 * § 34.3.3 første ledd eller § 34.4, fordi posten ikke viser til et varsel i saken.
 */
export function kravposteneSomVarsler(u: Utledning, gjelder: string): VarseletIKravposten[] {
  const sporet = u.spor.vederlag;
  const krav = sporet.krav.find((k) => k.id === gjelder);
  if (!krav) return [];
  const varslene = new Set(sporet.kravpostvarsler.map((v) => v.id));
  return kravposterI(krav).flatMap((p): VarseletIKravposten[] => {
    const hjemmel = varselhjemmel(p);
    const viserTil = varseletPostenGjelder(u, krav, p.id);
    return hjemmel && (viserTil === undefined || !varslene.has(viserTil))
      ? [{ id: p.id, hjemmel }]
      : [];
  });
}

/**
 * VS-U96 punkt 33: postene i `poster` byggherren ikke har svart på i en kravversjon med posten og
 * samme varselhjemmel, med svarene sendt til og med dagen `sendt` (OV-U98).
 */
export function ubesvartePoster(
  u: Utledning,
  poster: readonly VarseletIKravposten[],
  sendt: string | null
): VarseletIKravposten[] {
  const besvart = new Set(
    besvarteVederlagskrav(u, sendt).flatMap((k) =>
      kravposterI(k).map((p) => `${p.id} ${varselhjemmel(p)}`)
    )
  );
  return poster.filter((p) => !besvart.has(`${p.id} ${p.hjemmel}`));
}

/**
 * VS-U96 punkt 38 og 33: det som hindrer byggherrens svar bare på varselet i vederlagskravet
 * `gjelder`, eller et nytt svar som erstatter det forrige (`hva`).
 */
export function hindrerSvaretBarePaaVarselet(
  u: Utledning,
  gjelder: string,
  hva: 'Svaret' | 'Revisjonen',
  sendt: string | null
): Avvisning | null {
  const poster = kravposteneSomVarsler(u, gjelder);
  if (!poster.length)
    return avvis(
      'INGEN_VARSEL',
      `${hva} kan ikke gjelde bare varselet, fordi kravet ikke selv er varselet etter punkt 34.3.3 eller 34.4 for noen kravpost.`
    );
  return (
    hindrerSvaretIKjeden(u, gjelder, hva) ??
    (ubesvartePoster(u, poster, sendt).length
      ? null
      : avvis(
          'KRAVET_ER_BESVART',
          `${hva} kan ikke gjelde varselet, fordi byggherren har svart på en kravversjon med kravpostene kravet er varselet for. Byggherren tar stilling til varselet i svaret på kravposten.`
        ))
  );
}

/**
 * VS-U96 punkt 38: vurderingene i svaret bare på varselet i vederlagskravet, én per kravpost i
 * `poster`, med standpunktene etter VS-U96 punkt 30 og 31 (`kontrollerSvaretPaaVarselet`).
 */
export function vurderingeneISvaretBarePaaVarselet(
  s: Svarutkast,
  poster: readonly VarseletIKravposten[],
  krav: Krav,
  u: Utledning,
  sendt: string | null
): Avvisning | null {
  const staar = standpunkteneTilVarslene(u, sendt, true);
  const feil = avvisteFelt(() => {
    const v = s.vurderinger as Data;
    const ukjent = Object.keys(v).filter(
      (f) => f !== 'kravposter' && f !== 'hovedkrav_varslet_i_tide'
    );
    if (ukjent.length)
      throw new UgyldigVurdering(
        Object.fromEntries(
          ukjent.map((f) => [f, 'kjernen leser ikke feltet i svaret bare på varselet'])
        )
      );
    const gjelderOgsaa3412 = varseletGjelderOgsaa3412(u, krav.id, null, sendt);
    kontrollerHovedvarseletISvaret(v, gjelderOgsaa3412);
    if (sendt === null && gjelderOgsaa3412)
      kontrollerInnsigelsenSomStaar(
        'varselet',
        v,
        staar.some((x) => x.gjelder === krav.id && x.hjemmel === '34.1.2' && !x.iTide),
        'hovedkrav_varslet_i_tide'
      );
    for (const { post, svar } of postsvarene(v, poster, krav)) {
      const innsigelsenStaar = staar.some(
        (x) => x.gjelder === post.id && x.hjemmel === post.hjemmel && !x.iTide
      );
      kontrollerSvaretPaaVarselet(post.hjemmel, svar, innsigelsenStaar, post.betegnelse);
      if (sendt === null) kontrollerInnsigelsenSomStaar(post.betegnelse, svar, innsigelsenStaar);
    }
  });
  return avvisteVurderinger(feil);
}

/**
 * Svaret på hver kravpost i svaret bare på varselet, i rekkefølgen i kravet. Hver post i svaret
 * er en av `poster`, én gang, og svaret har minst én.
 */
function postsvarene(
  v: Data,
  poster: readonly VarseletIKravposten[],
  krav: Krav
): { post: VarseletIKravposten & { betegnelse: string }; svar: Data }[] {
  if (
    !Array.isArray(v.kravposter) ||
    !v.kravposter.length ||
    v.kravposter.some((p) => !erObjekt(p))
  )
    throw new UgyldigVurdering({
      kravposter:
        'mangler: svaret bare på varselet har standpunktet til varselet for minst én kravpost',
    });
  const svarene = new Map<string, Data>();
  for (const p of v.kravposter as Data[]) {
    const post = poster.find((x) => x.id === p.gjelder);
    if (!post)
      throw new UgyldigVurdering({
        kravposter: `kravet er ikke selv varselet for kravposten «${String(p.gjelder)}»`,
      });
    if (svarene.has(post.id))
      throw new UgyldigVurdering({
        kravposter: `kravposten «${post.id}» er besvart mer enn én gang`,
      });
    // Svaret på posten uten `gjelder`, som svaret på et varsel som står alene.
    svarene.set(post.id, Object.fromEntries(Object.entries(p).filter(([f]) => f !== 'gjelder')));
  }
  return kravposterI(krav).flatMap((k) => {
    const post = poster.find((x) => x.id === k.id);
    const svar = svarene.get(k.id);
    return post && svar ? [{ post: { ...post, betegnelse: k.betegnelse }, svar }] : [];
  });
}

/**
 * VS-U96 punkt 38: standpunktene i svaret bare på varselet i vederlagskravet, i rekkefølgen
 * kravpostene står i kravet. Hvert gjelder kravposten, som i svaret på kravet.
 */
export function standpunkterBarePaaVarselet(
  v: Svarvurdering,
  poster: readonly VarseletIKravposten[],
  krav: Krav,
  nyId: () => string
): Data[] {
  return [
    ...standpunktTilHovedvarselet(v, krav.id, nyId),
    ...postsvarene(v as Data, poster, krav).flatMap(({ post, svar }) =>
      standpunkterPaaVarselet(svar, { id: post.id, hjemmel: post.hjemmel }, nyId)
    ),
  ];
}

function standpunktTilHovedvarselet(v: Svarvurdering, gjelder: string, nyId: () => string): Data[] {
  const iTide = v.hovedkrav_varslet_i_tide;
  return typeof iTide === 'boolean'
    ? [
        {
          id: nyId(),
          art: 'rettidighet',
          gjelder,
          hjemmel: '34.1.2',
          i_tide: iTide,
        },
      ]
    : [];
}

/**
 * VS-U79, VS-U87 punkt 30–32: varselet i vederlaget som står alene, et svar med `gjelder` gjelder,
 * eller `null` når svaret gjelder et krav. Kommandoene slår det opp her.
 */
export function varseletSvaretGjelder(
  u: Utledning,
  gjelder: string
): Svaretsvarsel<Vederlagsvarselhjemmel> | null {
  const { kravpostvarsler, varsler } = u.spor.vederlag;
  const v = [...kravpostvarsler, varsler['34.1.2'], varsler['34.1.3']].find(
    (x) => x?.id === gjelder
  );
  return v && erVederlagsvarselhjemmel(v.hjemmel) ? { id: v.id, hjemmel: v.hjemmel } : null;
}

/**
 * VS-U79, VS-U77 punkt 30 og 31: standpunktene i svaret på varselet `varselet` som står alene, i
 * rekkefølgen brevet setter dem. Begge gjelder varselet.
 */
export function standpunkterPaaVarselet(
  v: Svarvurdering,
  varselet: Svaretsvarsel<Vederlagsvarselhjemmel>,
  nyId: () => string
): Data[] {
  const iTide = (v as Data).varslet_i_tide;
  const godtar = (v as Data).godtar_justering;
  const ut = standpunktTilHovedvarselet(v, varselet.id, nyId);
  if (typeof iTide === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varselet.id,
      hjemmel: varselet.hjemmel,
      i_tide: iTide,
    });
  if (typeof godtar === 'boolean')
    ut.push({
      id: nyId(),
      art: 'justering',
      gjelder: varselet.id,
      hjemmel: '34.3.2',
      godtar,
    });
  return ut;
}

/**
 * Vurderingene i svaret på varselet `varselet` (`kontrollerSvaretPaaVarselet`). En innsigelse
 * etter § 34.4 står når byggherrens siste standpunkt til varselet før svaret gjorde den gjeldende.
 * Svarene fra samme dag leses med, som i frysingen: det eneste svaret på varselet fra den dagen er
 * svaret et nytt svar erstatter (VS-U77 punkt 33), og et svar på en kravpost som viser til varselet,
 * hindrer svaret (`hindrerSvaretPaaVarselet`).
 */
export function vurderingeneISvaretPaaVarselet(
  s: Svarutkast,
  varselet: Svaretsvarsel<Vederlagsvarselhjemmel>,
  u: Utledning,
  sendt: string | null
): Avvisning | null {
  const tidligere = standpunkteneTilVarslene(u, sendt, true);
  const staar = tidligere.some(
    (x) => x.gjelder === varselet.id && x.hjemmel === varselet.hjemmel && !x.iTide
  );
  const gjelderOgsaa3412 = varseletGjelderOgsaa3412(u, varselet.id, varselet.hjemmel, sendt);
  const v = s.vurderinger as Data;
  const feil = avvisteFelt(() => {
    kontrollerSvaretPaaVarselet(varselet.hjemmel, v, staar, 'varselet', gjelderOgsaa3412);
    if (sendt === null) kontrollerInnsigelsenSomStaar('varselet', v, staar);
    if (sendt === null && gjelderOgsaa3412)
      kontrollerInnsigelsenSomStaar(
        'varselet',
        v,
        tidligere.some((x) => x.gjelder === varselet.id && x.hjemmel === '34.1.2' && !x.iTide),
        'hovedkrav_varslet_i_tide'
      );
  });
  return avvisteVurderinger(feil);
}

/** VS-U63: kravpostene der byggherrens innsigelse mot varselet etter § 34.4 står. */
const innsigelseneEtter344 = (u: Utledning, sendt: string | null): Set<string> =>
  new Set(
    standpunkteneTilVarslene(u, sendt).flatMap((x) =>
      x.hjemmel === '34.4' && !x.iTide ? [x.gjelder] : []
    )
  );

/**
 * Det i svaret som strider mot byggherrens tidligere svar i vederlaget (`svarsperre`): en
 * oppgivelse etter § 34.4 uten en innsigelse å gi opp (VS-U63), og et svar fra løsningen som ikke
 * sier noe om varselet der innsigelsen står (VS-U80).
 */
function oppgivelseUtenInnsigelse(
  s: Svarutkast,
  krav: Krav,
  u: Utledning,
  sendt: string | null
): Avvisning | null {
  const staar = innsigelseneEtter344(u, sendt);
  const forSent = new Set(
    standpunkteneTilVarslene(u, sendt).flatMap((x) =>
      x.iTide ? [] : [`${x.hjemmel} ${x.gjelder}`]
    )
  );
  const feil = avvisteFelt(() => {
    for (const { post, svar } of kravpostvurderinger(s.vurderinger, krav)) {
      kontrollerOppgivelsenEtter344(post.betegnelse, svar, post, staar.has(post.id));
      const hjemmel = varselhjemmel(post);
      if (sendt === null && hjemmel)
        kontrollerInnsigelsenSomStaar(post.betegnelse, svar, forSent.has(`${hjemmel} ${post.id}`));
    }
  });
  return avvisteVurderinger(feil);
}

/**
 * VS-U85: har TE oppgitt kunnskapsdatoen etter § 34.1.3 i løsningen, endres den bare i det egne
 * utsagnet etter VS-U86 punkt 14. Et varsel lagt til kan ha datoen det oppga (`varsel`).
 */
function kunnskapsdatoenErOppgitt(u: Utledning, hva: string): Avvisning | null {
  const siste = sisteKunnskapsdato(u);
  return siste
    ? avvis(
        'DATOEN_KAN_IKKE_ENDRES',
        `${hva} kan ikke oppgi datoen totalentreprenøren ble klar over at utgiftene ville påløpe, fordi totalentreprenøren alt har oppgitt ${klarOverUtgiftene(siste.dato)}. Datoen endres i et eget brev.`
      )
    : null;
}

/**
 * VS-U86 punkt 9 og 12, D-2 i BF-48: datoen står i vederlagskravet bare når kravet er det første
 * varselet løsningen kjenner om posten etter § 34.1.3 annet ledd (`kravetErDetFoersteVarselet`), og
 * datoen ikke er oppgitt før. Ellers oppgis den i det egne utsagnet.
 */
function kunnskapsdatoISperren(
  k: Extract<Kommando, { type: 'krav' }>,
  u: Utledning,
  sendt: string | null
) {
  if (k.spor !== 'vederlag' || kunnskapsdatoIKravet(k) === undefined) return null;
  return (
    kunnskapsdatoenErOppgitt(u, 'Vederlagskravet') ??
    (kravetErDetFoersteVarselet(u, sendt)
      ? null
      : avvis(
          'KRAVET_ER_IKKE_VARSELET',
          'Vederlagskravet er ikke det første varselet om den særskilte vederlagsjusteringen etter punkt 34.1.3, så datoen totalentreprenøren ble klar over at utgiftene ville påløpe, oppgis ikke i kravet. Den oppgis i et eget brev.'
        ))
  );
}

/**
 * VS-U86 punkt 9: vederlagskravet sendt dagen `sendt` er det første varselet etter § 34.1.3, ved
 * siden av varselet saken har (`varseletFoerBrevet`). Et krav sendt fra løsningen har `sendt` lik
 * `null`.
 */
export function kravetErDetFoersteVarselet(u: Utledning, sendt: string | null): boolean {
  const varselet = varseletFoerBrevet(u, '34.1.3');
  return varselet === undefined || foerDagen(sendt, datoenForVarselet(u, varselet));
}

/** Dagen varselet etter § 34.1.3 med id-en `varselet` ble sendt: det registrerte eller et krav. */
function datoenForVarselet(u: Utledning, varselet: string): string | null {
  const v = u.spor.vederlag;
  const kandidater = [v.varsler['34.1.3'], ...v.krav, ...v.kravUtenforRekken];
  const funnet = kandidater.find((x) => x?.id === varselet);
  return funnet ? datoenSomGjelder(u, funnet) : null;
}

/** VS-U85: et særskilt varsel sendt fra løsningen etter at datoen er oppgitt, oppgir ikke en ny dato. */
export function kunnskapsdatoIVarselet(
  k: Extract<Kommando, { type: 'send_varsel' }>,
  u: Utledning
): Avvisning | null {
  return k.varsler.some((v) => v.klar_over_utgiftene !== undefined)
    ? kunnskapsdatoenErOppgitt(u, 'Varselet')
    : null;
}

/**
 * VS-U86 punkt 14 (VS-U82, VS-U84): det egne utsagnet viser til varselet etter § 34.1.3 saken har,
 * det registrerte eller kravet som er det første varselet løsningen kjenner (VS-U85). Sperrene for
 * saken gjelder ikke (VS-U84).
 */
export function kunnskapsdatoen(gjelder: string, u: Utledning): Avvisning | null {
  const varselet = varseletFoerBrevet(u, '34.1.3');
  if (varselet === undefined)
    return avvis(
      'INGEN_VARSEL',
      'Totalentreprenøren har ikke varslet særskilt justering etter punkt 34.1.3, så det er ikke noe varsel å oppgi datoen for.'
    );
  return varselet === gjelder
    ? null
    : avvis(
        'UGYLDIG_HENVISNING',
        'Brevet må vise til det første varselet om særskilt justering etter punkt 34.1.3.'
      );
}

/** D-6 i BF-48: utsagnet oppgir en annen dato enn TEs siste opplysning. */
export function kontrollerKunnskapsdatoen(
  k: Extract<Kommando, { type: 'kunnskapsdato' }>,
  u: Utledning
): Avvisning | null {
  return sisteKunnskapsdato(u)?.dato === k.klar_over_utgiftene
    ? avvis(
        'DATOEN_ER_UENDRET',
        `Totalentreprenøren har alt oppgitt ${klarOverUtgiftene(k.klar_over_utgiftene)}. Brevet må oppgi en annen dato.`
      )
    : null;
}

/** Nyttelastkontrollen i vederlaget (`nyttelastkontroll`). */
export const NYTTELAST_I_VEDERLAGET = {
  begrunnelse: () => null,
  svarsperre: oppgivelseUtenInnsigelse,
  kravsperre: (k, u, sendt, dag) =>
    kravpostsperre(k, u, sendt, dag) ?? kunnskapsdatoISperren(k, u, sendt),
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
  // OV-U119.
  const tidligere = [...u.spor.vederlag.krav, ...u.spor.vederlag.kravUtenforRekken];
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
/** Dokumentet TE legger til i kravskjemaet som varselet for kravposten `p`, eller `undefined`. */
function dokumentvarselet(p: { varsel?: unknown }): Dokumentvarsel | undefined {
  const v = p.varsel as { art?: unknown; varsel?: unknown } | undefined;
  return v?.art === 'gitt' && typeof v.varsel === 'object' && v.varsel !== null
    ? (v.varsel as Dokumentvarsel)
    : undefined;
}

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
  if (!poster.some((p) => dokumentvarselet(p))) return null;
  // VS-U51, VS-U53: et dokument står i saken som ett brev. Kravpostene det gjelder, oppgir det
  // likt, og en opplasting hører til ett dokument. Samme fil lastet opp på nytt kan ligge ved et
  // annet brev (`sammeDokument`, #2100).
  const dokumentene = new Map<string, string>();
  const opplastingene = new Map<string, string>();
  for (const p of poster) {
    const varselet = dokumentvarselet(p);
    if (!varselet) continue;
    const { sendt, korrespondansetype, sendemaate, beskrivelse } = varselet;
    const noekkel = JSON.stringify(dokumentnoekkel(varselet, skriving.oppslag));
    const like = JSON.stringify([noekkel, sendt, korrespondansetype, sendemaate, beskrivelse]);
    const ider = varselet.dokumentasjon.map(vedleggsnoekkel);
    for (const [kart, noekler] of [
      [dokumentene, [noekkel]],
      [opplastingene, ider],
    ] as const) {
      if (noekler.some((n) => (kart.get(n) ?? like) !== like))
        return {
          godtatt: false,
          feil: 'UGYLDIG_FORM',
          avvisning: {
            regel: 'UGYLDIG_FORM',
            melding:
              'Kravpostene oppgir samme dokument som varsel med ulik dato, type, sendemåte, beskrivelse eller andre vedlegg. Et dokument oppgis likt for hver kravpost det gjelder.',
          },
        };
      for (const n of noekler) kart.set(n, like);
    }
  }
  return skriving.proevd((kx, jx) => medVarslene(k, [], kx, jx, skriving));
}

/**
 * Innholdet i vedleggene i dokumentet, sortert, som skiller ett dokument fra et annet. Samme fil
 * lastet opp på nytt er samme dokument, og hele dokumentet sammenliknes, som `sammeDokument`
 * (#2126, #2100).
 */
const dokumentnoekkel = (d: Dokumentvarsel, oppslag: Vedleggsoppslag): string[] =>
  [...innholdetIVedleggene(d.dokumentasjon, oppslag)].sort();

/**
 * Det første dokumentet i kravskjemaet som registrert varsel, og kravet med resten som
 * `neste`; uten flere dokumenter kravet, med dokumentene ved (VS-U51, VS-U53). Gjelder dokumentet
 * flere kravposter, er det ett brev med ett varsel per kravpost, og hver kravpost viser til sitt
 * (VS-U87 punkt 23 og 27, G-3 i BF-37).
 */
function medVarslene(
  k: Extract<Kommando, { type: 'krav' }>,
  vedKravet: string[],
  kontekst: Kontekst,
  journal: Journalrad[],
  skriving: Skrivesteg
): Utfall {
  const poster = k.innhold.kravposter as Record<string, unknown>[];
  const i = poster.findIndex((p) => dokumentvarselet(p));
  if (i < 0) return skriving.skriv(k, kontekst, journal, vedKravet);
  const dokumentet = dokumentvarselet(poster[i]!)!;
  const innholdet = dokumentnoekkel(dokumentet, skriving.oppslag);
  const noekkel = JSON.stringify(innholdet);
  const gruppen = poster.flatMap((p, j) => {
    const varselet = dokumentvarselet(p);
    return varselet && JSON.stringify(dokumentnoekkel(varselet, skriving.oppslag)) === noekkel
      ? [[j, p as unknown as Omit<Kravpost, 'varsel'>] as const]
      : [];
  });
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
    hjemler.push(hjemmel);
  }
  const kommando = {
    type: 'varsel',
    varsler: hjemler.map((hjemmel) => ({ hjemmel })),
    ...dokumentet,
  };
  const varselet =
    skriving.formen(kommando) ?? skriving.skriv(kommando as Kommando, kontekst, journal, []);
  if (!varselet.godtatt)
    return {
      ...varselet,
      avvisning: {
        ...varselet.avvisning,
        melding: `Varselet for kravpost nr. ${i + 1}: ${varselet.avvisning.melding}`,
      },
    };
  // VS-U55 (#1993): `journal` har ikke dokumentet (VS-U51, VS-U53). Det samme brevet, med filene lastet opp på
  // nytt, står alt i saken (#2144, OV-U80, `sammeDokument`).
  const saken = skriving.saken(journal);
  const iVarslene = vedleggIVarslene(saken);
  if (
    dokumentet.dokumentasjon.some((id) => iVarslene.has(vedleggsnoekkel(id))) ||
    varseldokumentene(saken).some(({ dokument }) => sammeDokument(dokument, new Set(innholdet)))
  )
    return {
      godtatt: false,
      feil: 'REGELBRUDD',
      avvisning: vedleggVedEtVarsel(`i varselet for kravpost nr. ${i + 1}`),
    };
  const [rad] = varselet.hendelser;
  const utsagn = (rad!.data.utsagn as { id: string }[]).map((x) => x.id);
  const resten = {
    ...k,
    innhold: {
      ...k.innhold,
      kravposter: poster.map((p, j) => {
        const n = gruppen.findIndex(([g]) => g === j);
        return n < 0 ? p : { ...p, varsel: { art: 'gitt', varsel: utsagn[n] } };
      }),
    },
  };
  return {
    godtatt: true,
    hendelser: [rad!],
    neste: (kx, jx) =>
      medVarslene(resten, [...vedKravet, ...dokumentet.dokumentasjon], kx, jx, skriving),
  };
}

/**
 * Varselet for hver kravpost i vederlagskravet som trenger et, til brevteksten (A6). Et krav
 * utenfor rekken kan være varselet (OV-U120).
 */
const kravpostvarslerIBrevet = (
  k: Krav,
  u: Utledning,
  dag: string
): Record<string, Kravpostvarselet> =>
  kravpostvarslene(k, u.spor.vederlag.krav, eldreKravFoer(u, dag));

/**
 * Et vedlegg ved et krav sendt fra løsningen som alt ligger ved et varsel for en kravpost i saken
 * (VS-U73, VS-U75). Et dokument ved kravet som også er et varsel, er dokumentet kravskjemaet la til som
 * varsel i samme handling (VS-U51).
 */
function vedleggetErEtVarsel(
  k: Extract<Kommando, { type: 'krav' }>,
  sak: Sakssperre
): Avvisning | null {
  // VS-U73. Et krav lagt til har datoen det ble sendt (`erRegistrering`).
  if (k.sendt !== undefined) return null;
  // #2100: samme fil lastet opp på nytt er samme vedlegg, som i fristen.
  const vedlagte = innholdetIVedleggene(k.dokumentasjon ?? [], sak.oppslag);
  const varselet = varseldokumentene(sak).find(({ dokument }) =>
    [...innholdetIDokumentet(dokument)].some((x) => vedlagte.has(x))
  );
  if (!varselet) return null;
  // VS-U51, VS-U75: dokumentet kravskjemaet la til som varsel i samme handling, ligger ved kravet
  // som varseldokumentet (arbeidsvalget 24.11 i #2144).
  const iSaken = new Set(sak.foer.u.spor.vederlag.kravpostvarsler.map((v) => v.dokument));
  if (iSaken.has(varselet.id)) return vedleggVedEtVarsel('ved kravet', varselet.dokument);
  const utsagn = new Set(
    sak.u.spor.vederlag.kravpostvarsler.flatMap((v) => (v.dokument === varselet.id ? [v.id] : []))
  );
  const poster = ((k.innhold.kravposter ?? []) as Record<string, unknown>[]).flatMap((p, j) =>
    utsagn.has(varseletPostenViserTil(p as unknown as Kravpost) ?? '') ? [String(j + 1)] : []
  );
  return avvis(
    'KRAVPOSTVARSELET',
    `Et vedlegg ved kravet ligger alt ved varselet for kravpost nr. ${liste(poster)} i dette kravet. Varselet legges ved kravet, så vedlegget står der én gang.`
  );
}

/** Hva som hindrer, med varselet vedlegget ligger ved når det er kjent. */
function vedleggVedEtVarsel(hvor: string, varselet?: Dokument) {
  const omtale = varselet ? omtalen(varselet) : null;
  return avvis(
    'KRAVPOSTVARSELET',
    `Et vedlegg ${hvor} ligger alt ved varselet for en kravpost ${omtale ? `i ${omtale}` : 'i saken'}. Kravposten viser til varselet, og begrunnelsen kan vise til vedlegget der.`
  );
}

/**
 * VS-U87 punkt 23, fjerde og sjette setning, og arbeidsvalg 4 26.11 i #2408: kravposten som mangler
 * valget av varsel. Kravpostene som viser til et varsel, leses i alle kravversjonene i sporet, og
 * saken leses før handlingen, så et dokument kravskjemaet legger til, teller ikke (VS-U51).
 */
function varselvalgetMangler(
  k: Extract<Kommando, { type: 'krav' }>,
  { foer: { u }, dag }: Sakssperre
): Avvisning | null {
  const sporet = u.spor.vederlag;
  const brukt = new Set(
    [...sporet.krav, ...sporet.kravUtenforRekken]
      .flatMap(kravposterI)
      .map(varseletPostenViserTil)
      .filter((v) => v !== undefined)
  );
  // Et krav lagt til kan bare vise til et varsel sendt samme dag eller før (OV-U98).
  const sendt = k.sendt === undefined ? null : kalenderdag(k.sendt);
  const ubrukte = sporet.kravpostvarsler.filter(
    (v) => !brukt.has(v.id) && (sendt === null || !foerDagen(sendt, datoenDetBleSendt(u, v) ?? ''))
  );
  if (!ubrukte.length) return null;
  const { tidligere } = kravversjoneneKravetProevesMot(u, 'vederlag', sendt);
  const eldre = eldreKravFoer(u, dag);
  for (const [i, p] of kravposterI({ innhold: k.innhold }).entries()) {
    const hjemmel = varselhjemmel(p);
    if (
      p.varsel !== undefined ||
      !kravetVilleVaertVarselet(p, tidligere, eldre) ||
      !ubrukte.some((v) => v.hjemmel === hjemmel)
    )
      continue;
    const posten = p.betegnelse ? `Kravposten ${p.betegnelse}` : `Kravpost nr. ${i + 1}`;
    return avvis(
      'VARSELVALGET_MANGLER',
      `${posten} sier ikke hvilket varsel den gjelder. Saken har et varsel etter punkt ${hjemmel} som ingen kravpost viser til. Velg varselet posten gjelder, eller at kravet er varselet for posten.`
    );
  }
  return null;
}

/** Dokumentene med et varsel for en kravpost i saken (VS-U55). */
function varseldokumentene({ lest, u }: LestSak): { id: string; dokument: Dokument }[] {
  const varslene = new Set(u.spor.vederlag.kravpostvarsler.map((v) => v.dokument));
  return lest.flatMap((h) =>
    h.art === 'dokument' && varslene.has(h.id) ? [{ id: h.id, dokument: h.dokument }] : []
  );
}

/** Opplastingene ved varslene for en kravpost i saken (VS-U55). */
const vedleggIVarslene = (sak: LestSak): Set<string> =>
  new Set(
    varseldokumentene(sak).flatMap(({ dokument }) =>
      dokument.dokumentasjon.map((v) => vedleggsnoekkel(v.vedlegg_id))
    )
  );

export const SKRIVING_I_VEDERLAGET = {
  kravinnhold: (innhold, u, { nyId }) => medKravposter(innhold, u, nyId),
  saksperre: (k, sak) => vedleggetErEtVarsel(k, sak) ?? varselvalgetMangler(k, sak),
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

/**
 * Det standpunktet `s` i et tidligere lag rammer standpunktet `t` med i skjemaet (OV-U22, VS-U5,
 * `rammerKravposten`). Beregningsregelen og varselet etter § 34.3.3 står foran beløpet i
 * kravposten, ikke som vilkår for det (VS-U4, VS-U56).
 */
function rammerIVederlaget(s: Standpunkt, t: Standpunkt): Forutsetning | null {
  const i = innsigelsenIVederlaget(s);
  if (i === null) return null;
  const f: Forutsetning = 'oppgjoersform' in i ? i : { innsigelse: i.innsigelse };
  if ('innsigelse' in i && i.innsigelse !== '34.3.3')
    return i.innsigelse === '34.1.2' || (t.art === 'beloep' && t.saerskilt) ? f : null;
  const post = t.art === 'beloep' || !('gjelder' in t) ? undefined : t.gjelder;
  return post !== undefined && rammerKravposten(i, post) ? f : null;
}

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
 * Spørsmålene regelen stiller i utkastet (`stilteSpoersmaal` og `stiltIKravposten`, #2279), og de
 * som er påkrevd og ubesvart (`ubesvarteSpoersmaal` og `ubesvartIKravposten`, #2025): varselet
 * etter § 34.1.2 først, så postene i kravets rekkefølge og posten etter § 34.1.3 annet ledd.
 */
function spoersmaaleneIVederlaget(
  svaret: Vederlagssvar,
  v: Svarvurdering,
  krav: Krav,
  regler: Regelsett
): Pick<LagIVederlaget, 'stilt' | 'ubesvart'> {
  const stilte = stilteSpoersmaal(svaret, regler);
  const stilt: LagIVederlaget['stilt'] = [];
  const ubesvart: LagIVederlaget['ubesvart'] = [];
  const still = (spoersmaal: LagIVederlaget['stilt'][number], besvart: boolean) => {
    stilt.push(spoersmaal);
    if (!besvart) ubesvart.push(spoersmaal);
  };
  for (const x of stilte)
    if (x.post === null) still({ spoersmaal: 'hovedkrav_varslet_i_tide' }, x.besvart);
  for (const { post, svar } of kravpostvurderinger(v, krav)) {
    for (const x of stilte)
      if (iKravpost(x) && x.post.gjelder === post.id)
        still({ spoersmaal: x.felt, gjelder: post.id }, x.besvart);
    const paakrevd = ubesvartIKravposten(svar, post);
    for (const felt of stiltIKravposten(svar, post))
      if (felt !== 'aksepterer')
        still({ spoersmaal: felt, gjelder: post.id }, !paakrevd.some((x) => x === felt));
  }
  for (const x of stilte)
    if (iSaerskilt(x) && x.post.saerskilt === 'produktivitet')
      still({ spoersmaal: PRODUKTIVITETSFELT[x.felt] }, x.besvart);
  return { stilt, ubesvart };
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
  const krav = kravetUtkastetGjelder(u, utkast, sendt);
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
  const lagI = (fylt: Svarvurdering) => lagIUtfyllingen(fylt, utkast, krav, u, regler, sendt);
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
  const { hovedkategori } = kategori(kravversjonenPaaDagen(u, 'forhold', sendt));
  const besvart = utkast.vurderinger;
  const svaret = svaretFraVurderingene(
    besvart,
    krav,
    hovedkategori,
    standpunkteneTilVarslene(u, sendt, true).filter((x) => !x.iTide)
  ).svar;
  const { stilt, ubesvart } = spoersmaaleneIVederlaget(svaret, besvart, krav, regler);
  return {
    stilt,
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
  krav: Krav,
  u: Utledning,
  regler: Regelsett,
  sendt: string | null
): { s: Standpunkt; lag: LagIVederlaget['standpunkter'][number] }[] {
  const utenBeloep: Svarvurdering = {
    ...v,
    kravposter: kravpostvurderinger(v, krav).map(({ post, svar }) => ({
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
  const lagret = STANDPUNKTER_I_VEDERLAGET(utenBeloep, krav, u, () => `utkast-${n++}`, sendt);
  const svar = {
    spor: 'vederlag' as const,
    standpunkter: standpunkterISvaret('vederlag', {
      standpunkter: lagret,
      utregning: { godkjent_beloep: 0 },
    }),
    utregning: {},
  };
  const { grunner, virkning, lag, etikett } = lageneIUtkastet(svar, krav, u, regler, sendt);
  const svaretPaaKravpostene = new Map(
    kravpostvurderinger(utkast.vurderinger, krav).map(({ post, svar }) => [post.id, svar])
  );
  const forutsetninger = forutsetningene<Forutsetning>(
    svar.standpunkter,
    lag,
    grunner.map((grunn) => ({ grunn })),
    rammerIVederlaget
  );
  return svar.standpunkter.map((s, i) => {
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
      besvart: besvart(svaretPaaKravpostene, utkast.vurderinger, krav, s),
      virkning: virkning[i]!,
      etikett: etikett[i]!,
      forutsetninger: forutsetninger[i]!,
    };
    return { s, lag: lagt };
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
  krav: Krav,
  s: Standpunkt
): boolean {
  if (s.art === 'beloep' && s.saerskilt)
    return typeof v[VURDERINGEN_AV_SAERSKILT[s.saerskilt]] === 'string';
  const gjelder = 'gjelder' in s ? s.gjelder : undefined;
  if (s.art === 'beloep' && utenFastBeloepIKravposten(krav, gjelder)) return true;
  const svar = gjelder === undefined ? undefined : svaret.get(gjelder);
  if (s.art === 'beloep') return typeof svar?.vurdering === 'string';
  if (s.art === 'oppgjoersform')
    return (
      typeof svar?.aksepterer === 'boolean' &&
      !ubesvartIKravposten(svar, kravposten(krav, gjelder)!).includes('oensket_oppgjoersform')
    );
  if (s.art === 'justering') return typeof svar?.godtar_justering === 'boolean';
  if (s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel))
    return typeof svar?.varslet_i_tide === 'boolean';
  return true;
}

/** Kravposten `gjelder` i kravversjonen `krav`. */
const kravposten = (krav: Krav, gjelder: string | undefined): Kravpost | undefined =>
  kravposterI(krav).find((p) => p.id === gjelder);

/** En kravpost etter en beregningsregel har ikke et beløp å besvare (OV-U115 punkt 5). */
const utenFastBeloepIKravposten = (krav: Krav, gjelder: string | undefined): boolean =>
  gjelder !== undefined && kravposten(krav, gjelder)?.oppgjoersform !== 'tilbud';
