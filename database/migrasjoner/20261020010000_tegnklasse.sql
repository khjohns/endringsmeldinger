-- Tegnklassen for ID- og nøkkelkolonnene (#609). Kontrollen mot mellomrom til
-- slutt fra `20261016130000_mellomrom.sql` og de senere tabellene stoppet bare
-- U+0020, så tabulator, NBSP, U+3000, U+200B og kontrolltegn ble lagret som en
-- andre verdiform. Kolonnene godtar nå bare synlige ASCII-tegn, U+0021 til
-- U+007E, prøvd med den binære sorteringen. Kolonnene som har en strengere form
-- (UUID, heksadesimal, `[a-z_]`), beholder den. Prosedyrene som prøver et
-- argument med RTRIM før skrivingen, er uendret: et annet tegn enn U+0020 gir 547
-- fra tabellen i stedet for prosedyrens egen feilkode, og et oppslag med et
-- annet tegn treffer ingen rad.

ALTER TABLE koe.app_identities DROP CONSTRAINT app_identities_issuer_uten_mellomrom;
ALTER TABLE koe.app_identities ADD CONSTRAINT app_identities_issuer_tegnklasse
  CHECK (NOT issuer COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.app_identities DROP CONSTRAINT app_identities_provider_uten_mellomrom;
ALTER TABLE koe.app_identities ADD CONSTRAINT app_identities_provider_tegnklasse
  CHECK (NOT provider COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.app_identities DROP CONSTRAINT app_identities_subject_uten_mellomrom;
ALTER TABLE koe.app_identities ADD CONSTRAINT app_identities_subject_tegnklasse
  CHECK (NOT subject COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.app_membership_absences DROP CONSTRAINT app_membership_absences_project_id_uten_mellomrom;
ALTER TABLE koe.app_membership_absences ADD CONSTRAINT app_membership_absences_project_id_tegnklasse
  CHECK (NOT project_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.app_membership_sync DROP CONSTRAINT app_membership_sync_project_id_uten_mellomrom;
ALTER TABLE koe.app_membership_sync ADD CONSTRAINT app_membership_sync_project_id_tegnklasse
  CHECK (NOT project_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.app_project_memberships DROP CONSTRAINT memberships_project_id_uten_mellomrom;
ALTER TABLE koe.app_project_memberships ADD CONSTRAINT memberships_project_id_tegnklasse
  CHECK (NOT project_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.app_project_memberships DROP CONSTRAINT memberships_role_uten_mellomrom;
ALTER TABLE koe.app_project_memberships ADD CONSTRAINT memberships_role_tegnklasse
  CHECK (NOT role COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.brevdokument DROP CONSTRAINT brevdokument_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.brevdokument ADD CONSTRAINT brevdokument_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.catenda_contract_teams DROP CONSTRAINT contract_teams_internal_project_id_uten_mellomrom;
ALTER TABLE koe.catenda_contract_teams ADD CONSTRAINT contract_teams_internal_project_id_tegnklasse
  CHECK (NOT internal_project_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.catenda_project_configs DROP CONSTRAINT catenda_project_configs_internal_project_id_uten_mellomrom;
ALTER TABLE koe.catenda_project_configs ADD CONSTRAINT catenda_project_configs_internal_project_id_tegnklasse
  CHECK (NOT internal_project_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.dagmulktssats DROP CONSTRAINT dagmulktssats_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.dagmulktssats ADD CONSTRAINT dagmulktssats_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.fullmakt DROP CONSTRAINT fullmakt_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.fullmakt ADD CONSTRAINT fullmakt_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.godkjenningshandling DROP CONSTRAINT godkjenningshandling_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.godkjenningshandling ADD CONSTRAINT godkjenningshandling_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.godkjenningspakke DROP CONSTRAINT godkjenningspakke_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.godkjenningspakke ADD CONSTRAINT godkjenningspakke_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.godkjenningspakke DROP CONSTRAINT godkjenningspakke_sak_id_uten_mellomrom;
ALTER TABLE koe.godkjenningspakke ADD CONSTRAINT godkjenningspakke_sak_id_tegnklasse
  CHECK (NOT sak_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.godkjenningssteg DROP CONSTRAINT godkjenningssteg_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.godkjenningssteg ADD CONSTRAINT godkjenningssteg_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.hendelse DROP CONSTRAINT hendelse_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.hendelse ADD CONSTRAINT hendelse_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.jobb DROP CONSTRAINT jobb_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.jobb ADD CONSTRAINT jobb_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.kjernebuffer DROP CONSTRAINT kjernebuffer_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.kjernebuffer ADD CONSTRAINT kjernebuffer_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.kvittering DROP CONSTRAINT kvittering_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.kvittering ADD CONSTRAINT kvittering_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.leveringskvittering DROP CONSTRAINT leveringskvittering_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.leveringskvittering ADD CONSTRAINT leveringskvittering_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.leveringsoppdrag DROP CONSTRAINT leveringsoppdrag_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.leveringsoppdrag ADD CONSTRAINT leveringsoppdrag_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.notat DROP CONSTRAINT notat_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.notat ADD CONSTRAINT notat_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.notat DROP CONSTRAINT notat_spor_uten_mellomrom;
ALTER TABLE koe.notat ADD CONSTRAINT notat_spor_tegnklasse
  CHECK (NOT spor COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.projects DROP CONSTRAINT projects_id_uten_mellomrom;
ALTER TABLE koe.projects ADD CONSTRAINT projects_id_tegnklasse
  CHECK (NOT id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.projects DROP CONSTRAINT projects_organisasjon_id_uten_mellomrom;
ALTER TABLE koe.projects ADD CONSTRAINT projects_organisasjon_id_tegnklasse
  CHECK (NOT organisasjon_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.prosjekt_med_saker DROP CONSTRAINT prosjekt_med_saker_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.prosjekt_med_saker ADD CONSTRAINT prosjekt_med_saker_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.sak_catenda_topic DROP CONSTRAINT sak_catenda_topic_topic_uten_mellomrom;
ALTER TABLE koe.sak_catenda_topic ADD CONSTRAINT sak_catenda_topic_topic_tegnklasse
  CHECK (NOT catenda_topic_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.sak_catenda_topic DROP CONSTRAINT sak_catenda_topic_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.sak_catenda_topic ADD CONSTRAINT sak_catenda_topic_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.sak_metadata DROP CONSTRAINT sak_metadata_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.sak_metadata ADD CONSTRAINT sak_metadata_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.vedlegg DROP CONSTRAINT vedlegg_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.vedlegg ADD CONSTRAINT vedlegg_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');
