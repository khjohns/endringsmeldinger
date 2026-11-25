<!--
  BH svarer på et varsel etter punkt 34.3.3 eller 34.4 som står alene (G-9 i BF-14), i samme
  svarskjema som svaret på kravet, med bare varselet (designdelen i VS-U77). Svaret er et vanlig
  svar i vederlaget, og `gjelder` er varselet (VS-U79). Et nytt svar erstatter det forrige
  (VS-U77 punkt 33). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { SVARTITTEL_PAA_VARSELET } from '#kjerne/frosset/brevtittel.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import type { VarseletAlene } from '#lib/kjernesak/vederlagskrav.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import { tomtVarselsvar, varselsvaret, varseletISvaret, type Varselsvalg } from './kommandoer';
  import { brevMedUtsagn, brevet, standpunktene } from './lesing';
  import type { Innsigelsen } from './svarlagene';
  import { manglene } from './svarskjema';
  import {
    BREVSTEG,
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
  } = $props();
  const uid = $props.id();

  const hjemmel = $derived(varselet.hjemmel);
  const varselbrevet = $derived(brevMedUtsagn(u, varselet.id));
  const foer = $derived(
    varselet.foer && { iTide: varselet.foer.iTide, brev: brevet(u, varselet.foer.dokument) }
  );
  const utenTekster = (v: Varselsvalg) => ({ ...v, begrunnelser: {}, forbehold: '' });
  // Svaret uten begrunnelsene og forbeholdet, så det ikke regnes på nytt for hvert tegn (#1925).
  const utkast = $derived(varselsvaret(utenTekster(valg), varselet, kjernesak.regler));
  const nyttSvarI = (k: Record<string, unknown>) => {
    const etter = kjernesak.forhaandsvist(k);
    const s = etter?.spor.vederlag.svarPaaVarsler.findLast((x) => x.gjelder === varselet.id);
    return s && s.id !== varselet.forrigeSvar ? standpunktene(s, etter!) : [];
  };
  const nyeStandpunkter = $derived(nyttSvarI(utkast));
  const iTide = $derived(varseletISvaret(valg, varselet));
  // VS-U4: med innsigelsen mot varselet står justeringen subsidiært. Kjernen sier hva den gjelder
  // hvis, også før justeringen er besvart, med justeringen bestridt i utfyllingen.
  const justeringenGjelderHvis = $derived.by((): Innsigelsen[] => {
    if (hjemmel !== '34.3.3' || iTide !== false) return [];
    const fylt =
      valg.godtarJustering === null
        ? nyttSvarI(
            varselsvaret(
              utenTekster({ ...valg, godtarJustering: false }),
              varselet,
              kjernesak.regler
            )
          )
        : nyeStandpunkter;
    const j = fylt.find((l) => 'standpunkt' in l && l.standpunkt.art === 'justering');
    return (j?.vilkaar ?? []).filter((i) => i.art === 'varsel');
  });
  const oppgir = $derived(iTide === true && foer?.iTide === false ? foer.brev : null);

  const linjer = $derived(
    nyeStandpunkter.flatMap((l) => {
      if (!('standpunkt' in l)) return [];
      const s = l.standpunkt;
      const tekst =
        s.art === 'rettidighet' && oppgir
          ? oppgivelsestekst(hjemmel, oppgir, true, undefined, false)
          : standpunkttekst(s, true, undefined, undefined, false, false);
      return [
        {
          punkt: s.art === 'justering' ? 'justering' : hjemmel,
          tekst,
          lag: l.lag,
          vilkaar: l.vilkaar,
          heller: l.heller,
        },
      ];
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
  const skjemapunkter = $derived(
    hjemmel === '34.4'
      ? [punktet(hjemmel, varselpunktet, SKJEMA.ingenInnsigelse)]
      : [
          punktet(hjemmel, varselpunktet, SKJEMA.ikkeBesvart),
          punktet('justering', SKJEMA.justeringSpoersmaal, SKJEMA.ikkeBesvart),
        ]
  );
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
  const virkninger = $derived([BREVSTEG.enigheten]);
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
  begrunnelserISkjemaet={skjemapunkter}
  {skjemapunkter}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
>
  {#snippet spoersmaal(feil, begrunnelse)}
    {#snippet foranJusteringen()}
      <Gjelderhvis id={`${uid}-justering-forutsetninger`} liste={justeringenGjelderHvis}>
        {#snippet punkt(i: Innsigelsen)}
          <a href={`#${uid}-varsel`}
            >{innsigelsenOmVarselet(i.art === 'varsel' ? i.hjemmel : hjemmel)}</a
          >
        {/snippet}
      </Gjelderhvis>
    {/snippet}
    {#snippet etterVarselet()}{@render begrunnelse(hjemmel)}{/snippet}
    {#snippet etterJusteringen()}{@render begrunnelse('justering')}{/snippet}
    <Spoersmaal id={`${uid}-sp-varslene`} tittel={VARSELSVARET.tittel}>
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
        {foranJusteringen}
        beskrevetAvJusteringen={justeringenGjelderHvis.length
          ? `${uid}-justering-forutsetninger`
          : undefined}
        {etterVarselet}
        {etterJusteringen}
      />
    </Spoersmaal>
  {/snippet}
</Svarskjema>
