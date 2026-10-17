-- Leveringsmålet for brevene (F0b-7, #661): biblioteket og mappen i
-- Catenda-prosjektet koblingen peker på, og Catenda-topicen per sak. Målet
-- fryses i leveringsoppdraget i samme transaksjon som brevet (LV-U1), så det
-- leses i skrivetransaksjonen med `koe_api.leveringsmaal`.
--
-- Navnene er de samme som i PostgreSQL og Catenda-API-et. Koblingen kan stå uten
-- bibliotek, fordi medlemskapet bruker den uten levering; da skrives ikke brevet.
-- Topicen settes når saken opprettes, som resten av raden (#370).

ALTER TABLE koe.catenda_project_configs ADD
  library_id uniqueidentifier NULL,
  folder_id uniqueidentifier NULL,
  CONSTRAINT catenda_project_configs_mappe_krever_bibliotek
    CHECK (folder_id IS NULL OR library_id IS NOT NULL);
GO

ALTER TABLE koe.sak_metadata ADD
  catenda_topic_id nvarchar(100) NULL
    CONSTRAINT sak_metadata_catenda_topic_id_ikke_tom CHECK (LEN(catenda_topic_id) > 0);
GO

-- Målet for brevene i saken, i prosjektet i konteksten. Saken leses under
-- radsikkerheten, så den finnes bare for et medlem av prosjektet. Ingen rad uten
-- aktiv kobling. Kjøretiden har ingen rett på koblingen og får målet her.
CREATE PROCEDURE koe_api.leveringsmaal
  @sak_id nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT LOWER(CONVERT(nvarchar(36), c.catenda_project_id)) AS catenda_project_id,
         LOWER(CONVERT(nvarchar(36), c.library_id)) AS library_id,
         LOWER(CONVERT(nvarchar(36), c.folder_id)) AS folder_id,
         m.catenda_topic_id AS topic_id
    FROM koe.sak_metadata m
    JOIN koe.catenda_project_configs c ON c.internal_project_id = m.prosjekt_id AND c.is_active = 1
   WHERE m.sak_id = @sak_id
     AND m.prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100));
END
GO

GRANT EXECUTE ON koe_api.leveringsmaal TO koe_runtime;
