/**
 * Byggherrens svar på kravet om fristforlengelse i Varden (G-4 i BF-20), i kjernens format.
 * Svaret har ett standpunkt til varselet, forespørselen, hindringen og spesifiseringen for hele
 * kravet, og dagene for hver frist (KA-U74, KA-U80).
 */

import type { Svarvurdering } from '#kjerne/frosset/byggeklosser.ts';
import type { Regelsett } from '#kjerne/regler/regelsett.ts';
import type { Svarutkast } from '#kjerne/kommandoer/kommando.ts';
import { innholdIFristen, type FristIKravet } from '#kjerne/spor/frist/format.ts';
import { begrunnelsenKanAvvisesSomSvar, foresporselenISvaret } from '#lib/kjernesak/fristsvar.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import { definert, kravetSvaretGjelder, standpunktet, svarbrevet } from './kommandoer';
import type { Krav, Svar } from '#kjerne/typer.ts';
import { HJEMMEL } from '#kjerne/format/format.ts';

export type Dagevalg = 'alle' | 'deler' | 'avslaatt';

/** Det BH har valgt for én frist. `null` er ikke besvart. */
export interface Fristvalg {
  dager: Dagevalg | null;
  /** Dagene BH godkjenner når BH godkjenner deler av dagene, som BH skrev dem. */
  deldager: string;
  /** Dagene BH måtte forstå at TE hadde krav på, når kravet ble spesifisert for sent (D-5). */
  maatteForstaa: string;
}

/**
 * Det BH har valgt i skjemaet. `null` er ikke besvart; ingenting er forhåndsvalgt (U-14). Svaret
 * på hver frist står under fristens `id` i kravet.
 */
export interface Fristsvarvalg {
  /** Varselet etter punkt 33.4. */
  varselITide: boolean | null;
  /** Svaret på forespørselen etter punkt 33.6.2, når svaret har et standpunkt til det. */
  foresporselITide: boolean | null;
  /**
   * VS-U95: begrunnelsen etter punkt 33.6.2 annet ledd b er ikke et svar etter annet ledd. Står i
   * stedet for `foresporselITide` (`begrunnelsenKanAvvisesSomSvar`).
   */
  begrunnelseIkkeSvar: boolean;
  /** Hindringen etter punkt 33.1 eller 33.3, med begge vilkårene (KA-U81). */
  hindret: boolean | null;
  /** Spesifiseringen etter punkt 33.6.1. */
  spesifisertITide: boolean | null;
  frister: Record<string, Fristvalg>;
  /** Begrunnelsen per punkt i brevet, med punktet som nøkkel (LV-U71). */
  begrunnelser: Record<string, string>;
  /** Byggherrens tekst for hele svaret, under «Forbehold» sist i brevet. */
  forbehold: string;
  /**
   * Svaret et nytt svar ble fylt ut fra og erstatter (`valgFraFristsvaret`). Kjernen avviser
   * revisjonen når det ikke lenger er det gjeldende svaret (`FEIL_SVARREFERANSE`).
   */
  erstatter?: string;
}

export const tomFrist = (): Fristvalg => ({ dager: null, deldager: '', maatteForstaa: '' });

export const tomtFristsvar = (): Fristsvarvalg => ({
  varselITide: null,
  foresporselITide: null,
  begrunnelseIkkeSvar: false,
  hindret: null,
  spesifisertITide: null,
  frister: {},
  begrunnelser: {},
  forbehold: '',
});

/** Valgene for fristen med `id`, eller en ubesvart frist. */
export const fristvalget = (v: Fristsvarvalg, id: string): Fristvalg => v.frister[id] ?? tomFrist();

/** Et helt antall dager skrevet i et felt, eller `undefined` når feltet er tomt eller ikke kan leses. */
export function heleDager(tekst: string): number | undefined {
  const t = tekst.trim();
  return /^\d+$/.test(t) ? Number(t) : undefined;
}

/**
 * Dagene BH godkjenner for fristen, eller `undefined` når de ikke er besvart. Under «Delvis» blir
 * en tekst som ikke er et tall, `NaN`, så kjernen avviser den som ugyldig (#2234).
 */
export function godkjenteDager(f: Fristvalg, krevd: number): number | undefined {
  if (f.dager === 'alle') return krevd;
  if (f.dager === 'avslaatt') return 0;
  if (f.dager === 'deler') {
    const tekst = f.deldager.trim();
    if (!tekst) return undefined;
    return /^-?\d+(?:[.,]\d+)?$/.test(tekst) ? Number(tekst.replace(',', '.')) : NaN;
  }
  return undefined;
}

/** Tallet i feltet «Godkjente dager», som følger valget (U-14, prototypen `fristkrav-te.html#svar`). */
export function godkjenteDagerIFeltet(f: Fristvalg, krevd: number): string {
  // Det BH skrev, står så lenge det er tallet for valget, så teksten ikke byttes under markøren.
  const n = heleDager(f.deldager);
  if (f.dager === 'alle') return n === krevd ? f.deldager : String(krevd);
  if (f.dager === 'avslaatt') return n === 0 ? f.deldager : '0';
  return f.deldager;
}

