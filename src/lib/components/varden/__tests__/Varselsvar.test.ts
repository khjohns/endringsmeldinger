/**
 * Byggherrens svar på et varsel i vederlaget som står alene (G-9 i BF-14, #2177, G-7 i BF-37,
 * #2447), med kjernen i minnet. Svaret er et vanlig svar i vederlaget med varselet som `gjelder`
 * (VS-U79), med standpunktene etter VS-U77 punkt 30, 31 og 33.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { varseletSvaretPaa } from '#lib/kjernesak/vederlagskrav.ts';
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  MERKING,
  SAK,
  linje,
  opprettet,
  medGrunnlag,
  medVederlagssvar,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Varselsvar from '#lib/components/varden/Varselsvar.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import Vederlagssvar from '#lib/components/varden/Vederlagssvar.svelte';
import { brevene } from '#lib/components/varden/lesing.ts';
import { TIDSLINJE, TRAADEN } from '#lib/components/varden/tekster/index.ts';
import { minnebane } from '#kjerne/tester/bane.ts';
import { kjoer } from '#kjerne/tester/kjoerer.ts';
import type { Handling } from '#kjerne/tester/klient.ts';

const medVarsel = (hjemmel: '34.3.3' | '34.4') =>
  skrevet(medGrunnlag, 'TE', {
    type: 'send_varsel',
    varsler: [{ hjemmel, arbeid: 'Graving ved kum 4' }],
  });
const varselI = (journal: Journalrad[]) => {
  const { kravpostvarsler, varsler } = utledJournal(journal, KJERNE).spor.vederlag;
  return (kravpostvarsler.at(-1) ?? varsler['34.1.2'] ?? varsler['34.1.3'])!.id;
};

/** Forholdet er svikt, så punkt 34.1.2 krever varsel (OV-U89 punkt 13). */
const medSvikt = skrevet([opprettet], 'TE', {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'svikt',
    underkategori: 'grunnforhold',
    klar_over_forholdet: '2026-09-25',
  },
  utdypning: 'Fjell der grunnundersøkelsen viste løsmasser.',
});
const medVarselOmVederlaget = (hjemmel: '34.1.2' | '34.1.3', grunnlag = medSvikt) =>
  skrevet(grunnlag, 'TE', { type: 'send_varsel', varsler: [{ hjemmel }] });

const kjernesakFor = (journal: Journalrad[]) =>
  lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    part: 'BH',
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part: 'BH',
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      catenda_lenke: null,
      sakskode: null,
      kontraktsforkortelse: null,
      kan_foreslaa_sakskode: false,
      merking: MERKING,
    }),
  });

async function svarskjemaet(journal: Journalrad[]) {
  const kjernesak = kjernesakFor(journal);
  await kjernesak.last();
  const u = kjernesak.utledning!;
  const sendt: TilBrevkontrollen[] = [];
  render(Varselsvar, {
    kjernesak,
    u,
    varselet: varseletSvaretPaa(u, varselI(journal))!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const radio = (navn: string) => fireEvent.click(screen.getByRole('radio', { name: navn }));
const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
const svaret = (k: TilBrevkontrollen) =>
  k.kommando as {
    type: string;
    erstatter?: string;
    svar: Record<string, unknown>[] | Record<string, unknown>;
  };

afterEach(cleanup);

describe('svaret på varselet etter punkt 34.3.3 som står alene (VS-U77 punkt 30, VS-U79)', () => {
  it('justeringen må besvares før brevet lages, og svaret gjelder varselet uten resultat', async () => {
    const journal = medVarsel('34.3.3');
    const sendt = await svarskjemaet(journal);
    expect(
      screen.getByRole('heading', { name: /Svar på varsel om justering av enhetsprisene/ })
    ).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Velg om du godtar justeringen av enhetsprisene.' })
    ).toBeInTheDocument();
    await radio('Godtar justeringen');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt[0]!)).toMatchObject({
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: varselI(journal),
          vurderinger: { godtar_justering: true },
          resultat: {},
        },
      ],
    });
  });

  it('med innsigelsen mot varselet står justeringen subsidiært, med «Gjelder hvis» (VS-U4, VS-U77 punkt 30)', async () => {
    const sendt = await svarskjemaet(medVarsel('34.3.3'));
    // Som i utfyllingen for kravposten regnes et ubesvart varsel som innsigelse (`lagIVederlaget`).
    expect(screen.getByText('Gjelder hvis')).toBeInTheDocument();
    await radio('Kom i tide');
    expect(screen.queryByText('Gjelder hvis')).toBeNull();
    await radio('Kom for sent');
    expect(screen.getByText('Gjelder hvis')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /^innsigelsen om at varselet etter punkt.34\.3\.3 kom for sent$/,
      })
    ).toBeInTheDocument();
    await radio('Bestrider justeringen');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt[0]!).svar).toMatchObject([
      { vurderinger: { varslet_i_tide: false, godtar_justering: false } },
    ]);
  });

  it('«Kom i tide» sendes uttrykkelig (svar 3 A i VS-U77)', async () => {
    const sendt = await svarskjemaet(medVarsel('34.3.3'));
    await radio('Kom i tide');
    await radio('Godtar justeringen');
    await seBrevet();
    expect(svaret(sendt[0]!).svar).toMatchObject([
      { vurderinger: { varslet_i_tide: true, godtar_justering: true } },
    ]);
  });
});

