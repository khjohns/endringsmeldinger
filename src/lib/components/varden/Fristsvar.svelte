<!--
  BH skriver svar på krav om fristforlengelse (G-4 i BF-20, prototypene `fristsvar.html` og
  `fristkrav-te.html#svar`), i samme oppbygning som svaret på vederlaget: skjemaet vurderer,
  panelet viser hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt. Ingenting er
  forhåndsvalgt (U-14). Varselet, forespørselen, hindringen og spesifiseringen besvares én gang for
  hele kravet, og dagene for hver frist (KA-U74, KA-U80). Kommandoen bygges i `fristsvar.ts`, og
  kjernen regner resultatet og lagene, lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { BookOpen, FileText } from 'lucide-svelte';
  import { tick, untrack } from 'svelte';
  import { betegnelsen, innholdIFristen } from '$kjerne/spor/frist/format';
  import { foresporselForFristsvar } from '$kjerne/spor/frist/utledning';
  import type { Forutsetning } from '$kjerne/spor/frist/kommando';
  import type { Utledning } from '$kjerne/utledning/utled';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { VIRKNING } from '$lib/kjernesak/svarvirkning';
  import { kontrollbrev, type TilBrevkontrollen } from './Brevkontroll.svelte';
  import { fastLinje } from './fastlinje.svelte';
  import { medietreff } from './medie.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Infotips from './Infotips.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Postliste from './Postliste.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import Valg from './Valg.svelte';
  import {
    fristsvaret,
    godkjenteDager,
    heleDager,
    fristvalget,
    tomFrist,
    tomtFristsvar,
    type Fristsvarvalg,
    type Fristvalg,
  } from './fristsvar';
  import {
    brevene,
    brevet,
    datoerISporet,
    hovedkategorien,
    klarOverForholdet,
    standpunktene,
  } from './lesing';
  import {
    BREVKONTROLL,
    FRISTSVAR,
    HOVEDLINJER,
    SKJEMA,
    brevhode,
    brevtittel,
    dato,
    grunntekst,
    kalenderdager,
    standpunkttekst,
  } from './tekster';

  let {
    kjernesak,
    u,
    valg = $bindable(tomtFristsvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når BH går til brevkontrollen og tilbake. */
    valg?: Fristsvarvalg;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();

  /** En frist i `Postliste`: `betegnelse` er fristens `id`, så den kan stå i ID-ene i skjemaet. */
  type Fristpost = {
    id: string;
    betegnelse: string;
    beskrivelse: string;
    navn: string;
    dager: number;
  };

  const krav = $derived(u.spor.frist.gjeldendeKrav!);
  const frister = $derived(
    innholdIFristen(krav).frister.map(
      (f): Fristpost => ({
        id: f.id,
        betegnelse: f.id,
        beskrivelse: '',
        navn: betegnelsen(f),
        dager: f.dager,
      })
    )
  );
  const flere = $derived(frister.length > 1);
  const alleBrev = $derived(brevene(u));
  const kravbrevet = $derived(alleBrev.find((b) => b.id === krav.dokument)!);
  // Datoen kravet ble sendt, som i svaret på vederlaget (LV-U42, OV-U85, #1596).
  const kravSendt = $derived(
    kravbrevet.sendt ?? (kravbrevet.art === 'registrert' ? null : kravbrevet.registrert)
  );
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes('frist')));
  const datoer = $derived(datoerISporet(u, 'frist'));
  const klarOver = $derived(klarOverForholdet(u));
  // VS-U17, VS-U29: svaret tar stilling til forespørselen når kjernen leser en.
  const foresporselen = $derived(foresporselForFristsvar(u) !== null);
  // § 33.3 for force majeure, ellers § 33.1, som brevteksten i kjernen.
  const hindringPunkt = $derived(hovedkategorien(u) === 'force_majeure' ? '33.3' : '33.1');

  let valgtFrist = $state<string | null>(null);
  let postliste = $state<Postliste<Fristpost> | null>(null);
  // Valgene for hver frist finnes før skjemaet tegnes første gang.
  untrack(() => {
    for (const f of frister) valg.frister[f.id] ??= tomFrist();
  });
  const valgFor = (id: string): Fristvalg => (valg.frister[id] ??= tomFrist());
  function godkjennAlle() {
    for (const f of frister) valgFor(f.id).dager = 'alle';
  }

  // Innledningen har ingen begrunnelse, og forbeholdet har sitt eget felt.
  const UTEN_BEGRUNNELSE = ['innledning', 'forbehold'];
  // LV-U71: ett felt for begrunnelsen per punkt i brevet, i brevets rekkefølge, lest av brevet
  // kjernen lager uten begrunnelsene. Valgene uten tekstene, så lista ikke lages på nytt for hvert
  // tegn i et tekstfelt.
  const punktene = $derived.by(() => {
    const valgene = {
      varselITide: valg.varselITide,
      foresporselITide: valg.foresporselITide,
      hindret: valg.hindret,
      spesifisertITide: valg.spesifisertITide,
      frister: valg.frister,
      begrunnelser: {},
      forbehold: '',
    };
    const b = kjernesak.brev(fristsvaret(valgene, u, kjernesak.regler)!);
    const avsnitt = b && 'avsnitt' in b ? (b.avsnitt ?? []) : [];
    return avsnitt.flatMap((a) =>
      a.punkt === undefined || UTEN_BEGRUNNELSE.includes(a.punkt)
        ? []
        : [{ punkt: a.punkt, navn: a.overskrift ?? a.laast.split('\n\n')[0]! }]
    );
  });
  const kommando = $derived(
    fristsvaret(
      valg,
      u,
      kjernesak.regler,
      punktene.map((p) => p.punkt)
    )!
  );
  const etter = $derived(kjernesak.forhaandsvist(kommando));
  // Hvert spørsmål står i laget sitt uansett svaret (OV-U33), så kjernen spørres med de ubesvarte
  // spørsmålene besvart uten innsigelse: da har hvert av dem et standpunkt, og ingen nye lag. Dagene
  // påvirker ikke lagene, men kjernen kontrollerer formen på standpunktene i utkastet, og der må
  // dagene byggherren måtte forstå være tall.
  const lagene = $derived.by(() => {
    const s = kommando.svar[0];
    const v = s.vurderinger;
    const frister = (v.frister as Record<string, unknown>[]).map((f) =>
      v.spesifisert_krav_ok === false
        ? { ...f, dager_maatte_forstaa: f.dager_maatte_forstaa ?? 0 }
        : f
    );
    return kjernesak.lagForUtkastet(
      {
        ...s,
        vurderinger: {
          ...v,
          frist_varsel_ok: v.frist_varsel_ok ?? true,
          ...(foresporselen ? { foresporsel_svar_ok: v.foresporsel_svar_ok ?? true } : {}),
          vilkar_oppfylt: v.vilkar_oppfylt ?? true,
          spesifisert_krav_ok: v.spesifisert_krav_ok ?? true,
          frister,
        },
      },
      'frist'
    );
  });
  type Lagene = NonNullable<typeof lagene>['standpunkter'][number];
  const forutsetninger = (passer: (x: Lagene) => boolean): Forutsetning[] =>
    lagene?.standpunkter.find(passer)?.forutsetninger ?? [];
  const forDagene = (id: string) => forutsetninger((x) => x.art === 'dager' && x.gjelder === id);
  const grunnene = $derived(frister[0] ? forDagene(frister[0].id).filter((f) => 'grunn' in f) : []);
  const hindringslagene = $derived(forutsetninger((x) => x.art === 'hindring'));
  const spesifiseringslagene = $derived(forutsetninger((x) => x.art === 'spesifisering'));
  const foresporselslagene = $derived(
    forutsetninger((x) => x.art === 'rettidighet' && x.hjemmel === '33.6.2')
  );
  const grunnlagsbrev = $derived.by(() => {
    const g = u.spor.forhold.gjeldendeSvar;
    return g ? brevet(u, g.dokument) : null;
  });
  const nyttSvar = $derived.by(() => {
    const s = etter?.spor.frist.gjeldendeSvar;
    return s && !u.spor.frist.svar.some((x) => x.id === s.id) ? s : null;
  });
  const fristen = (id: string) => frister.find((f) => f.id === id);
  // Standpunktene i svaret slik kjernen forhåndsviser det, med laget brevet gir dem.
  const nyeStandpunkter = $derived(nyttSvar ? standpunktene(nyttSvar, etter!) : []);
  const linjer = $derived(
    nyeStandpunkter.map((l) => {
      const f =
        'standpunkt' in l && l.standpunkt.art === 'dager'
          ? fristen(l.standpunkt.gjelder)
          : undefined;
      return {
        tekst:
          'grunn' in l
            ? grunntekst(l.grunn, true, l.brev)
            : standpunkttekst(l.standpunkt, true, f?.dager, f && flere ? f.navn : undefined),
        lag: l.lag,
      };
    })
  );
  const stor = (t: string) => `${t[0]!.toUpperCase()}${t.slice(1)}`;
  // Leselinjen for en lukket frist: dagene slik kjernen leser dem, eller valget til svaret er
  // fullstendig.
  const leselinje = (f: Fristpost): string[] => {
    const fra = nyeStandpunkter.flatMap((l) => {
      if (!('standpunkt' in l) || l.standpunkt.art !== 'dager') return [];
      if (l.standpunkt.gjelder !== f.id) return [];
      const t = FRISTSVAR.leselinjeDager(l.standpunkt.vurdert, f.dager);
      return [l.lag ? `${stor(l.lag)}: ${t[0]!.toLowerCase()}${t.slice(1)}` : t];
    });
    if (fra.length) return fra;
    const d = godkjenteDager(fristvalget(valg, f.id), f.dager);
    return d === undefined ? [] : [FRISTSVAR.leselinjeDager(d, f.dager)];
  };
  const utkastbrev = $derived.by(() => {
    const b = kjernesak.brev(kommando);
    return b && 'tekst' in b ? b : null;
  });

  // Det som mangler, med skjemaets ord. Kjernen avviser det samme med feltkoder.
  const deldagerFeil = (f: Fristpost): string | null => {
    const v = valg.frister[f.id];
    if (v?.dager !== 'deler') return null;
    const d = heleDager(v.deldager);
    if (d === undefined) return FRISTSVAR.manglerDeldager;
    return d <= 0 || d >= f.dager ? FRISTSVAR.deldagerUtenfor(f.dager) : null;
  };
  // D-5: dagene byggherren måtte forstå er høyst dagene byggherren godtar om kravet kom i tide
  // (`kontrollerSpesifiseringen` i kjernen).
  const maatteForstaaFeil = (f: Fristpost): string | null => {
    if (valg.spesifisertITide !== false) return null;
    const v = fristvalget(valg, f.id);
    const d = heleDager(v.maatteForstaa);
    if (d === undefined) return FRISTSVAR.manglerMaatteForstaa;
    const godtar = godkjenteDager(v, f.dager);
    return godtar !== undefined && d > godtar ? FRISTSVAR.maatteForstaaForMange : null;
  };
  // Spørsmålene som gjelder hele kravet, med feltet og det som mangler.
  const heleKravet = $derived([
    { felt: 'varsel', ubesvart: valg.varselITide === null, tekst: FRISTSVAR.manglerVarsel },
    {
      felt: 'foresporsel',
      ubesvart: foresporselen && valg.foresporselITide === null,
      tekst: FRISTSVAR.manglerForesporsel,
    },
    { felt: 'hindret', ubesvart: valg.hindret === null, tekst: FRISTSVAR.manglerHindring },
    {
      felt: 'spesifisert',
      ubesvart: valg.spesifisertITide === null,
      tekst: FRISTSVAR.manglerSpesifisering,
    },
  ]);
  const mangler = $derived(
    [
      ...heleKravet.map((m) => ({
        felt: `${uid}-${m.felt}`,
        frist: null,
        tekst: m.ubesvart ? m.tekst : null,
      })),
      ...frister.flatMap((f) => {
        const i = (tekst: string | null) =>
          tekst ? SKJEMA.iPosten(flere ? f.navn : null, tekst) : null;
        return [
          { felt: `${uid}-maatte-${f.id}`, frist: f.id, tekst: i(maatteForstaaFeil(f)) },
          {
            felt: `${uid}-dager-${f.id}`,
            frist: f.id,
            tekst: i(valg.frister[f.id]?.dager ? null : FRISTSVAR.manglerDager),
          },
          { felt: `${uid}-deldager-${f.id}`, frist: f.id, tekst: i(deldagerFeil(f)) },
        ];
      }),
    ].filter((m): m is { felt: string; frist: string | null; tekst: string } => m.tekst !== null)
  );
  // Beskjedene vises først når BH har prøvd å se brevet (MM-U32), og forsvinner når feltet er besvart.
  let forsoekt = $state(false);
  const feil = (felt: string): string | null =>
    forsoekt ? (mangler.find((m) => m.felt === `${uid}-${felt}`)?.tekst ?? null) : null;
  let oppsummering = $state<HTMLElement | null>(null);
  let sendehindring = $state<string | null>(null);

  const virkninger = $derived([
    ...(nyttSvar?.beslutningsgrunnlag.sammenfall ? [VIRKNING.sammenfall] : []),
    ...(kjernesak.forbehold ? [VIRKNING.forbehold] : []),
    ...(nyttSvar?.standpunkter.some(
      (s) => s.art === 'rettidighet' && s.hjemmel === '33.4' && !s.iTide
    )
      ? [BREVKONTROLL.akseptOmfatter]
      : []),
  ]);

  async function seBrevet() {
    sendehindring = null;
    if (mangler.length) {
      forsoekt = true;
      const foerste = mangler.find((m) => m.frist !== null);
      if (foerste) valgtFrist = foerste.frist;
      await tick();
      oppsummering?.focus();
      return;
    }
    const b = kjernesak.brev(kommando, undefined, true);
    const brevet = kontrollbrev(b);
    if (!brevet) {
      sendehindring =
        b && 'avvisning' in b && b.avvisning.regel === 'UGYLDIG_VURDERING'
          ? HOVEDLINJER.kanIkkeLages
          : (brevaarsak(b) ?? HOVEDLINJER.kanIkkeLages);
      await tick();
      document.getElementById(`${uid}-hindring`)?.focus();
      return;
    }
    onbrevkontroll({ kommando, ...brevet, detteSender: linjer, virkninger });
  }

  // Brevet leses ved siden av skjemaet, og på smal skjerm i skjemaet (oppdragsgiver 29.10, #1391).
  const vindu = medietreff('(max-width: 1180px)');
  const smal = $derived(vindu.treff);
  let leser = $state(false);
  $effect(() => {
    onvedsiden?.(leser && !smal);
    return () => onvedsiden?.(false);
  });
  let panel = $state<HTMLElement | null>(null);
  const linja = fastLinje(
    uid,
    () => panel,
    () => leser && !smal
  );
