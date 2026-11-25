"""Oppdateringen av en kjerne-PR mot main i .github/scripts/oppdater_kjerne_pr.py (#2293).

Hvert tilfelle bygger et eget git-repo med en base og en PR-gren, kjører skriptet med
`--lokal` og kontrollerer grenen og regelversjonsvakten etterpå.
"""

import importlib.util
import os
import subprocess
import sys
from pathlib import Path

import pytest

SKRIPTER = Path(__file__).resolve().parents[3] / ".github/scripts"
SKRIPT = SKRIPTER / "oppdater_kjerne_pr.py"

REGELSETT = "kjerne/regler/regelsett.ts"
VERSJON = "kjerne/versjon.ts"
STARTJOURNALER = "docs/domenetabell/brukerforlop/startjournaler.json"


def _last():
    spes = importlib.util.spec_from_file_location("oppdater_kjerne_pr", SKRIPT)
    modul = importlib.util.module_from_spec(spes)
    spes.loader.exec_module(modul)
    return modul


oppdater = _last()


def _miljo() -> dict[str, str]:
    miljo = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    return {**miljo, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t"}


def _git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True, env=_miljo()).stdout.strip()


def _skriv(repo: Path, filer: dict[str, str], melding: str = "endring") -> None:
    for sti, innhold in filer.items():
        (repo / sti).parent.mkdir(parents=True, exist_ok=True)
        (repo / sti).write_text(innhold)
    _git(repo, "add", "-A")
    _git(repo, "commit", "-qm", melding)


def _versjoner(regel: int, projeksjon: int, ekstra: str = "") -> dict[str, str]:
    return {
        REGELSETT: f"export const REGELVERSJON = {regel};\n{ekstra}",
        VERSJON: f"export const PROJEKSJONSVERSJON = {projeksjon};\n",
    }


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    sti = tmp_path / "repo"
    sti.mkdir()
    _git(sti, "init", "-q", "-b", "main")
    _skriv(
        sti,
        {
            **_versjoner(5, 2),
            "kjerne/regler/frist.ts": "export const a = 1;\n",
            "kjerne/utled.ts": "export const a = 1;\n",
            "kjerne/frosset/standpunkt.ts": "export const a = 1;\n",
            "kjerne/format/format.ts": "export const FORMAT = 1;\nexport const LESERFORMAT = 1;\n",
            STARTJOURNALER: '{"regelversjon": 5}\n',
            "README.md": "a\n",
        },
    )
    _git(sti, "branch", "pr")
    return sti


def _pr(repo: Path, filer: dict[str, str]) -> None:
    _git(repo, "checkout", "-q", "pr")
    _skriv(repo, filer)
    _git(repo, "checkout", "-q", "main")


def _kjor(repo: Path, tmp_path: Path, *ekstra: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SKRIPT), "pr", "--lokal", "--mappe", str(tmp_path / "tre"), *ekstra],
        cwd=repo, capture_output=True, text=True, env=_miljo(),
    )


def _fil(repo: Path, ref: str, sti: str) -> str:
    return _git(repo, "show", f"{ref}:{sti}")


def _vakt(repo: Path, ref: str, base: str) -> subprocess.CompletedProcess:
    _git(repo, "checkout", "-q", "--detach", ref)
    try:
        return subprocess.run(
            ["bash", str(SKRIPTER / "regelversjon.sh")], cwd=repo, capture_output=True, text=True,
            env={**{k: v for k, v in os.environ.items() if not k.startswith("GIT_")}, "BASE": base},
        )
    finally:
        _git(repo, "checkout", "-q", "main")


def test_samme_okning_paa_begge_sider_gir_en_ny_over_basen(repo, tmp_path):
    """Git fletter to like økninger uten konflikt, og vakten ville avvist resultatet."""
    _pr(repo, {"kjerne/regler/frist.ts": "export const a = 2;\n", **_versjoner(6, 2)})
    _skriv(repo, {"kjerne/regler/ny.ts": "export const b = 1;\n", **_versjoner(6, 2)})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 0, svar.stderr
    tre = tmp_path / "tre"
    assert "export const REGELVERSJON = 7;" in (tre / REGELSETT).read_text()
    assert "REGELVERSJON 6 -> 7" in svar.stdout


def test_ulike_okninger_i_konflikt_tar_basens_tall_pluss_en(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 4)})
    _skriv(repo, {"kjerne/regler/frist.ts": "export const a = 2;\n", **_versjoner(6, 3)})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 0, svar.stderr + svar.stdout
    assert f"Løste konflikter i: {VERSJON}" in svar.stdout
    tre = tmp_path / "tre"
    assert (tre / VERSJON).read_text() == "export const PROJEKSJONSVERSJON = 4;\n"
    assert (tre / REGELSETT).read_text() == "export const REGELVERSJON = 6;\n"
    ny = _git(tre, "rev-parse", "HEAD")
    assert _vakt(repo, ny, _git(repo, "rev-parse", "main")).returncode == 0


