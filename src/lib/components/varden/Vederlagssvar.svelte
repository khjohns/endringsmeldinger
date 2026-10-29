<!--
  BH skriver svar på krav om vederlag (Varden, skjerm B). Skjemaet vurderer, panelet viser
  hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt (prinsipp 3). Ingenting
  er forhåndsvalgt. Kommandoen bygges i `kommandoer.ts`, og kjernen regner resultatet, lager
  brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { BookOpen, FileText, Lock, X } from 'lucide-svelte';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { VIRKNING } from '$lib/kjernesak/svarvirkning';
  import { lesKroner } from '$lib/utils/belop';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Knapp from './Knapp.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Valg from './Valg.svelte';
  import { tomtSvar, vederlagssvaret, type Svarvalg } from './kommandoer';
  import { brevene, oppgitteDatoer, standpunktene } from './lesing';
  import {
    BREVKONTROLL,
    HOVEDLINJER,
    SKJEMA,
    brevtittel,
    dato,
    kalenderdager,
    standpunkttekst,
  } from './prototypetekst';

  let {
    kjernesak,
    u,
    valg = $bindable(tomtSvar()),
    onbrevkontroll,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når BH går til brevkontrollen og tilbake. */
    valg?: Svarvalg;
    onbrevkontroll: (k: {
      kommando: Record<string, unknown>;
      tekst: string[];
      utdypning?: string;
      detteSender: { tekst: string; lag: string | null }[];
      virkninger: string[];
    }) => void;
  } = $props();
  const uid = $props.id();

  const krav = $derived(u.spor.vederlag.gjeldendeKrav!);
  const krevd = $derived(krav.innhold.beloep as number);
  const alleBrev = $derived(brevene(u));
  const kravbrevet = $derived(alleBrev.find((b) => b.id === krav.dokument)!);
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('vederlag')));
  const datoer = $derived(oppgitteDatoer(u));
  const klarOver = $derived(datoer.find((d) => d.hva === 'klar_over_forholdet'));
  const harPost = $derived(
    (krav.innhold.saerskilt as { produktivitet?: unknown } | undefined)?.produktivitet !== undefined
  );

  const kommando = $derived(vederlagssvaret(valg, u, kjernesak.regler)!);
  const etter = $derived(kjernesak.forhaandsvist(kommando));
  const nyttSvar = $derived.by(() => {
    const s = etter?.spor.vederlag.gjeldendeSvar;
    return s && !u.spor.vederlag.svar.some((x) => x.id === s.id) ? s : null;
  });
  const linjer = $derived(
    nyttSvar
      ? standpunktene(nyttSvar, u).map(({ standpunkt, lag }) => ({
          tekst: standpunkttekst(
            standpunkt,
            true,
            standpunkt.art === 'beloep' && !standpunkt.saerskilt ? krevd : undefined
          ),
          lag,
        }))
      : []
  );
  // Beløp i mer enn ett lag er alternativer, ikke tillegg (Varden, skjerm B).
  const alternativer = $derived(
    new Set(
      nyttSvar
        ? standpunktene(nyttSvar, u)
            .filter((s) => s.lag && s.standpunkt.art === 'beloep')
            .map((s) => s.lag)
        : []
    ).size > 1
  );
  const delbeloep = $derived(lesKroner(valg.delbeloep));
  const ubesvart = $derived(
    valg.iTide === null ||
      valg.metode === null ||
      (valg.metode === false && valg.oensket === null) ||
      valg.beloep === null ||
      (valg.beloep === 'deler' && 'verdi' in delbeloep && delbeloep.verdi === undefined)
  );
  // Kjernens melding om vurderinger den ikke kan regne ut, har feltkodene; skjemaet sier
  // det med egne ord.
  const aarsak = (b: ReturnType<typeof kjernesak.brev>) =>
    b && 'avvisning' in b && b.avvisning.regel === 'UGYLDIG_VURDERING'
      ? ubesvart
        ? HOVEDLINJER.ubesvart
        : valg.beloep === 'deler'
          ? 'feil' in delbeloep
            ? delbeloep.feil
            : HOVEDLINJER.beloepUtenfor(krevd)
          : HOVEDLINJER.kanIkkeLages
      : brevaarsak(b);
  const hindring = $derived(aarsak(kjernesak.brev(kommando)));
  let sendehindring = $state<string | null>(null);

  const virkninger = $derived([
    VIRKNING.alltid,
    ...(nyttSvar?.beslutningsgrunnlag.sammenfall ? [VIRKNING.sammenfall] : []),
    ...(!u.spor.grunnlag.gjeldendeSvar && !u.frafalt ? [VIRKNING.forbehold] : []),
    ...(nyttSvar?.standpunkter.some((s) => s.art === 'rettidighet' && !s.iTide)
      ? [BREVKONTROLL.akseptOmfatter]
      : []),
  ]);

  function seBrevet() {
    const b = kjernesak.brev(kommando, undefined, true);
    if (!b || !('tekst' in b) || !b.tekst) {
      sendehindring = aarsak(b) ?? HOVEDLINJER.kanIkkeLages;
      return;
    }
    sendehindring = null;
    onbrevkontroll({
      kommando,
      tekst: b.tekst,
      utdypning: kommando.svar[0].utdypning,
      detteSender: linjer,
      virkninger,
    });
  }

  let leser = $state(false);

  // Panelet følger rullingen bare når det får plass i vinduet; ellers vises en kompakt linje
  // nederst når panelet er ute av syne (skjerm E).
  let panel = $state<HTMLElement | null>(null);
  let faarPlass = $state(true);
  let iSyne = $state(true);
  // Panelet fjernes når brevet leses ved siden av, så målingen bindes på nytt hver gang det
  // settes inn.
  $effect(() => {
    const el = panel;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const maal = () => (faarPlass = el.offsetHeight + 32 <= window.innerHeight);
    const ro = new ResizeObserver(maal);
    ro.observe(el);
    window.addEventListener('resize', maal);
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([e]) => (iSyne = e.isIntersecting));
    io?.observe(el);
    maal();
    return () => {
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener('resize', maal);
    };
  });
