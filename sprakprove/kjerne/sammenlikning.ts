/**
 * Klientens utregning mot serverens (B-13, alternativ (2) i streng form). Port
 * av `regler/sammenlikning.py`: serveren regner ut svaret av vurderingene og
 * kravet, avviser et svar der klientens verdier er andre, og returnerer sine
 * egne verdier til lagring. Beløp sammenliknes til hele øre.
 */

import { belop, tilTall, type Ore } from '../../kjerne/regler/belop.ts';
import { REGELVERSJON } from './regelversjon.ts';
import { kontrollerGrunnlagssvar } from '../../kjerne/regler/grunnlag.ts';
import { beregnFrist, type Fristkrav } from '../../kjerne/regler/frist.ts';
import { beregnVederlag, type Vederlagskrav } from '../../kjerne/regler/vederlag.ts';
import { grunnlagetErPrekludert, grunnlagsvurdering, type Sak } from './sak.ts';
import type { Grunnlagsresultat, Spor, Vederlagsmetode } from './typer.ts';

export class Avvik extends Error {
  readonly felt: Record<string, [unknown, unknown]>;

  constructor(felt: Record<string, [unknown, unknown]>) {
    const deler = Object.entries(felt).map(
      ([navn, [klient, server]]) => `${navn}=${vis(server)} (sendt: ${vis(klient)})`
    );
    super(`Serveren regner ut ${deler.join(', ')}. Last inn saken på nytt.`);
    this.felt = felt;
  }
}

export class FeilRegelversjon extends Error {
  constructor(sendt: unknown) {
    super(
      `Svaret er regnet ut med regelversjon ${vis(sendt)}, serveren bruker ${REGELVERSJON}. Reglene er oppdatert. Last inn saken på nytt.`
    );
  }
}

function vis(v: unknown): string {
  if (v === null || v === undefined) return 'ingen';
  if (v instanceof Set) return `[${[...v].map(vis).sort().join(', ')}]`;
  if (typeof v === 'bigint') return tilTall(v).toFixed(2);
  return String(v);
}

export function vederlagskrav(sak: Sak): Vederlagskrav {
  const krav = sak.vederlag.krav?.data ?? {};
  const g = grunnlagsvurdering(sak);
  const saerskilt = (krav.saerskilt_krav ?? {}) as Record<string, { belop?: number } | undefined>;
  const post = (navn: string) =>
    saerskilt[navn] && typeof saerskilt[navn] === 'object' ? (saerskilt[navn]!.belop ?? 0) : null;
  const krevd = krav.metode === 'REGNINGSARBEID' ? krav.kostnads_overslag : krav.belop_direkte;
  return {
    hovedkrav_belop: (krevd as number | undefined) || 0,
    metode: (krav.metode as Vederlagsmetode | undefined) ?? null,
    rigg_belop: post('rigg_drift'),
    produktivitet_belop: post('produktivitet'),
    krever_justert_ep: Boolean(krav.krever_justert_ep),
    kostnads_overslag: (krav.kostnads_overslag as number | undefined) ?? null,
    hovedkategori: g.hovedkategori,
    underkategori: g.underkategori,
    grunnlag_varslet_i_tide: g.varsletITide,
    grunnlag_resultat: g.resultat,
  };
}

export function fristkrav(sak: Sak): Fristkrav {
  const krav = sak.frist.krav?.data ?? {};
  const forrige = sak.frist.svar?.data ?? {};
  const varselOk = typeof forrige.frist_varsel_ok === 'boolean' ? forrige.frist_varsel_ok : null;
  return {
    krevd_dager: (krav.antall_dager as number | undefined) ?? 0,
    varsel_type: (krav.varsel_type as Fristkrav['varsel_type']) ?? null,
    er_svar_paa_foresporsel: false,
    har_innsigelse_mot_varsel: varselOk === false,
    // Bare et uttrykkelig tidligere standpunkt gjør § 33.4-spørsmålet overflødig.
    har_tidligere_varsel_i_tide:
      varselOk === true || (sak.frist.svar !== null && varselOk !== false),
    er_grunnlag_subsidiaert: grunnlagsvurdering(sak).resultat === 'avslatt',
    er_hele_fristen_subsidiaer_pga_grunnlag: grunnlagetErPrekludert(sak),
  };
}

type Normalisert = string | number | boolean | Ore | Set<string> | null;

function normaliser(v: unknown, erBelop: boolean): Normalisert {
  if (Array.isArray(v)) return v.length ? new Set(v.map(String)) : null;
  if (v === undefined) return null;
  if (erBelop && typeof v === 'number') return Number.isFinite(v) ? belop(v) : v;
  return v as Normalisert;
}

