"""Feilinnføringene for TS-serveren (skiva i #347, .claude/rules/tester.md).

Hver feilinnføring endrer ett sted i en kopi av arbeidstreet, kjører testene i
server/tester/ mot SQL Server og setter stedet tilbake. Hver testfil lager sin
egen base fra `database/migrasjoner/`. Kjør aldri mot arbeidstreet du committer fra:

    git worktree add /tmp/kopi HEAD && ln -s "$PWD/node_modules" /tmp/kopi/node_modules
    KOE_SQLSERVER_TILKOBLING=... python3 server/tester/feilinnfoering.py /tmp/kopi [S39 S40 ...]

Med ID-er etter stien kjøres bare de feilinnføringene, etter kontrollkjøringen.
Med `--ankre` i stedet for stien kontrolleres bare ankrene i arbeidstreet, uten base:

    python3 server/tester/feilinnfoering.py --ankre

Krever KOE_SQLSERVER_TILKOBLING (#658, #661). Lagringsgarantiene i basen har egne
tester i journal.test.ts og kommandoer.test.ts. Først
kjøres testene uten feilinnføring og må være grønne. En feilinnføring er
oppdaget når en test med det forventede navnet feiler. Skriptet feiler når en
feilinnføring overlever og ikke står i FORVENTET_OVERLEVER, eller når stedet
ikke finnes lenger, eller når prosedyren, funksjonen, triggeren eller visningen
i GO-satsen med ankeret defineres på nytt eller slettes senere i samme fil
eller i en senere migrasjon, eller tabellen triggeren står på, forsvinner
(#937, #967).
"""

import os
import re
import subprocess
import sys
from pathlib import Path

