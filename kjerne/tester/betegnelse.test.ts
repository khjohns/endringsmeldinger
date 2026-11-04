/**
 * Betegnelsen per spor fra den faste lista i MM-U30 (#1043), regnet av en journal i minnet
 * som er skrevet med kjernens kommandoer. Kilden for forventningene er lista og
 * rekkefølgen i MM-U30: hvert spor har høyst én betegnelse, den første som foreligger, og
 * ingen når ingenting er sendt i sporet. Forløp A er brevet D4 i bevis-sakene: forholdet
 * avslått, vederlaget vurdert subsidiært.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { forhaandsvis, laastTekst, utledJournal, vurder } from '../kommandoer/skriving.ts';
import { regnUtSvar, type Svarvurdering } from '../frosset/standpunkt.ts';
import { enighetensVirkning } from '../utledning/utled.ts';
import { BETEGNELSER, betegnelse, visning } from '../utledning/visning.ts';
import { SPOR, type Journalrad, type Part, type Spor } from '../typer.ts';
import { KJERNE } from '../versjon.ts';
import { mellomlager } from './klient.ts';

class Sak {
  private klokke = Date.UTC(2026, 9, 1, 8, 0, 0);
  readonly journal: Journalrad[] = [
    {
      event_id: randomUUID(),
      sak_id: 'sak',
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: new Date(this.klokke).toISOString(),
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: 1,
      data: { sakstittel: 'Skiva', sakstype: 'standard' },
    },
  ];

  send(part: Part, kommando: Record<string, unknown>): void {
    const naa = new Date((this.klokke += 86_400_000));
    const kontekst = {
      sakId: 'sak',
      aktoerId: part.toLowerCase(),
      part,
      teamId: null,
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      tidspunkt: () => naa,
      nyId: randomUUID,
    };
    const vist = forhaandsvis(kommando, kontekst, this.journal, KJERNE, mellomlager(kommando));
    expect(vist.godtatt, JSON.stringify(vist)).toBe(true);
    const laast = vist.godtatt ? laastTekst(vist.hendelser[0]!) : null;
    const medTekst = laast ? { ...kommando, brevtekst: laast } : kommando;
    const utfall = vurder(medTekst, kontekst, this.journal, KJERNE, mellomlager(kommando));
    expect(utfall.godtatt, JSON.stringify(utfall)).toBe(true);
    if (utfall.godtatt) this.journal.push(...utfall.hendelser);
  }

  /** Byggherrens svar på gjeldende krav i sporet, regnet ut som klienten gjør (B-13). */
  svar(spor: Spor, vurderinger: Record<string, unknown>) {
    const u = utledJournal(this.journal, KJERNE);
    const krav = u.spor[spor].gjeldendeKrav!;
    const v = vurderinger as unknown as Svarvurdering;
    return {
      spor,
      gjelder: krav.id,
      regelversjon: KJERNE.regler.versjon,
      vurderinger: v,
      resultat: regnUtSvar(
        spor,
        v,
        { krav, paaberopelse: u.spor.forhold.gjeldendeKrav },
        KJERNE.regler
      ),
      utdypning: 'Byggherrens begrunnelse.',
    };
  }

  betegnelser() {
    const u = utledJournal(this.journal, KJERNE);
    return Object.fromEntries(SPOR.map((s) => [s, betegnelse(u, s)]));
  }
}

type Steg = (sak: Sak) => void;

const UTDYPNING = 'Kravet gjelder den endrede fundamenteringen.';
const paaberopelse: Steg = (sak) =>
  sak.send('TE', {
    type: 'krav',
    spor: 'forhold',
    innhold: {
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      paalegg_mottatt: '2026-10-01',
    },
    utdypning: UTDYPNING,
  });
const vederlagskrav: Steg = (sak) =>
  sak.send('TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', beloep: 100000 },
    utdypning: UTDYPNING,
  });
const fristkrav: Steg = (sak) =>
  sak.send('TE', { type: 'krav', spor: 'frist', innhold: { dager: 20 }, utdypning: UTDYPNING });
const krav: Steg = (sak) => [paaberopelse, vederlagskrav, fristkrav].forEach((s) => s(sak));
const varselIFristen: Steg = (sak) =>
  sak.send('TE', {
    type: 'varsel',
    korrespondansetype: 'brev',
    spor: 'frist',
    hjemmel: '33.4',
    sendt: '2026-10-01',
    dokumentasjon: [randomUUID()],
  });
