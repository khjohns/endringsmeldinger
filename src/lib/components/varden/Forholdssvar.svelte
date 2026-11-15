<!--
  BH svarer på påberopelsen av forholdet (BF-08, #2009, prototypen `forholdssvar.html#svar`), i
  skallet for svarskjemaene: skjemaet vurderer, panelet viser hovedlinjene slik kjernen
  forhåndsviser svaret, og brevet viser alt. Ingenting er forhåndsvalgt. Punktet om varselet står
  bare der punkt 32.2 gjelder (U-2). Kommandoen bygges i `forholdssvar.ts`, og kjernen lager brevet
  og avviser det den ikke godtar.
-->
<script lang="ts">
  import { Info } from 'lucide-svelte';
  import {
    DATOEN_GJELDER,
    innholdIForholdet,
    kategori,
    oppgittDato,
  } from '$kjerne/spor/forhold/format';
  import { blirEndringsordre } from '$kjerne/spor/forhold/frysing';
  import { forholdet as forholdIKatalogen } from '$kjerne/spor/forhold/tekst';
  import type { Forholdsresultat } from '$kjerne/regler/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Datoer from './Datoer.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Sitat from './Sitat.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Valg from './Valg.svelte';
  import {
    begrunnelsenKreves,
    FORHOLDSSVAR,
    forholdet,
    forholdslinjen,
    forholdssvaret,
    kanFrafalle,
    tomtForholdssvar,
    valgteksten,
    type Forholdssvarvalg,
  } from './forholdssvar';
  import { standpunktene, underOverskriften } from './lesing';
  import { kravbrevetI, kravetSendt, manglene } from './svarskjema';
  import { brevref, dato, kalenderdager } from './tekster';

  let {
    kjernesak,
    u,
    valg = $bindable(tomtForholdssvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Valgene står når BH går til brevkontrollen og tilbake. */
    valg?: Forholdssvarvalg;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** BH har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
    /** Brevet leses i en ramme ved siden av skjemaet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();

  const krav = $derived(u.spor.forhold.gjeldendeKrav!);
  const f = $derived(forholdet(krav, kjernesak.regler));
  const frafallMulig = $derived(kanFrafalle(f, valg));

  // U-3: datoen TE oppgir, sendingen av påberopelsen og dagene mellom. Partene avgjør om varselet
  // kom i tide.
  const kravbrevet = $derived(kravbrevetI(u, 'forhold'));
  const datoene = $derived.by(() => {
    const { hovedkategori, underkategori } = kategori(krav);
    const felt = oppgittDato(hovedkategori, underkategori);
    const oppgitt = felt ? innholdIForholdet(krav).datoer[felt] : null;
    const sendt = kravetSendt(kravbrevet);
    return [
      ...(felt && oppgitt
        ? [
            {
              tekst: FORHOLDSSVAR.datoOppgitt(
                DATOEN_GJELDER[felt],
                dato(oppgitt),
                brevref(kravbrevet)
              ),
            },
          ]
        : []),
      ...(sendt ? [{ tekst: FORHOLDSSVAR.paaberopelsenSendt(dato(sendt)) }] : []),
      ...(oppgitt && sendt
        ? [{ tekst: FORHOLDSSVAR.avstand(kalenderdager(oppgitt, sendt)), art: 'avstand' as const }]
        : []),
    ];
  });
  const hjemmelen = $derived(
    f.risiko
      ? (forholdIKatalogen(kategori(krav).underkategori)?.hjemmel ?? undefined)
      : f.varslingsplikt
        ? '32.3'
        : '31.3'
  );

  // D-6: frafallet tas bort når BH gjør gjeldende at varselet kom for sent, og teksten ved valgene
  // sier hvorfor.
  function velgForSent(x: boolean | null) {
    // U-4, D-3 og D-4: får valget et annet navn, gjelder det noe annet, og byggherren velger på nytt.
    const r = valg.resultat;
    if (r && valgteksten(r, f, x) !== valgteksten(r, f, valg.forSent)) valg.resultat = null;
    valg.forSent = x;
    if (valg.resultat === 'paalegg_frafalt' && !kanFrafalle(f, valg)) valg.resultat = null;
  }
  const valgene = $derived(
    f.resultater
      .filter((r) => r !== 'paalegg_frafalt' || frafallMulig)
      .map((r) => ({ verdi: r, tekst: valgteksten(r, f, valg.forSent) }))
  );
  const frafallMangler = $derived.by(() => {
    if (!f.varslingsplikt) return null;
    if (!f.byggherrensPaalegg) return FORHOLDSSVAR.ikkeFrafallIkkeEget;
    return frafallMulig ? null : FORHOLDSSVAR.ikkeFrafallForSent;
  });

  // Svaret uten begrunnelsene og forbeholdet, så det ikke regnes på nytt for hvert tegn i et
  // tekstfelt (#1925).
  const utkast = $derived(
    forholdssvaret(
      { forSent: valg.forSent, resultat: valg.resultat, begrunnelser: {}, forbehold: '' },
      u,
      kjernesak.regler
    )!
  );
  const etter = $derived(kjernesak.forhaandsvist(utkast));
  const nyttSvar = $derived.by(() => {
    const s = etter?.spor.forhold.gjeldendeSvar;
    return s && !u.spor.forhold.svar.some((x) => x.id === s.id) ? s : null;
  });
  const endringsordre = $derived(
    nyttSvar ? blirEndringsordre(nyttSvar.beslutningsgrunnlag) : false
  );
  // U-5: setningen om endringsordren står i skjemaet slik kjernen skriver den i brevet.
  const forholdspunktet = $derived.by(() => {
    if (!endringsordre) return null;
    const b = kjernesak.brev(utkast);
    const a = b && 'avsnitt' in b ? b.avsnitt?.find((x) => x.punkt === 'forhold') : undefined;
    return a ? underOverskriften(a).join('\n\n') : null;
  });

  const linjer = $derived(
    nyttSvar
      ? standpunktene(nyttSvar, etter!).flatMap((l) => {
          if (!('standpunkt' in l)) return [];
          const s = l.standpunkt;
          if (s.art === 'rettidighet')
            return [
              {
                tekst: s.iTide
                  ? FORHOLDSSVAR.linjeVarselIkkeForSent
                  : FORHOLDSSVAR.linjeVarselForSent,
                lag: l.lag,
              },
            ];
          if (s.art === 'forhold')
            return [
              {
                tekst: forholdslinjen(s.resultat as Forholdsresultat, f, endringsordre),
                lag: l.lag,
              },
            ];
          return [];
        })
      : []
  );
  // U-7 og D-5: hva svaret gjør, lest av kjernens utledning av utkastet.
  const virkning = $derived.by(() => {
    if (!nyttSvar) return null;
    if (endringsordre) return FORHOLDSSVAR.virkningEndringsordre;
    if (etter?.frafalt) return FORHOLDSSVAR.virkningFrafall;
    if (etter?.forholdAvklart) return FORHOLDSSVAR.virkningEnighet;
    return FORHOLDSSVAR.virkningSubsidiaert;
  });

  const kreves = $derived(begrunnelsenKreves(f, valg));
  const mangler = $derived(
    manglene(uid, [
      {
        felt: 'varsel',
        post: null,
        tekst: f.varslingsplikt && valg.forSent === null ? FORHOLDSSVAR.manglerVarsel : null,
      },
      {
        felt: 'forhold',
        post: null,
        tekst: valg.resultat === null ? FORHOLDSSVAR.manglerForhold : null,
      },
    ])
  );
</script>

{#snippet innsigelsen()}
  <a href={`#${uid}-varsel`}>{FORHOLDSSVAR.innsigelsenVarsel}</a>
{/snippet}

<Svarskjema
  {kjernesak}
  {u}
  spor="forhold"
  {utkast}
  medTekstene={(punktene) => forholdssvaret(valg, u, kjernesak.regler, punktene)!}
  bind:tekster={valg}
  {linjer}
  virkninger={virkning ? [virkning] : []}
  {mangler}
  begrunnelseKreves={kreves}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
>
  {#snippet spoersmaal(feil)}
    <div class="utenfor" role="note">
      <Info size={16} aria-hidden="true" />
      <p>{FORHOLDSSVAR.utenforLoesningen}</p>
    </div>

    {#if f.varslingsplikt}
      <Spoersmaal id={`${uid}-sp-varsel`} tittel={FORHOLDSSVAR.varselTittel}>
        <Datoer linjer={datoene} />
        <Valg
          navn={`${uid}-varsel`}
          spoersmaal={FORHOLDSSVAR.varselSpoersmaal}
          valg={[
            { verdi: false, tekst: FORHOLDSSVAR.varselNei },
            { verdi: true, tekst: FORHOLDSSVAR.varselJa },
          ]}
          bind:verdi={() => valg.forSent, velgForSent}
          feil={feil(`${uid}-varsel`)}
        />
      </Spoersmaal>
    {/if}

    <Spoersmaal id={`${uid}-sp-forhold`} tittel={FORHOLDSSVAR.forholdTittel} hjemmel={hjemmelen}>
      <Gjelderhvis
        id={`${uid}-forhold-forutsetninger`}
        liste={f.varslingsplikt && valg.forSent === true ? ['32.2'] : []}
        punkt={innsigelsen}
      />
      <Valg
        navn={`${uid}-forhold`}
        spoersmaal={FORHOLDSSVAR.forholdSpoersmaal}
        valg={valgene}
        bind:verdi={valg.resultat}
        beskrevetAv={f.varslingsplikt && valg.forSent === true
          ? `${uid}-forhold-forutsetninger`
          : undefined}
        feil={feil(`${uid}-forhold`)}
        stablet
      />
      {#if frafallMangler}<p class="dempet">{frafallMangler}</p>{/if}
      {#if forholdspunktet}
        <Sitat etikett={FORHOLDSSVAR.endringsordreMerke}>
          <p>{FORHOLDSSVAR.brevetSier}</p>
          <blockquote>{forholdspunktet}</blockquote>
          <p class="dempet">{FORHOLDSSVAR.setningenStaar}</p>
        </Sitat>
      {/if}
      {#if virkning}<p class="virkning">{virkning}</p>{/if}
    </Spoersmaal>
  {/snippet}
</Svarskjema>

<style>
  .utenfor {
    display: flex;
    gap: var(--spacing-2);
    margin: var(--spacing-5) var(--spacing-6) 0;
    color: var(--ink-3);
    font-size: 14px;
  }
  .utenfor :global(svg) {
    flex: none;
    margin-top: 2px;
  }
  /* Setningen i byggherrens brevskrift. */
  blockquote {
    white-space: pre-line;
    font-family: var(--font-brev-bh);
    font-size: 11pt;
    line-height: 1.6;
    color: var(--ink);
  }
  .virkning {
    color: var(--ink-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
    text-wrap: pretty;
  }
</style>
