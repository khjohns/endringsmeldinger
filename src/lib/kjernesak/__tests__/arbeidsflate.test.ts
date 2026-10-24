/**
 * Kontrollrommets sakskontekst for en TS-sak (FK-8b, #718). Etter en ny lasting
 * som feiler, viser hele Kontrollrommet saken slik den sist ble lest.
 */

import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/client';
import type { Journallinje, Kjernesak } from '$lib/api/kjerne';
import type { Journalrad, Part } from '$kjerne/typer';
import { lagKjernesakflate } from '$lib/kjernesak/arbeidsflate.svelte';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { lagKravkontroll } from '$lib/kjernesak/kravkontroll.svelte';
import { vederlagssvarFraSkjema } from '$lib/kjernesak/vederlagssvar';
import { SAK, medVederlag, medVederlagssvar } from './provejournal';

const svar = (journal: Journalrad[], part: Part | null): Kjernesak => ({
  versjon: journal.length,
  part,
  visning: {} as Kjernesak['visning'],
  journal: journal.map(
    ({ event_id, versjon, event_type, tidsstempel, aktor_rolle, format, data }): Journallinje => ({
      event_id,
      versjon,
      event_type,
      tidsstempel,
      aktor_rolle,
      format,
      data,
    })
  ),
  leveringsoppdrag: [],
});

describe('TS-saken i Kontrollrommet etter en ny lasting', () => {
  it('når saken ikke finnes ved en ny lasting, står statusteksten og kravversjonen fra forrige lesing (#732 p10)', async () => {
    let finnes = true;
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => {
        if (!finnes) throw new ApiError(404, 'Saken finnes ikke.');
        return svar(medVederlag, 'TE');
      },
    });
    await kjernesak.last();
    const flate = lagKjernesakflate(kjernesak, 'p-1');
    const foer = flate.statustekst('vederlag');
    expect(foer).not.toBe('');
    expect(flate.kravversjon('vederlag')).toBe(1);

    finnes = false;
    await kjernesak.last();
    // En sak som alt er lastet, beholdes ved en 404 (#719).
    expect(kjernesak.finnes).toBe(true);
    expect(flate.statustekst('vederlag')).toBe(foer);
    expect(flate.kravversjon('vederlag')).toBe(1);
  });

  it('bare TE får tilbud om TE-handlingene, uansett hva kjernen tilbyr (#737 p3)', async () => {
    for (const [part, tilbys] of [
      ['TE', true],
      ['BH', false],
      [null, false],
    ] as const) {
      const kjernesak = lagKjernesak({
        sakId: SAK,
        prosjektId: 'p-1',
        hent: async () => svar(medVederlag.slice(0, 2), part),
      });
      await kjernesak.last();
      expect(lagKjernesakflate(kjernesak, 'p-1').tilbyrTe('krav:vederlag')).toBe(tilbys);
    }
  });
});

