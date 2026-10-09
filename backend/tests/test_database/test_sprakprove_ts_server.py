"""TS-serveren og Python mot samme journal (#274, språkprøven port 2, P2-2).

To retninger, med bevis-sakene i flyten (`x-rader` i kontrakten):

- **TS skriver, Python leser.** Kommandoene går til TS-serveren i
  `sprakprove/server/`. Python bygger dem av sin egen lesing av radene TS skrev
  (`parse_event`, lagret), og forventningene kontrolleres på Pythons tilstand.
  Etter hver godtatt kommando er hvert felt TS-serveren sender, likt Pythons.
  Avviser TS noe Pythons regler godtar, er det rødt.
- **Python skriver, TS leser.** `/api/events` i Flask skriver, og TS-serveren
  leser journalen og regner tilstanden etter hvert steg.

I begge retninger er journalen lik slik de to leser den, også tidspunktet:
TS skriver `toISOString()` (`Z`, millisekunder), Python `+00:00` med
mikrosekunder, og basen lagrer tidspunktet. Begge leser det i Pythons form.
Saken opprettes av Python i begge retninger; TS-serveren oppretter ikke saker.

Python-ruta har innloggingen byttet ut, som i `test_domenetabell_lagring.py`.
TS-serveren leser sesjon, medlemskap og kontraktsteam fra basen; Catendas
team-API får den i `SPRAKPROVE_TEAMMEDLEMMER`. Krever Node 22 og `npm ci`.
"""

import hashlib
import json
import os
import shutil
import subprocess
import uuid
from pathlib import Path

import psycopg
import pytest
import requests

from tests.test_database.test_domenetabell_lagring import PROSJEKT, Rutebane
from tests.test_domenetabell import kontrakt, korpus

pytestmark = pytest.mark.database

ROT = Path(__file__).resolve().parents[3]
START = ROT / "sprakprove/server/start.ts"
TE_TEAM, BH_TEAM = str(uuid.uuid4()), str(uuid.uuid4())
FLYTEN = [
    p for p in korpus.forlop_parametre() if set(p.values[0]["rader"]) <= set(kontrakt.SKJEMA["x-rader"])
]


def _avvik(ts: dict, python: dict) -> list[str]:
    """Hvert felt TS-serveren sender, mot samme felt i Pythons `public_state`.

    TS sender kontraktens `tilstand` og adapterfeltene korpuset leser; resten av
    Pythons tilstand er utenfor kontrakten (#292). At TS har alle kontraktens
    felt, prøves med skjemaet."""
    avvik = [f"kontrakten: {f}" for f in kontrakt.valider(ts, "tilstand")]

    def sammenlikn(t, p, sti):
        if isinstance(t, dict):
            if not isinstance(p, dict):
                avvik.append(f"{sti}: TS {t!r}, Python {p!r}")
                return
            for navn, verdi in t.items():
                sammenlikn(verdi, p.get(navn, "mangler"), f"{sti}.{navn}")
        elif t != p:
            avvik.append(f"{sti}: TS {t!r}, Python {p!r}")

    sammenlikn(ts, python, "")
    return avvik


