/**
 * Verdien fullmakten for byggherrens svar regnes av (GFK-06 med presiseringen 24.09 og
 * GFK-U3). Kravene er kjernens kravversjoner (KA-U2, DT-02), og svarets beløp og dager
 * er kjernens utregning (B-13). Dagmulktssatsen leses, og kjeden avledes av hierarkiet
 * (GFK-U8), i `server/godkjenning.ts`.
 */
import { regnUtSvar } from '../kjerne/frosset/standpunkt.ts';
import type { Svarutkast } from '../kjerne/kommandoer/kommando.ts';
import { beloep, tilTall } from '../kjerne/regler/beloep.ts';
import type { Regelsett } from '../kjerne/regler/regelsett.ts';
import { KRAVSPOR, type Kravspor } from '../kjerne/typer.ts';
import {
  foresporselForFristsvar,
  type Sporutledning,
  type Utledning,
} from '../kjerne/utledning/utled.ts';

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
 * Verdien av svarene i ett brev. Et spor som besvares i brevet, har verdien i svaret.
 * Godkjenner brevet grunnlaget, har et kravspor som ikke besvares, verdien i TEs
 * gjeldende krav: et krav som ikke er sendt, kan ikke verdsettes, og et trukket krav
 * er 0. Avslått og frafalt ansvar er 0 (presiseringen 24.09). Fristdager uten
 * dagmulktssats kan ikke verdsettes (GFK-U3). Hovedstandpunktet og det subsidiære
 * summeres hver for seg, og det største gjelder; alternativene legges ikke sammen.
 *
 * Svarene må være kontrollert av kjernen først. Kaster det kjernens utregning
 * kaster (`regnUtSvar`): `UgyldigVurdering` og `UgyldigBeloep`, og `Error` for et krevd
 * beløp som ikke kan leses (`krevdBeloep`).
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
  /** Vederlag er kroner; frist er dager ganger dagmulktssatsen. */
  const sporverdi = (spor: Kravspor, kroner: unknown, dager: unknown): number => {
    if (spor === 'vederlag') return kroner as number;
    if (dager === 0) return 0;
    if (dagmulktssats === null) {
      ukjent = true;
      return 0;
    }
    return (dager as number) * dagmulktssats;
  };

  for (const s of svar) {
    if (s.spor === 'grunnlag') continue;
    const krav = u.spor[s.spor].gjeldendeKrav;
    if (!krav) throw new Error(`Sporet ${s.spor} har ikke noe krav å svare på`);
    const r = regnUtSvar(
      s.spor,
      s.vurderinger,
      {
        krav,
        grunnlagskrav: u.spor.grunnlag.gjeldendeKrav,
        foresporsel: foresporselForFristsvar(u),
      },
      regler
    );
    hoved += sporverdi(s.spor, r.godkjent_beloep, r.godkjent_dager);
    subsidiaert += sporverdi(
      s.spor,
      r.subsidiaert_godkjent_beloep ?? r.godkjent_beloep,
      r.subsidiaert_godkjent_dager ?? r.godkjent_dager
    );
  }

  const grunnlag = svar.find((s) => s.spor === 'grunnlag');
  if (grunnlag?.vurderinger.resultat === 'godkjent') {
    const besvart = new Set(svar.map((s) => s.spor));
    for (const spor of KRAVSPOR) {
      if (besvart.has(spor)) continue;
      const v = kravverdi(u.spor[spor], (innhold) =>
        sporverdi(spor, innhold.beloep, innhold.dager)
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

function kravverdi(
  sp: Sporutledning,
  verdi: (innhold: Record<string, unknown>) => number
): number | null {
  if (sp.trukket || sp.ingenKrav) return 0;
  if (!sp.gjeldendeKrav) return null;
  return verdi(sp.gjeldendeKrav.innhold);
}
