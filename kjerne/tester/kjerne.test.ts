/**
 * Grensene i kjernen som bevis-sakene ikke når: formen på kommandoene, rader
 * leseren ikke skal godta, og en aksept av et standpunkt som er
 * uavklart. Hver avvisning har en kontrollsak som bare skiller seg i det ene.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Beslutningsgrunnlag, Journalrad } from '../typer.ts';
import { frysSvar } from '../skriving.ts';
import { KJERNE } from '../versjon.ts';
import { handlinger } from '../handlinger.ts';
import { formfeil } from '../kommando.ts';
import { lesJournal } from '../leser.ts';
import { utled } from '../utled.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { ulikeVirkninger } from '../standpunkt.ts';
import type { Standpunkt } from '../typer.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';

describe('formen på kravet', () => {
  const krav = (innhold: Record<string, unknown>, ekstra: Record<string, unknown> = {}) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'FASTPRIS_TILBUD', belop_direkte: 1000, ...innhold },
    ...ekstra,
  });

  it('godtar et krav med feltene kravhendelsen har', () => {
    expect(formfeil(krav({}))).toEqual([]);
  });

  it.each(['hendelsesformat', 'dokument_id', 'beslutningsgrunnlag'])(
    'avviser %s i innholdet, som bare serveren setter',
    (felt) => {
      expect(formfeil(krav({ [felt]: 99 }))).toEqual([`$.innhold.${felt}: ukjent felt`]);
    }
  );

  // Code-review av #308: `in` følger prototypen, så `constructor` så ut som et kjent felt.
  it.each(['constructor', 'toString', 'hasOwnProperty'])(
    'avviser %s i innholdet, som ikke er et felt i skjemaet',
    (felt) => {
      expect(formfeil(krav({ [felt]: 'x' }))).toEqual([`$.innhold.${felt}: ukjent felt`]);
    }
  );

  it('avviser et varsel etter § 33.4 i et krav utenfor fristen', () => {
    expect(formfeil(krav({}, { varsel: { sendt: '2026-09-02' } }))).not.toEqual([]);
    expect(
      formfeil({
        type: 'krav',
        spor: 'frist',
        innhold: { varsel_type: 'spesifisert', antall_dager: 20 },
        varsel: { sendt: '2026-09-02' },
      })
    ).toEqual([]);
  });
});

describe('leseren', () => {
  const rad = (
    hendelsestype: string,
    data: Record<string, unknown>,
    ref: string | null = null
  ): Journalrad => ({
    event_id: randomUUID(),
    sak_id: 'S',
    event_type: hendelsestype,
    versjon: 2,
    tidsstempel: '2026-10-09T08:00:00Z',
    aktor_id: 'te',
    aktor_rolle: 'TE',
    aktor_team_id: null,
    refererer_til_event_id: ref,
    data,
  });
  const art = (h: Journalrad) => lesJournal([h], 1)[0].art;
  const fristkrav = { varsel_type: 'spesifisert', antall_dager: 20 };

  it.each([
    [
      'et varsel i kravet uten sendedato',
      rad('frist_krav_sendt', { ...fristkrav, frist_varsel: {} }),
    ],
    ['et registrert varsel uten sendedato', rad('frist_varsel_registrert', { hjemmel: '33.4' })],
  ])('forstår ikke %s', (_hva, h) => {
    expect(art(h)).toBe('ukjent');
  });

  it.each([
    [
      'et varsel i kravet med sendedato',
      rad('frist_krav_sendt', { ...fristkrav, frist_varsel: { dato_sendt: '2026-09-02' } }),
    ],
    [
      'et registrert varsel med sendedato',
      rad('frist_varsel_registrert', { hjemmel: '33.4', sendt: '2026-09-02' }),
    ],
  ])('kontrollsak: forstår %s', (_hva, h) => {
    expect(art(h)).toBe('dokument');
  });
});

type Data = Record<string, unknown>;

/**
 * Det kjernen leser, må være lagret (DM-06). Etter B-17 finnes det ikke et svar
 * uten beslutningsgrunnlag (merknaden til MM-U9), og innholdet i en enighet står
 * i brevet (KA-U10). Kontrollsaken er samme journal med radene slik kjernen
 * skrev dem.
 */
