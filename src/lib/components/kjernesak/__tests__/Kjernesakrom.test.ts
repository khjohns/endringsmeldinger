/**
 * TS-saken i Kontrollrommet (FK-8b, #718), med den ekte sakskonteksten og en falsk
 * `hent`. Kildene er avgjørelsene 17.10 i #718: det kjernen ennå ikke kan, vises
 * ikke (OV-U1), byggherrens svar vises bare som at svar finnes, saksstatusen er
 * `visning.status`, rollen er leserens side fra serveren (#705), og journalen
 * vises med den låste teksten (LV-U2) og merknadene (MM-U2).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import type { Journallinje, Kjernesak } from '$lib/api/kjerne';
import { lagKjernesak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
import { lagKjernesakflate } from '$lib/kjernesak/arbeidsflate.svelte';
import { kandidater } from '$kjerne/kommandoer/handlinger';
import { noekkel } from '$kjerne/kommandoer/forutsetninger';
import type { Journalrad, Part } from '$kjerne/typer';
import Kjernesakrom from '../Kjernesakrom.svelte';
import type { Mode, SporKey } from '$lib/components/kontraktsbord/types';
import {
  SAK,
  medFristvarsel,
  medGrunnlag,
  medSvar,
  medTrukketVederlag,
  medUkjentHendelse,
  medVederlag,
  medVederlagssvar,
} from '$lib/kjernesak/__tests__/provejournal';

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
  leveringsoppdrag: [
    {
      id: 'l-1',
      event_id: journal[1].event_id,
      dokumentnoekkel: 'brev-2',
      filnavn: 'krav.pdf',
      innhold_sha256: '0'.repeat(64),
      opprettet: '2026-10-16T09:00:01.000Z',
      levert: null,
    },
  ],
});

/** Konteksten med handlingene i `handlinger` i stedet for dem kjernen regner ut. */
const medHandlinger = (k: Kjernesakkontekst, handlinger: string[]): Kjernesakkontekst =>
  new Proxy(k, { get: (t, p) => (p === 'handlinger' ? handlinger : Reflect.get(t, p)) });

async function vis(
  journal: Journalrad[],
  part: Part | null,
  track: SporKey = 'ansvar',
  mode: Mode = 'read',
  handlinger?: string[]
) {
  const ekte = lagKjernesak({ sakId: SAK, hent: async () => svar(journal, part) });
  await ekte.last();
  const kjernesak = handlinger ? medHandlinger(ekte, handlinger) : ekte;
  render(Kjernesakrom, {
    kjernesak,
    projectId: 'p-1',
    view: { track, mode, role: 'TE' },
    onviewchange: () => {},
    onnewcase: () => {},
  });
  return kjernesak;
}

const fetchSpion = vi.fn();
beforeEach(() => {
  fetchSpion.mockReset().mockRejectedValue(new Error('Ingen nettverkskall i prøven.'));
  vi.stubGlobal('fetch', fetchSpion);
});
afterEach(() => vi.unstubAllGlobals());