const foresporsel: Steg = (sak) =>
  sak.send('BH', { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' });
const forloepA: Steg = (sak) => {
  krav(sak);
  sak.send('BH', {
    type: 'brev',
    svar: [
      sak.svar('forhold', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
      sak.svar('vederlag', {
        hovedkrav_vurdering: 'delvis',
        hovedkrav_godkjent_beloep: 60000,
        aksepterer_metode: true,
      }),
      sak.svar('frist', {
        frist_varsel_ok: true,
        spesifisert_krav_ok: true,
        vilkar_oppfylt: true,
        dager: 20,
      }),
    ],
  });
};
const frafall: Steg = (sak) =>
  sak.send('BH', {
    type: 'brev',
    svar: [sak.svar('forhold', { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true })],
  });
const aksept =
  (spor: Spor): Steg =>
  (sak) =>
    sak.send('TE', {
      type: 'aksept',
      spor,
      svar: utledJournal(sak.journal, KJERNE).spor[spor].gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
const trekk =
  (spor: Spor): Steg =>
  (sak) =>
    sak.send('TE', { type: 'trekk', spor });

function betegnelser(...steg: Steg[]) {
  const sak = new Sak();
  for (const s of steg) s(sak);
  return sak.betegnelser();
}

describe('betegnelsen per spor (MM-U30, #1043)', () => {
  it('lista har betegnelsene i rekkefølgen i MM-U30', () => {
    expect(BETEGNELSER).toEqual([
      'trukket',
      'spesifisert_krav_etterspurt',
      'venter_paa_svar',
      'paalegg_frafalt',
      'enige',
      'svar_ikke_godtatt',
      'krav_sendt',
      'ingen_krav',
      'varslet',
    ]);
  });

  it('ingen betegnelse når ingenting er sendt i sporet', () => {
    expect(betegnelser()).toEqual({ forhold: null, vederlag: null, frist: null });
    expect(betegnelser(paaberopelse)).toEqual({
      forhold: 'venter_paa_svar',
      vederlag: null,
      frist: null,
    });
  });

  it('et registrert varsel uten krav gir «Varslet», og «Ingen krav» står for seg', () => {
    expect(betegnelser(paaberopelse, varselIFristen).frist).toBe('varslet');
    expect(
      betegnelser(paaberopelse, (s) => s.send('TE', { type: 'ingen_krav', spor: 'vederlag' }))
        .vederlag
    ).toBe('ingen_krav');
  });

  it('en ubesvart forespørsel etter § 33.6.2 går foran varselet, og fristkravet som svarer, venter på svar', () => {
    expect(betegnelser(paaberopelse, varselIFristen, foresporsel).frist).toBe(
      'spesifisert_krav_etterspurt'
    );
    expect(betegnelser(paaberopelse, foresporsel, fristkrav).frist).toBe('venter_paa_svar');
  });

  it('et svar TE ikke har godtatt, gir «Svaret er ikke godtatt»; et svar som godkjenner kravet fullt ut, gir «Enige» ved sammenfall', () => {
    expect(betegnelser(forloepA)).toEqual({
      forhold: 'svar_ikke_godtatt',
      vederlag: 'svar_ikke_godtatt',
      frist: 'enige',
    });
  });

  it('en enighet gir «Enige», også en betinget enighet om et subsidiært beløp', () => {
    expect(betegnelser(forloepA, aksept('vederlag')).vederlag).toBe('enige');
  });

  it('når TE godtar avslaget på forholdet, er forholdet «Enige», et spor uten enighet «Krav sendt» og et spor med enighet fortsatt «Enige»', () => {
    expect(betegnelser(forloepA, aksept('forhold'))).toEqual({
      forhold: 'enige',
      vederlag: 'krav_sendt',
      frist: 'enige',
    });
  });

  it('en enighet i sporet går foran «Krav sendt» når avslaget på forholdet godtas etterpå', () => {
    expect(betegnelser(forloepA, aksept('vederlag'), aksept('forhold')).vederlag).toBe('enige');
  });

  it('frafall av pålegget gir betegnelsen bare i forholdet, og ubesvarte krav venter på svar', () => {
    expect(betegnelser(krav, frafall)).toEqual({
      forhold: 'paalegg_frafalt',
      vederlag: 'venter_paa_svar',
      frist: 'venter_paa_svar',
    });
  });

  it('«Trukket» går foran alt annet, og et trukket forhold trekker kravene det bærer', () => {
    expect(betegnelser(forloepA, aksept('vederlag'), trekk('vederlag')).vederlag).toBe('trukket');
    expect(betegnelser(krav, trekk('forhold'))).toEqual({
      forhold: 'trukket',
      vederlag: 'trukket',
      frist: 'trukket',
    });
  });

  it('et trukket forhold gir ingen betegnelse i et spor der ingenting er sendt (GR-U25)', () => {
    expect(betegnelser(paaberopelse, trekk('forhold'))).toEqual({
      forhold: 'trukket',
      vederlag: null,
      frist: null,
    });
  });

  it('et trukket forhold gir «Trukket» også i et spor med bare varsel eller «ingen krav» (GR-U25)', () => {
    expect(
      betegnelser(
        paaberopelse,
        varselIFristen,
        (s) => s.send('TE', { type: 'ingen_krav', spor: 'vederlag' }),
        trekk('forhold')
      )
    ).toEqual({ forhold: 'trukket', vederlag: 'trukket', frist: 'trukket' });
  });

  it('en ubesvart forespørsel etter § 33.6.2 gir ingen betegnelse etter at avslaget på forholdet er godtatt (MM-U31)', () => {
    const avslag: Steg = (sak) =>
      sak.send('BH', {
        type: 'brev',
        svar: [sak.svar('forhold', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true })],
      });
    expect(betegnelser(paaberopelse, varselIFristen, foresporsel, avslag).frist, 'kontroll').toBe(
      'spesifisert_krav_etterspurt'
    );
    expect(
      betegnelser(paaberopelse, varselIFristen, foresporsel, avslag, aksept('forhold')).frist
    ).toBe('varslet');
  });

  it('en ubesvart forespørsel etter § 33.6.2 gir ingen betegnelse etter at forholdet er trukket (MM-U31, GR-U25)', () => {
    expect(betegnelser(paaberopelse, foresporsel).frist, 'kontroll').toBe(
      'spesifisert_krav_etterspurt'
    );
    expect(betegnelser(paaberopelse, foresporsel, trekk('forhold')).frist).toBeNull();
  });

  it('en sak kjernen ikke forstår, har ingen betegnelse i noe spor (MM-U2), og visningen bærer den samme', () => {
    const sak = new Sak();
    krav(sak);
    sak.journal.push({
      ...sak.journal.at(-1)!,
      event_id: randomUUID(),
      event_type: 'ukjent_hendelse',
      versjon: sak.journal.at(-1)!.versjon + 1,
      data: {},
    });
    const u = utledJournal(sak.journal, KJERNE);
    expect(u.forstaatt, 'forutsetning').toBe(false);
    expect(sak.betegnelser()).toEqual({ forhold: null, vederlag: null, frist: null });
    const kontroll = new Sak();
    krav(kontroll);
    const v = visning(utledJournal(kontroll.journal, KJERNE), KJERNE.regler);
    expect(v.spor.vederlag.betegnelse, 'kontroll').toBe('venter_paa_svar');
  });
});

const alleGodkjent: Steg = (sak) => {
  krav(sak);
  sak.send('BH', {
    type: 'brev',
    svar: [
      sak.svar('forhold', { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      sak.svar('vederlag', {
        hovedkrav_vurdering: 'godkjent',
        hovedkrav_godkjent_beloep: 100000,
        aksepterer_metode: true,
      }),
      sak.svar('frist', {
        frist_varsel_ok: true,
        spesifisert_krav_ok: true,
        vilkar_oppfylt: true,
        dager: 20,
      }),
    ],
  });
};

function vistEtter(...steg: Steg[]) {
  const sak = new Sak();
  for (const s of steg) s(sak);
  const u = utledJournal(sak.journal, KJERNE);
  return { u, v: visning(u, KJERNE.regler) };
}

describe('sakens status og etikettene (MM-U22, MM-U23, #1136)', () => {
  it('saken har ingen samlet status mens kravene venter på svar eller svaret ikke er godtatt (MM-U22)', () => {
    expect(vistEtter(paaberopelse).v.status).toBeNull();
    expect(vistEtter(forloepA).v.status).toBeNull();
    // Kontroll: et trukket forhold er ett av de fire tilfellene i MM-U22.
    expect(vistEtter(paaberopelse, trekk('forhold')).v.status?.kode).toBe('avsluttet_trukket');
  });

  it('en virksom enighet og et avklart forhold gir verken «Oppgjort» eller «Avklart» (MM-U23)', () => {
    const { u, v } = vistEtter(alleGodkjent);
    expect(u.forholdAvklart, 'forutsetning').toBe(true);
    expect(enighetensVirkning(u, 'vederlag'), 'forutsetning').toBe('virksom');
    expect(v.spor.vederlag.betegnelse).toBe('enige');
    for (const s of SPOR) expect(v.spor[s].etiketter).not.toContain('oppgjort');
    expect(v.spor.forhold.etiketter).not.toContain('avklart');
    expect(v.spor.forhold.etiketter).toContain('enige');
  });

  it('et trukket forhold gir ikke etiketten «trukket» i et spor der ingenting er sendt (GR-U25, #1140)', () => {
    const { v } = vistEtter(paaberopelse, trekk('forhold'));
    expect(v.spor.forhold.etiketter).toContain('trukket');
    expect(v.spor.vederlag.etiketter).not.toContain('trukket');
    expect(v.spor.frist.etiketter).not.toContain('trukket');
    // Kontroll: med et varsel i fristsporet står etiketten der.
    expect(
      vistEtter(paaberopelse, varselIFristen, trekk('forhold')).v.spor.frist.etiketter
    ).toContain('trukket');
  });
});
