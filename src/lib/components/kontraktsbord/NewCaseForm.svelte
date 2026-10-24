<script lang="ts">
  import { CalendarDays, ChevronDown, ChevronUp, Search } from 'lucide-svelte';
  import FormSection from './components/FormSection.svelte';
  import KonsekvensVarsler from './KonsekvensVarsler.svelte';
  import { buildKonsekvensVarsler, type VarselValg } from '$lib/domain/konsekvensVarsler';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import {
    KRAV_STRUKTUR_NS8407,
    type Kontraktsforhold,
    type Kontraktshjemmel,
  } from '$lib/constants/categories.js';
  import { getKontraktsregel } from '$lib/constants/kontraktsregler.js';
  import type { ValgtHjemmel } from '$lib/types/hjemmel.js';
  import { onMount } from 'svelte';
  import { draftKey, loadDraft, saveDraft, clearDraft } from '$lib/utils/draft';
  import { createSubmission } from '$lib/kontraktsbord/submission.svelte';
  const submission = createSubmission();
  import { createLetterConfirmation } from '$lib/approval/claimReview.svelte';
  import { letterText } from '$lib/approval/letter';
  import { projectStore } from '$lib/stores/project.svelte';
  import { formatDateNorwegian } from '$lib/utils/dateFormatters';
  import ClaimLetterView from './ClaimLetterView.svelte';
  import { nyKommandoId, opprettSak } from '$lib/api/kjerne';
  import { sendForsoek, usikkertUtfall } from '$lib/kjernesak/forsoek';
  import { avvisningFoerBrevet, lagKjernesak, type Ventende } from '$lib/kjernesak/kontekst.svelte';
  import {
    datofelt,
    gjelderEndringsordre,
    grunnlagskrav,
    KJERNEKATEGORIER,
    opprettelse,
  } from '$lib/kjernesak/grunnlagskrav';
  import { kravMotNySak } from '$lib/kjernesak/brevtekst';
  import type { Kjernebrev } from '$lib/kjernesak/kravkontroll.svelte';
  import { KJERNE } from '$kjerne/versjon';
  import Brevkontroll from '$lib/components/kjernesak/Brevkontroll.svelte';
  import type { OppgittDato } from '$kjerne/format/format';
  const letterConfirmation = createLetterConfirmation();
  const brevkontroll = createLetterConfirmation<Kjernebrev>();

  let {
    onsend,
    onactions,
    prosjektId,
    oncreated,
  }: {
    onsend: () => void;
    prosjektId?: string;
    oncreated?: (sakId: string) => void;
    onactions?: (a: {
      canSend: boolean;
      sendLabel: string;
      send: () => void;
      /** The letter check is open; the host hides its send bar */
      reviewing: boolean;
    }) => void;
  } = $props();

  let varsler = $state<VarselValg>({});
  let tittel = $state('');
  let datoOppdaget = $state('');
  let valgtHjemmel = $state<ValgtHjemmel | null>(null);
  let hjemmelvelgerApen = $state(true);
  let apenKategori: string | null = $state(null);
  let sok = $state('');
  let begrunnelseHtml = $state('');
  let charCount = $state(0);
  let draftReady = $state(false);
  // Med prosjekt opprettes saken i TS (B-17, #666): kjernens kategorier, datoen etter VS-U26
  // og endringsordren (GR-U16). Uten prosjekt er skjemaet demoen i /mockup, som viser
  // kategoriene, varslene og brevet uten å skrive noe (#1025). Varslene i samme brev er #1036.
  const demo = $derived(!prosjektId);
  const kategorier = $derived(demo ? KRAV_STRUKTUR_NS8407 : KJERNEKATEGORIER);
  // Datoen står under feltet den er oppgitt for, så den følger ikke med til en annen betydning.
  let datoer = $state<Partial<Record<OppgittDato, string>>>({});
  let endringsordre = $state('');
  const DATOSPOERSMAAL: Record<OppgittDato, string> = {
    paalegg_mottatt: 'Når ble pålegget mottatt?',
    klar_over_forholdet: 'Når ble TE klar over forholdet?',
  };
  let createdCase = $state<{ id: string; version: number } | null>(null);
  // Opprettelsen og kravet med ID-en til svaret er sikkert, så et nytt forsøk, også
  // etter at siden er lastet på nytt, sender samme kommando med samme ID (#418).
  let ventendeOpprettelse = $state<{ kommandoId: string; kommando: unknown } | null>(null);
  let ventendeKrav = $state<Ventende | null>(null);
  const dk = draftKey('kontraktsbord-ny-kjerne', prosjektId);
  const utkast = () => ({
    tittel,
    datoer,
    endringsordre,
    valgtHjemmel,
    begrunnelseHtml,
    createdCase,
    ventendeOpprettelse,
    ventendeKrav,
  });
  onMount(() => {
    if (prosjektId) {
      const draft = loadDraft<{
        tittel: string;
        datoer?: Partial<Record<OppgittDato, string>>;
        endringsordre?: string;
        valgtHjemmel: ValgtHjemmel | null;
        begrunnelseHtml: string;
        createdCase: { id: string; version: number } | null;
        ventendeOpprettelse?: { kommandoId: string; kommando: unknown } | null;
        ventendeKrav?: Ventende | null;
      }>(dk);
      if (draft) {
        tittel = draft.tittel ?? '';
        datoer = draft.datoer ?? {};
        endringsordre = draft.endringsordre ?? '';
        valgtHjemmel = draft.valgtHjemmel ?? null;
        begrunnelseHtml = draft.begrunnelseHtml ?? '';
        charCount = begrunnelseHtml.replace(/<[^>]*>/g, '').trim().length;
        createdCase = draft.createdCase ?? null;
        ventendeOpprettelse = draft.ventendeOpprettelse ?? null;
        ventendeKrav = draft.ventendeKrav ?? null;
        hjemmelvelgerApen = !valgtHjemmel;
      }
    }
    draftReady = true;
  });
  $effect(() => {
    if (prosjektId && draftReady) saveDraft(dk, utkast());
  });

  const normalizedSearch = $derived(sok.trim().toLocaleLowerCase('nb-NO'));
  const sendLabel = $derived(
    valgtHjemmel?.kontraktsforhold.kode === 'ENDRING' && valgtHjemmel.hjemmel?.kode !== 'EO'
      ? 'Send varsel'
      : 'Send grunnlag'
  );
  const kjernehjemmel = $derived(demo ? null : (valgtHjemmel?.hjemmel ?? null));
  const kjernedato = $derived(
    kjernehjemmel && valgtHjemmel
      ? datofelt(valgtHjemmel.kontraktsforhold.kode, kjernehjemmel.kode)
      : null
  );
  const kjerneEo = $derived(!!kjernehjemmel && gjelderEndringsordre(kjernehjemmel.kode));
  const datoOppgitt = $derived(
    demo
      ? datoOppdaget.length > 0
      : !!kjernehjemmel &&
          (!kjernedato || !!datoer[kjernedato]) &&
          (!kjerneEo || endringsordre.trim().length > 0)
  );
  // #816: med et forsøk med usikkert utfall låses skjemaet, så «Prøv igjen» sender det TE så.
  const venter = $derived(!demo && Boolean(ventendeOpprettelse || ventendeKrav));
  const iKontroll = $derived(Boolean(letterConfirmation.letter) || Boolean(brevkontroll.letter));
  const canSend = $derived(
    tittel.trim().length >= 5 && datoOppgitt && valgtHjemmel !== null && charCount >= 10
  );

  function groupMatches(group: Kontraktsforhold): boolean {
    if (!normalizedSearch) return true;
    return groupLabelMatches(group) || group.hjemler.some((hjemmel) => hjemmelMatches(hjemmel));
  }

  function groupLabelMatches(group: Kontraktsforhold): boolean {
    if (!normalizedSearch) return false;
    return `${group.label} ${group.hjemmel_frist}`
      .toLocaleLowerCase('nb-NO')
      .includes(normalizedSearch);
  }

  function visibleHjemler(group: Kontraktsforhold): Kontraktshjemmel[] {
    if (!normalizedSearch || groupLabelMatches(group)) return group.hjemler;
    return group.hjemler.filter(hjemmelMatches);
  }

  function hjemmelMatches(hjemmel: Kontraktshjemmel): boolean {
    if (!normalizedSearch) return true;
    return `${hjemmel.label} ${hjemmel.hjemmel_basis} ${hjemmel.beskrivelse}`
      .toLocaleLowerCase('nb-NO')
      .includes(normalizedSearch);
  }

  function selectHjemmel(kontraktsforhold: Kontraktsforhold, hjemmel: Kontraktshjemmel | null) {
    valgtHjemmel = { kontraktsforhold, hjemmel };
    hjemmelvelgerApen = false;
    sok = '';
  }

  /**
   * Saken opprettes før brevkontrollen, fordi den låste teksten har saksnummeret
   * (LV-U4, DL-U6). Avbryter TE, står saken, og neste forsøk går til samme sak
   * (oppdragsgiver 16.10, avgjørelse 1 i #666).
   */
  async function sendTilKjernen(hovedkategori: string, underkategori: string) {
    if (!prosjektId) throw new Error('Saken kan ikke opprettes uten prosjekt.');
    const kommando = grunnlagskrav({
      hovedkategori,
      underkategori,
      datoer,
      endringsordre,
      utdypning: letterText(begrunnelseHtml),
    });
    if (!createdCase) {
      if (!ventendeOpprettelse) {
        // #711: kravet prøves før saken opprettes, så en avvisning etterlater ingen sak uten krav.
        const avvist = kravMotNySak(opprettelse(tittel), kommando, 'TE', KJERNE);
        if (avvist) throw avvisningFoerBrevet({ avvisning: avvist })!;
      }
      const forsoek = (ventendeOpprettelse ??= {
        kommandoId: nyKommandoId(),
        kommando: opprettelse(tittel),
      });
      saveDraft(dk, utkast());
      const utfall = await sendForsoek(forsoek, (f) =>
        opprettSak(f.kommandoId, f.kommando, prosjektId)
      );
      if (!utfall.lagret) {
        ventendeOpprettelse = utfall.ventende;
        saveDraft(dk, utkast());
        if (ventendeOpprettelse)
          throw new Error(usikkertUtfall('saken ble opprettet', 'den opprettes ikke to ganger'));
        throw utfall.feil;
      }
      ventendeOpprettelse = null;
      createdCase = { id: utfall.svar.sak_id, version: utfall.svar.versjon };
      saveDraft(dk, utkast());
    }
    // Siden er leserens side fra serveren (#705, #711), som også avgjør den.
    const sak = lagKjernesak({ sakId: createdCase.id, prosjektId, ventende: ventendeKrav });
    if (!(await sak.last())) throw new Error(sak.feil ?? 'Saken kunne ikke hentes.');
    // Kravet med usikkert utfall er kontrollert og sendes uendret på nytt.
    let lagret;
    if (ventendeKrav) lagret = await sak.provIgjen();
    else {
      const brev = sak.brev(kommando);
      const hindring = brev && avvisningFoerBrevet(brev);
      if (hindring) throw hindring;
      const tekst = brev && 'tekst' in brev ? brev.tekst : null;
      // Uten side sender ikke konteksten kravet, og den sier hvorfor (#695).
      if (tekst)
        await brevkontroll.show({
          tittel: `Grunnlag – ${tittel.trim()}`,
          tekst,
          utdypning: kommando.utdypning,
        });
      lagret = await sak.send(kommando, tekst ?? undefined);
    }
    ventendeKrav = sak.ventende;
    saveDraft(dk, utkast());
    if (!lagret) throw new Error(sak.feil ?? 'Kravet ble ikke sendt.');
    draftReady = false;
    clearDraft(dk);
  }

  $effect(() => {
    onactions?.({
      reviewing: iKontroll,
      canSend: canSend && !submission.pending,
      sendLabel: ventendeOpprettelse || ventendeKrav ? 'Prøv igjen' : 'Se brev og send',
      send: () => {
        if (!canSend || !valgtHjemmel) return;
        if (!demo) {
          const { kontraktsforhold, hjemmel } = valgtHjemmel;
          if (!hjemmel) return;
          void submission.run(
            () => sendTilKjernen(kontraktsforhold.kode, hjemmel.kode),
            () => {
              if (createdCase) oncreated?.(createdCase.id);
              onsend();
            }
          );
          return;
        }
        // Demoen viser brevet og skriver ingenting.
        const selection = valgtHjemmel;
        const basisData = {
          tittel: tittel.trim(),
          beskrivelse: begrunnelseHtml.trim(),
          varsler: buildKonsekvensVarsler(varsler, selection.kontraktsforhold.kode, tittel),
        };
        void submission.run(async () => {
          const section = (tittel: string, tekst: string) => ({
            tittel,
            originalTekst: tekst,
            redigertTekst: tekst,
          });
          const sender =
            projectStore.current?.settings.contract?.totalentreprenor_navn ?? 'Totalentreprenør';
          const recipient = projectStore.current?.settings.contract?.byggherre_navn ?? 'Byggherre';
          await letterConfirmation.show({
            tittel: `${sendLabel === 'Send varsel' ? 'Varsel om endring' : 'Grunnlag'} – ${basisData.tittel}`,
            avsender: { navn: sender, rolle: 'TE' },
            mottaker: { navn: recipient, rolle: 'BH' },
            referanser: {
              sakId: crypto.randomUUID(),
              sakstittel: basisData.tittel,
              eventId: 'utkast',
              sporType: 'grunnlag',
              dato: formatDateNorwegian(new Date().toISOString()),
            },
            seksjoner: {
              innledning: section('Innledning', `Vi varsler med dette om ${basisData.tittel}.`),
              begrunnelse: section(
                'Begrunnelse',
                [letterText(basisData.beskrivelse), ...Object.values(basisData.varsler)].join(
                  '\n\n'
                )
              ),
              avslutning: section('Avslutning', `Med vennlig hilsen\n${sender}`),
            },
          });
        }, onsend);
      },
    });
  });
