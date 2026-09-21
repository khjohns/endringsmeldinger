"""En versjonskonflikt er ikke en forbigående feil (RV-11).

`append_batch` er dekorert med @with_retry. ConcurrencyError arvet Exception, så
retry-dekoratøren klassifiserte den som TransientError («Unknown error: …»),
sov to ganger og kastet noe `except ConcurrencyError` i ruten aldri fanget:
brukeren fikk 500 i stedet for 409. Enda verre ved retry etter tapt svar — da er
skrivingen allerede committet, og neste forsøk ser den nye versjonen.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from lib.supabase.exceptions import TransientError
from models.events import SakOpprettetEvent
from repositories.event_repository import ConcurrencyError
from repositories.supabase_event_repository import SupabaseEventRepository


@pytest.fixture
def repo(monkeypatch):
    instance = object.__new__(SupabaseEventRepository)
    instance.client = Mock()
    # Versjonen i basen er 1, kalleren tror den er 0.
    monkeypatch.setattr(
        SupabaseEventRepository, "_get_current_version", lambda self, *a: 1
    )
    sleeps = []
    monkeypatch.setattr("lib.supabase.retry.time.sleep", sleeps.append)
    return SimpleNamespace(instance=instance, sleeps=sleeps)


def _event():
    return SakOpprettetEvent(
        sak_id="case", aktor_id="A", aktor_rolle="TE", sakstittel="Sak"
    )


def test_versjonskonflikt_boblet_opp_som_konflikt(repo):
    with pytest.raises(ConcurrencyError) as feil:
        repo.instance.append_batch([_event()], expected_version=0)
    assert feil.value.expected == 0 and feil.value.actual == 1
    assert not isinstance(feil.value, TransientError)


def test_versjonskonflikt_gir_ingen_nye_forsok(repo):
    """Å prøve igjen kan ikke hjelpe, og etter et tapt svar er det direkte farlig."""
    with pytest.raises(ConcurrencyError):
        repo.instance.append_batch([_event()], expected_version=0)
    assert repo.sleeps == []
