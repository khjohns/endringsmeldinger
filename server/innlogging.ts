/**
 * Innloggingsinngangene (F0b-5a, #659): Catenda-innloggingen, sesjonen,
 * utloggingen og CSRF-tokenet, med samme stier, svar og kapsler som
 * `backend/routes/auth_routes.py` og `/api/csrf-token` i
 * `backend/routes/utility_routes.py`, så frontenden ikke endres når rutingen
 * flyttes (F0b-8).
 *
 * Tilbakekallet løser identiteten gjennom `koe_api.catenda_identitet`, med
 * issueren låst i basen og subjektet i `catendaId()`-formen fra `CatendaOAuth`,
 * og deretter medlemskapet, som `AuthService.login` i Python (F0b-5b, #638): med
 * brukerens token hentes medlemslisten for hvert koblet prosjekt brukeren er med i
 * i Catenda, og medlemskapet blir inaktivt i de koblede prosjektene brukeren ikke
 * lenger er med i (DL-U8). Identiteten løses før deaktiveringen, så fraværet føres
 * også ved første innlogging (DL-U9, PR #652). Subjektet kommer fra Catenda, aldri
 * fra forespørselen. Feiler et ledd, opprettes ingen sesjon.
 *
 * Kode, token og feil fra Catenda når aldri loggen, svaret eller adressen;
 * loggen får bare navnet på feiltypen, som i Python.
 */

import { validateHeaderName, validateHeaderValue, type IncomingMessage } from 'node:http';

import type { Avhengigheter, Innlogget, Rute, Svar } from './app.ts';
import { informasjonskapsel, sesjonsnavn } from './autorisasjon.ts';
import { CatendaOAuth, catendaFraMiljoe, type CatendaBruker } from './catenda.ts';
import { sql, utenKontekst, type Pool } from './datalag.ts';
import { entraFraMiljoe, entraIdentitet, type EntraOIDC } from './entra.ts';
import { fast, loggFeil, svarhoder } from './inngang.ts';
import {
  basensKlokke,
  deaktiverVedInnlogging,
  kobledeProsjekter,
  synkroniserProsjekt,
} from './medlemskap.ts';
import {
  brukInnloggingsforsoek,
  opprettInnloggingsforsoek,
  opprettSesjon,
  slettSesjon,
} from './sesjon.ts';

/** Det inngangene trenger av `CatendaOAuth`, så testene kan stå for Catenda. */
export type Innloggingsleverandoer = Pick<
  CatendaOAuth,
  'autorisasjonsadresse' | 'byttKode' | 'bruker' | 'prosjekter' | 'medlemmer'
>;

/** Det inngangene trenger av `EntraOIDC`, så testene kan bytte ut deler av den. */
export type EntraLeverandoer = Pick<EntraOIDC, 'autorisasjonsadresse' | 'byttKode' | 'valider'>;

export interface Innlogging {
  /** Opprinnelsen til frontenden, uten `/` til slutt (`AUTH_FRONTEND_URL`). */
  frontend: string;
  oauth: Innloggingsleverandoer;
  /** Entra-innloggingen (#831). Uten den svarer Entra-inngangene 503. */
  entra?: EntraLeverandoer | null;
}

const SESJONENS_LEVETID = 8 * 3600;
const FORSOEKETS_LEVETID = 600;
const STOERSTE_RETURSTI = 2048;

const PRIVAT = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

/** `validate_config` i `AuthService`: statiske HTTPS-adresser, HTTP bare mot localhost i utvikling. */
function kontrollerAdresse(verdi: string, miljoe: NodeJS.ProcessEnv): URL {
  let adresse: URL;
  try {
    adresse = new URL(verdi);
  } catch {
    throw new Error('Innloggingen trenger statiske HTTPS-adresser');
  }
  const lokal =
    miljoe.APP_ENV === 'development' && ['localhost', '127.0.0.1'].includes(adresse.hostname);
  if (
    !adresse.host ||
    adresse.username ||
    adresse.password ||
    adresse.search ||
    adresse.hash ||
    verdi.includes('?') ||
    verdi.includes('#') ||
    !(adresse.protocol === 'https:' || (lokal && adresse.protocol === 'http:'))
  ) {
    throw new Error('Innloggingen trenger statiske HTTPS-adresser');
  }
  return adresse;
}

