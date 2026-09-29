"""Lager tabellbeskrivelsen og hendelseskatalogen fra registrene i docs/datamodell/.

Kjøres fra repo-roten: /tmp/venv/bin/python docs/verktoy/datamodell.py
Skriver docs/datamodell/tabeller.md, hendelser.md og tabellbeskrivelse.xlsx,
men bare når innholdet er endret. Hendelseskatalogen leser backend-modellene,
og Excel-fila krever openpyxl, så begge trenger venv-en i AGENTS.md.
"""

import importlib.util
import pathlib
import re
import sys

import tomllib


def _last_hendelseskatalog():
    sti = pathlib.Path(__file__).resolve().parent / "hendelseskatalog.py"
    spesifikasjon = importlib.util.spec_from_file_location("hendelseskatalog", sti)
    modul = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(modul)
    return modul


hk = _last_hendelseskatalog()

ROT = pathlib.Path(__file__).resolve().parents[2]
MAPPE = ROT / "docs" / "datamodell"
REGISTER = MAPPE / "tabeller.toml"
MARKDOWN = MAPPE / "tabeller.md"
EXCEL = MAPPE / "tabellbeskrivelse.xlsx"
HOVEDPLAN = ROT / "docs" / "plans" / "2026-09-16-godkjenning-og-varig-levering.md"

IKT_KOLONNER = [
    "Tabellnavn",
    "Beskrivelse",
    "Er dette en transaksjonstabell?",
    "Hvor fra appen lagres og redigeres",
    "Er dette en grunndatatabell?",
    "Tabell der data hentes inn, f.eks. via Catenda-API-et",
    "Beskrivelse av relasjon til en annen tabell",
]
# Valgt av oppdragsgiver 29.09. Belegg, funn og skrivere står bare i tabeller.md.
TILLEGGSKOLONNER = ["Lagring", "Type", "Status", "Personopplysninger"]
UTENFOR_KOLONNER = ["Navn", "Lagring", "Beskrivelse", "Hvor fra appen lagres"]
UTENFOR_EXCEL = ("navn", "lagring", "beskrivelse", "lagres_fra")

TYPER = {
    "transaksjon": "Rader som registrerer noe en part eller bruker har gjort",
    "grunndata": "Prosjekter, brukere, medlemskap og oppsett som andre rader viser til",
    "avledet": "Kan bygges opp igjen fra andre tabeller og rettes ikke for hånd",
    "kopi": "Kopi av data fra Catenda",
    "teknisk": "Sesjoner, synkroniseringsstatus, køer og kvitteringer",
}
LAGRING = ("PostgreSQL", "SQLite")
STATUS = ("i bruk", "rest", "uavklart")
GJENOPPBYGGING = ("ja", "nei", "delvis", "ikke kontrollert", "ikke relevant")
BELEGG = {
    "K": "kjørt og observert (med dato)",
    "L": "lest i kode eller migrasjonsfil (med dato)",
    "D": "kontrollert i databasekatalogen tidligere (med dato)",
    "H": "historisk dokumentert i en audit",
}
TABELLFELT = (
    "navn",
    "lagring",
    "type",
    "status",
    "beskrivelse",
    "lagres_fra",
    "fra_catenda",
    "relasjoner",
    "kan_gjenoppbygges",
    "personopplysninger",
    "skrivere",
    "funn",
    "belegg",
)
UTENFOR_FELT = ("navn", "lagring", "beskrivelse", "lagres_fra", "belegg")
FUNN_ID = re.compile(r"^[A-Z][A-Z0-9]*-\d{2}$")

MERKNAD = (
    "Generert fra docs/datamodell/tabeller.toml av docs/verktoy/datamodell.py. "
    "Rett i registeret, ikke her."
)
HENDELSESMERKNAD = (
    "Generert fra docs/datamodell/hendelser.toml og backend-modellene av "
    "docs/verktoy/datamodell.py. Rett i katalogen eller modellene, ikke her."
)


def les(sti: pathlib.Path = REGISTER) -> dict:
    with sti.open("rb") as fil:
        return tomllib.load(fil)


def tekst(verdi) -> str:
    """Slår sammen linjeskift og mellomrom, slik at TOML kan brytes fritt."""
    if isinstance(verdi, list):
        return "; ".join(tekst(v) for v in verdi)
    return " ".join(str(verdi).split())


