/**
 * Siden for forholdet (#1449, kriteriene 1–4). Sakene kjøres gjennom kjernen i minnet med
 * testklienten, så utledningen er kjernens. Kildene er OV-U76–OV-U78 for overskriftene og
 * tittelen, GR-U31 for brevnavnet, MM-U30 for «Svar ikke registrert», OV-U85 for datoen på
 * registrert korrespondanse, OV-U81 for infotipset og GR-U30 for trekket.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { minnebane } from '$kjerne/tester/bane';
import { kjoer, type Forloep } from '$kjerne/tester/kjoerer';
import type { Handling } from '$kjerne/tester/klient';
import Forholdsoversikt from '$lib/components/varden/Forholdsoversikt.svelte';
import Tidslinje from '$lib/components/varden/Tidslinje.svelte';
import { brevForLinja, brevene, brevITraaden, type Brevet } from '$lib/components/varden/lesing';
import { createRawSnippet } from 'svelte';
import Brevtraad from '$lib/components/varden/Brevtraad.svelte';
import type { Spor } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import { betegnelse } from '$kjerne/utledning/visning';

/** Betegnelsene slik saksbildet gir dem (`betegnelsene`), regnet av kjernen. */
const betegnelserI = (u: Utledning) => ({
  forhold: betegnelse(u, 'forhold'),
  vederlag: betegnelse(u, 'vederlag'),
  frist: betegnelse(u, 'frist'),
});

afterEach(cleanup);

/** Brevet i raden, som siden gir tråden. */
const lestBrev = createRawSnippet((b: () => Brevet) => ({
  render: () => `<p data-brev="${b().id}">Brevet</p>`,
}));

const PAABEROPELSE: Handling = {
  handling: 'krav',
  spor: 'forhold',
  hovedkategori: 'endring',
  underkategori: 'irregulaer_endring',
  navn: 'K-g1',
  utdypning: 'Pålegg om tegl på østfasaden.',
};
const REGISTRERT: Handling = {
  handling: 'registrert_brev',
  part: 'BH',
  navn: 'D-r1',
  sendt: '2026-09-20',
  beskrivelse: 'Foreløpig tilbakemelding om pålegget',
  sporene: ['forhold'],
};
const VEDERLAG: Handling = { handling: 'krav', spor: 'vederlag', belop: 420000, navn: 'K-v1' };
const AVSLAG: Handling = {
  handling: 'brev',
  navn: 'D2',
  svar: [
    {
      spor: 'forhold',
      navn: 'S-g1',
      resultat: 'avslaatt',
      varslet_i_tide: true,
      utdypning: 'Ingen endring.',
    },
  ],
};

async function utledning(steg: Handling[]) {
  const forloep: Forloep = { id: 'forholdssiden', rader: [], start: null, steg, kontroller: [] };
  const k = await kjoer(forloep, minnebane({ sakstittel: 'Fasaden' }));
  return k.utledning();
}

async function vis(steg: Handling[], ekstra: Record<string, unknown> = {}) {
  const u = await utledning(steg);
  const lest: string[] = [];
  const valgt: string[] = [];
  render(Forholdsoversikt, {
    u,
    betegnelser: betegnelserI(u),
    onles: (id: string) => lest.push(id),
    onspor: (s: string) => valgt.push(s),
    ...ekstra,
  });
  return { u, lest, valgt };
}

const traad = () => within(screen.getByRole('list', { name: 'Brevene i saken, nyeste først' }));

