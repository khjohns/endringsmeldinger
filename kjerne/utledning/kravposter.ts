/**
 * Versjonsreglene for kravpostene i vederlagskravet. En ny kravversjon tar med hver kravpost
 * fra forrige versjon som ikke trekkes, og en trukket kravpost tas ikke opp igjen
 * (KA-U56; KA-U51 punkt 11 utvidet til kravposter i KA-U70).
 * Betegnelsen følger posten og brukes ikke igjen (KA-U53, KA-U70).
 *
 * Kommandoen og lesingen av journalen bruker samme regel: kommandoen før serveren har satt
 * `id` og betegnelse på de nye postene, journalen etter.
 */

import { kravposterI } from '../frosset/standpunkt.ts';
import type { Krav } from '../typer.ts';

type Postinndata = { id?: unknown; betegnelse?: unknown };
type Vederlagsinnhold = { kravposter?: Postinndata[]; trekker?: unknown[] };

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
  ny: Vederlagsinnhold,
  tidligere: readonly Pick<Krav, 'innhold'>[],
  lagret: boolean
): string | null {
  const forrige = new Map(
    (tidligere.length ? kravposterI(tidligere.at(-1)!) : []).map((p) => [p.id, p])
  );
  const foer = new Map(tidligere.flatMap((k) => kravposterI(k)).map((p) => [p.id, p]));
  const brukte = brukteBetegnelser(tidligere);
  const trekker = (ny.trekker ?? []) as string[];
  for (const [i, id] of trekker.entries()) {
    if (!forrige.has(id)) return `trekker kravposten ${id}, som ikke er med i forrige kravversjon`;
    if (trekker.indexOf(id) !== i)
      return `trekker kravposten ${forrige.get(id)!.betegnelse} to ganger`;
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
