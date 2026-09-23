"""Mutasjoner for kjernen i F0b: hver svekker én regel og skal gi minst én rød test.

Kjøres fra roten av repoet, med KOE_TESTBASE_URL satt til en base fra
scripts/testbase/lokal_testbase.sh eller bygg_testbase.sh:

    backend/venv/bin/python docs/vedlegg/f0b-kjernen-2026-09-23/mutasjoner.py

Hver mutasjon er en tekstutskifting i én fil. Fila settes tilbake etter
kjøringen, også ved feil. Skriptet feiler om en mutasjon ikke gir rødt, eller om
teksten den skal bytte ut ikke finnes lenger. Etter hver mutasjon settes
tabellene i `public` tilbake med den umuterte ryddingen, fordi M26 ellers
etterlater basen uten frødata.
"""

import os
import subprocess
import sys
from pathlib import Path

ROT = Path(__file__).resolve().parents[3]
BACKEND = ROT / "backend"
DB = "backend/lib/db/database.py"
FEIL = "backend/lib/db/feil.py"
CONFIG = "backend/core/config.py"
FIXTURE = "backend/tests/test_database/conftest.py"
SJEKK = (
    "    if conn.info.transaction_status != TransactionStatus.INTRANS:\n"
    '        raise RuntimeError("Kontekst kan bare settes inne i en åpen transaksjon")\n'
)

MUTASJONER = [
    ("M01 SET LOCAL ROLE blir SET ROLE", DB,
     'sql.SQL("SET LOCAL ROLE {}")', 'sql.SQL("SET ROLE {}")',
     "test_kontekst_lekker_ikke"),
    ("M02 set_config(..., true) blir false", DB,
     '"SELECT set_config(%s, %s, true)"', '"SELECT set_config(%s, %s, false)"',
     "test_kontekst_lekker_ikke"),
    ("M03 ingen transaksjon: autocommit", DB,
     "            with conn.transaction():\n", "            if True:\n",
     "test_hjelperen_aapner or test_feil_etter_forste"),
    ("M04 ingen transaksjon og ingen sjekk i _sett_kontekst", DB,
     "            with conn.transaction():\n", "            if True:\n",
     "test_hjelperen_aapner or test_feil_etter_forste or test_kontekst_lekker_ikke",
     (SJEKK, "")),
    ("M05 sjekken i _sett_kontekst fjernet", DB,
     SJEKK, "", "test_kontekst_kan_ikke_settes_utenfor"),
    ("M06 poolens reset fjernet", DB,
     "        reset=_sjekk_ved_retur,\n", "", "test_kontekst_satt_paa_sesjonsniva"),
    ("M07 SET LOCAL ROLE NONE fjernet", DB,
     '        conn.execute("SET LOCAL ROLE NONE")\n', "        pass\n",
     "test_tom_kontekst_overstyrer"),
    ("M08 tom kontekst settes ikke", DB,
     'return json.dumps(satt) if satt else ""', 'return json.dumps(satt) if satt else "lekket"',
     "test_tom_kontekst_overstyrer or test_kontekst_lekker_ikke"),
    ("M09 avsluttet transaksjon godtas", DB,
     "                if conn.info.transaction_status != TransactionStatus.INTRANS:\n",
     "                if False:\n", "test_transaksjon_som_er_avsluttet"),
    ("M10 nøsting tillatt", DB,
     'if getattr(self._aktiv, "inne", False):', "if False:",
     "test_transaksjoner_kan_ikke_nostes"),
    ("M11 40001 er permanent", FEIL,
     'if sqlstate in ("40001", "40P01"):', 'if sqlstate in ("40P01",):',
     "test_40001"),
    ("M12 40P01 er permanent", FEIL,
     'if sqlstate in ("40001", "40P01"):', 'if sqlstate in ("40001",):',
     "test_40P01"),
    ("M13 versjonskonflikt er forbigående", FEIL,
     "        return _versjonskonflikt(feil)\n",
     "        return SerialiseringsFeil('x', original=feil)\n",
     "versjonskonflikt"),
    ("M14 ukjent utfall prøves på nytt", DB,
     "            except SerialiseringsFeil:\n",
     "            except (SerialiseringsFeil, UkjentUtfall):\n",
     "test_ukjent_utfall_kjores_ikke"),
    ("M15 brudd under COMMIT blir forbigående", DB,
     'if fase == "commit" and', 'if False and',
     "test_tapt_forbindelse_under_commit or test_ukjent_utfall"),
    ("M16 alle forbigående feil prøves på nytt", DB,
     "            except SerialiseringsFeil:\n", "            except TransientError:\n",
     "test_forbigaaende_feil_utenom", ("    SerialiseringsFeil,\n",
                                       "    SerialiseringsFeil,\n    TransientError,\n")),
    ("M17 skranker er forbigående", FEIL,
     'if sqlstate.startswith(("22", "23")):', 'if False:',
     "test_avvisninger_er_permanente"),
    ("M18 ukjent SQLSTATE er forbigående", FEIL,
     "    return PermanentError(melding, original=feil, code=sqlstate)\n",
     "    return TransientError(melding, original=feil)\n",
     "test_avvisninger_er_permanente"),
    ("M19 42501 er forbigående", FEIL,
     'if sqlstate == "42501":\n        return TilgangAvvist(melding, original=feil, code=sqlstate)',
     'if sqlstate == "42501":\n        return TransientError(melding, original=feil)',
     "test_manglende_rettighet"),
    ("M20 feilmeldingen fra basen gjengis", FEIL,
     '    deler = [f"SQLSTATE {sqlstate}"]', '    deler = [str(feil)]',
     "test_feilmeldingen_gjengir_ikke"),
    ("M21 årsakskjeden beholdes", DB,
     "            raise klassifiser(feil) from None\n", "            raise klassifiser(feil)\n",
     "test_feilmeldingen_gjengir_ikke"),
    ("M22 standardverdi for DATABASE_URL", CONFIG,
     "database_url: SecretStr | None = Field(default=None, repr=False)",
     'database_url: SecretStr | None = Field(default=SecretStr("postgresql:///koe"), repr=False)',
     "test_uten_database_url"),
    ("M23 tom DATABASE_URL faller til libpq-miljøet", DB,
     "    if not url:\n        raise DatabaseIkkeKonfigurert(",
     "    if url is None:\n        raise DatabaseIkkeKonfigurert(",
     "test_uten_database_url_ingen_tilkobling"),
    ("M24 uleselig URL gjengis", DB,
     '        raise DatabaseIkkeKonfigurert("DATABASE_URL kan ikke tolkes") from None',
     '        raise DatabaseIkkeKonfigurert(f"DATABASE_URL kan ikke tolkes: {url}")',
     "test_uleselig_database_url"),
    ("M25 testbasen krever ikke merket", FIXTURE,
     "    if merke != TESTBASE_MERKE:", "    if False:",
     "test_base_uten_merket"),
    ("M26 ryddingen gjenoppretter ikke frødata", FIXTURE,
     "        for tabell in reversed(med_frodata):", "        for tabell in []:",
     "test_ryddingen"),
    ("M27 manglende DATABASE_URL er ikke permanent", FEIL,
     "class DatabaseIkkeKonfigurert(PermanentError):",
     "class DatabaseIkkeKonfigurert(RuntimeError):",
     "test_manglende_database_url_proves_ikke"),
]


