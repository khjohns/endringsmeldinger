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
  import { tick, untrack } from 'svelte';
  import { kroner } from '#kjerne/frosset/tekst.ts';
  import { krevdProduktivitet, kravposterI } from '#kjerne/spor/vederlag/format.ts';
  import type { Kravpost } from '#kjerne/typer.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { harTekst } from '#lib/kjernesak/brevtekst.ts';
  import {
    varseletFoerKravet,
    varslenePerKravpost,
    varsleneISaken,
    varslerUtenKravpost,
    type Varselet,
  } from '#lib/kjernesak/vederlagskrav.ts';
  import Brev from './Brev.svelte';
  import Brevlinje from './Brevlinje.svelte';
  import Feltetikett from './Feltetikett.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import { brevetVedSiden } from './medie.svelte';
  import Brevskjema from './Brevskjema.svelte';
  import Knapp from './Knapp.svelte';
  import Kravpunkter from './Kravpunkter.svelte';
  import Hjemmel from './Hjemmel.svelte';
  import Korrespondansen from './Korrespondansen.svelte';
  import type { Mangel } from './mangler';
  import { sendeflyt } from './sendeflyt.svelte';
  import Tallfelt from './Tallfelt.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Valg from './Valg.svelte';
  import { beloepet } from './kommandoer';
  import { vedleggsgrense, vedleggskart } from './nysak';
  import {
    korrespondansenoekkel,
    lagtTil as kommandoenLagtTil,
    type Korrespondansevalg,
  } from './korrespondansen';
  import Lagttilmerknader from './Lagttilmerknader.svelte';
  import {
    brevene,
    datoerISporet,
    forholdetISaken,
    klarOverForholdet,
    type Brevet,
    type Brevref,
  } from './lesing';
  import {
    brevhode,
    brevtittel,
    dagensDato,
    dato,
    kalenderdager,
    KRAVSKJEMA,
    LEGG_TIL,
  } from './tekster';
  import {
    PNS_GRENSE,
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
    lagtTil = null,
    onendre = () => {},
    onlagttil = () => {},
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når TE går til brevkontrollen og tilbake. `null` fyller skjemaet fra saken. */
    valg?: Kravvalg | null;
    onbrevkontroll: (k: TilBrevkontrollen & { vedlegg: ReturnType<typeof vedleggIKravet> }) => void;
    onforkast: () => void;
    onvedsiden?: (vedSiden: boolean) => void;
    /**
     * Korrespondansen kravet legges til fra (OV-U80, OV-U98), eller `null` for et krav sendt fra
     * løsningen. Kravet har da ikke noe forbehold (OV-U80).
     */
    lagtTil?: Korrespondansevalg | null;
    /** Tilbake til korrespondansen. */
    onendre?: () => void;
    /** Kravet er lagt til. */
    onlagttil?: () => void;
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
  const vedlegg = $derived(vedleggIKravet(v, varslene));
  const varselkolonner = $derived(
    lagtTil ? KRAVSKJEMA.varselkolonnerLagtTil : KRAVSKJEMA.varselkolonner
  );
  const kommandoLagtTil = $derived(lagtTil ? kommandoenLagtTil(kommando, lagtTil) : null);
  const vedleggLagtTil = $derived(new Map([...vedlegg, ...vedleggskart(lagtTil?.vedlegg ?? [])]));

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
    return harTekst(b) ? b : null;
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
  // Den særskilte vederlagsjusteringen har en leselinje som kravpostene, og står åpen når den er ny (#1827).
  let saerskiltAapen = $state(untrack(() => v.saerskilt !== null && !v.saerskilt.beloep));
  async function aapneSaerskilt() {
    saerskiltAapen = true;
    await tick();
    document.getElementById(id('saerskilt'))?.focus();
  }
  async function lukkSaerskilt() {
    saerskiltAapen = false;
    await tick();
    document.getElementById(id('endre-saerskilt'))?.focus();
  }
  async function leggTilSaerskilt() {
    v.saerskilt = { beloep: '' };
    await aapneSaerskilt();
  }
  // KA-U83: posten fra forrige versjon trekkes, og trekket kan angres med beløpet den hadde.
  async function trekkSaerskilt() {
    v.saerskilt = null;
    v.trekkerSaerskilt = true;
    saerskiltAapen = false;
    await tick();
    document.getElementById(id('angre-saerskilt'))?.focus();
  }
  async function angreSaerskilt() {
    v.trekkerSaerskilt = false;
    v.saerskilt = startvalg(u).saerskilt;
    await tick();
    document.getElementById(id('endre-saerskilt'))?.focus();
  }
  async function fjernSaerskilt() {
    v.saerskilt = null;
    saerskiltAapen = false;
    await tick();
    document.getElementById(id('legg-til-saerskilt'))?.focus();
  }
  const trukne = $derived(trukneKravposter(u).filter((q) => !v.poster.some((p) => p.id === q.id)));

  // Det som mangler vises først når TE har prøvd å se brevet (MM-U32).
  const mangler = $derived(manglerIKravet(v, varslene, uid, navnet));
  const flyt = sendeflyt(() => kjernesak, id('hindring'));
  const feil = (felt: string): string | null => flyt.feil(mangler.find((m) => m.felt === id(felt)));
  let oppsummering = $state<HTMLElement | null>(null);

  async function gaaTil(m: Mangel, e: Event) {
    if (m.felt === id('saerskilt')) {
      e.preventDefault();
      await aapneSaerskilt();
      return;
    }
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
    return endretFra(kravbrevet, verdi(foer), verdi(p));
  }
  const endretFra = (brev: Brevref, foer: string, naa: string) =>
    foer === naa ? null : KRAVSKJEMA.endretFra(brev, foer, naa);
  const saerskiltBeloep = $derived(v.saerskilt ? (beloepTekst(v.saerskilt.beloep) ?? '–') : '–');
  const saerskiltFoer = $derived(forrige ? (startvalg(u).saerskilt?.beloep ?? null) : null);
  const saerskiltEndret = $derived.by(() => {
    if (!kravbrevet || !v.saerskilt) return null;
    if (saerskiltFoer === null) return KRAVSKJEMA.ny;
    return endretFra(kravbrevet, beloepTekst(saerskiltFoer) ?? '–', saerskiltBeloep);
  });

  // Varslene: § 34.1.2 for hele kravet, § 34.1.3 med den særskilte posten, én rad per kravpost
  // som trenger et varsel, og varslene i saken som ingen kravpost viser til (prototype v4, U-12).
  const varselI = (dokument: string | null) => {
    const b = brevMed(dokument);
    if (!b) return KRAVSKJEMA.gisIBrevet;
    return b.art === 'krav' ? KRAVSKJEMA.gittMedKravet(b) : KRAVSKJEMA.gittI(b);
  };
  const klarOver = $derived(klarOverForholdet(u));
  const iDag = dagensDato();
  const vederlagsvarselet = $derived(varseletFoerKravet(u, '34.1.2'));
  const saerskiltvarselet = $derived(varseletFoerKravet(u, '34.1.3'));
  // Et varsel TE velger for en post i skjemaet, står ved posten og ikke som et varsel uten post.
  const utenKravpost = $derived(
    varslerUtenKravpost(u).filter(
      (x) =>
        !med.some(
          (p) =>
            varselFor(p)?.art === 'kravet' && p.varsel.art === 'saken' && p.varsel.varsel === x.id
        )
    )
  );
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
    return KRAVSKJEMA.gisIBrevet;
  }
  const smaa = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const medDokument = (p: Kravpostvalg) =>
    med.filter((q) => q !== p && q.varsel.art === 'dokument' && varselFor(q)?.art === 'kravet');
  const grense = vedleggsgrense((fil) => kjernesak.lastOppVedlegg(fil));

  const summer = $derived(summene(v));
  const pns = $derived(fordelingenPaaPns(v));
  const pnsOver = $derived(pns.filter((r) => r.faste + r.anslag > PNS_GRENSE).map((r) => r.pns));
  const tilbud = $derived([
    ...med.filter((p) => p.form === 'tilbud').map(navnet),
    ...(v.saerskilt ? [KRAVSKJEMA.denSaerskilte] : []),
  ]);
  const regel = $derived(med.filter((p) => p.form && p.form !== 'tilbud').map(navnet));
  const trekkes = $derived([
    ...v.poster.filter((p) => p.trukket).map(navnet),
    ...(v.trekkerSaerskilt && !v.saerskilt ? [KRAVSKJEMA.denSaerskilte] : []),
  ]);
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
  const iBrevet = $derived(
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
        anker: id(`post-${p.noekkel}`),
        betegnelse: navnet(p),
        beskrivelse: p.beskrivelse || KRAVSKJEMA.nyPost,
        // Panelet viser beløpet eller oppgjørsformen (U-15).
        verdi:
          !p.trukket && p.form && p.form !== 'tilbud'
            ? KRAVSKJEMA.formnavn[p.form]
            : beloeplinje(p),
        trukket: p.trukket,
      })),
    },
    ...(v.saerskilt
      ? [
          {
            id: id('saerskilt-seksjon'),
            nummer: '2',
            tittel: KRAVSKJEMA.saerskilt,
            status: saerskiltBeloep,
          },
        ]
      : []),
    {
      id: id('varslene'),
      nummer: v.saerskilt ? '3' : '2',
      tittel: KRAVSKJEMA.varslene,
      status: KRAVSKJEMA.antallVarsler(antallVarsler, iBrevet, !!lagtTil),
    },
    // OV-U80: et krav lagt til har ikke noe forbehold.
    ...(lagtTil
      ? []
      : [
          {
            id: id('forbehold'),
            nummer: v.saerskilt ? '4' : '3',
            tittel: KRAVSKJEMA.forbeholdPunkt,
            status: v.forbehold.trim() ? KRAVSKJEMA.skrevet : KRAVSKJEMA.ikkeSkrevet,
          },
        ]),
  ]);

  // Punktet i panelet for avsnittet du står i (U-15 i BF-14, `aria-current`): det siste avsnittet
  // som har passert en linje 30 % ned i vinduet, eller det siste når rullingen er i bunnen. Rullingen
  // fanges på `document` i capture-fasen, så den teller både når dokumentet ruller og når et indre
  // element med skjemaet gjør det. Lytteren lages på nytt bare når avsnittene endres.
  const punktider = $derived(punkter.map((p) => p.id).join(' '));
  let aktivtPunkt = $state<string | null>(null);
  $effect(() => {
    const ider = punktider.split(' ');
    let rulleflate: Element | null = document.scrollingElement;
    const finn = () => {
      const linje = window.innerHeight * 0.3;
      let valgt = ider[0] ?? null;
      for (const x of ider) {
        const el = document.getElementById(x);
        if (el && el.getBoundingClientRect().top <= linje) valgt = x;
      }
      const r = rulleflate;
      if (r && r.scrollTop > 0 && r.scrollTop + r.clientHeight >= r.scrollHeight - 1)
        valgt = ider.at(-1) ?? valgt;
      aktivtPunkt = valgt;
    };
    let ramme = 0;
    // Bare rullingen av en flate som har skjemaet, teller: ikke brevet ved siden av eller et felt.
    const planlegg = (e?: Event) => {
      if (e?.target instanceof Element) {
        const forste = document.getElementById(ider[0] ?? '');
        if (!forste || !e.target.contains(forste)) return;
        rulleflate = e.target;
      } else if (e?.target === document) rulleflate = document.scrollingElement;
      cancelAnimationFrame(ramme);
      ramme = requestAnimationFrame(finn);
    };
    // Et klikk i panelet som ikke ruller, fordi siden er kort, markerer punktet det fører til.
    const valgtIPanelet = () => {
      let x = location.hash.slice(1);
      try {
        x = decodeURIComponent(x);
      } catch {
        return;
      }
      const maal = document.getElementById(x);
      const punkt = maal && ider.find((i) => document.getElementById(i)?.contains(maal));
      if (punkt) aktivtPunkt = punkt;
    };
    finn();
    document.addEventListener('scroll', planlegg, { capture: true, passive: true });
    window.addEventListener('resize', planlegg);
    window.addEventListener('hashchange', valgtIPanelet);
    return () => {
      cancelAnimationFrame(ramme);
      document.removeEventListener('scroll', planlegg, { capture: true });
      window.removeEventListener('resize', planlegg);
      window.removeEventListener('hashchange', valgtIPanelet);
    };
  });

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

  function seBrevet() {
    return flyt.send({
      mangler: mangler.length ? () => oppsummering : null,
      lagtTil: kommandoLagtTil
        ? { kommando: kommandoLagtTil, vedlegg: vedleggLagtTil, ferdig: onlagttil }
        : null,
      kommando,
      vedlegg,
      kanIkkeLages: KRAVSKJEMA.kanIkkeLages,
      tilBrevkontrollen: (brevet) =>
        onbrevkontroll({ kommando, ...brevet, detteSender, virkninger: [], vedlegg }),
    });
  }

  // Brevet leses ved siden av skjemaet, og på smal skjerm i skjemaet (`Vederlagssvar`).
  let leser = $state(false);
  const side = brevetVedSiden(
    () => onvedsiden,
    () => leser
  );
