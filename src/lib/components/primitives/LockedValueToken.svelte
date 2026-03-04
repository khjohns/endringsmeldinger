<script lang="ts">
	import type { LockedValueType } from '$lib/utils/lockedValueTokens';

	interface Props {
		type: LockedValueType;
		display: string;
	}

	let { type, display }: Props = $props();

	const typeColors: Record<LockedValueType, string> = {
		dager: 'token-dager',
		belop: 'token-belop',
		prosent: 'token-prosent',
		dato: 'token-dato',
		paragraf: 'token-paragraf',
		tekst: 'token-tekst'
	};
</script>

<span class="locked-token {typeColors[type]}" title="{type}: {display}">
	{display}
</span>

<style>
	.locked-token {
		display: inline;
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		user-select: none;
	}

	.token-dager {
		color: #5b9bd5;
		background: rgba(91, 155, 213, 0.12);
	}

	.token-belop {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.token-prosent {
		color: #a78bda;
		background: rgba(167, 139, 218, 0.12);
	}

	.token-dato {
		color: #5b9bd5;
		background: rgba(91, 155, 213, 0.12);
	}

	.token-paragraf {
		color: var(--color-ink-secondary);
		background: var(--color-felt-active);
	}

	.token-tekst {
		color: var(--color-ink-secondary);
		background: var(--color-felt-active);
	}
</style>
