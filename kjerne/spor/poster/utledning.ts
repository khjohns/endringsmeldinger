/**
 * Versjonsregelen for postene i et krav (#1778), utledet av vederlaget (KA-U53, KA-U56,
 * KA-U75). Sporet kaller den med postene sine og ordet for posten. Fristen har
 * sin egen regel (`fristeneStrider`, KA-U76, KA-U79), men deler kontrollen av trekket og av
 * postene som mangler (`trekketStrider`, `utelattUtenTrekk`).
 *
 * Kommandoen og lesingen av journalen bruker samme regel: kommandoen før serveren har satt
 * `id` og betegnelse på de nye postene, journalen etter.
 */

/** En post slik den er lagret i en kravversjon. */
export interface Post {
  id: string;
  betegnelse: string;
}

type Postinndata = { id?: unknown; betegnelse?: unknown };

/** Postene i en ny kravversjon, og postene fra forrige versjon den trekker. */
export interface Versjonsinndata {
  poster?: readonly Postinndata[];
  trekker?: readonly unknown[];
}

/** Betegnelsene brukt i sporet, også av poster som er trukket. */
export function brukteBetegnelser(versjoner: readonly (readonly Post[])[]): Set<string> {
  return new Set(versjoner.flatMap((poster) => poster.map((p) => p.betegnelse)));
}

/** Betegnelsen en ny post får: tallet etter det høyeste som er brukt i sporet (KA-U53). */
export function nesteBetegnelse(brukte: ReadonlySet<string>): string {
  const tall = [...brukte].map((b) => Number(b.slice(1)));
  return `P${Math.max(0, ...tall) + 1}`;
}

/**
 * Hvorfor postene i den nye kravversjonen strider mot de tidligere versjonene i sporet, eller
 * `null`. `tidligere` er postene i hver tidligere versjon, i rekkefølgen i sporet, og `andre` postene
 * i de andre versjonene i sporet, som en post kan være den samme som uten at den må være med
 * (OV-U119). `lagret`
 * sier om innholdet er en lagret versjon, der en ny post har fått `id` og betegnelse, eller en
 * kommando, der en ny post er uten `id`. `post` er ordet for posten i sporet, som «kravpost»,
 * og meldingen bruker det i bestemt form med «-en».
 */
export function posteneStrider(
  ny: Versjonsinndata,
  tidligere: readonly (readonly Post[])[],
  lagret: boolean,
  post: string,
  andre: readonly (readonly Post[])[] = []
): string | null {
  const posten = `${post}en`;
  const forrige = new Map((tidligere.at(-1) ?? []).map((p) => [p.id, p]));
  const foer = new Map([...andre, ...tidligere].flat().map((p) => [p.id, p]));
  const brukte = brukteBetegnelser([...andre, ...tidligere]);
  const trekker = (ny.trekker ?? []) as string[];
  const trekket = trekketStrider(
    trekker,
    forrige,
    (id) => `${posten} ${forrige.get(id)?.betegnelse ?? id}`
  );
  if (trekket) return trekket;
  const trukket = new Set(trekker);
  const sett = new Set<string>();
  const betegnelser = new Set<string>();
  for (const p of ny.poster ?? []) {
    const id = p.id as string | undefined;
    if (id !== undefined) {
      if (sett.has(id)) return `har ${posten} ${id} to ganger`;
      sett.add(id);
    }
    const kjent = id === undefined ? undefined : (forrige.get(id) ?? foer.get(id));
    if (id !== undefined && trukket.has(id))
      return `både tar med og trekker ${posten} ${forrige.get(id)!.betegnelse}`;
    if (id !== undefined && !kjent && !lagret)
      return `har ${posten} ${id}, som ikke har stått i sporet`;
    if (!lagret) continue;
    const betegnelse = p.betegnelse as string;
    if (betegnelser.has(betegnelse)) return `har betegnelsen ${betegnelse} to ganger`;
    betegnelser.add(betegnelse);
    if (kjent && kjent.betegnelse !== betegnelse)
      return `gir ${posten} ${kjent.betegnelse} betegnelsen ${betegnelse}`;
    // KA-U53, KA-U75.
    if (!kjent && brukte.has(betegnelse))
      return `gir en ny ${post} betegnelsen ${betegnelse}, som er brukt før i sporet`;
  }
  // KA-U56.
  return utelattUtenTrekk(
    forrige,
    (id) => sett.has(id) || trukket.has(id),
    (p) => p.betegnelse
  );
}

/**
 * Hvorfor trekket i den nye kravversjonen strider mot forrige versjon, eller `null`: hver post
 * det trekker, er med i forrige versjon og trekkes én gang. Vederlaget og fristen bruker samme
 * kontroll (#1956), og vederlaget også for den særskilte vederlagsjusteringen (KA-U83). `navn`
 * er posten med betegnelsen, eller med ID-en når den ikke er med i forrige versjon.
 */
export function trekketStrider<P extends Pick<Post, 'id'>>(
  trekker: readonly string[],
  forrige: ReadonlyMap<string, P>,
  navn: (id: string) => string
): string | null {
  const trukne = new Set<string>();
  for (const id of trekker) {
    if (!forrige.has(id)) return `trekker ${navn(id)}, som ikke er med i forrige kravversjon`;
    if (trukne.has(id)) return `trekker ${navn(id)} to ganger`;
    trukne.add(id);
  }
  return null;
}

/**
 * Postene i forrige versjon som den nye kravversjonen verken tar med eller trekker, som
 * meldingen, eller `null` (KA-U56, KA-U76).
 */
export function utelattUtenTrekk<P extends Pick<Post, 'id'>>(
  forrige: ReadonlyMap<string, P>,
  beholdt: (id: string) => boolean,
  betegnelse: (p: P) => string
): string | null {
  const mangler = [...forrige.values()].filter((p) => !beholdt(p.id));
  return mangler.length
    ? `mangler ${mangler.map(betegnelse).join(', ')} uten at ${mangler.length > 1 ? 'de er trukket' : 'den er trukket'}`
    : null;
}
