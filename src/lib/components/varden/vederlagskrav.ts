/**
 * TEs krav om justering av vederlaget i Varden (BF-14, økt 3 i #1663): valgene i skjemaet,
 * kommandoen kjernen tar imot (`vederlagsinnhold` i `kjerne/spor/vederlag/format.ts`) og det som
 * mangler før brevet kan vises. Kjernen setter `id` og betegnelsen på en ny kravpost (KA-U53),
 * avgjør om kravet er varselet for en post (VS-U49) og lager brevet.
 */

import { kravposterI } from '$kjerne/spor/vederlag/format';
import type { Korrespondansetype, Kravpost, Oppgjoersform } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Varselet } from '$lib/kjernesak/vederlagskrav';
import { lesKroner, visKroner } from '$lib/utils/belop';
import type { Kjernevedlegg } from './nysak';
import { KRAVSKJEMA } from './tekster';

/**
 * Det TE oppgir om varselet for en kravpost som kravet ellers er varselet for (VS-U50, D-19):
 * `kravet` er normalsvaret, `saken` et varsel i saken etter samme bestemmelse, `dokument` et
 * dokument sendt utenfor løsningen som legges til i saken (VS-U51, VS-U53), og `samme` det samme
 * dokumentet som for kravposten `som` (VS-U52, oppdragsgiver 11.11).
 */
export interface Varselvalg {
  art: 'kravet' | 'saken' | 'dokument' | 'samme';
  varsel: string | null;
  type: Korrespondansetype | null;
  dato: string;
  vedlegg: Kjernevedlegg[];
  som: string | null;
}

/** Én kravpost i skjemaet. Tekstfeltene står som TE skrev dem, og beløpene leses med `lesKroner`. */
export interface Kravpostvalg {
  /** Nøkkelen i skjemaet: `id` for en post fra forrige versjon, ellers `ny-<n>`. */
  noekkel: string;
  /** Kravpostens `id` og betegnelse fra en tidligere versjon (KA-U56, KA-U75). */
  id: string | null;
  betegnelse: string | null;
  beskrivelse: string;
  form: Oppgjoersform | null;
  beloep: string;
  /** Justerte enhetspriser etter § 34.3.2, for enhetspriser (KA-U68). */
  justert: boolean | null;
  anslag: string;
  overslag: string;
  pns: string;
  /** TE trekker posten fra forrige versjon (KA-U56). */
  trukket: boolean;
  varsel: Varselvalg;
}

export interface Kravvalg {
  poster: Kravpostvalg[];
  /** Kravet etter § 34.1.3 annet ledd, med beløpet som tekst, eller `null` uten posten. */
  saerskilt: { beloep: string } | null;
  begrunnelse: string;
  /** Teller for nøklene til nye poster. */
  nye: number;
}

export const tomtVarselvalg = (): Varselvalg => ({
  art: 'kravet',
  varsel: null,
  type: null,
  dato: '',
  vedlegg: [],
  som: null,
});

const tekst = (n: number | undefined) => (n === undefined ? '' : visKroner(n));

/** En ny, tom kravpost. */
export function nyKravpost(v: Kravvalg): Kravpostvalg {
  v.nye += 1;
  return {
    noekkel: `ny-${v.nye}`,
    id: null,
    betegnelse: null,
    beskrivelse: '',
    form: null,
    beloep: '',
    justert: null,
    anslag: '',
    overslag: '',
    pns: '',
    trukket: false,
    varsel: tomtVarselvalg(),
  };
}

/** Kravposten fra en tidligere versjon slik den sto, så TE kan endre den (KA-U56, KA-U75). */
export const fraKravpost = (p: Kravpost): Kravpostvalg => ({
  noekkel: p.id,
  id: p.id,
  betegnelse: p.betegnelse,
  beskrivelse: p.beskrivelse,
  form: p.oppgjoersform,
  beloep: tekst(p.beloep),
  justert: p.oppgjoersform === 'enhetspriser' ? (p.justert ?? false) : null,
  anslag: tekst(p.anslag),
  overslag: tekst(p.kostnadsoverslag),
  pns: p.pns ?? '',
  trukket: false,
  // Varselet en tidligere versjon viste til, står i den versjonen (VS-U54).
  varsel: tomtVarselvalg(),
});

/**
 * Skjemaet når det åpnes: alle kravpostene i gjeldende krav og den særskilte
 * vederlagsjusteringen, så ingen post forsvinner av at TE lar den stå (KA-U56, D-4), eller én
 * tom kravpost i det første kravet.
 */
export function startvalg(u: Utledning): Kravvalg {
  const krav = u.spor.vederlag.gjeldendeKrav;
  const v: Kravvalg = { poster: [], saerskilt: null, begrunnelse: '', nye: 0 };
  if (!krav) {
    v.poster.push(nyKravpost(v));
    return v;
  }
  v.poster = kravposterI(krav).map(fraKravpost);
  const post = (krav.innhold.saerskilt as { produktivitet?: { beloep: number } } | undefined)
    ?.produktivitet;
  if (post) v.saerskilt = { beloep: tekst(post.beloep) };
  return v;
}

