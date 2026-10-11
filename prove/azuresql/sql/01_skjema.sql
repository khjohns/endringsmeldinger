-- Tabellene i prøven (#395). Felles: identitet, prosjekter, medlemskap,
-- kontraktsteam, saker og notater. Form (a) og (b) har hvert sitt skjema.
-- Basen opprettes med sorteringen Latin1_General_100_BIN2_UTF8, så ID-er
-- sammenliknes tegn for tegn som i PostgreSQL (ikke uten hensyn til store og
-- små bokstaver, som standardsorteringen i Azure SQL Database).

CREATE SCHEMA koe;
GO
CREATE SCHEMA koe_sikkerhet;
GO
CREATE SCHEMA koe_api;
GO
CREATE SCHEMA form_a;
GO
CREATE SCHEMA form_b;
GO

CREATE TABLE koe.app_users (
  id uniqueidentifier NOT NULL CONSTRAINT app_users_pk PRIMARY KEY,
  email nvarchar(320) NOT NULL,
  name nvarchar(400) NOT NULL,
  created_at datetimeoffset(3) NOT NULL CONSTRAINT app_users_created_at DEFAULT SYSDATETIMEOFFSET()
);

CREATE TABLE koe.app_identities (
  id uniqueidentifier NOT NULL CONSTRAINT app_identities_pk PRIMARY KEY,
  user_id uniqueidentifier NOT NULL CONSTRAINT app_identities_user FOREIGN KEY REFERENCES koe.app_users (id),
  provider nvarchar(16) NOT NULL CONSTRAINT app_identities_provider CHECK (provider IN (N'catenda', N'entra')),
  issuer nvarchar(400) NOT NULL,
  subject nvarchar(400) NOT NULL,
  CONSTRAINT app_identities_unik UNIQUE (provider, issuer, subject)
);

CREATE TABLE koe.projects (
  id nvarchar(100) NOT NULL CONSTRAINT projects_pk PRIMARY KEY,
  name nvarchar(400) NOT NULL,
  is_active bit NOT NULL
);

CREATE TABLE koe.app_project_memberships (
  project_id nvarchar(100) NOT NULL CONSTRAINT memberships_project FOREIGN KEY REFERENCES koe.projects (id),
  user_id uniqueidentifier NOT NULL CONSTRAINT memberships_user FOREIGN KEY REFERENCES koe.app_users (id),
  role nvarchar(10) NOT NULL CONSTRAINT memberships_role CHECK (role IN (N'admin', N'member', N'viewer')),
  viewer_override bit NOT NULL,
  active bit NOT NULL,
  CONSTRAINT memberships_pk PRIMARY KEY (project_id, user_id)
);

-- Teamet i `catenda_id()`-form: 32 små heksadesimale tegn.
CREATE TABLE koe.catenda_contract_teams (
  internal_project_id nvarchar(100) NOT NULL CONSTRAINT contract_teams_project FOREIGN KEY REFERENCES koe.projects (id),
  team_id nvarchar(32) NOT NULL CONSTRAINT contract_teams_form
    CHECK (DATALENGTH(team_id) = 64 AND team_id NOT LIKE N'%[^0-9a-f]%'),
  contract_role nvarchar(2) NOT NULL CONSTRAINT contract_teams_role CHECK (contract_role IN (N'TE', N'BH')),
  CONSTRAINT contract_teams_pk PRIMARY KEY (internal_project_id, team_id)
);

-- Prosjektet har ingen standardverdi: skrivestien stempler det fra konteksten.
CREATE TABLE koe.sak_metadata (
  sak_id nvarchar(36) NOT NULL CONSTRAINT sak_metadata_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT sak_metadata_project FOREIGN KEY REFERENCES koe.projects (id),
  sakstype nvarchar(40) NOT NULL,
  created_by nvarchar(36) NOT NULL,
  created_at datetimeoffset(3) NOT NULL CONSTRAINT sak_metadata_created_at DEFAULT SYSDATETIMEOFFSET(),
  CONSTRAINT sak_metadata_sak_prosjekt UNIQUE (sak_id, prosjekt_id)
);

-- Notatet er ikke et kontraktsvarsel og kan slettes (MS-05). `aktor_team_id`
-- tillater NULL her bare for å prøve at et notat uten team vises til ingen.
CREATE TABLE koe.notat (
  notat_id uniqueidentifier NOT NULL CONSTRAINT notat_pk PRIMARY KEY,
  sak_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  aktor_id nvarchar(36) NOT NULL,
  aktor_rolle nvarchar(2) NOT NULL CONSTRAINT notat_rolle CHECK (aktor_rolle IN (N'TE', N'BH')),
  aktor_team_id nvarchar(32) NULL,
  tekst nvarchar(max) NOT NULL CONSTRAINT notat_tekst CHECK (LEN(tekst) > 0),
  opprettet datetimeoffset(3) NOT NULL CONSTRAINT notat_opprettet DEFAULT SYSDATETIMEOFFSET(),
  CONSTRAINT notat_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id)
);
GO

