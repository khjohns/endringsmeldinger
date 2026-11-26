/**
 * TEs varsel i vederlaget uten krav, «Bare varsle» i kravskjemaet (U-1–U-5 i BF-37, U-11 i
 * BF-14): varslene i brevet, ett per rad, og kommandoen kjernen tar imot (`send_varsel` fra
 * løsningen, `varsel` for et varsel sendt utenfor løsningen). Kjernen avgjør hvilke varsler som kan
 * sendes (`sende_varsel:<hjemmel>` og `varsle:<hjemmel>` i handlingene), lager brevet og avviser
 * det den ikke godtar.
 */

import type { Kravvarselhjemmel } from '#kjerne/typer.ts';
import { definert } from './kommandoer';
import {
  korrespondansefeilene,
  registreringen,
  tomKorrespondanse,
  type Korrespondansevalg,
} from './korrespondansen';
import type { Mangel } from './mangler';
import { vedleggskart } from './nysak';
import { KUNNSKAPSDATO, VEDERLAGSVARSEL } from './tekster';

/**
 * Bestemmelsene et varsel i vederlaget kan gjelde, i rekkefølgen skjemaet tilbyr dem, som i
 * prototypen: de som kan gis flere ganger, først.
 */
export const VARSELHJEMLENE = ['34.4', '34.3.3', '34.1.2', '34.1.3'] as const;
export type Vederlagsvarselhjemmel = (typeof VARSELHJEMLENE)[number] & Kravvarselhjemmel;

/** VS-U87 punkt 27: varselet etter § 34.3.3 og § 34.4 har arbeidet det gjelder. */
export const harArbeid = (h: Vederlagsvarselhjemmel) => h === '34.3.3' || h === '34.4';

/** Ett varsel i brevet. `klarOver` er datoen etter § 34.1.3 annet ledd (U-1 i BF-48, VS-U86). */
export interface Varselrad {
  noekkel: string;
  hjemmel: Vederlagsvarselhjemmel;
  arbeid: string;
  klarOver: string;
}

/**
 * Varslene i brevet, og `utenfor` når TE registrerer et varsel sendt utenfor løsningen (U-5). Typen,
 * datoen og dokumentet gjelder alle varslene (D-4).
 */
export interface Varslingsvalg {
  rader: Varselrad[];
  utenfor: Korrespondansevalg | null;
  /** Teller for nøklene til nye rader. */
  nye: number;
}

/** Nøkkelen i handlingene for varselet: varselet etter § 34.1.2 er varselet i sporet (OV-U5). */
export const handlingsnoekkel = (type: 'sende_varsel' | 'varsle', h: Vederlagsvarselhjemmel) =>
  `${type}:${h === '34.1.2' ? 'vederlag' : h}`;

/** Bestemmelsene kjernen tilbyr nå, fra løsningen eller som registrering. */
export const tilbudteHjemler = (handlinger: readonly string[], registrer: boolean) =>
  VARSELHJEMLENE.filter((h) =>
    handlinger.includes(handlingsnoekkel(registrer ? 'varsle' : 'sende_varsel', h))
  );

/** En ny rad med bestemmelsen. */
export function nyVarselrad(v: Varslingsvalg, hjemmel: Vederlagsvarselhjemmel): Varselrad {
  v.nye += 1;
  return { noekkel: `varsel-${v.nye}`, hjemmel, arbeid: '', klarOver: '' };
}

/** Skjemaet med én rad for `hjemmel`, og som registrering når `registrer`. */
export function startvarsling(
  hjemmel: Vederlagsvarselhjemmel,
  registrer: boolean,
  utenfor: Korrespondansevalg | null = null
): Varslingsvalg {
  const v: Varslingsvalg = { rader: [], utenfor: null, nye: 0 };
  v.rader.push(nyVarselrad(v, hjemmel));
  if (registrer) v.utenfor = utenfor ?? tomKorrespondanse();
  return v;
}

/**
 * Bestemmelsene raden kan få: de kjernen tilbyr, uten et varsel etter § 34.1.2 eller § 34.1.3 som
 * en annen rad alt har (SK-12). Bestemmelsen raden har, står alltid.
 */
export function hjemlerForRaden(
  v: Varslingsvalg,
  rad: Varselrad | null,
  tilbudt: readonly Vederlagsvarselhjemmel[]
): Vederlagsvarselhjemmel[] {
  return tilbudt.filter(
    (h) => h === rad?.hjemmel || harArbeid(h) || !v.rader.some((r) => r !== rad && r.hjemmel === h)
  );
}

/**
 * Varselet slik kommandoen bærer det: arbeidet bare etter § 34.3.3 og § 34.4, og datoen bare
 * etter § 34.1.3 (`varselfeil` i kjernen).
 */
const varselposten = (r: Varselrad) =>
  definert({
    hjemmel: r.hjemmel,
    arbeid: harArbeid(r.hjemmel) ? r.arbeid.trim() || undefined : undefined,
    klar_over_utgiftene: r.hjemmel === '34.1.3' ? r.klarOver || undefined : undefined,
  });

/** Kommandoen TE sender: `send_varsel` fra løsningen, eller `varsel` med registreringen. */
export function varslingen(v: Varslingsvalg): Record<string, unknown> {
  const varsler = v.rader.map(varselposten);
  return v.utenfor
    ? { type: 'varsel', varsler, ...registreringen(v.utenfor) }
    : { type: 'send_varsel', varsler };
}

/** Vedleggene i registreringen, med ID-ene i kommandoen. */
export const vedleggIVarslingen = (v: Varslingsvalg) => vedleggskart(v.utenfor?.vedlegg ?? []);

/**
 * Det som mangler før brevet kan lages, med feltet (MM-U32): minst ett varsel, arbeidet etter
 * § 34.3.3 og § 34.4 i et brev fra løsningen (VS-U87 punkt 27), en dato etter § 34.1.3 som ikke er
 * senere enn brevet (U-6 i BF-48, VS-U83), og feltene i registreringen. `sendes` er datoen brevet
 * sendes, eller ble sendt for en registrering.
 */
export function manglerIVarslingen(
  v: Varslingsvalg,
  prefiks: string,
  navnet: (r: Varselrad) => string,
  sendes: string | null
): Mangel[] {
  const ut: Mangel[] = [];
  if (!v.rader.length)
    ut.push({
      felt: `${prefiks}-legg-til`,
      post: null,
      tekst: VEDERLAGSVARSEL.ingenVarsler,
      ved: VEDERLAGSVARSEL.ingenVarsler,
    });
  for (const r of v.rader) {
    const legg = (felt: string, t: string) =>
      ut.push({
        felt: `${prefiks}-${felt}-${r.noekkel}`,
        post: r.noekkel,
        tekst: `${navnet(r)}: ${t}`,
        ved: t,
      });
    if (!v.utenfor && harArbeid(r.hjemmel) && !r.arbeid.trim())
      legg('arbeid', VEDERLAGSVARSEL.manglerArbeid);
    if (r.hjemmel === '34.1.3' && r.klarOver && sendes && r.klarOver > sendes)
      legg('klar-over', KUNNSKAPSDATO.etterBrevet(r.klarOver, sendes));
  }
  if (v.utenfor)
    for (const [felt, t] of korrespondansefeilene(v.utenfor, 'utenfor'))
      ut.push({ felt: `${prefiks}-${felt}`, post: null, tekst: t });
  return ut;
}
