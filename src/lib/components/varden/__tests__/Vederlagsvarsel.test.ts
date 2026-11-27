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
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { handlinger } from '#kjerne/kommandoer/handlinger.ts';
import { KJERNE } from '#kjerne/versjon.ts';

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function aapneSom(punkt: string, part: 'TE' | 'BH' = 'TE', forloep = 'BF-37') {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: finnForloep(forloep)!,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  const panel = within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
  await fireEvent.click(panel.getByRole('radio', { name: part }));
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
    await aapneSom('te-skal-varsle');
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
    const demosak = await aapneSom('te-skal-varsle');
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
    await aapneSom('te-skal-varsle');
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
    await aapneSom('te-skal-varsle');
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
    await aapneSom('te-har-varslet');
    expect(await screen.findByText('Varslet')).toBeTruthy();
  });
});

describe('varslene med arbeidet etter brevet med tre varsler (kravene fra #2437 og #2427)', () => {
  async function kravpost(form: RegExp, valg?: RegExp) {
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Send krav om vederlagsjustering' })
    );
    await skriv('Beskrivelse av posten', 'Graving ved kum 4');
    await fireEvent.click(screen.getByRole('radio', { name: form }));
    if (valg) await fireEvent.click(screen.getByRole('radio', { name: valg }));
    await fireEvent.click(knapp('Ferdig'));
  }

  it('påminnelsen ved det første kravet viser arbeidet (VS-U87 punkt 27)', async () => {
    await aapneSom('te-har-varslet');
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Send krav om vederlagsjustering' })
    );
    expect(
      screen.getByText(/punkt 34\.4 i brev 3, sendt .*: Ekstra graving i grøften ved kum 4\./)
    ).toBeTruthy();
  });

  it('med to varsler før regningsarbeidet uten kravpost spør «Varslene» hvilket varsel posten gjelder, med arbeidet, uten forhåndsvalg (U-7, D-5, VS-U87 punkt 23)', async () => {
    await aapneSom('te-har-varslet');
    await kravpost(/^Regningsarbeid/);
    const valget = within(
      screen.getByRole('group', { name: 'Hvilket varsel før regningsarbeidet gjelder P1?' })
    );
    const radio = (name: RegExp | string) =>
      valget.getByRole('radio', { name }) as HTMLInputElement;
    const graving = radio(/^Brev 3, .*: Ekstra graving i grøften ved kum 4$/);
    const omlegging = radio(/^Brev 3, .*: Omlegging av fjernvarmerør langs fasade nord$/);
    const ingen = radio(/^Ingen av dem\. Varselet før regningsarbeidet i P1 gis i dette brevet\.$/);
    expect([graving, omlegging, ingen].map((r) => r.checked)).toEqual([false, false, false]);
    expect(valget.queryByRole('radio', { name: /Økte mengder sprengstein/ })).toBeNull();
    expect(screen.queryByText(/^Brevet sier/)).toBeNull();
    // Raden sier ikke at varselet gis i dette brevet før TE har valgt (/design-review, F1).
    expect(screen.getByText('Ikke valgt ennå.')).toBeTruthy();

    await fireEvent.click(knapp('Se brevet før sending'));
    const oppsummering = within(
      await screen.findByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(
      oppsummering.getByText(/Velg varselet posten gjelder, eller at varselet gis i dette brevet\./)
    ).toBeTruthy();

    // Lenken fra «Dette mangler» åpner ikke det tredelte spørsmålet ved siden av (Gemini, funn 1).
    await fireEvent.click(oppsummering.getByRole('link', { name: /Velg varselet posten gjelder/ }));
    expect(screen.queryByRole('group', { name: 'Hvor ble varselet for P1 gitt?' })).toBeNull();
    expect(
      screen.getAllByRole('group', { name: 'Hvilket varsel før regningsarbeidet gjelder P1?' })
    ).toHaveLength(1);

    await fireEvent.click(graving);
    expect(
      screen.getByText(
        'Brevet sier at varselet for P1 ble gitt i brev 3. Gjør byggherren gjeldende i svaret på det varselet at det kom for sent, står det bare mot kravpostene som gjelder varselet.'
      )
    ).toBeTruthy();
    await fireEvent.click(ingen);
    // Påminnelsen ved posten står ikke etter valget (Gemini, funn 2).
    expect(
      screen.queryByText(/^Saken har et varsel etter punkt.34\.4 som ingen kravpost/)
    ).toBeNull();
    expect(
      screen.getByText(
        'Brevet sier at varselet for P1 gis i dette brevet. Varslene i saken gjelder ikke P1.'
      )
    ).toBeTruthy();
  });

  it('med ett varsel om justering av enhetsprisene uten kravpost er det forhåndsvalgt (U-7, D-5)', async () => {
    await aapneSom('te-har-varslet');
    await kravpost(/^Enhetspriser/, /^Justerte enhetspriser/);
    const valget = within(
      screen.getByRole('group', {
        name: 'Hvilket varsel om justering av enhetsprisene gjelder P1?',
      })
    );
    expect(
      (
        valget.getByRole('radio', {
          name: /^Brev 3, .*: Økte mengder sprengstein i byggegropen, post 03\.21$/,
        }) as HTMLInputElement
      ).checked
    ).toBe(true);
    expect(screen.getByText(/^Brevet sier at varselet for P1 ble gitt i brev 3\./)).toBeTruthy();
    // Ordlyden med ett varsel (oppdragsgiver 26.11 i PR #2461).
    expect(
      valget.getByRole('radio', {
        name: 'Nei, varselet om justering av enhetsprisene i P1 gis i dette brevet.',
      })
    ).toBeTruthy();
  });

  it('tidslinja kaller brevet med flere varsler i vederlaget «Varsel om vederlagsjustering» (oppdragsgiver 27.11 i #2500)', async () => {
    await aapneSom('te-har-varslet');
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Send krav om vederlagsjustering' })
    );
    expect(screen.getAllByText('Varsel om vederlagsjustering').length).toBeGreaterThan(0);
    expect(screen.queryByText('3 varsler')).toBeNull();
  });

  it('byggherren får svaret på varselet etter punkt 34.1.2 som står alene i samme svarskjema, og varslene i brev 3 besvares i ett svar (#2447, VS-U87 punkt 32, M-5 i BF-37)', async () => {
    const demosak = await aapneSom('te-har-varslet', 'BH');
    const u = utledJournal(demosak().journal(), KJERNE);
    const varselet = u.spor.vederlag.varsler['34.1.2']!.id;
    expect(handlinger(u, 'BH'), 'forutsetning: kjernen tilbyr svaret').toContain(
      `svare:${varselet}`
    );
    const knappene = (await screen.findAllByRole('button')).filter((k) =>
      k.textContent?.trim().startsWith('Svar på')
    );
    const svarene = knappene.map((k) => k.textContent?.trim() ?? '');
    // Én primærknapp per brev (system.md, «Handlingene i Varden»): varslene etter punkt 34.4 og
    // 34.3.3 står i brev 3 og besvares i ett svar (M-5 i BF-37), og varselet etter punkt 34.1.2
    // står i et annet brev.
    expect(knappene.map((k) => k.classList.contains('knapp-primaer'))).toEqual([true, true]);
    expect(svarene).toEqual(['Svar på varslene', 'Svar på varselet om vederlagsjustering']);
    await fireEvent.click(knappene[1]!);
    const skjema = within(await screen.findByRole('form'));
    expect(
      skjema.getByRole('heading', { level: 2, name: /^Svar på varsel om vederlagsjustering/ })
    ).toBeTruthy();
    expect(skjema.getByRole('radio', { name: 'Kom i tide' })).toBeTruthy();
    expect(skjema.queryByRole('radio', { name: 'Godtar justeringen' })).toBeNull();
  });
});

