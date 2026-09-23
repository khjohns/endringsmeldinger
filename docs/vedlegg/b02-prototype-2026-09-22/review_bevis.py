"""RB2: observerte egenskaper og svakheter, bare i kjor.sh sin kastbare base.

Dette er reproduksjoner, ikke en grønn sikkerhetsport. Forventningene beskriver
prototypen før retting. Hvert SQL-forsøk rulles tilbake, også når det lykkes.
"""

import json
import os
import time
import uuid

import jwt
import psycopg
import requests
from psycopg import sql

DSN = os.environ["B02_DSN"]
PGRST = os.environ["B02_POSTGREST"]
HEMMELIG = os.environ["B02_JWT_SECRET"]
AKTOR = "00000000-0000-4000-8000-0000000000a1"
NOTAT_B = "e0000000-0000-4000-8000-0000000000b1"
KRAV = {"role": "koe_runtime", "exp": int(time.time()) + 60,
        "koe_aktor": AKTOR, "koe_prosjekt": "prosjekt-a",
        "koe_team": "team-bh-a", "koe_side": "BH"}
UTFALL = []


def observer(navn, verdi, forventet):
    ok = verdi == forventet
    UTFALL.append(ok)
    print(json.dumps({"forsøk": navn, "observert": verdi,
                      "forventet_reproduksjon": forventet, "samsvar": ok},
                     ensure_ascii=False, default=str), flush=True)


def kontekst(conn, krav):
    conn.execute(sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(krav["role"])))
    conn.execute("SELECT set_config('request.jwt.claims', %s, true)",
                 (json.dumps(krav),))


def forsok(kall, krav=KRAV, bruker="authenticator"):
    with psycopg.connect(DSN, user=bruker) as conn:
        try:
            if krav is not None:
                kontekst(conn, krav)
            return kall(conn)
        except psycopg.Error as feil:
            return {"sqlstate": feil.sqlstate, "melding": feil.diag.message_primary,
                    "detalj": feil.diag.message_detail}
        finally:
            conn.rollback()


def spor(tekst, param=(), krav=KRAV, bruker="authenticator"):
    def kall(conn):
        resultat = conn.execute(tekst, param)
        return resultat.fetchall() if resultat.description else resultat.rowcount
    return forsok(kall, krav, bruker)


def kode(svar):
    return svar.get("sqlstate") if isinstance(svar, dict) else "OK"


def noter(notat_id, sak="sak-a1", krav=KRAV):
    return spor("""INSERT INTO public.notat
        (notat_id,sak_id,prosjekt_id,aktor_id,aktor_rolle,aktor_team_id,tekst)
        VALUES (%s,%s,'prosjekt-a',%s,'BH',%s,'lokalt review') RETURNING sak_id""",
        (notat_id, sak, AKTOR, krav["koe_team"]), krav)


def http(metode, sti, krav=KRAV, **argumenter):
    return requests.request(metode, PGRST + sti, timeout=10,
        headers={"Authorization": "Bearer " + jwt.encode(krav, HEMMELIG, algorithm="HS256")},
        **argumenter)


observer("kontroll: et lovlig notat kan skrives", kode(noter(str(uuid.uuid4()))), "OK")
svar = noter(NOTAT_B)
observer("unik-skranken røper notat-ID fra B", kode(svar), "23505")
print(json.dumps({"unikfeil": svar}, ensure_ascii=False))
observer("referanse til eksisterende sak i B aksepteres",
         noter(str(uuid.uuid4()), "sak-b1"), [("sak-b1",)])
observer("referanse til ukjent sak avvises",
         kode(noter(str(uuid.uuid4()), "sak-finnes-ikke")), "23503")

for navn, endring, antall in (
    ("ugyldig side", {"koe_side": "UKJENT"}, 1),
    ("side som JSON-objekt", {"koe_side": {}}, 1),
    ("tom side", {"koe_side": ""}, 1),
    ("store bokstaver i aktørens UUID", {"koe_aktor": AKTOR.upper()}, 0),
    ("aktør som JSON-liste", {"koe_aktor": [AKTOR]}, 0),
    ("prosjekt som JSON-objekt", {"koe_prosjekt": {}}, 0),
    ("tomt prosjekt", {"koe_prosjekt": ""}, 0),
    ("team som JSON-liste", {"koe_team": ["team-bh-a"]}, 0),
    ("tomt team", {"koe_team": ""}, 0),
    ("ekstra krav", {"admin": True}, 1),
):
    krav = KRAV | endring
    observer("kontekst: " + navn, spor("SELECT count(*) FROM notat", krav=krav), [(antall,)])
    if "koe_side" in endring:
        observer("kommando avviser " + navn,
                 kode(spor("SELECT koe_api.send_varsel('sak-a1','grunnlag_varsel','{}',1)", krav=krav)),
                 "42501")

