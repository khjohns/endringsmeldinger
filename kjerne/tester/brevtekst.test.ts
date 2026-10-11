/**
 * Brevteksten i kjernen (#369): teksten mottakeren leser i et brev appen sender.
 * Forventningene har kilde i vedtakene: LV-U2 (teksten fryses som brevet, og et
 * dokument gjengir den tro), LV-U3 (hvert utsagn med virkning står i teksten, ikke
 * appens vurdering), KA-U22 og KA-U25 (de faste tekstene, ordrett), VS-U9 og VS-U11
 * (svaret gjentar eller gir opp innsigelsen, og brevet sier det), B-13 om
 * begrunnelsestekst (den låste delen og utdypningen hver for seg), MM-U17 (et
 * registrert brev får ingen tekst fra appen) og HF-U1 (hvert avsnitt viser til et
 * element i brevet). At hvert element i bevis-sakene har et avsnitt, prøves i
 * `forloep.test.ts` og mot testbasen i `sprakprove/kjernelagring/lagring.test.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { gjengi, gjengirTro, kroner, norskDato } from '../frosset/brevtekst.ts';
import { lesJournal } from '../format/leser.ts';
import { utledJournal, vurder } from '../kommandoer/skriving.ts';
import type { Avsnitt, Journalrad, Part } from '../typer.ts';
import { KJERNE } from '../versjon.ts';
import { utenAvsnitt } from './formatprove.ts';

type Data = Record<string, unknown>;

const SAK = 'SAK-20261002-001';
const TITTEL = 'Endret fundamentering';
const I_SAKEN = `i sak ${SAK} («${TITTEL}»)`;

/** En sak i minnet der hver kommando går gjennom `vurder`, én dag etter den forrige. */
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
  const send = (part: Part, kommando: Data): Journalrad => {
    const utfall = vurder(
      kommando,
      {
        sakId: SAK,
        aktoerId: part.toLowerCase(),
        part,
        teamId: null,
        tidspunkt: () => new Date(`2026-10-${String(dag++).padStart(2, '0')}T10:00:00Z`),
        nyId: randomUUID,
      },
      journal,
      KJERNE
    );
    if (!utfall.godtatt) throw new Error(`Forutsetning: ${JSON.stringify(utfall.avvisning)}`);
    journal.push(...utfall.hendelser);
    return utfall.hendelser[0];
  };
  const u = () => utledJournal(journal, KJERNE);
  const krav = (spor: 'grunnlag' | 'vederlag' | 'frist') => u().spor[spor].gjeldendeKrav!.id;
  return { journal, send, u, krav };
}

const tekst = (rad: Journalrad) => rad.data.brevtekst as Avsnitt[];

const GRUNNLAGSKRAV = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Ny peling',
    beskrivelse: 'Byggherren har pålagt en annen fundamentering.',
  },
};

/** Saken med grunnlag, vederlag (125 000 kr) og frist (20 dager), med varselet etter § 33.4. */
function sakMedKrav() {
  const s = sak();
  s.send('TE', GRUNNLAGSKRAV);
  s.send('TE', { type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep: 125000 } });
  s.send('TE', {
    type: 'krav',
    spor: 'frist',
    innhold: { dager: 20 },
    varsel: { sendt: '2026-09-28' },
  });
  return s;
}

const svar = (spor: string, gjelder: string, vurderinger: Data, resultat: Data = {}) => ({
  spor,
  gjelder,
  regelversjon: KJERNE.regler.versjon,
  vurderinger,
  resultat,
});