describe('BHs svar på vederlagskravet i TS-saken (#1047)', () => {
  const flate = async (journal: Journalrad[], part: Part) => {
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar(journal, part),
    });
    await kjernesak.last();
    return lagKjernesakflate(kjernesak, 'p-1');
  };

  it('BH får skjemaet når kjernen tilbyr svaret, og TE får det ikke', async () => {
    expect((await flate(medVederlag, 'BH')).bhSkjema('vederlag')).toBe('Svar på kravet');
    expect((await flate(medVederlag, 'BH')).bhSkjema('frist')).toBeNull();
    expect((await flate(medVederlag, 'TE')).bhSkjema('vederlag')).toBeNull();
  });

  it('knappen og skjemaet leser samme skjema for begge parter (#1238, #943)', async () => {
    const bh = await flate(medVederlag, 'BH');
    const te = await flate(medVederlag, 'TE');
    expect(bh.skjema('vederlag')).toBe('Svar på kravet');
    expect(bh.skjema('frist')).toBeNull();
    expect(te.skjema('vederlag')).toBe(te.teSkjema('vederlag'));
  });

  it('kjernen tilbyr ikke et nytt svar når kravet er besvart (ALLEREDE_SVART)', async () => {
    expect((await flate(medVederlagssvar, 'BH')).bhSkjema('vederlag')).toBeNull();
  });

  it('svaret sendes med kjernens låste tekst og utdypningen, uten rigg og drift (#1047, LV-U2, #1171)', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-ny', leveringsoppdrag: 'l-ny', versjon: 9 });
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar(medVederlag, 'BH'),
      send,
    });
    await kjernesak.last();
    const kontroll = lagKravkontroll(kjernesak);
    const sending = kontroll.submit('vederlag', 'respons_vederlag', {
      hovedkrav_vurdering: 'godkjent',
      aksepterer_metode: true,
      beregnings_resultat: 'godkjent',
      total_godkjent_belop: 250000,
      rigg_vurdering: 'godkjent',
      rigg_godkjent_belop: 1000,
      begrunnelse: '<p>Godtatt.</p>',
    });
    await vi.waitFor(() => expect(kontroll.letter).not.toBeNull());
    expect(kontroll.letter!.tekst.join(' ')).toMatch(/Byggherren godkjenner 250\s000\skr/);
    expect(kontroll.letter!.utdypning).toBe('Godtatt.');
    expect(kontroll.letter!.handling).toBe('Du svarer på kravet');
    expect(kontroll.letter!.sendes).toBe('Send til entreprenøren');
    kontroll.confirm();
    await sending;
    const kommando = send.mock.calls[0][3] as { type: string; svar: Record<string, unknown>[] };
    expect(kommando.type).toBe('brev');
    expect(kommando.svar).toHaveLength(1);
    expect(JSON.stringify(kommando)).not.toMatch(/rigg/);
    expect(kommando.svar[0].utdypning).toBe('Godtatt.');
  });

  it('et svar med et annet beløp enn kjernen regner ut, sendes ikke, og feilen sier hva som hindrer (B-13)', async () => {
    const send = vi.fn();
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar(medVederlag, 'BH'),
      send,
    });
    await kjernesak.last();
    await expect(
      lagKravkontroll(kjernesak).submit('vederlag', 'respons_vederlag', {
        hovedkrav_vurdering: 'godkjent',
        aksepterer_metode: true,
        beregnings_resultat: 'godkjent',
        total_godkjent_belop: 1,
      })
    ).rejects.toThrow(/godkjent_beloep=250000/);
    expect(send).not.toHaveBeenCalled();
  });

  it('et delvis godkjent svar uten begrunnelse vises ikke i brevkontrollen, og meldingen sier hva som hindrer (#1254, KA-U24, KA-U31)', async () => {
    const send = vi.fn();
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar(medVederlag, 'BH'),
      send,
    });
    await kjernesak.last();
    const kontroll = lagKravkontroll(kjernesak);
    const delvis = {
      hovedkrav_vurdering: 'delvis',
      aksepterer_metode: true,
      hovedkrav_godkjent_belop: 100000,
      beregnings_resultat: 'delvis_godkjent',
      total_godkjent_belop: 100000,
    };
    await expect(kontroll.submit('vederlag', 'respons_vederlag', delvis)).rejects.toThrow(
      /Svaret må ha en begrunnelse/
    );
    expect(kontroll.letter).toBeNull();
    expect(send).not.toHaveBeenCalled();

    // A1: forhåndsvisningen viser teksten før begrunnelsen er skrevet.
    const utenBegrunnelse = vederlagssvarFraSkjema(
      delvis,
      kjernesak.utledning!,
      kjernesak.regelversjon
    );
    expect(kjernesak.brev(utenBegrunnelse)).toHaveProperty('tekst');

    const sending = kontroll.submit('vederlag', 'respons_vederlag', {
      ...delvis,
      begrunnelse: '<p>Deler av arbeidet er med i kontrakten.</p>',
    });
    await vi.waitFor(() => expect(kontroll.letter).not.toBeNull());
    kontroll.cancel();
    await expect(sending).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