uten_side = {k: v for k, v in KRAV.items() if k != "koe_side"}
observer("manglende side gir likevel privat innsyn",
         spor("SELECT count(*) FROM notat", krav=uten_side), [(1,)])
observer("ukjent team kan opprette notat",
         kode(noter(str(uuid.uuid4()), krav=KRAV | {"koe_team": "ukjent-team"})), "OK")
observer("NULL forventet versjon passerer kommandoen",
         kode(spor("SELECT koe_api.send_varsel('sak-a1','grunnlag_varsel','{}',NULL)")), "OK")
observer("NULL hendelsestype stoppes av NOT NULL, ikke typelisten",
         kode(spor("SELECT koe_api.send_varsel('sak-a1',NULL,'{}',1)")), "23502")

feil_b = spor("SELECT koe_api.send_varsel('sak-b1','grunnlag_varsel','{}',1)")
feil_ukjent = spor("SELECT koe_api.send_varsel('sak-finnes-ikke','grunnlag_varsel','{}',1)")
observer("kommando gir identisk feil for B og ukjent sak", feil_b, feil_ukjent)
observer("telling røper ingen B-rader",
         spor("SELECT count(*) FROM hendelse WHERE prosjekt_id='prosjekt-b'"), [(0,)])

for navn, krav, forventet in (
    ("utløpt token", KRAV | {"exp": int(time.time()) - 120}, 401),
    ("token uten exp", {k: v for k, v in KRAV.items() if k != "exp"}, 200),
    ("token med ett døgns levetid", KRAV | {"exp": int(time.time()) + 86400}, 200),
):
    svar = http("GET", "/notat?select=notat_id", krav)
    observer(navn, svar.status_code, forventet)

K_SR = {"role": "service_role"}
for navn, tekst in (
    ("SET ROLE kommandoeier", "SET LOCAL ROLE koe_kommando"),
    ("GRANT kommandoeier", "GRANT koe_kommando TO service_role"),
    ("logisk publisering", "CREATE PUBLICATION review_pub FOR TABLE hendelse"),
    ("MERGE UPDATE", "MERGE INTO hendelse h USING (SELECT 'sak-a1' AS sak) s ON h.sak_id=s.sak WHEN MATCHED THEN UPDATE SET data='{}'"),
    ("MERGE DELETE", "MERGE INTO hendelse h USING (SELECT 'sak-a1' AS sak) s ON h.sak_id=s.sak WHEN MATCHED THEN DELETE"),
    ("ON CONFLICT UPDATE", "INSERT INTO hendelse (event_id,source,type,subject,actorid,actorrole,data,sak_id,event_type,versjon,prosjekt_id) SELECT event_id,source,type,subject,actorid,actorrole,data,sak_id,event_type,versjon,prosjekt_id FROM hendelse LIMIT 1 ON CONFLICT (event_id) DO UPDATE SET data='{}'"),
):
    observer("service_role: " + navn, kode(spor(tekst, krav=K_SR)), "42501")


def kopier(conn):
    with conn.cursor().copy("""COPY hendelse
        (event_id,source,type,subject,actorid,actorrole,data,sak_id,event_type,versjon,prosjekt_id)
        FROM STDIN""") as kopi:
        kopi.write_row((str(uuid.uuid4()), "koe", "grunnlag_varsel", "sak-a1", AKTOR,
                        "BH", "{}", "sak-a1", "grunnlag_varsel", 99, "prosjekt-a"))
    return "OK"


observer("service_role: COPY utløser skrivevakten", kode(forsok(kopier, K_SR)), "42501")
observer("service_role: eksisterende triggerfunksjon kan monteres",
         kode(spor("CREATE TRIGGER review_trigger BEFORE INSERT ON hendelse FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()", krav=K_SR)), "OK")


