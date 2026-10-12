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
  godkjenningenErMerket,
  kanFaaInnsigelse,
  kanFaaProtest,
  kraveneErAvgjort,
  trekkAvGrunnlagetErSperret,
  trekkKanIkkeBevareAvtalen,
  type Utledning,
} from '../utledning/utled.ts';
import type { Avvisning, Kravspor, Part, Spor } from '../typer.ts';

export type Handlingsnoekkel =
  | { type: 'krav' | 'trekke' | 'godta' | 'svare' | 'revidere'; spor: Spor }
  | { type: 'varsle' | 'sende_varsel'; spor: 'frist' }
  | { type: 'ingen_krav'; spor: Kravspor }
  | {
      type: 'bestride' | 'innsigelse' | 'protest' | 'passivitet' | 'merke' | 'avklare';
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
};

/**
 * Utsagnene uten virkning på utfallet som viser til et annet element: § 5, VS-U12
 * og KA-U20. Som bestridelsen (MM-U7) godtas de også når kravene er avgjort eller
 * avslaget av grunnlaget er godtatt (KA-U11, KA-U28, KA-U29).
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
      // KA-U20: et registrert brev med et krav eller svar.
      return maal?.registrertBrev
        ? null
        : avvis(
            'INGEN_REGISTRERT_BREV',
            'Merkingen må gjelde et registrert brev med et krav eller svar.'
          );
    case 'avklare': {
      // KA-U20: bare den som sendte brevet, kan avklare merkingen.
      const o = u.opplysninger.find((x) => x.opplysning.id === h.gjelder);
      if (o?.opplysning.hva !== 'kan_ikke_uttrykkes')
        return avvis('INGEN_MERKING', 'Det finnes ingen merking å avklare.');
      if (o.avklaring !== null) return avvis('MERKING_AVKLART', 'Merkingen er allerede avklart.');
      return u.elementer[o.opplysning.brev]?.part === part
        ? null
        : avvis('FEIL_PART', 'Bare den som sendte brevet, kan avklare merkingen.');
    }
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
  // KA-U6, MM-U7, GR-U3, EO-U2: når kravene er avgjort, kan ingen part endre utfallet.
  if (kraveneErAvgjort(u))
    return avvis(
      'KRAVENE_AVGJORT',
      'Grunnlaget er avklart, og hvert krav er avtalt eller trukket.'
    );

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
      // KA-U13: et trekk ville gitt journalen den videre virkningen at endringsordren
      // etter § 32.3 a leses som bortfalt (KA-U6). Er § 31.3 ikke avklart, eller er brevet med
      // godkjenningen merket (KA-U26), sperres det til det er avklart.
      if (h.spor === 'grunnlag' && trekkAvGrunnlagetErSperret(u))
        return u.endringsordre === 'ikke_avklart' || godkjenningenErMerket(u)
          ? avvis(
              'ENDRINGSORDRE_IKKE_AVKLART',
              'Det er ikke avklart om byggherrens godkjenning er en endringsordre: om brevet oppfyller § 31.3, eller om det har noe appen ikke kan uttrykke. Det må avklares før grunnlaget kan trekkes.'
            )
          : avvis(
              'GRUNNLAG_ER_ENDRINGSORDRE',
              'Byggherren har godkjent grunnlaget, og godkjenningen er en endringsordre. Grunnlaget kan ikke trekkes.'
            );
      // KA-U22: trekket kunne tatt fra byggherren en rettighet etter avtalen.
      if (trekkKanIkkeBevareAvtalen(u, h.spor))
        return avvis(
          'AVTALE_KAN_IKKE_BEVARES',
          'En enighet trekket rammer, bygger på et brev med noe appen ikke kan uttrykke. Appen kan ikke bevare byggherrens rettigheter etter avtalen, så trekket må sendes utenfor appen.'
        );
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
      // SK-12 og MM-U1: et registrert varsel er låst. Et utledet varsel er ikke registrert.
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
      // SK-03, GR-U7, GR-U10: en enighet låser svaret, også ved sammenfall.
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
      // GR-U9: frafall er ikke enighet, og en aksept ville låst frafallet for revisjon.
      if (h.spor === 'grunnlag' && u.frafalt)
        return avvis(
          'FRAFALL_KAN_IKKE_GODTAS',
          'Et frafall er byggherrens standpunkt og kan ikke godtas.'
        );
      // KA-U16, KA-U20: aksepten ville bygget på et brev med noe appen ikke kan uttrykke.
      if (s.forbehold)
        return avvis(
          'BREV_MED_FORBEHOLD',
          'Svaret bygger på et brev med noe appen ikke kan uttrykke. Den som sendte det, må avklare det først.'
        );
      // MM-U8: en preklusjon som gjaldt et annet varsel enn det registrerte, er uavklart.
      if (u.svar[s.gjeldendeSvar.id].uavklart.length)
        return avvis(
          'STANDPUNKT_UAVKLART',
          'Et standpunkt i svaret er uavklart. Byggherren må ta stilling først.'
        );
      return null;
  }
}