/**
 * Innloggingen fra miljøet, med klienten integrasjonen også bruker når den er gitt
 * (#726 punkt 4). Tilbakekallsadressen kontrolleres slik klienten sender den til
 * Catenda, ikke i `miljoe`, som klienten kan være bygget uten (#879 punkt 4). Kaster
 * når oppsettet mangler eller er ugyldig; meldingen har aldri med verdiene, så
 * hemmeligheten ikke kan havne i loggen.
 */
export function innloggingFraMiljoe(
  miljoe: NodeJS.ProcessEnv = process.env,
  catenda?: { oauth: CatendaOAuth }
): Innlogging {
  const frontend = kontrollerAdresse(miljoe.AUTH_FRONTEND_URL ?? '', miljoe);
  if (frontend.pathname !== '/') throw new Error('AUTH_FRONTEND_URL må være en opprinnelse');
  const { oauth } = catenda ?? catendaFraMiljoe(miljoe);
  const tilbakekallsadresse = new URL(oauth.autorisasjonsadresse('')).searchParams.get(
    'redirect_uri'
  );
  kontrollerAdresse(tilbakekallsadresse ?? '', miljoe);
  const entra = entraFraMiljoe(miljoe);
  if (entra) {
    kontrollerAdresse(miljoe.ENTRA_REDIRECT_URI ?? '', miljoe);
    kontrollerAdresse(miljoe.ENTRA_AUTHORITY ?? '', miljoe);
  }
  // Opprinnelsen har verten i punycode, så adressen kan stå i `Location` (#763 punkt 8).
  return { frontend: frontend.origin, oauth, entra };
}

/**
 * `safe_return_path` i `backend/lib/auth/domain.py`: bare en lokal sti utenfor
 * `/api/` og `/login`, ellers `/`. Kontrollen gjøres på stien dekodet én gang
 * til, og stien selv må også begynne med én `/`, som basen krever. `/api/`,
 * `/login` og `//` prøves også etter punktsegmentene, som nettleseren løser opp:
 * `/.//x` blir `//x`, som en klient ville lest som en vert (#716 punkt 7). Tegn
 * utenfor ASCII prosentkodes, så stien kan stå i `Location`, og lengden telles
 * etterpå, i UTF-16-enheter, som basen teller (kravet i #659).
 */
export function tryggRetursti(verdi: string | null | undefined): string {
  let sti: string;
  let dekodet: string;
  try {
    // Et hode tar bare ASCII; `%` og resten av ASCII står som de er.
    sti = (verdi || '/').replace(/[^\x21-\x7e]+/g, encodeURIComponent);
    dekodet = decodeURIComponent(sti);
  } catch {
    return '/';
  }
  const lokal = (s: string) =>
    s.startsWith('/') &&
    !s.startsWith('//') &&
    !s.includes('\\') &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(s);
  const opploest = (s: string) => new URL(s, 'http://lokal').pathname;
  if (
    sti.length > STOERSTE_RETURSTI ||
    !lokal(sti) ||
    !lokal(dekodet) ||
    opploest(sti).startsWith('//') ||
    opploest(dekodet).startsWith('//') ||
    /^\/(api\/|login)/.test(opploest(dekodet))
  )
    return '/';
  return sti;
}

/** `set_cookie` i `auth_routes.py`: `Secure` følger `__Host-`-prefikset. */
function kapsel(navn: string, verdi: string, levetid: number, naa: Date): string {
  const utloeper = new Date(naa.getTime() + levetid * 1000).toUTCString();
  const sikker = navn.startsWith('__Host-') ? '; Secure' : '';
  return `${navn}=${verdi}; Expires=${utloeper}; Max-Age=${levetid}${sikker}; HttpOnly; Path=/; SameSite=Lax`;
}

