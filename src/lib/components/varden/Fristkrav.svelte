<!--
  TE krever fristforlengelse (G-3 i BF-20, prototypen `fristkrav-te.html#nytt-krav`): én rad per
  frist i kontrakten med dagene for den fristen (U-1, KA-U74), og fristen fra fristtabellen for
  prosjektet eller en frist som ikke er registrert (KA-U79). En ny versjon har fristene fra forrige
  versjon, og en frist som tas ut, trekkes (U-10). Gjeldende frist og ny dato venter på G-2 (U-2,
  arbeidsvalget 14.11 i #1745). Skjemaet sender også varselet etter punkt 33.4 alene (U-13), med et
  varsel gitt før utenfor løsningen (U-6), og svaret på forespørselen etter punkt 33.6.2 (U-11).
  Kommandoen bygges i `fristkrav.ts`, og kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { BookOpen } from 'lucide-svelte';
  import { tick, untrack } from 'svelte';
  import { dager } from '$kjerne/frosset/tekst';
  import { betegnelsen, innholdIFristen } from '$kjerne/spor/frist/format';
  import type { Utledning } from '$kjerne/utledning/utled';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { kontrollbrev, type TilBrevkontrollen } from './Brevkontroll.svelte';
  import { fastLinje } from './fastlinje.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Filvalg from './Filvalg.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import Valg from './Valg.svelte';
  import {
    fristkravet,
    manglerIFristkravet,
    nyFristpost,
    startvalg,
    tomtUtenforvalg,
    vedleggIFristkravet,
    type Fristkravvalg,
    type Fristpostvalg,
    type Mangel,
  } from './fristkrav';
  import { heleDager } from './fristsvar';
  import {
    brevMedUtsagn,
    brevene,
    datoerISporet,
    hovedkategorien,
    klarOverForholdet,
  } from './lesing';
  import {
    FRISTKRAV,
    HOVEDLINJER,
    KRAVSKJEMA,
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
  // § 33.3 for force majeure, ellers § 33.1, som brevteksten i kjernen og svarskjemaet.
  const hindringPunkt = $derived(hovedkategorien(u) === 'force_majeure' ? '33.3' : '33.1');
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('frist')));
  const datoer = $derived(datoerISporet(u, 'frist'));
  const iDag = dagensDato();
  const klarOver = $derived(klarOverForholdet(u));

  // U-13: varselet alene kan sendes før det første kravet, når kjernen tilbyr det (VS-U15, VS-U16).
  const kanSende = $derived(kjernesak.handlinger.includes('sende_varsel:frist'));
  const kanRegistrere = $derived(kjernesak.handlinger.includes('varsle:frist'));
  const kanVarsle = $derived(
    !forrige && kjernesak.handlinger.includes('krav:frist') && (kanSende || kanRegistrere)
  );
  // U-11: forespørselen etter punkt 33.6.2 TE kan svare på, og brevet den står i.
  const foresporsel = $derived(
    v.hva === 'varsel'
      ? null
      : (kjernesak.tilbudte.find((h) => h.type === 'svare_paa_foresporsel')?.gjelder ?? null)
  );
  const foresporselsbrev = $derived(foresporsel ? brevMedUtsagn(u, foresporsel) : null);
  /** Varselet alene, svaret etter punkt 33.6.2 annet ledd bokstav b, eller kravet med dagene. */
  const modus = $derived(
    v.hva === 'varsel' ? 'varsel' : foresporsel && v.bokstav === 'b' ? 'svar' : 'krav'
  );
  const varsel = $derived(modus === 'varsel');
  const bokstavB = $derived(modus === 'svar');
  // Varselet gitt før, utenfor løsningen, kan oppgis når saken ikke har et (U-6, OV-U5).
  const utenfor = $derived(
    (!varselbrev && !bokstavB) || (varsel && kanRegistrere) ? v.utenfor : null
  );
  const registreres = $derived(varsel && utenfor !== null);
  /** Et varsel registreres når TE bare varsler og ikke kan sende det fra løsningen. */
  function velgHva(hva: Fristkravvalg['hva'] | null) {
    v.hva = hva ?? 'krav';
    if (v.hva === 'varsel' && !kanSende) v.utenfor ??= tomtUtenforvalg();
  }

  // Radene som ennå ikke har en frist eller et navn, nummereres bare seg imellom (U-1).
  const utenNavn = $derived(v.frister.filter((p) => p.frist === null && !p.navn.trim()));
  /** Navnet fristen står med i skjemaet og panelet, som i brevet (`betegnelsen` i kjernen). */
  function navnet(p: Fristpostvalg): string {
    if (typeof p.frist === 'number') {
      const f = tabell.find((x) => x.fristId === p.frist);
      if (f) return betegnelsen(f);
    }
    const navn = p.navn.trim();
    return navn
      ? betegnelsen({ nummer: p.nummer.trim(), navn })
      : FRISTKRAV.nyFrist(utenNavn.indexOf(p) + 1, utenNavn.length);
  }

  /** Valgene slik kommandoen leser dem: et varsel utenfor bare der skjemaet viser det. */
  const gjeldende = $derived({ ...v, utenfor });
  const mangler = $derived(manglerIFristkravet(gjeldende, uid, navnet, foresporsel));
  let forsoekt = $state(false);
  const feil = (felt: string): string | null =>
    forsoekt ? feltfeil(mangler.find((m) => m.felt === id(felt))) : null;
  const feltfeil = (m: Mangel | undefined) => (m ? (m.ved ?? m.tekst) : null);
  const begrunnelseFeil = $derived(feil('begrunnelse'));
  let oppsummering = $state<HTMLElement | null>(null);
  let sendehindring = $state<string | null>(null);

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
    if (!klarOver) return null;
    const varslet = varselbrev ? (varselbrev.sendt ?? varselbrev.registrert) : utenfor?.dato;
    return varslet
      ? FRISTKRAV.dagerTilVarselet(klarOver.dato, varslet, kalenderdager(klarOver.dato, varslet))
      : FRISTKRAV.dagerTilIDag(klarOver.dato, kalenderdager(klarOver.dato, iDag));
  });
  const grense = {
    lastOpp: (fil: File) => kjernesak.lastOppVedlegg(fil),
    // Et vedlegg i mellomlageret som ikke bindes av varselet, blir liggende til det ryddes.
    slett: async () => {},
  };
  // Fristene i fristtabellen og en frist som ikke er registrert (KA-U79).
  const fristvalg = $derived([
    ...tabell.map((f) => ({ verdi: String(f.fristId), tekst: betegnelsen(f) })),
    { verdi: 'annen', tekst: FRISTKRAV.ikkeRegistrert },
  ]);

  async function leggTil() {
    const p = nyFristpost();
    v.frister.push(p);
    await tick();
    document.getElementById(id(`frist-${p.noekkel}`))?.focus();
  }
  async function fjern(p: Fristpostvalg) {
    const i = v.frister.indexOf(p);
    v.frister.splice(i, 1);
    await tick();
    document.getElementById(id('legg-til'))?.focus();
  }

  async function seBrevet() {
    sendehindring = null;
    if (mangler.length) {
      forsoekt = true;
      await tick();
      oppsummering?.focus();
      return;
    }
    const kommando = fristkravet(gjeldende, foresporsel);
    const vedlegg = vedleggIFristkravet(gjeldende);
    if (registreres) {
      if (await kjernesak.send(kommando, undefined, vedlegg)) onregistrert();
      else await hindret(kjernesak.feil ?? HOVEDLINJER.kanIkkeLages);
      return;
    }
    const b = kjernesak.brev(kommando, vedlegg, true);
    const brevet = kontrollbrev(b);
    if (!brevet) return hindret(brevaarsak(b) ?? HOVEDLINJER.kanIkkeLages);
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
    });
  }

  async function hindret(tekst: string) {
    sendehindring = tekst;
    await tick();
    document.getElementById(id('hindring'))?.focus();
  }

  let panel = $state<HTMLElement | null>(null);
  const linja = fastLinje(
    uid,
    () => panel,
    () => false
  );
