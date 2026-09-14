"""Short-lived SQLite connections with explicit transaction and resource cleanup."""

import sqlite3
from contextlib import contextmanager


@contextmanager
def sqlite_connection(path):
    connection = sqlite3.connect(path, timeout=15)
    try:
        with connection:
            yield connection
    finally:
        connection.close()
