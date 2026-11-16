<!--
  BH skriver svar på krav om vederlag (Varden, skjerm B), i skallet for svarskjemaene
  (`Svarskjema.svelte`): oppgjørsformen, beløpet, varselet og justeringen for hver kravpost.
  Ingenting er forhåndsvalgt. Kommandoen bygges i `kommandoer.ts`, og kjernen regner resultatet,
  lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import {
    denAndreRegelen,
    harProduktivitetspost,
    justerteEnhetspriser,
    kravposterI,
  } from '$kjerne/spor/vederlag/format';
  import { kroner } from '$kjerne/frosset/tekst';
  import { hindrerSvarPaaKravet, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { VIRKNING } from '$lib/kjernesak/svarvirkning';
  import { lesKroner } from '$lib/utils/belop';
  import type { Forutsetning } from '$kjerne/spor/vederlag/kommando';
  import type { Utledning } from '$kjerne/utledning/utled';
  import type { Kravpost, Standpunkt } from '$kjerne/typer';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Knapp from './Knapp.svelte';
  import Postliste from './Postliste.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Tallfelt from './Tallfelt.svelte';
  import Valg from './Valg.svelte';
  import Varseldatoer from './Varseldatoer.svelte';
  import {
    beloepsvalget,
    etterRegel,
    formBesvart,
    postvalget,
    regelen,
    spoerOmBeloepet,
    spoerOmHovedvarselet,
    spoerOmTilbud,
    spoerOmVarselet,
    tomPost,
    tomtSvar,
    vederlagssvaret,
    type Postvalg,
    type Regel,
    type Svarvalg,
  } from './kommandoer';
  import { brevet, standpunktene } from './lesing';
  import { manglene, SVARSKJEMA } from './svarskjema';
  import {
    BREVKONTROLL,
    HOVEDLINJER,
    KRAVSKJEMA,
    SKJEMA,
    grunntekst,
    leselinjene,
    standpunkttekst,
  } from './tekster';

  let {
    kjernesak,
    u,
    valg = $bindable(tomtSvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når BH går til brevkontrollen og tilbake. */
    valg?: Svarvalg;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();

  const krav = $derived(u.spor.vederlag.gjeldendeKrav!);
  const poster = $derived(kravposterI(krav));
  const flere = $derived(poster.length > 1);
  const navnet = (p: Kravpost) => (flere ? p.betegnelse : undefined);
  const krevdI = (p: Kravpost) => p.beloep ?? 0;
  // I øre, så summen ikke får avrundingsfeil.
  const krevdTotalt = $derived(
    poster.reduce((sum, p) => sum + Math.round(krevdI(p) * 100), 0) / 100
  );
  const harPost = $derived(harProduktivitetspost(krav));
  // Kjernen sier hva svaret ennå ikke kan gjelde: rigg og drift.
  const hinder = $derived(harPost ? null : hindrerSvarPaaKravet(krav));
  const harRegel = $derived(poster.some(etterRegel));
  const stoppet = $derived(harPost || hinder !== null);

  let valgtPost = $state<string | null>(null);
  let postliste = $state<Postliste<Kravpost> | null>(null);
  // Valgene for hver kravpost i gjeldende krav finnes før skjemaet tegnes, også når kravet er nytt.
  $effect.pre(() => {
    for (const p of poster) valg.poster[p.betegnelse] ??= tomPost();
  });
  function godkjennAlleFormer() {
    for (const p of poster) (valg.poster[p.betegnelse] ??= tomPost()).form = 'godtar';
  }
  function godkjennAlle() {
    for (const p of poster)
      if (!etterRegel(p)) (valg.poster[p.betegnelse] ??= tomPost()).beloep = 'hele';
  }

  // Svaret uten begrunnelsene og forbeholdet, så det ikke regnes på nytt for hvert tegn i et
  // tekstfelt (#1925).
  const utkast = $derived(
    vederlagssvaret(
      { iTide: valg.iTide, poster: valg.poster, begrunnelser: {}, forbehold: '' },
      u,
      kjernesak.regler
    )!
  );
  const etter = $derived(kjernesak.forhaandsvist(utkast));
  // OV-U33: lagene står også før spørsmålene er besvart (`lagIVederlaget`).
  const lagene = $derived(stoppet ? null : kjernesak.lagForUtkastet(utkast.svar[0], 'vederlag'));
  type IPosten = { f: Forutsetning; post?: Kravpost };
  const iPosten = (liste: Forutsetning[], post?: Kravpost): IPosten[] =>
    liste.map((f) => ({ f, post }));
  const iLaget = (
    p: Kravpost,
    art: 'beloep' | 'oppgjoersform' | 'rettidighet' | 'justering'
  ): Forutsetning[] =>
    lagene?.standpunkter.find((x) => x.art === art && !x.saerskilt && x.gjelder === p.id)
      ?.forutsetninger ?? [];
  // Grunnene fra grunnlaget står først i hver liste kjernen gir, og gjelder også varselet
  // (oppdragsgiver 30.10, 1A i #1411).
  const grunnene = $derived(
    poster[0] ? iLaget(poster[0], 'beloep').filter((f) => 'grunn' in f) : []
  );
  const forutsetningene = (p: Kravpost, art: 'oppgjoersform' | 'rettidighet' | 'justering') =>
    iPosten(iLaget(p, art), p);
  const grunnlagsbrev = $derived.by(() => {
    const g = u.spor.forhold.gjeldendeSvar;
    return g ? brevet(u, g.dokument) : null;
  });
  const nyttSvar = $derived.by(() => {
    const s = etter?.spor.vederlag.gjeldendeSvar;
    return s && !u.spor.vederlag.svar.some((x) => x.id === s.id) ? s : null;
  });
  // Standpunktene i svaret slik kjernen forhåndsviser det, med laget brevet gir dem.
  const nyeStandpunkter = $derived(nyttSvar ? standpunktene(nyttSvar, etter!) : []);
  const postenFor = (s: Standpunkt) =>
    'gjelder' in s && s.gjelder !== undefined ? poster.find((p) => p.id === s.gjelder) : undefined;
  const linjer = $derived(
    nyeStandpunkter.map((l) => {
      const post = 'standpunkt' in l ? postenFor(l.standpunkt) : undefined;
      return {
        tekst:
          'grunn' in l
            ? grunntekst(l.grunn, true, l.brev)
            : standpunkttekst(
                l.standpunkt,
                true,
                l.standpunkt.art === 'beloep' && !l.standpunkt.saerskilt && post
                  ? krevdI(post)
                  : undefined,
                post && flere ? post.betegnelse : undefined
              ),
        lag: l.lag,
      };
    })
  );
  // Leselinjen for en lukket kravpost: standpunktene slik kjernen skriver dem, eller valgene
  // til svaret er fullstendig.
  const leselinje = (p: Kravpost): string[] => {
    const fra = leselinjene(nyeStandpunkter, p);
    if (fra.length) return fra;
    const v = postvalget(valg, p.betegnelse);
    const beloep = beloepsvalget(v, p);
    const regel = regelen(p);
    const tilbud = spoerOmTilbud(v, p) && v.kreverTilbud;
    const form =
      v.form === null
        ? tilbud && regel
          ? SKJEMA.godkjennerIkkeRegel(regel)
          : null
        : v.form === 'godtar'
          ? SKJEMA.godkjenner(p.oppgjoersform)
          : SKJEMA.menerForm(v.form);
    return [
      form && tilbud ? `${form}, ${SKJEMA.kreverTilbudKort}` : form,
      beloep === null
        ? null
        : beloep === 'deler'
          ? `${SKJEMA.deler}: ${v.delbeloep || '–'} kr`
          : SKJEMA[beloep],
    ].filter((x): x is string => x !== null);
  };
  // Beløp i mer enn ett lag er alternativer, ikke tillegg (Varden, skjerm B).
  const alternativer = $derived(
    new Set(
      nyeStandpunkter
        .filter((s) => s.lag && 'standpunkt' in s && s.standpunkt.art === 'beloep')
        .map((s) => s.lag)
    ).size > 1
  );
  // Det som mangler, med skjemaets ord. Kjernen avviser det samme med feltkoder.
  const delbeloepFeil = (p: Kravpost): string | null => {
    const v = postvalget(valg, p.betegnelse);
    if (beloepsvalget(v, p) !== 'deler') return null;
    const lest = lesKroner(v.delbeloep);
    if ('feil' in lest) return lest.feil;
    if (lest.verdi === undefined) return SKJEMA.manglerDelbeloep;
    return lest.verdi <= 0 || lest.verdi >= krevdI(p) ? HOVEDLINJER.beloepUtenfor(krevdI(p)) : null;
  };
  const hovedvarselet = $derived(spoerOmHovedvarselet(u, kjernesak.regler));
  const mangler = $derived(
    manglene(uid, [
      {
        felt: 'itide',
        post: null,
        tekst: hovedvarselet && valg.iTide === null ? SKJEMA.manglerITide : null,
      },
      ...poster.flatMap((p) => {
        const v = postvalget(valg, p.betegnelse);
        const regel = regelen(p);
        const i = (tekst: string | null) =>
          tekst ? SKJEMA.iPosten(navnet(p) ?? null, tekst) : null;
        return [
          {
            felt: `form-${p.betegnelse}`,
            post: p.id,
            tekst: i(formBesvart(v, p) ? null : SKJEMA.manglerForm(p.oppgjoersform)),
          },
          // KA-U68: når BH godkjenner justerte enhetspriser, tar svaret stilling til varselet og
          // justeringen. Ellers står de subsidiært og er valgfrie (VS-U56).
          {
            felt: `varsel-${p.betegnelse}`,
            post: p.id,
            tekst: i(
              justerteEnhetspriser(p) && v.form === 'godtar' && v.varsletITide === null
                ? SKJEMA.manglerVarselJustering
                : null
            ),
          },
          {
            felt: `justering-${p.betegnelse}`,
            post: p.id,
            tekst: i(
              justerteEnhetspriser(p) && v.form === 'godtar' && v.godtarJustering === null
                ? SKJEMA.manglerJustering
                : null
            ),
          },
          {
            felt: `beloep-${p.betegnelse}`,
            post: p.id,
            tekst: i(
              spoerOmBeloepet(v, p) && beloepsvalget(v, p) === null ? SKJEMA.manglerBeloep : null
            ),
          },
          { felt: `delbeloep-${p.betegnelse}`, post: p.id, tekst: i(delbeloepFeil(p)) },
        ];
      }),
    ])
  );

  const virkninger = $derived([
    ...(nyttSvar?.beslutningsgrunnlag.sammenfall ? [VIRKNING.sammenfall] : []),
    ...(kjernesak.forbehold ? [VIRKNING.forbehold] : []),
    // KA-U64: varselet etter § 34.4 har ingen virkning.
    ...(nyttSvar?.standpunkter.some(
      (s) => s.art === 'rettidighet' && !s.iTide && s.hjemmel !== '34.4'
    )
      ? [BREVKONTROLL.akseptOmfatter]
      : []),
  ]);
</script>

<!-- Forutsetningene i en kravpost gjelder den, også innsigelsen etter § 34.3.3 (`innenforKravposten`). -->
{#snippet forutsetning({ f, post }: IPosten)}
  {#if 'grunn' in f}
    {SKJEMA.grunnen(f.grunn, grunnlagsbrev!)}
  {:else if 'oppgjoersform' in f}
    <a href={`#${uid}-form-${post!.betegnelse}`}>{SKJEMA.standpunktetTilFormen}</a>
  {:else if f.innsigelse === '34.3.3'}
    <a href={`#${uid}-varsel-${post!.betegnelse}`}>{SKJEMA.innsigelsenJustering}</a>
  {:else if f.innsigelse === '34.1.3'}
    {SKJEMA.innsigelsenSaerskilt}
  {:else}
    <a href={`#${uid}-itide`}>{SKJEMA.innsigelsenSenVarsling}</a>
  {/if}
{/snippet}

<Svarskjema
  {kjernesak}
  {u}
  spor="vederlag"
  {utkast}
  medTekstene={(punktene) => vederlagssvaret(valg, u, kjernesak.regler, punktene)!}
  bind:tekster={valg}
  {linjer}
  {alternativer}
  {virkninger}
  {mangler}
  {postliste}
  stopp={stoppet ? (hinder ? SKJEMA.ikkeStoettetHinder(hinder) : SKJEMA.ikkeStoettet) : null}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
>
  {#snippet spoersmaal(feil)}
    {#snippet postvalgene(p: Kravpost)}
      {@const v = valg.poster[p.betegnelse]}
      {#if v}
        {@const forms = forutsetningene(p, 'oppgjoersform')}
        <Gjelderhvis
          id={`${uid}-form-${p.betegnelse}-forutsetninger`}
          liste={forms}
          punkt={forutsetning}
        />
        {@const regel = regelen(p)}
        {#if regel}
          {@render regelvalgene(p, regel, v, forms.length > 0)}
        {:else}
          {@render fastsumvalgene(p, v, forms.length > 0)}
        {/if}
      {/if}
    {/snippet}

    {#snippet fastsumvalgene(p: Kravpost, v: Postvalg, forutsatt: boolean)}
      {@const beloepFeil = feil(`${uid}-delbeloep-${p.betegnelse}`)}
      <Valg
        navn={`${uid}-form-${p.betegnelse}`}
        spoersmaal={SKJEMA.formSpoersmaal}
        beskrevetAv={forutsatt ? `${uid}-form-${p.betegnelse}-forutsetninger` : undefined}
        valg={[
          { verdi: 'godtar', tekst: SKJEMA.godkjenner('tilbud') },
          { verdi: 'enhetspriser', tekst: SKJEMA.menerForm('enhetspriser') },
          { verdi: 'regningsarbeid', tekst: SKJEMA.menerForm('regningsarbeid') },
        ]}
        bind:verdi={v.form}
        feil={feil(`${uid}-form-${p.betegnelse}`)}
        lett
        stablet
      />
      <!-- Spørsmålet om beløpet står bare når BH godkjenner fast sum (KA-U72). Det er i
         samme lag som oppgjørsformen og viser til forutsetningene over. -->
      {#if spoerOmBeloepet(v, p)}
        <Valg
          navn={`${uid}-beloep-${p.betegnelse}`}
          spoersmaal={SKJEMA.beloepSpoersmaal}
          beskrevetAv={forutsatt ? `${uid}-form-${p.betegnelse}-forutsetninger` : undefined}
          valg={[
            { verdi: 'hele', tekst: SKJEMA.hele },
            { verdi: 'deler', tekst: SKJEMA.deler },
            { verdi: 'ingenting', tekst: SKJEMA.ingenting },
          ]}
          bind:verdi={v.beloep}
          feil={feil(`${uid}-beloep-${p.betegnelse}`)}
          lett
          stablet
        />
      {/if}
      {#if beloepsvalget(v, p) === 'deler'}
        {@const id = `${uid}-delbeloep-${p.betegnelse}`}
        <Tallfelt
          {id}
          etikett={SKJEMA.belopEtikett}
          hjelp={SKJEMA.belopHjelp(krevdI(p))}
          enhet="kr"
          inputmode="decimal"
          bind:verdi={v.delbeloep}
          feil={beloepFeil}
        />
      {/if}
    {/snippet}

    <!-- En kravpost etter en beregningsregel har ikke et krevd beløp (KA-U66). BH tar stilling til
       regelen, kan kreve tilbud (KA-U69, KA-U71) og svarer på varselet og justeringen for posten
       (KA-U64, KA-U68, VS-U56, VS-U63). Prototype v3 og v4, `#svar`. -->
    {#snippet regelvalgene(p: Kravpost, regel: Regel, v: Postvalg, forutsatt: boolean)}
      {@const annen = denAndreRegelen(regel)}
      <Valg
        navn={`${uid}-form-${p.betegnelse}`}
        spoersmaal={SKJEMA.formSpoersmaalRegel}
        beskrevetAv={forutsatt ? `${uid}-form-${p.betegnelse}-forutsetninger` : undefined}
        valg={[
          { verdi: 'godtar', tekst: SKJEMA.godkjenner(regel) },
          { verdi: annen, tekst: SKJEMA.menerForm(annen) },
        ]}
        bind:verdi={v.form}
        feil={feil(`${uid}-form-${p.betegnelse}`)}
        lett
        stablet
      />
      {#if spoerOmTilbud(v, p)}
        <fieldset class="avkrysning">
          <legend>{SKJEMA.tilbudSpoersmaal}</legend>
          <label class="avkryss">
            <input
              type="checkbox"
              id={`${uid}-tilbud-${p.betegnelse}`}
              bind:checked={v.kreverTilbud}
            />
            {SKJEMA.kreverTilbud(navnet(p) ?? null)}
          </label>
        </fieldset>
      {/if}
      {#if spoerOmVarselet(v, p)}
        {#if regel === 'regningsarbeid'}
          <div class="setning">
            <p id={`${uid}-varsel-${p.betegnelse}-standpunkt`} aria-live="polite">
              <strong>{SKJEMA.varselRegning}</strong>
              {v.varsletITide === false ? SKJEMA.ikkeGittEllerForSent : SKJEMA.ingenInnsigelse}
            </p>
            <Knapp
              variant="lenke"
              onclick={() => (v.varsletITide = v.varsletITide === false ? null : false)}
              >{v.varsletITide === false
                ? SKJEMA.ingenInnsigelseLikevel
                : SKJEMA.gjoerGjeldendeVarsel}</Knapp
            >
          </div>
        {:else}
          {@const varselet = forutsetningene(p, 'rettidighet')}
          {@const justeringen = forutsetningene(p, 'justering')}
          <div class="betinget">
            <Gjelderhvis
              id={`${uid}-varsel-${p.betegnelse}-forutsetninger`}
              liste={varselet}
              punkt={forutsetning}
            />
            <Valg
              navn={`${uid}-varsel-${p.betegnelse}`}
              spoersmaal={SKJEMA.varselJusteringSpoersmaal}
              valgfri={v.form !== 'godtar'}
              beskrevetAv={varselet.length
                ? `${uid}-varsel-${p.betegnelse}-forutsetninger`
                : undefined}
              valg={[
                { verdi: true, tekst: SKJEMA.komITide },
                { verdi: false, tekst: SKJEMA.komForSent },
              ]}
              bind:verdi={v.varsletITide}
              feil={feil(`${uid}-varsel-${p.betegnelse}`)}
              lett
              stablet
            />
          </div>
          <div class="betinget">
            <Gjelderhvis
              id={`${uid}-justering-${p.betegnelse}-forutsetninger`}
              liste={justeringen}
              punkt={forutsetning}
            />
            <Valg
              navn={`${uid}-justering-${p.betegnelse}`}
              spoersmaal={SKJEMA.justeringSpoersmaal}
              valgfri={v.form !== 'godtar'}
              beskrevetAv={justeringen.length
                ? `${uid}-justering-${p.betegnelse}-forutsetninger`
                : undefined}
              valg={[
                { verdi: true, tekst: SKJEMA.godkjennerJustering },
                { verdi: false, tekst: SKJEMA.bestriderJustering },
              ]}
              bind:verdi={v.godtarJustering}
              feil={feil(`${uid}-justering-${p.betegnelse}`)}
              lett
              stablet
            />
          </div>
        {/if}
      {/if}
    {/snippet}

    {#if hovedvarselet}
      <Spoersmaal
        id={`${uid}-sp-varsel`}
        tittel={SKJEMA.varselTittel}
        hjemmel={['34.1.2']}
        info={{ navn: SKJEMA.datoInfoNavn, tekst: SKJEMA.datoInfo }}
      >
        <Gjelderhvis
          id={`${uid}-itide-forutsetninger`}
          liste={iPosten(grunnene)}
          punkt={forutsetning}
        />
        <Varseldatoer {u} spor="vederlag" sendt={SKJEMA.kravSendt} />
        <Valg
          navn={`${uid}-itide`}
          spoersmaal={SKJEMA.varselSpoersmaal}
          beskrevetAv={grunnene.length ? `${uid}-itide-forutsetninger` : undefined}
          valg={[
            { verdi: true, tekst: SKJEMA.iTide },
            { verdi: false, tekst: SKJEMA.forSent },
          ]}
          bind:verdi={valg.iTide}
          feil={feil(`${uid}-itide`)}
        />
      </Spoersmaal>
    {/if}

    <Spoersmaal
      id={`${uid}-sp-beloep`}
      tittel={SKJEMA.beloepTittel}
      tillegg={kroner(krevdTotalt)}
      hjemmel={['34.1', '34.2']}
    >
      {#if flere}
        <p class="dempet">{SKJEMA.ettSvarPerPost}</p>
        <div class="snarveier">
          <Knapp variant="lenke" onclick={godkjennAlleFormer}
            >{harRegel ? SKJEMA.godkjennAlleFormerRegel : SKJEMA.godkjennAlleFormer}</Knapp
          >
          <Knapp variant="lenke" onclick={godkjennAlle}
            >{harRegel ? SKJEMA.godkjennAlleFaste : SKJEMA.godkjennAlle}</Knapp
          >
        </div>
      {/if}
      <Postliste
        bind:this={postliste}
        bind:valgt={valgtPost}
        {poster}
        prefiks={uid}
        kolonne={SVARSKJEMA.postKolonne}
        navn={(p) => p.betegnelse}
        beskrivelse={(p) => p.beskrivelse}
        krever={(p) =>
          etterRegel(p) ? SKJEMA.teKreverRegel(p) : SKJEMA.teKrever(krevdI(p), p.pns)}
        kravet={(p) => (etterRegel(p) ? KRAVSKJEMA.formnavn[p.oppgjoersform] : kroner(krevdI(p)))}
        {leselinje}
        foersteFelt={(p) => `${uid}-form-${p.betegnelse}`}
        valgene={postvalgene}
      />
    </Spoersmaal>
  {/snippet}
</Svarskjema>

<style>
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  /* Kravet om tilbud er ett valg ved siden av oppgjørsformen (prototype v3, D-15). */
  .avkrysning {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .avkrysning legend {
    padding: 0;
    margin-bottom: var(--spacing-3);
    font-weight: 600;
    color: var(--ink);
  }
  /* Lett vekt inne i et åpent element, som `Valg lett`: flaten for valgt når den er avkrysset
     («To vekter på et valg» i system.md). */
  .avkryss {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-3);
    min-height: 48px;
    padding: 0 var(--spacing-4);
    border: 1px solid transparent;
    border-radius: var(--r-felt);
    color: var(--ink);
    cursor: pointer;
  }
  .avkryss:has(input:checked) {
    background: var(--surface-selected);
  }
  .avkryss:not(:has(input:checked)):hover {
    background: var(--surface-inset);
  }
  .avkryss:has(input:focus-visible) {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .avkryss input {
    width: 20px;
    height: 20px;
    accent-color: var(--ink);
  }
  /* Punkt 34.4: normalsvaret er en setning, unntaket en lenke (system.md). */
  .setning {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-1);
  }
  /* Lenken står på samme kant som setningen den hører til. */
  .setning :global(.knapp-lenke) {
    padding-inline: 0;
  }
  /* «Gjelder hvis» hører til spørsmålet under seg, ikke til det over (U-8). */
  .betinget {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
  }
  .snarveier {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2) var(--spacing-5);
  }
</style>
