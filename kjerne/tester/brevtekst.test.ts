/**
 * Brevteksten i kjernen (#369): teksten mottakeren leser i et brev appen sender.
 * Forventningene har kilde i vedtakene: LV-U4 (ordlyden, punkt 1–13, og 5.2, 5.5b
 * og 5.6 i svaret), GR-U14 (teksten etter § 31.3 i en godkjenning som er en
 * endringsordre), GR-U15 (TEs varsel etter § 32.2 beskriver pålegget), GR-U16
 * (endringsordrens dato eller nummer), KA-U31–KA-U33 og KA-U24 (opphevet av KA-U46) (begrunnelsen),
 * LV-U2 (teksten avsenderen godkjenner, er den som fryses, og et dokument gjengir
 * den tro), LV-U3 (hvert utsagn med virkning står i teksten, ikke appens vurdering),
 * KA-U22 og KA-U25 (de faste tekstene, ordrett), VS-U9 og VS-U11 (svaret gjentar
 * eller gir opp innsigelsen), B-13 05.10 (svaret når forholdet er avslått eller
 * prekludert), B-13 om begrunnelsestekst (den låste delen og utdypningen hver for
 * seg), MM-U17 (opphevet av MM-U50) (et registrert brev får ingen tekst fra appen) og HF-U1 (hvert avsnitt
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
import { brevmerking } from '../frosset/brevtittel.ts';
import { lagFraForholdet, postlisten } from '../frosset/standpunkt.ts';
import { regnUtSvar } from '../frosset/utregning.ts';
import { kravposterI } from '../frosset/kravinnhold.ts';
import { kroner } from '../frosset/tekst.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { lagForUtkastet } from '../kommandoer/lag.ts';
import { HOVEDKATEGORIER, KATEGORIER } from '../format/koder.ts';
import { oppgittDato } from '../format/format.ts';
import { erRegistrert, kalenderdag, lesJournal } from '../format/leser.ts';
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
import {
  KRAVSPOR,
  type Avsnitt,
  type Dokument,
  type Journalrad,
  type Part,
  type Sakskode,
  type Standpunkt,
} from '../typer.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import {
  enighetensVirkning,
  kanInngaaIEo,
  kraveneErAvgjort,
  standpunktetErSubsidiaert,
  svarIkkeGodtatt,
  varseletForNyttSvar,
  venterPaaSvar,
} from '../utledning/utled.ts';
import type { Utledning } from '../utledning/utled.ts';
import { harIkkeVurdertBrev, vederlagssvaret, visning } from '../utledning/visning.ts';
import { KJERNE } from '../versjon.ts';
import { utenAvsnitt } from './formatprove.ts';

type Data = Record<string, unknown>;

const SAK = 'SAK-20261002-001';
const TITTEL = 'Endret fundamentering';
/** Sakens kode i brevene (LV-U44, S3 i #1497). */
const KOE_17 = { kode: 'koe', loepenummer: 17 } as const;
const I_SAKEN = `i sak KOE-17 («${TITTEL}»)`;
/** Navnet på forholdet i påberopelsen, som er sakstittelen (LV-U43). */
const NAVNET = `«${TITTEL}» i sak KOE-17`;
const KR = (n: string) => `${n.replace(' ', '\u00a0')}\u00a0kr eks. mva.`;

/**
 * En sak i minnet der hver kommando går gjennom `vurder`, én dag etter den forrige.
 * Klienten sender den låste teksten fra forhåndsvisningen (A1), med mindre
 * kommandoen alt har en.
 */
function sak(sakstittel = TITTEL, sakskode?: Sakskode, forkortelse: string | null = 'K201') {
  // Driften kan endre kontraktsforkortelsen etter at saken har brev (`koe_drift.sett_kontraktsparter`).
  let kontraktsforkortelse = forkortelse;
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
      sakskode: sakskode ?? KOE_17,
      kontraktsforkortelse,
      tidspunkt: () => tid,
      nyId: randomUUID,
    };
  };
  /**
   * Som skjemaet i klienten: en kravpost med betegnelsen til en kravpost i den gjeldende
   * kravversjonen får dens `id`, og ellers er den ny og sendes uten betegnelse (arbeidsvalget 07.11 i domenetabellen).
   */
  const medIder = (kommando: Data): Data => {
    const innhold = kommando.innhold as Data | undefined;
    if (kommando.type !== 'krav' || kommando.spor !== 'vederlag' || !innhold?.kravposter)
      return structuredClone(kommando);
    const forrige = utledJournal(journal, KJERNE).spor.vederlag.gjeldendeKrav;
    const ider = new Map(forrige ? kravposterI(forrige).map((p) => [p.betegnelse, p.id]) : []);
    const kravposter = (innhold.kravposter as Data[]).map(({ betegnelse, ...p }) =>
      p.id === undefined && ider.has(betegnelse as string)
        ? { id: ider.get(betegnelse as string), ...p }
        : p
    );
    return structuredClone({ ...kommando, innhold: { ...innhold, kravposter } });
  };
  const prov = (part: Part, kommando: Data, kjerne = KJERNE): Utfall => {
    const k = medIder(kommando);
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
        medIder(kommando),
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
      // Et brev fra løsningen, skrevet her uten teksten, har nummeret og merkingen skrivingen
      // gir (LV-U44, LV-U53).
      data:
        erRegistrert(
          (data.opplysninger as { hva: string; gjelder?: string }[] | undefined) ?? []
        ) || 'brevnummer' in data
          ? data
          : medNummer(data),
    };
    frysBrev(r, journal, KJERNE);
    journal.push(r);
    return r;
  };
  const nesteNummer = () =>
    Math.max(0, ...journal.map((h) => (h.data.brevnummer as number | undefined) ?? 0)) + 1;
  const medNummer = (data: Data): Data => {
    const brevnummer = nesteNummer();
    return kontraktsforkortelse
      ? {
          ...data,
          brevnummer,
          merking: brevmerking(kontraktsforkortelse, sakskode ?? KOE_17, brevnummer),
        }
      : { ...data, brevnummer };
  };
  const endreForkortelse = (ny: string) => {
    kontraktsforkortelse = ny;
  };
  const u = () => utledJournal(journal, KJERNE);
  const krav = (spor: 'forhold' | 'vederlag' | 'frist') => gjeldendeKrav(u(), spor).id;
  return { journal, send, vis, avvisning, avvist, rad, u, krav, endreForkortelse };
}

/** Det gjeldende kravet i sporet. Mangler det, feiler testen med en assertion. */
const gjeldendeKrav = (
  u: ReturnType<typeof utledJournal>,
  spor: 'forhold' | 'vederlag' | 'frist'
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

/** Vederlagskravet med én kravpost med fast sum, P1 (OV-U95 punkt 19), og eventuelt postene utenfor. */
/** `id` for P1 i den gjeldende vederlagskravversjonen, for et krav som trekker den (KA-U56). */
const p1I = (s: { u: () => Utledning }): string =>
  kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[0]!.id;

const tilbud = (beloep?: number, rest: Data = {}): Data => ({
  ...(beloep === undefined
    ? {}
    : {
        kravposter: [
          { betegnelse: 'P1', beskrivelse: 'Ny fundamentering', oppgjoersform: 'tilbud', beloep },
        ],
      }),
  ...rest,
});

/**
 * VS-U26: datoen varslingsplikten løper fra, som TE oppgir i påberopelsen. Setningen er den samme
 * i det første brevet og i en ny versjon (LV-U57, LV-U56).
 */
const MOTTATT = { paalegg_mottatt: '2026-09-25' };
const KLAR_OVER = { klar_over_forholdet: '2026-09-25' };
const MOTTATT_TEKST = 'Pålegget ble mottatt 25. september 2026.';
const KLAR_OVER_TEKST = 'Totalentreprenøren ble klar over forholdet 25. september 2026.';

const PAABEROPELSE = {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
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

/** Saken med forhold (brev 2), vederlag (brev 3, 125 000 kr) og frist (brev 4, 20 dager). */
function sakMedKrav() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
  s.send('TE', FRISTKRAV);
  return s;
}

const BEGRUNNELSE = 'Byggherrens begrunnelse.';

/** «Ja» på § 34.2.2 og § 33.6.1 står i brevet uten å ordnes, som byggherren sa det (#341, LV-U3). */
// LV-U31 og LV-U32: setningen når byggherren godkjenner oppgjør som fast sum.
const METODE_JA =
  'Byggherren godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret.';
const metodeJa = `b${METODE_JA.slice(1)}`;
// GR-U26: forbeholdet når forholdet i brev 2 ikke er besvart.
const FORBEHOLD_BREV_2 =
  'Byggherren har ennå ikke svart på grunnlaget i TEs krav i brev K201-KOE-017-01 av 2. oktober 2026. Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for kravet foreligger.';
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
  { hovedkrav_vurdering: 'delvis', hovedkrav_godkjent_beloep: 100000, aksepterer_metode: true },
  { resultat: 'delvis_godkjent', godkjent_beloep: 100000 },
] as const;

const FRIST_FULLT = [
  { frist_varsel_ok: true, spesifisert_krav_ok: true, vilkar_oppfylt: true, dager: 20 },
  { resultat: 'godkjent', godkjent_dager: 20 },
] as const;

describe('de faste tekstene står ordrett (KA-U22, KA-U25, LV-U4 punkt 13)', () => {
  it('trekk av forholdet', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'trekk', spor: 'forhold' });
    expect(laast(rad)).toEqual([
      `TE trekker sitt krav ${I_SAKEN}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`,
    ]);
  });

  it('trekk av vederlaget identifiserer den gjeldende kravversjonen', () => {
    const s = sakMedKrav();
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(150000) });
    const rad = s.send('TE', { type: 'trekk', spor: 'vederlag' });
    // Den gjeldende kravversjonen er den i brev 4 i saken, ikke den første i brev 2. Beløpet
    // står med kravposten det er krevd i (KA-U22, KA-U53).
    expect(tekst(rad)).toEqual([
      {
        gjelder: (rad.data.utsagn as Data[])[0].id,
        laast: `TE trekker kravet om justering av vederlaget ${I_SAKEN}, fremsatt i brev K201-KOE-017-04 av 5. oktober 2026 (${KR('150 000')} i P1). Trekket er avkall på dette kravet, også det byggherren har godkjent.`,
      },
    ]);
  });

  it('trekk av fristen', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'trekk', spor: 'frist' });
    expect(laast(rad)).toEqual([
      `TE trekker kravet om fristforlengelse ${I_SAKEN}, fremsatt i brev K201-KOE-017-03 av 4. oktober 2026 (20 dager). Trekket er avkall på dette kravet, også det byggherren har godkjent.`,
    ]);
  });

  it('«ingen krav» i vederlaget sier også at forseringsvederlaget ikke omfattes (KA-U25)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', { type: 'ingen_krav', spor: 'vederlag' });
    expect(laast(rad)).toEqual([
      `TE krever ikke justering av vederlaget som følge av forholdet ${I_SAKEN}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag. Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.`,
    ]);
  });

  it('«ingen krav» i fristen har ikke setningen om forsering', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', { type: 'ingen_krav', spor: 'frist' });
    expect(laast(rad)).toEqual([
      `TE krever ikke fristforlengelse som følge av forholdet ${I_SAKEN}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`,
    ]);
  });
});

describe('kravene (LV-U4 punkt 1–3, GR-U16)', () => {
  const forhold = (innhold: Data, utdypning?: string) => {
    const s = sak();
    return s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold,
      ...(utdypning ? { utdypning } : {}),
    });
  };

  // LV-U43: sakstittelen er navnet på forholdet og står én gang. LV-U35 og LV-U39 for hele
  // påberopelsen, og VS-U26 for datoen etter setningen om punkt 32.2.
  it('en endring der § 32.2 gjelder, med varselet', () => {
    const rad = forhold(PAABEROPELSE.innhold, BESKRIVELSE);
    expect(tekst(rad)).toEqual([
      {
        gjelder: (rad.data.krav as Data[])[0].id,
        laast: `Totalentreprenøren krever endringsordre for ${NAVNET} som irregulær endring (NS 8407 punkt 32.1). Totalentreprenøren varsler etter NS 8407 punkt 32.2 at totalentreprenøren påberoper seg at pålegget innebærer en endring. ${MOTTATT_TEKST}`,
        // A8: TEs beskrivelse er kravets utdypning og står bare der, ikke i kravet.
        utdypning: BESKRIVELSE,
      },
    ]);
    expect((rad.data.krav as Data[])[0]).not.toHaveProperty('beskrivelse');
  });

  it('sakstittelen står én gang, uten parentes (LV-U43)', () => {
    const t = laast(forhold(PAABEROPELSE.innhold, BESKRIVELSE))[0];
    expect(t.split(`«${TITTEL}»`)).toHaveLength(2);
    expect(t).not.toContain(I_SAKEN);
  });

  // #1501: punkt 15.2 gjelder «de avtalte krav til prosessen», med navnet fra velgeren.
  it('endringer i lover og vedtak etter punkt 15.2 gjelder prosessen (#1501)', () => {
    const rad = forhold(
      { hovedkategori: 'endring', underkategori: 'lovendring_prosess', ...MOTTATT },
      BESKRIVELSE
    );
    expect(laast(rad)[0]).toMatch(
      new RegExp(
        `^Totalentreprenøren krever endringsordre for ${esc(NAVNET)} som endringer i lover og vedtak for prosessen \\(NS 8407 punkt 15\\.2\\)\\.`
      )
    );
  });

  it('underkategorien endringsordre identifiserer endringsordren og varsler ikke etter § 32.2', () => {
    const rad = forhold({
      hovedkategori: 'endring',
      underkategori: 'endringsordre',
      endringsordre: 'EO 12 av 1. oktober 2026',
    });
    expect(laast(rad)).toEqual([
      `Totalentreprenøren gjør gjeldende krav som følge av en endringsordre fra byggherren for ${NAVNET} (NS 8407 punkt 31.3). Totalentreprenøren viser til endringsordren «EO 12 av 1. oktober 2026».`,
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
              krav: [{ id: randomUUID(), spor: 'forhold', hovedkategori: 'endring', ...innhold }],
              opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-01' }],
              korrespondansetype: 'brev',
            },
          },
        ],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(krav({ underkategori: 'endringsordre' })).toBe('ukjent');
    expect(krav({ underkategori: 'endringsordre', endringsordre: 'EO 12' })).toBe('dokument');
  });

  it('svikt viser til § 33.1 b og § 34.1.2', () => {
    const rad = forhold({
      hovedkategori: 'svikt',
      underkategori: 'grunnforhold',
      ...KLAR_OVER,
    });
    expect(laast(rad)).toEqual([
      `Totalentreprenøren påberoper uforutsette forhold ved grunnen (NS 8407 punkt 23.1, jf. punkt 33.1 b og 34.1.2) for ${NAVNET}. ${KLAR_OVER_TEKST}`,
    ]);
  });

  it('annet forhold etter § 33.1 c nevner ikke bestemmelsen to ganger', () => {
    const rad = forhold({
      hovedkategori: 'andre_forhold',
      underkategori: 'annet_forhold',
      ...KLAR_OVER,
    });
    expect(laast(rad)).toEqual([
      `Totalentreprenøren påberoper annet forhold byggherren har risikoen for (NS 8407 punkt 33.1 c og 34.1.2) for ${NAVNET}. ${KLAR_OVER_TEKST}`,
    ]);
  });

  it('vederlaget er et tilbud uten merverdiavgift, og fristkravet har datoen for varselet og brevet med det (OV-U5)', () => {
    const s = sakMedKrav();
    const [, , v, f] = s.journal;
    // Ett avsnitt per kravpost, og brevet sier hvilke poster som er tilbud (KA-U61, BF-14 U-6).
    expect(laast(v)).toEqual([
      `P1 Ny fundamentering: TE krever ${KR('125 000')} Kravet for P1 er et tilbud etter NS 8407 punkt 34.2.1.`,
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

  // LV-U56 og tilfellene 1, 5 og 6 i BF-10-brevtekst.md: den låste delen sier bare hva
  // påberopelsen gjelder, og datoen. Den sier ikke at noe erstattes, og gjentar ikke varselet
  // etter punkt 32.2.
  describe('en ny versjon av påberopelsen (LV-U56)', () => {
    const nyVersjon = (innhold: Data) => {
      const s = sak();
      s.send('TE', { type: 'krav', spor: 'forhold', innhold, utdypning: BESKRIVELSE });
      return laast(
        s.send('TE', { type: 'krav', spor: 'forhold', innhold, utdypning: BESKRIVELSE })
      );
    };

    it('en endring der § 32.2 gjelder', () => {
      expect(nyVersjon(PAABEROPELSE.innhold)).toEqual([
        `Påberopelsen gjelder irregulær endring (NS 8407 punkt 32.1) for ${NAVNET}. ${MOTTATT_TEKST}`,
      ]);
    });

    it('svikt viser til § 33.1 b og § 34.1.2', () => {
      expect(
        nyVersjon({ hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER })
      ).toEqual([
        `Påberopelsen gjelder uforutsette forhold ved grunnen (NS 8407 punkt 23.1, jf. punkt 33.1 b og 34.1.2) for ${NAVNET}. ${KLAR_OVER_TEKST}`,
      ]);
    });

    it('underkategorien endringsordre har ingen dato', () => {
      expect(
        nyVersjon({
          hovedkategori: 'endring',
          underkategori: 'endringsordre',
          endringsordre: 'EO 12',
        })
      ).toEqual([
        `Påberopelsen gjelder endringsordre «EO 12» fra byggherren (NS 8407 punkt 31.3) for ${NAVNET}.`,
      ]);
    });
  });

  it('en ny kravversjon viser til den den erstatter (KA-U52 punkt 4, #1379)', () => {
    const s = sakMedKrav();
    const utenVarsel = utenFelt(FRISTKRAV, 'varsel');
    const rad = s.send('TE', { ...utenVarsel, innhold: { dager: 30 } });
    expect(laast(rad)).toEqual([
      'TE krever fristforlengelse på 30 dager (NS 8407 § 33.6.1). Kravet erstatter TEs krav i brev K201-KOE-017-03 av 4. oktober 2026.',
    ]);
  });
});

/**
 * VS-U26: datoen varslingsplikten løper fra står i brevteksten som TEs opplysning.
 * At en dato etter brevets dato avvises, er arbeidsvalg 1 i #664, og vurderer ikke
 * rettidigheten. Datoen endres i en korrigering, ikke i en ny kravversjon (punkt 10 i
 * samlevedtaket for retting av sendt brev, MM-U41 (opphevet av MM-U52)).
 */
describe('datoen varslingsplikten løper fra (VS-U26)', () => {
  it('en dato etter brevets dato avvises; samme dag godtas (arbeidsvalg 1 i #664)', () => {
    const s = sak();
    // Det første brevet i `sak()` er datert 2. oktober 2026.
    const med = (dato: string) => ({
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: dato },
    });
    expect(s.avvisning('TE', med('2026-10-03'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding:
        'TE har oppgitt at pålegget ble mottatt 3. oktober 2026, etter brevets dato 2. oktober 2026.',
    });
    expect(s.avvist('TE', med('2026-10-02'))).toBeNull();
    const svikt = {
      type: 'krav',
      spor: 'forhold',
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
    s.send('TE', PAABEROPELSE);
    // Brevet er datert 3. oktober 2026.
    const varsel = (sendt: string) => ({
      type: 'varsel',
      korrespondansetype: 'brev',
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
          ...PAABEROPELSE,
          innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: dato },
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
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      tidspunkt: () => new Date('2026-10-15T22:30:00Z'),
      nyId: randomUUID,
    };
    const med = (dato: string) => ({
      ...utenFelt(PAABEROPELSE, 'utdypning'),
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: dato },
    });
    const regel = (dato: string) => {
      const u = forhaandsvis(med(dato), kontekst, s.journal, KJERNE);
      return u.godtatt ? null : u.avvisning.regel;
    };
    expect(regel('2026-10-16')).toBeNull();
    expect(regel('2026-10-17')).toBe('DATO_ETTER_BREVET');
  });

  it('underkategorien endringsordre har ingen dato i brevet (VS-U26)', () => {
    const s = sak();
    const rad = s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'endring', underkategori: 'endringsordre', endringsordre: 'EO 12' },
    });
    expect(laast(rad)[0]).not.toContain('TE opplyser');
  });
});

/**
 * Punkt 10 og 11 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)), med partene skrevet fullt
 * ut (LV-U35) og henvisningen etter LV-U53. Teksten i en ny grunnlagsversjon etter en
 * korrigering er LV-U56, og korrigeringen i en lukket sak er MM-U51. At korrigeringen avvises
 * når henvisningen er ugyldig, når datoen er uendret og når datoen er etter brevets dato, er
 * arbeidsvalgene i avgrensningen av #1308.
 */
describe('korrigeringen av datoen (punkt 10 i samlevedtaket for retting av sendt brev, MM-U41 (opphevet av MM-U52))', () => {
  /** Korrigeringen med henvisning til TEs siste opplysning om datoen. */
  const korrigering = (
    s: ReturnType<typeof sak>,
    felt: string,
    dato: string,
    gjelder?: string
  ) => ({
    type: 'korrigering',
    gjelder: gjelder ?? s.u().datoopplysninger.at(-1)!.id,
    [felt]: dato,
  });

  it('brevet har teksten i punkt 10 og viser til brevet med opplysningen (LV-U35, LV-U53)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(laast(rad)).toEqual([
      'Totalentreprenøren oppgir nå at pålegget ble mottatt 20. september 2026. I brev K201-KOE-017-01 av 2. oktober 2026 oppga totalentreprenøren 25. september 2026.',
    ]);
    expect(rad.data.krav, 'punkt 10: ikke en ny kravversjon').toBeUndefined();
    expect(rad.data.svar).toBeUndefined();
  });

  it('brevet har tittelen «Korrigering av datoen i sak <kode>», og leseren gir den (LV-U55, LV-U27)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(rad.data.brevtittel).toBe('Korrigering av datoen i sak KOE-17');
    const lest = lesJournal(s.journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtittel).toBe(
      'Korrigering av datoen i sak KOE-17'
    );
    // MM-U9: et brev sendt før tittelen fantes, står uten tittel og er forstått.
    const uten = { ...rad, data: { ...rad.data } };
    delete uten.data.brevtittel;
    expect(lesJournal([...s.journal.slice(0, -1), uten], KJERNE.leserformat).at(-1)!.art).toBe(
      'dokument'
    );
  });

  it('TEs forklaring står i fritekst under den vedtatte teksten og er valgfri (MM-U53)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const forklaring = 'Datoen i kravet var datoen for byggemøtet, ikke for pålegget.';
    const med = s.send('TE', {
      ...korrigering(s, 'paalegg_mottatt', '2026-09-20'),
      utdypning: forklaring,
    });
    expect(tekst(med)).toEqual([
      {
        gjelder: (med.data.utsagn as { id: string }[])[0].id,
        laast:
          'Totalentreprenøren oppgir nå at pålegget ble mottatt 20. september 2026. I brev K201-KOE-017-01 av 2. oktober 2026 oppga totalentreprenøren 25. september 2026.',
        utdypning: forklaring,
      },
    ]);
    // Forklaringen endrer ikke opplysningen: løsningen tolker den ikke (MM-U53).
    expect(s.u().datoopplysninger.at(-1)!.dato).toBe('2026-09-20');
    const uten = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-22'));
    expect(tekst(uten)[0].utdypning).toBeUndefined();
  });

  it('i svikt og andre forhold gjelder korrigeringen datoen TE ble klar over forholdet', () => {
    const s = sak();
    s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    });
    expect(
      s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20')),
      'feltet kategorien ikke har'
    ).toBe('UGYLDIG_KORRIGERING');
    const rad = s.send('TE', korrigering(s, 'klar_over_forholdet', '2026-09-28'));
    expect(laast(rad)).toEqual([
      'Totalentreprenøren oppgir nå at totalentreprenøren ble klar over forholdet 28. september 2026. I brev K201-KOE-017-01 av 2. oktober 2026 oppga totalentreprenøren 25. september 2026.',
    ]);
  });

  it('den nye opplysningen gjelder straks, også en senere dato, og svaret står og gjaldt den forrige (punkt 10 og 11, designdelen)', () => {
    const s = sakMedKrav();
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
          { resultat: 'godkjent', grunnlag_varslet_i_tide: false },
          {},
          BEGRUNNELSE
        ),
      ],
    });
    const svarId = (svaret.data.svar as { id: string }[])[0].id;
    const kravId = s.krav('forhold');
    const rad = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-28'));
    const korrigeringen = (rad.data.utsagn as { id: string }[])[0].id;
    const u = s.u();
    expect(u.datoopplysninger.map((o) => [o.id, o.dato])).toEqual([
      [kravId, '2026-09-25'],
      [korrigeringen, '2026-09-28'],
    ]);
    expect(u.spor.forhold.gjeldendeSvar?.id, 'svaret står').toBe(svarId);
    expect(u.svar[svarId].datoopplysning, 'svaret gjaldt opplysningen i kravet').toBe(kravId);
    expect(venterPaaSvar(u, 'forhold'), 'punkt 11: sporet venter ikke på et nytt svar').toBe(false);
  });

  it('en ny grunnlagsversjon kan ikke endre datoen, og gjengir TEs siste opplysning med den opprinnelige datoen og brevet (punkt 10, LV-U56)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(
      s.avvisning('TE', {
        ...PAABEROPELSE,
        innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-20' },
      })
    ).toEqual({
      regel: 'DATOEN_KAN_IKKE_ENDRES',
      melding:
        'En ny versjon av grunnlaget kan ikke endre datoen pålegget ble mottatt. TEs siste opplysning er 25. september 2026. Datoen korrigeres i et eget brev.',
    });
    expect(laast(s.send('TE', PAABEROPELSE))[0], 'kontrollsak: samme dato').toContain(
      MOTTATT_TEKST
    );
    s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(s.avvist('TE', PAABEROPELSE), 'den tidligere datoen').toBe('DATOEN_KAN_IKKE_ENDRES');
    const ny = s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-20' },
    });
    expect(laast(ny)).toEqual([
      `Påberopelsen gjelder irregulær endring (NS 8407 punkt 32.1) for ${NAVNET}. Pålegget ble mottatt 20. september 2026. Totalentreprenøren oppga tidligere 25. september 2026 i brev K201-KOE-017-01 av 2. oktober 2026.`,
    ]);
    expect(s.u().datoopplysninger, 'gjengivelsen er ikke en ny opplysning').toHaveLength(2);
  });

  it('en ny korrigering viser til den forrige, og en ny grunnlagsversjon nevner hver tidligere dato, den opprinnelige først (punkt 10, LV-U56)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    const krav = s.krav('forhold');
    expect(
      s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-22', krav)),
      'henvisning til kravet, som ikke har TEs siste opplysning'
    ).toBe('UGYLDIG_KORRIGERING');
    const andre = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-22'));
    expect(laast(andre)).toEqual([
      'Totalentreprenøren oppgir nå at pålegget ble mottatt 22. september 2026. I brev K201-KOE-017-02 av 3. oktober 2026 oppga totalentreprenøren 20. september 2026.',
    ]);
    const ny = s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-22' },
    });
    expect(laast(ny)[0]).toContain(
      'Pålegget ble mottatt 22. september 2026. Totalentreprenøren oppga tidligere 25. september 2026 i brev K201-KOE-017-01 av 2. oktober 2026 og 20. september 2026 i brev K201-KOE-017-02 av 3. oktober 2026.'
    );
  });

  it('en ny grunnlagsversjon nevner datoen i en versjon fra en annen skriver, som utledningen leser (LV-U56, MM-U43 punkt 6)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          erstatter: s.krav('forhold'),
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
          paalegg_mottatt: '2026-09-18',
        },
      ],
    });
    s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(
      s.u().datoopplysninger.map((o) => o.dato),
      'forutsetning: utledningen leser datoen i versjonen fra den andre skriveren'
    ).toEqual(['2026-09-25', '2026-09-18', '2026-09-20']);
    const ny = s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-20' },
    });
    expect(laast(ny)[0]).toContain(
      'Pålegget ble mottatt 20. september 2026. Totalentreprenøren oppga tidligere 25. september 2026 i brev K201-KOE-017-01 av 2. oktober 2026 og 18. september 2026 i brev K201-KOE-017-02 av 3. oktober 2026.'
    );
  });

  it('korrigeringen avvises når datoen er uendret eller etter brevets dato, og godtas samme dag (arbeidsvalgene i #1308)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(s.avvisning('TE', korrigering(s, 'paalegg_mottatt', '2026-09-25'))).toEqual({
      regel: 'DATOEN_ER_UENDRET',
      melding:
        'TE har alt oppgitt at pålegget ble mottatt 25. september 2026. Korrigeringen må oppgi en annen dato.',
    });
    // Brevet med korrigeringen er datert 3. oktober 2026.
    expect(s.avvisning('TE', korrigering(s, 'paalegg_mottatt', '2026-10-04'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding:
        'TE har oppgitt at pålegget ble mottatt 4. oktober 2026, etter brevets dato 3. oktober 2026.',
    });
    expect(
      s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-10-03')),
      'kontrollsak'
    ).toBeNull();
  });

  it('korrigeringen avvises når henvisningen er ugyldig, fra byggherren og før grunnlaget er sendt', () => {
    const s = sak();
    expect(s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20', randomUUID()))).toBe(
      'PAABEROPELSE_IKKE_SENDT'
    );
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20', randomUUID()))).toBe(
      'UGYLDIG_KORRIGERING'
    );
    expect(s.avvist('BH', korrigering(s, 'paalegg_mottatt', '2026-09-20'))).toBe('FEIL_PART');
    expect(
      s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20')),
      'kontrollsak'
    ).toBeNull();
  });

  it('korrigeringen avvises i underkategorien endringsordre, der TE ikke oppgir noen slik dato (punkt 10)', () => {
    const s = sak();
    const eo = s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'endring', underkategori: 'endringsordre', endringsordre: 'EO 12' },
    });
    const kravId = (eo.data.krav as { id: string }[])[0].id;
    expect(s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20', kravId))).toBe(
      'INGEN_DATO_I_KATEGORIEN'
    );
    expect(handlinger(s.u(), 'TE').some((h) => h.startsWith('korrigere:'))).toBe(false);
  });

  it('TE får tilbud om korrigeringen med henvisning til TEs siste opplysning (INV-MM-1)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = s.krav('forhold');
    expect(handlinger(s.u(), 'TE')).toContain(`korrigere:${krav}`);
    const rad = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    const korrigeringen = (rad.data.utsagn as { id: string }[])[0].id;
    expect(handlinger(s.u(), 'TE')).toContain(`korrigere:${korrigeringen}`);
    expect(handlinger(s.u(), 'TE')).not.toContain(`korrigere:${krav}`);
    expect(handlinger(s.u(), 'BH').some((h) => h.startsWith('korrigere:'))).toBe(false);
  });
});

