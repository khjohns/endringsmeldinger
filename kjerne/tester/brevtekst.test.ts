/**
 * Brevteksten i kjernen (#369): teksten mottakeren leser i et brev appen sender.
 * Forventningene har kilde i vedtakene: LV-U4 (ordlyden, punkt 1–13, og 5.2, 5.5b
 * og 5.6 i svaret), GR-U14 (teksten etter § 31.3 i en godkjenning som er en
 * endringsordre), GR-U15 (TEs varsel etter § 32.2 beskriver pålegget), GR-U16
 * (endringsordrens dato eller nummer), KA-U31–KA-U33 og KA-U24 (begrunnelsen),
 * LV-U2 (teksten avsenderen godkjenner, er den som fryses, og et dokument gjengir
 * den tro), LV-U3 (hvert utsagn med virkning står i teksten, ikke appens vurdering),
 * KA-U22 og KA-U25 (de faste tekstene, ordrett), VS-U9 og VS-U11 (svaret gjentar
 * eller gir opp innsigelsen), B-13 05.10 (svaret når grunnlaget er avslått eller
 * prekludert), B-13 om begrunnelsestekst (den låste delen og utdypningen hver for
 * seg), MM-U17 (et registrert brev får ingen tekst fra appen) og HF-U1 (hvert avsnitt
 * viser til et element i brevet). Arbeidsvalgene A1–A8 står i paragrafmatrisen, og
 * testene som bare følger et arbeidsvalg, sier det. At hvert element i bevis-sakene
 * har et avsnitt, prøves i `forloep.test.ts` og mot testbasen i
 * `sprakprove/kjernelagring/lagring.test.ts`.
 */

import { AssertionError } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  gjengi,
  gjengirTro,
  KanIkkeUttrykkes,
  lagBrevtekst,
  norskDato,
} from '../frosset/brevtekst.ts';
import { kroner, regnUtSvar } from '../frosset/standpunkt.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { kalenderdag, lesJournal } from '../format/leser.ts';
import {
  forhaandsvis,
  frysBrev,
  laastTekst,
  Skrivefeil,
  utledJournal,
  vurder,
  type Kontekst,
  type Utfall,
} from '../kommandoer/skriving.ts';
import { mellomlager } from './klient.ts';
import type { Kommando } from '../kommandoer/kommando.ts';
import { oppgittDatoEtterBrevet } from '../kommandoer/nyttelast.ts';
import { KRAVSPOR, type Avsnitt, type Dokument, type Journalrad, type Part } from '../typer.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import {
  enighetensVirkning,
  kanInngaaIEo,
  kraveneErAvgjort,
  standpunktetErSubsidiaert,
  svarIkkeGodtatt,
  venterPaaSvar,
} from '../utledning/utled.ts';
import { harIkkeVurdertBrev, visning } from '../utledning/visning.ts';
import { KJERNE } from '../versjon.ts';
import { utenAvsnitt } from './formatprove.ts';

type Data = Record<string, unknown>;

const SAK = 'SAK-20261002-001';
const TITTEL = 'Endret fundamentering';
const I_SAKEN = `i sak ${SAK} («${TITTEL}»)`;
const KR = (n: string) => `${n.replace(' ', '\u00a0')}\u00a0kr eks. mva.`;

/**
 * En sak i minnet der hver kommando går gjennom `vurder`, én dag etter den forrige.
 * Klienten sender den låste teksten fra forhåndsvisningen (A1), med mindre
 * kommandoen alt har en.
 */
function sak(sakstittel = TITTEL) {
  const journal: Journalrad[] = [
    {
      event_id: randomUUID(),
      sak_id: SAK,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: '2026-10-01T08:00:00.000Z',
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: 1,
      data: { sakstittel, sakstype: 'standard' },
    },
  ];
  let dag = 2;
  const kontekst = (part: Part): Kontekst => {
    const tid = new Date(`2026-10-${String(dag).padStart(2, '0')}T10:00:00Z`);
    return {
      sakId: SAK,
      aktoerId: part.toLowerCase(),
      part,
      teamId: null,
      tidspunkt: () => tid,
      nyId: randomUUID,
    };
  };
  const prov = (part: Part, kommando: Data, kjerne = KJERNE): Utfall => {
    const k = structuredClone(kommando);
    try {
      if (!('brevtekst' in k)) {
        const vist = forhaandsvis(
          structuredClone(k),
          kontekst(part),
          journal,
          kjerne,
          mellomlager(k)
        );
        const t = vist.godtatt ? laastTekst(vist.hendelser[0]) : null;
        if (t) k.brevtekst = t;
      }
      return vurder(k, kontekst(part), journal, kjerne, mellomlager(k));
    } catch (feil) {
      // 7.1.2 i designnotatet: kjernen skal forstå det den selv skriver.
      if (feil instanceof Skrivefeil) throw new AssertionError({ message: feil.message });
      throw feil;
    }
  };
  const send = (part: Part, kommando: Data): Journalrad => {
    const utfall = prov(part, kommando);
    if (!utfall.godtatt)
      expect.fail(`Forutsetning: kommandoen ble avvist: ${JSON.stringify(utfall.avvisning)}`);
    dag++;
    journal.push(...utfall.hendelser);
    return utfall.hendelser[0];
  };
  /** Den låste teksten forhåndsvisningen gir, eller `null` når den avvises (A1). */
  const vis = (part: Part, kommando: Data, kjerne = KJERNE): string[] | null => {
    try {
      const vist = forhaandsvis(
        structuredClone(kommando),
        kontekst(part),
        journal,
        kjerne,
        mellomlager(kommando)
      );
      return vist.godtatt ? laastTekst(vist.hendelser[0]) : null;
    } catch (feil) {
      if (feil instanceof Skrivefeil) throw new AssertionError({ message: feil.message });
      throw feil;
    }
  };
  /** Avvisningen kommandoen får, eller `null` når den godtas. */
  const avvisning = (part: Part, kommando: Data, kjerne = KJERNE) => {
    const u = prov(part, kommando, kjerne);
    return u.godtatt ? null : u.avvisning;
  };
  const avvist = (part: Part, kommando: Data, kjerne = KJERNE) =>
    avvisning(part, kommando, kjerne)?.regel ?? null;
  /** En rad skrevet utenfor kommandoene, som registrert korrespondanse; svarene fryses. */
  const rad = (part: Part, data: Data): Journalrad => {
    const r: Journalrad = {
      event_id: randomUUID(),
      sak_id: SAK,
      event_type: 'dokument_registrert',
      versjon: journal.at(-1)!.versjon + 1,
      tidsstempel: `2026-10-${String(dag++).padStart(2, '0')}T10:00:00.000Z`,
      aktor_id: part.toLowerCase(),
      aktor_rolle: part,
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: 1,
      data,
    };
    frysBrev(r, journal, KJERNE);
    journal.push(r);
    return r;
  };
  const u = () => utledJournal(journal, KJERNE);
  const krav = (spor: 'grunnlag' | 'vederlag' | 'frist') => gjeldendeKrav(u(), spor).id;
  return { journal, send, vis, avvisning, avvist, rad, u, krav };
}

/** Det gjeldende kravet i sporet. Mangler det, feiler testen med en assertion. */
const gjeldendeKrav = (
  u: ReturnType<typeof utledJournal>,
  spor: 'grunnlag' | 'vederlag' | 'frist'
) => {
  const krav = u.spor[spor].gjeldendeKrav;
  expect(krav, `Forutsetning: TE har et gjeldende krav i ${spor}`).not.toBeNull();
  return krav!;
};

const tekst = (rad: Journalrad): Avsnitt[] => {
  expect(rad.data.brevtekst, 'brevet fra appen har brevtekst (LV-U2)').toBeDefined();
  return rad.data.brevtekst as Avsnitt[];
};
const laast = (rad: Journalrad) => tekst(rad).map((a) => a.laast);

const BESKRIVELSE = 'Byggherren har pålagt en annen fundamentering.';

/** VS-U26: datoen varslingsplikten løper fra, som TE oppgir i grunnlagskravet. */
const MOTTATT = { paalegg_mottatt: '2026-09-25' };
const KLAR_OVER = { klar_over_forholdet: '2026-09-25' };
const MOTTATT_TEKST = 'TE opplyser at pålegget ble mottatt 25. september 2026.';
const KLAR_OVER_TEKST = 'TE opplyser at TE ble klar over forholdet 25. september 2026.';

const GRUNNLAGSKRAV = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Ny peling',
    ...MOTTATT,
  },
  utdypning: BESKRIVELSE,
};

/** OV-U5: kravet registrerer varselet, så brevet med det ligger ved (arbeidsvalget i #909). */
const VARSELBREVET = '7f1c2d3e-0000-4000-8000-000000003304';

const FRISTKRAV = {
  type: 'krav',
  spor: 'frist',
  innhold: { dager: 20 },
  varsel: { sendt: '2026-09-28', dokumentasjon: [VARSELBREVET] },
  utdypning: 'Pelingen tar fire uker lenger.',
};

/** Saken med grunnlag (brev 2), vederlag (brev 3, 125 000 kr) og frist (brev 4, 20 dager). */
function sakMedKrav() {
  const s = sak();
  s.send('TE', GRUNNLAGSKRAV);
  s.send('TE', { type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep: 125000 } });
  s.send('TE', FRISTKRAV);
  return s;
}

const BEGRUNNELSE = 'Byggherrens begrunnelse.';

/** «Ja» på § 34.2.2 og § 33.6.1 står i brevet uten å ordnes, som byggherren sa det (#341, LV-U3). */
const METODE_JA = 'Byggherren aksepterer beregningsmåten i TEs tilbud (NS 8407 § 34.2.2).';
const SPESIFISERING_JA =
  'Byggherren gjør ikke gjeldende at kravet om fristforlengelse ble spesifisert for sent (NS 8407 § 33.6.1).';

const svar = (
  spor: string,
  gjelder: string,
  vurderinger: Data,
  resultat: Data = {},
  utdypning: string | null = BEGRUNNELSE
) => ({
  spor,
  gjelder,
  regelversjon: KJERNE.regler.versjon,
  vurderinger,
  resultat,
  ...(utdypning === null ? {} : { utdypning }),
});

const VEDERLAG_DELVIS = [
  { hovedkrav_vurdering: 'delvis', hovedkrav_godkjent_belop: 100000, aksepterer_metode: true },
  { resultat: 'delvis_godkjent', godkjent_beloep: 100000 },
] as const;

const FRIST_FULLT = [
  { frist_varsel_ok: true, spesifisert_krav_ok: true, vilkar_oppfylt: true, dager: 20 },
  { resultat: 'godkjent', godkjent_dager: 20 },
] as const;

describe('de faste tekstene står ordrett (KA-U22, KA-U25, LV-U4 punkt 13)', () => {
  it('trekk av grunnlaget', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'trekk', spor: 'grunnlag' });
    expect(laast(rad)).toEqual([
      `TE trekker sitt krav ${I_SAKEN}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`,
    ]);
  });

  it('trekk av vederlaget identifiserer den gjeldende kravversjonen', () => {
    const s = sakMedKrav();
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep: 150000 } });
    const rad = s.send('TE', { type: 'trekk', spor: 'vederlag' });
    // Den gjeldende kravversjonen er den i brev 5, ikke den første i brev 3.
    expect(tekst(rad)).toEqual([
      {
        gjelder: (rad.data.utsagn as Data[])[0].id,
        laast: `TE trekker kravet om justering av vederlaget ${I_SAKEN}, fremsatt i brev 5 av 5. oktober 2026 (${KR('150 000')}). Trekket er avkall på dette kravet, også det byggherren har godkjent.`,
      },
    ]);
  });

  it('trekk av fristen', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'trekk', spor: 'frist' });
    expect(laast(rad)).toEqual([
      `TE trekker kravet om fristforlengelse ${I_SAKEN}, fremsatt i brev 4 av 4. oktober 2026 (20 dager). Trekket er avkall på dette kravet, også det byggherren har godkjent.`,
    ]);
  });

  it('«ingen krav» i vederlaget sier også at forseringsvederlaget ikke omfattes (KA-U25)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const rad = s.send('TE', { type: 'ingen_krav', spor: 'vederlag' });
    expect(laast(rad)).toEqual([
      `TE krever ikke justering av vederlaget som følge av forholdet ${I_SAKEN}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag. Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.`,
    ]);
  });

  it('«ingen krav» i fristen har ikke setningen om forsering', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const rad = s.send('TE', { type: 'ingen_krav', spor: 'frist' });
    expect(laast(rad)).toEqual([
      `TE krever ikke fristforlengelse som følge av forholdet ${I_SAKEN}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`,
    ]);
  });
});

describe('kravene (LV-U4 punkt 1–3, GR-U16)', () => {
  const grunnlag = (innhold: Data, utdypning?: string) => {
    const s = sak();
    return s.send('TE', {
      type: 'krav',
      spor: 'grunnlag',
      innhold,
      ...(utdypning ? { utdypning } : {}),
    });
  };

  it('en endring der § 32.2 gjelder, med varselet', () => {
    const rad = grunnlag(GRUNNLAGSKRAV.innhold, BESKRIVELSE);
    expect(tekst(rad)).toEqual([
      {
        gjelder: (rad.data.krav as Data[])[0].id,
        laast: `TE krever endringsordre for forholdet «Ny peling» ${I_SAKEN}. Grunnlaget er irregulær endring i form av pålegg (NS 8407 § 32.1). TE varsler etter NS 8407 § 32.2 at TE påberoper seg at pålegget innebærer en endring. ${MOTTATT_TEKST}`,
        // A8: TEs beskrivelse er kravets utdypning og står bare der, ikke i kravet.
        utdypning: BESKRIVELSE,
      },
    ]);
    expect((rad.data.krav as Data[])[0]).not.toHaveProperty('beskrivelse');
  });

  it('uten tittel', () => {
    const rad = grunnlag(
      { hovedkategori: 'endring', underkategori: 'samordning', ...MOTTATT },
      BESKRIVELSE
    );
    expect(laast(rad)[0]).toMatch(
      new RegExp(
        `^TE krever endringsordre for forholdet ${esc(I_SAKEN)}\\. Grunnlaget er samordning \\(NS 8407 § 21\\.4\\)\\.`
      )
    );
  });

  it('underkategorien endringsordre identifiserer endringsordren og varsler ikke etter § 32.2', () => {
    const rad = grunnlag({
      hovedkategori: 'endring',
      underkategori: 'endringsordre',
      tittel: 'Ny peling',
      endringsordre: 'EO 12 av 1. oktober 2026',
    });
    expect(laast(rad)).toEqual([
      `TE gjør gjeldende krav som følge av en endringsordre fra byggherren for forholdet «Ny peling» ${I_SAKEN} (NS 8407 § 31.3). TE viser til endringsordren «EO 12 av 1. oktober 2026».`,
    ]);
  });

  it('et registrert krav i underkategorien endringsordre uten endringsordrens dato eller nummer er ikke forstått (GR-U16)', () => {
    const s = sak();
    const krav = (innhold: Data) =>
      lesJournal(
        [
          ...s.journal,
          {
            ...s.journal[0],
            event_id: randomUUID(),
            event_type: 'dokument_registrert',
            versjon: 2,
            data: {
              krav: [{ id: randomUUID(), spor: 'grunnlag', hovedkategori: 'endring', ...innhold }],
              opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-01' }],
            },
          },
        ],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(krav({ underkategori: 'endringsordre' })).toBe('ukjent');
    expect(krav({ underkategori: 'endringsordre', endringsordre: 'EO 12' })).toBe('dokument');
  });

  it('svikt viser til § 33.1 b og § 34.1.2', () => {
    const rad = grunnlag({
      hovedkategori: 'svikt',
      underkategori: 'grunnforhold',
      tittel: 'Leire',
      ...KLAR_OVER,
    });
    expect(laast(rad)).toEqual([
      `TE gjør gjeldende krav som følge av uforutsette grunnforhold (NS 8407 § 23.1, jf. § 33.1 b og § 34.1.2) for forholdet «Leire» ${I_SAKEN}. ${KLAR_OVER_TEKST}`,
    ]);
  });

  it('annet forhold etter § 33.1 c nevner ikke bestemmelsen to ganger', () => {
    const rad = grunnlag({
      hovedkategori: 'andre_forhold',
      underkategori: 'annet_forhold',
      ...KLAR_OVER,
    });
    expect(laast(rad)).toEqual([
      `TE gjør gjeldende krav som følge av annet forhold (NS 8407 § 33.1 c og § 34.1.2) for forholdet ${I_SAKEN}. ${KLAR_OVER_TEKST}`,
    ]);
  });

  it('vederlaget er et tilbud uten merverdiavgift, og fristkravet har datoen for varselet og brevet med det (OV-U5)', () => {
    const s = sakMedKrav();
    const [, , v, f] = s.journal;
    expect(laast(v)).toEqual([
      `TE krever justering av vederlaget med ${KR('125 000')} Kravet er et tilbud etter NS 8407 § 34.2.1.`,
    ]);
    expect(tekst(f)).toEqual([
      {
        gjelder: s.krav('frist'),
        laast: 'TE krever fristforlengelse på 20 dager (NS 8407 § 33.6.1).',
        utdypning: FRISTKRAV.utdypning,
      },
      expect.objectContaining({
        laast:
          'TE opplyser at varsel om fristforlengelse etter NS 8407 § 33.4 ble sendt 28. september 2026.',
      }),
      { gjelder: f.event_id, laast: `Brevet har vedlegg: «${VARSELBREVET}.pdf».` },
    ]);
    expect(f.data.dokumentasjon).toEqual([expect.objectContaining({ vedlegg_id: VARSELBREVET })]);
    expect(s.journal.flatMap(utenAvsnitt)).toEqual([]);
  });

  it('en ny kravversjon viser til den den erstatter', () => {
    const s = sakMedKrav();
    const utenVarsel = utenFelt(FRISTKRAV, 'varsel');
    const rad = s.send('TE', { ...utenVarsel, innhold: { dager: 30 } });
    expect(laast(rad)).toEqual([
      'TE krever fristforlengelse på 30 dager (NS 8407 § 33.6.1). Kravet erstatter TEs krav i brev 4 av 4. oktober 2026.',
    ]);
  });
});

/**
 * VS-U26: datoen varslingsplikten løper fra står i brevteksten som TEs opplysning.
 * At en dato etter brevets dato avvises, og at en ny kravversjon kan rette den, er
 * arbeidsvalg 1 og 2 i #664. Ingen av dem vurderer rettidigheten.
 */
describe('datoen varslingsplikten løper fra (VS-U26)', () => {
  it('en dato etter brevets dato avvises; samme dag godtas (arbeidsvalg 1 i #664)', () => {
    const s = sak();
    // Det første brevet i `sak()` er datert 2. oktober 2026.
    const med = (dato: string) => ({
      ...GRUNNLAGSKRAV,
      innhold: { ...GRUNNLAGSKRAV.innhold, paalegg_mottatt: dato },
    });
    expect(s.avvisning('TE', med('2026-10-03'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding:
        'TE har oppgitt at pålegget ble mottatt 3. oktober 2026, etter brevets dato 2. oktober 2026.',
    });
    expect(s.avvist('TE', med('2026-10-02'))).toBeNull();
    const svikt = {
      type: 'krav',
      spor: 'grunnlag',
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'grunnforhold',
        klar_over_forholdet: '2026-10-03',
      },
    };
    expect(s.avvisning('TE', svikt)?.melding).toBe(
      'TE har oppgitt at TE ble klar over forholdet 3. oktober 2026, etter brevets dato 2. oktober 2026.'
    );
  });

  it('en dato for varselet etter § 33.4 etter brevets dato avvises, i registreringen og i fristkravet; samme dag godtas (#968, arbeidsvalg 1 i #664)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    // Brevet er datert 3. oktober 2026.
    const varsel = (sendt: string) => ({
      type: 'varsel',
      spor: 'frist',
      hjemmel: '33.4',
      sendt,
      dokumentasjon: [VARSELBREVET],
    });
    const krav = (sendt: string) => ({ ...FRISTKRAV, varsel: { ...FRISTKRAV.varsel, sendt } });
    const melding =
      'TE har oppgitt at varselet etter § 33.4 ble sendt 4. oktober 2026, etter brevets dato 3. oktober 2026.';
    expect(s.avvisning('TE', varsel('2026-10-04'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding,
    });
    expect(s.avvisning('TE', krav('2026-10-04'))).toEqual({ regel: 'DATO_ETTER_BREVET', melding });
    expect(s.avvist('TE', varsel('2026-10-03')), 'kontrollsak').toBeNull();
    expect(s.avvist('TE', krav('2026-10-03')), 'kontrollsak').toBeNull();
  });

  it('en oppgitt dato med klokkeslett samme dag som brevet godtas, og dagen etter avvises (#474)', () => {
    const med = (dato: string) =>
      oppgittDatoEtterBrevet(
        {
          ...GRUNNLAGSKRAV,
          innhold: { ...GRUNNLAGSKRAV.innhold, paalegg_mottatt: dato },
        } as Kommando,
        '2026-10-02'
      )?.regel ?? null;
    expect(med('2026-10-02T15:00:00Z')).toBeNull();
    expect(med('2026-10-03T08:00:00Z'), 'kontrollsak').toBe('DATO_ETTER_BREVET');
  });

  it('brevets dato er datoen i norsk tid, ikke i UTC (VS-U8)', () => {
    const s = sak();
    // 15. oktober kl. 22.30 UTC er 16. oktober kl. 00.30 i Oslo.
    const kontekst = {
      sakId: s.journal[0].sak_id,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      tidspunkt: () => new Date('2026-10-15T22:30:00Z'),
      nyId: randomUUID,
    };
    const med = (dato: string) => ({
      ...utenFelt(GRUNNLAGSKRAV, 'utdypning'),
      innhold: { ...GRUNNLAGSKRAV.innhold, paalegg_mottatt: dato },
    });
    const regel = (dato: string) => {
      const u = forhaandsvis(med(dato), kontekst, s.journal, KJERNE);
      return u.godtatt ? null : u.avvisning.regel;
    };
    expect(regel('2026-10-16')).toBeNull();
    expect(regel('2026-10-17')).toBe('DATO_ETTER_BREVET');
  });

  it('en ny kravversjon kan rette datoen, og brevet sier den nye (arbeidsvalg 2 i #664, GR-U22)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const rad = s.send('TE', {
      ...GRUNNLAGSKRAV,
      innhold: { ...GRUNNLAGSKRAV.innhold, paalegg_mottatt: '2026-09-20' },
    });
    expect(laast(rad)[0]).toContain('TE opplyser at pålegget ble mottatt 20. september 2026.');
    expect(laast(rad)[0]).not.toContain('25. september 2026');
  });

  it('underkategorien endringsordre har ingen dato i brevet (VS-U26)', () => {
    const s = sak();
    const rad = s.send('TE', {
      type: 'krav',
      spor: 'grunnlag',
      innhold: { hovedkategori: 'endring', underkategori: 'endringsordre', endringsordre: 'EO 12' },
    });
    expect(laast(rad)[0]).not.toContain('TE opplyser');
  });
});

