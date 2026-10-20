-- Godkjenningskjeden avledet av hierarkiet i HR-kopien (S-1c del 3, #831).
--
-- GFK-U8: kjeden starter hos lederen til byggherrens saksbehandler og følger
-- `leder_oid` oppover, til og med den første med en grense som dekker verdien. Er
-- verdien ikke tallfestet, går den gjennom hele kjeden (vedtaket 23.09), og den
-- siste må dekke det som lar seg verdsette. Saksbehandlerens egen rolle er nok når
-- grensen dekker verdien, og ubegrenset dekker også det som ikke er tallfestet
-- (GFK-U4). GFK-U11: grensen er rollens, globalt for byggherren, og `koe.fullmakt`
-- og `koe_api.fullmakter` fjernes. Det finnes ingen reelle data.
--
-- Svarene 20.10 i #831: kopien er for gammel 24 timer etter `hentet`; saksbehandleren
-- og hver leder i kjeden må ha en rolle; GFK-U2 gjelder bare når driften ikke har
-- registrert noen roller; ved godkjenningen må bare den siste i kjeden fortsatt ha en
-- grense som dekker verdien. GFK-U10: kjeden fryses i stegene når pakken lages; kan
-- den ikke avledes, lages ingen pakke, og har godkjenneren mistet rollen, avvises
-- handlingen.
--
-- Kopien har én rad per bruker (#1003 punkt 1), og lederen slås opp i samme tenant.
-- En rad leses bare når tenanten fortsatt er godkjent og raden er fersk, så en tenant
-- som ikke lenger synkroniseres, gir ingen rolle etter 24 timer (#1003 punkt 2).

ALTER TABLE koe.godkjenningspakke ADD
  -- Verdien fullmakten ble regnet av (`Brevverdi` i `server/fullmakt.ts`). `NULL` er
  -- ikke tallfestet; da er gulvet det som lar seg verdsette.
  verdi_beloep decimal(15, 2) NULL,
  verdi_gulv decimal(15, 2) NOT NULL;
GO

ALTER TABLE koe.godkjenningspakke ADD CONSTRAINT godkjenningspakke_verdi
  CHECK (verdi_gulv >= 0 AND (verdi_beloep IS NULL OR verdi_beloep = verdi_gulv));
GO

DROP PROCEDURE koe_api.fullmakter;
DROP TABLE koe.fullmakt;
GO

-- Byggherrens dagmulktssats i prosjektet (GFK-U3). Bare byggherren ser den.
CREATE PROCEDURE koe_api.dagmulktssats
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Satsen leses bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  -- `oppretter` krever et kontraktsteam på siden i konteksten og utelukker lesere.
  SELECT sats FROM koe.dagmulktssats
   WHERE prosjekt_id = @prosjekt
     AND TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) = N'BH'
     AND EXISTS (SELECT 1 FROM koe_sikkerhet.oppretter(@prosjekt, TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)));
END
GO

-- Godkjennerne svaret må gjennom, i kjedens rekkefølge, for saksbehandleren i
-- konteksten. Tom liste når saksbehandlerens egen rolle dekker verdien. Kaster 52070
-- når driften ikke har registrert roller (GFK-U2), og 52071 når kjeden ikke kan
-- avledes (GFK-U10). Kalles også av `lag_godkjenningspakke`, så kjeden avledes ett sted.
CREATE PROCEDURE koe_api.godkjenningskjede
  @beloep decimal(15, 2), @gulv decimal(15, 2)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kjeden leses bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  IF TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) IS DISTINCT FROM N'BH'
     OR NOT EXISTS (SELECT 1 FROM koe_sikkerhet.oppretter(@prosjekt, @aktor))
    THROW 51403, N'Bare byggherrens saksbehandler har en godkjenningskjede', 1;
  IF @gulv IS NULL OR @gulv < 0 OR (@beloep IS NOT NULL AND @beloep <> @gulv)
    THROW 51422, N'Verdien er ugyldig', 1;
  IF NOT EXISTS (SELECT 1 FROM koe.rolle)
    THROW 52070, N'Driften har ikke registrert roller', 1;

  DECLARE @frist datetime2(3) = DATEADD(hour, -24, SYSUTCDATETIME());
  DECLARE @maal decimal(15, 2) = ISNULL(@beloep, @gulv);
  DECLARE @ledd TABLE (
    nivaa int NOT NULL PRIMARY KEY,
    bruker_id uniqueidentifier NOT NULL UNIQUE,
    tenant_id uniqueidentifier NOT NULL,
    leder_oid uniqueidentifier NULL,
    rolle nvarchar(100) NOT NULL,
    grense decimal(15, 2) NULL
  );
  -- Personen i kopien, når raden har rolle, er fersk og tenanten er godkjent.
  DECLARE @fersk TABLE (
    bruker_id uniqueidentifier NOT NULL PRIMARY KEY,
    tenant_id uniqueidentifier NOT NULL,
    oid uniqueidentifier NOT NULL,
    leder_oid uniqueidentifier NULL,
    rolle nvarchar(100) NOT NULL,
    grense decimal(15, 2) NULL
  );
  INSERT @fersk
  SELECT h.bruker_id, h.tenant_id, h.oid, h.leder_oid, h.rolle, r.grense
    FROM koe.hr_kopi h
    JOIN koe.rolle r ON r.rolle = h.rolle
    JOIN koe.entra_tenant t ON t.tenant_id = h.tenant_id
   WHERE h.hentet >= @frist;

  INSERT @ledd SELECT 0, bruker_id, tenant_id, leder_oid, rolle, grense FROM @fersk WHERE bruker_id = @aktor;
  IF @@ROWCOUNT = 0
    THROW 52071, N'Saksbehandleren har ingen rolle i en fersk HR-kopi', 1;

  DECLARE @n int = 0, @grense decimal(15, 2), @leder uniqueidentifier, @tenant uniqueidentifier;
  SELECT @grense = grense FROM @ledd WHERE nivaa = 0;
  IF NOT (@grense IS NULL OR (@beloep IS NOT NULL AND @beloep <= @grense))
  BEGIN
    WHILE 1 = 1
    BEGIN
      SELECT @leder = leder_oid, @tenant = tenant_id FROM @ledd WHERE nivaa = @n;
      IF @leder IS NULL
      BEGIN
        IF @beloep IS NULL AND @n > 0 AND (@grense IS NULL OR @gulv <= @grense)
          BREAK;
        THROW 52071, N'Ingen leder i kjeden har en grense som dekker verdien', 1;
      END
      IF EXISTS (SELECT 1 FROM @ledd l JOIN @fersk f ON f.bruker_id = l.bruker_id
                  WHERE f.tenant_id = @tenant AND f.oid = @leder)
        THROW 52071, N'Kjeden går i ring', 1;
      SET @n += 1;
      INSERT @ledd SELECT @n, bruker_id, tenant_id, leder_oid, rolle, grense
        FROM @fersk WHERE tenant_id = @tenant AND oid = @leder;
      IF @@ROWCOUNT = 0
        THROW 52071, N'En leder i kjeden har ingen rolle i en fersk HR-kopi', 1;
      SELECT @grense = grense FROM @ledd WHERE nivaa = @n;
      IF @beloep IS NOT NULL AND (@grense IS NULL OR @maal <= @grense)
        BREAK;
    END
  END

  SELECT nivaa AS steg, LOWER(CONVERT(nvarchar(36), bruker_id)) AS godkjenner_id, rolle, grense
    FROM @ledd WHERE nivaa >= 1 ORDER BY nivaa;
