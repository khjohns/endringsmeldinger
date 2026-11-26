<!--
  BH svarer på et varsel etter punkt 34.3.3 eller 34.4 som står alene (G-9 i BF-14), i samme
  svarskjema som svaret på kravet, med bare varselet (designdelen i VS-U77). Svaret er et vanlig
  svar i vederlaget, og `gjelder` er varselet (VS-U79). Et nytt svar erstatter det forrige
  (VS-U77 punkt 33). Kjernen lager brevet og avviser det den ikke godtar. Er varselet lagt til
  mellom to krav, viser et kort i høyre kolonne svarene på kravpostene fra forrige brev, bare til
  lesing (VS-U65).
-->
<script lang="ts">
  import { SVARTITTEL_PAA_VARSELET } from '#kjerne/frosset/brevtittel.ts';
  import { FORHOLDET } from '#kjerne/frosset/tekst.ts';
  import { kravposterI } from '#kjerne/spor/vederlag/format.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import {
    erSvarPaaVarsel,
    varseletFoerBrevet,
    type VarseletAlene,
  } from '#lib/kjernesak/vederlagskrav.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { Kravpost } from '#kjerne/typer.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Forholdsgrunn from './Forholdsgrunn.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Knapp from './Knapp.svelte';
  import Stoettekort from './Stoettekort.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import {
    kravetIKortform,
    tomtVarselsvar,
    varselsvaret,
    varseletISvaret,
    type Varselsvalg,
  } from './kommandoer';
  import { brevMedUtsagn, brevene, brevet, standpunktene } from './lesing';
  import type { Innsigelsen } from './svarlagene';
  import { manglene } from './svarskjema';
  import {
    grunntekst,
    HANDLINGENE,
    leselinjene,
    SKJEMA,
    SVARSKJEMA,
    VARSELSVARET,
    VEDERLAGET,
    innsigelsenOmVarselet,
    oppgivelsestekst,
    standpunkttekst,
  } from './tekster';

  let {
    kjernesak,
    u,
    varselet,
    valg = $bindable(tomtVarselsvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
    onforholdet,
    nyttSvarPaaKravet = null,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Varselet svaret gjelder (`varseletSvaretPaa`). */
    varselet: VarseletAlene;
    /** Valgene står når BH går til brevkontrollen og tilbake. */
    valg?: Varselsvalg;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
    /** Åpner siden for forholdet uten å forkaste svarutkastet. */
    onforholdet?: () => void;
    /**
     * Åpner et nytt svar på kravet når kjernen tilbyr det (VS-U65), `'ikke bygget'` når Varden
     * ikke har skjemaet for det (#1636), og `null` når kjernen ikke tilbyr det.
     */
    nyttSvarPaaKravet?: (() => void) | 'ikke bygget' | null;
  } = $props();
  const uid = $props.id();

  const hjemmel = $derived(varselet.hjemmel);
  const varselbrevet = $derived(brevMedUtsagn(u, varselet.id));
  const foer = $derived(
    varselet.foer && {
      iTide: varselet.foer.iTide,
      brev: brevet(u, varselet.foer.dokument),
      ikkeGitt: !erSvarPaaVarsel(u, varselet.foer.dokument),
    }
  );
  const utenTekster = (v: Varselsvalg) => ({ ...v, begrunnelser: {}, forbehold: '' });
  // Svaret uten begrunnelsene og forbeholdet, så det ikke regnes på nytt for hvert tegn (#1925).
  const utkast = $derived(varselsvaret(utenTekster(valg), varselet, kjernesak.regler));
  const nyttSvarI = (k: Record<string, unknown>) => {
    const etter = kjernesak.forhaandsvist(k);
    const s = etter?.spor.vederlag.svarPaaVarsler.findLast((x) => x.gjelder === varselet.id);
    // Svaret sendes fra løsningen, så det fryses med det gjeldende svaret på forholdet
    // (`svaretPaaForholdetPaaDagen` uten dag, OV-U32).
    return s && s.id !== varselet.forrigeSvar
      ? standpunktene(s, etter!, etter!.spor.forhold.gjeldendeSvar)
      : [];
  };
  const nyeStandpunkter = $derived(nyttSvarI(utkast));
  const iTide = $derived(varseletISvaret(valg, varselet));
  // OV-U32, VS-U4: det varselet og justeringen gjelder hvis, lest av kjernen, også før de er
  // besvart. Som i utfyllingen for kravposten (`lagIVederlaget`) regnes et ubesvart varsel som
  // innsigelse og en ubesvart justering som bestridt.
  const utfylt = $derived(
    hjemmel === '34.3.3' && (valg.varsletITide === null || valg.godtarJustering === null)
      ? nyttSvarI(
          varselsvaret(
            utenTekster({
              ...valg,
              varsletITide: valg.varsletITide ?? false,
              godtarJustering: valg.godtarJustering ?? false,
            }),
            varselet,
            kjernesak.regler
          )
        )
      : nyeStandpunkter
  );
  // KA-U64: standpunktet etter § 34.4 har ikke noe lag.
  const gjelderHvis = (art: 'rettidighet' | 'justering'): Innsigelsen[] =>
    hjemmel === '34.4'
      ? []
      : (utfylt.find((l) => 'standpunkt' in l && l.standpunkt.art === art)?.vilkaar ?? []);
  const varseletGjelderHvis = $derived(gjelderHvis('rettidighet'));
  const justeringenGjelderHvis = $derived(gjelderHvis('justering'));
  const oppgir = $derived(iTide === true && foer?.iTide === false && foer.brev ? foer : null);

  const linjer = $derived(
    nyeStandpunkter.map((l) => {
      // OV-U32: lagene svaret på forholdet opptar, står foran, i punktet «Forholdet».
      if ('grunn' in l)
        return {
          punkt: FORHOLDET,
          tekst: grunntekst(l.grunn, true, l.brev),
          lag: l.lag,
          vilkaar: l.vilkaar,
          heller: l.heller,
        };
      const s = l.standpunkt;
      const tekst =
        s.art === 'rettidighet' && oppgir
          ? oppgivelsestekst(hjemmel, oppgir.brev!, true, undefined, oppgir.ikkeGitt)
          : standpunkttekst(s, true, undefined, undefined, false, false);
      return {
        punkt: s.art === 'justering' ? 'justering' : hjemmel,
        tekst,
        lag: l.lag,
        vilkaar: l.vilkaar,
        heller: l.heller,
      };
    })
  );

  const varselpunktet = $derived(VARSELSVARET.punktet(hjemmel));
  /** Punktet i panelet med linjene slik kjernen skriver dem, eller statusen før svaret. */
  const punktet = (punkt: string, navn: string, foerSvaret: string) => {
    const iPunktet = linjer.filter((l) => l.punkt === punkt);
    return {
      punkt,
      navn,
      besvart: iPunktet.length > 0,
      linjer: iPunktet.length ? iPunktet : [{ tekst: foerSvaret, lag: null }],
    };
  };
  const punkteneForVarselet = $derived(
    hjemmel === '34.4'
      ? [punktet(hjemmel, varselpunktet, SKJEMA.ingenInnsigelse)]
      : [
          punktet(hjemmel, varselpunktet, SKJEMA.ikkeBesvart),
          punktet('justering', VARSELSVARET.justeringen, SKJEMA.ikkeBesvart),
        ]
  );
  const forholdet = $derived(linjer.filter((l) => l.punkt === FORHOLDET));
  const skjemapunkter = $derived([
    ...(forholdet.length
      ? [{ punkt: FORHOLDET, navn: SKJEMA.forholdspunktet, linjer: forholdet }]
      : []),
    ...punkteneForVarselet,
  ]);
  const mangler = $derived(
    manglene(uid, [
      {
        felt: 'varsel-standpunkt',
        post: null,
        tekst: hjemmel === '34.4' && iTide === null ? VARSELSVARET.manglerInnsigelse : null,
      },
      {
        felt: 'justering',
        post: null,
        tekst:
          hjemmel === '34.3.3' && valg.godtarJustering === null ? SKJEMA.manglerJustering : null,
      },
    ])
  );
  // Svaret på kravet som gjelder, med brevet og kravpostene, til kortet i høyre kolonne (VS-U65).
  let ikkeBygget = $state(false);
  const forrigeSvar = $derived.by(() => {
    const { gjeldendeKrav: krav, gjeldendeSvar: svar } = u.spor.vederlag;
    if (!krav || !svar || svar.gjelder !== krav.id) return null;
    // Bare et varsel lagt til etter en kravversjon står mellom to krav (#2358).
    const alle = brevene(u);
    const plass = (id: string) => alle.findIndex((b) => b.id === id);
    const varselet = varselbrevet ? plass(varselbrevet.id) : -1;
    const krevd = u.spor.vederlag.krav.map((k) => plass(k.dokument)).filter((i) => i >= 0);
    if (varselet < 0 || !krevd.some((i) => i < varselet)) return null;
    const brev = brevet(u, svar.dokument);
    return brev && { brev, poster: kravposterI(krav), linjer: standpunktene(svar, u) };
  });

  /** Svaret på kravposten med ordene brevet brukte om varselet, etter standpunktet før (MM-U50). */
  const leselinje = (f: NonNullable<typeof forrigeSvar>, p: Kravpost) => {
    const foer = varseletFoerBrevet(u, p, f.brev.id);
    return leselinjene(
      f.linjer,
      p,
      VEDERLAGET.lagetVilkaar,
      foer?.iTide === false,
      !erSvarPaaVarsel(u, foer?.dokument ?? '')
    );
  };
  // VS-U77 punkt 30 og 31: svaret på varselet gir ingen enighet og ikke noe sammenfall.
  const virkninger: string[] = [];
</script>

{#snippet nyttSvaret()}
  {#if nyttSvarPaaKravet}
    {@const aapne = nyttSvarPaaKravet}
    <Knapp
      variant="lenke"
      kompakt
      iFlukt
      onclick={() => (aapne === 'ikke bygget' ? (ikkeBygget = true) : aapne())}
      >{VARSELSVARET.nyttSvarPaaKravet}</Knapp
    >
    {#if aapne === 'ikke bygget'}
      <!-- Den levende regionen står fra start, så teksten leses opp når den kommer (#1636). -->
      <p class="dempet" role="status">{ikkeBygget ? HANDLINGENE.ikkeBygget : ''}</p>
    {/if}
  {/if}
{/snippet}

{#snippet svareneFoer()}
  {#if forrigeSvar}
    {@const f = forrigeSvar}
    <!-- Et lite kort i høyre kolonne, fordi svarene ikke er en del av brevet (VS-U65,
       oppdragsgiver 25.11 i #2358). -->
    <Stoettekort
      id={`${uid}-svarene-foer`}
      tittel={VARSELSVARET.svareneFoer(f.brev)}
      bunn={nyttSvarPaaKravet ? nyttSvaret : undefined}
    >
      <!-- Den andre setningen viser til lenken, så den står bare med lenken (MM-U25). -->
      <p class="dempet">
        {VARSELSVARET.svareneStaar}{#if nyttSvarPaaKravet}{` ${VARSELSVARET.endreDem}`}{/if}
      </p>
      <ul>
        {#each f.poster as p (p.id)}
          {@const lest = leselinje(f, p)}
          <li>
            <strong
              ><span class="betegnelse">{p.betegnelse}</span>
              {p.beskrivelse}</strong
            >
            <span class="krav"
              ><span class="visually-hidden">{SVARSKJEMA.kravetKolonne}:</span>
              {kravetIKortform(p)}</span
            >
            <span class="visually-hidden">{VARSELSVARET.svaretI(f.brev)}:</span>
            {#each lest as l, i (i)}<span>{l}</span>{:else}<span class="dempet"
                >{SKJEMA.ikkeBesvart}</span
              >{/each}
          </li>
        {/each}
      </ul>
    </Stoettekort>
  {/if}
{/snippet}

<Svarskjema
  {kjernesak}
  {u}
  spor="vederlag"
  tittel={SVARTITTEL_PAA_VARSELET[hjemmel]}
  svarerPaa={varselbrevet}
  {utkast}
  medTekstene={(punktene) => varselsvaret(valg, varselet, kjernesak.regler, punktene)}
  bind:tekster={valg}
  {linjer}
  {virkninger}
  {mangler}
  begrunnelserISkjemaet={punkteneForVarselet}
  {skjemapunkter}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
  stoettekort={svareneFoer}
>
  {#snippet spoersmaal(feil, begrunnelse, overskrift)}
    {#snippet vilkaaret(i: Innsigelsen)}
      {#if i.art === 'grunn'}
        <Forholdsgrunn grunn={i.grunn} brev={i.brev} {onforholdet} />
      {:else}
        <!-- En innsigelse som står, er en setning, ikke et valg (`Varselstandpunkt`). -->
        <a href={`#${uid}-varsel${foer?.iTide === false ? '-standpunkt' : ''}`}
          >{innsigelsenOmVarselet(i.art === 'varsel' ? i.hjemmel : hjemmel)}</a
        >
      {/if}
    {/snippet}
    {#snippet foranVarselet()}
      <Gjelderhvis
        id={`${uid}-varsel-forutsetninger`}
        liste={varseletGjelderHvis}
        punkt={vilkaaret}
      />
    {/snippet}
    {#snippet foranJusteringen()}
      <Gjelderhvis
        id={`${uid}-justering-forutsetninger`}
        liste={justeringenGjelderHvis}
        punkt={vilkaaret}
      />
    {/snippet}
    {#snippet etterVarselet()}{@render begrunnelse(hjemmel)}{/snippet}
    {#snippet etterJusteringen()}{@render begrunnelse('justering')}{/snippet}
    {#snippet standpunktet(vis: 'varselet' | 'justeringen')}
      <Varselstandpunkt
        varselId={`${uid}-varsel`}
        justeringId={`${uid}-justering`}
        {hjemmel}
        {foer}
        bind:varsletITide={valg.varsletITide}
        bind:godtarJustering={valg.godtarJustering}
        ikkeGitt={false}
        justeringValgfri={false}
        justeringFeil={feil(`${uid}-justering`)}
        {foranVarselet}
        {foranJusteringen}
        beskrevetAvVarselet={varseletGjelderHvis.length
          ? `${uid}-varsel-forutsetninger`
          : undefined}
        beskrevetAvJusteringen={justeringenGjelderHvis.length
          ? `${uid}-justering-forutsetninger`
          : undefined}
        {etterVarselet}
        {etterJusteringen}
        {vis}
      />
    {/snippet}
    <!-- Punktene i brevet, med samme nummer, og blekkstreken ved punktet som venter på svar
       (`system.md`, «Utkastet er brevet mens det skrives»). -->
    <Spoersmaal
      id={`${uid}-sp-varselet`}
      aktiv={hjemmel === '34.4' && iTide === null}
      tittel={overskrift(hjemmel) ?? varselpunktet}
    >
      {@render standpunktet('varselet')}
    </Spoersmaal>
    {#if hjemmel === '34.3.3'}
      <Spoersmaal
        id={`${uid}-sp-justeringen`}
        aktiv={valg.godtarJustering === null}
        tittel={overskrift('justering') ?? VARSELSVARET.justeringen}
      >
        {@render standpunktet('justeringen')}
      </Spoersmaal>
    {/if}
  {/snippet}
</Svarskjema>

<style>
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  ul {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* Posten, kravet og svaret under hverandre, som de lukkede postene på smal skjerm. */
  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--spacing-3) 0;
    border-bottom: var(--rule-subtle);
    font-size: 14px;
    color: var(--ink-2);
  }
  li:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
  li strong {
    color: var(--ink);
    font-weight: 600;
  }
  .betegnelse,
  .krav {
    font-variant-numeric: tabular-nums;
  }
  .betegnelse {
    margin-inline-end: var(--spacing-2);
  }
  .krav {
    color: var(--ink-3);
  }
</style>
