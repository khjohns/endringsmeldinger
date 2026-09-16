import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import WorkspaceHarness from './WorkspaceHarness.svelte';
import { createCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { apiFetch } from '$lib/api/client';
import { hentVedlegg, lastOppVedlegg } from '$lib/api/vedlegg';
import { setDraftOwner } from '$lib/utils/draftOwner';
import type { CaseContextResponse } from '$lib/types/api';

vi.mock('$lib/api/client', async (original) => ({
  ...(await original<typeof import('$lib/api/client')>()),
  apiFetch: vi.fn(),
}));
vi.mock('$lib/api/vedlegg', async (original) => ({
  ...(await original<typeof import('$lib/api/vedlegg')>()),
  hentVedlegg: vi.fn(),
  lastOppVedlegg: vi.fn(),
}));

const attachment = {
  id: '11111111-1111-4111-8111-111111111111',
  navn: 'rapport.pdf',
  storrelse: 8,
  lastet_opp_av: 'Test',
  lastet_opp_rolle: 'TE' as const,
  tidspunkt: '',
  status: 'staged' as const,
};
const saved = {
  begrunnelseHtml: '<p>Oppdatert begrunnelse med tilstrekkelig tekst.</p>',
  begrunnelse: '<p>Oppdatert begrunnelse med tilstrekkelig tekst.</p>',
  resultat: 'godkjent',
  varsletITide: true,
  varselType: 'spesifisert',
  antallDager: 30,
  mode: 'varsel',
  varsler: { vederlag: { valgt: true, forklaring: '' } },
  fristVarselOk: true,
  spesifisertKravOk: true,
  foresporselSvarOk: true,
  vilkarOppfylt: true,
  sendForesporsel: false,
  godkjentDager: 30,
  hovedkravVarsletITide: true,
  riggVarsletITide: true,
  produktivitetVarsletITide: true,
  akseptererMetode: true,
  hovedkravVurdering: 'godkjent',
  riggVurdering: 'godkjent',
  produktivitetVurdering: 'godkjent',
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setDraftOwner('user');
  vi.mocked(hentVedlegg).mockResolvedValue({ vedlegg: [attachment], minRolle: 'TE' });
  vi.mocked(lastOppVedlegg).mockResolvedValue(attachment);
  vi.mocked(apiFetch).mockImplementation(async (url, options) => {
    if (url.includes('/utkast'))
      return {
        utkast: { innhold: saved, versjon: 1, oppdatert_av: 'Test' },
        team_id: 'team',
        user_id: 'user',
      } as never;
    if (options?.method === 'POST') throw new Error('Stopp etter kontrollert innsending');
    return {
      state: { version: 0, items: [], packages: [] },
      actor: 'handler@test',
      chain: [],
      canPrepare: true,
    } as never;
  });
});
afterEach(cleanup);

describe.each(['TE', 'BH'] as const)('%s attachment submission', (role) => {
  it.each(
    (['ansvar', 'vederlag', 'frist'] as const).flatMap((track) =>
      [true, false].map((include) => ({ track, include }))
    )
  )('submits $track, attachments=$include', async ({ track, include }) => {
    const upload = include && role === 'TE' && track === 'ansvar';
    if (upload) {
      vi.mocked(hentVedlegg).mockResolvedValue({ vedlegg: [], minRolle: 'TE' });
      vi.mocked(lastOppVedlegg).mockImplementation(async () => {
        vi.mocked(hentVedlegg).mockResolvedValue({ vedlegg: [attachment], minRolle: 'TE' });
        return attachment;
      });
    }
    const demo = createDemoStore();
    const response: CaseContextResponse = {
      state: JSON.parse(JSON.stringify(demo.sak)),
      timeline: JSON.parse(JSON.stringify(demo.timeline)),
      version: 4,
      historikk: { grunnlag: [], vederlag: [], frist: [] },
    };
    const sendEvent = vi.fn().mockRejectedValue(new Error('Stopp etter kontrollert innsending'));
    const workspace = createCaseWorkspace(response, { projectId: 'p', sendEvent });
    const screen = render(WorkspaceHarness, { workspace, view: { track, role, mode: 'form' } });
    if (upload) {
      const input = await screen.findByLabelText('Last opp nytt vedlegg');
      await fireEvent.change(input, { target: { files: [new File(['%PDF-abc'], 'rapport.pdf')] } });
    }
    const checkbox = await screen.findByRole('checkbox', { name: 'Legg ved rapport.pdf' });
    if (upload) expect(checkbox).toBeChecked();
    else {
      expect(checkbox).not.toBeChecked();
      if (include) await fireEvent.click(checkbox);
    }
    const button = screen.getByRole('button', {
      name: role === 'BH' ? 'Ferdigstill vurdering' : /Se brev og send/,
    });
    await waitFor(() => expect(button).toBeEnabled());
    await fireEvent.click(button);
    if (role === 'TE') {
      const confirm = await screen.findByRole('button', { name: 'Send til byggherren' });
      if (include) expect(screen.getByRole('dialog')).toHaveTextContent('rapport.pdf');
      else expect(screen.getByRole('dialog')).not.toHaveTextContent('rapport.pdf');
      await fireEvent.click(confirm);
      await waitFor(() => expect(sendEvent).toHaveBeenCalledOnce());
      expect(sendEvent.mock.calls[0][2].vedlegg_ids).toEqual(include ? [attachment.id] : []);
    } else {
      await waitFor(() =>
        expect(
          vi.mocked(apiFetch).mock.calls.some(([, options]) => options?.method === 'POST')
        ).toBe(true)
      );
      const [, options] = vi
        .mocked(apiFetch)
        .mock.calls.find(
          ([url, options]) => url.includes('/approvals') && options?.method === 'POST'
        )!;
      const request = JSON.parse(String(options!.body));
      expect(request.item.data.vedlegg_ids).toEqual(include ? [attachment.id] : []);
      expect(request.item.form.vedleggIds).toEqual(include ? [attachment.id] : []);
    }
  });
});
