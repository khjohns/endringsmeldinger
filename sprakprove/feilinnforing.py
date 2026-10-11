"""Feilinnføring i begge implementasjoner i språkprøven (#274, P1-5 og port 2).

Én mutasjon om gangen i arbeidskopien, og originalteksten settes tilbake etterpå; Python-testene (domenebanen, begge
rutebanene mot testbasen, kontrakten og grensetilfellene) og TS-testene i
sprakprove/ kjøres. Skriptet starter ikke når filene det muterer, har lokale endringer. Feilklassene
M1–M6 er dem fra #293, M7 er regelendringen (enighet) og M8 avrundingen. M9–M11 er port 2:
tilgang og lagring i TS-serveren mot Flask og Python-lageret, med Python-testene som prøver dem.

Kjøres fra repoets rot med testbasen oppe: python3 sprakprove/feilinnforing.py [M1 M2 ...]
Forventet: hver mutasjon gir røde tester i begge språk, og arbeidskopien er ren
etterpå. Kjør den aldri mot levende data, og commit aldri en mutert fil.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROT = str(Path(__file__).resolve().parents[1])
PYTEST = ["/tmp/venv/bin/python", "-m", "pytest", "-q", "-p", "no:cacheprovider", "-rf"]
DOMENETESTER = ["tests/test_domenetabell", "tests/test_database/test_domenetabell_lagring.py",
                "tests/test_database/test_kontrakt_aksept.py", "tests/test_regler/test_grensetilfeller_sprakprove.py"]
TILGANGSTESTER = ["tests/test_auth", "tests/test_security", "tests/test_routes"]
LAGRINGSTESTER = ["tests/test_database/test_hendelse_og_notat.py", "tests/test_database/test_domenetabell_lagring.py"]
VITEST = ["npx", "vitest", "run", "sprakprove"]

MUTASJONER = [
    ("M1", "gjeldende svar sammenlikner ikke kravversjonen",
     [("py", "backend/models/sak_state.py",
       "if self.respons_event_id and self.bh_respondert_versjon == max(\n            0, self.antall_versjoner - 1\n        ):",
       "if self.respons_event_id:")],
     [("ts", "sprakprove/kjerne/sak.ts",
       "return spor.svar && spor.krav && spor.svar.kravId === spor.krav.eventId ? spor.svar : null;",
       "return spor.svar;")]),
    ("M2", "en ny aksept uten referanse godtas av modellen",
     [("py", "backend/models/events.py",
       '            raise ValueError("Aksepten må vise til svaret som godtas.")', "            pass")],
     [("ts", "sprakprove/kjerne/kommando.ts",
       "const feil = valider(proves, `kommando.${type}`);",
       "const feil = valider(proves, `kommando.${type}`).filter((f) => !f.includes('refererer_til_event_id'));")]),
    ("M3", "regelen CURRENT_RESPONSE er fjernet",
     [("py", "backend/services/business_rules.py", '                ("CURRENT_RESPONSE", self._rule_gjeldende_svar),\n', "")],
     [("ts", "sprakprove/kjerne/forretningsregler.ts",
       "[byggherrenHarSvart, gjeldendeSvarRegel, ikkeAlleredeEnige]", "[byggherrenHarSvart, ikkeAlleredeEnige]")]),
    ("M4", "ukjente felt godtas i en ny kommando",
     [("py", "backend/models/events.py",
       '    """En ny kommando er streng; lagret historikk leses tolerant (#272)."""\n',
       '    """En ny kommando er streng; lagret historikk leses tolerant (#272)."""\n    return verdier\n')],
     [("ts", "sprakprove/kjerne/kommando.ts", "const streng = skjema['x-ukjente-felt'] === 'avvises';",
       "const streng = false;")]),
    ("M5", "en vurdering som ikke er gjort, lagres som true",
     [("py", "backend/models/events.py",
       '    foresporsel_svar_ok: bool | None = Field(\n        default=None,',
       '    foresporsel_svar_ok: bool | None = Field(\n        default=True,')],
     [("ts", "sprakprove/kjerne/kommando.ts", "  const feil = valider(proves, `kommando.${type}`);",
       "  if (type === 'respons_frist' && data.foresporsel_svar_ok === undefined) data.foresporsel_svar_ok = true;\n  const feil = valider(proves, `kommando.${type}`);")]),
    ("M6", "referansen (referstoid) lagres ikke",
     [("py", "backend/models/cloudevents.py", '            ce["referstoid"] = refererer_til', "            pass")],
     [("ts", "sprakprove/kjerne/rad.ts", "referstoid: h.refererer_til_event_id,", "referstoid: null,")]),
    ("M7", "oppgjort uten avklart grunnlag",
     [("py", "backend/models/sak_state.py", "return spor.enighet and self.grunnlag.avklart", "return spor.enighet")],
     [("ts", "sprakprove/kjerne/sak.ts", "return erEnighet(sak, navn) && grunnlagetErAvklart(sak);", "return erEnighet(sak, navn);")]),
    ("M8", "halvverdier rundes til nærmeste partall, ikke bort fra null",
     [("py", "backend/regler/__init__.py",
       "return Decimal(str(verdi)).quantize(ORE, rounding=ROUND_HALF_UP)",
       'return Decimal(str(verdi)).quantize(ORE, rounding="ROUND_HALF_EVEN")')],
     [("ts", "sprakprove/kjerne/belop.ts", "if ((tall % deler) * 2n >= deler) resultat += 1n;",
       "{ const rest = (tall % deler) * 2n; if (rest > deler || (rest === deler && resultat % 2n === 1n)) resultat += 1n; }")]),
    ("M9", "prosjektgrensen kontrolleres ikke for saken det vises til (RV-07)",
     [("py", "backend/lib/auth/project_access.py",
       "if metadata is None or metadata.prosjekt_id != project_id:", "if metadata is None:")],
     [("ts", "server/autorisasjon.ts",
       "if (sak.rows[0]?.prosjekt_id !== prosjektId) throw nekt();", "if (!sak.rows[0]) throw nekt();")],
     TILGANGSTESTER),
    ("M10", "CSRF kontrolleres ikke på en endring",
     [("py", "backend/lib/auth/session.py",
       'if request.method not in {"GET", "HEAD", "OPTIONS"} and not csrf_valid():', "if False:")],
     [("ts", "server/autorisasjon.ts",
       "!['GET', 'HEAD', 'OPTIONS'].includes(metode) &&", "false &&")],
     TILGANGSTESTER),
    ("M11", "lageret skriver etter journalens versjon, ikke den klienten så (tapt oppdatering)",
     [("py", "backend/repositories/postgres/hendelse.py",
       ("            if faktisk != expected_version:\n                raise ConcurrencyError(expected_version, faktisk)\n"
        "            with conn.cursor() as cur:\n                cur.executemany(_SETT_INN, rader)"),
       ("            with conn.cursor() as cur:\n                cur.executemany(_SETT_INN, [self._rad(e, prosjekt_id, faktisk + i + 1)"
        " for i, e in enumerate(events)])"))],
     [("ts", "sprakprove/server/lager.ts",
       ("    if (sak.rows[0].versjon !== forventet)\n      throw new Versjonskonflikt(forventet, sak.rows[0].versjon);\n"
        "    for (const [i, h] of hendelser.entries()) {\n      const rad = tilRad({ ...h, versjon: forventet + i + 1 }, prosjektId);"),
       "    for (const [i, h] of hendelser.entries()) {\n      const rad = tilRad({ ...h, versjon: sak.rows[0].versjon + i + 1 }, prosjektId);")],
     LAGRINGSTESTER),
]


