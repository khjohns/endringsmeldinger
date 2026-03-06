<script lang="ts">
	interface Props {
		tittel: string;
		hovedkategori: string;
		underkategori?: string;
		hjemmelRef?: string;
		datoVarslet?: string;
		versjon: number;
	}

	let { tittel, hovedkategori, underkategori, hjemmelRef, datoVarslet, versjon }: Props = $props();

	const kategoriLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			ENDRING: 'Endring',
			SVIKT: 'Svikt',
			ANDRE: 'Andre forhold',
			FORCE_MAJEURE: 'Force majeure',
		};
		return labels[hovedkategori] ?? hovedkategori;
	});

	const underkategoriLabel = $derived.by(() => {
		if (!underkategori) return null;
		const labels: Record<string, string> = {
			EO: 'Endringsordre',
			IRREG: 'Irregulær endring',
			VALGRETT: 'Valgrett',
			SVAR_VARSEL: 'Svar på varsel',
		};
		return labels[underkategori] ?? underkategori;
	});

	const formatDato = $derived.by(() => {
		if (!datoVarslet) return null;
		try {
			return new Intl.DateTimeFormat('nb-NO', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
			}).format(new Date(datoVarslet));
		} catch {
			return datoVarslet;
		}
	});
</script>

<div class="sammendrag-kort">
	<div class="kort-header">
		<span class="kort-label">Krav fra TE</span>
		{#if versjon > 1}
			<span class="versjon-badge">Rev. {versjon - 1}</span>
		{/if}
	</div>
	<h2 class="kort-tittel">{tittel}</h2>
	<div class="kort-meta">
		<span class="meta-tag">{kategoriLabel}</span>
		{#if underkategoriLabel}
			<span class="meta-separator">·</span>
			<span class="meta-tag">{underkategoriLabel}</span>
		{/if}
		{#if hjemmelRef}
			<span class="meta-separator">·</span>
			<span class="meta-ref">{hjemmelRef}</span>
		{/if}
	</div>
	{#if formatDato}
		<div class="kort-dato">
			<span class="dato-label">Varslet</span>
			<span class="dato-verdi">{formatDato}</span>
		</div>
	{/if}
</div>

<style>
	.sammendrag-kort {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		padding: var(--spacing-4);
		border: 1px solid var(--color-wire-strong);
		border-left: 3px solid var(--color-role-te-text);
		border-radius: var(--radius-sm);
		background: var(--color-felt);
	}

	.kort-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.kort-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.versjon-badge {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		padding: 1px var(--spacing-2);
		border-radius: 9999px;
		background: var(--color-felt-raised);
		color: var(--color-ink-muted);
	}

	.kort-tittel {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-ink);
		line-height: 1.3;
		margin: 0;
	}

	.kort-meta {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		flex-wrap: wrap;
	}

	.meta-tag {
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.meta-separator {
		font-size: 12px;
		color: var(--color-ink-ghost);
	}

	.meta-ref {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-muted);
	}

	.kort-dato {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding-top: var(--spacing-1);
		border-top: 1px solid var(--color-wire);
	}

	.dato-label {
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.dato-verdi {
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}
</style>
