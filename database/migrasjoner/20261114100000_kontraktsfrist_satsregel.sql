-- Satsregelen for fristtabellen står ett sted (#1883): `koe.satsen_passer` er både
-- kontrollen i tabellen og testen før 52078 i `koe_drift.sett_kontraktsfrist`. Den prøver
-- formen på grunnlaget først, fordi `=` ser bort fra mellomrom til slutt, og gir 0 når
-- en verdi i predikatet er NULL. Kontrollene `kontraktsfrist_satsgrunnlag` og
-- `kontraktsfrist_satsgrunnlag_form` er overflødige med den og fjernes.
-- Kolonnene fristtabellen leses med, står i `koe.kontraktsfristene`, som begge
-- lesingene bruker.

CREATE FUNCTION koe.satsen_passer(
  @dagmulktbelagt bit,
  @satsgrunnlag nvarchar(4000),
  @promille decimal(9, 4),
  @minstebeloep decimal(15, 2),
  @delens_verdi decimal(15, 2),
  @beloep_per_dag decimal(15, 2)
)
RETURNS bit WITH SCHEMABINDING AS
BEGIN
  IF @satsgrunnlag COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%' RETURN 0;
  IF (@satsgrunnlag IS NULL AND @promille IS NULL AND @minstebeloep IS NULL
        AND @delens_verdi IS NULL AND @beloep_per_dag IS NULL)
     OR (@dagmulktbelagt = 1 AND @satsgrunnlag = N'kontraktssum' AND @promille > 0
        AND @minstebeloep >= 0 AND @delens_verdi IS NULL AND @beloep_per_dag IS NULL)
     OR (@dagmulktbelagt = 1 AND @satsgrunnlag = N'delens_verdi' AND @promille > 0
        AND @minstebeloep >= 0 AND @delens_verdi > 0 AND @beloep_per_dag IS NULL)
     OR (@dagmulktbelagt = 1 AND @satsgrunnlag = N'fast_beloep' AND @promille IS NULL
        AND @minstebeloep IS NULL AND @delens_verdi IS NULL AND @beloep_per_dag > 0)
    RETURN 1;
  RETURN 0;
END
GO

ALTER TABLE koe.kontraktsfrist DROP CONSTRAINT kontraktsfrist_sats, kontraktsfrist_satsgrunnlag,
  kontraktsfrist_satsgrunnlag_form;
GO
ALTER TABLE koe.kontraktsfrist ADD CONSTRAINT kontraktsfrist_sats CHECK (
  koe.satsen_passer(dagmulktbelagt, satsgrunnlag, promille, minstebeloep, delens_verdi,
                    beloep_per_dag) = 1);
GO

CREATE FUNCTION koe.kontraktsfristene(@prosjekt nvarchar(4000))
RETURNS TABLE WITH SCHEMABINDING AS
RETURN
  SELECT frist_id, nummer, navn, CONVERT(nchar(10), dato, 23) AS dato, dagmulktbelagt, satsgrunnlag,
         promille, minstebeloep, delens_verdi, beloep_per_dag
    FROM koe.kontraktsfrist WHERE prosjekt_id = @prosjekt;
GO

ALTER PROCEDURE koe_drift.sett_kontraktsfrist
  @prosjekt nvarchar(4000),
  @frist_id int,
  @nummer nvarchar(4000),
  @navn nvarchar(4000),
  @dato date,
  @dagmulktbelagt bit,
  @satsgrunnlag nvarchar(4000),
  @promille decimal(9, 4),
  @minstebeloep decimal(15, 2),
  @delens_verdi decimal(15, 2),
  @beloep_per_dag decimal(15, 2)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF DATALENGTH(@navn) > 400 OR koe.navn_paa_en_linje(@navn) = 0
    THROW 52076, N'Fristens navn er tomt, over 200 tegn, har mellomrom i endene eller har kontrolltegn eller linjeskift', 1;
  IF @nummer IS NOT NULL AND (DATALENGTH(@nummer) > 40 OR koe.navn_paa_en_linje(@nummer) = 0)
    THROW 52082, N'Fristens nummer i kontrakten er tomt, over 20 tegn, har mellomrom i endene eller har kontrolltegn eller linjeskift', 1;
  IF @dato IS NULL OR @dagmulktbelagt IS NULL
    THROW 52077, N'Fristen mangler datoen eller om den er dagmulktbelagt', 1;
  IF koe.satsen_passer(@dagmulktbelagt, @satsgrunnlag, @promille, @minstebeloep, @delens_verdi,
                       @beloep_per_dag) = 0
    THROW 52078, N'Satsen passer ikke med grunnlaget, eller fristen er ikke dagmulktbelagt', 1;

  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.projects WITH (UPDLOCK, HOLDLOCK) WHERE id = @prosjekt)
    THROW 52073, N'Prosjektet er ikke registrert', 1;
  IF @frist_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM koe.kontraktsfrist WITH (UPDLOCK, HOLDLOCK)
                                          WHERE prosjekt_id = @prosjekt AND frist_id = @frist_id)
    THROW 52080, N'Prosjektet har ingen frist med den ID-en', 1;
  DECLARE @navnet_finnes bit = 0, @nummeret_finnes bit = 0;
  SELECT @navnet_finnes = MAX(IIF(navn = @navn, 1, 0)),
         @nummeret_finnes = MAX(IIF(nummer = @nummer, 1, 0))
    FROM koe.kontraktsfrist WITH (UPDLOCK, HOLDLOCK)
   WHERE prosjekt_id = @prosjekt AND (navn = @navn OR nummer = @nummer)
     AND frist_id IS DISTINCT FROM @frist_id;
  IF @navnet_finnes = 1
    THROW 52079, N'Prosjektet har alt en frist med det navnet', 1;
  IF @nummeret_finnes = 1
    THROW 52083, N'Prosjektet har alt en frist med det nummeret i kontrakten', 1;
  IF @frist_id IS NULL
  BEGIN
    SELECT @frist_id = ISNULL(MAX(frist_id), 0) + 1
      FROM koe.kontraktsfrist WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt;
    INSERT koe.kontraktsfrist (prosjekt_id, frist_id, nummer, navn, dato, dagmulktbelagt, satsgrunnlag,
                               promille, minstebeloep, delens_verdi, beloep_per_dag)
    VALUES (@prosjekt, @frist_id, @nummer, @navn, @dato, @dagmulktbelagt, @satsgrunnlag,
            @promille, @minstebeloep, @delens_verdi, @beloep_per_dag);
  END
  ELSE
  BEGIN
    UPDATE koe.kontraktsfrist
       SET nummer = @nummer, navn = @navn, dato = @dato, dagmulktbelagt = @dagmulktbelagt, satsgrunnlag = @satsgrunnlag,
           promille = @promille, minstebeloep = @minstebeloep, delens_verdi = @delens_verdi,
           beloep_per_dag = @beloep_per_dag
     WHERE prosjekt_id = @prosjekt AND frist_id = @frist_id;
  END
  COMMIT;
  SELECT @frist_id AS frist_id;
END
GO

ALTER PROCEDURE koe_drift.kontraktsfrister
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM koe.projects WHERE id = @prosjekt)
    THROW 52073, N'Prosjektet er ikke registrert', 1;
  SELECT kontraktssum FROM koe.kontraktssum WHERE prosjekt_id = @prosjekt;
  SELECT * FROM koe.kontraktsfristene(@prosjekt) ORDER BY frist_id;
END
GO

ALTER PROCEDURE koe_api.kontraktsfrister
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Fristene leses bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @leser bit = IIF(EXISTS (SELECT 1 FROM koe_sikkerhet.medlem(@prosjekt)), 1, 0);
  SELECT kontraktssum FROM koe.kontraktssum WHERE prosjekt_id = @prosjekt AND @leser = 1;
  SELECT * FROM koe.kontraktsfristene(@prosjekt) WHERE @leser = 1 ORDER BY frist_id;
END
GO
