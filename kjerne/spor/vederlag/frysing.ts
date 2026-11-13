/**
 * Frysingen av svaret på vederlaget: lagene standpunktene står i, postene og påberopelsene i
 * brevet, det byggherren godtar prinsipalt og sammenfallet, og serverens utregning av svaret
 * og kontrollen av byggherrens vurderinger (B-13). `frosset/standpunkt.ts` slår opp her
 * gjennom `FRYSING`, og `frosset/utregning.ts` gjennom `UTREGNING` (#1783).
 */

import { beloep, tilTall, type Oere } from '../../regler/beloep.ts';
import { UgyldigVurdering } from '../../regler/feil.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import type { Beloepsvurdering } from '../../regler/typer.ts';
import {
  beregnGodkjentBeloep,
  beregnVederlag,
  kontrollerOppgjoersformen,
  kontrollerVarseletForVederlag,
  lagIKravposten,
  type Vederlagsberegning,
  type Postsvar,
  type Vederlagssvar,
} from '../../regler/vederlag.ts';
import {
  avvisUkjenteFelt,
  hjemmelenGjelder,
  laget,
  plassene,
  type Plass,
  type Svarinnhold,
  type Svarsfrysing,
  type Svarsutregning,
  type Svarvurdering,
} from '../../frosset/byggeklosser.ts';
import {
  krevdIKravposten,
  krevdProduktivitet,
  kravposterI,
  utregningIVederlaget,
} from './format.ts';
import { erKravpostvarselhjemmel } from '../../typer.ts';
import type {
  Hjemmel,
  Krav,
  Kravpost,
  Standpunkt,
  Standpunktsvirkning,
  Utfall,
  Virkning,
} from '../../typer.ts';
import { kategori } from '../forhold/format.ts';

/**
 * OV-U27, OV-U33, KA-U60, KA-U64: lagene i vederlaget. Påberopelsen etter § 34.1.2 gjelder hele
 * kravet og står i det første laget. I laget etter står begrensningen etter § 34.1.3, som bare
 * rammer den særskilte posten: den står i laget etter (arbeidsvalg 1.3 i spørsmålsfila 09.11
 * for #1663). Et tilbud som ikke er akseptert, gir ikke et eget lag, fordi svaret da ikke tar
 * stilling til beløpet (KA-U72): standpunktene for posten står i det første laget. En post som
 * ingen innsigelse rammer, er upåvirket, så sant
 * forholdet verken er avslått eller prekludert (OV-U33), og ellers i laget etter § 34.1.2
 * (arbeidsvalg 1.1).
 */
function vederlagsvirkninger(
  svar: Svarinnhold,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number
): Standpunktsvirkning[] {
  const sent = (hjemmel: Hjemmel) =>
    svar.standpunkter.some(
      (s) =>
        s.art === 'rettidighet' &&
        s.hjemmel === hjemmel &&
        !s.iTide &&
        hjemmelenGjelder(hjemmel, paaberopelse, regler)
    );
  const [hele, posten] = [sent('34.1.2'), sent('34.1.3')];
  const foerste = hele ? 2 : 1;
  const iKravposten = beregningsregelLag(svar.standpunkter, foerste);
  // Et tilbud byggherren ikke aksepterer, rammer bare posten, i det første laget (#1760).
  const tilbudet = new Set(
    svar.standpunkter.flatMap((s) =>
      s.art === 'oppgjoersform' && s.hjemmel === '34.2.2' && !s.aksepterer ? [s.gjelder] : []
    )
  );
  // OV-U33: upåvirket bare ved en påberopelse i sporet. Innsigelsen etter § 34.3.3, en
  // beregningsregel byggherren ikke godtar og et tilbud byggherren ikke aksepterer, rammer bare
  // posten (arbeidsvalg 1 punkt 2 i spørsmålsfila 09.11 for #1663, #1760).
  const rammer =
    posten ||
    tilbudet.size > 0 ||
    svar.standpunkter.some(
      (s) =>
        iKravposten.has(s.id) &&
        ((s.art === 'rettidighet' && s.hjemmel === '34.3.3') ||
          (s.art === 'oppgjoersform' && !s.aksepterer))
    );
  const ellers: Virkning = rammer && !hele && forskyvning === 0 ? 'upaavirket' : foerste;
  return svar.standpunkter.map((s): Standpunktsvirkning => {
    const virkning = (): Virkning => {
      if (iKravposten.has(s.id)) return iKravposten.get(s.id)!;
      if (s.art === 'rettidighet') {
        if (s.hjemmel === '34.1.2') return hele ? 1 : 'uten_virkning';
        return s.hjemmel === '34.1.3' && posten ? foerste : 'uten_virkning';
      }
      if ('gjelder' in s && s.gjelder !== undefined && tilbudet.has(s.gjelder)) return foerste;
      if (s.art === 'beloep' && s.saerskilt) return posten ? foerste + 1 : ellers;
      return ellers;
    };
    return { standpunkt: s.id, art: s.art, virkning: virkning() };
  });
}

