"""Deterministisk etterprøving av TST-02 / KR-15 i JsonFileEventRepository.

Undersøker samtidig saksopprettelse (expected_version=0) i JsonFileEventRepository.
Viser deterministisk at manglende fil-låsing og delt .tmp-filnavn ved saksopprettelse
fører til enten FileNotFoundError eller stille overskriving, aldri ConcurrencyError.

Avgrensing:
Dette gjelder utelukkende JsonFileEventRepository (lokal reserve-backend).
SupabaseEventRepository håndhever unik-skranker i PostgreSQL (unique_hendelse_sak_versjon).
"""

import tempfile
import threading
from pathlib import Path

import pytest

from models.events import SakOpprettetEvent
from repositories.event_repository import ConcurrencyError, JsonFileEventRepository

from .network_guard import install_network_guard


@pytest.fixture(autouse=True)
def guard():
    cleanup = install_network_guard()
    try:
        yield
    finally:
        cleanup()


def test_tst02_samtidig_opprettelse_kolliderer_paa_felles_tmp_fil():
    """Viser deterministisk at to tråder kolliderer på {sak_id}.tmp ved expected_version=0.

    I JsonFileEventRepository.append_batch (linje 181) brukes en fast sti:
        temp_path = file_path.with_suffix(".tmp")
    Når to tråder passerer `if file_path.exists()` samtidig:
    1. Begge skriver til samme fil {sak_id}.tmp.
    2. Den første tråden gjør `temp_path.rename(file_path)`.
    3. Den andre tråden forsøker `temp_path.rename(file_path)`, men temp_path er
       allerede flyttet av tråd 1.
    4. Tråd 2 krasjer med FileNotFoundError i stedet for ConcurrencyError.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        repo = JsonFileEventRepository(base_path=tmpdir)
        sak_id = "DETERM-RACE-001"

        ev1 = SakOpprettetEvent(
            sak_id=sak_id, aktor_id="TE-1", aktor_rolle="TE", sakstittel="Sak fra tråd 1"
        )
        ev2 = SakOpprettetEvent(
            sak_id=sak_id, aktor_id="TE-2", aktor_rolle="TE", sakstittel="Sak fra tråd 2"
        )

        barrier = threading.Barrier(2)
        errors = []
        successes = []

        def worker(arbeider_navn, ev):
            barrier.wait(timeout=5)
            try:
                versjon = repo.append_batch([ev], expected_version=0)
                successes.append((arbeider_navn, versjon))
            except ConcurrencyError as ce:
                errors.append(("concurrency_error", ce))
            except Exception as exc:
                errors.append((type(exc).__name__, exc))

        t1 = threading.Thread(target=worker, args=("Tråd-1", ev1))
        t2 = threading.Thread(target=worker, args=("Tråd-2", ev2))

        t1.start()
        t2.start()
        t1.join(timeout=5)
        t2.join(timeout=5)

        # Bekrefter at ConcurrencyError ALDRI kastes av JsonFileEventRepository ved expected_version=0:
        has_concurrency_error = any(k == "concurrency_error" for k, _ in errors)
        assert not has_concurrency_error, (
            "JsonFileEventRepository skal ikke kaste ConcurrencyError i dagens implementasjon."
        )

        # Bekrefter at enten krasjet en tråd med FileNotFoundError, eller begge lyktes med overskriving:
        has_fnf = any(k == "FileNotFoundError" for k, _ in errors)
        has_two_successes = len(successes) == 2

        assert has_fnf or has_two_successes, (
            f"Uventet utfall ved samtidighet: successes={successes}, errors={errors}"
        )


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