describe('svaret på varselet etter et avslag av forholdet (OV-U32, VS-U4)', () => {
  it('panelet har punktet «Forholdet» foran, og lagene etter det, som brevet', async () => {
    const g = utledJournal(medGrunnlag, KJERNE).spor.forhold.gjeldendeKrav!.id;
    const avslaatt = skrevet(medGrunnlag, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'forhold',
          gjelder: g,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
          resultat: {},
          utdypning: 'Svaret på forholdet.',
        },
      ],
    });
    await svarskjemaet(
      skrevet(avslaatt, 'TE', {
        type: 'send_varsel',
        varsler: [{ hjemmel: '34.3.3', arbeid: 'Graving ved kum 4' }],
      })
    );
    await radio('Kom for sent');
    await radio('Bestrider justeringen');
    const panelet = within(screen.getByRole('region', { name: 'Punktene i brevet' }));
    expect(panelet.getByText(/Forholdet/)).toBeInTheDocument();
    expect(
      panelet.getByText(/^Hvis avslaget av forholdet i brev.2 ikke fører frem$/)
    ).toBeInTheDocument();
    expect(
      panelet.getByText(/^Hvis heller ikke innsigelsen om at varselet etter punkt.34\.3\.3/)
    ).toBeInTheDocument();
  });

  it('«Gjelder hvis» har avslaget av forholdet foran laget det gjelder, også før spørsmålene er besvart (Codex-reviewet)', async () => {
    const g = utledJournal(medGrunnlag, KJERNE).spor.forhold.gjeldendeKrav!.id;
    const avslaatt = skrevet(medGrunnlag, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'forhold',
          gjelder: g,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
          resultat: {},
          utdypning: 'Svaret på forholdet.',
        },
      ],
    });
    await svarskjemaet(
      skrevet(avslaatt, 'TE', {
        type: 'send_varsel',
        varsler: [{ hjemmel: '34.3.3', arbeid: 'Graving ved kum 4' }],
      })
    );
    const vilkaaret = (sp: string) =>
      document.querySelector(`[id$="-${sp}-forutsetninger"]`)?.textContent ?? '';
    // Ubesvart regnes varselet som innsigelse, og justeringen står i laget etter det.
    expect(vilkaaret('varsel')).toMatch(/avslaget av forholdet i brev.2/);
    expect(vilkaaret('justering')).toMatch(/innsigelsen om at varselet/);
    await radio('Kom i tide');
    expect(vilkaaret('justering')).toMatch(/avslaget av forholdet i brev.2/);
  });
});

