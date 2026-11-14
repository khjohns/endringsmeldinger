/**
 * TEs krav om fristforlengelse i Varden (G-3 i BF-20), i kjernens format: én rad per frist i
 * kontrakten, med dagene for hver frist for seg (KA-U74), og en frist i fristtabellen for
 * prosjektet eller en frist som ikke er registrert, med nummeret og navnet (KA-U79).
 */

import { innholdIFristen } from '$kjerne/spor/frist/format';
import type { Utledning } from '$kjerne/utledning/utled';
import { heleDager } from './fristsvar';
import { definert } from './kommandoer';
import { FRISTKRAV } from './tekster';

/** Én frist i kravet, som TE har fylt den ut. */
export interface Fristpostvalg {
  /** Nøkkelen i skjemaet, så ID-ene i feltene står når rekkefølgen endres. */
  noekkel: string;
  /** Fristens `id` i sporet, når den sto i forrige versjon. */
  id: string | null;
  /** Fristen i fristtabellen, `'annen'` for en frist som ikke er registrert, eller `null` før valget. */
  frist: number | 'annen' | null;
  /** Nummeret og navnet kontrakten gir en frist som ikke er registrert (KA-U79). */
  nummer: string;
  navn: string;
  dager: string;
  /** En frist fra forrige versjon som TE trekker (U-10). */
  trukket: boolean;
}

export interface Fristkravvalg {
  frister: Fristpostvalg[];
  /** Begrunnelsen, som kjernen krever (`BEGRUNNELSE_MANGLER`). */
  begrunnelse: string;
}

let teller = 0;
const nyNoekkel = () => `f${++teller}`;

export const nyFristpost = (): Fristpostvalg => ({
  noekkel: nyNoekkel(),
  id: null,
  frist: null,
  nummer: '',
  navn: '',
  dager: '',
  trukket: false,
});

/** Valgene fra gjeldende krav, eller én tom frist i det første kravet (U-10). */
export function startvalg(u: Utledning): Fristkravvalg {
  const krav = u.spor.frist.gjeldendeKrav;
  if (!krav) return { frister: [nyFristpost()], begrunnelse: '' };
  return {
    frister: innholdIFristen(krav).frister.map((f) => ({
      noekkel: nyNoekkel(),
      id: f.id,
      frist: f.frist_id ?? 'annen',
      nummer: f.nummer ?? '',
      navn: f.navn,
      dager: String(f.dager),
      trukket: false,
    })),
    begrunnelse: '',
  };
}

/** Fristene som står i kravet, uten dem TE trekker. */
export const fristene = (v: Fristkravvalg) => v.frister.filter((p) => !p.trukket);

/** Fristen i kommandoen: en frist i fristtabellen med ID-en, ellers nummeret og navnet. */
const fristen = (p: Fristpostvalg): Record<string, unknown> =>
  definert({
    id: p.id ?? undefined,
    ...(typeof p.frist === 'number'
      ? { frist_id: p.frist }
      : { nummer: p.nummer.trim() || undefined, navn: p.navn.trim() }),
    dager: heleDager(p.dager),
  });

/**
 * Kravet TE sender. Kjernen kontrollerer fristene mot fristtabellen og sporet, og at begrunnelsen
 * finnes, og avviser det den ikke godtar. Kravet er varselet etter punkt 33.4 når saken ikke har
 * et (`varselVedKravet` i kjernen).
 */
export function fristkravet(v: Fristkravvalg): Record<string, unknown> {
  const trekker = v.frister.filter((p) => p.trukket && p.id).map((p) => p.id!);
  return {
    type: 'krav',
    spor: 'frist',
    innhold: definert({
      frister: fristene(v).map(fristen),
      trekker: trekker.length ? trekker : undefined,
    }),
    utdypning: v.begrunnelse,
  };
}

/** Det som mangler, med feltet det gjelder (`<prefiks>-<felt>`). Kjernen avviser det samme. */
export function manglerIFristkravet(
  v: Fristkravvalg,
  prefiks: string,
  navnet: (p: Fristpostvalg) => string
): { felt: string; tekst: string }[] {
  const med = fristene(v);
  const ut: { felt: string; tekst: string }[] = [];
  if (!med.length) ut.push({ felt: `${prefiks}-legg-til`, tekst: FRISTKRAV.ingenFristerMangler });
  for (const p of med) {
    const f = (felt: string, tekst: string) =>
      ut.push({ felt: `${prefiks}-${felt}-${p.noekkel}`, tekst: `${navnet(p)}: ${tekst}` });
    if (p.frist === null) f('frist', FRISTKRAV.manglerFrist);
    if (p.frist === 'annen' && !p.navn.trim()) f('navn', FRISTKRAV.manglerNavn);
    const d = heleDager(p.dager);
    if (d === undefined) f('dager', FRISTKRAV.manglerDager);
    else if (d === 0) f('dager', FRISTKRAV.nullDager);
  }
  if (!v.begrunnelse.trim())
    ut.push({ felt: `${prefiks}-begrunnelse`, tekst: FRISTKRAV.manglerBegrunnelse });
  return ut;
}
