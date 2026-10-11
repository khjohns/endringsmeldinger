"""CI-vakten i .github/scripts/regelversjon.sh mot konstruerte differ (#191, #216, #221, #308, #330, #309).

Hvert tilfelle bygger et eget git-repo med de to speilene, slik at skriptet
kjører uten å røre filene i dette repoet.
"""

import os
import subprocess
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / ".github/scripts/regelversjon.sh"
TS = "src/lib/domain/regelversjon.ts"
PY = "backend/regler/__init__.py"


def _git(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=repo, check=True, capture_output=True, text=True,
    ).stdout.strip()


def _skriv(repo: Path, filer: dict[str, str]) -> None:
    for sti, innhold in filer.items():
        (repo / sti).parent.mkdir(parents=True, exist_ok=True)
        (repo / sti).write_text(innhold)
    _git(repo, "add", "-A")
    _git(repo, "commit", "-qm", "endring")


def _mv(repo: Path, fra: str, til: str) -> None:
    (repo / til).parent.mkdir(parents=True, exist_ok=True)
    _git(repo, "mv", fra, til)


def _versjoner(ts: int, py: int) -> dict[str, str]:
    return {TS: f"export const REGELVERSJON = {ts};\n", PY: f"REGELVERSJON = {py}\n"}


@pytest.fixture
def repo(tmp_path: Path) -> tuple[Path, str]:
    _git(tmp_path, "init", "-q")
    _skriv(tmp_path, {**_versjoner(3, 3), "src/lib/domain/regel.ts": "a\n"})
    return tmp_path, _git(tmp_path, "rev-parse", "HEAD")


def _uten_git_miljo() -> dict[str, str]:
    return {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}


def _kjor(repo: Path, base: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SKRIPT)], cwd=repo, env={**_uten_git_miljo(), "BASE": base},
        capture_output=True, text=True,
    )


def test_regelendring_uten_okt_versjon_feiler_og_nevner_fixturen(repo):
    sti, base = repo
    _skriv(sti, {"src/lib/domain/regel.ts": "b\n"})
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert "backend/tests/fixtures/skjemaenes_nyttelast.json" in svar.stdout
    assert "npx vitest run -u src/lib/kontraktsbord/skjemanyttelast.test.ts" in svar.stdout


def test_versjon_okt_bare_i_ett_speil_feiler(repo):
    sti, base = repo
    _skriv(sti, {"backend/regler/regel.py": "b\n", **_versjoner(4, 3)})
    assert _kjor(sti, base).returncode == 1


def test_regelendring_med_okt_versjon_i_begge_passerer_og_minner_om_fixturen(repo):
    sti, base = repo
    _skriv(sti, {"src/lib/domain/regel.ts": "b\n", **_versjoner(4, 4)})
    svar = _kjor(sti, base)
    assert svar.returncode == 0, svar.stdout + svar.stderr
    assert "::notice file=backend/tests/fixtures/skjemaenes_nyttelast.json::" in svar.stdout
    assert "npx vitest run -u src/lib/kontraktsbord/skjemanyttelast.test.ts" in svar.stdout


def test_endring_bare_i_domenetestene_passerer_uten_fixturhint(repo):
    sti, base = repo
    _skriv(sti, {"src/lib/domain/__tests__/regel.test.ts": "b\n"})
    svar = _kjor(sti, base)
    assert svar.returncode == 0
    assert "skjemaenes_nyttelast" not in svar.stdout


def test_mangler_base_gir_bruksmelding(repo):
    sti, _ = repo
    svar = _kjor(sti, "")
    assert svar.returncode == 2
    assert "BASE=" in svar.stderr


KJERNE_REGLER = "kjerne/regler/regelsett.ts"
KJERNE_VERSJON = "kjerne/versjon.ts"
KJERNE_STANDPUNKT = "kjerne/frosset/standpunkt.ts"
KJERNE_FORMAT = "kjerne/format/format.ts"


def _kjerne(regel: int, projeksjon: int) -> dict[str, str]:
    return {
        KJERNE_REGLER: f"export const REGELVERSJON = {regel};\n",
        KJERNE_VERSJON: f"export const PROJEKSJONSVERSJON = {projeksjon};\n",
    }