describe('svaret på varselet etter punkt 34.4 som står alene (VS-U77 punkt 31)', () => {
  it('uten innsigelse er det ikke noe å sende, og skjemaet sier at byggherren ikke trenger å svare', async () => {
    const sendt = await svarskjemaet(medVarsel('34.4'));
    // BF-14, «Byggherrens svar»: «Ingen innsigelse», med lenken «Varselet kom for sent» (S-16).
    expect(screen.getAllByText(/Ingen innsigelse\./).length).toBeGreaterThan(0);
    expect(screen.queryByRole('group', { name: /Justeringen/ })).toBeNull();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: /^Ingenting å sende\. Varselet krever ikke svar\./ })
    ).toBeInTheDocument();
  });

  it('«Varselet kom for sent» gir innsigelsen, ikke «ikke ble gitt» (VS-U77 punkt 31)', async () => {
    const sendt = await svarskjemaet(medVarsel('34.4'));
    await fireEvent.click(screen.getByRole('button', { name: 'Varselet kom for sent' }));
    expect(screen.getByText(/Du gjør gjeldende at varselet kom for sent\./)).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt[0]!).svar).toMatchObject([{ vurderinger: { varslet_i_tide: false } }]);
  });

  it('et nytt svar erstatter det forrige, gjentar innsigelsen som står og kan gi den opp (VS-U77 punkt 31 og 33)', async () => {
    const varslet = medVarsel('34.4');
    const varsel = varselI(varslet);
    const journal = skrevet(varslet, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: varsel,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { varslet_i_tide: false },
          resultat: {},
        },
      ],
    });
    const forrige = utledJournal(journal, KJERNE).spor.vederlag.svarPaaVarsler[0]!.id;
    const sendt = await svarskjemaet(journal);
    expect(
      screen.getByText(/at varselet kom for sent\. Svaret gjentar innsigelsen\./)
    ).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Gi opp innsigelsen' }));
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt[0]!)).toMatchObject({
      type: 'revisjon',
      erstatter: forrige,
      svar: { gjelder: varsel, vurderinger: { varslet_i_tide: true } },
    });
  });
});

describe('svaret på varselet i Varden (G-9 i BF-14)', () => {
  it('byggherren svarer fra varselet i vederlaget, og skjemaet åpnes med brevtittelen for svaret på varselet', async () => {
    const kjernesak = kjernesakFor(medVarsel('34.3.3'));
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Svar på varselet om justering av enhetsprisene' })
    );
    expect(
      await screen.findByRole('heading', { name: /^Svar på varsel om justering av enhetsprisene/ })
    ).toBeInTheDocument();
    await radio('Godtar justeringen');
    await seBrevet();
    expect(
      await screen.findByRole('button', { name: 'Send til totalentreprenøren' })
    ).toBeInTheDocument();
    // VS-U77 punkt 30 og 31: svaret gir ingen enighet (Codex-reviewet).
    expect(screen.queryByText(/Enigheten registreres/)).toBeNull();
  });
});

describe('innsigelsen fra svaret på varselet i svaret på kravposten (VS-U77 punkt 31 og 34, MM-U50)', () => {
  it('svaret på kravposten gjengir innsigelsen etter punkt 34.4 med ordene brevet brukte, «kom for sent»', async () => {
    const varslet = medVarsel('34.4');
    const varsel = varselI(varslet);
    const journal = skrevet(
      skrevet(varslet, 'BH', {
        type: 'brev',
        svar: [
          {
            spor: 'vederlag',
            gjelder: varsel,
            regelversjon: KJERNE.regler.versjon,
            vurderinger: { varslet_i_tide: false },
            resultat: {},
          },
        ],
      }),
      'TE',
      {
        type: 'krav',
        spor: 'vederlag',
        innhold: {
          kravposter: [
            {
              beskrivelse: 'Pumping',
              oppgjoersform: 'regningsarbeid',
              varsel: { art: 'gitt', varsel },
            },
          ],
        },
      }
    );
    const kjernesak = kjernesakFor(journal);
    await kjernesak.last();
    render(Vederlagssvar, {
      kjernesak,
      u: kjernesak.utledning!,
      onbrevkontroll: () => {},
      onforkast: () => {},
    });
    const linja = await screen.findByText(/Du har gjort gjeldende i .* at varselet kom for sent\./);
    expect(linja.textContent).not.toMatch(/ikke ble gitt/);
  });
});