FEILINNFOERINGER = [
    ("S1", "kontraktsrollen kontrolleres ikke for en inngang som krever den", "server/app.ts",
     "krav === 'kreves'\n              ? krevKontraktsrolle", "false\n              ? krevKontraktsrolle",
     "kontraktsrollen"),
    ("S2", "CSRF kontrolleres ikke på en endring", "server/autorisasjon.ts",
     "!['GET', 'HEAD', 'OPTIONS'].includes(metode) &&", "false &&",
     "CSRF"),
    ("S3", "prosjektgrensen for saken i stien kontrolleres ikke", "server/autorisasjon.ts",
     "for (const sakId of saker) if (!iProsjektet.has(sakId)) throw ingenTilgang();", "void iProsjektet;",
     "mot en sak utenfor gir 403"),
    ("S4", "kommandoene kontrollerer ikke versjonen klienten så", "server/kommandoer.ts",
     "if (versjon !== forventet) throw new Versjonskonflikt(forventet, versjon);", "",
     "versjonskonflikt"),
    ("S5", "lesingen godtar en sak TS-kjernen ikke har skrevet", "server/lager.ts",
     "    if (!skrevetAvKjernen(journal))\n      throw", "    if (false)\n      throw",
     "ikke har skrevet"),
    ("S6", "ukjente felt i kroppen godtas", "server/saker.ts",
     "ukjenteFelt(kropp, KOMMANDOKROPP);\n  if (ukjent) return",
     "ukjenteFelt(kropp, KOMMANDOKROPP);\n  if (false) return",
     "kan ikke settes av klienten"),
    ("S7", "skrivingen godtar en sak TS-kjernen ikke har skrevet", "server/kommandoer.ts",
     "      if (!skrevetAvKjernen(journal))\n        throw", "      if (false)\n        throw",
     "ikke har skrevet"),
    ("S8", "aktøren tas fra kroppen når den er oppgitt", "server/saker.ts",
     "kontraktsfrister }) => {\n        const kjernekontekst = (t: Date, kode: Sakskode) => ({\n          sakId,\n          aktoerId: kontekst.aktor,",
     "kontraktsfrister }) => {\n        const kjernekontekst = (t: Date, kode: Sakskode) => ({\n          sakId,\n          aktoerId: (kropp.aktor_id as string) ?? kontekst.aktor,",
     "kan ikke settes av klienten"),
    ("S9", "summen regnes uten sorterte nøkler", "server/sjekksum.ts",
     "    return `{${Object.keys(verdi)\n      .sort()", "    return `{${Object.keys(verdi)",
     "sjekksummen"),
    ("S10", "tekst basen ikke kan lagre, slipper gjennom til basen", "server/app.ts",
     "if (typeof v === 'string' && ulagringsbarTekst(v))", "if (typeof v === 'string' && false)",
     "tekst basen ikke kan lagre"),
    ("S11", "dybdegrensen for kroppen mangler", "server/app.ts",
     "if (dybde > STORSTE_DYBDE) return", "if (false) return",
     "dypt nestet"),
    ("S12", "prosjektet i stien sammenliknes ikke med X-Project-ID", "server/autorisasjon.ts",
     "if ('prosjektId' in fraSti && fraSti.prosjektId !== prosjektId) throw ingenTilgang();",
     "void fraSti;",
     "et annet prosjekt i stien"),
    ("S13", "en sak uten leveringsmål gir 500, ikke en avvisning", "server/kommandoer.ts",
     "  if (feil instanceof IngenLeveringsmaal) {", "  if (false) {",
     "uten leveringsmål"),
    ("S14", "en sak opprettes uten topic-board (KT-U4)", "database/migrasjoner/20261116130000_opprettelse_med_kontraktsteamene.sql",
     "  IF @aktiv IS DISTINCT FROM 1 OR @board IS NULL\n    THROW 51412", "  IF @aktiv IS DISTINCT FROM 1\n    THROW 51412",
     "uten topic-board"),
    ("S15", "en utløpt lease kvitterer (invariant 7)", "database/migrasjoner/20261018120000_levering.sql",
     "WHERE lease = @lease AND lease_utloeper > @naa AND", "WHERE lease = @lease AND",
     "utløpt lease"),
    ("S16", "hentingen venter på en jobb en annen kjører har låst", "database/migrasjoner/20261119180000_korrelasjon_i_driftsloggen.sql",
     "      FROM koe.jobb j WITH (UPDLOCK, READPAST, ROWLOCK)",
     "      FROM koe.jobb j WITH (UPDLOCK, ROWLOCK)",
     "en annen kjører har låst"),
    ("S17", "et medlem kan skrive topicen utenom kjøreveien", "database/migrasjoner/20261018100000_jobber.sql",
     "  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer(prosjekt_id) ON koe.sak_catenda_topic AFTER INSERT;",
     "  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.sak_catenda_topic AFTER INSERT;",
     "et medlem kan ikke skrive topicen"),
    ("S18", "et usikkert utfall prøves igjen i stedet for å parkeres", "server/jobber.ts",
     "if (feil instanceof UsikkertCatendautfall)\n    return { utfall: avstemmes ? 'feilet' : 'usikkert', melding };",
     "if (feil instanceof UsikkertCatendautfall)\n    return { utfall: 'feilet', melding };",
     "et usikkert utfall parkeres"),
    ("S19", "en endret kobling parkerer ikke jobben (invariant 6)", "database/migrasjoner/20261119180000_korrelasjon_i_driftsloggen.sql",
     "(j.jobbtype = N'catenda_topic' AND c.topic_board_id = j.catenda_board_id)",
     "(j.jobbtype = N'catenda_topic')",
     "boardet er byttet"),
    ("S20", "leveringen hentes før saken har topic (LV-U9, #371)", "database/migrasjoner/20261119180000_korrelasjon_i_driftsloggen.sql",
     "       AND (j.jobbtype <> N'levering' OR EXISTS (SELECT 1 FROM koe.sak_catenda_topic t WHERE t.sak_id = j.sak_id))\n",
     "",
     "hentes ikke før saken har topic"),
    ("S21", "et bibliotek som er byttet, parkerer ikke leveringen (invariant 6)", "database/migrasjoner/20261119180000_korrelasjon_i_driftsloggen.sql",
     "               AND c.library_id = TRY_CAST(JSON_VALUE(o.innhold, '$.maal.library_id') AS uniqueidentifier)\n",
     "",
     "bibliotek som er byttet"),
    ("S22", "en varig avvisning prøves igjen i stedet for å parkeres (#778)", "database/migrasjoner/20261116120000_leveringen_parkeres_etter_forsoek.sql",
     "                      ELSE N'parkert'", "                      WHEN @utfall = N'usikkert' THEN N'parkert' ELSE N'venter'",
     "varig avvisning"),
    ("S23", "omstarten beholder antall forsøk, så backoffen ikke begynner forfra (#778)", "database/migrasjoner/20261020121000_oppretter_tid_og_oppdragsnoekkel.sql",
     "neste_forsoek = @naa, antall_forsoek = 0,", "neste_forsoek = @naa,",
     "driften starter jobben på nytt"),
    ("S24", "et kvittert dokument lastes opp på nytt (#371)", "server/jobber.ts",
     "let dokumentId = jobb.dokument_id;", "let dokumentId: string | null = null;",
     "laster ikke opp dokumentet på nytt"),
    ("S25", "referansen lages uten avstemming mot topicen (B-03)", "server/jobber.ts",
     "if (funnet) return funnet.id;", "if (false) return funnet!.id;",
     "lager ingen referanse til"),
    ("S26", "opplastingen tillater et dokument som finnes (B-03)", "server/catenda.ts",
     "failOnDocumentExists: true,", "failOnDocumentExists: false,",
     "failOnDocumentExists"),
    ("S27", "et nytt forsøk med samme kommando skriver et nytt brev (#418)", "server/kommandoer.ts",
     "if (kvittering) return { skriv: 'gjentatt'", "if (false) return { skriv: 'gjentatt'",
     "samme kommando to ganger gir ett brev"),
    ("S28", "et nytt forsøk med samme kommando oppretter en ny sak (#418)", "server/kommandoer.ts",
     "      if (kvittering)\n        return kvittertRad(", "      if (false)\n        return kvittertRad(",
     "for opprettelsen: et nytt forsøk med samme kommando gir samme sak"),
    ("S29", "samme kommando-ID med et annet innhold godtas (#418)", "database/migrasjoner/20261020110000_laasfeil.sql",
     "  IF @sum IS NOT NULL AND @sum <> @kommando_sha256", "  IF 1 = 0",
     "samme kommando-ID med et annet innhold avvises"),
    ("S30", "kvitteringen leses uten lås, så to samtidige forsøk skriver begge (#418)", "database/migrasjoner/20261020110000_laasfeil.sql",
     ("  EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', "
      "@LockOwner = 'Transaction', @LockTimeout = 10000;"),
     "  SET @laas = 0;",
     "to samtidige forsøk med samme kommando"),
    ("S31", "kvitteringen gjelder alle aktørene i prosjektet (#418)", "database/migrasjoner/20261020110000_laasfeil.sql",
     "WHERE k.prosjekt_id = @prosjekt AND k.aktor_id = @aktor AND", "WHERE k.prosjekt_id = @prosjekt AND",
     "kvitteringen gjelder aktøren"),
    ("S32", "tilbakerulling under COMMIT uten feil gir svaret (#543)", "server/datalag.ts",
     "    if (rulletTilbake)\n      return {\n        feil: new TransaksjonAvbrutt('Serveren rullet tilbake transaksjonen under COMMIT.'),",
     "    if (false)\n      return {\n        feil: new TransaksjonAvbrutt('Serveren rullet tilbake transaksjonen under COMMIT.'),",
     "tilbakerulling under COMMIT uten feil"),
    ("S33", "PDF-en utelater siste linje på hver side (#371, LV-U2)", "server/brevpdf.ts",
     "      side.drawText(l.tekst,", "      if (y > MARG + stoerrelse * LINJEHOEYDE) side.drawText(l.tekst,",
     "gjengir en tekst over flere sider tro"),
    ("S34", "basen godtar en PDF med feil sum (#371)", "database/migrasjoner/20261018140000_brevdokument.sql",
     "CONSTRAINT brevdokument_sum CHECK (pdf_sha256 =", "CONSTRAINT brevdokument_sum CHECK (1 = 1 OR pdf_sha256 =",
     "basen avviser en PDF med feil sum"),
    ("S35", "et nytt forsøk lagrer en ny PDF for oppdraget (#371)", "database/migrasjoner/20261020020000_vedleggslevering.sql",
     "     AND NOT EXISTS (SELECT 1 FROM koe.brevdokument WITH (UPDLOCK, HOLDLOCK) WHERE leveringsoppdrag_id = @oppdrag)\n",
     "",
     "bare én gang per oppdrag"),
    ("S36", "et registrert brev med vedlegg får ingen leveringsjobb (LV-U11, V-3)", "database/migrasjoner/20261020060000_vedleggslevering_innstramming.sql",
     "\n      OR EXISTS (SELECT 1 FROM koe.brevets_vedlegg(i.innhold));", ";",
     "et registrert brev blir ikke et eget dokument, men vedlegget leveres til topicen"),
    ("S37", "en uventet lokal feil prøves igjen i det uendelige (#783 punkt 2)", "server/jobber.ts",
     "return { utfall: endringBedt ? 'usikkert' : 'avvist', melding };", "return { utfall: 'feilet', melding };",
     "L10: en uventet lokal feil"),
    ("S38", "et ord som er delt over to linjer, leses som to ord (#371, LV-U2)", "server/brevpdf.ts",
     "ut.push({ tekst: rest.slice(0, n).join(''), delt: true });",
     "ut.push({ tekst: rest.slice(0, n).join(''), delt: false });",
     "gjengir et ord som er lengre enn linjen"),
    ("S39", "skrivetransaksjonen får ikke prosjektet i konteksten (#739)", "server/datalag.ts",
     "         EXEC sp_set_session_context N'koe_prosjekt', @prosjekt, @read_only = 1;\n", "",
     "journalen har sak_opprettet som versjon 1"),
    ("S40", "versjonen leses uten UPDLOCK og HOLDLOCK (#739)", "database/migrasjoner/20261104100000_sakskode.sql",
     "FROM koe.hendelse WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id", "FROM koe.hendelse WHERE sak_id = @sak_id",
     "ventingen på låsen tar det over"),
    ("S41", "triggeren mot endring av leveringsoppdraget mangler (#739)", "database/migrasjoner/20261016100000_journal.sql",
     ("CREATE TRIGGER koe.leveringsoppdrag_uforanderlig ON koe.leveringsoppdrag INSTEAD OF UPDATE, DELETE AS\n"
      "BEGIN\n  SET NOCOUNT ON;\n  THROW 51001, N'Et lagret leveringsoppdrag endres ikke', 1;\nEND\nGO\n"), "",
     "aktiv INSTEAD OF-trigger for UPDATE og DELETE"),
    ("S42", "identiteten settes tilbake før tilbakerullingen i somJobbkjoerer (#922)", "server/tester/testbase.ts",
     "BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK; REVERT; THROW; END CATCH;",
     "BEGIN CATCH REVERT; IF XACT_STATE() <> 0 ROLLBACK; THROW; END CATCH;",
     "en setning som feiler, gir den egentlige feilen"),
    ("S43", "identiteten settes ikke tilbake etter et tidsavbrudd i somJobbkjoerer (#813)", "server/tester/testbase.ts",
     "\n  WHILE USER_NAME() <> N'dbo' AND @n < 32 BEGIN REVERT; SET @n += 1; END;", "",
     "en setning som avbrytes av et tidsavbrudd"),
    ("S44", "ruteren kontrollerer ikke lesingen for en inngang som krever den (DL-U15)", "server/app.ts",
     "krav === 'lesing'\n                ? krevLesing", "false\n                ? krevLesing",
     "et medlem uten kontraktsteam og uten leserolle"),
    ("S45", "et teamoppslag som feiler, gir ingen side i stedet for 503 (DL-U15)", "server/autorisasjon.ts",
     "  } catch {\n    throw new Nektet(503, 'CONTRACT_ACCESS_UNAVAILABLE'",
     "  } catch {\n    return null;\n    throw new Nektet(503, 'CONTRACT_ACCESS_UNAVAILABLE'",
     "svarer ikke Catenda om teamet"),
    ("S46", "søket i tegntabellen går glipp av det siste intervallet (#801)", "kjerne/format/skjema.ts",
     "let til = SETTBARE_TEGN.length / 2 - 1;", "let til = SETTBARE_TEGN.length / 2 - 2;",
     "kjernen og `skriftFor` for hver brevskrift er enige om hvert kodepunkt"),
    ("S47", "tegntabellen i kjernen har glidd fra skriftene (#801)", "kjerne/format/tegnsett.ts",
     "  0x2190, 0x2300,", "  0x2191, 0x2300,",
     "tabellen i kjernen er den `node server/tegnsett.ts` lager"),
    ("S48", "søket i tegntabellen avviser det siste kodepunktet i hvert intervall (#801)", "kjerne/format/skjema.ts",
     "else if (kode > SETTBARE_TEGN[2 * midt + 1])", "else if (kode >= SETTBARE_TEGN[2 * midt + 1])",
     "kjernen og `skriftFor` for hver brevskrift er enige om hvert kodepunkt"),
    ("S49", "tegntabellen tar med skrift fra høyre mot venstre, som PDF-en setter baklengs (#801)", "server/tegnsett.ts",
     "if (HOEYRE_MOT_VENSTRE.test(tegn) || SKILLETEGN.test(tegn))", "if (SKILLETEGN.test(tegn))",
     "tabellen i kjernen er den `node server/tegnsett.ts` lager"),
    ("S50", "PDF-en setter ligaturer og oppdelinger fra GSUB, som ikke leses tilbake tro (#801)", "server/brevpdf.ts",
     "{ subset: s.delmengde, features: UTEN_SUBSTITUSJON }", "{ subset: s.delmengde }",
     "hvert tegn kjernen godtar, kommer tilbake fra PDF-en"),
    ("S51", "tegntabellen tar med kodepunkter som deler glyf med et annet (#801)", "server/tegnsett.ts",
     "const ut = kodepunkterMedDeltGlyf();", "const ut = new Set<number>();",
     "tabellen i kjernen er den `node server/tegnsett.ts` lager"),
    ("S52", "partsnavnene leses for en aktør uten medlemskap i prosjektet (#1398)",
     "database/migrasjoner/20261104100000_sakskode.sql",
     "WHERE k.prosjekt_id = @prosjekt AND m.user_id = @aktor AND m.active = 1;",
     "WHERE k.prosjekt_id = @prosjekt AND m.active = 1;",
     "navnene leses bare for en aktør med aktivt medlemskap"),
    ("S53", "partsnavnene leses med et inaktivt medlemskap (#1398)",
     "database/migrasjoner/20261104100000_sakskode.sql",
     "WHERE k.prosjekt_id = @prosjekt AND m.user_id = @aktor AND m.active = 1;",
     "WHERE k.prosjekt_id = @prosjekt AND m.user_id = @aktor;",
     "navnene leses bare for en aktør med aktivt medlemskap"),
    ("S54", "prosjektet gir ikke partsnavnene videre til visningen (#1398)", "server/prosjekter.ts",
     "return [200, prosjektet(rad, parter.recordset[0])];", "return [200, prosjektet(rad)];",
     "prosjektet har navnene på byggherren og totalentreprenøren"),
    ("S55", "saken med påberopelsen skriver to kvitteringer for kommandoen (#1487)",
     "database/migrasjoner/20261116130000_opprettelse_med_kontraktsteamene.sql",
     "  IF @fra_klienten = 0\n    INSERT koe.kvittering", "  IF 1 = 1\n    INSERT koe.kvittering",
     "TE oppretter saken med klientens ID"),
    ("S56", "saken opprettes selv om kjernen avviser påberopelsen (KT-U11)", "server/kommandoer.ts",
     "        if (!utfall.skriv) return new Tilbakerulling(utfall);\n        // Etter `lag`",
     "        if (false) return new Tilbakerulling(utfall);\n        // Etter `lag`",
     "avviser kjernen påberopelsen"),
    ("S57", "et nytt forsøk med samme kommando oppretter saken på nytt (#418, #1487)", "server/kommandoer.ts",
     "        if (kvittering)\n          return {\n            skriv: 'gjentatt',",
     "        if (false)\n          return {\n            skriv: 'gjentatt',",
     "samme kommando-ID med samme innhold gir samme svar uten ny sak"),
    ("S58", "summen for den nye saken utelater saks-ID-en (#418, #1487)", "server/saker.ts",
     "      rute: 'ny_sak',\n      ny_sak_id: sakId,\n", "      rute: 'ny_sak',\n",
     "samme kommando-ID med samme innhold gir samme svar uten ny sak"),
    ("S59", "ukjente felt i kroppen for den nye saken godtas (#1487)", "src/lib/kontroll/nysak.ts",
     "ukjenteFeltmelding(kropp, NY_SAK);\n  if (ukjente) return",
     "ukjenteFeltmelding(kropp, NY_SAK);\n  if (false) return",
     "avviser et ukjent felt med 400"),
    ("S60", "en tittel med mellomrom i kanten blir to verdier, trimmet i saken og ikke i påberopelsen (LV-U43, #1487)", "src/lib/kontroll/nysak.ts",
     "  if (tittel !== tittel.trim())\n    return", "  if (false)\n    return",
     "avviser en tittel med mellomrom i kanten med 400"),
    ("S61", "et dokument i varselet som ikke står ved påberopelsen, godtas (VS-U38, svar 2 i #1487)", "src/lib/kontroll/nysak.ts",
     "    if (utenfor.length)\n      return `Dokumentet", "    if (false)\n      return `Dokumentet",
     "et dokument i varselet som ikke står ved påberopelsen"),
    ("S62", "flyttingen sletter ikke vedlegget uten sak, så det finnes to steder (#1037)",
     "database/migrasjoner/20261102130000_vedlegg_foer_saken.sql",
     "  DELETE v FROM koe.vedlegg_uten_sak v JOIN @valgt s ON s.vedlegg_id = v.vedlegg_id;\n", "",
     "flytter vedlegget inn i saken med samme ID"),
    ("S63", "varselet etter punkt 32.2 i opprettelsen skrives ikke (VS-U38, D-8)", "server/kommandoer.ts",
     "        if (utfall.varsel) {", "        if (false) {",
     "flytter vedlegget inn i saken med samme ID"),
    ("S65", "summen for den nye saken utelater varselet (#418, VS-U38)", "server/saker.ts",
     "      brevtekst,\n      varsel,\n    }),", "      brevtekst,\n    }),",
     "flytter vedlegget inn i saken med samme ID"),
    ("S64", "slettingen av et vedlegg uten sak sletter ingenting (#1037)",
     "database/migrasjoner/20261102130000_vedlegg_foer_saken.sql",
     "  DELETE koe.vedlegg_uten_sak WHERE vedlegg_id = @vedlegg_id;", "  DELETE koe.vedlegg_uten_sak WHERE 1 = 0;",
     "TE sletter et vedlegg uten sak"),
    ("S66", "ruteren slipper BH gjennom til vedleggene for en ny sak, og leser filen før avvisningen (KT-U10, #815 punkt 1)",
     "server/app.ts",
     "    if (r.bareTE !== undefined && f.side?.rolle !== 'TE')", "    if (false)",
     "BH avvises før kroppen leses"),
    ("S67", "skrivingen godtar et løpenummer som ikke er det neste for koden (LV-U46, #1497)",
     "database/migrasjoner/20261104100000_sakskode.sql",
     "    IF @loepenummer <> @neste\n", "    IF 1 = 0\n",
     "et løpenummer som ikke er det neste for koden, avvises"),
    ("S68", "et registrert brev gir saken en kode (LV-U47, #1497)",
     "database/migrasjoner/20261104100000_sakskode.sql",
     "    WHEN @event_type = N'dokument_registrert' AND JSON_PATH_EXISTS(@data, N'$.brevtekst') = 1\n",
     "    WHEN @event_type = N'dokument_registrert'\n",
     "registrert korrespondanse gir ikke saken en kode"),
    ("S69", "byggherrens første brev gir saken KOE (LV-U44, #1497)",
     "database/migrasjoner/20261104100000_sakskode.sql",
     "  DECLARE @kode nvarchar(3) = IIF(@side = N'TE', N'koe', N'eo');\n  DECLARE @foerste_brev",
     "  DECLARE @kode nvarchar(3) = N'koe';\n  DECLARE @foerste_brev",
     "byggherrens første brev gir saken EO"),
    ("S70", "serveren gir ikke løpenummeret til skrivingen av sakens første brev (LV-U46, #1497)",
     "server/kommandoer.ts",
     "  return !sakskode.tildelt &&", "  return false &&",
     "TEs første brev fra løsningen gir saken KOE"),
    ("S71", "sakslisten gir ikke koden videre (LV-U47, #1497)", "server/saksliste.ts",
     "    kode: sak.sakskode?.kode ?? null,", "    kode: null,",
     "sakslisten gir koden og løpenummeret videre"),
    ("S72", "prosjektet gir ikke kontraktsforkortelsen videre (N1, #1497)", "server/prosjekter.ts",
     "          kontraktsforkortelse: parter.kontraktsforkortelse,\n", "",
     "kontraktsforkortelsen i settings.contract"),
    ("S73", "løpenummeret i merkingen får ikke tre sifre (LV-U48, #1497)", "kjerne/frosset/brevtittel.ts",
     "    utfylt(s.loepenummer, 3),", "    utfylt(s.loepenummer, 2),",
     "blir K201-KOE-005-03"),
    ("S74", "et prosjekt uten kontraktsforkortelse merker brevet uten den (S2 A, #1497)", "server/levering.ts",
     "  if (typeof merking !== 'string' || !merking)\n    throw new KontraktsforkortelseMangler(",
     "  if (false)\n    throw new KontraktsforkortelseMangler(",
     "KONTRAKTSFORKORTELSE_MANGLER"),
    ("S75", "hodet viser ikke merkingen som Vår ref. (LV-U27, #1497)", "server/levering.ts",
     "    `Vår ref.: ${brev.merking}`,", "    'Vår ref.:',",
     "merkingen og dokumentnøkkelen i navnet"),
    ("S76", "leseinngangen sier at nummeret ikke er tildelt etter sakens første brev (LV-U46, #1497)",
     "server/saker.ts",
     "  { success: true, kode, loepenummer, tildelt, kontraktsforkortelse, klokka_i_basen: klokkaIBasen },",
     "  { success: true, kode, loepenummer, tildelt: false, kontraktsforkortelse, klokka_i_basen: klokkaIBasen },",
     "brevkontrollen leser nummeret sakens første brev vil få"),
    ("S77", "BH får nummeret for en ny sak (KT-U10, #1497)", "server/saker.ts",
     "  bareTE: 'Du er på byggherrens side. En ny sak opprettes av totalentreprenøren.',\n", "",
     "BH får ikke nummeret for en ny sak"),
    ("S78", "varselet i en ny sak kan ikke ha korrespondansetypen (LV-U42, D1 A i #1497)", "src/lib/kontroll/nysak.ts",
     "  'korrespondansetype',\n  'sendemaate',", "  'sendemaate',",
     "binder det til påberopelsen og skriver varselet som versjon 3"),
    ("S79", "brevskriften setter et tegn med delt glyf, så myk bindestrek leses som bindestrek (#1658)",
     "server/brevpdf.ts",
     "return (perBrev ? alle.find((k) => k === kode || brukte.has(k)) : alle[0]) === kode;", "return true;",
     "gjengir myk bindestrek, bindestrek, hardt mellomrom og → ≥ ≤ № tro med brevskriften sourceSerif4"),
    ("S80", "prøven av myk bindestrek setter glyfen i instansen PDF-en bruker (#1658)", "server/brevpdf.ts",
     "return medBindestrek(data);", "return proeve;",
     "gjengir myk bindestrek, bindestrek, hardt mellomrom og → ≥ ≤ № tro med brevskriften sourceSerif4"),
    ("S81", "totalentreprenørens brev settes i Oslo Sans (#1658, LV-U58)", "server/brevpdf.ts",
     "{ BH: 'osloSans', TE: 'sourceSerif4' }", "{ BH: 'osloSans', TE: 'osloSans' }",
     "setter totalentreprenørens brev i Source Serif 4"),
    ("S82", "brevet har en annen linjehøyde enn forhåndsvisningen (#1658)", "server/brevpdf.ts",
     "const LINJEHOEYDE = 1.6;", "const LINJEHOEYDE = 1.4;",
     "setter byggherrens brev i Oslo Sans i 11 pt med linjehøyde 1,6"),
    ("S83", "brevskriften velger tegnet med delt glyf uten å se på brevet, så apostrofen settes med Noto Sans (#1661)",
     "server/brevpdf.ts",
     "return (perBrev ? alle.find((k) => k === kode || brukte.has(k)) : alle[0]) === kode;",
     "return alle[0] === kode;",
     "setter apostrofen og enkle anførselstegn med Source Serif 4"),
    ("S84", "byggherrens brev får ikke Oslo kommunes logo (#1177, LV-U25, LV-U26)", "server/brevpdf.ts",
     "{ BH: true, TE: false }", "{ BH: false, TE: false }",
     "setter Oslo kommunes logo fra pakken i byggherrens brev"),
    ("S85", "totalentreprenørens brev får Oslo kommunes logo (#1177, LV-U25)", "server/brevpdf.ts",
     "{ BH: true, TE: false }", "{ BH: true, TE: true }",
     "setter ingen logo i totalentreprenørens brev"),
    ("S86", "logoen fylles med nonzero, ikke evenodd som i SVG-en (#1177)", "server/brevpdf.ts",
     "? PDFOperator.of(PDFOperatorNames.FillEvenOdd)", "? op",
     "setter Oslo kommunes logo fra pakken i byggherrens brev"),
    ("S87", "en brevtekst uten formen i formatet gir et brev uten dokument (#926)", "server/levering.ts",
     "if (brevtekst === null && rad.data.brevtekst !== undefined)", "if (false)",
     "en brevtekst uten formen i formatet avvises"),
    ("S88", "PDF-en lages selv om skriften eller logoen er endret siden brevet ble sendt (#1177, LV-U26)",
     "server/levering.ts",
     "if (!sammeBrevprofil(brev.brevprofil, brev.avsender.part))", "if (!brev.brevprofil)",
     "lager ikke PDF-en når en fil har en annen sum enn den brevet ble sendt med"),
    ("S89", "brevprofilen fryser ikke logoen (#1177, LV-U26)", "server/brevpdf.ts",
     "...(MED_LOGO[avsender] ? [logo()] : [])", "...([] as Logo[])",
     "byggherrens profil har Oslo Sans, reserveskriftene og logoen fra pakken"),
    ("S90", "oppdraget fryser ikke brevprofilen (#1177, LV-U26)", "server/levering.ts",
     "brevprofil: merket ? brevprofil(rad.aktor_rolle) : null,", "brevprofil: null,",
     "et brev med brevtekst får dokumentet med merkingen"),
    ("S91", "Oslo Sans bygges inn som delmengde, som poppler ikke kan lese (#1670)", "server/brevpdf.ts",
     "    delmengde: false,", "    delmengde: true,",
     "byggherrens brev har Oslo Sans som OpenType med like mange glyfer"),
    ("S92", "delmengden av en TrueType-skrift fyller ikke en glyf med odde lengde (#1672)",
     "server/brevpdf.ts", "      if (glyf.length % 2) {", "      if (false) {",
     "tar med hver glyf fra en TrueType-delmengde"),
    ("S93", "sakslisten ser ikke varselet etter punkt 34.4 som står alene (VS-U48, #1663)",
     "kjerne/utledning/visning.ts",
     " || u.spor[spor].kravpostvarsler.length > 0;", ";",
     "varselet etter punkt 34.4 som står alene"),
    ("S94", "Oslo Sans bygges inn i formen for TrueType (#1689)", "server/brevpdf.ts",
     "    if (innbygd[i] && !s.delmengde && erOpenTypeMedCff(s.bytes)) somOpenTypeMedCff(pdf, innbygd[i]);",
     "    void s;",
     "byggherrens brev har Oslo Sans som CIDFontType0 med OpenType i FontFile3"),
    ("S95", "CIDFontType0 beholder CIDToGIDMap (#1689)", "server/brevpdf.ts",
     "  cid.delete(navn('CIDToGIDMap'));", "",
     "byggherrens brev har Oslo Sans som CIDFontType0 med OpenType i FontFile3"),
    ("S96", "OpenType-programmet står i FontFile3 uten /Subtype /OpenType (#1689)", "server/brevpdf.ts",
     "  pdf.context.lookup(program, PDFStream).dict.set(navn('Subtype'), navn('OpenType'));", "",
     "byggherrens brev har Oslo Sans som CIDFontType0 med OpenType i FontFile3"),
    ("S97", "TrueType-skriftene skrives også om til OpenType (#1689)", "server/brevpdf.ts",
     "innbygd[i] && !s.delmengde && erOpenTypeMedCff(s.bytes)", "innbygd[i]",
     "totalentreprenørens brev har bare TrueType-skrifter"),
    ("S98", "radene før brevet kvitteres under handlingens ID (VS-U53, KT-U5)", "server/kommandoer.ts",
     "const id = neste ? radensKommandoId(kommando.id, nr) : kommando.id;",
     "const id = neste ? kommando.id : kommando.id;",
     "varselet og kravet skrives som to versjoner i samme handling"),
    ("S99", "serveren skriver ikke raden etter i handlingen (VS-U53)", "server/kommandoer.ts",
     "        if (!neste) return utfall;", "        if (neste || !neste) return utfall;",
     "varselet og kravet skrives som to versjoner i samme handling"),
    ("S100", "en avvist senere rad rulles ikke tilbake med radene før (VS-U53)", "server/kommandoer.ts",
     "        if (!utfall.skriv) return new Tilbakerulling(utfall);\n        const { rad, oppdrag, neste }",
     "        if (!utfall.skriv) return nr > 1 ? utfall : new Tilbakerulling(utfall);\n        const { rad, oppdrag, neste }",
     "avvises en senere rad i handlingen, rulles også radene før tilbake"),
    ("S101", "satsen av promillen tar ikke minstebeløpet (GFK-U16)", "server/kontraktsfrister.ts",
     "return Math.max(promilleAv(grunnlag, s.promille), s.minstebeloep);",
     "return promilleAv(grunnlag, s.promille);",
     "satsen er minstebeløpet når promillen av kontraktssummen er lavere"),
    ("S102", "satsen for en delfrist regnes av kontraktssummen (GFK-U18)", "server/kontraktsfrister.ts",
     "const grunnlag = s.grunnlag === 'delens_verdi' ? s.delensVerdi : kontraktssum;",
     "const grunnlag = kontraktssum;",
     "satsen for en delfrist regnes av verdien av delen"),
    ("S103", "fristtabellen leses uten at aktøren kan lese saker i prosjektet (GFK-U23)",
     "database/migrasjoner/20261114100000_kontraktsfrist_satsregel.sql",
     "DECLARE @leser bit = IIF(EXISTS (SELECT 1 FROM koe_sikkerhet.medlem(@prosjekt)), 1, 0);",
     "DECLARE @leser bit = 1;",
     "leser ingenting"),
    ("S104", "en frist fjernes også når prosjektet har saker (#721)",
     "database/migrasjoner/20261113100000_kontraktsfrister.sql",
     "  IF EXISTS (SELECT 1 FROM koe.prosjekt_med_saker WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)\n    THROW 52081",
     "  IF 1 = 0\n    THROW 52081",
     "fjerner en frist bare så lenge prosjektet ikke har saker"),
    ("S105", "et navn med kontrolltegn eller linjeskift godtas (#1408)",
     "database/migrasjoner/20261113100000_kontraktsfrister.sql",
     "  IF @navn COLLATE Latin1_General_100_BIN2_UTF8 LIKE",
     "  IF 1 = 0 AND @navn COLLATE Latin1_General_100_BIN2_UTF8 LIKE",
     "avviser kontrolltegn, linjeskift og mellomrom"),
    ("S106", "kontraktens nummer på fristen er ikke unikt i tabellen (KA-U79)",
     "database/migrasjoner/20261113100000_kontraktsfrister.sql",
     "CREATE UNIQUE INDEX kontraktsfrist_nummer_unik ON koe.kontraktsfrist (prosjekt_id, nummer)",
     "CREATE INDEX kontraktsfrist_nummer_unik ON koe.kontraktsfrist (prosjekt_id, nummer)",
     "kontraktsfrister registrerer fristene med ID"),
    ("S107", "sakslisten gir et fristsvar uten dager delvis godkjent (svar 2 A i #1745)",
     "kjerne/spor/frist/visning.ts",
     "  if (resultater.every((r) => r === 'avslaatt')) return 'avslaatt';\n", "",
     "avslått når ingen frist har fått dager"),
    ("S108", "sakslisten teller fristene med noen dager som godkjent (svar 2 A i #1745)",
     "kjerne/spor/frist/visning.ts",
     "antall_godkjent: resultater.filter((r) => r === 'godkjent').length,",
     "antall_godkjent: resultater.filter((r) => r !== 'avslaatt').length,",
     "delvis godkjent når ingen frist har fått alle dagene"),
    ("S109", "fullmakten ganger satsen med kalenderdagene, ikke hverdagene (GFK-U17)",
     "server/fullmakt.ts",
     "verdi: oere(g.sats * hverdager),", "verdi: oere(g.sats * dager),",
     "GFK-U21: dagene for hver frist verdsettes"),
    ("S111", "dager for en frist som ikke er dagmulktbelagt, verdsettes med satsen (GFK-U20)",
     "server/fullmakt.ts",
     "  if (!g.dagmulktbelagt) return", "  if (false) return",
     "GFK-U20: dager for en frist som ikke er dagmulktbelagt"),
    ("S112", "satsregelen godtar et grunnlag med mellomrom til slutt (#1883)",
     "database/migrasjoner/20261114100000_kontraktsfrist_satsregel.sql",
     "  IF @satsgrunnlag COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%' RETURN 0;\n", "",
     "kontraktsfrister avviser en sats som ikke passer"),
    ("S113", "fristtabellen godtar et navn som finnes, når nummeret er nytt (#1883)",
     "database/migrasjoner/20261114100000_kontraktsfrist_satsregel.sql",
     "  IF @navnet_finnes = 1\n", "  IF @navnet_finnes = 1 AND 1 = 0\n",
     "kontraktsfrister avviser en sats som ikke passer"),
    ("S114", "fristtabellen gis uten kontraktsteam eller leserolle (GFK-U25, DL-U15)",
     "server/kontraktsfrister.ts",
     "      kontraktsrolle: 'lesing',\n    },\n    behandle: fristtabellsvar,",
     "    },\n    behandle: fristtabellsvar,",
     "DL-U15: et medlem uten kontraktsteam og uten leserolle får ingen fristtabell"),
    ("S115", "en prosjektinngang står uten kontraktsrolle og uten begrunnelse (#1922)",
     "server/prosjekter.ts",
     "        ikke: 'Medlemslisten er ikke saksdata, og hvem som er medlem, avgjøres av prosjektrollen, ikke av kontraktssiden.',\n",
     "        ikke: '',\n",
     "eller har en begrunnelse for at den ikke krever kontraktsrolle (#1922)"),
    ("S118", "en sak kjernen ikke forstår, leses som en forstått sak (MM-U2, #1928)",
     "server/forlengelser.ts",
     "    if (!u.forstaatt) {", "    if (false) {",
     "MM-U2: en sak kjernen ikke har skrevet, gjør datoen ukjent og nevnes"),
    ("S119", "linjene for fullmakten tas fra det prinsipale laget når det subsidiære gir verdien (presiseringen 24.09)",
     "server/fullmakt.ts",
     "hUkjent === subUkjent ? sub > h : subUkjent", "hUkjent === subUkjent ? h > sub : subUkjent",
     "presiseringen 24.09: linjene er fra laget som gir den største verdien"),
    ("S120", "linjene tas fra laget med størst kjent verdi når det andre har dager som ikke kan verdsettes (GFK-U4)",
     "server/fullmakt.ts",
     "hUkjent === subUkjent ? sub > h : subUkjent", "hUkjent === subUkjent ? sub > h : hUkjent",
     "GFK-U4: har bare det subsidiære laget dager som ikke kan verdsettes"),
    ("S121", "godkjenneren i et team for totalentreprenøren slippes gjennom (kravet 20.10 i #831, punkt 1)",
     "server/autorisasjon.ts",
     "  if (hindring === 'te_team') throw", "  if (false) throw",
     "en godkjenner i et team for totalentreprenøren avvises"),
    ("S122", "godkjennerinngangen godtar et prosjekt som ikke er registrert",
     "server/autorisasjon.ts",
     "  if (hindring === 'ukjent_prosjekt') throw", "  if (false) throw",
     "uten eller med ukjent X-Project-ID gir 403"),
    ("S123", "en pakke som er lukket mens godkjenneren hadde den, vises som manglende tilgang (kravet 20.10 i #831, punkt 2)",
     "server/godkjenner.ts",
     "new Tilbakerulling(lest ? lukket() : ingenPakke())",
     "new Tilbakerulling(lest ? ingenPakke() : ingenPakke())",
     "etterpå ser godkjenneren bare sin egen handling"),
    ("S124", "ukjente felt i kroppen til godkjenneren godtas",
     "server/godkjenner.ts",
     "  if (ukjent) return ukjent;", "  if (false) return ukjent;",
     "kroppen: ukjente felt"),
    ("S125", "godkjenneren leser et vedleggsutkast i saken (G1 i #831)",
     "database/migrasjoner/20261115120000_godkjenner_brev_og_liste.sql",
     "SELECT tilgang FROM koe_sikkerhet.godkjenner_i_sak(@prosjekt_id, @sak_id)\n WHERE @bundet_av_event_id IS NOT NULL;",
     "SELECT tilgang FROM koe_sikkerhet.godkjenner_i_sak(@prosjekt_id, @sak_id);",
     "men ikke et vedleggsutkast"),
    ("S126", "listen over pakkene har returnerte og trukne pakker (G2 i #831)",
     "database/migrasjoner/20261115120000_godkjenner_brev_og_liste.sql",
     "       AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h\n                        WHERE h.pakke_id = s.pakke_id AND h.handling <> N'godkjent')",
     "       AND (1 = 1 OR NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h\n                        WHERE h.pakke_id = s.pakke_id AND h.handling <> N'godkjent'))",
     "G2: listen har de åpne pakkene"),
    ("S127", "listen over pakkene filtrerer ikke på aktørens plass i kjeden (G2 i #831)",
     "database/migrasjoner/20261115120000_godkjenner_brev_og_liste.sql",
     "     WHERE s.godkjenner_id = @aktor\n",
     "     WHERE (s.godkjenner_id = @aktor OR 1 = 1)\n",
     "G2: listen har de åpne pakkene"),
    ("S128", "godkjenneren ser ikke at et brev er levert (G1 i #831)",
     "database/migrasjoner/20261115120000_godkjenner_brev_og_liste.sql",
     " WHERE o.id = @leveringsoppdrag_id\n",
     " WHERE 1 = 0 AND o.id = @leveringsoppdrag_id\n",
     "men ikke et vedleggsutkast"),
    ("S129", "en pakke som andre har lukket, vises som manglende tilgang for den neste i kjeden (kravet 20.10 i #831, punkt 2)",
     "server/godkjenner.ts",
     "egne.length || (await godkjennerIPakken(foresp, pakkeId))",
     "egne.length",
     "den neste i kjeden ser pakken som lukket"),
    ("S130", "et medlem med leserolle i et TE-team slippes gjennom som godkjenner (kravet 20.10 i #831, punkt 1)",
     "database/migrasjoner/20261115120000_godkjenner_brev_og_liste.sql",
     "     AND (m.viewer_override = 0 OR @med_leserolle = 1);",
     "     AND m.viewer_override = 0;",
     "leserolle i et team for totalentreprenøren"),
    ("S131", "listen over pakkene har pakkene i et prosjekt der aktøren er i et TE-team (kravet 20.10 i #831, punkt 1)",
     "server/godkjenner.ts",
     "alle.filter((p) => !hindret.has(p.prosjektId))", "alle",
     "listen over pakkene har ingen pakke i et prosjekt der aktøren er i et team"),
    ("S132", "vedlegget hentes uten å kontrollere saken i stien (G1 i #831)",
     "server/vedlegg.ts",
     "'SELECT filnavn, innhold FROM koe.vedlegg WHERE vedlegg_id = @id AND sak_id = @sak'",
     "'SELECT filnavn, innhold FROM koe.vedlegg WHERE vedlegg_id = @id OR sak_id = @sak'",
     "hentes ikke gjennom stien til pakken"),
    ("S133", "meldingen om ukjente felt sier aldri fra, så hver inngang som bruker den, godtar dem (#2036)",
     "src/lib/kontroll/kroppsfelt.ts",
     "  if (!ukjente.length) return null;", "  return null;",
     "avviser et ukjent felt med 400"),
    ("S134", "ukjente felt i varselet i en ny sak gir ikke meldingen om ukjente felt, bare den neste feilen (#2036)",
     "src/lib/kontroll/nysak.ts",
     "    if (ukjenteIVarsel) return", "    if (false) return",
     "avviser et ukjent felt i varselet med 400"),
    ("S135", "leveringsoppdraget fryser målet med topicens nummer, så formen og summen endres uten nytt format (#1991)",
     "server/levering.ts",
     "    maal: { catenda_project_id, library_id, folder_id, board_id, topic_id } satisfies Leveringsmaal,",
     "    maal,",
     "uten topicens nummer"),
    ("S136", "et topicnummer over int i SQL Server godtas (#1991)",
     "server/catenda.ts",
     " && (nummer as number) <= 2147483647", "",
     "et nummer over det største i int"),
    ("S137", "runneren ser ikke at en sats bytter base med USE (#928 p1)",
     "server/migrering.ts",
     "    if (etter.base !== runnerens.base)", "    if (false)",
     "bytter base med USE"),
    ("S138", "runneren leser sin egen historikkrad som ikke er committet (#928 p2)",
     "server/migrering.ts",
     "        `IF @@TRANCOUNT > 0 ROLLBACK;\n         SELECT COUNT(*)", "        `SELECT COUNT(*)",
     "som ikke er committet når satsen feiler"),
    ("S139", "en fil med bekreftet COMMIT står ikke som anvendt i denne kjøringen (#928 p2)",
     "server/migrering.ts",
     "          if (committet) kjoert.push(v);", "          if (false) kjoert.push(v);",
     "står som anvendt i denne kjøringen"),
    ("S140", "oppstarten ser ikke en egen rolle for kjøretiden (#885 punkt 1)",
     "server/oppstart.ts",
     "  if (svar.egne) brudd.push", "  if (false) brudd.push",
     "er medlem av en egen rolle"),
    ("S141", "oppstarten ser ikke en rettighet på hele basen (#885 punkt 1)",
     "server/oppstart.ts",
     "  if (svar.rettigheter && !alle)", "  if (false)",
     "har SELECT på hele basen"),
    ("S142", "oppstarten ser ikke IMPERSONATE på dbo (#885 punkt 1)",
     "server/oppstart.ts",
     "  else if (svar.utgir !== 0 && !alle)", "  else if (false)",
     "har IMPERSONATE på dbo"),
    ("S143", "en NULL for CONTROL meldes som at forbindelsen har CONTROL (#885 punkt 2)",
     "server/oppstart.ts",
     "  if (svar.kontroll === null) brudd.push('om den har CONTROL på basen, kunne ikke leses');\n  else if",
     "  if",
     "en NULL i kontroll"),
    ("S144", "oppstarten ser ikke en rettighet gitt rett til brukeren (#885 punkt 1)",
     "server/oppstart.ts",
     "  if (svar.direkte && !alle)", "  if (false)",
     "direkte (#885 punkt 1)"),
    ("S145", "runneren ser ikke at en sats endrer IMPLICIT_TRANSACTIONS eller XACT_ABORT (#928)",
     "server/migrering.ts",
     "    if (endret.length)", "    if (false)",
     "slår på IMPLICIT_TRANSACTIONS"),
    ("S146", "det andre forsøket på å registrere feilen går uten pause (#926)",
     "server/jobber.ts",
     "      await pause(PAUSE_FOER_NY_REGISTRERING_MS);", "",
     "registreres ved andre forsøk"),
    ("S147", "leveringen endrer i Catenda selv om leasen ikke er fornyet på over 100 s (#926)",
     "server/jobber.ts",
     "          if (performance.now() - fornyet > LEASETID_S * 1000 - RESTTID_FOER_ENDRING_MS)",
     "          if (false)",
     "stopper leveringen før referansen opprettes og registrerer"),
    ("S150", "en lease som ikke er fornyet, parkerer leveringen i stedet for å registrere forsøket som feilet (#926)",
     "server/jobber.ts",
     "    feil instanceof UfornyetLease ||\n    forbigaaendeISql", "    forbigaaendeISql",
     "registrerer forsøket som feilet"),
    ("S151", "en sak opprettes selv om kontraktsteamene er andre enn dem siden ble avgjort av (#877 p30)",
     "database/migrasjoner/20261116130000_opprettelse_med_kontraktsteamene.sql",
     "  IF EXISTS (SELECT team_id, contract_role FROM koe.catenda_contract_teams", "  IF 1 = 0 AND EXISTS (SELECT team_id, contract_role FROM koe.catenda_contract_teams",
     "lagt til etter at siden ble avgjort"),
    ("S152", "en sak opprettes selv om et kontraktsteam siden ble avgjort av, ikke lenger er kontraktsteam (#877 p30)",
     "database/migrasjoner/20261116130000_opprettelse_med_kontraktsteamene.sql",
     "     OR EXISTS (SELECT team_id, contract_role FROM @lest", "     OR 1 = 0 AND EXISTS (SELECT team_id, contract_role FROM @lest",
     "ikke lenger er kontraktsteam, stopper saken"),
    ("S153", "en sak uten kontraktsteamene serveren leste, avvises ikke med 51422 (#877 p30)",
     "database/migrasjoner/20261116130000_opprettelse_med_kontraktsteamene.sql",
     "  IF @kontraktsteam IS NULL OR ISJSON(@kontraktsteam, ARRAY) = 0", "  IF 1 = 0",
     "kontraktsteamene serveren leste"),
    ("S148", "leveringen parkeres ikke etter forsøk 24 (svar A 11.11 i #1791, #926)",
     "database/migrasjoner/20261116120000_leveringen_parkeres_etter_forsoek.sql",
     "AND NOT (jobbtype = N'levering' AND antall_forsoek >= 24)", "",
     "parkeres etter forsøk 24"),
    ("S149", "loggen har ikke koden for en feil uten feilnummer (#926)",
     "server/logg.ts",
     "typeof kode === 'string' && KODE.test(kode)", "false",
     "en feil uten feilnummer har koden"),
    ("S156", "korrelasjons-ID-en blir borte før SQL Server oppretter jobben (#1805)",
     "server/datalag.ts",
     ".input('korrelasjon', sql.UniqueIdentifier, korrelasjonsId() ?? null)",
     ".input('korrelasjon', sql.UniqueIdentifier, null)",
     "korrelasjons-ID-en følger HTTP-kommandoen til jobben etter commit"),
    ("S154", "sakens leseinngang gir ingen tildelt kode (#2210)", "server/saker.ts",
     "      sakskode,\n      kontraktsforkortelse,\n      klokka_i_basen: klokkaIBasen,\n      kan_foreslaa_sakskode:",
     "      sakskode: null,\n      kontraktsforkortelse,\n      klokka_i_basen: klokkaIBasen,\n      kan_foreslaa_sakskode:",
     "leserollen får tildelt sakskode gjennom lesingen av saken"),
    ("S158", "en synkroniseringsfeil stanser prosjektkontrollen selv med en lagret medlemsliste (#51)",
     "server/autorisasjon.ts",
     "    varsleOmMedlemslistensAlder(prosjekt, lagret.alderSekunder);\n    return 'synkronisering_feilet';",
     "    throw new Error('Medlemslisten kunne ikke synkroniseres');",
     "ved Catenda-feil brukes aktivt medlemskap fra den lagrede listen"),
    ("S155", "aldersvarselet uteblir når listen ennå ikke skal hentes på nytt (#51)",
     "server/autorisasjon.ts",
     "  if (sist !== null && sist.alderSekunder < medlemskapsalder()) {\n    varsleOmMedlemslistensAlder(prosjekt, sist.alderSekunder);\n    return null;",
     "  if (sist !== null && sist.alderSekunder < medlemskapsalder()) {\n    return null;",
     "driftsvarselet følger aldersgrensen uten feil fra Catenda"),
    ("S157", "godkjenneren kontrolleres mot den lagrede listen når synkroniseringen feiler (#2243)",
     "server/autorisasjon.ts",
     "    'synkronisering_feilet'\n  )\n    throw new Error('Godkjenneren",
     "    'aldri'\n  )\n    throw new Error('Godkjenneren",
     "ved Catenda-feil brukes aktivt medlemskap fra den lagrede listen"),
    ("S161", "listen hentes fra koblingen lest på nytt, ikke fra den tilgangskontrollen leste (#726 punkt 2, #2262)",
     "server/autorisasjon.ts",
     "    henting = synkroniserKobling(db, { prosjekt, catendaProsjekt }, (c) => catenda.medlemmer(c))",
     "    henting = synkroniserKobling(db, { prosjekt, catendaProsjekt: (await prosjektkobling(db, prosjekt))! }, (c) => catenda.medlemmer(c))",
     "hentes listen fra koblingen som ble lest først"),
    ("S162", "oppstarten kontrollerer ikke oppsettet for medlemslisten (#2262)",
     "server/start.ts",
     "  const ugyldig = ugyldigMedlemslisteoppsett();\n  if (ugyldig.length) {",
     "  const ugyldig = ugyldigMedlemslisteoppsett();\n  if (false) {",
     "stopper oppstarten med navnet på variabelen"),
    ("S163", "avvisningene uten sesjon strupes ikke (#2251)",
     "server/tilgangslogg.ts",
     "  if (strupes && !slipperGjennom(struping, hendelse, grunn)) return;",
     "",
     "avvisningene uten sesjon strupes til én rad per grunn og minutt"),
    ("S164", "en avvisning med forsøkt identitet strupes også (#2251)",
     "server/tilgangslogg.ts",
     "  const strupes = struping && !aktor_id && !forsoekt;",
     "  const strupes = struping && !aktor_id;",
     "avvisningene uten sesjon strupes til én rad per grunn og minutt"),
    ("S165", "oppslaget av prosjektet leser ikke topickoblingen (#1210)",
     "database/migrasjoner/20261124180000_topicens_prosjekt_fra_topickoblingen.sql",
     "     WHERE @topic IS NOT NULL\n", "     WHERE 1 = 0\n",
     "gir saken fra kvitteringen når topicboardet er byttet"),
    ("S166", "behandlingen sender ikke topicen til oppslaget av prosjektet (#1210)",
     "server/hendelser.ts",
     "    .input('topic', sql.UniqueIdentifier, topicId)\n", "",
     "gir saken fra kvitteringen når topicboardet er byttet"),
    ("S167", "topickoblingen godtas også for en deaktivert kobling (#1210)",
     "database/migrasjoner/20261124180000_topicens_prosjekt_fra_topickoblingen.sql",
     "       AND k.catenda_project_id = @catenda_prosjekt AND k.is_active = 1);",
     "       AND k.catenda_project_id = @catenda_prosjekt);",
     "gir ukjent_prosjekt når koblingen er deaktivert"),
    ("S168", "driftsloggen har ikke grunnen når en avvisning ikke kunne skrives (#2251)",
     "server/tilgangslogg.ts",
     "'error', {\n      utfall: `${hendelse}:${grunn}`,\n    });", "'error', {});",
     "har grunnen i driftsloggen, og minuttet forblir strupet"),
    ("S169", "et annet utfall enn saken har boardet når saken finnes (#1210)",
     "server/hendelser.ts",
     "    ...(utfall === 'sak_opprettet' || !sakenFinnes ? { boardId: board } : {}),",
     "    boardId: board,",
     "laget av integrasjonen, får et utfall også når topicboardet er byttet"),
    ("S170", "tap av det siste aktive medlemskapet sletter ikke sesjonene (#1806)",
     "database/migrasjoner/20261127100000_sesjonens_varighet.sql",
     "   WHERE s.user_id IN (SELECT user_id FROM deleted WHERE active = 1)\n",
     "   WHERE 1 = 0 AND s.user_id IN (SELECT user_id FROM deleted WHERE active = 1)\n",
     "mister det siste aktive medlemskapet"),
    ("S171", "sesjonene slettes ved hver endring av et medlemskap, ikke bare det siste (#1806)",
     "database/migrasjoner/20261127100000_sesjonens_varighet.sql",
     "     AND NOT EXISTS (SELECT 1 FROM koe.app_project_memberships m\n                      WHERE m.user_id = s.user_id AND m.active = 1);",
     ";",
     "mister det siste aktive medlemskapet"),
    ("S172", "HR-synkroniseringen sletter ikke sesjonene til en deaktivert person (#1806)",
     "database/migrasjoner/20261127100000_sesjonens_varighet.sql",
     "   WHERE p.aktiv IS NULL OR p.aktiv = 0;",
     "   WHERE 1 = 0;",
     "deaktivert i Entra"),
    ("S173", "bruken flytter utløpet med levetiden, ikke tidsavbruddet (#1806)",
     "database/migrasjoner/20261127100000_sesjonens_varighet.sql",
     "DATEADD(second, @inaktivitet, @naa)) AS ny",
     "DATEADD(second, @levetid, @naa)) AS ny",
     "bruken flytter utløpet til tidsavbruddet fra nå"),
    ("S174", "oppstarten kontrollerer ikke sesjonens levetid og tidsavbrudd (#1806)",
     "server/start.ts",
     "  try {\n    sesjonsvarighet();\n  }",
     "  try {\n  }",
     "stopper oppstarten med navnet på variabelen (#1806)"),
    ("S159", "fristsvaret i sakslisten krever at alle fristene er subsidiære (#1910)",
     "kjerne/spor/frist/visning.ts",
     "subsidiaert: frister.some((f) => f.subsidiaert),",
     "subsidiaert: frister.every((f) => f.subsidiaert),",
     "fristsvaret er subsidiært når bare én av to frister er subsidiær"),
    ("S160", "fristsvaret i sakslisten leser bare om den første fristen er subsidiær (#1910)",
     "kjerne/spor/frist/visning.ts",
     "subsidiaert: frister.some((f) => f.subsidiaert),",
     "subsidiaert: frister[0]!.subsidiaert,",
     "fristsvaret er subsidiært når bare én av to frister er subsidiær"),
]

