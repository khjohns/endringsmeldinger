/**
 * `globalSetup` for vitest: bygger malen for testbasene i SQL Server før
 * testfilene starter, så ingen `beforeAll` venter på migreringen (#887). Svarer
 * ikke serveren med en gang, bygger den første testfilen som trenger malen, den
 * selv, og venter på serveren som før.
 */

import { SQLSERVER_TILKOBLING } from './sqlserver.ts';
import { byggMal } from './sqlserver_migrert.ts';

export default async function (): Promise<void> {
  if (!SQLSERVER_TILKOBLING) return;
  try {
    await byggMal({ frist: 0 });
  } catch (feil) {
    console.warn(`Malen for SQL Server-testbasene ble ikke bygget før testene: ${String(feil)}`);
  }
}
