/**
 * Grunnlagskravet og vederlagskravet fra skjemaene mot dagens TS-server (#667).
 * Kommandoene bygges av `grunnlagskrav` og `vederlagskrav` i klienten, og den
 * låste teksten er den `brevFor` gir, slik skjemaene gjør. Vederlagskravet fra
 * `TeVederlagForm` bygges av `buildEventData` og `vederlagskommandoFraSkjema` (#718). Saken er en prøvesak fra
 * testverktøyet. Kildene til forventningene er formatet i kjernen (bare tilbud i
 * prøven, OV-U1), avgjørelsen om valgfri utdypning (oppdragsgiver 17.10, #667)
 * og LV-U2.
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
import { grunnlagskrav } from '../../src/lib/kjernesak/grunnlagskrav.ts';
import {
  vederlagskrav,
  vederlagskommandoFraSkjema,
} from '../../src/lib/kjernesak/vederlagskrav.ts';
import { brevFor } from '../../src/lib/kjernesak/brevtekst.ts';
import { somJournal } from '../../src/lib/kjernesak/journal.ts';
import { buildEventData, getDefaults } from '../../src/lib/domain/vederlagSubmissionDomain.ts';
import type { Kjernesak } from '../../src/lib/api/kjerne.ts';
import { KJERNE } from '../../kjerne/versjon.ts';

const GRUNNLAG = grunnlagskrav({
  hovedkategori: 'ENDRING',
  underkategori: 'IRREG',
  datoer: { paalegg_mottatt: '2026-10-01' },
  endringsordre: '',
  utdypning: 'Byggherren har pålagt en annen fundamentering.',
});

describe.skipIf(!TESTBASE_URL)('vederlagskravet fra saksbildet mot TS-serveren', () => {
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

  /** Som skjemaet: teksten kjernen lager for saken slik den er lastet, og kravet med den. */
  async function send(sakId: string, kommando: Record<string, unknown>) {
    const sak = await hent(sakId);
    const brev = brevFor(kommando, sakId, 'TE', somJournal(sakId, sak.journal), KJERNE);
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

  async function medGrunnlag() {
    const sakId = await opprettKjernesak(o);
    const { svar } = await send(sakId, GRUNNLAG);
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    return sakId;
  }

  it.each([
    ['med begrunnelse', 'Tilbudet gjelder ny fundamentering.'],
    ['uten begrunnelse', ''],
  ])('%s: serveren lagrer tilbudet med teksten TE så (LV-U2)', async (_navn, utdypning) => {
    const sakId = await medGrunnlag();
    const kommando = vederlagskrav({ metode: 'FASTPRIS_TILBUD', beloep: 250000, utdypning });
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

  it('et beløp som ikke er over null, avvises med UGYLDIG_FORM og ingen brevkontroll', async () => {
    const sakId = await medGrunnlag();
    const { svar, tekst } = await send(
      sakId,
      vederlagskrav({ metode: 'FASTPRIS_TILBUD', beloep: 0, utdypning: '' })
    );
    expect(tekst).toBeNull();
    expect(svar.status).toBe(400);
    expect(svar.kropp.error).toBe('UGYLDIG_FORM');
  });

  it('regningsarbeid sendt utenom skjemaet avvises med UGYLDIG_FORM (OV-U1)', async () => {
    const sakId = await medGrunnlag();
    const { svar } = await send(sakId, {
      type: 'krav',
      spor: 'vederlag',
      innhold: { metode: 'regningsarbeid', beloep: 250000 },
    });
    expect(svar.status).toBe(400);
    expect(svar.kropp.error).toBe('UGYLDIG_FORM');
  });

  it('kravet TeVederlagForm lager, lagres med teksten TE så og begrunnelsen som utdypning', async () => {
    const sakId = await medGrunnlag();
    // Dataene skjemaet bygger for en TS-sak: bare tilbud, uten særskilte krav og vedlegg.
    const data = {
      ...buildEventData(
        {
          ...getDefaults({ scenario: 'new' }),
          metode: 'FASTPRIS_TILBUD',
          belopDirekte: 250000,
          begrunnelse: '<p>Tilbudet gjelder <strong>ny</strong> fundamentering.</p>',
        },
        { scenario: 'new', grunnlagEventId: 'fra-tidslinjen' }
      ),
      vedlegg_ids: [],
    };
    const kommando = vederlagskommandoFraSkjema(data);
    expect(kommando).toEqual({
      type: 'krav',
      spor: 'vederlag',
      innhold: { metode: 'tilbud', beloep: 250000 },
      utdypning: 'Tilbudet gjelder ny fundamentering.',
    });

    const { svar, tekst } = await send(sakId, kommando);
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    const lagret = (await hent(sakId)).journal.at(-1)!;
    const avsnitt = lagret.data.brevtekst as { laast: string; utdypning?: string }[];
    expect(avsnitt.map((a) => a.laast)).toEqual(tekst);
    expect(avsnitt[0].utdypning).toBe('Tilbudet gjelder ny fundamentering.');
  });
});
