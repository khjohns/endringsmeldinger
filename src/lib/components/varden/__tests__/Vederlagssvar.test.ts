/**
 * Spørsmålet om varselet etter punkt 34.1.2 i byggherrens svar på vederlagskravet (#1842), med
 * kjernen i minnet. Kilden er OV-U15 og D-6 i BF-14. Svikt er kontrollsaken.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import { regnUtSvar } from '#kjerne/frosset/utregning.ts';
import { kravposterI } from '#kjerne/spor/vederlag/format.ts';
import {
  MERKING,
  SAK,
  linje,
  medGrunnlag,
  medVederlag,
  opprettet,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Vederlagssvar from '#lib/components/varden/Vederlagssvar.svelte';

const svikt = skrevet(
  skrevet([opprettet], 'TE', {
    type: 'krav',
    spor: 'forhold',
    innhold: {
      hovedkategori: 'svikt',
      underkategori: 'grunnforhold',
      klar_over_forholdet: '2026-10-01',
    },
    utdypning: 'Leire der rapporten sa fjell.',
  }),
  'TE',
  {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 250000 }],
    },
    utdypning: 'Tilbudet gjelder pumpingen.',
  }
);

// Irregulær endring der byggherren har avslått forholdet, og totalentreprenøren så krever vederlag.
const avslaatt = skrevet(
  skrevet(medGrunnlag, 'BH', {
    type: 'brev',
    svar: [
      {
        spor: 'forhold',
        gjelder: utledJournal(medGrunnlag, KJERNE).spor.forhold.gjeldendeKrav!.id,
        regelversjon: KJERNE.regler.versjon,
        vurderinger: { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
        resultat: {},
        utdypning: 'Svaret på forholdet.',
      },
    ],
  }),
  'TE',
  {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 250000 }],
    },
    utdypning: 'Tilbudet gjelder pelingen.',
  }
);

async function svarskjemaet(journal: Journalrad[]) {
  const kjernesak = lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    part: 'BH',
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part: 'BH',
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      catenda_lenke: null,
      sakskode: null,
      kontraktsforkortelse: null,
      kan_foreslaa_sakskode: false,
      merking: MERKING,
    }),
  });
  await kjernesak.last();
  const sendt: TilBrevkontrollen[] = [];
  render(Vederlagssvar, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const radio = (navn: string) => fireEvent.click(screen.getByRole('radio', { name: navn }));
const godkjennHele = async () => {
  await radio('Godkjenner fast sum (punkt\u00a034.2.1)');
  await radio('Hele beløpet');
};
const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
const spoersmaalet = () => screen.queryByRole('group', { name: 'Kom varselet om kravet i tide?' });
const vurderingen = (sendt: { kommando: Record<string, unknown> }[]) =>
  (sendt[0]!.kommando as { svar: { vurderinger: Record<string, unknown> }[] }).svar[0]!.vurderinger;

afterEach(cleanup);

describe('varselet etter punkt 34.1.2 i byggherrens svar (#1842)', () => {
  it('ved endring etter punkt 34.1.1 spør skjemaet ikke om varselet, og brevet kan lages uten svaret (OV-U15, D-6)', async () => {
    const sendt = await svarskjemaet(medVederlag);
    expect(spoersmaalet()).toBeNull();
    await godkjennHele();
    await seBrevet();
    expect(screen.queryByText('Velg om varselet kom i tide.')).toBeNull();
    expect(sendt).toHaveLength(1);
    expect(vurderingen(sendt)).not.toHaveProperty('hovedkrav_varslet_i_tide');
  });

  it('ved svikt spør skjemaet om varselet, og svaret står i kommandoen (OV-U15, kontrollsak)', async () => {
    const sendt = await svarskjemaet(svikt);
    expect(spoersmaalet()).toBeInTheDocument();
    await godkjennHele();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Velg om varselet kom i tide.' })).toBeInTheDocument();
    await radio('Varslet i tide');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(vurderingen(sendt)).toMatchObject({ hovedkrav_varslet_i_tide: true });
  });

  it('ved endring etter punkt 34.1.1 med forholdet avslått står avslaget fortsatt under «Gjelder hvis» i skjemaet (OV-U33, OV-U15)', async () => {
    await svarskjemaet(avslaatt);
    expect(spoersmaalet()).toBeNull();
    const gjelderHvis = document.querySelector('[id$="-form-P1-forutsetninger"]');
    expect(gjelderHvis?.textContent).toMatch(/avslaget av forholdet i brev 2/);
  });
});

describe('det som mangler, er det kjernen sier er påkrevd og ubesvart (#2025)', () => {
  const manglene = () =>
    within(screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' }))
      .getAllByRole('link')
      .map((l) => l.textContent);

  it('uten noe besvart står varselet, oppgjørsformen og beløpet (punkt 34.1.2, 34.2.2 og KA-U66)', async () => {
    await svarskjemaet(svikt);
    await seBrevet();
    expect(manglene()).toEqual([
      'Velg om varselet kom i tide.',
      'Velg om du godkjenner fast sum (punkt\u00a034.2.1).',
      'Velg hvor mye av beløpet du godkjenner.',
    ]);
  });

  it('en delvis godkjenning uten beløpet ber om beløpet du godkjenner (KA-U42)', async () => {
    await svarskjemaet(svikt);
    await radio('Varslet i tide');
    await radio('Godkjenner fast sum (punkt\u00a034.2.1)');
    await radio('Deler av beløpet');
    await seBrevet();
    expect(manglene()).toEqual(['Skriv beløpet du godkjenner.']);
  });

  it('lenken til en lukket kravpost åpner den og fokuserer valggruppen (#2183)', async () => {
    const journal = skrevet(svikt.slice(0, -1), 'TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: {
        kravposter: [
          { beskrivelse: 'Pumping', oppgjoersform: 'tilbud', beloep: 250000 },
          { beskrivelse: 'Peling', oppgjoersform: 'tilbud', beloep: 100000 },
        ],
      },
      utdypning: 'Tilbud om pumping og peling.',
    });
    await svarskjemaet(journal);
    await seBrevet();
    const lenke = screen.getByRole('link', { name: /^P2: Velg om du godkjenner fast sum/ });
    const id = lenke.getAttribute('href')!.slice(1);
    expect(document.getElementById(id)).toBeNull();
    await fireEvent.click(lenke);
    expect(document.getElementById(id)).toHaveFocus();
    // Ringen gjelder fokuset fra lista, ikke et klikk i gruppen (review av #2205).
    await vi.waitFor(() => expect(document.getElementById(id)).toHaveAttribute('data-fra-lista'));
    document.getElementById(id)!.blur();
    expect(document.getElementById(id)).not.toHaveAttribute('data-fra-lista');
  });
});

describe('vilkåret i punktene ved skjemaet (#2182, svar B 19.11)', () => {
  it('standpunktene etter innsigelsen om varselet begynner med vilkåret i klarspråk, uten lagnavnet fra brevet', async () => {
    await svarskjemaet(svikt);
    await radio('Varslet for sent');
    await godkjennHele();
    const punktene = screen.getByRole('region', { name: 'Punktene i brevet' });
    const linjer = [...punktene.querySelectorAll('.punktstatus')].map((p) =>
      [...p.children].map((c) => c.textContent!.replaceAll('\u00a0', ' '))
    );
    const vilkaaret =
      'Hvis innsigelsen om at varselet etter punkt 34.1.2 kom for sent ikke fører frem';
    expect(linjer.slice(0, 3)).toEqual([
      ['Du gjør gjeldende at varselet etter punkt 34.1.2 kom for sent'],
      [vilkaaret, 'Du godkjenner oppgjørsformen totalentreprenøren krever'],
      [vilkaaret, 'Vederlagsjustering: du godkjenner 250 000 kr av 250 000 kr'],
    ]);
    expect(punktene.textContent).not.toMatch(/Prinsipalt|Subsidiært/);
  });
});

describe('innsigelsen mot varselet for kravposten fra et tidligere svar (VS-U77 punkt 9, 10 og 12, #2177, #2309)', () => {
  /**
   * Byggherren har gjort gjeldende i brev 3 at varselet for kravposten kom for sent, og
   * totalentreprenøren har sendt et nytt krav med samme kravpost.
   */
  const etterInnsigelsen = (post: Record<string, unknown>, svaret: Record<string, unknown>) => {
    const krav = (id?: string) => ({
      type: 'krav',
      spor: 'vederlag',
      innhold: { kravposter: [{ ...(id ? { id } : {}), beskrivelse: 'Pumping', ...post }] },
      utdypning: 'Kravet.',
    });
    const medKrav = skrevet(medGrunnlag, 'TE', krav());
    const u = utledJournal(medKrav, KJERNE);
    const k = u.spor.vederlag.gjeldendeKrav!;
    const id = kravposterI(k)[0]!.id;
    const vurderinger = { kravposter: [{ gjelder: id, ...svaret }] };
    const r = regnUtSvar(
      'vederlag',
      vurderinger,
      { krav: k, paaberopelse: u.spor.forhold.gjeldendeKrav },
      KJERNE.regler
    );
    const medSvaret = skrevet(medKrav, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: k.id,
          regelversjon: KJERNE.regler.versjon,
          vurderinger,
          resultat: { resultat: r.resultat, godkjent_beloep: r.godkjent_beloep },
        },
      ],
    });
    return skrevet(medSvaret, 'TE', krav(id));
  };
  const regning = { oppgjoersform: 'regningsarbeid' };
  const justert = { oppgjoersform: 'enhetspriser', justert: true };
  const varselet = () => document.querySelector('[id$="-varsel-P1-standpunkt"]')?.textContent;
  const punktene = () =>
    screen.getByRole('region', { name: 'Punktene i brevet' }).textContent ?? '';
  const postvurderingen = (sendt: TilBrevkontrollen[]) =>
    (vurderingen(sendt).kravposter as Record<string, unknown>[])[0];

  it('etter punkt 34.4 sier skjemaet at innsigelsen står, og svaret gjentar den', async () => {
    const sendt = await svarskjemaet(
      etterInnsigelsen(regning, { aksepterer: true, varslet_i_tide: false })
    );
    expect(varselet()).toContain(
      'Du har gjort gjeldende i brev 3 at varselet ikke ble gitt eller kom for sent. Svaret gjentar innsigelsen.'
    );
    expect(screen.queryByText('Ingen innsigelse.')).toBeNull();
    await radio('Godtar regningsarbeid (punkt 34.4)');
    await seBrevet();
    expect(postvurderingen(sendt)).toMatchObject({ varslet_i_tide: false });
  });

  it('etter punkt 34.4 kan byggherren gi opp innsigelsen, og svaret sier «i tide»', async () => {
    const sendt = await svarskjemaet(
      etterInnsigelsen(regning, { aksepterer: true, varslet_i_tide: false })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Gi opp innsigelsen' }));
    expect(varselet()).toContain('Du gir opp innsigelsen.');
    await radio('Godtar regningsarbeid (punkt 34.4)');
    // Panelet bruker samme ord som brevet (oppdragsgiver 24.11 i #2314).
    expect(punktene()).toContain(
      'Du gir opp innsigelsen i brev 3 om at varselet etter punkt\u00a034.4 ikke ble gitt eller kom for sent'
    );
    await seBrevet();
    expect(postvurderingen(sendt)).toMatchObject({ varslet_i_tide: true });
  });

  it('etter punkt 34.4 uten en innsigelse fra før er skjemaet som før (kontrollsak)', async () => {
    await svarskjemaet(etterInnsigelsen(regning, { aksepterer: true }));
    expect(varselet()).toContain('Ingen innsigelse.');
    expect(screen.queryByRole('button', { name: 'Gi opp innsigelsen' })).toBeNull();
  });

  it('etter punkt 34.3.3 står innsigelsen som en setning, ikke som valg uten forhåndsvalg', async () => {
    const sendt = await svarskjemaet(
      etterInnsigelsen(justert, {
        aksepterer: true,
        varslet_i_tide: false,
        godtar_justering: true,
      })
    );
    expect(
      screen.queryByRole('group', {
        name: 'Valgfri Varselet om justering av enhetsprisene (punkt 34.3.3)',
      })
    ).toBeNull();
    expect(varselet()).toContain(
      'Du har gjort gjeldende i brev 3 at varselet kom for sent. Svaret gjentar innsigelsen.'
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Gi opp innsigelsen' }));
    await radio('Godtar enhetspriser (punkt 34.3)');
    await radio('Godtar justeringen');
    expect(punktene()).toContain(
      'Du gir opp innsigelsen i brev 3 om at varselet etter punkt\u00a034.3.3 kom for sent'
    );
    expect(punktene()).not.toContain('kom i tide');
    await seBrevet();
    expect(postvurderingen(sendt)).toMatchObject({ varslet_i_tide: true });
  });

  it('etter punkt 34.3.3 etter «i tide» er valget som før, med det tidligere standpunktet som hjelpetekst', async () => {
    await svarskjemaet(
      etterInnsigelsen(justert, {
        aksepterer: true,
        varslet_i_tide: true,
        godtar_justering: true,
      })
    );
    expect(screen.getByText('Du har sagt i brev 3 at varselet kom i tide.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Kom i tide' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Kom for sent' })).not.toBeChecked();
  });
});
