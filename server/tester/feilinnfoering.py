"""Feilinnføringene for TS-serveren (skiva i #347, .claude/rules/tester.md).

Hver feilinnføring endrer ett sted i en kopi av arbeidstreet, kjører testene i
server/tester/ mot testbasen og setter stedet tilbake. Kjør aldri mot
arbeidstreet du committer fra:

    git worktree add /tmp/kopi HEAD && ln -s "$PWD/node_modules" /tmp/kopi/node_modules
    KOE_TESTBASE_URL=... python3 server/tester/feilinnfoering.py /tmp/kopi

Krever KOE_TESTBASE_URL. Kjør ikke samtidig med pytest mot samme base. Skriptet
feiler når en feilinnføring overlever og ikke står i FORVENTET_OVERLEVER, eller
når stedet ikke finnes lenger.
"""

import subprocess
import sys
from pathlib import Path

FEILINNFOERINGER = [
    ("S1", "kontraktsrollen kontrolleres ikke for en inngang som krever den", "server/app.ts",
     "r.tilgang.kontraktsrolle === 'kreves'\n          ? await", "false\n          ? await"),
    ("S2", "CSRF kontrolleres ikke på en endring", "server/autorisasjon.ts",
     "!['GET', 'HEAD', 'OPTIONS'].includes(metode) &&", "false &&"),
    ("S3", "prosjektgrensen for saken i stien kontrolleres ikke", "server/autorisasjon.ts",
     "if (sak.rows[0]?.prosjekt_id !== prosjektId) throw nekt();", "if (!sak.rows[0]) throw nekt();"),
    ("S4", "lageret kontrollerer ikke versjonen klienten så", "server/lager.ts",
     "if (versjon !== forventet) throw new Versjonskonflikt(forventet, versjon);", ""),
    ("S5", "lageret låser ikke saken til prosjektet", "server/lager.ts",
     "WHERE m.sak_id = $1 AND m.prosjekt_id = $2", "WHERE m.sak_id = $1 AND $2::text IS NOT NULL"),
    ("S6", "ukjente felt i kroppen godtas", "server/app.ts",
     "if (ukjente.length) return", "if (false) return"),
    ("S7", "leveringsoppdraget skrives etter COMMIT, utenfor transaksjonen", "server/lager.ts",
     "      await kroker.foerCommit?.(klient);\n      await klient.query('COMMIT');",
     "      await klient.query('COMMIT');\n      await kroker.foerCommit?.(klient);"),
    ("S8", "aktøren tas fra kroppen når den er oppgitt", "server/app.ts",
     "aktoerId: bruker.id,", "aktoerId: (kropp.aktor_id as string) ?? bruker.id,"),
    ("S9", "summen regnes uten sorterte nøkler", "server/levering.ts",
     "    return `{${Object.keys(verdi)\n      .sort()", "    return `{${Object.keys(verdi)"),
]

# S8 nås ikke: avvisningen av ukjente felt i kroppen (S6) stopper aktor_id først.
FORVENTET_OVERLEVER = {"S8"}


def main(rot: Path) -> int:
    mislykket = []
    for id_, hva, fil, fra, til in FEILINNFOERINGER:
        sti = rot / fil
        kilde = sti.read_text()
        if kilde.count(fra) != 1:
            print(id_, "finner ikke stedet")
            mislykket.append(id_)
            continue
        sti.write_text(kilde.replace(fra, til))
        try:
            r = subprocess.run(
                ["npx", "vitest", "run", "server/tester"],
                cwd=rot,
                capture_output=True,
                text=True,
                check=False,
            )
        finally:
            sti.write_text(kilde)
        feilet = [
            linje.strip()
            for linje in r.stdout.splitlines()
            if linje.strip().startswith(("×", "FAIL"))
        ]
        print(id_, hva, "->", "oppdaget" if r.returncode else "OVERLEVDE", len(feilet))
        for linje in feilet[:3]:
            print("   ", linje[:160])
        if not r.returncode and id_ not in FORVENTET_OVERLEVER:
            mislykket.append(id_)
    return 1 if mislykket else 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
