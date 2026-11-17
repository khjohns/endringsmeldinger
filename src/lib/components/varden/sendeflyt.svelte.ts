/**
 * Sendeflyten i skjemaene (#2118): forsøket, sendehindringen, fokuset og grenen for korrespondanse
 * som legges til. Knappen er aldri sperret (MM-U32): det som mangler, vises først når parten har
 * prøvd, og fokus går til oppsummeringen eller feltet. Det som hindrer at brevet kan lages, står ved
 * knappen og får fokus. Skjemaet gir bare kommandoen og det som skjer etterpå.
 */

import { tick } from 'svelte';
import { brevaarsak, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
import { kontrollbrev, type Kontrollbrev } from './Brevkontroll.svelte';
import { leggTilISaken } from './korrespondansen';
import { feltfeil, type Mangel } from './mangler';
import type { vedleggskart } from './nysak';

type Vedlegg = ReturnType<typeof vedleggskart>;
type Kommando = Record<string, unknown>;
type Fokus = () => HTMLElement | null | undefined;
type Kjernebrevet = ReturnType<Kjernesakkontekst['brev']>;

export interface Sendesteg {
  /** Hvor fokus går når noe mangler, eller `null` når skjemaet kan sendes. */
  mangler: Fokus | null;
  /** Korrespondansen som legges til i stedet for å sendes (OV-U80), med det som skjer etterpå. */
  lagtTil?: { kommando: Kommando; vedlegg: Vedlegg; ferdig: () => void } | null;
  kommando: Kommando;
  vedlegg?: Vedlegg;
  /** Kommandoen sendes uten brevkontroll, som et varsel som registreres (VS-U16). */
  registrert?: (() => void) | null;
  /** Hindringen når kjernen ikke sier hvorfor. */
  kanIkkeLages: string;
  /** Årsaken kjernen gir når brevet ikke kan lages. Uten den: `brevaarsak`. */
  aarsak?: (b: Kjernebrevet) => string | null;
  tilBrevkontrollen: (brevet: Kontrollbrev) => void;
}

/** Fokus til elementet når det er tegnet, som oppsummeringen av det som mangler. */
export async function fokuser(fokus: Fokus) {
  await tick();
  fokus()?.focus();
}

/**
 * Kalles mens komponenten initialiseres. `hindringId` er ID-en til meldingen om hindringen, som
 * knappen viser til med `aria-describedby`.
 */
export function sendeflyt(kjernesak: () => Kjernesakkontekst, hindringId: string) {
  const t = $state({ forsoekt: false, hindring: null as string | null });

  /** Nullstiller hindringen. Mangler noe, vises det med fokus, og `false` gis tilbake. */
  function kontroller(mangler: Fokus | null): boolean {
    t.hindring = null;
    if (!mangler) return true;
    t.forsoekt = true;
    void fokuser(mangler);
    return false;
  }

  async function hindre(tekst: string) {
    t.hindring = tekst;
    await fokuser(() => document.getElementById(hindringId));
  }

  /** Legger korrespondansen til i saken. Ellers står hindringen, og `false` gis tilbake. */
  async function leggTil(kommando: Kommando, vedlegg: Vedlegg, kanIkkeLages: string) {
    const h = await leggTilISaken(kjernesak(), kommando, vedlegg, kanIkkeLages);
    if (h !== null) await hindre(h);
    return h === null;
  }

  async function send(s: Sendesteg) {
    if (!kontroller(s.mangler)) return;
    if (s.lagtTil) {
      if (await leggTil(s.lagtTil.kommando, s.lagtTil.vedlegg, s.kanIkkeLages)) s.lagtTil.ferdig();
      return;
    }
    const k = kjernesak();
    if (s.registrert) {
      if (await k.send(s.kommando, undefined, s.vedlegg)) s.registrert();
      else await hindre(k.feil ?? s.kanIkkeLages);
      return;
    }
    const b = k.brev(s.kommando, s.vedlegg, true);
    const brevet = kontrollbrev(b);
    if (!brevet) return hindre((s.aarsak ?? brevaarsak)(b) ?? s.kanIkkeLages);
    s.tilBrevkontrollen(brevet);
  }

  return {
    get forsoekt() {
      return t.forsoekt;
    },
    get hindring() {
      return t.hindring;
    },
    hindringId,
    /** Feilen ved feltet etter et forsøk. */
    feil: (m: Mangel | undefined) => (t.forsoekt ? feltfeil(m) : null),
    kontroller,
    hindre,
    leggTil,
    send,
  };
}
