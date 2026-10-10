/**
 * Grensene i kjernen som bevis-sakene ikke når: formen på kommandoene, rader
 * leseren ikke skal godta, og en aksept av et standpunkt som er
 * uavklart. Hver avvisning har en kontrollsak som bare skiller seg i det ene.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Journalrad, Standpunktsvirkning } from '../typer.ts';
import { frysBrev } from '../skriving.ts';
import { KJERNE } from '../versjon.ts';
import { handlinger } from '../handlinger.ts';
import { formfeil } from '../kommando.ts';
import { lesJournal } from '../leser.ts';
import { kanInngaaIEo, kraveneErAvgjort, utled } from '../utled.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { ulikeVirkninger } from '../standpunkt.ts';
import { visning } from '../visning.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import { avvikFraFormatet } from './formatprove.ts';
import type { Kjoering } from './kjoerer.ts';

type Data = Record<string, unknown>;

const forstaatt = (rader: Journalrad[]) =>
  utled(lesJournal(rader, KJERNE.format), GJELDENDE_REGLER).forstaatt;

/** Raden med hendelsen eller elementet etiketten viser til. */
function radMed(rader: Journalrad[], k: Kjoering, navn: string): Journalrad {
  const id = k.navn.id(navn);
  const rad = rader.find(
    (r) => r.event_id === id || JSON.stringify(r.data).includes(`"id":"${id}"`)
  );
  if (!rad) throw new Error(`Forutsetning: ${navn} finnes ikke`);
  return rad;
}

/** Svaret med etiketten i raden. */
function svaret(rad: Journalrad, k: Kjoering, navn: string): Data {
  const s = ((rad.data.svar ?? []) as Data[]).find((x) => x.id === k.navn.id(navn));
  if (!s) throw new Error(`Forutsetning: ${navn} er ikke et svar i raden`);
  return s;
}

describe('formen på kravet', () => {
  const krav = (innhold: Data, ekstra: Data = {}) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'FASTPRIS_TILBUD', beloep: 1000, ...innhold },
    ...ekstra,
  });

  it('godtar et krav med feltene kravet har i formatet', () => {
    expect(formfeil(krav({}))).toEqual([]);
  });

  it.each(['id', 'erstatter', 'format', 'beslutningsgrunnlag'])(
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

  // Code-review av #273: en tom streng ville gitt en rad kjernen selv ikke forstår.
  it('avviser tom dokumentasjon i varselet', () => {
    const varsel = { type: 'varsel', spor: 'frist', hjemmel: '33.4', sendt: '2026-09-02' };
    expect(formfeil({ ...varsel, dokumentasjon: [''] })).not.toEqual([]);
    expect(formfeil({ ...varsel, dokumentasjon: [] })).not.toEqual([]);
    expect(formfeil({ ...varsel, dokumentasjon: ['vedlegg-1'] })).toEqual([]);
  });

  it('avviser et varsel etter § 33.4 i et krav utenfor fristen', () => {
    expect(formfeil(krav({}, { varsel: { sendt: '2026-09-02' } }))).not.toEqual([]);
    expect(
      formfeil({
        type: 'krav',
        spor: 'frist',
        innhold: { dager: 20 },
        varsel: { sendt: '2026-09-02' },
      })
    ).toEqual([]);
  });
});

/**
 * 7.1.2 og avsnitt 5 i designnotatet: hver rad kjernen skriver, har `format`,
 * ingen `null` og ingen tomme verdier i `data`, og en rad med et ukjent felt, en
 * ukjent art eller et felt arten krever som mangler, er ikke forstått (MM-U2,
 * 4.4). Kontrollsaken er journalen fra forløp A slik kjernen skrev den.
 */
