<!--
  TEs krav om vederlagsjustering (BF-14, prototype v4, økt 3 i #1663). Skjemaet har kravpostene,
  den særskilte vederlagsjusteringen, «Varslene» som følger av postene, og forbeholdet. Panelet
  til høyre har punktene og summene (U-15, U-16), og tidslinja står under (U-17).

  Kravpostene står som leselinjer, og én er åpen om gangen (`system.md`, «Én leselinje til du
  åpner»). Et nytt krav begynner med én åpen post, og en ny versjon har alle postene som ikke er
  trukket (KA-U56, D-4). Kjernen gir betegnelsen på en ny post (KA-U53), sier om kravet er
  varselet for en post (VS-U49) og lager brevet. «Se brevet før sending» er alltid aktiv, og det
  som mangler, står ved feltet og øverst (MM-U32).
-->
<script lang="ts">
  import { FileText } from 'lucide-svelte';
  import { tick, untrack } from 'svelte';
  import { kroner } from '$kjerne/frosset/tekst';
  import { krevdProduktivitet, kravposterI } from '$kjerne/spor/vederlag/format';
  import type { Kravpost } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import {
    varseletFoerKravet,
    varslenePerKravpost,
    varsleneISaken,
    varslerUtenKravpost,
    type Varselet,
  } from '$lib/kjernesak/vederlagskrav';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Filvalg from './Filvalg.svelte';
  import Knapp from './Knapp.svelte';
  import Kravpunkter from './Kravpunkter.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import Valg from './Valg.svelte';
  import {
    brevene,
    datoerISporet,
    forholdetISaken,
    klarOverForholdet,
    type Brevet,
  } from './lesing';
  import { brevhode, brevtittel, dato, kalenderdager, KRAVSKJEMA } from './tekster';
  import {
    beloepet,
    fordelingenPaaPns,
    fraKravpost,
    gjeldendeVarselvalg,
    manglerIKravet,
    nyKravpost,
    postene,
    startvalg,
    summene,
    trukneKravposter,
    vederlagskravet,
    vedleggIKravet,
    tomtVarselvalg,
    type Kravpostvalg,
    type Kravvalg,
  } from './vederlagskrav';

  let {
    kjernesak,
    u,
    valg = $bindable(null),
    onbrevkontroll,
    onforkast,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når TE går til brevkontrollen og tilbake. `null` fyller skjemaet fra saken. */
    valg?: Kravvalg | null;
    onbrevkontroll: (k: {
      kommando: Record<string, unknown>;
      tekst: string[];
      utdypning?: string;
      detteSender: { tekst: string; lag: string | null }[];
      virkninger: string[];
      merking: string | null;
      deresRef: string[];
      tittel: string | null;
      vedlegg: ReturnType<typeof vedleggIKravet>;
    }) => void;
    onforkast: () => void;
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;
  type Beloepsfelt = 'beloep' | 'anslag' | 'overslag';

  // svelte-ignore state_referenced_locally
  if (valg === null) valg = startvalg(u);
  const v = $derived(valg!);

  const forrige = $derived(u.spor.vederlag.gjeldendeKrav);
  const forrigePoster = $derived(
    new Map((forrige ? kravposterI(forrige) : []).map((p) => [p.id, p]))
  );
  const alleBrev = $derived(brevene(u));
  const brevMed = (dokument: string | null | undefined): Brevet | null =>
    dokument ? (alleBrev.find((b) => b.id === dokument) ?? null) : null;
  const kravbrevet = $derived(brevMed(forrige?.dokument));
  const svarbrevet = $derived(brevMed(u.spor.vederlag.gjeldendeSvar?.dokument));
  const paaberopelsen = $derived(brevMed(u.spor.forhold.gjeldendeKrav?.dokument));
  const forholdet = $derived(forholdetISaken(u));
  // Brevet TE leser ved siden av: svaret på forrige krav, ellers påberopelsen.
  const lesbart = $derived(svarbrevet ?? kravbrevet ?? paaberopelsen);
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('vederlag')));

  const med = $derived(postene(v));
  const varslene = $derived(
    varslenePerKravpost(
      u,
      med.map((p) => ({
        id: p.id ?? undefined,
        oppgjoersform: p.form ?? 'tilbud',
        justert: p.justert ?? undefined,
      }))
    )
  );
  const varselPerPost = $derived(new Map(med.map((p, i) => [p.noekkel, varslene[i] ?? null])));
  const varselFor = (p: Kravpostvalg): Varselet | null => varselPerPost.get(p.noekkel) ?? null;
  const kommando = $derived(vederlagskravet(v, varslene));
  const vedlegg = $derived(vedleggIKravet(v));

  // Betegnelsen kjernen gir en ny post (KA-U53), lest av et utkast med de samme postene. Den
  // følger bare postenes id, rekkefølgen og trekket, så utkastet lages ikke ved hvert tastetrykk.
  const postrekka = $derived(
    JSON.stringify([med.map((p) => p.id), v.poster.filter((p) => p.trukket).map((p) => p.id)])
  );
  const betegnelsene = $derived.by(() => {
    const [ider, trekker] = JSON.parse(postrekka) as [(string | null)[], string[]];
    const skisse = {
      type: 'krav',
      spor: 'vederlag',
      innhold: {
        ...(trekker.length ? { trekker } : {}),
        kravposter: ider.map((id) => ({
          ...(id ? { id } : {}),
          beskrivelse: 'x',
          oppgjoersform: 'tilbud',
          beloep: 1,
        })),
      },
    };
    const etter = ider.length ? kjernesak.forhaandsvist(skisse) : null;
    const nye = etter?.spor.vederlag.gjeldendeKrav;
    const lest = nye ? kravposterI(nye) : [];
    return new Map(med.map((p, i) => [p.noekkel, lest[i]?.betegnelse ?? null]));
  });
  const navnet = (p: Kravpostvalg) =>
    p.betegnelse ?? betegnelsene.get(p.noekkel) ?? KRAVSKJEMA.nyBetegnelse;

  const utkastbrev = $derived.by(() => {
    const b = kjernesak.brev(kommando, vedlegg);
    return b && 'tekst' in b ? b : null;
  });

  // Én kravpost er åpen om gangen; en ny, tom post står åpen.
  let aapen = $state<string | null>(
    untrack(() => v.poster.find((p) => p.id === null && !p.beskrivelse)?.noekkel ?? null)
  );
  let aapentVarsel = $state<string | null>(null);

  async function aapne(p: Kravpostvalg, felt = 'beskrivelse') {
    aapen = p.noekkel;
    await tick();
    document.getElementById(id(`${felt}-${p.noekkel}`))?.focus();
  }
  async function lukk(p: Kravpostvalg) {
    aapen = null;
    await tick();
    document.getElementById(id(`endre-${p.noekkel}`))?.focus();
  }
  async function leggTil() {
    const p = nyKravpost(v);
    v.poster.push(p);
    await aapne(p);
  }
  async function taMedIgjen(q: Kravpost) {
    const p = fraKravpost(q);
    v.poster.push(p);
    await aapne(p);
  }
  async function fjernNy(p: Kravpostvalg) {
    v.poster = v.poster.filter((q) => q !== p);
    aapen = null;
    await tick();
    document.getElementById(id('legg-til'))?.focus();
  }
  async function trekk(p: Kravpostvalg) {
    p.trukket = true;
    aapen = null;
    await tick();
    document.getElementById(id(`endre-${p.noekkel}`))?.focus();
  }
  const trukne = $derived(trukneKravposter(u).filter((q) => !v.poster.some((p) => p.id === q.id)));

  // Det som mangler vises først når TE har prøvd å se brevet (MM-U32).
  const mangler = $derived(manglerIKravet(v, varslene, uid, navnet));
  let forsoekt = $state(false);
  const feil = (felt: string): string | null =>
    forsoekt ? (mangler.find((m) => m.felt === id(felt))?.ved ?? null) : null;
  let oppsummering = $state<HTMLElement | null>(null);
  let sendehindring = $state<string | null>(null);

  async function gaaTil(m: { felt: string; post: string | null }, e: Event) {
    if (m.post === null) return;
    const p = v.poster.find((q) => q.noekkel === m.post)!;
    const iVarselet = /-(varsel|type|dato|dokument)-/.test(m.felt);
    e.preventDefault();
    if (iVarselet) aapentVarsel = p.noekkel;
    else aapen = p.noekkel;
    await tick();
    document.getElementById(m.felt)?.focus();
  }

  // Leselinja: hva posten krever, og hva som er endret fra forrige krav.
  const beloepTekst = (t: string) => {
    const b = beloepet(t);
    return b === undefined ? null : kroner(b);
  };
  const formlinje = (p: Kravpostvalg) => (p.form === null ? '–' : KRAVSKJEMA.formnavn[p.form]);
  function formdetalj(p: Kravpostvalg): string | null {
    if (p.form === 'enhetspriser') {
      const a = beloepTekst(p.anslag);
      return (
        [p.justert ? KRAVSKJEMA.justerte : null, a ? KRAVSKJEMA.anslaatt(a) : null]
          .filter(Boolean)
          .join(' · ') || null
      );
    }
    if (p.form === 'regningsarbeid') {
      const o = beloepTekst(p.overslag);
      return o ? KRAVSKJEMA.overslaget(o) : null;
    }
    return null;
  }
  function beloeplinje(p: Kravpostvalg): string {
    if (p.trukket) return KRAVSKJEMA.trekkes;
    if (p.form === 'tilbud') return beloepTekst(p.beloep) ?? '–';
    return p.form === null ? '–' : KRAVSKJEMA.utenBeloep;
  }
  function endringen(p: Kravpostvalg): string | null {
    if (!kravbrevet) return null;
    if (!p.id || !forrigePoster.has(p.id)) return p.id ? null : KRAVSKJEMA.ny;
    const foer = fraKravpost(forrigePoster.get(p.id)!);
    const verdi = (q: Kravpostvalg) =>
      q.form === 'tilbud'
        ? (beloepTekst(q.beloep) ?? '–')
        : [q.form ? KRAVSKJEMA.formnavn[q.form] : '–', formdetalj(q)].filter(Boolean).join(', ');
    const a = verdi(foer);
    const b = verdi(p);
    return a === b ? null : KRAVSKJEMA.endretFra(kravbrevet, a, b);
  }

  // Varslene: § 34.1.2 for hele kravet, § 34.1.3 med den særskilte posten, én rad per kravpost
  // som trenger et varsel, og varslene i saken som ingen kravpost viser til (prototype v4, U-12).
  const varselI = (dokument: string | null) => {
    const b = brevMed(dokument);
    if (!b) return KRAVSKJEMA.kravetErVarselet;
    return b.art === 'krav' ? KRAVSKJEMA.gittMedKravet(b) : KRAVSKJEMA.gittI(b);
  };
  const klarOver = $derived(klarOverForholdet(u));
  // Dagens dato i norsk tid, som i `NySak.svelte`.
  const iDag = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
  const vederlagsvarselet = $derived(varseletFoerKravet(u, '34.1.2'));
  const saerskiltvarselet = $derived(varseletFoerKravet(u, '34.1.3'));
  const utenKravpost = $derived(varslerUtenKravpost(u));
  const iSaken = $derived(varsleneISaken(u));
  function postvarseltekst(p: Kravpostvalg, vs: Varselet): string {
    if (vs.art === 'gitt') return varselI(vs.dokument);
    if (vs.art === 'foer')
      return vs.varsel
        ? varselI(iSaken.find((x) => x.id === vs.varsel)?.dokument ?? null)
        : varselI(vs.krav);
    const valgt = gjeldendeVarselvalg(v, p);
    if (p.varsel.art === 'saken' && valgt.varsel)
      return varselI(iSaken.find((x) => x.id === valgt.varsel)?.dokument ?? null);
    if (p.varsel.art !== 'kravet' && valgt.art === 'dokument' && valgt.dato)
      return KRAVSKJEMA.gittIDokumentet(valgt.type, valgt.dato);
    return KRAVSKJEMA.kravetErVarselet;
  }
  const smaa = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const medDokument = (p: Kravpostvalg) =>
    med.filter((q) => q !== p && q.varsel.art === 'dokument' && varselFor(q)?.art === 'kravet');
  const grense = {
    lastOpp: (fil: File) => kjernesak.lastOppVedlegg(fil),
    // Et vedlegg i mellomlageret som ikke bindes av kravet, blir liggende til det ryddes.
    slett: async () => {},
  };

  const summer = $derived(summene(v));
  const pns = $derived(fordelingenPaaPns(v));
  const pnsOver = $derived(pns.filter((r) => r.faste + r.anslag > 300_000).map((r) => r.pns));
  const tilbud = $derived([
    ...med.filter((p) => p.form === 'tilbud').map(navnet),
    ...(v.saerskilt ? [KRAVSKJEMA.denSaerskilte] : []),
  ]);
  const regel = $derived(med.filter((p) => p.form && p.form !== 'tilbud').map(navnet));
  const trekkes = $derived(v.poster.filter((p) => p.trukket).map(navnet));
  const hvaKravetEr = $derived([
    ...(tilbud.length ? [KRAVSKJEMA.tilbudet(tilbud)] : []),
    ...(regel.length ? [KRAVSKJEMA.regelen(regel)] : []),
    ...(trekkes.length ? [KRAVSKJEMA.trekkesListe(trekkes)] : []),
  ]);
  const postvarsler = $derived(
    med.flatMap((p) => {
      const vs = varselFor(p);
      return vs ? [{ p, vs }] : [];
    })
  );
  const antallVarsler = $derived(1 + (v.saerskilt ? 1 : 0) + postvarsler.length);
  const medKravet = $derived(
    (vederlagsvarselet === null ? 1 : 0) +
      (v.saerskilt && saerskiltvarselet === null ? 1 : 0) +
      postvarsler.filter(
        ({ p, vs }) => vs.art === 'kravet' && gjeldendeVarselvalg(v, p).art === 'kravet'
      ).length
  );
  const punkter = $derived([
    {
      id: id('postene'),
      nummer: '1',
      tittel: KRAVSKJEMA.postene,
      status: KRAVSKJEMA.antallPoster(med.length),
      poster: v.poster.map((p) => ({
        noekkel: p.noekkel,
        betegnelse: navnet(p),
        beskrivelse: p.beskrivelse || KRAVSKJEMA.nyPost,
        verdi: beloeplinje(p),
        trukket: p.trukket,
      })),
    },
    ...(v.saerskilt
      ? [
          {
            id: id('saerskilt-seksjon'),
            nummer: '2',
            tittel: KRAVSKJEMA.saerskilt,
            status: beloepTekst(v.saerskilt.beloep) ?? '–',
          },
        ]
      : []),
    {
      id: id('varslene'),
      nummer: v.saerskilt ? '3' : '2',
      tittel: KRAVSKJEMA.varslene,
      status: KRAVSKJEMA.antallVarsler(antallVarsler, medKravet),
    },
    {
      id: id('forbehold'),
      nummer: v.saerskilt ? '4' : '3',
      tittel: KRAVSKJEMA.forbeholdPunkt,
      status: v.forbehold.trim() ? KRAVSKJEMA.skrevet : KRAVSKJEMA.ikkeSkrevet,
    },
  ]);

  // Datoene TE fyller ut, i tidslinja (U-17).
  const utfylt = $derived([
    ...med.flatMap((p) => {
      const valgt = gjeldendeVarselvalg(v, p);
      return varselFor(p)?.art === 'kravet' && p.varsel.art === 'dokument' && valgt.dato
        ? [
            {
              naar: valgt.dato,
              hva: KRAVSKJEMA.tidslinjeVarselet(navnet(p)),
              kilde: KRAVSKJEMA.oppgisIKravet,
            },
          ]
        : [];
    }),
    { naar: iDag, hva: KRAVSKJEMA.tidslinjeSendes, kilde: KRAVSKJEMA.naarDuSender },
  ]);

  const detteSender = $derived([
    ...(med.length ? [{ tekst: KRAVSKJEMA.detteSender.poster(med.length), lag: null }] : []),
    // Brevkontrollen setter punktum selv.
    ...hvaKravetEr.map((tekst) => ({ tekst: tekst.replace(/\.$/, ''), lag: null })),
  ]);

  async function seBrevet() {
    sendehindring = null;
    if (mangler.length) {
      forsoekt = true;
      await tick();
      oppsummering?.focus();
      return;
    }
    const b = kjernesak.brev(kommando, vedlegg, true);
    if (!b || !('tekst' in b) || !b.tekst) {
      sendehindring = brevaarsak(b) ?? KRAVSKJEMA.kanIkkeLages;
      await tick();
      document.getElementById(id('hindring'))?.focus();
      return;
    }
    onbrevkontroll({
      kommando,
      tekst: b.tekst,
      utdypning: kommando.utdypning,
      detteSender,
      virkninger: [],
      merking: b.merking,
      deresRef: b.deresRef,
      tittel: b.brevtittel,
      vedlegg,
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
    document.getElementById(id('forkast'))?.focus();
  }

  // Brevet leses ved siden av skjemaet, og på smal skjerm i skjemaet (`Vederlagssvar`).
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

  // Panelet følger rullingen bare når det får plass i vinduet, så «Se brevet før sending» alltid
  // kan nås (U-16).
  let panel = $state<HTMLElement | null>(null);
  let faarPlass = $state(true);
  $effect(() => {
    const el = panel;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const maal = () => (faarPlass = el.offsetHeight + 32 <= window.innerHeight);
    const ro = new ResizeObserver(maal);
    ro.observe(el);
    window.addEventListener('resize', maal);
    maal();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', maal);
    };
  });
</script>

{#snippet lest(b: Brevet, innfelt: boolean)}
  <Brev
    avsender={b.avsender}
    sak={kjernesak.saksbilde?.tittel ?? ''}
    merking={b.merking}
    deresRef={b.deresRef}
    dato={dato(b.registrert)}
    tittel={brevtittel(b)}
    avsnitt={b.avsnitt ?? []}
    {innfelt}
  />
{/snippet}

{#snippet beloepsfelt(
  felt: string,
  etikett: string,
  hjelp: string,
  eier: Partial<Record<Beloepsfelt, string>>,
  noekkel: Beloepsfelt,
  paakrevd: boolean
)}
  {@const f = feil(felt)}
  <div class="felt">
    <label for={id(felt)}>{etikett}</label>
    <span class="hjelp" id={id(`${felt}-hjelp`)}>{hjelp}</span>
    <span class="inndata" class:ugyldig={f}>
      <input
        id={id(felt)}
        inputmode="decimal"
        bind:value={eier[noekkel]}
        aria-required={paakrevd ? 'true' : undefined}
        aria-describedby={f ? `${id(`${felt}-hjelp`)} ${id(`${felt}-feil`)}` : id(`${felt}-hjelp`)}
        aria-invalid={f ? 'true' : undefined}
      />
      <span class="kr" aria-hidden="true">kr</span>
    </span>
    {#if f}<p class="feilmelding" id={id(`${felt}-feil`)}>{f}</p>{/if}
  </div>
{/snippet}

{#snippet aapenPost(p: Kravpostvalg)}
  {@const n = p.noekkel}
  {@const vs = varselFor(p)}
  {@const fBeskrivelse = feil(`beskrivelse-${n}`)}
  <div class="aapen">
    <h4>{navnet(p)} · {p.beskrivelse || KRAVSKJEMA.nyPost}</h4>
    <div class="felt">
      <label for={id(`beskrivelse-${n}`)}>{KRAVSKJEMA.beskrivelse}</label>
      <span class="hjelp" id={id(`beskrivelse-${n}-hjelp`)}>{KRAVSKJEMA.beskrivelseHjelp}</span>
      <input
        id={id(`beskrivelse-${n}`)}
        class="tekstfelt"
        class:ugyldig={fBeskrivelse}
        bind:value={p.beskrivelse}
        aria-required="true"
        aria-invalid={fBeskrivelse ? 'true' : undefined}
        aria-describedby={fBeskrivelse
          ? `${id(`beskrivelse-${n}-hjelp`)} ${id(`beskrivelse-${n}-feil`)}`
          : id(`beskrivelse-${n}-hjelp`)}
      />
      {#if fBeskrivelse}<p class="feilmelding" id={id(`beskrivelse-${n}-feil`)}>
          {fBeskrivelse}
        </p>{/if}
    </div>
    <Valg
      navn={id(`form-${n}`)}
      spoersmaal={KRAVSKJEMA.form}
      valg={KRAVSKJEMA.former}
      stablet
      bind:verdi={p.form}
      feil={feil(`form-${n}`)}
    />
    {#if p.form === 'tilbud'}
      {@render beloepsfelt(
        `beloep-${n}`,
        KRAVSKJEMA.beloep,
        KRAVSKJEMA.beloepHjelp,
        p,
        'beloep',
        true
      )}
    {:else if p.form === 'enhetspriser'}
      <Valg
        navn={id(`justert-${n}`)}
        spoersmaal={KRAVSKJEMA.justert}
        valg={KRAVSKJEMA.justeringer}
        stablet
        bind:verdi={p.justert}
        feil={feil(`justert-${n}`)}
      />
      {@render beloepsfelt(
        `anslag-${n}`,
        KRAVSKJEMA.anslag,
        KRAVSKJEMA.anslagHjelp,
        p,
        'anslag',
        false
      )}
    {:else if p.form === 'regningsarbeid'}
      {@render beloepsfelt(
        `overslag-${n}`,
        KRAVSKJEMA.overslag,
        KRAVSKJEMA.overslagHjelp,
        p,
        'overslag',
        false
      )}
    {/if}
    {#if vs}
      <p class="varsellinje">
        {KRAVSKJEMA.varsellinje(vs.hjemmel, smaa(postvarseltekst(p, vs)))}
        <a href={`#${id(`varselrad-${n}`)}`}>{KRAVSKJEMA.tilVarslene}</a>
      </p>
    {/if}
    <div class="felt">
      <label for={id(`pns-${n}`)}>{KRAVSKJEMA.pns}</label>
      <span class="hjelp" id={id(`pns-${n}-hjelp`)}>{KRAVSKJEMA.pnsHjelp}</span>
      <input
        id={id(`pns-${n}`)}
        class="kort-felt"
        bind:value={p.pns}
        aria-describedby={id(`pns-${n}-hjelp`)}
      />
    </div>
    <div class="postfot">
      {#if p.id && forrigePoster.has(p.id)}
        <Knapp variant="lenke" onclick={() => trekk(p)}>{KRAVSKJEMA.trekk(navnet(p))}</Knapp>
      {:else}
        <Knapp variant="lenke" onclick={() => fjernNy(p)}>{KRAVSKJEMA.fjernNy}</Knapp>
      {/if}
      <Knapp onclick={() => lukk(p)}>{KRAVSKJEMA.ferdig}</Knapp>
    </div>
  </div>
{/snippet}

{#snippet postlinje(p: Kravpostvalg)}
  {@const vs = varselFor(p)}
  {@const endret = endringen(p)}
  <div class="linje" class:trukket={p.trukket}>
    <h4 class="navn">
      <span class="betegnelse">{navnet(p)}</span>
      <span class="beskrivelse">{p.beskrivelse || KRAVSKJEMA.nyPost}</span>
    </h4>
    <p class="form">
      <span class="visually-hidden">{KRAVSKJEMA.kolonner[1]}:</span>
      {formlinje(p)}
      {#if formdetalj(p)}<span class="detalj">{formdetalj(p)}</span>{/if}
    </p>
    <p class="pns-celle">
      <span class="visually-hidden">{KRAVSKJEMA.kolonner[2]}:</span>{p.pns || '–'}
    </p>
    <p class="beloep-celle">
      <span class="visually-hidden">{KRAVSKJEMA.kolonner[3]}:</span>{beloeplinje(p)}
    </p>
    {#if p.trukket}
      <Knapp
        variant="lenke"
        id={id(`endre-${p.noekkel}`)}
        aria-label={KRAVSKJEMA.angreTrekk(navnet(p))}
        onclick={() => (p.trukket = false)}>{KRAVSKJEMA.angre}</Knapp
      >
    {:else}
      <Knapp
        variant="lenke"
        id={id(`endre-${p.noekkel}`)}
        aria-label={KRAVSKJEMA.endrePost(navnet(p))}
        onclick={() => aapne(p)}>{KRAVSKJEMA.endre}</Knapp
      >
    {/if}
    <div class="under">
      {#if p.trukket}
        <p>{KRAVSKJEMA.trekket(navnet(p))}</p>
      {:else}
        {#if endret}<p>{endret}</p>{/if}
        {#if vs && vs.art === 'kravet' && utenKravpost.some((x) => x.hjemmel === vs.hjemmel) && gjeldendeVarselvalg(v, p).art === 'kravet'}
          <p>
            {KRAVSKJEMA.utenKravpost(vs.hjemmel)}
            <a href={`#${id(`varselrad-${p.noekkel}`)}`}>{KRAVSKJEMA.seVarselet(navnet(p))}</a>
          </p>
        {/if}
      {/if}
    </div>
  </div>
{/snippet}

{#snippet varselvalgene(p: Kravpostvalg, hjemmel: string)}
  {@const n = p.noekkel}
  {@const valgt = gjeldendeVarselvalg(v, p)}
  {@const andre = medDokument(p)}
  {@const varsler = iSaken.filter((x) => x.hjemmel === hjemmel)}
  <div class="varselvalg" id={id(`varselvalg-${n}`)}>
    <Valg
      navn={id(`varsel-${n}`)}
      spoersmaal={KRAVSKJEMA.hvorGitt(navnet(p))}
      stablet
      valg={[
        { verdi: 'kravet', tekst: KRAVSKJEMA.varselvalg.kravet },
        ...(varsler.length ? [{ verdi: 'saken', tekst: KRAVSKJEMA.varselvalg.saken }] : []),
        { verdi: 'dokument', tekst: KRAVSKJEMA.varselvalg.dokument },
        ...andre.map((q) => ({
          verdi: `samme:${q.noekkel}`,
          tekst: KRAVSKJEMA.varselvalg.samme(navnet(q)),
        })),
      ]}
      bind:verdi={
        () => (p.varsel.art === 'samme' ? `samme:${p.varsel.som}` : p.varsel.art),
        (x) => {
          if (x === null) return;
          if (x.startsWith('samme:'))
            p.varsel = { ...tomtVarselvalg(), art: 'samme', som: x.slice(6) };
          else p.varsel = { ...p.varsel, art: x as 'kravet' | 'saken' | 'dokument', som: null };
        }
      }
      feil={p.varsel.art === 'samme' ? feil(`varsel-${n}`) : null}
    />
    {#if p.varsel.art === 'saken'}
      <div class="innrykk">
        <Valg
          navn={id(`varselet-${n}`)}
          spoersmaal={KRAVSKJEMA.hvilketVarsel}
          stablet
          valg={varsler.map((x) => {
            const b = brevMed(x.dokument);
            return { verdi: x.id, tekst: b ? KRAVSKJEMA.varseletI(b) : x.id };
          })}
          bind:verdi={p.varsel.varsel}
          feil={feil(`varsel-${n}`)}
        />
      </div>
    {:else if p.varsel.art === 'dokument'}
      {@const fDato = feil(`dato-${n}`)}
      <div class="innrykk">
        <Valg
          navn={id(`type-${n}`)}
          spoersmaal={KRAVSKJEMA.dokumenttype}
          valg={KRAVSKJEMA.dokumenttyper}
          stablet
          bind:verdi={p.varsel.type}
          feil={feil(`type-${n}`)}
        />
        <div class="felt">
          <label for={id(`dato-${n}`)}>{KRAVSKJEMA.dokumentdato}</label>
          <span class="hjelp" id={id(`dato-${n}-hjelp`)}>{KRAVSKJEMA.dokumentdatoHjelp}</span>
          <input
            id={id(`dato-${n}`)}
            type="date"
            class="datofelt"
            class:ugyldig={fDato}
            max={iDag}
            bind:value={p.varsel.dato}
            aria-required="true"
            aria-invalid={fDato ? 'true' : undefined}
            aria-describedby={fDato
              ? `${id(`dato-${n}-hjelp`)} ${id(`dato-${n}-feil`)}`
              : id(`dato-${n}-hjelp`)}
          />
          {#if fDato}<p class="feilmelding" id={id(`dato-${n}-feil`)}>{fDato}</p>{/if}
        </div>
        <Filvalg
          id={id(`dokument-${n}`)}
          etikett={KRAVSKJEMA.dokumentet}
          hjelp={KRAVSKJEMA.dokumentetHjelp}
          {grense}
          bind:vedlegg={p.varsel.vedlegg}
          feil={feil(`dokument-${n}`)}
        />
      </div>
    {/if}
    {#if valgt.art === 'dokument' && p.varsel.art === 'samme'}
      <p class="hjelp">{KRAVSKJEMA.sammeDokument(valgt.dato)}</p>
    {/if}
    <div class="postfot">
      <Knapp onclick={() => (aapentVarsel = null)}>{KRAVSKJEMA.ferdig}</Knapp>
    </div>
  </div>
{/snippet}

{#snippet sendeknapp()}
  <Knapp
    variant="primaer"
    onclick={seBrevet}
    aria-describedby={sendehindring ? id('hindring') : undefined}>{KRAVSKJEMA.seBrevet}</Knapp
  >
  {#if sendehindring}
    <Melding art="feil" levende={false} id={id('hindring')} tabindex="-1">{sendehindring}</Melding>
  {/if}
{/snippet}

<Arbeidsflate leser={leser && !smal}>
  {#snippet hoved()}
    <Utkastkort
      id={id('tittel')}
      tittel={utkastbrev
        ? brevhode({ merking: utkastbrev.merking, art: 'krav', brevtittel: utkastbrev.brevtittel })
        : KRAVSKJEMA.tittel}
      mottaker={KRAVSKJEMA.til}
    >
      {#if lesbart}
        <div class="grunnlag">
          <FileText size={16} aria-hidden="true" />
          <span>
            {#if kravbrevet}
              {KRAVSKJEMA.folgerOpp(kravbrevet, svarbrevet)}
            {:else if forholdet && paaberopelsen}
              {KRAVSKJEMA.forholdet(forholdet.navn, paaberopelsen)}
            {/if}
          </span>
          <Knapp
            variant="lenke"
            onclick={() => (leser = !leser)}
            aria-expanded={leser}
            aria-controls={id('lesebrev')}
          >
            {leser
              ? KRAVSKJEMA.lukkBrevet
              : smal
                ? KRAVSKJEMA.lesBrevetHer(lesbart)
                : KRAVSKJEMA.lesBrevet(lesbart)}
          </Knapp>
        </div>
        {#if leser && smal}
          <div class="innebrev" id={id('lesebrev')}>{@render lest(lesbart, false)}</div>
        {/if}
      {/if}

      {#if forsoekt && mangler.length}
        <div
          class="mangler"
          role="group"
          tabindex="-1"
          bind:this={oppsummering}
          aria-labelledby={id('mangler')}
        >
          <p id={id('mangler')}>{KRAVSKJEMA.mangler}</p>
          <ul>
            {#each mangler as m (m.felt)}
              <li><a href={`#${m.felt}`} onclick={(e) => gaaTil(m, e)}>{m.tekst}</a></li>
            {/each}
          </ul>
        </div>
      {/if}

      <section class="seksjon" id={id('postene')} aria-labelledby={id('postene-tittel')}>
        <div class="seksjonshode">
          <span class="nummer" aria-hidden="true">1</span>
          <h3 id={id('postene-tittel')}>{KRAVSKJEMA.postene}</h3>
          <span class="hjemmel">{KRAVSKJEMA.posteneHjemmel}</span>
        </div>
        <p class="intro">{KRAVSKJEMA.posteneIntro}</p>
        {#if v.poster.length}
          <div class="kolonner" aria-hidden="true">
            {#each KRAVSKJEMA.kolonner as k (k)}<span>{k}</span>{/each}
            <span></span>
          </div>
          <ul class="poster">
            {#each v.poster as p (p.noekkel)}
              <li class="post" class:er-aapen={aapen === p.noekkel && !p.trukket}>
                {#if aapen === p.noekkel && !p.trukket}
                  {@render aapenPost(p)}
                {:else}
                  {@render postlinje(p)}
                {/if}
              </li>
            {/each}
          </ul>
          <p class="sum">
            <span>{KRAVSKJEMA.sumFaste}</span>
            <span class="num">{kroner(summer.iKravpostene)}</span>
          </p>
        {/if}
        <div class="leggtil">
          <Knapp id={id('legg-til')} onclick={leggTil}>{KRAVSKJEMA.leggTil}</Knapp>
          {#each trukne as q (q.id)}
            <Knapp variant="lenke" onclick={() => taMedIgjen(q)}
              >{KRAVSKJEMA.taMedIgjen(q.betegnelse, q.beskrivelse)}</Knapp
            >
          {/each}
        </div>
        {#if feil('legg-til')}<p class="feilmelding">{feil('legg-til')}</p>{/if}
      </section>

      {#if v.saerskilt}
        {@const saerskilt = v.saerskilt}
        <section
          class="seksjon"
          id={id('saerskilt-seksjon')}
          aria-labelledby={id('saerskilt-tittel')}
        >
          <div class="seksjonshode">
            <span class="nummer" aria-hidden="true">2</span>
            <h3 id={id('saerskilt-tittel')}>{KRAVSKJEMA.saerskilt}</h3>
            <span class="hjemmel">{KRAVSKJEMA.saerskiltHjemmel}</span>
          </div>
          <p class="intro">{KRAVSKJEMA.saerskiltIntro}</p>
          {@render beloepsfelt(
            'saerskilt',
            KRAVSKJEMA.saerskiltBeloep,
            KRAVSKJEMA.saerskiltHjelp,
            saerskilt,
            'beloep',
            true
          )}
          <!-- En post fra forrige krav kan ikke tas ut uten et trekk kjernen ennå ikke har (spørsmål 3). -->
          {#if !forrige || krevdProduktivitet(forrige) === null}
            <div>
              <Knapp variant="lenke" onclick={() => (v.saerskilt = null)}
                >{KRAVSKJEMA.fjernSaerskilt}</Knapp
              >
            </div>
          {/if}
        </section>
      {:else}
        <section class="seksjon kompakt">
          <div>
            <Knapp onclick={() => (v.saerskilt = { beloep: '' })}
              >{KRAVSKJEMA.leggTilSaerskilt}</Knapp
            >
          </div>
        </section>
      {/if}

      <section class="seksjon" id={id('varslene')} aria-labelledby={id('varslene-tittel')}>
        <div class="seksjonshode">
          <span class="nummer" aria-hidden="true">{v.saerskilt ? 3 : 2}</span>
          <h3 id={id('varslene-tittel')}>{KRAVSKJEMA.varslene}</h3>
        </div>
        <p class="intro">{KRAVSKJEMA.varsleneIntro}</p>
        <div class="kolonner varselkolonner" aria-hidden="true">
          {#each KRAVSKJEMA.varselkolonner as k (k)}<span>{k}</span>{/each}
          <span></span>
        </div>
        <ul class="varsler">
          <li class="varselrad">
            <span class="punkt">34.1.2</span>
            <div class="hva">
              <h4>{KRAVSKJEMA.varselnavn['34.1.2']}</h4>
              <p class="dempet">{KRAVSKJEMA.gjelderHele}</p>
            </div>
            <div class="brevet">
              <span class="visually-hidden">{KRAVSKJEMA.varselkolonner[2]}:</span>
              <p>{varselI(vederlagsvarselet)}</p>
              {#if vederlagsvarselet === null && klarOver}
                <p class="dempet">
                  {KRAVSKJEMA.dagerEtterKlarOver(kalenderdager(klarOver.dato, iDag), klarOver.dato)}
                </p>
              {/if}
            </div>
          </li>
          {#if v.saerskilt}
            <li class="varselrad">
              <span class="punkt">34.1.3</span>
              <div class="hva">
                <h4>{KRAVSKJEMA.varselnavn['34.1.3']}</h4>
                <p class="dempet">{KRAVSKJEMA.gjelderSaerskilt}</p>
              </div>
              <div class="brevet">
                <span class="visually-hidden">{KRAVSKJEMA.varselkolonner[2]}:</span>
                <p>{varselI(saerskiltvarselet)}</p>
              </div>
            </li>
          {/if}
          {#each postvarsler as { p, vs } (p.noekkel)}
            <li class="varselrad" id={id(`varselrad-${p.noekkel}`)}>
              <span class="punkt">{vs.hjemmel}</span>
              <div class="hva">
                <h4>{KRAVSKJEMA.varselnavn[vs.hjemmel]}</h4>
                <p class="dempet">{KRAVSKJEMA.gjelderPost(navnet(p))}</p>
              </div>
              <div class="brevet">
                <span class="visually-hidden">{KRAVSKJEMA.varselkolonner[2]}:</span>
                <p>{postvarseltekst(p, vs)}</p>
                {#if vs.art === 'kravet' && gjeldendeVarselvalg(v, p).art === 'kravet' && utenKravpost.some((x) => x.hjemmel === vs.hjemmel)}
                  <p class="dempet">{KRAVSKJEMA.utenKravpost(vs.hjemmel)}</p>
                {/if}
              </div>
              {#if vs.art === 'kravet' && aapentVarsel !== p.noekkel}
                <Knapp
                  variant="lenke"
                  aria-label={KRAVSKJEMA.endreVarselet(navnet(p))}
                  onclick={async () => {
                    aapentVarsel = p.noekkel;
                    await tick();
                    document
                      .querySelector<HTMLInputElement>(
                        `#${CSS.escape(id(`varsel-${p.noekkel}`))} input`
                      )
                      ?.focus();
                  }}>{KRAVSKJEMA.endre}</Knapp
                >
              {/if}
              {#if vs.art === 'kravet' && aapentVarsel === p.noekkel}
                <div class="varselvalgene">{@render varselvalgene(p, vs.hjemmel)}</div>
              {/if}
            </li>
          {/each}
          {#each utenKravpost as x (x.id)}
            <li class="varselrad">
              <span class="punkt">{x.hjemmel}</span>
              <div class="hva">
                <h4>{KRAVSKJEMA.varselnavn[x.hjemmel]}</h4>
                <p class="dempet">{KRAVSKJEMA.ingenPostViserTil}</p>
              </div>
              <div class="brevet"><p>{varselI(x.dokument)}</p></div>
            </li>
          {/each}
        </ul>
      </section>

      <section class="seksjon" id={id('forbehold')}>
        <div class="felt">
          <label for={id('forbehold-felt')} class="h3">{KRAVSKJEMA.forbehold}</label>
          <span class="hjelp" id={id('forbehold-hjelp')}>{KRAVSKJEMA.forbeholdHjelp}</span>
          <textarea
            id={id('forbehold-felt')}
            rows="4"
            bind:value={v.forbehold}
            aria-describedby={id('forbehold-hjelp')}
          ></textarea>
        </div>
      </section>

      <div class="skjemafot">
        {#if bekreftForkast}
          <div class="bekreft" role="group" aria-labelledby={id('forkast-spoersmaal')}>
            <p id={id('forkast-spoersmaal')} tabindex="-1" bind:this={forkastSpoersmaal}>
              {KRAVSKJEMA.forkastSpoersmaal}
            </p>
            <div class="knapper">
              <Knapp onclick={onforkast}>{KRAVSKJEMA.forkastJa}</Knapp>
              <Knapp variant="lenke" onclick={behold}>{KRAVSKJEMA.behold}</Knapp>
            </div>
          </div>
        {:else}
          <Knapp variant="lenke" id={id('forkast')} onclick={spoerOmForkast}
            >{KRAVSKJEMA.forkast}</Knapp
          >
        {/if}
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    {#if leser && !smal && lesbart}
      <section class="leseramme" id={id('lesebrev')} aria-labelledby={id('lesetittel')}>
        <h2 class="lesetittel" id={id('lesetittel')}>
          {brevhode(lesbart)}
          <span class="dempet">· {lesbart.avsender} · {dato(lesbart.registrert)}</span>
        </h2>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="brevrulle" tabindex="0" role="region" aria-labelledby={id('lesetittel')}>
          {@render lest(lesbart, true)}
        </div>
        <div class="lesebunn">{@render sendeknapp()}</div>
      </section>
    {:else}
      <div class="feste" class:fast={faarPlass} bind:this={panel}>
        <Kravpunkter
          {punkter}
          faste={summer.faste}
          anslag={summer.anslag}
          {pns}
          {pnsOver}
          {hvaKravetEr}
          handling={sendeknapp}
        />
      </div>
      <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'vederlag')} {utfylt} />
    {/if}
  {/snippet}
</Arbeidsflate>

<style>
  .grunnlag {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface-inset);
    border-top: var(--rule);
    border-bottom: var(--rule);
    font-size: 14px;
  }
  .grunnlag > span {
    margin-right: auto;
  }
  .innebrev {
    padding: var(--spacing-4) var(--spacing-4) 0;
  }
  .seksjon {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
  }
  .seksjon.kompakt {
    padding-block: var(--spacing-4);
  }
  .seksjonshode {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
  }
  .nummer {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 24px;
    border: 1.5px solid var(--ink);
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    align-self: center;
  }
  h3,
  .h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .hjemmel {
    color: var(--ink-3);
    font-size: 12px;
  }
  .intro {
    color: var(--ink-2);
    font-size: 14px;
  }
  .kolonner,
  .linje {
    display: grid;
    grid-template-columns: minmax(0, 2.4fr) minmax(0, 1.3fr) 56px minmax(0, 1fr) 56px;
    column-gap: var(--spacing-4);
  }
  .kolonner {
    padding-bottom: var(--spacing-2);
    border-bottom: var(--rule-strong);
    color: var(--ink-3);
    font-size: 12px;
  }
  .kolonner span:nth-child(4) {
    text-align: right;
  }
  .varselkolonner {
    grid-template-columns: 56px minmax(0, 1.4fr) minmax(0, 1.6fr) 56px;
  }
  .poster,
  .varsler {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .post,
  .varselrad {
    border-bottom: var(--rule);
  }
  /* Midtstilt, så «Endre» med 44 px trykkflate står på linja den hører til. */
  .linje {
    align-items: center;
    row-gap: var(--spacing-1);
    padding: var(--spacing-3) 0;
  }
  .linje > p {
    font-size: 14px;
  }
  h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
  }
  .navn {
    display: flex;
    gap: var(--spacing-3);
  }
  .betegnelse,
  .num,
  .beloep-celle,
  .pns-celle,
  .punkt {
    font-variant-numeric: tabular-nums;
  }
  .beloep-celle {
    text-align: right;
    font-weight: 500;
    white-space: nowrap;
  }
  .detalj {
    display: block;
    color: var(--ink-3);
    font-size: 12px;
  }
  .linje.trukket .beskrivelse {
    text-decoration: line-through;
    color: var(--ink-3);
  }
  .under {
    grid-column: 1 / -1;
    padding-left: var(--spacing-8);
    color: var(--ink-3);
    font-size: 12px;
  }
  .under:empty {
    display: none;
  }
  .under a,
  .varsellinje a {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .post.er-aapen {
    padding: var(--spacing-4) 0 var(--spacing-4) var(--spacing-4);
    border-left: 3px solid var(--ink);
  }
  .aapen,
  .varselvalg {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  .aapen h4 {
    font-size: 16px;
  }
  .felt {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  label,
  .h3 {
    font-weight: 600;
    color: var(--ink);
  }
  .hjelp,
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .tekstfelt,
  .kort-felt,
  .datofelt,
  textarea {
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: 16px var(--font-sans);
    color: var(--ink);
    background: var(--surface);
  }
  .tekstfelt {
    width: 100%;
  }
  .kort-felt {
    width: 8em;
  }
  .datofelt {
    width: 12em;
  }
  textarea {
    padding: var(--spacing-3);
    resize: vertical;
  }
  .inndata {
    display: inline-flex;
    align-items: stretch;
    width: 220px;
    border: var(--control-border);
    border-radius: var(--r-felt);
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
  .inndata:focus-within,
  .tekstfelt:focus-visible,
  .kort-felt:focus-visible,
  .datofelt:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  .varsellinje {
    font-size: 14px;
    color: var(--ink-2);
  }
  .postfot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
  .varselvalg .postfot {
    justify-content: flex-end;
  }
  .sum {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 600;
  }
  .leggtil {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3) var(--spacing-5);
  }
  .varselrad {
    display: grid;
    grid-template-columns: 56px minmax(0, 1.4fr) minmax(0, 1.6fr) 56px;
    column-gap: var(--spacing-4);
    row-gap: var(--spacing-3);
    align-items: start;
    padding: var(--spacing-3) 0;
    font-size: 14px;
  }
  .punkt {
    font-weight: 600;
  }
  .brevet {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .brevet .dempet {
    font-size: 12px;
  }
  .varselvalgene {
    grid-column: 2 / -1;
  }
  /* Valgene under «gitt før» er rykket inn med en linje til venstre, ikke en ny flate (U-12). */
  .innrykk {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    padding-left: var(--spacing-4);
    border-left: 2px solid var(--rule-strong-color);
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
  .skjemafot {
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
  }
  .bekreft {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .bekreft p:focus {
    outline: none;
  }
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }
  .feste.fast {
    position: sticky;
    top: var(--spacing-4);
    z-index: 1;
  }
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
  @media (max-width: 640px) {
    .kolonner {
      display: none;
    }
    .linje,
    .varselrad {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .linje > p,
    .brevet,
    .hva,
    .varselvalgene {
      grid-column: 1;
    }
  }
</style>
