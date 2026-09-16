import {
  fetchEOApprovals,
  sendEOApprovalCommand,
  type CreateEORequest,
  type EOApprovalCommand,
  type EOApprovalPackage,
  type EOApprovalResponse,
} from '$lib/api/endringsordre';
import { SvelteDate } from 'svelte/reactivity';
import { ApiError } from '$lib/api/client';
import { eoExposure } from '$lib/domain/endringsordre';
import { resolveRoute, withLimit } from './route';
import { demoUsers, type ApprovalUser } from './types';

type Command = EOApprovalCommand & { expectedVersion: number; commandId: string };

/** Where change-order approvals live: the project API, or the browser in the demo. */
export interface EOApprovalSource {
  load(): Promise<EOApprovalResponse>;
  command(command: Command): Promise<EOApprovalResponse>;
  /** Demo only: act as another person in the chain */
  setActor?(id: string): void;
}

export function apiEOApprovals(projectId: string): EOApprovalSource {
  return {
    load: () => fetchEOApprovals(projectId),
    command: (command) => sendEOApprovalCommand(projectId, command),
  };
}

const DEMO_KEY = 'endringsmeldinger.demo.eo-godkjenning.v1';
export const DEMO_DAILY_RATE = 50000;

/** Demo adapter only; the live API independently enforces transitions and identities. */
export function demoEOApprovals(
  issue: (payload: CreateEORequest) => { sak_id: string }
): EOApprovalSource {
  type Stored = { version: number; packages: EOApprovalPackage[]; actor: string };
  const [sender, ...chain] = demoUsers;
  const read = (): Stored => {
    try {
      const value = JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null');
      if (value && Array.isArray(value.packages)) return value;
    } catch {
      /* fall through to an empty demo */
    }
    return { version: 0, packages: [], actor: sender.id };
  };
  const write = (value: Stored) => localStorage.setItem(DEMO_KEY, JSON.stringify(value));
  const respond = (value: Stored): EOApprovalResponse => ({
    state: {
      version: value.version,
      packages: value.packages.filter(
        (p) => p.owner === value.actor || p.steps.some((s) => s.id === value.actor)
      ),
    },
    actor: value.actor,
    sender: value.actor === sender.id ? sender : null,
    chain,
    canPrepare: value.actor === sender.id,
    dailyRate: DEMO_DAILY_RATE,
  });
  const issueNow = (p: EOApprovalPackage) => {
    try {
      p.sakId = issue(p.request).sak_id;
      p.status = 'utstedt';
      p.issuedAt = new SvelteDate().toISOString();
      p.error = null;
    } catch (cause) {
      p.status = 'utstedelse_feilet';
      p.error = cause instanceof Error ? cause.message : 'Utstedelsen feilet.';
    }
  };
  return {
    load: async () => respond(read()),
    setActor(id) {
      write({ ...read(), actor: id });
    },
    async command(command) {
      const value = read();
      const actor = value.actor;
      const now = new SvelteDate().toISOString();
      if (command.expectedVersion !== value.version)
        throw new Error('Behandlingen er endret. Oppdater status og prøv igjen.');
      if (command.action === 'submit') {
        if (actor !== sender.id) throw new Error('Bare saksbehandler kan utstede endringsordrer.');
        const number = command.request.eo_nummer.trim();
        if (
          value.packages.some(
            (p) =>
              p.request.eo_nummer.trim() === number &&
              ['til_godkjenning', 'godkjent', 'utstedelse_feilet'].includes(p.status)
          )
        )
          throw new Error(`${number} er allerede til godkjenning.`);
        const route = resolveRoute({
          amount: eoExposure(command.request, DEMO_DAILY_RATE),
          sender: withLimit(sender),
          chain: chain.map(withLimit),
        });
        if (route.exceedsAllAuthority)
          throw new Error('Godkjenningskjeden har ikke tilstrekkelig fullmakt.');
        const p: EOApprovalPackage = {
          id: crypto.randomUUID(),
          status: route.requiresApproval ? 'til_godkjenning' : 'godkjent',
          owner: actor,
          ownerName: sender.name,
          createdAt: now,
          previousId: command.previousId,
          request: structuredClone(command.request),
          steps: route.approvers.map((a, i) => ({
            ...chain.find((u) => u.id === a.id)!,
            status: i === 0 ? 'aktiv' : 'venter',
          })),
        };
        value.packages.push(p);
        if (!route.requiresApproval) issueNow(p);
      } else {
        const p = value.packages.find((x) => x.id === command.packageId);
        if (!p) throw new Error('Fant ikke endringsordren.');
        const active = p.steps.find((s) => s.status === 'aktiv');
        if (command.action === 'retry') {
          if (!['godkjent', 'utstedelse_feilet'].includes(p.status))
            throw new Error('Endringsordren er ikke godkjent.');
          issueNow(p);
        } else if (p.status !== 'til_godkjenning') {
          throw new Error('Endringsordren er ikke til godkjenning.');
        } else if (command.action === 'withdraw') {
          if (p.owner !== actor || p.steps.some((s) => s.status === 'godkjent'))
            throw new Error('Endringsordren kan bare trekkes før første godkjenning.');
          p.status = 'trukket';
        } else {
          if (active?.id !== actor) throw new Error('Bare aktiv godkjenner kan beslutte.');
          if (command.action === 'return') {
            if (!command.comment.trim()) throw new Error('Skriv en begrunnelse for retur.');
            Object.assign(p, {
              status: 'returnert',
              comment: command.comment.trim(),
              returnedBy: actor,
            });
          } else {
            active.status = 'godkjent';
            active.decidedAt = now;
            const following = p.steps.find((s) => s.status === 'venter');
            if (following) following.status = 'aktiv';
            else issueNow(p);
          }
        }
      }
      value.version++;
      write(value);
      return respond(value);
    },
  };
}