</script>

{#snippet lest(b: Brevet, ramme: 'kant' | 'innfelt')}
  <Brev
    avsender={b.avsender}
    sak={kjernesak.saksbilde?.tittel ?? ''}
    merking={b.merking}
    deresRef={b.deresRef}
    dato={dato(b.registrert)}
    tittel={brevtittel(b)}
    avsnitt={b.avsnitt ?? []}
    {ramme}
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
  <Tallfelt
    id={id(felt)}
    {etikett}
    {hjelp}
    enhet="kr"
    inputmode="decimal"
    bind:verdi={() => eier[noekkel] ?? '', (t) => (eier[noekkel] = t)}
    feil={f}
    {paakrevd}
    valgfri={!paakrevd}
  />
{/snippet}

{#snippet aapenPost(p: Kravpostvalg)}
  {@const n = p.noekkel}
  {@const vs = varselFor(p)}
  {@const fBeskrivelse = feil(`beskrivelse-${n}`)}
  <div class="aapen">
    <h4>{navnet(p)} · {p.beskrivelse || KRAVSKJEMA.nyPost}</h4>
    <div class="felt">
      <Feltetikett for={id(`beskrivelse-${n}`)}>{KRAVSKJEMA.beskrivelse}</Feltetikett>
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
      <Feltetikett for={id(`pns-${n}`)} valgfri>{KRAVSKJEMA.pns}</Feltetikett>
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
    <!-- Under 640 px står PNS med etiketten, og cellen står ikke når PNS er tom (#1827). -->
    <p class="pns-celle" class:tom={!p.pns}>
      <span class="visually-hidden">{KRAVSKJEMA.kolonner[2]}:</span><span
        class="smal-etikett"
        aria-hidden="true">{KRAVSKJEMA.kolonner[2]}</span
      >{p.pns || '–'}
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
      lett
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
          lett
          valg={varsler.map((x) => {
            const b = brevMed(x.dokument);
            return { verdi: x.id, tekst: b ? KRAVSKJEMA.varseletI(b) : x.id };
          })}
          bind:verdi={p.varsel.varsel}
          feil={feil(`varsel-${n}`)}
        />
      </div>
    {:else if p.varsel.art === 'dokument'}
      <div class="innrykk">
        <Korrespondansen
          id={(felt) => id(korrespondansenoekkel('varsel', felt, n))}
          bind:valg={p.varsel}
          feil={(felt) => feil(korrespondansenoekkel('varsel', felt, n))}
          {grense}
          kapittelB
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

{#snippet lestInnfelt()}{@render lest(lesbart!, 'innfelt')}{/snippet}

<Brevskjema
  id={id('tittel')}
  tittel={utkastbrev && !lagtTil
    ? brevhode({ merking: utkastbrev.merking, art: 'krav', brevtittel: utkastbrev.brevtittel })
    : KRAVSKJEMA.tittel}
  mottaker={KRAVSKJEMA.til}
  {lagtTil}
  part={kjernesak.part}
  {onendre}
  {flyt}
  {mangler}
  manglerTittel={lagtTil ? LEGG_TIL.mangler : KRAVSKJEMA.mangler}
  ongaa={gaaTil}
  bind:oppsummering
  forkastTekst={KRAVSKJEMA.forkastTekst}
  {onforkast}
  knapp={{
    tekst: lagtTil ? LEGG_TIL.leggTilKravet : KRAVSKJEMA.seBrevet,
    onclick: seBrevet,
    opptatt: !!lagtTil && kjernesak.sender,
  }}
  lesing={side.vedSiden && lesbart
    ? { id: id('lesebrev'), brev: lesbart, innhold: lestInnfelt }
    : null}
>
  {#snippet oeverst()}
    {#if lesbart}
      <Brevlinje
        id={id('lesebrev')}
        bind:leser
        smal={side.smal}
        lenke={{
          les: KRAVSKJEMA.lesBrevet(lesbart),
          lesHer: KRAVSKJEMA.lesBrevetHer(lesbart),
          lukk: KRAVSKJEMA.lukkBrevet,
        }}
      >
        {#if kravbrevet}
          {KRAVSKJEMA.folgerOpp(kravbrevet, svarbrevet)}
        {:else if forholdet && paaberopelsen}
          {KRAVSKJEMA.forholdet(forholdet.navn, paaberopelsen)}
        {/if}
        {#snippet brev()}{@render lest(lesbart, 'kant')}{/snippet}
      </Brevlinje>
    {/if}
  {/snippet}
  {#snippet panel(sendeknapp)}
    <Kravpunkter
      {punkter}
      aktiv={aktivtPunkt}
      faste={summer.faste}
      anslag={summer.anslag}
      {pns}
      {pnsOver}
      {hvaKravetEr}
      handling={sendeknapp!}
      status={lagtTil ? LEGG_TIL.ikkeLagtTil : undefined}
    />
  {/snippet}
  {#snippet tidslinje()}
    <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'vederlag')} {utfylt} />
  {/snippet}

  <section
    class="seksjon"
    id={id('postene')}
    aria-labelledby={`${id('postene-tittel')} ${id('postene-hjemmel')}`}
  >
    <div class="seksjonshode">
      <span class="nummer" aria-hidden="true">1</span>
      <h3 id={id('postene-tittel')}>{KRAVSKJEMA.postene}</h3>
      <Hjemmel id={id('postene-hjemmel')} numre={KRAVSKJEMA.posteneHjemmel} />
    </div>
    <p class="intro">{KRAVSKJEMA.posteneIntro}</p>
    {#if v.poster.length}
      <div class="kolonner" aria-hidden="true">
        {#each KRAVSKJEMA.kolonner as k (k)}<span>{k}</span>{/each}
        <span></span>
      </div>
      <ul class="poster">
        {#each v.poster as p (p.noekkel)}
          <li
            class="post"
            id={id(`post-${p.noekkel}`)}
            class:er-aapen={aapen === p.noekkel && !p.trukket}
          >
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
      aria-labelledby={`${id('saerskilt-tittel')} ${id('saerskilt-hjemmel')}`}
    >
      <div class="seksjonshode">
        <span class="nummer" aria-hidden="true">2</span>
        <h3 id={id('saerskilt-tittel')}>{KRAVSKJEMA.saerskilt}</h3>
        <Hjemmel id={id('saerskilt-hjemmel')} numre={KRAVSKJEMA.saerskiltHjemmel} />
      </div>
      <p class="intro">{KRAVSKJEMA.saerskiltIntro}</p>
      {#if saerskiltAapen}
        <div class="aapen saerskilt-aapen">
          {@render beloepsfelt(
            'saerskilt',
            KRAVSKJEMA.saerskiltBeloep,
            KRAVSKJEMA.saerskiltHjelp,
            saerskilt,
            'beloep',
            true
          )}
          <div class="postfot saerskilt-fot">
            <Knapp onclick={lukkSaerskilt}>{KRAVSKJEMA.ferdig}</Knapp>
          </div>
        </div>
      {:else}
        <div class="linje saerskilt-linje">
          <h4 class="navn"><span class="betegnelse">{KRAVSKJEMA.saerskiltKort}</span></h4>
          <p class="form">
            <span class="visually-hidden">{KRAVSKJEMA.kolonner[1]}:</span>{KRAVSKJEMA.formnavn
              .tilbud}
          </p>
          <p class="pns-celle tom"></p>
          <p class="beloep-celle">
            <span class="visually-hidden">{KRAVSKJEMA.kolonner[3]}:</span>{saerskiltBeloep}
          </p>
          <Knapp
            variant="lenke"
            id={id('endre-saerskilt')}
            aria-label={KRAVSKJEMA.endrePost(KRAVSKJEMA.saerskilt.toLowerCase())}
            onclick={aapneSaerskilt}>{KRAVSKJEMA.endre}</Knapp
          >
          {#if saerskiltEndret}<div class="under"><p>{saerskiltEndret}</p></div>{/if}
        </div>
      {/if}
      {#if feil('saerskilt') && !saerskiltAapen}
        <p class="feilmelding">{feil('saerskilt')}</p>
      {/if}
      <!-- Under posten, som i prototype v4. En post fra forrige krav trekkes (KA-U83). Er den
           den eneste posten, avviser kjernen trekket, og kravet trekkes i stedet. -->
      {#if !forrige || krevdProduktivitet(forrige) === null}
        <div class="saerskilt-fjern">
          <Knapp variant="lenke" iFlukt onclick={fjernSaerskilt}>{KRAVSKJEMA.fjernSaerskilt}</Knapp>
        </div>
      {:else if med.length}
        <div class="saerskilt-fjern">
          <Knapp variant="lenke" iFlukt onclick={trekkSaerskilt}>{KRAVSKJEMA.trekkSaerskilt}</Knapp>
        </div>
      {:else}
        <p class="intro">{KRAVSKJEMA.saerskiltEneste}</p>
      {/if}
    </section>
  {:else if v.trekkerSaerskilt}
    <section class="seksjon kompakt">
      <p>{KRAVSKJEMA.trekket(KRAVSKJEMA.denSaerskilte)}</p>
      <div>
        <Knapp variant="lenke" id={id('angre-saerskilt')} onclick={angreSaerskilt}
          >{KRAVSKJEMA.angreTrekk(KRAVSKJEMA.denSaerskilte)}</Knapp
        >
      </div>
    </section>
  {:else}
    <section class="seksjon kompakt">
      <div>
        <Knapp id={id('legg-til-saerskilt')} onclick={leggTilSaerskilt}
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
    <p class="intro">
      {lagtTil ? KRAVSKJEMA.varsleneIntroLagtTil : KRAVSKJEMA.varsleneIntro}
    </p>
    <div class="kolonner varselkolonner" aria-hidden="true">
      {#each varselkolonner as k (k)}<span>{k}</span>{/each}
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
          <span class="visually-hidden">{varselkolonner[2]}:</span>
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
            <span class="visually-hidden">{varselkolonner[2]}:</span>
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
            <span class="visually-hidden">{varselkolonner[2]}:</span>
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

  {#if kommandoLagtTil}
    <Lagttilmerknader
      {kjernesak}
      {u}
      spor="vederlag"
      kommando={kommandoLagtTil}
      vedlegg={vedleggLagtTil}
      innfelt
    />
  {:else}<section class="seksjon" id={id('forbehold')} aria-labelledby={id('forbehold-tittel')}>
      <div class="seksjonshode">
        <span class="nummer" aria-hidden="true">{v.saerskilt ? 4 : 3}</span>
        <h3 id={id('forbehold-tittel')}>{KRAVSKJEMA.forbeholdPunkt}</h3>
      </div>
      <Tekstomraade
        id={id('forbehold-felt')}
        etikett={KRAVSKJEMA.forbehold}
        valgfri
        hjelp={KRAVSKJEMA.forbeholdHjelp}
        rader={4}
        bind:verdi={v.forbehold}
      />
    </section>{/if}
</Brevskjema>

<style>
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
    align-self: flex-start;
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
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
  .saerskilt-linje {
    border-top: var(--rule);
    border-bottom: var(--rule);
  }
  .post.er-aapen,
  .saerskilt-aapen {
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
    gap: var(--spacing-2);
  }
  .hjelp,
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .tekstfelt,
  .kort-felt {
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
  .tekstfelt:focus-visible,
  .kort-felt:focus-visible {
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
  .varselvalg .postfot,
  .saerskilt-fot {
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
    align-items: first baseline;
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
  .smal-etikett {
    display: none;
  }
  @media (max-width: 640px) {
    .kolonner {
      display: none;
    }
    .pns-celle.tom {
      display: none;
    }
    .smal-etikett {
      display: inline;
      margin-right: var(--spacing-1);
      color: var(--ink-3);
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
