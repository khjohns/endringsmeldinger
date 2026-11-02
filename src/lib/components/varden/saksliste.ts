/**
 * Cellene i sakslisten i Varden (#1450). Hvert spor viser betegnelsen fra serveren etter
 * MM-U30, med byggherrens resultat og «subsidiært» eller enighetens virkning i linja under
 * (MM-U28), og verdiene med etiketten «Krevd» eller «Svar» (design-reviewet 01.11).
 */
import type { Enighetsvirkning, Sakslinje } from '$lib/types/api';
import { HOVEDKATEGORI_FRA_KATALOGEN, tilKatalogen } from '$kjerne/format/koder';
import { kroner } from '$kjerne/frosset/standpunkt';
import { getKontraktsforholdLabel } from '$lib/constants/categories';
import { BETEGNELSE, SAKSBETEGNELSE, SAKSLISTE } from './tekster';

const dager = (n: number) => `${n} ${n === 1 ? 'dag' : 'dager'}`;

/** Sakstypene i panelet etter KT-U9. Forsering står ikke der ennå (svaret på M4). */
export type Fane = 'koe' | 'eo';
export const FANENE: Fane[] = ['koe', 'eo'];

/**
 * Sakstypen i `sak_metadata`. KOE-saken opprettes som `standard` (`kjerne/kommandoer/opprettelse.ts`).
 * EO-saken finnes ikke ennå (#1423); navnet `endringsordre` er en antakelse til den er bygget.
 */
const SAKSTYPE: Record<string, Fane> = { standard: 'koe', endringsordre: 'eo' };

export const fanen = (linje: Sakslinje): Fane | null => SAKSTYPE[linje.sakstype] ?? null;

const RESULTAT: Record<string, string> = {
  godkjent: 'Godkjent',
  delvis_godkjent: 'Delvis godkjent',
  avslaatt: 'Avslått',
  tilbakeholdelse: 'Tilbakeholdelse',
  paalegg_frafalt: 'Pålegget er frafalt',
};

/** Appens lesing av enighetens virkning, merket som appens (MM-U28). */
const VIRKNING: Record<Enighetsvirkning, string> = {
  betinget: 'etter appens lesing betinget',
  virksom: 'etter appens lesing virksom',
  uten_virkning: 'etter appens lesing uten virkning',
};

export type Verdi = { etikett: string; tekst: string };
export type Sporcelle = {
  verdier: Verdi[];
  betegnelse: string | null;
  under: string | null;
  ikkeKrevd: boolean;
};

const resultattekst = (svar: { resultat: string; subsidiaert?: boolean } | null) =>
  svar
    ? `${RESULTAT[svar.resultat] ?? svar.resultat}${svar.subsidiaert ? ', subsidiært' : ''}`
    : null;

/** Vederlag eller frist i raden. En sak kjernen ikke forstår, har ingen celle (MM-U2). */
export function sporcelle(linje: Sakslinje, spor: 'vederlag' | 'frist'): Sporcelle | null {
  if (!linje.forstaatt) return null;
  const fmt = spor === 'vederlag' ? kroner : dager;
  const l = linje[spor];
  const krav = spor === 'vederlag' ? linje.vederlag.krav?.beloep : linje.frist.krav?.dager;
  const svar = spor === 'vederlag' ? linje.vederlag.svar?.beloep : linje.frist.svar?.dager;
  const enighet = spor === 'vederlag' ? linje.vederlag.enighet : linje.frist.enighet;
  const enighetstall =
    spor === 'vederlag' ? linje.vederlag.enighet?.beloep : linje.frist.enighet?.dager;
  const verdier: Verdi[] = [];
  if (krav != null) verdier.push({ etikett: SAKSLISTE.krevd, tekst: fmt(krav) });
  if (svar != null) verdier.push({ etikett: SAKSLISTE.svar, tekst: fmt(svar) });
  const under = enighet
    ? [enighetstall == null ? null : fmt(enighetstall), VIRKNING[enighet.virkning]]
        .filter(Boolean)
        .join(', ')
    : resultattekst(l.svar);
  return {
    verdier,
    betegnelse: l.betegnelse ? BETEGNELSE[l.betegnelse] : null,
    under: under ? under.charAt(0).toUpperCase() + under.slice(1) : null,
    ikkeKrevd: krav == null && !l.betegnelse,
  };
}

/**
 * Forholdet under tittelen: navnet, og betegnelsen med resultatet på samme måte som
 * vederlag og frist. Det får ikke noe eget merke (avklaringen 02.11, punkt 3).
 */
export function forholdet(linje: Sakslinje) {
  if (!linje.forstaatt) return null;
  const f = linje.forhold;
  return {
    navn: linje.hovedkategori
      ? getKontraktsforholdLabel(
          String(tilKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, linje.hovedkategori))
        ) || null
      : null,
    betegnelse: f.betegnelse ? BETEGNELSE[f.betegnelse] : null,
    under: resultattekst(f.svar),
  };
}

/** Saksbetegnelsen i MM-U22, også «Ikke forstått» (MM-U2), som et merke under tittelen. */
export const saksmerke = (linje: Sakslinje): string | null =>
  linje.saksbetegnelse ? SAKSBETEGNELSE[linje.saksbetegnelse] : null;
