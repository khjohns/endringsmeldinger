/**
 * Siden for fristforlengelsen etter BF-45 (#1927). Sakene kjøres gjennom kjernen i minnet med
 * testklienten, så utledningen og brevene er kjernens. Forventningene har kildene i bestillingen
 * BF-45 (U-2–U-13, D-1–D-3, D-9, D-10, D-12) og vedtakene de viser til: MM-U50 for dagene som i
 * brevet, OV-U32 og KA-U78 for lagene, VS-U20 for varselet som gjelder alle fristene, KA-U80 og
 * OV-U42 for hindringen og avslaget av én frist, KA-U77 for gjeldende frist, GR-U34 for forbeholdet
 * og FO-U1 og OV-U2 for forseringen.
 */

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import { minnebane } from '$kjerne/tester/bane';
import { kjoer, type Forloep } from '$kjerne/tester/kjoerer';
import type { Handling } from '$kjerne/tester/klient';
import { START } from '$kjerne/tester/brukerforloep';
import { testklokke } from '$kjerne/tester/testmiljoe';
import type { Part } from '$kjerne/typer';
import Fristoversikt from '$lib/components/varden/Fristoversikt.svelte';
import Vardensak from '$lib/components/varden/Vardensak.svelte';
import { finnForloep, lagDemosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import {
  MERKING,
  SAK,
  linje,
  medFristvarsel,
  skrevet,
} from '$lib/kjernesak/__tests__/provejournal';
import {
  gjeldendeFrist,
  kravetOgSvaretIFristen,
  nyFrist,
  prinsipaltAvslaatteDager,
} from '$lib/components/varden/fristoversikt';
import { brevene, type Fristtabellen } from '$lib/components/varden/lesing';
import { FRISTEN, HANDLINGENE } from '$lib/components/varden/tekster';

afterEach(cleanup);

/** Stegene i startjournalen for BF-45 (G-8): tre frister, tre lag og avslaget for én frist. */
const BF45 = JSON.parse(readFileSync('docs/domenetabell/brukerforlop/BF-45.json', 'utf8')) as {
  steg: Handling[];
};

async function utledning(steg: Handling[]) {
  const forloep: Forloep = { id: 'fristsiden', rader: [], start: null, steg, kontroller: [] };
  const valg = { klokke: testklokke(START) };
  return (await kjoer(forloep, minnebane({ sakstittel: 'Pelingen' }), { valg })).utledning();
}

/** Fristtabellen med datoene, en forlengelse i en annen sak og en i saken selv (KA-U77). */
const TABELLEN: Fristtabellen = {
  datoer: [
    {
      fristId: 1,
      dato: '2027-08-16',
      dagmulktbelagt: true,
      forlengelser: [
        { sakId: 'annen', sakskode: { kode: 'koe', loepenummer: 9 }, dager: 10 },
        { sakId: 'denne', sakskode: { kode: 'koe', loepenummer: 17 }, dager: 14 },
      ],
    },
    { fristId: 2, dato: '2027-06-01', dagmulktbelagt: false, forlengelser: [] },
  ],
  sakId: 'denne',
  ikkeForstaatt: [],
  sakslenke: (id) => `/p/${id}`,
};

async function vis(steg: Handling[]) {
  const u = await utledning(steg);
  render(Fristoversikt, {
    u,
    betegnelser: { forhold: null, vederlag: null, frist: null },
    fristtabell: TABELLEN,
    onles: () => {},
  });
  return u;
}

describe('Kravet og svaret i fristen, lest av kjernen (BF-45)', () => {
  it('lagene som gjelder hele kravet, står én gang, og lagene per frist har dagene byggherren sendte (U-3, U-4, D-1, D-2, OV-U32, KA-U78)', async () => {
    const u = await utledning(BF45.steg);
    const k = kravetOgSvaretIFristen(u, brevene(u))!;
    expect(k.frister.map((f) => [f.nummer, f.navn, f.fristId, f.krevd])).toEqual([
      ['3', 'Mekanisk ferdigstillelse', 2, 25],
      ['2', 'Overtakelse', 1, 20],
      ['8', 'Overtakelse av utomhusarbeider', null, 20],
    ]);
    // VS-U20: påberopelsen av at varselet kom for sent, gjelder varselet og dermed alle fristene.
    expect(k.felles.map((l) => [l.etikett, l.dager, l.standpunkter[0]?.standpunkt.art])).toEqual([
      ['prinsipalt', 0, 'rettidighet'],
    ]);
    expect(k.perFrist.map((l) => l.etikett)).toEqual(['subsidiært', 'videre subsidiært']);
    expect(k.frister.map((f) => f.lagene.map((l) => l.dager))).toEqual([
      [0, 0],
      [8, 14],
      [8, 14],
    ]);
    expect(k.forbehold).toBe(true);
  });

  it('at fremdriften er hindret, står uten eget lag, og avslaget for én frist står med laget og begrunnelsen i brevet (U-3, U-13, D-3, KA-U80, OV-U42)', async () => {
    const u = await utledning(BF45.steg);
    const k = kravetOgSvaretIFristen(u, brevene(u))!;
    expect(k.utenLag.map((s) => [s.standpunkt.art, s.vilkaar])).toEqual([
      ['hindring', [{ art: 'varsel', hjemmel: '33.4' }]],
    ]);
    expect(k.frister.map((f) => f.avslag)).toEqual([
      {
        etikett: 'videre subsidiært',
        begrunnelse: 'Fremdriften for mekanisk ferdigstillelse er ikke hindret av forholdet.',
      },
      null,
      null,
    ]);
  });

  it('før svaret har fristene bare dagene i kravet', async () => {
    const u = await utledning(BF45.steg.slice(0, 3));
    const k = kravetOgSvaretIFristen(u, brevene(u))!;
    expect(k.svarbrev).toBeNull();
    expect(k.frister.map((f) => [f.krevd, f.lagene])).toEqual([
      [25, []],
      [20, []],
      [20, []],
    ]);
  });
});

describe('Gjeldende frist og ny frist (U-5, D-9, KA-U77)', () => {
  it('gjeldende frist har forlengelsene i andre saker, ikke i saken selv, og ny frist regnes fra den', () => {
    const g = gjeldendeFrist(1, TABELLEN);
    expect(g).toEqual({
      art: 'kjent',
      dato: '2027-08-26',
      iKontrakten: '2027-08-16',
      forlengelser: [{ sakId: 'annen', sakskode: { kode: 'koe', loepenummer: 9 }, dager: 10 }],
    });
    expect(nyFrist(g, 20)).toBe('2027-09-15');
    expect(nyFrist(g, 0)).toBeNull();
  });

  it('en annen sak kjernen ikke forstår, gjør gjeldende frist ukjent; saken selv gjør det ikke (MM-U2)', () => {
    expect(gjeldendeFrist(2, { ...TABELLEN, ikkeForstaatt: ['denne'] })?.art).toBe('kjent');
    const ukjent = gjeldendeFrist(2, { ...TABELLEN, ikkeForstaatt: ['tredje'] });
    expect(ukjent).toEqual({ art: 'ukjent', iKontrakten: '2027-06-01' });
    expect(nyFrist(ukjent, 20)).toBeNull();
  });

  it('en frist som ikke er registrert, har ingen gjeldende frist (KA-U79)', () => {
    expect(gjeldendeFrist(null, TABELLEN)).toBeNull();
  });
});

describe('Siden for fristforlengelsen', () => {
  it('tråden har dagene for hver frist ved kravet, varselet uten dager og akseptfristen ved svaret (U-1, U-8, U-11, U-12)', async () => {
    await vis(BF45.steg);
    expect(
      screen.getByRole('heading', { name: 'Fristforlengelse pkt. 33', level: 2 })
    ).toBeTruthy();
    const krav = screen.getByText('Frist 3: 25 dager. Frist 2: 20 dager. Frist 8: 20 dager.');
    expect(krav.closest('li')?.textContent).toContain('Krav om fristforlengelse');
    const varsel = screen.getByText(FRISTEN.varselUtenDager).closest('li')!;
    expect(varsel.textContent).toContain('Varsel om fristforlengelse');
    expect(varsel.textContent).toContain('Totalentreprenøren ble klar over forholdet');
    expect(screen.getByText(/^Akseptfrist:/).closest('li')?.textContent).toContain(
      'Svar på krav om fristforlengelse'
    );
  });

  it('kortet har «For alle fristene», vilkårene én gang under «Per frist» og én blokk per frist med gjeldende frist og ny frist (U-2–U-5, U-13)', async () => {
    await vis(BF45.steg);
    const kort = within(screen.getByRole('region', { name: 'Kravet og svaret' }));
    expect(kort.getByText('Kravet i brev 3 og svaret i brev 4')).toBeTruthy();
    const alle = within(kort.getByRole('region', { name: FRISTEN.forAlle }));
    expect(
      alle.getByText(
        'Byggherren gjør gjeldende at varselet etter punkt 33.4 i brev 2 kom for sent.'
      )
    ).toBeTruthy();
    expect(
      alle.getByText(
        'Hvis innsigelsen om varselet etter punkt 33.4 ikke fører frem, legger byggherren til grunn at fremdriften er hindret, og at hindringen skyldes forholdet.'
      )
    ).toBeTruthy();
    const per = within(kort.getByRole('region', { name: FRISTEN.perFrist }));
    expect(
      per
        .getAllByRole('listitem')
        .slice(0, 2)
        .map((l) => l.textContent?.replace(/\s+/g, ' ').trim())
    ).toEqual([
      'Subsidiært, hvis innsigelsen om varselet etter punkt 33.4 ikke fører frem: Byggherren gjør gjeldende at kravet ble spesifisert for sent (punkt 33.6.1), og godkjenner dagene byggherren måtte forstå.',
      'Videre subsidiært, hvis heller ikke innsigelsen om spesifiseringen fører frem: dagene byggherren godkjenner.',
    ]);
    const overtakelse = within(per.getByRole('region', { name: /^Frist 2\s+Overtakelse$/ }));
    expect(
      overtakelse.getByText(/Gjeldende frist 26\. august 2027: 16\. august i kontrakten/)
        .textContent
    ).toMatch(/forlenget 10 dager i sak\s*KOE-9\.$/);
    expect(overtakelse.getByRole('link', { name: 'KOE-9' }).getAttribute('href')).toBe('/p/annen');
    expect(overtakelse.getByText(/ny frist 15\. september 2027/)).toBeTruthy();
    expect(overtakelse.getByText(/ny frist 9\. september 2027/)).toBeTruthy();
    const mekanisk = within(per.getByRole('region', { name: /^Frist 3\s+Mekanisk/ }));
    expect(mekanisk.getByText('Gjeldende frist 1. juni 2027, som i kontrakten.')).toBeTruthy();
    expect(
      mekanisk.getByText(
        'Videre subsidiært avslår byggherren dagene for fristen: fremdriften for mekanisk ferdigstillelse er ikke hindret av forholdet.'
      )
    ).toBeTruthy();
    const utomhus = within(per.getByRole('region', { name: /^Frist 8\s+Overtakelse av/ }));
    expect(utomhus.getByText(FRISTEN.ikkeRegistrert)).toBeTruthy();
    expect(utomhus.queryByText(/ny frist/)).toBeNull();
    expect(kort.getAllByText(/gis under forutsetning av at forholdet gir grunnlag/)).toHaveLength(
      1
    );
  });
});

/** Saken i demoruta fra kontrollpunktet, som parten. */
async function demosaken(punkt: string, part: Part) {
  const demosak = lagDemosak(finnForloep('BF-45')!, punkt, part);
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part,
    hent: demosak.hent,
    send: demosak.send,
  });
  await kjernesak.last();
  render(Vardensak, { kjernesak, spor: 'frist' });
  await screen.findByRole('list', { name: 'Brevene, nyeste først' });
}

