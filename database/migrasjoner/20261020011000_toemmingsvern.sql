-- TRUNCATE avfyrer ingen trigger, men avvises (4712) for en tabell som en
-- fremmednøkkel viser til (#582). Fremmednøklene fra `koe.toemmingsvern` verner
-- de uforanderlige tabellene ingen annen fremmednøkkel viser til. Tabellen kan
-- ikke ha rader. `server/tester/journal.test.ts` prøver TRUNCATE mot hver
-- tabell med triggeren mot endring, og mot jobbene og vedleggene.

CREATE TABLE koe.toemmingsvern (
  app_identities_id uniqueidentifier NULL
    CONSTRAINT toemmingsvern_app_identities FOREIGN KEY REFERENCES koe.app_identities (id),
  brevdokument_id uniqueidentifier NULL
    CONSTRAINT toemmingsvern_brevdokument FOREIGN KEY REFERENCES koe.brevdokument (leveringsoppdrag_id),
  godkjenningshandling_pakke_id uniqueidentifier NULL,
  godkjenningshandling_loepenr int NULL,
  kvittering_prosjekt_id nvarchar(100) NULL
    CONSTRAINT toemmingsvern_kvittering_prosjekt_id_tegnklasse
      CHECK (NOT kvittering_prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  kvittering_aktor_id uniqueidentifier NULL,
  kvittering_kommando_id nvarchar(36) NULL
    CONSTRAINT toemmingsvern_kvittering_kommando_id_tegnklasse
      CHECK (NOT kvittering_kommando_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  leveringskvittering_oppdrag_id uniqueidentifier NULL,
  leveringskvittering_operasjon nvarchar(20) NULL
    CONSTRAINT toemmingsvern_leveringskvittering_operasjon_tegnklasse
      CHECK (NOT leveringskvittering_operasjon COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  prosjekt_med_saker_id nvarchar(100) NULL
    CONSTRAINT toemmingsvern_prosjekt_med_saker FOREIGN KEY REFERENCES koe.prosjekt_med_saker (prosjekt_id)
    CONSTRAINT toemmingsvern_prosjekt_med_saker_id_tegnklasse
      CHECK (NOT prosjekt_med_saker_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  sak_catenda_topic_sak_id nvarchar(36) NULL
    CONSTRAINT toemmingsvern_sak_catenda_topic FOREIGN KEY REFERENCES koe.sak_catenda_topic (sak_id)
    CONSTRAINT toemmingsvern_sak_catenda_topic_sak_id_tegnklasse
      CHECK (NOT sak_catenda_topic_sak_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  vedlegg_id uniqueidentifier NULL
    CONSTRAINT toemmingsvern_vedlegg FOREIGN KEY REFERENCES koe.vedlegg (vedlegg_id),
  CONSTRAINT toemmingsvern_godkjenningshandling FOREIGN KEY (godkjenningshandling_pakke_id, godkjenningshandling_loepenr)
    REFERENCES koe.godkjenningshandling (pakke_id, loepenr),
  CONSTRAINT toemmingsvern_kvittering FOREIGN KEY (kvittering_prosjekt_id, kvittering_aktor_id, kvittering_kommando_id)
    REFERENCES koe.kvittering (prosjekt_id, aktor_id, kommando_id),
  CONSTRAINT toemmingsvern_leveringskvittering FOREIGN KEY (leveringskvittering_oppdrag_id, leveringskvittering_operasjon)
    REFERENCES koe.leveringskvittering (leveringsoppdrag_id, operasjon),
  CONSTRAINT toemmingsvern_tom CHECK (1 = 0)
);