def bytt(fil, gammel, ny) -> str:
    """Innfør mutasjonen og returner originalteksten, så den kan settes tilbake."""
    sti = f"{ROT}/{fil}"
    tekst = open(sti, encoding="utf-8").read()
    if tekst.count(gammel) != 1:
        raise SystemExit(f"Ankeret finnes ikke én gang i {fil}: {gammel[:60]}")
    open(sti, "w", encoding="utf-8").write(tekst.replace(gammel, ny))
    return tekst


def kjor(sprak, pytester=DOMENETESTER):
    if sprak == "py":
        r = subprocess.run(PYTEST + pytester, cwd=f"{ROT}/backend", capture_output=True, text=True)
        ut = r.stdout + r.stderr
        feilet = re.findall(r"^FAILED (\S+)", ut, re.M)
        oppsett = len(re.findall(r"^ERROR ", ut, re.M))
        meldinger = re.findall(r"^FAILED \S+ - (.*)$", ut, re.M)
        sammendrag = (re.findall(r"=+ (.*(?:passed|failed).*) =+", ut) or ["?"])[-1]
    else:
        r = subprocess.run(VITEST, cwd=ROT, capture_output=True, text=True)
        ut = r.stdout + r.stderr
        feilet = re.findall(r"^ FAIL\s+(.*)$", ut, re.M)
        oppsett = 0
        meldinger = re.findall(r"^(?:AssertionError|Error): (.*)$", ut, re.M)
        sammendrag = (re.findall(r"Tests\s+(.*)$", ut, re.M) or ["?"])[-1]
    return {"feilet": len(feilet), "oppsettfeil": oppsett, "eksempler": feilet[:4],
            "meldinger": sorted(set(m[:110] for m in meldinger))[:4], "sammendrag": sammendrag.strip()}


def kjor_alle(valgte):
    filer = sorted({fil for _, _, py, ts, *_ in MUTASJONER for _, fil, _, _ in py + ts})
    lokale = subprocess.run(["git", "status", "--porcelain", "--", *filer], cwd=ROT,
                            capture_output=True, text=True).stdout
    if lokale:
        raise SystemExit(f"Commit eller legg bort endringene i filene som muteres først:\n{lokale}")
    resultat = {}
    for navn, hva, py, ts, *pytester in MUTASJONER:
        if valgte and navn not in valgte:
            continue
        for sprak, endringer in (("py", py), ("ts", ts)):
            originaler = {fil: bytt(fil, gammel, ny) for _, fil, gammel, ny in endringer}
            try:
                resultat[f"{navn}-{sprak}"] = {"feilklasse": hva, **kjor(sprak, *pytester)}
            finally:
                for fil, tekst in originaler.items():
                    open(f"{ROT}/{fil}", "w", encoding="utf-8").write(tekst)
            print(navn, sprak, resultat[f"{navn}-{sprak}"]["sammendrag"], flush=True)
    status = subprocess.run(["git", "status", "--porcelain", "--", *filer], cwd=ROT,
                            capture_output=True, text=True).stdout
    resultat["arbeidskopi_etterpaa"] = status or "ren"
    print(json.dumps(resultat, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    kjor_alle(set(sys.argv[1:]))
