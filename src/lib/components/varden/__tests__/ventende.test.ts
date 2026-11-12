/**
 * Rotlayouten fjerner forrige brukers utkast for ny sak fra fanen når sesjonen er hentet,
 * også når den første sesjonen utløp uten utlogging (#1678).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from '../../../../routes/+layout';
import { lagreVentende, lesVentende } from '$lib/components/varden/ventende';

const getSession = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/auth', () => ({ getSession }));

afterEach(() => {
  getSession.mockReset();
  sessionStorage.clear();
});

describe('utkastet for ny sak ved innlogging (#1678)', () => {
  it('neste bruker i fanen får forrige brukers utkast fjernet, og eget utkast beholdes', async () => {
    const ventende = { sakId: 'sak-1', kommandoId: 'kommando-1', utkast: null };
    lagreVentende('bruker-a', 'p1', ventende);
    lagreVentende('bruker-b', 'p2', ventende);
    getSession.mockResolvedValue({ id: 'bruker-b', email: 'b@eksempel.no', name: 'B' });
    await load({ url: new URL('http://localhost/p1') } as never);
    expect(sessionStorage.getItem('nysak:ventende:bruker-a:p1')).toBeNull();
    expect(lesVentende('bruker-b', 'p2')).toEqual(ventende);
  });
});
