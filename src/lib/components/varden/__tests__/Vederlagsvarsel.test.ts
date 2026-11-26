/**
 * «Bare varsle, uten krav» i kravskjemaet for vederlaget i Varden (BF-37), med brukerforløpet BF-37
 * og kjernen i minnet. Forventningene viser til U-punktene i bestillingen
 * `docs/domenetabell/brukerforlop/BF-37.md` og til vedtakene der. Brevteksten er kjernens; her prøves
 * at skjemaet sender varslene TE fyller ut, og at det som mangler, står ved feltet.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, type Demosak } from '#lib/kjernesak/demosak.ts';
import Demoforloep from '#lib/components/brukerforlop/Demoforloep.svelte';
import type { Journalrad } from '#kjerne/typer.ts';

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function aapneSomTe(punkt: string) {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: finnForloep('BF-37')!,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  const panel = within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
  await fireEvent.click(panel.getByRole('radio', { name: 'TE' }));
  await fireEvent.click(await screen.findByRole('button', { name: /^Vederlagsjustering/ }));
  return () => demosak!;
}

const knapp = (name: string | RegExp) => screen.getByRole('button', { name });
const felt = (name: string) => screen.getByLabelText(name, { exact: true }) as HTMLInputElement;
const skriv = (name: string, value: string) => fireEvent.input(felt(name), { target: { value } });

async function bareVarsle() {
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Send krav om vederlagsjustering' })
  );
  await fireEvent.click(screen.getByRole('radio', { name: 'Bare varsle, uten krav' }));
  await screen.findByRole('heading', { name: 'Varslene i brevet' });
}

/** Varslene i det siste brevet i journalen, slik kjernen lagret dem. */
const sisteVarsler = (j: Journalrad[]) =>
  (
    (j.findLast((r) => 'utsagn' in r.data)!.data as { utsagn: Record<string, unknown>[] }).utsagn ??
    []
  )
    .filter((x) => x.art === 'varsel')
    .map(({ hjemmel, arbeid }) => ({ hjemmel, arbeid }));

describe('TE varsler uten krav i vederlaget (BF-37)', () => {
  it('kravskjemaet har valget øverst, og «Bare varsle» viser varslene i brevet med varselet som alt er gitt (U-1, U-3, D-2)', async () => {
    await aapneSomTe('te-skal-varsle');
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Send krav om vederlagsjustering' })
    );
    const valget = screen.getByRole('group', { name: 'Hva sender du?' });
    expect(within(valget).getByRole('radio', { name: 'Send kravet' })).toHaveProperty(
      'checked',
      true
    );
    await fireEvent.click(within(valget).getByRole('radio', { name: 'Bare varsle, uten krav' }));
    await screen.findByRole('heading', { name: 'Varslene i brevet' });
    expect(screen.getByText('Varsel om vederlagsjustering er gitt i brev 2.')).toBeTruthy();
    // U-4: skjemaet for vederlaget har ikke varselet om fristforlengelse.
    expect(screen.queryByText(/fristforlengelse \(pkt/)).toBeNull();
    // Tilbake til kravet: kravpostene står der.
    await fireEvent.click(screen.getByRole('radio', { name: 'Send kravet' }));
    expect(await screen.findByLabelText('Beskrivelse av posten')).toBeTruthy();
  });

  it('TE sender to varsler etter punkt 34.4 og ett etter punkt 34.3.3, hvert med arbeidet, og brevet har ett avsnitt per varsel (U-2, U-6, VS-U87 punkt 27)', async () => {
    const demosak = await aapneSomTe('te-skal-varsle');
    await bareVarsle();
    await fireEvent.click(knapp(/^Endre varsel før regningsarbeidet/));
    await skriv('Arbeidet varselet gjelder', 'Ekstra graving i grøften ved kum 4');
    await fireEvent.click(knapp('Ferdig'));
    await fireEvent.click(knapp('Legg til et varsel'));
    await skriv('Arbeidet varselet gjelder', 'Omlegging av fjernvarmerør');
    await fireEvent.click(knapp('Ferdig'));
    await fireEvent.click(knapp('Legg til et varsel'));
    await fireEvent.click(
      screen.getByRole('radio', { name: /^Varsel om justering av enhetsprisene/ })
    );

    // U-3 og U-9: et varsel uten arbeidet stoppes, og panelet sier at arbeidet mangler.
    await fireEvent.click(knapp('Se brevet før sending'));
    const oppsummering = within(
      await screen.findByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(
      oppsummering.getByText(
        'Varsel om justering av enhetsprisene: Mangler arbeidet varselet gjelder'
      )
    ).toBeTruthy();
    const panel = screen.getByRole('heading', { name: 'Varslene' }).closest('section')!;
    expect(within(panel).getByText('Mangler arbeidet varselet gjelder')).toBeTruthy();

    await skriv('Arbeidet varselet gjelder', 'Sprengstein, post 03.21');
    await fireEvent.click(knapp('Ferdig'));
    await fireEvent.click(knapp('Se brevet før sending'));
    expect(await screen.findByText(/arbeidet «Omlegging av fjernvarmerør»/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(knapp('Send til byggherren'));
    await screen.findByText('Brevet er sendt til byggherren.');
    expect(sisteVarsler(demosak().journal())).toEqual([
      { hjemmel: '34.4', arbeid: 'Ekstra graving i grøften ved kum 4' },
      { hjemmel: '34.4', arbeid: 'Omlegging av fjernvarmerør' },
      { hjemmel: '34.3.3', arbeid: 'Sprengstein, post 03.21' },
    ]);
  });

  it('TE registrerer et varsel sendt utenfor løsningen uten arbeidet, med «Registrer varslene» (U-3, U-5, D-4)', async () => {
    await aapneSomTe('te-skal-varsle');
    await bareVarsle();
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Registrer et varsel sendt utenfor løsningen' })
    );
    expect(screen.getByText(/Løsningen lager ingen brevtekst/)).toBeTruthy();
    expect(knapp('Registrer varslene')).toBeTruthy();
    expect(screen.getAllByText('Arbeidet er ikke oppgitt').length).toBeGreaterThan(0);
    await fireEvent.click(knapp('Registrer varslene'));
    const oppsummering = within(
      await screen.findByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(oppsummering.queryByText(/Mangler arbeidet/)).toBeNull();
  });

  it('datoen etter punkt 34.1.3 står i raden for varselet og i tidslinja, og en dato etter brevet stoppes (U-1, U-2 og U-6 i BF-48)', async () => {
    await aapneSomTe('te-skal-varsle');
    await bareVarsle();
    await fireEvent.click(knapp(/^Endre varsel før regningsarbeidet/));
    await fireEvent.click(
      screen.getByRole('radio', { name: /^Varsel om særskilt vederlagsjustering/ })
    );
    expect(screen.queryByLabelText('Arbeidet varselet gjelder')).toBeNull();
    await skriv('Når ble du klar over at utgiftene ville påløpe?, Valgfri', '2099-01-01');
    await fireEvent.click(knapp('Se brevet før sending'));
    const oppsummering = within(
      await screen.findByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(oppsummering.getByText(/er etter datoen brevet sendes/)).toBeTruthy();
  });

  it('etter varslene viser oversikten at vederlaget er varslet (forventet resultat 2 i #2010)', async () => {
    await aapneSomTe('te-har-varslet');
    expect(await screen.findByText('Varslet')).toBeTruthy();
  });
});
