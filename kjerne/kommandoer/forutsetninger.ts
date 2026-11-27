/**
 * Forutsetningene for en kommando: det som bare avhenger av utledningen og
 * parten, ikke av nyttelasten (2.6 i modellforslaget). Hver forutsetning leser
 * et predikat av utsagnene og relasjonene, med vedtaket ved siden av; ingen
 * leser en status eller en verdi som oppsummerer et spor eller saken.
 * Regelkodene er norske; tabellen over gamle og nye navn står i domenetabellen.
 *
 * `handlinger.ts` tilbyr kandidatene der forutsetningene holder, så tilbudet og
 * avvisningen er de samme per konstruksjon (INV-MM-1).
 */

import { sendtFoerGjeldendeSvar, type Utledning } from '../utledning/utled.ts';
import type { ForesporselOgSvar } from '../spor/frist/frysing.ts';
import {
  FORUTSETNINGER_I_FRISTEN,
  fristvarseletIKravet,
  fristvarseletSvaretGjelder,
  hindrerSvaretPaaFristvarselet,
} from '../spor/frist/kommando.ts';
import { avvis, erKravpostvarselhjemmel, SPOR } from '../typer.ts';
import { iSporet } from '../frosset/byggeklosser.ts';
import { PARTEN } from '../frosset/brevdeler.ts';
import {
  FORUTSETNINGER_I_VEDERLAGET,
  hindrerSvaretBarePaaVarselet,
  hindrerSvaretPaaVarselet,
  kunnskapsdatoen,
} from '../spor/vederlag/kommando.ts';
import type {
  Avvisning,
  Kravvarselhjemmel,
  Kravspor,
  Part,
  Spor,
  Varselhjemmel,
} from '../typer.ts';
import { FORUTSETNINGER_I_FORHOLDET, korrigering } from '../spor/forhold/kommando.ts';
import { rettingen } from './rettingen.ts';

export type Handlingsnoekkel =
  | { type: 'krav' | 'trekke' | 'godta' | 'svare' | 'revidere'; spor: Spor }
  | { type: 'varsle' | 'sende_varsel'; spor: Kravspor }
  /**
   * Det særskilte varselet etter § 34.1.3 tredje ledd, ved siden av varselet i sporet (OV-U25),
   * og varslene etter § 34.3.3 første ledd og § 34.4 (VS-U48, VS-U52).
   */
  | {
      type: 'varsle' | 'sende_varsel';
      spor: 'vederlag';
      hjemmel: Exclude<Kravvarselhjemmel, (typeof VARSEL_I_SPORET)[Kravspor]>;
    }
  /** VS-U34, VS-U38: varselet etter § 32.2 sendt utenfor løsningen, registrert etter påberopelsen. */
  | { type: 'varsle'; spor: 'forhold'; hjemmel: '32.2' }
  | { type: 'sende_foresporsel'; spor: 'frist' }
  | { type: 'ingen_krav'; spor: Kravspor }
  | { type: 'registrere_brev' }
  /** OV-U97, MM-U47: innlegget i fritekst, fra begge parter. Brevet det viser til, står i kommandoen. */
  | { type: 'sende_innlegg' }
  /**
   * VS-U79: byggherrens svar på et varsel som står alene (VS-U96 punkt 30–32), eller bare på
   * varselet i kravversjonen `gjelder` når kravet selv er varselet (punkt 38).
   */
  | { type: 'svare' | 'revidere'; gjelder: string }
  | {
      type: 'korrigere' | 'oppgi_kunnskapsdato' | 'svare_paa_foresporsel' | 'rette_datoen';
      gjelder: string;
    };

export const noekkel = (h: Handlingsnoekkel): string =>
  'gjelder' in h
    ? `${h.type}:${h.gjelder}`
    : 'hjemmel' in h
      ? `${h.type}:${h.hjemmel}`
      : 'spor' in h
        ? `${h.type}:${h.spor}`
        : h.type;

/** Varselet i sporet, som handlingsnøkkelen uten hjemmel gjelder (OV-U5). */
export const VARSEL_I_SPORET = { frist: '33.4', vederlag: '34.1.2' } as const satisfies Record<
  Kravspor,
  Varselhjemmel
>;

