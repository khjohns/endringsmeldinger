/**
 * Verdien fullmakten for byggherrens svar regnes av (GFK-06 med presiseringen 24.09 og
 * GFK-U3). Kravene er kjernens kravversjoner (KA-U2, DT-02), og svarets beløp og dager
 * er kjernens utregning (B-13). Fristdagene verdsettes per frist med satsen og datoen i
 * fristtabellen (`server/kontraktsfrister.ts`), og kjeden avledes av hierarkiet (GFK-U8) i
 * `server/godkjenning.ts`.
 */
import { regnUtSvar } from '../kjerne/frosset/utregning.ts';
import { innholdIFristen } from '../kjerne/spor/frist/format.ts';
import {
  foresporselForFristsvar,
  fristenEtterForlengelsene,
} from '../kjerne/spor/frist/utledning.ts';
import { hverdagerIForlengelsen } from '../kjerne/regler/hverdager.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Foresp } from './datalag.ts';
import { lesKontraktsfrister, type Fristtabell } from './kontraktsfrister.ts';
import { lesForlengelsene, type SakensForlengelse } from './forlengelser.ts';
import { krevdSamlet } from '../kjerne/spor/vederlag/format.ts';
import type { Svarutkast } from '../kjerne/kommandoer/kommando.ts';
import { beloep, tilTall } from '../kjerne/regler/beloep.ts';
import type { Regelsett } from '../kjerne/regler/regelsett.ts';
import { KRAVSPOR, type Fristrad, type Krav } from '../kjerne/typer.ts';
import type { Sporutledning, Utledning } from '../kjerne/utledning/utled.ts';

/**
 * Verdien brevet gir byggherren ansvar for, i kroner. `beloep` er `null` når noe i
 * brevet ikke kan verdsettes; da kreves hele kjeden, og kjeden må dekke `gulv`, det
 * som lar seg verdsette (vedtaket 23.09 om ubegrenset fullmakt, GFK-U4).
 */
export interface Brevverdi {
  beloep: number | null;
  gulv: number;
}

/** Hele øre, rundet som reglene runder beløp (`beloep`), ikke som flyttallet. */
const oere = (kr: number) => tilTall(beloep(kr)!);

/**
 * Det en frist i fristtabellen verdsettes med: datoen hverdagene telles fra, og satsen.
 * `dato` er `null` når forlengelsene i de andre sakene ikke kan leses.
 */
export interface Fristgrunnlag {
  dato: string | null;
  /** Kroner per dag, eller `null` når fristen ikke er dagmulktbelagt eller satsen mangler. */
  sats: number | null;
  /** Dagene for fristen i de andre sakene som forlenger den. */
  forlengelser: SakensForlengelse[];
  /** Dagene for fristen som ikke er tatt med, for utregningen (svaret på spørsmål 4 i
   * `docs/vedlegg/fristen-del2-pr3-2026-11-14/sporsmal.md`). */
  ikkeTattMed: SakensForlengelse[];
}

/**
 * Fristgrunnlaget for verdien, og sakene utregningen nevner: forlengelsene per frist, og
 * sakene kjernen ikke forstår eller ikke har skrevet (MM-U2), som gjør datoen ukjent.
 */
export interface Fristgrunnlaget {
  frister: Map<number, Fristgrunnlag>;
  ikkeForstaatt: string[];
}

/**
 * Verdien av svarene i ett brev. Et spor som besvares i brevet, har verdien i svaret.
 * Godkjenner brevet forholdet, har et kravspor som ikke besvares, verdien i TEs
 * gjeldende krav: et krav som ikke er sendt, kan ikke verdsettes, og et trukket krav
 * er 0. Avslått og frafalt ansvar er 0 (presiseringen 24.09). Hovedstandpunktet og det
 * subsidiære summeres hver for seg, og det største gjelder; alternativene legges ikke sammen.
 *
 * Dagene for hver frist verdsettes for seg og summeres (GFK-U21): satsen for fristen ganger
 * hverdagene i forlengelsen fra datoen i `frister` (GFK-U17, GFK-U19, GFK-U24). Dager for en
 * frist som ikke er registrert, ikke er dagmulktbelagt, mangler sats eller dato, kan ikke
 * verdsettes (GFK-U3, GFK-U20, KA-U79).
 *
 * Svarene må være kontrollert av kjernen først. Kaster det kjernens utregning
 * kaster (`regnUtSvar`): `UgyldigVurdering` og `UgyldigBeloep`, og `Error` for et krevd
 * beløp som ikke kan leses.
 */
