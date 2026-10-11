-- Kommandoene: den eneste veien runtime skriver (B-02 alternativ C). Runtime
-- har EXECUTE på `koe_api` og ingen skriverett på tabellene. Prosedyrene eies
-- av dbo, som tabellene, så eierskapskjeden gir dem tilgang uten at
-- runtime har den; det svarer til SECURITY DEFINER. Prosedyrene kaller
-- ingen dynamisk SQL, som ville brutt kjeden.
--
-- Feilkodene: 51000 kontekst utenfor transaksjon, 51403 ukjent sak (likt for
-- ingen tilgang, ukjent sak og sak i et annet prosjekt), 51409
-- versjonskonflikt, 51422 ugyldig argument, 51423 innhold form (b) ikke kan
-- lagre, 52022 subjekt som ikke er normalisert.

CREATE PROCEDURE koe_api.sett_kontekst
  @aktor nvarchar(36), @prosjekt nvarchar(100), @side nvarchar(2) = NULL, @team nvarchar(32) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 THROW 51000, N'Konteksten settes bare inne i en transaksjon', 1;
  DECLARE @tx bigint = CURRENT_TRANSACTION_ID();
  DECLARE @a uniqueidentifier = TRY_CAST(@aktor AS uniqueidentifier);
  DECLARE @s nvarchar(2) = CASE WHEN @side IN (N'TE', N'BH') THEN @side END;
  DECLARE @t nvarchar(32) = CASE WHEN DATALENGTH(@team) = 64 AND @team NOT LIKE N'%[^0-9a-f]%' THEN @team END;
  EXEC sp_set_session_context N'koe_aktor', @a;
  EXEC sp_set_session_context N'koe_prosjekt', @prosjekt;
  EXEC sp_set_session_context N'koe_side', @s;
  EXEC sp_set_session_context N'koe_team', @t;
  EXEC sp_set_session_context N'koe_tx', @tx;
END
GO

CREATE PROCEDURE koe_api.opprett_sak @sakstype nvarchar(40), @sak_id nvarchar(36) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 THROW 51000, N'Kommandoen kjøres bare inne i en transaksjon', 1;
  IF @sakstype IS NULL OR LEN(@sakstype) = 0 THROW 51422, N'Ugyldig argument', 1;
  DECLARE @prosjekt nvarchar(100), @aktor nvarchar(36);
  SELECT @prosjekt = prosjekt_id, @aktor = aktor_id FROM koe_sikkerhet.handlende();
  IF @prosjekt IS NULL THROW 51403, N'Ukjent sak', 1;
  -- Kommandoen lager ID-en, så en valgt ID ikke kan røpe en sak i et annet prosjekt (TM-11).
  SET @sak_id = LOWER(CONVERT(nvarchar(36), NEWID()));
  INSERT koe.sak_metadata (sak_id, prosjekt_id, sakstype, created_by) VALUES (@sak_id, @prosjekt, @sakstype, @aktor);
END
GO