</script>

{#snippet sendeknapp()}
  <div class="handling">
    <Knapp
      variant="primaer"
      opptatt={registreres && kjernesak.sender}
      onclick={seBrevet}
      aria-describedby={sendehindring ? id('hindring') : undefined}
      >{registreres ? FRISTKRAV.registrer : HOVEDLINJER.seBrevet}</Knapp
    >
  </div>
  {#if sendehindring}
    <Melding art="feil" levende={false} id={id('hindring')} tabindex="-1">{sendehindring}</Melding>
  {/if}
{/snippet}

{#snippet varselUtenfor(registrering: boolean)}
  {@const fDato = feil('utenfor-dato')}
  <div class="innrykk">
    {#if registrering}
      <Valg
        navn={id('utenfor-type')}
        spoersmaal={KRAVSKJEMA.dokumenttype}
        valg={KRAVSKJEMA.dokumenttyper}
        stablet
        lett
        bind:verdi={v.utenfor!.type}
        feil={feil('utenfor-type')}
      />
    {/if}
    <div class="tallfelt">
      <label for={id('utenfor-dato')}>{FRISTKRAV.varseldato}</label>
      <span class="dempet" id={id('utenfor-dato-hjelp')}>{FRISTKRAV.varseldatoHjelp}</span>
      <input
        id={id('utenfor-dato')}
        type="date"
        class="datofelt"
        class:ugyldig={fDato}
        max={iDag}
        bind:value={v.utenfor!.dato}
        aria-required="true"
        aria-invalid={fDato ? 'true' : undefined}
        aria-describedby={fDato
          ? `${id('utenfor-dato-hjelp')} ${id('utenfor-dato-feil')}`
          : id('utenfor-dato-hjelp')}
      />
      {#if fDato}<p class="feilmelding" id={id('utenfor-dato-feil')}>{fDato}</p>{/if}
    </div>
    <Filvalg
      id={id('utenfor-brev')}
      etikett={FRISTKRAV.varselbrevet}
      hjelp={FRISTKRAV.varselbrevetHjelp}
      {grense}
      bind:vedlegg={v.utenfor!.vedlegg}
      feil={feil('utenfor-brev')}
    />
  </div>
{/snippet}

{#snippet felt(
  p: Fristpostvalg,
  navn: 'nummer' | 'navn' | 'dager',
  etikett: string,
  hjelp: string | null,
  etter: string | null = null
)}
  {@const fid = id(`${navn}-${p.noekkel}`)}
  {@const f = feil(`${navn}-${p.noekkel}`)}
  <div class="tallfelt">
    <label for={fid}>{etikett}</label>
    {#if hjelp}<span class="dempet" id={`${fid}-hjelp`}>{hjelp}</span>{/if}
    <span
      class="inndata"
      class:ugyldig={f}
      class:tekst={navn === 'navn'}
      class:kort={navn === 'nummer'}
    >
      <input
        id={fid}
        inputmode={navn === 'dager' ? 'numeric' : undefined}
        bind:value={p[navn]}
        aria-describedby={[
          hjelp ? `${fid}-hjelp` : '',
          etter ? `${fid}-etter` : '',
          f ? `${fid}-feil` : '',
        ]
          .filter(Boolean)
          .join(' ') || undefined}
        aria-invalid={f ? 'true' : undefined}
        aria-required={navn === 'nummer' ? undefined : 'true'}
      />
      {#if navn === 'dager'}<span class="enhet" aria-hidden="true">dager</span>{/if}
    </span>
    {#if f}<p class="feilmelding" id={`${fid}-feil`}>{f}</p>{/if}
    {#if etter}<p class="dempet liten" id={`${fid}-etter`}>{etter}</p>{/if}
  </div>
{/snippet}

{#snippet fristrad(p: Fristpostvalg)}
  {@const ny = p.id === null && forrige !== null}
  {@const sid = id(`frist-${p.noekkel}`)}
  {@const fFeil = feil(`frist-${p.noekkel}`)}
  <li class="frist" class:trukket={p.trukket} aria-labelledby={`${sid}-tittel`}>
    <div class="frist-hode">
      <h4 id={`${sid}-tittel`}>{navnet(p)}</h4>
      {#if ny}<span class="merke">{FRISTKRAV.nyIVersjonen}</span>{/if}
      {#if p.trukket}<span class="merke">{FRISTKRAV.trekkes}</span>{/if}
      <span class="frist-handling">
        {#if p.id !== null}
          <Knapp
            variant="lenke"
            aria-label={p.trukket ? FRISTKRAV.angreTrekk(navnet(p)) : FRISTKRAV.trekk(navnet(p))}
            onclick={() => (p.trukket = !p.trukket)}
            >{p.trukket ? FRISTKRAV.angre : FRISTKRAV.trekkTekst}</Knapp
          >
        {:else if v.frister.length > 1}
          <Knapp
            variant="lenke"
            aria-label={FRISTKRAV.fjernFrist(navnet(p))}
            onclick={() => fjern(p)}>{FRISTKRAV.fjern}</Knapp
          >
        {/if}
      </span>
    </div>
    {#if !p.trukket}
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
        FRISTKRAV.delAvArbeidene
      )}
    {/if}
  </li>
{/snippet}

<Arbeidsflate>
  {#snippet hoved()}
    <Utkastkort
      id={id('tittel')}
      tittel={FRISTKRAV.titler[modus]}
      undertittel={forrige ? FRISTKRAV.nyVersjon(forrige) : null}
      mottaker={SKJEMA.tilBH}
    >
      {#if forsoekt && mangler.length}
        <div
          class="mangler"
          role="group"
          tabindex="-1"
          bind:this={oppsummering}
          aria-labelledby={id('mangler')}
        >
          <p id={id('mangler')}>{SKJEMA.mangler}</p>
          <ul>
            {#each mangler as m (m.felt)}
              <li><a href={`#${m.felt}`}>{m.tekst}</a></li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if kanVarsle}
        <section class="spoersmaal" aria-labelledby={id('hva')}>
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
        </section>
      {/if}

      {#if foresporsel && foresporselsbrev}
        <section class="spoersmaal" aria-labelledby={id('bokstav')}>
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
        </section>
      {/if}

      {#if !bokstavB || varselbrev}
        <section class="spoersmaal" aria-labelledby={id('sp-varsel')}>
          <div class="sp-hode">
            <h3 id={id('sp-varsel')}>{FRISTKRAV.varselTittel}</h3>
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 33.4</span>
          </div>
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
                  (x) => (v.utenfor = x === 'registrer' ? (v.utenfor ?? tomtUtenforvalg()) : null)
                }
                lett
                stablet
              />
            {/if}
            {#if utenfor}{@render varselUtenfor(true)}{/if}
          {:else if varselbrev}
            <p class="status">{FRISTKRAV.varseletSendt(varselbrev)}</p>
          {:else if utenfor}
            <p class="status">{FRISTKRAV.gittFoer}.</p>
            <p class="dempet">{FRISTKRAV.gittFoerHjelp}</p>
            {@render varselUtenfor(false)}
            <div>
              <Knapp variant="lenke" onclick={() => (v.utenfor = null)}>{FRISTKRAV.likevel}</Knapp>
            </div>
          {:else}
            <p class="status">{FRISTKRAV.kravetErVarselet}</p>
            <div>
              <Knapp variant="lenke" onclick={() => (v.utenfor = tomtUtenforvalg())}
                >{FRISTKRAV.gittFoer}</Knapp
              >
            </div>
          {/if}
          {#if dagerEtterKlarOver}<p class="dempet">{dagerEtterKlarOver}</p>{/if}
        </section>
      {/if}

      {#if bokstavB}
        {@const fB = feil('grunn-b')}
        <section class="spoersmaal" aria-labelledby={id('sp-grunn-b')}>
          <div class="sp-hode">
            <h3 id={id('sp-grunn-b')}>{FRISTKRAV.grunnBTittel}</h3>
            <span class="hjemmel"
              ><BookOpen size={14} aria-hidden="true" />punkt 33.6.2 annet ledd b</span
            >
          </div>
          <p class="dempet" id={id('grunn-b-hjelp')}>{FRISTKRAV.grunnBHjelp}</p>
          <textarea
            id={id('grunn-b')}
            rows="6"
            aria-labelledby={id('sp-grunn-b')}
            bind:value={v.grunnB}
            class:ugyldig={fB}
            aria-describedby={fB
              ? `${id('grunn-b-hjelp')} ${id('grunn-b-feil')}`
              : id('grunn-b-hjelp')}
            aria-invalid={fB ? 'true' : undefined}
            aria-required="true"
          ></textarea>
          {#if fB}<p class="feilmelding" id={id('grunn-b-feil')}>{fB}</p>{/if}
        </section>
      {/if}

      {#if !varsel && !bokstavB}
        <section class="spoersmaal" aria-labelledby={id('sp-frister')}>
          <div class="sp-hode">
            <h3 id={id('sp-frister')}>{FRISTKRAV.fristerTittel}</h3>
            <span class="hjemmel"
              ><BookOpen size={14} aria-hidden="true" />punkt {hindringPunkt} og 33.6.1</span
            >
          </div>
          <p class="dempet">{FRISTKRAV.fristerHjelp}</p>
          {#if kjernesak.kontraktsfrister === null}
            <Melding art="feil" levende={false}>{FRISTKRAV.ingenFristtabell}</Melding>
          {/if}
          {#if forrige}<p class="dempet">{FRISTKRAV.trekkHjelp}</p>{/if}
          <ul class="frister">
            {#each v.frister as p (p.noekkel)}
              {@render fristrad(p)}
            {/each}
          </ul>
          <div>
            <Knapp variant="sekundaer" id={id('legg-til')} onclick={leggTil}
              >{FRISTKRAV.leggTil}</Knapp
            >
          </div>
        </section>

        <section class="spoersmaal" aria-labelledby={id('sp-begrunnelse')}>
          <div class="sp-hode">
            <h3 id={id('sp-begrunnelse')}>{FRISTKRAV.begrunnelseTittel}</h3>
            <span class="hjemmel"
              ><BookOpen size={14} aria-hidden="true" />punkt 33.5 og 33.6.1</span
            >
          </div>
          <div class="dempet" id={id('begrunnelse-hjelp')}>
            <p>{FRISTKRAV.begrunnelseHjelp}</p>
            <ul class="hensyn">
              {#each FRISTKRAV.hensyn as h (h)}<li>{h}</li>{/each}
            </ul>
            <p>{FRISTKRAV.fremdriftsplan}</p>
          </div>
          <textarea
            id={id('begrunnelse')}
            rows="6"
            aria-labelledby={id('sp-begrunnelse')}
            bind:value={v.begrunnelse}
            class:ugyldig={begrunnelseFeil}
            aria-describedby={begrunnelseFeil
              ? `${id('begrunnelse-hjelp')} ${id('begrunnelse-feil')}`
              : id('begrunnelse-hjelp')}
            aria-invalid={begrunnelseFeil ? 'true' : undefined}
            aria-required="true"
          ></textarea>
          {#if begrunnelseFeil}<p class="feilmelding" id={id('begrunnelse-feil')}>
              {begrunnelseFeil}
            </p>{/if}
        </section>
      {/if}

      <div class="skjemafot">
        <Forkastutkast tekst={FRISTKRAV.forkastTekst} {onforkast} />
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    <div class="feste" class:fast={linja.faarPlass} bind:this={panel}>
      <Hovedlinjer
        {linjer}
        alternativer={false}
        handling={sendeknapp}
        tittel={FRISTKRAV.punktene}
        tom={FRISTKRAV.ingenFrister}
      />
    </div>
    <Tidslinje brev={sporbrev} {datoer} />
  {/snippet}
</Arbeidsflate>

{#if linja.visKompakt}
  <div class="kompakt" role="region" aria-label={FRISTKRAV.punktene}>
    {@render sendeknapp()}
  </div>
{/if}

<style>
  .spoersmaal {
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .sp-hode,
  .frist-hode {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  h4 {
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
  .status {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: var(--r-innfelt);
  }
  .frister {
    display: flex;
    flex-direction: column;
    border-top: var(--rule);
  }
  .frist {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-4) 0;
    border-bottom: var(--rule);
  }
  .frist.trukket h4 {
    color: var(--ink-3);
  }
  .frist-handling {
    margin-left: auto;
  }
  .merke {
    padding: 0 var(--spacing-2);
    border: var(--rule-strong);
    border-radius: var(--r-merke);
    color: var(--ink-2);
    font-size: 12px;
  }
  .tallfelt {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  label {
    font-size: 14px;
    color: var(--ink-2);
  }
  textarea:focus-visible,
  .datofelt:focus-visible,
  .inndata:focus-within {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .inndata {
    display: inline-flex;
    align-items: stretch;
    width: 220px;
    max-width: 100%;
    border: var(--control-border);
    border-radius: var(--r-felt);
  }
  .inndata.tekst {
    width: 100%;
  }
  .inndata.kort {
    width: 140px;
  }
  .inndata input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: 0;
    font: 16px var(--font-sans);
    color: var(--ink);
    background: var(--surface);
    outline: none;
  }
  .inndata:not(.tekst, .kort) input {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .enhet {
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
  .datofelt {
    width: 12em;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: 16px var(--font-sans);
    color: var(--ink);
    background: var(--surface);
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
  .inndata.ugyldig,
  .datofelt.ugyldig,
  textarea.ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
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
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .liten {
    font-size: 12px;
  }
  .hensyn {
    padding-left: var(--spacing-5);
    list-style: disc;
  }
  .handling {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  .feste.fast {
    position: sticky;
    top: var(--spacing-4);
    z-index: 1;
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
</style>
