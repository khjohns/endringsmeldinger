<script lang="ts">
  /**
   * Skiva i #347: grunnlagskrav og vederlagskrav i en KOE-sak sendes til
   * TS-serveren, og saken vises slik kjernen utleder den, med leveringsoppdragene
   * for brevene. Bare for testmiljøet; de vanlige skjemaene skriver Pythons
   * hendelser (B-17).
   */
  import { page } from '$app/state';
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters';
  import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
  import { HOVEDKATEGORI_FRA_KATALOGEN, UNDERKATEGORI_FRA_KATALOGEN } from '$kjerne/format/koder';
  import { oppgittDato, type OppgittDato } from '$kjerne/format/format';
  import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
  import { leveringstekst } from '$lib/kjernesak/saksbilde';
  import type { Part } from '$kjerne/typer';

  const sakId = $derived(page.params.sakId ?? '');
  const prosjektId = $derived(page.params.prosjektId ?? '');

  // Siden brevteksten forhåndsvises for. Serveren avgjør med siden fra sesjonen (#665).
  let part = $state<Part>('TE');
  const kjernesak = $derived(lagKjernesak({ sakId, prosjektId, part }));
  const sak = $derived(kjernesak.sak);

  // Kategoriene som kjernen har et par for (#335).
  const forhold = KRAV_STRUKTUR_NS8407.filter((h) => h.kode in HOVEDKATEGORI_FRA_KATALOGEN).map(
    (h) => ({
      ...h,
      hjemler: h.hjemler.filter((u) => u.kode in UNDERKATEGORI_FRA_KATALOGEN),
    })
  );
  let hoved = $state(forhold[0]?.kode ?? '');
  let under = $state('');
  let tittel = $state('');
  let beskrivelse = $state('');
  // Datoen står under feltet den er oppgitt for, så den følger ikke med til en annen betydning.
  let datoer = $state<Partial<Record<OppgittDato, string>>>({});
  let beloep = $state<number | null>(null);
  const underkategorier = $derived(forhold.find((h) => h.kode === hoved)?.hjemler ?? []);

  // VS-U26: datoen varslingsplikten løper fra, påkrevd i krav fra appen.
  const DATOEN: Record<OppgittDato, string> = {
    paalegg_mottatt: 'Datoen pålegget ble mottatt',
    klar_over_forholdet: 'Datoen TE ble klar over forholdet',
  };
  const datofelt = $derived(
    under
      ? oppgittDato(HOVEDKATEGORI_FRA_KATALOGEN[hoved], UNDERKATEGORI_FRA_KATALOGEN[under])
      : null
  );

  const grunnlagskrav = $derived({
    type: 'krav',
    spor: 'grunnlag',
    innhold: {
      hovedkategori: HOVEDKATEGORI_FRA_KATALOGEN[hoved],
      underkategori: UNDERKATEGORI_FRA_KATALOGEN[under],
      ...(tittel.trim() ? { tittel: tittel.trim() } : {}),
      ...(datofelt && datoer[datofelt] ? { [datofelt]: datoer[datofelt] } : {}),
    },
    // TEs beskrivelse av pålegget er utdypningen under kravet (GR-U15).
    ...(beskrivelse.trim() ? { utdypning: beskrivelse.trim() } : {}),
  });
  const vederlagskrav = $derived({
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', beloep },
  });
  const grunnlagstekst = $derived(under ? kjernesak.brevtekst(grunnlagskrav) : null);
  const vederlagstekst = $derived(beloep ? kjernesak.brevtekst(vederlagskrav) : null);

  function sendGrunnlag(e: SubmitEvent) {
    e.preventDefault();
    void kjernesak.send(grunnlagskrav);
  }

  function sendVederlag(e: SubmitEvent) {
    e.preventDefault();
    void kjernesak.send(vederlagskrav);
  }

  $effect(() => {
    if (sakId) void kjernesak.last();
  });
</script>

