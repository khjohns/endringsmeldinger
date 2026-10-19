/**
 * Behandlingen av innboksen fra webhooken mot testbasen i SQL Server (W-1b.1, #819).
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
import { CatendaUtilgjengelig, TOPICTYPE, type Innboksoppslag, type Topic } from '../catenda.ts';
import { behandleEnHendelse, type Jobbavhengigheter } from '../jobber.ts';
import { transaksjon, UsikkertUtfall } from '../datalag.ts';
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
    };
    avh = {
      datalag: o.datalag.kjoeretid.pool,
      catenda: { opprettTopic: async () => 'ingen' },
      dokumenter: {} as Jobbavhengigheter['dokumenter'],
      innboks,
      saksadresse: () => '',
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

  it('en topic Catenda ikke finner på boardet, gir ingen sak', async () => {
    const topic = randomUUID();
    const k = kropp(topic);
    iCatenda.delete(noekkel(board, topic));
    expect(await behandleKropp(k)).toMatchObject({
      utfall: 'ugyldig_hendelse',
      sak_id: null,
      catenda_topic_id: topic,
    });
    expect(await sakerForTopic(topic)).toEqual([]);
  });

  it('når topicoppslaget i Catenda feiler, lagres ikke noe utfall, og neste runde behandler hendelsen', async () => {
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
        topic: async () => {
          throw new CatendaUtilgjengelig('nede');
        },
      },
    };
    await expect(behandleEnHendelse(nede)).rejects.toBeInstanceOf(CatendaUtilgjengelig);
    expect((await nesteInnkommende(avh.datalag))?.kropp).toContain(topic);
    expect(await behandleEnHendelse(avh)).toBe(true);
    expect(await sakerForTopic(topic)).toHaveLength(1);
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

  it('når Catenda ikke svarer, lagres ikke noe utfall, og neste runde behandler hendelsen', async () => {
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
    await expect(behandleEnHendelse(nede)).rejects.toBeInstanceOf(CatendaUtilgjengelig);
    expect((await nesteInnkommende(avh.datalag))?.kropp).toContain(topic);
    expect(await behandleEnHendelse(avh)).toBe(true);
    expect(await sakerForTopic(topic)).toHaveLength(1);
    expect(await behandleEnHendelse(avh)).toBe(false);
  });

  it('etter et usikkert utfall lagres ikke noe utfall, og neste runde får saken (code-review av #957)', async () => {
    const topic = randomUUID();
    await mottaHendelse(
      avh.datalag,
      { id: randomUUID(), type: 'issue.created' },
      JSON.stringify(kropp(topic))
    );
    const usikker = {
      ...avh,
      innboks: {
        ...innboks,
        teammedlemmer: async () => {
          throw new UsikkertUtfall('usikkert');
        },
      },
    };
    await expect(behandleEnHendelse(usikker)).rejects.toBeInstanceOf(UsikkertUtfall);
    expect((await nesteInnkommende(avh.datalag))?.kropp).toContain(topic);
    expect(await behandleEnHendelse(avh)).toBe(true);
    expect(await sakerForTopic(topic)).toHaveLength(1);
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