const PART: Record<Handlingsnoekkel['type'], Part | null> = {
  krav: 'TE',
  trekke: 'TE',
  godta: 'TE',
  varsle: 'TE',
  sende_varsel: 'TE',
  sende_foresporsel: 'BH',
  svare_paa_foresporsel: 'TE',
  ingen_krav: 'TE',
  registrere_brev: null,
  sende_innlegg: null,
  svare: 'BH',
  revidere: 'BH',
  korrigere: 'TE',
  oppgi_kunnskapsdato: 'TE',
  rette_datoen: 'TE',
};

/** Typene i handlingsnøklene, med parten som eier hver av dem i `PART`. */
export const HANDLINGSTYPER = Object.keys(PART) as Handlingsnoekkel['type'][];

/**
 * Handlingene som viser til et annet element: svaret på et varsel som står alene, begrunnelsen
 * på forespørselen, korrigeringen, kunnskapsdatoen og rettingen av datoen.
 */
function henvisning(
  h: Extract<Handlingsnoekkel, { gjelder: string }>,
  u: Utledning,
  sendt: string | null
) {
  switch (h.type) {
    case 'svare':
    case 'revidere': {
      // VS-U96 punkt 32 og 38: varselet etter § 33.4 i fristen, også når kravet selv er varselet,
      // varselet i et vederlagskrav som selv er varselet, ellers et varsel i vederlaget.
      const hindrer =
        fristvarseletSvaretGjelder(u, h.gjelder) || fristvarseletIKravet(u, h.gjelder)
          ? hindrerSvaretPaaFristvarselet
          : u.spor.vederlag.krav.some((k) => k.id === h.gjelder)
            ? hindrerSvaretBarePaaVarselet
            : hindrerSvaretPaaVarselet;
      // HF-U35 punkt 9, som for svaret på kravet.
      return u.forholdAvvist
        ? avvis('FORHOLD_AVVIST', AVSLAGET_GODTATT)
        : hindrer(u, h.gjelder, h.type === 'svare' ? 'Svaret' : 'Revisjonen', sendt);
    }
    case 'svare_paa_foresporsel': {
      // VS-U27: en forespørsel fra appen, i sporet som har den.
      for (const spor of SPOR) {
        const f = u.spor[spor].foresporsler.find((x) => x.foresporsel === h.gjelder);
        if (!f) continue;
        const foresporsel = forutsetningerI(spor).foresporsel;
        if (!foresporsel)
          throw new Error(`${spor} har en forespørsel, men ingen forutsetninger for den.`);
        return foresporsel.svare(
          u,
          f,
          u.forholdAvvist ? avvis('FORHOLD_AVVIST', AVSLAGET_GODTATT) : null
        );
      }
      return avvis(
        'INGEN_FORESPORSEL',
        'Begrunnelsen må gjelde en forespørsel etter punkt 33.6.2 fra byggherren.'
      );
    }
    case 'korrigere':
      return korrigering(h.gjelder, u);
    case 'oppgi_kunnskapsdato':
      return kunnskapsdatoen(h.gjelder, u);
    case 'rette_datoen':
      return rettingen(h.gjelder, u);
  }
}

const AVSLAGET_GODTATT =
  'Totalentreprenøren har godtatt svaret på påberopelsen, som avslår forholdet, og saken er lukket.';

/** KA-U1, HF-U8: avvisningen sier ikke at det eldre svaret er avslått eller har falt bort. */
export const ELDRE_SVAR =
  'Aksepten må gjelde byggherrens gjeldende svar på kravet. Et eldre svar kan ikke godtas herfra. Det er en begrensning i løsningen, og svaret er ikke avslått eller falt bort av det.';

/** Det som er sporets eget i forutsetningene (#1783). */
export interface Sporsforutsetninger {
  /** Det som hindrer svaret på gjeldende krav i sporet, eller revisjonen av det. */
  svaret(u: Utledning, hva: 'Svaret' | 'Revisjonen'): Avvisning | null;
  /** Kravet i sporet, med navnet i visningen (konseptet for Varden, versjon 14). */
  kravet: string;
  /** Det i sporet som hindrer TE i å trekke kravet, når det er sendt og ikke trukket. */
  trekket(u: Utledning): Avvisning | null;
  /** Det i sporet som hindrer TEs aksept av gjeldende svar, når det ikke er enighet. */
  aksepten(u: Utledning): Avvisning | null;
  /** Forespørselen etter § 33.6.2 i sporet, eller `null` når sporet ikke har den. */
  foresporsel: Foresporselsforutsetninger | null;
}

