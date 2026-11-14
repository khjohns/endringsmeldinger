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

import { kanFaaInnsigelse, type Utledning } from '../utledning/utled.ts';
import type { ForesporselOgSvar } from '../spor/frist/frysing.ts';
import { FORUTSETNINGER_I_FRISTEN } from '../spor/frist/kommando.ts';
import { avvis, erKravpostvarselhjemmel, SPOR } from '../typer.ts';
import { iSporet } from '../frosset/byggeklosser.ts';
import { PARTEN } from '../frosset/brevdeler.ts';
import { FORUTSETNINGER_I_VEDERLAGET } from '../spor/vederlag/kommando.ts';
import type {
  Avvisning,
  Kravvarselhjemmel,
  Kravspor,
  Part,
  Spor,
  Varselhjemmel,
} from '../typer.ts';
import { FORUTSETNINGER_I_FORHOLDET, korrigering } from '../spor/forhold/kommando.ts';

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
  | {
      type:
        | 'bestride'
        | 'innsigelse'
        | 'protest'
        | 'passivitet'
        | 'merke'
        | 'avklare'
        | 'begrunne'
        | 'korrigere'
        | 'svare_paa_foresporsel';
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
  passivitet: 'TE',
  svare: 'BH',
  revidere: 'BH',
  bestride: null,
  innsigelse: null,
  protest: null,
  merke: null,
  avklare: null,
  begrunne: 'BH',
  korrigere: 'TE',
};

/**
 * Utsagnene uten virkning på utfallet som viser til et annet element. Innsigelsen
 * etter § 5 godtas også når saken er lukket etter GR-U27 (KA-U29), og mot det en
 * registrert enighet omfatter (MM-U34 punkt 13).
 * De andre er utsatt etter OV-U7 og avvises for begge parter.
 */
function henvisning(h: Extract<Handlingsnoekkel, { gjelder: string }>, part: Part, u: Utledning) {
  const maal = u.elementer[h.gjelder];
  switch (h.type) {
    case 'innsigelse':
      if (kanFaaInnsigelse(maal, part))
        for (const spor of SPOR) {
          const ikkeBygget = forutsetningerI(spor).innsigelsenErIkkeBygget(u, h.gjelder);
          if (ikkeBygget) return ikkeBygget;
        }
      // VS-U1, VS-U14: et varsel, krav eller svar fra motparten.
      return kanFaaInnsigelse(maal, part)
        ? null
        : avvis(
            'UGYLDIG_INNSIGELSE',
            'Innsigelsen må gjelde et varsel, et krav eller et svar fra motparten.'
          );
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
    case 'bestride':
    case 'merke':
    case 'avklare':
    case 'protest':
    case 'passivitet':
    case 'begrunne':
      // OV-U7: bestridelsen (MM-U7, MM-U14), merkingen etter KA-U20 og avklaringen av
      // den, protesten mot en innsigelse (VS-U1, VS-U9), påberopt passivitet (VS-U12)
      // og den senere begrunnelsen (KA-U34 (opphevet av KA-U46)) bygges ikke i første versjon.
      return avvis(
        'IKKE_I_FOERSTE_VERSJON',
        'Bestridelse, merking, avklaring, protest, påberopt passivitet og senere begrunnelse er ikke med i første versjon. Brevet kan registreres som dokumentasjon.'
      );
  }
}

const AVSLAGET_GODTATT =
  'Totalentreprenøren har godtatt svaret på påberopelsen, som avslår forholdet eller påberoper preklusjon, og saken er lukket.';

/** KA-U1, HF-U8: avvisningen sier ikke at det eldre svaret er avslått eller har falt bort. */
export const ELDRE_SVAR =
  'Aksepten må gjelde byggherrens gjeldende svar på kravet. Et eldre svar kan ikke godtas i løsningen. Det er en begrensning i løsningen, og svaret er ikke avslått eller falt bort av det (KA-U1, HF-U8).';

