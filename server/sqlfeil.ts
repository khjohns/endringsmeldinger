/**
 * Feilnummeret fra SQL Server: 2627 for brudd på en unik nøkkel, et eget nummer
 * fra THROW osv. `mssql` har det på feilen selv, og en feil gjennom `tedious`
 * har det i `originalError.info`.
 */
export function feilnummer(feil: unknown): number | undefined {
  const f = feil as { number?: unknown; originalError?: { info?: { number?: unknown } } };
  // En `RequestError` uten `info` har koden fra `tedious` ('ETIMEOUT') i `number` (#926).
  for (const n of [f?.number, f?.originalError?.info?.number]) if (typeof n === 'number') return n;
  return undefined;
}
