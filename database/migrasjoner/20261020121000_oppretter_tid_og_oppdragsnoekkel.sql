-- Fire rettinger fra #877 og #778, og prosjektgrensen mot oppdraget fra #783.
--
-- 1. (#877 punkt 22) Porten i `koe_api.opprett_sak` er blokkpredikatet
--    `koe_sikkerhet.oppretter` selv, ikke en kopi av deler av det. Kopien manglet
--    rollen, at prosjektet er aktivt, og likheten i `DATALENGTH`. Feilkoden og de to
--    meldingene er som før; meldingen velges først etter at porten har avvist.
--    Prosedyren er ellers som i `20261020080000_skriveprosedyrer.sql`.
-- 2. (#778 punkt 7) `SYSUTCDATETIME()` er datetime2(7), og en standard på en
--    datetime2(3)-kolonne runder den av, så tidspunktet kan ligge etter
--    `DATETRUNC(millisecond, SYSUTCDATETIME())` i en prosedyre. Standardene kutter i
--    stedet. `koe_migrering.historikk` lages av runneren og rettes der.
-- 3. (#778) `koe_api.start_jobb_paa_nytt` lagrer SID-en til innloggingen i heksform,
--    ikke innloggingsnavnet, som med Entra er en e-postadresse i en tabell som ikke
--    kan endres. Har innloggingen ingen SID basen kan slå opp, lagres bare at driften
--    startet jobben.
-- 4. (#783) Kvitteringene, PDF-en og jobben viser til oppdraget med `prosjekt_id`,
--    så de står i oppdragets prosjekt.

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
  -- Låsen på koblingen tas før noe annet leses (#868 punkt 1). `koe_drift.registrer_prosjekt`
  -- og `koe_drift.sett_kontraktsteam` låser også koblingen før `koe.prosjekt_med_saker`,
  -- så de tre går etter hverandre. `registrer_prosjekt` låser `koe.projects` før koblingen;
  -- her leses `koe.projects` bare uten oppdateringslås, av fremmednøklene og blokkpredikatene.
  DECLARE @catenda_prosjekt uniqueidentifier, @board uniqueidentifier, @aktiv bit;
  SELECT @catenda_prosjekt = catenda_project_id, @board = topic_board_id, @aktiv = is_active
    FROM koe.catenda_project_configs WITH (UPDLOCK, HOLDLOCK)
   WHERE internal_project_id = @prosjekt;
  IF @aktiv IS DISTINCT FROM 1 OR @board IS NULL
    THROW 51412, N'Prosjektet har ikke noe topic-board i Catenda for nye saker', 1;
  -- Siden og teamet regnet serveren ut før transaksjonen. Et bytte gjør medlemskapene
  -- inaktive, og nye kontraktsteam kan ha tatt teamet ut.
  IF NOT EXISTS (SELECT 1 FROM koe_sikkerhet.oppretter(@prosjekt, @aktor))
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM koe.app_project_memberships m
                     JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
                    WHERE m.project_id = @prosjekt AND m.user_id = @aktor AND m.active = 1
                      AND m.viewer_override = 0 AND m.role IN (N'admin', N'member'))
      THROW 51403, N'Aktøren er ikke lenger aktivt medlem av prosjektet', 1;
    THROW 51403, N'Teamet er ikke lenger kontraktsteam på siden i prosjektet', 1;
  END

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
  INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, catenda_board_id, tittel, neste_forsoek)
  VALUES (N'catenda_topic', @sak_id, @prosjekt, @catenda_prosjekt, @board, @tittel, @tidsstempel);
END
GO

DECLARE @setninger nvarchar(max) = N'';
SELECT @setninger += CONCAT(
         N'ALTER TABLE ', QUOTENAME(OBJECT_SCHEMA_NAME(d.parent_object_id)), N'.', QUOTENAME(OBJECT_NAME(d.parent_object_id)),
         N' DROP CONSTRAINT ', QUOTENAME(d.name), N'; ',
         N'ALTER TABLE ', QUOTENAME(OBJECT_SCHEMA_NAME(d.parent_object_id)), N'.', QUOTENAME(OBJECT_NAME(d.parent_object_id)),
         N' ADD CONSTRAINT ', QUOTENAME(d.name), N' DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME()) FOR ',
         QUOTENAME(c.name), N'; ')
  FROM sys.default_constraints d
  JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
 WHERE d.definition = N'(sysutcdatetime())'
   AND TYPE_NAME(c.user_type_id) = N'datetime2' AND c.scale = 3
   AND NOT (d.parent_object_id = OBJECT_ID(N'koe_migrering.historikk') AND c.name = N'anvendt');
EXEC sys.sp_executesql @setninger;
GO

CREATE OR ALTER PROCEDURE koe_api.start_jobb_paa_nytt
  @jobb_id uniqueidentifier
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME()), @forsoek uniqueidentifier = NEWID(),
          @driften nvarchar(400) = ISNULL(N'sid:' + CONVERT(nvarchar(200), SUSER_SID(ORIGINAL_LOGIN()), 1),
                                          N'driften uten SID');
  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.jobb WITH (UPDLOCK, ROWLOCK) WHERE jobb_id = @jobb_id AND tilstand = N'parkert')
    THROW 54002, N'Jobben finnes ikke eller er ikke parkert', 1;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@forsoek, @jobb_id, NULL, @naa, N'startet_paa_nytt', @driften);
  UPDATE koe.jobb
     SET tilstand = N'venter', neste_forsoek = @naa, antall_forsoek = 0, siste_forsoek = @forsoek
   WHERE jobb_id = @jobb_id;
  COMMIT;
END
GO

ALTER TABLE koe.leveringsoppdrag ADD CONSTRAINT leveringsoppdrag_id_prosjekt UNIQUE (id, prosjekt_id);

ALTER TABLE koe.jobb DROP CONSTRAINT jobb_leveringsoppdrag;
ALTER TABLE koe.jobb WITH CHECK ADD CONSTRAINT jobb_leveringsoppdrag
  FOREIGN KEY (leveringsoppdrag_id, prosjekt_id) REFERENCES koe.leveringsoppdrag (id, prosjekt_id);

ALTER TABLE koe.leveringskvittering DROP CONSTRAINT leveringskvittering_oppdrag;
ALTER TABLE koe.leveringskvittering WITH CHECK ADD CONSTRAINT leveringskvittering_oppdrag
  FOREIGN KEY (leveringsoppdrag_id, prosjekt_id) REFERENCES koe.leveringsoppdrag (id, prosjekt_id);

ALTER TABLE koe.brevdokument DROP CONSTRAINT brevdokument_oppdrag;
ALTER TABLE koe.brevdokument WITH CHECK ADD CONSTRAINT brevdokument_oppdrag
  FOREIGN KEY (leveringsoppdrag_id, prosjekt_id) REFERENCES koe.leveringsoppdrag (id, prosjekt_id);

ALTER TABLE koe.vedleggskvittering DROP CONSTRAINT vedleggskvittering_oppdrag;
ALTER TABLE koe.vedleggskvittering WITH CHECK ADD CONSTRAINT vedleggskvittering_oppdrag
  FOREIGN KEY (leveringsoppdrag_id, prosjekt_id) REFERENCES koe.leveringsoppdrag (id, prosjekt_id);
GO
