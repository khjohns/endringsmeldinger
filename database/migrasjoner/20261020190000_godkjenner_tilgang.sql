-- Godkjenneren i kjeden når saken og pakken (S-1c del 3, #831).
--
-- GFK-U9: godkjenneren ser bare saken og pakken der hen står i kjeden, mens pakken er
-- åpen; etterpå bare sin egen handling; ingen interne notater. Lederne i kjeden er
-- ikke nødvendigvis medlem av prosjektet eller av teamet som laget pakken (GFK-U8), så
-- tilgangen følger stegene i pakken og ikke medlemskapet. En pakke er åpen når den
-- verken er returnert eller trukket, og minst ett steg ikke er godkjent, som i
-- `lag_godkjenningspakke`. Konteksten har aktøren og prosjektet, og ingen side eller
-- byggherresiden; entreprenørsiden slipper ikke gjennom.
--
-- Radsikkerheten gjelder ikke tabellene en predikatfunksjon leser, så predikatet ser
-- alle stegene og handlingene i pakken.
--
-- GFK-U10: når kjeden ikke kan avledes, eller driften ikke har registrert roller
-- (GFK-U2), har meldingen etter ` | ` prosjektet, brukeren og tenanten der kjeden
-- stoppet, så driften kan rette kopien eller rollene. `server/godkjenning.ts` deler
-- meldingen.

-- Aktøren i konteksten er godkjenner i et steg i den åpne pakken i prosjektet.
CREATE FUNCTION koe_sikkerhet.godkjenner(@prosjekt_id nvarchar(100), @pakke_id uniqueidentifier)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.godkjenningssteg s
  JOIN koe.projects p ON p.id = s.prosjekt_id AND p.is_active = 1
 WHERE s.pakke_id = @pakke_id
   AND s.prosjekt_id = @prosjekt_id
   AND s.prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(s.prosjekt_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND s.godkjenner_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID()
   AND (SESSION_CONTEXT(N'koe_side') IS NULL
        OR (TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) = N'BH'
            AND DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))) = 4))
   AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                    WHERE h.pakke_id = s.pakke_id AND h.handling <> N'godkjent')
   AND EXISTS (SELECT 1 FROM koe.godkjenningssteg u
                WHERE u.pakke_id = s.pakke_id
                  AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                                   WHERE h.pakke_id = u.pakke_id AND h.steg = u.steg AND h.handling = N'godkjent'));
GO

-- Pakken og stegene: teamet som laget pakken, og godkjenneren mens pakken er åpen.
CREATE FUNCTION koe_sikkerhet.pakke_synlig(
  @prosjekt_id nvarchar(100), @aktor_team_id nvarchar(32), @pakke_id uniqueidentifier)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.notat_synlig(@prosjekt_id, @aktor_team_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.godkjenner(@prosjekt_id, @pakke_id);
GO

-- Handlingene: som pakken, og godkjennerens egen handling også etter at pakken er lukket.
CREATE FUNCTION koe_sikkerhet.handling_synlig(
  @prosjekt_id nvarchar(100), @aktor_team_id nvarchar(32), @pakke_id uniqueidentifier,
  @aktor_id uniqueidentifier)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.pakke_synlig(@prosjekt_id, @aktor_team_id, @pakke_id)
UNION ALL
SELECT 1 AS tilgang
 WHERE @aktor_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND @prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(@prosjekt_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- En godkjenning eller retur fra godkjenneren i steget. Trekkingen er teamets.
CREATE FUNCTION koe_sikkerhet.handling_skriver(
  @prosjekt_id nvarchar(100), @pakke_id uniqueidentifier, @steg tinyint, @handling nvarchar(20),
  @aktor_id uniqueidentifier, @aktor_rolle nvarchar(2), @aktor_team_id nvarchar(32))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.skriver(@prosjekt_id, @aktor_id, @aktor_rolle, @aktor_team_id, 1)
UNION ALL
SELECT 1 AS tilgang
  FROM koe.godkjenningssteg s
  JOIN koe.projects p ON p.id = s.prosjekt_id AND p.is_active = 1
 WHERE s.pakke_id = @pakke_id
   AND s.steg = @steg
   AND s.godkjenner_id = @aktor_id
   AND s.aktor_team_id = @aktor_team_id
   AND s.prosjekt_id = @prosjekt_id
   AND s.prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(s.prosjekt_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND @aktor_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND @aktor_rolle = N'BH'
   AND @handling IN (N'godkjent', N'returnert')
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID()
   AND (SESSION_CONTEXT(N'koe_side') IS NULL
        OR (TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) = N'BH'
            AND DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))) = 4));