def test_uten_push_staar_grenen_urort(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    for_ = _git(repo, "rev-parse", "pr")
    _skriv(repo, {"kjerne/ny.ts": "export const c = 1;\n", **_versjoner(5, 3)})
    assert _kjor(repo, tmp_path).returncode == 0
    assert _git(repo, "rev-parse", "pr") == for_


def test_push_flytter_grenen_til_det_vakten_godtar(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    _skriv(repo, {"kjerne/ny.ts": "export const c = 1;\n", **_versjoner(5, 3)})
    _git(repo, "remote", "add", "origin", str(repo))
    svar = _kjor(repo, tmp_path, "--push", "--remote", "origin")
    assert svar.returncode == 0, svar.stderr
    assert _fil(repo, "pr", VERSJON) == "export const PROJEKSJONSVERSJON = 4;"
    assert _git(repo, "merge-base", "--is-ancestor", "main", "pr") == ""
    assert _vakt(repo, "pr", _git(repo, "rev-parse", "main")).returncode == 0
    assert not (tmp_path / "tre").exists()


def test_hoeyere_versjon_paa_grenen_endres_ikke(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 9)})
    _skriv(repo, {"README.md": "b\n"})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 0, svar.stderr
    assert "Økte" not in svar.stdout
    tre = tmp_path / "tre"
    assert _git(tre, "log", "-1", "--format=%s")== "flett main inn i pr"


