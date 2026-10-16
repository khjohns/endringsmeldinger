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

import {
  kanFaaInnsigelse,
  kanFaaProtest,
  kraveneErAvgjort,
  trekkAvGrunnlagetErSperret,
  type Utledning,
} from '../utledning/utled.ts';
import { KRAVSPOR, type Avvisning, type Kravspor, type Part, type Spor } from '../typer.ts';

export type Handlingsnoekkel =
  | { type: 'krav' | 'trekke' | 'godta' | 'svare' | 'revidere'; spor: Spor }
  | { type: 'varsle' | 'sende_varsel'; spor: 'frist' }
  | { type: 'ingen_krav'; spor: Kravspor }
  | {
      type: 'bestride' | 'innsigelse' | 'protest' | 'passivitet' | 'merke' | 'avklare' | 'begrunne';
      gjelder: string;
    };

export const noekkel = (h: Handlingsnoekkel): string =>
  'gjelder' in h ? `${h.type}:${h.gjelder}` : `${h.type}:${h.spor}`;

const PART: Record<Handlingsnoekkel['type'], Part | null> = {
  krav: 'TE',
  trekke: 'TE',
  godta: 'TE',
  varsle: 'TE',
  sende_varsel: 'TE',
  ingen_krav: 'TE',
  passivitet: 'TE',
  svare: 'BH',
  revidere: 'BH',
  bestride: null,
  innsigelse: null,
  protest: null,
  merke: null,
  avklare: null,
  begrunne: 'BH',
};

/**
 * Utsagnene uten virkning på utfallet som viser til et annet element: § 5, VS-U12
 * og KA-U34. Som bestridelsen (MM-U7) godtas de også når kravene er avgjort
 * eller avslaget av grunnlaget er godtatt (KA-U11, KA-U28, KA-U29, KA-U34).
 */
function henvisning(h: Extract<Handlingsnoekkel, { gjelder: string }>, part: Part, u: Utledning) {
  const maal = u.elementer[h.gjelder];
  switch (h.type) {
    case 'innsigelse':
      // VS-U1, VS-U14: et varsel, krav eller svar fra motparten.
      return kanFaaInnsigelse(maal, part)
        ? null
        : avvis(
            'UGYLDIG_INNSIGELSE',
            'Innsigelsen må gjelde et varsel, et krav eller et svar fra motparten.'
          );
    case 'protest': {
      // VS-U1, MP-U6: en innsigelse fra motparten, påberopelsen i et svar, eller et
      // dokument fra motparten med innsigelser, som protesten da gjelder alle.
      return kanFaaProtest(h.gjelder, part, u.elementer)
        ? null
        : avvis('INGEN_INNSIGELSE', 'Det finnes ingen innsigelse fra motparten å protestere mot.');
    }
    case 'passivitet':
      // VS-U12: TEs varsel etter § 32.2 er kravet i grunnlagssporet.
      return u.spor.grunnlag.krav.some((k) => k.id === h.gjelder)
        ? null
        : avvis('INGEN_VARSEL_ETTER_32_2', 'Påberopelsen må vise til TEs varsel etter § 32.2.');
    case 'merke':
    case 'avklare':
      // OV-U7: merkingen etter KA-U20 og avklaringen av den bygges ikke i første versjon.
      return avvis(
        'IKKE_I_FOERSTE_VERSJON',
        'Merking og avklaring av registrerte brev er ikke med i første versjon. Brevet kan registreres som dokumentasjon.'
      );
    case 'begrunne':
      // KA-U34: et svar, sendt eller registrert. Et svar er alltid fra BH (format/leser.ts).
      return maal?.art === 'svar'
        ? null
        : avvis('INGEN_SVAR_AA_BEGRUNNE', 'Begrunnelsen må gjelde et svar fra byggherren.');
    case 'bestride': {
      // MM-U7: en bestridelse endrer ikke noe utfall og kan registreres når som helst.
      const o = u.opplysninger.find((x) => x.opplysning.id === h.gjelder);
      if (!o || o.opplysning.oppgittAv === part)
        return avvis(
          'INGENTING_AA_BESTRIDE',
          'Det finnes ingen opplysning fra motparten å bestride.'
        );
      if (o.bestridelser.some((b) => b.part === part))
        return avvis('INGENTING_AA_BESTRIDE', 'Opplysningen er allerede bestridt.');
      return null;
    }
  }
}

export const avvis = (regel: string, melding: string): Avvisning => ({ regel, melding });

const KRAVET: Record<Kravspor, string> = {
  vederlag: 'justering av vederlaget',
  frist: 'fristforlengelse',
};

/** Hvordan grunnlaget og hvert krav ble avgjort i denne saken (KA-U11). */
function hvorforAvgjort(u: Utledning): string {
  const grunnlag = u.frafalt
    ? 'byggherren har frafalt pålegget'
    : 'byggherren har godkjent grunnlaget';
  const krav = KRAVSPOR.map((n) =>
    u.spor[n].trukket
      ? `kravet om ${KRAVET[n]} er trukket`
      : u.spor[n].ingenKrav
        ? `TE krever ikke ${KRAVET[n]}`
        : `partene er enige om svaret på kravet om ${KRAVET[n]}`
  );
  return `Kravene i saken er avgjort: ${grunnlag}, ${krav.join(' og ')}.`;
}

