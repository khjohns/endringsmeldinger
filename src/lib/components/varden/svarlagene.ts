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
import type { InnsigelseIVederlaget } from '#kjerne/spor/vederlag/format.ts';
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

export interface Svarlaget {
  lag: number;
  /** «prinsipalt», «subsidiært» eller «videre subsidiært», og `null` når svaret har ett lag. */
  etikett: string | null;
  /** Laget i utregningen for sporet, som ikke har grunnene fra forholdet; under 1 for en grunn. */
  iSporet: number;
  /**
   * Innsigelsene i laget foran, som laget gjelder hvis ikke fører frem (OV-U32), uten
   * beregningsregelen. Den står ved posten (`postvilkaar` i oversikten, svar A 24.11 i #2242).
   */
  vilkaar: Innsigelsen[];
  /** Innsigelsene i laget foran med beregningsregelen, for leselinjen til én kravpost (#2338). */
  vilkaarForPosten: Innsigelsen[];
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

/** Innsigelsen et standpunkt i et lag er, som et senere lag gjelder hvis ikke fører frem. */
function innsigelsen(s: Standpunkt, innsigelsenI: InnsigelsenISporet): Innsigelsen[] {
  const i = innsigelsenI(s);
  if (i === null) return [];
  if ('oppgjoersform' in i) return [{ art: 'beregningsregel', gjelder: i.oppgjoersform }];
  if (!('innsigelse' in i)) return [];
  if (i.innsigelse === '33.6.1') return [{ art: 'spesifisering' }];
  if (i.innsigelse === 'hindring') return [{ art: 'hindring' }];
  return [
    {
      art: 'varsel',
      hjemmel: i.innsigelse,
      ...(i.innsigelse === '34.3.3' ? { gjelder: i.gjelder } : {}),
    },
  ];
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
      vilkaarForPosten: [],
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
  for (const l of lagene.slice(1)) {
    l.vilkaarForPosten = innsigelseneI(lagene[l.lag - 2]!, innsigelsenI);
    l.vilkaar = l.vilkaarForPosten.filter((i) => i.art !== 'beregningsregel');
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

/** Innsigelsene i laget: grunnene fra forholdet og standpunktene som rammer kravet. */
const innsigelseneI = (l: Svarlaget, innsigelsenI: InnsigelsenISporet): Innsigelsen[] => [
  ...l.grunner.map((x): Innsigelsen => ({ art: 'grunn', ...x })),
  ...l.standpunkter.flatMap(({ standpunkt }) => innsigelsen(standpunkt, innsigelsenI)),
];

/**
 * Svaret ble gitt mens forholdet ikke var besvart, og brevet har punktet med forbeholdet (GR-U34):
 * brevet hadde ikke noe svar på forholdet foran seg.
 */
export const medForbehold = (u: Utledning, svar: Svar, svarbrev: Brevet): boolean =>
  u.svar[svar.id]?.forholdssvaret === null &&
  svar.paaberopelse !== null &&
  !!svarbrev.avsnitt?.some((a) => a.punkt === FORBEHOLDET);