def test_annen_konflikt_stopper_uten_endring(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    for_ = _git(repo, "rev-parse", "pr")
    _skriv(repo, {"kjerne/utled.ts": "export const a = 3;\n", **_versjoner(5, 3)})
    svar = _kjor(repo, tmp_path, "--push")
    assert svar.returncode == 1
    assert "kjerne/utled.ts" in svar.stderr
    assert _git(repo, "rev-parse", "pr") == for_
    assert not (tmp_path / "tre").exists()


def test_konflikt_utenfor_versjonslinja_i_versjonsfila_stopper(repo, tmp_path):
    _pr(repo, {"kjerne/regler/frist.ts": "export const a = 2;\n", **_versjoner(6, 2, "export const x = 1;\n")})
    _skriv(repo, {"kjerne/regler/ny.ts": "export const b = 1;\n", **_versjoner(6, 2, "export const x = 2;\n")})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 1
    assert REGELSETT in svar.stderr


def test_slettet_versjonsfil_i_konflikt_stopper(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    _git(repo, "rm", "-q", VERSJON)
    _git(repo, "commit", "-qm", "slett")
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 1, svar.stdout
    assert "Traceback" not in svar.stderr
    assert VERSJON in svar.stderr
    assert not (tmp_path / "tre").exists()


def test_vakt_som_feiler_stopper_og_lar_worktreen_staa(repo, tmp_path):
    """Formatet økt uten leseren først (B-10): vakten feiler, og skriptet kan ikke rette det."""
    _pr(repo, {"kjerne/format/format.ts": "export const FORMAT = 2;\nexport const LESERFORMAT = 2;\n", **_versjoner(5, 3)})
    _skriv(repo, {"README.md": "b\n"})
    svar = _kjor(repo, tmp_path, "--push")
    assert svar.returncode == 1
    assert "Regelversjonsvakten feiler" in svar.stderr
    assert (tmp_path / "tre").exists()
    assert "git worktree remove --force" in svar.stderr


def test_konflikt_i_generert_fil_tar_basens_innhold(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", STARTJOURNALER: '{"regelversjon": 6}\n', **_versjoner(5, 3)})
    _skriv(repo, {STARTJOURNALER: '{"regelversjon": 7}\n'})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 0, svar.stderr
    assert (tmp_path / "tre" / STARTJOURNALER).read_text() == '{"regelversjon": 7}\n'


def test_grenen_som_alt_har_basen_endres_ikke(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    svar = _kjor(repo, tmp_path, "--push")
    assert svar.returncode == 0
    assert "Ingenting å gjøre" in svar.stdout
    assert not (tmp_path / "tre").exists()


@pytest.mark.parametrize(
    "innhold, ventet",
    [
        pytest.param(
            "a\n<<<<<<< HEAD\nexport const X = 3;\n=======\nexport const X = 4;\n>>>>>>> main\nb\n",
            "a\nexport const X = 4;\nb\n",
            id="bare versjonslinja",
        ),
        pytest.param(
            "<<<<<<< HEAD\nexport const X = 3;\nc\n=======\nexport const X = 4;\n>>>>>>> main\n",
            None,
            id="mer enn versjonslinja",
        ),
        pytest.param(
            "<<<<<<< HEAD\nexport const Y = 3;\n=======\nexport const Y = 4;\n>>>>>>> main\n",
            None,
            id="en annen konstant",
        ),
        pytest.param("export const X = 3;\n", None, id="uten konfliktmarkører"),
    ],
)
def test_versjonskonflikten_loses_bare_for_versjonslinja(innhold, ventet):
    assert oppdater.los_versjonskonflikt(innhold, "X") == ventet


FEILINNFOERINGER = "kjerne/tester/feilinnfoering.ts"
LISTEHODE = "type Mutasjon = { id: string; fil: string; endringer: [string, string][] };\n\nconst MUTASJONER: Mutasjon[] = [\n"
# Det som trengs av `--ankre` i kjerne/tester/feilinnfoering.ts: like ID-er og ankre som
# ikke finnes nøyaktig én gang, gir rød kjøring.
LISTEHALE = """];
import { readFileSync } from 'node:fs';
const doble = MUTASJONER.map((m) => m.id).filter((id, i, alle) => alle.indexOf(id) !== i);
if (doble.length) throw new Error(`Feilinnføringene har samme ID: ${doble.join(', ')}`);
for (const m of MUTASJONER)
  for (const [fra] of m.endringer)
    if (readFileSync(m.fil, 'utf8').split(fra).length !== 2) throw new Error(`${m.id}: «${fra}» finnes ikke`);
console.log(`Ankrene i ${MUTASJONER.length} feilinnføringer finnes nøyaktig én gang.`);
"""


def _post(id_: str, anker: str = "export const a", kommentar: str = "") -> str:
    return f"{kommentar}  {{\n    id: '{id_}',\n    fil: 'kjerne/utled.ts',\n    endringer: [['{anker}', 'export let a']],\n  }},\n"


def _liste(*poster: str, hode: str = LISTEHODE) -> dict[str, str]:
    return {FEILINNFOERINGER: hode + "".join(poster) + LISTEHALE}


def _ider(tekst: str) -> list[str]:
    return [p[0] for p in oppdater.del_liste(tekst).poster]


@pytest.fixture
def liste_repo(repo: Path) -> Path:
    """Forfaren har F1 og F2 i feilinnføringslista, og grenen og basen går ut fra den."""
    _skriv(repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n")))
    _git(repo, "branch", "-f", "pr")
    return repo


def test_nye_poster_paa_begge_sider_gir_basens_liste_og_saa_grenens(liste_repo, tmp_path):
    _pr(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n"), _post("F2342a"), _post("F2342b")))
    _skriv(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n"), _post("F2280a")))
    svar = _kjor(liste_repo, tmp_path)
    assert svar.returncode == 0, svar.stderr + svar.stdout
    assert f"Løste konflikter i: {FEILINNFOERINGER}" in svar.stdout
    assert "Omnummererte" not in svar.stdout
    assert "Ankrene i 5 feilinnføringer" in svar.stdout
    tekst = (tmp_path / "tre" / FEILINNFOERINGER).read_text()
    assert _ider(tekst) == ["F1", "F2", "F2280a", "F2342a", "F2342b"]
    assert "  // F2 er fra #2.\n" in tekst


@pytest.mark.parametrize(
    "id_, ny",
    [
        pytest.param("F2280a", "F2280b", id="bokstavsuffiks"),
        pytest.param("F3", "F4", id="bare tall, som F797 som ble F815"),
    ],
)
def test_ny_post_med_en_id_basen_har_faar_neste_ledige_id(liste_repo, tmp_path, id_, ny):
    _pr(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n"), _post(id_, kommentar="  // grenens\n")))
    _skriv(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n"), _post(id_)))
    svar = _kjor(liste_repo, tmp_path)
    assert svar.returncode == 0, svar.stderr + svar.stdout
    assert f"Omnummererte feilinnføringen {id_} -> {ny}" in svar.stdout
    tre = tmp_path / "tre"
    tekst = (tre / FEILINNFOERINGER).read_text()
    assert _ider(tekst) == ["F1", "F2", id_, ny]
    assert f"  // grenens\n  {{\n    id: '{ny}'," in tekst
    assert f"{id_} -> {ny}" in _git(tre, "log", "-1", "--merges", "--format=%b")


def test_grenen_som_endrer_en_post_fra_forfaren_stopper_uten_endring(liste_repo, tmp_path):
    _pr(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er endret.\n"), _post("F3")))
    for_ = _git(liste_repo, "rev-parse", "pr")
    _skriv(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n"), _post("F2280a")))
    svar = _kjor(liste_repo, tmp_path, "--push")
    assert svar.returncode == 1, svar.stdout
    assert "endrer eller fjerner feilinnføringer som finnes i forfaren: F2" in svar.stderr
    assert _git(liste_repo, "rev-parse", "pr") == for_
    assert not (tmp_path / "tre").exists()


def test_rode_ankre_etter_flettingen_stopper_og_lar_worktreen_staa(liste_repo, tmp_path):
    _pr(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n"), _post("F2342a", anker="export const borte")))
    _skriv(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n"), _post("F2280a")))
    svar = _kjor(liste_repo, tmp_path, "--push")
    assert svar.returncode == 1, svar.stdout
    assert "--ankre feiler etter flettingen" in svar.stderr
    assert "F2342a: «export const borte» finnes ikke" in svar.stderr
    assert (tmp_path / "tre").exists()


@pytest.mark.parametrize(
    "grenens",
    [
        pytest.param([_post("F1", anker="export const b"), _post("F3")], id="endret post"),
        pytest.param([_post("F3")], id="fjernet post"),
    ],
)
def test_grenen_som_endrer_eller_fjerner_en_post_fra_forfaren_stopper(grenens):
    """Prøver avgjørelsen direkte, fordi git ikke alltid gir konflikt når grenen fjerner en post."""
    forfar = _liste(_post("F1"))[FEILINNFOERINGER]
    base = _liste(_post("F1"), _post("F2280a"))[FEILINNFOERINGER]
    with pytest.raises(oppdater.Stopp, match="som finnes i forfaren: F1"):
        oppdater.flett_feilinnfoeringer(forfar, _liste(*grenens)[FEILINNFOERINGER], base)


def test_lik_id_som_git_fletter_uten_konflikt_stopper_paa_ankrene(liste_repo, tmp_path):
    _pr(liste_repo, _liste(_post("F1"), _post("F2280a"), _post("F2", kommentar="  // F2 er fra #2.\n")))
    _skriv(liste_repo, _liste(_post("F1"), _post("F2", kommentar="  // F2 er fra #2.\n"), _post("F2280a")))
    svar = _kjor(liste_repo, tmp_path, "--push")
    assert svar.returncode == 1, svar.stdout
    assert "Løste konflikter" not in svar.stdout
    assert "Feilinnføringene har samme ID: F2280a" in svar.stderr


def test_lik_id_to_ganger_paa_en_side_stopper_med_id_en():
    with pytest.raises(oppdater.Stopp, match="samme ID flere ganger på én side av flettingen: F1"):
        oppdater.del_liste(_liste(_post("F1"), _post("F1"))[FEILINNFOERINGER])


def test_teksten_rundt_lista_flettes_fra_begge_sider():
    forfar = _liste(_post("F1"))[FEILINNFOERINGER]
    gren = _liste(_post("F1"), _post("F2342a"))[FEILINNFOERINGER].replace("doble.length", "doble.length > 0")
    base = _liste(_post("F1"), _post("F2280a"), hode="// basen\n" + LISTEHODE)[FEILINNFOERINGER]
    tekst, omnummerert = oppdater.flett_feilinnfoeringer(forfar, gren, base)
    assert omnummerert == []
    assert tekst.startswith("// basen\n")
    assert "doble.length > 0" in tekst
    assert _ider(tekst) == ["F1", "F2280a", "F2342a"]


def test_samme_endring_utenfor_lista_paa_begge_sider_med_ulik_tekst_stopper():
    forfar = _liste(_post("F1"))[FEILINNFOERINGER]
    gren = _liste(_post("F1"), hode="// grenen\n" + LISTEHODE)[FEILINNFOERINGER]
    base = _liste(_post("F1"), hode="// basen\n" + LISTEHODE)[FEILINNFOERINGER]
    with pytest.raises(oppdater.Stopp, match="utenfor lista"):
        oppdater.flett_feilinnfoeringer(forfar, gren, base)


def test_lik_post_paa_begge_sider_staar_en_gang():
    forfar = _liste(_post("F1"))[FEILINNFOERINGER]
    begge = _liste(_post("F1"), _post("F2280a"))[FEILINNFOERINGER]
    tekst, omnummerert = oppdater.flett_feilinnfoeringer(forfar, begge, begge)
    assert (_ider(tekst), omnummerert) == (["F1", "F2280a"], [])


@pytest.mark.parametrize(
    "gammel, brukt, ny",
    [
        ("F2280a", {"F2280a", "F2280b", "F2281a"}, "F2280c"),
        ("F797", {"F797", "F814", "F12b", "F2280a"}, "F815"),
        ("F1a", {f"F1{c}" for c in "abcdefghijklmnopqrstuvwxyz"}, "F1aa"),
    ],
)
def test_ny_id_er_neste_ledige(gammel, brukt, ny):
    assert oppdater.ny_id(gammel, brukt) == ny


def test_post_uten_avsluttende_klamme_stopper():
    with pytest.raises(oppdater.Stopp, match="slutter ikke"):
        oppdater.del_liste(LISTEHODE + "  {\n    id: 'F1',\n" + LISTEHALE)
