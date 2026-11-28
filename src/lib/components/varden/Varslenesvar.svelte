<!--
  BH svarer bare på varslene i et vederlagskrav der kravet selv er varselet etter punkt 34.3.3
  første ledd eller 34.4, per kravpost (VS-U96 punkt 38). Skjemaet har mønsteret i svaret på et
  varsel som står alene (`Varselsvar`), med ett punkt per kravpost og spørsmålene fra svaret på
  kravposten (`Varselstandpunkt`, designdelen i VS-U96: samme svarskjema). Svaret er ikke et svar
  på kravet (punkt 39). BH svarer på postene BH vil ta stilling til, minst én. Et nytt svar
  erstatter det forrige (punkt 33). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { FORHOLDET } from '#kjerne/frosset/tekst.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import {
    iKjedenTilVarslene,
    type VarseletIPosten,
    type VarsleneIVederlagskravet,
  } from '#lib/kjernesak/vederlagskrav.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Forholdsgrunn from './Forholdsgrunn.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Varseldatoer from './Varseldatoer.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import {
    kravetIKortform,
    postenITittelen,
    postvarselvalget,
    tomtVarslenesvar,
    utenTekster,
    varseletIPosten,
    varslenesvaret,
    type Varslenesvalg,
  } from './kommandoer';
  import { brevMedUtsagn, brevet, standpunktene } from './lesing';
  import type { Innsigelsen } from './svarlagene';
  import { manglene } from './svarskjema';
  import {
    grunntekst,
    SKJEMA,
    VARSELSVARET,
    innsigelsenOmVarselet,
    standpunkttekst,
  } from './tekster';

  let {
    kjernesak,
    u,
    varslene,
    valg = $bindable(tomtVarslenesvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
    onforholdet,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Kravpostene svaret kan gjelde (`varsleneIVederlagskravet`). */
    varslene: VarsleneIVederlagskravet;
    /** Valgene står når BH går til brevkontrollen og tilbake. */
    valg?: Varslenesvalg;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
    /** Åpner siden for forholdet uten å forkaste svarutkastet. */
    onforholdet?: () => void;
  } = $props();
  const uid = $props.id();

  const kravbrevet = $derived(brevMedUtsagn(u, varslene.kravversjon));
  const utkast = $derived(varslenesvaret(utenTekster(valg), varslene, kjernesak.regler));
  const nyttSvarI = (k: Record<string, unknown>) => {
    const etter = kjernesak.forhaandsvist(k);
    const s = etter?.spor.vederlag.svarPaaVarsler.findLast(
      iKjedenTilVarslene(varslene.kravversjon)
    );
    // Svaret sendes fra løsningen, så det fryses med det gjeldende svaret på forholdet (OV-U32).
    return s && s.id !== varslene.forrigeSvar
      ? standpunktene(s, etter!, etter!.spor.forhold.gjeldendeSvar)
      : [];
  };
  const nyeStandpunkter = $derived(nyttSvarI(utkast));
  // OV-U32, VS-U4: det varselet og justeringen gjelder hvis, lest av kjernen også før de er
  // besvart. Som i `Varselsvar` regnes et ubesvart varsel etter § 34.3.3 som innsigelse og en
  // ubesvart justering som bestridt.
  const utfylteValg = $derived(
    Object.fromEntries(
      varslene.poster.map((p) => {
        const v = postvarselvalget(valg, p.post.id);
        return [
          p.post.id,
          p.hjemmel === '34.4'
            ? v
            : {
                varsletITide: v.varsletITide ?? false,
                godtarJustering: v.godtarJustering ?? false,
              },
        ];
      })
    )
  );
  // Utfylt er det samme svaret når alle spørsmålene er besvart, så kjernen kjøres bare én gang.
  const utfylt = $derived(
    varslene.poster.every(
      (p) =>
        p.hjemmel === '34.4' ||
        (postvarselvalget(valg, p.post.id).varsletITide !== null &&
          postvarselvalget(valg, p.post.id).godtarJustering !== null)
    )
      ? nyeStandpunkter
      : nyttSvarI(
          varslenesvaret(utenTekster({ ...valg, poster: utfylteValg }), varslene, kjernesak.regler)
        )
  );
  const gjelderHvis = (p: VarseletIPosten, art: 'rettidighet' | 'justering'): Innsigelsen[] =>
    p.hjemmel === '34.4'
      ? []
      : (utfylt.find(
          (l) =>
            'standpunkt' in l &&
            l.standpunkt.art === art &&
            'gjelder' in l.standpunkt &&
            l.standpunkt.gjelder === p.post.id
        )?.vilkaar ?? []);

  const linjer = $derived(
    nyeStandpunkter.map((l) => {
      if ('grunn' in l)
        return {
          punkt: FORHOLDET,
          tekst: grunntekst(l.grunn, true, l.brev),
          lag: l.lag,
          vilkaar: l.vilkaar,
          heller: l.heller,
        };
      const s = l.standpunkt;
      return {
        punkt: s.art === 'rettidighet' && s.hjemmel === '34.1.2'
          ? '34.1.2'
          : 'gjelder' in s ? s.gjelder : '',
        tekst: standpunkttekst(s, true, undefined, undefined, false, false),
        lag: l.lag,
        vilkaar: l.vilkaar,
        heller: l.heller,
      };
    })
  );
  const forholdet = $derived(linjer.filter((l) => l.punkt === FORHOLDET));
  const hovedvarselet = $derived.by(() => {
    if (varslene.hovedvarseletFoer === undefined) return null;
    const svar = linjer.filter((l) => l.punkt === '34.1.2');
    return {
      punkt: '34.1.2',
      navn: VARSELSVARET.punktet('34.1.2'),
      besvart: svar.length > 0,
      linjer: svar.length ? svar : [{ tekst: SKJEMA.ikkeBesvart, lag: null }],
    };
  });
  const hovedvarseletFoer = $derived(
    varslene.hovedvarseletFoer
      ? { iTide: varslene.hovedvarseletFoer.iTide, brev: brevet(u, varslene.hovedvarseletFoer.dokument), ikkeGitt: false }
      : null
  );
  // Brevet har ett punkt per kravpost, med betegnelsen som nøkkel (`brevtekst.ts`).
  const postpunktene = $derived(
    varslene.poster.map((p) => {
      const iPunktet = linjer.filter((l) => l.punkt === p.post.id);
      return {
        punkt: p.post.betegnelse,
        navn: `${p.post.betegnelse} ${p.post.beskrivelse}`,
        besvart: iPunktet.length > 0,
        linjer: iPunktet.length ? iPunktet : [{ tekst: SKJEMA.ikkeBesvart, lag: null }],
      };
    })
  );
  const skjemapunkter = $derived([
    ...(forholdet.length
      ? [{ punkt: FORHOLDET, navn: SKJEMA.forholdspunktet, linjer: forholdet }]
      : []),
    ...(hovedvarselet ? [hovedvarselet] : []),
    ...postpunktene,
  ]);
  const besvart = (p: VarseletIPosten) =>
    varseletIPosten(valg, p) !== null || postvarselvalget(valg, p.post.id).godtarJustering !== null;
  const mangler = $derived(
    manglene(uid, [
      // Beskjeden står under innledningen, fordi den gjelder alle postene.
      {
        felt: 'poster',
        post: null,
        tekst: varslene.poster.some(besvart)
          ? null
          : VARSELSVARET.manglerPost(varslene.poster.length),
      },
      ...varslene.poster.flatMap((p) => {
        const v = postvarselvalget(valg, p.post.id);
        // Har BH tatt stilling til posten etter § 34.3.3, må begge spørsmålene besvares.
        return p.hjemmel === '34.3.3' && besvart(p)
          ? [
              {
                felt: `${p.post.id}-varsel`,
                post: null,
                tekst: varseletIPosten(valg, p) === null ? SKJEMA.manglerITide : null,
              },
              {
                felt: `${p.post.id}-justering`,
                post: null,
                tekst: v.godtarJustering === null ? SKJEMA.manglerJustering : null,
              },
            ]
          : [];
      }),
    ])
  );
  const foerI = (p: VarseletIPosten) =>
    p.foer && { iTide: p.foer.iTide, brev: brevet(u, p.foer.dokument), ikkeGitt: false };
  const virkninger: string[] = [];
  const tittel = $derived(VARSELSVARET.tittel(postenITittelen(valg, varslene.poster)));
</script>

<Svarskjema
  {kjernesak}
  {u}
  spor="vederlag"
  {tittel}
  svarerPaa={kravbrevet}
  {utkast}
  medTekstene={(punktene) => varslenesvaret(valg, varslene, kjernesak.regler, punktene)}
  bind:tekster={valg}
  {linjer}
  {virkninger}
  {mangler}
  begrunnelserISkjemaet={hovedvarselet ? [hovedvarselet, ...postpunktene] : postpunktene}
  {skjemapunkter}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
>
  {#snippet spoersmaal(feil, begrunnelse, overskrift)}
    <div class="innledning">
      <p class="dempet">{VARSELSVARET.bareVarslene(varslene.poster.length)}</p>
      {#if feil(`${uid}-poster`)}
        <p class="feilmelding" id={`${uid}-poster`} tabindex="-1">{feil(`${uid}-poster`)}</p>
      {/if}
    </div>
    {#if hovedvarselet}
      <Spoersmaal
        id={`${uid}-sp-hovedvarsel`}
        tittel={overskrift('34.1.2') ?? hovedvarselet.navn}
      >
        <Varselstandpunkt
          varselId={`${uid}-hovedvarsel`}
          justeringId={`${uid}-hovedvarsel-justering`}
          hjemmel="34.1.2"
          foer={hovedvarseletFoer}
          bind:varsletITide={() => valg.hovedvarseletITide ?? null, (x) => (valg.hovedvarseletITide = x)}
          godtarJustering={null}
          ikkeGitt={false}
          justeringValgfri={true}
          vis="varselet"
          ogsaa3412
        />
        {@render begrunnelse('34.1.2')}
      </Spoersmaal>
    {/if}
    {#each varslene.poster as p (p.post.id)}
      {@const id = `${uid}-${p.post.id}`}
      {@const v = postvarselvalget(valg, p.post.id)}
      {@const varseletGjelderHvis = gjelderHvis(p, 'rettidighet')}
      {@const justeringenGjelderHvis = gjelderHvis(p, 'justering')}
      {#snippet vilkaaret(i: Innsigelsen)}
        {#if i.art === 'grunn'}
          <Forholdsgrunn grunn={i.grunn} brev={i.brev} {onforholdet} />
        {:else}
          {@const hoved = i.art === 'varsel' && i.hjemmel === '34.1.2'}
          <a href={`#${hoved ? `${uid}-hovedvarsel` : `${id}-varsel`}${(hoved ? hovedvarseletFoer : p.foer)?.iTide === false ? '-standpunkt' : ''}`}
            >{innsigelsenOmVarselet(i.art === 'varsel' ? i.hjemmel : p.hjemmel)}</a
          >
        {/if}
      {/snippet}
      {#snippet foranVarselet()}
        <Gjelderhvis
          id={`${id}-varsel-forutsetninger`}
          liste={varseletGjelderHvis}
          punkt={vilkaaret}
        />
      {/snippet}
      {#snippet foranJusteringen()}
        <Gjelderhvis
          id={`${id}-justering-forutsetninger`}
          liste={justeringenGjelderHvis}
          punkt={vilkaaret}
        />
      {/snippet}
      {#snippet etterJusteringen()}{@render begrunnelse(p.post.betegnelse)}{/snippet}
      <Spoersmaal
        id={`${id}-sp`}
        aktiv={!besvart(p)}
        tittel={overskrift(p.post.betegnelse) ?? `${p.post.betegnelse} ${p.post.beskrivelse}`}
      >
        <p class="dempet">{kravetIKortform(p.post)}</p>
        <Varseldatoer {u} gjelder={varslene.kravversjon} />
        <Varselstandpunkt
          varselId={`${id}-varsel`}
          justeringId={`${id}-justering`}
          hjemmel={p.hjemmel}
          foer={foerI(p)}
          bind:varsletITide={
            () => v.varsletITide,
            (x) => (valg.poster = { ...valg.poster, [p.post.id]: { ...v, varsletITide: x } })
          }
          bind:godtarJustering={
            () => v.godtarJustering,
            (x) => (valg.poster = { ...valg.poster, [p.post.id]: { ...v, godtarJustering: x } })
          }
          ikkeGitt={false}
          varselValgfri={!besvart(p)}
          varselFeil={feil(`${id}-varsel`)}
          justeringValgfri={!besvart(p)}
          justeringFeil={feil(`${id}-justering`)}
          {foranVarselet}
          {foranJusteringen}
          beskrevetAvVarselet={varseletGjelderHvis.length
            ? `${id}-varsel-forutsetninger`
            : undefined}
          beskrevetAvJusteringen={justeringenGjelderHvis.length
            ? `${id}-justering-forutsetninger`
            : undefined}
          etterVarselet={p.hjemmel === '34.4' ? etterJusteringen : undefined}
          etterJusteringen={p.hjemmel === '34.4' ? undefined : etterJusteringen}
        />
      </Spoersmaal>
    {/each}
  {/snippet}
</Svarskjema>

<style>
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  /* Med innrykket spørsmålene har (`Spoersmaal`). */
  .innledning {
    padding: var(--spacing-5) var(--spacing-6) 0;
  }
  .feilmelding {
    margin-top: var(--spacing-2);
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
</style>
