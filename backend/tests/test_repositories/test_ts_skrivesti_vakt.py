"""Med TS-skrivestien på skriver ikke Python i journalen (B-17, FK-6, #668).

TS-kjernen eier KOE-, EO- og forseringssakene (B-17). Når `TS_SKRIVESTI` er på,
avviser vakten i lagrene hver hendelse, og hver skrivende inngang i
tjenestelaget skal gi feilutfall uten at noe er lagret. Testene bruker ekte
lagre, slik at det er vakten og ikke en dobbel som avviser. Hver avvisning har
en kontrollsak med bryteren av, så avvisningen beviselig skyldes bryteren.
"""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from core.config import settings
from core.container import Container
from lib.db.feil import PermanentError
from models.events import (
    EOOpprettetData,
    EOOpprettetEvent,
    ForseringVarselData,
    ForseringVarselEvent,
    SakOpprettetEvent,
    parse_event_from_request,
)
from models.sak_metadata import SakMetadata
from models.sak_state import SaksType
from regler import REGELVERSJON
from repositories import supabase_event_repository
from repositories.event_repository import (
    TS_SAKSTYPER,
    JsonFileEventRepository,
    PythonSkrivingStengt,
)
from repositories.sak_metadata_repository import SakMetadataRepository
from repositories.supabase_event_repository import SupabaseEventRepository
from services.approval_service import ApprovalService
from services.business_rules import BusinessRuleValidator
from services.catenda_project_resolver import ResolvedProjectContext
from services.catenda_webhook_service import WebhookService
from services.endringsordre_service import EndringsordreService
from services.eo_approval_service import EOApprovalService
from services.forsering_service import ForseringService
from services.sak_creation_service import SakCreationService
from services.timeline_service import TimelineService

from ..fixtures.supabase_dobbel import FakeSupabaseClient
from ..test_approval.test_approval_service import approve, command, package
from ..test_approval.test_eo_approval import POLICY, order, run
from ..test_services.test_endringsordre_service import agreed_koe

PROSJEKT = "p-ts-skrivesti"
BH = "bh-saksbehandler"
TE = "te-saksbehandler"


@pytest.fixture(autouse=True)
def ts_skrivesti_av(monkeypatch):
    """Kontrollsakene kjører med bryteren uttrykkelig av, uansett miljøet."""
    monkeypatch.setattr(settings, "ts_skrivesti", False)


@pytest.fixture
def slaa_paa_ts_skrivesti(monkeypatch):
    """Slår på bryteren når testen kaller den, etter at saken er sådd."""

    def slaa_paa():
        monkeypatch.setattr(settings, "ts_skrivesti", True)

    return slaa_paa


def _sak_opprettet(sak_id, sakstype="standard", rolle="TE"):
    return SakOpprettetEvent(
        sak_id=sak_id,
        aktor_id=TE if rolle == "TE" else BH,
        aktor_rolle=rolle,
        sakstittel=f"Sak {sak_id}",
        sakstype=sakstype,
    )


# --- Lagrene -----------------------------------------------------------------


def _json_lager(tmp_path, monkeypatch):
    return JsonFileEventRepository(str(tmp_path / "events")), None


def _supabase_lager(tmp_path, monkeypatch):
    klient = FakeSupabaseClient()
    monkeypatch.setattr(
        "repositories.supabase_event_repository.create_client",
        lambda url, key: klient,
    )
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: PROSJEKT)
    return (
        SupabaseEventRepository(url="https://ts.example.invalid", key="test-key"),
        klient,
    )


LAGRE = pytest.mark.parametrize(
    "lag_lager", [_json_lager, _supabase_lager], ids=["json", "supabase"]
)


@pytest.fixture
def vaktkall(monkeypatch):
    """Teller kallene på vakten i Supabase-lageret, så et nytt forsøk synes."""
    kall = []
    ekte = supabase_event_repository.krev_journalhendelser

    def tell(events):
        kall.append(len(events))
        return ekte(events)

    monkeypatch.setattr(supabase_event_repository, "krev_journalhendelser", tell)
    return kall