<svelte:head><title>Sak i TS-kjernen — Kontraktsbordet</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-6 p-4">
  <h1 class="text-xl font-semibold">Sak i TS-kjernen</h1>
  <p class="text-sm text-gray-600">
    Prøve for testmiljøet (#347). Kravene sendes til TS-serveren, og hvert brev får et frosset
    leveringsoppdrag. Leveringen til Catenda er ikke prøvd mot Catendas API.
  </p>

  <label class="block text-sm"
    >Forhåndsvis brevteksten som
    <select class="border" bind:value={part}>
      <option value="TE">TE</option>
      <option value="BH">BH</option>
    </select>
  </label>

  {#if kjernesak.feil}
    <p role="alert" class="rounded border border-red-300 bg-red-50 p-2 text-sm">{kjernesak.feil}</p>
  {/if}

  {#if sak}
    <section aria-labelledby="status">
      <h2 id="status" class="font-semibold">Status</h2>
      <p data-testid="status">{kjernesak.visning?.status.tekst}</p>
      <p class="text-sm text-gray-600">Versjon {kjernesak.versjon}</p>
      <ul class="text-sm">
        {#each Object.entries(kjernesak.visning?.spor ?? {}) as [spor, { etiketter }] (spor)}
          <li>{spor}: {etiketter.join(', ') || '–'}</li>
        {/each}
      </ul>
    </section>

    <form class="space-y-2" onsubmit={sendGrunnlag} aria-labelledby="grunnlag">
      <h2 id="grunnlag" class="font-semibold">Send grunnlag</h2>
      <label class="block"
        >Hovedkategori
        <select class="block w-full border" bind:value={hoved} onchange={() => (under = '')}>
          {#each forhold as h (h.kode)}<option value={h.kode}>{h.label}</option>{/each}
        </select>
      </label>
      <label class="block"
        >Underkategori
        <select class="block w-full border" bind:value={under} required>
          <option value="" disabled>Velg</option>
          {#each underkategorier as u (u.kode)}<option value={u.kode}>{u.label}</option>{/each}
        </select>
      </label>
      <label class="block">Tittel <input class="block w-full border" bind:value={tittel} /></label>
      {#if datofelt}
        <label class="block"
          >{DATOEN[datofelt]}
          <input class="block w-full border" type="date" bind:value={datoer[datofelt]} required />
        </label>
      {/if}
      <label class="block"
        >Beskrivelse av pålegget <textarea class="block w-full border" bind:value={beskrivelse}
        ></textarea></label
      >
      {#if grunnlagstekst}
        <div class="text-sm" data-testid="brevtekst-grunnlag">
          {#each grunnlagstekst as avsnitt, i (i)}<p>{avsnitt}</p>{/each}
        </div>
      {/if}
      <button class="rounded border px-3 py-1" disabled={kjernesak.sender || !under}
        >Send grunnlag</button
      >
    </form>

    <form class="space-y-2" onsubmit={sendVederlag} aria-labelledby="vederlag">
      <h2 id="vederlag" class="font-semibold">Send krav om vederlag</h2>
      <label class="block"
        >Beløp (kr, tilbud)
        <input
          class="block w-full border"
          type="number"
          min="1"
          step="0.01"
          bind:value={beloep}
          required
        />
      </label>
      {#if vederlagstekst}
        <div class="text-sm" data-testid="brevtekst-vederlag">
          {#each vederlagstekst as avsnitt, i (i)}<p>{avsnitt}</p>{/each}
        </div>
      {/if}
      <button class="rounded border px-3 py-1" disabled={kjernesak.sender || !beloep}
        >Send krav om vederlag</button
      >
    </form>

    <section aria-labelledby="journal">
      <h2 id="journal" class="font-semibold">Journal</h2>
      <ol class="text-sm">
        {#each sak.journal as h (h.event_id)}
          <li>
            {h.versjon}. {h.event_type} fra {h.aktor_rolle}, {formatDateTimeNorwegian(
              h.tidsstempel
            )}
          </li>
        {/each}
      </ol>
    </section>

    <section aria-labelledby="levering">
      <h2 id="levering" class="font-semibold">Leveringsoppdrag</h2>
      {#if sak.leveringsoppdrag.length}
        <ul class="text-sm" data-testid="leveringsoppdrag">
          {#each sak.leveringsoppdrag as l (l.id)}
            <li>{leveringstekst(l)}</li>
          {/each}
        </ul>
      {:else}
        <p class="text-sm">Ingen brev ennå.</p>
      {/if}
    </section>
  {/if}
</main>
