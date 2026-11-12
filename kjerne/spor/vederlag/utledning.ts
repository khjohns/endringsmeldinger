/**
 * Utledningen i vederlagssporet: versjonsreglene for kravpostene, varselet hver kravpost
 * trenger, og lesereglene i 4.2 som er vederlagets egne (`KONTROLLER_I_VEDERLAGET`, som
 * `utledning/utled.ts` slår opp gjennom `KONTROLLER`, #1783).
 *
 * Versjonsreglene for kravpostene i vederlagskravet. En ny kravversjon tar med hver kravpost
 * fra forrige versjon som ikke trekkes (KA-U56), og en trukket kravpost kan tas med igjen
 * (KA-U75). Betegnelsen følger posten, også gjennom et trekk, og brukes ikke av en ny
 * kravpost (KA-U53, KA-U75).
 *
 * Kommandoen og lesingen av journalen bruker samme regel: kommandoen før serveren har satt
 * `id` og betegnelse på de nye postene, journalen etter.
 */

import {
  harProduktivitetspost,
  innholdIVederlaget,
  kravposterI,
  OPPGJOERSHJEMMEL,
} from './format.ts';
import type { Bakover, LestVarsel, Sporskontroller, Ugyldig } from '../../utledning/utled.ts';
import {
  erKravpostvarselhjemmel,
  type Dokument,
  type Krav,
  type Kravpost,
  type Kravpostvarselet,
  type Kravpostvarselhjemmel,
  type Standpunkt,
  type Svar,
} from '../../typer.ts';

type Postinndata = { id?: unknown; betegnelse?: unknown };
type Kravversjonsinndata = { kravposter?: readonly Postinndata[]; trekker?: readonly unknown[] };

/** Betegnelsene brukt i sporet, også av kravposter som er trukket (KA-U75). */
export function brukteBetegnelser(tidligere: readonly Pick<Krav, 'innhold'>[]): Set<string> {
  return new Set(tidligere.flatMap((k) => kravposterI(k).map((p) => p.betegnelse)));
}

/** Betegnelsen en ny kravpost får: tallet etter det høyeste som er brukt i sporet (KA-U53). */
export function nesteBetegnelse(brukte: ReadonlySet<string>): string {
  const tall = [...brukte].map((b) => Number(b.slice(1)));
  return `P${Math.max(0, ...tall) + 1}`;
}

/**
 * Hvorfor kravpostene i den nye kravversjonen strider mot de tidligere versjonene i sporet,
 * eller `null`. `lagret` sier om innholdet er en lagret versjon, der en ny kravpost har fått
 * `id` og betegnelse, eller en kommando, der en ny kravpost er uten `id`.
 */
export function kravposteneStrider(
  ny: Kravversjonsinndata,
  tidligere: readonly Pick<Krav, 'innhold'>[],
  lagret: boolean
): string | null {
  const forrige = new Map(
    (tidligere.length ? kravposterI(tidligere.at(-1)!) : []).map((p) => [p.id, p])
  );
  const foer = new Map(tidligere.flatMap((k) => kravposterI(k)).map((p) => [p.id, p]));
  const brukte = brukteBetegnelser(tidligere);
  const trekker = (ny.trekker ?? []) as string[];
  const trukne = new Set<string>();
  for (const id of trekker) {
    if (!forrige.has(id)) return `trekker kravposten ${id}, som ikke er med i forrige kravversjon`;
    if (trukne.has(id)) return `trekker kravposten ${forrige.get(id)!.betegnelse} to ganger`;
    trukne.add(id);
  }
  const sett = new Set<string>();
  const betegnelser = new Set<string>();
  for (const p of ny.kravposter ?? []) {
    const id = p.id as string | undefined;
    if (id !== undefined) {
      if (sett.has(id)) return `har kravposten ${id} to ganger`;
      sett.add(id);
    }
    const kjent = id === undefined ? undefined : (forrige.get(id) ?? foer.get(id));
    if (id !== undefined && trekker.includes(id))
      return `både tar med og trekker kravposten ${forrige.get(id)!.betegnelse}`;
    if (id !== undefined && !kjent && !lagret)
      return `har kravposten ${id}, som ikke har stått i sporet`;
    if (!lagret) continue;
    const betegnelse = p.betegnelse as string;
    if (betegnelser.has(betegnelse)) return `har betegnelsen ${betegnelse} to ganger`;
    betegnelser.add(betegnelse);
    if (kjent && kjent.betegnelse !== betegnelse)
      return `gir kravposten ${kjent.betegnelse} betegnelsen ${betegnelse}`;
    if (!kjent && brukte.has(betegnelse))
      return `gir en ny kravpost betegnelsen ${betegnelse}, som er brukt før i sporet (KA-U53, KA-U75)`;
  }
  const mangler = [...forrige.values()].filter((p) => !sett.has(p.id) && !trekker.includes(p.id));
  return mangler.length
    ? `mangler ${mangler.map((p) => p.betegnelse).join(', ')} uten at ${mangler.length > 1 ? 'de er trukket' : 'den er trukket'} (KA-U56)`
    : null;
}

