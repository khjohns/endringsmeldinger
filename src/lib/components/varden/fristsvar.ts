/**
 * Byggherrens svar på kravet om fristforlengelse i Varden (G-4 i BF-20), i kjernens format.
 * Svaret har ett standpunkt til varselet, forespørselen, hindringen og spesifiseringen for hele
 * kravet, og dagene for hver frist (KA-U74, KA-U80). Resultatet regnes av kjernen
 * (`regnUtSvar`), og er vurderingene ufullstendige, er det tomt, så kjernen avviser kommandoen
 * med sin egen melding før brevet vises.
 */

import { regnUtSvar } from '$kjerne/frosset/utregning';
import type { Svarvurdering } from '$kjerne/frosset/byggeklosser';
import { UgyldigVurdering } from '$kjerne/regler/feil';
import type { Regelsett } from '$kjerne/regler/regelsett';
import type { Svarutkast } from '$kjerne/kommandoer/kommando';
import { innholdIFristen, type FristIKravet } from '$kjerne/spor/frist/format';
import { foresporselForFristsvar } from '$kjerne/spor/frist/utledning';
import type { Utledning } from '$kjerne/utledning/utled';
import { definert } from './kommandoer';

export type Dagevalg = 'alle' | 'deler' | 'avslaatt';

/** Det BH har valgt for én frist. `null` er ikke besvart. */
export interface Fristvalg {
  dager: Dagevalg | null;
  /** Dagene BH godkjenner når BH godkjenner deler av dagene, som BH skrev dem. */
  deldager: string;
  /** Dagene BH måtte forstå at TE hadde krav på, når kravet ble spesifisert for sent (D-5). */
  maatteForstaa: string;
}

/**
 * Det BH har valgt i skjemaet. `null` er ikke besvart; ingenting er forhåndsvalgt (U-14). Svaret
 * på hver frist står under fristens `id` i kravet.
 */
export interface Fristsvarvalg {
  /** Varselet etter punkt 33.4. */
  varselITide: boolean | null;
  /** Svaret på forespørselen etter punkt 33.6.2, når svaret har et standpunkt til det. */
  foresporselITide: boolean | null;
  /** Hindringen etter punkt 33.1 eller 33.3, med begge vilkårene (KA-U81). */
  hindret: boolean | null;
  /** Spesifiseringen etter punkt 33.6.1. */
  spesifisertITide: boolean | null;
  frister: Record<string, Fristvalg>;
  /** Begrunnelsen per punkt i brevet, med punktet som nøkkel (LV-U71). */
  begrunnelser: Record<string, string>;
  /** Byggherrens tekst for hele svaret, under «Forbehold» sist i brevet. */
  forbehold: string;
}

export const tomFrist = (): Fristvalg => ({ dager: null, deldager: '', maatteForstaa: '' });

export const tomtFristsvar = (): Fristsvarvalg => ({
  varselITide: null,
  foresporselITide: null,
  hindret: null,
  spesifisertITide: null,
  frister: {},
  begrunnelser: {},
  forbehold: '',
});

/** Valgene for fristen med `id`, eller en ubesvart frist. */
export const fristvalget = (v: Fristsvarvalg, id: string): Fristvalg => v.frister[id] ?? tomFrist();

/** Et helt antall dager skrevet i et felt, eller `undefined` når feltet er tomt eller ikke kan leses. */
export function heleDager(tekst: string): number | undefined {
  const t = tekst.trim();
  return /^\d+$/.test(t) ? Number(t) : undefined;
}

/** Om svaret tar stilling til forespørselen etter punkt 33.6.2 (VS-U17, VS-U29), med kjernens lesing. */
export const spoerOmForesporselen = (u: Utledning): boolean => foresporselForFristsvar(u) !== null;

/** Dagene BH godkjenner for fristen, eller `undefined` når de ikke er besvart. */
export function godkjenteDager(f: Fristvalg, krevd: number): number | undefined {
  if (f.dager === 'alle') return krevd;
  if (f.dager === 'avslaatt') return 0;
  if (f.dager === 'deler') return heleDager(f.deldager);
  return undefined;
}

/** Én vurdering per frist i kravet, i kravets rekkefølge (`fristvurderinger` i kjernen). */
function vurderingene(
  v: Fristsvarvalg,
  frister: readonly FristIKravet[],
  u: Utledning
): Svarvurdering {
  return definert({
    frist_varsel_ok: v.varselITide ?? undefined,
    foresporsel_svar_ok: spoerOmForesporselen(u) ? (v.foresporselITide ?? undefined) : undefined,
    vilkar_oppfylt: v.hindret ?? undefined,
    spesifisert_krav_ok: v.spesifisertITide ?? undefined,
    frister: frister.map((f) => {
      const valgt = fristvalget(v, f.id);
      return definert({
        dager: godkjenteDager(valgt, f.dager),
        dager_maatte_forstaa:
          v.spesifisertITide === false ? heleDager(valgt.maatteForstaa) : undefined,
      });
    }),
  });
}

/**
 * BHs svar på gjeldende fristkrav, eller `null` når saken ikke har et krav. Begrunnelsen står bare
 * for `punktene` brevet har, så en tekst for et punkt som er falt bort, ikke stopper brevet.
 */
export function fristsvaret(
  v: Fristsvarvalg,
  u: Utledning,
  regler: Regelsett,
  punktene: readonly string[] = []
): { type: 'brev'; svar: Svarutkast[] } | null {
  const krav = u.spor.frist.gjeldendeKrav;
  if (!krav) return null;
  const vurderinger = vurderingene(v, innholdIFristen(krav).frister, u);
  let resultat: Record<string, unknown> = {};
  try {
    resultat = regnUtSvar(
      'frist',
      vurderinger,
      {
        krav,
        paaberopelse: u.spor.forhold.gjeldendeKrav,
        foresporsel: foresporselForFristsvar(u),
      },
      regler
    );
  } catch (feil) {
    if (!(feil instanceof UgyldigVurdering)) throw feil;
  }
  const utdypning = v.forbehold.trim();
  const utdypninger = Object.fromEntries(
    Object.entries(v.begrunnelser)
      .map(([punkt, tekst]) => [punkt, tekst.trim()] as const)
      .filter(([punkt, tekst]) => tekst && punktene.includes(punkt))
  );
  return {
    type: 'brev',
    svar: [
      {
        spor: 'frist',
        gjelder: krav.id,
        regelversjon: regler.versjon,
        vurderinger,
        resultat,
        ...(utdypning ? { utdypning } : {}),
        ...(Object.keys(utdypninger).length ? { utdypninger } : {}),
      },
    ],
  };
}
