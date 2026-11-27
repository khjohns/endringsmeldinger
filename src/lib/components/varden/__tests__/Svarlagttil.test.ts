/**
 * Byggherrens svar på vederlaget lagt til fra korrespondansen (BF-49, OV-U80, OV-U98), med forløpet
 * BF-49 i minnet og kjernen som tar imot kommandoen: valget om varselet der innsigelsen står (U-7,
 * D-8), svaret med en tidligere dato (D-7), varselet i et eldre krav (U-15, D-15), avbruddet (U-9,
 * D-12), aksepten på dagen (D-9) og byggherrens egen endringsordre (U-13, D-11).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import type { Part } from '#kjerne/typer.ts';
import Vederlagssvar from '#lib/components/varden/Vederlagssvar.svelte';
import Forholdssvar from '#lib/components/varden/Forholdssvar.svelte';
import Korrespondanseskjema from '#lib/components/varden/Korrespondanseskjema.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import type { Korrespondansevalg } from '#lib/components/varden/korrespondansen.ts';
import { FORHOLDSSVAR, LEGG_TIL, SAKEN } from '#lib/components/varden/tekster/index.ts';

async function saken(punkt: string, part: Part) {
  const demosak = lagDemosak(finnForloep('BF-49')!, punkt, part);
  const sendt: Record<string, unknown>[] = [];
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part,
    hent: demosak.hent,
    send: async (...a: Parameters<typeof demosak.send>) => {
      sendt.push(a[3] as Record<string, unknown>);
      return demosak.send(...a);
    },
    // jsdom har ikke `File.arrayBuffer`, som demosaken regner summen av.
    lastOppVedlegg: (sak, fil, prosjekt) =>
      demosak.lastOppVedlegg(
        sak,
        Object.assign(fil, { arrayBuffer: async () => new ArrayBuffer(8) }),
        prosjekt
      ),
  });
  await kjernesak.last();
  // Dokumentet er lastet opp i demosaken, så kjernen finner det (`mellomlager`).
  const vedlegg = await kjernesak.lastOppVedlegg(
    new File(['%PDF-1.4'], 'eposten.pdf', { type: 'application/pdf' })
  );
  const eposten = (dato: string): Korrespondansevalg => ({
    type: 'e_post',
    sendemaate: null,
    dato,
    vedlegg: [vedlegg],
    beskrivelse: 'Svar på kravet om justerte enhetspriser',
  });
  return { kjernesak, sendt, eposten };
}

async function vederlagssvaret(punkt: string, dato: string) {
  const { kjernesak, sendt, eposten } = await saken(punkt, 'BH');
  let lagtTil = false;
  render(Vederlagssvar, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: () => {
      throw new Error('Et svar lagt til går ikke til brevkontrollen');
    },
    onforkast: () => {},
    lagtTil: eposten(dato),
    onendre: () => {},
    onlagttil: () => (lagtTil = true),
  });
  return { kjernesak, sendt, lagtTil: () => lagtTil };
}

const radio = (navn: string | RegExp, i = 0) =>
  fireEvent.click(screen.getAllByRole('radio', { name: navn })[i]!);
const leggTil = () =>
  fireEvent.click(screen.getAllByRole('button', { name: LEGG_TIL.leggTilSvaret })[0]!);
const omVarselet = () => screen.queryAllByRole('group', { name: LEGG_TIL.svaretOmVarselet });

/**
 * Godtar oppgjørsformen og justeringen i hver kravpost og åpner P2, der byggherrens innsigelse mot
 * varselet står (kontrollpunktet `bh-svarer-med-innsigelsen-som-staar` i BF-49).
 */
async function svarPaaPostene() {
  await fireEvent.click(screen.getByRole('button', { name: /^Godta oppgjørsformen/ }));
  await radio('Godtar justeringen');
  await fireEvent.click(screen.getByRole('button', { name: /P2$/ }));
  await radio('Godtar justeringen');
}

afterEach(cleanup);

