-- Rollen og rettighetene til runtime, og sikkerhetspolicyen. Kjøres etter en
-- eventuell feilinnføring, fordi en policy binder predikatfunksjonene
-- (SCHEMABINDING) og hindrer at de endres.
--
-- Runtime leser gjennom RLS og skriver bare med kommandoene i `koe_api`. Den
-- leser ikke identitet, medlemskap eller kontraktsteam direkte.

CREATE ROLE koe_runtime;
GRANT EXECUTE ON SCHEMA::koe_api TO koe_runtime;
GRANT SELECT ON SCHEMA::form_a TO koe_runtime;
GRANT SELECT ON SCHEMA::form_b TO koe_runtime;
GRANT SELECT ON koe.sak_metadata TO koe_runtime;
GRANT SELECT ON koe.notat TO koe_runtime;
CREATE USER koe_runtime_login FOR LOGIN koe_runtime_login;
ALTER ROLE koe_runtime ADD MEMBER koe_runtime_login;
GO

CREATE SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.sak_metadata,
  ADD FILTER PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, aktor_team_id) ON koe.notat,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id) ON koe.notat AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id) ON koe.notat BEFORE UPDATE,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id) ON koe.notat AFTER UPDATE,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_a.hendelse,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id) ON form_a.hendelse AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_a.krav,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_a.svar,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_a.utsagn,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_a.leveringsoppdrag,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.dokument,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id) ON form_b.dokument AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.sak_opprettet,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.krav,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.svar,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.standpunkt,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.virkning,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.utsagn,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.opplysning,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.dokumentasjon,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON form_b.leveringsdokument
WITH (STATE = ON, SCHEMABINDING = ON);
GO
