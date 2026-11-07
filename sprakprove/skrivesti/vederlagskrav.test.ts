/**
 * Vederlagskravet med kravposter gjennom skrivestien til TS-serveren (#667, #1663). Kravet
 * bygges direkte i kjernens format (OV-U95 punkt 19), ikke av det gamle skjemaet, og den
 * låste teksten er den `brevFor` gir. Saken er en prøvesak fra testverktøyet. Kildene til
 * forventningene er formatet i kjernen, avgjørelsen om valgfri utdypning (oppdragsgiver
 * 17.10, #667) og LV-U2.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from '../../server/tester/testbase.ts';
import { grunnlagskrav } from '../../src/lib/kjernesak/paaberopelse.ts';
import { brevFor, type Saksmerking } from '../../src/lib/kjernesak/brevtekst.ts';
import { somJournal } from '../../src/lib/kjernesak/journal.ts';
import type { Kjernesak } from '../../src/lib/api/kjerne.ts';
import { KJERNE } from '../../kjerne/versjon.ts';

const PAABEROPELSE = grunnlagskrav({
  hovedkategori: 'ENDRING',
  underkategori: 'IRREG',
  datoer: { paalegg_mottatt: '2026-10-01' },
  endringsordre: '',
  utdypning: 'Byggherren har pålagt en annen fundamentering.',
});

/** Kravet med én kravpost med tilbud, i formatet i kjernen (OV-U95 punkt 19). */
const vederlagskrav = (beloep: number, utdypning = '') => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: {
    kravposter: [{ beskrivelse: 'Ny fundamentering', oppgjoersform: 'tilbud', beloep }],
  },
  ...(utdypning ? { utdypning } : {}),
});

describe.skipIf(!TESTBASE_URL)('vederlagskravet med kravposter mot TS-serveren', () => {
  let o: Oppsett;
  let server: KjorendeServer;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
  }, 240_000);
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  }, 60_000);

  const hent = async (sakId: string) => {
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
    return svar.kropp as unknown as Kjernesak;
  };

  /** Som skjemaet: koden og kontraktsforkortelsen fra leseinngangen (LV-U46, LV-U53). */
  const merking = async (sakId: string): Promise<Saksmerking> => {
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}/sakskode`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
    const { kode, loepenummer, kontraktsforkortelse } = svar.kropp as {
      kode: 'koe' | 'eo';
      loepenummer: number;
      kontraktsforkortelse: string | null;
    };
    return { sakskode: { kode, loepenummer }, kontraktsforkortelse };
  };

  /** Som skjemaet: teksten kjernen lager for saken slik den er lastet, og kravet med den. */
  async function send(sakId: string, kommando: Record<string, unknown>) {
    const sak = await hent(sakId);
    const brev = brevFor(
      kommando,
      sakId,
      'TE',
      await merking(sakId),
      somJournal(sakId, sak.journal),
      KJERNE
    );
    const tekst = 'tekst' in brev ? brev.tekst : null;
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: {
        expected_version: sak.versjon,
        kommando_id: randomUUID(),
        kommando: tekst ? { ...kommando, brevtekst: tekst } : kommando,
      },
    });
    return { svar, tekst };
  }

  async function medPaaberopelse() {
    const sakId = await opprettKjernesak(o);
    const { svar } = await send(sakId, PAABEROPELSE);
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    return sakId;
  }

  it.each([
    ['med begrunnelse', 'Tilbudet gjelder ny fundamentering.'],
    ['uten begrunnelse', ''],
  ])('%s: serveren lagrer tilbudet med teksten TE så (LV-U2)', async (_navn, utdypning) => {
    const sakId = await medPaaberopelse();
    const kommando = vederlagskrav(250000, utdypning);
    const { svar, tekst } = await send(sakId, kommando);
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    expect(svar.kropp.versjon).toBe(3);
    expect(tekst).not.toBeNull();

    const lagret = (await hent(sakId)).journal.at(-1)!;
    const avsnitt = lagret.data.brevtekst as { laast: string; utdypning?: string }[];
    expect(avsnitt.map((a) => a.laast)).toEqual(tekst);
    if (utdypning) expect(avsnitt[0].utdypning).toBe(utdypning);
    else expect(avsnitt.every((a) => a.utdypning === undefined)).toBe(true);
  });

  it('en kravpost med beløp som ikke er over null, avvises med UGYLDIG_FORM og ingen brevkontroll', async () => {
    const sakId = await medPaaberopelse();
    const { svar, tekst } = await send(sakId, vederlagskrav(0));
    expect(tekst).toBeNull();
    expect(svar.status).toBe(400);
    expect(svar.kropp.error).toBe('UGYLDIG_FORM');
  });
});