-- (a) Dokumentet lagres som teksten serveren sendte, og de avledede
-- tabellene fylles av den samme teksten i samme transaksjon.
CREATE PROCEDURE koe_api.registrer_a
  @sak_id nvarchar(36), @forventet_versjon int, @event_id nvarchar(36), @event_type nvarchar(100),
  @tidsstempel datetimeoffset(3), @format int, @data nvarchar(max),
  @refererer_til_event_id nvarchar(36) = NULL, @oppdrag nvarchar(max) = NULL, @oppdrag_sha256 nvarchar(64) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 THROW 51000, N'Kommandoen kjøres bare inne i en transaksjon', 1;
  IF @sak_id IS NULL OR @forventet_versjon IS NULL OR @forventet_versjon < 0 OR @event_id IS NULL
     OR @event_type IS NULL OR @tidsstempel IS NULL OR @data IS NULL
     OR (@event_type = N'dokument_registrert' AND @oppdrag IS NULL)
     OR (@event_type <> N'dokument_registrert' AND @oppdrag IS NOT NULL)
    THROW 51422, N'Ugyldig argument', 1;
  DECLARE @prosjekt nvarchar(100), @aktor nvarchar(36), @side nvarchar(2), @team nvarchar(32);
  SELECT @prosjekt = prosjekt_id, @aktor = aktor_id, @side = side, @team = team_id FROM koe_sikkerhet.handlende();
  IF @prosjekt IS NULL OR NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  DECLARE @siste int = (SELECT MAX(versjon) FROM form_a.hendelse WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id);
  IF ISNULL(@siste, 0) <> @forventet_versjon THROW 51409, N'Versjonskonflikt', 1;

  INSERT form_a.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                          aktor_team_id, refererer_til_event_id, format, data, transaksjon)
  VALUES (@event_id, @sak_id, @prosjekt, @event_type, @forventet_versjon + 1, @tidsstempel, @aktor, @side,
          @team, @refererer_til_event_id, @format, @data, CURRENT_TRANSACTION_ID());

  INSERT form_a.krav (event_id, prosjekt_id, plass, id, spor, erstatter, beloep, dager)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.spor, j.erstatter, TRY_CAST(j.beloep AS float), TRY_CAST(j.dager AS int)
    FROM OPENJSON(JSON_QUERY(@data, N'$.krav')) e
   CROSS APPLY OPENJSON(CASE WHEN e.type = 5 THEN e.value END)
         WITH (id nvarchar(max), spor nvarchar(max), erstatter nvarchar(max), beloep nvarchar(max), dager nvarchar(max)) j;

  INSERT form_a.svar (event_id, prosjekt_id, plass, id, spor, gjelder, erstatter, regelversjon, sammenfall)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.spor, j.gjelder, j.erstatter, TRY_CAST(j.regelversjon AS int),
         CASE j.sammenfall WHEN N'true' THEN 1 WHEN N'false' THEN 0 END
    FROM OPENJSON(JSON_QUERY(@data, N'$.svar')) e
   CROSS APPLY OPENJSON(CASE WHEN e.type = 5 THEN e.value END)
         WITH (id nvarchar(max), spor nvarchar(max), gjelder nvarchar(max), erstatter nvarchar(max),
               regelversjon nvarchar(max) N'$.beslutningsgrunnlag.regelversjon',
               sammenfall nvarchar(max) N'$.beslutningsgrunnlag.sammenfall') j;

  INSERT form_a.utsagn (event_id, prosjekt_id, plass, id, art, gjelder, spor)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.art, j.gjelder, j.spor
    FROM OPENJSON(JSON_QUERY(@data, N'$.utsagn')) e
   CROSS APPLY OPENJSON(CASE WHEN e.type = 5 THEN e.value END)
         WITH (id nvarchar(max), art nvarchar(max), gjelder nvarchar(max), spor nvarchar(max)) j;

  IF @oppdrag IS NOT NULL
    INSERT form_a.leveringsoppdrag (event_id, prosjekt_id, innhold, innhold_sha256)
    VALUES (@event_id, @prosjekt, @oppdrag, @oppdrag_sha256);
END
GO

-- Feltene i ett objekt som form (b) ikke kan lagre: en ukjent nøkkel, en
-- annen JSON-type enn formatet har, `null`, eller en tom liste eller et tomt
-- objekt. Alle ville gått tapt eller endret seg uten feil ved gjenoppbyggingen.
CREATE FUNCTION form_b.avvik(@slag nvarchar(40), @verdi nvarchar(max))
RETURNS TABLE AS RETURN
SELECT o.[key] AS noekkel
  FROM OPENJSON(@verdi) o
  LEFT JOIN form_b.felt f ON f.slag = @slag AND f.noekkel = o.[key] COLLATE DATABASE_DEFAULT AND f.jsontype = o.type
 WHERE f.noekkel IS NULL
    OR (o.type IN (4, 5) AND NOT EXISTS (SELECT 1 FROM OPENJSON(o.value)));
GO