describe('kravet til begrunnelse og beskrivelse (KA-U24, KA-U31–KA-U33, GR-U15)', () => {
  it('TEs varsel etter § 32.2 uten beskrivelse av pålegget avvises (GR-U15)', () => {
    const s = sak();
    const uten = utenFelt(GRUNNLAGSKRAV, 'utdypning');
    expect(s.avvist('TE', uten)).toBe('BESKRIVELSE_MANGLER');
    expect(s.avvist('TE', GRUNNLAGSKRAV)).toBeNull();
  });

  it('en beskrivelse eller begrunnelse med bare mellomrom teller ikke (GR-U15, KA-U33)', () => {
    const s = sak();
    expect(s.avvist('TE', { ...GRUNNLAGSKRAV, utdypning: ' \n ' })).toBe('BESKRIVELSE_MANGLER');
    s.send('TE', GRUNNLAGSKRAV);
    expect(s.avvist('TE', { ...FRISTKRAV, utdypning: '  ' })).toBe('BEGRUNNELSE_MANGLER');
  });

  it('forhåndsvisningen gir den låste teksten før begrunnelsen er skrevet (A1)', () => {
    const s = sakMedKrav();
    const avslag = {
      type: 'brev',
      svar: [
        svar(
          'grunnlag',
          s.krav('grunnlag'),
          { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
          {},
          null
        ),
      ],
    };
    expect(s.vis('BH', avslag)).toHaveLength(1);
    expect(s.avvist('BH', avslag)).toBe('BEGRUNNELSE_MANGLER');
  });

  it('kontrollsak: et grunnlagskrav der § 32.2 ikke gjelder, trenger ingen beskrivelse', () => {
    const s = sak();
    expect(
      s.avvist('TE', {
        type: 'krav',
        spor: 'grunnlag',
        innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
      })
    ).toBeNull();
  });

  it('et fristkrav uten begrunnelse avvises (§ 33.6.1, KA-U33)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const uten = utenFelt(FRISTKRAV, 'utdypning');
    expect(s.avvist('TE', uten)).toBe('BEGRUNNELSE_MANGLER');
    expect(s.avvist('TE', FRISTKRAV)).toBeNull();
  });

  it('vederlagskravet trenger ingen utdypning, men kan ha en (A7)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const vederlag = { type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep: 1 } };
    expect(s.avvist('TE', vederlag)).toBeNull();
    const rad = s.send('TE', { ...vederlag, utdypning: 'Kalkylen er vedlagt.' });
    expect(tekst(rad)[0].utdypning).toBe('Kalkylen er vedlagt.');
  });

  const brev = (...svar: Data[]) => ({ type: 'brev', svar });

  it.each([
    [
      'påberopt preklusjon etter § 32.2 (KA-U21)',
      'grunnlag',
      { resultat: 'godkjent', grunnlag_varslet_i_tide: false },
      {},
    ],
    [
      'avslag av grunnlaget',
      'grunnlag',
      { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
      {},
    ],
    [
      'frafall etter § 32.3 c (KA-U32)',
      'grunnlag',
      { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true },
      {},
    ],
    ['et beløp som ikke er godkjent fullt', 'vederlag', VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]],
    [
      'påberopt preklusjon etter § 33.4',
      'frist',
      { ...FRIST_FULLT[0], frist_varsel_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 },
    ],
    [
      'et tilbud som ikke er akseptert (§ 34.2.2)',
      'vederlag',
      {
        hovedkrav_vurdering: 'godkjent',
        hovedkrav_godkjent_belop: 125000,
        aksepterer_metode: false,
        oensket_metode: 'regningsarbeid',
      },
      { resultat: 'delvis_godkjent', godkjent_beloep: 125000 },
    ],
    [
      'påberopt spesifisering for sent etter § 33.6.1',
      'frist',
      { ...FRIST_FULLT[0], spesifisert_krav_ok: false, dager_maatte_forstaa: 20 },
      { resultat: 'godkjent', godkjent_dager: 20 },
    ],
    [
      '«ingen hindring» (VS-U13)',
      'frist',
      { ...FRIST_FULLT[0], vilkar_oppfylt: false },
      { resultat: 'avslaatt', godkjent_dager: 0 },
    ],
    [
      'dager som ikke er godkjent fullt',
      'frist',
      { ...FRIST_FULLT[0], dager: 10 },
      { resultat: 'delvis_godkjent', godkjent_dager: 10 },
    ],
  ] as [string, 'grunnlag', Data, Data][])(
    'et svar med %s må ha en begrunnelse',
    (_n, spor, vurderinger, resultat) => {
      const s = sakMedKrav();
      const uten = brev(svar(spor, s.krav(spor), vurderinger, resultat, null));
      expect(s.avvist('BH', uten)).toBe('BEGRUNNELSE_MANGLER');
      expect(s.avvist('BH', brev(svar(spor, s.krav(spor), vurderinger, resultat)))).toBeNull();
    }
  );

  it.each([
    [
      'grunnlaget godkjent',
      'grunnlag',
      { resultat: 'godkjent', grunnlag_varslet_i_tide: true },
      {},
    ],
    [
      'hele beløpet godkjent',
      'vederlag',
      {
        hovedkrav_vurdering: 'godkjent',
        hovedkrav_godkjent_belop: 125000,
        aksepterer_metode: true,
      },
      { resultat: 'godkjent', godkjent_beloep: 125000 },
    ],
    ['alle dagene godkjent', 'frist', FRIST_FULLT[0], FRIST_FULLT[1]],
  ] as [string, 'grunnlag', Data, Data][])(
    'kontrollsak: et svar med %s trenger ingen begrunnelse',
    (_n, spor, vurderinger, resultat) => {
      const s = sakMedKrav();
      expect(
        s.avvist('BH', brev(svar(spor, s.krav(spor), vurderinger, resultat, null)))
      ).toBeNull();
    }
  );

  it('et svar som bare er subsidiært fordi grunnlaget er avslått, trenger ingen egen begrunnelse (KA-U24)', () => {
    const s = sakMedKrav();
    s.send(
      'BH',
      brev(
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        })
      )
    );
    expect(s.u().spor.frist.subsidiaer, 'forutsetning: fristen er subsidiær').toEqual(['avslaatt']);
    expect(
      s.avvist('BH', brev(svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1], null)))
    ).toBeNull();
  });
});

describe('svaret (LV-U4 punkt 4 og 5, GR-U14)', () => {
  /** Grunnlaget er svikt (§ 34.1.2), vederlaget 125 000 kr (brev 3). */
  const sviktMedVederlag = () => {
    const s = sak();
    s.send('TE', {
      ...GRUNNLAGSKRAV,
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'medvirkning',
        tittel: 'Sene tegninger',
        ...KLAR_OVER,
      },
    });
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep: 125000 } });
    return s;
  };
  const vederlagssvar = (iTide: boolean) => {
    const s = sviktMedVederlag();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: iTide },
          iTide ? VEDERLAG_DELVIS[1] : { resultat: 'avslaatt', godkjent_beloep: 0 }
        ),
      ],
    });
    return laast(rad)[1];
  };

  it('§ 34.1.2 «nei»: byggherren påberoper prinsipalt at varselet kom for sent, og beløpet står subsidiært (VS-U3, B-13)', () => {
    // HF-U1: teksten viser til brevet varselet etter § 34.1.2 står i (oppdragsgiver 17.10, #497).
    expect(vederlagssvar(false)).toBe(
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Prinsipalt: byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev 3 av 3. oktober 2026 kom for sent. ${METODE_JA} Subsidiært: byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
    );
  });

  it('§ 34.2.2 «nei» sammen med preklusjon etter § 34.1.2 er ikke en egen subsidiær grunn, og står ved siden av beløpet (arbeidsvalget i #479)', () => {
    const s = sviktMedVederlag();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            ...VEDERLAG_DELVIS[0],
            hovedkrav_varslet_i_tide: false,
            aksepterer_metode: false,
            oensket_metode: 'regningsarbeid',
          },
          { resultat: 'avslaatt', godkjent_beloep: 0 }
        ),
      ],
    });
    // HF-U1: teksten viser til brevet varselet etter § 34.1.2 står i (oppdragsgiver 17.10, #497).
    expect(laast(rad)[1]).toBe(
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Prinsipalt: byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev 3 av 3. oktober 2026 kom for sent. Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres som regningsarbeid (NS 8407 § 34.4). Subsidiært: byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
    );
  });

  it('§ 34.2.2 «nei» med hele beløpet godkjent: brevet sier at beløpet er godkjent, og linjen at tilbudet ikke er akseptert (arbeidsvalget i #479)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'godkjent',
            hovedkrav_godkjent_belop: 125000,
            aksepterer_metode: false,
            oensket_metode: 'enhetspriser',
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 125000 }
        ),
      ],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres etter enhetspriser (NS 8407 § 34.3). Byggherren godkjenner ${KR('125 000')}`,
    ]);
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.sammenfall).toBe(false);
    expect(b.linje).toBe(
      'Byggherrens standpunkt: godkjent med 125\u00a0000\u00a0kr, tilbudet ikke akseptert (§ 34.2.2).'
    );
  });

  it('§ 34.2.2 «nei» med beløpet godkjent til nærmeste krone: brevet sier at hele beløpet er godkjent, som utregningen (B-13, arbeidsvalget i #479)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'delvis',
            hovedkrav_godkjent_belop: 124999.6,
            aksepterer_metode: false,
            oensket_metode: 'enhetspriser',
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 124999.6 }
        ),
      ],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres etter enhetspriser (NS 8407 § 34.3). Byggherren godkjenner ${KR('124 999,60')}`,
    ]);
  });

  it('et godkjent beløp som ikke er et tall, avvises som en ugyldig vurdering, ikke som en feil på serveren (#550)', () => {
    const s = sakMedKrav();
    const brev = (beloep: unknown) => ({
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], hovedkrav_godkjent_belop: beloep },
          VEDERLAG_DELVIS[1]
        ),
      ],
    });
    expect(s.avvist('BH', brev(100000)), 'kontrollsak').toBeNull();
    expect(() => s.avvisning('BH', brev('abc'))).not.toThrow();
    expect(s.avvisning('BH', brev('abc'))).toEqual({
      regel: 'UGYLDIG_VURDERING',
      melding: 'Vurderingene kan ikke regnes ut: ikke et tall: abc.',
    });
  });

  it('et ugyldig beløp i det lagrede kravet gjør saken ikke forstått, og meldes ikke som byggherrens ugyldige vurdering (#766)', () => {
    const s = sakMedKrav();
    const brev = {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    };
    expect(s.avvist('BH', brev), 'kontrollsak').toBeNull();
    const lagret = s.journal
      .flatMap((r) => ((r.data as { krav?: Data[] }).krav ?? []) as Data[])
      .find((k) => k.id === s.krav('vederlag'))!;
    expect(lagret.beloep, 'forutsetning').toBe(125000);
    lagret.beloep = 'abc';
    // Leseren tolker ikke kravet, så saken er ikke forstått før svaret regnes ut (MM-U2).
    expect(s.avvist('BH', brev)).toBe('SAK_IKKE_FORSTAATT');
  });

  it('§ 34.2.2 «nei»: byggherren aksepterer ikke tilbudet og oppgir metoden, som standpunkt og ikke som appens avgjørelse (arbeidsvalget i #479)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], aksepterer_metode: false, oensket_metode: 'enhetspriser' },
          VEDERLAG_DELVIS[1]
        ),
      ],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres etter enhetspriser (NS 8407 § 34.3). Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`,
    ]);
  });

  it('§ 33.6.1 «nei»: dagene byggherren måtte forstå at TE hadde krav på, står prinsipalt, og de vurderte dagene subsidiært (VS-U4)', () => {
    const s = sakMedKrav();
    const kommando = {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], spesifisert_krav_ok: false, dager_maatte_forstaa: 5, dager: 15 },
          // B-13: resultatet regnes av de prinsipale dagene (VS-U4).
          { resultat: 'delvis_godkjent', godkjent_dager: 5 }
        ),
      ],
    };
    expect(s.avvist('BH', kommando)).toBeNull();
    const rad = s.send('BH', kommando);
    expect(laast(rad)).toEqual([
      'Byggherrens svar på kravet om fristforlengelse i TEs krav i brev 4 av 4. oktober 2026: Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 4. oktober 2026 kom for sent. Byggherren legger til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1). Prinsipalt: byggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at TE bare har krav på den fristforlengelsen byggherren måtte forstå at TE hadde krav på, 5 dager (NS 8407 § 33.6.1). Subsidiært: byggherren godkjenner 15 dager av de krevde 20 dager.',
    ]);
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt godkjent med 5 dager (§ 33.6.1), subsidiært godkjent med 15 dager.'
    );
  });

  it('§ 34.1.2 «nei» med hele beløpet godkjent subsidiært må ha en begrunnelse (KA-U24)', () => {
    const s = sviktMedVederlag();
    const brevet = (utdypning: string | null) => ({
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), { resultat: 'godkjent' }, {}, null),
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'godkjent',
            hovedkrav_godkjent_belop: 125000,
            aksepterer_metode: true,
            hovedkrav_varslet_i_tide: false,
          },
          { resultat: 'avslaatt', godkjent_beloep: 0 },
          utdypning
        ),
      ],
    });
    expect(s.avvist('BH', brevet(null))).toBe('BEGRUNNELSE_MANGLER');
    expect(s.avvist('BH', brevet(BEGRUNNELSE))).toBeNull();
  });

  it('§ 34.1.2 «ja»: byggherrens standpunkt står i brevet, uten å ordnes (KA-U4, LV-U3)', () => {
    // HF-U1: teksten viser til brevet varselet etter § 34.1.2 står i (oppdragsgiver 17.10, #497).
    expect(vederlagssvar(true)).toBe(
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Byggherren gjør ikke gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev 3 av 3. oktober 2026 kom for sent. ${METODE_JA} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
    );
  });

  it('§ 34.2.2 «nei» med beløpet godkjent til nærmeste krone krever en begrunnelse for tilbudet, ikke for beløpet (B-13, arbeidsvalget 15.10 i #490)', () => {
    const s = sakMedKrav();
    const brevet = (godkjent: number) => ({
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'delvis',
            hovedkrav_godkjent_belop: godkjent,
            aksepterer_metode: false,
            oensket_metode: 'enhetspriser',
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: godkjent },
          null
        ),
      ],
    });
    expect(s.avvisning('BH', brevet(124999.6))?.melding).toBe(
      'Svaret må ha en begrunnelse, fordi det har et tilbud som ikke er akseptert (§ 34.2.2) (KA-U24, KA-U31).'
    );
    // Kontrollsak: et beløp som ikke er godkjent fullt, til nærmeste krone, krever sin egen begrunnelse.
    expect(s.avvisning('BH', brevet(124999.4))?.melding).toBe(
      'Svaret må ha en begrunnelse, fordi det har et tilbud som ikke er akseptert (§ 34.2.2), et beløp som ikke er godkjent fullt (KA-U24, KA-U31).'
    );
  });

  it('avslag på et krav under 0,50 kr krever en begrunnelse for beløpet, selv om begge rundes til 0 kr (B-13, KA-U24)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep: 0.4 } });
    const brevet = {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          { hovedkrav_vurdering: 'avslatt', aksepterer_metode: true },
          { resultat: 'avslaatt', godkjent_beloep: 0 },
          null
        ),
      ],
    };
    expect(s.avvisning('BH', brevet)?.melding).toBe(
      'Svaret må ha en begrunnelse, fordi det har et beløp som ikke er godkjent fullt (KA-U24, KA-U31).'
    );
  });

  it('linjen ordner byggherrens standpunkter prinsipalt, subsidiært og videre subsidiært, som brevteksten (HF-U2, VS-U3, arbeidsvalget 15.10 i #492)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          {
            frist_varsel_ok: false,
            spesifisert_krav_ok: false,
            dager_maatte_forstaa: 5,
            vilkar_oppfylt: false,
            dager: 10,
          },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt prekludert (§ 33.4), subsidiært avslått: fremdriften er ikke hindret som følge av forholdet (§ 33.1), videre subsidiært godkjent med 5 dager (§ 33.6.1), videre subsidiært godkjent med 10 dager.'
    );
  });

  it('innledningen nevner sporet, og standpunktene ordnes slik brevet ordner dem', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: false,
        }),
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: false, spesifisert_krav_ok: true, vilkar_oppfylt: false, dager: 10 },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const [g, f] = laast(rad);
    expect(g).toBe(
      'Byggherrens svar på grunnlaget i TEs krav i brev 2 av 2. oktober 2026: Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent. Subsidiært: byggherren godkjenner grunnlaget.'
    );
    // A2: fristen er subsidiær fordi grunnlaget er prekludert i samme brev.
    expect(f).toBe(
      `Byggherrens svar på kravet om fristforlengelse i TEs krav i brev 4 av 4. oktober 2026: Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent (se svaret på grunnlaget). Subsidiært: byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 4. oktober 2026 kom for sent. Videre subsidiært: byggherren legger ikke til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1). ${SPESIFISERING_JA} Videre subsidiært: byggherren godkjenner 10 dager av de krevde 20 dager.`
    );
  });

  it('et standpunkt appen regner som uten virkning, står som byggherren sa det', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(
      b.uten_virkning,
      'forutsetning: appen regner tre standpunkter som uten virkning'
    ).toHaveLength(3);
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om fristforlengelse i TEs krav i brev 4 av 4. oktober 2026: Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 4. oktober 2026 kom for sent. Byggherren legger til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1). ${SPESIFISERING_JA} Byggherren godkjenner 20 dager.`,
    ]);
  });

  it('beløpet i et delvis godkjent vederlag står med det krevde, uten merverdiavgift', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: ${METODE_JA} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`,
    ]);
  });

  it('avslaget der § 32.2 gjelder, er et avslag av kravet på endringsordre (§ 32.3 b)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toBe(
      'Byggherrens svar på grunnlaget i TEs krav i brev 2 av 2. oktober 2026: Byggherren gjør ikke gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent. Byggherren avslår kravet på endringsordre (NS 8407 § 32.3 første ledd b).'
    );
  });

  it('kontrollsak: avslaget der § 32.2 ikke gjelder, avslår grunnlaget', () => {
    const s = sak();
    s.send('TE', {
      type: 'krav',
      spor: 'grunnlag',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('grunnlag', s.krav('grunnlag'), { resultat: 'avslaatt' })],
    });
    expect(laast(rad)[0]).toBe(
      'Byggherrens svar på grunnlaget i TEs krav i brev 2 av 2. oktober 2026: Byggherren avslår grunnlaget.'
    );
  });

  it('frafallet lover endringsordre for allerede utført arbeid (§ 32.3 c, LV-U4 5.5b)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'paalegg_frafalt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toContain(
      'Byggherren frafaller pålegget mot å utstede endringsordre for allerede utført arbeid (NS 8407 § 32.3 første ledd c).'
    );
  });

  it('en revisjon viser til svaret den erstatter (HF-U1)', () => {
    const s = sakMedKrav();
    const dager = (n: number) =>
      svar(
        'frist',
        s.krav('frist'),
        { ...FRIST_FULLT[0], dager: n },
        { resultat: 'delvis_godkjent', godkjent_dager: n }
      );
    s.send('BH', { type: 'brev', svar: [dager(10)] });
    const rad = s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.frist.gjeldendeSvar!.id,
      svar: dager(15),
    });
    expect(laast(rad)[0]).toMatch(
      /Byggherren godkjenner 15 dager av de krevde 20 dager\. Svaret erstatter byggherrens svar i brev 5 av 5\. oktober 2026\.$/
    );
  });

  it('godkjenningen som er en endringsordre, krever endringen og siterer TEs beskrivelse (GR-U14)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toBe(
      `Byggherrens svar på grunnlaget i TEs krav i brev 2 av 2. oktober 2026: Byggherren gjør ikke gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent. Byggherren godkjenner grunnlaget. Svaret er en endringsordre etter NS 8407 § 32.3 første ledd a, jf. § 31.3: byggherren krever at endringen utføres slik pålegget er beskrevet i TEs krav i brev 2 av 2. oktober 2026: «${BESKRIVELSE}».`
    );
  });

  it('brevet viser til kravversjonen svaret gjelder, også etter en ny kravversjon (GR-U14)', () => {
    const s = sakMedKrav();
    s.send('TE', { ...GRUNNLAGSKRAV, utdypning: 'Ny beskrivelse.' });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toMatch(
      /beskrevet i TEs krav i brev 5 av 5\. oktober 2026: «Ny beskrivelse\.»\.$/
    );
  });

  it('et registrert krav er dokumentasjon, så byggherren kan ikke godkjenne det fra appen (OV-U4)', () => {
    const s = sak();
    const id = randomUUID();
    s.rad('TE', {
      krav: [
        { id, spor: 'grunnlag', hovedkategori: 'endring', underkategori: 'irregulaer_endring' },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
    });
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.grunnlag.gjeldendeKrav, 'kravet er ikke gjeldende krav (OV-U4)').toBeNull();
    const godkjent = {
      type: 'brev',
      svar: [svar('grunnlag', id, { resultat: 'godkjent', grunnlag_varslet_i_tide: true })],
    };
    expect(s.avvist('BH', godkjent), 'kravet i brevet er ikke et krav (OV-U4)').toBe('INGEN_KRAV');
  });

  it('et krav fra appen uten beskrivelse gir ingen godkjenning som endringsordre (GR-U14)', () => {
    const s = sak();
    // Et krav fra en annen skriver uten brevtekst, som en eldre TS-versjon.
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'grunnlag',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
    });
    const godkjent = (iTide: boolean) => ({
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: iTide,
        }),
      ],
    });
    expect(s.avvist('BH', godkjent(true))).toBe('PAALEGGET_IKKE_BESKREVET');
    // Kontrollsak: med påberopt preklusjon er svaret ikke en endringsordre.
    expect(s.avvist('BH', godkjent(false))).toBeNull();
  });
});

describe('svaret på vederlag og frist når grunnlaget er avslått eller prekludert (A2, B-13 05.10)', () => {
  const vederlag = (s: ReturnType<typeof sak>) =>
    svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]);
  const grunnlag = (s: ReturnType<typeof sak>, resultat: string, iTide: boolean) =>
    svar('grunnlag', s.krav('grunnlag'), { resultat, grunnlag_varslet_i_tide: iTide });
  const delvis = `byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`;
  const innledning =
    'Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026:';

  it.each([
    [
      'avslått i samme brev',
      'avslaatt',
      true,
      `Prinsipalt: byggherren avslår grunnlaget (se svaret på grunnlaget). ${METODE_JA} Subsidiært: ${delvis}`,
    ],
    [
      'prekludert og godkjent subsidiært i samme brev',
      'godkjent',
      false,
      `Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent (se svaret på grunnlaget). ${METODE_JA} Subsidiært: ${delvis}`,
    ],
    [
      'prekludert og avslått subsidiært i samme brev',
      'avslaatt',
      false,
      `Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent. Subsidiært: byggherren avslår grunnlaget (se svaret på grunnlaget). ${METODE_JA} Videre subsidiært: ${delvis}`,
    ],
  ])('grunnlaget %s', (_n, resultat, iTide, forventet) => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [grunnlag(s, resultat, iTide), vederlag(s)] });
    expect(laast(rad)[1]).toBe(`${innledning} ${forventet}`);
  });

  it.each([
    [
      'avslått i et tidligere brev',
      'avslaatt',
      true,
      `Prinsipalt: byggherren har avslått grunnlaget i brev 5 av 5. oktober 2026. ${METODE_JA} Subsidiært: ${delvis}`,
    ],
    [
      'prekludert og godkjent subsidiært i et tidligere brev',
      'godkjent',
      false,
      `Prinsipalt: byggherren har gjort gjeldende i brev 5 av 5. oktober 2026 at TEs varsel etter NS 8407 § 32.2 kom for sent. ${METODE_JA} Subsidiært: ${delvis}`,
    ],
    [
      'prekludert og avslått subsidiært i et tidligere brev',
      'avslaatt',
      false,
      `Prinsipalt: byggherren har gjort gjeldende i brev 5 av 5. oktober 2026 at TEs varsel etter NS 8407 § 32.2 kom for sent. Subsidiært: byggherren har avslått grunnlaget i samme brev. ${METODE_JA} Videre subsidiært: ${delvis}`,
    ],
  ])('grunnlaget %s', (_n, resultat, iTide, forventet) => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [grunnlag(s, resultat, iTide)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)[0]).toBe(`${innledning} ${forventet}`);
  });

  it('standpunktet om at varselet etter § 33.4 kom i tide, nevner hjemmelen etter § 32.2-preklusjonen (LV-U5)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [grunnlag(s, 'godkjent', false)] });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om fristforlengelse i TEs krav i brev 4 av 4. oktober 2026: Prinsipalt: byggherren har gjort gjeldende i brev 5 av 5. oktober 2026 at TEs varsel etter NS 8407 § 32.2 kom for sent. Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 4. oktober 2026 kom for sent. Byggherren legger til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1). ${SPESIFISERING_JA} Subsidiært: byggherren godkjenner 20 dager.`,
    ]);
  });

  it('kontrollsak: grunnlaget godkjent gir ingen prinsipal grunn fra grunnlaget', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [grunnlag(s, 'godkjent', true)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)[0]).toBe(
      `${innledning} ${METODE_JA} ${delvis[0].toUpperCase()}${delvis.slice(1)}`
    );
  });

  it('teksten fryses som den var, og en senere revisjon av grunnlagssvaret endrer den ikke (MM-U9)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [grunnlag(s, 'avslaatt', true)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    const foer = laast(rad);
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.grunnlag.gjeldendeSvar!.id,
      svar: grunnlag(s, 'godkjent', true),
    });
    const lest = lesJournal(s.journal, KJERNE.leserformat).find((h) => h.id === rad.event_id)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtekst!.map((a) => a.laast)).toEqual(foer);
  });
});