</script>

<Arbeidsflate
  overskrift="Vederlag"
  undertekst={`${sporbrev.length} brev · siste ${dato(sporbrev.at(-1)!.registrert)} fra ${sporbrev.at(-1)!.avsender}`}
>
  {#snippet hoved()}
    <form class="utkast" aria-label={SKJEMA.overskrift} onsubmit={(e) => e.preventDefault()}>
      <header class="utkasthode">
        <p class="tittel">
          <span class="merke-utkast">{BREVKONTROLL.utkast}</span>
          <span
            >Brev {(kjernesak.versjon ?? 0) + 1} · {brevtittel({
              art: 'svar',
              spor: ['vederlag'],
            })}</span
          >
        </p>
        <p class="dempet">Til entreprenøren (TE)</p>
        <p class="dempet synlig"><Lock size={14} aria-hidden="true" />{SKJEMA.synlig}</p>
      </header>
      <div class="svarerpaa">
        <FileText size={16} aria-hidden="true" />
        <span>{SKJEMA.svarerPaa(kravbrevet.nummer, kravbrevet.registrert)}</span>
        <Knapp onclick={() => (leser = !leser)} aria-expanded={leser}>
          {leser ? SKJEMA.lukkBrevet : SKJEMA.lesBrevet}
        </Knapp>
      </div>

      {#if harPost}
        <p class="ikke-stoettet" role="note">{SKJEMA.ikkeStoettet}</p>
      {:else}
        <section class="spoersmaal" aria-labelledby={`${uid}-sp-varsel`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-varsel`}>{SKJEMA.varselTittel}</h3>
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />§ 34.1.2</span>
          </div>
          <div class="datoer">
            {#if klarOver}<p>{SKJEMA.klarOver(klarOver.dato, klarOver.brev)}</p>{/if}
            <p>{SKJEMA.kravSendt(kravbrevet.registrert, kravbrevet.nummer)}</p>
            {#if klarOver}
              <p>
                <strong
                  >{SKJEMA.avstand(kalenderdager(klarOver.dato, kravbrevet.registrert))}</strong
                >
              </p>
            {/if}
            <p class="dempet">{SKJEMA.datoGrense}</p>
          </div>
          <Valg
            navn="itide"
            spoersmaal={SKJEMA.varselSpoersmaal}
            valg={[
              { verdi: true, tekst: SKJEMA.iTide },
              { verdi: false, tekst: SKJEMA.forSent },
            ]}
            bind:verdi={valg.iTide}
          />
        </section>

        <section class="spoersmaal" aria-labelledby={`${uid}-sp-metode`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-metode`}>{SKJEMA.metodeTittel}</h3>
            {#if valg.metode === null}<span class="ikke-besvart">{SKJEMA.ikkeBesvart}</span>{/if}
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />§ 34.2</span>
          </div>
          <Valg
            navn="metode"
            spoersmaal={SKJEMA.metodeSpoersmaal(krav.innhold.metode)}
            valg={[
              { verdi: true, tekst: SKJEMA.godtarMetode },
              { verdi: false, tekst: SKJEMA.godtarIkkeMetode },
            ]}
            bind:verdi={valg.metode}
          />
          {#if valg.metode === false}
            <Valg
              navn="oensket"
              spoersmaal={SKJEMA.oensketSpoersmaal}
              valg={[
                { verdi: 'enhetspriser', tekst: 'Enhetspriser (§ 34.3)' },
                { verdi: 'regningsarbeid', tekst: 'Regningsarbeid (§ 34.4)' },
              ]}
              bind:verdi={valg.oensket}
            />
          {/if}
        </section>

        <section class="spoersmaal" aria-labelledby={`${uid}-sp-beloep`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-beloep`}>{SKJEMA.beloepTittel(krevd)}</h3>
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />§ 34.1</span>
          </div>
          <Valg
            navn="beloep"
            spoersmaal={valg.iTide === false ? SKJEMA.beloepSubsidiaert : SKJEMA.beloepSpoersmaal}
            valg={[
              { verdi: 'hele', tekst: SKJEMA.hele },
              { verdi: 'deler', tekst: SKJEMA.deler },
              { verdi: 'ingenting', tekst: SKJEMA.ingenting },
            ]}
            bind:verdi={valg.beloep}
          />
          {#if valg.beloep === 'deler'}
            <div class="beloepfelt">
              <label for={`${uid}-delbeloep`}>{SKJEMA.belopEtikett}</label>
              <span class="inndata">
                <input
                  id={`${uid}-delbeloep`}
                  inputmode="decimal"
                  bind:value={valg.delbeloep}
                  aria-describedby={`${uid}-beloep-hjelp`}
                />
                <span class="kr" aria-hidden="true">kr</span>
              </span>
              <span id={`${uid}-beloep-hjelp`} class="dempet">{SKJEMA.belopHjelp(krevd)}</span>
            </div>
          {/if}
        </section>

        <section class="spoersmaal">
          <div class="begrunnelse">
            <label for={`${uid}-begrunnelse`} class="h3">{SKJEMA.begrunnelse}</label>
            <span class="dempet" id={`${uid}-begrunnelse-hjelp`}>{SKJEMA.begrunnelseHjelp}</span>
            <textarea
              id={`${uid}-begrunnelse`}
              rows="5"
              bind:value={valg.begrunnelse}
              aria-describedby={`${uid}-begrunnelse-hjelp`}
            ></textarea>
          </div>
        </section>
      {/if}
    </form>
  {/snippet}

  {#snippet hoeyre()}
    {#if leser}
      <div class="leseflate">
        <Knapp variant="lenke" onclick={() => (leser = false)}
          ><X size={16} aria-hidden="true" />{SKJEMA.lukkBrevet}</Knapp
        >
        <Brev
          avsender={kravbrevet.avsender}
          sak={kjernesak.saksbilde?.tittel ?? ''}
          nummer={String(kravbrevet.nummer)}
          dato={dato(kravbrevet.registrert)}
          tittel={brevtittel(kravbrevet)}
          avsnitt={kravbrevet.avsnitt ?? []}
        />
      </div>
    {:else}
      <div class="feste" class:fast={faarPlass} bind:this={panel}>
        <Hovedlinjer {linjer} {alternativer}>
          {#snippet handling()}
            {#if hindring}<p class="dempet" id={`${uid}-brev-hindring`}>{hindring}</p>{/if}
            <p class="sterk">{VIRKNING.alltid}</p>
            <Knapp
              variant="primaer"
              sperret={harPost || hindring !== null}
              hvorfor={`${uid}-brev-hindring`}
              onclick={seBrevet}>{HOVEDLINJER.seBrevet}</Knapp
            >
            {#if sendehindring}<p class="feil" role="alert">{sendehindring}</p>{/if}
          {/snippet}
        </Hovedlinjer>
      </div>
      <Tidslinje brev={sporbrev} datoer={datoer.filter((d) => d.spor.includes('grunnlag'))} />
    {/if}
  {/snippet}
</Arbeidsflate>

{#if !faarPlass && !iSyne && !leser}
  <div class="kompakt" role="region" aria-label="Hovedlinjene og brevkontrollen">
    <Knapp onclick={() => panel?.scrollIntoView({ block: 'start' })}>Se hovedlinjene</Knapp>
    <Knapp
      variant="primaer"
      sperret={harPost || hindring !== null}
      hvorfor={`${uid}-brev-hindring`}
      onclick={seBrevet}>{HOVEDLINJER.seBrevet}</Knapp
    >
  </div>
{/if}

<style>
  .utkast {
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .utkasthode {
    padding: var(--spacing-5) var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .tittel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    font-size: 18px;
    font-weight: 600;
  }
  .merke-utkast {
    padding: 0 var(--spacing-2);
    border: 1px dashed var(--draft-border);
    border-radius: 999px;
    background: var(--draft-bg);
    font-size: 12px;
    font-weight: 500;
  }
  .synlig {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }
  .svarerpaa {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface-inset);
    border-top: var(--rule);
    border-bottom: var(--rule);
  }
  .svarerpaa > span {
    margin-right: auto;
  }
  .spoersmaal {
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .spoersmaal:last-child {
    border-bottom: 0;
  }
  .sp-hode {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }
  h3,
  .h3 {
    font-size: 16px;
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
    border-radius: 999px;
    color: var(--ink-2);
    font-size: 12px;
  }
  .ikke-besvart {
    padding: 0 var(--spacing-2);
    border-radius: 999px;
    background: var(--surface-inset);
    color: var(--ink-2);
    font-size: 12px;
  }
  .datoer {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: 4px;
    font-size: 14px;
  }
  .beloepfelt,
  .begrunnelse {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .inndata {
    display: inline-flex;
    align-items: stretch;
    width: 220px;
    border: var(--control-border);
    border-radius: 4px;
  }
  .inndata:focus-within,
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .inndata input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: 0;
    text-align: right;
    font: inherit;
    font-variant-numeric: tabular-nums;
    background: var(--surface);
    outline: none;
  }
  .kr {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-3);
    border-left: var(--rule);
    color: var(--ink-3);
  }
  textarea {
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: 4px;
    font: inherit;
    background: var(--surface);
    resize: vertical;
  }
  .ikke-stoettet {
    margin: var(--spacing-5) var(--spacing-6);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: 4px;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 13px;
  }
  .sterk {
    font-weight: 600;
    font-size: 14px;
  }
  .feil {
    padding: var(--spacing-3);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    font-size: 14px;
  }
  .feste.fast {
    position: sticky;
    top: var(--spacing-4);
  }
  .leseflate {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
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
