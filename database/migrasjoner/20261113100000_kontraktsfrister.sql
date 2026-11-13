-- Fristtabellen fra kontrakten og kontraktssummen per prosjekt (GFK-U16, GFK-U18,
-- #721), og tegnklassen for navnene på partene (#1408).
--
-- Driften registrerer opplysningene med driftsskriptet (`server/registrering.ts`)
-- etter skriftlig bestilling fra byggherren (GFK-U22). Kjøretiden kan ikke endre dem,
-- og begge parter leser dem (GFK-U23). Hver frist har et nummer i prosjektet som
-- tildeles her og ikke endres, så et krav kan vise til fristen. Navnet, datoen og
-- satsen kan rettes. En frist kan fjernes bare så lenge prosjektet ikke har saker; før
-- det kan nummeret til den siste fristen gis ut igjen.
-- Satsen i kroner regnes av serveren (`server/kontraktsfrister.ts`). Den erstatter
-- `koe.dagmulktssats`.

-- 1 når navnet står på én linje: ikke tomt, uten kontrolltegn eller linjeskift, og
-- uten mellomrom av noe slag i endene (#1408).
CREATE FUNCTION koe.navn_paa_en_linje(@navn nvarchar(4000))
RETURNS bit WITH SCHEMABINDING AS
BEGIN
  IF @navn IS NULL OR DATALENGTH(@navn) = 0 RETURN 0;
  IF @navn COLLATE Latin1_General_100_BIN2_UTF8 LIKE
       N'%[' + NCHAR(0) + N'-' + NCHAR(31) + NCHAR(127) + N'-' + NCHAR(159) + NCHAR(8232) + NCHAR(8233) + N']%'
    RETURN 0;
  DECLARE @mellomrom nvarchar(20) = N'[ ' + NCHAR(160) + NCHAR(5760) + NCHAR(8192) + N'-' + NCHAR(8205)
    + NCHAR(8239) + NCHAR(8287) + NCHAR(8288) + NCHAR(12288) + NCHAR(65279) + N']';
  IF LEFT(@navn, 1) COLLATE Latin1_General_100_BIN2_UTF8 LIKE @mellomrom
     OR RIGHT(@navn, 1) COLLATE Latin1_General_100_BIN2_UTF8 LIKE @mellomrom
    RETURN 0;
  RETURN 1;
END
GO

ALTER TABLE koe.kontraktsparter ADD
  CONSTRAINT kontraktsparter_byggherre_navn_en_linje CHECK (koe.navn_paa_en_linje(byggherre_navn) = 1),
  CONSTRAINT kontraktsparter_totalentreprenor_navn_en_linje CHECK (koe.navn_paa_en_linje(totalentreprenor_navn) = 1);
GO

-- Som i `20261104100000_sakskode.sql`, med tegnklassen for navnene.
CREATE OR ALTER PROCEDURE koe_drift.sett_kontraktsparter
  @prosjekt nvarchar(4000),
  @byggherre nvarchar(4000),
  @totalentreprenor nvarchar(4000),
  @kontraktsforkortelse nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  IF DATALENGTH(@byggherre) > 800 OR koe.navn_paa_en_linje(@byggherre) = 0
    THROW 52065, N'Byggherrens navn er tomt, for langt, har mellomrom i endene eller har kontrolltegn eller linjeskift', 1;
  IF DATALENGTH(@totalentreprenor) > 800 OR koe.navn_paa_en_linje(@totalentreprenor) = 0
    THROW 52065, N'Totalentreprenørens navn er tomt, for langt, har mellomrom i endene eller har kontrolltegn eller linjeskift', 1;
  IF @kontraktsforkortelse IS NULL OR DATALENGTH(@kontraktsforkortelse) = 0 OR DATALENGTH(@kontraktsforkortelse) > 40
     OR @kontraktsforkortelse COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^A-Z0-9]%'
    THROW 52074, N'Kontraktsforkortelsen er tom, over 20 tegn eller har andre tegn enn A–Z og 0–9', 1;

  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.projects WITH (UPDLOCK, HOLDLOCK) WHERE id = @prosjekt)
    THROW 52073, N'Prosjektet er ikke registrert', 1;
  IF EXISTS (SELECT 1 FROM koe.kontraktsparter WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)
    UPDATE koe.kontraktsparter
       SET byggherre_navn = @byggherre, totalentreprenor_navn = @totalentreprenor,
           kontraktsforkortelse = @kontraktsforkortelse
     WHERE prosjekt_id = @prosjekt;
  ELSE
    INSERT koe.kontraktsparter (prosjekt_id, byggherre_navn, totalentreprenor_navn, kontraktsforkortelse)
    VALUES (@prosjekt, @byggherre, @totalentreprenor, @kontraktsforkortelse);
  COMMIT;
END
GO

CREATE TABLE koe.kontraktssum (
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT kontraktssum_pk PRIMARY KEY
    CONSTRAINT kontraktssum_prosjekt FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT kontraktssum_prosjekt_id_tegnklasse
      CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  kontraktssum decimal(15, 2) NOT NULL CONSTRAINT kontraktssum_beloep CHECK (kontraktssum > 0)
);
GO

