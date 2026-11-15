/**
 * Byggherrens svar på påberopelsen av forholdet i Varden (BF-08, #2009), i kjernens format.
 * Svaret har standpunktet til varselet etter punkt 32.2 der det gjelder, og til forholdet.
 */

import { gjelderVarslingsplikten } from '$kjerne/frosset/byggeklosser';
import type { Svarutkast } from '$kjerne/kommandoer/kommando';
import { erByggherrensPaalegg, gyldigeResultater } from '$kjerne/regler/forhold';
import type { Regelsett } from '$kjerne/regler/regelsett';
import type { Forholdsresultat } from '$kjerne/regler/typer';
import { kategori } from '$kjerne/spor/forhold/format';
import { harRisikoen } from '$kjerne/spor/forhold/tekst';
import type { Krav } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import { definert, svarbrevet } from './kommandoer';

/** Det BH har valgt i skjemaet. `null` er ikke besvart; ingenting er forhåndsvalgt. */
export interface Forholdssvarvalg {
  /** Gjør BH gjeldende at varselet etter punkt 32.2 kom for sent? */
  forSent: boolean | null;
  resultat: Forholdsresultat | null;
  /** Begrunnelsen per punkt i brevet, med punktet som nøkkel (LV-U71). */
  begrunnelser: Record<string, string>;
  /** Byggherrens tekst for hele svaret, under «Forbehold» sist i brevet. */
  forbehold: string;
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

/** D-6 (vedtaket for #235): frafall er ikke et valg sammen med at varselet kom for sent. */
export const kanFrafalle = (f: Forholdet, v: Pick<Forholdssvarvalg, 'forSent'>): boolean =>
  f.resultater.includes('paalegg_frafalt') && !(f.varslingsplikt && v.forSent === true);

/**
 * D-7 (`begrunnelseIForholdet` i kjernen): punktene der én av dem må ha en begrunnelse, og
 * hvorfor, eller `null` når begrunnelsen er valgfri.
 */
export function begrunnelsenKreves(
  f: Forholdet,
  v: Pick<Forholdssvarvalg, 'forSent' | 'resultat'>
): { punktene: string[]; grunn: string; mangler: string } | null {
  const mangler = FORHOLDSSVAR.manglerBegrunnelse;
  if (f.varslingsplikt && v.forSent === true)
    return { punktene: ['forhold', '32.2'], grunn: FORHOLDSSVAR.krevesForSent, mangler };
  if (f.varslingsplikt && v.resultat === 'avslaatt')
    return { punktene: ['forhold'], grunn: FORHOLDSSVAR.krevesAvslag, mangler };
  return null;
}

/**
 * BHs svar på gjeldende versjon av påberopelsen (D-1), eller `null` når saken ikke har en.
 * Punktet om varselet er med bare der punkt 32.2 gjelder.
 */
export function forholdssvaret(
  v: Forholdssvarvalg,
  u: Utledning,
  regler: Regelsett,
  punktene: readonly string[] = []
): { type: 'brev'; svar: Svarutkast[] } | null {
  const krav = u.spor.forhold.gjeldendeKrav;
  if (!krav) return null;
  const varslingsplikt = gjelderVarslingsplikten(krav, regler);
  return svarbrevet(
    'forhold',
    krav,
    definert({
      grunnlag_varslet_i_tide: varslingsplikt && v.forSent !== null ? !v.forSent : undefined,
      resultat: v.resultat ?? undefined,
    }),
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
  if (r === 'paalegg_frafalt') return FORHOLDSSVAR.linjeFrafall;
  if (f.risiko) return r === 'godkjent' ? FORHOLDSSVAR.harRisikoen : FORHOLDSSVAR.harIkkeRisikoen;
  if (r === 'avslaatt')
    return f.varslingsplikt ? FORHOLDSSVAR.linjeAvslag : FORHOLDSSVAR.linjeAvslaarForholdet;
  if (endringsordre) return FORHOLDSSVAR.linjeEndringsordre;
  return f.varslingsplikt ? FORHOLDSSVAR.linjeEnigIEndring : FORHOLDSSVAR.linjeEnig313;
}

export const FORHOLDSSVAR = {
  varselTittel: 'Varselet etter punkt 32.2',
  forholdTittel: 'Forholdet',
  datoOppgitt: (gjelder: string, dato: string, brev: string) =>
    `Totalentreprenøren oppgir at ${gjelder} ${dato} (${brev}).`,
  paaberopelsenSendt: (dato: string) => `Påberopelsen ble sendt ${dato}.`,
  avstand: (dager: number) =>
    `${dager} kalenderdager fra datoen totalentreprenøren oppgir, til påberopelsen.`,
  varselSpoersmaal: 'Gjør du gjeldende at varselet kom for sent?',
  varselNei: 'Nei',
  varselJa: 'Ja, varselet kom for sent',
  forholdSpoersmaal: 'Hva svarer du på påberopelsen?',
  innsigelsenVarsel: 'Innsigelsen om at varselet etter punkt 32.2 kom for sent',
  enigEndringsordre: 'Enig, endringsordre',
  enigIEndring: 'Enig i at pålegget innebærer en endring',
  avslaarEndringsordre: 'Avslår kravet på endringsordre',
  frafaller: 'Frafaller pålegget',
  harRisikoen: 'Byggherren har risikoen',
  harIkkeRisikoen: 'Byggherren har ikke risikoen',
  enigEndringsordre313: 'Enig i at forholdet er en endringsordre',
  avslaarForholdet: 'Avslår forholdet',
  ikkeFrafallForSent:
    'Du kan ikke frafalle pålegget og samtidig gjøre gjeldende at varselet kom for sent (punkt 32.3 første ledd\u00a0c).',
  ikkeFrafallIkkeEget:
    'Frafall gjelder bare et pålegg fra byggherren selv, ikke fra offentlig myndighet (punkt 32.3 første ledd\u00a0c).',
  endringsordreMerke: 'Svaret er en endringsordre',
  brevetSier: 'Brevet sier:',
  setningenStaar: 'Setningen står i brevet også når begrunnelsen har vilkår eller forbehold.',
  manglerVarsel: 'Svar på om du gjør gjeldende at varselet kom for sent.',
  manglerForhold: 'Velg hva du svarer på påberopelsen.',
  krevesForSent:
    'Kreves fordi du gjør gjeldende at varselet kom for sent. Skriv den under punktet om varselet eller forholdet.',
  krevesAvslag: 'Kreves fordi du avslår kravet på endringsordre (punkt 32.3 første ledd b).',
  manglerBegrunnelse: 'Skriv en begrunnelse for svaret på forholdet.',
  linjeVarselForSent: 'Du gjør gjeldende at varselet etter punkt 32.2 kom for sent',
  linjeVarselIkkeForSent: 'Du gjør ikke gjeldende at varselet etter punkt 32.2 kom for sent',
  linjeEndringsordre: 'Du er enig, og svaret er en endringsordre (punkt 32.3 første ledd a)',
  linjeEnigIEndring: 'Du er enig i at pålegget innebærer en endring',
  linjeEnig313: 'Du er enig i at forholdet er en endringsordre (punkt 31.3)',
  linjeAvslag: 'Du avslår kravet på endringsordre (punkt 32.3 første ledd b)',
  linjeAvslaarForholdet: 'Du avslår forholdet',
  linjeFrafall: 'Du frafaller pålegget (punkt 32.3 første ledd c)',
  // U-7 og D-5: hva svaret gjør, lest av kjernens utledning av utkastet.
  virkningEndringsordre: 'Svaret er en endringsordre. Den går gjennom fullmakten før den sendes.',
  virkningEnighet:
    'Enigheten om forholdet registreres ut fra valgene. Kravene om vederlag og frist står for seg.',
  virkningFrafall:
    'Pålegget er frafalt, og forholdet er avklart. Kravene om vederlag og frist for det utførte arbeidet behandles i saken.',
  virkningSubsidiaert:
    'Svarene på vederlag og frist gjelder subsidiært. Totalentreprenøren kan godta svaret, og da avsluttes saken.',
  /** U-14 og OV-U101: et svar gitt utenfor løsningen legges til som korrespondanse. */
  utenforLoesningen:
    'Har du alt svart på påberopelsen utenfor løsningen, i et brev, en e-post eller et møtereferat? Legg svaret til i saken som korrespondanse, og velg at det er et svar. Det gjelder fra datoen du oppgir at det ble sendt.',
} as const;