describe('Handlingene på siden for fristforlengelsen (U-6, D-12)', () => {
  it('«Revider krav» står ved svaret med linja om fristene, og forseringen står foran «Trekk kravet» (svar 3 A og 4 A, FO-U1, OV-U2)', async () => {
    await demosaken('te-har-mottatt-svaret', 'TE');
    const revider = screen.getByRole('button', { name: HANDLINGENE.revidertKrav });
    expect(revider.closest('li')?.textContent).toContain('Svar på krav om fristforlengelse');
    expect(screen.getByText(new RegExp(FRISTEN.endreEllerTaUt))).toBeTruthy();
    const andre = within(screen.getByRole('region', { name: HANDLINGENE.andre }));
    const rader = andre.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(rader.findIndex((t) => t.includes('Anse avslaget som pålegg om forsering'))).toBe(
      rader.findIndex((t) => t.includes('Trekk kravet')) - 1
    );
    expect(andre.getByText(FRISTEN.forseringLinje)).toBeTruthy();
  });

  it('byggherren har ikke forseringen (FO-U1)', async () => {
    await demosaken('te-har-mottatt-svaret', 'BH');
    expect(screen.queryByText('Anse avslaget som pålegg om forsering')).toBeNull();
  });

  it('forseringen leser at byggherren prinsipalt har avslått dager (FO-U1)', async () => {
    expect(prinsipaltAvslaatteDager(await utledning(BF45.steg))).toBe(true);
    expect(prinsipaltAvslaatteDager(await utledning(BF45.steg.slice(0, 3)))).toBe(false);
  });
});

