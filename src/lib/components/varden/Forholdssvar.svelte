<!--
  BH svarer på påberopelsen av forholdet (BF-08, #2009, prototypen `forholdssvar.html#svar`), i
  skallet for svarskjemaene: skjemaet vurderer, panelet viser hovedlinjene slik kjernen
  forhåndsviser svaret, og brevet viser alt. Ingenting er forhåndsvalgt. Punktet om varselet står
  bare der punkt 32.2 gjelder (U-2). Kommandoen bygges i `forholdssvar.ts`, og kjernen lager brevet
  og avviser det den ikke godtar.
-->
<script lang="ts">
  import {
    DATOEN_GJELDER,
    innholdIForholdet,
    kategori,
    oppgittDato,
  } from '#kjerne/spor/forhold/format.ts';
  import { standpunktet } from '#kjerne/frosset/byggeklosser.ts';
  import { blirEndringsordre, preklusjonPaaberopt } from '#kjerne/spor/forhold/frysing.ts';
  import {
    BREVTEKSTEN_I_FORHOLDET,
    forholdet as forholdIKatalogen,
  } from '#kjerne/spor/forhold/tekst.ts';
  import type { Forholdsresultat } from '#kjerne/regler/typer.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { kravversjonenPaaDagen, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { harTekst } from '#lib/kjernesak/brevtekst.ts';
  import { lagtTil as kommandoenLagtTil, type Korrespondansevalg } from './korrespondansen';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Datoer from './Datoer.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Knapp from './Knapp.svelte';
  import Sitat from './Sitat.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import { innsigelsenOmVarselet } from './tekster/svaret';
  import Valg from './Valg.svelte';
  import {
    begrunnelsenKreves,
    forholdet,
    forholdslinjen,
    forholdssvaret,
    tomtForholdssvar,
    valgteksten,
    type Forholdssvarvalg,
  } from './forholdssvar';
  import { kanFrafalle } from '#kjerne/regler/forhold.ts';
  import { brevene, standpunktene, underOverskriften } from './lesing';
  import { vedleggskart } from './nysak';
  import {
    begrunnelserForTemaene,
    kravbrevetI,
    kravetSendt,
    manglene,
    stilt,
    ugyldig,
  } from './svarskjema';
  import { brevref, dato, FORHOLDSSVAR, kalenderdager, SKJEMA } from './tekster';

  let {
    kjernesak,
    u,
    valg = $bindable(tomtForholdssvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
    lagtTil = null,
    onendre,
    onlagttil,
    onleggtil,
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
    /** Korrespondansen svaret legges til fra (OV-U80, OV-U98), eller `null`. */
    lagtTil?: Korrespondansevalg | null;
    onendre?: () => void;
    onlagttil?: () => void;
    /** U-14: veien til skjemaet for korrespondanse lagt til, med kategorien svar. */
    onleggtil?: () => void;
  } = $props();
  const uid = $props.id();

  // OV-U98: et svar lagt til gjelder versjonen av påberopelsen som var gjeldende da det ble sendt.
  const krav = $derived(
    (lagtTil?.dato ? kravversjonenPaaDagen(u, 'forhold', lagtTil.dato) : null) ??
      u.spor.forhold.gjeldendeKrav!
  );
  const f = $derived(forholdet(krav, kjernesak.regler));
  const frafallMulig = $derived(kanFrafalle(f, valg.forSent === true));

  // U-3: datoen TE oppgir, sendingen av påberopelsen og dagene mellom. Partene avgjør om varselet
  // kom i tide.
  const kravbrevet = $derived(
    brevene(u).find((b) => b.id === krav.dokument) ?? kravbrevetI(u, 'forhold')
  );
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
    if (valg.resultat === 'paalegg_frafalt' && !kanFrafalle(f, valg.forSent === true))
      valg.resultat = null;
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
      kjernesak.regler,
      [],
      krav
    )!
  );
  const lagene = $derived(
    kjernesak.lagForUtkastet(utkast.svar[0]!, 'forhold', lagtTil?.dato || null)
  );
  const foersteSporsmaal = $derived(lagene?.ubesvart[0]?.spoersmaal);
  // GR-U12: kjernen stiller spørsmålet om varselet etter punkt 32.2 (#2279).
  const varseletStilt = $derived(stilt(lagene, 'grunnlag_varslet_i_tide'));
  const begrunnelserISkjemaet = $derived(
    begrunnelserForTemaene(BREVTEKSTEN_I_FORHOLDET.temaer(), (punkt) =>
      punkt === '32.2'
        ? !!lagene?.standpunkter.some(
            (s) => s.art === 'rettidighet' && s.hjemmel === punkt && s.besvart
          ) && !ugyldig(lagene, 'grunnlag_varslet_i_tide')
        : !!lagene?.standpunkter.some((s) => s.art === 'forhold' && s.besvart) &&
          !ugyldig(lagene, 'resultat')
    )
  );
  const forutsetninger = $derived(
    lagene?.standpunkter.find((s) => s.art === 'forhold')?.forutsetninger ?? []
  );
  // Et svar lagt til forhåndsvises med datoen, så kjernen regner det mot saken slik den var da.
  const etter = $derived(
    kjernesak.forhaandsvist(
      lagtTil ? kommandoenLagtTil(utkast, lagtTil) : utkast,
      lagtTil ? vedleggskart(lagtTil.vedlegg) : undefined
    )
  );
  const nyttSvar = $derived.by(() => {
    const f = etter?.spor.forhold;
    const kjent = new Set(
      [...u.spor.forhold.svar, ...u.spor.forhold.svarUtenforRekken].map((x) => x.id)
    );
    return (
      [...(f?.svar ?? []), ...(f?.svarUtenforRekken ?? [])].find((x) => !kjent.has(x.id)) ?? null
    );
  });
  const endringsordre = $derived(
    nyttSvar ? blirEndringsordre(nyttSvar.beslutningsgrunnlag) : false
  );
  // U-5: setningen om endringsordren står i skjemaet slik kjernen skriver den i brevet.
  const forholdspunktet = $derived.by(() => {
    if (!endringsordre) return null;
    const b = kjernesak.brev(utkast);
    const a = harTekst(b) ? b.avsnitt.find((x) => x.punkt === 'forhold') : undefined;
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
                punkt: s.hjemmel,
                tekst: s.iTide
                  ? FORHOLDSSVAR.linjeVarselIkkeForSent
                  : FORHOLDSSVAR.linjeVarselForSent,
                lag: l.lag,
                vilkaar: l.vilkaar,
                heller: l.heller,
              },
            ];
          if (s.art === 'forhold')
            return [
              {
                punkt: 'forhold',
                tekst: forholdslinjen(s.resultat as Forholdsresultat, f, endringsordre),
                lag: l.lag,
                vilkaar: l.vilkaar,
                heller: l.heller,
              },
            ];
          return [];
        })
      : []
  );
  const skjemapunkter = $derived(
    begrunnelserISkjemaet
      .filter((p) => p.punkt !== '32.2' || varseletStilt)
      .map((p) => {
        const varsel = p.punkt === '32.2';
        const tekst = varsel
          ? valg.forSent === null
            ? null
            : valg.forSent
              ? FORHOLDSSVAR.varselJa
              : FORHOLDSSVAR.varselNei
          : valg.resultat === null
            ? null
            : valgteksten(valg.resultat, f, valg.forSent);
        const fraBrevet = linjer.filter((l) => l.punkt === p.punkt);
        return {
          ...p,
          aktiv: foersteSporsmaal === (varsel ? 'grunnlag_varslet_i_tide' : 'resultat'),
          linjer: fraBrevet.length
            ? fraBrevet
            : [{ tekst: tekst ?? SKJEMA.ikkeBesvart, lag: null }],
        };
      })
  );
  // U-7 og D-5: hva svaret gjør, lest av kjernens utledning av utkastet.
  const virkning = $derived.by(() => {
    if (!nyttSvar) return null;
    if (endringsordre) return FORHOLDSSVAR.virkningEndringsordre;
    if (etter?.frafalt) return FORHOLDSSVAR.virkningFrafall;
    if (etter?.forholdAvklart) return FORHOLDSSVAR.virkningEnighet;
    const brevet = etter?.svar[nyttSvar.id];
    if (
      brevet &&
      standpunktet(brevet.svar, 'forhold')?.resultat !== 'avslaatt' &&
      preklusjonPaaberopt(brevet.svar, brevet.virkninger)
    )
      return FORHOLDSSVAR.virkningSubsidiaertEnig;
    return FORHOLDSSVAR.virkningSubsidiaertAvslag;
  });

  const kreves = $derived(begrunnelsenKreves(f, valg));
  const mangler = $derived(
    manglene(uid, [
      {
        felt: 'varsel',
        post: null,
        tekst: varseletStilt && valg.forSent === null ? FORHOLDSSVAR.manglerVarsel : null,
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
  <a href={`#${uid}-varsel`}>{innsigelsenOmVarselet('32.2')}</a>
{/snippet}

<Svarskjema
  lagfeil={lagene === null}
  {kjernesak}
  {u}
  spor="forhold"
  {utkast}
  medTekstene={(punktene) => forholdssvaret(valg, u, kjernesak.regler, punktene, krav)!}
  {lagtTil}
  svarerPaa={lagtTil ? kravbrevet : null}
  {onendre}
  {onlagttil}
  bind:tekster={valg}
  {linjer}
  virkninger={virkning ? [virkning] : []}
  {mangler}
  begrunnelseKreves={kreves}
  {begrunnelserISkjemaet}
  {skjemapunkter}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
>
  {#snippet spoersmaal(feil, begrunnelse, overskrift)}
    {#if !lagtTil && onleggtil}
      <div class="utenfor">
        <Knapp variant="lenke" kompakt iFlukt onclick={onleggtil}>{FORHOLDSSVAR.leggTilSvar}</Knapp>
      </div>
    {/if}

    {#if varseletStilt}
      <Spoersmaal
        id={`${uid}-sp-varsel`}
        aktiv={foersteSporsmaal === 'grunnlag_varslet_i_tide'}
        tittel={overskrift('32.2') ?? FORHOLDSSVAR.varselTittel}
      >
        <Datoer linjer={datoene} />
        <Valg
          navn={`${uid}-varsel`}
          spoersmaal={FORHOLDSSVAR.varselSpoersmaal}
          valg={[
            { verdi: true, tekst: FORHOLDSSVAR.varselJa },
            { verdi: false, tekst: FORHOLDSSVAR.varselNei },
          ]}
          bind:verdi={() => valg.forSent, velgForSent}
          feil={feil(`${uid}-varsel`)}
          stablet
        />
        {@render begrunnelse('32.2')}
      </Spoersmaal>
    {/if}

    <Spoersmaal
      id={`${uid}-sp-forhold`}
      aktiv={foersteSporsmaal === 'resultat'}
      tittel={overskrift('forhold') ?? FORHOLDSSVAR.forholdTittel}
      hjemmel={hjemmelen ? [hjemmelen] : undefined}
    >
      <Gjelderhvis
        id={`${uid}-forhold-forutsetninger`}
        liste={forutsetninger}
        punkt={innsigelsen}
      />
      <Valg
        navn={`${uid}-forhold`}
        spoersmaal={FORHOLDSSVAR.forholdSpoersmaal}
        valg={valgene}
        bind:verdi={valg.resultat}
        beskrevetAv={forutsetninger.length ? `${uid}-forhold-forutsetninger` : undefined}
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
      {@render begrunnelse('forhold')}
    </Spoersmaal>
  {/snippet}
</Svarskjema>

<style>
  .utenfor {
    margin: var(--spacing-5) var(--spacing-6) 0;
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