def ja_delvis_nei(typer: list[str], type_: str) -> str:
    if type_ not in typer:
        return "Nei"
    return "Ja" if len(typer) == 1 else "Delvis"


def funnregisteret(sti: pathlib.Path = HOVEDPLAN) -> str:
    """Avsnitt 4 i hovedplanen, der funn-ID-ene er ført."""
    plan = sti.read_text(encoding="utf-8")
    start = plan.index("## 4. Funnregister")
    return plan[start : plan.index("## 5. Arbeidspakker", start)]


def valider(register: dict, funntekst: str | None = None) -> list[str]:
    feil = []
    sett = set()
    for oppføring in register.get("tabell", []):
        navn = oppføring.get("navn", "<uten navn>")
        ukjente = set(oppføring) - set(TABELLFELT)
        mangler = [f for f in TABELLFELT if f not in oppføring]
        if ukjente:
            feil.append(f"{navn}: ukjente felt {sorted(ukjente)}")
        if mangler:
            feil.append(f"{navn}: mangler {mangler}")
            continue
        if navn in sett:
            feil.append(f"{navn}: står to ganger")
        sett.add(navn)
        if oppføring["lagring"] not in LAGRING:
            feil.append(f"{navn}: lagring {oppføring['lagring']!r} er ikke en av {LAGRING}")
        if oppføring["status"] not in STATUS:
            feil.append(f"{navn}: status {oppføring['status']!r} er ikke en av {STATUS}")
        typer = oppføring["type"]
        if not typer or not set(typer) <= set(TYPER):
            feil.append(f"{navn}: type {typer!r} må være en ikke-tom del av {sorted(TYPER)}")
        if not tekst(oppføring["kan_gjenoppbygges"]).startswith(GJENOPPBYGGING):
            feil.append(f"{navn}: kan_gjenoppbygges må begynne med en av {GJENOPPBYGGING}")
        for felt in ("beskrivelse", "lagres_fra", "fra_catenda", "relasjoner", "personopplysninger", "belegg"):
            if not tekst(oppføring[felt]):
                feil.append(f"{navn}: {felt} er tomt; skriv «ikke kontrollert» hvis det er svaret")
        if oppføring["status"] == "i bruk" and not oppføring["skrivere"]:
            feil.append(f"{navn}: en tabell i bruk uten skriver er et funn, ikke en oppføring")
        for funn in oppføring["funn"]:
            if not FUNN_ID.match(funn):
                feil.append(f"{navn}: {funn!r} er ikke en funn-ID")
            elif funntekst is not None and not re.search(rf"\b{re.escape(funn)}\b", funntekst):
                feil.append(f"{navn}: {funn} står ikke i hovedplanens funnregister")
    for oppføring in register.get("utenfor", []):
        navn = oppføring.get("navn", "<uten navn>")
        if set(oppføring) != set(UTENFOR_FELT):
            feil.append(f"{navn}: feltene skal være {UTENFOR_FELT}")
        elif oppføring["lagring"] in LAGRING:
            feil.append(f"{navn}: står under «utenfor», men lagres i {oppføring['lagring']}")
    return feil


def avvik(register: dict, lagring: str, faktiske: set[str]) -> tuple[list[str], list[str]]:
    """Tabeller uten oppføring, og oppføringer uten tabell, for én lagring."""
    ført = {t["navn"] for t in register["tabell"] if t["lagring"] == lagring}
    return sorted(faktiske - ført), sorted(ført - faktiske)


def tabellrader(register: dict) -> list[list[str]]:
    rader = [IKT_KOLONNER + TILLEGGSKOLONNER]
    for t in register["tabell"]:
        rader.append(
            [
                t["navn"],
                tekst(t["beskrivelse"]),
                ja_delvis_nei(t["type"], "transaksjon"),
                tekst(t["lagres_fra"]),
                ja_delvis_nei(t["type"], "grunndata"),
                tekst(t["fra_catenda"]),
                tekst(t["relasjoner"]),
                t["lagring"],
                ", ".join(t["type"]),
                t["status"],
                tekst(t["personopplysninger"]),
            ]
        )
    return rader