/** Det som er sporets eget i forutsetningene (#1783). */
export interface Sporsforutsetninger {
  /** Innsigelsen mot `gjelder` i sporet kan ikke sendes ennå, eller `null`. */
  innsigelsenErIkkeBygget(u: Utledning, gjelder: string): Avvisning | null;
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

const KRAVET_OM: Record<Kravspor, string> = {
  vederlag: 'vederlagsjustering',
  frist: 'fristforlengelse',
};

/** Avvisningen av et varsel fra appen etter kravet i sporet (VS-U16, OV-U5). */
const KRAVET_ER_SENDT: Record<Kravspor, (sendt: string) => Avvisning> = {
  vederlag: (sendt) => avvis('VEDERLAGSKRAV_SENDT', `Vederlagskravet ${sendt}`),
  frist: (sendt) => avvis('FRISTKRAV_SENDT', `Fristkravet ${sendt}`),
};

export function forutsetninger(h: Handlingsnoekkel, part: Part, u: Utledning): Avvisning | null {
  // OV-U4: hver side registrerer sine egne brev som dokumentasjon, uten virkning, også når
  // saken ikke er forstått, etter godtatt avslag og etter trekk.
  if (h.type === 'registrere_brev') return null;
  // MM-U2: en sak kjernen ikke forstår, tar ikke imot bindende kommandoer fra noen part.
  if (!u.forstaatt)
    return avvis('SAK_IKKE_FORSTAATT', 'Saken har hendelser denne versjonen ikke kan tolke.');
  const eier = PART[h.type];
  if (eier !== null && eier !== part)
    return avvis('FEIL_PART', `Bare ${PARTEN[eier]} kan gjøre dette.`);
  if ('gjelder' in h) return henvisning(h, part, u);
  // GR-U27: TEs aksept av et svar som avslår forholdet eller påberoper preklusjon, lukker saken. MM-U34 punkt 12: at
  // kravene er avgjort, sperrer ikke.
  if (u.forholdAvvist) return avvis('FORHOLD_AVVIST', AVSLAGET_GODTATT);

  const s = u.spor[h.spor];
  const paaberopelseSendt = u.spor.forhold.gjeldendeKrav !== null;
  switch (h.type) {
    case 'krav':
      // Vedtaket om trukket krav 05.10, GR-U5.
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket og kan ikke tas opp igjen.');
      // KA-U12: «ingen krav» lukker sporet på samme måte som et trekk.
      if (h.spor !== 'forhold' && s.ingenKrav)
        return avvis(
          'INGEN_KRAV_I_SPORET',
          `Totalentreprenøren har sagt at det ikke kreves ${KRAVET_OM[h.spor]}.`
        );
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
      // KA-U22: et avtalt fradrag (KA-U9) avvises av formatet, og sperren bygges med det. En
      // merking av et registrert brev gir ingen sperre (OV-U4, OV-U7).
      return forutsetningerI(h.spor).trekket(u);
    case 'ingen_krav':
      // KA-U12, KA-U15: et spor som ikke er sendt, etter at forholdet er sendt.
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (s.ingenKrav)
        return avvis(
          'INGEN_KRAV_I_SPORET',
          `Totalentreprenøren har allerede sagt at det ikke kreves ${KRAVET_OM[h.spor]}.`
        );
      if (s.krav.length)
        return avvis(
          'KRAV_I_SPORET',
          `Totalentreprenøren har sendt ${kravet(h.spor)}. Trekk kravet i stedet.`
        );
      if (!paaberopelseSendt)
        return avvis(
          'PAABEROPELSE_IKKE_SENDT',
          'Påberopelsen må være sendt før du kan si «ingen krav».'
        );
      return null;
    case 'varsle':
    case 'sende_varsel': {
      if (!paaberopelseSendt)
        return avvis('PAABEROPELSE_IKKE_SENDT', 'Påberopelsen må være sendt før du kan varsle.');
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (h.spor !== 'forhold' && s.ingenKrav)
        return avvis(
          'INGEN_KRAV_I_SPORET',
          `Totalentreprenøren har sagt at det ikke kreves ${KRAVET_OM[h.spor]}.`
        );
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
      if (!foresporsel) throw new Error(`${h.spor} har ingen forespørsel etter § 33.6.2.`);
      return foresporsel.sende(u, paaberopelseSendt);
    }
    case 'svare':
      if (!s.gjeldendeKrav)
        return avvis('INGEN_KRAV', `Totalentreprenøren har ikke sendt ${kravet(h.spor)}.`);
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (s.gjeldendeSvar)
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
