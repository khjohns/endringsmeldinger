<!--
  BH svarer på flere varsler som står alene i samme brev, i ett skjema (M-5 og U-8 i BF-37), med
  ett svar per varsel BH tar stilling til (svaret 27.11 i #2451, VS-U96 punkt 32). Hver rad har
  spørsmålene fra `Varselsvar` (`Varselstandpunkt`). Et nytt svar på ett varsel har sitt eget skjema
  (VS-U96 punkt 33). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { lagBrevtittel } from '#kjerne/frosset/brevtittel.ts';
  import { FORHOLDET } from '#kjerne/frosset/tekst.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { erSvarPaaVarsel, iKjedenTil, type VarseletAlene } from '#lib/kjernesak/vederlagskrav.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { VARSELSPOR } from '#kjerne/typer.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Forholdsgrunn from './Forholdsgrunn.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import {
    harStandpunkt,
    utenTekster,
    utfyltVarselsvalg,
    varselbrevsvaret,
    varseletISvaret,
    varselvalget,
    type Varselbrevvalg,
    type Varselsvalg,
  } from './kommandoer';
  import { brevMedUtsagn, brevet, standpunktene } from './lesing';
  import type { Innsigelsen } from './svarlagene';
  import { manglene, type Skjemapunkt } from './svarskjema';
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
    varslene,
    valg = $bindable({}),
    onbrevkontroll,
    onforkast,
    onvedsiden,
    onforholdet,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Varslene i brevet svaret kan gjelde (`varsleneIBrevet`), minst to. */
    varslene: readonly (VarseletAlene & { nr: number })[];
    /** Valgene per varsel står når BH går til brevkontrollen og tilbake. */
    valg?: Varselbrevvalg;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
    /** Åpner siden for forholdet uten å forkaste svarutkastet. */
    onforholdet?: () => void;
  } = $props();
  const uid = $props.id();

  const spor = $derived(VARSELSPOR[varslene[0]!.hjemmel]);
  const varselbrevet = $derived(brevMedUtsagn(u, varslene[0]!.id));
  const oppdater = (id: string, endring: Partial<Varselsvalg>) =>
    (valg = { ...valg, [id]: { ...varselvalget(valg, id), ...endring } });
  const utenTekstene = (v: Varselbrevvalg): Varselbrevvalg =>
    Object.fromEntries(Object.entries(v).map(([id, x]) => [id, utenTekster(x)]));

  const utkast = $derived(varselbrevsvaret(utenTekstene(valg), varslene, kjernesak.regler));
  /** Standpunktene i det nye svaret på hvert varsel, lest av kjernen, med varselet som nøkkel. */
  const nyeSvar = (k: Record<string, unknown>) => {
    const etter = kjernesak.forhaandsvist(k);
    const svarene = varslene.flatMap((v) => {
      const s = etter?.spor[spor].svarPaaVarsler.findLast(iKjedenTil(v));
      return s ? [s] : [];
    });
    const linjene = new Map(
      svarene.map((s) => [
        s.gjelder,
        // Svaret sendes fra løsningen, så det fryses med det gjeldende svaret på forholdet (OV-U32).
        standpunktene(s, etter!, etter!.spor.forhold.gjeldendeSvar),
      ])
    );
    return { svarene, get: (id: string) => linjene.get(id) };
  };
  const nyeStandpunkter = $derived(nyeSvar(utkast));
  // OV-U32, VS-U4: det varselet og justeringen gjelder hvis, lest av kjernen også før de er besvart.
  // Som i `Varselsvar` regnes et ubesvart varsel som innsigelse og en ubesvart justering som
  // bestridt. Standpunktet etter § 34.4 har ikke noe lag (KA-U64).
  const erUtfylt = (v: VarseletAlene) => {
    const x = varselvalget(valg, v.id);
    return (
      v.hjemmel === '34.4' ||
      (x.varsletITide !== null && (v.hjemmel !== '34.3.3' || x.godtarJustering !== null))
    );
  };
  const utfylteValg = $derived(
    Object.fromEntries(
      varslene.map((v) => [
        v.id,
        utfyltVarselsvalg(utenTekster(varselvalget(valg, v.id)), v.hjemmel),
      ])
    )
  );
  // Utfylt er det samme svaret når alle spørsmålene er besvart, så kjernen kjøres bare én gang.
  const utfylt = $derived(
    varslene.every(erUtfylt)
      ? nyeStandpunkter
      : nyeSvar(varselbrevsvaret(utfylteValg, varslene, kjernesak.regler))
  );
  const gjelderHvis = (v: VarseletAlene, art: 'rettidighet' | 'justering'): Innsigelsen[] =>
    v.hjemmel === '34.4'
      ? []
      : ((utfylt.get(v.id) ?? []).find((l) => 'standpunkt' in l && l.standpunkt.art === art)
          ?.vilkaar ?? []);

  const foerI = (v: VarseletAlene) =>
    v.foer && {
      iTide: v.foer.iTide,
      brev: brevet(u, v.foer.dokument),
      ikkeGitt: spor === 'vederlag' && !erSvarPaaVarsel(u, v.foer.dokument),
    };
  const besvart = (v: VarseletAlene) => harStandpunkt(varselvalget(valg, v.id), v);
  // I panelet uten nummeret fra totalentreprenørens brev, som ikke er nummeret i svaret (system.md).
  const navnet = (v: VarseletAlene, navn = VARSELSVARET.punktet(v.hjemmel)) =>
    `${navn}${v.arbeid ? `: ${v.arbeid}` : ''}`;

  /** Linjene i svaret på varselet `v`, med punktet i panelet: varselet eller justeringen. */
  const linjerFor = (v: VarseletAlene) =>
    (nyeStandpunkter.get(v.id) ?? []).map((l) => {
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
      const foer = foerI(v);
      const oppgir =
        s.art === 'rettidighet' &&
        varseletISvaret(varselvalget(valg, v.id), v) === true &&
        foer?.iTide === false &&
        foer.brev
          ? foer
          : null;
      return {
        punkt: s.art === 'justering' ? `${v.id}-justering` : v.id,
        tekst: oppgir
          ? oppgivelsestekst(v.hjemmel, oppgir.brev!, true, undefined, oppgir.ikkeGitt)
          : standpunkttekst(s, true, undefined, undefined, false, false),
        lag: l.lag,
        vilkaar: l.vilkaar,
        heller: l.heller,
      };
    });
  const perVarsel = $derived(varslene.map((v) => ({ v, linjer: linjerFor(v) })));
  // «12 A» i #2337: punktet «Forholdet» står én gang, i det første svaret.
  const forholdet = $derived(
    perVarsel
      .find((x) => x.linjer.some((l) => l.punkt === FORHOLDET))
      ?.linjer.filter((l) => l.punkt === FORHOLDET) ?? []
  );
  const linjer = $derived([
    ...forholdet,
    ...perVarsel.flatMap((x) => x.linjer.filter((l) => l.punkt !== FORHOLDET)),
  ]);
  const iPunktet = (punkt: string, foerSvaret: string) => {
    const l = linjer.filter((x) => x.punkt === punkt);
    return l.length ? l : [{ tekst: foerSvaret, lag: null }];
  };
  const skjemapunkter = $derived<Skjemapunkt[]>([
    ...(forholdet.length
      ? [{ punkt: FORHOLDET, navn: SKJEMA.forholdspunktet, linjer: forholdet }]
      : []),
    ...varslene.flatMap((v) => [
      {
        punkt: v.id,
        navn: navnet(v),
        // VS-U77 punkt 31: uten innsigelse trenger BH ikke svare på varselet etter § 34.4.
        linjer: iPunktet(v.id, v.hjemmel === '34.4' ? SKJEMA.ingenInnsigelse : SKJEMA.ikkeBesvart),
      },
      ...(v.hjemmel === '34.3.3'
        ? [
            {
              punkt: `${v.id}-justering`,
              navn: navnet(v, VARSELSVARET.justeringen),
              linjer: iPunktet(`${v.id}-justering`, SKJEMA.ikkeBesvart),
            },
          ]
        : []),
    ]),
  ]);
  /** Punktene i brevet svaret på varselet `v` har en begrunnelse i, som kjernen skriver dem. */
  const punkteneFor = (v: VarseletAlene): string[] => [
    ...(linjer.some((l) => l.punkt === v.id) ? [v.hjemmel] : []),
    ...(linjer.some((l) => l.punkt === `${v.id}-justering`) ? ['justering'] : []),
  ];
  // Begrunnelsen og forbeholdet står ved hvert varsel, så skjemaet har ingen felt for punktene
  // i brevet som deler nøkkel mellom svarene (LV-U71).
  const begrunnelserISkjemaet = $derived(
    [...new Set([FORHOLDET, ...varslene.flatMap((v) => [v.hjemmel, 'justering'])])].map(
      (punkt) => ({ punkt, navn: punkt, besvart: false })
    )
  );
  const tekster = $derived({
    begrunnelser: {},
    forbehold: varslene.some((v) => besvart(v) && varselvalget(valg, v.id).forbehold.trim())
      ? SKJEMA.skrevet
      : '',
  });

  const mangler = $derived(
    manglene(uid, [
      // Beskjeden står under innledningen, fordi den gjelder alle varslene.
      {
        felt: 'varsler',
        post: null,
        tekst: varslene.some(besvart) ? null : VARSELSVARET.manglerVarsel,
      },
      ...varslene.flatMap((v) =>
        v.hjemmel === '34.3.3' && besvart(v)
          ? [
              {
                felt: `${v.id}-varsel`,
                post: null,
                tekst:
                  varseletISvaret(varselvalget(valg, v.id), v) === null
                    ? SKJEMA.manglerITide
                    : null,
              },
              {
                felt: `${v.id}-justering`,
                post: null,
                tekst:
                  varselvalget(valg, v.id).godtarJustering === null
                    ? SKJEMA.manglerJustering
                    : null,
              },
            ]
          : []
      ),
    ])
  );
  // VS-U77 punkt 30 og 31: svaret på varselet gir ingen enighet og ikke noe sammenfall.
  const virkninger: string[] = [];
  // Tittelen kjernen gir brevet, etter svarene i det (LV-U80), og før BH har valgt, varslene i brevet.
  const tittel = $derived(
    lagBrevtittel({ krav: [], utsagn: [], svar: nyeStandpunkter.svarene }) ??
      VARSELSVARET.svarPaaVarsleneI(varselbrevet!)
  );