describe('TS-saken i Kontrollrommet', () => {
  it('venstrekolonnen viser tittelen, kjernens statustekst og kravene per spor', async () => {
    const kjernesak = await vis(medGrunnlag, 'TE');
    expect(screen.getByRole('heading', { name: 'Ny peling' })).toBeInTheDocument();
    expect(screen.getByText(`Saksstatus: ${kjernesak.visning!.status.tekst}`)).toBeInTheDocument();
    const spor = within(screen.getByRole('navigation', { name: 'Sakens spor' }));
    expect(spor.getByRole('button', { name: /Grunnlag/ })).toHaveTextContent('Ikke vurdert');
    expect(spor.getByRole('button', { name: /Vederlag/ })).toBeInTheDocument();
  });

  // Kilde: #719 p5: etter et lagret brev og en mislykket lasting har saksbildet en vei videre.
  it('når brevet er lagret, men saken ikke er lastet på nytt, kan saken lastes fra rommet', async () => {
    let lastet = 0;
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar(medGrunnlag, 'TE'))
      .mockImplementation(async () => {
        lastet++;
        return svar(medGrunnlag, 'TE');
      });
    const ekte = lagKjernesak({ sakId: SAK, hent });
    await ekte.last();
    const kjernesak = new Proxy(ekte, {
      get: (t, p) => (p === 'utdatert' ? lastet === 0 : Reflect.get(t, p)),
    });
    render(Kjernesakrom, {
      kjernesak,
      projectId: 'p-1',
      view: { track: 'ansvar', mode: 'read', role: 'TE' },
      onviewchange: () => {},
      onnewcase: () => {},
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saken som vises, er ikke oppdatert etter det siste brevet.'
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Last saken på nytt' }));
    expect(lastet).toBe(1);
  });

  it('byggherrens svar vises bare som at svar finnes (oppdragsgiver 17.10)', async () => {
    await vis(medSvar, 'TE');
    const spor = within(screen.getByRole('navigation', { name: 'Sakens spor' }));
    expect(spor.getByRole('button', { name: /Grunnlag/ })).toHaveTextContent('BH har svart');
    expect(spor.getByRole('button', { name: /Grunnlag/ })).not.toHaveTextContent(/godkjent/i);
    expect(screen.getAllByText('Byggherre har svart').length).toBeGreaterThan(0);
  });

  it('et besvart vederlagskrav står som besvart og ikke som uavklart (oppdragsgiver 17.10)', async () => {
    await vis(medVederlag, 'TE');
    expect(screen.getByText('250 000 kr')).toBeInTheDocument();
    cleanup();

    await vis(medVederlagssvar, 'TE', 'vederlag');
    const spor = within(screen.getByRole('navigation', { name: 'Sakens spor' }));
    expect(spor.getByRole('button', { name: /Vederlag/ })).toHaveTextContent('BH har svart');
    expect(screen.queryByText('250 000 kr')).toBeNull();
    // Vederlagsoversikten i midtkolonnen sier ikke at byggherren ikke har vurdert kravet.
    expect(screen.queryByText(/ikke registrert noen beløpsvurdering/)).toBeNull();
    expect(screen.getAllByText('Byggherre har svart', { exact: false }).length).toBeGreaterThan(0);
  });

  it('et registrert fristvarsel vises som varslet, ikke som «Ikke varslet» (§ 33.4)', async () => {
    await vis(medFristvarsel, 'TE', 'frist');
    const spor = within(screen.getByRole('navigation', { name: 'Sakens spor' }));
    expect(spor.getByRole('button', { name: /Fristforlengelse/ })).toHaveTextContent(
      'Varslet – ikke spesifisert'
    );
    // Handlingslinjen sier det samme, ikke «Ingen krav».
    expect(screen.queryByText('Ingen krav')).toBeNull();
  });

  it.each([['TE'], ['BH']] as const)(
    'det kjernen ennå ikke kan, vises ikke for %s (OV-U1)',
    async (part) => {
      await vis(medSvar, part);
      expect(screen.queryByText('Brev og intern godkjenning')).toBeNull();
      expect(screen.queryByRole('button', { name: /Trekk/ })).toBeNull();
      for (const navn of [/Oppdater/, /Svar på/, /Fortsett/, /Send fristvarsel/, /Spesifiser/])
        expect(screen.queryByRole('button', { name: navn })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Vedlegg' })).toBeNull();
      // Rollen er leserens side og kan ikke byttes.
      expect(screen.queryByRole('group', { name: 'Vis som' })).toBeNull();
      expect(
        screen.getByText(part === 'BH' ? 'Byggherre BH' : 'Entreprenør TE')
      ).toBeInTheDocument();
      // Verken godkjenningene, endringsordrene eller vedleggene hentes fra Python.
      expect(fetchSpion).not.toHaveBeenCalled();
    }
  );

  it('Historikk viser journalen med den låste teksten, utdypningen og leveringsoppdraget', async () => {
    await vis(medGrunnlag, 'TE');
    await fireEvent.click(screen.getByRole('button', { name: 'Historikk' }));
    const brev = within(screen.getByTestId('journal-2'));
    expect(brev.getByText('Brev fra TE', { exact: false })).toBeInTheDocument();
    expect(brev.getByText('BH påla ny peling.')).toBeInTheDocument();
    expect(
      brev.getByText(/Leveringsoppdrag krav\.pdf: frosset .*, ikke levert ennå/)
    ).toBeInTheDocument();
  });

  it('en hendelse kjernen ikke forstår, merkes, og saken sier at den ikke kan utledes (MM-U2)', async () => {
    const kjernesak = await vis(medUkjentHendelse, 'TE');
    expect(kjernesak.visning!.status.kode).toBe('kan_ikke_utledes');
    expect(screen.getByText(`Saksstatus: ${kjernesak.visning!.status.tekst}`)).toBeInTheDocument();
    // Handlingslinjen sier heller ikke «Ingen krav» for en sak som har krav.
    expect(screen.getByText(kjernesak.visning!.status.tekst)).toBeInTheDocument();
    expect(screen.queryByText('Ingen krav')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Historikk' }));
    expect(within(screen.getByTestId('journal-3')).getByText('Ikke tolket')).toBeInTheDocument();
    for (const m of kjernesak.saksbilde!.merknader)
      expect(screen.getByText(m.tekst)).toBeInTheDocument();
  });

  // Statusfeltene i `SakState` kaster for en TS-sak (sakstilstand.ts). Ingen visning
  // leser dem: status er en etikett, og kjernens etiketter står i `visning` (#718, #313).
  it.each(
    (['TE', 'BH'] as const).flatMap((part) =>
      (['read', 'form'] as const).flatMap((mode) =>
        (['ansvar', 'vederlag', 'frist'] as const).map((track) => [part, mode, track] as const)
      )
    )
  )('Kontrollrommet leser ingen statusfelt for %s i %s på %s', async (part, mode, track) => {
    for (const journal of [
      medGrunnlag,
      medSvar,
      medVederlagssvar,
      medFristvarsel,
      medTrukketVederlag,
      medUkjentHendelse,
    ]) {
      await vis(journal, part, track, mode);
      for (const fane of ['Historikk', 'Bestemmelser'])
        await fireEvent.click(screen.getByRole('button', { name: fane }));
      cleanup();
    }
  });

  // Krav G i #718: knappene og skjemaene for en TS-sak følger bare `kjernesak.handlinger`.
  // Med alle kandidatene tilbys bare det som er bygget: det første vederlagskravet
  // (oppdragsgiver 17.10, MM-U25). Uten handlinger tilbys ingenting.
  it.each(
    (['TE', 'BH'] as const).flatMap((part) =>
      (['tom', 'full'] as const).flatMap((tabell) =>
        (
          [
            ['uten vederlagskrav', medGrunnlag],
            ['med vederlagskrav', medVederlag],
          ] as const
        ).map(([navn, journal]) => [part, tabell, navn, journal] as const)
      )
    )
  )(
    '%s med %s handlingsliste, %s: knappene og skjemaet følger handlingene',
    async (part, tabell, _navn, journal) => {
      const ekte = lagKjernesak({ sakId: SAK, hent: async () => svar(journal, part) });
      await ekte.last();
      const handlinger = tabell === 'tom' ? [] : kandidater(ekte.utledning!).map(noekkel);
      const tilbys =
        part === 'TE' &&
        handlinger.includes('krav:vederlag') &&
        ekte.utledning!.spor.vederlag.gjeldendeKrav === null;

      for (const track of ['ansvar', 'vederlag', 'frist'] as const) {
        await vis(journal, part, track, 'read', handlinger);
        const knapper = [...document.querySelectorAll('.action-buttons button')]
          .map((b) => b.textContent?.trim())
          .filter((t) => t !== 'Kontekst');
        expect(knapper).toEqual(
          tilbys && track === 'vederlag' ? ['Send krav om vederlagsjustering'] : []
        );
        cleanup();

        await vis(journal, part, track, 'form', handlinger);
        const skjema = document.querySelector('.form-content');
        if (tilbys && track === 'vederlag') {
          expect(skjema).not.toBeNull();
          expect(screen.getByRole('button', { name: 'Se brev og send' })).toBeInTheDocument();
        } else {
          expect(skjema).toBeNull();
          expect(
            screen.getByText('Dette skjemaet finnes ikke for saken ennå.')
          ).toBeInTheDocument();
          expect(screen.queryByRole('button', { name: 'Se brev og send' })).toBeNull();
        }
        cleanup();
      }
    }
  );

  // Krav E i #718: domenekonfigurasjonen leser `bh_resultat` i Python-projeksjonen, så
  // TS-saken har den ikke. Kravversjonen skjemaet bygger på, kommer fra utledningen.
  it('TS-saken har ingen domenekonfigurasjon, og kravversjonen kommer fra utledningen', async () => {
    const kjernesak = lagKjernesak({ sakId: SAK, hent: async () => svar(medVederlag, 'TE') });
    await kjernesak.last();
    const flate = lagKjernesakflate(kjernesak, 'p-1');
    for (const felt of ['vederlagDomainConfig', 'fristDomainConfig', 'grunnlagDomainConfig'])
      expect(felt in flate).toBe(false);
    expect(flate.kravversjon('vederlag')).toBe(1);
    expect(flate.kravversjon('frist')).toBe(0);
  });
});
