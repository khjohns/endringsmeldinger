<!--
  «Bare varsle, uten krav» i kravskjemaet for vederlaget (BF-37, prototypen
  `varsler-i-ett-brev.html#varsler`, U-11 i BF-14). Valget øverst bytter til kravet (U-1). Varslene
  står som leselinjer, og én rad er åpen om gangen (`system.md`, «Én leselinje til du åpner»):
  varselet som synlige alternativer, arbeidet etter punkt 34.3.3 og 34.4 (U-3) og datoen etter punkt
  34.1.3 (U-1 i BF-48). «Hvordan varsler du?» sender brevet fra løsningen eller registrerer et
  varsel sendt utenfor løsningen, med én dato for alle varslene (U-5). Kjernen tilbyr
  bestemmelsene, lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { varsleneISporet } from '#lib/kjernesak/kontekst.svelte.ts';
  import { arbeidetI } from '#lib/kjernesak/vederlagskrav.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Brevskjema from './Brevskjema.svelte';
  import Datofelt from './Datofelt.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Knapp from './Knapp.svelte';
  import Korrespondansen from './Korrespondansen.svelte';
  import Linjefelt from './Linjefelt.svelte';
  import Sendevalg from './Sendevalg.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Valg from './Valg.svelte';
  import {
    brevet,
    brevene,
    datoerISporet,
    sisteKunnskapsdatoen,
    kunnskapsdatoTilbudt,
  } from './lesing';
  import { fokuser, type Mangel } from './mangler';
  import { vedleggsgrense } from './nysak';
  import { sendeflyt } from './sendeflyt.svelte';
  import { korrespondansenoekkel, tomKorrespondanse } from './korrespondansen';
  import {
    dagensDato,
    dato,
    hjemmelsmerke,
    KRAVSKJEMA,
    KUNNSKAPSDATO,
    OPPGITT,
    VEDERLAGSVARSEL,
  } from './tekster';
  import {
    harArbeid,
    hjemlerForRaden,
    kanVarsle,
    manglerIVarslingen,
    nyVarselrad,
    tilbudteHjemler,
    varslingen,
    vedleggIVarslingen,
    type Varselrad,
    type Varslingsvalg,
  } from './vederlagsvarsel';

  let {
    kjernesak,
    u,
    valg = $bindable(),
    kanKreve,
    onkrav,
    onbrevkontroll,
    onforkast,
    onvedsiden,
    onregistrert,
    onkunnskapsdato,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    valg: Varslingsvalg;
    /** Kjernen tilbyr kravet, så valget øverst kan bytte til det (U-1). */
    kanKreve: boolean;
    onkrav: () => void;
    onbrevkontroll: (
      k: TilBrevkontrollen & { vedlegg: ReturnType<typeof vedleggIVarslingen> }
    ) => void;
    onforkast: () => void;
    onvedsiden?: (vedSiden: boolean) => void;
    /** Varslene sendt utenfor løsningen er registrert. */
    onregistrert: () => void;
    /** TE endrer datoen etter § 34.1.3 i et eget brev (U-10 i BF-48). */
    onkunnskapsdato?: (varselet: string) => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;
  const iDag = dagensDato();

  const { kanSende, kanRegistrere } = $derived(kanVarsle(kjernesak.handlinger));
  const registreres = $derived(valg.utenfor !== null);
  const tilbudt = $derived(tilbudteHjemler(kjernesak.handlinger, registreres));
  const alleBrev = $derived(brevene(u));
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('vederlag')));
  // U-3, D-2: varslene som alt er gitt i saken, med brevet.
  const gitte = $derived(varsleneISporet(u, 'vederlag'));
  // U-10 og D-7 i BF-48: etter at datoen er oppgitt, står den fast i et varsel fra løsningen, med
  // veien til det egne brevet (`kunnskapsdatoIVarselet` i kjernen). Et varsel som registreres, kan
  // ha datoen brevet oppga (U-11, D-1).
  const sisteKunnskapsdato = $derived(sisteKunnskapsdatoen(u));
  const datoenStaarFast = $derived(!!sisteKunnskapsdato && !registreres);
  const kunnskapsdatoVarselet = $derived(kunnskapsdatoTilbudt(kjernesak.tilbudte));

  // Den åpne raden: `null` er ingen. En ny rad åpnes.
  let aapen = $state<string | null>(null);

  const navnet = (r: Varselrad) => KRAVSKJEMA.varselnavn[r.hjemmel]!;
  const nummeret = (r: Varselrad) => valg.rader.indexOf(r) + 1;
  /** U-9: det som står under navnet, i raden og i oppsummeringen. */
  function under(r: Varselrad): string {
    if (harArbeid(r.hjemmel))
      return (
        r.arbeid.trim() ||
        (registreres ? VEDERLAGSVARSEL.arbeidIkkeOppgitt : VEDERLAGSVARSEL.manglerArbeid)
      );
    if (r.hjemmel === '34.1.3')
      return r.klarOver
        ? `${OPPGITT.klar_over_utgiftene} ${dato(r.klarOver)}`
        : VEDERLAGSVARSEL.gjelderSaerskilt;
    return VEDERLAGSVARSEL.gjelderHele;
  }

  const sendes = $derived(registreres ? valg.utenfor!.dato || null : iDag);
  const mangler: Mangel[] = $derived(manglerIVarslingen(valg, uid, navnet, sendes, tilbudt));
  const kommando = $derived(varslingen(valg));
  const vedlegg = $derived(vedleggIVarslingen(valg));
  const flyt = sendeflyt(() => kjernesak, id('hindring'));
  const feil = (felt: string): string | null => flyt.feil(mangler.find((m) => m.felt === id(felt)));
  let oppsummering = $state<HTMLElement | null>(null);
  const grense = vedleggsgrense((fil) => kjernesak.lastOppVedlegg(fil));

  const ledige = $derived(hjemlerForRaden(valg, null, tilbudt));

  async function leggTil() {
    const r = nyVarselrad(valg, ledige[0]!);
    valg.rader.push(r);
    await endre(r);
  }
  async function fjern(r: Varselrad) {
    valg.rader = valg.rader.filter((x) => x !== r);
    if (aapen === r.noekkel) aapen = null;
    await fokuser(() => document.getElementById(id('legg-til')));
  }
  async function endre(r: Varselrad) {
    aapen = r.noekkel;
    await fokuser(() =>
      document.querySelector<HTMLElement>(`#${CSS.escape(id(`rad-${r.noekkel}`))} input`)
    );
  }
  async function gaaTil(m: Mangel, e: Event) {
    if (m.post === null || aapen === m.post) return;
    e.preventDefault();
    aapen = m.post;
    await fokuser(() => document.getElementById(m.felt));
  }
  function velgMaate(x: 'send' | 'registrer' | null) {
    valg.utenfor = x === 'registrer' ? (valg.utenfor ?? tomKorrespondanse()) : null;
    if (datoenStaarFast) for (const r of valg.rader) r.klarOver = '';
  }

  const punkter = $derived(
    valg.rader.map((r, i) => ({
      punkt: r.noekkel,
      navn: `${i + 1}. ${navnet(r)}`,
      aktiv: aapen === r.noekkel,
      linjer: [{ tekst: under(r), lag: null }],
    }))
  );
  // Datoene TE fyller ut, i tidslinja (U-2 i BF-48).
  const utfylt = $derived([
    ...valg.rader.flatMap((r) =>
      r.hjemmel === '34.1.3' && r.klarOver
        ? [
            {
              naar: r.klarOver,
              hva: OPPGITT.klar_over_utgiftene,
              kilde: VEDERLAGSVARSEL.oppgisIVarselet,
            },
          ]
        : []
    ),
    ...(registreres
      ? valg.utenfor!.dato
        ? [{ naar: valg.utenfor!.dato, hva: OPPGITT.sendt, kilde: VEDERLAGSVARSEL.oppgisIVarselet }]
        : []
      : [{ naar: iDag, hva: VEDERLAGSVARSEL.sendes, kilde: KRAVSKJEMA.naarDuSender }]),
  ]);

  function seBrevet() {
    return flyt.send({
      mangler: mangler.length ? () => oppsummering : null,
      kommando,
      vedlegg,
      registrert: registreres ? onregistrert : null,
      kanIkkeLages: KRAVSKJEMA.kanIkkeLages,
      tilBrevkontrollen: (brevet) =>
        onbrevkontroll({ kommando, vedlegg, ...brevet, virkninger: [VEDERLAGSVARSEL.virkning] }),
    });
  }
