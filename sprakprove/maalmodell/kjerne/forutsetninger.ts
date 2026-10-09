/**
 * Forutsetningene for en kommando: det som bare avhenger av utledningen og
 * parten, ikke av nyttelasten (2.6 i modellforslaget). Regelkodene er de
 * API-et har i dag der regelen finnes. `CASE_CLOSED` erstatter
 * `CASE_NOT_CLOSED`, som leste samlet status.
 *
 * `handlinger.ts` uttrykker de samme predikatene som tilbud. At de to er like,
 * prøves over de genererte forløpene (INV-MM-1).
 */

import type { Utledning } from './utled.ts';
import type { Avvisning, Part, Spor } from './typer.ts';

export type Handlingsnokkel =
  | { type: 'krav' | 'trekke' | 'godta' | 'svare' | 'revidere'; spor: Spor }
  | { type: 'varsle'; spor: 'frist' }
  | { type: 'bestride'; gjelder: string };

export const nokkel = (h: Handlingsnokkel): string =>
  h.type === 'bestride' ? `bestride:${h.gjelder}` : `${h.type}:${h.spor}`;

const PART: Record<Handlingsnokkel['type'], Part | null> = {
  krav: 'TE',
  trekke: 'TE',
  godta: 'TE',
  varsle: 'TE',
  svare: 'BH',
  revidere: 'BH',
  bestride: null,
};

export const avvis = (regel: string, melding: string): Avvisning => ({ regel, melding });

export function forutsetninger(h: Handlingsnokkel, part: Part, u: Utledning): Avvisning | null {
  // MM-U2: en sak kjernen ikke forstår, tar ikke imot bindende kommandoer fra noen part.
  if (!u.forstatt)
    return avvis('CASE_NOT_UNDERSTOOD', 'Saken har hendelser denne versjonen ikke kan tolke.');
  const eier = PART[h.type];
  if (eier !== null && eier !== part)
    return avvis('ROLE_CHECK', `Kun ${eier} kan utføre denne handlingen`);
  // MM-U7: en bestridelse endrer ikke noe utfall og kan registreres også i en avsluttet sak.
  if (h.type === 'bestride') {
    const o = u.opplysninger.find((x) => x.opplysning.id === h.gjelder);
    if (!o || o.opplysning.oppgittAv === part)
      return avvis('NOTHING_TO_DISPUTE', 'Det finnes ingen opplysning fra motparten å bestride.');
    if (o.bestridelser.some((b) => b.part === part))
      return avvis('NOTHING_TO_DISPUTE', 'Opplysningen er allerede bestridt.');
    return null;
  }
  if (u.avsluttet) return avvis('CASE_CLOSED', 'Saken er avsluttet og kan ikke endres');

  const s = u.spor[h.spor];
  const grunnlagSendt = u.spor.grunnlag.gjeldendeKrav !== null;
  switch (h.type) {
    case 'krav':
      if (s.trukket) return avvis('TRACK_WITHDRAWN', 'Kravet er trukket og kan ikke tas opp igjen');
      if (h.spor === 'grunnlag' && u.grunnlagLaast)
        return avvis('NOT_LOCKED', 'Grunnlag er låst og kan ikke endres');
      if (h.spor !== 'grunnlag' && !grunnlagSendt)
        return avvis('GRUNNLAG_REQUIRED', 'Grunnlag må være sendt før du kan sende krav');
      return null;
    case 'trekke':
      if (!s.gjeldendeKrav) return avvis('TRACK_SENT', `Ingen krav i ${h.spor} å trekke`);
      if (s.trukket) return avvis('TRACK_WITHDRAWN', 'Kravet er allerede trukket');
      return null;
    case 'varsle':
      if (!grunnlagSendt)
        return avvis('GRUNNLAG_REQUIRED', 'Grunnlag må være sendt før du kan varsle');
      if (s.trukket) return avvis('TRACK_WITHDRAWN', 'Kravet er trukket');
      // SK-12 og MM-U1: et registrert varsel er låst. Et utledet varsel er ikke registrert.
      if (s.varsel)
        return avvis('NOTICE_REGISTERED', 'Varselet er registrert og kan ikke flyttes (SK-12).');
      return null;
    case 'svare':
      if (!s.gjeldendeKrav)
        return avvis('TRACK_SENT', `Kan ikke besvare ${h.spor} som ikke er sendt`);
      if (s.trukket) return avvis('TRACK_WITHDRAWN', 'Kravet er trukket');
      if (s.gjeldendeSvar)
        return avvis(
          'NOT_ALREADY_RESPONDED',
          'Du har allerede svart på denne versjonen. Revider svaret.'
        );
      return null;
    case 'revidere':
      if (s.trukket) return avvis('TRACK_WITHDRAWN', 'Kravet er trukket');
      if (!s.gjeldendeSvar)
        return avvis('PREVIOUS_RESPONSE', 'Ingen tidligere respons på gjeldende krav å revidere.');
      // SK-03 og GR-U7: en enighet låser svaret, også et svar som godkjente hele kravet (#298).
      if (s.enighet)
        return avvis('RESPONSE_ACCEPTED', 'Partene er enige om svaret. Det kan ikke revideres.');
      return null;
    case 'godta':
      if (s.trukket) return avvis('TRACK_WITHDRAWN', 'Kravet er trukket');
      if (!s.gjeldendeSvar)
        return avvis('CURRENT_RESPONSE', 'Aksepten må gjelde gjeldende svar i dette sporet.');
      // GR-25 er en arbeidshypotese: foreløpig avvises en aksept når partene alt er enige,
      // også når byggherren har godkjent grunnlaget og det er låst (GR-U2).
      if (s.enighet || (h.spor === 'grunnlag' && u.grunnlagLaast))
        return avvis('NOT_ALREADY_ACCEPTED', `Partene er allerede enige om svaret på ${h.spor}`);
      // Frafall er ikke enighet. En aksept ville låst frafallet for revisjon (GR-U7); om den
      // skal godtas, er ikke avgjort, så den avvises foreløpig.
      if (h.spor === 'grunnlag' && u.frafalt)
        return avvis('WAIVER_NOT_ACCEPTABLE', 'Et frafall kan foreløpig ikke godtas.');
      // MM-U6: uten lagret beslutningsgrunnlag kan ikke avviket avgjøres, og aksepten avvises.
      if (u.svar[s.gjeldendeSvar.id].avvik === null)
        return avvis(
          'DECISION_BASIS_MISSING',
          'Svaret har ikke lagret beslutningsgrunnlag. Byggherren må svare på nytt.'
        );
      // MM-U4.
      if (u.svar[s.gjeldendeSvar.id].avvik === true)
        return avvis(
          'RESPONSE_DEVIATES',
          'Brevet avviker fra dagens utledning. Byggherren må svare på nytt.'
        );
      // Et uavklart standpunkt kan ikke fryses i et enighetsgrunnlag (MM-U1, MM-U3).
      if (u.svar[s.gjeldendeSvar.id].standpunkter.some((p) => p.virkning === 'uavklart'))
        return avvis(
          'RESPONSE_UNRESOLVED',
          'Et standpunkt i svaret er uavklart. Byggherren må ta stilling først.'
        );
      return null;
  }
}