describe('formatet (7.1.2, 4.4)', () => {
  async function forloepA() {
    const bane = minnebane();
    const k = await bygg(bane, ['forlop_a']);
    const rader = await bane.journal();
    if (!forstaatt(rader)) throw new Error('Forutsetning: kontrollsaken er ikke forstått');
    return { k, rader };
  }

  it('hvert dokument er én rad med format 1, uten null og uten tomme verdier, også brevet med tre svar', async () => {
    const { k, rader } = await forloepA();
    expect(rader.map((r) => r.versjon)).toEqual(rader.map((_r, i) => i + 1));
    expect(rader.flatMap(avvikFraFormatet)).toEqual([]);
    const brev = radMed(rader, k, 'D4');
    expect((brev.data.svar as Data[]).map((s) => s.spor)).toEqual([
      'grunnlag',
      'vederlag',
      'frist',
    ]);
    for (const s of brev.data.svar as Data[]) expect(s.beslutningsgrunnlag).toBeTypeOf('object');
  });

  it('en revisjon har sitt eget beslutningsgrunnlag og viser til svaret den erstatter (7.4)', async () => {
    const { k, rader } = await forloepA();
    const s = svaret(radMed(rader, k, 'S-v2'), k, 'S-v2');
    expect(s.erstatter).toBe(k.navn.id('S-v1'));
    expect((s.beslutningsgrunnlag as Data).linje).toMatch(/^Godkjent med 70.000 kr\.$/);
  });

  const svarIBrevet =
    (navn: string, endring: (s: Data) => void) => (r: Journalrad[], k: Kjoering) =>
      endring(svaret(radMed(r, k, navn), k, navn));
  const brev = (s: Data) => s.beslutningsgrunnlag as { virkninger: Data[] } & Data;
  const aksepten = (endring: (u: Data) => void) => (r: Journalrad[], k: Kjoering) =>
    endring((radMed(r, k, 'D6').data.utsagn as Data[])[0]);
  const kravet = (navn: string, endring: (u: Data) => void) => (r: Journalrad[], k: Kjoering) =>
    endring((radMed(r, k, navn).data.krav as Data[])[0]);

  it.each<[string, (r: Journalrad[], k: Kjoering) => void]>([
    // MM-U9, KA-U10: det kjernen leser, må være lagret (DM-06).
    ['et svar uten beslutningsgrunnlag', svarIBrevet('S-v2', (s) => delete s.beslutningsgrunnlag)],
    [
      'et beslutningsgrunnlag som mangler en virkning',
      svarIBrevet('S-g1', (s) => brev(s).virkninger.pop()),
    ],
    [
      'en virkning brevet ikke kan ha',
      svarIBrevet('S-f1', (s) => (brev(s).virkninger[0].virkning = 'uavklart')),
    ],
    [
      'et brev som ikke sier om det er sammenfall',
      svarIBrevet('S-f1', (s) => delete brev(s).sammenfall),
    ],
    [
      'en virkning til et standpunkt svaret ikke har',
      svarIBrevet(
        'S-g1',
        (s) => (brev(s).virkninger[0] = { standpunkt: 'ukjent', virkning: 'uten_virkning' })
      ),
    ],
    // GR-U12: om § 32.2 gjaldt, fryses i grunnlagssvaret og bare der.
    [
      'et grunnlagssvar som ikke sier om § 32.2 gjaldt',
      svarIBrevet('S-g1', (s) => delete brev(s).varslingsplikt),
    ],
    [
      'et vederlagssvar med varslingsplikten etter § 32.2',
      svarIBrevet('S-v2', (s) => (brev(s).varslingsplikt = true)),
    ],
    ['en aksept uten regelversjon', aksepten((a) => delete a.regelversjon)],
    ['en aksept med et ukjent felt', aksepten((a) => (a.enighetsgrunnlag = { utfall: 1 }))],
    // 4.4: ingen null, ingen tomme verdier, ingen ukjente felt eller arter.
    ['null i et felt', svarIBrevet('S-v2', (s) => (s.erstatter = null))],
    ['en tom streng', kravet('K-g1', (k) => (k.tittel = ''))],
    ['en tom liste', (r, k) => (radMed(r, k, 'D6').data.opplysninger = [])],
    ['et ukjent felt i et svar', svarIBrevet('S-v2', (s) => (s.begrunnelse = 'Vurdert'))],
    ['en ukjent art', svarIBrevet('S-v2', (s) => ((s.standpunkter as Data[])[0].art = 'metode'))],
    [
      'et standpunkt i feil rekkefølge',
      svarIBrevet('S-f1', (s) => (s.standpunkter as Data[]).reverse()),
    ],
    ['et svar uten utregning', svarIBrevet('S-v2', (s) => delete s.utregning)],
    // KA-U8: en kravversjon på 0 kr eller 0 dager finnes ikke.
    ['et krav på 0 kr', kravet('K-v1', (k) => (k.beloep = 0))],
    ['et krav på 0 dager', kravet('K-f1', (k) => (k.dager = 0))],
    // B-17: en rad uten format er ikke skrevet av TS-kjernen.
    ['en rad uten format', (r, k) => (radMed(r, k, 'D6').format = null)],
    ['en rad i et nyere format', (r, k) => (radMed(r, k, 'D6').format = 2)],
    ['en rad med referstoid', (r, k) => (radMed(r, k, 'D6').refererer_til_event_id = randomUUID())],
    [
      'en ukjent hendelsestype',
      (r, k) => (radMed(r, k, 'D6').event_type = 'te_aksepterer_respons'),
    ],
    ['et dokument uten krav, svar eller utsagn', (r, k) => delete radMed(r, k, 'D6').data.utsagn],
  ])('er ikke forstått: %s', async (_hva, endring) => {
    const { k, rader } = await forloepA();
    const endret = structuredClone(rader);
    endring(endret, k);
    expect(forstaatt(endret)).toBe(false);
  });
});

