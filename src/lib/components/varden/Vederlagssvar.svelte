<!--
  BH skriver svar på krav om vederlag (Varden, skjerm B). Skjemaet vurderer, panelet viser
  hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt (prinsipp 3). Ingenting
  er forhåndsvalgt. Kommandoen bygges i `kommandoer.ts`, og kjernen regner resultatet, lager
  brevet og avviser det den ikke godtar.

  Handlingene (oppdragsgiver 29.10, #1391): «Se brevet før sending» står bare i panelet og er
  alltid aktiv. Mangler et svar, vises ikke brevet, og det som mangler, står ved feltet og
  øverst i skjemaet (MM-U32, BF-01 S-3 med reserven B, fordi kjernen ikke lager tekst for et
  ufullstendig svar). «Forkast utkast» står nederst i skjemaet og spør først.
-->
<script module lang="ts">
  // Skjemaene på siden som vil vise den faste linja. Den gjengis bare for det siste, så
  // flere eksemplarer ikke ligger oppå hverandre (showcasen viser flere skjemaer).
  const vilHaLinja = $state<string[]>([]);
</script>

<script lang="ts">
  import { BookOpen, FileText, Info } from 'lucide-svelte';
  import { tick, untrack } from 'svelte';
  import { kravposterI } from '$kjerne/format/kravinnhold';
  import { hindrerSvarPaaKravet } from '$kjerne/kommandoer/forutsetninger';
  import { kroner } from '$kjerne/frosset/tekst';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { VIRKNING } from '$lib/kjernesak/svarvirkning';
  import { lesKroner } from '$lib/utils/belop';
  import type { Kravpostvurdering } from '$kjerne/frosset/utregning';
  import type { Forutsetning } from '$kjerne/kommandoer/lag';
  import type { Utledning } from '$kjerne/utledning/utled';
  import type { Kravpost, Standpunkt } from '$kjerne/typer';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Infotips from './Infotips.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import Valg from './Valg.svelte';
  import {
    postvalget,
    beloepsvalget,
    spoerOmBeloepet,
    utkastForBeloepet,
    tomPost,
    tomtSvar,
    vederlagssvaret,
    type Postvalg,
    type Svarvalg,
  } from './kommandoer';
  import { brevene, brevet, datoerISporet, klarOverForholdet, standpunktene } from './lesing';
  import {
    BREVKONTROLL,
    HOVEDLINJER,
    SKJEMA,
    brevhode,
    brevtittel,
    dato,
    grunntekst,
    leselinjene,
    kalenderdager,
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
    onbrevkontroll: (k: {
      kommando: Record<string, unknown>;
      tekst: string[];
      utdypning?: string;
      detteSender: { tekst: string; lag: string | null }[];
      virkninger: string[];
      merking: string | null;
      deresRef: string[];
      tittel: string | null;
    }) => void;
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
  const alleBrev = $derived(brevene(u));
  const kravbrevet = $derived(alleBrev.find((b) => b.id === krav.dokument)!);
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('vederlag')));
  const datoer = $derived(datoerISporet(u, 'vederlag'));
  const klarOver = $derived(klarOverForholdet(u));
  const harPost = $derived(
    (krav.innhold.saerskilt as { produktivitet?: unknown } | undefined)?.produktivitet !== undefined
  );
  // Kjernen sier hva svaret ennå ikke kan gjelde: rigg og drift. Skjemaet har ennå ikke svaret på
  // en kravpost etter en beregningsregel (svar 4 A i spørsmålsfila 10.11 for #1663, #1756).
  const regelpost = $derived(poster.find((p) => p.oppgjoersform !== 'tilbud'));
  const hinder = $derived(
    harPost
      ? null
      : (hindrerSvarPaaKravet(krav) ??
          (regelpost ? SKJEMA.beregningsregel(regelpost.betegnelse) : null))
  );
  const stoppet = $derived(harPost || hinder !== null);

  // Én kravpost er åpen om gangen; de andre står som en leselinje (#1739, system.md).
  // `null` er den første kravposten, og en tom streng er ingen.
  let valgtPost = $state<string | null>(null);
  const aapen = $derived(flere ? (valgtPost ?? poster[0]?.betegnelse) : poster[0]?.betegnelse);
  $effect(() => {
    for (const p of poster) if (!valg.poster[p.betegnelse]) valg.poster[p.betegnelse] = tomPost();
  });
  const valgFor = (betegnelse: string): Postvalg => (valg.poster[betegnelse] ??= tomPost());
  async function aapne(betegnelse: string, fokus?: string) {
    valgtPost = betegnelse;
    await tick();
    document.getElementById(fokus ?? `${uid}-form-${betegnelse}`)?.focus();
  }
  async function lukk(betegnelse: string) {
    valgtPost = '';
    await tick();
    document.getElementById(`${uid}-endre-${betegnelse}`)?.focus();
  }
  function godkjennAlleFormer() {
    for (const p of poster) valgFor(p.betegnelse).form = 'tilbud';
  }
  function godkjennAlle() {
    for (const p of poster) valgFor(p.betegnelse).beloep = 'hele';
  }

  const kommando = $derived(vederlagssvaret(valg, u, kjernesak.regler)!);
  const etter = $derived(kjernesak.forhaandsvist(kommando));
  const vurderteIUtkastet = (s: (typeof kommando.svar)[number]) =>
    (s.vurderinger.kravposter ?? []) as Kravpostvurdering[];
  const utenOppgjoersform = (p: Kravpostvurdering) => ({
    gjelder: p.gjelder,
    vurdering: p.vurdering,
    godkjent_beloep: p.godkjent_beloep,
  });
  // Innsigelsene beløpet bygger på, for hver kravpost, regnet av kjernen fra det som er besvart.
  const beloepslagene = $derived(
    stoppet ? null : kjernesak.lagForUtkastet(utkastForBeloepet(kommando.svar[0], valg, krav))
  );
  const forutsetninger = (p: Kravpost): Forutsetning[] =>
    beloepslagene?.standpunkter.find(
      (x) => x.art === 'beloep' && !x.saerskilt && x.gjelder === p.id
    )?.forutsetninger ?? [];
  // Grunnene fra grunnlaget står først i hver liste kjernen gir, og gjelder også varselet
  // (oppdragsgiver 30.10, 1A i #1411).
  const grunnene = $derived(poster[0] ? forutsetninger(poster[0]).filter((f) => 'grunn' in f) : []);
  // Oppgjørsformen står i laget sitt uansett svaret (OV-U33, LV-U31), så kjernen spørres med
  // formen godtatt, også før den er besvart (oppdragsgiver 30.10 i #1411, S2-A i #1400).
  const formlagene = $derived.by(() => {
    if (stoppet) return null;
    const s = kommando.svar[0];
    const vurderinger = {
      ...s.vurderinger,
      kravposter: vurderteIUtkastet(s).map((p) => ({ ...utenOppgjoersform(p), aksepterer: true })),
    };
    return kjernesak.lagForUtkastet({ ...s, vurderinger });
  });
  const formforutsetninger = (p: Kravpost): Forutsetning[] =>
    formlagene?.standpunkter.find((x) => x.art === 'oppgjoersform' && x.gjelder === p.id)
      ?.forutsetninger ?? [];
  const grunnlagsbrev = $derived.by(() => {
    const g = u.spor.forhold.gjeldendeSvar;
    return g ? brevet(u, g.dokument) : null;
  });
  const nyttSvar = $derived.by(() => {
    const s = etter?.spor.vederlag.gjeldendeSvar;
    return s && !u.spor.vederlag.svar.some((x) => x.id === s.id) ? s : null;
  });
  const postenFor = (s: Standpunkt) =>
    'gjelder' in s && s.gjelder !== undefined ? poster.find((p) => p.id === s.gjelder) : undefined;
  const linjer = $derived(
    nyttSvar
      ? standpunktene(nyttSvar, etter!).map((l) => {
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
      : []
  );
  // Leselinjen for en lukket kravpost: standpunktene slik kjernen skriver dem, eller valgene
  // til svaret er fullstendig.
  const leselinje = (p: Kravpost): string[] => {
    const fra = nyttSvar ? leselinjene(standpunktene(nyttSvar, etter!), p) : [];
    if (fra.length) return fra;
    const v = postvalget(valg, p.betegnelse);
    return [
      v.form === null
        ? null
        : v.form === 'tilbud'
          ? SKJEMA.godkjennerForm
          : SKJEMA.menerForm(v.form),
      beloepsvalget(v) === null
        ? null
        : v.beloep === 'deler'
          ? `${SKJEMA.deler}: ${v.delbeloep || '–'} kr`
          : SKJEMA[beloepsvalget(v)!],
    ].filter((x): x is string => x !== null);
  };
  // Beløp i mer enn ett lag er alternativer, ikke tillegg (Varden, skjerm B).
  const alternativer = $derived(
    new Set(
      nyttSvar
        ? standpunktene(nyttSvar, etter!)
            .filter((s) => s.lag && 'standpunkt' in s && s.standpunkt.art === 'beloep')
            .map((s) => s.lag)
        : []
    ).size > 1
  );
  // Med `sendes` avviser kjernen også et svar uten begrunnelse der kontrakten krever den.
  const avvisning = $derived.by(() => {
    const b = kjernesak.brev(kommando, undefined, true);
    return b && 'avvisning' in b ? b.avvisning : null;
  });
  // Nummeret og tittelen står i raden kjernen ville skrevet (LV-U44, LV-U27), ikke regnet ut her.
  const utkastbrev = $derived.by(() => {
    const b = kjernesak.brev(kommando);
    return b && 'tekst' in b ? b : null;
  });
  // Det som mangler, med skjemaets ord. Kjernen avviser det samme med feltkoder.
  const delbeloepFeil = (p: Kravpost): string | null => {
    const v = postvalget(valg, p.betegnelse);
    if (beloepsvalget(v) !== 'deler') return null;
    const lest = lesKroner(v.delbeloep);
    if ('feil' in lest) return lest.feil;
    if (lest.verdi === undefined) return SKJEMA.manglerDelbeloep;
    return lest.verdi <= 0 || lest.verdi >= krevdI(p) ? HOVEDLINJER.beloepUtenfor(krevdI(p)) : null;
  };
  const mangler = $derived(
    [
      { felt: `${uid}-itide`, post: null, tekst: valg.iTide === null ? SKJEMA.manglerITide : null },
      ...poster.flatMap((p) => {
        const v = postvalget(valg, p.betegnelse);
        const i = (tekst: string | null) =>
          tekst ? SKJEMA.iPosten(navnet(p) ?? null, tekst) : null;
        return [
          {
            felt: `${uid}-form-${p.betegnelse}`,
            post: p.betegnelse,
            tekst: i(v.form === null ? SKJEMA.manglerForm : null),
          },
          {
            felt: `${uid}-beloep-${p.betegnelse}`,
            post: p.betegnelse,
            tekst: i(spoerOmBeloepet(v) && beloepsvalget(v) === null ? SKJEMA.manglerBeloep : null),
          },
          {
            felt: `${uid}-delbeloep-${p.betegnelse}`,
            post: p.betegnelse,
            tekst: i(delbeloepFeil(p)),
          },
        ];
      }),
      // KA-U24: kjernen sier når svaret må ha en begrunnelse, og hvorfor.
      {
        felt: `${uid}-begrunnelse`,
        post: null,
        tekst: avvisning?.regel === 'BEGRUNNELSE_MANGLER' ? avvisning.melding : null,
      },
    ].filter((m): m is { felt: string; post: string | null; tekst: string } => m.tekst !== null)
  );
  // Beskjedene vises først når BH har prøvd å se brevet (MM-U32), og forsvinner når feltet er besvart.
  let forsoekt = $state(false);
  const feil = (felt: string): string | null =>
    forsoekt ? (mangler.find((m) => m.felt === `${uid}-${felt}`)?.tekst ?? null) : null;
  const begrunnelseFeil = $derived(feil('begrunnelse'));
  let oppsummering = $state<HTMLElement | null>(null);
  let sendehindring = $state<string | null>(null);

  const virkninger = $derived([
    ...(nyttSvar?.beslutningsgrunnlag.sammenfall ? [VIRKNING.sammenfall] : []),
    ...(kjernesak.forbehold ? [VIRKNING.forbehold] : []),
    ...(nyttSvar?.standpunkter.some((s) => s.art === 'rettidighet' && !s.iTide)
      ? [BREVKONTROLL.akseptOmfatter]
      : []),
  ]);

  async function seBrevet() {
    sendehindring = null;
    if (mangler.length) {
      forsoekt = true;
      const foerste = mangler.find((m) => m.post !== null);
      if (foerste) valgtPost = foerste.post;
      await tick();
      oppsummering?.focus();
      return;
    }
    const b = kjernesak.brev(kommando, undefined, true);
    if (!b || !('tekst' in b) || !b.tekst) {
      sendehindring =
        b && 'avvisning' in b && b.avvisning.regel === 'UGYLDIG_VURDERING'
          ? HOVEDLINJER.kanIkkeLages
          : (brevaarsak(b) ?? HOVEDLINJER.kanIkkeLages);
      // Fra den faste linja står hindringen utenfor syne; fokus viser den.
      await tick();
      document.getElementById(`${uid}-hindring`)?.focus();
      return;
    }
    onbrevkontroll({
      kommando,
      tekst: b.tekst,
      utdypning: kommando.svar[0].utdypning,
      detteSender: linjer,
      virkninger,
      merking: b.merking,
      deresRef: b.deresRef,
      tittel: b.brevtittel,
    });
  }

  let bekreftForkast = $state(false);
  let forkastSpoersmaal = $state<HTMLElement | null>(null);
  async function spoerOmForkast() {
    bekreftForkast = true;
    await tick();
    forkastSpoersmaal?.focus();
  }
  async function behold() {
    bekreftForkast = false;
    await tick();
    document.getElementById(`${uid}-forkast`)?.focus();
  }

  // Brevet leses i en ramme ved siden av skjemaet, og på smal skjerm i skjemaet, der
  // høyre kolonne står under arbeidet (oppdragsgiver 29.10, #1391).
  let smal = $state(false);
  $effect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1180px)');
    const sett = () => (smal = mq.matches);
    sett();
    mq.addEventListener('change', sett);
    return () => mq.removeEventListener('change', sett);
  });
  let leser = $state(false);
  $effect(() => {
    onvedsiden?.(leser && !smal);
    return () => onvedsiden?.(false);
  });

  // Panelet følger rullingen bare når det får plass i vinduet; ellers vises en kompakt linje
  // nederst når panelet er ute av syne (skjerm E).
  let panel = $state<HTMLElement | null>(null);
  let faarPlass = $state(true);
  let iSyne = $state(true);
  // Panelet fjernes når brevet leses ved siden av, så målingen bindes på nytt hver gang det
  // settes inn.
  $effect(() => {
    const el = panel;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const maal = () => (faarPlass = el.offsetHeight + 32 <= window.innerHeight);
    const ro = new ResizeObserver(maal);
    ro.observe(el);
    window.addEventListener('resize', maal);
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([e]) => (iSyne = e.isIntersecting));
    io?.observe(el);
    maal();
    return () => {
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener('resize', maal);
    };
  });

  const vilVise = $derived(!stoppet && !faarPlass && !iSyne && !(leser && !smal));
  $effect(() => {
    if (!vilVise) return;
    untrack(() => vilHaLinja.push(uid));
    return () =>
      untrack(() => {
        const i = vilHaLinja.indexOf(uid);
        if (i >= 0) vilHaLinja.splice(i, 1);
      });
  });
  const visKompakt = $derived(vilVise && vilHaLinja.at(-1) === uid);
