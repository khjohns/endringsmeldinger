<!--
  Varden: eksperimentell saksvisning (#1331, konseptet i docs/design/konsept-varden/). Panelet
  til venstre har logoen, saken og sporene, som i dagens visning (oppdragsgiver 29.10, #1391).
  Arbeidet i sporet står under topplinja, med tidslinja og panelene i høyre kolonne (valget 27.10). Saken er den samme `lagKjernesak` gir dagens
  visning: brevteksten, handlingene og avvisningene kommer fra kjernen.
-->
<script lang="ts">
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { Spor } from '$kjerne/typer';
  import { tick, untrack, type Snippet } from 'svelte';
  import { sakensKode } from '$kjerne/frosset/tekst';
  import Brevkontroll, { kontrollbrev, type TilBrevkontrollen } from './Brevkontroll.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Sporlesing from './Sporlesing.svelte';
  import Vardenskall, { type Smule } from './Vardenskall.svelte';
  import Vederlagssvar from './Vederlagssvar.svelte';
  import Fristsvar from './Fristsvar.svelte';
  import { tomtFristsvar } from './fristsvar';
  import Vederlagskrav from './Vederlagskrav.svelte';
  import Fristkrav from './Fristkrav.svelte';
  import type { Fristkravvalg } from './fristkrav';
  import type { Kravvalg } from './vederlagskrav';
  import Korrigering from './Korrigering.svelte';
  import Paaberopelsesversjon from './Paaberopelsesversjon.svelte';
  import { tomtSvar, type Korrigeringsvalg } from './kommandoer';
  import { kontraktFraProsjektet, settOrganisasjoner, type Kontrakt } from './kontrakt';
  import {
    betegnelsene,
    brevForLinja,
    brevene,
    datoopplysningene,
    forholdetISaken,
    type Brevref,
  } from './lesing';
  import {
    BETEGNELSE,
    BREVKONTROLL,
    KORRIGERING,
    KRAVSKJEMA,
    FRISTKRAV,
    MOTTATT,
    NYVERSJON,
    NYSAK,
    SAKEN,
    SPORNAVN,
    STILLING,
  } from './tekster';

  let {
    kjernesak,
    kontrakt,
    kvittering,
    saksliste,
    prosjekter,
    bruker = null,
    nySak,
    spor,
    nySakLenke,
  }: {
    kjernesak: Kjernesakkontekst;
    /** Sporet saken åpner i. Uten det står saken i vederlaget, eller i forholdet etter opprettelsen. */
    spor?: Spor;
    /** Kvitteringen for brevet som opprettet saken (BF-05 steg 6, F-6). */
    kvittering?: string;
    /** Lenken til sakslisten, i stien og der saken ikke finnes (#1473). */
    saksliste?: string;
    /** Lenken til prosjektene, «Varden» først i stien. */
    prosjekter?: string;
    /** Den innloggede, i topplinja. Demoruta har ingen. */
    bruker?: { name: string } | null;
    /** Skjemaet for ny sak, som står i arbeidsflaten før saken finnes (BF-05, KT-U11). */
    nySak?: Snippet;
    /** Lenken til skjemaet for ny sak, for en annen hjemmel eller endringsordre (BF-10 U-2). */
    nySakLenke?: string;
    /** Prosjektet og partene i demoruta. Ellers leses de av prosjektet (#1398). */
    kontrakt?: Kontrakt;
  } = $props();
  // Serveren gir partsnavnene når driften har satt dem, men ikke kontraktsformen (#1398).
  const kontrakten = $derived(kontrakt ?? kontraktFraProsjektet());
  settOrganisasjoner(() => {
    const k = kontrakten;
    // Et tomt navn er ikke et navn (#1398), som i kontraktsradene.
    return { BH: k.byggherre || undefined, TE: k.entreprenoer || undefined };
  });

  type Kontroll = TilBrevkontrollen & {
    handling: string;
    /** Bare mottakeren i faktaene, for den nye versjonen (oppdragsgiver 07.11, PR 1650). */
    bareMottaker?: boolean;
    sendTekst: string;
    tilbakeTil: string;
    svarerPaa: Brevref | null;
    henvisning?: string;
    relasjoner?: { hva: string; brev: string }[];
    /** Kvitteringen etter sendingen, ellers den generelle. */
    kvittering?: string;
    tilbake: Arbeid;
    /** Sporet når brevet er svarutkastet i sporet, som tømmes når det er sendt. */
    utkastet: Svarspor | null;
    /** Sakens versjon da brevkontrollen ble åpnet. */
    versjon: number | null;
    /** Vedleggene kommandoen viser til, som kjernen trenger for brevet (VS-U53). */
    vedlegg?: ReadonlyMap<string, { vedlegg_id: string; filnavn: string; innhold_sha256: string }>;
  };
  type Svarspor = Exclude<Spor, 'forhold'>;
  type Arbeid =
    | { art: 'les' }
    | { art: 'svar' }
    | { art: 'korrigering'; gjelder: string }
    | { art: 'nyversjon' }
    | { art: 'vederlagskrav' }
    | { art: 'fristkrav' }
    | ({ art: 'kontroll' } & Kontroll);

  const SPORGRUPPENE: { id: string; etikett: string; spor: Spor[] }[] = [
    { id: 'forholdet', etikett: SAKEN.kontraktsforhold, spor: ['forhold'] },
    { id: 'kravene', etikett: SAKEN.krav, spor: ['vederlag', 'frist'] },
  ];
  // Etter opprettelsen står saken i forholdet, med påberopelsen (BF-05 steg 6).
  let valgt = $state<Spor>(untrack(() => spor ?? (kvittering ? 'forhold' : 'vederlag')));
  let arbeid = $state<Arbeid>({ art: 'les' });
  let svarvalg = $state(tomtSvar());
  // Kravet om vederlagsjustering står når TE går til brevkontrollen og tilbake (BF-14).
  let kravvalg = $state<Kravvalg | null>(null);
  // Kravet om fristforlengelse står på samme måte (G-3 i BF-20).
  let fristkravvalg = $state<Fristkravvalg | null>(null);
  // Datoen og forklaringen står når TE går til brevkontrollen og tilbake (U-3 i BF-02A).
  let korrigeringsvalg = $state<Korrigeringsvalg>({ dato: '', forklaring: '' });
  // Teksten i den nye versjonen står mens TE korrigerer datoen (U-2 i BF-10).
  let nyVersjonstekst = $state<string | null>(null);
  // Mens brevet leses ved siden av skjemaet, felles panelet til venstre inn, så brevet blir
  // omtrent like bredt som ellers (oppdragsgiver 30.10, #1391).
  let vedSiden = $state(false);
  // Utkastet til svaret står til det er sendt eller forkastet, også når BH velger et annet
  // spor (BF-01 S-8). Merket i panelet vises bare når et annet spor er valgt (#1391).
  let utkastAapent = $state<Record<Svarspor, boolean>>({ vederlag: false, frist: false });
  let fristsvarvalg = $state(tomtFristsvar());
  const harUtkast = (s: Spor) => s !== 'forhold' && utkastAapent[s];
  let melding = $state<{ tekst: string; art: 'sendt' | 'forkastet' | 'endret' } | null>(
    untrack(() => (kvittering ? { tekst: kvittering, art: 'sendt' } : null))
  );
  let meldingen = $state<HTMLElement | null>(null);
  let proever = $state(false);
  let sistForsoekt = $state<string | null>(null);

  const u = $derived(kjernesak.utledning);
  const brev = $derived(u ? brevene(u) : []);
  // Forholdet heter det TE påberoper i sporlista, som i sporhodet (OV-U78).
  const forholdsnavn = $derived((u && forholdetISaken(u)?.navn) ?? SPORNAVN.forhold);
  const sakskode = $derived.by(() => {
    const kode = kjernesak.sak?.merking?.sakskode;
    return kode ? sakensKode(kode) : null;
  });
  // Stien som i prototypen: Varden › prosjektet › saken, med sakens kode (LV-U46).
  const sti = $derived.by((): Smule[] => {
    const prosjekt = kontrakten.prosjekt;
    return [
      { tekst: SAKEN.merkenavn, href: prosjekter },
      ...(prosjekt ? [{ tekst: prosjekt, href: saksliste }] : []),
      { tekst: nySak ? NYSAK.over : (sakskode ?? SAKEN.nav) },
    ];
  });

  // Det løsningen vet om hvert spor, under navnet i panelet: betegnelsen og siste brev (panel B,
  // #1899). Ikke hvem som skal handle (system.md, «Visningen sier det løsningen vet»).
  const sporlinjer = $derived.by(() => {
    const betegnelser = betegnelsene(kjernesak.saksbilde);
    const linje = (s: Spor) => {
      const b = u ? brevForLinja(brev, s, u.spor[s].trukket) : undefined;
      const kode = betegnelser[s];
      return {
        betegnelse: kode ? BETEGNELSE[kode] : null,
        siste: b ? SAKEN.siste(b, b.avsender) : null,
      };
    };
    return { forhold: linje('forhold'), vederlag: linje('vederlag'), frist: linje('frist') };
  });
  const parter = $derived(
    [
      [SAKEN.entreprenoer, kontrakten.entreprenoer],
      [SAKEN.byggherre, kontrakten.byggherre],
    ].filter((r): r is [string, string] => !!r[1])
  );
  const partensLenke = $derived(kjernesak.part === 'TE' ? (nySakLenke ?? null) : null);

  // Svarutkastet i sporet er sendt eller forkastet.
  function tomtUtkast(s: Svarspor) {
    if (s === 'vederlag') svarvalg = tomtSvar();
    else fristsvarvalg = tomtFristsvar();
    utkastAapent[s] = false;
  }

  // Brevkontrollen for BHs svar i sporet, som svarer på gjeldende krav.
  function tilSvarkontroll(s: Svarspor, k: TilBrevkontrollen) {
    const krav = brev.find((b) => b.id === u?.spor[s].gjeldendeKrav?.dokument);
    melding = null;
    arbeid = {
      art: 'kontroll',
      versjon: kjernesak.versjon,
      ...k,
      handling: BREVKONTROLL.sendSvaret,
      sendTekst: BREVKONTROLL.sendSvaret,
      tilbakeTil: 'utkastet',
      svarerPaa: krav ?? null,
      tilbake: { art: 'svar' },
      utkastet: s,
    };
  }

  function velgSpor(s: Spor) {
    valgt = s;
    arbeid = harUtkast(s) ? { art: 'svar' } : { art: 'les' };
    melding = null;
  }

  async function proevIgjen() {
    proever = true;
    try {
      await kjernesak.last();
    } finally {
      proever = false;
      sistForsoekt = new Date().toISOString();
    }
  }

  function sendt() {
    // Bare det sendte svaret tømmer utkastet; en aksept i et annet spor lar det stå (BF-01 S-8).
    if (arbeid.art === 'kontroll' && arbeid.utkastet) tomtUtkast(arbeid.utkastet);
    const kvittering = arbeid.art === 'kontroll' ? arbeid.kvittering : undefined;
    if (arbeid.art === 'kontroll' && arbeid.tilbake.art === 'korrigering')
      korrigeringsvalg = { dato: '', forklaring: '' };
    if (arbeid.art === 'kontroll' && arbeid.tilbake.art === 'nyversjon') nyVersjonstekst = null;
    if (arbeid.art === 'kontroll' && arbeid.tilbake.art === 'vederlagskrav') kravvalg = null;
    if (arbeid.art === 'kontroll' && arbeid.tilbake.art === 'fristkrav') fristkravvalg = null;
    arbeid = { art: 'les' };
    melding = { tekst: kvittering ?? MOTTATT.dittBrev, art: 'sendt' };
  }

  async function forkastKorrigeringen() {
    korrigeringsvalg = { dato: '', forklaring: '' };
    arbeid = { art: 'les' };
    melding = { tekst: MOTTATT.forkastet, art: 'forkastet' };
    await tick();
    meldingen?.focus();
  }

  /**
   * Etter en avvist sending kan saken være lastet på nytt. Har den fått en ny versjon, kan
   * «Svarer på», «Dette sender du» og virkningene være endret, og de regnes i skjemaet. Avsenderen
   * går da tilbake dit med valgene i behold, og brevkontrollen bygges på nytt derfra (oppdragsgiver
   * 07.11, punkt 2 i #1596). Er versjonen uendret, kan en annen sak ha fått nummeret. Brevet lages
   * da igjen av den samme kommandoen, så teksten og hodet avsenderen godkjenner, er det som sendes
   * (LV-U2, LV-U51, D-5 i BF-07). Avviser kjernen kommandoen nå, står brevet og meldingen fra
   * sendingen.
   */
  async function byggPaaNytt(k: Kontroll) {
    if (arbeid.art !== 'kontroll' || arbeid.kommando !== k.kommando) return;
    if (kjernesak.versjon !== k.versjon) {
      kjernesak.fjernFeil();
      arbeid = k.tilbake;
      melding = { tekst: MOTTATT.sakenEndret, art: 'endret' };
      await tick();
      meldingen?.focus();
      return;
    }
    const brevet = kontrollbrev(kjernesak.brev(k.kommando, k.vedlegg, true));
    if (!brevet) return;
    // LV-U2.
    arbeid = { ...arbeid, ...brevet };
  }

  /**
   * Skjemaene Varden åpner fra «Det du kan gjøre nå», med hele nøkkelen fra kjernen. Bare en
   * nøkkel her blir en knapp som åpner noe; resten sier at handlingen ikke er bygget (#1636, #1663).
   */
  const skjemaene: Record<string, () => void> = {
    'svare:vederlag': () => {
      utkastAapent.vederlag = true;
      arbeid = { art: 'svar' };
    },
    'svare:frist': () => {
      utkastAapent.frist = true;
      arbeid = { art: 'svar' };
    },
    'krav:forhold': () => (arbeid = { art: 'nyversjon' }),
    'krav:vederlag': () => (arbeid = { art: 'vederlagskrav' }),
    'krav:frist': () => (arbeid = { art: 'fristkrav' }),
  };
  const skjemanoeklene = Object.keys(skjemaene);

  /**
   * Skjemaet for korrigeringen vises når kjernen tilbyr den og opplysningen står i et brev i saken
   * (#1647).
   */
  const kanKorrigere = (gjelder: string) =>
    kjernesak.handlinger.includes(`korrigere:${gjelder}`) &&
    !!u &&
    datoopplysningene(u).some((o) => o.id === gjelder);

  async function forkastNyVersjon() {
    nyVersjonstekst = null;
    arbeid = { art: 'les' };
    melding = { tekst: MOTTATT.forkastet, art: 'forkastet' };
    await tick();
    meldingen?.focus();
  }

  async function forkastKravet() {
    kravvalg = null;
    fristkravvalg = null;
    arbeid = { art: 'les' };
    melding = { tekst: MOTTATT.forkastet, art: 'forkastet' };
    await tick();
    meldingen?.focus();
  }

  async function forkast() {
    if (valgt !== 'forhold') tomtUtkast(valgt);
    arbeid = { art: 'les' };
    melding = { tekst: MOTTATT.forkastet, art: 'forkastet' };
    await tick();
    meldingen?.focus();
  }
</script>

<Vardenskall
  {sti}
  {bruker}
  {kontrakt}
  visKontrakten={!!nySak}
  innfelt={vedSiden}
  bred
  toArk={!nySak && valgt === 'forhold' && arbeid.art === 'les'}
  sakstittel={nySak ? null : (kjernesak.saksbilde?.tittel ?? null)}
>
  {#snippet topplinje()}
    {#if partensLenke && !nySak}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
      <a class="topplenke" href={partensLenke}>{SAKEN.nyttKrav}</a>
    {/if}
  {/snippet}
  {#snippet sporrad()}
    {#if !nySak && u && kjernesak.saksbilde}
      <nav class="sporrad" aria-label={SAKEN.sporene}>
        {#each SPORGRUPPENE.flatMap((g) => g.spor) as s (s)}
          <button
            type="button"
            aria-current={valgt === s ? 'page' : undefined}
            onclick={() => velgSpor(s)}
            >{s === 'forhold' ? forholdsnavn : SPORNAVN[s]}{#if harUtkast(s) && valgt !== s}<span
                class="merke-utkast">{SAKEN.utkast}</span
              >{/if}</button
          >
        {/each}
      </nav>
    {/if}
  {/snippet}
  {#snippet panel()}
    {#if !nySak && u && kjernesak.saksbilde}
      <header class="omslag">
        {#if sakskode}<p class="kode">{sakskode}</p>{/if}
        <h1>{kjernesak.saksbilde.tittel}</h1>
        {#if parter.length}
          <dl class="parter">
            {#each parter as [etikett, navn] (etikett)}
              <div>
                <dt>{etikett}</dt>
                <dd>{navn}</dd>
              </div>
            {/each}
          </dl>
        {/if}
        {#if u.ikkeVurderteBrev.length}<p class="merknad">{SAKEN.dokumentasjonIkkeSendt}</p>{/if}
      </header>

      <!-- Forholdet og kravene som bygger på det, i hver sin gruppe (oppdragsgiver 06.11, #1631). -->
      <nav class="sporene" aria-label={SAKEN.sporene}>
        {#each SPORGRUPPENE as gruppe (gruppe.id)}
          <div class="gruppe">
            <p class="etikett" id={`spor-${gruppe.id}`}>{gruppe.etikett}</p>
            <ul class="valgene" aria-labelledby={`spor-${gruppe.id}`}>
              {#each gruppe.spor as s (s)}
                {@const l = sporlinjer[s]}
                <li>
                  <button
                    type="button"
                    class="valg"
                    aria-current={valgt === s ? 'page' : undefined}
                    onclick={() => velgSpor(s)}
                  >
                    <span class="navn">
                      {s === 'forhold' ? forholdsnavn : SPORNAVN[s]}
                      {#if harUtkast(s) && valgt !== s}<span class="merke-utkast"
                          >{SAKEN.utkast}</span
                        >{/if}
                    </span>
                    {#if l.betegnelse}<span class="st">{l.betegnelse}</span>{/if}
                    {#if l.siste}<span class="st2">{l.siste}</span>{/if}
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
    {/if}
  {/snippet}

  {#if nySak}
    <main class="arbeid">
      <!-- Kvitteringen etter «Avbryt» står over skjemaet, som etter sendingen. -->
      {#if melding}<div class="melding" role="status">
          <Melding art="kvittering" levende={false}>{melding.tekst}</Melding>
        </div>{/if}
      {@render nySak()}
    </main>
  {:else if kjernesak.finnes === false}
    <div class="lastefeil" role="alert">
      <h1>{SAKEN.finnesIkke}</h1>
      <p>{SAKEN.finnesIkkeForklaring}</p>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
      {#if saksliste}<p><a href={saksliste}>{SAKEN.tilSakslisten}</a></p>{/if}
    </div>
  {:else if (!u || !kjernesak.saksbilde) && kjernesak.feil}
    <div class="lastefeil" role="alert">
      <h1>{SAKEN.lastefeil}</h1>
      <p>{SAKEN.lastefeilBeklager}</p>
      <p class="detaljer">{SAKEN.lastefeilDetaljer(kjernesak.feil)}</p>
      {#if sistForsoekt && !proever}<p class="detaljer">
          {SAKEN.sistForsoekt(sistForsoekt)}
        </p>{/if}
      <Knapp opptatt={proever} onclick={proevIgjen}
        >{proever ? SAKEN.proever : SAKEN.proevIgjen}</Knapp
      >
    </div>
  {:else if !u || !kjernesak.saksbilde}
    <p class="laster" role="status">{SAKEN.laster}</p>
  {:else}
    <main class="arbeid">
      <div class="melding" class:tom={!melding} role="status" tabindex="-1" bind:this={meldingen}>
        {#if melding}<Melding art={melding.art === 'endret' ? 'info' : 'kvittering'} levende={false}
            >{melding.tekst}</Melding
          >{/if}
      </div>
      {#if arbeid.art === 'kontroll'}
        {@const k = arbeid}
        <Brevkontroll
          {...k}
          {kjernesak}
          ontilbake={() => (arbeid = k.tilbake)}
          onsendt={sendt}
          onavvist={() => byggPaaNytt(k)}
        />
      {:else if arbeid.art === 'korrigering' && kanKorrigere(arbeid.gjelder)}
        {@const gjelder = arbeid.gjelder}
        <Korrigering
          {kjernesak}
          {u}
          {gjelder}
          bind:valg={korrigeringsvalg}
          onforkast={forkastKorrigeringen}
          onbrevkontroll={(k) => {
            const viserTil = datoopplysningene(u).find((o) => o.id === gjelder)?.brev ?? null;
            melding = null;
            arbeid = {
              art: 'kontroll',
              versjon: kjernesak.versjon,
              ...k,
              handling: KORRIGERING.handling,
              sendTekst: KORRIGERING.sendTekst,
              tilbakeTil: KORRIGERING.tilbakeTil,
              svarerPaa: viserTil,
              henvisning: BREVKONTROLL.viserTil,
              kvittering: KORRIGERING.kvittering(
                (k.kommando.paalegg_mottatt ?? k.kommando.klar_over_forholdet) as string,
                k.kommando.paalegg_mottatt ? 'paalegg_mottatt' : 'klar_over_forholdet',
                u.forholdAvvist,
                !!u.spor.forhold.gjeldendeSvar
              ),
              tilbake: { art: 'korrigering', gjelder },
              utkastet: null,
            };
          }}
        />
      {:else if arbeid.art === 'nyversjon' && valgt === 'forhold' && kjernesak.handlinger.includes('krav:forhold') && u.spor.forhold.gjeldendeKrav}
        <Paaberopelsesversjon
          {kjernesak}
          {u}
          bind:tekst={nyVersjonstekst}
          onforkast={forkastNyVersjon}
          ontilbake={() => velgSpor('forhold')}
          onvedsiden={(v) => (vedSiden = v)}
          onbrevkontroll={(k) => {
            const svaret = brev.find((b) => b.id === u.spor.forhold.gjeldendeSvar?.dokument);
            const kravet = brev.find((b) => b.id === u.spor.forhold.gjeldendeKrav?.dokument);
            melding = null;
            arbeid = {
              art: 'kontroll',
              versjon: kjernesak.versjon,
              ...k,
              handling: NYVERSJON.kontroller,
              bareMottaker: true,
              sendTekst: NYVERSJON.sendTekst,
              tilbakeTil: NYVERSJON.tilbakeTil,
              svarerPaa: svaret ?? null,
              henvisning: BREVKONTROLL.viserTil,
              relasjoner: [
                ...(kravet
                  ? [{ hva: NYVERSJON.forrigeBrev, brev: NYVERSJON.forrigeBrevet(kravet) }]
                  : []),
                ...(svaret
                  ? [{ hva: BREVKONTROLL.viserTil, brev: NYVERSJON.viserTilBrev(svaret) }]
                  : []),
              ],
              kvittering: NYVERSJON.kvittering,
              tilbake: { art: 'nyversjon' },
              utkastet: null,
            };
          }}
        />
      {:else if arbeid.art === 'vederlagskrav' && valgt === 'vederlag' && kjernesak.handlinger.includes('krav:vederlag')}
        <Vederlagskrav
          {kjernesak}
          {u}
          bind:valg={kravvalg}
          onforkast={forkastKravet}
          onvedsiden={(v) => (vedSiden = v)}
          onbrevkontroll={(k) => {
            const kravet = brev.find((b) => b.id === u.spor.vederlag.gjeldendeKrav?.dokument);
            const svaret = brev.find((b) => b.id === u.spor.vederlag.gjeldendeSvar?.dokument);
            melding = null;
            arbeid = {
              art: 'kontroll',
              versjon: kjernesak.versjon,
              ...k,
              handling: KRAVSKJEMA.kontroller,
              bareMottaker: true,
              sendTekst: KRAVSKJEMA.sendTekst,
              tilbakeTil: KRAVSKJEMA.tilbakeTil,
              svarerPaa: null,
              relasjoner: [
                ...(kravet
                  ? [{ hva: NYVERSJON.forrigeBrev, brev: KRAVSKJEMA.forrigeKravet(kravet) }]
                  : []),
                ...(svaret
                  ? [{ hva: BREVKONTROLL.viserTil, brev: NYVERSJON.viserTilBrev(svaret) }]
                  : []),
              ],
              kvittering: KRAVSKJEMA.kvittering,
              tilbake: { art: 'vederlagskrav' },
              utkastet: null,
            };
          }}
        />
      {:else if arbeid.art === 'fristkrav' && valgt === 'frist' && kjernesak.handlinger.includes('krav:frist')}
        <Fristkrav
          {kjernesak}
          {u}
          bind:valg={fristkravvalg}
          onforkast={forkastKravet}
          onbrevkontroll={(k) => {
            const kravet = brev.find((b) => b.id === u.spor.frist.gjeldendeKrav?.dokument);
            const svaret = brev.find((b) => b.id === u.spor.frist.gjeldendeSvar?.dokument);
            melding = null;
            arbeid = {
              art: 'kontroll',
              versjon: kjernesak.versjon,
              ...k,
              handling: FRISTKRAV.kontroller,
              bareMottaker: true,
              sendTekst: FRISTKRAV.sendTekst,
              tilbakeTil: FRISTKRAV.tilbakeTil,
              svarerPaa: null,
              relasjoner: [
                ...(kravet
                  ? [{ hva: NYVERSJON.forrigeBrev, brev: KRAVSKJEMA.forrigeKravet(kravet) }]
                  : []),
                ...(svaret
                  ? [{ hva: BREVKONTROLL.viserTil, brev: NYVERSJON.viserTilBrev(svaret) }]
                  : []),
              ],
              kvittering: FRISTKRAV.kvittering,
              tilbake: { art: 'fristkrav' },
              utkastet: null,
            };
          }}
        />
      {:else if arbeid.art === 'svar' && valgt === 'vederlag' && kjernesak.handlinger.includes('svare:vederlag')}
        <Vederlagssvar
          {kjernesak}
          {u}
          bind:valg={svarvalg}
          onforkast={forkast}
          onvedsiden={(v) => (vedSiden = v)}
          onbrevkontroll={(k) => tilSvarkontroll('vederlag', k)}
        />
      {:else if arbeid.art === 'svar' && valgt === 'frist' && kjernesak.handlinger.includes('svare:frist')}
        <Fristsvar
          {kjernesak}
          {u}
          bind:valg={fristsvarvalg}
          onforkast={forkast}
          onvedsiden={(v) => (vedSiden = v)}
          onbrevkontroll={(k) => tilSvarkontroll('frist', k)}
        />
      {:else}
        {#key valgt}
          <Sporlesing
            {kjernesak}
            {u}
            spor={valgt}
            nySak={valgt === 'forhold' && kjernesak.handlinger.includes('krav:forhold')
              ? nySakLenke
              : undefined}
            onspor={velgSpor}
            onkorriger={(gjelder) => {
              melding = null;
              arbeid = { art: 'korrigering', gjelder };
            }}
            skjemaene={skjemanoeklene}
            onvelg={(n) => {
              melding = null;
              if (Object.hasOwn(skjemaene, n)) skjemaene[n]();
            }}
            onakseptbrev={(k) => {
              const svaret = brev.find((b) => b.id === u.spor[valgt].gjeldendeSvar?.dokument);
              melding = null;
              arbeid = {
                art: 'kontroll',
                versjon: kjernesak.versjon,
                ...k,
                detteSender: svaret ? [{ tekst: STILLING.godtarBrev(svaret), lag: null }] : [],
                handling: BREVKONTROLL.sendAksepten,
                sendTekst: BREVKONTROLL.sendAksepten,
                tilbakeTil: 'saken',
                svarerPaa: svaret ?? null,
                tilbake: harUtkast(valgt) ? { art: 'svar' } : { art: 'les' },
                utkastet: null,
              };
            }}
          />
        {/key}
      {/if}
    </main>
  {/if}
</Vardenskall>

<style>
  h1 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: var(--sperring-24);
    text-wrap: balance;
  }
  /* Saksomslaget: saken og partene øverst (panel B, oppdragsgiver 13.11). */
  .omslag h1 {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: var(--sperring-20);
    text-wrap: balance;
  }
  .kode {
    margin-bottom: var(--spacing-1);
    color: var(--sidebar-muted);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }
  /* Etiketten står over navnet, så et langt firmanavn får hele bredden (oppdragsgiver 13.11). */
  .parter {
    display: grid;
    gap: var(--spacing-3);
    margin-top: var(--spacing-4);
  }
  .parter div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .parter dt {
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  .parter dd {
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .merknad {
    margin-top: var(--spacing-3);
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  .sporene {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
  }
  .sporene .etikett {
    text-transform: none;
    letter-spacing: 0;
  }
  .sporene .valgene {
    margin: 0 calc(-1 * var(--spacing-5));
  }
  .sporene .valg {
    min-height: 0;
    padding: 10px var(--spacing-5) 10px 17px;
    border-radius: 0;
  }
  .navn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 16px;
    font-weight: 500;
  }
  .valg[aria-current='page'] .navn {
    font-weight: 600;
  }
  .st {
    font-size: 14px;
    font-weight: 400;
  }
  .st2 {
    color: var(--sidebar-muted);
    font-size: 12px;
    font-weight: 400;
  }
  .topplenke {
    color: var(--ink);
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .topplenke:hover {
    text-decoration-thickness: 2px;
  }
  .topplenke:focus-visible,
  .sporrad button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .sporrad {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1) var(--spacing-6);
  }
  .sporrad button {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: 9px 0;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    font: inherit;
    color: var(--ink-2);
    cursor: pointer;
  }
  .sporrad button:hover {
    color: var(--ink);
    border-bottom-color: var(--rule-strong-color);
  }
  .sporrad button[aria-current='page'] {
    color: var(--ink);
    font-weight: 600;
    border-bottom-color: var(--ink);
  }
  .merke-utkast {
    padding: 0 var(--spacing-2);
    border-radius: var(--r-merke);
    font-size: 12px;
    font-weight: 500;
    border: 1px dashed var(--draft-border);
    background: var(--surface);
    color: var(--draft);
  }
  .arbeid {
    min-width: 0;
    padding: 28px var(--kant) 64px;
  }
  .laster,
  .lastefeil {
    padding: var(--spacing-6) var(--kant) var(--spacing-12);
  }
  .laster {
    color: var(--ink-2);
  }
  .lastefeil {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-3);
  }
  .lastefeil .detaljer {
    color: var(--ink-3);
    font-size: 14px;
  }
  .melding.tom {
    display: none;
  }
  .melding {
    max-width: var(--varden-arbeid);
    margin: 0 auto var(--spacing-4);
  }
  .melding:focus {
    outline: none;
  }
  /* På smal skjerm står sporene som faner over arbeidet (panel B i prototypen). */
  @media (max-width: 860px) {
    .sporene {
      flex-direction: row;
      gap: 0;
      margin: 0 calc(-1 * var(--spacing-4));
      overflow-x: auto;
    }
    .sporene .etikett,
    .st2 {
      display: none;
    }
    .sporene .gruppe {
      flex: none;
    }
    .sporene .valgene {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      margin: 0;
    }
    .sporene .valg {
      flex: none;
      width: auto;
      max-width: 15rem;
      padding: var(--spacing-2) var(--spacing-4);
      border-left: 0;
      border-bottom: 3px solid transparent;
    }
    .sporene .valg[aria-current='page'] {
      border-bottom-color: var(--sidebar-text);
    }
    .navn {
      font-size: 14px;
    }
    .arbeid,
    .laster,
    .lastefeil {
      padding: var(--spacing-4);
    }
  }
</style>
