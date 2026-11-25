/**
 * Tittelen på brevet løsningen sender, frosset med teksten (LV-U2, LV-U25, MM-U9, MM-U50, #1536).
 * Et registrert brev har ingen frosset tittel; visningen gir det en etikett (MM-U17).
 */

import { SPOR, type Dokument, type Sakskode, type Spor, type Svar } from '../typer.ts';
import { liste } from './brevdeler.ts';
import { svaretGjelderEtVarsel } from '../spor/vederlag/format.ts';
import { medHardeMellomrom, sakensKode } from './tekst.ts';
import { paaberopelsenAv, paaberoptForhold } from '../spor/forhold/tekst.ts';

const utfylt = (tall: number, sifre: number) => String(tall).padStart(sifre, '0');

/** Kodene i `Sakskode`, slik merkingen og tittelen skriver dem (LV-U27, LV-U44). */
const SAKSKODENE = Object.keys({ koe: true, eo: true } satisfies Record<Sakskode['kode'], true>)
  .map((k) => k.toUpperCase())
  .join('|');

/**
 * Merkingen på et brev fra løsningen, `K201-KOE-005-03`: kontraktsforkortelsen, sakens kode,
 * minst tre sifre i løpenummeret og minst to i brevnummeret (LV-U44, LV-U48). Den står i
 * hodet og i dokumentnavnet, og et senere brev viser til brevet med den (LV-U44).
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
 * brev fra løsningen, med nummeret, og slutter med det (LV-U44, LV-U48, MM-U2).
 */
export function avvikIMerkingen(
  merking: string,
  brevnummer: number | undefined,
  registrert: boolean
): string | null {
  if (registrert || brevnummer === undefined)
    return 'merkingen står bare i et brev fra løsningen, med nummeret (LV-U44)';
  if (!merking.endsWith(`-${utfylt(brevnummer, 2)}`))
    return 'merkingen slutter ikke med brevnummeret (LV-U48)';
  if (!MERKINGEN.test(merking.slice(0, merking.lastIndexOf('-'))))
    return 'merkingen har ikke formen fra brevmerking (LV-U44, LV-U48)';
  return null;
}

/**
 * Det `brevmerking` lager foran brevnummeret: kontraktsforkortelsen, som har store bokstaver
 * og sifre i katalogen, sakens kode og løpenummeret med minst tre sifre (LV-U44, LV-U48).
 */
const MERKINGEN = new RegExp(`^[A-Z0-9]+-(${SAKSKODENE})-(00[1-9]|0[1-9]\\d|[1-9]\\d{2,})$`);

/** Tittelen med sakens kode, slik skrivingen fryser den: «Krav om endring i sak KOE-17» (LV-U27). */
export const medSakskode = (tittel: string, s: Sakskode): string =>
  `${tittel} i sak ${sakensKode(s)}`;

/** Det `medSakskode` legger til, slik leseren kjenner det igjen, med koden og løpenummeret. */
const I_SAK = ` i sak (${SAKSKODENE})-([1-9]\\d*)$`;
const SAKSKODE_ETTER_TITTELEN = new RegExp(`^${I_SAK}`);
const SAKEN_I_TITTELEN = new RegExp(I_SAK);

/**
 * Merkingen og tittelen i samme brev nevner hver sin sak (LV-U27, LV-U48). En sak har én kode, så
 * de må være like når begge står i brevet (MM-U2, #1588). Usann når en av dem ikke nevner saken.
 */
export function ulikSakIMerkingenOgTittelen(merking: string, tittel: string): boolean {
  const saken = (tekst: string, uttrykk: RegExp) => {
    const m = uttrykk.exec(tekst);
    return m ? `${m[1]}-${Number(m[2])}` : null;
  };
  const [i, j] = [
    saken(merking.slice(0, merking.lastIndexOf('-')), MERKINGEN),
    saken(tittel, SAKEN_I_TITTELEN),
  ];
  return i !== null && j !== null && i !== j;
}

export const KRAVTITTEL: Record<Spor, string> = {
  forhold: 'Krav om endring',
  vederlag: 'Krav om vederlagsjustering',
  frist: 'Krav om fristforlengelse',
};

/**
 * Det svaret gjelder: i tittelen, «krav om …», og i overskriften på svaret og i forbeholdet når
 * brevet svarer på flere krav, «kravet om …» (LV-U80, LV-U81). Svaret på et varsel som står alene,
 * nevner varselet (VS-U77 punkt 30 og 31, VS-U79).
 */
