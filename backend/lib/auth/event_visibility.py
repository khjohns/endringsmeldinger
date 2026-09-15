"""Lesetilgang til interne notater.

`internt_notat` er dokumentert som «kun synlig for egen organisasjon»
(models/events.py). Hendelsen lagres i sakens felles hendelsesstrøm, som begge
kontraktsparter leser fra. Filteret her er derfor det eneste som skiller
partene på lesesiden, og det må brukes på alle punkter som returnerer
hendelser til en klient.

Regelen er fail-closed: kan ikke leserens TE/BH-tilknytning bekreftes, skjules
notatet. Det gjelder også når autentisering er slått av lokalt
(`DISABLE_AUTH`), fordi det da ikke finnes noen partsskille å bygge på.
"""

from flask import g

from models.events import EventType

CONTRACT_ROLES = frozenset({"TE", "BH"})


def reader_contract_role() -> str | None:
    """Leserens TE/BH-tilknytning, eller None når den ikke kan bekreftes.

    Rollen slås ikke opp på nytt dersom en rutedekoratør allerede har satt den.
    Feil mot medlemsoppslaget gir None, ikke unntak: lesing av saken skal ikke
    bryte fordi partstilknytningen er utilgjengelig — notatene skjules i stedet.
    """
    role = getattr(g, "contract_role", None)
    if role in CONTRACT_ROLES:
        return role

    project_id = getattr(g, "project_id", None)
    user = getattr(g, "user", None)
    if not project_id or not user or not user.get("id"):
        return None

    from lib.auth.session import get_auth_service

    try:
        role = get_auth_service().contract_role(project_id, user["id"])
    except Exception:
        return None
    return role if role in CONTRACT_ROLES else None


def is_internal_note(event: object) -> bool:
    """Om hendelsen er et internt notat, uavhengig av om typen er enum eller str."""
    event_type = getattr(event, "event_type", None)
    value = getattr(event_type, "value", event_type)
    return value == EventType.INTERNT_NOTAT.value


def visible_events(events: list) -> list:
    """Fjern interne notater som tilhører motparten.

    Notatet skjules i sin helhet, ikke bare teksten: at en part har gjort en
    intern vurdering er i seg selv opplysning motparten ikke skal ha.
    """
    if not any(is_internal_note(event) for event in events):
        return events

    role = reader_contract_role()
    return [
        event
        for event in events
        if not is_internal_note(event)
        or (role is not None and getattr(event, "aktor_rolle", None) == role)
    ]