-- (a) Ett dokument per brev er kilden: `data` er teksten slik den ble sendt,
-- kontrollert med ISJSON. `transaksjon` er transaksjonen som skrev raden; de
-- avledede tabellene godtar bare rader fra den samme transaksjonen.
CREATE TABLE form_a.hendelse (
  event_id nvarchar(36) NOT NULL CONSTRAINT a_hendelse_pk PRIMARY KEY,
  sak_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  event_type nvarchar(100) NOT NULL,
  versjon int NOT NULL CONSTRAINT a_hendelse_versjon CHECK (versjon >= 1),
  tidsstempel datetimeoffset(3) NOT NULL,
  aktor_id nvarchar(36) NOT NULL,
  aktor_rolle nvarchar(2) NOT NULL CONSTRAINT a_hendelse_rolle CHECK (aktor_rolle IN (N'TE', N'BH')),
  aktor_team_id nvarchar(32) NULL,
  refererer_til_event_id nvarchar(36) NULL,
  format int NULL CONSTRAINT a_hendelse_format CHECK (format >= 1),
  data nvarchar(max) NOT NULL CONSTRAINT a_hendelse_data_er_objekt CHECK (ISJSON(data, OBJECT) = 1),
  transaksjon bigint NOT NULL,
  CONSTRAINT a_hendelse_event_id_form CHECK (TRY_CAST(event_id AS uniqueidentifier) IS NOT NULL),
  CONSTRAINT a_hendelse_sak_versjon UNIQUE (sak_id, versjon),
  CONSTRAINT a_hendelse_event_prosjekt UNIQUE (event_id, prosjekt_id),
  CONSTRAINT a_hendelse_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id)
);

-- Avledet av `data` i samme transaksjon, for spørring og rapportering. Kjernen
-- leser dem ikke. Verdiene leses med TRY_CAST, så et dokument kjernen ikke
-- forstår, lagres likevel og gir en sak som ikke er forstått.
CREATE TABLE form_a.krav (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  plass int NOT NULL,
  id nvarchar(max) NULL,
  spor nvarchar(max) NULL,
  erstatter nvarchar(max) NULL,
  beloep float NULL,
  dager int NULL,
  CONSTRAINT a_krav_pk PRIMARY KEY (event_id, plass),
  CONSTRAINT a_krav_hendelse FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_a.hendelse (event_id, prosjekt_id)
);

CREATE TABLE form_a.svar (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  plass int NOT NULL,
  id nvarchar(max) NULL,
  spor nvarchar(max) NULL,
  gjelder nvarchar(max) NULL,
  erstatter nvarchar(max) NULL,
  regelversjon int NULL,
  sammenfall bit NULL,
  CONSTRAINT a_svar_pk PRIMARY KEY (event_id, plass),
  CONSTRAINT a_svar_hendelse FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_a.hendelse (event_id, prosjekt_id)
);

