"""Lesetilgang til interne notater.

`internt_notat` er dokumentert som «kun synlig for egen organisasjon»
(models/events.py). Hendelsen lagres i sakens felles hendelsesstrøm, som begge
kontraktsparter leser fra. Filteret her er derfor det eneste som skiller
organisasjonene på lesesiden, og det må brukes på alle punkter som returnerer
hendelser til en klient.

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

    Notater uten `aktor_team_id` — skrevet før organisasjonen ble registrert på
    hendelsen — skjules for alle, også for forfatteren. Det er et bevisst valg:
    et notat der vi ikke vet hvem som eier det, kan ikke vises til noen.
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