@LAGRE
def test_lageret_avviser_hendelsen_med_ts_skrivesti_og_skriver_ingenting(
    lag_lager, tmp_path, monkeypatch, slaa_paa_ts_skrivesti, vaktkall
):
    lager, klient = lag_lager(tmp_path, monkeypatch)
    slaa_paa_ts_skrivesti()

    with pytest.raises(PythonSkrivingStengt) as feil:
        lager.append(_sak_opprettet("KOE-TS-1"), expected_version=0)

    assert isinstance(feil.value, PermanentError)
    if klient is not None:
        # Én avvisning, ingen nytt forsøk, og ingen spørring nådde basen.
        assert vaktkall == [1]
        assert klient.brukte_tabeller == []
    assert lager.get_events("KOE-TS-1") == ([], 0)


@LAGRE
def test_lageret_skriver_som_foer_med_ts_skrivesti_av(
    lag_lager, tmp_path, monkeypatch, vaktkall
):
    lager, klient = lag_lager(tmp_path, monkeypatch)

    assert lager.append(_sak_opprettet("KOE-TS-1"), expected_version=0) == 1

    lagrede, versjon = lager.get_events("KOE-TS-1")
    assert versjon == 1
    assert lagrede[0]["event_type"] == "sak_opprettet"
    if klient is not None:
        assert vaktkall == [1]
        assert len(klient.tables["hendelse"]) == 1


def test_ny_sakstype_maa_tas_stilling_til_i_ts_skrivestien():
    """Vakten slår ikke opp sakstypen; den forutsetter at TS eier alle (B-17)."""
    assert {s.value for s in SaksType} <= TS_SAKSTYPER


# --- Tjenestelaget -----------------------------------------------------------


class _Tidslinje(TimelineService):
    """Ekte tidslinje, med oppgitt tilstand for KOE-er som skal være omforente."""

    def __init__(self, tilstander):
        super().__init__()
        self._tilstander = tilstander

    def compute_state(self, events):
        if events and events[0].sak_id in self._tilstander:
            return self._tilstander[events[0].sak_id]
        return super().compute_state(events)


@pytest.fixture
def miljo(tmp_path, monkeypatch):
    """Ekte JSON-hendelseslager og CSV-metadata, også bak containerens UoW."""
    hendelser = JsonFileEventRepository(str(tmp_path / "events"))
    metadata = SakMetadataRepository(str(tmp_path / "saker.csv"))
    container = Container(
        config=settings, _event_repo=hendelser, _metadata_repo=metadata
    )
    monkeypatch.setattr("core.container._default_container", container)
    monkeypatch.setattr("services.sak_creation_service._sak_creation_service", None)
    monkeypatch.setattr(
        "services.endringsordre_service.get_project_id", lambda: PROSJEKT
    )
    tilstander = {}

    def saa(sak_id, events, tilstand=None):
        metadata.create(
            SakMetadata(
                sak_id=sak_id,
                prosjekt_id=PROSJEKT,
                created_at=datetime.now(UTC),
                created_by="saaing",
                cached_title=f"Sak {sak_id}",
            )
        )
        hendelser.append_batch(events, expected_version=0)
        if tilstand is not None:
            tilstander[sak_id] = tilstand

    def eo_tjeneste():
        return EndringsordreService(
            event_repository=hendelser,
            timeline_service=_Tidslinje(tilstander),
            metadata_repository=metadata,
            relation_repository=None,
        )

    return SimpleNamespace(
        hendelser=hendelser,
        metadata=metadata,
        events_dir=tmp_path / "events",
        saa=saa,
        eo_tjeneste=eo_tjeneste,
        versjon=lambda sak_id: hendelser.get_events(sak_id)[1],
    )


# ApprovalService.publish ------------------------------------------------------


