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
- GRANT av rettigheter på et objekt eller i basen til navngitte mottakere, uten
  DENY og REVOKE, INSERT, ALTER ROLE … ADD MEMBER og SET for sesjonsvalg;
- ALTER TABLE … ADD: på en tabell fila lager, alt; ellers en kolonne som kan
  være NULL eller har DEFAULT, men ikke er beregnet og ikke har UNIQUE, PRIMARY
  KEY eller CHECK, og en fremmednøkkel fra kolonner fila legger til uten DEFAULT,
  med NO ACTION som eneste referansehandling (svar A på spørsmål 8 i #1791);
- ALTER SECURITY POLICY … ADD FILTER/BLOCK PREDICATE … ON en tabell fila lager.

Utenfor modulene (prosedyre, funksjon, visning og trigger) skilles setningene
med `;`, og fila har ingen dynamisk SQL (EXEC). Ordene i FORBUDT avvises der,
utenom ON DELETE og ON UPDATE i en tabell og AFTER og BEFORE i et blokkpredikat,
og et ord i SETNINGSORD etter starten av en setning avvises som en ny setning.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

GO = re.compile(r"^[ \t\r]*GO[ \t\r]*$", re.IGNORECASE | re.MULTILINE)
NAVN = r"(?:[A-Za-z_][\w$#@]*)(?:\.[A-Za-z_][\w$#@]*){0,2}"
MODUL = re.compile(r"^CREATE\s+(?:PROCEDURE|PROC|FUNCTION|VIEW)\b", re.IGNORECASE)
TRIGGER = re.compile(
    rf"^CREATE\s+TRIGGER\s+{NAVN}\s+ON\s+({NAVN})\s+(?:WITH|FOR|AFTER|INSTEAD)\b", re.IGNORECASE
)
FORBUDT = re.compile(
    r"\b(DROP|DROP_EXISTING|DELETE|UPDATE|TRUNCATE|MERGE|EXEC|EXECUTE|REVOKE|DENY|DISABLE|SP_RENAME"
    r"|STATE)\b",
    re.IGNORECASE,
)
# Referansehandlingen i en fremmednøkkel, som bare leses bort i en tabell.
REFERANSEHANDLING = re.compile(
    r"\bON\s+(?:DELETE|UPDATE)\s+(?:CASCADE|NO\s+ACTION|SET\s+NULL|SET\s+DEFAULT)\b", re.IGNORECASE
)
# Operasjonen et blokkpredikat gjelder, som bare leses bort i policyen.
BLOKKOPERASJON = re.compile(r"\b(?:AFTER|BEFORE)\s+(?:INSERT|UPDATE|DELETE)\b", re.IGNORECASE)
# Ord som starter en ny setning i T-SQL og ikke hører hjemme inne i formene over.
SETNINGSORD = re.compile(
    r"\b(CREATE|ALTER|GRANT|INSERT|SET|ENABLE|DECLARE|BEGIN|IF|WHILE|WAITFOR|KILL|OPEN|CLOSE|FETCH"
    r"|DEALLOCATE|USE|DBCC|PRINT|THROW|RAISERROR|BACKUP|RESTORE|CHECKPOINT|RECONFIGURE|SHUTDOWN"
    r"|RETURN|GOTO|BULK|COMMIT|ROLLBACK|SAVE|WRITETEXT|UPDATETEXT|READTEXT)\b",
    re.IGNORECASE,
)
GRANT = re.compile(
    rf"^GRANT\s+[A-Za-z ,]+?(?:\s+ON\s+(?:[A-Za-z]+::)?{NAVN}(?:\s*\([^()]*\))?)?"
    rf"\s+TO\s+{NAVN}(?:\s*,\s*{NAVN})*(?:\s+WITH\s+GRANT\s+OPTION)?$",
    re.IGNORECASE,
)


# Ordene i T-SQL som regelen leser som nøkkelord: de reserverte og de formene over bruker.
# Et navn i [] eller "" som er et av dem, leses som et navn og ikke som ordet.
_NOEKKELORD = """
ACTION ADD AFTER ALL ALTER AND ANY AS ASC AUTHORIZATION BACKUP BEFORE BEGIN BETWEEN BLOCK
BREAK BROWSE BULK BY CASCADE CASE CHECK CHECKPOINT CLOSE CLUSTERED COALESCE COLLATE COLUMN
COLUMN_SET COMMIT COMPUTE CONSTRAINT CONTAINS CONTAINSTABLE CONTINUE CONVERT CREATE CROSS
CURRENT CURRENT_DATE CURRENT_TIME CURRENT_TIMESTAMP CURRENT_USER CURSOR DATABASE DBCC
DEALLOCATE DECLARE DEFAULT DELETE DENY DESC DISABLE DISK DISTINCT DISTRIBUTED DOUBLE DROP
DROP_EXISTING DUMP ELSE ENABLE END ERRLVL ESCAPE EXCEPT EXEC EXECUTE EXISTS EXIT EXTERNAL
FETCH FILE FILLFACTOR FILTER FOR FOREIGN FREETEXT FREETEXTTABLE FROM FULL FUNCTION GO GOTO
GRANT GROUP HAVING HOLDLOCK IDENTITY IDENTITY_INSERT IDENTITYCOL IF IN INDEX INNER INSERT
INSTEAD INTERSECT INTO IS JOIN KEY KILL LEFT LIKE LINENO LOAD MEMBER MERGE NATIONAL NO
NOCHECK NOCOUNT NONCLUSTERED NOT NULL NULLIF OF OFF OFFSETS ON OPEN OPENDATASOURCE OPENQUERY
OPENROWSET OPENXML OPTION OR ORDER OUTER OVER PERCENT PERIOD PERSISTED PIVOT PLAN POLICY
PRECISION PREDICATE PRIMARY PRINT PROC PROCEDURE PUBLIC RAISERROR READ READTEXT RECONFIGURE
REFERENCES REPLICATION RESTORE RESTRICT RETURN REVERT REVOKE RIGHT ROLE ROLLBACK ROWCOUNT
ROWGUIDCOL RULE SAVE SCHEMA SECURITY SECURITYAUDIT SELECT SEQUENCE SESSION_USER SET SETUSER
SHUTDOWN SOME SP_RENAME SPARSE STATE STATISTICS SYNONYM SYSTEM_USER TABLE TABLESAMPLE TEXTSIZE
THEN TO TOP TRAN TRANSACTION TRIGGER TRUNCATE TRY_CONVERT TSEQUAL TYPE UNION UNIQUE UNPIVOT
UPDATE UPDATETEXT USE USER VALUES VARYING VIEW WAITFOR WHEN WHERE WHILE WITH WITHIN
WRITETEXT XACT_ABORT
"""
NOEKKELORD = frozenset(_NOEKKELORD.split())
ENKELT_NAVN = re.compile(r"[A-Za-z_][\w$#@]*")
LESEREN = Path(__file__).resolve().parents[2] / "server" / "sqlleser.ts"


class Uleselig(Exception):
    """Leseren kunne ikke dele teksten, som når en tekst ikke er avsluttet."""


def _uten_kommentarer_og_tekster(tekst: str) -> str:
    """Kommentarene fjernet, tekstene tomme ('') og hvert navn i [] eller "" som ett navn.

    Teksten deles av leseren i `server/sqlleser.ts`, den samme som runneren deler
    filene på GO med (#1093). Et navn i [] eller "" som er et enkelt navn og ikke et
    nøkkelord, står som det er, så `[koe].[ny]` og `koe.ny` er samme tabell. Ellers blir
    det et eget navn, likt for likt navn uten hensyn til store og små bokstaver: `[d x]`,
    `[koe.hendelse]` og `[default]` er ett navn hver, og ikke to ord, en tabell i `koe`
    eller DEFAULT.

    :raises Uleselig: når leseren avviser teksten
    """
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Tilleggsregelen trenger Node for å lese SQL-en (server/sqlleser.ts)")
    svar = subprocess.run([node, str(LESEREN)], input=tekst, capture_output=True, text=True, check=False,
                          encoding="utf-8")
    if svar.returncode == 1 and svar.stderr.strip() and not svar.stdout:
        raise Uleselig(svar.stderr.strip())
    if svar.returncode != 0:
        raise RuntimeError(f"Leseren for SQL feilet: {svar.stderr.strip()}")
    egne: dict[str, str] = {}
    ut = []
    for del_ in json.loads(svar.stdout):
        art, innhold = del_["art"], del_["tekst"]
        if art == "kode":
            ut.append(innhold)
        elif art == "tekst":
            ut.append("''")
        elif art == "kommentar":
            ut.append(" ")
        elif ENKELT_NAVN.fullmatch(innhold) and innhold.upper() not in NOEKKELORD:
            ut.append(innhold)
        else:
            ut.append(egne.setdefault(innhold.lower(), f"_lest_navn_{len(egne) + 1}"))
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


def _alter_table(setning: str, nye: set[str], kolonner: dict[str, dict[str, bool]]) -> str | None:
    treff = re.match(rf"^ALTER\s+TABLE\s+({NAVN})\s+(?:WITH\s+(?:NO)?CHECK\s+)?ADD\s+(.*)$",
                     setning, re.IGNORECASE | re.DOTALL)
    if not treff:
        return "ALTER TABLE uten ADD"
    tabell, resten = _navn(treff.group(1)), treff.group(2)
    if tabell in nye:
        return None
    # Kolonnene fila legger til på tabellen, og om de har DEFAULT.
    lagt_til = kolonner.setdefault(tabell, {})
    for del_ in _deler(resten):
        if re.search(r"\bON\s+(?:DELETE|UPDATE)\s+(?!NO\s+ACTION\b)", del_, re.IGNORECASE):
            return f"en fremmednøkkel på {tabell} med en annen referansehandling enn NO ACTION"
        nokkel = re.match(r"^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]*)\)", del_, re.IGNORECASE)
        if nokkel:
            fra = {_navn(k.strip()) for k in nokkel.group(1).split(",")}
            if not fra <= lagt_til.keys():
                return f"en fremmednøkkel på {tabell} fra en kolonne fila ikke legger til"
            if any(lagt_til[k] for k in fra):
                return f"en fremmednøkkel på {tabell} fra en kolonne med DEFAULT"
            continue
        if re.match(r"^(?:CONSTRAINT|CHECK|UNIQUE|PRIMARY|INDEX|PERIOD)\b", del_, re.IGNORECASE):
            return f"en skranke på {tabell}, som fila ikke lager"
        har_default = bool(re.search(r"\bDEFAULT\b", del_, re.IGNORECASE))
        if re.match(r"^\S+\s+AS\b", del_, re.IGNORECASE):
            return f"en beregnet kolonne på {tabell}"
        if re.search(r"\b(?:UNIQUE|PRIMARY|CHECK)\b", del_, re.IGNORECASE) or (
            har_default and re.search(r"\bREFERENCES\b", del_, re.IGNORECASE)
        ):
            return f"en kolonne på {tabell} med en skranke som kan avvise radene forrige utgivelse skriver"
        if re.search(r"\bNOT\s+NULL\b", del_, re.IGNORECASE) and not har_default:
            return f"en kolonne på {tabell} som er NOT NULL uten DEFAULT"
        lagt_til[_navn(del_.split()[0])] = har_default
    return None


def _setning(setning: str, nye: set[str], kolonner: dict[str, dict[str, bool]]) -> str | None:
    """Hvorfor `setning` ikke bare legger til, eller None."""
    start = setning.split(None, 1)[0].upper()
    if start == "GRANT":
        # Én TO og ingen DENY eller REVOKE: en setning til uten ; kan ikke skjule seg i GRANT.
        if (GRANT.match(setning) and len(re.findall(r"\bTO\b", setning, re.IGNORECASE)) == 1
                and not re.search(r"\b(?:DENY|REVOKE)\b", setning, re.IGNORECASE)):
            return None
        return "GRANT i en form regelen ikke kan avgjøre"
    if re.match(r"^ALTER\s+SECURITY\s+POLICY\b", setning, re.IGNORECASE):
        uten_handling = BLOKKOPERASJON.sub(" ", setning)
    elif re.match(r"^(?:CREATE|ALTER)\s+TABLE\b", setning, re.IGNORECASE):
        uten_handling = REFERANSEHANDLING.sub(" ", setning)
    else:
        uten_handling = setning
    if (ord_ := FORBUDT.search(uten_handling)):
        return ord_.group(1).upper()
    if (senere := SETNINGSORD.search(uten_handling, len(start))):
        return f"{senere.group(1).upper()} etter starten av en setning (skill setningene med ;)"
    if re.match(r"^CREATE\s+OR\s+ALTER\b", setning, re.IGNORECASE):
        return "CREATE OR ALTER"
    if (tabell := re.match(rf"^CREATE\s+TABLE\s+({NAVN})\s*\(", setning, re.IGNORECASE)):
        nye.add(_navn(tabell.group(1)))
        return None
    if re.match(r"^CREATE\s+(?:SCHEMA|ROLE|USER|TYPE|SEQUENCE|SYNONYM)\b", setning, re.IGNORECASE):
        return None
    if (indeks := re.match(rf"^CREATE\s+(UNIQUE\s+)?(?:(?:NON)?CLUSTERED\s+)?INDEX\s+\w+\s+ON\s+({NAVN})\s*\(",
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
            pred = re.match(rf"^ADD\s+(?:FILTER|BLOCK)\s+PREDICATE\s+.*?\)\s+ON\s+({NAVN})(?:\s+(?:AFTER|BEFORE)\s+\w+)?$",
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
    kolonner: dict[str, dict[str, bool]] = {}
    try:
        lest = _uten_kommentarer_og_tekster(tekst)
    except Uleselig as feil:
        return [f"teksten kan ikke leses: {feil}"]
    for sats in GO.split(lest):
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
