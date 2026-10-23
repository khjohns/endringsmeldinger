/**
 * Vakta for tillatelseslisten i brokeren mot Catenda-kallene i
 * `docs/datamodell/dataflyt.toml` (#1200), som listen skal følge (README).
 * `GET /v2/user` og `GET …/comments` sto i fila, men manglet i listen, og det
 * viste seg først som 403 i de levende testene (#1149).
 *
 * Fila leses med en liten leser for stegene: `[[flyt.steg]]`, `endepunkt` på
 * én eller flere linjer og `kode` på én eller flere linjer. Et endepunkt med en
 * sti under `/v2`, `/opencde` eller `/oauth2`, eller en forkortet sti med `…/`,
 * er et kall og må kunne tolkes. Et kall med spørrestreng eller sider regnes som
 * avvist på en regel med førsjekk, som i `lagBroker`.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { regelFor, type Miljoe } from './broker.ts';

const DATAFLYT = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/datamodell/dataflyt.toml');

const PROSJEKT = '0123456789abcdef0123456789abcdef';
const BOARD = 'fedcba9876543210fedcba9876543210';
const BIBLIOTEK = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const ANNEN_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const miljoe: Miljoe = {
  BROKERNOKKEL: 'brokernokkel-for-testen',
  CATENDA_CLIENT_ID: 'klient',
  CATENDA_CLIENT_SECRET: 'catenda-hemmelighet',
  CATENDA_PROSJEKT_ID: PROSJEKT,
  CATENDA_TOPIC_BOARD_ID: BOARD,
  CATENDA_BIBLIOTEK_ID: BIBLIOTEK,
  CATENDA_MAPPE_ID: 'dddddddddddddddddddddddddddddddd',
};

const PLASSHOLDERE: Record<string, string> = {
  catenda_project_id: PROSJEKT,
  topic_board_id: BOARD,
  catenda_board_id: BOARD,
  library_id: BIBLIOTEK,
  topic_guid: ANNEN_ID,
  catenda_topic_id: ANNEN_ID,
  related_topic_guid: ANNEN_ID,
  item_id: ANNEN_ID,
  team_id: ANNEN_ID,
  object_id: ANNEN_ID,
};

/**
 * Stegene i `dataflyt.toml` brokeren bevisst ikke slipper gjennom, som flyt-ID og endepunktet
 * slik det står, med kallene i steget som skal avvises.
 */
const UNNTAK: Record<string, { grunn: string; avvist: string[] }> = {
  'C03 POST /oauth2/token': {
    grunn: 'Tokenkallet svarer brokeren på selv, med brokernøkkelen.',
    avvist: ['POST /oauth2/token'],
  },
  'C03 GET /v2/projects (sidevis)': {
    grunn: 'Prosjektlisten ved innloggingen i Python. Brokeren er avgrenset til ett prosjekt.',
    avvist: ['GET /v2/projects'],
  },
  'C17 GET /v2/projects': {
    grunn: 'Prosjektlisten i Python. Brokeren er avgrenset til ett prosjekt.',
    avvist: ['GET /v2/projects'],
  },
  'C16 GET /v2/projects/{catenda_project_id}/ifc/products, POST samme sti ved søk, og GET …/ifc/products/ifctypes': {
    grunn: 'IFC-søket i BIM-rutene i Python, som integrasjonen fra skyøkta ikke bruker. `ifctypes` er tillatt.',
    avvist: ['GET /v2/projects/{catenda_project_id}/ifc/products', 'POST /v2/projects/{catenda_project_id}/ifc/products'],
  },
};

type Steg = { flyt: string; endepunkt: string; kode: string[] };

const noekkel = (s: Steg) => `${s.flyt} ${s.endepunkt}`;