/** Varselet en kravpost med den oppgjørsformen trenger, eller `null` (VS-U48, KA-U68). */
export const varselhjemmel = (
  p: Pick<Kravpost, 'oppgjoersform' | 'justert'>
): Kravpostvarselhjemmel | null =>
  p.oppgjoersform === 'regningsarbeid'
    ? '34.4'
    : p.oppgjoersform === 'enhetspriser' && p.justert === true
      ? '34.3.3'
      : null;

/** Om en tidligere versjon i sporet har kravposten med samme varselhjemmel (VS-U49). */
const hattFoer = (
  p: ReturnType<typeof kravposterI>[number],
  hjemmel: Kravpostvarselhjemmel,
  tidligere: readonly Pick<Krav, 'innhold'>[]
) =>
  tidligere.some((k) => kravposterI(k).some((q) => q.id === p.id && varselhjemmel(q) === hjemmel));

/**
 * Varselet for hver kravpost i `krav` som trenger et, etter kravpostens `id`.
 * - VS-U48, VS-U49: kravet er varselet når ingen tidligere versjon har posten med samme
 *   oppgjørsform, justert for enhetspriser.
 * - VS-U50, VS-U54: viser kravposten til et varsel, er varselet gitt der.
 * - D-16 i BF-14 (arbeidsvalget i Følge hos VS-U48) og VS-U55: ellers gjelder et varsel etter
 *   samme bestemmelse sendt eller registrert før det første kravet posten. Kravet viser da til
 *   det første av dem og er ikke varselet selv.
 * `tidligere` er versjonene før `krav` i sporet, og `varsler` varslene etter § 34.3.3 og
 * § 34.4 før `krav`, i rekkefølgen i journalen, uten dokumentene kravskjemaet la til for en
 * kravpost i samme handling, som gjelder bare den posten (VS-U51, VS-U53).
 */
export function kravpostvarslene(
  krav: Pick<Krav, 'innhold'>,
  tidligere: readonly Pick<Krav, 'innhold'>[],
  varsler: readonly { id: string; hjemmel: string }[]
): Record<string, Kravpostvarselet> {
  const ut: Record<string, Kravpostvarselet> = {};
  for (const p of kravposterI(krav)) {
    const hjemmel = varselhjemmel(p);
    if (hjemmel === null || hattFoer(p, hjemmel, tidligere)) continue;
    const gitt =
      p.varsel ?? (tidligere.length ? undefined : varsler.find((v) => v.hjemmel === hjemmel)?.id);
    ut[p.id] = gitt ? { art: 'gitt', varsel: gitt } : { art: 'kravet' };
  }
  return ut;
}

/**
 * Hvorfor en kravpost i den nye kravversjonen viser til et varsel den ikke kan vise til, eller
 * `null` (VS-U50, VS-U54). Kravposten må trenge varselet etter § 34.3.3 eller § 34.4 og være
 * varsel for seg (VS-U49), og varselet må stå i saken før kravet med samme bestemmelse.
 * `varsler` er varslene etter § 34.3.3 og § 34.4 før kravet.
 */
export function kravpostvarseletStrider(
  ny: Pick<Krav, 'innhold'>,
  tidligere: readonly Pick<Krav, 'innhold'>[],
  varsler: readonly { id: string; hjemmel: string }[]
): string | null {
  for (const [i, p] of kravposterI(ny).entries()) {
    if (p.varsel === undefined) continue;
    const posten = p.betegnelse ? `kravposten ${p.betegnelse}` : `kravpost nr. ${i + 1}`;
    const hjemmel = varselhjemmel(p);
    if (hjemmel === null)
      return `${posten} viser til et varsel, men oppgjørsformen krever ikke varsel etter § 34.3.3 eller § 34.4 (VS-U50)`;
    // KA-U75: også en kravpost som er trukket og tas med igjen, sammenlignes med siste versjon den sto i.
    const somFoer = [...tidligere]
      .reverse()
      .map((k) => kravposterI(k).find((q) => q.id === p.id))
      .find((q) => q !== undefined);
    if (hattFoer(p, hjemmel, tidligere) && somFoer?.varsel !== p.varsel)
      return `${posten} viser til et varsel, men hadde oppgjørsformen i en tidligere kravversjon (VS-U49, VS-U50)`;
    if (!varsler.some((v) => v.id === p.varsel && v.hjemmel === hjemmel))
      return `${posten} viser til et varsel som ikke er et varsel etter § ${hjemmel} sendt eller registrert i saken før kravet (VS-U50)`;
  }
  return null;
}

/** VS-U50, VS-U54: en kravpost viser bare til et varsel for posten som står før kravet. */
function kontrollerKravpostvarslene(
  krav: readonly Krav[],
  varsler: readonly LestVarsel[],
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  krav.forEach((k, i) => {
    const foer = varsler.filter((v) => erKravpostvarselhjemmel(v.hjemmel) && bakover(k.id, v.id));
    const strid = kravpostvarseletStrider(k, krav.slice(0, i), foer);
    if (strid) ugyldig(k.id, strid);
  });
}

