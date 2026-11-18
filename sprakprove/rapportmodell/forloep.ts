import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { opprettelse } from '../../kjerne/kommandoer/opprettelse.ts';
import {
  forhaandsvis,
  laastTekst,
  utledJournal,
  vurder,
} from '../../kjerne/kommandoer/skriving.ts';
import type { Kontekst, Utfall } from '../../kjerne/kommandoer/skriving.ts';
import { kommandoFor, Navn, partFor } from '../../kjerne/tester/klient.ts';
import type { Handling } from '../../kjerne/tester/klient.ts';
import type { Journalrad, Part, Vedlegg } from '../../kjerne/typer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';

export const PROSJEKT = 'syntetisk-prosjekt-554';
export const VARSELTEKST =
  'SYNTETISK PRØVEDOKUMENT. TE varsler fristforlengelse etter § 33.4 den 2026-09-18 på grunn av grunnforhold. Ingen reell sending eller mottak.';
export const VEDLEGG: Vedlegg = {
  vedlegg_id: '00000000-0000-4000-8000-000000000554',
  filnavn: 'syntetisk-fristvarsel.txt',
  innhold_sha256: createHash('sha256').update(VARSELTEKST).digest('hex'),
};

export interface Steg {
  trinn: string;
  tidspunkt: string;
  kommando: unknown;
  godtatt: boolean;
  avvisning: unknown;
  event_id: string | null;
  saksversjon: number;
}

/** Isolert minnebane med styrt klokke og identiteter; ingen serverkontrakt prøves. */
export class Proevesak {
  journal: Journalrad[] = [];
  steg: Steg[] = [];
  private teller = 0;
  private navn = new Navn();
  readonly nummer: number;
  readonly tittel: string;
  readonly sakId: string;
  constructor(nummer: number, tittel: string) {
    this.nummer = nummer;
    this.tittel = tittel;
    this.sakId = `55400000-0000-4000-9000-${String(nummer).padStart(12, '0')}`;
  }
  id = () =>
    `55400000-0000-4000-8000-${String(this.nummer * 10000 + ++this.teller).padStart(12, '0')}`;
  kontekst(part: Part, tidspunkt: string): Kontekst {
    return {
      sakId: this.sakId,
      part,
      aktoerId:
        part === 'TE'
          ? '55400000-0000-4000-a000-000000000001'
          : '55400000-0000-4000-a000-000000000002',
      teamId: part === 'TE' ? 'syntetisk-te' : 'syntetisk-bh',
      tidspunkt: () => new Date(tidspunkt),
      nyId: this.id,
    };
  }
  opprett(tidspunkt: string) {
    const kommando = { type: 'opprett_sak', sakstittel: this.tittel };
    const u = opprettelse(kommando, 'TE');
    assert(u.godtatt, JSON.stringify(u));
    const k = this.kontekst('TE', tidspunkt);
    const rad: Journalrad = {
      event_id: this.id(),
      sak_id: this.sakId,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: tidspunkt,
      aktor_id: k.aktoerId,
      aktor_rolle: k.part,
      aktor_team_id: k.teamId,
      refererer_til_event_id: null,
      format: u.format,
      data: u.data,
    };
    this.journal.push(rad);
    this.steg.push({
      trinn: 'A/opprett',
      tidspunkt,
      kommando,
      godtatt: true,
      avvisning: null,
      event_id: rad.event_id,
      saksversjon: 1,
    });
  }
  send(trinn: string, tidspunkt: string, h: Handling): Utfall {
    assert.notEqual(h.handling, 'rad', 'Ingen håndskrevne dokumentrader');
    const foer = JSON.stringify(this.journal);
    const u = utledJournal(this.journal, KJERNE);
    const k = kommandoFor(h, u, KJERNE.regler, this.navn);
    const vedlegg = new Map([[VEDLEGG.vedlegg_id, VEDLEGG]]);
    const kontekst = this.kontekst(partFor(h), tidspunkt);
    const vist = forhaandsvis(k, kontekst, this.journal, KJERNE, vedlegg);
    if (vist.godtatt) {
      const tekst = laastTekst(vist.hendelser[0]);
      if (tekst) k.brevtekst = tekst;
    }
    const svar = vurder(k, kontekst, this.journal, KJERNE, vedlegg);
    if (svar.godtatt) this.journal.push(...svar.hendelser);
    else assert.equal(JSON.stringify(this.journal), foer);
    this.steg.push({
      trinn,
      tidspunkt,
      kommando: k,
      godtatt: svar.godtatt,
      avvisning: svar.godtatt ? null : svar.avvisning,
      event_id: svar.godtatt ? svar.hendelser[0].event_id : null,
      saksversjon: this.journal.at(-1)!.versjon,
    });
    return svar;
  }
}

