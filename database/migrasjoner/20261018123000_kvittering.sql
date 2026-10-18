-- Idempotens per kommando med kvittering (invariant 4 i 2.3 i hovedplanen, #418).
--
-- Klienten gir hver kommando en ID. `koe_api.skriv_hendelse` og `koe_api.opprett_sak`
-- lagrer kvitteringen i samme transaksjon som brevet: kommando-ID-en, summen av
-- innholdet serveren regnet ut, og saken og brevet kommandoen ga. Før skrivingen
-- leser serveren kvitteringen med `koe_api.kvittering`. Samme ID med samme sum gir
-- saken og brevet fra kvitteringen, og ingenting skrives. Samme ID med en annen sum
-- avvises (51410). Det dekker også et usikkert utfall av COMMIT (#419): klienten
-- sender kommandoen på nytt med samme ID og får kvitteringen hvis COMMIT lyktes.
--
-- Kvitteringen gjelder aktøren i prosjektet, så en annen aktør ikke kan treffe
-- eller se den. Oppslaget låser nøkkelen med `UPDLOCK, HOLDLOCK`, så en samtidig
-- kommando med samme ID venter på den første og leser kvitteringen etter commit.
--
-- Prosedyrene er ellers som i `20261016230000_skranker.sql` og
-- `20261018100000_jobber.sql`, med samme feilkoder og rettigheter.

CREATE TABLE koe.kvittering (
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT kvittering_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  aktor_id uniqueidentifier NOT NULL,
  kommando_id nvarchar(36) NOT NULL,
  kommando_sha256 nvarchar(64) NOT NULL CONSTRAINT kvittering_sum
    CHECK (DATALENGTH(kommando_sha256) = 128 AND kommando_sha256 COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  sak_id nvarchar(36) NOT NULL,
  event_id nvarchar(36) NOT NULL CONSTRAINT kvittering_event_id UNIQUE,
  CONSTRAINT kvittering_pk PRIMARY KEY (prosjekt_id, aktor_id, kommando_id),
  CONSTRAINT kvittering_kommando_id_form CHECK (TRY_CAST(kommando_id AS uniqueidentifier) IS NOT NULL
    AND DATALENGTH(kommando_id) = 72 AND kommando_id COLLATE Latin1_General_100_BIN2_UTF8 = LOWER(kommando_id)),
  CONSTRAINT kvittering_hendelse FOREIGN KEY (event_id, sak_id, prosjekt_id)
    REFERENCES koe.hendelse (event_id, sak_id, prosjekt_id)
);
GO

CREATE TRIGGER koe.kvittering_uforanderlig ON koe.kvittering INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'En kvittering endres ikke', 1;
END
GO

-- Kvitteringen godtas bare i transaksjonen som lagret brevet, for brevets aktør, så
-- den ikke kan legges til et lagret brev. Tellingen mot ROWCOUNT_BIG() er som i
-- `koe.leveringsoppdrag_samme_transaksjon`.
CREATE TRIGGER koe.kvittering_samme_transaksjon ON koe.kvittering AFTER INSERT AS
BEGIN
  DECLARE @rader bigint = ROWCOUNT_BIG();
  SET NOCOUNT ON;
  IF @rader <> (SELECT COUNT_BIG(*) FROM inserted i
                 WHERE EXISTS (SELECT 1 FROM koe.hendelse h
                                WHERE h.event_id = i.event_id AND h.sak_id = i.sak_id AND h.prosjekt_id = i.prosjekt_id
                                  AND h.aktor_id = i.aktor_id AND h.transaksjon = CURRENT_TRANSACTION_ID()))
    THROW 51002, N'En kvittering kan ikke legges til et lagret brev', 1;
END
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kvittering,
  ADD BLOCK PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kvittering AFTER INSERT;
GO

-- Kvitteringen for kommando-ID-en fra aktøren i prosjektet i konteksten, eller NULL
-- i utdataene når den ikke finnes. Låsen holdes til transaksjonen er ferdig.
CREATE PROCEDURE koe_api.kvittering
  @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @versjon int OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF @kommando_id IS NULL OR TRY_CAST(@kommando_id AS uniqueidentifier) IS NULL OR DATALENGTH(@kommando_id) <> 72
     OR @kommando_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@kommando_id)
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF DATALENGTH(@kommando_sha256) <> 128 OR @kommando_sha256 COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
    THROW 51422, N'Summen for kommandoen er ikke 64 små heksadesimale tegn', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  IF @prosjekt IS NULL OR @aktor IS NULL
    THROW 51403, N'Ingen tilgang', 1;
  DECLARE @sum nvarchar(64);
  SELECT @sum = k.kommando_sha256, @sak_id = k.sak_id, @event_id = k.event_id, @versjon = h.versjon
    FROM koe.kvittering k WITH (UPDLOCK, HOLDLOCK)
    JOIN koe.hendelse h ON h.event_id = k.event_id
   WHERE k.prosjekt_id = @prosjekt AND k.aktor_id = @aktor AND k.kommando_id = @kommando_id;
  IF @sum IS NOT NULL AND @sum <> @kommando_sha256
    THROW 51410, N'Kommando-ID-en er brukt for en annen kommando', 1;
END
GO

CREATE OR ALTER PROCEDURE koe_api.skriv_hendelse
  @sak_id nvarchar(4000), @forventet_versjon int, @event_id nvarchar(4000), @event_type nvarchar(4000),
  @tidsstempel datetime2(3), @format int, @data nvarchar(max),
  @oppdrag_id nvarchar(4000) = NULL, @dokumentnoekkel nvarchar(4000) = NULL,
  @oppdrag nvarchar(max) = NULL, @oppdrag_sha256 nvarchar(4000) = NULL,
  @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF @sak_id IS NULL
    THROW 51422, N'Saks-ID-en mangler', 1;
  IF @kommando_id IS NULL OR TRY_CAST(@kommando_id AS uniqueidentifier) IS NULL OR DATALENGTH(@kommando_id) <> 72
     OR @kommando_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@kommando_id)
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF DATALENGTH(@kommando_sha256) <> 128 OR @kommando_sha256 COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
    THROW 51422, N'Summen for kommandoen er ikke 64 små heksadesimale tegn', 1;
  IF @forventet_versjon IS NULL OR @forventet_versjon < 1
    THROW 51422, N'Forventet versjon mangler eller er under 1', 1;
  IF @event_id IS NULL OR TRY_CAST(@event_id AS uniqueidentifier) IS NULL OR DATALENGTH(@event_id) <> 72
     OR @event_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@event_id)
    THROW 51422, N'event_id mangler eller er ikke en UUID med små bokstaver', 1;
  IF @event_type IS NULL OR DATALENGTH(@event_type) = 0
    THROW 51422, N'Hendelsestypen mangler', 1;
  IF DATALENGTH(@event_type) > 200
    THROW 51422, N'Hendelsestypen er over 100 tegn', 1;
  IF @event_type COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'
    THROW 51422, N'Hendelsestypen har andre tegn enn a–z og _', 1;
  IF @event_type = N'sak_opprettet'
    THROW 51422, N'sak_opprettet skrives bare av opprett_sak', 1;
  IF @tidsstempel IS NULL
    THROW 51422, N'Tidspunktet mangler', 1;
  IF @format IS NULL OR @format < 1
    THROW 51422, N'Formatet mangler eller er under 1', 1;
  IF @data IS NULL OR ISJSON(@data, OBJECT) = 0
    THROW 51422, N'data mangler eller er ikke et JSON-objekt', 1;
  IF (@event_type = N'dokument_registrert'
      AND (@oppdrag IS NULL OR @oppdrag_id IS NULL OR @dokumentnoekkel IS NULL OR @oppdrag_sha256 IS NULL))
     OR (@event_type <> N'dokument_registrert'
         AND (@oppdrag IS NOT NULL OR @oppdrag_id IS NOT NULL OR @dokumentnoekkel IS NOT NULL OR @oppdrag_sha256 IS NOT NULL))
    THROW 51422, N'Leveringsoppdraget kreves for dokument_registrert og bare for den', 1;
  IF @oppdrag IS NOT NULL
  BEGIN
    IF DATALENGTH(@dokumentnoekkel) = 0
      THROW 51422, N'Dokumentnøkkelen er tom', 1;
    IF DATALENGTH(@dokumentnoekkel) > 200
      THROW 51422, N'Dokumentnøkkelen er over 100 tegn', 1;
    IF @dokumentnoekkel COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^-a-z0-9_]%'
      THROW 51422, N'Dokumentnøkkelen har andre tegn enn a–z, 0–9, _ og -', 1;
    IF TRY_CAST(@oppdrag_id AS uniqueidentifier) IS NULL OR DATALENGTH(@oppdrag_id) <> 72
      THROW 51422, N'Oppdragets ID er ikke en UUID', 1;
    IF ISJSON(@oppdrag, OBJECT) = 0
      THROW 51422, N'Oppdraget er ikke et JSON-objekt', 1;
    IF DATALENGTH(@oppdrag_sha256) <> 128 OR @oppdrag_sha256 COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
      THROW 51422, N'Summen for oppdraget er ikke 64 små heksadesimale tegn', 1;
  END
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)),
          @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
     OR TRY_CAST(@sak_id AS uniqueidentifier) IS NULL OR DATALENGTH(@sak_id) <> 72
     OR @sak_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@sak_id)
     OR NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;

  DECLARE @siste int = (SELECT MAX(versjon) FROM koe.hendelse WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id);
  IF ISNULL(@siste, 0) <> @forventet_versjon
  BEGIN
    DECLARE @konflikt nvarchar(200) = CONCAT(N'Versjonskonflikt: journalen har versjon ', ISNULL(@siste, 0));
    THROW 51409, @konflikt, 1;
  END

  DECLARE @klokke datetime2(3) =
    (SELECT t.tidspunkt FROM koe.skrivetidspunkt t
       JOIN sys.dm_exec_sessions s ON s.session_id = t.oekt AND CAST(s.login_time AS datetime2(3)) = t.innlogget
      WHERE t.oekt = @@SPID AND t.transaksjon = CURRENT_TRANSACTION_ID());
  IF @klokke IS NULL OR @tidsstempel <> @klokke
    THROW 51422, N'Tidspunktet er ikke basens klokke for skrivingen', 1;
  DELETE koe.skrivetidspunkt WHERE oekt = @@SPID;

  DECLARE @skriving uniqueidentifier = NEWID();
  EXEC sp_set_session_context N'koe_skriving', @skriving;
  INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                       aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, @event_type, @forventet_versjon + 1, @tidsstempel, @aktor, @side,
          @team, NULL, @format, @data, CURRENT_TRANSACTION_ID(), @skriving);
  IF @oppdrag IS NOT NULL
    INSERT koe.leveringsoppdrag (id, prosjekt_id, sak_id, event_id, dokumentnoekkel, innhold, innhold_sha256)
    VALUES (@oppdrag_id, @prosjekt, @sak_id, @event_id, @dokumentnoekkel, @oppdrag, @oppdrag_sha256);
  INSERT koe.kvittering (prosjekt_id, aktor_id, kommando_id, kommando_sha256, sak_id, event_id)
  VALUES (@prosjekt, @aktor, @kommando_id, @kommando_sha256, @sak_id, @event_id);
  -- Delene er skrevet; ingen senere setning i transaksjonen kan legge til flere.
  EXEC sp_set_session_context N'koe_skriving', NULL;