# S8 nås ikke: avvisningen av ukjente felt i kroppen (S6) stopper aktor_id først.
# Slapp den gjennom, ville kontrollerRad i kommandoer.ts avvist raden, fordi
# basen stempler aktøren fra sesjonen i skrivekonteksten (#750).
FORVENTET_OVERLEVER = {"S8"}

MIGRASJONER = "database/migrasjoner"
NAVN = r"((?:\[[^\]]+\]|\w+)(?:\.(?:\[[^\]]+\]|\w+))*)"
# Bare objekter som defineres som helhet. En tabell eller sikkerhetspolicy endres
# ledd for ledd med ALTER, så for dem fanger kontrollen ikke en død mutasjon.
OBJEKT = re.compile(
    rf"^\s*(CREATE|ALTER|DROP)(?:\s+OR\s+ALTER)?\s+(PROC(?:EDURE)?|FUNCTION|TRIGGER|VIEW)\s+(?:IF\s+EXISTS\s+)?{NAVN}",
    re.MULTILINE | re.IGNORECASE,
)
TRIGGERTABELL = re.compile(rf"\bON\s+{NAVN}", re.IGNORECASE)
TABELL_SLETTES = re.compile(r"^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([^;\n]+)", re.MULTILINE | re.IGNORECASE)
NYTT_NAVN = re.compile(r"\bsp_rename\s+(?:@objname\s*=\s*)?N?'([^']+)'", re.IGNORECASE)
GO = re.compile(r"^[ \t]*GO[ \t]*$", re.MULTILINE | re.IGNORECASE)