CREATE TABLE form_a.utsagn (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  plass int NOT NULL,
  id nvarchar(max) NULL,
  art nvarchar(max) NULL,
  gjelder nvarchar(max) NULL,
  spor nvarchar(max) NULL,
  CONSTRAINT a_utsagn_pk PRIMARY KEY (event_id, plass),
  CONSTRAINT a_utsagn_hendelse FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_a.hendelse (event_id, prosjekt_id)
);

CREATE TABLE form_a.leveringsoppdrag (
  event_id nvarchar(36) NOT NULL CONSTRAINT a_oppdrag_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL,
  innhold nvarchar(max) NOT NULL CONSTRAINT a_oppdrag_er_objekt CHECK (ISJSON(innhold, OBJECT) = 1),
  innhold_sha256 nvarchar(64) NOT NULL CONSTRAINT a_oppdrag_sum
    CHECK (DATALENGTH(innhold_sha256) = 128 AND innhold_sha256 NOT LIKE N'%[^0-9a-f]%'),
  CONSTRAINT a_oppdrag_hendelse FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_a.hendelse (event_id, prosjekt_id)
);
GO

-- (b) Utsagnene i egne tabeller er kilden. Dokumentraden har ingen `data`;
-- innholdet står i kolonner, og `leveringsdokument` er det frosne dokumentet
-- som leveres. Hver kolonne er et felt i formatet; NULL betyr at feltet
-- mangler. `plass` er rekkefølgen i dokumentet.
CREATE TABLE form_b.dokument (
  event_id nvarchar(36) NOT NULL CONSTRAINT b_dokument_pk PRIMARY KEY,
  sak_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  event_type nvarchar(100) NOT NULL,
  versjon int NOT NULL CONSTRAINT b_dokument_versjon CHECK (versjon >= 1),
  tidsstempel datetimeoffset(3) NOT NULL,
  aktor_id nvarchar(36) NOT NULL,
  aktor_rolle nvarchar(2) NOT NULL CONSTRAINT b_dokument_rolle CHECK (aktor_rolle IN (N'TE', N'BH')),
  aktor_team_id nvarchar(32) NULL,
  refererer_til_event_id nvarchar(36) NULL,
  format int NULL CONSTRAINT b_dokument_format CHECK (format >= 1),
  transaksjon bigint NOT NULL,
  CONSTRAINT b_dokument_event_id_form CHECK (TRY_CAST(event_id AS uniqueidentifier) IS NOT NULL),
  CONSTRAINT b_dokument_sak_versjon UNIQUE (sak_id, versjon),
  CONSTRAINT b_dokument_event_prosjekt UNIQUE (event_id, prosjekt_id),
  CONSTRAINT b_dokument_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id)
);

CREATE TABLE form_b.sak_opprettet (
  event_id nvarchar(36) NOT NULL CONSTRAINT b_sak_opprettet_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL,
  sakstittel nvarchar(max) NULL,
  sakstype nvarchar(max) NULL,
  CONSTRAINT b_sak_opprettet_dokument FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_b.dokument (event_id, prosjekt_id)
);

CREATE TABLE form_b.krav (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  plass int NOT NULL,
  id nvarchar(max) NULL,
  spor nvarchar(max) NULL,
  erstatter nvarchar(max) NULL,
  hovedkategori nvarchar(max) NULL,
  underkategori nvarchar(max) NULL,
  tittel nvarchar(max) NULL,
  beskrivelse nvarchar(max) NULL,
  metode nvarchar(max) NULL,
  beloep float NULL,
  dager float NULL,
  CONSTRAINT b_krav_pk PRIMARY KEY (event_id, plass),
  CONSTRAINT b_krav_dokument FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_b.dokument (event_id, prosjekt_id)
);

