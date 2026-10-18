-- Jobbkjøreren og topicen i Catenda for saker som opprettes i appen (L-1a, #741).
--
-- KT-U4: koblingen angir ett topic-board for nye saker. Uten board avvises
-- opprettelsen før saken lagres (51412). Med board legger `koe_api.opprett_sak`
-- jobben inn i samme transaksjon som saken, med boardet, Catenda-prosjektet og
-- sakstittelen frosset (invariant 6). Jobben gjøres etter commit av løkka i
-- `server/jobber.ts`.
--
-- B-07 (arbeidsvalget 18.10 i #741): jobbene hentes med `READPAST, UPDLOCK`. Hvert
-- forsøk har en lease, og bare den gyldige leasen kan kvittere (invariant 7). En
-- lease som er utløpt uten kvittering, gjør utfallet usikkert, og jobben parkeres i
-- stedet for å hentes på nytt. Det gjør også et usikkert svar fra Catenda og en
-- kobling som er endret etter frysingen. Driften starter en parkert jobb på nytt
-- med `koe_api.start_jobb_paa_nytt` (svaret «Driften» 18.10 i #371).
--
-- Kjøreveien: radsikkerheten krever aktøren og prosjektet i konteksten, og løkka
-- har ingen. Prosedyrene for løkka kjører derfor som `koe_jobbkjoerer`, en bruker
-- uten innlogging, og predikatene slipper den gjennom. Ingen annen vei kan bli den
-- brukeren uten IMPERSONATE, og kjøretiden har bare EXECUTE på de tre prosedyrene.
-- Saken og prosjektet tas fra jobben, aldri fra kalleren.
--
-- Jobbtabellen og forsøkstabellen har en fremmednøkkel mot seg, så TRUNCATE
-- avvises (#582).

CREATE USER koe_jobbkjoerer WITHOUT LOGIN;
GO

ALTER TABLE koe.catenda_project_configs ADD topic_board_id uniqueidentifier NULL;
GO

-- Driften setter koblingen med UPDATE; tidspunktet følger endringen (#618).
CREATE TRIGGER koe.catenda_project_configs_endret
ON koe.catenda_project_configs
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(updated_at) RETURN;
  UPDATE c SET updated_at = SYSUTCDATETIME()
    FROM koe.catenda_project_configs c
    JOIN inserted i ON i.internal_project_id = c.internal_project_id;
END
GO

-- Samme topic hører ikke til to saker (#741 punkt 17), og ID-en har én form.
ALTER TABLE koe.sak_catenda_topic
  ADD CONSTRAINT sak_catenda_topic_topic_unik UNIQUE (catenda_topic_id),
      CONSTRAINT sak_catenda_topic_topic_uten_mellomrom
        CHECK (DATALENGTH(catenda_topic_id) = DATALENGTH(RTRIM(catenda_topic_id)));
GO

CREATE TABLE koe.jobb (
  jobb_id uniqueidentifier NOT NULL CONSTRAINT jobb_pk PRIMARY KEY CONSTRAINT jobb_id_ny DEFAULT NEWID(),
  jobbtype nvarchar(40) NOT NULL CONSTRAINT jobb_jobbtype CHECK (jobbtype IN (N'catenda_topic')),
  sak_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT jobb_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  catenda_project_id uniqueidentifier NULL,
  catenda_board_id uniqueidentifier NULL,
  tittel nvarchar(max) NULL,
  opprettet datetime2(3) NOT NULL CONSTRAINT jobb_opprettet DEFAULT SYSUTCDATETIME(),
  tilstand nvarchar(20) NOT NULL CONSTRAINT jobb_tilstand_ny DEFAULT N'venter'
    CONSTRAINT jobb_tilstand CHECK (tilstand IN (N'venter', N'utfoert', N'parkert')),
  neste_forsoek datetime2(3) NOT NULL CONSTRAINT jobb_neste_forsoek DEFAULT SYSUTCDATETIME(),
  antall_forsoek int NOT NULL CONSTRAINT jobb_antall_forsoek DEFAULT 0,
  lease uniqueidentifier NULL,
  lease_startet datetime2(3) NULL,
  lease_utloeper datetime2(3) NULL,
  siste_forsoek uniqueidentifier NULL,
  CONSTRAINT jobb_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id),
  CONSTRAINT jobb_jobbtype_form CHECK (NOT jobbtype COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  CONSTRAINT jobb_tilstand_form CHECK (NOT tilstand COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  CONSTRAINT jobb_topicmaal CHECK (jobbtype <> N'catenda_topic'
    OR (catenda_project_id IS NOT NULL AND catenda_board_id IS NOT NULL AND LEN(tittel) > 0)),
  CONSTRAINT jobb_lease CHECK (
    (lease IS NULL AND lease_startet IS NULL AND lease_utloeper IS NULL)
    OR (lease IS NOT NULL AND lease_startet IS NOT NULL AND lease_utloeper IS NOT NULL AND tilstand = N'venter'))
);
CREATE UNIQUE INDEX jobb_en_topic_per_sak ON koe.jobb (sak_id) WHERE jobbtype = N'catenda_topic';
CREATE INDEX jobb_klar ON koe.jobb (tilstand, neste_forsoek);
CREATE UNIQUE INDEX jobb_lease_unik ON koe.jobb (lease) WHERE lease IS NOT NULL;
GO

-- Hvert forsøk, hver feil og hver kvittering for seg (LV-U1). Forsøket har leasens
-- ID. Raden lagres når utfallet er kjent, og endres ikke.
CREATE TABLE koe.jobbforsoek (
  forsoek_id uniqueidentifier NOT NULL CONSTRAINT jobbforsoek_pk PRIMARY KEY,
  jobb_id uniqueidentifier NOT NULL CONSTRAINT jobbforsoek_jobb FOREIGN KEY REFERENCES koe.jobb (jobb_id),
  startet datetime2(3) NULL,
  avsluttet datetime2(3) NOT NULL,
  utfall nvarchar(20) NOT NULL CONSTRAINT jobbforsoek_utfall
    CHECK (utfall IN (N'utfoert', N'feilet', N'usikkert', N'kobling_endret', N'startet_paa_nytt')),
  melding nvarchar(400) NULL,
  CONSTRAINT jobbforsoek_utfall_form CHECK (NOT utfall COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%')
);
CREATE INDEX jobbforsoek_jobb_id ON koe.jobbforsoek (jobb_id);
GO

ALTER TABLE koe.jobb ADD CONSTRAINT jobb_siste_forsoek
  FOREIGN KEY (siste_forsoek) REFERENCES koe.jobbforsoek (forsoek_id);
GO

CREATE TRIGGER koe.jobbforsoek_uforanderlig ON koe.jobbforsoek INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et jobbforsøk endres ikke', 1;
END
GO

CREATE FUNCTION koe_sikkerhet.jobbkjoerer(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang WHERE USER_NAME() = N'koe_jobbkjoerer' AND @prosjekt_id IS NOT NULL;
GO

CREATE FUNCTION koe_sikkerhet.jobbkjoerer_eller_medlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.jobbkjoerer(@prosjekt_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.medlem(@prosjekt_id);
GO

-- Jobben legges inn av opprettelsen, med medlemmet i konteksten, og leses og
-- endres av kjøreveien. Topicen skrives bare av kjøreveien.
ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.jobb,
  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.jobb AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer(prosjekt_id) ON koe.jobb AFTER UPDATE,
  DROP BLOCK PREDICATE ON koe.sak_catenda_topic AFTER INSERT;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer(prosjekt_id) ON koe.sak_catenda_topic AFTER INSERT;
GO

-- Som i `20261016230000_skranker.sql`, med sakstittelen, boardet og jobben.
CREATE OR ALTER PROCEDURE koe_api.opprett_sak
  @format int, @data nvarchar(max),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @tidsstempel datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
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
  -- Kuttet som `@naa` i `hent_jobb`. Standarden runder av og kan ligge etter `@naa`.
  INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, catenda_board_id, tittel, neste_forsoek)
  VALUES (N'catenda_topic', @sak_id, @prosjekt, @catenda_prosjekt, @board, @tittel, @tidsstempel);
END
GO

-- Neste jobb for løkka, med en lease på @leasetid_sekunder. En utløpt lease
-- parkeres som usikker først (invariant 7). En topicjobb der koblingen, boardet
-- eller Catenda-prosjektet er endret etter frysingen, parkeres uten forsøk
-- (invariant 6). Ingen rad når ingen jobb er klar.
CREATE PROCEDURE koe_api.hent_jobb
  @leasetid_sekunder int
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @leasetid_sekunder IS NULL OR @leasetid_sekunder NOT BETWEEN 1 AND 3600
    THROW 51422, N'Leasetiden må være mellom 1 og 3600 sekunder', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @utloept TABLE (jobb_id uniqueidentifier PRIMARY KEY, lease uniqueidentifier NOT NULL, startet datetime2(3) NOT NULL);
  DECLARE @jobb uniqueidentifier, @lease uniqueidentifier;

  BEGIN TRANSACTION;
  INSERT @utloept (jobb_id, lease, startet)
  SELECT jobb_id, lease, lease_startet
    FROM koe.jobb WITH (UPDLOCK, READPAST, ROWLOCK)
   WHERE tilstand = N'venter' AND lease IS NOT NULL AND lease_utloeper <= @naa;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  SELECT lease, jobb_id, startet, @naa, N'usikkert', N'Leasen utløp uten kvittering.'
    FROM @utloept;
  -- Søk på nøkkelen, så oppdateringen ikke venter på rader en annen kjører har låst.
  IF EXISTS (SELECT 1 FROM @utloept)
    UPDATE j
       SET tilstand = N'parkert', lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = u.lease
      FROM @utloept u INNER LOOP JOIN koe.jobb j WITH (FORCESEEK) ON j.jobb_id = u.jobb_id;

  WHILE 1 = 1
  BEGIN
    SET @jobb = NULL;
    SELECT TOP (1) @jobb = jobb_id
      FROM koe.jobb WITH (UPDLOCK, READPAST, ROWLOCK)
     WHERE tilstand = N'venter' AND lease IS NULL AND neste_forsoek <= @naa
     ORDER BY neste_forsoek, jobb_id;
    IF @jobb IS NULL BREAK;
    SET @lease = NEWID();
    IF EXISTS (
      SELECT 1 FROM koe.jobb j
        JOIN koe.catenda_project_configs c
          ON c.internal_project_id = j.prosjekt_id AND c.is_active = 1
         AND c.catenda_project_id = j.catenda_project_id AND c.topic_board_id = j.catenda_board_id
       WHERE j.jobb_id = @jobb)
    BEGIN
      UPDATE koe.jobb
         SET lease = @lease, lease_startet = @naa, lease_utloeper = DATEADD(second, @leasetid_sekunder, @naa),
             antall_forsoek = antall_forsoek + 1
       WHERE jobb_id = @jobb;
      BREAK;
    END
    INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
    VALUES (@lease, @jobb, NULL, @naa, N'kobling_endret',
            N'Koblingen, boardet eller Catenda-prosjektet er endret etter at jobben ble lagt inn.');
    UPDATE koe.jobb SET tilstand = N'parkert', siste_forsoek = @lease WHERE jobb_id = @jobb;
  END
  COMMIT;

  SELECT jobb_id, jobbtype, lease, sak_id, prosjekt_id,
         LOWER(CONVERT(nvarchar(36), catenda_board_id)) AS catenda_board_id, tittel
    FROM koe.jobb
   WHERE jobb_id = @jobb AND lease = @lease;
END
GO

-- Kvitteringen for topicen: forsøket, topicen på saken og jobben som utført, i én
-- transaksjon. Bare en gyldig lease kvitterer (54001).
CREATE PROCEDURE koe_api.kvitter_topic
  @lease uniqueidentifier, @topic_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @topic_id IS NULL OR LEN(@topic_id) = 0
    THROW 51422, N'Topicen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  SELECT @jobb = jobb_id, @startet = lease_startet
    FROM koe.jobb WITH (UPDLOCK, ROWLOCK)
   WHERE lease = @lease AND jobbtype = N'catenda_topic' AND lease_utloeper > @naa;
  IF @jobb IS NULL
    THROW 54001, N'Leasen gjelder ikke', 1;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@lease, @jobb, @startet, @naa, N'utfoert', NULL);
  INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id)
  SELECT sak_id, prosjekt_id, LOWER(CONVERT(nvarchar(36), catenda_board_id)), @topic_id
    FROM koe.jobb WHERE jobb_id = @jobb;
  UPDATE koe.jobb
     SET tilstand = N'utfoert', lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = @lease
   WHERE jobb_id = @jobb;
  COMMIT;
END
GO

-- Et forsøk som feilet. Et usikkert utfall parkerer jobben (invariant 7); ellers
-- prøves den igjen etter 30 s · 2^(n−1), med tak på 1 time (arbeidsvalget 18.10).
CREATE PROCEDURE koe_api.registrer_jobbfeil
  @lease uniqueidentifier, @usikkert bit, @melding nvarchar(400)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @usikkert IS NULL OR @melding IS NULL OR LEN(@melding) = 0
    THROW 51422, N'Utfallet eller meldingen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  SELECT @jobb = jobb_id, @startet = lease_startet
    FROM koe.jobb WITH (UPDLOCK, ROWLOCK)
   WHERE lease = @lease AND lease_utloeper > @naa;
  IF @jobb IS NULL
    THROW 54001, N'Leasen gjelder ikke', 1;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@lease, @jobb, @startet, @naa, IIF(@usikkert = 1, N'usikkert', N'feilet'), @melding);
  UPDATE koe.jobb
     SET tilstand = IIF(@usikkert = 1, N'parkert', N'venter'),
         neste_forsoek = DATEADD(second, IIF(antall_forsoek >= 8, 3600, 30 * POWER(2, antall_forsoek - 1)), @naa),
         lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = @lease
   WHERE jobb_id = @jobb;
  COMMIT;
END
GO

-- Driftsverktøyet: en parkert jobb prøves igjen straks. Innloggingen som gjorde
-- det, står i forsøket (invariant 8). Kjøretiden har ikke rett til å kalle den.
CREATE PROCEDURE koe_api.start_jobb_paa_nytt
  @jobb_id uniqueidentifier
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME()), @forsoek uniqueidentifier = NEWID();
  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.jobb WITH (UPDLOCK, ROWLOCK) WHERE jobb_id = @jobb_id AND tilstand = N'parkert')
    THROW 54002, N'Jobben finnes ikke eller er ikke parkert', 1;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@forsoek, @jobb_id, NULL, @naa, N'startet_paa_nytt', LEFT(ORIGINAL_LOGIN(), 400));
  UPDATE koe.jobb SET tilstand = N'venter', neste_forsoek = @naa, siste_forsoek = @forsoek WHERE jobb_id = @jobb_id;
  COMMIT;
END
GO

GRANT EXECUTE ON koe_api.hent_jobb TO koe_runtime;
GRANT EXECUTE ON koe_api.kvitter_topic TO koe_runtime;
GRANT EXECUTE ON koe_api.registrer_jobbfeil TO koe_runtime;