const SVARET_GJELDER: Record<Spor | '34.3.3' | '34.4', { tittel: string; del: string }> = {
  forhold: { tittel: 'forholdet', del: 'forholdet' },
  vederlag: { tittel: 'krav om vederlagsjustering', del: 'kravet om vederlagsjustering' },
  frist: { tittel: 'krav om fristforlengelse', del: 'kravet om fristforlengelse' },
  '34.3.3': {
    tittel: 'varsel om justering av enhetsprisene',
    del: 'varselet om justering av enhetsprisene',
  },
  '34.4': { tittel: 'varsel om regningsarbeid', del: 'varselet om regningsarbeid' },
};

const svartittel = (hva: keyof typeof SVARET_GJELDER) => `Svar på ${SVARET_GJELDER[hva].tittel}`;

export const SVARTITTEL: Record<Spor, string> = {
  forhold: svartittel('forhold'),
  vederlag: svartittel('vederlag'),
  frist: svartittel('frist'),
};

/** Tittelen på byggherrens svar på et varsel som står alene. */
export const SVARTITTEL_PAA_VARSELET = {
  '34.3.3': svartittel('34.3.3'),
  '34.4': svartittel('34.4'),
} as const;

export const svaretGjelder = (s: Pick<Svar, 'spor' | 'standpunkter'>) =>
  SVARET_GJELDER[svaretGjelderEtVarsel(s) ? varseletsHjemmel(s) : s.spor];

/** Svarene i rekkefølgen de står i brevet og i tittelen: forholdet først (LV-U34, LV-U80). */
export const iBrevetsRekkefoelge = <S extends Pick<Svar, 'spor'>>(svar: readonly S[]): S[] =>
  [...svar].sort((a, b) => SPOR.indexOf(a.spor) - SPOR.indexOf(b.spor));

/** Bestemmelsen varselet er gitt etter: standpunktet til justeringen står bare etter § 34.3.3. */
const varseletsHjemmel = (s: Pick<Svar, 'standpunkter'>): '34.3.3' | '34.4' =>
  s.standpunkter.some((p) => p.art === 'rettidighet' && p.hjemmel === '34.4') ? '34.4' : '34.3.3';

export const UTSAGNSTITTEL = {
  aksept: 'Aksept av svaret',
  trekk: 'Trekk av kravet',
  innsigelse: 'Innsigelse etter punkt 5',
  // LV-U55: brevet med korrigeringen etter punkt 10 i samlevedtaket for retting av sendt brev (MM-U59).
  korrigering: 'Korrigering av datoen',
} as const;

/**
 * Tittelen etter det brevet inneholder: «Påberopelse av <forholdet>» (GR-U31), ellers etter
 * det første svaret, kravet eller utsagnet. `null` for et brev uten slik tittel.
 */
export function lagBrevtittel(d: Pick<Dokument, 'krav' | 'svar' | 'utsagn'>): string | null {
  const tittel = tittelen(d);
  return tittel === null ? null : medHardeMellomrom(tittel);
}

function tittelen(d: Pick<Dokument, 'krav' | 'svar' | 'utsagn'>): string | null {
  // LV-U80, LV-U34: tittelen nevner alle kravene brevet svarer på.
  if (d.svar.length)
    return `Svar på ${liste(iBrevetsRekkefoelge(d.svar).map((s) => svaretGjelder(s).tittel))}`;
  const f = paaberoptForhold(d);
  if (f) return paaberopelsenAv(f.navn);
  if (d.krav.length) return KRAVTITTEL[d.krav[0].spor];
  for (const x of d.utsagn)
    if (
      x.art === 'aksept' ||
      x.art === 'trekk' ||
      x.art === 'innsigelse' ||
      x.art === 'korrigering'
    )
      return UTSAGNSTITTEL[x.art];
  return null;
}

/**
 * LV-U25, MM-U2 (#1533): grunnen til at en lagret tittel ikke kan være laget av skrivingen, eller
 * `null`. Tittelen sammenliknes ikke med `lagBrevtittel`, så et sendt brev beholder tittelen det
 * ble sendt med (MM-U9) når titlene endres.
 */
export function avvikITittelen(
  tittel: string,
  d: Pick<Dokument, 'krav' | 'svar' | 'utsagn'>
): string | null {
  if (lagBrevtittel(d) === null)
    return 'brevet har en tittel, men løsningen gir ikke slike brev en (MM-U50)';
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
