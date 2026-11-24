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
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { minnebane } from '#kjerne/tester/bane.ts';
import { kjoer, type Forloep } from '#kjerne/tester/kjoerer.ts';
import type { Handling } from '#kjerne/tester/klient.ts';
import { START } from '#kjerne/tester/brukerforloep.ts';
import { testklokke } from '#kjerne/tester/testmiljoe.ts';
import type { Part } from '#kjerne/typer.ts';
import Fristoversikt from '#lib/components/varden/Fristoversikt.svelte';
import { maalestokken } from '#lib/components/varden/Maalrad.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import {
  MERKING,
  SAK,
  linje,
  medFristvarsel,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import {
  gjeldendeFrist,
  kravetOgSvaretIFristen,
  nyFrist,
} from '#lib/components/varden/fristoversikt.ts';
import { brevene, type Fristtabellen } from '#lib/components/varden/lesing.ts';
import { FRISTEN, HANDLINGENE } from '#lib/components/varden/tekster/index.ts';

afterEach(cleanup);

/** `getByText` normaliserer teksten på siden, ikke den den leter etter, og hardt mellomrom blir vanlig (#2049). */
const utenHardeMellomrom = (t: string) => t.replaceAll('\u00a0', ' ');

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
      // Lesepunktet regner datoen med kjernen, og listen, uten dagene i saken selv. Utvalget prøves
      // i `kjerne/tester/fristtabell.test.ts` og gjennom lesepunktet i `Fristkrav.test.ts`.
      gjeldende: '2027-08-26',
      forlengelserIAndreSaker: [
        { sakId: 'annen', sakskode: { kode: 'koe', loepenummer: 9 }, dager: 10 },
      ],
    },
    {
      fristId: 2,
      dato: '2027-06-01',
      dagmulktbelagt: false,
      forlengelser: [],
      gjeldende: '2027-06-01',
      forlengelserIAndreSaker: [],
    },
  ],
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
      ['subsidiært', null, 'hindring'],
    ]);
    expect(k.perFrist.map((l) => l.etikett)).toEqual(['subsidiært', 'videre subsidiært']);
    expect(k.frister.map((f) => f.lagene.map((l) => l.dager))).toEqual([
      [0, 0],
      [8, 14],
      [8, 14],
    ]);
    expect(k.forbehold).toBe(true);
  });

  it('hindringen leses fra det fryste laget og avslaget fra laget og begrunnelsen i brevet (U-3, U-13, D-3, KA-U80, KA-U84)', async () => {
    const u = await utledning(BF45.steg);
    const k = kravetOgSvaretIFristen(u, brevene(u))!;
    expect(k.utenLag).toEqual([]);
    expect(k.felles[1]?.vilkaar).toEqual([{ art: 'varsel', hjemmel: '33.4' }]);
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

describe('Målestokken for dagene (U-2)', () => {
  it('skalaen slutter på neste runde trinn, så det største kravet ikke fyller målet, og trinnet ved enden står, som i prototypen', () => {
    const m = maalestokken(25, true);
    expect(m.trinn).toEqual([0, 10, 20, 30]);
    expect(m.andel(25)).toBe(`${(25 / 30) * 100}%`);
    expect(maalestokken(20, true).trinn).toEqual([0, 5, 10, 15, 20, 25]);
  });
});

describe('Gjeldende frist og ny frist (U-5, D-9, KA-U77)', () => {
  it('gjeldende frist er datoen fra lesepunktet, med forlengelsene i andre saker og ikke i saken selv, og ny frist regnes fra den', () => {
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

  it('gjeldende frist er ukjent når kjernen ikke kan regne datoen, fordi en annen sak den ikke forstår, kan ha forlenget fristen (MM-U2)', () => {
    const datoer = TABELLEN.datoer.map((d) => ({ ...d, gjeldende: null }));
    const ukjent = gjeldendeFrist(2, { ...TABELLEN, datoer });
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
      screen.getByRole('heading', { name: 'Fristforlengelse pkt.\u00a033', level: 2 })
    ).toBeTruthy();
    const krav = screen.getByText('Frist 3: 25 dager. Frist 2: 20 dager. Frist 8: 20 dager.');
    expect(krav.closest('li')?.textContent).toContain('Krav om fristforlengelse');
    const varsel = screen.getByText(utenHardeMellomrom(FRISTEN.varselUtenDager)).closest('li')!;
    expect(varsel.textContent).toContain('Varsel om fristforlengelse');
    expect(varsel.textContent).toContain('Totalentreprenøren ble klar over forholdet');
    expect(screen.getByText(/^Akseptfrist:/).closest('li')?.textContent).toContain(
      'Svar på krav om fristforlengelse'
    );
  });

  it('dagene i et krav et senere krav i fristen følger opp, står dempet, som på siden for vederlaget (U-5 i BF-44, #2032)', async () => {
    const nyttKrav = {
      handling: 'krav',
      spor: 'frist',
      frister: [
        { frist_id: 2, dager: 30 },
        { frist_id: 1, dager: 20 },
        { nummer: '8', navn: 'Overtakelse av utomhusarbeider', dager: 20 },
      ],
      navn: 'K-f2',
    } as Handling;
    await vis([...BF45.steg.slice(0, 3), nyttKrav]);
    const rader = within(screen.getByRole('list', { name: 'Brevene, nyeste først' })).getAllByRole(
      'listitem'
    );
    const krav = rader.filter((r) => r.textContent?.includes('Krav om fristforlengelse'));
    expect(krav.map((r) => r.querySelector('.oeverst')?.classList.contains('eldre-krav'))).toEqual([
      false,
      true,
    ]);
  });

  it('et registrert brev står med datoen det kom i saken, og sendedatoen i linja under (svar 1 A i #1999, OV-U85)', async () => {
    await vis(BF45.steg);
    const rad = screen.getByText('Revidert fremdriftsplan, revisjon 4').closest('li')!;
    expect(rad.querySelector('.dato')?.textContent?.trim()).toBe('1. okt. 2026');
    expect(rad.textContent).toContain('Sendt 30. september 2026, ifølge byggherren.');
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
        'Byggherren legger til grunn at fremdriften er hindret, og at hindringen skyldes forholdet.'
      )
    ).toBeTruthy();
    expect(
      alle.getByText(
        'Hvis innsigelsen om at varselet etter punkt 33.4 kom for sent ikke fører frem'
      )
    ).toBeVisible();
    const per = within(kort.getByRole('region', { name: FRISTEN.perFrist }));
    // U-4 i BF-45 (D2 b i #2180).
    const vilkaarene = kort
      .getByRole('region', { name: FRISTEN.perFrist })
      .querySelector('ul.vilkaar');
    expect(vilkaarene).not.toBeNull();
    expect(
      within(vilkaarene as HTMLElement)
        .getAllByRole('listitem')
        .map((l) => utenHardeMellomrom(l.textContent!.trim()))
    ).toEqual([
      'Hvis innsigelsen om at varselet etter punkt 33.4 kom for sent ikke fører frem',
      // Det tredje laget: «heller ikke», som brevets «Videre subsidiært» (LV-U4 punkt 4).
      'Hvis heller ikke innsigelsen om spesifiseringen fører frem',
    ]);
    expect(per.queryByText(/godkjenner dagene byggherren måtte forstå/)).toBeNull();
    const overtakelse = within(per.getByRole('region', { name: /^Frist 2\s+Overtakelse$/ }));
    expect(
      overtakelse.getByText(
        /Gjeldende frist er 26\. august 2027\. I kontrakten er fristen 16\. august/
      ).textContent
    ).toMatch(/Sak\s+KOE-9\s+forlenget fristen med 10 dager\.$/);
    expect(overtakelse.getByRole('link', { name: 'KOE-9' }).getAttribute('href')).toBe('/p/annen');
    expect(overtakelse.getByText(/ny frist 15\. september 2027/)).toBeTruthy();
    expect(overtakelse.getByText(/ny frist 9\. september 2027/)).toBeTruthy();
    // Radene per frist heter etter vilkåret i kortform (svar 2 B 19.11 i
    // docs/vedlegg/stabelen-2163-2026-11-19/sporsmal.md).
    expect(
      within(overtakelse.getByRole('list', { name: 'Overtakelse' }))
        .getAllByRole('listitem')
        .map((l) => l.textContent!.match(/^\s*(\D+?)\s*\d/)?.[1])
    ).toEqual(['Krevd', 'Hvis varselet kom i tide', 'Hvis også spesifiseringen kom i tide']);
    // Det første laget med standpunkt leder, og laget under er dempet (#2180 R1-1, U-2).
    expect(
      [...overtakelse.getByRole('list', { name: 'Overtakelse' }).querySelectorAll('.lagrad')].map(
        (r) => r.classList.contains('dempet')
      )
    ).toEqual([false, false, true]);
    // Skalaen slutter på trinnet over det største kravet, 25 dager (#2180 R2-3).
    expect(
      [...kort.getAllByText((_, e) => e?.classList.contains('trinn') ?? false)].map((t) =>
        [...t.children].map((c) => c.textContent)
      )
    ).toEqual(Array(3).fill(['0', '10', '20', '30']));
    const mekanisk = within(per.getByRole('region', { name: /^Frist 3\s+Mekanisk/ }));
    expect(
      mekanisk.getByText('Gjeldende frist er 1. juni 2027. Det er datoen i kontrakten.')
    ).toBeTruthy();
    expect(
      mekanisk.getByText(
        'Byggherren avslår dagene for fristen. Fremdriften for mekanisk ferdigstillelse er ikke hindret av forholdet.'
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
  it('«Oppdater kravet» står ved svaret med linja om fristene, og forseringen står foran «Trekk kravet» (svar 3 A og 4 A, FO-U1, OV-U2)', async () => {
    await demosaken('te-har-mottatt-svaret', 'TE');
    const revider = screen.getByRole('button', { name: HANDLINGENE.revidertKrav });
    expect(revider.closest('li')?.textContent).toContain('Svar på krav om fristforlengelse');
    const andre = within(screen.getByRole('region', { name: HANDLINGENE.andre }));
    const rader = andre.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(rader.findIndex((t) => t.includes('Anse avslaget som pålegg om forsering'))).toBe(
      rader.findIndex((t) => t.includes('Trekk kravet')) - 1
    );
    expect(andre.getByText(FRISTEN.forseringLinje)).toBeTruthy();
    expect(andre.getByText(FRISTEN.trekkEtterSvar)).toBeTruthy();
  });

  it('skjemaet for det nye kravet sier at svaret ikke kan godtas her når brevet er sendt, og ikke at byggherren ikke er bundet (MM-U34 punkt 1)', async () => {
    await demosaken('te-har-mottatt-svaret', 'TE');
    await fireEvent.click(screen.getByRole('button', { name: HANDLINGENE.revidertKrav }));
    expect(
      await screen.findByText(/Når du sender brevet, kan du ikke godta det svaret her\./)
    ).toBeTruthy();
    expect(screen.queryByText(/bundet/)).toBeNull();
  });

  it('i «Andre handlinger» står en linje bare under forseringen og trekket (U-6 i BF-45)', async () => {
    await demosaken('te-har-mottatt-svaret', 'TE');
    const andre = screen.getByRole('region', { name: HANDLINGENE.andre });
    const linjer = [...andre.querySelectorAll('button .b')].map((l) => l.textContent);
    expect(linjer).toEqual([FRISTEN.forseringLinje, FRISTEN.trekkEtterSvar]);
  });

  it('byggherren har ikke forseringen (FO-U1)', async () => {
    await demosaken('te-har-mottatt-svaret', 'BH');
    expect(screen.queryByText('Anse avslaget som pålegg om forsering')).toBeNull();
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
        sakskode: null,
        kontraktsforkortelse: null,
        kan_foreslaa_sakskode: false,
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
      /Svarer totalentreprenøren ikke uten ugrunnet opphold, tapes kravet på fristforlengelse \(punkt\u00a033\.6\.2 tredje ledd\)\.$/
    );
    const svar = screen.getByRole('button', { name: FRISTEN.svarPaaForesporsel });
    expect(svar.closest('li')).toBe(veiledning.closest('li'));
    const kortet = within(screen.getByRole('region', { name: FRISTEN.utenKrav }));
    expect(kortet.getByText(/^Dagene er ikke angitt\. Totalentreprenøren varslet i /)).toBeTruthy();
  });

  it('BH ser forespørselen og veiledningen, uten handlingen', async () => {
    await forespoerselen('BH');
    expect(screen.getByText(/^Byggherren ba om dagene /)).toBeTruthy();
    expect(screen.queryByRole('button', { name: FRISTEN.svarPaaForesporsel })).toBeNull();
  });
});