/** Forutsetningene for forespørselen i et spor (`Sporsforutsetninger.foresporsel`). */
export interface Foresporselsforutsetninger {
  /** Det som hindrer byggherren i å sende forespørselen. */
  sende(u: Utledning, paaberopelseSendt: boolean): Avvisning | null;
  /**
   * Det som hindrer TEs begrunnelse på forespørselen `f`. `avslaget` er avvisningen når TE har
   * godtatt avslaget på grunnlaget (GR-U27).
   */
  svare(u: Utledning, f: ForesporselOgSvar, avslaget: Avvisning | null): Avvisning | null;
}

/** Forutsetningene i hvert spor. */
const FORUTSETNINGER: Record<Spor, Sporsforutsetninger> = {
  forhold: FORUTSETNINGER_I_FORHOLDET,
  vederlag: FORUTSETNINGER_I_VEDERLAGET,
  frist: FORUTSETNINGER_I_FRISTEN,
};

/** Forutsetningene i sporet (`iSporet`). */
const forutsetningerI = (spor: Spor): Sporsforutsetninger => iSporet(FORUTSETNINGER, spor);

/** Kravet i sporet (`Sporsforutsetninger.kravet`). */
const kravet = (spor: Spor): string => forutsetningerI(spor).kravet;

/** Avvisningen av et varsel fra appen etter kravet i sporet (VS-U16, OV-U5). */
const KRAVET_ER_SENDT: Record<Kravspor, (sendt: string) => Avvisning> = {
  vederlag: (sendt) => avvis('VEDERLAGSKRAV_SENDT', `Vederlagskravet ${sendt}`),
  frist: (sendt) => avvis('FRISTKRAV_SENDT', `Fristkravet ${sendt}`),
};

/**
 * `sendt` er dagen et brev lagt til ble sendt (OV-U98), og `null` for et brev fra løsningen og for
 * handlingene løsningen tilbyr.
 */