describe('svaret lagt til der byggherrens innsigelse mot varselet står (U-7, D-8, VS-U80)', () => {
  it('kravposten med innsigelsen har tre valg uten forhåndsvalg, og brevet innsigelsen sto i', async () => {
    await vederlagssvaret('bh-svarer-med-innsigelsen-som-staar', '2026-10-10');
    // P1 har ingen innsigelse og har de vanlige valgene.
    expect(omVarselet()).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: /P2$/ }));
    const [gruppe] = omVarselet();
    expect(omVarselet()).toHaveLength(1);
    const valg = within(gruppe!).getAllByRole('radio');
    expect(valg.map((r) => r.closest('label')!.textContent)).toEqual([
      expect.stringMatching(/Kom for sent\s*Som i brev 4/),
      expect.stringContaining('Kom i tide'),
      expect.stringContaining(LEGG_TIL.tausOmVarselet),
    ]);
    expect(valg.some((r) => (r as HTMLInputElement).checked)).toBe(false);
  });

  it('uten valget legges ingenting til, og feilmeldingen står (U-7)', async () => {
    const { sendt } = await vederlagssvaret('bh-svarer-med-innsigelsen-som-staar', '2026-10-10');
    await svarPaaPostene();
    await leggTil();
    expect(sendt).toEqual([]);
    expect(screen.getAllByText(`P2: ${LEGG_TIL.svaretOmVarseletMangler}`).length).toBeGreaterThan(
      0
    );
  });

  it('«Svaret sier ikke noe om varselet» sender kravposten uten standpunkt til varselet, og kjernen legger svaret til (D-8)', async () => {
    const { sendt, lagtTil } = await vederlagssvaret(
      'bh-svarer-med-innsigelsen-som-staar',
      '2026-10-10'
    );
    await svarPaaPostene();
    await radio(LEGG_TIL.tausOmVarselet);
    // U-7: panelet sier at varselet kom for sent, som gjort gjeldende i brev 4.
    expect(
      screen.getByText(
        'Varselet for P2 kom for sent, som gjort gjeldende i et tidligere svar (brev 4).'
      )
    ).toBeInTheDocument();
    await leggTil();
    await vi.waitFor(() => expect(lagtTil()).toBe(true));
    const k = sendt[0] as {
      type: string;
      sendt: string;
      svar: { vurderinger: { kravposter: Record<string, unknown>[] } }[];
    };
    expect(k).toMatchObject({ type: 'brev', sendt: '2026-10-10', korrespondansetype: 'e_post' });
    expect(k.svar[0]!.vurderinger.kravposter.every((p) => !('varslet_i_tide' in p))).toBe(true);
  });

  it('«Kom for sent» gjentar innsigelsen i svaret (VS-U77 punkt 9)', async () => {
    const { sendt, lagtTil } = await vederlagssvaret(
      'bh-svarer-med-innsigelsen-som-staar',
      '2026-10-10'
    );
    await svarPaaPostene();
    await radio(/^Kom for sent/);
    await leggTil();
    await vi.waitFor(() => expect(lagtTil()).toBe(true));
    const poster = (sendt[0] as { svar: { vurderinger: { kravposter: object[] } }[] }).svar[0]!
      .vurderinger.kravposter;
    expect(poster).toContainEqual(expect.objectContaining({ varslet_i_tide: false }));
  });

  it('kontrollsak: et svar fra løsningen har ikke det tredje valget, og gjentar innsigelsen som en setning (VS-U77 punkt 9)', async () => {
    const { kjernesak } = await saken('bh-svarer-med-innsigelsen-som-staar', 'BH');
    render(Vederlagssvar, {
      kjernesak,
      u: kjernesak.utledning!,
      onbrevkontroll: () => {},
      onforkast: () => {},
    });
    expect(omVarselet()).toHaveLength(0);
    expect(screen.queryByText(LEGG_TIL.tausOmVarselet)).toBeNull();
  });
});

describe('svaret lagt til med en tidligere dato (D-7, OV-U98)', () => {
  it('svaret sendt før innsigelsen gjelder kravet i brev 3, og har ikke valget om innsigelsen (variant D)', async () => {
    const { sendt, lagtTil, kjernesak } = await vederlagssvaret(
      'bh-svarer-med-innsigelsen-som-staar',
      '2026-10-03'
    );
    expect(omVarselet()).toHaveLength(0);
    expect(screen.getByText(/Svarer på brev 3/)).toBeInTheDocument();
    await radio(/^Godtar enhetspriser/);
    await radio('Godtar justeringen');
    await leggTil();
    await vi.waitFor(() => expect(lagtTil()).toBe(true));
    const u = kjernesak.utledning!;
    const k1 = u.spor.vederlag.krav.find((k) => k.id !== u.spor.vederlag.gjeldendeKrav!.id)!;
    expect((sendt[0] as { svar: { gjelder: string }[] }).svar[0]!.gjelder).toBe(k1.id);
  });
});

