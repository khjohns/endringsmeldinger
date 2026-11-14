"""Funnkontrollen som arbeidsflyten «Funnkontroll» kjører på PR-beskrivelsen (#1951).

Leveranseskillen krever et gyldig tilfelle og et representativt avvik for en
kontroll som kjører i CI. Issuene, kommentarene og commitene slås opp i en fil, ikke
i GitHub, og skriptet kjøres med hendelsesfila slik arbeidsflyten gjør.
"""

import json
import subprocess
import sys

import pytest

from verktoymoduler import MAPPE, last

SKRIPT = MAPPE / "funnkontroll.py"

OPPSLAG = {
    "issues": [1905, 1925, 1940],
    "kommentarer": {"6875558236": 1925},
    "commits": ["1fc3849e0000000000000000000000000000abcd"],
}

HOLDER = """## Endring

Del av #1940. Closes #1950.

## Funn og utfall

| Funn | Kilde | Utfall |
| --- | --- | --- |
| Meldingen gjentok lista | `/code-review` | Rettet i `1fc3849e` |
| Skallet er ikke felles | `/design-review` | Krav i [#1925](https://github.com/khjohns/endringsmeldinger/issues/1925#issuecomment-6875558236) |
| `Fristdager` står to steder | `/simplify` | Oppfølgingsissue #1905 |
| Testen mangler en kant | Kontrollen av rettingene | Avvist: testkode |
| Avvist med henvisning | `/code-review` | Avvist: #1950 ber om noe annet |
| Ordet i knappen | `/design-review` | Spørsmål under «Åpne spørsmål» |
| Rekkefølgen | `/design-review` | Avgjort av oppdragsgiver 13.11: «B: som nå» |
| Overskriftene | `/design-review` | Ingen funn: `h2` → `h3` uten hopp |

### Avvik fra prototypen

| Avvik | Grunnlag | Forslag |
| --- | --- | --- |
| Bryteren er ikke bygget | Vederlagssvaret har den ikke | #1940 |
| Radioknapper | Felles komponent | Godkjent av oppdragsgiver 14.11 |
| Hele raden er lenke | Tittelen er lenken | Godtatt av oppdragsgiver 12.11 (#1950) |
| Datoen manglet | Rettet i `1fc3849e` | |

## Åpne spørsmål

1. Skal knappen hete «Send»?
"""


def _kjoer(tmp_path, tekst: str, nr: int = 1960) -> subprocess.CompletedProcess:
    hendelse = tmp_path / "hendelse.json"
    hendelse.write_text(
        json.dumps({"pull_request": {"number": nr, "body": tekst}}), encoding="utf-8"
    )
    oppslag = tmp_path / "oppslag.json"
    oppslag.write_text(json.dumps(OPPSLAG), encoding="utf-8")
    return subprocess.run(
        [
            sys.executable,
            str(SKRIPT),
            "--hendelse",
            str(hendelse),
            "--oppslag",
            str(oppslag),
            "--uten-git",
            "--fort-videre",
        ],
        capture_output=True,
        text=True,
    )


def test_beskrivelse_med_godkjente_utfall_holder(tmp_path):
    svar = _kjoer(tmp_path, HOLDER)
    assert svar.returncode == 0, svar.stderr
    fort = json.loads(svar.stdout)
    assert [r["funn"] for r in fort] == [
        "Skallet er ikke felles",
        "`Fristdager` står to steder",
    ]
    assert fort[0]["henvisninger"] == [{"issue": 1925, "kommentar": 6875558236}]


def test_beskrivelse_uten_tabellene_holder(tmp_path):
    svar = _kjoer(tmp_path, "## Endring\n\nBare tekst.\n")
    assert svar.returncode == 0, svar.stderr


def _bytt_utfall(utfall: str) -> str:
    return HOLDER.replace("Oppfølgingsissue #1905", utfall)


@pytest.mark.parametrize(
    ("utfall", "melding"),
    [
        ("Rettet", "«rettet» uten commit"),
        ("Rettet i `deadbee1`", "commiten deadbee1 finnes ikke"),
        ("Ikke rettet. Det er to felt", "ikke ett stoppregelen tillater"),
        ("Tas med når forløpet blir kjørbart", "ikke ett stoppregelen tillater"),
        ("Avvist", "«avvist» uten begrunnelse"),
        ("Oppfølgingsissue #1999", "#1999 finnes ikke"),
        ("Oppfølgingsissue #1950", "lukkes av PR-en"),
        ("Oppfølgingsissue #1960", "PR-en selv"),
        ("Krav i #1925", "skal lenke til kommentaren"),
        (
            "Krav i [#1940](https://github.com/khjohns/endringsmeldinger/issues/1940#issuecomment-6875558236)",
            "står i #1925, ikke i #1940",
        ),
        (
            "Krav i [#1925](https://github.com/khjohns/endringsmeldinger/issues/1925#issuecomment-1)",
            "finnes ikke",
        ),
        ("", "utfallet mangler"),
    ],
)
def test_utfall_stoppregelen_ikke_tillater_avvises(tmp_path, utfall, melding):
    svar = _kjoer(tmp_path, _bytt_utfall(utfall))
    assert svar.returncode == 1
    assert melding in svar.stderr
    assert "`Fristdager` står to steder" in svar.stderr


def test_spoersmaal_uten_aapne_spoersmaal_avvises(tmp_path):
    tekst = HOLDER.split("## Åpne spørsmål")[0]
    svar = _kjoer(tmp_path, tekst)
    assert svar.returncode == 1
    assert "«Åpne spørsmål» er tom eller mangler" in svar.stderr
    assert "Ordet i knappen" in svar.stderr


@pytest.mark.parametrize(
    "forslag",
    [
        "Kommer med U-2",
        "Beholdes. Godkjennes av oppdragsgiver",
        "Legges fram for oppdragsgiver 14.11",
    ],
)
def test_avvik_uten_issue_eller_godkjenning_avvises(tmp_path, forslag):
    svar = _kjoer(tmp_path, HOLDER.replace("Godkjent av oppdragsgiver 14.11", forslag))
    assert svar.returncode == 1
    assert "avvikstabellen, «Radioknapper»" in svar.stderr


def test_funn_og_utfall_med_tekst_uten_tabell_avvises(tmp_path):
    tekst = "## Funn og utfall\n\nFunnene står i bestillingen.\n\n## Åpne spørsmål\n\nIngen.\n"
    svar = _kjoer(tmp_path, tekst)
    assert svar.returncode == 1
    assert "ingen tabell" in svar.stderr


def test_tabell_i_kodeblokk_kontrolleres_ikke():
    funnkontroll = last("funnkontroll")
    tekst = "## Funn og utfall\n\n```\n| Funn | Kilde | Utfall |\n| --- | --- | --- |\n| a | b | |\n```\n"
    assert funnkontroll.kontroller(tekst, 1, None, None).feil == [
        "«Funn og utfall» har tekst, men ingen tabell med én rad per funn"
    ]


def test_rebaset_commit_finnes_i_github_men_ikke_i_git():
    funnkontroll = last("funnkontroll")
    oppslag = funnkontroll.FilOppslag(
        {"commits": ["b48f815342782c753d26aca9021c13d6bb48aaee"]}
    )
    finnes = funnkontroll.commitoppslag(oppslag, git=False)
    assert finnes("b48f815")
    assert not finnes("cb4d6f1")
