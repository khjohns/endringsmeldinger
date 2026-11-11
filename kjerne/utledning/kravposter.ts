/**
 * Versjonsreglene for kravpostene i vederlagskravet. En ny kravversjon tar med hver kravpost
 * fra forrige versjon som ikke trekkes, og en trukket kravpost tas ikke opp igjen
 * (KA-U56; KA-U51 punkt 11 utvidet til kravposter i KA-U70).
 * Betegnelsen følger posten og brukes ikke igjen (KA-U53, KA-U70).
 *
 * Kommandoen og lesingen av journalen bruker samme regel: kommandoen før serveren har satt
 * `id` og betegnelse på de nye postene, journalen etter.
 */

import { kravposterI } from '../frosset/kravinnhold.ts';
import type { Krav, Kravpost, Kravpostvarselet, Kravpostvarselhjemmel } from '../typer.ts';

type Postinndata = { id?: unknown; betegnelse?: unknown };
type Kravversjonsinndata = { kravposter?: readonly Postinndata[]; trekker?: readonly unknown[] };

/** Betegnelsene brukt i sporet, også av kravposter som er trukket (KA-U70). */
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
    if (kjent && !forrige.has(id!))
      return `tar opp igjen kravposten ${kjent.betegnelse}, som er trukket (KA-U51 punkt 11, KA-U70)`;
    if (id !== undefined && !kjent && !lagret)
      return `har kravposten ${id}, som ikke er med i forrige kravversjon`;
    if (!lagret) continue;
    const betegnelse = p.betegnelse as string;
    if (betegnelser.has(betegnelse)) return `har betegnelsen ${betegnelse} to ganger`;
    betegnelser.add(betegnelse);
    if (kjent && kjent.betegnelse !== betegnelse)
      return `gir kravposten ${kjent.betegnelse} betegnelsen ${betegnelse}`;
    if (!kjent && brukte.has(betegnelse))
      return `gir en ny kravpost betegnelsen ${betegnelse}, som er brukt før i sporet (KA-U70)`;
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
 *   det første av dem og er ikke varselet selv. Et varsel en annen kravpost i kravet viser til,
 *   gjelder den posten og ikke denne, også dokumentet fra kravskjemaet (VS-U50, VS-U51).
 * `tidligere` er versjonene før `krav` i sporet, og `varsler` varslene etter § 34.3.3 og
 * § 34.4 før `krav`, i rekkefølgen i journalen.
 */
export function kravpostvarslene(
  krav: Pick<Krav, 'innhold'>,
  tidligere: readonly Pick<Krav, 'innhold'>[],
  varsler: readonly { id: string; hjemmel: string }[]
): Record<string, Kravpostvarselet> {
  const ut: Record<string, Kravpostvarselet> = {};
  const valgte = new Set(kravposterI(krav).flatMap((p) => (p.varsel ? [p.varsel] : [])));
  for (const p of kravposterI(krav)) {
    const hjemmel = varselhjemmel(p);
    if (hjemmel === null || hattFoer(p, hjemmel, tidligere)) continue;
    const gitt =
      p.varsel ??
      (tidligere.length
        ? undefined
        : varsler.find((v) => v.hjemmel === hjemmel && !valgte.has(v.id))?.id);
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
    if (hattFoer(p, hjemmel, tidligere))
      return `${posten} viser til et varsel, men hadde oppgjørsformen i en tidligere kravversjon (VS-U49, VS-U50)`;
    if (!varsler.some((v) => v.id === p.varsel && v.hjemmel === hjemmel))
      return `${posten} viser til et varsel som ikke er et varsel etter § ${hjemmel} sendt eller registrert i saken før kravet (VS-U50)`;
  }
  return null;
}