-- Utregningen og beslutningsgrunnlaget er ett til ett med svaret og står i
-- samme rad. `har_utregning` skiller et svar uten utregning fra en tom.
CREATE TABLE form_b.svar (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  plass int NOT NULL,
  id nvarchar(max) NULL,
  spor nvarchar(max) NULL,
  gjelder nvarchar(max) NULL,
  erstatter nvarchar(max) NULL,
  utregning_resultat nvarchar(max) NULL,
  utregning_godkjent_beloep float NULL,
  utregning_godkjent_dager float NULL,
  utregning_subsidiaert_resultat nvarchar(max) NULL,
  utregning_subsidiaert_godkjent_dager float NULL,
  bg_regelversjon float NULL,
  bg_linje nvarchar(max) NULL,
  bg_sammenfall bit NULL,
  bg_varslingsplikt bit NULL,
  har_utregning bit NOT NULL,
  har_beslutningsgrunnlag bit NOT NULL,
  CONSTRAINT b_svar_pk PRIMARY KEY (event_id, plass),
  CONSTRAINT b_svar_dokument FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_b.dokument (event_id, prosjekt_id)
);

CREATE TABLE form_b.standpunkt (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  svar_plass int NOT NULL,
  plass int NOT NULL,
  id nvarchar(max) NULL,
  art nvarchar(max) NULL,
  gjelder nvarchar(max) NULL,
  hjemmel nvarchar(max) NULL,
  i_tide bit NULL,
  resultat nvarchar(max) NULL,
  oppfylt bit NULL,
  CONSTRAINT b_standpunkt_pk PRIMARY KEY (event_id, svar_plass, plass),
  CONSTRAINT b_standpunkt_svar FOREIGN KEY (event_id, svar_plass) REFERENCES form_b.svar (event_id, plass)
);

-- `virkninger` og `uten_virkning` i beslutningsgrunnlaget. `liste` sier hvilken.
CREATE TABLE form_b.virkning (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  svar_plass int NOT NULL,
  liste nvarchar(20) NOT NULL CONSTRAINT b_virkning_liste CHECK (liste IN (N'virkninger', N'uten_virkning')),
  plass int NOT NULL,
  standpunkt nvarchar(max) NULL,
  virkning nvarchar(max) NULL,
  CONSTRAINT b_virkning_pk PRIMARY KEY (event_id, svar_plass, liste, plass),
  CONSTRAINT b_virkning_svar FOREIGN KEY (event_id, svar_plass) REFERENCES form_b.svar (event_id, plass)
);

CREATE TABLE form_b.utsagn (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  plass int NOT NULL,
  id nvarchar(max) NULL,
  art nvarchar(max) NULL,
  hjemmel nvarchar(max) NULL,
  gjelder nvarchar(max) NULL,
  regelversjon float NULL,
  hva nvarchar(max) NULL,
  spor nvarchar(max) NULL,
  CONSTRAINT b_utsagn_pk PRIMARY KEY (event_id, plass),
  CONSTRAINT b_utsagn_dokument FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_b.dokument (event_id, prosjekt_id)
);

CREATE TABLE form_b.opplysning (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  plass int NOT NULL,
  id nvarchar(max) NULL,
  hva nvarchar(max) NULL,
  dato nvarchar(max) NULL,
  gjelder nvarchar(max) NULL,
  oppfylt bit NULL,
  CONSTRAINT b_opplysning_pk PRIMARY KEY (event_id, plass),
  CONSTRAINT b_opplysning_dokument FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_b.dokument (event_id, prosjekt_id)
);

CREATE TABLE form_b.dokumentasjon (
  event_id nvarchar(36) NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL,
  plass int NOT NULL,
  vedlegg nvarchar(max) NOT NULL,
  CONSTRAINT b_dokumentasjon_pk PRIMARY KEY (event_id, plass),
  CONSTRAINT b_dokumentasjon_dokument FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_b.dokument (event_id, prosjekt_id)
);

