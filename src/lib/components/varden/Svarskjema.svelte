<!--
  Skallet for byggherrens svar på påberopelsen av forholdet og på et krav om vederlag eller frist
  (#1925, #2009): skjemaet vurderer,
  panelet viser hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt (prinsipp 3).
  Spørsmålene er sporets egne; skallet har brevet svaret gjelder, oppsummeringen av det som mangler,
  begrunnelsene, forbeholdet, «Forkast utkast» og brevkontrollen.

  Handlingene (oppdragsgiver 29.10, #1391): «Se brevet før sending» står bare i panelet og er
  alltid aktiv. Mangler et svar, vises ikke brevet, og det som mangler, står ved feltet og øverst
  i skjemaet (MM-U32, BF-01 S-3 med reserven B, fordi kjernen ikke lager tekst for et
  ufullstendig svar). Brevet leses ved siden av skjemaet, og på smal skjerm i skjemaet.
-->
<script lang="ts">
  import { Info } from 'lucide-svelte';
  import { tick, type Snippet } from 'svelte';
  import { SVARTITTEL } from '#kjerne/frosset/brevtittel.ts';
  import type { Spor } from '#kjerne/typer.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { brevaarsak, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { harTekst } from '#lib/kjernesak/brevtekst.ts';
  import { VIRKNING } from '#lib/kjernesak/svarvirkning.ts';
  import { kontrollbrev, type TilBrevkontrollen } from './Brevkontroll.svelte';
  import { fastLinje } from './fastlinje.svelte';
  import { medietreff } from './medie.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Brevlinje from './Brevlinje.svelte';
  import Feltetikett from './Feltetikett.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Infotips from './Infotips.svelte';
  import Leseramme from './Leseramme.svelte';
  import Knapp from './Knapp.svelte';
  import Manglene from './Manglene.svelte';
  import { feltfeil, type Mangel } from './mangler';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { brevene, datoerISporet } from './lesing';
  import { begrunnelsespunktene, kravbrevetI, type Postvelger } from './svarskjema';
  import { HOVEDLINJER, LEGG_TIL, SKJEMA, SVARSKJEMA, brevhode, brevtittel, dato } from './tekster';
  import {
    lagtTil as kommandoenLagtTil,
    leggTilISaken,
    type Korrespondansevalg,
  } from './korrespondansen';
  import Lagttillinje from './Lagttillinje.svelte';
  import Lagttilmerknader from './Lagttilmerknader.svelte';
  import { vedleggskart } from './nysak';
  import type { Brevet } from './lesing';

  let {
    kjernesak,
    u,
    spor,
    utkast,
    medTekstene,
    tekster = $bindable(),
    linjer,
    alternativer = false,
    virkninger,
    mangler,
    postliste,
    stopp = null,
    begrunnelseKreves = null,
    onbrevkontroll,
    onforkast,
    onvedsiden,
    spoersmaal,
    lagtTil = null,
    svarerPaa = null,
    onendre = () => {},
    onlagttil = () => {},
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    spor: Spor;
    /** Svaret uten begrunnelsene og forbeholdet, så det ikke regnes på nytt for hvert tegn. */
    utkast: Record<string, unknown>;
    /** Svaret med tekstene for punktene brevet har, når BH vil se brevet. */
    medTekstene: (punktene: readonly string[]) => Record<string, unknown>;
    /** Tekstene står når BH går til brevkontrollen og tilbake. */
    tekster: { begrunnelser: Record<string, string>; forbehold: string };
    linjer: TilBrevkontrollen['detteSender'];
    /** Beløp i mer enn ett lag er alternativer, ikke tillegg (Varden, skjerm B). */
    alternativer?: boolean;
    virkninger: string[];
    mangler: Mangel[];
    postliste?: Postvelger | null;
    /** Det som hindrer at svaret kan gis nå; skjemaet viser da bare meldingen. */
    stopp?: string | null;
    /**
     * Punktene der minst én må ha en begrunnelse før brevet vises, og hvorfor, eller `null` når
     * begrunnelsen er valgfri (D-7 i BF-08).
     */
    begrunnelseKreves?: { punktene: readonly string[]; grunn: string; mangler: string } | null;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
    /** Spørsmålene, med beskjeden for feltet med ID-en når BH har prøvd å se brevet. */
    spoersmaal: Snippet<[feil: (id: string) => string | null]>;
    /**
     * Korrespondansen svaret legges til fra (OV-U80, OV-U98), eller `null` for et svar sendt fra
     * løsningen. Svaret har da ingen begrunnelse og ikke noe forbehold (OV-U80), og løsningen lager
     * ingen brevtekst.
     */
    lagtTil?: Korrespondansevalg | null;
    /** Brevet med kravversjonen svaret gjelder, når det ikke er gjeldende versjon (OV-U98). */
    svarerPaa?: Brevet | null;
    /** Tilbake til korrespondansen. */
    onendre?: () => void;
    /** Svaret er lagt til. */
    onlagttil?: () => void;
  } = $props();
  const uid = $props.id();

  const alleBrev = $derived(brevene(u));
  const kravbrevet = $derived(svarerPaa ?? kravbrevetI(u, spor));
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes(spor)));
  const datoer = $derived(datoerISporet(u, spor));

  // Nummeret og tittelen står i raden kjernen ville skrevet (LV-U44, LV-U27), og punktene i
  // brevet kjernen lager uten tekstene.
  const utkastbrev = $derived(kjernesak.brev(utkast));
  const brevMedTekst = $derived(harTekst(utkastbrev) ? utkastbrev : null);
  const punktene = $derived(brevMedTekst ? begrunnelsespunktene(brevMedTekst.avsnitt) : []);

  const begrunnelseId = (punkt: string) => `${uid}-begrunnelse-${punkt}`;
  // Punktene i skjemaet der begrunnelsen som kreves, kan stå (D-7). Holder ett av flere, sier
  // seksjonen det én gang, og ingen av feltene er påkrevd alene.
  const kreverPunktene = $derived(
    begrunnelseKreves?.punktene.filter((p) => punktene.some((x) => x.punkt === p)) ?? []
  );
  const kreves = (punkt: string) => kreverPunktene.length === 1 && kreverPunktene[0] === punkt;
  const kanStaa = (punkt: string) => kreverPunktene.length > 1 && kreverPunktene.includes(punkt);
  // Begrunnelsen som kreves, er besvart når ett av punktene den kan stå i, har tekst.
  const alleMangler = $derived.by((): Mangel[] => {
    const k = lagtTil ? null : begrunnelseKreves;
    if (!k || kreverPunktene.some((p) => tekster.begrunnelser[p]?.trim())) return mangler;
    // Feilen står ved det første punktet i kravet, ikke det første i skjemaet.
    const foerste = kreverPunktene[0];
    if (!foerste) return mangler;
    return [...mangler, { felt: begrunnelseId(foerste), post: null, tekst: k.mangler }];
  });

  // Beskjedene vises først når BH har prøvd å se brevet (MM-U32), og forsvinner når feltet er besvart.
  let forsoekt = $state(false);
  const feil = (id: string): string | null =>
    forsoekt ? feltfeil(alleMangler.find((m) => m.felt === id)) : null;
  let oppsummering = $state<HTMLElement | null>(null);
  let sendehindring = $state<string | null>(null);

  /** Lenken i oppsummeringen åpner posten feltet står i (`Postliste`). */
  function gaaTil(m: Mangel, e: MouseEvent) {
    if (m.post === null || !postliste || postliste.erAapen(m.post)) return;
    e.preventDefault();
    postliste.aapne(m.post, m.felt);
  }

  async function seBrevet() {
    sendehindring = null;
    if (alleMangler.length) {
      forsoekt = true;
      const foerste = alleMangler.find((m) => m.post !== null);
      if (foerste) postliste?.velg(foerste.post!);
      await tick();
      oppsummering?.focus();
      return;
    }
    if (kommandoLagtTil) {
      sendehindring = await leggTilISaken(
        kjernesak,
        kommandoLagtTil,
        vedleggLagtTil,
        HOVEDLINJER.kanIkkeLages
      );
      if (sendehindring === null) return onlagttil();
      await tick();
      document.getElementById(`${uid}-hindring`)?.focus();
      return;
    }
    const kommando = medTekstene(punktene.map((p) => p.punkt));
    const b = kjernesak.brev(kommando, undefined, true);
    const brevet = kontrollbrev(b);
    if (!brevet) {
      sendehindring =
        b && 'avvisning' in b && b.avvisning.regel === 'UGYLDIG_VURDERING'
          ? HOVEDLINJER.kanIkkeLages
          : (brevaarsak(b) ?? HOVEDLINJER.kanIkkeLages);
      // Fra den faste linja står hindringen utenfor syne; fokus viser den.
      await tick();
      document.getElementById(`${uid}-hindring`)?.focus();
      return;
    }
    onbrevkontroll({ kommando, ...brevet, detteSender: linjer, virkninger });
  }

  const kommandoLagtTil = $derived(
    lagtTil ? kommandoenLagtTil(medTekstene([]) as { type: 'brev' }, lagtTil) : null
  );
  const vedleggLagtTil = $derived(vedleggskart(lagtTil?.vedlegg ?? []));

  // Brevet leses i en ramme ved siden av skjemaet, og på smal skjerm i skjemaet, der høyre
  // kolonne står under arbeidet (oppdragsgiver 29.10, #1391).
  const vindu = medietreff('(max-width: 1180px)');
  const smal = $derived(vindu.treff);
  let leser = $state(false);
  const vedSiden = $derived(leser && !smal);
  $effect(() => {
    onvedsiden?.(vedSiden);
    return () => onvedsiden?.(false);
  });
  let panel = $state<HTMLElement | null>(null);
  const linja = fastLinje(
    uid,
    () => panel,
    () => stopp !== null || vedSiden
  );