/** Stegene i fila. Kaster når et steg mangler `endepunkt` eller `kode`. */
function lesSteg(tekst: string): Steg[] {
  const steg: Steg[] = [];
  let flyt = '';
  for (const blokk of tekst.split(/^(?=[ \t]*\[\[)/m).map((b) => b.trimStart())) {
    const id = /^\[\[flyt\]\]$[\s\S]*?^\s*id = "([^"]+)"$/m.exec(blokk);
    if (id) flyt = id[1];
    if (!blokk.startsWith('[[flyt.steg]]')) continue;
    const endepunkt = /^\s*endepunkt = (?:"""([\s\S]*?)"""|"([^"]*)")$/m.exec(blokk);
    const kode = /^\s*kode = \[([\s\S]*?)\]$/m.exec(blokk);
    if (!endepunkt || !kode) throw new Error(`Et steg i ${flyt} mangler endepunkt eller kode`);
    steg.push({
      flyt,
      endepunkt: (endepunkt[1] ?? endepunkt[2]).trim().replace(/\s+/g, ' '),
      kode: [...kode[1].matchAll(/"([^"]+)"/g)].map((t) => t[1]),
    });
  }
  return steg;
}

type Kall = { flyt: string; metode: string; sti: string; endepunkt: string; medSoek: boolean };

/** Metodene og stien i endepunktet, med test-ID-er for plassholderne. Kaster når det ikke kan tolkes. */
function kallI(s: Steg): Kall[] {
  const tolket = /^([A-Z]+(?: og [A-Z]+)*) (\/[^\s?]+)(\?\S*)?( \(.*)?$/.exec(s.endepunkt);
  if (!tolket) throw new Error(`${s.flyt}: endepunktet kan ikke tolkes: ${s.endepunkt}`);
  const sti = tolket[2].replace(/\{([a-z_]+)\}/g, (_t, navn: string) => {
    const verdi = PLASSHOLDERE[navn];
    if (!verdi) throw new Error(`${s.flyt}: ukjent plassholder {${navn}} i ${s.endepunkt}`);
    return verdi;
  });
  const medSoek = tolket[3] !== undefined || (tolket[4] ?? '').includes('sidevis');
  return tolket[1].split(' og ').map((metode) => ({ flyt: s.flyt, metode, sti, endepunkt: s.endepunkt, medSoek }));
}

/** Som `lagBroker`: stien står i listen, og en regel med førsjekk tar ikke spørrestreng. */
function slippesGjennom(k: Kall): boolean {
  const regel = regelFor(miljoe, k.metode, k.sti);
  return regel !== undefined && !(regel.foersjekk && k.medSoek);
}

const erKall = (s: Steg) => /\/(?:v2|opencde|oauth2)\b|…\//.test(s.endepunkt);

const tekst = readFileSync(DATAFLYT, 'utf8');
const steg = lesSteg(tekst);
const kallsteg = steg.filter(erKall);

describe('tillatelseslisten i brokeren mot dataflyt.toml (#1200)', () => {
  it('leser hvert steg og kallene TS-serveren gjør, så en leser som ikke finner noe, ikke blir grønn', () => {
    expect(steg).toHaveLength(tekst.match(/^\s*\[\[flyt\.steg\]\]$/gm)?.length ?? 0);
    const fraServer = kallsteg.filter((s) => s.kode.some((k) => k.startsWith('server/'))).flatMap(kallI);
    expect(fraServer).toContainEqual(expect.objectContaining({ metode: 'GET', sti: '/v2/user' }));
    expect(fraServer).toContainEqual(
      expect.objectContaining({ metode: 'GET', sti: `/opencde/bcf/3.0/projects/${BOARD}/topics/${ANNEN_ID}/comments` })
    );
  });

  it('slipper gjennom hvert Catenda-kall i dataflyt.toml som ikke er et unntak', () => {
    const avvist = kallsteg
      .filter((s) => !(noekkel(s) in UNNTAK))
      .flatMap(kallI)
      .filter((k) => !slippesGjennom(k))
      .map((k) => `${k.flyt} ${k.metode}: ${k.endepunkt}`);
    expect(avvist).toEqual([]);
  });

  it('har bare unntak som står i dataflyt.toml og fortsatt avvises', () => {
    const noekler = new Set(kallsteg.map(noekkel));
    for (const [unntak, { avvist }] of Object.entries(UNNTAK)) {
      expect(noekler, unntak).toContain(unntak);
      for (const endepunkt of avvist)
        for (const k of kallI({ flyt: unntak, endepunkt, kode: [] }))
          expect(slippesGjennom(k), `${unntak}: ${endepunkt}`).toBe(false);
    }
  });
});
