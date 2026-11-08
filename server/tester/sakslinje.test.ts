/**
 * Linja og nøkkeltallene i sakslisten (#1022), regnet av en journal i minnet som er
 * skrevet med kjernens kommandoer (`forhaandsvis` og `vurder`). Hjelperne i
 * `kjerne/tester/` er utenfor grensen for serveren (`arkitektur.test.ts`). Lesingen
 * fra basen og prosjektgrensen prøves i `saksliste.test.ts`.
 *
 * Kildene for forventningene: svarene fra oppdragsgiver 20.10 i #1022
 * (https://github.com/khjohns/endringsmeldinger/issues/1022#issuecomment-6290027563),
 * ført som MM-U28 (krav, svar og enighet; summene) og MM-U29 (det som foreligger), og
 * MM-U22 for de fire saksbetegnelsene. MM-U37–MM-U40 har opphevet MM-U28 og MM-U29, og
 * testene gjelder den gamle oversikten til den fjernes i #1545. Eksempelet i svar 2
 * er forløp A i bevis-sakene: forholdet avslått, vederlaget vurdert subsidiært og godtatt.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  forhaandsvis,
  frysBrev,
  laastTekst,
  utledJournal,
  vurder,
} from '../../kjerne/kommandoer/skriving.ts';
import { regnUtSvar, type Svarvurdering } from '../../kjerne/frosset/standpunkt.ts';
import type { Journalrad, Part, Spor } from '../../kjerne/typer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { noekkeltall, sakslinje, type Sakslinje } from '../saksliste.ts';
import { PAABEROPELSE } from './testbase.ts';

type Steg = (sak: Sak) => void;

/** Saken i minnet, skrevet med kjernens kommandoer og den låste teksten (LV-U2). */
class Sak {
  readonly sakId = randomUUID();
  private klokke = Date.UTC(2026, 9, 1, 8, 0, 0);
  readonly journal: Journalrad[] = [
    {
      event_id: randomUUID(),
      sak_id: this.sakId,
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
    const naa = new Date((this.klokke += 60_000));
    const kontekst = {
      sakId: this.sakId,
      aktoerId: part.toLowerCase(),
      part,
      teamId: `team-${part.toLowerCase()}`,
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      tidspunkt: () => naa,
      nyId: randomUUID,
    };
    const vist = forhaandsvis(kommando, kontekst, this.journal, KJERNE);
    expect(vist.godtatt, JSON.stringify(vist)).toBe(true);
    const medTekst = vist.godtatt ? { ...kommando, brevtekst: laastTekst(vist.hendelser[0]!) } : {};
    const utfall = vurder(medTekst, kontekst, this.journal, KJERNE, new Map());
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

  /** Et brev sendt utenfor appen, registrert som korrespondanse av `part` (OV-U4). */
  registrer(data: Record<string, unknown>, part: Part = 'TE'): void {
    const rad: Journalrad = {
      ...this.journal[0]!,
      aktor_id: part.toLowerCase(),
      aktor_rolle: part,
      event_id: randomUUID(),
      event_type: 'dokument_registrert',
      versjon: this.journal.at(-1)!.versjon + 1,
      tidsstempel: new Date((this.klokke += 60_000)).toISOString(),
      format: 1,
      // Registrert korrespondanse har typen (LV-U42, D1 A i #1497).
      // En retting som sier at et brev ikke hører til saken, er ikke korrespondanse.
      data: 'ikke_i_saken' in data ? data : { korrespondansetype: 'brev', ...data },
    };
    frysBrev(rad, this.journal, KJERNE);
    this.journal.push(rad);
  }

  gjeldendeSvar(spor: Spor): string {
    return utledJournal(this.journal, KJERNE).spor[spor].gjeldendeSvar!.id;
  }

  linje(): Sakslinje {
    return sakslinje(
      {
        sakId: this.sakId,
        sakstype: 'standard',
        opprettet: this.journal[0]!.tidsstempel,
        sakskode: null,
        journal: this.journal,
      },
      KJERNE
    );
  }
}

const UTDYPNING = 'Kravet gjelder den endrede fundamenteringen.';
const krav: Steg = (sak) => {
  sak.send('TE', PAABEROPELSE);
  sak.send('TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 100000 }],
    },
    utdypning: UTDYPNING,
  });
  sak.send('TE', { type: 'krav', spor: 'frist', innhold: { dager: 20 }, utdypning: UTDYPNING });
};
const FRIST_I_ORDEN = {
  frist_varsel_ok: true,
  spesifisert_krav_ok: true,
  vilkar_oppfylt: true,
  dager: 20,
};
/** Brevet D4 i forløp A i bevis-sakene: forholdet avslått, vederlaget delvis godkjent. */
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
      sak.svar('frist', FRIST_I_ORDEN),
    ],
  });
};
const fullGodkjenning: Steg = (sak) => {
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
      sak.svar('frist', FRIST_I_ORDEN),
    ],
  });
};
const aksept =
  (spor: Spor): Steg =>
  (sak) =>
    sak.send('TE', {
      type: 'aksept',
      spor,
      svar: sak.gjeldendeSvar(spor),
      regelversjon: KJERNE.regler.versjon,
    });
