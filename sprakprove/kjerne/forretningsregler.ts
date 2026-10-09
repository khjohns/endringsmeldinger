/**
 * Forretningsreglene for kommandoene i flyten. Regelkodene er de samme som i
 * `services/business_rules.py`, fordi de er en del av API-et. Reglene leser
 * bare saken og hendelsen; serverens utregning (B-13) står sist.
 */

import { UgyldigVurdering } from './regler/feil.ts';
import { Avvik, FeilRegelversjon, kontrollerSvar } from './sammenlikning.ts';
import {
  erEnighet,
  gjeldendeSvar,
  grunnlagetErAvklart,
  grunnlagetErLaast,
  samletStatus,
  teHarAkseptert,
  type Sak,
} from './sak.ts';
import type { Hendelse, Hendelsestype, Spor } from './typer.ts';

export interface Avvisning {
  regel: string;
  melding: string;
}

type Regel = (h: Hendelse, sak: Sak) => Avvisning | null;

const avvis = (regel: string, melding: string): Avvisning => ({ regel, melding });

const TE_HENDELSER = new Set<Hendelsestype>([
  'grunnlag_opprettet',
  'grunnlag_oppdatert',
  'vederlag_krav_sendt',
  'vederlag_krav_oppdatert',
  'frist_krav_sendt',
  'te_aksepterer_respons',
]);

export const SVARSPOR: Partial<Record<Hendelsestype, Spor>> = {
  respons_grunnlag: 'grunnlag',
  respons_vederlag: 'vederlag',
  respons_vederlag_oppdatert: 'vederlag',
  respons_frist: 'frist',
};

const KRAVREFERANSE: Record<Spor, string> = {
  grunnlag: 'grunnlag_event_id',
  vederlag: 'vederlag_krav_id',
  frist: 'frist_krav_id',
};

const rolle: Regel = (h) => {
  if (TE_HENDELSER.has(h.event_type) && h.aktor_rolle !== 'TE')
    return avvis('ROLE_CHECK', 'Kun TE kan utføre denne handlingen');
  if (SVARSPOR[h.event_type] && h.aktor_rolle !== 'BH')
    return avvis('ROLE_CHECK', 'Kun BH kan utføre denne handlingen');
  return null;
};

const sakIkkeLukket: Regel = (_h, sak) =>
  ['OMFORENT', 'LUKKET_TRUKKET', 'LUKKET_AVSLATT'].includes(samletStatus(sak))
    ? avvis('CASE_NOT_CLOSED', 'Saken er lukket og kan ikke endres')
    : null;

const opprettesEnGang: Regel = (h, sak) => {
  const spor = (
    {
      grunnlag_opprettet: 'grunnlag',
      vederlag_krav_sendt: 'vederlag',
      frist_krav_sendt: 'frist',
    } as const
  )[h.event_type as 'grunnlag_opprettet'];
  return spor && sak[spor].krav
    ? avvis('CREATE_ONCE', 'Sporet er allerede opprettet. Send en revisjon.')
    : null;
};

const svarreferanse: Regel = (h, sak) => {
  const navn = SVARSPOR[h.event_type];
  if (!navn) return null;
  const spor = sak[navn];
  const referanser = [h.refererer_til_event_id, h.data[KRAVREFERANSE[navn]]].filter((r) => r);
  const original = h.data.original_respons_id;
  if (original && original !== gjeldendeSvar(spor)?.eventId) {
    return avvis('RESPONSE_REFERENCE', 'Svaret er endret eller gjelder et tidligere krav.');
  }
  if (referanser.some((r) => r !== spor.krav?.eventId)) {
    return avvis('RESPONSE_REFERENCE', 'Svaret må gjelde gjeldende krav i dette sporet.');
  }
  if (spor.krav && !referanser.length && !original) {
    return avvis('RESPONSE_REFERENCE', 'Referanse til kravet som besvares mangler.');
  }
  return null;
};

const grunnlagKreves: Regel = (_h, sak) =>
  sak.grunnlag.krav
    ? null
    : avvis('GRUNNLAG_REQUIRED', 'Grunnlag må være sendt før du kan sende krav');

const aktivtKrav =
  (navn: Spor): Regel =>
  (_h, sak) =>
    sak[navn].krav ? null : avvis('ACTIVE_CLAIM_EXISTS', `Ingen aktivt ${navn}skrav å oppdatere`);

const sporetSendt =
  (navn: Spor): Regel =>
  (_h, sak) =>
    sak[navn].krav ? null : avvis('TRACK_SENT', `Kan ikke besvare ${navn} som ikke er sendt`);

const ikkeLaast: Regel = (_h, sak) =>
  grunnlagetErLaast(sak) ? avvis('NOT_LOCKED', 'Grunnlag er låst og kan ikke endres') : null;

const ikkeBesvart =
  (navn: Spor): Regel =>
  (_h, sak) =>
    gjeldendeSvar(sak[navn])
      ? avvis(
          'NOT_ALREADY_RESPONDED',
          "Du har allerede svart på denne versjonen. Bruk 'Endre svar' for å oppdatere."
        )
      : null;