describe('aksepten (LV-U4 punkt 6)', () => {
  it('aksepten viser til svaret og brevet det står i', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    });
    const rad = s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(laast(rad)).toEqual([
      'TE godtar byggherrens svar på kravet om justering av vederlaget i brev 5 av 5. oktober 2026.',
    ]);
  });

  it('når svaret er subsidiært fordi grunnlaget er avslått, sier aksepten at TE ikke er enig i det (GR-U7)', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], dager: 10 },
          { resultat: 'delvis_godkjent', godkjent_dager: 10 }
        ),
      ],
    });
    const rad = s.send('TE', {
      type: 'aksept',
      spor: 'frist',
      svar: s.u().spor.frist.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(laast(rad)).toEqual([
      'TE godtar byggherrens svar på kravet om fristforlengelse i brev 5 av 5. oktober 2026. TE er enig i antallet dager, men ikke i byggherrens standpunkt til grunnlaget.',
    ]);
  });
  it('godkjenner byggherren grunnlaget etter et subsidiært svar, leser aksepten saken når den sendes (GR-U1, arbeidsvalget om LV-U4 punkt 6)', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
        svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]),
      ],
    });
    const vederlagssvar = s.u().spor.vederlag.gjeldendeSvar!.id;
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.grunnlag.gjeldendeSvar!.id,
      svar: svar('grunnlag', s.krav('grunnlag'), {
        resultat: 'godkjent',
        grunnlag_varslet_i_tide: true,
      }),
    });
    const rad = s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: vederlagssvar,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(laast(rad)).toEqual([
      'TE godtar byggherrens svar på kravet om justering av vederlaget i brev 5 av 5. oktober 2026.',
    ]);
  });
});

describe('innsigelse, protest og passivitet (LV-U4 punkt 7–9, VS-U9, VS-U11)', () => {
  const medInnsigelse = () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('grunnlag') });
    return s;
  };

  it('innsigelsen står i brevet med det den gjelder', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: s.krav('vederlag') });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at TEs krav om justering av vederlaget i brev 3 av 3. oktober 2026 kom for sent (NS 8407 § 5 tredje ledd).',
    ]);
  });

  it('svaret gjentar innsigelsen og viser til den', () => {
    const s = medInnsigelse();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    expect(laast(rad)[0]).toContain(
      'Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent, jf. innsigelsen i brev 5 av 5. oktober 2026.'
    );
  });

  // Arbeidsvalg 1 i #770 (#536): et grunnlagskrav i et registrert brev er dokumentasjon
  // (OV-U4), og en innsigelse mot det er ingen påberopelse etter § 32.2. Kommandoene og
  // brevteksten leser det likt.
  describe('innsigelse mot et registrert grunnlagskrav (#536)', () => {
    const medRegistrertKrav = () => {
      const s = sakMedKrav();
      const registrert = randomUUID();
      s.rad('TE', {
        krav: [
          {
            id: registrert,
            spor: 'grunnlag',
            hovedkategori: 'endring',
            underkategori: 'irregulaer_endring',
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      });
      expect(s.u().forstaatt).toBe(true);
      return { s, registrert };
    };
    const avslag = (s: ReturnType<typeof sak>) => ({
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    const iTide = (s: ReturnType<typeof sak>) => ({
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });

    it('brevteksten gjentar den ikke i svaret, men innsigelsen mot kravet fra appen', () => {
      const { s, registrert } = medRegistrertKrav();
      s.send('BH', { type: 'innsigelse', gjelder: registrert });
      expect(laast(s.send('BH', avslag(s)))[0]).not.toContain('jf. innsigelsen');
      // Kontrollsak: samme forløp med innsigelsen mot grunnlagskravet fra appen.
      const k = medRegistrertKrav().s;
      k.send('BH', { type: 'innsigelse', gjelder: k.krav('grunnlag') });
      expect(laast(k.send('BH', avslag(k)))[0]).toContain('jf. innsigelsen');
    });

    it('kommandoene avviser den ikke etter et «i tide» (HF-U4), men innsigelsen mot kravet fra appen', () => {
      const { s, registrert } = medRegistrertKrav();
      s.send('BH', iTide(s));
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: registrert })).toBeNull();
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('grunnlag') })).toBe(
        'SAGT_I_TIDE'
      );
    });
  });

  it('gir byggherren innsigelsen opp, sier brevet det uttrykkelig (VS-U11)', () => {
    const s = medInnsigelse();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev 5 av 5. oktober 2026 og gjør ikke gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent.'
    );
  });

  it('gir byggherren opp innsigelsen mot fristvarselet, nevner brevet varselet etter § 33.4 (LV-U5)', () => {
    const s = sakMedKrav();
    const varselet = (s.journal.at(-1)!.data.utsagn as Data[]).find((u) => u.art === 'varsel')!;
    s.send('BH', { type: 'innsigelse', gjelder: varselet.id });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad)[0]).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev 5 av 5. oktober 2026 og gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 4. oktober 2026 kom for sent.'
    );
  });

  const girOpp = 'gir opp innsigelsen';

  it('uten eget varsel er en innsigelse mot det første fristkravet ingen påberopelse etter § 33.4, og et «i tide» gir den ikke opp (VS-U24)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.send('TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { dager: 20 },
      utdypning: FRISTKRAV.utdypning,
    });
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad)[0]).toContain(
      'Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 3 av 3. oktober 2026 kom for sent.'
    );
    expect(laast(rad)[0]).not.toContain(girOpp);
  });

  it('et «i tide» om varselet gir ikke opp en innsigelse mot fristkravet (VS-U24)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad)[0]).toContain(
      'Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 4. oktober 2026 kom for sent.'
    );
    expect(laast(rad)[0]).not.toContain(girOpp);
  });

  it('et «i tide» om varselet nevner ikke en innsigelse mot en tidligere kravversjon (VS-U24)', () => {
    const s = sakMedKrav();
    const nyttKrav = (dager: number) => ({
      type: 'krav',
      spor: 'frist',
      innhold: { dager },
      utdypning: FRISTKRAV.utdypning,
    });
    s.send('TE', nyttKrav(25));
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    s.send('TE', nyttKrav(30));
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('frist', s.krav('frist'), FRIST_FULLT[0], {
          resultat: 'delvis_godkjent',
          godkjent_dager: 20,
        }),
      ],
    });
    expect(laast(rad)[0]).not.toContain(girOpp);
  });

  it('et «nei» om varselet viser ikke til en innsigelse mot fristkravet (VS-U24, del 2 av #407)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], frist_varsel_ok: false },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    expect(laast(rad)[0]).toContain(
      'byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 4. oktober 2026 kom for sent.'
    );
    expect(laast(rad)[0]).not.toContain('jf. innsigelsen');
  });

  it('med innsigelser mot både fristkravet og varselet gir et «i tide» opp bare den mot varselet (VS-U11, VS-U24)', () => {
    const s = sakMedKrav();
    const varselet = (s.journal.at(-1)!.data.utsagn as Data[]).find((u) => u.art === 'varsel')!;
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    s.send('BH', { type: 'innsigelse', gjelder: varselet.id });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad)[0]).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev 6 av 6. oktober 2026 og gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 4. oktober 2026 kom for sent.'
    );
  });

  it('et «i tide» i grunnlaget gir ikke opp innsigelsen mot fristvarselet (VS-U9, VS-U11)', () => {
    const s = sakMedKrav();
    const varselet = (s.journal.at(-1)!.data.utsagn as Data[]).find((u) => u.art === 'varsel')!;
    s.send('BH', { type: 'innsigelse', gjelder: varselet.id });
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], frist_varsel_ok: false },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    expect(laast(rad)[0]).toContain('kom for sent, jf. innsigelsen i brev 5 av 5. oktober 2026.');
  });

  describe('varselet etter § 32.2 er det samme i hver grunnlagsversjon (VS-U24, arbeidsvalget 15.10 i #500)', () => {
    const medNyVersjon = () => {
      const s = medInnsigelse();
      s.send('TE', GRUNNLAGSKRAV);
      return s;
    };

    it('et «i tide» på den nye versjonen gir opp innsigelsen mot den første', () => {
      const s = medNyVersjon();
      const rad = s.send('BH', {
        type: 'brev',
        svar: [
          svar('grunnlag', s.krav('grunnlag'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: true,
          }),
        ],
      });
      expect(laast(rad)[0]).toContain(
        'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev 5 av 5. oktober 2026'
      );
    });

    it('et «for sent» på den nye versjonen gjentar innsigelsen mot den første', () => {
      const s = medNyVersjon();
      const rad = s.send('BH', {
        type: 'brev',
        svar: [
          svar('grunnlag', s.krav('grunnlag'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: false,
          }),
        ],
      });
      expect(laast(rad)[0]).toContain('jf. innsigelsen i brev 5 av 5. oktober 2026');
    });

    it('et «i tide» i et registrert brev gir ikke opp innsigelsen, så et «for sent» fra appen på en ny versjon gjentar den (HF-U4, OV-U4)', () => {
      const s = medInnsigelse();
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'grunnlag',
            gjelder: s.krav('grunnlag'),
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: s.krav('grunnlag'),
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'grunnlag', resultat: 'avslaatt' },
            ],
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-06' }],
      });
      s.send('TE', GRUNNLAGSKRAV);
      const forSent = {
        type: 'brev',
        svar: [
          svar('grunnlag', s.krav('grunnlag'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: false,
          }),
        ],
      };
      // Det registrerte «i tide» binder ikke byggherren (HF-U4, OV-U4).
      expect(s.avvist('BH', forSent)).toBeNull();
      expect(laast(s.send('BH', forSent))[0]).toContain(
        'jf. innsigelsen i brev 5 av 5. oktober 2026'
      );
    });

    /** GR-U11: § 32.2 gjelder ikke kategorien. */
    const svikt = {
      type: 'krav',
      spor: 'grunnlag',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    };

    /**
     * Skiftet mellom svikt og endring kan ikke sendes fra appen (GR-U22), så det står
     * som en kravversjon fra en annen skriver, og lesingen av den prøves (MM-U18). Et
     * registrert krav ville vært dokumentasjon uten virkning (OV-U4).
     */
    const skifte = (s: ReturnType<typeof sak>, kommando: { innhold: Data }) => {
      expect(s.avvist('TE', kommando)).toBe('ANNEN_HJEMMEL');
      s.rad('TE', {
        krav: [
          {
            id: randomUUID(),
            spor: 'grunnlag',
            erstatter: s.krav('grunnlag'),
            hovedkategori: kommando.innhold.hovedkategori,
            underkategori: kommando.innhold.underkategori,
          },
        ],
      });
    };

    it('en innsigelse mot en versjon der § 32.2 ikke gjelder, gjentas ikke og gis ikke opp i svaret på en senere versjon (VS-U24, GR-U11, MM-U18)', () => {
      const tekstMed = (iTide: boolean) => {
        const s = sak();
        s.send('TE', svikt);
        s.send('BH', { type: 'innsigelse', gjelder: s.krav('grunnlag') });
        skifte(s, GRUNNLAGSKRAV);
        return laast(
          s.send('BH', {
            type: 'brev',
            svar: [
              svar('grunnlag', s.krav('grunnlag'), {
                resultat: 'avslaatt',
                grunnlag_varslet_i_tide: iTide,
              }),
            ],
          })
        )[0];
      };
      expect(tekstMed(true)).not.toContain(girOpp);
      const forSent = tekstMed(false);
      expect(forSent).toContain('TEs varsel etter NS 8407 § 32.2 kom for sent');
      expect(forSent).not.toContain('jf. innsigelsen');
    });

    it('etter et «i tide» etter § 32.2 avvises ikke en innsigelse mot en versjon der § 32.2 ikke gjelder (VS-U24, HF-U4, GR-U11, MM-U18)', () => {
      const s = sak();
      s.send('TE', GRUNNLAGSKRAV);
      const foerste = s.krav('grunnlag');
      s.send('BH', {
        type: 'brev',
        svar: [svar('grunnlag', foerste, { resultat: 'avslaatt', grunnlag_varslet_i_tide: true })],
      });
      skifte(s, svikt);
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('grunnlag') })).toBeNull();
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: foerste })).toBe('SAGT_I_TIDE');
    });

    /** Underkategorien skifter innenfor endring, og § 32.2 gjelder begge (GR-U11). */
    const samordning = {
      ...GRUNNLAGSKRAV,
      innhold: { ...GRUNNLAGSKRAV.innhold, underkategori: 'samordning' },
    };
    /** Svaret fra appen på den første versjonen, så skiftet til en ny underkategori. */
    const skifteEtter = (iTide: boolean) => {
      const s = sak();
      s.send('TE', GRUNNLAGSKRAV);
      s.send('BH', {
        type: 'brev',
        svar: [
          svar('grunnlag', s.krav('grunnlag'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: iTide,
          }),
        ],
      });
      skifte(s, samordning);
      return s;
    };
    /** Et svar på den nye versjonen utenfor kommandoene, uten et standpunkt om rettidigheten. */
    const besvar = (s: ReturnType<typeof sak>, registrert: boolean) =>
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'grunnlag',
            gjelder: s.krav('grunnlag'),
            standpunkter: [{ id: randomUUID(), art: 'grunnlag', resultat: 'avslaatt' }],
          },
        ],
        ...(registrert
          ? { opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-06' }] }
          : {}),
      });

    it('etter et «i tide» på en tidligere versjon avvises en innsigelse mot en versjon i en annen underkategori der § 32.2 gjelder, når et svar utenfor kommandoene har besvart den (HF-U8, arbeidsvalget i #798)', () => {
      const kontroll = skifteEtter(false);
      besvar(kontroll, false);
      expect(
        kontroll.avvist('BH', { type: 'innsigelse', gjelder: kontroll.krav('grunnlag') }),
        'kontrollsak: den første versjonen fikk «for sent»'
      ).toBeNull();
      const s = skifteEtter(true);
      besvar(s, false);
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      const nytt = u.spor.grunnlag.svar.find((x) => x.gjelder === s.krav('grunnlag'));
      expect(
        nytt?.beslutningsgrunnlag.varslingsplikt,
        'forutsetning: svaret på den nye versjonen frøs at § 32.2 gjelder (GR-U12)'
      ).toBe(true);
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('grunnlag') })).toBe(
        'SAGT_I_TIDE'
      );
    });

    it.each([
      ['ubesvart', false],
      ['besvart bare i et registrert brev', true],
    ])(
      'etter et «i tide» på en tidligere versjon godtas en innsigelse mot en versjon i en annen underkategori som er %s (restavviket i #798)',
      (_, registrert) => {
        // Karakteriserer dagens atferd, ikke en vedtatt forventning: ingen svar med virkning
        // har frosset varslingsplikten i den nye underkategorien, så innsigelsen leses ikke
        // som en påberopelse etter § 32.2. Et registrert svar er dokumentasjon (OV-U4).
        // Avviket gjelder bare et kategoriskifte fra før GR-U22.
        const s = skifteEtter(true);
        if (registrert) besvar(s, true);
        expect(
          s.u().spor.grunnlag.svar.some((x) => x.gjelder === s.krav('grunnlag')),
          'forutsetning: ingen svar med virkning på den nye versjonen'
        ).toBe(false);
        expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('grunnlag') })).toBeNull();
      }
    );

    it('hjemmelen for innsigelsen leses av svaret som sa «i tide», ikke av et nyere regelsett (MM-U18, GR-U12, #776)', () => {
      const s = sak();
      s.send('TE', {
        ...GRUNNLAGSKRAV,
        innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
      });
      const krav = s.krav('grunnlag');
      // Et svar utenfor kommandoene med «i tide» etter § 32.2, der § 32.2 ikke gjelder kategorien.
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'grunnlag',
            gjelder: krav,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: krav,
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'grunnlag', resultat: 'avslaatt' },
            ],
          },
        ],
      });
      expect(
        s.u().spor.grunnlag.svar[0].beslutningsgrunnlag.varslingsplikt,
        'forutsetning: § 32.2 gjaldt ikke kategorien da svaret ble sendt (GR-U11)'
      ).toBe(false);
      const innsigelse = { type: 'innsigelse', gjelder: krav };
      expect(s.avvist('BH', innsigelse), 'innsigelsen er ingen påberopelse (VS-U24)').toBeNull();
      s.send('BH', innsigelse);
      const nyere = {
        ...KJERNE,
        regler: { ...KJERNE.regler, gjelderVarslingsplikten: () => true },
      };
      const u = utledJournal(s.journal, nyere);
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(
        s.avvist('BH', innsigelse, nyere),
        'en ny innsigelse er heller ingen påberopelse under det nyere regelsettet (MM-U18, #776)'
      ).toBeNull();
      const revisjon = {
        type: 'revisjon',
        erstatter: s.u().spor.grunnlag.gjeldendeSvar!.id,
        svar: svar('grunnlag', krav, { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      };
      // Karakteriserer dagens atferd: brevteksten spør regelsettet når brevet skrives
      // (`innsigelsenPaaberoper`, #776). Revisjonen fryser at § 32.2 gjelder, så svaret og
      // teksten sier det samme (#798).
      expect(s.vis('BH', revisjon, nyere)?.[0]).toContain(
        `${girOpp} etter NS 8407 § 5 i brev 4 av 4. oktober 2026`
      );
    });
  });

  /**
   * BHs innsigelse mot grunnlagskravet (brev 5) og svaret på grunnlaget med
   * påberopelsen av for sen varsling (brev 6): alt en protest, påberopt passivitet og
   * en senere begrunnelse kunne gjelde før OV-U7.
   */
  const medSvarPaaInnsigelsen = () => {
    const s = medInnsigelse();
    const innsigelse = s.journal.at(-1)!;
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    const svarId = (svaret.data.svar as Data[])[0].id as string;
    return {
      s,
      innsigelse: (innsigelse.data.utsagn as Data[])[0].id as string,
      brevet: innsigelse.event_id,
      svarId,
      rettidighet: ((svaret.data.svar as Data[])[0].standpunkter as Data[])[0].id as string,
    };
  };

  it('protest, påberopt passivitet og senere begrunnelse avvises fra begge parter, og ingen hendelse skrives (OV-U7, arbeidsvalget 16.10 på #587)', () => {
    const { s, innsigelse, brevet, svarId, rettidighet } = medSvarPaaInnsigelsen();
    const kommandoer = [
      { type: 'protest', gjelder: innsigelse },
      { type: 'protest', gjelder: brevet },
      { type: 'protest', gjelder: rettidighet },
      { type: 'passivitet', gjelder: s.krav('grunnlag') },
      { type: 'begrunnelse', gjelder: svarId, utdypning: BEGRUNNELSE },
      { type: 'begrunnelse', gjelder: svarId, sendt: '2026-10-07', dokumentasjon: [randomUUID()] },
    ];
    const foer = s.journal.length;
    for (const part of ['TE', 'BH'] as const)
      for (const k of kommandoer)
        expect(s.avvist(part, k), `${part}: ${JSON.stringify(k)}`).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(s.journal).toHaveLength(foer);
  });

  it('protest, påberopt passivitet og senere begrunnelse tilbys ingen av partene, også med en innsigelse, et dokument, et grunnlagskrav og et svar (OV-U7)', () => {
    const { s, brevet, svarId } = medSvarPaaInnsigelsen();
    const u = s.u();
    expect(u.elementer[brevet]?.art, 'forutsetning: brevet med innsigelsen').toBe('dokument');
    expect(u.elementer[svarId]?.art, 'forutsetning: svaret').toBe('svar');
    for (const part of ['TE', 'BH'] as const) {
      const tilbudt = handlinger(u, part);
      expect(tilbudt, `kontrollsak: ${part} tilbys en innsigelse`).toContain(
        part === 'TE' ? `innsigelse:${svarId}` : `innsigelse:${s.krav('vederlag')}`
      );
      expect(tilbudt.filter((h) => /^(protest|passivitet|begrunne):/.test(h))).toEqual([]);
    }
  });

  it('en lest protest, påberopt passivitet og senere begrunnelse gjør saken fortsatt forstått og vises ved siden av, uten virkning på sporene (OV-U7, VS-U1, VS-U12, KA-U34)', () => {
    const { s, innsigelse, svarId } = medSvarPaaInnsigelsen();
    const foer = s.u();
    const utsagn = (art: string, gjelder: string) => ({
      utsagn: [{ id: randomUUID(), art, gjelder }],
    });
    const protest = s.rad('TE', utsagn('protest', innsigelse));
    const passivitet = s.rad('TE', utsagn('passivitet', s.krav('grunnlag')));
    const begrunnelse = s.rad('BH', utsagn('begrunnelse', svarId));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.protester.map((p) => [p.part, p.gjelder, p.hendelse])).toEqual([
      ['TE', innsigelse, protest.event_id],
    ]);
    expect(u.passivitet.map((p) => [p.part, p.gjelder, p.hendelse])).toEqual([
      ['TE', s.krav('grunnlag'), passivitet.event_id],
    ]);
    const b = (begrunnelse.data.utsagn as Data[])[0].id as string;
    expect(u.elementer[b]).toEqual({
      hendelse: begrunnelse.event_id,
      part: 'BH',
      art: 'begrunnelse',
    });
    const v = visning(u, GJELDENDE_REGLER);
    expect(v.spor.grunnlag.etiketter).toContain('passivitet_paaberopt');
    expect(
      v.journal
        .filter((j) => [protest, passivitet, begrunnelse].some((r) => r.event_id === j.hendelse))
        .map((j) => j.tolket)
    ).toEqual([true, true, true]);
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
    expect(u.svar).toEqual(foer.svar);
  });
});

