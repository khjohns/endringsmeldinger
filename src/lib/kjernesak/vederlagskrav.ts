/**
 * Varslene etter § 34.3.3 og § 34.4 for kravpostene i et vederlagskrav TE skriver (VS-U87 punkt
 * 22 og 23, D-19 i BF-14), lest av kjernen som brevet gjør, så skjemaet viser det brevet vil si.
 */

import { kravposterI, varseletPostenViserTil } from '#kjerne/spor/vederlag/format.ts';
import {
  eldreKravFoer,
  kravpostvarslene,
  varslerIEldreKrav,
} from '#kjerne/spor/vederlag/utledning.ts';
import { varselhjemmel } from '#kjerne/spor/vederlag/format.ts';
import {
  type Krav,
  type Kravpost,
  type Kravpostvarselhjemmel,
  type SvarbarVarselhjemmel,
  VARSELSPOR,
} from '#kjerne/typer.ts';
import { foerDagen, kalenderdag } from '#kjerne/format/leser.ts';
import {
  datoenDetBleSendt,
  varseletFoerBrevet as foersteVarselFoerBrevet,
  varseletForNyttSvar,
  type Utledning,
} from '#kjerne/utledning/utled.ts';
import { standpunkteneTilVarslene } from '#kjerne/spor/vederlag/utledning.ts';
import { varseletSvaretGjelder } from '#kjerne/spor/vederlag/kommando.ts';
import { fristvarseletIKravet, fristvarseletSvaretGjelder } from '#kjerne/spor/frist/kommando.ts';
import { svarkjeden } from '#kjerne/utledning/utled.ts';
import { svaretsVarsel } from '#kjerne/kommandoer/standpunkter.ts';

/** Om vederlagskravet sendt dagen `sendt` gir det særskilte varselet etter § 34.1.3 (#2425). */
export { kravetErDetFoersteVarselet } from '#kjerne/spor/vederlag/kommando.ts';
import type { StandpunktTilVarselet } from '#kjerne/frosset/standpunkt.ts';

/** Kravposten i skjemaet: feltene kjernen leser for varselet, og `id` når posten fantes før. */
export type Kravpostutkast = Pick<Kravpost, 'oppgjoersform' | 'justert'> & { id?: string };

/**
 * Varselet en kravpost i skjemaet trenger, slik kravet ville uttrykt det:
 * - `kravet`: kravet er varselet for posten, og TE kan oppgi at det er gitt før (VS-U49, VS-U50).
 *   `velges` er varslene etter samme bestemmelse som ingen kravpost viser til, og som TE velger
 *   mellom for posten (VS-U87 punkt 23, U-7 i BF-37);
 * - `gitt`: et eldre krav er varselet for posten (OV-U120);
 * - `foer`: posten hadde oppgjørsformen i en tidligere versjon, i kravet `krav` (VS-U49).
 */
export type Varselet =
  | { art: 'kravet'; hjemmel: Kravpostvarselhjemmel; velges?: Kravpostvarsel[] }
  | { art: 'gitt'; hjemmel: Kravpostvarselhjemmel; varsel: string; dokument: string }
  | { art: 'foer'; hjemmel: Kravpostvarselhjemmel; krav: string; varsel: string | null };

/**
 * Varselet hver kravpost trenger, i rekkefølgen i skjemaet, eller `null` når den ikke trenger et.
 * `krav` er kravversjonene kravet prøves mot, for et krav lagt til sendt før det siste de sendt før
 * det (OV-U118, `kravversjoneneKravetProevesMot`). `sendt` er dagen et krav som legges til, ble
 * sendt, og `null` for et krav fra løsningen: de eldre kravene sendt før det regnes med (OV-U120).
 */