describe('Siden for forholdet', () => {
  it('tittelen er forholdet selv, uten gruppen over, og under den står hvor saken står (OV-U78, BF-05 U-10)', async () => {
    await vis([PAABEROPELSE, AVSLAG]);
    const tittel = screen.getByRole('heading', { level: 1, name: 'Irregulær endring' });
    expect(tittel.previousElementSibling).toBeNull();
    expect(screen.queryByText('Endringer, jf. punkt 31 og 32')).toBeNull();
    expect(tittel.nextElementSibling?.textContent).toMatch(
      /^Byggherren avslo forholdet \d+\. \w+ 2026\.$/
    );
  });

  it('ingen tekst brukeren ser, sier «grunnlag» (kriterium 1, OV-U76)', async () => {
    const u = await utledning([PAABEROPELSE, REGISTRERT, VEDERLAG, AVSLAG]);
    const { container } = render(Forholdsoversikt, {
      u,
      betegnelser: betegnelserI(u),
      onles: () => {},
    });
    expect(container.textContent).not.toMatch(/grunnlag/i);
  });

  it('ubesvart påberopelse: raden har parten, datoen, hva brevet er og brevnummeret, og «Svar ikke registrert» står øverst i tråden, nyest først (#1898 punkt 3, U-5 i BF-44, MM-U30)', async () => {
    await vis([PAABEROPELSE]);
    const brev = traad().getAllByRole('listitem');
    expect(brev).toHaveLength(2);
    expect(brev[0].textContent).toContain('Svar ikke registrert.');
    const rad = brev[1];
    expect(rad.querySelector('.part')?.textContent).toBe('TE');
    expect(rad.querySelector('.dato .lang')?.textContent).toMatch(/^\d+\. \p{L}+ 2026$/u);
    expect(within(rad).getByRole('heading', { level: 3 }).textContent?.trim()).toBe(
      'Påberopelse av forholdet fra totalentreprenøren'
    );
    expect(rad.querySelector('.nr')?.textContent).toBe('brev 1');
    expect(
      screen.getByText(/^Sendt til byggherren \d+\. \w+ 2026\. Svar ikke registrert\.$/)
    ).toBeTruthy();
  });

  it('tråden har alle brevene i saken nyest først, også kravene og den registrerte korrespondansen, med datoen avsenderen oppgir og infotipset (#1898 punkt 2, OV-U85, OV-U81)', async () => {
    const { u } = await vis([PAABEROPELSE, REGISTRERT, VEDERLAG, AVSLAG]);
    const brev = traad()
      .getAllByRole('listitem')
      .filter((li) => li.classList.contains('innlegg'));
    expect(brev.map((li) => li.querySelector('.part')?.textContent)).toEqual([
      'BH',
      'TE',
      'BH',
      'TE',
    ]);
    expect(brev[1].querySelector('h3')?.textContent).toMatch(/^Krav om vederlagsjustering/);
    const registrert = brev[2];
    expect(registrert).toHaveClass('kompakt');
    expect(registrert.querySelector('h3')?.textContent).toMatch(
      /^Foreløpig tilbakemelding om pålegget/
    );
    expect(registrert.textContent).toContain('Sendt 20. september 2026, ifølge byggherren.');
    expect(within(registrert).queryByRole('button', { name: /Les brevet/ })).toBeNull();
    expect(within(registrert).getByRole('button', { name: 'Om korrespondansen' })).toBeTruthy();
    // Vedleggene står under brevet sitt (U-5 i BF-44, LV-U14).
    expect(within(registrert).getByRole('list', { name: 'Vedlegg' }).textContent).toMatch(/\S/);
    // Infotipset står ikke i overskriften (#1511).
    expect(registrert.querySelector('h3 button')).toBeNull();
    expect(brev[0].textContent).not.toContain('Svar ikke registrert');
    expect(u.spor.forhold.gjeldendeSvar).not.toBeNull();
  });

  it('påberopelsen viser beskrivelsen av pålegget, som står som utdypningen under kravet, og datoen TE oppgir (prototypen grunnlagsoversikt.html, oppdragsgiver 06.11)', async () => {
    await vis([PAABEROPELSE]);
    const brev = traad().getAllByRole('listitem')[1];
    expect(brev.querySelector('.sitat')?.textContent).toMatch(
      /Beskrivelse av pålegget\s*«Pålegg om tegl på østfasaden\.»\s*Pålegget mottatt \d+\. \p{L}+ 2026, ifølge totalentreprenøren\./u
    );
  });

  it('svaret med en påberopelse av sen varsling viser lagene slik brevet ga dem: prinsipalt varselet, subsidiært avslaget, og begrunnelsen (OV-U32, MM-U13)', async () => {
    const forSent: Handling = {
      ...AVSLAG,
      svar: [{ ...(AVSLAG as unknown as { svar: object[] }).svar[0], varslet_i_tide: false }],
    } as Handling;
    await vis([PAABEROPELSE, forSent]);
    const lagene = screen.getByRole('list', { name: 'Standpunktene i svaret' });
    expect(
      within(lagene)
        .getAllByRole('listitem')
        .map((li) => li.textContent?.replace(/\s+/g, ' ').trim())
    ).toEqual([
      'Prinsipalt Byggherren gjør gjeldende at varselet etter punkt 32.2 i brev 1 kom for sent.',
      'Subsidiært Byggherren avslår forholdet.',
    ]);
    expect(screen.getByText('«Ingen endring.»')).toBeTruthy();
    expect(screen.getByText('Begrunnelsen')).toBeTruthy();
  });

  it('svaret i ett lag står uten etiketter for lagene (OV-U32)', async () => {
    await vis([PAABEROPELSE, AVSLAG]);
    expect(screen.queryByRole('list', { name: 'Standpunktene i svaret' })).toBeNull();
    expect(screen.getByText('Byggherren avslår forholdet.')).toBeTruthy();
  });

  it('«Les brevet» gir brevet å lese, og navnet på knappen sier hvilket brev (#1898, U-16 i BF-44)', async () => {
    const { lest, u } = await vis([PAABEROPELSE]);
    await fireEvent.click(
      traad().getByRole('button', { name: 'Les brevet: brev 1, Påberopelse av forholdet' })
    );
    expect(lest).toEqual([u.spor.forhold.gjeldendeKrav!.dokument]);
  });

  it('brevet som vises til høyre, har streken og teksten «Vises til høyre» i stedet for knappen (U-16 i BF-44)', async () => {
    const u = await utledning([PAABEROPELSE, AVSLAG]);
    render(Forholdsoversikt, {
      u,
      betegnelser: betegnelserI(u),
      onles: () => {},
      vist: u.spor.forhold.gjeldendeSvar!.dokument,
    });
    const [svaret, kravet] = traad().getAllByRole('listitem');
    expect(svaret).toHaveAttribute('aria-current', 'true');
    expect(within(svaret).getByText('Vises til høyre')).toBeTruthy();
    expect(within(svaret).queryByRole('button', { name: /Les brevet/ })).toBeNull();
    expect(kravet).not.toHaveAttribute('aria-current');
  });

  it('under 1181 px står brevet i raden, og knappen lukker det igjen (U-16 i BF-44)', async () => {
    const u = await utledning([PAABEROPELSE]);
    const id = u.spor.forhold.gjeldendeKrav!.dokument;
    render(Forholdsoversikt, {
      u,
      betegnelser: betegnelserI(u),
      onles: () => {},
      vist: id,
      smal: true,
      brevet: lestBrev,
    });
    const knappen = traad().getByRole('button', { name: /^Lukk brevet: brev 1/ });
    expect(knappen).toHaveAttribute('aria-expanded', 'true');
    expect(knappen.closest('li')!.querySelector('[data-brev]')?.getAttribute('data-brev')).toBe(id);
  });

  it('tilknyttede krav står med betegnelsen, det TE krevde med brevet og lenken «Åpne» til kravet (kriterium 3, MM-U30, oppdragsgiver 06.11)', async () => {
    const { valgt } = await vis([PAABEROPELSE, VEDERLAG]);
    const kortet = within(screen.getByRole('region', { name: 'Tilknyttede krav' }));
    const krav = kortet.getByRole('listitem');
    expect(within(krav).getByRole('heading', { name: 'Vederlagsjustering' })).toBeTruthy();
    expect(within(krav).getByText('Svar ikke registrert', { selector: '.merke' })).toBeTruthy();
    expect(krav.textContent?.replace(/\s+/g, ' ')).toMatch(/Krevd 420 000 kr brev 2/);
    expect(kortet.queryByText('Fristforlengelse')).toBeNull();
    // Synlig står bare «Åpne»; navnet sier hvor lenken fører (språkfila, WCAG 2.5.3).
    const aapne = kortet.getByRole('button', { name: 'Åpne vederlagsjusteringen' });
    expect(aapne.textContent?.trim()).toBe('Åpne');
    await fireEvent.click(aapne);
    expect(valgt).toEqual(['vederlag']);
  });

  it('når forholdet er avslått, står forholdet med svaret øverst, og et ubesvart krav sier at et svar blir subsidiært så lenge byggherren står fast på svaret (vedtaket 05.10)', async () => {
    await vis([PAABEROPELSE, VEDERLAG, AVSLAG]);
    const kortet = screen.getByRole('region', { name: 'Tilknyttede krav' });
    expect(kortet.querySelector('.rot')?.textContent).toBe('Irregulær endring · avslått i brev 3');
    expect(kortet.textContent).toContain(
      'Et svar blir subsidiært så lenge byggherren står fast på brev 3.'
    );
  });

  it('byggherrens beløp står med antallet poster uten fast beløp, uten å nevne posten (#1752 punkt 2, KA-U72, oppdragsgiver 12.11)', async () => {
    await vis([
      PAABEROPELSE,
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [{ belop: 100000 }, { belop: 40000 }],
      },
      {
        handling: 'brev',
        navn: 'D3',
        svar: [
          { spor: 'forhold', navn: 'S-g1', resultat: 'godkjent', varslet_i_tide: true },
          {
            spor: 'vederlag',
            navn: 'S-v1',
            kravposter: [
              { post: 'P1', vurdering: 'godkjent', godkjent_belop: 100000 },
              { post: 'P2', metode_akseptert: false, oensket_metode: 'regningsarbeid' },
            ],
          },
        ],
      } as Handling,
    ]);
    const krav = within(screen.getByRole('region', { name: 'Tilknyttede krav' })).getByRole(
      'listitem'
    );
    const tekst = krav.textContent?.replace(/\s+/g, ' ');
    expect(tekst).toContain('Krevd 140 000 kr brev 2');
    expect(tekst).toContain('Byggherren 100 000 kr · 1 post uten fast beløp brev 3');
    expect(tekst).not.toMatch(/P2|prinsipalt/);
  });

  it('har ingen kravpost et fast beløp, står «Ingen poster med fast beløp» (#1752 punkt 2, KA-U61, oppdragsgiver 12.11)', async () => {
    await vis([
      PAABEROPELSE,
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [{ oppgjoersform: 'regningsarbeid' }],
      } as Handling,
    ]);
    const krav = within(screen.getByRole('region', { name: 'Tilknyttede krav' })).getByRole(
      'listitem'
    );
    expect(krav.textContent?.replace(/\s+/g, ' ')).toContain(
      'Krevd Ingen poster med fast beløp brev 2'
    );
  });

  it('byggherrens svar på kravet står med beløpet, laget og brevet, og vilkåret når forholdet er avslått (OV-U33, vedtaket 05.10)', async () => {
    await vis([
      PAABEROPELSE,
      VEDERLAG,
      AVSLAG,
      {
        handling: 'brev',
        navn: 'D4',
        svar: [{ spor: 'vederlag', navn: 'S-v1', vurdering: 'delvis', godkjent_belop: 310000 }],
      } as Handling,
    ]);
    const krav = within(screen.getByRole('region', { name: 'Tilknyttede krav' })).getByRole(
      'listitem'
    );
    const tekst = krav.textContent?.replace(/\s+/g, ' ');
    expect(tekst).toMatch(/Krevd 420 000 kr brev 2/);
    expect(tekst).toMatch(/Byggherren 310 000 kr subsidiært brev 4/);
    expect(tekst).toContain('Gjelder hvis forholdet gir grunnlag for kravet.');
  });

  it('uten krav om vederlag eller frist sier kortet det', async () => {
    await vis([PAABEROPELSE]);
    expect(
      screen.getByText(/Ingen krav om vederlagsjustering eller fristforlengelse/)
    ).toBeTruthy();
  });

  it('trukket påberopelse: trekket står i sporhodet, og kravet står som «Trukket» (kriterium 4, GR-U30, MM-U30)', async () => {
    const { u } = await vis([PAABEROPELSE, VEDERLAG, { handling: 'trekk', spor: 'forhold' }]);
    expect(screen.getByRole('note').textContent).toMatch(/^Påberopelsen er trukket i brev /);
    const kortet = within(screen.getByRole('region', { name: 'Tilknyttede krav' }));
    // Kravet viser til trekket, ikke til siste brev i vederlaget (funnet i saksruta).
    const trekket = u.journal.findLast((h) => h.art === 'dokument')!;
    expect(trekket.art === 'dokument' && trekket.dokument.brevnummer).toBe(3);
    expect(kortet.getByText('Trukket', { selector: '.merke' })).toBeTruthy();
    expect(kortet.getByText('brev 3 fra TE')).toBeTruthy();
    // Et trukket krav har ikke noe vilkår.
    expect(kortet.queryByText(/^Gjelder hvis|^Et svar blir subsidiært/)).toBeNull();
    expect(traad().queryByText('Svar ikke registrert.')).toBeNull();
  });

  it('tidslinja har den registrerte korrespondansen på datoen avsenderen oppgir, med datoen den ble lagt til i kilden (OV-U85, #1596)', async () => {
    const u = await utledning([PAABEROPELSE, REGISTRERT]);
    const { container } = render(Tidslinje, { brev: brevene(u), datoer: [] });
    const linje = [...container.querySelectorAll('li')].find((li) =>
      li.textContent?.includes('Sendt ifølge BH')
    );
    expect(linje?.textContent).toContain('20. september 2026');
    expect(linje?.textContent).toMatch(/lagt til \d+\. \w+ 2026/);
  });
});

