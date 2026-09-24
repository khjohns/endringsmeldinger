<!--
  Step 2 (brev) and step 3 (godkjenning) of the BH response flow, in the page — not a modal.
  The letter is the document; ApprovalPanel carries authority, the derived chain and the action.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Check, LockKeyhole, Pencil, RefreshCw, Send } from 'lucide-svelte';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  import { getApprovalWorkspace } from '$lib/approval/context.svelte';
  import {
    demoUsers,
    trackNames,
    type ApprovalPackage,
    type LetterDocument,
    type ReviewItem,
  } from '$lib/approval/types';
  import { decisionSummary, documentToBrev, letterText } from '$lib/approval/letter';
  import { calculateAuthority, kravFraSak } from '$lib/approval/authority';
  import {
    limitLabel,
    nok,
    resolveRoute,
    withLimit,
    type ApprovalChainNode,
  } from '$lib/approval/route';
  import ApprovalPanel from '$lib/components/approval/ApprovalPanel.svelte';
  import LetterPreviewModal from './LetterPreviewModal.svelte';
  import { formatDateNorwegian } from '$lib/utils/dateFormatters';

  let {
    onclose,
    onrevise,
  }: { onclose: () => void; onrevise: (item: ReviewItem) => void | Promise<void> } = $props();
  const store = getCaseWorkspace();
  const review = getApprovalWorkspace()!;

  let introduction = $state(
    `Vi viser til deres krav i sak ${store.sak.sak_id} – «${store.sak.grunnlag.tittel ?? store.sak.sakstittel}». Byggherrens vurdering følger nedenfor.`
  );
  let closing = $state(`Med vennlig hilsen\n${store.bhNavn}`);
  let editSection = $state('');
  let confirmed = $state(false);
  let showReturn = $state(false);
  let returnComment = $state('');
  let showPdf = $state(false);
  let showChanges = $state(false);
  let localError = $state('');
  let draftSaved = $state(false);
  let initialized = $state(false);
  let selectedId = $state('');

  const ready = $derived(
    review.state.items.filter((i) => i.status === 'ferdigstilt' && i.owner === review.actor)
  );
  const visible = (p: ApprovalPackage) =>
    p.owner === review.actor || p.steps.some((s) => s.id === review.actor);
  const inFlight = $derived(
    [...review.state.packages]
      .reverse()
      .find(
        (p) =>
          visible(p) && ['til_godkjenning', 'godkjent', 'publisering_feilet'].includes(p.status)
      )
  );
  const latest = $derived([...review.state.packages].reverse().find(visible));
  /** The package the page shows: an explicit pick, one in flight, else the draft or the latest. */
  const selected = $derived(
    review.state.packages.find((p) => p.id === selectedId) ??
      inFlight ??
      (ready.length ? undefined : latest)
  );
  const previous = $derived(
    [...review.state.packages]
      .reverse()
      .find(
        (p) =>
          p.owner === review.actor &&
          (p.status === 'returnert' || p.status === 'trukket') &&
          ready.some((i) => p.letter.items.some((old) => old.id === i.previousId))
      )
  );
  const previousPackage = $derived(
    review.state.packages.find((p) => p.id === selected?.previousId)
  );
  const dailyRate = $derived(review.dailyRate);
  const draftLetter: LetterDocument = $derived({
    authorityContext: {
      dailyRate,
      krav: kravFraSak(store.sak),
      matrixVersion: '2026-01',
    },
    title: 'Svar på endringsmelding',
    caseId: store.sak.sak_id,
    caseTitle: store.sak.grunnlag.tittel ?? store.sak.sakstittel,
    sender: store.bhNavn,
    recipient: store.teNavn,
    date: formatDateNorwegian(new Date().toISOString()),
    introduction,
    closing,
    items: ready,
  });
  const letter = $derived(selected?.letter ?? draftLetter);
  const isDraft = $derived(!selected);
  const outdated = $derived(selected?.status !== 'sendt' && review.outdated(letter.items));
  const active = $derived(selected?.steps.find((s) => s.status === 'aktiv'));
  const lastStep = $derived(selected?.steps.at(-1)?.id === review.actor);
  const canDecide = $derived(selected?.status === 'til_godkjenning' && active?.id === review.actor);
  const canWithdraw = $derived(
    selected?.status === 'til_godkjenning' &&
      selected.owner === review.actor &&
      !selected.steps.some((s) => s.status === 'godkjent')
  );

  // Authority: the highest total position, compared with the sender's own limit.
  const assessment = $derived(
    calculateAuthority(
      letter.items,
      letter.authorityContext?.dailyRate ?? dailyRate,
      letter.authorityContext?.krav ?? kravFraSak(store.sak)
    )
  );
  const sender = $derived(withLimit(review.sender ?? { name: 'Saksbehandler', role: '' }));
  const route = $derived(
    resolveRoute({
      amount: assessment.amount,
      minimum: assessment.minimum,
      sender,
      chain: review.chain.map(withLimit),
    })
  );
  const tracks = $derived(letter.items.map((i) => trackNames[i.track]).join(' · '));
  const plural = (n: number) => `${n} ${n === 1 ? 'vurdering' : 'vurderinger'}`;
  const amountLabel = $derived(
    assessment.ukjent
      ? assessment.minimum
        ? `uavklart, minst ${nok(assessment.minimum)}`
        : 'uavklart'
      : assessment.amount === null
        ? 'Kan ikke beregnes'
        : nok(assessment.amount)
  );

  const calculation = $derived({
    summaryLabel: 'Se beregning · fullmaktsmatrise januar 2026',
    rows: [
      ...assessment.rows.flatMap((row) =>
        row.fraKrav
          ? [
              {
                label: `${trackNames[row.track]} · krevd av TE (godkjent ansvar)`,
                value:
                  row.principal === null
                    ? 'Ikke tallfestet'
                    : row.principalAmount === null
                      ? 'Uavklart'
                      : nok(row.principalAmount),
              },
            ]
          : row.track === 'frist'
            ? [
                {
                  label: `Frist · prinsipalt ${row.principal} d / subsidiært ${row.subsidiary} d`,
                  value: row.subsidiaryAmount === null ? 'Uavklart' : nok(row.subsidiaryAmount),
                },
              ]
            : [
                {
                  label: `${trackNames[row.track]} · prinsipalt / subsidiært`,
                  value: `${nok(row.principal)} / ${nok(row.subsidiary)}`,
                },
              ]
      ),
      {
        label: 'Prinsipalt standpunkt',
        value: assessment.principal === null ? 'Uavklart' : nok(assessment.principal),
      },
      {
        label: 'Subsidiært standpunkt',
        value: assessment.subsidiary === null ? 'Uavklart' : nok(assessment.subsidiary),
      },
    ],
    note: `Høyeste samlede standpunkt legges til grunn. Alternative standpunkter summeres ikke.${
      assessment.rows.some((r) => r.track === 'frist')
        ? ` Frist verdsettes som dager × ${dailyRate ? `${nok(dailyRate)} per dag` : 'dagmulktssats (mangler)'}.`
        : ''
    }`,
  });

  const stepNodes = $derived.by((): ApprovalChainNode[] => {
    if (!selected) return route.route;
    const owner =
      selected.ownerName ?? demoUsers.find((u) => u.id === selected.owner)?.name ?? selected.owner;
    return [
      {
        id: selected.owner,
        name: owner,
        role: selected.owner === review.actor ? 'Saksbehandler · deg' : 'Saksbehandler',
        state: 'sender',
        metaLabel: formatDateNorwegian(selected.createdAt),
        statusLabel: 'Sendt',
      },
      ...selected.steps.map(
        (s): ApprovalChainNode => ({
          id: s.id,
          name: s.name,
          role: s.id === review.actor ? `${s.role} · deg` : s.role,
          state: s.status === 'godkjent' ? 'done' : s.status === 'aktiv' ? 'active' : 'waiting',
          metaLabel:
            s.status === 'godkjent' && s.decidedAt
              ? formatDateNorwegian(s.decidedAt)
              : limitLabel(withLimit(s).limit),
          statusLabel:
            s.status === 'godkjent' ? 'Godkjent' : s.status === 'aktiv' ? 'Behandler' : 'Venter',
        })
      ),
    ];
  });

  onMount(() => {
    void review.load().then(() => {
      const saved = review.state.drafts?.[review.actor];
      if (saved) {
        introduction = saved.introduction;
        closing = saved.closing;
      }
      initialized = true;
    });
  });

  async function run(action: () => Promise<void>) {
    localError = '';
    try {
      await action();
    } catch (cause) {
      localError = cause instanceof Error ? cause.message : 'Handlingen feilet.';
    }
  }
  async function saveLetter() {
    if (selected || !review.canPrepare || !initialized) return;
    await review.command({
      action: 'saveLetter',
      draft: { introduction, closing, included: ready.map((i) => i.id) },
    });
    draftSaved = true;
  }
  async function back() {
    await run(async () => {
      await saveLetter();
      onclose();
    });
  }
  async function send() {
    await review.command({
      action: 'package',
      letter: $state.snapshot(draftLetter),
      previousId: previous?.id,
    });
    const created = review.state.packages.at(-1)!;
    selectedId = created.id;
    confirmed = false;
    if (created.status === 'godkjent')
      await review.command({ action: 'publish', packageId: created.id });
  }
  async function approve() {
    if (!selected) return;
    const packageId = selected.id;
    await review.command({ action: 'approve', packageId });
    confirmed = false;
    if (review.state.packages.find((p) => p.id === packageId)?.status === 'godkjent')
      await review.command({ action: 'publish', packageId });
  }

  type PanelState = {
    eyebrow: string;
    title: string;
    description: string;
    footnote?: string;
    primary?: { label: string; action: () => Promise<void>; disabled?: boolean };
    secondary?: { label: string; action: () => void };
    tertiary?: { label: string; action: () => void; danger?: boolean };
    confirm?: string;
    content?: boolean;
    figures?: boolean;
  };
  const pdf = { label: 'Se PDF', action: () => (showPdf = true) };
  const panel = $derived.by((): PanelState => {
    if (isDraft) {
      if (!review.canPrepare)
        return {
          eyebrow: 'Ingen brev til behandling',
          title: 'Ingenting venter på deg',
          description: 'Brev du skal godkjenne vises her når saksbehandleren sender dem.',
        };
      if (!ready.length)
        return {
          eyebrow: 'Brev',
          title: 'Start med en vurdering',
          description:
            'Ferdigstill ansvarsgrunnlag, økonomi eller frist i saken. Vurderingene blir brevet til entreprenøren.',
          content: false,
        };
      const base = {
        confirm: 'Jeg har kontrollert brevet og vedleggene.',
        content: true,
        figures: true,
        secondary: pdf,
      };
      if (assessment.amount === null && !assessment.ukjent)
        return {
          ...base,
          eyebrow: 'Kan ikke sendes',
          title: 'Fullmakt kan ikke beregnes',
          description:
            'Fristen verdsettes med dagmulktssatsen, som mangler for prosjektet. Satsen må konfigureres før brevet kan sendes.',
          primary: { label: 'Send til godkjenning', action: send, disabled: true },
        };
      if (route.exceedsAllAuthority)
        return {
          ...base,
          eyebrow: 'Over all fullmakt',
          title: 'Ingen i kjeden kan godkjenne',
          description: `Samlet standpunkt ${amountLabel} overstiger fullmakten til alle i godkjenningskjeden. Kjeden må utvides før brevet kan sendes.`,
          primary: { label: 'Send til godkjenning', action: send, disabled: true },
        };
      if (!route.requiresApproval)
        return {
          ...base,
          eyebrow: 'Klar for sending',
          title: 'Du kan sende selv',
          description: assessment.ukjent
            ? 'Godkjent ansvar åpner for krav som ikke er tallfestet, så fullmaktsgrunnlaget kan ikke beregnes. Du har ubegrenset fullmakt, og svaret sendes til entreprenøren med én gang.'
            : `Samlet standpunkt ${amountLabel} er innenfor din fullmakt. Svaret sendes til entreprenøren med én gang.`,
          primary: { label: 'Send svar', action: send },
          footnote: 'Entreprenøren får svaret straks. Vurderingene låses når brevet er sendt.',
        };
      return {
        ...base,
        eyebrow: 'Krever godkjenning',
        title: `${route.decider!.role} må godkjenne`,
        description: assessment.ukjent
          ? `Godkjent ansvar åpner for krav som ikke er tallfestet, så fullmaktsgrunnlaget kan ikke beregnes${assessment.minimum ? ` (verdsatt: ${nok(assessment.minimum)})` : ''}. Svaret går gjennom hele fullmaktskjeden og sendes til entreprenøren når siste godkjenner har godkjent.`
          : `Samlet standpunkt ${amountLabel} overstiger din fullmakt. Svaret går sekvensielt gjennom fullmaktskjeden og sendes til entreprenøren når siste godkjenner har godkjent.`,
        primary: { label: 'Send til godkjenning', action: send },
        footnote:
          'Entreprenøren får tilgang først etter siste godkjenning. Vurderingene er låst mens brevet er til godkjenning.',
      };
    }
    const p = selected!;
    const sentAt = formatDateNorwegian(p.createdAt);
    switch (p.status) {
      case 'til_godkjenning':
        if (canDecide)
          return {
            eyebrow: `Til godkjenning · sendt ${sentAt}`,
            title: 'Din godkjenning',
            description: lastStep
              ? `Samlet standpunkt ${amountLabel}. Du avgjør saken: godkjenning sender svaret til entreprenøren.`
              : `Samlet standpunkt ${amountLabel}. Etter din godkjenning går brevet videre i kjeden.`,
            confirm: 'Jeg har kontrollert brevet.',
            figures: true,
            content: true,
            primary: { label: lastStep ? 'Godkjenn og send' : 'Godkjenn', action: approve },
            secondary: { label: 'Returner', action: () => (showReturn = !showReturn) },
            tertiary: pdf,
            footnote: lastStep
              ? 'Entreprenøren får svaret når du godkjenner. Brevet kan ikke endres etter dette.'
              : 'Entreprenøren får tilgang først etter siste godkjenning.',
          };
        return {
          eyebrow: `Til godkjenning · sendt ${sentAt}`,
          title: `${active?.name ?? 'Neste godkjenner'} behandler brevet`,
          description: `Samlet standpunkt ${amountLabel}. Brevet går sekvensielt gjennom kjeden.`,
          figures: true,
          content: true,
          secondary: pdf,
          tertiary: canWithdraw
            ? {
                label: 'Trekk fra godkjenning',
                action: () =>
                  void run(() => review.command({ action: 'withdraw', packageId: p.id })),
                danger: true,
              }
            : undefined,
          footnote:
            'Entreprenøren får tilgang først etter siste godkjenning. Vurderingene er låst mens brevet behandles.',
        };
      case 'godkjent':
      case 'publisering_feilet':
        return {
          eyebrow: p.status === 'godkjent' ? 'Godkjent' : 'Sending feilet',
          title: p.status === 'godkjent' ? 'Klar til sending' : 'Brevet ble ikke sendt',
          description: p.error ?? 'Brevet er godkjent, men ikke publisert i saken ennå.',
          content: true,
          primary: {
            label: 'Prøv sending igjen',
            action: () => review.command({ action: 'publish', packageId: p.id }),
          },
          secondary: pdf,
          footnote: 'Entreprenøren får svaret når sendingen er bekreftet.',
        };
      case 'sendt':
        return {
          eyebrow: `Sendt ${formatDateNorwegian(p.sentAt)}`,
          title: 'Svaret er sendt',
          description: `${tracks} er publisert i saken.`,
          content: true,
          secondary: pdf,
          footnote: 'Entreprenøren har fått svaret. Brev og vurderinger er låst.',
        };
      default:
        return {
          eyebrow: p.status === 'returnert' ? 'Returnert' : 'Trukket',
          title: 'Revider vurderingene',
          description:
            p.status === 'returnert'
              ? 'Brevet er returnert. Revider vurderingene i saken og send et nytt brev.'
              : 'Brevet er trukket fra godkjenning. Revider vurderingene i saken og send et nytt brev.',
          content: true,
          secondary: pdf,
        };
    }
  });

  const decidingStep = $derived(selected?.steps.at(-1));
  const figures = $derived([
    {
      label: 'Høyeste samlede standpunkt',
      value: amountLabel,
      over: isDraft && route.requiresApproval,
    },
    isDraft || !decidingStep
      ? {
          label: `Din fullmakt${sender.role ? ` · ${sender.role}` : ''}`,
          value: limitLabel(sender.limit),
        }
      : {
          label: `Avgjøres av · ${decidingStep.role}`,
          value: limitLabel(withLimit(decidingStep).limit),
        },
  ]);
