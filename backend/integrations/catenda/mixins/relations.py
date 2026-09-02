"""
Catenda Relations Mixin
=======================

Topic relation management methods for Catenda API client.
"""

import logging
from typing import TYPE_CHECKING
from uuid import UUID

import requests

if TYPE_CHECKING:
    from ..base import CatendaClientBase

logger = logging.getLogger(__name__)


class RelationsMixin:
    """Topic relation management methods."""

    # Type hints for attributes from CatendaClientBase
    base_url: str
    topic_board_id: str | None

    if TYPE_CHECKING:

        def get_headers(self: "CatendaClientBase") -> dict[str, str]: ...
        def _safe_request(
            self: "CatendaClientBase",
            method: str,
            url: str,
            error_message: str = "API request failed",
            **kwargs,
        ) -> requests.Response | None: ...

    def list_related_topics(
        self: "CatendaClientBase", topic_id: str, include_project_topics: bool = True
    ) -> list[dict]:
        """
        List all related topics for a given topic.

        Args:
            topic_id: Topic GUID
            include_project_topics: Include topics from other topic boards in same project

        Returns:
            List of related topics
        """
        if not self.topic_board_id:
            logger.error("Ingen topic board valgt")
            return []

        logger.info(f"Henter relaterte topics for {topic_id}...")

        url = (
            f"{self.base_url}/opencde/bcf/3.0/projects/{self.topic_board_id}"
            f"/topics/{topic_id}/related_topics"
        )

        params = {}
        if include_project_topics:
            params["includeBimsyncProjectTopics"] = "true"

        response = self._safe_request(
            "GET",
            url,
            "Feil ved henting av relaterte topics",
            params=params if params else None,
        )
        if response is None:
            return []

        related = response.json()
        logger.info(f"Fant {len(related)} relatert(e) topic(s)")

        for rel in related:
            logger.info(
                f"  - {rel.get('related_topic_guid')} (Board: {rel.get('bimsync_issue_board_ref')})"
            )

        return related

    def create_topic_relations(
        self: "CatendaClientBase", topic_id: str, related_topic_guids: list[str]
    ) -> bool:
        """
        Create relations from a topic to other topics.

        Used to link e.g. an acceleration case to time extension cases.

        Args:
            topic_id: Topic GUID (e.g. the acceleration case)
            related_topic_guids: List of GUIDs for topics to relate to

        Returns:
            True if successful
        """
        if not self.topic_board_id:
            logger.error("Ingen topic board valgt")
            return False

        if not related_topic_guids:
            logger.info(f"Ingen nye relasjoner for topic {topic_id}")
            return True

        logger.info(
            f"Oppretter {len(related_topic_guids)} relasjon(er) for topic {topic_id}..."
        )

        url = (
            f"{self.base_url}/opencde/bcf/3.0/projects/{self.topic_board_id}"
            f"/topics/{topic_id}/related_topics"
        )

        try:
            new_guids = [str(UUID(guid.strip())) for guid in related_topic_guids]
        except (AttributeError, TypeError, ValueError):
            logger.error("Nye topic-relasjoner inneholder ugyldig GUID")
            return False

        # PUT may replace the relation collection. Fetch all existing relations,
        # including those to other boards in the physical project, and send the
        # stable union to avoid accidental relation loss.
        existing_response = self._safe_request(
            "GET",
            url,
            "Feil ved henting av eksisterende topic-relasjoner",
            params={"includeBimsyncProjectTopics": "true"},
        )
        if existing_response is None:
            return False

        try:
            existing_relations = existing_response.json()
        except (TypeError, ValueError):
            logger.error("Henting av topic-relasjoner returnerte ugyldig JSON")
            return False
        if not isinstance(existing_relations, list):
            logger.error("Ugyldig respons ved henting av topic-relasjoner")
            return False

        existing_guids: list[str] = []
        for relation in existing_relations:
            if not isinstance(relation, dict) or not isinstance(
                relation.get("related_topic_guid"), str
            ):
                logger.error("Eksisterende topic-relasjon mangler gyldig GUID")
                return False
            try:
                existing_guids.append(
                    str(UUID(relation["related_topic_guid"].strip()))
                )
            except (AttributeError, TypeError, ValueError):
                logger.error("Eksisterende topic-relasjon inneholder ugyldig GUID")
                return False

        all_guids = list(dict.fromkeys([*existing_guids, *new_guids]))
        payload = [{"related_topic_guid": guid} for guid in all_guids]

        response = self._safe_request(
            "PUT", url, "Feil ved oppretting av topic-relasjoner", json=payload
        )
        if response is None:
            return False

        logger.info("Relasjoner opprettet!")
        for guid in related_topic_guids:
            logger.info(f"  - {topic_id} -> {guid}")

        return True

    def delete_topic_relation(
        self: "CatendaClientBase", topic_id: str, related_topic_id: str
    ) -> bool:
        """
        Delete a relation between two topics.

        Args:
            topic_id: Topic GUID
            related_topic_id: GUID of related topic to remove

        Returns:
            True if successful
        """
        if not self.topic_board_id:
            logger.error("Ingen topic board valgt")
            return False

        logger.info(f"Sletter relasjon {topic_id} -> {related_topic_id}...")

        url = (
            f"{self.base_url}/opencde/bcf/3.0/projects/{self.topic_board_id}"
            f"/topics/{topic_id}/related_topics/{related_topic_id}"
        )

        response = self._safe_request("DELETE", url, "Feil ved sletting av relasjon")
        if response is None:
            return False

        logger.info("Relasjon slettet")
        return True
