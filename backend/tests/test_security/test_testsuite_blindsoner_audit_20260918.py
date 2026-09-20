"""Revisjonstester for pass 9: Testsuitekvalitet og blindsoner (2026-09-18).

Dokumenterer svakheter i testsuiten, falsk trygghet pga. over-mocking,
manglende tester for samtidighet og delvis skriving, samt grensesnittavvik
mellom mock/fil-implementasjoner og produksjonsdatabaser.

INGEN PRODUKSJONSKODE SKAL ENDRES I DETTE PASSET.
Testene skal feile med ren AssertionError før de markeres med streng xfail.
"""

import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor
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


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="TST-02: JsonFileEventRepository mangler låsing ved expected_version=0; samtidig opprettelse krasjer med FileNotFoundError eller overskriver",
)
def test_tst_02_samtidig_saksopprettelse_krasjer_eller_overskriver_uten_concurrency_error():
    """TST-02: Samtidig saksopprettelse (expected_version=0) i JsonFileEventRepository.

    Testsuiten tester kun samtidighet på eksisterende saker (expected_version > 0).
    Ved expected_version == 0 finnes ingen fillås: to tråder skriver begge til
    samme .tmp-fil og kaller rename().
    En tråd krasjer med ubehandlet FileNotFoundError i stedet for ConcurrencyError,
    eller en av trådenes hendelser overskrives i det stille.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        repo = JsonFileEventRepository(base_path=tmpdir)
        barrier = threading.Barrier(2)
        errors = []
        successes = []

        def opprett_sak(arbeider_navn):
            ev = SakOpprettetEvent(
                sak_id="RACE-SAK-001",
                aktor_id=arbeider_navn,
                aktor_rolle="TE",
                sakstittel=f"Sak fra {arbeider_navn}",
            )
            barrier.wait()
            try:
                v = repo.append_batch([ev], expected_version=0)
                successes.append((arbeider_navn, v))
            except ConcurrencyError as ce:
                errors.append(("concurrency_error", ce))
            except Exception as e:
                errors.append((type(e).__name__, e))

        with ThreadPoolExecutor(max_workers=2) as executor:
            list(executor.map(opprett_sak, ["Tråd-1", "Tråd-2"]))

        # Forventet adferd ved korrekt optimistisk låsing:
        # Én vinner og én ConcurrencyError.
        # Faktisk adferd: FileNotFoundError eller 2 suksesser med overskriving.
        has_concurrency_error = any(err[0] == "concurrency_error" for err in errors)
        assert has_concurrency_error, (
            f"TST-02: Samtidig opprettelse håndterer ikke rasebetingelser med ConcurrencyError! "
            f"Suksesser: {successes}, Feil: {errors}. "
            "Tråder krasjer med FileNotFoundError eller overskriver hverandre uten låsing."
        )


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
