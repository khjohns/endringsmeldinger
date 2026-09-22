"""Negative tester for B-02-prototypen, mot ekte PostgreSQL 17 og ekte PostgREST.

Kjøres av kjor.sh. Hver sjekk er merket med kriteriet i hovedplanens F1 den
prøver. Direkte forbindelser logger inn som `authenticator` og bytter rolle
transaksjonslokalt, slik PostgREST gjør, eller logger inn som `koe_worker`.
"""

import json
import os
import sys
import time
import uuid

import jwt
import psycopg
import requests
from psycopg import sql

DSN = os.environ["B02_DSN"]
PGRST = os.environ["B02_POSTGREST"]
HEMMELIG = os.environ["B02_JWT_SECRET"]

BH_A = "00000000-0000-4000-8000-0000000000a1"
RAAD_A = "00000000-0000-4000-8000-0000000000a2"
TE_A = "00000000-0000-4000-8000-0000000000a3"
VIEWER_A = "00000000-0000-4000-8000-0000000000a4"
BEGGE = "00000000-0000-4000-8000-0000000000ab"
TE_B = "00000000-0000-4000-8000-0000000000b1"
NOTAT_B = "e0000000-0000-4000-8000-0000000000b1"

resultater = []


def sjekk(kriterium, navn, ok, detalj=""):
    resultater.append((kriterium, navn, bool(ok), detalj))


def krav(aktor=None, prosjekt=None, team=None, side=None, rolle="koe_runtime"):
    k = {"role": rolle, "exp": int(time.time()) + 60}
    for navn, verdi in (("koe_aktor", aktor), ("koe_prosjekt", prosjekt),
                        ("koe_team", team), ("koe_side", side)):
        if verdi is not None:
            k[navn] = verdi
    return k


def kontekst(conn, k):
    """Det PostgREST gjør per forespørsel: rolle og krav, begge transaksjonslokale."""
    conn.execute(sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(k["role"])))
    conn.execute("SELECT set_config('request.jwt.claims', %s, true)", (json.dumps(k),))


def spor(k, spørring, param=()):
    """Én transaksjon på en ny forbindelse. Returnerer rader eller SQLSTATE."""
    with psycopg.connect(DSN, user="authenticator") as conn:
        try:
            with conn.transaction():
                kontekst(conn, k)
                return conn.execute(spørring, param).fetchall()
        except psycopg.Error as feil:
            return feil.sqlstate


def avvist(svar):
    return isinstance(svar, str)


def antall(svar):
    return None if avvist(svar) else len(svar)


def token(k):
    return jwt.encode(k, HEMMELIG, algorithm="HS256")


def http(metode, sti, k=None, profil=None, **kw):
    hode = {}
    if k is not None:
        hode["Authorization"] = f"Bearer {token(k)}"
    if profil:
        hode["Accept-Profile" if metode == "GET" else "Content-Profile"] = profil
    return requests.request(metode, f"{PGRST}{sti}", headers=hode, timeout=10, **kw)


# 1. Prosjektgrensen -----------------------------------------------------------

k_begge_a = krav(BEGGE, "prosjekt-a", "team-bh-a", "BH")
svar = spor(k_begge_a, "SELECT prosjekt_id FROM hendelse")
sjekk("Prosjekt A i kontekst", "medlem av A og B ser bare A i hendelse",
      not avvist(svar) and len(svar) > 0 and {r[0] for r in svar} == {"prosjekt-a"}, svar)
sjekk("Prosjekt A i kontekst", "direkte spørring etter B i hendelse gir null rader",
      antall(spor(k_begge_a, "SELECT 1 FROM hendelse WHERE prosjekt_id = 'prosjekt-b'")) == 0)
sjekk("Prosjekt A i kontekst", "direkte spørring etter B i notat gir null rader",
      antall(spor(k_begge_a, "SELECT 1 FROM notat WHERE prosjekt_id = 'prosjekt-b'")) == 0)
sjekk("Prosjekt A i kontekst", "direkte spørring etter B i sak_metadata gir null rader",
      antall(spor(k_begge_a, "SELECT 1 FROM sak_metadata WHERE prosjekt_id = 'prosjekt-b'")) == 0)