export function forutsetninger(h: Handlingsnoekkel, part: Part, u: Utledning): Avvisning | null {
  // MM-U2: en sak kjernen ikke forstår, tar ikke imot bindende kommandoer fra noen part.
  if (!u.forstaatt)
    return avvis('SAK_IKKE_FORSTAATT', 'Saken har hendelser denne versjonen ikke kan tolke.');
  const eier = PART[h.type];
  if (eier !== null && eier !== part) return avvis('FEIL_PART', `Bare ${eier} kan gjøre dette.`);
  if ('gjelder' in h) return henvisning(h, part, u);
  // SK-01, #213: når partene er enige om at grunnlaget er avvist, faller kravene.
  if (u.grunnlagAvvist)
    return avvis('GRUNNLAG_AVVIST', 'Partene er enige om at grunnlaget er avvist (SK-01).');
  // KA-U11: når kravene er avgjort, avvises det som kan endre utfallet.
  if (kraveneErAvgjort(u)) return avvis('KRAVENE_AVGJORT', hvorforAvgjort(u));

  const s = u.spor[h.spor];
  const grunnlagSendt = u.spor.grunnlag.gjeldendeKrav !== null;
  switch (h.type) {
    case 'krav':
      // Vedtaket om trukket krav 05.10, GR-U5.
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket og kan ikke tas opp igjen.');
      // KA-U12: «ingen krav» lukker sporet på samme måte som et trekk.
      if (s.ingenKrav)
        return avvis('INGEN_KRAV_I_SPORET', 'TE har sagt at det ikke kreves noe i sporet.');
      // KA-U7, GR-U10: en enighet binder begge parter.
      if (s.enighet)
        return avvis('ENIGHET_I_SPORET', 'Partene er enige om svaret. Kravet kan ikke endres.');
      if (h.spor !== 'grunnlag' && !grunnlagSendt)
        return avvis('GRUNNLAG_IKKE_SENDT', 'Grunnlaget må være sendt før du kan sende krav.');
      return null;
    case 'trekke':
      if (!s.gjeldendeKrav) return avvis('INGEN_KRAV', `Det er ikke sendt noe krav om ${h.spor}.`);
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er allerede trukket.');
      // KA-U13, OV-U6: en endringsordre sendt fra appen leses ellers som bortfalt (KA-U6).
      if (h.spor === 'grunnlag' && trekkAvGrunnlagetErSperret(u))
        return avvis(
          'GRUNNLAG_ER_ENDRINGSORDRE',
          'Byggherren har godkjent grunnlaget, og godkjenningen er en endringsordre. Grunnlaget kan ikke trekkes.'
        );
      // KA-U22: et avtalt fradrag (KA-U9) avvises av formatet, og sperren bygges med det. En
      // merking av et registrert brev gir ingen sperre (OV-U4, OV-U7).
      return null;
    case 'ingen_krav':
      // KA-U12, KA-U15: et spor som ikke er sendt, etter at grunnlaget er sendt.
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (s.ingenKrav)
        return avvis(
          'INGEN_KRAV_I_SPORET',
          'TE har allerede sagt at det ikke kreves noe i sporet.'
        );
      if (s.krav.length)
        return avvis('KRAV_I_SPORET', 'Det er sendt krav i sporet. Trekk kravet i stedet.');
      if (!grunnlagSendt)
        return avvis('GRUNNLAG_IKKE_SENDT', 'Grunnlaget må være sendt før du kan si «ingen krav».');
      return null;
    case 'varsle':
    case 'sende_varsel':
      if (!grunnlagSendt)
        return avvis('GRUNNLAG_IKKE_SENDT', 'Grunnlaget må være sendt før du kan varsle.');
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (s.ingenKrav)
        return avvis('INGEN_KRAV_I_SPORET', 'TE har sagt at det ikke kreves fristforlengelse.');
      // SK-12 og MM-U1: et registrert varsel kan ikke flyttes. Et utledet varsel er ikke registrert.
      if (s.varsel)
        return avvis('VARSEL_REGISTRERT', 'Varselet er registrert og kan ikke flyttes (SK-12).');
      // VS-U16: etter et fristkrav kan varselet fra appen bare få en senere dato enn
      // kravet. Et varsel sendt tidligere utenfor appen registreres (MM-U8).
      if (h.type === 'sende_varsel' && s.krav.length)
        return avvis(
          'FRISTKRAV_SENDT',
          'Fristkravet er sendt, så et varsel fra appen kommer etter det. Et varsel sendt tidligere utenfor appen kan registreres med sin dato.'
        );
      return null;
    case 'svare':
      if (!s.gjeldendeKrav) return avvis('INGEN_KRAV', `Det er ikke sendt noe krav om ${h.spor}.`);
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (s.gjeldendeSvar)
        return avvis('ALLEREDE_SVART', 'Du har allerede svart på denne versjonen. Revider svaret.');
      return null;
    case 'revidere':
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (!s.gjeldendeSvar)
        return avvis('INGEN_SVAR', 'Det finnes ikke noe svar på gjeldende krav å revidere.');
      // SK-03, GR-U7, GR-U10: en enighet binder byggherren, også ved sammenfall.
      if (s.enighet)
        return avvis('ENIGHET_I_SPORET', 'Partene er enige om svaret. Det kan ikke revideres.');
      return null;
    case 'godta':
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (!s.gjeldendeSvar)
        return avvis('IKKE_GJELDENDE_SVAR', 'Aksepten må gjelde gjeldende svar i dette sporet.');
      // GR-U8, GR-U10: partene er alt enige, også når byggherren har godkjent hele kravet.
      if (s.enighet)
        return avvis('ENIGHET_I_SPORET', `Partene er allerede enige om svaret på ${h.spor}.`);
      // GR-U9: frafall er ikke enighet, og en aksept ville gjort frafallet til en enighet byggherren ikke kan revidere.
      if (h.spor === 'grunnlag' && u.frafalt)
        return avvis(
          'FRAFALL_KAN_IKKE_GODTAS',
          'Et frafall er byggherrens standpunkt og kan ikke godtas.'
        );
      return null;
  }
}
