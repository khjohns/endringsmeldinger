-- Behandlingen av hendelsene i innboksen (W-1b.1, #819). Innboksen er uforanderlig, så
-- utfallet står i en egen tabell, én rad per hendelse når behandlingen er ferdig. En
-- hendelse uten rad er ikke behandlet. Raden er uforanderlig: en kommentar tilbake til
-- topicen (W-1b.2) legges oppå utfallet, den endrer det ikke.
--
-- Bare en topic laget av TE gir en sak (KT-U6). En topic fra BH (KT-U7), en topic av
-- typen endringsordre, forsering eller ukjent type (arbeidsvalget i #819), og en topic
-- som alt hører til en sak eller er laget av integrasjonen (#741 punkt 17), blir liggende
-- i innboksen med utfallet. Løkka har ingen aktør, så prosedyrene for den kjører som
-- `koe_jobbkjoerer`, som jobbene (20261018100000_jobber.sql). Saken opprettes med
-- forfatteren i konteksten, gjennom `koe_api.opprett_sak`.
CREATE TABLE koe.innkommende_behandling (
  innkommende_hendelse_id bigint NOT NULL CONSTRAINT innkommende_behandling_pk PRIMARY KEY
    CONSTRAINT innkommende_behandling_hendelse REFERENCES koe.innkommende_hendelse (id),
  utfall nvarchar(40) NOT NULL CONSTRAINT innkommende_behandling_utfall CHECK (utfall IN (
    N'sak_opprettet', N'topic_fra_bh', N'sakstype_ikke_stoettet', N'topic_har_sak',
    N'laget_av_integrasjonen', N'ukjent_prosjekt', N'ukjent_forfatter', N'ukjent_side',
    N'avvist', N'ugyldig_hendelse', N'ikke_behandlet_type', N'feilet')),
  prosjekt_id nvarchar(100) NULL,
  sak_id nvarchar(36) NULL,
  catenda_topic_id nvarchar(100) NULL,
  melding nvarchar(400) NULL,
  behandlet datetime2(3) NOT NULL
    CONSTRAINT innkommende_behandling_behandlet DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME()),
  CONSTRAINT innkommende_behandling_sak FOREIGN KEY (sak_id, prosjekt_id)
    REFERENCES koe.sak_metadata (sak_id, prosjekt_id),
  CONSTRAINT innkommende_behandling_sak_ved_opprettelse CHECK (
    (utfall = N'sak_opprettet' AND sak_id IS NOT NULL AND prosjekt_id IS NOT NULL)
    OR (utfall <> N'sak_opprettet' AND sak_id IS NULL)),
  CONSTRAINT innkommende_behandling_utfall_form
    CHECK (NOT utfall COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  CONSTRAINT innkommende_behandling_sak_id_tegnklasse
    CHECK (NOT sak_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  CONSTRAINT innkommende_behandling_prosjekt_id_tegnklasse
    CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  CONSTRAINT innkommende_behandling_topic_tegnklasse
    CHECK (NOT catenda_topic_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%')
);
GO

CREATE TRIGGER koe.innkommende_behandling_uforanderlig ON koe.innkommende_behandling INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et utfall i innboksen endres ikke', 1;
END
GO

ALTER TABLE koe.toemmingsvern ADD innkommende_behandling_id bigint NULL;
GO

ALTER TABLE koe.toemmingsvern ADD CONSTRAINT toemmingsvern_innkommende_behandling
  FOREIGN KEY (innkommende_behandling_id) REFERENCES koe.innkommende_behandling (innkommende_hendelse_id);
GO

-- Den eldste hendelsen uten utfall, med ID-en og typen fra kolonnene, som dedupen brukte
-- (#819). Ingen rad når innboksen er behandlet.
CREATE PROCEDURE koe_api.neste_innkommende
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP (1) i.id, i.hendelse_id, i.hendelsestype, i.kropp
    FROM koe.innkommende_hendelse i
   WHERE NOT EXISTS (SELECT 1 FROM koe.innkommende_behandling b WHERE b.innkommende_hendelse_id = i.id)
   ORDER BY i.id;
END
GO

-- Lagrer utfallet, eller ingenting når hendelsen alt har et. To kjørere som behandler
-- samme hendelse, gir én rad.
CREATE PROCEDURE koe_api.registrer_behandling
  @innkommende_hendelse_id bigint,
  @utfall nvarchar(40),
  @prosjekt_id nvarchar(100),
  @sak_id nvarchar(36),
  @catenda_topic_id nvarchar(100),
  @melding nvarchar(400)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.innkommende_behandling (innkommende_hendelse_id, utfall, prosjekt_id, sak_id, catenda_topic_id, melding)
  SELECT @innkommende_hendelse_id, @utfall, @prosjekt_id, @sak_id, @catenda_topic_id, @melding
   WHERE NOT EXISTS (
     SELECT 1 FROM koe.innkommende_behandling WITH (UPDLOCK, HOLDLOCK)
      WHERE innkommende_hendelse_id = @innkommende_hendelse_id);
END
GO

-- Prosjektet med den aktive koblingen til Catenda-prosjektet og topic-boardet for nye
-- saker. Prosjektet tas aldri fra kalleren, bare fra koblingen. Om topicen alt hører til
-- en sak, avgjør den unike begrensningen når saken opprettes, etter kvitteringen, så et
-- nytt forsøk får saken det første laget.
CREATE PROCEDURE koe_api.topicens_prosjekt
  @catenda_prosjekt uniqueidentifier,
  @board uniqueidentifier
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SELECT internal_project_id AS prosjekt_id FROM koe.catenda_project_configs
   WHERE catenda_project_id = @catenda_prosjekt AND topic_board_id = @board AND is_active = 1;
END
GO

GRANT EXECUTE ON koe_api.neste_innkommende TO koe_runtime;
GRANT EXECUTE ON koe_api.registrer_behandling TO koe_runtime;
GRANT EXECUTE ON koe_api.topicens_prosjekt TO koe_runtime;
GO

-- Koblingen mellom en ny sak og topicen den er opprettet fra. Blokkpredikatet slipper bare
-- `koe_jobbkjoerer` til i `koe.sak_catenda_topic`, så koblingen skrives som den. Kjøretiden
-- har ingen rett på prosedyren; den kalles bare fra `opprett_sak`, i transaksjonen som
-- oppretter saken.
CREATE PROCEDURE koe_api.koble_topic
  @sak_id nvarchar(36), @prosjekt_id nvarchar(100), @catenda_board_id nvarchar(100), @catenda_topic_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id)
  VALUES (@sak_id, @prosjekt_id, @catenda_board_id, @catenda_topic_id);
END
GO

-- `opprett_sak` får topicen saken opprettes fra. Uten topic legges jobben for topicen inn
-- som før (KT-U3). Med topic kobles saken til den i samme transaksjon, og ingen jobb
-- legges inn. Topicen må stå på prosjektets topic-board, og ID-en er normalisert av
-- kalleren (#819), så den unike begrensningen gjelder samme form.
CREATE OR ALTER PROCEDURE koe_api.opprett_sak
  @format int, @data nvarchar(max), @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @catenda_board_id nvarchar(100), @catenda_topic_id nvarchar(100),
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
  IF @catenda_topic_id IS NOT NULL AND (koe.er_uuid(@catenda_topic_id) = 0
      OR @catenda_board_id IS DISTINCT FROM LOWER(CONVERT(nvarchar(36), @board)))
    THROW 51412, N'Topicen står ikke på prosjektets topic-board for nye saker', 1;
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
  IF @catenda_topic_id IS NULL
    INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, catenda_board_id, tittel, neste_forsoek)
    VALUES (N'catenda_topic', @sak_id, @prosjekt, @catenda_prosjekt, @board, @tittel, @tidsstempel);
  ELSE
    EXEC koe_api.koble_topic @sak_id, @prosjekt, @catenda_board_id, @catenda_topic_id;
END
GO
