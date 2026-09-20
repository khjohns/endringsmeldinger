"""
EndringsordreService - Håndterer endringsordresaker (§31.3).

Endringsordre (EO) er det formelle dokumentet som bekrefter en endring i kontrakten.
En EO kan samle flere KOE-er (Krav om Endringsordre).

Denne servicen håndterer opprettelse og håndtering av endringsordresaker som egne saker
med relasjoner til de KOE-sakene som inngår i endringsordren.
"""

import math
import os
import re
from copy import copy
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

from lib.helpers import get_all_sak_ids
from lib.project_context import get_project_id
from models.events import (
    AnyEvent,
    EOKoeHandlingData,
    EOKoeHandlingEvent,
    EOKonsekvenser,  # Import from events, not sak_state, for EOUtstedtData compatibility
    EOOpprettetData,
    EOOpprettetEvent,
    EOUtstedtData,
    EOUtstedtEvent,
    EventType,
    SakOpprettetEvent,
    VederlagKompensasjon,
    VederlagsMetode,
    parse_event,
)
from models.sak_metadata import SakMetadata
from models.sak_state import (
    EOStatus,
    SakRelasjon,
    SakState,
    SaksType,
    SporStatus,
)
from services.base_sak_service import BaseSakService
from utils.logger import get_logger

logger = get_logger(__name__)


# Check if relation repository is available (Supabase backend)
def _get_relation_repository():
    """Get relation repository if available."""
    backend = os.environ.get("EVENT_STORE_BACKEND", "json")
    if backend == "supabase":
        try:
            from repositories import create_relation_repository

            return create_relation_repository()
        except Exception as e:
            logger.debug(f"RelationRepository not available: {e}")
    return None


def new_eo_sak_id(now: datetime | None = None) -> str:
    """Local case ID for a change order; reserved up front by internal approval."""
    now = now or datetime.now(UTC)
    return f"EO-{now.strftime('%Y%m%d')}-{uuid4().hex[:12]}"


