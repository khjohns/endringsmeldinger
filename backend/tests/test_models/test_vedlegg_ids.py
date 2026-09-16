"""`vedlegg_ids` skal bare kunne inneholde ekte dokumentreferanser.

Feltet er klientlevert og lagres på hendelser som inngår i formelle brev. Det
vises til BH-godkjenner under overskriften «Vedlegg» i godkjenningspanelet
(`ApprovalPanel.svelte`). Ingenting slår opp verdiene, så en godkjenner kan få
presentert fri tekst som ser ut som et dokumentnavn.

Catenda-dokument-IDer er UUID-er — `upload_document` returnerer kompakt hex som
`_upload_and_link_pdf` formaterer med bindestreker, og `lib/auth/domain.catenda_id`
parser dem med `UUID(...)`. Begge formene skal godtas; alt annet avvises.
"""

import pytest
from pydantic import ValidationError

from models.events import (
    FristResponsData,
    GrunnlagData,
    GrunnlagResponsData,
    VederlagResponsData,
)

GYLDIG_KOMPAKT = "3fa85f6457174562b3fc2c963f66afa6"
GYLDIG_DASHET = "3fa85f64-5717-4562-b3fc-2c963f66afa6"


def _grunnlag(vedlegg_ids):
    return GrunnlagData(
        tittel="T",
        hovedkategori="ENDRING",
        underkategori="IRREG",
        beskrivelse="B",
        dato_oppdaget="2026-09-15",
        vedlegg_ids=vedlegg_ids,
    )


@pytest.mark.parametrize(
    "verdi,hvorfor",
    [
        (["Godkjent av Prosjektleder 12.03.pdf"], "fri prosatekst"),
        ([""], "tom streng"),
        (["   "], "bare mellomrom"),
        (["<script>alert(1)</script>"], "HTML"),
        (["../../etc/passwd"], "sti"),
        (["A" * 50_000], "svært lang streng"),
        ([f"{GYLDIG_KOMPAKT}-tillegg"], "gyldig UUID med påheng"),
    ],
)
def test_ugyldige_vedleggsreferanser_avvises(verdi, hvorfor):
    with pytest.raises(ValidationError):
        _grunnlag(verdi)


def test_for_mange_vedlegg_avvises():
    """Uten øvre grense kan én hendelse bære vilkårlig mange referanser."""
    with pytest.raises(ValidationError):
        _grunnlag([GYLDIG_DASHET] * 5_000)


@pytest.mark.parametrize("verdi", [GYLDIG_KOMPAKT, GYLDIG_DASHET])
def test_ekte_dokumentreferanser_godtas(verdi):
    """Begge formene Catenda faktisk returnerer må fortsatt virke."""
    assert _grunnlag([verdi]).vedlegg_ids == [verdi]


def test_tom_liste_er_lovlig():
    """Ingen vedlegg er normaltilfellet i dag — det finnes ingen opplastingsrute."""
    assert _grunnlag([]).vedlegg_ids == []


@pytest.mark.parametrize(
    "model", [GrunnlagResponsData, VederlagResponsData, FristResponsData]
)
def test_bh_partial_responses_preserve_optional_attachment_ids(model):
    # Revision permits the common fields without track-specific mandatory decisions.
    assert model(original_respons_id="response").vedlegg_ids == []
    data = model(original_respons_id="response", vedlegg_ids=[GYLDIG_DASHET])
    assert data.model_dump()["vedlegg_ids"] == [GYLDIG_DASHET]
    with pytest.raises(ValidationError):
        model(original_respons_id="response", vedlegg_ids=["not-an-id"])
