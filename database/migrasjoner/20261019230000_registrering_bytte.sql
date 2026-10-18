-- Bytte av Catenda-prosjekt ved ny registrering (#836, arbeidsvalget 18.10 i #764,
-- «Runde 8b»). Har prosjektet saker, avvises bytte av Catenda-prosjekt. Uten saker
-- krever et bytte at kontraktsteamene oppgis på nytt, og de gamle teamene
-- erstattes. Mappen og boardet beholdes bare når Catenda-prosjektet er det samme.
--
-- Prosedyren gir utfallet tilbake, så skriptet kan si at virksomheten er uendret
-- (KR-01) og at prosjektet står uten board.

CREATE OR ALTER PROCEDURE koe_drift.registrer_prosjekt
  @prosjekt nvarchar(4000),
  @navn nvarchar(4000),
  @beskrivelse nvarchar(max),
  @organisasjon nvarchar(4000),
  @catenda_prosjekt uniqueidentifier,
  @bibliotek uniqueidentifier,
  @mappe uniqueidentifier,
  @board uniqueidentifier,
  @team nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(LTRIM(RTRIM(@prosjekt)))
    THROW 52065, N'Prosjekt-ID-en er tom, for lang eller har mellomrom i endene', 1;
  IF @organisasjon IS NULL OR LEN(@organisasjon) = 0 OR DATALENGTH(@organisasjon) > 200
     OR DATALENGTH(@organisasjon) <> DATALENGTH(LTRIM(RTRIM(@organisasjon)))
    THROW 52065, N'Virksomheten er tom, for lang eller har mellomrom i endene; det finnes ingen standardvirksomhet', 1;
  IF @navn IS NULL OR LEN(@navn) = 0 OR DATALENGTH(@navn) > 800
    THROW 52065, N'Navnet er tomt eller for langt', 1;
  IF @catenda_prosjekt IS NULL OR @bibliotek IS NULL
    THROW 52065, N'Catenda-prosjektet og biblioteket må oppgis', 1;

  BEGIN TRANSACTION;
  DECLARE @nytt bit = 1;
  IF EXISTS (SELECT 1 FROM koe.projects WITH (UPDLOCK, HOLDLOCK) WHERE id = @prosjekt)
    SET @nytt = 0;

  DECLARE @forrige uniqueidentifier;
  SELECT @forrige = catenda_project_id
    FROM koe.catenda_project_configs WITH (UPDLOCK, HOLDLOCK)
   WHERE internal_project_id = @prosjekt;
  IF @forrige <> @catenda_prosjekt
  BEGIN
    IF EXISTS (SELECT 1 FROM koe.prosjekt_med_saker WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)
      THROW 52066, N'Prosjektet har saker: Catenda-prosjektet kan ikke byttes', 1;
    IF @team IS NULL
      THROW 52067, N'Catenda-prosjektet byttes: kontraktsteamene må oppgis på nytt med --bh og --te', 1;
  END

  IF @nytt = 0
    UPDATE koe.projects
       SET name = @navn, description = ISNULL(@beskrivelse, N'Prosjekt ' + @navn), is_active = 1
     WHERE id = @prosjekt;
  ELSE
    INSERT koe.projects (id, name, description, organisasjon_id, is_active)
    VALUES (@prosjekt, @navn, ISNULL(@beskrivelse, N'Prosjekt ' + @navn), @organisasjon, 1);

  IF @forrige IS NOT NULL
    UPDATE koe.catenda_project_configs
       SET catenda_project_id = @catenda_prosjekt, library_id = @bibliotek,
           folder_id = CASE WHEN @mappe IS NOT NULL THEN @mappe
                            WHEN catenda_project_id = @catenda_prosjekt THEN folder_id END,
           topic_board_id = CASE WHEN @board IS NOT NULL THEN @board
                                 WHEN catenda_project_id = @catenda_prosjekt THEN topic_board_id END,
           is_active = 1
     WHERE internal_project_id = @prosjekt;
  ELSE
    INSERT koe.catenda_project_configs (internal_project_id, catenda_project_id, library_id, folder_id, topic_board_id, is_active)
    VALUES (@prosjekt, @catenda_prosjekt, @bibliotek, @mappe, @board, 1);

  IF @team IS NOT NULL
    EXEC koe_drift.sett_kontraktsteam @prosjekt, @team;
  COMMIT;

  SELECT @nytt AS nytt, p.organisasjon_id,
         LOWER(CONVERT(nvarchar(36), c.folder_id)) AS mappe,
         LOWER(CONVERT(nvarchar(36), c.topic_board_id)) AS board
    FROM koe.projects p
    JOIN koe.catenda_project_configs c ON c.internal_project_id = p.id
   WHERE p.id = @prosjekt;
END
GO