describe('varselet i et eldre krav (U-15, D-15, OV-U120)', () => {
  it('byggherren ser ved kravposten at varselet er det eldre kravet, og får ikke valget om innsigelsen for posten', async () => {
    await vederlagssvaret('bh-svarer-etter-det-eldre-kravet', '2026-10-13');
    expect(
      screen.getByText(/^Varselet for P1 er kravet i .*28\. september 2026/)
    ).toBeInTheDocument();
    expect(omVarselet()).toHaveLength(0);
    // Kontrollsak: innsigelsen mot varselet for P2 står fortsatt.
    await fireEvent.click(screen.getByRole('button', { name: /P2$/ }));
    expect(omVarselet()).toHaveLength(1);
  });

  it('tråden sier ved det eldre kravet at det er varselet for posten', async () => {
    const { kjernesak } = await saken('bh-svarer-etter-det-eldre-kravet', 'BH');
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    expect(await screen.findByText(LEGG_TIL.kravetErVarseletFor(['P1']))).toBeInTheDocument();
  });
});

describe('skjemaet lukkes uten at svaret er lagt til (U-9, D-12)', () => {
  it('«Legg til som dokumentasjon» legger korrespondansen til med merket, uten svaret', async () => {
    const { kjernesak, sendt, eposten } = await saken('bh-svarer-med-innsigelsen-som-staar', 'BH');
    const avbrudd = vi.fn(async () => {
      sendt.push({ avbrutt: true });
      return null;
    });
    render(Vederlagssvar, {
      kjernesak,
      u: kjernesak.utledning!,
      onbrevkontroll: () => {},
      onforkast: () => {
        throw new Error('Utkastet skal ikke forkastes');
      },
      lagtTil: eposten('2026-10-10'),
      onavbrudd: avbrudd,
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Forkast utkast' }));
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(within(dialog).getByText(LEGG_TIL.avbrudd.tittel('svar'))).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: LEGG_TIL.avbrudd.tilbake, hidden: true }));
    await fireEvent.click(
      within(dialog).getByRole('button', { name: LEGG_TIL.avbrudd.ja, hidden: true })
    );
    await vi.waitFor(() => expect(avbrudd).toHaveBeenCalledOnce());
  });

  it('Vardensak sender dokumentasjonen med `ikke_fylt_ut`, og kjernen tar den imot', async () => {
    const { kjernesak, sendt } = await saken('bh-svarer-med-innsigelsen-som-staar', 'BH');
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    await fireEvent.click(await screen.findByRole('button', { name: LEGG_TIL.tittel }));
    await radio('E-post');
    await radio('Byggherren');
    await fireEvent.input(screen.getByLabelText('Datoen det ble sendt'), {
      target: { value: '2026-10-10' },
    });
    const fil = new File(['%PDF-1.4'], 'eposten.pdf', { type: 'application/pdf' });
    await fireEvent.change(document.querySelector('input[type=file]')!, {
      target: { files: [fil] },
    });
    await screen.findByText('eposten.pdf');
    await fireEvent.input(screen.getByRole('textbox', { name: /Kort beskrivelse/ }), {
      target: { value: 'Svar på kravet' },
    });
    await radio(LEGG_TIL.kategorier.svar);
    await fireEvent.click(screen.getByRole('button', { name: LEGG_TIL.gaaVidere }));
    await fireEvent.click(screen.getByRole('button', { name: 'Forkast utkast' }));
    await fireEvent.click(screen.getByRole('button', { name: LEGG_TIL.avbrudd.ja, hidden: true }));
    await vi.waitFor(() =>
      expect(sendt.at(-1)).toMatchObject({
        type: 'registrert_brev',
        spor: ['vederlag'],
        sendt: '2026-10-10',
        ikke_fylt_ut: 'svar',
      })
    );
    expect(await screen.findByText(LEGG_TIL.avbrudd.lagtTil)).toBeInTheDocument();
    expect(kjernesak.utledning!.registrerteBrev.at(-1)).toBeDefined();
  });
});

