<script lang="ts">
	import type { TimelineEvent, EventType } from '$lib/types/timeline';
	import { extractEventType } from '$lib/types/timeline';
	import { getEventBestemmelse } from '$lib/constants/eventBestemmelser';
	import { getPartsNavn } from '$lib/utils/partsNavn';

	interface Props {
		event: TimelineEvent | null;
		prosjektId: string;
		sakId: string;
		onClose?: () => void;
		teNavn?: string;
		bhNavn?: string;
	}

	let { event, prosjektId, sakId, onClose, teNavn, bhNavn }: Props = $props();

	// --- Icon mapping (mirrors HendelsesLogg) ---

	interface EventIcon {
		symbol: string;
		cssClass: string;
	}

	function getEventIcon(eventType: EventType | null): EventIcon {
		if (!eventType) return { symbol: '\u00B7', cssClass: '' };

		if (eventType.includes('sendt') || eventType === 'frist_krav_sendt' || eventType === 'vederlag_krav_sendt') {
			return { symbol: '\u2192', cssClass: 'sendt' };
		}
		if (eventType.includes('opprettet') && !eventType.includes('oppdatert')) {
			return { symbol: '\u2691', cssClass: 'varslet' };
		}
		if (eventType.includes('oppdatert') || eventType.includes('spesifisert')) {
			return { symbol: '\u21BB', cssClass: 'revisjon' };
		}
		if (eventType.startsWith('respons_') && !eventType.includes('oppdatert')) {
			return { symbol: '\u25C7', cssClass: 'respons' };
		}
		if (eventType.includes('aksept')) {
			return { symbol: '\u2713', cssClass: 'godkjent' };
		}
		if (eventType.includes('trukket') || eventType.includes('avslatt')) {
			return { symbol: '\u2715', cssClass: 'avslatt' };
		}
		return { symbol: '\u00B7', cssClass: '' };
	}

	// --- Data extraction ---

	function getDescription(ev: TimelineEvent): string | null {
		const d = ev.data as Record<string, unknown> | undefined;
		if (!d) return ev.summary ?? null;

		// Prefer endrings_begrunnelse for updates, then beskrivelse, then begrunnelse
		if (typeof d.endrings_begrunnelse === 'string') return d.endrings_begrunnelse;
		if (typeof d.beskrivelse === 'string') return d.beskrivelse;
		if (typeof d.begrunnelse === 'string') return d.begrunnelse;
		return ev.summary ?? null;
	}

	function getVedleggIds(ev: TimelineEvent): string[] {
		const d = ev.data as Record<string, unknown> | undefined;
		if (!d) return [];
		if (Array.isArray(d.vedlegg_ids)) return d.vedlegg_ids as string[];
		return [];
	}

	function formatDate(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	}

	function getSectionLabel(et: EventType | null): string {
		if (!et) return 'Detaljer';
		if (et.startsWith('respons_')) return 'Vurdering';
		if (et.includes('oppdatert') || et.includes('spesifisert')) return 'Endring';
		if (et.includes('opprettet') || et.includes('sendt')) return 'Beskrivelse';
		return 'Detaljer';
	}

	// --- Derived ---

	const eventType = $derived(event ? extractEventType(event.type) : null);
	const icon = $derived(getEventIcon(eventType));
	const handling = $derived(event?.summary ?? '');
	const meta = $derived(
		event ? `${formatDate(event.time)} \u00B7 ${event.actorrole ? getPartsNavn(event.actorrole as 'TE' | 'BH', teNavn, bhNavn) : ''}` : ''
	);
	const description = $derived(event ? getDescription(event) : null);
	const vedleggIds = $derived(event ? getVedleggIds(event) : []);
	const bestemmelse = $derived(getEventBestemmelse(eventType));
	const sectionLabel = $derived(getSectionLabel(eventType));
	const spordetaljHref = $derived(
		event?.spor ? `/${prosjektId}/${sakId}/${event.spor}` : null
	);
</script>