def objektnavn(navn: str) -> str:
    return navn.replace("[", "").replace("]", "").strip().lower()


def objektart(art: str) -> str:
    art = art.upper()
    return "PROCEDURE" if art == "PROC" else art


def satsen(kilde: str, pos: int) -> tuple[int, int]:
    """Start og slutt på GO-satsen som tegnet på `pos` står i."""
    start = max((m.end() for m in GO.finditer(kilde, 0, pos)), default=0)
    slutt = GO.search(kilde, pos)
    return start, slutt.start() if slutt else len(kilde)


def ankerfeil(rot: Path, fil: str, fra: str) -> str | None:
    """Hvorfor feilinnføringen ikke kan virke, eller None.

    En mutasjon i en migrasjon er død når objektet i GO-satsen der ankeret
    begynner, defineres på nytt eller slettes senere i samme fil eller i en
    senere migrasjon, fordi testbasen bygges med alle migrasjonene. En trigger
    er også død når tabellen den står på, slettes eller får nytt navn.
    """
    kilde = (rot / fil).read_text()
    if kilde.count(fra) != 1:
        return "finner ikke stedet"
    if not fil.startswith(MIGRASJONER + "/"):
        return None
    start, slutt = satsen(kilde, kilde.index(fra))
    definisjon = next(
        (m for m in OBJEKT.finditer(kilde, start, slutt) if m.group(1).upper() != "DROP"), None
    )
    if not definisjon:
        return None
    art, navn = objektart(definisjon.group(2)), objektnavn(definisjon.group(3))
    tabell = None
    if art == "TRIGGER" and (paa := TRIGGERTABELL.search(kilde, definisjon.end(), slutt)):
        tabell = objektnavn(paa.group(1))
    resten = [(Path(fil).name, kilde[slutt:])] + [
        (f.name, f.read_text())
        for f in sorted((rot / MIGRASJONER).glob("*.sql"))
        if f.name > Path(fil).name
    ]
    for filnavn, tekst in resten:
        for m in OBJEKT.finditer(tekst):
            if objektart(m.group(2)) == art and objektnavn(m.group(3)) == navn:
                hva = "slettes" if m.group(1).upper() == "DROP" else "defineres på nytt"
                return f"{navn} {hva} i {filnavn}"
        for m in NYTT_NAVN.finditer(tekst):
            if objektnavn(m.group(1)) in {navn, tabell}:
                return f"{objektnavn(m.group(1))} får nytt navn i {filnavn}"
        if tabell:
            for m in TABELL_SLETTES.finditer(tekst):
                if tabell in {objektnavn(t) for t in m.group(1).split(",")}:
                    return f"tabellen {tabell} for {navn} slettes i {filnavn}"
    return None