/**
 * Lesereglene i 4.2 i designnotatet: en referanse finnes i saken, har riktig art
 * og spor, og peker bakover. Ellers er saken ikke forstått (MM-U2), og leseren
 * gjetter ikke. Kontrollsaken er journalen slik kjernen skrev den.
 */
describe('lesereglene for referansene (4.2)', () => {
  const vederlagIgjen = { handling: 'krav', spor: 'vederlag', belop: 120000, navn: 'K-v2' };
  const varselOgBestridelse = [
    'godkjent_grunnlag',
    { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
    { handling: 'varsel', spor: 'frist', sendt: '2026-09-02', navn: 'D4' },
    { handling: 'bestridelse', part: 'BH', gjelder: 'D4#sendt', hva: 'mottatt', navn: 'D5' },
  ];
  const element = (r: Journalrad[], k: Kjoering, navn: string, felt: 'krav' | 'utsagn') =>
    (radMed(r, k, navn).data[felt] as Data[])[0];
  const id = (k: Kjoering, navn: string) => k.navn.id(navn);

  it.each<[string, (string | Data)[], (r: Journalrad[], k: Kjoering) => void]>([
    [
      'en ny kravversjon uten erstatter (KA-U2)',
      ['krav_eo', vederlagIgjen],
      (r, k) => delete element(r, k, 'K-v2', 'krav').erstatter,
    ],
    [
      'den første kravversjonen erstatter noe',
      ['forlop_a'],
      (r, k) => (element(r, k, 'K-v1', 'krav').erstatter = id(k, 'K-g1')),
    ],
    [
      'et svar på et krav i et annet spor',
      ['forlop_a'],
      (r, k) => (svaret(radMed(r, k, 'S-v1'), k, 'S-v1').gjelder = id(k, 'K-f1')),
    ],
    [
      'en revisjon som erstatter et svar på et annet krav',
      ['forlop_a'],
      (r, k) => (svaret(radMed(r, k, 'S-v2'), k, 'S-v2').erstatter = id(k, 'S-f1')),
    ],
    [
      'rettidigheten viser til noe annet enn kravet eller et varsel (MM-U1)',
      ['forlop_a'],
      (r, k) =>
        ((svaret(radMed(r, k, 'S-f1'), k, 'S-f1').standpunkter as Data[])[0].gjelder = id(
          k,
          'K-v1'
        )),
    ],
    [
      // Kjeden S-v2 → S-v1 er hel; bare retningen er feil (F-MM-E6, F-MM-E7).
      'en revisjon som peker framover i journalen',
      ['forlop_a'],
      (r, k) => {
        svaret(radMed(r, k, 'S-v1'), k, 'S-v1').erstatter = id(k, 'S-v2');
        delete svaret(radMed(r, k, 'S-v2'), k, 'S-v2').erstatter;
      },
    ],
    [
      'en aksept av et krav i stedet for et svar (KA-U1)',
      ['forlop_a'],
      (r, k) => (element(r, k, 'D6', 'utsagn').gjelder = id(k, 'K-v1')),
    ],
    [
      'et trekk av en eldre kravversjon',
      ['krav_eo', vederlagIgjen, { handling: 'trekk', spor: 'vederlag', navn: 'D5' }],
      (r, k) => (element(r, k, 'D5', 'utsagn').gjelder = id(k, 'K-v1')),
    ],
    [
      'en bestridelse av egen opplysning (MM-U7)',
      varselOgBestridelse,
      (r, k) => (radMed(r, k, 'D5').aktor_rolle = 'TE'),
    ],
    [
      'to standpunkter med samme ID',
      ['forlop_a'],
      (r, k) => {
        const [v, f] = ['S-v1', 'S-f1'].map((n) => svaret(radMed(r, k, n), k, n));
        const dager = (f.standpunkter as Data[]).at(-1)!;
        const beloep = (v.standpunkter as Data[])[0];
        const virkning = (f.beslutningsgrunnlag as { virkninger: Data[] }).virkninger.at(-1)!;
        dager.id = virkning.standpunkt = beloep.id;
      },
    ],
  ])('er ikke forstått: %s', async (_hva, steg, endring) => {
    const bane = minnebane();
    const k = await bygg(bane, steg as Parameters<typeof bygg>[1]);
    const rader = await bane.journal();
    if (!forstaatt(rader)) throw new Error('Forutsetning: kontrollsaken er ikke forstått');
    const endret = structuredClone(rader);
    endring(endret, k);
    expect(forstaatt(endret)).toBe(false);
  });

  it('en referanse til et svar i en annen sak gir en sak som ikke er forstått, uten innholdet fra den andre saken (7.1.4)', async () => {
    const a = await bygg(minnebane(), ['forlop_a']);
    const annet = id(a, 'S-v2');
    const baneB = minnebane();
    await bygg(baneB, ['krav_eo']);
    const journalB = await baneB.journal();
    const siste = journalB.at(-1)!;
    const aksept: Journalrad = {
      ...siste,
      event_id: randomUUID(),
      versjon: siste.versjon + 1,
      data: {
        utsagn: [
          {
            id: randomUUID(),
            art: 'aksept',
            gjelder: annet,
            regelversjon: GJELDENDE_REGLER.versjon,
          },
        ],
      },
    };
    if (!forstaatt(journalB)) throw new Error('Forutsetning: sak B er forstått uten raden');
    const u = utled(lesJournal([...journalB, aksept], KJERNE.format), GJELDENDE_REGLER);
    expect(u.forstaatt).toBe(false);
    const vist = JSON.stringify([visning(u, GJELDENDE_REGLER), u.spor, u.svar]);
    expect(vist).not.toContain(annet);
    expect(vist).not.toMatch(/Godkjent med 70/);
  });
});

/**
 * Samspillsreviewet av #273: en rad fra en annen skriver kan ikke gjøre om det
 * kommandoene sperrer. Hver avvisning har kontrollsaken uten raden.
 */
describe('rader fra en annen skriver som strider mot en enighet eller «ingen krav»', () => {
  const godkjentGrunnlag = [
    'krav_irreg',
    {
      handling: 'brev',
      navn: 'D4',
      svar: [{ spor: 'grunnlag', navn: 'S-g1', resultat: 'godkjent', varslet_i_tide: true }],
    },
  ];
  /** En rad fra TE med utsagnene, etter journalen. */
  const fraTE = (journal: Journalrad[], utsagn: Data[]): Journalrad => {
    const siste = journal.at(-1)!;
    return {
      ...siste,
      event_id: randomUUID(),
      versjon: siste.versjon + 1,
      aktor_rolle: 'TE',
      data: { utsagn },
    };
  };
  const aksept = (k: Kjoering, svar: string) => ({
    id: randomUUID(),
    art: 'aksept',
    gjelder: k.navn.id(svar),
    regelversjon: GJELDENDE_REGLER.versjon,
  });
  const ingenKrav = (spor: string) => ({ id: randomUUID(), art: 'ingen_krav', spor });

  it('en aksept av et svar med sammenfall er ikke forstått, så godkjenningen forblir en endringsordre (GR-U8, GR-U12)', async () => {
    const bane = minnebane();
    const k = await bygg(bane, godkjentGrunnlag);
    const journal = await bane.journal();
    const u = utled(lesJournal(journal, KJERNE.format), GJELDENDE_REGLER);
    if (!u.godkjenningErEndringsordre)
      throw new Error('Forutsetning: godkjenningen er en endringsordre');
    expect(forstaatt([...journal, fraTE(journal, [aksept(k, 'S-g1')])])).toBe(false);
  });

  it('to aksepter av samme svar er ikke forstått (KA-U7); kontrollsak: én aksept', async () => {
    const bane = minnebane();
    const k = await bygg(bane, ['forlop_a']);
    const journal = await bane.journal();
    const en = fraTE(journal, [aksept(k, 'S-g1')]);
    expect(forstaatt([...journal, en])).toBe(true);
    expect(forstaatt([...journal, en, fraTE([en], [aksept(k, 'S-g1')])])).toBe(false);
  });

  it('«ingen krav» i begge spor avgjør kravene, men gir ikke alene endringsordre (KA-U12, EO-U5)', async () => {
    const bane = minnebane();
    await bygg(bane, ['godkjent_grunnlag']);
    const journal = await bane.journal();
    const u = utled(
      lesJournal(
        [...journal, fraTE(journal, [ingenKrav('vederlag'), ingenKrav('frist')])],
        KJERNE.format
      ),
      GJELDENDE_REGLER
    );
    expect(u.forstaatt).toBe(true);
    expect(kraveneErAvgjort(u)).toBe(true);
    expect(kanInngaaIEo(u)).toBe(false);
  });

  it('«ingen krav» to ganger i samme spor er ikke forstått (4.2); kontrollsak: én gang', async () => {
    const bane = minnebane();
    await bygg(bane, ['godkjent_grunnlag']);
    const journal = await bane.journal();
    const en = fraTE(journal, [ingenKrav('vederlag')]);
    expect(forstaatt([...journal, en])).toBe(true);
    expect(forstaatt([...journal, en, fraTE([en], [ingenKrav('vederlag')])])).toBe(false);
  });

  it('en kravversjon etter «ingen krav» i samme spor er ikke forstått (KA-U12, 4.2)', async () => {
    const bane = minnebane();
    await bygg(bane, ['godkjent_grunnlag']);
    const journal = await bane.journal();
    const en = fraTE(journal, [ingenKrav('vederlag')]);
    const krav = (spor: string, innhold: Data): Journalrad => ({
      ...fraTE([en], []),
      data: { krav: [{ id: randomUUID(), spor, ...innhold }] },
    });
    expect(forstaatt([...journal, en, krav('frist', { dager: 20 })])).toBe(true);
    expect(
      forstaatt([...journal, en, krav('vederlag', { metode: 'FASTPRIS_TILBUD', beloep: 1000 })])
    ).toBe(false);
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
    const rad = radMed(endret, k, navn);
    if (rad.aktor_rolle === part)
      throw new Error(`Forutsetning: ${navn} er skrevet av den andre parten`);
    rad.aktor_rolle = part;
    expect(forstaatt(rader)).toBe(true);
    expect(forstaatt(endret)).toBe(false);
  });
});

/**
 * Registrert korrespondanse: brevet fryses med kategorien det svarte på, også
 * når saken ikke er forstått (code-review av #308, MM-U9). GR-U12: om § 32.2
 * gjaldt, fryses også når brevet ikke sier noe om varslingen.
 */
describe('registrert korrespondanse fryses med kategorien', () => {
  async function registrert(
    prefiks: string,
    standpunkter: Data[],
    ukjentFoer = false
  ): Promise<Data> {
    const bane = minnebane();
    const k = await bygg(bane, [prefiks]);
    const journal = await bane.journal();
    const siste = journal.at(-1)!;
    const foer = ukjentFoer
      ? [...journal, { ...siste, event_id: randomUUID(), event_type: 'frist_foresporsel_sendt' }]
      : journal;
    const svar: Data = {
      id: randomUUID(),
      spor: 'grunnlag',
      gjelder: k.navn.id('K-g1'),
      standpunkter,
    };
    const rad: Journalrad = {
      ...siste,
      event_id: randomUUID(),
      aktor_rolle: 'BH',
      data: { svar: [svar] },
    };
    frysBrev(rad, foer, KJERNE);
    return svar.beslutningsgrunnlag as Data;
  }
  const preklusjon = [
    { id: randomUUID(), art: 'rettidighet', gjelder: 'K', hjemmel: '32.2', i_tide: false },
    { id: randomUUID(), art: 'ansvar', resultat: 'godkjent' },
  ];
  const art = (b: Data) => (b.virkninger as Data[]).map((p) => p.virkning);

  it.each([
    ['med en ukjent rad før svaret', true],
    ['kontrollsak: uten den ukjente raden', false],
  ])('%s', async (_hva, ukjent) => {
    const b = await registrert('krav_irreg', preklusjon, ukjent);
    expect(art(b)).toEqual(['prinsipalt', 'subsidiaert']);
    expect(b.sammenfall).toBe(false);
    expect(b.varslingsplikt).toBe(true);
  });

  it('en godkjenning som ikke sier noe om varslingen, fryser at § 32.2 gjaldt (GR-U12)', async () => {
    const b = await registrert('krav_irreg', [preklusjon[1]]);
    expect(b.sammenfall).toBe(true);
    expect(b.varslingsplikt).toBe(true);
  });

  it('kontrollsak: i underkategorien EO gjaldt ikke § 32.2 (GR-U11)', async () => {
    const b = await registrert('krav_eo', [preklusjon[1]]);
    expect(b.sammenfall).toBe(true);
    expect(b.varslingsplikt).toBe(false);
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
    expect(s.svar.utregning.resultat).toBe('avslatt');
    expect(s.virkninger.map((p) => [p.art, p.virkning])).toEqual([
      ['rettidighet', 'uten_virkning'],
      ['hindring', 'prinsipalt'],
      ['dager', 'subsidiaert'],
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

describe('en vurdering kjernen ikke har et standpunkt for, avvises', () => {
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

  it('en lagret rad med en slik vurdering leses som ikke forstått', async () => {
    const bane = minnebane();
    const k = await bygg(bane, [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20 },
      {
        handling: 'brev',
        svar: [
          {
            spor: 'frist',
            navn: 'S-f1',
            varsel_i_tide: true,
            spesifisering_i_tide: true,
            hindring: true,
          },
        ],
      },
    ]);
    const rader = await bane.journal();
    const endret = structuredClone(rader);
    svaret(radMed(endret, k, 'S-f1'), k, 'S-f1').spesifisert_krav_ok = false;
    expect(forstaatt(rader)).toBe(true);
    expect(forstaatt(endret)).toBe(false);
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
    if (svar.virkninger.find((p) => p.art === 'rettidighet')?.virkning !== 'prinsipalt')
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
  const p = (
    standpunkt: string,
    virkning: Standpunktsvirkning['virkning']
  ): Standpunktsvirkning => ({
    standpunkt,
    art: 'rettidighet',
    virkning,
  });

  it('et standpunkt uten virkning som mangler på den ene siden, er ikke et avvik', () => {
    expect(
      ulikeVirkninger([p('a', 'uten_virkning'), p('b', 'prinsipalt')], [p('b', 'prinsipalt')])
    ).toBe(false);
  });

  it('kontrollsak: en annen virkning er et avvik', () => {
    expect(
      ulikeVirkninger(
        [p('a', 'prinsipalt'), p('b', 'subsidiaert')],
        [p('a', 'uten_virkning'), p('b', 'prinsipalt')]
      )
    ).toBe(true);
  });
});