const forrigeSvar =
  (navn: Spor): Regel =>
  (_h, sak) =>
    gjeldendeSvar(sak[navn])
      ? null
      : avvis('PREVIOUS_RESPONSE', 'Ingen tidligere respons på gjeldende krav å revidere.');

/** SK-03 (vedtaket 05.10) og GR-U7: en enighet står. Byggherren kan ikke revidere et godtatt svar. */
const svaretErIkkeGodtatt =
  (navn: Spor): Regel =>
  (_h, sak) =>
    teHarAkseptert(sak[navn])
      ? avvis('RESPONSE_ACCEPTED', 'TE har godtatt svaret. Et godtatt svar kan ikke revideres.')
      : null;

const kravetErSpesifisert: Regel = (_h, sak) => {
  const krav = sak.frist.krav?.data;
  return krav && krav.varsel_type === 'spesifisert' && typeof krav.antall_dager === 'number'
    ? null
    : avvis('CLAIM_SPECIFIED', 'Fristkravet er ikke spesifisert med antall dager (§ 33.7).');
};

const byggherrenHarSvart: Regel = (h, sak) =>
  sak[h.data.spor as Spor].svar
    ? null
    : avvis('BH_HAS_RESPONDED', `Byggherre har ikke svart på ${h.data.spor} ennå`);

/** KA-U1, KT-U1: aksepten gjelder det gjeldende svaret i sporet. */
const gjeldendeSvarRegel: Regel = (h, sak) => {
  const gjeldende = gjeldendeSvar(sak[h.data.spor as Spor]);
  return gjeldende && h.refererer_til_event_id === gjeldende.eventId
    ? null
    : avvis('CURRENT_RESPONSE', 'Aksepten må gjelde gjeldende svar i dette sporet.');
};

/** GR-U7: er partene allerede enige, er det ikke noe å godta. */
const ikkeAlleredeEnige: Regel = (h, sak) => {
  const navn = h.data.spor as Spor;
  const enige =
    navn === 'grunnlag'
      ? teHarAkseptert(sak.grunnlag) || grunnlagetErAvklart(sak)
      : erEnighet(sak, navn);
  return enige
    ? avvis('NOT_ALREADY_ACCEPTED', `Partene er allerede enige om svaret på ${navn}`)
    : null;
};

/** B-13: serveren regner ut svaret og skriver sine verdier inn i hendelsen. Står sist. */
const serverensUtregning: Regel = (h, sak) => {
  try {
    const verdier = kontrollerSvar(SVARSPOR[h.event_type]!, h.data, sak);
    for (const [felt, verdi] of Object.entries(verdier)) {
      if (verdi === null) delete h.data[felt];
      else h.data[felt] = verdi;
    }
    return null;
  } catch (feil) {
    if (feil instanceof FeilRegelversjon) return avvis('RULE_VERSION', feil.message);
    if (feil instanceof UgyldigVurdering)
      return avvis('ASSESSMENT_INVALID', `Vurderingene kan ikke regnes ut: ${feil.message}.`);
    if (feil instanceof Avvik) return avvis('RESULT_MISMATCH', feil.message);
    throw feil;
  }
};

const FELLES: Regel[] = [rolle, sakIkkeLukket, opprettesEnGang, svarreferanse];

const SPESIFIKKE: Partial<Record<Hendelsestype, Regel[]>> = {
  vederlag_krav_sendt: [grunnlagKreves],
  vederlag_krav_oppdatert: [grunnlagKreves, aktivtKrav('vederlag')],
  frist_krav_sendt: [grunnlagKreves],
  grunnlag_oppdatert: [ikkeLaast],
  respons_grunnlag: [
    sporetSendt('grunnlag'),
    ikkeLaast,
    ikkeBesvart('grunnlag'),
    serverensUtregning,
  ],
  respons_vederlag: [sporetSendt('vederlag'), ikkeBesvart('vederlag'), serverensUtregning],
  respons_vederlag_oppdatert: [
    sporetSendt('vederlag'),
    forrigeSvar('vederlag'),
    svaretErIkkeGodtatt('vederlag'),
    serverensUtregning,
  ],
  respons_frist: [
    sporetSendt('frist'),
    kravetErSpesifisert,
    ikkeBesvart('frist'),
    serverensUtregning,
  ],
  te_aksepterer_respons: [byggherrenHarSvart, gjeldendeSvarRegel, ikkeAlleredeEnige],
};

/** Første brudd, eller `null`. Hendelsens `data` får serverens verdier når svaret holder. */
export function forstebrudd(h: Hendelse, sak: Sak): Avvisning | null {
  for (const regel of [...FELLES, ...(SPESIFIKKE[h.event_type] ?? [])]) {
    const brudd = regel(h, sak);
    if (brudd) return brudd;
  }
  return null;
}