</script>

{#snippet datofeltet(etikett: string, verdi: string, sett: (verdi: string) => void, hjelp: string)}
  <div class="field date-field">
    <label for="new-case-date">{etikett}</label>
    <div class="date-input-wrap">
      <CalendarDays size={16} aria-hidden="true" />
      <input
        id="new-case-date"
        type="date"
        value={verdi}
        oninput={(event) => sett(event.currentTarget.value)}
      />
    </div>
    <span class="field-help">{hjelp}</span>
  </div>
{/snippet}

<ClaimLetterView review={letterConfirmation} stepLabel="Grunnlag" />
{#if brevkontroll.letter}
  <Brevkontroll
    brev={brevkontroll.letter}
    beskrivelse="Saken er opprettet. Kravet sendes først når du bekrefter."
    onbekreft={brevkontroll.confirm}
    onavbryt={brevkontroll.cancel}
  />
{/if}

{#if !prosjektId || draftReady}
  <!-- Hidden, not unmounted: the pending submission resumes when the letter is confirmed. -->
  <div class="new-case-form" hidden={iKontroll}>
    {#if submission.pending}<p role="status">Oppretter saken …</p>{/if}
    {#if submission.error}<p role="alert">{submission.error}</p>{/if}
    <header class="form-header">
      <span class="eyebrow">Ny sak</span>
      <h1>Nytt grunnlag</h1>
      <p>
        Beskriv forholdet som kan gi grunnlag for krav om vederlagsjustering eller fristforlengelse.
      </p>
    </header>

    {#if venter}
      <p role="status" class="venter">
        Et forsøk venter på svar. Skjemaet er låst, og «Prøv igjen» sender det som ble sendt.
      </p>
    {/if}
    <div inert={venter} data-testid="skjemafelt">
      <FormSection title="Saksopplysninger">
        <div class="field">
          <label for="new-case-title">Kort tittel på forholdet</label>
          <input
            id="new-case-title"
            class="text-input"
            value={tittel}
            oninput={(event) => (tittel = event.currentTarget.value)}
            placeholder="Eksempel: Uforutsette grunnforhold ved akse C5–C8"
          />
          <span class="field-help">Bruk en tittel som gjør saken lett å kjenne igjen.</span>
        </div>

        {#if !demo}
          {#if kjernedato}
            {@const felt = kjernedato}
            {@render datofeltet(
              DATOSPOERSMAAL[felt],
              datoer[felt] ?? '',
              (verdi) => (datoer = { ...datoer, [felt]: verdi }),
              'Datoen står i brevet som din opplysning.'
            )}
          {/if}
          {#if kjerneEo}
            <div class="field">
              <label for="new-case-eo">Endringsordrens dato eller nummer</label>
              <input
                id="new-case-eo"
                class="text-input"
                value={endringsordre}
                oninput={(event) => (endringsordre = event.currentTarget.value)}
              />
            </div>
          {/if}
        {:else}
          {@render datofeltet(
            'Når ble forholdet oppdaget?',
            datoOppdaget,
            (verdi) => (datoOppdaget = verdi),
            'Datoen brukes ved vurderingen av kontraktens varslingsfrister.'
          )}
        {/if}
      </FormSection>

      <FormSection title="Kontraktsforhold">
        {#snippet aside()}
          {#if valgtHjemmel && !hjemmelvelgerApen}
            <button class="change-button" onclick={() => (hjemmelvelgerApen = true)}
              >Endre valg</button
            >
          {/if}
        {/snippet}
        <p class="section-intro">
          Velg forholdet totalentreprenøren mener byggherren har risikoen for.
        </p>

        {#if valgtHjemmel && !hjemmelvelgerApen}
          {@const forhold = valgtHjemmel.kontraktsforhold}
          {@const hjemmel = valgtHjemmel.hjemmel}
          {@const hjemmelRef = hjemmel?.hjemmel_basis ?? forhold.hjemmel_frist}
          {@const kontraktsregel = getKontraktsregel(hjemmelRef)}
          <div class="selected-basis">
            <div class="selected-header">
              <div>
                <span class="selected-category">{forhold.label}</span>
                <h3>{hjemmel?.label ?? forhold.label}</h3>
              </div>
              <span class="font-mono selected-ref">§ {hjemmelRef}</span>
            </div>
            <div class="selected-rule">
              {#if kontraktsregel}
                <p>{kontraktsregel.regel}</p>
                <p class="rule-consequence">{kontraktsregel.konsekvens}</p>
              {:else}
                <p>{hjemmel?.beskrivelse ?? forhold.beskrivelse}</p>
              {/if}
            </div>
          </div>
        {:else}
          <div class="basis-picker">
            <label class="search-field">
              <Search size={15} aria-hidden="true" />
              <input bind:value={sok} placeholder="Søk etter forhold eller paragraf" />
            </label>

            <div class="basis-groups">
              {#each kategorier as gruppe (gruppe.kode)}
                {#if groupMatches(gruppe)}
                  {@const isStandalone = gruppe.hjemler.length === 0}
                  {@const isOpen = apenKategori === gruppe.kode || normalizedSearch.length > 0}
                  <div class="basis-group">
                    <button
                      class="group-button"
                      onclick={() => {
                        if (isStandalone) selectHjemmel(gruppe, null);
                        else apenKategori = apenKategori === gruppe.kode ? null : gruppe.kode;
                      }}
                    >
                      <span>
                        <strong>{gruppe.label}</strong>
                        <small>{gruppe.type_krav}</small>
                      </span>
                      <span class="group-end">
                        <span class="font-mono">§ {gruppe.hjemmel_frist}</span>
                        {#if !isStandalone}
                          {#if isOpen}<ChevronUp size={15} />{:else}<ChevronDown size={15} />{/if}
                        {/if}
                      </span>
                    </button>

                    {#if !isStandalone && isOpen}
                      <div class="home-list">
                        {#each visibleHjemler(gruppe) as hjemmel (hjemmel.kode)}
                          <button
                            class="home-button"
                            onclick={() => selectHjemmel(gruppe, hjemmel)}
                          >
                            <span>{hjemmel.label}</span>
                            <span class="font-mono">§ {hjemmel.hjemmel_basis}</span>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      </FormSection>

      <FormSection title="Redegjørelse">
        {#snippet aside()}<span class="font-mono char-count">{charCount} tegn</span>{/snippet}
        <p class="section-intro">
          Beskriv hva som har skjedd, hvorfor forholdet omfattes av kontraktshjemmelen og hvilke
          konsekvenser det har.
        </p>
        <div class="editor-wrapper">
          <RichTextEditor
            body={begrunnelseHtml}
            navn="Redegjørelse"
            onchange={(html) => (begrunnelseHtml = html)}
            placeholder="Redegjør for grunnlaget..."
            maxHeight="none"
            oncharcount={(count) => (charCount = count)}
          />
        </div>
      </FormSection>
    </div>

    {#if demo}
      <KonsekvensVarsler
        bind:value={varsler}
        hovedkategori={valgtHjemmel?.kontraktsforhold.kode ?? ''}
        {tittel}
        disabled={submission.pending}
      />
    {/if}
  </div>
{/if}

<style>
  .new-case-form[hidden] {
    display: none;
  }
  .new-case-form {
    max-width: 840px;
    margin: 0 auto;
    padding: 36px 40px 120px;
  }
  .form-header {
    margin-bottom: 32px;
  }
  .venter {
    margin-bottom: 16px;
    padding: 8px 12px;
    border: 1px solid var(--color-wire-strong);
    background: var(--color-vekt-bg);
  }
  .eyebrow {
    display: block;
    margin-bottom: 5px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--ink-4);
  }
  .form-header h1 {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .form-header p {
    max-width: 640px;
    margin: 9px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-3);
  }
  .section-intro {
    margin: 10px 0 16px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-3);
  }
  .field {
    margin-top: 18px;
  }
  .field label {
    display: block;
    margin-bottom: 7px;
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .text-input,
  .date-input-wrap {
    width: 100%;
    background: var(--surface);
    border: var(--control-border);
    border-radius: 8px;
  }
  .text-input {
    min-height: 44px;
    padding: 10px 12px;
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--ink);
    outline: none;
  }
  .text-input:focus,
  .date-input-wrap:focus-within {
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }
  .field-help {
    display: block;
    margin-top: 6px;
    font-size: 11px;
    line-height: 1.45;
    color: var(--ink-4);
  }
  .date-field {
    max-width: 340px;
  }
  .date-input-wrap {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    padding: 0 12px;
    color: var(--ink-3);
  }
  .date-input-wrap input {
    flex: 1;
    padding: 10px 0;
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--ink);
    background: transparent;
    border: 0;
    outline: 0;
  }
  .change-button {
    padding: 0;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
    background: none;
    border: 0;
    cursor: pointer;
  }
  .basis-picker,
  .selected-basis {
    overflow: hidden;
    background: var(--surface);
    border: 0;
    border-radius: 0;
  }
  .search-field {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 12px;
    padding: 0 11px;
    min-height: 40px;
    color: var(--ink-4);
    background: var(--surface-inset);
    border: var(--rule-strong);
    border-radius: 999px;
  }
  .search-field:focus-within {
    border-color: var(--control-focus);
  }
  .search-field input {
    flex: 1;
    min-width: 0;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--ink);
    background: transparent;
    border: 0;
    outline: 0;
  }
  .basis-groups {
    border-top: var(--rule);
  }
  .basis-group + .basis-group {
    border-top: var(--rule);
  }
  .group-button,
  .home-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    font-family: var(--font-sans);
    text-align: left;
    color: var(--ink-2);
    background: var(--surface);
    border: 0;
    cursor: pointer;
  }
  .group-button {
    min-height: 52px;
    padding: 10px 14px;
  }
  .group-button:hover,
  .home-button:hover {
    color: var(--ink);
    background: var(--surface-warm);
  }
  .group-button > span:first-child {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .group-button strong {
    font-size: 13px;
    font-weight: 650;
  }
  .group-button small {
    font-size: 10px;
    color: var(--ink-4);
  }
  .group-end {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
    font-size: 11px;
    color: var(--ink-4);
  }
  .home-list {
    padding: 4px 8px 8px 20px;
    background: var(--surface-warm);
    border-top: var(--rule-subtle);
  }
  .home-button {
    min-height: 40px;
    padding: 8px 10px;
    font-size: 12px;
    background: transparent;
    border-bottom: var(--rule-subtle);
  }
  .home-button:last-child {
    border-bottom: 0;
  }
  .home-button .font-mono {
    flex: none;
    font-size: 10px;
    color: var(--ink-4);
  }
  .selected-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 15px 16px;
    border-bottom: var(--rule);
  }
  .selected-category {
    display: block;
    margin-bottom: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .selected-header h3 {
    margin: 0;
    font-size: 16px;
    line-height: 1.4;
    color: var(--ink);
  }
  .selected-ref {
    flex: none;
    font-size: 11px;
    color: var(--ink-4);
  }
  .selected-rule {
    margin: 0;
    padding: 15px 16px 16px 19px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink-2);
    background: var(--surface-warm);
    box-shadow: inset 3px 0 0 var(--brand);
  }
  .selected-rule p {
    margin: 0;
  }
  .selected-rule .rule-consequence {
    margin-top: 10px;
    color: var(--ink-3);
  }
  .char-count {
    font-size: 11px;
    color: var(--ink-4);
  }
  .editor-wrapper {
    margin-top: 0;
  }
  @media (max-width: 768px) {
    .new-case-form {
      padding: 24px 16px 120px;
    }
    .form-header h1 {
      font-size: 25px;
    }
    .date-field {
      max-width: none;
    }
  }
</style>