sjekk("Prosjekt A i kontekst", "ikke-medlem med A i konteksten ser ingen hendelser",
      antall(spor(krav(TE_B, "prosjekt-a", "team-te-b", "TE"), "SELECT 1 FROM hendelse")) == 0)

# 2. Motpart, to team på samme side, ukjent team, leserolle --------------------

svar = spor(krav(TE_A, "prosjekt-a", "team-te-a", "TE"), "SELECT aktor_team_id FROM notat")
sjekk("Motpart", "TE ser bare TEs notat, ikke BHs", svar == [("team-te-a",)], svar)
svar = spor(krav(RAAD_A, "prosjekt-a", "team-raad-a", "BH"), "SELECT aktor_team_id FROM notat")
sjekk("To team på samme side", "BH-rådgiveren ser ikke byggherrens notat", svar == [("team-raad-a",)], svar)
svar = spor(krav(BH_A, "prosjekt-a", str(uuid.uuid4()), "BH"), "SELECT 1 FROM notat")
sjekk("Ukjent team", "ukjent team gir null notater", antall(svar) == 0, svar)
svar = spor(krav(BH_A, "prosjekt-a", None, "BH"), "SELECT 1 FROM notat")
sjekk("Ukjent team", "manglende team gir null notater", antall(svar) == 0, svar)
k_viewer = krav(VIEWER_A, "prosjekt-a", "team-bh-a", "BH")
sjekk("Leserolle (DB-05)", "viewer leser journalen",
      (antall(spor(k_viewer, "SELECT 1 FROM hendelse")) or 0) > 0)
sjekk("Leserolle (DB-05)", "viewer med teamkrav ser ingen private notater",
      antall(spor(k_viewer, "SELECT 1 FROM notat")) == 0)

# 3. Manglende kontekst ----------------------------------------------------------

for navn, k in (("ingen krav", krav()),
                ("bare aktør", krav(BH_A)),
                ("bare prosjekt", krav(None, "prosjekt-a"))):
    sjekk("Manglende kontekst", f"{navn}: null hendelser",
          antall(spor(k, "SELECT 1 FROM hendelse")) == 0)
    sjekk("Manglende kontekst", f"{navn}: null notater",
          antall(spor(k, "SELECT 1 FROM notat")) == 0)

# 4. Gjettet ressurs-ID ------------------------------------------------------------

k_bh_a = krav(BH_A, "prosjekt-a", "team-bh-a", "BH")
sjekk("Gjettet ressurs-ID", "notat-ID fra B med A i konteksten gir null rader",
      antall(spor(k_bh_a, "SELECT 1 FROM notat WHERE notat_id = %s", (NOTAT_B,))) == 0)
sjekk("Gjettet ressurs-ID", "varsel på sak i B med A i konteksten avvises",
      spor(k_bh_a, "SELECT koe_api.send_varsel('sak-b1', 'grunnlag_varsel', '{}', 1)") == "42501")

# 5. Gjenbrukt forbindelse, direkte (T2) ----------------------------------------

with psycopg.connect(DSN, user="authenticator", autocommit=True) as conn:
    with conn.transaction():
        kontekst(conn, k_bh_a)
        foer = conn.execute("SELECT count(*) FROM notat").fetchone()[0]
    rest = conn.execute(
        "SELECT current_user, current_setting('request.jwt.claims', true)").fetchone()
    try:
        with conn.transaction():
            conn.execute("SET LOCAL ROLE koe_runtime")
            etter = conn.execute("SELECT count(*) FROM notat").fetchone()[0]
    except psycopg.Error as feil:
        etter = feil.sqlstate
    sjekk("Gjenbrukt forbindelse", "første transaksjon ser eget notat", foer == 1, foer)
    sjekk("Gjenbrukt forbindelse", "etter commit er rollen authenticator og kravene tomme",
          rest == ("authenticator", ""), rest)
    sjekk("Gjenbrukt forbindelse", "neste transaksjon uten krav ser null notater", etter == 0, etter)
    try:
        conn.execute("SELECT 1 FROM notat").fetchall()
        sjekk("Gjenbrukt forbindelse", "authenticator selv leser ikke notat", False)
    except psycopg.Error as feil:
        sjekk("Gjenbrukt forbindelse", "authenticator selv leser ikke notat", feil.sqlstate == "42501")

