<!--
  BH svarer på et varsel etter punkt 34.3.3 eller 34.4 som står alene (G-9 i BF-14), i samme
  svarskjema som svaret på kravet, med bare varselet (designdelen i VS-U77). Svaret er et vanlig
  svar i vederlaget, og `gjelder` er varselet (VS-U79). Et nytt svar erstatter det forrige
  (VS-U77 punkt 33). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { SVARTITTEL_PAA_VARSELET } from '#kjerne/frosset/brevtittel.ts';
  import { FORHOLDET } from '#kjerne/frosset/tekst.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { erSvarPaaVarsel, type VarseletAlene } from '#lib/kjernesak/vederlagskrav.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Forholdsgrunn from './Forholdsgrunn.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import { tomtVarselsvar, varselsvaret, varseletISvaret, type Varselsvalg } from './kommandoer';
  import { brevMedUtsagn, brevet, standpunktene } from './lesing';
  import type { Innsigelsen } from './svarlagene';
  import { manglene } from './svarskjema';
  import {
    grunntekst,
    SKJEMA,
    VARSELSVARET,
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
      ? [punktet(hjemmel, varselpunktet, VARSELSVARET.kreverIkkeSvar)]
      : [
          punktet(hjemmel, varselpunktet, SKJEMA.ikkeBesvart),
          punktet('justering', SKJEMA.justeringSpoersmaal, SKJEMA.ikkeBesvart),
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
  // VS-U77 punkt 30 og 31: svaret på varselet gir ingen enighet og ikke noe sammenfall.
  const virkninger: string[] = [];
</script>

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
        tittel={overskrift('justering') ?? SKJEMA.justeringSpoersmaal}
      >
        {@render standpunktet('justeringen')}
      </Spoersmaal>
    {/if}
  {/snippet}
</Svarskjema>