describe('kravet til begrunnelse og beskrivelse (KA-U24 (opphevet av KA-U46), KA-U31–KA-U33, GR-U15)', () => {
  it('TEs varsel etter § 32.2 uten beskrivelse av pålegget avvises (GR-U15)', () => {
    const s = sak();
    const uten = utenFelt(PAABEROPELSE, 'utdypning');
    expect(s.avvist('TE', uten)).toBe('BESKRIVELSE_MANGLER');
    expect(s.avvist('TE', PAABEROPELSE)).toBeNull();
  });

  it('en beskrivelse eller begrunnelse med bare mellomrom teller ikke (GR-U15, KA-U33)', () => {
    const s = sak();
    expect(s.avvist('TE', { ...PAABEROPELSE, utdypning: ' \n ' })).toBe('BESKRIVELSE_MANGLER');
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', { ...FRISTKRAV, utdypning: '  ' })).toBe('BEGRUNNELSE_MANGLER');
  });

  it('forhåndsvisningen gir den låste teksten før begrunnelsen er skrevet (A1)', () => {
    const s = sakMedKrav();
    const avslag = {
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
          { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
          {},
          null
        ),
      ],
    };
    expect(s.vis('BH', avslag)).toHaveLength(1);
    expect(s.avvist('BH', avslag)).toBe('BEGRUNNELSE_MANGLER');
  });

  it('kontrollsak: en påberopelse der § 32.2 ikke gjelder, trenger ingen beskrivelse', () => {
    const s = sak();
    expect(
      s.avvist('TE', {
        type: 'krav',
        spor: 'forhold',
        innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
      })
    ).toBeNull();
  });

  it('et fristkrav uten begrunnelse avvises (§ 33.6.1, KA-U33)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const uten = utenFelt(FRISTKRAV, 'utdypning');
    expect(s.avvist('TE', uten)).toBe('BEGRUNNELSE_MANGLER');
    expect(s.avvist('TE', FRISTKRAV)).toBeNull();
  });

  it('vederlagskravet trenger ingen utdypning, men kan ha en (A7)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const vederlag = { type: 'krav', spor: 'vederlag', innhold: tilbud(1) };
    expect(s.avvist('TE', vederlag)).toBeNull();
    const rad = s.send('TE', { ...vederlag, utdypning: 'Kalkylen er vedlagt.' });
    expect(tekst(rad)[0].utdypning).toBe('Kalkylen er vedlagt.');
  });

  const brev = (...svar: Data[]) => ({ type: 'brev', svar });

  it.each([
    [
      'påberopt preklusjon etter § 32.2 (KA-U21)',
      'forhold',
      { resultat: 'godkjent', grunnlag_varslet_i_tide: false },
      {},
    ],
    [
      'avslag av grunnlaget',
      'forhold',
      { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
      {},
    ],
    [
      'frafall etter § 32.3 c (KA-U32)',
      'forhold',
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
        hovedkrav_godkjent_beloep: 125000,
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
  ] as [string, 'forhold', Data, Data][])(
    'et svar med %s må ha en begrunnelse',
    (_n, spor, vurderinger, resultat) => {
      const s = sakMedKrav();
      const uten = brev(svar(spor, s.krav(spor), vurderinger, resultat, null));
      expect(s.avvist('BH', uten)).toBe('BEGRUNNELSE_MANGLER');
      expect(s.avvist('BH', brev(svar(spor, s.krav(spor), vurderinger, resultat)))).toBeNull();
    }
  );

  it.each([
    ['grunnlaget godkjent', 'forhold', { resultat: 'godkjent', grunnlag_varslet_i_tide: true }, {}],
    [
      'hele beløpet godkjent',
      'vederlag',
      {
        hovedkrav_vurdering: 'godkjent',
        hovedkrav_godkjent_beloep: 125000,
        aksepterer_metode: true,
      },
      { resultat: 'godkjent', godkjent_beloep: 125000 },
    ],
    ['alle dagene godkjent', 'frist', FRIST_FULLT[0], FRIST_FULLT[1]],
  ] as [string, 'forhold', Data, Data][])(
    'kontrollsak: et svar med %s trenger ingen begrunnelse',
    (_n, spor, vurderinger, resultat) => {
      const s = sakMedKrav();
      expect(
        s.avvist('BH', brev(svar(spor, s.krav(spor), vurderinger, resultat, null)))
      ).toBeNull();
    }
  );

  it('et svar som bare er subsidiært fordi forholdet er avslått, trenger ingen egen begrunnelse (KA-U24)', () => {
    const s = sakMedKrav();
    s.send(
      'BH',
      brev(
        svar('forhold', s.krav('forhold'), {
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
  /** Forholdet er svikt (§ 34.1.2), vederlaget 125 000 kr (brev 3). */
  const sviktMedVederlag = () => {
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'medvirkning',
        ...KLAR_OVER,
      },
    });
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    return s;
  };
  const vederlagssvar = (iTide: boolean) => {
    const s = sviktMedVederlag();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
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
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026:\n\nPrinsipalt: byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.\n\nSubsidiært: ${metodeJa} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
    );
  });

  it('§ 34.2.2 «nei» sammen med preklusjon etter § 34.1.2 er ikke en egen subsidiær grunn, og står ved siden av beløpet (arbeidsvalget i #479)', () => {
    const s = sviktMedVederlag();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
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
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026:\n\nPrinsipalt: byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.\n\nSubsidiært: byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres som regningsarbeid (NS 8407 § 34.4). Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
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
            hovedkrav_godkjent_beloep: 125000,
            aksepterer_metode: false,
            oensket_metode: 'enhetspriser',
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 125000 }
        ),
      ],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026: ${FORBEHOLD_BREV_2} Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres etter enhetspriser (NS 8407 § 34.3). Byggherren godkjenner ${KR('125 000')}`,
    ]);
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.sammenfall).toBe(false);
    expect(b.linje).toBe(
      'Byggherrens standpunkt: godkjent med 125\u00a0000\u00a0kr, tilbudet ikke akseptert (§ 34.2.2).'
    );
  });

  it('§ 34.2.2 «nei» med et beløp 40 øre under det krevde: brevet sier «av de krevde», fordi beløpene sammenliknes i hele øre (OV-U59, arbeidsvalget i #479)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'delvis',
            hovedkrav_godkjent_beloep: 124999.6,
            aksepterer_metode: false,
            oensket_metode: 'enhetspriser',
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 124999.6 }
        ),
      ],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026: ${FORBEHOLD_BREV_2} Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres etter enhetspriser (NS 8407 § 34.3). Byggherren godkjenner ${KR('124 999,60')} av de krevde ${KR('125 000')}`,
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
          { ...VEDERLAG_DELVIS[0], hovedkrav_godkjent_beloep: beloep },
          VEDERLAG_DELVIS[1]
        ),
      ],
    });
    expect(s.avvist('BH', brev(100000)), 'kontrollsak').toBeNull();
    expect(() => s.avvisning('BH', brev('abc'))).not.toThrow();
    expect(s.avvisning('BH', brev('abc'))).toEqual({
      regel: 'UGYLDIG_VURDERING',
      melding: 'Vurderingene kan ikke regnes ut: hovedkrav_godkjent_beloep: er ikke et tall.',
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
    const p1 = (lagret.kravposter as Data[])[0]!;
    expect(p1.beloep, 'forutsetning').toBe(125000);
    p1.beloep = 'abc';
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
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026: ${FORBEHOLD_BREV_2} Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres etter enhetspriser (NS 8407 § 34.3). Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`,
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
      `Byggherrens svar på kravet om fristforlengelse i TEs krav i brev K201-KOE-017-03 av 4. oktober 2026: ${FORBEHOLD_BREV_2}\n\nByggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent. Byggherren legger til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1).\n\nPrinsipalt: byggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at TE bare har krav på den fristforlengelsen byggherren måtte forstå at TE hadde krav på, 5 dager (NS 8407 § 33.6.1).\n\nSubsidiært: byggherren godkjenner 15 dager av de krevde 20 dager.`,
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
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }, {}, null),
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'godkjent',
            hovedkrav_godkjent_beloep: 125000,
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
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026: Byggherren gjør ikke gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent. ${METODE_JA} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
    );
  });

  it('§ 34.2.2 «nei» med hele beløpet godkjent krever en begrunnelse for tilbudet, og 40 øre under det krevde også for beløpet (OV-U59, arbeidsvalget 15.10 i #490)', () => {
    const s = sakMedKrav();
    const brevet = (vurdering: Record<string, unknown>, godkjent: number) => ({
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...vurdering, aksepterer_metode: false, oensket_metode: 'enhetspriser' },
          { resultat: 'delvis_godkjent', godkjent_beloep: godkjent },
          null
        ),
      ],
    });
    expect(s.avvisning('BH', brevet({ hovedkrav_vurdering: 'godkjent' }, 125000))?.melding).toBe(
      'Svaret må ha en begrunnelse, fordi du ikke aksepterer tilbudet (§ 34.2.2).'
    );
    // OV-U59: et beløp som blir likt det krevde når det rundes til hele kroner, er ikke godkjent fullt.
    expect(
      s.avvisning(
        'BH',
        brevet({ hovedkrav_vurdering: 'delvis', hovedkrav_godkjent_beloep: 124999.6 }, 124999.6)
      )?.melding
    ).toBe(
      'Svaret må ha en begrunnelse, fordi du ikke aksepterer tilbudet (§ 34.2.2) og ikke godkjenner hele beløpet.'
    );
  });

  it('avslag på et krav under 0,50 kr krever en begrunnelse for beløpet, selv om begge rundes til 0 kr (B-13, KA-U24 (opphevet av KA-U46))', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(0.4) });
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
      'Svaret må ha en begrunnelse, fordi du ikke godkjenner hele beløpet.'
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
      'Byggherrens standpunkt: prinsipalt varselet etter § 33.4 kom for sent, subsidiært avslått: fremdriften er ikke hindret som følge av forholdet (§ 33.1), videre subsidiært godkjent med 5 dager (§ 33.6.1), videre subsidiært godkjent med 10 dager.'
    );
  });

  // OV-U32: appen fryser laget hvert standpunkt står i som et nummer, og brevet setter én
  // etikett per lag etter den fryste verdien. Brevet og beslutningsgrunnlaget sier det samme
  // (#1047, B4-1b).
  it('§ 33.4 for sent, ingen hindring og dagene står i lag 1, 2 og 3, i brevet og i beslutningsgrunnlaget (OV-U32)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: false, spesifisert_krav_ok: true, vilkar_oppfylt: false, dager: 10 },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect((b.virkninger as Data[]).map((v) => v.lag)).toEqual([1, 2, 3]);
    expect(b.uten_virkning).toHaveLength(1);
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt varselet etter § 33.4 kom for sent, subsidiært avslått: fremdriften er ikke hindret som følge av forholdet (§ 33.1), videre subsidiært godkjent med 10 dager.'
    );
    const tekst = laast(rad)[0];
    expect(tekst).toContain(
      'Prinsipalt: byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent.\n\nSubsidiært: byggherren legger ikke til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1).'
    );
    expect(tekst).toMatch(
      /\n\nVidere subsidiært: byggherren godkjenner 10 dager av de krevde 20 dager\.$/
    );
    // Én etikett per lag: standpunktet uten virkning (§ 33.6.1 i tide) står uten etikett.
    expect(tekst.match(/(Prinsipalt|Subsidiært|Videre subsidiært):/g)).toEqual([
      'Prinsipalt:',
      'Subsidiært:',
      'Videre subsidiært:',
    ]);
    const dagene = s.u().spor.frist.gjeldendeSvar!.standpunkter.find((p) => p.art === 'dager')!;
    expect(standpunktetErSubsidiaert(s.u(), 'frist', dagene.id), 'OV-U32').toBe(true);
  });

  it('kontrollsak: med fremdriftshindring står dagene i lag 2, ikke 3 (OV-U32)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: false, spesifisert_krav_ok: true, vilkar_oppfylt: true, dager: 10 },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect((b.virkninger as Data[]).map((v) => v.lag)).toEqual([1, 2]);
    expect(laast(rad)[0]).toMatch(
      /\n\nSubsidiært: byggherren godkjenner 10 dager av de krevde 20 dager\.$/
    );
  });

  it('innledningen nevner sporet, og standpunktene ordnes slik brevet ordner dem', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
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
      'Byggherrens svar på grunnlaget i TEs krav i brev K201-KOE-017-01 av 2. oktober 2026:\n\nPrinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent.\n\nSubsidiært: byggherren godkjenner grunnlaget.'
    );
    // A2: fristen er subsidiær fordi forholdet er prekludert i samme brev.
    expect(f).toBe(
      `Byggherrens svar på kravet om fristforlengelse i TEs krav i brev K201-KOE-017-03 av 4. oktober 2026:\n\nPrinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent (se svaret på grunnlaget).\n\nSubsidiært: byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent.\n\nVidere subsidiært: byggherren legger ikke til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1). ${SPESIFISERING_JA}\n\nVidere subsidiært: byggherren godkjenner 10 dager av de krevde 20 dager.`
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
      `Byggherrens svar på kravet om fristforlengelse i TEs krav i brev K201-KOE-017-03 av 4. oktober 2026: ${FORBEHOLD_BREV_2} Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent. Byggherren legger til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1). ${SPESIFISERING_JA} Byggherren godkjenner 20 dager.`,
    ]);
  });

  it('beløpet i et delvis godkjent vederlag står med det krevde, uten merverdiavgift', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026: ${FORBEHOLD_BREV_2} ${METODE_JA} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`,
    ]);
  });

  it('avslaget der § 32.2 gjelder, er et avslag av kravet på endringsordre (§ 32.3 b)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toBe(
      'Byggherrens svar på grunnlaget i TEs krav i brev K201-KOE-017-01 av 2. oktober 2026: Byggherren gjør ikke gjeldende at TEs varsel etter NS 8407 § 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent. Byggherren avslår kravet på endringsordre (NS 8407 § 32.3 første ledd b).'
    );
  });

  it('kontrollsak: avslaget der § 32.2 ikke gjelder, avslår forholdet', () => {
    const s = sak();
    s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('forhold', s.krav('forhold'), { resultat: 'avslaatt' })],
    });
    expect(laast(rad)[0]).toBe(
      'Byggherrens svar på grunnlaget i TEs krav i brev K201-KOE-017-01 av 2. oktober 2026: Byggherren avslår grunnlaget.'
    );
  });

  it('frafallet lover endringsordre for allerede utført arbeid (§ 32.3 c, LV-U4 5.5b)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
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
      /Byggherren godkjenner 15 dager av de krevde 20 dager\. Svaret erstatter byggherrens svar i brev K201-KOE-017-04 av 5\. oktober 2026\.$/
    );
  });

  it('godkjenningen som er en endringsordre, krever endringen og siterer TEs beskrivelse (GR-U14)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toBe(
      `Byggherrens svar på grunnlaget i TEs krav i brev K201-KOE-017-01 av 2. oktober 2026: Byggherren gjør ikke gjeldende at TEs varsel etter NS 8407 § 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent. Byggherren godkjenner grunnlaget. Svaret er en endringsordre etter NS 8407 § 32.3 første ledd a, jf. § 31.3: byggherren krever at endringen utføres slik pålegget er beskrevet i TEs krav i brev K201-KOE-017-01 av 2. oktober 2026: «${BESKRIVELSE}».`
    );
  });

  it('brevet viser til kravversjonen svaret gjelder, også etter en ny kravversjon (GR-U14)', () => {
    const s = sakMedKrav();
    s.send('TE', { ...PAABEROPELSE, utdypning: 'Ny beskrivelse.' });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toMatch(
      /beskrevet i TEs krav i brev K201-KOE-017-04 av 5\. oktober 2026: «Ny beskrivelse\.»\.$/
    );
  });

  it('et registrert krav er dokumentasjon, så byggherren kan ikke godkjenne det fra appen (OV-U4)', () => {
    const s = sak();
    const id = randomUUID();
    s.rad('TE', {
      krav: [
        { id, spor: 'forhold', hovedkategori: 'endring', underkategori: 'irregulaer_endring' },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      korrespondansetype: 'brev',
    });
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.forhold.gjeldendeKrav, 'kravet er ikke gjeldende krav (OV-U4)').toBeNull();
    const godkjent = {
      type: 'brev',
      svar: [svar('forhold', id, { resultat: 'godkjent', grunnlag_varslet_i_tide: true })],
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
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
    });
    const godkjent = (iTide: boolean) => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
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

describe('svaret på vederlag og frist når forholdet er avslått eller prekludert (A2, B-13 05.10)', () => {
  const vederlag = (s: ReturnType<typeof sak>) =>
    svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]);
  const forhold = (s: ReturnType<typeof sak>, resultat: string, iTide: boolean) =>
    svar('forhold', s.krav('forhold'), { resultat, grunnlag_varslet_i_tide: iTide });
  const delvis = `byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`;
  const innledning =
    'Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026:';

  it.each([
    [
      'avslått i samme brev',
      'avslaatt',
      true,
      `Prinsipalt: byggherren avslår grunnlaget (se svaret på grunnlaget).\n\nSubsidiært: ${metodeJa} ${delvis[0].toUpperCase()}${delvis.slice(1)}`,
    ],
    [
      'prekludert og godkjent subsidiært i samme brev',
      'godkjent',
      false,
      `Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent (se svaret på grunnlaget).\n\nSubsidiært: ${metodeJa} ${delvis[0].toUpperCase()}${delvis.slice(1)}`,
    ],
    [
      'prekludert og avslått subsidiært i samme brev',
      'avslaatt',
      false,
      `Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent.\n\nSubsidiært: byggherren avslår grunnlaget (se svaret på grunnlaget).\n\nVidere subsidiært: ${metodeJa} ${delvis[0].toUpperCase()}${delvis.slice(1)}`,
    ],
  ])('forholdet %s', (_n, resultat, iTide, forventet) => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [forhold(s, resultat, iTide), vederlag(s)] });
    expect(laast(rad)[1]).toBe(`${innledning}\n\n${forventet}`);
  });

  it.each([
    [
      'avslått i et tidligere brev',
      'avslaatt',
      true,
      `Prinsipalt: byggherren har avslått grunnlaget i brev K201-KOE-017-04 av 5. oktober 2026.\n\nSubsidiært: ${metodeJa} ${delvis[0].toUpperCase()}${delvis.slice(1)}`,
    ],
    [
      'prekludert og godkjent subsidiært i et tidligere brev',
      'godkjent',
      false,
      `Prinsipalt: byggherren har gjort gjeldende i brev K201-KOE-017-04 av 5. oktober 2026 at TEs varsel etter NS 8407 § 32.2 kom for sent.\n\nSubsidiært: ${metodeJa} ${delvis[0].toUpperCase()}${delvis.slice(1)}`,
    ],
    [
      'prekludert og avslått subsidiært i et tidligere brev',
      'avslaatt',
      false,
      `Prinsipalt: byggherren har gjort gjeldende i brev K201-KOE-017-04 av 5. oktober 2026 at TEs varsel etter NS 8407 § 32.2 kom for sent.\n\nSubsidiært: byggherren har avslått grunnlaget i samme brev.\n\nVidere subsidiært: ${metodeJa} ${delvis[0].toUpperCase()}${delvis.slice(1)}`,
    ],
  ])('forholdet %s', (_n, resultat, iTide, forventet) => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, resultat, iTide)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)[0]).toBe(`${innledning}\n\n${forventet}`);
  });

  it('standpunktet om at varselet etter § 33.4 kom i tide, nevner hjemmelen etter § 32.2-preklusjonen (LV-U5)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'godkjent', false)] });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad)).toEqual([
      `Byggherrens svar på kravet om fristforlengelse i TEs krav i brev K201-KOE-017-03 av 4. oktober 2026:\n\nPrinsipalt: byggherren har gjort gjeldende i brev K201-KOE-017-04 av 5. oktober 2026 at TEs varsel etter NS 8407 § 32.2 kom for sent. Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent. Byggherren legger til grunn at fremdriften hindres som følge av forholdet (NS 8407 § 33.1). ${SPESIFISERING_JA}\n\nSubsidiært: byggherren godkjenner 20 dager.`,
    ]);
  });

  it('kontrollsak: forholdet godkjent gir ingen prinsipal grunn fra forholdet', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'godkjent', true)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)[0]).toBe(
      `${innledning} ${METODE_JA} ${delvis[0].toUpperCase()}${delvis.slice(1)}`
    );
  });

  it('teksten fryses som den var, og en senere revisjon av svaret på påberopelsen endrer den ikke (MM-U9)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'avslaatt', true)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    const foer = laast(rad);
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
      svar: forhold(s, 'godkjent', true),
    });
    const lest = lesJournal(s.journal, KJERNE.leserformat).find((h) => h.id === rad.event_id)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtekst!.map((a) => a.laast)).toEqual(foer);
  });
});

/**
 * GR-U26: svarer byggherren på vederlag eller frist uten å ha svart på gjeldende versjon av
 * forholdet, sier brevet det, rett etter innledningen i hvert svaravsnitt (arbeidsvalget S2 i
 * #1239). Forholdet avklart ved frafall gir ikke forbeholdet (GR-U23).
 */
describe('forbeholdet når forholdet ikke er besvart (GR-U26)', () => {
  type Sak = ReturnType<typeof sak>;
  const vederlagssvaret = 'Byggherrens svar på kravet om justering av vederlaget i TEs krav i';
  const fristsvaret = 'Byggherrens svar på kravet om fristforlengelse i TEs krav i';
  const forbehold = (brev: string) =>
    `Byggherren har ennå ikke svart på grunnlaget i TEs krav i ${brev}. Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for kravet foreligger.`;
  const delvis = `Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`;
  const vederlag = (s: Sak) =>
    svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]);
  const frist = (s: Sak) => svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1]);
  const forhold = (s: Sak, resultat: string) =>
    svar('forhold', s.krav('forhold'), { resultat, grunnlag_varslet_i_tide: true });

  it('det første svaret på vederlaget har forbeholdet, med brevet påberopelsen står i', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)).toEqual([
      `${vederlagssvaret} brev K201-KOE-017-02 av 3. oktober 2026: ${forbehold('brev K201-KOE-017-01 av 2. oktober 2026')} ${METODE_JA} ${delvis}`,
    ]);
  });

  it('GR-08: en revisjon av vederlagssvaret mens en ny påberopelsesversjon venter, har forbeholdet og ikke avslaget på den forrige', () => {
    const s = sakMedKrav();
    // Brev 5: forholdet avslått og vederlaget delvis godkjent.
    s.send('BH', { type: 'brev', svar: [forhold(s, 'avslaatt'), vederlag(s)] });
    s.send('TE', PAABEROPELSE); // Brev 6: forholdet i versjon 2.
    expect(s.u().spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
    const rad = s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.vederlag.gjeldendeSvar!.id,
      svar: svar(
        'vederlag',
        s.krav('vederlag'),
        { ...VEDERLAG_DELVIS[0], hovedkrav_godkjent_beloep: 110000 },
        { ...VEDERLAG_DELVIS[1], godkjent_beloep: 110000 }
      ),
    });
    const [tekst] = laast(rad);
    expect(tekst).toMatch(
      new RegExp(
        `^${esc(`${vederlagssvaret} brev K201-KOE-017-02 av 3. oktober 2026: ${forbehold('brev K201-KOE-017-05 av 6. oktober 2026')} ${METODE_JA} Byggherren godkjenner ${KR('110 000')}`)}.*${esc('Svaret erstatter byggherrens svar i brev K201-KOE-017-04 av 5. oktober 2026.')}$`
      )
    );
    expect(tekst).not.toMatch(/avsl/);
  });

  it('svar på vederlag og frist i samme brev har forbeholdet i hvert svaravsnitt (arbeidsvalget S2 i #1239)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s), frist(s)] });
    const [v, f] = laast(rad);
    expect(v).toMatch(
      new RegExp(
        `^${esc(`${vederlagssvaret} brev K201-KOE-017-02 av 3. oktober 2026: ${forbehold('brev K201-KOE-017-01 av 2. oktober 2026')} `)}`
      )
    );
    expect(f).toMatch(
      new RegExp(
        `^${esc(`${fristsvaret} brev K201-KOE-017-03 av 4. oktober 2026: ${forbehold('brev K201-KOE-017-01 av 2. oktober 2026')} `)}`
      )
    );
  });

  it('kontrollsak: med forholdet godkjent i samme brev har svaret ikke forbeholdet', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [forhold(s, 'godkjent'), vederlag(s)] });
    expect(laast(rad)[1]).toBe(
      `${vederlagssvaret} brev K201-KOE-017-02 av 3. oktober 2026: ${METODE_JA} ${delvis}`
    );
  });

  it('kontrollsak: med forholdet godkjent i et tidligere brev har svaret ikke forbeholdet', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'godkjent')] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)[0]).toBe(
      `${vederlagssvaret} brev K201-KOE-017-02 av 3. oktober 2026: ${METODE_JA} ${delvis}`
    );
  });

  it('forløpet i #1239: svaret på vederlaget mens en ny påberopelsesversjon venter, har forbeholdet og ikke avslaget på den forrige', () => {
    const s = sakMedKrav();
    // Brev 5: forholdet avslått og vederlaget delvis godkjent.
    s.send('BH', { type: 'brev', svar: [forhold(s, 'avslaatt'), vederlag(s)] });
    s.send('TE', PAABEROPELSE); // Brev 6: forholdet i versjon 2.
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    expect(s.u().spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)).toEqual([
      `${vederlagssvaret} brev K201-KOE-017-06 av 7. oktober 2026: ${forbehold('brev K201-KOE-017-05 av 6. oktober 2026')} ${METODE_JA} ${delvis}`,
    ]);
  });

  it('etter et frafall er forholdet avklart mens en ny versjon venter, og svaret har ikke forbeholdet (GR-U23)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'paalegg_frafalt')] });
    s.send('TE', PAABEROPELSE);
    const u = s.u();
    expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
    expect(u.frafalt, 'forutsetning: grunnlaget er avklart ved frafallet (GR-U23)').toBe(true);
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)[0]).toBe(
      `${vederlagssvaret} brev K201-KOE-017-02 av 3. oktober 2026: ${METODE_JA} ${delvis}`
    );
  });

  it('en full godkjenning under forbeholdet gir enighet om beløpet, betinget av forholdet (GR-U26, HF-U7, GR-U7)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'godkjent',
            hovedkrav_godkjent_beloep: 125000,
            aksepterer_metode: true,
          },
          { resultat: 'godkjent', godkjent_beloep: 125000 }
        ),
      ],
    });
    expect(laast(rad)[0]).toContain(forbehold('brev K201-KOE-017-01 av 2. oktober 2026'));
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.sammenfall, 'forbeholdet er ikke et vilkår etter HF-U7').toBe(true);
    expect(enighetensVirkning(s.u(), 'vederlag'), 'grunnlaget er ikke avklart (GR-U7)').toBe(
      'betinget'
    );
  });
});

/**
 * LV-U31 og LV-U32: godkjenner byggherren oppgjør som fast sum, betegner brevet ikke tilbudet
 * som akseptert, heller ikke når hele beløpet er godkjent. Etiketten for laget står i testene
 * av § 34.1.2 over (OV-U33).
 */
