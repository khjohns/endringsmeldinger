/**
 * Grensene i kjernen som bevis-sakene ikke når: formen på kommandoene, rader
 * leseren ikke skal godta, og en aksept av et standpunkt som er
 * uavklart. Hver avvisning har en kontrollsak som bare skiller seg i det ene.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Journalrad, Krav, Standpunktsvirkning } from '../typer.ts';
import { frysBrev } from '../kommandoer/skriving.ts';
import { KJERNE } from '../versjon.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { formfeil } from '../kommandoer/kommando.ts';
import { lesJournal } from '../format/leser.ts';
import { kanInngaaIEo, kraveneErAvgjort, utled } from '../utledning/utled.ts';
import { GJELDENDE_REGLER, type Regelsett } from '../regler/regelsett.ts';
import { regnUtSvar, ulikeVirkninger, virkninger } from '../frosset/standpunkt.ts';
import { visning } from '../utledning/visning.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import { avvikFraFormatet } from './formatprove.ts';
import type { Kjoering } from './kjoerer.ts';

type Data = Record<string, unknown>;

const forstaatt = (rader: Journalrad[]) =>
  utled(lesJournal(rader, KJERNE.leserformat), GJELDENDE_REGLER).forstaatt;

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

  it('en bestridelse av opplysningen må gjelde § 31.3, ikke en dato (MM-U7)', async () => {
    const k = await bygg(minnebane(), [
      'krav_irreg',
      registrert({ sendt: '2026-09-30', endringsordre: true }),
    ]);
    const feil = await k.prov({
      handling: 'bestridelse',
      part: 'TE',
      gjelder: 'D4#endringsordre',
      hva: 'sendt',
    });
    expect(feil.godtatt ? 'godtatt' : feil.avvisning.regel).toBe('FEIL_BESTRIDELSE');
    const riktig = await k.prov({
      handling: 'bestridelse',
      part: 'TE',
      gjelder: 'D4#endringsordre',
      hva: 'endringsordre',
    });
    expect(riktig.godtatt).toBe(true);
  });

  it('en avklaring gjelder ett registrert brev, og to opplysninger om samme brev er ikke forstått (MM-U12)', async () => {
    const bane = minnebane();
    const k = await bygg(bane, [
      'krav_irreg',
      registrert({ sendt: '2026-09-30' }),
      { handling: 'rad', avklarer: 'D4', oppfylt: true, navn: 'D5' },
    ]);
    const journal = await bane.journal();
    expect(forstaatt(journal)).toBe(true);
    const igjen = structuredClone(journal.at(-1)!);
    igjen.event_id = randomUUID();
    igjen.versjon += 1;
    (igjen.data.opplysninger as Data[])[0].id = randomUUID();
    expect(forstaatt([...journal, igjen])).toBe(false);
    // Kontrollsak: et brev sendt i appen er ikke registrert korrespondanse og avklares ikke.
    const app = minnebane();
    const a = await bygg(app, ['krav_irreg', registrert({})]);
    const appJournal = await app.journal();
    const avklaring = structuredClone(journal.at(-1)!);
    avklaring.versjon = appJournal.at(-1)!.versjon + 1;
    (avklaring.data.opplysninger as Data[])[0].gjelder = a.navn.id('D4');
    expect(forstaatt([...appJournal, avklaring])).toBe(false);
    expect(k.navn.id('D5')).toBe(journal.at(-1)!.event_id);
  });

  it('korrespondanse som bare er mottatt, er også registrert, og uten opplysningen er det ikke avklart', async () => {
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
    expect(u.endringsordre).toBe('ikke_avklart');
  });
});

/** HF-U1: en opplysning om dokumentet og en om varselet i det står ved siden av hverandre. */
describe('datoene for et registrert krav og varselet i det', () => {
  it('leses hver for seg, og varselets dato er den SK-12 sammenlikner med (KA-19)', async () => {
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
          { id: randomUUID(), hva: 'sendt', dato: '2026-09-02', gjelder: varsel },
        ],
      },
    };
    await bane.skriv([rad], siste.versjon);
    expect(forstaatt(await bane.journal())).toBe(true);
    const ny = (sendt: string) =>
      k.prov({ handling: 'krav', spor: 'frist', dager: 25, varsel_sendt: sendt });
    expect((await ny('2026-09-02')).godtatt).toBe(true);
    const flyttet = await ny('2026-09-10');
    expect(flyttet.godtatt ? 'godtatt' : flyttet.avvisning.regel).toBe('VARSEL_REGISTRERT');
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

  it('en innsigelse mot det første fristkravet leser et registrert svar på en senere kravversjon (VS-U20)', async () => {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
      { handling: 'innsigelse', part: 'BH', gjelder: 'K-f1', navn: 'D-innsigelse' },
      { handling: 'krav', spor: 'frist', dager: 25, navn: 'K-f2' },
      {
        handling: 'rad',
        spor: 'frist',
        navn: 'S-f2',
        dokument: 'D-svar',
        gjelder: 'K-f2',
        hindring: true,
        sendt: '2026-09-30',
        varsel_i_tide: true,
        spesifisering_i_tide: true,
      },
    ]);
    const u = await k.utledning();
    expect(u.forstaatt).toBe(true);
    const s = u.svar[k.navn.id('S-f2')];
    if (s.svar.standpunkter.some((p) => p.art === 'rettidighet'))
      throw new Error('Forutsetning: det registrerte svaret har ikke standpunkt om rettidighet');
    expect(s.virkninger.find((p) => p.art === 'rettidighet')?.virkning).toBe('prinsipalt');
  });

  async function innsigelseMotSenereKravversjon(iTide: boolean) {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
      { handling: 'krav', spor: 'frist', dager: 25, navn: 'K-f2' },
      { handling: 'innsigelse', part: 'BH', gjelder: 'K-f2', navn: 'D-innsigelse' },
      {
        handling: 'brev',
        svar: [
          {
            spor: 'frist',
            navn: 'S-f2',
            varsel_i_tide: iTide,
            spesifisering_i_tide: true,
            hindring: true,
            dager: 10,
          },
        ],
      },
      {
        handling: 'rad',
        spor: 'frist',
        navn: 'S-f3',
        dokument: 'D-revisjon',
        gjelder: 'K-f2',
        erstatter: 'S-f2',
        hindring: true,
        varsel_i_tide: true,
        spesifisering_i_tide: true,
        dager: 15,
        sendt: '2026-10-01',
      },
    ]);
    const u = await k.utledning();
    expect(u.forstaatt).toBe(true);
    const s = u.svar[k.navn.id('S-f3')];
    if (s.svar.standpunkter.some((p) => p.art === 'rettidighet'))
      throw new Error('Forutsetning: det registrerte svaret har ikke standpunkt om rettidighet');
    return s.virkninger.find((p) => p.art === 'rettidighet')?.virkning;
  }

  it('et «i tide» gir opp innsigelsen mot en senere kravversjon, så et registrert svar leses ikke med den (VS-U11, VS-U20)', async () => {
    expect(await innsigelseMotSenereKravversjon(true)).toBeUndefined();
  });

  it('kontrollsak: uten «i tide» leses det registrerte svaret med innsigelsen mot den senere kravversjonen', async () => {
    expect(await innsigelseMotSenereKravversjon(false)).toBe('prinsipalt');
  });

  it('et «i tide» gir opp innsigelsen også når et senere svar sier «for sent» (VS-U20, arbeidsvalget 15.10 i #309)', async () => {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
      { handling: 'innsigelse', part: 'BH', gjelder: 'K-f1', navn: 'D-innsigelse' },
      {
        handling: 'brev',
        svar: [
          {
            spor: 'frist',
            navn: 'S-f1',
            varsel_i_tide: true,
            spesifisering_i_tide: true,
            hindring: true,
            dager: 10,
          },
        ],
      },
      { handling: 'krav', spor: 'frist', dager: 25, navn: 'K-f2' },
      // HF-U4: fra appen avvises «for sent» etter «i tide», så svaret er registrert uten kommandoen.
      {
        handling: 'rad',
        spor: 'frist',
        navn: 'S-f2',
        dokument: 'D-f2',
        gjelder: 'K-f2',
        varsel_i_tide: false,
        spesifisering_i_tide: true,
        hindring: true,
        dager: 10,
        sendt: '2026-09-28',
      },
      {
        handling: 'rad',
        spor: 'frist',
        navn: 'S-f3',
        dokument: 'D-revisjon',
        gjelder: 'K-f2',
        erstatter: 'S-f2',
        hindring: true,
        varsel_i_tide: true,
        spesifisering_i_tide: true,
        dager: 15,
        sendt: '2026-10-01',
      },
    ]);
    const u = await k.utledning();
    expect(u.forstaatt).toBe(true);
    const s = u.svar[k.navn.id('S-f3')];
    if (s.svar.standpunkter.some((p) => p.art === 'rettidighet'))
      throw new Error('Forutsetning: det registrerte svaret har ikke standpunkt om rettidighet');
    expect(s.virkninger.find((p) => p.art === 'rettidighet')).toBeUndefined();
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