describe('aksepten lagt til gjelder svaret som gjaldt på dagen (D-9, G-7)', () => {
  it('totalentreprenøren får bare svarene som gjaldt på datoen', async () => {
    const { kjernesak } = await saken('bh-har-svart-paa-kravet', 'TE');
    render(Korrespondanseskjema, {
      kjernesak,
      u: kjernesak.utledning!,
      spor: 'vederlag',
      onneste: () => {},
      onlagttil: () => {},
      onavbryt: () => {},
    });
    await radio('E-post');
    await radio('Totalentreprenøren');
    await fireEvent.input(screen.getByLabelText('Datoen det ble sendt'), {
      target: { value: '2026-10-11' },
    });
    await radio(LEGG_TIL.kategorier.aksept);
    const svarene = within(screen.getByRole('group', { name: LEGG_TIL.svaret })).getAllByRole(
      'radio'
    );
    // Svarene i sporet er e-posten 3. og 10. oktober og brev 6; bare e-posten 10. oktober gjaldt.
    expect(kjernesak.utledning!.spor.vederlag.svar.length).toBeGreaterThan(1);
    expect(svarene.map((r) => r.closest('label')!.textContent!.trim())).toEqual([
      expect.stringContaining('10. oktober 2026'),
    ]);
  });
});

describe('byggherrens egen endringsordre lagt til som svar på forholdet (U-13, D-11, OV-U6)', () => {
  async function forholdssvaret() {
    const { kjernesak, sendt, eposten } = await saken('kravet-retter-dokumentasjonen', 'BH');
    let lagtTil = false;
    render(Forholdssvar, {
      kjernesak,
      u: kjernesak.utledning!,
      onbrevkontroll: () => {},
      onforkast: () => {},
      lagtTil: { ...eposten('2026-10-12'), type: 'brev', sendemaate: 'post' },
      onendre: () => {},
      onlagttil: () => (lagtTil = true),
    });
    return { sendt, lagtTil: () => lagtTil };
  }

  it('valget står bare med standpunktet «godkjent», og sendes som et nytt svar med endringsordren', async () => {
    const { sendt, lagtTil } = await forholdssvaret();
    await radio(FORHOLDSSVAR.varselNei);
    await radio(FORHOLDSSVAR.avslaarEndringsordre);
    expect(screen.queryByText(FORHOLDSSVAR.egenEndringsordre)).toBeNull();
    await radio(FORHOLDSSVAR.enigEndringsordre);
    expect(screen.getByText(FORHOLDSSVAR.egenEndringsordreHjelp)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('checkbox', { name: FORHOLDSSVAR.egenEndringsordre }));
    await leggTil();
    await vi.waitFor(() => expect(lagtTil()).toBe(true));
    expect(sendt[0]).toMatchObject({ type: 'revisjon', endringsordre: true, sendt: '2026-10-12' });
  });

  it('kontrollsak: uten avkrysningen sendes svaret uten endringsordren', async () => {
    const { sendt, lagtTil } = await forholdssvaret();
    await radio(FORHOLDSSVAR.varselNei);
    await radio(FORHOLDSSVAR.enigEndringsordre);
    await leggTil();
    await vi.waitFor(() => expect(lagtTil()).toBe(true));
    expect(sendt[0]).not.toHaveProperty('endringsordre');
  });
});

describe('kravet om forholdet lagt til (D-5, G-8)', () => {
  it('totalentreprenøren kan legge til et krav i forholdet, og det legges til herfra uten skjemaet', async () => {
    const { kjernesak } = await saken('te-aapner-traaden', 'TE');
    render(Korrespondanseskjema, {
      kjernesak,
      u: kjernesak.utledning!,
      spor: 'forhold',
      onneste: () => {
        throw new Error('Kravet om forholdet går ikke videre');
      },
      onlagttil: () => {},
      onavbryt: () => {},
    });
    await radio('E-post');
    await radio('Totalentreprenøren');
    await fireEvent.input(screen.getByLabelText('Datoen det ble sendt'), {
      target: { value: '2026-10-12' },
    });
    await radio(LEGG_TIL.kategorier.krav);
    expect(screen.getByRole('button', { name: LEGG_TIL.leggTil })).toBeInTheDocument();
    expect(screen.queryByText(SAKEN.kontraktsforhold)).toBeNull();
  });
});
