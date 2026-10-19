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
ikke finnes lenger, eller når en senere migrasjon definerer prosedyren,
funksjonen, triggeren eller visningen med ankeret på nytt (#937).
"""

import os
import re
import subprocess
import sys
from pathlib import Path

FEILINNFOERINGER = [
    ("S1", "kontraktsrollen kontrolleres ikke for en inngang som krever den", "server/app.ts",
     "tilgang.kontraktsrolle === 'kreves'\n        ? await", "false\n        ? await",
     "kontraktsrollen"),
    ("S2", "CSRF kontrolleres ikke på en endring", "server/autorisasjon.ts",
     "!['GET', 'HEAD', 'OPTIONS'].includes(metode) &&", "false &&",
     "CSRF"),
    ("S3", "prosjektgrensen for saken i stien kontrolleres ikke", "server/autorisasjon.ts",
     "for (const sakId of saker) if (!iProsjektet.has(sakId)) throw nekt();", "void iProsjektet;",
     "mot en sak utenfor gir 403"),
    ("S4", "kommandoene kontrollerer ikke versjonen klienten så", "server/kommandoer.ts",
     "if (versjon !== forventet) throw new Versjonskonflikt(forventet, versjon);", "",
     "versjonskonflikt"),
    ("S5", "lesingen godtar en sak TS-kjernen ikke har skrevet", "server/lager.ts",
     "    if (!skrevetAvKjernen(journal))\n      throw", "    if (false)\n      throw",
     "ikke har skrevet"),
    ("S6", "ukjente felt i kroppen godtas", "server/app.ts",
     "!KOMMANDOKROPP.has(k));\n  if (ukjente.length) return",
     "!KOMMANDOKROPP.has(k));\n  if (false) return",
     "kan ikke settes av klienten"),
    ("S7", "skrivingen godtar en sak TS-kjernen ikke har skrevet", "server/kommandoer.ts",
     "      if (!skrevetAvKjernen(journal))\n        throw", "      if (false)\n        throw",
     "ikke har skrevet"),
    ("S8", "aktøren tas fra kroppen når den er oppgitt", "server/app.ts",
     "aktoerId: kontekst.aktor,", "aktoerId: (kropp.aktor_id as string) ?? kontekst.aktor,",
     "kan ikke settes av klienten"),
    ("S9", "summen regnes uten sorterte nøkler", "server/levering.ts",
     "    return `{${Object.keys(verdi)\n      .sort()", "    return `{${Object.keys(verdi)",
     "sjekksummen"),
    ("S10", "tekst basen ikke kan lagre, slipper gjennom til basen", "server/app.ts",
     "if (typeof v === 'string' && ulagringsbarTekst(v))", "if (typeof v === 'string' && false)",
     "tekst basen ikke kan lagre"),
    ("S11", "dybdegrensen for kroppen mangler", "server/app.ts",
     "if (dybde > STORSTE_DYBDE) return", "if (false) return",
     "dypt nestet"),
    ("S12", "prosjektet i stien sammenliknes ikke med X-Project-ID", "server/autorisasjon.ts",
     "if (prosjektIdFraSti !== null && prosjektIdFraSti !== prosjektId) throw nekt();",
     "void prosjektIdFraSti;",
     "et annet prosjekt i stien"),
    ("S13", "en sak uten leveringsmål gir 500, ikke en avvisning", "server/kommandoer.ts",
     "    if (feil instanceof IngenLeveringsmaal) {", "    if (false) {",
     "uten leveringsmål"),
    ("S14", "en sak opprettes uten topic-board (KT-U4)", "database/migrasjoner/20261020121000_oppretter_tid_og_oppdragsnoekkel.sql",
     "  IF @aktiv IS DISTINCT FROM 1 OR @board IS NULL\n    THROW 51412", "  IF @aktiv IS DISTINCT FROM 1\n    THROW 51412",
     "uten topic-board"),
    ("S15", "en utløpt lease kvitterer (invariant 7)", "database/migrasjoner/20261018120000_levering.sql",
     "WHERE lease = @lease AND lease_utloeper > @naa AND", "WHERE lease = @lease AND",
     "utløpt lease"),
    ("S16", "hentingen venter på en jobb en annen kjører har låst", "database/migrasjoner/20261018120000_levering.sql",
     "      FROM koe.jobb j WITH (UPDLOCK, READPAST, ROWLOCK)",
     "      FROM koe.jobb j WITH (UPDLOCK, ROWLOCK)",
     "en annen kjører har låst"),
    ("S17", "et medlem kan skrive topicen utenom kjøreveien", "database/migrasjoner/20261018100000_jobber.sql",
     "  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer(prosjekt_id) ON koe.sak_catenda_topic AFTER INSERT;",
     "  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.sak_catenda_topic AFTER INSERT;",
     "et medlem kan ikke skrive topicen"),
    ("S18", "et usikkert utfall prøves igjen i stedet for å parkeres", "server/jobber.ts",
     "if (feil instanceof UsikkertCatendautfall) return { utfall: 'usikkert', melding };", "",
     "et usikkert utfall parkeres"),
    ("S19", "en endret kobling parkerer ikke jobben (invariant 6)", "database/migrasjoner/20261018120000_levering.sql",
     "(j.jobbtype = N'catenda_topic' AND c.topic_board_id = j.catenda_board_id)",
     "(j.jobbtype = N'catenda_topic')",
     "boardet er byttet"),
    ("S20", "leveringen hentes før saken har topic (#371)", "database/migrasjoner/20261018120000_levering.sql",
     "       AND (j.jobbtype <> N'levering' OR EXISTS (SELECT 1 FROM koe.sak_catenda_topic t WHERE t.sak_id = j.sak_id))\n",
     "",
     "hentes ikke før saken har topic"),
    ("S21", "et bibliotek som er byttet, parkerer ikke leveringen (invariant 6)", "database/migrasjoner/20261018120000_levering.sql",
     "               AND c.library_id = TRY_CAST(JSON_VALUE(o.innhold, '$.maal.library_id') AS uniqueidentifier)\n",
     "",
     "bibliotek som er byttet"),
    ("S22", "en varig avvisning prøves igjen i stedet for å parkeres (#778)", "database/migrasjoner/20261020020000_vedleggslevering.sql",
     "WHEN N'feilet' THEN N'venter' ELSE N'parkert' END", "WHEN N'usikkert' THEN N'parkert' ELSE N'venter' END",
     "varig avvisning"),
    ("S23", "omstarten beholder antall forsøk, så backoffen ikke begynner forfra (#778)", "database/migrasjoner/20261020121000_oppretter_tid_og_oppdragsnoekkel.sql",
     "neste_forsoek = @naa, antall_forsoek = 0,", "neste_forsoek = @naa,",
     "driften starter jobben på nytt"),
    ("S24", "et kvittert dokument lastes opp på nytt (#371)", "server/jobber.ts",
     "let dokumentId = jobb.dokument_id;", "let dokumentId: string | null = null;",
     "laster ikke opp dokumentet på nytt"),
    ("S25", "referansen lages uten avstemming mot topicen (B-03)", "server/jobber.ts",
     "funnet?.id ?? (await", "(await",
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
     "        side.drawText(linje.tekst,", "        if (y > MARG + LINJEAVSTAND) side.drawText(linje.tekst,",
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
     "\n  return { utfall: 'usikkert', melding };", "\n  return { utfall: 'feilet', melding };",
     "en uventet lokal feil i leveringen parkerer jobben"),
    ("S38", "et ord som er delt over to linjer, leses som to ord (#371, LV-U2)", "server/brevpdf.ts",
     "ut.push({ tekst: rest.slice(0, n), delt: true });", "ut.push({ tekst: rest.slice(0, n), delt: false });",
     "gjengir et ord som er lengre enn linjen"),
    ("S39", "skrivetransaksjonen får ikke prosjektet i konteksten (#739)", "server/datalag.ts",
     "         EXEC sp_set_session_context N'koe_prosjekt', @prosjekt, @read_only = 1;\n", "",
     "journalen har sak_opprettet som versjon 1"),
    ("S40", "versjonen leses uten UPDLOCK og HOLDLOCK (#739)", "database/migrasjoner/20261020080000_skriveprosedyrer.sql",
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
     "IF USER_NAME() = 'koe_jobbkjoerer' REVERT;`", "`",
     "en setning som avbrytes av et tidsavbrudd"),
]

# S8 nås ikke: avvisningen av ukjente felt i kroppen (S6) stopper aktor_id først.
# Slapp den gjennom, ville kontrollerRad i kommandoer.ts avvist raden, fordi
# basen stempler aktøren fra sesjonen i skrivekonteksten (#750).
FORVENTET_OVERLEVER = {"S8"}

MIGRASJONER = "database/migrasjoner"
# Bare objekter som defineres som helhet. En tabell eller sikkerhetspolicy endres
# ledd for ledd med ALTER, så for dem fanger kontrollen ikke en død mutasjon.
DEFINISJON = re.compile(r"^\s*(?:CREATE|ALTER)(?: OR ALTER)? (PROCEDURE|FUNCTION|TRIGGER|VIEW) ([\w.]+)", re.MULTILINE)


def ankerfeil(rot: Path, fil: str, fra: str) -> str | None:
    """Hvorfor feilinnføringen ikke kan virke, eller None.

    En mutasjon i en migrasjon er død når en senere migrasjon definerer objektet
    på nytt, fordi testbasen bygges med alle migrasjonene.
    """
    kilde = (rot / fil).read_text()
    if kilde.count(fra) != 1:
        return "finner ikke stedet"
    if not fil.startswith(MIGRASJONER + "/"):
        return None
    foer = kilde[: kilde.index(fra)]
    definisjoner = list(DEFINISJON.finditer(foer))
    if not definisjoner:
        return None
    art, navn = definisjoner[-1].groups()
    ny = re.compile(rf"^\s*(?:CREATE|ALTER|DROP)(?: OR ALTER)? {art} {re.escape(navn)}\b", re.MULTILINE)
    senere = [
        f.name
        for f in sorted((rot / MIGRASJONER).glob("*.sql"))
        if f.name > Path(fil).name and ny.search(f.read_text())
    ]
    return f"{navn} defineres på nytt i {senere[-1]}" if senere else None


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
        return 1 if kontroller_ankre(Path.cwd(), valgt) else 0
    if kontroller_ankre(rot, valgt):
        return 1
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
        if valgt and id_ not in valgt:
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
    return 1 if mislykket else 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