@pytest.fixture
def godkjent_svar(tmp_path):
    """BHs svar på grunnlaget, godkjent i kjeden og klart til publisering."""
    repo = JsonFileEventRepository(str(tmp_path / "events"))
    grunnlag = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "grunnlag_opprettet",
            "aktor_id": TE,
            "aktor_rolle": "TE",
            "data": {
                "tittel": "Endret grunnforhold",
                "hovedkategori": "SVIKT",
                "underkategori": "GRUNNFORHOLD",
                "beskrivelse": "Endret grunn",
                "dato_oppdaget": "2026-09-01",
            },
        }
    )
    repo.append(grunnlag, 0)
    tjeneste = ApprovalService(
        tmp_path / "private.sqlite", repo, TimelineService(), BusinessRuleValidator()
    )
    vurdering = {
        "id": "client-id",
        "track": "grunnlag",
        "eventType": "respons_grunnlag",
        "claimId": grunnlag.event_id,
        "claimVersion": 1,
        "data": {
            "grunnlag_event_id": grunnlag.event_id,
            "regelversjon": REGELVERSJON,
            "resultat": "godkjent",
            "begrunnelse": "Vi godtar ansvarsgrunnlaget.",
        },
    }
    pakke = package(tjeneste, vurdering)
    assert approve(tjeneste, pakke["id"])["packages"][0]["status"] == "godkjent"
    return tjeneste, repo, pakke["id"]


def test_publisering_med_ts_skrivesti_gir_publisering_feilet_og_ingen_hendelse(
    godkjent_svar, slaa_paa_ts_skrivesti
):
    tjeneste, repo, pakke_id = godkjent_svar
    slaa_paa_ts_skrivesti()

    pakke = command(tjeneste, "publish", packageId=pakke_id)["packages"][0]

    assert pakke["status"] == "publisering_feilet"
    assert "B-17" in pakke["error"]
    assert repo.get_events("case1")[1] == 1


def test_publisering_med_ts_skrivesti_av_sender_svaret(godkjent_svar):
    tjeneste, repo, pakke_id = godkjent_svar

    pakke = command(tjeneste, "publish", packageId=pakke_id)["packages"][0]

    assert pakke["status"] == "sendt"
    assert repo.get_events("case1")[1] == 2


# SakCreationService.create_sak ------------------------------------------------


def _opprett_sak(sak_id):
    return SakCreationService().create_sak(
        sak_id=sak_id,
        sakstype="standard",
        events=[_sak_opprettet(sak_id)],
        prosjekt_id=PROSJEKT,
    )


def test_opprettelse_med_ts_skrivesti_feiler_og_metadata_kompenseres(
    miljo, slaa_paa_ts_skrivesti
):
    slaa_paa_ts_skrivesti()

    resultat = _opprett_sak("KOE-TS-NY")

    assert resultat.success is False
    assert "B-17" in resultat.error
    assert resultat.metadata is None
    assert miljo.metadata.get("KOE-TS-NY") is None
    assert miljo.versjon("KOE-TS-NY") == 0


def test_opprettelse_med_ts_skrivesti_av_lagrer_sak_og_metadata(miljo):
    resultat = _opprett_sak("KOE-TS-NY")

    assert resultat.success is True
    assert miljo.metadata.get("KOE-TS-NY") is not None
    assert miljo.versjon("KOE-TS-NY") == 1


# WebhookService.handle_new_topic_created -------------------------------------