describe('bestridelse, merking og avklaring (LV-U4 punkt 10–12)', () => {
  /** Et registrert svar fra byggherren på grunnlaget, sendt 3.10 (brev 3). */
  const medRegistrertSvar = (opplysninger: Data[] = []) => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const rad = s.rad('BH', {
      svar: [
        {
          id: randomUUID(),
          spor: 'grunnlag',
          gjelder: s.krav('grunnlag'),
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: s.krav('grunnlag'),
              hjemmel: '32.2',
              i_tide: true,
            },
            { id: randomUUID(), art: 'grunnlag', resultat: 'godkjent' },
          ],
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-03' }, ...opplysninger],
    });
    const opplysning = (hva: string) =>
      (rad.data.opplysninger as Data[]).find((o) => o.hva === hva)!.id as string;
    return { s, rad, opplysning };
  };

  it('bestridelsen av datoen og av opplysningen om § 31.3 avvises i første versjon (OV-U7)', () => {
    const { s, opplysning } = medRegistrertSvar([
      { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
    ]);
    expect(
      s.avvist('TE', { type: 'bestridelse', gjelder: opplysning('sendt'), hva: 'sendt' })
    ).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(
      s.avvist('TE', {
        type: 'bestridelse',
        gjelder: opplysning('endringsordre'),
        hva: 'endringsordre',
      })
    ).toBe('IKKE_I_FOERSTE_VERSJON');
  });

  it('bestridelsen av datoen for et varsel etter § 33.4 avvises i første versjon (OV-U7)', () => {
    const s = sakMedKrav();
    const varsel = (s.journal.at(-1)!.data.opplysninger as Data[])[0].id as string;
    expect(s.avvist('BH', { type: 'bestridelse', gjelder: varsel, hva: 'sendt' })).toBe(
      'IKKE_I_FOERSTE_VERSJON'
    );
  });

  it('merkingen av et registrert brev og avklaringen avvises i første versjon (OV-U7)', () => {
    const { s, rad } = medRegistrertSvar();
    expect(
      s.avvist('BH', { type: 'merking', gjelder: rad.event_id, spor: ['grunnlag', 'frist'] })
    ).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(s.avvist('BH', { type: 'avklaring', gjelder: rad.event_id })).toBe(
      'IKKE_I_FOERSTE_VERSJON'
    );
  });
});

describe('den senere begrunnelsen (KA-U34)', () => {
  const grunnlagAvslaatt = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const svarId = (rad: Journalrad, i = 0) => (rad.data.svar as Data[])[i].id as string;

  /** Saken med kravene og byggherrens svar på alle tre i brev 5. */
  const medSvar = () => {
    const s = sakMedKrav();
    const brev = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), grunnlagAvslaatt),
        svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]),
        svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1]),
      ],
    });
    return { s, brev };
  };

  it('en begrunnelse fra TE eller av noe annet enn et svar gjør saken ikke forstått (MM-U2)', () => {
    const { s, brev } = medSvar();
    const lest = (part: Part, gjelder: string) =>
      utledJournal(
        [
          ...s.journal,
          {
            ...s.journal.at(-1)!,
            event_id: randomUUID(),
            versjon: s.journal.at(-1)!.versjon + 1,
            aktor_rolle: part,
            data: { utsagn: [{ id: randomUUID(), art: 'begrunnelse', gjelder }] },
          },
        ],
        KJERNE
      ).forstaatt;
    expect(lest('BH', svarId(brev)), 'kontrollsak').toBe(true);
    expect(lest('TE', svarId(brev))).toBe(false);
    expect(lest('BH', s.krav('grunnlag'))).toBe(false);
  });
});

describe('meldingen når kravene er avgjort, sier hvordan hvert krav ble avgjort (KA-U11, #448)', () => {
  const godkjentGrunnlag = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
  const heltVederlag = [
    { hovedkrav_vurdering: 'godkjent', hovedkrav_godkjent_belop: 125000, aksepterer_metode: true },
    { resultat: 'godkjent', godkjent_beloep: 125000 },
  ] as const;

  /** Grunnlaget godkjent og vederlaget godkjent fullt (enighet ved sammenfall); fristen ikke sendt. */
  const utenFrist = () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep: 125000 } });
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), godkjentGrunnlag),
        svar('vederlag', s.krav('vederlag'), heltVederlag[0], heltVederlag[1]),
      ],
    });
    return s;
  };

  const vederlagskrav = {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', beloep: 90000 },
  };
  const revisjonAvVederlaget = (s: ReturnType<typeof sak>) => ({
    type: 'revisjon',
    erstatter: s.u().spor.vederlag.gjeldendeSvar!.id,
    svar: svar('vederlag', s.krav('vederlag'), heltVederlag[0], heltVederlag[1]),
  });
  /** Fristkravet uten varselet sendt utenfor appen, så TE kan oppgi varseldatoen senere (OV-U5). */
  const fristkravUtenVarsel = {
    type: 'krav',
    spor: 'frist',
    innhold: { dager: 20 },
    utdypning: 'Pelingen tar fire uker lenger.',
  };
  const varseldato = () => ({
    type: 'varsel',
    spor: 'frist',
    hjemmel: '33.4',
    sendt: '2026-09-28',
    dokumentasjon: [randomUUID()],
  });

  it('et spor uten krav hindrer ikke: med ett sendt krav avgjort er kravene avgjort, og visningen sier det med OV-U10 (OV-U3)', () => {
    const u = utenFrist().u();
    expect(kraveneErAvgjort(u)).toBe(true);
    expect(u.avgjorteSpor).toEqual(['grunnlag', 'vederlag']);
    expect(visning(u, GJELDENDE_REGLER).status).toEqual({
      kode: 'alle_krav_avgjort',
      tekst: 'Alle krav sendt i appen er avgjort',
    });
    expect(
      kanInngaaIEo(u),
      'et spor TE fortsatt kan sende, hindrer endringsordren (EO-U5, arbeidsvalget i #493)'
    ).toBe(false);
  });

  it('uten et sendt vederlags- eller fristkrav er kravene ikke avgjort, også når grunnlaget er godkjent (OV-U3)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.send('BH', {
      type: 'brev',
      svar: [svar('grunnlag', s.krav('grunnlag'), godkjentGrunnlag)],
    });
    const u = s.u();
    expect(u.grunnlagAvklart, 'forutsetning: grunnlaget er avklart').toBe(true);
    expect(kraveneErAvgjort(u)).toBe(false);
    expect(u.avgjorteSpor).toEqual([]);
    // MM-U22: saken har ingen samlet status før kravene er avgjort.
    expect(visning(u, GJELDENDE_REGLER).status).toBeNull();
  });

  it('når kravene er avgjort, avvises trekk, ny kravversjon og byggherrens revisjon for det som er sendt (OV-U3)', () => {
    const s = utenFrist();
    expect(s.avvist('TE', { type: 'trekk', spor: 'vederlag' })).toBe('KRAVENE_AVGJORT');
    expect(s.avvist('TE', { type: 'trekk', spor: 'grunnlag' })).toBe('KRAVENE_AVGJORT');
    expect(s.avvist('TE', vederlagskrav)).toBe('KRAVENE_AVGJORT');
    expect(s.avvist('BH', revisjonAvVederlaget(s))).toBe('KRAVENE_AVGJORT');
  });

  it('i et spor uten krav godtas varselet, varseldatoen og det første kravet når kravene er avgjort (OV-U3, OV-U5)', () => {
    const s = utenFrist();
    expect(s.avvist('TE', { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' })).toBeNull();
    expect(s.avvist('TE', varseldato())).toBeNull();
    expect(s.avvist('TE', FRISTKRAV)).toBeNull();
  });

  it('TEs opplysning om varseldato godtas i et spor som var avgjort (OV-U3, OV-U5)', () => {
    const s = utenFrist();
    s.send('TE', fristkravUtenVarsel);
    s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    const u = s.u();
    expect(kraveneErAvgjort(u), 'forutsetning: kravene er avgjort').toBe(true);
    expect(u.avgjorteSpor).toEqual(['grunnlag', 'vederlag', 'frist']);
    expect(s.avvist('TE', varseldato())).toBeNull();
    s.send('TE', varseldato());
    const etter = s.u();
    expect(etter.spor.frist.varsel, 'varselet har virkning (OV-U5)').not.toBeNull();
    expect(etter.utenVirkning).toEqual([]);
    expect(kraveneErAvgjort(etter), 'varselet endrer ikke at kravene er avgjort').toBe(true);
  });

  it('det første kravet i sporet gjør at kravene ikke lenger er avgjort, men sperren for det som var avgjort står (OV-U3)', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    const u = s.u();
    expect(kraveneErAvgjort(u)).toBe(false);
    expect(u.avgjorteSpor).toEqual(['grunnlag', 'vederlag']);
    expect(visning(u, GJELDENDE_REGLER).status).toBeNull();
    expect(s.avvisning('TE', { type: 'trekk', spor: 'vederlag' })).toEqual({
      regel: 'KRAVENE_AVGJORT',
      melding:
        'Kravene som var sendt, ble avgjort: byggherren har godkjent grunnlaget, partene er enige om svaret på kravet om justering av vederlaget.',
    });
    expect(s.avvist('TE', { type: 'trekk', spor: 'grunnlag' })).toBe('KRAVENE_AVGJORT');
    expect(s.avvist('TE', vederlagskrav)).toBe('KRAVENE_AVGJORT');
    expect(s.avvist('BH', revisjonAvVederlaget(s))).toBe('KRAVENE_AVGJORT');
    // Kontrollsak: det nye kravet er ikke avgjort, så TE kan trekke det.
    expect(s.avvist('TE', { type: 'trekk', spor: 'frist' })).toBeNull();

    s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    const etter = s.u();
    expect(kraveneErAvgjort(etter), 'det nye kravet er avgjort ved sammenfall').toBe(true);
    expect(etter.avgjorteSpor).toEqual(['grunnlag', 'vederlag', 'frist']);
    expect(kanInngaaIEo(etter)).toBe(true);
  });

  it('en rad som trekker et krav som var avgjort, gjør saken ikke forstått, også etter et nytt første krav (OV-U3, MM-U18)', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    const vederlagskravId = s.krav('vederlag');
    s.rad('TE', utsagn(randomUUID(), 'trekk', vederlagskravId));
    const u = s.u();
    expect(u.forstaatt).toBe(false);
    expect(u.begrensninger.map((b) => b.grunn)).toContain(
      'trekk etter at kravene er avgjort (OV-U3)'
    );
  });

  it('en rad som trekker det nye første kravet, strider ikke (OV-U3)', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    s.rad('TE', utsagn(randomUUID(), 'trekk', s.krav('frist')));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.frist.trukket).toBe(true);
  });

  it('med et registrert brev sier visningen også at saken har brev sendt utenfor appen (OV-U10)', () => {
    const s = utenFrist();
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'grunnlag',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
    });
    const u = s.u();
    expect(u.forstaatt, 'forutsetning: saken er forstått').toBe(true);
    expect(visning(u, GJELDENDE_REGLER).status).toEqual({
      kode: 'alle_krav_avgjort',
      tekst:
        'Alle krav sendt i appen er avgjort. Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.',
    });
  });

  it('når TE ikke krever fristforlengelse, er kravene avgjort, og meldingen sier hvorfor', () => {
    const s = utenFrist();
    s.send('TE', { type: 'ingen_krav', spor: 'frist' });
    expect(s.avvisning('TE', { type: 'trekk', spor: 'vederlag' })).toEqual({
      regel: 'KRAVENE_AVGJORT',
      melding:
        'Alle krav sendt i appen er avgjort: byggherren har godkjent grunnlaget, partene er enige om svaret på kravet om justering av vederlaget og TE krever ikke fristforlengelse.',
    });
  });

  /** Kravene avgjort: grunnlaget og vederlaget godkjent, fristkravet trukket (KA-U11). */
  const avgjort = () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    s.send('TE', { type: 'trekk', spor: 'frist' });
    const foer = s.u();
    expect(kraveneErAvgjort(foer), 'forutsetning: kravene er avgjort').toBe(true);
    return { s, foer };
  };
  const utsagn = (id: string, art: string, gjelder: string) => ({
    utsagn: [{ id, art, gjelder }],
  });

  it('en lest senere begrunnelse etter at kravene er avgjort, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, KA-U34)', () => {
    const { s, foer } = avgjort();
    const svarId = foer.spor.vederlag.gjeldendeSvar?.id;
    expect(svarId, 'forutsetning: svaret på vederlaget').toBeDefined();
    const id = randomUUID();
    s.rad('BH', utsagn(id, 'begrunnelse', svarId as string));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.elementer[id]?.art).toBe('begrunnelse');
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
  });

  it('en lest påberopt passivitet etter at kravene er avgjort, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, VS-U12)', () => {
    const { s, foer } = avgjort();
    const grunnlagskrav = s.krav('grunnlag');
    s.rad('TE', utsagn(randomUUID(), 'passivitet', grunnlagskrav));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.passivitet.map((p) => [p.part, p.gjelder])).toEqual([['TE', grunnlagskrav]]);
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
  });

  it('et trukket krav står som trukket i meldingen', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    s.send('TE', { type: 'trekk', spor: 'frist' });
    expect(s.avvisning('TE', { type: 'trekk', spor: 'vederlag' })?.melding).toBe(
      'Alle krav sendt i appen er avgjort: byggherren har godkjent grunnlaget, partene er enige om svaret på kravet om justering av vederlaget og kravet om fristforlengelse er trukket.'
    );
  });

  it('når byggherren har frafalt pålegget, sier meldingen det, ikke at grunnlaget er godkjent', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.send('TE', { type: 'ingen_krav', spor: 'vederlag' });
    s.send('TE', { type: 'ingen_krav', spor: 'frist' });
    s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'grunnlag',
          s.krav('grunnlag'),
          { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true },
          {},
          'Pelingen utgår.'
        ),
      ],
    });
    expect(s.avvisning('TE', FRISTKRAV)).toEqual({
      regel: 'KRAVENE_AVGJORT',
      melding:
        'Alle krav sendt i appen er avgjort: byggherren har frafalt pålegget, TE krever ikke justering av vederlaget og TE krever ikke fristforlengelse.',
    });
  });
});

describe('den låste delen og utdypningen hver for seg (B-13 om begrunnelsestekst, KA-U31)', () => {
  it('begrunnelsen står under svaret den gjelder, uendret', () => {
    const s = sakMedKrav();
    const utdypning = 'Varselet kom tre uker etter pålegget.\n\nSe referatet fra byggemøte 4.';
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'grunnlag',
          s.krav('grunnlag'),
          { resultat: 'avslaatt', grunnlag_varslet_i_tide: false },
          {},
          utdypning
        ),
        svar(
          'vederlag',
          s.krav('vederlag'),
          VEDERLAG_DELVIS[0],
          VEDERLAG_DELVIS[1],
          'Påslaget er for høyt.'
        ),
      ],
    });
    const [g, v] = tekst(rad);
    expect(g.utdypning).toBe(utdypning);
    expect(g.laast).not.toContain('tre uker');
    expect(v.utdypning).toBe('Påslaget er for høyt.');
  });
});

describe('teksten avsenderen godkjenner, er den som fryses (LV-U2, A1)', () => {
  it('kontrollsak: kommandoen med teksten fra forhåndsvisningen godtas', () => {
    expect(sak().avvist('TE', GRUNNLAGSKRAV)).toBeNull();
  });

  it('en kommando uten teksten avvises, også når alt annet stemmer (ikke fail-open)', () => {
    const s = sak();
    const u = vurder(
      GRUNNLAGSKRAV,
      {
        sakId: SAK,
        aktoerId: 'te',
        part: 'TE',
        teamId: null,
        tidspunkt: () => new Date(),
        nyId: randomUUID,
      },
      s.journal,
      KJERNE,
      new Map()
    );
    expect(u.godtatt ? null : u.avvisning.regel).toBe('BREVTEKST_MANGLER');
  });

  it('en annen tekst enn den serveren lager, avvises', () => {
    const s = sak();
    const vist = forhaandsvis(
      GRUNNLAGSKRAV,
      {
        sakId: SAK,
        aktoerId: 'te',
        part: 'TE',
        teamId: null,
        tidspunkt: () => new Date(),
        nyId: randomUUID,
      },
      s.journal,
      KJERNE
    );
    const t = vist.godtatt ? laastTekst(vist.hendelser[0])! : [];
    expect(t, 'forutsetning: forhåndsvisningen har teksten').toHaveLength(1);
    expect(s.avvist('TE', { ...GRUNNLAGSKRAV, brevtekst: [t[0].replace('32.1', '32.2')] })).toBe(
      'ANNEN_BREVTEKST'
    );
    expect(s.avvist('TE', { ...GRUNNLAGSKRAV, brevtekst: [...t, t[0]] })).toBe('ANNEN_BREVTEKST');
    expect(s.avvist('TE', { ...GRUNNLAGSKRAV, brevtekst: t })).toBeNull();
  });

  it('en registrering bærer ingen tekst (MM-U17)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const varsel = {
      type: 'varsel',
      spor: 'frist',
      hjemmel: '33.4',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    };
    expect(s.avvist('TE', { ...varsel, brevtekst: ['x'] })).toBe('UGYLDIG_FORM');
    const rad = s.send('TE', varsel);
    expect(rad.data.brevtekst).toBeUndefined();
    expect(utenAvsnitt(rad)).toEqual([]);
  });
});

