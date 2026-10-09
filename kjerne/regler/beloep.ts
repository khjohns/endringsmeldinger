/**
 * Beløp i hele øre, med samme semantikk som `regler.belop` i Python:
 * `Decimal(str(verdi)).quantize(Decimal("0.01"), ROUND_HALF_UP)`.
 *
 * Et flyttall går via sin korteste tekstform, som i Python, så 0.1 + 0.2 blir
 * 0,30 og 1.005 blir 1,01. ROUND_HALF_UP runder halvdeler bort fra null.
 */

export type Oere = bigint;

const DESIMALTALL = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i;

export class UgyldigBeloep extends Error {}

/** Heltall skalert med 10^skala, avrundet halv opp bort fra null. */
function skaler(tekst: string, skala: number): bigint {
  const treff = DESIMALTALL.exec(tekst.trim());
  if (!treff || (treff[2] === '' && (treff[3] ?? '') === '')) {
    throw new UgyldigBeloep(`ikke et tall: ${tekst}`);
  }
  const [, fortegn, heltall, desimaler = '', eksponent = '0'] = treff;
  const sifre = (heltall + desimaler).replace(/^0+(?=\d)/, '') || '0';
  // Verdien er sifre × 10^(eksponent − antall desimaler); vi vil ha × 10^skala.
  const forskyvning = Number(eksponent) - desimaler.length + skala;
  let resultat: bigint;
  if (forskyvning >= 0) {
    resultat = BigInt(sifre) * 10n ** BigInt(forskyvning);
  } else {
    const deler = 10n ** BigInt(-forskyvning);
    const tall = BigInt(sifre);
    resultat = tall / deler;
    if ((tall % deler) * 2n >= deler) resultat += 1n;
  }
  return fortegn === '-' ? -resultat : resultat;
}

/** Tekstformen Python ville gitt `str()`; for et tall er det JavaScripts korteste form. */
function tekst(verdi: number | string): string {
  if (typeof verdi === 'string') return verdi;
  if (!Number.isFinite(verdi)) throw new UgyldigBeloep(`ikke et endelig tall: ${verdi}`);
  return String(verdi);
}

export function beloep(verdi: number | string | null | undefined): Oere | null {
  if (verdi === null || verdi === undefined) return null;
  return skaler(tekst(verdi), 2);
}

export function erEndelig(verdi: unknown): boolean {
  return typeof verdi === 'number' ? Number.isFinite(verdi) : verdi !== null && verdi !== undefined;
}

export function tilKrone(oere: Oere): bigint {
  const krone = oere >= 0n ? (oere + 50n) / 100n : -((-oere + 50n) / 100n);
  return krone;
}

/** Øre til flyttall, slik Python lagrer `float(Decimal)`. */
export function tilTall(oere: Oere): number {
  const negativ = oere < 0n;
  const abs = negativ ? -oere : oere;
  const tekstform = `${negativ ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
  return Number(tekstform);
}

export const NULL_OERE: Oere = 0n;