def _webhook(monkeypatch):
    """Webhook med Catenda, resolver og identitet stubbet; lageret er ekte."""
    klient = MagicMock()
    klient.get_topic_details.return_value = {
        "id": "topic-1",
        "title": "Pålegg om endring",
        "topic_type": "Endringsordre",
        "bimsync_creation_author": {
            "user": {"name": "Kari", "ref": "524809076a694255b989d236517a55da"}
        },
    }
    klient.get_project_details.return_value = {"name": "Testprosjekt"}
    resolver = MagicMock()
    resolver.resolve.return_value = ResolvedProjectContext(
        internal_project_id=PROSJEKT,
        catenda_project_id="11111111-1111-1111-1111-111111111111",
        board_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        topic_id="dddddddd-dddd-dddd-dddd-dddddddddddd",
        library_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    )
    monkeypatch.setattr(
        "services.catenda_webhook_service.create_metadata_repository",
        lambda: MagicMock(),
    )
    monkeypatch.setattr("services.auth_service.AuthService.__init__", lambda self: None)
    monkeypatch.setattr(
        "services.auth_service.AuthService.contract_membership_for_subject",
        lambda self, project_id, subject: ("BH", "team-bh"),
    )
    monkeypatch.setattr(
        "services.auth_service.AuthService.repo",
        SimpleNamespace(
            identity=lambda *a, **k: "11111111-2222-3333-4444-555555555555"
        ),
        raising=False,
    )
    tjeneste = WebhookService(
        event_repository=MagicMock(),
        catenda_client=klient,
        resolver=resolver,
        config={},
    )
    nyttelast = {
        "event": {"id": "evt-1", "type": "issue.created"},
        "issue": {
            "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "boardId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        },
        "project": {"id": "11111111111111111111111111111111"},
    }
    return tjeneste, nyttelast


def test_webhook_med_ts_skrivesti_oppretter_ingen_sak(
    miljo, monkeypatch, slaa_paa_ts_skrivesti
):
    tjeneste, nyttelast = _webhook(monkeypatch)
    slaa_paa_ts_skrivesti()

    resultat = tjeneste.handle_new_topic_created(nyttelast)

    assert resultat["success"] is False
    assert "B-17" in resultat["error"]
    assert list(miljo.events_dir.glob("*")) == []
    assert miljo.metadata.list_all(alle_prosjekter=True) == []


def test_webhook_med_ts_skrivesti_av_oppretter_saken(miljo, monkeypatch):
    tjeneste, nyttelast = _webhook(monkeypatch)

    resultat = tjeneste.handle_new_topic_created(nyttelast)

    assert resultat["success"] is True, resultat
    assert miljo.versjon(resultat["sak_id"]) == 1
    assert miljo.metadata.get(resultat["sak_id"]) is not None


# EndringsordreService ---------------------------------------------------------


def _opprett_eo(miljo):
    return miljo.eo_tjeneste().opprett_endringsordresak(
        eo_nummer="EO-TS-1",
        beskrivelse="Endret fundament",
        koe_sak_ids=[],
        utstedt_av_id=BH,
        sak_id="EO-TS-NY",
    )


def test_eo_opprettelse_med_ts_skrivesti_feiler_uten_hendelse_eller_metadata(
    miljo, slaa_paa_ts_skrivesti
):
    slaa_paa_ts_skrivesti()

    with pytest.raises(RuntimeError, match="B-17"):
        _opprett_eo(miljo)

    assert miljo.versjon("EO-TS-NY") == 0
    assert miljo.metadata.get("EO-TS-NY") is None


def test_eo_opprettelse_med_ts_skrivesti_av_utsteder_ordren(miljo):
    assert _opprett_eo(miljo)["sak_id"] == "EO-TS-NY"

    assert miljo.versjon("EO-TS-NY") == 3
    assert miljo.metadata.get("EO-TS-NY") is not None


def _eo_utkast(miljo, relaterte):
    """Omforent KOE og EO i utkast; tilstanden til KOE-en er oppgitt."""
    miljo.saa("KOE-TS-1", [_sak_opprettet("KOE-TS-1")], tilstand=agreed_koe("KOE-TS-1"))
    miljo.saa(
        "EO-TS-1",
        [
            _sak_opprettet("EO-TS-1", sakstype="endringsordre", rolle="BH"),
            EOOpprettetEvent(
                sak_id="EO-TS-1",
                aktor_id=BH,
                aktor_rolle="BH",
                data=EOOpprettetData(
                    eo_nummer="EO-TS-1",
                    beskrivelse="Endret fundament",
                    relaterte_koe_saker=relaterte,
                ),
            ),
        ],
    )