</script>

<div class="approval-view">
  <div class="toolbar">
    <button class="text-button" onclick={() => void back()}><ArrowLeft size={15} />Til saken</button
    >
    <ol class="steps" aria-label="Fremdrift">
      <li>1 <span>Vurdering</span></li>
      <li class:current={isDraft}>2 <span>Brev</span></li>
      <li class:current={!isDraft}>3 <span>Godkjenning</span></li>
    </ol>
    <div class="toolbar-actions">
      {#if store.isDemo}
        <label class="demo-actor">
          <span>Demo · vis som</span>
          <select
            value={review.actor}
            onchange={(e) => {
              review.setActor(e.currentTarget.value);
              selectedId = '';
              showReturn = false;
            }}
          >
            {#each demoUsers as user (user.id)}<option value={user.id}
                >{user.name} · {user.role}</option
              >{/each}
          </select>
        </label>
      {/if}
      <button
        class="text-button"
        disabled={review.busy}
        onclick={() =>
          run(async () => {
            await review.load();
            if (!store.isDemo) await store.refresh();
          })}><RefreshCw size={15} />Oppdater status</button
      >
    </div>
  </div>

  <div class="layout">
    <div class="document">
      {#if outdated}<p class="notice error" role="alert">
          Entreprenøren har endret kravet. Vurderingene må revideres før brevet kan godkjennes og
          sendes.
        </p>{/if}
      {#if selected?.comment}<div class="notice">
          <strong>Returnert med kommentar</strong>
          <p>{selected.comment}</p>
        </div>{/if}
      {#if previousPackage}
        <div class="notice">
          <button class="edit-section" onclick={() => (showChanges = !showChanges)}
            >{showChanges ? 'Skjul endringer' : 'Se endringer siden forrige behandling'}</button
          >
          {#if showChanges}
            {#if previousPackage.letter.introduction !== letter.introduction}<p>
                Innledningen er endret.
              </p>{/if}
            {#each letter.items as item (item.id)}
              {@const old = previousPackage.letter.items.find((i) => i.track === item.track)}
              <h3>{trackNames[item.track]}</h3>
              {#if old && JSON.stringify(old.data) === JSON.stringify(item.data)}<p>
                  Vurderingen er uendret.
                </p>{:else}
                <p><strong>Tidligere:</strong> {old ? decisionSummary(old) : 'Ikke inkludert'}</p>
                {#if old}<p class="prose">{letterText(old.data.begrunnelse)}</p>{/if}
                <p><strong>Nå:</strong> {decisionSummary(item)}</p>
                <p class="prose">{letterText(item.data.begrunnelse)}</p>
              {/if}
            {/each}
            {#if previousPackage.letter.closing !== letter.closing}<p>
                Avslutningen er endret.
              </p>{/if}
          {/if}
        </div>
      {/if}

      {#if !letter.items.length}
        <div class="empty-state">
          <h2>{review.canPrepare ? 'Ingen ferdigstilte vurderinger' : 'Ingen brev å vise'}</h2>
          <p>
            {review.canPrepare
              ? 'Åpne ansvarsgrunnlag, økonomi eller frist og ferdigstill vurderingen. Den blir innholdet i brevet.'
              : 'Når et brev sendes til deg for godkjenning, vises det her.'}
          </p>
          <button class="text-button" onclick={() => void back()}
            ><ArrowLeft size={15} />Til vurderingene</button
          >
        </div>
      {:else}
        <article class="letter-paper">
          <div class="letter-meta">
            <strong>{letter.sender}</strong><span>{letter.date}<br />Sak {letter.caseId}</span>
          </div>
          <p class="recipient"><span class="eyebrow">Til</span><br />{letter.recipient}</p>
          <h1>{letter.title}</h1>
          <p class="case-title">{letter.caseTitle}</p>
          <section>
            {#if isDraft && review.canPrepare}<button
                class="edit-section"
                onclick={() => (editSection = editSection === 'intro' ? '' : 'intro')}
                ><Pencil size={13} />Rediger innledning</button
              >{/if}
            {#if isDraft && editSection === 'intro'}<textarea
                aria-label="Innledning"
                bind:value={introduction}
                oninput={() => (draftSaved = false)}
                onblur={() => run(saveLetter)}
                rows="4"
              ></textarea>{:else}<p class="prose">{letter.introduction}</p>{/if}
          </section>
          {#each letter.items as item (item.id)}
            <section class="assessment">
              <div class="section-heading">
                <h2>{trackNames[item.track]}</h2>
                {#if (isDraft || selected?.status === 'returnert' || selected?.status === 'trukket') && review.canPrepare && item.owner === review.actor}<button
                    class="edit-section"
                    onclick={() => run(async () => await onrevise(item))}>Revider vurdering</button
                  >{/if}
              </div>
              <p class="decision">
                <LockKeyhole size={14} /><span>{decisionSummary(item)}</span>
              </p>
              <p class="prose">
                {letterText(item.data.begrunnelse ?? item.data.beskrivelse) ||
                  'Ingen utdypende begrunnelse.'}
              </p>
              {#if item.attachments?.length}<p class="attachments">
                  Vedlegg: {item.attachments.map((v) => v.navn).join(', ')}
                </p>{/if}
            </section>
          {/each}
          <section>
            {#if isDraft && review.canPrepare}<button
                class="edit-section"
                onclick={() => (editSection = editSection === 'closing' ? '' : 'closing')}
                ><Pencil size={13} />Rediger avslutning</button
              >{/if}
            {#if isDraft && editSection === 'closing'}<textarea
                aria-label="Avslutning"
                bind:value={closing}
                oninput={() => (draftSaved = false)}
                onblur={() => run(saveLetter)}
                rows="3"
              ></textarea>{:else}<p class="prose">{letter.closing}</p>{/if}
          </section>
        </article>
      {/if}
    </div>

    <div class="panel-column">
      <ApprovalPanel
        eyebrow={panel.eyebrow}
        title={panel.title}
        description={panel.description}
        figures={panel.figures && letter.items.length ? figures : []}
        calculation={panel.figures && letter.items.length ? calculation : undefined}
        chain={letter.items.length && (isDraft ? route.requiresApproval : true)
          ? stepNodes
          : undefined}
        content={panel.content && letter.items.length
          ? {
              label: 'Innhold:',
              value: `${tracks} · ${plural(letter.items.length)}`,
              actionLabel: isDraft && review.canPrepare ? 'Endre' : undefined,
              onaction: () => void back(),
            }
          : undefined}
        confirmLabel={panel.confirm}
        bind:confirmed
        primaryLabel={panel.primary?.label}
        primaryDisabled={panel.primary
          ? panel.primary.disabled ||
            review.busy ||
            outdated ||
            (panel.confirm ? !confirmed : false)
          : undefined}
        onprimary={() => panel.primary && void run(panel.primary.action)}
        secondaryLabel={panel.secondary?.label}
        onsecondary={panel.secondary?.action}
        secondaryDisabled={review.busy}
        tertiaryLabel={panel.tertiary?.label}
        ontertiary={panel.tertiary?.action}
        tertiaryDanger={panel.tertiary?.danger}
        footnote={panel.footnote}
      >
        {#snippet primaryIcon()}
          {#if canDecide}<Check size={15} />{:else}<Send size={15} />{/if}
        {/snippet}
        {#if showReturn && canDecide}
          <div class="return-box">
            <label for="return-comment">Hva må saksbehandler endre?</label>
            <textarea id="return-comment" bind:value={returnComment} rows="3" required></textarea>
            <button
              class="text-button strong"
              disabled={!returnComment.trim() || review.busy}
              onclick={() =>
                run(async () => {
                  await review.command({
                    action: 'return',
                    packageId: selected!.id,
                    comment: returnComment,
                  });
                  showReturn = false;
                  returnComment = '';
                })}>Returner til saksbehandler</button
            >
          </div>
        {/if}
        {#if selected?.status === 'sendt' && selected.notificationStatus === 'not_configured'}<p
            class="panel-note"
          >
            Ekstern varsling er ikke konfigurert.
          </p>{/if}
        {#if selected?.status === 'sendt' && selected.notificationStatus === 'failed'}<p
            class="panel-note error"
          >
            Publisert i saken, men ekstern varsling feilet.
            <button
              class="inline-link"
              disabled={review.busy}
              onclick={() =>
                run(() => review.command({ action: 'publish', packageId: selected!.id }))}
              >Prøv igjen</button
            >
          </p>{/if}
        {#if localError || review.error}<p class="panel-note error" role="alert">
            {localError || review.error}
          </p>{/if}
        {#if draftSaved && isDraft}<p class="panel-note">Brevutkast lagret.</p>{/if}
      </ApprovalPanel>
    </div>
  </div>

  {#if showPdf}<LetterPreviewModal
      brevInnhold={documentToBrev(letter, selected?.id ?? 'utkast')}
      draft={!selected || selected.status !== 'sendt'}
      onclose={() => (showPdf = false)}
    />{/if}
</div>

<style>
  .approval-view {
    padding: 20px 32px 64px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 20px;
    max-width: 1180px;
    margin: 0 auto 24px;
  }
  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .steps {
    display: flex;
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    color: var(--ink-4);
  }
  .steps li {
    font-family: var(--font-data);
  }
  .steps span {
    font-family: var(--font-ui);
  }
  .steps .current {
    color: var(--ink);
    font-weight: 600;
  }
  .text-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    background: transparent;
    color: var(--ink-3);
    padding: 8px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    border-radius: 8px;
  }
  .text-button:hover:not(:disabled) {
    background: var(--surface-inset);
    color: var(--ink);
  }
  .text-button:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  .text-button.strong {
    border: var(--control-border);
    color: var(--ink);
    margin-top: 8px;
  }
  .demo-actor {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--ink-3);
  }
  .demo-actor select {
    padding: 7px 8px;
    color: var(--ink);
    background: var(--surface);
    border: var(--control-border);
    border-radius: 6px;
    font-size: 12px;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 28px;
    max-width: 1180px;
    margin: 0 auto;
    align-items: start;
  }
  .letter-paper {
    background: var(--surface);
    border: var(--rule);
    border-radius: 14px;
    padding: 36px 44px;
    box-shadow: 0 3px 12px rgb(0 0 0 / 3%);
  }
  .letter-meta {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    font-size: 12px;
    line-height: 1.7;
  }
  .letter-meta span {
    text-align: right;
    color: var(--ink-3);
  }
  .recipient {
    margin: 18px 0;
    font-size: 14px;
  }
  .eyebrow {
    font-size: 11px;
    color: var(--ink-3);
  }
  h1 {
    font-size: 26px;
    font-weight: 650;
    letter-spacing: -0.025em;
    line-height: 1.3;
    margin-bottom: 8px;
  }
  .case-title {
    font-size: 14px;
    color: var(--ink-3);
    margin: 0 0 20px;
  }
  section {
    margin: 18px 0;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .section-heading h2 {
    font-size: 17px;
  }
  .decision {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-size: 13px;
    font-weight: 600;
    padding: 12px 0;
    border-block: var(--rule);
  }
  .decision :global(svg) {
    flex-shrink: 0;
  }
  .prose {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 14px;
    line-height: 1.55;
  }
  .attachments {
    margin-top: 10px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .edit-section {
    border: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--surface-inset);
    color: var(--ink-2);
    cursor: pointer;
    font-size: 11px;
  }
  .edit-section:hover {
    color: var(--ink);
  }
  textarea {
    width: 100%;
    padding: 12px;
    border: var(--control-border);
    border-radius: 6px;
    color: var(--ink);
    background: var(--surface);
    font: inherit;
    line-height: 1.6;
    resize: vertical;
  }
  .notice {
    padding: 16px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 13px;
    line-height: 1.6;
  }
  .notice p {
    white-space: pre-wrap;
  }
  .error {
    color: var(--danger);
  }
  .empty-state {
    padding: 56px 40px 40px;
    text-align: center;
    border: var(--rule);
    border-radius: 14px;
    background: var(--surface);
  }
  .empty-state h2 {
    font-size: 22px;
    font-weight: 650;
    margin: 0 0 12px;
  }
  .empty-state p {
    max-width: 430px;
    margin: 0 auto 20px;
    color: var(--ink-3);
    font-size: 14px;
    line-height: 1.7;
  }
  .return-box {
    margin: 16px 0 0;
  }
  .return-box label {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  .panel-note {
    margin: 14px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ink-3);
  }
  .inline-link {
    border: 0;
    background: none;
    padding: 0;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .text-button:focus-visible,
  .edit-section:focus-visible,
  .inline-link:focus-visible {
    outline: 2px solid var(--control-focus, var(--brand));
    outline-offset: 3px;
  }
  @media (max-width: 1000px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .panel-column :global(.approval-panel) {
      position: static;
    }
  }
  @media (max-width: 600px) {
    .approval-view {
      padding: 16px 12px 48px;
    }
    .letter-paper {
      padding: 24px 20px;
    }
    .steps {
      order: 3;
      width: 100%;
    }
  }
</style>
