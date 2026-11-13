/**
 * Kommandoene i fristen (#1783): formen på kravet, nyttelastkontrollen, forutsetningene,
 * standpunktene i svaret og skrivingen av kravet. Regelsettet for sporet står i
 * `regler/frist.ts`.
 */

import { HJEMMEL, KRAVINNHOLD } from '../../format/format.ts';
import { feilI, objekt } from '../../format/skjema.ts';
import { varseletForNyttSvar } from '../../utledning/utled.ts';
import { avvis, varseletSendt, type Avvisning } from '../../typer.ts';
import type { Kommando, Kravform } from '../../kommandoer/kommando.ts';
import type { Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter } from '../../kommandoer/standpunkter.ts';
import type { Sporsskriving } from '../../kommandoer/skriving.ts';
import { foresporselForFristsvar } from './utledning.ts';

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
function utdypningIFristen(k: Extract<Kommando, { type: 'krav' }>): Avvisning | null {
  if (k.spor === 'frist')
    return avvis(
      'BEGRUNNELSE_MANGLER',
      'Kravet om fristforlengelse må begrunne antallet dager (NS 8407 § 33.6.1, KA-U33).'
    );
  return null;
}

/** Nyttelastkontrollen i fristen (`NYTTELAST`). */
export const NYTTELAST_I_FRISTEN = {
  begrunnelse: () => null,
  kravsperre: () => null,
  innsigelse: () => null,
  utdypning: utdypningIFristen,
  oppgittDatoIKravet: (k) =>
    k.varsel ? { dato: k.varsel.sendt, gjelder: varseletSendt('33.4'), av: 'TE' } : null,
} satisfies Sporsnyttelast;

/** Forutsetningene i fristen (`FORUTSETNINGER`). */
export const FORUTSETNINGER_I_FRISTEN = {
  innsigelsenErIkkeBygget: () => null,
  svaret: () => null,
  kravet: 'kravet om fristforlengelse',
  trekket: () => null,
  aksepten: () => null,
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
