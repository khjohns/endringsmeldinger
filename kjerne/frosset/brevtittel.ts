/**
 * Tittelen på brevet løsningen sender, frosset med teksten (MM-U3, #1536). Et registrert
 * brev har ingen frosset tittel; visningen gir det en etikett (MM-U17).
 */

import { forholdet, paaberopelsenAv } from './forholdene.ts';
import type { Dokument, Sakskode, Spor } from '../typer.ts';

/** Sakens kode slik brevene omtaler saken, uten utfylling: «KOE-17» (LV-U44, LV-U45). */
export const sakensKode = (s: Sakskode): string => `${s.kode.toUpperCase()}-${s.loepenummer}`;

const utfylt = (tall: number, sifre: number) => String(tall).padStart(sifre, '0');

/**
 * Merkingen på et brev fra løsningen, `K201-KOE-005-03`: kontraktsforkortelsen, sakens kode,
 * minst tre sifre i løpenummeret og minst to i brevnummeret (LV-U44, LV-U48). Den står i
 * hodet og i dokumentnavnet, og et senere brev viser til brevet med den (LV-U53).
 */
export const brevmerking = (
  kontraktsforkortelse: string,
  s: Sakskode,
  brevnummer: number
): string =>
  [
    kontraktsforkortelse,
    s.kode.toUpperCase(),
    utfylt(s.loepenummer, 3),
    utfylt(brevnummer, 2),
  ].join('-');

/**
 * Hvorfor leseren ikke forstår merkingen i et brev, eller `null`. Merkingen fryses bare i et
 * brev fra løsningen, med nummeret, og slutter med det (LV-U53, LV-U48, MM-U2).
 */
export function avvikIMerkingen(
  merking: string,
  brevnummer: number | undefined,
  registrert: boolean
): string | null {
  if (registrert || brevnummer === undefined)
    return 'merkingen står bare i et brev fra løsningen, med nummeret (LV-U53)';
  if (!merking.endsWith(`-${utfylt(brevnummer, 2)}`))
    return 'merkingen slutter ikke med brevnummeret (LV-U48)';
  return null;
}

/** Tittelen med sakens kode, slik skrivingen fryser den: «Krav om endring i sak KOE-17» (LV-U27). */
export const medSakskode = (tittel: string, s: Sakskode): string =>
  `${tittel} i sak ${sakensKode(s)}`;

/** Det `medSakskode` legger til, slik leseren kjenner det igjen. */
const SAKSKODE_ETTER_TITTELEN = /^ i sak (KOE|EO)-[1-9]\d*$/;

export const KRAVTITTEL: Record<Spor, string> = {
  forhold: 'Krav om endring',
  vederlag: 'Krav om vederlagsjustering',
  frist: 'Krav om fristforlengelse',
};

export const SVARTITTEL: Record<Spor, string> = {
  forhold: 'Svar på forholdet',
  vederlag: 'Svar på krav om vederlagsjustering',
  frist: 'Svar på krav om fristforlengelse',
};

export const UTSAGNSTITTEL = {
  aksept: 'Aksept av svaret',
  trekk: 'Trekk av kravet',
  innsigelse: 'Innsigelse etter punkt 5',
} as const;

/** Forholdet brevet påberoper (GR-U31): et krav i forholdssporet i et brev uten svar. */
function paaberoptForhold(d: Pick<Dokument, 'krav' | 'svar'>) {
  if (d.svar.length) return null;
  return forholdet(d.krav.find((k) => k.spor === 'forhold')?.innhold.underkategori);
}

/**
 * Tittelen etter det brevet inneholder: «Påberopelse av <forholdet>» (GR-U31), ellers etter
 * det første svaret, kravet eller utsagnet. `null` for et brev uten slik tittel.
 */
export function lagBrevtittel(d: Pick<Dokument, 'krav' | 'svar' | 'utsagn'>): string | null {
  if (d.svar.length) return SVARTITTEL[d.svar[0].spor];
  const f = paaberoptForhold(d);
  if (f) return paaberopelsenAv(f.navn);
  if (d.krav.length) return KRAVTITTEL[d.krav[0].spor];
  for (const x of d.utsagn)
    if (x.art === 'aksept' || x.art === 'trekk' || x.art === 'innsigelse')
      return UTSAGNSTITTEL[x.art];
  return null;
}

/**
 * MM-U3, MM-U2 (#1533): grunnen til at en lagret tittel ikke kan være laget av skrivingen, eller
 * `null`. Tittelen sammenliknes ikke med `lagBrevtittel`, så et sendt brev beholder tittelen det
 * ble sendt med (MM-U9) når titlene endres.
 */
export function avvikITittelen(
  tittel: string,
  d: Pick<Dokument, 'krav' | 'svar' | 'utsagn'>
): string | null {
  if (lagBrevtittel(d) === null)
    return 'brevet har en tittel, men løsningen gir ikke slike brev en (MM-U3)';
  const f = paaberoptForhold(d);
  const paaberoper = tittel.startsWith(paaberopelsenAv(''));
  const forventet = f && paaberopelsenAv(f.navn);
  const somForventet =
    !!forventet &&
    (tittel === forventet ||
      (tittel.startsWith(forventet) &&
        SAKSKODE_ETTER_TITTELEN.test(tittel.slice(forventet.length))));
  if (forventet ? !somForventet : paaberoper)
    return 'brevtittelen nevner ikke forholdet kravet påberoper (GR-U31)';
  return null;
}
