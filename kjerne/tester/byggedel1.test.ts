/**
 * Formen og lesereglene byggedel 1 av #309 la til: tekst basen ikke kan lagre
 * (#373), grunnlagsversjonen i svaret (#342, HF-U1), sammenfallet (MM-U18, #326),
 * merkingen (KA-U16, KA-U20), innsigelsen, protesten og påberopt passivitet (§ 5,
 * VS-U1, VS-U12), og at et registrert svar ikke leses med en innsigelse (VS-U24,
 * OV-U4). Forløpene gjennom kommandoene står som bevis-saker i domenetabellen.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { KRAVINNHOLD, objekt, UTREGNING } from '../format/format.ts';
import { lesJournal } from '../format/leser.ts';
import { feilI } from '../format/skjema.ts';
import { forhaandsvis, laastTekst, vurder } from '../kommandoer/skriving.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import type { Journalrad } from '../typer.ts';
import { utled } from '../utledning/utled.ts';
import { KJERNE } from '../versjon.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import type { Kjoering } from './kjoerer.ts';

type Data = Record<string, unknown>;

const forstaatt = (rader: Journalrad[]) =>
  utled(lesJournal(rader, KJERNE.leserformat), GJELDENDE_REGLER).forstaatt;

/** En ny rad etter journalen, fra parten, med `data`. */
const rad = (journal: Journalrad[], part: 'TE' | 'BH', data: Data): Journalrad => {
  const siste = journal.at(-1)!;
  return {
    ...siste,
    event_id: randomUUID(),
    event_type: 'dokument_registrert',
    versjon: siste.versjon + 1,
    aktor_rolle: part,
    data,
  };
};

/** Raden med elementet etiketten viser til, endret i en kopi. */
function endre(rader: Journalrad[], k: Kjoering, navn: string, endring: (e: Data) => void) {
  const id = k.navn.id(navn);
  return structuredClone(rader).map((r) => {
    for (const e of [
      ...((r.data.svar ?? []) as Data[]),
      ...((r.data.krav ?? []) as Data[]),
      ...((r.data.utsagn ?? []) as Data[]),
    ])
      if (e.id === id) endring(e);
    return r;
  });
}

const avslag = [
  'krav_irreg',
  {
    handling: 'brev',
    navn: 'D4',
    svar: [
      { spor: 'grunnlag', navn: 'S-g1', resultat: 'avslaatt', varslet_i_tide: true },
      { spor: 'vederlag', navn: 'S-v1', vurdering: 'delvis', godkjent_belop: 60000 },
    ],
  },
];

describe('tekst basen ikke kan lagre, avvises av kjernen (#373)', () => {
  const kontekst = {
    sakId: 'sak',
    aktoerId: 'te',
    part: 'TE' as const,
    teamId: null,
    tidspunkt: () => new Date('2026-10-11T08:00:00Z'),
    nyId: () => randomUUID(),
  };
  const krav = (innhold: Data) => ({
    type: 'krav',
    spor: 'grunnlag',
    innhold: { hovedkategori: 'endring', underkategori: 'irregulaer_endring', ...innhold },
    utdypning: 'Pålegget.',
  });
  /** Kommandoen med den låste teksten fra forhåndsvisningen, slik klienten sender den (A1). */
  const utfall = async (k: Data) => {
    const journal = await minnebane().journal();
    const vist = forhaandsvis(structuredClone(k), kontekst, journal, KJERNE);
    const tekst = vist.godtatt ? laastTekst(vist.hendelser[0]) : null;
    return vurder(tekst ? { ...k, brevtekst: tekst } : k, kontekst, journal, KJERNE);
  };

  it.each([
    ['NUL i en tekst', { tittel: 'a\u0000b' }],
    ['en enslig høy surrogat', { tittel: 'a\ud800' }],
    ['en enslig lav surrogat', { tittel: '\udc00b' }],
    ['NUL i et feltnavn', { 'tit\u0000tel': 'x' }],
  ])('%s gir TEKST_KAN_IKKE_LAGRES', async (_navn, innhold) => {
    const u = await utfall(krav(innhold));
    expect(u.godtatt ? null : u.avvisning.regel).toBe('TEKST_KAN_IKKE_LAGRES');
  });

  it('kontrollsak: et gyldig surrogatpar godtas', async () => {
    expect((await utfall(krav({ tittel: 'Riving 😀' }))).godtatt).toBe(true);
  });

  it('en lagret rad med NUL i teksten er ikke forstått', async () => {
    const bane = minnebane();
    const k = await bygg(bane, ['krav_irreg']);
    const journal = await bane.journal();
    const med = endre(journal, k, 'K-g1', (e) => void (e.tittel = 'x\u0000'));
    expect(forstaatt(journal)).toBe(true);
    expect(forstaatt(med)).toBe(false);
  });
});

