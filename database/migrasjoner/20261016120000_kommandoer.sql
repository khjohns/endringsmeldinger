-- Kommandoene som skriver saksregisteret og journalen (#53, del 3a). Kilden er
-- prøven (`prove/azuresql/sql/03_kommandoer.sql`, form (a)). Kjøretiden har
-- EXECUTE på prosedyrene og ingen skriverett på tabellene; prosedyrene eies av
-- samme eier som tabellene og når dem gjennom eierskapskjeden, uten dynamisk SQL,
-- som ville brutt kjeden. Radsikkerheten gjelder fortsatt: filteret avgjør hvilke
-- saker kommandoen ser, og blokkpredikatene kontrollerer aktørfeltene i raden.
--
-- Aktøren, siden, teamet og prosjektet leses fra konteksten (`server/datalag.ts`),
-- og kalleren oppgir dem ikke. Teamet står når serveren har satt det, altså når
-- det er entydig på avsenderens side (DL-U4).
--
-- Tidspunktet på et brev er basens klokke ved skrivingen (DL-U3, svaret 16.10 i
-- #53), ikke appserverens. Kommentaren i `20261016100000_journal.sql`, linje 9–10,
-- om at serveren setter `tidsstempel`, gjelder derfor ikke: kjernen regner brevet
-- med tidspunktet `koe_api.skrivetidspunkt` gir og fører for transaksjonen, og
-- `koe_api.skriv_hendelse` avviser et annet. Saksnummeret er en tilfeldig ID som `opprett_sak` lager
-- (DL-U6).
--
-- Feilkodene, som i prøven: 51000 utenfor transaksjonen eller uten kontekst
-- bundet til den, 51403 ukjent sak (likt for ingen tilgang, ukjent sak og sak i
-- et annet prosjekt), 51409 versjonskonflikt og 51422 ugyldig argument.

-- Tidspunktet basen ga for skrivingen i en transaksjon (DL-U3, svaret 16.10 i
-- #53: «Bare basens tidspunkt»). Kjøretiden har ingen rett på tabellen; bare
-- prosedyrene i `koe_api` skriver og sletter gjennom eierskapskjeden.
-- Nøkkelen er økt-ID-en, så hver prosedyre leser og låser bare raden til sin
-- egen økt. Raden gjelder transaksjonen og når økta logget inn
-- (`sys.dm_exec_sessions`, der kjøretiden bare ser sin egen økt), fordi
-- transaksjons-ID-en begynner på nytt etter en omstart: en senere økt med samme
-- økt-ID og transaksjons-ID kan ikke bruke den. `skriv_hendelse` sletter raden.
-- Committer kjøretiden etter `skrivetidspunkt` uten å skrive, blir raden
-- liggende til samme økt-ID fører et nytt tidspunkt.
CREATE TABLE koe.skrivetidspunkt (
  oekt smallint NOT NULL CONSTRAINT skrivetidspunkt_pk PRIMARY KEY,
  transaksjon bigint NOT NULL,
  innlogget datetime2(3) NOT NULL,
  tidspunkt datetime2(3) NOT NULL
);
GO

-- Basens klokke for skrivingen i transaksjonen, i millisekunder som kolonnen.
-- Et nytt kall i samme transaksjon erstatter tidspunktet.
CREATE PROCEDURE koe_api.skrivetidspunkt @tidspunkt datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Tidspunktet hentes bare i en transaksjon med konteksten satt', 1;
  DECLARE @innlogget datetime2(3) = (SELECT CAST(login_time AS datetime2(3)) FROM sys.dm_exec_sessions WHERE session_id = @@SPID);
  IF @innlogget IS NULL
    THROW 51000, N'Økta er ikke synlig for tidspunktet', 1;
  SET @tidspunkt = DATETRUNC(millisecond, SYSUTCDATETIME());
  DELETE koe.skrivetidspunkt WHERE oekt = @@SPID;
  INSERT koe.skrivetidspunkt (oekt, transaksjon, innlogget, tidspunkt)
  VALUES (@@SPID, CURRENT_TRANSACTION_ID(), @innlogget, @tidspunkt);
END
GO

-- Saken og `sak_opprettet` som versjon 1 i samme transaksjon. Kommandoen lager
-- saks-ID-en og hendelses-ID-en, så en valgt ID ikke kan røpe en sak i et annet
-- prosjekt (TM-11), og stempler tidspunktet med basens klokke. Sakstypen er den
-- i `data`.
CREATE PROCEDURE koe_api.opprett_sak
  @format int, @data nvarchar(max),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @tidsstempel datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  DECLARE @sakstype nvarchar(4000) = CASE WHEN ISJSON(@data, OBJECT) = 1 THEN JSON_VALUE(@data, N'$.sakstype') END;
  IF @format IS NULL OR @format < 1 OR @sakstype IS NULL OR LEN(@sakstype) = 0 OR DATALENGTH(@sakstype) > 80
    THROW 51422, N'Ugyldig argument', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)),
          @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
    THROW 51403, N'Ingen tilgang', 1;

  SET @sak_id = LOWER(CONVERT(nvarchar(36), NEWID()));
  SET @event_id = LOWER(CONVERT(nvarchar(36), NEWID()));
  SET @tidsstempel = DATETRUNC(millisecond, SYSUTCDATETIME());
  INSERT koe.sak_metadata (sak_id, prosjekt_id, sakstype, created_by) VALUES (@sak_id, @prosjekt, @sakstype, @aktor);
  INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                       aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, N'sak_opprettet', 1, @tidsstempel, @aktor, @side,
          @team, NULL, @format, @data, CURRENT_TRANSACTION_ID(), NEWID());