function like(a: Normalisert, b: Normalisert): boolean {
  if (a instanceof Set && b instanceof Set)
    return a.size === b.size && [...a].every((x) => b.has(x));
  return a === b;
}

function sammenlikn(
  data: Record<string, unknown>,
  server: Record<string, unknown>,
  belopsfelt: Set<string>,
  ikkeFremsatt: Set<string> = new Set()
): Record<string, unknown> {
  const avvik: Record<string, [unknown, unknown]> = {};
  for (const [felt, verdi] of Object.entries(server)) {
    if (ikkeFremsatt.has(felt)) continue;
    const klient = normaliser(data[felt], belopsfelt.has(felt));
    const serveren = normaliser(verdi, belopsfelt.has(felt));
    if (!like(klient, serveren)) avvik[felt] = [klient, serveren];
  }
  if (Object.keys(avvik).length) throw new Avvik(avvik);
  return Object.fromEntries(
    Object.entries(server).map(([f, v]) => [f, typeof v === 'bigint' ? tilTall(v) : v])
  );
}

const VEDERLAG_BELOP = new Set([
  'total_godkjent_belop',
  'total_krevd_belop',
  'hovedkrav_godkjent_belop',
  'rigg_godkjent_belop',
  'produktivitet_godkjent_belop',
  'subsidiaer_godkjent_belop',
]);

function kontrollerVederlagssvar(data: Record<string, unknown>, sak: Sak) {
  const krav = vederlagskrav(sak);
  const r = beregnVederlag(krav, data);
  const server = {
    beregnings_resultat: r.beregnings_resultat,
    subsidiaer_resultat: r.subsidiaer_resultat,
    total_godkjent_belop: r.total_godkjent_belop,
    total_krevd_belop: r.total_krevd_belop,
    hovedkrav_godkjent_belop: r.hovedkrav_godkjent_belop,
    rigg_godkjent_belop: r.rigg_godkjent_belop,
    produktivitet_godkjent_belop: r.produktivitet_godkjent_belop,
    subsidiaer_godkjent_belop: r.subsidiaer_godkjent_belop,
    subsidiaer_triggers: r.subsidiaer_triggers.length ? r.subsidiaer_triggers : null,
  };
  const ikkeFremsatt = new Set<string>();
  if (krav.rigg_belop === null) ikkeFremsatt.add('rigg_godkjent_belop');
  if (krav.produktivitet_belop === null) ikkeFremsatt.add('produktivitet_godkjent_belop');
  return sammenlikn(data, server, VEDERLAG_BELOP, ikkeFremsatt);
}

function kontrollerFristsvar(data: Record<string, unknown>, sak: Sak) {
  // Dagene BH har vurdert, står i `subsidiaer_godkjent_dager` når det prinsipale svaret er avslått.
  const dager = data.subsidiaer_godkjent_dager ?? data.godkjent_dager;
  const r = beregnFrist(fristkrav(sak), { ...data, godkjent_dager: dager });
  return sammenlikn(
    data,
    {
      beregnings_resultat: r.beregnings_resultat,
      subsidiaer_resultat: r.subsidiaer_resultat,
      godkjent_dager: r.godkjent_dager,
      subsidiaer_godkjent_dager: r.subsidiaer_godkjent_dager,
      subsidiaer_triggers: r.subsidiaer_triggers.length ? r.subsidiaer_triggers : null,
    },
    new Set()
  );
}

function kontrollerGrunnlag(data: Record<string, unknown>, sak: Sak) {
  const g = grunnlagsvurdering(sak);
  const varslet =
    typeof data.grunnlag_varslet_i_tide === 'boolean' ? data.grunnlag_varslet_i_tide : null;
  kontrollerGrunnlagssvar(
    g.hovedkategori,
    g.underkategori,
    (data.resultat as Grunnlagsresultat) ?? null,
    varslet
  );
  return {};
}

const KONTROLLER = {
  grunnlag: kontrollerGrunnlag,
  vederlag: kontrollerVederlagssvar,
  frist: kontrollerFristsvar,
};

/** Kontroller regelversjonen og svaret, og returner serverens verdier. Kaster `FeilRegelversjon`, `UgyldigVurdering` eller `Avvik`. */
export function kontrollerSvar(
  spor: Spor,
  data: Record<string, unknown>,
  sak: Sak
): Record<string, unknown> {
  if (data.regelversjon !== REGELVERSJON) throw new FeilRegelversjon(data.regelversjon);
  return KONTROLLER[spor](data, sak);
}
