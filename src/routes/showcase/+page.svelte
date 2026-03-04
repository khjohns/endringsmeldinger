<script lang="ts">
	import Button from '$lib/components/primitives/Button.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Alert from '$lib/components/primitives/Alert.svelte';
	import Checkbox from '$lib/components/primitives/Checkbox.svelte';
	import KeyValueRow from '$lib/components/primitives/KeyValueRow.svelte';
	import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';

	let checkboxChecked = $state(false);
</script>

<div class="showcase">
	<header class="showcase-header">
		<h1>KOE Primitiver</h1>
		<p>Designsystem-showcase for Analysebordet</p>
	</header>

	<!-- Button -->
	<section class="showcase-section">
		<SectionHeading title="Button" />
		<div class="showcase-row">
			<Button variant="primary">Lagre</Button>
			<Button variant="secondary">Avbryt</Button>
			<Button variant="accept">Godkjenn</Button>
			<Button variant="destructive">Slett</Button>
			<Button variant="primary" disabled>Deaktivert</Button>
			<Button variant="primary" loading>Laster</Button>
		</div>
	</section>

	<!-- Badge -->
	<section class="showcase-section">
		<SectionHeading title="Badge" />
		<div class="showcase-row">
			<Badge variant="godkjent">Godkjent</Badge>
			<Badge variant="avslatt">Avslått</Badge>
			<Badge variant="delvis">Delvis</Badge>
			<Badge variant="uavklart">Uavklart</Badge>
			<Badge variant="na">N/A</Badge>
		</div>
	</section>

	<!-- Alert -->
	<section class="showcase-section">
		<SectionHeading title="Alert" />
		<div class="showcase-stack">
			<Alert variant="warning">Fristen for å svare på varselet er overskredet med 3 dager.</Alert>
			<Alert variant="danger">Kravet overskrider kontraktsgrensen. Vurder konsekvensene nøye.</Alert>
			<Alert variant="info">Denne posisjonen er automatisk utfylt basert på tidligere vedtak.</Alert>
		</div>
	</section>

	<!-- Checkbox -->
	<section class="showcase-section">
		<SectionHeading title="Checkbox" paragrafRef="§ 32.2" />
		<div class="showcase-stack">
			<Checkbox
				checked={checkboxChecked}
				label="Totalentreprenøren har varslet rettidig"
				paragrafRef="§ 32.2"
				onchange={(v) => (checkboxChecked = v)}
			/>
			<Checkbox
				checked={true}
				label="Kravet er dokumentert"
				description="Vedlegg og beregningsgrunnlag er vedlagt"
				onchange={() => {}}
			/>
			<Checkbox checked={false} label="Deaktivert" disabled onchange={() => {}} />
		</div>
	</section>

	<!-- KeyValueRow -->
	<section class="showcase-section">
		<SectionHeading title="Key Value Row" />
		<div class="showcase-stack kv-container">
			<KeyValueRow label="Krav" value="kr 1 250 000" mono />
			<KeyValueRow label="Godkjent beløp" value="kr 875 000" mono />
			<KeyValueRow label="Status" value="Delvis godkjent" />
			<KeyValueRow label="Fristforlengelse" value="20 dager" mono />
		</div>
	</section>

	<!-- SectionHeading -->
	<section class="showcase-section">
		<SectionHeading title="Section Heading varianter" />
		<div class="showcase-stack">
			<SectionHeading title="Grunnlag" paragrafRef="§ 32.1" />
			<SectionHeading title="Vederlag" paragrafRef="§ 34.1" />
			<SectionHeading title="Fristforlengelse" />
		</div>
	</section>

	<!-- ProgressBar -->
	<section class="showcase-section">
		<SectionHeading title="Progress Bar" />
		<div class="showcase-stack">
			<ProgressBar value={85} label="Grunnlag evaluert" />
			<ProgressBar value={55} label="Vederlag evaluert" />
			<ProgressBar value={20} label="Frist evaluert" />
			<ProgressBar value={0} label="Ikke startet" />
		</div>
	</section>
</div>

<style>
	.showcase {
		max-width: 960px;
		margin: 0 auto;
		padding: var(--spacing-8) var(--spacing-6);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-8);
	}

	.showcase-header h1 {
		font-family: var(--font-ui);
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--color-ink);
	}

	.showcase-header p {
		font-size: 13px;
		color: var(--color-ink-muted);
		margin-top: var(--spacing-1);
	}

	.showcase-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	.showcase-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--spacing-3);
	}

	.showcase-stack {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.kv-container {
		max-width: 400px;
	}
</style>