EO_ENDRINGER = pytest.mark.parametrize(
    "handling, relaterte",
    [("legg_til_koe", []), ("fjern_koe", ["KOE-TS-1"])],
)


@EO_ENDRINGER
def test_eo_endring_med_ts_skrivesti_avvises_uten_hendelse(
    miljo, slaa_paa_ts_skrivesti, handling, relaterte
):
    _eo_utkast(miljo, relaterte)
    slaa_paa_ts_skrivesti()

    with pytest.raises(RuntimeError, match="B-17"):
        getattr(miljo.eo_tjeneste(), handling)("EO-TS-1", "KOE-TS-1", aktor_id=BH)

    assert miljo.versjon("EO-TS-1") == 2


@EO_ENDRINGER
def test_eo_endring_med_ts_skrivesti_av_lagres(miljo, handling, relaterte):
    _eo_utkast(miljo, relaterte)

    resultat = getattr(miljo.eo_tjeneste(), handling)(
        "EO-TS-1", "KOE-TS-1", aktor_id=BH
    )

    assert resultat["success"] is True
    assert miljo.versjon("EO-TS-1") == 3


# EOApprovalService.issue ------------------------------------------------------


def _eo_godkjenning(miljo, tmp_path):
    return EOApprovalService(
        tmp_path / "eo-approval.sqlite",
        miljo.eo_tjeneste(),
        POLICY,
        issued=lambda sak_id: miljo.versjon(sak_id) > 0,
    )


def test_eo_utstedelse_med_ts_skrivesti_gir_utstedelse_feilet_og_ingen_hendelse(
    miljo, tmp_path, slaa_paa_ts_skrivesti
):
    tjeneste = _eo_godkjenning(miljo, tmp_path)
    slaa_paa_ts_skrivesti()

    # Innenfor fullmakten utsteder innsendingen straks gjennom issue().
    pakke = run(tjeneste, "submit", request=order())["packages"][-1]
    assert pakke["status"] == "utstedelse_feilet"
    tjeneste.issue("p1", pakke["id"])
    pakke = tjeneste.read("p1", POLICY["handlers"][0]["id"])["packages"][-1]

    assert pakke["status"] == "utstedelse_feilet"
    assert "B-17" in pakke["error"]
    assert miljo.versjon(pakke["sakId"]) == 0
    assert miljo.metadata.get(pakke["sakId"]) is None


def test_eo_utstedelse_med_ts_skrivesti_av_utsteder_ordren(miljo, tmp_path):
    tjeneste = _eo_godkjenning(miljo, tmp_path)

    pakke = run(tjeneste, "submit", request=order())["packages"][-1]

    assert pakke["status"] == "utstedt"
    assert miljo.versjon(pakke["sakId"]) == 3


# ForseringService -------------------------------------------------------------


def _varslet_forsering(miljo):
    miljo.saa(
        "FORS-TS-1",
        [
            _sak_opprettet("FORS-TS-1", sakstype="forsering"),
            ForseringVarselEvent(
                sak_id="FORS-TS-1",
                aktor_id=TE,
                aktor_rolle="TE",
                data=ForseringVarselData(
                    frist_krav_id="frist-1",
                    respons_frist_id="respons-1",
                    estimert_kostnad=100_000,
                    begrunnelse="Avslått fristforlengelse",
                    bekreft_30_prosent=True,
                    dato_iverksettelse="2026-09-15",
                    avslatte_dager=10,
                    dagmulktsats=50_000,
                ),
            ),
        ],
    )
    return ForseringService(
        event_repository=miljo.hendelser,
        timeline_service=TimelineService(),
        relation_repository=None,
    )