const omdiriger = (adresse: string, kapsler: string[]): Svar => [
  302,
  null,
  { Location: adresse, 'Set-Cookie': kapsler },
];

/**
 * Kaster som `writeHead` for et navn eller en verdi Node ikke godtar, i hodene
 * ruteren skriver for svaret på `rute` (#854 punkt 2).
 */
function kontrollerHoder(svar: Svar, rute: Rute): void {
  for (const [navn, verdi] of Object.entries(svarhoder(svar, rute.hoder)))
    for (const v of verdi === undefined ? [] : [verdi].flat()) {
      validateHeaderName(navn);
      validateHeaderValue(navn, String(v));
    }
}

const utilgjengelig = (): Svar => [
  503,
  { error: 'AUTH_UNAVAILABLE', message: 'Innlogging er midlertidig utilgjengelig.' },
];

/** `app_users.id` for Catenda-identiteten. Basen avviser et subjekt som ikke er normalisert. */
export async function catendaIdentitet(pool: Pool, bruker: CatendaBruker): Promise<string> {
  const svar = await utenKontekst(pool)
    .input('subjekt', sql.NVarChar(400), bruker.subjekt)
    .input('epost', sql.NVarChar(320), bruker.epost)
    .input('navn', sql.NVarChar(400), bruker.navn)
    .output('bruker', sql.UniqueIdentifier)
    .execute('koe_api.catenda_identitet');
  const id = svar.output.bruker;
  if (typeof id !== 'string' || !id) throw new Error('Identiteten ble ikke avgjort');
  return id.toLowerCase();
}

/**
 * `AuthService.login`: identiteten, så medlemslistene og deaktiveringen. Tidspunktet
 * for prosjektlisten leses av basens klokke før listen hentes (B-04 punkt 1), og
 * en ufullstendig liste gir feil, aldri en deaktivering (B-04 punkt 4).
 */
async function medlemskapVedInnlogging(
  pool: Pool,
  oauth: Innloggingsleverandoer,
  token: string
): Promise<string> {
  const catendaBruker = await oauth.bruker(token);
  const bruker = await catendaIdentitet(pool, catendaBruker);
  const hentet = await basensKlokke(pool);
  const catendaProsjekter = [...(await oauth.prosjekter(token))];
  for (const prosjekt of await kobledeProsjekter(pool, catendaProsjekter))
    await synkroniserProsjekt(pool, prosjekt, (c) => oauth.medlemmer(c, token));
  await deaktiverVedInnlogging(pool, {
    subjekt: catendaBruker.subjekt,
    catendaProsjekter,
    hentet,
  });
  return bruker;
}

/** Det som skiller innloggingen med Catenda fra innloggingen med Entra ID. */
interface Leverandoer {
  /**
   * Det som følger sesjonsnavnet i navnet på innloggingskapselen. Hver leverandør har sin, så et
   * forsøk startet for den ene ikke kan fullføres på tilbakekallet til den andre.
   */
  kapselsuffiks: string;
  sattOpp(innlogging: Innlogging): boolean;
  /** Lenken til leverandøren for forsøket. */
  adresse(innlogging: Innlogging, forsoek: { state: string; nettleser: string }): string;
  /** Kontoen bak koden, som `app_users.id`. Kaster når identiteten ikke kan avgjøres. */
  konto(
    innlogging: Innlogging,
    kode: string,
    nettleser: string,
    avh: Required<Avhengigheter>
  ): Promise<string>;
}

const CATENDA: Leverandoer = {
  kapselsuffiks: '_login',
  sattOpp: () => true,
  adresse: ({ oauth }, { state }) => oauth.autorisasjonsadresse(state),
  konto: async ({ oauth }, kode, _nettleser, avh) =>
    medlemskapVedInnlogging(avh.datalag, oauth, await oauth.byttKode(kode)),
};

