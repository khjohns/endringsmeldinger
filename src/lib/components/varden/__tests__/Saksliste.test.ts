/**
 * Sakslisten i Varden (#1450, økt A). Forventningene står i beskrivelsen av #1450 (punkt 2–8),
 * med svarene på M1–M8 og avklaringene 02.11 i kommentarene der, og vedtakene KT-U9, KT-U10,
 * EO-U13, MM-U28 og MM-U30.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import Saksliste from '$lib/components/varden/Saksliste.svelte';
import Vardensak from '$lib/components/varden/Vardensak.svelte';
import { lagSakslinje } from '$lib/mocks/sakslinje';
import { finnForloep, lagDemosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { ApiError } from '$lib/api/client';
import type { Sakslinje } from '$lib/types/api';

afterEach(cleanup);

const ingenting = { betegnelse: null, venter_paa_svar: false, svar_ikke_godtatt: false };

function vis(over: Partial<Parameters<typeof render<typeof Saksliste>>[1]> = {}) {
  return render(Saksliste, {
    saker: [lagSakslinje()],
    part: 'TE',
    prosjektNavn: 'Skolebygg Nord',
    sakslenke: (sakId: string) => `/p1/${sakId}`,
    nyttKrav: '/p1/ny',
    ...over,
  });
}

const panelet = () => screen.getByRole('navigation', { name: 'Saker' });
const rad = (tittel: string) => screen.getByRole('link', { name: tittel }).closest('li')!;

describe('Sakslisten i Varden', () => {
  it('panelet har KOE og EO med antallet lest av sakstypen, og ikke forsering (KT-U9, svaret på M4)', () => {
    vis({
      saker: [
        lagSakslinje({ sak_id: 'A' }),
        lagSakslinje({ sak_id: 'B' }),
        lagSakslinje({ sak_id: 'C', sakstype: 'forsering' }),
      ],
    });
    const valg = within(panelet()).getAllByRole('button');
    expect(valg.map((v) => v.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Krav om endringsordre 2 saker',
      'Endringsordrer 0 saker',
    ]);
    expect(valg[0].getAttribute('aria-current')).toBe('page');
    expect(within(panelet()).queryByText(/Forsering/)).toBeNull();
  });

  it('valget av EO avgrenser lista og viser den tomme tilstanden til EO-saken er bygget (#1423)', async () => {
    vis();
    await fireEvent.click(within(panelet()).getByRole('button', { name: /Endringsordrer/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Endringsordrer');
    expect(screen.getByText('Ingen endringsordrer ennå.')).toBeTruthy();
    // Knappen for KOE hører til KOE-fanen, og «Ny endringsordre» venter på #1423 (KT-U10).
    expect(screen.queryByRole('link', { name: 'Nytt krav om endringsordre' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Endring i grunnarbeider' })).toBeNull();
  });

  it('lista har en lastetilstand, en feiltilstand med «Prøv igjen» og en tom tilstand (#1450, punkt 3)', async () => {
    vis({ laster: true, saker: [] });
    expect(screen.getByRole('status').textContent).toBe('Laster sakene …');
    cleanup();

    const proevIgjen = vi.fn();
    vis({ feil: 'Serveren svarte med feilkode 500.', saker: [], onproevIgjen: proevIgjen });
    const feil = screen.getByRole('alert');
    expect(within(feil).getByRole('heading', { name: 'Sakene kunne ikke lastes' })).toBeTruthy();
    expect(feil.textContent).toContain('Teknisk melding: Serveren svarte med feilkode 500.');
    await fireEvent.click(within(feil).getByRole('button', { name: 'Prøv igjen' }));
    expect(proevIgjen).toHaveBeenCalledOnce();
    cleanup();

    vis({ saker: [], part: 'BH' });
    expect(screen.getByText('Ingen krav om endringsordre ennå.')).toBeTruthy();
  });

  it('kolonnene er saken, «Vederlag» og «Frist», og hver rad lenker til saken (svaret på M7)', () => {
    vis({ saker: [lagSakslinje({ sak_id: 'SAK-9', hovedkategori: 'endring' })] });
    const hode = document.querySelector('.radhode')!;
    expect([...hode.querySelectorAll('span')].map((s) => s.textContent)).toEqual([
      'Sak',
      'Vederlag',
      'Frist',
    ]);
    const lenke = screen.getByRole('link', { name: 'Endring i grunnarbeider' });
    expect(lenke.getAttribute('href')).toBe('/p1/SAK-9');
    expect(within(rad('Endring i grunnarbeider')).getByText('Endringer')).toBeTruthy();
  });

  it('vederlag og frist viser betegnelsen etter MM-U30, verdiene med «Krevd» og «Svar», og resultatet med «subsidiært» under (MM-U28)', () => {
    const linje: Sakslinje = lagSakslinje({
      vederlag: {
        betegnelse: 'svar_ikke_godtatt',
        venter_paa_svar: false,
        svar_ikke_godtatt: true,
        kravet_staar: true,
        krav: { beloep: 420000, metode: 'regning' },
        svar: { resultat: 'delvis_godkjent', beloep: 310000, subsidiaert: true },
        enighet: null,
      },
      frist: {
        betegnelse: 'enige',
        venter_paa_svar: false,
        svar_ikke_godtatt: false,
        kravet_staar: true,
        krav: { dager: 15 },
        svar: { resultat: 'godkjent', dager: 15, subsidiaert: false },
        enighet: { dager: 15, virkning: 'betinget' },
      },
    });
    vis({ saker: [linje] });
    const [vederlag, frist] = [...rad('Endring i grunnarbeider').querySelectorAll('.spor')];

    expect(within(vederlag as HTMLElement).getByText('Vederlag')).toBeTruthy();
    const verdier = [...vederlag.querySelectorAll('dl div')].map((d) =>
      [...d.children].map((c) => c.textContent?.replace(/\s/g, ' '))
    );
    expect(verdier).toEqual([
      ['Krevd', '420 000 kr'],
      ['Svar', '310 000 kr'],
    ]);
    expect(vederlag.textContent).toContain('Svaret er ikke godtatt');
    expect(vederlag.textContent).toContain('Delvis godkjent, subsidiært');
    // Et subsidiært tall er et avslag og kalles ikke «godkjent» alene (MM-U28).
    expect(vederlag.textContent).not.toMatch(/Godkjent(?!,)/);

    expect(frist.textContent).toContain('Enige');
    // Enighetens virkning er merket som appens lesing (MM-U28).
    expect(frist.textContent).toContain('15 dager, etter appens lesing betinget');
  });

  it('en sak uten krav og uten betegnelse viser «Ikke krevd», og ingen betegnelse finnes på (MM-U30)', () => {
    vis();
    const [vederlag] = [...rad('Endring i grunnarbeider').querySelectorAll('.spor')];
    expect(vederlag.textContent?.replace(/\s+/g, ' ').trim()).toBe('Vederlag Ikke krevd');
  });

  it('forholdet viser betegnelsen og resultatet under, uten eget merke (avklaringen 02.11, punkt 3)', () => {
    vis({
      saker: [
        lagSakslinje({
          forhold: {
            ...ingenting,
            betegnelse: 'svar_ikke_godtatt',
            svar_ikke_godtatt: true,
            svar: { resultat: 'avslaatt' },
          },
        }),
      ],
    });
    const saken = rad('Endring i grunnarbeider').querySelector('.saken')!;
    expect(saken.textContent).toContain('Svaret er ikke godtatt');
    expect(saken.textContent).toContain('Avslått');
    expect(saken.querySelector('.merker')).toBeNull();
  });

  it('en sak kjernen ikke forstår, viser bare betegnelsen (MM-U2, #1450 punkt 5)', () => {
    vis({
      saker: [
        lagSakslinje({
          forstaatt: false,
          saksbetegnelse: 'ikke_forstaatt',
          hovedkategori: null,
          vederlag: {
            ...ingenting,
            kravet_staar: false,
            krav: { beloep: 1, metode: 'x' },
            svar: null,
            enighet: null,
          },
        }),
      ],
    });
    const r = rad('Endring i grunnarbeider');
    expect(within(r).getByText('Ikke forstått')).toBeTruthy();
    expect(r.querySelectorAll('dl').length).toBe(0);
    expect(r.textContent).not.toContain('Ikke krevd');
  });

  it('merket «Inngår i EO-‹kode›» står på KOE-saken som en sendt endringsordre omfatter (EO-U13)', () => {
    vis({
      saker: [
        lagSakslinje({ sak_id: 'A', sakstittel: 'Med' }),
        lagSakslinje({ sak_id: 'B', sakstittel: 'Uten' }),
      ],
      endringsordrer: { A: 'EO-03' },
    });
    expect(within(rad('Med')).getByText('Inngår i EO-03')).toBeTruthy();
    expect(within(rad('Uten')).queryByText(/Inngår i/)).toBeNull();
  });

  it('TE ser «Nytt krav om endringsordre» til skjemaet, BH ser den ikke, og «Ny endringsordre» står ikke (KT-U10, #1450 punkt 7–8)', () => {
    vis({ part: 'TE' });
    expect(
      screen.getByRole('link', { name: 'Nytt krav om endringsordre' }).getAttribute('href')
    ).toBe('/p1/ny');
    expect(screen.getByText('Du er totalentreprenør (TE)')).toBeTruthy();
    cleanup();

    for (const part of ['BH', null] as const) {
      vis({ part });
      expect(screen.queryByRole('link', { name: 'Nytt krav om endringsordre' })).toBeNull();
      expect(screen.queryByText('Ny endringsordre')).toBeNull();
      cleanup();
    }
  });
});

describe('Saken i Varden etter at skallet er trukket ut', () => {
  it('«Saken finnes ikke» lenker tilbake til sakslisten (#1473, punkt 4)', async () => {
    const demosak = lagDemosak(finnForloep('BF-01')!, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: vi.fn().mockRejectedValue(new ApiError(404, 'Saken finnes ikke.')),
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, saksliste: '/p1' });
    const feil = await screen.findByRole('alert');
    expect(within(feil).getByRole('heading', { name: 'Saken finnes ikke' })).toBeTruthy();
    expect(within(feil).getByRole('link', { name: 'Til sakslisten' }).getAttribute('href')).toBe(
      '/p1'
    );
  });
});
