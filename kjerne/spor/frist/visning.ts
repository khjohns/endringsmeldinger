/**
 * Visningen i fristsporet: etiketten for varselet etter § 33.4 og forespørselen etter § 33.6.2.
 * `utledning/visning.ts` slår opp i sporet gjennom `VISNING` (#1783).
 */

import type { Fristresultat } from '../../regler/typer.ts';
import {
  enighetensVirkning,
  standpunktetErSubsidiaert,
  type Utledning,
} from '../../utledning/utled.ts';
import type { Enighetsvirkning, Sporsvisning } from '../../utledning/visning.ts';
import { betegnelsen, dageneILagene, innholdIFristen, type FristIKravet } from './format.ts';
import { fristenEtterForlengelsene, fristeneISporet, type Forlengelse } from './utledning.ts';
import type { Sakskode } from '../../typer.ts';
import { erUbesvart } from './frysing.ts';

export const VISNING_I_FRISTEN = {
  paaleggFrafalt: () => false,
  passivitetsetikett: () => null,
  // § 33.6.2: til forespørselen er besvart, eller kravet sendt før den er lagt til (OV-U109).
  kravetErEtterspurt: (u) => u.spor.frist.foresporsler.some(erUbesvart),
  // Oppdragsgiver 22.10 (#1126): bare før kravet, som er varselet når sporet ikke har noe.
  varseletikett: (u) =>
    !u.spor.frist.varsler['33.4'] && u.spor.frist.krav.length === 0
      ? 'varsel_ikke_registrert'
      : null,
  // HF-U29 punkt 8, HF-U31 og HF-U32: dagene for hver frist, og punkt 33.7 annet ledd.
  senkning: {
    godkjentILagene: (svar) => dageneILagene(svar.utregning),
    bestemmelse: () => '33.7',
  },
} satisfies Sporsvisning;

/** Én frist i kravet, svaret eller enigheten, med betegnelsen i kontrakten (U-1, KA-U74). */
export interface Fristdager {
  betegnelse: string;
  dager: number;
}

/** Kravet, svaret og enigheten om fristen i sakslisten (#1022). Dagene står per frist og legges ikke sammen (KA-U74). */
export interface FristenISakslisten {
  krav: { frister: Fristdager[] } | null;
  /**
   * `resultat` gjelder hele svaret, `antall_godkjent` er fristene som har fått alle dagene
   * (`resultatForSvaret`), og `subsidiaert` sier at et av standpunktene om dagene er subsidiært,
   * som i vederlaget. Ingen regel leser dem.
   */
  svar: {
    resultat: Fristresultat;
    antall_godkjent: number;
    subsidiaert: boolean;
    frister: (Fristdager & { resultat: Fristresultat; subsidiaert: boolean })[];
  } | null;
  enighet: { frister: Fristdager[]; virkning: Enighetsvirkning } | null;
}

/** Betegnelsen i kontrakten for fristen med `id`, i den siste formen den hadde i sporet. */
function betegnelseFor(sist: ReadonlyMap<string, FristIKravet>, id: string): string {
  const f = sist.get(id);
  return f ? betegnelsen(f) : id;
}

/**
 * Resultatet for hele svaret på fristen, som etikett i sakslisten (HF-U7, KA-U79): godkjent når hver
 * frist har fått alle dagene, avslått når ingen frist har fått dager, og ellers delvis godkjent.
 */
function resultatForSvaret(resultater: readonly Fristresultat[]): Fristresultat {
  if (resultater.every((r) => r === 'godkjent')) return 'godkjent';
  if (resultater.every((r) => r === 'avslaatt')) return 'avslaatt';
  return 'delvis_godkjent';
}

/**
 * Byggherrens gjeldende svar på fristen: dagene og resultatet for hver frist, og om
 * standpunktet er subsidiært (`standpunktetErSubsidiaert`, MM-U28 (opphevet av MM-U37)), med resultatet for hele
 * svaret og hvor mange frister som har fått alle dagene.
 */
function fristsvaretISakslisten(
  u: Utledning,
  sist: ReadonlyMap<string, FristIKravet>
): FristenISakslisten['svar'] {
  const frister = (u.spor.frist.gjeldendeSvar?.standpunkter ?? []).flatMap((st) =>
    st.art === 'dager'
      ? [
          {
            betegnelse: betegnelseFor(sist, st.gjelder),
            resultat: st.resultat,
            dager: st.vurdert,
            subsidiaert: standpunktetErSubsidiaert(u, 'frist', st.id),
          },
        ]
      : []
  );
  if (!frister.length) return null;
  const resultater = frister.map((f) => f.resultat);
  return {
    resultat: resultatForSvaret(resultater),
    antall_godkjent: resultater.filter((r) => r === 'godkjent').length,
    subsidiaert: frister.some((f) => f.subsidiaert),
    frister,
  };
}

export function fristenISakslisten(u: Utledning): FristenISakslisten {
  const s = u.spor.frist;
  const { sist } = fristeneISporet(s.krav);
  const krav = s.gjeldendeKrav;
  const virkning = enighetensVirkning(u, 'frist');
  return {
    krav: krav
      ? {
          frister: innholdIFristen(krav).frister.map((f) => ({
            betegnelse: betegnelsen(f),
            dager: f.dager,
          })),
        }
      : null,
    svar: fristsvaretISakslisten(u, sist),
    enighet:
      s.enighet && virkning
        ? {
            frister: (s.enighet.grunnlag.utfall.frister ?? []).map((f) => ({
              betegnelse: betegnelseFor(sist, f.gjelder),
              dager: f.dager,
            })),
            virkning,
          }
        : null,
  };
}