@pytest.fixture
def kjerne(repo):
    sti, _ = repo
    _skriv(
        sti,
        {
            **_kjerne(5, 2),
            "kjerne/regler/frist.ts": "a\n",
            "kjerne/utled.ts": "a\n",
            KJERNE_STANDPUNKT: "a\n",
            # Formatet finnes, så vakten kan kontrollere det; testene av formatet skriver over det.
            KJERNE_FORMAT: "export const FORMAT = 1;\nexport const LESERFORMAT = 1;\nexport const X = 0;\n",
        },
    )
    return sti, _git(sti, "rev-parse", "HEAD")


@pytest.mark.parametrize(
    "filer, ventet",
    [
        pytest.param({"kjerne/regler/frist.ts": "b\n"}, 1, id="regelsettet uten ny regelversjon"),
        pytest.param({"kjerne/regler/frist.ts": "b\n", **_kjerne(6, 2)}, 0, id="regelsettet med ny regelversjon"),
        pytest.param({"kjerne/utled.ts": "b\n"}, 1, id="utledningen uten ny projeksjonsversjon"),
        pytest.param({"kjerne/utled.ts": "b\n", **_kjerne(5, 3)}, 0, id="utledningen med ny projeksjonsversjon"),
        pytest.param({"kjerne/utled.ts": "b\n", **_kjerne(6, 2)}, 1, id="utledningen med bare ny regelversjon"),
        # #330: standpunkt.ts bestemmer hva beslutningsgrunnlaget fryser (MM-U11),
        # så den krever ny regelversjon, og ny projeksjonsversjon som resten av kjernen.
        pytest.param({KJERNE_STANDPUNKT: "b\n"}, 1, id="standpunktene uten nye versjoner"),
        pytest.param({KJERNE_STANDPUNKT: "b\n", **_kjerne(5, 3)}, 1, id="standpunktene med bare ny projeksjonsversjon"),
        pytest.param({KJERNE_STANDPUNKT: "b\n", **_kjerne(6, 2)}, 1, id="standpunktene med bare ny regelversjon"),
        pytest.param({KJERNE_STANDPUNKT: "b\n", **_kjerne(6, 3)}, 0, id="standpunktene med begge versjonene"),
        # #309: det samme gjelder hver fil i frosset/.
        pytest.param({"kjerne/frosset/frysing.ts": "b\n", **_kjerne(5, 3)}, 1, id="frysingen med bare ny projeksjonsversjon"),
        pytest.param({"kjerne/frosset/frysing.ts": "b\n", **_kjerne(6, 3)}, 0, id="frysingen med begge versjonene"),
        pytest.param({"kjerne/tester/kjerne.test.ts": "b\n"}, 0, id="bare testene"),
    ],
)
def test_kjernen_krever_ny_versjon_der_den_er_endret(kjerne, filer, ventet):
    sti, base = kjerne
    _skriv(sti, filer)
    svar = _kjor(sti, base)
    assert svar.returncode == ventet, svar.stdout + svar.stderr


def test_kjernen_uten_standpunkt_ts_feiler(kjerne):
    """#330: kravet om ny regelversjon forsvinner ikke stille om standpunkt.ts flyttes."""
    sti, base = kjerne
    _git(sti, "rm", "-q", KJERNE_STANDPUNKT)
    _git(sti, "commit", "-qm", "flytt")
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert f"{KJERNE_STANDPUNKT} finnes ikke" in svar.stdout


def test_kjernen_og_speilene_kontrolleres_hver_for_seg(kjerne):
    """En endring i kjernen redder ikke en regelendring i speilene uten ny versjon."""
    sti, base = kjerne
    _skriv(sti, {"src/lib/domain/regel.ts": "b\n", "kjerne/utled.ts": "b\n", **_kjerne(5, 3)})
    assert _kjor(sti, base).returncode == 1


def _format(skriver: int, leser: int | None) -> dict[str, str]:
    tekst = f"export const FORMAT = {skriver};\n"
    if leser is not None:
        tekst += f"export const LESERFORMAT = {leser};\n"
    return {KJERNE_FORMAT: tekst}


