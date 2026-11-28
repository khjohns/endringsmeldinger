<!--
  BH skriver svar på krav om vederlag (Varden, skjerm B), i skallet for svarskjemaene
  (`Svarskjema.svelte`): oppgjørsformen, beløpet, varselet og justeringen for hver kravpost, og
  varselet, begrensningen og beløpet for posten etter punkt 34.1.3 annet ledd (VS-U5).
  Ingenting er forhåndsvalgt. Kommandoen bygges i `kommandoer.ts`, og kjernen regner resultatet,
  lager brevet og avviser det den ikke godtar. Et svar lagt til (OV-U80, OV-U98) gjelder
  kravversjonen og leses med innsigelsene på dagen det ble sendt (D-7 og D-8 i BF-49).
-->
<script lang="ts">
  import { denAndreRegelen, kravposterI } from '#kjerne/spor/vederlag/format.ts';
  import { PRODUKTIVITETSFELT } from '#kjerne/spor/vederlag/frysing.ts';
  import {
    BREVTEKSTEN_I_VEDERLAGET,
    svarpunkteneIVederlaget,
  } from '#kjerne/spor/vederlag/tekst.ts';
  import { FORHOLDET, medHardeMellomrom } from '#kjerne/frosset/tekst.ts';
  import {
    hindrerSvarPaaKravet,
    medRettingeneTil,
    varseletFoerBrevet,
    type Kjernesakkontekst,
  } from '#lib/kjernesak/kontekst.svelte.ts';
  import { lesKroner } from '#lib/utils/belop.ts';
  import type { Forutsetning, Vederlagsspoersmaal } from '#kjerne/spor/vederlag/kommando.ts';
  import {
    erSvarPaaVarsel,
    innsigelseneSomStaar,
    varseleneIEldreKrav,
    varseletFoer as varseletFoerIdag,
    varseletForKravposten,
    varselhjemmelFor,
  } from '#lib/kjernesak/vederlagskrav.ts';
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
  import Stoettekort from './Stoettekort.svelte';
  import Datoer from './Datoer.svelte';
  import Varseldatoer from './Varseldatoer.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import {
    beloepsvalget,
    etterRegel,
    innsigelsenStaar,
    kravetSvaretGjelder,
    krevdSaerskilt,
    kravetIKortform,
    postvalget,
    regelen,
    somNyttSvar,
    tomPost,
    tomtSaerskilt,
    tomtSvar,
    vederlagssvaret,
    type Beloepsvalg,
    type Postvalg,
    type Regel,
    type Svarvalg,
  } from './kommandoer';
  import {
    brevet,
    brevMedElement,
    nyttSvarIUtkastet,
    sisteKunnskapsdatoen,
    standpunktene,
  } from './lesing';
  import { forhaandsvistSvar, type Korrespondansevalg } from './korrespondansen';
  import {
    type Skjemalinje,
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
    KUNNSKAPSDATO,
    LEGG_TIL,
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
    lagtTil = null,
    onavbrudd,
    onendre,
    onlagttil,
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
    /** Korrespondansen svaret legges til fra (OV-U80, OV-U98), eller `null`. */
    lagtTil?: Korrespondansevalg | null;
    /** U-9 i BF-49: korrespondansen lagt til som dokumentasjon uten skjemaet, og det som hindret. */
    onavbrudd?: () => Promise<string | null>;
    onendre?: () => void;
    onlagttil?: () => void;
  } = $props();
  const uid = $props.id();

  // D-7 i BF-49: et svar lagt til gjelder kravversjonen og leses med innsigelsene på dagen.
  const sendt = $derived(lagtTil?.dato || null);
  const krav = $derived(
    kravetSvaretGjelder(u, 'vederlag', sendt).krav ?? u.spor.vederlag.gjeldendeKrav!
  );
  const medDatoene = $derived(medRettingeneTil(u, sendt));
  const varseletForPosten = (p: Kravpost) =>
    varseletForKravposten(medDatoene, krav, p.id) ?? krav.id;
  const varseletFoer = (u: Utledning, post: Kravpost) => varseletFoerIdag(u, post, sendt);
  // U-15 i BF-49, OV-U120: kravpostene der et eldre krav er varselet, med brevet.
  const iEldreKrav = $derived(
    new Map(
      varseleneIEldreKrav(medDatoene).flatMap((v) => {
        const b = brevet(u, v.dokument);
        const retting = v.rettetIDokument ? brevet(u, v.rettetIDokument) : null;
        return b ? [[`${v.gjelder} ${v.hjemmel}`, { b, sendt: v.sendt, retting }] as const] : [];
      })
    )
  );
  const varseletIEldreKrav = (p: Kravpost) => {
    const hjemmel = varselhjemmelFor(p);
    const v = hjemmel === null ? undefined : iEldreKrav.get(`${p.id} ${hjemmel}`);
    return v ? LEGG_TIL.varseletErEldreKrav(v.b, v.sendt, v.retting, navnet(p)) : null;
  };
  // Innsigelsene svaret leses med, for valget etter U-7 i BF-49.
  const innsigelsene = $derived(innsigelseneSomStaar(u, sendt));
  // U-7: svaret lagt til som ikke sier noe om varselet, leses med innsigelsen fra brevet den sto i.
  const tausMedInnsigelsen = (p: Kravpost): string | null => {
    if (!lagtTil || !postvalget(valg, p.betegnelse).tausOmVarselet) return null;
    const foer = varseletFoer(u, p);
    const b = foer?.iTide === false ? brevet(u, foer.dokument) : null;
    return b ? LEGG_TIL.forSentSomFoer(b, navnet(p)) : null;
  };
  const poster = $derived(kravposterI(krav));
  const flere = $derived(poster.length > 1);
  const navnet = (p: Kravpost) => (flere ? p.betegnelse : undefined);
  const krevdI = (p: Kravpost) => p.beloep ?? 0;
  // I øre, så summen ikke får avrundingsfeil.
  const krevdTotalt = $derived(
    poster.reduce((sum, p) => sum + Math.round(krevdI(p) * 100), 0) / 100
  );
  const krevdISaerskilt = $derived(krevdSaerskilt(krav));
  const harPost = $derived(krevdISaerskilt !== null);
  // Kjernen sier hva svaret ennå ikke kan gjelde: rigg og drift.
  const hinder = $derived(hindrerSvarPaaKravet(krav));
  const harRegel = $derived(poster.some(etterRegel));
  const godkjennAlleFormerTekst = $derived(
    !harRegel
      ? SKJEMA.godkjennAlleFormer
      : poster.every(etterRegel)
        ? SKJEMA.godkjennAlleFormerRegel
        : SKJEMA.godkjennAlleFormerBlandet
  );
  const stoppet = $derived(hinder !== null);
  // U-9 i BF-48: TEs siste opplysning om datoen etter § 34.1.3 ved svaret på kravet med posten.
  const sisteKunnskapsdato = $derived(sisteKunnskapsdatoen(u));

  // Brevet ved siden av skjemaet tar plassen til støttekortet (`Brevskjema`).
  let vedSiden = $state(false);
  let valgtPost = $state<string | null>(null);
  let postliste = $state<Postliste<Kravpost> | null>(null);
  // Valgene for hver kravpost i gjeldende krav finnes før skjemaet tegnes, også når kravet er nytt.
  $effect.pre(() => {
    for (const p of poster) valg.poster[p.betegnelse] ??= tomPost();
    if (harPost) valg.saerskilt ??= tomtSaerskilt();
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
      {
        iTide: valg.iTide,
        poster: valg.poster,
        saerskilt: valg.saerskilt,
        begrunnelser: {},
        forbehold: '',
      },
      u,
      kjernesak.regler,
      [],
      sendt
    )!
  );
  // Revisjonen av det gjeldende svaret når kravversjonen har et (HF-U29).
  const utkast = $derived(somNyttSvar(brevutkast, valg.erstatter));
  const forrigeSvar = $derived(
    utkast.type === 'revisjon' ? brevMedElement(u, utkast.erstatter) : null
  );
  // Et svar lagt til forhåndsvises med datoen, så kjernen regner det mot saken slik den var da.
  const etter = $derived(forhaandsvistSvar(kjernesak, utkast, lagtTil));
  // OV-U33: lagene står også før spørsmålene er besvart (`lagIVederlaget`).
  const lagene = $derived(
    stoppet ? null : kjernesak.lagForUtkastet(brevutkast.svar[0], 'vederlag', sendt)
  );
  const foerstePunkt = $derived.by(() => {
    const sporsmaalene = lagene?.ubesvart ?? [];
    if (ubesvart(lagene, 'hovedkrav_varslet_i_tide')) return '34.1.2';
    return (
      poster.find((p) => sporsmaalene.some((s) => s.gjelder === p.id))?.betegnelse ??
      (sporsmaalene.some(iSaerskiltPost) ? SAERSKILT : undefined)
    );
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
  // Punktet og spørsmålene for posten etter § 34.1.3 annet ledd (`svarpunktet`, `LagIVederlaget`).
  const SAERSKILT = 'produktivitet';
  const SAERSKILTE_SPOERSMAAL: readonly string[] = Object.values(PRODUKTIVITETSFELT);
  const iSaerskiltPost = (s: { spoersmaal: string }) =>
    SAERSKILTE_SPOERSMAAL.includes(s.spoersmaal);
  const forutsetningeneISaerskilt = $derived(
    iPosten(
      lagene?.standpunkter.find((x) => x.art === 'beloep' && x.saerskilt === SAERSKILT)
        ?.forutsetninger ?? []
    )
  );
  // OV-U89 punkt 12: med innsigelsen etter § 34.1.2 står varselet og begrensningen etter § 34.1.3
  // i laget etter den.
  const forutsetningeneForVarselet = $derived(
    iPosten(
      lagene?.standpunkter.find((x) => x.art === 'rettidighet' && x.hjemmel === '34.1.3')
        ?.forutsetninger ?? []
    )
  );
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
  const nyttSvar = $derived(nyttSvarIUtkastet(u, etter, 'vederlag'));
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
      beloepslinje(beloep, v.delbeloep),
    ].filter((x): x is string => x !== null);
  };
  const beloepslinje = (beloep: Beloepsvalg | null, delbeloep: string): string | null =>
    beloep === null
      ? null
      : beloep === 'deler'
        ? `${SKJEMA.deler}: ${delbeloep || '–'} kr`
        : SKJEMA[beloep];
  // Valgene for posten etter § 34.1.3 annet ledd til kjernen har standpunktene. Med innsigelsen
  // mot varselet står beløpet under vilkåret, som i brevet (VS-U5).
  const saerskiltlinje = (): Skjemalinje[] => {
    const s = valg.saerskilt ?? tomtSaerskilt();
    const varselet =
      s.varsletITide === null
        ? null
        : s.varsletITide
          ? SKJEMA.komITide
          : `${SKJEMA.komForSent}, ${SKJEMA.godkjennerEtterBegrensningen(s.begrenset || '–')}`;
    const beloep = beloepslinje(s.beloep, s.delbeloep);
    return [
      ...(varselet ? [{ tekst: varselet, lag: null }] : []),
      ...(beloep
        ? [
            {
              tekst: beloep,
              lag: null,
              ...(s.varsletITide === false
                ? { vilkaar: [{ art: 'varsel' as const, hjemmel: '34.1.3' }] }
                : {}),
            },
          ]
        : []),
    ];
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
  // Beløpet i et felt som ikke kan leses, eller som kjernen avviser eller sier mangler. KA-U42:
  // kjernen avgjør om beløpet kan godtas (#2279).
  const beloepsfeil = (
    tekst: string,
    spoersmaal: Vederlagsspoersmaal,
    gjelder: string | undefined,
    utenfor: string,
    mangler: string
  ): string | null => {
    const lest = lesKroner(tekst);
    if ('feil' in lest) return lest.feil;
    if (ugyldig(lagene, spoersmaal, gjelder)) return utenfor;
    return ubesvart(lagene, spoersmaal, gjelder) ? mangler : null;
  };
  const delbeloepFeil = (p: Kravpost): string | null => {
    const v = postvalget(valg, p.betegnelse);
    if (beloepsvalget(v, p) !== 'deler') return null;
    return beloepsfeil(
      v.delbeloep,
      'godkjent_beloep',
      p.id,
      HOVEDLINJER.beloepUtenfor(krevdI(p)),
      SKJEMA.manglerDelbeloep
    );
  };
  const delbeloepISaerskilt = $derived(
    valg.saerskilt?.beloep === 'deler'
      ? beloepsfeil(
          valg.saerskilt.delbeloep,
          'produktivitet_godkjent_beloep',
          undefined,
          HOVEDLINJER.beloepUtenfor(krevdISaerskilt ?? 0),
          SKJEMA.manglerDelbeloep
        )
      : null
  );
  const begrensetFeil = $derived(
    valg.saerskilt?.varsletITide === false
      ? beloepsfeil(
          valg.saerskilt.begrenset,
          'produktivitet_begrenset_beloep',
          undefined,
          SKJEMA.begrensetOver,
          SKJEMA.manglerBegrenset
        )
      : null
  );
  const hovedvarselet = $derived(stilt(lagene, 'hovedkrav_varslet_i_tide'));
  // Punktene i brevet skjemaet har spørsmål for: varselet etter § 34.1.2 og ett per kravpost
  // (LV-U78).
  const svartemaene = $derived(
    svarpunkteneIVederlaget(krav, u.spor.forhold.gjeldendeKrav, kjernesak.regler).flatMap((t) =>
      t.punkt === '34.1.2' ||
      (t.punkt === SAERSKILT && harPost) ||
      poster.some((p) => p.betegnelse === t.punkt)
        ? // Med harde mellomrom, som overskriften i brevet (sprak.md).
          [{ ...t, overskrift: t.overskrift && medHardeMellomrom(t.overskrift) }]
        : []
    )
  );
  const begrunnelserISkjemaet = $derived(
    begrunnelserForTemaene(svartemaene, (punkt) => {
      if (!lagene) return false;
      if (punkt === '34.1.2') return hovedvarselet && valg.iTide !== null;
      const feil = [...lagene.ubesvart, ...lagene.ugyldig];
      if (punkt === SAERSKILT)
        return (
          lagene.standpunkter.some((s) => s.saerskilt === SAERSKILT && s.besvart) &&
          !feil.some(iSaerskiltPost)
        );
      const post = poster.find((p) => p.betegnelse === punkt);
      return (
        !!post &&
        lagene.standpunkter.some((s) => s.gjelder === post.id && s.besvart) &&
        !feil.some((s) => s.gjelder === post.id)
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
              return !nyttSvar || linjer.some((l) => l.punkt === p.punkt);
            })
            .map((p) => {
              const fraBrevet = linjer.filter((l) => l.punkt === p.punkt);
              const post = poster.find((q) => q.betegnelse === p.punkt);
              const status: Skjemalinje[] =
                p.punkt === SAERSKILT
                  ? saerskiltlinje()
                  : (p.punkt === '34.1.2'
                      ? valg.iTide === null
                        ? []
                        : [valg.iTide ? SKJEMA.komITide : SKJEMA.komForSent]
                      : post
                        ? leselinje(post)
                        : []
                    ).map((tekst) => ({ tekst, lag: null }));
              const taus = post ? tausMedInnsigelsen(post) : null;
              return {
                ...p,
                aktiv: foerstePunkt === p.punkt,
                linjer: [
                  ...(taus ? [{ tekst: taus, lag: null }] : []),
                  ...(fraBrevet.length
                    ? fraBrevet
                    : status.length
                      ? status
                      : taus
                        ? []
                        : [{ tekst: SKJEMA.ikkeBesvart, lag: null }]),
                ],
              };
            }),
        ]
  );
  const iSaerskiltPosten = (felt: string, tekst: string | null) => ({
    felt: `saerskilt-${felt}`,
    post: null,
    tekst: tekst && SKJEMA.iPosten(SKJEMA.saerskiltPosten, tekst),
  });
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
            // U-7 i BF-49: svaret lagt til sier noe eller ingenting om varselet der innsigelsen står.
            felt: `varsel-${p.betegnelse}`,
            post: p.id,
            tekst: i(
              lagtTil &&
                stilt(lagene, 'varslet_i_tide', p.id) &&
                innsigelsenStaar(innsigelsene, p) &&
                !postvalget(valg, p.betegnelse).tausOmVarselet &&
                postvalget(valg, p.betegnelse).varsletITide === null
                ? LEGG_TIL.svaretOmVarseletMangler
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
      ...(harPost
        ? [
            iSaerskiltPosten(
              'itide',
              ubesvart(lagene, 'produktivitet_varslet_i_tide') ? SKJEMA.manglerSaerskiltITide : null
            ),
            iSaerskiltPosten('begrenset', begrensetFeil),
            iSaerskiltPosten(
              'beloep',
              ubesvart(lagene, 'produktivitet_vurdering') ? SKJEMA.manglerBeloep : null
            ),
            iSaerskiltPosten('delbeloep', delbeloepISaerskilt),
          ]
        : []),
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
      href={`#${uid}-varsel-${post!.betegnelse}${!lagtTil && varseletFoer(u, post!)?.iTide === false ? '-standpunkt' : ''}`}
      >{innsigelsenOmVarselet('34.3.3')}</a
    >
  {:else if f.innsigelse === '34.1.3'}
    <a href={`#${uid}-saerskilt-itide`}>{innsigelsenOmVarselet('34.1.3')}</a>
  {:else}
    <a href={`#${uid}-itide`}>{innsigelsenOmVarselet('34.1.2')}</a>
  {/if}
{/snippet}

{#snippet kunnskapsdatokortet()}
  <Stoettekort id={`${uid}-kunnskapsdato`} tittel={KUNNSKAPSDATO.stoettetittel}>
    <p class="kunnskapsdato">{KUNNSKAPSDATO.iSvaret(sisteKunnskapsdato)}</p>
  </Stoettekort>
{/snippet}

<Svarskjema
  lagfeil={!stoppet && lagene === null}
  {kjernesak}
  {u}
  spor="vederlag"
  {utkast}
  {forrigeSvar}
  medTekstene={(punktene) =>
    somNyttSvar(vederlagssvaret(valg, u, kjernesak.regler, punktene, sendt)!, valg.erstatter)}
  {lagtTil}
  {onavbrudd}
  svarerPaa={lagtTil ? brevMedElement(u, krav.id) : null}
  {onendre}
  {onlagttil}
  bind:tekster={valg}
  {linjer}
  {alternativer}
  {virkninger}
  {mangler}
  {postliste}
  {begrunnelserISkjemaet}
  {skjemapunkter}
  stopp={hinder ? SKJEMA.ikkeStoettetHinder(hinder) : null}
  {onbrevkontroll}
  {onforkast}
  onvedsiden={(v) => {
    vedSiden = v;
    onvedsiden?.(v);
  }}
  stoettekort={harPost ? kunnskapsdatokortet : undefined}
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

    <!-- Beløpet for en post: kravposten med fast sum (KA-U72) eller posten etter punkt 34.1.3 annet
       ledd. `stilles` er om kjernen spør om beløpet, og `deler` om feltet for beløpet står. -->
    {#snippet beloepsvalgene(
      id: { beloep: string; delbeloep: string },
      v: { beloep: Beloepsvalg | null; delbeloep: string },
      krevd: number,
      stilles: boolean,
      deler: boolean,
      beskrevetAv: string | undefined
    )}
      {#if stilles}
        <Valg
          navn={id.beloep}
          spoersmaal={SKJEMA.beloepSpoersmaal}
          {beskrevetAv}
          valg={[
            { verdi: 'hele', tekst: SKJEMA.hele },
            { verdi: 'deler', tekst: SKJEMA.deler },
            { verdi: 'ingenting', tekst: SKJEMA.ingenting },
          ]}
          bind:verdi={v.beloep}
          feil={feil(id.beloep)}
          lett
          stablet
        />
      {/if}
      {#if deler}
        <Linjefelt
          id={id.delbeloep}
          etikett={SKJEMA.belopEtikett}
          hjelp={SKJEMA.belopHjelp(krevd)}
          enhet="kr"
          bredde="tall"
          inputmode="decimal"
          bind:verdi={v.delbeloep}
          feil={feil(id.delbeloep)}
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
      {#if stilt(lagene, 'krever_tilbud', p.id)}
        <Valg
          navn={`${uid}-tilbud-${p.betegnelse}`}
          spoersmaal={SKJEMA.tilbudSpoersmaal}
          valg={[{ verdi: true, tekst: SKJEMA.kreverTilbud(navnet(p) ?? null) }]}
          bind:verdi={() => v.kreverTilbud || null, (x) => (v.kreverTilbud = x === true)}
          avkrysning
          valgfri
          lett
        />
      {/if}
      {#if stilt(lagene, 'varslet_i_tide', p.id)}
        {@const foer = varseletFoer(u, p)}
        {@const varselet = forutsetningene(p, 'rettidighet')}
        {@const justeringen = forutsetningene(p, 'justering')}
        {#snippet foranVarselet()}
          {@const eldre = varseletIEldreKrav(p)}
          {#if eldre}<Datoer linjer={[{ tekst: eldre }]} />{/if}
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
        <Varseldatoer {u} gjelder={varseletForPosten(p)} svaretSendt={sendt} />
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
          bind:taus={v.tausOmVarselet}
          lagtTil={!!lagtTil}
          varselFeil={feil(`${uid}-varsel-${p.betegnelse}`)}
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
        <Varseldatoer
          {u}
          spor="vederlag"
          krav={krav.id}
          sendt={SKJEMA.kravSendt}
          svaretSendt={sendt}
        />
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
            { verdi: true, tekst: SKJEMA.komITide },
            { verdi: false, tekst: SKJEMA.komForSent },
          ]}
          bind:verdi={valg.iTide}
          feil={feil(`${uid}-itide`)}
        />
        {@render begrunnelse('34.1.2')}
      </Spoersmaal>
    {/if}

    <!-- Punktet for posten i brevet (LV-U78). -->
    {#snippet postvalgene(p: Kravpost)}
      {@render metodevalgene(p)}
      {@const v = valg.poster[p.betegnelse]}
      {#if v && stilt(lagene, 'vurdering', p.id)}
        {@render beloepsvalgene(
          {
            beloep: `${uid}-beloep-${p.betegnelse}`,
            delbeloep: `${uid}-delbeloep-${p.betegnelse}`,
          },
          v,
          krevdI(p),
          stilt(lagene, 'vurdering', p.id),
          beloepsvalget(v, p) === 'deler',
          forutsetningene(p, 'oppgjoersform').length
            ? `${uid}-form-${p.betegnelse}-forutsetninger`
            : undefined
        )}
      {/if}
      {@render begrunnelse(p.betegnelse)}
    {/snippet}

    {#if flere}
      <!-- Overskriften gir gruppen et navn og postene i lista et nivå under (WCAG 1.3.1). -->
      <Spoersmaal
        id={`${uid}-sp-poster`}
        tittel={SKJEMA.kravpostene}
        aktiv={poster.some((p) => foerstePunkt === p.betegnelse)}
      >
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
      </Spoersmaal>
    {:else if poster[0]}
      {@const p = poster[0]}
      <Spoersmaal
        id={`${uid}-sp-post`}
        aktiv={foerstePunkt === p.betegnelse}
        tittel={overskrift(p.betegnelse) ?? temanavn(svartemaene, p.betegnelse)}
      >
        <p class="dempet">
          {etterRegel(p) ? SKJEMA.teKreverRegel(p) : SKJEMA.teKrever(krevdTotalt, p.pns)}
        </p>
        {@render postvalgene(p)}
      </Spoersmaal>
    {/if}

    <!-- Punktet for posten etter § 34.1.3 annet ledd i brevet (VS-U5). Datoen totalentreprenøren
       oppgir, står i kortet ved siden av (U-9 i BF-48). -->
    {#if harPost && valg.saerskilt}
      {@const s = valg.saerskilt}
      <Spoersmaal
        id={`${uid}-sp-saerskilt`}
        aktiv={foerstePunkt === SAERSKILT}
        tittel={overskrift(SAERSKILT) ?? temanavn(svartemaene, SAERSKILT)}
      >
        <p class="dempet">{SKJEMA.teKreverSaerskilt(krevdISaerskilt ?? 0)}</p>
        <!-- U-9 i BF-48: datoen står ved valget når kortet står under skjemaet (smal skjerm) eller
           ikke vises (brevet ved siden av). Valget viser til den også når den er skjult. -->
        <p class="kunnskapsdato" class:smal={!vedSiden} id={`${uid}-kunnskapsdato-ved-valget`}>
          {KUNNSKAPSDATO.iSvaret(sisteKunnskapsdato)}
        </p>
        <Varseldatoer {u} gjelder={varseletFoerBrevet(medDatoene, '34.1.3')} svaretSendt={sendt} />
        <Gjelderhvis
          id={`${uid}-saerskilt-itide-forutsetninger`}
          liste={forutsetningeneForVarselet}
          punkt={forutsetning}
        />
        <Valg
          navn={`${uid}-saerskilt-itide`}
          spoersmaal={SKJEMA.varselSpoersmaal}
          beskrevetAv={[
            ...(forutsetningeneForVarselet.length ? [`${uid}-saerskilt-itide-forutsetninger`] : []),
            `${uid}-kunnskapsdato-ved-valget`,
          ].join(' ')}
          valg={[
            { verdi: true, tekst: SKJEMA.komITide },
            { verdi: false, tekst: SKJEMA.komForSent },
          ]}
          bind:verdi={s.varsletITide}
          feil={feil(`${uid}-saerskilt-itide`)}
          lett
        />
        {#if s.varsletITide === false}
          <Linjefelt
            id={`${uid}-saerskilt-begrenset`}
            etikett={SKJEMA.begrensetEtikett}
            hjelp={SKJEMA.begrensetHjelp}
            enhet="kr"
            bredde="tall"
            inputmode="decimal"
            bind:verdi={s.begrenset}
            feil={feil(`${uid}-saerskilt-begrenset`)}
          />
        {/if}
        <Gjelderhvis
          id={`${uid}-saerskilt-forutsetninger`}
          liste={forutsetningeneISaerskilt}
          punkt={forutsetning}
        />
        {@render beloepsvalgene(
          { beloep: `${uid}-saerskilt-beloep`, delbeloep: `${uid}-saerskilt-delbeloep` },
          s,
          krevdISaerskilt ?? 0,
          true,
          s.beloep === 'deler',
          forutsetningeneISaerskilt.length ? `${uid}-saerskilt-forutsetninger` : undefined
        )}
        {@render begrunnelse(SAERSKILT)}
      </Spoersmaal>
    {/if}
  {/snippet}
</Svarskjema>

<style>
  .kunnskapsdato {
    font-size: 14px;
    color: var(--ink-2);
  }
  .smal {
    display: none;
  }
  @media (max-width: 1180px) {
    .smal {
      display: block;
    }
  }
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
