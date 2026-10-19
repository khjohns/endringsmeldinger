/**
 * Catenda-klienten mot ekte Catenda gjennom token-brokeren (#902, steg A). Bare
 * lesing. Kjøres med `KOE_CATENDA_LIVE=1` fra skyøkta, aldri i CI. Forventningene
 * har kilde i OpenAPI-øyeblikksbildene i `docs/tredjepart-api/` eller i oppsettet
 * av testprosjektet; de beviser bare kallene de gjør.
 */

import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { catendaFraMiljoe, CatendaOAuth, grunnadresse } from '../catenda.ts';

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
    const maal = {
      catenda_project_id: uuid('CATENDA_PROJECT_ID'),
      library_id: uuid('CATENDA_LIBRARY_ID'),
      folder_id: process.env.CATENDA_FOLDER_ID ? uuid('CATENDA_FOLDER_ID') : null,
    };
    expect(await oauth.finnDokument(maal, `finnes-ikke-${randomUUID()}.pdf`, token)).toBeNull();
  });

  // `dokumentreferanser` kaster ved en referanse som verken er et dokument eller en lenke.
  it('A8: dokumentreferansene på boardets topics kan leses', async ({ skip }) => {
    const topics = (await hent(`/opencde/bcf/3.0/projects/${board}/topics`)) as {
      guid: string;
    }[];
    if (topics.length === 0) skip('Boardet har ingen topics');
    for (const { guid } of topics.slice(0, 10)) await oauth.dokumentreferanser(board, guid, token);
  });
});