FORSERINGSHANDLINGER = pytest.mark.parametrize(
    "handling, argumenter",
    [
        (
            "registrer_bh_respons",
            {
                "aksepterer": True,
                "godkjent_kostnad": 100_000,
                "begrunnelse": "Forseringen aksepteres",
                "aktor_id": BH,
            },
        ),
        (
            "stopp_forsering",
            {"begrunnelse": "Fullført", "paalopte_kostnader": 5_000, "aktor_id": TE},
        ),
        (
            "oppdater_kostnader",
            {"paalopte_kostnader": 25_000, "kommentar": "Påløpt", "aktor_id": TE},
        ),
    ],
)


@FORSERINGSHANDLINGER
def test_forsering_med_ts_skrivesti_avvises_uten_hendelse(
    miljo, slaa_paa_ts_skrivesti, handling, argumenter
):
    tjeneste = _varslet_forsering(miljo)
    slaa_paa_ts_skrivesti()

    with pytest.raises(PythonSkrivingStengt):
        getattr(tjeneste, handling)(
            sak_id="FORS-TS-1", expected_version=2, **argumenter
        )

    assert miljo.versjon("FORS-TS-1") == 2


@FORSERINGSHANDLINGER
def test_forsering_med_ts_skrivesti_av_lagres(miljo, handling, argumenter):
    tjeneste = _varslet_forsering(miljo)

    resultat = getattr(tjeneste, handling)(
        sak_id="FORS-TS-1", expected_version=2, **argumenter
    )

    assert resultat["version"] == 3
    assert miljo.versjon("FORS-TS-1") == 3


FORSERING_UTEN_HENDELSE = pytest.mark.parametrize(
    "handling, argumenter, catendakall",
    [
        (
            "opprett_forseringssak",
            {
                "avslatte_sak_ids": ["KOE-1"],
                "estimert_kostnad": 100_000,
                "dagmulktsats": 50_000,
                "begrunnelse": "Avslått fristforlengelse",
                "avslatte_dager": 10,
            },
            "create_topic",
        ),
        ("legg_til_relatert_sak", ("FORS-1", "KOE-1"), "create_topic_relations"),
        ("fjern_relatert_sak", ("FORS-1", "KOE-1"), "delete_topic_relation"),
    ],
)


def _kall(tjeneste, handling, argumenter):
    metode = getattr(tjeneste, handling)
    if isinstance(argumenter, dict):
        return metode(**argumenter)
    return metode(*argumenter)


def _forsering_med_catenda():
    catenda = MagicMock()
    catenda.create_topic.return_value = {"guid": "FORS-NY"}
    relasjoner = MagicMock()
    tjeneste = ForseringService(
        catenda_client=catenda,
        event_repository=MagicMock(),
        timeline_service=TimelineService(),
        relation_repository=relasjoner,
    )
    return tjeneste, catenda, relasjoner


@FORSERING_UTEN_HENDELSE
def test_forseringens_topic_og_relasjoner_avvises_med_ts_skrivesti(
    slaa_paa_ts_skrivesti, handling, argumenter, catendakall
):
    """Inngangene skriver uten hendelse, så lagervakten når dem ikke. Den
    databaseløse dobbelen viser at tjenesten selv avviser; HTTP-svaret og
    `sak_relations` prøves mot testbasen i `test_ts_skrivesti.py`."""
    tjeneste, catenda, relasjoner = _forsering_med_catenda()
    slaa_paa_ts_skrivesti()

    with pytest.raises(PythonSkrivingStengt):
        _kall(tjeneste, handling, argumenter)

    getattr(catenda, catendakall).assert_not_called()
    relasjoner.add_relations_batch.assert_not_called()


@FORSERING_UTEN_HENDELSE
def test_forseringens_topic_og_relasjoner_skrives_med_ts_skrivesti_av(
    handling, argumenter, catendakall
):
    tjeneste, catenda, _ = _forsering_med_catenda()

    _kall(tjeneste, handling, argumenter)

    getattr(catenda, catendakall).assert_called()
