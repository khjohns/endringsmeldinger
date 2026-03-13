/**
 * Event type filter helpers.
 * Matches both short-form ('frist_krav_sendt') and
 * fully-qualified ('no.oslo.koe.frist_krav_sendt') event types.
 */

const FRIST_KRAV_EVENT_TYPES = [
  'frist_krav_sendt',
  'no.oslo.koe.frist_krav_sendt',
  'frist_krav_spesifisert',
  'no.oslo.koe.frist_krav_spesifisert',
] as const;

const FRIST_KRAV_SENDT_TYPES = ['frist_krav_sendt', 'no.oslo.koe.frist_krav_sendt'] as const;

const GRUNNLAG_EVENT_TYPES = ['grunnlag_opprettet', 'no.oslo.koe.grunnlag_opprettet'] as const;

const VEDERLAG_KRAV_EVENT_TYPES = [
  'vederlag_krav_sendt',
  'no.oslo.koe.vederlag_krav_sendt',
] as const;

export function isFristKravEvent(type: string): boolean {
  return (FRIST_KRAV_EVENT_TYPES as readonly string[]).includes(type);
}

export function isFristKravSendtEvent(type: string): boolean {
  return (FRIST_KRAV_SENDT_TYPES as readonly string[]).includes(type);
}

export function isGrunnlagEvent(type: string): boolean {
  return (GRUNNLAG_EVENT_TYPES as readonly string[]).includes(type);
}

export function isVederlagKravEvent(type: string): boolean {
  return (VEDERLAG_KRAV_EVENT_TYPES as readonly string[]).includes(type);
}

export function isResponsFristEvent(type: string): boolean {
  return type.includes('respons_frist');
}

export function isResponsVederlagEvent(type: string): boolean {
  return type.includes('respons_vederlag');
}

export function isResponsGrunnlagEvent(type: string): boolean {
  return type.includes('respons_grunnlag');
}
