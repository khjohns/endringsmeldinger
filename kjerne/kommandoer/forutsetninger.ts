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
  enighetenOmfatter,
  fristkravErFremmet,
  kanFaaInnsigelse,
  kraveneErAvgjort,
  trekkAvGrunnlagetErSperret,
  varAvgjort,
  type Utledning,
} from '../utledning/utled.ts';
import {
  KRAVSPOR,
  type Avvisning,
  type Kravspor,
  type Part,
  type Spor,
  type Varselhjemmel,
} from '../typer.ts';

export type Handlingsnoekkel =
  | { type: 'krav' | 'trekke' | 'godta' | 'svare' | 'revidere'; spor: Spor }
  | { type: 'varsle' | 'sende_varsel'; spor: Kravspor }
  /** Det særskilte varselet etter § 34.1.3 tredje ledd, ved siden av varselet i sporet (OV-U25). */
  | { type: 'varsle' | 'sende_varsel'; spor: 'vederlag'; hjemmel: '34.1.3' }
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
const VARSEL_I_SPORET: Record<Kravspor, Varselhjemmel> = { frist: '33.4', vederlag: '34.1.2' };

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
  passivitet: null,
  svare: 'BH',
  revidere: 'BH',
  bestride: null,
  innsigelse: null,
  protest: null,
  merke: null,
  avklare: null,
  begrunne: null,
};

/**
 * Utsagnene uten virkning på utfallet som viser til et annet element. Innsigelsen
 * etter § 5 godtas også når kravene er avgjort eller avslaget av grunnlaget er
 * godtatt (KA-U11, KA-U29). De andre er utsatt etter OV-U7 og avvises for begge
 * parter.
 */
function henvisning(h: Extract<Handlingsnoekkel, { gjelder: string }>, part: Part, u: Utledning) {
  const maal = u.elementer[h.gjelder];
  switch (h.type) {
    case 'innsigelse': {
      // VS-U1, VS-U14: et varsel, krav eller svar fra motparten.
      if (!kanFaaInnsigelse(maal, part))
        return avvis(
          'UGYLDIG_INNSIGELSE',
          'Innsigelsen må gjelde et varsel, et krav eller et svar fra motparten.'
        );
      // OV-U65, OV-U66, OV-U67: ikke mot det en enighet omfatter. Sperren gjelder bare den nye
      // innsigelsen; en innsigelse som alt står i journalen, beholder sin virkning (OV-U67 punkt 3).
      const spor = enighetenOmfatter(u, h.gjelder);
      return spor
        ? avvis(
            'ENIGHETEN_OMFATTER',
            `Partene er enige om ${SPORET[spor]}, og enigheten omfatter det innsigelsen gjelder.`
          )
        : null;
    }
    case 'svare_paa_foresporsel': {
      // VS-U27: en forespørsel fra appen. KA-U1: én begrunnelse, og ikke etter at et krav har svart.
      const f = u.spor.frist.foresporsler.find((x) => x.foresporsel === h.gjelder);
      if (!f)
        return avvis(
          'INGEN_FORESPORSEL',
          'Begrunnelsen må gjelde en forespørsel etter § 33.6.2 fra byggherren.'
        );
      if (f.svar !== null)
        return avvis('FORESPORSEL_BESVART', 'Forespørselen er allerede besvart.');
      return fristenErLukket(u);
    }
    case 'bestride':
    case 'merke':
    case 'avklare':
    case 'protest':
    case 'passivitet':
    case 'begrunne':
      // OV-U7: bestridelsen (MM-U7, MM-U14), merkingen etter KA-U20 og avklaringen av
      // den, protesten mot en innsigelse (VS-U1, VS-U9), påberopt passivitet (VS-U12)
      // og den senere begrunnelsen (KA-U34) bygges ikke i første versjon.
      return avvis(
        'IKKE_I_FOERSTE_VERSJON',
        'Bestridelse, merking, avklaring, protest, påberopt passivitet og senere begrunnelse er ikke med i første versjon. Brevet kan registreres som dokumentasjon.'
      );
  }
}