@pytest.mark.parametrize(
    "for_, etter, ventet",
    [
        pytest.param((1, 1), (1, 2), 0, id="første trinn: leser det nye formatet"),
        pytest.param((1, 2), (2, 2), 0, id="andre trinn: skriver formatet den forrige leste"),
        pytest.param((1, 1), (2, 2), 1, id="leser og skriver det nye formatet i samme utgivelse"),
        pytest.param((1, 1), (2, 1), 1, id="skriver et format den ikke leser"),
        pytest.param((2, 2), (1, 1), 1, id="senker formatene"),
        pytest.param((1, 2), (1, 1), 1, id="senker LESERFORMAT"),
        pytest.param((1, None), (1, 1), 0, id="LESERFORMAT innført, lik FORMAT"),
        pytest.param((1, 1), (1, None), 1, id="LESERFORMAT mangler"),
    ],
)
def test_formatet_rulles_ut_i_to_trinn(kjerne, for_, etter, ventet):
    """B-10 (#316): et nytt format leses i én utgivelse før det skrives i den neste."""
    sti, _ = kjerne
    _skriv(sti, _format(*for_))
    base = _git(sti, "rev-parse", "HEAD")
    # Projeksjonsversjonen økes, så bare kontrollen av formatet kan feile.
    _skriv(sti, {**_format(*etter), **_kjerne(5, 3)})
    svar = _kjor(sti, base)
    assert svar.returncode == ventet, svar.stdout + svar.stderr


def test_kjernen_uten_formatet_feiler(kjerne):
    """#309: kontrollen av formatet forsvinner ikke stille om format.ts flyttes."""
    sti, base = kjerne
    _mv(sti, KJERNE_FORMAT, "kjerne/format.ts")
    _git(sti, "commit", "-qm", "flytt")
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert f"{KJERNE_FORMAT} finnes ikke" in svar.stdout


def test_formatet_leses_fra_den_gamle_stien_etter_en_flytting(kjerne):
    """#309: en flytting av format.ts skjuler ikke et format som skrives før det er lest."""
    sti, _ = kjerne
    _mv(sti, KJERNE_FORMAT, "kjerne/format.ts")
    _git(sti, "commit", "-qm", "gammel sti")
    base = _git(sti, "rev-parse", "HEAD")
    _mv(sti, "kjerne/format.ts", KJERNE_FORMAT)
    _skriv(sti, {**_format(2, 2), **_kjerne(5, 3)})
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert "versjonen før leste bare format 1" in svar.stdout
    assert "Fant FORMAT i flere filer" not in svar.stdout


# #309: en flytting endrer de relative importene, og prettier kan bryte en import
# over flere linjer. Bare det regnes ikke som en endring. Kroppen er lang nok til
# at git kjenner igjen omdøpingen; ellers regnes fila som ny og endret.
KROPP = "".join(f"export const linje{i} = {i};\n" for i in range(20))
FOR_FLYTTING = {
    "kjerne/typer.ts": "export type Spor = 'grunnlag';\n",
    "kjerne/hjelp.ts": "export const hjelp = 1;\n",
    "kjerne/annen.ts": "export const hjelp = 2;\n",
    "kjerne/standpunkt.ts": (
        "import type { Spor } from './typer.ts';\n"
        "import { hjelp } from './hjelp';\n"
        "export const virkning = (s: Spor) => hjelp;\n" + KROPP
    ),
    "kjerne/utled.ts": f"import {{ virkning }} from './standpunkt.ts';\nexport const utled = virkning;\n{KROPP}",
}
STANDPUNKT_FLYTTET = (
    "import type {\n  Spor,\n} from '../typer.ts';\n"
    "import { hjelp } from '../hjelp';\n"
    "export const virkning = (s: Spor) => hjelp;\n" + KROPP
)


@pytest.fixture
def flytting(kjerne):
    sti, _ = kjerne
    _git(sti, "rm", "-q", KJERNE_STANDPUNKT)
    _skriv(sti, FOR_FLYTTING)
    return sti, _git(sti, "rev-parse", "HEAD")


