"""Skanningen av kjøretidsavhengighetene i TS som CI kjører (#269 punkt 3).

Kravet er avgjort 17.10 i #269: høy eller kritisk sårbarhet med rettet versjon
blokkerer, med unntak fra en datert liste. Rapporten er en forkortet form av
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


def _rapport(alvorlighet: str, rettet, advisory: str = "GHSA-aaaa-bbbb-cccc") -> dict:
    return {
        "vulnerabilities": {
            "pakke-a": {
                "severity": alvorlighet,
                "fixAvailable": rettet,
                "via": [
                    {"url": f"https://github.com/advisories/{advisory}", "severity": alvorlighet, "title": "Prøve"},
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
@pytest.mark.parametrize("rettet", [True, {"name": "pakke-a", "version": "2.0.0", "isSemVerMajor": True}])
def test_hoey_eller_kritisk_med_rettet_versjon_blokkerer(tmp_path, alvorlighet, rettet):
    resultat = _kjoer(tmp_path, _rapport(alvorlighet, rettet))
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert "pakke-a GHSA-aaaa-bbbb-cccc" in resultat.stdout


@pytest.mark.parametrize("alvorlighet, rettet", [("moderate", True), ("low", True), ("high", False)])
def test_lavere_alvorlighet_eller_uten_rettet_versjon_blokkerer_ikke(tmp_path, alvorlighet, rettet):
    resultat = _kjoer(tmp_path, _rapport(alvorlighet, rettet))
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr


def test_advisory_i_unntakslisten_blokkerer_ikke(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high", True), UNNTAK)
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr
    assert "UNNTAK (2026-10-18, #268)" in resultat.stdout


def test_unntak_for_en_annen_advisory_blokkerer_fortsatt(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high", True, "GHSA-dddd-eeee-ffff"), UNNTAK)
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert "Unntak uten treff::GHSA-aaaa-bbbb-cccc" in resultat.stdout


def test_unntak_for_samme_advisory_i_en_annen_pakke_blokkerer_fortsatt(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high", True), UNNTAK.replace('"pakke-a"', '"pakke-c"'))
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert "Unntak uten treff::GHSA-aaaa-bbbb-cccc i pakke-c" in resultat.stdout


def test_unntak_uten_dato_avvises(tmp_path):
    resultat = _kjoer(tmp_path, _rapport("high", True), UNNTAK.replace('dato = "2026-10-18"\n', ""))
    assert resultat.returncode != 0
    assert "mangler dato" in resultat.stderr


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
