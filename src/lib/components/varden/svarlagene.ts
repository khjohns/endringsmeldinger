/**
 * Lagene i byggherrens svar på et krav om vederlag eller frist, slik brevet ga dem (OV-U32,
 * OV-U33, KA-U78): etiketten, innsigelsene laget gjelder hvis ikke fører frem, grunnene fra svaret
 * på forholdet og standpunktene i laget. Sidene for vederlaget og fristen legger til beløpet eller
 * dagene. Modulen avgjør ingenting selv.
 */

import { grunnerFraForholdet } from '#kjerne/spor/forhold/frysing.ts';
import { etikett, plassene } from '#kjerne/frosset/byggeklosser.ts';
import { FORBEHOLDET } from '#kjerne/frosset/tekst.ts';
import type { Subsidiaergrunn } from '#kjerne/regler/forhold.ts';
import type { ForutsetningIForholdet } from '#kjerne/spor/forhold/format.ts';
import type { InnsigelseIFristen } from '#kjerne/spor/frist/format.ts';
import {
  kravposterI,
  rammerPosten,
  type InnsigelseIVederlaget,
} from '#kjerne/spor/vederlag/format.ts';
import type { PostenISvaret } from '#kjerne/frosset/brevdeler.ts';
import type { Standpunkt, Standpunktsart, Svar } from '#kjerne/typer.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import type { Brevet, Brevref } from './lesing';

/**
 * En innsigelse et senere lag bygger på. `gjelder` er kravposten et varsel etter § 34.3.3 eller
 * beregningsregelen gjelder, og innsigelsen rammer bare standpunktene til den (OV-U117).
 */
export type Innsigelsen =
  | { art: 'grunn'; grunn: Subsidiaergrunn; brev: Brevet }
  | { art: 'varsel'; hjemmel: string; gjelder?: string }
  | { art: 'beregningsregel'; gjelder: string }
  | { art: 'spesifisering' }
  | { art: 'hindring' };

/** En innsigelse i et lag, med postene den rammer (OV-U117). */
export interface InnsigelsenILaget {
  innsigelse: Innsigelsen;
  rammer(post: PostenISvaret): boolean;
}

export interface Svarlaget {
  lag: number;
  /** «prinsipalt», «subsidiært» eller «videre subsidiært», og `null` når svaret har ett lag. */
  etikett: string | null;
  /** Laget i utregningen for sporet, som ikke har grunnene fra forholdet; under 1 for en grunn. */
  iSporet: number;
  /**
   * Innsigelsene i laget foran som laget gjelder hvis ikke fører frem (OV-U32), uten en som bare
   * rammer noen av kravpostene (OV-U117) og uten beregningsregelen, som står ved posten (`postvilkaar` i
   * oversikten, svar A 24.11 i #2242). Vilkåret for ett standpunkt gir `vilkaaretFor`.
   */
  vilkaar: Innsigelsen[];
  /** Innsigelsene standpunktene og grunnene i laget er, som et senere lag kan bygge på. */
  innsigelsene: InnsigelsenILaget[];
  /** Et lag foran har vilkår, så vilkåret i laget sier «heller ikke» (LV-U4 punkt 4, #2280). */
  heller: boolean;
  /** Grunnene fra svaret på forholdet i laget (OV-U33), med brevet de står i. */
  grunner: { grunn: Subsidiaergrunn; brev: Brevet }[];
  /** Standpunktene i laget utenom beløpet eller dagene, med brevet en påberopelse gjelder. */
  standpunkter: { standpunkt: Standpunkt; brev: Brevref | null }[];
}

/**
 * Det et standpunkt i et tidligere lag rammer et senere lag med, etter sporet i kjernen:
 * `innsigelsenIVederlaget` eller `innsigelsenIFristen` (#2280).
 */
export type InnsigelsenISporet = (
  s: Standpunkt
) => InnsigelseIVederlaget | InnsigelseIFristen | ForutsetningIForholdet | null;

/**
 * Innsigelsen et standpunkt i et lag er, som et senere lag gjelder hvis ikke fører frem, med
 * postene den rammer: i vederlaget etter `rammerPosten` i kjernen, og et standpunkt om hele
 * kravet (`undefined`) rammes av alle, som `vilkaaret` i brevteksten. I fristen og forholdet
 * rammer innsigelsen hele kravet (KA-U78).
 */
function innsigelsen(
  s: Standpunkt,
  innsigelsenI: InnsigelsenISporet,
  vederlag: boolean
): InnsigelsenILaget[] {
  const i = innsigelsenI(s);
  if (i === null) return [];
  const rammer = vederlag
    ? (post: PostenISvaret) => post === undefined || rammerPosten(i as InnsigelseIVederlaget, post)
    : () => true;
  const som = (innsigelse: Innsigelsen): InnsigelsenILaget[] => [{ innsigelse, rammer }];
  if ('oppgjoersform' in i) return som({ art: 'beregningsregel', gjelder: i.oppgjoersform });
  if (!('innsigelse' in i)) return [];
  if (i.innsigelse === '33.6.1') return som({ art: 'spesifisering' });
  if (i.innsigelse === 'hindring') return som({ art: 'hindring' });
  return som({
    art: 'varsel',
    hjemmel: i.innsigelse,
    ...(i.innsigelse === '34.3.3' ? { gjelder: i.gjelder } : {}),
  });
}

const bareNoenAv = (poster: string[], x: InnsigelsenILaget) => {
  const treff = poster.filter((p) => x.rammer(p)).length;
  return treff > 0 && treff < poster.length;
};

export interface Vilkaaret {
  vilkaar: Innsigelsen[];
  heller: boolean;
}