/** En annen sak i samme kontrakt i fristtabellen (`GET /api/projects/<p>/kontraktsfrister`). */
export interface SakIFristtabellen {
  sak_id: string;
  /** Koden saken har, eller `null` før saken har et brev fra løsningen (LV-U46). */
  sakskode: Sakskode | null;
}

/** Dagene for en frist i en annen sak. */
export interface Forlengelseslinje extends SakIFristtabellen {
  /** Kalenderdagene (NS 8407 punkt 1.2). */
  dager: number;
}

/**
 * En frist i fristtabellen slik klienten får den, til kravskjemaet (KA-U79, BF-20 G-3 og U-2).
 * Feltnavnene er en kontrakt med klienten. Serveren lager linjen med `fristtabellsvaret`.
 *
 * Forlengelsene er lest i alle sakene klienten kan lese i prosjektet, også saken skjemaet
 * fylles ut i. Skjemaet skal regne datoen uten dagene i den saken og ikke nevne den (KA-U77,
 * HF-U5); det gjør ikke inngangen, som ikke får sak-ID fra klienten.
 */
export interface Fristtabellinje {
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
   * byggherren uten at partene er enige, og de subsidiære er godkjent subsidiært (`Forlengelse`).
   */
  ikke_tatt_med: (Forlengelseslinje & { grunnlag: Exclude<Forlengelse['grunnlag'], 'avtalt'> })[];
}

/** Fristtabellen med forlengelsene i sakene og sakene kjernen ikke forstår (KA-U77, MM-U2). */
export interface Fristtabellsvar {
  frister: Fristtabellinje[];
  saker_ikke_forstaatt: SakIFristtabellen[];
}

/** Dagene i saken `sakId` for en frist i fristtabellen (`forlengelseneISaken`). */
export interface SakensForlengelse extends Forlengelse {
  sakId: string;
}

/** Forlengelsene i sakene i prosjektet, slik serveren leser dem med kjernen. */
export interface Forlengelsene {
  tattMed: SakensForlengelse[];
  ikkeTattMed: SakensForlengelse[];
  /** Sakene kjernen ikke forstår eller ikke har skrevet, som kan ha forlenget en frist (MM-U2). */
  ikkeForstaatt: string[];
  /** Koden til hver sak som er lest, for sakene som nevnes. */
  sakskoder: ReadonlyMap<string, Sakskode | null>;
}

/** En frist i fristtabellen fra kontrakten. */
export interface FristIKontrakten {
  /**
   * Fristens ID i prosjektet. Den endres ikke, og et krav viser til fristen med den. Den
   * er en teknisk nøkkel og står ikke i brevet.
   */
  fristId: number;
  /**
   * Kontraktens nummer på fristen, eller `null` når kontrakten ikke nummererer den.
   * Brevet viser fristen med nummeret og navnet (`betegnelsen` i `format.ts`).
   */
  nummer: string | null;
  navn: string;
  /** `ÅÅÅÅ-MM-DD`. */
  dato: string;
  dagmulktbelagt: boolean;
}

/**
 * Fristen `dato` etter dagene i `forlengelser` for fristen `fristId`, uten dagene i saken
 * `utenom` (GFK-U19, KA-U77, HF-U5), eller `null` når en annen sak kjernen ikke forstår, kan ha
 * forlenget den (MM-U2).
 */
export const datoenEtterForlengelsene = (
  dato: string,
  fristId: number,
  forlengelser: readonly Pick<SakensForlengelse, 'fristId' | 'dager' | 'sakId'>[],
  ikkeForstaatt: readonly string[],
  utenom?: string
): string | null =>
  ikkeForstaatt.some((s) => s !== utenom)
    ? null
    : fristenEtterForlengelsene(
        dato,
        fristId,
        forlengelser.filter((f) => f.sakId !== utenom)
      );

/**
 * Fristtabellen med forlengelsene i sakene (KA-U77): datoen regnes med dagene partene er enige
 * om, og de andre dagene nevnes med grunnen (GR-U38, GR-U39). En sak kjernen ikke forstår,
 * gjør datoen ukjent for hver frist og nevnes (MM-U2).
 */
export function fristtabellsvaret(
  frister: readonly FristIKontrakten[],
  { tattMed, ikkeTattMed, ikkeForstaatt, sakskoder }: Forlengelsene
): Fristtabellsvar {
  const sak = (sakId: string): SakIFristtabellen => ({
    sak_id: sakId,
    sakskode: sakskoder.get(sakId) ?? null,
  });
  const linje = (x: SakensForlengelse): Forlengelseslinje => ({ ...sak(x.sakId), dager: x.dager });
  const avtalt = tattMed.filter((f) => f.grunnlag === 'avtalt');
  const ikkeAvtalt = [...tattMed, ...ikkeTattMed].filter(
    (f): f is SakensForlengelse & { grunnlag: Exclude<Forlengelse['grunnlag'], 'avtalt'> } =>
      f.grunnlag !== 'avtalt'
  );
  return {
    frister: frister.map((f) => {
      const forFristen = <T extends SakensForlengelse>(l: T[]) =>
        l.filter((x) => x.fristId === f.fristId);
      return {
        frist_id: f.fristId,
        nummer: f.nummer,
        navn: f.navn,
        dato: f.dato,
        dagmulktbelagt: f.dagmulktbelagt,
        dato_etter_forlengelsene: datoenEtterForlengelsene(
          f.dato,
          f.fristId,
          avtalt,
          ikkeForstaatt
        ),
        forlengelser: forFristen(avtalt).map(linje),
        ikke_tatt_med: forFristen(ikkeAvtalt).map((x) => ({ ...linje(x), grunnlag: x.grunnlag })),
      };
    }),
    saker_ikke_forstaatt: ikkeForstaatt.map(sak),
  };
}
