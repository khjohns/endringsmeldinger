/**
 * Varslene etter § 34.3.3 og § 34.4 for kravpostene i et vederlagskrav TE skriver (VS-U49,
 * VS-U50, D-16 og D-19 i BF-14), lest av kjernen som brevet gjør, så skjemaet viser det brevet
 * vil si.
 */

import { kravposterI } from '#kjerne/spor/vederlag/format.ts';
import { kravpostvarslene } from '#kjerne/spor/vederlag/utledning.ts';
import { varselhjemmel } from '#kjerne/spor/vederlag/format.ts';
import type { Kravpost, Kravpostvarselhjemmel } from '#kjerne/typer.ts';
import { varseletForNyttSvar, type Utledning } from '#kjerne/utledning/utled.ts';
import { standpunkteneTilVarslene } from '#kjerne/spor/vederlag/utledning.ts';
import { varseletSvaretGjelder } from '#kjerne/spor/vederlag/kommando.ts';
import type { StandpunktTilVarselet } from '#kjerne/frosset/standpunkt.ts';

/** Kravposten i skjemaet: feltene kjernen leser for varselet, og `id` når posten fantes før. */
export type Kravpostutkast = Pick<Kravpost, 'oppgjoersform' | 'justert'> & { id?: string };

/**
 * Varselet en kravpost i skjemaet trenger, slik kravet ville uttrykt det:
 * - `kravet`: kravet er varselet for posten, og TE kan oppgi at det er gitt før (VS-U49, VS-U50);
 * - `gitt`: et varsel sendt eller registrert før det første kravet gjelder uten valg (D-16);
 * - `foer`: posten hadde oppgjørsformen i en tidligere versjon, i kravet `krav` (VS-U49).
 */
export type Varselet =
  | { art: 'kravet'; hjemmel: Kravpostvarselhjemmel }
  | { art: 'gitt'; hjemmel: Kravpostvarselhjemmel; varsel: string; dokument: string }
  | { art: 'foer'; hjemmel: Kravpostvarselhjemmel; krav: string; varsel: string | null };

/** Varselet hver kravpost trenger, i rekkefølgen i skjemaet, eller `null` når den ikke trenger et. */
export function varslenePerKravpost(
  u: Utledning,
  poster: readonly Kravpostutkast[]
): (Varselet | null)[] {
  const krav = u.spor.vederlag.krav;
  const lest = poster.map((p, i) => ({ ...p, id: p.id ?? `ny-${i}` }));
  // Uten `varsel` sier kjernen om kravet ville vært varselet, før TE oppgir noe for posten.
  const etter = kravpostvarslene(
    { innhold: { kravposter: lest } },
    krav,
    u.spor.vederlag.kravpostvarsler
  );
  return lest.map((p) => {
    const hjemmel = varselhjemmel(p);
    if (hjemmel === null) return null;
    const v = etter[p.id];
    if (v?.art === 'kravet') return { art: 'kravet', hjemmel };
    if (v?.art === 'gitt')
      return { art: 'gitt', hjemmel, varsel: v.varsel, dokument: dokumentet(u, v.varsel) };
    // Posten hadde oppgjørsformen før: det første kravet med den, og varselet posten viste til der.
    const foerste = krav.find((k) =>
      kravposterI(k).some((q) => q.id === p.id && varselhjemmel(q) === hjemmel)
    );
    if (!foerste) return null;
    const der = kravposterI(foerste).find((q) => q.id === p.id)!;
    return { art: 'foer', hjemmel, krav: foerste.dokument, varsel: der.varsel ?? null };
  });
}

const dokumentet = (u: Utledning, varsel: string) =>
  u.spor.vederlag.kravpostvarsler.find((v) => v.id === varsel)?.dokument ?? varsel;

/** Et varsel etter § 34.3.3 eller § 34.4 i saken, med brevet det står i. */
export interface Kravpostvarsel {
  id: string;
  hjemmel: Kravpostvarselhjemmel;
  dokument: string;
}

/** Varslene etter § 34.3.3 og § 34.4 i saken, i rekkefølgen i journalen (VS-U48, VS-U52). */
export const varsleneISaken = (u: Utledning): Kravpostvarsel[] =>
  u.spor.vederlag.kravpostvarsler.flatMap((v) =>
    v.hjemmel === '34.3.3' || v.hjemmel === '34.4'
      ? [{ id: v.id, hjemmel: v.hjemmel, dokument: v.dokument }]
      : []
  );

/**
 * Varslene i saken som ingen kravpost i et krav viser til, og som ikke gjelder en kravpost etter
 * D-16, så skjemaet kan si at saken har dem (U-12 i BF-14, oppdragsgiver 09.11).
 */