/**
 * Tallet BH skriver i «Godkjente dager» styrer valget: som krevd, avslått eller delvis. Et tomt felt
 * tar bort valget, unntatt «Delvis», som BH har valgt før tallet er skrevet.
 */
export function skrivGodkjenteDager(f: Fristvalg, tekst: string, krevd: number): void {
  f.deldager = tekst;
  const n = heleDager(tekst);
  if (tekst.trim() === '') f.dager = f.dager === 'deler' ? 'deler' : null;
  else f.dager = n === krevd ? 'alle' : n === 0 ? 'avslaatt' : 'deler';
}

/** Valget for dagene. «Delvis» tar ikke med seg tallet fra et annet valg. */
export function velgDagene(f: Fristvalg, d: Dagevalg | null, krevd: number): void {
  const n = heleDager(f.deldager);
  if (d === 'deler' && f.dager !== 'deler' && (n === krevd || n === 0)) f.deldager = '';
  f.dager = d;
}

/** Én vurdering per frist i kravet, i kravets rekkefølge (`fristvurderinger` i kjernen). */
function vurderingene(
  v: Fristsvarvalg,
  frister: readonly FristIKravet[],
  medForesporsel: boolean,
  ikkeSvar: boolean
): Svarvurdering {
  return definert({
    frist_varsel_ok: v.varselITide ?? undefined,
    foresporsel_svar_ok:
      medForesporsel && !ikkeSvar ? (v.foresporselITide ?? undefined) : undefined,
    begrunnelse_ikke_svar: ikkeSvar || undefined,
    vilkar_oppfylt: v.hindret ?? undefined,
    spesifisert_krav_ok: v.spesifisertITide ?? undefined,
    frister: frister.map((f) => {
      const valgt = fristvalget(v, f.id);
      return definert({
        dager: godkjenteDager(valgt, f.dager),
        dager_maatte_forstaa:
          v.spesifisertITide === false ? heleDager(valgt.maatteForstaa) : undefined,
      });
    }),
  });
}

/**
 * BHs svar på gjeldende fristkrav, eller `null` når saken ikke har et krav (`svarbrevet`). Svaret
 * tar stilling til forespørselen etter punkt 33.6.2 når kjernen leser en (VS-U17, VS-U29), eller
 * gjør gjeldende at begrunnelsen ikke er et svar (VS-U95).
 */
export function fristsvaret(
  v: Fristsvarvalg,
  u: Utledning,
  regler: Regelsett,
  punktene: readonly string[] = [],
  sendt: string | null = null
): { type: 'brev'; svar: Svarutkast[] } | null {
  const { krav, paaberopelse } = kravetSvaretGjelder(u, 'frist', sendt);
  if (!krav) return null;
  const foresporsel = foresporselenISvaret(u);
  const ikkeSvar = v.begrunnelseIkkeSvar && begrunnelsenKanAvvisesSomSvar(u);
  return svarbrevet(
    'frist',
    krav,
    vurderingene(v, innholdIFristen(krav).frister, foresporsel !== null, ikkeSvar),
    { paaberopelse, foresporsel },
    v,
    regler,
    punktene
  );
}

/**
 * Valgene i skjemaet for et nytt svar på kravet, fylt ut med standpunktene i svaret det erstatter,
 * så byggherren endrer det byggherren vil (HF-U29, G-8 i BF-46). Dagene for hver frist er dagene
 * byggherren vurderte, også når de står subsidiært. Begrunnelsene og forbeholdet skrives på nytt.
 */
export function valgFraFristsvaret(svar: Svar, krav: Krav): Fristsvarvalg {
  const iTide = (hjemmel: string) =>
    standpunktet(svar, 'rettidighet', (s) => s.hjemmel === hjemmel)?.iTide ?? null;
  const spesifisering = standpunktet(svar, 'spesifisering');
  const frister: Record<string, Fristvalg> = {};
  for (const f of innholdIFristen(krav).frister) {
    const vurdert = standpunktet(svar, 'dager', (s) => s.gjelder === f.id)?.vurdert;
    const maatte = spesifisering?.maatteForstaa?.find((m) => m.frist === f.id)?.dager;
    const dager = dagevalget(vurdert, f.dager);
    frister[f.id] = {
      dager,
      deldager: dager === 'deler' ? String(vurdert) : '',
      maatteForstaa: maatte === undefined ? '' : String(maatte),
    };
  }
  return {
    ...tomtFristsvar(),
    erstatter: svar.id,
    varselITide: iTide(HJEMMEL.frist),
    foresporselITide: iTide('33.6.2'),
    begrunnelseIkkeSvar: standpunktet(svar, 'ikke_svar') !== undefined,
    hindret: standpunktet(svar, 'hindring')?.oppfylt ?? null,
    spesifisertITide: spesifisering?.iTide ?? null,
    frister,
  };
}

/** Valget for dagene byggherren vurderte, av `krevd` dager. */
const dagevalget = (vurdert: number | undefined, krevd: number): Dagevalg | null =>
  vurdert === undefined ? null : vurdert === krevd ? 'alle' : vurdert === 0 ? 'avslaatt' : 'deler';
