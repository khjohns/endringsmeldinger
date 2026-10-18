"""Feilinnføringene for TS-serveren (skiva i #347, .claude/rules/tester.md).

Hver feilinnføring endrer ett sted i en kopi av arbeidstreet, kjører testene i
server/tester/ mot SQL Server og setter stedet tilbake. Hver testfil lager sin
egen base fra `database/migrasjoner/`. Kjør aldri mot arbeidstreet du committer fra:

    git worktree add /tmp/kopi HEAD && ln -s "$PWD/node_modules" /tmp/kopi/node_modules
    KOE_SQLSERVER_TILKOBLING=... python3 server/tester/feilinnfoering.py /tmp/kopi

Krever KOE_SQLSERVER_TILKOBLING (#658, #661). Lagringsgarantiene i basen har egne
tester i journal.test.ts og kommandoer.test.ts. Først
kjøres testene uten feilinnføring og må være grønne. En feilinnføring er
oppdaget når en test med det forventede navnet feiler. Skriptet feiler når en
feilinnføring overlever og ikke står i FORVENTET_OVERLEVER, eller når stedet
ikke finnes lenger.
"""

import os
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
    ("S14", "en sak opprettes uten topic-board (KT-U4)", "database/migrasjoner/20261018100000_jobber.sql",
     "  IF @board IS NULL\n    THROW 51412", "  IF 1 = 0\n    THROW 51412",
     "uten topic-board"),
    ("S15", "en utløpt lease kvitterer (invariant 7)", "database/migrasjoner/20261018100000_jobber.sql",
     "WHERE lease = @lease AND jobbtype = N'catenda_topic' AND lease_utloeper > @naa;",
     "WHERE lease = @lease AND jobbtype = N'catenda_topic';",
     "utløpt lease"),
    ("S16", "hentingen venter på en jobb en annen kjører har låst", "database/migrasjoner/20261018100000_jobber.sql",
     "      FROM koe.jobb WITH (UPDLOCK, READPAST, ROWLOCK)\n     WHERE tilstand = N'venter' AND lease IS NULL",
     "      FROM koe.jobb WITH (UPDLOCK, ROWLOCK)\n     WHERE tilstand = N'venter' AND lease IS NULL",
     "en annen kjører har låst"),
    ("S17", "et medlem kan skrive topicen utenom kjøreveien", "database/migrasjoner/20261018100000_jobber.sql",
     "  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer(prosjekt_id) ON koe.sak_catenda_topic AFTER INSERT;",
     "  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.sak_catenda_topic AFTER INSERT;",
     "et medlem kan ikke skrive topicen"),
    ("S18", "et usikkert utfall prøves igjen i stedet for å parkeres", "server/jobber.ts",
     "const usikkert = feil instanceof UsikkertUtfall;", "const usikkert = false;",
     "et usikkert utfall parkeres"),
    ("S19", "en endret kobling parkerer ikke jobben (invariant 6)", "database/migrasjoner/20261018100000_jobber.sql",
     "         AND c.catenda_project_id = j.catenda_project_id AND c.topic_board_id = j.catenda_board_id\n",
     "",
     "boardet er byttet"),
]

# S8 nås ikke: avvisningen av ukjente felt i kroppen (S6) stopper aktor_id først.
# Slapp den gjennom, ville kontrollerRad i kommandoer.ts avvist raden, fordi
# basen stempler aktøren fra sesjonen i skrivekonteksten (#750).
FORVENTET_OVERLEVER = {"S8"}


def kjoer(rot: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["npx", "vitest", "run", "server/tester"],
        cwd=rot,
        capture_output=True,
        text=True,
        check=False,
    )


def main(rot: Path) -> int:
    # Kontrollen først: uten feilinnføring skal testene være grønne, og ingen
    # databasetest hoppet over (uten KOE_SQLSERVER_TILKOBLING kjører de ikke).
    kontroll = kjoer(rot)
    if kontroll.returncode or "skipped" in kontroll.stdout or not os.environ.get("KOE_SQLSERVER_TILKOBLING"):
        print("kontrollkjøringen feilet eller hoppet over tester; feilinnføringene sier ingenting")
        return 1
    mislykket = []
    for id_, hva, fil, fra, til, forventet in FEILINNFOERINGER:
        sti = rot / fil
        kilde = sti.read_text()
        if kilde.count(fra) != 1:
            print(id_, "finner ikke stedet")
            mislykket.append(id_)
            continue
        sti.write_text(kilde.replace(fra, til))
        try:
            r = kjoer(rot)
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