describe('Brevtråden er felles for sidene, og sporet styrer brevene (#1898 punkt 2)', () => {
  const FRIST: Handling = { handling: 'krav', spor: 'frist', dager: 10, navn: 'K-f1' };
  const titler = () =>
    screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent?.replace(/ fra \p{L}+$/u, '').trim());

  it.each([
    [
      'forhold',
      'Brevene i saken, nyeste først',
      ['Krav om fristforlengelse', 'Krav om vederlagsjustering', 'Påberopelse av forholdet'],
    ],
    ['vederlag', 'Brevene, nyeste først', ['Krav om vederlagsjustering']],
    ['frist', 'Brevene, nyeste først', ['Krav om fristforlengelse']],
  ] as const)(
    'på siden for %s viser tråden «%s» med brevene %j (oppdragsgiver 13.11: «forhold viser alle»)',
    async (spor, tittel, forventet) => {
      const u = await utledning([PAABEROPELSE, VEDERLAG, FRIST]);
      render(Brevtraad, {
        brev: brevITraaden(brevene(u), spor),
        spor,
        dokumentasjon: [],
        venterPaaSvar: false,
        onles: () => {},
      });
      expect(screen.getByRole('list', { name: tittel })).toBeTruthy();
      expect(titler()).toEqual(forventet);
    }
  );
});