export function varslenePerKravpost(
  u: Utledning,
  krav: readonly Krav[],
  poster: readonly Kravpostutkast[],
  sendt: string | null
): (Varselet | null)[] {
  const lest = poster.map((p, i) => ({ ...p, id: p.id ?? `ny-${i}` }));
  // Uten `varsel` sier kjernen om kravet ville vært varselet, før TE oppgir noe for posten.
  const eldreKrav = eldreKravFoer(u, sendt);
  const etter = kravpostvarslene({ innhold: { kravposter: lest } }, krav, eldreKrav);
  const sendtFoer = new Set(eldreKrav.map((k) => k.dokument));
  const iEldre = varslerIEldreKrav(u).filter((v) => sendtFoer.has(v.dokument));
  const ubrukte = varslerUtenKravpost(u, sendt);
  return lest.map((p) => {
    const hjemmel = varselhjemmel(p);
    if (hjemmel === null) return null;
    const v = etter[p.id];
    if (v?.art === 'kravet') {
      const velges = ubrukte.filter((x) => x.hjemmel === hjemmel);
      return { art: 'kravet', hjemmel, ...(velges.length ? { velges } : {}) };
    }
    if (v?.art === 'gitt')
      return { art: 'gitt', hjemmel, varsel: v.varsel, dokument: dokumentet(u, v.varsel) };
    // OV-U120: et eldre krav er varselet for posten.
    const eldre = iEldre.find((x) => x.gjelder === p.id && x.hjemmel === hjemmel);
    if (eldre) return { art: 'foer', hjemmel, krav: eldre.dokument, varsel: null };
    // Posten hadde oppgjørsformen før: det første kravet med den, og varselet posten viste til der.
    const foerste = krav.find((k) =>
      kravposterI(k).some((q) => q.id === p.id && varselhjemmel(q) === hjemmel)
    );
    if (!foerste) return null;
    const der = kravposterI(foerste).find((q) => q.id === p.id)!;
    return {
      art: 'foer',
      hjemmel,
      krav: foerste.dokument,
      varsel: varseletPostenViserTil(der) ?? null,
    };
  });
}

/** Brevet med varselet: et registrert varsel, eller et krav utenfor rekken (OV-U120). */
const dokumentet = (u: Utledning, varsel: string) =>
  u.spor.vederlag.kravpostvarsler.find((v) => v.id === varsel)?.dokument ??
  u.spor.vederlag.kravUtenforRekken.find((k) => k.id === varsel)?.dokument ??
  varsel;

/** Et varsel etter § 34.3.3 eller § 34.4 i saken, med brevet det står i. */
export interface Kravpostvarsel {
  id: string;
  hjemmel: Kravpostvarselhjemmel;
  dokument: string;
  /** VS-U87 punkt 27: arbeidet varselet gjelder, slik TE skrev det. */
  arbeid?: string;
}

/** Varslene etter § 34.3.3 og § 34.4 i saken, i rekkefølgen i journalen (VS-U48, VS-U52). */
export const varsleneISaken = (u: Utledning): Kravpostvarsel[] =>
  u.spor.vederlag.kravpostvarsler.flatMap((v) =>
    v.hjemmel === '34.3.3' || v.hjemmel === '34.4'
      ? [{ id: v.id, hjemmel: v.hjemmel, dokument: v.dokument, arbeid: v.arbeid }]
      : []
  );

/** Arbeidet varselet `id` etter § 34.3.3 eller § 34.4 gjelder (VS-U87 punkt 27), eller `undefined`. */
export const arbeidetI = (u: Utledning, id: string): string | undefined =>
  u.spor.vederlag.kravpostvarsler.find((v) => v.id === id)?.arbeid;

/**
 * Varslene i saken som ingen kravpost i et krav viser til, så skjemaet kan si at saken har dem
 * (U-12 i BF-14, oppdragsgiver 09.11) og spørre hvilket varsel en kravpost gjelder (VS-U87
 * punkt 23). For et krav lagt til, sendt dagen `sendt`, bare varslene sendt samme dag eller før,
 * som kjernen leser dem (`varselvalgetMangler`, OV-U98).
 */
