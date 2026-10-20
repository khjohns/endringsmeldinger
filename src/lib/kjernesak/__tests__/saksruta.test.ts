// @vitest-environment jsdom
/**
 * Valget av kilde i saksruta (#665, #712). `sakskilde` og konteksten er prøvd hver for
 * seg; her prøves at ruta holder Python-spørringen av mens TS-serveren ikke har svart,
 * og bare spør Python når konteksten sier at saken ikke er en TS-sak. Forventningen
 * står i `sakskilde` (#665): Python kalles ikke for en TS-sak.
 */
import { cleanup, render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { falskKjernesak } from './saksrutefake.svelte';

const t = vi.hoisted(() => ({
  bryterPaa: true,
  kontekst: null as ReturnType<typeof falskKjernesak> | null,
  sakIdTilPython: null as (() => string) | null,
  pythonSak: undefined as { state: { sakstype: string; sakstittel: string } } | undefined,
}));

vi.mock('$app/state', () => ({
  page: { params: { prosjektId: 'p-1', sakId: 'sak-1' }, url: new URL('http://lokal/p-1/sak-1') },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: () => '/' }));
vi.mock('$lib/queries/caseContext', () => ({
  createCaseContextQuery: (sakId: () => string) => {
    t.sakIdTilPython = sakId;
    return { data: t.pythonSak, isError: false, error: null, refetch: vi.fn() };
  },
}));
vi.mock('$lib/kjernesak/kontekst.svelte', () => ({ lagKjernesak: () => t.kontekst }));
vi.mock('$lib/kjernesak/bryter', async (original) => ({
  ...(await original<typeof import('$lib/kjernesak/bryter')>()),
  tsStienForNyeKoeSaker: () => t.bryterPaa,
}));
vi.mock('$lib/components/kjernesak/Kjernesakrom.svelte', () => import('./Tom.svelte'));
vi.mock('$lib/kontraktsbord/CaseWorkspace.svelte', () => import('./Tom.svelte'));

const Saksruta = (await import('../../../routes/[prosjektId]/[sakId]/+page.svelte')).default;

beforeEach(() => {
  t.bryterPaa = true;
  t.kontekst = falskKjernesak();
  t.sakIdTilPython = null;
  t.pythonSak = undefined;
});
afterEach(cleanup);

/** Saks-ID-en ruta gir Python-spørringen nå. Tom streng holder spørringen av. */
const tilPython = () => t.sakIdTilPython!();

describe('kilden i saksruta', () => {
  it('holder Python-spørringen av mens TS-serveren ikke har svart', () => {
    render(Saksruta);
    expect(tilPython()).toBe('');
  });

  it('holder Python-spørringen av for en TS-sak', () => {
    render(Saksruta);
    t.kontekst!.finnes = true;
    flushSync();
    expect(tilPython()).toBe('');
  });

  it('holder Python-spørringen av når TS-serveren svarer med en feil', () => {
    const screen = render(Saksruta);
    t.kontekst!.feil = 'Saken kunne ikke hentes.';
    flushSync();
    expect(tilPython()).toBe('');
    expect(screen.getByRole('alert')).toHaveTextContent('Saken kunne ikke hentes.');
  });

  it('spør Python når konteksten sier at saken ikke er en TS-sak', () => {
    render(Saksruta);
    t.kontekst!.finnes = false;
    flushSync();
    expect(tilPython()).toBe('sak-1');
  });

  it('spør bare Python med bryteren av', () => {
    t.bryterPaa = false;
    render(Saksruta);
    expect(tilPython()).toBe('sak-1');
  });
});

describe('sakstypene som ikke hører til første versjon (OV-U1)', () => {
  it.each(['endringsordre', 'forsering'])(
    'en sak med sakstype %s fra Python viser at sakstypen ikke støttes',
    (sakstype) => {
      t.bryterPaa = false;
      t.pythonSak = { state: { sakstype, sakstittel: 'Sak' } };
      const screen = render(Saksruta);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Endringsordre og forsering støttes ikke i denne versjonen'
      );
      expect(screen.getByRole('link', { name: 'Til saksoversikten' })).toBeInTheDocument();
    }
  );

  it('en standardsak fra Python viser ingen melding', () => {
    t.bryterPaa = false;
    t.pythonSak = { state: { sakstype: 'standard', sakstittel: 'Sak' } };
    const screen = render(Saksruta);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