describe('flere varsler etter samme bestemmelse (VS-U77 punkt 27 og 33)', () => {
  it('handlingene sier hvilket brev varselet står i', async () => {
    const journal = skrevet(medVarsel('34.3.3'), 'TE', {
      type: 'send_varsel',
      varsler: [{ hjemmel: '34.3.3', arbeid: 'Graving ved kum 4' }],
    });
    const kjernesak = kjernesakFor(journal);
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    expect(
      await screen.findByRole('button', {
        name: /^Svar på varselet om justering av enhetsprisene i brev.2$/,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^Svar på varselet om justering av enhetsprisene i brev.3$/)
    ).toBeInTheDocument();
  });
});

describe('lenken i «Gjelder hvis» når innsigelsen står (Codex-reviewet)', () => {
  it('lenken fører til setningen med innsigelsen som gjentas', async () => {
    const varslet = medVarsel('34.3.3');
    const varsel = varselI(varslet);
    await svarskjemaet(
      skrevet(varslet, 'BH', {
        type: 'brev',
        svar: [
          {
            spor: 'vederlag',
            gjelder: varsel,
            regelversjon: KJERNE.regler.versjon,
            vurderinger: { varslet_i_tide: false, godtar_justering: false },
            resultat: {},
          },
        ],
      })
    );
    const lenken = screen.getByRole('link', { name: /^innsigelsen om at varselet etter punkt/ });
    const maal = document.getElementById(lenken.getAttribute('href')!.slice(1));
    expect(maal?.textContent).toMatch(/Svaret gjentar innsigelsen\./);
  });
});

describe('brevet med varselet etter punkt 34.3.3 og 34.4 heter som varselet (#2360, prototype v4)', () => {
  it.each([
    ['34.3.3', 'Varsel om justering av enhetsprisene'],
    ['34.4', 'Varsel før regningsarbeidet settes i gang'],
  ] as const)('varselet etter punkt %s heter «%s» i tidslinja og brevtråden', (hjemmel, navn) => {
    const brevet = brevene(utledJournal(medVarsel(hjemmel), KJERNE)).at(-1)!;
    expect(TIDSLINJE.hva(brevet)).toBe(navn);
    expect(TRAADEN.hva(brevet)).toBe(navn);
  });

  it('varselet etter punkt 34.1.3 heter «Varsel om særskilt vederlagsjustering»', () => {
    const journal = skrevet(medGrunnlag, 'TE', {
      type: 'send_varsel',
      varsler: [{ hjemmel: '34.1.3' }],
    });
    expect(TRAADEN.hva(brevene(utledJournal(journal, KJERNE)).at(-1)!)).toBe(
      'Varsel om særskilt vederlagsjustering'
    );
  });

  it('varselet etter punkt 34.1.2 heter fortsatt «Varsel om vederlagsjustering»', () => {
    const journal = skrevet(medGrunnlag, 'TE', {
      type: 'send_varsel',
      varsler: [{ hjemmel: '34.1.2' }],
    });
    expect(TIDSLINJE.hva(brevene(utledJournal(journal, KJERNE)).at(-1)!)).toBe(
      'Varsel om vederlagsjustering'
    );
  });
});

describe('handlingen står ved hvert varsel som står alene (#2360 punkt 1, U-16 i BF-44)', () => {
  it('svaret på varselet etter punkt 34.4 i brev 3 står ved brev 3, ikke under «Andre handlinger»', async () => {
    const journal = skrevet(medVarsel('34.3.3'), 'TE', {
      type: 'send_varsel',
      varsler: [{ hjemmel: '34.4', arbeid: 'Graving ved kum 4' }],
    });
    const kjernesak = kjernesakFor(journal);
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    const ved = async (tittel: string, knapp: string) => {
      const rad = (await screen.findAllByRole('listitem')).find((li) =>
        within(li).queryByText(tittel)
      )!;
      return within(rad).getByRole('button', { name: knapp });
    };
    expect(
      await ved(
        'Varsel om justering av enhetsprisene',
        'Svar på varselet om justering av enhetsprisene'
      )
    ).toBeInTheDocument();
    expect(
      await ved('Varsel før regningsarbeidet settes i gang', 'Svar på varselet om regningsarbeid')
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Svar på varselet om regningsarbeid' })
    ).toHaveLength(1);
  });
});

describe('begrunnelsen under punktet i svarskjemaet (#2359, WCAG 2.4.6 og 2.5.3)', () => {
  it('etiketten sier «Begrunnelse», og navnet sier hvilket punkt den gjelder', async () => {
    await svarskjemaet(medVarsel('34.3.3'));
    await radio('Godtar justeringen');
    const felt = screen.getByRole('textbox', {
      name: /^Begrunnelse, .*Justering av enhetsprisene/,
    });
    const synlig = document.querySelector(`label[for="${felt.id}"]`)!.cloneNode(true) as Element;
    synlig.querySelectorAll('.visually-hidden').forEach((e) => e.remove());
    expect(synlig.textContent).toMatch(/^Begrunnelse\s*Valgfri$/);
  });
});

describe('saken i tittelen på utkastet brytes ikke (#2359 punkt 4)', () => {
  it('«sak KOE-17» står samlet i et eget spenn, og navnet på overskriften er uendret', async () => {
    await svarskjemaet(medVarsel('34.3.3'));
    const tittel = screen.getByRole('heading', {
      name: 'Svar på varsel om justering av enhetsprisene i sak KOE-17',
    });
    expect(tittel.querySelector('.saksnummer')?.textContent).toBe('sak KOE-17');
  });
});

describe('punktene heter det samme før og etter at brevet kan lages (#2359 punkt 3)', () => {
  it('overskriftene i skjemaet og panelet er ordene i brevet, med nummeret først når brevet finnes', async () => {
    await svarskjemaet(medVarsel('34.3.3'));
    const navnene = () =>
      screen
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent!.trim().replace(/^\d+\.\s*/, ''));
    const foer = navnene();
    const forbeholdet = screen.getByRole('textbox', { name: /^Forbehold/ });
    const etiketten = () => document.querySelector(`label[for="${forbeholdet.id}"]`)!.textContent!;
    const forbeholdFoer = etiketten();
    await radio('Kom i tide');
    await radio('Godtar justeringen');
    expect(screen.getAllByRole('heading', { level: 3 })[0]!.textContent).toMatch(/^1\. /);
    expect(navnene()).toEqual(foer);
    expect(etiketten()).toMatch(/^3\. /);
    expect(etiketten().replace(/^\d+\.\s*/, '')).toBe(forbeholdFoer);
  });
});