-- `satsgrunnlag` sier hva satsen regnes av: promillen av kontraktssummen (§ 40.3 a),
-- promillen av verdien av delen (§ 40.3 b), begge med minstebeløpet, eller et avtalt
-- fast beløp per dag (GFK-U16). Uten grunnlag mangler satsen (GFK-U3).
CREATE TABLE koe.kontraktsfrist (
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT kontraktsfrist_prosjekt FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT kontraktsfrist_prosjekt_id_tegnklasse
      CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  nummer int NOT NULL CONSTRAINT kontraktsfrist_nummer CHECK (nummer >= 1),
  navn nvarchar(200) NOT NULL CONSTRAINT kontraktsfrist_navn CHECK (koe.navn_paa_en_linje(navn) = 1),
  dato date NOT NULL,
  dagmulktbelagt bit NOT NULL,
  satsgrunnlag nvarchar(20) NULL CONSTRAINT kontraktsfrist_satsgrunnlag_form
    CHECK (NOT satsgrunnlag COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  promille decimal(9, 4) NULL CONSTRAINT kontraktsfrist_promille CHECK (promille > 0),
  minstebeloep decimal(15, 2) NULL CONSTRAINT kontraktsfrist_minstebeloep CHECK (minstebeloep >= 0),
  delens_verdi decimal(15, 2) NULL CONSTRAINT kontraktsfrist_delens_verdi CHECK (delens_verdi > 0),
  beloep_per_dag decimal(15, 2) NULL CONSTRAINT kontraktsfrist_beloep_per_dag CHECK (beloep_per_dag > 0),
  CONSTRAINT kontraktsfrist_pk PRIMARY KEY (prosjekt_id, nummer),
  CONSTRAINT kontraktsfrist_navn_unik UNIQUE (prosjekt_id, navn),
  CONSTRAINT kontraktsfrist_satsgrunnlag
    CHECK (satsgrunnlag IN (N'kontraktssum', N'delens_verdi', N'fast_beloep')),
  CONSTRAINT kontraktsfrist_sats CHECK (
    (satsgrunnlag IS NULL AND promille IS NULL AND minstebeloep IS NULL
       AND delens_verdi IS NULL AND beloep_per_dag IS NULL)
    OR (dagmulktbelagt = 1 AND satsgrunnlag = N'kontraktssum' AND promille IS NOT NULL
       AND minstebeloep IS NOT NULL AND delens_verdi IS NULL AND beloep_per_dag IS NULL)
    OR (dagmulktbelagt = 1 AND satsgrunnlag = N'delens_verdi' AND promille IS NOT NULL
       AND minstebeloep IS NOT NULL AND delens_verdi IS NOT NULL AND beloep_per_dag IS NULL)
    OR (dagmulktbelagt = 1 AND satsgrunnlag = N'fast_beloep' AND promille IS NULL
       AND minstebeloep IS NULL AND delens_verdi IS NULL AND beloep_per_dag IS NOT NULL))
);
GO

CREATE PROCEDURE koe_drift.sett_kontraktssum
  @prosjekt nvarchar(4000),
  @kontraktssum decimal(15, 2)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @kontraktssum IS NULL OR @kontraktssum <= 0
    THROW 52075, N'Kontraktssummen må være større enn 0', 1;
  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.projects WITH (UPDLOCK, HOLDLOCK) WHERE id = @prosjekt)
    THROW 52073, N'Prosjektet er ikke registrert', 1;
  IF EXISTS (SELECT 1 FROM koe.kontraktssum WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)
    UPDATE koe.kontraktssum SET kontraktssum = @kontraktssum WHERE prosjekt_id = @prosjekt;
  ELSE
    INSERT koe.kontraktssum (prosjekt_id, kontraktssum) VALUES (@prosjekt, @kontraktssum);
  COMMIT;
END
GO

