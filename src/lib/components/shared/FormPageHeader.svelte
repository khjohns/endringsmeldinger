<script lang="ts">
	interface Props {
		tilbakeHref: string;
		tilbakeTekst?: string;
		eyebrow: string;
		prosjektNavn?: string;
		teNavn?: string;
		bhNavn?: string;
		saksnr?: number;
		tittel?: string;
	}

	let {
		tilbakeHref,
		tilbakeTekst = 'Tilbake',
		eyebrow,
		prosjektNavn,
		teNavn,
		bhNavn,
		saksnr,
		tittel,
	}: Props = $props();
</script>

<div class="form-page-header">
	<a class="tilbake-lenke" href={tilbakeHref}>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
		{tilbakeTekst}
	</a>

	<header class="header-block">
		<span class="eyebrow">{eyebrow}</span>
		<div class="context-line">
			{#if prosjektNavn}
				<span class="context-prosjekt">{prosjektNavn}</span>
				<span class="context-sep">·</span>
			{/if}
			{#if teNavn}
				<span class="context-part">{teNavn}</span>
				<span class="context-sep">→</span>
			{/if}
			{#if bhNavn}
				<span class="context-part">{bhNavn}</span>
			{/if}
			{#if saksnr !== undefined}
				<span class="context-sep">·</span>
				<span class="context-nr">#{saksnr}</span>
			{/if}
		</div>
	</header>

	{#if tittel}
		<h2 class="page-tittel">{tittel}</h2>
	{/if}
</div>

<style>
	.form-page-header {
		display: flex;
		flex-direction: column;
	}

	/* --- Tilbake-lenke --- */
	.tilbake-lenke {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-1);
		font-size: 12px;
		color: var(--color-ink-ghost);
		text-decoration: none;
		transition: color 0.12s;
		margin-bottom: var(--spacing-6);
	}

	.tilbake-lenke:hover {
		color: var(--color-vekt);
	}

	/* --- Eyebrow + context --- */
	.header-block {
		margin-bottom: var(--spacing-4);
	}

	.eyebrow {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.context-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px var(--spacing-2);
		margin-top: var(--spacing-1);
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.context-prosjekt {
		font-weight: 500;
	}

	.context-part {
		color: var(--color-ink-muted);
	}

	.context-sep {
		color: var(--color-ink-ghost);
	}

	.context-nr {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-muted);
	}

	/* --- Tittel --- */
	.page-tittel {
		font-family: var(--font-ui);
		font-size: 18px;
		font-weight: 600;
		color: var(--color-ink);
		line-height: 1.3;
		margin: 0 0 var(--spacing-2);
		padding: 0 0 var(--spacing-2);
		border-bottom: 1px solid var(--color-wire);
	}

	/* --- Mobil --- */
	@media (max-width: 767px) {
		.tilbake-lenke {
			margin-bottom: var(--spacing-4);
		}

		.header-block {
			margin-bottom: var(--spacing-3);
		}
	}
</style>
