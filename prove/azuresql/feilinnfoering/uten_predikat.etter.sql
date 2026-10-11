-- Feilinnføring: to tabeller med saksdata mangler filterpredikat. Ventet rødt:
-- katalogtesten og lesingen uten kontekst i tilgang.test.ts.

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  DROP FILTER PREDICATE ON form_a.utsagn,
  DROP FILTER PREDICATE ON form_b.standpunkt;
GO
