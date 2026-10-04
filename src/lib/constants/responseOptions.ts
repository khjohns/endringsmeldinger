/**
 * BH Response Options for all three tracks (Kontraktsforhold, Vederlag, Frist)
 * Based on NS 8407 Norwegian Standard Building Contract
 *
 * CRITICAL: Refactored to support subsidiary logic.
 * Vederlag and Frist responses NO LONGER contain "avslatt_uenig_grunnlag" -
 * that would break the separation of tracks.
 */

import type { DropdownOption } from './categories';
import type { SubsidiaerTrigger } from '../types/timeline';

// ========== GRUNNLAG RESPONSE OPTIONS ==========

/** Short UI labels for grunnlag response results */
export const GRUNNLAG_RESULTAT_LABELS: Record<string, string> = {
  godkjent: 'Godkjent',
  avslatt: 'Avslått',
  frafalt: 'Frafalt',
};

export const BH_GRUNNLAGSVAR_OPTIONS: DropdownOption[] = [
  { value: '', label: '— Velg —' },
  { value: 'godkjent', label: 'Godkjent' },
  { value: 'avslatt', label: 'Avslått' },
  { value: 'frafalt', label: 'Frafall pålegget' },
];

// ========== VEDERLAG RESPONSE OPTIONS ==========
// Forenklet til tre hovedkategorier - årsak til avslag fanges av subsidiaer_triggers

export const BH_VEDERLAGSSVAR_OPTIONS: DropdownOption[] = [
  { value: '', label: '— Velg —' },
  {
    value: 'godkjent',
    label: 'Godkjent - Enighet om sum og metode',
  },
  {
    value: 'delvis_godkjent',
    label: 'Delvis godkjent - Uenighet om beløp eller metode',
  },
  {
    value: 'avslatt',
    label: 'Avslått - BH avviser kravet',
  },
  {
    value: 'hold_tilbake',
    label: 'Hold tilbake betaling (§30.2) - Krev overslag for regningsarbeid',
  },
];

// ========== FRIST RESPONSE OPTIONS ==========
// Forenklet til tre hovedkategorier - årsak til avslag fanges av subsidiaer_triggers

export const BH_FRISTSVAR_OPTIONS: DropdownOption[] = [
  { value: '', label: '— Velg —' },
  {
    value: 'godkjent',
    label: 'Godkjent - Enighet om antall dager',
  },
  {
    value: 'delvis_godkjent',
    label: 'Delvis godkjent - Uenighet om antall dager',
  },
  {
    value: 'avslatt',
    label: 'Avslått - BH avviser kravet',
  },
];

// ========== SUBSIDIÆR TRIGGER LABELS ==========

export const SUBSIDIAER_TRIGGER_LABELS: Record<SubsidiaerTrigger, string> = {
  grunnlag_avslatt: 'Kontraktsforhold avslått av BH',
  grunnlag_prekludert_32_2: 'Grunnlag prekludert (§32.2) - varslet for sent',
  forseringsrett_avslatt: 'Ingen forseringsrett (§33.8)',
  preklusjon_hovedkrav: 'Hovedkrav prekludert (§34.1.2)',
  preklusjon_rigg: 'Rigg/drift prekludert (§34.1.3)',
  preklusjon_produktivitet: 'Produktivitet prekludert (§34.1.3)',
  reduksjon_ep_justering: 'EP-justering begrenset (§34.3.3) - varslet for sent',
  preklusjon_varsel: 'Varsel om fristforlengelse prekludert (§33.4)',
  reduksjon_spesifisert: 'Spesifisert krav begrenset (§33.6) - varslet for sent',
  ingen_hindring: 'Ingen reell fremdriftshindring (§33.5)',
  metode_avslatt: 'Metode ikke akseptert',
};
