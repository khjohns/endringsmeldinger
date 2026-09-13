import { describe, expect, it } from 'vitest';
import { filterCases, overviewStats, isTimeClaim, formalizedClaims } from '../overview';
import { mockSaksoversikt } from '$lib/mocks/saksoversikt';

const make = (status: string, claimed: number | null, approved: number | null) => ({
  ...mockSaksoversikt[0],
  cached_status: status,
  cached_sum_krevd: claimed,
  cached_sum_godkjent: approved,
});

describe('project overview', () => {
  it('excludes drafts and withdrawn claims from submitted amounts', () => {
    const stats = overviewStats([
      make('UTKAST', 500, null),
      make('LUKKET_TRUKKET', 400, 200),
      make('SENDT', 300, null),
      make('OMFORENT', 100, 100),
    ]);
    expect(stats.claimed).toBe(400);
    expect(stats.approved).toBe(100);
    expect(stats.assessed).toBe(1);
    expect(stats.active).toBe(1);
    expect(stats.drafts).toBe(1);
  });
  it('distinguishes missing assessment from an explicit zero', () => {
    expect(overviewStats([make('SENDT', 500, null)]).approved).toBeNull();
    expect(overviewStats([make('SENDT', 500, 0)]).approved).toBe(0);
    expect(overviewStats([]).claimed).toBeNull();
  });
  it('combines case-insensitive search and status filter, including negotiations', () => {
    const cases = [
      make('UNDER_FORHANDLING', 500, 0),
      make('OMFORENT', 500, 500),
      make('UTKAST', null, null),
    ];
    expect(filterCases(cases, '  GRUNNFORHOLD  ', 'active')).toEqual([cases[0]]);
    expect(filterCases(cases, 'KOE-2024', 'closed')).toEqual([cases[1]]);
    expect(filterCases(cases, 'no match', 'all')).toEqual([]);
  });
});

it('counts specified time claims without adding days or treating zero as missing', () => {
  const cases = [
    { ...make('SENDT', null, null), cached_dager_krevd: 45, cached_dager_godkjent: null },
    { ...make('UNDER_BEHANDLING', null, null), cached_dager_krevd: 30, cached_dager_godkjent: 0 },
    { ...make('SENDT', null, null), cached_dager_krevd: null, cached_dager_godkjent: null },
    { ...make('UTKAST', null, null), cached_dager_krevd: 10, cached_dager_godkjent: null },
    { ...make('LUKKET_TRUKKET', null, null), cached_dager_krevd: 20, cached_dager_godkjent: null },
  ];
  expect(cases.filter(isTimeClaim)).toHaveLength(2);
  expect(overviewStats(cases).timeClaims).toBe(2);
  expect(overviewStats(cases).unassessedTimeClaims).toBe(1);
});

it('keeps EO formalization out of the original KOE financial and time totals', () => {
  const claim = { ...make('OMFORENT', 500, 400), cached_dager_krevd: 10 };
  const order = {
    ...make('utstedt', 400, 400),
    sak_id: 'EO-1',
    sakstype: 'endringsordre' as const,
    cached_dager_krevd: 10,
    endringsordre_data: {
      status: 'utstedt' as const,
      eo_nummer: 'EO-001',
      relaterte_koe_saker: [claim.sak_id],
      netto_belop: 400,
      frist_dager: 10,
      er_estimat: false,
    },
  };
  expect(overviewStats([claim, order])).toMatchObject({
    total: 2,
    claims: 1,
    orders: 1,
    claimed: 500,
    approved: 400,
    assessed: 1,
    timeClaims: 1,
  });
  expect(formalizedClaims([claim, order])).toEqual(new Set([claim.sak_id]));
  expect(
    formalizedClaims([
      { ...order, endringsordre_data: { ...order.endringsordre_data, status: 'utkast' } },
    ])
  ).toEqual(new Set());
});

it('combines EO type and status filters and searches the actual EO number', () => {
  const cases = [
    make('SENDT', 100, null),
    { ...make('utstedt', null, null), sakstype: 'endringsordre' as const },
    { ...make('akseptert', null, null), sakstype: 'endringsordre' as const },
    { ...make('utkast', null, null), sakstype: 'endringsordre' as const },
  ];
  expect(filterCases(cases, '', 'active', 'endringsordre')).toEqual([cases[1]]);
  expect(filterCases(cases, '', 'closed', 'endringsordre')).toEqual([cases[2]]);
  expect(filterCases(cases, '', 'draft', 'endringsordre')).toEqual([cases[3]]);
  expect(filterCases(cases, '', 'all', 'standard')).toEqual([cases[0]]);
  const numbered = {
    ...cases[1],
    endringsordre_data: {
      status: 'utstedt' as const,
      eo_nummer: 'EO-042',
      relaterte_koe_saker: [],
      netto_belop: null,
      frist_dager: null,
      er_estimat: false,
    },
  };
  expect(filterCases([numbered], 'eo-042', 'all', 'endringsordre')).toEqual([numbered]);
});