</script>

{#snippet fastDato()}
  <p class="dempet">{KUNNSKAPSDATO.fast(sisteKunnskapsdato)}</p>
  {#if kunnskapsdatoVarselet && onkunnskapsdato}
    <div>
      <Knapp variant="lenke" onclick={() => onkunnskapsdato(kunnskapsdatoVarselet)}
        >{KUNNSKAPSDATO.egetBrevLenke(sisteKunnskapsdato !== null)}</Knapp
      >
    </div>
  {/if}
{/snippet}

{#snippet raden(r: Varselrad)}
  {@const n = r.noekkel}
  <div class="linje">
    <span class="nr" aria-hidden="true">{nummeret(r)}</span>
    <h4 class="navn">
      <span class="visually-hidden">{nummeret(r)}.</span>{navnet(r)}
      <span class="merke">{hjemmelsmerke(r.hjemmel)}</span>
    </h4>
    <span class="handlinger">
      {#if aapen !== n}
        <Knapp
          variant="lenke"
          aria-label={VEDERLAGSVARSEL.endreRaden(navnet(r))}
          onclick={() => endre(r)}>{VEDERLAGSVARSEL.endre}</Knapp
        >
      {/if}
      <Knapp
        variant="lenke"
        aria-label={VEDERLAGSVARSEL.fjernRaden(navnet(r))}
        onclick={() => fjern(r)}>{VEDERLAGSVARSEL.fjern}</Knapp
      >
    </span>
    {#if aapen !== n}<p
        class="under"
        class:mangler={!!(feil(`arbeid-${n}`) || feil(`hjemmel-${n}`) || feil(`klar-over-${n}`))}
      >
        {under(r)}
      </p>{/if}
  </div>
  {#if aapen === n}
    <div class="aapen">
      <Valg
        navn={id(`hjemmel-${n}`)}
        spoersmaal={VEDERLAGSVARSEL.hvaVarsler}
        stablet
        lett
        valg={hjemlerForRaden(valg, r, tilbudt).map((h) => ({
          verdi: h,
          tekst: `${KRAVSKJEMA.varselnavn[h]} (${hjemmelsmerke(h)})`,
        }))}
        bind:verdi={
          () => r.hjemmel,
          (x) => {
            if (x === null) return;
            r.hjemmel = x;
            if (!harArbeid(x)) r.arbeid = '';
            if (x !== '34.1.3') r.klarOver = '';
          }
        }
        feil={feil(`hjemmel-${n}`)}
      />
      {#if harArbeid(r.hjemmel)}
        <Linjefelt
          id={id(`arbeid-${n}`)}
          etikett={VEDERLAGSVARSEL.arbeid}
          hjelp={registreres ? VEDERLAGSVARSEL.arbeidHjelpRegistrert : VEDERLAGSVARSEL.arbeidHjelp}
          bredde="tekst"
          paakrevd={!registreres}
          valgfri={registreres}
          bind:verdi={r.arbeid}
          feil={feil(`arbeid-${n}`)}
        />
      {:else if r.hjemmel === '34.1.3'}
        {#if datoenStaarFast}
          {@render fastDato()}
        {:else}
          <Datofelt
            id={id(`klar-over-${n}`)}
            etikett={KUNNSKAPSDATO.etikett}
            hjelp={KUNNSKAPSDATO.hjelp}
            maks={sendes ?? iDag}
            valgfri
            bind:verdi={r.klarOver}
            feil={feil(`klar-over-${n}`)}
          />
          {#if sisteKunnskapsdato}{@render fastDato()}{/if}
        {/if}
      {/if}
      <div class="fot">
        <Knapp onclick={() => (aapen = null)}>{VEDERLAGSVARSEL.ferdig}</Knapp>
      </div>
    </div>
  {/if}
{/snippet}

<Brevskjema
  id={id('tittel')}
  tittel={registreres ? VEDERLAGSVARSEL.tittelRegistrert : VEDERLAGSVARSEL.tittel}
  {kjernesak}
  {u}
  avsender="TE"
  sendes={!registreres}
  {onvedsiden}
  part={kjernesak.part}
  {flyt}
  {mangler}
  manglerTittel={KRAVSKJEMA.mangler}
  ongaa={gaaTil}
  bind:oppsummering
  forkastTekst={VEDERLAGSVARSEL.forkastTekst}
  {onforkast}
  knapp={{
    tekst: registreres ? VEDERLAGSVARSEL.registrer : KRAVSKJEMA.seBrevet,
    onclick: seBrevet,
    opptatt: registreres && kjernesak.sender,
  }}
  kompakt={{ etikett: VEDERLAGSVARSEL.panel }}
>
  {#snippet panel(sendeknapp)}
    <!-- U-5: ved registrering sier panelet at løsningen ikke lager brevtekst, over knappen. -->
    {#snippet handling()}
      {#if registreres}<p class="panelmerknad">{VEDERLAGSVARSEL.ingenBrevtekst}</p>{/if}
      {@render sendeknapp?.()}
    {/snippet}
    <Hovedlinjer
      linjer={[]}
      {punkter}
      alternativer={false}
      {handling}
      tittel={VEDERLAGSVARSEL.panel}
      tom={VEDERLAGSVARSEL.tomt}
    />
  {/snippet}
  {#snippet tidslinje()}
    <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'vederlag')} {utfylt} />
  {/snippet}

  {#if kanKreve}
    <Sendevalg navn={id('hva')} hva="varsel" onvelg={(x) => x === 'krav' && onkrav()} />
  {/if}

  <section class="seksjon" id={id('varslene')} aria-labelledby={id('varslene-tittel')}>
    <div class="seksjonshode">
      <h3 id={id('varslene-tittel')}>{VEDERLAGSVARSEL.varslene}</h3>
    </div>
    <p class="intro">
      {registreres ? VEDERLAGSVARSEL.radhjelpRegistrert : VEDERLAGSVARSEL.radhjelp}
    </p>
    {#if valg.rader.length}
      <ol class="rader">
        {#each valg.rader as r (r.noekkel)}
          <li class="rad" id={id(`rad-${r.noekkel}`)} class:er-aapen={aapen === r.noekkel}>
            {@render raden(r)}
          </li>
        {/each}
      </ol>
    {/if}
    <div class="leggtil">
      {#if ledige.length}
        <Knapp id={id('legg-til')} onclick={leggTil}>{VEDERLAGSVARSEL.leggTil}</Knapp>
      {:else}
        <p class="dempet" id={id('legg-til')} tabindex="-1">{VEDERLAGSVARSEL.ingenFlere}</p>
      {/if}
    </div>
    {#if feil('legg-til')}<p class="feilmelding">{feil('legg-til')}</p>{/if}
    {#if gitte.length}
      <ul class="gitte">
        {#each gitte as g (g.id)}
          <li>
            {VEDERLAGSVARSEL.gitt(
              KRAVSKJEMA.varselnavn[g.hjemmel] ?? g.hjemmel,
              brevet(u, g.dokument),
              arbeidetI(u, g.id)
            )}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section
    class="seksjon"
    aria-labelledby={kanSende && kanRegistrere ? undefined : id('maate-tittel')}
  >
    {#if kanSende && kanRegistrere}
      <Valg
        navn={id('maate')}
        spoersmaal={VEDERLAGSVARSEL.hvordan}
        valg={[
          { verdi: 'send' as const, tekst: VEDERLAGSVARSEL.maate.send },
          { verdi: 'registrer' as const, tekst: VEDERLAGSVARSEL.maate.registrer },
        ]}
        bind:verdi={() => (registreres ? 'registrer' : 'send'), velgMaate}
        lett
        stablet
      />
    {:else}
      <div class="seksjonshode">
        <h3 id={id('maate-tittel')}>{VEDERLAGSVARSEL.hvordan}</h3>
      </div>
    {/if}
    {#if valg.utenfor}
      <div class="innrykk">
        <Korrespondansen
          id={(felt) => id(korrespondansenoekkel('utenfor', felt))}
          bind:valg={valg.utenfor}
          feil={(felt) => feil(korrespondansenoekkel('utenfor', felt))}
          {grense}
          kapittelB
        />
      </div>
    {/if}
    {#if !registreres}<p class="dempet">{VEDERLAGSVARSEL.avsnittPerVarsel}</p>{/if}
  </section>
</Brevskjema>

<style>
  .seksjon {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
  }
  .seksjonshode {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
  }
  .intro,
  .dempet,
  .gitte {
    font-size: 14px;
    color: var(--ink-2);
  }
  .rader {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: var(--rule-subtle);
  }
  .rad {
    border-bottom: var(--rule-subtle);
  }
  .linje {
    display: grid;
    grid-template-columns: 2ch 1fr auto;
    column-gap: var(--spacing-3);
    row-gap: var(--spacing-1);
    align-items: baseline;
    padding: var(--spacing-3) 0;
  }
  .nr {
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }
  .navn {
    font-size: 15px;
    font-weight: 600;
  }
  .merke {
    margin-left: var(--spacing-2);
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .handlinger {
    display: flex;
    gap: var(--spacing-3);
  }
  /* På smal skjerm står «Endre» og «Fjern» under arbeidet, så navnet får bredden. */
  @media (max-width: 480px) {
    .linje {
      grid-template-columns: 2ch 1fr;
    }
    .handlinger {
      grid-column: 2;
      order: 1;
    }
  }
  .under {
    grid-column: 2 / -1;
    font-size: 14px;
    color: var(--ink-2);
  }
  .under.mangler {
    color: var(--danger);
    font-weight: 500;
  }
  .aapen {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    padding: 0 0 var(--spacing-4) calc(2ch + var(--spacing-3));
  }
  .fot {
    display: flex;
  }
  .leggtil {
    display: flex;
  }
  .gitte {
    display: grid;
    margin-top: var(--spacing-2);
    gap: var(--spacing-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .innrykk {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  .panelmerknad {
    margin-bottom: var(--spacing-3);
    font-size: 14px;
    color: var(--ink-2);
  }
  .feilmelding {
    font-size: 14px;
    color: var(--danger);
  }
</style>
