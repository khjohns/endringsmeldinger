<!--
  TE krever fristforlengelse (G-3 i BF-20, prototypen `fristkrav-te.html#nytt-krav`): én rad per
  frist i kontrakten med dagene for den fristen (U-1, KA-U74), og fristen fra fristtabellen for
  prosjektet eller en frist som ikke er registrert (KA-U79). Hver frist har gjeldende frist og ny
  dato, regnet med forlengelsene partene er enige om i andre saker (U-2, D-9, KA-U77). En ny versjon
  har fristene fra forrige versjon, og en frist som tas ut, trekkes (U-10). Skjemaet sender også varselet etter punkt 33.4 alene (U-13), med et
  varsel gitt før utenfor løsningen (U-6), og svaret på forespørselen etter punkt 33.6.2 (U-11).
  Kommandoen bygges i `fristkrav.ts`, og kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { dager } from '#kjerne/frosset/tekst.ts';
  import { betegnelsen, hindringenEtter, innholdIFristen } from '#kjerne/spor/frist/format.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Brevskjema from './Brevskjema.svelte';
  import Gjeldendefrist from './Gjeldendefrist.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Knapp from './Knapp.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import { fokuser, type Mangel } from './mangler';
  import { sendeflyt } from './sendeflyt.svelte';
  import Melding from './Melding.svelte';
  import Linjefelt from './Linjefelt.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Valg from './Valg.svelte';
  import Korrespondansen from './Korrespondansen.svelte';
  import {
    erTomKorrespondanse,
    korrespondansenoekkel,
    lagtTil as kommandoenLagtTil,
    tomKorrespondanse,
    type Korrespondansevalg,
  } from './korrespondansen';
  import Lagttilmerknader from './Lagttilmerknader.svelte';
  import {
    fristkravet,
    manglerIFristkravet,
    nyFristpost,
    startvalg,
    vedleggIFristkravet,
    type Fristkravvalg,
    type Fristpostvalg,
  } from './fristkrav';
  import { gjeldendeFrist, nyFrist, sakensNavn, type GjeldendeFrist } from './fristoversikt';
  import { heleDager } from './fristsvar';
  import { vedleggsgrense, vedleggskart } from './nysak';
  import {
    brevMedUtsagn,
    brevene,
    datoerISporet,
    fristtabellen,
    klarOverForholdet,
  } from './lesing';
  import {
    FRISTKRAV,
    HOVEDLINJER,
    LEGG_TIL,
    SKJEMA,
    dagensDato,
    dato,
    kalenderdager,
  } from './tekster';

  let {
    kjernesak,
    u,
    valg = $bindable(null),
    onbrevkontroll,
    onforkast,
    onregistrert,
    sakslenke,
    lagtTil = null,
    onendre = () => {},
    onlagttil = () => {},
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når TE går til brevkontrollen og tilbake. `null` fyller skjemaet fra saken. */
    valg?: Fristkravvalg | null;
    onbrevkontroll: (
      k: TilBrevkontrollen & { vedlegg: ReturnType<typeof vedleggIFristkravet> }
    ) => void;
    onforkast: () => void;
    /** Varselet sendt utenfor løsningen er registrert (U-13). */
    onregistrert: () => void;
    /** Lenken til en annen sak i prosjektet, som en forlengelse av en frist står i (U-2). */
    sakslenke?: (sakId: string) => string;
    /**
     * Korrespondansen kravet legges til fra (OV-U80, OV-U98), eller `null` for et krav sendt fra
     * løsningen. Kravet har da ingen begrunnelse og ikke noe varsel (OV-U80).
     */
    lagtTil?: Korrespondansevalg | null;
    /** Tilbake til korrespondansen. */
    onendre?: () => void;
    /** Kravet er lagt til. */
    onlagttil?: () => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  if (!untrack(() => valg)) valg = startvalg(untrack(() => u));
  const v = $derived(valg!);

  const tabell = $derived(kjernesak.kontraktsfrister ?? []);
  // En frist som var registrert i forrige versjon, er fast. En som ikke var det, kan byttes med en
  // frist i fristtabellen (`fristeneStrider` i kjernen).
  const fastFrist = (p: Fristpostvalg) =>
    p.id !== null &&
    innholdIFristen(u.spor.frist.gjeldendeKrav!).frister.some(
      (f) => f.id === p.id && f.frist_id !== undefined
    );
  const alleBrev = $derived(brevene(u));
  const brevMed = (dokument: string | null | undefined) =>
    alleBrev.find((b) => b.id === dokument) ?? null;
  const forrige = $derived(brevMed(u.spor.frist.gjeldendeKrav?.dokument));
  const svaret = $derived(brevMed(u.spor.frist.gjeldendeSvar?.dokument));
  // Varselet etter punkt 33.4 er det registrerte varselet, ellers det første kravet i sporet
  // (`varselVedKravet` i kjernen). Uten noen av dem er dette kravet varselet (U-6).
  const varselbrev = $derived(
    brevMed(u.spor.frist.varsler['33.4']?.dokument ?? u.spor.frist.krav[0]?.dokument)
  );
  const hindringPunkt = $derived(hindringenEtter(u.spor.forhold.gjeldendeKrav));
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('frist')));
  const datoer = $derived(datoerISporet(u, 'frist'));
  const iDag = dagensDato();
  const klarOver = $derived(klarOverForholdet(u));

  // U-13: varselet alene kan sendes før det første kravet, når kjernen tilbyr det (VS-U15, VS-U16).
  const kanSende = $derived(kjernesak.handlinger.includes('sende_varsel:frist'));
  const kanRegistrere = $derived(kjernesak.handlinger.includes('varsle:frist'));
  const kanVarsle = $derived(
    !lagtTil &&
      !forrige &&
      kjernesak.handlinger.includes('krav:frist') &&
      (kanSende || kanRegistrere)
  );
  // U-11: forespørselen etter punkt 33.6.2 TE kan svare på, og brevet den står i.
  const foresporsel = $derived(
    v.hva === 'varsel' || lagtTil
      ? null
      : (kjernesak.tilbudte.find((h) => h.type === 'svare_paa_foresporsel')?.gjelder ?? null)
  );
  const foresporselsbrev = $derived(foresporsel ? brevMedUtsagn(u, foresporsel) : null);
  /** Varselet alene, svaret etter punkt 33.6.2 annet ledd b, eller kravet med dagene. */
  const modus = $derived(
    v.hva === 'varsel' ? 'varsel' : foresporselsbrev && v.bokstav === 'b' ? 'svar' : 'krav'
  );
  const varsel = $derived(modus === 'varsel');
  const bokstavB = $derived(modus === 'svar');
  // Varselet alene registreres bare når kjernen tilbyr det (VS-U16). I kravet kan varselet gitt
  // før, utenfor løsningen, oppgis når saken ikke har et (U-6, OV-U5).
  const utenfor = $derived(
    !lagtTil && (varsel ? kanRegistrere : !varselbrev && !bokstavB) ? v.utenfor : null
  );
  const registreres = $derived(varsel && utenfor !== null);
  /** Et varsel registreres når TE bare varsler og ikke kan sende det fra løsningen. */
  function velgHva(hva: Fristkravvalg['hva'] | null) {
    v.hva = hva ?? 'krav';
    if (v.hva === 'varsel' && !kanSende) v.utenfor ??= tomKorrespondanse();
    // En registrering TE ikke har fylt ut, blir ikke et varsel gitt før i kravet.
    if (v.hva === 'krav' && v.utenfor && erTomKorrespondanse(v.utenfor)) v.utenfor = null;
  }

  // Radene uten et navn nummereres bare seg imellom (U-1).
  const utenNavn = $derived(v.frister.filter((p) => !delene(p).navn));
  /** Navnet fristen står med i skjemaet og panelet, som i brevet (`betegnelsen` i kjernen). */
  function navnet(p: Fristpostvalg): string {
    const d = delene(p);
    return d.navn ? betegnelsen(d) : FRISTKRAV.nyFrist(utenNavn.indexOf(p) + 1, utenNavn.length);
  }
  /** Nummeret og navnet i fristtabellen eller i raden, `navn` tom før fristen har et (U-1). */
  function delene(p: Fristpostvalg): { nummer: string | null; navn: string } {
    if (typeof p.frist === 'number') {
      const f = tabell.find((x) => x.fristId === p.frist);
      if (f) return { nummer: f.nummer, navn: f.navn };
    }
    return { nummer: p.nummer.trim() || null, navn: p.navn.trim() };
  }

  /** Valgene slik kommandoen leser dem: et varsel utenfor bare der skjemaet viser det. */
  const gjeldende = $derived({ ...v, utenfor });
  // OV-U80: et krav lagt til har ingen begrunnelse.
  const mangler = $derived(
    manglerIFristkravet(gjeldende, uid, navnet, foresporsel).filter(
      (m) => !lagtTil || m.felt !== id('begrunnelse')
    )
  );
  const kommandoLagtTil = $derived(
    lagtTil ? kommandoenLagtTil(fristkravet(gjeldende) as { type: 'krav' }, lagtTil) : null
  );
  const vedleggLagtTil = $derived(vedleggskart(lagtTil?.vedlegg ?? []));
  const flyt = sendeflyt(() => kjernesak, id('hindring'));
  const feil = (felt: string): string | null => flyt.feil(mangler.find((m) => m.felt === id(felt)));
  const begrunnelseFeil = $derived(feil('begrunnelse'));
  let oppsummering = $state<HTMLElement | null>(null);

  const dagene = (p: Fristpostvalg) => {
    const d = heleDager(p.dager);
    return d === undefined ? FRISTKRAV.ikkeOppgitt : dager(d);
  };
  const linjer = $derived(
    modus === 'krav'
      ? v.frister.map((p) => ({
          tekst: p.trukket
            ? FRISTKRAV.trukketLinje(navnet(p))
            : FRISTKRAV.linje(navnet(p), dagene(p)),
          lag: null,
        }))
      : [{ tekst: FRISTKRAV.dette[modus], lag: null }]
  );
  // Kalenderdagene fra datoen TE oppgir, til varselet eller i dag. Løsningen vurderer dem ikke.
  const dagerEtterKlarOver = $derived.by(() => {
    // Står varselet i saken, sier linja om brevet dagene.
    if (!klarOver || (!varsel && varselbrev)) return null;
    // Varselet som registreres nå eller er gitt før, med dagene først når datoen er oppgitt.
    const fraUtenfor = registreres || !varselbrev;
    if (fraUtenfor && utenfor && !utenfor.dato) return null;
    const varslet = fraUtenfor ? utenfor?.dato : (varselbrev.sendt ?? varselbrev.registrert);
    return varslet
      ? FRISTKRAV.dagerTilVarselet(klarOver.dato, varslet, kalenderdager(klarOver.dato, varslet))
      : FRISTKRAV.dagerTilIDag(klarOver.dato, kalenderdager(klarOver.dato, iDag));
  });
  const grense = vedleggsgrense((fil) => kjernesak.lastOppVedlegg(fil));
  const fristdatoer = $derived(new Map(kjernesak.fristdatoer.map((d) => [d.fristId, d])));
  const datoFor = (p: Fristpostvalg) =>
    typeof p.frist === 'number' ? (fristdatoer.get(p.frist) ?? null) : null;
  // Gjeldende frist regnes uten forlengelsene i denne saken (KA-U77 «andre saker», HF-U5).
  const fristtabell = $derived(fristtabellen(kjernesak, sakslenke));
  const gjeldendeFor = (fristId: number | null): GjeldendeFrist =>
    fristId === null ? null : gjeldendeFrist(fristId, fristtabell);
  /** Datoen som gjelder nå: gjeldende frist når den kan regnes, ellers datoen i kontrakten. */
  const datoenNaa = (g: GjeldendeFrist) =>
    g?.art === 'kjent' ? g.dato : g?.art === 'ukjent' ? g.iKontrakten : null;
  // Fristene i fristtabellen med datoen i kontrakten, og en frist som ikke er registrert (KA-U79).
  const fristvalg = $derived([
    ...tabell.map((f) => {
      const d = fristdatoer.get(f.fristId);
      const naa = datoenNaa(gjeldendeFor(f.fristId));
      return {
        verdi: String(f.fristId),
        tekst:
          d && naa ? FRISTKRAV.fristvalg(betegnelsen(f), naa, d.dagmulktbelagt) : betegnelsen(f),
      };
    }),
    { verdi: 'annen', tekst: FRISTKRAV.ikkeRegistrert },
  ]);

  // Én frist er åpen om gangen, og en ny, tom frist står åpen (prototypen `#nytt-krav`).
  let aapen = $state<string | null>(
    untrack(() => v.frister.find((p) => p.id === null && p.frist === null)?.noekkel ?? null)
  );
  /** Det valgte i en gruppe, ellers det første feltet, ellers elementet selv. */
  const iGruppen = (el: HTMLElement | null) =>
    el?.querySelector<HTMLElement>('input:checked') ??
    el?.querySelector<HTMLElement>('input') ??
    el;
  async function aapne(p: Fristpostvalg) {
    aapen = p.noekkel;
    // En fast frist fra forrige versjon har ikke valget av fristen.
    await fokuser(() =>
      iGruppen(document.getElementById(id(`${fastFrist(p) ? 'dager' : 'frist'}-${p.noekkel}`)))
    );
  }
  async function lukk(p: Fristpostvalg) {
    aapen = null;
    await fokuser(() => document.getElementById(id(`endre-${p.noekkel}`)));
  }
  async function leggTil() {
    const p = nyFristpost();
    v.frister.push(p);
    await aapne(p);
  }
  async function fjern(p: Fristpostvalg) {
    const i = v.frister.indexOf(p);
    v.frister.splice(i, 1);
    aapen = null;
    await fokuser(() => document.getElementById(id('legg-til')));
  }
  async function trekk(p: Fristpostvalg) {
    p.trukket = !p.trukket;
    if (p.trukket) await lukk(p);
  }
  async function gaaTil(m: Mangel, e: Event) {
    const p = m.post && v.frister.find((q) => q.noekkel === m.post);
    if (!p || aapen === p.noekkel) return;
    e.preventDefault();
    aapen = p.noekkel;
    await fokuser(() => iGruppen(document.getElementById(m.felt)));
  }

  // Snarveien (BF-20 U-4).
  const snarvei = $derived.by(() => {
    const med = v.frister.flatMap((p) => {
      const d = datoFor(p);
      return !p.trukket && d && (heleDager(p.dager) ?? 0) > 0 ? [{ p, dato: d.dato }] : [];
    });
    const seneste = med.sort((a, b) => b.dato.localeCompare(a.dato))[0];
    if (!seneste) return null;
    const kilde = seneste.p;
    const senere = tabell
      .flatMap((f) => {
        const d = fristdatoer.get(f.fristId);
        return d && d.dato > seneste.dato && !v.frister.some((p) => p.frist === f.fristId)
          ? [{ f, dato: d.dato }]
          : [];
      })
      .sort((a, b) => a.dato.localeCompare(b.dato))
      .map((x) => x.f);
    if (!senere.length) return null;
    const k = delene(kilde);
    return {
      kilde,
      senere,
      tekst: FRISTKRAV.snarvei(
        dager(heleDager(kilde.dager)!),
        senere.map((f) => FRISTKRAV.omtale(f.nummer, f.navn)),
        FRISTKRAV.omtale(k.nummer, k.navn)
      ),
    };
  });
  async function brukSnarvei() {
    if (!snarvei) return;
    const { kilde, senere } = snarvei;
    const nye = senere.map((f) => ({ ...nyFristpost(), frist: f.fristId, dager: kilde.dager }));
    v.frister.push(...nye);
    await fokuser(() => document.getElementById(id(`endre-${nye[0]!.noekkel}`)));
  }

  // Fristene i tidslinja med ny dato, i den rekkefølgen de får hvis kravet godtas (U-5, U-2).
  const fristeneITidslinja = $derived(
    tabell.flatMap((f) => {
      const d = fristdatoer.get(f.fristId);
      if (!d) return [];
      const p =
        modus === 'krav' ? v.frister.find((q) => q.frist === f.fristId && !q.trukket) : undefined;
      const n = p ? heleDager(p.dager) : undefined;
      const g = gjeldendeFor(f.fristId);
      const naa = datoenNaa(g) ?? d.dato;
      const ny = n ? nyFrist(g, n) : null;
      const kilde = [
        n ? FRISTKRAV.krevd(dager(n), ny ? naa : null) : null,
        n && !ny ? FRISTKRAV.nyDatoUkjent : null,
        d.dagmulktbelagt ? FRISTKRAV.dagmulkt : null,
      ];
      return [
        {
          noekkel: `frist-${f.fristId}`,
          naar: ny ?? naa,
          hva: betegnelsen(f),
          kilde: kilde.filter((x) => x !== null).join(' · '),
          krevd: !!n,
        },
      ];
    })
  );

  function seBrevet() {
    const kommando = fristkravet(gjeldende, foresporsel);
    const vedlegg = vedleggIFristkravet(gjeldende);
    return flyt.send({
      mangler: mangler.length ? () => oppsummering : null,
      lagtTil: kommandoLagtTil
        ? { kommando: kommandoLagtTil, vedlegg: vedleggLagtTil, ferdig: onlagttil }
        : null,
      kommando,
      vedlegg,
      registrert: registreres ? onregistrert : null,
      kanIkkeLages: HOVEDLINJER.kanIkkeLages,
      tilBrevkontrollen: (brevet) =>
        onbrevkontroll({
          kommando,
          vedlegg,
          ...brevet,
          // Som panelet: hver frist med dagene og en frist som trekkes (U-10), eller varselet eller svaret.
          detteSender: linjer,
          virkninger:
            modus === 'varsel'
              ? [FRISTKRAV.virkningVarsel(klarOver ? kalenderdager(klarOver.dato, iDag) : null)]
              : modus === 'svar'
                ? [FRISTKRAV.virkningB]
                : [
                    ...(varselbrev || utenfor ? [] : [FRISTKRAV.virkningKravetErVarselet]),
                    ...(svaret ? [FRISTKRAV.virkningNyVersjon(svaret)] : []),
                  ],
        }),
    });
  }