/** Et utsagn i fristen som ikke er et krav, når sporet er lukket (SK-01, OV-U3, GR-U5, KA-U12). */
function fristenErLukket(u: Utledning): Avvisning | null {
  if (u.grunnlagAvvist)
    return avvis('GRUNNLAG_AVVIST', 'Partene er enige om at grunnlaget er avvist (SK-01).');
  if (varAvgjort(u, 'frist')) return avvis('KRAVENE_AVGJORT', hvorforAvgjort(u));
  if (u.spor.frist.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
  if (u.spor.frist.ingenKrav)
    return avvis('INGEN_KRAV_I_SPORET', 'TE har sagt at det ikke kreves fristforlengelse.');
  return null;
}

export const avvis = (regel: string, melding: string): Avvisning => ({ regel, melding });

/** Sporet enigheten er inngått i, i meldingen om sperren (OV-U65). */
const SPORET: Record<Spor, string> = {
  grunnlag: 'svaret på grunnlaget',
  vederlag: 'svaret på kravet om justering av vederlaget',
  frist: 'svaret på kravet om fristforlengelse',
};

const KRAVET: Record<Kravspor, string> = {
  vederlag: 'justering av vederlaget',
  frist: 'fristforlengelse',
};

/** Hvordan grunnlaget og hvert krav som var sendt, ble avgjort i denne saken (OV-U3). */
function hvorforAvgjort(u: Utledning): string {
  const grunnlag = u.frafalt
    ? 'byggherren har frafalt pålegget'
    : 'byggherren har godkjent grunnlaget';
  const krav = KRAVSPOR.filter((n) => varAvgjort(u, n)).map((n) =>
    u.spor[n].trukket
      ? `kravet om ${KRAVET[n]} er trukket`
      : u.spor[n].ingenKrav
        ? `TE krever ikke ${KRAVET[n]}`
        : `partene er enige om svaret på kravet om ${KRAVET[n]}`
  );
  const hva = kraveneErAvgjort(u)
    ? 'Alle krav sendt i appen er avgjort'
    : 'Kravene som var sendt, ble avgjort';
  return `${hva}: ${[grunnlag, krav.join(' og ')].filter(Boolean).join(', ')}.`;
}

export function forutsetninger(h: Handlingsnoekkel, part: Part, u: Utledning): Avvisning | null {
  // OV-U4: hver side registrerer sine egne brev som dokumentasjon, uten virkning, også når
  // saken ikke er forstått, når kravene er avgjort, etter godtatt avslag og etter trekk.
  if (h.type === 'registrere_brev') return null;
  // MM-U2: en sak kjernen ikke forstår, tar ikke imot bindende kommandoer fra noen part.
  if (!u.forstaatt)
    return avvis('SAK_IKKE_FORSTAATT', 'Saken har hendelser denne versjonen ikke kan tolke.');
  const eier = PART[h.type];
  if (eier !== null && eier !== part) return avvis('FEIL_PART', `Bare ${eier} kan gjøre dette.`);
  if ('gjelder' in h) return henvisning(h, part, u);
  // SK-01, #213: når partene er enige om at grunnlaget er avvist, faller kravene.
  if (u.grunnlagAvvist)
    return avvis('GRUNNLAG_AVVIST', 'Partene er enige om at grunnlaget er avvist (SK-01).');
  // OV-U3: det som kan endre utfallet for grunnlaget og kravene som var sendt da kravene
  // var avgjort, avvises. I et spor uten krav godtas varselet og det første kravet, og TEs
  // opplysning om varseldato godtas alltid (OV-U5).
  if (h.type !== 'varsle' && h.type !== 'sende_varsel' && varAvgjort(u, h.spor))
    return avvis('KRAVENE_AVGJORT', hvorforAvgjort(u));

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
        return avvis('INGEN_KRAV_I_SPORET', `TE har sagt at det ikke kreves ${KRAVET[h.spor]}.`);
      // SK-12 og MM-U1: et registrert varsel kan ikke flyttes. Et utledet varsel er ikke registrert.
      if (s.varsler['hjemmel' in h ? h.hjemmel : VARSEL_I_SPORET[h.spor]])
        return avvis('VARSEL_REGISTRERT', 'Varselet er registrert og kan ikke flyttes (SK-12).');
      // OV-U8: det særskilte varselet etter § 34.1.3 kan sendes også etter vederlagskravet,
      // men ikke fra appen etter at kravene som var sendt, er avgjort (OV-U3). TEs opplysning
      // om et varsel sendt utenfor appen godtas (OV-U5).
      if ('hjemmel' in h)
        return h.type === 'sende_varsel' && varAvgjort(u, h.spor)
          ? avvis('KRAVENE_AVGJORT', hvorforAvgjort(u))
          : null;
      // VS-U16, OV-U5: etter kravet i sporet kan varselet fra appen bare få en senere dato
      // enn kravet. Et varsel sendt tidligere utenfor appen registreres (MM-U8).
      if (h.type === 'sende_varsel' && s.krav.length) {
        const sendt =
          'er sendt, så et varsel fra appen kommer etter det. Et varsel sendt tidligere utenfor appen kan registreres med sin dato.';
        return h.spor === 'vederlag'
          ? avvis('VEDERLAGSKRAV_SENDT', `Vederlagskravet ${sendt}`)
          : avvis('FRISTKRAV_SENDT', `Fristkravet ${sendt}`);
      }
      return null;
    case 'sende_foresporsel':
      if (!grunnlagSendt)
        return avvis(
          'GRUNNLAG_IKKE_SENDT',
          'Grunnlaget må være sendt før du kan sende forespørselen.'
        );
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (s.ingenKrav)
        return avvis('INGEN_KRAV_I_SPORET', 'TE har sagt at det ikke kreves fristforlengelse.');
      // VS-U19, VS-U33: fra appen så lenge TE ikke har krevd dager i appen.
      if (fristkravErFremmet(u))
        return avvis(
          'FRISTKRAV_SENDT',
          'TE har krevd dager i appen, så forespørselen etter § 33.6.2 kan ikke sendes.'
        );
      // VS-U30: ingen ny forespørsel fra appen etter TEs begrunnelse etter annet ledd b.
      if (s.foresporsler.some((f) => f.svar !== null && !f.medKrav))
        return avvis(
          'FORESPORSEL_BEGRUNNET',
          'TE har svart på en forespørsel med en begrunnelse etter § 33.6.2 annet ledd b, så en ny forespørsel kan ikke sendes fra appen.'
        );
      // VS-U31: høyst én forespørsel fra appen i saken. En registrert forespørsel gjør saken
      // uforstått (format/leser.ts); et brev registrert som dokumentasjon teller ikke (OV-U4).
      if (s.foresporsler.length)
        return avvis(
          'FORESPORSEL_SENDT',
          'Forespørselen etter § 33.6.2 er alt sendt fra appen. En ny forespørsel sendes utenfor appen.'
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
