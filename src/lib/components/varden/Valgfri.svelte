<!--
  «Valgfri» til høyre på linja med labelen eller spørsmålet over et valgfritt felt (system.md,
  «Et valgfritt felt har «Valgfri» til høyre», oppdragsgiver 16.11). Kalleren gir labelen
  `display: flex`. Skjermleseren leser «<label>, Valgfri».
-->
<script lang="ts">
  import { SKJEMA } from './tekster';
</script>

<!-- prettier-ignore -->
<span class="visually-hidden">,</span>&#32;<span class="valgfri">{SKJEMA.valgfri}</span>

<style>
  .valgfri {
    margin-left: auto;
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
  }
</style>