def utenfor_rader(register: dict) -> list[list[str]]:
    rader = [UTENFOR_KOLONNER]
    for u in register.get("utenfor", []):
        rader.append([tekst(u[f]) for f in UTENFOR_EXCEL])
    return rader


def om_rader() -> list[list[str]]:
    rader = [["Emne", "Forklaring"], ["Kilde", MERKNAD]]
    rader += [[f"Type: {navn}", forklaring] for navn, forklaring in TYPER.items()]
    rader.append(
        [
            "IKTs ja/nei-kolonner",
            "Ja når typen er den eneste, Delvis når den er én av flere, ellers Nei.",
        ]
    )
    rader.append(
        [
            "Ikke kontrollert",
            "Står der påstanden ikke er kontrollert. Registeret bygges i runder.",
        ]
    )
    rader.append(
        [
            "Detaljer",
            "Hvem som skriver hver tabell, belegg og funn står i docs/datamodell/tabeller.md i repoet.",
        ]
    )
    rader += [
        [
            "Hendelsestyper",
            (
                "Én rad per hendelsestype i tabellen hendelse. Innholdet ligger i kolonnen data "
                "og varierer med typen. Interne notater ligger i tabellen notat."
            ),
        ],
        [
            "Hendelsesfelt",
            (
                "Feltene i data per hendelsestype, generert fra modellene i koden. "
                "Delmodellene, som varselinformasjon og brev, står til slutt."
            ),
        ],
        [
            "Kilde for bestemmelsen",
            (
                "vedtak: et vedtak i hovedplanen eller en ADR. kode: koden oppgir bestemmelsen, "
                "ikke kontrollert mot standardteksten. oppdragsgiver: oppdragsgivers svar."
            ),
        ],
        [
            "Detaljer om hendelsene",
            "Innsendingsveier, forretningsregler, belegg og funn står i docs/datamodell/hendelser.md i repoet.",
        ],
    ]
    return rader


def ark(register: dict, katalog: dict) -> dict[str, list[list[str]]]:
    return {
        "Tabeller": tabellrader(register),
        "Utenfor databasene": utenfor_rader(register),
        "Hendelsestyper": hk.typerader(katalog),
        "Hendelsesfelt": hk.feltrader(katalog),
        "Om registeret": om_rader(),
    }


def _celle(verdi: str) -> str:
    return verdi.replace("|", "\\|")