END
GO

-- Som i `20261018100000_jobber.sql`, med kvitteringen.
CREATE OR ALTER PROCEDURE koe_api.opprett_sak
  @format int, @data nvarchar(max), @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @tidsstempel datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF @kommando_id IS NULL OR TRY_CAST(@kommando_id AS uniqueidentifier) IS NULL OR DATALENGTH(@kommando_id) <> 72
     OR @kommando_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@kommando_id)
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF DATALENGTH(@kommando_sha256) <> 128 OR @kommando_sha256 COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
    THROW 51422, N'Summen for kommandoen er ikke 64 små heksadesimale tegn', 1;
  IF @format IS NULL OR @format < 1
    THROW 51422, N'Formatet mangler eller er under 1', 1;
  IF @data IS NULL OR ISJSON(@data, OBJECT) = 0
    THROW 51422, N'data mangler eller er ikke et JSON-objekt', 1;
  DECLARE @sakstype nvarchar(max), @sakstype_type int, @antall int;
  SELECT @antall = COUNT(*), @sakstype = MAX(value), @sakstype_type = MAX(type)
    FROM OPENJSON(@data) WHERE [key] = N'sakstype';
  IF @antall = 0
    THROW 51422, N'Sakstypen mangler i data', 1;
  IF @antall > 1
    THROW 51422, N'Sakstypen står flere ganger i data', 1;
  IF @sakstype_type <> 1
    THROW 51422, N'Sakstypen er ikke en tekst i data', 1;
  IF DATALENGTH(@sakstype) = 0
    THROW 51422, N'Sakstypen er tom', 1;
  IF DATALENGTH(@sakstype) > 80
    THROW 51422, N'Sakstypen er over 40 tegn', 1;
  IF @sakstype COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'
    THROW 51422, N'Sakstypen har andre tegn enn a–z og _', 1;
  DECLARE @tittel nvarchar(max), @tittel_type int;
  SELECT @antall = COUNT(*), @tittel = MAX(value), @tittel_type = MAX(type)
    FROM OPENJSON(@data) WHERE [key] = N'sakstittel';
  IF @antall <> 1 OR @tittel_type <> 1 OR LEN(@tittel) = 0
    THROW 51422, N'Sakstittelen mangler, står flere ganger eller er ikke en tekst i data', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)),
          @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
    THROW 51403, N'Ingen tilgang', 1;
  DECLARE @catenda_prosjekt uniqueidentifier, @board uniqueidentifier;
  SELECT @catenda_prosjekt = catenda_project_id, @board = topic_board_id
    FROM koe.catenda_project_configs
   WHERE internal_project_id = @prosjekt AND is_active = 1;
  IF @board IS NULL
    THROW 51412, N'Prosjektet har ikke noe topic-board i Catenda for nye saker', 1;

  SET @sak_id = LOWER(CONVERT(nvarchar(36), NEWID()));
  SET @event_id = LOWER(CONVERT(nvarchar(36), NEWID()));
  SET @tidsstempel = DATETRUNC(millisecond, SYSUTCDATETIME());
  INSERT koe.sak_metadata (sak_id, prosjekt_id, sakstype, created_by) VALUES (@sak_id, @prosjekt, @sakstype, @aktor);
  INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                       aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, N'sak_opprettet', 1, @tidsstempel, @aktor, @side,
          @team, NULL, @format, @data, CURRENT_TRANSACTION_ID(), NEWID());
  INSERT koe.kvittering (prosjekt_id, aktor_id, kommando_id, kommando_sha256, sak_id, event_id)
  VALUES (@prosjekt, @aktor, @kommando_id, @kommando_sha256, @sak_id, @event_id);
  -- Kuttet som `@naa` i `hent_jobb`. Standarden runder av og kan ligge etter `@naa`.
  INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, catenda_board_id, tittel, neste_forsoek)
  VALUES (N'catenda_topic', @sak_id, @prosjekt, @catenda_prosjekt, @board, @tittel, @tidsstempel);
END
GO

GRANT EXECUTE ON koe_api.kvittering TO koe_runtime;
GO
