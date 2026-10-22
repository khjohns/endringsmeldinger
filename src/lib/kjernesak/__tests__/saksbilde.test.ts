/**
 * Saksbildet for en TS-sak (#665): kravene per spor fra utledningen, status og
 * etiketter fra `visning`, og brevene med den låste teksten og leveringsoppdragene.
 * Journalen er skrevet av kjernen selv, så forventningene er kjernens egne.
 */

import { describe, expect, it } from 'vitest';
import type { Leveringsoppdrag } from '$lib/api/kjerne';
import { etikett, lagSaksbilde, leveringstekst } from '$lib/kjernesak/saksbilde';
import { forhaandsvis, laastTekst, utledJournal } from '$kjerne/kommandoer/skriving';
import { visning } from '$kjerne/utledning/visning';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad } from '$kjerne/typer';

const SAK = 'sak-1';

const opprettet: Journalrad = {
  event_id: 'e-1',
  sak_id: SAK,
  event_type: 'sak_opprettet',
  versjon: 1,
  tidsstempel: '2026-10-16T08:00:00.000Z',
  aktor_id: '',
  aktor_rolle: 'TE',
  aktor_team_id: null,
  refererer_til_event_id: null,
  format: 1,
  data: { sakstittel: 'Ny peling', sakstype: 'standard' },
};

const grunnlagskrav = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Ny peling',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: 'BH påla ny peling i akse C.',
};
const vederlagskrav = {
  type: 'krav',
  spor: 'vederlag',
  innhold: { metode: 'tilbud', beloep: 250000 },
};

const VEDLEGG = '00000000-0000-4000-8000-000000000001';
const vedlegg = new Map([
  [VEDLEGG, { vedlegg_id: VEDLEGG, filnavn: 'varsel.pdf', innhold_sha256: '0'.repeat(64) }],
]);

function skrevet(kommando: unknown, journal: Journalrad[]): Journalrad {
  const utfall = forhaandsvis(
    kommando,
    {
      sakId: SAK,
      aktoerId: '',
      part: 'TE',
      teamId: null,
      tidspunkt: () => new Date('2026-10-16T09:00:00.000Z'),
      nyId: () => crypto.randomUUID(),
    },
    journal,
    KJERNE,
    vedlegg
  );
  if (!utfall.godtatt) throw new Error(`Kjernen avviste kommandoen: ${utfall.avvisning.melding}`);
  return { ...utfall.hendelser[0], versjon: journal.length + 1 };
}

const oppdrag = (event_id: string): Leveringsoppdrag => ({
  id: `l-${event_id}`,
  event_id,
  dokumentnoekkel: `brev-${event_id}`,
  filnavn: `${event_id}.pdf`,
  innhold_sha256: '0'.repeat(64),
  opprettet: '2026-10-16T09:00:01.000Z',
  levert: null,
});

function bildeAv(journal: Journalrad[], lev: Leveringsoppdrag[] = []) {
  const u = utledJournal(journal, KJERNE);
  const vist = visning(u, KJERNE.regler);
  return { bilde: lagSaksbilde(journal, lev, u, vist), u, vist };
}

