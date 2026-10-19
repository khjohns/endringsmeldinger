/**
 * `globalSetup` for serverprosjektet i vitest: bygger malen for testbasene i SQL
 * Server før testfilene starter, så ingen `beforeAll` venter på migreringen
 * (#887). Vitest kjører den bare når en fil fra `server/` er med (#930). Svarer
 * ikke serveren med en gang, bygger den første testfilen som trenger malen, den
 * selv, og venter på serveren som før. Med `KOE_TESTMAL_ENGANGS` satt slettes en
 * mal som ble bygget i kjøringen, etter kjøringen: `feilinnfoering.py` setter den
 * for mutasjonene, der en endret migrasjon gir en mal ingen bruker igjen.
 */

import { SQLSERVER_TILKOBLING } from './sqlserver.ts';
import { byggMal, slettMal } from './sqlserver_migrert.ts';

export default async function (): Promise<(() => Promise<void>) | undefined> {
  if (!SQLSERVER_TILKOBLING) return;
  try {
    const { fil, bygget } = await byggMal({ frist: 0 });
    if (bygget && process.env.KOE_TESTMAL_ENGANGS) return () => slettMal(fil);
  } catch (feil) {
    console.warn(`Malen for SQL Server-testbasene ble ikke bygget før testene: ${String(feil)}`);
  }
}
