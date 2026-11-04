-- Sakens kode og løpenummer, og kontraktsforkortelsen (LV-U44, LV-U46, LV-U47,
-- arbeidsvalgene N1 og N2 04.11 i #1497).
--
-- Kontraktsforkortelsen (K201 i `K201-KOE-17-03`) står i `koe.kontraktsparter` og settes
-- av driften sammen med navnene. Retter driften den, får bare nye brev den nye (LV-U24).
-- Kolonnen er `NOT NULL` uten standard, så fila stopper mot en base der et prosjekt alt
-- har navnene; ingen base med ekte saker har det (#1091).
--
-- `koe.sak_kode` får én rad per sak, når sakens første brev fra løsningen skrives
-- (LV-U46, LV-U47): koden følger parten som sendte brevet (LV-U44), `koe` for TE og `eo`
-- for BH, og løpenummeret er det neste for koden i prosjektet. «KOE-17» settes sammen
-- når det vises. Et brev fra løsningen er `dokument_registrert` med `brevtekst`; et
-- registrert brev har ingen (MM-U17), og gir ikke saken en kode.

ALTER TABLE koe.kontraktsparter ADD kontraktsforkortelse nvarchar(20) NOT NULL
  CONSTRAINT kontraktsparter_kontraktsforkortelse
    CHECK (DATALENGTH(kontraktsforkortelse) > 0
           AND NOT kontraktsforkortelse COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^A-Z0-9]%');
GO

CREATE TABLE koe.sak_kode (
  sak_id nvarchar(36) NOT NULL CONSTRAINT sak_kode_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT sak_kode_prosjekt REFERENCES koe.projects (id)
    CONSTRAINT sak_kode_prosjekt_id_tegnklasse
      CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  kode nvarchar(3) NOT NULL
    CONSTRAINT sak_kode_kode CHECK (kode COLLATE Latin1_General_100_BIN2_UTF8 IN (N'koe', N'eo')),
  loepenummer int NOT NULL CONSTRAINT sak_kode_loepenummer_positivt CHECK (loepenummer >= 1),
  CONSTRAINT sak_kode_kode_tegnklasse CHECK (NOT kode COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  CONSTRAINT sak_kode_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id),
  CONSTRAINT sak_kode_loepenummer UNIQUE (prosjekt_id, kode, loepenummer)
);
GO

CREATE TRIGGER koe.sak_kode_uforanderlig ON koe.sak_kode INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Sakens kode endres og slettes ikke', 1;
END
GO

-- Ingen fremmednøkkel viser til tabellen, så vernet stopper TRUNCATE (#582).
ALTER TABLE koe.toemmingsvern ADD
  sak_kode_sak_id nvarchar(36) NULL
    CONSTRAINT toemmingsvern_sak_kode_sak_id_tegnklasse
      CHECK (NOT sak_kode_sak_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');
GO

ALTER TABLE koe.toemmingsvern ADD CONSTRAINT toemmingsvern_sak_kode
  FOREIGN KEY (sak_kode_sak_id) REFERENCES koe.sak_kode (sak_id);
GO

-- Lesingen som `koe.sak_metadata`; skrivingen krever kontraktsmedlemmet, som brevet.
ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.sak_synlig(prosjekt_id, sak_id) ON koe.sak_kode,
  ADD BLOCK PREDICATE koe_sikkerhet.kontraktsmedlem(prosjekt_id) ON koe.sak_kode AFTER INSERT;
GO

-- Koden og løpenummeret saken har, eller koden og det neste løpenummeret sakens første
-- brev fra løsningen vil få når parten i konteksten sender det (`tildelt` er 0). Saken
-- trenger ikke finnes ennå: i opprettelsen leses nummeret før saken lagres (KT-U11).
-- Løpenumrene for koden i prosjektet låses til transaksjonen er ferdig, så to saker
-- ikke får samme nummer, og `koe_api.skriv_hendelse` kontrollerer det igjen (LV-U46).
CREATE PROCEDURE koe_api.sakskode @sak_id nvarchar(36)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Sakens kode leses bare i en transaksjon med konteksten satt', 1;
  IF koe.er_uuid(@sak_id) = 0
    THROW 51422, N'Saks-ID-en er ikke en UUID med små bokstaver', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
    THROW 51403, N'Ingen tilgang', 1;
  IF EXISTS (SELECT 1 FROM koe.sak_kode WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    SELECT kode, loepenummer, CAST(1 AS bit) AS tildelt
      FROM koe.sak_kode
     WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt;
  ELSE
  BEGIN
    DECLARE @kode nvarchar(3) = IIF(@side = N'TE', N'koe', N'eo');
    SELECT @kode AS kode, 1 + ISNULL(MAX(loepenummer), 0) AS loepenummer, CAST(0 AS bit) AS tildelt
      FROM koe.sak_kode WITH (UPDLOCK, HOLDLOCK)
     WHERE prosjekt_id = @prosjekt AND kode = @kode;
  END
END
GO

-- Som i `20261020080000_skriveprosedyrer.sql`, med løpenummeret for sakens første brev
-- fra løsningen (LV-U46). Kalleren gir nummeret saken får, og bare for det brevet.
-- Er det ikke det neste for koden i prosjektet, skrives ingenting (51411), og meldingen
-- har det neste.
CREATE OR ALTER PROCEDURE koe_api.skriv_hendelse
  @sak_id nvarchar(4000), @forventet_versjon int, @event_id nvarchar(4000), @event_type nvarchar(4000),
  @tidsstempel datetime2(3), @format int, @data nvarchar(max),
  @oppdrag_id nvarchar(4000) = NULL, @dokumentnoekkel nvarchar(4000) = NULL,
  @oppdrag nvarchar(max) = NULL, @oppdrag_sha256 nvarchar(4000) = NULL,
  @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @loepenummer int = NULL
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
  IF koe.er_uuid(@event_id) = 0
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
    IF koe.er_hash(@oppdrag_sha256) = 0
      THROW 51422, N'Summen for oppdraget er ikke 64 små heksadesimale tegn', 1;
  END
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)),
          @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
     OR koe.er_uuid(@sak_id) = 0
     OR NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;

  DECLARE @innlogget datetime2(3) = (SELECT CAST(login_time AS datetime2(3)) FROM sys.dm_exec_sessions WHERE session_id = @@SPID);
  DECLARE @klokke datetime2(3) =
    (SELECT tidspunkt FROM koe.skrivetidspunkt
      WHERE oekt = @@SPID AND transaksjon = CURRENT_TRANSACTION_ID() AND innlogget = @innlogget);
  IF @klokke IS NULL OR @tidsstempel <> @klokke
    THROW 51422, N'Tidspunktet er ikke basens klokke for skrivingen', 1;
  DECLARE @grense bigint = 30000;
  IF DATEDIFF_BIG(millisecond, @klokke, SYSUTCDATETIME()) > @grense
    THROW 51419, N'Det har gått mer enn 30 sekunder siden basen ga tidspunktet', 1;
  DELETE koe.skrivetidspunkt WHERE oekt = @@SPID;

  DECLARE @siste int = (SELECT MAX(versjon) FROM koe.hendelse WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id);
  IF ISNULL(@siste, 0) <> @forventet_versjon
  BEGIN
    DECLARE @konflikt nvarchar(200) = CONCAT(N'Versjonskonflikt: journalen har versjon ', ISNULL(@siste, 0));
    THROW 51409, @konflikt, 1;
  END

  -- Sakens første brev fra løsningen gir saken koden og løpenummeret (LV-U46, LV-U47).
  DECLARE @kode nvarchar(3) = IIF(@side = N'TE', N'koe', N'eo');
  DECLARE @foerste_brev bit = CASE
    WHEN @event_type = N'dokument_registrert' AND JSON_PATH_EXISTS(@data, N'$.brevtekst') = 1
         AND NOT EXISTS (SELECT 1 FROM koe.sak_kode WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id)
    THEN 1 ELSE 0 END;
  IF @foerste_brev = 0 AND @loepenummer IS NOT NULL
    THROW 51422, N'Løpenummeret gis bare for sakens første brev fra løsningen', 1;
  IF @foerste_brev = 1
  BEGIN
    IF @loepenummer IS NULL
      THROW 51422, N'Løpenummeret mangler for sakens første brev fra løsningen', 1;
    DECLARE @neste int = 1 + ISNULL(
      (SELECT MAX(loepenummer) FROM koe.sak_kode WITH (UPDLOCK, HOLDLOCK)
        WHERE prosjekt_id = @prosjekt AND kode = @kode), 0);
    IF @loepenummer <> @neste
    BEGIN
      DECLARE @tatt nvarchar(200) = CONCAT(N'Løpenummeret er ikke det neste for koden: neste er ', @neste);
      THROW 51411, @tatt, 1;
    END
  END
  IF DATEDIFF_BIG(millisecond, @klokke, SYSUTCDATETIME()) > @grense
    THROW 51419, N'Det har gått mer enn 30 sekunder siden basen ga tidspunktet', 1;

  DECLARE @skriving uniqueidentifier = NEWID();
  EXEC sp_set_session_context N'koe_skriving', @skriving;
  INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                       aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, @event_type, @forventet_versjon + 1, @tidsstempel, @aktor, @side,
          @team, NULL, @format, @data, CURRENT_TRANSACTION_ID(), @skriving);
  IF @oppdrag IS NOT NULL
    INSERT koe.leveringsoppdrag (id, prosjekt_id, sak_id, event_id, dokumentnoekkel, innhold, innhold_sha256)
    VALUES (@oppdrag_id, @prosjekt, @sak_id, @event_id, @dokumentnoekkel, @oppdrag, @oppdrag_sha256);
  IF @foerste_brev = 1
    INSERT koe.sak_kode (sak_id, prosjekt_id, kode, loepenummer) VALUES (@sak_id, @prosjekt, @kode, @loepenummer);
  INSERT koe.kvittering (prosjekt_id, aktor_id, kommando_id, kommando_sha256, sak_id, event_id)
  VALUES (@prosjekt, @aktor, @kommando_id, @kommando_sha256, @sak_id, @event_id);
  -- Delene er skrevet; ingen senere setning i transaksjonen kan legge til flere.
  EXEC sp_set_session_context N'koe_skriving', NULL;
END
GO

-- Som i `20261020180000_saksliste.sql`, med sakens kode og løpenummer, eller NULL for en
-- sak uten brev fra løsningen (LV-U47).
CREATE OR ALTER PROCEDURE koe_api.saksliste
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Sakslisten leses bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  SELECT s.sak_id, s.sakstype, s.created_at AS opprettet, k.kode, k.loepenummer,
         h.event_id, h.event_type, h.versjon, h.tidsstempel, h.aktor_id, h.aktor_rolle,
         h.aktor_team_id, h.refererer_til_event_id, h.format, h.data
    FROM koe.sak_metadata s
    JOIN koe.hendelse h ON h.sak_id = s.sak_id AND h.prosjekt_id = s.prosjekt_id
    LEFT JOIN koe.sak_kode k ON k.sak_id = s.sak_id AND k.prosjekt_id = s.prosjekt_id
   WHERE s.prosjekt_id = @prosjekt
   ORDER BY s.sak_id, h.versjon;
END
GO

-- Som i `20261030100000_kontraktsparter.sql`, med kontraktsforkortelsen, som settes
-- sammen med navnene (arbeidsvalget N1 04.11 i #1497).
CREATE OR ALTER PROCEDURE koe_drift.sett_kontraktsparter
  @prosjekt nvarchar(4000),
  @byggherre nvarchar(4000),
  @totalentreprenor nvarchar(4000),
  @kontraktsforkortelse nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  IF @byggherre IS NULL OR LEN(@byggherre) = 0 OR DATALENGTH(@byggherre) > 800
     OR DATALENGTH(@byggherre) <> DATALENGTH(LTRIM(RTRIM(@byggherre)))
    THROW 52065, N'Byggherrens navn er tomt, for langt eller har mellomrom i endene', 1;
  IF @totalentreprenor IS NULL OR LEN(@totalentreprenor) = 0 OR DATALENGTH(@totalentreprenor) > 800
     OR DATALENGTH(@totalentreprenor) <> DATALENGTH(LTRIM(RTRIM(@totalentreprenor)))
    THROW 52065, N'Totalentreprenørens navn er tomt, for langt eller har mellomrom i endene', 1;
  IF @kontraktsforkortelse IS NULL OR DATALENGTH(@kontraktsforkortelse) = 0 OR DATALENGTH(@kontraktsforkortelse) > 40
     OR @kontraktsforkortelse COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^A-Z0-9]%'
    THROW 52074, N'Kontraktsforkortelsen er tom, over 20 tegn eller har andre tegn enn A–Z og 0–9', 1;

  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.projects WITH (UPDLOCK, HOLDLOCK) WHERE id = @prosjekt)
    THROW 52073, N'Prosjektet er ikke registrert', 1;
  IF EXISTS (SELECT 1 FROM koe.kontraktsparter WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)
    UPDATE koe.kontraktsparter
       SET byggherre_navn = @byggherre, totalentreprenor_navn = @totalentreprenor,
           kontraktsforkortelse = @kontraktsforkortelse
     WHERE prosjekt_id = @prosjekt;
  ELSE
    INSERT koe.kontraktsparter (prosjekt_id, byggherre_navn, totalentreprenor_navn, kontraktsforkortelse)
    VALUES (@prosjekt, @byggherre, @totalentreprenor, @kontraktsforkortelse);
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_drift.kontraktsparter
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT byggherre_navn, totalentreprenor_navn, kontraktsforkortelse
    FROM koe.kontraktsparter
   WHERE prosjekt_id = @prosjekt;
END
GO

CREATE OR ALTER PROCEDURE koe_api.kontraktsparter
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  SELECT k.byggherre_navn, k.totalentreprenor_navn, k.kontraktsforkortelse
    FROM koe.kontraktsparter k
    JOIN koe.app_project_memberships m ON m.project_id = k.prosjekt_id
   WHERE k.prosjekt_id = @prosjekt AND m.user_id = @aktor AND m.active = 1;
END
GO

GRANT EXECUTE ON koe_api.sakskode TO koe_runtime;