export function varslerUtenKravpost(u: Utledning): Kravpostvarsel[] {
  const brukt = new Set<string>();
  const tidligere: (typeof u.spor.vederlag.krav)[number][] = [];
  const plass = new Map(
    u.journal.flatMap((h, i) => (h.art === 'dokument' ? [[h.dokument.id, i] as const] : []))
  );
  const foerst = (a: string, b: string) => (plass.get(a) ?? -1) < (plass.get(b) ?? -1);
  for (const k of u.spor.vederlag.krav) {
    const foer = u.spor.vederlag.kravpostvarsler.filter((v) => foerst(v.dokument, k.dokument));
    for (const v of Object.values(kravpostvarslene(k, tidligere, foer)))
      if (v.art === 'gitt') brukt.add(v.varsel);
    tidligere.push(k);
  }
  return varsleneISaken(u).filter((v) => !brukt.has(v.id));
}

/**
 * Brevet med varselet etter § 34.1.2 eller § 34.1.3 som et nytt krav følger etter: det
 * registrerte varselet eller det første kravet som varslet (OV-U5, OV-U89), eller `null` når det
 * nye kravet er varselet.
 */
export function varseletFoerKravet(u: Utledning, hjemmel: '34.1.2' | '34.1.3'): string | null {
  const s = u.spor.vederlag;
  const registrert = s.varsler[hjemmel];
  if (!registrert && !s.krav.length) return null;
  try {
    const id = varseletForNyttSvar(u, hjemmel);
    return registrert?.id === id
      ? registrert.dokument
      : (s.krav.find((k) => k.id === id)?.dokument ?? null);
  } catch (feil) {
    // Ingen tidligere krav varslet etter hjemmelen, som § 34.1.3 uten den særskilte posten.
    // Alle andre feil er programfeil og skal ikke vises som at kravet er varselet.
    if (feil instanceof Error && feil.message.startsWith('Et svar kan ikke påberope')) return null;
    throw feil;
  }
}

/** Varselet kravposten trenger, etter oppgjørsformen (`varselhjemmel` i kjernen), eller `null`. */
export const varselhjemmelFor = (post: Kravpost): Kravpostvarselhjemmel | null =>
  varselhjemmel(post);

/**
 * Byggherrens siste standpunkt til varselet kravposten trenger, i svarene før dette, slik kjernen
 * leser det (`standpunkteneTilVarslene`, VS-U77 punkt 8–12), eller `null`.
 */
export const varseletFoer = (u: Utledning, post: Kravpost): StandpunktTilVarselet | null => {
  const hjemmel = varselhjemmel(post);
  return (
    standpunkteneTilVarslene(u, null).find((x) => x.gjelder === post.id && x.hjemmel === hjemmel) ??
    null
  );
};

/**
 * Byggherrens standpunkt til varselet for kravposten slik det sto før brevet `dokument`, som
 * brevet leste det (MM-U50). Journalen kuttes foran brevet, så svar fra samme dag leses i
 * journalens rekkefølge, som i `standpunkteneTilVarslene`.
 */
export function varseletFoerBrevet(
  u: Utledning,
  post: Kravpost,
  dokument: string
): StandpunktTilVarselet | null {
  const i = u.journal.findIndex((h) => h.art === 'dokument' && h.dokument.id === dokument);
  if (i < 0) throw new Error(`Brevet ${dokument} er ikke i saken`);
  return varseletFoer({ ...u, journal: u.journal.slice(0, i) }, post);
}

/** Varselet etter § 34.3.3 eller § 34.4 et svar som står alene gjelder (VS-U79). */
export interface VarseletAlene {
  id: string;
  hjemmel: Kravpostvarselhjemmel;
  /** Byggherrens siste standpunkt til varselet i svarene på det, slik kjernen leser det. */
  foer: StandpunktTilVarselet | null;
  /** Byggherrens forrige svar på varselet, som et nytt svar erstatter (VS-U77 punkt 33). */
  forrigeSvar: string | null;
}

/**
 * Om brevet `dokument` er et svar på et varsel som står alene. Innsigelsen etter § 34.4 der sa at
 * varselet kom for sent, ikke at det ikke ble gitt (VS-U77 punkt 31, MM-U50), som brevteksten
 * leser det.
 */
export const erSvarPaaVarsel = (u: Utledning, dokument: string) =>
  u.spor.vederlag.svarPaaVarsler.some((s) => s.dokument === dokument);

/** Bestemmelsen for varselet `gjelder`, når byggherren kan svare på det alene, ellers `null`. */
export const hjemmelenForVarselet = (u: Utledning, gjelder: string) =>
  varseletSvaretGjelder(u, gjelder)?.hjemmel ?? null;

/** Varselet `gjelder` i vederlaget som byggherren kan svare på, eller `null` (`varseletSvaretGjelder`). */
export function varseletSvaretPaa(u: Utledning, gjelder: string): VarseletAlene | null {
  const v = varseletSvaretGjelder(u, gjelder);
  if (!v) return null;
  return {
    ...v,
    foer:
      standpunkteneTilVarslene(u, null).find(
        (x) => x.gjelder === v.id && x.hjemmel === v.hjemmel
      ) ?? null,
    forrigeSvar: u.spor.vederlag.svarPaaVarsler.findLast((s) => s.gjelder === v.id)?.id ?? null,
  };
}
