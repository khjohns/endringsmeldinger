/**
 * Beløpet parten skriver i et beløpsfelt, i kroner med høyst to desimaler (OV-U58).
 * Desimalkommaet bevares, og et format som ikke støttes, avvises. Beløpet rundes ikke
 * av og gjøres ikke om ved å fjerne tegn.
 */

export type LestBeloep = { verdi: number | undefined } | { feil: string };

const MELLOMROM = /\s/g;
const KRONER = /^(\d+)(?:,(\d*))?$/;

export const FORMATFEIL = 'Skriv beløpet med sifre og komma før øre, for eksempel 100 000,40.';
export const OEREFEIL = 'Beløpet kan ha høyst to sifre etter kommaet (øre).';

/** Tom tekst er ikke oppgitt. Mellomrom, også hardt, godtas som tusenskille. */
export function lesKroner(tekst: string): LestBeloep {
  const renset = tekst.trim().replace(MELLOMROM, '');
  if (renset === '') return { verdi: undefined };
  const treff = KRONER.exec(renset);
  if (!treff) return { feil: FORMATFEIL };
  const [, kroner, oere = ''] = treff;
  // Avsluttende nuller er fortsatt et helt antall øre (OV-U58).
  const desimaler = oere.replace(/0+$/, '');
  if (desimaler.length > 2) return { feil: OEREFEIL };
  return { verdi: Number(desimaler ? `${kroner}.${desimaler}` : kroner) };
}

/** Beløpet med tusenskille, og med to desimaler bare når det har øre: «100 000,40». */
export function visKroner(verdi: number | undefined): string {
  if (verdi === undefined) return '';
  const harOere = !Number.isInteger(verdi);
  return verdi.toLocaleString('nb-NO', {
    minimumFractionDigits: harOere ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
