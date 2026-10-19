-- «Tom» betyr én ting for kolonnene med tegnklassen eller en ID-form (#704): ingen
-- byte (`DATALENGTH(x) = 0`). `LEN` ser bort fra mellomrom til
-- slutt, så en verdi av bare mellomrom brøt «ikke tom»-skranken, og 547 bar navnet
-- på den i stedet for tegnklassen. Skrankene beholder navnene. Fritekstkolonnene
-- (`notat.tekst`, `fullmakt.tittel`, `jobb.tittel`) beholder `LEN`: der er en tekst
-- av bare mellomrom tom.
--
-- `koe.leveringskvittering.catenda_id` sendes tilbake til Catenda og får tegnklassen
-- i stedet for RTRIM-kontrollen, som bare stoppet U+0020 (#871).

ALTER TABLE koe.app_identities DROP CONSTRAINT app_identities_issuer;
ALTER TABLE koe.app_identities ADD CONSTRAINT app_identities_issuer CHECK (DATALENGTH(issuer) > 0);

ALTER TABLE koe.app_identities DROP CONSTRAINT app_identities_subject;
ALTER TABLE koe.app_identities ADD CONSTRAINT app_identities_subject CHECK (DATALENGTH(subject) > 0);

ALTER TABLE koe.projects DROP CONSTRAINT projects_id;
ALTER TABLE koe.projects ADD CONSTRAINT projects_id CHECK (DATALENGTH(id) > 0);

ALTER TABLE koe.projects DROP CONSTRAINT projects_organisasjon_id;
ALTER TABLE koe.projects ADD CONSTRAINT projects_organisasjon_id CHECK (DATALENGTH(organisasjon_id) > 0);

ALTER TABLE koe.sak_metadata DROP CONSTRAINT sak_metadata_sak_id;
ALTER TABLE koe.sak_metadata ADD CONSTRAINT sak_metadata_sak_id CHECK (DATALENGTH(sak_id) > 0);

ALTER TABLE koe.sak_metadata DROP CONSTRAINT sak_metadata_sakstype;
ALTER TABLE koe.sak_metadata ADD CONSTRAINT sak_metadata_sakstype CHECK (DATALENGTH(sakstype) > 0);

ALTER TABLE koe.hendelse DROP CONSTRAINT hendelse_event_type;
ALTER TABLE koe.hendelse ADD CONSTRAINT hendelse_event_type CHECK (DATALENGTH(event_type) > 0);

ALTER TABLE koe.leveringsoppdrag DROP CONSTRAINT leveringsoppdrag_dokumentnoekkel_ikke_tom;
ALTER TABLE koe.leveringsoppdrag ADD CONSTRAINT leveringsoppdrag_dokumentnoekkel_ikke_tom
  CHECK (DATALENGTH(dokumentnoekkel) > 0);

ALTER TABLE koe.sak_catenda_topic DROP CONSTRAINT sak_catenda_topic_board_ikke_tom;
ALTER TABLE koe.sak_catenda_topic ADD CONSTRAINT sak_catenda_topic_board_ikke_tom
  CHECK (DATALENGTH(catenda_board_id) > 0);

ALTER TABLE koe.sak_catenda_topic DROP CONSTRAINT sak_catenda_topic_topic_ikke_tom;
ALTER TABLE koe.sak_catenda_topic ADD CONSTRAINT sak_catenda_topic_topic_ikke_tom
  CHECK (DATALENGTH(catenda_topic_id) > 0);

ALTER TABLE koe.leveringskvittering DROP CONSTRAINT leveringskvittering_catenda_id_form;
ALTER TABLE koe.leveringskvittering ADD CONSTRAINT leveringskvittering_catenda_id_ikke_tom
  CHECK (DATALENGTH(catenda_id) > 0);
ALTER TABLE koe.leveringskvittering ADD CONSTRAINT leveringskvittering_catenda_id_tegnklasse
  CHECK (NOT catenda_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');
