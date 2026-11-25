import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { ApiError } from '#lib/api/client.ts';
import { registrerOppsett, BF, START } from './vardenOppsett.ts';

registrerOppsett();

describe('Varden med brukerforløpet BF-01', () => {
  it('MM-U2: en opprettelse kjernen ikke forstår, gir overskriften «Uten tittel» og en melding om at saken ikke kan leses (#2079)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const hent: typeof demosak.hent = async (...a) => {
      const svar = await demosak.hent(...a);
      return {
        ...svar,
        journal: svar.journal.map((r, i) => (i === 0 ? { ...r, format: 999 } : r)),
      };
    };
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Uten tittel' })).toBeTruthy();
    expect(screen.getByText(/^Saken har en hendelse som ikke kan leses her\./)).toBeTruthy();
  });

  it('MM-U44: meldingen i en sak kjernen ikke forstår, sier at et varsel med frist sendes på annen måte og legges til som korrespondanse, og knappen finnes (OV-U4, #2079)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const hent: typeof demosak.hent = async (...a) => {
      const svar = await demosak.hent(...a);
      return {
        ...svar,
        journal: svar.journal.map((r, i) => (i === 0 ? { ...r, format: 999 } : r)),
      };
    };
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    const melding = await screen.findByText(/^Saken har en hendelse som ikke kan leses her\./);
    expect(melding).toHaveTextContent('Brev kan ikke sendes herfra.');
    expect(melding).toHaveTextContent(
      'Et varsel med frist sender du på annen måte, og legger til i saken etterpå med «Legg til korrespondanse».'
    );
    expect(screen.getByRole('button', { name: 'Legg til korrespondanse' })).toBeTruthy();
  });

  it('kontrollsak for MM-U2: en sak kjernen forstår, har tittelen og ingen melding om at saken ikke kan leses (#2079)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveTextContent('Uten tittel');
    expect(screen.queryByText(/^Saken har en hendelse som ikke kan leses her\./)).toBeNull();
  });

  it.each([
    [0, 'Beklager, vi fikk ikke svar fra serveren. Kontroller nettforbindelsen, og prøv igjen.'],
    [500, 'Beklager, serveren svarte med en feil. Prøv igjen om litt.'],
  ])(
    'ved lastefeil %i står rådet på arket, og «Prøv igjen» laster saken (#2188)',
    async (status, raad) => {
      const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
      const hent = vi
        .fn()
        .mockRejectedValueOnce(new ApiError(status, 'Teknisk detalj fra serveren.'))
        .mockImplementation(demosak.hent);
      const kjernesak = lagKjernesak({
        sakId: demosak.sakId,
        prosjektId: 'demo',
        part: 'BH',
        hent,
        send: demosak.send,
      });
      await kjernesak.last();
      render(Vardensak, { kjernesak });

      const feil = await screen.findByRole('alert');
      expect(within(feil).getByRole('heading', { name: 'Saken kunne ikke hentes' })).toBeTruthy();
      expect(within(feil).getByText(raad)).toBeTruthy();
      expect(feil.textContent).not.toContain('Teknisk detalj');
      expect(feil.closest('main')).toBeTruthy();
      expect(screen.queryByText('Laster saken …')).toBeNull();

      await fireEvent.click(within(feil).getByRole('button', { name: 'Prøv igjen' }));
      await screen.findByRole('heading', { name: BF.tittel, level: 1 });
      expect(screen.queryByRole('alert')).toBeNull();
    }
  );

  it('når lastingen etter en sending avvises med 403, sier arket at brevet er lagret (review av #2202)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const ekte = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    const lagret = 'Brevet er lagret, men saken kunne ikke lastes på nytt. Du har ikke tilgang.';
    const overstyrt: Record<string, unknown> = {
      lasteutfall: 'utilgjengelig',
      saksbilde: null,
      utledning: null,
      utdatert: true,
      feil: lagret,
    };
    const kjernesak = new Proxy(ekte, {
      get: (t, k) =>
        typeof k === 'string' && k in overstyrt ? overstyrt[k] : Reflect.get(t, k, t),
    });
    render(Vardensak, { kjernesak });
    const feil = await screen.findByRole('alert');
    expect(
      within(feil).getByRole('heading', {
        name: 'Saken finnes ikke, eller du har ikke tilgang til den',
      })
    ).toBeTruthy();
    expect(within(feil).getByRole('status').textContent).toBe(lagret);
  });

  it.each([403, 404])('viser samme vei til sakslisten ved HTTP %i (#2188)', async (status) => {
    const kjernesak = lagKjernesak({
      sakId: 'sak-1',
      prosjektId: 'p-1',
      hent: async () => {
        throw new ApiError(status, 'Teknisk detalj fra serveren.');
      },
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, saksliste: '/p-1' });
    const kortet = within(screen.getByRole('alert'));
    expect(
      kortet.getByRole('heading', { name: 'Saken finnes ikke, eller du har ikke tilgang til den' })
    ).toBeTruthy();
    expect(kortet.getByRole('link', { name: 'Til sakslisten' }).getAttribute('href')).toBe('/p-1');
    expect(kortet.queryByRole('button')).toBeNull();
  });

  it('«Prøv igjen» er opptatt mens saken lastes på nytt, og en ny feil viser når det sist ble forsøkt (#1373, funn 1)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    let svar!: (v: unknown) => void;
    const hent = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, 'Serveren svarte med feilkode 500 uten forklaring.'))
      .mockImplementationOnce(
        () => new Promise((_, avvis) => (svar = () => avvis(new ApiError(500, 'Igjen.'))))
      );
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });

    await fireEvent.click(screen.getByRole('button', { name: 'Prøv igjen' }));
    const opptatt = await screen.findByRole('button', { name: 'Prøver igjen …' });
    expect(opptatt.getAttribute('aria-busy')).toBe('true');

    svar(null);
    const knapp = await screen.findByRole('button', { name: 'Prøv igjen' });
    expect(knapp.getAttribute('aria-busy')).toBeNull();
    expect(screen.getByRole('alert').textContent).toMatch(/Sist forsøkt kl\.\u00a0\d\d\.\d\d\./);
    expect(screen.getByRole('alert').textContent).toContain(
      'Beklager, serveren svarte med en feil. Prøv igjen om litt.'
    );
  });
});
