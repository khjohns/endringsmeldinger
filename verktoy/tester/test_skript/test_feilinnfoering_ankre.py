"""Ankerkontrollen i server/tester/feilinnfoering.py (#937, #967), uten base.

Migrasjonene er syntetiske, i en midlertidig rot. Testene viser når kontrollen
regner en mutasjon i en migrasjon som død, ikke at feilinnføringene oppdages.
"""

import importlib.util
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / "server/tester/feilinnfoering.py"
_spec = importlib.util.spec_from_file_location("feilinnfoering", SKRIPT)
feilinnfoering = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(feilinnfoering)

FIL = "database/migrasjoner/20260101000000_a.sql"
SENERE = "database/migrasjoner/20260102000000_b.sql"
TIDLIGERE = "database/migrasjoner/20251231000000_0.sql"

PROSEDYRE = "CREATE PROCEDURE koe_api.skriv AS\nBEGIN\n  SELECT 1; -- ankeret\nEND\nGO\n"
TRIGGER = (
    "CREATE TRIGGER koe.t_uforanderlig ON koe.t INSTEAD OF UPDATE, DELETE AS\n"
    "BEGIN\n  THROW 51001, N'ankeret', 1;\nEND\nGO\n"
)


def ankerfeil(tmp_path, filer, fra, fil=FIL):
    for navn, tekst in filer.items():
        (tmp_path / navn).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / navn).write_text(tekst)
    return feilinnfoering.ankerfeil(tmp_path, fil, fra)


def test_uten_senere_definisjon_er_ankeret_levende(tmp_path):
    assert ankerfeil(tmp_path, {FIL: PROSEDYRE, SENERE: "SELECT 2;\nGO\n"}, "SELECT 1; -- ankeret") is None


def test_et_anker_som_ikke_finnes_eller_finnes_to_ganger_avvises(tmp_path):
    assert ankerfeil(tmp_path, {FIL: PROSEDYRE}, "finnes ikke") == "finner ikke stedet"
    assert ankerfeil(tmp_path, {FIL: PROSEDYRE + PROSEDYRE}, "SELECT 1;") == "finner ikke stedet"


def test_en_tidligere_migrasjon_teller_ikke(tmp_path):
    filer = {TIDLIGERE: "CREATE OR ALTER PROCEDURE koe_api.skriv AS SELECT 0;\nGO\n", FIL: PROSEDYRE}
    assert ankerfeil(tmp_path, filer, "SELECT 1; -- ankeret") is None


@pytest.mark.parametrize(
    "senere",
    [
        "CREATE OR ALTER PROCEDURE koe_api.skriv AS SELECT 2;\nGO\n",
        "create or alter proc [koe_api].[skriv] as select 2;\nGO\n",
        "ALTER  PROCEDURE\tkoe_api.SKRIV AS SELECT 2;\nGO\n",
    ],
    ids=["samme-form", "proc-hakeparenteser-smaa-bokstaver", "flere-mellomrom-store-bokstaver"],
)
def test_en_ny_definisjon_i_en_senere_migrasjon_gjoer_ankeret_doedt(tmp_path, senere):
    feil = ankerfeil(tmp_path, {FIL: PROSEDYRE, SENERE: senere}, "SELECT 1; -- ankeret")
    assert feil == "koe_api.skriv defineres på nytt i 20260102000000_b.sql"


def test_drop_if_exists_i_en_senere_migrasjon_gjoer_ankeret_doedt(tmp_path):
    feil = ankerfeil(tmp_path, {FIL: PROSEDYRE, SENERE: "DROP PROCEDURE IF EXISTS koe_api.skriv;\nGO\n"}, "-- ankeret")
    assert feil == "koe_api.skriv slettes i 20260102000000_b.sql"


def test_en_ny_definisjon_senere_i_samme_fil_gjoer_ankeret_doedt(tmp_path):
    kilde = PROSEDYRE + "CREATE OR ALTER PROCEDURE koe_api.skriv AS SELECT 2;\nGO\n"
    assert ankerfeil(tmp_path, {FIL: kilde}, "-- ankeret") == "koe_api.skriv defineres på nytt i 20260101000000_a.sql"