<aside class="forhandsvisning">
	{#if !event}
		<div class="fv-tom">Hover over en hendelse<br />for å se detaljer</div>
	{:else}
		<div class="fv-innhold">
			<button class="fv-close" onclick={() => onClose?.()} aria-label="Lukk">&times;</button>
			<div class="fv-header">
				<span class="fv-ikon {icon.cssClass}" aria-hidden="true">{icon.symbol}</span>
				<span class="fv-handling">{handling}</span>
				<span class="fv-meta">{meta}</span>
			</div>

			{#if description}
				<div class="fv-separator"></div>
				<div class="fv-seksjon-label">{sectionLabel}</div>
				<div class="fv-tekst">{description}</div>
			{/if}

			{#if vedleggIds.length > 0}
				<div class="fv-separator"></div>
				<div class="fv-seksjon-label">Vedlegg</div>
				{#each vedleggIds as vedlegg (vedlegg)}
					<div class="fv-vedlegg">
						<span class="fv-vedlegg-ikon" aria-hidden="true">📎</span>
						{vedlegg}
					</div>
				{/each}
			{/if}

			{#if bestemmelse}
				<div class="fv-separator"></div>
				<div class="fv-seksjon-label">Bestemmelse</div>
				<div class="fv-bestemmelse">
					<div class="fv-paragraf">{bestemmelse.paragraf}</div>
					<div class="fv-bestemmelse-tekst">{bestemmelse.tekst}</div>
				</div>
			{/if}

			{#if spordetaljHref}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a class="fv-spordetalj-lenke" href={spordetaljHref}>
					Åpne i spordetalj →
				</a>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.forhandsvisning {
		border-left: 1px solid var(--color-wire-strong);
		padding: 24px;
		position: sticky;
		top: 0;
		height: 100%;
		overflow-y: auto;
		animation: panelIn 200ms ease-out;
		position: relative;
	}

	@keyframes panelIn {
		from {
			opacity: 0;
			transform: translateX(12px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.fv-tom {
		font-size: 11px;
		color: var(--color-ink-ghost);
		padding-top: 32px;
		text-align: center;
		line-height: 1.5;
	}

	.fv-close {
		position: absolute;
		top: 24px;
		right: 24px;
		background: none;
		border: none;
		color: var(--color-ink-ghost);
		cursor: pointer;
		font-size: 16px;
		padding: 4px;
		line-height: 1;
	}

	.fv-close:hover {
		color: var(--color-ink);
	}

	.fv-header {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 16px;
		padding-right: 24px;
	}

	.fv-ikon {
		font-size: 14px;
		width: 16px;
		text-align: center;
		flex-shrink: 0;
		color: var(--color-ink-muted);
	}

	.fv-ikon.revisjon {
		color: var(--color-vekt-dim);
	}

	.fv-ikon.sendt {
		color: var(--color-ink-muted);
	}

	.fv-ikon.varslet {
		color: var(--color-ink-muted);
	}

	.fv-ikon.respons {
		color: var(--color-score-high);
	}

	.fv-ikon.godkjent {
		color: var(--color-score-high);
	}

	.fv-ikon.avslatt {
		color: var(--color-score-low);
	}

	.fv-handling {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.fv-meta {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-muted);
		font-variant-numeric: tabular-nums;
		margin-left: auto;
	}

	.fv-separator {
		height: 1px;
		background: var(--color-wire);
		margin: 16px 0;
	}

	.fv-seksjon-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-ghost);
		margin-bottom: 8px;
	}

	.fv-tekst {
		font-size: 12px;
		color: var(--color-ink-secondary);
		line-height: 1.5;
	}

	.fv-vedlegg {
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		padding: 8px 12px;
		font-size: 11px;
		color: var(--color-ink-secondary);
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		transition: background 100ms ease-out;
	}

	.fv-vedlegg:hover {
		background: var(--color-felt-hover);
	}

	.fv-vedlegg + .fv-vedlegg {
		margin-top: 4px;
	}

	.fv-vedlegg-ikon {
		color: var(--color-ink-muted);
		font-size: 12px;
	}

	.fv-bestemmelse {
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-left: 2px solid var(--color-ink-ghost);
		border-radius: var(--radius-sm);
		padding: 8px 12px;
	}

	.fv-paragraf {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		margin-bottom: 4px;
	}

	.fv-bestemmelse-tekst {
		font-size: 11px;
		color: var(--color-ink-secondary);
		line-height: 1.4;
	}

	.fv-spordetalj-lenke {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-muted);
		cursor: pointer;
		text-decoration: none;
		padding-top: 12px;
		margin-top: 16px;
		border-top: 1px solid var(--color-wire);
		transition: color 100ms ease-out;
	}

	.fv-spordetalj-lenke:hover {
		color: var(--color-vekt);
	}

	@media (max-width: 1023px) {
		.forhandsvisning {
			padding: 16px;
			border-left: none;
		}

		.fv-close {
			top: 16px;
			right: 16px;
		}
	}
</style>
