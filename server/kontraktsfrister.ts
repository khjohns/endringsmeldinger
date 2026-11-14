/**
 * Fristtabellen fra kontrakten og satsen for dagmulkten (GFK-U16, GFK-U18, #721), i
 * `database/migrasjoner/20261113100000_kontraktsfrister.sql`. Driften registrerer
 * dem (GFK-U22) med `kontraktsfrister` i `server/registrering.ts`. Begge parter og
 * leserollen leser dem (GFK-U23) med `lesKontraktsfrister` inne i `transaksjon`.
 * Satsen i kroner regnes her, ikke i kjernen.
 */
import { beloep, tilTall } from '../kjerne/regler/beloep.ts';
import { fristenEtterForlengelsene, type Forlengelse } from '../kjerne/spor/frist/utledning.ts';
import { lesekontekst } from './autorisasjon.ts';
import { tall, transaksjon, type Foresp } from './datalag.ts';
import { lesForlengelsene, type Forlengelsene, type SakensForlengelse } from './forlengelser.ts';
import type { LestSak } from './saksliste.ts';
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

export function satsopplysninger(rad: Fristrad): Satsopplysninger | null {
  switch (rad.satsgrunnlag) {
    case 'kontraktssum':
      return {
        grunnlag: 'kontraktssum',
        promille: tall(rad.promille)!,
        minstebeloep: tall(rad.minstebeloep)!,
      };
    case 'delens_verdi':
      return {
        grunnlag: 'delens_verdi',
        promille: tall(rad.promille)!,
        minstebeloep: tall(rad.minstebeloep)!,
        delensVerdi: tall(rad.delens_verdi)!,
      };
    case 'fast_beloep':
      return { grunnlag: 'fast_beloep', beloepPerDag: tall(rad.beloep_per_dag)! };
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

/** Grunnen til at dagene i en annen sak ikke er tatt med i datoen (KA-U77). */
type IkkeAvtalt = Exclude<Forlengelse['grunnlag'], 'avtalt'>;

/** En annen sak i samme kontrakt, slik klienten får den. */
export interface Sakslinje {
  sak_id: string;
  /** Koden saken har, eller `null` før saken har et brev fra løsningen (LV-U46). */
  sakskode: LestSak['sakskode'];
}

/** Dagene for en frist i en annen sak, slik klienten får dem. */
export interface Forlengelseslinje extends Sakslinje {
  /** Kalenderdagene (NS 8407 punkt 1.2). */
  dager: number;
}

/**
 * En frist i fristtabellen slik klienten får den, til kravskjemaet (KA-U79, BF-20 G-3 og U-2).
 * Feltnavnene er en kontrakt med klienten.
 *
 * Forlengelsene er lest i alle sakene klienten kan lese i prosjektet, også saken skjemaet
 * fylles ut i. Den saken regner datoen uten sine egne dager, med `fristenEtterForlengelsene`
 * i kjernen og `forlengelser` uten saken, og nevner ikke seg selv (KA-U77, HF-U5).
 */
export interface Fristlinje {
  frist_id: number;
  nummer: string | null;
  navn: string;
  /** Fristens dato i kontrakten, `ÅÅÅÅ-MM-DD`, til U-4, U-5 og datoen ved hver frist i BF-20. */
  dato: string;
  dagmulktbelagt: boolean;
  /**
   * Datoen etter forlengelsene i `forlengelser` (KA-U77), `ÅÅÅÅ-MM-DD`, eller `null` når en sak
   * i `saker_ikke_forstaatt` kan ha forlenget fristen (MM-U2).
   */
  dato_etter_forlengelsene: string | null;
  /** Dagene partene er enige om i andre saker (KA-U77, GR-U38, GR-U39). */
  forlengelser: Forlengelseslinje[];
  /**
   * Dagene i andre saker som ikke er tatt med, med grunnen (KA-U77): `godkjent` er godkjent av
   * byggherren uten at partene er enige, og de subsidiære er godkjent subsidiært
   * (`Forlengelse` i `kjerne/spor/frist/utledning.ts`).
   */
  ikke_tatt_med: (Forlengelseslinje & { grunnlag: IkkeAvtalt })[];
}

/** Fristtabellen med forlengelsene i sakene, slik inngangen gir den. */
export function fristlinjer(
  tabell: Fristtabell,
  { tattMed, ikkeTattMed, ikkeForstaatt, sakskoder }: Forlengelsene
): { frister: Fristlinje[]; saker_ikke_forstaatt: Sakslinje[] } {
  const sak = (sakId: string): Sakslinje => ({
    sak_id: sakId,
    sakskode: sakskoder.get(sakId) ?? null,
  });
  const linje = (x: SakensForlengelse): Forlengelseslinje => ({ ...sak(x.sakId), dager: x.dager });
  const avtalt = tattMed.filter((f) => f.grunnlag === 'avtalt');
  const ikkeAvtalt = [...tattMed, ...ikkeTattMed].filter(
    (f): f is SakensForlengelse & { grunnlag: IkkeAvtalt } => f.grunnlag !== 'avtalt'
  );
  return {
    frister: tabell.frister.map((f) => {
      const forFristen = <T extends SakensForlengelse>(l: T[]) =>
        l.filter((x) => x.fristId === f.fristId);
      return {
        frist_id: f.fristId,
        nummer: f.nummer,
        navn: f.navn,
        dato: f.dato,
        dagmulktbelagt: f.dagmulktbelagt,
        dato_etter_forlengelsene: ikkeForstaatt.length
          ? null
          : fristenEtterForlengelsene(f.dato, f.fristId, avtalt),
        forlengelser: forFristen(avtalt).map(linje),
        ikke_tatt_med: forFristen(ikkeAvtalt).map((x) => ({ ...linje(x), grunnlag: x.grunnlag })),
      };
    }),
    saker_ikke_forstaatt: ikkeForstaatt.map(sak),
  };
}

async function fristtabellsvar(
  { bruker, prosjekt, side }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const linjer = await transaksjon(
    avh.datalag,
    lesekontekst(bruker, prosjekt.prosjektId, side),
    async (foresp) =>
      fristlinjer(await lesKontraktsfrister(foresp), await lesForlengelsene(foresp, avh.kjerne))
  );
  return [200, { success: true, ...linjer }];
}

/**
 * Fristtabellen for prosjektet med forlengelsene i sakene, for begge parter og leserollen
 * (GFK-U25, DL-U15, KA-U77).
 */
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
