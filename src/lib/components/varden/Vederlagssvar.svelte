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
    kravposterI,
  } from '#kjerne/spor/vederlag/format.ts';
  import { BREVTEKSTEN_I_VEDERLAGET, svartemaerIVederlaget } from '#kjerne/spor/vederlag/tekst.ts';
  import { FORHOLDET, medHardeMellomrom } from '#kjerne/frosset/tekst.ts';
  import { hindrerSvarPaaKravet, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { lesKroner } from '#lib/utils/belop.ts';
  import type { Forutsetning } from '#kjerne/spor/vederlag/kommando.ts';
  import { erSvarPaaVarsel, varseletFoer, varselhjemmelFor } from '#lib/kjernesak/vederlagskrav.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { Kravpost, Standpunkt } from '#kjerne/typer.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Forholdsgrunn from './Forholdsgrunn.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Knapp from './Knapp.svelte';
  import Postliste from './Postliste.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Linjefelt from './Linjefelt.svelte';
  import Valg from './Valg.svelte';
  import Varseldatoer from './Varseldatoer.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import {
    beloepsvalget,
    etterRegel,
    kravetIKortform,
    postvalget,
    regelen,
    somNyttSvar,
    tomPost,
    tomtSvar,
    vederlagssvaret,
    type Postvalg,
    type Regel,
    type Svarvalg,
  } from './kommandoer';
  import { brevet, brevMedElement, standpunktene } from './lesing';
  import {
    begrunnelserForTemaene,
    temanavn,
    manglene,
    stilt,
    ubesvart,
    ugyldig,
  } from './svarskjema';
  import {
    BREVKONTROLL,
    VIRKNING,
    BREVSTEG,
    HOVEDLINJER,
    SKJEMA,
    SVARSKJEMA,
    grunntekst,
    innsigelsenOmVarselet,
    leselinjene,
    oppgivelsestekst,
    VEDERLAGET,
    standpunkttekst,
  } from './tekster';

  let {
    kjernesak,
    u,
    valg = $bindable(tomtSvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
    onforholdet,
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
    /** Åpner siden for forholdet uten å forkaste svarutkastet. */
    onforholdet?: () => void;
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
  const godkjennAlleFormerTekst = $derived(
    !harRegel
      ? SKJEMA.godkjennAlleFormer
      : poster.every(etterRegel)
        ? SKJEMA.godkjennAlleFormerRegel
        : SKJEMA.godkjennAlleFormerBlandet
  );
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
  const brevutkast = $derived(
    vederlagssvaret(
      { iTide: valg.iTide, poster: valg.poster, begrunnelser: {}, forbehold: '' },
      u,
      kjernesak.regler
    )!
  );
  // Revisjonen av det gjeldende svaret når kravversjonen har et (HF-U29).
  const utkast = $derived(somNyttSvar(brevutkast, u));
  const forrigeSvar = $derived(
    utkast.type === 'revisjon' ? brevMedElement(u, utkast.erstatter) : null
  );
  const etter = $derived(kjernesak.forhaandsvist(utkast));
  // OV-U33: lagene står også før spørsmålene er besvart (`lagIVederlaget`).
  const lagene = $derived(
    stoppet ? null : kjernesak.lagForUtkastet(brevutkast.svar[0], 'vederlag')
  );
  const beloepSporsmaal = (felt: string) => felt === 'vurdering' || felt === 'godkjent_beloep';
  const foerstePunkt = $derived.by(() => {
    const sporsmaalene = lagene?.ubesvart ?? [];
    if (ubesvart(lagene, 'hovedkrav_varslet_i_tide')) return '34.1.2';
    for (const p of poster) {
      const iPosten = sporsmaalene.filter((s) => s.gjelder === p.id);
      // Oppgjørsformen står foran beløpet i skjemaet, som kan vise dem i hvert sitt punkt.
      if (iPosten.some((s) => !beloepSporsmaal(s.spoersmaal))) return 'metode';
      if (iPosten.length && stilt(lagene, 'vurdering', p.id)) return p.betegnelse;
    }
    return undefined;
  });
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
  // VS-U77 punkt 10: brevet med innsigelsen mot varselet for kravposten et «i tide» gir opp.
  const oppgittI = (s: Standpunkt, post: Kravpost) => {
    if (s.art !== 'rettidighet' || !s.iTide || s.hjemmel !== varselhjemmelFor(post)) return null;
    const foer = varseletFoer(u, post);
    return foer?.iTide === false ? foer : null;
  };
  const linjer = $derived(
    nyeStandpunkter.map((l) => {
      const post = 'standpunkt' in l ? postenFor(l.standpunkt) : undefined;
      return {
        punkt:
          'grunn' in l
            ? FORHOLDET
            : (BREVTEKSTEN_I_VEDERLAGET.punktet(l.standpunkt, krav) ??
              (l.standpunkt.art === 'rettidighet' ? l.standpunkt.hjemmel : undefined)),
        tekst:
          'grunn' in l
            ? grunntekst(l.grunn, true, l.brev)
            : post && oppgittI(l.standpunkt, post)
              ? oppgivelsestekst(
                  varselhjemmelFor(post)!,
                  brevet(u, oppgittI(l.standpunkt, post)!.dokument)!,
                  true,
                  flere ? post.betegnelse : undefined,
                  !erSvarPaaVarsel(u, oppgittI(l.standpunkt, post)!.dokument)
                )
              : standpunkttekst(
                  l.standpunkt,
                  true,
                  l.standpunkt.art === 'beloep' && !l.standpunkt.saerskilt && post
                    ? krevdI(post)
                    : undefined,
                  post && flere ? post.betegnelse : undefined
                ),
        lag: l.lag,
        vilkaar: l.vilkaar,
        heller: l.heller,
      };
    })
  );
  // Leselinjen for en lukket kravpost: standpunktene slik kjernen skriver dem, eller valgene
  // til svaret er fullstendig.
  const leselinje = (p: Kravpost): string[] => {
    const fra = leselinjene(
      nyeStandpunkter,
      p,
      VEDERLAGET.lagetVilkaar,
      varseletFoer(u, p)?.iTide === false,
      !erSvarPaaVarsel(u, varseletFoer(u, p)?.dokument ?? '')
    );
    if (fra.length) return fra;
    const v = postvalget(valg, p.betegnelse);
    const beloep = beloepsvalget(v, p);
    const regel = regelen(p);
    const tilbud = stilt(lagene, 'krever_tilbud', p.id) && v.kreverTilbud;
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
  // Det som mangler, med skjemaets ord: det kjernen sier er påkrevd og ubesvart (#2025), og et
  // beløp som er skrevet, men ikke kan godtas.
  const delbeloepFeil = (p: Kravpost): string | null => {
    const v = postvalget(valg, p.betegnelse);
    if (beloepsvalget(v, p) !== 'deler') return null;
    const lest = lesKroner(v.delbeloep);
    if ('feil' in lest) return lest.feil;
    // KA-U42: kjernen avgjør om beløpet kan godtas (#2279).
    if (ugyldig(lagene, 'godkjent_beloep', p.id)) return HOVEDLINJER.beloepUtenfor(krevdI(p));
    return ubesvart(lagene, 'godkjent_beloep', p.id) ? SKJEMA.manglerDelbeloep : null;
  };
  const hovedvarselet = $derived(stilt(lagene, 'hovedkrav_varslet_i_tide'));
  const svartemaene = $derived(
    svartemaerIVederlaget(krav, u.spor.forhold.gjeldendeKrav, kjernesak.regler).flatMap((t) => {
      // Med harde mellomrom, som overskriften i brevet (sprak.md).
      const tema = { ...t, overskrift: t.overskrift && medHardeMellomrom(t.overskrift) };
      if (tema.punkt === '34.1.2' || tema.punkt === 'metode') return [tema];
      const post = poster.find((p) => p.betegnelse === tema.punkt);
      if (!post) return [];
      return [
        {
          ...tema,
          overskrift: flere ? `${tema.overskrift} · ${post.betegnelse}` : tema.overskrift,
        },
      ];
    })
  );
  const begrunnelserISkjemaet = $derived(
    begrunnelserForTemaene(svartemaene, (punkt) => {
      if (!lagene) return false;
      if (punkt === '34.1.2') return hovedvarselet && valg.iTide !== null;
      const feil = [...lagene.ubesvart, ...lagene.ugyldig];
      if (punkt === 'metode')
        return (
          lagene.standpunkter.some((s) => s.art === 'oppgjoersform' && s.besvart) &&
          !feil.some((s) => s.gjelder && !beloepSporsmaal(s.spoersmaal))
        );
      const post = poster.find((p) => p.betegnelse === punkt);
      return (
        !!post &&
        stilt(lagene, 'vurdering', post.id) &&
        lagene.standpunkter.some((s) => s.art === 'beloep' && s.gjelder === post.id && s.besvart) &&
        !feil.some((s) => s.gjelder === post.id && beloepSporsmaal(s.spoersmaal))
      );
    })
  );
  const skjemapunkter = $derived(
    stoppet
      ? []
      : [
          ...(grunnlagsbrev && grunnene.length
            ? [
                {
                  punkt: FORHOLDET,
                  navn: SKJEMA.forholdspunktet,
                  linjer: nyttSvar
                    ? linjer.filter((l) => l.punkt === FORHOLDET)
                    : grunnene.flatMap((f) =>
                        'grunn' in f
                          ? [{ tekst: grunntekst(f.grunn, true, grunnlagsbrev), lag: null }]
                          : []
                      ),
                },
              ]
            : []),
          ...begrunnelserISkjemaet
            .filter((p) => {
              if (p.punkt === '34.1.2') return hovedvarselet;
              if (p.punkt === 'metode') return true;
              const post = poster.find((q) => q.betegnelse === p.punkt);
              if (!post || etterRegel(post)) return false;
              return !nyttSvar
                ? stilt(lagene, 'vurdering', post.id)
                : linjer.some((l) => l.punkt === p.punkt);
            })
            .map((p) => {
              const fraBrevet = linjer.filter((l) => l.punkt === p.punkt);
              const post = poster.find((q) => q.betegnelse === p.punkt);
              const status =
                p.punkt === '34.1.2'
                  ? valg.iTide === null
                    ? []
                    : [valg.iTide ? SKJEMA.iTide : SKJEMA.forSent]
                  : p.punkt === 'metode'
                    ? poster.flatMap((q) => {
                        const v = postvalget(valg, q.betegnelse);
                        return v.form === null
                          ? []
                          : [
                              v.form === 'godtar'
                                ? SKJEMA.godkjenner(q.oppgjoersform)
                                : SKJEMA.menerForm(v.form),
                            ];
                      })
                    : post && p.besvart
                      ? leselinje(post).slice(-1)
                      : [];
              return {
                ...p,
                tillegg: flere && post ? post.betegnelse : undefined,
                aktiv: foerstePunkt === p.punkt,
                linjer: fraBrevet.length
                  ? fraBrevet
                  : (status.length ? status : [SKJEMA.ikkeBesvart]).map((tekst) => ({
                      tekst,
                      lag: null,
                    })),
              };
            }),
        ]
  );
  const mangler = $derived(
    manglene(uid, [
      {
        felt: 'itide',
        post: null,
        tekst: ubesvart(lagene, 'hovedkrav_varslet_i_tide') ? SKJEMA.manglerITide : null,
      },
      ...poster.flatMap((p) => {
        const i = (tekst: string | null) =>
          tekst ? SKJEMA.iPosten(navnet(p) ?? null, tekst) : null;
        return [
          {
            felt: `form-${p.betegnelse}`,
            post: p.id,
            tekst: i(
              ubesvart(lagene, 'aksepterer', p.id) ||
                ubesvart(lagene, 'oensket_oppgjoersform', p.id)
                ? SKJEMA.manglerForm(p.oppgjoersform)
                : null
            ),
          },
          {
            felt: `justering-${p.betegnelse}`,
            post: p.id,
            tekst: i(ubesvart(lagene, 'godtar_justering', p.id) ? SKJEMA.manglerJustering : null),
          },
          {
            felt: `beloep-${p.betegnelse}`,
            post: p.id,
            tekst: i(ubesvart(lagene, 'vurdering', p.id) ? SKJEMA.manglerBeloep : null),
          },
          { felt: `delbeloep-${p.betegnelse}`, post: p.id, tekst: i(delbeloepFeil(p)) },
        ];
      }),
    ])
  );

  const virkninger = $derived([
    BREVSTEG.enigheten,
    ...(nyttSvar?.beslutningsgrunnlag.sammenfall
      ? [VIRKNING.sammenfall('vederlagsjustering')]
      : []),
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
    <Forholdsgrunn grunn={f.grunn} brev={grunnlagsbrev!} {onforholdet} />
  {:else if 'oppgjoersform' in f}
    <a href={`#${uid}-form-${post!.betegnelse}`}>{SKJEMA.standpunktetTilFormen}</a>
  {:else if f.innsigelse === '34.3.3'}
    <!-- En innsigelse som står, er en setning, ikke et valg (`Varselstandpunkt`). -->
    <a
      href={`#${uid}-varsel-${post!.betegnelse}${varseletFoer(u, post!)?.iTide === false ? '-standpunkt' : ''}`}
      >{innsigelsenOmVarselet('34.3.3')}</a
    >
  {:else if f.innsigelse === '34.1.3'}
    {innsigelsenOmVarselet('34.1.3')}
  {:else}
    <a href={`#${uid}-itide`}>{innsigelsenOmVarselet('34.1.2')}</a>
  {/if}
{/snippet}

<Svarskjema
  lagfeil={!stoppet && lagene === null}
  {kjernesak}
  {u}
  spor="vederlag"
  {utkast}
  {forrigeSvar}
  medTekstene={(punktene) => somNyttSvar(vederlagssvaret(valg, u, kjernesak.regler, punktene)!, u)}
  bind:tekster={valg}
  {linjer}
  {alternativer}
  {virkninger}
  {mangler}
  {postliste}
  {begrunnelserISkjemaet}
  {skjemapunkter}
  stopp={stoppet ? (hinder ? SKJEMA.ikkeStoettetHinder(hinder) : SKJEMA.ikkeStoettet) : null}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
>
  {#snippet spoersmaal(feil, begrunnelse, overskrift)}
    {#snippet metodevalgene(p: Kravpost)}
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
          {@render fastsumvalget(p, v, forms.length > 0)}
        {/if}
      {/if}
    {/snippet}

    {#snippet fastsumvalget(p: Kravpost, v: Postvalg, forutsatt: boolean)}
      <Valg
        navn={`${uid}-form-${p.betegnelse}`}
        spoersmaal={SKJEMA.formSpoersmaal}
        beskrevetAv={forutsatt ? `${uid}-form-${p.betegnelse}-forutsetninger` : undefined}
        valg={[
          { verdi: 'godtar', tekst: SKJEMA.godkjenner(p.oppgjoersform) },
          { verdi: 'enhetspriser', tekst: SKJEMA.menerForm('enhetspriser') },
          { verdi: 'regningsarbeid', tekst: SKJEMA.menerForm('regningsarbeid') },
        ]}
        bind:verdi={v.form}
        feil={feil(`${uid}-form-${p.betegnelse}`)}
        lett
        stablet
      />
    {/snippet}

    {#snippet beloepsvalgene(p: Kravpost, v: Postvalg, forutsatt: boolean)}
      {@const beloepFeil = feil(`${uid}-delbeloep-${p.betegnelse}`)}
      <!-- Spørsmålet om beløpet står bare når BH godkjenner fast sum (KA-U72). Det er i
         samme lag som oppgjørsformen og viser til forutsetningene over. -->
      {#if stilt(lagene, 'vurdering', p.id)}
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
        <Linjefelt
          {id}
          etikett={SKJEMA.belopEtikett}
          hjelp={SKJEMA.belopHjelp(krevdI(p))}
          enhet="kr"
          bredde="tall"
          inputmode="decimal"
          bind:verdi={v.delbeloep}
          feil={beloepFeil}
        />
      {/if}
      {@render begrunnelse(p.betegnelse)}
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
      {#if stilt(lagene, 'krever_tilbud', p.id)}
        <Valg
          navn={`${uid}-tilbud-${p.betegnelse}`}
          spoersmaal={SKJEMA.tilbudSpoersmaal}
          valg={[{ verdi: true, tekst: SKJEMA.kreverTilbud(navnet(p) ?? null) }]}
          bind:verdi={() => v.kreverTilbud || null, (x) => (v.kreverTilbud = x === true)}
          avkrysning
          lett
        />
      {/if}
      {#if stilt(lagene, 'varslet_i_tide', p.id)}
        {@const foer = varseletFoer(u, p)}
        {@const varselet = forutsetningene(p, 'rettidighet')}
        {@const justeringen = forutsetningene(p, 'justering')}
        {#snippet foranVarselet()}
          <Gjelderhvis
            id={`${uid}-varsel-${p.betegnelse}-forutsetninger`}
            liste={varselet}
            punkt={forutsetning}
          />
        {/snippet}
        {#snippet foranJusteringen()}
          <Gjelderhvis
            id={`${uid}-justering-${p.betegnelse}-forutsetninger`}
            liste={justeringen}
            punkt={forutsetning}
          />
        {/snippet}
        <Varselstandpunkt
          varselId={`${uid}-varsel-${p.betegnelse}`}
          justeringId={`${uid}-justering-${p.betegnelse}`}
          hjemmel={regel === 'regningsarbeid' ? '34.4' : '34.3.3'}
          foer={foer && {
            iTide: foer.iTide,
            brev: brevet(u, foer.dokument),
            ikkeGitt: !erSvarPaaVarsel(u, foer.dokument),
          }}
          bind:varsletITide={v.varsletITide}
          bind:godtarJustering={v.godtarJustering}
          ikkeGitt
          justeringValgfri={v.form !== 'godtar'}
          justeringFeil={feil(`${uid}-justering-${p.betegnelse}`)}
          {foranVarselet}
          {foranJusteringen}
          beskrevetAvVarselet={varselet.length
            ? `${uid}-varsel-${p.betegnelse}-forutsetninger`
            : undefined}
          beskrevetAvJusteringen={justeringen.length
            ? `${uid}-justering-${p.betegnelse}-forutsetninger`
            : undefined}
        />
      {/if}
    {/snippet}

    {#if hovedvarselet}
      <Spoersmaal
        id={`${uid}-sp-varsel`}
        aktiv={foerstePunkt === '34.1.2'}
        tittel={overskrift('34.1.2') ?? temanavn(svartemaene, '34.1.2')}
      >
        <Varseldatoer {u} spor="vederlag" sendt={SKJEMA.kravSendt} />
        <Gjelderhvis
          id={`${uid}-itide-forutsetninger`}
          liste={iPosten(grunnene)}
          punkt={forutsetning}
        />
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
        {@render begrunnelse('34.1.2')}
      </Spoersmaal>
    {/if}

    {#snippet postvalgene(p: Kravpost)}
      {@render metodevalgene(p)}
      {@const v = valg.poster[p.betegnelse]}
      {#if v && stilt(lagene, 'vurdering', p.id)}
        {@render beloepsvalgene(p, v, forutsetningene(p, 'oppgjoersform').length > 0)}
      {/if}
    {/snippet}

    <Spoersmaal
      id={`${uid}-sp-metode`}
      aktiv={foerstePunkt === 'metode'}
      tittel={overskrift('metode') ?? temanavn(svartemaene, 'metode')}
    >
      {#if flere}
        <p class="dempet">{SKJEMA.ettSvarPerPost}</p>
        <div class="snarveier">
          <Knapp variant="lenke" onclick={godkjennAlleFormer}>{godkjennAlleFormerTekst}</Knapp>
          <Knapp variant="lenke" onclick={godkjennAlle}
            >{harRegel ? SKJEMA.godkjennAlleFaste : SKJEMA.godkjennAlle}</Knapp
          >
        </div>
        <Postliste
          bind:this={postliste}
          bind:valgt={valgtPost}
          {poster}
          prefiks={uid}
          kolonne={SVARSKJEMA.postKolonne}
          navn={(p) => p.betegnelse}
          aktiv={(p) => foerstePunkt === p.betegnelse}
          beskrivelse={(p) => p.beskrivelse}
          krever={(p) =>
            etterRegel(p) ? SKJEMA.teKreverRegel(p) : SKJEMA.teKrever(krevdI(p), p.pns)}
          kravet={kravetIKortform}
          {leselinje}
          foersteFelt={(p) => `${uid}-form-${p.betegnelse}`}
          valgene={postvalgene}
        />
      {:else if poster[0]}
        <p class="dempet">
          {etterRegel(poster[0])
            ? SKJEMA.teKreverRegel(poster[0])
            : SKJEMA.teKrever(krevdTotalt, poster[0].pns)}
        </p>
        {@render metodevalgene(poster[0])}
      {/if}
      {@render begrunnelse('metode')}
    </Spoersmaal>
    {#if !flere && poster[0]}
      {@const p = poster[0]}
      {@const v = valg.poster[p.betegnelse]}
      {#if v && stilt(lagene, 'vurdering', p.id)}
        <Spoersmaal
          id={`${uid}-sp-beloep`}
          tittel={overskrift(p.betegnelse) ?? temanavn(svartemaene, p.betegnelse)}
          aktiv={foerstePunkt === p.betegnelse}
        >
          {@render beloepsvalgene(p, v, forutsetningene(p, 'oppgjoersform').length > 0)}
        </Spoersmaal>
      {/if}
    {/if}
  {/snippet}
</Svarskjema>

<style>
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .snarveier {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2) var(--spacing-5);
  }
</style>
