import { kroner } from '#kjerne/frosset/tekst.ts';
import type { Brevref } from '../lesing';
import { brevref } from './felles';
import { dato, punkt, haerdet } from './format';
import type { Spor } from '#kjerne/typer.ts';

/**
 * Brevtypene kjernen kan tilby i sporet, i fast rekkefølge, med teksten de vises med. En
 * handling kjernen tilbyr som ikke står her, vises med `ukjentHandling`, så ingen faller bort.
 */
export const BREVTYPER: { type: string; tekst: string }[] = haerdet([
  { type: 'svare', tekst: 'Svar på kravet' },
  { type: 'revidere', tekst: 'Send nytt svar' },
  { type: 'godta', tekst: 'Godta svaret' },
  { type: 'krav', tekst: 'Oppdater kravet' },
  { type: 'sende_varsel', tekst: 'Send varsel' },
  { type: 'varsle', tekst: 'Registrer et varsel som er sendt på annen måte' },
  { type: 'svare_paa_foresporsel', tekst: 'Svar på forespørselen om dagene' },
  // Forsering etter punkt 33.8 er ikke en handling i kjernen (U-6 i BF-45, OV-U2, svar 3 A).
  { type: 'forsering', tekst: 'Anse avslaget som pålegg om forsering' },
  { type: 'trekke', tekst: 'Trekk kravet' },
  // Står ved datoen, ikke i «Andre handlinger» (skissen i BF-02A, #1615).
  { type: 'korrigere', tekst: 'Korriger datoen' },
]);

export const ukjentHandling = (noekkel: string) => `Handlingen ${noekkel}`;

/** Varselet med hjemmelen kjernen gir handlingen (OV-U5, #1703). */
export const varselet = (type: string, hjemmel: string) =>
  `${type === 'sende_varsel' ? 'Send varsel' : 'Registrer et varsel som er sendt på annen måte'} etter ${punkt(hjemmel)}`;

/** Kortet «Det du kan gjøre nå», som i prototypen `grunnlagsoversikt.html`. */
export const HANDLINGENE = haerdet({
  andre: 'Andre handlinger',
  /** En brevtype som ikke er bygget i Varden (#1636). */
  ikkeBygget: 'Denne handlingen er ikke bygget i prøven ennå.',
  godta: (avslag: boolean) => `Godta ${avslag ? 'avslaget' : 'svaret'}`,
  /** Den nye kravversjonen etter byggherrens svar i vederlaget og fristen (oppdragsgiver 06.11, #1631). */
  revidertKrav: 'Oppdater kravet',
  /**
   * Linja under handlingen i «Andre handlinger», bare der et vedtak krever den: virkningen av et
   * trekk (GR-U5, GR-U25, KA-U22). Ellers står virkningen i skjemaet og i «Når du sender».
   */
  virkning: {
    // Et trukket forhold trekker kravene som bygger på det (GR-U5, GR-U25), og et trukket krav
    // kan ikke tas opp igjen (GR-U5).
    trekkForholdet: 'Trekker også kravene om vederlag og frist. Kan ikke tas opp igjen.',
    trekkKravet: 'Kravet kan ikke tas opp igjen.',
    /** Etter byggherrens svar gir trekket også avkall på det byggherren har godkjent (prototypen v3). */
    trekkKravetEtterSvar:
      'Du gir avkall på hele kravet, også det byggherren har godkjent. Kravet kan ikke tas opp igjen.',
  },
});

export const STILLING = haerdet({
  /** Når kjernen ikke kan lage akseptbrevet og ikke sier hvorfor. */
  godta: 'Aksepten kan ikke lages nå.',
  // Etter § 34.3.3 står justeringen subsidiært, ikke beløpet (VS-U4, KA-U64), og i fristen
  // dagene (#2346). Punkt 33.6.2 gjelder svaret på forespørselen, ikke et varsel.
  omfatter: (hjemmel: string, spor: Spor) =>
    `Aksepten omfatter også at byggherren gjør gjeldende at ${hjemmel === '33.6.2' ? 'svaret på forespørselen' : 'varselet'} etter ${punkt(hjemmel)} kom for sent, ikke bare ${spor === 'frist' ? 'de subsidiære dagene' : hjemmel === '34.3.3' ? 'det subsidiære standpunktet til justeringen' : 'det subsidiære beløpet'}.`,
  /** U-4 i BF-46: aksepten sendes etter akseptfristen (HF-U23 punkt 7 og 8). */
  etterAkseptfristen: (frist: string) =>
    `Akseptfristen i byggherrens svar var ${dato(frist)}. Brevet sier at aksepten er sendt etter fristen. Løsningen avgjør ikke om byggherren fortsatt er bundet av svaret.`,
  beloep: (beloep: number, b: Brevref) =>
    `Godtar du, er beløpet dere er enige om for vederlagsjusteringen ${kroner(beloep)}, etter ${brevref(b)} slik det ble sendt.`,
  /**
   * Beløpet i enigheten, og kravpostene uten fast beløp prinsipalt, som beløpet ikke regner med
   * (OV-U73, svar 6 A i #1663). Uten noe fast beløp står bare kravpostene, ikke 0 kr.
   */
  beloepet: (beloep: number, uten: string[], b: Brevref): string[] => {
    if (!uten.length) return [STILLING.beloep(beloep, b)];
    const liste = uten.length > 1 ? `${uten.slice(0, -1).join(', ')} og ${uten.at(-1)}` : uten[0];
    return beloep === 0
      ? [
          `Godtar du, har ${liste} ikke et fast beløp prinsipalt, og dere er ikke enige om et beløp for ${uten.length > 1 ? 'dem' : 'den'}.`,
        ]
      : [
          STILLING.beloep(beloep, b),
          `${liste} har ikke et fast beløp prinsipalt og er ikke regnet med i beløpet.`,
        ];
  },
  vilkaar: 'Enigheten får virkning når forholdet er avklart.',
  kilde: (b: Brevref) => `Virkningen er regnet ut fra ${brevref(b)} slik det ble sendt.`,
  godtarBrev: (b: Brevref) => `Du godtar hele svaret i ${brevref(b)}`,
});