/**
 * Kravpostene i tidligere versjoner som ikke står i gjeldende krav, så TE kan ta dem med igjen
 * med samme betegnelse (KA-U75, D-18). Den siste versjonen posten sto i, gjelder.
 */
export function trukneKravposter(u: Utledning): Kravpost[] {
  const gjeldende = new Set(
    (u.spor.vederlag.gjeldendeKrav ? kravposterI(u.spor.vederlag.gjeldendeKrav) : []).map(
      (p) => p.id
    )
  );
  const sist = new Map<string, Kravpost>();
  for (const k of u.spor.vederlag.krav) for (const p of kravposterI(k)) sist.set(p.id, p);
  return [...sist.values()].filter((p) => !gjeldende.has(p.id));
}

const beloepet = (t: string): number | undefined => {
  const lest = lesKroner(t);
  return 'verdi' in lest ? lest.verdi : undefined;
};

const definert = <T extends object>(felt: T): T =>
  Object.fromEntries(Object.entries(felt).filter(([, x]) => x !== undefined)) as T;

/** Dokumentet med varselet for posten, slik kommandoen bærer det (VS-U51, VS-U53). */
function dokumentvarsel(v: Varselvalg) {
  return {
    sendt: v.dato,
    korrespondansetype: v.type ?? 'brev',
    dokumentasjon: v.vedlegg.map((x) => x.vedlegg_id),
  };
}

/** Varselvalget som gjelder posten: valget selv, eller valget i posten med samme dokument. */
export function gjeldendeVarselvalg(v: Kravvalg, p: Kravpostvalg): Varselvalg {
  if (p.varsel.art !== 'samme') return p.varsel;
  const kilde = v.poster.find((q) => q.noekkel === p.varsel.som);
  return kilde && kilde.varsel.art === 'dokument' ? kilde.varsel : tomtVarselvalg();
}

/** Postene som er med i kravet, i rekkefølgen i skjemaet. */
export const postene = (v: Kravvalg) => v.poster.filter((p) => !p.trukket);

/**
 * Kommandoen for kravet. `varslene` er varselet hver post trenger, i rekkefølgen i
 * `postene(v)`, fra kjernen. Varselvalget sendes bare for en post kravet ellers er varselet for
 * (VS-U50).
 */
export function vederlagskravet(v: Kravvalg, varslene: readonly (Varselet | null)[]) {
  const kravposter = postene(v).map((p, i) => {
    const valg = gjeldendeVarselvalg(v, p);
    const varsel =
      varslene[i]?.art !== 'kravet' || valg.art === 'kravet'
        ? undefined
        : valg.art === 'saken'
          ? (valg.varsel ?? undefined)
          : dokumentvarsel(valg);
    return definert({
      id: p.id ?? undefined,
      beskrivelse: p.beskrivelse.trim(),
      pns: p.pns.trim() || undefined,
      oppgjoersform: p.form ?? undefined,
      beloep: p.form === 'tilbud' ? beloepet(p.beloep) : undefined,
      justert: p.form === 'enhetspriser' ? (p.justert ?? undefined) : undefined,
      anslag: p.form === 'enhetspriser' ? beloepet(p.anslag) : undefined,
      kostnadsoverslag: p.form === 'regningsarbeid' ? beloepet(p.overslag) : undefined,
      varsel,
    });
  });
  const trekker = v.poster.filter((p) => p.trukket && p.id).map((p) => p.id!);
  const saerskilt = v.saerskilt ? beloepet(v.saerskilt.beloep) : undefined;
  const utdypning = v.begrunnelse.trim();
  return {
    type: 'krav' as const,
    spor: 'vederlag' as const,
    innhold: definert({
      kravposter: kravposter.length ? kravposter : undefined,
      saerskilt: v.saerskilt ? { produktivitet: { beloep: saerskilt } } : undefined,
      trekker: trekker.length ? trekker : undefined,
    }),
    ...(utdypning ? { utdypning } : {}),
  };
}

/** Vedleggene kommandoen viser til, så kjernen kan lage brevet før sendingen (VS-U53). */
export function vedleggIKravet(v: Kravvalg) {
  const alle = postene(v).flatMap((p) => (p.varsel.art === 'dokument' ? p.varsel.vedlegg : []));
  return new Map(
    alle.map(({ vedlegg_id, filnavn, innhold_sha256 }) => [
      vedlegg_id,
      { vedlegg_id, filnavn, innhold_sha256 },
    ])
  );
}

/** Det som mangler, med feltet det står ved og posten feltet hører til. */
export interface Mangel {
  felt: string;
  post: string | null;
  /** Teksten øverst i skjemaet, med posten. */
  tekst: string;
  /** Teksten ved feltet, som står i posten. */
  ved: string;
}

