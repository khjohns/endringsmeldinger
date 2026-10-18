/**
 * Formen på kommando-ID-en og summen, som `koe.er_uuid` og `koe.er_hash` kontrollerer
 * i prosedyrene som tar imot kommandoen (#792 punkt 5). Forventningen har kilde i
 * kontrollene `kvittering_kommando_id_form` og `kvittering_sum` på `koe.kvittering`
 * (`database/migrasjoner/20261018123000_kvittering.sql`): det prosedyrene godtar, må
 * tabellen også godta. Ellers kommer 547 der 51422 er lovet (#605).
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { feilnummer, sql, transaksjon, type Kontekst } from '../datalag.ts';
import { lagOppsett, rydd, TESTBASE_URL, type Oppsett } from './testbase.ts';

const SUM = 'a'.repeat(64);

describe.skipIf(!TESTBASE_URL)('formen på kommandoen i SQL Server', () => {
  let o: Oppsett;
  let te: Kontekst;

  beforeAll(async () => {
    o = await lagOppsett();
    te = {
      aktor: o.te.id,
      prosjekt: o.prosjekt.id,
      side: 'TE',
      team: catendaId(o.prosjekt.teTeam)!,
    };
  }, 240_000);
  afterAll(async () => {
    if (o) await rydd(o);
  }, 60_000);

  const kvittering = (kommandoId: string | null, sum: string | null) =>
    transaksjon(o.datalag.kjoeretid.pool, te, (f) =>
      f()
        .input('kommando_id', sql.NVarChar(4000), kommandoId)
        .input('kommando_sha256', sql.NVarChar(4000), sum)
        .output('sak_id', sql.NVarChar(36))
        .output('event_id', sql.NVarChar(36))
        .output('versjon', sql.Int)
        .execute('koe_api.kvittering')
    );
  const avvisning = (arbeid: Promise<unknown>) =>
    arbeid.then(
      () => undefined,
      (feil: unknown) => ({
        nummer: feilnummer(feil),
        melding: feil instanceof Error ? feil.message : String(feil),
      })
    );

  it('en kommando-ID i formen, uten kvittering, gir ingen kvittering og ingen feil', async () => {
    const r = (await kvittering(randomUUID(), SUM)) as sql.IProcedureResult<unknown>;
    expect(r.output.sak_id).toBe(null);
  });

  it.each<[string, string | null]>([
    ['uten kommando-ID', null],
    ['med store bokstaver', randomUUID().toUpperCase()],
    ['med et mellomrom etter', `${randomUUID()} `],
    ['med et tegn etter', `${randomUUID()}0`],
    ['som ikke er en UUID', 'k-1'],
  ])('en kommando %s avvises (51422)', async (_, id) => {
    const svar = await avvisning(kvittering(id, SUM));
    expect(svar?.nummer).toBe(51422);
    expect(svar?.melding).toMatch(/Kommando-ID-en/);
  });

  it.each<[string, string | null]>([
    ['uten sum', null],
    ['med store bokstaver', 'A'.repeat(64)],
    ['på 63 tegn', 'a'.repeat(63)],
    ['med et mellomrom etter', `${'a'.repeat(63)} `],
  ])('en sum %s avvises (51422)', async (_, sum) => {
    const svar = await avvisning(kvittering(randomUUID(), sum));
    expect(svar?.nummer).toBe(51422);
    expect(svar?.melding).toMatch(/Summen for kommandoen/);
  });
});