END
GO

-- Ett brev i journalen, og for `dokument_registrert` leveringsoppdraget i samme
-- transaksjon og skriving (LV-U1). `sak_opprettet` skrives bare av `opprett_sak`.
-- Saken låses med UPDLOCK og HOLDLOCK, og versjonen må være den kalleren så.
-- `koe_skriving` binder oppdraget til brevet for triggeren
-- `koe.leveringsoppdrag_samme_transaksjon` og tømmes når delene er skrevet.
CREATE PROCEDURE koe_api.skriv_hendelse
  @sak_id nvarchar(36), @forventet_versjon int, @event_id nvarchar(36), @event_type nvarchar(100),
  @tidsstempel datetime2(3), @format int, @data nvarchar(max),
  @oppdrag_id uniqueidentifier = NULL, @dokumentnoekkel nvarchar(100) = NULL,
  @oppdrag nvarchar(max) = NULL, @oppdrag_sha256 nvarchar(64) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF @sak_id IS NULL OR @forventet_versjon IS NULL OR @forventet_versjon < 1 OR @event_id IS NULL
     OR @event_type IS NULL OR @event_type = N'sak_opprettet' OR @tidsstempel IS NULL OR @format IS NULL
     OR @data IS NULL
    THROW 51422, N'Ugyldig argument', 1;
  IF (@event_type = N'dokument_registrert'
      AND (@oppdrag IS NULL OR @oppdrag_id IS NULL OR @dokumentnoekkel IS NULL OR @oppdrag_sha256 IS NULL))
     OR (@event_type <> N'dokument_registrert'
         AND (@oppdrag IS NOT NULL OR @oppdrag_id IS NOT NULL OR @dokumentnoekkel IS NOT NULL OR @oppdrag_sha256 IS NOT NULL))
    THROW 51422, N'Leveringsoppdraget kreves for dokument_registrert og bare for den', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)),
          @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
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
  -- Delene er skrevet; ingen senere setning i transaksjonen kan legge til flere.
  EXEC sp_set_session_context N'koe_skriving', NULL;
END
GO

GRANT EXECUTE ON koe_api.skrivetidspunkt TO koe_runtime;
GRANT EXECUTE ON koe_api.opprett_sak TO koe_runtime;
GRANT EXECUTE ON koe_api.skriv_hendelse TO koe_runtime;
GO
