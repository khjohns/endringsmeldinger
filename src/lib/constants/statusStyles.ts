/**
 * Status Styles
 *
 * Centralized styling for status badges across the application.
 * Maps status values to Tailwind CSS classes for consistent display.
 */

import type { OverordnetStatus } from '../types/timeline';

/**
 * Badge variant types (matches Badge component variants)
 */
export type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Status style configuration
 */
interface StatusStyle {
  /** Badge variant for Badge component */
  variant: BadgeVariant;
  /** CSS classes for inline badge styling */
  className: string;
  /** Human-readable label */
  label: string;
}

/**
 * Overordnet (overall) status badge styles
 */
export const OVERORDNET_STATUS_STYLES: Record<OverordnetStatus, StatusStyle> = {
  UTKAST: {
    variant: 'default',
    className: 'bg-pkt-grays-gray-100 text-pkt-grays-gray-700',
    label: 'Utkast',
  },
  SENDT: {
    variant: 'warning',
    className: 'bg-badge-warning-bg text-badge-warning-text',
    label: 'Sendt',
  },
  VENTER_PAA_SVAR: {
    variant: 'warning',
    className: 'bg-badge-warning-bg text-badge-warning-text',
    label: 'Venter på svar',
  },
  UNDER_BEHANDLING: {
    variant: 'warning',
    className: 'bg-badge-warning-bg text-badge-warning-text',
    label: 'Under behandling',
  },
  UNDER_FORHANDLING: {
    variant: 'warning',
    className: 'bg-badge-warning-bg text-badge-warning-text',
    label: 'Under forhandling',
  },
  OMFORENT: {
    variant: 'success',
    className: 'bg-badge-success-bg text-badge-success-text',
    label: 'Omforent',
  },
  LUKKET: {
    variant: 'success',
    className: 'bg-badge-success-bg text-badge-success-text',
    label: 'Lukket',
  },
  LUKKET_TRUKKET: {
    variant: 'danger',
    className: 'bg-badge-error-bg text-badge-error-text',
    label: 'Trukket',
  },
  LUKKET_AVSLATT: {
    variant: 'default',
    className: 'bg-pkt-grays-gray-100 text-pkt-grays-gray-700',
    label: 'Avsluttet – avslag godtatt',
  },
};

/**
 * Get style for overordnet status
 */
export function getOverordnetStatusStyle(status: OverordnetStatus | string | null): StatusStyle {
  if (!status) {
    return {
      variant: 'default',
      className: 'bg-pkt-grays-gray-100 text-pkt-grays-gray-700',
      label: 'Ukjent',
    };
  }
  const upperStatus = status.toUpperCase() as OverordnetStatus;
  return (
    OVERORDNET_STATUS_STYLES[upperStatus] || {
      variant: 'info',
      className: 'bg-badge-info-bg text-badge-info-text',
      label: status,
    }
  );
}
