/**
 * HR-kopien fra Microsoft Graph (S-1c del 2, #831). Driften registrerer hvilken
 * stillingstittel som gir hvilken rolle, og grensen per rolle (S3 (a), GFK-U6,
 * GFK-U11). Synkroniseringen spør Graph etter personene med hver registrerte
 * tittel, med lederen, og lagrer hele bildet for tenanten med
 * `koe_api.synkroniser_hr`. Basen avgjør hvem som får rolle, og registrerer
 * identiteten for dem (svaret 20.10 i #831).
 *
 * Graph leses med appens egen tilgang (client credentials), ikke med brukerens
 * token. Lykkes ikke alle oppslagene, lagres ingenting, så bildet aldri blir
 * halvt. Tokenet og svarene fra Graph når aldri loggen.
 */

import { sql, utenKontekst, type Pool } from './datalag.ts';

export interface GraphOppsett {
  tenant: string;
  klientId: string;
  klienthemmelighet: string;
  /** Utstederen av tokenet, uten `/` til slutt. */
  innlogging?: string;
  /** Graph, uten `/` til slutt. */
  graph?: string;
  tidsavbruddMs?: number;
}

/** En person fra Graph, i formen `koe_api.synkroniser_hr` tar imot. */
export interface HrPerson {
  oid: string;
  stillingstittel: string;
  leder: string | null;
  aktiv: boolean;
  epost: string;
  navn: string;
}

/** Kilden for HR-dataene i én tenant. */
export interface HrKilde {
  tenant: string;
  personerMedTittel(titler: readonly string[]): Promise<HrPerson[]>;
}

/** Graph svarte ikke, eller med noe annet enn det som ble spurt etter. */
export class GraphUtilgjengelig extends Error {}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Så ofte jobbkjøreren synkroniserer HR-kopien. */
export const HR_INTERVALL_MS = 60 * 60 * 1000;

const tekst = (verdi: unknown) => (typeof verdi === 'string' ? verdi : '');

/** OData-strengen for en tittel: `'` dobles. */
const odataStreng = (verdi: string) => `'${verdi.replaceAll("'", "''")}'`;

export class Graph implements HrKilde {
  readonly #oppsett: GraphOppsett;
  readonly #graph: string;

  constructor(oppsett: GraphOppsett) {
    if (!GUID.test(oppsett.tenant)) throw new Error('Tenanten for Graph er ikke en GUID');
    this.#oppsett = oppsett;
    this.#graph = oppsett.graph ?? 'https://graph.microsoft.com';
  }

  get tenant(): string {
    return this.#oppsett.tenant;
  }

  async #hent(adresse: string, init: RequestInit): Promise<unknown> {
    let svar: Response;
    try {
      svar = await fetch(adresse, {
        ...init,
        redirect: 'manual',
        signal: AbortSignal.timeout(this.#oppsett.tidsavbruddMs ?? 15_000),
      });
    } catch {
      throw new GraphUtilgjengelig('Graph svarte ikke');
    }
    if (svar.status !== 200) {
      await svar.body?.cancel().catch(() => {});
      throw new GraphUtilgjengelig(`Graph svarte med status ${svar.status}`);
    }
    const data: unknown = await svar.json().catch(() => null);
    if (data === null || typeof data !== 'object')
      throw new GraphUtilgjengelig('Graph svarte uten JSON');
    return data;
  }