def kontroller_ankre(rot: Path, valgt: set[str]) -> list[str]:
    mislykket = []
    for id_, _, fil, fra, *_ in FEILINNFOERINGER:
        if valgt and id_ not in valgt:
            continue
        if feil := ankerfeil(rot, fil, fra):
            print(id_, feil)
            mislykket.append(id_)
    return mislykket


def kjoer(rot: Path, mutert: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        # De levende Catenda-testene (#902) hoppes alltid over her, og ville stoppet kontrollen.
        ["npx", "vitest", "run", "server/tester", "--exclude", "server/tester/catenda.live.test.ts"],
        cwd=rot,
        capture_output=True,
        text=True,
        check=False,
        # En mutert migrasjon gir en mal ingen bruker igjen; globalt_oppsett.ts sletter den (#930).
        env={**os.environ, "KOE_TESTMAL_ENGANGS": "1"} if mutert else None,
    )


def main(rot: Path) -> int:
    valgt = set(sys.argv[2:])
    if ukjent := valgt - {f[0] for f in FEILINNFOERINGER}:
        print("ukjente feilinnføringer:", " ".join(sorted(ukjent)))
        return 1
    if sys.argv[1] == "--ankre":
        return 1 if kontroller_ankre(Path(__file__).resolve().parents[2], valgt) else 0
    # Som kjernedriveren (#967 punkt 1): en feilinnføring med ankerfeil hoppes over og
    # meldes på slutten, så de andre kjøres. Kjøringen er rød likevel.
    uten_anker = kontroller_ankre(rot, valgt)
    if not os.environ.get("KOE_SQLSERVER_TILKOBLING"):
        print("KOE_SQLSERVER_TILKOBLING er ikke satt; databasetestene ville hoppet over seg selv")
        return 1
    # Kontrollen først: uten feilinnføring skal testene være grønne, og ingen
    # databasetest hoppet over.
    kontroll = kjoer(rot)
    if kontroll.returncode or "skipped" in kontroll.stdout:
        print("kontrollkjøringen feilet eller hoppet over tester; feilinnføringene sier ingenting")
        return 1
    mislykket = []
    for id_, hva, fil, fra, til, forventet in FEILINNFOERINGER:
        if (valgt and id_ not in valgt) or id_ in uten_anker:
            continue
        sti = rot / fil
        kilde = sti.read_text()
        sti.write_text(kilde.replace(fra, til))
        try:
            r = kjoer(rot, mutert=True)
        finally:
            sti.write_text(kilde)
        feilet = [
            linje.strip()
            for linje in r.stdout.splitlines()
            if linje.strip().startswith(("×", "FAIL"))
        ]
        # Oppdaget bare når den forventede testen feiler, ikke oppsett eller import.
        oppdaget = any(forventet in linje for linje in feilet)
        print(id_, hva, "->", "oppdaget" if oppdaget else "OVERLEVDE", len(feilet))
        for linje in feilet[:3]:
            print("   ", linje[:160])
        if not oppdaget and id_ not in FORVENTET_OVERLEVER:
            mislykket.append(id_)
    if uten_anker:
        print("hoppet over fordi ankeret ikke virker:", " ".join(uten_anker))
    return 1 if mislykket or uten_anker else 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