export function varslerUtenKravpost(u: Utledning, sendt: string | null = null): Kravpostvarsel[] {
  const { krav, kravUtenforRekken } = u.spor.vederlag;
  const brukt = new Set(
    [...krav, ...kravUtenforRekken].flatMap(kravposterI).map(varseletPostenViserTil)
  );
  const dag = sendt === null ? null : kalenderdag(sendt);
  return varsleneISaken(u).filter(
    (v) => !brukt.has(v.id) && (dag === null || !foerDagen(dag, datoenDetBleSendt(u, v) ?? ''))
  );
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
 * Det første varselet etter § 34.1.3 i saken, registrert eller et krav, også et krav utenfor
 * rekken, som det egne brevet med kunnskapsdatoen viser til (VS-U85, `varseletFoerBrevet` i
 * kjernen), eller `null`.
 */
export const foersteVarsel3413 = (u: Utledning): string | null =>
  foersteVarselFoerBrevet(u, '34.1.3') ?? null;

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

/**
 * Varselet et svar som står alene gjelder: i vederlaget (VS-U79, VS-U87 punkt 30–32) eller
 * varselet om fristforlengelse etter § 33.4 i fristen (VS-U96 punkt 32).
 */
export interface VarseletAlene {
  id: string;
  hjemmel: SvarbarVarselhjemmel;
  /** Byggherrens siste standpunkt til varselet i svarene på det, slik kjernen leser det. */
  foer: Pick<StandpunktTilVarselet, 'iTide' | 'dokument'> | null;
  /** Byggherrens forrige svar på varselet, som et nytt svar erstatter (VS-U96 punkt 33). */
  forrigeSvar: string | null;
  /** VS-U87 punkt 27: arbeidet varselet gjelder (U-8 i BF-37). */
  arbeid: string | undefined;
  /**
   * Kravversjonen svaret bare på varselet gjelder, når kravet selv er varselet (VS-U96 punkt 38),
   * ellers `null`.
   */
  kravversjon: string | null;
}

/** Kjeden av svar et nytt svar på varselet hører til, som kjernen leser den (`svarkjeden`). */
export const kjedenFor = (varselet: VarseletAlene) =>
  svarkjeden({
    spor: VARSELSPOR[varselet.hjemmel],
    gjelder: varselet.kravversjon ?? varselet.id,
    bareVarselet: varselet.kravversjon !== null,
  });

/**
 * Om brevet `dokument` er et svar på et varsel som står alene. Innsigelsen etter § 34.4 der sa at
 * varselet kom for sent, ikke at det ikke ble gitt (VS-U77 punkt 31, MM-U50), som brevteksten
 * leser det.
 */
export const erSvarPaaVarsel = (u: Utledning, dokument: string) =>
  u.spor.vederlag.svarPaaVarsler.some((s) => s.dokument === dokument);

/** Bestemmelsen for varselet `gjelder`, når byggherren kan svare på det alene, ellers `null`. */
export const hjemmelenForVarselet = (u: Utledning, gjelder: string) =>
  (
    varseletSvaretGjelder(u, gjelder) ??
    fristvarseletSvaretGjelder(u, gjelder) ??
    fristvarseletIKravet(u, gjelder)
  )?.hjemmel ?? null;

/**
 * Varselet `gjelder` byggherren kan svare på alene, eller `null` (`varseletSvaretGjelder` og
 * `fristvarseletSvaretGjelder`).
 */
export function varseletSvaretPaa(u: Utledning, gjelder: string): VarseletAlene | null {
  const v = varseletSvaretGjelder(u, gjelder);
  if (!v) return fristvarseletSvaretPaa(u, gjelder);
  return {
    ...v,
    foer:
      standpunkteneTilVarslene(u, null).find(
        (x) => x.gjelder === v.id && x.hjemmel === v.hjemmel
      ) ?? null,
    forrigeSvar: u.spor.vederlag.svarPaaVarsler.findLast((s) => s.gjelder === v.id)?.id ?? null,
    arbeid: arbeidetI(u, v.id),
    kravversjon: null,
  };
}

/**
 * Varselet etter § 33.4 i fristen, med standpunktet i det siste svaret på det, som revisjonen
 * erstatter (`kontrollerSvarkjedene`, VS-U96 punkt 33): varselet som står alene (punkt 32), eller
 * varselet i kravversjonen `gjelder` når kravet selv er varselet (punkt 38). En innsigelse som er
 * gjentatt, står med brevet den først ble gjort gjeldende i, som `rettidighetIVarselet` i
 * brevteksten leser det (VS-U96 punkt 33 og 34).
 */
function fristvarseletSvaretPaa(u: Utledning, gjelder: string): VarseletAlene | null {
  const alene = fristvarseletSvaretGjelder(u, gjelder);
  const v = alene ?? fristvarseletIKravet(u, gjelder);
  if (!v) return null;
  const kjeden = svarkjeden({ spor: 'frist', gjelder, bareVarselet: !alene });
  const svarene = u.spor.frist.svarPaaVarsler.filter((s) => svarkjeden(s) === kjeden);
  const iTide = (s: (typeof svarene)[number]) => {
    const p = s.standpunkter.find((x) => x.art === 'rettidighet' && x.hjemmel === '33.4');
    return p?.art === 'rettidighet' ? p.iTide : null;
  };
  const forrige = svarene.at(-1);
  const standpunkt = forrige ? iTide(forrige) : null;
  let foerst = forrige;
  if (standpunkt === false)
    for (let s = forrige; s && iTide(s) === false; s = svarene.find((x) => x.id === s!.erstatter))
      foerst = s;
  return {
    ...v,
    foer: foerst && standpunkt !== null ? { iTide: standpunkt, dokument: foerst.dokument } : null,
    forrigeSvar: forrige?.id ?? null,
    arbeid: undefined,
    kravversjon: alene ? null : gjelder,
  };
}

/** En kravpost i vederlagskravet der kravet selv er varselet (VS-U96 punkt 38). */
export interface VarseletIPosten {
  post: Kravpost;
  hjemmel: Kravpostvarselhjemmel;
  /** Byggherrens siste standpunkt til varselet for posten, slik kjernen leser det. */
  foer: StandpunktTilVarselet | null;
}

/** Varslene i vederlagskravet byggherren kan svare bare på (`varsleneIVederlagskravet`). */
export interface VarsleneIVederlagskravet {
  kravversjon: string;
  poster: VarseletIPosten[];
  forrigeSvar: string | null;
}

/**
 * Kravpostene i vederlagskravet `gjelder` byggherren kan svare bare på varselet for, i rekkefølgen
 * i kravet, og det forrige svaret bare på varselet, som et nytt svar erstatter (VS-U96 punkt 33 og
 * 38, `svaretsVarsel` i kjernen), eller `null` når kravet ikke er varselet for noen post.
 */
export function varsleneIVederlagskravet(
  u: Utledning,
  gjelder: string
): VarsleneIVederlagskravet | null {
  const v = svaretsVarsel(u, { spor: 'vederlag', gjelder, bare_varselet: true });
  const krav = u.spor.vederlag.krav.find((k) => k.id === gjelder);
  if (!v || !('poster' in v) || !krav) return null;
  const foer = standpunkteneTilVarslene(u, null);
  const poster = kravposterI(krav).flatMap((post) => {
    const p = v.poster.find((x) => x.id === post.id);
    return p
      ? [
          {
            post,
            hjemmel: p.hjemmel,
            foer: foer.find((x) => x.gjelder === post.id && x.hjemmel === p.hjemmel) ?? null,
          },
        ]
      : [];
  });
  const kjeden = svarkjeden({ spor: 'vederlag', gjelder, bareVarselet: true });
  return {
    kravversjon: gjelder,
    poster,
    forrigeSvar:
      u.spor.vederlag.svarPaaVarsler.findLast((s) => svarkjeden(s) === kjeden)?.id ?? null,
  };
}
