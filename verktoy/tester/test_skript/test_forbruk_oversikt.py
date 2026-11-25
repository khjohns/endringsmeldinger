"""Kostnaden per økt i .claude/skills/forbruk/oversikt.py, lest av list_events (#2401)."""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / ".claude/skills/forbruk/oversikt.py"
_spec = importlib.util.spec_from_file_location("forbruk_oversikt", SKRIPT)
oversikt = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(oversikt)


def resultat(tid, kostnad, cache_read, kontekst):
    return {
        "created_at": tid,
        "result": {
            "internal_anthropic_catchall": {
                "total_cost_usd": kostnad,
                "modelUsage": {"modell": {"cacheReadInputTokens": cache_read}},
                "usage": {
                    "iterations": [
                        {"input_tokens": 1, "cache_read_input_tokens": 5},
                        {"input_tokens": 2, "cache_read_input_tokens": kontekst - 2},
                    ]
                },
            }
        },
    }


def svar(*hendelser):
    return json.dumps({"ccr": {"data": list(hendelser), "has_more": False}})


def transkripsjon(sti, kall):
    """En transkripsjon med ett list_events-kall og svaret per (økt, innhold)."""
    linjer = []
    for n, (okt, innhold) in enumerate(kall):
        bruk = {
            "type": "tool_use",
            "id": f"t{n}",
            "name": "mcp__claude-code-remote__list_events",
            "input": {"session_id": okt, "kinds": ["result"], "limit": 100},
        }
        resultat_blokk = {
            "type": "tool_result",
            "tool_use_id": f"t{n}",
            "content": innhold,
        }
        linjer.append(json.dumps({"message": {"content": [bruk]}}))
        linjer.append(json.dumps({"message": {"content": [resultat_blokk]}}))
    linjer.append("ikke json")
    sti.write_text("\n".join(linjer), encoding="utf-8")
    return sti


def test_kostnaden_summeres_over_omstarter_og_leses_ogsaa_fra_svar_lagret_til_fil(
    tmp_path,
):
    lagret = tmp_path / "svar.txt"
    lagret.write_text(svar(resultat("2026-11-20T10:00:00Z", 3.5, 900, 50_000)))
    sti = transkripsjon(
        tmp_path / "agent.jsonl",
        [
            (
                "session_a",
                [
                    {
                        "type": "text",
                        "text": svar(
                            resultat("2026-11-20T13:00:00Z", 1.0, 100, 80_000),
                            resultat("2026-11-20T11:30:00.5Z", 4.0, 400, 60_000),
                            resultat("2026-11-20T11:00:00Z", 2.0, 200, 40_000),
                        ),
                    }
                ],
            ),
            ("session_b", f"Output too large. Saved to {lagret} for reading."),
        ],
    )
    kostnad = oversikt.les_kostnad([sti])
    assert kostnad["session_a"]["cost_usd"] == 5.0
    assert kostnad["session_a"]["cache_read_tokens"] == 500
    assert kostnad["session_a"]["kontekst"] == 80_000
    assert kostnad["session_b"]["cost_usd"] == 3.5


def test_sammendraget_bruker_kostnaden_fra_hendelsene_og_melder_oekter_uten(
    tmp_path, monkeypatch, capsys
):
    side = tmp_path / "side.txt"
    oekt = {"created_at": "2026-11-20T09:00:00Z", "updated_at": "2026-11-21T09:00:00Z"}
    side.write_text(
        json.dumps(
            {
                "data": [
                    {"id": "session_b", "title": "bygg", **oekt},
                    {"id": "session_a", "title": "bygg", **oekt},
                ],
                "has_more": False,
            }
        )
    )
    sti = transkripsjon(
        tmp_path / "agent.jsonl",
        [("session_a", svar(resultat("2026-11-20T12:00:00Z", 7.0, 0, 1)))],
    )
    argv = ["oversikt.py", "--fra", "2026-11-19", "--til", "2026-11-26"]
    monkeypatch.setattr(
        sys, "argv", [*argv, "--transkripsjon", str(sti), "--", str(side)]
    )
    oversikt.main()
    ut = capsys.readouterr().out
    assert "1 økter uten result-hendelse: session_b" in ut
    assert "sum USD 7" in ut

    monkeypatch.setattr(sys, "argv", [*argv, "--ider", str(side)])
    oversikt.main()
    assert capsys.readouterr().out.split() == ["session_b", "session_a"]


def test_en_tur_uten_api_kall_nuller_ikke_konteksten(tmp_path):
    uten_kall = resultat("2026-11-20T13:00:00Z", 2.0, 0, 0)
    uten_kall["result"]["internal_anthropic_catchall"]["usage"] = {}
    sti = transkripsjon(
        tmp_path / "agent.jsonl",
        [
            (
                "session_a",
                svar(uten_kall, resultat("2026-11-20T12:00:00Z", 1.0, 0, 70_000)),
            )
        ],
    )
    assert oversikt.les_kostnad([sti])["session_a"]["kontekst"] == 70_000


def test_uten_transkripsjon_avvises_kjoeringen_i_stedet_for_aa_vise_null(
    tmp_path, monkeypatch
):
    side = tmp_path / "side.txt"
    side.write_text(json.dumps({"data": [], "has_more": False}))
    monkeypatch.setattr(
        sys,
        "argv",
        ["oversikt.py", "--fra", "2026-11-19", "--til", "2026-11-26", str(side)],
    )
    with pytest.raises(SystemExit):
        oversikt.main()