-- (b) Dokumentet deles i tabellene, som er kilden. Innhold uten kolonne
-- avvises før noe skrives. Leveringsdokumentet fryses i samme transaksjon.
CREATE PROCEDURE koe_api.registrer_b
  @sak_id nvarchar(36), @forventet_versjon int, @event_id nvarchar(36), @event_type nvarchar(100),
  @tidsstempel datetimeoffset(3), @format int, @data nvarchar(max),
  @refererer_til_event_id nvarchar(36) = NULL, @oppdrag nvarchar(max) = NULL, @oppdrag_sha256 nvarchar(64) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 THROW 51000, N'Kommandoen kjøres bare inne i en transaksjon', 1;
  IF @sak_id IS NULL OR @forventet_versjon IS NULL OR @forventet_versjon < 0 OR @event_id IS NULL
     OR @event_type IS NULL OR @tidsstempel IS NULL OR @data IS NULL
     OR (@event_type = N'dokument_registrert' AND @oppdrag IS NULL)
     OR (@event_type <> N'dokument_registrert' AND @oppdrag IS NOT NULL)
    THROW 51422, N'Ugyldig argument', 1;
  DECLARE @prosjekt nvarchar(100), @aktor nvarchar(36), @side nvarchar(2), @team nvarchar(32);
  SELECT @prosjekt = prosjekt_id, @aktor = aktor_id, @side = side, @team = team_id FROM koe_sikkerhet.handlende();
  IF @prosjekt IS NULL OR NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;

  DECLARE @hode nvarchar(40) =
    CASE @event_type WHEN N'sak_opprettet' THEN N'sak_opprettet' WHEN N'dokument_registrert' THEN N'dokument' END;
  IF @hode IS NULL OR ISJSON(@data, OBJECT) <> 1
    THROW 51423, N'Hendelsestypen eller innholdet har ingen plass i tabellene', 1;

  DECLARE @objekter TABLE (slag nvarchar(40) NOT NULL, verdi nvarchar(max) NOT NULL);
  DECLARE @elementer TABLE (forventet tinyint NOT NULL, type tinyint NOT NULL);
  INSERT @objekter VALUES (@hode, @data);
  IF @hode = N'dokument'
  BEGIN
    INSERT @elementer
    SELECT CASE WHEN t.[key] = N'dokumentasjon' THEN 1 ELSE 5 END, e.type
      FROM OPENJSON(@data) t CROSS APPLY OPENJSON(CASE WHEN t.type = 4 THEN t.value END) e;
    INSERT @objekter
    SELECT CASE t.[key] WHEN N'opplysninger' THEN N'opplysning' ELSE t.[key] END, e.value
      FROM OPENJSON(@data) t
     CROSS APPLY OPENJSON(CASE WHEN t.type = 4 AND t.[key] <> N'dokumentasjon' THEN t.value END) e
     WHERE e.type = 5;
    INSERT @elementer
    SELECT 5, e.type FROM @objekter x
     CROSS APPLY OPENJSON(CASE WHEN x.slag = N'svar' THEN JSON_QUERY(x.verdi, N'$.standpunkter') END) e;
    INSERT @objekter
    SELECT N'standpunkt', e.value FROM @objekter x
     CROSS APPLY OPENJSON(CASE WHEN x.slag = N'svar' THEN JSON_QUERY(x.verdi, N'$.standpunkter') END) e
     WHERE e.type = 5;
    INSERT @objekter
    SELECT N'utregning', JSON_QUERY(x.verdi, N'$.utregning') FROM @objekter x
     WHERE x.slag = N'svar' AND JSON_QUERY(x.verdi, N'$.utregning') IS NOT NULL;
    INSERT @objekter
    SELECT N'beslutningsgrunnlag', JSON_QUERY(x.verdi, N'$.beslutningsgrunnlag') FROM @objekter x
     WHERE x.slag = N'svar' AND JSON_QUERY(x.verdi, N'$.beslutningsgrunnlag') IS NOT NULL;
    INSERT @elementer
    SELECT 5, e.type FROM @objekter x
     CROSS APPLY OPENJSON(CASE WHEN x.slag = N'beslutningsgrunnlag' THEN JSON_QUERY(x.verdi, N'$.virkninger') END) e;
    INSERT @elementer
    SELECT 1, e.type FROM @objekter x
     CROSS APPLY OPENJSON(CASE WHEN x.slag = N'beslutningsgrunnlag' THEN JSON_QUERY(x.verdi, N'$.uten_virkning') END) e;
    INSERT @objekter
    SELECT N'virkning', e.value FROM @objekter x
     CROSS APPLY OPENJSON(CASE WHEN x.slag = N'beslutningsgrunnlag' THEN JSON_QUERY(x.verdi, N'$.virkninger') END) e
     WHERE e.type = 5;
  END
  IF EXISTS (SELECT 1 FROM @elementer WHERE type <> forventet)
     OR EXISTS (SELECT 1 FROM @objekter x CROSS APPLY form_b.avvik(x.slag, x.verdi))
    THROW 51423, N'Hendelsestypen eller innholdet har ingen plass i tabellene', 1;

  DECLARE @siste int = (SELECT MAX(versjon) FROM form_b.dokument WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id);
  IF ISNULL(@siste, 0) <> @forventet_versjon THROW 51409, N'Versjonskonflikt', 1;

  INSERT form_b.dokument (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                          aktor_team_id, refererer_til_event_id, format, transaksjon)
  VALUES (@event_id, @sak_id, @prosjekt, @event_type, @forventet_versjon + 1, @tidsstempel, @aktor, @side,
          @team, @refererer_til_event_id, @format, CURRENT_TRANSACTION_ID());

  IF @hode = N'sak_opprettet'
    INSERT form_b.sak_opprettet (event_id, prosjekt_id, sakstittel, sakstype)
    SELECT @event_id, @prosjekt, j.sakstittel, j.sakstype
      FROM OPENJSON(@data) WITH (sakstittel nvarchar(max), sakstype nvarchar(max)) j;

  INSERT form_b.krav (event_id, prosjekt_id, plass, id, spor, erstatter, hovedkategori, underkategori, tittel,
                      beskrivelse, metode, beloep, dager)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.spor, j.erstatter, j.hovedkategori, j.underkategori,
         j.tittel, j.beskrivelse, j.metode, j.beloep, j.dager
    FROM OPENJSON(JSON_QUERY(@data, N'$.krav')) e
   CROSS APPLY OPENJSON(e.value)
         WITH (id nvarchar(max), spor nvarchar(max), erstatter nvarchar(max), hovedkategori nvarchar(max),
               underkategori nvarchar(max), tittel nvarchar(max), beskrivelse nvarchar(max), metode nvarchar(max),
               beloep float, dager float) j;

  INSERT form_b.svar (event_id, prosjekt_id, plass, id, spor, gjelder, erstatter, utregning_resultat,
                      utregning_godkjent_beloep, utregning_godkjent_dager, utregning_subsidiaert_resultat,
                      utregning_subsidiaert_godkjent_dager, bg_regelversjon, bg_linje, bg_sammenfall,
                      bg_varslingsplikt, har_utregning, har_beslutningsgrunnlag)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.spor, j.gjelder, j.erstatter, j.u_resultat,
         j.u_beloep, j.u_dager, j.u_sub_resultat, j.u_sub_dager, j.bg_regelversjon, j.bg_linje, j.bg_sammenfall,
         j.bg_varslingsplikt, IIF(j.utregning IS NULL, 0, 1), IIF(j.bg IS NULL, 0, 1)
    FROM OPENJSON(JSON_QUERY(@data, N'$.svar')) e
   CROSS APPLY OPENJSON(e.value)
         WITH (id nvarchar(max), spor nvarchar(max), gjelder nvarchar(max), erstatter nvarchar(max),
               u_resultat nvarchar(max) N'$.utregning.resultat',
               u_beloep float N'$.utregning.godkjent_beloep',
               u_dager float N'$.utregning.godkjent_dager',
               u_sub_resultat nvarchar(max) N'$.utregning.subsidiaert_resultat',
               u_sub_dager float N'$.utregning.subsidiaert_godkjent_dager',
               bg_regelversjon float N'$.beslutningsgrunnlag.regelversjon',
               bg_linje nvarchar(max) N'$.beslutningsgrunnlag.linje',
               bg_sammenfall bit N'$.beslutningsgrunnlag.sammenfall',
               bg_varslingsplikt bit N'$.beslutningsgrunnlag.varslingsplikt',
               utregning nvarchar(max) N'$.utregning' AS JSON,
               bg nvarchar(max) N'$.beslutningsgrunnlag' AS JSON) j;

  INSERT form_b.standpunkt (event_id, prosjekt_id, svar_plass, plass, id, art, gjelder, hjemmel, i_tide, resultat, oppfylt)
  SELECT @event_id, @prosjekt, CAST(s.[key] AS int), CAST(e.[key] AS int), j.id, j.art, j.gjelder, j.hjemmel, j.i_tide,
         j.resultat, j.oppfylt
    FROM OPENJSON(JSON_QUERY(@data, N'$.svar')) s
   CROSS APPLY OPENJSON(JSON_QUERY(s.value, N'$.standpunkter')) e
   CROSS APPLY OPENJSON(e.value)
         WITH (id nvarchar(max), art nvarchar(max), gjelder nvarchar(max), hjemmel nvarchar(max), i_tide bit,
               resultat nvarchar(max), oppfylt bit) j;

  INSERT form_b.virkning (event_id, prosjekt_id, svar_plass, liste, plass, standpunkt, virkning)
  SELECT @event_id, @prosjekt, CAST(s.[key] AS int), N'virkninger', CAST(e.[key] AS int), j.standpunkt, j.virkning
    FROM OPENJSON(JSON_QUERY(@data, N'$.svar')) s
   CROSS APPLY OPENJSON(JSON_QUERY(s.value, N'$.beslutningsgrunnlag.virkninger')) e
   CROSS APPLY OPENJSON(e.value) WITH (standpunkt nvarchar(max), virkning nvarchar(max)) j
  UNION ALL
  SELECT @event_id, @prosjekt, CAST(s.[key] AS int), N'uten_virkning', CAST(e.[key] AS int), e.value, NULL
    FROM OPENJSON(JSON_QUERY(@data, N'$.svar')) s
   CROSS APPLY OPENJSON(JSON_QUERY(s.value, N'$.beslutningsgrunnlag.uten_virkning')) e;

  INSERT form_b.utsagn (event_id, prosjekt_id, plass, id, art, hjemmel, gjelder, regelversjon, hva, spor)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.art, j.hjemmel, j.gjelder, j.regelversjon, j.hva, j.spor
    FROM OPENJSON(JSON_QUERY(@data, N'$.utsagn')) e
   CROSS APPLY OPENJSON(e.value)
         WITH (id nvarchar(max), art nvarchar(max), hjemmel nvarchar(max), gjelder nvarchar(max),
               regelversjon float, hva nvarchar(max), spor nvarchar(max)) j;

  INSERT form_b.opplysning (event_id, prosjekt_id, plass, id, hva, dato, gjelder, oppfylt)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), j.id, j.hva, j.dato, j.gjelder, j.oppfylt
    FROM OPENJSON(JSON_QUERY(@data, N'$.opplysninger')) e
   CROSS APPLY OPENJSON(e.value)
         WITH (id nvarchar(max), hva nvarchar(max), dato nvarchar(max), gjelder nvarchar(max), oppfylt bit) j;

  INSERT form_b.dokumentasjon (event_id, prosjekt_id, plass, vedlegg)
  SELECT @event_id, @prosjekt, CAST(e.[key] AS int), e.value
    FROM OPENJSON(JSON_QUERY(@data, N'$.dokumentasjon')) e;

  IF @oppdrag IS NOT NULL
    INSERT form_b.leveringsdokument (event_id, prosjekt_id, innhold, innhold_sha256)
    VALUES (@event_id, @prosjekt, @oppdrag, @oppdrag_sha256);
