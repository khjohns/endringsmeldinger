/**
 * Catenda-klienten mot ekte Catenda gjennom token-brokeren (#902). Steg A leser, steg B
 * skriver og rydder etter seg. Kjøres med `KOE_CATENDA_LIVE=1` fra skyøkta, aldri i CI.
 * Forventningene har kilde i OpenAPI-øyeblikksbildene i `docs/tredjepart-api/`, i B-03
 * eller i oppsettet av testprosjektet; de beviser bare kallene de gjør.
 *
 * Testprosjektet deles med andre. Steg B lager bare topics og dokumenter med navn som
 * begynner med `koe-livetest-`, laster opp bare i `CATENDA_FOLDER_ID`, sletter bare
 * ID-er det har fått i svar i samme kjøring og bruker aldri PUT. Brokeren sletter bare
 * slike ressurser (README i `verktoy/catenda-broker/`).
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { catendaId, uuidMedBindestreker } from '../autorisasjon.ts';
import { kjoerEnJobb, type Jobbavhengigheter } from '../jobber.ts';
import { lesSaken } from '../lager.ts';
import { vedleggsnavn } from '../levering.ts';
import {
  kall as tilServeren,
  type KjorendeServer,
  lagOppsett,
  opprettKjernesak,
  type Oppsett,
  rydd,
  sendKommando,
  somJobbkjoerer,
  startServer,
  TESTBASE_URL,
} from './testbase.ts';
import {
  avvistUtenEndring,
  catendaFraMiljoe,
  CatendaOAuth,
  CatendaUtilgjengelig,
  dokumentleverandoer,
  topicoppretter,
  grunnadresse,
  sammenlignbarDokumentId,
  TOPICTYPE,
  UsikkertCatendautfall,
} from '../catenda.ts';

const LIVE = process.env.KOE_CATENDA_LIVE === '1';

const VARIABLER = [
  'CATENDA_GRUNNADRESSE',
  'CATENDA_CLIENT_ID',
  'CATENDA_CLIENT_SECRET',
  'CATENDA_PROJECT_ID',
  'CATENDA_TOPIC_BOARD_ID',
  'CATENDA_LIBRARY_ID',
] as const;

/** ID-en i formen datalaget lagrer board, bibliotek og mappe i (`UUID` i `datalag.ts`). */
function uuid(navn: (typeof VARIABLER)[number] | 'CATENDA_FOLDER_ID'): string {
  const id = uuidMedBindestreker(process.env[navn]);
  if (!id) throw new Error(`${navn} er ikke en Catenda-ID`);
  return id;
}

function dokumentmaal() {
  return {
    catenda_project_id: uuid('CATENDA_PROJECT_ID'),
    library_id: uuid('CATENDA_LIBRARY_ID'),
    folder_id: process.env.CATENDA_FOLDER_ID ? uuid('CATENDA_FOLDER_ID') : null,
  };
}

const PREFIKS = 'koe-livetest-';

function itemsti(maal: ReturnType<typeof dokumentmaal>): string {
  return `/v2/projects/${maal.catenda_project_id}/libraries/${maal.library_id}/items`;
}
const PDF = new TextEncoder().encode('%PDF-1.4\n%%EOF\n');

