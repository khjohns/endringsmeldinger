import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep } from '#lib/kjernesak/demosak.ts';
import Demoforloep from '#lib/components/brukerforlop/Demoforloep.svelte';
import { registrerOppsett } from './vardenOppsett.ts';

registrerOppsett();

describe('Varden med brukerforløpet BF-01', () => {
  it('BF-04: over beløpet står avslaget av forholdet først og så innsigelsen om at varselet etter punkt 34.1.2 kom for sent, og hovedlinjene begynner på avslaget (#1400, S1-A og S2-A, OV-U32, OV-U33, OV-U76)', async () => {
    render(Demoforloep, {
      forloep: finnForloep('BF-04')!,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: () => {},
    });
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const forutsetningene = () => {
      const beloep = screen.getByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' });
      const id = beloep.getAttribute('aria-describedby');
      return id
        ? [...document.getElementById(id)!.querySelectorAll('li')].map((li) =>
            li.textContent!.replace(/\s+/g, ' ').trim()
          )
        : [];
    };
    // Svaret på grunnlaget er brev 2 i saken (versjon 3, etter `sak_opprettet`), i kortform
    // (oppdragsgiver 05.11 i #1631).
    const AVSLAGET = 'avslaget av forholdet i brev 2 ikke fører frem';

    // S1-A: et ubesvart varslingsspørsmål regnes som at innsigelsen ikke er gjort gjeldende.
    expect(forutsetningene()).toEqual([AVSLAGET]);
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    // S2-A: grunnene fra grunnlaget først, så innsigelsen mot vederlagskravet.
    expect(forutsetningene()).toEqual([
      AVSLAGET,
      'innsigelsen om at varselet etter punkt 34.1.2 kom for sent ikke fører frem',
    ]);

    // KA-U72: mener BH en annen oppgjørsform, spør skjemaet ikke om beløpet.
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Mener regningsarbeid (punkt\u00a034.4)' })
    );
    expect(screen.queryByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' })).toBeNull();

    // Som i brevet står avslaget prinsipalt, foran sporet (OV-U33).
    const linjer = within(screen.getByRole('region', { name: 'Punktene i brevet' })).getAllByRole(
      'listitem'
    );
    expect(within(linjer[0]).getByText('1. Forholdet')).toBeVisible();
    expect(within(linjer[0]).getByText('Du har avslått forholdet i brev 2')).toBeVisible();
    expect(within(linjer[0]).queryByText(/^prinsipalt$/i)).toBeNull();
    expect(
      within(linjer[1]).getByText(/^Hvis avslaget av forholdet i brev 2 ikke fører frem$/)
    ).toBeVisible();
  });

  it('BF-04: mener BH en annen oppgjørsform, spør skjemaet ikke om beløpet, og hovedlinjene sier ikke noe om det; med fast sum godkjent står valget for beløpet igjen (KA-U72)', async () => {
    render(Demoforloep, {
      forloep: finnForloep('BF-04')!,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: () => {},
    });
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const beloepet = () =>
      screen.queryByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' });
    const linjer = () =>
      within(screen.getByRole('region', { name: 'Punktene i brevet' }))
        .queryAllByRole('listitem')
        .map((li) => li.textContent!.replace(/\s+/g, ' ').trim());

    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet i tide' }));
    expect(beloepet(), 'forutsetning: uten oppgjørsform spør skjemaet om beløpet').not.toBeNull();
    await fireEvent.click(screen.getByRole('radio', { name: 'Ingenting' }));
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Mener regningsarbeid (punkt\u00a034.4)' })
    );
    expect(beloepet()).toBeNull();
    expect(linjer().some((l) => l.includes('Vederlagsjustering'))).toBe(false);
    expect(linjer().some((l) => l.includes('regningsarbeid'))).toBe(true);

    await fireEvent.click(
      screen.getByRole('radio', { name: 'Godkjenner fast sum (punkt\u00a034.2.1)' })
    );
    expect(beloepet()).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Ingenting' })).toBeChecked();
    expect(linjer().some((l) => l.includes('Vederlagsjustering'))).toBe(true);
  });

  it('BF-04: over varselet står avslaget av forholdet, og over metoden står i tillegg innsigelsen om at varselet etter punkt 34.1.2 kom for sent etter «Varslet for sent», som kjernen gir (oppdragsgiver 30.10 i #1411, S2-A i #1400, LV-U31, OV-U76)', async () => {
    render(Demoforloep, {
      forloep: finnForloep('BF-04')!,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: () => {},
    });
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const forutsetningene = (spoersmaal: string | RegExp) => {
      const id = screen.getByRole('group', { name: spoersmaal }).getAttribute('aria-describedby');
      return id
        ? [...document.getElementById(id)!.querySelectorAll('li')].map((li) =>
            li.textContent!.replace(/\s+/g, ' ').trim()
          )
        : [];
    };
    // Nummeret i saken, ikke versjonen i journalen (oppdragsgiver 05.11 i #1631).
    const AVSLAGET = ['avslaget av forholdet i brev 2 ikke fører frem'];
    const VARSEL = 'Kom varselet om kravet i tide?';
    const METODE = 'Oppgjørsformen (punkt\u00a034.2.2)';

    expect(forutsetningene(VARSEL)).toEqual(AVSLAGET);
    expect(forutsetningene(METODE)).toEqual(AVSLAGET);
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet i tide' }));
    expect(forutsetningene(VARSEL)).toEqual(AVSLAGET);
    expect(forutsetningene(METODE)).toEqual(AVSLAGET);
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    expect(forutsetningene(VARSEL)).toEqual(AVSLAGET);
    expect(forutsetningene(METODE)).toEqual([
      ...AVSLAGET,
      'innsigelsen om at varselet etter punkt 34.1.2 kom for sent ikke fører frem',
    ]);
    // Svaret på oppgjørsformen flytter ikke oppgjørsformen ut av laget sitt.
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Mener regningsarbeid (punkt\u00a034.4)' })
    );
    expect(forutsetningene(METODE)).toEqual([
      ...AVSLAGET,
      'innsigelsen om at varselet etter punkt 34.1.2 kom for sent ikke fører frem',
    ]);
  });
});
