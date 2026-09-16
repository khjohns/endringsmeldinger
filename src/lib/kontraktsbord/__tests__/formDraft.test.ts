// @vitest-environment jsdom
/**
 * Felles arbeidsutkast i et saksskjema.
 *
 * Utkastet deles av teamet, så to kan skrive i det samtidig. Det som testes her
 * er at ingen av dem taper tekst stille: en samtidig skriving blir en konflikt
 * brukeren må avgjøre, ikke en stille overskriving, og et tapt nettverk lar
 * teksten bli stående i skjemaet.
 */

import { render, cleanup, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import UtkastHarness from './UtkastHarness.svelte';
import { hentUtkast, lagreUtkast, slettUtkast, UtkastKonflikt } from '$lib/api/utkast';
import type { createFormDraft } from '$lib/kontraktsbord/submission.svelte';
import { draftOwner, setDraftOwner } from '$lib/utils/draftOwner';
import { setActiveProjectId } from '$lib/api/client';

vi.mock('$lib/api/utkast', async (importActual) => {
  // Feilklassen må være den ekte, siden koden bruker instanceof.
  const faktisk = await importActual<typeof import('$lib/api/utkast')>();
  return {
    ...faktisk,
    hentUtkast: vi.fn(),
    lagreUtkast: vi.fn(),
    slettUtkast: vi.fn(),
  };
});

const IDENTITET = { sakId: 'KOE-1', spor: 'grunnlag' as const, revisjon: 2 };

function serverUtkast(tekst: string, versjon: number, av = 'kollega@example.test') {
  return {
    innhold: { tekst },
    versjon,
    oppdatert_av: av,
    oppdatert: '2026-09-15T10:00:00Z',
    kontraktsside: 'BH' as const,
  };
}

type Api = {
  draft: ReturnType<typeof createFormDraft<{ tekst: string }>>;
  skriv: (verdi: string) => void;
  les: () => string;
};

async function monter(flereFelt = false): Promise<Api> {
  let api: Api | undefined;
  render(UtkastHarness, { identitet: IDENTITET, flereFelt, ondraft: (a: Api) => (api = a) });
  await waitFor(() => expect(api!.draft.ready).toBe(true));
  return api!;
}

/** Skriv i skjemaet og la den utsatte lagringen løpe ut. */
async function skrivOgVent(api: Api, tekst: string) {
  api.skriv(tekst);
  await tick();
  await vi.advanceTimersByTimeAsync(1200);
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  setDraftOwner('alice');
  setActiveProjectId('oslobygg');
  vi.mocked(hentUtkast).mockImplementation(async () => ({
    utkast: null,
    team_id: 'team-bh',
    user_id: draftOwner() ?? 'alice',
  }));
  vi.mocked(lagreUtkast).mockImplementation(async (_s, _p, _r, innhold, forventet) =>
    serverUtkast((innhold as { tekst: string }).tekst, (forventet ?? 0) + 1, 'meg@example.test')
  );
  vi.mocked(slettUtkast).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('felles arbeidsutkast', () => {
  it('avslutter konfliktvalget når min tekst allerede er lik serverens', async () => {
    const api = await monter();
    vi.mocked(lagreUtkast).mockRejectedValueOnce(new UtkastKonflikt(serverUtkast('Deres', 1)));
    await skrivOgVent(api, 'Min');
    api.skriv('Deres');
    await tick();
    api.draft.behold();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.draft.status).toBe('lagret');
    expect(lagreUtkast).toHaveBeenCalledTimes(1);
  });
  it('avviser gjenoppretting og lagring når serversesjonen er byttet i en annen fane', async () => {
    const api = await monter();
    api.skriv('Alices private tekst');
    await tick();
    cleanup();
    vi.mocked(hentUtkast).mockResolvedValueOnce({
      utkast: null,
      team_id: 'team-bh',
      user_id: 'bob',
    });
    const gammelFane = await monter();
    expect(gammelFane.les()).toBe('');
    await skrivOgVent(gammelFane, 'Skal ikke sendes med Bobs sesjon');
    expect(lagreUtkast).not.toHaveBeenCalled();
  });
  it('oppfatter ikke annen JSON-feltrekkefølge som en innholdsendring', async () => {
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: { ...serverUtkast('Start', 1), innhold: { valgt: true, tekst: 'Start' } },
      team_id: 'team-bh',
      user_id: 'alice',
    });
    await monter(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('holder konflikten åpen gjennom flere omlastinger', async () => {
    const api = await monter();
    api.skriv('Min tekst');
    await tick();
    cleanup();
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Deres', 1),
      team_id: 'team-bh',
      user_id: 'alice',
    });
    await monter();
    cleanup();
    const igjen = await monter();
    expect(igjen.les()).toBe('Min tekst');
    expect(igjen.draft.status).toBe('konflikt');
    await vi.advanceTimersByTimeAsync(5000);
    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('gjenoppretter ikke tekst før teamtilgangen kan bekreftes', async () => {
    const api = await monter();
    api.skriv('Usendt tekst');
    await tick();
    cleanup();
    vi.mocked(hentUtkast).mockRejectedValueOnce(new Error('Ingen tilgang'));
    expect((await monter()).les()).toBe('');
    cleanup();
    expect((await monter()).les()).toBe('Usendt tekst');
  });

  it('skiller gjenoppretting mellom team på samme kontraktsside', async () => {
    const api = await monter();
    api.skriv('Byggherrens tekst');
    await tick();
    cleanup();
    vi.mocked(hentUtkast).mockResolvedValueOnce({
      utkast: null,
      team_id: 'team-radgiver',
      user_id: 'alice',
    });
    expect((await monter()).les()).toBe('');
    cleanup();
    expect((await monter()).les()).toBe('Byggherrens tekst');
  });

  it('beholder prosjektet fra montering ved en forsinket lagring', async () => {
    const api = await monter();
    api.skriv('Prosjektets tekst');
    await tick();
    setActiveProjectId('annet-prosjekt');
    await vi.advanceTimersByTimeAsync(1200);
    expect(lagreUtkast).toHaveBeenLastCalledWith(
      'KOE-1',
      'grunnlag',
      2,
      { tekst: 'Prosjektets tekst' },
      null,
      'oslobygg'
    );
  });

  it('lar ikke sen kvittering fra et lukket skjema slette nyere lokal tekst', async () => {
    let fullfor!: (value: ReturnType<typeof serverUtkast>) => void;
    vi.mocked(lagreUtkast).mockImplementationOnce(
      () => new Promise((resolve) => (fullfor = resolve))
    );
    const api = await monter();
    await skrivOgVent(api, 'Første tekst');
    cleanup();
    const neste = await monter();
    neste.skriv('Nyere tekst');
    await tick();
    fullfor(serverUtkast('Første tekst', 1));
    await vi.advanceTimersByTimeAsync(0);
    cleanup();
    expect((await monter()).les()).toBe('Nyere tekst');
  });

  it('gjenoppretter ikke buffer etter vellykket innsending', async () => {
    const api = await monter();
    api.skriv('Sendt tekst');
    await tick();
    api.draft.clear();
    cleanup();
    expect((await monter()).les()).toBe('');
  });

  it('slutter å lagre når innlogget bruker endres mens timeren venter', async () => {
    const api = await monter();
    api.skriv('Alices tekst');
    await tick();
    setDraftOwner('bob');
    await vi.advanceTimersByTimeAsync(1200);
    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('henter tilbake tekst etter ny montering før lagringstimeren har løpt ut', async () => {
    const api = await monter();
    api.skriv('Tekst før navigasjon');
    await tick();
    cleanup();
    const gjenapnet = await monter();
    expect(gjenapnet.les()).toBe('Tekst før navigasjon');
    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('beholder lokal tekst og viser konflikt når serveren er endret under fraværet', async () => {
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Start', 1),
      team_id: 'team-bh',
      user_id: 'alice',
    });
    const api = await monter();
    api.skriv('Min usendte tekst');
    await tick();
    cleanup();
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Kollegaens nyere tekst', 2),
      team_id: 'team-bh',
      user_id: 'alice',
    });
    const gjenapnet = await monter();
    expect(gjenapnet.les()).toBe('Min usendte tekst');
    expect(gjenapnet.draft.konflikt?.innhold).toEqual({ tekst: 'Kollegaens nyere tekst' });
    await vi.advanceTimersByTimeAsync(5000);
    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('viser ikke Alices gjenopprettingsbuffer til Bob', async () => {
    const api = await monter();
    api.skriv('Alices tekst');
    await tick();
    cleanup();
    setDraftOwner('bob');
    const bob = await monter();
    expect(bob.les()).toBe('');
    cleanup();
    setDraftOwner('alice');
    expect((await monter()).les()).toBe('Alices tekst');
  });

  it('stopper autolagring også når konflikten skyldes et slettet utkast', async () => {
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Start', 1),
      team_id: 'team-bh',
      user_id: 'alice',
    });
    const api = await monter();
    vi.mocked(lagreUtkast).mockRejectedValueOnce(new UtkastKonflikt(null));
    await skrivOgVent(api, 'Min tekst');
    await skrivOgVent(api, 'Min tekst videre');
    expect(lagreUtkast).toHaveBeenCalledTimes(1);
    expect(api.draft.status).toBe('konflikt');
    expect(api.les()).toBe('Min tekst videre');
  });

  it('lar brukeren opprette teksten på nytt etter slettingskonflikt', async () => {
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Start', 1),
      team_id: 'team-bh',
      user_id: 'alice',
    });
    const api = await monter();
    vi.mocked(lagreUtkast).mockRejectedValueOnce(new UtkastKonflikt(null));
    await skrivOgVent(api, 'Min tekst');
    api.draft.behold();
    await vi.advanceTimersByTimeAsync(0);
    expect(lagreUtkast).toHaveBeenLastCalledWith(
      'KOE-1',
      'grunnlag',
      2,
      { tekst: 'Min tekst' },
      null,
      'oslobygg'
    );
    expect(api.draft.status).toBe('lagret');
  });

  it('oppretter ikke et serverutkast bare fordi et tomt skjema åpnes', async () => {
    await monter();
    await vi.advanceTimersByTimeAsync(5000);
    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('venter på pågående lagring og bruker kvittert versjon for nyere tekst', async () => {
    let fullfor!: (value: ReturnType<typeof serverUtkast>) => void;
    vi.mocked(lagreUtkast).mockImplementationOnce(
      () => new Promise((resolve) => (fullfor = resolve))
    );
    const api = await monter();
    await skrivOgVent(api, 'Første tekst');
    await skrivOgVent(api, 'Nyere tekst');
    expect(lagreUtkast).toHaveBeenCalledTimes(1);
    fullfor(serverUtkast('Første tekst', 1));
    await vi.advanceTimersByTimeAsync(1200);
    expect(lagreUtkast).toHaveBeenCalledTimes(2);
    expect(lagreUtkast).toHaveBeenLastCalledWith(
      'KOE-1',
      'grunnlag',
      2,
      { tekst: 'Nyere tekst' },
      1,
      'oslobygg'
    );
  });

  it('avbryter ventende autolagring når utkastet tømmes', async () => {
    const api = await monter();
    api.skriv('Sendt tekst');
    await tick();
    api.draft.clear();
    await vi.advanceTimersByTimeAsync(1200);
    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('lagrer tilbakeført tekst når en eldre endring fortsatt er på vei', async () => {
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Opprinnelig', 1),
      team_id: 'team-bh',
      user_id: 'alice',
    });
    let fullfor!: (value: ReturnType<typeof serverUtkast>) => void;
    vi.mocked(lagreUtkast).mockImplementationOnce(
      () => new Promise((resolve) => (fullfor = resolve))
    );
    const api = await monter();
    await skrivOgVent(api, 'Endring');
    await skrivOgVent(api, 'Opprinnelig');
    fullfor(serverUtkast('Endring', 2));
    await vi.advanceTimersByTimeAsync(1200);
    expect(lagreUtkast).toHaveBeenLastCalledWith(
      'KOE-1',
      'grunnlag',
      2,
      { tekst: 'Opprinnelig' },
      2,
      'oslobygg'
    );
  });

  it('sletter først etter at en pågående lagring er avsluttet', async () => {
    let fullfor!: (value: ReturnType<typeof serverUtkast>) => void;
    vi.mocked(lagreUtkast).mockImplementationOnce(
      () => new Promise((resolve) => (fullfor = resolve))
    );
    const api = await monter();
    await skrivOgVent(api, 'Sendt tekst');
    api.draft.clear();
    expect(slettUtkast).not.toHaveBeenCalled();
    fullfor(serverUtkast('Sendt tekst', 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(slettUtkast).toHaveBeenCalledTimes(1);
    expect(api.draft.status).toBe('uendret');
  });

  it('henter teamets lagrede utkast og fyller skjemaet', async () => {
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Kollegaens tekst', 3),
      team_id: 'team-bh',
      user_id: 'alice',
    });

    const api = await monter();

    expect(api.les()).toBe('Kollegaens tekst');
    expect(hentUtkast).toHaveBeenCalledWith('KOE-1', 'grunnlag', 2, 'oslobygg');
  });

  it('skriver ikke utkastet tilbake når ingenting er endret', async () => {
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Uendret', 3),
      team_id: 'team-bh',
      user_id: 'alice',
    });

    await monter();
    await vi.advanceTimersByTimeAsync(5000);

    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('lagrer etter en pause, ikke ved hvert tastetrykk', async () => {
    const api = await monter();

    api.skriv('A');
    await tick();
    api.skriv('AB');
    await tick();
    expect(lagreUtkast).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1200);

    expect(lagreUtkast).toHaveBeenCalledTimes(1);
    expect(lagreUtkast).toHaveBeenCalledWith(
      'KOE-1',
      'grunnlag',
      2,
      { tekst: 'AB' },
      null,
      'oslobygg'
    );
  });

  it('sender versjonen den leste, så en samtidig skriving kan oppdages', async () => {
    vi.mocked(hentUtkast).mockResolvedValue({
      utkast: serverUtkast('Start', 7),
      team_id: 'team-bh',
      user_id: 'alice',
    });

    const api = await monter();
    await skrivOgVent(api, 'Endret');

    expect(lagreUtkast).toHaveBeenCalledWith(
      'KOE-1',
      'grunnlag',
      2,
      { tekst: 'Endret' },
      7,
      'oslobygg'
    );
  });

  it('melder konflikt med kollegaens tekst i stedet for å overskrive den', async () => {
    const api = await monter();
    vi.mocked(lagreUtkast).mockRejectedValueOnce(
      new UtkastKonflikt(serverUtkast('Kollegaens nyere tekst', 5))
    );

    await skrivOgVent(api, 'Min tekst');

    expect(api.draft.status).toBe('konflikt');
    expect(api.draft.konflikt?.innhold).toEqual({ tekst: 'Kollegaens nyere tekst' });
    // Min egen tekst står fortsatt i skjemaet mens valget er åpent.
    expect(api.les()).toBe('Min tekst');
  });

  it('skriver ikke videre mens konflikten er uavklart', async () => {
    const api = await monter();
    vi.mocked(lagreUtkast).mockRejectedValueOnce(new UtkastKonflikt(serverUtkast('Deres', 5)));
    await skrivOgVent(api, 'Min tekst');
    vi.mocked(lagreUtkast).mockClear();

    await skrivOgVent(api, 'Min tekst fortsatt redigert');

    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('«behold min tekst» skriver over deres, på serverens gjeldende versjon', async () => {
    const api = await monter();
    vi.mocked(lagreUtkast).mockRejectedValueOnce(new UtkastKonflikt(serverUtkast('Deres', 5)));
    await skrivOgVent(api, 'Min tekst');

    api.draft.behold();
    await vi.advanceTimersByTimeAsync(0);

    expect(lagreUtkast).toHaveBeenLastCalledWith(
      'KOE-1',
      'grunnlag',
      2,
      { tekst: 'Min tekst' },
      5,
      'oslobygg'
    );
    expect(api.les()).toBe('Min tekst');
    await waitFor(() => expect(api.draft.konflikt).toBeNull());
  });

  it('«hent inn deres» erstatter min tekst uten å skrive noe', async () => {
    const api = await monter();
    vi.mocked(lagreUtkast).mockRejectedValueOnce(
      new UtkastKonflikt(serverUtkast('Deres tekst', 5))
    );
    await skrivOgVent(api, 'Min tekst');
    vi.mocked(lagreUtkast).mockClear();

    api.draft.hentInn();
    await tick();
    await vi.advanceTimersByTimeAsync(5000);

    expect(api.les()).toBe('Deres tekst');
    expect(api.draft.konflikt).toBeNull();
    expect(lagreUtkast).not.toHaveBeenCalled();
  });

  it('beholder teksten i skjemaet når serveren ikke svarer', async () => {
    const api = await monter();
    vi.mocked(lagreUtkast).mockRejectedValueOnce(new Error('Network error'));

    await skrivOgVent(api, 'Viktig tekst');

    expect(api.draft.status).toBe('frakoblet');
    expect(api.les()).toBe('Viktig tekst');
  });

  it('lar skjemaet brukes selv om utkastet ikke kunne hentes', async () => {
    vi.mocked(hentUtkast).mockRejectedValue(new Error('Network error'));

    const api = await monter();

    expect(api.draft.status).toBe('frakoblet');
    expect(api.les()).toBe('');
  });

  it('forkaster utkastet etter innsending, og skriver ikke mer', async () => {
    const api = await monter();
    await skrivOgVent(api, 'Sendt innhold');
    vi.mocked(lagreUtkast).mockClear();

    api.draft.clear();
    await skrivOgVent(api, 'Etterpå');

    expect(slettUtkast).toHaveBeenCalledWith('KOE-1', 'grunnlag', 2, 'oslobygg');
    expect(lagreUtkast).not.toHaveBeenCalled();
  });
});