END
GO

-- Notater (MS-05): serveren lager ID-en, og aktør, side, team og prosjekt
-- stemples fra konteksten. Ukjent sak, sak i et annet prosjekt og
-- manglende teamtilgang gir samme svar.
CREATE PROCEDURE koe_api.skriv_notat @sak_id nvarchar(36), @tekst nvarchar(max), @notat_id uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 THROW 51000, N'Kommandoen kjøres bare inne i en transaksjon', 1;
  IF @sak_id IS NULL OR @tekst IS NULL OR LEN(@tekst) = 0 THROW 51422, N'Ugyldig argument', 1;
  DECLARE @prosjekt nvarchar(100), @aktor nvarchar(36), @side nvarchar(2), @team nvarchar(32);
  SELECT @prosjekt = prosjekt_id, @aktor = aktor_id, @side = side, @team = team_id FROM koe_sikkerhet.handlende();
  IF @prosjekt IS NULL OR NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  SET @notat_id = NEWID();
  INSERT koe.notat (notat_id, sak_id, prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, tekst)
  VALUES (@notat_id, @sak_id, @prosjekt, @aktor, @side, @team, @tekst);
END
GO

-- Sletter bare eget notat, synlig for teamet. Andres notat, et ukjent notat og
-- et notat i et annet prosjekt gir 0 og slettes ikke.
CREATE PROCEDURE koe_api.slett_notat @notat_id uniqueidentifier, @slettet bit OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 THROW 51000, N'Kommandoen kjøres bare inne i en transaksjon', 1;
  DECLARE @aktor nvarchar(36) = (SELECT aktor_id FROM koe_sikkerhet.handlende());
  DELETE koe.notat WHERE notat_id = @notat_id AND aktor_id = @aktor;
  SET @slettet = IIF(@@ROWCOUNT = 1, 1, 0);