/**
 * Laget for standpunktene til en kravpost etter en beregningsregel, etter `lagIKravposten`.
 * En kravpost der ingen standpunkter åpner et lag, er ikke med, og standpunktene står som de
 * andre. Forutsetningene i skjemaet leser lagene herfra (`spor/vederlag/kommando.ts`).
 */
export function beregningsregelLag(
  standpunkter: Standpunkt[],
  foerste: number
): Map<string, number> {
  const ut = new Map<string, number>();
  for (const regel of standpunkter) {
    if (regel.art !== 'oppgjoersform' || regel.hjemmel === '34.2.2') continue;
    const alle = standpunkter.filter((s) => (s as { gjelder?: string }).gjelder === regel.gjelder);
    const varselet = alle.find((s) => s.art === 'rettidighet' && s.hjemmel === '34.3.3');
    const justeringen = alle.find((s) => s.art === 'justering');
    const lag = lagIKravposten(
      {
        godtarRegelen: regel.aksepterer,
        varselForSent: varselet?.art === 'rettidighet' && !varselet.iTide,
        justering: justeringen !== undefined,
      },
      foerste
    );
    if (!lag) continue;
    const sett = (s: Standpunkt | undefined, l: number | null) => {
      if (s && l !== null) ut.set(s.id, l);
    };
    sett(regel, lag.regelen);
    sett(varselet, lag.varselet);
    sett(justeringen, lag.justeringen);
    sett(
      alle.find((s) => s.art === 'beloep'),
      lag.beloepet
    );
  }
  return ut;
}

/** Begrensningen etter § 34.1.3 har virkning i svaret (VS-U5, OV-U22). */
export function begrensningen(svar: Svarinnhold, v: Standpunktsvirkning[]) {
  return svar.standpunkter.find(
    (s): s is Extract<Standpunkt, { art: 'rettidighet' }> =>
      s.art === 'rettidighet' &&
      s.hjemmel === '34.1.3' &&
      v.some((p) => p.standpunkt === s.id && laget(p.virkning) !== null)
  );
}

/**
 * OV-U26, OV-U28: en post i byggherrens svar på vederlaget. `godkjent` er beløpet uten
 * begrensningen etter § 34.1.3. `begrensning` står bare når begrensningen har virkning i
 * brevet (VS-U5, OV-U22), med beløpet etter den og laget den står i.
 */
export interface Vederlagspost extends Plass {
  standpunkt: string;
  /** Kravposten beløpet gjelder (KA-U57 (c)); ikke for posten etter § 34.1.3 annet ledd. */
  gjelder?: string;
  saerskilt?: 'produktivitet';
  /** Uten beløp når tilbudet for kravposten ikke er akseptert (KA-U72). */
  godkjent?: number;
  begrensning: (Plass & { standpunkt: string; beloep: number }) | null;
}

/**
 * MM-U23, HF-U2: byggherrens påberopelse av at et varsel kom for sent, som byggherren sa den.
 * `begrenset` er beløpet byggherren oppga etter § 34.1.3. Laget er `null` når påberopelsen er
 * uten virkning; den gir da ingen post et annet beløp.
 */
export interface Paaberopt extends Plass {
  standpunkt: string;
  hjemmel: Hjemmel;
  begrenset?: number;
}

/**
 * Postene og påberopelsene i svaret på vederlaget, med lagene brevet ga dem (MM-U23, OV-U28,
 * valg 4 i #1047, `plassene`). Ingen total per lag.
 */
