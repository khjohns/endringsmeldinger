import { describe, expect, it } from 'vitest';
import { filterCases, overviewStats, isTimeClaim } from '../overview';
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