END
GO

-- Den generelle identitetsfunksjonen, som `koe_resolve_identity` i
-- PL/pgSQL. Runtime har ikke EXECUTE på den; innganger som den smale under
-- når den gjennom eierskapskjeden. UPDLOCK og HOLDLOCK låser nøkkelområdet,
-- så to samtidige kall med samme identitet gir én bruker.
CREATE PROCEDURE koe.resolve_identity
  @provider nvarchar(16), @issuer nvarchar(400), @subject nvarchar(400), @email nvarchar(320), @name nvarchar(400),
  @user_id uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;
  SET @user_id = (SELECT user_id FROM koe.app_identities WITH (UPDLOCK, HOLDLOCK)
                   WHERE provider = @provider AND issuer = @issuer AND subject = @subject);
  IF @user_id IS NULL
  BEGIN
    SET @user_id = NEWID();
    INSERT koe.app_users (id, email, name) VALUES (@user_id, ISNULL(@email, N''), ISNULL(@name, N''));
    INSERT koe.app_identities (id, user_id, provider, issuer, subject)
    VALUES (NEWID(), @user_id, @provider, @issuer, @subject);
  END
  ELSE
    UPDATE koe.app_users
       SET email = ISNULL(NULLIF(@email, N''), email), name = ISNULL(NULLIF(@name, N''), name)
     WHERE id = @user_id;
  COMMIT;
END
GO

-- Den smale inngangen for Catenda (RB2-05): provider og issuer er låst, og
-- subjektet må ha `catenda_id()`-formen, 32 små heksadesimale tegn.
CREATE PROCEDURE koe_api.catenda_identitet
  @subjekt nvarchar(400), @epost nvarchar(320), @navn nvarchar(400), @bruker uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  IF @subjekt IS NULL OR DATALENGTH(@subjekt) <> 64 OR @subjekt LIKE N'%[^0-9a-f]%'
    THROW 52022, N'Subjektet er ikke normalisert', 1;
  EXEC koe.resolve_identity N'catenda', N'https://api.catenda.com', @subjekt, @epost, @navn, @bruker OUTPUT;
END
GO
