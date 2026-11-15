<!--
  Én rad på målestokken i kortet «Kravet og svaret» (BF-44 og BF-45, U-2): navnet og verdien, og
  målet under, åpent for kravet og fylt for et lag i svaret. Trinnene står under raden som har dem.
  Avstanden mellom strekene i målet arves fra `--steg` hos kalleren.
-->
<script lang="ts" module>
  /** De runde trinnene på målestokken for verdien `stoerst`: fire trinn eller færre (U-2). */
  export function trinnene(stoerst: number): number[] {
    if (stoerst <= 0) return [0];
    const raa = stoerst / 4;
    const grunn = 10 ** Math.floor(Math.log10(raa));
    const steg = [1, 2, 2.5, 5, 10].map((f) => f * grunn).find((x) => x >= raa)!;
    // Trinnet ved enden av skalaen står ikke, så tallet ikke går ut over målestokken.
    return Array.from({ length: Math.ceil(stoerst / steg) }, (_, i) => i * steg);
  }

  /**
   * Skalaen for målestokken: trinnene, lengden for en verdi og avstanden mellom strekene. Med
   * `tilTrinn` slutter skalaen på neste runde trinn, så det største kravet ikke fyller målet, og
   * trinnet ved enden står (prototypen `fristoversikt.html`).
   */
  export function maalestokken(stoerst: number, tilTrinn = false) {
    const steget = trinnene(stoerst)[1] ?? stoerst;
    const skala = tilTrinn && steget > 0 ? (Math.floor(stoerst / steget) + 1) * steget : stoerst;
    const trinn = tilTrinn
      ? Array.from({ length: Math.round(skala / steget) + 1 }, (_, i) => i * steget)
      : trinnene(stoerst);
    const andel = (n: number) => (skala > 0 ? `${(n / skala) * 100}%` : '0');
    return {
      trinn,
      andel,
      steg: trinn.length > 1 ? andel(trinn[1]!) : '100%',
      /** Trinnet ved enden står ved kanten av målet. */
      ende: tilTrinn,
    };
  }
</script>

<script lang="ts">
  let {
    navn,
    verdi = null,
    etter = null,
    andel = null,
    aapen = false,
    trinn = [],
    ende = false,
    kompakt = false,
    sterk = true,
  }: {
    navn: string;
    verdi?: string | null;
    /** Det som står dempet etter verdien, som den nye fristen (U-5 i BF-45). */
    etter?: string | null;
    /** Lengden på målet som andel av skalaen, eller `null` uten mål. */
    andel?: string | null;
    /** Kravet er åpent, og et lag i svaret fylt. */
    aapen?: boolean;
    trinn?: number[];
    /** Det siste trinnet står ved kanten av målet (`maalestokken`). */
    ende?: boolean;
    /** Verdien i vanlig størrelse, som dagene for en frist. */
    kompakt?: boolean;
    /** Navnet i halvfet, som kravet. */
    sterk?: boolean;
  } = $props();
</script>

<div class="lagrad" class:kompakt>
  <span class="navn" class:sterk>{navn}</span>
  {#if verdi !== null}
    <span class="verdi"
      ><b>{verdi}</b>{#if etter}<span class="etter">&nbsp;· {etter}</span>{/if}</span
    >
  {/if}
</div>
{#if andel !== null}
  <div class="maal" class:aapen aria-hidden="true">
    {#if aapen}<i class="ramme" style:width={andel}></i>{:else}<i style:width={andel}></i>{/if}
  </div>
{/if}
{#if trinn.length}
  <div class="trinn" class:ende aria-hidden="true">
    {#each trinn as t (t)}<span>{t.toLocaleString('nb-NO')}</span>{/each}
  </div>
{/if}

<style>
  .lagrad {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--spacing-4);
    align-items: baseline;
    justify-content: space-between;
  }
  .navn {
    font-size: 14px;
    font-weight: 500;
  }
  .navn.sterk {
    font-weight: 600;
  }
  .verdi b {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .kompakt .verdi b {
    font-size: 16px;
    letter-spacing: 0;
  }
  .etter {
    font-size: 14px;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .maal {
    position: relative;
    height: 8px;
    margin-top: 6px;
    border: 1px solid var(--rule-strong-color);
    background: var(--surface)
      linear-gradient(to right, var(--rule-strong-color) 1px, transparent 1px) 0 0 / var(--steg)
      100%;
  }
  .maal i {
    position: absolute;
    inset: -1px auto -1px -1px;
    min-width: 2px;
    background: var(--ink);
  }
  /* Kravet er åpent: en ramme i blekk med lengden etter kravet, som ringene i tråden (U-2). */
  .maal i.ramme {
    background: transparent;
    border: 1px solid var(--ink);
  }
  .trinn {
    display: flex;
    margin-top: var(--spacing-1);
    font-size: 12px;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .trinn span {
    flex: 0 0 var(--steg);
  }
  .trinn span:last-child {
    flex: 1 1 0;
  }
  /* Tallet ved enden slutter ved kanten av målet. */
  .trinn.ende span:last-child {
    flex: 0 0 0;
    direction: rtl;
  }
  /* Smal skjerm: laget står over dagene (U-5 i BF-45). */
  @media (max-width: 560px) {
    .kompakt {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