/**
 * OV-U5: TE oppgir datoen for et varsel sendt utenfor appen med varselet som vedlegg.
 * Vedlegget kreves når kravet registrerer varselet; er det registrert, kreves bare samme
 * dato (SK-12, rad KA-19; arbeidsvalget i #909).
 */
describe('fristkravet med varselet sendt utenfor appen (OV-U5)', () => {
  const utenBrevet = { ...FRISTKRAV, varsel: { sendt: FRISTKRAV.varsel.sendt } };

  it('et fristkrav som registrerer varselet uten brevet med det, avvises (OV-U5)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    expect(s.avvisning('TE', utenBrevet)).toEqual({
      regel: 'VEDLEGG_MANGLER',
      melding:
        'Kravet oppgir datoen varselet etter § 33.4 ble sendt, men brevet med varselet ligger ikke ved (OV-U5).',
    });
    expect(s.avvist('TE', FRISTKRAV), 'kontrollsak').toBeNull();
  });

  it('er varselet registrert med brevet, kreves bare samme dato i kravet (SK-12, arbeidsvalget i #909)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.send('TE', {
      type: 'varsel',
      spor: 'frist',
      hjemmel: '33.4',
      sendt: FRISTKRAV.varsel.sendt,
      dokumentasjon: [VARSELBREVET],
    });
    const rad = s.send('TE', utenBrevet);
    expect(rad.data.dokumentasjon).toBeUndefined();
    expect(rad.data.utsagn).toBeUndefined();
  });

  it('samme vedlegg to ganger i varselet avvises i formen', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const dobbelt = {
      ...FRISTKRAV,
      varsel: { sendt: '2026-09-28', dokumentasjon: [VARSELBREVET, VARSELBREVET.toUpperCase()] },
    };
    expect(s.avvisning('TE', dobbelt)?.melding).toBe(
      '$.varsel.dokumentasjon: samme vedlegg står to ganger'
    );
  });

  it('et vedlegg serveren ikke fant i saken, avvises, og ID-en lagres med små bokstaver (LV-U14, arbeidsvalg 3 i #790)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const vedlegg = randomUUID();
    const kommando = {
      type: 'varsel',
      spor: 'frist',
      hjemmel: '33.4',
      sendt: '2026-09-28',
      dokumentasjon: [vedlegg.toUpperCase()],
    };
    const kontekst = {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      tidspunkt: () => new Date('2026-10-07T08:00:00Z'),
      nyId: randomUUID,
    };
    const godtatt = vurder(
      kommando,
      kontekst,
      s.journal,
      KJERNE,
      mellomlager({ dokumentasjon: [vedlegg] })
    );
    expect(godtatt.godtatt && godtatt.hendelser[0].data.dokumentasjon, 'kontrollsak').toEqual([
      { vedlegg_id: vedlegg, filnavn: `${vedlegg}.pdf`, innhold_sha256: '0'.repeat(64) },
    ]);
    const u = vurder(kommando, kontekst, s.journal, KJERNE, new Map());
    expect(u.godtatt ? null : u.avvisning.regel).toBe('VEDLEGG_FINNES_IKKE');
  });
});

describe('forespørselen og svaret etter § 33.6.2 (VS-U17, VS-U19, VS-U27, VS-U29, LV-U18)', () => {
  const foresporsel = { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' };
  const begrunnelseB = 'Omfanget av omprosjekteringen er ikke kjent ennå.';
  const id = (rad: Journalrad) => (rad.data.utsagn as Data[])[0].id as string;
  const medForesporsel = () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const f = s.send('BH', foresporsel);
    return { s, f: id(f), rad: f };
  };
  const medBegrunnelse = () => {
    const { s, f } = medForesporsel();
    const b = s.send('TE', { type: 'foresporselssvar', gjelder: f, utdypning: begrunnelseB });
    return { s, f, b: id(b), rad: b };
  };
  const fristsvar = (s: ReturnType<typeof sak>, vurderinger: Data, resultat: Data) =>
    s.send('BH', { type: 'brev', svar: [svar('frist', s.krav('frist'), vurderinger, resultat)] });

  it('forespørselen har setning 1 i LV-U18, uten dager og uten oppgitt dato', () => {
    const { rad } = medForesporsel();
    expect(laast(rad)).toEqual([
      `Byggherren ber etter NS 8407 § 33.6.2 TE angi og begrunne det antall dager TE krever som fristforlengelse som følge av forholdet ${I_SAKEN}. Svarer ikke TE, tapes kravet på fristforlengelse. Har TE ikke grunnlag for å beregne kravet, skal TE i stedet begrunne hvorfor grunnlaget ikke foreligger.`,
    ]);
    expect(rad.data.opplysninger).toBeUndefined();
  });

  it('VS-U19: forespørselen avvises når TE har krevd dager, og bare BH kan sende den', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    expect(s.avvist('TE', foresporsel)).toBe('FEIL_PART');
    s.send('TE', FRISTKRAV);
    expect(s.avvist('BH', foresporsel)).toBe('FRISTKRAV_SENDT');
  });

  it('VS-U33: et fristkrav i et registrert brev stopper ikke forespørselen fra appen', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.rad('TE', {
      krav: [{ id: randomUUID(), spor: 'frist', dager: 20 }],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-01' }],
    });
    expect(s.avvist('BH', foresporsel)).toBeNull();
    // Kjernen forstår journalen med forespørselen etter det registrerte kravet (send kaster ellers).
    s.send('BH', foresporsel);
  });

  it('VS-U33: et fristkrav fremmet i appen stopper forespørselen (kontrollsak)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(s.avvist('BH', foresporsel)).toBe('FRISTKRAV_SENDT');
  });

  it('beslutningslinjen nevner begge bestemmelsene når svaret prekluderer etter § 33.4 og § 33.6.2 tredje ledd (VS-U17, vedtaket 05.10)', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      {
        ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'),
        frist_varsel_ok: false,
        foresporsel_svar_ok: false,
      },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt prekludert (§ 33.4 og § 33.6.2), subsidiært godkjent med 20 dager.'
    );
  });

  it('kravet som svarer på forespørselen, sier det (LV-U18 setning 3), og § 33.6.1 kan ikke påberopes (fjerde ledd)', () => {
    const { s } = medForesporsel();
    const krav = s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(laast(krav)).toEqual([
      'TE krever fristforlengelse på 20 dager (NS 8407 § 33.6.1). Kravet er svar på byggherrens forespørsel etter NS 8407 § 33.6.2 i brev 3 av 3. oktober 2026.',
    ]);
    const kravId = s.krav('frist');
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'frist',
            kravId,
            {
              ...FRIST_FULLT[0],
              foresporsel_svar_ok: true,
              spesifisert_krav_ok: false,
              dager_maatte_forstaa: 0,
            },
            { resultat: 'godkjent', godkjent_dager: 20 }
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
  });

  it('VS-U17: «svaret kom for sent» etter § 33.6.2 tredje ledd avslår kravet prinsipalt, med teksten i setning 4', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const kravId = s.krav('frist');
    const rad = fristsvar(
      s,
      { ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'), foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const standpunkter = (rad.data.svar as Data[])[0].standpunkter as Data[];
    expect(standpunkter.find((p) => p.hjemmel === '33.6.2')).toMatchObject({
      art: 'rettidighet',
      gjelder: kravId,
      i_tide: false,
    });
    expect(laast(rad)[0]).toContain(
      'byggherren gjør gjeldende at TEs svar på forespørselen etter NS 8407 § 33.6.2 i brev 3 av 3. oktober 2026 kom for sent.'
    );
    expect((rad.data.svar as Data[])[0].utregning).toMatchObject({ resultat: 'avslaatt' });
  });

  it('begrunnelsen etter annet ledd b har setning 2 i LV-U18 og TEs tekst som utdypning', () => {
    const { rad, b } = medBegrunnelse();
    expect(tekst(rad)).toEqual([
      {
        gjelder: b,
        laast:
          'TE svarer på byggherrens forespørsel etter NS 8407 § 33.6.2 i brev 3 av 3. oktober 2026 at grunnlaget for å beregne kravet ikke foreligger (§ 33.6.2 annet ledd b).',
        utdypning: begrunnelseB,
      },
    ]);
  });

  it('KA-U1, VS-U27: én begrunnelse per forespørsel fra appen, bare fra TE', () => {
    const { s, f } = medForesporsel();
    const kommando = { type: 'foresporselssvar', gjelder: f, utdypning: begrunnelseB };
    expect(s.avvist('BH', kommando)).toBe('FEIL_PART');
    s.send('TE', kommando);
    expect(s.avvist('TE', kommando)).toBe('FORESPORSEL_BESVART');
    expect(s.avvist('TE', { ...kommando, gjelder: randomUUID() })).toBe('INGEN_FORESPORSEL');
  });

  it('et krav etter begrunnelsen svarer ikke på forespørselen, og § 33.6.1 gjelder (femte ledd)', () => {
    const { s } = medBegrunnelse();
    const krav = s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(laast(krav)).toEqual(['TE krever fristforlengelse på 20 dager (NS 8407 § 33.6.1).']);
    // Uten innsigelse mot begrunnelsen er det ingen påberopelse etter § 33.6.2 å gjenta (VS-U29).
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'frist',
            s.krav('frist'),
            { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
            FRIST_FULLT[1]
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
  });

  it('VS-U29: innsigelsen mot begrunnelsen er en påberopelse etter § 33.6.2, som svaret på kravet gjentar', () => {
    const { s, b } = medBegrunnelse();
    const innsigelse = s.send('BH', { type: 'innsigelse', gjelder: b });
    expect(laast(innsigelse)).toEqual([
      'Byggherren gjør gjeldende at TEs svar i brev 4 av 4. oktober 2026 på forespørselen etter NS 8407 § 33.6.2 kom for sent (NS 8407 § 5 tredje ledd).',
    ]);
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const p = ((rad.data.svar as Data[])[0].standpunkter as Data[]).find(
      (x) => x.hjemmel === '33.6.2'
    );
    expect(p).toMatchObject({ gjelder: b, i_tide: false });
    expect(laast(rad)[0]).toContain(
      'byggherren gjør gjeldende at TEs svar på forespørselen etter NS 8407 § 33.6.2 i brev 3 av 3. oktober 2026 kom for sent, jf. innsigelsen i brev 5 av 5. oktober 2026.'
    );
  });

  it('HF-U4: etter «i tide» etter § 33.6.2 avvises en senere innsigelse mot begrunnelsen', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(s, { ...FRIST_FULLT[0], foresporsel_svar_ok: true }, FRIST_FULLT[1]);
    expect(laast(rad)[0]).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev 5 av 5. oktober 2026 og gjør ikke gjeldende at TEs svar på forespørselen etter NS 8407 § 33.6.2 i brev 3 av 3. oktober 2026 kom for sent.'
    );
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: b })).toBe('SAGT_I_TIDE');
  });

  it('HF-U4, VS-U29: etter «i tide» etter § 33.6.2 gir svaret på en senere kravversjon ikke opp innsigelsen mot begrunnelsen på nytt', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    // Delvis godkjent, så svaret ikke gir enighet og kravet kan endres (GR-U10).
    const delvis = [
      { ...FRIST_FULLT[0], dager: 10, foresporsel_svar_ok: true },
      { resultat: 'delvis_godkjent', godkjent_dager: 10 },
    ] as const;
    const foerste = fristsvar(s, ...delvis);
    expect(laast(foerste)[0], 'kontrollsak: det første svaret').toContain('gir opp innsigelsen');
    s.send('TE', { type: 'krav', spor: 'frist', innhold: { dager: 25 }, utdypning: 'Mer.' });
    expect(laast(fristsvar(s, ...delvis))[0]).not.toContain('innsigelsen');
  });

  it('VS-U29, VS-U11: etter en innsigelse mot begrunnelsen må svaret på kravet gjenta den eller gi den opp', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
      })
    ).toBe('UGYLDIG_VURDERING');
  });

  it('VS-U31: en ny forespørsel fra appen avvises når saken alt har en, også før TE har svart', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    expect(s.avvist('BH', foresporsel), 'kontrollsak: ingen forespørsel').toBeNull();
    const { s: medF } = medForesporsel();
    expect(medF.avvist('BH', foresporsel)).toBe('FORESPORSEL_SENDT');
  });

  it('VS-U31: en lest rad med en andre forespørsel gjør saken ikke forstått', () => {
    const andre = { utsagn: [{ id: randomUUID(), art: 'foresporsel', hjemmel: '33.6.2' }] };
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    s.rad('BH', andre);
    expect(s.u().forstaatt, 'kontrollsak: én forespørsel').toBe(true);
    const { s: medF } = medForesporsel();
    medF.rad('BH', andre);
    const u = medF.u();
    expect(u.forstaatt).toBe(false);
    expect(u.begrensninger.map((b) => b.grunn)).toContain(
      'saken har alt en forespørsel etter § 33.6.2 fra appen (VS-U31)'
    );
  });

  it('VS-U30: etter TEs begrunnelse avvises en ny forespørsel fra appen', () => {
    const { s } = medForesporsel();
    expect(s.avvist('BH', foresporsel), 'kontrollsak: før begrunnelsen').toBe('FORESPORSEL_SENDT');
    const { s: medB } = medBegrunnelse();
    expect(medB.avvist('BH', foresporsel)).toBe('FORESPORSEL_BEGRUNNET');
  });

  it('LV-U20: protesten mot påberopelsen etter § 33.6.2 sier at den gjelder TEs svar på forespørselen', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      { ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'), foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const standpunkter = (rad.data.svar as Data[])[0].standpunkter as Data[];
    const id = (hjemmel: string) => standpunkter.find((p) => p.hjemmel === hjemmel)!.id as string;
    const protest = (gjelder: string): Dokument => ({
      id: 'protesten',
      avsender: 'TE',
      registrert: '2026-10-07T10:00:00Z',
      opplysninger: [],
      dokumentasjon: [],
      krav: [],
      svar: [],
      utsagn: [{ id: 'p', art: 'protest', gjelder }],
      brevtekst: null,
      beskrivelse: null,
      spor: [],
      retter: null,
      ikkeISaken: false,
    });
    const saken = {
      saksnummer: SAK,
      tittel: TITTEL,
      grunnlagssvar: null,
      subsidiaer: { vederlag: [], frist: [] },
    };
    const tekst = (gjelder: string) =>
      lagBrevtekst(protest(gjelder), s.u().journal, saken, KJERNE.regler)[0].laast;
    expect(tekst(id('33.6.2'))).toBe(
      'TE protesterer mot påberopelsen av at TEs svar på forespørselen etter NS 8407 § 33.6.2 kom for sent i svaret i brev 5 av 5. oktober 2026.'
    );
    expect(tekst(id('33.4')), 'kontrollsak: § 33.4 har dagens tekst').toBe(
      'TE protesterer mot påberopelsen av for sen varsling i svaret i brev 5 av 5. oktober 2026.'
    );
  });

  it('VS-U29: «ikke et svar etter annet ledd» registreres uten virkning, og gjelder bare begrunnelsen', () => {
    const { s, b } = medBegrunnelse();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: b, grunn: 'ikke_svar' });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at TEs svar i brev 4 av 4. oktober 2026 på forespørselen etter NS 8407 § 33.6.2 ikke er et svar etter NS 8407 § 33.6.2 annet ledd.',
    ]);
    // Ingen påberopelse etter § 33.6.2 å gjenta i svaret på kravet.
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'frist',
            s.krav('frist'),
            { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
            FRIST_FULLT[1]
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
    const grunnlag = s.krav('grunnlag');
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: grunnlag, grunn: 'ikke_svar' })).toBe(
      'UGYLDIG_INNSIGELSE'
    );
  });
});

describe('varselet etter § 33.4 sendt fra appen (VS-U15)', () => {
  const sendVarsel = { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' };
  const medVarsel = () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const varsel = s.send('TE', sendVarsel);
    return { s, varsel, id: (varsel.data.utsagn as Data[])[0].id as string };
  };

  it('brevet er varselet, uten dager og uten en oppgitt dato, med teksten i VS-U15', () => {
    const { varsel, id } = medVarsel();
    expect(tekst(varsel)).toEqual([
      {
        gjelder: id,
        laast: `TE varsler etter NS 8407 § 33.4 at TE vil kreve fristforlengelse som følge av forholdet ${I_SAKEN}.`,
      },
    ]);
    // VS-U8: datoen er serverens, så brevet har ingen opplysning om når det ble sendt.
    expect(varsel.data.opplysninger).toBeUndefined();
    expect(utenAvsnitt(varsel)).toEqual([]);
  });

  it('et varsel uten dato i et brev med krav er ikke brevet selv, og kan ikke uttrykkes', () => {
    const dokument: Dokument = {
      id: 'brevet',
      avsender: 'TE',
      registrert: '2026-10-05T10:00:00Z',
      opplysninger: [],
      dokumentasjon: [],
      krav: [
        { id: 'k', spor: 'frist', dokument: 'brevet', erstatter: null, innhold: { dager: 20 } },
      ],
      svar: [],
      utsagn: [{ id: 'v', art: 'varsel', hjemmel: '33.4', dokument: 'brevet' }],
      brevtekst: null,
      beskrivelse: null,
      spor: [],
      retter: null,
      ikkeISaken: false,
    };
    const saken = {
      saksnummer: SAK,
      tittel: TITTEL,
      grunnlagssvar: null,
      subsidiaer: { vederlag: [], frist: [] },
    };
    expect(() => lagBrevtekst(dokument, [], saken, KJERNE.regler)).toThrow(
      'et varsel i et brev fra appen har datoen det ble sendt'
    );
  });

  it('serveren avviser en annen tekst enn den den lager (A1)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    expect(s.avvist('TE', { ...sendVarsel, brevtekst: ['TE varsler.'] })).toBe('ANNEN_BREVTEKST');
  });

  it('innsigelsen viser til varselet i brevet det står i (LV-U4 punkt 7)', () => {
    const { s, id } = medVarsel();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: id });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at TEs varsel om fristforlengelse etter NS 8407 § 33.4 i brev 3 av 3. oktober 2026 kom for sent (NS 8407 § 5 tredje ledd).',
    ]);
  });

  it('svaret på et senere fristkrav vurderer rettidigheten av varselet (MM-U1)', () => {
    const { s, id } = medVarsel();
    const krav = s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(laast(krav)).toEqual(['TE krever fristforlengelse på 20 dager (NS 8407 § 33.6.1).']);
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], frist_varsel_ok: false },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const standpunkt = ((rad.data.svar as Data[])[0].standpunkter as Data[]).find(
      (p) => p.art === 'rettidighet'
    );
    expect(standpunkt?.gjelder).toBe(id);
    expect(laast(rad)[0]).toContain(
      'byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev 3 av 3. oktober 2026 kom for sent.'
    );
  });

  it('et fristkrav kan ikke oppgi en dato for varselet appen sendte (SK-12)', () => {
    const { s } = medVarsel();
    expect(s.avvist('TE', { ...FRISTKRAV, varsel: { sendt: '2026-10-03' } })).toBe(
      'VARSEL_REGISTRERT'
    );
    expect(s.avvist('TE', utenFelt(FRISTKRAV, 'varsel'))).toBeNull();
  });
});