describe('Brevet linja for et spor viser til (#1631, code-review)', () => {
  const brev = (id: string, art: Brevet['art'], spor: Spor[]): Brevet =>
    ({ id, art, spor }) as unknown as Brevet;
  const alle = [
    brev('k', 'krav', ['forhold']),
    brev('v', 'krav', ['vederlag']),
    brev('tv', 'trekk', ['vederlag']),
    brev('tf', 'trekk', ['frist']),
  ];

  it('et trukket spor viser til trekket i sporet, ikke et senere trekk i et annet spor', () => {
    expect(brevForLinja(alle, 'vederlag', true)?.id).toBe('tv');
  });

  it('linja viser til det siste av trekket i sporet og trekket av påberopelsen (GR-U5)', () => {
    const medForhold = [...alle, brev('tp', 'trekk', ['forhold'])];
    expect(brevForLinja(medForhold, 'vederlag', true)?.id).toBe('tp');
    expect(brevForLinja([brev('tp', 'trekk', ['forhold'])], 'frist', true)?.id).toBe('tp');
  });

  it('registrert korrespondanse uten datoen avsenderen oppgir, står ikke som sendt herfra (OV-U85)', () => {
    const r = {
      ...brev('r', 'registrert', ['forhold']),
      avsender: 'BH',
      sendt: null,
      registrert: '2026-11-03T10:00:00Z',
      nummer: null,
      avsnitt: null,
      merking: null,
      brevtittel: null,
    } as Brevet;
    render(Brevtraad, {
      brev: [{ ...r, beskrivelse: null, vedlegg: [] }],
      spor: 'forhold',
      dokumentasjon: [],
      venterPaaSvar: false,
      onles: () => {},
    });
    expect(document.querySelector('.datolinje')?.textContent?.trim()).toBe(
      'Lagt til 3. november 2026.'
    );
  });
});
