/**
 * Fullmakten byggherrens svar krever (GFK-06 med presiseringen 24.09, GFK-U2, GFK-U3
 * og GFK-U4). Kravene er kjernens kravversjoner (KA-U2, DT-02), og svarets beløp og dager
 * er kjernens utregning (B-13). Fullmaktene og dagmulktssatsen leses i
 * `server/godkjenning.ts`.
 */
import { regnUtSvar } from '../kjerne/frosset/standpunkt.ts';
import type { Svarutkast } from '../kjerne/kommandoer/kommando.ts';
import type { Regelsett } from '../kjerne/regler/regelsett.ts';
import { KRAVSPOR, type Kravspor } from '../kjerne/typer.ts';
import type { Sporutledning, Utledning } from '../kjerne/utledning/utled.ts';

export interface Fullmakt {
  brukerId: string;
  tittel: string;
  /** Kroner. `null` er ubegrenset fullmakt. */
  grense: number | null;
  /** Plassen i godkjenningskjeden, fra 1. */
  plass: number;
}

/**
 * Verdien brevet gir byggherren ansvar for, i kroner. `beloep` er `null` når noe i
 * brevet ikke kan verdsettes; da kreves hele kjeden, og kjeden må dekke `gulv`, det
 * som lar seg verdsette (vedtaket 23.09 om ubegrenset fullmakt, GFK-U4).
 */
export interface Brevverdi {
  beloep: number | null;
  gulv: number;
}

/** Prosjektet har ingen registrerte fullmakter (GFK-U2). */
export class IngenFullmakter extends Error {}

/** Ingen i kjeden har fullmakt til det brevet gir ansvar for. */
export class UtilstrekkeligFullmakt extends Error {}

const oere = (kroner: number) => Math.round(kroner * 100) / 100;

/**
 * Verdien av svarene i ett brev. Et spor som besvares i brevet, har verdien i svaret.
 * Godkjenner brevet grunnlaget, har et kravspor som ikke besvares, verdien i TEs
 * gjeldende krav: et krav som ikke er sendt, kan ikke verdsettes, og et trukket krav
 * er 0. Avslått og frafalt ansvar er 0 (presiseringen 24.09). Fristdager uten
 * dagmulktssats kan ikke verdsettes (GFK-U3). Hovedstandpunktet og det subsidiære
 * summeres hver for seg, og det største gjelder; alternativene legges ikke sammen.
 *
 * Svarene må være kontrollert av kjernen først. Kaster `UgyldigVurdering` fra
 * kjernens utregning.
 */
export function brevverdi(
  svar: readonly Svarutkast[],
  u: Utledning,
  dagmulktssats: number | null,
  regler: Regelsett
): Brevverdi {
  let hoved = 0;
  let subsidiaert = 0;
  let ukjent = false;
  const dagverdi = (dager: number) => {
    if (dager === 0) return 0;
    if (dagmulktssats === null) {
      ukjent = true;
      return 0;
    }
    return dager * dagmulktssats;
  };

  for (const s of svar) {
    if (s.spor === 'grunnlag') continue;
    const krav = u.spor[s.spor].gjeldendeKrav;
    if (!krav) throw new Error(`Sporet ${s.spor} har ikke noe krav å svare på`);
    const r = regnUtSvar(
      s.spor,
      s.vurderinger,
      { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
      regler
    );
    if (s.spor === 'vederlag') {
      const h = r.godkjent_beloep as number;
      hoved += h;
      subsidiaert += (r.subsidiaert_godkjent_beloep as number | undefined) ?? h;
    } else {
      const h = r.godkjent_dager as number;
      hoved += dagverdi(h);
      subsidiaert += dagverdi((r.subsidiaert_godkjent_dager as number | undefined) ?? h);
    }
  }

  const grunnlag = svar.find((s) => s.spor === 'grunnlag');
  if (grunnlag?.vurderinger.resultat === 'godkjent') {
    const besvart = new Set(svar.map((s) => s.spor));
    for (const spor of KRAVSPOR) {
      if (besvart.has(spor)) continue;
      const v = kravverdi(spor, u.spor[spor], dagverdi);
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

function kravverdi(
  spor: Kravspor,
  sp: Sporutledning,
  dagverdi: (dager: number) => number
): number | null {
  if (sp.trukket || sp.ingenKrav) return 0;
  if (!sp.gjeldendeKrav) return null;
  const innhold = sp.gjeldendeKrav.innhold;
  return spor === 'vederlag' ? (innhold.beloep as number) : dagverdi(innhold.dager as number);
}

const dekker = (f: Fullmakt | undefined, beloep: number | null): boolean =>
  f !== undefined && (f.grense === null || (beloep !== null && beloep <= f.grense));

/**
 * Godkjennerne svaret må gjennom, i kjedens rekkefølge. Tom liste når avsenderens
 * egen fullmakt dekker verdien; ubegrenset fullmakt dekker også det som ikke kan
 * verdsettes. Ellers går kjeden fram til den første som dekker verdien, og når
 * verdien ikke kan verdsettes, hele kjeden. Avsenderen står ikke i sin egen kjede.
 */
export function godkjenningskjede(
  verdi: Brevverdi,
  avsenderId: string,
  fullmakter: readonly Fullmakt[]
): Fullmakt[] {
  if (fullmakter.length === 0)
    throw new IngenFullmakter('Byggherren har ikke registrert fullmakter i prosjektet');
  if (
    dekker(
      fullmakter.find((f) => f.brukerId === avsenderId),
      verdi.beloep
    )
  )
    return [];
  const kjede = fullmakter
    .filter((f) => f.brukerId !== avsenderId)
    .sort((a, b) => a.plass - b.plass);
  if (verdi.beloep !== null) {
    const siste = kjede.findIndex((f) => dekker(f, verdi.beloep));
    if (siste < 0)
      throw new UtilstrekkeligFullmakt(`Ingen i kjeden har fullmakt til ${verdi.beloep} kr`);
    return kjede.slice(0, siste + 1);
  }
  if (!kjede.some((f) => dekker(f, verdi.gulv)))
    throw new UtilstrekkeligFullmakt(`Ingen i kjeden har fullmakt til ${verdi.gulv} kr`);
  return kjede;
}
