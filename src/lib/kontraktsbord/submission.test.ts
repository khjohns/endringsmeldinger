import { describe, it, expect } from 'vitest';
import { submissionRefs } from './submission.svelte';
import type { TimelineEvent } from '$lib/types/timeline';

function event(id: string, type: string, time: string): TimelineEvent {
  return { id, type: `no.oslo.koe.${type}`, time, data: {} } as TimelineEvent;
}

describe('submission references', () => {
  it('does not let a supplementary neutral notice replace a specified claim or its response', () => {
    const claim = event('claim', 'vederlag_krav_sendt', '2026-09-03T12:00:00Z');
    const response = event('response', 'respons_vederlag', '2026-09-04T12:00:00Z');
    const notice = event('notice', 'vederlag_krav_sendt', '2026-09-05T12:00:00Z');
    notice.data = { varsel_type: 'varsel', varsler: { rigg_drift: 'Rigg vil påløpe' } };
    expect(submissionRefs([claim, response, notice], 'vederlag')).toMatchObject({
      claimId: 'claim',
      responseId: 'response',
    });
  });
  it('restores unchanged fields from earlier partial response revisions', () => {
    const claim = event('claim', 'respons_grunnlag', '2026-09-03T12:00:00Z');
    claim.data = { resultat: 'avslatt', begrunnelse: 'Tidligere begrunnelse' };
    const revision = event('revision', 'respons_grunnlag_oppdatert', '2026-09-04T12:00:00Z');
    revision.data = { original_respons_id: 'claim', resultat: 'godkjent' };
    expect(submissionRefs([revision, claim], 'grunnlag').response?.data).toMatchObject({
      resultat: 'godkjent',
      begrunnelse: 'Tidligere begrunnelse',
    });
  });
  it('finds the latest claim and its response regardless of timeline order', () => {
    const timeline = [
      event('response', 'respons_vederlag', '2026-09-05T12:00:00Z'),
      event('first', 'vederlag_krav_sendt', '2026-09-03T12:00:00Z'),
      event('revision', 'vederlag_krav_oppdatert', '2026-09-04T12:00:00Z'),
    ];
    expect(submissionRefs(timeline, 'vederlag')).toMatchObject({
      claimId: 'revision',
      responseId: 'response',
    });
    expect(timeline[0].id).toBe('response');
  });

  it('does not update a response to an earlier claim revision', () => {
    const timeline = [
      event('first', 'frist_krav_sendt', '2026-09-03T12:00:00Z'),
      event('old-response', 'respons_frist', '2026-09-04T12:00:00Z'),
      event('specified', 'frist_krav_spesifisert', '2026-09-05T12:00:00Z'),
    ];
    expect(submissionRefs(timeline, 'frist')).toMatchObject({
      claimId: 'specified',
      responseId: undefined,
    });
  });
});
