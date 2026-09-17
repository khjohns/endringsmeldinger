// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { CreateEORequest } from '$lib/api/endringsordre';
import { ApiError } from '$lib/api/client';
import { eoExposure } from '$lib/domain/endringsordre';
import { createEOApprovalWorkspace, demoEOApprovals, DEMO_DAILY_RATE } from './eoApproval.svelte';
import { demoUsers } from './types';

const request = (overrides: Partial<CreateEORequest> = {}): CreateEORequest => ({
  eo_nummer: 'EO-001',
  beskrivelse: 'Fundament',
  koe_sak_ids: [],
  konsekvenser: { pris: true, fremdrift: false, sha: false, kvalitet: false, annet: false },
  oppgjorsform: 'REGNINGSARBEID',
  kompensasjon_belop: 450000,
  fradrag_belop: 0,
  er_estimat: false,
  ...overrides,
});

describe('fullmaktsgrunnlag for endringsordre', () => {
  it('uses the larger side, adds valued days and leaves unresolved values uncomputed', () => {
    expect(eoExposure(request({ kompensasjon_belop: 100, fradrag_belop: 300 }), null)).toBe(300);
    const days = request({
      konsekvenser: { ...request().konsekvenser, fremdrift: true },
      frist_dager: 2,
    });
    expect(eoExposure(days, 10)).toBe(450020);
    expect(eoExposure(days, null)).toBeNull();
    expect(
      eoExposure(request({ kompensasjon_belop: undefined, fradrag_belop: undefined }), 1)
    ).toBeNull();
  });
});

describe('demo: godkjenning av endringsordre', () => {
  beforeEach(() => localStorage.clear());

  it('issues inside authority at once and after the decider otherwise', async () => {
    const issue = vi.fn(() => ({ sak_id: 'demo-eo' }));
    const source = demoEOApprovals(issue);
    const approvals = createEOApprovalWorkspace(source);
    await approvals.load();
    expect(approvals.dailyRate).toBe(DEMO_DAILY_RATE);

    let packages = await approvals.command({
      action: 'submit',
      request: request({ kompensasjon_belop: 150000 }),
    });
    expect(packages.at(-1)).toMatchObject({ status: 'utstedt', steps: [], sakId: 'demo-eo' });

    packages = await approvals.command({
      action: 'submit',
      request: request({ eo_nummer: 'EO-002', kompensasjon_belop: 2930000 }),
    });
    const pending = packages.at(-1)!;
    expect(pending.steps.map((s) => s.id)).toEqual([demoUsers[1].id, demoUsers[2].id]);
    await expect(approvals.command({ action: 'approve', packageId: pending.id })).rejects.toThrow();

    await approvals.setActor(demoUsers[1].id);
    await approvals.command({ action: 'approve', packageId: pending.id });
    await approvals.setActor(demoUsers[2].id);
    packages = await approvals.command({ action: 'approve', packageId: pending.id });
    flushSync();
    expect(packages.find((p) => p.id === pending.id)?.status).toBe('utstedt');
    expect(issue).toHaveBeenCalledTimes(2);
  });

  it('refuses amounts above every limit', async () => {
    const approvals = createEOApprovalWorkspace(demoEOApprovals(() => ({ sak_id: 'x' })));
    await approvals.load();
    await expect(
      approvals.command({ action: 'submit', request: request({ kompensasjon_belop: 3000001 }) })
    ).rejects.toThrow('fullmakt');
  });

  it('treats a project without policy as direct issuance', async () => {
    const approvals = createEOApprovalWorkspace({
      load: () => Promise.reject(new ApiError(403, 'Intern godkjenning er ikke konfigurert.')),
      command: vi.fn(),
    });
    await approvals.load();
    expect(approvals.unconfigured).toBe(true);
    expect(approvals.error).toBe('');
  });
});
