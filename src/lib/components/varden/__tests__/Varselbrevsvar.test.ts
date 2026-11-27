/**
 * Byggherrens svar på flere varsler i samme brev, i ett svarskjema og ett brev (M-5 og U-8 i BF-37,
 * #2451), med kjernen i minnet. Brevet har ett svar per varsel med varselet i `gjelder` (svaret
 * 27.11 i #2451, VS-U96 punkt 32 og 33).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { varsleneIBrevet } from '#lib/kjernesak/vederlagskrav.ts';
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  MERKING,
  SAK,
  linje,
  medGrunnlag,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Varselbrevsvar from '#lib/components/varden/Varselbrevsvar.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';

const GRAVING = 'Graving ved kum 4';
const FJERNVARME = 'Omlegging av fjernvarmerør';
const iEttBrev = (...varsler: { hjemmel: '34.3.3' | '34.4'; arbeid: string }[]) =>
  skrevet(medGrunnlag, 'TE', { type: 'send_varsel', varsler });
const toRegningsarbeid = () =>
  iEttBrev({ hjemmel: '34.4', arbeid: GRAVING }, { hjemmel: '34.4', arbeid: FJERNVARME });
const varsleneI = (journal: Journalrad[]) =>
  utledJournal(journal, KJERNE).spor.vederlag.kravpostvarsler.map((v) => v.id);

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
  const varslene = varsleneIBrevet(u, kjernesak.tilbudte, varsleneI(journal)[0]!)!;
  const sendt: TilBrevkontrollen[] = [];
  render(Varselbrevsvar, {
    kjernesak,
    u,
    varslene,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
const kommandoen = (k: TilBrevkontrollen) =>
  k.kommando as { type: string; svar: Record<string, unknown>[] };
/** Raden for varsel nummer `nr` i skjemaet. */
const raden = (nr: number) =>
  within(
    screen.getByRole('heading', { name: new RegExp(`^${nr}\\. Varselet`) }).closest('section')!
  );

afterEach(cleanup);

describe('byggherrens svar på to varsler i samme brev (M-5 og U-8 i BF-37, #2451)', () => {
  it('skjemaet har én rad per varsel, med arbeidet under navnet (U-8)', async () => {
    await svarskjemaet(toRegningsarbeid());
    expect(screen.getByRole('heading', { name: /^Svar på varslene i brev/ })).toBeInTheDocument();
    expect(raden(1).getByText(`Arbeidet varselet gjelder: ${GRAVING}`)).toBeInTheDocument();
    expect(raden(2).getByText(`Arbeidet varselet gjelder: ${FJERNVARME}`)).toBeInTheDocument();
  });

  it('uten standpunkt til noe varsel er det ikke noe å sende (prototypen `#svar`)', async () => {
    const sendt = await svarskjemaet(toRegningsarbeid());
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Ta stilling til minst ett varsel.' })
    ).toBeInTheDocument();
  });

  it('svaret på det ene varselet er ett svar i brevet, med det varselet i `gjelder` (VS-U96 punkt 32)', async () => {
    const journal = toRegningsarbeid();
    const [, fjernvarme] = varsleneI(journal);
    const sendt = await svarskjemaet(journal);
    await fireEvent.click(raden(2).getByRole('button', { name: 'Varselet kom for sent' }));
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(kommandoen(sendt[0]!)).toMatchObject({
      type: 'brev',
      svar: [{ spor: 'vederlag', gjelder: fjernvarme, vurderinger: { varslet_i_tide: false } }],
    });
    expect(kommandoen(sendt[0]!).svar).toHaveLength(1);
  });

  it('svarene på begge varslene er ett brev med ett svar per varsel, og begrunnelsen og forbeholdet står ved svaret de gjelder (svaret 27.11 i #2451, LV-U81)', async () => {
    const journal = toRegningsarbeid();
    const [graving, fjernvarme] = varsleneI(journal);
    const sendt = await svarskjemaet(journal);
    await fireEvent.click(raden(1).getByRole('button', { name: 'Varselet kom for sent' }));
    await fireEvent.click(raden(2).getByRole('button', { name: 'Varselet kom for sent' }));
    await fireEvent.input(raden(2).getByRole('textbox', { name: /^Begrunnelse/ }), {
      target: { value: 'Arbeidet var i gang.' },
    });
    await fireEvent.input(
      screen.getByRole('textbox', {
        name: new RegExp(
          `^Forbehold for svaret på varselet om regningsarbeid for arbeidet «${GRAVING}»`
        ),
      }),
      { target: { value: 'Mengdene er ikke kontrollert.' } }
    );
    await seBrevet();
    expect(sendt).toHaveLength(1);
    const { svar } = kommandoen(sendt[0]!);
    expect(svar.map((s) => s.gjelder)).toEqual([graving, fjernvarme]);
    expect(svar[0]).toMatchObject({ utdypning: 'Mengdene er ikke kontrollert.' });
    expect(svar[0]).not.toHaveProperty('utdypninger');
    expect(svar[1]).toMatchObject({ utdypninger: { '34.4': 'Arbeidet var i gang.' } });
    expect(svar[1]).not.toHaveProperty('utdypning');
    // Kjernen lager brevet, med arbeidet i hvert svar (D-6, LV-U4 punkt 7).
    const tekst = sendt[0]!.avsnitt.map((a) => a.laast).join('\n');
    expect(tekst).toContain(`for arbeidet «${GRAVING}»`);
    expect(tekst).toContain(`for arbeidet «${FJERNVARME}»`);
  });
});

