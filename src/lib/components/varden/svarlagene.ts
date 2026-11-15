/**
 * Lagene i byggherrens svar på et krav om vederlag eller frist, slik brevet ga dem (OV-U32,
 * OV-U33, KA-U78): etiketten, innsigelsene laget gjelder hvis ikke fører frem, grunnene fra svaret
 * på forholdet og standpunktene i laget. Sidene for vederlaget og fristen legger til beløpet eller
 * dagene. Modulen avgjør ingenting selv.
 */

import { grunnerFraForholdet } from '$kjerne/spor/forhold/frysing';
import { etikett, plassene } from '$kjerne/frosset/byggeklosser';
import { FORBEHOLDET } from '$kjerne/frosset/tekst';
import type { Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { Standpunkt, Standpunktsart, Svar } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Brevet, Brevref } from './lesing';

/** En innsigelse et senere lag bygger på. */
export type Innsigelsen =
  | { art: 'grunn'; grunn: Subsidiaergrunn; brev: Brevet }
  | { art: 'varsel'; hjemmel: string }
  | { art: 'spesifisering' }
  | { art: 'hindring' };

export interface Svarlaget {
  lag: number;
  /** «prinsipalt», «subsidiært» eller «videre subsidiært», og `null` når svaret har ett lag. */
  etikett: string | null;
  /** Laget i utregningen for sporet, som ikke har grunnene fra forholdet; under 1 for en grunn. */
  iSporet: number;
  /** Innsigelsene i laget foran, som laget gjelder hvis ikke fører frem (OV-U32). */
  vilkaar: Innsigelsen[];
  /** Grunnene fra svaret på forholdet i laget (OV-U33), med brevet de står i. */
  grunner: { grunn: Subsidiaergrunn; brev: Brevet }[];
  /** Standpunktene i laget utenom beløpet eller dagene, med brevet en påberopelse gjelder. */
  standpunkter: { standpunkt: Standpunkt; brev: Brevref | null }[];
}

/** Innsigelsen et standpunkt i et lag er, som et senere lag gjelder hvis ikke fører frem. */
function innsigelsen(s: Standpunkt): Innsigelsen[] {
  if (s.art === 'rettidighet' && !s.iTide) return [{ art: 'varsel', hjemmel: s.hjemmel }];
  if (s.art === 'spesifisering' && !s.iTide) return [{ art: 'spesifisering' }];
  if (s.art === 'hindring' && !s.oppfylt) return [{ art: 'hindring' }];
  return [];
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
  utenom: Standpunktsart
): Svarlaget[] {
  const brev = (id: string) => alle.find((b) => b.id === id) ?? null;
  const beregning = u.svar[svar.id];
  const g = beregning?.forholdssvaret ? u.svar[beregning.forholdssvaret].svar : null;
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
      grunner: lag <= grunner.length && grunnbrev ? [{ grunn: grunner[i]!, brev: grunnbrev }] : [],
      standpunkter: svar.standpunkter
        .filter((x) => x.art !== utenom && plass.standpunkt(x.id).lag === lag)
        .map((x) => ({
          standpunkt: x,
          brev: x.art === 'rettidighet' && 'gjelder' in x ? paaberopt(x.gjelder) : null,
        })),
    };
  });
  for (const l of lagene.slice(1)) l.vilkaar = innsigelseneI(lagene[l.lag - 2]!);
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
const innsigelseneI = (l: Svarlaget): Innsigelsen[] => [
  ...l.grunner.map((x): Innsigelsen => ({ art: 'grunn', ...x })),
  ...l.standpunkter.flatMap(({ standpunkt }) => innsigelsen(standpunkt)),
];

/** Innsigelsene i lagene foran laget `lag`, som et standpunkt uten eget lag bygger på (OV-U42). */
export const innsigelseneFoer = (lagene: Svarlaget[], lag: number): Innsigelsen[] =>
  lagene.slice(0, lag - 1).flatMap(innsigelseneI);

/**
 * Svaret ble gitt mens forholdet ikke var besvart, og brevet har punktet med forbeholdet (GR-U34):
 * brevet hadde ikke noe svar på forholdet foran seg.
 */
export const medForbehold = (u: Utledning, svar: Svar, svarbrev: Brevet): boolean =>
  u.svar[svar.id]?.forholdssvaret === null &&
  svar.paaberopelse !== null &&
  !!svarbrev.avsnitt?.some((a) => a.punkt === FORBEHOLDET);

/**
 * Akseptfristen i byggherrens gjeldende svar i sporet, med brevet, så lenge svaret kan godtas: det
 * er ikke godtatt, kravet er ikke trukket, og saken er ikke lukket fordi forholdet er avvist ved
 * enighet (U-11 i BF-44, HF-U23 punkt 4, GR-U27). Ellers `null`.
 */
export function akseptfristen(u: Utledning, spor: 'vederlag' | 'frist') {
  const s = u.spor[spor].gjeldendeSvar;
  const { enighet, trukket } = u.spor[spor];
  return s?.akseptfrist && !enighet && !trukket && !u.forholdAvvist
    ? { brev: s.dokument, dato: s.akseptfrist }
    : null;
}