-- Registrerer en ny frist når @nummer er NULL, og retter ellers fristen med det
-- nummeret. Gir nummeret.
CREATE PROCEDURE koe_drift.sett_kontraktsfrist
  @prosjekt nvarchar(4000),
  @nummer int,
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
  IF @dato IS NULL OR @dagmulktbelagt IS NULL
    THROW 52077, N'Fristen mangler datoen eller om den er dagmulktbelagt', 1;
  -- `=` ser bort fra mellomrom til slutt, så formen prøves først, som i tabellen.
  IF @satsgrunnlag COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'
    THROW 52078, N'Satsen passer ikke med grunnlaget, eller fristen er ikke dagmulktbelagt', 1;
  IF NOT (
    (@satsgrunnlag IS NULL AND @promille IS NULL AND @minstebeloep IS NULL
       AND @delens_verdi IS NULL AND @beloep_per_dag IS NULL)
    OR (@dagmulktbelagt = 1 AND @satsgrunnlag = N'kontraktssum' AND @promille > 0
       AND @minstebeloep >= 0 AND @delens_verdi IS NULL AND @beloep_per_dag IS NULL)
    OR (@dagmulktbelagt = 1 AND @satsgrunnlag = N'delens_verdi' AND @promille > 0
       AND @minstebeloep >= 0 AND @delens_verdi > 0 AND @beloep_per_dag IS NULL)
    OR (@dagmulktbelagt = 1 AND @satsgrunnlag = N'fast_beloep' AND @promille IS NULL
       AND @minstebeloep IS NULL AND @delens_verdi IS NULL AND @beloep_per_dag > 0))
    THROW 52078, N'Satsen passer ikke med grunnlaget, eller fristen er ikke dagmulktbelagt', 1;

  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.projects WITH (UPDLOCK, HOLDLOCK) WHERE id = @prosjekt)
    THROW 52073, N'Prosjektet er ikke registrert', 1;
  IF @nummer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM koe.kontraktsfrist WITH (UPDLOCK, HOLDLOCK)
                                          WHERE prosjekt_id = @prosjekt AND nummer = @nummer)
    THROW 52080, N'Prosjektet har ingen frist med det nummeret', 1;
  IF EXISTS (SELECT 1 FROM koe.kontraktsfrist WITH (UPDLOCK, HOLDLOCK)
              WHERE prosjekt_id = @prosjekt AND navn = @navn AND nummer IS DISTINCT FROM @nummer)
    THROW 52079, N'Prosjektet har alt en frist med det navnet', 1;
  IF @nummer IS NULL
  BEGIN
    SELECT @nummer = ISNULL(MAX(nummer), 0) + 1
      FROM koe.kontraktsfrist WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt;
    INSERT koe.kontraktsfrist (prosjekt_id, nummer, navn, dato, dagmulktbelagt, satsgrunnlag,
                               promille, minstebeloep, delens_verdi, beloep_per_dag)
    VALUES (@prosjekt, @nummer, @navn, @dato, @dagmulktbelagt, @satsgrunnlag,
            @promille, @minstebeloep, @delens_verdi, @beloep_per_dag);
  END
  ELSE
  BEGIN
    UPDATE koe.kontraktsfrist
       SET navn = @navn, dato = @dato, dagmulktbelagt = @dagmulktbelagt, satsgrunnlag = @satsgrunnlag,
           promille = @promille, minstebeloep = @minstebeloep, delens_verdi = @delens_verdi,
           beloep_per_dag = @beloep_per_dag
     WHERE prosjekt_id = @prosjekt AND nummer = @nummer;
  END
  COMMIT;
  SELECT @nummer AS nummer;
END
GO

-- Et krav kan vise til fristen når prosjektet har saker, så da fjernes den ikke.
CREATE PROCEDURE koe_drift.fjern_kontraktsfrist
  @prosjekt nvarchar(4000),
  @nummer int
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;
  IF EXISTS (SELECT 1 FROM koe.prosjekt_med_saker WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)
    THROW 52081, N'Prosjektet har saker, så fristen kan ikke fjernes', 1;
  DELETE koe.kontraktsfrist WHERE prosjekt_id = @prosjekt AND nummer = @nummer;
  IF @@ROWCOUNT = 0
    THROW 52080, N'Prosjektet har ingen frist med det nummeret', 1;
  COMMIT;
END
GO

-- Kontraktssummen og fristene, for driftsskriptet.
CREATE PROCEDURE koe_drift.kontraktsfrister
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM koe.projects WHERE id = @prosjekt)
    THROW 52073, N'Prosjektet er ikke registrert', 1;
  SELECT kontraktssum FROM koe.kontraktssum WHERE prosjekt_id = @prosjekt;
  SELECT nummer, navn, CONVERT(nchar(10), dato, 23) AS dato, dagmulktbelagt, satsgrunnlag, promille, minstebeloep,
         delens_verdi, beloep_per_dag
    FROM koe.kontraktsfrist WHERE prosjekt_id = @prosjekt ORDER BY nummer;
END
GO

-- Kontraktssummen og fristene i prosjektet i konteksten, for et medlem som kan lese
-- saker der: begge parter og leserollen (GFK-U23). Tabellene har ikke radsikkerhet,
-- fordi driften skal kunne endre dem uten kontekst, så `medlem` prøves her.
CREATE PROCEDURE koe_api.kontraktsfrister
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Fristene leses bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @leser bit = IIF(EXISTS (SELECT 1 FROM koe_sikkerhet.medlem(@prosjekt)), 1, 0);
  SELECT kontraktssum FROM koe.kontraktssum WHERE prosjekt_id = @prosjekt AND @leser = 1;
  SELECT nummer, navn, CONVERT(nchar(10), dato, 23) AS dato, dagmulktbelagt, satsgrunnlag, promille, minstebeloep,
         delens_verdi, beloep_per_dag
    FROM koe.kontraktsfrist WHERE prosjekt_id = @prosjekt AND @leser = 1 ORDER BY nummer;
END
GO

DROP PROCEDURE koe_api.dagmulktssats;
DROP TABLE koe.dagmulktssats;
GO

GRANT EXECUTE ON koe_drift.sett_kontraktssum TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.sett_kontraktsfrist TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.fjern_kontraktsfrist TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.kontraktsfrister TO koe_driftsrolle;
GRANT EXECUTE ON koe_api.kontraktsfrister TO koe_runtime;