describe('et svar uten et fullstendig brev, eller en aksept uten regelversjon, er ikke forstått (MM-U9, KA-U10, MM-U2)', () => {
  type Brev = { standpunkter: Data[]; utfall?: Data } & Data;
  const brev = (d: Data) => d.beslutningsgrunnlag as Brev;
  it.each([
    ['et svar uten beslutningsgrunnlag', 'S-v2', (d: Data) => delete d.beslutningsgrunnlag],
    [
      'et svar der beslutningsgrunnlaget mangler et standpunkt',
      'S-g1',
      (d: Data) => brev(d).standpunkter.pop(),
    ],
    [
      'et svar der et standpunkt har en virkning brevet ikke kan ha',
      'S-f1',
      (d: Data) => (brev(d).standpunkter[0].virkning = 'uavklart'),
    ],
    [
      'et svar der brevet ikke sier om det er sammenfall',
      'S-f1',
      (d: Data) => delete brev(d).sammenfall,
    ],
    ['et svar der brevet mangler utfallet', 'S-v2', (d: Data) => delete brev(d).utfall],
    [
      'et svar der utfallet gjelder et annet spor',
      'S-v2',
      (d: Data) => (brev(d).utfall = { dager: 20 }),
    ],
    ['et svar på vederlaget uten vilkår', 'S-v2', (d: Data) => delete brev(d).vilkaar],
    [
      'et svar på grunnlaget med vilkår',
      'S-g1',
      (d: Data) => (brev(d).vilkaar = 'grunnlag_avklart'),
    ],
    ['en aksept uten regelversjon', 'D6', (d: Data) => delete d.regelversjon],
    [
      'et standpunkt uten art til et utsagn svaret ikke har',
      'S-g1',
      (d: Data) => (brev(d).standpunkter[0] = { utsagn: 'ukjent', virkning: 'uten_virkning' }),
    ],
  ])('%s', async (_hva, navn, endring) => {
    const bane = minnebane();
    const k = await bygg(bane, ['forlop_a']);
    const rader = await bane.journal();
    if (!utled(lesJournal(rader, 1), GJELDENDE_REGLER).forstaatt)
      throw new Error('Forutsetning: kontrollsaken er ikke forstått');
    const endret = structuredClone(rader);
    const rad = endret.find(
      (r) => r.event_id === k.navn.id(navn) || r.data.dokument_id === k.navn.id(navn)
    );
    if (!rad) throw new Error(`Forutsetning: ${navn} finnes ikke`);
    endring(rad.data);
    expect(utled(lesJournal(endret, 1), GJELDENDE_REGLER).forstaatt).toBe(false);
  });
});

/** Bare TE krever, varsler, godtar og trekker, og bare BH svarer (code-review av #308). */
describe('en rad fra feil part er ikke forstått', () => {
  it.each([
    ['en aksept fra BH', 'D6', 'BH'],
    ['et svar fra TE', 'S-v2', 'TE'],
    ['et krav fra BH', 'K-v1', 'BH'],
  ] as const)('%s', async (_hva, navn, part) => {
    const bane = minnebane();
    const k = await bygg(bane, ['forlop_a']);
    const rader = await bane.journal();
    const endret = structuredClone(rader);
    const rad = endret.find((r) => r.event_id === k.navn.id(navn));
    if (!rad || rad.aktor_rolle === part)
      throw new Error(`Forutsetning: ${navn} finnes og er skrevet av den andre parten`);
    rad.aktor_rolle = part;
    expect(utled(lesJournal(rader, 1), GJELDENDE_REGLER).forstaatt).toBe(true);
    expect(utled(lesJournal(endret, 1), GJELDENDE_REGLER).forstaatt).toBe(false);
  });
});

/**
 * Code-review av #308: brevet i registrert korrespondanse fryses med kategorien
 * det svarte på, også når saken ikke er forstått. Ellers ville en påberopt
 * preklusjon etter § 32.2 forsvunnet fra brevet for godt (MM-U9).
 */
describe('registrert korrespondanse fryses med kategorien i en sak som ikke er forstått', () => {
  it.each([
    ['med en ukjent rad før svaret', true],
    ['kontrollsak: uten den ukjente raden', false],
  ])('%s', async (_hva, ukjent) => {
    const bane = minnebane();
    const k = await bygg(bane, ['krav_irreg']);
    const journal = await bane.journal();
    const siste = journal.at(-1)!;
    const foer = ukjent
      ? [
          ...journal,
          { ...siste, event_id: randomUUID(), event_type: 'frist_foresporsel_sendt', data: {} },
        ]
      : journal;
    if (utled(lesJournal(foer, 1), GJELDENDE_REGLER).forstaatt === ukjent)
      throw new Error('Forutsetning: saken er forstått bare uten den ukjente raden');
    const rad: Journalrad = {
      ...siste,
      event_id: randomUUID(),
      event_type: 'respons_grunnlag',
      aktor_rolle: 'BH',
      refererer_til_event_id: k.navn.id('K-g1'),
      data: { resultat: 'godkjent', grunnlag_varslet_i_tide: false },
    };
    frysSvar(rad, foer, KJERNE);
    const brev = rad.data.beslutningsgrunnlag as Beslutningsgrunnlag;
    expect(brev.standpunkter.map((p) => [p.art, p.virkning])).toEqual([
      ['rettidighet', 'hovedgrunn'],
      ['ansvar', 'subsidiaer'],
    ]);
    expect(brev.sammenfall).toBe(false);
    expect(brev.utfall).toEqual({ grunnlag: 'avvist' });
  });
});

