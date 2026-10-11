-- Feilinnføring: den smale identitetsinngangen godtar et subjekt som ikke er
-- normalisert. Ventet rødt: identitet.test.ts.

CREATE OR ALTER PROCEDURE koe_api.catenda_identitet
  @subjekt nvarchar(400), @epost nvarchar(320), @navn nvarchar(400), @bruker uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  EXEC koe.resolve_identity N'catenda', N'https://api.catenda.com', @subjekt, @epost, @navn, @bruker OUTPUT;
END
GO
