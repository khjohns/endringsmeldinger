-- `koe.vedleggskvittering` (20261020020000_vedleggslevering.sql) kom etter tegnklassen
-- (#609) og tømmingsvernet (#582). Prosjektkolonnen får tegnklassen i stedet for
-- RTRIM-kontrollen, og `koe.toemmingsvern` får en fremmednøkkel til tabellen. Nøkkelen
-- tabellen har til seg selv, hindrer ikke TRUNCATE.

ALTER TABLE koe.vedleggskvittering DROP CONSTRAINT vedleggskvittering_prosjekt_id_uten_mellomrom;
ALTER TABLE koe.vedleggskvittering ADD CONSTRAINT vedleggskvittering_prosjekt_id_tegnklasse
  CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.toemmingsvern ADD
  vedleggskvittering_vedlegg_id uniqueidentifier NULL,
  vedleggskvittering_operasjon nvarchar(20) NULL
    CONSTRAINT toemmingsvern_vedleggskvittering_operasjon_tegnklasse
      CHECK (NOT vedleggskvittering_operasjon COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');
GO

ALTER TABLE koe.toemmingsvern ADD CONSTRAINT toemmingsvern_vedleggskvittering
  FOREIGN KEY (vedleggskvittering_vedlegg_id, vedleggskvittering_operasjon)
  REFERENCES koe.vedleggskvittering (vedlegg_id, operasjon);
