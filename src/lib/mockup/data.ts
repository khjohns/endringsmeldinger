/**
 * UI-konstanter for mockup-appen.
 *
 * Kun spacing, ikoner og bestemmelser — ingen domenedata.
 * Domenedata kommer fra SakState via scenarios.ts.
 */
import { Scale, Banknote, Clock } from 'lucide-svelte';
import type { ComponentType } from 'svelte';
import type { SporKey } from './scenarios.js';
import { sporBestemmelser } from './utils.js';

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 };

export const TRACK_ICONS: Record<SporKey, ComponentType> = {
  ansvar: Scale,
  vederlag: Banknote,
  frist: Clock,
};

export { sporBestemmelser };
