/**
 * Byggherrens handlinger på et fristkrav uten antall dager, NS 8407:2011 § 5 og § 33.6.2.
 *
 * Vedtak om nøytralt fristvarsel, hovedplanen 3.1 (23.09): innsigelse og
 * forespørsel er egne handlinger. Et svar med dager og resultat venter til
 * kravet er spesifisert (§ 33.7). Serveren håndhever reglene; funksjonene her
 * styrer skjemaet.
 */

import type { FristTilstand } from '../types/timeline';

export type FristVarselHandling = 'innsigelse' | 'foresporsel';

type Frist = Pick<
  FristTilstand,
  'krevd_dager' | 'frist_varsel_ok' | 'foresporsel_krav_id' | 'krav_event_id'
>;

export function kravetErSpesifisert(frist: Pick<FristTilstand, 'krevd_dager'>): boolean {
  return frist.krevd_dager != null;
}

export function foresporselVenterSvar(frist: Frist): boolean {
  return Boolean(frist.foresporsel_krav_id) && frist.foresporsel_krav_id === frist.krav_event_id;
}

export function tilgjengeligeHandlinger(frist: Frist): Record<FristVarselHandling, boolean> {
  return {
    innsigelse: frist.frist_varsel_ok !== false,
    foresporsel: !foresporselVenterSvar(frist),
  };
}

export function eventTypeFor(
  handling: FristVarselHandling
): 'frist_innsigelse_sendt' | 'frist_foresporsel_sendt' {
  return handling === 'innsigelse' ? 'frist_innsigelse_sendt' : 'frist_foresporsel_sendt';
}

/** § 5 tredje ledd: innsigelsen må være skriftlig og komme uten ugrunnet opphold. */
export function innsigelseTekst(varselDato?: string): string {
  const varsel = varselDato
    ? `varselet om fristforlengelse datert ${varselDato}`
    : 'varselet om fristforlengelse';
  return (
    `Byggherren gjør gjeldende at ${varsel} ikke er gitt uten ugrunnet opphold, ` +
    'jf. NS 8407 § 33.4 og § 5 tredje ledd. Krav på fristforlengelse tapes ' +
    'dersom det ikke varsles innen fristen (§ 33.4 annet ledd).'
  );
}

/**
 * § 33.6.2 første ledd: forespørselen skal gi beskjed om at manglende svar fører
 * til at kravet tapes, og angi at TE eventuelt skal begrunne hvorfor grunnlaget
 * for å beregne kravet ikke foreligger.
 */
export function foresporselTekst(svarfrist?: string): string {
  return [
    'Byggherren ber totalentreprenøren angi og begrunne det antall dager som kreves ' +
      'som fristforlengelse, jf. NS 8407 § 33.6.2 første ledd.',
    'Totalentreprenøren skal uten ugrunnet opphold enten a) angi og begrunne det antall ' +
      'dager som kreves, eller b) begrunne hvorfor grunnlaget for å beregne kravet ikke ' +
      'foreligger.' +
      (svarfrist ? ` Byggherren ber om svar innen ${svarfrist}.` : ''),
    'Gjør totalentreprenøren ingen av delene, tapes kravet på fristforlengelse ' +
      '(§ 33.6.2 tredje ledd).',
  ].join(' ');
}

export function buildEventData(
  handling: FristVarselHandling,
  input: {
    fristKravId: string;
    tillegg: string;
    varselDato?: string;
    svarfrist?: string;
    svarfristVist?: string;
  }
): { frist_krav_id: string; begrunnelse: string; svarfrist?: string } {
  const fast =
    handling === 'innsigelse'
      ? innsigelseTekst(input.varselDato)
      : foresporselTekst(input.svarfristVist ?? input.svarfrist);
  const tillegg = input.tillegg.replace(/<[^>]*>/g, '').trim() ? input.tillegg : '';
  return {
    frist_krav_id: input.fristKravId,
    begrunnelse: `<p>${fast}</p>${tillegg}`,
    ...(handling === 'foresporsel' && input.svarfrist ? { svarfrist: input.svarfrist } : {}),
  };
}