export function postlisten(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  forskyvning: number
): { poster: Vederlagspost[]; paaberopt: Paaberopt[] } {
  const plass = plassene(svar, v, forskyvning).standpunkt;
  const begrenset = begrensningen(svar, v);
  const poster = svar.standpunkter.flatMap((s): Vederlagspost[] =>
    s.art !== 'beloep'
      ? []
      : [
          {
            standpunkt: s.id,
            ...(s.gjelder !== undefined ? { gjelder: s.gjelder } : {}),
            ...(s.saerskilt ? { saerskilt: s.saerskilt } : {}),
            ...(s.godkjent !== undefined ? { godkjent: s.godkjent } : {}),
            ...plass(s.id),
            begrensning:
              s.saerskilt && begrenset
                ? { standpunkt: begrenset.id, beloep: begrenset.begrenset!, ...plass(begrenset.id) }
                : null,
          },
        ]
  );
  const paaberopt = svar.standpunkter.flatMap((s): Paaberopt[] =>
    s.art !== 'rettidighet' || s.iTide
      ? []
      : [
          {
            standpunkt: s.id,
            hjemmel: s.hjemmel,
            ...(s.begrenset !== undefined ? { begrenset: s.begrenset } : {}),
            ...plass(s.id),
          },
        ]
  );
  return { poster, paaberopt };
}

/**
 * Det byggherren godtar prinsipalt i vederlaget, av postene og lagene i brevet (OV-U26,
 * OV-U27): posten etter § 34.1.3 annet ledd med beløpet etter en virksom begrensning. En
 * kravpost med beløpet i et senere lag, eller uten beløp fordi tilbudet ikke er akseptert
 * (KA-U72), har ikke et fast beløp i det første og regnes ikke med (OV-U73). `uten_fast_beloep` er de kravpostene, så beløpet ikke leses som et avslag
 * (svar 6 A i #1663).
 */
function prinsipaltIVederlaget(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  let beloepet = 0n;
  const uten: string[] = [];
  for (const p of postlisten(svar, v, 0).poster) {
    if (p.begrensning) beloepet += beloep(p.begrensning.beloep)!;
    else if (!p.saerskilt && ((p.lag ?? 1) > 1 || p.godkjent === undefined)) uten.push(p.gjelder!);
    else beloepet += beloep(p.godkjent)!;
  }
  return { beloep: tilTall(beloepet), ...(uten.length ? { uten_fast_beloep: uten } : {}) };
}

/**
 * Byggherren aksepterer ikke tilbudet eller godtar ikke beregningsregelen for minst én kravpost
 * (§ 34.2.2, KA-U57 (d), KA-U71).
 */
export const tilbudetIkkeAkseptert = (svar: Svarinnhold): boolean =>
  svar.standpunkter.some((s) => s.art === 'oppgjoersform' && !s.aksepterer);

/**
 * Svaret godkjenner hele kravet i vederlaget, når ingen påberopelse i første lag avviser det
 * (`godkjennerHeleKravet` i `frosset/standpunkt.ts`).
 */
function godkjennerHeleKravet(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  // Arbeidsvalget i #479: et tilbud byggherren ikke aksepterer (§ 34.2.2) gir aldri
  // sammenfall. Leses av standpunktene.
  if (tilbudetIkkeAkseptert(svar)) return false;
  // HF-U28, D-17 i BF-14: en innsigelse etter § 34.3.3 eller § 34.4 eller en bestridt justering
  // gir ikke sammenfall (arbeidsvalg 2 i spørsmålsfila 09.11 for #1663).
  if (
    svar.standpunkter.some(
      (s) =>
        (s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel) && !s.iTide) ||
        (s.art === 'justering' && !s.godtar)
    )
  )
    return false;
  // HF-U7: en begrensning etter § 34.1.3 i et lag er en påberopelse med subsidiært standpunkt
  // og gir ikke sammenfall, også når beløpet etter den er likt det krevde (VS-U5).
  if (begrensningen(svar, v)) return false;
  return utregningIVederlaget(svar.utregning).resultat === 'godkjent';
}

export const FRYSING_I_VEDERLAGET = {
  virkninger: vederlagsvirkninger,
  utfall: (svar, v, prekludert) => (prekludert ? { beloep: 0 } : prinsipaltIVederlaget(svar, v)),
  godkjennerHeleKravet,
  vilkaar: 'forhold_avklart',
  hvertITideGirOppInnsigelsen: false,
} satisfies Svarsfrysing;

// ---------- Utregningen av svaret (B-13) ----------