class EndringsordreService(BaseSakService):
    """
    Service for å håndtere endringsordresaker (§31.3).

    Endringsordresaker opprettes som egne Catenda topics med relasjoner
    til de KOE-sakene som inngår i endringsordren.
    """

    def __init__(
        self,
        catenda_client: Any | None = None,
        event_repository: Any | None = None,
        timeline_service: Any | None = None,
        metadata_repository: Any | None = None,
        relation_repository: Any | None = None,
    ):
        """
        Initialiser EndringsordreService.

        Args:
            catenda_client: CatendaClient instance (eller mock)
            event_repository: EventRepository for å hente events fra saker
            timeline_service: TimelineService for å beregne SakState
            metadata_repository: SakMetadataRepository for å mappe topic GUID til sak_id
            relation_repository: RelationRepository for O(1) relasjonsoppslag (optional)
        """
        super().__init__(
            catenda_client=catenda_client,
            event_repository=event_repository,
            timeline_service=timeline_service,
        )
        self.metadata_repository = metadata_repository
        self.relation_repository = relation_repository or _get_relation_repository()
        self._log_init_warnings("EndringsordreService")

    def _project_case_ids(self) -> list[str]:
        """Use local, project-scoped metadata as the source of case membership."""
        if self.metadata_repository:
            return [
                metadata.sak_id
                for metadata in self.metadata_repository.list_all(
                    prosjekt_id=get_project_id()
                )
                if metadata.prosjekt_id == get_project_id()
            ]
        return get_all_sak_ids(event_repository=self.event_repository)

    def _belongs_to_project(self, sak_id: str) -> bool:
        if not self.metadata_repository:
            return True
        prosjekt = get_project_id()
        if not prosjekt:
            return False
        metadata = self.metadata_repository.get(sak_id)
        return bool(metadata and metadata.prosjekt_id == prosjekt)

    def _load_state(self, sak_id: str) -> SakState | None:
        if not self._belongs_to_project(sak_id):
            raise ValueError("Saken finnes ikke i prosjektet")
        if not self.event_repository or not self.timeline_service:
            return None
        events, _ = self.event_repository.get_events(sak_id)
        if not events:
            return None
        return self.timeline_service.compute_state([parse_event(e) for e in events])

    def _project_states(self) -> dict[str, SakState]:
        states = {}
        for sak_id in self._project_case_ids():
            state = self._load_state(sak_id)
            if state is not None:
                states[sak_id] = state
        return states

    @staticmethod
    def _is_agreed_koe(state: SakState) -> bool:
        agreed = {SporStatus.GODKJENT, SporStatus.LAAST}
        return (
            state.sakstype == SaksType.STANDARD
            and state.kan_utstede_eo
            and any(spor.status in agreed for spor in (state.vederlag, state.frist))
        )

    @staticmethod
    def _linked_koe_ids(states: dict[str, SakState]) -> set[str]:
        return {
            koe_id
            for state in states.values()
            if state.sakstype == SaksType.ENDRINGSORDRE and state.endringsordre_data
            for koe_id in state.endringsordre_data.relaterte_koe_saker
        }

    def hent_neste_eo_nummer(self) -> dict[str, Any]:
        orders = [
            state.endringsordre_data
            for state in self._project_states().values()
            if state.sakstype == SaksType.ENDRINGSORDRE and state.endringsordre_data
        ]
        numbers = [
            int(match.group(1))
            for order in orders
            if (match := re.fullmatch(r"EO-(\d+)", order.eo_nummer, re.IGNORECASE))
        ]
        return {
            "neste_nummer": f"EO-{max(numbers, default=0) + 1:03d}",
            "antall_eksisterende": len(orders),
        }

    def _sync_to_catenda(
        self, sak_id: str, eo_nummer: str, beskrivelse: str, koe_ids: list[str]
    ) -> tuple[str, str | None]:
        """Sync only where the existing outbound board mapping is unambiguous."""
        from core.config import settings

        if not settings.is_catenda_enabled or self.client is None:
            return "disabled", None
        if (
            get_project_id() != "oslobygg"
            or settings.catenda_project_registry_backend != "legacy"
            or not settings.catenda_project_id
            or not settings.catenda_topic_board_id
            or not self.metadata_repository
        ):
            return "not_configured", None

        # Other services mutate the shared client's selected board. Use an
        # isolated copy bound to this verified legacy project configuration.
        client = copy(self.client)
        client.topic_board_id = settings.catenda_topic_board_id
        topic_id = None
        try:
            related_guids = []
            for koe_id in koe_ids:
                metadata = self.metadata_repository.get(koe_id)
                if (
                    not metadata
                    or metadata.prosjekt_id != get_project_id()
                    or metadata.catenda_project_id != settings.catenda_project_id
                    or metadata.catenda_board_id != settings.catenda_topic_board_id
                    or not metadata.catenda_topic_id
                ):
                    return "not_configured", None
                related_guids.append(metadata.catenda_topic_id)
            topic = client.create_topic(
                title=f"Endringsordre {eo_nummer}",
                description=beskrivelse,
                topic_type="Endringsordre",
                topic_status="Open",
            )
            if not topic or not topic.get("guid"):
                return "failed", None
            topic_id = topic["guid"]
            # Persist the topic immediately, even if a later relation fails.
            self.metadata_repository.set_catenda_mapping(
                sak_id=sak_id,
                prosjekt_id=get_project_id(),
                topic_id=topic_id,
                board_id=settings.catenda_topic_board_id,
                catenda_project_id=settings.catenda_project_id,
            )
            if related_guids:
                if not client.create_topic_relations(
                    topic_id=topic_id, related_topic_guids=related_guids
                ):
                    return "failed", topic_id
                for related_guid in related_guids:
                    if not client.create_topic_relations(
                        topic_id=related_guid, related_topic_guids=[topic_id]
                    ):
                        return "failed", topic_id
            return "synced", topic_id
        except Exception:
            logger.exception("Catenda-synk feilet for endringsordre %s", sak_id)
            return "failed", topic_id

    def opprett_endringsordresak(
        self,
        eo_nummer: str,
        beskrivelse: str,
        koe_sak_ids: list[str],
        konsekvenser: dict[str, bool] | None = None,
        konsekvens_beskrivelse: str | None = None,
        oppgjorsform: str | None = None,
        kompensasjon_belop: float | None = None,
        fradrag_belop: float | None = None,
        er_estimat: bool = False,
        frist_dager: int | None = None,
        ny_sluttdato: str | None = None,
        utstedt_av: str | None = None,
        sak_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Oppretter en ny endringsordresak med relasjoner til KOE-saker.

        Local-first: Lagrer events lokalt først, synker til Catenda etterpå.

        Args:
            eo_nummer: Endringsordre-nummer (prosjektets nummerering)
            beskrivelse: Beskrivelse av hva endringen går ut på (§31.3)
            koe_sak_ids: Liste med sak-IDs til KOE-er som inngår
            konsekvenser: Dict med konsekvens-flagg (sha, kvalitet, fremdrift, pris, annet)
            konsekvens_beskrivelse: Beskrivelse av konsekvensene
            oppgjorsform: Oppgjørsform ved priskonsekvens (ENHETSPRISER, REGNINGSARBEID, FASTPRIS_TILBUD)
            kompensasjon_belop: Kompensasjonsbeløp (positivt = tillegg)
            fradrag_belop: Fradragsbeløp
            er_estimat: Om beløpet er et estimat
            frist_dager: Antall dager fristforlengelse
            ny_sluttdato: Ny sluttdato (YYYY-MM-DD)
            utstedt_av: Navn på person som utsteder EO (BH-representant)
            sak_id: Reservert sak-ID. Intern godkjenning lagrer den før utstedelse, slik at
                et nytt forsøk etter krasj gjenkjenner en allerede opprettet ordre.

        Returns:
            Dict med den opprettede endringsordresaken inkludert catenda_synced status

        Raises:
            ValueError: Hvis påkrevde felt mangler
            RuntimeError: Hvis lagring av events feiler
        """
        if not isinstance(eo_nummer, str) or not eo_nummer.strip():
            raise ValueError("EO-nummer er påkrevd")
        if not isinstance(beskrivelse, str) or not beskrivelse.strip():
            raise ValueError("Beskrivelse er påkrevd")
        eo_nummer = eo_nummer.strip()
        beskrivelse = beskrivelse.strip()
        if not isinstance(koe_sak_ids, list) or any(
            not isinstance(sak_id, str) or not sak_id.strip() for sak_id in koe_sak_ids
        ):
            raise ValueError("KOE-saker må være en liste med saks-IDer")
        if len(koe_sak_ids) != len(set(koe_sak_ids)):
            raise ValueError("En KOE-sak kan bare inngå én gang")
        if konsekvenser is not None and (
            not isinstance(konsekvenser, dict)
            or any(not isinstance(value, bool) for value in konsekvenser.values())
            or set(konsekvenser) - {"sha", "kvalitet", "fremdrift", "pris", "annet"}
        ):
            raise ValueError("Ugyldige konsekvenser")
        for name, value in (
            ("Kompensasjonsbeløp", kompensasjon_belop),
            ("Fradragsbeløp", fradrag_belop),
        ):
            if value is not None and (
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or not math.isfinite(value)
                or value < 0
            ):
                raise ValueError(f"{name} må være et endelig, ikke-negativt tall")
        if not isinstance(er_estimat, bool):
            raise ValueError("Estimat må være true eller false")
        if frist_dager is not None and (
            isinstance(frist_dager, bool)
            or not isinstance(frist_dager, int)
            or frist_dager < 0
        ):
            raise ValueError("Fristforlengelse må være et helt antall dager fra null")
        if ny_sluttdato is not None:
            if not isinstance(ny_sluttdato, str) or not re.fullmatch(
                r"\d{4}-\d{2}-\d{2}", ny_sluttdato
            ):
                raise ValueError("Ny sluttdato må være en dato på formatet YYYY-MM-DD")
            try:
                date.fromisoformat(ny_sluttdato)
            except ValueError:
                raise ValueError("Ny sluttdato er ikke en gyldig dato")
        if oppgjorsform is not None and oppgjorsform not in {
            m.value for m in VederlagsMetode
        }:
            raise ValueError("Ugyldig oppgjørsform")
        if oppgjorsform is None and any(
            value is not None for value in (kompensasjon_belop, fradrag_belop)
        ):
            raise ValueError("Oppgjørsform er påkrevd når beløp er angitt")

        # Validate the complete selection before creating metadata, events or topics.
        states = self._project_states()
        if any(
            state.endringsordre_data
            and state.endringsordre_data.eo_nummer.casefold() == eo_nummer.casefold()
            for state in states.values()
        ):
            raise ValueError("EO-nummeret er allerede i bruk i prosjektet")
        linked = self._linked_koe_ids(states)
        for koe_id in koe_sak_ids:
            state = states.get(koe_id)
            if state is None or not self._is_agreed_koe(state):
                raise ValueError(
                    "Alle valgte KOE-saker må være omforente krav i prosjektet"
                )
            if koe_id in linked:
                raise ValueError("En valgt KOE-sak inngår allerede i en endringsordre")
        if koe_sak_ids:
            agreed = {SporStatus.GODKJENT, SporStatus.LAAST}
            selected = [states[koe_id] for koe_id in koe_sak_ids]
            if er_estimat:
                raise ValueError(
                    "Enighet om KOE-krav kan ikke formaliseres som et estimat"
                )
            if (
                any(state.vederlag.status in agreed for state in selected)
                and kompensasjon_belop is None
            ):
                raise ValueError(
                    "Avtalt beløp er påkrevd ved formalisering av vederlagskrav"
                )
            expected_amount = sum(
                (Decimal(str(state.sum_godkjent)) for state in selected), Decimal(0)
            ).quantize(Decimal("0.01"))
            actual_amount = (
                Decimal(str(kompensasjon_belop or 0)) - Decimal(str(fradrag_belop or 0))
            ).quantize(Decimal("0.01"))
            if actual_amount != expected_amount:
                raise ValueError(
                    "Beløpet må samsvare med gjeldende enighet i de valgte KOE-sakene"
                )
            if (
                any(state.frist.status in agreed for state in selected)
                and frist_dager is None
                and ny_sluttdato is None
            ):
                raise ValueError(
                    "Avtalt frist er påkrevd ved formalisering av fristkrav"
                )

        now = datetime.now(UTC)
        dato_utstedt = now.strftime("%Y-%m-%d")

        # 1. Generer lokal sak-ID (eller bruk den reserverte)
        if sak_id:
            if self.event_repository.get_events(sak_id)[1] > 0:
                raise ValueError("Endringsordren er allerede utstedt")
            # Metadata without events is left by an interrupted creation under this ID.
            if self.metadata_repository.get(sak_id) is not None:
                self.metadata_repository.delete(sak_id)
        sak_id = sak_id or new_eo_sak_id(now)

        logger.info(
            f"Oppretter endringsordresak {sak_id} (EO-{eo_nummer}) "
            f"med {len(koe_sak_ids)} relaterte KOE-er"
        )

        # 2. Bygg konsekvenser
        eo_konsekvenser = EOKonsekvenser(
            sha=konsekvenser.get("sha", False) if konsekvenser else False,
            kvalitet=konsekvenser.get("kvalitet", False) if konsekvenser else False,
            fremdrift=konsekvenser.get("fremdrift", False) if konsekvenser else False,
            pris=konsekvenser.get("pris", False) if konsekvenser else False,
            annet=konsekvenser.get("annet", False) if konsekvenser else False,
        )

        # Beregn netto beløp
        komp = kompensasjon_belop or 0.0
        frad = fradrag_belop or 0.0
        netto = komp - frad

        # 3. Opprett metadata (vil lagres atomisk med events via UoW)
        metadata = SakMetadata(
            sak_id=sak_id,
            prosjekt_id=get_project_id(),
            created_at=now,
            created_by=utstedt_av or "BH",
            sakstype="endringsordre",
            cached_title=f"Endringsordre {eo_nummer}",
            cached_status="utstedt",
            last_event_at=now,
        )

        # 4. Opprett events lokalt
        events = []

        # SAK_OPPRETTET
        sak_event = SakOpprettetEvent(
            event_id=str(uuid4()),
            sak_id=sak_id,
            event_type=EventType.SAK_OPPRETTET,
            tidsstempel=now,
            aktor=utstedt_av or "BH",
            aktor_rolle="BH",
            sakstittel=f"Endringsordre {eo_nummer}",
            sakstype="endringsordre",
        )
        events.append(sak_event)

        # EO_OPPRETTET
        eo_opprettet = EOOpprettetEvent(
            event_id=str(uuid4()),
            sak_id=sak_id,
            event_type=EventType.EO_OPPRETTET,
            tidsstempel=now,
            aktor=utstedt_av or "BH",
            aktor_rolle="BH",
            data=EOOpprettetData(
                eo_nummer=eo_nummer,
                beskrivelse=beskrivelse,
                relaterte_koe_saker=koe_sak_ids,
                sakstittel=f"Endringsordre {eo_nummer}",
            ),
        )
        events.append(eo_opprettet)

        # EO_UTSTEDT (hvis utstedt_av er satt, eller alltid for nå)
        vederlag = None
        if oppgjorsform:
            vederlag = VederlagKompensasjon(
                metode=VederlagsMetode(oppgjorsform),
                belop_direkte=kompensasjon_belop
                if oppgjorsform != "REGNINGSARBEID"
                else None,
                kostnads_overslag=kompensasjon_belop
                if oppgjorsform == "REGNINGSARBEID"
                else None,
                fradrag_belop=fradrag_belop,
                er_estimat=er_estimat,
            )

        eo_utstedt = EOUtstedtEvent(
            event_id=str(uuid4()),
            sak_id=sak_id,
            event_type=EventType.EO_UTSTEDT,
            tidsstempel=now,
            aktor=utstedt_av or "BH",
            aktor_rolle="BH",
            data=EOUtstedtData(
                eo_nummer=eo_nummer,
                revisjon_nummer=0,
                beskrivelse=beskrivelse,
                konsekvenser=eo_konsekvenser,
                konsekvens_beskrivelse=konsekvens_beskrivelse,
                vederlag=vederlag,
                frist_dager=frist_dager,
                ny_sluttdato=ny_sluttdato,
                relaterte_koe_saker=koe_sak_ids,
            ),
        )
        events.append(eo_utstedt)

        # 5. Lagre metadata + events atomisk via SakCreationService
        from services.sak_creation_service import get_sak_creation_service

        creation_service = get_sak_creation_service()
        result = creation_service.create_sak_with_metadata(
            metadata=metadata, events=events
        )

        if not result.success:
            raise RuntimeError(f"Kunne ikke opprette endringsordre: {result.error}")

        # 5b. Add relations to projection table for O(1) lookups
        if self.relation_repository and koe_sak_ids:
            try:
                self.relation_repository.add_relations_batch(
                    source_sak_id=sak_id,
                    target_sak_ids=koe_sak_ids,
                    relation_type="endringsordre",
                )
            except Exception as e:
                logger.warning(f"Could not add relations to projection table: {e}")

        catenda_sync_status, catenda_topic_id = self._sync_to_catenda(
            sak_id, eo_nummer, beskrivelse, koe_sak_ids
        )
        catenda_synced = catenda_sync_status == "synced"

        return {
            "sak_id": sak_id,
            "sakstype": SaksType.ENDRINGSORDRE.value,
            "catenda_synced": catenda_synced,
            "catenda_sync_status": catenda_sync_status,
            "catenda_topic_id": catenda_topic_id,
            "relaterte_saker": [{"relatert_sak_id": id} for id in koe_sak_ids],
            "endringsordre_data": {
                "relaterte_koe_saker": koe_sak_ids,
                "eo_nummer": eo_nummer,
                "revisjon_nummer": 0,
                "beskrivelse": beskrivelse,
                "vedlegg_ids": [],
                "konsekvenser": eo_konsekvenser.model_dump(),
                "konsekvens_beskrivelse": konsekvens_beskrivelse,
                "oppgjorsform": oppgjorsform,
                "kompensasjon_belop": kompensasjon_belop,
                "fradrag_belop": fradrag_belop,
                "er_estimat": er_estimat,
                "frist_dager": frist_dager,
                "ny_sluttdato": ny_sluttdato,
                "status": EOStatus.UTSTEDT.value,
                "dato_utstedt": dato_utstedt,
                "utstedt_av": utstedt_av,
                "te_akseptert": None,
                "te_kommentar": None,
                "dato_te_respons": None,
                "netto_belop": netto,
                "har_priskonsekvens": eo_konsekvenser.pris or netto != 0,
                "har_fristkonsekvens": eo_konsekvenser.fremdrift
                or (frist_dager is not None and frist_dager > 0),
            },
        }

    def legg_til_koe(
        self, eo_sak_id: str, koe_sak_id: str, aktor: str = "BH"
    ) -> dict[str, Any]:
        """
        Legger til en KOE-sak til endringsordren.

        Local-first: Lagrer event lokalt først, synker til Catenda etterpå.

        Args:
            eo_sak_id: Endringsordresakens ID
            koe_sak_id: KOE-sakens ID som skal legges til
            aktor: Hvem som utfører handlingen

        Returns:
            Dict med success og catenda_synced status
        """
        state = self._load_state(eo_sak_id)
        if state is None or state.endringsordre_data is None:
            raise ValueError("Endringsordren finnes ikke")
        if state.endringsordre_data.status != EOStatus.UTKAST:
            raise ValueError("En utstedt endringsordre kan ikke endres")
        candidates = {
            candidate["sak_id"] for candidate in self.hent_kandidat_koe_saker()
        }
        if koe_sak_id not in candidates:
            raise ValueError("KOE-saken kan ikke legges til i endringsordren")

        # 1. Opprett og lagre event lokalt FØRST
        event = EOKoeHandlingEvent(
            event_id=str(uuid4()),
            sak_id=eo_sak_id,
            event_type=EventType.EO_KOE_LAGT_TIL,
            tidsstempel=datetime.now(UTC),
            aktor=aktor,
            aktor_rolle="BH",
            data=EOKoeHandlingData(
                koe_sak_id=koe_sak_id,
            ),
        )

        if self.event_repository:
            try:
                # Hent nåværende versjon
                _, current_version = self.event_repository.get_events(eo_sak_id)
                self.event_repository.append(event, expected_version=current_version)
                logger.info(f"✅ Event EO_KOE_LAGT_TIL lagret lokalt for {eo_sak_id}")
            except Exception as e:
                logger.error(f"Feil ved lagring av event: {e}")
                raise RuntimeError(f"Kunne ikke lagre event: {e}")

        # 1b. Add relation to projection table
        if self.relation_repository:
            try:
                self.relation_repository.add_relation(
                    source_sak_id=eo_sak_id,
                    target_sak_id=koe_sak_id,
                    relation_type="endringsordre",
                )
            except Exception as e:
                logger.warning(f"Could not add relation to projection table: {e}")

        # 2. Prøv å synke til Catenda (valgfritt)
        catenda_synced = False
        if self.client:
            try:
                self.client.create_topic_relations(
                    topic_id=eo_sak_id, related_topic_guids=[koe_sak_id]
                )
                self.client.create_topic_relations(
                    topic_id=koe_sak_id, related_topic_guids=[eo_sak_id]
                )
                catenda_synced = True
                logger.info(
                    f"✅ Catenda-relasjon opprettet: {eo_sak_id} <-> {koe_sak_id}"
                )
            except Exception as e:
                logger.warning(f"Catenda-synk feilet (fortsetter uten): {e}")

        return {
            "success": True,
            "catenda_synced": catenda_synced,
        }

    def fjern_koe(
        self, eo_sak_id: str, koe_sak_id: str, aktor: str = "BH"
    ) -> dict[str, Any]:
        """
        Fjerner en KOE-sak fra endringsordren.

        Local-first: Lagrer event lokalt først, synker til Catenda etterpå.

        Args:
            eo_sak_id: Endringsordresakens ID
            koe_sak_id: KOE-sakens ID som skal fjernes
            aktor: Hvem som utfører handlingen

        Returns:
            Dict med success og catenda_synced status
        """
        state = self._load_state(eo_sak_id)
        if state is None or state.endringsordre_data is None:
            raise ValueError("Endringsordren finnes ikke")
        if state.endringsordre_data.status != EOStatus.UTKAST:
            raise ValueError("En utstedt endringsordre kan ikke endres")
        if (
            not self._belongs_to_project(koe_sak_id)
            or koe_sak_id not in state.endringsordre_data.relaterte_koe_saker
        ):
            raise ValueError("KOE-saken inngår ikke i endringsordren")

        # 1. Opprett og lagre event lokalt FØRST
        event = EOKoeHandlingEvent(
            event_id=str(uuid4()),
            sak_id=eo_sak_id,
            event_type=EventType.EO_KOE_FJERNET,
            tidsstempel=datetime.now(UTC),
            aktor=aktor,
            aktor_rolle="BH",
            data=EOKoeHandlingData(
                koe_sak_id=koe_sak_id,
            ),
        )

        if self.event_repository:
            try:
                _, current_version = self.event_repository.get_events(eo_sak_id)
                self.event_repository.append(event, expected_version=current_version)
                logger.info(f"✅ Event EO_KOE_FJERNET lagret lokalt for {eo_sak_id}")
            except Exception as e:
                logger.error(f"Feil ved lagring av event: {e}")
                raise RuntimeError(f"Kunne ikke lagre event: {e}")

        # 1b. Remove relation from projection table
        if self.relation_repository:
            try:
                self.relation_repository.remove_relation(
                    source_sak_id=eo_sak_id,
                    target_sak_id=koe_sak_id,
                    relation_type="endringsordre",
                )
            except Exception as e:
                logger.warning(f"Could not remove relation from projection table: {e}")

        # 2. Prøv å synke til Catenda (valgfritt)
        catenda_synced = False
        if self.client:
            try:
                self.client.delete_topic_relation(
                    topic_id=eo_sak_id, related_topic_id=koe_sak_id
                )
                self.client.delete_topic_relation(
                    topic_id=koe_sak_id, related_topic_id=eo_sak_id
                )
                catenda_synced = True
                logger.info(
                    f"✅ Catenda-relasjon fjernet: {eo_sak_id} <-> {koe_sak_id}"
                )
            except Exception as e:
                logger.warning(f"Catenda-synk feilet (fortsetter uten): {e}")

        return {
            "success": True,
            "catenda_synced": catenda_synced,
        }

    def hent_komplett_eo_kontekst(
        self, eo_sak_id: str, *, tillatte_saker
    ) -> dict[str, Any]:
        """
        Henter komplett kontekst for en endringsordresak, inkludert:
        - Relaterte KOE-saker
        - State for hver KOE-sak
        - Hendelser fra KOE-sakene
        - EO-sakens egne hendelser
        - Oppsummering (totalt vederlag, frist, etc.)

        Args:
            eo_sak_id: Endringsordresakens ID

        Returns:
            Dict med:
            - relaterte_saker: Liste med SakRelasjon
            - sak_states: Dict[sak_id, SakState]
            - hendelser: Dict[sak_id, List[Event]]
            - eo_hendelser: List[Event] (EO-sakens egne hendelser)
            - oppsummering: Aggregert info
        """
        eo_hendelser: list[AnyEvent] = []
        if self.event_repository:
            events_data, _ = self.event_repository.get_events(eo_sak_id)
            eo_hendelser = [parse_event(event) for event in events_data]
        relaterte = self.hent_relaterte_saker(
            eo_sak_id, tillatte_saker=tillatte_saker
        )

        relaterte_ids = [r.relatert_sak_id for r in relaterte]
        # Relations are client-supplied, so the caller must say which cases this
        # reader may see. Filtering happens before anything is aggregated, or the
        # summary would count a case the reader never gets to see (audit RV-07).
        allowed = tillatte_saker(relaterte_ids)
        relaterte = [r for r in relaterte if r.relatert_sak_id in allowed]
        relaterte_ids = [i for i in relaterte_ids if i in allowed]

        if not relaterte_ids:
            logger.info(f"Ingen relaterte KOE-saker for EO {eo_sak_id}")
            return {
                "relaterte_saker": [],
                "sak_states": {},
                "hendelser": {},
                "eo_hendelser": eo_hendelser,
                "oppsummering": self._bygg_oppsummering({}),
            }

        # Hent state og hendelser fra KOE-saker
        states = self.hent_state_fra_relaterte_saker(relaterte_ids)
        hendelser = self.hent_hendelser_fra_relaterte_saker(relaterte_ids)

        # Bygg oppsummering
        oppsummering = self._bygg_oppsummering(states)

        logger.info(
            f"Hentet komplett kontekst for EO {eo_sak_id}: {len(relaterte_ids)} KOE-er"
        )

        return {
            "relaterte_saker": relaterte,
            "sak_states": states,
            "hendelser": hendelser,
            "eo_hendelser": eo_hendelser,
            "oppsummering": oppsummering,
        }

    def _bygg_oppsummering(self, states: dict[str, SakState]) -> dict[str, Any]:
        """
        Bygger oppsummering fra KOE-saker.

        Args:
            states: Dict med sak_id -> SakState

        Returns:
            Dict med oppsummeringsdata
        """
        total_krevd_vederlag = 0.0
        total_godkjent_vederlag = 0.0
        total_krevd_dager = 0
        total_godkjent_dager = 0
        koe_oversikt = []

        for sak_id, state in states.items():
            koe_info = {
                "sak_id": sak_id,
                "tittel": state.sakstittel,
                "grunnlag_status": state.grunnlag.status if state.grunnlag else None,
                "vederlag_status": state.vederlag.status if state.vederlag else None,
                "frist_status": state.frist.status if state.frist else None,
            }

            # Vederlag
            if state.vederlag:
                if state.vederlag.krevd_belop:
                    total_krevd_vederlag += state.vederlag.krevd_belop
                if state.vederlag.godkjent_belop:
                    total_godkjent_vederlag += state.vederlag.godkjent_belop
                koe_info["krevd_vederlag"] = state.vederlag.krevd_belop
                koe_info["godkjent_vederlag"] = state.vederlag.godkjent_belop

            # Frist
            if state.frist:
                if state.frist.krevd_dager:
                    total_krevd_dager += state.frist.krevd_dager
                koe_info["krevd_dager"] = state.frist.krevd_dager

                # Bruk godkjent_dager hvis satt, ellers fallback til krevd_dager
                # når status er godkjent/låst (BH har godkjent hele kravet)
                godkjent = state.frist.godkjent_dager
                if godkjent is None and state.frist.status in (
                    SporStatus.GODKJENT,
                    SporStatus.LAAST,
                ):
                    godkjent = state.frist.krevd_dager

                if godkjent:
                    total_godkjent_dager += godkjent
                koe_info["godkjent_dager"] = godkjent

            koe_oversikt.append(koe_info)

        return {
            "antall_koe_saker": len(states),
            "total_krevd_vederlag": total_krevd_vederlag,
            "total_godkjent_vederlag": total_godkjent_vederlag,
            "total_krevd_dager": total_krevd_dager,
            "total_godkjent_dager": total_godkjent_dager,
            "koe_oversikt": koe_oversikt,
        }

    def hent_kandidat_koe_saker(self) -> list[dict[str, Any]]:
        """
        Henter KOE-saker som kan legges til i en endringsordre.

        En KOE er kandidat hvis:
        - Den har sakstype='standard' (ikke forsering/endringsordre)
        - kan_utstede_eo er True (alle spor godkjent)

        Returns:
            Liste med kandidat-saker (sak_id, tittel, status)
        """
        states = self._project_states()
        linked = self._linked_koe_ids(states)
        return [
            {
                "sak_id": sak_id,
                "tittel": state.sakstittel or "",
                "overordnet_status": state.overordnet_status,
                "sum_godkjent": state.sum_godkjent,
                "godkjent_dager": state.frist.godkjent_dager,
                "har_vederlagskrav": state.vederlag.status
                in {SporStatus.GODKJENT, SporStatus.LAAST},
                "har_fristkrav": state.frist.status
                in {SporStatus.GODKJENT, SporStatus.LAAST},
            }
            for sak_id, state in states.items()
            if self._is_agreed_koe(state) and sak_id not in linked
        ]

    def hent_relaterte_saker(
        self, sak_id: str, *, tillatte_saker
    ) -> list[SakRelasjon]:
        """Read current links from issued events, including local-only orders.

        Leser fra hendelsene, ikke fra Catenda, og er derfor allerede avgrenset
        av _belongs_to_project. Men den kontrollen er fail-open uten
        metadata_repository, så tillatte_saker legges over: samme signatur som
        basen, og grensen holder også når metadata mangler.
        """
        state = self._load_state(sak_id)
        if state is None or state.endringsordre_data is None:
            return []
        allowed = tillatte_saker(state.endringsordre_data.relaterte_koe_saker)
        return [
            SakRelasjon(
                relatert_sak_id=koe_id,
                relatert_sak_tittel=(
                    metadata.cached_title
                    if self.metadata_repository
                    and (metadata := self.metadata_repository.get(koe_id))
                    else None
                ),
            )
            for koe_id in state.endringsordre_data.relaterte_koe_saker
            if koe_id in allowed and self._belongs_to_project(koe_id)
        ]

    def finn_eoer_for_koe(self, koe_sak_id: str) -> list[dict[str, Any]]:
        """Return authoritative backlinks; projection failures cannot hide an order."""
        if not self._belongs_to_project(koe_sak_id):
            raise ValueError("Saken finnes ikke i prosjektet")
        return [
            {
                "eo_sak_id": sak_id,
                "eo_nummer": state.endringsordre_data.eo_nummer,
                "dato_utstedt": state.endringsordre_data.dato_utstedt,
                "status": state.endringsordre_data.status,
            }
            for sak_id, state in self._project_states().items()
            if state.sakstype == SaksType.ENDRINGSORDRE
            and state.endringsordre_data
            and koe_sak_id in state.endringsordre_data.relaterte_koe_saker
        ]
