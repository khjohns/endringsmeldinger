"""Feilinnføringene for TS-serveren (skiva i #347, .claude/rules/tester.md).

Hver feilinnføring endrer ett sted i en kopi av arbeidstreet, kjører testene i
server/tester/ mot testbasen og setter stedet tilbake. En feilinnføring i
migrasjonen bygger en egen kastbar base, `koe_feilinnfoering`, på samme server. Kjør aldri mot
arbeidstreet du committer fra:

    git worktree add /tmp/kopi HEAD && ln -s "$PWD/node_modules" /tmp/kopi/node_modules
    KOE_TESTBASE_URL=... python3 server/tester/feilinnfoering.py /tmp/kopi

Krever KOE_TESTBASE_URL og KOE_SQLSERVER_TILKOBLING (#658). Kjør ikke samtidig med pytest mot samme base. Først
kjøres testene uten feilinnføring og må være grønne. En feilinnføring er
oppdaget når en test med det forventede navnet feiler. Skriptet feiler når en
feilinnføring overlever og ikke står i FORVENTET_OVERLEVER, eller når stedet
ikke finnes lenger.
"""

import os
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path

MIG = "supabase/migrations/20261011090000_leveringsoppdrag.sql"

FEILINNFOERINGER = [
    ("S1", "kontraktsrollen kontrolleres ikke for en inngang som krever den", "server/app.ts",
     "r.tilgang.kontraktsrolle === 'kreves'\n          ? await", "false\n          ? await",
     "kontraktsrollen"),
    ("S2", "CSRF kontrolleres ikke på en endring", "server/autorisasjon.ts",
     "!['GET', 'HEAD', 'OPTIONS'].includes(metode) &&", "false &&",
     "CSRF"),
    ("S3", "prosjektgrensen for saken i stien kontrolleres ikke", "server/autorisasjon.ts",
     "for (const sakId of saker) if (!iProsjektet.has(sakId)) throw nekt();", "void iProsjektet;",
     "mot en sak utenfor gir 403"),
    ("S4", "lageret kontrollerer ikke versjonen klienten så", "server/lager.ts",
     "if (versjon !== forventet) throw new Versjonskonflikt(forventet, versjon);", "",
     "versjonskonflikt"),
    ("S5", "lageret låser ikke saken til prosjektet", "server/lager.ts",
     "WHERE m.sak_id = $1 AND m.prosjekt_id = $2", "WHERE m.sak_id = $1 AND $2::text IS NOT NULL",
     "sak utenfor prosjektet"),
    ("S6", "ukjente felt i kroppen godtas", "server/app.ts",
     "if (ukjente.length) return", "if (false) return",
     "kan ikke settes av klienten"),
    ("S7", "leveringsoppdraget skrives etter COMMIT, utenfor transaksjonen", "server/lager.ts",
     "      await kroker.foerCommit?.(klient);\n      await klient.query('COMMIT');",
     "      await klient.query('COMMIT');\n      await kroker.foerCommit?.(klient);",
     "lagres samlet"),
    ("S8", "aktøren tas fra kroppen når den er oppgitt", "server/app.ts",
     "aktoerId: bruker.id,", "aktoerId: (kropp.aktor_id as string) ?? bruker.id,",
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
    # Migrasjonen: hver bygger en egen kastbar base (se `basen_for`).
    ("D1", "service_role beholder DELETE og TRUNCATE fra plattformen", MIG,
     "REVOKE ALL ON public.leveringsoppdrag FROM service_role;\n", "",
     "kan ikke slettes eller tømmes"),
    ("D2", "triggeren stopper ikke TRUNCATE", MIG,
     "IF TG_OP IN ('UPDATE', 'TRUNCATE') OR (", "IF TG_OP IN ('UPDATE') OR (",
     "kan ikke slettes eller tømmes"),
    ("D3", "triggeren stopper ikke DELETE mens saken og hendelsen finnes", MIG,
     "        TG_OP = 'DELETE'\n        AND EXISTS", "        FALSE\n        AND EXISTS",
     "kan ikke slettes eller tømmes"),
    ("D4", "triggeren godtar et oppdrag i et annet prosjekt enn hendelsen", MIG,
     "           AND h.prosjekt_id = NEW.prosjekt_id\n", "",
     "ikke føres til et annet prosjekt"),
]

# S8 nås ikke: avvisningen av ukjente felt i kroppen (S6) stopper aktor_id først.
FORVENTET_OVERLEVER = {"S8"}


def kjoer(rot: Path, url: str | None = None) -> subprocess.CompletedProcess:
    miljoe = {**os.environ, **({"KOE_TESTBASE_URL": url} if url else {})}
    return subprocess.run(
        ["npx", "vitest", "run", "server/tester"],
        cwd=rot,
        env=miljoe,
        capture_output=True,
        text=True,
        check=False,
    )


@contextmanager
def basen_for(rot: Path):
    """En ny kastbar base på samme server, bygget fra migrasjonene i `rot`, og slettet etterpå."""
    url = os.environ["KOE_TESTBASE_URL"]
    navn = "koe_feilinnfoering"
    ny = url.rsplit("/", 1)[0] + "/" + navn
    psql = ["psql", url, "--no-psqlrc", "-qc"]
    subprocess.run([*psql, f"DROP DATABASE IF EXISTS {navn}"], check=True)
    subprocess.run([*psql, f"CREATE DATABASE {navn}"], check=True)
    try:
        subprocess.run(
            ["scripts/testbase/bygg_testbase.sh"],
            cwd=rot,
            env={**os.environ, "KOE_TESTBASE_URL": ny},
            capture_output=True,
            check=True,
        )
        yield ny
    finally:
        subprocess.run([*psql, f"DROP DATABASE IF EXISTS {navn} WITH (FORCE)"], check=True)


def main(rot: Path) -> int:
    # Kontrollen først: uten feilinnføring skal testene være grønne, og ingen
    # databasetest hoppet over (uten KOE_TESTBASE_URL kjører de ikke).
    kontroll = kjoer(rot)
    if kontroll.returncode or "skipped" in kontroll.stdout or not os.environ.get("KOE_TESTBASE_URL"):
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
            if fil.startswith("supabase/"):
                with basen_for(rot) as url:
                    r = kjoer(rot, url)
            else:
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