describe('de faste tekstene står ordrett (KA-U22, KA-U25)', () => {
  it('trekk av grunnlaget', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'trekk', spor: 'grunnlag' });
    expect(tekst(rad).map((a) => a.laast)).toEqual([
      `TE trekker sitt krav ${I_SAKEN}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`,
    ]);
  });

  it('trekk av vederlaget, med kravversjonen entydig identifisert', () => {
    const s = sakMedKrav();
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: { metode: 'tilbud', beloep: 150000 } });
    const rad = s.send('TE', { type: 'trekk', spor: 'vederlag' });
    const [a] = tekst(rad);
    expect(a.laast).toMatch(
      new RegExp(`^TE trekker kravet om justering av vederlaget ${esc(I_SAKEN)}, `)
    );
    // Den gjeldende kravversjonen er den i brev 5, ikke den første i brev 3.
    expect(a.laast).toContain(`150 000 kr i brev 5 av 5. oktober 2026`);
    expect(a.laast).toMatch(
      /Trekket er avkall på dette kravet, også det byggherren har godkjent\.$/
    );
    expect(a.utdypning).toBeUndefined();
  });

  it('trekk av fristen', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'trekk', spor: 'frist' });
    expect(tekst(rad)[0].laast).toMatch(
      new RegExp(`^TE trekker kravet om fristforlengelse ${esc(I_SAKEN)}, .*20 dager i brev 4`)
    );
  });

  it('«ingen krav» i vederlaget sier også at forseringsvederlaget ikke omfattes (KA-U25)', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const rad = s.send('TE', { type: 'ingen_krav', spor: 'vederlag' });
    expect(tekst(rad).map((a) => a.laast)).toEqual([
      `TE krever ikke justering av vederlaget som følge av forholdet ${I_SAKEN}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag. Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.`,
    ]);
  });

  it('«ingen krav» i fristen har ikke setningen om forsering', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const rad = s.send('TE', { type: 'ingen_krav', spor: 'frist' });
    expect(tekst(rad).map((a) => a.laast)).toEqual([
      `TE krever ikke fristforlengelse som følge av forholdet ${I_SAKEN}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`,
    ]);
  });
});

describe('hvert utsagn står i teksten, ikke appens vurdering (LV-U3, HF-U2)', () => {
  it('kravene står med beløp, dager og datoen for varselet', () => {
    const s = sakMedKrav();
    const [, g, v, f] = s.journal;
    expect(tekst(g)[0].laast).toContain('«Ny peling»');
    expect(tekst(g)[0].laast).toContain('NS 8407 § 32.2');
    expect(tekst(v)[0].laast).toContain('125 000 kr');
    expect(tekst(f).map((a) => a.laast)).toEqual([
      expect.stringContaining('20 dager'),
      expect.stringContaining('§ 33.4 ble sendt 28. september 2026'),
    ]);
    // Grunnlagskravets beskrivelse er TEs utdypning, ved siden av den låste delen.
    expect(tekst(g)[0].utdypning).toBe(GRUNNLAGSKRAV.innhold.beskrivelse);
    expect(tekst(g)[0].laast).not.toContain(GRUNNLAGSKRAV.innhold.beskrivelse);
    expect(s.journal.flatMap(utenAvsnitt)).toEqual([]);
  });

  it('svaret har hvert standpunkt, ordnet prinsipalt og subsidiært slik brevet ordner dem', () => {
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
    const [g, f] = tekst(rad).map((a) => a.laast);
    expect(g).toContain(
      'Prinsipalt: Byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 kom for sent.'
    );
    expect(g).toContain('Subsidiært: Byggherren godkjenner grunnlaget.');
    expect(f).toContain(
      'Prinsipalt: Byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4 kom for sent.'
    );
    expect(f).toContain('Subsidiært: Byggherren godtar ikke at fremdriften hindres');
    expect(f).toContain('Videre subsidiært: Byggherren godkjenner 10 dager av de krevde 20 dager.');
  });

  it('et standpunkt appen regner som uten virkning, står som byggherren sa det', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: true, spesifisert_krav_ok: true, vilkar_oppfylt: true, dager: 20 },
          { resultat: 'godkjent', godkjent_dager: 20 }
        ),
      ],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(
      b.uten_virkning,
      'forutsetning: appen regner to standpunkter som uten virkning'
    ).toHaveLength(2);
    const [f] = tekst(rad).map((a) => a.laast);
    expect(f).toContain(
      'Byggherren godtar at varselet om fristforlengelse etter NS 8407 § 33.4 kom i tide.'
    );
    expect(f).toContain('Byggherren godtar at fremdriften hindres av forholdet (NS 8407 § 33.1).');
    expect(f).toContain('Byggherren godkjenner 20 dager.');
    // Appens vurdering er ikke partens meddelelse.
    expect(f).not.toMatch(/virkning|sammenfall|Prinsipalt|Subsidiært/);
  });

  it('beløpet i et delvis godkjent vederlag står med det krevde', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'delvis',
            hovedkrav_godkjent_belop: 100000,
            aksepterer_metode: true,
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 100000 }
        ),
      ],
    });
    expect(tekst(rad)[0].laast).toBe(
      'Byggherren svarer på TEs krav om justering av vederlaget på 125 000 kr i brev 3 av 3. oktober 2026. Byggherren godkjenner 100 000 kr av de krevde 125 000 kr.'
    );
  });

  it('aksepten viser til svaret og brevet det står i', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            hovedkrav_vurdering: 'delvis',
            hovedkrav_godkjent_belop: 100000,
            aksepterer_metode: true,
          },
          { resultat: 'delvis_godkjent', godkjent_beloep: 100000 }
        ),
      ],
    });
    const rad = s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(tekst(rad)[0].laast).toBe(
      'TE godtar byggherrens svar i brev 5 av 5. oktober 2026 på TEs krav om justering av vederlaget på 125 000 kr i brev 3 av 3. oktober 2026.'
    );
  });

  it('godkjenningen som er en endringsordre, sier at endringen kreves og viser til kravet (GR-U13)', () => {
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
    expect(tekst(rad)[0].laast).toContain(
      'Svaret er en endringsordre etter NS 8407 § 32.3 første ledd a, jf. § 31.3: byggherren krever endringen utført slik den er beskrevet i TEs krav i brev 2 av 2. oktober 2026.'
    );
  });
});

