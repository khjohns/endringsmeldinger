"""Revisjonstester for pass 9: Testsuitekvalitet og blindsoner (2026-09-18).

Dokumenterer svakheter i testsuiten, falsk trygghet pga. over-mocking,
manglende tester for samtidighet og delvis skriving, samt grensesnittavvik
mellom mock/fil-implementasjoner og produksjonsdatabaser.

INGEN PRODUKSJONSKODE SKAL ENDRES I DETTE PASSET.
Testene skal feile med ren AssertionError før de markeres med streng xfail.
"""

import os
import tempfile
import threading
from pathlib import Path
from unittest.mock import Mock

import pytest

from core.container import Container
from models.events import SakOpprettetEvent
from repositories.event_repository import ConcurrencyError, JsonFileEventRepository
from repositories.sak_metadata_repository import SakMetadataRepository
from services.endringsordre_service import EndringsordreService
from services.timeline_service import TimelineService


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="TST-01: SakMetadataRepository (CSV) mangler list_by_sakstype; isolert mocking skjuler at /api/cases?sakstype= krasjer",
)
def test_tst_01_manglende_integrasjon_full_kjede_krasjer_uten_mocks():
    """TST-01: Hermetisk mocking skjuler at ruter krasjer mot standard metadata-repo.

    GET /api/cases?sakstype= kaller metadata_repository.list_by_sakstype().
    Standard SakMetadataRepository (CSV) mangler denne metoden helt.
    I testsuiten oppdages aldri dette fordi testene mocker bort repository
    med MagicMock(), eller ruten aldri testes i integrasjon med ekte CSV-repo.
    """
    repo = SakMetadataRepository(csv_path=tempfile.mktemp(suffix=".csv"))
    assert hasattr(repo, "list_by_sakstype"), (
        "TST-01: SakMetadataRepository (standard CSV-backend brukt i testsuiten) "
        "mangler metoden 'list_by_sakstype'. Tester som mocker bort repoet gir "
        "falsk trygghet: /api/cases?sakstype= krasjer med 500 i reell kjøring."
    )


class FlettingIkkeNaadd(RuntimeError):
    """Trådplanen testen skal styre, ble ikke nådd."""


class ToSkrivere:
    """To opprettelser av samme sak, styrt gjennom ett punkt i `append_batch`.

    Begge skriverne når punktet, så fullfører skriver 1, så fortsetter
    skriver 2. Bare første passering per tråd styres.
    """

    NAVN = ("skriver 1", "skriver 2")

    def __init__(self):
        self.naadd = {navn: threading.Event() for navn in self.NAVN}
        self.skriver_1_ferdig = threading.Event()
        self.traad = threading.local()
        self.passert = set()

    def navn(self):
        return getattr(self.traad, "navn", None)

    def punkt(self):
        navn = self.navn()
        if navn is None or navn in self.passert:
            return
        self.passert.add(navn)
        self.naadd[navn].set()
        if not all(naadd.wait(5) for naadd in self.naadd.values()):
            raise FlettingIkkeNaadd("begge skriverne nådde ikke punktet")
        if navn == "skriver 2" and not self.skriver_1_ferdig.wait(5):
            raise FlettingIkkeNaadd("skriver 1 fullførte ikke")

    def kjoer(self, repo, sak_id):
        hendelser = {
            navn: SakOpprettetEvent(
                sak_id=sak_id,
                aktor_id=f"te-bruker-{navn[-1]}",
                aktor_rolle="TE",
                sakstittel=f"Sak fra {navn}",
            )
            for navn in self.NAVN
        }
        utfall = {}

        def opprett(navn):
            self.traad.navn = navn
            try:
                utfall[navn] = repo.append_batch([hendelser[navn]], expected_version=0)
            except Exception as exc:
                utfall[navn] = exc
            finally:
                if navn == "skriver 1":
                    self.skriver_1_ferdig.set()

        traader = [threading.Thread(target=opprett, args=(navn,)) for navn in self.NAVN]
        for t in traader:
            t.start()
        for t in traader:
            t.join(timeout=15)

        if any(t.is_alive() for t in traader):
            raise FlettingIkkeNaadd("en skriver ble ikke ferdig")
        for resultat in utfall.values():
            if isinstance(resultat, FlettingIkkeNaadd):
                raise resultat
        if self.passert != set(self.NAVN):
            raise FlettingIkkeNaadd(f"punktet ble passert av {self.passert}")
        return hendelser, utfall


def _krev_at_foerste_sak_staar(repo, sak_id, hendelser, utfall):
    lagret, versjon = repo.get_events(sak_id)
    assert utfall["skriver 1"] == 1, utfall
    assert [e["event_id"] for e in lagret] == [hendelser["skriver 1"].event_id], (
        f"Skriver 1s opprettelse ble overskrevet. Lagret: "
        f"{[e['sakstittel'] for e in lagret]} (versjon {versjon}). Utfall: {utfall}"
    )
    assert isinstance(utfall["skriver 2"], ConcurrencyError), utfall
    assert (utfall["skriver 2"].expected, utfall["skriver 2"].actual) == (0, 1)
    assert list(repo.base_path.glob("*.tmp")) + list(repo.base_path.glob(".*.tmp")) == []
    assert repo.list_all_sak_ids() == [sak_id]


