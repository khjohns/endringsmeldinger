-- Saksregisteret, journalen, notatet, leveringsoppdraget og kjernebufferen
-- (#53, del 2), med triggerne mot endring. Kildene er prøven
-- (`prove/azuresql/sql/01_skjema.sql` og `02_sikkerhet.sql`, form (a)) og
-- forløperne i PostgreSQL. Radsikkerheten og rettighetene for kjøretiden står i
-- en egen migrasjon (DL-U5).
--
-- Avsenderen er `app_users.id` med fremmednøkkel (AGENTS.md), og teamet har
-- `catenda_id()`-formen uten fremmednøkkel. Ingen fremmednøkkel kaskaderer.
-- Tidspunktene er `datetime2(3)` i UTC (DL-U3); `tidsstempel` i journalen er
-- tidspunktet kjernen regnet brevet med og settes av serveren, uten standard.

CREATE TABLE koe.sak_metadata (
  sak_id nvarchar(36) NOT NULL CONSTRAINT sak_metadata_pk PRIMARY KEY CONSTRAINT sak_metadata_sak_id CHECK (LEN(sak_id) > 0),
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT sak_metadata_project FOREIGN KEY REFERENCES koe.projects (id),
  sakstype nvarchar(40) NOT NULL CONSTRAINT sak_metadata_sakstype CHECK (LEN(sakstype) > 0),
  created_by uniqueidentifier NOT NULL CONSTRAINT sak_metadata_created_by FOREIGN KEY REFERENCES koe.app_users (id),
  created_at datetime2(3) NOT NULL CONSTRAINT sak_metadata_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT sak_metadata_sak_prosjekt UNIQUE (sak_id, prosjekt_id)
);
CREATE INDEX sak_metadata_prosjekt_id ON koe.sak_metadata (prosjekt_id);

-- Journalen: ett dokument per brev, med teksten slik den ble sendt.
-- `transaksjon` og `skriving` er transaksjonen og skrivingen (`koe_skriving`,
-- en ny GUID per kommando) som lagret raden; leveringsoppdraget godtas bare fra
-- den samme. Teamet står bare når det er entydig (DL-U4).
CREATE TABLE koe.hendelse (
  event_id nvarchar(36) NOT NULL CONSTRAINT hendelse_pk PRIMARY KEY,
  sak_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  event_type nvarchar(100) NOT NULL CONSTRAINT hendelse_event_type CHECK (LEN(event_type) > 0),
  versjon int NOT NULL CONSTRAINT hendelse_versjon CHECK (versjon >= 1),
  tidsstempel datetime2(3) NOT NULL,
  aktor_id uniqueidentifier NOT NULL CONSTRAINT hendelse_aktor FOREIGN KEY REFERENCES koe.app_users (id),
  aktor_rolle nvarchar(2) NOT NULL CONSTRAINT hendelse_rolle CHECK (aktor_rolle IN (N'TE', N'BH')),
  aktor_team_id nvarchar(32) NULL CONSTRAINT hendelse_team_form
    CHECK (DATALENGTH(aktor_team_id) = 64 AND aktor_team_id COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  refererer_til_event_id nvarchar(36) NULL,
  format int NULL CONSTRAINT hendelse_format CHECK (format >= 1),
  data nvarchar(max) NOT NULL CONSTRAINT hendelse_data_er_objekt CHECK (ISJSON(data, OBJECT) = 1),
  transaksjon bigint NOT NULL,
  skriving uniqueidentifier NOT NULL,
  CONSTRAINT hendelse_event_id_form CHECK (
    TRY_CAST(event_id AS uniqueidentifier) IS NOT NULL
    AND DATALENGTH(event_id) = 72
    AND event_id COLLATE Latin1_General_100_BIN2_UTF8 = LOWER(event_id)),
  CONSTRAINT hendelse_sak_versjon UNIQUE (sak_id, versjon),
  CONSTRAINT hendelse_event_sak_prosjekt UNIQUE (event_id, sak_id, prosjekt_id),
  CONSTRAINT hendelse_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id)
);
CREATE INDEX hendelse_prosjekt_id ON koe.hendelse (prosjekt_id);

-- Notatet er ikke et kontraktsvarsel og kan endres og slettes (MS-05). Et notat
-- uten team kan ingen lese, så basen avviser det (AGENTS.md). Notatet viser til
-- brevet uten fremmednøkkel, så det kan slettes uten å røre journalen.
CREATE TABLE koe.notat (
  notat_id uniqueidentifier NOT NULL CONSTRAINT notat_pk PRIMARY KEY,
  sak_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  aktor_id uniqueidentifier NOT NULL CONSTRAINT notat_aktor FOREIGN KEY REFERENCES koe.app_users (id),
  aktor_rolle nvarchar(2) NOT NULL CONSTRAINT notat_rolle CHECK (aktor_rolle IN (N'TE', N'BH')),
  aktor_team_id nvarchar(32) NOT NULL CONSTRAINT notat_team_form
    CHECK (DATALENGTH(aktor_team_id) = 64 AND aktor_team_id COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  tekst nvarchar(max) NOT NULL CONSTRAINT notat_tekst CHECK (LEN(tekst) > 0),
  spor nvarchar(10) NULL CONSTRAINT notat_spor CHECK (spor IN (N'grunnlag', N'vederlag', N'frist')),
  kommentar nvarchar(max) NULL,
  refererer_til_event_id nvarchar(36) NULL,
  opprettet datetime2(3) NOT NULL CONSTRAINT notat_opprettet DEFAULT SYSUTCDATETIME(),
  endret datetime2(3) NULL,
  CONSTRAINT notat_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id)
);
CREATE INDEX notat_sak_id ON koe.notat (sak_id);
CREATE INDEX notat_prosjekt_id ON koe.notat (prosjekt_id);

-- Leveringsoppdraget for et brev (LV-U1, B-03), frosset i samme transaksjon som
-- brevet. Den sammensatte fremmednøkkelen holder oppdraget i brevets sak og
-- prosjekt. `innhold_sha256` er SHA-256 av `innhold` som JSON med sorterte
-- nøkler (`server/levering.ts`).
CREATE TABLE koe.leveringsoppdrag (
  id uniqueidentifier NOT NULL CONSTRAINT leveringsoppdrag_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL,
  sak_id nvarchar(36) NOT NULL,
  event_id nvarchar(36) NOT NULL CONSTRAINT leveringsoppdrag_event_id UNIQUE,
  dokumentnoekkel nvarchar(100) NOT NULL CONSTRAINT leveringsoppdrag_dokumentnoekkel UNIQUE
    CONSTRAINT leveringsoppdrag_dokumentnoekkel_ikke_tom CHECK (LEN(dokumentnoekkel) > 0),
  innhold nvarchar(max) NOT NULL CONSTRAINT leveringsoppdrag_innhold_er_objekt CHECK (ISJSON(innhold, OBJECT) = 1),
  innhold_sha256 nvarchar(64) NOT NULL CONSTRAINT leveringsoppdrag_sum
    CHECK (DATALENGTH(innhold_sha256) = 128 AND innhold_sha256 COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  opprettet datetime2(3) NOT NULL CONSTRAINT leveringsoppdrag_opprettet DEFAULT SYSUTCDATETIME(),
  CONSTRAINT leveringsoppdrag_hendelse FOREIGN KEY (event_id, sak_id, prosjekt_id)
    REFERENCES koe.hendelse (event_id, sak_id, prosjekt_id)
);
CREATE INDEX leveringsoppdrag_sak_id ON koe.leveringsoppdrag (sak_id);
CREATE INDEX leveringsoppdrag_prosjekt_id ON koe.leveringsoppdrag (prosjekt_id);

-- Bufferen kjernen regner ut av journalen, med versjonene den er regnet med
-- (B-10, `kjerne/utledning/buffer.ts`). Den er avledet, kan slettes og bygges
-- på nytt fra journalen, og ingen regel og ingen bindende kommando leser den.
-- En sak uten buffer har ingen rad (arbeidsvalg 1 i #53).
CREATE TABLE koe.kjernebuffer (
  sak_id nvarchar(36) NOT NULL CONSTRAINT kjernebuffer_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL,
  visning nvarchar(max) NOT NULL CONSTRAINT kjernebuffer_visning_er_objekt CHECK (ISJSON(visning, OBJECT) = 1),
  projeksjonsversjon int NOT NULL,
  regelversjon int NOT NULL,
  leserformat int NOT NULL,
  saksversjon int NOT NULL,
  CONSTRAINT kjernebuffer_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id)
);
CREATE INDEX kjernebuffer_prosjekt_id ON koe.kjernebuffer (prosjekt_id);
GO

-- Mot endring: saken, brevet og oppdraget endres og slettes aldri, heller ikke
-- av eieren. En tabell i `koe` uten en slik trigger står i den lukkede listen i
-- `server/tester/journal.test.ts`. TRUNCATE avfyrer ingen trigger; saken og
-- brevet har fremmednøkler mot seg og kan ikke tømmes, og oppdraget krever ALTER.
CREATE TRIGGER koe.sak_metadata_uforanderlig ON koe.sak_metadata INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Saken flyttes og slettes ikke', 1;
END
GO

CREATE TRIGGER koe.hendelse_uforanderlig ON koe.hendelse INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et lagret brev endres ikke', 1;
END
GO

CREATE TRIGGER koe.leveringsoppdrag_uforanderlig ON koe.leveringsoppdrag INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et lagret leveringsoppdrag endres ikke', 1;
END
GO

-- Oppdraget godtas bare i transaksjonen og skrivingen som lagret brevet, så det
-- ikke kan legges til et lagret brev. Radsikkerheten filtrerer også `inserted`;
-- uten kontekst ville en `IF EXISTS` over `inserted` sett null rader og sluppet
-- alt gjennom. Triggeren teller derfor de godkjente radene og sammenlikner med
-- ROWCOUNT_BIG() for setningen, som radsikkerheten ikke påvirker (prøven).
CREATE TRIGGER koe.leveringsoppdrag_samme_transaksjon ON koe.leveringsoppdrag AFTER INSERT AS
BEGIN
  DECLARE @rader bigint = ROWCOUNT_BIG();
  SET NOCOUNT ON;
  IF @rader <> (SELECT COUNT_BIG(*) FROM inserted i
                 WHERE EXISTS (SELECT 1 FROM koe.hendelse h
                                WHERE h.event_id = i.event_id AND h.sak_id = i.sak_id AND h.prosjekt_id = i.prosjekt_id
                                  AND h.transaksjon = CURRENT_TRANSACTION_ID()
                                  AND h.skriving = TRY_CAST(SESSION_CONTEXT(N'koe_skriving') AS uniqueidentifier)))
    THROW 51002, N'Et leveringsoppdrag kan ikke legges til et lagret brev', 1;
END
GO