END
GO

-- Lager en pakke for svaret med verdien fullmakten ble regnet av. Prosjektet,
-- saksbehandleren, siden og teamet tas fra konteksten, og kjeden avledes og fryses her
-- (GFK-U8, GFK-U10).
CREATE OR ALTER PROCEDURE koe_api.lag_godkjenningspakke
  @pakke_id uniqueidentifier, @sak_id nvarchar(36), @forrige_pakke_id uniqueidentifier,
  @brev nvarchar(max), @fullmaktsgrunnlag nvarchar(max), @beloep decimal(15, 2), @gulv decimal(15, 2)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Pakken lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  DECLARE @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @team IS NULL
    THROW 51403, N'Uten entydig team lagres ingen godkjenningspakke', 1;
  IF TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) IS DISTINCT FROM N'BH'
    THROW 51403, N'Bare byggherren lager en godkjenningspakke', 1;
  IF NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  -- Låsen på saken i indeksen hindrer at to pakker lages samtidig. Den tas i en egen
  -- setning, så kontrollen etter leser det en samtidig pakke skrev, også med
  -- READ_COMMITTED_SNAPSHOT. Teamet ser bare sine egne pakker, så en åpen pakke i et
  -- annet team stopper ikke denne.
  DECLARE @laas int;
  SELECT @laas = COUNT(*) FROM koe.godkjenningspakke WITH (UPDLOCK, HOLDLOCK, INDEX (godkjenningspakke_sak_id))
   WHERE sak_id = @sak_id;
  IF EXISTS (
       SELECT 1 FROM koe.godkjenningspakke p
        WHERE p.sak_id = @sak_id
          AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                           WHERE h.pakke_id = p.pakke_id AND h.handling <> N'godkjent')
          AND EXISTS (SELECT 1 FROM koe.godkjenningssteg s
                       WHERE s.pakke_id = p.pakke_id AND NOT EXISTS (
                         SELECT 1 FROM koe.godkjenningshandling h
                          WHERE h.pakke_id = s.pakke_id AND h.steg = s.steg AND h.handling = N'godkjent')))
    THROW 51409, N'Teamet har en åpen pakke i saken', 1;
  IF @forrige_pakke_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM koe.godkjenningspakke WHERE forrige_pakke_id = @forrige_pakke_id)
    THROW 51409, N'Den forrige pakken er alt erstattet', 1;
  IF @forrige_pakke_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM koe.godkjenningspakke p
         JOIN koe.godkjenningshandling h ON h.pakke_id = p.pakke_id AND h.handling <> N'godkjent'
        WHERE p.pakke_id = @forrige_pakke_id AND p.sak_id = @sak_id)
    THROW 51409, N'Den forrige pakken er ikke returnert eller trukket i saken', 1;

  DECLARE @steg TABLE (
    steg int NOT NULL PRIMARY KEY,
    godkjenner_id nvarchar(36) NOT NULL,
    rolle nvarchar(100) NOT NULL,
    grense decimal(15, 2) NULL
  );
  INSERT @steg EXEC koe_api.godkjenningskjede @beloep, @gulv;
  IF NOT EXISTS (SELECT 1 FROM @steg)
    THROW 51422, N'Saksbehandlerens egen fullmakt dekker verdien, så en pakke trengs ikke', 1;

  INSERT koe.godkjenningspakke (pakke_id, prosjekt_id, sak_id, forrige_pakke_id, aktor_id, aktor_rolle,
                                aktor_team_id, brev, fullmaktsgrunnlag, verdi_beloep, verdi_gulv)
  VALUES (@pakke_id, @prosjekt, @sak_id, @forrige_pakke_id, @aktor, N'BH', @team, @brev, @fullmaktsgrunnlag,
          @beloep, @gulv);
  INSERT koe.godkjenningssteg (pakke_id, prosjekt_id, aktor_team_id, steg, godkjenner_id)
  SELECT @pakke_id, @prosjekt, @team, steg, CAST(godkjenner_id AS uniqueidentifier) FROM @steg;