describe('Byggherrens forespørsel etter punkt 33.6.2 (U-6, U-9, D-10)', () => {
  /** Byggherren ber om dagene etter varselet (VS-U47). */
  const medForesporsel = skrevet(medFristvarsel, 'BH', {
    type: 'foresporsel',
    spor: 'frist',
    hjemmel: '33.6.2',
  });

  async function forespoerselen(part: Part) {
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      part,
      hent: async () => ({
        versjon: medForesporsel.at(-1)!.versjon,
        part,
        visning: null as never,
        journal: medForesporsel.map(linje),
        leveringsoppdrag: [],
        catenda_lenke: null,
        merking: MERKING,
      }),
      send: async () => ({ event_id: 'e-1', leveringsoppdrag: 'l-1', versjon: 1 }),
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'frist' });
    await screen.findByRole('list', { name: 'Brevene, nyeste først' });
  }

  it('TE ser veiledningen med datoen og dagene siden under forespørselen, og «Svar på forespørselen» ved den', async () => {
    await forespoerselen('TE');
    const veiledning = screen.getByText(/^Byggherren ba om dagene /);
    expect(veiledning.textContent).toMatch(
      /Svarer totalentreprenøren ikke uten ugrunnet opphold, tapes kravet på fristforlengelse \(punkt 33\.6\.2 tredje ledd\)\.$/
    );
    const svar = screen.getByRole('button', { name: FRISTEN.svarPaaForesporsel });
    expect(svar.closest('li')).toBe(veiledning.closest('li'));
    expect(screen.getByText(FRISTEN.virkningForesporsel)).toBeTruthy();
    const kortet = within(screen.getByRole('region', { name: FRISTEN.utenKrav }));
    expect(kortet.getByText(/^Dagene er ikke angitt\. Totalentreprenøren varslet i /)).toBeTruthy();
  });

  it('BH ser forespørselen og veiledningen, uten handlingen', async () => {
    await forespoerselen('BH');
    expect(screen.getByText(/^Byggherren ba om dagene /)).toBeTruthy();
    expect(screen.queryByRole('button', { name: FRISTEN.svarPaaForesporsel })).toBeNull();
  });
});
