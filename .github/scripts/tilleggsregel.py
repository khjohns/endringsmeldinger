"""Regelen for en SQL Server-migrasjon som bare legger til (DL-U16, #1057 del 3).

En fil i database/migrasjoner/ med navnet ÅÅÅÅMMDDTTMMSS_navn_tillegg.sql kan
være anvendt i basen når forrige utgivelse starter (`vurder` i
server/migrering.ts). Den må derfor ikke fjerne, endre eller stramme inn noe
forrige utgivelse bruker. `kontroller` godtar bare formene under og avviser alt
den ikke kan avgjøre:

- CREATE PROCEDURE, FUNCTION og VIEW, men ikke CREATE OR ALTER;
- CREATE SCHEMA, TABLE, ROLE, USER, TYPE, SEQUENCE og SYNONYM;
- CREATE INDEX, men UNIQUE bare på en tabell fila lager;
- CREATE TRIGGER bare på en tabell fila lager;
- GRANT, INSERT, ALTER ROLE … ADD MEMBER og SET for sesjonsvalg;
- ALTER TABLE … ADD: på en tabell fila lager, alt; ellers en kolonne som kan
  være NULL eller har DEFAULT, og en fremmednøkkel fra kolonner fila legger til;
- ALTER SECURITY POLICY … ADD FILTER/BLOCK PREDICATE … ON en tabell fila lager.

Utenfor modulene (prosedyre, funksjon, visning og trigger) skilles setningene
med `;`, og fila har ingen dynamisk SQL (EXEC). Ordene DROP, DELETE, UPDATE,
TRUNCATE, MERGE, REVOKE, DENY, DISABLE og STATE avvises der, utenom ON DELETE
og ON UPDATE i en fremmednøkkel og AFTER og BEFORE i et blokkpredikat.
"""

import re

GO = re.compile(r"^[ \t\r]*GO[ \t\r]*$", re.IGNORECASE | re.MULTILINE)
NAVN = r"(?:[A-Za-z_][\w$#@]*)(?:\.[A-Za-z_][\w$#@]*)?"
MODUL = re.compile(r"^CREATE\s+(?:PROCEDURE|PROC|FUNCTION|VIEW)\b", re.IGNORECASE)
TRIGGER = re.compile(rf"^CREATE\s+TRIGGER\s+{NAVN}\s+ON\s+({NAVN})", re.IGNORECASE)
FORBUDT = re.compile(
    r"\b(DROP|DELETE|UPDATE|TRUNCATE|MERGE|EXEC|EXECUTE|REVOKE|DENY|DISABLE|SP_RENAME|STATE)\b",
    re.IGNORECASE,
)
# Referansehandlingen i en fremmednøkkel og operasjonen et blokkpredikat gjelder.
HANDLING = re.compile(
    r"\bON\s+(?:DELETE|UPDATE)\s+(?:CASCADE|NO\s+ACTION|SET\s+NULL|SET\s+DEFAULT)\b"
    r"|\b(?:AFTER|BEFORE)\s+(?:INSERT|UPDATE|DELETE)\b",
    re.IGNORECASE,
)
SETNINGSORD = re.compile(r"\b(CREATE|ALTER|GRANT|INSERT|SET)\b", re.IGNORECASE)


def _uten_kommentarer_og_tekster(tekst: str) -> str:
    """Kommentarene fjernet, tekstene tomme ('') og navnene uten [] og ""."""
    ut, i, n = [], 0, len(tekst)
    while i < n:
        c = tekst[i]
        if tekst.startswith("--", i):
            i = tekst.find("\n", i)
            i = n if i < 0 else i
        elif tekst.startswith("/*", i):
            dybde, i = 1, i + 2
            while i < n and dybde:
                if tekst.startswith("/*", i):
                    dybde, i = dybde + 1, i + 2
                elif tekst.startswith("*/", i):
                    dybde, i = dybde - 1, i + 2
                else:
                    i += 1
            ut.append(" ")
        elif c == "'":
            i += 1
            while i < n:
                if tekst[i] == "'" and tekst.startswith("''", i):
                    i += 2
                elif tekst[i] == "'":
                    break
                else:
                    i += 1
            i += 1
            ut.append("''")
        elif c in '["':
            slutt = "]" if c == "[" else '"'
            j = tekst.find(slutt, i + 1)
            j = n if j < 0 else j
            ut.append(tekst[i + 1:j])
            i = j + 1
        else:
            ut.append(c)
            i += 1
    return "".join(ut)


def _navn(navn: str) -> str:
    return navn.lower()


def _deler(tekst: str) -> list[str]:
    """`tekst` delt på komma utenfor parenteser."""
    deler, dybde, start = [], 0, 0
    for i, c in enumerate(tekst):
        if c == "(":
            dybde += 1
        elif c == ")":
            dybde -= 1
        elif c == "," and dybde == 0:
            deler.append(tekst[start:i].strip())
            start = i + 1
    deler.append(tekst[start:].strip())
    return [d for d in deler if d]