GO

-- Saken og journalen: medlemmene, og godkjenneren i en åpen pakke i saken.
CREATE FUNCTION koe_sikkerhet.sak_synlig(@prosjekt_id nvarchar(100), @sak_id nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.medlem(@prosjekt_id)
UNION ALL
SELECT g.tilgang
  FROM koe.godkjenningspakke p
 CROSS APPLY koe_sikkerhet.godkjenner(p.prosjekt_id, p.pakke_id) g
 WHERE p.sak_id = @sak_id
   AND DATALENGTH(p.sak_id) = DATALENGTH(@sak_id)
   AND p.prosjekt_id = @prosjekt_id;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  DROP FILTER PREDICATE ON koe.sak_metadata,
  DROP FILTER PREDICATE ON koe.hendelse,
  DROP FILTER PREDICATE ON koe.godkjenningspakke,
  DROP FILTER PREDICATE ON koe.godkjenningssteg,
  DROP FILTER PREDICATE ON koe.godkjenningshandling,
  DROP BLOCK PREDICATE ON koe.godkjenningshandling AFTER INSERT;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.sak_synlig(prosjekt_id, sak_id) ON koe.sak_metadata,
  ADD FILTER PREDICATE koe_sikkerhet.sak_synlig(prosjekt_id, sak_id) ON koe.hendelse,
  ADD FILTER PREDICATE koe_sikkerhet.pakke_synlig(prosjekt_id, aktor_team_id, pakke_id) ON koe.godkjenningspakke,
  ADD FILTER PREDICATE koe_sikkerhet.pakke_synlig(prosjekt_id, aktor_team_id, pakke_id) ON koe.godkjenningssteg,
  ADD FILTER PREDICATE koe_sikkerhet.handling_synlig(prosjekt_id, aktor_team_id, pakke_id, aktor_id)
    ON koe.godkjenningshandling,
  ADD BLOCK PREDICATE koe_sikkerhet.handling_skriver(prosjekt_id, pakke_id, steg, handling, aktor_id, aktor_rolle,
                                                     aktor_team_id) ON koe.godkjenningshandling AFTER INSERT;
GO

-- Som i `20261020171000_hierarki_kjede.sql`, med prosjektet, brukeren og tenanten der
-- kjeden stoppet i meldingen (GFK-U10).
CREATE OR ALTER PROCEDURE koe_api.godkjenningskjede
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
  DECLARE @melding nvarchar(2048);
  IF NOT EXISTS (SELECT 1 FROM koe.rolle)
  BEGIN
    SET @melding = CONCAT(N'Driften har ikke registrert roller | prosjekt=', @prosjekt, N'; bruker=',
                          LOWER(CONVERT(nvarchar(36), @aktor)));
    THROW 52070, @melding, 1;
  END

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
  BEGIN
    -- Tenanten fra kopien, også når raden er gammel eller uten rolle.
    SET @melding = CONCAT(N'Saksbehandleren har ingen rolle i en fersk HR-kopi | prosjekt=', @prosjekt,
                          N'; bruker=', LOWER(CONVERT(nvarchar(36), @aktor)), N'; tenant=',
                          (SELECT LOWER(CONVERT(nvarchar(36), tenant_id)) FROM koe.hr_kopi WHERE bruker_id = @aktor));
    THROW 52071, @melding, 1;
  END

  DECLARE @n int = 0, @grense decimal(15, 2), @leder uniqueidentifier, @tenant uniqueidentifier,
          @bruker uniqueidentifier;
  SELECT @grense = grense FROM @ledd WHERE nivaa = 0;
  IF NOT (@grense IS NULL OR (@beloep IS NOT NULL AND @beloep <= @grense))
  BEGIN
    WHILE 1 = 1
    BEGIN
      SELECT @leder = leder_oid, @tenant = tenant_id, @bruker = bruker_id FROM @ledd WHERE nivaa = @n;
      SET @melding = CONCAT(N' | prosjekt=', @prosjekt, N'; bruker=', LOWER(CONVERT(nvarchar(36), @bruker)),
                            N'; tenant=', LOWER(CONVERT(nvarchar(36), @tenant)), N'; leder_oid=',
                            LOWER(CONVERT(nvarchar(36), @leder)));
      IF @leder IS NULL
      BEGIN
        IF @beloep IS NULL AND @n > 0 AND (@grense IS NULL OR @gulv <= @grense)
          BREAK;
        SET @melding = CONCAT(N'Ingen leder i kjeden har en grense som dekker verdien', @melding);
        THROW 52071, @melding, 1;
      END
      IF EXISTS (SELECT 1 FROM @ledd l JOIN @fersk f ON f.bruker_id = l.bruker_id
                  WHERE f.tenant_id = @tenant AND f.oid = @leder)
      BEGIN
        SET @melding = CONCAT(N'Kjeden går i ring', @melding);
        THROW 52071, @melding, 1;
      END
      SET @n += 1;
      INSERT @ledd SELECT @n, bruker_id, tenant_id, leder_oid, rolle, grense
        FROM @fersk WHERE tenant_id = @tenant AND oid = @leder;
      IF @@ROWCOUNT = 0
      BEGIN
        SET @melding = CONCAT(N'En leder i kjeden har ingen rolle i en fersk HR-kopi', @melding);
        THROW 52071, @melding, 1;
      END
      SELECT @grense = grense FROM @ledd WHERE nivaa = @n;
      IF @beloep IS NOT NULL AND (@grense IS NULL OR @maal <= @grense)
        BREAK;
    END
  END

  SELECT nivaa AS steg, LOWER(CONVERT(nvarchar(36), bruker_id)) AS godkjenner_id, rolle, grense
    FROM @ledd WHERE nivaa >= 1 ORDER BY nivaa;
END
GO

-- Som i `20261020171000_hierarki_kjede.sql`. Kontrollene av den åpne og den forrige
-- pakken gjelder teamets pakker, ikke pakkene saksbehandleren ser som godkjenner i et
-- annet team.
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
  -- READ_COMMITTED_SNAPSHOT. En åpen pakke i et annet team stopper ikke denne.
  DECLARE @laas int;
  SELECT @laas = COUNT(*) FROM koe.godkjenningspakke WITH (UPDLOCK, HOLDLOCK, INDEX (godkjenningspakke_sak_id))
   WHERE sak_id = @sak_id;
  IF EXISTS (
       SELECT 1 FROM koe.godkjenningspakke p
        WHERE p.sak_id = @sak_id AND p.aktor_team_id = @team
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
        WHERE p.pakke_id = @forrige_pakke_id AND p.sak_id = @sak_id AND p.aktor_team_id = @team)
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

-- Som i `20261020171000_hierarki_kjede.sql`, men godkjenningen og returen krever ikke
-- teamet: godkjenneren i steget når pakken gjennom `koe_sikkerhet.godkjenner` (GFK-U9).
-- Handlingen lagres med pakkens team. Trekkingen krever fortsatt teamet som laget
-- pakken (B-04 punkt 3).
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
  DECLARE @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000));
  IF SESSION_CONTEXT(N'koe_side') IS NOT NULL AND (@side IS DISTINCT FROM N'BH' OR DATALENGTH(@side) <> 4)
    THROW 51403, N'Ukjent pakke', 1;

  DECLARE @maal decimal(15, 2), @pakketeam nvarchar(32);
  SELECT @maal = ISNULL(verdi_beloep, verdi_gulv), @pakketeam = aktor_team_id
    FROM koe.godkjenningspakke WITH (UPDLOCK, HOLDLOCK)
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
  BEGIN
    IF @side IS NULL OR @team IS NULL OR @team <> @pakketeam OR DATALENGTH(@team) <> DATALENGTH(@pakketeam)
      THROW 51403, N'Bare teamet som laget pakken, kan trekke den', 1;
    SET @steg = NULL;
  END
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
  SELECT @pakke_id, ISNULL(MAX(loepenr), 0) + 1, @prosjekt, @handling, @steg, @aktor, N'BH', @pakketeam,
         @tittel, @grense, @ubegrenset, @begrunnelse
    FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id;
END
GO