describe('svaret på vederlag og frist viser til grunnlagsversjonen (#342, HF-U1)', () => {
  it('kommandoen lagrer grunnlagsversjonen svaret ble regnet mot', async () => {
    const bane = minnebane();
    const k = await bygg(bane, avslag);
    const svar = (await bane.journal())
      .flatMap((r) => (r.data.svar ?? []) as Data[])
      .find((s) => s.id === k.navn.id('S-v1'))!;
    expect(svar.grunnlagskrav).toBe(k.navn.id('K-g1'));
  });

  it.each<[string, (e: Data, k: Kjoering) => void]>([
    ['uten grunnlagsversjon', (e) => void delete e.grunnlagskrav],
    [
      'med et vederlagskrav som grunnlagsversjon',
      (e, k) => void (e.grunnlagskrav = k.navn.id('K-v1')),
    ],
    ['med en grunnlagsversjon som ikke finnes', (e) => void (e.grunnlagskrav = randomUUID())],
  ])('et lagret svar %s er ikke forstått', async (_navn, endring) => {
    const bane = minnebane();
    const k = await bygg(bane, avslag);
    const journal = await bane.journal();
    expect(forstaatt(journal)).toBe(true);
    expect(forstaatt(endre(journal, k, 'S-v1', (e) => endring(e, k)))).toBe(false);
  });

  it('et svar på grunnlaget med grunnlagsversjon er ikke forstått', async () => {
    const bane = minnebane();
    const k = await bygg(bane, avslag);
    const journal = await bane.journal();
    const med = endre(journal, k, 'S-g1', (e) => void (e.grunnlagskrav = k.navn.id('K-g1')));
    expect(forstaatt(med)).toBe(false);
  });
});

describe('sammenfallet må stemme med standpunktene i brevet (MM-U18, #326)', () => {
  it('et avslag lagret med sammenfall er ikke forstått; kontrollsak: slik kjernen skrev det', async () => {
    const bane = minnebane();
    const k = await bygg(bane, avslag);
    const journal = await bane.journal();
    const med = endre(journal, k, 'S-g1', (e) => {
      (e.beslutningsgrunnlag as Data).sammenfall = true;
    });
    expect(forstaatt(journal)).toBe(true);
    expect(forstaatt(med)).toBe(false);
  });
});