describe('oppgjør som fast sum (LV-U31, LV-U32)', () => {
  const godkjentFor = (beloep: number) => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: beloep === 125000 ? 'godkjent' : 'delvis',
            hovedkrav_godkjent_beloep: beloep,
            aksepterer_metode: true,
          },
          { resultat: beloep === 125000 ? 'godkjent' : 'delvis_godkjent', godkjent_beloep: beloep }
        ),
      ],
    });
    return { tekst: laast(rad)[1], b: (rad.data.svar as Data[])[1].beslutningsgrunnlag as Data };
  };

  it('LV-U31 med lavere beløp: brevet sier at byggherren godkjenner oppgjør som fast sum, og beløpet', () => {
    const { tekst, b } = godkjentFor(100000);
    expect(tekst).toBe(
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026: ${METODE_JA} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
    );
    expect(tekst).not.toMatch(/akseptert|aksepterer/);
    expect(b.sammenfall).toBe(false);
  });

  it('LV-U32 med hele beløpet: samme setning, og standpunktene faller sammen (GR-U7)', () => {
    const { tekst, b } = godkjentFor(125000);
    expect(tekst).toBe(
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev K201-KOE-017-02 av 3. oktober 2026: ${METODE_JA} Byggherren godkjenner ${KR('125 000')}`
    );
    expect(b.sammenfall).toBe(true);
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
      'TE godtar byggherrens svar på kravet om justering av vederlaget i brev K201-KOE-017-04 av 5. oktober 2026.',
    ]);
  });

  it('når svaret er subsidiært fordi forholdet er avslått, sier aksepten at TE ikke er enig i det (GR-U7)', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
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
      'TE godtar byggherrens svar på kravet om fristforlengelse i brev K201-KOE-017-04 av 5. oktober 2026. TE er enig i antallet dager, men ikke i byggherrens standpunkt til grunnlaget.',
    ]);
  });
  it('godkjenner byggherren forholdet etter et subsidiært svar, leser aksepten saken når den sendes (GR-U1, arbeidsvalget om LV-U4 punkt 6)', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
        svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]),
      ],
    });
    const vederlagssvar = s.u().spor.vederlag.gjeldendeSvar!.id;
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
      svar: svar('forhold', s.krav('forhold'), {
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
      'TE godtar byggherrens svar på kravet om justering av vederlaget i brev K201-KOE-017-04 av 5. oktober 2026.',
    ]);
  });
});

describe('innsigelse, protest og passivitet (LV-U4 punkt 7–9, VS-U9, VS-U11)', () => {
  const medInnsigelse = () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
    return s;
  };

  it('innsigelsen står i brevet med det den gjelder', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: s.krav('vederlag') });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at TEs krav om justering av vederlaget i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent (NS 8407 § 5 tredje ledd).',
    ]);
  });

  it('svaret gjentar innsigelsen og viser til den', () => {
    const s = medInnsigelse();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    expect(laast(rad)[0]).toContain(
      'Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
  });

  // Arbeidsvalg 1 i #770 (#536): en påberopelse i et registrert brev er dokumentasjon
  // (OV-U4), og en innsigelse mot det er ingen påberopelse etter § 32.2. Kommandoene og
  // brevteksten leser det likt.
  describe('innsigelse mot et registrert påberopelse (#536)', () => {
    const medRegistrertKrav = () => {
      const s = sakMedKrav();
      const registrert = randomUUID();
      s.rad('TE', {
        krav: [
          {
            id: registrert,
            spor: 'forhold',
            hovedkategori: 'endring',
            underkategori: 'irregulaer_endring',
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
        korrespondansetype: 'brev',
      });
      expect(s.u().forstaatt).toBe(true);
      return { s, registrert };
    };
    const avslag = (s: ReturnType<typeof sak>) => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    // Avslått, så svaret ikke gir registrert enighet (GR-U7) og testen bare gjelder «i tide».
    const iTide = (s: ReturnType<typeof sak>) => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });

    it('brevteksten gjentar den ikke i svaret, men innsigelsen mot kravet fra appen', () => {
      const { s, registrert } = medRegistrertKrav();
      s.send('BH', { type: 'innsigelse', gjelder: registrert });
      expect(laast(s.send('BH', avslag(s)))[0]).not.toContain('jf. innsigelsen');
      // Kontrollsak: samme forløp med innsigelsen mot påberopelsen fra appen.
      const k = medRegistrertKrav().s;
      k.send('BH', { type: 'innsigelse', gjelder: k.krav('forhold') });
      expect(laast(k.send('BH', avslag(k)))[0]).toContain('jf. innsigelsen');
    });

    it('kommandoene avviser den ikke etter et «i tide», og heller ikke innsigelsen mot kravet fra appen (MM-U34 punkt 6, HF-U4)', () => {
      const { s, registrert } = medRegistrertKrav();
      s.send('BH', iTide(s));
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: registrert })).toBeNull();
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('forhold') })).toBeNull();
    });
  });

  it('gir byggherren innsigelsen opp, sier brevet det uttrykkelig (VS-U11)', () => {
    const s = medInnsigelse();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[0]).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev K201-KOE-017-04 av 5. oktober 2026 og gjør ikke gjeldende at TEs varsel etter NS 8407 § 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent.'
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
      'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev K201-KOE-017-04 av 5. oktober 2026 og gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent.'
    );
  });

  const girOpp = 'gir opp innsigelsen';

  it('uten eget varsel er en innsigelse mot det første fristkravet ingen påberopelse etter § 33.4, og et «i tide» gir den ikke opp (VS-U24)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
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
      'Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
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
      'Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent.'
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
      'byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent.'
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
      'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev K201-KOE-017-05 av 6. oktober 2026 og gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent.'
    );
  });

  it('et «i tide» i forholdet gir ikke opp innsigelsen mot fristvarselet (VS-U9, VS-U11)', () => {
    const s = sakMedKrav();
    const varselet = (s.journal.at(-1)!.data.utsagn as Data[]).find((u) => u.art === 'varsel')!;
    s.send('BH', { type: 'innsigelse', gjelder: varselet.id });
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
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
    expect(laast(rad)[0]).toContain(
      'kom for sent, jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
  });

  describe('varselet etter § 32.2 er det samme i hver påberopelsesversjon (VS-U24, arbeidsvalget 15.10 i #500)', () => {
    const medNyVersjon = () => {
      const s = medInnsigelse();
      s.send('TE', PAABEROPELSE);
      return s;
    };

    it('et «i tide» på den nye versjonen gir opp innsigelsen mot den første', () => {
      const s = medNyVersjon();
      const rad = s.send('BH', {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: true,
          }),
        ],
      });
      expect(laast(rad)[0]).toContain(
        'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev K201-KOE-017-04 av 5. oktober 2026'
      );
    });

    it('et «for sent» på den nye versjonen gjentar innsigelsen mot den første', () => {
      const s = medNyVersjon();
      const rad = s.send('BH', {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: false,
          }),
        ],
      });
      expect(laast(rad)[0]).toContain('jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026');
    });

    it('et «i tide» i et registrert brev gir ikke opp innsigelsen, så et «for sent» fra appen på en ny versjon gjentar den (HF-U4, OV-U4)', () => {
      const s = medInnsigelse();
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: s.krav('forhold'),
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: s.krav('forhold'),
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'avslaatt' },
            ],
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-06' }],
        korrespondansetype: 'brev',
      });
      s.send('TE', PAABEROPELSE);
      const forSent = {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: false,
          }),
        ],
      };
      // Det registrerte «i tide» binder ikke byggherren (HF-U4, OV-U4).
      expect(s.avvist('BH', forSent)).toBeNull();
      expect(laast(s.send('BH', forSent))[0]).toContain(
        'jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026'
      );
    });

    /** GR-U11: § 32.2 gjelder ikke kategorien. */
    const svikt = {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    };

    /**
     * Skiftet mellom svikt og endring kan ikke sendes fra appen (GR-U22), så det står
     * som en kravversjon fra en annen skriver, og lesingen av den prøves (MM-U43 punkt 6). Et
     * registrert krav ville vært dokumentasjon uten virkning (OV-U4).
     */
    const skifte = (s: ReturnType<typeof sak>, kommando: { innhold: Data }) => {
      expect(s.avvist('TE', kommando)).toBe('ANNEN_HJEMMEL');
      s.rad('TE', {
        krav: [
          {
            id: randomUUID(),
            spor: 'forhold',
            erstatter: s.krav('forhold'),
            hovedkategori: kommando.innhold.hovedkategori,
            underkategori: kommando.innhold.underkategori,
          },
        ],
      });
    };

    it('en innsigelse mot en versjon der § 32.2 ikke gjelder, gjentas ikke og gis ikke opp i svaret på en senere versjon (VS-U24, GR-U11, MM-U43 punkt 8)', () => {
      const tekstMed = (iTide: boolean) => {
        const s = sak();
        s.send('TE', svikt);
        s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
        skifte(s, PAABEROPELSE);
        return laast(
          s.send('BH', {
            type: 'brev',
            svar: [
              svar('forhold', s.krav('forhold'), {
                resultat: 'avslaatt',
                grunnlag_varslet_i_tide: iTide,
              }),
            ],
          })
        )[0];
      };
      expect(tekstMed(true)).not.toContain(girOpp);
      const forSent = tekstMed(false);
      expect(forSent).toContain(
        'TEs varsel etter NS 8407 § 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent'
      );
      expect(forSent).not.toContain('jf. innsigelsen');
    });

    it('etter et «i tide» etter § 32.2 godtas en innsigelse mot en versjon der § 32.2 ikke gjelder, og mot versjonen som fikk «i tide» (MM-U34 punkt 6, VS-U24, GR-U11, MM-U43 punkt 8)', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      const foerste = s.krav('forhold');
      s.send('BH', {
        type: 'brev',
        svar: [svar('forhold', foerste, { resultat: 'avslaatt', grunnlag_varslet_i_tide: true })],
      });
      skifte(s, svikt);
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('forhold') })).toBeNull();
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: foerste })).toBeNull();
    });

    /** Underkategorien skifter innenfor endring, og § 32.2 gjelder begge (GR-U11). */
    const samordning = {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, underkategori: 'samordning' },
    };
    /** Svaret fra appen på den første versjonen, så skiftet til en ny underkategori. */
    const skifteEtter = (iTide: boolean) => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('BH', {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
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
            spor: 'forhold',
            gjelder: s.krav('forhold'),
            standpunkter: [{ id: randomUUID(), art: 'forhold', resultat: 'avslaatt' }],
          },
        ],
        ...(registrert
          ? {
              opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-06' }],
              korrespondansetype: 'brev',
            }
          : {}),
      });

    it('etter et «i tide» på en tidligere versjon godtas en innsigelse mot en versjon i en annen underkategori der § 32.2 gjelder, når et svar utenfor kommandoene har besvart den (MM-U34 punkt 6, HF-U8)', () => {
      const s = skifteEtter(true);
      besvar(s, false);
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      const nytt = u.spor.forhold.svar.find((x) => x.gjelder === s.krav('forhold'));
      expect(
        nytt?.beslutningsgrunnlag.varslingsplikt,
        'forutsetning: svaret på den nye versjonen frøs at § 32.2 gjelder (GR-U12)'
      ).toBe(true);
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('forhold') })).toBeNull();
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
          s.u().spor.forhold.svar.some((x) => x.gjelder === s.krav('forhold')),
          'forutsetning: ingen svar med virkning på den nye versjonen'
        ).toBe(false);
        expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('forhold') })).toBeNull();
      }
    );

    it('hjemmelen for innsigelsen leses av svaret som sa «i tide», ikke av et nyere regelsett (MM-U43 punkt 8, GR-U12, #776)', () => {
      const s = sak();
      s.send('TE', {
        ...PAABEROPELSE,
        innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
      });
      const krav = s.krav('forhold');
      // Et svar utenfor kommandoene med «i tide» etter § 32.2, der § 32.2 ikke gjelder kategorien.
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: krav,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: krav,
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'avslaatt' },
            ],
          },
        ],
      });
      expect(
        s.u().spor.forhold.svar[0].beslutningsgrunnlag.varslingsplikt,
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
        'en ny innsigelse er heller ingen påberopelse under det nyere regelsettet (MM-U43 punkt 8, #776)'
      ).toBeNull();
      const revisjon = {
        type: 'revisjon',
        erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
        svar: svar('forhold', krav, { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      };
      // Karakteriserer dagens atferd: brevteksten spør regelsettet når brevet skrives
      // (`innsigelsenPaaberoper`, #776). Revisjonen fryser at § 32.2 gjelder, så svaret og
      // teksten sier det samme (#798).
      expect(s.vis('BH', revisjon, nyere)?.[0]).toContain(
        `${girOpp} etter NS 8407 § 5 i brev K201-KOE-017-03 av 4. oktober 2026`
      );
    });
  });

  /**
   * BHs innsigelse mot påberopelsen (brev 5) og svaret på forholdet med
   * påberopelsen av for sen varsling (brev 6): alt en protest, påberopt passivitet og
   * en senere begrunnelse kunne gjelde før OV-U7.
   */
  const medSvarPaaInnsigelsen = () => {
    const s = medInnsigelse();
    const innsigelse = s.journal.at(-1)!;
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
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

  it('protest, påberopt passivitet og senere begrunnelse avvises fra begge parter, med FEIL_PART for parten handlingen ikke tilhører (#997), og ingen hendelse skrives (OV-U7, arbeidsvalget 16.10 på #587)', () => {
    const { s, innsigelse, brevet, svarId, rettidighet } = medSvarPaaInnsigelsen();
    // Påberopt passivitet er TEs handling og den senere begrunnelsen byggherrens (#997).
    const kommandoer: [Data, Part | null][] = [
      [{ type: 'protest', gjelder: innsigelse }, null],
      [{ type: 'protest', gjelder: brevet }, null],
      [{ type: 'protest', gjelder: rettidighet }, null],
      [{ type: 'passivitet', gjelder: s.krav('forhold') }, 'TE'],
      [{ type: 'begrunnelse', gjelder: svarId, utdypning: BEGRUNNELSE }, 'BH'],
      [
        {
          type: 'begrunnelse',
          gjelder: svarId,
          sendt: '2026-10-07',
          korrespondansetype: 'brev',
          dokumentasjon: [randomUUID()],
        },
        'BH',
      ],
    ];
    const foer = s.journal.length;
    for (const part of ['TE', 'BH'] as const)
      for (const [k, eier] of kommandoer)
        expect(s.avvist(part, k), `${part}: ${JSON.stringify(k)}`).toBe(
          eier === null || eier === part ? 'IKKE_I_FOERSTE_VERSJON' : 'FEIL_PART'
        );
    expect(s.journal).toHaveLength(foer);
  });

  it('protest, påberopt passivitet og senere begrunnelse tilbys ingen av partene, også med en innsigelse, et dokument, en påberopelse og et svar (OV-U7)', () => {
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

  it('en lest protest, påberopt passivitet og senere begrunnelse gjør saken fortsatt forstått og vises ved siden av, uten virkning på sporene (OV-U7, VS-U1, VS-U12, KA-U34 (opphevet av KA-U46))', () => {
    const { s, innsigelse, svarId } = medSvarPaaInnsigelsen();
    const foer = s.u();
    const utsagn = (art: string, gjelder: string) => ({
      utsagn: [{ id: randomUUID(), art, gjelder }],
    });
    const protest = s.rad('TE', utsagn('protest', innsigelse));
    const passivitet = s.rad('TE', utsagn('passivitet', s.krav('forhold')));
    const begrunnelse = s.rad('BH', utsagn('begrunnelse', svarId));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.protester.map((p) => [p.part, p.gjelder, p.hendelse])).toEqual([
      ['TE', innsigelse, protest.event_id],
    ]);
    expect(u.passivitet.map((p) => [p.part, p.gjelder, p.hendelse])).toEqual([
      ['TE', s.krav('forhold'), passivitet.event_id],
    ]);
    const b = (begrunnelse.data.utsagn as Data[])[0].id as string;
    expect(u.elementer[b]).toEqual({
      hendelse: begrunnelse.event_id,
      part: 'BH',
      art: 'begrunnelse',
    });
    const v = visning(u, GJELDENDE_REGLER);
    expect(v.spor.forhold.etiketter).toContain('passivitet_paaberopt');
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
  /** Et registrert svar fra byggherren på forholdet, sendt 3.10 (brev 3). */
  const medRegistrertSvar = (opplysninger: Data[] = []) => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.rad('BH', {
      svar: [
        {
          id: randomUUID(),
          spor: 'forhold',
          gjelder: s.krav('forhold'),
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: s.krav('forhold'),
              hjemmel: '32.2',
              i_tide: true,
            },
            { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
          ],
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-03' }, ...opplysninger],
      korrespondansetype: 'brev',
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
      s.avvist('BH', { type: 'merking', gjelder: rad.event_id, spor: ['forhold', 'frist'] })
    ).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(s.avvist('BH', { type: 'avklaring', gjelder: rad.event_id })).toBe(
      'IKKE_I_FOERSTE_VERSJON'
    );
  });
});

describe('den senere begrunnelsen (KA-U34)', () => {
  const forholdAvslaatt = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const svarId = (rad: Journalrad, i = 0) => (rad.data.svar as Data[])[i].id as string;

  /** Saken med kravene og byggherrens svar på alle tre i brev 5. */
  const medSvar = () => {
    const s = sakMedKrav();
    const brev = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), forholdAvslaatt),
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
    expect(lest('BH', s.krav('forhold'))).toBe(false);
  });
});

/**
 * MM-U34 punkt 12: «kravene er avgjort» er en opplysning i visningen, og ingen regel sperrer
 * etter den. Sperren gjelder fra endringsordren er sendt (punkt 19), og saker der TE har
 * godtatt avslaget på forholdet eller trukket det, følger GR-U27.
 */
describe('når kravene er avgjort, er det en opplysning og ingen sperre (MM-U34 punkt 12, KA-U11, OV-U3)', () => {
  const godkjentForhold = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
  const heltVederlag = [
    { hovedkrav_vurdering: 'godkjent', hovedkrav_godkjent_beloep: 125000, aksepterer_metode: true },
    { resultat: 'godkjent', godkjent_beloep: 125000 },
  ] as const;

  /** Forholdet godkjent og vederlaget godkjent fullt (enighet ved sammenfall); fristen ikke sendt. */
  const utenFrist = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), godkjentForhold),
        svar('vederlag', s.krav('vederlag'), heltVederlag[0], heltVederlag[1]),
      ],
    });
    return s;
  };

  const vederlagskrav = {
    type: 'krav',
    spor: 'vederlag',
    innhold: tilbud(90000),
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
    korrespondansetype: 'brev',
    spor: 'frist',
    hjemmel: '33.4',
    sendt: '2026-09-28',
    dokumentasjon: [randomUUID()],
  });

  it('et spor uten krav hindrer ikke: med ett sendt krav avgjort er kravene avgjort, og visningen sier det med OV-U10 (OV-U3)', () => {
    const u = utenFrist().u();
    expect(kraveneErAvgjort(u)).toBe(true);
    expect(visning(u, GJELDENDE_REGLER).status).toEqual({
      kode: 'alle_krav_avgjort',
      tekst: 'Alle krav sendt i appen er avgjort',
    });
    expect(
      kanInngaaIEo(u),
      'et spor TE fortsatt kan sende, hindrer ikke endringsordren (MM-U34 punkt 20)'
    ).toBe(true);
  });

  it('når kravene er avgjort, godtas byggherrens innsigelse mot et varsel og mot kravet enigheten omfatter (OV-U3, MM-U34 punkt 13)', () => {
    const s = utenFrist();
    expect(kraveneErAvgjort(s.u()), 'forutsetning: kravene er avgjort').toBe(true);
    s.send('TE', { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' });
    const varsel = s.u().spor.frist.varsler['33.4']!.id;
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: varsel })).toBeNull();
    expect(s.u().spor.vederlag.enighet, 'forutsetning: enighet i vederlaget').not.toBeNull();
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('vederlag') })).toBeNull();
  });

  it('uten et sendt vederlags- eller fristkrav er kravene ikke avgjort, også når forholdet er godkjent (OV-U3)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [svar('forhold', s.krav('forhold'), godkjentForhold)],
    });
    const u = s.u();
    expect(u.forholdAvklart, 'forutsetning: grunnlaget er avklart').toBe(true);
    expect(kraveneErAvgjort(u)).toBe(false);
    // MM-U22: saken har ingen samlet status før kravene er avgjort.
    expect(visning(u, GJELDENDE_REGLER).status).toBeNull();
  });

  it('når kravene er avgjort, godtas trekk av vederlagskravet, ny kravversjon, byggherrens revisjon og det særskilte varselet fra appen, og datoen for det kan registreres (MM-U34 punkt 9, 11 og 12, OV-U5, OV-U8 (opphevet av OV-U89))', () => {
    const s = utenFrist();
    expect(kraveneErAvgjort(s.u()), 'forutsetning: kravene er avgjort').toBe(true);
    expect(s.avvist('TE', { type: 'trekk', spor: 'vederlag' })).toBeNull();
    expect(s.avvist('TE', vederlagskrav)).toBeNull();
    expect(s.avvist('BH', revisjonAvVederlaget(s))).toBeNull();
    expect(s.avvist('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.3' })).toBeNull();
    // Kontrollsak: godkjenningen av forholdet er en endringsordre, så trekket av forholdet
    // avvises av sperren i KA-U13, ikke fordi kravene er avgjort (EO-U12).
    expect(s.avvist('TE', { type: 'trekk', spor: 'forhold' })).toBe('FORHOLD_ER_ENDRINGSORDRE');
    expect(
      s.avvist('TE', {
        type: 'varsel',
        korrespondansetype: 'brev',
        spor: 'vederlag',
        hjemmel: '34.1.3',
        sendt: '2026-09-28',
        dokumentasjon: [randomUUID()],
      })
    ).toBeNull();
  });

  it('når kravene er avgjort, kan TE sende en ny kravversjon og byggherren revidere svaret, og saken er forstått (MM-U34 punkt 9, 11 og 12)', () => {
    const medKravversjon = utenFrist();
    medKravversjon.send('TE', vederlagskrav);
    const etterKrav = medKravversjon.u();
    expect(etterKrav.forstaatt, JSON.stringify(etterKrav.begrensninger)).toBe(true);
    expect(venterPaaSvar(etterKrav, 'vederlag'), 'den nye kravversjonen venter på svar').toBe(true);
    const medRevisjon = utenFrist();
    medRevisjon.send('BH', revisjonAvVederlaget(medRevisjon));
    const etterRevisjon = medRevisjon.u();
    expect(etterRevisjon.forstaatt, JSON.stringify(etterRevisjon.begrensninger)).toBe(true);
    expect(etterRevisjon.spor.vederlag.svar).toHaveLength(2);
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
    expect(s.avvist('TE', varseldato())).toBeNull();
    s.send('TE', varseldato());
    const etter = s.u();
    expect(etter.spor.frist.varsler['33.4'], 'varselet har virkning (OV-U5)').toBeDefined();
    expect(etter.utenVirkning).toEqual([]);
    expect(kraveneErAvgjort(etter), 'varselet endrer ikke at kravene er avgjort').toBe(true);
  });

  it('det første kravet i sporet gjør at kravene ikke lenger er avgjort, og det som var avgjort, kan fortsatt endres (MM-U34 punkt 12, OV-U3)', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    const u = s.u();
    expect(kraveneErAvgjort(u)).toBe(false);
    expect(visning(u, GJELDENDE_REGLER).status).toBeNull();
    expect(s.avvist('TE', { type: 'trekk', spor: 'vederlag' })).toBeNull();
    expect(s.avvist('TE', vederlagskrav)).toBeNull();
    expect(s.avvist('BH', revisjonAvVederlaget(s))).toBeNull();
    expect(s.avvist('TE', { type: 'trekk', spor: 'frist' })).toBeNull();

    s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    const etter = s.u();
    expect(kraveneErAvgjort(etter), 'det nye kravet er avgjort ved sammenfall').toBe(true);
    expect(kanInngaaIEo(etter)).toBe(true);
  });

  it('en rad som trekker et krav som var avgjort, gjør saken fortsatt forstått, og kravet er trukket (MM-U43 punkt 7, MM-U34 punkt 12)', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    const vederlagskravId = s.krav('vederlag');
    s.rad('TE', utsagn(randomUUID(), 'trekk', vederlagskravId));
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.spor.vederlag.trukket).toBe(true);
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
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      korrespondansetype: 'brev',
    });
    const u = s.u();
    expect(u.forstaatt, 'forutsetning: saken er forstått').toBe(true);
    expect(visning(u, GJELDENDE_REGLER).status).toEqual({
      kode: 'alle_krav_avgjort',
      tekst:
        'Alle krav sendt i appen er avgjort. Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.',
    });
  });

  it('når TE ikke krever fristforlengelse, er kravene avgjort, og trekket av vederlagskravet godtas (MM-U34 punkt 12, KA-U12)', () => {
    const s = utenFrist();
    s.send('TE', { type: 'ingen_krav', spor: 'frist' });
    expect(kraveneErAvgjort(s.u())).toBe(true);
    expect(s.avvist('TE', { type: 'trekk', spor: 'vederlag' })).toBeNull();
  });

  /** Kravene avgjort: forholdet og vederlaget godkjent, fristkravet trukket (KA-U11). */
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

  it('en lest senere begrunnelse etter at kravene er avgjort, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, KA-U34 (opphevet av KA-U46))', () => {
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
    const paaberopelse = s.krav('forhold');
    s.rad('TE', utsagn(randomUUID(), 'passivitet', paaberopelse));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.passivitet.map((p) => [p.part, p.gjelder])).toEqual([['TE', paaberopelse]]);
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
  });

  /** Saken lukket etter GR-U27: TE har godtatt avslaget på forholdet. */
  const lukket = () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    s.send('TE', {
      type: 'aksept',
      spor: 'forhold',
      svar: s.u().spor.forhold.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    const foer = s.u();
    expect(foer.forholdAvvist, 'forutsetning: saken er lukket etter GR-U27').toBe(true);
    return { s, foer };
  };

  it('en lest senere begrunnelse etter at saken er lukket etter GR-U27, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, KA-U34 (opphevet av KA-U46))', () => {
    const { s, foer } = lukket();
    const svarId = foer.spor.forhold.gjeldendeSvar!.id;
    const id = randomUUID();
    s.rad('BH', utsagn(id, 'begrunnelse', svarId));
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.elementer[id]?.art).toBe('begrunnelse');
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
  });

  it('en lest påberopt passivitet etter at saken er lukket etter GR-U27, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, VS-U12)', () => {
    const { s, foer } = lukket();
    const paaberopelse = s.krav('forhold');
    s.rad('TE', utsagn(randomUUID(), 'passivitet', paaberopelse));
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.passivitet.map((p) => [p.part, p.gjelder])).toEqual([['TE', paaberopelse]]);
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
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
          'forhold',
          s.krav('forhold'),
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
    expect(sak().avvist('TE', PAABEROPELSE)).toBeNull();
  });

  it('en kommando uten teksten avvises, også når alt annet stemmer (ikke fail-open)', () => {
    const s = sak();
    const u = vurder(
      PAABEROPELSE,
      {
        sakId: SAK,
        aktoerId: 'te',
        part: 'TE',
        teamId: null,
        sakskode: { kode: 'koe' as const, loepenummer: 17 },
        kontraktsforkortelse: 'K201',
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
      PAABEROPELSE,
      {
        sakId: SAK,
        aktoerId: 'te',
        part: 'TE',
        teamId: null,
        sakskode: { kode: 'koe' as const, loepenummer: 17 },
        kontraktsforkortelse: 'K201',
        tidspunkt: () => new Date(),
        nyId: randomUUID,
      },
      s.journal,
      KJERNE
    );
    const t = vist.godtatt ? laastTekst(vist.hendelser[0])! : [];
    expect(t, 'forutsetning: forhåndsvisningen har teksten').toHaveLength(1);
    expect(s.avvist('TE', { ...PAABEROPELSE, brevtekst: [t[0].replace('32.1', '32.2')] })).toBe(
      'ANNEN_BREVTEKST'
    );
    expect(s.avvist('TE', { ...PAABEROPELSE, brevtekst: [...t, t[0]] })).toBe('ANNEN_BREVTEKST');
    expect(s.avvist('TE', { ...PAABEROPELSE, brevtekst: t })).toBeNull();
  });

  it('en registrering bærer ingen tekst (MM-U17, MM-U50)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varsel = {
      type: 'varsel',
      korrespondansetype: 'brev',
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
    s.send('TE', PAABEROPELSE);
    expect(s.avvisning('TE', utenBrevet)).toEqual({
      regel: 'VEDLEGG_MANGLER',
      melding:
        'Kravet oppgir datoen varselet etter § 33.4 ble sendt, men brevet med varselet ligger ikke ved (OV-U5).',
    });
    expect(s.avvist('TE', FRISTKRAV), 'kontrollsak').toBeNull();
  });

  it('er varselet registrert med brevet, kreves bare samme dato i kravet (SK-12, arbeidsvalget i #909)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'varsel',
      korrespondansetype: 'brev',
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
    s.send('TE', PAABEROPELSE);
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
    s.send('TE', PAABEROPELSE);
    const vedlegg = randomUUID();
    const kommando = {
      type: 'varsel',
      korrespondansetype: 'brev',
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
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
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

/**
 * VS-U38: har TE alt sendt varselet etter punkt 32.2 utenfor løsningen, legges dokumentet
 * med varselet ved påberopelsen. Et fristkrav har brevet med varselet i `varsel` (OV-U5).
 */
describe('vedleggene ved påberopelsen (VS-U38)', () => {
  it('påberopelsen lagrer vedlegget med ID, filnavn og sum (VS-U38, LV-U14)', () => {
    const s = sak();
    const rad = s.send('TE', { ...PAABEROPELSE, dokumentasjon: [VARSELBREVET] });
    expect(rad.data.dokumentasjon).toEqual([
      { vedlegg_id: VARSELBREVET, filnavn: `${VARSELBREVET}.pdf`, innhold_sha256: '0'.repeat(64) },
    ]);
  });

  it('et vedlegg ved et fristkrav utenfor varselet avvises i formen (OV-U5)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(s.avvisning('TE', { ...FRISTKRAV, dokumentasjon: [VARSELBREVET] })?.melding).toBe(
      '$.dokumentasjon: bare påberopelsen har vedlegg ved kravet'
    );
    expect(s.avvist('TE', FRISTKRAV), 'kontrollsak').toBeNull();
  });

  it('samme vedlegg to ganger ved påberopelsen avvises i formen', () => {
    const s = sak();
    expect(
      s.avvisning('TE', {
        ...PAABEROPELSE,
        dokumentasjon: [VARSELBREVET, VARSELBREVET.toUpperCase()],
      })?.melding
    ).toBe('$.dokumentasjon: samme vedlegg står to ganger');
  });
});

describe('forespørselen og svaret etter § 33.6.2 (VS-U17, VS-U19, VS-U27, VS-U29, LV-U18)', () => {
  const foresporsel = { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' };
  const begrunnelseB = 'Omfanget av omprosjekteringen er ikke kjent ennå.';
  const id = (rad: Journalrad) => (rad.data.utsagn as Data[])[0].id as string;
  const medForesporsel = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
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
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', foresporsel)).toBe('FEIL_PART');
    s.send('TE', FRISTKRAV);
    expect(s.avvist('BH', foresporsel)).toBe('FRISTKRAV_SENDT');
  });

  it('VS-U33: et fristkrav i et registrert brev stopper ikke forespørselen fra appen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.rad('TE', {
      krav: [{ id: randomUUID(), spor: 'frist', dager: 20 }],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-01' }],
      korrespondansetype: 'brev',
    });
    expect(s.avvist('BH', foresporsel)).toBeNull();
    // Kjernen forstår journalen med forespørselen etter det registrerte kravet (send kaster ellers).
    s.send('BH', foresporsel);
  });

  it('VS-U33: et fristkrav fremmet i appen stopper forespørselen (kontrollsak)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
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
      'Byggherrens standpunkt: prinsipalt varselet etter § 33.4 og svaret på forespørselen etter § 33.6.2 kom for sent, subsidiært godkjent med 20 dager.'
    );
    // OV-U32: begge påberopelsene står i lag 1 og deler én etikett i brevet, og dagene står i lag 2.
    expect((b.virkninger as Data[]).map((v) => v.lag)).toEqual([1, 1, 2]);
    expect(laast(rad)[0].match(/(Prinsipalt|Subsidiært|Videre subsidiært):/g)).toEqual([
      'Prinsipalt:',
      'Subsidiært:',
    ]);
  });

  it('VG-A-01: beslutningslinja sier at svaret på forespørselen etter § 33.6.2 kom for sent, ikke «prekludert» (HF-U11, MM-U23)', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      {
        ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'),
        frist_varsel_ok: true,
        foresporsel_svar_ok: false,
      },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    expect(((rad.data.svar as Data[])[0].beslutningsgrunnlag as Data).linje).toBe(
      'Byggherrens standpunkt: prinsipalt svaret på forespørselen etter § 33.6.2 kom for sent, subsidiært godkjent med 20 dager.'
    );
  });

  it('KA-U24 (opphevet av KA-U46): et svar som gjør gjeldende at svaret på forespørselen etter § 33.6.2 kom for sent, må begrunnes, også med dagene godkjent subsidiært (VS-U17)', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const vurdert = (vurderinger: Data) => ({
      ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'),
      ...vurderinger,
    });
    const resultat = { resultat: 'avslaatt', godkjent_dager: 0 };
    const brevet = (vurderinger: Data) => ({
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), vurdert(vurderinger), resultat, null)],
    });
    expect(
      s.avvisning('BH', brevet({ frist_varsel_ok: true, foresporsel_svar_ok: false }))?.melding
    ).toBe(
      'Svaret må ha en begrunnelse, fordi du gjør gjeldende at svaret på forespørselen etter § 33.6.2 kom for sent.'
    );
    // Kontrollsak: det samme svaret med en begrunnelse godtas.
    const medBegrunnelse = {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          vurdert({ frist_varsel_ok: true, foresporsel_svar_ok: false }),
          resultat
        ),
      ],
    };
    expect(s.avvist('BH', medBegrunnelse)).toBeNull();
    // #1279: tre grunner settes sammen til «A, B og C».
    expect(
      s.avvisning(
        'BH',
        brevet({ frist_varsel_ok: false, foresporsel_svar_ok: false, vilkar_oppfylt: false })
      )?.melding
    ).toBe(
      'Svaret må ha en begrunnelse, fordi du gjør gjeldende at varselet etter § 33.4 kom for sent, gjør gjeldende at svaret på forespørselen etter § 33.6.2 kom for sent og gjør gjeldende at fremdriften ikke er hindret som følge av forholdet.'
    );
  });

  it('VG-A-01: en beslutningslinje frosset før #1302 leses med den gamle ordlyden (MM-U9)', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      {
        ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'),
        frist_varsel_ok: false,
        foresporsel_svar_ok: true,
      },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    // Linja slik kjernen frøs den før #1302. Kjernen regner den ikke ut på nytt.
    const gammel =
      'Byggherrens standpunkt: prinsipalt prekludert (§ 33.4), subsidiært godkjent med 20 dager.';
    ((rad.data.svar as Data[])[0].beslutningsgrunnlag as Data).linje = gammel;
    const lest = lesJournal(s.journal, KJERNE.leserformat).find((h) => h.id === rad.event_id)!;
    expect(lest.art === 'dokument' && lest.dokument.svar![0].beslutningsgrunnlag.linje).toBe(
      gammel
    );
    expect(s.u().spor.frist.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(gammel);
  });

  it('kravet som svarer på forespørselen, sier det (LV-U18 setning 3), og § 33.6.1 kan ikke påberopes (fjerde ledd)', () => {
    const { s } = medForesporsel();
    const krav = s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(laast(krav)).toEqual([
      'TE krever fristforlengelse på 20 dager (NS 8407 § 33.6.1). Kravet er svar på byggherrens forespørsel etter NS 8407 § 33.6.2 i brev K201-KOE-017-02 av 3. oktober 2026.',
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
      'byggherren gjør gjeldende at TEs svar på forespørselen etter NS 8407 § 33.6.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
    expect((rad.data.svar as Data[])[0].utregning).toMatchObject({ resultat: 'avslaatt' });
  });

  it('begrunnelsen etter annet ledd b har setning 2 i LV-U18 og TEs tekst som utdypning', () => {
    const { rad, b } = medBegrunnelse();
    expect(tekst(rad)).toEqual([
      {
        gjelder: b,
        laast:
          'TE svarer på byggherrens forespørsel etter NS 8407 § 33.6.2 i brev K201-KOE-017-02 av 3. oktober 2026 at grunnlaget for å beregne kravet ikke foreligger (§ 33.6.2 annet ledd b).',
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
      'Byggherren gjør gjeldende at TEs svar i brev K201-KOE-017-03 av 4. oktober 2026 på forespørselen etter NS 8407 § 33.6.2 kom for sent (NS 8407 § 5 tredje ledd).',
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
      'byggherren gjør gjeldende at TEs svar på forespørselen etter NS 8407 § 33.6.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
  });

  it('standpunktet etter § 33.6.2 gir TEs brev med begrunnelsen under Deres ref., men ikke forespørselen (LV-U49, D-1 i BF-07, arbeidsvalget A i #1497)', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    expect(rad.data.deres_ref).toEqual(['K201-KOE-017-03', 'K201-KOE-017-05']);
  });

  it('etter «i tide» etter § 33.6.2 godtas en senere innsigelse mot begrunnelsen (MM-U34 punkt 6, HF-U4)', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    // Delvis godkjent, så svaret ikke gir registrert enighet ved sammenfall (GR-U7).
    const rad = fristsvar(
      s,
      { ...FRIST_FULLT[0], dager: 10, foresporsel_svar_ok: true },
      { resultat: 'delvis_godkjent', godkjent_dager: 10 }
    );
    expect(laast(rad)[0]).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev K201-KOE-017-04 av 5. oktober 2026 og gjør ikke gjeldende at TEs svar på forespørselen etter NS 8407 § 33.6.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: b })).toBeNull();
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
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('BH', foresporsel), 'kontrollsak: ingen forespørsel').toBeNull();
    const { s: medF } = medForesporsel();
    expect(medF.avvist('BH', foresporsel)).toBe('FORESPORSEL_SENDT');
  });

  it('VS-U31: en lest rad med en andre forespørsel gjør saken ikke forstått', () => {
    const andre = { utsagn: [{ id: randomUUID(), art: 'foresporsel', hjemmel: '33.6.2' }] };
    const s = sak();
    s.send('TE', PAABEROPELSE);
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

  it('HF-U1, LV-U18 punkt 3, LV-U49: kravet sendt mens forespørselen er ubesvart, viser til den i `gjelder` og har brevet i Deres ref.', () => {
    const { s, f } = medForesporsel();
    const krav = (s.send('TE', utenFelt(FRISTKRAV, 'varsel')).data.krav as Data[])[0];
    expect(krav.gjelder).toBe(f);
    expect(s.u().spor.frist.foresporsler).toEqual([
      { foresporsel: f, svar: krav.id, medKrav: true },
    ]);
    expect(s.journal.at(-1)!.data.deres_ref).toEqual(['K201-KOE-017-02']);
    // VS-U17: etter begrunnelsen er kravet ikke svaret på forespørselen.
    const { s: medB } = medBegrunnelse();
    const senere = (medB.send('TE', utenFelt(FRISTKRAV, 'varsel')).data.krav as Data[])[0];
    expect(senere.gjelder).toBeUndefined();
  });

  it('HF-U1: en lest rad med et fristkrav uten henvisning til den ubesvarte forespørselen gjør saken ikke forstått', () => {
    const krav = (gjelder?: string) => ({
      krav: [{ id: randomUUID(), spor: 'frist', dager: 20, ...(gjelder ? { gjelder } : {}) }],
    });
    const { s: kontroll, f } = medForesporsel();
    kontroll.rad('TE', krav(f));
    expect(kontroll.u().forstaatt, 'kontrollsak: kravet viser til forespørselen').toBe(true);
    const { s } = medForesporsel();
    s.rad('TE', krav());
    expect(s.u().forstaatt).toBe(false);
    expect(s.u().begrensninger.map((b) => b.grunn)).toContain(
      'fristkravet viser ikke til forespørselen etter § 33.6.2 det svarer på'
    );
  });

  it('HF-U1: en lest rad med et fristkrav som viser til noe annet enn en ubesvart forespørsel, gjør saken ikke forstått', () => {
    const krav = (gjelder: string) => ({
      krav: [{ id: randomUUID(), spor: 'frist', dager: 20, gjelder }],
    });
    const { s: annet } = medForesporsel();
    annet.rad('TE', krav(annet.krav('forhold')));
    expect(annet.u().begrensninger.map((b) => b.grunn)).toContain(
      'fristkravet viser ikke til en forespørsel etter § 33.6.2 før kravet'
    );
    const { s: besvart, f } = medBegrunnelse();
    besvart.rad('TE', krav(f));
    expect(besvart.u().begrensninger.map((b) => b.grunn)).toContain(
      'fristkravet viser til en forespørsel etter § 33.6.2 som alt er besvart'
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
      brevtittel: null,
      brevnummer: null,
      merking: null,
      deresRef: [],
      korrespondansetype: null,
      beskrivelse: null,
      spor: [],
      retter: null,
      ikkeISaken: false,
    });
    const saken = {
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      tittel: TITTEL,
      svarPaaPaaberopelsen: null,
      datoopplysninger: [],
      subsidiaer: { vederlag: [], frist: [] },
      avklartVedFrafall: false,
      kravpostvarsler: {},
    };
    const tekst = (gjelder: string) =>
      lagBrevtekst(protest(gjelder), s.u().journal, saken, KJERNE.regler)[0].laast;
    expect(tekst(id('33.6.2'))).toBe(
      'TE protesterer mot påberopelsen av at TEs svar på forespørselen etter NS 8407 § 33.6.2 kom for sent i svaret i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
    expect(tekst(id('33.4')), 'kontrollsak: § 33.4 har dagens tekst').toBe(
      'TE protesterer mot påberopelsen av for sen varsling i svaret i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
  });

  it('VS-U29: «ikke et svar etter annet ledd» registreres uten virkning, og gjelder bare begrunnelsen', () => {
    const { s, b } = medBegrunnelse();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: b, grunn: 'ikke_svar' });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at TEs svar i brev K201-KOE-017-03 av 4. oktober 2026 på forespørselen etter NS 8407 § 33.6.2 ikke er et svar etter NS 8407 § 33.6.2 annet ledd.',
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
    const forhold = s.krav('forhold');
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: forhold, grunn: 'ikke_svar' })).toBe(
      'UGYLDIG_INNSIGELSE'
    );
  });
});

describe('varselet etter § 33.4 sendt fra appen (VS-U15)', () => {
  const sendVarsel = { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' };
  const medVarsel = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
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
      brevtittel: null,
      brevnummer: null,
      merking: null,
      deresRef: [],
      korrespondansetype: null,
      beskrivelse: null,
      spor: [],
      retter: null,
      ikkeISaken: false,
    };
    const saken = {
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      tittel: TITTEL,
      svarPaaPaaberopelsen: null,
      datoopplysninger: [],
      subsidiaer: { vederlag: [], frist: [] },
      avklartVedFrafall: false,
      kravpostvarsler: {},
    };
    expect(() => lagBrevtekst(dokument, [], saken, KJERNE.regler)).toThrow(
      'et varsel i et brev fra appen har datoen det ble sendt'
    );
  });

  it('serveren avviser en annen tekst enn den den lager (A1)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', { ...sendVarsel, brevtekst: ['TE varsler.'] })).toBe('ANNEN_BREVTEKST');
  });

  it('innsigelsen viser til varselet i brevet det står i (LV-U4 punkt 7)', () => {
    const { s, id } = medVarsel();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: id });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at TEs varsel om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent (NS 8407 § 5 tredje ledd).',
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
      'byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
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
    innhold: tilbud(125000),
  };
  /** Forholdet i brev 2; `hovedkategori` avgjør om § 34.1.2 gjelder (§ 34.1.1, KA-46). */
  const medPaaberopelse = (hovedkategori: 'svikt' | 'endring') => {
    const s = sak();
    s.send(
      'TE',
      hovedkategori === 'svikt'
        ? {
            ...PAABEROPELSE,
            innhold: {
              hovedkategori,
              underkategori: 'medvirkning',
              ...KLAR_OVER,
            },
          }
        : PAABEROPELSE
    );
    return s;
  };
  /** Varselet fra appen i brev 3. */
  const medVarsel = (hovedkategori: 'svikt' | 'endring' = 'svikt') => {
    const s = medPaaberopelse(hovedkategori);
    const varsel = s.send('TE', sendVarsel);
    return { s, varsel, id: (varsel.data.utsagn as Data[])[0].id as string };
  };
  const svarMedPaaberopelse = (s: ReturnType<typeof sak>) =>
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
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
    expect(s.u().spor.vederlag.varsler['34.1.2']?.hjemmel).toBe('34.1.2');
  });

  it('der TE krever endring, sier visningen at varselet ikke kreves, og ved svikt ikke (OV-U15, § 34.1.1)', () => {
    const etiketter = (kategori: 'endring' | 'svikt') =>
      visning(medPaaberopelse(kategori).u(), GJELDENDE_REGLER).spor.vederlag.etiketter;
    expect(etiketter('endring')).toContain('varsel_kreves_ikke');
    expect(etiketter('svikt')).not.toContain('varsel_kreves_ikke');
  });

  it('et varsel sendt utenfor appen registreres med datoen og brevet, uten tekst fra appen (OV-U5, MM-U17 (opphevet av MM-U50))', () => {
    const s = medPaaberopelse('svikt');
    const rad = s.send('TE', {
      type: 'varsel',
      korrespondansetype: 'brev',
      spor: 'vederlag',
      hjemmel: '34.1.2',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    expect(rad.data.brevtekst).toBeUndefined();
    expect(rad.data.opplysninger).toMatchObject([{ hva: 'sendt', dato: '2026-09-28' }]);
    expect(s.u().spor.vederlag.varsler['34.1.2']?.dokument).toBe(rad.event_id);
  });

  it('varselet etter § 34.1.2 står i vederlaget, og varselet etter § 33.4 i fristen (OV-U5)', () => {
    const s = medPaaberopelse('svikt');
    expect(s.avvist('TE', { ...sendVarsel, spor: 'frist' })).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', { ...sendVarsel, hjemmel: '33.4' })).toBe('UGYLDIG_FORM');
  });

  it('et nytt varsel fra appen etter vederlagskravet avvises, og et tidligere varsel kan registreres (OV-U5, VS-U16)', () => {
    const s = medPaaberopelse('svikt');
    s.send('TE', vederlagskrav);
    expect(s.avvist('TE', sendVarsel)).toBe('VEDERLAGSKRAV_SENDT');
    const registrering = {
      type: 'varsel',
      korrespondansetype: 'brev',
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
      'byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
  });

  it('uten eget varsel gjelder påberopelsen det første vederlagskravet, og brevet nevner brevet med kravet (OV-U5, LV-U21)', () => {
    const s = medPaaberopelse('svikt');
    s.send('TE', vederlagskrav);
    const rad = svarMedPaaberopelse(s);
    const standpunkt = ((rad.data.svar as Data[])[1].standpunkter as Data[]).find(
      (p) => p.art === 'rettidighet'
    );
    expect(standpunkt?.gjelder).toBe(s.krav('vederlag'));
    expect(laast(rad)[1]).toContain(
      'byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
  });

  it('en innsigelse mot varselet er en påberopelse etter § 34.1.2, og svaret gjentar den (VS-U24, VS-U11)', () => {
    const { s, id } = medVarsel();
    const innsigelse = s.send('BH', { type: 'innsigelse', gjelder: id });
    expect(laast(innsigelse)).toEqual([
      'Byggherren gjør gjeldende at TEs varsel om vederlagsjustering etter NS 8407 § 34.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent (NS 8407 § 5 tredje ledd).',
    ]);
    s.send('TE', vederlagskrav);
    expect(laast(svarMedPaaberopelse(s))[1]).toContain(
      'kom for sent, jf. innsigelsen i brev K201-KOE-017-03 av 4. oktober 2026.'
    );
  });

  it('der TE krever endring, avvises innsigelsen mot varselet som vurderingen (KA-46, OV-U15)', () => {
    const { s, id } = medVarsel('endring');
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: id })).toBe('VARSLINGSPLIKT_GJELDER_IKKE');
  });

  it('etter «i tide» i et svar fra appen godtas en innsigelse mot varselet (MM-U34 punkt 6, HF-U4, VS-U24)', () => {
    const { s, id } = medVarsel();
    s.send('TE', vederlagskrav);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: true },
          VEDERLAG_DELVIS[1]
        ),
      ],
    });
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: id })).toBeNull();
  });
});

describe('varselet etter § 32.2 sendt utenfor løsningen (VS-U34, VS-U38, G-2 i #807)', () => {
  // Påberopelsen er brev K201-KOE-017-01 av 2. oktober 2026, og registreringen er brev K201-KOE-017-02 av 3. oktober.
  const registrering = (sendt = '2026-09-28') => ({
    type: 'varsel',
    korrespondansetype: 'brev',
    spor: 'forhold',
    hjemmel: '32.2',
    sendt,
    dokumentasjon: [randomUUID()],
  });
  const medPaaberopelse = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    return s;
  };

  it('registreres som varsel i forholdet med datoen og dokumentet, uten tekst fra løsningen (VS-U34, OV-U80, MM-U17 (opphevet av MM-U50))', () => {
    const s = medPaaberopelse();
    const rad = s.send('TE', registrering());
    expect(rad.data.brevtekst).toBeUndefined();
    expect(rad.data.utsagn).toMatchObject([{ art: 'varsel', hjemmel: '32.2' }]);
    expect(rad.data.opplysninger).toMatchObject([{ hva: 'sendt', dato: '2026-09-28' }]);
    expect(s.u().spor.forhold.varsler['32.2']?.dokument).toBe(rad.event_id);
    expect(s.u().forstaatt).toBe(true);
  });

  it('datoen settes én gang (OV-U80, SK-12)', () => {
    const s = medPaaberopelse();
    s.send('TE', registrering());
    expect(s.avvist('TE', registrering('2026-09-27'))).toBe('VARSEL_REGISTRERT');
  });

  it('datoen kan ikke være senere enn påberopelsen, men samme dag (VS-U38)', () => {
    const s = medPaaberopelse();
    expect(s.avvist('TE', registrering('2026-10-03'))).toBe('VARSEL_ETTER_PAABEROPELSEN');
    expect(s.avvist('TE', registrering('2026-10-02'))).toBeNull();
  });

  it('registreres bare der varslingsplikten etter § 32.2 gjelder kategorien (VS-U39, GR-U11)', () => {
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'medvirkning',
        ...KLAR_OVER,
      },
    });
    expect(s.avvist('TE', registrering())).toBe('VARSLINGSPLIKT_GJELDER_IKKE');
  });

  it('registreres ikke før påberopelsen er sendt (VS-U38, S-2 i #807)', () => {
    const s = sak();
    expect(s.avvist('TE', registrering())).toBe('PAABEROPELSE_IKKE_SENDT');
  });

  it('byggherren tilbys ikke innsigelse mot det registrerte varselet før det har brevtekst (S-4 i #807)', () => {
    const s = medPaaberopelse();
    s.send('TE', registrering());
    const varsel = s.u().spor.forhold.varsler['32.2']?.id;
    expect(varsel).toBeDefined();
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: varsel })).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(handlinger(s.u(), 'BH')).not.toContain(`innsigelse:${varsel}`);
  });

  it('bare TE registrerer varselet (OV-U80)', () => {
    expect(medPaaberopelse().avvist('BH', registrering())).toBe('FEIL_PART');
  });

  it('står i forholdet og sendes ikke fra løsningen, der påberopelsen er varselet (VS-U34, GR-U31)', () => {
    const s = medPaaberopelse();
    expect(s.avvist('TE', { ...registrering(), spor: 'frist' })).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', { type: 'send_varsel', spor: 'forhold', hjemmel: '32.2' })).toBe(
      'UGYLDIG_FORM'
    );
  });

  // VS-U43 punkt 6 og 10 med E3: påberopelsen gjelder det registrerte varselet når det har en
  // tidligere dato. Brevteksten for det registrerte varselet bygges i #1600, så kjernen
  // avviser svaret med en regelkode i stedet for å nevne grunnlagskravet (AGENTS.md,
  // «Domenekjernen»), og svaret tilbys ikke.
  it('byggherrens svar på grunnlaget når varselet etter § 32.2 er registrert, avvises og tilbys ikke til varselet har brevtekst', () => {
    const s = medPaaberopelse();
    const brev = () => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    expect(s.avvist('BH', brev()), 'kontrollsak uten registrert varsel').toBeNull();
    expect(handlinger(s.u(), 'BH'), 'kontrollsak').toContain('svare:forhold');
    s.send('TE', registrering());
    expect(s.avvist('BH', brev())).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(handlinger(s.u(), 'BH')).not.toContain('svare:forhold');
  });

  it('revisjonen av svaret på grunnlaget etter at varselet etter § 32.2 er registrert, avvises til varselet har brevtekst, og svaret på fristen tilbys (VS-U43 punkt 10)', () => {
    const s = medPaaberopelse();
    s.send('TE', FRISTKRAV);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      ],
    });
    const revisjon = () => ({
      type: 'revisjon',
      erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
      svar: svar('forhold', s.krav('forhold'), {
        resultat: 'godkjent',
        grunnlag_varslet_i_tide: false,
      }),
    });
    expect(s.avvist('BH', revisjon()), 'kontrollsak uten registrert varsel').toBeNull();
    s.send('TE', registrering());
    expect(s.avvist('BH', revisjon())).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(handlinger(s.u(), 'BH')).not.toContain('revidere:forhold');
    expect(handlinger(s.u(), 'BH'), 'kontrollsak i fristen').toContain('svare:frist');
  });
});

describe('varselet etter § 32.2 er det første grunnlagskravet (VS-U43 punkt 6 og 10, #1489)', () => {
  // Versjon 1 er brev K201-KOE-017-01 av 2. oktober 2026, og versjon 2 er brev K201-KOE-017-02.
  const medToVersjoner = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', PAABEROPELSE);
    expect(s.u().spor.forhold.krav.length, 'forutsetning: to versjoner').toBe(2);
    return s;
  };
  const svarPaaGjeldende = (s: ReturnType<typeof sak>, iTide: boolean) =>
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: iTide,
        }),
      ],
    });
  const rettidigheten = (rad: Journalrad) => {
    const p = ((rad.data.svar as Data[])[0].standpunkter as Data[]).find(
      (x) => x.art === 'rettidighet'
    );
    expect(p, 'forutsetning: svaret har et standpunkt om rettidigheten').toBeDefined();
    return p!;
  };

  it('svaret på versjon 2 påberoper varselet i den første versjonen, og brevet nevner det brevet (VS-U43 punkt 6 og 10 med designdelen)', () => {
    const s = medToVersjoner();
    const [v1, v2] = s.u().spor.forhold.krav;
    const rad = svarPaaGjeldende(s, false);
    expect((rad.data.svar as Data[])[0].gjelder, 'forutsetning: svaret gjelder versjon 2').toBe(
      v2!.id
    );
    expect(rettidigheten(rad).gjelder).toBe(v1!.id);
    expect(laast(rad)[0]).toContain(
      'Prinsipalt: byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent.'
    );
    // LV-U49: brevet rettidigheten gjelder, står under Deres ref.
    expect(rad.data.deres_ref).toContain('K201-KOE-017-01');
    expect(s.u().forstaatt).toBe(true);
  });

  it('en lagret påberopelse etter § 32.2 som viser til versjon 2, gjør saken ikke forstått, og en som viser til versjon 1, forstås (VS-U43 punkt 6)', () => {
    const lagret = (versjon: 0 | 1) => {
      const s = medToVersjoner();
      const krav = s.u().spor.forhold.krav;
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: krav[1]!.id,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: krav[versjon]!.id,
                hjemmel: '32.2',
                i_tide: false,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'avslaatt' },
            ],
          },
        ],
      });
      return s.u();
    };
    const kontroll = lagret(0);
    expect(kontroll.forstaatt, JSON.stringify(kontroll.begrensninger)).toBe(true);
    expect(lagret(1).forstaatt).toBe(false);
  });

  it('et varsel etter § 32.2 TE registrerer etter svaret, markerer standpunktet, og svaret står med virkningen det hadde (VS-U43 punkt 10, OV-U5)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    svarPaaGjeldende(s, false);
    const gjeldende = s.u().spor.forhold.gjeldendeSvar!;
    const rettidighet = gjeldende.standpunkter.find((p) => p.art === 'rettidighet');
    expect(rettidighet, 'forutsetning: svaret har et standpunkt om rettidigheten').toBeDefined();
    s.send('TE', {
      type: 'varsel',
      korrespondansetype: 'brev',
      spor: 'forhold',
      hjemmel: '32.2',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.svar[gjeldende.id].gjaldtEtAnnetVarsel).toEqual([rettidighet!.id]);
    expect(u.svar[gjeldende.id].virkninger).toEqual(gjeldende.beslutningsgrunnlag.virkninger);
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
    brevtittel: null,
    brevnummer: null,
    merking: null,
    deresRef: [],
    korrespondansetype: null,
    beskrivelse: null,
    spor: [],
    retter: null,
    ikkeISaken: false,
  });
  const saken = {
    sakskode: { kode: 'koe' as const, loepenummer: 17 },
    tittel: TITTEL,
    svarPaaPaaberopelsen: null,
    datoopplysninger: [],
    subsidiaer: { vederlag: [], frist: [] },
    avklartVedFrafall: false,
    kravpostvarsler: {},
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

describe('leseren kontrollerer brevteksten (HF-U1, MM-U17 (opphevet av MM-U50))', () => {
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
    // Registrert korrespondanse slik leseren ellers forstår den (LV-U42, LV-U45), så bare
    // brevteksten skiller raden fra kontrollsaken.
    const registrert = (medBrevtekst: boolean) =>
      medTekst((d) => {
        d.opplysninger = [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }];
        d.korrespondansetype = 'e_post';
        delete d.merking;
        delete d.brevnummer;
        delete d.brevtittel;
        if (!medBrevtekst) delete d.brevtekst;
      });
    expect(registrert(false).art, 'kontrollsak uten brevtekst').toBe('dokument');
    expect(registrert(true).art).toBe('ukjent');
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
    s.send('TE', PAABEROPELSE);
    for (const sendt of ['02.10.2026', '2026-13-45', 'xxxxxxxxxx'])
      expect(s.avvist('TE', { ...FRISTKRAV, varsel: { sendt } })).toBe('UGYLDIG_FORM');
    expect(
      s.avvist('TE', {
        type: 'varsel',
        korrespondansetype: 'brev',
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

/**
 * OV-U89 punkt 9: en påberopelse etter § 34.1.3 mot rigg og drift avvises, og forsvinner ikke
 * (MM-U2). Kontrollsaken er samme svar uten påberopelsen.
 */
describe('en påberopelse etter § 34.1.3 mot rigg og drift avvises (OV-U89 punkt 9)', () => {
  it.each([true, false])('rigg_varslet_i_tide: %s', (iTide) => {
    const s = sakMedKrav();
    const brev = (v: Data) => ({
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), v, VEDERLAG_DELVIS[1])],
    });
    expect(s.avvist('BH', brev({ ...VEDERLAG_DELVIS[0], rigg_varslet_i_tide: iTide }))).toBe(
      'UGYLDIG_VURDERING'
    );
    expect(s.avvist('BH', brev(VEDERLAG_DELVIS[0]))).toBeNull();
    expect(s.avvist('BH', brev({ ...VEDERLAG_DELVIS[0], rigg_varslet_i_tide: null }))).toBeNull();
  });
});

/**
 * MM-U34 punkt 6 opphever sperren i HF-U4: etter at byggherren har sagt i et svar fra appen
 * at varselet eller spesifiseringen kom i tide, godtas en senere påberopelse av at det kom
 * for sent, i en revisjon og i svaret på en senere versjon. Løsningen avgjør ikke om
 * byggherren er bundet av det tidligere standpunktet (MM-U12 (opphevet av MM-U50)).
 */
describe('et «i tide» fra appen sperrer ikke en senere påberopelse (MM-U34 punkt 6, HF-U4, #498)', () => {
  type Sak = ReturnType<typeof sak>;
  type Sporet = 'forhold' | 'vederlag' | 'frist';

  /** Svaret med serverens utregning, så bare påberopelsen kan gi en avvisning. */
  const utregnet = (s: Sak, spor: Sporet, v: Data) => {
    const u = s.u();
    const krav = gjeldendeKrav(u, spor);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(spor, v, { krav, paaberopelse: u.spor.forhold.gjeldendeKrav }, KJERNE.regler)
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
  const nyPaaberopelsesversjon = (s: Sak) =>
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold },
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
  const avslaatt = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const forSenPaaberopelse = { ...avslaatt, grunnlag_varslet_i_tide: false };
  const delvis = {
    hovedkrav_vurdering: 'delvis',
    hovedkrav_godkjent_beloep: 100000,
    aksepterer_metode: true,
  };
  const sakISvikt = () => {
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'grunnforhold',
        ...KLAR_OVER,
      },
    });
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(125000),
    });
    return s;
  };
  /** Det første fristkravet med varselet etter § 33.4 registrert etter svaret med «i tide». */
  const medVarselRegistrertEtterSvaret = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { dager: 20 },
      utdypning: 'Fire uker.',
    });
    brev(s, 'frist', iTide);
    s.send('TE', {
      type: 'varsel',
      korrespondansetype: 'brev',
      spor: 'frist',
      hjemmel: '33.4',
      sendt: '2026-09-01',
      dokumentasjon: [randomUUID()],
    });
    expect(s.u().spor.frist.varsler['33.4'], 'forutsetning: varselet er registrert').toBeDefined();
    return s;
  };

  it.each<[string, () => { s: Sak; kommando: Data }]>([
    [
      '§ 33.4 i en revisjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'frist', iTide);
        return { s, kommando: revisjon(s, 'frist', forSent334) };
      },
    ],
    [
      '§ 33.4 i svaret på en senere kravversjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'frist', iTide);
        s.send('TE', { type: 'krav', spor: 'frist', innhold: { dager: 25 }, utdypning: 'Mer.' });
        return { s, kommando: nyttSvar(s, 'frist', forSent334) };
      },
    ],
    [
      '§ 33.4 i en revisjon etter en ny grunnlagsversjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'frist', iTide);
        nyPaaberopelsesversjon(s);
        return { s, kommando: revisjon(s, 'frist', forSent334) };
      },
    ],
    [
      '§ 33.4 når TE har registrert et tidligere sendt varsel etter svaret (oppdragsgiver 15.10, #498)',
      () => {
        const s = medVarselRegistrertEtterSvaret();
        return { s, kommando: revisjon(s, 'frist', forSent334) };
      },
    ],
    [
      '§ 33.6.1 i en revisjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'frist', iTide);
        return { s, kommando: revisjon(s, 'frist', forSent3361) };
      },
    ],
    [
      '§ 32.2 i en revisjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'forhold', avslaatt);
        return { s, kommando: revisjon(s, 'forhold', forSenPaaberopelse) };
      },
    ],
    [
      '§ 32.2 i svaret på en senere grunnlagsversjon med samme hjemmel (HF-U8, GR-U22)',
      () => {
        const s = sakMedKrav();
        brev(s, 'forhold', avslaatt);
        nyPaaberopelsesversjon(s);
        return { s, kommando: nyttSvar(s, 'forhold', forSenPaaberopelse) };
      },
    ],
    [
      '§ 34.1.2 i en revisjon',
      () => {
        const s = sakISvikt();
        brev(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: true });
        return {
          s,
          kommando: revisjon(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: false }),
        };
      },
    ],
  ])(
    'etter «i tide» godtas en påberopelse etter %s, og saken er forstått (MM-U34 punkt 6, HF-U4)',
    (_n, forloep) => {
      const { s, kommando } = forloep();
      expect(s.avvist('BH', kommando)).toBeNull();
      s.send('BH', kommando);
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    }
  );

  it('en revisjon som påberoper «for sent» etter § 32.2 etter «i tide», godtas og leses som påberopelse: forholdet er ikke lenger avklart (MM-U34 punkt 6, HF-U4, GR-U7)', () => {
    const s = sakMedKrav();
    const godkjent = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
    brev(s, 'forhold', godkjent);
    expect(s.u().forholdAvklart, 'kontrollsak: godkjent uten påberopelse').toBe(true);
    const paaberopelse = revisjon(s, 'forhold', { ...godkjent, grunnlag_varslet_i_tide: false });
    expect(s.avvist('BH', paaberopelse)).toBeNull();
    const rad = s.send('BH', paaberopelse);
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(
      u.spor.forhold.gjeldendeSvar!.standpunkter.find((x) => x.art === 'rettidighet')
    ).toMatchObject({ hjemmel: '32.2', iTide: false });
    expect(laast(rad)[0]).toContain(
      'TEs varsel etter NS 8407 § 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent'
    );
    expect(u.forholdAvklart, 'påberopelsen er virksom, så godkjenningen er subsidiær').toBe(false);
  });

  it('en revisjon som påberoper «for sent» etter § 34.1.2 etter «i tide», godtas og leses som påberopelse av feltet for § 34.1.2 (MM-U34 punkt 6, HF-U4)', () => {
    const s = sakISvikt();
    brev(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: true });
    const rettidighet = () =>
      s.u().spor.vederlag.gjeldendeSvar!.standpunkter.find((x) => x.art === 'rettidighet');
    expect(rettidighet(), 'kontrollsak: «i tide»').toMatchObject({
      hjemmel: '34.1.2',
      iTide: true,
    });
    const paaberopelse = revisjon(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: false });
    expect(s.avvist('BH', paaberopelse)).toBeNull();
    s.send('BH', paaberopelse);
    expect(s.u().forstaatt).toBe(true);
    expect(rettidighet()).toMatchObject({ hjemmel: '34.1.2', iTide: false });
  });

  it('et registrert svar med «i tide» er dokumentasjon, og byggherren kan svare «for sent» fra appen (OV-U4)', () => {
    const s = sakMedKrav();
    const u = s.u();
    s.rad('BH', {
      svar: [
        {
          id: randomUUID(),
          spor: 'frist',
          gjelder: s.krav('frist'),
          paaberopelse: u.spor.forhold.gjeldendeKrav!.id,
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: u.spor.frist.varsler['33.4']!.id,
              hjemmel: '33.4',
              i_tide: true,
            },
            { id: randomUUID(), art: 'dager' },
          ],
          utregning: { resultat: 'delvis_godkjent', godkjent_dager: 10 },
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      korrespondansetype: 'brev',
    });
    const etter = s.u();
    expect(etter.forstaatt, JSON.stringify(etter.begrensninger)).toBe(true);
    expect(
      etter.spor.frist.gjeldendeSvar,
      'det registrerte svaret er dokumentasjon (OV-U4)'
    ).toBeNull();
    expect(s.avvist('BH', nyttSvar(s, 'frist', forSent334))).toBeNull();
  });

  it('«for sent» etter § 32.2 på en registrert versjon i svikt avvises av utregningen (#520, GR-U11, MM-U43 punkt 8)', () => {
    const s = sakMedKrav();
    brev(s, 'forhold', avslaatt);
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          erstatter: s.krav('forhold'),
          hovedkategori: 'svikt',
          underkategori: 'grunnforhold',
        },
      ],
    });
    const uten = { resultat: 'avslaatt' };
    expect(s.avvist('BH', nyttSvar(s, 'forhold', uten)), 'kontrollsak').toBeNull();
    const { resultat } = utregnet(s, 'forhold', uten);
    const medFelt = svar('forhold', s.krav('forhold'), forSenPaaberopelse, resultat as Data);
    expect(s.avvist('BH', { type: 'brev', svar: [medFelt] })).toBe('UGYLDIG_VURDERING');
  });
});

/**
 * GR-U22: når forholdet er sendt, står hovedkategorien og underkategorien, også når § 32.2
 * gjelder likt. En ny versjon med samme hjemmel er tillatt (GR-U1), og endringsordrens dato
 * eller nummer kan rettes (GR-U16, arbeidsvalg 2 i kartleggingen 16.10 på #569).
 */
describe('en ny påberopelsesversjon beholder hjemmelen (GR-U22)', () => {
  const versjon = (innhold: Data) => ({
    ...PAABEROPELSE,
    innhold,
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
    ['endringsordre til irregulær endring', endringsordre, PAABEROPELSE.innhold, 'ANNEN_HJEMMEL'],
    [
      'irregulær endring til lovendring, der § 32.2 gjelder i begge',
      null,
      { hovedkategori: 'endring', underkategori: 'lovendring_gjenstand', ...MOTTATT },
      'ANNEN_HJEMMEL',
    ],
    ['samme hjemmel i irregulær endring', null, PAABEROPELSE.innhold, null],
    ['samme hjemmel i svikt', svikt, svikt, null],
    // MM-U52 punkt 14: endringsordren står.
    [
      'en annen endringsordre med uendret underkategori',
      endringsordre,
      { ...endringsordre, endringsordre: 'EO-2' },
      'ANNEN_ENDRINGSORDRE',
    ],
    ['samme endringsordre', endringsordre, endringsordre, null],
  ] as [string, Data | null, Data, string | null][])('%s', (_n, foerste, neste, regel) => {
    const s = sak();
    s.send('TE', foerste ? versjon(foerste) : PAABEROPELSE);
    expect(s.avvist('TE', versjon(neste))).toBe(regel);
  });

  it('meldingen ved en annen endringsordre sier hvilken endringsordre som står (MM-U52 punkt 14)', () => {
    const s = sak();
    s.send('TE', versjon(endringsordre));
    expect(s.avvisning('TE', versjon({ ...endringsordre, endringsordre: 'EO-2' }))).toEqual({
      regel: 'ANNEN_ENDRINGSORDRE',
      melding:
        'Grunnlaget er sendt, og en ny versjon kan ikke endre endringsordren «EO-1». En annen endringsordre påberopes i en ny sak (MM-U52 punkt 14).',
    });
  });

  it('det første påberopelsen kan ha enhver kategori', () => {
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
 * MM-U34 punkt 7 opphever sperrene i GR-U17 og GR-U20: etter et frafall etter § 32.3 c fra
 * appen godtas et avslag, i en revisjon og i svaret på en ny påberopelsesversjon. Løsningen
 * avgjør ikke om byggherren er bundet av frafallet (MM-U12 (opphevet av MM-U50)). Revisjonen fra frafall til
 * frafall er arbeidsvalget 16.10 i #510.
 */
describe('et frafall fra appen kan følges av et avslag (MM-U34 punkt 7, GR-U17, GR-U20, #510)', () => {
  type Sak = ReturnType<typeof sak>;
  const frafall = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
  const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const endringsordre = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
  /** Forholdet godkjent subsidiært, med påberopelse av at varselet kom for sent. */
  const paaberopelse = { resultat: 'godkjent', grunnlag_varslet_i_tide: false };

  const utregnet = (s: Sak, v: Data) => {
    const u = s.u();
    const krav = u.spor.forhold.gjeldendeKrav!;
    return svar(
      'forhold',
      krav.id,
      v,
      regnUtSvar('forhold', v, { krav, paaberopelse: krav }, KJERNE.regler)
    );
  };
  const nyttSvar = (s: Sak, v: Data) => ({ type: 'brev', svar: [utregnet(s, v)] });
  const revisjon = (s: Sak, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
    svar: utregnet(s, v),
  });
  const medFrafall = () => {
    const s = sakMedKrav();
    s.send('BH', nyttSvar(s, frafall));
    expect(s.u().frafalt, 'forutsetning: pålegget er frafalt').toBe(true);
    return s;
  };
  const versjon = (s: Sak, innhold: Data) =>
    s.send('TE', { ...PAABEROPELSE, innhold: { ...PAABEROPELSE.innhold, ...innhold } });
  /** Et registrert brev fra byggherren med et svar på gjeldende påberopelsesversjon. */
  const registrertSvar = (s: Sak, resultat: string, sendt: boolean, iTide = true) => {
    const u = s.u();
    const id = randomUUID();
    s.rad('BH', {
      svar: [
        {
          id,
          spor: 'forhold',
          gjelder: u.spor.forhold.gjeldendeKrav!.id,
          ...(u.spor.forhold.gjeldendeSvar ? { erstatter: u.spor.forhold.gjeldendeSvar.id } : {}),
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: u.spor.forhold.gjeldendeKrav!.id,
              hjemmel: '32.2',
              i_tide: iTide,
            },
            { id: randomUUID(), art: 'forhold', resultat },
          ],
        },
      ],
      ...(sendt
        ? {
            opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-05' }],
            korrespondansetype: 'brev',
          }
        : {}),
    });
    return id;
  };

  describe('revisjonen av frafallet (GR-U17)', () => {
    it('en revisjon fra frafall til avslag godtas, pålegget står ikke lenger som frafalt, og forholdet er ikke avklart, fordi det siste svaret er avslaget (MM-U34 punkt 7, GR-U17, GR-U23)', () => {
      const s = medFrafall();
      expect(s.u().forholdAvklart, 'kontrollsak: avklart ved frafallet (GR-U7)').toBe(true);
      const avslaget = revisjon(s, avslag);
      expect(s.avvist('BH', avslaget)).toBeNull();
      s.send('BH', avslaget);
      expect(s.u().forstaatt).toBe(true);
      expect(s.u().frafalt).toBe(false);
      expect(s.u().forholdAvklart).toBe(false);
    });

    it('en revisjon fra frafall til endringsordre godtas', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, endringsordre))).toBeNull();
    });

    it('en revisjon fra frafall til frafall godtas (arbeidsvalget 16.10, #510)', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, frafall))).toBeNull();
    });

    it('en revisjon fra frafall til påberopelse etter § 32.2 godtas, selv om frafallet sa «i tide» (MM-U34 punkt 6 og 7, HF-U4, #235)', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, paaberopelse))).toBeNull();
    });
  });

  describe('en ny påberopelsesversjon etter frafallet (GR-U20, GR-U22)', () => {
    it('med samme hjemmel kan byggherren svare med frafall, endringsordre, avslag eller påberopelse etter § 32.2 (MM-U34 punkt 6 og 7, GR-U20)', () => {
      const s = medFrafall();
      versjon(s, {});
      expect(s.u().spor.forhold.krav.length, 'forutsetning: ny grunnlagsversjon').toBe(2);
      expect(s.avvist('BH', nyttSvar(s, frafall))).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, endringsordre))).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, avslag))).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, paaberopelse))).toBeNull();
    });

    it('et registrert frafall binder ikke (OV-U4)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      expect(s.u().frafalt, 'det registrerte frafallet er dokumentasjon').toBe(false);
      expect(s.u().spor.forhold.gjeldendeSvar).toBeNull();
      versjon(s, {});
      expect(s.avvist('BH', nyttSvar(s, avslag))).toBeNull();
    });
  });

  /**
   * GR-U23: mens en ny påberopelsesversjon etter et frafall venter på svar, er forholdet
   * avklart ved frafallet, så en enighet i vederlag eller frist forblir virksom. Etter
   * OV-U3 oppstår tilfellet bare når et annet sendt krav står åpent, her fristkravet.
   */
  describe('mens en ny påberopelsesversjon venter etter frafallet (GR-U23)', () => {
    const vederlagFullt = [
      {
        hovedkrav_vurdering: 'godkjent',
        hovedkrav_godkjent_beloep: 125000,
        aksepterer_metode: true,
      },
      { resultat: 'godkjent', godkjent_beloep: 125000 },
    ] as const;
    /** Frafall på forholdet og vederlaget godkjent fullt, så partene er enige (GR-U10). */
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

    it('versjon 2 venter på svar, forholdet er avklart ved frafallet, og enigheten i vederlaget forblir virksom', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, {});
      const u = s.u();
      expect(u.spor.forhold.krav.length, 'forutsetning: ny grunnlagsversjon').toBe(2);
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
      expect(venterPaaSvar(u, 'forhold')).toBe(true);
      expect(u.forholdAvklart).toBe(true);
      expect(u.frafalt).toBe(true);
      expect(enighetensVirkning(u, 'vederlag')).toBe('virksom');
      expect(kraveneErAvgjort(u), 'fristkravet står åpent (OV-U3)').toBe(false);
      expect(kanInngaaIEo(u), 'et frafall hindrer ikke en endringsordre (GR-U28)').toBe(true);
    });

    it('byggherrens svar på versjon 2 avløser frafallet som gjeldende svar', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, {});
      s.send('BH', nyttSvar(s, endringsordre));
      const u = s.u();
      expect(u.frafalt).toBe(false);
      expect(u.forholdAvklart).toBe(true);
      expect(u.endringsordre).toBe('ja');
      expect(enighetensVirkning(u, 'vederlag')).toBe('virksom');
    });

    it('kontrollsak: et registrert frafall avklarer ikke forholdet, så enigheten i vederlaget er betinget før og etter versjon 2 (OV-U4, GR-U1)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      s.send('BH', {
        type: 'brev',
        svar: [svar('vederlag', s.krav('vederlag'), vederlagFullt[0], vederlagFullt[1])],
      });
      expect(enighetensVirkning(s.u(), 'vederlag')).toBe('betinget');
      versjon(s, {});
      const u = s.u();
      expect(u.forholdAvklart).toBe(false);
      expect(u.frafalt).toBe(false);
      expect(enighetensVirkning(u, 'vederlag')).toBe('betinget');
    });

    it('etter frafall, revisjon til avslag og en ny påberopelsesversjon er forholdet ikke avklart ved frafallet, fordi det siste svaret er avslaget (MM-U34 punkt 7, GR-U23)', () => {
      const s = medFrafall();
      s.send('BH', revisjon(s, avslag));
      versjon(s, {});
      const u = s.u();
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 venter på svar').toBeNull();
      expect(u.forholdAvklart).toBe(false);
      expect(u.frafalt).toBe(false);
      // Kontrollsak: uten revisjonen er forholdet avklart ved frafallet (GR-U23).
      const k = medFrafall();
      versjon(k, {});
      expect(k.u().forholdAvklart, 'kontrollsak').toBe(true);
      expect(k.u().frafalt, 'kontrollsak').toBe(true);
    });

    it('etter frafall fra appen, en registrert endringsordre som godkjenner versjon 2 og en ny versjon 3 er forholdet avklart ved frafallet, fordi frafallet ikke faller bort ved en ny versjon og et registrert svar ikke tar det bort (GR-U20, GR-U23, OV-U4, OV-U6, #1388)', () => {
      const s = medFrafall();
      versjon(s, {});
      const v2 = s.u().spor.forhold.gjeldendeKrav!.id;
      const eo = randomUUID();
      s.rad('BH', {
        svar: [
          {
            id: eo,
            spor: 'forhold',
            gjelder: v2,
            standpunkter: [
              // VS-U43 punkt 6: rettidigheten gjelder det første grunnlagskravet.
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: s.u().spor.forhold.krav[0]!.id,
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
            ],
          },
        ],
        opplysninger: [
          { id: randomUUID(), hva: 'sendt', dato: '2026-10-06' },
          { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
        ],
        korrespondansetype: 'brev',
      });
      const etterEo = s.u();
      expect(etterEo.forstaatt, JSON.stringify(etterEo.begrensninger)).toBe(true);
      expect(
        etterEo.spor.forhold.gjeldendeSvar?.id,
        'forutsetning: den registrerte endringsordren er svaret på versjon 2 (OV-U6)'
      ).toBe(eo);
      expect(
        etterEo.utenVirkning.map((x) => x.element),
        'forutsetning: med virkning'
      ).toEqual([]);
      versjon(s, {});
      const u = s.u();
      expect(u.spor.forhold.krav.length, 'forutsetning: tre versjoner').toBe(3);
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 3 venter på svar').toBeNull();
      expect(venterPaaSvar(u, 'forhold')).toBe(true);
      expect(u.forholdAvklart).toBe(true);
      expect(u.frafalt).toBe(true);
    });

    it('blir fristkravet avgjort mens versjon 2 venter, er kravene avgjort, og svaret på versjon 2 og trekket av forholdet godtas (MM-U34 punkt 12, OV-U3, KA-U11)', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, {});
      s.send('BH', {
        type: 'brev',
        svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
      });
      const u = s.u();
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 venter på svar').toBeNull();
      expect(kraveneErAvgjort(u)).toBe(true);
      expect(kanInngaaIEo(u), 'et frafall hindrer ikke en endringsordre (GR-U28)').toBe(true);
      expect(s.avvist('BH', nyttSvar(s, endringsordre))).toBeNull();
      expect(s.avvist('TE', { type: 'trekk', spor: 'forhold' })).toBeNull();
      expect(
        visning(u, GJELDENDE_REGLER).spor.forhold.etiketter,
        'svaret godtas, så versjon 2 venter på svar (MM-U24)'
      ).toContain('venter_paa_svar');
      expect(visning(u, GJELDENDE_REGLER).status?.kode).toBe('alle_krav_avgjort');
    });
  });

  describe('et avslag etter frafallet som ikke kommer gjennom kommandoene (MM-U43 punkt 9, OV-U4)', () => {
    it('et registrert avslag av en ny påberopelsesversjon får ingen virkning, og saken er forstått', () => {
      const s = medFrafall();
      versjon(s, {});
      const id = registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(u.forstaatt).toBe(true);
      expect(
        u.spor.forhold.svar.map((x) => x.id),
        'svaret er dokumentasjon (OV-U4)'
      ).not.toContain(id);
      expect(u.spor.forhold.gjeldendeSvar).toBeNull();
    });

    it('en registrert revisjon fra frafall til avslag får ingen virkning, og frafallet står', () => {
      const s = medFrafall();
      const id = registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(
        u.spor.forhold.svar.map((x) => x.id),
        'svaret er dokumentasjon (OV-U4)'
      ).not.toContain(id);
      expect(u.frafalt).toBe(true);
    });

    it.each([
      ['et avslag', 'avslaatt', true],
      ['en påberopelse etter § 32.2', 'godkjent', false],
    ] as [string, string, boolean][])(
      '%s i et brev som ikke er registrert og ikke er sendt fra appen, er forstått og avløser frafallet (MM-U34 punkt 6 og 7, GR-U17, MM-U43 punkt 6)',
      (_n, resultat, iTide) => {
        const s = medFrafall();
        const id = registrertSvar(s, resultat, false, iTide);
        const u = s.u();
        expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
        expect(u.spor.forhold.gjeldendeSvar?.id).toBe(id);
        expect(u.frafalt).toBe(false);
      }
    );

    it.each([
      ['en registrert revisjon fra frafall', false],
      ['et registrert svar på en ny grunnlagsversjon', true],
    ] as [string, boolean][])(
      '%s til påberopelse etter § 32.2 får ingen virkning, og frafallet står (GR-U17, GR-U20)',
      (_n, nyVersjon) => {
        const s = medFrafall();
        if (nyVersjon) versjon(s, {});
        const id = registrertSvar(s, 'godkjent', true, false);
        const u = s.u();
        expect(u.forstaatt).toBe(true);
        expect(
          u.spor.forhold.svar.map((x) => x.id),
          'svaret er dokumentasjon (OV-U4)'
        ).not.toContain(id);
        expect(u.spor.forhold.gjeldendeSvar?.id).not.toBe(id);
        if (!nyVersjon) expect(u.frafalt).toBe(true);
      }
    );

    it('et registrert avslag etter et registrert frafall er også dokumentasjon, og forholdet venter på svar (OV-U4)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(u.forstaatt).toBe(true);
      expect(u.frafalt).toBe(false);
      expect(u.spor.forhold.gjeldendeSvar).toBeNull();
    });
  });

  /**
   * Arbeidsvalg 3 i #770 (#562). Radene står utenfor kommandoene, som en rad som verken er
   * registrert eller sendt fra appen (MM-U43 punkt 6). MM-U34 punkt 7 opphever sperren i GR-U17, så
   * avslaget gjør ikke lenger saken uforstått.
   */
  it('en revisjon av frafallet på versjon 1 til avslag, etter en versjon 2 uten frafall og utenfor kommandoene, er forstått (MM-U34 punkt 7, GR-U17, arbeidsvalg 3 i #770)', () => {
    const s = medFrafall();
    const foerste = s.u().spor.forhold.gjeldendeKrav!.id;
    const frafallet = s.u().spor.forhold.gjeldendeSvar!.id;
    // GR-U22: kommandoene kan ikke endre underkategorien, så versjon 2 står utenfor dem.
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
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
          spor: 'forhold',
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
            { id: randomUUID(), art: 'forhold', resultat: 'avslaatt' },
          ],
        },
      ],
    });
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
  });

  describe('hver grunn i kontrollen mot journalen før brevet (MM-U43 punkt 6, #669)', () => {
    const grunner = (s: Sak) => s.u().begrensninger.map((b) => b.grunn);
    const medEnighet = () => {
      const s = sakMedKrav();
      s.send('BH', nyttSvar(s, endringsordre));
      expect(s.u().spor.forhold.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
      return s;
    };
    const raaAksept = (s: Sak, gjelder: string) =>
      s.rad('TE', {
        utsagn: [{ id: randomUUID(), art: 'aksept', gjelder, regelversjon: KJERNE.regler.versjon }],
      });

    it('en revisjon av en godkjenning av forholdet med registrert enighet gir ingen grunn, og saken er forstått (MM-U34 punkt 11, EO-U12)', () => {
      const s = medEnighet();
      const revisjon = registrertSvar(s, 'godkjent', false);
      expect(grunner(s)).toEqual([]);
      expect(s.u().forstaatt).toBe(true);
      expect(s.u().spor.forhold.gjeldendeSvar?.id).toBe(revisjon);
    });

    it('en aksept av et svar med registrert enighet (GR-U8)', () => {
      const s = medEnighet();
      raaAksept(s, s.u().spor.forhold.gjeldendeSvar!.id);
      // Leseren avviser også aksepten av et sammenfall (GR-U8).
      expect(grunner(s)).toContain('en aksept av et svar med registrert enighet (GR-U8)');
    });

    it('en aksept av et svar i et spor etter at kravet er trukket (MM-U43, GR-U5)', () => {
      const s = sakMedKrav();
      s.send('BH', {
        type: 'brev',
        svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
      });
      const svaret = s.u().spor.vederlag.gjeldendeSvar!.id;
      s.send('TE', { type: 'trekk', spor: 'vederlag' });
      raaAksept(s, svaret);
      expect(grunner(s)).toEqual([
        'en aksept av et svar i et spor etter at kravet er trukket (MM-U43, GR-U5)',
      ]);
    });

    /** Byggherrens registrerte endringsordre (OV-U6) etter trekket av forholdet, uten virkning. */
    const endringsordreUtenVirkning = () => {
      const s = sakMedKrav();
      const krav = s.krav('forhold');
      s.send('TE', { type: 'trekk', spor: 'forhold' });
      const id = randomUUID();
      s.rad('BH', {
        svar: [
          {
            id,
            spor: 'forhold',
            gjelder: krav,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: krav,
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
            ],
          },
        ],
        opplysninger: [
          { id: randomUUID(), hva: 'sendt', dato: '2026-10-06' },
          { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
        ],
        korrespondansetype: 'brev',
      });
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(
        u.utenVirkning.map((x) => x.element),
        'forutsetning: endringsordren har ingen virkning'
      ).toEqual([id]);
      return { s, id };
    };

    it('OV-U19, MM-U19 (opphevet av MM-U43): en endringsordre uten virkning er vurdert av appen og gir ikke merknaden om brev utenfor appen; et brev registrert som dokumentasjon gir den', () => {
      const { s } = endringsordreUtenVirkning();
      const foer = visning(s.u(), GJELDENDE_REGLER);
      expect(foer.merknader).toContain('registrert_brev_uten_virkning');
      expect(foer.merknader).not.toContain('brev_utenfor_appen');
      expect(harIkkeVurdertBrev(s.u()), 'statusteksten og sakslisten').toBe(false);
      s.rad('BH', {
        beskrivelse: 'Brev om fremdriften',
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-06' }],
        korrespondansetype: 'brev',
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

    it('en revisjon av et svar uten virkning (MM-U43 punkt 6)', () => {
      const { s, id } = endringsordreUtenVirkning();
      const krav = s.u().spor.forhold.krav[0].id;
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: krav,
            erstatter: id,
            standpunkter: [{ id: randomUUID(), art: 'forhold', resultat: 'avslaatt' }],
          },
        ],
      });
      // Leseren avviser også kjeden, fordi svaret uten virkning ikke er lest inn i sporet.
      expect(grunner(s)).toContain('svaret viser til et element uten virkning');
    });

    it('en innsigelse mot egen endringsordre uten virkning viser ikke til noe den kan gjelde (VS-U1, MM-U43 punkt 6)', () => {
      const { s, id } = endringsordreUtenVirkning();
      const innsigelse = randomUUID();
      s.rad('BH', { utsagn: [{ id: innsigelse, art: 'innsigelse', gjelder: id }] });
      expect(s.u().forstaatt).toBe(false);
      expect(grunner(s)).toContain('innsigelse viser ikke til noe den kan gjelde før den');
    });
  });
});

/**
 * MM-U34 punkt 4 opphever vernet i HF-U5, og punkt 3 bindingen i HF-U21: byggherren kan
 * sende en revisjon som senker det byggherren har godkjent. Løsningen avgjør ikke om
 * endringen er rettslig virksom (MM-U12 (opphevet av MM-U50)). Aksepten av beregningsmåten kan også tas tilbake
 * (MM-U34 punkt 15).
 */
describe('en revisjon kan senke det byggherren har godkjent (MM-U34 punkt 4, HF-U5, HF-U21, #502)', () => {
  type Sak = ReturnType<typeof sak>;
  type Sporet = 'forhold' | 'vederlag' | 'frist';

  /** Svaret med serverens utregning, så bare revisjonen kan gi en avvisning. */
  const utregnet = (s: Sak, spor: Sporet, v: Data) => {
    const u = s.u();
    const krav = gjeldendeKrav(u, spor);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(spor, v, { krav, paaberopelse: u.spor.forhold.gjeldendeKrav }, KJERNE.regler)
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
  /** Revisjonen godtas, og saken er forstått etter at den er sendt. */
  const godtas = (s: Sak, kommando: Data) => {
    expect(s.avvist('BH', kommando)).toBeNull();
    s.send('BH', kommando);
    expect(s.u().forstaatt).toBe(true);
  };

  /** 100 000 av 125 000 kr, så svaret ikke gir enighet ved sammenfall (GR-U10). */
  const delvis = {
    hovedkrav_vurdering: 'delvis',
    hovedkrav_godkjent_beloep: 100000,
    aksepterer_metode: true,
  };
  const beloep = (n: number) => ({ ...delvis, hovedkrav_godkjent_beloep: n });
  /** 10 av 20 dager. */
  const dager = {
    frist_varsel_ok: true,
    spesifisert_krav_ok: true,
    vilkar_oppfylt: true,
    dager: 10,
  };

  describe('vederlaget', () => {
    it('et lavere godkjent beløp godtas, også når aksepten av fast sum tas tilbake i samme revisjon (MM-U34 punkt 4 og 15, HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      godtas(s, revisjon(s, 'vederlag', beloep(80000)));
      expect(s.u().spor.vederlag.gjeldendeSvar!.utregning).toMatchObject({
        godkjent_beloep: 80000,
      });
      const k = sakMedKrav();
      brev(k, 'vederlag', delvis);
      godtas(
        k,
        revisjon(k, 'vederlag', {
          ...beloep(90000),
          aksepterer_metode: false,
          oensket_metode: 'enhetspriser',
        })
      );
    });

    it('et beløp som står likt, godtas, også når det er det eneste i revisjonen', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      expect(s.avvist('BH', revisjon(s, 'vederlag', delvis))).toBeNull();
    });

    it('en revisjon som tar tilbake aksepten av fast sum, godtas, og en aksept kan gis (MM-U34 punkt 15)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      const uten = { ...delvis, aksepterer_metode: false, oensket_metode: 'enhetspriser' };
      expect(s.avvist('BH', revisjon(s, 'vederlag', uten))).toBeNull();

      const kontroll = sakMedKrav();
      brev(kontroll, 'vederlag', uten);
      expect(
        kontroll.avvist('BH', revisjon(kontroll, 'vederlag', delvis)),
        'kontrollsak'
      ).toBeNull();
    });

    it('byggherrens ønskede metode kan endres når tilbudet ikke er akseptert (MM-U12, MM-U50)', () => {
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

    it('subsidiært 100 000 kr kan bli prinsipalt 80 000 kr når preklusjonen gis opp (MM-U34 punkt 4, HF-U5, § 34.1.2)', () => {
      const s = sak();
      s.send('TE', {
        ...PAABEROPELSE,
        innhold: {
          hovedkategori: 'svikt',
          underkategori: 'grunnforhold',
          ...KLAR_OVER,
        },
      });
      s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: tilbud(125000),
      });
      brev(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: false });
      godtas(s, revisjon(s, 'vederlag', { ...beloep(80000), hovedkrav_varslet_i_tide: true }));
    });
  });

  describe('fristforlengelsen', () => {
    it.each([
      ['færre godkjente dager', dager, { ...dager, dager: 8 }],
      ['at fremdriften ikke er hindret (§ 33.1)', dager, { ...dager, vilkar_oppfylt: false }],
      [
        'færre dager byggherren måtte forstå etter § 33.6.1, når begge svar sier «for sent» (VS-U4)',
        { ...dager, spesifisert_krav_ok: false, dager_maatte_forstaa: 5 },
        { ...dager, spesifisert_krav_ok: false, dager_maatte_forstaa: 3 },
      ],
    ] as [string, Data, Data][])(
      'en revisjon med %s godtas (MM-U34 punkt 4, HF-U5)',
      (_n, foer, etter) => {
        const s = sakMedKrav();
        brev(s, 'frist', foer);
        godtas(s, revisjon(s, 'frist', etter));
      }
    );
  });

  describe('forholdet', () => {
    const forSent = { grunnlag_varslet_i_tide: false };

    it.each([
      ['avslått', { ...forSent, resultat: 'avslaatt' }],
      ['frafalt', { grunnlag_varslet_i_tide: true, resultat: 'paalegg_frafalt' }],
    ] as [string, Data][])(
      'et forhold godkjent subsidiært kan revideres til %s (MM-U34 punkt 4 og 7, HF-U5)',
      (_n, v) => {
        const s = sakMedKrav();
        brev(s, 'forhold', { ...forSent, resultat: 'godkjent' });
        godtas(s, revisjon(s, 'forhold', v));
      }
    );

    it('et avslag kan revideres til godkjenning (HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'forhold', { ...forSent, resultat: 'avslaatt' });
      expect(
        s.avvist('BH', revisjon(s, 'forhold', { ...forSent, resultat: 'godkjent' }))
      ).toBeNull();
    });

    it('et registrert brev er dokumentasjon, og byggherren kan avslå fra appen (OV-U4)', () => {
      const s = sakMedKrav();
      const u = s.u();
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: u.spor.forhold.gjeldendeKrav!.id,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: u.spor.forhold.gjeldendeKrav!.id,
                hjemmel: '32.2',
                i_tide: false,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
            ],
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-05' }],
        korrespondansetype: 'brev',
      });
      expect(
        s.u().spor.forhold.gjeldendeSvar,
        'det registrerte svaret er dokumentasjon (OV-U4)'
      ).toBeNull();
      expect(
        s.avvist('BH', nyttSvar(s, 'forhold', { ...forSent, resultat: 'avslaatt' }))
      ).toBeNull();
    });
  });

  describe('etter en ny versjon', () => {
    it('etter en ny påberopelsesversjon med samme hjemmel revideres svaret på vederlaget, og et lavere beløp godtas (MM-U34 punkt 3, HF-U21)', () => {
      const s = sakMedKrav();
      brev(s, 'forhold', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true });
      brev(s, 'vederlag', delvis);
      s.send('TE', {
        ...PAABEROPELSE,
        innhold: { ...PAABEROPELSE.innhold },
      });
      expect(
        s.avvist('BH', nyttSvar(s, 'vederlag', beloep(80000))),
        'vederlaget er besvart, så byggherren må revidere'
      ).toBe('ALLEREDE_SVART');
      godtas(s, revisjon(s, 'vederlag', beloep(80000)));
    });

    it('etter en ny kravversjon er svaret nytt, og byggherren er fri (HF-U5, HF-U8)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: tilbud(120000),
      });
      expect(s.avvist('BH', nyttSvar(s, 'vederlag', beloep(50000)))).toBeNull();
    });
  });

  /**
   * MM-U27: en rad som ikke er et registrert brev, og som byggherren ikke kunne sendt fra
   * appen, gjør saken ikke forstått. MM-U34 punkt 4 og 6 opphever sperrene i HF-U5 og HF-U4,
   * så en revisjon som senker beløpet eller påberoper «for sent» etter «i tide», er forstått.
   * Raden er en kopi av svaret fra appen med ett felt endret.
   */
  describe('en rad utenfor kommandoene som senker eller påberoper «for sent» (MM-U27)', () => {
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
    /** Beløpet i posten og i utregningen, som har hvert sitt hjem (OV-U31). */
    const beloepet = (kr: number) => (v: Data) => {
      (v.utregning as Data).godkjent_beloep = kr;
      (v.standpunkter as Data[]).find((p) => p.art === 'beloep')!.beloep = kr;
    };

    it('en revisjon som senker det godkjente beløpet, er forstått og gjeldende svar (MM-U34 punkt 4, HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      const revisjonen = kopi(s, beloepet(80000));
      s.rad('BH', { svar: [revisjonen] });
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(u.spor.vederlag.gjeldendeSvar?.id).toBe(revisjonen.id);
    });

    it.each([
      ['varselet etter § 33.4', 'rettidighet'],
      ['spesifiseringen etter § 33.6.1', 'spesifisering'],
    ])(
      'en revisjon som sier at %s kom for sent, etter at byggherren sa i tide, er forstått (MM-U34 punkt 6, HF-U4)',
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
        const u = s.u();
        expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      }
    );
  });
});

/**
 * MM-U24 og MM-U30 med lukkingen i SK-01 og OV-U3 (#1050, #1067): et krav venter ikke på svar, og
 * et svar står ikke som ikke godtatt, når et svar eller en aksept i sporet ville blitt
 * avvist. Frafallet etter arbeidsvalget 20.10 i #1050: TE kan ikke godta et frafall
 * (GR-U9), og en ny påberopelsesversjon etter det venter på svar (GR-U23). I vederlag og
 * frist venter et ubesvart krav på svar, og et svar TE ikke har godtatt, står som det.
 */
describe('det som foreligger i et lukket spor og etter et frafall (#1050, #1067)', () => {
  type Sak = ReturnType<typeof sak>;
  const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const frafall = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
  const utregnet = (s: Sak, spor: 'forhold' | 'vederlag', v: Data) => {
    const u = s.u();
    const krav = u.spor[spor].gjeldendeKrav!;
    const paaberopelse = u.spor.forhold.gjeldendeKrav;
    return svar(spor, krav.id, v, regnUtSvar(spor, v, { krav, paaberopelse }, KJERNE.regler));
  };
  const godtar = (s: Sak, spor: 'forhold' | 'vederlag') =>
    s.send('TE', {
      type: 'aksept',
      spor,
      svar: s.u().spor[spor].gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
  const etiketter = (s: Sak, spor: 'forhold' | 'vederlag' | 'frist') =>
    visning(s.u(), GJELDENDE_REGLER).spor[spor].etiketter;

  it('SK-01: når TE godtar avslaget av forholdet, venter ubesvarte krav i vederlag og frist ikke på svar', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'forhold', avslag)] });
    for (const spor of KRAVSPOR) expect(venterPaaSvar(s.u(), spor), `kontroll: ${spor}`).toBe(true);
    godtar(s, 'forhold');
    expect(s.u().forholdAvvist, 'forutsetning: avslaget er godtatt').toBe(true);
    for (const spor of KRAVSPOR) {
      expect(venterPaaSvar(s.u(), spor), spor).toBe(false);
      expect(etiketter(s, spor), spor).not.toContain('venter_paa_svar');
    }
  });

  it('SK-01: når TE godtar avslaget av forholdet i forløp A, står det subsidiære svaret i vederlaget ikke som ikke godtatt', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [utregnet(s, 'forhold', avslag), utregnet(s, 'vederlag', VEDERLAG_DELVIS[0])],
    });
    const st = s.u().spor.vederlag.gjeldendeSvar!.standpunkter.find((p) => p.art === 'beloep')!;
    expect(standpunktetErSubsidiaert(s.u(), 'vederlag', st.id), 'MM-U9, OV-U32').toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'vederlag'), 'kontroll: før aksepten').toBe(true);
    godtar(s, 'forhold');
    expect(svarIkkeGodtatt(s.u(), 'vederlag')).toBe(false);
  });

  it('GR-U9: et frafall står ikke som et svar TE ikke har godtatt, mens ubesvarte krav i vederlag og frist venter på svar (arbeidsvalget 20.10)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'forhold', frafall)] });
    expect(s.u().frafalt, 'forutsetning: pålegget er frafalt').toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'forhold')).toBe(false);
    for (const spor of KRAVSPOR) expect(venterPaaSvar(s.u(), spor), spor).toBe(true);
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'vederlag', VEDERLAG_DELVIS[0])] });
    expect(svarIkkeGodtatt(s.u(), 'vederlag'), 'et svar i vederlaget TE ikke har godtatt').toBe(
      true
    );
  });

  it('GR-U23: en ny påberopelsesversjon etter frafallet venter på svar', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'forhold', frafall)] });
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold },
    });
    expect(s.u().frafalt, 'forutsetning: frafallet står (GR-U23)').toBe(true);
    expect(venterPaaSvar(s.u(), 'forhold')).toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'forhold')).toBe(false);
    expect(etiketter(s, 'forhold')).toContain('venter_paa_svar');
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
    const kommando = { ...PAABEROPELSE, utdypning: 'Pelingen er forsinket 😀' };
    const avvisning = {
      regel: 'UGYLDIG_FORM',
      melding: '$.utdypning har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.',
    };
    expect(s.avvisning('TE', kommando)).toEqual(avvisning);
    expect(s.vis('TE', kommando)).toBeNull();
    expect(s.journal).toHaveLength(1);
    expect(s.avvist('TE', PAABEROPELSE), 'kontrollsak').toBeNull();
  });

  it('endringsordren i kravet og utdypningen i et svar kontrolleres også', () => {
    const s = sak();
    expect(
      s.avvisning('TE', {
        ...PAABEROPELSE,
        innhold: { hovedkategori: 'endring', underkategori: 'endringsordre', endringsordre: '☺' },
      })
    ).toEqual({
      regel: 'UGYLDIG_FORM',
      melding:
        '$.innhold.endringsordre har tegnet «☺» (U+263A), som PDF-en av brevet ikke kan vise.',
    });
    s.send('TE', PAABEROPELSE);
    const brev = (utdypning: string) => ({
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
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
    const med = (utdypning: string) => ({ ...PAABEROPELSE, utdypning });
    expect(s.avvisning('TE', med('fundament\u200bering'))?.melding).toBe(
      '$.utdypning har det usynlige tegnet U+200B, som PDF-en av brevet ikke kan vise.'
    );
    expect(s.avvisning('TE', med('\ufeffFundamentering'))?.melding).toBe(
      '$.utdypning har det usynlige tegnet U+FEFF, som PDF-en av brevet ikke kan vise.'
    );
    expect(s.avvist('TE', med('fundament\u00adering → peling\r\n\tny linje'))).toBeNull();
  });

  // #1138: meldingen sier hva som hindrer (AGENTS.md, «Skriv etter hva teksten gjør»).
  const iSakstittelen = {
    regel: 'UGYLDIG_FORM',
    melding: 'Sakstittelen har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.',
  };

  it('en sakstittel med et slikt tegn fra før stopper brevet i den låste teksten, og meldingen nevner sakstittelen', () => {
    const s = sak('Fundament 😀');
    expect(s.vis('TE', PAABEROPELSE)).toBeNull();
    expect(s.avvisning('TE', PAABEROPELSE)).toEqual(iSakstittelen);
  });

  it('ved sending nevner meldingen sakstittelen, ikke den låste teksten klienten sendte med (#1138)', () => {
    const s = sak('Fundament 😀');
    const vist = [
      `Totalentreprenøren krever endringsordre for «Fundament 😀» i sak KOE-17 som irregulær endring (NS 8407 punkt 32.1).`,
    ];
    expect(s.avvisning('TE', { ...PAABEROPELSE, brevtekst: vist })).toEqual(iSakstittelen);
  });

  it('en sakstittel med et slikt tegn stopper ikke et brev der sakstittelen ikke står i teksten (#801, #1138)', () => {
    const s = sak('Fundament 😀');
    const krav = randomUUID();
    s.rad('TE', {
      krav: [
        {
          id: krav,
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      korrespondansetype: 'brev',
    });
    const innsigelse = { type: 'innsigelse', gjelder: krav };
    expect(s.avvisning('BH', innsigelse)).toBeNull();
    expect(s.vis('BH', innsigelse)?.join(' '), 'forutsetning').not.toContain('Fundament');
  });

  it('et filnavn med et slikt tegn fra før stopper brevet, og meldingen nevner vedlegget (#1138)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const kontekst = {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      tidspunkt: () => new Date('2026-10-07T08:00:00Z'),
      nyId: randomUUID,
    };
    const lager = (filnavn: string) =>
      new Map([
        [VARSELBREVET, { vedlegg_id: VARSELBREVET, filnavn, innhold_sha256: '0'.repeat(64) }],
      ]);
    const kontroll = forhaandsvis(FRISTKRAV, kontekst, s.journal, KJERNE, lager('varsel.pdf'));
    expect(kontroll.godtatt, 'kontrollsak').toBe(true);
    const vist = kontroll.godtatt ? laastTekst(kontroll.hendelser[0])! : [];
    const melding =
      'Filnavnet til vedlegget «varsel 😀.pdf» har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.';
    for (const kommando of [FRISTKRAV, { ...FRISTKRAV, brevtekst: vist }]) {
      const u = vurder(kommando, kontekst, s.journal, KJERNE, lager('varsel 😀.pdf'));
      expect(u.godtatt ? null : u.avvisning).toEqual({ regel: 'UGYLDIG_FORM', melding });
    }
  });

  // #1229: TEs beskrivelse siteres i godkjenningen (GR-U14) og har ingen egen kontroll når
  // brevet skrives, så bare kontrollen av den låste teksten stopper den.
  it('en beskrivelse med et slikt tegn fra før stopper godkjenningen som siterer den (GR-U14, #1229)', () => {
    const s = sak();
    const krav = s.send('TE', PAABEROPELSE);
    const godkjenning = {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    };
    expect(s.vis('BH', godkjenning)?.[0], 'kontrollsak').toContain(`«${BESKRIVELSE}»`);
    const avsnitt = (krav.data as { brevtekst: { utdypning?: string }[] }).brevtekst;
    const medBeskrivelse = avsnitt.find((a) => a.utdypning === BESKRIVELSE);
    expect(medBeskrivelse, 'forutsetning').toBeDefined();
    medBeskrivelse!.utdypning = 'Byggherren har pålagt en annen fundamentering 😀';
    expect(s.vis('BH', godkjenning)).toBeNull();
    expect(s.avvisning('BH', godkjenning)).toEqual({
      regel: 'UGYLDIG_FORM',
      melding:
        'Avsnitt 1 i brevteksten har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.',
    });
  });
});

describe('det særskilte kravet etter § 34.1.3 annet ledd, TEs side (OV-U22–OV-U25, #1047)', () => {
  const sendVarsel = { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.3' };
  const registrer = (hjemmel: '34.1.2' | '34.1.3') => ({
    type: 'varsel',
    korrespondansetype: 'brev',
    spor: 'vederlag',
    hjemmel,
    sendt: '2026-09-28',
    dokumentasjon: [randomUUID()],
  });
  const vederlagskrav = (innhold: Data) => ({ type: 'krav', spor: 'vederlag', innhold });
  const post = { produktivitet: { beloep: 40000 } };
  const produktivitet =
    'økte utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid';
  const iTillegg = `TE krever i tillegg særskilt justering av vederlaget etter NS 8407 § 34.1.3 annet ledd for ${produktivitet} med ${KR('40 000')}`;

  it('brevet er varselet etter § 34.1.3 tredje ledd for kravet etter annet ledd, uten beløp og dato (OV-U5, OV-U25, LV-U29)', () => {
    const s = sakMedKrav();
    const varsel = s.send('TE', sendVarsel);
    const id = (varsel.data.utsagn as Data[])[0].id as string;
    // Ordlyden er LV-U29.
    expect(tekst(varsel)).toEqual([
      {
        gjelder: id,
        laast: `TE varsler etter NS 8407 § 34.1.3 tredje ledd at TE vil kreve særskilt justering av vederlaget etter annet ledd for ${produktivitet} som følge av forholdet ${I_SAKEN}.`,
      },
    ]);
    expect(varsel.data.utsagn).toEqual([{ id, art: 'varsel', hjemmel: '34.1.3' }]);
  });

  it('det særskilte varselet kan sendes etter vederlagskravet, varselet etter § 34.1.2 ikke (OV-U8 (opphevet av OV-U89), VS-U16)', () => {
    const s = sakMedKrav();
    expect(s.avvist('TE', { ...sendVarsel, hjemmel: '34.1.2' })).toBe('VEDERLAGSKRAV_SENDT');
    expect(s.avvist('TE', sendVarsel)).toBeNull();
    expect(handlinger(s.u(), 'TE')).toEqual(
      expect.arrayContaining(['sende_varsel:34.1.3', 'varsle:34.1.3'])
    );
  });

  it('saken har ett registrert varsel per hjemmel, og det særskilte flytter ikke varselet etter § 34.1.2 (SK-12)', () => {
    const s = sakMedKrav();
    const saerskilt = s.send('TE', registrer('34.1.3'));
    expect(s.avvist('TE', sendVarsel)).toBe('VARSEL_REGISTRERT');
    expect(s.avvist('TE', registrer('34.1.3'))).toBe('VARSEL_REGISTRERT');
    expect(s.avvist('TE', registrer('34.1.2'))).toBeNull();
    const hoved = s.send('TE', registrer('34.1.2'));
    const u = s.u();
    expect(u.spor.vederlag.varsler['34.1.3']?.dokument).toBe(saerskilt.event_id);
    expect(u.spor.vederlag.varsler['34.1.2']?.dokument).toBe(hoved.event_id);
  });

  it('et registrert brev med bare det særskilte varselet er et brev appen vurderer (#1167, OV-U19)', () => {
    const s = sakMedKrav();
    s.send('TE', registrer('34.1.3'));
    expect(s.u().ikkeVurderteBrev).toEqual([]);
  });

  it('vederlagskravet kan ha bare posten, uten hovedbeløp, men ikke ingen av dem (OV-U23)', () => {
    const s = sakMedKrav();
    expect(s.avvist('TE', vederlagskrav({}))).toBe('UGYLDIG_FORM');
    expect(
      s.avvist(
        'TE',
        vederlagskrav(tilbud(undefined, { saerskilt: { produktivitet: { beloep: 0 } } }))
      )
    ).toBe('UGYLDIG_FORM');
    // Kravet har bare posten når P1 fra brev 2 er trukket (KA-U56).
    expect(s.avvist('TE', vederlagskrav(tilbud(undefined, { saerskilt: post })))).toBe(
      'KRAVPOSTENE'
    );
    const rad = s.send(
      'TE',
      vederlagskrav(tilbud(undefined, { saerskilt: post, trekker: [p1I(s)] }))
    );
    // Ordlyden er LV-U30, og tilbudssetningen nevner posten (OV-U95 punkt 3, BF-14 U-6).
    expect(
      tekst(rad)
        .map((a) => a.laast)
        .join(' ')
    ).toContain(
      `TE krever særskilt justering av vederlaget etter NS 8407 § 34.1.3 annet ledd for ${produktivitet} med ${KR('40 000')} Kravet for den særskilte vederlagsjusteringen er et tilbud etter NS 8407 punkt 34.2.1.`
    );
  });

  it('posten står etter hovedbeløpet i kravteksten, og trekket viser begge beløpene (OV-U23, KA-U22)', () => {
    const s = sakMedKrav();
    const krav = s.send('TE', vederlagskrav(tilbud(150000, { saerskilt: post })));
    const laast = tekst(krav)
      .map((a) => a.laast)
      .join(' ');
    // Ordlyden er LV-U30.
    expect(laast).toContain(
      `P1 Ny fundamentering: TE krever ${KR('150 000')} ${iTillegg} Kravet for P1 og den særskilte vederlagsjusteringen er et tilbud etter NS 8407 punkt 34.2.1.`
    );
    const trekk = s.send('TE', { type: 'trekk', spor: 'vederlag' });
    expect(tekst(trekk)[0].laast).toContain(
      `(${KR('150 000')} i P1 og ${KR('40 000')} etter NS 8407 § 34.1.3 annet ledd)`
    );
  });

  it('uten registrert varsel er det første kjente varselet den første kravversjonen med posten (OV-U24)', () => {
    const s = sakMedKrav();
    const uten = s.krav('vederlag');
    s.send('TE', vederlagskrav(tilbud(150000, { saerskilt: post })));
    const medPost = s.krav('vederlag');
    s.send('TE', vederlagskrav(tilbud(160000, { saerskilt: post })));
    expect(medPost).not.toBe(uten);
    expect(varseletForNyttSvar(s.u(), '34.1.3')).toBe(medPost);
    // Etter § 34.1.2 er det fortsatt det første vederlagskravet (OV-U5).
    expect(varseletForNyttSvar(s.u(), '34.1.2')).toBe(uten);
    // MM-U1: det utledede varselet låses ikke; et registrert varsel går foran (OV-U24).
    const registrert = s.send('TE', registrer('34.1.3'));
    expect(varseletForNyttSvar(s.u(), '34.1.3')).toBe((registrert.data.utsagn as Data[])[0].id);
  });

  it('uten krav med posten og uten varsel finnes det ikke noe varsel etter § 34.1.3 (OV-U24)', () => {
    expect(() => varseletForNyttSvar(sakMedKrav().u(), '34.1.3')).toThrow('§ 34.1.3');
  });
});

/**
 * Byggherrens svar på det særskilte kravet etter § 34.1.3 annet ledd (#1047 B2b). Kravet i
 * brev 5 er 150 000 kr for justeringen ellers og 40 000 kr for posten. Forventningene er
 * vedtakene som står ved hvert tilfelle.
 */
describe('det særskilte kravet etter § 34.1.3 annet ledd, byggherrens side (OV-U26–OV-U33, VS-U5, #1047)', () => {
  const post = { produktivitet: { beloep: 40000 } };
  const saerskiltPost = 'særskilt justering etter NS 8407 § 34.1.3 annet ledd';
  const saerskiltVarsel =
    'varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter NS 8407 § 34.1.3 tredje ledd';
  /** Saken med vederlagskravet med posten i brev 5. `svikt` gir varslingsplikt etter § 34.1.2. */
  const sakMedPost = (innhold: Data = tilbud(150000, { saerskilt: post }), svikt = false) => {
    const s = sak();
    s.send(
      'TE',
      svikt
        ? {
            type: 'krav',
            spor: 'forhold',
            innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
          }
        : PAABEROPELSE
    );
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    s.send('TE', FRISTKRAV);
    // Et krav uten kravposter trekker P1 fra brev 2 (KA-U56).
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: innhold.kravposter ? innhold : { ...innhold, trekker: [p1I(s)] },
    });
    return s;
  };
  /** Justeringen ellers delvis 100 000 kr, posten delvis 30 000 kr. */
  const postene = {
    hovedkrav_vurdering: 'delvis',
    hovedkrav_godkjent_beloep: 100000,
    produktivitet_vurdering: 'delvis',
    produktivitet_godkjent_beloep: 30000,
    aksepterer_metode: true,
  };
  const begrenset = { produktivitet_varslet_i_tide: false, produktivitet_begrenset_beloep: 10000 };
  const brevet = (s: ReturnType<typeof sak>, vurderinger: Data, resultat: Data) =>
    s.send('BH', {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), vurderinger, resultat)],
    });
  const lagret = (rad: Journalrad) => (rad.data.svar as Data[])[0];
  const virkningene = (s: ReturnType<typeof sak>) =>
    s
      .u()
      .spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.virkninger.map((v) => [v.art, v.virkning]);

  it('beløpet for hver post og beløpet etter begrensningen står på standpunktene, og utregningen har bare totalene (OV-U26, OV-U31, valg e)', () => {
    const s = sakMedPost();
    const rad = brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    const sv = lagret(rad);
    expect((sv.standpunkter as Data[]).map((p) => utenFelt(p, 'id'))).toEqual([
      { art: 'metode', hjemmel: '34.2.2', aksepterer: true },
      { art: 'beloep', beloep: 100000 },
      {
        art: 'rettidighet',
        gjelder: s.krav('vederlag'),
        hjemmel: '34.1.3',
        i_tide: false,
        beloep: 10000,
      },
      { art: 'beloep', beloep: 30000, saerskilt: 'produktivitet' },
    ]);
    // VS-U5: begrensningen avviser ikke hele kravet; prinsipalt er justeringen ellers og
    // beløpet etter begrensningen, subsidiært begge postene.
    expect(sv.utregning).toEqual({
      resultat: 'delvis_godkjent',
      godkjent_beloep: 110000,
      subsidiaert_resultat: 'delvis_godkjent',
      subsidiaert_godkjent_beloep: 130000,
    });
  });

  it('bare § 34.1.3 påberopt: justeringen ellers er upåvirket, begrensningen prinsipal og posten subsidiær (OV-U28, OV-U33)', () => {
    const s = sakMedPost();
    const rad = brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    expect(virkningene(s)).toEqual([
      ['metode', 'upaavirket'],
      ['beloep', 'upaavirket'],
      ['rettidighet', 1],
      ['beloep', 2],
    ]);
    // Ordlyden er OV-U28: hver post for seg, og etikettene følger innsigelsene.
    expect(laast(rad).join(' ')).toContain(
      `${METODE_JA} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('150 000')} for justeringen ellers.\n\nPrinsipalt: byggherren gjør gjeldende at ${saerskiltVarsel} i brev K201-KOE-017-04 av 5. oktober 2026 kom for sent, og at TE har tapt retten til å påberope seg påløpte utgifter som grunnlag for kravet. Byggherren godkjenner ${KR('10 000')} for dette kravet.\n\nSubsidiært: byggherren godkjenner ${KR('30 000')} av de krevde ${KR('40 000')} for ${saerskiltPost}.`
    );
    // AK 4 i #1199: en upåvirket post er ingen grunn og får ingen etikett i linjen.
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: godkjent med ${kroner(100000)} for justeringen ellers, prinsipalt begrenset etter § 34.1.3 til ${kroner(10000)}, subsidiært godkjent med ${kroner(30000)} for særskilt justering (§ 34.1.3 annet ledd).`
    );
  });

  it('en aksept av svaret gir prinsipalt beløp etter begrensningen, ikke 0 (VS-U5, valg e)', () => {
    const s = sakMedPost();
    brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(s.u().spor.vederlag.enighet?.grunnlag.utfall).toEqual({ beloep: 110000 });
  });

  it('begge påberopt: § 34.1.2 prinsipalt, justeringen ellers og begrensningen subsidiært, posten videre subsidiært (OV-U27, OV-U28)', () => {
    const s = sakMedPost(undefined, true);
    const rad = brevet(
      s,
      { ...postene, ...begrenset, hovedkrav_varslet_i_tide: false },
      { resultat: 'avslaatt', godkjent_beloep: 0 }
    );
    expect(lagret(rad).utregning).toEqual({
      resultat: 'avslaatt',
      godkjent_beloep: 0,
      subsidiaert_resultat: 'delvis_godkjent',
      subsidiaert_godkjent_beloep: 130000,
    });
    expect(virkningene(s)).toEqual([
      ['rettidighet', 1],
      ['metode', 2],
      ['beloep', 2],
      ['rettidighet', 2],
      ['beloep', 3],
    ]);
    const tekstene = laast(rad).join(' ');
    expect(tekstene).toContain(
      `Subsidiært: ${metodeJa} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('150 000')} for justeringen ellers. Byggherren gjør gjeldende at ${saerskiltVarsel}`
    );
    expect(tekstene).toContain(
      `Videre subsidiært: byggherren godkjenner ${KR('30 000')} av de krevde ${KR('40 000')} for ${saerskiltPost}.`
    );
    expect(tekstene).toMatch(
      /Prinsipalt: byggherren gjør gjeldende at varselet om vederlagsjustering/
    );
    // OV-U32: standpunktene i samme lag står under én etikett, også i linjen.
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: prinsipalt varselet etter § 34.1.2 kom for sent, subsidiært godkjent med ${kroner(100000)} for justeringen ellers, begrenset etter § 34.1.3 til ${kroner(10000)}, videre subsidiært godkjent med ${kroner(30000)} for særskilt justering (§ 34.1.3 annet ledd).`
    );
  });

  it('uten påberopelse har svaret ett lag, og linjen har ingen etikett for postene (OV-U33)', () => {
    const s = sakMedPost();
    brevet(
      s,
      { ...postene, produktivitet_varslet_i_tide: true },
      { resultat: 'delvis_godkjent', godkjent_beloep: 130000 }
    );
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: godkjent med ${kroner(100000)} for justeringen ellers, godkjent med ${kroner(30000)} for særskilt justering (§ 34.1.3 annet ledd).`
    );
  });

  it('med avslått forhold er justeringen ellers i sporets første lag og ikke upåvirket (OV-U33)', () => {
    const s = sakMedPost();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          grunnlag_varslet_i_tide: true,
          resultat: 'avslaatt',
        }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...postene, ...begrenset },
          {
            resultat: 'delvis_godkjent',
            godkjent_beloep: 110000,
          }
        ),
      ],
    });
    expect(virkningene(s)).toEqual([
      ['metode', 1],
      ['beloep', 1],
      ['rettidighet', 1],
      ['beloep', 2],
    ]);
    // OV-U32, OV-U33: lagene flyttes ett ned, og laget med justeringen og begrensningen har én etikett.
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: subsidiært godkjent med ${kroner(100000)} for justeringen ellers, begrenset etter § 34.1.3 til ${kroner(10000)}, videre subsidiært godkjent med ${kroner(30000)} for særskilt justering (§ 34.1.3 annet ledd).`
    );
  });

  it('et krav med bare posten besvares uten justeringen ellers, og en vurdering av den avvises (OV-U23)', () => {
    const s = sakMedPost(tilbud(undefined, { saerskilt: post }));
    const uten = {
      produktivitet_vurdering: 'godkjent',
      produktivitet_varslet_i_tide: true,
      aksepterer_metode: true,
    };
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'vederlag',
            s.krav('vederlag'),
            { ...uten, hovedkrav_vurdering: 'godkjent' },
            {
              resultat: 'godkjent',
              godkjent_beloep: 40000,
            }
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
    const rad = brevet(s, uten, { resultat: 'godkjent', godkjent_beloep: 40000 });
    expect(laast(rad).join(' ')).toContain(
      `Byggherren godkjenner ${KR('40 000')} for ${saerskiltPost}.`
    );
  });

  it.each([
    ['beløpet etter begrensningen mangler', { produktivitet_varslet_i_tide: false }],
    [
      'beløpet etter begrensningen er høyere enn det byggherren godtar for posten',
      { produktivitet_varslet_i_tide: false, produktivitet_begrenset_beloep: 30001 },
    ],
    [
      'beløpet etter begrensningen står uten påberopt begrensning',
      { produktivitet_varslet_i_tide: true, produktivitet_begrenset_beloep: 10000 },
    ],
    ['rettidigheten etter § 34.1.3 mangler', {}],
  ])('%s, og svaret avvises (valg 2 og 3 i #1047)', (_, rettidighet) => {
    const s = sakMedPost();
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'vederlag',
            s.krav('vederlag'),
            { ...postene, ...rettidighet },
            {
              resultat: 'delvis_godkjent',
              godkjent_beloep: 110000,
            }
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
  });

  it('en begrensning krever begrunnelse, også når beløpet etter den er likt (KA-U24, valg d)', () => {
    const s = sakMedPost();
    const fullt = {
      hovedkrav_vurdering: 'godkjent',
      produktivitet_vurdering: 'godkjent',
      aksepterer_metode: true,
      produktivitet_varslet_i_tide: false,
      produktivitet_begrenset_beloep: 40000,
    };
    const uten = svar(
      'vederlag',
      s.krav('vederlag'),
      fullt,
      { resultat: 'godkjent', godkjent_beloep: 190000 },
      null
    );
    expect(s.avvist('BH', { type: 'brev', svar: [uten] })).toBe('BEGRUNNELSE_MANGLER');
    // Kontrollsak: uten påberopelse og med alt godkjent trengs ingen begrunnelse.
    const iTide = {
      ...fullt,
      produktivitet_varslet_i_tide: true,
      produktivitet_begrenset_beloep: undefined,
    };
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'vederlag',
            s.krav('vederlag'),
            iTide,
            { resultat: 'godkjent', godkjent_beloep: 190000 },
            null
          ),
        ],
      })
    ).toBeNull();
  });

  it('en begrensning i et lag gir ikke sammenfall, også når posten er godkjent fullt etter den (HF-U7, VS-U5)', () => {
    const s = sakMedPost();
    brevet(
      s,
      {
        hovedkrav_vurdering: 'godkjent',
        produktivitet_vurdering: 'godkjent',
        aksepterer_metode: true,
        produktivitet_varslet_i_tide: false,
        produktivitet_begrenset_beloep: 40000,
      },
      { resultat: 'godkjent', godkjent_beloep: 190000 }
    );
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.sammenfall).toBe(false);
    expect(s.u().spor.vederlag.enighet).toBeNull();
  });

  it('en revisjon som senker posten eller beløpet etter begrensningen, godtas, som en som hever (MM-U34 punkt 4, HF-U5)', () => {
    const s = sakMedPost();
    brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    const revisjon = (v: Data, godkjent: number) => ({
      type: 'revisjon',
      erstatter: s.u().spor.vederlag.gjeldendeSvar!.id,
      svar: svar(
        'vederlag',
        s.krav('vederlag'),
        { ...postene, ...begrenset, ...v },
        {
          resultat: 'delvis_godkjent',
          godkjent_beloep: godkjent,
        }
      ),
    });
    // Posten senkes og justeringen heves, så totalen er den samme.
    expect(
      s.avvist(
        'BH',
        revisjon(
          { produktivitet_godkjent_beloep: 20000, hovedkrav_godkjent_beloep: 110000 },
          120000
        )
      )
    ).toBeNull();
    expect(s.avvist('BH', revisjon({ produktivitet_begrenset_beloep: 5000 }, 105000))).toBeNull();
    expect(s.avvist('BH', revisjon({ produktivitet_begrenset_beloep: 20000 }, 120000))).toBeNull();
  });

  it('et varsel TE registrerer etter svaret, markerer standpunktet etter § 34.1.3 og sperrer ikke aksept (OV-U5, svaret 23.10)', () => {
    const s = sakMedPost();
    brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    const gjeldende = s.u().spor.vederlag.gjeldendeSvar!;
    const rettidighet = gjeldende.standpunkter.find((p) => p.art === 'rettidighet')!;
    s.send('TE', {
      type: 'varsel',
      korrespondansetype: 'brev',
      spor: 'vederlag',
      hjemmel: '34.1.3',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    const u = s.u();
    expect(u.svar[gjeldende.id].gjaldtEtAnnetVarsel).toEqual([rettidighet.id]);
    // Svaret står med virkningen det hadde (OV-U5).
    expect(u.svar[gjeldende.id].virkninger).toEqual(gjeldende.beslutningsgrunnlag.virkninger);
    expect(
      s.avvist('TE', {
        type: 'aksept',
        spor: 'vederlag',
        svar: gjeldende.id,
        regelversjon: KJERNE.regler.versjon,
      })
    ).toBeNull();
  });

  it('svaret gjentar byggherrens egen innsigelse mot det særskilte varselet (VS-U24)', () => {
    const s = sakMedPost();
    const varsel = s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.3' });
    const innsigelse = s.send('BH', {
      type: 'innsigelse',
      gjelder: (varsel.data.utsagn as Data[])[0].id,
    });
    const rad = brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    expect(laast(rad).join(' ')).toContain(
      `kom for sent, jf. innsigelsen i brev K201-KOE-017-${String(innsigelse.data.brevnummer).padStart(2, '0')}`
    );
  });

  describe('postlisten visningen leser (svarene i #1047 24.10, MM-U23, OV-U28)', () => {
    const svaret = (s: ReturnType<typeof sak>) => {
      const u = s.u();
      return vederlagssvaret(u, u.spor.vederlag.svar.at(-1)!);
    };
    const iTide = { ...postene, produktivitet_varslet_i_tide: true };

    it('hver post for seg med beløpet og laget brevet ga den, og begrensningen bare på posten den rammer (OV-U28, VS-U5)', () => {
      const s = sakMedPost();
      brevet(
        s,
        { ...postene, ...begrenset },
        { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
      );
      const v = svaret(s);
      // Som brevteksten over: justeringen ellers uten etikett, begrensningen prinsipalt og
      // posten subsidiært. Ingen total per lag (MM-U23).
      expect(v.poster).toEqual([
        {
          standpunkt: expect.any(String),
          godkjent: 100000,
          lag: null,
          etikett: null,
          begrensning: null,
        },
        {
          standpunkt: expect.any(String),
          saerskilt: 'produktivitet',
          godkjent: 30000,
          lag: 2,
          etikett: 'subsidiært',
          begrensning: {
            standpunkt: v.paaberopt[0].standpunkt,
            beloep: 10000,
            lag: 1,
            etikett: 'prinsipalt',
          },
        },
      ]);
      expect(v.paaberopt).toEqual([
        {
          standpunkt: expect.any(String),
          hjemmel: '34.1.3',
          begrenset: 10000,
          lag: 1,
          etikett: 'prinsipalt',
        },
      ]);
      expect(v).toMatchObject({
        part: 'BH',
        eldreKravversjon: false,
        vurdertVedRegistreringen: false,
      });
      // Utfallet summerer de samme postene (VS-U5): 100 000 + 10 000.
      s.send('TE', {
        type: 'aksept',
        spor: 'vederlag',
        svar: v.svar,
        regelversjon: KJERNE.regler.versjon,
      });
      expect(s.u().spor.vederlag.enighet?.grunnlag.utfall).toEqual({ beloep: 110000 });
    });

    it('en påberopelse uten virkning står som byggherrens utsagn uten lag, og gir ingen post et annet beløp (presiseringen 24.10, HF-U2)', () => {
      // Kommandoene avviser en påberopelse som ikke gjelder kravet, men et registrert svar kan
      // ha den (MM-U17, MM-U50). Postlisten leser virkningene brevet frøs.
      const standpunkter: Standpunkt[] = [
        {
          id: 'r',
          art: 'rettidighet',
          gjelder: 'k',
          hjemmel: '34.1.3',
          iTide: false,
          begrenset: 10000,
        },
        { id: 'b1', art: 'beloep', resultat: 'delvis_godkjent', godkjent: 100000 },
        {
          id: 'b2',
          art: 'beloep',
          resultat: 'delvis_godkjent',
          godkjent: 30000,
          saerskilt: 'produktivitet',
        },
      ];
      const { poster, paaberopt } = postlisten(
        { spor: 'vederlag', standpunkter, utregning: {} },
        [
          { standpunkt: 'r', art: 'rettidighet', virkning: 'uten_virkning' },
          { standpunkt: 'b1', art: 'beloep', virkning: 1 },
          { standpunkt: 'b2', art: 'beloep', virkning: 1 },
        ],
        0
      );
      expect(paaberopt).toEqual([
        { standpunkt: 'r', hjemmel: '34.1.3', begrenset: 10000, lag: null, etikett: null },
      ]);
      expect(poster.map((p) => [p.godkjent, p.lag, p.etikett, p.begrensning])).toEqual([
        [100000, 1, null, null],
        [30000, 1, null, null],
      ]);
    });

    it('lagene fra svaret på forholdet står foran postene, som i brevet (OV-U32)', () => {
      const s = sakMedPost();
      s.send('BH', {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: true,
          }),
        ],
      });
      brevet(s, iTide, { resultat: 'delvis_godkjent', godkjent_beloep: 130000 });
      expect(svaret(s).poster.map((p) => [p.lag, p.etikett])).toEqual([
        [2, 'subsidiært'],
        [2, 'subsidiært'],
      ]);
    });

    it('svaret på en eldre kravversjon skilles fra kravet som venter på svar (MM-U24, MM-U9)', () => {
      const s = sakMedPost();
      brevet(s, iTide, { resultat: 'delvis_godkjent', godkjent_beloep: 130000 });
      s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: tilbud(160000, { saerskilt: post }),
      });
      const v = svaret(s);
      expect(v.eldreKravversjon).toBe(true);
      expect(v.kravversjon).not.toBe(s.u().spor.vederlag.gjeldendeKrav!.id);
      expect(v.poster.map((p) => p.godkjent)).toEqual([100000, 30000]);
    });
  });
});

/**
 * #1301 (VG-F-01): vurderingen og beløpet byggherren oppgir for en post, må si det samme
 * (KA-U9, B-13). OV-U58: beløpene oppgis i kroner med høyst to desimaler, og brøkdeler av
 * øre avvises før beløpskontrollen og resultatet. OV-U59: beløpene sammenliknes i hele øre.
 * Kravet i brev 5 er 150 000 kr for justeringen ellers og 40 000 kr for posten etter
 * § 34.1.3 annet ledd. Rigg og drift er ikke i formatet (#1171) og prøves i `kjerne.test.ts`.
 */
describe('beløpsvurderingen må stemme med beløpet, i hele øre (#1301, OV-U58, OV-U59)', () => {
  const sakMedPost = () => {
    const s = sakMedKrav();
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(150000, { saerskilt: { produktivitet: { beloep: 40000 } } }),
    });
    return s;
  };
  const godkjentPost = { produktivitet_vurdering: 'godkjent' };
  const godkjentHovedkrav = { hovedkrav_vurdering: 'godkjent' };
  const brevet = (s: ReturnType<typeof sak>, vurderinger: Data, resultat: Data) => ({
    type: 'brev',
    svar: [
      svar(
        'vederlag',
        s.krav('vederlag'),
        { aksepterer_metode: true, produktivitet_varslet_i_tide: true, ...vurderinger },
        resultat
      ),
    ],
  });
  const fullt = { resultat: 'godkjent', godkjent_beloep: 190000 };

  it.each([
    ['hovedkrav', 'godkjent', 90000, godkjentPost],
    ['hovedkrav', 'avslaatt', 10000, godkjentPost],
    ['produktivitet', 'godkjent', 30000, godkjentHovedkrav],
    ['produktivitet', 'avslaatt', 0.01, godkjentHovedkrav],
  ] as const)(
    '«%s» vurdert «%s» med %s kr avvises med UGYLDIG_VURDERING, også når resultatet er det serveren ellers ville regnet ut',
    (post, vurdering, beloep, resten) => {
      const s = sakMedPost();
      const vurderinger = {
        ...resten,
        [`${post}_vurdering`]: vurdering,
        [`${post}_godkjent_beloep`]: beloep,
      };
      // Resultatet serveren regnet ut før #1301, når beløpet ble oversett, og resultatet av beløpet.
      const forRetting =
        vurdering === 'godkjent'
          ? fullt
          : { resultat: 'delvis_godkjent', godkjent_beloep: post === 'hovedkrav' ? 40000 : 150000 };
      for (const resultat of [
        forRetting,
        { resultat: 'delvis_godkjent', godkjent_beloep: beloep },
      ]) {
        const a = s.avvisning('BH', brevet(s, vurderinger, resultat));
        expect(a?.regel).toBe('UGYLDIG_VURDERING');
        expect(a?.melding).toContain(`${post}_godkjent_beloep: er ${beloep}, men vurderingen «`);
      }
      expect(s.u().spor.vederlag.gjeldendeSvar, 'ingenting er lagret').toBeNull();
    }
  );

  it('meldingen sier posten, vurderingen og beløpene som motsier hverandre', () => {
    const s = sakMedPost();
    expect(
      s.avvisning(
        'BH',
        brevet(
          s,
          { ...godkjentPost, hovedkrav_vurdering: 'godkjent', hovedkrav_godkjent_beloep: 90000 },
          fullt
        )
      )?.melding
    ).toBe(
      'Vurderingene kan ikke regnes ut: hovedkrav_godkjent_beloep: er 90000, men vurderingen «godkjent» gjelder hele det krevde beløpet, 150000.'
    );
  });

  it.each([
    ['hovedkrav', 150000, godkjentPost, 'godkjent', 190000],
    ['hovedkrav', 0, godkjentPost, 'delvis_godkjent', 40000],
    ['produktivitet', 40000, godkjentHovedkrav, 'godkjent', 190000],
    ['produktivitet', 0, godkjentHovedkrav, 'delvis_godkjent', 150000],
  ] as const)(
    '«%s» vurdert «delvis» med %s kr avvises med UGYLDIG_VURDERING, også med resultatet serveren regnet ut før (KA-U42)',
    (post, beloep, resten, forRetting, sum) => {
      const s = sakMedPost();
      const vurderinger = {
        ...resten,
        [`${post}_vurdering`]: 'delvis',
        [`${post}_godkjent_beloep`]: beloep,
      };
      const a = s.avvisning(
        'BH',
        brevet(s, vurderinger, { resultat: forRetting, godkjent_beloep: sum })
      );
      expect(a?.regel).toBe('UGYLDIG_VURDERING');
      expect(a?.melding).toContain(
        `${post}_godkjent_beloep: er ${beloep}, men vurderingen «delvis» gjelder mer enn 0 og mindre enn det krevde beløpet`
      );
      expect(s.u().spor.vederlag.gjeldendeSvar, 'ingenting er lagret').toBeNull();
    }
  );

  it('kontrollsak: «delvis» med 1 øre og med 1 øre under det krevde godtas (KA-U42)', () => {
    for (const [beloep, sum] of [
      [0.01, 40000.01],
      [149999.99, 189999.99],
    ]) {
      const s = sakMedPost();
      expect(
        s.avvist(
          'BH',
          brevet(
            s,
            { ...godkjentPost, hovedkrav_vurdering: 'delvis', hovedkrav_godkjent_beloep: beloep },
            { resultat: 'delvis_godkjent', godkjent_beloep: sum }
          )
        )
      ).toBeNull();
    }
  });

  it('kontrollsakene godtas: «godkjent» uten beløp, «godkjent» med beløpet likt det krevde og «avslått» med 0', () => {
    for (const hovedkrav of [
      { hovedkrav_vurdering: 'godkjent' },
      { hovedkrav_vurdering: 'godkjent', hovedkrav_godkjent_beloep: 150000 },
      { hovedkrav_vurdering: 'godkjent', hovedkrav_godkjent_beloep: 150000.0 },
    ]) {
      const s = sakMedPost();
      expect(s.avvist('BH', brevet(s, { ...godkjentPost, ...hovedkrav }, fullt))).toBeNull();
    }
    const s = sakMedPost();
    expect(
      s.avvist(
        'BH',
        brevet(
          s,
          {
            ...godkjentHovedkrav,
            produktivitet_vurdering: 'avslaatt',
            produktivitet_godkjent_beloep: 0,
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 150000 }
        )
      )
    ).toBeNull();
  });

  it('et godkjent beløp med brøkdeler av øre avvises og rundes ikke av, heller ikke til det krevde (OV-U58)', () => {
    const s = sakMedPost();
    const delvis = (beloep: number) =>
      brevet(
        s,
        { ...godkjentPost, hovedkrav_vurdering: 'delvis', hovedkrav_godkjent_beloep: beloep },
        { resultat: 'delvis_godkjent', godkjent_beloep: Math.round(beloep * 100) / 100 + 40000 }
      );
    expect(s.avvisning('BH', delvis(100000.405))).toEqual({
      regel: 'UGYLDIG_VURDERING',
      melding:
        'Vurderingene kan ikke regnes ut: hovedkrav_godkjent_beloep: 100000.405 har brøkdeler av øre (OV-U58).',
    });
    // Rundet til hele øre ville beløpet vært det krevde, og svaret godkjent fullt uten begrunnelse.
    expect(s.avvist('BH', delvis(149999.995))).toBe('UGYLDIG_VURDERING');
    expect(s.avvist('BH', delvis(100000.4)), 'kontrollsak: 100 000 kr og 40 øre').toBeNull();
  });

  it('beløpet etter begrensningen etter § 34.1.3 med brøkdeler av øre avvises (OV-U58)', () => {
    const s = sakMedPost();
    const begrenset = (beloep: number) =>
      brevet(
        s,
        {
          ...godkjentHovedkrav,
          produktivitet_vurdering: 'godkjent',
          produktivitet_varslet_i_tide: false,
          produktivitet_begrenset_beloep: beloep,
        },
        {
          resultat: 'delvis_godkjent',
          godkjent_beloep: 150000 + beloep,
          subsidiaert_resultat: 'godkjent',
          subsidiaert_godkjent_beloep: 190000,
        }
      );
    expect(s.avvisning('BH', begrenset(10000.001))?.melding).toBe(
      'Vurderingene kan ikke regnes ut: produktivitet_begrenset_beloep: 10000.001 har brøkdeler av øre (OV-U58).'
    );
    expect(s.avvist('BH', begrenset(10000.01)), 'kontrollsak').toBeNull();
  });

  it('et krevd beløp med brøkdeler av øre avvises i formen, i justeringen ellers og i posten (OV-U58)', () => {
    const s = sakMedKrav();
    const krav = (innhold: Data) => ({
      type: 'krav',
      spor: 'vederlag',
      innhold,
    });
    expect(s.avvisning('TE', krav(tilbud(100000.405)))).toEqual({
      regel: 'UGYLDIG_FORM',
      melding:
        '$.innhold.kravposter[0].beloep: 100000.405 har brøkdeler av øre; beløpet oppgis i kroner med høyst to desimaler (OV-U58)',
    });
    expect(s.avvist('TE', krav({ saerskilt: { produktivitet: { beloep: 40000.001 } } }))).toBe(
      'UGYLDIG_FORM'
    );
    const anslag = { beskrivelse: 'P2', oppgjoersform: 'enhetspriser', anslag: 5000.001 };
    expect(s.avvisning('TE', krav({ ...tilbud(100000), kravposter: [anslag] }))?.melding).toContain(
      '$.innhold.kravposter[0].anslag: 5000.001 har brøkdeler av øre'
    );
    expect(s.avvist('TE', krav(tilbud(100000.4))), 'kontrollsak: 100 000 kr og 40 øre').toBeNull();
  });
});

describe('innsigelsen mot det en registrert enighet omfatter, godtas (MM-U34 punkt 13)', () => {
  const fristsvar = (s: ReturnType<typeof sak>) =>
    s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });

  it('innsigelsen mot fristkravet og svaret partene er enige om ved sammenfall, godtas (MM-U34 punkt 13)', () => {
    const s = sakMedKrav();
    fristsvar(s);
    expect(s.u().spor.frist.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('frist') })).toBeNull();
    expect(
      s.avvist('TE', { type: 'innsigelse', gjelder: s.u().spor.frist.gjeldendeSvar!.id })
    ).toBeNull();
  });

  it('etter et «i tide» i svaret med enighet godtas både innsigelsen mot varselet og innsigelsen mot kravet (MM-U34 punkt 6 og 13)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    fristsvar(s);
    s.send('TE', {
      type: 'varsel',
      korrespondansetype: 'brev',
      spor: 'frist',
      hjemmel: '33.4',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    const varsel = s.u().spor.frist.varsler['33.4']!.id;
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('frist') })).toBeNull();
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: varsel })).toBeNull();
  });

  it('innsigelsen mot en påberopelse med registrert enighet ved en endringsordre godtas (MM-U34 punkt 13, EO-U12)', () => {
    const s = sakMedKrav();
    const krav = s.krav('forhold');
    s.rad('BH', {
      svar: [
        {
          id: randomUUID(),
          spor: 'forhold',
          gjelder: krav,
          standpunkter: [
            { id: randomUUID(), art: 'rettidighet', gjelder: krav, hjemmel: '32.2', i_tide: true },
            { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
          ],
        },
      ],
      opplysninger: [
        { id: randomUUID(), hva: 'sendt', dato: '2026-10-06' },
        { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
      ],
      korrespondansetype: 'brev',
    });
    expect(s.u().spor.forhold.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: krav })).toBeNull();
  });
});

/**
 * MM-U34 punkt 9, 11 og 20, EO-U12 og GR-U27: en registrert enighet sperrer ikke en ny
 * kravversjon eller et nytt svar fram til endringsordren, og endringsordren krever ikke
 * registrert enighet. Arbeidsvalg 3 i #1376: etter en ny kravversjon er den registrerte
 * enigheten ikke enighet om det gjeldende kravet.
 */
describe('en registrert enighet sperrer ikke ny kravversjon eller nytt svar (MM-U34)', () => {
  type Sak = ReturnType<typeof sak>;
  type Sporet = 'forhold' | 'vederlag' | 'frist';
  const utregnet = (s: Sak, spor: Sporet, v: Data) => {
    const u = s.u();
    const krav = gjeldendeKrav(u, spor);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(spor, v, { krav, paaberopelse: u.spor.forhold.gjeldendeKrav }, KJERNE.regler)
    );
  };
  const brev = (s: Sak, spor: Sporet, v: Data) =>
    s.send('BH', { type: 'brev', svar: [utregnet(s, spor, v)] });
  const revisjon = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor[spor].gjeldendeSvar!.id,
    svar: utregnet(s, spor, v),
  });
  const godta = (s: Sak, spor: Sporet) =>
    s.send('TE', {
      type: 'aksept',
      spor,
      svar: s.u().spor[spor].gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
  /** 10 av 20 dager, så svaret ikke stemmer med kravet. */
  const tiDager = { ...FRIST_FULLT[0], dager: 10 };
  const nyttFristkrav = {
    type: 'krav',
    spor: 'frist',
    innhold: { dager: 15 },
    utdypning: 'Pelingen tar tre uker lenger.',
  };
  const godkjentForhold = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };

  /** Fristsvaret godtatt av TE, mens vederlaget står åpent, så kravene ikke er avgjort (OV-U3). */
  const medGodtattFristsvar = () => {
    const s = sakMedKrav();
    brev(s, 'frist', tiDager);
    godta(s, 'frist');
    const u = s.u();
    expect(u.spor.frist.enighet, 'forutsetning: enighet ved aksept').not.toBeNull();
    expect(kraveneErAvgjort(u), 'forutsetning: kravene er ikke avgjort').toBe(false);
    return s;
  };
  /** Fristsvaret stemmer med kravet, så partene er enige ved sammenfall (GR-U7). */
  const medSammenfallIFristen = () => {
    const s = sakMedKrav();
    brev(s, 'frist', FRIST_FULLT[0]);
    expect(s.u().spor.frist.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
    return s;
  };

  it('TE kan sende en ny kravversjon i et spor med enighet ved aksept eller sammenfall, og saken er forstått (MM-U34 punkt 9)', () => {
    for (const s of [medGodtattFristsvar(), medSammenfallIFristen()]) {
      expect(s.avvist('TE', nyttFristkrav)).toBeNull();
      s.send('TE', nyttFristkrav);
      expect(s.u().forstaatt).toBe(true);
    }
  });

  it('TE kan sende en ny påberopelsesversjon når godkjenningen av forholdet gir enighet (MM-U34 punkt 9, EO-U12)', () => {
    const s = sakMedKrav();
    brev(s, 'forhold', godkjentForhold);
    expect(s.u().spor.forhold.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
    expect(s.u().endringsordre, 'forutsetning: godkjenningen er en endringsordre').toBe('ja');
    expect(
      s.avvist('TE', {
        ...PAABEROPELSE,
        innhold: { ...PAABEROPELSE.innhold },
      })
    ).toBeNull();
  });

  it('etter en ny påberopelsesversjon kan TE fortsatt ikke trekke forholdet når en godkjenning av det var en endringsordre (EO-U12, KA-U13)', () => {
    const s = sakMedKrav();
    brev(s, 'forhold', godkjentForhold);
    const trekk = { type: 'trekk', spor: 'forhold' };
    expect(s.avvist('TE', trekk), 'kontrollsak: sperret før den nye versjonen').toBe(
      'FORHOLD_ER_ENDRINGSORDRE'
    );
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold },
    });
    expect(
      s.u().spor.forhold.gjeldendeSvar,
      'forutsetning: ingen svar på den nye versjonen'
    ).toBeNull();
    expect(s.u().endringsordre).toBe('ja');
    expect(s.avvist('TE', trekk)).toBe('FORHOLD_ER_ENDRINGSORDRE');
  });

  it('etter en ny kravversjon er enigheten ikke enighet om det gjeldende kravet, sporet venter på svar, og aksepten står i journalen (arbeidsvalg 3 i #1376, MM-U34 punkt 2)', () => {
    const s = sakMedKrav();
    brev(s, 'frist', tiDager);
    const svaret = s.u().spor.frist.gjeldendeSvar!.id;
    const rad = godta(s, 'frist');
    const aksept = (rad.data.utsagn as { id: string; art: string }[]).find(
      (x) => x.art === 'aksept'
    )!.id;
    expect(s.u().spor.frist.enighet?.grunnlag.kilde, 'forutsetning').toBe('aksept');
    s.send('TE', nyttFristkrav);
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.frist.enighet).toBeNull();
    expect(u.spor.frist.gjeldendeSvar).toBeNull();
    expect(visning(u, GJELDENDE_REGLER).spor.frist.etiketter).toContain('venter_paa_svar');
    expect(
      u.spor.frist.svar.map((x) => x.id),
      'det godtatte svaret står i sporet'
    ).toContain(svaret);
    expect(u.elementer[aksept], 'aksepten står i journalen').toBeDefined();
  });

  it('byggherren kan revidere et svar TE har godtatt, og saken er forstått (MM-U34 punkt 11)', () => {
    const s = medGodtattFristsvar();
    const heving = revisjon(s, 'frist', { ...tiDager, dager: 15 });
    expect(s.avvist('BH', heving)).toBeNull();
    s.send('BH', heving);
    expect(s.u().forstaatt).toBe(true);
  });

  it('byggherren kan revidere et svar som stemmer med kravet (MM-U34 punkt 11)', () => {
    const s = medSammenfallIFristen();
    expect(s.avvist('BH', revisjon(s, 'frist', FRIST_FULLT[0]))).toBeNull();
  });

  it('byggherren kan revidere en godkjenning av forholdet som er en endringsordre, og saken er forstått (EO-U12, MM-U34 punkt 11)', () => {
    const s = sakMedKrav();
    brev(s, 'forhold', godkjentForhold);
    expect(s.u().endringsordre, 'forutsetning: godkjenningen er en endringsordre').toBe('ja');
    const ny = revisjon(s, 'forhold', godkjentForhold);
    expect(s.avvist('BH', ny)).toBeNull();
    s.send('BH', ny);
    expect(s.u().forstaatt).toBe(true);
  });

  it('byggherren kan revidere et svar TE har godtatt, også med lavere beløp, og saken er forstått (MM-U34 punkt 4 og 11)', () => {
    const s = sakMedKrav();
    const delvis = (beloep: number) => ({
      hovedkrav_vurdering: 'delvis',
      hovedkrav_godkjent_beloep: beloep,
      aksepterer_metode: true,
    });
    brev(s, 'vederlag', delvis(100000));
    godta(s, 'vederlag');
    expect(s.u().spor.vederlag.enighet, 'forutsetning: enighet ved aksept').not.toBeNull();
    const senking = revisjon(s, 'vederlag', delvis(80000));
    expect(s.avvist('BH', senking)).toBeNull();
    s.send('BH', senking);
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.spor.vederlag.svar, 'det godtatte svaret står i sporet (MM-U12, MM-U50)').toHaveLength(
      2
    );
  });

  const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const frafall = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
  /** Godkjenningen av forholdet, som er en endringsordre (GR-U14), og brevet med den. */
  const medEndringsordre = () => {
    const s = sakMedKrav();
    const godkjenningen = brev(s, 'forhold', godkjentForhold);
    expect(s.u().endringsordre, 'forutsetning: godkjenningen er en endringsordre').toBe('ja');
    return { s, godkjenningen, tekst: laast(godkjenningen)[0] };
  };
  const endringsordreIBrevet = 'Svaret er en endringsordre etter NS 8407 § 32.3 første ledd a';

  it.each([
    ['avslag', avslag],
    ['frafall', frafall],
  ])(
    'etter at byggherren har revidert en godkjenning av forholdet som er en endringsordre, til %s, kan TE fortsatt ikke trekke forholdet (EO-U12, KA-U13)',
    (_n, v) => {
      const trekk = { type: 'trekk', spor: 'forhold' };
      const kontroll = sakMedKrav();
      brev(kontroll, 'forhold', v);
      expect(kontroll.avvist('TE', trekk), 'kontrollsak: uten godkjenningen').toBeNull();
      const { s } = medEndringsordre();
      s.send('BH', revisjon(s, 'forhold', v));
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(u.endringsordre).toBe('ja');
      expect(s.avvist('TE', trekk)).toBe('FORHOLD_ER_ENDRINGSORDRE');
    }
  );

  it('godkjenning som er en endringsordre, revisjon til avslag og TEs aksept av avslaget lukker saken, uten at endringsordren leses som bortfalt, og brevet med godkjenningen sier fortsatt at den er en endringsordre (GR-U27, EO-U12, MM-U12 (opphevet av MM-U50))', () => {
    const { s, godkjenningen, tekst } = medEndringsordre();
    expect(tekst).toContain(endringsordreIBrevet);
    s.send('BH', revisjon(s, 'forhold', avslag));
    godta(s, 'forhold');
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.forholdAvvist).toBe(true);
    expect(kanInngaaIEo(u)).toBe(false);
    expect(u.endringsordre).toBe('ja');
    const lagret = s.journal.find((r) => r.event_id === godkjenningen.event_id)!;
    expect(laast(lagret)[0]).toBe(tekst);
  });

  it('godkjenning som er en endringsordre, revisjon til avslag og en ny påberopelsesversjon fra TE: endringsordren leses ikke som bortfalt, og brevet med godkjenningen står uendret (EO-U12, MM-U12 (opphevet av MM-U50))', () => {
    const { s, godkjenningen, tekst } = medEndringsordre();
    s.send('BH', revisjon(s, 'forhold', avslag));
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold },
    });
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.forholdAvvist).toBe(false);
    expect(u.endringsordre).toBe('ja');
    expect(s.avvist('TE', { type: 'trekk', spor: 'forhold' })).toBe('FORHOLD_ER_ENDRINGSORDRE');
    const lagret = s.journal.find((r) => r.event_id === godkjenningen.event_id)!;
    expect(laast(lagret)[0]).toBe(tekst);
    expect(tekst).toContain(endringsordreIBrevet);
  });

  it('kontrollsak: TE kan fortsatt ikke godta et svar med registrert enighet (GR-U8)', () => {
    const s = medSammenfallIFristen();
    expect(
      s.avvist('TE', {
        type: 'aksept',
        spor: 'frist',
        svar: s.u().spor.frist.gjeldendeSvar!.id,
        regelversjon: KJERNE.regler.versjon,
      })
    ).toBe('ENIGHET_I_SPORET');
  });

  describe('saken kan inngå i en endringsordre når forholdet er sendt (MM-U34 punkt 20, GR-U27, GR-U28)', () => {
    it('også uten registrert enighet i noe spor, men ikke før forholdet er sendt (MM-U34 punkt 20)', () => {
      const s = sak();
      expect(kanInngaaIEo(s.u()), 'kontrollsak: grunnlaget er ikke sendt').toBe(false);
      s.send('TE', PAABEROPELSE);
      expect(kanInngaaIEo(s.u())).toBe(true);
      const u = sakMedKrav().u();
      expect(['forhold', 'vederlag', 'frist'].map((n) => u.spor[n as Sporet].enighet)).toEqual([
        null,
        null,
        null,
      ]);
      expect(kanInngaaIEo(u)).toBe(true);
    });

    it('ikke når TE har godtatt avslaget på forholdet (GR-U27, MM-U34 punkt 20)', () => {
      const s = sakMedKrav();
      brev(s, 'forhold', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true });
      expect(kanInngaaIEo(s.u()), 'kontrollsak: avslaget er ikke godtatt').toBe(true);
      godta(s, 'forhold');
      expect(s.u().forholdAvvist, 'forutsetning').toBe(true);
      expect(kanInngaaIEo(s.u())).toBe(false);
    });

    it('ikke når TE har trukket forholdet (GR-U27, MM-U34 punkt 20)', () => {
      const s = sakMedKrav();
      expect(kanInngaaIEo(s.u()), 'kontrollsak').toBe(true);
      s.send('TE', { type: 'trekk', spor: 'forhold' });
      expect(kanInngaaIEo(s.u())).toBe(false);
    });

    it('også når byggherren har frafalt pålegget etter § 32.3 c (GR-U28)', () => {
      const s = sakMedKrav();
      brev(s, 'forhold', { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true });
      expect(s.u().frafalt, 'forutsetning').toBe(true);
      expect(kanInngaaIEo(s.u())).toBe(true);
    });
  });
});

describe('lagene i et vederlagssvar som ikke er ferdig utfylt (OV-U32, OV-U33, S1-A og S2-A i #1400)', () => {
  const sviktkrav = {
    type: 'krav',
    spor: 'forhold',
    innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
  };
  /** Forholdet, BHs svar på det og vederlagskravet. `svikt` gir varslingsplikt etter § 34.1.2. */
  const saken = (forhold: Data, { svikt = true, vederlag = tilbud(100000) as Data } = {}) => {
    const s = sak();
    s.send('TE', svikt ? sviktkrav : PAABEROPELSE);
    s.send('BH', { type: 'brev', svar: [svar('forhold', s.krav('forhold'), forhold)] });
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: vederlag });
    return s;
  };
  const lagene = (s: ReturnType<typeof sak>, vurderinger: Data) =>
    lagForUtkastet(
      svar('vederlag', s.krav('vederlag'), vurderinger) as never,
      s.u(),
      KJERNE.regler
    ).standpunkter.map(({ art, hjemmel, saerskilt, ...rest }) => ({
      standpunkt: [art, hjemmel ?? saerskilt].filter(Boolean).join(' '),
      ...rest,
    }));

  it('kontrollsak: med godkjent forhold og ingenting besvart står beløpet uten lag og uten forutsetninger', () => {
    const s = saken({ resultat: 'godkjent' });
    expect(lagene(s, {})).toEqual([
      { standpunkt: 'beloep', besvart: false, virkning: 1, etikett: null, forutsetninger: [] },
    ]);
  });

  it('avslått forhold og ubesvart varsel: beløpet står subsidiært, bare med avslaget foran (S1-A)', () => {
    const s = saken({ resultat: 'avslaatt' });
    expect(lagene(s, { aksepterer_metode: true })).toEqual([
      {
        standpunkt: 'metode',
        besvart: true,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }],
      },
      {
        standpunkt: 'beloep',
        besvart: false,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }],
      },
    ]);
  });

  it('avslått forhold og varselet etter § 34.1.2 for sent: beløpet står videre subsidiært med begge innsigelsene foran, før det er besvart', () => {
    const s = saken({ resultat: 'avslaatt' });
    expect(lagene(s, { hovedkrav_varslet_i_tide: false })).toEqual([
      {
        standpunkt: 'rettidighet 34.1.2',
        besvart: true,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }],
      },
      {
        standpunkt: 'beloep',
        besvart: false,
        virkning: 3,
        etikett: 'videre subsidiært',
        forutsetninger: [{ grunn: 'avslaatt' }, { innsigelse: '34.1.2' }],
      },
    ]);
  });

  it('varselet etter § 34.1.2 i tide er uten virkning og ingen forutsetning for beløpet', () => {
    const s = saken({ resultat: 'godkjent' });
    expect(lagene(s, { hovedkrav_varslet_i_tide: true, hovedkrav_vurdering: 'godkjent' })).toEqual([
      {
        standpunkt: 'rettidighet 34.1.2',
        besvart: true,
        virkning: 'uten_virkning',
        etikett: null,
        forutsetninger: [],
      },
      { standpunkt: 'beloep', besvart: true, virkning: 1, etikett: null, forutsetninger: [] },
    ]);
  });

  it('preklusjon etter § 32.2 og avslag står foran sporet i brevets rekkefølge (OV-U32)', () => {
    const s = saken({ resultat: 'avslaatt', grunnlag_varslet_i_tide: false }, { svikt: false });
    expect(lagene(s, {})).toEqual([
      {
        standpunkt: 'beloep',
        besvart: false,
        virkning: 3,
        etikett: 'videre subsidiært',
        forutsetninger: [{ grunn: 'prekludert' }, { grunn: 'avslaatt' }],
      },
    ]);
  });

  it('§ 34.1.3 rammer bare posten etter annet ledd, og justeringen ellers er upåvirket eller har bare avslaget foran (OV-U22, OV-U27, OV-U33)', () => {
    const krav = {
      svikt: false,
      vederlag: tilbud(150000, { saerskilt: { produktivitet: { beloep: 40000 } } }),
    };
    const avslaatt = saken({ resultat: 'avslaatt', grunnlag_varslet_i_tide: true }, krav);
    expect(
      lagene(avslaatt, { produktivitet_varslet_i_tide: false }).map((x) => [
        x.standpunkt,
        x.virkning,
        x.forutsetninger,
      ])
    ).toEqual([
      ['beloep', 2, [{ grunn: 'avslaatt' }]],
      ['rettidighet 34.1.3', 2, [{ grunn: 'avslaatt' }]],
      ['beloep produktivitet', 3, [{ grunn: 'avslaatt' }, { innsigelse: '34.1.3' }]],
    ]);
    const s = saken({ resultat: 'godkjent', grunnlag_varslet_i_tide: true }, krav);
    expect(lagene(s, { produktivitet_varslet_i_tide: false })).toEqual([
      {
        standpunkt: 'beloep',
        besvart: false,
        virkning: 'upaavirket',
        etikett: null,
        forutsetninger: [],
      },
      {
        standpunkt: 'rettidighet 34.1.3',
        besvart: true,
        virkning: 1,
        etikett: 'prinsipalt',
        forutsetninger: [],
      },
      {
        standpunkt: 'beloep produktivitet',
        besvart: false,
        virkning: 2,
        etikett: 'subsidiært',
        forutsetninger: [{ innsigelse: '34.1.3' }],
      },
    ]);
  });

  it('med § 34.1.2 og § 34.1.3 for sent har posten begge innsigelsene foran, og justeringen ellers bare § 34.1.2', () => {
    const s = saken(
      { resultat: 'godkjent' },
      {
        vederlag: tilbud(150000, { saerskilt: { produktivitet: { beloep: 40000 } } }),
      }
    );
    const l = lagene(s, { hovedkrav_varslet_i_tide: false, produktivitet_varslet_i_tide: false });
    expect(l.map((x) => [x.standpunkt, x.virkning, x.forutsetninger])).toEqual([
      ['rettidighet 34.1.2', 1, []],
      ['beloep', 2, [{ innsigelse: '34.1.2' }]],
      ['rettidighet 34.1.3', 2, [{ innsigelse: '34.1.2' }]],
      ['beloep produktivitet', 3, [{ innsigelse: '34.1.2' }, { innsigelse: '34.1.3' }]],
    ]);
  });

  it('det ferdige svaret har de samme lagene som brevet fryser når det sendes (MM-U9)', () => {
    const s = saken({ resultat: 'avslaatt' });
    const vurderinger = {
      hovedkrav_varslet_i_tide: false,
      aksepterer_metode: true,
      hovedkrav_vurdering: 'delvis',
      hovedkrav_godkjent_beloep: 60000,
    };
    const foer = lagene(s, vurderinger);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('vederlag', s.krav('vederlag'), vurderinger, {
          resultat: 'avslaatt',
          godkjent_beloep: 0,
          subsidiaert_resultat: 'delvis_godkjent',
          subsidiaert_godkjent_beloep: 60000,
        }),
      ],
    });
    const u = s.u();
    const g = u.spor.forhold.gjeldendeSvar!;
    const forskyvning = lagFraForholdet(g, g.beslutningsgrunnlag.virkninger);
    const frosset = u.spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.virkninger;
    expect(foer.map((l) => l.virkning)).toEqual(
      frosset.map((v) => (typeof v.virkning === 'number' ? v.virkning + forskyvning : v.virkning))
    );
    expect(foer.at(-1)).toMatchObject({ besvart: true, etikett: 'videre subsidiært' });
  });
});

describe('brevtittelen fryses med brevet (MM-U3, MM-U50, svaret 03.11 i #1488)', () => {
  it('påberopelsen får tittelen med navnet på forholdet fra kjernens liste, og leseren gir den', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    expect(rad.data.brevtittel).toBe('Påberopelse av irregulær endring i sak KOE-17');
    const lest = lesJournal(s.journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtittel).toBe(
      'Påberopelse av irregulær endring i sak KOE-17'
    );
  });

  // #1536: hvert brev løsningen sender, fryser tittelen visningen ga det (tekster.ts før #1536).
  it('kravet og svaret fryser tittelen sin med teksten (#1536)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(1000),
    });
    expect(krav.data.brevtittel).toBe('Krav om vederlagsjustering i sak KOE-17');
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      ],
    });
    expect(svaret.data.brevtittel).toBe('Svar på forholdet i sak KOE-17');
    const lest = lesJournal(s.journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtittel).toBe(
      'Svar på forholdet i sak KOE-17'
    );
  });

  // LV-U27: sakens kode står i brevtittelen, og saken omtales «i sak KOE-17» (LV-U44, svaret på Q1).
  it('tittelen har sakens kode uten utfylling, og leseren forstår den (LV-U27, LV-U44)', () => {
    const s = sak(TITTEL, { kode: 'koe', loepenummer: 5 });
    const rad = s.send('TE', PAABEROPELSE);
    expect(rad.data.brevtittel).toBe('Påberopelse av irregulær endring i sak KOE-5');
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      ],
    });
    expect(svaret.data.brevtittel).toBe('Svar på forholdet i sak KOE-5');
    expect(lesJournal(s.journal, KJERNE.leserformat).map((h) => h.art)).not.toContain('ukjent');
  });

  it('en endringsordresak omtales med EO og løpenummeret (LV-U44)', () => {
    const s = sak(TITTEL, { kode: 'eo', loepenummer: 12 });
    expect(s.send('TE', PAABEROPELSE).data.brevtittel).toBe(
      'Påberopelse av irregulær endring i sak EO-12'
    );
  });

  // #1533, MM-U2: leseren avviser en tittel skrivingen ikke lager.
  const lestMed = (s: ReturnType<typeof sak>, rad: Journalrad, data: Data) =>
    lesJournal(
      [...s.journal.slice(0, -1), { ...rad, data: { ...rad.data, ...data } }],
      KJERNE.leserformat
    ).at(-1)!.art;

  it('en påberopelse med tittelen for et annet forhold er ikke forstått (#1533)', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    expect(lestMed(s, rad, {}), 'kontrollsak').toBe('dokument');
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av forsinkelse' })).toBe('ukjent');
    expect(lestMed(s, rad, { brevtittel: 'Krav om endring' })).toBe('ukjent');
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endringsordre' })).toBe(
      'ukjent'
    );
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring og forsinkelse' })).toBe(
      'ukjent'
    );
    expect(
      lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring i sak KOE-3 og forsinkelse' })
    ).toBe('ukjent');
    // Leseren kjenner igjen formen fra medSakskode, men ikke koden, som ikke står i journalen (DM-06).
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring i sak KOE-3' })).toBe(
      'dokument'
    );
  });

  it('et svar med tittelen for en påberopelse er ikke forstått (#1533)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      ],
    });
    expect(lestMed(s, rad, {}), 'kontrollsak').toBe('dokument');
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring' })).toBe('ukjent');
  });

  it('en brevtittel uten tekst fra appen er ikke forstått, og kontrollsaken med teksten er det', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    const uten = { ...rad, data: { ...rad.data, brevtekst: undefined } };
    delete uten.data.brevtekst;
    expect(lesJournal([...s.journal.slice(0, -1), rad], KJERNE.leserformat).at(-1)!.art).toBe(
      'dokument'
    );
    expect(lesJournal([...s.journal.slice(0, -1), uten], KJERNE.leserformat).at(-1)!.art).toBe(
      'ukjent'
    );
  });
});

/**
 * #698 punkt 1: formatet krever datoen pålegget ble mottatt der regelsettet sier at punkt 32.2
 * gjelder, og brevet skriver datosetningen etter setningen om punkt 32.2 (VS-U26). Snevrer et
 * regelsett inn punkt 32.2, må formatet følge med, ellers står datoen uten setningen.
 */
it('datoen pålegget ble mottatt følger varslingsplikten etter punkt 32.2 for hvert par i KATEGORIER (VS-U26, #698)', () => {
  const avvik = HOVEDKATEGORIER.flatMap((h) =>
    (KATEGORIER[h] as readonly string[])
      .filter(
        (u) =>
          (oppgittDato(h, u) === 'paalegg_mottatt') !==
          GJELDENDE_REGLER.gjelderVarslingsplikten(h, u)
      )
      .map((u) => `${h}/${u}`)
  );
  expect(avvik).toEqual([]);
});

describe('brevets nummer i saken (LV-U44, LV-U45, N3 i #1497)', () => {
  it('løsningens brev får nummeret etter det høyeste i saken', () => {
    const s = sak();
    expect(s.send('TE', PAABEROPELSE).data.brevnummer).toBe(1);
    const neste = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(1000),
    });
    expect(neste.data.brevnummer).toBe(2);
    const lest = lesJournal(s.journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.brevnummer).toBe(2);
  });

  // LV-U45: avsenderens eget nummer telles, og et nummer kan stå to ganger.
  it('et høyere nummer i journalen gir det neste, og to brev kan ha samme nummer', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    Object.assign(s.journal.at(-1)!.data, { brevnummer: 5, merking: 'K201-KOE-017-05' });
    const neste = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(1000),
    });
    expect(neste.data.brevnummer).toBe(6);
    Object.assign(s.journal.at(-1)!.data, { brevnummer: 5, merking: 'K201-KOE-017-05' });
    expect(lesJournal(s.journal, KJERNE.leserformat).every((h) => h.art !== 'ukjent')).toBe(true);
  });

  it('et brevnummer som ikke er et positivt heltall, er ikke forstått', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    const med = (brevnummer: unknown) =>
      lesJournal(
        [...s.journal.slice(0, -1), { ...rad, data: { ...rad.data, brevnummer } }],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(med(1), 'kontrollsak').toBe('dokument');
    expect(med(0)).toBe('ukjent');
    expect(med(1.5)).toBe('ukjent');
  });
});

describe('henvisningen til et tidligere brev (LV-U42, LV-U53, S3 i #1497)', () => {
  /** TEs trekk av vederlagskravet i en sak der det er sendt etter påberopelsen og en e-post. */
  const trekkEtterEpost = (s: ReturnType<typeof sak>) => {
    s.send('TE', PAABEROPELSE);
    // Registrert korrespondanse får ikke noe nummer i saken (LV-U45).
    s.send('TE', {
      type: 'registrert_brev',
      sendt: '2026-10-02',
      korrespondansetype: 'e_post',
      beskrivelse: 'Referat fra byggemøte',
      dokumentasjon: [randomUUID()],
    });
    const krav = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(1000),
    });
    expect(krav.versjon, 'forutsetning: versjonen er ikke nummeret').toBe(4);
    expect(krav.data.brevnummer).toBe(2);
    return { type: 'trekk', spor: 'vederlag' };
  };

  it('et brev fra løsningen omtales med merkingen og datoen, ikke saksversjonen (LV-U53)', () => {
    const s = sak();
    const trekk = s.send('TE', trekkEtterEpost(s));
    expect(tekst(trekk)[0].laast).toContain(
      'TE trekker kravet om justering av vederlaget i sak KOE-17 («Endret fundamentering»), fremsatt i brev K201-KOE-017-02 av 4. oktober 2026'
    );
  });

  it('merkingen i henvisningen har sakens kode og tre sifre i løpenummeret, også i en EO-sak (LV-U53, LV-U48)', () => {
    const s = sak(TITTEL, { kode: 'eo', loepenummer: 5 }, 'K7');
    expect(s.vis('TE', trekkEtterEpost(s))?.[0]).toContain(
      'fremsatt i brev K7-EO-005-02 av 4. oktober 2026'
    );
  });

  it('uten kontraktsforkortelsen kan brevet ikke vise til merkingen, og skrives ikke (LV-U53)', () => {
    const s = sak(TITTEL, KOE_17, null);
    const trekk = trekkEtterEpost(s);
    expect(() => s.vis('TE', trekk)).toThrow(/ingen kontraktsforkortelse/);
  });

  it('henvisningen beholder merkingen fra brevet når kontraktsforkortelsen er endret etterpå (LV-U53, LV-U24)', () => {
    const s = sak();
    const trekk = trekkEtterEpost(s);
    expect(s.journal.at(-1)!.data.merking, 'kravet ble merket da det ble skrevet').toBe(
      'K201-KOE-017-02'
    );
    s.endreForkortelse('K305');
    const sendt = s.send('TE', trekk);
    expect(tekst(sendt)[0].laast).toContain('fremsatt i brev K201-KOE-017-02 av 4. oktober 2026');
    expect(sendt.data.merking, 'det nye brevet merkes med forkortelsen nå').toBe('K305-KOE-017-03');
  });

  it('en merking som ikke slutter med brevnummeret, eller står uten nummeret, er ikke forstått (LV-U53, LV-U48, MM-U2)', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    expect(rad.data.merking).toBe('K201-KOE-017-01');
    const med = (data: Data) =>
      lesJournal(
        [...s.journal.slice(0, -1), { ...rad, data: { ...rad.data, ...data } }],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(med({}), 'kontrollsak').toBe('dokument');
    expect(med({ merking: 'K201-KOE-017-02' })).toBe('ukjent');
    expect(med({ brevnummer: undefined })).toBe('ukjent');
  });

  it('registrert korrespondanse omtales med parten, typen og datoen (LV-U42)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = (korrespondansetype: string, sendt: string) =>
      s.send('TE', {
        type: 'varsel',
        spor: 'frist',
        hjemmel: '33.4',
        sendt,
        korrespondansetype,
        dokumentasjon: [randomUUID()],
      });
    const epost = varselet('e_post', '2026-10-02');
    expect(epost.data.korrespondansetype).toBe('e_post');
    const innsigelse = (rad: Journalrad) =>
      s
        .vis('BH', {
          type: 'innsigelse',
          gjelder: (rad.data.utsagn as Data[])[0].id,
        })
        ?.join('\n');
    expect(
      s.avvisning('BH', { type: 'innsigelse', gjelder: (epost.data.utsagn as Data[])[0].id })
    ).toBeNull();
    expect(innsigelse(epost)).toContain('i totalentreprenørens e-post av 2. oktober 2026');
  });

  it('registrert korrespondanse uten typen, og typen i et brev fra løsningen, er ikke forstått (LV-U42)', () => {
    const s = sak();
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
    });
    expect(s.u().forstaatt).toBe(false);
    const t = sak();
    t.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
      korrespondansetype: 'brev',
    });
    expect(t.u().forstaatt).toBe(false);
  });

  it('registreringen må oppgi typen (LV-U42, D1 A i #1497)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(
      s.avvisning('TE', {
        type: 'varsel',
        spor: 'vederlag',
        hjemmel: '34.1.2',
        sendt: '2026-10-02',
        dokumentasjon: [randomUUID()],
      })?.melding
    ).toContain('$.korrespondansetype');
  });
});

/**
 * Kravpostene i vederlagskravet (#1663). Kildene: OV-U95 punkt 19–22, KA-U53 (betegnelsen),
 * KA-U56 (en ny versjon tar med eller trekker hver kravpost), KA-U61 og KA-U66 (tilbud og
 * beregningsregel), VS-U48 (kravposten er varselet etter punkt 34.3.3 eller 34.4 når et slikt
 * varsel ikke er sendt før), KA-U70 (en trukket kravpost tas ikke opp igjen, og betegnelsen
 * brukes ikke igjen) og arbeidsvalget 07.11 i domenetabellen (formatet). Brev 3 i `sakMedKrav` har P1 med fast sum 125 000 kr.
 */
describe('kravpostene i vederlagskravet (OV-U95 punkt 19–22, KA-U53, KA-U56, #1663)', () => {
  const krav = (kravposter: Data[], rest: Data = {}) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter, ...rest },
  });
  const post1 = { betegnelse: 'P1', beskrivelse: 'Ny fundamentering', oppgjoersform: 'tilbud' };
  const regning = { beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' };
  const justert = { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true };
  const poster = (s: ReturnType<typeof sakMedKrav>) =>
    kravposterI(s.u().spor.vederlag.gjeldendeKrav!).map((p) => [p.betegnelse, p.id]);

  it('en ny kravpost får neste betegnelse, og en kravpost fra forrige versjon beholder id og betegnelse (KA-U53)', () => {
    const s = sakMedKrav();
    const [[, p1]] = poster(s);
    s.send('TE', krav([{ ...post1, beloep: 130000 }, regning]));
    expect(poster(s)).toEqual([
      ['P1', p1],
      ['P2', expect.any(String)],
    ]);
  });

  it('en ny versjon som verken tar med eller trekker P1, avvises (KA-U56)', () => {
    const s = sakMedKrav();
    expect(s.avvisning('TE', krav([regning]))).toEqual({
      regel: 'KRAVPOSTENE',
      melding: 'Kravversjonen mangler P1 uten at den er trukket (KA-U56).',
    });
    expect(s.avvist('TE', krav([regning], { trekker: [p1I(s)] })), 'kontrollsak').toBeNull();
  });

  it('en trukket kravpost tas ikke opp igjen, og betegnelsen brukes ikke igjen (KA-U70)', () => {
    const s = sakMedKrav();
    const p1 = p1I(s);
    s.send('TE', krav([regning], { trekker: [p1] }));
    expect(poster(s).map(([b]) => b)).toEqual(['P2']);
    const igjen = krav([
      { ...regning, betegnelse: 'P2' },
      { ...post1, id: p1, beloep: 1000 },
    ]);
    expect(s.avvist('TE', igjen)).toBe('KRAVPOSTENE');
    s.send(
      'TE',
      krav([
        { ...regning, betegnelse: 'P2' },
        { ...post1, beloep: 1000 },
      ])
    );
    expect(poster(s).map(([b]) => b)).toEqual(['P2', 'P3']);
    // P3 trekkes, og den neste nye kravposten får P4, selv om forrige versjon bare har P2.
    const p3 = poster(s)[1]![1]!;
    s.send('TE', krav([{ ...regning, betegnelse: 'P2' }], { trekker: [p3] }));
    s.send('TE', krav([{ ...regning, betegnelse: 'P2' }, justert]));
    expect(poster(s).map(([b]) => b)).toEqual(['P2', 'P4']);
  });

  it('et trekk må gjelde en kravpost i forrige versjon, og en kravpost kan ikke både tas med og trekkes (KA-U56)', () => {
    const s = sakMedKrav();
    const p1 = p1I(s);
    expect(s.avvist('TE', krav([{ ...post1, beloep: 1 }], { trekker: [randomUUID()] }))).toBe(
      'KRAVPOSTENE'
    );
    expect(s.avvist('TE', krav([{ ...post1, beloep: 1 }], { trekker: [p1] }))).toBe('KRAVPOSTENE');
  });

  it('samme kravpost kan ikke trekkes to ganger i én kravversjon (KA-U56)', () => {
    const s = sakMedKrav();
    const p1 = p1I(s);
    expect(s.avvist('TE', krav([regning], { trekker: [p1] })), 'kontrollsak').toBeNull();
    expect(s.avvist('TE', krav([regning], { trekker: [p1, p1] }))).toBe('KRAVPOSTENE');
  });

  it('en lagret kravversjon som gir P1 en annen betegnelse, gjør saken ikke forstått (MM-U2)', () => {
    const s = sakMedKrav();
    s.send('TE', krav([{ ...post1, beloep: 130000 }]));
    const lagret = s.journal
      .flatMap((r) => ((r.data as { krav?: Data[] }).krav ?? []) as Data[])
      .find((k) => k.id === s.krav('vederlag'))!;
    const p1 = (lagret.kravposter as Data[])[0]!;
    const brev = {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    };
    expect(s.avvist('BH', brev), 'kontrollsak').toBeNull();
    p1.betegnelse = 'P7';
    expect(s.avvist('BH', brev)).toBe('SAK_IKKE_FORSTAATT');
  });

  it('kravposten med regningsarbeid eller justerte enhetspriser er varselet i den første versjonen den står i, ikke i den neste (VS-U48)', () => {
    const s = sakMedKrav();
    const foerste = laast(
      s.send('TE', krav([{ ...post1, beloep: 125000 }, regning, justert]))
    ).join(' ');
    expect(foerste).toContain(
      'TE krever at P2 gjøres opp som regningsarbeid etter NS 8407 punkt 34.4 og punkt 30. Kravet er varsel før regningsarbeidet settes i gang (NS 8407 punkt 34.4).'
    );
    expect(foerste).toContain(
      'TE krever at P3 gjøres opp etter kontraktens enhetspriser, justert etter NS 8407 punkt 34.3.2. Kravet er varsel om justering av enhetsprisene etter NS 8407 punkt 34.3.3.'
    );
    // KA-U61: brevet sier hvilke poster som er tilbud, og at de andre ikke er det.
    expect(foerste).toContain(
      'Kravet for P1 er et tilbud etter NS 8407 punkt 34.2.1. P2 og P3 gjøres opp etter en beregningsregel, og kravet for dem er ikke et tilbud.'
    );
    const neste = laast(
      s.send(
        'TE',
        krav([
          { ...post1, beloep: 125000 },
          { ...regning, betegnelse: 'P2', kostnadsoverslag: 20000 },
          { ...justert, betegnelse: 'P3' },
        ])
      )
    ).join(' ');
    expect(neste).not.toContain('Kravet er varsel');
    expect(neste).toContain(
      `Kostnadsoverslaget er ${KR('20 000')} Overslaget er en opplysning og ikke et tilbud.`
    );
  });

  it('en kravpost som skifter til regningsarbeid eller justerte enhetspriser, er varselet i versjonen hun skifter i, men ikke når hun har hatt oppgjørsformen før (VS-U49)', () => {
    const s = sakMedKrav();
    const varselP1 =
      'P1 Ny fundamentering: TE krever at P1 gjøres opp som regningsarbeid etter NS 8407 punkt 34.4 og punkt 30. Kravet er varsel før regningsarbeidet settes i gang';
    const varselP2 =
      'TE krever at P2 gjøres opp som regningsarbeid etter NS 8407 punkt 34.4 og punkt 30. Kravet er varsel før regningsarbeidet settes i gang';
    // P1 hadde fast sum i første versjon og skifter til regningsarbeid; P2 er ny.
    const andre = laast(
      s.send(
        'TE',
        krav([{ ...regning, betegnelse: 'P1', beskrivelse: 'Ny fundamentering' }, regning])
      )
    ).join(' ');
    expect(andre).toContain(varselP1);
    expect(andre).toContain(varselP2);
    // P1 skifter tilbake til fast sum og så til regningsarbeid igjen: hun har hatt
    // oppgjørsformen før, så varselet dobles ikke.
    s.send(
      'TE',
      krav([
        { ...post1, beloep: 125000 },
        { ...regning, betegnelse: 'P2' },
      ])
    );
    const fjerde = laast(
      s.send(
        'TE',
        krav([
          { ...regning, betegnelse: 'P1', beskrivelse: 'Ny fundamentering' },
          { ...regning, betegnelse: 'P2' },
        ])
      )
    ).join(' ');
    expect(fjerde).toContain('P1 Ny fundamentering: TE krever at P1 gjøres opp som regningsarbeid');
    expect(fjerde).not.toContain('Kravet er varsel');
    // Enhetspriser uten justering i én versjon og med justering i den neste: varselet etter
    // punkt 34.3.3 står i versjonen der justeringen kreves.
    s.send(
      'TE',
      krav([
        { ...post1, beloep: 125000 },
        { ...regning, betegnelse: 'P2' },
        { ...justert, justert: false },
      ])
    );
    const sjette = laast(
      s.send(
        'TE',
        krav([
          { ...post1, beloep: 125000 },
          { ...regning, betegnelse: 'P2' },
          { ...justert, betegnelse: 'P3' },
        ])
      )
    ).join(' ');
    expect(sjette).toContain(
      'TE krever at P3 gjøres opp etter kontraktens enhetspriser, justert etter NS 8407 punkt 34.3.2. Kravet er varsel om justering av enhetsprisene etter NS 8407 punkt 34.3.3.'
    );
    expect(sjette).not.toContain('Kravet er varsel før regningsarbeidet');
  });

  it('enhetspriser uten justering er ikke et varsel etter punkt 34.3.3', () => {
    const s = sakMedKrav();
    const tekst = laast(
      s.send(
        'TE',
        krav([
          { ...post1, beloep: 125000 },
          { ...justert, justert: false },
        ])
      )
    ).join(' ');
    expect(tekst).toContain(
      'TE krever at P2 gjøres opp etter kontraktens enhetspriser etter NS 8407 punkt 34.3.1.'
    );
    expect(tekst).not.toContain('Kravet er varsel');
  });

  it('trekket av en kravpost står i brevet som avkall på kravet i posten (KA-U56)', () => {
    const s = sakMedKrav();
    const tekst = laast(s.send('TE', krav([regning], { trekker: [p1I(s)] }))).join(' ');
    expect(tekst).toContain(
      'TE trekker kravet i P1 Ny fundamentering, fremsatt i brev K201-KOE-017-02 av 3. oktober 2026. Trekket er avkall på kravet i kravposten, også det byggherren har godkjent.'
    );
  });

  it('byggherren kan ikke svare med ett beløp på et krav med flere kravposter før svaret per kravpost er bygget (KA-U59)', () => {
    const s = sakMedKrav();
    const svaret = () => ({
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    });
    expect(s.avvist('BH', svaret()), 'kontrollsak: bare P1 med fast sum').toBeNull();
    expect(handlinger(s.u(), 'BH'), 'kontrollsak').toContain('svare:vederlag');
    // To kravposter med fast sum: byggherren svarer per kravpost (KA-U59).
    s.send(
      'TE',
      krav([
        { ...post1, beloep: 125000 },
        { ...post1, betegnelse: 'P2', beloep: 5000 },
      ])
    );
    // Svaret tilbys ikke, så visningen åpner ikke et skjema kjernen ikke kan regne ut.
    expect(handlinger(s.u(), 'BH')).not.toContain('svare:vederlag');
    expect(s.avvist('BH', svaret())).toBe('SVAR_PER_KRAVPOST');
    // Én kravpost etter en beregningsregel.
    s.send(
      'TE',
      krav([{ ...regning, oppgjoersform: 'regningsarbeid' }], {
        trekker: poster(s).map(([, id]) => id),
      })
    );
    expect(handlinger(s.u(), 'BH')).not.toContain('svare:vederlag');
    expect(s.avvist('BH', svaret())).toBe('SVAR_PER_KRAVPOST');
  });
});

describe('varselet etter punkt 34.3.3 og 34.4 som står alene (VS-U48, VS-U52, VS-U55, D-16 i BF-14, #1663)', () => {
  const vederlagskrav = (kravposter: Data[]) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter },
  });
  const tilbudspost = { betegnelse: 'P1', beskrivelse: 'Graving', oppgjoersform: 'tilbud' };
  const regning = { beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' };
  const justert = { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true };
  const sendVarsel = (hjemmel: '34.3.3' | '34.4') => ({
    type: 'send_varsel',
    spor: 'vederlag',
    hjemmel,
  });
  const registrertVarsel = (hjemmel: string) => ({
    type: 'varsel',
    korrespondansetype: 'e_post',
    spor: 'vederlag',
    hjemmel,
    sendt: '2026-09-28',
    dokumentasjon: [randomUUID()],
  });
  const varselRegning = 'Kravet er varsel før regningsarbeidet settes i gang';
  const varselEnhetspriser = 'Kravet er varsel om justering av enhetsprisene';
  const paaberopt = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    return s;
  };

  // Ordlyden er design etter VS-U48 (#1663); at varselet kan sendes alene, er VS-U48.
  it('TE sender varselet etter punkt 34.4 og etter punkt 34.3.3 fra løsningen uten krav (VS-U48)', () => {
    const s = paaberopt();
    expect(laast(s.send('TE', sendVarsel('34.4')))).toEqual([
      `TE varsler etter NS 8407 punkt 34.4 at TE vil kreve oppgjør som regningsarbeid som følge av forholdet ${I_SAKEN}.`,
    ]);
    expect(laast(s.send('TE', sendVarsel('34.3.3')))).toEqual([
      `TE varsler etter NS 8407 punkt 34.3.3 første ledd at TE vil kreve justering av enhetsprisene som følge av forholdet ${I_SAKEN}.`,
    ]);
    expect(s.u().spor.vederlag.kravpostvarsler.map((v) => v.hjemmel)).toEqual(['34.4', '34.3.3']);
    expect(s.u().spor.vederlag.varsler, 'ikke et varsel etter SK-12').toEqual({});
  });

  it('saken kan ha flere varsler etter punkt 34.3.3 og 34.4, sendt og registrert, før og etter kravet, men fortsatt bare ett etter punkt 34.1.3 (VS-U48, VS-U52, SK-12)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.4'));
    s.send('TE', registrertVarsel('34.4'));
    s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }]));
    expect(handlinger(s.u(), 'TE')).toEqual(
      expect.arrayContaining([
        'varsle:34.3.3',
        'varsle:34.4',
        'sende_varsel:34.3.3',
        'sende_varsel:34.4',
      ])
    );
    s.send('TE', sendVarsel('34.4'));
    s.send('TE', registrertVarsel('34.3.3'));
    expect(s.u().spor.vederlag.kravpostvarsler.map((v) => v.hjemmel)).toEqual([
      '34.4',
      '34.4',
      '34.4',
      '34.3.3',
    ]);
    // Kontrollsak: SK-12 gjelder fortsatt varselet etter punkt 34.1.3.
    s.send('TE', registrertVarsel('34.1.3'));
    expect(s.avvist('TE', registrertVarsel('34.1.3'))).toBe('VARSEL_REGISTRERT');
  });

  it('et varsel etter punkt 34.4 står ikke i fristen (OV-U5)', () => {
    const s = paaberopt();
    expect(s.avvist('TE', { ...sendVarsel('34.4'), spor: 'frist' })).not.toBeNull();
  });

  it('et varsel sendt før det første kravet gjelder kravpostene med den beregningsregelen, og kravet viser til det i stedet for å være varselet (D-16, VS-U55)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.4'));
    const tekst = laast(
      s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }, regning, justert]))
    ).join(' ');
    expect(tekst).toContain(
      'TE krever at P2 gjøres opp som regningsarbeid etter NS 8407 punkt 34.4 og punkt 30.'
    );
    expect(tekst).not.toContain(varselRegning);
    expect(tekst).toContain(
      'Varselet før regningsarbeidet settes i gang (NS 8407 punkt 34.4) ble gitt i brev K201-KOE-017-02 av 3. oktober 2026.'
    );
    // Varselet etter punkt 34.4 gjelder ikke justeringen av enhetsprisene.
    expect(tekst).toContain(varselEnhetspriser);
  });

  it('et varsel registrert før det første kravet gjelder på samme måte, og kravet viser til korrespondansen (D-16, VS-U52, VS-U55)', () => {
    const s = paaberopt();
    s.send('TE', registrertVarsel('34.3.3'));
    const tekst = laast(s.send('TE', vederlagskrav([regning, justert]))).join(' ');
    expect(tekst).not.toContain(varselEnhetspriser);
    expect(tekst).toContain(
      'Varselet om justering av enhetsprisene etter NS 8407 punkt 34.3.3 ble gitt i totalentreprenørens e-post av 28. september 2026.'
    );
    expect(tekst).toContain(varselRegning);
  });

  it('et varsel etter det første kravet gjelder ikke en ny kravpost uten valget i VS-U50, så kravet er varselet for den (VS-U49, D-19)', () => {
    const s = paaberopt();
    s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }]));
    s.send('TE', sendVarsel('34.4'));
    const tekst = laast(
      s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }, regning]))
    ).join(' ');
    expect(tekst).toContain(varselRegning);
  });

  it('byggherrens innsigelse mot varselet etter punkt 34.3.3 eller 34.4 venter på økt 2, mens innsigelsen mot varselet etter punkt 34.1.3 godtas (G-9 i BF-14)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.3.3'));
    s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.3' });
    const u = s.u();
    const varsel = u.spor.vederlag.kravpostvarsler[0]!.id;
    expect(handlinger(u, 'BH')).not.toContain(`innsigelse:${varsel}`);
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: varsel })).toBe('IKKE_I_FOERSTE_VERSJON');
    const kontroll = u.spor.vederlag.varsler['34.1.3']!.id;
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: kontroll }), 'kontrollsak').toBeNull();
  });
});
