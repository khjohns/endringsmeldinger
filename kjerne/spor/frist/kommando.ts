/**
 * Kommandoene i fristen (#1783): formen på kravet, nyttelastkontrollen, forutsetningene,
 * standpunktene i svaret og skrivingen av kravet. Regelsettet for sporet står i
 * `regler/frist.ts`.
 */

import { HJEMMEL } from '../../format/format.ts';
import { feilI, objekt } from '../../format/skjema.ts';
import { varseletForNyttSvar, type Utledning } from '../../utledning/utled.ts';
import { avvis, varseletSendt, type Avvisning } from '../../typer.ts';
import type { Kommando, Kravform } from '../../kommandoer/kommando.ts';
import type { Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter } from '../../kommandoer/standpunkter.ts';
import type { Kontekst, Sporsskriving } from '../../kommandoer/skriving.ts';
import {
  foresporselForFristsvar,
  fristeneISporet,
  fristeneStrider,
  fristkravErFremmet,
  fristnoekkel,
} from './utledning.ts';
import { fristinnhold } from './format.ts';
import { fristvurderinger } from './frysing.ts';

/** Formen på kravet i fristen (`KRAVFORM`). */
export const KRAVFORM_I_FRISTEN = {
  feil: (innhold) => {
    const { properties, required, anyOf } = fristinnhold(false);
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

/** KA-U76, KA-U79: fristene i kravet mot de tidligere kravversjonene. */
function fristsperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  if (k.spor !== 'frist') return null;
  const strid = fristeneStrider(
    k.innhold as Parameters<typeof fristeneStrider>[0],
    u.spor.frist.krav,
    false
  );
  return strid ? avvis('FRISTENE', `Kravversjonen ${strid}.`) : null;
}

/** Nyttelastkontrollen i fristen (`NYTTELAST`). */
export const NYTTELAST_I_FRISTEN = {
  begrunnelse: () => null,
  kravsperre: fristsperre,
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
  const frister = fristvurderinger(v, krav);
  if (typeof v.spesifisert_krav_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'spesifisering',
      gjelder: krav.id,
      hjemmel: '33.6.1',
      i_tide: v.spesifisert_krav_ok,
      // D-5: dagene byggherren måtte forstå, for hver frist i kravet.
      ...(v.spesifisert_krav_ok
        ? {}
        : {
            maatte_forstaa: frister.map((f) => ({
              frist: f.gjelder,
              dager: f.dager_maatte_forstaa,
            })),
          }),
    });
  // KA-U74: dagene for hver frist i kravet.
  for (const f of frister) ut.push({ id: nyId(), art: 'dager', gjelder: f.gjelder });
  return ut;
};

/**
 * Fristene i kravet slik de lagres (KA-U79): en registrert frist får nummeret og navnet fra
 * fristtabellen for prosjektet (GFK-U23, MM-U50), og en frist uten `id` får `id` til fristen i
 * kontrakten som har stått med samme `fristnoekkel` i sporet, ellers en ny (KA-U76).
 * Nyttelastkontrollen har kontrollert fristene mot sporet før dette.
 */
function fristeneSomLagres(
  innhold: Record<string, unknown>,
  u: Utledning,
  kontekst: Pick<Kontekst, 'nyId' | 'kontraktsfrister'>
): Record<string, unknown> {
  const { eier } = fristeneISporet(u.spor.frist.krav);
  const frister = (innhold.frister as Record<string, unknown>[]).map((p) => {
    const id = (p.id as string | undefined) ?? eier.get(fristnoekkel(p)) ?? kontekst.nyId();
    if (p.frist_id === undefined) return { ...p, id };
    const f = kontekst.kontraktsfrister.find((x) => x.fristId === p.frist_id)!;
    return {
      id,
      frist_id: f.fristId,
      ...(f.nummer === null ? {} : { nummer: f.nummer }),
      navn: f.navn,
      dager: p.dager,
    };
  });
  return { ...innhold, frister };
}

/**
 * KA-U79, GFK-U23: en registrert frist i kravet står i fristtabellen for prosjektet saken
 * hører til. Prosjektgrensen holdes av fristtabellen i konteksten.
 */
function fristIkkeRegistrert(
  k: Extract<Kommando, { type: 'krav' }>,
  kontekst: Pick<Kontekst, 'kontraktsfrister'>
): Avvisning | null {
  for (const p of (k.innhold.frister ?? []) as Record<string, unknown>[])
    if (
      p.frist_id !== undefined &&
      !kontekst.kontraktsfrister.some((f) => f.fristId === p.frist_id)
    )
      return avvis(
        'FRIST_IKKE_REGISTRERT',
        `Fristen ${String(p.frist_id)} er ikke registrert for prosjektet. Angi nummeret og navnet kontrakten gir den i stedet (KA-U79).`
      );
  return null;
}

/** Skrivingen i fristen (`SKRIVING`). */
export const SKRIVING_I_FRISTEN = {
  kravinnhold: fristeneSomLagres,
  kontekstsperre: fristIkkeRegistrert,
} satisfies Sporsskriving;
