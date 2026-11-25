"""Signalet om kompleksitet og filstørrelse til gjennomgangen i skillen `forbruk` (#2268).

Rapporten fra eslint er laget for hånd i formen `--format json` gir, så testen
ikke trenger node. Filstørrelsen leses av et eget git-repo i tmp_path.
"""

import subprocess

from verktoymoduler import last


def _melding(tekst: str, linje: int = 1, regel: str = "complexity") -> dict:
    return {"ruleId": regel, "message": tekst, "line": linje}


def _rapport(rot) -> list[dict]:
    return [
        {
            "filePath": str(rot / "kjerne" / "a.ts"),
            "messages": [
                _melding("Function 'stor' has a complexity of 25. Maximum allowed is 0.", 3),
                _melding("Arrow function has a complexity of 13. Maximum allowed is 0.", 9),
                _melding("Method 'liten' has a complexity of 2. Maximum allowed is 0.", 12),
                _melding("'x' is defined but never used.", 4, "no-unused-vars"),
            ],
        },
        {
            "filePath": str(rot / "kjerne" / "tester" / "a.test.ts"),
            "messages": [_melding("Function 'testen' has a complexity of 99. Maximum allowed is 0.")],
        },
        {
            "filePath": str(rot / "src" / "lib" / "b.test.ts"),
            "messages": [_melding("Function 'ogsaaTest' has a complexity of 99. Maximum allowed is 0.")],
        },
        {
            "filePath": str(rot / "server" / "c.ts"),
            "messages": [
                {"fatal": True, "message": "Parsing error", "line": 1},
                {"fatal": True, "message": "Parsing error", "line": 2},
            ],
        },
    ]


def test_funksjonene_telles_per_mappe_uten_testfilene(tmp_path):
    kompleksitet = last("kompleksitet")
    rader, uleste = kompleksitet.funksjoner(_rapport(tmp_path), tmp_path)
    assert [(r["mappe"], r["navn"], r["kompleksitet"]) for r in rader] == [
        ("kjerne", "stor", 25),
        ("kjerne", None, 13),
        ("kjerne", "liten", 2),
    ]
    assert rader[1]["sted"] == "kjerne/a.ts:9"
    assert uleste == ["server/c.ts", "server/c.ts"]


def test_tabellen_viser_antall_over_grensene_og_de_hoyeste(tmp_path):
    kompleksitet = last("kompleksitet")
    rader, _ = kompleksitet.funksjoner(_rapport(tmp_path), tmp_path)
    tabell = kompleksitet.tabell(rader, [("kjerne/a.ts", 40, 2048)], 10)
    assert "| `kjerne/` | 3 | 2 | 1 | `stor` (`kjerne/a.ts:3`) 25, `kjerne/a.ts:9` 13, `liten` (`kjerne/a.ts:12`) 2 |" in tabell
    assert "| `server/` | 0 | 0 | 0 |  |" in tabell
    assert "| `kjerne/a.ts` | 40 | 2 |" in tabell


def test_filstorrelsene_er_sporede_kildefiler_i_mappene_storst_forst(tmp_path):
    kompleksitet = last("kompleksitet")
    filer = {
        "kjerne/liten.ts": "a\n",
        "kjerne/ogsaa.ts": "a\n",
        "kjerne/tester/stor.test.ts": "a\n" * 5,
        "src/lib/Visning.svelte": "a\n" * 3,
        "src/lib/font.ttf": "a\n" * 50,
        "docs/utenfor.ts": "a\n" * 50,
    }
    for sti, innhold in filer.items():
        (tmp_path / sti).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / sti).write_text(innhold, encoding="utf-8")
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(["git", "add", "-A"], cwd=tmp_path, check=True)
    (tmp_path / "kjerne" / "liten.ts").rename(tmp_path / "kjerne" / "slettet.ts")
    (tmp_path / "server").mkdir()
    (tmp_path / "server" / "usporet.ts").write_text("a\n" * 50, encoding="utf-8")

    assert kompleksitet.filstorrelser(tmp_path) == [
        ("kjerne/tester/stor.test.ts", 5, 10),
        ("src/lib/Visning.svelte", 3, 6),
        ("kjerne/ogsaa.ts", 1, 2),
    ]


def test_skriptet_stopper_ingenting_naar_en_funksjon_er_over_grensene(tmp_path, monkeypatch, capsys):
    kompleksitet = last("kompleksitet")
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    monkeypatch.setattr(kompleksitet, "rot", lambda: tmp_path)
    monkeypatch.setattr(kompleksitet, "kjoer_eslint", lambda repo: _rapport(repo))
    assert kompleksitet.main([]) == 0
    utdata = capsys.readouterr().out
    assert "`stor` (`kjerne/a.ts:3`) 25" in utdata
    assert "eslint kunne ikke lese 1 filer: server/c.ts" in utdata
