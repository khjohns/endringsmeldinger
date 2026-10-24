"""Byggestatusen til vedtakene, laget av koden og issuene, og vakten mot byggestatus ført
for hånd i folge (#1021).

Forventningen er oppdragsgivers svar 20.10 på spørsmål 4: «Byggestatusen i registeret
genereres av koden og lukkede issues, ikke for hånd.» Eksemplet er VS-U16 i issuet, som
sier «Ikke bygget» og viser til #411, som ble lukket 12.10.
"""

import datetime

import pytest

from tests.verktoy import last

bs = last("byggestatus")
vr = bs.vr


def importert(anker: str, folge: str) -> dict:
    return {
        "anker": anker,
        "vedtak": f'{anker.upper()}: et vedtak',
        "vedtatt": "12.10, oppdragsgiver (#411)",
        "folge": folge,
    }


def register(*poster: dict) -> dict:
    return {"gruppe": [{"tittel": "Gruppen", "vedtak": list(poster)}]}


def ny(id_: str, folge: str) -> dict:
    return {
        "id": id_,
        "dato": datetime.date(2026, 10, 24),
        "hvem": "oppdragsgiver",
        "kilde": ["#1021"],
        "sporsmal": "Spørsmålet?",
        "valgt": "A",
        "svar": "A",
        "alternativ": [{"navn": "A", "tekst": "Vedtaket."}],
        "folge": folge,
    }


VS_U16 = importert("vs-u16", "Snevrer inn VS-U15. Ikke bygget. Bygges i #411")


def test_henvisningene_i_koden_deles_i_kode_og_tester(tmp_path):
    for sti, tekst in {
        "kjerne/kommandoer/forutsetninger.ts": "// VS-U16: avvist etter kravet\n",
        "kjerne/tester/forutsetninger.test.ts": "it('VS-U16 avviser', () => {})\n",
        "src/lib/a.ts": "// KA-U1\n",
        "annet/b.ts": "// VS-U16\n",
    }.items():
        (tmp_path / sti).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / sti).write_text(tekst, encoding="utf-8")
    assert bs.henvisninger_i_koden(tmp_path) == {
        "VS-U16": {
            "kode": ["kjerne/kommandoer/forutsetninger.ts"],
            "tester": ["kjerne/tester/forutsetninger.test.ts"],
        },
        "KA-U1": {"kode": ["src/lib/a.ts"], "tester": []},
    }


def test_ikke_bygget_med_kode_og_lukket_issue_gir_begge_avvikene():
    koden = {"VS-U16": {"kode": ["kjerne/kommandoer/forutsetninger.ts"], "tester": []}}
    r = bs.status(VS_U16, koden, {411: {"lukket": True, "pr": False}})
    assert r["for_haand"] == "Ikke bygget"
    assert r["issues"] == [{"nummer": 411, "lukket": True, "pr": False}]
    assert r["avvik"] == [
        "Følge sier «Ikke bygget», men produksjonskoden viser til vedtaket",
        "Følge sier «Ikke bygget», og issuene som bygger vedtaket, er lukket",
    ]


@pytest.mark.parametrize(
    "koden, tilstander",
    [
        ({"VS-U16": {"kode": [], "tester": ["kjerne/tester/a.test.ts"]}}, {411: {"lukket": False, "pr": False}}),
        ({}, {411: {"lukket": False, "pr": False}, 412: {"lukket": True, "pr": False}}),
    ],
    ids=["bare-tester-og-aapent-issue", "ett-av-issuene-aapent"],
)
def test_ingen_avvik_naar_bare_testene_viser_til_vedtaket_og_et_issue_er_aapent(
    koden, tilstander
):
    post = importert("vs-u16", "Ikke bygget. Bygges i #411 og #412")
    assert bs.status(post, koden, tilstander)["avvik"] == []


def test_et_issue_utenfor_setningen_om_byggingen_teller_ikke():
    """Issuet der spørsmålet ble stilt, som #410 hos KA-U33, bygger ikke vedtaket."""
    post = importert("vs-u16", "Spørsmålet står på #410. Ikke bygget. Bygges i #411")
    tilstander = {410: {"lukket": True, "pr": False}, 411: {"lukket": False, "pr": False}}
    assert bs.status(post, {}, tilstander)["avvik"] == []
    post = importert("vs-u16", "Spørsmålet står på #410. Ikke bygget")
    assert bs.status(post, {}, {410: {"lukket": True, "pr": False}})["avvik"] == []


def test_et_issue_lukket_som_ikke_planlagt_er_ikke_bygget():
    tilstander = {411: {"lukket": True, "ikke_planlagt": True, "pr": False}}
    r = bs.status(VS_U16, {}, tilstander)
    assert r["avvik"] == []
    assert "#411 lukket som ikke planlagt" in bs.markdown([r], hentet=True)


