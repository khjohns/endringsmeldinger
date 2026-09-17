<!--
  Step "Kontroller og utsted" for a change order: authority, the derived chain and the issue
  action in the same ApprovalPanel as responses to claims. Without an approval policy for the
  project the order is issued directly, as before.
-->
<script lang="ts">
  import { Check, FileCheck2, Send } from 'lucide-svelte';
  import ApprovalPanel from '$lib/components/approval/ApprovalPanel.svelte';
  import type { CreateEORequest, EOApprovalPackage } from '$lib/api/endringsordre';
  import type { EOApprovalWorkspace } from '$lib/approval/eoApproval.svelte';
  import {
    limitLabel,
    nok,
    resolveRoute,
    withLimit,
    type ApprovalChainNode,
  } from '$lib/approval/route';
  import { demoUsers } from '$lib/approval/types';
  import { eoExposure } from '$lib/domain/endringsordre';
  import { formatDateNorwegian } from '$lib/utils/dateFormatters';

  let {
    approvals,
    request,
    pkg,
    issuedHref,
    onedit,
    onissued,
    legacy,
  }: {
    approvals: EOApprovalWorkspace;
    /** The order being prepared, as it will be issued */
    request: CreateEORequest;
    /** A package already sent; the panel then tracks it */
    pkg?: EOApprovalPackage;
    issuedHref: (sakId: string) => string;
    onedit?: () => void;
    onissued?: (sakId: string) => void;
    /** Direct issuance for projects without an approval policy */
    legacy: { issue: () => Promise<void>; sending: boolean; createdId: string };
  } = $props();

  let confirmed = $state(false);
  let showReturn = $state(false);
  let returnComment = $state('');
  let localError = $state('');

  const amount = $derived(eoExposure(request, approvals.dailyRate));
  const sender = $derived(withLimit(approvals.sender ?? { name: 'Saksbehandler', role: '' }));
  const route = $derived(resolveRoute({ amount, sender, chain: approvals.chain.map(withLimit) }));
  const amountLabel = $derived(amount === null ? 'Uavklart' : nok(amount));
  const active = $derived(pkg?.steps.find((s) => s.status === 'aktiv'));
  const canDecide = $derived(pkg?.status === 'til_godkjenning' && active?.id === approvals.actor);
  const lastStep = $derived(pkg?.steps.at(-1)?.id === approvals.actor);
  const money = (value: number | undefined) => (value == null ? '—' : nok(value));

  const calculation = $derived({
    summaryLabel: 'Se beregning · fullmaktsmatrise januar 2026',
    rows: [
      {
        label: 'Tillegg',
        value: request.konsekvenser.pris ? money(request.kompensasjon_belop) : 'Ingen',
      },
      {
        label: 'Fradrag',
        value: request.konsekvenser.pris ? money(request.fradrag_belop) : 'Ingen',
      },
      {
        label: `Frist · ${request.frist_dager ?? (request.konsekvenser.fremdrift ? 'uavklart' : 0)} dager`,
        value:
          request.frist_dager && approvals.dailyRate
            ? nok(request.frist_dager * approvals.dailyRate)
            : request.frist_dager
              ? 'Mangler dagmulktssats'
              : '0 kr',
      },
    ],
    note: 'Det største av tillegg og fradrag legges til grunn, pluss fristens verdi (dager × dagmulktssats). Uavklart pris eller frist behandles av hele fullmaktskjeden.',
  });

  const figures = $derived([
    { label: 'Fullmaktsgrunnlag', value: amountLabel, over: !pkg && route.requiresApproval },
    pkg && pkg.steps.length
      ? {
          label: `Avgjøres av · ${pkg.steps.at(-1)!.role}`,
          value: limitLabel(withLimit(pkg.steps.at(-1)!).limit),
        }
      : {
          label: `Din fullmakt${sender.role ? ` · ${sender.role}` : ''}`,
          value: limitLabel(sender.limit),
        },
  ]);

  const chain = $derived.by((): ApprovalChainNode[] | undefined => {
    if (!pkg) return route.requiresApproval ? route.route : undefined;
    if (!pkg.steps.length) return undefined;
    const owner = pkg.ownerName ?? demoUsers.find((u) => u.id === pkg.owner)?.name ?? pkg.owner;
    return [
      {
        id: pkg.owner,
        name: owner,
        role: pkg.owner === approvals.actor ? 'Saksbehandler · deg' : 'Saksbehandler',
        state: 'sender',
        metaLabel: formatDateNorwegian(pkg.createdAt),
        statusLabel: 'Sendt',
      },
      ...pkg.steps.map(
        (s): ApprovalChainNode => ({
          id: s.id,
          name: s.name,
          role: s.id === approvals.actor ? `${s.role} · deg` : s.role,
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

  async function run(action: () => Promise<unknown>) {
    localError = '';
    try {
      await action();
    } catch (cause) {
      localError = cause instanceof Error ? cause.message : 'Handlingen feilet.';
    }
  }
  function afterCommand(packages: EOApprovalPackage[], id: string) {
    confirmed = false;
    const current = packages.find((p) => p.id === id);
    if (current?.status === 'utstedt' && current.sakId) onissued?.(current.sakId);
  }
  const submit = () =>
    run(async () => {
      const packages = await approvals.command({
        action: 'submit',
        request: $state.snapshot(request),
        previousId: pkg && ['returnert', 'trukket'].includes(pkg.status) ? pkg.id : undefined,
      });
      afterCommand(packages, packages.at(-1)!.id);
    });
  const act = (action: 'approve' | 'withdraw' | 'retry') =>
    run(async () => afterCommand(await approvals.command({ action, packageId: pkg!.id }), pkg!.id));

  type PanelState = {
    eyebrow: string;
    title: string;
    description: string;
    footnote?: string;
    primary?: {
      label: string;
      action: () => void;
      disabled?: boolean;
      icon: 'send' | 'check' | 'issue';
    };
    secondary?: { label: string; action: () => void };
    tertiary?: { label: string; action: () => void; danger?: boolean };
    confirm?: string;
    figures?: boolean;
    edit?: boolean;
  };
  const issueFootnote =
    'Entreprenøren får endringsordren når den er utstedt. Nummer og innhold låses.';

  const panel = $derived.by((): PanelState => {
    if (approvals.unconfigured)
      return {
        eyebrow: 'Klar for utstedelse',
        title: 'Du utsteder endringsordren',
        description:
          'Endringsordren blir registrert som utstedt i prosjektet, med eget nummer og lenker til KOE-sakene som inngår.',
        confirm: 'Jeg har kontrollert innholdet og vil utstede endringsordren.',
        primary: {
          label: legacy.sending ? 'Utsteder …' : 'Utsted endringsordre',
          action: () => void legacy.issue(),
          disabled: legacy.sending,
          icon: 'issue',
        },
        edit: true,
        footnote: issueFootnote,
      };
    if (!approvals.loaded)
      return approvals.error
        ? {
            eyebrow: 'Fullmakt',
            title: 'Fullmakten kunne ikke hentes',
            description: 'Endringsordren kan ikke utstedes før fullmakten er kjent.',
            secondary: { label: 'Prøv igjen', action: () => void approvals.load() },
          }
        : { eyebrow: 'Fullmakt', title: 'Henter fullmakt …', description: '' };
    if (!pkg || (['returnert', 'trukket'].includes(pkg.status) && approvals.canPrepare)) {
      const returned = pkg?.status === 'returnert';
      if (!approvals.canPrepare)
        return {
          eyebrow: 'Ingen tilgang',
          title: 'Du kan ikke utstede endringsordrer',
          description: 'Bare saksbehandlere i prosjektets godkjenningspolicy kan utstede.',
        };
      const base = {
        confirm: 'Jeg har kontrollert innholdet i endringsordren.',
        figures: true,
        edit: true,
      };
      const eyebrow = returned ? `Returnert · send på nytt` : undefined;
      if (route.exceedsAllAuthority)
        return {
          ...base,
          eyebrow: eyebrow ?? 'Over all fullmakt',
          title: 'Ingen i kjeden kan godkjenne',
          description: `Fullmaktsgrunnlaget ${amountLabel} overstiger fullmakten til alle i godkjenningskjeden. Kjeden må utvides før ordren kan utstedes.`,
          primary: { label: 'Send til godkjenning', action: submit, disabled: true, icon: 'send' },
        };
      if (!route.requiresApproval)
        return {
          ...base,
          eyebrow: eyebrow ?? 'Klar for utstedelse',
          title: 'Du kan utstede selv',
          description: `Fullmaktsgrunnlaget ${amountLabel} er innenfor din fullmakt. Endringsordren utstedes med én gang.`,
          primary: { label: 'Utsted endringsordre', action: submit, icon: 'issue' },
          footnote: issueFootnote,
        };
      return {
        ...base,
        eyebrow: eyebrow ?? 'Krever godkjenning',
        title: `${route.decider!.role} må godkjenne`,
        description:
          amount === null
            ? 'Pris eller frist er uavklart, så fullmaktsgrunnlaget kan ikke beregnes. Endringsordren går gjennom hele fullmaktskjeden og utstedes når siste godkjenner har godkjent.'
            : `Fullmaktsgrunnlaget ${amountLabel} overstiger din fullmakt. Endringsordren går sekvensielt gjennom fullmaktskjeden og utstedes når siste godkjenner har godkjent.`,
        primary: { label: 'Send til godkjenning', action: submit, icon: 'send' },
        footnote:
          'Entreprenøren får endringsordren først etter siste godkjenning. Nummeret er reservert mens den behandles.',
      };
    }
    const sentAt = formatDateNorwegian(pkg.createdAt);
    switch (pkg.status) {
      case 'til_godkjenning':
        if (canDecide)
          return {
            eyebrow: `Til godkjenning · sendt ${sentAt}`,
            title: 'Din godkjenning',
            description: lastStep
              ? `Fullmaktsgrunnlag ${amountLabel}. Du avgjør: godkjenning utsteder endringsordren.`
              : `Fullmaktsgrunnlag ${amountLabel}. Etter din godkjenning går ordren videre i kjeden.`,
            confirm: 'Jeg har kontrollert endringsordren.',
            figures: true,
            primary: {
              label: lastStep ? 'Godkjenn og utsted' : 'Godkjenn',
              action: () => act('approve'),
              icon: 'check',
            },
            secondary: { label: 'Returner', action: () => (showReturn = !showReturn) },
            footnote: lastStep
              ? 'Entreprenøren får endringsordren når du godkjenner.'
              : 'Entreprenøren får endringsordren først etter siste godkjenning.',
          };
        return {
          eyebrow: `Til godkjenning · sendt ${sentAt}`,
          title: `${active?.name ?? 'Neste godkjenner'} behandler endringsordren`,
          description: `Fullmaktsgrunnlag ${amountLabel}. Endringsordren går sekvensielt gjennom kjeden.`,
          figures: true,
          tertiary:
            pkg.owner === approvals.actor && !pkg.steps.some((s) => s.status === 'godkjent')
              ? { label: 'Trekk fra godkjenning', action: () => act('withdraw'), danger: true }
              : undefined,
          footnote:
            'Entreprenøren får endringsordren først etter siste godkjenning. Innholdet er låst mens den behandles.',
        };
      case 'godkjent':
      case 'utstedelse_feilet':
        return {
          eyebrow: 'Godkjent',
          title: pkg.status === 'godkjent' ? 'Endringsordren utstedes' : 'Utstedelsen feilet',
          description:
            pkg.error ??
            'Endringsordren er godkjent og får sitt reserverte saksnummer. Oppdater status om litt.',
          primary: { label: 'Prøv utstedelse igjen', action: () => act('retry'), icon: 'issue' },
          footnote: issueFootnote,
        };
      case 'utstedt':
        return {
          eyebrow: `Utstedt ${formatDateNorwegian(pkg.issuedAt)}`,
          title: 'Endringsordren er utstedt',
          description: `${pkg.request.eo_nummer} er registrert i prosjektet.`,
          footnote: 'Nummer og innhold er låst.',
        };
      default:
        return {
          eyebrow: pkg.status === 'returnert' ? 'Returnert' : 'Trukket',
          title: 'Saksbehandler reviderer',
          description: 'Endringsordren er sendt tilbake til saksbehandleren.',
        };
    }
  });
</script>

<ApprovalPanel
  eyebrow={panel.eyebrow}
  title={panel.title}
  description={panel.description || undefined}
  figures={panel.figures ? figures : []}
  calculation={panel.figures ? calculation : undefined}
  chain={panel.figures || pkg ? chain : undefined}
  content={{
    label: 'Innhold:',
    value: `${request.eo_nummer} · ${request.koe_sak_ids.length ? `${request.koe_sak_ids.length} KOE-krav` : 'pålegg'}`,
    actionLabel: panel.edit && onedit ? 'Endre' : undefined,
    onaction: onedit,
  }}
  confirmLabel={panel.confirm}
  bind:confirmed
  primaryLabel={panel.primary?.label}
  primaryDisabled={panel.primary
    ? panel.primary.disabled || approvals.busy || (panel.confirm ? !confirmed : false)
    : undefined}
  onprimary={panel.primary?.action}
  secondaryLabel={panel.secondary?.label}
  onsecondary={panel.secondary?.action}
  secondaryDisabled={approvals.busy}
  tertiaryLabel={panel.tertiary?.label}
  ontertiary={panel.tertiary?.action}
  tertiaryDanger={panel.tertiary?.danger}
  footnote={panel.footnote}
>
  {#snippet primaryIcon()}
    {#if panel.primary?.icon === 'check'}<Check
        size={15}
      />{:else if panel.primary?.icon === 'send'}<Send size={15} />{:else}<FileCheck2
        size={15}
      />{/if}
  {/snippet}
  {#if pkg?.comment && ['returnert', 'trukket'].includes(pkg.status)}
    <p class="note"><strong>Returnert med kommentar:</strong> {pkg.comment}</p>
  {/if}
  {#if showReturn && canDecide}
    <div class="return-box">
      <label for="eo-return-comment">Hva må saksbehandler endre?</label>
      <textarea id="eo-return-comment" bind:value={returnComment} rows="3"></textarea>
      <button
        type="button"
        class="return-button"
        disabled={!returnComment.trim() || approvals.busy}
        onclick={() =>
          run(async () => {
            await approvals.command({
              action: 'return',
              packageId: pkg!.id,
              comment: returnComment,
            });
            showReturn = false;
            returnComment = '';
          })}>Returner til saksbehandler</button
      >
    </div>
  {/if}
  {#if pkg?.status === 'utstedt' && pkg.sakId}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- issuedHref returns a resolved path -->
    <a class="note link" href={issuedHref(pkg.sakId)}>Åpne utstedt endringsordre</a>
  {:else if legacy.createdId}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- issuedHref returns a resolved path -->
    <a class="note link" href={issuedHref(legacy.createdId)}>Åpne utstedt endringsordre</a>
  {/if}
  {#if localError || approvals.error}<p class="note error" role="alert">
      {localError || approvals.error}
    </p>{/if}
</ApprovalPanel>

<style>
  .note {
    display: block;
    margin: 14px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ink-3);
  }
  .link {
    color: var(--brand);
    font-weight: 600;
  }
  .error {
    color: var(--danger);
  }
  .return-box {
    margin-top: 16px;
  }
  .return-box label {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  textarea {
    width: 100%;
    padding: 10px;
    border: var(--rule-strong);
    border-radius: 6px;
    color: var(--ink);
    background: var(--surface);
    font: inherit;
    font-size: 13px;
    resize: vertical;
  }
  .return-button {
    margin-top: 8px;
    padding: 8px 12px;
    border: var(--rule-strong);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .return-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
