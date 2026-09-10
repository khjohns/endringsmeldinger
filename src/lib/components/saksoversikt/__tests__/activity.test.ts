import { expect, it } from 'vitest';
import { projectActivity, activityHref, activityDate } from '../activity';
import { mockSaksoversikt } from '$lib/mocks/saksoversikt';

it('orders across cases by timestamp and puts undated events last', () => {
  const cases = [
    {
      ...mockSaksoversikt[0],
      sak_id: 'A',
      hendelser: [{ type: 'K' as const, dato: '2026-09-09T12:00:00Z', label: 'Først' }],
    },
    {
      ...mockSaksoversikt[0],
      sak_id: 'B',
      hendelser: [
        { type: 'F' as const, dato: '2026-09-10T08:00:00Z', label: 'Sist' },
        { type: 'V' as const, dato: '', label: 'Ukjent dato' },
      ],
    },
  ];
  expect(projectActivity(cases).map((e) => e.label)).toEqual(['Sist', 'Først', 'Ukjent dato']);
  expect(projectActivity(cases, 'sist', 'F')).toHaveLength(1);
  expect(projectActivity(cases, 'sist', 'V')).toHaveLength(0);
  expect(activityDate(null)).toBe('Dato ikke oppgitt');
});

it('opens the current track in read mode using the viewer role, including demo routing', () => {
  const event = { caseId: 'CASE/1', type: 'F' };
  expect(activityHref(event, 'P 1', 'TE')).toBe('/P%201/CASE%2F1?spor=frist&rolle=TE');
  expect(activityHref(event, 'P001', 'BH', 'scenario1')).toBe(
    '/mockup?spor=frist&rolle=BH&scenario=scenario1'
  );
});
