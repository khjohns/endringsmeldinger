"""Skanningen av kjøretidsavhengighetene i TS som CI kjører (#269 punkt 3).

Kravet er avgjort 17.10 i #269: høy eller kritisk sårbarhet med rettet versjon
blokkerer, med unntak fra en datert liste. En rettet versjon leses av advisoryens
sårbare område, ikke av `fixAvailable` (#851). Rapporten er en forkortet form av
utdataene fra `npm audit --json`.
"""

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / "scripts/ci/skann_avhengigheter.py"
UNNTAK = """[[unntak]]
advisory = "GHSA-aaaa-bbbb-cccc"
pakke = "pakke-a"
dato = "2026-10-18"
issue = 268
begrunnelse = "Prøve."
"""


def _rapport(
    alvorlighet: str, område="<1.2.3", advisory: str = "GHSA-aaaa-bbbb-cccc", fiks=True
) -> dict:
    kilde = {"url": f"https://github.com/advisories/{advisory}", "severity": alvorlighet, "title": "Prøve"}
    if område is not None:
        kilde["range"] = område
    return {
        "vulnerabilities": {
            "pakke-a": {
                "severity": alvorlighet,
                "fixAvailable": fiks,
                "via": [
                    kilde,
                    "pakke-b",
                ],
            }
        }
    }


def _kjoer(tmp_path, rapport, unntak: str = "") -> subprocess.CompletedProcess:
    liste = tmp_path / "unntak.toml"
    liste.write_text(unntak, encoding="utf-8")
    return subprocess.run(
        [sys.executable, str(SKRIPT), str(liste)],
        input=json.dumps(rapport),
        capture_output=True,
        text=True,
    )


@pytest.mark.parametrize("alvorlighet", ["high", "critical"])
@pytest.mark.parametrize(
    "område",
    [
        "<1.2.3",
        ">=1.0.0 <1.2.3",
        ">=7.1.0 <=7.3.1",
        "<1.0.5 || >=2.0.0 <2.0.3",
        "=4.0.1",
        "4.0.1",
        "1.0.0 - 1.2.3",
        "^1.2.0",
        "~1.2.0",
        "1.2.x",
        ">=1.0.0<2.0.0",
        ">=1.0.0,<2.0.0",
        "<1.2.3 ||",
        " ",
        ">=",
        None,
    ],
)
def test_hoey_eller_kritisk_med_rettet_versjon_blokkerer(tmp_path, alvorlighet, område):
    resultat = _kjoer(tmp_path, _rapport(alvorlighet, område))
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert "pakke-a GHSA-aaaa-bbbb-cccc" in resultat.stdout


@pytest.mark.parametrize("fiks", [False, {"name": "forelder", "version": "3.0.0", "isSemVerMajor": True}])
def test_rettet_versjon_blokkerer_ogsaa_naar_npm_audit_fix_ikke_naar_den(tmp_path, fiks):
    """#851: `fixAvailable: false` sier bare at `npm audit fix` ikke når rettingen."""
    resultat = _kjoer(tmp_path, _rapport("high", fiks=fiks))
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr


@pytest.mark.parametrize("alvorlighet, område", [
    ("moderate", "<1.2.3"),
    ("low", "<1.2.3"),
    ("high", "*"),
    ("high", ">=0.0.0"),
    ("critical", "<1.0.5 || >=2.0.0"),
    ("high", ">= 1.0.0"),
    ("high", ">1.0.0"),
    ("high", "x.x.x"),
])
def test_lavere_alvorlighet_eller_uten_rettet_versjon_blokkerer_ikke(tmp_path, alvorlighet, område):
    resultat = _kjoer(tmp_path, _rapport(alvorlighet, område))
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr


def test_advisory_i_unntakslisten_blokkerer_ikke(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high"), UNNTAK)
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr
    assert "UNNTAK (2026-10-18, #268)" in resultat.stdout


def test_unntak_for_en_annen_advisory_blokkerer_fortsatt(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high", advisory="GHSA-dddd-eeee-ffff"), UNNTAK)
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert "Unntak uten treff::GHSA-aaaa-bbbb-cccc" in resultat.stdout


def test_unntak_for_samme_advisory_i_en_annen_pakke_blokkerer_fortsatt(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high"), UNNTAK.replace('"pakke-a"', '"pakke-c"'))
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert "Unntak uten treff::GHSA-aaaa-bbbb-cccc i pakke-c" in resultat.stdout


def _med_total(rapport: dict, total: int) -> dict:
    """Oppsummeringen `npm audit` gir i `metadata.vulnerabilities.total`."""
    return {**rapport, "metadata": {"vulnerabilities": {"total": total}}}


def test_ubrukt_unntak_mot_komplett_rapport_feiler(tmp_path):
    """#1170: et unntak som ikke treffer en blokkerende sårbarhet, skal fjernes."""
    resultat = _kjoer(tmp_path, _med_total(_rapport("moderate"), 1), UNNTAK)
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert "::error title=Unntak uten treff::GHSA-aaaa-bbbb-cccc i pakke-a" in resultat.stdout
    assert "unntak uten treff: 1" in resultat.stdout


def test_ubrukt_unntak_mot_ufullstendig_rapport_bare_varsler(tmp_path):
    """#1170: oppsummeringen teller flere sårbare pakker enn rapporten har, så advisoryen kan mangle."""
    resultat = _kjoer(tmp_path, _med_total(_rapport("moderate"), 3), UNNTAK)
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr
    assert "::warning title=Ufullstendig rapport::" in resultat.stdout
    assert "::warning title=Unntak uten treff::GHSA-aaaa-bbbb-cccc i pakke-a" in resultat.stdout
    assert "::error" not in resultat.stdout


def test_blokkerende_funn_feiler_ogsaa_ved_ufullstendig_rapport(tmp_path):
    resultat = _kjoer(tmp_path, _med_total(_rapport("high", advisory="GHSA-dddd-eeee-ffff"), 3), UNNTAK)
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert "::error title=Sårbar kjøretidsavhengighet::pakke-a GHSA-dddd-eeee-ffff" in resultat.stdout


def test_unntak_uten_dato_avvises(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high"), UNNTAK.replace('dato = "2026-10-18"\n', ""))
    assert resultat.returncode != 0
    assert "mangler dato" in resultat.stderr


def test_samme_unntak_to_ganger_avvises(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high"), UNNTAK + "\n" + UNNTAK)
    assert resultat.returncode != 0
    assert "står to ganger" in resultat.stderr


def test_feil_fra_npm_audit_gir_ikke_gront(tmp_path):
    resultat = _kjoer(tmp_path, {"error": {"code": "ENOTFOUND"}})
    assert resultat.returncode != 0
    assert "npm audit ga ingen rapport" in resultat.stderr


def test_unntakslisten_i_repoet_er_gyldig():
    spesifikasjon = importlib.util.spec_from_file_location("skann_avhengigheter", SKRIPT)
    skann_avhengigheter = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(skann_avhengigheter)
    for post in skann_avhengigheter.les_unntak(skann_avhengigheter.UNNTAKSLISTE).values():
        assert post["advisory"].startswith("GHSA-")
