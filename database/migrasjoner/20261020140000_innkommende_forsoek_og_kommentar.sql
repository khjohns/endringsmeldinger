-- Forsøkene i innboksen og kommentarene tilbake til topicen (W-1b.2, #819).
--
-- Et forsøk som ikke ga noe utfall, fordi Catenda eller basen ikke svarte, lagres i
-- `koe.innkommende_forsoek`. Hendelsen venter da før neste forsøk, lenger for hvert forsøk
-- (30 s, dobbelt for hvert, høyst en time), og løkka går videre til neste hendelse, så én
-- hendelse ikke stenger innboksen (#963).
--
-- En topic laget av TE gir en sak og en kommentar med lenke og saksnummer. En topic fra BH
-- (KT-U7) og en topic av en type appen ikke behandler (arbeidsvalget under OV-U1 i #819)
-- gir en kommentar om hvorfor ingen sak er opprettet. Kommentaren skrives av løkka etter at
-- utfallet er lagret, og kvitteringen står i `koe.topic_kommentar`. Boardet lagres med
-- utfallet, så kommentaren skrives på det boardet topicen ble slått opp på.
CREATE TABLE koe.innkommende_forsoek (
  id bigint IDENTITY(1, 1) NOT NULL CONSTRAINT innkommende_forsoek_pk PRIMARY KEY,
  innkommende_hendelse_id bigint NOT NULL
    CONSTRAINT innkommende_forsoek_hendelse REFERENCES koe.innkommende_hendelse (id),
  steg nvarchar(20) NOT NULL
    CONSTRAINT innkommende_forsoek_steg CHECK (steg IN (N'behandling', N'kommentar')),
  melding nvarchar(400) NULL,
  forsoekt datetime2(3) NOT NULL
    CONSTRAINT innkommende_forsoek_forsoekt DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME()),
  CONSTRAINT innkommende_forsoek_steg_form
    CHECK (NOT steg COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%')
);
CREATE INDEX innkommende_forsoek_hendelse_steg
  ON koe.innkommende_forsoek (innkommende_hendelse_id, steg, forsoekt);
GO

CREATE TRIGGER koe.innkommende_forsoek_uforanderlig ON koe.innkommende_forsoek INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et forsøk i innboksen endres ikke', 1;
END
GO

CREATE TABLE koe.topic_kommentar (
  innkommende_hendelse_id bigint NOT NULL CONSTRAINT topic_kommentar_pk PRIMARY KEY
    CONSTRAINT topic_kommentar_behandling
      REFERENCES koe.innkommende_behandling (innkommende_hendelse_id),
  kommentar_id nvarchar(100) NOT NULL,
  skrevet datetime2(3) NOT NULL
    CONSTRAINT topic_kommentar_skrevet DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME()),
  CONSTRAINT topic_kommentar_id_tom CHECK (kommentar_id <> N''),
  CONSTRAINT topic_kommentar_id_tegnklasse
    CHECK (NOT kommentar_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%')
);
GO

CREATE TRIGGER koe.topic_kommentar_uforanderlig ON koe.topic_kommentar INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'En kommentarkvittering endres ikke', 1;
END
GO

ALTER TABLE koe.toemmingsvern ADD innkommende_forsoek_id bigint NULL, topic_kommentar_id bigint NULL;
GO

ALTER TABLE koe.toemmingsvern ADD
  CONSTRAINT toemmingsvern_innkommende_forsoek
    FOREIGN KEY (innkommende_forsoek_id) REFERENCES koe.innkommende_forsoek (id),
  CONSTRAINT toemmingsvern_topic_kommentar
    FOREIGN KEY (topic_kommentar_id) REFERENCES koe.topic_kommentar (innkommende_hendelse_id);
GO

ALTER TABLE koe.innkommende_behandling ADD catenda_board_id nvarchar(100) NULL;
GO

ALTER TABLE koe.innkommende_behandling ADD CONSTRAINT innkommende_behandling_board_tegnklasse
  CHECK (NOT catenda_board_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');
GO

-- Den eldste hendelsen uten utfall som ikke venter etter et forsøk, med ID-en og typen fra
-- kolonnene, som dedupen brukte, og antall forsøk så langt. `@naa` er basens klokke når
-- den mangler; testene flytter den fram.
CREATE OR ALTER PROCEDURE koe_api.neste_innkommende
  @naa datetime2(3) = NULL
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET @naa = ISNULL(@naa, SYSUTCDATETIME());
  SELECT TOP (1) i.id, i.hendelse_id, i.hendelsestype, i.kropp, f.antall AS forsoek
    FROM koe.innkommende_hendelse i
   CROSS APPLY (SELECT COUNT(*) AS antall, MAX(forsoekt) AS siste
                  FROM koe.innkommende_forsoek
                 WHERE innkommende_hendelse_id = i.id AND steg = N'behandling') f
   WHERE NOT EXISTS (SELECT 1 FROM koe.innkommende_behandling b WHERE b.innkommende_hendelse_id = i.id)
     AND (f.antall = 0
          OR f.siste <= DATEADD(second, -IIF(f.antall >= 8, 3600, 30 * POWER(2, f.antall - 1)), @naa))
   ORDER BY i.id;
END
GO

-- Lagrer utfallet, eller ingenting når hendelsen alt har et. To kjørere som behandler
-- samme hendelse, gir én rad.
CREATE OR ALTER PROCEDURE koe_api.registrer_behandling
  @innkommende_hendelse_id bigint,
  @utfall nvarchar(40),
  @prosjekt_id nvarchar(100),
  @sak_id nvarchar(36),
  @catenda_topic_id nvarchar(100),
  @catenda_board_id nvarchar(100) = NULL,
  @melding nvarchar(400)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.innkommende_behandling
    (innkommende_hendelse_id, utfall, prosjekt_id, sak_id, catenda_topic_id, catenda_board_id, melding)
  SELECT @innkommende_hendelse_id, @utfall, @prosjekt_id, @sak_id, @catenda_topic_id, @catenda_board_id, @melding
   WHERE NOT EXISTS (
     SELECT 1 FROM koe.innkommende_behandling WITH (UPDLOCK, HOLDLOCK)
      WHERE innkommende_hendelse_id = @innkommende_hendelse_id);
END
GO

CREATE PROCEDURE koe_api.registrer_innkommende_forsoek
  @innkommende_hendelse_id bigint,
  @steg nvarchar(20),
  @melding nvarchar(400)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.innkommende_forsoek (innkommende_hendelse_id, steg, melding)
  VALUES (@innkommende_hendelse_id, @steg, @melding);
END
GO

-- Det eldste utfallet som skal ha en kommentar og ikke har en kvittering, og som ikke
-- venter etter et forsøk. `@naa` som i `neste_innkommende`.
CREATE PROCEDURE koe_api.neste_kommentar
  @naa datetime2(3) = NULL
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET @naa = ISNULL(@naa, SYSUTCDATETIME());
  SELECT TOP (1) b.innkommende_hendelse_id AS id, b.utfall, b.prosjekt_id, b.sak_id,
         b.catenda_board_id, b.catenda_topic_id
    FROM koe.innkommende_behandling b
   CROSS APPLY (SELECT COUNT(*) AS antall, MAX(forsoekt) AS siste
                  FROM koe.innkommende_forsoek
                 WHERE innkommende_hendelse_id = b.innkommende_hendelse_id AND steg = N'kommentar') f
   WHERE b.utfall IN (N'sak_opprettet', N'topic_fra_bh', N'sakstype_ikke_stoettet')
     AND b.catenda_board_id IS NOT NULL AND b.catenda_topic_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM koe.topic_kommentar k WHERE k.innkommende_hendelse_id = b.innkommende_hendelse_id)
     AND (f.antall = 0
          OR f.siste <= DATEADD(second, -IIF(f.antall >= 8, 3600, 30 * POWER(2, f.antall - 1)), @naa))
   ORDER BY b.innkommende_hendelse_id;
END
GO

CREATE PROCEDURE koe_api.kvitter_kommentar
  @innkommende_hendelse_id bigint,
  @kommentar_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.topic_kommentar (innkommende_hendelse_id, kommentar_id)
  SELECT @innkommende_hendelse_id, @kommentar_id
   WHERE NOT EXISTS (
     SELECT 1 FROM koe.topic_kommentar WITH (UPDLOCK, HOLDLOCK)
      WHERE innkommende_hendelse_id = @innkommende_hendelse_id);
END
GO

GRANT EXECUTE ON koe_api.registrer_innkommende_forsoek TO koe_runtime;
GRANT EXECUTE ON koe_api.neste_kommentar TO koe_runtime;
GRANT EXECUTE ON koe_api.kvitter_kommentar TO koe_runtime;
GO
