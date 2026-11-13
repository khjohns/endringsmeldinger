/**
 * Skjemaet for ny sak i Varden (BF-05, #1481). Forventningene har kilde i bestillingen
 * (docs/domenetabell/brukerforlop/BF-05.md): feilene ved feltet før brevkontrollen (F-4, U-5,
 * D-2, GR-U15), ledetekstene som følger forholdet (F-5, VS-U26), og at saken først finnes når
 * påberopelsen er godtatt (KT-U11).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import NySak from '$lib/components/varden/NySak.svelte';
import { DEMOMERKING, finnForloep, lagDemosak } from '$lib/kjernesak/demosak';
import {
  fjernAndresVentende,
  fjernVentende,
  lagreVentende,
  lesVentende,
} from '$lib/components/varden/ventende';
import { type SendNySak, type Utfylling, type VedleggForNySak } from '$lib/components/varden/nysak';
import type { Kjernevedlegg } from '$lib/api/kjerne';
import { kravMotNySak, type Saksmerking } from '$lib/kjernesak/brevtekst';
import { ApiError } from '$lib/api/client';
import { KJERNE } from '$kjerne/versjon';
import { brevtittel, NYSAK } from '$lib/components/varden/tekster';

afterEach(cleanup);

const BESKRIVELSE = 'Byggherren påla teglforblending i stedet for platekledning.';

/** Mellomlageret for vedleggene før saken finnes, som `lastOppVedleggForNySak` svarer. */
function lagVedleggsgrense() {
  let n = 0;
  return {
    lastOpp: vi.fn<VedleggForNySak['lastOpp']>(
      async (fil): Promise<Kjernevedlegg> => ({
        vedlegg_id: `00000000-0000-4000-8000-${(++n).toString().padStart(12, '0')}`,
        filnavn: fil.name,
        innhold_sha256: 'a'.repeat(64),
        stoerrelse: fil.size,
      })
    ),
    slett: vi.fn<VedleggForNySak['slett']>(async () => ({ success: true })),
  };
}

function aapne(
  send = vi.fn<SendNySak>(async () => ({ sakId: 'ny-sak' })),
  {
    utkast = null as Utfylling | null,
    hentMerking = async (): Promise<Saksmerking> => DEMOMERKING,
  } = {}
) {
  const onsendt = vi.fn();
  const onavbrutt = vi.fn();
  const vedleggForNySak = lagVedleggsgrense();
  render(NySak, {
    sakId: 'ny-sak',
    send,
    hentMerking,
    vedleggForNySak,
    utkast,
    onsendt,
    onavbrutt,
  });
  return { send, onsendt, onavbrutt, vedleggForNySak };
}

const velgFiler = (...filer: File[]) =>
  fireEvent.change(screen.getByLabelText('Vedlegg (valgfritt)'), { target: { files: filer } });

async function sendBrevet() {
  await seBrevet();
  await fireEvent.click(
    await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
}

const ENDRINGER = 'Endringer, jf. punkt 31 og 32';
const SVIKT = 'Forsinkelse eller svikt ved byggherrens ytelser etter punkt 22, 23 og 24';

/** Velgeren fra `/mockup` har gruppene felt sammen, så TE åpner gruppen før forholdet velges. */
async function velgForhold(gruppe: string, navn: RegExp) {
  await fireEvent.click(screen.getByRole('button', { name: gruppe }));
  await fireEvent.click(screen.getByRole('radio', { name: navn }));
}

const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));

async function fyllIrregulaerEndring({ beskrivelse = BESKRIVELSE } = {}) {
  await velgForhold(ENDRINGER, /^Irregulær endring/);
  await fireEvent.input(screen.getByLabelText('Tittel på saken'), {
    target: { value: 'Teglforblending på fasaden' },
  });
  await fireEvent.input(screen.getByLabelText('Beskrivelse av pålegget'), {
    target: { value: beskrivelse },
  });
  await fireEvent.input(screen.getByLabelText('Dato du mottok pålegget'), {
    target: { value: '2026-09-15' },
  });
}

