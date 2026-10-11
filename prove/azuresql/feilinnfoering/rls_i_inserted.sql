-- Feilinnføring: delvakten leser `inserted` med IF EXISTS, som RLS filtrerer.
-- Uten kontekst ser triggeren ingen rader og slipper delen gjennom. Ventet
-- rødt: «eieren kan ikke legge til et svar» i lagring.test.ts.

CREATE OR ALTER TRIGGER form_a.svar_samme_transaksjon ON form_a.svar AFTER INSERT AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM inserted i WHERE NOT EXISTS (
       SELECT 1 FROM form_a.hendelse f WHERE f.event_id = i.event_id AND f.prosjekt_id = i.prosjekt_id
          AND f.transaksjon = CURRENT_TRANSACTION_ID()))
    THROW 51002, N'En del kan ikke legges til et lagret brev', 1;
END
GO

CREATE OR ALTER TRIGGER form_b.svar_samme_transaksjon ON form_b.svar AFTER INSERT AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM inserted i WHERE NOT EXISTS (
       SELECT 1 FROM form_b.dokument f WHERE f.event_id = i.event_id AND f.prosjekt_id = i.prosjekt_id
          AND f.transaksjon = CURRENT_TRANSACTION_ID()))
    THROW 51002, N'En del kan ikke legges til et lagret brev', 1;
END
GO