/** Reactive approval state for change orders, shared by the issue form and the approval page. */
export function createEOApprovalWorkspace(source: EOApprovalSource) {
  let response = $state<EOApprovalResponse | null>(null);
  let error = $state('');
  let busy = $state(false);
  /** The project has no approval policy: orders are issued directly, as before. */
  let unconfigured = $state(false);

  async function load() {
    try {
      response = await source.load();
      unconfigured = false;
      error = '';
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.status === 403 &&
        /ikke konfigurert/.test(cause.message)
      )
        unconfigured = true;
      else error = cause instanceof Error ? cause.message : 'Kunne ikke hente godkjenninger.';
    }
  }

  async function command(command: EOApprovalCommand) {
    busy = true;
    error = '';
    try {
      response = await source.command({
        ...command,
        expectedVersion: response?.state.version ?? 0,
        commandId: crypto.randomUUID(),
      });
      return response.state.packages;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) await load();
      error = cause instanceof Error ? cause.message : 'Handlingen kunne ikke fullføres.';
      throw cause;
    } finally {
      busy = false;
    }
  }

  return {
    get loaded() {
      return response !== null || unconfigured;
    },
    get unconfigured() {
      return unconfigured;
    },
    get error() {
      return error;
    },
    get busy() {
      return busy;
    },
    get actor() {
      return response?.actor ?? '';
    },
    get sender(): ApprovalUser | null {
      return response?.sender ?? null;
    },
    get chain() {
      return response?.chain ?? [];
    },
    get canPrepare() {
      return response?.canPrepare ?? false;
    },
    get dailyRate() {
      return response?.dailyRate ?? null;
    },
    get packages() {
      return response?.state.packages ?? [];
    },
    get isDemo() {
      return Boolean(source.setActor);
    },
    load,
    command,
    async setActor(id: string) {
      source.setActor?.(id);
      await load();
    },
  };
}

export type EOApprovalWorkspace = ReturnType<typeof createEOApprovalWorkspace>;
