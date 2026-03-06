<script lang="ts">
	import type { SaksoversiktItem, SporHendelseType } from '$lib/mocks/saksoversikt';
	import { beregnTidslinje, finnDatospenn, genererAkseMerker } from '$lib/utils/tidslinje';
	import SakRow from './SakRow.svelte';
	import SakPanel from './SakPanel.svelte';

	interface Props {
		saker: SaksoversiktItem[];
		prosjektId: string;
		aktivtSpor?: SporHendelseType | null;
	}

	let { saker, prosjektId, aktivtSpor = null }: Props = $props();

	let valgtSak = $state<SaksoversiktItem | null>(null);
	const panelAapen = $derived(valgtSak !== null);

	const datospenn = $derived(finnDatospenn(saker));

	const akseMerker = $derived(genererAkseMerker(datospenn.min, datospenn.maks));

	const sakerMedTidslinje = $derived(
		saker.map((sak) => ({
			sak,
			klynger: beregnTidslinje(sak.hendelser, datospenn.min, datospenn.maks),
		}))
	);

	function velgSak(sak: SaksoversiktItem) {
		valgtSak = valgtSak?.sak_id === sak.sak_id ? null : sak;
	}

	function lukkPanel() {
		valgtSak = null;
	}
</script>

<div class="oversikt">
	<div class="liste-omraade">
		<!-- Time axis -->
		<div class="akse">
			<div class="akse-spacer">Tidslinje</div>
			<div class="akse-tidslinje">
				{#each akseMerker as merke (merke.label)}
					<div class="akse-merke" style:left="{merke.pos}%">
						{merke.label}
					</div>
				{/each}
				<div class="akse-idag">I DAG</div>
			</div>
		</div>

		<!-- Case rows -->
		<div class="sak-liste">
			{#each sakerMedTidslinje as { sak, klynger } (sak.sak_id)}
				<SakRow
					{sak}
					{klynger}
					erAktiv={valgtSak?.sak_id === sak.sak_id}
					onpanel={() => velgSak(sak)}
					{prosjektId}
					{aktivtSpor}
				/>
			{/each}
		</div>
	</div>

	<SakPanel
		sak={valgtSak}
		erAapen={panelAapen}
		onclose={lukkPanel}
		{prosjektId}
	/>
</div>

<style>
	.oversikt {
		flex: 1;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.liste-omraade {
		flex: 1;
		overflow-y: auto;
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		background-image: radial-gradient(
			circle at 1px 1px,
			var(--color-wire) 0.5px,
			transparent 0
		);
		background-size: 32px 32px;
	}

	.akse {
		display: flex;
		padding: 0 16px 12px 16px;
		border-bottom: 1px solid var(--color-wire-strong);
		margin-bottom: 4px;
		position: sticky;
		top: 0;
		background: var(--color-canvas);
		z-index: 20;
	}

	.akse-spacer {
		width: 260px;
		flex-shrink: 0;
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.akse-tidslinje {
		flex: 1;
		position: relative;
		height: 16px;
		margin: 0 32px;
	}

	.akse-merke {
		position: absolute;
		font-family: var(--font-data);
		font-size: 9px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		transform: translateX(-50%);
		white-space: nowrap;
	}

	.akse-idag {
		position: absolute;
		right: 0;
		font-family: var(--font-data);
		font-size: 9px;
		font-weight: 600;
		color: var(--color-ink);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.sak-liste {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	@media (max-width: 1023px) {
		.liste-omraade {
			padding: 12px;
		}

		.akse {
			flex-direction: column;
			gap: 8px;
			padding: 0 8px 12px 8px;
		}

		.akse-spacer {
			width: auto;
		}

		.akse-tidslinje {
			margin: 0;
		}

		.sak-liste {
			gap: 4px;
		}
	}
</style>
