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
import { catendaId } from '../autorisasjon.ts';
import {
  catendaFraMiljoe,
  CatendaOAuth,
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
  const hex = catendaId(process.env[navn]);
  if (!hex) throw new Error(`${navn} er ikke en Catenda-ID`);
  return hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
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
    expect(svar.status, `GET ${sti.split('?')[0]}`).toBe(200);
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
    token = await catenda.integrasjonsnokkel.token();
    prosjekt = catendaId(process.env.CATENDA_PROJECT_ID)!;
    board = uuid('CATENDA_TOPIC_BOARD_ID');
  });

  it('A1: integrasjonens token godtas', async () => {
    await hent(`/v2/projects/${prosjekt}`);
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
    let maal: ReturnType<typeof dokumentmaal>;
    let topic: string;
    let dokument: string;
    let dokumentnavn: string;

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
      if (igjen.length) throw new Error(`Ble liggende igjen i Catenda: ${igjen.join('; ')}`);
    });

    const sisteTil = (metode: string, slutt: string) =>
      [...sendt].reverse().find((k) => k.metode === metode && k.sti.endsWith(slutt))?.status;

    // topic-api-openapi.yaml, POST …/topics: svaret har topicens `guid`. Topic-typen er
    // `TOPICTYPE` (#741 punkt 15), og boardet må kjenne den.
    it('B1: opprettTopic gir en GUID, og topic-typen godtas på boardet', async () => {
      const tittel = `${PREFIKS}${randomUUID()}`;
      topic = await oauth.opprettTopic(
        board,
        { tittel, beskrivelse: 'Live-test fra endringsmeldinger (#902). Slettes etter kjøringen.' },
        token
      );
      laget.push({
        hva: `topic ${tittel}`,
        sti: `/opencde/bcf/3.0/projects/${board}/topics/${topic}`,
      });
      const lest = (await hent(`/opencde/bcf/3.0/projects/${board}/topics/${topic}`)) as {
        guid: string;
        title: string;
        topic_type: string;
      };
      expect(lest).toMatchObject({ guid: topic, title: tittel, topic_type: TOPICTYPE });
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
      const foerste = await ny(tittel);
      const svar = (await foerste.json()) as { guid?: string };
      if (svar.guid)
        laget.push({
          hva: `topic ${tittel}`,
          sti: `/opencde/bcf/3.0/projects/${board}/topics/${svar.guid}`,
        });
      expect(foerste.status).toBe(201);
      expect(svar.guid).toBe(guid);
      const andre = await ny(`${PREFIKS}${randomUUID()}`);
      const andreSvar = (await andre.json().catch(() => null)) as { guid?: string } | null;
      if (andre.ok && andreSvar?.guid && andreSvar.guid !== guid)
        laget.push({
          hva: 'topic med gjentatt GUID',
          sti: `/opencde/bcf/3.0/projects/${board}/topics/${andreSvar.guid}`,
        });
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
      dokumentnavn = `${PREFIKS}${randomUUID()}.pdf`;
      const id = await oauth.lastOppDokument(maal, { navn: dokumentnavn, innhold: PDF }, token);
      if (id) laget.push({ hva: `dokument ${dokumentnavn}`, sti: `${itemsti(maal)}/${id}` });
      expect(sisteTil('POST', '/items')).toBe(200);
      expect(id).toMatch(/^[0-9a-f]{32}$/);
      dokument = id!;
      expect(
        await oauth.lastOppDokument(maal, { navn: dokumentnavn, innhold: PDF }, token)
      ).toBeNull();
      expect(sisteTil('POST', '/items')).toBe(409);
      const lest = (await hent(`${itemsti(maal)}/${dokument}`)) as {
        name: string;
        parentId: string;
      };
      expect({ navn: lest.name, mappe: catendaId(lest.parentId) }).toEqual({
        navn: dokumentnavn,
        mappe: catendaId(process.env.CATENDA_FOLDER_ID),
      });
    });

    // document-api-openapi.yaml, getLibraryItems med `parentId` og `scope`.
    it('B3: finnDokument finner det opplastede dokumentet', async () => {
      expect(await oauth.finnDokument(maal, dokumentnavn, token)).toBe(dokument);
    });

    // document-api-openapi.yaml, `search` på getLibraryItems: «Filter the result by search
    // text». Om avstemmingen kan filtrere på navnet hos Catenda i stedet for å liste hele
    // mappen (#783 punkt 1). Øyeblikksbildet sier ikke om søket er eksakt, så `finnDokument`
    // må fortsatt sammenligne navnet selv.
    it('B3: search filtrerer på navnet hos Catenda (#783)', async () => {
      const med = (sok: string) =>
        hent(
          `${itemsti(maal)}?${new URLSearchParams({ scope: 'all', parentId: maal.folder_id!, search: sok })}`
        ) as Promise<{ id: string }[]>;
      expect((await med(dokumentnavn)).map((r) => r.id)).toEqual([dokument]);
      expect(await med(`${PREFIKS}${randomUUID()}.pdf`)).toEqual([]);
    });

    // topic-api-openapi.yaml, POST og GET …/document_references: svaret har referansens
    // `guid`, og lista har `document_guid`. ID-en fra biblioteket må sendes som UUID med
    // bindestreker (#902, `bcfDokumentId`).
    it('B4: opprettDokumentreferanse gir en GUID, og dokumentreferanser finner den med samme dokument-ID', async () => {
      const referanse = await oauth.opprettDokumentreferanse(board, topic, dokument, token);
      laget.push({
        hva: `dokumentreferanse til ${dokumentnavn}`,
        sti: `/opencde/bcf/3.0/projects/${board}/topics/${topic}/document_references/${referanse}`,
      });
      expect(await oauth.dokumentreferanser(board, topic, token)).toEqual([
        { id: referanse, dokumentId: sammenlignbarDokumentId(dokument) },
      ]);
    });

    // #903: et navn med et tegn over U+00FF gjør `Bimsync-Params` til en ugyldig hodeverdi,
    // og klienten gir `UsikkertCatendautfall` uten at noe er sendt. Blir en vanlig test når
    // #903 er rettet. En annen feil enn den kjente lar testen fullføre, så `it.fails` blir rød.
    it.fails(
      'B6: et dokumentnavn med et tegn over U+00FF lastes opp og finnes igjen (#903)',
      async () => {
        const navn = `${PREFIKS}${randomUUID()}-Łódź.pdf`;
        let id: string | null;
        try {
          id = await oauth.lastOppDokument(maal, { navn, innhold: PDF }, token);
        } catch (feil) {
          if (feil instanceof UsikkertCatendautfall && sisteTil('POST', '/items') === 'ikke sendt')
            throw feil;
          console.error('B6 feilet av en annen grunn enn #903:', feil);
          return;
        }
        if (id) laget.push({ hva: `dokument ${navn}`, sti: `${itemsti(maal)}/${id}` });
        expect(await oauth.finnDokument(maal, navn, token)).toBe(id);
      }
    );
  });
});