describe('svaret på et varsel lagt til mellom to krav (VS-U65, F-8 i BF-14)', () => {
  const mellom = skrevet(medVederlagssvar, 'TE', {
    type: 'send_varsel',
    varsler: [{ hjemmel: '34.3.3', arbeid: 'Graving ved kum 4' }],
  });

  it('svarene på kravpostene fra forrige brev står i et kort i høyre kolonne uten «Endre», og kommandoen gjelder bare varselet', async () => {
    const sendt = await svarskjemaet(mellom);
    const svarene = screen.getByRole('region', { name: /^Svarene på kravet i brev/ });
    expect(within(svarene).getByText('250 000 kr')).toBeInTheDocument();
    expect(within(svarene).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(svarene).queryByRole('button', { name: /Endre|Svar på/ })).toBeNull();
    // Uten tilbudt handling er det ingen lenke til et nytt svar på kravet.
    expect(within(svarene).queryByRole('button', { name: 'Nytt svar på kravet' })).toBeNull();
    expect(within(svarene).queryByText(/Vil du endre dem/)).toBeNull();
    await radio('Kom i tide');
    await radio('Godtar justeringen');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    const k = svaret(sendt[0]!);
    expect(k.svar).toHaveLength(1);
    expect((k.svar as Record<string, unknown>[])[0]).toMatchObject({ gjelder: varselI(mellom) });
  });

  it('et varsel fra før det første kravet står alene, uten svarene på kravet (#2358, Codex-reviewet)', async () => {
    const steg: Handling[] = [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Pålegget.',
      },
      { handling: 'varsel', spor: 'vederlag', hjemmel: '34.3.3', arbeid: 'Spunt', navn: 'V-1' },
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [{ oppgjoersform: 'tilbud', belop: 100000 }],
      },
      {
        handling: 'brev',
        navn: 'D4',
        svar: [
          {
            spor: 'vederlag',
            navn: 'S-v1',
            kravposter: [{ post: 'P1', vurdering: 'godkjent', godkjent_belop: 100000 }],
          },
        ],
      },
    ];
    const k = await kjoer(
      { id: 'foer', rader: [], start: null, steg, kontroller: [] },
      minnebane()
    );
    await svarskjemaet(await k.bane.journal());
    expect(screen.queryByRole('region', { name: /^Svarene på kravet/ })).toBeNull();
  });

  it('et varsel mellom første og andre kravversjon viser svaret på den andre (#2358, /code-review)', async () => {
    const krav = (navn: string, post?: string): Handling => ({
      handling: 'krav',
      spor: 'vederlag',
      navn,
      kravposter: [{ post, oppgjoersform: 'tilbud', belop: 100000 }],
    });
    const steg: Handling[] = [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Pålegget.',
      },
      krav('K-v1'),
      { handling: 'varsel', spor: 'vederlag', hjemmel: '34.3.3', arbeid: 'Spunt', navn: 'V-1' },
      krav('K-v2', 'P1'),
      {
        handling: 'brev',
        navn: 'D5',
        svar: [
          {
            spor: 'vederlag',
            navn: 'S-v2',
            kravposter: [{ post: 'P1', vurdering: 'godkjent', godkjent_belop: 100000 }],
          },
        ],
      },
    ];
    const k = await kjoer({ id: 'v2', rader: [], start: null, steg, kontroller: [] }, minnebane());
    await svarskjemaet(await k.bane.journal());
    expect(screen.getByRole('region', { name: /^Svarene på kravet i brev 5/ })).toBeInTheDocument();
  });

  it('uten forrige svar på kravet står ingen svar i høyre kolonne', async () => {
    await svarskjemaet(medVarsel('34.3.3'));
    expect(screen.queryByRole('region', { name: /^Svarene på kravet/ })).toBeNull();
  });

  it('i Varden åpner lenken det nye svaret på kravet, med det forrige svaret i brevet før (#2365)', async () => {
    const kjernesak = kjernesakFor(mellom);
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Svar på varselet om justering av enhetsprisene' })
    );
    const lenke = await screen.findByRole('button', { name: 'Nytt svar på kravet' });
    expect(
      screen.getByText(/Vil du endre dem, sender du et nytt svar på kravet\./)
    ).toBeInTheDocument();
    await fireEvent.click(lenke);
    expect(await screen.findByText(/^Det forrige svaret er brev \d/)).toBeInTheDocument();
    expect(screen.queryByText(/ikke bygget/)).toBeNull();
  });
});