# Negativ kontroll: sesjonsnivå (is_local = false) lekker. Det er grunnen til at
# direkte forbindelser bare får sette kontekst transaksjonslokalt.
with psycopg.connect(DSN, user="authenticator", autocommit=True) as conn:
    conn.execute("SELECT set_config('request.jwt.claims', %s, false)", (json.dumps(k_bh_a),))
    with conn.transaction():
        conn.execute("SET LOCAL ROLE koe_runtime")
        lekket = conn.execute("SELECT count(*) FROM notat").fetchone()[0]
    sjekk("Gjenbrukt forbindelse", "kontroll: kontekst satt på sesjonsnivå lekker", lekket == 1, lekket)

# 6. Gjenbrukt forbindelse gjennom PostgREST (db-pool = 1) -------------------------

r1 = http("POST", "/rpc/hvem", k_bh_a, "koe_api", json={})
r2 = http("POST", "/rpc/hvem", krav(), "koe_api", json={})
r3 = http("GET", "/notat?select=notat_id", krav())
r4 = http("GET", "/notat?select=aktor_team_id", k_bh_a)
p1, p2 = r1.json(), r2.json()
sjekk("Gjenbrukt forbindelse", "PostgREST: samme backend-pid i to forespørsler",
      p1.get("pid") == p2.get("pid"), (p1.get("pid"), p2.get("pid")))
sjekk("Gjenbrukt forbindelse", "PostgREST: andre forespørsel har ikke første forespørsels krav",
      "koe_aktor" not in (p2.get("krav") or ""), p2)
sjekk("Gjenbrukt forbindelse", "PostgREST: GET /notat uten koe-krav gir tom liste",
      r3.status_code == 200 and r3.json() == [], (r3.status_code, r3.text))
sjekk("Prosjekt A i kontekst", "PostgREST: GET /notat med BH i A gir bare BHs notat",
      r4.status_code == 200 and r4.json() == [{"aktor_team_id": "team-bh-a"}], r4.text)

# 7. Runtime kan ikke skrive direkte til journalen ---------------------------------

for navn, s in (("UPDATE", "UPDATE hendelse SET data = '{}'"),
                ("DELETE", "DELETE FROM hendelse"),
                ("TRUNCATE", "TRUNCATE hendelse"),
                ("INSERT", "INSERT INTO hendelse (event_id, source, type, subject, actorid, "
                           "actorrole, data, sak_id, event_type, versjon, prosjekt_id) VALUES "
                           "(gen_random_uuid(), 'x', 'x', 'sak-a1', 'x', 'BH', '{}', 'sak-a1', 'x', 99, 'prosjekt-a')")):
    sjekk("Runtime skriver ikke til hendelse", f"{navn} som koe_runtime avvises",
          spor(k_bh_a, s) == "42501")
r = http("PATCH", "/hendelse?sak_id=eq.sak-a1", k_bh_a, json={"data": {}})
sjekk("Runtime skriver ikke til hendelse", "PostgREST: PATCH /hendelse avvises",
      r.status_code in (401, 403), (r.status_code, r.text))
r = http("DELETE", "/hendelse?sak_id=eq.sak-a1", k_bh_a)
sjekk("Runtime skriver ikke til hendelse", "PostgREST: DELETE /hendelse avvises",
      r.status_code in (401, 403), (r.status_code, r.text))

# 8. Heller ikke service_role, som enhver som kan signere et JWT kan bli ------------

k_sr = krav(rolle="service_role")
for navn, s in (("UPDATE", "UPDATE hendelse SET data = '{}'"),
                ("DELETE", "DELETE FROM hendelse"),
                ("TRUNCATE", "TRUNCATE hendelse"),
                ("kaskade fra sak_metadata", "DELETE FROM sak_metadata WHERE sak_id = 'sak-a1'"),
                ("TRUNCATE sak_metadata CASCADE", "TRUNCATE sak_metadata CASCADE"),
                ("INSERT", "INSERT INTO hendelse (event_id, source, type, subject, actorid, "
                           "actorrole, data, sak_id, event_type, versjon, prosjekt_id) VALUES "
                           "(gen_random_uuid(), 'x', 'x', 'sak-a1', 'x', 'BH', '{}', 'sak-a1', 'x', 99, 'prosjekt-a')"),
                ("DISABLE TRIGGER", "ALTER TABLE hendelse DISABLE TRIGGER a_skrivevakt"),
                ("session_replication_role", "SET LOCAL session_replication_role = replica")):
    svar = spor(k_sr, s)
    sjekk("service_role skriver ikke til hendelse", f"{navn} som service_role avvises", svar == "42501", svar)
