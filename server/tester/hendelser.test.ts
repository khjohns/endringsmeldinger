/**
 * Behandlingen av innboksen fra webhooken mot testbasen i SQL Server (W-1b.1 og W-1b.2, #819),
 * med forsøkene som venter (#963) og kommentarene tilbake til topicen.
 * Forventningene har kilde i KT-U6 (en topic fra TE gir bare opprettelsen, med topicens
 * tittel), KT-U7 (en topic fra BH gir ingen sak), arbeidsvalget i #819 (endringsordre,
 * forsering og ukjent type gir ingen sak), #741 punkt 17 (ingen ny sak av en topic som
 * hører til en sak eller er laget av integrasjonen), kravene i #819 om normalisert
 * topic-ID, og INT-04 (uten entydig forfatter eller side ingen sak). Kroppen er ikke
 * signert, så forfatteren, typen og tittelen kommer fra topicen i Catenda, og en kropp som
 * avviker, lager ingen sak og ingen brukerrad (orkestratorens kontroll av #957).
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import {
  CatendaUtilgjengelig,
  TOPICTYPE,
  UsikkertCatendautfall,
  type Innboksoppslag,
  type Kommentar,
  type Topic,
} from '../catenda.ts';
import {
  behandleEnHendelse,
  FORSOEK_UTEN_TOPIC,
  skrivEnKommentar,
  type Jobbavhengigheter,
} from '../jobber.ts';
import { transaksjon, type Forbindelse, type Pool } from '../datalag.ts';
import { enGang, tidsavbrudd } from './forbindelse.ts';
import { behandle, nesteInnkommende } from '../hendelser.ts';
import { lesJournal } from '../lager.ts';
import { mottaHendelse } from '../webhook.ts';
import {
  catendaFra,
  lagOppsett,
  rydd,
  somJobbkjoerer,
  TESTBASE_URL,
  type Oppsett,
} from './testbase.ts';

const INTEGRASJONEN = randomUUID().replaceAll('-', '');

interface Utfall {
  utfall: string;
  prosjekt_id: string | null;
  sak_id: string | null;
  catenda_topic_id: string | null;
}

describe.skipIf(!TESTBASE_URL)('behandlingen av innboksen fra webhooken (#819)', () => {
  let o: Oppsett;
  let board: string;
  let innboks: Innboksoppslag;
  let avh: Jobbavhengigheter;
  const logg = { info() {}, warn() {}, error() {} };
  /** Topicene slik Catenda har dem, med boardet og topicen i `catendaId()`-formen. */
  const iCatenda = new Map<string, Topic>();
  const noekkel = (board: string, topic: string) => `${catendaId(board)}/${catendaId(topic)}`;
  /** Kommentarene på topicene i Catenda, med samme nøkkel. */
  const kommentarer = new Map<string, Kommentar[]>();
  const kommentarerPaa = (topic: string) => kommentarer.get(noekkel(board, topic)) ?? [];

  beforeAll(async () => {
    o = await lagOppsett();
    const team = catendaFra(o.teammedlemmer);
    innboks = {
      ...team,
      medlemmer: async () =>
        [o.te, o.bh, o.utenTeam].map((b) => ({
          subjekt: catendaId(b.subjekt)!,
          epost: `${b.id}@test.example`,
          navn: 'Testbruker',
          rolle: 'member' as const,
        })),
      integrasjonensBruker: async () => INTEGRASJONEN,
      topic: async (b, t) => iCatenda.get(noekkel(b, t)) ?? null,
      kommentarer: async (b, t) => kommentarer.get(noekkel(b, t)) ?? [],
      opprettKommentar: async (b, t, tekst) => {
        const id = randomUUID();
        kommentarer.set(noekkel(b, t), [...(kommentarer.get(noekkel(b, t)) ?? []), { id, tekst }]);
        return id;
      },
    };
    avh = {
      datalag: o.datalag.kjoeretid.pool,
      catenda: { opprettTopic: async () => 'ingen' },
      dokumenter: {} as Jobbavhengigheter['dokumenter'],
      innboks,
      saksadresse: (p, sak) => `https://app.example.no/${p}/${sak}/kjerne`,
      logg,
    };
    board = (
      await o.datalag.base.pool
        .request()
        .input('p', o.prosjekt.id)
        .query<{ board: string }>(
          `SELECT LOWER(CONVERT(nvarchar(36), topic_board_id)) AS board
             FROM koe.catenda_project_configs WHERE internal_project_id = @p`
        )
    ).recordset[0].board;
    // Identiteten fra Catenda er brukeren i oppsettet, som etter innloggingen.
    for (const b of [o.te, o.bh, o.utenTeam])
      await o.datalag.base.pool
        .request()
        .input('u', b.id)
        .input('s', catendaId(b.subjekt))
        .query(
          `INSERT koe.app_identities (id, user_id, provider, issuer, subject)
           VALUES (NEWID(), @u, N'catenda', N'https://api.catenda.com', @s)`
        );
  }, 120_000);

  afterAll(async () => {
    if (o) await rydd(o);
  });

  /**
   * Kroppen for en ny topic, med topicen slik Catenda har den på boardet. `iKroppen`
   * overstyrer bare kroppen, som en forfalsket hendelse.
   */
  const kropp = (
    topic: string,
    {
      forfatter = catendaId(o.te.subjekt) as string | null,
      type = TOPICTYPE,
      boardId = board,
      tittel = 'Rystelser fra spuntingen',
      iKroppen = {} as { forfatter?: string; type?: string; tittel?: string },
    } = {}
  ) => {
    iCatenda.set(noekkel(boardId, topic), { tittel, type, forfatter });
    return {
      createdBy: {
        id: iKroppen.forfatter ?? forfatter,
        type: 'user',
        email: 'forfatter@test.example',
        name: 'Forfatter',
      },
      event: { id: randomUUID(), type: 'issue.created' },
      issue: {
        id: topic,
        boardId,
        title: iKroppen.tittel ?? tittel,
        type: iKroppen.type ?? type,
      },
      project: { id: catendaId(o.prosjekt.catendaProsjekt) },
    };
  };

  const brukerrader = async () =>
    (
      await somEier<{ id: string; email: string; name: string; subject: string | null }>(
        `SELECT LOWER(CONVERT(nvarchar(36), u.id)) AS id, u.email, u.name, i.subject
           FROM koe.app_users u LEFT JOIN koe.app_identities i ON i.user_id = u.id
          ORDER BY u.id, i.subject`,
        {}
      )
    ).recordset;

  /** Mottar hendelsen som webhooken og behandler den eldste i innboksen. */
  const behandleKropp = async (k: ReturnType<typeof kropp>, hendelsestype = 'issue.created') => {
    const hendelseId = randomUUID();
    await mottaHendelse(avh.datalag, { id: hendelseId, type: hendelsestype }, JSON.stringify(k));
    expect(await behandleEnHendelse(avh)).toBe(true);
    const rad = (
      await somEier<Utfall>(
        `SELECT b.utfall, b.prosjekt_id, b.sak_id, b.catenda_topic_id, b.melding
           FROM koe.innkommende_behandling b
           JOIN koe.innkommende_hendelse i ON i.id = b.innkommende_hendelse_id
          WHERE i.hendelse_id = @h`,
        { h: hendelseId }
      )
    ).recordset;
    expect(rad).toHaveLength(1);
    return rad[0];
  };

  /** Mottar hendelsen som webhooken og gir ID-en i innboksen. */
  const motta = async (k: ReturnType<typeof kropp>) => {
    const hendelseId = randomUUID();
    await mottaHendelse(avh.datalag, { id: hendelseId, type: 'issue.created' }, JSON.stringify(k));
    return (
      await somEier<{ id: string }>(
        'SELECT CONVERT(nvarchar(20), id) AS id FROM koe.innkommende_hendelse WHERE hendelse_id = @h',
        { h: hendelseId }
      )
    ).recordset[0].id;
  };
  const utfallFor = async (id: string) =>
    (
      await somEier<Utfall>(
        `SELECT utfall, prosjekt_id, sak_id, catenda_topic_id FROM koe.innkommende_behandling
          WHERE innkommende_hendelse_id = @id`,
        { id }
      )
    ).recordset;
  const forsoekFor = async (id: string, steg = 'behandling') =>
    (
      await somEier<{ antall: number }>(
        `SELECT COUNT(*) AS antall FROM koe.innkommende_forsoek
          WHERE innkommende_hendelse_id = @id AND steg = @steg`,
        { id, steg }
      )
    ).recordset[0].antall;
  /** Løkka `timer` timer fram, forbi ventetiden etter forsøkene så langt. */
  const senere = (timer: number, fra = avh): Jobbavhengigheter => ({
    ...fra,
    klokke: () => new Date(Date.now() + timer * 3_600_000),
  });

  const somEier = <T>(setning: string, parametre: Record<string, unknown>) => {
    const r = o.datalag.base.pool.request();
    for (const [navn, verdi] of Object.entries(parametre)) r.input(navn, verdi);
    return r.query<T>(setning);
  };

  const sakerForTopic = async (topic: string) =>
    (
      await somJobbkjoerer<{ sak_id: string; catenda_board_id: string }>(
        o,
        'SELECT sak_id, catenda_board_id FROM koe.sak_catenda_topic WHERE catenda_topic_id = @t',
        { t: topic }
      )
    ).recordset;

  it('KT-U6: en topic fra TE gir en sak med topicens tittel, koblet til topicen, og ingen ny topic', async () => {
    const topic = randomUUID();
    const utfall = await behandleKropp(kropp(topic));
    expect(utfall).toMatchObject({
      utfall: 'sak_opprettet',
      prosjekt_id: o.prosjekt.id,
      catenda_topic_id: topic,
    });
    expect(await sakerForTopic(topic)).toEqual([
      { sak_id: utfall.sak_id, catenda_board_id: board },
    ]);
    const [hendelse] = await transaksjon(
      avh.datalag,
      { aktor: o.te.id, prosjekt: o.prosjekt.id },
      (foresp) => lesJournal(foresp, utfall.sak_id!, false)
    );
    expect(hendelse).toMatchObject({
      event_type: 'sak_opprettet',
      aktor_id: o.te.id,
      aktor_rolle: 'TE',
      data: { sakstittel: 'Rystelser fra spuntingen', sakstype: 'standard' },
    });
    const jobber = await somJobbkjoerer<{ n: number }>(
      o,
      'SELECT COUNT(*) AS n FROM koe.jobb WHERE sak_id = @s',
      { s: utfall.sak_id }
    );
    expect(jobber.recordset[0].n).toBe(0);
  });

  it('#819: topic-ID-en normaliseres, så samme topic med store bokstaver og uten bindestreker gir ingen sak til (#741 punkt 17)', async () => {
    const topic = randomUUID();
    expect((await behandleKropp(kropp(topic.toUpperCase()))).utfall).toBe('sak_opprettet');
    const igjen = await behandleKropp(kropp(topic.replaceAll('-', '')));
    expect(igjen).toMatchObject({ utfall: 'topic_har_sak', sak_id: null, catenda_topic_id: topic });
    expect(await sakerForTopic(topic)).toHaveLength(1);
  });

  it('KT-U7: en topic fra BH gir ingen sak, og utfallet står i innboksen', async () => {
    const topic = randomUUID();
    const utfall = await behandleKropp(kropp(topic, { forfatter: catendaId(o.bh.subjekt) }));
    expect(utfall).toMatchObject({
      utfall: 'topic_fra_bh',
      prosjekt_id: o.prosjekt.id,
      sak_id: null,
    });
    expect(await sakerForTopic(topic)).toEqual([]);
  });

  it.each(['Endringsordre', 'Forsering', 'Noe annet'])(
    'arbeidsvalget i #819: en topic av typen «%s» gir ingen sak',
    async (type) => {
      const topic = randomUUID();
      expect((await behandleKropp(kropp(topic, { type }))).utfall).toBe('sakstype_ikke_stoettet');
      expect(await sakerForTopic(topic)).toEqual([]);
    }
  );

  it('#741 punkt 17: en topic integrasjonen har laget, gir ingen sak', async () => {
    const topic = randomUUID();
    const utfall = await behandleKropp(kropp(topic, { forfatter: INTEGRASJONEN }));
    expect(utfall.utfall).toBe('laget_av_integrasjonen');
    expect(await sakerForTopic(topic)).toEqual([]);
  });

  it.each<[string, () => string | null, string]>([
    ['en topic uten forfatter i Catenda', () => null, 'ukjent_forfatter'],
    ['et medlem uten kontraktsteam', () => catendaId(o.utenTeam.subjekt), 'ukjent_side'],
    ['en Catenda-bruker uten medlemskap', () => randomUUID().replaceAll('-', ''), 'ukjent_side'],
  ])('INT-04: %s gir ingen sak og ingen ny brukerrad', async (_, forfatter, forventet) => {
    const topic = randomUUID();
    const foer = await brukerrader();
    expect((await behandleKropp(kropp(topic, { forfatter: forfatter() }))).utfall).toBe(forventet);
    expect(await sakerForTopic(topic)).toEqual([]);
    expect(await brukerrader()).toEqual(foer);
  });

  it.each<[string, () => Parameters<typeof kropp>[1], string]>([
    [
      'en forfatter i kroppen som er et TE-medlem, når topicen er laget av en som ikke er medlem',
      () => ({
        forfatter: randomUUID().replaceAll('-', ''),
        iKroppen: { forfatter: catendaId(o.te.subjekt)! },
      }),
      'ukjent_side',
    ],
    [
      'en forfatter i kroppen fra TE, når topicen er laget av BH',
      () => ({
        forfatter: catendaId(o.bh.subjekt),
        iKroppen: { forfatter: catendaId(o.te.subjekt)! },
      }),
      'topic_fra_bh',
    ],
    [
      'typen krav om endringsordre i kroppen, når topicen er en endringsordre',
      () => ({ type: 'Endringsordre', iKroppen: { type: TOPICTYPE } }),
      'sakstype_ikke_stoettet',
    ],
  ])(
    'en forfalsket kropp med %s gir ingen sak og ingen endret brukerrad',
    async (_, valg, forventet) => {
      const topic = randomUUID();
      const foer = await brukerrader();
      expect((await behandleKropp(kropp(topic, valg()))).utfall).toBe(forventet);
      expect(await sakerForTopic(topic)).toEqual([]);
      expect(await brukerrader()).toEqual(foer);
    }
  );

  it('sakstittelen er topicens tittel i Catenda, ikke tittelen i kroppen', async () => {
    const topic = randomUUID();
    const foer = await brukerrader();
    const utfall = await behandleKropp(
      kropp(topic, { tittel: 'Tittelen i Catenda', iKroppen: { tittel: 'Valgt tittel' } })
    );
    expect(utfall.utfall).toBe('sak_opprettet');
    const [hendelse] = await transaksjon(
      avh.datalag,
      { aktor: o.te.id, prosjekt: o.prosjekt.id },
      (foresp) => lesJournal(foresp, utfall.sak_id!, false)
    );
    expect(hendelse.data).toMatchObject({ sakstittel: 'Tittelen i Catenda' });
    expect(await brukerrader()).toEqual(foer);
  });

  it('#963: en topic Catenda ikke finner på boardet, prøves igjen og gir ugyldig_hendelse først etter FORSOEK_UTEN_TOPIC forsøk', async () => {
    const topic = randomUUID();
    const k = kropp(topic);
    iCatenda.delete(noekkel(board, topic));
    const id = await motta(k);
    for (let i = 1; i < FORSOEK_UTEN_TOPIC; i++) {
      expect(await behandleEnHendelse(senere(i))).toBe(true);
      expect(await utfallFor(id)).toEqual([]);
    }
    expect(await forsoekFor(id)).toBe(FORSOEK_UTEN_TOPIC - 1);
    expect(await behandleEnHendelse(senere(FORSOEK_UTEN_TOPIC))).toBe(true);
    expect(await utfallFor(id)).toEqual([
      expect.objectContaining({
        utfall: 'ugyldig_hendelse',
        sak_id: null,
        catenda_topic_id: topic,
      }),
    ]);
    expect(await sakerForTopic(topic)).toEqual([]);
  });

  it('#963: forsøk der Catenda var nede, teller ikke mot FORSOEK_UTEN_TOPIC; den første 404 etterpå gir ikke ugyldig_hendelse', async () => {
    const topic = randomUUID();
    const k = kropp(topic);
    const funnet = iCatenda.get(noekkel(board, topic))!;
    iCatenda.delete(noekkel(board, topic));
    const id = await motta(k);
    const nede = (timer: number) => ({
      ...senere(timer),
      innboks: {
        ...innboks,
        topic: async () => {
          throw new CatendaUtilgjengelig('nede');
        },
      },
    });
    for (let i = 1; i < FORSOEK_UTEN_TOPIC; i++)
      expect(await behandleEnHendelse(nede(i))).toBe(true);
    expect(await behandleEnHendelse(senere(FORSOEK_UTEN_TOPIC))).toBe(true);
    expect(await utfallFor(id)).toEqual([]);
    iCatenda.set(noekkel(board, topic), funnet);
    expect(await behandleEnHendelse(senere(FORSOEK_UTEN_TOPIC + 1))).toBe(true);
    expect((await utfallFor(id))[0]?.utfall).toBe('sak_opprettet');
  });

  it('#963: en topic Catenda finner ved et senere forsøk, gir saken', async () => {
    const topic = randomUUID();
    const k = kropp(topic);
    const funnet = iCatenda.get(noekkel(board, topic))!;
    iCatenda.delete(noekkel(board, topic));
    const id = await motta(k);
    expect(await behandleEnHendelse(avh)).toBe(true);
    iCatenda.set(noekkel(board, topic), funnet);
    expect(await behandleEnHendelse(senere(1))).toBe(true);
    expect((await utfallFor(id))[0]?.utfall).toBe('sak_opprettet');
  });

  it('#963: når topicoppslaget i Catenda feiler, lagres forsøket, hendelsen venter, og et senere forsøk behandler den', async () => {
    const topic = randomUUID();
    const id = await motta(kropp(topic));
    const nede = {
      ...avh,
      innboks: {
        ...innboks,
        topic: async () => {
          throw new CatendaUtilgjengelig('nede');
        },
      },
    };
    expect(await behandleEnHendelse(nede)).toBe(true);
    expect(await utfallFor(id)).toEqual([]);
    expect(await forsoekFor(id)).toBe(1);
    expect(await nesteInnkommende(avh.datalag)).toBeNull();
    expect(await behandleEnHendelse(senere(1))).toBe(true);
    expect(await sakerForTopic(topic)).toHaveLength(1);
  });

  it('#963: én hendelse som feiler forbigående, stenger ikke innboksen; neste hendelse behandles i samme runde', async () => {
    const [feiler, virker] = [randomUUID(), randomUUID()];
    const forste = await motta(kropp(feiler));
    const andre = await motta(kropp(virker));
    const delvisNede = {
      ...avh,
      innboks: {
        ...innboks,
        topic: async (b: string, t: string) => {
          if (catendaId(t) === catendaId(feiler)) throw new CatendaUtilgjengelig('nede');
          return innboks.topic(b, t);
        },
      },
    };
    while (await behandleEnHendelse(delvisNede));
    expect(await utfallFor(forste)).toEqual([]);
    expect((await utfallFor(andre))[0]?.utfall).toBe('sak_opprettet');
    expect(await behandleEnHendelse(senere(1))).toBe(true);
    expect((await utfallFor(forste))[0]?.utfall).toBe('sak_opprettet');
  });

  it('en topic på et annet board enn prosjektets gir ingen sak', async () => {
    const topic = randomUUID();
    expect((await behandleKropp(kropp(topic, { boardId: randomUUID() }))).utfall).toBe(
      'ukjent_prosjekt'
    );
    expect(await sakerForTopic(topic)).toEqual([]);
  });

  it('en tom tittel avvises av kjernen og gir ingen sak', async () => {
    const topic = randomUUID();
    expect((await behandleKropp(kropp(topic, { tittel: '  ' }))).utfall).toBe('avvist');
    expect(await sakerForTopic(topic)).toEqual([]);
  });

  it('en annen hendelsestype enn en ny topic behandles ikke i W-1b.1', async () => {
    expect((await behandleKropp(kropp(randomUUID()), 'issue.modified')).utfall).toBe(
      'ikke_behandlet_type'
    );
  });

  it('et nytt forsøk etter et avbrudd før utfallet er lagret, gir samme sak fra kvitteringen', async () => {
    const topic = randomUUID();
    await mottaHendelse(
      avh.datalag,
      { id: randomUUID(), type: 'issue.created' },
      JSON.stringify(kropp(topic))
    );
    const rad = (await nesteInnkommende(avh.datalag))!;
    const foerste = await behandle({ datalag: avh.datalag, catenda: innboks }, rad);
    const andre = await behandle({ datalag: avh.datalag, catenda: innboks }, rad);
    expect(foerste.utfall).toBe('sak_opprettet');
    expect(andre).toEqual(foerste);
    expect(await behandleEnHendelse(avh)).toBe(true);
    expect(await sakerForTopic(topic)).toEqual([
      { sak_id: foerste.sakId, catenda_board_id: board },
    ]);
  });

  it('#963: et nytt forsøk etter en lagret sak gir saken fra kvitteringen, også når forfatteren ikke lenger er i et kontraktsteam', async () => {
    const topic = randomUUID();
    const id = await motta(kropp(topic));
    const rad = (await nesteInnkommende(avh.datalag))!;
    // Saken lagres, men utfallet gjør det ikke, som når registrerBehandling feiler.
    const foerste = await behandle({ datalag: avh.datalag, catenda: innboks }, rad);
    expect(foerste.utfall).toBe('sak_opprettet');
    const utenTeam = {
      ...avh,
      innboks: { ...innboks, teammedlemmer: async () => new Set<string>() },
    };
    expect(await behandle({ datalag: avh.datalag, catenda: utenTeam.innboks }, rad)).toEqual(
      foerste
    );
    expect(await behandleEnHendelse(senere(1, utenTeam))).toBe(true);
    expect(await utfallFor(id)).toEqual([
      expect.objectContaining({ utfall: 'sak_opprettet', sak_id: foerste.sakId }),
    ]);
    expect(await sakerForTopic(topic)).toEqual([
      { sak_id: foerste.sakId, catenda_board_id: board },
    ]);
    // Kontrollsak: uten kvittering gir samme forfatter nå ingen side.
    const kontroll = await motta(kropp(randomUUID()));
    expect(await behandleEnHendelse(senere(2, utenTeam))).toBe(true);
    expect(await utfallFor(kontroll)).toEqual([expect.objectContaining({ utfall: 'ukjent_side' })]);
  });

  /**
   * Innboksoppslagene med `nye` lagt til i Catenda etter siste synkronisering, og
   * `iTeTeamet` av dem i TE-teamet. `hentinger` teller kallene på medlemslisten.
   */
  const medNyeMedlemmer = (nye: string[], iTeTeamet: string[]) => {
    const teller = { hentinger: 0 };
    const oppslag: Innboksoppslag = {
      ...innboks,
      medlemmer: async (c) => {
        teller.hentinger++;
        return [
          ...(await innboks.medlemmer(c)),
          ...nye.map((s) => ({
            subjekt: s,
            epost: `${s}@test.example`,
            navn: 'Testbruker',
            rolle: 'member' as const,
          })),
        ];
      },
      teammedlemmer: async (c, team) => {
        const medlemmer = await innboks.teammedlemmer(c, team);
        return team === catendaId(o.prosjekt.teTeam)
          ? new Set([...medlemmer, ...iTeTeamet])
          : medlemmer;
      },
    };
    return { teller, avh: { ...avh, innboks: oppslag } };
  };
  const listensAlder = async () =>
    (
      await somEier<{ alder: number }>(
        `SELECT DATEDIFF(second, synced_at, SYSUTCDATETIME()) AS alder
           FROM koe.app_membership_sync WHERE project_id = @p`,
        { p: o.prosjekt.id }
      )
    ).recordset[0].alder;
  const harMedlemskap = async (subjekt: string) =>
    (
      await somEier<{ antall: number }>(
        `SELECT COUNT(*) AS antall FROM koe.app_project_memberships
          WHERE project_id = @p AND catenda_subject = @s AND active = 1`,
        { p: o.prosjekt.id, s: subjekt }
      )
    ).recordset[0].antall > 0;

  it('#963: en TE-forfatter som er lagt til i Catenda etter siste synkronisering mens listen er fersk, får saken, og listen hentes én gang', async () => {
    const [iTeamet, utenTeam] = [randomUUID(), randomUUID()].map((u) => u.replaceAll('-', ''));
    const { teller, avh: medNye } = medNyeMedlemmer([iTeamet, utenTeam], [iTeamet]);
    expect(await listensAlder()).toBeLessThan(60);
    expect(await harMedlemskap(iTeamet)).toBe(false);

    const topic = randomUUID();
    const id = await motta(kropp(topic, { forfatter: iTeamet }));
    expect(await behandleEnHendelse(medNye)).toBe(true);
    const [utfall] = await utfallFor(id);
    expect(utfall).toEqual(expect.objectContaining({ utfall: 'sak_opprettet' }));
    expect(await sakerForTopic(topic)).toEqual([
      { sak_id: utfall.sak_id, catenda_board_id: board },
    ]);
    expect(teller.hentinger).toBe(1);

    // Kontrollsak: et nytt medlem uten kontraktsteam får medlemskapet, men ingen side.
    const kontroll = await motta(kropp(randomUUID(), { forfatter: utenTeam }));
    expect(await behandleEnHendelse(medNye)).toBe(true);
    expect(await utfallFor(kontroll)).toEqual([expect.objectContaining({ utfall: 'ukjent_side' })]);
    expect(await harMedlemskap(utenTeam)).toBe(true);
  });

  it('#963: når den lagrede listen er for gammel, skrives listen behandlingen alt har hentet, og Catenda kalles én gang', async () => {
    await somEier(
      `UPDATE koe.app_membership_sync SET synced_at = DATEADD(hour, -2, SYSUTCDATETIME())
        WHERE project_id = @p`,
      { p: o.prosjekt.id }
    );
    const { teller, avh: gammel } = medNyeMedlemmer([], []);
    const id = await motta(kropp(randomUUID()));
    expect(await behandleEnHendelse(gammel)).toBe(true);
    expect(await utfallFor(id)).toEqual([expect.objectContaining({ utfall: 'sak_opprettet' })]);
    expect(teller.hentinger).toBe(1);
    expect(await listensAlder()).toBeLessThan(60);
  });

  it('når Catenda ikke svarer, lagres ikke noe utfall, og et senere forsøk behandler hendelsen', async () => {
    const topic = randomUUID();
    await mottaHendelse(
      avh.datalag,
      { id: randomUUID(), type: 'issue.created' },
      JSON.stringify(kropp(topic))
    );
    const nede = {
      ...avh,
      innboks: {
        ...innboks,
        teammedlemmer: async () => {
          throw new CatendaUtilgjengelig('nede');
        },
      },
    };
    expect(await behandleEnHendelse(nede)).toBe(true);
    expect(await sakerForTopic(topic)).toEqual([]);
    expect(await behandleEnHendelse(senere(1))).toBe(true);
    expect(await sakerForTopic(topic)).toHaveLength(1);
    expect(await behandleEnHendelse(senere(2))).toBe(false);
  });

  /**
   * Svaret på første COMMIT i poolen går tapt etter at serveren har committet, som ved et
   * tidsavbrudd (`UsikkertUtfall`). Lånene etter det får forbindelsen urørt.
   */
  const tapSvaretPaaFoersteCommit = (pool: Pool) => {
    const utlaan = pool as unknown as { acquire: (...a: unknown[]) => Promise<Forbindelse> };
    const ekte = utlaan.acquire;
    let tapt = false;
    utlaan.acquire = (...a) => {
      // Et lån med tilbakekall er en forespørsel utenfor en transaksjon.
      if (typeof a.at(-1) === 'function') return ekte.apply(pool, a);
      return ekte.apply(pool, a).then((f) => {
        enGang(f, 'commitTransaction', (commit) => (cb, ...rest) => {
          if (tapt) return commit(cb, ...rest);
          tapt = true;
          utlaan.acquire = ekte;
          return commit(() => cb(tidsavbrudd()), ...rest);
        });
        return f;
      });
    };
    return () => (utlaan.acquire = ekte);
  };

  it('etter et usikkert utfall av COMMIT for saken lagres ikke noe utfall, og et senere forsøk får saken fra kvitteringen (code-review av #957)', async () => {
    const topic = randomUUID();
    const id = await motta(kropp(topic));
    const tilbake = tapSvaretPaaFoersteCommit(avh.datalag);
    try {
      expect(await behandleEnHendelse(avh)).toBe(true);
    } finally {
      tilbake();
    }
    // Saken er lagret, men utfallet er ikke det.
    const lagret = await sakerForTopic(topic);
    expect(lagret).toHaveLength(1);
    expect(await utfallFor(id)).toEqual([]);
    expect(await forsoekFor(id)).toBe(1);
    expect(await behandleEnHendelse(senere(1))).toBe(true);
    expect(await utfallFor(id)).toEqual([
      expect.objectContaining({ utfall: 'sak_opprettet', sak_id: lagret[0].sak_id }),
    ]);
    expect(await sakerForTopic(topic)).toEqual(lagret);
  });

  /** Skriver kommentarene for alle utfallene som venter på en, som løkka. */
  const skrivKommentarene = async (fra = avh) => {
    while (await skrivEnKommentar(fra));
  };
  const kvitteringFor = async (id: string) =>
    (
      await somEier<{ kommentar_id: string }>(
        'SELECT kommentar_id FROM koe.topic_kommentar WHERE innkommende_hendelse_id = @id',
        { id }
      )
    ).recordset;
  const BH_KOMMENTAR = 'Saken er ikke opprettet i appen. Bare TE kan opprette en KOE-sak der.';

  it('arbeidsvalget under OV-U1 i #819: når saken er lagret, får topicen én kommentar med saksnummeret og lenken (KT-U6)', async () => {
    const topic = randomUUID();
    const id = await motta(kropp(topic));
    await skrivKommentarene();
    expect(kommentarerPaa(topic)).toEqual([]);
    expect(await behandleEnHendelse(avh)).toBe(true);
    const [{ sak_id }] = await utfallFor(id);
    await skrivKommentarene();
    const [kommentar, ...flere] = kommentarerPaa(topic);
    expect(flere).toEqual([]);
    expect(kommentar.tekst).toBe(
      `KOE-saken ${sak_id} er opprettet i appen: https://app.example.no/${o.prosjekt.id}/${sak_id}/kjerne. ` +
        'Topicen er ikke et varsel eller krav i appen. Varsel og krav sendes fra saken i appen.'
    );
    expect(await kvitteringFor(id)).toEqual([{ kommentar_id: kommentar.id }]);
    await skrivKommentarene(senere(1));
    expect(kommentarerPaa(topic)).toHaveLength(1);
  });

  it('KT-U7: en topic fra BH får én kommentar om at bare TE kan opprette en KOE-sak, også når hendelsen kommer to ganger', async () => {
    const topic = randomUUID();
    const k = kropp(topic, { forfatter: catendaId(o.bh.subjekt) });
    const ider = [await motta(k), await motta(k)];
    while (await behandleEnHendelse(avh));
    for (const id of ider) expect((await utfallFor(id))[0]?.utfall).toBe('topic_fra_bh');
    await skrivKommentarene();
    expect(kommentarerPaa(topic).map((k) => k.tekst)).toEqual([BH_KOMMENTAR]);
    const [id] = kommentarerPaa(topic).map((k) => k.id);
    for (const h of ider) expect(await kvitteringFor(h)).toEqual([{ kommentar_id: id }]);
  });

  it('arbeidsvalget under OV-U1 i #819: en topic av typen forsering får kommentaren om at typen ikke kan behandles ennå', async () => {
    const topic = randomUUID();
    expect((await behandleKropp(kropp(topic, { type: 'Forsering' }))).utfall).toBe(
      'sakstype_ikke_stoettet'
    );
    await skrivKommentarene();
    expect(kommentarerPaa(topic).map((k) => k.tekst)).toEqual([
      'Saken er ikke opprettet i appen. Topicer av denne typen kan ikke behandles i appen ennå.',
    ]);
  });

  it.each<[string, () => string | null]>([
    ['laget av integrasjonen', () => INTEGRASJONEN],
    ['uten forfatter', () => null],
    ['fra et medlem uten kontraktsteam', () => catendaId(o.utenTeam.subjekt)],
  ])(
    'en topic %s får ingen kommentar; ingen vedtak sier at den skal ha en',
    async (_, forfatter) => {
      const topic = randomUUID();
      await behandleKropp(kropp(topic, { forfatter: forfatter() }));
      await skrivKommentarene();
      expect(kommentarerPaa(topic)).toEqual([]);
    }
  );

  it('et tapt svar etter at kommentaren er skrevet, gir ingen kommentar til ved neste forsøk', async () => {
    const topic = randomUUID();
    const id = await motta(kropp(topic, { forfatter: catendaId(o.bh.subjekt) }));
    expect(await behandleEnHendelse(avh)).toBe(true);
    const tapt = {
      ...avh,
      innboks: {
        ...innboks,
        opprettKommentar: async (b: string, t: string, tekst: string) => {
          await innboks.opprettKommentar(b, t, tekst);
          throw new UsikkertCatendautfall('tapt svar');
        },
      },
    };
    await skrivKommentarene(tapt);
    expect(kommentarerPaa(topic)).toHaveLength(1);
    expect(await kvitteringFor(id)).toEqual([]);
    expect(await forsoekFor(id, 'kommentar')).toBe(1);
    await skrivKommentarene(senere(1));
    expect(kommentarerPaa(topic).map((k) => k.tekst)).toEqual([BH_KOMMENTAR]);
    expect(await kvitteringFor(id)).toEqual([{ kommentar_id: kommentarerPaa(topic)[0].id }]);
  });

  it('uten oppslagene for innboksen behandler løkka den ikke', async () => {
    await mottaHendelse(
      avh.datalag,
      { id: randomUUID(), type: 'issue.created' },
      JSON.stringify(kropp(randomUUID()))
    );
    expect(await behandleEnHendelse({ ...avh, innboks: undefined })).toBe(false);
    expect(await behandleEnHendelse(avh)).toBe(true);
  });
});