describe('formen på merkingen og utsagnene som viser til et annet element', () => {
  async function grunnlag() {
    const bane = minnebane();
    const k = await bygg(bane, avslag);
    return { k, journal: await bane.journal() };
  }
  const merking = (spor: string[], gjelder?: string) => ({
    id: randomUUID(),
    hva: 'kan_ikke_uttrykkes',
    spor,
    ...(gjelder ? { gjelder } : {}),
  });

  it('en merking gjør saken ikke forstått, også i et registrert dokument (OV-U7, arbeidsvalget 16.10 på #587)', async () => {
    const bane = minnebane();
    await bygg(bane, [
      'krav_irreg',
      {
        handling: 'rad',
        spor: 'grunnlag',
        navn: 'S-g1',
        dokument: 'D4',
        gjelder: 'K-g1',
        resultat: 'avslaatt',
        varslet_i_tide: true,
        sendt: '2026-09-30',
        merking: ['grunnlag'],
      },
    ]);
    const journal = await bane.journal();
    const uten = structuredClone(journal);
    const d4 = uten.at(-1)!.data as { opplysninger: Data[] };
    d4.opplysninger = d4.opplysninger.filter((o) => o.hva !== 'sendt');
    expect(forstaatt(journal)).toBe(false);
    expect(forstaatt(uten)).toBe(false);
    // Kontrollsak: samme registrerte brev uten merkingen er forstått.
    const umerket = structuredClone(journal);
    const d = umerket.at(-1)!.data as { opplysninger: Data[] };
    d.opplysninger = d.opplysninger.filter((o) => o.hva !== 'kan_ikke_uttrykkes');
    expect(forstaatt(umerket)).toBe(true);
  });

  it('en senere merking av et dokument som ikke er registrert, er ikke forstått; samme spor to ganger heller ikke', async () => {
    const { k, journal } = await grunnlag();
    const brev = k.navn.id('D4');
    const senere = (spor: string[]) => rad(journal, 'TE', { opplysninger: [merking(spor, brev)] });
    expect(forstaatt([...journal, senere(['grunnlag'])])).toBe(false);
    expect(forstaatt([...journal, senere(['grunnlag', 'grunnlag'])])).toBe(false);
  });

  it.each<[string, 'TE' | 'BH', string, string, boolean]>([
    ['en innsigelse fra BH mot TEs krav', 'BH', 'innsigelse', 'K-g1', true],
    ['en innsigelse fra TE mot eget krav', 'TE', 'innsigelse', 'K-g1', false],
    ['en innsigelse fra TE mot BHs svar', 'TE', 'innsigelse', 'S-g1', true],
    ['en innsigelse mot et dokument', 'TE', 'innsigelse', 'D4', false],
    ['en protest fra TE mot BHs dokument med en påberopelse', 'TE', 'protest', 'D4', false],
    ['en passivitet mot grunnlagskravet', 'TE', 'passivitet', 'K-g1', true],
    ['en passivitet mot vederlagskravet', 'TE', 'passivitet', 'K-v1', false],
    ['en avklaring som ikke gjelder en merking', 'BH', 'avklaring', 'K-g1', false],
  ])('%s', async (_navn, part, art, gjelder, ventet) => {
    const { k, journal } = await grunnlag();
    const r = rad(journal, part, {
      utsagn: [{ id: randomUUID(), art, gjelder: k.navn.id(gjelder) }],
    });
    expect(forstaatt([...journal, r])).toBe(ventet);
  });

  it('en protest mot en innsigelse fra motparten er forstått; mot egen innsigelse ikke (VS-U1)', async () => {
    const { k, journal } = await grunnlag();
    const innsigelse = { id: randomUUID(), art: 'innsigelse', gjelder: k.navn.id('K-g1') };
    const i = rad(journal, 'BH', { utsagn: [innsigelse] });
    const protest = (part: 'TE' | 'BH') =>
      rad([i], part, { utsagn: [{ id: randomUUID(), art: 'protest', gjelder: innsigelse.id }] });
    expect(forstaatt([...journal, i, protest('TE')])).toBe(true);
    expect(forstaatt([...journal, i, protest('BH')])).toBe(false);
  });

  it('en passivitet fra BH er ikke forstått (VS-U12)', async () => {
    const { k, journal } = await grunnlag();
    const r = rad(journal, 'BH', {
      utsagn: [{ id: randomUUID(), art: 'passivitet', gjelder: k.navn.id('K-g1') }],
    });
    expect(forstaatt([...journal, r])).toBe(false);
  });
});

describe('et registrert svar leses ikke med en innsigelse (VS-U24, OV-U4)', () => {
  async function medInnsigelse() {
    const bane = minnebane();
    const k = await bygg(bane, [
      'krav_irreg',
      { handling: 'innsigelse', part: 'BH', gjelder: 'K-g1', navn: 'D3' },
      {
        handling: 'rad',
        spor: 'grunnlag',
        navn: 'S-g1',
        dokument: 'D4',
        gjelder: 'K-g1',
        resultat: 'godkjent',
        sendt: '2026-09-30',
      },
    ]);
    return { k, journal: await bane.journal() };
  }

  it('kontrollsak: svaret har én virkning per standpunkt og er forstått', async () => {
    const { journal } = await medInnsigelse();
    expect(forstaatt(journal)).toBe(true);
  });

  it.each<[string, (k: Kjoering) => string]>([
    ['innsigelsen', (k) => k.navn.id('D3#innsigelse')],
    ['et krav', (k) => k.navn.id('K-v1')],
    ['en ID som ikke finnes', () => randomUUID()],
  ])('en virkning for %s er ikke forstått', async (_navn, id) => {
    const { k, journal } = await medInnsigelse();
    const med = endre(journal, k, 'S-g1', (e) => {
      const b = e.beslutningsgrunnlag as { virkninger: Data[] };
      b.virkninger.unshift({ standpunkt: id(k), virkning: 'prinsipalt' });
    });
    expect(forstaatt(med)).toBe(false);
  });
});