-- Det frosne dokumentet som leveres (LV-U1). Kjernen leser det ikke.
CREATE TABLE form_b.leveringsdokument (
  event_id nvarchar(36) NOT NULL CONSTRAINT b_leveringsdokument_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL,
  innhold nvarchar(max) NOT NULL CONSTRAINT b_leveringsdokument_er_objekt CHECK (ISJSON(innhold, OBJECT) = 1),
  innhold_sha256 nvarchar(64) NOT NULL CONSTRAINT b_leveringsdokument_sum
    CHECK (DATALENGTH(innhold_sha256) = 128 AND innhold_sha256 NOT LIKE N'%[^0-9a-f]%'),
  CONSTRAINT b_leveringsdokument_dokument FOREIGN KEY (event_id, prosjekt_id) REFERENCES form_b.dokument (event_id, prosjekt_id)
);

-- Feltene formatet har, per slag element og JSON-type (typen fra OPENJSON:
-- 1 tekst, 2 tall, 3 sann/usann, 4 liste, 5 objekt). Form (b) kan bare lagre
-- det som står her; alt annet avvises ved skriving. Dette er en andre kopi av
-- skjemaet i `kjerne/format/format.ts`.
CREATE TABLE form_b.felt (
  slag nvarchar(40) NOT NULL,
  noekkel nvarchar(100) NOT NULL,
  jsontype tinyint NOT NULL,
  CONSTRAINT b_felt_pk PRIMARY KEY (slag, noekkel)
);
INSERT form_b.felt (slag, noekkel, jsontype) VALUES
  (N'sak_opprettet', N'sakstittel', 1), (N'sak_opprettet', N'sakstype', 1),
  (N'dokument', N'krav', 4), (N'dokument', N'svar', 4), (N'dokument', N'utsagn', 4),
  (N'dokument', N'opplysninger', 4), (N'dokument', N'dokumentasjon', 4),
  (N'krav', N'id', 1), (N'krav', N'spor', 1), (N'krav', N'erstatter', 1),
  (N'krav', N'hovedkategori', 1), (N'krav', N'underkategori', 1), (N'krav', N'tittel', 1),
  (N'krav', N'beskrivelse', 1), (N'krav', N'metode', 1), (N'krav', N'beloep', 2), (N'krav', N'dager', 2),
  (N'svar', N'id', 1), (N'svar', N'spor', 1), (N'svar', N'gjelder', 1), (N'svar', N'erstatter', 1),
  (N'svar', N'standpunkter', 4), (N'svar', N'utregning', 5), (N'svar', N'beslutningsgrunnlag', 5),
  (N'utregning', N'resultat', 1), (N'utregning', N'godkjent_beloep', 2), (N'utregning', N'godkjent_dager', 2),
  (N'utregning', N'subsidiaert_resultat', 1), (N'utregning', N'subsidiaert_godkjent_dager', 2),
  (N'beslutningsgrunnlag', N'regelversjon', 2), (N'beslutningsgrunnlag', N'virkninger', 4),
  (N'beslutningsgrunnlag', N'uten_virkning', 4), (N'beslutningsgrunnlag', N'linje', 1),
  (N'beslutningsgrunnlag', N'sammenfall', 3), (N'beslutningsgrunnlag', N'varslingsplikt', 3),
  (N'virkning', N'standpunkt', 1), (N'virkning', N'virkning', 1),
  (N'standpunkt', N'id', 1), (N'standpunkt', N'art', 1), (N'standpunkt', N'gjelder', 1),
  (N'standpunkt', N'hjemmel', 1), (N'standpunkt', N'i_tide', 3), (N'standpunkt', N'resultat', 1),
  (N'standpunkt', N'oppfylt', 3),
  (N'utsagn', N'id', 1), (N'utsagn', N'art', 1), (N'utsagn', N'hjemmel', 1), (N'utsagn', N'gjelder', 1),
  (N'utsagn', N'regelversjon', 2), (N'utsagn', N'hva', 1), (N'utsagn', N'spor', 1),
  (N'opplysning', N'id', 1), (N'opplysning', N'hva', 1), (N'opplysning', N'dato', 1),
  (N'opplysning', N'gjelder', 1), (N'opplysning', N'oppfylt', 3);
GO
