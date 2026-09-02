"""
CatendaProjectConfig — prosjektets Catenda-konfigurasjon.

Kobler appens stabile interne prosjekt-ID til Catendas ressurser for det aktuelle
prosjektet. Dette er grunnlaget for flerprosjekt-ruting i webhook-resolveren.

Koblingen skjer via to uavhengige identiteter:
  - internal_project_id: appens egen prosjekt-ID (aldri en Catenda-ID)
  - catenda_project_id:  fysisk Catenda-prosjekt (v2 API)

Topic boards hører til ett Catenda-prosjekt; et prosjekt kan ha flere boards.
"""

from uuid import UUID

from pydantic import BaseModel, Field, field_validator


def _normalise_uuid(value: str, field_name: str) -> str:
    """Validate and return a canonical lowercase, dashed UUID."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} må være en gyldig UUID")
    try:
        return str(UUID(value.strip()))
    except (ValueError, AttributeError) as exc:
        raise ValueError(f"{field_name} må være en gyldig UUID") from exc


class CatendaProjectConfig(BaseModel):
    """En intern prosjekts Catenda-konfigurasjon."""

    internal_project_id: str = Field(
        ...,
        description="Appens interne prosjekt-ID (aldri en Catenda-ID)",
    )
    catenda_project_id: str = Field(
        ...,
        description="Fysisk Catenda-prosjekt-ID (v2 API, kompakt eller dashed GUID)",
    )
    topic_board_ids: list[str] = Field(
        ...,
        description="Godkjente topic board-ID-er for prosjektet (normaliserte GUID-er)",
    )
    library_id: str = Field(
        ...,
        description="Catenda document library-ID for prosjektet",
    )
    folder_id: str | None = Field(
        default=None,
        description="Valgfri mappe-ID inni biblioteket",
    )

    @field_validator("internal_project_id")
    @classmethod
    def validate_internal_project_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("internal_project_id kan ikke være tom")
        return value

    @field_validator("catenda_project_id", "library_id", "folder_id")
    @classmethod
    def validate_external_id(cls, value: str | None, info) -> str | None:
        if value is None and info.field_name == "folder_id":
            return None
        return _normalise_uuid(value, info.field_name)

    @field_validator("topic_board_ids")
    @classmethod
    def validate_topic_board_ids(cls, values: list[str]) -> list[str]:
        if not values:
            raise ValueError("topic_board_ids må inneholde minst ett board")
        normalised = [_normalise_uuid(value, "topic_board_ids") for value in values]
        if len(normalised) != len(set(normalised)):
            raise ValueError("topic_board_ids kan ikke inneholde duplikater")
        return normalised
