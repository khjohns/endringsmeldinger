/**
 * Fristtabellen fra kontrakten og satsen for dagmulkten (GFK-U16, GFK-U18, #721), i
 * `database/migrasjoner/20261113100000_kontraktsfrister.sql`. Driften registrerer
 * dem (GFK-U22) med `kontraktsfrister` i `server/registrering.ts`. Begge parter og
 * leserollen leser dem (GFK-U23) med `lesKontraktsfrister` inne i `transaksjon`.
 * Satsen i kroner regnes her, ikke i kjernen.
 */
import { beloep, tilTall } from '../kjerne/regler/beloep.ts';
import { lesekontekst } from './autorisasjon.ts';
import { transaksjon, type Foresp } from './datalag.ts';
import type { Avhengigheter, Prosjektforespoersel, Rute, Svar } from './rutetyper.ts';

export type Satsgrunnlag = 'kontraktssum' | 'delens_verdi' | 'fast_beloep';

/** Opplysningene satsen regnes av, slik driften har registrert dem. Beløp i kroner. */
export type Satsopplysninger =
  | { grunnlag: 'kontraktssum'; promille: number; minstebeloep: number }
  | { grunnlag: 'delens_verdi'; promille: number; minstebeloep: number; delensVerdi: number }
  | { grunnlag: 'fast_beloep'; beloepPerDag: number };

export interface Kontraktsfrist {
  /**
   * Fristens ID i prosjektet. Den endres ikke, og et krav viser til fristen med den. Den
   * er en teknisk nøkkel og står ikke i brevet.
   */
  fristId: number;
  /**
   * Kontraktens nummer på fristen, eller `null` når kontrakten ikke nummererer den.
   * Brevet viser fristen med nummeret og navnet (`betegnelsen` i `kjerne/spor/frist/format.ts`).
   */
  nummer: string | null;
  navn: string;
  /** `ÅÅÅÅ-MM-DD`. */
  dato: string;
  dagmulktbelagt: boolean;
  /** `null` når fristen ikke er dagmulktbelagt, eller satsen ikke er registrert. */
  satsopplysninger: Satsopplysninger | null;
  /**
   * Dagmulkten i kroner per dag, eller `null` når den ikke kan regnes: fristen er ikke
   * dagmulktbelagt (GFK-U20), opplysningene mangler, eller satsen regnes av
   * kontraktssummen og den mangler (GFK-U3).
   */
  sats: number | null;
}

export interface Fristtabell {
  /** Kroner, eller `null` når den ikke er registrert. */
  kontraktssum: number | null;
  frister: Kontraktsfrist[];
}

/**
 * Promillen av grunnlaget i kroner, avrundet til nærmeste øre, halve øre opp. Grunnlaget
 * leses i øre som reglene leser beløp (`beloep`); promillen har høyst fire desimaler.
 */
function promilleAv(grunnlag: number, promille: number): number {
  const teller = beloep(grunnlag)! * BigInt(Math.round(promille * 10_000));
  const nevner = 10_000_000n;
  return tilTall((teller * 2n + nevner) / (nevner * 2n));
}

/** Standardverdiene etter § 40.3 a (GFK-U16), som driften registrerer uttrykkelig. */
export const STANDARDSATS = { grunnlag: 'kontraktssum', promille: 1, minstebeloep: 3000 } as const;

/** Satsen per dag etter GFK-U16 og GFK-U18, eller `null` når den ikke kan regnes. */
export function regnSats(s: Satsopplysninger, kontraktssum: number | null): number | null {
  if (s.grunnlag === 'fast_beloep') return s.beloepPerDag;
  const grunnlag = s.grunnlag === 'delens_verdi' ? s.delensVerdi : kontraktssum;
  if (grunnlag === null) return null;
  return Math.max(promilleAv(grunnlag, s.promille), s.minstebeloep);
}

