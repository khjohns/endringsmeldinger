import { kroner } from '#kjerne/frosset/tekst.ts';
import type { Spor } from '#kjerne/typer.ts';
import type { Brevref } from '../lesing';
import { brevref } from './felles';
import { punkt, haerdet } from './format';

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
  /** Linja under handlingen i «Andre handlinger»: hva den gjør med saken. */
  virkning: {
    godta: (svar: Brevref) =>
      `Du godtar hele svaret i ${brevref(svar)}. Du ser brevet før det sendes.`,
    /**
     * Etter svaret: hjemmelen, kategorien og datoen står (GR-U40 punkt 7 og MM-U55 punkt 10),
     * så den nye versjonen utdyper begrunnelsen (oppdragsgiver 06.11, #1631). Hva TE gjør
     * gjeldende, følger hovedkategorien i § 33.1 og § 33.3.
     */
    oppdaterPaaberopelse: (hovedkategori: string | null) =>
      hovedkategori === 'endring'
        ? 'Redegjør nærmere for hvorfor dette er en endring.'
        : hovedkategori === 'force_majeure'
          ? 'Redegjør nærmere for hvorfor dette er force majeure.'
          : hovedkategori === 'svikt' || hovedkategori === 'andre_forhold'
            ? 'Redegjør nærmere for hvorfor dette er et forhold byggherren har risikoen for.'
            : 'Utdyp beskrivelsen og begrunnelsen. Byggherren svarer på nytt.',
    reviderKrav: 'Juster kravet eller begrunnelsen. Byggherren svarer på nytt.',
    /** Et nytt krav i vederlaget avslår tilbudet i svaret (OV-U54, D-6 i BF-44). */
    avslaarTilbudet: (krav: Brevref) =>
      `Det nye brevet oppdaterer kravet i ${brevref(krav)}. Det avslår tilbudet i svaret. Svaret kan da ikke godtas.`,
    /**
     * En ny kravversjon er den byggherren svarer på, og sporet venter på nytt svar. Teksten sier
     * hvilket brev det nye følger opp, ikke hva brevene sier i forhold til hverandre, og «brev»,
     * ikke «versjon» (språkfila, «Brev, ikke versjon»). Svaret på den
     * tidligere versjonen kan da ikke godtas i løsningen, og løsningen sier ikke at det er
     * avslått (MM-U34 punkt 1 og 2).
     */
    nyVersjon: (spor: Spor, krav: Brevref | null, svar: Brevref | null) => {
      const hva = spor === 'forhold' ? 'påberopelsen' : 'kravet';
      if (!krav) return 'Byggherren svarer på det nye brevet.';
      if (!svar)
        return `Oppdaterer ${hva} i ${brevref(krav)}. Byggherren svarer på det nye brevet.`;
      return `Oppdaterer ${hva} i ${brevref(krav)}. Du kan ikke lenger godta svaret i ${brevref(svar)} i denne saken. Byggherren svarer på det nye brevet.`;
    },
    // Et trukket forhold trekker kravene som bygger på det (GR-U5, GR-U25), og et trukket krav
    // kan ikke tas opp igjen (GR-U5).
    trekkForholdet: 'Trekker også kravene om vederlag og frist. Kan ikke tas opp igjen.',
    trekkKravet: 'Kravet kan ikke tas opp igjen.',
    /** Etter byggherrens svar gir trekket også avkall på det byggherren har godkjent (prototypen v3). */
    trekkKravetEtterSvar:
      'Du gir avkall på hele kravet, også det byggherren har godkjent. Kravet kan ikke tas opp igjen.',
    /** Byggherrens nye svar (U-16 i BF-44). */
    nyttSvar: (svar: Brevref) =>
      `Svaret i ${brevref(svar)} endres ikke. Det nye svaret sendes i et nytt brev.`,
  },
});

export const STILLING = haerdet({
  /** Når kjernen ikke kan lage akseptbrevet og ikke sier hvorfor. */
  godta: 'Aksepten kan ikke lages nå.',
  // Etter § 34.3.3 står justeringen subsidiært, ikke beløpet (VS-U4, KA-U64).
  omfatter: (hjemmel: string) =>
    `Aksepten omfatter også at byggherren gjør gjeldende at varselet etter ${punkt(hjemmel)} kom for sent, ikke bare ${hjemmel === '34.3.3' ? 'det subsidiære standpunktet til justeringen' : 'det subsidiære beløpet'}.`,
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
