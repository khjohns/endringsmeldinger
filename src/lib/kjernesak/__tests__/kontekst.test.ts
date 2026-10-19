/**
 * Sakskonteksten for en TS-sak (#663): journalen hentes, og visningen, handlingene
 * og den låste brevteksten regnes lokalt av kjernen. Serveren er erstattet av
 * falske `hent` og `send`; at serveren avgjør, prøves i `sprakprove/tester/server.test.ts`.
 */

import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/client';
import type { Journallinje, Kjernesak } from '$lib/api/kjerne';
import { brevhindring, lagKjernesak, PROGRAMFEIL } from '$lib/kjernesak/kontekst.svelte';
import { forhaandsvis, laastTekst, utledJournal } from '$kjerne/kommandoer/skriving';
import { handlinger } from '$kjerne/kommandoer/handlinger';
import { visning, type Visning } from '$kjerne/utledning/visning';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad } from '$kjerne/typer';

const SAK = 'sak-1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const opprettet: Journalrad = {
  event_id: 'e-1',
  sak_id: SAK,
  event_type: 'sak_opprettet',
  versjon: 1,
  tidsstempel: '2026-10-16T08:00:00.000Z',
  aktor_id: 'te',
  aktor_rolle: 'TE',
  aktor_team_id: null,
  refererer_til_event_id: null,
  format: 1,
  data: { sakstittel: 'Ny peling', sakstype: 'standard' },
};

const grunnlagskrav = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Ny peling',
    paalegg_mottatt: '2026-10-01',
  },
};

const kontekst = {
  sakId: SAK,
  aktoerId: 'te',
  part: 'TE' as const,
  teamId: null,
  tidspunkt: () => new Date('2026-10-16T09:00:00.000Z'),
  nyId: () => crypto.randomUUID(),
};

/** Raden kjernen selv skriver for kommandoen, som versjonen etter `journal`. */
function skrevet(kommando: unknown, journal: Journalrad[]): Journalrad {
  const utfall = forhaandsvis(kommando, kontekst, journal, KJERNE);
  if (!utfall.godtatt) throw new Error(`Kjernen avviste kommandoen: ${utfall.avvisning.melding}`);
  return { ...utfall.hendelser[0], versjon: journal.length + 1 };
}

const linje = ({
  event_id,
  versjon,
  event_type,
  tidsstempel,
  aktor_rolle,
  format,
  data,
}: Journalrad): Journallinje => ({
  event_id,
  versjon,
  event_type,
  tidsstempel,
  aktor_rolle,
  format,
  data,
});

/** Svaret fra serveren, med en visning kjernen aldri lager, så det synes om konteksten leser den. */
const svar = (journal: Journalrad[], part: Kjernesak['part'] = null): Kjernesak => ({
  versjon: journal.at(-1)!.versjon,
  part,
  visning: { status: { kode: 'fra_serveren', tekst: 'Fra serveren' } } as unknown as Visning,
  journal: journal.map(linje),
  leveringsoppdrag: [],
});