export function lagForloep(
  varselITide = false,
  nummer = 1,
  vedE?: (journal: Journalrad[]) => void
) {
  const s = new Proevesak(
    nummer,
    varselITide ? 'Kontroll av annet varslingstandpunkt' : 'Grunnforhold i syntetisk prosjekt'
  );
  s.opprett('2026-09-20T08:00:00.000Z');
  const send = (trinn: string, dato: string, h: Handling) => {
    const r = s.send(trinn, dato, h);
    assert(r.godtatt, `${trinn}: ${JSON.stringify(r)}`);
  };
  send('A/grunnlag', '2026-09-20T09:00:00.000Z', {
    handling: 'krav',
    spor: 'grunnlag',
    hovedkategori: 'svikt',
    underkategori: 'grunnforhold',
  });
  send('B/vederlag', '2026-09-21T09:00:00.000Z', {
    handling: 'krav',
    spor: 'vederlag',
    belop: 100000,
  });
  send('B/frist', '2026-09-22T09:00:00.000Z', { handling: 'krav', spor: 'frist', dager: 20 });
  send('C', '2026-09-23T09:00:00.000Z', { handling: 'krav', spor: 'vederlag', belop: 150000 });
  send('D', '2026-09-26T09:00:00.000Z', {
    handling: 'brev',
    svar: [
      { spor: 'grunnlag', resultat: 'avslaatt' },
      {
        spor: 'vederlag',
        vurdering: 'delvis',
        godkjent_belop: 120000,
        varslet_i_tide: true,
        metode_akseptert: true,
      },
      {
        spor: 'frist',
        varsel_i_tide: varselITide,
        spesifisering_i_tide: true,
        hindring: true,
        dager: 10,
      },
    ],
  });
  const r1 = structuredClone(s.journal);
  vedE?.(structuredClone(r1));
  send('F', '2026-09-28T09:00:00.000Z', {
    handling: 'varsel',
    spor: 'frist',
    sendt: '2026-09-18',
    dokumentasjon: [VEDLEGG.vedlegg_id],
  });
  send('G/vederlag', '2026-09-29T09:00:00.000Z', { handling: 'aksept', spor: 'vederlag' });
  send('G/frist', '2026-09-30T09:00:00.000Z', { handling: 'aksept', spor: 'frist' });
  send('H', '2026-10-02T09:00:00.000Z', {
    handling: 'revisjon',
    spor: 'grunnlag',
    resultat: 'godkjent',
  });
  return { sak: s, r1 };
}

export function lagKontrollsak() {
  const s = new Proevesak(2, 'Uendret kontrollsak – prosjektering');
  s.opprett('2026-09-20T08:00:00.000Z');
  for (const [trinn, dato, h] of [
    [
      'kontroll/grunnlag',
      '2026-09-20T09:00:00.000Z',
      {
        handling: 'krav',
        spor: 'grunnlag',
        hovedkategori: 'svikt',
        underkategori: 'prosjektering',
      },
    ],
    [
      'kontroll/vederlag',
      '2026-09-21T09:00:00.000Z',
      { handling: 'krav', spor: 'vederlag', belop: 200000 },
    ],
  ] as const) {
    const r = s.send(trinn, dato, h);
    assert(r.godtatt, JSON.stringify(r));
  }
  return s;
}