describe('varselet etter § 34.1.2 (OV-U5, #1096)', () => {
  const sendVarsel = { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.2' };
  const vederlagskrav = {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', beloep: 125000 },
  };
  /** Grunnlaget i brev 2; `hovedkategori` avgjør om § 34.1.2 gjelder (§ 34.1.1, KA-46). */
  const medGrunnlag = (hovedkategori: 'svikt' | 'endring') => {
    const s = sak();
    s.send(
      'TE',
      hovedkategori === 'svikt'
        ? {
            ...GRUNNLAGSKRAV,
            innhold: {
              hovedkategori,
              underkategori: 'medvirkning',
              tittel: 'Sene tegninger',
              ...KLAR_OVER,
            },
          }
        : GRUNNLAGSKRAV
    );
    return s;
  };
  /** Varselet fra appen i brev 3. */
  const medVarsel = (hovedkategori: 'svikt' | 'endring' = 'svikt') => {
    const s = medGrunnlag(hovedkategori);
    const varsel = s.send('TE', sendVarsel);
    return { s, varsel, id: (varsel.data.utsagn as Data[])[0].id as string };
  };
  const svarMedPaaberopelse = (s: ReturnType<typeof sak>) =>
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: false },
          { resultat: 'avslaatt', godkjent_beloep: 0 }
        ),
      ],
    });

  it('brevet er varselet, uten beløp og uten en oppgitt dato, med teksten i LV-U19', () => {
    const { varsel, id } = medVarsel();
    expect(tekst(varsel)).toEqual([
      {
        gjelder: id,
        laast: `TE varsler etter NS 8407 § 34.1.2 at TE vil kreve justering av vederlaget som følge av forholdet ${I_SAKEN}.`,
      },
    ]);
    // VS-U8: datoen er serverens, så brevet har ingen opplysning om når det ble sendt.
    expect(varsel.data.opplysninger).toBeUndefined();
    expect(varsel.data.utsagn).toEqual([{ id, art: 'varsel', hjemmel: '34.1.2' }]);
  });

  it('der TE krever endring, godtas varselet uten virkning (OV-U15)', () => {
    const { s } = medVarsel('endring');
    expect(s.u().spor.vederlag.varsel?.hjemmel).toBe('34.1.2');
  });

  it('der TE krever endring, sier visningen at varselet ikke kreves, og ved svikt ikke (OV-U15, § 34.1.1)', () => {
    const etiketter = (kategori: 'endring' | 'svikt') =>
      visning(medGrunnlag(kategori).u(), GJELDENDE_REGLER).spor.vederlag.etiketter;
    expect(etiketter('endring')).toContain('varsel_kreves_ikke');
    expect(etiketter('svikt')).not.toContain('varsel_kreves_ikke');
  });

  it('et varsel sendt utenfor appen registreres med datoen og brevet, uten tekst fra appen (OV-U5, MM-U17)', () => {
    const s = medGrunnlag('svikt');
    const rad = s.send('TE', {
      type: 'varsel',
      spor: 'vederlag',
      hjemmel: '34.1.2',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    expect(rad.data.brevtekst).toBeUndefined();
    expect(rad.data.opplysninger).toMatchObject([{ hva: 'sendt', dato: '2026-09-28' }]);
    expect(s.u().spor.vederlag.varsel?.dokument).toBe(rad.event_id);
  });

  it('varselet etter § 34.1.2 står i vederlaget, og varselet etter § 33.4 i fristen (OV-U5)', () => {
    const s = medGrunnlag('svikt');
    expect(s.avvist('TE', { ...sendVarsel, spor: 'frist' })).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', { ...sendVarsel, hjemmel: '33.4' })).toBe('UGYLDIG_FORM');
  });

  it('et nytt varsel fra appen etter vederlagskravet avvises, og et tidligere varsel kan registreres (OV-U5, VS-U16)', () => {
    const s = medGrunnlag('svikt');
    s.send('TE', vederlagskrav);
    expect(s.avvist('TE', sendVarsel)).toBe('VEDERLAGSKRAV_SENDT');
    const registrering = {
      type: 'varsel',
      spor: 'vederlag',
      hjemmel: '34.1.2',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    };
    s.send('TE', registrering);
    // SK-12: datoen settes én gang.
    expect(s.avvist('TE', { ...registrering, dokumentasjon: [randomUUID()] })).toBe(
      'VARSEL_REGISTRERT'
    );
  });

  it('svaret påberoper at varselet før svaret kom for sent, og brevet nevner brevet varselet står i (VS-U20, LV-U21)', () => {
    const { s, id } = medVarsel();
    s.send('TE', vederlagskrav);
    const rad = svarMedPaaberopelse(s);
    const standpunkt = ((rad.data.svar as Data[])[1].standpunkter as Data[]).find(
      (p) => p.art === 'rettidighet'
    );
    expect(standpunkt?.gjelder).toBe(id);
    expect(laast(rad)[1]).toContain(
      'byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev 3 av 3. oktober 2026 kom for sent.'
    );
  });

  it('uten eget varsel gjelder påberopelsen det første vederlagskravet, og brevet nevner brevet med kravet (OV-U5, LV-U21)', () => {
    const s = medGrunnlag('svikt');
    s.send('TE', vederlagskrav);
    const rad = svarMedPaaberopelse(s);
    const standpunkt = ((rad.data.svar as Data[])[1].standpunkter as Data[]).find(
      (p) => p.art === 'rettidighet'
    );
    expect(standpunkt?.gjelder).toBe(s.krav('vederlag'));
    expect(laast(rad)[1]).toContain(
      'byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev 3 av 3. oktober 2026 kom for sent.'
    );
  });

  it('en innsigelse mot varselet er en påberopelse etter § 34.1.2, og svaret gjentar den (VS-U24, VS-U11)', () => {
    const { s, id } = medVarsel();
    const innsigelse = s.send('BH', { type: 'innsigelse', gjelder: id });
    expect(laast(innsigelse)).toEqual([
      'Byggherren gjør gjeldende at TEs varsel om vederlagsjustering etter NS 8407 § 34.1.2 i brev 3 av 3. oktober 2026 kom for sent (NS 8407 § 5 tredje ledd).',
    ]);
    s.send('TE', vederlagskrav);
    expect(laast(svarMedPaaberopelse(s))[1]).toContain(
      'kom for sent, jf. innsigelsen i brev 4 av 4. oktober 2026.'
    );
  });

  it('der TE krever endring, avvises innsigelsen mot varselet som vurderingen (KA-46, OV-U15)', () => {
    const { s, id } = medVarsel('endring');
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: id })).toBe('VARSLINGSPLIKT_GJELDER_IKKE');
  });

  it('etter «i tide» i et svar fra appen avvises en innsigelse mot varselet (HF-U4, VS-U24)', () => {
    const { s, id } = medVarsel();
    s.send('TE', vederlagskrav);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: true },
          VEDERLAG_DELVIS[1]
        ),
      ],
    });
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: id })).toBe('SAGT_I_TIDE');
  });
});

describe('vedleggene står i teksten (A4)', () => {
  const dokument = (filnavn: string[]): Dokument => ({
    id: 'brevet',
    avsender: 'TE',
    registrert: '2026-10-05T10:00:00Z',
    opplysninger: [],
    dokumentasjon: filnavn.map((f) => ({
      vedlegg_id: randomUUID(),
      filnavn: f,
      innhold_sha256: '0'.repeat(64),
    })),
    krav: [],
    svar: [],
    utsagn: [{ id: 'u', art: 'ingen_krav', spor: 'frist' }],
    brevtekst: null,
    beskrivelse: null,
    spor: [],
    retter: null,
    ikkeISaken: false,
  });
  const saken = {
    saksnummer: SAK,
    tittel: TITTEL,
    grunnlagssvar: null,
    subsidiaer: { vederlag: [], frist: [] },
  };

  it('et brev med vedlegg får et avsnitt som lister filnavnene og gjelder dokumentet (arbeidsvalg 10 i #790)', () => {
    const t = lagBrevtekst(dokument(['tegning-12.pdf', 'referat-4.pdf']), [], saken, KJERNE.regler);
    expect(t.at(-1)).toEqual({
      gjelder: 'brevet',
      laast: 'Brevet har vedlegg: «tegning-12.pdf» og «referat-4.pdf».',
    });
  });

  it('kontrollsak: et brev uten vedlegg har ikke avsnittet', () => {
    const t = lagBrevtekst(dokument([]), [], saken, KJERNE.regler);
    expect(t.map((a) => a.gjelder)).toEqual(['u']);
  });
});

describe('leseren kontrollerer brevteksten (HF-U1, MM-U17)', () => {
  const lest = (rader: Journalrad[]) => lesJournal(rader, KJERNE.leserformat).at(-1)!;
  const medTekst = (endre: (data: Data, rad: Journalrad) => void) => {
    const s = sakMedKrav();
    const rad = structuredClone(s.journal.at(-1)!);
    // Fristkravet uten brevet med varselet (OV-U5), så avsnittene er kravet og varselet.
    delete rad.data.dokumentasjon;
    rad.data.brevtekst = tekst(rad).filter((a) => a.gjelder !== rad.event_id);
    endre(rad.data, rad);
    return lest([...s.journal.slice(0, -1), rad]);
  };

  it('kontrollsak: brevet slik kjernen skrev det, er forstått og har teksten', () => {
    const h = medTekst(() => {});
    expect(h.art).toBe('dokument');
    expect(h.art === 'dokument' && h.dokument.brevtekst?.length).toBe(2);
  });

  it('et avsnitt som ikke gjelder et element i brevet, gjør raden ikke forstått', () => {
    const h = medTekst((d) => ((d.brevtekst as Avsnitt[])[0].gjelder = randomUUID()));
    expect(h.art).toBe('ukjent');
  });

  it('et avsnitt for dokumentet uten vedlegg gjør raden ikke forstått (A4)', () => {
    expect(medTekst((d, r) => ((d.brevtekst as Avsnitt[])[0].gjelder = r.event_id)).art).toBe(
      'ukjent'
    );
    // Kontrollsak: med vedlegg kan et avsnitt gjelde dokumentet.
    const h = medTekst((d, r) => {
      d.dokumentasjon = [
        { vedlegg_id: randomUUID(), filnavn: 'tegning.pdf', innhold_sha256: '0'.repeat(64) },
      ];
      (d.brevtekst as Avsnitt[]).push({
        gjelder: r.event_id,
        laast: 'Brevet har vedlegg: «tegning.pdf».',
      });
    });
    expect(h.art).toBe('dokument');
  });

  it('to avsnitt for samme element gjør raden ikke forstått', () => {
    const h = medTekst((d) => {
      const t = d.brevtekst as Avsnitt[];
      expect(t, 'forutsetning: fristkravet og varselet har hvert sitt avsnitt').toHaveLength(2);
      t[1].gjelder = t[0].gjelder;
    });
    expect(h.art).toBe('ukjent');
  });

  it('brevtekst i et registrert brev gjør raden ikke forstått', () => {
    const h = medTekst((d) => {
      d.opplysninger = [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }];
    });
    expect(h.art).toBe('ukjent');
  });
});

describe('gjengivelsen er tro mot den frosne teksten (LV-U2)', () => {
  const avsnitt: Avsnitt[] = [
    { gjelder: 'a', laast: 'Byggherren avslår grunnlaget.', utdypning: 'Fordi\nalt var kjent.' },
    { gjelder: 'b', laast: 'Byggherren godkjenner 10 dager av de krevde 20 dager.' },
  ];

  it('kontrollsak: gjengivelsen og en gjengivelse med andre linjeskift er tro', () => {
    expect(gjengirTro(gjengi(avsnitt), avsnitt)).toBe(true);
    expect(gjengirTro(`Brev 5\n${gjengi(avsnitt).replace(/ /g, '\n')}\nSide 1 av 1`, avsnitt)).toBe(
      true
    );
  });

  it.each([
    ['et avsnitt mangler', gjengi([avsnitt[0]])],
    ['utdypningen mangler', gjengi([{ ...avsnitt[0], utdypning: undefined }, avsnitt[1]])],
    ['et ord er endret', gjengi(avsnitt).replace('10 dager', '12 dager')],
    ['rekkefølgen er byttet', gjengi([avsnitt[1], avsnitt[0]])],
  ])('ikke tro når %s', (_n, gjengitt) => {
    expect(gjengirTro(gjengitt, avsnitt)).toBe(false);
  });
});

describe('formen på tall og datoer', () => {
  it('beløpet rundes til hele øre som reglene runder (B-13)', () => {
    expect(kroner(1.005)).toBe('1,01\u00a0kr');
    expect(kroner(0.004)).toBe('0\u00a0kr');
  });

  it('en dato som ikke finnes i kalenderen, avvises i kommandoen', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    for (const sendt of ['02.10.2026', '2026-13-45', 'xxxxxxxxxx'])
      expect(s.avvist('TE', { ...FRISTKRAV, varsel: { sendt } })).toBe('UGYLDIG_FORM');
    expect(
      s.avvist('TE', {
        type: 'varsel',
        spor: 'frist',
        hjemmel: '33.4',
        sendt: '2026-02-30',
        dokumentasjon: [randomUUID()],
      })
    ).toBe('UGYLDIG_FORM');
  });

  it('kroner og datoer i Oslo', () => {
    expect(kroner(125000)).toBe('125 000 kr');
    expect(kroner(1234567.5)).toBe('1 234 567,50 kr');
    expect(norskDato('2026-09-28')).toBe('28. september 2026');
    // Klokka 23.30 UTC 31.12 er 1. januar i Oslo.
    expect(norskDato('2026-12-31T23:30:00Z')).toBe('1. januar 2027');
  });

  // T1 i #770 (#766, #472): brevet og kontrollene leser datoen med samme kalenderdag.
  it.each([
    ['2026-10-02', '2026-10-02'],
    ['2026-10-02T22:30:00Z', '2026-10-03'],
    ['2026-10-02T23:30:00+02:00', '2026-10-02'],
    ['2026-10-02T23:30:00', null],
    ['2026-02-30', null],
    ['2026-02-30T10:00:00Z', null],
    ['2026-10-02T24:00:00+02:00', null],
    ['2. oktober', null],
  ])('kalenderdagen for %s er %s', (dato, dag) => {
    expect(kalenderdag(dato)).toBe(dag);
    if (dag === null) expect(() => norskDato(dato)).toThrow(KanIkkeUttrykkes);
    else expect(norskDato(dato)).toBe(norskDato(dag));
  });
});

function utenFelt(k: Data, felt: string): Data {
  return Object.fromEntries(Object.entries(k).filter(([n]) => n !== felt));
}

function esc(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * #304, MM-U2: en vurdering kjernen ennå ikke har et standpunkt for, avvises og forenkles
 * ikke. Kontrollsaken er samme svar uten vurderingen.
 */
describe('en vurdering kjernen ikke har et standpunkt for, avvises', () => {
  const brev = (...svar: Data[]) => ({ type: 'brev', svar });

  it.each([
    [
      'vederlag',
      'tilbakeholdelse etter § 30.2',
      { ...VEDERLAG_DELVIS[0], hold_tilbake: true },
      VEDERLAG_DELVIS[1],
    ],
  ] as [string, string, Data, Data][])('%s: %s', (spor, _n, vurderinger, resultat) => {
    const s = sakMedKrav();
    expect(s.avvist('BH', brev(svar(spor, s.krav(spor as 'frist'), vurderinger, resultat)))).toBe(
      'VURDERING_UTENFOR_KJERNEN'
    );
    const uten = Object.fromEntries(
      Object.entries(vurderinger).filter(([k]) => k !== 'hold_tilbake')
    );
    expect(s.avvist('BH', brev(svar(spor, s.krav(spor as 'frist'), uten, resultat)))).toBeNull();
  });
});

describe('et «i tide» fra appen binder byggherren (HF-U4, HF-U8, #498)', () => {
  type Sak = ReturnType<typeof sak>;
  type Sporet = 'grunnlag' | 'vederlag' | 'frist';

  /** Svaret med serverens utregning, så bare påberopelsen kan gi en avvisning. */
  const utregnet = (s: Sak, spor: Sporet, v: Data) => {
    const u = s.u();
    const krav = gjeldendeKrav(u, spor);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(spor, v, { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav }, KJERNE.regler)
    );
  };
  const brev = (s: Sak, spor: Sporet, v: Data) =>
    s.send('BH', { type: 'brev', svar: [utregnet(s, spor, v)] });
  const revisjon = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor[spor].gjeldendeSvar!.id,
    svar: utregnet(s, spor, v),
  });
  const nyttSvar = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'brev',
    svar: [utregnet(s, spor, v)],
  });

  /** Delvis godkjent, så svaret ikke gir enighet ved sammenfall (GR-U10). */
  const iTide = {
    frist_varsel_ok: true,
    spesifisert_krav_ok: true,
    vilkar_oppfylt: true,
    dager: 10,
  };
  const forSent334 = { ...iTide, frist_varsel_ok: false };
  const forSent3361 = { ...iTide, spesifisert_krav_ok: false, dager_maatte_forstaa: 5 };

  describe('§ 33.4', () => {
    it('en revisjon som påberoper «for sent» etter «i tide», avvises, og resten av svaret kan revideres', () => {
      const s = sakMedKrav();
      brev(s, 'frist', iTide);
      expect(
        s.avvist('BH', revisjon(s, 'frist', { ...iTide, dager: 15 })),
        'kontrollsak'
      ).toBeNull();
      expect(s.avvist('BH', revisjon(s, 'frist', forSent334))).toBe('SAGT_I_TIDE');
    });

    it('et svar på en senere kravversjon kan ikke påberope «for sent» (HF-U4: står mot hver senere kravversjon)', () => {
      const s = sakMedKrav();
      brev(s, 'frist', iTide);
      s.send('TE', { type: 'krav', spor: 'frist', innhold: { dager: 25 }, utdypning: 'Mer.' });
      expect(s.avvist('BH', nyttSvar(s, 'frist', iTide)), 'kontrollsak').toBeNull();
      expect(s.avvist('BH', nyttSvar(s, 'frist', forSent334))).toBe('SAGT_I_TIDE');
    });

    it('«i tide» står også på en ny grunnlagsversjon', () => {
      const s = sakMedKrav();
      brev(s, 'frist', iTide);
      s.send('TE', {
        ...GRUNNLAGSKRAV,
        innhold: { ...GRUNNLAGSKRAV.innhold, tittel: 'Ny peling 2' },
      });
      expect(s.u().spor.grunnlag.krav.length, 'forutsetning: ny grunnlagsversjon').toBe(2);
      expect(s.avvist('BH', revisjon(s, 'frist', forSent334))).toBe('SAGT_I_TIDE');
    });

    it('«i tide» om det første fristkravet binder også når TE registrerer et tidligere sendt varsel (oppdragsgiver 15.10, #498)', () => {
      const s = sak();
      s.send('TE', GRUNNLAGSKRAV);
      s.send('TE', {
        type: 'krav',
        spor: 'frist',
        innhold: { dager: 20 },
        utdypning: 'Fire uker.',
      });
      brev(s, 'frist', iTide);
      s.send('TE', {
        type: 'varsel',
        spor: 'frist',
        hjemmel: '33.4',
        sendt: '2026-09-01',
        dokumentasjon: [randomUUID()],
      });
      expect(s.u().spor.frist.varsel, 'forutsetning: varselet er registrert').not.toBeNull();
      expect(s.avvist('BH', revisjon(s, 'frist', forSent334))).toBe('SAGT_I_TIDE');
    });

    it('kontrollsak: «for sent» kan stå i en revisjon av et svar som sa «for sent»', () => {
      const s = sakMedKrav();
      brev(s, 'frist', forSent334);
      expect(s.avvist('BH', revisjon(s, 'frist', { ...forSent334, dager: 15 }))).toBeNull();
    });

    it('et registrert svar med «i tide» binder ikke, og byggherren kan svare «for sent» fra appen (HF-U4, OV-U4)', () => {
      const s = sakMedKrav();
      const u = s.u();
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'frist',
            gjelder: s.krav('frist'),
            grunnlagskrav: u.spor.grunnlag.gjeldendeKrav!.id,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: u.spor.frist.varsel!.id,
                hjemmel: '33.4',
                i_tide: true,
              },
              { id: randomUUID(), art: 'dager' },
            ],
            utregning: { resultat: 'delvis_godkjent', godkjent_dager: 10 },
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      });
      const etter = s.u();
      expect(etter.forstaatt, JSON.stringify(etter.begrensninger)).toBe(true);
      expect(
        etter.spor.frist.gjeldendeSvar,
        'det registrerte svaret er dokumentasjon (OV-U4)'
      ).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, 'frist', forSent334))).toBeNull();
    });
  });

  describe('§ 33.6.1', () => {
    it('en revisjon som sier at kravversjonen ble spesifisert for sent etter «i tide», avvises', () => {
      const s = sakMedKrav();
      brev(s, 'frist', iTide);
      expect(s.avvist('BH', revisjon(s, 'frist', forSent3361))).toBe('SAGT_I_TIDE');
    });

    it('«i tide» etter § 33.6.1 sier ingenting om § 33.4 (HF-U4)', () => {
      const s = sakMedKrav();
      brev(s, 'frist', { ...iTide, frist_varsel_ok: false, dager: 12 });
      // HF-U5: revisjonen beholder de 12 dagene, så bare påberopelsen sammenliknes.
      expect(s.avvist('BH', revisjon(s, 'frist', { ...forSent334, dager: 12 }))).toBeNull();
    });

    it('«i tide» etter § 33.4 sier ingenting om § 33.6.1, som gjelder kravversjonen (HF-U4, HF-U1)', () => {
      const s = sakMedKrav();
      brev(s, 'frist', iTide);
      s.send('TE', { type: 'krav', spor: 'frist', innhold: { dager: 25 }, utdypning: 'Mer.' });
      expect(s.avvist('BH', nyttSvar(s, 'frist', forSent3361))).toBeNull();
    });
  });

  describe('§ 32.2', () => {
    const avslaatt = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
    const forSentGrunnlag = { ...avslaatt, grunnlag_varslet_i_tide: false };

    it('en revisjon som påberoper «for sent» etter «i tide», avvises', () => {
      const s = sakMedKrav();
      brev(s, 'grunnlag', avslaatt);
      expect(
        s.avvist('BH', revisjon(s, 'grunnlag', { ...avslaatt, resultat: 'godkjent' })),
        'kontrollsak'
      ).toBeNull();
      expect(s.avvist('BH', revisjon(s, 'grunnlag', forSentGrunnlag))).toBe('SAGT_I_TIDE');
    });

    it('«i tide» står mot en senere grunnlagsversjon med samme hjemmel (HF-U8, GR-U22)', () => {
      const s = sakMedKrav();
      brev(s, 'grunnlag', avslaatt);
      s.send('TE', {
        ...GRUNNLAGSKRAV,
        innhold: { ...GRUNNLAGSKRAV.innhold, tittel: 'Ny peling, utvidet' },
      });
      expect(s.avvist('BH', nyttSvar(s, 'grunnlag', avslaatt)), 'kontrollsak').toBeNull();
      expect(s.avvist('BH', nyttSvar(s, 'grunnlag', forSentGrunnlag))).toBe('SAGT_I_TIDE');
    });

    it('«for sent» etter § 32.2 på en registrert versjon i svikt avvises av utregningen, ikke som «i tide» (#520, GR-U11, MM-U18)', () => {
      const s = sakMedKrav();
      brev(s, 'grunnlag', avslaatt);
      s.rad('TE', {
        krav: [
          {
            id: randomUUID(),
            spor: 'grunnlag',
            erstatter: s.krav('grunnlag'),
            hovedkategori: 'svikt',
            underkategori: 'grunnforhold',
          },
        ],
      });
      const uten = { resultat: 'avslaatt' };
      expect(s.avvist('BH', nyttSvar(s, 'grunnlag', uten)), 'kontrollsak').toBeNull();
      const { resultat } = utregnet(s, 'grunnlag', uten);
      const medFelt = svar('grunnlag', s.krav('grunnlag'), forSentGrunnlag, resultat as Data);
      expect(s.avvist('BH', { type: 'brev', svar: [medFelt] })).toBe('UGYLDIG_VURDERING');
    });
  });

  describe('§ 34.1.2', () => {
    const delvis = {
      hovedkrav_vurdering: 'delvis',
      hovedkrav_godkjent_belop: 100000,
      aksepterer_metode: true,
    };
    const sakISvikt = () => {
      const s = sak();
      s.send('TE', {
        ...GRUNNLAGSKRAV,
        innhold: {
          hovedkategori: 'svikt',
          underkategori: 'grunnforhold',
          tittel: 'Kvikkleire',
          ...KLAR_OVER,
        },
      });
      s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: { metode: 'tilbud', beloep: 125000 },
      });
      return s;
    };

    it('en revisjon som påberoper «for sent» etter «i tide», avvises', () => {
      const s = sakISvikt();
      brev(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: true });
      expect(
        s.avvist(
          'BH',
          revisjon(s, 'vederlag', {
            ...delvis,
            hovedkrav_varslet_i_tide: true,
            hovedkrav_godkjent_belop: 110000,
          })
        ),
        'kontrollsak'
      ).toBeNull();
      expect(
        s.avvist('BH', revisjon(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: false }))
      ).toBe('SAGT_I_TIDE');
    });
  });
});