/**
 * VS-U51, VS-U53: et vederlagskrav har bare dokumentene kravskjemaet la til som varselet for en
 * kravpost som vedlegg, og de står i det registrerte varselet kravposten viser til.
 */
function kontrollerVedleggeneVedKravet(
  krav: readonly Krav[],
  dokumentetTil: (id: string) => Dokument | undefined,
  ugyldig: Ugyldig
): void {
  for (const k of krav) {
    const ved = dokumentetTil(k.id)?.dokumentasjon ?? [];
    const varslene = new Set(
      kravposterI(k).flatMap((p) =>
        p.varsel ? (dokumentetTil(p.varsel)?.dokumentasjon ?? []).map((v) => v.vedlegg_id) : []
      )
    );
    if (ved.some((v) => !varslene.has(v.vedlegg_id)))
      ugyldig(
        k.id,
        'vederlagskravet har et vedlegg som ikke er dokumentet med varselet for en kravpost (VS-U51)'
      );
  }
}

/**
 * OV-U23, KA-U57 (c): svaret på vederlaget har ett beløp for hver post i kravet og ingen
 * andre. Oppgjørsformen står rett foran beløpet for samme kravpost (leseren), så den følger med.
 */
function kontrollerPostene(s: Svar, krav: Krav, ugyldig: Ugyldig): void {
  const noekler = (poster: [string, string][]) =>
    poster
      .map((p) => JSON.stringify(p))
      .sort()
      .join();
  const iSvaret = noekler(
    s.standpunkter.flatMap((p): [string, string][] =>
      p.art !== 'beloep'
        ? []
        : [p.gjelder !== undefined ? ['kravpost', p.gjelder] : ['saerskilt', String(p.saerskilt)]]
    )
  );
  const iKravet = noekler([
    ...kravposterI(krav).map((p): [string, string] => ['kravpost', p.id]),
    ...(harProduktivitetspost(krav) ? [['saerskilt', 'produktivitet'] as [string, string]] : []),
  ]);
  if (iSvaret !== iKravet) ugyldig(s.id, 'beløpene i svaret er ikke de samme postene som i kravet');
  const poster = new Map(kravposterI(krav).map((p) => [p.id, p]));
  for (const p of s.standpunkter) {
    const grunn = kravpoststandpunktetStrider(p, poster);
    if (grunn) ugyldig(s.id, grunn);
  }
}

/**
 * Hvorfor et standpunkt som gjelder en kravpost, ikke passer til kravposten i kravet, eller
 * `null`: standpunktet til oppgjørsformen har TEs oppgjørsform som hjemmel, rettidigheten etter
 * § 34.3.3 eller § 34.4 gjelder en kravpost som trenger det varselet (KA-U64), justeringen
 * gjelder en kravpost med justerte enhetspriser (KA-U68), og beløpet har ikke et beløp for en
 * kravpost etter en beregningsregel (OV-U95 punkt 5).
 */
function kravpoststandpunktetStrider(
  p: Standpunkt,
  poster: ReadonlyMap<string, ReturnType<typeof kravposterI>[number]>
): string | null {
  if (p.art === 'oppgjoersform') {
    const post = poster.get(p.gjelder);
    return post && OPPGJOERSHJEMMEL[post.oppgjoersform] === p.hjemmel
      ? null
      : 'standpunktet til oppgjørsformen har ikke TEs oppgjørsform for kravposten som hjemmel';
  }
  if (p.art === 'rettidighet' && erKravpostvarselhjemmel(p.hjemmel)) {
    const post = poster.get(p.gjelder);
    return post && varselhjemmel(post) === p.hjemmel
      ? null
      : `rettidigheten etter § ${p.hjemmel} gjelder ikke en kravpost som trenger det varselet`;
  }
  if (p.art === 'justering') {
    const post = poster.get(p.gjelder);
    return post?.oppgjoersform === 'enhetspriser' && post.justert === true
      ? null
      : 'justeringen gjelder ikke en kravpost med justerte enhetspriser';
  }
  // OV-U95 punkt 5: en kravpost etter en beregningsregel har ikke et beløp i svaret.
  if (p.art === 'beloep' && p.gjelder !== undefined && p.godkjent !== undefined) {
    const post = poster.get(p.gjelder);
    return post && post.oppgjoersform !== 'tilbud'
      ? 'standpunktet til beløpet har et beløp for en kravpost etter en beregningsregel'
      : null;
  }
  return null;
}

/** Kontrollene i vederlaget, som `utledning/utled.ts` slår opp gjennom `KONTROLLER`. */
export const KONTROLLER_I_VEDERLAGET = {
  kravet: (k, tidligere) => kravposteneStrider(innholdIVederlaget(k), tidligere, true),
  kravene: (krav, varsler, bakover, dokumentetTil, ugyldig) => {
    kontrollerKravpostvarslene(krav, varsler, bakover, ugyldig);
    kontrollerVedleggeneVedKravet(krav, dokumentetTil, ugyldig);
  },
  svaret: kontrollerPostene,
} satisfies Sporskontroller;
