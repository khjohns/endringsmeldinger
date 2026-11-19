/**
 * Rotlayouten fjerner forrige brukers utkast for ny sak fra fanen når sesjonen er hentet,
 * også når den første sesjonen utløp uten utlogging (#1678).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from '../../../../routes/+layout';
import { etterFeiletForsoek, lagreVentende, lesVentende } from '#lib/components/varden/ventende.ts';

const getSession = vi.hoisted(() => vi.fn());
vi.mock('#lib/api/auth.ts', () => ({ getSession }));

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

describe('den ventende opprettelsen etter et forsøk som feilet (#2188)', () => {
  const forsok = { utkast: null } as never;
  const ventende = { sakId: 'sak-1', kommandoId: 'kommando-1', forsok };

  it('en sikker avvisning beholder skjemaet og ID-ene, men ikke forsøket som ville gjenopptatt brevkontrollen', () => {
    lagreVentende('bruker-a', 'p1', ventende);
    etterFeiletForsoek('bruker-a', 'p1', ventende, 'avvist');
    expect(lesVentende('bruker-a', 'p1')).toEqual({
      sakId: 'sak-1',
      kommandoId: 'kommando-1',
      utkast: null,
    });
  });

  it('et usikkert utfall beholder forsøket, så det sendes på nytt med de samme ID-ene', () => {
    lagreVentende('bruker-a', 'p1', ventende);
    etterFeiletForsoek('bruker-a', 'p1', ventende, 'usikkert');
    expect(lesVentende('bruker-a', 'p1')).toEqual(ventende);
  });

  it('leser et eldre lagret forsøk med skjemaet i begge feltene (#2234)', () => {
    sessionStorage.setItem(
      'nysak:ventende:bruker-a:p1',
      JSON.stringify({ ...ventende, utkast: null })
    );
    expect(lesVentende('bruker-a', 'p1')).toEqual(ventende);
  });

  it('en lagret sak uten lesbart brev fjerner opprettelsen', () => {
    lagreVentende('bruker-a', 'p1', ventende);
    etterFeiletForsoek('bruker-a', 'p1', ventende, 'lagret');
    expect(lesVentende('bruker-a', 'p1')).toBeNull();
  });
});