</script>

{#snippet varselUtenfor()}
  <div class="innrykk">
    <Korrespondansen
      id={(felt) => id(korrespondansenoekkel('utenfor', felt))}
      bind:valg={v.utenfor!}
      feil={(felt) => feil(korrespondansenoekkel('utenfor', felt))}
      {grense}
      kapittelB
    />
  </div>
{/snippet}

{#snippet felt(
  p: Fristpostvalg,
  navn: 'nummer' | 'navn' | 'dager',
  etikett: string,
  hjelp: string | null,
  etter: string | null = null,
  nyDato: string | null | undefined = undefined,
  gjeldende: string | null = null
)}
  {@const fid = id(`${navn}-${p.noekkel}`)}
  {@const f = feil(`${navn}-${p.noekkel}`)}
  <Linjefelt
    id={fid}
    {etikett}
    {hjelp}
    enhet={navn === 'dager' ? 'dager' : undefined}
    bredde={navn === 'navn' ? 'tekst' : navn === 'nummer' ? 'kort' : 'tall'}
    inputmode={navn === 'dager' ? 'numeric' : undefined}
    bind:verdi={p[navn]}
    feil={f}
    etter={[gjeldende ?? '', nyDato ? `${fid}-ny` : '', etter ? `${fid}-etter` : '']}
    paakrevd={navn !== 'nummer'}
    valgfri={navn === 'nummer'}
  >
    <!-- Den levende regionen står fra start, så den nye datoen leses opp når den kommer (#1636). -->
    {#if nyDato !== undefined}<p class="dempet" id={`${fid}-ny`} aria-live="polite">
        {nyDato ?? ''}
      </p>{/if}
    {#if etter}<p class="dempet" id={`${fid}-etter`}>{etter}</p>{/if}
  </Linjefelt>
{/snippet}

{#snippet fristrad(p: Fristpostvalg)}
  {@const ny = p.id === null && forrige !== null}
  {@const sid = id(`frist-${p.noekkel}`)}
  {@const fFeil = feil(`frist-${p.noekkel}`)}
  {@const d = datoFor(p)}
  {@const g = gjeldendeFor(typeof p.frist === 'number' ? p.frist : null)}
  {@const nyDato = nyFrist(g, heleDager(p.dager) ?? 0)}
  {@const deler = delene(p)}
  {@const aapnet = aapen === p.noekkel && !p.trukket}
  <li
    class="frist"
    class:trukket={p.trukket}
    class:er-aapen={aapnet}
    aria-labelledby={`${sid}-tittel`}
  >
    {#if aapnet}
      <div class="frist-hode">
        <h4 id={`${sid}-tittel`}>{navnet(p)}</h4>
        {#if ny}<span class="merke">{FRISTKRAV.nyIVersjonen}</span>{/if}
        {#if d?.dagmulktbelagt}<span class="merke">{FRISTKRAV.dagmulktMerke}</span>{/if}
      </div>
      {#if !fastFrist(p)}
        <Valg
          navn={sid}
          spoersmaal={FRISTKRAV.fristEtikett}
          valg={fristvalg}
          bind:verdi={
            () => (p.frist === null ? null : String(p.frist)),
            (x) => (p.frist = x === null || x === 'annen' ? x : Number(x))
          }
          feil={fFeil}
          lett
          stablet
        />
      {/if}
      {#if p.frist !== null}
        <Gjeldendefrist
          {g}
          registrert={p.frist !== 'annen'}
          {sakslenke}
          tillegg={FRISTKRAV.iTillegg}
          id={`${sid}-gjeldende`}
        />
      {/if}
      {#if p.frist === 'annen'}
        <p class="dempet">{FRISTKRAV.ikkeRegistrertHjelp}</p>
        {@render felt(p, 'nummer', FRISTKRAV.nummerEtikett, null)}
        {@render felt(p, 'navn', FRISTKRAV.navnEtikett, null)}
      {/if}
      {@render felt(
        p,
        'dager',
        FRISTKRAV.dagerEtikett,
        FRISTKRAV.kalenderdager,
        FRISTKRAV.delAvArbeidene,
        nyDato ? FRISTKRAV.nyDato(nyDato, d?.dagmulktbelagt ?? false) : null,
        (typeof p.frist === 'number' && g) || p.frist === 'annen' ? `${sid}-gjeldende` : null
      )}
      <div class="fot">
        {#if p.id !== null}
          <Knapp variant="lenke" aria-label={FRISTKRAV.trekk(navnet(p))} onclick={() => trekk(p)}
            >{FRISTKRAV.trekkTekst}</Knapp
          >
        {:else if v.frister.length > 1}
          <Knapp
            variant="lenke"
            aria-label={FRISTKRAV.fjernFrist(navnet(p))}
            onclick={() => fjern(p)}>{FRISTKRAV.fjern}</Knapp
          >
        {/if}
        <Knapp onclick={() => lukk(p)}>{FRISTKRAV.ferdig}</Knapp>
      </div>
    {:else}
      {@const n = heleDager(p.dager)}
      <div class="linje">
        <span class="nr">{deler.nummer ?? ''}</span>
        <h4 class="navn" id={`${sid}-tittel`}>
          <span class="visually-hidden">{navnet(p)}</span><span aria-hidden="true"
            >{#if deler.nummer}<span class="nr-smal">{deler.nummer}</span>{/if}{deler.navn}</span
          >
          {#if ny}<span class="merke">{FRISTKRAV.nyIVersjonen}</span>{/if}
          {#if d?.dagmulktbelagt}<span class="merke">{FRISTKRAV.dagmulktMerke}</span>{/if}
        </h4>
        <p class="dato-celle">
          <span class="visually-hidden">{FRISTKRAV.kolonner[2]}:</span><span
            class="prefiks-smal"
            aria-hidden="true">{FRISTKRAV.kolonner[2]}</span
          >{g?.art === 'kjent' ? dato(g.dato) : '–'}
        </p>
        <p class="dager-celle" class:mangler-tekst={!p.trukket && !n}>
          <span class="visually-hidden">{FRISTKRAV.kolonner[3]}:</span>{p.trukket
            ? FRISTKRAV.trekkes
            : n
              ? dager(n)
              : FRISTKRAV.dagerMangler}
        </p>
        <p class="dato-celle ny-celle">
          {#if nyDato && !p.trukket}<span class="visually-hidden">{FRISTKRAV.kolonner[4]}:</span
            ><span class="prefiks-smal" aria-hidden="true">{FRISTKRAV.kolonner[4]}</span>{dato(
              nyDato
            )}{:else if !p.trukket && (p.frist === 'annen' || g?.art === 'ukjent')}<span
              class="visually-hidden">{FRISTKRAV.kolonner[4]}:</span
            ><span class="prefiks-smal" aria-hidden="true">{FRISTKRAV.kolonner[4]}</span><span
              class="ukjent"
              >{p.frist === 'annen' ? FRISTKRAV.ikkeRegistrertKort : FRISTKRAV.kanIkkeRegnes}</span
            >{/if}
        </p>
        <Knapp
          variant="lenke"
          id={id(`endre-${p.noekkel}`)}
          aria-label={p.trukket ? FRISTKRAV.angreTrekk(navnet(p)) : FRISTKRAV.endreFrist(navnet(p))}
          onclick={() => (p.trukket ? trekk(p) : aapne(p))}
          >{p.trukket ? FRISTKRAV.angre : FRISTKRAV.endre}</Knapp
        >
        {#if g?.art === 'kjent' && g.forlengelser.length && !p.trukket}<p class="under">
            {FRISTKRAV.forlengetI(
              g.forlengelser.map((f) => ({
                dager: f.dager,
                sak: sakensNavn(f),
              }))
            )}
          </p>{/if}
        {#if p.trukket}<p class="under">
            {FRISTKRAV.trukketMerk(FRISTKRAV.omtale(deler.nummer, deler.navn))}
          </p>{/if}
      </div>
    {/if}
  </li>
{/snippet}

<Brevskjema
  id={id('tittel')}
  tittel={FRISTKRAV.titler[foresporselsbrev && !varsel ? 'svar' : modus]}
  undertittel={forrige && !lagtTil ? FRISTKRAV.nyVersjon(forrige) : null}
  mottaker={SKJEMA.tilBH}
  {lagtTil}
  part={kjernesak.part}
  {onendre}
  {flyt}
  {mangler}
  manglerTittel={SKJEMA.mangler}
  ongaa={gaaTil}
  bind:oppsummering
  forkastTekst={FRISTKRAV.forkastTekst}
  {onforkast}
  knapp={{
    tekst: lagtTil
      ? LEGG_TIL.leggTilKravet
      : registreres
        ? FRISTKRAV.registrer
        : HOVEDLINJER.seBrevet,
    onclick: seBrevet,
    opptatt: (registreres || !!lagtTil) && kjernesak.sender,
  }}
  kompakt={{ etikett: FRISTKRAV.punktene }}
>
  {#snippet panel(sendeknapp)}
    <Hovedlinjer
      {linjer}
      alternativer={false}
      handling={sendeknapp}
      tittel={FRISTKRAV.punktene}
      tom={FRISTKRAV.ingenFrister}
    />
  {/snippet}
  {#snippet tidslinje()}
    <Tidslinje brev={sporbrev} {datoer} frister={fristeneITidslinja} />
  {/snippet}

  {#if kanVarsle}
    <Spoersmaal>
      <Valg
        navn={id('hva')}
        spoersmaal={FRISTKRAV.hvaSender}
        valg={FRISTKRAV.hvaValg}
        bind:verdi={() => v.hva, velgHva}
        beskrevetAv={id('hva-hjelp')}
        lett
        stablet
      />
      <p class="dempet" id={id('hva-hjelp')}>{FRISTKRAV.hvaHjelp}</p>
    </Spoersmaal>
  {/if}

  {#if foresporsel && foresporselsbrev}
    <Spoersmaal>
      <p class="status">
        {FRISTKRAV.foresporsel(
          foresporselsbrev,
          foresporselsbrev.registrert,
          kalenderdager(foresporselsbrev.registrert, iDag)
        )}
      </p>
      <Valg
        navn={id('bokstav')}
        spoersmaal={FRISTKRAV.hvordanSvarer}
        valg={FRISTKRAV.bokstavValg}
        bind:verdi={() => v.bokstav, (x) => (v.bokstav = x ?? 'a')}
        lett
        stablet
      />
    </Spoersmaal>
  {/if}

  {#if !lagtTil && (!bokstavB || varselbrev)}
    <Spoersmaal id={id('sp-varsel')} tittel={FRISTKRAV.varselTittel} hjemmel={['33.4']}>
      <p class="dempet">{varsel ? FRISTKRAV.varselAleneHjelp : FRISTKRAV.varselHjelp}</p>
      {#if klarOver}
        <dl class="klar-over">
          <dt>{FRISTKRAV.klarOver}</dt>
          <dd>
            {dato(klarOver.dato)}
            <span class="dempet">{FRISTKRAV.oppgittI(klarOver.brev)}</span>
          </dd>
        </dl>
      {/if}
      {#if varsel}
        {#if kanSende && kanRegistrere}
          <Valg
            navn={id('maate')}
            spoersmaal={FRISTKRAV.hvordanVarsler}
            valg={[
              { verdi: 'send', tekst: FRISTKRAV.varselmaate.send },
              { verdi: 'registrer', tekst: FRISTKRAV.varselmaate.registrer },
            ]}
            bind:verdi={
              () => (v.utenfor ? 'registrer' : 'send'),
              (x) => (v.utenfor = x === 'registrer' ? (v.utenfor ?? tomKorrespondanse()) : null)
            }
            lett
            stablet
          />
        {/if}
        {#if utenfor}{@render varselUtenfor()}{/if}
      {:else if varselbrev}
        <p class="status">
          {FRISTKRAV.varseletSendt(
            varselbrev,
            klarOver
              ? kalenderdager(klarOver.dato, varselbrev.sendt ?? varselbrev.registrert)
              : null
          )}
        </p>
      {:else if utenfor}
        <p class="status">{FRISTKRAV.gittFoer}.</p>
        <p class="dempet">{FRISTKRAV.gittFoerHjelp}</p>
        {@render varselUtenfor()}
        <div>
          <Knapp variant="lenke" onclick={() => (v.utenfor = null)}>{FRISTKRAV.likevel}</Knapp>
        </div>
      {:else}
        <p class="status">{FRISTKRAV.kravetErVarselet}</p>
        <div>
          <Knapp variant="lenke" onclick={() => (v.utenfor = tomKorrespondanse())}
            >{FRISTKRAV.gittFoer}</Knapp
          >
        </div>
      {/if}
      {#if dagerEtterKlarOver}<p class="dempet">{dagerEtterKlarOver}</p>{/if}
    </Spoersmaal>
  {/if}

  {#if bokstavB}
    {@const fB = feil('grunn-b')}
    <Spoersmaal
      id={id('sp-grunn-b')}
      tittel={FRISTKRAV.grunnBTittel}
      hjemmel={['33.6.2 annet ledd b']}
    >
      <Tekstomraade
        id={id('grunn-b')}
        merketAv={id('sp-grunn-b')}
        hjelp={FRISTKRAV.grunnBHjelp}
        rader={6}
        bind:verdi={v.grunnB}
        paakrevd
        feil={fB}
      />
    </Spoersmaal>
  {/if}

  {#if !varsel && !bokstavB}
    <Spoersmaal
      id={id('sp-frister')}
      tittel={FRISTKRAV.fristerTittel}
      hjemmel={[hindringPunkt, '33.6.1']}
    >
      <p class="dempet">{FRISTKRAV.fristerHjelp}</p>
      {#if kjernesak.kontraktsfrister === null}
        <Melding art="feil" levende={false}>{FRISTKRAV.ingenFristtabell}</Melding>
      {/if}
      {#if forrige}<p class="dempet">{FRISTKRAV.trekkHjelp}</p>{/if}
      <div class="kolonner" aria-hidden="true">
        {#each FRISTKRAV.kolonner as k (k)}<span>{k}</span>{/each}
        <span></span>
      </div>
      <ul class="frister">
        {#each v.frister as p (p.noekkel)}
          {@render fristrad(p)}
        {/each}
      </ul>
      {#if snarvei}
        <div class="snarvei">
          <Knapp variant="lenke" onclick={brukSnarvei}>{snarvei.tekst}</Knapp>
        </div>
      {/if}
      <div>
        <Knapp variant="sekundaer" id={id('legg-til')} onclick={leggTil}>{FRISTKRAV.leggTil}</Knapp>
      </div>
    </Spoersmaal>

    {#if kommandoLagtTil}
      <Lagttilmerknader
        {kjernesak}
        {u}
        spor="frist"
        kommando={kommandoLagtTil}
        vedlegg={vedleggLagtTil}
      />
    {:else}<Spoersmaal
        id={id('sp-begrunnelse')}
        tittel={FRISTKRAV.begrunnelseTittel}
        hjemmel={['33.5', '33.6.1']}
      >
        <div class="dempet" id={id('begrunnelse-hjelp')}>
          <p>{FRISTKRAV.begrunnelseHjelp}</p>
          <ul class="hensyn">
            {#each FRISTKRAV.hensyn as h (h)}<li>{h}</li>{/each}
          </ul>
          <p>{FRISTKRAV.fremdriftsplan}</p>
        </div>
        <Tekstomraade
          id={id('begrunnelse')}
          merketAv={id('sp-begrunnelse')}
          rader={6}
          bind:verdi={v.begrunnelse}
          paakrevd
          feil={begrunnelseFeil}
          foran={[id('begrunnelse-hjelp')]}
        />
      </Spoersmaal>{/if}
  {/if}
</Brevskjema>

<style>
  .frist-hode {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }
  h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .status {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: var(--r-innfelt);
  }
  .frister {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .frist {
    border-bottom: var(--rule);
  }
  .frist.er-aapen {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-4) 0 var(--spacing-4) var(--spacing-4);
    border-left: 3px solid var(--ink);
  }
  /* Som kravpostene i vederlagskravet: «Endre» med 44 px trykkflate står på linja. */
  .kolonner,
  .linje {
    display: grid;
    grid-template-columns: 40px minmax(0, 2fr) minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1.3fr) 64px;
    column-gap: var(--spacing-4);
    align-items: center;
  }
  .kolonner {
    padding-bottom: var(--spacing-2);
    border-bottom: var(--rule);
    color: var(--ink-3);
    font-size: 12px;
  }
  .linje {
    row-gap: var(--spacing-1);
    padding: var(--spacing-2) 0;
    font-size: 14px;
  }
  .ukjent {
    color: var(--ink-3);
  }
  .linje h4 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 14px;
  }
  .nr,
  .dato-celle,
  .dager-celle {
    font-variant-numeric: tabular-nums;
  }
  .frist.trukket .navn,
  .frist.trukket .dato-celle {
    color: var(--ink-3);
  }
  .mangler-tekst {
    color: var(--ink-3);
  }
  .nr-smal,
  .prefiks-smal {
    display: none;
    margin-right: var(--spacing-2);
    font-variant-numeric: tabular-nums;
  }
  .under {
    grid-column: 2 / -1;
    color: var(--ink-3);
    font-size: 12px;
  }
  .fot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
  .fot > :global(:only-child) {
    margin-left: auto;
  }
  .snarvei > :global(.knapp) {
    justify-content: flex-start;
    padding-inline: 0;
    text-align: left;
  }
  @media (max-width: 640px) {
    .kolonner {
      display: none;
    }
    .linje {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .nr {
      display: none;
    }
    .nr-smal {
      display: inline;
    }
    .prefiks-smal {
      display: inline;
    }
    .dato-celle {
      color: var(--ink-3);
      font-size: 12px;
    }
    .ny-celle {
      color: var(--ink-2);
      font-size: 14px;
    }
    .ny-celle:not(:has(*)) {
      display: none;
    }
    .linje > p {
      grid-column: 1;
    }
    .linje > :global(.knapp) {
      grid-column: 2;
      grid-row: 1;
    }
    .linje > .under {
      grid-column: 1 / -1;
    }
  }
  .merke {
    padding: 0 var(--spacing-2);
    border: var(--rule-strong);
    border-radius: var(--r-merke);
    color: var(--ink-2);
    font-size: 12px;
  }
  .innrykk {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    padding-left: var(--spacing-4);
    border-left: 2px solid var(--rule-strong-color);
  }
  .klar-over {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .klar-over dt {
    font-size: 15px;
    color: var(--ink);
  }
  .klar-over dd {
    margin: 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .klar-over dd .dempet {
    margin-left: var(--spacing-2);
    font-weight: 400;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .hensyn {
    padding-left: var(--spacing-5);
    list-style: disc;
  }
</style>