describe('fristsvaret uten fremdriftshindring (§ 33.1; B-13, vedtaket 05.10, #211)', () => {
  const svar = (hindring: boolean) => ({
    handling: 'brev',
    svar: [
      {
        spor: 'frist',
        navn: 'S-f1',
        varsel_i_tide: true,
        spesifisering_i_tide: true,
        hindring,
        dager: 20,
      },
    ],
  });

  it('avslår prinsipalt, med dagene som subsidiært standpunkt, og en aksept gir 0 dager', async () => {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20 },
      svar(false),
    ]);
    const s = (await k.utledning()).svar[k.navn.id('S-f1')];
    expect(s.svar.utregning.beregnings_resultat).toBe('avslatt');
    expect(s.standpunkter.map((p) => [p.art, p.virkning])).toEqual([
      ['rettidighet', 'uten_virkning'],
      ['hindring', 'hovedgrunn'],
      ['dager', 'subsidiaer'],
    ]);
    expect(s.svar.beslutningsgrunnlag?.linje).toBe(
      'Prinsipalt avslått uten fremdriftshindring (§ 33.1), subsidiært godkjent med 20 dager.'
    );
    expect((await k.send({ handling: 'aksept', spor: 'frist' }))?.godtatt).toBe(true);
    expect((await k.utledning()).spor.frist.enighet?.grunnlag.utfall.dager).toBe(0);
  });

  it('kontrollsak: med fremdriftshindring er de 20 dagene enighet ved sammenfall', async () => {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20 },
      svar(true),
    ]);
    const u = await k.utledning();
    expect(u.spor.frist.enighet?.grunnlag.kilde).toBe('sammenfall');
    expect(u.spor.frist.enighet?.grunnlag.utfall.dager).toBe(20);
  });
});

describe('en vurdering kjernen ikke har et utsagn for, avvises', () => {
  it.each([
    ['frist', { spor: 'frist', varsel_i_tide: true, spesifisering_i_tide: false, hindring: true }],
  ])('%s: reduksjon etter § 33.6.1', async (_spor, s) => {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20 },
    ]);
    const u = await k.prov({ handling: 'brev', svar: [s] });
    expect(u.godtatt ? 'godtatt' : u.avvisning.regel).toBe('VURDERING_UTENFOR_KJERNEN');
    // Kontrollsak: samme svar med spesifiseringen i tide.
    const ok = await k.prov({ handling: 'brev', svar: [{ ...s, spesifisering_i_tide: true }] });
    expect(ok.godtatt).toBe(true);
  });

  it('en lagret rad med en slik vurdering leses som ikke forstått', () => {
    const id = randomUUID();
    const rad = (spesifisert: boolean): Journalrad => ({
      event_id: id,
      sak_id: 'S',
      event_type: 'respons_frist',
      versjon: 2,
      tidsstempel: '2026-10-09T08:00:00Z',
      aktor_id: 'bh',
      aktor_rolle: 'BH',
      aktor_team_id: null,
      refererer_til_event_id: 'K',
      data: {
        spesifisert_krav_ok: spesifisert,
        vilkar_oppfylt: true,
        beregnings_resultat: 'godkjent',
        godkjent_dager: 20,
        beslutningsgrunnlag: {
          regelversjon: GJELDENDE_REGLER.versjon,
          linje: 'Godkjent med 20 dager.',
          standpunkter: [
            { utsagn: `${id}#hindring`, art: 'hindring', virkning: 'uten_virkning' },
            { utsagn: `${id}#dager`, art: 'dager', virkning: 'hovedgrunn' },
          ],
          sammenfall: true,
          utfall: { dager: 20 },
          vilkaar: 'grunnlag_avklart',
        },
      },
    });
    expect(lesJournal([rad(false)], 1)[0].art).toBe('ukjent');
    expect(lesJournal([rad(true)], 1)[0].art).toBe('dokument');
  });
});