export function forutsetninger(
  h: Handlingsnoekkel,
  part: Part,
  u: Utledning,
  sendt: string | null
): Avvisning | null {
  // OV-U4: hver side registrerer sine egne brev som dokumentasjon, uten virkning, også når
  // saken ikke er forstått, etter godtatt avslag og etter trekk.
  if (h.type === 'registrere_brev') return null;
  // MM-U47 punkt 5 og 10, MM-U44, MM-U56: innlegget sperrer ingenting og godtas fra begge parter,
  // også etter enighet, etter godtatt avslag og når saken ikke er forstått.
  if (h.type === 'sende_innlegg') return null;
  // MM-U2: en sak kjernen ikke forstår, tar ikke imot bindende kommandoer fra noen part.
  if (!u.forstaatt)
    return avvis('SAK_IKKE_FORSTAATT', 'Saken har hendelser denne versjonen ikke kan tolke.');
  const eier = PART[h.type];
  if (eier !== null && eier !== part)
    return avvis('FEIL_PART', `Bare ${PARTEN[eier]} kan gjøre dette.`);
  if ('gjelder' in h) return henvisning(h, u, sendt);
  // OV-U7, OV-U99 punkt 2: «ingen krav» venter.
  if (h.type === 'ingen_krav')
    return avvis(
      'IKKE_I_FOERSTE_VERSJON',
      '«Ingen krav» er ikke med i første versjon. Brevet kan registreres som dokumentasjon.'
    );
  // HF-U35 punkt 9, HF-U37: TEs aksept av et svar som avslår forholdet, lukker saken. MM-U34
  // punkt 12: at kravene er avgjort, sperrer ikke.
  if (u.forholdAvvist) return avvis('FORHOLD_AVVIST', AVSLAGET_GODTATT);

  const s = u.spor[h.spor];
  const paaberopelseSendt = u.spor.forhold.gjeldendeKrav !== null;
  switch (h.type) {
    case 'krav':
      // Vedtaket om trukket krav 05.10, GR-U5.
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket og kan ikke tas opp igjen.');
      // MM-U34 punkt 9: også i et spor med registrert enighet, fram til endringsordren.
      if (h.spor !== 'forhold' && !paaberopelseSendt)
        return avvis(
          'PAABEROPELSE_IKKE_SENDT',
          'Påberopelsen må være sendt før du kan sende krav.'
        );
      return null;
    case 'trekke':
      if (!s.gjeldendeKrav)
        return avvis('INGEN_KRAV', `Totalentreprenøren har ikke sendt ${kravet(h.spor)}.`);
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er allerede trukket.');
      // KA-U22: et avtalt fradrag (KA-U9) avvises av formatet, og sperren bygges med det.
      return forutsetningerI(h.spor).trekket(u);
    case 'varsle':
    case 'sende_varsel': {
      if (!paaberopelseSendt)
        return avvis('PAABEROPELSE_IKKE_SENDT', 'Påberopelsen må være sendt før du kan varsle.');
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      const hjemmel = 'hjemmel' in h ? h.hjemmel : VARSEL_I_SPORET[h.spor];
      // VS-U48, VS-U52: saken kan ha flere varsler etter § 34.3.3 og § 34.4, før og etter kravet.
      if (erKravpostvarselhjemmel(hjemmel)) return null;
      // SK-12 og MM-U1: et registrert varsel kan ikke flyttes. Et utledet varsel er ikke registrert.
      if (s.varsler[hjemmel])
        return avvis('VARSEL_REGISTRERT', 'Varselet er registrert og kan ikke flyttes.');
      // OV-U8: det særskilte varselet etter § 34.1.3 kan sendes også etter vederlagskravet.
      if ('hjemmel' in h) return null;
      // VS-U16, OV-U5: etter kravet i sporet kan varselet fra appen bare få en senere dato
      // enn kravet. Et varsel sendt tidligere utenfor appen registreres (MM-U8 (opphevet av MM-U50)).
      if (h.type === 'sende_varsel' && s.krav.length) {
        const sendt =
          'er sendt, så et varsel sendt herfra kommer etter det. Et varsel sendt tidligere på annen måte kan registreres med sin dato.';
        return KRAVET_ER_SENDT[h.spor](sendt);
      }
      return null;
    }
    case 'sende_foresporsel': {
      const foresporsel = forutsetningerI(h.spor).foresporsel;
      if (!foresporsel) throw new Error(`${h.spor} har ingen forespørsel etter punkt 33.6.2.`);
      return foresporsel.sende(u, paaberopelseSendt);
    }
    case 'svare':
      if (!s.gjeldendeKrav)
        return avvis('INGEN_KRAV', `Totalentreprenøren har ikke sendt ${kravet(h.spor)}.`);
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      // OV-U103: et svar lagt til, sendt før det gjeldende svaret, står utenfor rekken.
      if (s.gjeldendeSvar && !sendtFoerGjeldendeSvar(u, h.spor, s.gjeldendeSvar.gjelder, sendt))
        return avvis('ALLEREDE_SVART', 'Du har allerede svart på denne versjonen. Revider svaret.');
      return forutsetningerI(h.spor).svaret(u, 'Svaret');
    case 'revidere':
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (!s.gjeldendeSvar)
        return avvis('INGEN_SVAR', 'Det finnes ikke noe svar på gjeldende krav å revidere.');
      // MM-U34 punkt 11, EO-U12: også et svar TE har godtatt eller som stemmer med kravet.
      return forutsetningerI(h.spor).svaret(u, 'Revisjonen');
    case 'godta':
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      // OV-U98, OV-U103: en aksept lagt til gjelder svaret den godtar, og om det var byggherrens
      // gjeldende svar da aksepten ble sendt, avgjør `registreringenStrider`, og enigheten (GR-U8)
      // og frafallet (GR-U9) i det svaret prøver `utsagnetStrider`.
      if (sendt !== null) return null;
      if (!s.gjeldendeSvar)
        return avvis(
          'IKKE_GJELDENDE_SVAR',
          s.svar.length > 0
            ? `Byggherren har ikke svart på gjeldende krav. ${ELDRE_SVAR}`
            : `Byggherren har ikke svart på ${kravet(h.spor)}.`
        );
      // GR-U8: enigheten er alt registrert, også når byggherren har godkjent hele kravet.
      if (s.enighet)
        return avvis(
          'ENIGHET_I_SPORET',
          `Enigheten om svaret på ${kravet(h.spor)} er allerede registrert.`
        );
      return forutsetningerI(h.spor).aksepten(u);
  }
}