</script>

{#snippet gjelderHvis(felt: string, liste: Forutsetning[])}
  {#if liste.length}
    <!-- Forutsetningene for laget, én per linje, i brevets rekkefølge (oppdragsgiver 30.10,
         #1391, #1400). -->
    <div class="forutsetninger" id={`${uid}-${felt}-forutsetninger`}>
      <p>{SKJEMA.gjelderHvis}</p>
      <ul>
        {#each liste as f, i (i)}
          <li>
            {#if 'grunn' in f}
              {SKJEMA.grunnen(f.grunn, grunnlagsbrev!)}
            {:else}
              <a href={`#${uid}-itide`}>{SKJEMA.innsigelsenSenVarsling}</a>
            {/if}
            {SKJEMA.ikkeFoererFrem}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
{/snippet}

{#snippet kravbrev(innfelt: boolean)}
  <Brev
    avsender={kravbrevet.avsender}
    sak={kjernesak.saksbilde?.tittel ?? ''}
    merking={kravbrevet.merking}
    deresRef={kravbrevet.deresRef}
    dato={dato(kravbrevet.registrert)}
    tittel={brevtittel(kravbrevet)}
    avsnitt={kravbrevet.avsnitt ?? []}
    {innfelt}
  />
{/snippet}

{#snippet sendeknapp()}
  <div class="handling">
    <Knapp
      variant="primaer"
      onclick={seBrevet}
      aria-describedby={sendehindring ? `${uid}-hindring` : undefined}>{HOVEDLINJER.seBrevet}</Knapp
    >
  </div>
  {#if sendehindring}
    <Melding art="feil" levende={false} id={`${uid}-hindring`} tabindex="-1"
      >{sendehindring}</Melding
    >
  {/if}
{/snippet}

<Arbeidsflate leser={leser && !smal}>
  {#snippet hoved()}
    <Utkastkort
      id={`${uid}-tittel`}
      tittel={utkastbrev
        ? brevhode({ merking: utkastbrev.merking, art: 'svar', brevtittel: utkastbrev.brevtittel })
        : null}
      mottaker={SKJEMA.tilTE}
    >
      {#snippet infotips()}<Infotips navn={SKJEMA.omSvaret} tekst={VIRKNING.alltid} />{/snippet}
      <div class="svarerpaa">
        <FileText size={16} aria-hidden="true" />
        <span>{SKJEMA.svarerPaa(kravbrevet)}</span>
        <Knapp
          variant="lenke"
          onclick={() => (leser = !leser)}
          aria-expanded={leser}
          aria-controls={`${uid}-kravbrev`}
        >
          {leser ? SKJEMA.lukkBrevet : smal ? SKJEMA.lesBrevetHer : SKJEMA.lesBrevet}
        </Knapp>
      </div>
      {#if leser && smal}
        <div class="innebrev" id={`${uid}-kravbrev`}>{@render kravbrev(false)}</div>
      {/if}

      {#if stoppet}
        <div class="ikke-stoettet" role="note">
          <Info size={18} aria-hidden="true" />
          <p>{hinder ? SKJEMA.ikkeStoettetHinder(hinder) : SKJEMA.ikkeStoettet}</p>
        </div>
      {:else}
        {#if forsoekt && mangler.length}
          <div
            class="mangler"
            role="group"
            tabindex="-1"
            bind:this={oppsummering}
            aria-labelledby={`${uid}-mangler`}
          >
            <p id={`${uid}-mangler`}>{SKJEMA.mangler}</p>
            <ul>
              {#each mangler as m (m.felt)}
                <li>
                  <a
                    href={`#${m.felt}`}
                    onclick={(e) => {
                      if (m.post === null || m.post === aapen) return;
                      e.preventDefault();
                      aapne(m.post, m.felt);
                    }}>{m.tekst}</a
                  >
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        <section class="spoersmaal" aria-labelledby={`${uid}-sp-varsel`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-varsel`}>{SKJEMA.varselTittel}</h3>
            <Infotips navn={SKJEMA.datoInfoNavn} tekst={SKJEMA.datoInfo} />
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 34.1.2</span>
          </div>
          {@render gjelderHvis('itide', grunnene)}
          <div class="datoer">
            {#if klarOver}<p>{SKJEMA.klarOver(klarOver.dato, klarOver.brev)}</p>{/if}
            <p>{SKJEMA.kravSendt(kravbrevet.registrert, kravbrevet)}</p>
            {#if klarOver}
              <p>
                <strong
                  >{SKJEMA.avstand(kalenderdager(klarOver.dato, kravbrevet.registrert))}</strong
                >
              </p>
            {/if}
            <p class="dempet">{SKJEMA.datoGrense}</p>
          </div>
          <Valg
            navn={`${uid}-itide`}
            spoersmaal={SKJEMA.varselSpoersmaal}
            beskrevetAv={grunnene.length ? `${uid}-itide-forutsetninger` : undefined}
            valg={[
              { verdi: true, tekst: SKJEMA.iTide },
              { verdi: false, tekst: SKJEMA.forSent },
            ]}
            bind:verdi={valg.iTide}
            feil={feil('itide')}
          />
        </section>

        <section class="spoersmaal" aria-labelledby={`${uid}-sp-beloep`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-beloep`}>
              {SKJEMA.beloepTittel} · <span class="num">{kroner(krevdTotalt)}</span>
            </h3>
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 34.1 og 34.2</span>
          </div>
          {#if flere}
            <p class="dempet">{SKJEMA.ettSvarPerPost}</p>
            <div class="snarveier">
              <Knapp variant="lenke" onclick={godkjennAlleFormer}>{SKJEMA.godkjennAlleFormer}</Knapp
              >
              <Knapp variant="lenke" onclick={godkjennAlle}>{SKJEMA.godkjennAlle}</Knapp>
            </div>
          {/if}
          <ul class="poster" class:flere>
            {#each poster as p (p.id)}
              {@const v = valg.poster[p.betegnelse]}
              <li class="post" class:aapen={aapen === p.betegnelse}>
                {#if aapen === p.betegnelse && v}
                  {@const beloepFeil = feil(`delbeloep-${p.betegnelse}`)}
                  {@const forms = formforutsetninger(p)}
                  <div class="posthode">
                    <h4>
                      {#if flere}<span class="betegnelse">{p.betegnelse}</span>{/if}
                      {p.beskrivelse}
                    </h4>
                    <p class="dempet">{SKJEMA.teKrever(krevdI(p), p.pns)}</p>
                  </div>
                  {@render gjelderHvis(`form-${p.betegnelse}`, forms)}
                  <Valg
                    navn={`${uid}-form-${p.betegnelse}`}
                    spoersmaal={SKJEMA.formSpoersmaal}
                    beskrevetAv={forms.length
                      ? `${uid}-form-${p.betegnelse}-forutsetninger`
                      : undefined}
                    valg={[
                      { verdi: 'tilbud', tekst: SKJEMA.godkjennerForm },
                      { verdi: 'enhetspriser', tekst: SKJEMA.menerForm('enhetspriser') },
                      { verdi: 'regningsarbeid', tekst: SKJEMA.menerForm('regningsarbeid') },
                    ]}
                    bind:verdi={v.form}
                    feil={feil(`form-${p.betegnelse}`)}
                  />
                  <!-- Spørsmålet om beløpet står bare når BH godkjenner fast sum (KA-U72). Det er i
                       samme lag som oppgjørsformen og viser til forutsetningene over. -->
                  {#if spoerOmBeloepet(v)}
                    <Valg
                      navn={`${uid}-beloep-${p.betegnelse}`}
                      spoersmaal={SKJEMA.beloepSpoersmaal}
                      beskrevetAv={forms.length
                        ? `${uid}-form-${p.betegnelse}-forutsetninger`
                        : undefined}
                      valg={[
                        { verdi: 'hele', tekst: SKJEMA.hele },
                        { verdi: 'deler', tekst: SKJEMA.deler },
                        { verdi: 'ingenting', tekst: SKJEMA.ingenting },
                      ]}
                      bind:verdi={v.beloep}
                      feil={feil(`beloep-${p.betegnelse}`)}
                    />
                  {/if}
                  {#if beloepsvalget(v) === 'deler'}
                    {@const id = `${uid}-delbeloep-${p.betegnelse}`}
                    <div class="beloepfelt">
                      <label for={id}>{SKJEMA.belopEtikett}</label>
                      <span id={`${id}-hjelp`} class="dempet">{SKJEMA.belopHjelp(krevdI(p))}</span>
                      <span class="inndata" class:ugyldig={beloepFeil}>
                        <input
                          {id}
                          inputmode="decimal"
                          bind:value={v.delbeloep}
                          aria-describedby={beloepFeil ? `${id}-hjelp ${id}-feil` : `${id}-hjelp`}
                          aria-invalid={beloepFeil ? 'true' : undefined}
                        />
                        <span class="kr" aria-hidden="true">kr</span>
                      </span>
                      {#if beloepFeil}<p class="feilmelding" id={`${id}-feil`}>{beloepFeil}</p>{/if}
                    </div>
                  {/if}
                  {#if flere}
                    <div class="postfot">
                      <Knapp onclick={() => lukk(p.betegnelse)}>{SKJEMA.ferdig}</Knapp>
                    </div>
                  {/if}
                {:else}
                  {@const lest = leselinje(p)}
                  <div class="postlinje">
                    <div class="postnavn">
                      <h4>
                        <span class="betegnelse">{p.betegnelse}</span>
                        {p.beskrivelse}
                      </h4>
                      <p class="dempet">{SKJEMA.teKrever(krevdI(p), p.pns)}</p>
                    </div>
                    <div class="lest">
                      <span class="visually-hidden">{SKJEMA.svaretKolonne}:</span>
                      {#if lest.length}
                        <ul>
                          {#each lest as l, i (i)}<li>{l}</li>{/each}
                        </ul>
                      {:else}
                        <span class="dempet">{SKJEMA.ikkeBesvart}</span>
                      {/if}
                    </div>
                    <Knapp
                      variant="lenke"
                      id={`${uid}-endre-${p.betegnelse}`}
                      aria-label={lest.length
                        ? SKJEMA.endrePost(p.betegnelse)
                        : SKJEMA.svarPaaPost(p.betegnelse)}
                      onclick={() => aapne(p.betegnelse)}
                      >{lest.length ? SKJEMA.endre : SKJEMA.svarPaa}</Knapp
                    >
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        </section>

        <section class="spoersmaal">
          <div class="begrunnelse">
            <label for={`${uid}-begrunnelse`} class="h3">{SKJEMA.begrunnelse}</label>
            <span class="dempet" id={`${uid}-begrunnelse-hjelp`}>{SKJEMA.begrunnelseHjelp}</span>
            <textarea
              id={`${uid}-begrunnelse`}
              class:ugyldig={begrunnelseFeil}
              rows="5"
              bind:value={valg.begrunnelse}
              aria-describedby={begrunnelseFeil
                ? `${uid}-begrunnelse-hjelp ${uid}-begrunnelse-feil`
                : `${uid}-begrunnelse-hjelp`}
              aria-invalid={begrunnelseFeil ? 'true' : undefined}
            ></textarea>
            {#if begrunnelseFeil}<p class="feilmelding" id={`${uid}-begrunnelse-feil`}>
                {begrunnelseFeil}
              </p>{/if}
          </div>
        </section>
      {/if}

      <div class="skjemafot">
        {#if bekreftForkast}
          <div class="bekreft" role="group" aria-labelledby={`${uid}-forkast-spoersmaal`}>
            <p id={`${uid}-forkast-spoersmaal`} tabindex="-1" bind:this={forkastSpoersmaal}>
              {SKJEMA.forkastSpoersmaal}
            </p>
            <div class="knapper">
              <Knapp onclick={onforkast}>{SKJEMA.forkastJa}</Knapp>
              <Knapp variant="lenke" onclick={behold}>{SKJEMA.behold}</Knapp>
            </div>
          </div>
        {:else}
          <Knapp variant="lenke" id={`${uid}-forkast`} onclick={spoerOmForkast}
            >{SKJEMA.forkast}</Knapp
          >
        {/if}
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    {#if leser && !smal}
      <section class="leseramme" id={`${uid}-kravbrev`} aria-labelledby={`${uid}-lesetittel`}>
        <h2 class="lesetittel" id={`${uid}-lesetittel`}>
          {brevhode(kravbrevet)}
          <span class="dempet">· {kravbrevet.avsender} · {dato(kravbrevet.registrert)}</span>
        </h2>
        <!-- Rammen ruller for seg selv, så den må kunne nås med tastaturet. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="brevrulle" tabindex="0" role="region" aria-labelledby={`${uid}-lesetittel`}>
          {@render kravbrev(true)}
        </div>
        {#if !stoppet}<div class="lesebunn">{@render sendeknapp()}</div>{/if}
      </section>
    {:else}
      <div class="feste" class:fast={faarPlass} bind:this={panel}>
        <Hovedlinjer {linjer} {alternativer} handling={stoppet ? undefined : sendeknapp} />
      </div>
      <Tidslinje brev={sporbrev} {datoer} />
    {/if}
  {/snippet}
</Arbeidsflate>

{#if visKompakt}
  <div class="kompakt" role="region" aria-label="Hovedlinjene og brevkontrollen">
    <Knapp variant="primaer" onclick={seBrevet}>{HOVEDLINJER.seBrevet}</Knapp>
    <Knapp onclick={() => panel?.scrollIntoView({ block: 'start' })}>Se hovedlinjene</Knapp>
  </div>
{/if}

<style>
  .svarerpaa {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface-inset);
    border-top: var(--rule);
    border-bottom: var(--rule);
  }
  .svarerpaa > span {
    margin-right: auto;
  }
  .spoersmaal {
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .spoersmaal:last-child {
    border-bottom: 0;
  }
  .sp-hode {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }
  h3,
  .h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .hjemmel {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 0 var(--spacing-2);
    border: var(--rule-strong);
    border-radius: var(--r-merke);
    color: var(--ink-2);
    font-size: 12px;
    white-space: nowrap;
  }
  /* Subsidiært har ingen farge; laget skilles med kantlinjen og teksten (#197). */
  .forutsetninger {
    padding: var(--spacing-1) 0 var(--spacing-1) var(--spacing-3);
    border-left: 2px solid var(--ink);
    color: var(--ink-2);
    font-size: 14px;
  }
  .forutsetninger p {
    font-weight: 600;
    color: var(--ink);
  }
  .forutsetninger ul {
    margin: var(--spacing-1) 0 0;
    padding-left: var(--spacing-5);
    list-style: disc;
  }
  .forutsetninger a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .datoer {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: var(--r-innfelt);
    font-size: 14px;
  }
  .beloepfelt,
  .begrunnelse {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .inndata {
    display: inline-flex;
    align-items: stretch;
    width: 220px;
    border: var(--control-border);
    border-radius: var(--r-felt);
  }
  .inndata:focus-within,
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .inndata input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: 0;
    text-align: right;
    font: 16px var(--font-sans);
    font-variant-numeric: tabular-nums;
    color: var(--ink);
    background: var(--surface);
    outline: none;
  }
  .kr {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-3);
    border-left: var(--rule);
    color: var(--ink-3);
  }
  textarea {
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: inherit;
    background: var(--surface);
    resize: vertical;
  }
  /* En melding om prøven, ikke en feil og ikke et utkast: blekk i kanten, ingen farge (#1391). */
  .ikke-stoettet {
    display: flex;
    gap: var(--spacing-3);
    margin: var(--spacing-5) var(--spacing-6);
    padding: var(--spacing-4);
    border-left: 3px solid var(--ink);
    background: var(--surface-inset);
    color: var(--ink);
  }
  .ikke-stoettet :global(svg) {
    flex: none;
    margin-top: 3px;
  }
  .mangler {
    margin: var(--spacing-5) var(--spacing-6) 0;
    padding: var(--spacing-4);
    border-left: 3px solid var(--danger);
    background: var(--danger-bg);
  }
  .mangler:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .mangler p {
    font-weight: 600;
  }
  .mangler ul {
    margin-top: var(--spacing-2);
    padding-left: var(--spacing-5);
    list-style: disc;
  }
  .mangler a {
    color: var(--ink);
    text-underline-offset: 3px;
  }
  .mangler a:hover {
    text-decoration-thickness: 2px;
  }
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  .inndata.ugyldig,
  textarea.ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .skjemafot {
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
    border-top: var(--rule);
  }
  .bekreft {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-2) 0;
  }
  .bekreft p:focus {
    outline: none;
  }
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }
  .innebrev {
    padding: var(--spacing-4) var(--spacing-4) 0;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .num {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .handling {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  /* Over tidslinja, som ruller under: den åpne chevronen er rotert og ville ellers ligget
     øverst og tatt klikkene i panelet. */
  .feste.fast {
    position: sticky;
    top: var(--spacing-4);
    z-index: 1;
  }
  /* Lesing ved siden av: rammen følger brevet og er høyst like høy som vinduet under
     topplinja. Et lengre brev ruller i den, og «Se brevet før sending» står fast i bunnen
     (oppdragsgiver 29.10, #1391). */
  .leseramme {
    position: sticky;
    top: var(--spacing-4);
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - var(--mockup-topbar-height) - var(--spacing-10));
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    overflow: hidden;
  }
  .lesetittel {
    padding: var(--spacing-3) var(--spacing-5);
    border-bottom: var(--rule);
    font-size: 16px;
    font-weight: 600;
  }
  .lesetittel .dempet {
    font-weight: 400;
  }
  .brevrulle {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .brevrulle:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: -2px;
  }
  .lesebunn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
    border-top: var(--rule);
  }
  .kompakt {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface);
    border-top: var(--rule-strong);
  }
  .snarveier {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2) var(--spacing-5);
  }
  .poster {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .poster.flere {
    border-top: var(--rule-strong);
  }
  .poster.flere > .post {
    border-bottom: var(--rule);
  }
  .post {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .poster.flere > .post.aapen {
    padding: var(--spacing-4) 0 var(--spacing-4) var(--spacing-4);
    border-left: 3px solid var(--ink);
  }
  h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
  }
  .betegnelse {
    margin-right: var(--spacing-2);
    font-variant-numeric: tabular-nums;
  }
  .posthode {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  /* Den lukkede kravposten: post og krav til venstre, svaret slik det står i brevet i midten. */
  .postlinje {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr) auto;
    column-gap: var(--spacing-4);
    row-gap: var(--spacing-2);
    align-items: start;
    padding: var(--spacing-3) 0;
  }
  .postnavn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .lest {
    font-size: 14px;
    color: var(--ink-2);
  }
  .lest ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .postfot {
    display: flex;
    justify-content: flex-end;
  }
  @media (max-width: 640px) {
    .postlinje {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .lest {
      grid-column: 1;
      grid-row: 2;
    }
    .postlinje :global(button) {
      grid-column: 2;
      grid-row: 1;
    }
  }
</style>