</script>

{#snippet forbeholdene(etikett: string | undefined)}
  <h3>{etikett ?? SKJEMA.forbehold}</h3>
  <p class="dempet">{SKJEMA.forbeholdHjelp}</p>
  {#each varslene.filter(besvart) as v (v.id)}
    <Tekstomraade
      id={`${uid}-${v.id}-forbehold`}
      etikett={VARSELSVARET.forbeholdFor(v.hjemmel, v.arbeid)}
      valgfri
      underordnet
      rader={2}
      bind:verdi={() => varselvalget(valg, v.id).forbehold, (x) => oppdater(v.id, { forbehold: x })}
    />
  {/each}
{/snippet}

<Svarskjema
  {kjernesak}
  {u}
  {spor}
  {tittel}
  svarerPaa={varselbrevet}
  {utkast}
  medTekstene={(punktene) =>
    varselbrevsvaret(valg, varslene, kjernesak.regler, (id) =>
      punkteneFor(varslene.find((v) => v.id === id)!).filter((p) => punktene.includes(p))
    )}
  {tekster}
  {linjer}
  {virkninger}
  {mangler}
  {begrunnelserISkjemaet}
  {skjemapunkter}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
  {forbeholdene}
  egnePunkter
>
  {#snippet spoersmaal(feil)}
    <div class="innledning">
      <p class="dempet">{VARSELSVARET.hvertVarsel}</p>
      {#if feil(`${uid}-varsler`)}
        <p class="feilmelding" id={`${uid}-varsler`} tabindex="-1">{feil(`${uid}-varsler`)}</p>
      {/if}
    </div>
    {#each varslene as v (v.id)}
      {@const id = `${uid}-${v.id}`}
      {@const x = varselvalget(valg, v.id)}
      {@const foer = foerI(v)}
      {@const varseletGjelderHvis = gjelderHvis(v, 'rettidighet')}
      {@const justeringenGjelderHvis = gjelderHvis(v, 'justering')}
      {#snippet vilkaaret(i: Innsigelsen)}
        {#if i.art === 'grunn'}
          <Forholdsgrunn grunn={i.grunn} brev={i.brev} {onforholdet} />
        {:else}
          <a href={`#${id}-varsel${foer?.iTide === false ? '-standpunkt' : ''}`}
            >{innsigelsenOmVarselet(i.art === 'varsel' ? i.hjemmel : v.hjemmel)}</a
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
      {#snippet begrunnelsen(punkt: string, navn: string)}
        {#if punkteneFor(v).includes(punkt)}
          <Tekstomraade
            id={`${id}-begrunnelse-${punkt}`}
            etikett={SKJEMA.begrunnelse}
            skjultTillegg={`, ${navn}`}
            underordnet
            valgfri
            rader={2}
            bind:verdi={
              () => x.begrunnelser[punkt] ?? '',
              (tekst) => oppdater(v.id, { begrunnelser: { ...x.begrunnelser, [punkt]: tekst } })
            }
          />
        {/if}
      {/snippet}
      {#snippet etterVarselet()}{@render begrunnelsen(v.hjemmel, navnet(v))}{/snippet}
      {#snippet etterJusteringen()}{@render begrunnelsen(
          'justering',
          VARSELSVARET.justeringen
        )}{/snippet}
      <!-- U-8 i BF-37: én rad per varsel, med nummeret i brevet og arbeidet under navnet. -->
      <Spoersmaal
        id={`${id}-sp`}
        aktiv={!besvart(v)}
        tittel={`${v.nr}. ${VARSELSVARET.punktet(v.hjemmel)}`}
      >
        {#if v.arbeid}<p class="dempet">{VARSELSVARET.arbeidet(v.arbeid)}</p>{/if}
        <Varselstandpunkt
          varselId={`${id}-varsel`}
          justeringId={`${id}-justering`}
          hjemmel={v.hjemmel}
          {foer}
          bind:varsletITide={() => x.varsletITide, (y) => oppdater(v.id, { varsletITide: y })}
          bind:godtarJustering={
            () => x.godtarJustering, (y) => oppdater(v.id, { godtarJustering: y })
          }
          ikkeGitt={false}
          varselValgfri={!besvart(v)}
          varselFeil={feil(`${id}-varsel`)}
          justeringValgfri={!besvart(v)}
          justeringFeil={feil(`${id}-justering`)}
          {foranVarselet}
          {foranJusteringen}
          beskrevetAvVarselet={varseletGjelderHvis.length
            ? `${id}-varsel-forutsetninger`
            : undefined}
          beskrevetAvJusteringen={justeringenGjelderHvis.length
            ? `${id}-justering-forutsetninger`
            : undefined}
          {etterVarselet}
          {etterJusteringen}
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
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
</style>
