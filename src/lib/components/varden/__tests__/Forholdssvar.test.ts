/**
 * Byggherrens svar på påberopelsen av forholdet i Varden (BF-08, #2009), med kjernen i minnet.
 * Forventningene har kilden i bestillingen BF-08 (U- og D-punktene) og vedtakene den viser til.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  MERKING,
  SAK,
  linje,
  medGrunnlag,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Forholdssvar from '#lib/components/varden/Forholdssvar.svelte';

const vedGrunnen = skrevet(medGrunnlag.slice(0, 1), 'TE', {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'svikt',
    underkategori: 'grunnforhold',
    klar_over_forholdet: '2026-10-01',
  },
  utdypning: 'Fjell høyere enn antatt.',
});

async function svarskjemaet(journal: Journalrad[], onleggtil?: () => void) {
  const kjernesak = lagKjernesak({
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
  await kjernesak.last();
  const sendt: TilBrevkontrollen[] = [];
  render(Forholdssvar, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
    onleggtil,
  });
  return sendt;
}

const radio = (navn: string) => fireEvent.click(screen.getByRole('radio', { name: navn }));
const seBrevet = () =>
  fireEvent.click(screen.getAllByRole('button', { name: 'Se brevet før sending' })[0]!);
type Sendt = {
  svar: { vurderinger: Record<string, unknown>; utdypninger?: Record<string, string> }[];
};
const svaret = (sendt: TilBrevkontrollen[]) => (sendt[0]!.kommando as Sendt).svar[0]!;

afterEach(cleanup);

describe('byggherrens svar på påberopelsen av forholdet i Varden (BF-08)', () => {
  it('#2181: forutsetningene fra kjernen følger innsigelsen og beskriver spørsmålet om forholdet', async () => {
    await svarskjemaet(medGrunnlag);
    const gruppe = screen.getByRole('group', { name: 'Hva svarer du på påberopelsen?' });
    expect(document.querySelector('.forutsetninger')).toBeNull();
    await radio('Ja, varselet kom for sent');
    const liste = document.querySelector('.forutsetninger')!;
    expect(liste.textContent).toContain('32.2');
    expect(gruppe).toHaveAttribute('aria-describedby', liste.id);
    expect(liste.querySelector('a')).toHaveAttribute('href', expect.stringMatching(/-varsel$/));
    await radio('Nei');
    expect(document.querySelector('.forutsetninger')).toBeNull();
    expect(gruppe).not.toHaveAttribute('aria-describedby');
  });

  it('#2181: et forhold uten varslingsplikt har ingen forutsetning etter 32.2', async () => {
    await svarskjemaet(vedGrunnen);
    expect(document.querySelector('.forutsetninger')).toBeNull();
  });

  it('irregulær endring har punktet om varselet med datoene, og ingenting er forhåndsvalgt (U-2, U-3)', async () => {
    await svarskjemaet(medGrunnlag);
    expect(
      screen.getByRole('heading', { name: /Varselet etter punkt\u00a032\.2/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Totalentreprenøren oppgir at pålegget ble mottatt 1\. okt/)
    ).toBeInTheDocument();
    expect(screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toEqual([]);
  });

  it('valgene om varselet står under hverandre med «Ja» først (#2183)', async () => {
    await svarskjemaet(medGrunnlag);
    const varselet = screen.getByRole('group', {
      name: 'Gjør du gjeldende at varselet kom for sent?',
    });
    const valg = within(varselet).getAllByRole('radio');
    expect(valg[0]).toHaveAccessibleName('Ja, varselet kom for sent');
    expect(valg[1]).toHaveAccessibleName('Nei');
    expect(valg[0]?.closest('.kort')).toHaveClass('stablet');
  });

  it('begrunnelsen vises under hvert punkt når det er besvart (#2190)', async () => {
    await svarskjemaet(medGrunnlag);
    // #2178: tittelen og brevnummeret står fra start. Stempelet står i samme hode.
    const overskrift = screen.getByRole('heading', {
      level: 2,
      name: 'Svar på forholdet i sak KOE-17',
    });
    const hode = within(overskrift.closest('header')!);
    expect(hode.getByText('Utkast · ikke sendt')).toBeInTheDocument();
    expect(hode.getByText('Brev 2 til totalentreprenøren')).toBeInTheDocument();
    expect(hode.getByText('Vår ref. K201-KOE-017-02')).toBeInTheDocument();
    expect(hode.getByText('Datoen settes ved sending')).toBeInTheDocument();
    const varselet = screen.getByRole('heading', { name: /Varselet etter punkt\u00a032\.2/ });
    const varselpunktet = within(varselet.closest('section')!);
    const forholdet = screen.getByRole('heading', { name: 'Forholdet' });
    const forholdspunktet = within(forholdet.closest('section')!);
    expect(varselpunktet.queryByRole('textbox')).toBeNull();
    expect(forholdspunktet.queryByRole('textbox')).toBeNull();
    // Forbeholdet står også før brevet kan lages, så teksten ikke blir borte, med ordet brevet
    // bruker (#2359).
    expect(screen.getByLabelText('Forbehold, Valgfri')).toBeInTheDocument();
    await radio('Nei');
    const grunn = varselpunktet.getByRole('textbox', { name: /Varselet etter punkt 32\.2/ });
    await fireEvent.input(grunn, { target: { value: 'Varselet kom samme dag.' } });
    expect(forholdspunktet.queryByRole('textbox')).toBeNull();
    await radio('Enig. Svaret er en endringsordre');
    expect(overskrift).toHaveTextContent(/^Svar på forholdet i sak KOE-17$/);
    expect(varselpunktet.getByRole('textbox')).toHaveValue('Varselet kom samme dag.');
    expect(forholdspunktet.getByRole('textbox', { name: /Forholdet/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Forbehold, Valgfri')).toBeInTheDocument();
    // Hjemmelen står til høyre på linja med overskriften, som tekst og ikke som merke («Høyst tre
    // nivåer» i `system.md`, oppdragsgiver 16.11).
    expect(forholdet.parentElement).toHaveTextContent(/pkt\. 32\.3$/);
  });

  it('brevet vises ikke før varselet og forholdet er besvart, og oppsummeringen sier hva som mangler (MM-U32)', async () => {
    const sendt = await svarskjemaet(medGrunnlag);
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Svar på om du gjør gjeldende at varselet kom for sent.' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Velg hva du svarer på påberopelsen.' })
    ).toBeInTheDocument();
  });

  it('lenken i «Dette mangler» flytter fokus til valggruppen for varselet (#2183)', async () => {
    await svarskjemaet(medGrunnlag);
    await seBrevet();
    const lenke = screen.getByRole('link', {
      name: 'Svar på om du gjør gjeldende at varselet kom for sent.',
    });
    await fireEvent.click(lenke);
    expect(
      screen.getByRole('radio', { name: 'Ja, varselet kom for sent' }).closest('fieldset')
    ).toHaveFocus();
  });

  it('godkjenning uten påberopt preklusjon er en endringsordre, og skjemaet viser setningen med sitatet før sending (D-3, U-5)', async () => {
    const sendt = await svarskjemaet(medGrunnlag);
    await radio('Nei');
    await radio('Enig. Svaret er en endringsordre');
    expect(screen.getByText('Svaret er en endringsordre')).toBeInTheDocument();
    expect(
      screen.getByText(/punkt 32\.3 første ledd a.*«BH påla ny peling\.»/s)
    ).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt).vurderinger).toEqual({
      grunnlag_varslet_i_tide: true,
      resultat: 'godkjent',
    });
  });

  it('endres svaret om varselet etter «Enig», tas valget bort, så svaret ikke blir en endringsordre byggherren ikke har valgt (U-4, D-3, D-4)', async () => {
    const sendt = await svarskjemaet(medGrunnlag);
    await radio('Ja, varselet kom for sent');
    await radio('Enig i at pålegget innebærer en endring');
    await radio('Nei');
    expect(
      screen.getByRole('radio', { name: 'Enig. Svaret er en endringsordre' })
    ).not.toBeChecked();
    expect(screen.queryByText('Svaret er en endringsordre')).not.toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Velg hva du svarer på påberopelsen.' })
    ).toBeInTheDocument();
  });

  it('svarer byggherren på forholdet før varselet, står «Enig. Svaret er en endringsordre» når svaret om varselet er «Nei» (U-4)', async () => {
    await svarskjemaet(medGrunnlag);
    await radio('Enig. Svaret er en endringsordre');
    await radio('Nei');
    expect(screen.getByRole('radio', { name: 'Enig. Svaret er en endringsordre' })).toBeChecked();
  });

  it('når varselet påberopes for sent, er frafall ikke et valg, og skjemaet sier hvorfor (D-6, U-4)', async () => {
    await svarskjemaet(medGrunnlag);
    await radio('Frafaller pålegget');
    await radio('Ja, varselet kom for sent');
    expect(screen.queryByRole('radio', { name: 'Frafaller pålegget' })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Du kan ikke frafalle pålegget og samtidig gjøre gjeldende/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Enig i at pålegget innebærer en endring' })
    ).not.toBeChecked();
  });

  it('påberopes varselet for sent, kreves en begrunnelse under punktet om varselet eller forholdet (D-7)', async () => {
    const sendt = await svarskjemaet(medGrunnlag);
    await radio('Ja, varselet kom for sent');
    await radio('Enig i at pålegget innebærer en endring');
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Skriv en begrunnelse for svaret på forholdet.' })
    ).toBeInTheDocument();
    // Ett av de to feltene holder, så ingen av dem er påkrevd alene, og begge viser til samme
    // forklaring (design-review i #2031).
    const felt = screen.getByLabelText(/Varselet etter punkt 32\.2$/, { selector: 'textarea' });
    const forholdet = screen.getByLabelText(/Forholdet$/, { selector: 'textarea' });
    for (const f of [felt, forholdet]) {
      expect(f).not.toHaveAttribute('aria-required');
      const beskrevet = f.getAttribute('aria-describedby')!.split(' ');
      expect(beskrevet.map((id) => document.getElementById(id)?.textContent)).toContain(
        'Kreves fordi du gjør gjeldende at varselet kom for sent. Skriv den under punktet om varselet eller forholdet.'
      );
    }
    // Feilen står ved punktet om forholdet, det første i kravet (D-7).
    expect(forholdet).toHaveAttribute('aria-invalid', 'true');
    await fireEvent.input(felt, { target: { value: 'Pålegget kom 1. oktober.' } });
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(svaret(sendt).vurderinger).toEqual({
      grunnlag_varslet_i_tide: false,
      resultat: 'godkjent',
    });
    expect(svaret(sendt).utdypninger).toEqual({ '32.2': 'Pålegget kom 1. oktober.' });
  });

  it('avslaget på kravet om endringsordre krever en begrunnelse under punktet om forholdet (D-7)', async () => {
    const sendt = await svarskjemaet(medGrunnlag);
    await radio('Nei');
    await radio('Avslår kravet på endringsordre');
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(screen.getByLabelText(/Forholdet$/, { selector: 'textarea' })).toHaveAttribute(
      'aria-required',
      'true'
    );
    // Feltet som ikke kreves, har «Valgfri» til høyre (system.md, «Et valgfritt felt har
    // «Valgfri» til høyre på linja med labelen», oppdragsgiver 16.11).
    expect(
      screen.getByLabelText(/Varselet etter punkt 32\.2, Valgfri$/, { selector: 'textarea' })
    ).not.toHaveAttribute('aria-required');
  });

  it('frafallet sendes med standpunktet paalegg_frafalt der pålegget er byggherrens eget (GR-U18)', async () => {
    const sendt = await svarskjemaet(medGrunnlag);
    await radio('Nei');
    await radio('Frafaller pålegget');
    await seBrevet();
    expect(svaret(sendt).vurderinger).toEqual({
      grunnlag_varslet_i_tide: true,
      resultat: 'paalegg_frafalt',
    });
  });

  it('forholdet ved grunnen har ikke punktet om varselet, og valgene sier om byggherren har risikoen (F-5, U-4, LV-U41)', async () => {
    const sendt = await svarskjemaet(vedGrunnen);
    expect(
      screen.queryByRole('heading', { name: /Varselet etter punkt\u00a032\.2/ })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Frafaller pålegget' })).not.toBeInTheDocument();
    await radio('Byggherren har ikke risikoen');
    await seBrevet();
    expect(svaret(sendt).vurderinger).toEqual({ resultat: 'avslaatt' });
  });

  it('ett lenkevalg åpner registrering av et svar gitt utenfor løsningen (U-14, OV-U101, #2183)', async () => {
    const onleggtil = vi.fn();
    await svarskjemaet(medGrunnlag, onleggtil);
    const lenken = screen.getByRole('button', { name: 'Legg til et svar du har gitt før' });
    expect(screen.queryByText(/Legg svaret til i saken som korrespondanse/)).toBeNull();
    await fireEvent.click(lenken);
    expect(onleggtil).toHaveBeenCalledOnce();
  });
});

describe('ordlyden i forutsetningene (#2183 G-2)', () => {
  it('forutsetningen etter punkt 32.2 har felles ordlyd med liten forbokstav (#2183 G-2)', async () => {
    await svarskjemaet(medGrunnlag);
    await radio('Ja, varselet kom for sent');
    expect(
      screen.getByRole('link', {
        name: 'innsigelsen om at varselet etter punkt\u00a032.2 kom for sent',
      })
    ).toBeInTheDocument();
  });
});

describe('vilkåret i punktene ved skjemaet (#2182, svar B 19.11)', () => {
  it('standpunktet om forholdet etter innsigelsen om varselet begynner med vilkåret i klarspråk, uten lagnavnet fra brevet', async () => {
    await svarskjemaet(medGrunnlag);
    await radio('Ja, varselet kom for sent');
    await radio('Enig i at pålegget innebærer en endring');
    const punktene = screen.getByRole('region', { name: 'Punktene i brevet' });
    const linjer = [...punktene.querySelectorAll('.punktstatus')].map((p) =>
      [...p.children].map((c) => c.textContent!.replaceAll('\u00a0', ' '))
    );
    expect(linjer.slice(0, 2)).toEqual([
      ['Du gjør gjeldende at varselet etter punkt 32.2 kom for sent'],
      [
        'Hvis innsigelsen om at varselet etter punkt 32.2 kom for sent ikke fører frem',
        'Du er enig i at pålegget innebærer en endring',
      ],
    ]);
    expect(punktene.textContent).not.toMatch(/Prinsipalt|Subsidiært/);
  });
});