/**
 * Vilkåret for et standpunkt om posten `post` i laget `lag` (LV-U79, LV-U34, OV-U117): innsigelsene
 * i det nærmeste laget foran som rammer posten, med «heller ikke» fra tredje lag, som lagslinjen i
 * brevet. `null` når ingen innsigelse foran rammer posten.
 */
export function vilkaaretFor(
  lagene: readonly Svarlaget[],
  lag: number,
  post: PostenISvaret
): Vilkaaret | null {
  for (let foran = lag - 1; foran >= 1; foran--) {
    const vilkaar = lagene[foran - 1]!.innsigelsene.flatMap((x) =>
      x.rammer(post) ? [x.innsigelse] : []
    );
    if (vilkaar.length) return { vilkaar, heller: lag > 2 };
  }
  return null;
}

/**
 * Lagene i svaret: grunnene fra svaret på forholdet først, og så lagene i sporet (OV-U73, HF-U34).
 * `sporlag` er antallet lag i utregningen for sporet, og `utenom` standpunktet med beløpet eller
 * dagene, som siden viser selv. `alle` er brevene i saken (`brevene(u)`).
 */
export function lageneISvaret(
  u: Utledning,
  svar: Svar,
  alle: Brevet[],
  sporlag: number,
  utenom: Standpunktsart,
  innsigelsenI: InnsigelsenISporet,
  forholdssvaret?: Svar | null
): Svarlaget[] {
  const brev = (id: string) => alle.find((b) => b.id === id) ?? null;
  const beregning = u.svar[svar.id];
  // Svaret på forholdet kalleren har slått opp, for et svar uten beregning (`standpunktene`).
  const g =
    forholdssvaret !== undefined
      ? forholdssvaret
      : beregning?.forholdssvaret
        ? u.svar[beregning.forholdssvaret].svar
        : null;
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const grunnbrev = g ? brev(g.dokument) : null;
  const plass = plassene(svar, svar.beslutningsgrunnlag.virkninger, grunner.length);
  const antall = Math.max(
    grunner.length + sporlag,
    ...svar.standpunkter.map((x) => plass.standpunkt(x.id).lag ?? 0)
  );
  // Påberopelsen gjelder et krav eller et varsel i sporet; brevet er det kravet eller varselet står i.
  const paaberopt = (gjelder: string) => {
    const k = u.spor[svar.spor].krav.find((x) => x.id === gjelder);
    if (k) return brev(k.dokument);
    const h = u.journal.find(
      (x) => x.art === 'dokument' && x.dokument.utsagn.some((y) => y.id === gjelder)
    );
    return h?.art === 'dokument' ? brev(h.dokument.id) : null;
  };
  const lagene: Svarlaget[] = Array.from({ length: antall }, (_, i) => {
    const lag = i + 1;
    return {
      lag,
      etikett: antall > 1 ? etikett(lag) : null,
      iSporet: lag - grunner.length,
      vilkaar: [],
      innsigelsene: [],
      heller: false,
      grunner: lag <= grunner.length && grunnbrev ? [{ grunn: grunner[i]!, brev: grunnbrev }] : [],
      standpunkter: svar.standpunkter
        .filter((x) => x.art !== utenom && plass.standpunkt(x.id).lag === lag)
        .map((x) => ({
          standpunkt: x,
          brev: x.art === 'rettidighet' && 'gjelder' in x ? paaberopt(x.gjelder) : null,
        })),
    };
  });
  // En innsigelse som rammer noen av kravpostene, men ikke alle, er ikke vilkår for hele laget (OV-U117).
  const krav = u.spor[svar.spor].krav.find((k) => k.id === svar.gjelder);
  const poster = svar.spor === 'vederlag' && krav ? kravposterI(krav).map((p) => p.id) : [];
  for (const l of lagene) l.innsigelsene = innsigelseneI(l, innsigelsenI, svar.spor === 'vederlag');
  for (const l of lagene.slice(1)) {
    l.vilkaar = lagene[l.lag - 2]!.innsigelsene.flatMap((x) =>
      x.innsigelse.art !== 'beregningsregel' && !bareNoenAv(poster, x) ? [x.innsigelse] : []
    );
    l.heller = lagene.slice(1, l.lag - 1).some((x) => x.vilkaar.length > 0);
  }
  return lagene;
}

/** Standpunktene uten eget lag, som at fremdriften er hindret (OV-U42), utenom `utenom`. */
export const utenLag = (svar: Svar, utenom: Standpunktsart): Standpunkt[] => {
  const virkning = new Map(svar.beslutningsgrunnlag.virkninger.map((v) => [v.standpunkt, v]));
  return svar.standpunkter.filter(
    (s) => s.art !== utenom && virkning.get(s.id)?.virkning === 'uten_virkning'
  );
};

/** Innsigelsene i laget: grunnene fra forholdet, som rammer hele kravet, og standpunktene. */
const innsigelseneI = (
  l: Svarlaget,
  innsigelsenI: InnsigelsenISporet,
  vederlag: boolean
): InnsigelsenILaget[] => [
  ...l.grunner.map((x) => ({ innsigelse: { art: 'grunn' as const, ...x }, rammer: () => true })),
  ...l.standpunkter.flatMap(({ standpunkt }) => innsigelsen(standpunkt, innsigelsenI, vederlag)),
];

/**
 * Svaret ble gitt mens forholdet ikke var besvart, og brevet har punktet med forbeholdet (GR-U34):
 * brevet hadde ikke noe svar på forholdet foran seg.
 */
export const medForbehold = (u: Utledning, svar: Svar, svarbrev: Brevet): boolean =>
  u.svar[svar.id]?.forholdssvaret === null &&
  svar.paaberopelse !== null &&
  !!svarbrev.avsnitt?.some((a) => a.punkt === FORBEHOLDET);
