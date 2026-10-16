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
import { gjengi, gjengirTro, lagBrevtekst, norskDato } from '../frosset/brevtekst.ts';
import { kroner, regnUtSvar } from '../frosset/standpunkt.ts';
import { lesJournal, registrertDato } from '../format/leser.ts';
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
import type { Avsnitt, Dokument, Journalrad, Part } from '../typer.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { enighetensVirkning, kanInngaaIEo, kraveneErAvgjort } from '../utledning/utled.ts';
import { visning } from '../utledning/visning.ts';
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
function sak() {
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
      data: { sakstittel: TITTEL, sakstype: 'standard' },
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
  const prov = (part: Part, kommando: Data): Utfall => {
    const k = structuredClone(kommando);
    try {
      if (!('brevtekst' in k)) {
        const vist = forhaandsvis(structuredClone(k), kontekst(part), journal, KJERNE);
        const t = vist.godtatt ? laastTekst(vist.hendelser[0]) : null;
        if (t) k.brevtekst = t;
      }
      return vurder(k, kontekst(part), journal, KJERNE);
    } catch (feil) {
      // 7.1.2 i designnotatet: kjernen skal forstå det den selv skriver.
      if (feil instanceof Skrivefeil) throw new AssertionError({ message: feil.message });
      throw feil;
    }
  };
  const send = (part: Part, kommando: Data): Journalrad => {
    const utfall = prov(part, kommando);
    if (!utfall.godtatt) throw new Error(`Forutsetning: ${JSON.stringify(utfall.avvisning)}`);
    dag++;
    journal.push(...utfall.hendelser);
    return utfall.hendelser[0];
  };
  /** Den låste teksten forhåndsvisningen gir, eller `null` når den avvises (A1). */
  const vis = (part: Part, kommando: Data): string[] | null => {
    try {
      const vist = forhaandsvis(structuredClone(kommando), kontekst(part), journal, KJERNE);
      return vist.godtatt ? laastTekst(vist.hendelser[0]) : null;
    } catch (feil) {
      if (feil instanceof Skrivefeil) throw new AssertionError({ message: feil.message });
      throw feil;
    }
  };
  /** Avvisningen kommandoen får, eller `null` når den godtas. */
  const avvisning = (part: Part, kommando: Data) => {
    const u = prov(part, kommando);
    return u.godtatt ? null : u.avvisning;
  };
  const avvist = (part: Part, kommando: Data) => avvisning(part, kommando)?.regel ?? null;
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
  const krav = (spor: 'grunnlag' | 'vederlag' | 'frist') => u().spor[spor].gjeldendeKrav!.id;
  return { journal, send, vis, avvisning, avvist, rad, u, krav };
}

const tekst = (rad: Journalrad): Avsnitt[] => {
  expect(rad.data.brevtekst, 'brevet fra appen har brevtekst (LV-U2)').toBeDefined();
  return rad.data.brevtekst as Avsnitt[];
};
const laast = (rad: Journalrad) => tekst(rad).map((a) => a.laast);

const BESKRIVELSE = 'Byggherren har pålagt en annen fundamentering.';

const GRUNNLAGSKRAV = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: { hovedkategori: 'endring', underkategori: 'irregulaer_endring', tittel: 'Ny peling' },
  utdypning: BESKRIVELSE,
};