/**
 * GR-U22: når grunnlaget er sendt, står hovedkategorien og underkategorien, også når § 32.2
 * gjelder likt. En ny versjon med samme hjemmel er tillatt (GR-U1), og endringsordrens dato
 * eller nummer kan rettes (GR-U16, arbeidsvalg 2 i kartleggingen 16.10 på #569).
 */
describe('en ny grunnlagsversjon beholder hjemmelen (GR-U22)', () => {
  const versjon = (innhold: Data) => ({
    ...GRUNNLAGSKRAV,
    innhold: { tittel: 'Ny peling', ...innhold },
  });
  const endringsordre = {
    hovedkategori: 'endring',
    underkategori: 'endringsordre',
    endringsordre: 'EO-1',
  };
  const svikt = { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER };

  it.each([
    ['irregulær endring til svikt', null, svikt, 'ANNEN_HJEMMEL'],
    // #551: § 32.2 gjelder ingen av versjonene, så bare hovedkategorien skiller dem.
    [
      'svikt til andre forhold',
      svikt,
      { hovedkategori: 'andre_forhold', underkategori: 'skade_fra_byggherren', ...KLAR_OVER },
      'ANNEN_HJEMMEL',
    ],
    [
      'grunnforhold til medvirkning, i samme hovedkategori',
      svikt,
      { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
      'ANNEN_HJEMMEL',
    ],
    ['irregulær endring til endringsordre', null, endringsordre, 'ANNEN_HJEMMEL'],
    ['endringsordre til irregulær endring', endringsordre, GRUNNLAGSKRAV.innhold, 'ANNEN_HJEMMEL'],
    [
      'irregulær endring til lovendring, der § 32.2 gjelder i begge',
      null,
      { hovedkategori: 'endring', underkategori: 'lovendring_gjenstand', ...MOTTATT },
      'ANNEN_HJEMMEL',
    ],
    ['samme hjemmel i irregulær endring', null, GRUNNLAGSKRAV.innhold, null],
    ['samme hjemmel i svikt', svikt, svikt, null],
    [
      'en ny endringsordre med uendret underkategori',
      endringsordre,
      { ...endringsordre, endringsordre: 'EO-2' },
      null,
    ],
  ] as [string, Data | null, Data, string | null][])('%s', (_n, foerste, neste, regel) => {
    const s = sak();
    s.send('TE', foerste ? versjon(foerste) : GRUNNLAGSKRAV);
    expect(s.avvist('TE', versjon(neste))).toBe(regel);
  });

  it('det første grunnlagskravet kan ha enhver kategori', () => {
    const s = sak();
    expect(
      s.avvist(
        'TE',
        versjon({ hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER })
      )
    ).toBeNull();
  });
});

/**
 * GR-U17, GR-U20: et frafall etter § 32.3 c fra appen binder byggherren til
 * endringsordre. Et avslag avvises i en revisjon og i et svar på en ny grunnlagsversjon.
 * Revisjonen fra frafall til frafall er arbeidsvalget 16.10 i #510.
 */
describe('et frafall fra appen kan ikke bli et avslag (GR-U17, GR-U20, #510)', () => {
  type Sak = ReturnType<typeof sak>;
  const frafall = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
  const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const endringsordre = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
  /** Grunnlaget godkjent subsidiært, med påberopelse av at varselet kom for sent. */
  const paaberopelse = { resultat: 'godkjent', grunnlag_varslet_i_tide: false };

  const utregnet = (s: Sak, v: Data) => {
    const u = s.u();
    const krav = u.spor.grunnlag.gjeldendeKrav!;
    return svar(
      'grunnlag',
      krav.id,
      v,
      regnUtSvar('grunnlag', v, { krav, grunnlagskrav: krav }, KJERNE.regler)
    );
  };
  const nyttSvar = (s: Sak, v: Data) => ({ type: 'brev', svar: [utregnet(s, v)] });
  const revisjon = (s: Sak, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor.grunnlag.gjeldendeSvar!.id,
    svar: utregnet(s, v),
  });
  const medFrafall = () => {
    const s = sakMedKrav();
    s.send('BH', nyttSvar(s, frafall));
    expect(s.u().frafalt, 'forutsetning: pålegget er frafalt').toBe(true);
    return s;
  };
  const versjon = (s: Sak, innhold: Data) =>
    s.send('TE', { ...GRUNNLAGSKRAV, innhold: { ...GRUNNLAGSKRAV.innhold, ...innhold } });
  /** Et registrert brev fra byggherren med et svar på gjeldende grunnlagsversjon. */
  const registrertSvar = (s: Sak, resultat: string, sendt: boolean, iTide = true) => {
    const u = s.u();
    const id = randomUUID();
    s.rad('BH', {
      svar: [
        {
          id,
          spor: 'grunnlag',
          gjelder: u.spor.grunnlag.gjeldendeKrav!.id,
          ...(u.spor.grunnlag.gjeldendeSvar ? { erstatter: u.spor.grunnlag.gjeldendeSvar.id } : {}),
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: u.spor.grunnlag.gjeldendeKrav!.id,
              hjemmel: '32.2',
              i_tide: iTide,
            },
            { id: randomUUID(), art: 'grunnlag', resultat },
          ],
        },
      ],
      ...(sendt ? { opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-05' }] } : {}),
    });
    return id;
  };

  describe('revisjonen av frafallet (GR-U17)', () => {
    it('en revisjon fra frafall til avslag avvises', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, avslag))).toBe('FRAFALT');
    });

    it('en revisjon fra frafall til endringsordre godtas', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, endringsordre))).toBeNull();
    });

    it('en revisjon fra frafall til frafall godtas (arbeidsvalget 16.10, #510)', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, frafall))).toBeNull();
    });

    it('en revisjon fra frafall til påberopelse etter § 32.2 avvises som «i tide», fordi frafallet sa «i tide» (#235, HF-U4)', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, paaberopelse))).toBe('SAGT_I_TIDE');
    });

    it('kontrollsak: uten frafall kan et avslag revideres til avslag', () => {
      const s = sakMedKrav();
      s.send('BH', nyttSvar(s, avslag));
      expect(s.avvist('BH', revisjon(s, avslag))).toBeNull();
    });
  });

  describe('en ny grunnlagsversjon etter frafallet (GR-U20, GR-U22)', () => {
    it('med samme hjemmel: byggherren kan svare med frafall eller endringsordre, ikke med avslag', () => {
      const s = medFrafall();
      versjon(s, { tittel: 'Ny peling 2' });
      expect(s.u().spor.grunnlag.krav.length, 'forutsetning: ny grunnlagsversjon').toBe(2);
      expect(s.avvist('BH', nyttSvar(s, frafall))).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, endringsordre))).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, avslag))).toBe('FRAFALT');
      expect(s.avvist('BH', nyttSvar(s, paaberopelse))).toBe('SAGT_I_TIDE');
    });

    it('kontrollsak: etter et avslag kan byggherren avslå en ny grunnlagsversjon', () => {
      const s = sakMedKrav();
      s.send('BH', nyttSvar(s, avslag));
      versjon(s, { tittel: 'Ny peling 2' });
      expect(s.avvist('BH', nyttSvar(s, avslag))).toBeNull();
    });

    it('et registrert frafall binder ikke (OV-U4)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      expect(s.u().frafalt, 'det registrerte frafallet er dokumentasjon').toBe(false);
      expect(s.u().spor.grunnlag.gjeldendeSvar).toBeNull();
      versjon(s, { tittel: 'Ny peling 2' });
      expect(s.avvist('BH', nyttSvar(s, avslag))).toBeNull();
    });
  });

  /**
   * GR-U23: mens en ny grunnlagsversjon etter et frafall venter på svar, er grunnlaget
   * avklart ved frafallet, så en enighet i vederlag eller frist forblir virksom. Etter
   * OV-U3 oppstår tilfellet bare når et annet sendt krav står åpent, her fristkravet.
   */
  describe('mens en ny grunnlagsversjon venter etter frafallet (GR-U23)', () => {
    const vederlagFullt = [
      {
        hovedkrav_vurdering: 'godkjent',
        hovedkrav_godkjent_belop: 125000,
        aksepterer_metode: true,
      },
      { resultat: 'godkjent', godkjent_beloep: 125000 },
    ] as const;
    /** Frafall på grunnlaget og vederlaget godkjent fullt, så partene er enige (GR-U10). */
    const medEnighetIVederlaget = (s: Sak) => {
      s.send('BH', {
        type: 'brev',
        svar: [svar('vederlag', s.krav('vederlag'), vederlagFullt[0], vederlagFullt[1])],
      });
      expect(enighetensVirkning(s.u(), 'vederlag'), 'forutsetning: enighet i vederlaget').toBe(
        'virksom'
      );
      return s;
    };

    it('grunnlaget er avklart ved frafallet, og enigheten i vederlaget forblir virksom', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, { tittel: 'Ny peling 2' });
      const u = s.u();
      expect(u.spor.grunnlag.krav.length, 'forutsetning: ny grunnlagsversjon').toBe(2);
      expect(u.spor.grunnlag.gjeldendeSvar, 'forutsetning: versjon 2 venter på svar').toBeNull();
      expect(u.grunnlagAvklart).toBe(true);
      expect(u.frafalt).toBe(true);
      expect(enighetensVirkning(u, 'vederlag')).toBe('virksom');
      expect(kraveneErAvgjort(u), 'fristkravet står åpent (OV-U3)').toBe(false);
      expect(kanInngaaIEo(u), 'et frafall går ikke inn i en endringsordre (GR-U3)').toBe(false);
    });

    it('byggherrens svar på versjon 2 avløser frafallet som gjeldende svar', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, { tittel: 'Ny peling 2' });
      s.send('BH', nyttSvar(s, endringsordre));
      const u = s.u();
      expect(u.frafalt).toBe(false);
      expect(u.grunnlagAvklart).toBe(true);
      expect(u.endringsordre).toBe('ja');
      expect(enighetensVirkning(u, 'vederlag')).toBe('virksom');
    });

    it('kontrollsak: et registrert frafall avklarer ikke grunnlaget, så enigheten i vederlaget er betinget før og etter versjon 2 (OV-U4, GR-U1)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      s.send('BH', {
        type: 'brev',
        svar: [svar('vederlag', s.krav('vederlag'), vederlagFullt[0], vederlagFullt[1])],
      });
      expect(enighetensVirkning(s.u(), 'vederlag')).toBe('betinget');
      versjon(s, { tittel: 'Ny peling 2' });
      const u = s.u();
      expect(u.grunnlagAvklart).toBe(false);
      expect(u.frafalt).toBe(false);
      expect(enighetensVirkning(u, 'vederlag')).toBe('betinget');
    });

    it('blir fristkravet avgjort mens versjon 2 venter, er kravene avgjort, og svaret på versjon 2 avvises (GR-U24, OV-U3)', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, { tittel: 'Ny peling 2' });
      s.send('BH', {
        type: 'brev',
        svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
      });
      const u = s.u();
      expect(u.spor.grunnlag.gjeldendeSvar, 'forutsetning: versjon 2 venter på svar').toBeNull();
      expect(kraveneErAvgjort(u)).toBe(true);
      expect(kanInngaaIEo(u), 'et frafall går ikke inn i en endringsordre (GR-U3)').toBe(false);
      expect(s.avvist('BH', nyttSvar(s, endringsordre))).toBe('KRAVENE_AVGJORT');
      expect(s.avvist('TE', { type: 'trekk', spor: 'grunnlag' })).toBe('KRAVENE_AVGJORT');
      expect(
        visning(u, GJELDENDE_REGLER).spor.grunnlag.etiketter,
        'versjon 2 vises ikke som ventende (GR-U24)'
      ).not.toContain('venter_paa_svar');
      expect(visning(u, GJELDENDE_REGLER).status?.kode).toBe('alle_krav_avgjort');
    });
  });

  describe('et avslag etter frafallet som ikke kommer gjennom kommandoene (MM-U19, MM-U18, OV-U4)', () => {
    it('et registrert avslag av en ny grunnlagsversjon får ingen virkning, og saken er forstått', () => {
      const s = medFrafall();
      versjon(s, { tittel: 'Ny peling 2' });
      const id = registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(u.forstaatt).toBe(true);
      expect(
        u.spor.grunnlag.svar.map((x) => x.id),
        'svaret er dokumentasjon (OV-U4)'
      ).not.toContain(id);
      expect(u.spor.grunnlag.gjeldendeSvar).toBeNull();
    });

    it('en registrert revisjon fra frafall til avslag får ingen virkning, og frafallet står', () => {
      const s = medFrafall();
      const id = registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(
        u.spor.grunnlag.svar.map((x) => x.id),
        'svaret er dokumentasjon (OV-U4)'
      ).not.toContain(id);
      expect(u.frafalt).toBe(true);
    });

    it('et avslag i et brev som ikke er registrert og ikke er sendt fra appen, gjør saken ikke forstått', () => {
      const s = medFrafall();
      registrertSvar(s, 'avslaatt', false);
      const u = s.u();
      expect(u.forstaatt).toBe(false);
      expect(u.begrensninger.map((b) => b.grunn)).toEqual([
        'et avslag av grunnlaget etter at byggherren har frafalt pålegget (GR-U17, GR-U20)',
      ]);
    });

    it.each([
      ['en registrert revisjon fra frafall', false],
      ['et registrert svar på en ny grunnlagsversjon', true],
    ] as [string, boolean][])(
      '%s til påberopelse etter § 32.2 får ingen virkning, og frafallet står (GR-U17, GR-U20)',
      (_n, nyVersjon) => {
        const s = medFrafall();
        if (nyVersjon) versjon(s, { tittel: 'Ny peling 2' });
        const id = registrertSvar(s, 'godkjent', true, false);
        const u = s.u();
        expect(u.forstaatt).toBe(true);
        expect(
          u.spor.grunnlag.svar.map((x) => x.id),
          'svaret er dokumentasjon (OV-U4)'
        ).not.toContain(id);
        expect(u.spor.grunnlag.gjeldendeSvar?.id).not.toBe(id);
        if (!nyVersjon) expect(u.frafalt).toBe(true);
      }
    );

    it('en påberopelse etter § 32.2 i et brev som ikke er registrert og ikke er sendt fra appen, gjør saken ikke forstått', () => {
      const s = medFrafall();
      registrertSvar(s, 'godkjent', false, false);
      const u = s.u();
      expect(u.forstaatt).toBe(false);
      expect(u.begrensninger.map((b) => b.grunn)).toEqual([
        'en påberopelse etter § 32.2 etter at byggherren har frafalt pålegget (GR-U17, GR-U20)',
      ]);
    });

    it('et registrert avslag etter et registrert frafall er også dokumentasjon, og grunnlaget venter på svar (OV-U4)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(u.forstaatt).toBe(true);
      expect(u.frafalt).toBe(false);
      expect(u.spor.grunnlag.gjeldendeSvar).toBeNull();
    });
  });

  /**
   * T5 i kartleggingen av #770 (#669): hver gren i `strid` og i referansekontrollen har en
   * test som krever den bestemte grunnen. Radene står utenfor kommandoene, som en rad som
   * verken er registrert eller sendt fra appen (MM-U18).
   */
  it('en revisjon av frafallet på versjon 1 til avslag, etter en versjon 2 uten frafall og utenfor kommandoene, gjør saken ikke forstått (arbeidsvalg 3 i #770, #562)', () => {
    const s = medFrafall();
    const foerste = s.u().spor.grunnlag.gjeldendeKrav!.id;
    const frafallet = s.u().spor.grunnlag.gjeldendeSvar!.id;
    // GR-U22: kommandoene kan ikke endre underkategorien, så versjon 2 står utenfor dem.
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'grunnlag',
          erstatter: foerste,
          hovedkategori: 'svikt',
          underkategori: 'grunnforhold',
        },
      ],
    });
    s.rad('BH', {
      svar: [
        {
          id: randomUUID(),
          spor: 'grunnlag',
          gjelder: foerste,
          erstatter: frafallet,
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: foerste,
              hjemmel: '32.2',
              i_tide: true,
            },
            { id: randomUUID(), art: 'grunnlag', resultat: 'avslaatt' },
          ],
        },
      ],
    });
    const u = s.u();
    expect(u.forstaatt).toBe(false);
    expect(u.begrensninger.map((b) => b.grunn)).toContain(
      'et avslag av grunnlaget etter at byggherren har frafalt pålegget (GR-U17, GR-U20)'
    );
  });

  describe('hver grunn i kontrollen mot journalen før brevet (MM-U18, #669)', () => {
    const grunner = (s: Sak) => s.u().begrensninger.map((b) => b.grunn);
    const medEnighet = () => {
      const s = sakMedKrav();
      s.send('BH', nyttSvar(s, endringsordre));
      expect(s.u().spor.grunnlag.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
      return s;
    };
    const raaAksept = (s: Sak, gjelder: string) =>
      s.rad('TE', {
        utsagn: [{ id: randomUUID(), art: 'aksept', gjelder, regelversjon: KJERNE.regler.versjon }],
      });

    it('en revisjon av et svar partene er enige om (GR-U10, KA-U7)', () => {
      const s = medEnighet();
      registrertSvar(s, 'avslaatt', false);
      expect(grunner(s)).toEqual(['en revisjon av et svar partene er enige om (GR-U10, KA-U7)']);
    });

    it('en aksept av et svar partene alt er enige om (GR-U8, KA-U7)', () => {
      const s = medEnighet();
      raaAksept(s, s.u().spor.grunnlag.gjeldendeSvar!.id);
      // Leseren avviser også aksepten av et sammenfall (GR-U8).
      expect(grunner(s)).toContain('en aksept av et svar partene alt er enige om (GR-U8, KA-U7)');
    });

    it('en aksept av et svar i et spor etter at kravet er trukket (MM-U20, GR-U5)', () => {
      const s = sakMedKrav();
      s.send('BH', {
        type: 'brev',
        svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
      });
      const svaret = s.u().spor.vederlag.gjeldendeSvar!.id;
      s.send('TE', { type: 'trekk', spor: 'vederlag' });
      raaAksept(s, svaret);
      expect(grunner(s)).toEqual([
        'en aksept av et svar i et spor etter at kravet er trukket (MM-U20, GR-U5)',
      ]);
    });

    /** Byggherrens registrerte endringsordre (OV-U6) etter trekket av grunnlaget, uten virkning. */
    const endringsordreUtenVirkning = () => {
      const s = sakMedKrav();
      const krav = s.krav('grunnlag');
      s.send('TE', { type: 'trekk', spor: 'grunnlag' });
      const id = randomUUID();
      s.rad('BH', {
        svar: [
          {
            id,
            spor: 'grunnlag',
            gjelder: krav,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: krav,
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'grunnlag', resultat: 'godkjent' },
            ],
          },
        ],
        opplysninger: [
          { id: randomUUID(), hva: 'sendt', dato: '2026-10-06' },
          { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
        ],
      });
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(
        u.utenVirkning.map((x) => x.element),
        'forutsetning: endringsordren har ingen virkning'
      ).toEqual([id]);
      return { s, id };
    };

    it('OV-U19, MM-U19: en endringsordre uten virkning er vurdert av appen og gir ikke merknaden om brev utenfor appen; et brev registrert som dokumentasjon gir den', () => {
      const { s } = endringsordreUtenVirkning();
      const foer = visning(s.u(), GJELDENDE_REGLER);
      expect(foer.merknader).toContain('registrert_brev_uten_virkning');
      expect(foer.merknader).not.toContain('brev_utenfor_appen');
      expect(harIkkeVurdertBrev(s.u()), 'statusteksten og sakslisten').toBe(false);
      s.rad('BH', {
        beskrivelse: 'Brev om fremdriften',
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-06' }],
        dokumentasjon: [
          { vedlegg_id: randomUUID(), filnavn: 'brev.pdf', innhold_sha256: 'a'.repeat(64) },
        ],
      });
      expect(s.u().forstaatt, 'forutsetning').toBe(true);
      expect(visning(s.u(), GJELDENDE_REGLER).merknader, 'kontrollsak').toContain(
        'brev_utenfor_appen'
      );
      expect(harIkkeVurdertBrev(s.u()), 'kontrollsak').toBe(true);
    });

    it('en revisjon av et svar uten virkning (MM-U18)', () => {
      const { s, id } = endringsordreUtenVirkning();
      const krav = s.u().spor.grunnlag.krav[0].id;
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'grunnlag',
            gjelder: krav,
            erstatter: id,
            standpunkter: [{ id: randomUUID(), art: 'grunnlag', resultat: 'avslaatt' }],
          },
        ],
      });
      // Leseren avviser også kjeden, fordi svaret uten virkning ikke er lest inn i sporet.
      expect(grunner(s)).toContain('svaret viser til et element uten virkning');
    });

    it('en innsigelse mot egen endringsordre uten virkning viser ikke til noe den kan gjelde (VS-U1, MM-U18)', () => {
      const { s, id } = endringsordreUtenVirkning();
      const innsigelse = randomUUID();
      s.rad('BH', { utsagn: [{ id: innsigelse, art: 'innsigelse', gjelder: id }] });
      expect(s.u().forstaatt).toBe(false);
      expect(grunner(s)).toContain('innsigelse viser ikke til noe den kan gjelde før den');
    });
  });
});