describe('skjemaet for ny sak (BF-05)', () => {
  it('F-4/U-5: uten forhold og tittel står feilene før brevkontrollen, og ingenting sendes', async () => {
    const { send } = aapne();
    await seBrevet();
    const liste = await screen.findByRole('group', {
      name: 'Det mangler noe før du kan se brevet',
    });
    expect(within(liste).getByText('Velg forholdet.')).toBeTruthy();
    expect(within(liste).getByText('Skriv tittelen.')).toBeTruthy();
    expect(within(liste).getByText('Ingen sak er opprettet ennå.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Sending' })).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('F-4: feilen for forholdet står under hjelpeteksten, før listen over forholdene', async () => {
    aapne();
    await seBrevet();
    const feilen = screen
      .getAllByText('Velg forholdet.')
      .find((e) => e.tagName === 'P') as HTMLElement;
    const hjelp = screen.getByText(
      'Velg bestemmelsen i kontrakten pålegget eller forholdet faller inn under.'
    );
    expect(hjelp.compareDocumentPosition(feilen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const forste = screen.getByRole('button', { name: ENDRINGER });
    expect(feilen.compareDocumentPosition(forste) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('WCAG 4.1.3: antallet forhold som passer med søket, leses opp', async () => {
    aapne();
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'finnes ikke' } });
    expect(screen.getByRole('status').textContent).toContain('Ingen forhold passer med søket.');
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'irregulær' } });
    expect(screen.getByRole('status').textContent).toContain('Ett forhold passer med søket.');
  });

  it('D-2/GR-U15: kjernen avviser påberopelsen uten beskrivelse, og feilen står ved feltet', async () => {
    const { send } = aapne();
    await fyllIrregulaerEndring({ beskrivelse: '' });
    await seBrevet();
    const felt = screen.getByLabelText('Beskrivelse av pålegget');
    expect(felt.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByText('Beskriv pålegget.').length).toBe(2);
    expect(send).not.toHaveBeenCalled();
  });

  it('F-4: mangler datoen pålegget ble mottatt, står «Oppgi datoen.»', async () => {
    aapne();
    await velgForhold(ENDRINGER, /^Irregulær endring/);
    await fireEvent.input(screen.getByLabelText('Tittel på saken'), { target: { value: 'T' } });
    await seBrevet();
    expect(screen.getAllByText('Oppgi datoen.').length).toBe(2);
  });

  it('F-5/VS-U26: ved svikt følger ledetekstene forholdet, og spørsmålet om punkt 32.2 vises ikke', async () => {
    aapne();
    await velgForhold(SVIKT, /^Manglende medvirkning/);
    expect(screen.getByLabelText('Beskrivelse av forholdet')).toBeTruthy();
    expect(screen.getByLabelText('Dato du ble klar over forholdet')).toBeTruthy();
    expect(screen.queryByText(/allerede varslet byggherren etter punkt 32.2/)).toBeNull();
  });

  it('F-5: ved et pålegg der punkt 32.2 gjelder, spør skjemaet om varselet alt er sendt', async () => {
    aapne();
    await velgForhold(ENDRINGER, /^Irregulær endring/);
    expect(screen.getByText(/allerede varslet byggherren etter punkt 32.2/)).toBeTruthy();
  });

  it('F-5: spørsmålet om punkt 32.2 sier «forholdet» når forholdet ikke er et pålegg', async () => {
    aapne();
    await velgForhold(ENDRINGER, /^Samordning/);
    expect(screen.getByLabelText('Beskrivelse av forholdet')).toBeTruthy();
    expect(screen.getByText(/på annen måte, at forholdet er en endring\?/)).toBeTruthy();
  });

  it('U-3/arbeidsvalg 02.11: det valgte forholdet viser kontraktens regel, og «Endre» åpner velgeren', async () => {
    aapne();
    await velgForhold(ENDRINGER, /^Irregulær endring/);
    expect(screen.getByText(/varsle etter punkt 32.2/)).toBeTruthy();
    expect(screen.queryByText(/§|\bhan\b/)).toBeNull();
    expect(screen.getByText(/Forholdet står fast når brevet er sendt/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Endre' }));
    expect(screen.getByRole('radio', { name: /^Irregulær endring/ })).toBeTruthy();
  });

  it('arbeidsvalg 02.11: gruppene i velgeren er felt sammen til TE åpner én, og et søk åpner gruppene med treff', async () => {
    aapne();
    expect(screen.queryByRole('radio', { name: /^Irregulær endring/ })).toBeNull();
    const gruppe = screen.getByRole('button', { name: ENDRINGER });
    expect(gruppe.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(gruppe);
    expect(gruppe.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('radio', { name: /^Irregulær endring/ })).toBeTruthy();
    await fireEvent.click(gruppe);
    await fireEvent.input(screen.getByLabelText('Søk etter forhold eller punkt'), {
      target: { value: 'grunnen' },
    });
    expect(screen.getByRole('radio', { name: /^Uforutsette forhold ved grunnen/ })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /^Irregulær endring/ })).toBeNull();
  });

  it('OV-U77/OV-U78: gruppene har kontraktens henvisning, og hvert forhold har sitt eget navn uten skråstrek', async () => {
    aapne();
    const navnene: string[] = [];
    for (const gruppe of [ENDRINGER, SVIKT, 'Andre forhold byggherren har risikoen for']) {
      await fireEvent.click(screen.getByRole('button', { name: gruppe }));
      for (const r of within(screen.getByRole('radiogroup', { name: gruppe })).getAllByRole(
        'radio'
      ))
        navnene.push(r.closest('label')!.textContent!);
    }
    expect(navnene.some((n) => n.includes('Samordning'))).toBe(true);
    expect(navnene.some((n) => n.includes('Endring ved svar på varsel'))).toBe(true);
    expect(navnene.some((n) => n.includes('/'))).toBe(false);
    const utenPunkt = navnene.map((n) => n.replace(/punkt .*$/, '').trim());
    expect(new Set(utenPunkt).size).toBe(utenPunkt.length);
  });

  it('skissen versjon 3 og F-5: beskrivelsen, datoen og vedlegget står før forholdet er valgt, spørsmålet om punkt 32.2 først når det gjelder', async () => {
    aapne();
    expect(screen.getByLabelText('Beskrivelse av pålegget')).toBeTruthy();
    expect(screen.getByLabelText('Dato du mottok pålegget')).toBeTruthy();
    expect(screen.getByText('Vedlegg (valgfritt)')).toBeTruthy();
    expect(screen.queryByText(/allerede varslet byggherren etter punkt 32.2/)).toBeNull();
  });

  it('F-8/VS-U39: opplysningen fra kapittel B står ved spørsmålet, både ved nei og ved ja', async () => {
    aapne();
    await velgForhold(ENDRINGER, /^Irregulær endring/);
    const opplysning = /Etter kapittel B i kontraktsgrunnlaget skal varsel om endring sendes/;
    expect(screen.getByText(opplysning)).toBeTruthy();
    await fireEvent.click(screen.getByRole('radio', { name: 'Ja' }));
    expect(screen.getByText(opplysning)).toBeTruthy();
  });

  it('oppdragsgiver 02.11 (PR #1492): de fire forholdene har navnene fra NS 8407 punkt 14.4, 15.2, 10.2 og 19.1', async () => {
    aapne();
    await fireEvent.click(screen.getByRole('button', { name: ENDRINGER }));
    expect(
      screen.getByRole('radio', { name: /^Endringer i lover og vedtak for kontraktsgjenstanden/ })
    ).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: /^Endringer i lover og vedtak for prosessen/ })
    ).toBeTruthy();
    await fireEvent.click(
      screen.getByRole('button', { name: 'Andre forhold byggherren har risikoen for' })
    );
    expect(screen.getByRole('radio', { name: /^Nektet valg av kontraktsmedhjelper/ })).toBeTruthy();
    expect(
      screen.getByRole('radio', {
        name: /^Skade forårsaket av byggherren eller byggherrens kontraktsmedhjelpere/,
      })
    ).toBeTruthy();
  });

  it('F-1: «Se brevet før sending» står i panelet ved siden av skjemaet, som viser forholdet når det er valgt', async () => {
    aapne();
    const panel = screen.getByRole('region', { name: 'Hovedlinjene i påberopelsen' });
    expect(within(panel).getByText('Velg forholdet, så står påberopelsen her.')).toBeTruthy();
    expect(within(panel).getByRole('button', { name: 'Se brevet før sending' })).toBeTruthy();
    await velgForhold(ENDRINGER, /^Irregulær endring/);
    expect(within(panel).getByText(/^Irregulær endring, punkt 32\.1$/)).toBeTruthy();
    // GR-U31: der punkt 32.2 gjelder, sier brevet at TE varsler etter bestemmelsen.
    expect(within(panel).getByText('Brevet varsler etter punkt 32.2')).toBeTruthy();
    expect(within(panel).getByText('Ingen vedlegg')).toBeTruthy();
    // VS-U38: dokumentet med varselet som alt er sendt, legges ved brevet.
    await fireEvent.click(screen.getByRole('radio', { name: 'Ja' }));
    expect(within(panel).getByText('Dokumentet med varselet som alt er sendt')).toBeTruthy();
  });

  it('#1533: velgeren viser punktet slik brevet skriver det, «33.1 c», og kontraktens regel står', async () => {
    aapne();
    await velgForhold('Andre forhold byggherren har risikoen for', /^Annet forhold byggherren/);
    const panel = screen.getByRole('region', { name: 'Hovedlinjene i påberopelsen' });
    expect(
      within(panel).getByText(/^Annet forhold byggherren har risikoen for, punkt 33\.1 c$/)
    ).toBeTruthy();
    expect(screen.getByText(/som ikke faller inn under endringer eller svikt/)).toBeTruthy();
  });

  it('F-1/GR-U31: ved svikt sier panelet ikke at brevet varsler etter punkt 32.2', async () => {
    aapne();
    await velgForhold(SVIKT, /^Svikt i byggherrens prosjektering/);
    const panel = screen.getByRole('region', { name: 'Hovedlinjene i påberopelsen' });
    expect(within(panel).queryByText('Brevet varsler etter punkt 32.2')).toBeNull();
  });

  it('D-8/VS-U38/OV-U79: ved ja ber skjemaet om typen, datoen og en kort beskrivelse, og sendemåten bare for et brev', async () => {
    const { send } = aapne();
    await fyllIrregulaerEndring();
    await fireEvent.click(screen.getByRole('radio', { name: 'Ja' }));
    expect(screen.getByRole('group', { name: 'Hva legger du til?' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Hvordan ble brevet sendt?' })).toBeNull();
    await seBrevet();
    for (const tekst of [
      'Velg hva du legger til.',
      'Oppgi datoen varselet ble sendt.',
      'Beskriv varselet.',
    ])
      expect(screen.getAllByText(tekst).length).toBe(2);
    await fireEvent.click(screen.getByRole('radio', { name: 'Brev' }));
    for (const navn of ['Per post', 'Som PDF i e-post', 'I prosjekthotellet', 'På annen måte'])
      expect(screen.getByRole('radio', { name: navn })).toBeTruthy();
    await seBrevet();
    expect(screen.getAllByText('Velg sendemåten.').length).toBe(2);
    expect(send).not.toHaveBeenCalled();
  });

  it('F-4: ved nei står feilene for varselet som alt er sendt, ikke lenger i oppsummeringen', async () => {
    aapne();
    await fyllIrregulaerEndring();
    await fireEvent.click(screen.getByRole('radio', { name: 'Ja' }));
    await seBrevet();
    expect(screen.getAllByText('Beskriv varselet.').length).toBe(2);
    await fireEvent.click(screen.getByRole('radio', { name: 'Nei' }));
    expect(screen.queryByText('Beskriv varselet.')).toBeNull();
    expect(screen.queryByText('Velg hva du legger til.')).toBeNull();
    expect(
      screen.queryByRole('group', { name: 'Det mangler noe før du kan se brevet' })
    ).toBeNull();
  });

  it('tidslinja viser datoene TE fyller ut og dagen påberopelsen sendes (oppdragsgiver 02.11, #1492)', async () => {
    aapne();
    const tidslinja = () => within(screen.getByRole('region', { name: 'Tidslinje' }));
    expect(tidslinja().getByText('Påberopelsen sendes')).toBeTruthy();
    expect(tidslinja().queryByText('Mottok pålegget')).toBeNull();
    await fyllIrregulaerEndring();
    expect(tidslinja().getByText('15. september 2026')).toBeTruthy();
    expect(tidslinja().getByText('Mottok pålegget')).toBeTruthy();
    await fireEvent.click(screen.getByRole('radio', { name: 'Ja' }));
    await fireEvent.input(screen.getByLabelText('Datoen det ble sendt'), {
      target: { value: '2026-09-16' },
    });
    expect(tidslinja().getByText('Varselet som alt er sendt')).toBeTruthy();
    expect(tidslinja().getByText('16. september 2026')).toBeTruthy();
  });

  it('D-8: utfylt varsel som alt er sendt, stanser før brevkontrollen til lagringen finnes (#807, #1487)', async () => {
    const { send } = aapne();
    await fyllIrregulaerEndring();
    await fireEvent.click(screen.getByRole('radio', { name: 'Ja' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'E-post' }));
    await fireEvent.input(screen.getByLabelText('Datoen det ble sendt'), {
      target: { value: '2026-09-16' },
    });
    await fireEvent.input(screen.getByLabelText('Kort beskrivelse av varselet'), {
      target: { value: 'Varsel om endring sendt etter byggemøtet.' },
    });
    await seBrevet();
    expect(screen.getAllByText(/Varselet kan ikke legges til i saken ennå/).length).toBe(2);
    expect(screen.queryByRole('region', { name: 'Sending' })).toBeNull();
    expect(send).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('radio', { name: 'Nei' }));
    await seBrevet();
    expect(screen.getByRole('region', { name: 'Sending' })).toBeTruthy();
  });

  it('U-6: brevkontrollen viser brevet fra kjernen, og «Tilbake» beholder det som er skrevet', async () => {
    aapne();
    await fyllIrregulaerEndring();
    await seBrevet();
    const panel = await screen.findByRole('region', { name: 'Sending' });
    expect(within(panel).getByText('Send påberopelsen til byggherren')).toBeTruthy();
    expect(screen.getByText('Påberopelse av irregulær endring i sak KOE-17')).toBeTruthy();
    // Beskrivelsen står i avsnittene kjernen lager, slik brevet sendes (LV-U2, #1856).
    expect(
      within(screen.getByRole('article', { name: /Påberopelse av irregulær endring/ })).getByText(
        BESKRIVELSE
      )
    ).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Tilbake til skjemaet' }));
    expect((screen.getByLabelText('Tittel på saken') as HTMLInputElement).value).toBe(
      'Teglforblending på fasaden'
    );
  });

  it('LV-U44, LV-U53: brevkontrollen viser Vår ref. med brev 1, merkingen kjernen fryser for påberopelsen, ikke versjonen, og ingen Deres ref. (U-3 i BF-07)', async () => {
    aapne();
    await fyllIrregulaerEndring();
    await seBrevet();
    await screen.findByRole('region', { name: 'Sending' });
    expect(screen.getByTestId('vaar-ref').textContent).toBe('K201-KOE-017-01');
    expect(screen.queryByTestId('deres-ref')).toBeNull();
  });

  it('F-4: feilen for endringsordren forsvinner når feltet fylles ut', async () => {
    aapne();
    await velgForhold(ENDRINGER, /^Endringsordre/);
    await seBrevet();
    const felt = screen.getByLabelText('Endringsordrens nummer eller dato');
    expect(felt.getAttribute('aria-invalid')).toBe('true');
    await fireEvent.input(felt, { target: { value: 'EO-012' } });
    expect(felt.getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryAllByText('Oppgi endringsordren.').length).toBe(0);
  });

  it('KT-U11: sendingen går gjennom grensen med opprettelsen og påberopelsen samlet', async () => {
    const { send, onsendt } = aapne();
    await fyllIrregulaerEndring();
    await seBrevet();
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await vi.waitFor(() => expect(onsendt).toHaveBeenCalledWith('ny-sak'));
    const sendt = send.mock.calls[0][0];
    expect(sendt.sakId).toBe('ny-sak');
    expect(sendt.opprettelse).toEqual({
      type: 'opprett_sak',
      sakstittel: 'Teglforblending på fasaden',
    });
    expect(sendt.paaberopelse.innhold).toMatchObject({
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      paalegg_mottatt: '2026-09-15',
    });
    expect(sendt.paaberopelse.utdypning).toBe(BESKRIVELSE);
    expect(sendt.tekst.length).toBeGreaterThan(0);
  });

  it('#1037: vedleggene lastes opp før saken finnes, og påberopelsen og brevet binder dem', async () => {
    const { send, onsendt, vedleggForNySak } = aapne();
    await fyllIrregulaerEndring();
    await velgFiler(new File(['tegning'], 'tegning.pdf'), new File(['referat'], 'referat.pdf'));
    await screen.findByRole('button', { name: 'Fjern referat.pdf' });
    expect(vedleggForNySak.lastOpp).toHaveBeenCalledTimes(2);
    await sendBrevet();
    await vi.waitFor(() => expect(onsendt).toHaveBeenCalled());
    const sendt = send.mock.calls[0][0];
    const ider = (await Promise.all(vedleggForNySak.lastOpp.mock.results.map((r) => r.value))).map(
      (v) => v.vedlegg_id
    );
    expect(sendt.paaberopelse.dokumentasjon).toEqual(ider);
    // Brevet kjernen lager, oppgir vedleggene (LV-U14).
    expect(sendt.tekst.join('\n')).toContain('tegning.pdf');
    expect(sendt.utkast.vedlegg.map((v) => v.filnavn)).toEqual(['tegning.pdf', 'referat.pdf']);
  });

  it('#1037: et fjernet vedlegg slettes fra mellomlageret og står ikke i påberopelsen', async () => {
    const { send, onsendt, vedleggForNySak } = aapne();
    await fyllIrregulaerEndring();
    await velgFiler(new File(['tegning'], 'tegning.pdf'));
    await fireEvent.click(await screen.findByRole('button', { name: 'Fjern tegning.pdf' }));
    expect(vedleggForNySak.slett).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001');
    expect(screen.queryByText('tegning.pdf')).toBeNull();
    // Knappen forsvant med raden, så fokus står på velgeren og ikke på siden (WCAG 2.4.3).
    expect(document.activeElement).toBe(screen.getByLabelText(/Vedlegg/));
    await sendBrevet();
    await vi.waitFor(() => expect(onsendt).toHaveBeenCalled());
    expect(send.mock.calls[0][0].paaberopelse).not.toHaveProperty('dokumentasjon');
  });

  it('#1037: velgerens navn har knappeteksten «Velg filer» (WCAG 2.5.3)', () => {
    aapne();
    expect(screen.getByLabelText(/Vedlegg/).getAttribute('type')).toBe('file');
    expect(screen.getByLabelText('Vedlegg (valgfritt) Velg filer')).toBeTruthy();
  });

  it('#1037: en fil over 15 MB lastes ikke opp, og feilen står ved feltet', async () => {
    const { vedleggForNySak } = aapne();
    const stor = new File(['x'], 'modell.ifc');
    Object.defineProperty(stor, 'size', { value: 15 * 1024 * 1024 + 1 });
    await velgFiler(stor);
    expect(vedleggForNySak.lastOpp).not.toHaveBeenCalled();
    expect(screen.getByText('modell.ifc er større enn 15 MB. Velg en mindre fil.')).toBeTruthy();
  });

  it('#1037: en opplasting som feiler, står ved feltet med serverens melding', async () => {
    const { vedleggForNySak } = aapne();
    vedleggForNySak.lastOpp.mockRejectedValueOnce(new Error('Filen er tom.'));
    await velgFiler(new File([''], 'tom.pdf'));
    expect(await screen.findByText('tom.pdf ble ikke lastet opp. Filen er tom.')).toBeTruthy();
  });

  it('#1037: mens en fil lastes opp, venter brevkontrollen på den', async () => {
    const { vedleggForNySak } = aapne();
    vedleggForNySak.lastOpp.mockReturnValueOnce(new Promise(() => {}));
    await fyllIrregulaerEndring();
    await velgFiler(new File(['tegning'], 'tegning.pdf'));
    await seBrevet();
    const liste = await screen.findByRole('group', {
      name: 'Det mangler noe før du kan se brevet',
    });
    expect(within(liste).getByText('Vent til vedleggene er lastet opp.')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Jeg har kontrollert brevet' })).toBeNull();
  });

  it('#1526 punkt 1: utkastet fra et forsøk med usikkert utfall gir den samme sendingen', async () => {
    const foerste = aapne();
    await fyllIrregulaerEndring();
    await velgFiler(new File(['tegning'], 'tegning.pdf'));
    await screen.findByRole('button', { name: 'Fjern tegning.pdf' });
    await sendBrevet();
    await vi.waitFor(() => expect(foerste.send).toHaveBeenCalled());
    const forsoek = foerste.send.mock.calls[0][0];
    cleanup();

    // Ny innlasting: skjemaet starter fra utkastet, og TE sender uten å skrive noe på nytt.
    const andre = aapne(undefined, { utkast: forsoek.utkast });
    await sendBrevet();
    await vi.waitFor(() => expect(andre.send).toHaveBeenCalled());
    const nytt = andre.send.mock.calls[0][0];
    expect(nytt.opprettelse).toEqual(forsoek.opprettelse);
    expect(nytt.paaberopelse).toEqual(forsoek.paaberopelse);
    expect(nytt.tekst).toEqual(forsoek.tekst);
    expect(andre.vedleggForNySak.lastOpp).not.toHaveBeenCalled();
  });

  it('LV-U46: tok en annen sak nummeret, vises brevet med det nye nummeret og sendes med det', async () => {
    let nummer = 17;
    const send = vi
      .fn<SendNySak>()
      .mockImplementationOnce(async () => {
        nummer = 18;
        throw new ApiError(400, 'Teksten er en annen.', {
          error: 'REGELBRUDD',
          rule: 'ANNEN_BREVTEKST',
        });
      })
      .mockResolvedValue({ sakId: 'ny-sak' });
    const hentMerking = async (): Promise<Saksmerking> => ({
      ...DEMOMERKING,
      sakskode: { kode: 'koe', loepenummer: nummer },
    });
    aapne(send, { hentMerking });
    await fyllIrregulaerEndring();
    await sendBrevet();
    await screen.findByText(NYSAK.nyttNummer);
    expect(send.mock.calls[0][0].tekst.join(' ')).toContain('KOE-17');
    const avkrysning = screen.getByRole('checkbox', {
      name: 'Jeg har kontrollert brevet',
    }) as HTMLInputElement;
    expect(avkrysning.checked, 'brevet med det nye nummeret er ikke kontrollert').toBe(false);
    expect(screen.getAllByText(/KOE-18/).length).toBeGreaterThan(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    expect(send).toHaveBeenCalledTimes(1);
    // Avsenderen kontrollerer brevet med det nye nummeret og sender det.
    await fireEvent.click(avkrysning);
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1][0].tekst.join(' ')).toContain('KOE-18');
  });

  it('LV-U46: er teksten annerledes av en annen grunn, står serverens melding og ikke meldingen om nummeret', async () => {
    const melding = 'Teksten avsenderen har sett, er ikke den serveren lager.';
    const send = vi
      .fn<SendNySak>()
      .mockRejectedValue(
        new ApiError(400, melding, { error: 'REGELBRUDD', rule: 'ANNEN_BREVTEKST' })
      );
    aapne(send);
    await fyllIrregulaerEndring();
    await sendBrevet();
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    await screen.findByText(melding, { exact: false });
    expect(screen.queryByText(NYSAK.nyttNummer)).toBeNull();
  });

  it('5a: «Avbryt» spør før det som er skrevet slettes, og sender ingenting', async () => {
    const { send, onavbrutt } = aapne();
    await fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(screen.getByText(/ingen sak opprettes/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Ja, slett det du har skrevet' }));
    expect(onavbrutt).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('saken i demoruta før opprettelsen (G-1, KT-U11)', () => {
  const forloep = finnForloep('BF-05')!;
  const paaberopelse = {
    type: 'krav' as const,
    spor: 'forhold' as const,
    innhold: {
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      paalegg_mottatt: '2026-09-15',
    },
  };

  const opprettelse = { type: 'opprett_sak', sakstittel: 'Teglforblending' };
  const sakId = lagDemosak(forloep, 'start', 'TE').sakId;
  // Brevteksten har sakstittelen som navnet på forholdet (LV-U43).
  const brev = kravMotNySak(
    opprettelse,
    { ...paaberopelse, utdypning: BESKRIVELSE },
    'TE',
    DEMOMERKING,
    KJERNE,
    new Map(),
    sakId
  );
  const tekst = 'tekst' in brev ? brev.tekst! : [];

  it('starter uten sak, og en avvist påberopelse etterlater ingen sak', async () => {
    const demosak = lagDemosak(forloep, 'start', 'TE');
    expect(demosak.journal()).toEqual([]);
    await expect(
      demosak.opprett({ sakId, opprettelse, paaberopelse, tekst })
    ).rejects.toMatchObject({
      data: { rule: 'BESKRIVELSE_MANGLER' },
    });
    expect(demosak.journal()).toEqual([]);
  });

  it('skriver saken og påberopelsen når kjernen godtar dem, til versjonen ved neste kontrollpunkt', async () => {
    const demosak = lagDemosak(forloep, 'start', 'TE');
    expect(tekst.length).toBeGreaterThan(0);
    await demosak.opprett({
      sakId,
      opprettelse,
      paaberopelse: { ...paaberopelse, utdypning: BESKRIVELSE },
      tekst,
    });
    const journal = demosak.journal();
    expect(journal[0].event_type).toBe('sak_opprettet');
    const neste = forloep.kontrollpunkter.find((k) => k.id === 'paaberopelsen-er-sendt')!;
    expect(journal.at(-1)!.versjon).toBe(neste.versjon);
  });

  it('#1526 punkt 3: demoruta avviser en kropp som serveren avviser, og etterlater ingen sak', async () => {
    const gyldig = { ...paaberopelse, utdypning: BESKRIVELSE };
    const avvist = [
      { sakId, opprettelse: { sakstittel: 'Teglforblending ' }, paaberopelse: gyldig, tekst },
      {
        sakId,
        opprettelse,
        paaberopelse: { ...gyldig, innhold: { ...gyldig.innhold, tittel: 'Teglforblending' } },
        tekst,
      },
    ];
    for (const kropp of avvist) {
      const demosak = lagDemosak(forloep, 'start', 'TE');
      await expect(demosak.opprett(kropp)).rejects.toMatchObject({
        status: 400,
        data: { error: 'UGYLDIG_FORESPOERSEL' },
      });
      expect(demosak.journal()).toEqual([]);
    }
  });

  it('#1037: demoruta binder vedleggene i minnet til påberopelsen', async () => {
    const demosak = lagDemosak(forloep, 'start', 'TE');
    const vedlegg = await demosak.vedleggForNySak.lastOpp(new File(['tegning'], 'tegning.pdf'));
    const medVedlegg = {
      ...paaberopelse,
      utdypning: BESKRIVELSE,
      dokumentasjon: [vedlegg.vedlegg_id],
    };
    const bundet = {
      vedlegg_id: vedlegg.vedlegg_id,
      filnavn: vedlegg.filnavn,
      innhold_sha256: vedlegg.innhold_sha256,
    };
    const brevet = kravMotNySak(
      opprettelse,
      medVedlegg,
      'TE',
      DEMOMERKING,
      KJERNE,
      new Map([[vedlegg.vedlegg_id, bundet]]),
      sakId
    );
    const brevtekst = 'tekst' in brevet ? brevet.tekst! : [];
    expect(brevtekst.join('\n')).toContain('tegning.pdf');
    await demosak.opprett({ sakId, opprettelse, paaberopelse: medVedlegg, tekst: brevtekst });
    expect(JSON.stringify(demosak.journal().at(-1)!.data)).toContain(vedlegg.vedlegg_id);
  });

  it('LV-U27, MM-U17 (opphevet av MM-U50): brevet viser tittelen som ble frosset, og et registrert brev uten tittel heter «Korrespondanse»', () => {
    const frosset = 'Påberopelse av irregulær endring i sak KOE-17';
    expect(brevtittel({ art: 'krav', brevtittel: frosset })).toBe(frosset);
    expect(brevtittel({ art: 'registrert', brevtittel: null })).toBe('Korrespondanse');
  });
});

describe('programfeil i brevkontrollen for ny sak (#898)', () => {
  it('en kjerne som kaster, gir PROGRAMFEIL og ikke en rå feil', async () => {
    const { brevet } = await import('$lib/components/varden/nysak');
    const { PROGRAMFEIL } = await import('$lib/kjernesak/kontekst.svelte');
    const kjerne = {
      ...KJERNE,
      get regler(): typeof KJERNE.regler {
        throw new Error('programfeil');
      },
    };
    const feil = vi.spyOn(console, 'error').mockImplementation(() => {});
    const utfylling = {
      forhold: { gruppe: 'ENDRING', kode: 'IRREG' },
      tittel: 'Teglforblending',
      beskrivelse: BESKRIVELSE,
      dato: '2026-09-15',
      endringsordre: '',
      vedlegg: [],
    };
    expect(brevet(utfylling, 'ny-sak', DEMOMERKING, kjerne)).toEqual({ programfeil: PROGRAMFEIL });
    expect(brevet(utfylling, 'ny-sak', DEMOMERKING, KJERNE)).toHaveProperty('tekst');
    feil.mockRestore();
  });
});

describe('den ventende opprettelsen (#1526 punkt 1)', () => {
  beforeEach(() => sessionStorage.clear());

  it('ID-ene og utkastet leses tilbake etter ny innlasting, per prosjekt, til de fjernes', () => {
    const ventende = { sakId: 'sak-1', kommandoId: 'kommando-1', utkast: null };
    lagreVentende('bruker-a', 'p1', ventende);
    expect(lesVentende('bruker-a', 'p1')).toEqual(ventende);
    expect(lesVentende('bruker-a', 'p2')).toBeNull();
    fjernVentende('bruker-a', 'p1');
    expect(lesVentende('bruker-a', 'p1')).toBeNull();
  });

  it('en annen bruker i samme fane får ikke utkastet, ID-ene eller vedleggene, også uten utlogging (#1678)', () => {
    const ventende = {
      sakId: 'sak-1',
      kommandoId: 'kommando-1',
      utkast: {
        forhold: { gruppe: 'ENDRING', kode: 'IRREG' },
        tittel: 'Annen fundamentering',
        beskrivelse: 'Teksten til bruker A.',
        dato: '2026-10-01',
        endringsordre: '',
        vedlegg: [{ vedlegg_id: 'v-1', filnavn: 'a.pdf', innhold_sha256: 'abc', stoerrelse: 3 }],
      },
    };
    lagreVentende('bruker-a', 'p1', ventende);
    fjernVentende('bruker-b', 'p1');
    expect(lesVentende('bruker-a', 'p1')).toEqual(ventende);
    expect(lesVentende('bruker-b', 'p1')).toBeNull();
    fjernVentende('bruker-a', 'p1');
  });

  it('når neste brukers sesjon er hentet, fjernes forrige brukers utkast fra fanen (#1678)', () => {
    const ventende = { sakId: 'sak-1', kommandoId: 'kommando-1', utkast: null };
    lagreVentende('bruker-a', 'p1', ventende);
    lagreVentende('bruker-a', 'p2', ventende);
    lagreVentende('bruker-b', 'p3', ventende);
    sessionStorage.setItem('annet', 'beholdes');
    fjernAndresVentende('bruker-b');
    expect(sessionStorage.getItem('nysak:ventende:bruker-a:p1')).toBeNull();
    expect(sessionStorage.getItem('nysak:ventende:bruker-a:p2')).toBeNull();
    expect(lesVentende('bruker-b', 'p3')).toEqual(ventende);
    expect(sessionStorage.getItem('annet')).toBe('beholdes');
  });

  it('uten en innlogget bruker lagres og leses ingenting (#1678)', () => {
    lagreVentende(undefined, 'p1', { sakId: 'sak-1', kommandoId: 'kommando-1', utkast: null });
    expect(sessionStorage.length).toBe(0);
    expect(lesVentende(undefined, 'p1')).toBeNull();
  });
});