/**
 * KA-U22: sperren for trekk dekker en enighet som bygger på et merket brev. Et
 * avtalt fradrag (KA-U9) avvises av formatet fordi KA-U9 ikke er bygget. Bygges
 * fradraget, blir denne testen rød, og sperren må dekke det i samme endring.
 */
describe('formatet har ingen negative beløp ennå (KA-U22, KA-U9)', () => {
  it('et krav og en utregning med negativt beløp avvises', () => {
    const { properties, required } = KRAVINNHOLD.vederlag;
    expect(feilI({ metode: 'tilbud', beloep: -100000 }, objekt(properties, required))).not.toEqual(
      []
    );
    expect(
      feilI({ resultat: 'godkjent', godkjent_beloep: -100000 }, UTREGNING.vederlag!)
    ).not.toEqual([]);
  });
});

/**
 * Code-review av PR #394: det som viser til et registrert element, stopper ikke saken
 * (MM-U18). Kravversjonen og svaret er dokumentasjon (OV-U4).
 */
describe('registrerte brev som viser til en registrert kravversjon', () => {
  const foer = [
    'godkjent_grunnlag',
    { handling: 'krav', spor: 'vederlag', belop: 100000, navn: 'K-v1' },
    {
      handling: 'rad',
      krav: true,
      spor: 'grunnlag',
      underkategori: 'endringsordre',
      part: 'TE',
      navn: 'K-g2',
      sendt: '2026-10-01',
    },
  ];

  it('et registrert svar regnet mot den er dokumentasjon, og saken er forstått (OV-U4)', async () => {
    const bane = minnebane();
    const k = await bygg(bane, [
      ...foer,
      {
        handling: 'rad',
        spor: 'vederlag',
        navn: 'S-v1',
        dokument: 'D5',
        gjelder: 'K-v1',
        grunnlagskrav: 'K-g2',
        vurdering: 'godkjent',
        godkjent_belop: 100000,
        sendt: '2026-10-02',
      },
    ]);
    const u = utled(lesJournal(await bane.journal(), KJERNE.leserformat), GJELDENDE_REGLER);
    expect(u.forstaatt).toBe(true);
    expect(u.spor.grunnlag.gjeldendeKrav?.id).toBe(k.navn.id('K-g1'));
    expect(u.spor.vederlag.gjeldendeSvar).toBeNull();
    expect(u.utenVirkning).toEqual([]);
  });

  it('en registrert begrunnelse av et registrert svar, sendt før svaret, avvises (KA-U36, KA-U38)', async () => {
    const bane = minnebane();
    const k = await bygg(bane, [
      ...foer,
      {
        handling: 'rad',
        spor: 'vederlag',
        navn: 'S-v1',
        dokument: 'D5',
        gjelder: 'K-v1',
        grunnlagskrav: 'K-g2',
        vurdering: 'godkjent',
        godkjent_belop: 100000,
        sendt: '2026-10-02',
      },
    ]);
    const journal = await bane.journal();
    const begrunnelse = (sendt: string) => {
      const u = vurder(
        { type: 'begrunnelse', gjelder: k.navn.id('S-v1'), sendt, dokumentasjon: [randomUUID()] },
        {
          sakId: journal[0].sak_id,
          aktoerId: 'bh',
          part: 'BH',
          teamId: null,
          tidspunkt: () => new Date('2026-10-11T08:00:00Z'),
          nyId: () => randomUUID(),
        },
        journal,
        KJERNE
      );
      return u.godtatt ? null : u.avvisning.regel;
    };
    expect(begrunnelse('2026-10-02'), 'kontrollsak').toBeNull();
    expect(begrunnelse('2026-10-01')).toBe('BEGRUNNELSE_FOER_SVARET');
  });

  it('en påberopt passivitet mot den er forstått', async () => {
    const bane = minnebane();
    await bygg(bane, [
      ...foer,
      {
        handling: 'rad',
        art: 'passivitet',
        gjelder: 'K-g2',
        part: 'TE',
        navn: 'D5',
        sendt: '2026-10-02',
      },
    ]);
    expect(forstaatt(await bane.journal())).toBe(true);
  });
});
