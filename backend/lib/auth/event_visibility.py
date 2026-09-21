"""Lesetilgang til interne notater.

`internt_notat` er dokumentert som «kun synlig for egen organisasjon»
(models/events.py). Notatet lagres for seg (MS-05), men flettes inn i sakens
tidslinje ved lesing, og tidslinjen leser begge kontraktsparter fra. Filteret
her er derfor fortsatt det eneste som skiller organisasjonene på lesesiden, og
det må brukes på alle punkter som returnerer hendelser til en klient.

Skjermingen ligger i to lag med vilje: lageret spør på prosjekt, og filteret
her spør på team. Et lager som ga fra seg feil rad, ville fortsatt blitt stanset
her.

Skillet går på Catenda-team, ikke på kontraktsside. En side kan ha flere team —
byggherren og en ekstern rådgiver er ulike organisasjoner på samme side — og
`CATENDA_CONTRACT_TEAMS` mapper hver side til en *liste* av team-IDer. Et filter
på TE/BH ville derfor latt rådgiveren lese byggherrens interne notater.

Regelen er fail-closed i begge ender: notatet vises bare når både leserens og
notatets organisasjon er kjent og er den samme. Et notat uten `aktor_team_id`
vises ikke til noen.
"""

from flask import g

from models.events import EventType


def reader_contract_team() -> str | None:
    """Leserens Catenda-team, eller None når det ikke kan bekreftes.

    Teamet slås ikke opp på nytt dersom en rutedekoratør allerede har satt det.
    Feil mot medlemsoppslaget gir None, ikke unntak: lesing av saken skal ikke
    bryte fordi teamtilknytningen er utilgjengelig — notatene skjules i stedet.
    """
    if hasattr(g, "contract_team"):
        return g.contract_team or None

    project_id = getattr(g, "project_id", None)
    user = getattr(g, "user", None)
    if not project_id or not user or not user.get("id"):
        return None

    from lib.auth.session import get_auth_service

    try:
        _role, team = get_auth_service().contract_membership(project_id, user["id"])
    except Exception:
        return None
    # Oppslaget går mot Catenda. Flere lesepunkter i samme forespørsel spør om
    # det samme teamet, så svaret legges der rutedekoratørene legger sitt.
    g.contract_team = team
    return team or None


def reader_contract_role() -> str | None:
    """Leserens kontraktsside (TE/BH), eller None når den ikke kan bekreftes.

    Notatfilteret bruker `reader_contract_team`, som er strengere. Denne
    brukes der siden er det relevante — for eksempel om et vedlegg er lastet
    opp av leserens egen part.
    """
    role = getattr(g, "contract_role", None)
    if role in {"TE", "BH"}:
        return role

    project_id = getattr(g, "project_id", None)
    user = getattr(g, "user", None)
    if not project_id or not user or not user.get("id"):
        return None

    from lib.auth.session import get_auth_service

    try:
        role, _team = get_auth_service().contract_membership(project_id, user["id"])
    except Exception:
        return None
    return role if role in {"TE", "BH"} else None


def is_internal_note(event: object) -> bool:
    """Om hendelsen er et internt notat, uavhengig av om typen er enum eller str."""
    event_type = getattr(event, "event_type", None)
    value = getattr(event_type, "value", event_type)
    return value == EventType.INTERNT_NOTAT.value


def visible_events(events: list) -> list:
    """Fjern interne notater som ikke tilhører leserens egen organisasjon.

    Notatet skjules i sin helhet, ikke bare teksten: at en organisasjon har gjort
    en intern vurdering er i seg selv opplysning de andre ikke skal ha.

    Notater uten `aktor_team_id` skjules for alle, også for forfatteren. Et
    notat der vi ikke vet hvem som eier det, kan ikke vises til noen. Etter
    MS-05 avviser både modellen og `notat`-tabellen en slik rad, så regelen er
    et vern mot en hendelse som kom inn på et annet vis — ikke lenger den
    eneste sperren.
    """
    if not any(is_internal_note(event) for event in events):
        return events

    team = reader_contract_team()
    return [
        event
        for event in events
        if not is_internal_note(event)
        or (team is not None and getattr(event, "aktor_team_id", None) == team)
    ]


def redact_activity_metadata(state, events, visible=None):
    """Strip activity counters down to what the reader may actually see.

    The domain state is derived from the whole stream on purpose — status and
    amounts are public regardless of who reads. But `antall_events` and
    `siste_aktivitet` count every event, so they move the moment the other
    organisation writes an internal note, and the rule in this module is that the
    existence of such a note is itself confidential. The counters are therefore
    recomputed from the visible subset before the state leaves a read endpoint
    (audit RV-09). Pass `visible` when the caller has already filtered, so the
    stream is not scanned — and the team not looked up — twice.
    """
    visible = visible_events(events) if visible is None else visible
    if len(visible) == len(events):
        return state
    return state.model_copy(
        update={
            "antall_events": len(visible),
            "siste_aktivitet": visible[-1].tidsstempel if visible else None,
        }
    )


def public_state(state, events, visible=None):
    """The state as it may be serialised to this reader.

    Every response that carries a SakState goes through here — reads as well as
    the state returned after a submission — so the rule lives in one place
    instead of at each call site.
    """
    return redact_activity_metadata(state, events, visible).model_dump(mode="json")


def strip_activity_metadata(payload):
    """Drop the activity counters entirely.

    A relation view shows what a related case contains, not how active it is,
    and the events it carries are track-filtered — so there is no honest number
    to report. Dropping beats recomputing something the reader would misread.
    """
    payload.pop("antall_events", None)
    payload.pop("siste_aktivitet", None)
    return payload
