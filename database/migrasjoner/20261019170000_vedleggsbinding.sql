-- Bindingen av vedleggene i et brev (V-2, del av #790). Når en hendelse viser til et
-- vedlegg i `dokumentasjon`, får vedlegget `bundet_av_event_id` til den første hendelsen
-- som binder det, og blir uforanderlig (arbeidsvalg 4 i #790). Brevet lagrer ID-en,
-- filnavnet og summen (LV-U14), og bindingen leser dem fra den lagrede hendelsen, ikke
-- fra klienten.

-- Bare bindingen er lov: `bundet_av_event_id` fra NULL til en hendelse. Hver annen
-- endring, også av et bundet vedlegg, kaster som før.
CREATE OR ALTER TRIGGER koe.vedlegg_uten_endring ON koe.vedlegg INSTEAD OF UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(vedlegg_id) OR UPDATE(prosjekt_id) OR UPDATE(sak_id) OR UPDATE(filnavn)
     OR UPDATE(stoerrelse) OR UPDATE(innhold_sha256) OR UPDATE(innhold) OR UPDATE(lastet_opp_av)
     OR UPDATE(lastet_opp_side) OR UPDATE(lastet_opp_team) OR UPDATE(lastet_opp)
     OR EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.vedlegg_id = i.vedlegg_id
                 WHERE d.bundet_av_event_id IS NOT NULL OR i.bundet_av_event_id IS NULL)
    THROW 51001, N'Et vedlegg endres ikke', 1;
  UPDATE v SET bundet_av_event_id = i.bundet_av_event_id
    FROM koe.vedlegg v JOIN inserted i ON i.vedlegg_id = v.vedlegg_id;
END
GO

-- Binder vedleggene hendelsen viser til, i samme transaksjon som hendelsen skrives.
-- Et ubundet vedlegg bindes bare av teamet som lastet det opp, og uten entydig team
-- bindes det ikke (arbeidsvalg 3 i #790). Et bundet vedlegg kan det vises til igjen i
-- samme sak. Hvert vedlegg må finnes i saken og prosjektet med filnavnet og summen
-- hendelsen lagret; ellers rulles skrivingen tilbake (51422). Bindingen skjer før
-- kontrollen, så et vedlegg som slettes samtidig, ikke slipper gjennom.
CREATE PROCEDURE koe_api.bind_vedlegg @event_id nvarchar(36), @sak_id nvarchar(36)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedleggene bindes bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(100) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100));
  DECLARE @team nvarchar(32) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32));
  DECLARE @data nvarchar(max) =
    (SELECT data FROM koe.hendelse WHERE event_id = @event_id AND sak_id = @sak_id AND prosjekt_id = @prosjekt);
  IF @data IS NULL
    THROW 51403, N'Ukjent hendelse', 1;
  DECLARE @vedlegg TABLE (
    vedlegg_id uniqueidentifier NULL,
    filnavn nvarchar(200) NULL,
    innhold_sha256 nvarchar(64) NULL);
  INSERT @vedlegg (vedlegg_id, filnavn, innhold_sha256)
  SELECT TRY_CAST(vedlegg_id AS uniqueidentifier), filnavn, innhold_sha256
    FROM OPENJSON(@data, N'$.dokumentasjon')
         WITH (vedlegg_id nvarchar(36) N'$.vedlegg_id', filnavn nvarchar(200) N'$.filnavn',
               innhold_sha256 nvarchar(64) N'$.innhold_sha256');
  UPDATE v SET bundet_av_event_id = @event_id
    FROM koe.vedlegg v JOIN @vedlegg b ON b.vedlegg_id = v.vedlegg_id
   WHERE v.sak_id = @sak_id AND v.prosjekt_id = @prosjekt AND v.bundet_av_event_id IS NULL
     AND v.lastet_opp_team = @team;
  IF EXISTS (
    SELECT 1 FROM @vedlegg b
     WHERE NOT EXISTS (
       SELECT 1 FROM koe.vedlegg v
        WHERE v.vedlegg_id = b.vedlegg_id AND v.sak_id = @sak_id AND v.prosjekt_id = @prosjekt
          AND v.bundet_av_event_id IS NOT NULL
          AND v.filnavn COLLATE Latin1_General_100_BIN2 = b.filnavn COLLATE Latin1_General_100_BIN2
          AND v.innhold_sha256 COLLATE Latin1_General_100_BIN2 = b.innhold_sha256 COLLATE Latin1_General_100_BIN2))
    THROW 51422, N'Et vedlegg i hendelsen finnes ikke i saken', 1;
END
GO

GRANT EXECUTE ON koe_api.bind_vedlegg TO koe_runtime;