describe('innsigelsen etter § 5 i et senere svar (VS-U9, VS-U11)', () => {
  const medInnsigelse = () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('grunnlag') });
    return s;
  };

  it('innsigelsen står i brevet med det den gjelder', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: s.krav('grunnlag') });
    expect(tekst(rad)[0].laast).toBe(
      'Byggherren gjør gjeldende at TEs krav i brev 2 av 2. oktober 2026 kom for sent (NS 8407 § 5 tredje ledd).'
    );
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
    expect(tekst(rad)[0].laast).toContain(
      'kom for sent, jf. innsigelsen i brev 5 av 5. oktober 2026.'
    );
  });

  it('gir byggherren innsigelsen opp, sier brevet det', () => {
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
    expect(tekst(rad)[0].laast).toContain(
      'Byggherren opprettholder ikke innsigelsen etter NS 8407 § 5 i brev 5 av 5. oktober 2026, og godtar at TEs varsel etter NS 8407 § 32.2 kom i tide.'
    );
  });
});

describe('den låste delen og utdypningen hver for seg (B-13 om begrunnelsestekst)', () => {
  it('utdypningen i svaret står for seg, uendret', () => {
    const s = sakMedKrav();
    const utdypning = 'Varselet kom tre uker etter pålegget.\n\nSe referatet fra byggemøte 4.';
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        {
          ...svar('grunnlag', s.krav('grunnlag'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: false,
          }),
          utdypning,
        },
      ],
    });
    const [a] = tekst(rad);
    expect(a.utdypning).toBe(utdypning);
    expect(a.laast).not.toContain('tre uker');
  });
});

describe('et registrert brev står som det ble sendt (MM-U17)', () => {
  it('et varsel sendt utenfor appen får ingen tekst fra appen', () => {
    const s = sak();
    s.send('TE', GRUNNLAGSKRAV);
    const rad = s.send('TE', {
      type: 'varsel',
      spor: 'frist',
      hjemmel: '33.4',
      sendt: '2026-09-28',
    });
    expect(rad.data.brevtekst).toBeUndefined();
    expect(utenAvsnitt(rad)).toEqual([]);
  });
});

describe('leseren kontrollerer brevteksten (HF-U1, MM-U17)', () => {
  const lest = (rader: Journalrad[]) => lesJournal(rader, KJERNE.leserformat).at(-1)!;
  const medTekst = (endre: (data: Data) => void) => {
    const s = sakMedKrav();
    const rad = structuredClone(s.journal.at(-1)!);
    endre(rad.data);
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

  it('to avsnitt for samme element gjør raden ikke forstått', () => {
    const h = medTekst((d) => {
      const t = d.brevtekst as Avsnitt[];
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
  it('kroner og datoer i Oslo', () => {
    expect(kroner(125000)).toBe('125 000 kr');
    expect(kroner(1234567.5)).toBe('1 234 567,50 kr');
    expect(norskDato('2026-09-28')).toBe('28. september 2026');
    // Klokka 23.30 UTC 31.12 er 1. januar i Oslo.
    expect(norskDato('2026-12-31T23:30:00Z')).toBe('1. januar 2027');
  });
});

function esc(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
