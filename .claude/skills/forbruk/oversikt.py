"""Oversikt over tokenforbruket i skyøktene, fra list_sessions og list_events (#2401).

  python3 oversikt.py --fra 2026-10-15 --til 2026-10-22 --ider side1.txt ...
  python3 oversikt.py --fra 2026-10-15 --til 2026-10-22 \\
      --transkripsjon agent-1.jsonl ... -- side1.txt ...

Sidene er lagrede svar fra list_sessions. Med `--ider` skriver skriptet bare
ID-ene til øktene som telles. Kostnaden står ikke lenger i list_sessions; den leses
av result-hendelsene som list_events med `kinds` ["result"] ga i transkripsjonene.
Skriver bare sammendraget, så rå-svarene aldri havner i konteksten.
"""

import argparse
import collections
import json
import re
import sys
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


def resultater(verdi):
    """Hvert objekt med `total_cost_usd` i et svar fra list_events."""
    if isinstance(verdi, dict):
        if "total_cost_usd" in verdi:
            yield verdi
        for v in verdi.values():
            yield from resultater(v)
    elif isinstance(verdi, list):
        for v in verdi:
            yield from resultater(v)


def svartekst(innhold):
    """Teksten i et verktøysvar, også når svaret er lagret til fil."""
    if isinstance(innhold, list):
        innhold = "\n".join(b.get("text", "") for b in innhold if isinstance(b, dict))
    if not isinstance(innhold, str):
        return ""
    if innhold.lstrip()[:1] in "{[":
        return innhold
    for sti in re.findall(r"(/[^\s'\"`]+\.(?:txt|json))", innhold):
        if Path(sti).is_file():
            return Path(sti).read_text(encoding="utf-8")
    return ""


def kontekst_i(resultat):
    """Konteksten i siste API-kall i turen resultatet avslutter."""
    kall = ((resultat.get("usage") or {}).get("iterations") or [{}])[-1]
    return sum(
        kall.get(k) or 0
        for k in (
            "input_tokens",
            "cache_read_input_tokens",
            "cache_creation_input_tokens",
        )
    )


def les_kostnad(stier):
    """Kostnad, cache_read og kontekst per økt, fra list_events i transkripsjonene.

    Kostnaden er den høyeste `total_cost_usd`, og cache_read tas fra samme
    hendelse. Summen kan nullstilles når en økt startes på nytt, så tallet er et
    nedre anslag. Konteksten tas fra den nyeste hendelsen.
    """
    kall, svar = {}, {}
    for sti in stier:
        for linje in Path(sti).read_text(encoding="utf-8").splitlines():
            try:
                innhold = (json.loads(linje).get("message") or {}).get("content")
            except (json.JSONDecodeError, AttributeError):
                continue
            for blokk in innhold if isinstance(innhold, list) else []:
                if blokk.get("type") == "tool_use" and blokk.get("name", "").endswith(
                    "list_events"
                ):
                    kall[blokk["id"]] = (blokk.get("input") or {}).get("session_id")
                elif blokk.get("type") == "tool_result":
                    svar[blokk.get("tool_use_id")] = blokk.get("content")
    kostnad = {}
    for bruk_id, okt in kall.items():
        tekst = svartekst(svar.get(bruk_id))
        if not okt or not tekst:
            continue
        try:
            data = json.loads(tekst)
        except json.JSONDecodeError:
            continue
        for hendelse in (finn_svar(data) or {}).get("data", []):
            for r in resultater(hendelse):
                tid = hendelse.get("created_at") or ""
                k = kostnad.setdefault(
                    okt,
                    {"cost_usd": 0.0, "cache_read_tokens": 0, "tid": "", "kontekst": 0},
                )
                if (r.get("total_cost_usd") or 0) >= k["cost_usd"]:
                    k["cost_usd"] = r.get("total_cost_usd") or 0
                    k["cache_read_tokens"] = sum(
                        m.get("cacheReadInputTokens") or 0
                        for m in (r.get("modelUsage") or {}).values()
                    )
                if tid >= k["tid"]:
                    k["tid"], k["kontekst"] = tid, kontekst_i(r)
    return kostnad


def tittel(okt):
    return okt.get("title") or ""


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
    p.add_argument("--ider", action="store_true", help="skriv bare ID-ene som telles")
    p.add_argument(
        "--transkripsjon",
        nargs="+",
        default=[],
        help="transkripsjoner med kallene til list_events",
    )
    p.add_argument("filer", nargs="+")
    a = p.parse_args()

    alle, eldste, har_mer, usortert = les_okter(a.filer)
    if not alle:
        print("ingen økter i sidene", file=sys.stderr)
        return
    foreldre = {o.get("parent_session_id") for o in alle.values()}
    # Kostnaden er samlet over hele økta, så en økt telles i uka den ble opprettet.
    okter = [o for o in alle.values() if a.fra <= o["created_at"][:10] < a.til]
    for_perioden = [
        o
        for o in alle.values()
        if o["created_at"][:10] < a.fra and o["updated_at"][:10] >= a.fra
    ]

    if a.ider:
        for o in okter + for_perioden:
            print(o["id"])
        return
    kostnad = les_kostnad(a.transkripsjon)

    def bruk(o):
        return kostnad.get(o["id"]) or {}

    def kontekst(o):
        return bruk(o).get("kontekst") or 0

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
        print(
            f"{len(uten)} økter uten result-hendelse: {', '.join(o['id'] for o in uten)}"
        )
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