const FRISTKRAV = {
  type: 'krav',
  spor: 'frist',
  innhold: { dager: 20 },
  varsel: { sendt: '2026-09-28' },
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
        laast: `TE krever endringsordre for forholdet «Ny peling» ${I_SAKEN}. Grunnlaget er irregulær endring i form av pålegg (NS 8407 § 32.1). TE varsler etter NS 8407 § 32.2 at TE påberoper seg at pålegget innebærer en endring.`,
        // A8: TEs beskrivelse er kravets utdypning og står bare der, ikke i kravet.
        utdypning: BESKRIVELSE,
      },
    ]);
    expect((rad.data.krav as Data[])[0]).not.toHaveProperty('beskrivelse');
  });

  it('uten tittel', () => {
    const rad = grunnlag({ hovedkategori: 'endring', underkategori: 'samordning' }, BESKRIVELSE);
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
    });
    expect(laast(rad)).toEqual([
      `TE gjør gjeldende krav som følge av uforutsette grunnforhold (NS 8407 § 23.1, jf. § 33.1 b og § 34.1.2) for forholdet «Leire» ${I_SAKEN}.`,
    ]);
  });

  it('annet forhold etter § 33.1 c nevner ikke bestemmelsen to ganger', () => {
    const rad = grunnlag({ hovedkategori: 'andre_forhold', underkategori: 'annet_forhold' });
    expect(laast(rad)).toEqual([
      `TE gjør gjeldende krav som følge av annet forhold (NS 8407 § 33.1 c og § 34.1.2) for forholdet ${I_SAKEN}.`,
    ]);
  });

  it('vederlaget er et tilbud uten merverdiavgift, og fristkravet har datoen for varselet', () => {
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
    ]);
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
        innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold' },
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
      innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', tittel: 'Sene tegninger' },
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
    expect(vederlagssvar(false)).toBe(
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Prinsipalt: byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 kom for sent. ${METODE_JA} Subsidiært: byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
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
    expect(laast(rad)[1]).toBe(
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Prinsipalt: byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 kom for sent. Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget skal justeres som regningsarbeid (NS 8407 § 34.4). Subsidiært: byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
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
    expect(vederlagssvar(true)).toBe(
      `Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober 2026: Byggherren gjør ikke gjeldende at varselet om vederlagsjustering etter NS 8407 § 34.1.2 kom for sent. ${METODE_JA} Byggherren godkjenner ${KR('100 000')} av de krevde ${KR('125 000')}`
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
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold' },
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

  it('et registrert krav siteres ikke, men godkjenningen viser til pålegget i det (GR-U13, GR-U14, oppdragsgiver 11.10)', () => {
    const s = sak();
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
    const godkjent = {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    };
    expect(s.avvist('BH', godkjent)).toBeNull();
    const rad = s.send('BH', godkjent);
    expect(laast(rad)[0]).toMatch(
      /byggherren krever at endringen utføres slik pålegget er beskrevet i TEs krav i brev 2 av 30\. september 2026\.$/
    );
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
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold' },
    };

    /**
     * Skiftet mellom svikt og endring kan ikke lenger sendes fra appen (GR-U19), så det
     * står som en registrert kravversjon fra TE, og lesingen av den prøves (MM-U18).
     */
    const skifte = (s: ReturnType<typeof sak>, kommando: { innhold: Data }) => {
      expect(s.avvist('TE', kommando)).toBe('ANNEN_HOVEDKATEGORI');
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
        opplysninger: [
          { id: randomUUID(), hva: 'sendt', dato: s.journal.at(-1)!.tidsstempel.slice(0, 10) },
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
  });

  it('protesten mot innsigelsen, mot påberopelsen i et svar og mot alle innsigelsene i et brev', () => {
    const s = medInnsigelse();
    const innsigelse = s.journal.at(-1)!;
    const id = (innsigelse.data.utsagn as Data[])[0].id as string;
    expect(laast(s.send('TE', { type: 'protest', gjelder: id }))).toEqual([
      'TE protesterer mot innsigelsen i brev 5 av 5. oktober 2026.',
    ]);
    expect(laast(s.send('TE', { type: 'protest', gjelder: innsigelse.event_id }))).toEqual([
      'TE protesterer mot innsigelsene i brev 5 av 5. oktober 2026.',
    ]);
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    const rettidighet = ((svaret.data.svar as Data[])[0].standpunkter as Data[])[0].id as string;
    expect(laast(s.send('TE', { type: 'protest', gjelder: rettidighet }))).toEqual([
      'TE protesterer mot påberopelsen av for sen varsling i svaret i brev 8 av 8. oktober 2026.',
    ]);
  });

  it('passiviteten (VS-U12)', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'passivitet', gjelder: s.krav('grunnlag') });
    expect(laast(rad)).toEqual([
      'TE gjør gjeldende at byggherren ikke svarte uten ugrunnet opphold på TEs varsel etter NS 8407 § 32.2 i brev 2 av 2. oktober 2026, og at pålegget derfor anses å innebære en endring (NS 8407 § 32.3 annet ledd).',
    ]);
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

  it('bestridelsen av datoen og av opplysningen om § 31.3', () => {
    const { s, opplysning } = medRegistrertSvar([
      { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
    ]);
    expect(
      laast(s.send('TE', { type: 'bestridelse', gjelder: opplysning('sendt'), hva: 'sendt' }))
    ).toEqual([
      'TE bestrider opplysningen i brev 3 av 3. oktober 2026 om at brevet ble sendt 3. oktober 2026.',
    ]);
    expect(
      laast(
        s.send('TE', {
          type: 'bestridelse',
          gjelder: opplysning('endringsordre'),
          hva: 'endringsordre',
        })
      )
    ).toEqual([
      'TE bestrider opplysningen i brev 3 av 3. oktober 2026 om at brevet var en endringsordre etter NS 8407 § 31.3.',
    ]);
  });

  it('bestridelsen av datoen for et varsel etter § 33.4', () => {
    const s = sakMedKrav();
    const varsel = (s.journal.at(-1)!.data.opplysninger as Data[])[0].id as string;
    expect(laast(s.send('BH', { type: 'bestridelse', gjelder: varsel, hva: 'sendt' }))).toEqual([
      'Byggherren bestrider opplysningen i brev 4 av 4. oktober 2026 om at varselet etter NS 8407 § 33.4 i brevet ble sendt 28. september 2026.',
    ]);
  });

  it('merkingen av et registrert brev og avklaringen av den', () => {
    const { s, rad } = medRegistrertSvar();
    expect(
      laast(s.send('BH', { type: 'merking', gjelder: rad.event_id, spor: ['grunnlag', 'frist'] }))
    ).toEqual([
      'Byggherren opplyser at brev 3 av 3. oktober 2026 har et forbehold eller annet innhold som ikke er uttrykt i appen, og som gjelder grunnlaget og fristen.',
    ]);
    const merking = (s.journal.at(-1)!.data.opplysninger as Data[])[0].id as string;
    expect(laast(s.send('BH', { type: 'avklaring', gjelder: merking }))).toEqual([
      'Byggherren bekrefter at standpunktene i brev 3 av 3. oktober 2026 om grunnlaget og fristen gjelder uten forbehold fra og med dette brevet.',
    ]);
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

  it.each([
    ['grunnlaget', 0, 'grunnlaget'],
    ['vederlaget', 1, 'kravet om justering av vederlaget'],
    ['fristen', 2, 'kravet om fristforlengelse'],
  ] as const)('brevet begrunner svaret på %s, med byggherrens tekst under', (_n, i, gjelder) => {
    const { s, brev } = medSvar();
    const tekst = 'Grunnen er at pålegget lå innenfor kontrakten.';
    const rad = s.send('BH', { type: 'begrunnelse', gjelder: svarId(brev, i), utdypning: tekst });
    // KA-U34, ordrett.
    expect(rad.data.brevtekst).toEqual([
      {
        gjelder: (rad.data.utsagn as Data[])[0].id,
        laast: `Byggherren begrunner sitt svar på ${gjelder} i brev 5 av 5. oktober 2026:`,
        utdypning: tekst,
      },
    ]);
  });

  it('begrunnelsen endrer ingen standpunkter, og et senere svar på samme krav avvises fortsatt', () => {
    const { s, brev } = medSvar();
    const foer = s.u();
    s.send('BH', { type: 'begrunnelse', gjelder: svarId(brev), utdypning: BEGRUNNELSE });
    const etter = s.u();
    expect(etter.spor).toEqual(foer.spor);
    expect(etter.svar).toEqual(foer.svar);
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [svar('grunnlag', s.krav('grunnlag'), grunnlagAvslaatt)],
      })
    ).toBe('ALLEREDE_SVART');
  });

  it('godtas når kravene er avgjort, mens en revisjon avvises (KA-U11)', () => {
    const s = sakMedKrav();
    const brev = s.send('BH', {
      type: 'brev',
      svar: [
        svar('grunnlag', s.krav('grunnlag'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'godkjent',
            hovedkrav_godkjent_belop: 125000,
            aksepterer_metode: true,
          },
          { resultat: 'godkjent', godkjent_beloep: 125000 }
        ),
        svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1]),
      ],
    });
    expect(
      s.avvist('BH', {
        type: 'revisjon',
        erstatter: svarId(brev, 2),
        svar: svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1]),
      })
    ).toBe('KRAVENE_AVGJORT');
    expect(
      s.avvist('BH', { type: 'begrunnelse', gjelder: svarId(brev, 2), utdypning: BEGRUNNELSE })
    ).toBeNull();
  });

  it('godtas når kravet i sporet er trukket og når partene er enige om at grunnlaget er avvist', () => {
    const { s, brev } = medSvar();
    s.send('TE', { type: 'trekk', spor: 'frist' });
    expect(
      s.avvist('BH', { type: 'begrunnelse', gjelder: svarId(brev, 2), utdypning: BEGRUNNELSE })
    ).toBeNull();
    s.send('TE', {
      type: 'aksept',
      spor: 'grunnlag',
      svar: svarId(brev),
      regelversjon: KJERNE.regler.versjon,
    });
    expect(s.u().grunnlagAvvist, 'forutsetning: SK-01').toBe(true);
    expect(
      s.avvist('BH', { type: 'begrunnelse', gjelder: svarId(brev), utdypning: BEGRUNNELSE })
    ).toBeNull();
  });

  it('et svar som er erstattet av en revisjon, og et registrert svar kan begrunnes', () => {
    const { s, brev } = medSvar();
    s.send('BH', {
      type: 'revisjon',
      erstatter: svarId(brev, 1),
      svar: svar(
        'vederlag',
        s.krav('vederlag'),
        { ...VEDERLAG_DELVIS[0], hovedkrav_godkjent_belop: 110000 },
        { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
      ),
    });
    const rad = s.send('BH', {
      type: 'begrunnelse',
      gjelder: svarId(brev, 1),
      utdypning: BEGRUNNELSE,
    });
    expect(laast(rad)).toEqual([
      'Byggherren begrunner sitt svar på kravet om justering av vederlaget i brev 5 av 5. oktober 2026:',
    ]);

    const t = sak();
    t.send('TE', GRUNNLAGSKRAV);
    const registrert = t.rad('BH', {
      svar: [
        {
          id: randomUUID(),
          spor: 'grunnlag',
          gjelder: t.krav('grunnlag'),
          standpunkter: [{ id: randomUUID(), art: 'grunnlag', resultat: 'avslaatt' }],
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
    });
    // KA-U18: et registrert brev kan stå uten begrunnelse, og den kan komme senere.
    expect(
      laast(
        t.send('BH', { type: 'begrunnelse', gjelder: svarId(registrert), utdypning: BEGRUNNELSE })
      )
    ).toEqual(['Byggherren begrunner sitt svar på grunnlaget i brev 3 av 30. september 2026:']);
  });

  it('en begrunnelse sendt utenfor appen registreres uten tekst, med brevet som vedlegg (KA-U35)', () => {
    const { s, brev } = medSvar();
    const foer = s.u();
    const vedlegg = randomUUID();
    const rad = s.send('BH', {
      type: 'begrunnelse',
      gjelder: svarId(brev),
      sendt: '2026-10-06',
      dokumentasjon: [vedlegg],
    });
    expect(
      rad.data.brevtekst,
      'et registrert brev har ingen tekst fra appen (MM-U17)'
    ).toBeUndefined();
    expect(rad.data.utsagn).toEqual([
      { id: expect.any(String), art: 'begrunnelse', gjelder: svarId(brev) },
    ]);
    expect(rad.data.opplysninger).toEqual([
      { id: expect.any(String), hva: 'sendt', dato: '2026-10-06' },
    ]);
    expect(rad.data.dokumentasjon).toEqual([vedlegg]);
    const etter = s.u();
    expect(etter.forstaatt).toBe(true);
    expect(etter.spor).toEqual(foer.spor);
  });

  describe('en registrert begrunnelse kan ikke være sendt før svaret (KA-U36)', () => {
    const registrert = (gjelder: string, sendt: string) => ({
      type: 'begrunnelse',
      gjelder,
      sendt,
      dokumentasjon: [randomUUID()],
    });
    /** Et registrert grunnlagssvar med opplysningene; grunnlagskravet er brev 2. */
    const registrertSvar = (...opplysninger: Data[]) => {
      const s = sak();
      s.send('TE', GRUNNLAGSKRAV);
      const svaret = s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'grunnlag',
            gjelder: s.krav('grunnlag'),
            standpunkter: [{ id: randomUUID(), art: 'grunnlag', resultat: 'avslaatt' }],
          },
        ],
        opplysninger,
      });
      return { s, svaret: svarId(svaret) };
    };

    it('før datoen appen registrerte svaret, avvises den, og samme dato godtas (KA-U37)', () => {
      const { s, brev } = medSvar();
      expect(brev.tidsstempel, 'forutsetning').toBe('2026-10-05T10:00:00.000Z');
      expect(s.avvist('BH', registrert(svarId(brev), '2026-10-05')), 'kontrollsak').toBeNull();
      expect(s.avvisning('BH', registrert(svarId(brev), '2026-10-04'))).toEqual({
        regel: 'BEGRUNNELSE_FOER_SVARET',
        melding:
          'Begrunnelsen er oppgitt sendt 4. oktober 2026, men svaret den begrunner, ble sendt 5. oktober 2026.',
      });
    });

    it('datoen for svaret fra appen er i norsk tid, som i brevet (KA-U37)', () => {
      const { s, brev } = medSvar();
      // 22.30 UTC 4. oktober er 00.30 i Oslo 5. oktober.
      brev.tidsstempel = '2026-10-04T22:30:00.000Z';
      expect(s.avvist('BH', registrert(svarId(brev), '2026-10-05')), 'kontrollsak').toBeNull();
      expect(s.avvist('BH', registrert(svarId(brev), '2026-10-04'))).toBe(
        'BEGRUNNELSE_FOER_SVARET'
      );
      expect(registrertDato({ registrert: '2026-10-04T21:59:59.000Z' })).toBe('2026-10-04');
      expect(registrertDato({ registrert: '2026-10-04T22:00:00.000Z' })).toBe('2026-10-05');
    });

    it('for et registrert svar gjelder datoen det ble sendt, ikke den første datoen (KA-U38)', () => {
      const { s, svaret } = registrertSvar(
        { id: randomUUID(), hva: 'mottatt', dato: '2026-09-20' },
        { id: randomUUID(), hva: 'sendt', dato: '2026-09-18' }
      );
      expect(s.avvist('BH', registrert(svaret, '2026-09-18')), 'kontrollsak').toBeNull();
      expect(s.avvist('BH', registrert(svaret, '2026-09-17'))).toBe('BEGRUNNELSE_FOER_SVARET');
    });

    it('et registrert svar med bare mottatt-dato gir ingen kontroll (KA-U38)', () => {
      const { s, svaret } = registrertSvar({
        id: randomUUID(),
        hva: 'mottatt',
        dato: '2026-09-20',
      });
      expect(s.avvist('BH', registrert(svaret, '2026-09-01'))).toBeNull();
    });

    it('en bestridelse av datoen på svaret endrer ikke kontrollen (KA-U39)', () => {
      const sendt = randomUUID();
      const { s, svaret } = registrertSvar({ id: sendt, hva: 'sendt', dato: '2026-09-18' });
      s.send('TE', { type: 'bestridelse', gjelder: sendt, hva: 'sendt' });
      expect(s.avvist('BH', registrert(svaret, '2026-09-18')), 'kontrollsak').toBeNull();
      expect(s.avvist('BH', registrert(svaret, '2026-09-17'))).toBe('BEGRUNNELSE_FOER_SVARET');
    });

    it('en begrunnelse fra appen har ingen sendt-dato og kontrolleres ikke (KA-U34)', () => {
      const { s, brev } = medSvar();
      brev.tidsstempel = '2026-12-31T10:00:00.000Z';
      expect(
        s.avvist('BH', { type: 'begrunnelse', gjelder: svarId(brev), utdypning: BEGRUNNELSE })
      ).toBeNull();
    });
  });

  it('en registrert begrunnelse uten brevet som vedlegg eller med tekst avvises (KA-U35)', () => {
    const { s, brev } = medSvar();
    const registrert = { type: 'begrunnelse', gjelder: svarId(brev), sendt: '2026-10-06' };
    expect(
      s.avvist('BH', { ...registrert, dokumentasjon: [randomUUID()] }),
      'kontrollsak'
    ).toBeNull();
    expect(s.avvist('BH', registrert)).toBe('UGYLDIG_FORM');
    expect(
      s.avvist('BH', { ...registrert, dokumentasjon: [randomUUID()], utdypning: BEGRUNNELSE })
    ).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', { ...registrert, dokumentasjon: [randomUUID()] })).toBe('FEIL_PART');
  });

  it('en begrunnelse fra appen har ingen vedlegg, og en registrert har ingen brevtekst (KA-U34, MM-U17)', () => {
    const { s, brev } = medSvar();
    const fraAppen = { type: 'begrunnelse', gjelder: svarId(brev), utdypning: BEGRUNNELSE };
    expect(s.avvist('BH', fraAppen), 'kontrollsak').toBeNull();
    expect(s.avvist('BH', { ...fraAppen, dokumentasjon: [randomUUID()] })).toBe('UGYLDIG_FORM');
    const registrert = {
      type: 'begrunnelse',
      gjelder: svarId(brev),
      sendt: '2026-10-05',
      dokumentasjon: [randomUUID()],
    };
    expect(s.avvist('BH', { ...registrert, brevtekst: ['Teksten.'] })).not.toBeNull();
  });

  it('avvises fra TE, når den ikke gjelder et svar, og uten tekst', () => {
    const { s, brev } = medSvar();
    expect(
      s.avvist('TE', { type: 'begrunnelse', gjelder: svarId(brev), utdypning: BEGRUNNELSE })
    ).toBe('FEIL_PART');
    expect(
      s.avvist('BH', { type: 'begrunnelse', gjelder: s.krav('grunnlag'), utdypning: BEGRUNNELSE })
    ).toBe('INGEN_SVAR_AA_BEGRUNNE');
    expect(s.avvist('BH', { type: 'begrunnelse', gjelder: svarId(brev), utdypning: ' ' })).toBe(
      'BEGRUNNELSE_MANGLER'
    );
  });

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

  it('et spor TE fortsatt kan sende, gjør at kravene ikke er avgjort', () => {
    const s = utenFrist();
    expect(s.avvist('TE', FRISTKRAV)).toBeNull();
  });

  it('når TE ikke krever fristforlengelse, er kravene avgjort, og meldingen sier hvorfor', () => {
    const s = utenFrist();
    s.send('TE', { type: 'ingen_krav', spor: 'frist' });
    expect(s.avvisning('TE', { type: 'trekk', spor: 'vederlag' })).toEqual({
      regel: 'KRAVENE_AVGJORT',
      melding:
        'Kravene i saken er avgjort: byggherren har godkjent grunnlaget, partene er enige om svaret på kravet om justering av vederlaget og TE krever ikke fristforlengelse.',
    });
  });

  it('et trukket krav står som trukket i meldingen', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    s.send('TE', { type: 'trekk', spor: 'frist' });
    expect(s.avvisning('TE', { type: 'trekk', spor: 'vederlag' })?.melding).toBe(
      'Kravene i saken er avgjort: byggherren har godkjent grunnlaget, partene er enige om svaret på kravet om justering av vederlaget og kravet om fristforlengelse er trukket.'
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
        'Kravene i saken er avgjort: byggherren har frafalt pålegget, TE krever ikke justering av vederlaget og TE krever ikke fristforlengelse.',
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
      KJERNE
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
    const varsel = { type: 'varsel', spor: 'frist', hjemmel: '33.4', sendt: '2026-09-28' };
    expect(s.avvist('TE', { ...varsel, brevtekst: ['x'] })).toBe('UGYLDIG_FORM');
    const rad = s.send('TE', varsel);
    expect(rad.data.brevtekst).toBeUndefined();
    expect(utenAvsnitt(rad)).toEqual([]);
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

describe('vedleggene står i teksten (A4)', () => {
  const dokument = (dokumentasjon: string[]): Dokument => ({
    id: 'brevet',
    avsender: 'TE',
    registrert: '2026-10-05T10:00:00Z',
    opplysninger: [],
    dokumentasjon,
    krav: [],
    svar: [],
    utsagn: [{ id: 'u', art: 'ingen_krav', spor: 'frist' }],
    brevtekst: null,
  });
  const saken = {
    saksnummer: SAK,
    tittel: TITTEL,
    grunnlagssvar: null,
    subsidiaer: { vederlag: [], frist: [] },
  };

  it('et brev med vedlegg får et avsnitt som lister dem og gjelder dokumentet', () => {
    const t = lagBrevtekst(dokument(['tegning-12.pdf', 'referat-4.pdf']), [], saken, KJERNE.regler);
    expect(t.at(-1)).toEqual({
      gjelder: 'brevet',
      laast: 'Brevet har vedlegg: tegning-12.pdf og referat-4.pdf.',
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
    tekst(rad);
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
      d.dokumentasjon = ['tegning.pdf'];
      (d.brevtekst as Avsnitt[]).push({
        gjelder: r.event_id,
        laast: 'Brevet har vedlegg: tegning.pdf.',
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
      s.avvist('TE', { type: 'varsel', spor: 'frist', hjemmel: '33.4', sendt: '2026-02-30' })
    ).toBe('UGYLDIG_FORM');
  });

  it('kroner og datoer i Oslo', () => {
    expect(kroner(125000)).toBe('125 000 kr');
    expect(kroner(1234567.5)).toBe('1 234 567,50 kr');
    expect(norskDato('2026-09-28')).toBe('28. september 2026');
    // Klokka 23.30 UTC 31.12 er 1. januar i Oslo.
    expect(norskDato('2026-12-31T23:30:00Z')).toBe('1. januar 2027');
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
      'frist',
      'svar på forespørsel etter § 33.6.2',
      { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
      FRIST_FULLT[1],
    ],
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
      Object.entries(vurderinger).filter(
        ([k]) => k !== 'foresporsel_svar_ok' && k !== 'hold_tilbake'
      )
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
    const krav = u.spor[spor].gjeldendeKrav!;
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
      s.send('TE', { type: 'varsel', spor: 'frist', hjemmel: '33.4', sendt: '2026-09-01' });
      expect(s.u().spor.frist.varsel, 'forutsetning: varselet er registrert').not.toBeNull();
      expect(s.avvist('BH', revisjon(s, 'frist', forSent334))).toBe('SAGT_I_TIDE');
    });

    it('kontrollsak: «for sent» kan stå i en revisjon av et svar som sa «for sent»', () => {
      const s = sakMedKrav();
      brev(s, 'frist', forSent334);
      expect(s.avvist('BH', revisjon(s, 'frist', { ...forSent334, dager: 15 }))).toBeNull();
    });

    it('et registrert svar med «i tide» binder ikke (HF-U4, OV-U4)', () => {
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
      expect(
        etter.spor.frist.gjeldendeSvar?.standpunkter.find((p) => p.art === 'rettidighet'),
        `forutsetning: det registrerte svaret sier «i tide» (${JSON.stringify(etter.begrensninger)})`
      ).toMatchObject({ iTide: true });
      expect(s.avvist('BH', revisjon(s, 'frist', forSent334))).toBeNull();
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
      expect(s.avvist('BH', revisjon(s, 'frist', forSent334))).toBeNull();
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

    it('«i tide» står mot en senere grunnlagsversjon, også med endret underkategori (HF-U8)', () => {
      const s = sakMedKrav();
      brev(s, 'grunnlag', avslaatt);
      s.send('TE', {
        ...GRUNNLAGSKRAV,
        innhold: { ...GRUNNLAGSKRAV.innhold, underkategori: 'valg_av_loesning' },
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
        innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', tittel: 'Kvikkleire' },
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
 * GR-U19: en ny grunnlagsversjon beholder hovedkategorien, og underkategorien kan bare
 * endres når § 32.2 gjelder likt før og etter. Kontrollsakene er arbeidsvalgene 16.10 i #538.
 */
describe('en ny grunnlagsversjon beholder kategorien (GR-U19)', () => {
  const versjon = (innhold: Data) => ({
    ...GRUNNLAGSKRAV,
    innhold: { tittel: 'Ny peling', ...innhold },
  });
  const endringsordre = {
    hovedkategori: 'endring',
    underkategori: 'endringsordre',
    endringsordre: 'EO-1',
  };

  it.each([
    [
      'irregulær endring til svikt',
      null,
      { hovedkategori: 'svikt', underkategori: 'grunnforhold' },
      'ANNEN_HOVEDKATEGORI',
    ],
    ['irregulær endring til endringsordre', null, endringsordre, 'ANNEN_VARSLINGSPLIKT'],
    [
      'endringsordre til irregulær endring',
      endringsordre,
      GRUNNLAGSKRAV.innhold,
      'ANNEN_VARSLINGSPLIKT',
    ],
    [
      'irregulær endring til lovendring, der § 32.2 gjelder i begge',
      null,
      { hovedkategori: 'endring', underkategori: 'lovendring_gjenstand' },
      null,
    ],
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
      s.avvist('TE', versjon({ hovedkategori: 'svikt', underkategori: 'grunnforhold' }))
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

  describe('en ny grunnlagsversjon etter frafallet (GR-U20, GR-U19)', () => {
    it.each([
      ['uten bytte av underkategori', { tittel: 'Ny peling 2' }],
      [
        'med bytte av underkategori der § 32.2 gjelder likt (GR-U19)',
        { underkategori: 'valg_av_loesning' },
      ],
    ] as [string, Data][])(
      '%s: byggherren kan svare med frafall eller endringsordre, ikke med avslag',
      (_n, innhold) => {
        const s = medFrafall();
        versjon(s, innhold);
        expect(s.u().spor.grunnlag.krav.length, 'forutsetning: ny grunnlagsversjon').toBe(2);
        expect(s.avvist('BH', nyttSvar(s, frafall))).toBeNull();
        expect(s.avvist('BH', nyttSvar(s, endringsordre))).toBeNull();
        expect(s.avvist('BH', nyttSvar(s, avslag))).toBe('FRAFALT');
        expect(s.avvist('BH', nyttSvar(s, paaberopelse))).toBe('SAGT_I_TIDE');
      }
    );

    it('kontrollsak: etter et avslag kan byggherren avslå en ny grunnlagsversjon', () => {
      const s = sakMedKrav();
      s.send('BH', nyttSvar(s, avslag));
      versjon(s, { tittel: 'Ny peling 2' });
      expect(s.avvist('BH', nyttSvar(s, avslag))).toBeNull();
    });

    it('et registrert frafall binder ikke (OV-U4)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      expect(s.u().frafalt, 'forutsetning: det registrerte frafallet leses').toBe(true);
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

    it('kontrollsak: etter et registrert frafall venter versjon 2 på svar uten avklart grunnlag (OV-U4, GR-U1)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      medEnighetIVederlaget(s);
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
    });
  });

  describe('et avslag etter frafallet som ikke kommer gjennom kommandoene (MM-U19, MM-U18)', () => {
    it('et registrert avslag av en ny grunnlagsversjon får ingen virkning, og saken er forstått', () => {
      const s = medFrafall();
      versjon(s, { tittel: 'Ny peling 2' });
      const id = registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(u.forstaatt).toBe(true);
      expect(u.utenVirkning.map((x) => x.element)).toContain(id);
      expect(u.spor.grunnlag.gjeldendeSvar).toBeNull();
    });

    it('en registrert revisjon fra frafall til avslag får ingen virkning, og frafallet står', () => {
      const s = medFrafall();
      const id = registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(u.utenVirkning.map((x) => x.element)).toContain(id);
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
        expect(u.utenVirkning.map((x) => x.element)).toContain(id);
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

    it('kontrollsak: et registrert avslag etter et registrert frafall leses med virkning (OV-U4)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      const id = registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(u.utenVirkning).toEqual([]);
      expect(u.spor.grunnlag.gjeldendeSvar?.id).toBe(id);
    });
  });
});