def kjor(uttrykk: str) -> int:
    return subprocess.run(
        [sys.executable, "-m", "pytest", "-q", "-x", "-p", "no:cacheprovider",
         "-m", "database", "tests/test_database", "-k", uttrykk],
        cwd=BACKEND, capture_output=True, text=True, check=False,
    ).returncode


def main() -> int:
    if not os.environ.get("KOE_TESTBASE_URL"):
        print("KOE_TESTBASE_URL må være satt", file=sys.stderr)
        return 2
    if kjor("kjerne or skrivbar") != 0:
        print("Testene er ikke grønne uten mutasjon", file=sys.stderr)
        return 2
    sys.path.insert(0, str(BACKEND))
    from tests.test_database.conftest import _rydd, les_frodata

    url = os.environ["KOE_TESTBASE_URL"]
    frodata = les_frodata(url)
    feilet = []
    for navn, fil, gammel, ny, uttrykk, *ekstra in MUTASJONER:
        sti = ROT / fil
        original = sti.read_text()
        endret = original
        for g, n in [(gammel, ny), *ekstra]:
            if g not in endret:
                print(f"{navn}: teksten finnes ikke lenger", file=sys.stderr)
                return 2
            endret = endret.replace(g, n, 1)
        try:
            sti.write_text(endret)
            kode = kjor(uttrykk)
        finally:
            sti.write_text(original)
            _rydd(url, frodata)
        utfall = "rød" if kode == 1 else ("GRØNN" if kode == 0 else f"kode {kode}")
        print(f"{navn}: {utfall}")
        if kode != 1:
            feilet.append(navn)
    if feilet:
        print(f"Ikke fanget: {', '.join(feilet)}", file=sys.stderr)
        return 1
    print(f"Alle {len(MUTASJONER)} mutasjoner ga rød test.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