describe('sakskonteksten for en TS-sak', () => {
  it('regner visningen og versjonen av journalen, ikke av visningen i svaret', async () => {
    const journal = [opprettet, skrevet(grunnlagskrav, [opprettet])];
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'TE',
      hent: async () => svar(journal),
    });
    await sak.last();
    expect(sak.versjon).toBe(2);
    expect(sak.visning).toEqual(visning(utledJournal(journal, KJERNE), KJERNE.regler));
    expect(sak.visning?.status.tekst).not.toBe('Fra serveren');
  });

  it('tilbyr parten det kjernen tilbyr for journalen, og svaret tilbys BH etter kravet (INV-MM-1)', async () => {
    const journal = [opprettet, skrevet(grunnlagskrav, [opprettet])];
    const u = utledJournal(journal, KJERNE);
    const te = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'TE',
      hent: async () => svar(journal),
    });
    const bh = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'BH',
      hent: async () => svar(journal),
    });
    await Promise.all([te.last(), bh.last()]);
    expect(te.handlinger).toEqual(handlinger(u, 'TE'));
    expect(bh.handlinger).toEqual(handlinger(u, 'BH'));
    expect(bh.handlinger).toContain('svare:grunnlag');
    expect(te.handlinger).not.toContain('svare:grunnlag');
  });

  it('bruker leserens side fra serveren når ruta ikke oppgir en (#705)', async () => {
    const journal = [opprettet, skrevet(grunnlagskrav, [opprettet])];
    const te = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar(journal, 'TE'),
    });
    const uten = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar(journal, null),
    });
    expect(te.part).toBeNull();
    await Promise.all([te.last(), uten.last()]);
    expect(te.part).toBe('TE');
    expect(te.handlinger).toContain('krav:vederlag');
    expect(uten.handlinger).toEqual([]);
  });

  it('tilbyr ingen handling og lager ingen brevtekst uten kontraktsside', async () => {
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: null,
      hent: async () => svar([opprettet]),
    });
    await sak.last();
    expect(sak.visning).not.toBeNull();
    expect(sak.handlinger).toEqual([]);
    expect(sak.brev(grunnlagskrav)).toBeNull();
  });

  it('sender den låste teksten kjernen lager, med versjonen som er lastet (LV-U2)', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-2', leveringsoppdrag: 'l-1', versjon: 2 });
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'TE',
      hent: async () => svar([opprettet]),
      send,
    });
    await sak.last();
    const forventet = laastTekst(skrevet(grunnlagskrav, [opprettet]));
    expect(forventet?.length).toBeGreaterThan(0);

    expect(await sak.send(grunnlagskrav)).toBe(true);
    expect(send).toHaveBeenCalledWith(
      SAK,
      1,
      expect.stringMatching(UUID),
      { ...grunnlagskrav, brevtekst: forventet },
      'p-1'
    );
  });

  it('sender kommandoen til prosjektet saken ble lest i', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-2', leveringsoppdrag: 'l-1', versjon: 2 });
    const hent = vi.fn(async () => svar([opprettet]));
    const sak = lagKjernesak({ sakId: SAK, prosjektId: 'p-2', part: 'TE', hent, send });
    await sak.last();

    expect(await sak.send(grunnlagskrav)).toBe(true);
    expect(hent).toHaveBeenCalledWith(SAK, 'p-2');
    expect(send).toHaveBeenCalledWith(SAK, 1, expect.anything(), expect.anything(), 'p-2');
  });

  it('laster saken på nytt ved versjonskonflikt og lar meldingen stå', async () => {
    let journal = [opprettet];
    const hent = vi.fn(async () => svar(journal));
    const send = vi.fn(async () => {
      journal = [opprettet, skrevet(grunnlagskrav, [opprettet])];
      throw new ApiError(409, 'Saken er endret. Last den inn på nytt.');
    });
    const sak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', part: 'TE', hent, send });
    await sak.last();

    expect(await sak.send(grunnlagskrav)).toBe(false);
    expect(hent).toHaveBeenCalledTimes(2);
    expect(sak.versjon).toBe(2);
    expect(sak.feil).toBe('Brevet ble ikke sendt. Saken er endret. Last den inn på nytt.');
    expect(sak.sender).toBe(false);
  });

  it('laster ikke saken på nytt når serveren avviser kommandoen av en annen grunn', async () => {
    const hent = vi.fn(async () => svar([opprettet]));
    const send = vi.fn(async () => {
      throw new ApiError(400, 'Grunnlaget er allerede krevd.');
    });
    const sak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', part: 'TE', hent, send });
    await sak.last();

    expect(await sak.send(grunnlagskrav)).toBe(false);
    expect(hent).toHaveBeenCalledTimes(1);
    expect(sak.feil).toBe('Brevet ble ikke sendt. Grunnlaget er allerede krevd.');
  });

  it('sier at saken finnes når serveren svarer, og bygger saksbildet av journalen', async () => {
    const hent = vi.fn(async () => svar([opprettet]));
    const sak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', part: null, hent });
    expect(sak.finnes).toBeNull();
    await sak.last();
    expect(hent).toHaveBeenCalledWith(SAK, 'p-1');
    expect(sak.finnes).toBe(true);
    expect(sak.saksbilde?.status.tekst).not.toBe('Fra serveren');
    expect(sak.saksbilde?.journal.map((j) => j.versjon)).toEqual([1]);
  });

  // Kilde: invariant 4 i 2.3 i hovedplanen og #418: et nytt forsøk sender samme kommando-ID.
  it('når svaret går tapt, sender «Prøv igjen» samme kommando med samme ID og versjon, og saken lastes etter kvitteringen (#418)', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(0, 'Network error: Could not connect to server'))
      .mockResolvedValueOnce({ event_id: 'e-2', leveringsoppdrag: 'l-1', versjon: 2 });
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar([opprettet]))
      .mockResolvedValueOnce(svar([opprettet, skrevet(grunnlagskrav, [opprettet])]));
    const sak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', part: 'TE', hent, send });
    await sak.last();

    expect(await sak.send(grunnlagskrav)).toBe(false);
    expect(sak.feil).toBe(
      'Det er usikkert om brevet ble lagret. Prøv igjen: det lagres ikke to ganger.'
    );
    expect(sak.ventende).not.toBeNull();
    expect(await sak.provIgjen()).toBe(true);
    expect(send.mock.calls[0][2]).toMatch(UUID);
    expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
    expect(sak.ventende).toBeNull();
    expect(sak.versjon).toBe(2);
    expect(await sak.provIgjen()).toBe(false);
  });

  // Kilde: #418, og oppdragsgiver 19.10 i #816: serveren avgjør. `UTFALL_USIKKERT` og en
  // 5xx uten kode er usikre; en annen kode er sikker, og feilen vises.
  it('ved UTFALL_USIKKERT og en 5xx uten kode får samme kommando samme ID; en annen kommando får en ny, og en avvisning eller en 5xx med en annen kode fjerner den ventende (#418, #816)', async () => {
    const usikkert = new ApiError(503, 'Usikkert.', { error: 'UTFALL_USIKKERT' });
    const send = vi
      .fn()
      .mockRejectedValueOnce(usikkert)
      .mockRejectedValueOnce(usikkert)
      .mockRejectedValueOnce(new ApiError(400, 'Kravet er avvist.'))
      .mockRejectedValueOnce(
        new ApiError(503, 'Tilgang kunne ikke bekreftes.', { error: 'ACCESS_UNAVAILABLE' })
      )
      .mockRejectedValueOnce(new ApiError(504, 'Gateway Timeout'))
      .mockRejectedValueOnce(new ApiError(500, 'Uventet feil.', { error: 'INTERNAL_ERROR' }));
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'TE',
      hent: async () => svar([opprettet]),
      send,
    });
    await sak.last();

    await sak.send(grunnlagskrav);
    await sak.send(grunnlagskrav);
    expect(send.mock.calls[1][2]).toBe(send.mock.calls[0][2]);
    await sak.send({ ...grunnlagskrav, utdypning: 'En annen utdypning.' });
    expect(send.mock.calls[2][2]).not.toBe(send.mock.calls[0][2]);
    expect(sak.ventende).toBeNull();
    expect(sak.feil).toBe('Brevet ble ikke sendt. Kravet er avvist.');
    // Tilgangskontrollen svarer før kommandoen er kjørt (server/autorisasjon.ts).
    await sak.send(grunnlagskrav);
    expect(sak.ventende).toBeNull();
    expect(sak.feil).toBe('Brevet ble ikke sendt. Tilgang kunne ikke bekreftes.');
    // En proxy kan svare mens serveren skriver.
    await sak.send(grunnlagskrav);
    expect(sak.ventende).not.toBeNull();
    const id = send.mock.calls[4][2];
    // Serveren svarer med en kode før skrivingen har begynt.
    await sak.send(grunnlagskrav);
    expect(send.mock.calls[5][2]).toBe(id);
    expect(sak.ventende).toBeNull();
    expect(sak.feil).toBe('Brevet ble ikke sendt. Uventet feil.');
  });

  it('sier at saken ikke finnes i TS når serveren svarer 404', async () => {
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: null,
      hent: async () => {
        throw new ApiError(404, 'Saken finnes ikke.');
      },
    });
    await sak.last();
    expect(sak.finnes).toBe(false);
    expect(sak.saksbilde).toBeNull();
  });

  it('lar det være uavgjort om saken finnes når serveren svarer med en annen feil', async () => {
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: null,
      hent: async () => {
        throw new ApiError(503, 'Catenda svarte ikke.');
      },
    });
    await sak.last();
    expect(sak.finnes).toBeNull();
    expect(sak.feil).toBe('Catenda svarte ikke.');
  });

  // Kilde: #695 p1. Bare det siste kallet skriver saken.
  it('et eldre svar som kommer sist, overskriver ikke saken fra et nyere kall', async () => {
    const nyere = [opprettet, skrevet(grunnlagskrav, [opprettet])];
    let slipp: (k: Kjernesak) => void = () => {};
    const hent = vi
      .fn()
      .mockReturnValueOnce(new Promise<Kjernesak>((r) => (slipp = r)))
      .mockResolvedValueOnce(svar(nyere));
    const sak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', part: 'TE', hent });
    const foerste = sak.last();
    expect(await sak.last()).toBe(true);
    slipp(svar([opprettet]));
    expect(await foerste).toBe(true);
    expect(sak.versjon).toBe(2);
  });

  // Kilde: #695 p2 og #719 p6, p7 og p12.
  it('en 404 på lastingen etter sendingen beholder saken, sier at den er utdatert, og en vellykket lasting fjerner meldingen', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-2', leveringsoppdrag: 'l-1', versjon: 2 });
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar([opprettet]))
      .mockRejectedValueOnce(new ApiError(404, 'Saken finnes ikke.'))
      .mockResolvedValueOnce(svar([opprettet, skrevet(grunnlagskrav, [opprettet])]));
    const sak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', part: 'TE', hent, send });
    await sak.last();

    expect(await sak.send(grunnlagskrav)).toBe(true);
    expect(sak.finnes).toBe(true);
    expect(sak.utdatert).toBe(true);
    expect(sak.versjon).toBe(1);
    expect(sak.feil).toBe(
      'Brevet er lagret, men saken kunne ikke lastes på nytt. Saken finnes ikke.'
    );

    expect(await sak.last()).toBe(true);
    expect(sak.utdatert).toBe(false);
    expect(sak.feil).toBeNull();
    expect(sak.versjon).toBe(2);
  });

  // Kilde: #719 p9. Hodet i saksrommet viser til årsaken i Kontrollrommet.
  it('etter Avbryt er feilen fra en avvist sending borte, men årsaken til at saken er utdatert står (#719 p9)', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ event_id: 'e-2', leveringsoppdrag: 'l-1', versjon: 2 })
      .mockRejectedValueOnce(new ApiError(400, 'Beløpet er ikke gyldig.'));
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar([opprettet]))
      .mockRejectedValueOnce(new ApiError(404, 'Saken finnes ikke.'));
    const sak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', part: 'TE', hent, send });
    await sak.last();
    expect(await sak.send(grunnlagskrav)).toBe(true);

    sak.fjernFeil();
    expect(sak.feil).toBe(
      'Brevet er lagret, men saken kunne ikke lastes på nytt. Saken finnes ikke.'
    );

    expect(await sak.send(grunnlagskrav)).toBe(false);
    expect(sak.feil).toBe('Brevet ble ikke sendt. Beløpet er ikke gyldig.');
    sak.fjernFeil();
    expect(sak.utdatert).toBe(true);
    expect(sak.feil).toBe(
      'Brevet er lagret, men saken kunne ikke lastes på nytt. Saken finnes ikke.'
    );
  });

  // Kilde: #695 p3. En avvisning fra kjernen sendes ikke; serveren ville avvist den.
  it('sender ikke en kommando kjernen avviser, og sier hvorfor', async () => {
    const send = vi.fn();
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'BH',
      hent: async () => svar([opprettet]),
      send,
    });
    await sak.last();
    expect(await sak.send(grunnlagskrav)).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(sak.feil).toMatch(/^Brevet ble ikke sendt\. ./);
  });

  // Kilde: #865 p2. Kalleren får avvisningen fra kjernen, ikke `null`.
  it('gir avvisningen fra kjernen som brev, med meldingen kalleren viser', async () => {
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'BH',
      hent: async () => svar([opprettet]),
    });
    await sak.last();
    const brev = sak.brev(grunnlagskrav);
    expect(brev).toMatchObject({ avvisning: { melding: expect.any(String) } });
    expect(brevhindring(brev!)).toBe(
      `Brevet ble ikke sendt. ${(brev as { avvisning: { melding: string } }).avvisning.melding}`
    );
  });

  // Kilde: #865 p1. En programfeil i kjernen blir en melding om feil i appen, ikke en
  // avvisning, og visningen som leser brevet, velter ikke.
  it('gjør en programfeil i kjernen til en melding om feil i appen, og sender ikke', async () => {
    let kast = false;
    const kjerne = {
      ...KJERNE,
      get regler() {
        if (kast) throw new Error('programfeil');
        return KJERNE.regler;
      },
    };
    const send = vi.fn();
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'TE',
      hent: async () => svar([opprettet]),
      send,
      kjerne,
    });
    await sak.last();
    kast = true;
    const feil = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(sak.brev(grunnlagskrav)).toEqual({ programfeil: PROGRAMFEIL });
    expect(await sak.send(grunnlagskrav)).toBe(false);
    expect(sak.feil).toBe(PROGRAMFEIL);
    expect(send).not.toHaveBeenCalled();
    feil.mockRestore();
  });

  // Kilde: #737 p2. Kalleren skal ikke vise en gammel melding.
  it('sier hvorfor når saken ikke er lastet, eller når et brev alt sendes', async () => {
    let slipp: () => void = () => {};
    const send = vi.fn(() => new Promise<never>((_, avvis) => (slipp = () => avvis(new Error()))));
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'TE',
      hent: async () => svar([opprettet]),
      send,
    });
    expect(await sak.send(grunnlagskrav)).toBe(false);
    expect(sak.feil).toBe('Saken er ikke lastet. Last den på nytt og prøv igjen.');

    await sak.last();
    const foerste = sak.send(grunnlagskrav);
    expect(await sak.send(grunnlagskrav)).toBe(false);
    expect(sak.feil).toBe('Et brev sendes allerede. Vent til det er ferdig.');
    slipp();
    await foerste;
  });

  // Kilde: #816 p3. Uten meldingen står «Prøv igjen» alene.
  it('meldingen om et usikkert utfall står etter en ny lasting så lenge kommandoen venter', async () => {
    const send = vi.fn().mockRejectedValue(new ApiError(0, 'Network error'));
    const sak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part: 'TE',
      hent: async () => svar([opprettet]),
      send,
    });
    await sak.last();
    await sak.send(grunnlagskrav);
    await sak.last();
    expect(sak.ventende).not.toBeNull();
    expect(sak.feil).toBe(
      'Det er usikkert om brevet ble lagret. Prøv igjen: det lagres ikke to ganger.'
    );
  });
});