describe('varselet sendt utenfor løsningen lagt til som korrespondanse (G-8 i BF-37, variant C i BF-48)', () => {
  it('kategorien varsel i vederlaget går videre til registreringen med det som er fylt ut, og varslene registreres', async () => {
    const demosak = await aapneSom('te-skal-varsle');
    await fireEvent.click(await screen.findByRole('button', { name: 'Legg til korrespondanse' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Brev' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Per post' }));
    await skriv('Datoen det ble sendt', '2026-09-30');
    const fil = new File(['%PDF-1.4'], 'varselet.pdf', { type: 'application/pdf' });
    await fireEvent.change(document.querySelector('input[type=file]')!, {
      target: { files: [fil] },
    });
    await screen.findByText('varselet.pdf');
    await fireEvent.input(screen.getByRole('textbox', { name: /Kort beskrivelse/ }), {
      target: { value: 'Brevet om gravingen' },
    });
    await fireEvent.click(screen.getByRole('radio', { name: 'Et varsel' }));
    await fireEvent.click(knapp('Gå videre'));

    const skjema = within(await screen.findByRole('form'));
    expect(
      skjema.getByRole('heading', {
        level: 2,
        name: /^Registrer et varsel sendt utenfor løsningen/,
      })
    ).toBeTruthy();
    expect((skjema.getByLabelText('Datoen det ble sendt') as HTMLInputElement).value).toBe(
      '2026-09-30'
    );
    await fireEvent.click(knapp('Registrer varslene'));
    await screen.findByText('Varslene er registrert.');
    expect(sisteVarsler(demosak().journal())).toEqual([{ hjemmel: '34.4', arbeid: undefined }]);
  });
});