def test_ikke_bygget_midt_i_en_setning_er_ikke_statusen():
    """Som KA-U22: «Delvis bygget», og en del av vedtaket «er ikke bygget»."""
    post = importert("vs-u16", "Delvis bygget, kontrollert 20.10 (#417). Sperren er ikke bygget")
    r = bs.status(post, {"VS-U16": {"kode": ["kjerne/a.ts"], "tester": []}}, {})
    assert r["for_haand"] == "Delvis bygget"
    assert r["avvik"] == []


def test_et_svar_som_ikke_er_en_liste_gir_ukjent_tilstand(monkeypatch):
    def svar(*_, **__):
        return bs.subprocess.CompletedProcess([], 0, stdout='{"message": "Not Found"}')

    monkeypatch.setattr(bs.subprocess, "run", svar)
    assert bs.hent_tilstander() is None


def test_en_lukket_pr_gjoer_ikke_issuene_lukket():
    post = importert("vs-u16", "Ikke bygget i PR #654")
    r = bs.status(post, {}, {654: {"lukket": True, "pr": True}})
    assert r["avvik"] == []


@pytest.mark.parametrize("tilstander", [None, {}], ids=["ikke-hentet", "ukjent-nummer"])
def test_ukjent_tilstand_er_verken_aapen_eller_lukket(tilstander):
    r = bs.status(VS_U16, {}, tilstander)
    assert r["issues"] == [{"nummer": 411}]
    assert r["avvik"] == []
    assert "#411 ukjent" in bs.markdown([r], hentet=tilstander is not None)


def test_den_siste_statusen_i_folge_gjelder():
    post = importert("vs-u16", "Ikke bygget. Bygget 16.10 i #411")
    koden = {"VS-U16": {"kode": ["kjerne/a.ts"], "tester": []}}
    r = bs.status(post, koden, {411: {"lukket": True, "pr": False}})
    assert r["for_haand"] == "Bygget"
    assert r["avvik"] == []


def test_et_anker_i_folge_er_ikke_et_issue():
    assert bs.nevnte_issues("Presiserer [VS-U15](#vs-u15). Bygges i #411, se PR #1018") == [411, 1018]


@pytest.mark.parametrize(
    "folge, status",
    [
        ("Ikke bygget. Bygges i #411", ["Ikke bygget"]),
        ("Delvis bygget, kontrollert 20.10", ["Delvis bygget"]),
        ("Del 2\nbygget 16.10", ["Del 2 bygget"]),
        ("Snevrer inn KA-U1. Bygget 16.10", ["Bygget"]),
        ("Ikke bygget (#371).", ["Ikke bygget"]),
        ("Bygges i #411", []),
        ("Registreres når § 34.1 er bygget", []),
    ],
)
def test_byggestatusen_i_folge(folge, status):
    assert vr.byggestatus_i(folge) == status


def test_vakta_godtar_byggestatusen_som_staar_fra_foer():
    gammel = register(VS_U16)
    lagt_til = register(importert("vs-u16", VS_U16["folge"] + ". Se også #1021"))
    assert vr.ny_byggestatus(gammel, lagt_til) == []


@pytest.mark.parametrize(
    "naa, melding",
    [
        (
            register(importert("vs-u16", VS_U16["folge"] + ". Bygget 24.10")),
            "VS-U16: byggestatus ført for hånd i folge («Bygget»)",
        ),
        (
            register(VS_U16, ny("XX-U1", "Ikke bygget")),
            "XX-U1: byggestatus ført for hånd i folge («Ikke bygget»)",
        ),
    ],
    ids=["lagt-til-i-importert", "ny-post"],
)
def test_vakta_melder_ny_byggestatus_i_folge(naa, melding):
    assert vr.ny_byggestatus(register(VS_U16), naa) == [
        f"{melding}; den lages av docs/verktoy/byggestatus.py"
    ]


def test_vakta_melder_en_byttet_status():
    gammel = register(ny("XX-U1", "Bygges i #1021. Ikke bygget"))
    naa = register(ny("XX-U1", "Bygges i #1021. Bygget 24.10"))
    assert vr.ny_byggestatus(gammel, naa) == [
        "XX-U1: byggestatus ført for hånd i folge («Bygget»); den lages av docs/verktoy/byggestatus.py"
    ]


def test_vakta_melder_byggestatus_i_en_merget_ny_post():
    gammel = register(ny("XX-U1", "Bygges i #1021"))
    naa = register(ny("XX-U1", "Bygges i #1021. Delvis bygget 24.10"))
    assert len(vr.ny_byggestatus(gammel, naa)) == 1
