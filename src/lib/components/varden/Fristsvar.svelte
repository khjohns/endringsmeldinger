<!--
  BH skriver svar på krav om fristforlengelse (G-4 i BF-20, prototypene `fristsvar.html` og
  `fristkrav-te.html#svar`), i samme oppbygning som svaret på vederlaget: skjemaet vurderer,
  panelet viser hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt. Ingenting er
  forhåndsvalgt (U-14), unntatt innsigelsen mot varselet som står (VS-U96 punkt 34). Varselet,
  forespørselen, hindringen og spesifiseringen besvares én gang for hele kravet, og dagene for
  hver frist (KA-U74, KA-U80). Kommandoen bygges i `fristsvar.ts`, og
  kjernen regner resultatet og lagene, lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { UgyldigVurdering } from '#kjerne/regler/feil.ts';
  import { kontrollerSpesifiseringen } from '#kjerne/regler/svarkontroll.ts';
  import { stor } from '#kjerne/frosset/brevdeler.ts';
  import { dager, FORHOLDET } from '#kjerne/frosset/tekst.ts';
  import { betegnelsen, hindringenEtter, innholdIFristen } from '#kjerne/spor/frist/format.ts';
  import { BREVTEKSTEN_I_FRISTEN } from '#kjerne/spor/frist/tekst.ts';
  import {
    begrunnelsenKanAvvisesSomSvar,
    foresporselenISvaret,
    fristpunktForSpoersmaal,
    fristspoersmaalForPunkt,
    innsigelsenMotFristvarselet,
  } from '#lib/kjernesak/fristsvar.ts';
  import type { Forutsetning } from '#kjerne/spor/frist/kommando.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Forholdsgrunn from './Forholdsgrunn.svelte';
  import Gjelderhvis from './Gjelderhvis.svelte';
  import Knapp from './Knapp.svelte';
  import Postliste from './Postliste.svelte';
  import Spoersmaal from './Spoersmaal.svelte';
  import Svarskjema from './Svarskjema.svelte';
  import Linjefelt from './Linjefelt.svelte';
  import Valg from './Valg.svelte';
  import Varselstandpunkt from './Varselstandpunkt.svelte';
  import Varseldatoer from './Varseldatoer.svelte';
  import {
    fristsvaret,
    godkjenteDager,
    heleDager,
    fristvalget,
    godkjenteDagerIFeltet,
    skrivGodkjenteDager,
    tomFrist,
    tomtFristsvar,
    type Fristsvarvalg,
    velgDagene,
  } from './fristsvar';
  import { brevet, brevMedElement, brevMedUtsagn, standpunktene } from './lesing';
  import { somNyttSvar } from './kommandoer';
  import {
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
    FRISTEN,
    FRISTSVAR,
    SKJEMA,
    SVARSKJEMA,
    grunntekst,
    innsigelsenOmVarselet,
    oppgivelsestekst,
    standpunkttekst,
  } from './tekster';

  let {
    kjernesak,
    u,
    valg = $bindable(tomtFristsvar()),
    onbrevkontroll,
    onforkast,
    onvedsiden,
    onforholdet,
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
    /** Åpner siden for forholdet uten å forkaste svarutkastet. */
    onforholdet?: () => void;
  } = $props();
  const uid = $props.id();

  type Fristpost = { id: string; navn: string; dager: number };

  const krav = $derived(u.spor.frist.gjeldendeKrav!);
  const frister = $derived(
    innholdIFristen(krav).frister.map(
      (f): Fristpost => ({ id: f.id, navn: betegnelsen(f), dager: f.dager })
    )
  );
  const flere = $derived(frister.length > 1);
  // VS-U17, VS-U29: svaret tar stilling til forespørselen når kjernen leser en.
  const foresporselen = $derived(foresporselenISvaret(u) !== null);
  // VS-U95: bare i svaret på det første kravet etter begrunnelsen etter § 33.6.2 annet ledd b.
  const ikkeSvarKanVelges = $derived(begrunnelsenKanAvvisesSomSvar(u));
  const begrunnelsesbrevet = $derived.by(() => {
    const f = foresporselenISvaret(u);
    return ikkeSvarKanVelges && f ? brevMedUtsagn(u, f.gjelder) : null;
  });
  $effect.pre(() => {
    if (!ikkeSvarKanVelges) valg.begrunnelseIkkeSvar = false;
  });
  type Foresporselsvalg = boolean | 'ikke_svar';
  const foresporselsvalget = (): Foresporselsvalg | null =>
    valg.begrunnelseIkkeSvar ? 'ikke_svar' : valg.foresporselITide;
  function velgForesporselen(v: Foresporselsvalg | null) {
    valg.begrunnelseIkkeSvar = v === 'ikke_svar';
    valg.foresporselITide = v === 'ikke_svar' ? null : v;
  }
  // VS-U96 punkt 34.
  const innsigelsen = $derived(innsigelsenMotFristvarselet(u, null));
  const innsigelsesbrevet = $derived(innsigelsen && brevet(u, innsigelsen.dokument));
  $effect.pre(() => {
    if (innsigelsen && valg.varselITide === null) valg.varselITide = false;
  });
  const hindringPunkt = $derived(hindringenEtter(u.spor.forhold.gjeldendeKrav));

  let valgtFrist = $state<string | null>(null);
  let postliste = $state<Postliste<Fristpost> | null>(null);
  const fristerMedFeltfeil = new SvelteSet<string>();
  // Feilen fra «Ferdig» gjelder spesifiseringen byggherren valgte da.
  $effect(() => {
    if (valg.spesifisertITide !== false) untrack(() => fristerMedFeltfeil.clear());
  });
  // Valgene for hver frist i gjeldende krav finnes før skjemaet tegnes, også når kravet er nytt.
  $effect.pre(() => {
    for (const f of frister) valg.frister[f.id] ??= tomFrist();
  });
  function godkjennAlle() {
    for (const f of frister) (valg.frister[f.id] ??= tomFrist()).dager = 'alle';
  }

  // Svaret uten begrunnelsene og forbeholdet, så det ikke regnes på nytt for hvert tegn i et
  // tekstfelt (#1925).
  const brevutkast = $derived(
    fristsvaret(
      {
        varselITide: valg.varselITide,
        foresporselITide: valg.foresporselITide,
        begrunnelseIkkeSvar: valg.begrunnelseIkkeSvar,
        hindret: valg.hindret,
        spesifisertITide: valg.spesifisertITide,
        frister: valg.frister,
        begrunnelser: {},
        forbehold: '',
      },
      u,
      kjernesak.regler
    )!
  );
  // Revisjonen av det gjeldende svaret når skjemaet er et nytt svar (HF-U29, G-8 i BF-46).
  const utkast = $derived(somNyttSvar(brevutkast, valg.erstatter));
  const forrigeSvar = $derived(
    utkast.type === 'revisjon' ? brevMedElement(u, utkast.erstatter) : null
  );
  const etter = $derived(kjernesak.forhaandsvist(utkast));
  // OV-U33: lagene står også før spørsmålene er besvart (`lagIFristen`).
  const lagene = $derived(kjernesak.lagForUtkastet(brevutkast.svar[0], 'frist'));
  const foersteSporsmaal = $derived(lagene?.ubesvart[0]?.spoersmaal);
  const foerstePunkt = $derived(
    lagene?.ubesvart[0]?.gjelder ?? fristpunktForSpoersmaal(foersteSporsmaal)
  );
  const temaene = $derived(BREVTEKSTEN_I_FRISTEN.temaer(krav));
  const begrunnelserISkjemaet = $derived(
    begrunnelserForTemaene(
      temaene.filter((tema) => tema.punkt !== FORHOLDET),
      (punkt) => {
        if (!lagene) return false;
        const spoersmaal = fristspoersmaalForPunkt(punkt);
        if (spoersmaal)
          return (
            stilt(lagene, spoersmaal) &&
            !ubesvart(lagene, spoersmaal) &&
            !ugyldig(lagene, spoersmaal)
          );
        return (
          stilt(lagene, 'dager', punkt) &&
          !lagene.ubesvart.some((p) => p.gjelder === punkt) &&
          !lagene.ugyldig.some((p) => p.gjelder === punkt)
        );
      }
    )
  );
  type Lagene = NonNullable<typeof lagene>['standpunkter'][number];
  const forutsetninger = (passer: (x: Lagene) => boolean): Forutsetning[] =>
    lagene?.standpunkter.find(passer)?.forutsetninger ?? [];
  const forDagene = (id: string) => forutsetninger((x) => x.art === 'dager' && x.gjelder === id);
  const grunnene = $derived(frister[0] ? forDagene(frister[0].id).filter((f) => 'grunn' in f) : []);
  // Spørsmålet står bare når kjernen stiller det (`stilt`), og et svar som står fra før, sendes
  // ikke (#2158).
  const spesifiseringen = $derived(stilt(lagene, 'spesifisert_krav_ok'));
  $effect.pre(() => {
    if (!spesifiseringen) valg.spesifisertITide = null;
  });
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
        punkt:
          'grunn' in l
            ? FORHOLDET
            : (BREVTEKSTEN_I_FRISTEN.punktet(l.standpunkt) ??
              (l.standpunkt.art === 'rettidighet' ? l.standpunkt.hjemmel : l.standpunkt.art)),
        tekst:
          'grunn' in l
            ? grunntekst(l.grunn, true, l.brev)
            : innsigelsesbrevet &&
                l.standpunkt.art === 'rettidighet' &&
                l.standpunkt.hjemmel === '33.4' &&
                l.standpunkt.iTide
              ? oppgivelsestekst('33.4', innsigelsesbrevet, true)
              : standpunkttekst(l.standpunkt, true, f?.dager, f && flere ? f.navn : undefined) +
                (l.standpunkt.art === 'spesifisering' && l.standpunkt.maatteForstaa
                  ? FRISTSVAR.maatteForstaaPerFrist(
                      l.standpunkt.maatteForstaa.map(
                        (m) => `${dager(m.dager)} for ${fristen(m.frist)?.navn ?? m.frist}`
                      )
                    )
                  : ''),
        lag: l.lag,
        vilkaar: l.vilkaar,
        heller: l.heller,
      };
    })
  );
  // Leselinjen for en lukket frist: dagene slik kjernen leser dem, eller valget til svaret er
  // fullstendig.
  const leselinje = (f: Fristpost): string[] => {
    // Det første vilkåret for fristen sier ikke «heller ikke» (#2280).
    let vist = false;
    const medVilkaar = (
      t: string,
      vilkaar: Parameters<typeof FRISTEN.vilkaar>[0] = [],
      heller?: boolean
    ) => {
      if (!vilkaar.length) return [t];
      const linje = FRISTEN.vilkaar(vilkaar, vist && heller);
      vist = true;
      return [linje, t];
    };
    // D-5: dagene byggherren måtte forstå står i laget sitt før dagene byggherren godkjenner.
    const fra = nyeStandpunkter.flatMap((l) => {
      if (!('standpunkt' in l)) return [];
      const s = l.standpunkt;
      if (s.art === 'spesifisering') {
        const m = s.maatteForstaa?.find((x) => x.frist === f.id);
        return m ? medVilkaar(FRISTSVAR.maatteForstaaLinje(m.dager), l.vilkaar, l.heller) : [];
      }
      if (s.art !== 'dager' || s.gjelder !== f.id) return [];
      return medVilkaar(FRISTSVAR.leselinjeDager(s.vurdert, f.dager), l.vilkaar, l.heller);
    });
    if (fra.length) return fra;
    const d = visteDager(f);
    return d === undefined ? [] : [FRISTSVAR.leselinjeDager(d, f.dager)];
  };
  const punktstatus = (punkt: string): string[] => {
    switch (punkt) {
      case '33.4':
        if (valg.varselITide && innsigelsesbrevet)
          return [oppgivelsestekst('33.4', innsigelsesbrevet, true)];
        return valg.varselITide === null ? [] : [valg.varselITide ? SKJEMA.iTide : SKJEMA.forSent];
      case '33.6.2':
        return valg.begrunnelseIkkeSvar
          ? [FRISTSVAR.begrunnelseIkkeSvar]
          : valg.foresporselITide === null
            ? []
            : [valg.foresporselITide ? FRISTSVAR.foresporselITide : FRISTSVAR.foresporselForSent];
      case 'hindring':
        return valg.hindret === null
          ? []
          : [valg.hindret ? FRISTSVAR.hindret : FRISTSVAR.ikkeHindret];
      case 'spesifisering':
        return valg.spesifisertITide === null
          ? []
          : [valg.spesifisertITide ? FRISTSVAR.spesifisertITide : FRISTSVAR.spesifisertForSent];
      default: {
        const f = fristen(punkt);
        return f ? leselinje(f) : [];
      }
    }
  };
  const skjemapunkter = $derived([
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
        const felt = fristspoersmaalForPunkt(p.punkt);
        return !felt || stilt(lagene, felt);
      })
      .map((p) => {
        const fraBrevet = linjer.filter((l) => l.punkt === p.punkt);
        const status = punktstatus(p.punkt);
        return {
          ...p,
          aktiv: foerstePunkt === p.punkt,
          linjer: fraBrevet.length
            ? fraBrevet
            : (status.length ? status : [SKJEMA.ikkeBesvart]).map((tekst) => ({
                tekst,
                lag: null,
              })),
        };
      }),
  ]);
  // U-12: en innsigelse som rammer hele kravet, står én gang over fristene, med laget kjernen gir
  // den i utkastet, så den står så snart den er valgt.
  const forHeleKravet = $derived(
    (
      [
        ['33.4', valg.varselITide, FRISTSVAR.heleKravetTapt('33.4')],
        [
          '33.6.2',
          foresporselen && !valg.begrunnelseIkkeSvar ? valg.foresporselITide : null,
          FRISTSVAR.heleKravetTapt('33.6.2'),
        ],
        ['hindring', valg.hindret, FRISTSVAR.heleKravetIkkeHindret],
      ] as const
    ).flatMap(([, svar, t]) => {
      if (svar !== false) return [];
      return [stor(t)];
    })
  );

  // Det som mangler, med skjemaets ord: det kjernen sier er påkrevd og ubesvart (#2025), og et
  // tall som er skrevet, men ikke kan godtas.
  const deldagerFeil = (f: Fristpost): string | null => {
    const v = valg.frister[f.id];
    if (v?.dager !== 'deler') return null;
    if (ubesvart(lagene, 'dager', f.id)) return FRISTSVAR.manglerDeldager;
    // «0,0» og «20,0» er tall kjernen godtar, men ikke et helt antall dager under «Delvis».
    if (heleDager(v.deldager) === undefined) return FRISTSVAR.ugyldigeDeldager;
    return ugyldig(lagene, 'dager', f.id) ? FRISTSVAR.deldagerUtenfor(f.dager) : null;
  };
  /** Dagene byggherren godkjenner, når det er et helt antall dager panelet kan vise. */
  const visteDager = (f: Fristpost) => {
    const d = godkjenteDager(fristvalget(valg, f.id), f.dager);
    return d !== undefined && Number.isInteger(d) && d >= 0 ? d : undefined;
  };
  const grenseForMaatteForstaa = (f: Fristpost) => {
    const godkjent = visteDager(f);
    return godkjent !== undefined && godkjent <= f.dager ? godkjent : undefined;
  };

  // Kjernen avgjør om tallet er ubesvart eller ikke kan godtas (`ugyldig` i lagene, #2156). Før
  // byggherren har oppgitt dagene, prøver kjernen ikke tallet, og kravet er grensen.
  const avvistMotKravet = (f: Fristpost) => {
    try {
      kontrollerSpesifiseringen({
        spesifisert_krav_ok: false,
        dager_maatte_forstaa: heleDager(fristvalget(valg, f.id).maatteForstaa),
        dager: f.dager,
      });
      return false;
    } catch (feil) {
      if (feil instanceof UgyldigVurdering && feil.feil.dager_maatte_forstaa) return true;
      throw feil;
    }
  };
  const maatteForstaaFeil = (f: Fristpost): string | null => {
    if (valg.spesifisertITide !== false) return null;
    if (ubesvart(lagene, 'dager_maatte_forstaa', f.id)) return FRISTSVAR.manglerMaatteForstaa;
    const grense = grenseForMaatteForstaa(f);
    const avvist =
      grense === undefined ? avvistMotKravet(f) : ugyldig(lagene, 'dager_maatte_forstaa', f.id);
    return avvist ? FRISTSVAR.maatteForstaaHoeyst(grense ?? f.dager) : null;
  };
  const maatteForstaaId = (f: Fristpost) => `${uid}-maatte-${f.id}`;
  const deldagerId = (f: Fristpost) => `${uid}-deldager-${f.id}`;
  const fristerMedDeldagerfeil = new SvelteSet<string>();
  // Feilen fra «Ferdig» gjelder «Delvis»; velger byggherren et annet svar, gjelder den ikke lenger.
  $effect(() => {
    for (const id of fristerMedDeldagerfeil)
      if (valg.frister[id]?.dager !== 'deler') untrack(() => fristerMedDeldagerfeil.delete(id));
  });
  function kontrollerVedFerdig(f: Fristpost) {
    if (maatteForstaaFeil(f)) {
      fristerMedFeltfeil.add(f.id);
      return maatteForstaaId(f);
    }
    fristerMedFeltfeil.delete(f.id);
    if (deldagerFeil(f)) {
      fristerMedDeldagerfeil.add(f.id);
      return deldagerId(f);
    }
    fristerMedDeldagerfeil.delete(f.id);
    return null;
  }
  const mangler = $derived(
    manglene(uid, [
      // Spørsmålene som gjelder hele kravet.
      {
        felt: 'varsel',
        post: null,
        tekst: ubesvart(lagene, 'frist_varsel_ok') ? FRISTSVAR.manglerVarsel : null,
      },
      {
        felt: 'foresporsel',
        post: null,
        tekst: ubesvart(lagene, 'foresporsel_svar_ok') ? FRISTSVAR.manglerForesporsel : null,
      },
      {
        felt: 'hindret',
        post: null,
        tekst: ubesvart(lagene, 'vilkar_oppfylt') ? FRISTSVAR.manglerHindring : null,
      },
      {
        felt: 'spesifisert',
        post: null,
        tekst: ubesvart(lagene, 'spesifisert_krav_ok') ? FRISTSVAR.manglerSpesifisering : null,
      },
      ...frister.flatMap((f) => {
        const i = (tekst: string | null) =>
          tekst ? SKJEMA.iPosten(flere ? f.navn : null, tekst) : null;
        return [
          { felt: `maatte-${f.id}`, post: f.id, tekst: i(maatteForstaaFeil(f)) },
          {
            felt: `dager-${f.id}`,
            post: f.id,
            // Ved «Delvis» står mangelen ved feltet for dagene som godkjennes (`deldagerFeil`).
            tekst: i(
              ubesvart(lagene, 'dager', f.id) && valg.frister[f.id]?.dager !== 'deler'
                ? FRISTSVAR.manglerDager
                : null
            ),
          },
          { felt: `deldager-${f.id}`, post: f.id, tekst: i(deldagerFeil(f)) },
        ];
      }),
    ])
  );

  const virkninger = $derived([
    BREVSTEG.enigheten,
    ...(nyttSvar?.beslutningsgrunnlag.sammenfall ? [VIRKNING.sammenfall('fristforlengelse')] : []),
    ...(kjernesak.forbehold ? [VIRKNING.forbehold] : []),
    ...(nyttSvar?.standpunkter.some(
      (s) => s.art === 'rettidighet' && s.hjemmel === '33.4' && !s.iTide
    )
      ? [BREVKONTROLL.akseptOmfatter]
      : []),
  ]);
