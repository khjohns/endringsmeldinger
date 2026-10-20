"""Regelen for en migrasjon som bare legger til (DL-U16, #1057 del 3).

Forventningen er vedtaket: en migrasjon markert …_tillegg.sql kan være anvendt
når forrige utgivelse starter, så den skal ikke fjerne, endre eller stramme inn
noe som finnes. Formene som godtas, står i .github/scripts/tilleggsregel.py.
"""

import importlib.util
import sys
from pathlib import Path

import pytest

SKRIPTER = Path(__file__).resolve().parents[3] / ".github/scripts"
sys.path.insert(0, str(SKRIPTER))
import tilleggsregel  # noqa: E402

GODTATT = {
    "ny tabell med nøkkel, trigger, indeks og predikat": """
CREATE TABLE koe.ny (
  id uniqueidentifier NOT NULL CONSTRAINT ny_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL,
  sak uniqueidentifier NULL REFERENCES koe.sak_metadata (sak_id) ON DELETE NO ACTION
);
GO
CREATE TRIGGER koe.ny_uforanderlig ON koe.ny INSTEAD OF UPDATE, DELETE AS
  THROW 51001, N'Uforanderlig', 1;
GO
CREATE UNIQUE INDEX ny_sak ON koe.ny (sak);
ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.ny,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id) ON koe.ny AFTER INSERT;
GRANT SELECT, INSERT ON koe.ny TO koe_runtime;
""",
    "ny prosedyre med DML i kroppen": """
-- DROP i en kommentar teller ikke
CREATE PROCEDURE koe_api.ny @x int AS
BEGIN
  UPDATE koe.ny SET sak = NULL WHERE 1 = 0;
  DELETE koe.ny WHERE 1 = 0;
END
GO
GRANT EXECUTE ON koe_api.ny TO koe_runtime;
""",
    "kolonne som kan være NULL, og en med DEFAULT": """
ALTER TABLE koe.hendelse ADD merknad nvarchar(200) NULL;
ALTER TABLE koe.hendelse ADD
  teller int NOT NULL CONSTRAINT hendelse_teller DEFAULT 0,
  kilde nvarchar(20) NULL CONSTRAINT hendelse_kilde CHECK (kilde <> N'');
""",
    "fremmednøkkel fra en kolonne fila legger til": """
CREATE TABLE koe.nytt_vern (id int NOT NULL PRIMARY KEY);
ALTER TABLE koe.toemmingsvern ADD nytt_vern int NULL;
GO
ALTER TABLE koe.toemmingsvern ADD CONSTRAINT vern_ny FOREIGN KEY (nytt_vern) REFERENCES koe.nytt_vern (id);
""",
    "tekst med forbudte ord": "INSERT INTO koe.ny (id) VALUES (N'DROP TABLE koe.hendelse');\n",
}

AVVIST = {
    "DROP TABLE": ("DROP TABLE koe.hendelse;", "DROP"),
    "DROP COLUMN": ("ALTER TABLE koe.hendelse DROP COLUMN merknad;", "DROP"),
    "ALTER COLUMN": ("ALTER TABLE koe.hendelse ALTER COLUMN merknad nvarchar(10);", "ALTER"),
    "UPDATE av rader": ("UPDATE koe.hendelse SET merknad = N'';", "UPDATE"),
    "DELETE av rader": ("DELETE koe.hendelse;", "DELETE"),
    "CREATE OR ALTER": ("CREATE OR ALTER PROCEDURE koe_api.x AS SELECT 1;", "CREATE OR ALTER"),
    "dynamisk SQL": ("EXEC (N'SELECT 1');", "EXEC"),
    "sp_rename": ("EXEC sp_rename N'koe.a', N'b';", "EXEC"),
    "REVOKE": ("REVOKE SELECT ON koe.hendelse FROM koe_runtime;", "REVOKE"),
    "NOT NULL uten DEFAULT": ("ALTER TABLE koe.hendelse ADD x int NOT NULL;", "NOT NULL uten DEFAULT"),
    "skranke på en eksisterende tabell": (
        "ALTER TABLE koe.hendelse ADD CONSTRAINT k CHECK (versjon > 0);", "en skranke på koe.hendelse"),
    "unik indeks på en eksisterende tabell": (
        "CREATE UNIQUE INDEX u ON koe.hendelse (event_id);", "en unik indeks på koe.hendelse"),
    "trigger på en eksisterende tabell": (
        "CREATE TRIGGER koe.t ON koe.hendelse AFTER INSERT AS THROW 51001, N'x', 1;",
        "en trigger på koe.hendelse"),
    "predikat på en eksisterende tabell": (
        "ALTER SECURITY POLICY koe_sikkerhet.tilgang ADD FILTER PREDICATE koe_sikkerhet.medlem(p) ON koe.hendelse;",
        "et predikat på koe.hendelse"),
    "policyen slått av": ("ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = OFF);", "STATE"),
    "to setninger uten ;": (
        "CREATE TABLE koe.a (x int)\nALTER TABLE koe.hendelse ADD y int NOT NULL", "ALTER etter starten"),
    "fremmednøkkel fra en eksisterende kolonne": (
        "ALTER TABLE koe.hendelse ADD FOREIGN KEY (sak_id) REFERENCES koe.sak_metadata (sak_id);",
        "en fremmednøkkel på koe.hendelse"),
    "ukjent setning": ("IF 1 = 1 SELECT 1;", "setningen som begynner med «IF"),
}


@pytest.mark.parametrize("tekst", GODTATT.values(), ids=GODTATT.keys())
def test_en_migrasjon_som_bare_legger_til_godtas(tekst):
    assert tilleggsregel.kontroller(tekst) == []


@pytest.mark.parametrize("tekst,grunn", AVVIST.values(), ids=AVVIST.keys())
def test_en_migrasjon_som_fjerner_endrer_eller_strammer_inn_avvises(tekst, grunn):
    funn = tilleggsregel.kontroller(tekst)
    assert any(grunn in f for f in funn), funn


def _vakt(monkeypatch, foerste_ekte_sak):
    spek = importlib.util.spec_from_file_location("migrasjonsvakt", SKRIPTER / "migrasjonsvakt.py")
    modul = importlib.util.module_from_spec(spek)
    spek.loader.exec_module(modul)
    monkeypatch.setattr(modul, "FOERSTE_EKTE_SAK", foerste_ekte_sak)
    return modul


@pytest.mark.parametrize("navn,feiler", [
    ("20261201000000_ny.sql", True),
    ("20261201000000_ny_fjerning.sql", False),
    ("20261101000000_foer.sql", False),
])
def test_etter_foerste_ekte_sak_er_en_ny_sqlserver_migrasjon_markert(monkeypatch, navn, feiler):
    vakt = _vakt(monkeypatch, "20261115000000")
    funn = vakt.to_trinn("database/migrasjoner", navn, navn[:14])
    assert bool(funn) is feiler, funn
    assert vakt.to_trinn("supabase/migrations", navn, navn[:14]) == []


def test_uten_foerste_ekte_sak_kreves_ingen_markering(monkeypatch):
    vakt = _vakt(monkeypatch, None)
    assert vakt.to_trinn("database/migrasjoner", "20261201000000_ny.sql", "20261201000000") == []
