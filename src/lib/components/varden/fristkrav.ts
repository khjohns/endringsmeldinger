/**
 * TEs krav om fristforlengelse i Varden (BF-20), i kjernens format: én rad per frist i
 * kontrakten, med dagene for hver frist for seg (KA-U74), og en frist i fristtabellen for
 * prosjektet eller en frist som ikke er registrert, med nummeret og navnet (KA-U79). Skjemaet
 * sender også varselet etter punkt 33.4 alene (U-13, VS-U15, VS-U16) og svaret på byggherrens
 * forespørsel etter punkt 33.6.2 (U-11, VS-U17).
 */

import { innholdIFristen } from '$kjerne/spor/frist/format';
import type { Korrespondansetype } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import { heleDager } from './fristsvar';
import { definert } from './kommandoer';
import { vedleggskart, type Kjernevedlegg } from './nysak';
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

/**
 * Varselet etter punkt 33.4 sendt utenfor løsningen (OV-U5, VS-U16): datoen og brevet. `type`
 * kreves bare når varselet registreres for seg (LV-U42); i kravet står datoen og brevet.
 */
export interface Utenforvalg {
  dato: string;
  type: Korrespondansetype | null;
  vedlegg: Kjernevedlegg[];
}

export interface Fristkravvalg {
  /** Kravet med dagene, eller bare varselet etter punkt 33.4 (U-13). */
  hva: 'krav' | 'varsel';
  /** Varselet gitt før, utenfor løsningen (U-6), eller `null` når brevet er varselet. */
  utenfor: Utenforvalg | null;
  /** Svaret på forespørselen etter punkt 33.6.2: dagene (a) eller begrunnelsen (b) (U-11). */
  bokstav: 'a' | 'b';
  frister: Fristpostvalg[];
  /** Begrunnelsen, som kjernen krever (`BEGRUNNELSE_MANGLER`). */
  begrunnelse: string;
  /** Begrunnelsen etter punkt 33.6.2 annet ledd bokstav b. */
  grunnB: string;
}

export const tomtUtenforvalg = (): Utenforvalg => ({ dato: '', type: null, vedlegg: [] });
export const erTomt = (u: Utenforvalg) => !u.dato && u.type === null && u.vedlegg.length === 0;

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
  const felles = { hva: 'krav' as const, utenfor: null, bokstav: 'a' as const, grunnB: '' };
  const krav = u.spor.frist.gjeldendeKrav;
  if (!krav) return { ...felles, frister: [nyFristpost()], begrunnelse: '' };
  return {
    ...felles,
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
 * Kommandoen TE sender: varselet etter punkt 33.4 fra løsningen eller registrert (VS-U15,
 * VS-U16), begrunnelsen etter punkt 33.6.2 annet ledd bokstav b (VS-U17), eller kravet. Kravet er
 * varselet når saken ikke har et (`varselVedKravet` i kjernen), og et krav mens forespørselen er
 * ubesvart, svarer på den (`kommandoer/skriving.ts`). Kjernen avviser det den ikke godtar.
 */
export function fristkravet(
  v: Fristkravvalg,
  foresporsel: string | null = null
): Record<string, unknown> {
  const dokumentasjon = (x: Utenforvalg) => x.vedlegg.map((f) => f.vedlegg_id);
  if (v.hva === 'varsel')
    return v.utenfor
      ? definert({
          type: 'varsel',
          spor: 'frist',
          hjemmel: '33.4',
          sendt: v.utenfor.dato,
          // Kjernen avviser en registrering uten typen; skjemaet sier fra ved feltet først.
          korrespondansetype: v.utenfor.type ?? undefined,
          dokumentasjon: dokumentasjon(v.utenfor),
        })
      : { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' };
  if (foresporsel && v.bokstav === 'b')
    return { type: 'foresporselssvar', gjelder: foresporsel, utdypning: v.grunnB };
  const trekker = v.frister.filter((p) => p.trukket && p.id).map((p) => p.id!);
  return definert({
    type: 'krav',
    spor: 'frist',
    innhold: definert({
      frister: fristene(v).map(fristen),
      trekker: trekker.length ? trekker : undefined,
    }),
    varsel: v.utenfor
      ? { sendt: v.utenfor.dato, dokumentasjon: dokumentasjon(v.utenfor) }
      : undefined,
    utdypning: v.begrunnelse,
  });
}

/** Vedleggene kommandoen viser til, så kjernen kan lage brevet før sendingen (OV-U5). */
export const vedleggIFristkravet = (v: Fristkravvalg) => vedleggskart(v.utenfor?.vedlegg ?? []);

/** Det som mangler: teksten i oppsummeringen, og ved feltet uten navnet på raden (`ved`). */
export interface Mangel {
  felt: string;
  tekst: string;
  ved?: string;
  /** Raden feltet står i, som åpnes når TE går til feltet. */
  post?: string;
}

/** Det som mangler, med feltet det gjelder (`<prefiks>-<felt>`). Kjernen avviser det samme. */
export function manglerIFristkravet(
  v: Fristkravvalg,
  prefiks: string,
  navnet: (p: Fristpostvalg) => string,
  foresporsel: string | null = null
): Mangel[] {
  const ut: Mangel[] = [];
  const legg = (felt: string, tekst: string, ved?: string, post?: string) =>
    ut.push({
      felt: `${prefiks}-${felt}`,
      tekst,
      ...(ved ? { ved } : {}),
      ...(post ? { post } : {}),
    });
  if (v.utenfor) {
    if (!v.utenfor.dato) legg('utenfor-dato', FRISTKRAV.manglerVarseldato);
    if (v.hva === 'varsel' && !v.utenfor.type) legg('utenfor-type', FRISTKRAV.manglerType);
    if (!v.utenfor.vedlegg.length) legg('utenfor-brev', FRISTKRAV.manglerVarselbrev);
  }
  if (v.hva === 'varsel') return ut;
  if (foresporsel && v.bokstav === 'b') {
    if (!v.grunnB.trim()) legg('grunn-b', FRISTKRAV.manglerGrunnB);
    return ut;
  }
  const med = fristene(v);
  if (!med.length) legg('legg-til', FRISTKRAV.ingenFristerMangler);
  for (const p of med) {
    const f = (felt: string, tekst: string) =>
      legg(`${felt}-${p.noekkel}`, `${navnet(p)}: ${tekst}`, tekst, p.noekkel);
    if (p.frist === null) f('frist', FRISTKRAV.manglerFrist);
    else if (typeof p.frist === 'number' && v.frister.some((q) => q !== p && q.frist === p.frist))
      f('frist', FRISTKRAV.toGanger);
    if (p.frist === 'annen' && !p.navn.trim()) f('navn', FRISTKRAV.manglerNavn);
    const d = heleDager(p.dager);
    if (d === undefined) f('dager', FRISTKRAV.manglerDager);
    else if (d === 0) f('dager', FRISTKRAV.nullDager);
  }
  if (!v.begrunnelse.trim()) legg('begrunnelse', FRISTKRAV.manglerBegrunnelse);
  return ut;
}
