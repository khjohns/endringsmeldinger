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
  import type { VarseletIPosten, VarsleneIVederlagskravet } from '#lib/kjernesak/vederlagskrav.ts';
  import { svarkjeden, type Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Forholdsgrunn from './Forholdsgrunn.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import {
    kravetIKortform,
    postvarselvalget,
    tomtVarslenesvar,
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
  const kjeden = $derived(
    svarkjeden({ spor: 'vederlag', gjelder: varslene.kravversjon, bareVarselet: true })
  );
  const utenTekster = (v: Varslenesvalg) => ({ ...v, begrunnelser: {}, forbehold: '' });
  // Svaret uten begrunnelsene og forbeholdet, så det ikke regnes på nytt for hvert tegn (#1925).
  const utkast = $derived(varslenesvaret(utenTekster(valg), varslene, kjernesak.regler));
  const nyttSvarI = (k: Record<string, unknown>) => {
    const etter = kjernesak.forhaandsvist(k);
    const s = etter?.spor.vederlag.svarPaaVarsler.findLast((x) => svarkjeden(x) === kjeden);
    // Svaret sendes fra løsningen, så det fryses med det gjeldende svaret på forholdet (OV-U32).
    return s && s.id !== varslene.forrigeSvar
      ? standpunktene(s, etter!, etter!.spor.forhold.gjeldendeSvar)
      : [];
  };
  const nyeStandpunkter = $derived(nyttSvarI(utkast));
  // OV-U32, VS-U4: det varselet og justeringen gjelder hvis, lest av kjernen også før de er
  // besvart. Som i `Varselsvar` regnes et ubesvart varsel etter § 34.3.3 som innsigelse og en
  // ubesvart justering som bestridt.
  const utfylt = $derived(
    nyttSvarI(
      varslenesvaret(
        utenTekster({
          ...valg,
          poster: Object.fromEntries(
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
          ),
        }),
        varslene,
        kjernesak.regler
      )
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
        punkt: 'gjelder' in s ? s.gjelder : '',
        tekst: standpunkttekst(s, true, undefined, undefined, false, false),
        lag: l.lag,
        vilkaar: l.vilkaar,
        heller: l.heller,
      };
    })
  );
  const forholdet = $derived(linjer.filter((l) => l.punkt === FORHOLDET));
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
    ...postpunktene,
  ]);
  const besvart = (p: VarseletIPosten) =>
    varseletIPosten(valg, p) !== null || postvarselvalget(valg, p.post.id).godtarJustering !== null;
  const mangler = $derived(
    manglene(uid, [
      {
        felt: `${varslene.poster[0]?.post.id ?? ''}-varsel`,
        post: null,
        tekst: varslene.poster.some(besvart) ? null : VARSELSVARET.manglerPost,
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
  const tittel = $derived(
    VARSELSVARET.tittel(varslene.poster.map((p) => ({ id: p.post.id, hjemmel: p.hjemmel })))
  );
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
  begrunnelserISkjemaet={postpunktene}
  {skjemapunkter}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
>
  {#snippet spoersmaal(feil, begrunnelse, overskrift)}
    <p class="dempet innledning">{VARSELSVARET.bareVarslene}</p>
    {#each varslene.poster as p (p.post.id)}
      {@const id = `${uid}-${p.post.id}`}
      {@const v = postvarselvalget(valg, p.post.id)}
      {@const varseletGjelderHvis = gjelderHvis(p, 'rettidighet')}
      {@const justeringenGjelderHvis = gjelderHvis(p, 'justering')}
      {#snippet vilkaaret(i: Innsigelsen)}
        {#if i.art === 'grunn'}
          <Forholdsgrunn grunn={i.grunn} brev={i.brev} {onforholdet} />
        {:else}
          <a href={`#${id}-varsel${p.foer?.iTide === false ? '-standpunkt' : ''}`}
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
          varselFeil={feil(`${id}-varsel`)}
          justeringValgfri
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
</style>
