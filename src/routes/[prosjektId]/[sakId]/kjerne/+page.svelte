<script lang="ts">
  /**
   * Skiva i #347: grunnlagskrav og vederlagskrav i en KOE-sak sendes til
   * TS-serveren, og saken vises slik kjernen utleder den, med leveringsoppdragene
   * for brevene. Bare for testmiljøet; de vanlige skjemaene skriver Pythons
   * hendelser (B-17).
   */
  import { page } from '$app/state';
  import { ApiError } from '$lib/api/client';
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters';
  import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
  import { HOVEDKATEGORI_FRA_KATALOGEN, UNDERKATEGORI_FRA_KATALOGEN } from '$kjerne/koder';
  import { hentKjernesak, sendKommando, type Kjernesak } from '$lib/kjerneskive/api';

  const sakId = $derived(page.params.sakId ?? '');

  let sak = $state<Kjernesak | null>(null);
  let feil = $state<string | null>(null);
  let sender = $state(false);

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
  let beloep = $state<number | null>(null);
  const underkategorier = $derived(forhold.find((h) => h.kode === hoved)?.hjemler ?? []);

  const meldingFra = (e: unknown, reserve: string) => (e instanceof ApiError ? e.message : reserve);

  async function last() {
    feil = null;
    try {
      sak = await hentKjernesak(sakId);
    } catch (e) {
      feil = meldingFra(e, 'Saken kunne ikke hentes.');
    }
  }

  async function send(kommando: unknown) {
    if (!sak || sender) return;
    sender = true;
    feil = null;
    try {
      await sendKommando(sakId, sak.versjon, kommando);
      await last();
    } catch (e) {
      const melding = meldingFra(e, 'Kravet ble ikke sendt.');
      // Ved konflikt lastes saken på nytt, og meldingen skal stå etterpå.
      if (e instanceof ApiError && e.status === 409) await last();
      feil = melding;
    } finally {
      sender = false;
    }
  }

  function sendGrunnlag(e: SubmitEvent) {
    e.preventDefault();
    void send({
      type: 'krav',
      spor: 'grunnlag',
      innhold: {
        hovedkategori: HOVEDKATEGORI_FRA_KATALOGEN[hoved],
        underkategori: UNDERKATEGORI_FRA_KATALOGEN[under],
        ...(tittel.trim() ? { tittel: tittel.trim() } : {}),
        ...(beskrivelse.trim() ? { beskrivelse: beskrivelse.trim() } : {}),
      },
    });
  }

  function sendVederlag(e: SubmitEvent) {
    e.preventDefault();
    void send({ type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep } });
  }

  $effect(() => {
    if (sakId) void last();
  });
</script>

<svelte:head><title>Sak i TS-kjernen — Kontraktsbordet</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-6 p-4">
  <h1 class="text-xl font-semibold">Sak i TS-kjernen</h1>
  <p class="text-sm text-gray-600">
    Prøve for testmiljøet (#347). Kravene sendes til TS-serveren, og hvert brev får et frosset
    leveringsoppdrag. Leveringen til Catenda er ikke bygget.
  </p>

  {#if feil}
    <p role="alert" class="rounded border border-red-300 bg-red-50 p-2 text-sm">{feil}</p>
  {/if}

  {#if sak}
    <section aria-labelledby="status">
      <h2 id="status" class="font-semibold">Status</h2>
      <p data-testid="status">{sak.visning.status.tekst}</p>
      <p class="text-sm text-gray-600">Versjon {sak.versjon}</p>
      <ul class="text-sm">
        {#each Object.entries(sak.visning.spor) as [spor, { etiketter }] (spor)}
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
      <label class="block"
        >Beskrivelse <textarea class="block w-full border" bind:value={beskrivelse}
        ></textarea></label
      >
      <button class="rounded border px-3 py-1" disabled={sender || !under}>Send grunnlag</button>
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
      <button class="rounded border px-3 py-1" disabled={sender || !beloep}
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
            <li>{l.filnavn}: frosset {formatDateTimeNorwegian(l.opprettet)}, ikke levert</li>
          {/each}
        </ul>
      {:else}
        <p class="text-sm">Ingen brev ennå.</p>
      {/if}
    </section>
  {/if}
</main>
