<script lang="ts">
  import { authorityMatrix, calculateAuthority } from '$lib/approval/authority';
  import type { ReviewItem, ApprovalUser } from '$lib/approval/types';
  import { trackNames } from '$lib/approval/types';
  let {
    items,
    dailyRate,
    chain,
    claimedMoney,
    claimedDays,
  }: {
    items: ReviewItem[];
    dailyRate: number | null;
    chain: ApprovalUser[];
    claimedMoney: number;
    claimedDays: number;
  } = $props();
  const assessment = $derived(calculateAuthority(items, dailyRate));
  const money = (value: number | null) =>
    value === null ? 'Ikke beregnet' : `${value.toLocaleString('nb-NO')} kr`;
  const includesMoney = $derived(items.some((i) => i.track === 'vederlag'));
  const includesTime = $derived(items.some((i) => i.track === 'frist'));
  const claimed = $derived(
    includesTime && claimedDays > 0 && !assessment.dailyRate
      ? null
      : (includesMoney ? claimedMoney : 0) +
          (includesTime ? claimedDays * (assessment.dailyRate ?? 0) : 0)
  );
  const covered = $derived(
    assessment.amount !== null &&
      chain.some((person) => {
        const row = authorityMatrix.find((r) => r.role === person.role);
        return row && (row.limit === null || row.limit >= assessment.amount!);
      })
  );
</script>

<section class="authority" aria-label="Fullmaktsgrunnlag">
  <div class="heading">
    <h3>Fullmaktsgrunnlag</h3>
    <span>Endring i kontrakt</span>
  </div>
  <div class="totals">
    <div><span>TEs krav · inkluderte vurderinger</span><strong>{money(claimed)}</strong></div>
    <div>
      <span>BHs fullmaktsgrunnlag</span><strong
        >{items.length ? money(assessment.amount) : 'Ingen vurderinger valgt'}</strong
      >
    </div>
  </div>
  {#if items.length}
    <p class="required">
      {assessment.required
        ? assessment.required.limit === null
          ? 'Krever Adm.dir (daglig leder)'
          : `Krever ${assessment.required.role} eller høyere fullmakt`
        : 'Fullmakt kan ikke beregnes uten dagmulktssats.'}
    </p>
    <p class="explanation">
      Høyeste samlede standpunkt brukes: prinsipalt {money(assessment.principal)}, subsidiært {money(
        assessment.subsidiary
      )}. Alternative standpunkter summeres ikke.
    </p>
    {#if !covered && assessment.amount !== null}<p class="uncovered">
        Godkjenningskjeden har ingen rolle med dokumentert tilstrekkelig fullmakt i denne matrisen.
      </p>{/if}
  {/if}
  <details>
    <summary>Se beregning og fullmaktsmatrise · januar 2026</summary>
    <dl class="breakdown">
      {#each assessment.rows as row (row.track)}
        <div>
          <dt>{trackNames[row.track]}</dt>
          <dd>
            Prinsipalt {row.track === 'frist' ? `${row.principal} dager = ` : ''}{money(
              row.principalAmount
            )} · subsidiært {row.track === 'frist' ? `${row.subsidiary} dager = ` : ''}{money(
              row.subsidiaryAmount
            )}
          </dd>
        </div>
      {/each}
      {#if includesTime}<div>
          <dt>Fristens verdi</dt>
          <dd>
            Antall godkjente dager × {assessment.dailyRate
              ? `${money(assessment.dailyRate)} per dag`
              : 'dagmulktssats mangler'}
          </dd>
        </div>{/if}
    </dl>

    <table>
      <thead><tr><th>Rolle</th><th>Inntil</th></tr></thead><tbody>
        {#each authorityMatrix as row (row.role)}<tr
            class:required-row={items.length > 0 && assessment.required?.role === row.role}
            ><td>{row.role}</td><td>{row.limit === null ? 'Ubegrenset' : money(row.limit)}</td></tr
          >{/each}
      </tbody>
    </table>
    <p class="explanation">
      Saksbehandler er personen som behandler saken. Personens rolle avgjør fullmakten. Matrisen
      viser beløpsnivå; godkjenningskjeden er fortsatt konfigurert separat.
    </p>
  </details>
</section>

<style>
  .authority {
    max-width: 760px;
    margin: 0 auto 20px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    padding: 20px;
  }
  .heading {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: baseline;
  }
  h3 {
    font-size: 13px;
    font-weight: 650;
    margin: 0;
  }
  .heading span,
  .totals span {
    font-size: 11px;
    color: var(--ink-3);
  }
  .totals {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 16px 0;
  }
  .totals strong {
    display: block;
    font-size: 20px;
    font-variant-numeric: tabular-nums;
    margin-top: 5px;
  }
  .breakdown {
    font-size: 12px;
    border-top: var(--rule);
    padding-top: 12px;
  }
  .breakdown div {
    margin-bottom: 8px;
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 4px 0 0;
    color: var(--ink-3);
  }
  .required {
    font-size: 13px;
    font-weight: 600;
    margin: 12px 0 6px;
  }
  .explanation {
    font-size: 11px;
    color: var(--ink-3);
    line-height: 1.6;
  }
  .uncovered {
    font-size: 12px;
    line-height: 1.5;
    padding: 10px;
    border: var(--rule);
    border-radius: 6px;
    background: var(--surface-inset);
  }
  details {
    margin-top: 14px;
  }
  summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--ink-2);
  }
  table {
    width: 100%;
    margin-top: 12px;
    border-collapse: collapse;
    font-size: 12px;
  }
  th,
  td {
    padding: 7px 6px;
    text-align: left;
    border-bottom: var(--rule);
  }
  th:last-child,
  td:last-child {
    text-align: right;
    white-space: nowrap;
  }
  .required-row {
    background: var(--surface-inset);
    font-weight: 600;
  }
  @media (max-width: 600px) {
    .totals {
      grid-template-columns: 1fr;
    }
    .heading {
      flex-wrap: wrap;
    }
  }
</style>