def markdown(register: dict) -> str:
    linjer = [
        "# Tabellregisteret",
        "",
        f"> {MERKNAD}",
        "",
        (
            "Hver tabell i appens databaser, og data som ligger utenfor dem. Feltene "
            "og typene er forklart i [oppdraget for spor M, avsnitt 5]"
            "(../prompt-datamodell-og-funksjonskart-2026-09-29.md#5-feltene-i-registeret). "
            "Registeret bygges i runder; «ikke kontrollert» betyr det det sier."
        ),
        "",
        "## Oversikt",
        "",
        "| Tabell | Lagring | Type | Status | Transaksjon | Grunndata |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for t in register["tabell"]:
        linjer.append(
            f"| [`{t['navn']}`](#{t['navn']}) | {t['lagring']} | "
            f"{', '.join(t['type'])} | {t['status']} | "
            f"{ja_delvis_nei(t['type'], 'transaksjon')} | {ja_delvis_nei(t['type'], 'grunndata')} |"
        )
    linjer.append("")
    for lagring in LAGRING:
        linjer += [f"## {lagring}", ""]
        for t in register["tabell"]:
            if t["lagring"] != lagring:
                continue
            linjer += [
                f"### `{t['navn']}`",
                "",
                tekst(t["beskrivelse"]),
                "",
                "| Felt | Innhold |",
                "| --- | --- |",
                f"| Type | {', '.join(t['type'])} |",
                f"| Status | {t['status']} |",
                f"| Hvor fra appen lagres og redigeres | {_celle(tekst(t['lagres_fra']))} |",
                f"| Data fra Catenda | {_celle(tekst(t['fra_catenda']))} |",
                f"| Relasjoner | {_celle(tekst(t['relasjoner']))} |",
                f"| Kan bygges opp igjen | {_celle(tekst(t['kan_gjenoppbygges']))} |",
                f"| Personopplysninger | {_celle(tekst(t['personopplysninger']))} |",
                f"| Skrives av | {_celle(tekst(t['skrivere']) or 'Ingen funnet')} |",
                f"| Funn | {', '.join(t['funn']) or '—'} |",
                f"| Belegg | {_celle(tekst(t['belegg']))} |",
                "",
            ]
    linjer += ["## Utenfor databasene", "", "| Navn | Lagring | Beskrivelse | Lagres fra | Belegg |", "| --- | --- | --- | --- | --- |"]
    for u in register.get("utenfor", []):
        linjer.append("| " + " | ".join(_celle(tekst(u[f])) for f in UTENFOR_FELT) + " |")
    linjer += ["", "## Typer og belegg", "", "| Kode | Betyr |", "| --- | --- |"]
    linjer += [f"| `{navn}` | {forklaring} |" for navn, forklaring in TYPER.items()]
    linjer += [f"| {kode} | {forklaring} |" for kode, forklaring in BELEGG.items()]
    return "\n".join(linjer) + "\n"


def _uten_tomme_til_slutt(rad) -> list[str]:
    verdier = ["" if c is None else str(c) for c in rad]
    while verdier and verdier[-1] == "":
        verdier.pop()
    return verdier


def excel_verdier(sti: pathlib.Path) -> dict[str, list[list[str]]]:
    from openpyxl import load_workbook

    bok = load_workbook(sti, read_only=True)
    try:
        return {
            arket.title: [_uten_tomme_til_slutt(rad) for rad in arket.iter_rows(values_only=True)]
            for arket in bok.worksheets
        }
    finally:
        bok.close()


def skriv_excel(register: dict, katalog: dict, sti: pathlib.Path) -> None:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font

    bok = Workbook()
    bok.remove(bok.active)
    bredder = {
        "Tabeller": [28, 60, 16, 50, 16, 40, 50, 12, 18, 10, 36],
        "Hendelsestyper": [28, 60, 12, 16, 18, 50, 40, 60, 10],
        "Hendelsesfelt": [30, 28, 30, 10, 60],
    }
    for tittel, rader in ark(register, katalog).items():
        arket = bok.create_sheet(tittel)
        for rad in rader:
            arket.append(rad)
        for celle in arket[1]:
            celle.font = Font(bold=True)
        for rad in arket.iter_rows():
            for celle in rad:
                celle.alignment = Alignment(wrap_text=True, vertical="top")
        arket.freeze_panes = "B2"
        standard = [30, 18, 70, 45, 50][: len(rader[0])]
        for i, bredde in enumerate(bredder.get(tittel, standard), start=1):
            arket.column_dimensions[arket.cell(row=1, column=i).column_letter].width = bredde
    bok.save(sti)


def kontroller_hendelser(katalog: dict) -> list[str]:
    feil = hk.valider(katalog, funnregisteret())
    uten_oppforing, uten_type = hk.avvik(katalog, hk.typene_i_koden())
    feil += [f"{t}: mangler oppføring i hendelser.toml" for t in uten_oppforing]
    feil += [f"{t}: finnes ikke i EventType" for t in uten_type]
    return feil + (hk.mot_koden(katalog) if not feil else [])


def main() -> int:
    register = les()
    katalog = hk.les()
    feil = valider(register, funnregisteret()) + kontroller_hendelser(katalog)
    if feil:
        print("Registeret eller katalogen er ikke gyldig:", *feil, sep="\n  ")
        return 1
    for sti, ny in (
        (MARKDOWN, markdown(register)),
        (hk.MARKDOWN, hk.markdown(katalog, HENDELSESMERKNAD)),
    ):
        if not sti.exists() or sti.read_text(encoding="utf-8") != ny:
            sti.write_text(ny, encoding="utf-8")
            print(f"skrev {sti.relative_to(ROT)}")
    if not EXCEL.exists() or excel_verdier(EXCEL) != ark(register, katalog):
        skriv_excel(register, katalog, EXCEL)
        print(f"skrev {EXCEL.relative_to(ROT)}")
    print(
        f"{len(register['tabell'])} tabeller, {len(register.get('utenfor', []))} utenfor databasene, "
        f"{len(katalog['hendelse'])} hendelsestyper"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