/** Vurderingene i vederlaget kjernen ennå ikke har et standpunkt for (`utenforOmfanget`). */
function utenforOmfanget(v: Record<string, unknown>): string | null {
  if (v.hold_tilbake === true) return 'tilbakeholdelse (§ 30.2) er ikke i kjernen ennå';
  // MM-U2: en annen verdi enn et tomt felt eller `false` forenkles ikke til «ingen tilbakeholdelse».
  if ((v.hold_tilbake ?? false) !== false) return 'hold_tilbake er verken true eller false';
  // Rigg og drift etter § 34.1.3 første ledd er ikke i kjernens svar ennå (#1663).
  if ((v.rigg_vurdering ?? null) !== null)
    return 'kravet om rigg og drift (§ 34.1.3 første ledd) er ikke i kjernen ennå';
  return null;
}

/** Feltene kjernen leser i vurderingene i svaret på vederlaget. */
const VEDERLAGSVURDERINGER = new Set<string>([
  'hovedkrav_varslet_i_tide',
  'kravposter',
  'produktivitet_vurdering',
  'produktivitet_godkjent_beloep',
  'produktivitet_varslet_i_tide',
  'produktivitet_begrenset_beloep',
  // Avvises med egne meldinger: `utenforOmfanget` og OV-U89 punkt 9 i `regler/vederlag.ts`.
  'hold_tilbake',
  'rigg_vurdering',
  'rigg_varslet_i_tide',
]);

/** Byggherrens svar på én kravpost i kommandoen. `gjelder` er kravpostens `id`. */
export interface Kravpostvurdering {
  gjelder?: unknown;
  vurdering?: unknown;
  godkjent_beloep?: unknown;
  /** Om byggherren aksepterer tilbudet eller godtar beregningsregelen (KA-U57 (d), KA-U54). */
  aksepterer?: unknown;
  oensket_oppgjoersform?: unknown;
  /** Kravet om spesifisert tilbud etter § 34.2.1 (KA-U69, KA-U71). */
  krever_tilbud?: unknown;
  /** Standpunktet til varselet etter § 34.3.3 eller § 34.4 for kravposten (KA-U64). */
  varslet_i_tide?: unknown;
  /** Standpunktet til justeringen etter § 34.3.2 (KA-U68). */
  godtar_justering?: unknown;
}

const KRAVPOSTVURDERINGER = new Set<string>([
  'gjelder',
  'vurdering',
  'godkjent_beloep',
  'aksepterer',
  'oensket_oppgjoersform',
  'krever_tilbud',
  'varslet_i_tide',
  'godtar_justering',
]);

/**
 * Svaret på hver kravpost i kravet, i kravets rekkefølge. En kravpost uten svar får en tom
 * vurdering, så regelen sier hva som mangler. Feilene står på `kravposter`, eller på
 * `<betegnelse>.<felt>` for kravposten. Kaster `UgyldigVurdering` for et svar på en kravpost
 * kravet ikke har (OV-U23), et svar på samme kravpost to ganger og et felt kjernen ikke leser
 * (MM-U2).
 */
export function kravpostvurderinger(
  v: Svarvurdering,
  krav: Krav
): { post: Kravpost; svar: Kravpostvurdering }[] {
  const poster = kravposterI(krav);
  if (v.kravposter == null) return poster.map((post) => ({ post, svar: {} }));
  if (!Array.isArray(v.kravposter) || v.kravposter.some((p) => typeof p !== 'object' || !p))
    throw new UgyldigVurdering({ kravposter: 'er ikke en liste med svar på kravpostene' });
  const svarene = new Map<unknown, Kravpostvurdering>();
  for (const p of v.kravposter as Kravpostvurdering[]) {
    const post = poster.find((k) => k.id === p.gjelder);
    if (!post)
      throw new UgyldigVurdering({
        kravposter: `kravet har ikke kravposten «${String(p.gjelder)}» (OV-U23)`,
      });
    if (svarene.has(post.id))
      throw new UgyldigVurdering({ [post.betegnelse]: 'er besvart mer enn én gang' });
    const ukjent = Object.keys(p).find((felt) => !KRAVPOSTVURDERINGER.has(felt));
    if (ukjent)
      throw new UgyldigVurdering({
        [`${post.betegnelse}.${ukjent}`]: 'kjernen leser ikke feltet i svaret på kravposten',
      });
    svarene.set(post.id, p);
  }
  return poster.map((post) => ({ post, svar: svarene.get(post.id) ?? {} }));
}

/**
 * Standpunktene for en kravpost etter en beregningsregel som regelen regner lagene av, eller
 * `undefined` for en kravpost med fast sum (OV-U95 punkt 5, KA-U64, KA-U68).
 */