</script>

{#snippet forutsetning(f: Forutsetning)}
  {#if 'grunn' in f}
    <Forholdsgrunn grunn={f.grunn} brev={grunnlagsbrev!} {onforholdet} />
  {:else if f.innsigelse === '33.4'}
    <a href={`#${uid}-varsel${innsigelsen ? '-standpunkt' : ''}`}>{innsigelsenOmVarselet('33.4')}</a
    >
  {:else if f.innsigelse === '33.6.2'}
    <a href={`#${uid}-foresporsel`}>{FRISTSVAR.innsigelsenForesporsel}</a>
  {:else if f.innsigelse === 'hindring'}
    <a href={`#${uid}-hindret`}>{FRISTSVAR.standpunktetHindring}</a>
  {:else if spesifiseringen}
    <a href={`#${uid}-spesifisert`}>{FRISTSVAR.innsigelsenSpesifisering}</a>
  {:else}
    {FRISTSVAR.innsigelsenSpesifisering}
  {/if}
{/snippet}

<Svarskjema
  lagfeil={lagene === null}
  {kjernesak}
  {u}
  spor="frist"
  {utkast}
  {forrigeSvar}
  medTekstene={(punktene) =>
    somNyttSvar(fristsvaret(valg, u, kjernesak.regler, punktene)!, valg.erstatter)}
  bind:tekster={valg}
  {linjer}
  {virkninger}
  {mangler}
  {postliste}
  {begrunnelserISkjemaet}
  {skjemapunkter}
  {onbrevkontroll}
  {onforkast}
  {onvedsiden}
>
  {#snippet spoersmaal(feil, begrunnelse, overskrift)}
    <!-- Dagene byggherren måtte forstå står først i fristen når kravet er spesifisert for sent
         (D-5), så dagene byggherren godkjenner om kravet kom i tide (U-14, D-5, prototypen
         `fristkrav-te.html#svar`). -->
    {#snippet fristvalgene(f: Fristpost)}
      {@const v = valg.frister[f.id]}
      {#if v}
        {#if valg.spesifisertITide === false}
          {@const id = maatteForstaaId(f)}
          {@const mFeil =
            feil(id) ??
            (fristerMedFeltfeil.has(f.id)
              ? (mangler.find((m) => m.felt === id)?.tekst ?? null)
              : null)}
          <div class="betinget">
            <Gjelderhvis
              id={`${id}-forutsetninger`}
              liste={spesifiseringslagene}
              punkt={forutsetning}
            />
            <Linjefelt
              {id}
              etikett={FRISTSVAR.maatteForstaaEtikett}
              hjelp={FRISTSVAR.maatteForstaaHjelp(grenseForMaatteForstaa(f))}
              enhet="dager"
              bredde="tall"
              inputmode="numeric"
              paakrevd
              bind:verdi={v.maatteForstaa}
              feil={mFeil}
              foran={spesifiseringslagene.length ? [`${id}-forutsetninger`] : []}
            />
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
            spoersmaal={valg.spesifisertITide === false
              ? FRISTSVAR.dagerSpoersmaalITide
              : FRISTSVAR.dagerSpoersmaal}
            beskrevetAv={dagforutsetninger.length
              ? `${uid}-dager-${f.id}-forutsetninger`
              : undefined}
            valg={[
              { verdi: 'alle', tekst: FRISTSVAR.alle(f.dager) },
              { verdi: 'deler', tekst: FRISTSVAR.deler },
              { verdi: 'avslaatt', tekst: FRISTSVAR.avslaatt },
            ]}
            bind:verdi={() => v.dager, (d) => velgDagene(v, d, f.dager)}
            feil={feil(`${uid}-dager-${f.id}`)}
            lett
            stablet
          />
        </div>
        <!-- U-14: «Godkjente dager» står alltid, tomt til byggherren har valgt, og tallet styrer
             valget. -->
        {@const id = deldagerId(f)}
        {@const dFeil = feil(id) ?? (fristerMedDeldagerfeil.has(f.id) ? deldagerFeil(f) : null)}
        <Linjefelt
          {id}
          etikett={FRISTSVAR.deldagerEtikett}
          hjelp={FRISTSVAR.deldagerHjelp}
          enhet="dager"
          bredde="tall"
          inputmode="numeric"
          bind:verdi={
            () => godkjenteDagerIFeltet(v, f.dager),
            (t) => {
              skrivGodkjenteDager(v, t, f.dager);
              if (!deldagerFeil(f)) fristerMedDeldagerfeil.delete(f.id);
            }
          }
          feil={dFeil}
        />
        {@render begrunnelse(f.id)}
      {/if}
    {/snippet}

    <Spoersmaal
      id={`${uid}-sp-varsel`}
      aktiv={foersteSporsmaal === 'frist_varsel_ok'}
      tittel={overskrift('33.4') ?? temanavn(temaene, '33.4')}
    >
      <Varseldatoer {u} spor="frist" sendt={FRISTSVAR.kravSendt} />
      <Gjelderhvis id={`${uid}-varsel-forutsetninger`} liste={grunnene} punkt={forutsetning} />
      {#if innsigelsen}
        <Varselstandpunkt
          varselId={`${uid}-varsel`}
          justeringId={`${uid}-justering`}
          hjemmel="33.4"
          foer={{ iTide: false, brev: innsigelsesbrevet, ikkeGitt: false }}
          bind:varsletITide={valg.varselITide}
          godtarJustering={null}
          ikkeGitt={false}
          justeringValgfri
          vis="varselet"
        />
      {:else}
        <Valg
          navn={`${uid}-varsel`}
          spoersmaal={FRISTSVAR.varselSpoersmaal}
          beskrevetAv={grunnene.length ? `${uid}-varsel-forutsetninger` : undefined}
          valg={[
            { verdi: true, tekst: SKJEMA.iTide },
            { verdi: false, tekst: SKJEMA.forSent },
          ]}
          bind:verdi={valg.varselITide}
          feil={feil(`${uid}-varsel`)}
        />
      {/if}
      {@render begrunnelse('33.4')}
    </Spoersmaal>

    {#if foresporselen}
      <Spoersmaal
        id={`${uid}-sp-foresporsel`}
        aktiv={foersteSporsmaal === 'foresporsel_svar_ok'}
        tittel={overskrift('33.6.2') ?? temanavn(temaene, '33.6.2')}
      >
        <Gjelderhvis
          id={`${uid}-foresporsel-forutsetninger`}
          liste={foresporselslagene}
          punkt={forutsetning}
        />
        <Valg
          navn={`${uid}-foresporsel`}
          spoersmaal={ikkeSvarKanVelges
            ? FRISTSVAR.begrunnelseSpoersmaal
            : FRISTSVAR.foresporselSpoersmaal}
          beskrevetAv={foresporselslagene.length ? `${uid}-foresporsel-forutsetninger` : undefined}
          valg={[
            { verdi: true, tekst: FRISTSVAR.foresporselITide },
            { verdi: false, tekst: FRISTSVAR.foresporselForSent },
            ...(ikkeSvarKanVelges
              ? [
                  {
                    verdi: 'ikke_svar' as const,
                    tekst: FRISTSVAR.begrunnelseIkkeSvar,
                    forklaring: FRISTSVAR.begrunnelseIkkeSvarForklaring(begrunnelsesbrevet),
                  },
                ]
              : []),
          ]}
          bind:verdi={foresporselsvalget, velgForesporselen}
          feil={feil(`${uid}-foresporsel`)}
        />
        {@render begrunnelse('33.6.2')}
      </Spoersmaal>
    {/if}

    <Spoersmaal
      id={`${uid}-sp-hindring`}
      aktiv={foersteSporsmaal === 'vilkar_oppfylt'}
      tittel={overskrift('hindring') ?? FRISTSVAR.hindringTittel}
      hjemmel={[hindringPunkt]}
    >
      <p class="dempet" id={`${uid}-hindret-hjelp`}>{FRISTSVAR.hindringHjelp}</p>
      <Gjelderhvis
        id={`${uid}-hindret-forutsetninger`}
        liste={hindringslagene}
        punkt={forutsetning}
      />
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
        feil={feil(`${uid}-hindret`)}
        stablet
      />
      {@render begrunnelse('hindring')}
    </Spoersmaal>

    {#if spesifiseringen}
      <Spoersmaal
        id={`${uid}-sp-spesifisering`}
        aktiv={foersteSporsmaal === 'spesifisert_krav_ok'}
        tittel={overskrift('spesifisering') ?? temanavn(temaene, 'spesifisering')}
      >
        <Gjelderhvis
          id={`${uid}-spesifisert-forutsetninger`}
          liste={spesifiseringslagene}
          punkt={forutsetning}
        />
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
          feil={feil(`${uid}-spesifisert`)}
        />
        {@render begrunnelse('spesifisering')}
      </Spoersmaal>
    {/if}

    <Spoersmaal
      id={`${uid}-sp-dager`}
      aktiv={!flere &&
        (foersteSporsmaal === 'dager' || foersteSporsmaal === 'dager_maatte_forstaa')}
      tittel={FRISTSVAR.dagerTittel}
      hjemmel={['33.5', '33.7']}
    >
      {#if forHeleKravet.length}
        <p class="helekravet">{FRISTSVAR.forHeleKravet(forHeleKravet)}</p>
      {/if}
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
        kolonne={SVARSKJEMA.fristKolonne}
        navn={(f) => f.navn}
        brevoverskrift={(f) => overskrift(f.id) ?? temanavn(temaene, f.id)}
        aktiv={(f) => foerstePunkt === f.id}
        krever={(f) => FRISTSVAR.teKrever(f.dager)}
        kravet={(f) => dager(f.dager)}
        {leselinje}
        {kontrollerVedFerdig}
        foersteFelt={(f) =>
          valg.spesifisertITide === false ? maatteForstaaId(f) : `${uid}-dager-${f.id}`}
        valgene={fristvalgene}
      />
    </Spoersmaal>
  {/snippet}
</Svarskjema>

<style>
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .helekravet {
    margin: 0;
    color: var(--ink-2);
    font-size: 14px;
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