/**
 * HF-U5, HF-U14, HF-U21: en revisjon av et svar TE ikke har godtatt, kan ikke senke noe
 * byggherren har innrømmet i svaret. Sammenlikningen gjøres standpunkt for standpunkt, og
 * en revisjon som senker ett standpunkt, avvises også når den hever et annet. Hvilke
 * standpunkter som sammenliknes, står i arbeidsvalgene 16.10 på #502.
 */
describe('en revisjon godtas bare i TEs favør (HF-U5, HF-U14, HF-U21, #502)', () => {
  type Sak = ReturnType<typeof sak>;
  type Sporet = 'grunnlag' | 'vederlag' | 'frist';

  /** Svaret med serverens utregning, så bare sammenlikningen kan gi en avvisning. */
  const utregnet = (s: Sak, spor: Sporet, v: Data) => {
    const u = s.u();
    const krav = gjeldendeKrav(u, spor);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(spor, v, { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav }, KJERNE.regler)
    );
  };
  const brev = (s: Sak, spor: Sporet, v: Data) =>
    s.send('BH', { type: 'brev', svar: [utregnet(s, spor, v)] });
  const revisjon = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor[spor].gjeldendeSvar!.id,
    svar: utregnet(s, spor, v),
  });
  const nyttSvar = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'brev',
    svar: [utregnet(s, spor, v)],
  });

  /** 100 000 av 125 000 kr, så svaret ikke gir enighet ved sammenfall (GR-U10). */
  const delvis = {
    hovedkrav_vurdering: 'delvis',
    hovedkrav_godkjent_belop: 100000,
    aksepterer_metode: true,
  };
  const beloep = (n: number) => ({ ...delvis, hovedkrav_godkjent_belop: n });
  /** 10 av 20 dager. */
  const dager = {
    frist_varsel_ok: true,
    spesifisert_krav_ok: true,
    vilkar_oppfylt: true,
    dager: 10,
  };

  describe('vederlaget', () => {
    it('et lavere godkjent beløp avvises, og meldingen sier hva som senkes', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      expect(s.avvist('BH', revisjon(s, 'vederlag', beloep(110000))), 'kontrollsak').toBeNull();
      const a = s.avvisning('BH', revisjon(s, 'vederlag', beloep(80000)));
      expect(a?.regel).toBe('SENKER_INNROEMMELSE');
      expect(a?.melding).toContain(`godkjenner ${kroner(100000)}`);
      expect(a?.melding).toContain(`til ${kroner(80000)}`);
    });

    it('et beløp som står likt, godtas, også når det er det eneste i revisjonen', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      expect(s.avvist('BH', revisjon(s, 'vederlag', delvis))).toBeNull();
    });

    it('beløpet sammenliknes til hele øre (B-13)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', beloep(100000.5));
      expect(s.avvist('BH', revisjon(s, 'vederlag', beloep(100000.49)))).toBe(
        'SENKER_INNROEMMELSE'
      );
      expect(s.avvist('BH', revisjon(s, 'vederlag', beloep(100000.501))), 'kontrollsak').toBeNull();
    });

    it('aksepten av beregningsmåten kan ikke tas tilbake, men en aksept kan gis (HF-U14)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      const uten = { ...delvis, aksepterer_metode: false, oensket_metode: 'enhetspriser' };
      expect(s.avvist('BH', revisjon(s, 'vederlag', uten))).toBe('SENKER_INNROEMMELSE');

      const kontroll = sakMedKrav();
      brev(kontroll, 'vederlag', uten);
      expect(
        kontroll.avvist('BH', revisjon(kontroll, 'vederlag', delvis)),
        'kontrollsak'
      ).toBeNull();
    });

    it('sammenliknes med svaret revisjonen erstatter, ikke det første svaret på kravversjonen', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      s.send('BH', revisjon(s, 'vederlag', beloep(120000)));
      expect(s.avvist('BH', revisjon(s, 'vederlag', beloep(110000)))).toBe('SENKER_INNROEMMELSE');
    });

    it('byggherrens ønskede metode kan endres når tilbudet ikke er akseptert (MM-U12)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', { ...delvis, aksepterer_metode: false, oensket_metode: 'enhetspriser' });
      expect(
        s.avvist(
          'BH',
          revisjon(s, 'vederlag', {
            ...delvis,
            aksepterer_metode: false,
            oensket_metode: 'regningsarbeid',
          })
        )
      ).toBeNull();
    });

    it('en blandet revisjon som hever beløpet og tar tilbake aksepten, avvises', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      expect(
        s.avvist(
          'BH',
          revisjon(s, 'vederlag', {
            ...beloep(120000),
            aksepterer_metode: false,
            oensket_metode: 'enhetspriser',
          })
        )
      ).toBe('SENKER_INNROEMMELSE');
    });

    describe('subsidiært etter § 34.1.2', () => {
      const sakISvikt = () => {
        const s = sak();
        s.send('TE', {
          ...GRUNNLAGSKRAV,
          innhold: {
            hovedkategori: 'svikt',
            underkategori: 'grunnforhold',
            tittel: 'Kvikkleire',
            ...KLAR_OVER,
          },
        });
        s.send('TE', {
          type: 'krav',
          spor: 'vederlag',
          innhold: { metode: 'tilbud', beloep: 125000 },
        });
        return s;
      };

      it('subsidiært 100 000 kr kan ikke bli prinsipalt 80 000 kr, selv om preklusjonen gis opp', () => {
        const s = sakISvikt();
        brev(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: false });
        const a = s.avvisning(
          'BH',
          revisjon(s, 'vederlag', { ...beloep(80000), hovedkrav_varslet_i_tide: true })
        );
        expect(a?.regel).toBe('SENKER_INNROEMMELSE');
        expect(a?.melding).toContain(`godkjenner subsidiært ${kroner(100000)}`);
        expect(
          s.avvist('BH', revisjon(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: true })),
          'kontrollsak: prinsipalt 100 000 kr'
        ).toBeNull();
      });
    });
  });

  describe('fristforlengelsen', () => {
    it('færre godkjente dager avvises, flere godtas', () => {
      const s = sakMedKrav();
      brev(s, 'frist', dager);
      expect(
        s.avvist('BH', revisjon(s, 'frist', { ...dager, dager: 12 })),
        'kontrollsak'
      ).toBeNull();
      const a = s.avvisning('BH', revisjon(s, 'frist', { ...dager, dager: 8 }));
      expect(a?.regel).toBe('SENKER_INNROEMMELSE');
      expect(a?.melding).toContain('godkjenner 10 dager');
    });

    it('at fremdriften er hindret (§ 33.1), kan ikke tas tilbake', () => {
      const s = sakMedKrav();
      brev(s, 'frist', dager);
      expect(s.avvist('BH', revisjon(s, 'frist', { ...dager, vilkar_oppfylt: false }))).toBe(
        'SENKER_INNROEMMELSE'
      );

      const kontroll = sakMedKrav();
      brev(kontroll, 'frist', { ...dager, vilkar_oppfylt: false });
      expect(kontroll.avvist('BH', revisjon(kontroll, 'frist', dager)), 'kontrollsak').toBeNull();
    });

    it('dagene byggherren måtte forstå etter § 33.6.1 sammenliknes når begge svar sier «for sent» (VS-U4)', () => {
      const s = sakMedKrav();
      const forSent = { ...dager, spesifisert_krav_ok: false, dager_maatte_forstaa: 5 };
      brev(s, 'frist', forSent);
      expect(s.avvist('BH', revisjon(s, 'frist', { ...forSent, dager_maatte_forstaa: 3 }))).toBe(
        'SENKER_INNROEMMELSE'
      );
      expect(
        s.avvist('BH', revisjon(s, 'frist', { ...forSent, dager_maatte_forstaa: 7 })),
        'kontrollsak'
      ).toBeNull();
      expect(
        s.avvist('BH', revisjon(s, 'frist', dager)),
        'kravet godtas som spesifisert i tide'
      ).toBeNull();
    });
  });

  describe('grunnlaget', () => {
    const forSent = { grunnlag_varslet_i_tide: false };

    it('et grunnlag godkjent subsidiært kan ikke bli avslått eller frafalt (arbeidsvalget 16.10)', () => {
      const s = sakMedKrav();
      brev(s, 'grunnlag', { ...forSent, resultat: 'godkjent' });
      const a = s.avvisning('BH', revisjon(s, 'grunnlag', { ...forSent, resultat: 'avslaatt' }));
      expect(a?.regel).toBe('SENKER_INNROEMMELSE');
      expect(a?.melding).toContain('grunnlaget subsidiært godkjent');
      expect(
        s.avvist(
          'BH',
          revisjon(s, 'grunnlag', { grunnlag_varslet_i_tide: true, resultat: 'paalegg_frafalt' })
        )
      ).toBe('SENKER_INNROEMMELSE');
    });

    it('et avslag kan revideres til godkjenning (HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'grunnlag', { ...forSent, resultat: 'avslaatt' });
      expect(
        s.avvist('BH', revisjon(s, 'grunnlag', { ...forSent, resultat: 'godkjent' }))
      ).toBeNull();
    });

    it('et registrert brev binder ikke, og byggherren kan avslå fra appen (OV-U4)', () => {
      const s = sakMedKrav();
      const u = s.u();
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'grunnlag',
            gjelder: u.spor.grunnlag.gjeldendeKrav!.id,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: u.spor.grunnlag.gjeldendeKrav!.id,
                hjemmel: '32.2',
                i_tide: false,
              },
              { id: randomUUID(), art: 'grunnlag', resultat: 'godkjent' },
            ],
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-05' }],
      });
      expect(
        s.u().spor.grunnlag.gjeldendeSvar,
        'det registrerte svaret er dokumentasjon (OV-U4)'
      ).toBeNull();
      expect(
        s.avvist('BH', nyttSvar(s, 'grunnlag', { ...forSent, resultat: 'avslaatt' }))
      ).toBeNull();
    });
  });

  describe('etter en ny versjon', () => {
    it('bindingen i vederlaget står etter en ny grunnlagsversjon med samme hjemmel (HF-U21)', () => {
      const s = sakMedKrav();
      brev(s, 'grunnlag', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true });
      brev(s, 'vederlag', delvis);
      s.send('TE', {
        ...GRUNNLAGSKRAV,
        innhold: { ...GRUNNLAGSKRAV.innhold, tittel: 'Ny peling, utvidet beskrivelse' },
      });
      expect(
        s.avvist('BH', nyttSvar(s, 'vederlag', beloep(80000))),
        'forutsetning: vederlaget er besvart, så byggherren må revidere'
      ).toBe('ALLEREDE_SVART');
      expect(s.avvist('BH', revisjon(s, 'vederlag', beloep(80000)))).toBe('SENKER_INNROEMMELSE');
      expect(s.avvist('BH', revisjon(s, 'vederlag', delvis)), 'kontrollsak').toBeNull();
    });

    it('etter en ny kravversjon er svaret nytt, og byggherren er fri (HF-U5, HF-U8)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: { metode: 'tilbud', beloep: 120000 },
      });
      expect(s.avvist('BH', nyttSvar(s, 'vederlag', beloep(50000)))).toBeNull();
    });
  });

  /**
   * MM-U27: en revisjon i en hendelse som ikke er et registrert brev, og som byggherren ikke
   * kunne sendt fra appen etter HF-U4 eller HF-U5, gjør saken ikke forstått. Raden er en
   * kopi av svaret fra appen med ett felt endret.
   */
  describe('en rad utenfor kommandoene som bryter bindingen (MM-U27)', () => {
    /** Revisjonen av det siste svaret, med `endre` brukt på en kopi av det. */
    const kopi = (s: Sak, endre: (svar: Data) => void) => {
      const forrige = (s.journal.at(-1)!.data.svar as Data[])[0];
      const svar = structuredClone(forrige);
      svar.id = randomUUID();
      svar.erstatter = forrige.id;
      for (const p of svar.standpunkter as Data[]) p.id = randomUUID();
      endre(svar);
      return svar;
    };
    const registrert = { opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-20' }] };
    const grunner = (s: Sak) => s.u().begrensninger.map((b) => b.grunn);

    it('en revisjon som senker det godkjente beløpet, gjør saken ikke forstått (HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      s.rad('BH', {
        svar: [kopi(s, (v) => ((v.utregning as Data).godkjent_beloep = 80000))],
      });
      expect(s.u().forstaatt).toBe(false);
      expect(grunner(s)).toEqual([
        'en revisjon som senker det byggherren har innrømmet i et svar TE ikke har godtatt (HF-U5, MM-U27)',
      ]);
    });

    it('en revisjon som hever beløpet, er forstått (kontrollsak, HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      s.rad('BH', {
        svar: [kopi(s, (v) => ((v.utregning as Data).godkjent_beloep = 110000))],
      });
      expect(s.u().forstaatt).toBe(true);
    });

    it('den samme revisjonen i et registrert brev gjør ikke saken uforstått (OV-U4)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      s.rad('BH', {
        svar: [kopi(s, (v) => ((v.utregning as Data).godkjent_beloep = 80000))],
        ...registrert,
      });
      expect(s.u().forstaatt).toBe(true);
    });

    it.each([
      ['varselet etter § 33.4', 'rettidighet'],
      ['spesifiseringen etter § 33.6.1', 'spesifisering'],
    ])(
      'en revisjon som sier at %s kom for sent, etter at byggherren sa i tide, gjør saken ikke forstått (HF-U4)',
      (_n, art) => {
        const s = sakMedKrav();
        brev(s, 'frist', dager);
        s.rad('BH', {
          svar: [
            kopi(s, (v) => {
              const p = (v.standpunkter as Data[]).find((x) => x.art === art);
              expect(p?.i_tide, `forutsetning: byggherren sa at ${art} var i tide`).toBe(true);
              p!.i_tide = false;
              if (art === 'spesifisering') p!.dager = 10;
            }),
          ],
        });
        expect(s.u().forstaatt).toBe(false);
        expect(grunner(s)).toEqual([
          'et svar som påberoper at det kom for sent, etter at byggherren har sagt at det kom i tide (HF-U4, MM-U27)',
        ]);
      }
    );

    it('en revisjon som gjentar «i tide», er forstått (kontrollsak, HF-U4)', () => {
      const s = sakMedKrav();
      brev(s, 'frist', dager);
      s.rad('BH', { svar: [kopi(s, () => {})] });
      expect(s.u().forstaatt).toBe(true);
    });
  });
});

/**
 * MM-U29 med lukkingen i SK-01 og OV-U3 (#1050, #1067): et krav venter ikke på svar, og
 * et svar står ikke som ikke godtatt, når et svar eller en aksept i sporet ville blitt
 * avvist. Frafallet etter arbeidsvalget 20.10 i #1050: TE kan ikke godta et frafall
 * (GR-U9), og en ny grunnlagsversjon etter det venter på svar (GR-U23). I vederlag og
 * frist venter et ubesvart krav på svar, og et svar TE ikke har godtatt, står som det.
 */
describe('det som foreligger i et lukket spor og etter et frafall (#1050, #1067)', () => {
  type Sak = ReturnType<typeof sak>;
  const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const frafall = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
  const utregnet = (s: Sak, spor: 'grunnlag' | 'vederlag', v: Data) => {
    const u = s.u();
    const krav = u.spor[spor].gjeldendeKrav!;
    const grunnlagskrav = u.spor.grunnlag.gjeldendeKrav;
    return svar(spor, krav.id, v, regnUtSvar(spor, v, { krav, grunnlagskrav }, KJERNE.regler));
  };
  const godtar = (s: Sak, spor: 'grunnlag' | 'vederlag') =>
    s.send('TE', {
      type: 'aksept',
      spor,
      svar: s.u().spor[spor].gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
  const etiketter = (s: Sak, spor: 'grunnlag' | 'vederlag' | 'frist') =>
    visning(s.u(), GJELDENDE_REGLER).spor[spor].etiketter;

  it('SK-01: når TE godtar avslaget av grunnlaget, venter ubesvarte krav i vederlag og frist ikke på svar', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'grunnlag', avslag)] });
    for (const spor of KRAVSPOR) expect(venterPaaSvar(s.u(), spor), `kontroll: ${spor}`).toBe(true);
    godtar(s, 'grunnlag');
    expect(s.u().grunnlagAvvist, 'forutsetning: avslaget er godtatt').toBe(true);
    for (const spor of KRAVSPOR) {
      expect(venterPaaSvar(s.u(), spor), spor).toBe(false);
      expect(etiketter(s, spor), spor).not.toContain('venter_paa_svar');
    }
  });

  it('SK-01: når TE godtar avslaget av grunnlaget i forløp A, står det subsidiære svaret i vederlaget ikke som ikke godtatt', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [utregnet(s, 'grunnlag', avslag), utregnet(s, 'vederlag', VEDERLAG_DELVIS[0])],
    });
    const st = s.u().spor.vederlag.gjeldendeSvar!.standpunkter.find((p) => p.art === 'beloep')!;
    expect(standpunktetErSubsidiaert(s.u(), 'vederlag', st.id), 'MM-U9, MM-U28').toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'vederlag'), 'kontroll: før aksepten').toBe(true);
    godtar(s, 'grunnlag');
    expect(svarIkkeGodtatt(s.u(), 'vederlag')).toBe(false);
  });

  it('GR-U9: et frafall står ikke som et svar TE ikke har godtatt, mens ubesvarte krav i vederlag og frist venter på svar (arbeidsvalget 20.10)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'grunnlag', frafall)] });
    expect(s.u().frafalt, 'forutsetning: pålegget er frafalt').toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'grunnlag')).toBe(false);
    for (const spor of KRAVSPOR) expect(venterPaaSvar(s.u(), spor), spor).toBe(true);
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'vederlag', VEDERLAG_DELVIS[0])] });
    expect(svarIkkeGodtatt(s.u(), 'vederlag'), 'et svar i vederlaget TE ikke har godtatt').toBe(
      true
    );
  });

  it('GR-U23: en ny grunnlagsversjon etter frafallet venter på svar', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'grunnlag', frafall)] });
    s.send('TE', {
      ...GRUNNLAGSKRAV,
      innhold: { ...GRUNNLAGSKRAV.innhold, tittel: 'Ny peling 2' },
    });
    expect(s.u().frafalt, 'forutsetning: frafallet står (GR-U23)').toBe(true);
    expect(venterPaaSvar(s.u(), 'grunnlag')).toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'grunnlag')).toBe(false);
    expect(etiketter(s, 'grunnlag')).toContain('venter_paa_svar');
  });
});

/**
 * #801: et brev fra appen kan ikke ha et tegn PDF-en ikke kan vise (oppdragsgiver 20.10:
 * «Avvis tegnet ved skriving»), med arbeidsvalgene 22.10: alle tekstfelt som havner i
 * PDF-en, usynlige tegn unntatt myk bindestrek, ikke et registrert brev, og en melding
 * med tegnet, kodepunktet og feltet. Ingen kommando for et registrert brev har fritekst
 * (`begrunnelse` avvises etter OV-U7), så det tredje valget prøves ikke her. Tegnene PDF-en kan vise, prøves mot skriftene i
 * `server/tester/brevpdf.test.ts`.
 */
describe('tegn PDF-en av brevet ikke kan vise, avvises når brevet skrives (#801)', () => {
  it('en emoji i utdypningen avvises med tegnet, kodepunktet og feltet, også i forhåndsvisningen', () => {
    const s = sak();
    const kommando = { ...GRUNNLAGSKRAV, utdypning: 'Pelingen er forsinket 😀' };
    const avvisning = {
      regel: 'UGYLDIG_FORM',
      melding: '$.utdypning har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.',
    };
    expect(s.avvisning('TE', kommando)).toEqual(avvisning);
    expect(s.vis('TE', kommando)).toBeNull();
    expect(s.journal).toHaveLength(1);
    expect(s.avvist('TE', GRUNNLAGSKRAV), 'kontrollsak').toBeNull();
  });

  it('kravtittelen og utdypningen i et svar kontrolleres også', () => {
    const s = sak();
    expect(
      s.avvisning('TE', { ...GRUNNLAGSKRAV, innhold: { ...GRUNNLAGSKRAV.innhold, tittel: '☺' } })
    ).toEqual({
      regel: 'UGYLDIG_FORM',
      melding: '$.innhold.tittel har tegnet «☺» (U+263A), som PDF-en av brevet ikke kan vise.',
    });
    s.send('TE', GRUNNLAGSKRAV);
    const brev = (utdypning: string) => ({
      type: 'brev',
      svar: [
        svar(
          'grunnlag',
          s.krav('grunnlag'),
          { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
          {},
          utdypning
        ),
      ],
    });
    expect(s.avvisning('BH', brev('Avslått \u{1F44E}'))?.melding).toBe(
      '$.svar[0].utdypning har tegnet «\u{1F44E}» (U+1F44E), som PDF-en av brevet ikke kan vise.'
    );
    expect(s.avvist('BH', brev('Avslått.')), 'kontrollsak').toBeNull();
  });

  it('et usynlig tegn avvises, mens myk bindestrek, → og linjeskift godtas', () => {
    const s = sak();
    const med = (utdypning: string) => ({ ...GRUNNLAGSKRAV, utdypning });
    expect(s.avvisning('TE', med('fundament\u200bering'))?.melding).toBe(
      '$.utdypning har det usynlige tegnet U+200B, som PDF-en av brevet ikke kan vise.'
    );
    expect(s.avvisning('TE', med('\ufeffFundamentering'))?.melding).toBe(
      '$.utdypning har det usynlige tegnet U+FEFF, som PDF-en av brevet ikke kan vise.'
    );
    expect(s.avvist('TE', med('fundament\u00adering → peling\r\n\tny linje'))).toBeNull();
  });

  it('en sakstittel med et slikt tegn fra før stopper brevet i den låste teksten', () => {
    const s = sak('Fundament 😀');
    expect(s.avvisning('TE', GRUNNLAGSKRAV)).toEqual({
      regel: 'UGYLDIG_FORM',
      melding:
        'Avsnitt 1 i brevteksten har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.',
    });
  });
});
