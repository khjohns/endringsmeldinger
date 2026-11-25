/**
 * Siden for forholdet (#1449, kriteriene 1–4). Sakene kjøres gjennom kjernen i minnet med
 * testklienten, så utledningen er kjernens. Kildene er OV-U76–OV-U78 for overskriftene og
 * tittelen, GR-U31 for brevnavnet, MM-U30 for «Svar ikke registrert», OV-U85 for datoen på
 * registrert korrespondanse og GR-U30 for trekket.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { minnebane } from '#kjerne/tester/bane.ts';
import { kjoer, type Forloep } from '#kjerne/tester/kjoerer.ts';
import type { Handling } from '#kjerne/tester/klient.ts';
import Forholdsoversikt from '#lib/components/varden/Forholdsoversikt.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import Tidslinje from '#lib/components/varden/Tidslinje.svelte';
import {
  brevForLinja,
  brevene,
  brevITraaden,
  oppfoelgingene,
  type Brevet,
  type Innlegget,
} from '#lib/components/varden/lesing.ts';
import { TRAADEN } from '#lib/components/varden/tekster/index.ts';
import { createRawSnippet } from 'svelte';
import Brevtraad from '#lib/components/varden/Brevtraad.svelte';
import type { Spor } from '#kjerne/typer.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import { betegnelse } from '#kjerne/utledning/visning.ts';

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
  it('hodet viser forholdet og hvem som sendte siste brev (#2180)', async () => {
    await vis([PAABEROPELSE, AVSLAG]);
    const tittel = screen.getByRole('heading', { level: 2, name: 'Irregulær endring' });
    expect(tittel.previousElementSibling).toBeNull();
    expect(screen.queryByText('Endringer, jf. punkt 31 og 32')).toBeNull();
    expect(tittel.nextElementSibling?.textContent).toMatch(
      /^Byggherren sendte siste brev \d+\. \p{L}+ 2026\.$/u
    );
  });

  it('hodet sier når den siste korrespondansen ble lagt til (#2180)', async () => {
    const { u } = await vis([PAABEROPELSE, AVSLAG, REGISTRERT]);
    expect(brevene(u).at(-1)?.art).toBe('registrert');
    const tittel = screen.getByRole('heading', { level: 2, name: 'Irregulær endring' });
    expect(tittel.nextElementSibling?.textContent).toMatch(
      /la til korrespondanse \d+\. \p{L}+ 2026\./u
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
    expect(rad.querySelector('.dato')?.textContent?.trim()).toMatch(
      /^\d+\. \p{L}+\.? 2026 · brev 1$/u
    );
    expect(within(rad).getByRole('heading', { level: 4 }).textContent?.trim()).toBe(
      'Påberopelse av irregulær endring fra totalentreprenøren'
    );
    expect(
      screen.getByText(/^Totalentreprenøren sendte siste brev \d+\. \p{L}+ 2026\.$/u)
    ).toBeTruthy();
  });

  it('tråden har alle brevene i saken nyest først, også kravene og den registrerte korrespondansen, med datoen avsenderen oppgir (#1898 punkt 2, OV-U85)', async () => {
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
    expect(brev[1].querySelector('h4')?.textContent).toMatch(/^Krav om vederlagsjustering/);
    const registrert = brev[2];
    expect(registrert).toHaveClass('kompakt');
    expect(registrert.querySelector('h4')?.textContent).toMatch(
      /^Foreløpig tilbakemelding om pålegget/
    );
    expect(registrert.textContent).toContain('Sendt 20. september 2026, ifølge byggherren.');
    expect(within(registrert).queryByRole('button', { name: /Les brevet/ })).toBeNull();
    // Vedleggene står under brevet sitt (U-5 i BF-44, LV-U14).
    expect(within(registrert).getByRole('list', { name: 'Vedlegg' }).textContent).toMatch(/\S/);
    expect(registrert.querySelector('h4 button')).toBeNull();
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
        .map((li) =>
          [...li.children]
            .map((e) => e.textContent)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
        )
    ).toEqual([
      'Byggherren gjør gjeldende at varselet etter punkt 32.2 i brev 1 kom for sent.',
      'Hvis innsigelsen om at varselet etter punkt 32.2 kom for sent ikke fører frem Byggherren avslår kravet på endringsordre (punkt 32.3 første ledd b).',
    ]);
    expect(screen.getByText('«Ingen endring.»')).toBeTruthy();
    expect(screen.getByText('Begrunnelsen')).toBeTruthy();
    const tittel = screen.getByRole('heading', { level: 2, name: 'Irregulær endring' });
    expect(tittel.nextElementSibling?.textContent).toMatch(
      /^Byggherren sendte siste brev \d+\. \p{L}+ 2026\.$/u
    );
  });

  const I_TIDE_SVAR = {
    spor: 'forhold',
    navn: 'S-g1',
    resultat: 'avslaatt',
    varslet_i_tide: true,
    utdypning: 'Ingen endring.',
  };
  const FOR_SENT_SVAR = { ...I_TIDE_SVAR, navn: 'S-g2', varslet_i_tide: false };
  it.each<[string, Handling[]]>([
    [
      'i en revisjon av svaret',
      [{ handling: 'revisjon', erstatter: 'S-g1', ...FOR_SENT_SVAR } as Handling],
    ],
    [
      'i svaret på en ny versjon av påberopelsen',
      [
        { ...PAABEROPELSE, navn: 'K-g2' },
        { handling: 'brev', navn: 'D4', svar: [FOR_SENT_SVAR] } as Handling,
      ],
    ],
  ])(
    'et «i tide» står i tråden sammen med en senere påberopelse av at varselet kom for sent %s, uten noe om hvem som er bundet (MM-U34 punkt 6, HF-U4)',
    async (_tilfelle, senere) => {
      await vis([PAABEROPELSE, { handling: 'brev', navn: 'D2', svar: [I_TIDE_SVAR] }, ...senere]);
      const tekster = traad()
        .getAllByRole('listitem')
        .map((li) => li.textContent?.replace(/\s+/g, ' ') ?? '');
      const forSent = tekster.findIndex((t) =>
        t.includes('Byggherren gjør gjeldende at varselet etter punkt 32.2 i brev 1 kom for sent.')
      );
      const iTide = tekster.findIndex((t) =>
        t.includes('Byggherren godkjenner at varselet etter punkt 32.2 i brev 1 kom i tide.')
      );
      expect(forSent).toBeGreaterThanOrEqual(0);
      expect(iTide).toBeGreaterThan(forSent);
      const tittel = screen.getByRole('heading', { level: 2, name: 'Irregulær endring' });
      expect(tittel.nextElementSibling?.textContent).toMatch(
        /^Byggherren sendte siste brev \d+\. \p{L}+ 2026\.$/u
      );
      expect(document.body.textContent).not.toMatch(/bundet|kan ikke påberope|i strid med/i);
    }
  );

  it('svaret i ett lag står uten etiketter for lagene, med brevets ord for avslaget ved irregulær endring (OV-U32, GR-U32)', async () => {
    await vis([PAABEROPELSE, AVSLAG]);
    expect(screen.queryByRole('list', { name: 'Standpunktene i svaret' })).toBeNull();
    expect(
      screen.getByText('Byggherren avslår kravet på endringsordre (punkt 32.3 første ledd b).')
    ).toBeTruthy();
    expect(screen.queryByText('Byggherren avslår forholdet.')).toBeNull();
  });

  it('«Les brevet» gir brevet å lese, og navnet på knappen sier hvilket brev (#1898, U-16 i BF-44)', async () => {
    const { lest, u } = await vis([PAABEROPELSE]);
    await fireEvent.click(
      traad().getByRole('button', { name: 'Les brevet: brev 1, Påberopelse av irregulær endring' })
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
    expect(krav.textContent?.replace(/\s+/g, ' ')).toMatch(/Krevd brev 2 420 000 kr/);
    expect(kortet.queryByText('Fristforlengelse')).toBeNull();
    // Synlig står bare «Åpne»; navnet sier hvor lenken fører (språkfila, WCAG 2.5.3).
    const aapne = kortet.getByRole('button', { name: 'Åpne vederlagsjusteringen' });
    expect(aapne.textContent?.trim()).toBe('Åpne');
    await fireEvent.click(aapne);
    expect(valgt).toEqual(['vederlag']);
  });

  it('når forholdet er avslått, står forholdet med svaret øverst med ordene i statuslinjen, og et ubesvart krav sier at et svar blir subsidiært så lenge byggherren står fast på svaret (vedtaket 05.10, GR-U32, #2040)', async () => {
    await vis([PAABEROPELSE, VEDERLAG, AVSLAG]);
    const kortet = screen.getByRole('region', { name: 'Tilknyttede krav' });
    expect(kortet.querySelector('.rot')?.textContent).toBe(
      'Irregulær endring · Brev 3: byggherren avslår kravet på endringsordre (punkt\u00a032.3 første ledd b)'
    );
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
    expect(tekst).toContain('Krevd brev 2 140 000 kr');
    expect(tekst).toContain('Byggherren brev 3 100 000 kr · 1 post uten fast beløp');
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
      'Krevd brev 2 Ingen poster med fast beløp'
    );
  });

  it('byggherrens svar på kravet står med beløpet og brevet, og vilkåret når forholdet er avslått, uten etiketten for laget (OV-U33, vedtaket 05.10, D1 A 24.11 i #2248)', async () => {
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
    expect(tekst).toMatch(/Krevd brev 2 420 000 kr/);
    expect(tekst).toMatch(/Byggherren brev 4 310 000 kr/);
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
      .getAllByRole('heading', { level: 4 })
      .map((h) => h.textContent?.replace(/ fra \p{L}+$/u, '').trim());

  it.each([
    [
      'forhold',
      'Brevene i saken, nyeste først',
      [
        'Krav om fristforlengelse',
        'Krav om vederlagsjustering',
        'Påberopelse av irregulær endring',
      ],
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

  it('korrespondanse totalentreprenøren la til fra byggherren, står med byggherren som avsender og datoen ifølge totalentreprenøren (OV-U79, samlevedtaket punkt 11, #2069)', () => {
    const r = {
      ...brev('r', 'registrert', ['forhold']),
      avsender: 'BH',
      lagtTilAv: 'TE',
      sendt: '2026-10-20',
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
      'Sendt 20. oktober 2026, ifølge totalentreprenøren. Lagt til 3. november 2026.'
    );
    expect(document.querySelector('.part')?.textContent).toBe('BH');
  });
});

describe('tråden med alle brevene i saken (/code-review i #1908)', () => {
  const brev = (id: string, nummer: number, art: Brevet['art'], spor: Spor[]): Brevet =>
    ({
      id,
      nummer,
      art,
      spor,
      avsender: art === 'svar' ? 'BH' : 'TE',
      lagtTilAv: art === 'svar' ? 'BH' : 'TE',
      registrert: '2026-10-01T10:00:00Z',
      sendt: null,
      merking: null,
      deresRef: [],
      omtale: null,
      brevtittel: null,
      avsnitt: null,
      forhold: null,
      beskrivelse: null,
      vedlegg: [],
      varselhjemler: [],
    }) as Brevet;

  it('korrigeringen viser til svaret på forholdet, ikke et senere svar på vederlaget (MM-U55 punkt 10–11)', () => {
    const k = brev('k5', 5, 'annet', ['forhold']);
    const innlegg = new Map<string, Innlegget>([
      [
        k.id,
        {
          gjelderPaalegg: false,
          utdypning: null,
          oppgitt: null,
          opplysning: {
            id: 'o2',
            hva: 'klar_over_forholdet',
            dato: '2026-09-20',
            brev: k,
            korrigering: true,
            forrige: null,
            siste: true,
            korrigertI: null,
          },
          sisteOpplysningVedSvaret: null,
          standpunkter: [],
        },
      ],
    ]);
    render(Brevtraad, {
      brev: [
        brev('p1', 1, 'krav', ['forhold']),
        brev('s2', 2, 'svar', ['forhold']),
        brev('v3', 3, 'krav', ['vederlag']),
        brev('sv4', 4, 'svar', ['vederlag']),
        k,
      ],
      spor: 'forhold',
      innlegg,
      dokumentasjon: [],
      venterPaaSvar: false,
      onles: () => {},
    });
    expect(screen.getByText(/^Svaret i brev 2 endres ikke\./)).toBeTruthy();
    expect(screen.queryByText(/Svaret i brev 4/)).toBeNull();
  });

  it('et brev med et krav som gjelder i et annet spor, står ikke som fulgt opp (U-5 i BF-44)', () => {
    const alle = [
      brev('b1', 1, 'krav', ['forhold', 'vederlag']),
      brev('b3', 3, 'krav', ['vederlag']),
    ];
    const spor = (krav: string[], gjeldende: string | null) => ({
      krav: krav.map((dokument) => ({ dokument })),
      gjeldendeKrav: gjeldende ? { dokument: gjeldende } : null,
    });
    const u = (forhold: string | null) =>
      ({
        spor: {
          forhold: spor(forhold ? [forhold] : [], forhold),
          vederlag: spor(['b1', 'b3'], 'b3'),
          frist: spor([], null),
        },
      }) as unknown as Utledning;
    expect(oppfoelgingene(u('b1'), alle).has('b1')).toBe(false);
    // Kontrollsaken: uten påberopelsen i brevet er brev 1 oppdatert i brev 3.
    expect(oppfoelgingene(u(null), alle).get('b1')?.nummer).toBe(3);
  });

  it('en påberopelse som også krever vederlag, sier det i tittelen (U-5 i BF-44)', () => {
    expect(TRAADEN.hva(brev('b1', 1, 'krav', ['forhold', 'vederlag']))).toBe(
      'Påberopelse av forholdet og krav om vederlagsjustering'
    );
    expect(TRAADEN.hva(brev('b1', 1, 'krav', ['forhold']))).toBe('Påberopelse av forholdet');
  });
});

describe('«Tilknyttede krav» med lagene i svaret (D1 A 24.11 i #2248)', () => {
  async function forholdet(forloep: string, punkt: string) {
    const demosak = lagDemosak(finnForloep(forloep)!, punkt, 'TE');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'TE',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'forhold' });
    const kortet = await screen.findByRole('region', { name: 'Tilknyttede krav' });
    return (spor: string) =>
      within(kortet)
        .getByRole('heading', { name: spor })
        .closest('li')!
        .textContent!.replace(/\s+/g, ' ');
  }

  it('fristen står med det første laget for alle fristene og de andre lagene per frist med vilkåret i kortform, som på siden for fristen (BF-45 U-4, #2240)', async () => {
    const kravet = await forholdet('BF-45', 'te-har-mottatt-svaret');
    const tekst = kravet('Fristforlengelse');
    // Byggherren avslår prinsipalt for alle fristene etter innsigelsen om varselet etter punkt 33.4,
    // og godkjenner subsidiært og videre subsidiært dager per frist (startjournalen i BF-45).
    expect(tekst).toContain('Byggherren brev 4 For alle fristene 0 dager');
    expect(tekst).toContain(
      'Frist 2 Overtakelse Hvis varselet kom i tide 8 dager' +
        'Hvis også spesifiseringen kom i tide 14 dager'
    );
    expect(tekst).not.toMatch(/subsidiært/);
  });

  it('vederlaget står med det første laget på linja med byggherren og de andre lagene med vilkåret i kortform, med punktet for varselet (BF-44 U-2)', async () => {
    const kravet = await forholdet('BF-44', 'te-har-mottatt-svaret');
    const tekst = kravet('Vederlagsjustering');
    expect(tekst).toContain(
      'Byggherren brev 4 0 kr ' +
        'Hvis varselet etter punkt 34.1.2 kom i tide 110 000 kr' +
        'Hvis også varselet etter punkt 34.1.3 kom i tide 130 000 kr'
    );
    expect(tekst).not.toMatch(/subsidiært/);
  });
});
