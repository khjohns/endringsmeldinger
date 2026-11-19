/**
 * Sendeflyten i skjemaene (#2118, MM-U32, «En knapp er aldri sperret» i `system.md`): forsøket,
 * sendehindringen, fokuset og grenen for korrespondanse som legges til. Skjemaet gir bare
 * kommandoen og det som skjer etterpå.
 */

import { brevaarsak, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
import { kontrollbrev } from './Brevkontroll.svelte';
import type { Kontrollbrev } from './nysak';
import { leggTilISaken } from './korrespondansen';
import { feltfeil, fokuser, type Mangel } from './mangler';
import type { vedleggskart } from './nysak';

type Vedlegg = ReturnType<typeof vedleggskart>;
type Kommando = Record<string, unknown>;
type Kjernebrevet = ReturnType<Kjernesakkontekst['brev']>;

export interface Sendesteg {
  /** Hvor fokus går når noe mangler, eller `null` når skjemaet kan sendes. */
  mangler: (() => HTMLElement | null | undefined) | null;
  /** Korrespondansen som legges til i stedet for å sendes (OV-U80), med det som skjer etterpå. */
  lagtTil?: { kommando: Kommando; vedlegg: Vedlegg; ferdig: () => void } | null;
  /** Kommandoen for brevet. Den sendes ikke når `lagtTil` er satt. */
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

/** Brevet til brevkontrollen, eller årsaken kjernen gir når det ikke kan lages. */
export function brevTilKontrollen(
  kjernesak: Kjernesakkontekst,
  kommando: Kommando,
  vedlegg?: Parameters<Kjernesakkontekst['brev']>[1],
  aarsak: (b: Kjernebrevet) => string | null = brevaarsak
): { brevet: Kontrollbrev | null; aarsak: string | null } {
  const b = kjernesak.brev(kommando, vedlegg, true);
  const brevet = kontrollbrev(b);
  return { brevet, aarsak: brevet ? null : aarsak(b) };
}

/**
 * Kalles mens komponenten initialiseres. `hindringId` er ID-en til meldingen om hindringen, som
 * knappen viser til med `aria-describedby`.
 */
export function sendeflyt(kjernesak: () => Kjernesakkontekst, hindringId: string) {
  const t = $state({ forsoekt: false, hindring: null as string | null });

  /** Nullstiller hindringen. Mangler noe, vises det med fokus, og `false` gis tilbake. */
  function kontroller(mangler: Sendesteg['mangler']): boolean {
    t.hindring = null;
    if (!mangler) return true;
    t.forsoekt = true;
    // Svaret venter ikke på fokuset, så resten av sendingen ikke kommer et mikrosteg senere.
    void fokuser(mangler);
    return false;
  }

  async function hindre(tekst: string) {
    t.hindring = tekst;
    await fokuser(() => document.getElementById(hindringId));
  }

  /** Legger korrespondansen til i saken. Ellers står hindringen, og `false` gis tilbake. */
  async function leggTil(kommando: Kommando, vedlegg: Vedlegg | undefined, kanIkkeLages: string) {
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
    if (s.registrert) {
      if (await leggTil(s.kommando, s.vedlegg, s.kanIkkeLages)) s.registrert();
      return;
    }
    const r = brevTilKontrollen(kjernesak(), s.kommando, s.vedlegg, s.aarsak);
    if (!r.brevet) return hindre(r.aarsak ?? s.kanIkkeLages);
    s.tilBrevkontrollen(r.brevet);
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
    leggTil,
    send,
  };
}