function beregningsregelen(post: Kravpost, svar: Kravpostvurdering) {
  if (post.oppgjoersform === 'tilbud') return undefined;
  return {
    varselForSent: post.oppgjoersform === 'enhetspriser' && svar.varslet_i_tide === false,
    justering: typeof svar.godtar_justering === 'boolean' ? svar.godtar_justering : null,
  };
}

/** Feltene i kommandoen for posten etter § 34.1.3 annet ledd; feilene fra regelen føres tilbake til dem. */
const PRODUKTIVITETSFELT = {
  vurdering: 'produktivitet_vurdering',
  godkjent_beloep: 'produktivitet_godkjent_beloep',
  varslet_i_tide: 'produktivitet_varslet_i_tide',
  begrenset_beloep: 'produktivitet_begrenset_beloep',
} as const;

/** Svaret i kommandoen som postene regelen regner over, og feltet i kommandoen for hver feil. */
function svaretFraVurderingene(
  v: Svarvurdering,
  krav: Krav,
  hovedkategori: string | null
): { svar: Vederlagssvar; felt: Map<string, string> } {
  const felt = new Map<string, string>([['varslet_i_tide', 'hovedkrav_varslet_i_tide']]);
  const poster: Postsvar[] = [];
  const knytt = (navn: string, felter: Record<string, string>) => {
    for (const [i, ut] of Object.entries(felter)) felt.set(`${navn}.${i}`, ut);
  };
  for (const { post, svar } of kravpostvurderinger(v, krav)) {
    for (const f of ['vurdering', 'godkjent_beloep', 'aksepterer'])
      felt.set(`${post.id}.${f}`, `${post.betegnelse}.${f}`);
    const regel = beregningsregelen(post, svar);
    poster.push({
      gjelder: post.id,
      krevd: tilTall(krevdIKravposten(krav, post) ?? 0n),
      vurdering: svar.vurdering as Beloepsvurdering | undefined,
      godkjent_beloep: svar.godkjent_beloep as number | undefined,
      aksepterer: svar.aksepterer as boolean | undefined,
      ...(regel ? { beregningsregel: regel } : {}),
    });
  }
  const produktivitet = krevdProduktivitet(krav);
  if (produktivitet !== null) {
    knytt('produktivitet', PRODUKTIVITETSFELT);
    poster.push({
      saerskilt: 'produktivitet',
      krevd: tilTall(produktivitet),
      vurdering: v.produktivitet_vurdering as Beloepsvurdering | undefined,
      godkjent_beloep: v.produktivitet_godkjent_beloep as number | undefined,
      varslet_i_tide: v.produktivitet_varslet_i_tide as boolean | undefined,
      begrenset_beloep: v.produktivitet_begrenset_beloep as number | undefined,
    });
  }
  // OV-U89 punkt 9: rigg og drift er ikke i kjernens svar (`utenforOmfanget`), men en
  // påberopelse etter § 34.1.3 mot den avvises i regelen. Regelen kaster alltid for posten,
  // så beløpet og vurderingen her når aldri utregningen.
  if (v.rigg_varslet_i_tide != null) {
    knytt('rigg_og_drift', { varslet_i_tide: 'rigg_varslet_i_tide' });
    poster.push({
      saerskilt: 'rigg_og_drift',
      krevd: 0,
      vurdering: 'avslaatt',
      varslet_i_tide: v.rigg_varslet_i_tide,
    });
  }
  return {
    svar: {
      hovedkategori,
      varslet_i_tide: v.hovedkrav_varslet_i_tide as boolean | undefined,
      poster,
    },
    felt,
  };
}

