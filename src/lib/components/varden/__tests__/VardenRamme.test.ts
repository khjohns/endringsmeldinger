import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import Demoforloep from '#lib/components/brukerforlop/Demoforloep.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { projectStore } from '#lib/stores/project.svelte.ts';
import { registrerOppsett, BF, START, aapne, demopanel } from './vardenOppsett.ts';

registrerOppsett();

describe('Varden med brukerforløpet BF-01', () => {
  it('panelet til venstre har forholdet under «Kontraktsforhold» og kravene under «Krav», uten linje under navnene, og sakens kode over tittelen (oppdragsgiver 06.11, #1631)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    const panelet = within(
      await screen.findByRole('navigation', { name: 'Forholdet og kravene i saken' })
    );
    const forholdet = panelet.getByRole('list', { name: 'Kontraktsforhold' });
    const kravene = panelet.getByRole('list', { name: 'Krav' });
    const navn = (b: HTMLElement) => b.querySelector('.navn')?.textContent?.trim();
    expect(within(forholdet).getAllByRole('button').map(navn)).toEqual([
      'Manglende medvirkning eller leveranser fra byggherren',
    ]);
    expect(within(kravene).getAllByRole('button').map(navn)).toEqual([
      'Vederlagsjustering',
      'Fristforlengelse',
    ]);
    const tittel = screen.getByRole('heading', { level: 1, name: BF.tittel });
    expect(tittel.previousElementSibling?.textContent).toMatch(/^KOE-\d+$/);
  });

  it('under hvert spor i panelet står betegnelsen og siste brev, aldri hvem som skal handle (#1899 punkt 2, MM-U30, system.md «Visningen sier det løsningen vet»)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    const panelet = within(
      await screen.findByRole('navigation', { name: 'Forholdet og kravene i saken' })
    );
    const vederlag = within(panelet.getByRole('list', { name: 'Krav' })).getAllByRole('button')[0];
    expect(vederlag.querySelector('.st')?.textContent).toBe('Svar ikke registrert');
    expect(vederlag.querySelector('.st2')?.textContent).toMatch(
      /^Siste: brev \d+ fra totalentreprenøren$/
    );
    for (const b of panelet.getAllByRole('button'))
      expect(b.textContent).not.toMatch(/venter på|neste steg|skal svare|må svare/i);
  });

  it('panelet til venstre felles inn mens brevet leses ved siden av skjemaet, og kommer tilbake når brevet lukkes (oppdragsgiver 30.10, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    // Gruppene i panelet står bare når panelet står.
    const omslaget = () => screen.queryByRole('list', { name: 'Krav' });
    expect(omslaget()).toBeInTheDocument();

    // Der panelet er felt inn, står sporene i topplinja (U-16 i BF-44, #1899 punkt 4).
    await fireEvent.click(screen.getByRole('button', { name: 'Les brevet ved siden av' }));
    expect(omslaget()).toBeNull();
    const sporene = screen.getByRole('navigation', { name: 'Forholdet og kravene i saken' });
    expect(within(sporene).getByRole('button', { name: 'Vederlagsjustering' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Lukk brevet' }));
    expect(omslaget()).toBeInTheDocument();
  });

  it('saksomslaget har partene øverst og prosjektet nederst, og et navn som mangler, står ikke der (panel B, #1899 punkt 1, #1398)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    const { container } = render(Vardensak, {
      kjernesak,
      kontrakt: { prosjekt: 'Prosjekt A', byggherre: 'Byggherre AS' },
    });

    await screen.findByRole('heading', { level: 1, name: BF.tittel });
    const parter = container.querySelector('.parter')!;
    expect([...parter.querySelectorAll('dt')].map((e) => e.textContent)).toEqual(['Byggherre']);
    expect(within(parter as HTMLElement).getByText('Byggherre AS')).toBeTruthy();
    expect(container.querySelector('.avsender')?.textContent).toContain('Prosjekt A');
    expect(screen.queryByRole('region', { name: 'Kontrakten' })).toBeNull();
  });

  it('uten kontrakt fra demoruta leser omslaget navnene på partene fra prosjektet, og kontraktsformen, som serveren ikke gir, står ikke der (#1398, arbeidsvalget «Prosjektruta»)', async () => {
    projectStore.set({
      id: 'p1',
      organisasjon_id: 'o1',
      name: 'Prosjekt B',
      settings: {
        contract: { byggherre_navn: 'Byggherre BH', totalentreprenor_navn: 'Entreprenør TE' },
      },
      created_at: '2026-10-30T00:00:00Z',
      is_active: true,
    });
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    const { container } = render(Vardensak, { kjernesak });

    await screen.findByRole('heading', { level: 1, name: BF.tittel });
    expect([...container.querySelectorAll('.parter dd')].map((e) => e.textContent?.trim())).toEqual(
      ['Entreprenør TE', 'Byggherre BH']
    );
    const avsender = container.querySelector('.avsender')!.textContent!;
    expect(avsender).toContain('Prosjekt B');
    expect(avsender).not.toContain('·');
    projectStore.set(null);
  });

  it.each([
    ['TE', 1],
    ['BH', 0],
  ] as const)(
    '%s ser lenken «Nytt krav om endringsordre» %i gang(er), i topplinja og ikke i panelet (#1899 punkt 3, oppdragsgiver 13.11: «topplinja»)',
    async (part, antall) => {
      const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', part);
      const kjernesak = lagKjernesak({
        sakId: demosak.sakId,
        prosjektId: 'demo',
        part,
        hent: demosak.hent,
        send: demosak.send,
      });
      await kjernesak.last();
      render(Vardensak, { kjernesak, nySakLenke: '/demo/ny' });
      await screen.findByRole('heading', { level: 1, name: BF.tittel });
      const lenker = screen.queryAllByRole('link', { name: 'Nytt krav om endringsordre' });
      expect(lenker).toHaveLength(antall);
      for (const l of lenker) {
        expect(l.getAttribute('href')).toBe('/demo/ny');
        expect(l.closest('.topplinje')).not.toBeNull();
      }
    }
  );

  it('i demoruta fører «Nytt krav om endringsordre» til skjemaet for ny sak i BF-05 (oppdragsgiver 13.11 i #1908: «Ja, til BF-05»)', async () => {
    render(Demoforloep, {
      forloep: START,
      punkt: 'te-har-mottatt-svaret',
      onpunkt: () => {},
      nySakLenke: '/demo/BF-05',
    });
    const radio = demopanel().getByRole('radio', { name: 'TE' });
    if (radio.getAttribute('aria-checked') !== 'true') await fireEvent.click(radio);
    const lenke = await screen.findByRole('link', { name: 'Nytt krav om endringsordre' });
    expect(lenke.getAttribute('href')).toBe('/demo/BF-05');
  });

  it('topplinja har stien Varden › prosjektet › saken og den innloggede med initialene, ikke rollen (prototypen grunnlagsoversikt.html, oppdragsgiver 06.11)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, {
      kjernesak,
      kontrakt: { prosjekt: 'Skolebygg Nord' },
      prosjekter: '/',
      saksliste: '/demo',
      bruker: { name: 'Kari Nordmann' },
    });

    const sti = await screen.findByRole('navigation', { name: 'Du er her' });
    expect(within(sti).getByRole('link', { name: 'Varden' }).getAttribute('href')).toBe('/');
    expect(within(sti).getByRole('link', { name: 'Skolebygg Nord' }).getAttribute('href')).toBe(
      '/demo'
    );
    expect(
      within(sti)
        .getByText(/^KOE-\d+$/)
        .getAttribute('aria-current')
    ).toBe('page');
    expect(screen.getByText('KN')).toBeTruthy();
    expect(screen.getByText('Kari Nordmann')).toBeTruthy();
    expect(screen.queryByText(/^Du er /)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Kopier lenke' })).toBeNull();
  });
});
