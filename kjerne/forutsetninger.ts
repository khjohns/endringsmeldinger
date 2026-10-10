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

import { kraveneErAvgjort, type Utledning } from './utled.ts';
import type { Avvisning, Part, Spor } from './typer.ts';

export type Handlingsnoekkel =
  | { type: 'krav' | 'trekke' | 'godta' | 'svare' | 'revidere'; spor: Spor }
  | { type: 'varsle'; spor: 'frist' }
  | { type: 'bestride'; gjelder: string };

export const noekkel = (h: Handlingsnoekkel): string =>
  h.type === 'bestride' ? `bestride:${h.gjelder}` : `${h.type}:${h.spor}`;

const PART: Record<Handlingsnoekkel['type'], Part | null> = {
  krav: 'TE',
  trekke: 'TE',
  godta: 'TE',
  varsle: 'TE',
  svare: 'BH',
  revidere: 'BH',
  bestride: null,
};

export const avvis = (regel: string, melding: string): Avvisning => ({ regel, melding });

export function forutsetninger(h: Handlingsnoekkel, part: Part, u: Utledning): Avvisning | null {
  // MM-U2: en sak kjernen ikke forstår, tar ikke imot bindende kommandoer fra noen part.
  if (!u.forstaatt)
    return avvis('SAK_IKKE_FORSTAATT', 'Saken har hendelser denne versjonen ikke kan tolke.');
  const eier = PART[h.type];
  if (eier !== null && eier !== part) return avvis('FEIL_PART', `Bare ${eier} kan gjøre dette.`);
  // MM-U7: en bestridelse endrer ikke noe utfall og kan registreres når som helst.
  if (h.type === 'bestride') {
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
      // etter § 32.3 a leses som bortfalt (KA-U6). Er § 31.3 ikke avklart, sperres det til det er.
      if (h.spor === 'grunnlag' && u.trekkAvGrunnlagetErSperret)
        return u.endringsordre === 'ikke_avklart'
          ? avvis(
              'ENDRINGSORDRE_IKKE_AVKLART',
              'Det er ikke avklart om byggherrens godkjenning er en endringsordre etter § 31.3. Det må avklares før grunnlaget kan trekkes.'
            )
          : avvis(
              'GRUNNLAG_ER_ENDRINGSORDRE',
              'Byggherren har godkjent grunnlaget, og godkjenningen er en endringsordre. Grunnlaget kan ikke trekkes.'
            );
      return null;
    case 'varsle':
      if (!grunnlagSendt)
        return avvis('GRUNNLAG_IKKE_SENDT', 'Grunnlaget må være sendt før du kan varsle.');
      if (s.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      if (s.ingenKrav)
        return avvis('INGEN_KRAV_I_SPORET', 'TE har sagt at det ikke kreves fristforlengelse.');
      // SK-12 og MM-U1: et registrert varsel er låst. Et utledet varsel er ikke registrert.
      if (s.varsel)
        return avvis('VARSEL_REGISTRERT', 'Varselet er registrert og kan ikke flyttes (SK-12).');
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
      // MM-U8: en preklusjon som gjaldt et annet varsel enn det registrerte, er uavklart.
      if (u.svar[s.gjeldendeSvar.id].uavklart.length)
        return avvis(
          'STANDPUNKT_UAVKLART',
          'Et standpunkt i svaret er uavklart. Byggherren må ta stilling først.'
        );
      return null;
  }
}
