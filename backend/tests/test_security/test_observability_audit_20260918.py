"""Sikkerhets- og sporbarhetsrevisjon (Pass 8: Observability og revisjonsspor).

Testene her etterprøver svakheter i revisjonslogging, CloudEvents-sporbarhet,
tidssonehåndtering og feilhåndtering:
1. OBS-01/02: errorhandler(403) og audit.log_access_denied kalles aldri ved 403-avvisninger.
2. OBS-03: CloudEventMixin.ce_time kutter timezone-offset uten justering og forskyver tid med 2 timer.
3. OBS-04: CloudEventMixin.ce_source hardkoder '/projects/oslobygg/cases/...' for alle saker.
4. OBS-05: Hendelsesmodeller (SakEvent) mangler felt for request_id / traceparent-korrelasjon.
5. OBS-06: request_context aksepterer usensurert X-Request-ID fra klient uten validering.
6. OBS-07: error_handlers lekker rå unntaksmeldinger i JSON-respons når app.debug=True.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

import pytest
from flask import Flask

from models.cloudevents import CloudEventMixin
from models.events import GrunnlagEvent, SakEvent
from routes.error_handlers import register_error_handlers


# =============================================================================
# 1. OBS-01/02: 403-avvisninger omgår errorhandler(403) og AuditLogger
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="Ruter returnerer 'jsonify(), 403' direkte, så @app.errorhandler(403) og audit trigges aldri",
)
def test_403_avvisning_omgar_errorhandler_og_audit_logging(monkeypatch):
    """Sikkerhetsavvisninger med 403 må fanges av errorhandler og logges til audit-logg.

    I routes/error_handlers.py:44-51 defineres @app.errorhandler(403) som kaller
    audit.log_access_denied(). Men lib/auth/session.py og lib/auth/project_access.py
    utfører direkte `return jsonify(...), 403` i stedet for å kaste HTTPException (abort(403)).
    I Flask kalles aldri @app.errorhandler når en rute returnerer en response-tuple direkte.
    """
    from lib.auth.session import cookie_name, require_auth

    app = Flask(__name__)
    app.testing = True
    register_error_handlers(app)

    # Mock audit.log_access_denied
    mock_audit = Mock()
    monkeypatch.setattr("routes.error_handlers.audit", mock_audit)

    @app.route("/api/test-protected", methods=["POST"])
    @require_auth
    def protected_route():
        return {"status": "ok"}

    client = app.test_client()
    # Simuler en forespørsel med sesjon, men manglende CSRF-token (gir 403)
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "user-1", "email": "user@test.no"},
        "csrf_token": "secret-csrf-token",
    }
    app.extensions["koe_auth"] = auth
    client.set_cookie(cookie_name(), "valid-session")

    # Send muterende POST uten X-CSRF-Token -> require_auth returnerer 403
    response = client.post("/api/test-protected")
    assert response.status_code == 403

    # For at tilgangsnekt skal være sporbart, må audit.log_access_denied ha blitt kalt!
    assert mock_audit.log_access_denied.called, (
        "403 Forbidden ble returnert som rå response-tuple; "
        "errorhandler(403) og audit.log_access_denied() ble ALDRI kalt!"
    )


# =============================================================================
# 2. OBS-03: CloudEventMixin.ce_time kutter offset og forskyver tid med 2 timer
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "OBS-03: ce_time kutter offset med .split('+')[0] og merker verdien som UTC. "
        "Ingen forskyvning inntreffer i dag: tidsstempel er serverkontrollert og settes "
        "til datetime.now(UTC), så kuttet gir riktig verdi (kontrollert 2026-09-19). "
        "Svakheten er reell, men latent — den biter først om et ikke-UTC tidsstempel når "
        "hit. Grenen for NEGATIV offset er verre: elif-en fanger ikke -05:00, som ville "
        "gitt den ugyldige strengen '...-05:00Z'. Samme énlinjefiks lukker begge."
    ),
)
def test_cloudevents_ce_time_korrumperer_tidssone_med_to_timer():
    """CloudEvents ce_time må konvertere tidssoner korrekt til UTC.

    I models/cloudevents.py:146-150:
    if '+' in iso:
        iso = iso.split('+')[0]
    return iso + 'Z'

    Dette fjerner bare '+02:00' og henger på 'Z'!
    Et tidsstempel kl 12:00 norsk sommertid (+02:00) er kl 10:00 UTC.
    Koden gjør det til 12:00 UTC ('12:00:00Z'), altså 2 timer i fremtiden!
    """
    # 15. juni kl 12:00 norsk sommertid (UTC+2)
    oslo_tz = timezone(timedelta(hours=2))
    lokal_tid = datetime(2026, 6, 15, 12, 0, 0, tzinfo=oslo_tz)

    class DummyEvent(CloudEventMixin):
        tidsstempel: datetime

    event = DummyEvent(tidsstempel=lokal_tid)
    ce_time_str = event.ce_time

    # Korrekt UTC-representasjon av 12:00+02:00 er 10:00:00Z
    assert ce_time_str == "2026-06-15T10:00:00Z", (
        f"ce_time korrumperte tidssonen: Forventet '2026-06-15T10:00:00Z', men fikk '{ce_time_str}' (2 timer feil)"
    )


# =============================================================================
# 3. OBS-04: CloudEventMixin.ce_source hardkoder '/projects/oslobygg/cases/...'
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="ce_source setter 'oslobygg' som default-prosjekt når prosjekt_id er None",
)
def test_cloudevents_ce_source_hardkoder_oslobygg_uten_prosjekt():
    """CloudEvent ce_source må ikke hardkode 'oslobygg' for hendelser uten prosjekt_id.

    I models/cloudevents.py:109:
    proj_id = getattr(self, "prosjekt_id", None) or "oslobygg"
    Fordi hendelsestabellene mangler prosjekt_id-kolonne (DB-06),
    tilordnes alle saker fra andre byggherrer automatisk til Oslobygg i CloudEvents.
    """
    class DummyEvent(CloudEventMixin):
        sak_id: str = "KOE-BERGEN-001"
        prosjekt_id: str | None = None

    event = DummyEvent()
    source = event.ce_source

    # Kilden må ikke hardkodes til 'oslobygg' når saken tilhører et annet prosjekt eller er ukjent
    assert "oslobygg" not in source, (
        f"ce_source hardkodet 'oslobygg' for sak uten prosjekt_id: '{source}'"
    )


# =============================================================================
# 4. OBS-05: Hendelsesmodeller mangler request_id / traceparent
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="SakEvent og CloudEventMixin har ingen felter for request_id eller traceparent",
)
def test_hendelser_mangler_request_id_og_sporbarhet():
    """SakEvent må inneholde korrelasjons-ID for å koble hendelse til HTTP-forespørsel.

    core/request_context.py genererer X-Request-ID, men denne lagres aldri på hendelsen
    og er fraværende fra SakEvent, CloudEventMixin og databasetabellene.
    Det er umulig å spore en databasehendelse tilbake til forespørselen som opprettet den.
    """
    fields = SakEvent.model_fields
    ce_fields = CloudEventMixin.model_fields

    has_correlation = (
        "request_id" in fields
        or "correlation_id" in fields
        or "traceparent" in fields
        or "request_id" in ce_fields
        or "correlation_id" in ce_fields
    )

    assert has_correlation, (
        "SakEvent mangler felter for korrelasjons-ID / sporbarhet (request_id, traceparent)"
    )


# =============================================================================
# 5. OBS-06: request_context aksepterer usensurert X-Request-ID
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="request_context aksepterer usensurert X-Request-ID fra klient (sårbar for logginjeksjon)",
)
def test_request_context_aksepterer_vilkarlig_header_uten_sanitering():
    """core/request_context.py må validere og rense klientens X-Request-ID.

    Linje 31-34:
    request_id = request.headers.get("X-Request-ID")
    if not request_id: request_id = uuid.uuid4().hex[:8]
    g.request_id = request_id

    En ondsinnet klient kan sende linjeskift eller logginjeksjonstegn som
    forurenser ustrukturerte tekstlogger og HTTP-headere.
    """
    from core.request_context import init_request_context
    from flask import g

    app = Flask(__name__)
    init_request_context(app)

    # Klienten sender en overdimensjonert request-ID med injisert loggtekst
    malicious_header = "INJECTED_CRITICAL_LOG_EVENT_" + ("X" * 1000)

    @app.route("/test")
    def test_view():
        return {"id": g.request_id}

    client = app.test_client()
    response = client.get("/test", headers={"X-Request-ID": malicious_header})

    # Request ID må valideres og begrenses (f.eks. alfanumerisk UUID, maks 64 tegn)
    received_id = response.headers.get("X-Request-ID", "")
    assert len(received_id) <= 64, (
        f"X-Request-ID ble ikke begrenset eller validert; aksepterte {len(received_id)} tegn"
    )


# =============================================================================
# 6. OBS-07: error_handlers lekker unntaksdetaljer når app.debug=True
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="handle_unexpected_error lekker rå 'str(e)' i JSON-respons når app.debug=True",
)
def test_unhandled_exception_lekker_detaljer_i_debug_modus():
    """Feilhåndterere må aldri returnere rå unntaksmeldinger til klienten, selv med debug=True.

    I routes/error_handlers.py:73:
    'detail': str(e) if app.debug else 'An unexpected error occurred.'
    Siden FLASK_DEBUG=True er standard i .env.example, vil alle ukjente unntak
    lekke interne filstier, SQL-feil og variabler til klienten.
    """
    app = Flask(__name__)
    app.debug = True
    register_error_handlers(app)

    sensitive_internal_message = "psycopg.errors.AdminShutdown: server closed unexpectedly on /var/run/postgresql"

    @app.route("/crash")
    def crash_view():
        raise RuntimeError(sensitive_internal_message)

    client = app.test_client()
    response = client.get("/crash")

    assert response.status_code == 500
    data = response.get_json()

    # Rå feilmelding skal aldri lekke til HTTP-responsen
    assert sensitive_internal_message not in str(data.get("detail")), (
        f"Feilhåndterer lakk intern unntaksmelding i HTTP-respons: {data}"
    )