describe('svarene fra forrige brev bruker ordene brevet brukte om varselet (MM-U50, VS-U65)', () => {
  it('et nytt svar som ga opp innsigelsen etter punkt 34.3.3, står som «Gir opp innsigelsen»', async () => {
    const post = { post: 'P1', godtar_justering: true };
    const steg: Handling[] = [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Pålegget.',
      },
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [{ oppgjoersform: 'enhetspriser', justert: true }],
      },
      {
        handling: 'brev',
        navn: 'D3',
        svar: [
          { spor: 'vederlag', navn: 'S-v1', kravposter: [{ ...post, varslet_i_tide: false }] },
        ],
      },
      {
        handling: 'revisjon',
        spor: 'vederlag',
        navn: 'S-v2',
        kravposter: [{ ...post, varslet_i_tide: true }],
      },
      { handling: 'varsel', spor: 'vederlag', hjemmel: '34.4', arbeid: 'Pumping', navn: 'V-1' },
    ];
    const k = await kjoer(
      { id: 'mellom', rader: [], start: null, steg, kontroller: [] },
      minnebane()
    );
    await svarskjemaet(await k.bane.journal());
    const svarene = screen.getByRole('region', { name: /^Svarene på kravet i brev/ });
    expect(
      within(svarene).getByText(/^Gir opp innsigelsen om at varselet etter punkt.34\.3\.3/)
    ).toBeInTheDocument();
  });
});

