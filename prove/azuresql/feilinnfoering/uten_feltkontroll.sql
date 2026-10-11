-- Feilinnføring: form (b) kontrollerer ikke feltene mot registeret. Ventet
-- rødt: «innhold kjernen ikke kjenner» for form (b) i lagring.test.ts.

CREATE OR ALTER FUNCTION form_b.avvik(@slag nvarchar(4000), @verdi nvarchar(max))
RETURNS TABLE AS RETURN
SELECT CAST(NULL AS nvarchar(4000)) AS noekkel WHERE 1 = 0;
GO
