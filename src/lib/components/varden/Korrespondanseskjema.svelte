<!--
  Korrespondanse parten har sendt utenfor løsningen, lagt til i saken (OV-U79, OV-U80, OV-U98),
  som prototypen `grunnlagsoversikt.html#reg-skjema` (arbeidsvalget 16.11 i #807). Først
  korrespondansen, så «Hva er det etter kontrakten?». Dokumentasjonen og aksepten legges til
  herfra. Et varsel, et krav eller et svar åpner skjemaet for det i samme forløp, som viser til
  korrespondansen. Kjernen avviser det den ikke godtar.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import type { Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Infotips from './Infotips.svelte';
  import Knapp from './Knapp.svelte';
  import Korrespondansen from './Korrespondansen.svelte';
  import Manglene from './Manglene.svelte';
  import Melding from './Melding.svelte';
  import Valg from './Valg.svelte';
  import { aksepten } from './kommandoer';
  import {
    dokumentasjonen,
    kategoriene,
    lagtTil,
    lagttilmangler,
    type Lagttilvalg,
  } from './korrespondansen';
  import Lagttilmerknader from './Lagttilmerknader.svelte';
  import { brevene } from './lesing';
  import type { Mangel } from './mangler';
  import { vedleggsgrense, vedleggskart } from './nysak';
  import { FORHOLDET, LEGG_TIL, SKJEMA, SPORNAVN, type Korrespondansekategori } from './tekster';

  let {
    kjernesak,
    u,
    spor,
    valg = $bindable(),
    onneste,
    onlagttil,
    onavbryt,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Sporet skjemaet er åpnet fra, som kravet, svaret og aksepten gjelder. */
    spor: Spor;
    /** Valgene står når parten går videre til krav- eller svarskjemaet og tilbake. */
    valg: Lagttilvalg;
    /** Varselet, kravet eller svaret fylles ut i skjemaet for det (OV-U80). */
    onneste: (kategori: 'varsel' | 'krav' | 'svar') => void;
    /** Dokumentasjonen eller aksepten er lagt til. */
    onlagttil: (kategori: 'dokumentasjon' | 'aksept') => void;
    onavbryt: () => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  const grense = vedleggsgrense((fil) => kjernesak.lastOppVedlegg(fil));
  const kategorier = $derived(kategoriene(kjernesak.part, spor, u, kjernesak.handlinger));
  // Et valg som ikke lenger står, er ikke valgt.
  $effect(() => {
    if (valg.kategori !== null && !kategorier.includes(valg.kategori)) valg.kategori = null;
  });

  // Byggherrens svar i sporet, med brevet hvert står i (arbeidsvalget 16.11, punkt 6).
  const alleBrev = $derived(brevene(u));
  const svarene = $derived(
    [...u.spor[spor].svar, ...u.spor[spor].svarUtenforRekken].flatMap((s) => {
      const b = alleBrev.find((x) => x.id === s.dokument);
      return b ? [{ verdi: s.id, tekst: LEGG_TIL.svaretValg(b) }] : [];
    })
  );

  const vedlegg = $derived(vedleggskart(valg.korrespondanse.vedlegg));
  const kommando = $derived(
    valg.kategori === 'dokumentasjon'
      ? dokumentasjonen(valg)
      : valg.kategori === 'aksept' && valg.svar
        ? lagtTil(aksepten(spor, valg.svar, kjernesak.regelversjon), valg.korrespondanse)
        : null
  );

  const feltene = $derived(lagttilmangler(valg));
  const mangler = $derived(
    Object.entries(feltene).map(
      ([felt, tekst]): Mangel => ({ felt: id(felt), post: null, tekst: tekst! })
    )
  );
  let forsoekt = $state(false);
  const feil = (felt: string): string | null =>
    forsoekt ? ((feltene as Record<string, string | undefined>)[felt] ?? null) : null;
  let oppsummering = $state<HTMLElement | null>(null);
  let hindring = $state<string | null>(null);

  const viderekategori = (k: Korrespondansekategori | null): k is 'varsel' | 'krav' | 'svar' =>
    k === 'varsel' || k === 'krav' || k === 'svar';

  async function send() {
    hindring = null;
    if (mangler.length) {
      forsoekt = true;
      await tick();
      oppsummering?.focus();
      return;
    }
    const k = valg.kategori;
    if (viderekategori(k)) return onneste(k);
    if (!kommando || (k !== 'dokumentasjon' && k !== 'aksept')) return;
    if (await kjernesak.send(kommando, undefined, vedlegg)) onlagttil(k);
    else {
      hindring = kjernesak.feil ?? SKJEMA.mangler;
      await tick();
      document.getElementById(id('hindring'))?.focus();
    }
  }

  function gaaTil(m: Mangel, e: MouseEvent) {
    e.preventDefault();
    document.getElementById(m.felt)?.focus();
  }
</script>

<Arbeidsflate>
  {#snippet hoved()}
    <form
      class="kort skjema"
      aria-labelledby={id('tittel')}
      novalidate
      onsubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <header>
        <h2 id={id('tittel')}>
          {LEGG_TIL.tittel}
          <Infotips navn={FORHOLDET.omKorrespondansen} tekst={FORHOLDET.omKorrespondansenTekst} />
        </h2>
        <p class="dempet">{LEGG_TIL.egen}</p>
      </header>

      {#if forsoekt && mangler.length}
        <Manglene tittel={SKJEMA.mangler} {mangler} ongaa={gaaTil} bind:element={oppsummering} />
      {/if}

      <div class="innhold">
        <Korrespondansen
          id={(felt) => id(felt)}
          bind:valg={valg.korrespondanse}
          feil={(felt) => feil(felt)}
          {grense}
          hva="korrespondanse"
        />

        <Valg
          navn={id('kategori')}
          spoersmaal={LEGG_TIL.kategorien}
          valg={kategorier.map((k) => ({ verdi: k, tekst: LEGG_TIL.kategorier[k] }))}
          bind:verdi={valg.kategori}
          feil={feil('kategori')}
          stablet
          lett
        />

        {#if valg.kategori === 'dokumentasjon'}
          <fieldset class="gjelder">
            <legend>{LEGG_TIL.gjelder}</legend>
            <p class="dempet">{LEGG_TIL.gjelderHjelp}</p>
            {#each ['forhold', 'vederlag', 'frist'] as const as s (s)}
              <label>
                <input type="checkbox" value={s} bind:group={valg.spor} />
                {SPORNAVN[s]}
              </label>
            {/each}
          </fieldset>
          <p class="dempet">{LEGG_TIL.dokumentasjon}</p>
        {:else if valg.kategori === 'aksept'}
          <Valg
            navn={id('svar')}
            spoersmaal={LEGG_TIL.svaret}
            valg={svarene}
            bind:verdi={valg.svar}
            feil={feil('svar')}
            beskrevetAv={id('svar-hjelp')}
            stablet
            lett
          />
          <p class="dempet" id={id('svar-hjelp')}>{LEGG_TIL.svaretHjelp}</p>
        {:else if viderekategori(valg.kategori)}
          <p class="dempet">{LEGG_TIL.neste[valg.kategori]}</p>
        {/if}

        {#if valg.kategori === 'aksept' && kommando}
          <Lagttilmerknader {kjernesak} {u} {spor} {kommando} {vedlegg} />
        {/if}

        <div class="knapper">
          <Knapp
            variant="primaer"
            onclick={send}
            opptatt={kjernesak.sender}
            aria-describedby={hindring ? id('hindring') : undefined}
            >{viderekategori(valg.kategori) ? LEGG_TIL.gaaVidere : LEGG_TIL.leggTil}</Knapp
          >
          <Knapp variant="lenke" onclick={onavbryt}>{LEGG_TIL.avbryt}</Knapp>
        </div>
        {#if hindring}
          <Melding art="feil" levende={false} id={id('hindring')} tabindex="-1">{hindring}</Melding>
        {/if}
      </div>
    </form>
  {/snippet}
</Arbeidsflate>

<style>
  header {
    padding: var(--spacing-5) var(--spacing-6) 0;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
  }
  .innhold {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    padding: var(--spacing-5) var(--spacing-6) var(--spacing-6);
  }
  .gjelder {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    border: 0;
    padding: 0;
    margin: 0;
  }
  .gjelder legend {
    font-weight: 600;
    margin-bottom: var(--spacing-1);
  }
  .gjelder label {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
    text-wrap: pretty;
  }
  .knapper {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2) var(--spacing-5);
  }
</style>
