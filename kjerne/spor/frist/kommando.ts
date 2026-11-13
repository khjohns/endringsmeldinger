/**
 * Kommandoene i fristen (#1783): formen på kravet, nyttelastkontrollen, forutsetningene,
 * standpunktene i svaret og skrivingen av kravet. Regelsettet for sporet står i
 * `regler/frist.ts`.
 */

import { HJEMMEL, KRAVINNHOLD } from '../../format/format.ts';
import { feilI, objekt } from '../../format/skjema.ts';
import { varseletForNyttSvar, type Utledning } from '../../utledning/utled.ts';
import { avvis, varseletSendt, type Avvisning } from '../../typer.ts';
import type { Kravform } from '../../kommandoer/kommando.ts';
import type { Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter } from '../../kommandoer/standpunkter.ts';
import type { Sporsskriving } from '../../kommandoer/skriving.ts';
import { foresporselForFristsvar, fristkravErFremmet } from './utledning.ts';

/** Formen på kravet i fristen (`KRAVFORM`). */
export const KRAVFORM_I_FRISTEN = {
  feil: (innhold) => {
    const { properties, required, anyOf } = KRAVINNHOLD.frist;
    return feilI(innhold, objekt(properties, required, anyOf), '$.innhold');
  },
  vedleggIInnholdet: () => [],
  vedleggVedKravet: false,
  varselVedKravet: true,
} satisfies Kravform;

/** Begrunnelsen for dagene i et fristkrav (`kravetsUtdypning`). */
const utdypningIFristen = (): Avvisning | null =>
  avvis(
    'BEGRUNNELSE_MANGLER',
    'Kravet om fristforlengelse må begrunne antallet dager (NS 8407 § 33.6.1, KA-U33).'
  );

/** Nyttelastkontrollen i fristen (`NYTTELAST`). */
export const NYTTELAST_I_FRISTEN = {
  begrunnelse: () => null,
  kravsperre: () => null,
  innsigelse: () => null,
  utdypning: utdypningIFristen,
  oppgittDatoIKravet: (k) =>
    k.varsel ? { dato: k.varsel.sendt, gjelder: varseletSendt('33.4'), av: 'TE' } : null,
} satisfies Sporsnyttelast;

/** Et utsagn i fristen som ikke er et krav, når sporet er lukket (GR-U27, GR-U5, KA-U12). */
function fristenErLukket(u: Utledning, avslaget: Avvisning | null): Avvisning | null {
  if (avslaget) return avslaget;
  if (u.spor.frist.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
  if (u.spor.frist.ingenKrav)
    return avvis('INGEN_KRAV_I_SPORET', 'TE har sagt at det ikke kreves fristforlengelse.');
  return null;
}

/** Forutsetningene i fristen (`FORUTSETNINGER`). */
export const FORUTSETNINGER_I_FRISTEN = {
  innsigelsenErIkkeBygget: () => null,
  svaret: () => null,
  kravet: 'kravet om fristforlengelse',
  trekket: () => null,
  aksepten: () => null,
  foresporsel: {
    sende: (u, paaberopelseSendt) => {
      if (!paaberopelseSendt)
        return avvis(
          'PAABEROPELSE_IKKE_SENDT',
          'Grunnlaget må være sendt før du kan sende forespørselen.'
        );
      if (u.spor.frist.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (u.spor.frist.ingenKrav)
        return avvis('INGEN_KRAV_I_SPORET', 'TE har sagt at det ikke kreves fristforlengelse.');
      // VS-U19, VS-U33: fra appen så lenge TE ikke har krevd dager i appen.
      if (fristkravErFremmet(u))
        return avvis(
          'FRISTKRAV_SENDT',
          'TE har krevd dager i appen, så forespørselen etter § 33.6.2 kan ikke sendes.'
        );
      // VS-U30: ingen ny forespørsel fra appen etter TEs begrunnelse etter annet ledd b.
      if (u.spor.frist.foresporsler.some((f) => f.svar !== null && !f.medKrav))
        return avvis(
          'FORESPORSEL_BEGRUNNET',
          'TE har svart på en forespørsel med en begrunnelse etter § 33.6.2 annet ledd b, så en ny forespørsel kan ikke sendes fra appen.'
        );
      // VS-U31: høyst én forespørsel fra appen i saken. En registrert forespørsel gjør saken
      // uforstått (format/leser.ts); et brev registrert som dokumentasjon teller ikke (OV-U4).
      if (u.spor.frist.foresporsler.length)
        return avvis(
          'FORESPORSEL_SENDT',
          'Forespørselen etter § 33.6.2 er alt sendt fra appen. En ny forespørsel sendes utenfor appen.'
        );
      return null;
    },
    svare: (u, f, avslaget) => {
      // KA-U1: én begrunnelse, og ikke etter at et krav har svart.
      if (f.svar !== null)
        return avvis('FORESPORSEL_BESVART', 'Forespørselen er allerede besvart.');
      return fristenErLukket(u, avslaget);
    },
  },
} satisfies Sporsforutsetninger;

/** Standpunktene i fristen (`STANDPUNKTER`). */
export const STANDPUNKTER_I_FRISTEN: Sporsstandpunkter = (v, krav, u, nyId) => {
  const ut: Record<string, unknown>[] = [];
  // VS-U20, OV-U5, HF-U1: varselet før svaret.
  if (typeof v.frist_varsel_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varseletForNyttSvar(u, '33.4'),
      hjemmel: HJEMMEL.frist,
      i_tide: v.frist_varsel_ok,
    });
  // VS-U17, VS-U29: svaret på forespørselen etter § 33.6.2, som kravet eller begrunnelsen.
  const f = foresporselForFristsvar(u);
  if (typeof v.foresporsel_svar_ok === 'boolean' && f)
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: f.gjelder,
      hjemmel: '33.6.2',
      i_tide: v.foresporsel_svar_ok,
    });
  if (typeof v.vilkar_oppfylt === 'boolean')
    ut.push({ id: nyId(), art: 'hindring', oppfylt: v.vilkar_oppfylt });
  if (typeof v.spesifisert_krav_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'spesifisering',
      gjelder: krav.id,
      hjemmel: '33.6.1',
      i_tide: v.spesifisert_krav_ok,
      ...(v.spesifisert_krav_ok ? {} : { dager: v.dager_maatte_forstaa }),
    });
  ut.push({ id: nyId(), art: 'dager' });
  return ut;
};

/** Skrivingen i fristen (`SKRIVING`). */
export const SKRIVING_I_FRISTEN = {
  kravinnhold: (innhold) => innhold,
} satisfies Sporsskriving;
