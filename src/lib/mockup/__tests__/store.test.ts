import { describe, it, expect } from 'vitest';
import { createDemoStore } from '$lib/mockup/store.svelte';
import type { LetterDocument, ReviewItem } from '$lib/approval/types';

function item(track: ReviewItem['track'], data: Record<string, unknown>): ReviewItem {
  return {
    id: `item-${track}`,
    track,
    eventType: track === 'vederlag' ? 'respons_vederlag' : 'respons_frist',
    data,
    claimId: 'krav',
    claimVersion: 1,
    status: 'til_godkjenning',
    createdAt: '2026-10-01T00:00:00Z',
    owner: 'bh@test',
  };
}

function letter(items: ReviewItem[]): LetterDocument {
  return {
    title: 'Svar',
    caseId: 'DEMO-SAK',
    caseTitle: 'Demo',
    sender: 'BH',
    recipient: 'TE',
    date: '2026-10-01',
    introduction: '',
    closing: '',
    items,
  };
}

describe('applyApprovedItems', () => {
  it('bruker resultatet i hendelsesdataene, ikke en egen beregning', () => {
    const store = createDemoStore();
    const krevdBelop = store.sak.vederlag.krevd_belop ?? 0;
    const krevdDager = store.sak.frist.krevd_dager ?? 0;
    const items = [
      item('vederlag', {
        beregnings_resultat: 'avslatt',
        total_godkjent_belop: krevdBelop,
        subsidiaer_resultat: 'godkjent',
        subsidiaer_godkjent_belop: krevdBelop,
      }),
      item('frist', {
        beregnings_resultat: 'delvis_godkjent',
        godkjent_dager: krevdDager,
        subsidiaer_resultat: 'avslatt',
      }),
    ];

    store.applyApprovedItems(items, 'pakke', letter(items));

    expect(store.sak.vederlag.bh_resultat).toBe('avslatt');
    expect(store.sak.vederlag.subsidiaer_resultat).toBe('godkjent');
    expect(store.sak.vederlag.har_subsidiaert_standpunkt).toBe(true);
    expect(store.sak.frist.bh_resultat).toBe('delvis_godkjent');
    expect(store.sak.frist.subsidiaer_resultat).toBe('avslatt');
    expect(store.sak.frist.har_subsidiaert_standpunkt).toBe(true);
  });

  it('godtar tilbakeholdelse etter § 30.2', () => {
    const store = createDemoStore();
    const items = [
      item('vederlag', { beregnings_resultat: 'hold_tilbake', total_godkjent_belop: 0 }),
    ];

    store.applyApprovedItems(items, 'pakke', letter(items));

    expect(store.sak.vederlag.bh_resultat).toBe('hold_tilbake');
    expect(store.sak.vederlag.har_subsidiaert_standpunkt).toBe(false);
  });
});
