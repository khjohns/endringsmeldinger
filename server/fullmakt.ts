/**
 * Verdien fullmakten for byggherrens svar regnes av (GFK-06 med presiseringen 24.09 og
 * GFK-U3). Kravene er kjernens kravversjoner (KA-U2, DT-02), og svarets beløp og dager
 * er kjernens utregning (B-13). Fristdagene verdsettes per frist med satsen og datoen i
 * fristtabellen (`server/kontraktsfrister.ts`), og kjeden avledes av hierarkiet (GFK-U8) i
 * `server/godkjenning.ts`.
 */
import { regnUtSvar } from '../kjerne/frosset/utregning.ts';
import { innholdIFristen, type FristIKravet } from '../kjerne/spor/frist/format.ts';
import { forlengelseneISaken, type Forlengelse } from '../kjerne/spor/frist/utledning.ts';
import { forlengetFrist, hverdagerIForlengelsen } from '../kjerne/regler/hverdager.ts';
import { utledJournal } from '../kjerne/kommandoer/skriving.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Foresp } from './datalag.ts';
import { lesKontraktsfrister, type Fristtabell } from './kontraktsfrister.ts';
import { lesSakene } from './saksliste.ts';
import { krevdSamlet } from '../kjerne/spor/vederlag/format.ts';
import type { Svarutkast } from '../kjerne/kommandoer/kommando.ts';
import { beloep, tilTall } from '../kjerne/regler/beloep.ts';
import type { Regelsett } from '../kjerne/regler/regelsett.ts';
import { KRAVSPOR, type Fristrad, type Krav } from '../kjerne/typer.ts';
import type { Sporutledning, Utledning } from '../kjerne/utledning/utled.ts';
import { foresporselForFristsvar } from '../kjerne/spor/frist/utledning.ts';

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
  const fristverdi = (frist: FristIKravet | undefined, dager: number): number => {
    if (dager === 0) return 0;
    const g = frist?.frist_id === undefined ? undefined : frister.get(frist.frist_id);
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
    const iKravet = new Map(innholdIFristen(krav).frister.map((f) => [f.id, f]));
    for (const rad of (r.frister ?? []) as Fristrad[]) {
      const frist = iKravet.get(rad.gjelder);
      hoved += fristverdi(frist, rad.godkjent_dager);
      subsidiaert += fristverdi(frist, rad.subsidiaert_godkjent_dager ?? rad.godkjent_dager);
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
          : innholdIFristen(k).frister.reduce((sum, f) => sum + fristverdi(f, f.dager), 0)
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
 * GFK-U26) og satsen. Uten `forlengelser` kan datoen ikke regnes, fordi en sak kjernen ikke
 * forstår, kan ha forlenget fristen (MM-U2).
 */
export function fristgrunnlaget(
  tabell: Fristtabell,
  forlengelser: readonly Forlengelse[] | null
): Map<number, Fristgrunnlag> {
  return new Map(
    tabell.frister.map((f) => [
      f.fristId,
      {
        dato:
          forlengelser === null
            ? null
            : forlengetFrist(
                f.dato,
                forlengelser
                  .filter((x) => x.fristId === f.fristId)
                  .reduce((sum, x) => sum + x.dager, 0)
              ),
        sats: f.dagmulktbelagt ? f.sats : null,
      },
    ])
  );
}

/**
 * Forlengelsene i de andre sakene i prosjektet i konteksten (GFK-U26), eller `null` når en
 * av dem ikke er forstått av kjernen (MM-U2).
 */
export async function lesForlengelsene(
  foresp: Foresp,
  sakId: string,
  kjerne: Kjerne
): Promise<Forlengelse[] | null> {
  const forlengelser: Forlengelse[] = [];
  for (const sak of await lesSakene(foresp)) {
    if (sak.sakId === sakId) continue;
    const u = utledJournal(sak.journal, kjerne);
    if (!u.forstaatt) return null;
    forlengelser.push(...forlengelseneISaken(u));
  }
  return forlengelser;
}

/**
 * Fristgrunnlaget for brevverdien i saken `sakId`, lest i saksbehandlerens transaksjon når
 * pakken lages. Godkjenneren regner ikke verdien på nytt: lesefilteret gir godkjenneren en
 * tom fristtabell og ingen andre saker (GFK-U9).
 */
export async function lesFristgrunnlaget(
  foresp: Foresp,
  sakId: string,
  kjerne: Kjerne
): Promise<Map<number, Fristgrunnlag>> {
  const tabell = await lesKontraktsfrister(foresp);
  return fristgrunnlaget(tabell, await lesForlengelsene(foresp, sakId, kjerne));
}

function kravverdi(sp: Sporutledning, verdi: (krav: Krav) => number): number | null {
  if (sp.trukket || sp.ingenKrav) return 0;
  if (!sp.gjeldendeKrav) return null;
  return verdi(sp.gjeldendeKrav);
}