describe('saksbildet for en TS-sak', () => {
  const g = skrevet(grunnlagskrav, [opprettet]);
  const v = skrevet(vederlagskrav, [opprettet, g]);
  const journal = [opprettet, g, v];

  it('viser kravet i sporet det står i, med brevet fra journalen', () => {
    const { bilde, u } = bildeAv(journal);
    const grunnlag = bilde.spor.find((s) => s.spor === 'grunnlag')!;
    const vederlag = bilde.spor.find((s) => s.spor === 'vederlag')!;
    const frist = bilde.spor.find((s) => s.spor === 'frist')!;

    expect(grunnlag.poster).toEqual([
      expect.objectContaining({
        art: 'krav',
        id: u.spor.grunnlag.gjeldendeKrav!.id,
        brev: 2,
        gjeldende: true,
        revidert: false,
      }),
    ]);
    expect(vederlag.poster).toEqual([
      expect.objectContaining({ art: 'krav', brev: 3, gjeldende: true }),
    ]);
    expect(frist.poster).toEqual([]);
  });

  it('tar status og etiketter fra visningen, med tekst for kodene', () => {
    const { bilde, vist } = bildeAv(journal);
    // MM-U22: saken har ingen samlet status mens kravene venter på svar.
    expect(bilde.status).toBeNull();
    expect(bilde.status).toEqual(vist.status);
    expect(bilde.versjon).toBe(3);
    expect(bilde.tittel).toBe('Ny peling');
    for (const s of bilde.spor)
      expect(s.etiketter.map((e) => e.kode)).toEqual(vist.spor[s.spor].etiketter);
    expect(bilde.spor[0].etiketter).toContainEqual({
      kode: 'venter_paa_svar',
      tekst: 'Venter på svar',
    });
  });

  it('tar betegnelsen per spor fra visningen, med teksten i MM-U30', () => {
    const { bilde, vist } = bildeAv(journal);
    for (const s of bilde.spor)
      expect(s.betegnelse?.kode ?? null).toBe(vist.spor[s.spor].betegnelse);
    expect(bilde.spor.map((s) => s.betegnelse)).toEqual([
      { kode: 'venter_paa_svar', tekst: 'Kravet venter på byggherrens svar' },
      { kode: 'venter_paa_svar', tekst: 'Kravet venter på byggherrens svar' },
      null,
    ]);
  });

  it('viser den frosne teksten i hvert brev, med utdypningen, og leveringsoppdragene koblet på hendelsen', () => {
    const { bilde } = bildeAv(journal, [oppdrag(v.event_id), oppdrag(g.event_id)]);
    const [rad1, rad2, rad3] = bilde.journal;

    expect(rad1).toMatchObject({ versjon: 1, tekst: null, oppdrag: [], tolket: true });
    expect(rad2.tekst?.map((a) => a.laast)).toEqual(laastTekst(g));
    expect(rad2.tekst?.length).toBeGreaterThan(0);
    expect(rad2.tekst?.map((a) => a.utdypning).filter(Boolean)).toEqual([
      'BH påla ny peling i akse C.',
    ]);
    expect(rad2.oppdrag.map((o) => o.id)).toEqual([`l-${g.event_id}`]);
    expect(rad3.tekst?.map((a) => a.laast)).toEqual(laastTekst(v));
    expect(rad3.oppdrag.map((o) => o.id)).toEqual([`l-${v.event_id}`]);
    expect(rad2.tittel).toBe('Brev fra TE');
  });

  it('merker en hendelse kjernen ikke forstår, og sier at saken ikke kan utledes (MM-U2)', () => {
    const ukjent: Journalrad = {
      ...opprettet,
      event_id: 'e-x',
      event_type: 'ukjent_type',
      versjon: 2,
      data: {},
    };
    const { bilde } = bildeAv([opprettet, ukjent]);
    expect(bilde.status?.kode).toBe('kan_ikke_utledes');
    // Tittel og kode for en rad som ikke er tolket: oppdragsgiver 19.10 (#764, svar 4).
    expect(bilde.journal[1]).toMatchObject({
      tolket: false,
      tittel: 'Hendelse appen ikke forstår, fra TE',
      hendelseskode: 'ukjent_type',
    });
    expect(bilde.journal[0].hendelseskode).toBeNull();
    expect(bilde.merknader.map((m) => m.kode)).toEqual(['varsel_med_frist_utenfor_appen']);
  });

  // #712: etikettene `visning` lager for opplysningene, med datoen TE oppga.
  it('viser opplysningene i brevet med etikettene fra visningen og datoen som er oppgitt', () => {
    const varsel = skrevet(
      {
        type: 'varsel',
        spor: 'frist',
        hjemmel: '33.4',
        sendt: '2026-10-02',
        dokumentasjon: [VEDLEGG],
      },
      [opprettet, g]
    );
    const { bilde, vist, u } = bildeAv([opprettet, g, varsel]);
    const id = u.opplysninger[0].opplysning.id;
    expect(vist.opplysninger[id]).toEqual(['sendt_ifolge_TE', 'mottaksdato_mangler']);
    expect(bilde.journal[2].opplysninger).toEqual([
      {
        id,
        dato: '2026-10-02',
        etiketter: [
          { kode: 'sendt_ifolge_TE', tekst: 'Sendt ifølge TE' },
          { kode: 'mottaksdato_mangler', tekst: 'Mottaksdatoen mangler' },
        ],
        tekst: 'Sendt ifølge TE 2. oktober 2026. Mottaksdatoen mangler',
      },
    ]);
    expect(bilde.journal.slice(0, 2).map((j) => j.opplysninger)).toEqual([[], []]);
  });

  it('har tekst for hver etikett visningen kan gi en opplysning', () => {
    const koder = ['sendt', 'mottatt', 'endringsordre', 'ikke_endringsordre'].flatMap((hva) =>
      ['TE', 'BH'].map((part) => `${hva}_ifolge_${part}`)
    );
    koder.push(
      'mottaksdato_mangler',
      'sending_bestridt',
      'mottak_bestridt',
      'endringsordre_bestridt'
    );
    expect(koder.filter((k) => etikett(k).tekst === k)).toEqual([]);
  });

  // MM-U2: en rad kjernen ikke har tolket, velter ikke saksbildet.
  it('viser en ikke tolket rad uten tekst, også når brevteksten har en annen form', () => {
    for (const brevtekst of [{ avsnitt: ['Tekst'] }, ['Tekst'], [{ laast: 1 }], 'Tekst']) {
      const nyere: Journalrad = {
        ...opprettet,
        event_id: 'e-x',
        event_type: 'dokument_registrert',
        versjon: 2,
        format: 99,
        data: { brevtekst },
      };
      const { bilde } = bildeAv([opprettet, nyere]);
      expect(bilde.journal[1]).toMatchObject({
        tolket: false,
        tekst: null,
        tittel: 'Hendelse appen ikke forstår, fra TE',
        hendelseskode: 'dokument_registrert',
      });
    }
  });

  // Oppdragsgiver 19.10 (#764, svar 4): tittelen gjelder hver rad som ikke er tolket.
  it('gir en ikke tolket sak_opprettet tittelen for en hendelse appen ikke forstår', () => {
    const { bilde } = bildeAv([{ ...opprettet, format: 99 }]);
    expect(bilde.journal[0]).toMatchObject({
      tolket: false,
      tittel: 'Hendelse appen ikke forstår, fra TE',
      hendelseskode: 'sak_opprettet',
    });
  });

  it('viser en kode uten tekst som koden selv', () => {
    expect(etikett('ny_etikett_fra_kjernen')).toEqual({
      kode: 'ny_etikett_fra_kjernen',
      tekst: 'ny_etikett_fra_kjernen',
    });
  });
});

// Kilde: oppdragsgiver 18.10 (#764): «levert» er tidspunktet i kvitteringen for
// dokumentreferansen, ellers «ikke levert ennå»; et registrert brev er sendt utenfor
// appen (LV-U11).
describe('leveringen av et oppdrag', () => {
  it('er ikke levert ennå uten kvittering for dokumentreferansen', () => {
    expect(leveringstekst(oppdrag('e-2'))).toMatch(/^e-2\.pdf: frosset .*, ikke levert ennå$/);
  });

  it('er levert med tidspunktet i kvitteringen', () => {
    const tekst = leveringstekst({ ...oppdrag('e-2'), levert: '2026-10-16T10:15:00.000Z' });
    expect(tekst).toMatch(/, levert \S/);
    expect(tekst).not.toMatch(/ikke levert/);
  });

  it('er sendt utenfor appen for et registrert brev, som ikke har noe dokument', () => {
    expect(leveringstekst({ ...oppdrag('e-2'), filnavn: null })).toMatch(
      /^brev-e-2: frosset .*, sendt utenfor appen$/
    );
  });
});
