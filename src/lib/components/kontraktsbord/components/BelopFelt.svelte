<script lang="ts">
  import { untrack } from 'svelte';
  import { lesKroner, visKroner } from '$lib/utils/belop';
  import { fmt } from '../utils';

  /**
   * Beløpsfelt i kroner med høyst to desimaler (OV-U58). Det parten skriver, står i
   * feltet til det er rettet: et beløp som ikke kan leses eller er over `maks`, gir en
   * feil under feltet og `onugyldig(true)`, og verdien endres ikke.
   */
  interface Props {
    id: string;
    label: string;
    value?: number;
    maks?: number;
    /** Hva `maks` er, i feilmeldingen: «Beløpet er høyere enn {maksbetegnelse}, …». */
    maksbetegnelse?: string;
    hint?: string;
    /** Navnet skjermleseren leser når flere felt har samme label. Begynner med labelen. */
    tilgjengeligNavn?: string;
    onchange: (value: number | undefined) => void;
    onugyldig?: (ugyldig: boolean) => void;
    onblur?: () => void;
  }

  let {
    id,
    label,
    value,
    maks,
    maksbetegnelse = 'det krevde beløpet',
    hint,
    tilgjengeligNavn,
    onchange,
    onugyldig,
    onblur,
  }: Props = $props();

  let tekst = $state(untrack(() => visKroner(value)));
  // Verdien feltet sist meldte. En annen verdi er satt av skjemaet og vises.
  let sistMeldt = untrack(() => value);
  let vistFeil = $state<string>();

  const lest = $derived.by(() => {
    const l = lesKroner(tekst);
    if ('feil' in l) return l;
    if (l.verdi !== undefined && maks !== undefined && l.verdi > maks)
      return { feil: `Beløpet er høyere enn ${maksbetegnelse}, ${fmt(maks)} kr.` };
    return l;
  });
  const feil = $derived('feil' in lest ? lest.feil : undefined);

  // En verdi skjemaet setter, som når beløpet etter begrensningen senkes (VS-U5), vises.
  $effect(() => {
    if (value !== sistMeldt) {
      sistMeldt = value;
      tekst = visKroner(value);
    }
  });
  $effect(() => {
    onugyldig?.(feil !== undefined);
    return () => onugyldig?.(false);
  });
  $effect(() => {
    if (feil === undefined) vistFeil = undefined;
  });

  const hintId = $derived(`${id}-hint`);
  const feilId = $derived(`${id}-feil`);
  const beskrivelse = $derived(
    [hint ? hintId : null, vistFeil ? feilId : null].filter(Boolean).join(' ') || undefined
  );
</script>

<div class="number-field">
  <label class="number-input-label" for={id}>{label}</label>
  {#if hint}
    <span class="number-input-hint" id={hintId}>{hint}</span>
  {/if}
  <div class="number-input-wrap">
    <input
      {id}
      type="text"
      inputmode="decimal"
      autocomplete="off"
      value={tekst}
      aria-label={tilgjengeligNavn}
      aria-invalid={vistFeil ? 'true' : undefined}
      aria-describedby={beskrivelse}
      oninput={(event) => {
        tekst = event.currentTarget.value;
        sistMeldt = 'verdi' in lest ? lest.verdi : undefined;
        onchange(sistMeldt);
      }}
      onblur={() => {
        vistFeil = feil;
        if (!feil && 'verdi' in lest) tekst = visKroner(lest.verdi);
        onblur?.();
      }}
      placeholder="0"
      class="font-mono measurement-input"
    />
    <span class="number-input-suffix">kr</span>
  </div>
  {#if vistFeil}
    <p class="number-input-feil" id={feilId} role="alert">{vistFeil}</p>
  {/if}
</div>

<style>
  .number-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    max-width: 260px;
    margin-top: var(--spacing-4);
  }
  .number-input-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .number-input-wrap {
    display: flex;
    align-items: stretch;
  }
  .number-input-wrap .measurement-input {
    min-width: 0;
    flex: 1;
    width: auto;
    text-align: right;
    border-radius: 4px 0 0 4px;
  }
  .number-input-wrap .measurement-input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  .number-input-suffix {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    color: var(--ink-3);
    background: var(--surface-inset);
    border: var(--control-border);
    border-left: none;
    border-radius: 0 4px 4px 0;
  }
  .number-input-hint {
    font-size: 12px;
    color: var(--ink-4);
  }
  .number-input-feil {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--danger);
  }

  @media (max-width: 768px) {
    .number-field {
      max-width: none;
    }
  }
</style>