describe.skipIf(!LIVE)('Catenda gjennom brokeren', { timeout: 30_000 }, () => {
  let adresse: string;
  let oauth: CatendaOAuth;
  let integrasjon: ReturnType<typeof catendaFraMiljoe>;
  let token: string;
  let prosjekt: string;
  let board: string;

  /** Et kall utenom klienten, for oppslag klienten ikke har (teams, topics, sider). */
  async function hent(sti: string): Promise<unknown> {
    const svar = await fetch(adresse + sti, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    if (svar.status !== 200) {
      // Brokeren svarer selv med `{"feil": …}` når den avviser kallet (#1149).
      const feil = await svar.json().then(
        (data: { feil?: unknown }) => (typeof data?.feil === 'string' ? data.feil : null),
        () => null
      );
      expect.fail(`GET ${sti.split('?')[0]} ga ${svar.status}${feil ? ` (${feil})` : ''}`);
    }
    return svar.json();
  }

  beforeAll(async () => {
    const mangler = VARIABLER.filter((navn) => !process.env[navn]);
    if (mangler.length) throw new Error(`KOE_CATENDA_LIVE=1 uten ${mangler.join(', ')}`);
    // Klienten bygges som i serveren. Innloggingen prøves ikke (#715), så tilbakekallsadressen
    // trengs bare for at oppsettet skal godtas.
    const catenda = catendaFraMiljoe({
      ...process.env,
      CATENDA_LOGIN_REDIRECT_URI: process.env.CATENDA_LOGIN_REDIRECT_URI || 'http://localhost/',
    });
    adresse = grunnadresse(process.env.CATENDA_GRUNNADRESSE!, process.env.APP_ENV);
    oauth = catenda.oauth;
    integrasjon = catenda;
    token = await catenda.integrasjonsnokkel.token();
    prosjekt = catendaId(process.env.CATENDA_PROJECT_ID)!;
    board = uuid('CATENDA_TOPIC_BOARD_ID');
  });

  it('A1: integrasjonens token godtas', async () => {
    await hent(`/v2/projects/${prosjekt}`);
  });

  // `egenId` og `egenBruker` leser integrasjonen i `GET /v2/user`. Brokeren avviser kallet med
  // `broker_avviste` til stien står på listen den slipper gjennom (#1149).
  it('A6: brokeren slipper gjennom GET /v2/user, som egenId og egenBruker leser (#1149)', async () => {
    await hent('/v2/user');
  });

  // `normaliserMedlemmer` kaster ved en rad som ikke er en individuell bruker med en kjent
  // rolle, så det testen viser, er at Catendas svar har formen klienten leser.
  it('A2: medlemslisten normaliseres uten avvik', async () => {
    expect((await oauth.medlemmer(prosjekt, token)).length).toBeGreaterThan(0);
  });

  // Listen over team har formen `member`, med teamet i `user` (`type: 'team'`), som
  // `catendaTeam` i `registrering.ts` leser den. OpenAPI-øyeblikksbildet har ikke GET.
  // `teammedlemmer` kaster ved et medlem som ikke er en individuell bruker.
  it('A3: teamene har bare individuelle medlemmer', async () => {
    const rader = await oauth.samling(`/v2/projects/${prosjekt}/teams`, token);
    const team = rader.flatMap((rad) => {
      const bruker = rad.user as { id?: unknown; type?: unknown } | undefined;
      return bruker?.type === 'team' && typeof bruker.id === 'string' ? [bruker.id] : [];
    });
    expect(team.length).toBeGreaterThan(0);
    for (const id of team) await oauth.teammedlemmer(prosjekt, id, token);
  }, 60_000);

  it('A4: medlemslisten følger page og pageSize, som samling antar', async ({ skip }) => {
    const side = async (nr: number) =>
      (await hent(`/v2/projects/${prosjekt}/members?userType=user&page=${nr}&pageSize=1`)) as {
        user: { id: string };
      }[];
    const [en, to] = await Promise.all([side(1), side(2)]);
    expect(en).toHaveLength(1);
    if (to.length === 0) skip('Testprosjektet har bare ett medlem');
    expect(to).toHaveLength(1);
    expect(to[0].user.id).not.toBe(en[0].user.id);
  });

  it('A5: boardet hører til testprosjektet', async () => {
    expect(await oauth.boardetsProsjekt(board, token)).toBe(catendaId(prosjekt));
  });

  it('A7: et navn som ikke finnes i biblioteket, gir null', async () => {
    const navn = `finnes-ikke-${randomUUID()}.pdf`;
    expect(await oauth.finnDokument(dokumentmaal(), navn, token)).toBeNull();
  });

  // `dokumentreferanser` kaster ved en referanse som verken er et dokument eller en lenke.
  it('A8: dokumentreferansene på boardets topics kan leses', async ({ skip }) => {
    const topics = (await hent(`/opencde/bcf/3.0/projects/${board}/topics`)) as {
      guid: string;
    }[];
    if (topics.length === 0) skip('Boardet har ingen topics');
    for (const { guid } of topics.slice(0, 10)) await oauth.dokumentreferanser(board, guid, token);
  });
  describe('B: skriving', () => {
    /** Det steg B har laget, i rekkefølgen det ble laget. `afterAll` sletter baklengs. */
    const laget: { hva: string; sti: string }[] = [];
    /** Hvert kall klienten sendte i steg B, med status, eller hvorfor `fetch` kastet. */
    const sendt: { metode: string; sti: string; status: number | 'ikke sendt' | 'kastet' }[] = [];
    /** Det som kan være laget uten at steg B fikk ID-en, og som derfor ikke kan slettes. */
    const usikre: string[] = [];
    let maal: ReturnType<typeof dokumentmaal>;
    let topic: string | undefined;
    let dokument: string | undefined;
    let dokumentnavn: string | undefined;

    async function kall(metode: string, sti: string, json?: object): Promise<Response> {
      return fetch(adresse + sti, {
        method: metode,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(json ? { 'Content-Type': 'application/json' } : {}),
        },
        body: json ? JSON.stringify(json) : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      });
    }

    beforeAll(() => {
      if (!process.env.CATENDA_FOLDER_ID)
        throw new Error('Steg B laster bare opp i CATENDA_FOLDER_ID');
      maal = dokumentmaal();
      const ekte = globalThis.fetch;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (adr, valg) => {
        const rad = {
          metode: valg?.method ?? 'GET',
          sti: new URL(String(adr)).pathname,
          status: 'kastet' as (typeof sendt)[number]['status'],
        };
        sendt.push(rad);
        try {
          const svar = await ekte(adr, valg);
          rad.status = svar.status;
          return svar;
        } catch (feil) {
          // Et hode som ikke er en ByteString, avvises før noe sendes (#903).
          if (feil instanceof TypeError && /ByteString/.test(feil.message))
            rad.status = 'ikke sendt';
          throw feil;
        }
      });
    });

    // B5: alt steg B har laget, slettes baklengs med rå DELETE gjennom brokeren, siden
    // klienten ikke sletter. En sletting som feiler, gjør kjøringen rød og blir navngitt.
    afterAll(async () => {
      vi.restoreAllMocks();
      const igjen: string[] = [];
      for (const { hva, sti } of laget.reverse()) {
        const status = await kall('DELETE', sti).then(
          (svar) => svar.status,
          () => 0
        );
        if (status < 200 || status > 299) igjen.push(`${hva} (DELETE ga ${status})`);
      }
      for (const hva of usikre) igjen.push(`kanskje ${hva} (utfallet var usikkert, ingen ID)`);
      if (igjen.length) throw new Error(`Ble liggende igjen i Catenda: ${igjen.join('; ')}`);
    }, 120_000);

    const sisteTil = (metode: string, slutt: string) =>
      [...sendt].reverse().find((k) => k.metode === metode && k.sti.endsWith(slutt))?.status;

    /** Et svar som ikke er 2xx, kan ha laget noe når klienten ikke regner det som en avvisning. */
    const kanHaLaget = (status: number) => !avvistUtenEndring(status);

    /**
     * Kjører et kall som lager `hva`, og navngir `hva` i `afterAll` når kallet kaster etter at
     * noe er sendt: klienten gir da `UsikkertCatendautfall`, og et rått kall kan ha nådd fram.
     */
    async function lag<T>(hva: string, utfoer: () => Promise<T>): Promise<T> {
      const foer = sendt.length;
      try {
        return await utfoer();
      } catch (feil) {
        const noeSendt = sendt.slice(foer).some((k) => k.status !== 'ikke sendt');
        const avvist =
          feil instanceof CatendaUtilgjengelig && !(feil instanceof UsikkertCatendautfall);
        if (noeSendt && !avvist) usikre.push(hva);
        throw feil;
      }
    }

    function krev<T>(verdi: T | undefined, hva: string): T {
      if (verdi === undefined) throw new Error(`Forutsetningen mangler: ${hva}`);
      return verdi;
    }

    // topic-api-openapi.yaml, POST …/topics: svaret har topicens `guid`. Topic-typen er
    // `TOPICTYPE` (#741 punkt 15), og boardet må kjenne den.
    it('B1: opprettTopic gir en GUID, og topic-typen godtas på boardet', async () => {
      const tittel = `${PREFIKS}${randomUUID()}`;
      const guid = await lag(`topic ${tittel}`, () =>
        oauth.opprettTopic(
          board,
          {
            tittel,
            beskrivelse: 'Live-test fra endringsmeldinger (#902). Slettes etter kjøringen.',
          },
          token
        )
      );
      laget.push({
        hva: `topic ${tittel}`,
        sti: `/opencde/bcf/3.0/projects/${board}/topics/${guid}`,
      });
      topic = guid;
      const lest = (await hent(`/opencde/bcf/3.0/projects/${board}/topics/${topic}`)) as {
        guid: string;
        title: string;
        topic_type: string;
      };
      expect(lest).toMatchObject({ guid: topic, title: tittel, topic_type: TOPICTYPE });
    });

    // topic-api-openapi.yaml, GET …/topics/{guid}: `bimsync_creation_author.user` er en
    // `user-ref`. Behandlingen av innboksen kjenner topicene integrasjonen har laget, på at
    // forfatteren er lik `egenId()` (#741 punkt 17, #963).
    it('B1: topic gir topicen opprettTopic laget, med integrasjonen som forfatter i egenId-formen', async () => {
      const paa = krev(topic, 'topicen fra B1');
      const lest = await oauth.topic(board, paa, token);
      expect(lest).toMatchObject({ type: TOPICTYPE, forfatter: await oauth.egenId(token) });
    });

    // topic-api-openapi.yaml, schema `comment`: `author` er brukernavnet til forfatteren, og
    // project-api-openapi.yaml, schema `user`: `username`. Kommentaren kvitteres bare når
    // forfatteren er integrasjonens brukernavn (#972). Kommentaren slettes med topicen.
    // Brokeren må slippe gjennom `GET /v2/user` og `GET …/comments` (#1149).
    it('B1: en kommentar integrasjonen skriver, har integrasjonens brukernavn som forfatter (#972)', async () => {
      const paa = krev(topic, 'topicen fra B1');
      const tekst = `koe-livetest-kommentar ${randomUUID()}`;
      const id = await oauth.opprettKommentar(board, paa, tekst, token);
      const { brukernavn } = await oauth.egenBruker(token);
      const lest = (await oauth.kommentarer(board, paa, token)).find((k) => k.id === id);
      expect(brukernavn).not.toBeNull();
      expect(lest).toEqual({ id, tekst, forfatter: brukernavn });
    });

    // BCF 3.0, schema `comment` og `topic`: `author` og `creation_author`. Testen fastholder
    // det Catenda svarer i dag: 201 på POST …/comments, der øyeblikksbildet bare har 200, og
    // samme forfatter på kommentaren og topicen integrasjonen skriver. Den bruker ikke
    // `GET /v2/user` og `GET …/comments`, som brokeren avviser (#1149), og viser ikke at
    // forfatteren er `username`, som kvitteringen sammenligner med (#972); det prøver
    // testen over. Kommentaren slettes med topicen.
    it('B1: en kommentar integrasjonen skriver, har samme forfatter som topicen integrasjonen laget (#1149)', async () => {
      const paa = krev(topic, 'topicen fra B1');
      const topicsti = `/opencde/bcf/3.0/projects/${board}/topics/${paa}`;
      const svar = await kall('POST', `${topicsti}/comments`, {
        comment: `koe-livetest-kommentar ${randomUUID()}`,
      });
      expect(svar.status, 'POST …/comments').toBe(201);
      const { author } = (await svar.json()) as { author?: unknown };
      const { creation_author } = (await hent(topicsti)) as { creation_author?: unknown };
      expect(typeof author === 'string' && author.length > 0).toBe(true);
      expect(author).toBe(creation_author);
    });

    // topic-api-openapi.yaml tillater `guid` i POST …/topics. Om en topic kan lages
    // idempotent med en GUID klienten velger (#778). Svaret på en gjentatt GUID står ikke
    // i øyeblikksbildet; testen fastholder det Catenda svarer i dag (400).
    it('B1: en GUID klienten velger, godtas, og samme GUID igjen gir 400 uten ny topic (#778)', async () => {
      const guid = randomUUID();
      const ny = (tittel: string) =>
        kall('POST', `/opencde/bcf/3.0/projects/${board}/topics`, {
          guid,
          title: tittel,
          topic_type: TOPICTYPE,
        });
      const tittel = `${PREFIKS}${randomUUID()}`;
      const foerste = await lag(`topic ${tittel}`, () => ny(tittel));
      const svar = foerste.ok
        ? ((await foerste.json().catch(() => ({}))) as { guid?: string })
        : {};
      if (svar.guid)
        laget.push({
          hva: `topic ${tittel}`,
          sti: `/opencde/bcf/3.0/projects/${board}/topics/${svar.guid}`,
        });
      else if (foerste.ok || kanHaLaget(foerste.status)) usikre.push(`topic ${tittel}`);
      expect(foerste.status).toBe(201);
      expect(svar.guid).toBe(guid);
      const andreTittel = `${PREFIKS}${randomUUID()}`;
      const andre = await lag(`topic ${andreTittel}`, () => ny(andreTittel));
      // En 2xx uten GUID i svaret kan ha laget en topic steg B ikke kan slette.
      if (andre.ok) {
        const annen = ((await andre.json().catch(() => ({}))) as { guid?: string }).guid;
        if (!annen) usikre.push(`topic ${andreTittel}`);
        else if (annen !== svar.guid)
          laget.push({
            hva: `topic ${andreTittel}`,
            sti: `/opencde/bcf/3.0/projects/${board}/topics/${annen}`,
          });
      } else if (kanHaLaget(andre.status)) usikre.push(`topic ${andreTittel}`);
      expect(andre.status).toBe(400);
      const lest = (await hent(`/opencde/bcf/3.0/projects/${board}/topics/${guid}`)) as {
        title: string;
      };
      expect(lest.title).toBe(tittel);
    });

    // document-api-openapi.yaml, createLibraryItem: 200 med en liste av items, og ID-en er en
    // kompakt UUID (`library-item-document`). Samme navn i mappen med `failOnDocumentExists`
    // gir 409, som klienten gjør til `null` (B-03).
    it('B2: lastOppDokument gir en kompakt ID med 200, og samme navn igjen gir null (409)', async () => {
      const navn = `${PREFIKS}${randomUUID()}.pdf`;
      const last = (hva: string) =>
        lag(hva, () => oauth.lastOppDokument(maal, { navn, innhold: PDF }, token));
      const id = await last(`dokument ${navn}`);
      if (id) laget.push({ hva: `dokument ${navn}`, sti: `${itemsti(maal)}/${id}` });
      expect(sisteTil('POST', '/items')).toBe(200);
      expect(id).toMatch(/^[0-9a-f]{32}$/);
      dokument = id!;
      dokumentnavn = navn;
      const kopi = await last(`kopi av dokument ${navn}`);
      if (kopi && kopi !== id)
        laget.push({ hva: `kopi av dokument ${navn}`, sti: `${itemsti(maal)}/${kopi}` });
      expect(kopi).toBeNull();
      expect(sisteTil('POST', '/items')).toBe(409);
      const lest = (await hent(`${itemsti(maal)}/${dokument}`)) as {
        name: string;
        parentId: string;
      };
      expect({ navn: lest.name, mappe: catendaId(lest.parentId) }).toEqual({
        navn,
        mappe: catendaId(process.env.CATENDA_FOLDER_ID),
      });
    });

    // document-api-openapi.yaml, getLibraryItems med `parentId` og `scope`.
    it('B3: finnDokument finner det opplastede dokumentet', async () => {
      const navn = krev(dokumentnavn, 'dokumentet fra B2');
      expect(await oauth.finnDokument(maal, navn, token)).toBe(dokument);
    });

    // document-api-openapi.yaml, `search` på getLibraryItems: «Filter the result by search
    // text». Om avstemmingen kan filtrere på navnet hos Catenda i stedet for å liste hele
    // mappen (#783 punkt 1). Øyeblikksbildet sier ikke om søket er eksakt, så `finnDokument`
    // må fortsatt sammenligne navnet selv.
    it('B3: search filtrerer på navnet hos Catenda (#783)', async () => {
      const navn = krev(dokumentnavn, 'dokumentet fra B2');
      const med = (sok: string) =>
        hent(
          `${itemsti(maal)}?${new URLSearchParams({ scope: 'all', parentId: maal.folder_id!, search: sok })}`
        ) as Promise<{ id: string }[]>;
      expect((await med(navn)).map((r) => r.id)).toEqual([dokument]);
      expect(await med(`${PREFIKS}${randomUUID()}.pdf`)).toEqual([]);
    });

    // topic-api-openapi.yaml, POST og GET …/document_references: svaret har referansens
    // `guid`, og lista har `document_guid`. ID-en fra biblioteket må sendes som UUID med
    // bindestreker (#902, `bcfDokumentId`).
    it('B4: opprettDokumentreferanse gir en GUID, og dokumentreferanser finner den med samme dokument-ID', async () => {
      const paa = krev(topic, 'topicen fra B1');
      const til = krev(dokument, 'dokumentet fra B2');
      const hva = `dokumentreferanse til ${dokumentnavn}`;
      const referanse = await lag(hva, () =>
        oauth.opprettDokumentreferanse(board, paa, til, token)
      );
      laget.push({
        hva,
        sti: `/opencde/bcf/3.0/projects/${board}/topics/${paa}/document_references/${referanse}`,
      });
      expect(await oauth.dokumentreferanser(board, paa, token)).toEqual([
        { id: referanse, dokumentId: sammenlignbarDokumentId(til) },
      ]);
    });

    // #903: `Bimsync-Params` bærer tegnene over U+007F som `\uXXXX`, som `json.dumps` i
    // Python. Catenda lagrer navnet med tegnene, og `finnDokument` finner det på samme navn.
    it('B6: et dokumentnavn med et tegn over U+00FF lastes opp og finnes igjen (#903)', async () => {
      const navn = `${PREFIKS}${randomUUID()}-Łódź.pdf`;
      const id = await lag(`dokument ${navn}`, () =>
        oauth.lastOppDokument(maal, { navn, innhold: PDF }, token)
      );
      if (id) laget.push({ hva: `dokument ${navn}`, sti: `${itemsti(maal)}/${id}` });
      expect(sisteTil('POST', '/items')).toBe(200);
      expect(id).toMatch(/^[0-9a-f]{32}$/);
      expect(((await hent(`${itemsti(maal)}/${id}`)) as { name: string }).name).toBe(navn);
      expect(await oauth.finnDokument(maal, navn, token)).toBe(id);
    });
    // C: leveringen ende til ende (#371): `kjoerEnJobb` lager topicen og leverer brevet med
    // de ekte leverandørene, mot en migrert testbase i SQL Server og ekte Catenda.
    // Innpakningen setter bare `PREFIKS` foran topic-tittelen og dokumentnavnet, så
    // brokeren slipper slettingen gjennom, og fører det som lages, til oppryddingen i B5.
    // Forventningene har kilde i LV-U1, B-03 og «levert» i #764, som L2 i `levering.test.ts`.
    describe.skipIf(!TESTBASE_URL)('C: leveringen ende til ende (#371)', () => {
      let o: Oppsett;
      let server: KjorendeServer;
      /** Det kjøreren logger, så en live-feil i jobben står i meldingen til testen. */
      const meldinger: string[] = [];
      const loggfoer = (...deler: unknown[]) =>
        meldinger.push(
          deler.map((d) => (d instanceof Error ? `${d.name}: ${d.message}` : String(d))).join(' ')
        );
      const logg = { info() {}, warn: loggfoer, error: loggfoer };

      const somKjoerer = <T>(setning: string, parametre: Record<string, unknown> = {}) =>
        somJobbkjoerer<T>(o, setning, parametre);

      function medPrefiks(): Pick<Jobbavhengigheter, 'catenda' | 'dokumenter'> {
        const topics = topicoppretter(integrasjon);
        const ekte = dokumentleverandoer(integrasjon);
        return {
          catenda: {
            opprettTopic: async (boardId, topic) => {
              const tittel = `${PREFIKS}${topic.tittel}`;
              const guid = await lag(`topic ${tittel}`, () =>
                topics.opprettTopic(boardId, { ...topic, tittel })
              );
              laget.push({
                hva: `topic ${tittel}`,
                sti: `/opencde/bcf/3.0/projects/${boardId}/topics/${guid}`,
              });
              return guid;
            },
          },
          dokumenter: {
            finnDokument: (maal, navn) => ekte.finnDokument(maal, `${PREFIKS}${navn}`),
            lastOppDokument: async (maal, dokument) => {
              const navn = `${PREFIKS}${dokument.navn}`;
              const id = await lag(`dokument ${navn}`, () =>
                ekte.lastOppDokument(maal, { ...dokument, navn })
              );
              if (id) laget.push({ hva: `dokument ${navn}`, sti: `${itemsti(maal)}/${id}` });
              return id;
            },
            dokumentreferanser: (boardId, topic) => ekte.dokumentreferanser(boardId, topic),
            opprettDokumentreferanse: async (boardId, topic, dokument) => {
              const hva = `dokumentreferanse på topic ${topic}`;
              const id = await lag(hva, () =>
                ekte.opprettDokumentreferanse(boardId, topic, dokument)
              );
              laget.push({
                hva,
                sti: `/opencde/bcf/3.0/projects/${boardId}/topics/${topic}/document_references/${id}`,
              });
              return id;
            },
          },
        };
      }

      const kjoer = () =>
        kjoerEnJobb({
          datalag: o.datalag.kjoeretid.pool,
          ...medPrefiks(),
          saksadresse: () => 'live-test (#902)',
          logg,
        });

      /** Brevet med kravet om grunnlag, med den låste teksten klienten viste (LV-U2). */
      async function sendBrev(sakId: string) {
        const svar = await sendKommando(server.url, o, sakId, { versjon: 1 });
        if (svar.status !== 201 && svar.status !== 200)
          throw new Error(
            `Brevet ble avvist: ${svar.status} ${svar.kropp.rule ?? ''} ${svar.kropp.error ?? ''}`
          );
      }

      beforeAll(async () => {
        o = await lagOppsett({
          catendaProsjekt: uuid('CATENDA_PROJECT_ID'),
          bibliotek: uuid('CATENDA_LIBRARY_ID'),
          mappe: uuid('CATENDA_FOLDER_ID'),
          board,
        });
        server = await startServer(o);
      }, 300_000);
      afterAll(async () => {
        await server?.stopp();
        if (o) await rydd(o);
      }, 120_000);

      let sakId: string | undefined;
      let topicId: string | undefined;

      it('C1: topicen lages, brevet lastes opp i mappen, referansen settes, og hver operasjon kvitteres', async () => {
        sakId = await opprettKjernesak(o);
        expect(await kjoer()).toBe(true);
        const topics = (
          await somKjoerer<{ topic_id: string }>(
            `SELECT catenda_topic_id AS topic_id FROM koe.sak_catenda_topic WHERE sak_id = @sak`,
            { sak: sakId }
          )
        ).recordset;
        expect(topics, meldinger.join('\n')).toHaveLength(1);
        topicId = topics[0].topic_id;
        await sendBrev(sakId);
        expect(await kjoer()).toBe(true);

        const leser = { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE' as const };
        const { journal, oppdrag } = await lesSaken(o.datalag.kjoeretid.pool, leser, sakId);
        const brev = journal.at(-1)!;
        const navn = `${PREFIKS}brev-${sakId}-2-${brev.event_id}.pdf`;
        const kvitteringer = (
          await somKjoerer<{ operasjon: string; catenda_id: string }>(
            `SELECT k.operasjon, k.catenda_id FROM koe.leveringskvittering k
               JOIN koe.leveringsoppdrag o ON o.id = k.leveringsoppdrag_id
              WHERE o.sak_id = @sak ORDER BY k.operasjon`,
            { sak: sakId }
          )
        ).recordset;
        const dokument = kvitteringer.find((k) => k.operasjon === 'dokument')?.catenda_id;
        const referanse = kvitteringer.find((k) => k.operasjon === 'dokumentreferanse')?.catenda_id;
        expect(
          kvitteringer.map((k) => k.operasjon),
          meldinger.join('\n')
        ).toEqual(['dokument', 'dokumentreferanse']);
        expect(await oauth.finnDokument(dokumentmaal(), navn, token)).toBe(dokument);
        expect(await oauth.dokumentreferanser(board, topicId, token)).toEqual([
          { id: referanse, dokumentId: sammenlignbarDokumentId(dokument!) },
        ]);
        const forsoek = (
          await somKjoerer<{ utfall: string; tilstand: string }>(
            `SELECT f.utfall, j.tilstand FROM koe.jobbforsoek f JOIN koe.jobb j ON j.jobb_id = f.jobb_id
              WHERE j.sak_id = @sak AND j.jobbtype = N'levering'`,
            { sak: sakId }
          )
        ).recordset;
        expect(forsoek).toEqual([{ utfall: 'utfoert', tilstand: 'utfoert' }]);
        expect(oppdrag.find((x) => x.event_id === brev.event_id)?.levert).not.toBeNull();
        expect(await kjoer()).toBe(false);
      }, 120_000);

      // V-3 (#790): et registrert varsel med et vedlegg som er lastet opp gjennom vedleggsruten.
      // Brevet har ikke noe dokument (LV-U11), så leveringen laster opp vedlegget med navnet fra
      // `vedleggsnavn`, setter referansen på topicen og kvitterer begge i `koe.vedleggskvittering`.
      // Filnavnet har et tegn over U+00FF, så #903 prøves også gjennom hele leveringen.
      it('C2: et vedlegg i et registrert varsel ligger i mappen, har referanse på topicen og er kvittert (#790)', async () => {
        const sak = krev(sakId, 'saken fra C1');
        const paa = krev(topicId, 'topicen fra C1');
        const filnavn = 'Łódź-plan.pdf';
        const opplastet = await fetch(`${server.url}/api/kjerne/saker/${sak}/vedlegg`, {
          method: 'POST',
          headers: {
            Cookie: `__Host-koe_session=${o.te.token}`,
            'X-CSRF-Token': o.te.csrf,
            'X-Project-ID': o.prosjekt.id,
            'Content-Type': 'application/octet-stream',
            'X-Filnavn': encodeURIComponent(filnavn),
          },
          body: PDF,
        });
        expect(opplastet.status).toBe(201);
        const vedleggId = ((await opplastet.json()) as { vedlegg: { vedlegg_id: string } }).vedlegg
          .vedlegg_id;
        const varsel = await tilServeren(server.url, `/api/kjerne/saker/${sak}/kommandoer`, {
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
        expect(varsel.status, JSON.stringify(varsel.kropp)).toBe(201);
        expect(await kjoer(), meldinger.join('\n')).toBe(true);

        const kvitteringer = (
          await somKjoerer<{ operasjon: string; catenda_id: string }>(
            `SELECT operasjon, catenda_id FROM koe.vedleggskvittering
              WHERE vedlegg_id = @vedlegg ORDER BY operasjon`,
            { vedlegg: vedleggId }
          )
        ).recordset;
        expect(
          kvitteringer.map((k) => k.operasjon),
          meldinger.join('\n')
        ).toEqual(['dokument', 'dokumentreferanse']);
        const [dokument, referanse] = kvitteringer.map((k) => k.catenda_id);
        const navn = `${PREFIKS}${vedleggsnavn(filnavn, vedleggId)}`;
        expect(await oauth.finnDokument(dokumentmaal(), navn, token)).toBe(dokument);
        const lest = (await hent(`${itemsti(dokumentmaal())}/${dokument}`)) as {
          name: string;
          parentId: string;
        };
        expect({ navn: lest.name, mappe: catendaId(lest.parentId) }).toEqual({
          navn,
          mappe: catendaId(process.env.CATENDA_FOLDER_ID),
        });
        expect(await oauth.dokumentreferanser(board, paa, token)).toContainEqual({
          id: referanse,
          dokumentId: sammenlignbarDokumentId(dokument),
        });
        // Et registrert brev får ingen rad i `leveringskvittering`, så `levert` er null (#912).
        const forsoek = (
          await somKjoerer<{ utfall: string; tilstand: string }>(
            `SELECT f.utfall, j.tilstand FROM koe.jobbforsoek f JOIN koe.jobb j ON j.jobb_id = f.jobb_id
              WHERE j.sak_id = @sak AND j.jobbtype = N'levering' ORDER BY f.startet`,
            { sak }
          )
        ).recordset;
        expect(forsoek.at(-1)).toEqual({ utfall: 'utfoert', tilstand: 'utfoert' });
        expect(await kjoer()).toBe(false);
      }, 120_000);
    });
  });
});