export interface Fristrad {
  frist_id: number;
  nummer: string | null;
  navn: string;
  dato: string;
  dagmulktbelagt: boolean;
  satsgrunnlag: Satsgrunnlag | null;
  promille: unknown;
  minstebeloep: unknown;
  delens_verdi: unknown;
  beloep_per_dag: unknown;
}

const tall = (v: unknown): number => Number(v);

export function satsopplysninger(rad: Fristrad): Satsopplysninger | null {
  switch (rad.satsgrunnlag) {
    case 'kontraktssum':
      return {
        grunnlag: 'kontraktssum',
        promille: tall(rad.promille),
        minstebeloep: tall(rad.minstebeloep),
      };
    case 'delens_verdi':
      return {
        grunnlag: 'delens_verdi',
        promille: tall(rad.promille),
        minstebeloep: tall(rad.minstebeloep),
        delensVerdi: tall(rad.delens_verdi),
      };
    case 'fast_beloep':
      return { grunnlag: 'fast_beloep', beloepPerDag: tall(rad.beloep_per_dag) };
    case null:
      return null;
  }
}

/** Radsettene fra prosedyrene: kontraktssummen og fristene. */
export type Radsett = [{ kontraktssum: unknown }[], Fristrad[]];

/** Fristtabellen av radsettene fra `koe_api.kontraktsfrister` eller `koe_drift.kontraktsfrister`. */
export function fristtabell([sum, rader]: Radsett): Fristtabell {
  const kontraktssum = sum.length ? tall(sum[0]!.kontraktssum) : null;
  return {
    kontraktssum,
    frister: rader.map((rad) => {
      const s = satsopplysninger(rad);
      return {
        fristId: rad.frist_id,
        nummer: rad.nummer,
        navn: rad.navn,
        dato: rad.dato,
        dagmulktbelagt: rad.dagmulktbelagt,
        satsopplysninger: s,
        sats: s ? regnSats(s, kontraktssum) : null,
      };
    }),
  };
}

/**
 * Fristtabellen i prosjektet i konteksten. Tom for den som ikke kan lese saker i
 * prosjektet (`koe_sikkerhet.medlem`).
 */
export async function lesKontraktsfrister(foresp: Foresp): Promise<Fristtabell> {
  const r = await foresp().execute('koe_api.kontraktsfrister');
  return fristtabell(r.recordsets as unknown as Radsett);
}

/**
 * En frist i fristtabellen slik klienten får den, til kravskjemaet (KA-U79, BF-20 G-3).
 * Feltnavnene er en kontrakt med klienten.
 */
export interface Fristlinje {
  frist_id: number;
  nummer: string | null;
  navn: string;
  /** Fristens dato i kontrakten, `ÅÅÅÅ-MM-DD`, til U-4, U-5 og datoen ved hver frist i BF-20. */
  dato: string;
  dagmulktbelagt: boolean;
}

async function fristtabellsvar(
  { bruker, prosjekt, side }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const tabell = await transaksjon(
    avh.datalag,
    lesekontekst(bruker, prosjekt.prosjektId, side),
    lesKontraktsfrister
  );
  const frister: Fristlinje[] = tabell.frister.map((f) => ({
    frist_id: f.fristId,
    nummer: f.nummer,
    navn: f.navn,
    dato: f.dato,
    dagmulktbelagt: f.dagmulktbelagt,
  }));
  return [200, { success: true, frister }];
}

/** Fristtabellen for prosjektet, for begge parter og leserollen (GFK-U25, DL-U15). */
export const KONTRAKTSFRISTRUTER: readonly Rute[] = [
  {
    metode: 'GET',
    sti: /^\/api\/projects\/([^/]+)\/kontraktsfrister$/,
    eksempel: (p) => `/api/projects/${p}/kontraktsfrister`,
    tilgang: {
      prosjektrolle: 'viewer',
      utenSak: 'Fristtabellen fra kontrakten; den gjelder prosjektet, ikke én sak.',
      kontraktsrolle: 'lesing',
    },
    behandle: fristtabellsvar,
  },
];
