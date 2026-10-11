-- Feilinnføring: vakten mot nye deler krever samme transaksjon, men ikke samme
-- skriving. En del lagt til etter kommandoen i samme transaksjon, eller i en
-- transaksjon som etter en omstart har samme ID, slipper gjennom. Ventet rødt:
-- «en del lagt til etter kommandoen i samme transaksjon» i lagring.test.ts.

CREATE OR ALTER TRIGGER form_a.svar_samme_transaksjon ON form_a.svar AFTER INSERT AS
BEGIN
  DECLARE @rader bigint = ROWCOUNT_BIG();
  SET NOCOUNT ON;
  IF @rader <> (SELECT COUNT_BIG(*) FROM inserted i WHERE EXISTS (SELECT 1 FROM form_a.hendelse f
       WHERE f.event_id = i.event_id AND f.prosjekt_id = i.prosjekt_id AND f.transaksjon = CURRENT_TRANSACTION_ID()))
    THROW 51002, N'En del kan ikke legges til et lagret brev', 1;
END
GO

CREATE OR ALTER TRIGGER form_b.svar_samme_transaksjon ON form_b.svar AFTER INSERT AS
BEGIN
  DECLARE @rader bigint = ROWCOUNT_BIG();
  SET NOCOUNT ON;
  IF @rader <> (SELECT COUNT_BIG(*) FROM inserted i WHERE EXISTS (SELECT 1 FROM form_b.dokument f
       WHERE f.event_id = i.event_id AND f.prosjekt_id = i.prosjekt_id AND f.transaksjon = CURRENT_TRANSACTION_ID()))
    THROW 51002, N'En del kan ikke legges til et lagret brev', 1;
END
GO
