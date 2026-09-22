"""Nettverksvakt for testisolering under testbevis-audit (2026-09-22).

Avskjærer ethvert utilsiktet eksternt nettverkskall under testkjøring.
Tillater kun loopback (127.0.0.1, localhost, ::1) og lokale Unix-sockets (AF_UNIX).
"""

import socket

import pytest

_orig_connect = socket.socket.connect


def guarded_connect(self, address):
    # Tillat AF_UNIX for lokale sockets
    if getattr(socket, "AF_UNIX", None) is not None and self.family == socket.AF_UNIX:
        return _orig_connect(self, address)

    # IPv4 / IPv6 sjekk
    if isinstance(address, tuple) and len(address) >= 1:
        host = address[0]
        if host in ("127.0.0.1", "localhost", "::1", None):
            return _orig_connect(self, address)

    raise RuntimeError(
        f"Eksternt nettverkskall blokkert av testisolering (network_guard): {address}"
    )


def install_network_guard():
    socket.socket.connect = guarded_connect
    def cleanup():
        socket.socket.connect = _orig_connect
    return cleanup


@pytest.fixture(autouse=True, scope="session")
def enforce_network_isolation():
    cleanup = install_network_guard()
    yield
    cleanup()
