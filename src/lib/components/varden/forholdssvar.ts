/**
 * Byggherrens svar på påberopelsen av forholdet i Varden (BF-08, #2009), i kjernens format.
 * Svaret har standpunktet til varselet etter punkt 32.2 der det gjelder, og til forholdet.
 */

import { gjelderVarslingsplikten } from '#kjerne/frosset/byggeklosser.ts';
import type { Svarutkast } from '#kjerne/kommandoer/kommando.ts';
import {
  BEGRUNNELSESPUNKTENE,
  begrunnelseskravet,
  erByggherrensPaalegg,
  gyldigeResultater,
} from '#kjerne/regler/forhold.ts';
import type { Regelsett } from '#kjerne/regler/regelsett.ts';
import type { Forholdsresultat } from '#kjerne/regler/typer.ts';
import { kategori } from '#kjerne/spor/forhold/format.ts';
import { forholdstilfellet, harRisikoen } from '#kjerne/spor/forhold/tekst.ts';
import type { Krav } from '#kjerne/typer.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import { definert, svarbrevet } from './kommandoer';
import { FORHOLDSSVAR } from './tekster';

/** Det BH har valgt i skjemaet. `null` er ikke besvart; ingenting er forhåndsvalgt. */
export interface Forholdssvarvalg {
  /** Gjør BH gjeldende at varselet etter punkt 32.2 kom for sent? */
  forSent: boolean | null;
  resultat: Forholdsresultat | null;
  /** Begrunnelsen per punkt i brevet, med punktet som nøkkel (LV-U71). */
  begrunnelser: Record<string, string>;
  /** Byggherrens tekst for hele svaret, under «Forbehold» sist i brevet. */
  forbehold: string;
  /** U-13 i BF-49, OV-U6: svaret lagt til er byggherrens egen endringsordre etter § 31.3. */
  egenEndringsordre?: boolean;
}

export const tomtForholdssvar = (): Forholdssvarvalg => ({
  forSent: null,
  resultat: null,
  begrunnelser: {},
  forbehold: '',
});

/** Forholdet slik skjemaet trenger det, lest av påberopelsen med kjernens regler. */
export interface Forholdet {
  /** Punkt 32.2 gjelder forholdet, så svaret har punktet om varselet. */
  varslingsplikt: boolean;
  /** Svikt og andre forhold, der svaret sier om byggherren har risikoen (LV-U41). */
  risiko: boolean;
  /** GR-U18: pålegget er byggherrens eget, så frafall er et valg. */
  byggherrensPaalegg: boolean;
  /** Valgene kjernen godtar for forholdet (`gyldigeResultater`). */
  resultater: Forholdsresultat[];
}

export function forholdet(krav: Krav, regler: Regelsett): Forholdet {
  const { hovedkategori, underkategori } = kategori(krav);
  return {
    varslingsplikt: gjelderVarslingsplikten(krav, regler),
    risiko: harRisikoen(krav),
    byggherrensPaalegg: erByggherrensPaalegg(hovedkategori, underkategori),
    resultater: gyldigeResultater(hovedkategori, underkategori),
  };
}

/**
 * D-7: punktene der én av dem må ha en begrunnelse (`begrunnelseskravet` i kjernen), og
 * hvorfor, eller `null` når begrunnelsen er valgfri.
 */
export function begrunnelsenKreves(
  f: Forholdet,
  v: Pick<Forholdssvarvalg, 'forSent' | 'resultat'>
): { punktene: readonly string[]; grunn: string; mangler: string } | null {
  const krav = begrunnelseskravet(vurderingene(v, f.varslingsplikt), f.varslingsplikt);
  if (!krav) return null;
  return {
    punktene: BEGRUNNELSESPUNKTENE[krav],
    grunn: krav === 'for_sent' ? FORHOLDSSVAR.krevesForSent : FORHOLDSSVAR.krevesAvslag,
    mangler: FORHOLDSSVAR.manglerBegrunnelse,
  };
}

/** Vurderingene i svaret slik kjernen leser dem. Varselet er med bare der punkt 32.2 gjelder. */
const vurderingene = (v: Pick<Forholdssvarvalg, 'forSent' | 'resultat'>, varslingsplikt: boolean) =>
  definert({
    grunnlag_varslet_i_tide: varslingsplikt && v.forSent !== null ? !v.forSent : undefined,
    resultat: v.resultat ?? undefined,
  });

/**
 * BHs svar på gjeldende versjon av påberopelsen (D-1), eller på `krav` når svaret legges til
 * (OV-U98), eller `null` når saken ikke har en. Punktet om varselet er med bare der punkt 32.2
 * gjelder.
 */
export function forholdssvaret(
  v: Forholdssvarvalg,
  u: Utledning,
  regler: Regelsett,
  punktene: readonly string[] = [],
  krav: Krav | null = u.spor.forhold.gjeldendeKrav
): { type: 'brev'; svar: Svarutkast[] } | null {
  if (!krav) return null;
  return svarbrevet(
    'forhold',
    krav,
    vurderingene(v, gjelderVarslingsplikten(krav, regler)),
    { paaberopelse: krav },
    v,
    regler,
    punktene
  );
}

/** Teksten i valget for forholdet, med kontraktens ord (U-4, D-2). */
export function valgteksten(r: Forholdsresultat, f: Forholdet, forSent: boolean | null): string {
  if (r === 'paalegg_frafalt') return FORHOLDSSVAR.frafaller;
  if (f.risiko) return r === 'godkjent' ? FORHOLDSSVAR.harRisikoen : FORHOLDSSVAR.harIkkeRisikoen;
  if (!f.varslingsplikt)
    return r === 'godkjent' ? FORHOLDSSVAR.enigEndringsordre313 : FORHOLDSSVAR.avslaarForholdet;
  if (r === 'avslaatt') return FORHOLDSSVAR.avslaarEndringsordre;
  return forSent === true ? FORHOLDSSVAR.enigIEndring : FORHOLDSSVAR.enigEndringsordre;
}

/** Linjen i hovedlinjene for standpunktet til forholdet, i du-form (U-7). */
export function forholdslinjen(r: Forholdsresultat, f: Forholdet, endringsordre: boolean): string {
  const t = forholdstilfellet(r, {
    endringsordre,
    varslingsplikt: f.varslingsplikt,
    risiko: f.risiko,
  });
  return {
    frafall: FORHOLDSSVAR.linjeFrafall,
    endringsordre: FORHOLDSSVAR.linjeEndringsordre,
    enig_i_endring: FORHOLDSSVAR.linjeEnigIEndring,
    har_risikoen: FORHOLDSSVAR.harRisikoen,
    enig_31_3: FORHOLDSSVAR.linjeEnig313,
    avslag_endringsordre: FORHOLDSSVAR.linjeAvslag,
    har_ikke_risikoen: FORHOLDSSVAR.harIkkeRisikoen,
    avslag: FORHOLDSSVAR.linjeAvslaarForholdet,
  }[t];
}
