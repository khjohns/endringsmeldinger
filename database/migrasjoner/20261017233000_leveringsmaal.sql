-- Leveringsmålet for brevene (F0b-7, #661): biblioteket og mappen i
-- Catenda-prosjektet koblingen peker på, og sakens topic i Catenda. Målet fryses
-- i leveringsoppdraget i samme transaksjon som brevet (LV-U1), så det leses i
-- skrivetransaksjonen med `koe_api.leveringsmaal`. Navnene er de samme som i
-- PostgreSQL og Catenda-API-et (arbeidsvalgene 17.10 i #661).
--
-- Koblingen har alltid et bibliotek, som i PostgreSQL. Ingen base i drift har
-- koblinger ennå, så kolonnen legges til uten standardverdi.

ALTER TABLE koe.catenda_project_configs ADD
  library_id uniqueidentifier NOT NULL,
  folder_id uniqueidentifier NULL;
GO

-- Sakens topic i Catenda, med boardet dokumentreferansen krever. En sak fra appen
-- får topicen etter at saken er lagret, fordi ingen ekstern virkning skjer før
-- commit, og saksraden er uforanderlig. Derfor en egen rad per sak, som bare kan
-- legges til. Ingen prosedyre skriver den ennå (#370, #371).
CREATE TABLE koe.sak_catenda_topic (
  sak_id nvarchar(36) NOT NULL CONSTRAINT sak_catenda_topic_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT sak_catenda_topic_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  catenda_board_id nvarchar(100) NOT NULL CONSTRAINT sak_catenda_topic_board_ikke_tom CHECK (LEN(catenda_board_id) > 0),
  catenda_topic_id nvarchar(100) NOT NULL CONSTRAINT sak_catenda_topic_topic_ikke_tom CHECK (LEN(catenda_topic_id) > 0),
  CONSTRAINT sak_catenda_topic_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id)
);
GO

CREATE TRIGGER koe.sak_catenda_topic_uforanderlig ON koe.sak_catenda_topic INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Topicen til en sak endres ikke', 1;
END
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.sak_catenda_topic,
  ADD BLOCK PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.sak_catenda_topic AFTER INSERT;
GO

-- Målet for brevene i saken, i prosjektet i konteksten. Saken leses under
-- radsikkerheten, så den finnes bare for et medlem av prosjektet, og ingen rad
-- uten aktiv kobling. Uten topic er topicen og boardet null, som i PostgreSQL.
-- Kjøretiden har ingen rett på koblingen eller topicen og får målet her.
CREATE PROCEDURE koe_api.leveringsmaal
  @sak_id nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT LOWER(CONVERT(nvarchar(36), c.catenda_project_id)) AS catenda_project_id,
         LOWER(CONVERT(nvarchar(36), c.library_id)) AS library_id,
         LOWER(CONVERT(nvarchar(36), c.folder_id)) AS folder_id,
         t.catenda_board_id AS board_id,
         t.catenda_topic_id AS topic_id
    FROM koe.sak_metadata m
    JOIN koe.catenda_project_configs c ON c.internal_project_id = m.prosjekt_id AND c.is_active = 1
    LEFT JOIN koe.sak_catenda_topic t ON t.sak_id = m.sak_id AND t.prosjekt_id = m.prosjekt_id
   WHERE m.sak_id = @sak_id
     AND m.prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100));
END
GO

GRANT EXECUTE ON koe_api.leveringsmaal TO koe_runtime;
