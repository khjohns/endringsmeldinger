/**
 * Frysingen av svaret på forholdet: standpunktene i svaret, lagene de opptar foran vederlag og
 * frist, om svaret avklarer forholdet eller blir en endringsordre, og kontrollen av byggherrens
 * vurderinger (B-13). `frosset/standpunkt.ts` slår opp her gjennom `FRYSING`, og
 * `frosset/utregning.ts` gjennom `UTREGNING` (#1783).
 */

import type { Subsidiaergrunn } from '../../regler/forhold.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import { kontrollerForholdet } from '../../regler/svarkontroll.ts';
import { HJEMMEL } from '../../format/format.ts';
import {
  avvisUkjenteFelt,
  prinsipalt,
  standpunktet,
  virkningerIForholdetOgFristen,
  type Svarinnhold,
  type Svarsfrysing,
  type Svarsutregning,
  type Svarvurdering,
} from '../../frosset/byggeklosser.ts';
import { kategori } from './format.ts';
import type { Beslutningsgrunnlag, Krav, Standpunktsvirkning } from '../../typer.ts';

type Data = Record<string, unknown>;

/**
 * Standpunktene i et svar på forholdet (§ 32.2 og § 32.3). `varselet` er det rettidigheten
 * etter § 32.2 gjelder (VS-U43 punkt 6 og 10).
 */
export function forholdsstandpunkter(
  v: Svarvurdering,
  varselet: string,
  nyId: () => string
): Data[] {
  const ut: Data[] = [];
  if (typeof v.grunnlag_varslet_i_tide === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varselet,
      hjemmel: HJEMMEL.forhold,
      i_tide: v.grunnlag_varslet_i_tide,
    });
  ut.push({ id: nyId(), art: 'forhold', resultat: v.resultat });
  return ut;
}

/**
 * Hvorfor svarene på vederlag og frist er subsidiære til svaret på påberopelsen, etter
 * standpunktene i brevet om forholdet (vedtaket 05.10, MM-U9). Utledningen og
 * brevteksten (A2) leser det samme.
 */
export function grunnerFraForholdet(
  svar: Svarinnhold,
  virkninger: Standpunktsvirkning[]
): Subsidiaergrunn[] {
  const ut: Subsidiaergrunn[] = [];
  if (prinsipalt(virkninger)?.art === 'rettidighet') ut.push('prekludert');
  if (standpunktet(svar, 'forhold')?.resultat === 'avslaatt') ut.push('avslaatt');
  return ut;
}

/**
 * GR-U7: byggherren har godkjent forholdet uten virksom preklusjon etter § 32.2,
 * eller frafalt pålegget. Leses av standpunktene og virkningen i brevet om
 * forholdet, ikke av et utfall.
 */
export function forholdetErAvklart(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  const resultat = standpunktet(svar, 'forhold')?.resultat;
  return (
    !preklusjonPaaberopt(svar, v) && (resultat === 'godkjent' || resultat === 'paalegg_frafalt')
  );
}

/**
 * MM-U13: byggherren påberoper prinsipalt preklusjon etter § 32.2 i svaret på
 * forholdet.
 * Rettidigheten i forholdet er alltid etter § 32.2 (`HJEMMEL`).
 */
function preklusjonPaaberopt(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  return svar.spor === 'forhold' && v.some((p) => p.art === 'rettidighet' && p.virkning === 1);
}

/**
 * OV-U32, OV-U33: lagene standpunktene i svaret på forholdet opptar foran vederlag og
 * frist i brevet, ett for preklusjonen etter § 32.2 og ett for avslaget. Et frafall
 * flytter ikke lagene (GR-U7). Linjen leser det herfra; brevteksten skriver ett ledd for
 * hver av de samme grunnene (`grunnerFraForholdet`).
 */
export const lagFraForholdet = (g: Svarinnhold | undefined, v: Standpunktsvirkning[]): number =>
  g ? grunnerFraForholdet(g, v).length : 0;

/**
 * Et svar på forholdet i et brev sendt i appen er en endringsordre etter § 32.3
 * første ledd a: svaret godkjenner hele kravet uten påberopt preklusjon
 * (sammenfall, GR-U10), og § 32.2 gjaldt kategorien (GR-U11, GR-U12). Leses av
 * det frosne beslutningsgrunnlaget.
 */
export function blirEndringsordre(b: Beslutningsgrunnlag): boolean {
  return b.sammenfall && b.varslingsplikt === true;
}

export const FRYSING_I_FORHOLDET = {
  virkninger: virkningerIForholdetOgFristen,
  utfall: () => ({}),
  godkjennerHeleKravet: (svar) => standpunktet(svar, 'forhold')?.resultat === 'godkjent',
  vilkaar: null,
  hvertITideGirOppInnsigelsen: false,
} satisfies Svarsfrysing;

// ---------- Utregningen av svaret (B-13) ----------

/** Forholdet har ingen utregning, bare kontrollen av vurderingene (§ 32.2 og § 32.3). */
function regnUtForhold(v: Svarvurdering, krav: Krav, regler: Regelsett): Record<string, unknown> {
  avvisUkjenteFelt(v, FORHOLDSVURDERINGER, 'forholdet');
  const { hovedkategori, underkategori } = kategori(krav);
  kontrollerForholdet(v, hovedkategori, underkategori, regler);
  return {};
}

/** Feltene kjernen leser i vurderingene i svaret på forholdet (`kontrollerForholdet`, `standpunkter`). */
const FORHOLDSVURDERINGER = new Set<string>(['resultat', 'grunnlag_varslet_i_tide']);

export const UTREGNING_I_FORHOLDET = {
  regnUt: (v, { krav }, regler) => regnUtForhold(v, krav, regler),
  utenforOmfanget: () => null,
} satisfies Svarsutregning;
