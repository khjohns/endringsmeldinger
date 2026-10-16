/**
 * Grunnlagskravet fra skjemaet for ny sak mot dagens TS-server (#666). Kommandoen
 * bygges av `grunnlagskrav` i klienten, og den låste teksten av `laastBrevtekst`,
 * slik skjemaet gjør. Saken er en prøvesak fra testverktøyet; inngangen for
 * opprettelsen bygges i #370 (FK-7). Kilden til forventningene er VS-U26 (datoen
 * etter kategorien, og at den ikke kan være etter brevets dato), GR-U16 og LV-U2.
 */

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
import { grunnlagskrav, type Grunnlagsvalg } from '../../src/lib/kjernesak/grunnlagskrav.ts';
import { laastBrevtekst } from '../../src/lib/kjernesak/brevtekst.ts';
import type { Kjernesak } from '../../src/lib/api/kjerne.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import type { Journalrad } from '../../kjerne/typer.ts';

const valg = (endring: Partial<Grunnlagsvalg>): Grunnlagsvalg => ({
  hovedkategori: 'ENDRING',
  underkategori: 'IRREG',
  datoer: {},
  endringsordre: '',
  utdypning: 'Byggherren har pålagt en annen fundamentering.',
  ...endring,
});

/** Datoen `dager` etter i dag i norsk tid, på formen ÅÅÅÅ-MM-DD. */
function osloDato(dager: number): string {
  const idag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());
  const dato = new Date(`${idag}T12:00:00Z`);
  dato.setUTCDate(dato.getUTCDate() + dager);
  return dato.toISOString().slice(0, 10);
}

describe.skipIf(!TESTBASE_URL)('grunnlagskravet fra skjemaet mot TS-serveren', () => {
  let o: Oppsett;
  let server: KjorendeServer;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

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
    const journal: Journalrad[] = sak.journal.map((l) => ({
      ...l,
      sak_id: sakId,
      aktor_id: '',
      aktor_team_id: null,
      refererer_til_event_id: null,
    }));
    const tekst = laastBrevtekst(kommando, sakId, 'TE', journal, KJERNE);
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}/kommandoer`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: {
        expected_version: sak.versjon,
        kommando: tekst ? { ...kommando, brevtekst: tekst } : kommando,
      },
    });
    return { svar, tekst };
  }

  it.each([
    ['endring', valg({ datoer: { paalegg_mottatt: '2026-10-01' } }), 'pålegget ble mottatt'],
    [
      'svikt',
      valg({
        hovedkategori: 'SVIKT',
        underkategori: 'GRUNN',
        datoer: { klar_over_forholdet: '2026-10-01' },
      }),
      'TE ble klar over forholdet',
    ],
    [
      'endringsordre',
      valg({ underkategori: 'EO', endringsordre: 'EO-12' }),
      'endringsordren «EO-12»',
    ],
  ])('%s: serveren lagrer kravet med teksten TE så (LV-U2)', async (_navn, v, iTeksten) => {
    const sakId = await opprettKjernesak(o);
    const { svar, tekst } = await send(sakId, grunnlagskrav(v));
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    expect(svar.kropp.versjon).toBe(2);
    expect(tekst?.join(' ')).toContain(iTeksten);
    const lagret = (await hent(sakId)).journal.at(-1)!;
    const avsnitt = lagret.data.brevtekst as { laast: string; utdypning?: string }[];
    expect(avsnitt.map((a) => a.laast)).toEqual(tekst);
    expect(avsnitt[0].utdypning).toBe('Byggherren har pålagt en annen fundamentering.');
  });

  it('en dato etter brevets dato i norsk tid avvises med DATO_ETTER_BREVET (VS-U26)', async () => {
    const sakId = await opprettKjernesak(o);
    const etter = osloDato(2);
    const { svar, tekst } = await send(
      sakId,
      grunnlagskrav(valg({ datoer: { paalegg_mottatt: etter } }))
    );
    // Kjernen lager ingen tekst for kravet, så skjemaet viser ingen brevkontroll.
    expect(tekst).toBeNull();
    expect(svar.status).toBe(400);
    expect(svar.kropp.error).toBe('REGELBRUDD');
    expect(svar.kropp.rule).toBe('DATO_ETTER_BREVET');
    expect(svar.kropp.message).toContain('etter brevets dato');
  });

  it('samme dag som brevet godtas (VS-U26)', async () => {
    const sakId = await opprettKjernesak(o);
    const { svar } = await send(
      sakId,
      grunnlagskrav(valg({ datoer: { paalegg_mottatt: osloDato(0) } }))
    );
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
  });

  it('uten datoen kategorien har, avvises kravet med UGYLDIG_FORM (VS-U26)', async () => {
    const sakId = await opprettKjernesak(o);
    const { svar } = await send(sakId, grunnlagskrav(valg({})));
    expect(svar.status).toBe(400);
    expect(svar.kropp.error).toBe('UGYLDIG_FORM');
    expect(svar.kropp.message).toContain('TE må oppgi datoen pålegget ble mottatt');
  });
});