def _alter_table(setning: str, nye: set[str], kolonner: dict[str, set[str]]) -> str | None:
    treff = re.match(rf"^ALTER\s+TABLE\s+({NAVN})\s+(?:WITH\s+(?:NO)?CHECK\s+)?ADD\s+(.*)$",
                     setning, re.IGNORECASE | re.DOTALL)
    if not treff:
        return "ALTER TABLE uten ADD"
    tabell, resten = _navn(treff.group(1)), treff.group(2)
    if tabell in nye:
        return None
    lagt_til = kolonner.setdefault(tabell, set())
    for del_ in _deler(resten):
        nokkel = re.match(r"^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]*)\)", del_, re.IGNORECASE)
        if nokkel:
            fra = {_navn(k.strip()) for k in nokkel.group(1).split(",")}
            if not fra <= lagt_til:
                return f"en fremmednøkkel på {tabell} fra en kolonne fila ikke legger til"
            continue
        if re.match(r"^(?:CONSTRAINT|CHECK|UNIQUE|PRIMARY|INDEX|PERIOD)\b", del_, re.IGNORECASE):
            return f"en skranke på {tabell}, som fila ikke lager"
        if re.search(r"\bNOT\s+NULL\b", del_, re.IGNORECASE) and not re.search(
            r"\bDEFAULT\b", del_, re.IGNORECASE
        ):
            return f"en kolonne på {tabell} som er NOT NULL uten DEFAULT"
        lagt_til.add(_navn(del_.split()[0]))
    return None


def _setning(setning: str, nye: set[str], kolonner: dict[str, set[str]]) -> str | None:
    """Hvorfor `setning` ikke bare legger til, eller None."""
    start = setning.split(None, 1)[0].upper()
    if start == "GRANT":
        return None
    uten_handling = HANDLING.sub(" ", setning)
    if (ord_ := FORBUDT.search(uten_handling)):
        return ord_.group(1).upper()
    if (senere := SETNINGSORD.search(uten_handling, len(start))):
        return f"{senere.group(1).upper()} etter starten av en setning (skill setningene med ;)"
    if re.match(r"^CREATE\s+OR\s+ALTER\b", setning, re.IGNORECASE):
        return "CREATE OR ALTER"
    if (tabell := re.match(rf"^CREATE\s+TABLE\s+({NAVN})", setning, re.IGNORECASE)):
        nye.add(_navn(tabell.group(1)))
        return None
    if re.match(r"^CREATE\s+(?:SCHEMA|ROLE|USER|TYPE|SEQUENCE|SYNONYM)\b", setning, re.IGNORECASE):
        return None
    if (indeks := re.match(rf"^CREATE\s+(UNIQUE\s+)?(?:(?:NON)?CLUSTERED\s+)?INDEX\s+\w+\s+ON\s+({NAVN})",
                           setning, re.IGNORECASE)):
        if indeks.group(1) and _navn(indeks.group(2)) not in nye:
            return f"en unik indeks på {_navn(indeks.group(2))}, som fila ikke lager"
        return None
    if re.match(r"^INSERT\s+(?:INTO\s+)?" + NAVN + r"\b", setning, re.IGNORECASE):
        return None
    if re.match(r"^SET\s+(?:NOCOUNT|XACT_ABORT|ANSI_NULLS|QUOTED_IDENTIFIER)\s+(?:ON|OFF)$",
                setning, re.IGNORECASE):
        return None
    if re.match(rf"^ALTER\s+ROLE\s+{NAVN}\s+ADD\s+MEMBER\s+{NAVN}$", setning, re.IGNORECASE):
        return None
    if re.match(r"^ALTER\s+TABLE\b", setning, re.IGNORECASE):
        return _alter_table(setning, nye, kolonner)
    if (policy := re.match(rf"^ALTER\s+SECURITY\s+POLICY\s+{NAVN}\s+(.*)$", setning,
                           re.IGNORECASE | re.DOTALL)):
        for del_ in _deler(policy.group(1)):
            pred = re.match(rf"^ADD\s+(?:FILTER|BLOCK)\s+PREDICATE\s+.*?\)\s+ON\s+({NAVN})",
                            del_, re.IGNORECASE | re.DOTALL)
            if not pred:
                return "ALTER SECURITY POLICY med annet enn ADD FILTER/BLOCK PREDICATE"
            if _navn(pred.group(1)) not in nye:
                return f"et predikat på {_navn(pred.group(1))}, som fila ikke lager"
        return None
    return f"setningen som begynner med «{' '.join(setning.split()[:3])}»"


def kontroller(tekst: str) -> list[str]:
    """Det i `tekst` som ikke bare legger til, som ledd i en setning. Tom: godtatt."""
    funn: list[str] = []
    nye: set[str] = set()
    kolonner: dict[str, set[str]] = {}
    for sats in GO.split(_uten_kommentarer_og_tekster(tekst)):
        sats = sats.strip()
        if not sats:
            continue
        if re.match(r"^CREATE\s+OR\s+ALTER\b", sats, re.IGNORECASE):
            funn.append("CREATE OR ALTER")
            continue
        if MODUL.match(sats):
            continue
        if (trigger := TRIGGER.match(sats)):
            if _navn(trigger.group(1)) not in nye:
                funn.append(f"en trigger på {_navn(trigger.group(1))}, som fila ikke lager")
            continue
        if re.match(r"^CREATE\s+TRIGGER\b", sats, re.IGNORECASE):
            funn.append("en trigger som ikke er på en tabell")
            continue
        for setning in sats.split(";"):
            setning = " ".join(setning.split())
            if setning and (grunn := _setning(setning, nye, kolonner)):
                funn.append(grunn)
    return funn
