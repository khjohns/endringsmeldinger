"""Oversikt over tokenforbruket i skyøktene, fra lagrede svar fra list_sessions.

Bruk: python3 oversikt.py --fra 2026-10-15 --til 2026-10-22 side1.txt side2.txt ...

Skriver bare sammendraget, så rå-svarene aldri havner i konteksten.
"""

import argparse
import collections
import json
import re
from datetime import date, timedelta
from pathlib import Path


def finn_svar(verdi):
    """Objektet med `data`, også når det ligger inne i et omslag eller en tekstblokk."""
    if isinstance(verdi, dict):
        if isinstance(verdi.get("data"), list):
            return verdi
        verdier = list(verdi.values())
    elif isinstance(verdi, list):
        verdier = verdi
    elif isinstance(verdi, str) and verdi.lstrip()[:1] in "{[":
        try:
            return finn_svar(json.loads(verdi))
        except json.JSONDecodeError:
            return None
    else:
        return None
    for v in verdier:
        svar = finn_svar(v)
        if svar is not None:
            return svar
    return None


def les_okter(stier):
    """Øktene i sidene, og om siden med de eldste øktene har flere etter seg."""
    okter = {}
    eldste, har_mer, usortert = None, False, []
    for sti in stier:
        tekst = Path(sti).read_text(encoding="utf-8")
        start = min(i for i in (tekst.find("{"), tekst.find("["), len(tekst)) if i >= 0)
        slutt = max(tekst.rfind("}"), tekst.rfind("]")) + 1
        svar = finn_svar(tekst[start:slutt])
        if svar is None:
            raise SystemExit(f"fant ingen økter i {sti}")
        data = svar["data"]
        opprettet = [o["created_at"] for o in data]
        if opprettet != sorted(opprettet, reverse=True):
            usortert.append(sti)
        for okt in data:
            okter[okt["id"]] = okt
        if data and (eldste is None or min(opprettet) < eldste):
            eldste, har_mer = min(opprettet), svar.get("has_more", False)
    return okter, eldste, har_mer, usortert


def tittel(okt):
    return okt.get("title") or ""


def metadata(okt):
    return okt.get("external_metadata") or {}


def rolle(okt, foreldre):
    t = tittel(okt).lower()
    if okt["id"] in foreldre or re.search(r"orkestr|orchestr|planlegg", t):
        return "orkestrator"
    if "review" in t:
        return "review"
    return "bygg"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--fra", required=True, help="første dato, ÅÅÅÅ-MM-DD")
    p.add_argument("--til", required=True, help="dagen etter siste dato, ÅÅÅÅ-MM-DD")
    p.add_argument("--topp", type=int, default=10)
    p.add_argument("filer", nargs="+")
    a = p.parse_args()

    alle, eldste, har_mer, usortert = les_okter(a.filer)
    if not alle:
        print("ingen økter i sidene")
        return
    foreldre = {o.get("parent_session_id") for o in alle.values()}
    # Kostnaden er samlet over hele økta, så en økt telles i uka den ble opprettet.
    okter = [o for o in alle.values() if a.fra <= o["created_at"][:10] < a.til]
    for_perioden = [
        o
        for o in alle.values()
        if o["created_at"][:10] < a.fra and o["updated_at"][:10] >= a.fra
    ]

    def bruk(o):
        return o.get("usage") or metadata(o).get("usage") or {}

    def kontekst(o):
        return (metadata(o).get("context_usage") or {}).get("used_tokens") or 0

    print(
        f"{len(okter)} økter opprettet fra {a.fra} til {a.til} "
        f"(eldste opprettet i sidene: {eldste[:10]}, has_more: {har_mer})"
    )
    tre_dager_for = (date.fromisoformat(a.fra) - timedelta(days=3)).isoformat()
    if har_mer and eldste[:10] >= tre_dager_for:
        print(
            f"ADVARSEL: sidene når ikke tilbake til {tre_dager_for}; hent flere sider"
        )
    if usortert:
        print(f"ADVARSEL: ikke sortert etter opprettelse: {', '.join(usortert)}")
    if for_perioden:
        print(
            f"utenfor summen: {len(for_perioden)} økter opprettet før {a.fra} og "
            f"endret i perioden, til sammen "
            f"{sum(bruk(o).get('cost_usd') or 0 for o in for_perioden):.0f} USD over hele "
            "levetiden (også arkivering endrer tidspunktet)"
        )
    uten = [o for o in okter if not bruk(o)]
    if uten:
        print(f"{len(uten)} økter uten usage")
    print(f"sum USD {sum(bruk(o).get('cost_usd') or 0 for o in okter):.0f}")

    per_dag = collections.defaultdict(lambda: [0, 0.0])
    per_rolle = collections.defaultdict(lambda: [0, 0.0, 0])
    for o in okter:
        k = bruk(o).get("cost_usd") or 0
        per_dag[o["created_at"][:10]][0] += 1
        per_dag[o["created_at"][:10]][1] += k
        r = per_rolle[rolle(o, foreldre)]
        r[0] += 1
        r[1] += k
        r[2] += bruk(o).get("cache_read_tokens") or 0
    print("\nper dag:")
    for dag, (n, k) in sorted(per_dag.items()):
        print(f"  {dag}  {n:3} økter  {k:6.0f} USD")
    print("\nper rolle:")
    for navn, (n, k, cr) in sorted(per_rolle.items(), key=lambda x: -x[1][1]):
        print(
            f"  {navn:12} {n:3} økter  {k:6.0f} USD  snitt {k / n:5.1f}  cache_read {cr / 1e6:6.0f}M"
        )

    over = {
        g: sum(1 for o in okter if kontekst(o) > g) for g in (150_000, 300_000, 500_000)
    }
    print(
        "\nkontekst ved slutt over grensene: "
        + ", ".join(f">{g // 1000}k: {n}" for g, n in over.items())
    )

    print(f"\nde {a.topp} dyreste:")
    for o in sorted(okter, key=lambda o: -(bruk(o).get("cost_usd") or 0))[: a.topp]:
        b = bruk(o)
        print(
            f"  {b.get('cost_usd') or 0:6.1f} USD  kontekst {kontekst(o):>7}  "
            f"cache_read {(b.get('cache_read_tokens') or 0) / 1e6:5.1f}M  "
            f"{rolle(o, foreldre):11}  {o['id']}  {tittel(o)[:60]}"
        )


if __name__ == "__main__":
    main()
