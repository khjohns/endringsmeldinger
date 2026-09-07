<script lang="ts">
  import { formatDateNorwegian } from '$lib/utils/dateFormatters';
  import type { BrevInnhold } from './letterTypes';

  let { brevInnhold }: { brevInnhold: BrevInnhold } = $props();

  const generertDato = formatDateNorwegian(new Date().toISOString());
</script>

<div class="a4-page">
  <!-- Header -->
  <div class="letter-header">
    <div class="letter-logo">NS 8407</div>
    <div class="letter-refs">
      <div class="letter-date">{brevInnhold.referanser.dato}</div>
      <div class="letter-ref">Sak: {brevInnhold.referanser.sakId}</div>
      <div class="letter-ref">Event: {brevInnhold.referanser.eventId}</div>
    </div>
  </div>

  <!-- Mottaker -->
  <div class="letter-recipient">
    <div class="letter-to-label">TIL</div>
    <div class="letter-to-name">{brevInnhold.mottaker.navn}</div>
    {#if brevInnhold.mottaker.adresse}
      <div class="letter-to-detail">{brevInnhold.mottaker.adresse}</div>
    {/if}
  </div>

  <!-- Tittel -->
  <div class="letter-subject">{brevInnhold.tittel}</div>

  <!-- Seksjoner -->
  <div class="letter-body">
    <div class="letter-section">
      <div class="letter-section-text">{brevInnhold.seksjoner.innledning.redigertTekst}</div>
    </div>
    <div class="letter-section">
      <div class="letter-section-text">{brevInnhold.seksjoner.begrunnelse.redigertTekst}</div>
    </div>
    <div class="letter-section">
      <div class="letter-section-text">{brevInnhold.seksjoner.avslutning.redigertTekst}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="letter-footer">
    <span>{brevInnhold.referanser.sakId} | NS 8407:2011</span>
    <span>Generert: {generertDato}</span>
  </div>
</div>

<style>
  .a4-page {
    width: 210mm;
    min-height: 297mm;
    padding: 40px 50px;
    background: white;
    color: #2c2c2c;
    font-family: var(--font-sans);
    font-size: 10pt;
    line-height: 1.5;
    position: relative;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    margin: 0 auto;
  }
  .letter-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 1px solid #e6e6e6;
    margin-bottom: 24px;
  }
  .letter-logo {
    font-size: 18pt;
    font-weight: 800;
    color: #2a2859;
    letter-spacing: 0.05em;
  }
  .letter-refs {
    text-align: right;
  }
  .letter-date {
    font-size: 10pt;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .letter-ref {
    font-size: 8pt;
    color: #666;
  }
  .letter-recipient {
    margin-bottom: 24px;
  }
  .letter-to-label {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #666;
    margin-bottom: 4px;
  }
  .letter-to-name {
    font-size: 11pt;
    font-weight: 700;
  }
  .letter-to-detail {
    font-size: 9pt;
    color: #4d4d4d;
  }
  .letter-subject {
    font-size: 12pt;
    font-weight: 700;
    color: #2a2859;
    padding-bottom: 8px;
    border-bottom: 2px solid #2a2859;
    margin-bottom: 24px;
  }
  .letter-body {
    margin-bottom: 40px;
  }
  .letter-section {
    margin-bottom: 16px;
  }
  .letter-section-text {
    font-family: var(--font-sans);
    font-size: 10pt;
    line-height: 1.6;
    white-space: pre-wrap;
    text-align: justify;
  }
  .letter-footer {
    position: absolute;
    bottom: 25px;
    left: 50px;
    right: 50px;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #999;
    border-top: 1px solid #e6e6e6;
    padding-top: 8px;
  }
</style>