</script>

{#snippet forutsetning(f: Forutsetning)}
  {#if 'grunn' in f}
    {SKJEMA.grunnen(f.grunn, grunnlagsbrev!)}
  {:else if f.innsigelse === '33.4'}
    <a href={`#${uid}-varsel`}>{FRISTSVAR.innsigelsenVarsel}</a>
  {:else if f.innsigelse === '33.6.2'}
    <a href={`#${uid}-foresporsel`}>{FRISTSVAR.innsigelsenForesporsel}</a>
  {:else if f.innsigelse === 'hindring'}
    <a href={`#${uid}-hindret`}>{FRISTSVAR.standpunktetHindring}</a>
  {:else}
    <a href={`#${uid}-spesifisert`}>{FRISTSVAR.innsigelsenSpesifisering}</a>
  {/if}
{/snippet}

<!-- Dagene byggherren måtte forstå står først i fristen når kravet er spesifisert for sent (D-5),
     så dagene byggherren godtar om kravet kom i tide (U-14, D-5, prototypen `fristkrav-te.html#svar`). -->
{#snippet fristvalgene(f: Fristpost)}
  {@const v = valg.frister[f.id]}
  {#if v}
    {#if valg.spesifisertITide === false}
      {@const id = `${uid}-maatte-${f.id}`}
      {@const mFeil = feil(`maatte-${f.id}`)}
      <div class="betinget">
        <Gjelderhvis
          id={`${id}-forutsetninger`}
          liste={spesifiseringslagene}
          punkt={forutsetning}
        />
        <div class="tallfelt">
          <label for={id}>{FRISTSVAR.maatteForstaaEtikett}</label>
          <span id={`${id}-hjelp`} class="dempet">{FRISTSVAR.maatteForstaaHjelp(f.dager)}</span>
          <span class="inndata" class:ugyldig={mFeil}>
            <input
              {id}
              inputmode="numeric"
              bind:value={v.maatteForstaa}
              aria-describedby={[
                spesifiseringslagene.length ? `${id}-forutsetninger` : '',
                `${id}-hjelp`,
                mFeil ? `${id}-feil` : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-invalid={mFeil ? 'true' : undefined}
            />
            <span class="enhet" aria-hidden="true">dager</span>
          </span>
          {#if mFeil}<p class="feilmelding" id={`${id}-feil`}>{mFeil}</p>{/if}
        </div>
      </div>
    {/if}
    {@const dagforutsetninger = forDagene(f.id)}
    <div class="betinget">
      <Gjelderhvis
        id={`${uid}-dager-${f.id}-forutsetninger`}
        liste={dagforutsetninger}
        punkt={forutsetning}
      />
      <Valg
        navn={`${uid}-dager-${f.id}`}
        spoersmaal={FRISTSVAR.dagerSpoersmaal}
        beskrevetAv={dagforutsetninger.length ? `${uid}-dager-${f.id}-forutsetninger` : undefined}
        valg={[
          { verdi: 'alle', tekst: FRISTSVAR.alle },
          { verdi: 'deler', tekst: FRISTSVAR.deler },
          { verdi: 'avslaatt', tekst: FRISTSVAR.avslaatt },
        ]}
        bind:verdi={v.dager}
        feil={feil(`dager-${f.id}`)}
        lett
        stablet
      />
    </div>
    {#if v.dager === 'deler'}
      {@const id = `${uid}-deldager-${f.id}`}
      {@const dFeil = feil(`deldager-${f.id}`)}
      <div class="tallfelt">
        <label for={id}>{FRISTSVAR.deldagerEtikett}</label>
        <span id={`${id}-hjelp`} class="dempet">{FRISTSVAR.deldagerHjelp(f.dager)}</span>
        <span class="inndata" class:ugyldig={dFeil}>
          <input
            {id}
            inputmode="numeric"
            bind:value={v.deldager}
            aria-describedby={dFeil ? `${id}-hjelp ${id}-feil` : `${id}-hjelp`}
            aria-invalid={dFeil ? 'true' : undefined}
          />
          <span class="enhet" aria-hidden="true">dager</span>
        </span>
        {#if dFeil}<p class="feilmelding" id={`${id}-feil`}>{dFeil}</p>{/if}
      </div>
    {/if}
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
                    if (m.frist === null || !postliste || postliste.erAapen(m.frist)) return;
                    e.preventDefault();
                    postliste.aapne(m.frist, m.felt);
                  }}>{m.tekst}</a
                >
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <section class="spoersmaal" aria-labelledby={`${uid}-sp-varsel`}>
        <div class="sp-hode">
          <h3 id={`${uid}-sp-varsel`}>{FRISTSVAR.varselTittel}</h3>
          <Infotips navn={SKJEMA.datoInfoNavn} tekst={SKJEMA.datoInfo} />
          <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 33.4</span>
        </div>
        <Gjelderhvis id={`${uid}-varsel-forutsetninger`} liste={grunnene} punkt={forutsetning} />
        <div class="datoer">
          {#if klarOver}<p>{SKJEMA.klarOver(klarOver.dato, klarOver.brev)}</p>{/if}
          <p>{FRISTSVAR.kravSendt(kravSendt ?? kravbrevet.registrert, kravbrevet)}</p>
          {#if klarOver && kravSendt}
            <p><strong>{SKJEMA.avstand(kalenderdager(klarOver.dato, kravSendt))}</strong></p>
          {/if}
          <p class="dempet">{SKJEMA.datoGrense}</p>
        </div>
        <Valg
          navn={`${uid}-varsel`}
          spoersmaal={FRISTSVAR.varselSpoersmaal}
          beskrevetAv={grunnene.length ? `${uid}-varsel-forutsetninger` : undefined}
          valg={[
            { verdi: true, tekst: SKJEMA.iTide },
            { verdi: false, tekst: SKJEMA.forSent },
          ]}
          bind:verdi={valg.varselITide}
          feil={feil('varsel')}
        />
      </section>

      {#if foresporselen}
        <section class="spoersmaal" aria-labelledby={`${uid}-sp-foresporsel`}>
          <div class="sp-hode">
            <h3 id={`${uid}-sp-foresporsel`}>{FRISTSVAR.foresporselTittel}</h3>
            <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 33.6.2</span>
          </div>
          <Gjelderhvis
            id={`${uid}-foresporsel-forutsetninger`}
            liste={foresporselslagene}
            punkt={forutsetning}
          />
          <Valg
            navn={`${uid}-foresporsel`}
            spoersmaal={FRISTSVAR.foresporselSpoersmaal}
            beskrevetAv={foresporselslagene.length
              ? `${uid}-foresporsel-forutsetninger`
              : undefined}
            valg={[
              { verdi: true, tekst: FRISTSVAR.foresporselITide },
              { verdi: false, tekst: FRISTSVAR.foresporselForSent },
            ]}
            bind:verdi={valg.foresporselITide}
            feil={feil('foresporsel')}
          />
        </section>
      {/if}

      <section class="spoersmaal" aria-labelledby={`${uid}-sp-hindring`}>
        <div class="sp-hode">
          <h3 id={`${uid}-sp-hindring`}>{FRISTSVAR.hindringTittel}</h3>
          <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt {hindringPunkt}</span
          >
        </div>
        <Gjelderhvis
          id={`${uid}-hindret-forutsetninger`}
          liste={hindringslagene}
          punkt={forutsetning}
        />
        <p class="dempet" id={`${uid}-hindret-hjelp`}>{FRISTSVAR.hindringHjelp}</p>
        <Valg
          navn={`${uid}-hindret`}
          spoersmaal={FRISTSVAR.hindringSpoersmaal}
          beskrevetAv={hindringslagene.length
            ? `${uid}-hindret-forutsetninger ${uid}-hindret-hjelp`
            : `${uid}-hindret-hjelp`}
          valg={[
            { verdi: true, tekst: FRISTSVAR.hindret },
            { verdi: false, tekst: FRISTSVAR.ikkeHindret },
          ]}
          bind:verdi={valg.hindret}
          feil={feil('hindret')}
          stablet
        />
      </section>

      <section class="spoersmaal" aria-labelledby={`${uid}-sp-spesifisering`}>
        <div class="sp-hode">
          <h3 id={`${uid}-sp-spesifisering`}>{FRISTSVAR.spesifiseringTittel}</h3>
          <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 33.6.1</span>
        </div>
        <Gjelderhvis
          id={`${uid}-spesifisert-forutsetninger`}
          liste={spesifiseringslagene}
          punkt={forutsetning}
        />
        <p class="dempet">{FRISTSVAR.spesifiseringGrense}</p>
        <Valg
          navn={`${uid}-spesifisert`}
          spoersmaal={FRISTSVAR.spesifiseringSpoersmaal}
          beskrevetAv={spesifiseringslagene.length
            ? `${uid}-spesifisert-forutsetninger`
            : undefined}
          valg={[
            { verdi: true, tekst: FRISTSVAR.spesifisertITide },
            { verdi: false, tekst: FRISTSVAR.spesifisertForSent },
          ]}
          bind:verdi={valg.spesifisertITide}
          feil={feil('spesifisert')}
        />
      </section>

      <section class="spoersmaal" aria-labelledby={`${uid}-sp-dager`}>
        <div class="sp-hode">
          <h3 id={`${uid}-sp-dager`}>{FRISTSVAR.dagerTittel}</h3>
          <span class="hjemmel"><BookOpen size={14} aria-hidden="true" />punkt 33.5 og 33.7</span>
        </div>
        {#if flere}
          <p class="dempet">{FRISTSVAR.ettSvarPerFrist}</p>
          <div class="snarveier">
            <Knapp variant="lenke" onclick={godkjennAlle}>{FRISTSVAR.godkjennAlle}</Knapp>
          </div>
        {/if}
        <Postliste
          bind:this={postliste}
          bind:valgt={valgtFrist}
          poster={frister}
          prefiks={uid}
          navn={(f) => f.navn}
          krever={(f) => FRISTSVAR.teKrever(f.dager)}
          {leselinje}
          foersteFelt={(id) =>
            valg.spesifisertITide === false ? `${uid}-maatte-${id}` : `${uid}-dager-${id}`}
          valgene={fristvalgene}
        />
      </section>

      <section class="spoersmaal" aria-labelledby={`${uid}-sp-begrunnelse`}>
        <div class="sp-hode">
          <h3 id={`${uid}-sp-begrunnelse`}>{SKJEMA.begrunnelse}</h3>
        </div>
        <p class="dempet" id={`${uid}-begrunnelse-hjelp`}>{SKJEMA.begrunnelseHjelp}</p>
        {#each punktene as p (p.punkt)}
          <div class="begrunnelse">
            <label for={`${uid}-begrunnelse-${p.punkt}`}>{p.navn}</label>
            <textarea
              id={`${uid}-begrunnelse-${p.punkt}`}
              rows="2"
              bind:value={valg.begrunnelser[p.punkt]}
              aria-describedby={`${uid}-begrunnelse-hjelp`}
            ></textarea>
          </div>
        {/each}
        <div class="begrunnelse forbehold">
          <label for={`${uid}-forbehold`}>{SKJEMA.forbehold}</label>
          <span class="dempet" id={`${uid}-forbehold-hjelp`}>{SKJEMA.forbeholdHjelp}</span>
          <textarea
            id={`${uid}-forbehold`}
            rows="3"
            bind:value={valg.forbehold}
            aria-describedby={`${uid}-forbehold-hjelp`}
          ></textarea>
        </div>
      </section>

      <div class="skjemafot">
        <Forkastutkast tekst={FRISTSVAR.forkastTekst} {onforkast} />
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
        <div class="lesebunn">{@render sendeknapp()}</div>
      </section>
    {:else}
      <div class="feste" class:fast={linja.faarPlass} bind:this={panel}>
        <Hovedlinjer {linjer} alternativer={false} handling={sendeknapp} />
      </div>
      <Tidslinje brev={sporbrev} {datoer} />
    {/if}
  {/snippet}
</Arbeidsflate>

{#if linja.visKompakt}
  <div class="kompakt" role="region" aria-label="Hovedlinjene og brevkontrollen">
    <Knapp variant="primaer" onclick={seBrevet}>{HOVEDLINJER.seBrevet}</Knapp>
    <Knapp onclick={() => panel?.scrollIntoView({ block: 'start' })}
      >{HOVEDLINJER.seHovedlinjene}</Knapp
    >
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
  h3 {
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
  .datoer {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: var(--r-innfelt);
    font-size: 14px;
  }
  .tallfelt,
  .begrunnelse {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  /* Feltnavnet er punktet i brevet, under overskriften «Begrunnelse» (design-review #1858). */
  .begrunnelse label {
    font-size: 15px;
    color: var(--ink-2);
  }
  /* Forbeholdet gjelder hele svaret og står sist i brevet, skilt fra punktene. */
  .begrunnelse.forbehold {
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-4);
    border-top: var(--rule);
  }
  .begrunnelse.forbehold label {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
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
  .inndata.ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .skjemafot {
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
    border-top: var(--rule);
  }
  .innebrev {
    padding: var(--spacing-4) var(--spacing-4) 0;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
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
  /* «Gjelder hvis» hører til spørsmålet under seg, ikke til det over (U-8). */
  .betinget {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
  }
  .snarveier {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2) var(--spacing-5);
  }
</style>
