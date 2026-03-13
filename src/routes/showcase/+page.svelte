<script lang="ts">
  import Button from '$lib/components/primitives/Button.svelte';
  import Badge from '$lib/components/primitives/Badge.svelte';
  import Alert from '$lib/components/primitives/Alert.svelte';
  import Checkbox from '$lib/components/primitives/Checkbox.svelte';
  import KeyValueRow from '$lib/components/primitives/KeyValueRow.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';
  import YesNoButtons from '$lib/components/primitives/YesNoButtons.svelte';
  import VerdictButtons from '$lib/components/primitives/VerdictButtons.svelte';
  import NumberInput from '$lib/components/primitives/NumberInput.svelte';
  import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
  import ConsequenceCallout from '$lib/components/primitives/ConsequenceCallout.svelte';
  import Tooltip from '$lib/components/primitives/Tooltip.svelte';
  import Modal from '$lib/components/primitives/Modal.svelte';
  import DatePicker from '$lib/components/primitives/DatePicker.svelte';
  import LockedValueToken from '$lib/components/primitives/LockedValueToken.svelte';

  let checkboxChecked = $state(false);
  let yesNoValue: boolean | null = $state(null);
  let verdictValue: string | null = $state(null);
  let numberValue: number | undefined = $state(150000);
  let segmentValue = $state('poeng');
  let modalOpen = $state(false);
  let destructiveModalOpen = $state(false);
  let dateValue = $state('2026-01-15');
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
      <Alert variant="danger">Kravet overskrider kontraktsgrensen. Vurder konsekvensene nøye.</Alert
      >
      <Alert variant="info">Denne posisjonen er automatisk utfylt basert på tidligere vedtak.</Alert
      >
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

  <!-- YesNoButtons -->
  <section class="showcase-section">
    <SectionHeading title="Yes/No Buttons" paragrafRef="§ 32.2" />
    <div class="showcase-stack">
      <YesNoButtons
        value={yesNoValue}
        label="Varslet rettidig?"
        paragrafRef="§ 32.2"
        onchange={(v) => (yesNoValue = v)}
      />
      <YesNoButtons value={true} label="Dokumentert?" onchange={() => {}} />
      <YesNoButtons value={false} label="Innenfor frist?" onchange={() => {}} />
    </div>
  </section>

  <!-- VerdictButtons -->
  <section class="showcase-section">
    <SectionHeading title="Verdict Buttons" />
    <div class="showcase-stack">
      <VerdictButtons
        value={verdictValue}
        options={[
          { id: 'godkjent', label: 'Godkjent', variant: 'godkjent' },
          { id: 'delvis', label: 'Delvis', variant: 'delvis' },
          { id: 'avslatt', label: 'Avslått', variant: 'avslatt' },
        ]}
        onchange={(v) => (verdictValue = v)}
      />
      <VerdictButtons
        value="godkjent"
        options={[
          { id: 'godkjent', label: 'Godkjent', variant: 'godkjent' },
          { id: 'frafalt', label: 'Frafalt', variant: 'avslatt' },
        ]}
        onchange={() => {}}
      />
    </div>
  </section>

  <!-- NumberInput -->
  <section class="showcase-section">
    <SectionHeading title="Number Input" />
    <div class="showcase-row" style="align-items: flex-start;">
      <NumberInput
        value={numberValue}
        label="Krevd beløp"
        suffix="kr"
        referenceValue={200000}
        onchange={(v) => (numberValue = v)}
      />
      <NumberInput value={20} label="Dager" suffix="dager" max={365} onchange={() => {}} />
      <NumberInput value={67} label="Prosent" suffix="%" max={100} onchange={() => {}} />
    </div>
  </section>

  <!-- SegmentedControl -->
  <section class="showcase-section">
    <SectionHeading title="Segmented Control" paragrafRef="§ 34" />
    <SegmentedControl
      value={segmentValue}
      options={[
        { id: 'poeng', label: 'Poengmodell' },
        { id: 'pris', label: 'Prismodell' },
      ]}
      onchange={(v) => (segmentValue = v)}
    />
  </section>

  <!-- ConsequenceCallout -->
  <section class="showcase-section">
    <SectionHeading title="Consequence Callout" />
    <div class="showcase-stack">
      <ConsequenceCallout variant="godkjent"
        >Kravet er godkjent. Beløpet legges til endringsordren.</ConsequenceCallout
      >
      <ConsequenceCallout variant="advarsel"
        >Beløpet overskrider 15% av kontraktsverdien. Krever særskilt begrunnelse.</ConsequenceCallout
      >
      <ConsequenceCallout variant="kritisk"
        >Fristen er overskredet. Kravet kan være prekludert etter § 32.2.</ConsequenceCallout
      >
      <ConsequenceCallout variant="info"
        >Posisjonen er basert på totalentreprenørens varsel av 15.01.2026.</ConsequenceCallout
      >
    </div>
  </section>

  <!-- Tooltip -->
  <section class="showcase-section">
    <SectionHeading title="Tooltip" />
    <div class="showcase-row">
      <Tooltip content="Lagre endringer (Ctrl+S)">
        <Button variant="primary">Hover for tooltip</Button>
      </Tooltip>
      <Tooltip content="Denne verdien er låst fordi kravet er ferdigbehandlet.">
        <Badge variant="godkjent">Hover meg</Badge>
      </Tooltip>
    </div>
  </section>

  <!-- Modal -->
  <section class="showcase-section">
    <SectionHeading title="Modal" />
    <div class="showcase-row">
      <Button variant="secondary" onclick={() => (modalOpen = true)}>Åpne modal</Button>
      <Button variant="destructive" onclick={() => (destructiveModalOpen = true)}
        >Slett (destructive)</Button
      >
    </div>
    <Modal bind:open={modalOpen} title="Bekreft handling">
      Er du sikker på at du vil sende denne posisjonen?
      {#snippet actions()}
        <Button variant="secondary" onclick={() => (modalOpen = false)}>Avbryt</Button>
        <Button variant="primary" onclick={() => (modalOpen = false)}>Bekreft</Button>
      {/snippet}
    </Modal>
    <Modal bind:open={destructiveModalOpen} title="Slett krav" variant="destructive">
      Dette vil permanent slette kravet og alle tilknyttede data.
      {#snippet actions()}
        <Button variant="secondary" onclick={() => (destructiveModalOpen = false)}>Avbryt</Button>
        <Button variant="destructive" onclick={() => (destructiveModalOpen = false)}
          >Slett permanent</Button
        >
      {/snippet}
    </Modal>
  </section>

  <!-- DatePicker -->
  <section class="showcase-section">
    <SectionHeading title="Date Picker" />
    <div class="showcase-row" style="align-items: flex-start;">
      <DatePicker
        value={dateValue}
        label="Varseldato"
        hint="Dato TE sendte varselet"
        onchange={(v) => (dateValue = v)}
      />
      <DatePicker value="" label="Svarfrist" onchange={() => {}} />
    </div>
  </section>

  <!-- LockedValueToken -->
  <section class="showcase-section">
    <SectionHeading title="Locked Value Token" />
    <p class="showcase-token-text">
      Totalentreprenøren krever
      <LockedValueToken type="belop" display="kr 150 000,-" />
      for
      <LockedValueToken type="dager" display="20 dager" />
      fristforlengelse, tilsvarende
      <LockedValueToken type="prosent" display="67%" />
      av opprinnelig frist, jf.
      <LockedValueToken type="paragraf" display="§ 34.1" />.
    </p>
    <div class="showcase-row">
      <LockedValueToken type="dager" display="20 dager" />
      <LockedValueToken type="belop" display="kr 150 000,-" />
      <LockedValueToken type="prosent" display="67%" />
      <LockedValueToken type="dato" display="15.01.2026" />
      <LockedValueToken type="paragraf" display="§ 32.2" />
      <LockedValueToken type="tekst" display="Varslet" />
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

  .showcase-token-text {
    font-size: 14px;
    line-height: 1.8;
    color: var(--color-ink);
  }
</style>
