import os

import pytest

TESTBASE_ENV = "KOE_TESTBASE_URL"


@pytest.fixture(scope="session")
def testbase():
    """Lesende tilkobling til basen i KOE_TESTBASE_URL.

    Innsamlingen hopper over `database`-merkede tester når variabelen mangler.
    Er den satt, skal en manglende driver gi rød test, ikke en stille skip.
    """
    url = os.environ.get(TESTBASE_ENV)
    if not url:
        pytest.skip(f"{TESTBASE_ENV} er ikke satt")

    try:
        import psycopg
    except ImportError:
        pytest.fail(
            f"{TESTBASE_ENV} er satt, men psycopg mangler. "
            "Installer backend/requirements-dev.txt."
        )

    with psycopg.connect(
        url, autocommit=True, options="-c default_transaction_read_only=on"
    ) as tilkobling:
        yield tilkobling