def _flytt(sti: Path, standpunkt: str, utled: str = "../frosset/standpunkt.ts") -> None:
    _mv(sti, "kjerne/standpunkt.ts", KJERNE_STANDPUNKT)
    _mv(sti, "kjerne/utled.ts", "kjerne/utledning/utled.ts")
    _skriv(sti, {
        KJERNE_STANDPUNKT: standpunkt,
        "kjerne/utledning/utled.ts": f"import {{ virkning }} from '{utled}';\nexport const utled = virkning;\n{KROPP}",
    })


def test_en_ren_flytting_krever_ingen_ny_versjon(flytting):
    sti, base = flytting
    _flytt(sti, STANDPUNKT_FLYTTET)
    svar = _kjor(sti, base)
    assert svar.returncode == 0, svar.stdout + svar.stderr
    assert "Bare flyttet" in svar.stdout
    assert KJERNE_STANDPUNKT in svar.stdout


@pytest.mark.parametrize(
    "standpunkt, versjoner, ventet",
    [
        pytest.param(STANDPUNKT_FLYTTET.replace("=> hjelp", "=> hjelp + 1"), {}, 1, id="endret innhold"),
        pytest.param(STANDPUNKT_FLYTTET.replace("=> hjelp", "=> hjelp + 1"), _kjerne(6, 3), 0, id="endret innhold med begge versjonene"),
        pytest.param(STANDPUNKT_FLYTTET.replace("'../hjelp'", "'../annen'"), {}, 1, id="en import med et annet mål"),
        pytest.param(STANDPUNKT_FLYTTET.replace("'../hjelp'", "'../annen'"), _kjerne(5, 3), 1, id="en import med et annet mål og bare ny projeksjonsversjon"),
    ],
)
def test_en_flytting_med_endring_krever_ny_versjon(flytting, standpunkt, versjoner, ventet):
    sti, base = flytting
    _flytt(sti, standpunkt)
    if versjoner:
        _skriv(sti, versjoner)
    svar = _kjor(sti, base)
    assert svar.returncode == ventet, svar.stdout + svar.stderr


def test_en_flytting_ut_av_frosset_krever_ny_regelversjon(kjerne):
    """#309: det vakten dekker, krymper ikke ved en flytting."""
    sti, _ = kjerne
    _skriv(sti, {"kjerne/frosset/frysing.ts": "a\n"})
    base = _git(sti, "rev-parse", "HEAD")
    _mv(sti, "kjerne/frosset/frysing.ts", "kjerne/kommandoer/frysing.ts")
    _skriv(sti, _kjerne(5, 3))
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert "REGELVERSJON" in svar.stdout


@pytest.mark.parametrize(
    "fra, til, versjoner, ventet",
    [
        # Ut av regelsettet med endret innhold: endringen gjelder fortsatt resten av kjernen.
        pytest.param("kjerne/regler/frist.ts", "kjerne/utledning/frist.ts", _kjerne(6, 2), 1, id="ut av regelsettet med bare ny regelversjon"),
        pytest.param("kjerne/regler/frist.ts", "kjerne/utledning/frist.ts", _kjerne(6, 3), 0, id="ut av regelsettet med begge versjonene"),
        # Inn i frosset/ med endret innhold: det fila nå bestemmer, krever ny regelversjon.
        pytest.param("kjerne/utled.ts", "kjerne/frosset/utled.ts", _kjerne(5, 3), 1, id="inn i frosset med bare ny projeksjonsversjon"),
        pytest.param("kjerne/utled.ts", "kjerne/frosset/utled.ts", _kjerne(6, 3), 0, id="inn i frosset med begge versjonene"),
    ],
)
def test_en_flytting_over_grensen_med_endring(kjerne, fra, til, versjoner, ventet):
    """#309: en flytting med endret innhold krever versjonene for både gammel og ny plass."""
    sti, _ = kjerne
    _skriv(sti, {fra: KROPP})
    base = _git(sti, "rev-parse", "HEAD")
    _mv(sti, fra, til)
    _skriv(sti, {til: KROPP + "export const ny = 1;\n", **versjoner})
    svar = _kjor(sti, base)
    assert svar.returncode == ventet, svar.stdout + svar.stderr


def test_en_sti_med_norske_bokstaver_kontrolleres(kjerne):
    """#309: git skriver ellers en slik sti i anførselstegn, og den ville falt utenom."""
    sti, base = kjerne
    _skriv(sti, {"kjerne/frosset/frisløp.ts": "a\n", **_kjerne(5, 3)})
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert "kjerne/frosset/frisløp.ts" in svar.stdout