describe('svaret på varselet etter punkt 34.1.2 eller 34.1.3 som står alene (VS-U87 punkt 32, #2447)', () => {
  it.each([
    ['34.1.2', 'Svar på varsel om vederlagsjustering'],
    ['34.1.3', 'Svar på varsel om særskilt vederlagsjustering'],
  ] as const)(
    'svaret på varselet etter punkt %s må si om varselet kom i tide, og har ikke justeringen',
    async (hjemmel, tittel) => {
      const journal = medVarselOmVederlaget(hjemmel);
      const sendt = await svarskjemaet(journal);
      expect(screen.getByRole('heading', { name: new RegExp(tittel) })).toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: 'Godtar justeringen' })).toBeNull();
      await seBrevet();
      expect(sendt).toHaveLength(0);
      expect(
        screen.getByRole('link', { name: 'Velg om varselet kom i tide.' })
      ).toBeInTheDocument();
      await radio('Kom for sent');
      await seBrevet();
      expect(sendt).toHaveLength(1);
      expect(svaret(sendt[0]!)).toMatchObject({
        type: 'brev',
        svar: [
          {
            spor: 'vederlag',
            gjelder: varselI(journal),
            vurderinger: { varslet_i_tide: false },
            resultat: {},
          },
        ],
      });
      expect(
        (svaret(sendt[0]!).svar as Record<string, unknown>[])[0]!.vurderinger
      ).not.toHaveProperty('godtar_justering');
    }
  );

  it('«Kom i tide» sendes uttrykkelig for varselet etter punkt 34.1.2 (VS-U87 punkt 32)', async () => {
    const sendt = await svarskjemaet(medVarselOmVederlaget('34.1.2'));
    await radio('Kom i tide');
    await seBrevet();
    expect(svaret(sendt[0]!).svar).toMatchObject([{ vurderinger: { varslet_i_tide: true } }]);
  });

  it('gjelder saken en endring, tilbys ikke standpunktet til varselet etter punkt 34.1.2, og svaret sendes ikke (OV-U89 punkt 13)', async () => {
    const journal = medVarselOmVederlaget('34.1.2', medGrunnlag);
    const sendt = await svarskjemaet(journal);
    expect(screen.queryByRole('radio', { name: 'Kom i tide' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Kom for sent' })).toBeNull();
    // Punktet og panelet sier det samme, og panelet sier ikke «Ikke besvart» (system.md).
    expect(screen.getAllByText(/krever ikke punkt 34\.1\.2 varsel\. Du tar ikke/)).toHaveLength(2);
    const panelet = within(screen.getByRole('region', { name: 'Punktene i brevet' }));
    expect(panelet.queryByText('Ikke besvart')).toBeNull();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    // Mangelen er bare at det ikke er noe å sende, ikke et valg som ikke tilbys.
    expect(
      screen.getByRole('link', { name: /^Ingenting å sende\. Punkt.34\.1\.2 krever ikke varsel/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Velg om varselet kom i tide.' })).toBeNull();
  });

  it('kontrollsak: gjelder saken en endring, tilbys standpunktet til varselet etter punkt 34.1.3 (OV-U89 punkt 13 gjelder bare punkt 34.1.2)', async () => {
    const sendt = await svarskjemaet(medVarselOmVederlaget('34.1.3', medGrunnlag));
    await radio('Kom i tide');
    await seBrevet();
    expect(svaret(sendt[0]!).svar).toMatchObject([{ vurderinger: { varslet_i_tide: true } }]);
  });

  it('et nytt svar på varselet etter punkt 34.1.2 gjentar innsigelsen til byggherren gir den opp (VS-U87 punkt 33)', async () => {
    const journal = medVarselOmVederlaget('34.1.2');
    const varselet = varselI(journal);
    const besvart = skrevet(journal, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: varselet,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { varslet_i_tide: false },
          resultat: {},
        },
      ],
    });
    const sendt = await svarskjemaet(besvart);
    expect(
      screen.getByText(/at varselet kom for sent\. Svaret gjentar innsigelsen\.$/)
    ).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Gi opp innsigelsen' }));
    await seBrevet();
    expect(svaret(sendt[0]!)).toMatchObject({
      type: 'revisjon',
      svar: { gjelder: varselet, vurderinger: { varslet_i_tide: true } },
    });
  });
});
