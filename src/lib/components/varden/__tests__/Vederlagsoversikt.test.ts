/**
 * Siden for vederlaget etter BF-44 (#1906). Sakene kjøres gjennom kjernen i minnet med
 * testklienten, så utledningen og brevene er kjernens. Forventningene har kildene i bestillingen
 * BF-44 (U-2–U-4, U-11–U-14, D-1–D-3) og vedtakene de viser til: MM-U50 og OV-U73 for tallene som
 * i brevet, OV-U32 og LV-U4 punkt 4 for lagene, GR-U34 for forbeholdet og HF-U23 for akseptfristen.
 */

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { minnebane } from '$kjerne/tester/bane';
import { kjoer, type Forloep } from '$kjerne/tester/kjoerer';
import type { Handling } from '$kjerne/tester/klient';
import { START } from '$kjerne/tester/brukerforloep';
import { testklokke } from '$kjerne/tester/testmiljoe';
import Vardensak from '$lib/components/varden/Vardensak.svelte';
import Vederlagsoversikt from '$lib/components/varden/Vederlagsoversikt.svelte';
import { finnForloep, lagDemosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import {
  kravetOgSvaret,
  postIRaden,
  varsleneIKravene,
} from '$lib/components/varden/vederlagsoversikt';
import { trinnene } from '$lib/components/varden/Maalrad.svelte';
import { akseptfristen } from '$lib/components/varden/svarlagene';
import { brevene, leveringene, type Brevet } from '$lib/components/varden/lesing';
import { VEDERLAGET } from '$lib/components/varden/tekster';
import type { Utledning } from '$kjerne/utledning/utled';

const kravetOgSvaretI = (u: Utledning) => kravetOgSvaret(u, brevene(u));

afterEach(cleanup);

/** Stegene i startjournalen for BF-44 (G-14): svaret med tre lag, to poster og forbeholdet. */
const BF44 = JSON.parse(readFileSync('docs/domenetabell/brukerforlop/BF-44.json', 'utf8')) as {
  steg: Handling[];
};

const PAABEROPELSE = BF44.steg[0]!;
const FORHOLDSSVAR: Handling = {
  handling: 'brev',
  navn: 'D-g',
  svar: [{ spor: 'forhold', navn: 'S-g1', resultat: 'avslaatt' }],
};

async function utledning(steg: Handling[]) {
  const forloep: Forloep = { id: 'vederlagssiden', rader: [], start: null, steg, kontroller: [] };
  // Klokka i brukerforløpene, så e-posten i BF-44 er sendt før den registreres.
  const valg = { klokke: testklokke(START) };
  return (await kjoer(forloep, minnebane({ sakstittel: 'Pelingen' }), { valg })).utledning();
}

async function vis(steg: Handling[]) {
  const u = await utledning(steg);
  const forholdet: string[] = [];
  render(Vederlagsoversikt, {
    u,
    betegnelser: { forhold: null, vederlag: null, frist: null },
    onles: () => {},
    onspor: (s) => forholdet.push(s),
  });
  return { u, forholdet };
}

describe('Kravet og svaret, lest av kjernen (BF-44)', () => {
  it('svaret med tre lag: 0 kr prinsipalt, 110 000 kr subsidiært og 130 000 kr videre subsidiært, som i brevet (D-1, D-2, OV-U31, OV-U73)', async () => {
    const k = kravetOgSvaretI(await utledning(BF44.steg))!;
    expect(k.krevd).toBe(190000);
    expect(k.lagene.map((l) => [l.etikett, l.beloep])).toEqual([
      ['prinsipalt', 0],
      ['subsidiært', 110000],
      ['videre subsidiært', 130000],
    ]);
    // Summen i hvert lag er summen i oversiktstabellen i brevet (OV-U73, U-14).
    expect(k.tabell?.at(-1)).toEqual(['Sum', '190 000 kr', '0 kr', '110 000 kr', '130 000 kr']);
    expect(k.forbehold).toBe(true);
  });

  it('hvert lag etter det første gjelder hvis innsigelsene i laget foran ikke fører frem (U-2, OV-U32)', async () => {
    const k = kravetOgSvaretI(await utledning(BF44.steg))!;
    expect(k.lagene.map((l) => l.vilkaar)).toEqual([
      [],
      [{ art: 'varsel', hjemmel: '34.1.2' }],
      [{ art: 'varsel', hjemmel: '34.1.3' }],
    ]);
  });

  it('postene i kravet heter som i tabellen i brevet, med oppgjørsformen (U-4)', async () => {
    const k = kravetOgSvaretI(await utledning(BF44.steg))!;
    expect(k.poster.map((p) => [p.navn, p.oppgjoersform, p.krevd])).toEqual([
      ['Vederlagsjustering', 'tilbud', 150000],
      ['Særskilt vederlagsjustering', null, 40000],
    ]);
    expect(k.tabell?.slice(1, -1).map((r) => r[0])).toEqual(k.poster.map((p) => p.navn));
  });

  // Svaret 16.11 i #1997 og MM-U50: raden i et sendt brev gjelder posten med nøkkelen i `poster`,
  // også når navnet i brevet ikke er navnet kjernen gir raden i dag.
  it('raden i tabellen finner posten på nøkkelen i brevet, også med et annet navn enn i dag (MM-U50)', async () => {
    const u = await utledning(BF44.steg);
    const omdoept =
      (fjernNoekkelen: boolean) =>
      (b: Brevet): Brevet => ({
        ...b,
        avsnitt:
          b.avsnitt?.map((a) => {
            if (a.punkt !== 'oversikt') return a;
            const { poster, ...uten } = a;
            return {
              ...(fjernNoekkelen ? uten : { ...uten, poster }),
              laast: a.laast
                .replace('\nVederlagsjustering\t', '\nJustering av vederlaget\t')
                .replace('\nSærskilt vederlagsjustering\t', '\nProduktivitet\t'),
            };
          }) ?? null,
      });
    const k = kravetOgSvaret(u, brevene(u).map(omdoept(false)))!;
    expect(k.tabell?.slice(1, -1).map((r) => postIRaden(k.poster, r[0]!)?.post)).toEqual([
      'P1',
      'produktivitet',
    ]);
    // Navnet kjernen gir raden i dag, står ved siden av.
    expect(k.poster.map((p) => p.navn)).toEqual([
      'Vederlagsjustering',
      'Særskilt vederlagsjustering',
    ]);
    // Kontrollsaken: uten nøkkelen i brevet gjelder ingen rad en post.
    const uten = kravetOgSvaret(u, brevene(u).map(omdoept(true)))!;
    expect(postIRaden(uten.poster, 'Justering av vederlaget')).toBeUndefined();
  });

  it('et svar gitt etter svaret på forholdet har ikke forbeholdet (GR-U34, D-3)', async () => {
    const k = kravetOgSvaretI(
      await utledning([PAABEROPELSE, FORHOLDSSVAR, ...BF44.steg.slice(1, 4)])
    )!;
    expect(k.forbehold).toBe(false);
  });

  it('avslaget av forholdet er det første laget, uten beløp, og beløpene står subsidiært (HF-U34, OV-U33)', async () => {
    const k = kravetOgSvaretI(
      await utledning([PAABEROPELSE, FORHOLDSSVAR, ...BF44.steg.slice(1, 4)])
    )!;
    expect(k.lagene.map((l) => [l.etikett, l.beloep])).toEqual([
      ['prinsipalt', null],
      ['subsidiært', 0],
      ['videre subsidiært', 110000],
      ['videre subsidiært', 130000],
    ]);
    expect(k.lagene[1]!.vilkaar.map((v) => v.art)).toEqual(['grunn']);
    expect(VEDERLAGET.laget(k.lagene[0]!)).toBe('Byggherren har avslått forholdet i brev 2.');
  });

  it('før byggherren har svart, står kravet uten lag (U-4)', async () => {
    const k = kravetOgSvaretI(await utledning(BF44.steg.slice(0, 3)))!;
    expect(k.svarbrev).toBeNull();
    expect(k.lagene).toEqual([]);
    expect(k.krevd).toBe(190000);
  });

  it('akseptfristen står ikke lenger når kravet er trukket (U-11, KA-U51)', async () => {
    const u = await utledning([...BF44.steg.slice(0, 4), { handling: 'trekk', spor: 'vederlag' }]);
    expect(akseptfristen(u, 'vederlag')).toBeNull();
    expect(akseptfristen(await utledning(BF44.steg.slice(0, 4)), 'vederlag')?.dato).toBe(
      '2026-10-15'
    );
  });

  it('målestokken har runde trinn: 0, 50 000, 100 000 og 150 000 for 190 000 kr (U-2)', () => {
    expect(trinnene(190000)).toEqual([0, 50000, 100000, 150000]);
    // Trinnet ved enden står ikke, så tallet ikke går ut over målestokken.
    expect(trinnene(100000)).toEqual([0, 25000, 50000, 75000]);
  });
});

describe('Siden for vederlaget (BF-44, oppsett B)', () => {
  it('overskriften er «Vederlagsjustering» med hjemmelen etter, og hodet sier ikke hvem som skal handle (U-1, U-16, MM-U40)', async () => {
    await vis(BF44.steg);
    const h = screen.getByRole('heading', { level: 2, name: 'Vederlagsjustering pkt. 34' });
    expect(h.closest('header')?.textContent?.trim()).toBe('Vederlagsjustering pkt. 34');
  });

  it('beløpet i hvert krav står ved brevet, og det eldre kravet er fulgt opp (U-5, U-12)', async () => {
    await vis(BF44.steg);
    const rader = within(screen.getByRole('list', { name: 'Brevene, nyeste først' })).getAllByRole(
      'listitem'
    );
    const krav = rader.filter((r) => r.textContent?.includes('Krav om vederlagsjustering'));
    // Leselinja i prototypen `vederlagsoversikt.html` v3: kravet som også er varselet, sier
    // hjemmelen ved beløpet (U-12). Brev 2 er det første kravet og varsler etter punkt 34.1.2, og
    // brev 3 har den særskilte posten og varsler etter punkt 34.1.3 (OV-U5).
    expect(krav.map((r) => r.querySelector('.kravtall')?.textContent?.trim())).toEqual([
      '190 000 kr, med varsel etter punkt 34.1.3.',
      '125 000 kr, med varsel etter punkt 34.1.2.',
    ]);
    expect(krav[1]!.textContent).toContain('fulgt opp i brev 3');
    // Beløpet i det eldre kravet står dempet, som tittelen (U-5).
    expect(krav.map((r) => r.querySelector('.oeverst')?.classList.contains('eldre-krav'))).toEqual([
      false,
      true,
    ]);
  });

  it('et krav uten punktet for varselet i brevet står uten hjemmelen (U-12, VS-U3)', async () => {
    const u = await utledning(BF44.steg);
    const alle = brevene(u);
    expect([...varsleneIKravene(u, alle).values()]).toEqual([['34.1.2'], ['34.1.3']]);
    // Kontrollsaken: samme sak, men brevet med det første kravet har ikke punktet etter 34.1.2.
    const uten = alle.map((b) => ({
      ...b,
      avsnitt: b.avsnitt?.filter((a) => a.punkt !== '34.1.2') ?? null,
    }));
    expect([...varsleneIKravene(u, uten).values()]).toEqual([['34.1.3']]);
  });

  it('et krav som er varselet etter begge hjemlene, sier «punktene» (U-12)', () => {
    expect(VEDERLAGET.kravbeloep(190000, ['34.1.2', '34.1.3'])).toBe(
      '190\u00a0000\u00a0kr, med varsel etter punktene\u00a034.1.2 og 34.1.3.'
    );
  });

  it('leveringen til Catenda står ved svaret med akseptfristen, og ved et brev som ikke er levert ennå (G-5, U-11, HF-U23 punkt 4)', async () => {
    const u = await utledning(BF44.steg);
    const alle = brevene(u);
    const svaret = alle.find((b) => b.art === 'svar' && b.spor.includes('vederlag'))!;
    const [eldst, nyest] = alle.filter((b) => b.art === 'krav' && b.spor.includes('vederlag'));
    const enDagSenere = new Date(Date.parse(svaret.registrert) + 86_400_000).toISOString();
    render(Vederlagsoversikt, {
      u,
      betegnelser: { forhold: null, vederlag: null, frist: null },
      onles: () => {},
      levering: new Map([
        [svaret.id, enDagSenere],
        [nyest!.id, null],
        [eldst!.id, eldst!.registrert],
      ]),
    });
    const linjer = [...document.querySelectorAll('.levering')];
    expect(linjer).toHaveLength(2);
    const [vedSvaret, ikkeLevert] = linjer;
    expect(vedSvaret!.closest('li')?.textContent).toContain('Akseptfrist');
    expect(vedSvaret!.textContent).toMatch(
      /^Sendt kl\.\u00a0\d{2}\.\d{2}\. Levert til Catenda \d{1,2}\. \p{L}+ \d{4} kl\.\u00a0\d{2}\.\d{2}\.$/u
    );
    expect(ikkeLevert!.textContent).toMatch(
      /^Sendt kl\.\u00a0\d{2}\.\d{2}\. Ikke levert til Catenda ennå\.$/
    );
  });

  it('et registrert brev uten dokument og et brev uten oppdrag står ikke i leveringene (#2026)', () => {
    expect([
      ...leveringene([
        { event_id: 'a', filnavn: 'K201-KOE-001-01.pdf', levert: null },
        { event_id: 'b', filnavn: null, levert: null },
      ]),
    ]).toEqual([['a', null]]);
  });

  it('datoen TE oppgir og avstanden i kalenderdager står under brevet med varselet etter punkt 34.1.2 (U-8, G-6)', async () => {
    await vis(BF44.steg);
    const linja = screen.getByText(/^Totalentreprenøren ble klar over forholdet/);
    expect(linja.textContent).toBe(
      'Totalentreprenøren ble klar over forholdet 15. september 2026, ifølge brev 1. Varselet i dette brevet kom 16 kalenderdager etter.'
    );
    expect(linja.closest('li')?.textContent).toContain('brev 2');
  });

  it('akseptfristen står ved byggherrens svar (U-11, HF-U23 punkt 4)', async () => {
    await vis(BF44.steg);
    const frist = screen.getByText(/^Akseptfrist:/);
    expect(frist.textContent).toBe('Akseptfrist: 15. oktober 2026.');
    expect(frist.closest('li')?.textContent).toContain('Svar på krav om vederlagsjustering');
  });

  it('kortet har kravet, lagene med vilkåret ved beløpet, tabellen per post og forbeholdet én gang (U-2, U-3, U-14)', async () => {
    const { forholdet } = await vis(BF44.steg);
    const kort = within(screen.getByRole('region', { name: 'Kravet og svaret' }));
    expect(kort.getByText('Kravet i brev 3 og svaret i brev 4')).toBeTruthy();
    const lagene = kort.getByRole('list', { name: 'Byggherren godkjenner' });
    expect(
      within(lagene)
        .getAllByRole('listitem')
        .map((l) => l.querySelector('p')?.textContent)
    ).toEqual([
      'Byggherren gjør gjeldende at varselet etter punkt\u00a034.1.2 i brev 2 kom for sent.',
      'Hvis innsigelsen om varselet etter punkt\u00a034.1.2 ikke fører frem: Byggherren godkjenner oppgjørsformen totalentreprenøren krever, og byggherren gjør gjeldende at varselet etter punkt\u00a034.1.3 i brev 3 kom for sent, og godkjenner 10 000 kr etter begrensningen.',
      'Hvis heller ikke innsigelsen om varselet etter punkt\u00a034.1.3 fører frem.',
    ]);
    const tabell = kort.getByRole('table', { name: 'Per post' });
    expect(within(tabell).getAllByRole('row').at(-1)?.textContent).toBe(
      'Sum190 0000110 000130 000'
    );
    expect(kort.getAllByText(/gis under forutsetning av at forholdet gir grunnlag/)).toHaveLength(
      1
    );
    expect(kort.getByText(/Svar på forholdet er ikke registrert\./)).toBeTruthy();
    await fireEvent.click(kort.getByRole('button', { name: 'Gå til forholdet' }));
    expect(forholdet).toEqual(['forhold']);
  });

  it('forbeholdet skiller brevet fra stillingen nå, når byggherren senere har svart på forholdet (D-3)', async () => {
    await vis([...BF44.steg.slice(0, 4), FORHOLDSSVAR]);
    expect(
      screen.getByText(
        /^Svaret i brev 4 gis under forutsetning av at forholdet gir grunnlag for kravet\. Byggherren har senere svart på forholdet i brev 5\./
      )
    ).toBeTruthy();
  });

  it('regningsarbeid står som liste, uten målestokk og tabell (U-13)', async () => {
    await vis([
      PAABEROPELSE,
      { handling: 'krav', spor: 'vederlag', kravposter: [{ oppgjoersform: 'regningsarbeid' }] },
      {
        handling: 'brev',
        svar: [
          {
            spor: 'vederlag',
            varslet_i_tide: true,
            kravposter: [{ post: 'P1', metode_akseptert: true }],
          },
        ],
      },
    ]);
    const kort = within(screen.getByRole('region', { name: 'Kravet og svaret' }));
    expect(kort.queryByRole('table')).toBeNull();
    expect(kort.queryByText('Totalentreprenøren krever')).toBeNull();
    expect(kort.getByText('Oppgjørsform').nextElementSibling?.textContent?.trim()).toBe(
      'Regningsarbeid etter punkt 34.4. Byggherren godkjenner regningsarbeid i brev 3.'
    );
  });
});

describe('Saken med vederlaget i Varden (BF-44)', () => {
  async function saken(catendaLenke: string | null) {
    const demosak = lagDemosak(finnForloep('BF-44')!, 'te-har-mottatt-svaret', 'TE');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'TE',
      hent: async (sak, prosjekt) => ({
        ...(await demosak.hent(sak, prosjekt)),
        catenda_lenke: catendaLenke,
      }),
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    await screen.findByRole('list', { name: 'Brevene, nyeste først' });
  }

  it('topplinja har «Åpne saken i Catenda» når serveren gir lenken, i en ny fane (U-15, #1985)', async () => {
    await saken('https://catenda.example/topic/1');
    const lenke = screen.getByRole('link', { name: /^Åpne saken i Catenda/ });
    expect(lenke.getAttribute('href')).toBe('https://catenda.example/topic/1');
    expect(lenke.getAttribute('target')).toBe('_blank');
  });

  it('uten lenken fra serveren står ingen lenke til Catenda (#1906, kommentaren om catenda_lenke)', async () => {
    await saken(null);
    expect(screen.queryByRole('link', { name: /Catenda/ })).toBeNull();
  });

  it('panelet viser akseptfristen under vederlaget, og «Godta svaret» står ved svaret som sekundær knapp (U-11, U-16)', async () => {
    await saken(null);
    expect(screen.getAllByText('Akseptfrist 15. oktober 2026').length).toBeGreaterThan(0);
    const godta = screen.getByRole('button', { name: 'Godta svaret' });
    expect(godta.className).not.toContain('knapp-primaer');
    expect(godta.closest('li')?.textContent).toContain('Svar på krav om vederlagsjustering');
  });
});
