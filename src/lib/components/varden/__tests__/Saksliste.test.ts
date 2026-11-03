/**
 * Sakslisten i Varden (#1450). Forventningene står i beskrivelsen av #1450 (punkt 2–8), med
 * svarene på M1–M8, og i MM-U37–MM-U39 med prototypen `saksliste-v2.html`: raden viser
 * det TE har krevd, og nøkkeltallene summerer kravene utenfor endringsordrene. KT-U9, KT-U10
 * og EO-U13 gjelder også.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import Saksliste from '$lib/components/varden/Saksliste.svelte';
import Vardensak from '$lib/components/varden/Vardensak.svelte';
import { lagSakslinje } from '$lib/mocks/sakslinje';
import { finnForloep, lagDemosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { ApiError } from '$lib/api/client';
import type { Sakslinje } from '$lib/types/api';

afterEach(cleanup);

const ingenting = { betegnelse: null, venter_paa_svar: false, svar_ikke_godtatt: false };

function vis(over: Partial<Parameters<typeof render<typeof Saksliste>>[1]> = {}) {
  return render(Saksliste, {
    saker: [lagSakslinje()],
    part: 'TE',
    prosjektNavn: 'Skolebygg Nord',
    sakslenke: (sakId: string) => `/p1/${sakId}`,
    nyttKrav: '/p1/ny',
    ...over,
  });
}

const panelet = () => screen.getByRole('navigation', { name: 'Saker' });
const rad = (tittel: string) => screen.getByRole('link', { name: tittel }).closest('li')!;

describe('Sakslisten i Varden', () => {
  it('panelet har KOE og EO med antallet lest av sakstypen, og ikke forsering (KT-U9, svaret på M4)', () => {
    vis({
      saker: [
        lagSakslinje({ sak_id: 'A' }),
        lagSakslinje({ sak_id: 'B' }),
        lagSakslinje({ sak_id: 'C', sakstype: 'forsering' }),
      ],
    });
    const valg = within(panelet()).getAllByRole('button');
    expect(valg.map((v) => v.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Krav om endringsordre 2 saker',
      'Endringsordrer 0 saker',
    ]);
    expect(valg[0].getAttribute('aria-current')).toBe('page');
    expect(within(panelet()).queryByText(/Forsering/)).toBeNull();
  });

  it('valget av EO avgrenser lista og viser den tomme tilstanden til EO-saken er bygget (#1423)', async () => {
    vis();
    await fireEvent.click(within(panelet()).getByRole('button', { name: /Endringsordrer/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Endringsordrer');
    expect(screen.getByText('Ingen endringsordrer ennå.')).toBeTruthy();
    // Knappen for KOE hører til KOE-fanen, og «Ny endringsordre» venter på #1423 (KT-U10).
    expect(screen.queryByRole('link', { name: 'Nytt krav om endringsordre' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Endring i grunnarbeider' })).toBeNull();
  });

  it('lista har en lastetilstand, en feiltilstand med «Prøv igjen» og en tom tilstand (#1450, punkt 3)', async () => {
    vis({ laster: true, saker: [] });
    expect(screen.getByRole('status').textContent).toBe('Laster sakene …');
    cleanup();

    const proevIgjen = vi.fn();
    vis({ feil: 'Serveren svarte med feilkode 500.', saker: [], onproevIgjen: proevIgjen });
    const feil = screen.getByRole('alert');
    expect(within(feil).getByRole('heading', { name: 'Sakene kunne ikke lastes' })).toBeTruthy();
    expect(feil.textContent).toContain('Teknisk melding: Serveren svarte med feilkode 500.');
    await fireEvent.click(within(feil).getByRole('button', { name: 'Prøv igjen' }));
    expect(proevIgjen).toHaveBeenCalledOnce();
    cleanup();

    vis({ saker: [], part: 'BH' });
    expect(screen.getByText('Ingen krav om endringsordre ennå.')).toBeTruthy();
  });

  it('kolonnene er saken, kravene og «Siste brev», og hver rad lenker til saken (prototypen v2)', () => {
    vis({ saker: [lagSakslinje({ sak_id: 'SAK-9', hovedkategori: 'endring' })] });
    const hode = document.querySelector('.radhode')!;
    expect([...hode.children].map((s) => s.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Sak',
      'Krevd vederlag eks. mva.',
      'Krevd frist',
      'Siste brev',
    ]);
    const lenke = screen.getByRole('link', { name: 'Endring i grunnarbeider' });
    expect(lenke.getAttribute('href')).toBe('/p1/SAK-9');
    const r = rad('Endring i grunnarbeider');
    expect(within(r).getByText('Endringer')).toBeTruthy();
  });

  it('«Siste brev» viser avsenderen og datoen for sakens siste brev fra serveren, og «Ingen brev» uten brev (#1450, arbeidsvalg 2 02.11)', () => {
    vis({
      saker: [
        lagSakslinje({
          sak_id: 'A',
          sakstittel: 'Med brev',
          siste_hendelse: '2026-11-02T10:00:00Z',
          siste_brev: { avsender: 'BH', registrert: '2026-10-30T10:00:00Z' },
        }),
        lagSakslinje({ sak_id: 'B', sakstittel: 'Uten brev', siste_brev: null }),
      ],
    });
    const brevet = (t: string) =>
      rad(t).querySelector('.brevet')!.textContent?.replace(/\s+/g, ' ').trim();
    expect(brevet('Med brev')).toBe('Fra BH 30. oktober 2026');
    expect(brevet('Uten brev')).toBe('Ingen brev');
  });

  it('raden viser det TE har krevd, og ikke byggherrens svar, enigheten eller betegnelsen (MM-U37)', () => {
    const linje: Sakslinje = lagSakslinje({
      forhold: { ...ingenting, betegnelse: 'svar_ikke_godtatt', svar: { resultat: 'avslaatt' } },
      vederlag: {
        betegnelse: 'svar_ikke_godtatt',
        venter_paa_svar: false,
        svar_ikke_godtatt: true,
        kravet_staar: true,
        har_varsel: false,
        ingen_krav: false,
        krav: { beloep: 420000, metode: 'tilbud' },
        svar: { resultat: 'delvis_godkjent', beloep: 310000, subsidiaert: true },
        enighet: null,
      },
      frist: {
        betegnelse: 'enige',
        venter_paa_svar: false,
        svar_ikke_godtatt: false,
        kravet_staar: true,
        har_varsel: false,
        ingen_krav: false,
        krav: { dager: 15 },
        svar: { resultat: 'godkjent', dager: 15, subsidiaert: false },
        enighet: { dager: 15, virkning: 'betinget' },
      },
    });
    vis({ saker: [linje] });
    const r = rad('Endring i grunnarbeider');
    const [vederlag, frist] = [...r.querySelectorAll('.krevd')].map((c) =>
      c.querySelector('.verdi')!.textContent?.replace(/\s/g, ' ')
    );
    expect([vederlag, frist]).toEqual(['420 000 kr', '15 dager']);
    for (const ute of [
      '310 000',
      'Svar',
      'subsidiært',
      'Enige',
      'etter appens lesing',
      'Avslått',
      'Svaret er ikke godtatt',
    ])
      expect(r.textContent).not.toContain(ute);
  });

  it('cellen sier «Varslet», beregningsregelen eller «Ikke krevd» når det ikke er noe beløp eller dager (MM-U37, OV-U43)', () => {
    const vederlag = (
      krav: { beloep: number; metode: string } | null,
      betegnelse: 'varslet' | null
    ) => ({
      ...ingenting,
      betegnelse,
      kravet_staar: krav !== null,
      har_varsel: betegnelse === 'varslet',
      ingen_krav: false,
      krav,
      svar: null,
      enighet: null,
    });
    vis({
      saker: [
        lagSakslinje({
          sak_id: 'A',
          sakstittel: 'Regning',
          vederlag: vederlag({ beloep: 85000, metode: 'regningsarbeid' }, null),
        }),
        lagSakslinje({
          sak_id: 'B',
          sakstittel: 'Enhet',
          vederlag: vederlag({ beloep: 150000, metode: 'enhetspriser' }, null),
        }),
        lagSakslinje({
          sak_id: 'C',
          sakstittel: 'Varsel',
          vederlag: vederlag(null, 'varslet'),
          frist: {
            ...ingenting,
            betegnelse: 'varslet',
            kravet_staar: false,
            har_varsel: true,
            ingen_krav: false,
            krav: null,
            svar: null,
            enighet: null,
          },
        }),
        lagSakslinje({ sak_id: 'D', sakstittel: 'Ingenting' }),
      ],
    });
    const celler = (t: string) =>
      [...rad(t).querySelectorAll('.krevd .verdi')].map((c) => c.textContent);
    expect(celler('Regning')).toEqual(['Regningsarbeid', 'Ikke krevd']);
    // Et anslag ved enhetspriser er ikke et krav om et beløp, så beløpet vises ikke (svaret 02.11).
    expect(celler('Enhet')).toEqual(['Enhetspriser', 'Ikke krevd']);
    expect(celler('Varsel')).toEqual(['Varslet', 'Varslet']);
    expect(celler('Ingenting')).toEqual(['Ikke krevd', 'Ikke krevd']);
  });

  it('tallene i en sak i en endringsordre, et trukket krav og en sak TE har avsluttet, er dempet, og merket sier hva TE har gjort (MM-U38)', () => {
    const krav = (kravet_staar: boolean, betegnelse: 'trukket' | null = null) => ({
      ...ingenting,
      betegnelse,
      kravet_staar,
      har_varsel: false,
      ingen_krav: false,
      krav: { beloep: 100000, metode: 'tilbud' },
      svar: null,
      enighet: null,
    });
    vis({
      saker: [
        lagSakslinje({ sak_id: 'A', sakstittel: 'I EO', vederlag: krav(true) }),
        lagSakslinje({ sak_id: 'B', sakstittel: 'Trukket krav', vederlag: krav(false, 'trukket') }),
        lagSakslinje({
          sak_id: 'C',
          sakstittel: 'Avslag godtatt',
          saksbetegnelse: 'avslaget_paa_forholdet_godtatt',
          vederlag: krav(false),
        }),
        lagSakslinje({
          sak_id: 'D',
          sakstittel: 'Påberopelse trukket',
          saksbetegnelse: 'paaberopelsen_trukket',
          vederlag: krav(false, 'trukket'),
        }),
        lagSakslinje({ sak_id: 'E', sakstittel: 'Står', vederlag: krav(true) }),
      ],
      endringsordrer: { A: 'EO-03' },
    });
    const vederlaget = (t: string) => rad(t).querySelector('.krevd')!;
    for (const t of ['I EO', 'Trukket krav', 'Avslag godtatt', 'Påberopelse trukket'])
      expect(vederlaget(t).classList.contains('dempet'), t).toBe(true);
    expect(vederlaget('Står').classList.contains('dempet')).toBe(false);
    // Et trukket krav har ordet, ikke bare fargen; i en avsluttet sak sier merket det.
    expect(vederlaget('Trukket krav').textContent).toContain('trukket');
    expect(vederlaget('Påberopelse trukket').querySelector('.merknad')).toBeNull();
    expect(within(rad('Avslag godtatt')).getByText('Avslaget godtatt av TE')).toBeTruthy();
    expect(within(rad('Påberopelse trukket')).getByText('Påberopelsen trukket')).toBeTruthy();
  });

  it('infotipsene har hvert sitt navn, åpnes med klikk og lukkes med Escape med fokus tilbake på knappen (#1450, økt B punkt 3)', async () => {
    vis();
    const vederlag = screen.getByRole('button', { name: 'Om tallene for vederlag' });
    const frist = screen.getByRole('button', { name: 'Om tallene for fristforlengelse' });
    const lapp = document.getElementById(vederlag.getAttribute('aria-controls')!)!;
    expect(vederlag).toHaveAttribute('aria-expanded', 'false');
    expect(lapp).not.toBeVisible();

    await fireEvent.click(vederlag);
    expect(vederlag).toHaveAttribute('aria-expanded', 'true');
    expect(lapp).toBeVisible();
    expect(frist).toHaveAttribute('aria-expanded', 'false');

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(vederlag).toHaveAttribute('aria-expanded', 'false');
    expect(lapp).not.toBeVisible();
    expect(vederlag).toHaveFocus();
  });

  it('kortene heter bare det overskriften sier, også når infotipset er åpent (#1511)', async () => {
    vis();
    const kortet = (navn: string) => screen.getByRole('region', { name: navn });
    await fireEvent.click(screen.getByRole('button', { name: 'Om tallene for vederlag' }));
    expect(kortet('Vederlag eks. mva.')).toBeTruthy();
    expect(kortet('Fristforlengelse')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Vederlag eks. mva.' })).toBeTruthy();
  });

  it('nøkkeltallene summerer kravene med beløp utenfor endringsordrene, teller varsler og krav uten beløp for seg og summerer ikke dagene (MM-U38)', () => {
    const v = (beloep: number, metode = 'tilbud', kravet_staar = true) => ({
      ...ingenting,
      kravet_staar,
      har_varsel: false,
      ingen_krav: false,
      krav: { beloep, metode },
      svar: null,
      enighet: null,
    });
    const f = (dager: number) => ({
      ...ingenting,
      kravet_staar: true,
      har_varsel: false,
      ingen_krav: false,
      krav: { dager },
      svar: null,
      enighet: null,
    });
    vis({
      saker: [
        lagSakslinje({ sak_id: 'A', vederlag: v(420000), frist: f(15) }),
        lagSakslinje({ sak_id: 'B', vederlag: v(190000), frist: f(20) }),
        lagSakslinje({ sak_id: 'C', vederlag: v(85000, 'regningsarbeid') }),
        lagSakslinje({
          sak_id: 'D',
          vederlag: {
            ...v(0),
            betegnelse: 'varslet',
            kravet_staar: false,
            har_varsel: true,
            ingen_krav: false,
            krav: null,
          },
        }),
        // Utenfor summene: i en endringsordre, trukket og avsluttet av TE.
        lagSakslinje({ sak_id: 'E', vederlag: v(500000), frist: f(30) }),
        lagSakslinje({ sak_id: 'F', vederlag: v(60000, 'tilbud', false) }),
        lagSakslinje({
          sak_id: 'G',
          vederlag: v(95000),
          saksbetegnelse: 'avslaget_paa_forholdet_godtatt',
        }),
      ],
      endringsordrer: { E: 'EO-01' },
    });
    const [vederlag, frist] = [...document.querySelectorAll('.spor-kort')] as HTMLElement[];
    expect(vederlag.querySelector('.hv')!.textContent?.replace(/\s+/g, ' ')).toBe('610 000 kr');
    expect(vederlag.querySelector('.hm')!.textContent).toBe('2 krav · 1 varslet · 1 uten beløp');
    expect(frist.querySelector('.hv')!.textContent).toBe('2 krav');
    expect(frist.textContent).not.toContain('35');
  });

  it('«Varslet» står og telles når betegnelsen er en annen: etter en forespørsel etter punkt 33.6.2, dempet og ikke telt når sporet er trukket, og «Ikke krevd» etter «ingen krav» (MM-U37, MM-U38, KA-U12)', () => {
    type Betegnelse = 'spesifisert_krav_etterspurt' | 'trukket' | 'ingen_krav' | null;
    const varsel = (betegnelse: Betegnelse, har_varsel = true, ingen_krav = false) => ({
      ...ingenting,
      betegnelse,
      kravet_staar: false,
      har_varsel,
      ingen_krav,
      krav: null,
      svar: null,
      enighet: null,
    });
    vis({
      saker: [
        lagSakslinje({
          sak_id: 'A',
          sakstittel: 'Etterspurt',
          frist: varsel('spesifisert_krav_etterspurt'),
        }),
        // Sporet er trukket, og saken er ikke avsluttet av TE.
        lagSakslinje({ sak_id: 'B', sakstittel: 'Trukket', frist: varsel('trukket') }),
        lagSakslinje({
          sak_id: 'C',
          sakstittel: 'Påberopelse trukket',
          saksbetegnelse: 'paaberopelsen_trukket',
          frist: varsel('trukket'),
        }),
        lagSakslinje({ sak_id: 'D', sakstittel: 'Uten varsel', frist: varsel(null, false) }),
        // KA-U12: «ingen krav» etter varselet, også når en forespørsel gir en annen betegnelse.
        lagSakslinje({
          sak_id: 'E',
          sakstittel: 'Ingen krav',
          frist: varsel('spesifisert_krav_etterspurt', true, true),
        }),
      ],
    });
    const fristen = (t: string) => rad(t).querySelectorAll('.krevd')[1]!;
    const tekst = (t: string) => fristen(t).querySelector('.verdi')!.textContent;
    expect(tekst('Etterspurt')).toBe('Varslet');
    expect(fristen('Etterspurt').classList.contains('dempet')).toBe(false);
    expect(tekst('Trukket')).toBe('Varslet');
    expect(fristen('Trukket').classList.contains('dempet')).toBe(true);
    expect(fristen('Trukket').textContent).toContain('trukket');
    expect(tekst('Påberopelse trukket')).toBe('Varslet');
    expect(fristen('Påberopelse trukket').classList.contains('dempet')).toBe(true);
    expect(within(rad('Påberopelse trukket')).getByText('Påberopelsen trukket')).toBeTruthy();
    expect(tekst('Uten varsel')).toBe('Ikke krevd');
    expect(tekst('Ingen krav')).toBe('Ikke krevd');
    const frist = document.querySelectorAll('.spor-kort')[1] as HTMLElement;
    expect(frist.querySelector('.hm')!.textContent).toBe('1 varslet');
  });

  it('utvalget, søket og sorteringen avgrenser og ordner lista, og uten treff kan alle sakene vises igjen (prototypen v2)', async () => {
    vis({
      saker: [
        lagSakslinje({
          sak_id: 'A',
          sakstittel: 'Gammel',
          // En senere hendelse som ikke er et brev, flytter ikke saken opp.
          siste_hendelse: '2026-11-01T10:00:00Z',
          siste_brev: { avsender: 'TE', registrert: '2026-09-01T10:00:00Z' },
          opprettet: '2026-09-01T10:00:00Z',
        }),
        lagSakslinje({
          sak_id: 'B',
          sakstittel: 'Ny',
          siste_hendelse: '2026-10-30T10:00:00Z',
          siste_brev: { avsender: 'BH', registrert: '2026-10-30T10:00:00Z' },
          opprettet: '2026-08-01T10:00:00Z',
        }),
        lagSakslinje({
          sak_id: 'C',
          sakstittel: 'Trukket',
          saksbetegnelse: 'paaberopelsen_trukket',
          siste_hendelse: '2026-10-01T10:00:00Z',
          siste_brev: null,
          opprettet: '2026-10-01T10:00:00Z',
        }),
      ],
      endringsordrer: { A: 'EO-07' },
    });
    const titler = () =>
      screen
        .queryAllByRole('link')
        .map((l) => l.textContent)
        .filter((t) => t !== 'Nytt krav om endringsordre');
    expect(titler()).toEqual(['Ny', 'Trukket', 'Gammel']);
    await fireEvent.click(screen.getByRole('button', { name: 'Opprettet' }));
    expect(titler()).toEqual(['Trukket', 'Gammel', 'Ny']);

    await fireEvent.click(screen.getByRole('button', { name: 'Inngår i EO' }));
    expect(titler()).toEqual(['Gammel']);
    await fireEvent.click(screen.getByRole('button', { name: 'Avsluttet av TE' }));
    expect(titler()).toEqual(['Trukket']);
    await fireEvent.click(screen.getByRole('button', { name: 'Alle' }));

    await fireEvent.input(screen.getByRole('searchbox', { name: 'Søk i sakene' }), {
      target: { value: 'eo-07' },
    });
    expect(titler()).toEqual(['Gammel']);
    // Statusområdet står før det får tekst, så skjermleseren melder endringen (WCAG 4.1.3).
    const status = screen.getByRole('status');
    expect(status.textContent?.trim()).toBe('');
    await fireEvent.input(screen.getByRole('searchbox', { name: 'Søk i sakene' }), {
      target: { value: 'xyz' },
    });
    expect(screen.getByRole('status')).toBe(status);
    expect(screen.getByRole('status').textContent).toContain('Ingen saker passer med «xyz».');
    await fireEvent.click(screen.getByRole('button', { name: 'Vis alle sakene' }));
    expect(titler()).toHaveLength(3);
  });

  it('en sak kjernen ikke forstår, viser ingen tall og ingen egen tekst, og er ikke med i summene (MM-U39, MM-U2)', () => {
    vis({
      saker: [
        lagSakslinje({
          forstaatt: false,
          saksbetegnelse: 'ikke_forstaatt',
          hovedkategori: null,
          vederlag: {
            ...ingenting,
            kravet_staar: true,
            har_varsel: false,
            ingen_krav: false,
            krav: { beloep: 1000, metode: 'tilbud' },
            svar: null,
            enighet: null,
          },
        }),
      ],
    });
    const r = rad('Endring i grunnarbeider');
    expect(r.querySelectorAll('.verdi').length).toBe(0);
    expect(r.textContent).not.toContain('Ikke forstått');
    expect(document.querySelector('.spor-kort .hv')!.textContent?.replace(/\s+/g, ' ')).toBe(
      '0 kr'
    );
  });

  it('merket «Inngår i EO-‹kode›» står på KOE-saken som en sendt endringsordre omfatter (EO-U13)', () => {
    vis({
      saker: [
        lagSakslinje({ sak_id: 'A', sakstittel: 'Med' }),
        lagSakslinje({ sak_id: 'B', sakstittel: 'Uten' }),
      ],
      endringsordrer: { A: 'EO-03' },
    });
    expect(within(rad('Med')).getByText('Inngår i EO-03')).toBeTruthy();
    expect(within(rad('Uten')).queryByText(/Inngår i/)).toBeNull();
  });

  it('TE ser «Nytt krav om endringsordre» til skjemaet, BH ser den ikke, og «Ny endringsordre» står ikke (KT-U10, #1450 punkt 7–8)', () => {
    vis({ part: 'TE' });
    expect(
      screen.getByRole('link', { name: 'Nytt krav om endringsordre' }).getAttribute('href')
    ).toBe('/p1/ny');
    expect(screen.getByText('Du er totalentreprenør (TE)')).toBeTruthy();
    cleanup();

    for (const part of ['BH', null] as const) {
      vis({ part });
      expect(screen.queryByRole('link', { name: 'Nytt krav om endringsordre' })).toBeNull();
      expect(screen.queryByText('Ny endringsordre')).toBeNull();
      cleanup();
    }
  });
});

describe('Saken i Varden etter at skallet er trukket ut', () => {
  it('«Saken finnes ikke» lenker tilbake til sakslisten (#1473, punkt 4)', async () => {
    const demosak = lagDemosak(finnForloep('BF-01')!, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: vi.fn().mockRejectedValue(new ApiError(404, 'Saken finnes ikke.')),
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, saksliste: '/p1' });
    const feil = await screen.findByRole('alert');
    expect(within(feil).getByRole('heading', { name: 'Saken finnes ikke' })).toBeTruthy();
    expect(within(feil).getByRole('link', { name: 'Til sakslisten' }).getAttribute('href')).toBe(
      '/p1'
    );
  });
});
