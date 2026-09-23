"""Negative tester for B-02-prototypen v2, mot PostgreSQL 17 og ekte PostgREST.

Kjøres av kjor.sh. Hver sjekk er merket med kriteriet i F1 eller funnet i
reviewet (RB2) den prøver. Tre veier inn:

- T1: `authenticator` bytter rolle transaksjonslokalt, som PostgREST, eller ekte
  HTTP mot PostgREST med forespørselsvakten på.
- T2: `koe_runtime_login` logger inn selv og bytter til `koe_runtime`.
- Tilsyn: `postgres` (eier, BYPASSRLS) leser fasit og injiserer feil. Den
  representerer migreringsrollen, ikke runtime.
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


def bruker(suffiks):
    return f"00000000-0000-4000-8000-0000000000{suffiks}"


BH_A, RAAD_A, TE_A, VIEWER_A, BEGGE, TE_B = (bruker(s) for s in ("a1", "a2", "a3", "a4", "ab", "b1"))
T_BH_A = "ba0000000000400080000000000000a1"
T_RAAD_A = "ba0000000000400080000000000000a2"
T_TE_A = "ea0000000000400080000000000000a3"
T_BH_B = "bb0000000000400080000000000000b1"
T_TE_B = "eb0000000000400080000000000000b2"


def subjekt(suffiks):
    return f"5a0000000000400080000000000000{suffiks}"


resultater = []


def sjekk(kriterium, navn, ok, detalj=""):
    resultater.append((kriterium, navn, bool(ok), detalj))


def krav(aktor=None, prosjekt=None, team=None, side=None, rolle="koe_runtime", levetid=30):
    k = {"role": rolle, "exp": int(time.time()) + levetid}
    for navn, verdi in (("koe_aktor", aktor), ("koe_prosjekt", prosjekt),
                        ("koe_team", team), ("koe_side", side)):
        if verdi is not None:
            k[navn] = verdi
    return k


K_BH_A = krav(BH_A, "prosjekt-a", T_BH_A, "BH")
K_SR = krav(rolle="service_role")


def kontekst(conn, k):
    conn.execute(sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(k["role"])))
    conn.execute("SELECT set_config('request.jwt.claims', %s, true)", (json.dumps(k),))


def spor(k, tekst, param=(), innlogging="authenticator"):
    """Én transaksjon på en ny forbindelse, alltid rullet tilbake.
    Returnerer rader, antall berørte rader, eller SQLSTATE som streng."""
    with psycopg.connect(DSN, user=innlogging) as conn:
        try:
            if k is not None:
                kontekst(conn, k)
            svar = conn.execute(tekst, param)
            return svar.fetchall() if svar.description else svar.rowcount
        except psycopg.Error as feil:
            return feil.sqlstate
        finally:
            conn.rollback()


def feil_og_melding(k, tekst, param=()):
    with psycopg.connect(DSN, user="authenticator") as conn:
        try:
            kontekst(conn, k)
            conn.execute(tekst, param)
            return "OK"
        except psycopg.Error as feil:
            return (feil.sqlstate, feil.diag.message_primary)
        finally:
            conn.rollback()


def utfor(k, tekst, param=(), innlogging="authenticator"):
    """Som spor, men committer."""
    with psycopg.connect(DSN, user=innlogging) as conn:
        try:
            with conn.transaction():
                if k is not None:
                    kontekst(conn, k)
                svar = conn.execute(tekst, param)
                return svar.fetchall() if svar.description else svar.rowcount
        except psycopg.Error as feil:
            return feil.sqlstate


def tilsyn(tekst, param=()):
    with psycopg.connect(DSN, user="postgres", autocommit=True) as conn:
        svar = conn.execute(tekst, param)
        return svar.fetchall() if svar.description else svar.rowcount


def antall(svar):
    return None if isinstance(svar, str) else len(svar)


def http(metode, sti, k=None, profil=None, **kw):
    hode = {}
    if k is not None:
        hode["Authorization"] = "Bearer " + jwt.encode(k, HEMMELIG, algorithm="HS256")
    if profil:
        hode["Accept-Profile" if metode == "GET" else "Content-Profile"] = profil
    return requests.request(metode, PGRST + sti, headers=hode, timeout=10, **kw)


NOTAT = {tekst: str(i) for i, tekst in tilsyn("SELECT notat_id, tekst FROM notat")}
NOTAT_BH_A, NOTAT_RAAD_A, NOTAT_B = NOTAT["BHs notat i A"], NOTAT["Rådgiverens notat i A"], NOTAT["BHs notat i B"]

# F1: prosjektgrensen ---------------------------------------------------------------

k_begge_a = krav(BEGGE, "prosjekt-a", T_BH_A, "BH")
svar = spor(k_begge_a, "SELECT DISTINCT prosjekt_id FROM hendelse")
sjekk("Prosjekt A i kontekst", "medlem av A og B ser bare A i hendelse", svar == [("prosjekt-a",)], svar)
for tabell in ("hendelse", "notat", "sak_metadata"):
    sjekk("Prosjekt A i kontekst", f"spørring etter B i {tabell} gir null rader",
          spor(k_begge_a, f"SELECT 1 FROM {tabell} WHERE prosjekt_id = 'prosjekt-b'") == [])
sjekk("Prosjekt A i kontekst", "ikke-medlem med A i konteksten ser ingen hendelser",
      spor(krav(TE_B, "prosjekt-a", T_TE_A, "TE"), "SELECT 1 FROM hendelse") == [])

# F1: team, side og leserolle -------------------------------------------------------

svar = spor(krav(TE_A, "prosjekt-a", T_TE_A, "TE"), "SELECT aktor_team_id FROM notat")
sjekk("Motpart", "TE ser bare TEs notat", svar == [(T_TE_A,)], svar)
svar = spor(krav(RAAD_A, "prosjekt-a", T_RAAD_A, "BH"), "SELECT aktor_team_id FROM notat")
sjekk("To team på samme side", "BH-rådgiveren ser bare sitt eget notat", svar == [(T_RAAD_A,)], svar)
sjekk("Ukjent team", "team som ikke er prosjektets kontraktsteam gir null notater",
      spor(krav(BH_A, "prosjekt-a", uuid.uuid4().hex, "BH"), "SELECT 1 FROM notat") == [])
sjekk("Ukjent team", "team fra prosjekt B med A i konteksten gir null notater",
      spor(krav(BEGGE, "prosjekt-a", T_BH_B, "BH"), "SELECT 1 FROM notat") == [])
sjekk("Ukjent team", "TE-team oppgitt med side BH gir null notater (RB2-04)",
      spor(krav(BH_A, "prosjekt-a", T_TE_A, "BH"), "SELECT 1 FROM notat") == [])
sjekk("Ukjent team", "manglende team gir null notater",
      spor(krav(BH_A, "prosjekt-a", None, "BH"), "SELECT 1 FROM notat") == [])
k_viewer = krav(VIEWER_A, "prosjekt-a", T_BH_A, "BH")
sjekk("Leserolle (DB-05)", "viewer leser journalen", (antall(spor(k_viewer, "SELECT 1 FROM hendelse")) or 0) > 0)
sjekk("Leserolle (DB-05)", "viewer ser ingen private notater", spor(k_viewer, "SELECT 1 FROM notat") == [])
sjekk("Leserolle (DB-05)", "viewer kan ikke sende varsel",
      spor(k_viewer, "SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', '{}', 1)") == "42501")

# F1 og RB2-04: manglende og ugyldig kontekst ---------------------------------------

for navn, k in (("ingen krav", krav()),
                ("bare aktør", krav(BH_A)),
                ("bare prosjekt", krav(None, "prosjekt-a"))):
    for tabell in ("hendelse", "notat"):
        sjekk("Manglende kontekst", f"{navn}: null rader i {tabell}", spor(k, f"SELECT 1 FROM {tabell}") == [])

for navn, endring in (("manglende side", {"koe_side": None}),
                      ("ugyldig side", {"koe_side": "UKJENT"}),
                      ("side som JSON-objekt", {"koe_side": {}}),
                      ("tom side", {"koe_side": ""})):
    k = {n: v for n, v in (K_BH_A | endring).items() if v is not None}
    sjekk("RB2-04 kontekst", f"{navn}: null private notater", spor(k, "SELECT 1 FROM notat") == [])
    sjekk("RB2-04 kontekst", f"{navn}: kommandoen avviser",
          spor(k, "SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', '{}', 1)") == "42501")
for navn, endring, forventet in (
    ("store bokstaver i aktørens UUID normaliseres", {"koe_aktor": BH_A.upper()}, 1),
    ("aktør som JSON-liste", {"koe_aktor": [BH_A]}, 0),
    ("prosjekt som JSON-objekt", {"koe_prosjekt": {}}, 0),
    ("tomt prosjekt", {"koe_prosjekt": ""}, 0),
    ("team som JSON-liste", {"koe_team": [T_BH_A]}, 0),
    ("team med bindestreker", {"koe_team": str(uuid.UUID(T_BH_A))}, 0),
    ("ekstra krav ignoreres", {"admin": True}, 1),
):
    svar = spor(K_BH_A | endring, "SELECT count(*) FROM notat")
    sjekk("RB2-04 kontekst", navn, svar == [(forventet,)], svar)

# RB2-04: kommandoargumenter ---------------------------------------------------------

for navn, kall in (
    ("NULL forventet versjon", "SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', '{}', NULL)"),
    ("negativ forventet versjon", "SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', '{}', -1)"),
    ("NULL hendelsestype", "SELECT koe_api.send_varsel('sak-a1', NULL, '{}', 1)"),
    ("data som JSON-liste", "SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', '[]', 1)"),
    ("NULL data", "SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', NULL, 1)"),
    ("tomt notat", "SELECT koe_api.skriv_notat('sak-a1', '')"),
    ("NULL sak ved opprettelse", "SELECT koe_api.opprett_sak(NULL, 'KOE')"),
):
    svar = spor(K_BH_A, kall)
    sjekk("RB2-04 argumenter", f"{navn} avvises med 22023", svar == "22023", svar)

# F1 og RB2-03: gjettet ressurs-ID og private skrivestier ----------------------------

sjekk("Gjettet ressurs-ID", "notat-ID fra B med A i konteksten gir null rader",
      spor(K_BH_A, "SELECT 1 FROM notat WHERE notat_id = %s", (NOTAT_B,)) == [])
feil_b = feil_og_melding(K_BH_A, "SELECT koe_api.send_varsel('sak-b1', 'grunnlag_varsel', '{}', 1)")
feil_ukjent = feil_og_melding(K_BH_A, "SELECT koe_api.send_varsel('sak-x', 'grunnlag_varsel', '{}', 1)")
sjekk("Gjettet ressurs-ID", "varsel: sak i B og ukjent sak gir identisk avvisning",
      feil_b == feil_ukjent == ("42501", "ukjent sak"), (feil_b, feil_ukjent))
sjekk("RB2-03 private skrivestier", "runtime kan ikke skrive notat direkte",
      spor(K_BH_A, "INSERT INTO notat (notat_id, sak_id, prosjekt_id, aktor_id, aktor_rolle, "
                   "aktor_team_id, tekst) VALUES (%s, 'sak-a1', 'prosjekt-a', %s, 'BH', %s, 'x')",
           (NOTAT_B, BH_A, T_BH_A)) == "42501")
sjekk("RB2-03 private skrivestier", "runtime kan ikke slette notat direkte",
      spor(K_BH_A, "DELETE FROM notat") == "42501")
feil_b = feil_og_melding(K_BH_A, "SELECT koe_api.skriv_notat('sak-b1', 'x')")
feil_ukjent = feil_og_melding(K_BH_A, "SELECT koe_api.skriv_notat('sak-x', 'x')")
sjekk("RB2-03 private skrivestier", "notat: sak i B og ukjent sak gir identisk avvisning",
      feil_b == feil_ukjent == ("42501", "ukjent sak"), (feil_b, feil_ukjent))
feil_team = feil_og_melding(K_BH_A | {"koe_team": uuid.uuid4().hex}, "SELECT koe_api.skriv_notat('sak-a1', 'x')")
sjekk("RB2-03 private skrivestier", "notat med ukjent team avvises likt",
      feil_team == ("42501", "ukjent sak"), feil_team)
nytt = utfor(K_BH_A, "SELECT koe_api.skriv_notat('sak-a1', 'nytt notat')")
nytt_id = str(nytt[0][0]) if isinstance(nytt, list) else None
sjekk("RB2-03 private skrivestier", "skriv_notat lykkes og notatet leses av eget team",
      nytt_id is not None and spor(K_BH_A, "SELECT tekst FROM notat WHERE notat_id = %s", (nytt_id,)) == [("nytt notat",)],
      nytt)
svar = tilsyn("SELECT aktor_id, aktor_rolle, aktor_team_id, prosjekt_id FROM notat WHERE notat_id = %s", (nytt_id,))
sjekk("RB2-03 private skrivestier", "notatet er stemplet fra konteksten", svar == [(BH_A, "BH", T_BH_A, "prosjekt-a")], svar)
slett = [utfor(K_BH_A, "SELECT koe_api.slett_notat(%s)", (i,)) for i in (NOTAT_RAAD_A, str(uuid.uuid4()), NOTAT_B)]
sjekk("RB2-03 private skrivestier", "slett_notat gir samme svar for andres, ukjent og annet prosjekts notat",
      slett == [[(False,)]] * 3, slett)
sjekk("RB2-03 private skrivestier", "andres notater står",
      tilsyn("SELECT count(*) FROM notat WHERE notat_id IN (%s, %s)", (NOTAT_RAAD_A, NOTAT_B)) == [(2,)])
sjekk("RB2-03 private skrivestier", "slett_notat sletter eget notat",
      utfor(K_BH_A, "SELECT koe_api.slett_notat(%s)", (nytt_id,)) == [(True,)])

# F1: gjenbrukt forbindelse, T1 emulert, T2 og PostgREST -----------------------------

for innlogging in ("authenticator", "koe_runtime_login"):
    with psycopg.connect(DSN, user=innlogging, autocommit=True) as conn:
        with conn.transaction():
            kontekst(conn, K_BH_A)
            foer = conn.execute("SELECT count(*) FROM notat").fetchone()[0]
        rest = conn.execute("SELECT current_user, current_setting('request.jwt.claims', true)").fetchone()
        with conn.transaction():
            conn.execute("SET LOCAL ROLE koe_runtime")
            etter = conn.execute("SELECT count(*) FROM notat").fetchone()[0]
    sjekk("Gjenbrukt forbindelse", f"{innlogging}: første transaksjon ser eget notat", foer == 1, foer)
    sjekk("Gjenbrukt forbindelse", f"{innlogging}: etter commit er rolle og krav tilbake",
          rest == (innlogging, ""), rest)
    sjekk("Gjenbrukt forbindelse", f"{innlogging}: neste transaksjon uten krav ser null", etter == 0, etter)
with psycopg.connect(DSN, user="koe_runtime_login", autocommit=True) as conn:
    conn.execute("SELECT set_config('request.jwt.claims', %s, false)", (json.dumps(K_BH_A),))
    with conn.transaction():
        conn.execute("SET LOCAL ROLE koe_runtime")
        lekket = conn.execute("SELECT count(*) FROM notat").fetchone()[0]
sjekk("Gjenbrukt forbindelse", "kontroll: kontekst satt på sesjonsnivå lekker", lekket == 1, lekket)

r1 = http("POST", "/rpc/hvem", K_BH_A, "koe_api", json={})
r2 = http("POST", "/rpc/hvem", krav(), "koe_api", json={})
p1 = r1.json() if r1.ok else {}
p2 = r2.json() if r2.ok else {}
sjekk("Gjenbrukt forbindelse", "PostgREST: to vellykkede kall på samme backend-pid (RB2-06)",
      r1.status_code == r2.status_code == 200 and p1.get("pid") is not None and p1.get("pid") == p2.get("pid"),
      (r1.status_code, r2.status_code, p1.get("pid"), p2.get("pid")))
sjekk("Gjenbrukt forbindelse", "PostgREST: andre kall har ikke første kalls krav",
      r2.ok and "koe_aktor" not in (p2.get("krav") or "x"), p2)
r = http("GET", "/notat?select=notat_id", krav())
sjekk("Gjenbrukt forbindelse", "PostgREST: GET /notat uten koe-krav gir tom liste",
      r.status_code == 200 and r.json() == [], (r.status_code, r.text[:100]))
r = http("GET", "/notat?select=aktor_team_id", K_BH_A)
sjekk("Prosjekt A i kontekst", "PostgREST: BH i A ser bare BHs notat",
      r.status_code == 200 and r.json() == [{"aktor_team_id": T_BH_A}], r.text[:100])

# F1: runtime skriver ikke direkte ---------------------------------------------------

INSERT_HENDELSE = ("INSERT INTO hendelse (event_id, source, type, subject, actorid, actorrole, data, "
                   "sak_id, event_type, versjon, prosjekt_id) VALUES (gen_random_uuid(), 'x', 'x', "
                   "'sak-a1', 'x', 'BH', '{}', 'sak-a1', 'x', 99, 'prosjekt-a')")
for innlogging in ("authenticator", "koe_runtime_login"):
    for navn, s in (("UPDATE", "UPDATE hendelse SET data = '{}'"), ("DELETE", "DELETE FROM hendelse"),
                    ("TRUNCATE", "TRUNCATE hendelse"), ("INSERT", INSERT_HENDELSE),
                    ("UPDATE sak_metadata", "UPDATE sak_metadata SET prosjekt_id = 'prosjekt-b'"),
                    ("INSERT kø", "INSERT INTO utgaende_levering (prosjekt_id, event_id) VALUES ('prosjekt-a', gen_random_uuid())")):
        sjekk("Runtime skriver ikke direkte", f"{innlogging}: {navn} avvises",
              spor(K_BH_A, s, innlogging=innlogging) == "42501")

# RB2-02 og TM-01: service_role, slik en med signeringsnøkkelen kunne blitt ---------

INSERT_KO_NOTAT = "INSERT INTO utgaende_levering (prosjekt_id, event_id) VALUES ('prosjekt-a', %s)"
for navn, s, p in (
    ("UPDATE hendelse", "UPDATE hendelse SET data = '{}'", ()),
    ("DELETE hendelse", "DELETE FROM hendelse", ()),
    ("TRUNCATE hendelse", "TRUNCATE hendelse", ()),
    ("INSERT hendelse", INSERT_HENDELSE, ()),
    ("MERGE UPDATE", "MERGE INTO hendelse h USING (SELECT 'sak-a1' AS sak) s ON h.sak_id = s.sak "
                     "WHEN MATCHED THEN UPDATE SET data = '{}'", ()),
    ("ON CONFLICT UPDATE", "INSERT INTO hendelse (event_id, source, type, subject, actorid, actorrole, data, "
                           "sak_id, event_type, versjon, prosjekt_id) SELECT event_id, source, type, subject, "
                           "actorid, actorrole, data, sak_id, event_type, versjon, prosjekt_id FROM hendelse "
                           "LIMIT 1 ON CONFLICT (event_id) DO UPDATE SET data = '{}'", ()),
    ("flytte sak til annet prosjekt", "UPDATE sak_metadata SET prosjekt_id = 'prosjekt-a' WHERE sak_id = 'sak-b1'", ()),
    ("endre projeksjon i sak_metadata", "UPDATE sak_metadata SET cached_title = 'x'", ()),
    ("slette sak (kaskade)", "DELETE FROM sak_metadata WHERE sak_id = 'sak-a1'", ()),
    ("endre prosjekt i køen", "UPDATE utgaende_levering SET prosjekt_id = 'annet'", ()),
    ("legge notat-ID i køen", INSERT_KO_NOTAT, (NOTAT_B,)),
    ("slette fra køen", "DELETE FROM utgaende_levering", ()),
    ("TRUNCATE sak_metadata CASCADE", "TRUNCATE sak_metadata CASCADE", ()),
    ("montere triggerfunksjon (TM-07)", "CREATE TRIGGER t BEFORE INSERT ON hendelse FOR EACH ROW "
                                         "EXECUTE FUNCTION public.update_updated_at_column()", ()),
    ("midlertidig tabell", "CREATE TEMP TABLE t (x int)", ()),
    ("DISABLE TRIGGER", "ALTER TABLE hendelse DISABLE TRIGGER a_skrivevakt", ()),
    ("session_replication_role", "SET LOCAL session_replication_role = replica", ()),
    ("SET ROLE kommandoeier", "SET LOCAL ROLE koe_kommando", ()),
    ("GRANT kommandoeier", "GRANT koe_kommando TO service_role", ()),
):
    svar = spor(K_SR, s, p)
    sjekk("RB2-02 service_role", f"{navn} avvises", svar == "42501", svar)


def kopier(conn):
    kontekst(conn, K_SR)
    with conn.cursor().copy("COPY hendelse (event_id, source, type, subject, actorid, actorrole, data, "
                            "sak_id, event_type, versjon, prosjekt_id) FROM STDIN") as kopi:
        kopi.write_row((str(uuid.uuid4()), "koe", "x", "sak-a1", BH_A, "BH", "{}", "sak-a1", "x", 99, "prosjekt-a"))


with psycopg.connect(DSN, user="authenticator") as conn:
    try:
        kopier(conn)
        svar = "OK"
    except psycopg.Error as feil:
        svar = feil.sqlstate
    conn.rollback()
sjekk("RB2-02 service_role", "COPY til hendelse avvises", svar == "42501", svar)
svar = spor(K_SR, "UPDATE notat SET tekst = tekst RETURNING 1")
sjekk("RB2-02 service_role", "kontroll: service_role har fortsatt tabellrettigheter (notat er ikke vernet)",
      antall(svar) == 4, svar)

# RB2-02: skranker holder også for eieren ---------------------------------------------

svar = tilsyn("SELECT conname FROM pg_constraint WHERE conname IN "
              "('fk_hendelse_sak_prosjekt', 'fk_notat_sak_prosjekt', 'fk_levering_hendelse') ORDER BY 1")
sjekk("RB2-02 skranker", "sak, notat og kø er bundet til samme prosjekt",
      svar == [("fk_hendelse_sak_prosjekt",), ("fk_levering_hendelse",), ("fk_notat_sak_prosjekt",)], svar)

# RB2-01 og RB2-07: forespørselsvakten i Data API -------------------------------------

for navn, k, forventet in (
    ("service_role-token", krav(rolle="service_role"), 403),
    ("authenticated-token", krav(BH_A, "prosjekt-a", T_BH_A, "BH", rolle="authenticated"), 403),
    ("token uten exp", {n: v for n, v in K_BH_A.items() if n != "exp"}, 403),
    ("token med ett døgns levetid", krav(BH_A, "prosjekt-a", T_BH_A, "BH", levetid=86400), 403),
    ("token med 61 s levetid", krav(BH_A, "prosjekt-a", T_BH_A, "BH", levetid=61), 403),
    ("utløpt token", krav(BH_A, "prosjekt-a", T_BH_A, "BH", levetid=-120), 401),
    ("gyldig runtime-token (kontroll)", K_BH_A, 200),
):
    r = http("GET", "/notat?select=notat_id", k)
    sjekk("RB2-01 forespørselsvakt", f"{navn}: HTTP {forventet}", r.status_code == forventet,
          (r.status_code, r.text[:120]))
r = http("GET", "/notat?select=notat_id")
sjekk("RB2-01 forespørselsvakt", "uten token (anon) avvises", r.status_code in (401, 403), (r.status_code, r.text[:80]))
r = http("PATCH", "/hendelse?sak_id=eq.sak-a1", K_SR, json={"data": {}})
sjekk("RB2-01 forespørselsvakt", "service_role: PATCH /hendelse avvises av vakten",
      r.status_code == 403 and "ikke tillatt i Data API" in r.text, r.text[:120])
r = http("POST", "/rpc/koe_resolve_identity", K_BH_A,
         json={"p_provider": "entra", "p_issuer": "x", "p_subject": "x", "p_email": "", "p_name": ""})
sjekk("RB2-05 identitet", "PostgREST: runtime kan ikke kalle koe_resolve_identity",
      r.status_code in (401, 403, 404), (r.status_code, r.text[:80]))

# RB2-01: T2 har ingen vei til privilegerte roller -------------------------------------

for rolle in ("service_role", "authenticator", "koe_kommando", "postgres"):
    with psycopg.connect(DSN, user="koe_runtime_login") as conn:
        try:
            conn.execute(sql.SQL("SET ROLE {}").format(sql.Identifier(rolle)))
            svar = "OK"
        except psycopg.Error as feil:
            svar = feil.sqlstate
    sjekk("RB2-01 T2", f"koe_runtime_login kan ikke bli {rolle}", svar == "42501", svar)
svar = spor(K_BH_A, "SELECT koe_api.send_varsel('sak-a1', 'frist_krav', '{}', 1)", innlogging="koe_runtime_login")
sjekk("RB2-01 T2", "kommando virker over T2", antall(svar) == 1, svar)

# Kommandoen: atomisitet og konflikt (RB2-06) ------------------------------------------

r = http("POST", "/rpc/send_varsel", K_BH_A, "koe_api",
         json={"p_sak_id": "sak-a1", "p_type": "vederlag_krav", "p_data": {"belop": 1}, "p_forventet_versjon": 1})
ny = r.json() if r.ok else None
sjekk("Kommando", "PostgREST: send_varsel lykkes", r.status_code == 200, (r.status_code, r.text[:120]))
svar = tilsyn("SELECT actorid, actorrole, actorteam, prosjekt_id, versjon FROM hendelse WHERE event_id = %s", (ny,))
sjekk("Kommando", "aktør, side, team og prosjekt stemplet fra konteksten",
      svar == [(BH_A, "BH", T_BH_A, "prosjekt-a", 2)], svar)
sjekk("Kommando", "leveringsintensjonen finnes", tilsyn("SELECT count(*) FROM utgaende_levering WHERE event_id = %s", (ny,)) == [(1,)])
foer = tilsyn("SELECT (SELECT count(*) FROM hendelse), (SELECT count(*) FROM utgaende_levering)")
r = http("POST", "/rpc/send_varsel", K_BH_A, "koe_api",
         json={"p_sak_id": "sak-a1", "p_type": "vederlag_krav", "p_data": {}, "p_forventet_versjon": 1})
sjekk("Kommando", "utdatert versjon gir 409", r.status_code == 409 and "versjonskonflikt" in r.text, (r.status_code, r.text[:80]))
sjekk("Kommando", "konflikten skrev ingenting",
      tilsyn("SELECT (SELECT count(*) FROM hendelse), (SELECT count(*) FROM utgaende_levering)") == foer)
r = http("POST", "/rpc/send_varsel", K_BH_A, "koe_api",
         json={"p_sak_id": "sak-a1", "p_type": "eo_utstedt", "p_data": {}, "p_forventet_versjon": 2})
sjekk("Kommando", "type som krever godkjenning avvises", r.status_code >= 400 and "egen kommando" in r.text, r.text[:80])
tilsyn("CREATE FUNCTION public.b02_feil() RETURNS trigger LANGUAGE plpgsql AS "
       "$$ BEGIN RAISE EXCEPTION 'injisert feil'; END $$")
tilsyn("CREATE TRIGGER z_feil BEFORE INSERT ON utgaende_levering FOR EACH ROW EXECUTE FUNCTION public.b02_feil()")
foer = tilsyn("SELECT count(*) FROM hendelse")
svar = utfor(K_BH_A, "SELECT koe_api.send_varsel('sak-a1', 'frist_krav', '{}', 2)")
etter = tilsyn("SELECT count(*) FROM hendelse")
tilsyn("DROP TRIGGER z_feil ON utgaende_levering")
tilsyn("DROP FUNCTION public.b02_feil()")
sjekk("Kommando", "feil i køinnsettingen etterlater ingen hendelse", svar == "P0001" and foer == etter, (svar, foer, etter))

# Worker (T2, egen innlogging) --------------------------------------------------------

rad = tilsyn("SELECT min(id) FROM utgaende_levering")[0][0]
for navn, s, forventet in (
    ("oppdaterer status", f"UPDATE utgaende_levering SET status = 'levert' WHERE id = {rad}", 1),
    ("leser ikke notat", "SELECT 1 FROM notat", "42501"),
    ("skriver ikke hendelse", "DELETE FROM hendelse", "42501"),
    ("endrer ikke prosjekt i køen", "UPDATE utgaende_levering SET prosjekt_id = 'x'", "42501"),
    ("endrer ikke hendelsesreferansen", "UPDATE utgaende_levering SET event_id = gen_random_uuid()", "42501"),
    ("legger ikke til jobber", "INSERT INTO utgaende_levering (prosjekt_id, event_id) VALUES ('prosjekt-a', gen_random_uuid())", "42501"),
):
    sjekk("Worker", navn, utfor(None, s, innlogging="koe_worker") == forventet)
sjekk("Worker", "statusen ble faktisk endret", tilsyn(f"SELECT status FROM utgaende_levering WHERE id = {rad}") == [("levert",)])

# RB2-05: identitet --------------------------------------------------------------------

r = http("POST", "/rpc/catenda_identitet", krav(), "koe_api",
         json={"p_subject": subjekt("a1"), "p_email": "", "p_name": ""})
sjekk("RB2-05 identitet", "catenda_identitet finner eksisterende bruker", r.status_code == 200 and r.json() == BH_A, r.text[:80])
for navn, s in (("store bokstaver", subjekt("a1").upper()), ("bindestreker", str(uuid.UUID(subjekt("a1")))),
                ("ikke Catenda-form", "sub-a1")):
    r = http("POST", "/rpc/catenda_identitet", krav(), "koe_api", json={"p_subject": s, "p_email": "", "p_name": ""})
    sjekk("RB2-05 identitet", f"subjekt med {navn} avvises", r.status_code == 400, (r.status_code, r.text[:80]))
svar = tilsyn("SELECT pg_get_function_identity_arguments('koe_api.catenda_identitet'::regproc)")
sjekk("RB2-05 identitet", "inngangen har ingen parameter for provider eller issuer",
      svar == [("p_subject text, p_email text, p_name text",)], svar)
for tabell in ("app_identities", "app_users", "app_project_memberships"):
    sjekk("RB2-05 identitet", f"runtime leser ikke {tabell}", spor(krav(), f"SELECT 1 FROM {tabell}") == "42501")
r = http("POST", "/rpc/synkroniser_medlemmer", krav(), "koe_api", json={
    "p_project": "prosjekt-a", "p_catenda_project": "c0000000-0000-4000-8000-00000000000a",
    "p_members": [{"subject": "sub-ny", "email": "", "name": "", "role": "member"}],
    "p_started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
sjekk("RB2-05 identitet", "øyeblikksbilde med unormalisert subjekt avvises", r.status_code == 400, (r.status_code, r.text[:80]))

# Rettighetsmatrise (RB2-06, RB2-08) -----------------------------------------------------

TABELLRETT = """SELECT c.relname, string_agg(p.rett, ',' ORDER BY p.rett)
    FROM pg_class c CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
         ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(rett)
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
      AND has_table_privilege(%s, c.oid, p.rett)
    GROUP BY c.relname ORDER BY 1"""
sjekk("Rettighetsmatrise", "koe_runtime: bare SELECT på hendelse, notat og sak_metadata",
      tilsyn(TABELLRETT, ("koe_runtime",)) == [("hendelse", "SELECT"), ("notat", "SELECT"), ("sak_metadata", "SELECT")],
      tilsyn(TABELLRETT, ("koe_runtime",)))
sjekk("Rettighetsmatrise", "koe_worker: bare SELECT på hendelse og køen (UPDATE er kolonnevis)",
      tilsyn(TABELLRETT, ("koe_worker",)) == [("hendelse", "SELECT"), ("utgaende_levering", "SELECT")],
      tilsyn(TABELLRETT, ("koe_worker",)))
for rolle in ("anon", "authenticated", "koe_runtime_login", "authenticator"):
    sjekk("Rettighetsmatrise", f"{rolle}: ingen tabellrettigheter i public", tilsyn(TABELLRETT, (rolle,)) == [],
          tilsyn(TABELLRETT, (rolle,)))
svar = tilsyn(TABELLRETT, ("service_role",))
sjekk("Rettighetsmatrise", "service_role: ingen TRUNCATE, TRIGGER eller REFERENCES på integritetstabellene",
      all(not ({"TRUNCATE", "TRIGGER", "REFERENCES"} & set(r.split(",")))
          for t, r in svar if t in ("hendelse", "sak_metadata", "utgaende_levering", "notat")), svar)
FUNKSJONER = """SELECT p.pronamespace::regnamespace || '.' || p.proname
    FROM pg_proc p WHERE p.pronamespace::regnamespace::text IN ('public', 'koe_api', 'koe_vakt')
      AND has_function_privilege(%s, p.oid, 'EXECUTE') ORDER BY 1"""
sjekk("Rettighetsmatrise", "koe_runtime: EXECUTE bare på kommandoene, hvem og vakten",
      [r[0] for r in tilsyn(FUNKSJONER, ("koe_runtime",))] == [
          "koe_api.catenda_identitet", "koe_api.hvem", "koe_api.opprett_sak", "koe_api.send_varsel",
          "koe_api.skriv_notat", "koe_api.slett_notat", "koe_api.synkroniser_medlemmer", "koe_vakt.foresporsel"],
      tilsyn(FUNKSJONER, ("koe_runtime",)))
for rolle in ("anon", "authenticated"):
    sjekk("Rettighetsmatrise", f"{rolle}: EXECUTE bare på vakten",
          [r[0] for r in tilsyn(FUNKSJONER, (rolle,))] == ["koe_vakt.foresporsel"], tilsyn(FUNKSJONER, (rolle,)))
svar = tilsyn("SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' "
              "AND relname IN ('hendelse', 'notat', 'sak_metadata', 'utgaende_levering') AND NOT relforcerowsecurity")
sjekk("Rettighetsmatrise", "FORCE ROW LEVEL SECURITY er satt (katalog, ikke atferd)", svar == [], svar)
svar = tilsyn("SELECT r.rolname, pg_has_role('postgres', r.oid, 'SET') FROM pg_roles r "
              "WHERE r.rolname IN ('koe_kommando', 'koe_identitet') ORDER BY 1")
sjekk("RB2-08 eierskifte", "postgres har ikke lenger SET på funksjonseierne",
      svar == [("koe_identitet", False), ("koe_kommando", False)], svar)
svar = tilsyn("SELECT r.rolname, n.nspname FROM pg_roles r CROSS JOIN pg_namespace n "
              "WHERE r.rolname IN ('koe_kommando', 'koe_identitet', 'koe_runtime', 'service_role') "
              "AND n.nspname IN ('public', 'koe_api', 'koe_privat', 'koe_vakt') "
              "AND has_schema_privilege(r.oid, n.oid, 'CREATE') ORDER BY 1, 2")
sjekk("RB2-08 eierskifte", "ingen funksjonseier eller runtime har CREATE i noe skjema", svar == [], svar)
svar = tilsyn("SELECT p.proname, pg_get_userbyid(p.proowner) FROM pg_proc p "
              "WHERE p.pronamespace = 'koe_api'::regnamespace AND p.prosecdef ORDER BY 1")
sjekk("RB2-08 eierskifte", "kommandoene eies av funksjonseierne", svar == [
    ("catenda_identitet", "koe_identitet"), ("opprett_sak", "koe_kommando"), ("send_varsel", "koe_kommando"),
    ("skriv_notat", "koe_kommando"), ("slett_notat", "koe_kommando"), ("synkroniser_medlemmer", "koe_identitet")], svar)
svar = tilsyn("SELECT rolname FROM pg_roles WHERE rolcanlogin ORDER BY 1")
sjekk("Rettighetsmatrise", "innloggingsroller er bare de forventede", svar == [
    ("authenticator",), ("koe_runtime_login",), ("koe_worker",), ("postgres",), ("supabase_admin",)], svar)

# RB2-07: tilbakekalling midt i en transaksjon -------------------------------------------

k_raad = krav(RAAD_A, "prosjekt-a", T_RAAD_A, "BH")
with psycopg.connect(DSN, user="koe_runtime_login") as lang:
    kontekst(lang, k_raad)
    foer = lang.execute("SELECT count(*) FROM notat").fetchone()[0]
    medlemmer = [{"subject": subjekt(s), "email": "", "name": "", "role": "member"} for s in ("a1", "a3", "a4", "ab")]
    r = http("POST", "/rpc/synkroniser_medlemmer", krav(), "koe_api", json={
        "p_project": "prosjekt-a", "p_catenda_project": "c0000000-0000-4000-8000-00000000000a",
        "p_members": medlemmer, "p_started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
    etter = lang.execute("SELECT count(*) FROM notat").fetchone()[0]
    lang.rollback()
sjekk("RB2-07 tilbakekalling", "synkronisering uten rådgiveren lykkes", r.status_code == 200 and r.json() is True, r.text[:80])
sjekk("RB2-07 tilbakekalling", "neste setning i en åpen transaksjon ser null (READ COMMITTED)",
      (foer, etter) == (1, 0), (foer, etter))
sjekk("RB2-07 tilbakekalling", "og ingen hendelser i neste forespørsel", spor(k_raad, "SELECT 1 FROM hendelse") == [])
svar = tilsyn("SELECT unnest(setconfig) FROM pg_db_role_setting WHERE setrole = 'koe_runtime_login'::regrole ORDER BY 1")
sjekk("RB2-07 tilbakekalling", "T2-innloggingen har tidsgrenser for setninger og ledige transaksjoner",
      svar == [("idle_in_transaction_session_timeout=10s",), ("statement_timeout=8s",)], svar)

# Rapport -------------------------------------------------------------------------------

feil = [r for r in resultater if not r[2]]
for kriterium, navn, ok, detalj in resultater:
    linje = f"{'OK  ' if ok else 'FEIL'} | {kriterium} | {navn}"
    if not ok:
        linje += f" | {detalj!r}"
    print(linje)
print(f"\n{len(resultater) - len(feil)} av {len(resultater)} sjekker holdt.")
sys.exit(1 if feil else 0)
