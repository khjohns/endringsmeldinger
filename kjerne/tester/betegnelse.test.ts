/**
 * Betegnelsen per spor fra den faste lista i MM-U30 (#1043), regnet av en journal i minnet
 * som er skrevet med kjernens kommandoer. Kilden for forventningene er lista og
 * rekkefølgen i MM-U30: hvert spor har høyst én betegnelse, den første som foreligger, og
 * ingen når ingenting er sendt i sporet. Forløp A er brevet D4 i bevis-sakene: grunnlaget
 * avslått, vederlaget vurdert subsidiært.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { forhaandsvis, laastTekst, utledJournal, vurder } from '../kommandoer/skriving.ts';
import { regnUtSvar, type Svarvurdering } from '../frosset/standpunkt.ts';
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
        { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
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
const grunnlagskrav: Steg = (sak) =>
  sak.send('TE', {
    type: 'krav',
    spor: 'grunnlag',
    innhold: {
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      tittel: 'Endret fundamentering',
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
const krav: Steg = (sak) => [grunnlagskrav, vederlagskrav, fristkrav].forEach((s) => s(sak));
const varselIFristen: Steg = (sak) =>
  sak.send('TE', {
    type: 'varsel',
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
      sak.svar('grunnlag', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
      sak.svar('vederlag', {
        hovedkrav_vurdering: 'delvis',
        hovedkrav_godkjent_belop: 60000,
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
    svar: [sak.svar('grunnlag', { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true })],
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
    expect(betegnelser()).toEqual({ grunnlag: null, vederlag: null, frist: null });
    expect(betegnelser(grunnlagskrav)).toEqual({
      grunnlag: 'venter_paa_svar',
      vederlag: null,
      frist: null,
    });
  });

  it('et registrert varsel uten krav gir «Varslet», og «Ingen krav» står for seg', () => {
    expect(betegnelser(grunnlagskrav, varselIFristen).frist).toBe('varslet');
    expect(
      betegnelser(grunnlagskrav, (s) => s.send('TE', { type: 'ingen_krav', spor: 'vederlag' }))
        .vederlag
    ).toBe('ingen_krav');
  });

  it('en ubesvart forespørsel etter § 33.6.2 går foran varselet, og fristkravet som svarer, venter på svar', () => {
    expect(betegnelser(grunnlagskrav, varselIFristen, foresporsel).frist).toBe(
      'spesifisert_krav_etterspurt'
    );
    expect(betegnelser(grunnlagskrav, foresporsel, fristkrav).frist).toBe('venter_paa_svar');
  });

  it('et svar TE ikke har godtatt, gir «Svaret er ikke godtatt»; et svar som godkjenner kravet fullt ut, gir «Enige» ved sammenfall', () => {
    expect(betegnelser(forloepA)).toEqual({
      grunnlag: 'svar_ikke_godtatt',
      vederlag: 'svar_ikke_godtatt',
      frist: 'enige',
    });
  });

  it('en enighet gir «Enige», også en betinget enighet om et subsidiært beløp', () => {
    expect(betegnelser(forloepA, aksept('vederlag')).vederlag).toBe('enige');
  });

  it('når TE godtar avslaget på grunnlaget, er grunnlaget «Enige», et spor uten enighet «Krav sendt» og et spor med enighet fortsatt «Enige»', () => {
    expect(betegnelser(forloepA, aksept('grunnlag'))).toEqual({
      grunnlag: 'enige',
      vederlag: 'krav_sendt',
      frist: 'enige',
    });
  });

  it('en enighet i sporet går foran «Krav sendt» når avslaget på grunnlaget godtas etterpå', () => {
    expect(betegnelser(forloepA, aksept('vederlag'), aksept('grunnlag')).vederlag).toBe('enige');
  });

  it('frafall av pålegget gir betegnelsen bare i grunnlaget, og ubesvarte krav venter på svar', () => {
    expect(betegnelser(krav, frafall)).toEqual({
      grunnlag: 'paalegg_frafalt',
      vederlag: 'venter_paa_svar',
      frist: 'venter_paa_svar',
    });
  });

  it('«Trukket» går foran alt annet, og et trukket grunnlag trekker kravene det bærer', () => {
    expect(betegnelser(forloepA, aksept('vederlag'), trekk('vederlag')).vederlag).toBe('trukket');
    expect(betegnelser(krav, trekk('grunnlag'))).toEqual({
      grunnlag: 'trukket',
      vederlag: 'trukket',
      frist: 'trukket',
    });
  });

  it('et trukket grunnlag gir ingen betegnelse i et spor der ingenting er sendt (GR-U25)', () => {
    expect(betegnelser(grunnlagskrav, trekk('grunnlag'))).toEqual({
      grunnlag: 'trukket',
      vederlag: null,
      frist: null,
    });
  });

  it('et trukket grunnlag gir «Trukket» også i et spor med bare varsel eller «ingen krav» (GR-U25)', () => {
    expect(
      betegnelser(
        grunnlagskrav,
        varselIFristen,
        (s) => s.send('TE', { type: 'ingen_krav', spor: 'vederlag' }),
        trekk('grunnlag')
      )
    ).toEqual({ grunnlag: 'trukket', vederlag: 'trukket', frist: 'trukket' });
  });

  it('en ubesvart forespørsel etter § 33.6.2 gir ingen betegnelse etter at avslaget på grunnlaget er godtatt (MM-U31)', () => {
    const avslag: Steg = (sak) =>
      sak.send('BH', {
        type: 'brev',
        svar: [sak.svar('grunnlag', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true })],
      });
    expect(betegnelser(grunnlagskrav, varselIFristen, foresporsel, avslag).frist, 'kontroll').toBe(
      'spesifisert_krav_etterspurt'
    );
    expect(
      betegnelser(grunnlagskrav, varselIFristen, foresporsel, avslag, aksept('grunnlag')).frist
    ).toBe('varslet');
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
    expect(sak.betegnelser()).toEqual({ grunnlag: null, vederlag: null, frist: null });
    const kontroll = new Sak();
    krav(kontroll);
    const v = visning(utledJournal(kontroll.journal, KJERNE), KJERNE.regler);
    expect(v.spor.vederlag.betegnelse, 'kontroll').toBe('venter_paa_svar');
  });
});
