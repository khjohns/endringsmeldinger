/**
 * Grensene i kjernen som bevis-sakene ikke når: formen på kommandoene, rader
 * leseren ikke skal godta, og en aksept av et standpunkt som er
 * uavklart. Hver avvisning har en kontrollsak som bare skiller seg i det ene.
 */

import { AssertionError } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Journalrad, Krav, Part, Standpunktsvirkning } from '../typer.ts';
import { frysBrev, Skrivefeil, vurder, type Kontekst } from '../kommandoer/skriving.ts';
import { KJERNE } from '../versjon.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { formfeil } from '../kommandoer/kommando.ts';
import { lesJournal } from '../format/leser.ts';
import { kanInngaaIEo, kraveneErAvgjort, utled } from '../utledning/utled.ts';
import { GJELDENDE_REGLER, type Regelsett } from '../regler/regelsett.ts';
import { regnUtSvar, ulikeVirkninger, virkninger } from '../frosset/standpunkt.ts';
import { senketInnroemmelse } from '../utledning/innroemmelse.ts';
import { harIkkeVurdertBrev, visning } from '../utledning/visning.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import { avvikFraFormatet } from './formatprove.ts';
import { mellomlager, type Handling } from './klient.ts';
import type { Kjoering } from './kjoerer.ts';

type Data = Record<string, unknown>;

const forstaatt = (rader: Journalrad[]) =>
  utled(lesJournal(rader, KJERNE.leserformat), GJELDENDE_REGLER).forstaatt;