/**
 * Bare identiteten: tokenet gir ingen prosjekttilgang, og medlemskapet synkroniseres ikke.
 * En identitet driften har koblet til en eksisterende bruker, har den brukerens medlemskap (S5 i #831).
 */
const ENTRA: Leverandoer = {
  kapselsuffiks: '_entra_login',
  sattOpp: ({ entra }) => Boolean(entra),
  adresse: ({ entra }, { state, nettleser }) => entra!.autorisasjonsadresse(state, nettleser),
  konto: async ({ entra }, kode, nettleser, avh) => {
    const idToken = await entra!.byttKode(kode, nettleser);
    return entraIdentitet(avh.datalag, await entra!.valider(idToken, nettleser, avh.tidspunkt()));
  },
};

async function loggInn(
  foresporsel: IncomingMessage,
  avh: Required<Avhengigheter>,
  leverandoer: Leverandoer
): Promise<Svar> {
  if (!avh.innlogging || !leverandoer.sattOpp(avh.innlogging)) return utilgjengelig();
  const url = new URL(foresporsel.url ?? '/', 'http://localhost');
  try {
    const forsoek = await opprettInnloggingsforsoek(
      avh.datalag,
      tryggRetursti(url.searchParams.get('return_to'))
    );
    return omdiriger(leverandoer.adresse(avh.innlogging, forsoek), [
      kapsel(
        `${sesjonsnavn()}${leverandoer.kapselsuffiks}`,
        forsoek.nettleser,
        FORSOEKETS_LEVETID,
        avh.tidspunkt()
      ),
    ]);
  } catch (feil) {
    loggFeil('Innloggingen kunne ikke startes', feil);
    return utilgjengelig();
  }
}

async function tilbakekall(
  foresporsel: IncomingMessage,
  avh: Required<Avhengigheter>,
  rute: Rute,
  leverandoer: Leverandoer
): Promise<Svar> {
  const innlogging = avh.innlogging;
  if (!innlogging || !leverandoer.sattOpp(innlogging)) return [503, { error: 'AUTH_UNAVAILABLE' }];
  const url = new URL(foresporsel.url ?? '/', 'http://localhost');
  const navn = sesjonsnavn();
  const naa = avh.tidspunkt();
  const ryddForsoek = kapsel(`${navn}${leverandoer.kapselsuffiks}`, '', 0, naa);
  const mislyktes = omdiriger(`${innlogging.frontend}/login?error=login_failed`, [ryddForsoek]);
  try {
    const state = url.searchParams.getAll('state');
    const kode = url.searchParams.getAll('code');
    const nettleser = informasjonskapsel(foresporsel, `${navn}${leverandoer.kapselsuffiks}`);
    if (state.length !== 1 || !state[0] || !nettleser) return mislyktes;
    const retursti = await brukInnloggingsforsoek(avh.datalag, state[0], nettleser);
    if (retursti === null || url.searchParams.get('error') || kode.length !== 1 || !kode[0])
      return mislyktes;
    // Basen gir den lagrede stien tilbake uten ny kontroll.
    const innlogget = (token: string) =>
      omdiriger(`${innlogging.frontend}${tryggRetursti(retursti)}`, [
        kapsel(navn, token, SESJONENS_LEVETID, naa),
        ryddForsoek,
      ]);
    // Hodene prøves før sesjonen endres, så et hode Node avviser, ikke etterlater en
    // sesjon klienten aldri fikk (#763 punkt 8). Tokenet er base64url.
    kontrollerHoder(innlogget(''), rute);
    const bruker = await leverandoer.konto(innlogging, kode[0], nettleser, avh);
    const sesjon = await opprettSesjon(avh.datalag, bruker);
    const gammel = informasjonskapsel(foresporsel, navn);
    // Den nye sesjonen slettes når den gamle ikke kan slettes, så klienten beholder én (#854 punkt 1).
    if (gammel)
      await slettSesjon(avh.datalag, gammel).catch(async (feil) => {
        await slettSesjon(avh.datalag, sesjon.token).catch((rydding) =>
          loggFeil('Den nye sesjonen kunne ikke slettes etter tilbakekallet', rydding)
        );
        throw feil;
      });
    return innlogget(sesjon.token);
  } catch (feil) {
    loggFeil('Tilbakekallet fra innloggingen feilet', feil);
    return mislyktes;
  }
}

