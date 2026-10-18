-- Formkontrollen av kommandoen i én funksjon (#792 punkt 5), og siden i konteksten
-- lest uten avkutting i godkjenningen (#829 punkt 1).
--
-- `koe.er_uuid` er formen kvitteringen krever av kommando-ID-en, og summen er
-- `koe.er_hash` fra `20261016190000_sesjon.sql`. De tre prosedyrene som tar imot
-- kommandoen, bruker dem. Kontrollene `kvittering_kommando_id_form` og
-- `kvittering_sum` på tabellen står uendret: katalogvakten i
-- `server/tester/mellomrom.test.ts` godtar bare de faste formene der, og sier fra om
-- en av dem glir.
--
-- `lag_godkjenningspakke` og `registrer_godkjenningshandling` leste siden som
-- `nvarchar(2)`, prosjektet som `nvarchar(100)` og teamet som `nvarchar(32)`, som
-- kutter av en lengre verdi uten feil. Nå leses de som `nvarchar(4000)`, som i
-- `koe_api.skriv_hendelse`: en side som ikke er `BH`, avvises, og et for langt prosjekt
-- eller team finner ingen sak eller pakke, eller får ikke plass i kolonnen.
--
-- Prosedyrene er ellers som i `20261018200000_kvitteringslaas.sql`,
-- `20261018123000_kvittering.sql` og `20261019110000_godkjenning.sql`, med samme
-- feilkoder og rettigheter.

-- 1 når `@verdi` er en UUID i 36 tegn med små bokstaver. `DATALENGTH` fordi `=` og
-- `LEN` ser bort fra mellomrom til slutt.
CREATE FUNCTION koe.er_uuid (@verdi nvarchar(4000))
RETURNS bit
AS
BEGIN
  RETURN CASE
    WHEN @verdi IS NOT NULL AND TRY_CAST(@verdi AS uniqueidentifier) IS NOT NULL AND DATALENGTH(@verdi) = 72
      AND @verdi COLLATE Latin1_General_100_BIN2_UTF8 = LOWER(@verdi) THEN 1
    ELSE 0
  END;
END
GO

CREATE OR ALTER PROCEDURE koe_api.kvittering
  @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @versjon int OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF koe.er_uuid(@kommando_id) = 0
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF koe.er_hash(@kommando_sha256) = 0
    THROW 51422, N'Summen for kommandoen er ikke 64 små heksadesimale tegn', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  IF @prosjekt IS NULL OR @aktor IS NULL
    THROW 51403, N'Ingen tilgang', 1;
  -- Navnet på en applås er høyst 255 tegn, så nøkkelen går inn som en sum.
  DECLARE @ressurs nvarchar(255) = N'koe.kvittering:' + CONVERT(nvarchar(64),
    HASHBYTES('SHA2_256', CONCAT(@prosjekt, NCHAR(0), CONVERT(nvarchar(36), @aktor), NCHAR(0), @kommando_id)), 2);
  DECLARE @laas int;
  EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @laas < 0
    THROW 51408, N'Låsen på kvitteringen ble ikke gitt', 1;
  DECLARE @sum nvarchar(64);
  SELECT @sum = k.kommando_sha256, @sak_id = k.sak_id, @event_id = k.event_id, @versjon = h.versjon
    FROM koe.kvittering k
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
  IF koe.er_uuid(@kommando_id) = 0
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF koe.er_hash(@kommando_sha256) = 0
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

CREATE OR ALTER PROCEDURE koe_api.opprett_sak
  @format int, @data nvarchar(max), @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @tidsstempel datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF koe.er_uuid(@kommando_id) = 0
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF koe.er_hash(@kommando_sha256) = 0
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

CREATE OR ALTER PROCEDURE koe_api.lag_godkjenningspakke
  @pakke_id uniqueidentifier, @sak_id nvarchar(36), @forrige_pakke_id uniqueidentifier,
  @brev nvarchar(max), @fullmaktsgrunnlag nvarchar(max), @godkjennere nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Pakken lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  DECLARE @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @team IS NULL
    THROW 51403, N'Uten entydig team lagres ingen godkjenningspakke', 1;
  IF TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) IS DISTINCT FROM N'BH'
    THROW 51403, N'Bare byggherren lager en godkjenningspakke', 1;
  IF NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  -- Låsen på saken i indeksen hindrer at to pakker lages samtidig. Den tas i en egen
  -- setning, så kontrollen etter leser det en samtidig pakke skrev, også med
  -- READ_COMMITTED_SNAPSHOT. Teamet ser bare sine egne pakker, så en åpen pakke i et
  -- annet team stopper ikke denne.
  DECLARE @laas int;
  SELECT @laas = COUNT(*) FROM koe.godkjenningspakke WITH (UPDLOCK, HOLDLOCK, INDEX (godkjenningspakke_sak_id))
   WHERE sak_id = @sak_id;
  IF EXISTS (
       SELECT 1 FROM koe.godkjenningspakke p
        WHERE p.sak_id = @sak_id
          AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                           WHERE h.pakke_id = p.pakke_id AND h.handling <> N'godkjent')
          AND EXISTS (SELECT 1 FROM koe.godkjenningssteg s
                       WHERE s.pakke_id = p.pakke_id AND NOT EXISTS (
                         SELECT 1 FROM koe.godkjenningshandling h
                          WHERE h.pakke_id = s.pakke_id AND h.steg = s.steg AND h.handling = N'godkjent')))
    THROW 51409, N'Teamet har en åpen pakke i saken', 1;
  IF @forrige_pakke_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM koe.godkjenningspakke WHERE forrige_pakke_id = @forrige_pakke_id)
    THROW 51409, N'Den forrige pakken er alt erstattet', 1;
  IF @forrige_pakke_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM koe.godkjenningspakke p
         JOIN koe.godkjenningshandling h ON h.pakke_id = p.pakke_id AND h.handling <> N'godkjent'
        WHERE p.pakke_id = @forrige_pakke_id AND p.sak_id = @sak_id)
    THROW 51409, N'Den forrige pakken er ikke returnert eller trukket i saken', 1;
  IF ISJSON(@godkjennere, ARRAY) = 0
    THROW 51422, N'Godkjennerne er ikke en JSON-liste', 1;

  DECLARE @steg TABLE (steg int NOT NULL PRIMARY KEY, godkjenner_id uniqueidentifier NULL);
  INSERT @steg (steg, godkjenner_id)
  SELECT CAST([key] AS int) + 1, TRY_CAST([value] AS uniqueidentifier) FROM OPENJSON(@godkjennere);
  IF NOT EXISTS (SELECT 1 FROM @steg)
    THROW 51422, N'En pakke uten godkjennere trengs ikke', 1;
  IF EXISTS (SELECT 1 FROM @steg WHERE godkjenner_id IS NULL OR godkjenner_id = @aktor)
    THROW 51422, N'En godkjenner mangler eller er saksbehandleren selv', 1;
  IF (SELECT COUNT(DISTINCT godkjenner_id) FROM @steg) <> (SELECT COUNT(*) FROM @steg)
    THROW 51422, N'En godkjenner står to ganger i kjeden', 1;
  IF EXISTS (SELECT 1 FROM @steg s WHERE NOT EXISTS (
       SELECT 1 FROM koe.fullmakt f WHERE f.prosjekt_id = @prosjekt AND f.bruker_id = s.godkjenner_id))
    THROW 51422, N'En godkjenner har ingen fullmakt i prosjektet', 1;

  INSERT koe.godkjenningspakke (pakke_id, prosjekt_id, sak_id, forrige_pakke_id, aktor_id, aktor_rolle,
                                aktor_team_id, brev, fullmaktsgrunnlag)
  VALUES (@pakke_id, @prosjekt, @sak_id, @forrige_pakke_id, @aktor, N'BH', @team, @brev, @fullmaktsgrunnlag);
  INSERT koe.godkjenningssteg (pakke_id, prosjekt_id, aktor_team_id, steg, godkjenner_id)
  SELECT @pakke_id, @prosjekt, @team, steg, godkjenner_id FROM @steg;