def test_en_definisjon_foran_ankeret_i_samme_fil_teller_ikke(tmp_path):
    kilde = "CREATE PROCEDURE koe_api.skriv AS SELECT 0;\nGO\nALTER PROCEDURE koe_api.skriv AS\nBEGIN\n  SELECT 1; -- ankeret\nEND\nGO\n"
    assert ankerfeil(tmp_path, {FIL: kilde}, "-- ankeret") is None


def test_objektet_er_det_i_go_satsen_der_ankeret_begynner(tmp_path):
    # Ankeret begynner med triggerens egen CREATE og spenner over GO, som S41.
    kilde = "CREATE FUNCTION koe.f() RETURNS int AS BEGIN RETURN 1 END\nGO\n" + TRIGGER
    senere = "CREATE OR ALTER FUNCTION koe.f() RETURNS int AS BEGIN RETURN 2 END\nGO\n"
    assert ankerfeil(tmp_path, {FIL: kilde, SENERE: senere}, TRIGGER) is None
    senere += "CREATE OR ALTER TRIGGER koe.t_uforanderlig ON koe.t INSTEAD OF DELETE AS SELECT 1;\nGO\n"
    assert ankerfeil(tmp_path, {FIL: kilde, SENERE: senere}, TRIGGER) == (
        "koe.t_uforanderlig defineres på nytt i 20260102000000_b.sql"
    )


def test_en_sats_uten_definisjon_kontrolleres_ikke_mot_funksjonen_foran(tmp_path):
    # Som S17: en policy i en egen sats etter en funksjon som defineres på nytt senere.
    kilde = (
        "CREATE FUNCTION koe.f() RETURNS int AS BEGIN RETURN 1 END\nGO\n"
        "ALTER SECURITY POLICY koe.p\n  ADD BLOCK PREDICATE koe.f() ON koe.t AFTER INSERT;\nGO\n"
    )
    senere = "CREATE OR ALTER FUNCTION koe.f() RETURNS int AS BEGIN RETURN 2 END\nGO\n"
    assert ankerfeil(tmp_path, {FIL: kilde, SENERE: senere}, "ADD BLOCK PREDICATE") is None


@pytest.mark.parametrize(
    ("senere", "forventet"),
    [
        ("DROP TABLE koe.t;\nGO\n", "tabellen koe.t for koe.t_uforanderlig slettes i 20260102000000_b.sql"),
        ("DROP TABLE IF EXISTS koe.annen, [koe].[t];\nGO\n", "tabellen koe.t for koe.t_uforanderlig slettes i 20260102000000_b.sql"),
        ("EXEC sp_rename N'koe.t', N't2';\nGO\n", "koe.t får nytt navn i 20260102000000_b.sql"),
    ],
    ids=["drop-table", "drop-table-liste", "sp-rename"],
)
def test_en_trigger_er_doed_naar_tabellen_forsvinner(tmp_path, senere, forventet):
    assert ankerfeil(tmp_path, {FIL: TRIGGER, SENERE: senere}, "N'ankeret'") == forventet


def test_en_annen_tabell_eller_en_kolonne_som_faar_nytt_navn_teller_ikke(tmp_path):
    senere = "DROP TABLE koe.t2;\nGO\nEXEC sp_rename N'koe.t.kol', N'kol2', N'COLUMN';\nGO\n"
    assert ankerfeil(tmp_path, {FIL: TRIGGER, SENERE: senere}, "N'ankeret'") is None


def test_et_anker_utenfor_migrasjonene_kontrolleres_bare_for_stedet(tmp_path):
    filer = {"server/x.ts": "const a = 1;\n", SENERE: "DROP PROCEDURE koe_api.skriv;\n"}
    assert ankerfeil(tmp_path, filer, "const a = 1;", fil="server/x.ts") is None
