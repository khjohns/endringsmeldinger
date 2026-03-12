import type { SporStatus } from '$lib/types/timeline';

/**
 * Whether a track is in an "awaiting response" state.
 * Used across Sidebar, AvventerRad, KronologiskTidslinje, etc.
 */
export function isAwaitingResponse(status: SporStatus): boolean {
	return status === 'sendt' || status === 'under_behandling' || status === 'delvis_godkjent';
}