/** Utregningen av vederlaget av postene i kravet (§ 34). */
function regnUtVederlag(
  v: Svarvurdering,
  krav: Krav,
  paaberopelse: Krav | null,
  regler: Regelsett
): Record<string, unknown> {
  avvisUkjenteFelt(v, VEDERLAGSVURDERINGER, 'vederlaget');
  const tilbakeholdelse = utenforOmfanget({ hold_tilbake: v.hold_tilbake });
  if (tilbakeholdelse) throw new UgyldigVurdering({ hold_tilbake: tilbakeholdelse });
  // OV-U23, OV-U26: byggherren tar stilling til postene kravet har, og bare dem (#520), og
  // til oppgjørsformen bare for en kravpost (KA-U57 (d)), i `kravpostvurderinger`.
  const produktivitet: (keyof Svarvurdering)[] = [
    'produktivitet_vurdering',
    'produktivitet_godkjent_beloep',
    'produktivitet_varslet_i_tide',
    'produktivitet_begrenset_beloep',
  ];
  if (krevdProduktivitet(krav) === null)
    for (const felt of produktivitet)
      if (v[felt] != null)
        throw new UgyldigVurdering({ [felt]: 'kravet har ikke denne posten (OV-U23)' });
  const { hovedkategori } = kategori(paaberopelse);
  kontrollerVarseletForVederlag(v, hovedkategori, regler);
  for (const { post, svar } of kravpostvurderinger(v, krav))
    kontrollerOppgjoersformen(post.betegnelse, svar, post);
  const { svar, felt } = svaretFraVurderingene(v, krav, hovedkategori);
  let r: Vederlagsberegning;
  try {
    r = beregnVederlag(svar, regler);
  } catch (e) {
    if (!(e instanceof UgyldigVurdering)) throw e;
    throw new UgyldigVurdering({
      ...Object.fromEntries(Object.entries(e.feil).map(([k, grunn]) => [felt.get(k) ?? k, grunn])),
    });
  }
  const ut: Record<string, unknown> = {
    resultat: r.beregnings_resultat,
    godkjent_beloep: tilTall(r.total_godkjent_beloep),
    // OV-U31, KA-U57 (e): beløpet for hver post i hvert lag, uten beløp når posten ikke har et
    // fast beløp i laget (KA-U72). Totalene over er summen av det første og det siste laget.
    poster: r.poster.map(({ post, lag }) => ({
      ...('gjelder' in post ? { gjelder: post.gjelder } : { saerskilt: post.saerskilt }),
      lag: lag.map((l) => ({
        lag: l.lag,
        ...(l.beloep === null ? {} : { beloep: tilTall(l.beloep) }),
      })),
    })),
  };
  // VS-U3, B-13: ved preklusjon etter § 34.1.2 og ved begrensningen etter § 34.1.3 (VS-U5)
  // står det vurderte beløpet subsidiært.
  if (r.subsidiaer_resultat !== null) {
    ut.subsidiaert_resultat = r.subsidiaer_resultat;
    ut.subsidiaert_godkjent_beloep = tilTall(r.subsidiaer_godkjent_beloep!);
  }
  return ut;
}

/**
 * OV-U26, OV-U31: beløpet byggherren godtar for hver post i vederlagskravet uten
 * begrensningen etter § 34.1.3, i rekkefølgen brevet lagrer dem: kravpostene (`gjelder`), med
 * svaret på hver, og posten etter annet ledd (`saerskilt`). Regnet med regelsettet som utregningen.
 */
export function vederlagsposter(
  v: Svarvurdering,
  krav: Krav
): (
  | { godkjent: number | null; gjelder: string; svar: Kravpostvurdering }
  | { godkjent: number; saerskilt: 'produktivitet' }
)[] {
  const post = (vurdering: unknown, krevd: Oere, delvis: unknown) =>
    tilTall(
      beregnGodkjentBeloep(
        vurdering as Beloepsvurdering,
        krevd,
        beloep(delvis as number | null | undefined)
      )
    );
  const produktivitet = krevdProduktivitet(krav);
  return [
    ...kravpostvurderinger(v, krav).map(({ post: k, svar }) => ({
      // En kravpost der tilbudet ikke er akseptert (KA-U72), eller etter en beregningsregel
      // (OV-U95 punkt 5), får ikke beløp.
      godkjent:
        svar.aksepterer === false || k.oppgjoersform !== 'tilbud'
          ? null
          : post(svar.vurdering, krevdIKravposten(krav, k)!, svar.godkjent_beloep),
      gjelder: k.id,
      svar,
    })),
    ...(produktivitet === null
      ? []
      : [
          {
            godkjent: post(
              v.produktivitet_vurdering,
              produktivitet,
              v.produktivitet_godkjent_beloep
            ),
            saerskilt: 'produktivitet' as const,
          },
        ]),
  ];
}

/** Feltene klienten skal ha regnet likt med serveren (`SAMMENLIKNES`). */
export const SAMMENLIKNES_I_VEDERLAGET = ['resultat', 'godkjent_beloep'];

export const UTREGNING_I_VEDERLAGET = {
  regnUt: (v, { krav, paaberopelse }, regler) => regnUtVederlag(v, krav, paaberopelse, regler),
  utenforOmfanget,
} satisfies Svarsutregning;
