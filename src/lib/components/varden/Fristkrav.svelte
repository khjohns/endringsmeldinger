<!--
  TE krever fristforlengelse (G-3 i BF-20, prototypen `fristkrav-te.html#nytt-krav`): én rad per
  frist i kontrakten med dagene for den fristen (U-1, KA-U74), og fristen fra fristtabellen for
  prosjektet eller en frist som ikke er registrert (KA-U79). En ny versjon har fristene fra forrige
  versjon, og en frist som tas ut, trekkes (U-10). Gjeldende frist og ny dato venter på G-2 (U-2,
  arbeidsvalget 14.11 i #1745). Kommandoen bygges i `fristkrav.ts`, og kjernen lager brevet og
  avviser det den ikke godtar.
-->
<script lang="ts">
  import { BookOpen } from 'lucide-svelte';
  import { tick, untrack } from 'svelte';
  import { dager } from '$kjerne/frosset/tekst';
  import type { Utledning } from '$kjerne/utledning/utled';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { kontrollbrev, type TilBrevkontrollen } from './Brevkontroll.svelte';
  import { fastLinje } from './fastlinje.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import Valg from './Valg.svelte';
  import {
    fristkravet,
    manglerIFristkravet,
    nyFristpost,
    startvalg,
    type Fristkravvalg,
    type Fristpostvalg,
  } from './fristkrav';
  import { heleDager } from './fristsvar';
  import { brevene, datoerISporet, hovedkategorien } from './lesing';
  import { FRISTKRAV, HOVEDLINJER, SKJEMA } from './tekster';

  let {
    kjernesak,
    u,
    valg = $bindable(null),
    onbrevkontroll,
    onforkast,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når TE går til brevkontrollen og tilbake. `null` fyller skjemaet fra saken. */
    valg?: Fristkravvalg | null;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    onforkast: () => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  if (!untrack(() => valg)) valg = startvalg(untrack(() => u));
  const v = $derived(valg!);

  const tabell = $derived(kjernesak.kontraktsfrister);
  const alleBrev = $derived(brevene(u));
  const brevMed = (dokument: string | null | undefined) =>
    alleBrev.find((b) => b.id === dokument) ?? null;
  const forrige = $derived(brevMed(u.spor.frist.gjeldendeKrav?.dokument));
  // Varselet etter punkt 33.4 er det registrerte varselet, ellers det første kravet i sporet
  // (`varselVedKravet` i kjernen). Uten noen av dem er dette kravet varselet (U-6).
  const varselbrev = $derived(
    brevMed(u.spor.frist.varsler['33.4']?.dokument ?? u.spor.frist.krav[0]?.dokument)
  );
  // § 33.3 for force majeure, ellers § 33.1, som brevteksten i kjernen og svarskjemaet.
  const hindringPunkt = $derived(hovedkategorien(u) === 'force_majeure' ? '33.3' : '33.1');
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('frist')));
  const datoer = $derived(datoerISporet(u, 'frist'));

  /** Navnet fristen står med i skjemaet og panelet, som i brevet (`betegnelsen` i kjernen). */
  function navnet(p: Fristpostvalg): string {
    if (typeof p.frist === 'number') {
      const f = tabell.find((x) => x.fristId === p.frist);
      if (f) return [f.nummer, f.navn].filter(Boolean).join(' ');
    }
    const n = [p.nummer.trim(), p.navn.trim()].filter(Boolean).join(' ');
    return n || FRISTKRAV.frist(v.frister.indexOf(p) + 1);
  }

  const kommando = $derived(fristkravet(v));
  const mangler = $derived(manglerIFristkravet(v, uid, navnet));
  let forsoekt = $state(false);
  const feil = (felt: string): string | null =>
    forsoekt ? (mangler.find((m) => m.felt === id(felt))?.tekst ?? null) : null;
  const begrunnelseFeil = $derived(feil('begrunnelse'));
  let oppsummering = $state<HTMLElement | null>(null);
  let sendehindring = $state<string | null>(null);

  const linjer = $derived(
    v.frister.map((p) => {
      if (p.trukket) return { tekst: FRISTKRAV.trukketLinje(navnet(p)), lag: null };
      const d = heleDager(p.dager);
      return {
        tekst: FRISTKRAV.linje(navnet(p), d === undefined ? FRISTKRAV.ikkeOppgitt : dager(d)),
        lag: null,
      };
    })
  );
  const antall = $derived(v.frister.filter((p) => !p.trukket).length);

  async function leggTil() {
    const p = nyFristpost();
    v.frister.push(p);
    await tick();
    document.getElementById(id(`frist-${p.noekkel}`))?.focus();
  }
  async function fjern(p: Fristpostvalg) {
    const i = v.frister.indexOf(p);
    v.frister.splice(i, 1);
    await tick();
    document.getElementById(id('legg-til'))?.focus();
  }

  async function seBrevet() {
    sendehindring = null;
    if (mangler.length) {
      forsoekt = true;
      await tick();
      oppsummering?.focus();
      return;
    }
    const b = kjernesak.brev(kommando, undefined, true);
    const brevet = kontrollbrev(b);
    if (!brevet) {
      sendehindring = brevaarsak(b) ?? FRISTKRAV.kanIkkeLages;
      await tick();
      document.getElementById(id('hindring'))?.focus();
      return;
    }
    onbrevkontroll({
      kommando,
      ...brevet,
      detteSender: [{ tekst: FRISTKRAV.detteSender(antall), lag: null }],
      virkninger: [],
    });
  }

  let panel = $state<HTMLElement | null>(null);
  const linja = fastLinje(
    uid,
    () => panel,
    () => false
  );
