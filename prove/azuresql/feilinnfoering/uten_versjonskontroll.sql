-- Feilinnføring: kommandoen i form (a) kontrollerer ikke forventet versjon og
-- skriver neste versjon etter den siste. Ventet rødt: versjonskonflikten i
-- lagring.test.ts, og bevis-sakene som venter en konflikt.

CREATE OR ALTER PROCEDURE koe_api.registrer_a
  @sak_id nvarchar(36), @forventet_versjon int, @event_id nvarchar(36), @event_type nvarchar(100),
  @tidsstempel datetimeoffset(3), @format int, @data nvarchar(max),
  @refererer_til_event_id nvarchar(36) = NULL, @oppdrag nvarchar(max) = NULL, @oppdrag_sha256 nvarchar(64) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 THROW 51000, N'Kommandoen kjøres bare inne i en transaksjon', 1;
  IF @sak_id IS NULL OR @forventet_versjon IS NULL OR @forventet_versjon < 0 OR @event_id IS NULL
     OR @event_type IS NULL OR @tidsstempel IS NULL OR @data IS NULL
     OR (@event_type = N'dokument_registrert' AND @oppdrag IS NULL)
     OR (@event_type <> N'dokument_registrert' AND @oppdrag IS NOT NULL)
    THROW 51422, N'Ugyldig argument', 1;
  DECLARE @prosjekt nvarchar(100), @aktor nvarchar(36), @side nvarchar(2), @team nvarchar(32);
  SELECT @prosjekt = prosjekt_id, @aktor = aktor_id, @side = side, @team = team_id FROM koe_sikkerhet.handlende();
  IF @prosjekt IS NULL OR NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  DECLARE @siste int = (SELECT MAX(versjon) FROM form_a.hendelse WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id);
  SET @forventet_versjon = ISNULL(@siste, 0);

  DECLARE @skriving uniqueidentifier = NEWID();
  EXEC sp_set_session_context N'koe_skriving', @skriving;
  INSERT form_a.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                          aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, @event_type, @forventet_versjon + 1, @tidsstempel, @aktor, @side,
          @team, @refererer_til_event_id, @format, @data, CURRENT_TRANSACTION_ID(), @skriving);

  INSERT form_a.krav (event_id, prosjekt_id, plass, id, spor, erstatter, beloep, dager)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.spor, j.erstatter, TRY_CAST(j.beloep AS float), TRY_CAST(j.dager AS float)
    FROM OPENJSON(CASE WHEN ISJSON(JSON_QUERY(@data, N'$.krav'), ARRAY) = 1 THEN JSON_QUERY(@data, N'$.krav') END) e
   CROSS APPLY OPENJSON(CASE WHEN e.type = 5 THEN e.value END)
         WITH (id nvarchar(max), spor nvarchar(max), erstatter nvarchar(max), beloep nvarchar(max), dager nvarchar(max)) j;

  INSERT form_a.svar (event_id, prosjekt_id, plass, id, spor, gjelder, erstatter, regelversjon, sammenfall)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.spor, j.gjelder, j.erstatter, TRY_CAST(j.regelversjon AS float),
         CASE j.sammenfall WHEN N'true' THEN 1 WHEN N'false' THEN 0 END
    FROM OPENJSON(CASE WHEN ISJSON(JSON_QUERY(@data, N'$.svar'), ARRAY) = 1 THEN JSON_QUERY(@data, N'$.svar') END) e
   CROSS APPLY OPENJSON(CASE WHEN e.type = 5 THEN e.value END)
         WITH (id nvarchar(max), spor nvarchar(max), gjelder nvarchar(max), erstatter nvarchar(max),
               regelversjon nvarchar(max) N'$.beslutningsgrunnlag.regelversjon',
               sammenfall nvarchar(max) N'$.beslutningsgrunnlag.sammenfall') j;

  INSERT form_a.utsagn (event_id, prosjekt_id, plass, id, art, gjelder, spor)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.art, j.gjelder, j.spor
    FROM OPENJSON(CASE WHEN ISJSON(JSON_QUERY(@data, N'$.utsagn'), ARRAY) = 1 THEN JSON_QUERY(@data, N'$.utsagn') END) e
   CROSS APPLY OPENJSON(CASE WHEN e.type = 5 THEN e.value END)
         WITH (id nvarchar(max), art nvarchar(max), gjelder nvarchar(max), spor nvarchar(max)) j;

  IF @oppdrag IS NOT NULL
    INSERT form_a.leveringsoppdrag (event_id, prosjekt_id, innhold, innhold_sha256)
    VALUES (@event_id, @prosjekt, @oppdrag, @oppdrag_sha256);
  -- Delene er skrevet; ingen senere setning i transaksjonen kan legge til flere.
  EXEC sp_set_session_context N'koe_skriving', NULL;
END
GO
