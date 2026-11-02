/**
 * Skjemaet for ny sak i Varden (BF-05, #1481). Forventningene har kilde i bestillingen
 * (docs/domenetabell/brukerforlop/BF-05.md): feilene ved feltet før brevkontrollen (F-4, U-5,
 * D-2, GR-U15), ledetekstene som følger forholdet (F-5, VS-U26), og at saken først finnes når
 * påberopelsen er godtatt (KT-U11).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import NySak from '$lib/components/varden/NySak.svelte';
import { finnForloep, lagDemosak } from '$lib/kjernesak/demosak';
import type { SendNySak } from '$lib/components/varden/nysak';
import { kravMotNySak } from '$lib/kjernesak/brevtekst';
import { KJERNE } from '$kjerne/versjon';
import { brevtittel } from '$lib/components/varden/prototypetekst';

afterEach(cleanup);

const BESKRIVELSE = 'Byggherren påla teglforblending i stedet for platekledning.';

function aapne(send = vi.fn<SendNySak>(async () => ({ sakId: 'ny-sak' }))) {
  const onsendt = vi.fn();
  const onavbrutt = vi.fn();
  render(NySak, { sakId: 'ny-sak', send, onsendt, onavbrutt });
  return { send, onsendt, onavbrutt };
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
    expect(screen.getByText('Påberopelse av irregulær endring')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Tilbake til skjemaet' }));
    expect((screen.getByLabelText('Tittel på saken') as HTMLInputElement).value).toBe(
      'Teglforblending på fasaden'
    );
  });

  it('brevkontrollen viser brev 2, nummeret påberopelsen får etter `sak_opprettet` (VS-U37, #1489)', async () => {
    aapne();
    await fyllIrregulaerEndring();
    await seBrevet();
    await screen.findByRole('region', { name: 'Sending' });
    expect(screen.getByText('Brev 2')).toBeTruthy();
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
    type: 'krav',
    spor: 'forhold',
    innhold: {
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      paalegg_mottatt: '2026-09-15',
    },
  };

  const opprettelse = { type: 'opprett_sak', sakstittel: 'Teglforblending' };
  const sakId = lagDemosak(forloep, 'start', 'TE').sakId;
  const brev = kravMotNySak(
    opprettelse,
    { ...paaberopelse, utdypning: BESKRIVELSE },
    'TE',
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

  it('GR-U31: påberopelsen heter «Påberopelse av <forholdet>» også etter sendingen', () => {
    expect(brevtittel({ art: 'krav', spor: ['forhold'], forhold: 'irregulaer_endring' })).toBe(
      'Påberopelse av irregulær endring'
    );
    expect(brevtittel({ art: 'krav', spor: ['vederlag'], forhold: null })).toBe(
      'Krav om vederlagsjustering'
    );
  });
});