</script>

{#snippet kravbrev(ramme: 'kant' | 'innfelt')}
  <Brev
    avsender={kravbrevet.avsender}
    sak={kjernesak.saksbilde?.tittel ?? ''}
    merking={kravbrevet.merking}
    deresRef={kravbrevet.deresRef}
    dato={dato(kravbrevet.registrert)}
    tittel={brevtittel(kravbrevet)}
    avsnitt={kravbrevet.avsnitt ?? []}
    {ramme}
  />
{/snippet}

{#snippet sendeknapp()}
  <div class="handling">
    <Knapp
      variant="primaer"
      onclick={seBrevet}
      opptatt={!!lagtTil && kjernesak.sender}
      aria-describedby={sendehindring ? `${uid}-hindring` : undefined}
      >{lagtTil ? LEGG_TIL.leggTilSvaret : HOVEDLINJER.seBrevet}</Knapp
    >
  </div>
  {#if sendehindring}
    <Melding art="feil" levende={false} id={`${uid}-hindring`} tabindex="-1"
      >{sendehindring}</Melding
    >
  {/if}
{/snippet}

<Arbeidsflate leser={vedSiden}>
  {#snippet hoved()}
    <Utkastkort
      id={`${uid}-tittel`}
      tittel={brevMedTekst && !lagtTil
        ? brevhode({
            merking: brevMedTekst.merking,
            art: 'svar',
            brevtittel: brevMedTekst.brevtittel,
          })
        : SVARTITTEL[spor]}
      mottaker={SKJEMA.tilTE}
      merke={lagtTil ? LEGG_TIL.utkast : undefined}
    >
      {#snippet infotips()}<Infotips navn={SKJEMA.omSvaret} tekst={VIRKNING.alltid} />{/snippet}
      {#if lagtTil && kjernesak.part}
        <Lagttillinje part={kjernesak.part} valg={lagtTil} {onendre} />
      {/if}
      <Brevlinje
        id={`${uid}-kravbrev`}
        bind:leser
        {smal}
        lenke={{ les: SKJEMA.lesBrevet, lesHer: SKJEMA.lesBrevetHer, lukk: SKJEMA.lukkBrevet }}
      >
        {SKJEMA.svarerPaa(kravbrevet)}
        {#snippet brev()}{@render kravbrev('kant')}{/snippet}
      </Brevlinje>

      {#if stopp !== null}
        <div class="ikke-stoettet" role="note">
          <Info size={18} aria-hidden="true" />
          <p>{stopp}</p>
        </div>
      {:else}
        {#if forsoekt && alleMangler.length}
          <Manglene
            tittel={lagtTil ? LEGG_TIL.mangler : SKJEMA.mangler}
            mangler={alleMangler}
            ongaa={gaaTil}
            bind:element={oppsummering}
          />
        {/if}

        {@render spoersmaal(feil)}

        {#if kommandoLagtTil}
          <Lagttilmerknader
            {kjernesak}
            {u}
            {spor}
            kommando={kommandoLagtTil}
            vedlegg={vedleggLagtTil}
            innfelt
          />
        {:else}
          <!-- Begrunnelsene står under punktene i brevet, så de vises når brevet har punkter.
             Forbeholdet står alltid, så teksten ikke blir borte når brevet ikke kan lages. -->
          <section
            class="begrunnelser"
            aria-labelledby={punktene.length ? `${uid}-sp-begrunnelse` : undefined}
          >
            {#if punktene.length}
              <h3 id={`${uid}-sp-begrunnelse`}>{SKJEMA.begrunnelse}</h3>
              <p class="dempet" id={`${uid}-begrunnelse-hjelp`}>{SKJEMA.begrunnelseHjelp}</p>
              {#if kreverPunktene.length > 1}
                <p class="dempet" id={`${uid}-begrunnelse-kreves`}>{begrunnelseKreves!.grunn}</p>
              {/if}
              {#each punktene as p (p.punkt)}
                {@const id = begrunnelseId(p.punkt)}
                {@const bFeil = feil(id)}
                <div class="begrunnelse">
                  <Feltetikett for={id} underordnet valgfri={!kreves(p.punkt) && !kanStaa(p.punkt)}
                    >{p.navn}</Feltetikett
                  >
                  {#if kreves(p.punkt)}
                    <span class="dempet" id={`${id}-kreves`}>{begrunnelseKreves!.grunn}</span>
                  {/if}
                  <textarea
                    {id}
                    rows="2"
                    bind:value={tekster.begrunnelser[p.punkt]}
                    aria-required={kreves(p.punkt) ? 'true' : undefined}
                    aria-invalid={bFeil ? 'true' : undefined}
                    aria-describedby={[
                      `${uid}-begrunnelse-hjelp`,
                      kreves(p.punkt) ? `${id}-kreves` : '',
                      kanStaa(p.punkt) ? `${uid}-begrunnelse-kreves` : '',
                      bFeil ? `${id}-feil` : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  ></textarea>
                  {#if bFeil}<p class="feilmelding" id={`${id}-feil`}>{bFeil}</p>{/if}
                </div>
              {/each}
            {/if}
            <div class="begrunnelse forbehold">
              <Feltetikett for={`${uid}-forbehold`} valgfri>{SKJEMA.forbehold}</Feltetikett>
              <span class="dempet" id={`${uid}-forbehold-hjelp`}>{SKJEMA.forbeholdHjelp}</span>
              <textarea
                id={`${uid}-forbehold`}
                rows="3"
                bind:value={tekster.forbehold}
                aria-describedby={`${uid}-forbehold-hjelp`}
              ></textarea>
            </div>
          </section>
        {/if}
      {/if}

      <div class="skjemafot">
        <Forkastutkast tekst={SVARSKJEMA.forkastTekst} {onforkast} />
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    {#if vedSiden}
      <Leseramme
        id={`${uid}-kravbrev`}
        brev={kravbrevet}
        bunn={stopp === null ? sendeknapp : undefined}
      >
        {@render kravbrev('innfelt')}
      </Leseramme>
    {:else}
      <div class="feste" class:fast={linja.faarPlass} bind:this={panel}>
        <Hovedlinjer {linjer} {alternativer} handling={stopp === null ? sendeknapp : undefined} />
      </div>
      <Tidslinje brev={sporbrev} {datoer} />
    {/if}
  {/snippet}
</Arbeidsflate>

{#if linja.visKompakt}
  <div class="kompakt" role="region" aria-label={SVARSKJEMA.kompaktLinje}>
    <Knapp variant="primaer" onclick={seBrevet} opptatt={!!lagtTil && kjernesak.sender}
      >{lagtTil ? LEGG_TIL.leggTilSvaret : HOVEDLINJER.seBrevet}</Knapp
    >
    <Knapp onclick={() => panel?.scrollIntoView({ block: 'start' })}
      >{HOVEDLINJER.seHovedlinjene}</Knapp
    >
  </div>
{/if}

<style>
  .begrunnelser {
    padding: var(--spacing-5) var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .begrunnelse {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  /* Forbeholdet gjelder hele svaret og står sist i brevet, skilt fra punktene. */
  .begrunnelse.forbehold:not(:first-child) {
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-4);
    border-top: var(--rule);
  }
  textarea {
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: inherit;
    background: var(--surface);
    resize: vertical;
  }
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  /* En melding om prøven, ikke en feil og ikke et utkast: blekk i kanten, ingen farge (#1391). */
  .ikke-stoettet {
    display: flex;
    gap: var(--spacing-3);
    margin: var(--spacing-5) var(--spacing-6);
    padding: var(--spacing-4);
    border-left: 3px solid var(--ink);
    background: var(--surface-inset);
    color: var(--ink);
  }
  .ikke-stoettet :global(svg) {
    flex: none;
    margin-top: 3px;
  }
  .skjemafot {
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
    border-top: var(--rule);
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
  /* Over tidslinja, som ruller under: den åpne chevronen er rotert og ville ellers ligget
     øverst og tatt klikkene i panelet. */
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