export function brevverdi(
  svar: readonly Svarutkast[],
  u: Utledning,
  frister: ReadonlyMap<number, Fristgrunnlag>,
  regler: Regelsett
): Brevverdi {
  let hoved = 0;
  let subsidiaert = 0;
  let ukjent = false;
  const fristverdi = (fristId: number | undefined, dager: number): number => {
    if (dager === 0) return 0;
    const g = fristId === undefined ? undefined : frister.get(fristId);
    if (!g || g.sats === null || g.dato === null) {
      ukjent = true;
      return 0;
    }
    return g.sats * hverdagerIForlengelsen(g.dato, dager);
  };

  for (const s of svar) {
    if (s.spor === 'forhold') continue;
    const krav = u.spor[s.spor].gjeldendeKrav;
    if (!krav) throw new Error(`Sporet ${s.spor} har ikke noe krav å svare på`);
    const r = regnUtSvar(
      s.spor,
      s.vurderinger,
      {
        krav,
        paaberopelse: u.spor.forhold.gjeldendeKrav,
        foresporsel: foresporselForFristsvar(u),
      },
      regler
    );
    if (s.spor === 'vederlag') {
      hoved += r.godkjent_beloep as number;
      subsidiaert += (r.subsidiaert_godkjent_beloep ?? r.godkjent_beloep) as number;
      continue;
    }
    const fristId = new Map(innholdIFristen(krav).frister.map((f) => [f.id, f.frist_id]));
    for (const rad of (r.frister ?? []) as Fristrad[]) {
      const id = fristId.get(rad.gjelder);
      hoved += fristverdi(id, rad.godkjent_dager);
      subsidiaert += fristverdi(id, rad.subsidiaert_godkjent_dager ?? rad.godkjent_dager);
    }
  }

  const forhold = svar.find((s) => s.spor === 'forhold');
  if (forhold?.vurderinger.resultat === 'godkjent') {
    const besvart = new Set(svar.map((s) => s.spor));
    for (const spor of KRAVSPOR) {
      if (besvart.has(spor)) continue;
      // OV-U23: vederlagskravet er justeringen ellers og posten etter § 34.1.3 annet ledd.
      const v = kravverdi(u.spor[spor], (k) =>
        spor === 'vederlag'
          ? tilTall(krevdSamlet(k))
          : innholdIFristen(k).frister.reduce((sum, f) => sum + fristverdi(f.frist_id, f.dager), 0)
      );
      if (v === null) ukjent = true;
      else {
        hoved += v;
        subsidiaert += v;
      }
    }
  }

  const verdi = oere(Math.max(hoved, subsidiaert));
  return { beloep: ukjent ? null : verdi, gulv: verdi };
}

/**
 * Fristene i fristtabellen med datoen etter forlengelsene i de andre sakene (GFK-U19,
 * GFK-U26) og satsen. Forstår ikke kjernen en av sakene, kan datoen ikke regnes, fordi saken
 * kan ha forlenget fristen (MM-U2).
 */
export function fristgrunnlaget(
  tabell: Fristtabell,
  {
    tattMed,
    ikkeTattMed,
  }: { tattMed: readonly SakensForlengelse[]; ikkeTattMed: readonly SakensForlengelse[] },
  ikkeForstaatt: readonly string[]
): Fristgrunnlaget {
  const forFristen = (fristId: number, l: readonly SakensForlengelse[]) =>
    l.filter((x) => x.fristId === fristId);
  return {
    frister: new Map(
      tabell.frister.map((f) => [
        f.fristId,
        {
          dato: ikkeForstaatt.length ? null : fristenEtterForlengelsene(f.dato, f.fristId, tattMed),
          sats: f.dagmulktbelagt ? f.sats : null,
          forlengelser: forFristen(f.fristId, tattMed),
          ikkeTattMed: forFristen(f.fristId, ikkeTattMed),
        },
      ])
    ),
    ikkeForstaatt: [...ikkeForstaatt],
  };
}

/**
 * Fristgrunnlaget for brevverdien i saken `sakId`: fristtabellen og forlengelsene i de andre
 * sakene i prosjektet (GFK-U26). Det skal leses i saksbehandlerens transaksjon når pakken lages,
 * fordi lesefilteret gir godkjenneren en tom fristtabell og ingen andre saker (GFK-U9, #1780).
 * Ingen inngang lager pakken ennå (G-6 i BF-45).
 */
export async function lesFristgrunnlaget(
  foresp: Foresp,
  sakId: string,
  kjerne: Kjerne
): Promise<Fristgrunnlaget> {
  const tabell = await lesKontraktsfrister(foresp);
  const { tattMed, ikkeTattMed, ikkeForstaatt } = await lesForlengelsene(foresp, kjerne, sakId);
  return fristgrunnlaget(tabell, { tattMed, ikkeTattMed }, ikkeForstaatt);
}

function kravverdi(sp: Sporutledning, verdi: (krav: Krav) => number): number | null {
  if (sp.trukket || sp.ingenKrav) return 0;
  if (!sp.gjeldendeKrav) return null;
  return verdi(sp.gjeldendeKrav);
}