END
GO

CREATE OR ALTER PROCEDURE koe_api.registrer_godkjenningshandling
  @pakke_id uniqueidentifier, @handling nvarchar(20), @begrunnelse nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Handlingen lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  DECLARE @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @team IS NULL OR TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) IS DISTINCT FROM N'BH'
    THROW 51403, N'Ukjent pakke', 1;

  IF NOT EXISTS (SELECT 1 FROM koe.godkjenningspakke WITH (UPDLOCK, HOLDLOCK)
                  WHERE pakke_id = @pakke_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent pakke', 1;
  IF EXISTS (SELECT 1 FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id AND handling <> N'godkjent')
    THROW 51409, N'Pakken er returnert eller trukket', 1;

  DECLARE @steg tinyint, @godkjenner uniqueidentifier;
  SELECT TOP (1) @steg = s.steg, @godkjenner = s.godkjenner_id
    FROM koe.godkjenningssteg s
   WHERE s.pakke_id = @pakke_id
     AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                      WHERE h.pakke_id = s.pakke_id AND h.steg = s.steg AND h.handling = N'godkjent')
   ORDER BY s.steg;

  DECLARE @tittel nvarchar(200), @grense decimal(15, 2), @ubegrenset bit;
  IF @handling = N'trukket'
    SET @steg = NULL;
  ELSE IF @handling IN (N'godkjent', N'returnert')
  BEGIN
    IF @steg IS NULL
      THROW 51409, N'Pakken er godkjent i alle steg', 1;
    IF @aktor IS DISTINCT FROM @godkjenner
      THROW 51403, N'Pakken venter ikke på deg', 1;
    IF @handling = N'godkjent'
    BEGIN
      SELECT @tittel = tittel, @grense = grense, @ubegrenset = IIF(grense IS NULL, 1, 0)
        FROM koe.fullmakt WHERE prosjekt_id = @prosjekt AND bruker_id = @aktor;
      IF @tittel IS NULL
        THROW 51403, N'Du har ikke lenger fullmakt i prosjektet', 1;
    END
  END
  ELSE
    THROW 51422, N'Ukjent handling', 1;

  INSERT koe.godkjenningshandling (pakke_id, loepenr, prosjekt_id, handling, steg, aktor_id, aktor_rolle,
                                   aktor_team_id, fullmakt_tittel, fullmakt_grense, fullmakt_ubegrenset, begrunnelse)
  SELECT @pakke_id, ISNULL(MAX(loepenr), 0) + 1, @prosjekt, @handling, @steg, @aktor, N'BH', @team,
         @tittel, @grense, @ubegrenset, @begrunnelse
    FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id;
END
GO