</script>

{#snippet sendeknapp()}
  <div class="handling">
    <Knapp
      variant="primaer"
      onclick={seBrevet}
      aria-describedby={sendehindring ? id('hindring') : undefined}>{HOVEDLINJER.seBrevet}</Knapp
    >
  </div>
  {#if sendehindring}
    <Melding art="feil" levende={false} id={id('hindring')} tabindex="-1">{sendehindring}</Melding>
  {/if}
{/snippet}

{#snippet felt(
  p: Fristpostvalg,
  navn: 'nummer' | 'navn' | 'dager',
  etikett: string,
  hjelp: string | null
)}
  {@const fid = id(`${navn}-${p.noekkel}`)}
  {@const f = feil(`${navn}-${p.noekkel}`)}
  <div class="tallfelt" class:smalt={navn !== 'navn'}>
    <label for={fid}>{etikett}</label>
    {#if hjelp}<span class="dempet" id={`${fid}-hjelp`}>{hjelp}</span>{/if}
    <span class="inndata" class:ugyldig={f} class:tekst={navn !== 'dager'}>
      <input
        id={fid}
        inputmode={navn === 'dager' ? 'numeric' : undefined}
        bind:value={p[navn]}
        aria-describedby={[hjelp ? `${fid}-hjelp` : '', f ? `${fid}-feil` : '']
          .filter(Boolean)
          .join(' ') || undefined}
        aria-invalid={f ? 'true' : undefined}
      />
      {#if navn === 'dager'}<span class="enhet" aria-hidden="true">dager</span>{/if}
    </span>
    {#if f}<p class="feilmelding" id={`${fid}-feil`}>{f}</p>{/if}
  </div>
{/snippet}

{#snippet fristrad(p: Fristpostvalg)}
  {@const ny = p.id === null && forrige !== null}
  {@const sid = id(`frist-${p.noekkel}`)}
  {@const fFeil = feil(`frist-${p.noekkel}`)}
  <li class="frist" class:trukket={p.trukket} aria-labelledby={`${sid}-tittel`}>
    <div class="frist-hode">
      <h4 id={`${sid}-tittel`}>{navnet(p)}</h4>
      {#if ny}<span class="merke">{FRISTKRAV.nyIVersjonen}</span>{/if}
      {#if p.trukket}<span class="merke">{FRISTKRAV.trekkes}</span>{/if}
      <span class="frist-handling">
        {#if p.id !== null}
          <Knapp
            variant="lenke"
            aria-label={p.trukket ? FRISTKRAV.angreTrekk(navnet(p)) : FRISTKRAV.trekk(navnet(p))}
            onclick={() => (p.trukket = !p.trukket)}
            >{p.trukket ? FRISTKRAV.angre : FRISTKRAV.trekkTekst}</Knapp
          >
        {:else if v.frister.length > 1}
          <Knapp
            variant="lenke"
            aria-label={FRISTKRAV.fjernFrist(navnet(p))}
            onclick={() => fjern(p)}>{FRISTKRAV.fjern}</Knapp
          >
        {/if}
      </span>
    </div>
    {#if !p.trukket}
      {#if p.id === null}
        <Valg
          navn={sid}
          spoersmaal={FRISTKRAV.fristEtikett}
          valg={[
            ...tabell.map((f) => ({
              verdi: String(f.fristId),
              tekst: [f.nummer, f.navn].filter(Boolean).join(' '),
            })),
            { verdi: 'annen', tekst: FRISTKRAV.ikkeRegistrert },
          ]}
          bind:verdi={
            () => (p.frist === null ? null : String(p.frist)),
            (x) => (p.frist = x === null || x === 'annen' ? x : Number(x))
          }
          feil={fFeil}
          lett
          stablet
        />
      {/if}
      {#if p.frist === 'annen'}
        <p class="dempet">{FRISTKRAV.ikkeRegistrertHjelp}</p>
        <div class="rad">
          {@render felt(p, 'nummer', FRISTKRAV.nummerEtikett, FRISTKRAV.nummerHjelp)}
          {@render felt(p, 'navn', FRISTKRAV.navnEtikett, null)}
        </div>
      {/if}
      {@render felt(p, 'dager', FRISTKRAV.dagerEtikett, FRISTKRAV.delAvArbeidene)}
    {/if}
  </li>
{/snippet}

<Arbeidsflate>
  {#snippet hoved()}
    <Utkastkort
      id={id('tittel')}
      tittel={FRISTKRAV.tittel}
      undertittel={forrige ? FRISTKRAV.nyVersjon(forrige) : null}
      mottaker={FRISTKRAV.til}
    >
      {#if forsoekt && mangler.length}
        <div
          class="mangler"
          role="group"
          tabindex="-1"
          bind:this={oppsummering}
          aria-labelledby={id('mangler')}
        >
          <p id={id('mangler')}>{SKJEMA.mangler}</p>
          <ul>
            {#each mangler as m (m.felt)}
              <li><a href={`#${m.felt}`}>{m.tekst}</a></li>
            {/each}
          </ul>
        </div>
      {/if}

      <section class="spoersmaal" aria-labelledby={id('sp-varsel')}>
        <div class="sp-hode">
          <h3 id={id('sp-varsel')}>{FRISTKRAV.varselTittel}</h3>
          <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 33.4</span>
        </div>
        <p class="dempet">{FRISTKRAV.varselHjelp}</p>
        <p class="status">
          {varselbrev ? FRISTKRAV.varseletSendt(varselbrev) : FRISTKRAV.kravetErVarselet}
        </p>
      </section>

      <section class="spoersmaal" aria-labelledby={id('sp-frister')}>
        <div class="sp-hode">
          <h3 id={id('sp-frister')}>{FRISTKRAV.fristerTittel}</h3>
          <span class="hjemmel"
            ><BookOpen size={14} aria-hidden="true" />punkt {hindringPunkt} og 33.6.1</span
          >
        </div>
        <p class="dempet">{FRISTKRAV.fristerHjelp}</p>
        {#if forrige}<p class="dempet">{FRISTKRAV.trekkHjelp}</p>{/if}
        <ul class="frister">
          {#each v.frister as p (p.noekkel)}
            {@render fristrad(p)}
          {/each}
        </ul>
        <div>
          <Knapp variant="sekundaer" id={id('legg-til')} onclick={leggTil}
            >{FRISTKRAV.leggTil}</Knapp
          >
        </div>
      </section>

      <section class="spoersmaal" aria-labelledby={id('sp-begrunnelse')}>
        <div class="sp-hode">
          <h3 id={id('sp-begrunnelse')}>{FRISTKRAV.begrunnelseTittel}</h3>
          <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 33.5 og 33.6.1</span>
        </div>
        <span class="dempet" id={id('begrunnelse-hjelp')}>{FRISTKRAV.begrunnelseHjelp}</span>
        <textarea
          id={id('begrunnelse')}
          rows="6"
          aria-labelledby={id('sp-begrunnelse')}
          bind:value={v.begrunnelse}
          class:ugyldig={begrunnelseFeil}
          aria-describedby={begrunnelseFeil
            ? `${id('begrunnelse-hjelp')} ${id('begrunnelse-feil')}`
            : id('begrunnelse-hjelp')}
          aria-invalid={begrunnelseFeil ? 'true' : undefined}
        ></textarea>
        {#if begrunnelseFeil}<p class="feilmelding" id={id('begrunnelse-feil')}>
            {begrunnelseFeil}
          </p>{/if}
      </section>

      <div class="skjemafot">
        <Forkastutkast tekst={FRISTKRAV.forkastTekst} {onforkast} />
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    <div class="feste" class:fast={linja.faarPlass} bind:this={panel}>
      <Hovedlinjer
        {linjer}
        alternativer={false}
        handling={sendeknapp}
        tittel={FRISTKRAV.punktene}
        tom={FRISTKRAV.ingenFrister}
      />
    </div>
    <Tidslinje brev={sporbrev} {datoer} />
  {/snippet}
</Arbeidsflate>

{#if linja.visKompakt}
  <div class="kompakt" role="region" aria-label={FRISTKRAV.punktene}>
    {@render sendeknapp()}
  </div>
{/if}

<style>
  .spoersmaal {
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .sp-hode,
  .frist-hode {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
  }
  .hjemmel {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 0 var(--spacing-2);
    border: var(--rule-strong);
    border-radius: var(--r-merke);
    color: var(--ink-2);
    font-size: 12px;
    white-space: nowrap;
  }
  .status {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: var(--r-innfelt);
  }
  .frister {
    display: flex;
    flex-direction: column;
    border-top: var(--rule);
  }
  .frist {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-4) 0;
    border-bottom: var(--rule);
  }
  .frist.trukket h4 {
    color: var(--ink-3);
  }
  .frist-handling {
    margin-left: auto;
  }
  .merke {
    padding: 0 var(--spacing-2);
    border: var(--rule-strong);
    border-radius: var(--r-merke);
    color: var(--ink-2);
    font-size: 12px;
  }
  .rad {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-4);
  }
  .rad > :last-child {
    flex: 1;
    min-width: 200px;
  }
  .tallfelt {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  label {
    font-size: 15px;
    color: var(--ink);
  }
  textarea:focus-visible,
  .inndata:focus-within {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .inndata {
    display: inline-flex;
    align-items: stretch;
    width: 220px;
    max-width: 100%;
    border: var(--control-border);
    border-radius: var(--r-felt);
  }
  .inndata.tekst {
    width: 100%;
  }
  .inndata input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: 0;
    font: 16px var(--font-sans);
    color: var(--ink);
    background: var(--surface);
    outline: none;
  }
  .inndata:not(.tekst) input {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .enhet {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-3);
    border-left: var(--rule);
    color: var(--ink-3);
  }
  textarea {
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: inherit;
    background: var(--surface);
    resize: vertical;
  }
  .inndata.ugyldig,
  textarea.ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  .mangler {
    margin: var(--spacing-5) var(--spacing-6) 0;
    padding: var(--spacing-4);
    border-left: 3px solid var(--danger);
    background: var(--danger-bg);
  }
  .mangler:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .mangler p {
    font-weight: 600;
  }
  .mangler ul {
    margin-top: var(--spacing-2);
    padding-left: var(--spacing-5);
    list-style: disc;
  }
  .mangler a {
    color: var(--ink);
    text-underline-offset: 3px;
  }
  .skjemafot {
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .handling {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  .feste.fast {
    position: sticky;
    top: var(--spacing-4);
    z-index: 1;
  }
  .kompakt {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface);
    border-top: var(--rule-strong);
  }
</style>
