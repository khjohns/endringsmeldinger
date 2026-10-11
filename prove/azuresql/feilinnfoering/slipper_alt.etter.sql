-- Feilinnføring: filteret på to tabeller byttes mot et predikat som slipper
-- alt gjennom. Predikatet finnes, men holder ikke prosjektgrensen. Ventet
-- rødt: katalogtesten og lesingen uten kontekst i tilgang.test.ts.

CREATE FUNCTION koe_sikkerhet.alle(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN SELECT 1 AS tilgang;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ALTER FILTER PREDICATE koe_sikkerhet.alle(prosjekt_id) ON form_b.opplysning,
  ALTER FILTER PREDICATE koe_sikkerhet.alle(prosjekt_id) ON form_b.dokumentasjon;
GO
