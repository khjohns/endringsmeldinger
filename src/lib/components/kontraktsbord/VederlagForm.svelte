<script lang="ts">
  import SkjemaStatus from './SkjemaStatus.svelte';
  import PositionExplanation from './PositionExplanation.svelte';
  import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
  import YesNoControl from './components/YesNoControl.svelte';
  import BelopFelt from './components/BelopFelt.svelte';
  import { visKroner } from '$lib/utils/belop';
  import { Check, X, CircleMinus } from 'lucide-svelte';
  import {
    beregnAlt,
    buildEventData,
    beregnGodkjentBelop,
    getDefaults,
    erSubsidiaer as erSubsidiaerFn,
    erHelVederlagSubsidiaerPgaGrunnlag,
    erKravlinjeGyldig,
    erBegrensetBelopGyldig,
  } from '$lib/domain/vederlagDomain';
  import type {
    VederlagFormState,
    VederlagDomainConfig,
    BelopVurdering,
  } from '$lib/domain/vederlagDomain';
  import { isHtmlEmpty } from '$lib/utils/formatters';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
  import {
    VEDERLAGSMETODER_OPTIONS,
    getVederlagsmetodeLabel,
    getVederlagsmetodeShortLabel,
  } from '$lib/constants/paymentMethods';
  import type { VederlagsMetode } from '$lib/types/timeline';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import StandpointHeading from '$lib/components/patterns/StandpointHeading.svelte';

  import { FORBEHOLDET, type Lagrad } from '$lib/kjernesak/vederlagssvar';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  const review = getApprovalWorkspace();
  import { getApprovalWorkspace } from '$lib/approval/context.svelte';
  import { getClaimReview } from '$lib/approval/claimReview.svelte';
  const claimReview = getClaimReview();
  import { fmt } from './utils.js';
  import { sporResultatLabel } from './derive.js';
  import type { EventType } from '$lib/types/timeline';
  import {
    createSubmission,
    createFormDraft,
    submissionRefs,
  } from '$lib/kontraktsbord/submission.svelte';
  const submission = createSubmission();

  let {
    domainConfig,
    onsend,
    onactions,
  }: {
    domainConfig: VederlagDomainConfig;
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

  const initialDefaults = getDefaults({ isUpdateMode: false });

  // Port 1: Preklusjon
  let hovedkravVarsletITide = $state<boolean | undefined>(initialDefaults.hovedkravVarsletITide);
  let riggVarsletITide = $state<boolean | undefined>(initialDefaults.riggVarsletITide);
  let produktivitetVarsletITide = $state<boolean | undefined>(
    initialDefaults.produktivitetVarsletITide
  );

  // Port 2: Metode
  let akseptererMetode = $state<boolean | undefined>(initialDefaults.akseptererMetode);
  let oensketMetode = $state<VederlagsMetode | undefined>(initialDefaults.oensketMetode);

  // Port 3: Beløp
  let hovedkravVurdering = $state<BelopVurdering | undefined>(initialDefaults.hovedkravVurdering);
  let hovedkravGodkjentBelop = $state<number | undefined>(initialDefaults.hovedkravGodkjentBelop);
  let riggVurdering = $state<BelopVurdering | undefined>(initialDefaults.riggVurdering);
  let riggGodkjentBelop = $state<number | undefined>(initialDefaults.riggGodkjentBelop);
  let produktivitetVurdering = $state<BelopVurdering | undefined>(
    initialDefaults.produktivitetVurdering
  );
  let produktivitetGodkjentBelop = $state<number | undefined>(
    initialDefaults.produktivitetGodkjentBelop
  );
  let produktivitetBegrensetBelop = $state<number | undefined>(
    initialDefaults.produktivitetBegrensetBelop
  );

  // KA-U41: begrunnelsen er bare teksten BH skriver selv. Appen fyller ikke inn noe.
  let begrunnelseHtml = $state('');

  const formState: VederlagFormState = $derived({
    hovedkravVarsletITide,
    riggVarsletITide,
    produktivitetVarsletITide,
    akseptererMetode,
    oensketMetode,
    holdTilbake: false,
    hovedkravVurdering,
    hovedkravGodkjentBelop,
    riggVurdering,
    riggGodkjentBelop,
    produktivitetVurdering,
    produktivitetGodkjentBelop,
    produktivitetBegrensetBelop,
    begrunnelse: begrunnelseHtml,
  });

  const computed = $derived(beregnAlt(formState, domainConfig));
  const draft = createFormDraft(
    () => ({ ...formState }),
    (saved) => {
      hovedkravVarsletITide = saved.hovedkravVarsletITide;
      riggVarsletITide = saved.riggVarsletITide;
      produktivitetVarsletITide = saved.produktivitetVarsletITide;
      akseptererMetode = saved.akseptererMetode;
      oensketMetode = saved.oensketMetode;
      hovedkravVurdering = saved.hovedkravVurdering;
      hovedkravGodkjentBelop = saved.hovedkravGodkjentBelop;
      riggVurdering = saved.riggVurdering;
      riggGodkjentBelop = saved.riggGodkjentBelop;
      produktivitetVurdering = saved.produktivitetVurdering;
      produktivitetGodkjentBelop = saved.produktivitetGodkjentBelop;
      produktivitetBegrensetBelop = saved.produktivitetBegrensetBelop;
      // En eldre kladd har BHs tekst i `tilleggHtml` og den genererte teksten i `begrunnelse`.
      const tillegg = (saved as { tilleggHtml?: unknown }).tilleggHtml;
      begrunnelseHtml = typeof tillegg === 'string' ? tillegg : (saved.begrunnelse ?? '');
    },
    review?.restored('vederlag')?.form
  );
  // #1261: i TS-saken leser skjemaet grunnene og lagene av kjernen, som brevet.
  const kjernesak = store.erKjernesak ? store : null;
  const grunnlaget = $derived(kjernesak?.grunnlagetForVederlagssvaret ?? null);
  const isSubsidiaer = $derived(
    grunnlaget ? grunnlaget.grunner.length > 0 : erSubsidiaerFn(domainConfig)
  );
  const submissionMeta = $derived.by(() => {
    const events = store.timeline.filter(
      (event) =>
        event.spor === 'vederlag' &&
        event.actorrole === 'TE' &&
        (event.type.endsWith('.vederlag_krav_sendt') ||
          event.type.endsWith('.vederlag_krav_oppdatert'))
    );
    const labelFor = (date: string | undefined, fallbackIndex = 0) => {
      if (!date) return undefined;
      const dateOnly = date.slice(0, 10);
      const matchingIndex = events.findIndex((event) => event.time?.slice(0, 10) === dateOnly);
      const revision = matchingIndex >= 0 ? matchingIndex : fallbackIndex;
      return `Sendt ${formatDateShortNorwegian(date)} · ${revision === 0 ? 'opprinnelig krav' : `rev. ${revision}`}`;
    };

    return {
      hovedkrav: labelFor(events[0]?.time, 0),
      rigg: labelFor(store.sak.vederlag.rigg_drift_varsel?.dato_sendt, 1),
      produktivitet: labelFor(store.sak.vederlag.produktivitetstap_varsel?.dato_sendt, 1),
    };
  });

  // TE's sammendrag data
  const sammendragKravlinjer = $derived.by(() => {
    const linjer: Array<{ label: string; belop: number }> = [];
    if (domainConfig.harHovedkrav) {
      linjer.push({ label: 'Hovedkrav', belop: domainConfig.hovedkravBelop });
    }
    if (domainConfig.harRiggKrav && domainConfig.riggBelop) {
      linjer.push({ label: 'Rigg og drift', belop: domainConfig.riggBelop });
    }
    if (domainConfig.harProduktivitetKrav && domainConfig.produktivitetBelop) {
      linjer.push({ label: 'Produktivitetstap', belop: domainConfig.produktivitetBelop });
    }
    return linjer;
  });
  const sammendragTotalKrevd = $derived(sammendragKravlinjer.reduce((sum, l) => sum + l.belop, 0));

  // Begrunnelse expand/collapse
  let begrunnelseUtvidet = $state(false);
  let begrunnelseEl = $state<HTMLElement | null>(null);
  const erBegrunnelseAvkortet = $derived(
    begrunnelseEl ? begrunnelseEl.scrollHeight > begrunnelseEl.clientHeight : false
  );

  const subsidiærGrunn = $derived.by(() => {
    if (domainConfig.grunnlagStatus === 'avslatt') return 'grunnlag_avslatt' as const;
    if (erHelVederlagSubsidiaerPgaGrunnlag(domainConfig)) return 'grunnlag_32_2' as const;
    return null;
  });

  const AVSLAATT =
    'Byggherren har avslått grunnlaget. Vurderingen nedenfor gjelder dersom avslaget ikke fører frem.';
  const PREKLUDERT =
    'Byggherren har gjort gjeldende at TEs varsel etter § 32.2 kom for sent. Vurderingen nedenfor gjelder dersom denne innsigelsen ikke fører frem.';

  // #313, arbeidsvalgene 26.10 (VG-A-02, VG-C-02, kommentaren i #1303): hva svaret binder byggherren
  // til, ordrett etter arbeidsvalget. Tilfellet med særskilte vilkår venter på OV-U49.
  const BINDER = {
    alltid:
      'Virkningen av svaret regnes ut fra valgene over. Utdypningen tolkes ikke. Byggherren er bundet av svaret som sendes herfra.',
    // Bare når kjernen forhåndsviser sammenfall, ikke bare hele beløpet (GR-U7).
    sammenfall:
      'Svaret gir sammenfall med TEs krav om vederlag etter valgene over. Enighet registreres uten at TE må godta svaret, og svaret kan ikke revideres.',
    // Grunnlaget er ikke besvart og ikke avklart ved frafall (GR-U23, GR-U26, OV-U45).
    forbehold:
      'Grunnlaget i TEs krav er ikke besvart her og er heller ikke avklart ved byggherrens frafall. Standpunktene i svaret gjelder under forutsetning av at grunnlaget for kravet foreligger. En enighet om beløpet er derfor betinget av grunnlaget. Godtar TE et avslag på grunnlaget, får enigheten om beløpet ingen virkning.',
  };

  // I TS-saken i samme rekkefølge som lagene i brevet (OV-U32), og med forbeholdet etter GR-U26.
  const grunnlagsvarsler = $derived.by((): string[] => {
    if (grunnlaget)
      return [
        ...grunnlaget.grunner.map((g) => (g === 'prekludert' ? PREKLUDERT : AVSLAATT)),
        ...(grunnlaget.forbehold ? [`${FORBEHOLDET[0]}. ${FORBEHOLDET[1]}`] : []),
      ];
    if (subsidiærGrunn === 'grunnlag_avslatt') return [AVSLAATT];
    if (subsidiærGrunn === 'grunnlag_32_2') return [PREKLUDERT];
    return [];
  });

  const resultat = $derived.by(() => {
    const r = computed.prinsipaltResultat;
    // VS-U5: med begrensningen etter § 34.1.3 sier BH prinsipalt hva BH godtar, også 0 kr, og
    // avslår ikke. Er § 34.1.2 påberopt, gjelder den hele kravet (OV-U27).
    const konklusjon =
      computed.produktivitetPrekludert && !computed.hovedkravPrekludert
        ? `BH godtar ${fmt(computed.totalGodkjent)} kr prinsipalt etter begrensningen (§ 34.1.3)`
        : r === 'avslatt'
          ? 'BH avslår kravet prinsipalt'
          : `BH ${r === 'godkjent' ? 'godkjenner' : 'godkjenner delvis'} kravet prinsipalt`;
    if (r === 'godkjent') return { ikon: Check, konklusjon, variant: 'positive' as const };
    if (r === 'delvis_godkjent')
      return { ikon: CircleMinus, konklusjon, variant: 'mixed' as const };
    return { ikon: X, konklusjon, variant: 'negative' as const };
  });

  const kjernelag = $derived.by(() => {
    if (!kjernesak) return null;
    const { data } = buildEventData(
      formState,
      domainConfig,
      computed,
      { vederlagKravId: '', isUpdateMode: false },
      computed.subsidiaerTriggers
    );
    return kjernesak.vederlagslag(data);
  });
  const kjerneresultat = $derived.by(() => {
    if (!kjernelag) return null;
    if (kjernelag.sammenfall) return { ikon: Check, variant: 'positive' as const };
    if (kjernelag.ingenBeloep) return { ikon: X, variant: 'negative' as const };
    return { ikon: CircleMinus, variant: 'mixed' as const };
  });
  // #1303: radene står under laget sitt i brevets rekkefølge. Tekstene sier byggherrens
  // standpunkt (#492 D, arbeidsvalget 26.10 i #1303). Radene uten beløp viser «—», aldri 0 kr.
  function lagradvisning(rad: Lagrad) {
    if (rad.art === 'grunnlag')
      return {
        tittel:
          rad.grunn === 'prekludert'
            ? 'Byggherren gjør gjeldende at TEs varsel etter § 32.2 kom for sent'
            : 'Byggherren avslår grunnlaget',
        ref: rad.grunn === 'prekludert' ? '§ 32.2' : '',
        krevd: undefined,
        godkjent: undefined,
      };
    if (rad.art === 'varsel_34_1_2')
      return {
        tittel: 'Byggherren gjør gjeldende at TEs varsel etter § 34.1.2 kom for sent',
        ref: '§ 34.1.2',
        krevd: undefined,
        godkjent: undefined,
      };
    if (rad.art === 'begrenset')
      return {
        tittel: 'Produktivitetstap etter begrensningen',
        ref: '§ 34.1.3',
        krevd: undefined,
        godkjent: rad.beloep,
      };
    return rad.art === 'post'
      ? {
          tittel: 'Produktivitetstap',
          ref: '§ 34.1.3',
          krevd: domainConfig.produktivitetBelop,
          godkjent: rad.beloep,
        }
      : {
          tittel: 'Hovedkrav',
          ref: '§ 34.1.1–34.1.2',
          krevd: domainConfig.hovedkravBelop,
          godkjent: rad.beloep,
        };
  }
  const stor = (t: string) => t[0].toUpperCase() + t.slice(1);

  // Granulær resultat-rad per kostnadselement (kravlinje).
  interface ResultatRad {
    key: string;
    title: string;
    paragrafRef: string;
    krevdBelop: number | undefined;
    prekludert: boolean;
    vurdering: BelopVurdering | undefined;
    prinsipaltGodkjent: number;
    subsidiaertGodkjent: number;
  }

  const resultatRader = $derived.by(() => {
    const rader: ResultatRad[] = [];
    const preklusjon = {
      hovedkrav: computed.hovedkravPrekludert,
      rigg: computed.riggPrekludert,
      produktivitet: computed.produktivitetPrekludert,
    };
    const kravMap: Record<
      string,
      {
        title: string;
        ref: string;
        belop: number;
        vurdering: BelopVurdering | undefined;
        godkjentBelop: number | undefined;
      }
    > = {};
    if (domainConfig.harHovedkrav) {
      kravMap.hovedkrav = {
        title: 'Hovedkrav',
        ref: '§34.1.1–34.1.2',
        belop: domainConfig.hovedkravBelop,
        vurdering: hovedkravVurdering,
        godkjentBelop: hovedkravGodkjentBelop,
      };
    }
    if (domainConfig.harRiggKrav) {
      kravMap.rigg = {
        title: 'Rigg og drift',
        ref: '§34.1.3',
        belop: domainConfig.riggBelop ?? 0,
        vurdering: riggVurdering,
        godkjentBelop: riggGodkjentBelop,
      };
    }
    if (domainConfig.harProduktivitetKrav) {
      kravMap.produktivitet = {
        title: 'Produktivitetstap',
        ref: '§34.1.3',
        belop: domainConfig.produktivitetBelop ?? 0,
        vurdering: produktivitetVurdering,
        godkjentBelop: produktivitetGodkjentBelop,
      };
    }
    for (const key of Object.keys(kravMap)) {
      const k = kravMap[key];
      if (k.belop == null) continue;
      // OV-U27: § 34.1.2 gjelder hele kravet. VS-U5: posten står med beløpet etter begrensningen.
      const prekl = preklusjon.hovedkrav || preklusjon[key as keyof typeof preklusjon];
      const subsidiaert = beregnGodkjentBelop(k.vurdering, k.belop, k.godkjentBelop, false);
      const prinsipalt = !prekl
        ? subsidiaert
        : key === 'produktivitet' && !preklusjon.hovedkrav
          ? (produktivitetBegrensetBelop ?? 0)
          : 0;
      rader.push({
        key,
        title: k.title,
        paragrafRef: k.ref,
        krevdBelop: k.belop,
        prekludert: prekl,
        vurdering: k.vurdering,
        prinsipaltGodkjent: prinsipalt,
        subsidiaertGodkjent: subsidiaert,
      });
    }
    return rader;
  });

  // Data-driven preklusjonslinjer (matches production BhVederlagResponse)
  const preklusjonsLinjer = $derived.by(() => {
    const linjer: Array<{
      key: string;
      label: string;
      ref: string;
      value: boolean | undefined;
      submissionMeta?: string;
    }> = [];
    if (computed.har34_1_2_Preklusjon) {
      linjer.push({
        key: 'hovedkrav',
        label: 'Varsling av kravet',
        ref: '§ 34.1.2',
        value: hovedkravVarsletITide,
        submissionMeta: submissionMeta.hovedkrav,
      });
    }
    if (domainConfig.harProduktivitetKrav) {
      linjer.push({
        key: 'produktivitet',
        label: 'Varsling produktivitetstap',
        ref: '§ 34.1.3',
        value: produktivitetVarsletITide,
        submissionMeta: submissionMeta.produktivitet,
      });
    }
    return linjer;
  });

  function handlePreklusjon(key: string, value: boolean | undefined) {
    if (key === 'hovedkrav') hovedkravVarsletITide = value;
    else if (key === 'rigg') riggVarsletITide = value;
    else produktivitetVarsletITide = value;
  }

  // Data-driven kravlinjer (matches production BhVederlagResponse)
  interface KravlinjeItem {
    key: string;
    title: string;
    paragrafRef: string;
    krevdBelop: number | undefined;
    prekludert: boolean;
    vurdering: BelopVurdering | undefined;
    godkjentBelop: number | undefined;
  }

  const kravlinjer = $derived.by(() => {
    const linjer: KravlinjeItem[] = [];
    if (domainConfig.harHovedkrav) {
      linjer.push({
        key: 'hovedkrav',
        title: 'Hovedkrav',
        paragrafRef: '§ 34.1.1–34.1.2',
        krevdBelop: domainConfig.hovedkravBelop,
        prekludert: computed.hovedkravPrekludert,
        vurdering: hovedkravVurdering,
        godkjentBelop: hovedkravGodkjentBelop,
      });
    }
    if (domainConfig.harRiggKrav) {
      linjer.push({
        key: 'rigg',
        title: 'Rigg og drift',
        paragrafRef: '§ 34.1.3',
        krevdBelop: domainConfig.riggBelop,
        prekludert: computed.hovedkravPrekludert || computed.riggPrekludert,
        vurdering: riggVurdering,
        godkjentBelop: riggGodkjentBelop,
      });
    }
    if (domainConfig.harProduktivitetKrav) {
      linjer.push({
        key: 'produktivitet',
        title: 'Produktivitetstap',
        paragrafRef: '§ 34.1.3',
        krevdBelop: domainConfig.produktivitetBelop,
        prekludert: computed.hovedkravPrekludert || computed.produktivitetPrekludert,
        vurdering: produktivitetVurdering,
        godkjentBelop: produktivitetGodkjentBelop,
      });
    }
    return linjer;
  });

  function handleKravlinjeVurdering(key: string, v: BelopVurdering | undefined) {
    if (key === 'hovedkrav') hovedkravVurdering = v;
    else if (key === 'rigg') riggVurdering = v;
    else {
      produktivitetVurdering = v;
      klippBegrensetBelop();
    }
  }

  function handleKravlinjeBelop(key: string, v: number | undefined) {
    if (key === 'hovedkrav') hovedkravGodkjentBelop = v;
    else if (key === 'rigg') riggGodkjentBelop = v;
    else produktivitetGodkjentBelop = v;
  }

  // VS-U5: beløpet etter begrensningen kan ikke stå over det som godtas for posten. Klippes når
  // vurderingen endres og når beløpsfeltet forlates, ikke under inntastingen.
  function klippBegrensetBelop() {
    if (produktivitetBegrensetBelop == null || !produktivitetVurdering) return;
    if (produktivitetVurdering === 'delvis' && produktivitetGodkjentBelop == null) return;
    const godtatt = beregnGodkjentBelop(
      produktivitetVurdering,
      domainConfig.produktivitetBelop ?? 0,
      produktivitetGodkjentBelop
    );
    if (produktivitetBegrensetBelop > godtatt) produktivitetBegrensetBelop = godtatt;
  }

  // LV-U31, LV-U32: spørsmålet bruker samme begrep som brevet når TE krever fast sum.
  const metodespoersmaal = $derived(
    domainConfig.metode === 'FASTPRIS_TILBUD'
      ? 'TE krever oppgjør som fast sum. Godkjenner du oppgjør som fast sum?'
      : `TE krever ${getVederlagsmetodeShortLabel(domainConfig.metode)?.toLowerCase() ?? 'ukjent metode'}. Aksepterer du beregningsmetoden?`
  );

  // Alternative metode options (ekskluderer TEs metode)
  const metodeAlternativer = $derived(
    VEDERLAGSMETODER_OPTIONS.filter(
      (o): o is { value: string; label: string } => !!o.value && o.value !== domainConfig.metode
    )
  );

  // OV-U58: et beløp som ikke kan leses, sendes ikke, og står i feltet til det er rettet.
  let ugyldigeBelop = $state<Record<string, boolean>>({});

  // Validation (matches production kanSende)
  const allAnswered = $derived.by(() => {
    if (Object.values(ugyldigeBelop).some(Boolean)) return false;
    if (computed.harPreklusjonsSteg && preklusjonsLinjer.some((l) => l.value === undefined))
      return false;
    if (akseptererMetode === undefined) return false;
    if (akseptererMetode === false && !oensketMetode) return false;
    if (kravlinjer.some((l) => !erKravlinjeGyldig(l.vurdering, l.godkjentBelop))) return false;
    if (!erBegrensetBelopGyldig(formState, domainConfig)) return false;
    // I TS-saken avgjør kjernen når svaret må ha en begrunnelse (KA-U24, KA-U41).
    if (!store.erKjernesak && isHtmlEmpty(begrunnelseHtml)) return false;
    return true;
  });

  const harVurdertHovedkrav = $derived(
    !domainConfig.harHovedkrav || hovedkravVurdering !== undefined
  );

  const begrunnelseVises = $derived(
    allAnswered || (akseptererMetode !== undefined && harVurdertHovedkrav)
  );

  // #1274: skjules begrunnelsen, viser ikke henvisningen øverst til et felt som ikke vises.
  $effect(() => {
    if (!begrunnelseVises) submission.feltetEndret();
  });

  $effect(() => {
    onactions?.({
      canSend: allAnswered && !submission.pending,
      send: () => {
        if (allAnswered)
          void submission.run(async () => {
            if (review) {
              const refs = submissionRefs(store.timeline, 'vederlag');
              const { eventType, data } = buildEventData(
                formState,
                domainConfig,
                computed,
                {
                  vederlagKravId: refs.claimId ?? review.claimId('vederlag'),
                  lastResponseEventId: refs.responseId,
                  isUpdateMode: Boolean(refs.responseId),
                },
                computed.subsidiaerTriggers
              );
              await review.prepare('vederlag', eventType as EventType, data, draft.snapshot());
              return;
            }
            // TS-saken: kjernen lager brevet og sender svaret på kravet den har i sporet (#1047).
            if (claimReview && store.erKjernesak) {
              const { eventType, data } = buildEventData(
                formState,
                domainConfig,
                computed,
                { vederlagKravId: '', isUpdateMode: false },
                computed.subsidiaerTriggers
              );
              await claimReview.submit('vederlag', eventType as EventType, data, () => {});
              return;
            }
            throw new Error('Skjemaet har ingen intern godkjenning, så svaret kan ikke sendes.');
          }, onsend);
      },
    });
  });

  const vurderingOptions: {
    value: BelopVurdering;
    label: string;
    cls: string;
    icon?: typeof Check;
  }[] = [
    { value: 'godkjent', label: sporResultatLabel('godkjent'), cls: 'yes', icon: Check },
    { value: 'delvis', label: sporResultatLabel('delvis_godkjent'), cls: 'partial' },
    { value: 'avslatt', label: sporResultatLabel('avslatt'), cls: 'no', icon: X },
  ];

  const vurderingLabel = (opt: (typeof vurderingOptions)[number], subsidiaert: boolean) =>
    !subsidiaert
      ? opt.label
      : opt.value === 'godkjent'
        ? 'Fullt beløp'
        : opt.value === 'delvis'
          ? 'Redusert beløp'
          : 'Null';
</script>

{#snippet yesNoPill(
  label: string,
  ref: string,
  text: string,
  answer: boolean | undefined,
  yesText: string,
  noText: string,
  onset: (v: boolean | undefined) => void,
  opts?: { alertText?: string }
)}
  <div class="question-block">
    <SectionHeading title={label} paragrafRef={ref} />
    <p class="question-text">{text}</p>
    <YesNoControl value={answer} {yesText} {noText} {label} onchange={onset} />
    {#if answer === false && opts?.alertText}
      <p class="font-serif consequence-text">{opts.alertText}</p>
    {/if}
  </div>
{/snippet}

<div class="form-content">
  <SkjemaStatus sender={submission.pending} feil={submission.oeverst} />

  <div class="form-title-row">
    <h1>Krav om vederlagsjustering</h1>
  </div>

  <div class="sammendrag">
    <div class="sammendrag-header">
      <div>
        <span class="sammendrag-eyebrow">Entreprenørens krav</span>
        <h2>{store.teNavn}</h2>
      </div>
      <span class="font-mono sammendrag-ref">§ 34.1</span>
    </div>

    <div class="sammendrag-okonomi">
      {#if domainConfig.metode}
        <div class="sammendrag-metode">
          <span class="sammendrag-metode-label">Beregningsmetode</span>
          <span class="sammendrag-metode-verdi">{getVederlagsmetodeLabel(domainConfig.metode)}</span
          >
        </div>
      {/if}

      <div class="sammendrag-kravlinjer">
        {#if domainConfig.harHovedkrav}
          <div class="sammendrag-kravlinje">
            <span class="sammendrag-kravlinje-label">Hovedkrav</span>
            <span class="font-mono sammendrag-kravlinje-belop"
              >{fmt(domainConfig.hovedkravBelop)},-</span
            >
          </div>
        {/if}
        {#if domainConfig.harRiggKrav && domainConfig.riggBelop}
          <div class="sammendrag-kravlinje">
            <span class="sammendrag-kravlinje-label">Rigg og drift</span>
            <span class="font-mono sammendrag-kravlinje-belop">{fmt(domainConfig.riggBelop)},-</span
            >
          </div>
        {/if}
        {#if domainConfig.harProduktivitetKrav && domainConfig.produktivitetBelop}
          <div class="sammendrag-kravlinje">
            <span class="sammendrag-kravlinje-label">Produktivitetstap</span>
            <span class="font-mono sammendrag-kravlinje-belop"
              >{fmt(domainConfig.produktivitetBelop)},-</span
            >
          </div>
        {/if}
        {#if sammendragKravlinjer.length > 1}
          <div class="sammendrag-kravlinje sammendrag-sum">
            <span class="sammendrag-kravlinje-label">Sum krevd</span>
            <span class="font-mono sammendrag-kravlinje-belop">{fmt(sammendragTotalKrevd)},-</span>
          </div>
        {/if}
      </div>
    </div>

    {#if store.display('vederlag').teText}
      <div class="sammendrag-begrunnelse-panel">
        <span class="sammendrag-begrunnelse-label">Entreprenørens begrunnelse</span>
        <div
          class="sammendrag-begrunnelse"
          class:avkortet={!begrunnelseUtvidet}
          bind:this={begrunnelseEl}
        >
          <p>{store.display('vederlag').teText}</p>
        </div>
        {#if erBegrunnelseAvkortet || begrunnelseUtvidet}
          <button
            class="vis-mer-btn"
            aria-expanded={begrunnelseUtvidet}
            onclick={() => (begrunnelseUtvidet = !begrunnelseUtvidet)}
          >
            {begrunnelseUtvidet ? 'Vis mindre' : 'Vis hele begrunnelsen'}
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#snippet formBodyBelow()}
    <!-- Beregningsmetode -->
    {@render yesNoPill(
      'Beregningsmetode',
      '§ 34.2',
      metodespoersmaal,
      akseptererMetode,
      'Ja',
      'Nei',
      (v) => {
        akseptererMetode = v;
        if (v === true) oensketMetode = undefined;
      }
    )}

    {#if akseptererMetode === false}
      <div class="foretrukket-metode">
        <span class="foretrukket-label">Foretrukket metode:</span>
        <SegmentedControl
          variant="mockup"
          label="Foretrukket metode"
          value={oensketMetode}
          options={metodeAlternativer.map((alt) => ({ id: alt.value, label: alt.label }))}
          onchange={(value) => (oensketMetode = value as VederlagsMetode)}
          onclear={() => (oensketMetode = undefined)}
        />
      </div>
    {/if}

    <!-- Kravlinjer (data-drevet) -->
    {#each kravlinjer as linje (linje.key)}
      <div class="question-block krav-linje-block">
        <SectionHeading title={linje.title} paragrafRef={linje.paragrafRef} />
        {#snippet kravlinjeContent()}
          <div class="kravlinje-header">
            <span class="font-mono kravlinje-krevd"
              >Krevd: <strong>{fmt(linje.krevdBelop ?? 0)}</strong> kr</span
            >
          </div>
          <SegmentedControl
            variant="mockup"
            label={linje.title}
            value={linje.vurdering}
            options={vurderingOptions.map((opt) => ({
              id: opt.value,
              label: vurderingLabel(opt, isSubsidiaer || linje.prekludert),
              icon: opt.icon ?? undefined,
              tone: opt.cls === 'yes' ? 'success' : opt.cls === 'partial' ? 'warning' : 'danger',
            }))}
            onchange={(value) => handleKravlinjeVurdering(linje.key, value)}
            onclear={() => handleKravlinjeVurdering(linje.key, undefined)}
          />
          {#if linje.vurdering === 'delvis'}
            <BelopFelt
              id={`bh-${linje.key}-godkjent`}
              label={isSubsidiaer || linje.prekludert
                ? 'Subsidiært vurdert beløp'
                : 'Godkjent beløp'}
              value={linje.godkjentBelop}
              maks={linje.krevdBelop}
              redusert={domainConfig.erKjernesak
                ? {
                    fullt: vurderingLabel(vurderingOptions[0], isSubsidiaer || linje.prekludert),
                    null: vurderingLabel(vurderingOptions[2], isSubsidiaer || linje.prekludert),
                  }
                : undefined}
              hint={linje.krevdBelop ? `Av ${visKroner(linje.krevdBelop)} kr krevd` : undefined}
              tilgjengeligNavn={`${isSubsidiaer || linje.prekludert ? 'Subsidiært vurdert beløp' : 'Godkjent beløp'} for ${linje.title.toLowerCase()}`}
              onchange={(v) => handleKravlinjeBelop(linje.key, v)}
              onugyldig={(u) => (ugyldigeBelop[linje.key] = u)}
              onblur={linje.key === 'produktivitet' ? klippBegrensetBelop : undefined}
            />
          {/if}
          {#if linje.key === 'produktivitet' && computed.produktivitetPrekludert && linje.vurdering}
            {@const godtatt = beregnGodkjentBelop(
              linje.vurdering,
              linje.krevdBelop ?? 0,
              linje.godkjentBelop
            )}
            <BelopFelt
              id="bh-produktivitet-begrenset"
              label="Godtas etter begrensningen"
              value={produktivitetBegrensetBelop}
              maks={godtatt}
              maksbetegnelse="det som godtas for posten"
              hint={`Utgiftene som ikke er rammet av det sene varselet (§ 34.1.3), høyst ${visKroner(godtatt)} kr. Kan være 0.`}
              onchange={(v) => (produktivitetBegrensetBelop = v)}
              onugyldig={(u) => (ugyldigeBelop.begrenset = u)}
            />
          {/if}
        {/snippet}

        {#if linje.prekludert}
          <span class="subsidiaer-chip kravlinje-subsidiaer-chip">Subsidiært</span>
        {/if}
        {@render kravlinjeContent()}
      </div>
    {/each}

    {#if begrunnelseVises}
      {#if kjernesak}
        {#if kjernelag && kjerneresultat}
          <div class="result-box konsekvens-{kjerneresultat.variant}">
            <div class="result-header">
              <kjerneresultat.ikon size={18} />
              <span class="result-label result-linje">{kjernelag.linje}</span>
            </div>
            <div class="result-tabell">
              <div class="tr tr-head">
                <span class="td td-krav">Krav</span>
                <span class="td td-tal">Krevd</span>
                <span class="td td-tal">Godkjent</span>
              </div>
              {#each kjernelag.lag as gruppe, i (i)}
                {#if gruppe.etikett}
                  <div class="tr tr-lag">
                    <span class="td td-lagnavn">{stor(gruppe.etikett)}</span>
                  </div>
                {/if}
                {#each gruppe.rader.map(lagradvisning) as rad, j (j)}
                  <div class="tr">
                    <span class="td td-krav">
                      {rad.tittel}
                      {#if rad.ref}<span class="td-ref">{rad.ref}</span>{/if}
                    </span>
                    <span class="td td-tal font-mono">
                      {#if rad.krevd === undefined}
                        <span class="td-emo">—</span>
                      {:else}
                        {fmt(rad.krevd)} kr
                      {/if}
                    </span>
                    <span class="td td-tal font-mono" class:td-avslag={rad.godkjent === 0}>
                      {#if rad.godkjent === undefined}
                        <span class="td-emo">—</span>
                      {:else}
                        {fmt(rad.godkjent)} kr
                      {/if}
                    </span>
                  </div>
                {/each}
              {/each}
            </div>
          </div>
        {/if}
        <div class="binder" role="note">
          <p>{BINDER.alltid}</p>
          {#if kjernelag?.sammenfall}<p>{BINDER.sammenfall}</p>{/if}
          {#if grunnlaget?.forbehold}<p>{BINDER.forbehold}</p>{/if}
        </div>
      {:else}
        <div class="result-box konsekvens-{resultat.variant}">
          <div class="result-header">
            <resultat.ikon size={18} />
            <span class="result-label">{resultat.konklusjon}</span>
          </div>
          <PositionExplanation
            subsidiary={computed.visSubsidiaertResultat}
            value={`vederlaget til ${fmt(computed.totalGodkjentInklPrekludert)} kr`}
            rejected={computed.prinsipaltResultat === 'avslatt'}
            triggers={[
              ...computed.subsidiaerTriggers,
              ...(domainConfig.grunnlagStatus === 'avslatt' ? ['grunnlag_avslatt' as const] : []),
              ...(erHelVederlagSubsidiaerPgaGrunnlag(domainConfig)
                ? ['grunnlag_prekludert_32_2' as const]
                : []),
            ]}
          />

          <div class="result-tabell">
            <div class="tr tr-head">
              <span class="td td-krav">Krav</span>
              <span class="td td-tal">Krevd</span>
              <span class="td td-tal">Prinsipalt godkjent</span>
              {#if computed.visSubsidiaertResultat}
                <span class="td td-tal">Subsidiært vurdert</span>
              {/if}
            </div>
            {#each resultatRader as rad (rad.key)}
              <div class="tr">
                <span class="td td-krav">
                  {rad.title}
                  <span class="td-ref">{rad.paragrafRef}</span>
                </span>
                <span class="td td-tal font-mono">{fmt(rad.krevdBelop ?? 0)} kr</span>
                <span class="td td-tal font-mono">
                  {#if rad.prekludert && rad.prinsipaltGodkjent === 0}
                    <span class="td-avslag">{fmt(rad.prinsipaltGodkjent)} kr</span>
                  {:else if rad.prekludert}
                    <span class="td-delvis">{fmt(rad.prinsipaltGodkjent)} kr</span>
                  {:else if rad.vurdering === 'avslatt'}
                    <span class="td-avslag">{fmt(rad.prinsipaltGodkjent)} kr</span>
                  {:else if rad.vurdering === 'delvis' && rad.prinsipaltGodkjent > 0}
                    <span class="td-delvis">{fmt(rad.prinsipaltGodkjent)} kr</span>
                  {:else}
                    <span>{fmt(rad.prinsipaltGodkjent)} kr</span>
                  {/if}
                </span>
                {#if computed.visSubsidiaertResultat}
                  <span class="td td-tal font-mono">
                    {#if rad.prekludert && rad.vurdering === 'avslatt'}
                      <span class="td-avslag">{fmt(rad.subsidiaertGodkjent)} kr</span>
                    {:else if rad.prekludert && rad.vurdering === 'delvis'}
                      <span class="td-delvis">{fmt(rad.subsidiaertGodkjent)} kr</span>
                    {:else if rad.prekludert}
                      <span>{fmt(rad.subsidiaertGodkjent)} kr</span>
                    {:else}
                      <span class="td-emo">—</span>
                    {/if}
                  </span>
                {/if}
              </div>
            {/each}
            <div class="tr tr-total">
              <span class="td td-krav">Totalt</span>
              <span class="td td-tal font-mono">{fmt(computed.totalKrevdInklPrekludert)} kr</span>
              <span class="td td-tal font-mono">{fmt(computed.totalGodkjent)} kr</span>
              {#if computed.visSubsidiaertResultat}
                <span class="td td-tal font-mono"
                  >{fmt(computed.totalGodkjentInklPrekludert)} kr</span
                >
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <div class="begrunnelse-section">
        <div class="sh-heading">
          <span class="sh-title">Begrunnelse</span>
        </div>
        <RichTextEditor
          navn="Begrunnelse"
          body={begrunnelseHtml}
          onchange={(html) => {
            begrunnelseHtml = html;
            submission.feltetEndret();
          }}
          maxHeight="none"
          placeholder="Begrunn byggherrens vurdering …"
          feil={submission.vedFeltet}
        />
      </div>
    {/if}
  {/snippet}

  {#snippet formBody()}
    <StandpointHeading subsidiary={isSubsidiaer} />

    <!-- Preklusjon (data-drevet, segment buttons) -->
    {#if computed.harPreklusjonsSteg}
      <div class="preklusjon-section">
        <SectionHeading title="Varsling" paragrafRef="§34.1.2 / §34.1.3" />
        <p class="question-text">Er kravene varslet innen kontraktens varslingsfrister?</p>
        {#each preklusjonsLinjer as linje (linje.key)}
          <div class="preklusjons-rad">
            <span class="preklusjons-copy">
              <span class="preklusjons-label">{linje.label} ({linje.ref})</span>
              {#if linje.submissionMeta}
                <span class="preklusjons-meta">{linje.submissionMeta}</span>
              {/if}
            </span>
            <YesNoControl
              value={linje.value}
              label={linje.label}
              yesText="Ja, i tide"
              noText="Nei, for sent"
              onchange={(value) => handlePreklusjon(linje.key, value)}
            />
          </div>
        {/each}
      </div>
    {/if}

    {@render formBodyBelow()}
  {/snippet}

  {#each grunnlagsvarsler as varsel (varsel)}
    <div class="subsidiaer-notice">
      <span class="subsidiaer-notice-mark" aria-hidden="true"></span>
      <p>{varsel}</p>
    </div>
  {/each}
  {@render formBody()}
</div>

<style>
  /* Form-specific styles (shared styles in theme.css) */

  .form-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .form-title-row h1 {
    font-size: 30px;
    font-weight: 700;
    line-height: 36px;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .subsidiaer-notice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 24px;
    color: var(--ink-2);
    background: var(--info-bg);
    border: var(--rule-strong);
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.6;
  }
  .subsidiaer-notice p {
    margin: 0;
  }
  .subsidiaer-notice-mark {
    flex: none;
    width: 10px;
    height: 10px;
    margin-top: 5px;
    background: var(--brand);
    border-radius: 1px;
    transform: rotate(45deg);
  }

  /* ── TE's vederlagskrav-sammendrag ── */
  .sammendrag {
    margin-bottom: 32px;
    overflow: hidden;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-sm);
  }
  .sammendrag-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border-bottom: var(--rule);
  }
  .sammendrag-header > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .sammendrag-eyebrow,
  .sammendrag-begrunnelse-label,
  .sammendrag-metode-label {
    font-size: 10px;
    font-weight: 600;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .sammendrag-header h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.35;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--ink);
  }
  .sammendrag-ref {
    flex: none;
    font-size: 11px;
    color: var(--ink-4);
  }
  .sammendrag-okonomi {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--surface-warm);
  }

  /* ── Lokal overskrift for begrunnelse (har ekstra kontroller; ellers identisk med SectionHeading) ── */
  .sh-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-wire);
  }
  .sh-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }

  /* ── Byggherrens beslutningsseksjoner ── */
  .form-content .question-block,
  .preklusjon-section {
    margin: 0 0 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .question-block .question-text {
    margin: 14px 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
  }

  .sammendrag-metode {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: var(--rule);
  }
  .sammendrag-metode-verdi {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .sammendrag-kravlinjer {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sammendrag-kravlinje {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 1px 0;
  }
  .sammendrag-kravlinje-label {
    font-size: 13px;
    color: var(--ink-2);
  }
  .sammendrag-kravlinje-belop {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
  .sammendrag-sum {
    border-top: var(--rule);
    padding-top: 7px;
    margin-top: 3px;
  }
  .sammendrag-sum .sammendrag-kravlinje-label {
    font-weight: 600;
    color: var(--ink);
  }
  .sammendrag-sum .sammendrag-kravlinje-belop {
    font-size: 14px;
    font-weight: 700;
  }
  .sammendrag-begrunnelse-panel {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 16px;
    border-top: var(--rule);
  }
  .sammendrag-begrunnelse {
    font-size: 14px;
    line-height: 1.65;
    color: var(--ink-2);
    overflow: hidden;
  }
  .sammendrag-begrunnelse p {
    margin: 0;
  }
  .sammendrag-begrunnelse.avkortet {
    max-height: calc(1.65em * 8);
  }
  .vis-mer-btn {
    width: fit-content;
    background: none;
    border: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
    cursor: pointer;
    padding: 0;
  }
  .vis-mer-btn:hover {
    color: var(--ink);
  }

  .subsidiaer-chip {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--green);
    padding: 5px 8px;
    background: color-mix(in srgb, var(--green-bg) 55%, transparent);
    border: 1px dashed var(--green);
    border-radius: 6px;
  }
  .kravlinje-subsidiaer-chip {
    margin-top: 12px;
    margin-bottom: 14px;
  }

  .kravlinje-header {
    margin: 14px 0 12px;
  }
  .kravlinje-krevd {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .result-box {
    margin-top: 24px;
    padding: 16px;
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 12px;
  }
  .result-box.konsekvens-positive {
    background: var(--surface);
  }
  .result-box.konsekvens-negative {
    background: var(--surface);
  }
  .result-box.konsekvens-mixed {
    background: var(--surface);
  }
  .result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1;
  }
  .konsekvens-positive .result-header {
    color: var(--success);
  }
  .konsekvens-negative .result-header {
    color: var(--danger);
  }
  .konsekvens-mixed .result-header {
    color: color-mix(in srgb, var(--warning) 78%, var(--ink));
  }

  /* ── Granulær resultat-tabell ── */
  .result-tabell {
    margin-top: 14px;
    border: var(--rule);
    border-radius: 8px;
    overflow: hidden;
  }
  .tr {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .tr + .tr {
    border-top: var(--rule);
  }
  .tr-head {
    background: var(--surface-inset);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .td {
    padding: 8px 12px;
    min-width: 0;
  }
  .td-krav {
    flex: 1.4;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .tr-head .td-krav {
    flex-direction: row;
  }
  .td-ref {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    color: var(--ink-4);
  }
  .td-tal {
    flex: 1;
    text-align: right;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
  }
  .tr-total {
    background: var(--surface-inset);
    font-weight: 600;
  }
  .tr-total .td-krav {
    color: var(--ink);
    font-weight: 700;
  }
  .tr-total .td-tal {
    color: var(--ink);
    font-weight: 600;
  }
  .td-avslag {
    color: var(--danger);
  }
  .td-delvis {
    color: var(--ink-2);
  }
  .td-emo {
    color: var(--ink-4);
  }
  .binder {
    margin-top: 12px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-2);
  }
  .binder p + p {
    margin-top: 4px;
  }
  .tr-lag {
    background: var(--surface-inset);
  }
  .td-lagnavn {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
  }
  .result-linje {
    line-height: 1.45;
  }

  .foretrukket-metode {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
    padding: 12px;
    background: var(--surface-inset);
    border-radius: 8px;
  }
  .foretrukket-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-4);
  }

  .begrunnelse-section {
    margin-top: 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }

  .preklusjon-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .preklusjon-section .question-text {
    margin: 14px 0 8px;
    font-size: 14px;
    line-height: 1.55;
  }
  .preklusjons-rad {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: var(--rule-subtle);
  }
  .preklusjons-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .preklusjons-copy {
    min-width: 0;
  }
  .preklusjons-meta {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--ink-4);
  }
</style>