const trekk =
  (spor: Spor): Steg =>
  (sak) =>
    sak.send('TE', { type: 'trekk', spor });

function linje(...steg: Steg[]): Sakslinje {
  const sak = new Sak();
  for (const s of steg) s(sak);
  return sak.linje();
}

describe('linja i sakslisten (#1022)', () => {
  it('krav uten svar venter på byggherrens svar i alle tre sporene (MM-U29)', () => {
    const l = linje(krav);
    expect(l).toMatchObject({
      forstaatt: true,
      saksbetegnelse: null,
      hovedkategori: 'endring',
      underkategori: 'irregulaer_endring',
      forhold: { svar: null, venter_paa_svar: true, svar_ikke_godtatt: false },
      vederlag: {
        krav: { beloep: 100000, oppgjoersformer: ['tilbud'] },
        svar: null,
        enighet: null,
        venter_paa_svar: true,
        svar_ikke_godtatt: false,
      },
      frist: { krav: { dager: 20 }, svar: null, enighet: null, venter_paa_svar: true },
    });
  });

  it('svar 2: et subsidiært beløp er merket, og svaret står uten enighet (MM-U28, MM-U29)', () => {
    const l = linje(forloepA);
    expect(l.forhold).toMatchObject({
      svar: { resultat: 'avslaatt' },
      venter_paa_svar: false,
      svar_ikke_godtatt: true,
    });
    expect(l.vederlag).toMatchObject({
      svar: { beloep: 60000, subsidiaert: true },
      enighet: null,
      venter_paa_svar: false,
      svar_ikke_godtatt: true,
    });
  });

  it('svar 2: enigheten om det subsidiære beløpet er betinget av ansvaret, og beløpet telles bare som betinget enighet (MM-U28, «Subsidiært» 22.10 i #1052)', () => {
    const l = linje(forloepA, aksept('vederlag'));
    expect(l.vederlag).toMatchObject({
      krav: { beloep: 100000 },
      svar: { beloep: 60000, subsidiaert: true },
      enighet: { beloep: 60000, virkning: 'betinget' },
      svar_ikke_godtatt: false,
    });
    expect(l.saksbetegnelse).toBeNull();
    expect(noekkeltall([l]).vederlag).toMatchObject({
      krav_sum: 100000,
      svar_subsidiaert_sum: 0,
      enighet_betinget_sum: 60000,
      enighet_virksom_sum: 0,
    });
  });

  it('et svar som godkjenner kravet fullt ut, gir enighet ved sammenfall og står ikke som ikke godtatt, i alle tre sporene', () => {
    const l = linje(fullGodkjenning);
    for (const spor of ['forhold', 'vederlag', 'frist'] as const) {
      expect(l[spor].svar, spor).not.toBeNull();
      expect(l[spor].svar_ikke_godtatt, spor).toBe(false);
      expect(l[spor].venter_paa_svar, spor).toBe(false);
    }
    expect(l.vederlag.enighet).toEqual({ beloep: 100000, virkning: 'virksom' });
    expect(l.frist.enighet).toEqual({ dager: 20, virkning: 'virksom' });
    expect(l.saksbetegnelse).toBe('kravene_avgjort');
    expect(noekkeltall([l]).vederlag).toMatchObject({
      enighet_virksom_sum: 100000,
      enighet_betinget_sum: 0,
      svar_subsidiaert_sum: 0,
    });
  });

  it.each([
    ['avslaget_paa_forholdet_godtatt', [forloepA, aksept('forhold')]],
    ['paaberopelsen_trukket', [krav, trekk('forhold')]],
  ])('saken har betegnelsen %s (MM-U22)', (betegnelse, steg) => {
    expect(linje(...steg).saksbetegnelse).toBe(betegnelse);
  });

  it('trukne krav og krav i en avsluttet sak står på linja, men telles ikke i nøkkeltallene (svar 2 fra oppdragsgiver 20.10 i #1029)', () => {
    const staar = linje(krav);
    const vederlagTrukket = linje(krav, trekk('vederlag'));
    const paaberopelsenTrukket = linje(krav, trekk('forhold'));
    const avslagGodtatt = linje(forloepA, aksept('forhold'));
    for (const l of [vederlagTrukket, paaberopelsenTrukket, avslagGodtatt])
      expect(l.vederlag.krav).toEqual({ beloep: 100000, oppgjoersformer: ['tilbud'] });
    expect(vederlagTrukket.vederlag.betegnelse).toBe('trukket');
    expect(staar.vederlag.kravet_staar).toBe(true);
    for (const l of [vederlagTrukket, paaberopelsenTrukket, avslagGodtatt])
      expect(l.vederlag.kravet_staar).toBe(false);
    expect(vederlagTrukket.frist.kravet_staar).toBe(true);
    expect(
      noekkeltall([staar, vederlagTrukket, paaberopelsenTrukket, avslagGodtatt])
    ).toMatchObject({
      vederlag: { krav_antall: 1, krav_sum: 100000 },
      frist: { krav_antall: 2 },
    });
  });

  it('#1050, #1067: når TE godtar avslaget av forholdet alene, venter vederlag og frist ikke på svar og telles ikke (SK-01)', () => {
    const avslag: Steg = (sak) =>
      sak.send('BH', {
        type: 'brev',
        svar: [sak.svar('forhold', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true })],
      });
    expect(linje(krav, avslag).vederlag.venter_paa_svar, 'kontroll: før aksepten').toBe(true);
    const l = linje(krav, avslag, aksept('forhold'));
    expect(l.saksbetegnelse).toBe('avslaget_paa_forholdet_godtatt');
    for (const spor of ['vederlag', 'frist'] as const) {
      expect(l[spor].venter_paa_svar, spor).toBe(false);
      // MM-U30: «Krav sendt» når TE har godtatt avslaget på forholdet uten enighet eller trekk.
      expect(l[spor].betegnelse, spor).toBe('krav_sendt');
    }
    expect(noekkeltall([l])).toMatchObject({
      vederlag: { venter_paa_svar: 0 },
      frist: { venter_paa_svar: 0 },
    });
  });

  it('#1218: med posten etter § 34.1.3 annet ledd er kravet og svaret summen av postene, og svaret er subsidiært når posten er det (OV-U23, OV-U31, OV-U33)', () => {
    const medPost: Steg = (sak) => {
      sak.send('TE', PAABEROPELSE);
      sak.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: {
          kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 100000 }],
          saerskilt: { produktivitet: { beloep: 40000 } },
        },
        utdypning: UTDYPNING,
      });
      sak.send('BH', {
        type: 'brev',
        svar: [
          sak.svar('forhold', { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
          sak.svar('vederlag', {
            hovedkrav_vurdering: 'godkjent',
            hovedkrav_godkjent_beloep: 100000,
            produktivitet_vurdering: 'delvis',
            produktivitet_godkjent_beloep: 30000,
            produktivitet_varslet_i_tide: false,
            produktivitet_begrenset_beloep: 10000,
            aksepterer_metode: true,
          }),
        ],
      });
    };
    const l = linje(medPost);
    expect(l.vederlag.krav).toEqual({ beloep: 140000, oppgjoersformer: ['tilbud'] });
    expect(l.vederlag.svar).toEqual({
      resultat: 'delvis_godkjent',
      beloep: 130000,
      subsidiaert: true,
    });
  });

  it('#1052: det subsidiære beløpet summeres bare når kravet står, som kravene (svar 3 fra oppdragsgiver 22.10)', () => {
    expect(noekkeltall([linje(forloepA)]).vederlag.svar_subsidiaert_sum, 'kontroll').toBe(60000);
    for (const l of [
      linje(forloepA, aksept('forhold')),
      linje(forloepA, trekk('vederlag')),
      linje(forloepA, trekk('forhold')),
    ]) {
      expect(l.vederlag.svar).toMatchObject({ beloep: 60000, subsidiaert: true });
      expect(noekkeltall([l]).vederlag).toMatchObject({ krav_sum: 0, svar_subsidiaert_sum: 0 });
    }
  });

  it('#1050: når TE godtar avslaget av forholdet i forløp A, står det subsidiære svaret i vederlaget ikke som ikke godtatt (SK-01)', () => {
    const l = linje(forloepA, aksept('forhold'));
    expect(l.vederlag).toMatchObject({
      svar: { beloep: 60000, subsidiaert: true },
      svar_ikke_godtatt: false,
    });
    expect(l.frist.svar_ikke_godtatt).toBe(false);
  });

  it('#1050: et frafall står ikke som svar ikke godtatt, mens ubesvarte krav i vederlag og frist venter på svar (GR-U9, arbeidsvalget 20.10)', () => {
    const frafall: Steg = (sak) =>
      sak.send('BH', {
        type: 'brev',
        svar: [sak.svar('forhold', { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true })],
      });
    const l = linje(krav, frafall);
    expect(l.forhold).toMatchObject({
      svar: { resultat: 'paalegg_frafalt' },
      venter_paa_svar: false,
      svar_ikke_godtatt: false,
    });
    expect(l.vederlag.venter_paa_svar).toBe(true);
    expect(l.frist.venter_paa_svar).toBe(true);
    const nyVersjon = linje(krav, frafall, (sak) =>
      sak.send('TE', {
        ...PAABEROPELSE,
        innhold: { ...PAABEROPELSE.innhold },
      })
    );
    expect(nyVersjon.forhold, 'GR-U23').toMatchObject({
      venter_paa_svar: true,
      svar_ikke_godtatt: false,
    });
  });

  it('en enighet uten virkning telles ikke, heller ikke uten beløp (svar 3 fra oppdragsgiver 20.10 i #1029)', () => {
    const l = linje(forloepA, aksept('vederlag'), trekk('forhold'));
    expect(l.vederlag.enighet).toEqual({ beloep: 60000, virkning: 'uten_virkning' });
    const utenBeloep: Sakslinje = {
      ...l,
      vederlag: { ...l.vederlag, enighet: { beloep: null, virkning: 'uten_virkning' } },
    };
    const betingetUtenBeloep: Sakslinje = {
      ...l,
      vederlag: { ...l.vederlag, enighet: { beloep: null, virkning: 'betinget' } },
    };
    expect(noekkeltall([l, utenBeloep]).vederlag).toMatchObject({
      enighet_uten_beloep: 0,
      enighet_virksom_sum: 0,
      enighet_betinget_sum: 0,
    });
    expect(noekkeltall([betingetUtenBeloep]).vederlag.enighet_uten_beloep).toBe(1);
  });

  it('en sak med et registrert brev har brev utenfor appen, som tillegget i OV-U10', () => {
    expect(linje(fullGodkjenning).brev_utenfor_appen).toBe(false);
    const l = linje((sak) =>
      sak.registrer({
        krav: [
          {
            id: randomUUID(),
            spor: 'forhold',
            hovedkategori: 'endring',
            underkategori: 'irregulaer_endring',
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      })
    );
    expect(l.forstaatt).toBe(true);
    expect(l.brev_utenfor_appen).toBe(true);
  });

  it('siste brev er brevet med den seneste datoen, med avsenderen og dagen det ble sendt herfra (#1450)', () => {
    const sak = new Sak();
    expect(sak.linje().siste_brev, 'en sak uten brev').toBeNull();
    forloepA(sak);
    expect(sak.linje().siste_brev).toEqual({ avsender: 'BH', dato: '2026-10-01' });
    aksept('vederlag')(sak);
    expect(sak.linje().siste_brev).toEqual({ avsender: 'TE', dato: '2026-10-01' });
  });

  const brevSomDokumentasjon = (sendt: string) => ({
    beskrivelse: 'Brev om fundamenteringen',
    opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: sendt }],
    dokumentasjon: [
      { vedlegg_id: randomUUID(), filnavn: 'brev.pdf', innhold_sha256: 'a'.repeat(64) },
    ],
  });

  it('et registrert brev har datoen parten oppga at det ble sendt, ikke registreringsdagen (oppdragsgiver 03.11 i #1450, OV-U80)', () => {
    const sak = new Sak();
    krav(sak);
    sak.registrer(brevSomDokumentasjon('2026-10-01'), 'BH');
    expect(sak.linje().siste_brev, 'kontrollsak: sendt samme dag som kravet').toEqual({
      avsender: 'BH',
      dato: '2026-10-01',
    });
    const eldre = new Sak();
    krav(eldre);
    eldre.registrer(brevSomDokumentasjon('2026-09-15'), 'BH');
    expect(eldre.linje().forstaatt, 'forutsetning').toBe(true);
    // Brevet ble registrert etter kravet, men sendt før det, så kravet er sakens siste brev.
    expect(eldre.linje().siste_brev).toEqual({ avsender: 'TE', dato: '2026-10-01' });
  });

  it('en registrering som en retting sier ikke hører til saken, og rettingen selv, er ikke sakens siste brev (OV-U17, OV-U18)', () => {
    const sak = new Sak();
    krav(sak);
    sak.registrer(brevSomDokumentasjon('2026-09-15'), 'BH');
    const forste = sak.journal.at(-1)!;
    sak.registrer({ ...brevSomDokumentasjon('2026-10-01'), retter: forste.event_id }, 'BH');
    const registrert = sak.journal.at(-1)!;
    expect(sak.linje().siste_brev, 'kontrollsak: registreringen er siste brev').toEqual({
      avsender: 'BH',
      dato: '2026-10-01',
    });
    sak.registrer({ retter: registrert.event_id, ikke_i_saken: true }, 'BH');
    expect(sak.linje().forstaatt, 'forutsetning').toBe(true);
    expect(sak.linje().siste_brev).toEqual({ avsender: 'TE', dato: '2026-10-01' });
  });

  it('en retting av en registrering er brevet med datoen rettingen oppgir, og registreringen den retter, er ikke med (OV-U17)', () => {
    const sak = new Sak();
    krav(sak);
    sak.registrer(brevSomDokumentasjon('2026-09-15'), 'BH');
    const registrert = sak.journal.at(-1)!;
    expect(sak.linje().siste_brev, 'kontrollsak: kravet er sakens siste brev').toEqual({
      avsender: 'TE',
      dato: '2026-10-01',
    });
    sak.registrer({ ...brevSomDokumentasjon('2026-10-15'), retter: registrert.event_id }, 'BH');
    expect(sak.linje().forstaatt, 'forutsetning').toBe(true);
    expect(sak.linje().siste_brev).toEqual({ avsender: 'BH', dato: '2026-10-15' });
  });

  it('en sak kjernen ikke forstår, har ikke noe siste brev, fordi det ukjente kan være et brev (MM-U2)', () => {
    const sak = new Sak();
    krav(sak);
    expect(sak.linje().siste_brev, 'kontrollsak').not.toBeNull();
    const siste = sak.journal.at(-1)!;
    sak.journal.push({
      ...siste,
      event_id: randomUUID(),
      versjon: siste.versjon + 1,
      event_type: 'ukjent_hendelse',
      data: {},
    });
    expect(sak.linje().siste_brev).toBeNull();
  });

  it('en sak kjernen ikke forstår, står i lista med betegnelsen og telles ikke i summene (MM-U2, MM-U22)', () => {
    const sak = new Sak();
    krav(sak);
    const journal = sak.journal;
    const siste = journal.at(-1)!;
    journal.push({
      ...siste,
      event_id: randomUUID(),
      versjon: siste.versjon + 1,
      event_type: 'ukjent_hendelse',
      data: {},
    });
    const l = sak.linje();
    expect(l).toMatchObject({
      forstaatt: false,
      saksbetegnelse: 'ikke_forstaatt',
      vederlag: { krav: null, svar: null, enighet: null, venter_paa_svar: false },
    });
    const n = noekkeltall([l, linje(krav)]);
    expect(n).toMatchObject({ saker: 2, ikke_forstaatt: 1 });
    expect(n.vederlag).toMatchObject({ krav_antall: 1, krav_sum: 100000, venter_paa_svar: 1 });
    expect(n.frist).toEqual({ krav_antall: 1, venter_paa_svar: 1 });
  });

  it('en sak kjernen ikke forstår, har brev utenfor appen når et brev er registrert (OV-U21, MM-U2)', () => {
    const sak = new Sak();
    krav(sak);
    sak.registrer({
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      utsagn: [{ id: randomUUID(), art: 'varsel', hjemmel: '33.4' }],
    });
    expect(sak.linje().brev_utenfor_appen, 'kontrollsak: varselet i en forstått sak').toBe(false);
    const siste = sak.journal.at(-1)!;
    sak.journal.push({
      ...siste,
      event_id: randomUUID(),
      versjon: siste.versjon + 1,
      event_type: 'ukjent_hendelse',
      data: {},
    });
    const l = sak.linje();
    expect(l.forstaatt, 'forutsetning').toBe(false);
    expect(l.brev_utenfor_appen).toBe(true);
  });

  it('har_varsel og ingen_krav følger utsagnene når betegnelsen er en annen: etter en forespørsel etter punkt 33.6.2 og når sporet er trukket (MM-U37, MM-U30, KA-U12)', () => {
    const varsel: Steg = (sak) => {
      sak.send('TE', PAABEROPELSE);
      sak.send('TE', { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' });
    };
    const varslet = linje(varsel);
    expect(varslet.frist).toMatchObject({ betegnelse: 'varslet', har_varsel: true, krav: null });
    expect(varslet.vederlag.har_varsel, 'kontrollsak: sporet uten varsel').toBe(false);

    const etterspurt = linje(varsel, (sak) =>
      sak.send('BH', { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' })
    );
    expect(etterspurt.frist).toMatchObject({
      betegnelse: 'spesifisert_krav_etterspurt',
      har_varsel: true,
      kravet_staar: false,
    });

    // Et varsel uten krav kan ikke trekkes alene (INGEN_KRAV), men med påberopelsen.
    const trukket = linje(varsel, trekk('forhold'));
    expect(trukket.saksbetegnelse).toBe('paaberopelsen_trukket');
    expect(trukket.frist).toMatchObject({ betegnelse: 'trukket', har_varsel: true });

    // KA-U12: «ingen krav» etter varselet står i eget flagg, også når en åpen forespørsel
    // etter punkt 33.6.2 gir betegnelsen (MM-U30).
    const ingenKrav = linje(varsel, (sak) => sak.send('TE', { type: 'ingen_krav', spor: 'frist' }));
    expect(ingenKrav.frist).toMatchObject({
      betegnelse: 'ingen_krav',
      har_varsel: true,
      ingen_krav: true,
    });
    const ingenKravEtterForespoersel = linje(
      varsel,
      (sak) => sak.send('BH', { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' }),
      (sak) => sak.send('TE', { type: 'ingen_krav', spor: 'frist' })
    );
    expect(ingenKravEtterForespoersel.frist).toMatchObject({
      betegnelse: 'spesifisert_krav_etterspurt',
      har_varsel: true,
      ingen_krav: true,
    });
    expect(etterspurt.frist.ingen_krav, 'kontrollsak: uten «ingen krav»').toBe(false);

    const utenVarsel = linje(krav);
    expect(utenVarsel.frist.har_varsel, 'kontrollsak: krav uten varsel').toBe(false);
  });
});