describe('utkastet til kravet og brevkontrollen etter varslene (/code-review)', () => {
  it('kravet TE har skrevet i, står etter at varselet er sendt (U-1)', async () => {
    await aapneSom('te-skal-varsle');
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Send krav om vederlagsjustering' })
    );
    await skriv('Beskrivelse av posten', 'Graving ved kum 4');
    await fireEvent.click(screen.getByRole('radio', { name: 'Bare varsle, uten krav' }));
    await fireEvent.click(knapp(/^Endre varsel før regningsarbeidet/));
    await skriv('Arbeidet varselet gjelder', 'Ekstra graving i grøften ved kum 4');
    await fireEvent.click(knapp('Se brevet før sending'));
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
    );
    await fireEvent.click(knapp('Send til byggherren'));
    await screen.findByText('Brevet er sendt til byggherren.');
    await fireEvent.click(knapp('Tilbake til saken'));
    await fireEvent.click(knapp('Fortsett utkastet'));
    expect(
      await screen.findByRole('heading', { name: 'Krav om vederlagsjustering i sak KOE-17' })
    ).toBeTruthy();
    expect(screen.getAllByText(/Graving ved kum 4/).length).toBeGreaterThan(0);
  });

  it('brevkontrollen for et varsel etter kravet viser ikke kravet som forrige brev (BF-37)', async () => {
    await aapneSom('te-har-mottatt-svaret', 'TE', 'BF-01');
    await fireEvent.click(
      await screen.findByRole('button', { name: /^Send varsel etter punkt.34\.4$/ })
    );
    await fireEvent.click(knapp(/^Endre varsel før regningsarbeidet/));
    await skriv('Arbeidet varselet gjelder', 'Ekstra graving');
    await fireEvent.click(knapp('Se brevet før sending'));
    await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' });
    expect(screen.queryByText(/^Kravet i brev/)).toBeNull();
  });
});

describe('valgene i varselutkastet står (Codex-reviewet)', () => {
  it('registreringen står med datoen når TE går til kravet og tilbake til «Bare varsle» («Ugyldig valg og avbrudd» i BF-37)', async () => {
    await aapneSom('te-skal-varsle');
    await bareVarsle();
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Registrer et varsel sendt utenfor løsningen' })
    );
    await skriv('Datoen det ble sendt', '2026-09-30');
    await fireEvent.click(screen.getByRole('radio', { name: 'Send kravet' }));
    await screen.findByLabelText('Beskrivelse av posten');
    await fireEvent.click(screen.getByRole('radio', { name: 'Bare varsle, uten krav' }));
    await screen.findByRole('heading', { name: 'Varslene i brevet' });
    expect(
      screen.getByRole('radio', { name: 'Registrer et varsel sendt utenfor løsningen' })
    ).toHaveProperty('checked', true);
    expect(felt('Datoen det ble sendt').value).toBe('2026-09-30');
  });

  it('et krav lagt til som korrespondanse åpner kravskjemaet, også med varselutkastet påbegynt (BF-49 «Arbeidsmåten»)', async () => {
    await aapneSom('te-skal-varsle');
    await bareVarsle();
    await fireEvent.click(screen.getAllByRole('button', { name: /^Vederlagsjustering/ })[0]!);
    await fireEvent.click(await screen.findByRole('button', { name: 'Legg til korrespondanse' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Brev' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Per post' }));
    await skriv('Datoen det ble sendt', '2026-09-30');
    const fil = new File(['%PDF-1.4'], 'kravet.pdf', { type: 'application/pdf' });
    await fireEvent.change(document.querySelector('input[type=file]')!, {
      target: { files: [fil] },
    });
    await screen.findByText('kravet.pdf');
    await fireEvent.input(screen.getByRole('textbox', { name: /Kort beskrivelse/ }), {
      target: { value: 'Kravet om graving' },
    });
    await fireEvent.click(screen.getByRole('radio', { name: 'Et krav' }));
    await fireEvent.click(knapp('Gå videre'));
    expect(await screen.findByLabelText('Beskrivelse av posten')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Varslene i brevet' })).toBeNull();
  });
});

describe('datoen etter punkt 34.1.3 i et varsel som registreres (U-11 og D-1 i BF-48, Codex-reviewet)', () => {
  it('er datoen alt oppgitt, kan registreringen ha datoen brevet oppga, med den siste opplysningen og lenken ved feltet', async () => {
    await aapneSom('datoen-er-oppgitt', 'TE', 'BF-48');
    await fireEvent.click(await screen.findByRole('button', { name: 'Legg til korrespondanse' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Brev' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Per post' }));
    await skriv('Datoen det ble sendt', '2026-10-20');
    const fil = new File(['%PDF-1.4'], 'varselet.pdf', { type: 'application/pdf' });
    await fireEvent.change(document.querySelector('input[type=file]')!, {
      target: { files: [fil] },
    });
    await screen.findByText('varselet.pdf');
    await fireEvent.input(screen.getByRole('textbox', { name: /Kort beskrivelse/ }), {
      target: { value: 'Det særskilte varselet' },
    });
    await fireEvent.click(screen.getByRole('radio', { name: 'Et varsel' }));
    await fireEvent.click(knapp('Gå videre'));
    await screen.findByRole('heading', { name: 'Varslene i brevet' });
    await fireEvent.click(knapp(/^Endre /));
    await fireEvent.click(
      screen.getByRole('radio', { name: /^Varsel om særskilt vederlagsjustering/ })
    );
    expect(
      screen.getByLabelText('Når ble du klar over at utgiftene ville påløpe?, Valgfri')
    ).toBeTruthy();
    expect(screen.getByText(/^Klar over at utgiftene ville påløpe .*, oppgitt i/)).toBeTruthy();
  });
});