def test_tst_02_samtidig_opprettelse_etter_eksistenssjekken_gir_concurrency_error(
    tmp_path, monkeypatch
):
    """TST-02/KR-15: begge skriverne har sett at saksfilen mangler.

    Flettingen styres ved `file_path.exists()` i `append_batch`, med reell
    lagring. Skriver 1s sak skal stå, og skriver 2 skal få
    `ConcurrencyError`.

    Merknad 2026-09-22 (TST-02 rettet): testen var en streng xfail
    (`test_tst_02_samtidig_opprettelse_overskriver_foerste_sak_uten_concurrency_error`)
    som viste at skriver 2 overskrev skriver 1s sak og fikk versjon 1. Lageret
    publiserer nå saksfilen med `os.link`, som feiler når filen finnes, og
    testen ble XPASS. Den er gjort om til en ordinær test med de samme
    assertionene.
    """
    sak_id = "RACE-SAK-001"
    repo = JsonFileEventRepository(base_path=str(tmp_path))
    styring = ToSkrivere()
    saksfil_fantes = {}

    class StyrtSaksfil(type(Path())):
        def exists(self):
            finnes = super().exists()
            navn = styring.navn()
            if navn is not None and navn not in saksfil_fantes:
                saksfil_fantes[navn] = finnes
                styring.punkt()
            return finnes

    saksfil = repo._get_file_path
    monkeypatch.setattr(repo, "_get_file_path", lambda s: StyrtSaksfil(saksfil(s)))

    hendelser, utfall = styring.kjoer(repo, sak_id)

    if saksfil_fantes != {"skriver 1": False, "skriver 2": False}:
        raise FlettingIkkeNaadd(f"begge skal ha sett at saksfilen mangler: {saksfil_fantes}")
    _krev_at_foerste_sak_staar(repo, sak_id, hendelser, utfall)