describe('svaret på varselet om justering av enhetsprisene i et brev med flere varsler (VS-U77 punkt 30)', () => {
  it('har byggherren tatt stilling til varselet, må justeringen også besvares', async () => {
    const sendt = await svarskjemaet(
      iEttBrev({ hjemmel: '34.3.3', arbeid: GRAVING }, { hjemmel: '34.4', arbeid: FJERNVARME })
    );
    await fireEvent.click(raden(1).getByRole('radio', { name: 'Kom i tide' }));
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Velg om du godtar justeringen av enhetsprisene.' })
    ).toBeInTheDocument();
    await fireEvent.click(raden(1).getByRole('radio', { name: 'Godtar justeringen' }));
    await seBrevet();
    expect(kommandoen(sendt[0]!).svar).toMatchObject([
      { vurderinger: { varslet_i_tide: true, godtar_justering: true } },
    ]);
  });
});

describe('svaret på varslene i Varden (M-5 i BF-37)', () => {
  it('brevet med to varsler har én handling for svaret på begge, og den åpner skjemaet med én rad per varsel', async () => {
    const kjernesak = kjernesakFor(toRegningsarbeid());
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    const knapp = await screen.findByRole('button', { name: /^Svar på varslene i brev/ });
    expect(
      screen.queryByRole('button', { name: /^Svar på varselet om regningsarbeid/ })
    ).toBeNull();
    await fireEvent.click(knapp);
    expect(
      await screen.findByRole('heading', { name: /^Svar på varslene i brev/ })
    ).toBeInTheDocument();
    expect(raden(2).getByText(`Arbeidet varselet gjelder: ${FJERNVARME}`)).toBeInTheDocument();
  });

  it('etter svaret på det ene varselet står svaret på det andre for seg (VS-U96 punkt 33)', async () => {
    const journal = toRegningsarbeid();
    const [graving] = varsleneI(journal);
    const besvart = skrevet(journal, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: graving,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { varslet_i_tide: false },
          resultat: {},
        },
      ],
    });
    const kjernesak = kjernesakFor(besvart);
    await kjernesak.last();
    expect(varsleneIBrevet(kjernesak.utledning!, kjernesak.tilbudte, graving)).toBeNull();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    // U-8 i BF-37: svaret og det nye svaret sier hvilket arbeid de gjelder.
    expect(
      await screen.findByRole('button', {
        name: new RegExp(`^Svar på varselet om regningsarbeid i brev .*: ${FJERNVARME}$`),
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: new RegExp(`^Nytt svar på varselet om regningsarbeid i brev .*: ${GRAVING}$`),
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Svar på varslene i brev/ })).toBeNull();
  });
});
