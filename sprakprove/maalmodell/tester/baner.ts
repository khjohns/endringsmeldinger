/**
 * Banene testene kjører i: minnet alltid, testbasen når `KOE_TESTBASE_URL` er
 * satt. Testbasebanen bruker lageret og en midlertidig buffertabell.
 */

import type { PoolClient } from 'pg';
import { lagOppsett, rydd, TESTBASE_URL, type Oppsett } from '../../tester/testbase.ts';
import type { Kjerne } from '../kjerne/regelsett.ts';
import { minnebuffer, pgBuffer, type Bufferlager } from '../server/buffer.ts';
import { basebane, minnebane, type Bane } from './bane.ts';
import type { Handling } from './klient.ts';
import { Forutsetning, Kjoring, MAALMODELL } from './kjorer.ts';

export interface Baner {
  navn: string;
  start(): Promise<void>;
  stopp(): Promise<void>;
  bane(): Promise<Bane>;
  buffer(): Bufferlager;
}

export function minnet(): Baner {
  let lager = minnebuffer();
  return {
    navn: 'i minnet',
    start: async () => void (lager = minnebuffer()),
    stopp: async () => {},
    bane: async () => minnebane(),
    buffer: () => lager,
  };
}

export function testbasen(): Baner {
  let o: Oppsett;
  let klient: PoolClient;
  let lager: Bufferlager;
  return {
    navn: 'mot testbasen',
    async start() {
      o = await lagOppsett();
      klient = await o.pool.connect();
      lager = await pgBuffer(klient);
    },
    async stopp() {
      klient?.release();
      if (o) await rydd(o);
    },
    bane: () => basebane(o),
    buffer: () => lager,
  };
}

export const BANER: (() => Baner)[] = TESTBASE_URL ? [minnet, testbasen] : [minnet];

/** Kjør stegene og krev at hvert godtas. Et prefiks-navn kjøres først. */
export async function bygg(
  bane: Bane,
  steg: (Handling | string)[],
  kjerne?: Kjerne
): Promise<Kjoring> {
  const k = new Kjoring(bane, kjerne);
  for (const h of steg.flatMap((s) => (typeof s === 'string' ? MAALMODELL.prefikser[s] : [s]))) {
    const u = await k.send(h);
    if (u && !u.godtatt)
      throw new Forutsetning(
        `${h.handling} ble avvist: ${u.avvisning.regel}: ${u.avvisning.melding}`
      );
  }
  return k;
}
