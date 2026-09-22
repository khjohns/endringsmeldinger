"""Etterprøving av TST-02 / KR-15 i JsonFileEventRepository.

Viser isolert at POSIX `rename()` overskriver en eksisterende saksfil uten feil.
Den gjennomgående reproduksjonen av kappløpet står i
`tests/test_security/test_testsuite_blindsoner_audit_20260918.py`; testen
som sto her, er erstattet av den (T-4, 2026-09-22).

Avgrensing:
Dette gjelder utelukkende JsonFileEventRepository (lokal reserve-backend).
"""

import tempfile
from pathlib import Path

import pytest

from .network_guard import install_network_guard


@pytest.fixture(autouse=True)
def guard():
    cleanup = install_network_guard()
    try:
        yield
    finally:
        cleanup()


def test_tst02_rename_overskriver_uten_feilmelding_dersom_tmp_er_separat():
    """Viser at POSIX rename() overskriver eksisterende sak i det stille dersom temp-filer skilles.

    Dersom en utvikler retter FileNotFoundError ved å bruke NamedTemporaryFile,
    men glemmer låsing/sjekk før rename, vil tråd 2s rename() atomisk overskrive
    tråd 1s data uten at noen feil kastes.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        base = Path(tmpdir)
        target = base / "SAK-OVERWRITE.json"

        # Tråd 1 skriver og renamer
        tmp1 = base / "t1.tmp"
        tmp1.write_text('{"version": 1, "owner": "t1"}', encoding="utf-8")
        tmp1.rename(target)

        assert target.exists()
        assert "t1" in target.read_text(encoding="utf-8")

        # Tråd 2 renamer uten lås
        tmp2 = base / "t2.tmp"
        tmp2.write_text('{"version": 1, "owner": "t2"}', encoding="utf-8")
        tmp2.rename(target)  # POSIX tillater atomisk erstatning

        # Tråd 1s data er tapt i det stille
        content = target.read_text(encoding="utf-8")
        assert "t2" in content
        assert "t1" not in content