# Kontroll: service_role har rettighetene; det er skrivevakten som stanser den.
svar = spor(k_sr, "UPDATE sak_metadata SET cached_title = 'x' WHERE sak_id = 'sak-a1' RETURNING 1")
sjekk("service_role skriver ikke til hendelse", "kontroll: service_role kan endre sak_metadata, som ikke har skrivevakt",
      svar == [(1,)], svar)
r = http("PATCH", "/hendelse?sak_id=eq.sak-a1", k_sr, json={"data": {}})
sjekk("service_role skriver ikke til hendelse", "PostgREST: PATCH /hendelse med service_role-JWT avvises",
      r.status_code >= 400, (r.status_code, r.text[:120]))
r = http("GET", "/notat?select=notat_id", k_sr)
sjekk("Restrisiko, akseptert", "PostgREST: service_role-JWT leser alle notater (konfidensialitet ved overtatt runtime)",
      r.status_code == 200 and len(r.json()) == 4, (r.status_code, len(r.json()) if r.ok else r.text))

# 9. Kommandoen ------------------------------------------------------------------

r = http("POST", "/rpc/send_varsel", k_bh_a, "koe_api",
         json={"p_sak_id": "sak-a1", "p_type": "vederlag_krav", "p_data": {"belop": 1}, "p_forventet_versjon": 1})
sjekk("Kommando", "PostgREST: send_varsel som BH i A lykkes", r.status_code == 200, (r.status_code, r.text))
ny = r.json() if r.ok else None
svar = spor(k_bh_a, "SELECT actorid, actorrole, prosjekt_id, versjon FROM hendelse WHERE event_id = %s", (ny,))
sjekk("Kommando", "aktør, side og prosjekt er stemplet fra konteksten",
      svar == [(BH_A, "BH", "prosjekt-a", 2)], svar)
with psycopg.connect(DSN, user="koe_worker") as conn:
    kø = conn.execute("SELECT count(*) FROM utgaende_levering WHERE event_id = %s", (ny,)).fetchone()[0]
sjekk("Kommando", "leveringsintensjonen er skrevet i samme transaksjon", kø == 1, kø)
r = http("POST", "/rpc/send_varsel", k_bh_a, "koe_api",
         json={"p_sak_id": "sak-a1", "p_type": "vederlag_krav", "p_data": {}, "p_forventet_versjon": 1})
sjekk("Kommando", "utdatert versjon gir konflikt", r.status_code >= 400 and "versjonskonflikt" in r.text, r.text[:120])
r = http("POST", "/rpc/send_varsel", k_bh_a, "koe_api",
         json={"p_sak_id": "sak-a1", "p_type": "eo_utstedt", "p_data": {}, "p_forventet_versjon": 2})
sjekk("Kommando", "type som krever godkjenning avvises (ingen generell append)",
      r.status_code >= 400 and "egen kommando" in r.text, r.text[:120])
svar = spor(krav(VIEWER_A, "prosjekt-a", None, "BH"),
            "SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', '{}', 2)")
sjekk("Leserolle (DB-05)", "viewer kan ikke sende varsel", svar == "42501", svar)

# 10. Workeren (T2, egen innlogging) ------------------------------------------------

with psycopg.connect(DSN, user="koe_worker") as conn:
    for navn, s, forventet in (
        ("leser køen", "SELECT count(*) FROM utgaende_levering", None),
        ("oppdaterer status", "UPDATE utgaende_levering SET status = 'levert' WHERE id = 1", None),
        ("leser ikke notat", "SELECT 1 FROM notat", "42501"),
        ("skriver ikke hendelse", "DELETE FROM hendelse", "42501"),
        ("endrer ikke prosjekt i køen", "UPDATE utgaende_levering SET prosjekt_id = 'x'", "42501"),
    ):
        try:
            with conn.transaction():
                conn.execute(s)
            utfall = None
        except psycopg.Error as feil:
            utfall = feil.sqlstate
        sjekk("Worker", navn, utfall == forventet, utfall)