END
GO

-- Registrerer en godkjenning, en retur eller en trekking. Godkjenningen og returen
-- gis av godkjenneren i det neste steget som ikke er godkjent. Alle i teamet som
-- utarbeidet svaret, kan trekke pakken, også når alle steg er godkjent (B-04 punkt 3).
-- En godkjenning krever en rolle i en fersk HR-kopi nå (B-04 punkt 1), og fryser
-- rollen og grensen. Den siste i kjeden må fortsatt ha en grense som dekker verdien
-- (svaret 20.10 i #831). Ellers avvises godkjenningen med 52072, og pakken lages på
-- nytt (GFK-U10).
CREATE OR ALTER PROCEDURE koe_api.registrer_godkjenningshandling
  @pakke_id uniqueidentifier, @handling nvarchar(20), @begrunnelse nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Handlingen lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  DECLARE @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @team IS NULL OR TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) IS DISTINCT FROM N'BH'
    THROW 51403, N'Ukjent pakke', 1;

  DECLARE @maal decimal(15, 2);
  SELECT @maal = ISNULL(verdi_beloep, verdi_gulv) FROM koe.godkjenningspakke WITH (UPDLOCK, HOLDLOCK)
   WHERE pakke_id = @pakke_id AND prosjekt_id = @prosjekt;
  IF @@ROWCOUNT = 0
    THROW 51403, N'Ukjent pakke', 1;
  IF EXISTS (SELECT 1 FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id AND handling <> N'godkjent')
    THROW 51409, N'Pakken er returnert eller trukket', 1;

  DECLARE @steg tinyint, @godkjenner uniqueidentifier;
  SELECT TOP (1) @steg = s.steg, @godkjenner = s.godkjenner_id
    FROM koe.godkjenningssteg s
   WHERE s.pakke_id = @pakke_id
     AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                      WHERE h.pakke_id = s.pakke_id AND h.steg = s.steg AND h.handling = N'godkjent')
   ORDER BY s.steg;

  DECLARE @tittel nvarchar(200), @grense decimal(15, 2), @ubegrenset bit;
  IF @handling = N'trukket'
    SET @steg = NULL;
  ELSE IF @handling IN (N'godkjent', N'returnert')
  BEGIN
    IF @steg IS NULL
      THROW 51409, N'Pakken er godkjent i alle steg', 1;
    IF @aktor IS DISTINCT FROM @godkjenner
      THROW 51403, N'Pakken venter ikke på deg', 1;
    IF @handling = N'godkjent'
    BEGIN
      SELECT @tittel = h.rolle, @grense = r.grense, @ubegrenset = IIF(r.grense IS NULL, 1, 0)
        FROM koe.hr_kopi h
        JOIN koe.rolle r ON r.rolle = h.rolle
        JOIN koe.entra_tenant t ON t.tenant_id = h.tenant_id
       WHERE h.bruker_id = @aktor AND h.hentet >= DATEADD(hour, -24, SYSUTCDATETIME());
      IF @tittel IS NULL
        THROW 52072, N'Du har ingen rolle i en fersk HR-kopi, så pakken må lages på nytt', 1;
      IF @ubegrenset = 0 AND @grense < @maal
         AND @steg = (SELECT MAX(steg) FROM koe.godkjenningssteg WHERE pakke_id = @pakke_id)
        THROW 52072, N'Grensen din dekker ikke lenger verdien, så pakken må lages på nytt', 1;
    END
  END
  ELSE
    THROW 51422, N'Ukjent handling', 1;

  INSERT koe.godkjenningshandling (pakke_id, loepenr, prosjekt_id, handling, steg, aktor_id, aktor_rolle,
                                   aktor_team_id, fullmakt_tittel, fullmakt_grense, fullmakt_ubegrenset, begrunnelse)
  SELECT @pakke_id, ISNULL(MAX(loepenr), 0) + 1, @prosjekt, @handling, @steg, @aktor, N'BH', @team,
         @tittel, @grense, @ubegrenset, @begrunnelse
    FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id;
END
GO

GRANT EXECUTE ON koe_api.dagmulktssats TO koe_runtime;
GRANT EXECUTE ON koe_api.godkjenningskjede TO koe_runtime;
GO