@pytest.fixture(scope="module")
def ts_server(testbase_url):
    node = shutil.which("node")
    if node is None or not (ROT / "node_modules/pg").exists():
        pytest.fail("Node 22 og `npm ci` i repoets rot trengs for TS-serveren i språkprøven.")
    prosess = subprocess.Popen(
        [node, str(START), "0"],
        cwd=ROT,
        env={
            **os.environ,
            "KOE_TESTBASE_URL": testbase_url,
            "APP_ENV": "test",
            "BH_APPROVAL_POLICIES": "",
            "SPRAKPROVE_TEAMMEDLEMMER": json.dumps({TE_TEAM: [TE_TEAM], BH_TEAM: [BH_TEAM]}),
        },
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    linje = prosess.stdout.readline()
    if not linje.startswith("lytter på "):
        prosess.kill()
        pytest.fail(f"TS-serveren startet ikke: {linje}{prosess.stderr.read()}")
    try:
        yield linje.removeprefix("lytter på ").strip()
    finally:
        prosess.terminate()
        prosess.wait(timeout=10)


@pytest.fixture
def ts(ts_server, testbase_url, container_mot_testbasen):
    """TS-serveren med prosjektet, partene og sesjonene i basen. `skrivbar_base` rydder."""
    katalogprosjekt = str(uuid.uuid4())
    parter = {}
    with psycopg.connect(testbase_url, autocommit=True) as c:
        c.execute("INSERT INTO projects (id, name, organisasjon_id) VALUES (%s, 'Språkprøven', 'org')", (PROSJEKT,))
        c.execute(
            "INSERT INTO catenda_project_configs (internal_project_id, catenda_project_id, library_id) VALUES (%s, %s, %s)",
            (PROSJEKT, katalogprosjekt, str(uuid.uuid4())),
        )
        c.execute(
            "INSERT INTO app_membership_sync (project_id, catenda_project_id, synced_at) VALUES (%s, %s, now())",
            (PROSJEKT, katalogprosjekt),
        )
        c.execute(
            "INSERT INTO catenda_contract_teams (internal_project_id, team_id, contract_role)"
            " VALUES (%s, %s, 'TE'), (%s, %s, 'BH')",
            (PROSJEKT, TE_TEAM, PROSJEKT, BH_TEAM),
        )
        # Subjektet er teamets ID, så `SPRAKPROVE_TEAMMEDLEMMER` kan lages før partene finnes.
        for rolle, team in (("TE", TE_TEAM), ("BH", BH_TEAM)):
            bruker, token, csrf = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
            c.execute("INSERT INTO app_users (id, email, name) VALUES (%s, %s, %s)", (bruker, f"{rolle}@example.com", rolle))
            c.execute(
                "INSERT INTO app_project_memberships (project_id, user_id, catenda_subject, role) VALUES (%s, %s, %s, 'member')",
                (PROSJEKT, bruker, team),
            )
            c.execute(
                "INSERT INTO app_sessions (token_hash, user_id, csrf_token, expires_at)"
                " VALUES (%s, %s, %s, now() + interval '1 hour')",
                (hashlib.sha256(token.encode()).hexdigest(), bruker, csrf),
            )
            parter[rolle] = {"id": bruker, "token": token, "csrf": csrf}

    def kall(rolle, metode, sti, kropp=None):
        part = parter[rolle]
        svar = requests.request(
            metode,
            f"{ts_server}{sti}",
            json=kropp,
            headers={"X-Project-ID": PROSJEKT, "X-CSRF-Token": part["csrf"]},
            cookies={"__Host-koe_session": part["token"]},
            timeout=10,
        )
        return svar.status_code, svar.json()

    return kall


def _sammenlikn_journal(python: list[dict], ts: list[dict]):
    felt = ("event_id", "sak_id", "event_type", "tidsstempel", "aktor_id", "aktor_rolle", "aktor_team_id",
            "refererer_til_event_id", "data")
    assert [{f: h[f] for f in felt} for h in ts] == [{f: h[f] for f in felt} for h in python]


class TsSkriver(Rutebane):
    """Kommandoene går til TS-serveren; resten av banen leser som Python."""

    def __init__(self, ts, *args, **kwargs):
        self.ts = ts
        super().__init__(*args, **kwargs)

    def send(self, h):
        rolle, foresporsel = korpus.foresporsel(h, self.sak(), self.sak_id)
        status, svar = self.ts(
            rolle, "POST", "/api/events",
            {"sak_id": self.sak_id, "expected_version": len(self.journal()), "event": foresporsel},
        )
        if status != 201:
            if status != 400 or svar.get("error") not in {"BUSINESS_RULE_VIOLATION", "VALIDATION_ERROR"}:
                pytest.fail(f"{h['handling']}: {status} {svar}")
            if self.prov(h)[0]:
                pytest.fail(f"{h['handling']}: TS avviste det Pythons forretningsregler godtar: {svar}")
            return False, f"{svar.get('error')}: {svar.get('message')}"
        if avvik := _avvik(svar["state"], self.tilstand()):
            pytest.fail(f"{h['handling']}: TS-serverens tilstand er ikke Pythons lesing av radene TS skrev: {avvik}")
        _sammenlikn_journal(self.raa_hendelser(), self.ts("TE", "GET", f"/api/cases/{self.sak_id}/journal")[1]["events"])
        return True, None


class TsLeser(Rutebane):
    """Flask skriver; TS-serveren leser journalen etter hvert steg."""

    def __init__(self, ts, *args, **kwargs):
        self.ts = ts
        super().__init__(*args, **kwargs)

    def send(self, h):
        utfall = super().send(h)
        status, lest = self.ts("TE", "GET", f"/api/cases/{self.sak_id}/state")
        if status != 200:
            pytest.fail(f"TS-serveren leste ikke saken: {status} {lest}")
        if avvik := _avvik(lest["state"], self.tilstand()):
            pytest.fail(f"{h['handling']}: TS-serverens lesing av radene Python skrev, gir en annen tilstand: {avvik}")
        _sammenlikn_journal(self.raa_hendelser(), self.ts("TE", "GET", f"/api/cases/{self.sak_id}/journal")[1]["events"])
        return utfall


@pytest.fixture(params=[TsSkriver, TsLeser], ids=["ts-skriver", "ts-leser"])
def ny_bane(request, ts, hendelsesklient, innlogging, container_mot_testbasen):
    lager = container_mot_testbasen.event_repository
    return lambda sakstype: request.param(ts, hendelsesklient, innlogging, lager, sakstype=sakstype)


def test_flyten_er_med():
    assert len(FLYTEN) == 30


@pytest.mark.parametrize("forlop", FLYTEN)
def test_python_og_ts_leser_hverandres_rader(forlop, ny_bane):
    korpus.kjor(forlop, ny_bane)