const grunner = (rader: Journalrad[]) =>
  utled(lesJournal(rader, KJERNE.leserformat), GJELDENDE_REGLER).begrensninger.map((b) => b.grunn);

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
    innhold: { metode: 'tilbud', beloep: 1000, ...innhold },
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
  // OV-U4: det registrerte varselet har brevet som vedlegg, så uten vedlegg avvises formen.
  it('avviser et registrert varsel uten vedlegg, med tom ID eller med samme vedlegg to ganger', () => {
    const varsel = { type: 'varsel', spor: 'frist', hjemmel: '33.4', sendt: '2026-09-02' };
    expect(formfeil({ ...varsel, dokumentasjon: ['vedlegg-1'] }), 'kontrollsak').toEqual([]);
    expect(formfeil(varsel)).toEqual(['$.dokumentasjon: mangler']);
    expect(formfeil({ ...varsel, dokumentasjon: [''] })).not.toEqual([]);
    expect(formfeil({ ...varsel, dokumentasjon: [] })).not.toEqual([]);
    expect(formfeil({ ...varsel, dokumentasjon: ['A-1', 'a-1'] })).toEqual([
      '$.dokumentasjon: samme vedlegg står to ganger',
    ]);
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

  it('en ugyldig dato for varselet i fristkravet meldes på feltet i varselet', () => {
    const fristkrav = { type: 'krav', spor: 'frist', innhold: { dager: 20 } };
    expect(formfeil({ ...fristkrav, varsel: { sendt: '2026-13-40' } })).toEqual([
      '$.varsel.sendt: "2026-13-40" er ikke en dato på formen ÅÅÅÅ-MM-DD',
    ]);
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
    expect((s.beslutningsgrunnlag as Data).linje).toBe(
      'Byggherrens standpunkt: godkjent med 70\u00a0000\u00a0kr.'
    );
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
    [
      'en ukjent art',
      svarIBrevet('S-v2', (s) => ((s.standpunkter as Data[])[0].art = 'tilbakeholdelse')),
    ],
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
  // OV-U7: kommandoen for bestridelse avvises, så bestridelsen lages av BHs innsigelse D5.
  const varselOgInnsigelse = [
    'godkjent_grunnlag',
    { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
    { handling: 'varsel', spor: 'frist', sendt: '2026-09-02', navn: 'D4' },
    { handling: 'innsigelse', part: 'BH', gjelder: 'D4#varsel', navn: 'D5' },
  ];
  const element = (r: Journalrad[], k: Kjoering, navn: string, felt: 'krav' | 'utsagn') =>
    (radMed(r, k, navn).data[felt] as Data[])[0];
  const id = (k: Kjoering, navn: string) => k.navn.id(navn);
  const tilBestridelse = (r: Journalrad[], k: Kjoering) =>
    Object.assign(element(r, k, 'D5', 'utsagn'), {
      art: 'bestridelse',
      gjelder: id(k, 'D4#sendt'),
      hva: 'mottatt',
    });

  it('en bestridelse fra motparten som står i journalen, leses (MM-U7)', async () => {
    const bane = minnebane();
    const k = await bygg(bane, varselOgInnsigelse as Parameters<typeof bygg>[1]);
    const rader = structuredClone(await bane.journal());
    tilBestridelse(rader, k);
    const u = utled(lesJournal(rader, KJERNE.leserformat), GJELDENDE_REGLER);
    expect(u.forstaatt).toBe(true);
    const o = u.opplysninger.find((x) => x.opplysning.id === id(k, 'D4#sendt'));
    expect(o?.bestridelser.map((b) => [b.part, b.hva])).toEqual([['BH', 'mottatt']]);
  });

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
      varselOgInnsigelse,
      (r, k) => {
        tilBestridelse(r, k);
        radMed(r, k, 'D5').aktor_rolle = 'TE';
      },
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
    const u = utled(lesJournal([...journalB, aksept], KJERNE.leserformat), GJELDENDE_REGLER);
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
      event_type: 'dokument_registrert',
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
    const u = utled(lesJournal(journal, KJERNE.leserformat), GJELDENDE_REGLER);
    expect(u.endringsordre).toBe('ja');
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
        KJERNE.leserformat
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

  it('«ingen krav» før grunnlaget er sendt, er ikke forstått (KA-U15); kontrollsak: etter', async () => {
    const tom = await minnebane().journal();
    expect(forstaatt([...tom, fraTE(tom, [ingenKrav('vederlag')])])).toBe(false);
    const bane = minnebane();
    await bygg(bane, [{ handling: 'krav', spor: 'grunnlag', underkategori: 'endringsordre' }]);
    const sendt = await bane.journal();
    expect(forstaatt([...sendt, fraTE(sendt, [ingenKrav('vederlag')])])).toBe(true);
  });

  it('«ingen krav» etter et varsel etter § 33.4 er forstått (KA-U2, KA-U15)', async () => {
    const bane = minnebane();
    await bygg(bane, [
      { handling: 'krav', spor: 'grunnlag', underkategori: 'endringsordre' },
      { handling: 'varsel', spor: 'frist', sendt: '2026-09-02' },
    ]);
    const journal = await bane.journal();
    expect(forstaatt([...journal, fraTE(journal, [ingenKrav('frist')])])).toBe(true);
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
    expect(forstaatt([...journal, en, krav('vederlag', { metode: 'tilbud', beloep: 1000 })])).toBe(
      false
    );
  });
});

/** § 31.3 i registrert korrespondanse (GR-U13, MM-U12, code-review av #273). */
describe('opplysningen om § 31.3 i registrert korrespondanse', () => {
  const registrert = (opplysninger: Data) => ({
    handling: 'rad',
    spor: 'grunnlag',
    navn: 'S-g1',
    dokument: 'D4',
    gjelder: 'K-g1',
    resultat: 'godkjent',
    ...opplysninger,
  });

  it('en bestridelse av opplysningen avvises i første versjon, både av § 31.3 og av en dato (OV-U7)', async () => {
    const k = await bygg(minnebane(), [
      'krav_irreg',
      registrert({ sendt: '2026-09-30', endringsordre: true }),
    ]);
    for (const hva of ['endringsordre', 'sendt']) {
      const svar = await k.prov({
        handling: 'bestridelse',
        part: 'TE',
        gjelder: 'D4#endringsordre',
        hva,
      });
      expect(svar.godtatt ? 'godtatt' : svar.avvisning.regel).toBe('IKKE_I_FOERSTE_VERSJON');
    }
  });

  it('en senere avklaring av § 31.3 er ikke forstått, også når den sier at brevet var en endringsordre (OV-U13)', async () => {
    const bane = minnebane();
    await bygg(bane, [
      'krav_irreg',
      registrert({ sendt: '2026-09-30' }),
      { handling: 'rad', avklarer: 'D4', oppfylt: true, navn: 'D5' },
    ]);
    const journal = await bane.journal();
    expect(forstaatt(journal.slice(0, -1)), 'kontrollsak: saken før avklaringen').toBe(true);
    expect(forstaatt(journal)).toBe(false);
  });

  // #877 p12: et dokument med bare avklaringen avvises før OV-U13-kontrollen, fordi det
  // verken har krav, svar eller utsagn. Med et svar i samme dokument nås kontrollen.
  it('en senere avklaring av § 31.3 i et dokument med et svar gir grunnen etter OV-U13, ikke grunnen for et tomt dokument', async () => {
    const bane = minnebane();
    const k = await bygg(bane, ['krav_irreg', registrert({ sendt: '2026-09-30' })]);
    const brev = await k.prov({
      handling: 'brev',
      svar: [{ spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000 }],
    });
    if (!brev.godtatt) throw new Error(`Forutsetning: brevet ble avvist: ${brev.avvisning.regel}`);
    const rad = brev.hendelser[0];
    const medAvklaring = structuredClone(rad);
    medAvklaring.data.opplysninger = [
      ...((rad.data.opplysninger ?? []) as Data[]),
      { id: randomUUID(), hva: 'endringsordre', oppfylt: true, gjelder: k.navn.id('D4') },
    ];
    const journal = await bane.journal();
    expect(grunner([...journal, rad]), 'kontrollsak: dokumentet uten avklaringen').toEqual([]);
    const g = grunner([...journal, medAvklaring]);
    expect(g).toEqual([expect.stringContaining('en senere avklaring')]);
    expect(g[0]).toContain('(OV-U13)');
    expect(g[0]).not.toContain('verken krav, svar');
  });

  it.each<[string, Data]>([
    ['et avslag', { resultat: 'avslaatt' }],
    ['en påberopt preklusjon etter § 32.2', { varslet_i_tide: false }],
    ['opplysningen om at § 31.3 ikke er oppfylt', { endringsordre: false }],
  ])(
    'opplysningen om § 31.3 ved %s er ikke forstått, bare ved byggherrens endringsordre (OV-U13, OV-U6, #669)',
    async (_n, endring) => {
      const bane = minnebane();
      await bygg(bane, [
        'krav_irreg',
        registrert({ sendt: '2026-09-30', endringsordre: true, ...endring }),
      ]);
      expect(forstaatt(await bane.journal())).toBe(false);
    }
  );

  it('byggherrens endringsordre med opplysningen om § 31.3 er forstått (kontrollsak, OV-U6)', async () => {
    const bane = minnebane();
    await bygg(bane, ['krav_irreg', registrert({ sendt: '2026-09-30', endringsordre: true })]);
    expect(forstaatt(await bane.journal())).toBe(true);
  });

  it('OV-U19: en endringsordre registrert med virkning teller ikke som brev utenfor appen (OV-U6, HF-U13)', async () => {
    const bane = minnebane();
    await bygg(bane, ['krav_irreg', registrert({ sendt: '2026-09-30', endringsordre: true })]);
    const u = utled(lesJournal(await bane.journal(), KJERNE.leserformat), GJELDENDE_REGLER);
    expect(harIkkeVurdertBrev(u)).toBe(false);
    const kontroll = minnebane();
    await bygg(kontroll, ['krav_irreg', registrert({ sendt: '2026-09-30' })]);
    const k = utled(lesJournal(await kontroll.journal(), KJERNE.leserformat), GJELDENDE_REGLER);
    expect(harIkkeVurdertBrev(k), 'kontrollsak: et svar som er dokumentasjon (OV-U4)').toBe(true);
  });

  it('OV-U19, OV-U4: en registrert begrunnelse (KA-U35) er dokumentasjon og teller som brev utenfor appen', async () => {
    const eo = registrert({ sendt: '2026-09-30', endringsordre: true });
    const begrunnelse = {
      handling: 'rad',
      art: 'begrunnelse',
      gjelder: 'S-g1',
      part: 'BH',
      navn: 'D5',
      sendt: '2026-09-30',
    };
    const bane = minnebane();
    await bygg(bane, ['krav_irreg', eo, begrunnelse]);
    const u = utled(lesJournal(await bane.journal(), KJERNE.leserformat), GJELDENDE_REGLER);
    expect(u.forstaatt, 'forutsetning').toBe(true);
    expect(harIkkeVurdertBrev(u)).toBe(true);
    const kontroll = minnebane();
    await bygg(kontroll, ['krav_irreg', eo]);
    const k = utled(lesJournal(await kontroll.journal(), KJERNE.leserformat), GJELDENDE_REGLER);
    expect(harIkkeVurdertBrev(k), 'kontrollsak: bare endringsordren').toBe(false);
  });

  it('OV-U21, MM-U2: mens saken ikke er forstått, teller også en endringsordre registrert før saken stoppet', async () => {
    const bane = minnebane();
    await bygg(bane, ['krav_irreg', registrert({ sendt: '2026-09-30', endringsordre: true })]);
    const journal = await bane.journal();
    expect(
      harIkkeVurdertBrev(utled(lesJournal(journal, KJERNE.leserformat), GJELDENDE_REGLER)),
      'kontrollsak: saken er forstått'
    ).toBe(false);
    journal.push({
      ...structuredClone(journal.at(-1)!),
      event_id: randomUUID(),
      versjon: journal.at(-1)!.versjon + 1,
      format: null,
    });
    const u = utled(lesJournal(journal, KJERNE.leserformat), GJELDENDE_REGLER);
    expect(u.forstaatt, 'forutsetning').toBe(false);
    expect(harIkkeVurdertBrev(u)).toBe(true);
    expect(visning(u, GJELDENDE_REGLER).merknader).toContain('brev_utenfor_appen');
  });

  // OV-U12: et krav i et registrert brev er dokumentasjon uten virkning (OV-U4), så
  // referansekontrollen i utledningen finner ikke kravet endringsordren viser til.
  it('en endringsordre registrert som svar på et krav som bare er dokumentasjon, er ikke forstått (OV-U12)', async () => {
    const bane = minnebane();
    await bygg(bane, [
      'krav_irreg',
      {
        handling: 'rad',
        krav: true,
        part: 'TE',
        spor: 'grunnlag',
        underkategori: 'irregulaer_endring',
        navn: 'K-g2',
        sendt: '2026-09-29',
      },
      {
        ...registrert({ sendt: '2026-09-30', endringsordre: true }),
        dokument: 'D5',
        gjelder: 'K-g2',
      },
    ]);
    const journal = await bane.journal();
    expect(forstaatt(journal.slice(0, -1)), 'kontrollsak: det registrerte kravet').toBe(true);
    expect(forstaatt(journal)).toBe(false);
  });

  it('korrespondanse som bare er mottatt, er også registrert, og godkjenningen i den er dokumentasjon uten virkning (OV-U4)', async () => {
    const k = await bygg(minnebane(), ['krav_irreg', registrert({})]);
    expect((await k.utledning()).endringsordre).toBe('ja');
    const bane = minnebane();
    const r = await bygg(bane, ['krav_irreg']);
    const journal = await bane.journal();
    const u0 = await r.utledning();
    if (!u0.forstaatt) throw new Error('Forutsetning: saken er forstått');
    const rad = await r.send(registrert({ sendt: '2026-09-30' }));
    if (!rad?.godtatt) throw new Error('Forutsetning: raden er skrevet');
    const lagret = await bane.journal();
    const siste = structuredClone(lagret.at(-1)!);
    (siste.data.opplysninger as Data[])[0].hva = 'mottatt';
    const u = utled(lesJournal([...journal, siste], KJERNE.leserformat), GJELDENDE_REGLER);
    expect(u.forstaatt).toBe(true);
    // OV-U4: det registrerte svaret er ikke gjeldende svar og gir intet uavklart utfall.
    expect(u.spor.grunnlag.gjeldendeSvar).toBeNull();
    expect(u.spor.grunnlag.enighet).toBeNull();
    expect(u.endringsordre).toBe('nei');
  });
});

/** HF-U1: en opplysning om dokumentet og en om varselet i det står ved siden av hverandre. */
describe('datoene for et registrert krav og varselet i det', () => {
  /** Saken med et registrert fristkrav der varselet er oppgitt sendt `dato`. */
  const medVarsel = async (dato: string) => {
    const bane = minnebane();
    const k = await bygg(bane, ['godkjent_grunnlag']);
    const journal = await bane.journal();
    const siste = journal.at(-1)!;
    const varsel = randomUUID();
    const rad: Journalrad = {
      ...siste,
      event_id: randomUUID(),
      event_type: 'dokument_registrert',
      versjon: siste.versjon + 1,
      aktor_rolle: 'TE',
      data: {
        krav: [{ id: randomUUID(), spor: 'frist', dager: 20 }],
        utsagn: [{ id: varsel, art: 'varsel', hjemmel: '33.4' }],
        opplysninger: [
          { id: randomUUID(), hva: 'sendt', dato: '2026-09-10' },
          { id: randomUUID(), hva: 'sendt', dato, gjelder: varsel },
        ],
      },
    };
    await bane.skriv([rad], siste.versjon);
    expect(forstaatt(await bane.journal())).toBe(true);
    return async (sendt: string, melding = false) => {
      const u = await k.prov({ handling: 'krav', spor: 'frist', dager: 25, varsel_sendt: sendt });
      return u.godtatt ? null : melding ? u.avvisning.melding : u.avvisning.regel;
    };
  };

  it('leses hver for seg, og varselets dato er den SK-12 sammenlikner med (KA-19)', async () => {
    const ny = await medVarsel('2026-09-02');
    expect(await ny('2026-09-02')).toBeNull();
    expect(await ny('2026-09-10')).toBe('VARSEL_REGISTRERT');
  });

  it('en lagret varseldato med klokkeslett sammenliknes som dagen i norsk tid, så samme dag godtas (SK-12, #766)', async () => {
    const ny = await medVarsel('2026-09-02T09:00:00Z');
    expect(await ny('2026-09-02')).toBeNull();
    expect(await ny('2026-09-03'), 'kontrollsak').toBe('VARSEL_REGISTRERT');
  });

  it('en lagret varseldato uten tidssone kan ikke leses, og meldingen sier det, ikke at datoen er en annen (SK-12, #766)', async () => {
    const ny = await medVarsel('2026-09-02T09:00:00');
    expect(await ny('2026-09-02')).toBe('VARSEL_REGISTRERT');
    expect(await ny('2026-09-02', true)).toMatch(/kan ikke leses som en dato/);
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
    { id: randomUUID(), art: 'grunnlag', resultat: 'godkjent' },
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
    expect(s.svar.utregning.resultat).toBe('avslaatt');
    expect(s.virkninger.map((p) => [p.art, p.virkning])).toEqual([
      ['rettidighet', 'uten_virkning'],
      ['hindring', 'prinsipalt'],
      ['spesifisering', 'uten_virkning'],
      ['dager', 'subsidiaert'],
    ]);
    expect(s.svar.beslutningsgrunnlag?.linje).toBe(
      'Byggherrens standpunkt: prinsipalt avslått: fremdriften er ikke hindret som følge av forholdet (§ 33.1), subsidiært godkjent med 20 dager.'
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

/**
 * HF-U1, MM-U2: et standpunkt etter § 34.1.2, § 34.2.2 eller § 33.6.1 som ikke viser til
 * det det gjelder, eller som ikke henger sammen, gjør saken ikke forstått. Hvert
 * tilfelle har en kontrollsak: den uendrede raden er forstått. Kilden er arbeidsvalgene
 * i #479 og VS-U4.
 */
describe('byggherrens vurderinger etter § 34.1.2, § 34.2.2 og § 33.6.1 i en lagret rad', () => {
  const vederlagssak = async () => {
    const bane = minnebane();
    const k = await bygg(bane, [
      { handling: 'krav', spor: 'grunnlag', hovedkategori: 'svikt', underkategori: 'medvirkning' },
      { handling: 'krav', spor: 'vederlag', belop: 100000, navn: 'K-v1' },
      { handling: 'krav', spor: 'vederlag', belop: 120000, navn: 'K-v2' },
      {
        handling: 'brev',
        svar: [
          { spor: 'grunnlag', resultat: 'godkjent' },
          {
            spor: 'vederlag',
            navn: 'S-v1',
            vurdering: 'delvis',
            godkjent_belop: 60000,
            varslet_i_tide: false,
            metode_akseptert: false,
            oensket_metode: 'enhetspriser',
          },
        ],
      },
    ]);
    return { k, rader: await bane.journal() };
  };
  const fristsak = async () => {
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
            spesifisering_i_tide: false,
            maatte_forstaa: 5,
            dager: 15,
            hindring: true,
          },
        ],
      },
    ]);
    return { k, rader: await bane.journal() };
  };
  const metodesak = async () => {
    const bane = minnebane();
    const k = await bygg(bane, [
      { handling: 'krav', spor: 'grunnlag', underkategori: 'irregulaer_endring' },
      { handling: 'krav', spor: 'vederlag', belop: 100000 },
      {
        handling: 'brev',
        svar: [
          { spor: 'grunnlag', resultat: 'godkjent', varslet_i_tide: true },
          {
            spor: 'vederlag',
            navn: 'S-v1',
            vurdering: 'godkjent',
            metode_akseptert: false,
            oensket_metode: 'enhetspriser',
          },
        ],
      },
    ]);
    return { k, rader: await bane.journal() };
  };
  /** Et registrert brev kan ha en utregning som sier «godkjent» (MM-U17); sammenfallet leses av standpunktene. */
  const godkjentMedSammenfall = (s: Data) => {
    (s.utregning as Data).resultat = 'godkjent';
    (s.beslutningsgrunnlag as Data).sammenfall = true;
  };
  const standpunkt = (svar: Data, art: string) => {
    const p = (svar.standpunkter as Data[]).find((x) => x.art === art);
    expect(p, `forutsetning: svaret har standpunktet ${art}`).toBeDefined();
    return p!;
  };

  it('serverens utregning gir dagene byggherren måtte forstå at TE hadde krav på, prinsipalt og de vurderte subsidiært (VS-U4, B-13)', async () => {
    const { k } = await fristsak();
    const s = (await k.utledning()).svar[k.navn.id('S-f1')];
    expect(s.svar.utregning).toEqual({
      resultat: 'delvis_godkjent',
      godkjent_dager: 5,
      subsidiaert_resultat: 'delvis_godkjent',
      subsidiaert_godkjent_dager: 15,
    });
  });

  it.each([
    [
      'påberopelsen etter § 34.1.2 viser til kravversjonen svaret gjelder, ikke det første vederlagskravet',
      async () => {
        const { k, rader } = await vederlagssak();
        return {
          k,
          rader,
          endring: (s: Data) => (standpunkt(s, 'rettidighet').gjelder = k.navn.id('K-v2')),
        };
      },
      'S-v1',
    ],
    [
      'tilbudet er ikke akseptert, men metoden mangler',
      async () => {
        const { k, rader } = await vederlagssak();
        return { k, rader, endring: (s: Data) => delete standpunkt(s, 'metode').oensket_metode };
      },
      'S-v1',
    ],
    [
      'spesifiseringen viser til en annen kravversjon enn svaret',
      async () => {
        const { k, rader } = await fristsak();
        return {
          k,
          rader,
          endring: (s: Data) => (standpunkt(s, 'spesifisering').gjelder = k.navn.id('D-g')),
        };
      },
      'S-f1',
    ],
    [
      'sammenfall med et tilbud byggherren ikke aksepterer (§ 34.2.2)',
      async () => ({ ...(await metodesak()), endring: godkjentMedSammenfall }),
      'S-v1',
    ],
    [
      'sammenfall med en påberopelse etter § 33.6.1',
      async () => ({ ...(await fristsak()), endring: godkjentMedSammenfall }),
      'S-f1',
    ],
    [
      'spesifiseringen er i tide, men har prinsipale dager',
      async () => {
        const { k, rader } = await fristsak();
        return { k, rader, endring: (s: Data) => (standpunkt(s, 'spesifisering').i_tide = true) };
      },
      'S-f1',
    ],
  ] as [
    string,
    () => Promise<{ k: Kjoering; rader: Journalrad[]; endring: (s: Data) => void }>,
    string,
  ][])('er ikke forstått: %s', async (_n, lag, navn) => {
    const { k, rader, endring } = await lag();
    expect(forstaatt(rader), 'kontrollsak: den uendrede raden er forstått').toBe(true);
    const endret = structuredClone(rader);
    endring(svaret(radMed(endret, k, navn), k, navn));
    expect(forstaatt(endret)).toBe(false);
  });
});

// Kommandoen avvises med VURDERING_UTENFOR_KJERNEN: se `brevtekst.test.ts`, som har kommandoene.
describe('en vurdering kjernen ikke har et standpunkt for, avvises', () => {
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
    svaret(radMed(endret, k, 'S-f1'), k, 'S-f1').foresporsel_svar_ok = false;
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
    ['frafalt (GR-U3, GR-U9)', 'paalegg_frafalt', 'FRAFALL_KAN_IKKE_GODTAS'],
  ])('%s', async (_hva, resultat, regel) => {
    const k = await bygg(minnebane(), ['krav_irreg', grunnlag(resultat)]);
    const u = await k.prov({ handling: 'aksept', spor: 'grunnlag' });
    expect(u.godtatt ? 'godtatt' : u.avvisning.regel).toBe(regel);
    expect(handlinger(await k.utledning(), 'TE')).not.toContain('godta:grunnlag');
  });

  it('kontrollsak: et avslag på grunnlaget kan godtas', async () => {
    const k = await bygg(minnebane(), ['krav_irreg', grunnlag('avslaatt')]);
    expect((await k.prov({ handling: 'aksept', spor: 'grunnlag' })).godtatt).toBe(true);
  });
});

/**
 * GR-U18: frafall etter § 32.3 c er tillatt der pålegget er byggherrens eget, ikke der
 * endringen kommer av offentlig myndighet eller gebyr. Frafall kan ikke kombineres med at
 * grunnlaget er varslet for sent (#235).
 */
describe('frafall etter § 32.3 c der pålegget er byggherrens eget (GR-U18)', () => {
  async function frafall(underkategori: string, varsletITide: boolean) {
    const k = await bygg(minnebane(), [
      { handling: 'krav', spor: 'grunnlag', underkategori, navn: 'K-g1' },
    ]);
    return k.prov({
      handling: 'brev',
      svar: [{ spor: 'grunnlag', resultat: 'paalegg_frafalt', varslet_i_tide: varsletITide }],
    });
  }

  it.each(['samordning', 'svar_paa_varsel', 'irregulaer_endring', 'valg_av_loesning'])(
    'frafall godtas i %s',
    async (underkategori) => {
      expect((await frafall(underkategori, true)).godtatt).toBe(true);
    }
  );

  it.each(['gebyrer_og_avgifter', 'lovendring_gjenstand', 'lovendring_prosess'])(
    'frafall avvises i %s, som ikke er byggherrens eget pålegg',
    async (underkategori) => {
      const u = await frafall(underkategori, true);
      expect(u.godtatt ? 'godtatt' : u.avvisning.melding).toContain(
        'kan ikke velges i denne kategorien'
      );
    }
  );

  it.each(['samordning', 'svar_paa_varsel'])(
    'frafall i %s avvises sammen med at grunnlaget er varslet for sent (#235)',
    async (underkategori) => {
      const u = await frafall(underkategori, false);
      const melding = u.godtatt ? 'godtatt' : u.avvisning.melding;
      expect(melding).toContain(
        'frafall kan ikke kombineres med at grunnlaget er varslet for sent'
      );
      expect(melding).not.toContain('kan ikke velges i denne kategorien');
    }
  );
});

/**
 * OV-U5 og rad KA-20: byggherren har påberopt at varselet kom for sent da det første
 * fristkravet var det første varselet appen kjente, og TE registrerer deretter et
 * varsel. Svaret står med virkningen det hadde, TE kan godta det, og visningen sier at
 * det gjaldt et annet varsel (KK-08). Bevis-saken F-MM-D prøver det samme gjennom
 * kommandoene; her prøves også handlingene.
 */
describe('et svar står når TE registrerer et varsel etter det (OV-U5, KA-20)', () => {
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

  it('godtar aksepten med preklusjonen slik brevet uttrykte den, og visningen sier at svaret gjaldt et annet varsel', async () => {
    const { k, u } = await medPreklusjon(true);
    expect(handlinger(u, 'TE')).toContain('godta:frist');
    expect(handlinger(u, 'BH')).toContain('revidere:frist');
    expect(visning(u, GJELDENDE_REGLER).spor.frist.etiketter).toContain(
      'svaret_gjaldt_et_annet_varsel'
    );
    const aksept = await k.prov({ handling: 'aksept', spor: 'frist' });
    expect(aksept.godtatt).toBe(true);
  });

  it('kontrollsak: uten registrert varsel gjaldt svaret varselet appen kjenner, og visningen sier ingenting om et annet', async () => {
    const { k, u } = await medPreklusjon(false);
    expect(handlinger(u, 'TE')).toContain('godta:frist');
    expect(visning(u, GJELDENDE_REGLER).spor.frist.etiketter).not.toContain(
      'svaret_gjaldt_et_annet_varsel'
    );
    expect((await k.prov({ handling: 'aksept', spor: 'frist' })).godtatt).toBe(true);
  });
});

/**
 * KK-07, VS-U20, OV-U5 og HF-U1: påberopelsen etter § 33.4 gjelder varselet, ikke
 * kravversjonen svaret gjelder. Uten registrert varsel er det det første fristkravet.
 */
describe('påberopelsen etter § 33.4 gjelder varselet (VS-U20, OV-U5, KK-07)', () => {
  async function toKravversjoner(registrerVarsel: boolean) {
    const bane = minnebane();
    const k = await bygg(bane, [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
      {
        handling: 'brev',
        svar: [{ spor: 'frist', varsel_i_tide: false, spesifisering_i_tide: true, hindring: true }],
      },
      ...(registrerVarsel
        ? [{ handling: 'varsel', spor: 'frist', sendt: '2026-09-02', navn: 'D-varsel' }]
        : []),
      { handling: 'krav', spor: 'frist', dager: 25, navn: 'K-f2' },
      {
        handling: 'brev',
        navn: 'D-svar',
        svar: [
          {
            spor: 'frist',
            navn: 'S-f2',
            varsel_i_tide: false,
            spesifisering_i_tide: true,
            hindring: true,
          },
        ],
      },
    ]);
    const rader = await bane.journal();
    const u = await k.utledning();
    if (u.spor.frist.gjeldendeKrav?.id !== k.navn.id('K-f2'))
      throw new Error('Forutsetning: svaret gjelder den andre kravversjonen');
    const rettidighet = u.svar[k.navn.id('S-f2')].svar.standpunkter.find(
      (p) => p.art === 'rettidighet'
    );
    return { k, rader, rettidighet };
  }

  it('uten registrert varsel gjelder den det første fristkravet, ikke kravversjonen svaret gjelder', async () => {
    const { k, rettidighet } = await toKravversjoner(false);
    expect(rettidighet).toMatchObject({ hjemmel: '33.4', gjelder: k.navn.id('K-f1') });
  });

  it('brevet sier at varselet er det første fristkravet, i brevet det står i (AV-07)', async () => {
    const { k, rader } = await toKravversjoner(false);
    const brevtekst = radMed(rader, k, 'D-svar').data.brevtekst as {
      gjelder: string;
      laast: string;
    }[];
    const avsnitt = brevtekst.find((a) => a.gjelder === k.navn.id('S-f2'))!;
    const foerste = radMed(rader, k, 'K-f1').versjon;
    if (foerste === radMed(rader, k, 'K-f2').versjon)
      throw new Error('Forutsetning: kravversjonene står i hvert sitt brev');
    expect(avsnitt.laast).toContain(`§ 33.4 i brev ${foerste} av`);
  });

  it('kontrollsak: med registrert varsel gjelder den varselet', async () => {
    const { k, rettidighet } = await toKravversjoner(true);
    expect(rettidighet?.gjelder).toBe(k.navn.id('D-varsel#varsel'));
  });

  it('en påberopelse som viser til kravversjonen svaret gjelder, gjør saken ikke forstått', async () => {
    const { k, rader } = await toKravversjoner(false);
    if (!forstaatt(rader)) throw new Error('Forutsetning: kontrollsaken er forstått');
    const endret = structuredClone(rader);
    const s = svaret(radMed(endret, k, 'S-f2'), k, 'S-f2');
    const p = (s.standpunkter as Data[]).find((x) => x.art === 'rettidighet')!;
    p.gjelder = k.navn.id('K-f2');
    expect(forstaatt(endret)).toBe(false);
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

describe('§ 34.1.2 leses av regelsettet i standpunktet og i utregningen (#490)', () => {
  // Et regelsett der varslingsplikten i § 34.1.2 også gjelder en endring. Standpunktet og
  // utregningen skal da si det samme: preklusjon prinsipalt og beløpet subsidiært (VS-U3, B-13).
  const regler: Regelsett = { ...GJELDENDE_REGLER, gjelderVarslingspliktenForVederlag: () => true };
  const grunnlagskrav = {
    innhold: { hovedkategori: 'endring', underkategori: 'eo' },
  } as unknown as Krav;
  const krav = { innhold: { metode: 'tilbud', beloep: 100000 } } as unknown as Krav;
  const vurderinger = {
    hovedkrav_vurdering: 'godkjent',
    hovedkrav_godkjent_belop: 100000,
    aksepterer_metode: true,
    hovedkrav_varslet_i_tide: false,
  };

  it('et regelsett der § 34.1.2 gjelder en endring, gir preklusjon både i virkningen og i utregningen', () => {
    const utregning = regnUtSvar('vederlag', vurderinger, { krav, grunnlagskrav }, regler);
    expect(utregning).toEqual({
      resultat: 'avslaatt',
      godkjent_beloep: 0,
      subsidiaert_resultat: 'godkjent',
      subsidiaert_godkjent_beloep: 100000,
    });
    const svar = {
      spor: 'vederlag' as const,
      standpunkter: [
        {
          id: 'r',
          art: 'rettidighet' as const,
          gjelder: 'k',
          hjemmel: '34.1.2' as const,
          iTide: false,
        },
        { id: 'b', art: 'beloep' as const, resultat: 'godkjent' as const, godkjent: 100000 },
      ],
      utregning,
    };
    expect(virkninger(svar, grunnlagskrav, regler).map((v) => v.virkning)).toEqual([
      'prinsipalt',
      'subsidiaert',
    ]);
  });

  it('kontrollsak: med gjeldende regler gjelder § 34.1.2 ikke en endring, og vurderingen avvises', () => {
    expect(() =>
      regnUtSvar('vederlag', vurderinger, { krav, grunnlagskrav }, GJELDENDE_REGLER)
    ).toThrow(/gjelder bare svikt og andre forhold/);
  });
});

// HF-U5: et beløp som mangler i et lagret svar, er ikke null kroner, så en revisjon med et
// lavere beløp slipper ikke gjennom uten sammenlikning (#627 punkt 3).
describe('revisjonen av et svar uten beløp', () => {
  const svar = (godkjent: number | undefined) =>
    ({
      standpunkter: [{ id: 'b', art: 'beloep', resultat: 'godkjent', godkjent }],
      beslutningsgrunnlag: { virkninger: [] },
    }) as unknown as Parameters<typeof senketInnroemmelse>[0];
  const revisjon = (godkjent: number) =>
    [{ id: 'n', art: 'beloep', resultat: 'delvis_godkjent', godkjent }] as Parameters<
      typeof senketInnroemmelse
    >[1];

  it('sammenliknes ikke og avvises', () => {
    expect(senketInnroemmelse(svar(undefined), revisjon(0))).toEqual(
      expect.stringMatching(/Beløpet mangler/)
    );
  });

  it('kontrollsak: med beløpet sammenliknes revisjonen', () => {
    expect(senketInnroemmelse(svar(100), revisjon(100))).toBeNull();
    expect(senketInnroemmelse(svar(100), revisjon(50))).toMatch(/senker beløpet/);
  });
});

// HF-U5: dagene som mangler i et lagret svar, er ikke null dager, så en revisjon med færre
// dager slipper ikke gjennom uten sammenlikning (#814 punkt 3, som #627 for beløpet).
describe('revisjonen av et svar uten dager', () => {
  const svar = (vurdert: number | undefined) =>
    ({
      standpunkter: [{ id: 'd', art: 'dager', resultat: 'godkjent', vurdert }],
      beslutningsgrunnlag: { virkninger: [] },
    }) as unknown as Parameters<typeof senketInnroemmelse>[0];
  const revisjon = (vurdert: number | undefined) =>
    [{ id: 'n', art: 'dager', resultat: 'delvis_godkjent', vurdert }] as Parameters<
      typeof senketInnroemmelse
    >[1];

  it('dagene sammenliknes ikke, og revisjonen avvises', () => {
    expect(senketInnroemmelse(svar(undefined), revisjon(0))).toEqual(
      expect.stringMatching(/Dagene mangler/)
    );
  });

  // #870: begge sider kontrolleres, og dager som ikke er et tall, mangler, som beløpet (#627).
  it.each([
    ['dagene mangler i revisjonen', 10, undefined],
    ['dagene i svaret er NaN', NaN, 0],
    ['dagene i revisjonen er NaN', 10, NaN],
  ])('%s: revisjonen avvises', (_navn, foer, etter) => {
    expect(senketInnroemmelse(svar(foer), revisjon(etter))).toEqual(
      expect.stringMatching(/Dagene mangler/)
    );
  });

  it('kontrollsak: med dagene sammenliknes revisjonen', () => {
    expect(senketInnroemmelse(svar(10), revisjon(10))).toBeNull();
    expect(senketInnroemmelse(svar(10), revisjon(5))).toMatch(/senker dagene/);
  });
});

/**
 * #877 p30: kontrollen av kommandoen avviser et svar eller en revisjon som viser til noe
 * annet enn det som gjelder nå, eller som har et annet resultat enn serveren regner ut
 * (`kommandoer/nyttelast.ts`, `kommandoer/forutsetninger.ts`). Ingen vedtak eller rad
 * sier avvisningene (`koder_uten_rad` i `regler.json`), så testene fastholder dagens atferd.
 */
describe('kontrollen av referansene og resultatet i svaret', () => {
  const brevGrunnlag = (resultat: string, navn: string) => ({
    handling: 'brev',
    svar: [{ spor: 'grunnlag', resultat, varslet_i_tide: true, navn }],
  });

  /** Regelen kjernen avviser kommandoen med, eller «godtatt», gjennom `prov` i kjøreren. */
  async function skrivMed(k: Kjoering, h: Handling, endre: (kommando: Data) => void) {
    const u = await k.prov(h, endre);
    return u.godtatt ? 'godtatt' : u.avvisning.regel;
  }

  const uendret = () => {};

  it('FEIL_KRAVREFERANSE: et svar på grunnlaget som viser til vederlagskravet, avvises', async () => {
    const k = await bygg(minnebane(), ['krav_irreg']);
    const h = brevGrunnlag('godkjent', 'S-g1');
    expect(await skrivMed(k, h, uendret), 'kontrollsak').toBe('godtatt');
    const tilVederlaget = (kommando: Data) => {
      (kommando.svar as Data[])[0].gjelder = k.navn.id('K-v1');
    };
    expect(await skrivMed(k, h, tilVederlaget)).toBe('FEIL_KRAVREFERANSE');
  });

  it('ANNET_RESULTAT: et svar på vederlaget med et annet godkjent beløp enn serveren regner ut, avvises', async () => {
    const k = await bygg(minnebane(), ['krav_irreg']);
    const h = {
      handling: 'brev',
      svar: [{ spor: 'vederlag', vurdering: 'delvis', godkjent_belop: 60000 }],
    };
    expect(await skrivMed(k, h, uendret), 'kontrollsak').toBe('godtatt');
    const annetBeloep = (kommando: Data) => {
      const resultat = (kommando.svar as Data[])[0].resultat as Data;
      resultat.godkjent_beloep = 70000;
    };
    expect(await skrivMed(k, h, annetBeloep)).toBe('ANNET_RESULTAT');
  });

  it('FEIL_SVARREFERANSE: en revisjon av et svar som allerede er revidert, avvises', async () => {
    const k = await bygg(minnebane(), [
      'krav_irreg',
      brevGrunnlag('avslaatt', 'S-g1'),
      { handling: 'revisjon', spor: 'grunnlag', resultat: 'avslaatt', varslet_i_tide: true },
    ]);
    const h = {
      handling: 'revisjon',
      spor: 'grunnlag',
      resultat: 'godkjent',
      varslet_i_tide: true,
    };
    expect(await skrivMed(k, h, uendret), 'kontrollsak: revisjonen av gjeldende svar').toBe(
      'godtatt'
    );
    expect(await skrivMed(k, { ...h, erstatter: 'S-g1' }, uendret)).toBe('FEIL_SVARREFERANSE');
  });

  it('INGEN_SVAR: en revisjon før byggherren har svart på grunnlaget, avvises', async () => {
    const h = {
      handling: 'revisjon',
      spor: 'grunnlag',
      resultat: 'godkjent',
      varslet_i_tide: true,
    };
    const svart = await bygg(minnebane(), ['krav_irreg', brevGrunnlag('avslaatt', 'S-g1')]);
    expect(await skrivMed(svart, h, uendret), 'kontrollsak: etter svaret').toBe('godtatt');
    const usvart = await bygg(minnebane(), ['krav_irreg']);
    expect(await skrivMed(usvart, h, uendret)).toBe('INGEN_SVAR');
  });
});

describe('et brev sendt utenfor appen registreres som dokumentasjon (OV-U4, OV-U16)', () => {
  const brevet = '00000000-0000-4000-8000-000000001045';
  const registrering = (ekstra: Data = {}): Data => ({
    type: 'registrert_brev',
    spor: ['frist'],
    sendt: '2026-10-20',
    beskrivelse: 'Forespørsel etter § 33.6.2',
    dokumentasjon: [brevet],
    ...ekstra,
  });
  const kontekst = (part: Part, dag = '2026-10-21'): Kontekst => ({
    sakId: 'SAK-1045',
    aktoerId: part.toLowerCase(),
    part,
    teamId: null,
    tidspunkt: () => new Date(`${dag}T10:00:00Z`),
    nyId: randomUUID,
  });
  const prov = (journal: Journalrad[], kommando: Data, part: Part = 'TE', dag?: string) =>
    vurder(kommando, kontekst(part, dag), journal, KJERNE, mellomlager(kommando));
  const godtatt = (journal: Journalrad[], kommando: Data, part: Part = 'TE') => {
    const u = prov(journal, kommando, part);
    if (!u.godtatt)
      throw new Error(`Forutsetning: avvist: ${u.avvisning.regel}: ${u.avvisning.melding}`);
    return u.hendelser[0];
  };
  /** En rad uten format, som Python skrev (B-17): saken er ikke forstått (MM-U2). */
  const utenFormat = (journal: Journalrad[]): Journalrad => ({
    ...structuredClone(journal.at(-1)!),
    event_id: randomUUID(),
    versjon: journal.at(-1)!.versjon + 1,
    format: null,
  });

  it.each<[string, Data]>([
    ['uten vedlegg', { dokumentasjon: undefined }],
    ['med en beskrivelse uten tegn', { beskrivelse: '  ' }],
    ['med samme spor to ganger', { spor: ['frist', 'frist'] }],
    ['med brevtekst fra appen (MM-U17)', { brevtekst: ['Brevet'] }],
    ['med en dato som ikke er en dato', { sendt: '2026-10-32' }],
  ])('avviser formen %s', (_, ekstra) => {
    expect(formfeil(registrering({}))).toEqual([]);
    expect(formfeil(JSON.parse(JSON.stringify(registrering(ekstra))))).not.toEqual([]);
  });

  it('godtar et brev uten spor, som da hører til saken (OV-U16)', () => {
    expect(formfeil(JSON.parse(JSON.stringify(registrering({ spor: undefined }))))).toEqual([]);
  });

  it.each<Part>(['TE', 'BH'])(
    'brevet fra %s lagres med beskrivelsen, sporene, datoen og vedlegget, uten brevtekst, og endrer ingenting i utledningen (OV-U4)',
    async (part) => {
      const bane = minnebane();
      await bygg(bane, ['krav_irreg']);
      const journal = await bane.journal();
      const rad = godtatt(journal, registrering(), part);
      expect(rad.aktor_rolle).toBe(part);
      expect(rad.data).toEqual({
        beskrivelse: 'Forespørsel etter § 33.6.2',
        spor: ['frist'],
        opplysninger: [{ id: expect.any(String), hva: 'sendt', dato: '2026-10-20' }],
        dokumentasjon: [
          { vedlegg_id: brevet, filnavn: `${brevet}.pdf`, innhold_sha256: '0'.repeat(64) },
        ],
      });
      const [lest] = lesJournal([rad], KJERNE.leserformat);
      if (lest.art !== 'dokument') throw new Error(`Forutsetning: raden er ${lest.art}`);
      expect(lest.dokument.beskrivelse).toBe('Forespørsel etter § 33.6.2');
      expect(lest.dokument.spor).toEqual(['frist']);
      const foer = utled(lesJournal(journal, KJERNE.leserformat), GJELDENDE_REGLER);
      const etter = utled(lesJournal([...journal, rad], KJERNE.leserformat), GJELDENDE_REGLER);
      expect(etter.forstaatt).toBe(true);
      expect(etter.spor).toEqual(foer.spor);
      expect(handlinger(etter, 'TE')).toEqual(handlinger(foer, 'TE'));
      expect(handlinger(etter, 'BH')).toEqual(handlinger(foer, 'BH'));
    }
  );

  it.each<[string, (string | Handling)[], boolean]>([
    ['når grunnlaget er trukket', ['krav_irreg', { handling: 'trekk', spor: 'grunnlag' }], false],
    ['når saken ikke er forstått (MM-U2)', ['krav_irreg'], true],
  ])('registreringen godtas %s, og et krav avvises (OV-U4)', async (_, steg, uforstaatt) => {
    const bane = minnebane();
    await bygg(bane, steg);
    let journal = await bane.journal();
    if (uforstaatt) journal = [...journal, utenFormat(journal)];
    expect(forstaatt(journal)).toBe(!uforstaatt);
    const krav = { type: 'ingen_krav', spor: 'vederlag' };
    const avvist = prov(journal, krav);
    expect(avvist.godtatt, 'kontrollsak: ingen krav avvises').toBe(false);
    const registrert = prov(journal, registrering());
    expect(registrert.godtatt ? null : registrert.avvisning.regel).toBeNull();
    if (!registrert.godtatt) return;
    const rad = registrert.hendelser[0];
    expect(
      handlinger(utled(lesJournal(journal, KJERNE.leserformat), GJELDENDE_REGLER), 'TE')
    ).toContain('registrere_brev');
    expect(grunner([...journal, rad]).length).toBe(grunner(journal).length);
  });

  it('avviser en dato etter dagen brevet registreres, og godtar samme dag', async () => {
    const bane = minnebane();
    await bygg(bane, ['krav_irreg']);
    const journal = await bane.journal();
    const etter = prov(journal, registrering({ sendt: '2026-10-22' }), 'TE', '2026-10-21');
    expect(etter.godtatt ? null : etter.avvisning.regel).toBe('DATO_ETTER_BREVET');
    expect(prov(journal, registrering({ sendt: '2026-10-21' }), 'TE', '2026-10-21').godtatt).toBe(
      true
    );
  });

  it.each<[string, (data: Data) => void, string]>([
    [
      'med et utsagn',
      (d) => (d.utsagn = [{ id: randomUUID(), art: 'varsel', hjemmel: '34.1.2' }]),
      'har krav, svar eller utsagn',
    ],
    ['uten datoen det ble sendt', (d) => delete d.opplysninger, 'ikke bare datoen'],
    [
      'med en dato for et varsel i stedet',
      (d) => ((d.opplysninger as Data[])[0].gjelder = randomUUID()),
      'ikke bare datoen',
    ],
    ['uten vedlegg', (d) => delete d.dokumentasjon, 'ligger ikke ved'],
    ['med samme spor to ganger', (d) => (d.spor = ['frist', 'frist']), 'samme spor'],
    [
      'med spor uten beskrivelse, i et registrert varsel',
      (d) => {
        delete d.beskrivelse;
        d.utsagn = [{ id: randomUUID(), art: 'varsel', hjemmel: '34.1.2' }];
      },
      'spor uten beskrivelse',
    ],
    [
      'med brevtekst (MM-U17)',
      (d) => (d.brevtekst = [{ gjelder: randomUUID(), laast: 'x' }]),
      'har brevtekst fra appen',
    ],
  ])('leseren forstår ikke et brev registrert som dokumentasjon %s', async (_, endre, grunn) => {
    const bane = minnebane();
    await bygg(bane, ['krav_irreg']);
    const journal = await bane.journal();
    const rad = godtatt(journal, registrering());
    expect(grunner([...journal, rad]), 'kontrollsak: raden slik kjernen skrev den').toEqual([]);
    const endret = structuredClone(rad);
    endre(endret.data);
    expect(grunner([...journal, endret])).toEqual([expect.stringContaining(grunn)]);
  });
});

/**
 * En registrering av et brev som dokumentasjon rettes av samme side (OV-U17), også når
 * brevet står i feil sak (OV-U18). Visningen viser brevene ved kravet (OV-U20)
 * og merknaden for saken (OV-U19).
 */
describe('rettingen og visningen av et registrert brev (OV-U17, OV-U18, #1045)', () => {
  const brevet = '00000000-0000-4000-8000-000000001045';
  const registrering = (ekstra: Data = {}): Data =>
    JSON.parse(
      JSON.stringify({
        type: 'registrert_brev',
        spor: ['grunnlag'],
        sendt: '2026-10-20',
        beskrivelse: 'Svar på varselet',
        dokumentasjon: [brevet],
        ...ekstra,
      })
    ) as Data;
  const kontekst = (part: Part): Kontekst => ({
    sakId: 'SAK-1045',
    aktoerId: part.toLowerCase(),
    part,
    teamId: null,
    tidspunkt: () => new Date('2026-10-21T10:00:00Z'),
    nyId: randomUUID,
  });
  const prov = (journal: Journalrad[], kommando: Data, part: Part) => {
    try {
      return vurder(kommando, kontekst(part), journal, KJERNE, mellomlager(kommando));
    } catch (feil) {
      // 7.1.2 i designnotatet: kjernen skal forstå det den selv skriver.
      if (feil instanceof Skrivefeil) throw new AssertionError({ message: feil.message });
      throw feil;
    }
  };
  const regel = (journal: Journalrad[], kommando: Data, part: Part) => {
    const u = prov(journal, kommando, part);
    return u.godtatt ? 'godtatt' : u.avvisning.regel;
  };
  const godtatt = (journal: Journalrad[], kommando: Data, part: Part) => {
    const u = prov(journal, kommando, part);
    if (!u.godtatt)
      throw new Error(`Forutsetning: avvist: ${u.avvisning.regel}: ${u.avvisning.melding}`);
    journal.push(u.hendelser[0]);
    return u.hendelser[0];
  };
  const utledet = (journal: Journalrad[]) =>
    utled(lesJournal(journal, KJERNE.leserformat), GJELDENDE_REGLER);
  const vist = (journal: Journalrad[]) => visning(utledet(journal), GJELDENDE_REGLER);
  /** Grunnlagskravet venter på svar, og BH har registrert ett brev. */
  async function medBrevFraBH() {
    const bane = minnebane();
    await bygg(bane, ['krav_irreg']);
    const journal = await bane.journal();
    const rad = godtatt(journal, registrering(), 'BH');
    return { journal, rad };
  }

  it('OV-U17: rettingen er en ny registrering med henvisning, og originalen står som rettet', async () => {
    const { journal, rad } = await medBrevFraBH();
    const retting = godtatt(
      journal,
      registrering({ sendt: '2026-10-19', retter: rad.event_id }),
      'BH'
    );
    expect(retting.data).toMatchObject({ retter: rad.event_id, beskrivelse: 'Svar på varselet' });
    const u = utledet(journal);
    expect(u.forstaatt).toBe(true);
    expect(u.registrerteBrev.map((b) => [b.dokument, b.sendt, b.rettetAv])).toEqual([
      [rad.event_id, '2026-10-20', retting.event_id],
      [retting.event_id, '2026-10-19', null],
    ]);
    expect(vist(journal).spor.grunnlag.registrerteBrev).toEqual([retting.event_id]);
  });

  it('OV-U17: bare samme side retter; kontrollsak: BH retter sin egen', async () => {
    const { journal, rad } = await medBrevFraBH();
    expect(regel(journal, registrering({ retter: rad.event_id }), 'TE')).toBe('FEIL_PART');
    expect(regel(journal, { type: 'ikke_i_saken', retter: rad.event_id }, 'TE')).toBe('FEIL_PART');
    expect(regel(journal, registrering({ retter: rad.event_id }), 'BH')).toBe('godtatt');
  });

  it('OV-U17: en retting må gjelde et brev registrert som dokumentasjon i saken', async () => {
    const { journal } = await medBrevFraBH();
    const kravet = journal.find((r) => Array.isArray(r.data.krav))!.event_id;
    for (const retter of [kravet, randomUUID()])
      expect(regel(journal, registrering({ retter }), 'TE')).toBe('RETTER_IKKE_EN_REGISTRERING');
  });

  it('en rettet registrering rettes ikke igjen; kontrollsak: den siste i kjeden rettes', async () => {
    const { journal, rad } = await medBrevFraBH();
    const retting = godtatt(journal, registrering({ retter: rad.event_id }), 'BH');
    expect(regel(journal, registrering({ retter: rad.event_id }), 'BH')).toBe(
      'REGISTRERINGEN_ER_RETTET'
    );
    expect(regel(journal, registrering({ retter: retting.event_id }), 'BH')).toBe('godtatt');
  });

  it('OV-U18: etter en retting om feil sak viser avvisningen til en ny registrering, ikke til rettingen', async () => {
    const { journal, rad } = await medBrevFraBH();
    godtatt(journal, { type: 'ikke_i_saken', retter: rad.event_id }, 'BH');
    const u = prov(journal, registrering({ retter: rad.event_id }), 'BH');
    expect(u.godtatt ? null : u.avvisning.melding).toMatch(/registreres brevet på nytt/);
    expect(regel(journal, registrering(), 'BH'), 'kontrollsak: en ny registrering').toBe('godtatt');
  });

  it('OV-U18: brevet i feil sak rettes bort, og visningen viser det ikke lenger ved kravet eller i merknaden', async () => {
    const { journal, rad } = await medBrevFraBH();
    const foer = vist(journal);
    expect(foer.spor.grunnlag.registrerteBrev, 'kontrollsak').toEqual([rad.event_id]);
    expect(foer.merknader, 'kontrollsak').toContain('brev_utenfor_appen');
    const retting = godtatt(journal, { type: 'ikke_i_saken', retter: rad.event_id }, 'BH');
    expect(retting.data).toEqual({ retter: rad.event_id, ikke_i_saken: true });
    const etter = vist(journal);
    expect(etter.spor.grunnlag.registrerteBrev).toEqual([]);
    expect(etter.merknader).not.toContain('brev_utenfor_appen');
    expect(etter.registrerteBrev.map((b) => b.rettetAv)).toEqual([retting.event_id]);
    expect(harIkkeVurdertBrev(utledet(journal)), 'statusteksten og sakslisten').toBe(false);
  });

  it('OV-U19: et varsel registrert med virkning teller ikke som brev utenfor appen i merknaden, statusen og sakslisten; et brev som dokumentasjon gjør det', async () => {
    const bane = minnebane();
    await bygg(bane, [
      { handling: 'krav', spor: 'grunnlag', underkategori: 'endringsordre' },
      { handling: 'varsel', spor: 'frist', sendt: '2026-09-02' },
    ]);
    const journal = await bane.journal();
    expect(forstaatt(journal), 'forutsetning').toBe(true);
    expect(vist(journal).merknader).not.toContain('brev_utenfor_appen');
    expect(harIkkeVurdertBrev(utledet(journal)), 'statusteksten og sakslisten').toBe(false);
    godtatt(journal, registrering(), 'TE');
    expect(vist(journal).merknader, 'kontrollsak').toContain('brev_utenfor_appen');
    expect(harIkkeVurdertBrev(utledet(journal)), 'kontrollsak').toBe(true);
  });

  it('OV-U4, OV-U18: rettingen godtas i en sak som ikke er forstått, og brevet vises med datoen', async () => {
    const { journal, rad } = await medBrevFraBH();
    journal.push({
      ...structuredClone(journal.at(-1)!),
      event_id: randomUUID(),
      versjon: journal.at(-1)!.versjon + 1,
      format: null,
    });
    expect(forstaatt(journal)).toBe(false);
    expect(vist(journal).registrerteBrev.map((b) => [b.sendt, b.beskrivelse])).toEqual([
      ['2026-10-20', 'Svar på varselet'],
    ]);
    expect(vist(journal).merknader).toEqual([
      'varsel_med_frist_utenfor_appen',
      'brev_utenfor_appen',
    ]);
    expect(regel(journal, { type: 'ikke_i_saken', retter: rad.event_id }, 'BH')).toBe('godtatt');
  });

  it.each<[string, (rad: Journalrad) => void, string]>([
    [
      'viser til noe som ikke er i saken',
      (r) => (r.data.retter = randomUUID()),
      'rettingen viser ikke',
    ],
    ['er fra motparten (OV-U17)', (r) => (r.aktor_rolle = 'TE'), 'rettingen viser ikke'],
  ])('en retting som %s, gjør saken ikke forstått', async (_, endre, grunn) => {
    const { journal, rad } = await medBrevFraBH();
    const retting = godtatt(journal, { type: 'ikke_i_saken', retter: rad.event_id }, 'BH');
    expect(grunner(journal), 'kontrollsak').toEqual([]);
    endre(retting);
    expect(grunner(journal)).toEqual([expect.stringContaining(grunn)]);
  });

  it.each<[string, (data: Data) => void, string]>([
    ['med en beskrivelse', (d) => (d.beskrivelse = 'x'), 'mer enn henvisningen'],
    ['uten henvisning', (d) => delete d.retter, 'viser ikke til noe'],
  ])('leseren forstår ikke en retting om feil sak %s', async (_, endre, grunn) => {
    const { journal, rad } = await medBrevFraBH();
    const retting = godtatt(journal, { type: 'ikke_i_saken', retter: rad.event_id }, 'BH');
    endre(retting.data);
    expect(grunner(journal)).toEqual([expect.stringContaining(grunn)]);
  });

  it('leseren forstår ikke en henvisning i et dokument som ikke er en registrering (OV-U17)', async () => {
    const { journal, rad } = await medBrevFraBH();
    const kravet = structuredClone(journal.find((r) => Array.isArray(r.data.krav))!);
    kravet.data.retter = rad.event_id;
    const [lest] = lesJournal([kravet], KJERNE.leserformat);
    expect(lest.art === 'ukjent' ? lest.grunn : lest.art).toContain('en retting er ikke');
  });

  it('OV-U20: ved hvert krav som venter, vises motpartens brev for sporet og saken, ikke TEs eller et annet spors', async () => {
    const { journal, rad } = await medBrevFraBH();
    const saken = godtatt(journal, registrering({ spor: undefined }), 'BH');
    const vederlag = godtatt(journal, registrering({ spor: ['vederlag'] }), 'BH');
    godtatt(journal, registrering(), 'TE');
    expect(vist(journal).spor.grunnlag.registrerteBrev).toEqual([rad.event_id, saken.event_id]);
    expect(vist(journal).spor.vederlag.registrerteBrev).toEqual([
      saken.event_id,
      vederlag.event_id,
    ]);
  });

  it('OV-U19: når kravene er avgjort, står setningen i statusen og ikke som merknad (OV-U10)', async () => {
    const bane = minnebane();
    await bygg(bane, [
      'godkjent_grunnlag',
      { handling: 'ingen_krav', spor: 'vederlag' },
      { handling: 'ingen_krav', spor: 'frist' },
    ]);
    const journal = await bane.journal();
    expect(vist(journal).status?.tekst, 'kontrollsak: uten registrert brev').toBe(
      'Alle krav sendt i appen er avgjort'
    );
    godtatt(journal, registrering(), 'TE');
    const v = vist(journal);
    expect(v.status?.tekst).toBe(
      'Alle krav sendt i appen er avgjort. Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.'
    );
    expect(v.merknader).not.toContain('brev_utenfor_appen');
  });
});