def test_tst_02_samtidig_opprettelse_med_to_ferdige_utkast_gir_concurrency_error(
    tmp_path, monkeypatch
):
    """TST-02: begge skriverne har skrevet saksfilen ferdig før noen publiserer.

    Flettingen styres ved publiseringen (`os.link`). Før rettingen skrev begge
    til samme `{sak_id}.tmp`; den andre `rename` fant ikke filen og kastet
    `FileNotFoundError`, som ble 500 i stedet for 409. Nå har hver skriver sin
    egen midlertidige fil, og den andre publiseringen gir `ConcurrencyError`.
    """
    sak_id = "RACE-SAK-002"
    repo = JsonFileEventRepository(base_path=str(tmp_path))
    styring = ToSkrivere()
    utkast_ved_publisering = []
    ekte_link = os.link

    def styrt_link(kilde, maal, *args, **kwargs):
        styring.punkt()
        if styring.navn() == "skriver 1":
            utkast_ved_publisering.extend(sorted(tmp_path.glob(".*.tmp")))
        return ekte_link(kilde, maal, *args, **kwargs)

    monkeypatch.setattr(os, "link", styrt_link)

    hendelser, utfall = styring.kjoer(repo, sak_id)

    assert len(utkast_ved_publisering) == 2, utkast_ved_publisering
    _krev_at_foerste_sak_staar(repo, sak_id, hendelser, utfall)


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="TST-03: TrackingUnitOfWork ruller ikke tilbake hendelser; event append er no-op i rollback og gir falsk transaksjonssikkerhet",
)
def test_tst_03_tracking_unit_of_work_ruller_ikke_tilbake_hendelser():
    """TST-03: TrackingUnitOfWork gir falsk transaksjonssikkerhet for hendelser.

    TrackingUnitOfWork påstår å rulle tilbake operasjoner ved exception.
    Men TrackingUnitOfWork._default_rollback har no-op for EVENT_APPEND:
    den logger kun en warning om at 'Events are immutable'.
    Dersom en operasjon feiler etter hendelsesskriving, forblir hendelsene
    lagret i databasen/fillageret mens metadata slettes, og etterlater saken
    i en korrupt delvis skrevet tilstand.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        container = Container()
        container._event_repo = JsonFileEventRepository(base_path=tmpdir)
        uow = container.create_unit_of_work()

        sak_id = "SAK-UOW-FAIL"
        ev = SakOpprettetEvent(
            sak_id=sak_id, aktor_id="TE", aktor_rolle="TE", sakstittel="UoW Test"
        )

        with pytest.raises(RuntimeError):
            with uow:
                uow.events.append(ev, expected_version=0)
                raise RuntimeError("Etterfølgende operasjon feiler")

        # Etter uow-exit med feil skal ingen hendelser være persistert
        events, version = container.event_repository.get_events(sak_id)
        assert len(events) == 0 and version == 0, (
            f"TST-03: TrackingUnitOfWork rullet ikke tilbake hendelser ved feil! "
            f"Persisterte hendelser etter rollback: {len(events)}, versjon: {version}. "
            "UoW gir falsk trygghet om atomisitet."
        )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="TST-04: backend/docs/openapi.yaml eksisterer ikke; fullstendig fravær av kontraktstesting mellom frontend og backend",
)
def test_tst_04_openapi_spec_mangler_og_er_ikke_i_synk():
    """TST-04: OpenAPI-spesifikasjonen eksisterer ikke; full kontrakt-blindhet.

    scripts/check_openapi_freshness.py forventer backend/docs/openapi.yaml.
    Filen mangler fullstendig. Frontend TypeScript-typer er skrevet 100%
    manuelt uten validering mot backendens Pydantic-modeller.
    """
    spec_path = Path("backend/docs/openapi.yaml")
    assert spec_path.exists(), (
        f"TST-04: {spec_path} eksisterer ikke! API-kontrakten mellom frontend "
        "og backend vedlikeholdes ikke, og det er fullstendig skjemadrift "
        "og manglende kontraktstesting mellom Python og TypeScript."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="TST-05: EndringsordreService har ingen outbox eller gjenopprettingsmekanisme når Catenda feiler",
)
def test_tst_05_endringsordre_svelger_catenda_brudd_uten_outbox():
    """TST-05: Opprettelse av endringsordre svelger Catenda-brudd uten gjenoppretting.

    Dersom Catenda API feiler under opprettelse av endringsordresak, setter
    EndringsordreService catenda_synced=False, men legger IKKE ordren i
    noen outbox-tabell for senere gjenoppretting.
    I motsetning til ApprovalService (som har approval_outbox), har EO ingen
    mekanisme for å retrye synkronisering etter nettverksbrudd.
    """
    mock_catenda = Mock()
    mock_catenda.create_topic.side_effect = ConnectionError("Catenda utilgjengelig")

    service = EndringsordreService(
        catenda_client=mock_catenda,
        event_repository=JsonFileEventRepository(tempfile.gettempdir()),
        timeline_service=TimelineService(),
        metadata_repository=SakMetadataRepository(tempfile.mktemp(suffix=".csv")),
    )

    # Verifiser om det finnes en outbox eller synkroniseringsmekanisme for feilede EO-er
    assert hasattr(service, "outbox_repository") or hasattr(service, "retry_unsynced_orders"), (
        "TST-05: EndringsordreService har ingen outbox eller mekanisme for å gjenoppta "
        "Catenda-synkronisering ved nettverksbrudd. Hvis Catenda er nede ved EO-opprettelse, "
        "forblir ordren usynkronisert for alltid uten gjenopprettingsmulighet."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="TST-06: JsonFileEventRepository mangler get_all_sak_ids; grensesnittavvik mot SupabaseEventRepository krasjer scripts",
)
def test_tst_06_metodeavvik_og_driftsgap_mellom_json_csv_og_supabase_repos():
    """TST-06: Asymmetri mellom Json/CSV-repos (testmiljø) og Supabase-repos (prod).

    JsonFileEventRepository og SupabaseEventRepository implementerer ulike metoder
    for samme kjerneoperasjon:
    - JsonFileEventRepository har 'list_all_sak_ids'
    - SupabaseEventRepository har 'get_all_sak_ids'
    Dette gjør at produksjonsskript (f.eks. backfill_relations.py) krasjer
    i testmiljøet med AttributeError.
    """
    json_repo = JsonFileEventRepository(tempfile.gettempdir())
    assert hasattr(json_repo, "get_all_sak_ids"), (
        "TST-06: JsonFileEventRepository mangler 'get_all_sak_ids', som SupabaseEventRepository "
        "har. Testsuiten kjører mot fil-repos som ikke implementerer samme grensesnitt "
        "som produksjonsdatabasen, og skjuler runtime-krasj i skript og hjelpefunksjoner."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="TST-07: 58 av 87 (66.7%) Svelte-komponenter mangler tester, inkludert alle rutesider og store modaler",
)
def test_tst_07_frontend_komponenter_mangler_tester():
    """TST-07: Massiv blindsone i frontend: over 50% av Svelte-komponentene mangler tester.

    Av 87 Svelte-komponenter er kun 29 referert i tester. 58 komponenter (67%)
    har null testdekning, inkludert samtlige rutesider (src/routes/**) og
    kritiske modaler som LetterPreviewModal og WithdrawModal.
    """
    root = Path(__file__).resolve().parent.parent.parent.parent
    svelte_files = list(root.glob("src/**/*.svelte"))
    test_files = list(root.glob("src/**/*.test.ts")) + list(root.glob("src/**/*.spec.ts"))

    test_content = "\n".join(
        f.read_text(encoding="utf-8") for f in test_files if f.exists()
    )

    untested = [
        f for f in svelte_files
        if f.stem not in test_content
    ]

    untested_ratio = len(untested) / len(svelte_files) if svelte_files else 0
    assert untested_ratio < 0.20, (
        f"TST-07: Hele {len(untested)} av {len(svelte_files)} ({untested_ratio:.1%}) "
        f"Svelte-komponenter mangler enhver form for testdekning! "
        f"Blant de utestede er kritiske komponenter som LetterPreviewModal, "
        f"WithdrawModal, ClaimApprovalView og samtlige rutesider under src/routes/."
    )
