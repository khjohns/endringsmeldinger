/**
 * Byggeklossene svaret i hvert spor fryses med: lagene og plassene i brevet, hvilke
 * påberopelser som kan ha virkning, og vurderingene i kommandoen. De felles modulene og
 * sporene bruker dem (#1783).
 */

import { UgyldigVurdering } from '../regler/feil.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { kategori } from '../format/kravinnhold.ts';
import type {
  Hjemmel,
  Krav,
  Standpunkt,
  Standpunktsvirkning,
  Svar,
  Utfall,
  Virkning,
} from '../typer.ts';
import type { Foresporselsrelasjon } from './standpunkt.ts';

/** Det i et svar virkningene regnes av: sporet, standpunktene og serverens utregning. */
export type Svarinnhold = Pick<Svar, 'spor' | 'standpunkter' | 'utregning'>;

/** Varslingsplikten i § 32.2 gjelder kategorien i påberopelsen (GR-U11). */
export function gjelderVarslingsplikten(
  krav: Pick<Krav, 'innhold'> | null | undefined,
  regler: Regelsett
): boolean {
  const { hovedkategori, underkategori } = kategori(krav);
  return regler.gjelderVarslingsplikten(hovedkategori, underkategori);
}

/**
 * VS-U3: påberopelsen etter hjemmelen kan ha virkning for kravet. § 33.4 gjelder
 * alltid i fristen, § 32.2 der varslingsplikten gjelder kategorien, § 34.1.2
 * for svikt og andre forhold byggherren har risikoen for, og § 34.1.3 for forhold
 * etter både § 34.1.1 og § 34.1.2 (#1047, kommentaren 6348199156).
 */
export function hjemmelenGjelder(
  hjemmel: Hjemmel,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett
): boolean {
  if (hjemmel === '33.4' || hjemmel === '33.6.2' || hjemmel === '34.1.3') return true;
  if (hjemmel === '34.1.2')
    return regler.gjelderVarslingspliktenForVederlag(kategori(paaberopelse).hovedkategori);
  return gjelderVarslingsplikten(paaberopelse, regler);
}

export const prinsipalt = (v: Standpunktsvirkning[]) => v.find((p) => p.virkning === 1);

/** Laget i brevet og etiketten for det, eller `null` for et standpunkt uten lag (OV-U32). */
export interface Plass {
  lag: number | null;
  etikett: string | null;
}

/**
 * Plassen hvert standpunkt i svaret har i brevet, og plassen til hver grunn fra svaret på
 * forholdet som står foran sporet (OV-U32, OV-U33). `forskyvning` er lagene de grunnene opptar
 * (`forskyvningIBrevet`), og 0 for forholdet selv. Etiketten følger brevteksten: bare når
 * svaret har mer enn ett lag. `grunn(i)` er den i-te grunnen, fra 0.
 */
export function plassene(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  forskyvning: number
): { standpunkt: (id: string) => Plass; grunn: (i: number) => Plass } {
  const lagI = (id: string) => {
    const virkning = v.find((p) => p.standpunkt === id)?.virkning;
    const lag = virkning === undefined ? null : laget(virkning);
    return lag === null ? null : lag + forskyvning;
  };
  const ordnet = forskyvning > 1 || svar.standpunkter.some((s) => (lagI(s.id) ?? 0) > 1);
  const plass = (lag: number | null): Plass => ({
    lag,
    etikett: ordnet && lag !== null ? etikett(lag) : null,
  });
  return { standpunkt: (id) => plass(lagI(id)), grunn: (i) => plass(i + 1) };
}

export function standpunktet<A extends Standpunkt['art']>(svar: Svarinnhold, art: A) {
  return svar.standpunkter.find((s): s is Extract<Standpunkt, { art: A }> => s.art === art);
}

/** Laget standpunktet står i, eller `null` når det er upåvirket eller uten virkning (OV-U32). */
export const laget = (virkning: Virkning): number | null =>
  typeof virkning === 'number' ? virkning : null;

/**
 * Etiketten for laget, med ordene i LV-U4 punkt 4: «videre subsidiært» for hvert lag fra det
 * tredje. Lik etikett betyr ikke samme lag (OV-U32).
 */
export const etikett = (lag: number): string =>
  lag === 1 ? 'prinsipalt' : lag === 2 ? 'subsidiært' : 'videre subsidiært';

export interface Svarvurdering {
  resultat?: unknown;
  grunnlag_varslet_i_tide?: unknown;
  hovedkrav_varslet_i_tide?: unknown;
  /** Svaret på hver kravpost, som en liste med `Kravpostvurdering` (KA-U57 (c) og (d), KA-U59). */
  kravposter?: unknown;
  produktivitet_vurdering?: unknown;
  produktivitet_godkjent_beloep?: unknown;
  produktivitet_varslet_i_tide?: unknown;
  produktivitet_begrenset_beloep?: unknown;
  rigg_vurdering?: unknown;
  rigg_varslet_i_tide?: unknown;
  hold_tilbake?: unknown;
  frist_varsel_ok?: unknown;
  spesifisert_krav_ok?: unknown;
  foresporsel_svar_ok?: unknown;
  dager_maatte_forstaa?: unknown;
  vilkar_oppfylt?: unknown;
  dager?: unknown;
}

export /**
 * Et felt kjernen ikke leser i vurderingene, ville blitt godtatt uten virkning, så det avvises
 * (MM-U2; kravet i #1663 og #1732).
 */
function avvisUkjenteFelt(v: Svarvurdering, lest: ReadonlySet<string>, svaretPaa: string): void {
  const ukjente = Object.keys(v).filter((felt) => !lest.has(felt));
  if (ukjente.length)
    throw new UgyldigVurdering(
      Object.fromEntries(
        ukjente.map((felt) => [felt, `kjernen leser ikke feltet i svaret på ${svaretPaa}`])
      )
    );
}

/** Frysingen i ett spor, som `frosset/standpunkt.ts` slår opp gjennom `FRYSING` (#1783). */
export interface Svarsfrysing {
  /** Virkningen av hvert standpunkt (`virkninger` i `frosset/standpunkt.ts`). */
  virkninger(
    svar: Svarinnhold,
    paaberopelse: Krav | null | undefined,
    regler: Regelsett,
    forskyvning: number
  ): Standpunktsvirkning[];
  /** Det svaret gir i sporet. `prekludert` er at et standpunkt i første lag avviser kravet. */
  utfall(svar: Svarinnhold, v: Standpunktsvirkning[], prekludert: boolean): Utfall;
  /** Svaret godkjenner hele kravet, når ikke et standpunkt i første lag avviser det. */
  godkjennerHeleKravet(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean;
}

/** Det serverens utregning av svaret regnes av (`regnUtSvar` i `frosset/utregning.ts`). */
export interface Utregningsgrunnlag {
  krav: Krav;
  paaberopelse: Krav | null;
  foresporsel: Foresporselsrelasjon | null;
}

/** Utregningen i ett spor, som `frosset/utregning.ts` slår opp gjennom `UTREGNING` (#1783). */
export interface Svarsutregning {
  /** Serverens utregning av svaret (`regnUtSvar`). */
  regnUt(
    v: Svarvurdering,
    grunnlag: Utregningsgrunnlag,
    regler: Regelsett
  ): Record<string, unknown>;
  /** En vurdering kjernen ennå ikke har et standpunkt for (`utenforOmfanget`). */
  utenforOmfanget(v: Record<string, unknown>): string | null;
}