/** Feilen i et beløpsfelt, eller `null`. `paakrevd` sier om feltet må fylles ut. */
function beloepsfeil(t: string, paakrevd: boolean, mangler: string): string | null {
  const lest = lesKroner(t);
  if ('feil' in lest) return lest.feil;
  if (lest.verdi === undefined) return paakrevd ? mangler : null;
  return lest.verdi > 0 ? null : KRAVSKJEMA.merEnnNull;
}

/**
 * Det som hindrer brevet, med skjemaets ord og ID-en til feltet etter `prefiks`. Kjernen avviser
 * det samme med feltkoder (D-1, D-19, «Ugyldig valg» i BF-14).
 */
export function manglerIKravet(
  v: Kravvalg,
  varslene: readonly (Varselet | null)[],
  prefiks: string,
  navnet: (p: Kravpostvalg) => string
): Mangel[] {
  const ut: Mangel[] = [];
  const med = postene(v);
  if (!med.length && !v.saerskilt)
    ut.push({
      felt: `${prefiks}-legg-til`,
      post: null,
      tekst: KRAVSKJEMA.ingenPoster,
      ved: KRAVSKJEMA.ingenPoster,
    });
  med.forEach((p, i) => {
    const legg = (felt: string, t: string | null) => {
      if (t)
        ut.push({
          felt: `${prefiks}-${felt}-${p.noekkel}`,
          post: p.noekkel,
          tekst: KRAVSKJEMA.iPosten(navnet(p), t),
          ved: t,
        });
    };
    legg('beskrivelse', p.beskrivelse.trim() ? null : KRAVSKJEMA.manglerBeskrivelse);
    legg('form', p.form === null ? KRAVSKJEMA.manglerForm : null);
    if (p.form === 'tilbud') legg('beloep', beloepsfeil(p.beloep, true, KRAVSKJEMA.manglerBeloep));
    if (p.form === 'enhetspriser') {
      legg('justert', p.justert === null ? KRAVSKJEMA.manglerJustert : null);
      legg('anslag', beloepsfeil(p.anslag, false, ''));
    }
    if (p.form === 'regningsarbeid') legg('overslag', beloepsfeil(p.overslag, false, ''));
    if (varslene[i]?.art !== 'kravet') return;
    const valg = gjeldendeVarselvalg(v, p);
    if (p.varsel.art === 'saken')
      legg('varsel', valg.varsel === null ? KRAVSKJEMA.manglerVarselet : null);
    if (p.varsel.art === 'samme')
      legg('varsel', valg.art === 'dokument' ? null : KRAVSKJEMA.manglerSamme);
    if (p.varsel.art === 'dokument') {
      legg('type', valg.type === null ? KRAVSKJEMA.manglerType : null);
      legg('dato', valg.dato ? null : KRAVSKJEMA.manglerDato);
      legg('dokument', valg.vedlegg.length ? null : KRAVSKJEMA.manglerDokument);
    }
  });
  if (v.saerskilt) {
    const f = beloepsfeil(v.saerskilt.beloep, true, KRAVSKJEMA.manglerBeloep);
    if (f)
      ut.push({
        felt: `${prefiks}-saerskilt`,
        post: null,
        tekst: KRAVSKJEMA.iSaerskilt(f),
        ved: f,
      });
  }
  return ut;
}

/** Det TE krever: summen av de faste beløpene og av anslagene og overslagene, som ikke er krevd. */
export function summene(v: Kravvalg): { faste: number; iKravpostene: number; anslag: number } {
  // I øre, så summen ikke får avrundingsfeil.
  let faste = 0;
  let anslag = 0;
  const oere = (t: string) => Math.round((beloepet(t) ?? 0) * 100);
  for (const p of postene(v)) {
    if (p.form === 'tilbud') faste += oere(p.beloep);
    if (p.form === 'enhetspriser') anslag += oere(p.anslag);
    if (p.form === 'regningsarbeid') anslag += oere(p.overslag);
  }
  const iKravpostene = faste;
  if (v.saerskilt) faste += oere(v.saerskilt.beloep);
  return { faste: faste / 100, iKravpostene: iKravpostene / 100, anslag: anslag / 100 };
}

/** Fordelingen på PNS, med de faste beløpene og anslagene per kode (U-3 i BF-14). */
export function fordelingenPaaPns(v: Kravvalg): { pns: string; faste: number; anslag: number }[] {
  const per = new Map<string, { faste: number; anslag: number }>();
  for (const p of postene(v)) {
    const pns = p.pns.trim();
    if (!pns) continue;
    const r = per.get(pns) ?? { faste: 0, anslag: 0 };
    const b = (t: string) => Math.round((beloepet(t) ?? 0) * 100);
    if (p.form === 'tilbud') r.faste += b(p.beloep);
    if (p.form === 'enhetspriser') r.anslag += b(p.anslag);
    if (p.form === 'regningsarbeid') r.anslag += b(p.overslag);
    per.set(pns, r);
  }
  return [...per]
    .sort(([a], [b]) => a.localeCompare(b, 'nb', { numeric: true }))
    .map(([pns, r]) => ({ pns, faste: r.faste / 100, anslag: r.anslag / 100 }));
}
