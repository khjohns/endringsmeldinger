<!--
  Byggherrens svar på påberopelsen av forholdet og på et krav om vederlag eller frist, i skallet
  for brevskjemaene (`Brevskjema`, #1925, #2009, #2119): skjemaet vurderer,
  panelet viser hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt (prinsipp 3).
  Spørsmålene er sporets egne. Svarskjemaet har brevet svaret gjelder, begrunnelsene, forbeholdet og
  veien til brevkontrollen, og skallet resten av rammen.

  Handlingene (oppdragsgiver 29.10, #1391): «Se brevet før sending» står bare i panelet og er
  alltid aktiv. Mangler et svar, vises ikke brevet, og det som mangler, står ved feltet og øverst
  i skjemaet (MM-U32, BF-01 S-3 med reserven B, fordi kjernen ikke lager tekst for et
  ufullstendig svar). Brevet leses ved siden av skjemaet, og på smal skjerm i skjemaet.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { SVARTITTEL } from '#kjerne/frosset/brevtittel.ts';
  import type { Spor } from '#kjerne/typer.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { brevaarsak, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { harTekst } from '#lib/kjernesak/brevtekst.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Brevskjema from './Brevskjema.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Knapp from './Knapp.svelte';
  import type { Mangel } from './mangler';
  import { sendeflyt } from './sendeflyt.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import { brevene, datoerISporet } from './lesing';
  import { begrunnelsespunktene, kravbrevetI, type Postvelger } from './svarskjema';
  import { HOVEDLINJER, LEGG_TIL, SKJEMA, SVARSKJEMA } from './tekster';
  import { lagtTil as kommandoenLagtTil, type Korrespondansevalg } from './korrespondansen';
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
  const flyt = sendeflyt(() => kjernesak, `${uid}-hindring`);
  const feil = (id: string): string | null => flyt.feil(alleMangler.find((m) => m.felt === id));
  let oppsummering = $state<HTMLElement | null>(null);

  async function gaaTil(m: Mangel, e: MouseEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (m.post !== null && postliste && !postliste.erAapen(m.post)) {
      e.preventDefault();
      await postliste.aapne(m.post, m.felt);
    } else {
      const felt = document.getElementById(m.felt);
      if (!(felt instanceof HTMLFieldSetElement)) return;
      e.preventDefault();
      felt.focus();
    }

    const gruppe = document.getElementById(m.felt);
    if (!(gruppe instanceof HTMLFieldSetElement)) return;
    const seksjon = gruppe.closest('section[aria-labelledby]');
    if (!seksjon) return;
    const foersteValg = gruppe.querySelector('label') ?? gruppe;
    const avstand =
      foersteValg.getBoundingClientRect().bottom - seksjon.getBoundingClientRect().top;
    if (avstand < document.documentElement.clientHeight) {
      seksjon.scrollIntoView({ block: 'start' });
    }
  }

  function seBrevet() {
    const foerste = alleMangler.find((m) => m.post !== null);
    if (foerste) postliste?.velg(foerste.post!);
    const kommando = medTekstene(punktene.map((p) => p.punkt));
    // Fra den faste linja står hindringen utenfor syne; fokus viser den.
    return flyt.send({
      mangler: alleMangler.length ? () => oppsummering : null,
      lagtTil: kommandoLagtTil
        ? { kommando: kommandoLagtTil, vedlegg: vedleggLagtTil, ferdig: onlagttil }
        : null,
      kommando,
      kanIkkeLages: HOVEDLINJER.kanIkkeLages,
      aarsak: (b) =>
        b && 'avvisning' in b && b.avvisning.regel === 'UGYLDIG_VURDERING' ? null : brevaarsak(b),
      tilBrevkontrollen: (brevet) =>
        onbrevkontroll({ kommando, ...brevet, detteSender: linjer, virkninger }),
    });
  }

  const kommandoLagtTil = $derived(
    lagtTil ? kommandoenLagtTil(medTekstene([]) as { type: 'brev' }, lagtTil) : null
  );
  const vedleggLagtTil = $derived(vedleggskart(lagtTil?.vedlegg ?? []));

  const knapp = $derived({
    tekst: lagtTil ? LEGG_TIL.leggTilSvaret : HOVEDLINJER.seBrevet,
    onclick: seBrevet,
    opptatt: !!lagtTil && kjernesak.sender,
  });
</script>

{#snippet kompaktLinje(knappen: Snippet, tilPanelet: () => void)}
  {@render knappen()}
  <Knapp onclick={tilPanelet}>{HOVEDLINJER.seHovedlinjene}</Knapp>
{/snippet}

<Brevskjema
  id={`${uid}-tittel`}
  tittel={SVARTITTEL[spor]}
  {kjernesak}
  {u}
  avsender="BH"
  oppfolging={{ tekst: SKJEMA.svarerPaa(kravbrevet), brev: kravbrevet }}
  {onvedsiden}
  {lagtTil}
  part={kjernesak.part}
  {onendre}
  {flyt}
  mangler={alleMangler}
  manglerTittel={SKJEMA.mangler}
  ongaa={gaaTil}
  bind:oppsummering
  forkastTekst={SVARSKJEMA.forkastTekst}
  {onforkast}
  skilt
  knapp={stopp === null ? knapp : null}
  kompakt={{ etikett: SVARSKJEMA.kompaktLinje, innhold: kompaktLinje }}
>
  {#snippet panel(sendeknapp)}
    <Hovedlinjer {linjer} {alternativer} handling={sendeknapp} />
  {/snippet}
  {#snippet tidslinje()}<Tidslinje brev={sporbrev} {datoer} />{/snippet}

  {#if stopp !== null}
    <div class="ikke-stoettet" role="note">
      <p>{stopp}</p>
    </div>
  {:else}
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
            <Tekstomraade
              {id}
              etikett={p.navn}
              underordnet
              valgfri={!kreves(p.punkt) && !kanStaa(p.punkt)}
              hjelp={kreves(p.punkt) ? begrunnelseKreves!.grunn : null}
              rader={2}
              bind:verdi={tekster.begrunnelser[p.punkt]}
              paakrevd={kreves(p.punkt)}
              feil={bFeil}
              foran={[`${uid}-begrunnelse-hjelp`]}
              etter={kanStaa(p.punkt) ? [`${uid}-begrunnelse-kreves`] : []}
            />
          {/each}
        {/if}
        <div class="forbehold">
          <Tekstomraade
            id={`${uid}-forbehold`}
            etikett={SKJEMA.forbehold}
            valgfri
            hjelp={SKJEMA.forbeholdHjelp}
            bind:verdi={tekster.forbehold}
          />
        </div>
      </section>
    {/if}
  {/if}
</Brevskjema>

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
  /* Forbeholdet gjelder hele svaret og står sist i brevet, skilt fra punktene. */
  .forbehold:not(:first-child) {
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-4);
    border-top: var(--rule);
  }
  /* En melding om prøven, ikke en feil og ikke et utkast: blekk i kanten, ingen farge (#1391). */
  .ikke-stoettet {
    margin: var(--spacing-5) var(--spacing-6);
    padding: var(--spacing-4);
    border-left: 3px solid var(--ink);
    background: var(--surface-inset);
    color: var(--ink);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
</style>
