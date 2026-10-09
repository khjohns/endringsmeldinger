/**
 * TS-serveren mot testbasen (#274, P2-2 og P2-3). Hver avvisning har en
 * kontrollsak som bare skiller seg i det ene som prøves, og journalen skal være
 * uendret etter avvisningen.
 *
 * Forventningene har kilde utenfor koden:
 * - tilgang og CSRF: sikkerhetsinvariantene i AGENTS.md og `require_auth`,
 *   `require_project_access` og `require_contract_role` i Flask;
 * - serverfeltene, `expected_version` og `null` som utelatt: kontrakten
 *   (`serverfelt`, `konvolutt`, `batchkonvolutt` i `docs/domenetabell/kontrakt.json`);
 * - regelversjonen: B-13 i hovedplanen;
 * - godkjenningspakken: grensen fra #272, avgjort for port 2 i #274, og
 *   GR-01 i domenetabellen (subsidiært vederlag når grunnlaget er avslått).
 * Krever `KOE_TESTBASE_URL`, som databasetestene i Python.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grunnlagsbasis } from '../kjerne/godkjenning.ts';
import { vurderKommando } from '../kjerne/kommando.ts';
import { offentligTilstand } from '../kjerne/offentlig.ts';
import { anvend, projiser, type Sak } from '../kjerne/sak.ts';
import { leggTil, lesJournal, Versjonskonflikt } from '../server/lager.ts';
import { KORPUS, kommando, type Handling } from './korpus.ts';
import { serverbane } from './serverbane.ts';
import {
  kall,
  lagOppsett,
  opprettSak,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Svar,
  type Testbruker,
} from './testbase.ts';

const GRUNNLAG: Handling = { handling: 'grunnlag', underkategori: 'EO' };

describe.skipIf(!TESTBASE_URL)('TS-serveren mot testbasen', () => {
  let o: Oppsett;
  let server: KjorendeServer;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o.teammedlemmer);
  });

  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  const journal = async (sakId: string) =>
    (
      await o.pool.query<{ event_id: string }>(
        'SELECT event_id::text FROM hendelse WHERE sak_id = $1 ORDER BY versjon',
        [sakId]
      )
    ).rows.map((r) => r.event_id);

  const send = (
    bruker: Testbruker | null,
    kropp: unknown,
    valg: { prosjektId?: string; csrf?: string | null; sti?: string } = {}
  ) =>
    kall(server.url, valg.sti ?? '/api/events', {
      bruker,
      prosjektId: valg.prosjektId ?? o.prosjekt.id,
      kropp,
      ...('csrf' in valg ? { csrf: valg.csrf } : {}),
    });

  const grunnlag = (sakId: string, endring: Record<string, unknown> = {}, forventet = 1) => ({
    sak_id: sakId,
    expected_version: forventet,
    event: { ...kommando(GRUNNLAG, projiser(sakId, []))[1], ...endring },
  });

  /** Prøv avvisningen og kontrollsaken på hver sin nye sak. */
  async function avvistOgKontroll(
    avvisning: (sakId: string) => Promise<Svar>,
    kontroll: (sakId: string) => Promise<Svar>
  ) {
    const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
    const for_ = await journal(sakId);
    const svar = await avvisning(sakId);
    expect(await journal(sakId), 'en avvisning skrev i journalen').toEqual(for_);
    const kontrollsak = await opprettSak(o.pool, o.prosjekt.id, o.te);
    const k = await kontroll(kontrollsak);
    if (k.status !== 201)
      throw new Error(`Kontrollsaken ble avvist: ${k.status} ${JSON.stringify(k.kropp)}`);
    return svar;
  }

  describe('tilgang', () => {
    it('uten sesjon gir 401', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(null, grunnlag(s)),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([401, 'UNAUTHORIZED']);
    });

    it('en utløpt sesjon gir 401', async () => {
      const utlopt: Testbruker = { ...o.te, token: randomUUID() };
      await o.pool.query(
        "INSERT INTO app_sessions (token_hash, user_id, csrf_token, expires_at) VALUES (encode(sha256($1::bytea), 'hex'), $2, $3, now() - interval '1 second')",
        [utlopt.token, o.te.id, o.te.csrf]
      );
      const svar = await avvistOgKontroll(
        (s) => send(utlopt, grunnlag(s)),
        (s) => send(o.te, grunnlag(s))
      );
      expect(svar.status).toBe(401);
    });

    it('en sesjonskapsel med ugyldig prosentkoding gir 401, ikke 500', async () => {
      const svar = await avvistOgKontroll(
        (s) => send({ ...o.te, token: '%E0%A4%A' }, grunnlag(s)),
        (s) => send(o.te, grunnlag(s))
      );
      expect(svar.status).toBe(401);
    });

    it('ugyldig JSON uten sesjon gir 401, ikke 400', async () => {
      const ugyldig = (bruker: Testbruker | null) =>
        fetch(`${server.url}/api/events`, {
          method: 'POST',
          headers: {
            'X-Project-ID': o.prosjekt.id,
            'Content-Type': 'application/json',
            ...(bruker
              ? { Cookie: `__Host-koe_session=${bruker.token}`, 'X-CSRF-Token': bruker.csrf }
              : {}),
          },
          body: '{ugyldig',
        });
      expect([(await ugyldig(null)).status, (await ugyldig(o.te)).status]).toEqual([401, 400]);
    });

    it('manglende CSRF gir 403', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(o.te, grunnlag(s), { csrf: null }),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([403, 'CSRF validation failed']);
    });

    it('feil CSRF gir 403', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(o.te, grunnlag(s), { csrf: o.bh.csrf }),
        (s) => send(o.te, grunnlag(s))
      );
      expect(svar.status).toBe(403);
    });

    it('et prosjekt brukeren ikke er medlem i, gir 403', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(o.te, grunnlag(s), { prosjektId: o.annetProsjekt.id }),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([403, 'FORBIDDEN']);
    });

    it('en sak i et annet prosjekt gir 403, også for et medlem der', async () => {
      // `utenfor` er TE i det andre prosjektet og sender med det prosjektet i hodet.
      const svar = await avvistOgKontroll(
        (s) => send(o.utenfor, grunnlag(s), { prosjektId: o.annetProsjekt.id }),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([403, 'FORBIDDEN']);
    });

    it('et annet prosjekt i nyttelasten gir 403', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(o.te, { ...grunnlag(s), prosjekt_id: o.annetProsjekt.id }),
        (s) => send(o.te, { ...grunnlag(s), prosjekt_id: o.prosjekt.id })
      );
      expect(svar.status).toBe(403);
    });

    it('en relatert sak i et annet prosjekt gir 403 (RV-07)', async () => {
      const fremmed = await opprettSak(o.pool, o.annetProsjekt.id, o.utenfor);
      const svar = await avvistOgKontroll(
        (s) => send(o.te, { ...grunnlag(s), relatert_sak_id: fremmed }),
        (s) => send(o.te, { ...grunnlag(s), relatert_sak_id: s })
      );
      expect(svar.status).toBe(403);
    });

    it('uten kontraktsteam gir 403', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(o.utenTeam, grunnlag(s)),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([403, 'CONTRACT_ROLE_REQUIRED']);
    });

    it('byggherren kan ikke sende TEs hendelse: 403', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(o.bh, grunnlag(s)),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([403, 'CONTRACT_ROLE_REQUIRED']);
    });

    it('tilstanden kan ikke leses i et annet prosjekt', async () => {
      const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
      const nektet = await kall(server.url, `/api/cases/${sakId}/state`, {
        bruker: o.utenfor,
        prosjektId: o.annetProsjekt.id,
      });
      const kontroll = await kall(server.url, `/api/cases/${sakId}/state`, {
        bruker: o.te,
        prosjektId: o.prosjekt.id,
      });
      expect([nektet.status, kontroll.status]).toEqual([403, 200]);
    });
  });

  describe('serverfeltene', () => {
    it.each(['event_id', 'tidsstempel'])('%s fra klienten avvises', async (felt) => {
      const svar = await avvistOgKontroll(
        (s) =>
          send(
            o.te,
            grunnlag(s, { [felt]: felt === 'event_id' ? randomUUID() : new Date().toISOString() })
          ),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([400, 'VALIDATION_ERROR']);
    });

    it('aktørfeltene overskrives med innloggingen og kontraktssiden', async () => {
      const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
      const svar = await send(
        o.te,
        grunnlag(sakId, { aktor_id: o.bh.id, aktor_rolle: 'BH', aktor_team_id: o.prosjekt.bhTeam })
      );
      expect(svar.status).toBe(201);
      const rad = await o.pool.query(
        'SELECT event_id::text, actorid, actorrole, actorteam FROM hendelse WHERE sak_id = $1 AND versjon = 2',
        [sakId]
      );
      expect(rad.rows[0]).toEqual({
        event_id: svar.kropp.event_id,
        actorid: o.te.id,
        actorrole: 'TE',
        actorteam: o.prosjekt.teTeam.replaceAll('-', ''),
      });
    });

    it('event_id er en UUID satt av serveren, og tidspunktet leses i Pythons form', async () => {
      const bane = await serverbane(server, o);
      await bane.send(GRUNNLAG);
      const h = bane.journal.at(-1)!;
      expect(h.event_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
      expect(h.tidsstempel).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{6})?\+00:00$/);
      const lagret = await o.pool.query<{ ms: string }>(
        'SELECT (extract(epoch FROM time) * 1000)::bigint::text AS ms FROM hendelse WHERE event_id = $1',
        [h.event_id]
      );
      expect(Date.parse(h.tidsstempel)).toBe(Number(lagret.rows[0].ms));
    });

    it('en referanse som ikke er en UUID, avvises før lagring', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(o.te, grunnlag(s, { refererer_til_event_id: 'ikke-en-uuid' })),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([400, 'VALIDATION_ERROR']);
    });
  });

  describe('konvolutten', () => {
    it('en PDF fra klienten avvises før manglende felt, som i Flask', async () => {
      const svar = await send(o.te, { pdf_base64: 'x' });
      expect([svar.status, svar.kropp.error]).toEqual([400, 'CLIENT_PDF_NOT_ACCEPTED']);
    });

    it('en tom hendelse er en manglende hendelse', async () => {
      const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
      const svar = await send(o.te, { sak_id: sakId, expected_version: 1, event: {} });
      expect([svar.status, svar.kropp.error]).toEqual([400, 'MISSING_PARAMETERS']);
    });

    it('expected_version som ikke er et heltall, avvises etter kontrakten', async () => {
      // Flask sammenlikner verdien og svarer 409. Kontrakten (`konvolutt`) krever et heltall.
      const svar = await avvistOgKontroll(
        (s) => send(o.te, { ...grunnlag(s), expected_version: '1' }),
        (s) => send(o.te, grunnlag(s))
      );
      expect([svar.status, svar.kropp.error]).toEqual([400, 'VALIDATION_ERROR']);
    });

    it('et internt notat i journalen vises ikke', async () => {
      // Synlighetsfilteret er ikke portet, så TS-serveren viser notatet til ingen.
      const bane = await serverbane(server, o);
      await bane.send(GRUNNLAG);
      await o.pool.query(
        `INSERT INTO hendelse (event_id, source, type, subject, actorid, actorrole, actorteam, data, prosjekt_id, sak_id, event_type, versjon)
         VALUES ($1, 'x', 'no.oslo.koe.internt_notat', $2, $3, 'TE', $4, '{"tekst": "Internt"}', $5, $2, 'internt_notat', 3)`,
        [randomUUID(), bane.sakId, o.te.id, o.prosjekt.teTeam.replaceAll('-', ''), o.prosjekt.id]
      );
      const svar = await kall(server.url, `/api/cases/${bane.sakId}/journal`, {
        bruker: o.te,
        prosjektId: o.prosjekt.id,
      });
      expect(svar.kropp.version).toBe(3);
      expect(svar.kropp.events?.map((h) => h.event_type)).toEqual([
        'sak_opprettet',
        'grunnlag_opprettet',
      ]);
    });
  });

  describe('versjon og regelversjon', () => {
    it('feil expected_version gir 409 VERSION_CONFLICT', async () => {
      const svar = await avvistOgKontroll(
        (s) => send(o.te, grunnlag(s, {}, 0)),
        (s) => send(o.te, grunnlag(s, {}, 1))
      );
      expect(svar.status).toBe(409);
      expect(svar.kropp).toMatchObject({
        error: 'VERSION_CONFLICT',
        expected_version: 0,
        current_version: 1,
      });
    });

    it('to samtidige sendinger på samme versjon: én lagres, den andre får 409', async () => {
      const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
      const svar = await Promise.all([send(o.te, grunnlag(sakId)), send(o.te, grunnlag(sakId))]);
      expect(svar.map((s) => s.status).sort()).toEqual([201, 409]);
      expect(await journal(sakId)).toHaveLength(2);
    });

    it('lageret avviser en andre skriving på samme versjon', async () => {
      // Under ruta: lagringsgarantien alene, uten rutas lesing av versjonen først.
      const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
      const tolket = (sak: Sak) => {
        const u = vurderKommando(sak, kommando(GRUNNLAG, sak)[1], {
          sakId,
          aktorId: o.te.id,
          rolle: 'TE',
          teamId: null,
          tidspunkt: () => new Date(),
          nyId: randomUUID,
        });
        if (!u.godtatt) throw new Error(u.avvisning.melding);
        return u.hendelse;
      };
      const sak = projiser(sakId, (await lesJournal(o.pool, sakId, o.prosjekt.id)).hendelser);
      expect(await leggTil(o.pool, o.prosjekt.id, [tolket(sak)], 1)).toBe(2);
      await expect(leggTil(o.pool, o.prosjekt.id, [tolket(sak)], 1)).rejects.toBeInstanceOf(
        Versjonskonflikt
      );
      expect(await journal(sakId)).toHaveLength(2);
    });

    it('et svar regnet med en annen regelversjon gir RULE_VERSION', async () => {
      const bane = await serverbane(server, o);
      await bane.send(GRUNNLAG);
      const svar = (regelversjon: number) => {
        const [, k] = kommando({ handling: 'grunnlagssvar', resultat: 'godkjent' }, bane.sak());
        return {
          sak_id: bane.sakId,
          expected_version: bane.journal.length,
          event: { ...k, data: { ...(k.data as object), regelversjon } },
        };
      };
      const for_ = await journal(bane.sakId);
      const avvist = await send(o.bh, svar(4));
      expect(avvist.status).toBe(400);
      expect(avvist.kropp).toMatchObject({
        error: 'BUSINESS_RULE_VIOLATION',
        rule: 'RULE_VERSION',
      });
      expect(await journal(bane.sakId)).toEqual(for_);
      expect((await send(o.bh, svar(5))).status).toBe(201);
    });
  });

  describe('lagring og gjenlesing', () => {
    it('tilstanden i svaret er lik den gjenleste, og lik projeksjonen av radene', async () => {
      const bane = await serverbane(server, o);
      for (const h of KORPUS.prefikser.omforent) {
        const [rolle, k] = kommando(h, bane.sak());
        const svar = await send(rolle === 'TE' ? o.te : o.bh, {
          sak_id: bane.sakId,
          expected_version: bane.journal.length,
          event: k,
        });
        expect(svar.status, h.handling).toBe(201);
        await bane.oppdater();
        expect(svar.kropp.state).toEqual(bane.tilstand());
      }
      const { hendelser } = await lesJournal(o.pool, bane.sakId, o.prosjekt.id);
      expect(offentligTilstand(projiser(bane.sakId, hendelser))).toEqual(bane.tilstand());
      expect(bane.tilstand().overordnet_status).toBe('OMFORENT');
    });

    it('en batch med én avvist hendelse lagrer ingenting', async () => {
      const lag = (sakId: string, handlinger: Handling[]) => {
        const sak = projiser(sakId, []);
        const events = handlinger.map((h) => kommando(h, sak)[1]);
        return { sak_id: sakId, expected_version: 1, events };
      };
      const gyldige: Handling[] = [GRUNNLAG, { handling: 'vederlagskrav', belop: 100000 }];
      // Andre vederlagskrav i samme batch bryter CREATE_ONCE.
      const svar = await avvistOgKontroll(
        (s) =>
          send(o.te, lag(s, [...gyldige, { handling: 'vederlagskrav', belop: 50000 }]), {
            sti: '/api/events/batch',
          }),
        (s) => send(o.te, lag(s, gyldige), { sti: '/api/events/batch' })
      );
      expect(svar.status).toBe(400);
      expect(svar.kropp).toMatchObject({
        error: 'BUSINESS_RULE_VIOLATION',
        rule: 'CREATE_ONCE',
        failed_event_type: 'vederlag_krav_sendt',
      });
    });

    it('en batch med en ugyldig hendelse sist lagrer ingenting', async () => {
      const lag = (sakId: string, ugyldig: boolean) => {
        const sak = projiser(sakId, []);
        const krav = kommando({ handling: 'vederlagskrav', belop: 100000 }, sak)[1];
        return {
          sak_id: sakId,
          expected_version: 1,
          events: [
            kommando(GRUNNLAG, sak)[1],
            ugyldig ? { ...krav, data: { ...(krav.data as object), metode: 'UKJENT' } } : krav,
          ],
        };
      };
      const svar = await avvistOgKontroll(
        (s) => send(o.te, lag(s, true), { sti: '/api/events/batch' }),
        (s) => send(o.te, lag(s, false), { sti: '/api/events/batch' })
      );
      expect([svar.status, svar.kropp.error]).toEqual([400, 'VALIDATION_ERROR']);
    });
  });

  describe('godkjenningspakken (P2-3)', () => {
    /** En sak med grunnlag, vederlag og frist fra TE, uten svar. */
    async function sakMedKrav() {
      const bane = await serverbane(server, o);
      for (const h of KORPUS.prefikser.krav_eo) {
        const u = await bane.send(h);
        if (!u.godtatt) throw new Error(`Forutsetning: ${h.handling}: ${u.avvisning.melding}`);
      }
      return bane;
    }

    /** Byggherrens svar slik klienten bygger dem: hvert svar regnes på saken etter de foregående i pakken. */
    function pakke(sak: Sak, handlinger: Handling[]) {
      let naa = sak;
      return handlinger.map((h) => {
        const [, k] = kommando(h, naa);
        const element = { kommando: k, grunnlagsbasis: grunnlagsbasis(naa) };
        const u = vurderKommando(naa, k, {
          sakId: sak.sakId,
          aktorId: o.bh.id,
          rolle: 'BH',
          teamId: null,
          tidspunkt: () => new Date(),
          nyId: randomUUID,
        });
        if (!u.godtatt) throw new Error(`Forutsetning: ${h.handling}: ${u.avvisning.melding}`);
        naa = anvend(naa, u.hendelse);
        return element;
      });
    }

    const kontroller = (sakId: string, elementer: unknown, bruker: Testbruker = o.bh) =>
      kall(server.url, `/api/cases/${sakId}/godkjenningspakke`, {
        bruker,
        prosjektId: o.prosjekt.id,
        kropp: { elementer },
      });

    const AVSLAG: Handling = { handling: 'grunnlagssvar', resultat: 'avslatt' };
    const VEDERLAG: Handling = { handling: 'vederlagssvar', vurdering: 'godkjent' };

    it('vederlaget vurderes mot grunnlagssvaret i pakken (GR-01)', async () => {
      const bane = await sakMedKrav();
      const for_ = await journal(bane.sakId);
      // Elementene i omvendt rekkefølge: serveren vurderer i domenerekkefølge.
      const elementer = pakke(bane.sak(), [AVSLAG, VEDERLAG]).reverse();
      const svar = await kontroller(bane.sakId, elementer);
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
      expect(svar.kropp.state?.grunnlag.bh_resultat).toBe('avslatt');
      expect(svar.kropp.state?.er_subsidiaert_vederlag).toBe(true);
      expect((svar.kropp.events ?? []).map((h) => h.event_type)).toEqual([
        'respons_grunnlag',
        'respons_vederlag',
      ]);
      expect(await journal(bane.sakId), 'pakken publiseres ikke').toEqual(for_);
    });

    it('et vederlagssvar vurdert mot grunnlaget uten pakkens svar, avvises', async () => {
      const bane = await sakMedKrav();
      const [grunnlagssvar, vederlagssvar] = pakke(bane.sak(), [AVSLAG, VEDERLAG]);
      const utdatert = { ...vederlagssvar, grunnlagsbasis: grunnlagsbasis(bane.sak()) };
      const svar = await kontroller(bane.sakId, [grunnlagssvar, utdatert]);
      expect(svar.status).toBe(400);
      expect(svar.kropp).toMatchObject({ rule: 'BASIS_CHANGED', failed_track: 'vederlag' });
      expect((await kontroller(bane.sakId, [grunnlagssvar, vederlagssvar])).status).toBe(200);
    });

    it('en foreldet kravreferanse avvises', async () => {
      const bane = await sakMedKrav();
      const foreldet = pakke(bane.sak(), [AVSLAG, VEDERLAG]);
      const u = await bane.send({ handling: 'vederlagskrav_ny_versjon', belop: 120000 });
      if (!u.godtatt) throw new Error('Forutsetning: ny kravversjon avvist');
      const svar = await kontroller(bane.sakId, foreldet);
      expect(svar.status).toBe(400);
      expect(svar.kropp).toMatchObject({ rule: 'CLAIM_CHANGED', failed_track: 'vederlag' });
      expect((await kontroller(bane.sakId, pakke(bane.sak(), [AVSLAG, VEDERLAG]))).status).toBe(
        200
      );
    });

    it('regelversjonen kontrolleres for hvert element', async () => {
      const bane = await sakMedKrav();
      const [g, v] = pakke(bane.sak(), [AVSLAG, VEDERLAG]);
      const gammel = {
        ...v,
        kommando: { ...v.kommando, data: { ...(v.kommando.data as object), regelversjon: 4 } },
      };
      const svar = await kontroller(bane.sakId, [g, gammel]);
      expect(svar.kropp).toMatchObject({ rule: 'RULE_VERSION', failed_track: 'vederlag' });
    });

    it('en grunnlagsbasis som er null, avvises som utelatt, ikke som serverfeil', async () => {
      const bane = await sakMedKrav();
      const [g, v] = pakke(bane.sak(), [AVSLAG, VEDERLAG]);
      const svar = await kontroller(bane.sakId, [g, { ...v, grunnlagsbasis: null }]);
      expect([svar.status, svar.kropp.rule]).toEqual([400, 'BASIS_CHANGED']);
    });

    it('en hendelsestype som er en arvet nøkkel, er ikke et svar', async () => {
      const bane = await sakMedKrav();
      const svar = await kontroller(bane.sakId, [{ kommando: { event_type: 'constructor' } }]);
      expect([svar.status, svar.kropp.rule]).toEqual([400, 'VALIDATION_ERROR']);
    });

    it('bare byggherren kan sende en pakke', async () => {
      const bane = await sakMedKrav();
      const elementer = pakke(bane.sak(), [AVSLAG, VEDERLAG]);
      expect((await kontroller(bane.sakId, elementer, o.te)).status).toBe(403);
      expect((await kontroller(bane.sakId, elementer, o.bh)).status).toBe(200);
    });
  });
});

/** Lageret leser bare det autoriserte prosjektet. */
describe.skipIf(!TESTBASE_URL)('lageret', () => {
  it('leser ikke en sak i et annet prosjekt', async () => {
    const o = await lagOppsett();
    try {
      const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
      expect((await lesJournal(o.pool, sakId, o.annetProsjekt.id)).hendelser).toEqual([]);
      expect((await lesJournal(o.pool, sakId, o.prosjekt.id)).hendelser).toHaveLength(1);
    } finally {
      await rydd(o);
    }
  });
});