describe('aksept av et grunnlag byggherren har avklart, avvises (GR-U8, GR-U9)', () => {
  const grunnlag = (resultat: string) => ({
    handling: 'brev',
    svar: [{ spor: 'grunnlag', resultat, varslet_i_tide: true }],
  });

  // To vedtak med hver sin begrunnelse og regelkode: partene er alt enige (GR-U8), og
  // frafall er ikke enighet (GR-U9).
  it.each([
    ['godkjent, som er enighet ved sammenfall (GR-U8, GR-U10)', 'godkjent', 'ENIGHET_I_SPORET'],
    ['frafalt (GR-U3, GR-U9)', 'frafalt', 'FRAFALL_KAN_IKKE_GODTAS'],
  ])('%s', async (_hva, resultat, regel) => {
    const k = await bygg(minnebane(), ['krav_irreg', grunnlag(resultat)]);
    const u = await k.prov({ handling: 'aksept', spor: 'grunnlag' });
    expect(u.godtatt ? 'godtatt' : u.avvisning.regel).toBe(regel);
    expect(handlinger(await k.utledning(), 'TE')).not.toContain('godta:grunnlag');
  });

  it('kontrollsak: et avslag på grunnlaget kan godtas', async () => {
    const k = await bygg(minnebane(), ['krav_irreg', grunnlag('avslatt')]);
    expect((await k.prov({ handling: 'aksept', spor: 'grunnlag' })).godtatt).toBe(true);
  });
});

/**
 * MM-U8 og rad KA-20: byggherren har påberopt at varselet utledet av kravet kom
 * for sent, og TE registrerer deretter varselet. Preklusjonen er uavklart, og et
 * uavklart standpunkt kan ikke fryses i et enighetsgrunnlag (MM-U3). Bevis-saken
 * F-MM-D prøver det samme gjennom kommandoene; her prøves også handlingene.
 */
describe('et uavklart standpunkt kan ikke godtas (MM-U8, KA-20)', () => {
  async function medPreklusjon(registrerVarsel: boolean) {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20 },
      {
        handling: 'brev',
        svar: [{ spor: 'frist', varsel_i_tide: false, spesifisering_i_tide: true, hindring: true }],
      },
      ...(registrerVarsel ? [{ handling: 'varsel', spor: 'frist', sendt: '2026-09-02' }] : []),
    ]);
    const u = await k.utledning();
    const svar = u.svar[u.spor.frist.gjeldendeSvar!.id];
    if (svar.standpunkter.find((p) => p.art === 'rettidighet')?.virkning !== 'hovedgrunn')
      throw new Error('Forutsetning: brevet påberoper preklusjon');
    return { k, u };
  }

  it('avviser aksepten når et varsel er registrert etter brevet, og tilbyr den ikke', async () => {
    const { k, u } = await medPreklusjon(true);
    const aksept = await k.prov({ handling: 'aksept', spor: 'frist' });
    expect(aksept.godtatt ? 'godtatt' : aksept.avvisning.regel).toBe('STANDPUNKT_UAVKLART');
    expect(handlinger(u, 'TE')).not.toContain('godta:frist');
    expect(handlinger(u, 'BH')).toContain('revidere:frist');
  });

  it('kontrollsak: uten registrert varsel gjelder preklusjonen varselet, og aksepten godtas', async () => {
    const { k, u } = await medPreklusjon(false);
    expect(handlinger(u, 'TE')).toContain('godta:frist');
    expect((await k.prov({ handling: 'aksept', spor: 'frist' })).godtatt).toBe(true);
  });
});

describe('visningen sammenlikner bare standpunkter med virkning (MM-U9)', () => {
  const p = (utsagn: string, virkning: Standpunkt['virkning']): Standpunkt => ({
    utsagn,
    art: 'rettidighet',
    virkning,
  });

  it('et standpunkt uten virkning som mangler på den ene siden, er ikke et avvik', () => {
    expect(
      ulikeVirkninger([p('a', 'uten_virkning'), p('b', 'hovedgrunn')], [p('b', 'hovedgrunn')])
    ).toBe(false);
  });

  it('kontrollsak: en annen virkning er et avvik', () => {
    expect(
      ulikeVirkninger(
        [p('a', 'hovedgrunn'), p('b', 'subsidiaer')],
        [p('a', 'uten_virkning'), p('b', 'hovedgrunn')]
      )
    ).toBe(true);
  });
});