# 11. Data API for anon og authenticated ------------------------------------------

for navn, k in (("anon (uten JWT)", None), ("authenticated", krav(BH_A, "prosjekt-a", "team-bh-a", "BH", "authenticated"))):
    r = http("GET", "/notat", k)
    sjekk("Data API", f"{navn}: GET /notat avvises", r.status_code in (401, 403), (r.status_code, r.text[:80]))
    r = http("GET", "/hendelse", k)
    sjekk("Data API", f"{navn}: GET /hendelse avvises", r.status_code in (401, 403), (r.status_code, r.text[:80]))
    r = http("POST", "/rpc/send_varsel", k, "koe_api",
             json={"p_sak_id": "sak-a1", "p_type": "grunnlag_varsel", "p_data": {}, "p_forventet_versjon": 3})
    sjekk("Data API", f"{navn}: RPC send_varsel avvises", r.status_code in (401, 403, 404), (r.status_code, r.text[:80]))
    r = http("POST", "/rpc/koe_resolve_identity", k,
             json={"p_provider": "catenda", "p_issuer": "https://api.catenda.com", "p_subject": "x", "p_email": "", "p_name": ""})
    sjekk("Data API", f"{navn}: RPC koe_resolve_identity avvises", r.status_code in (401, 403, 404), (r.status_code, r.text[:80]))

# 12. Dagens identitetsfunksjoner med avgrenset runtime -----------------------------

k_sys = krav()
args = {"p_provider": "catenda", "p_issuer": "https://api.catenda.com", "p_subject": "sub-a1", "p_email": "", "p_name": ""}
r = http("POST", "/rpc/koe_resolve_identity", k_sys, json=args)
sjekk("Identitet", "PostgREST: koe_resolve_identity som koe_runtime finner eksisterende bruker",
      r.status_code == 200 and r.json() == BH_A, (r.status_code, r.text))
svar = spor(k_sys, "INSERT INTO app_users (email, name) VALUES ('x', 'x')")
sjekk("Identitet", "koe_runtime kan ikke skrive app_users direkte", svar == "42501", svar)
svar = spor(k_sys, "SELECT 1 FROM app_identities")
sjekk("Identitet", "koe_runtime kan ikke lese app_identities direkte", svar == "42501", svar)

# B-04: tilbakekalling gjennom dagens synkronisering virker fra neste transaksjon.
k_raad = krav(RAAD_A, "prosjekt-a", "team-raad-a", "BH")
sjekk("Tilbakekalling (B-04)", "rådgiveren ser sitt notat før synkronisering",
      antall(spor(k_raad, "SELECT 1 FROM notat")) == 1)
medlemmer = [{"subject": f"sub-{s}", "email": "", "name": "", "role": "member"}
             for s in ("a1", "a3", "a4", "ab")]
r = http("POST", "/rpc/koe_reconcile_memberships", k_sys, json={
    "p_project": "prosjekt-a", "p_catenda_project": "c0000000-0000-4000-8000-00000000000a",
    "p_members": medlemmer, "p_started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
sjekk("Tilbakekalling (B-04)", "PostgREST: koe_reconcile_memberships som koe_runtime lykkes",
      r.status_code == 200 and r.json() is True, (r.status_code, r.text))
sjekk("Tilbakekalling (B-04)", "rådgiveren fjernet fra øyeblikksbildet ser null notater i neste forespørsel",
      antall(spor(k_raad, "SELECT 1 FROM notat")) == 0)
sjekk("Tilbakekalling (B-04)", "og null hendelser",
      antall(spor(k_raad, "SELECT 1 FROM hendelse")) == 0)

# Rapport ------------------------------------------------------------------------

feil = [r for r in resultater if not r[2]]
for kriterium, navn, ok, detalj in resultater:
    linje = f"{'OK  ' if ok else 'FEIL'} | {kriterium} | {navn}"
    if not ok:
        linje += f" | {detalj!r}"
    print(linje)
print(f"\n{len(resultater) - len(feil)} av {len(resultater)} sjekker holdt.")
sys.exit(1 if feil else 0)