def flytt_sak(conn):
    kontekst(conn, K_SR)
    conn.execute("UPDATE sak_metadata SET prosjekt_id='prosjekt-a' WHERE sak_id='sak-b1'")
    kontekst(conn, KRAV)
    conn.execute("SELECT koe_api.send_varsel('sak-b1','grunnlag_varsel','{}',1)")
    kontekst(conn, K_SR)
    return conn.execute("SELECT prosjekt_id,versjon FROM hendelse WHERE sak_id='sak-b1' ORDER BY versjon").fetchall()


observer("endret metadata gir samme saksstrøm to prosjekter", forsok(flytt_sak),
         [("prosjekt-b", 1), ("prosjekt-a", 2)])
observer("service_role kan omskrive prosjekt i outbox",
         spor("UPDATE utgaende_levering SET prosjekt_id='annet' RETURNING prosjekt_id", krav=K_SR),
         [("annet",), ("annet",)])
observer("service_role kan legge notatreferanse i outbox",
         kode(spor("INSERT INTO utgaende_levering(prosjekt_id,event_id) VALUES ('prosjekt-a',%s)", (NOTAT_B,), K_SR)), "OK")
observer("worker kan ikke endre hendelsesreferansen",
         kode(spor("UPDATE utgaende_levering SET event_id=gen_random_uuid()", krav=None, bruker="koe_worker")), "42501")


def identitet(conn):
    a = conn.execute("SELECT koe_resolve_identity('catenda','https://api.catenda.com','sub-a1','','')").fetchone()[0]
    b = conn.execute("SELECT koe_resolve_identity('catenda','https://api.catenda.com/','sub-a1','','')").fetchone()[0]
    return str(a) == AKTOR and a != b


observer("endret issuer oppretter en annen bruker", forsok(identitet), True)
observer("runtime kan bruke entra som provider",
         kode(spor("SELECT koe_resolve_identity('entra','review','sub-a1','','')")), "OK")


def synk(conn):
    conn.execute("""SELECT koe_reconcile_memberships('prosjekt-a',
        'c0000000-0000-4000-8000-00000000000a',
        '[{"subject":"review-ny","email":"","name":"","role":"admin"}]', now())""")
    aktor = str(conn.execute("SELECT koe_resolve_identity('catenda','https://api.catenda.com','review-ny','','')").fetchone()[0])
    kontekst(conn, KRAV | {"koe_aktor": aktor})
    return conn.execute("SELECT koe_privat.har_handlingsrett()").fetchone()[0]


observer("runtime kan gi en ny identitet handlingsrett via synk", forsok(synk), True)


def rolleopprettelse(conn):
    conn.execute("CREATE ROLE review_migrator LOGIN CREATEROLE NOINHERIT")
    conn.execute("SET LOCAL ROLE review_migrator")
    conn.execute("CREATE ROLE review_eier NOLOGIN")
    medlemskap = conn.execute("""SELECT admin_option,inherit_option,set_option
        FROM pg_auth_members WHERE roleid='review_eier'::regrole
        AND member='review_migrator'::regrole""").fetchone()
    conn.execute("GRANT review_eier TO review_migrator WITH SET TRUE")
    conn.execute("SET LOCAL ROLE review_eier")
    return [medlemskap, conn.execute("SELECT current_user").fetchone()[0]]


observer("CREATEROLE gir ADMIN som kan gjøres til SET",
         forsok(rolleopprettelse, krav=None, bruker="postgres"),
         [(True, False, False), "review_eier"])


def fk_handling(conn, handling):
    conn.execute("ALTER TABLE hendelse DROP CONSTRAINT fk_hendelse_sak")
    conn.execute(sql.SQL("ALTER TABLE hendelse ADD CONSTRAINT fk_hendelse_sak FOREIGN KEY(sak_id) REFERENCES sak_metadata(sak_id) ON DELETE {}").format(sql.SQL(handling)))
    kontekst(conn, K_SR)
    conn.execute("DELETE FROM sak_metadata WHERE sak_id='sak-a1'")


for handling in ("SET NULL", "SET DEFAULT", "RESTRICT", "NO ACTION"):
    forventet = "42501" if handling.startswith("SET") else "23503"
    observer("FK ON DELETE " + handling,
             kode(forsok(lambda conn: fk_handling(conn, handling), krav=None, bruker="postgres")), forventet)

print(f"{sum(UTFALL)} av {len(UTFALL)} observasjoner samsvarer med reproduksjonen.")
raise SystemExit(0 if all(UTFALL) else 1)
