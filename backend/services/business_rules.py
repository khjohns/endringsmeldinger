"""
Business rule validation before event persistence.

All rules are validated BEFORE events are stored.
This ensures the event log never contains invalid state transitions.
"""

from collections.abc import Callable
from dataclasses import dataclass

from models.events import AnyEvent, EventType, ResponsEvent, SporStatus
from models.sak_state import EOStatus, SakState, SaksType

# Statuser uten noe sendt krav å trekke, eller med et krav som alt er oppgjort.
# Samme regel for alle tre sporene.
IKKE_TRUKKET_FRA: frozenset[SporStatus] = frozenset(
    {
        SporStatus.IKKE_RELEVANT,
        SporStatus.UTKAST,
        SporStatus.GODKJENT,
        SporStatus.TRUKKET,
        SporStatus.AVSLATT_AKSEPTERT,
    }
)


@dataclass
class ValidationResult:
    """Result of business rule validation."""

    is_valid: bool
    message: str | None = None
    violated_rule: str | None = None


class BusinessRuleValidator:
    """
    Validates business rules before allowing events to be persisted.

    Rules are implemented as pure functions that take (event, state)
    and return ValidationResult.
    """

    def validate(self, event: AnyEvent, current_state: SakState) -> ValidationResult:
        """
        Run all applicable rules for the given event type.
        Returns first violation found, or success if all pass.
        """
        rules = self._get_rules_for_event(event.event_type)

        varsler = getattr(getattr(event, "data", None), "varsler", None)
        if varsler and varsler.model_dump(exclude_none=True):
            if event.event_type == EventType.GRUNNLAG_OPPDATERT:
                return ValidationResult(
                    False,
                    "Nye varsler sendes fra vederlags- eller fristsporet.",
                    "NOTICE_TRACK",
                )
            # Category is TE's assessment, not a condition for sending a notice.
            # See docs/adr/001-varsling-og-kontraktsforhold.md.

        for rule_name, rule_fn in rules:
            result = rule_fn(event, current_state)
            if not result.is_valid:
                result.violated_rule = rule_name
                return result

        return ValidationResult(is_valid=True)

    def _get_rules_for_event(self, event_type: EventType) -> list[tuple[str, Callable]]:
        """Map event types to applicable rules."""

        # Rules that apply to all events
        common_rules = [
            ("ROLE_CHECK", self.validate_actor_role),
            ("CASE_NOT_CLOSED", self._rule_case_not_closed),
            ("CREATE_ONCE", self._rule_create_once),
            ("RESPONSE_REFERENCE", self._rule_response_reference),
        ]

        # Event-specific rules
        specific_rules = {
            # Vederlag/Frist requires Grunnlag to be sent
            EventType.VEDERLAG_KRAV_SENDT: [
                ("GRUNNLAG_REQUIRED", self._rule_grunnlag_required),
            ],
            EventType.VEDERLAG_KRAV_OPPDATERT: [
                ("GRUNNLAG_REQUIRED", self._rule_grunnlag_required),
                ("ACTIVE_CLAIM_EXISTS", self._rule_active_vederlag_exists),
            ],
            EventType.FRIST_KRAV_SENDT: [
                ("GRUNNLAG_REQUIRED", self._rule_grunnlag_required),
            ],
            EventType.FRIST_KRAV_OPPDATERT: [
                ("GRUNNLAG_REQUIRED", self._rule_grunnlag_required),
                ("ACTIVE_CLAIM_EXISTS", self._rule_active_frist_exists),
            ],
            EventType.FRIST_KRAV_SPESIFISERT: [
                ("GRUNNLAG_REQUIRED", self._rule_grunnlag_required),
                ("ACTIVE_CLAIM_EXISTS", self._rule_active_frist_exists),
            ],
            # BH responses require track to be sent and not already responded to current version
            EventType.RESPONS_GRUNNLAG: [
                ("TRACK_SENT", self._rule_grunnlag_sent),
                ("NOT_LOCKED", self._rule_grunnlag_not_locked),
                ("NOT_ALREADY_RESPONDED", self._rule_grunnlag_not_already_responded),
            ],
            EventType.RESPONS_VEDERLAG: [
                ("TRACK_SENT", self._rule_vederlag_sent),
                ("NOT_ALREADY_RESPONDED", self._rule_vederlag_not_already_responded),
            ],
            EventType.RESPONS_FRIST: [
                ("TRACK_SENT", self._rule_frist_sent),
                ("NOT_ALREADY_RESPONDED", self._rule_frist_not_already_responded),
            ],
            EventType.RESPONS_GRUNNLAG_OPPDATERT: [
                ("TRACK_SENT", self._rule_grunnlag_sent),
                ("NOT_LOCKED", self._rule_grunnlag_not_locked),
                ("PREVIOUS_RESPONSE", self._rule_previous_response),
            ],
            EventType.RESPONS_VEDERLAG_OPPDATERT: [
                ("TRACK_SENT", self._rule_vederlag_sent),
                ("PREVIOUS_RESPONSE", self._rule_previous_response),
            ],
            EventType.RESPONS_FRIST_OPPDATERT: [
                ("TRACK_SENT", self._rule_frist_sent),
                ("PREVIOUS_RESPONSE", self._rule_previous_response),
            ],
            # Cannot update locked grunnlag
            EventType.GRUNNLAG_OPPDATERT: [
                ("NOT_LOCKED", self._rule_grunnlag_not_locked),
            ],
            # TE Withdrawals - track must be active and not locked
            EventType.GRUNNLAG_TRUKKET: [
                ("TRACK_ACTIVE", self._rule_grunnlag_can_be_withdrawn),
            ],
            EventType.VEDERLAG_KRAV_TRUKKET: [
                ("TRACK_ACTIVE", self._rule_vederlag_can_be_withdrawn),
            ],
            EventType.FRIST_KRAV_TRUKKET: [
                ("TRACK_ACTIVE", self._rule_frist_can_be_withdrawn),
            ],
            # ========== TE AKSEPTERER RESPONS ==========
            EventType.TE_AKSEPTERER_RESPONS: [
                ("BH_HAS_RESPONDED", self._rule_bh_has_responded),
                ("NOT_ALREADY_ACCEPTED", self._rule_not_already_accepted),
            ],
            # ========== FORSERING RULES (§33.8) ==========
            # Varselet oppretter forseringssporet: det krever en forseringssak
            # og kan bare sendes én gang. CREATE_ONCE dekker ikke denne typen.
            EventType.FORSERING_VARSEL: [
                ("IS_FORSERING_CASE", self._rule_is_forsering_case),
                ("NOT_ALREADY_NOTIFIED", self._rule_forsering_not_already_notified),
            ],
            # De øvrige forsering-hendelsene forutsetter et varslet forseringskrav.
            EventType.FORSERING_RESPONS: [
                ("FORSERING_NOTIFIED", self._rule_forsering_notified),
            ],
            EventType.FORSERING_STOPPET: [
                ("FORSERING_NOTIFIED", self._rule_forsering_notified),
                ("NOT_ALREADY_STOPPED", self._rule_forsering_not_already_stopped),
            ],
            EventType.FORSERING_KOSTNADER_OPPDATERT: [
                ("FORSERING_NOTIFIED", self._rule_forsering_notified),
            ],
            # KOE-kobling krever en forseringssak, slik EO-motpartene krever en
            # EO-sak. Koblingen kan skje før varselet sendes, så den er ikke
            # betinget av FORSERING_NOTIFIED.
            EventType.FORSERING_KOE_LAGT_TIL: [
                ("IS_FORSERING_CASE", self._rule_is_forsering_case),
            ],
            EventType.FORSERING_KOE_FJERNET: [
                ("IS_FORSERING_CASE", self._rule_is_forsering_case),
            ],
            # ========== ENDRINGSORDRE RULES ==========
            # EO opprettelse - ingen spesifikke regler utover rolle-sjekk
            EventType.EO_OPPRETTET: [],
            # EO KOE-håndtering - må være i ENDRINGSORDRE-sak
            EventType.EO_KOE_LAGT_TIL: [
                ("IS_EO_CASE", self._rule_is_eo_case),
            ],
            EventType.EO_KOE_FJERNET: [
                ("IS_EO_CASE", self._rule_is_eo_case),
            ],
            # EO utstedelse - kan være fra KOE (alle godkjent) eller proaktiv (EO-sak)
            EventType.EO_UTSTEDT: [
                ("EO_CAN_BE_ISSUED", self._rule_eo_can_be_issued),
            ],
            # EO aksept/bestridelse - EO må være utstedt først
            EventType.EO_AKSEPTERT: [
                ("IS_EO_CASE", self._rule_is_eo_case),
                ("EO_IS_ISSUED", self._rule_eo_is_issued),
            ],
            EventType.EO_BESTRIDT: [
                ("IS_EO_CASE", self._rule_is_eo_case),
                ("EO_IS_ISSUED", self._rule_eo_is_issued),
            ],
            # EO revisjon - EO må være utstedt og bestridt
            EventType.EO_REVIDERT: [
                ("IS_EO_CASE", self._rule_is_eo_case),
                ("EO_IS_ISSUED", self._rule_eo_is_issued),
            ],
        }

        return common_rules + specific_rules.get(event_type, [])

    # ========== COMMON RULES ==========

    def validate_actor_role(
        self, event: AnyEvent, state: SakState | None = None
    ) -> ValidationResult:
        """R: Actor role must match allowed roles for event type."""
        te_only_events = {
            EventType.GRUNNLAG_OPPRETTET,
            EventType.GRUNNLAG_OPPDATERT,
            EventType.GRUNNLAG_TRUKKET,
            EventType.VEDERLAG_KRAV_SENDT,
            EventType.VEDERLAG_KRAV_OPPDATERT,
            EventType.VEDERLAG_KRAV_TRUKKET,
            EventType.FRIST_KRAV_SENDT,
            EventType.FRIST_KRAV_OPPDATERT,
            EventType.FRIST_KRAV_SPESIFISERT,
            EventType.FRIST_KRAV_TRUKKET,
            # EO TE-handlinger
            EventType.EO_AKSEPTERT,
            EventType.EO_BESTRIDT,
            # Forsering TE-handlinger
            EventType.FORSERING_KOE_LAGT_TIL,
            EventType.FORSERING_KOE_FJERNET,
            EventType.FORSERING_VARSEL,
            EventType.FORSERING_STOPPET,
            EventType.FORSERING_KOSTNADER_OPPDATERT,
            # TE aksepterer BH respons
            EventType.TE_AKSEPTERER_RESPONS,
        }

        bh_only_events = {
            EventType.RESPONS_GRUNNLAG,
            EventType.RESPONS_VEDERLAG,
            EventType.RESPONS_FRIST,
            EventType.RESPONS_GRUNNLAG_OPPDATERT,
            EventType.RESPONS_VEDERLAG_OPPDATERT,
            EventType.RESPONS_FRIST_OPPDATERT,
            EventType.FORSERING_RESPONS,
            # EO BH-handlinger
            EventType.EO_OPPRETTET,
            EventType.EO_KOE_LAGT_TIL,
            EventType.EO_KOE_FJERNET,
            EventType.EO_UTSTEDT,
            EventType.EO_REVIDERT,
        }

        if event.event_type in te_only_events and event.aktor_rolle != "TE":
            return ValidationResult(
                is_valid=False, message="Kun TE kan utføre denne handlingen"
            )

        if event.event_type in bh_only_events and event.aktor_rolle != "BH":
            return ValidationResult(
                is_valid=False, message="Kun BH kan utføre denne handlingen"
            )

        return ValidationResult(is_valid=True)

    def _rule_create_once(self, event, state):
        track = {
            EventType.GRUNNLAG_OPPRETTET: state.grunnlag,
            EventType.VEDERLAG_KRAV_SENDT: state.vederlag,
            EventType.FRIST_KRAV_SENDT: state.frist,
        }.get(event.event_type)
        # Independent consequence notices do not recreate an existing specified claim.
        notice = (
            event.event_type == EventType.VEDERLAG_KRAV_SENDT
            and event.data.varsel_type == "varsel"
        )
        if track is not None and track.krav_event_id and not notice:
            return ValidationResult(
                False, "Sporet er allerede opprettet. Send en revisjon."
            )
        if event.event_type == EventType.SAK_OPPRETTET and state.antall_events:
            return ValidationResult(False, "Saken er allerede opprettet.")
        if (
            event.event_type == EventType.EO_OPPRETTET
            and state.endringsordre_data is not None
        ):
            return ValidationResult(False, "Endringsordren er allerede opprettet.")
        return ValidationResult(True)

    def _rule_response_reference(self, event, state):
        if not isinstance(event, ResponsEvent):
            return ValidationResult(True)
        if (
            event.event_type.value.removeprefix("respons_").removesuffix("_oppdatert")
            != event.spor.value
        ):
            return ValidationResult(False, "Svartype og spor samsvarer ikke.")
        track = getattr(state, event.spor.value)
        field = {
            "grunnlag": "grunnlag_event_id",
            "vederlag": "vederlag_krav_id",
            "frist": "frist_krav_id",
        }[event.spor.value]
        references = [
            ref
            for ref in (event.refererer_til_event_id, getattr(event.data, field, None))
            if ref
        ]
        original = event.data.original_respons_id
        if original and (
            original != track.respons_event_id
            or track.bh_respondert_versjon != max(0, track.antall_versjoner - 1)
        ):
            return ValidationResult(
                False, "Svaret er endret eller gjelder et tidligere krav."
            )
        if references and any(ref != track.krav_event_id for ref in references):
            return ValidationResult(
                False, "Svaret må gjelde gjeldende krav i dette sporet."
            )
        if track.krav_event_id and not references and not original:
            return ValidationResult(False, "Referanse til kravet som besvares mangler.")
        return ValidationResult(True)

    def _rule_previous_response(self, event, state):
        track = getattr(state, event.spor.value)
        if not track.respons_event_id or track.bh_respondert_versjon != max(
            0, track.antall_versjoner - 1
        ):
            return ValidationResult(
                False, "Ingen tidligere respons på gjeldende krav å revidere."
            )
        return ValidationResult(True)

    def _rule_case_not_closed(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Cannot modify a closed case (except EO events which have own lifecycle)."""
        # EO events are allowed - they have their own lifecycle
        eo_events = {
            EventType.EO_OPPRETTET,
            EventType.EO_KOE_LAGT_TIL,
            EventType.EO_KOE_FJERNET,
            EventType.EO_UTSTEDT,
            EventType.EO_AKSEPTERT,
            EventType.EO_BESTRIDT,
            EventType.EO_REVIDERT,
        }
        if event.event_type in eo_events:
            return ValidationResult(is_valid=True)

        closed_statuses = {"OMFORENT", "LUKKET", "LUKKET_TRUKKET"}

        if state.overordnet_status in closed_statuses:
            # Allow only viewing, not modifications
            return ValidationResult(
                is_valid=False, message="Saken er lukket og kan ikke endres"
            )

        return ValidationResult(is_valid=True)

    # ========== GRUNNLAG RULES ==========

    def _rule_grunnlag_required(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Vederlag/Frist requires Grunnlag to be at least SENT."""
        invalid_statuses = {SporStatus.IKKE_RELEVANT, SporStatus.UTKAST}

        if state.grunnlag.status in invalid_statuses:
            return ValidationResult(
                is_valid=False, message="Grunnlag må være sendt før du kan sende krav"
            )

        return ValidationResult(is_valid=True)

    def _rule_grunnlag_sent(self, event: AnyEvent, state: SakState) -> ValidationResult:
        """R: Cannot respond to unsent grunnlag."""
        invalid_statuses = {SporStatus.IKKE_RELEVANT, SporStatus.UTKAST}

        if state.grunnlag.status in invalid_statuses:
            return ValidationResult(
                is_valid=False, message="Kan ikke besvare grunnlag som ikke er sendt"
            )

        return ValidationResult(is_valid=True)

    def _rule_grunnlag_not_locked(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Cannot modify locked grunnlag."""
        if state.grunnlag.laast or state.grunnlag.status == SporStatus.LAAST:
            return ValidationResult(
                is_valid=False, message="Grunnlag er låst og kan ikke endres"
            )

        return ValidationResult(is_valid=True)

    def _rule_grunnlag_not_already_responded(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Cannot respond if already responded to current version (use update instead)."""
        if state.grunnlag.bh_resultat is None:
            return ValidationResult(is_valid=True)

        # Check if BH has already responded to the current version
        current_version = max(0, state.grunnlag.antall_versjoner - 1)
        if state.grunnlag.bh_respondert_versjon == current_version:
            return ValidationResult(
                is_valid=False,
                message="Du har allerede svart på denne versjonen. Bruk 'Endre svar' for å oppdatere.",
            )

        return ValidationResult(is_valid=True)

    # ========== VEDERLAG RULES ==========

    def _rule_vederlag_sent(self, event: AnyEvent, state: SakState) -> ValidationResult:
        """R: Cannot respond to unsent vederlag."""
        if state.vederlag.varsler and not state.vederlag.metode:
            return ValidationResult(
                False,
                "Vederlaget er varslet, men det foreligger ikke et spesifisert krav å besvare.",
            )
        invalid_statuses = {SporStatus.IKKE_RELEVANT, SporStatus.UTKAST}

        if state.vederlag.status in invalid_statuses:
            return ValidationResult(
                is_valid=False, message="Kan ikke besvare vederlag som ikke er sendt"
            )

        return ValidationResult(is_valid=True)

    def _rule_active_vederlag_exists(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Can only update if there's an active vederlag claim."""
        # IKKE_RELEVANT = track not used, UTKAST = no claim submitted yet
        if state.vederlag.status in {SporStatus.IKKE_RELEVANT, SporStatus.UTKAST}:
            return ValidationResult(
                is_valid=False, message="Ingen aktivt vederlagskrav å oppdatere"
            )

        return ValidationResult(is_valid=True)

    def _rule_vederlag_not_already_responded(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Cannot respond if already responded to current version (use update instead)."""
        if state.vederlag.bh_resultat is None:
            return ValidationResult(is_valid=True)

        # Check if BH has already responded to the current version
        current_version = max(0, state.vederlag.antall_versjoner - 1)
        if state.vederlag.bh_respondert_versjon == current_version:
            return ValidationResult(
                is_valid=False,
                message="Du har allerede svart på denne versjonen. Bruk 'Endre svar' for å oppdatere.",
            )

        return ValidationResult(is_valid=True)

    # ========== FRIST RULES ==========

    def _rule_frist_sent(self, event: AnyEvent, state: SakState) -> ValidationResult:
        """R: Cannot respond to unsent frist."""
        invalid_statuses = {SporStatus.IKKE_RELEVANT, SporStatus.UTKAST}

        if state.frist.status in invalid_statuses:
            return ValidationResult(
                is_valid=False, message="Kan ikke besvare frist som ikke er sendt"
            )

        return ValidationResult(is_valid=True)

    def _rule_active_frist_exists(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Can only update if there's an active frist claim."""
        # IKKE_RELEVANT = track not used, UTKAST = no claim submitted yet
        if state.frist.status in {SporStatus.IKKE_RELEVANT, SporStatus.UTKAST}:
            return ValidationResult(
                is_valid=False, message="Ingen aktivt fristkrav å oppdatere"
            )

        return ValidationResult(is_valid=True)

    def _rule_frist_not_already_responded(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Cannot respond if already responded to current version (use update instead)."""
        if state.frist.bh_resultat is None:
            return ValidationResult(is_valid=True)

        # Check if BH has already responded to the current version
        current_version = max(0, state.frist.antall_versjoner - 1)
        if state.frist.bh_respondert_versjon == current_version:
            return ValidationResult(
                is_valid=False,
                message="Du har allerede svart på denne versjonen. Bruk 'Endre svar' for å oppdatere.",
            )

        return ValidationResult(is_valid=True)

    # ========== EO RULES ==========

    # ========== FORSERING RULES (§33.8) ==========

    def _rule_is_forsering_case(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Handlingen krever en forseringssak.

        TimelineService ignorerer forsering-hendelser når `forsering_data`
        mangler. Uten denne regelen ville varselet bli lagret som en hendelse
        uten virkning — en stille nullhendelse i en juridisk logg.
        """
        if state.sakstype != SaksType.FORSERING or state.forsering_data is None:
            return ValidationResult(
                is_valid=False, message="Denne handlingen krever en forseringssak"
            )
        return ValidationResult(is_valid=True)

    def _rule_forsering_not_already_notified(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Forseringen kan bare varsles én gang; senere endringer er revisjoner."""
        if state.forsering_data is not None and state.forsering_data.dato_varslet:
            return ValidationResult(
                is_valid=False, message="Forseringen er allerede varslet."
            )
        return ValidationResult(is_valid=True)

    def _rule_forsering_notified(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Respons, stopp og kostnadsoppdatering forutsetter et varslet krav."""
        if state.forsering_data is None or not state.forsering_data.dato_varslet:
            return ValidationResult(
                is_valid=False, message="Forseringen er ikke varslet."
            )
        return ValidationResult(is_valid=True)

    def _rule_forsering_not_already_stopped(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: En stoppet forsering kan ikke stoppes på nytt.

        Dobbelt stopp gir to sett påløpte kostnader og to stoppdatoer i samme sak.
        """
        if state.forsering_data is not None and state.forsering_data.er_stoppet:
            return ValidationResult(
                is_valid=False, message="Forseringen er allerede stoppet."
            )
        return ValidationResult(is_valid=True)

    def _rule_is_eo_case(self, event: AnyEvent, state: SakState) -> ValidationResult:
        """R: Event requires an ENDRINGSORDRE case type."""
        if state.sakstype != SaksType.ENDRINGSORDRE:
            return ValidationResult(
                is_valid=False, message="Denne handlingen krever en endringsordre-sak"
            )

        return ValidationResult(is_valid=True)

    def _rule_eo_can_be_issued(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """
        R: EO can be issued if:
        - From a STANDARD case: All active tracks must be approved (kan_utstede_eo)
        - From an ENDRINGSORDRE case: Always allowed (proactive EO)
        """
        # Proaktiv EO fra EO-sak - alltid tillatt
        if state.sakstype == SaksType.ENDRINGSORDRE:
            return ValidationResult(is_valid=True)

        # Reaktiv EO fra KOE-sak - alle spor må være godkjent
        if state.sakstype == SaksType.STANDARD:
            if not state.kan_utstede_eo:
                return ValidationResult(
                    is_valid=False,
                    message="Alle aktive spor må være godkjent før EO kan utstedes",
                )
            return ValidationResult(is_valid=True)

        # Andre sakstyper (f.eks. FORSERING) - ikke tillatt
        return ValidationResult(
            is_valid=False, message="EO kan ikke utstedes fra denne sakstypen"
        )

    def _rule_eo_is_issued(self, event: AnyEvent, state: SakState) -> ValidationResult:
        """R: EO must be issued before it can be accepted/disputed/revised."""
        if state.endringsordre_data is None:
            return ValidationResult(
                is_valid=False, message="Endringsordre-data mangler"
            )

        if state.endringsordre_data.status not in {
            EOStatus.UTSTEDT,
            EOStatus.BESTRIDT,
            EOStatus.REVIDERT,
        }:
            return ValidationResult(
                is_valid=False,
                message="Endringsordren må være utstedt før den kan aksepteres/bestrides",
            )

        return ValidationResult(is_valid=True)

    # ========== WITHDRAWAL RULES ==========

    def _rule_grunnlag_can_be_withdrawn(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Grunnlag kan trekkes tilbake i alle tilfeller unntatt godkjent, låst, eller ikke sendt."""
        if state.grunnlag.laast or state.grunnlag.status == SporStatus.LAAST:
            return ValidationResult(
                is_valid=False, message="Grunnlag er låst og kan ikke trekkes tilbake"
            )

        if state.grunnlag.status in IKKE_TRUKKET_FRA:
            return ValidationResult(
                is_valid=False,
                message=(
                    "Grunnlag kan ikke trekkes tilbake når status er "
                    "godkjent, ikke sendt, allerede trukket eller oppgjort "
                    "ved godtatt avslag"
                ),
            )

        return ValidationResult(is_valid=True)

    def _rule_vederlag_can_be_withdrawn(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Vederlag kan trekkes tilbake i alle tilfeller unntatt godkjent eller ikke sendt."""
        if state.vederlag.status in IKKE_TRUKKET_FRA:
            return ValidationResult(
                is_valid=False,
                message=(
                    "Vederlagskrav kan ikke trekkes tilbake når status er "
                    "godkjent, ikke sendt, allerede trukket eller oppgjort "
                    "ved godtatt avslag"
                ),
            )

        return ValidationResult(is_valid=True)

    def _rule_frist_can_be_withdrawn(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Frist kan trekkes tilbake i alle tilfeller unntatt godkjent eller ikke sendt."""
        if state.frist.status in IKKE_TRUKKET_FRA:
            return ValidationResult(
                is_valid=False,
                message=(
                    "Fristkrav kan ikke trekkes tilbake når status er "
                    "godkjent, ikke sendt, allerede trukket eller oppgjort "
                    "ved godtatt avslag"
                ),
            )

        return ValidationResult(is_valid=True)

    # ========== TE AKSEPTERER RESPONS RULES ==========

    def _rule_bh_has_responded(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: BH must have responded on the track before TE can accept."""
        from models.events import SporType

        spor = getattr(event, "spor", None)
        if spor == SporType.GRUNNLAG:
            if state.grunnlag.bh_resultat is None:
                return ValidationResult(
                    is_valid=False,
                    message="Byggherre har ikke svart på grunnlag ennå",
                )
        elif spor == SporType.VEDERLAG:
            if state.vederlag.bh_resultat is None:
                return ValidationResult(
                    is_valid=False,
                    message="Byggherre har ikke svart på vederlag ennå",
                )
        elif spor == SporType.FRIST:
            if state.frist.bh_resultat is None:
                return ValidationResult(
                    is_valid=False,
                    message="Byggherre har ikke svart på frist ennå",
                )

        return ValidationResult(is_valid=True)

    def _rule_not_already_accepted(
        self, event: AnyEvent, state: SakState
    ) -> ValidationResult:
        """R: Cannot accept if already accepted or track is settled."""
        from models.events import SporType

        spor = getattr(event, "spor", None)
        if spor == SporType.GRUNNLAG:
            if state.grunnlag.te_akseptert:
                return ValidationResult(
                    is_valid=False,
                    message="Entreprenør har allerede akseptert svaret på grunnlag",
                )
            if state.grunnlag.status in {
                SporStatus.GODKJENT,
                SporStatus.LAAST,
                SporStatus.TRUKKET,
            }:
                return ValidationResult(
                    is_valid=False,
                    message="Grunnlag er allerede avsluttet",
                )
        elif spor == SporType.VEDERLAG:
            if state.vederlag.te_akseptert:
                return ValidationResult(
                    is_valid=False,
                    message="Entreprenør har allerede akseptert svaret på vederlag",
                )
            if state.vederlag.status in {SporStatus.GODKJENT, SporStatus.TRUKKET}:
                return ValidationResult(
                    is_valid=False,
                    message="Vederlag er allerede avsluttet",
                )
        elif spor == SporType.FRIST:
            if state.frist.te_akseptert:
                return ValidationResult(
                    is_valid=False,
                    message="Entreprenør har allerede akseptert svaret på frist",
                )
            if state.frist.status in {SporStatus.GODKJENT, SporStatus.TRUKKET}:
                return ValidationResult(
                    is_valid=False,
                    message="Frist er allerede avsluttet",
                )

        return ValidationResult(is_valid=True)