  async #token(): Promise<string> {
    const { tenant, klientId, klienthemmelighet } = this.#oppsett;
    const innlogging = this.#oppsett.innlogging ?? 'https://login.microsoftonline.com';
    const data = (await this.#hent(`${innlogging}/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: klientId,
        client_secret: klienthemmelighet,
        grant_type: 'client_credentials',
        scope: `${this.#graph}/.default`,
      }),
    })) as { access_token?: unknown };
    if (typeof data.access_token !== 'string' || !data.access_token)
      throw new GraphUtilgjengelig('Graph svarte uten tilgangstoken');
    return data.access_token;
  }

  /**
   * Personene med en av titlene, side for side. Graph sammenlikner `jobTitle`
   * uten hensyn til store og små bokstaver; basen krever lik tittel. En neste
   * side utenfor Graph følges ikke, så tokenet ikke sendes dit.
   */
  async personerMedTittel(titler: readonly string[]): Promise<HrPerson[]> {
    if (titler.length === 0) return [];
    const token = await this.#token();
    const personer = new Map<string, HrPerson>();
    for (const tittel of titler) {
      const spoerring = new URLSearchParams({
        $filter: `jobTitle eq ${odataStreng(tittel)}`,
        $select: 'id,displayName,mail,jobTitle,accountEnabled',
        $expand: 'manager($select=id)',
      });
      let adresse: string | null = `${this.#graph}/v1.0/users?${spoerring}`;
      while (adresse) {
        const side = (await this.#hent(adresse, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        })) as { value?: unknown; '@odata.nextLink'?: unknown };
        if (!Array.isArray(side.value)) throw new GraphUtilgjengelig('Graph svarte uten personer');
        for (const rad of side.value) {
          const person = lesPerson(rad);
          personer.set(person.oid, person);
        }
        const neste = side['@odata.nextLink'];
        if (neste === undefined) adresse = null;
        else if (typeof neste === 'string' && neste.startsWith(`${this.#graph}/`)) adresse = neste;
        else throw new GraphUtilgjengelig('Neste side er utenfor Graph');
      }
    }
    return [...personer.values()];
  }
}

function lesPerson(rad: unknown): HrPerson {
  if (rad === null || typeof rad !== 'object') throw new GraphUtilgjengelig('En person er ugyldig');
  const { id, jobTitle, accountEnabled, manager, mail, displayName } = rad as Record<
    string,
    unknown
  >;
  if (typeof id !== 'string' || !GUID.test(id))
    throw new GraphUtilgjengelig('En person har ingen oid');
  const leder = (manager as { id?: unknown } | null | undefined)?.id;
  if (leder !== undefined && (typeof leder !== 'string' || !GUID.test(leder)))
    throw new GraphUtilgjengelig('En leder har ingen oid');
  return {
    oid: id,
    stillingstittel: tekst(jobTitle),
    leder: leder ?? null,
    aktiv: accountEnabled === true,
    epost: tekst(mail),
    navn: tekst(displayName),
  };
}

/**
 * Henter titlene driften har registrert, spør kilden og lagrer bildet. Gir antallet
 * personer kilden ga. En feil fra kilden eller basen kastes, og ingenting er lagret.
 */
export async function synkroniserHr(datalag: Pool, kilde: HrKilde): Promise<number> {
  const titler = (
    await utenKontekst(datalag).execute<{ stillingstittel: string }>('koe_api.stillingstitler')
  ).recordset.map((r) => r.stillingstittel);
  const personer = await kilde.personerMedTittel(titler);
  await utenKontekst(datalag)
    .input('tenant', sql.UniqueIdentifier, kilde.tenant)
    .input('personer', sql.NVarChar(sql.MAX), JSON.stringify(personer))
    .execute('koe_api.synkroniser_hr');
  return personer.length;
}

/** Graph for HR-kopien fra miljøet, eller `null` når den ikke er satt opp. */
export function graphFraMiljoe(miljoe: NodeJS.ProcessEnv): Graph | null {
  const {
    HR_TENANT_ID: tenant,
    ENTRA_CLIENT_ID: klientId,
    ENTRA_CLIENT_SECRET: klienthemmelighet,
  } = miljoe;
  if (!tenant) return null;
  if (!klientId || !klienthemmelighet) throw new Error('HR-synkroniseringen mangler oppsett');
  return new Graph({ tenant, klientId, klienthemmelighet });
}
