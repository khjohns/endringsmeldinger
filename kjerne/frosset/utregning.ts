/**
 * Serverens utregning av svaret og kontrollen av byggherrens vurderinger (B-13). Klienten
 * regner med de samme funksjonene, og serveren sammenlikner feltene i `SAMMENLIKNES`.
 */

import { beloep } from '../regler/beloep.ts';
import { beregnFrist, resultatAvDager, type Fristkrav } from '../regler/frist.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { kontrollerForholdet, kontrollerSpesifiseringen } from '../regler/svarkontroll.ts';
import { innholdIFristen, kategori } from '../format/kravinnhold.ts';
import type { Foresporselsrelasjon } from './standpunkt.ts';
import { avvisUkjenteFelt, type Svarsutregning, type Svarvurdering } from './byggeklosser.ts';
import { SAMMENLIKNES_I_VEDERLAGET, UTREGNING_I_VEDERLAGET } from '../spor/vederlag/frysing.ts';
import { utenGren, type Krav, type Spor } from '../typer.ts';

/**
 * En vurdering i svaret som kjernen ennå ikke har et standpunkt for. Den kan ikke
 * godtas og forenkles til et annet standpunkt, så kommandoen avvises. Formatet har
 * ingen art for den, så en lagret rad med den er ikke forstått (#304, review av
 * PR #306).
 */
export function utenforOmfanget(spor: Spor, v: Record<string, unknown>): string | null {
  return utregningI(spor).utenforOmfanget(v);
}

// ---------- Utregningen av svaret (B-13) ----------

/**
 * Serverens utregning av svaret, med navnene i formatet (`UTREGNING` i
 * `format.ts`). Forholdet har ingen utregning, bare kontrollen av
 * vurderingene. Kaster `UgyldigVurdering`, og `UgyldigBeloep` for et beløp i
 * vurderingene som ikke er et tall. Et krevd beløp som ikke kan leses, kaster `Error`.
 */
export function regnUtSvar(
  spor: Spor,
  v: Svarvurdering,
  {
    krav,
    paaberopelse,
    foresporsel = null,
  }: { krav: Krav; paaberopelse: Krav | null; foresporsel?: Foresporselsrelasjon | null },
  regler: Regelsett
): Record<string, unknown> {
  return utregningI(spor).regnUt(v, { krav, paaberopelse, foresporsel }, regler);
}

/** Utregningen i sporet. Et spor uten innslag kaster, som en gren som mangler (`utenGren`). */
const utregningI = (spor: Spor): Svarsutregning =>
  Object.hasOwn(UTREGNING, spor) ? UTREGNING[spor] : utenGren(spor as never);

/** Utregningen i hvert spor. Forholdet og fristen står her til de flyttes til sporene (#1783, #1745). */
const UTREGNING: Record<Spor, Svarsutregning> = {
  forhold: {
    regnUt: (v, { krav }, regler) => regnUtForhold(v, krav, regler),
    utenforOmfanget: () => null,
  },
  vederlag: UTREGNING_I_VEDERLAGET,
  frist: {
    regnUt: (v, { krav, foresporsel }) => regnUtFrist(v, krav, foresporsel),
    utenforOmfanget: () => null,
  },
};

/** Forholdet har ingen utregning, bare kontrollen av vurderingene (§ 32.2 og § 32.3). */
function regnUtForhold(v: Svarvurdering, krav: Krav, regler: Regelsett): Record<string, unknown> {
  avvisUkjenteFelt(v, FORHOLDSVURDERINGER, 'forholdet');
  const { hovedkategori, underkategori } = kategori(krav);
  kontrollerForholdet(v, hovedkategori, underkategori, regler);
  return {};
}

/** Feltene kjernen leser i vurderingene i svaret på forholdet (`kontrollerForholdet`, `standpunkter`). */
const FORHOLDSVURDERINGER = new Set<string>(['resultat', 'grunnlag_varslet_i_tide']);

/** Feltene kjernen leser i vurderingene i svaret på fristen (`regnUtFrist`, `standpunkter`). */
const FRISTVURDERINGER = new Set<string>([
  'frist_varsel_ok',
  'spesifisert_krav_ok',
  'foresporsel_svar_ok',
  'vilkar_oppfylt',
  'dager',
  'dager_maatte_forstaa',
]);

/** Utregningen av fristen (§ 33). */
function regnUtFrist(
  v: Svarvurdering,
  krav: Krav,
  foresporsel: Foresporselsrelasjon | null
): Record<string, unknown> {
  avvisUkjenteFelt(v, FRISTVURDERINGER, 'fristen');
  const fkrav: Fristkrav = {
    krevd_dager: innholdIFristen(krav).dager,
    varsel_type: 'spesifisert',
    er_svar_paa_foresporsel: foresporsel?.art === 'svar',
    har_begrunnelse_etter_b: foresporsel?.art === 'begrunnelse',
    // § 33.4 vurderes også når kravet svarer på forespørselen, som uten den.
    har_innsigelse_mot_varsel: true,
    har_tidligere_varsel_i_tide: false,
    er_grunnlag_subsidiaert: false,
    er_hele_fristen_subsidiaer_pga_grunnlag: false,
  };
  const r = beregnFrist(fkrav, {
    frist_varsel_ok: v.frist_varsel_ok as boolean | undefined,
    spesifisert_krav_ok: v.spesifisert_krav_ok as boolean | undefined,
    foresporsel_svar_ok: v.foresporsel_svar_ok as boolean | undefined,
    vilkar_oppfylt: v.vilkar_oppfylt as boolean | undefined,
    godkjent_dager: v.dager,
  });
  const ut: Record<string, unknown> = {
    resultat: r.beregnings_resultat,
    godkjent_dager: r.godkjent_dager,
  };
  if (r.subsidiaer_resultat !== null) {
    ut.subsidiaert_resultat = r.subsidiaer_resultat;
    ut.subsidiaert_godkjent_dager = r.subsidiaer_godkjent_dager ?? 0;
  }
  const maatteForstaa = kontrollerSpesifiseringen(v);
  // VS-U4, rekkefølgen i #479: uten preklusjon og med hindring er dagene byggherren måtte
  // forstå at TE hadde krav på det prinsipale, og de vurderte dagene står subsidiært.
  if (maatteForstaa !== null && r.subsidiaer_resultat === null) {
    ut.resultat = resultatAvDager(true, fkrav.krevd_dager, maatteForstaa);
    ut.godkjent_dager = maatteForstaa;
    ut.subsidiaert_resultat = r.beregnings_resultat;
    ut.subsidiaert_godkjent_dager = r.godkjent_dager;
  }
  return ut;
}

/** Feltene klienten skal ha regnet likt med serveren. Beløp sammenliknes til hele øre. */
export const SAMMENLIKNES: Record<Spor, string[]> = {
  forhold: [],
  vederlag: SAMMENLIKNES_I_VEDERLAGET,
  frist: ['resultat', 'godkjent_dager'],
};

export function likeResultatfelt(felt: string, klient: unknown, server: unknown): boolean {
  if (felt.endsWith('_beloep') && typeof klient === 'number' && typeof server === 'number')
    return beloep(klient) === beloep(server);
  return klient === server;
}
