/**
 * Nedlastingen av et sendt brev som PDF (#1054) mot testbasen. Krever
 * `KOE_SQLSERVER_TILKOBLING`. Tilgangen for hver inngang (sesjon, prosjekt, saken i et
 * annet prosjekt, kontraktsrollen) prøves i `register.test.ts`. Lesingen går under
 * radsikkerheten med prosjektet i konteksten, så et brev i en annen sak eller et annet
 * prosjekt finnes ikke her.
 *
 * Kildene: bare et sendt brev kan lastes ned (oppdragsgiver 20.10, #1054), PDF-en
 * gjengir den låste brevteksten tro (LV-U2), og et registrert brev har ikke noe
 * dokument fra appen (LV-U11).
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gjengirTro } from '../../kjerne/frosset/brevtekst.ts';
import type { Avsnitt } from '../../kjerne/typer.ts';
import type { Avhengigheter, Forespoersel } from '../app.ts';
import { BREVRUTER } from '../brev.ts';
import { lesBrevPdf } from '../brevpdf.ts';
import { lesSaken } from '../lager.ts';
import { dokumentnavn } from '../levering.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  sendKommando,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';

describe.skipIf(!TESTBASE_URL)('nedlasting av et sendt brev som PDF', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  let sak: string;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
    sak = await opprettKjernesak(o);
    const krav = await sendKommando(server.url, o, sak, { versjon: 1 });
    if (krav.status !== 201) throw new Error(`Kravet ble avvist: ${JSON.stringify(krav.kropp)}`);
    // Et registrert varsel må vise til dokumentasjonen av brevet som ble sendt utenfor appen.
    const opplastet = await fetch(`${server.url}/api/kjerne/saker/${sak}/vedlegg`, {
      method: 'POST',
      headers: {
        Cookie: `__Host-koe_session=${o.te.token}`,
        'X-CSRF-Token': o.te.csrf,
        'X-Project-ID': o.prosjekt.id,
        'Content-Type': 'application/octet-stream',
        'X-Filnavn': 'varsel.pdf',
      },
      body: new Uint8Array(Buffer.from('%PDF-1.7\nVarselet\n')),
    });
    if (opplastet.status !== 201) throw new Error(`Vedlegget ble avvist: ${opplastet.status}`);
    const vedleggId = ((await opplastet.json()) as { vedlegg: { vedlegg_id: string } }).vedlegg
      .vedlegg_id;
    const varsel = await kall(server.url, `/api/kjerne/saker/${sak}/kommandoer`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: {
        expected_version: 2,
        kommando_id: randomUUID(),
        kommando: {
          type: 'varsel',
          spor: 'frist',
          hjemmel: '33.4',
          sendt: '2026-10-01',
          dokumentasjon: [vedleggId],
        },
      },
    });
    if (varsel.status !== 201)
      throw new Error(`Varselet ble avvist: ${JSON.stringify(varsel.kropp)}`);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  const lest = () =>
    lesSaken(o.datalag.kjoeretid.pool, { aktor: o.te.id, prosjekt: o.prosjekt.id }, sak);
  /**
   * Behandleren med aktøren og prosjektet fra sesjonen. Ruta står ikke i `RUTER` før
   * #1070 er merget, så tilgangen foran behandleren prøves der, i `register.test.ts`.
   */
  const lastNed = async (bruker: Testbruker, eventId: string, sakId = sak) => {
    const [status, kropp, hoder = {}] = await BREVRUTER[0]!.behandle(
      {
        bruker: { id: bruker.id },
        prosjekt: { prosjektId: o.prosjekt.id },
        sakId,
        ressurs: eventId,
      } as Forespoersel,
      { datalag: o.datalag.kjoeretid.pool } as Required<Avhengigheter>
    );
    return { status, kropp, hoder: hoder as Record<string, string> };
  };

  it('TE og BH laster ned det sendte kravet som PDF med den låste brevteksten og navnet fra Catenda', async () => {
    const { journal, oppdrag } = await lest();
    const kravet = journal[1]!;
    const o1 = oppdrag.find((x) => x.event_id === kravet.event_id)!;
    const brevtekst = (kravet.data as { brevtekst: Avsnitt[] }).brevtekst;
    for (const bruker of [o.te, o.bh]) {
      const svar = await lastNed(bruker, kravet.event_id);
      expect(svar.status).toBe(200);
      expect(svar.hoder).toMatchObject({
        'content-type': 'application/pdf',
        'x-content-type-options': 'nosniff',
        'cache-control': 'no-store',
      });
      const navn = dokumentnavn(o1.innhold, o1.dokumentnoekkel);
      expect(svar.hoder['content-disposition']).toBe(
        `attachment; filename="${navn}"; filename*=UTF-8''${navn}`
      );
      const pdf = new Uint8Array(svar.kropp as Buffer);
      expect(gjengirTro(lesBrevPdf(pdf), brevtekst)).toBe(true);
    }
  });

  it('et registrert brev er sendt utenfor appen og gir 409 uten PDF', async () => {
    const { journal } = await lest();
    const svar = await lastNed(o.te, journal[2]!.event_id);
    expect(svar.status).toBe(409);
    expect((svar.kropp as { error: string }).error).toBe('BREV_SENDT_UTENFOR_APPEN');
  });

  it('en hendelse som ikke er et brev i saken, gir 404: sak_opprettet, en ukjent ID og et brev i en annen sak', async () => {
    const { journal } = await lest();
    const annenSak = await opprettKjernesak(o);
    const forsok = [
      { eventId: journal[0]!.event_id, sakId: sak },
      { eventId: randomUUID(), sakId: sak },
      { eventId: journal[1]!.event_id, sakId: annenSak },
    ];
    for (const { eventId, sakId } of forsok) {
      const svar = await lastNed(o.te, eventId, sakId);
      expect(svar.status, JSON.stringify({ eventId, sakId })).toBe(404);
      expect((svar.kropp as { error: string }).error).toBe('BREV_FINNES_IKKE');
    }
  });

  it('en sak i et annet prosjekt finnes ikke under radsikkerheten og gir 404', async () => {
    const utenfor = await opprettKjernesak(o, o.annetProsjekt);
    const svar = await lastNed(o.te, randomUUID(), utenfor);
    expect(svar.status).toBe(404);
    expect((svar.kropp as { error: string }).error).toBe('SAK_FINNES_IKKE');
  });
});