def test_formatet_i_flere_filer_i_base_feiler_etter_en_flytting(kjerne):
    """#309: uten en omdøping git kjenner igjen, gjettes ikke den gamle fila."""
    sti, _ = kjerne
    _mv(sti, KJERNE_FORMAT, "kjerne/format.ts")
    _skriv(sti, {"kjerne/annet.ts": "export const FORMAT = 1;\n"})
    base = _git(sti, "rev-parse", "HEAD")
    _git(sti, "rm", "-q", "kjerne/format.ts")
    _skriv(sti, {KJERNE_FORMAT: "export const FORMAT = 2;\nexport const LESERFORMAT = 2;\n// annen\n", **_kjerne(5, 3)})
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert "Fant FORMAT i flere filer i BASE" in svar.stdout


@pytest.mark.parametrize(
    "fra, til, versjoner, ventet",
    [
        # Inn i regelsettet: PROJEKSJONSVERSJON dekker ikke lenger fila.
        pytest.param("kjerne/frosset/f.ts", "kjerne/regler/f.ts", _kjerne(6, 2), 1, id="fra frosset til regelsettet med bare ny regelversjon"),
        pytest.param("kjerne/frosset/f.ts", "kjerne/regler/f.ts", _kjerne(5, 3), 0, id="fra frosset til regelsettet med ny projeksjonsversjon"),
        pytest.param("kjerne/utled.ts", "kjerne/regler/utled.ts", _kjerne(5, 2), 1, id="fra utledningen til regelsettet uten nye versjoner"),
        pytest.param("kjerne/utled.ts", "kjerne/regler/utled.ts", _kjerne(5, 3), 0, id="fra utledningen til regelsettet med ny projeksjonsversjon"),
        # Inn i frosset/ eller mellom lagene utenfor regelsettet: dekningen krymper ikke.
        pytest.param("kjerne/utled.ts", "kjerne/frosset/utled.ts", _kjerne(5, 2), 0, id="fra utledningen til frosset"),
        pytest.param("kjerne/utled.ts", "kjerne/utledning/utled.ts", _kjerne(5, 2), 0, id="mellom lagene"),
    ],
)
def test_en_ren_flytting_krever_versjonen_som_ikke_lenger_dekker_fila(kjerne, fra, til, versjoner, ventet):
    """#309: det hver versjon dekker, krymper ikke ved en flytting."""
    sti, _ = kjerne
    _skriv(sti, {fra: KROPP})
    base = _git(sti, "rev-parse", "HEAD")
    _mv(sti, fra, til)
    _skriv(sti, versjoner)
    svar = _kjor(sti, base)
    assert svar.returncode == ventet, svar.stdout + svar.stderr


def test_formatet_leses_fra_omdoepingen_git_kjenner_igjen(kjerne):
    """#309: med en omdøping git kjenner igjen, leses versjonene før fra den gamle stien.

    En annen fil i BASE har også FORMAT, så testen består bare når omdøpingen
    brukes, ikke søket etter konstanten.
    """
    sti, _ = kjerne
    _mv(sti, KJERNE_FORMAT, "kjerne/format.ts")
    _skriv(sti, {
        "kjerne/format.ts": "export const FORMAT = 1;\nexport const LESERFORMAT = 1;\n" + KROPP,
        "kjerne/annet.ts": "export const FORMAT = 9;\n",
    })
    base = _git(sti, "rev-parse", "HEAD")
    _mv(sti, "kjerne/format.ts", KJERNE_FORMAT)
    _skriv(sti, {KJERNE_FORMAT: "export const FORMAT = 2;\nexport const LESERFORMAT = 2;\n" + KROPP, **_kjerne(5, 3)})
    flytting = _git(sti, "diff", "--name-status", "-M", base, "HEAD", "--", "kjerne/")
    assert f"kjerne/format.ts\t{KJERNE_FORMAT}" in flytting
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert "FORMAT 1 -> 2" in svar.stdout
    assert "versjonen før leste bare format 1" in svar.stdout
    assert "Fant FORMAT i flere filer" not in svar.stdout