async function visSesjon({ sesjon }: Innlogget): Promise<Svar> {
  return [200, { user: sesjon.bruker, csrfToken: sesjon.csrfToken }];
}

async function loggUt({ token }: Innlogget, avh: Required<Avhengigheter>): Promise<Svar> {
  await slettSesjon(avh.datalag, token);
  return [
    200,
    { success: true },
    { 'Set-Cookie': [kapsel(sesjonsnavn(), '', 0, avh.tidspunkt())] },
  ];
}

async function csrfToken({ sesjon }: Innlogget): Promise<Svar> {
  return [200, { csrfToken: sesjon.csrfToken, expiresIn: 3600 }];
}

const TILBAKEKALLET: Rute = {
  metode: 'GET',
  ...fast('/api/auth/catenda/callback'),
  tilgang: {
    utenSesjon:
      'Tilbakekallet fra Catenda, som oppretter sesjonen. Staten og innloggingskapselen binder det til forsøket.',
  },
  hoder: PRIVAT,
  behandle: (f: IncomingMessage, avh: Required<Avhengigheter>) =>
    tilbakekall(f, avh, TILBAKEKALLET, CATENDA),
};

const ENTRA_TILBAKEKALLET: Rute = {
  metode: 'GET',
  ...fast('/api/auth/entra/callback'),
  tilgang: {
    utenSesjon:
      'Tilbakekallet fra Entra ID, som oppretter sesjonen. Staten og innloggingskapselen binder det til forsøket, og nonce og PKCE binder ID-tokenet til kapselen.',
  },
  hoder: PRIVAT,
  behandle: (f: IncomingMessage, avh: Required<Avhengigheter>) =>
    tilbakekall(f, avh, ENTRA_TILBAKEKALLET, ENTRA),
};

export const INNLOGGINGSRUTER: readonly Rute[] = [
  {
    metode: 'GET',
    ...fast('/api/auth/catenda/login'),
    tilgang: { utenSesjon: 'Starter innloggingen; brukeren har ingen sesjon ennå.' },
    hoder: PRIVAT,
    behandle: (f: IncomingMessage, avh: Required<Avhengigheter>) => loggInn(f, avh, CATENDA),
  },
  TILBAKEKALLET,
  {
    metode: 'GET',
    ...fast('/api/auth/entra/login'),
    tilgang: { utenSesjon: 'Starter innloggingen med Entra ID; brukeren har ingen sesjon ennå.' },
    hoder: PRIVAT,
    behandle: (f: IncomingMessage, avh: Required<Avhengigheter>) => loggInn(f, avh, ENTRA),
  },
  ENTRA_TILBAKEKALLET,
  {
    metode: 'GET',
    ...fast('/api/auth/session'),
    tilgang: { utenProsjekt: 'Sesjonen gjelder brukeren, ikke et prosjekt.' },
    hoder: PRIVAT,
    behandle: visSesjon,
  },
  {
    metode: 'POST',
    ...fast('/api/auth/logout'),
    tilgang: { utenProsjekt: 'Utloggingen sletter brukerens sesjon, uavhengig av prosjekt.' },
    hoder: PRIVAT,
    behandle: loggUt,
  },
  {
    metode: 'GET',
    ...fast('/api/csrf-token'),
    tilgang: { utenProsjekt: 'CSRF-tokenet hører til sesjonen, ikke til et prosjekt.' },
    hoder: { 'Cache-Control': 'no-store' },
    behandle: csrfToken,
  },
];
