import pytest

from services.approval_letter import decision_summary, pdf_bytes, snapshot


def test_principal_and_subsidiary_amounts_are_not_conflated():
    item = {
        "track": "vederlag",
        "basis": {"resultat": "avslatt"},
        "data": {
            "beregnings_resultat": "godkjent",
            "total_godkjent_belop": 150000,
            "subsidiaer_godkjent_belop": 500000,
        },
    }
    assert (
        decision_summary(item)
        == "Prinsipalt avslått (ansvarsgrunnlaget) · Subsidiært: 500 000 kr"
    )


def ved_grunnlag(track, data, **basis):
    return {"track": track, "basis": basis, "data": data}


def test_hele_svaret_er_subsidiaert_naar_grunnlaget_er_avslatt():
    vederlag = ved_grunnlag(
        "vederlag",
        {"beregnings_resultat": "delvis_godkjent", "total_godkjent_belop": 150000},
        resultat="avslatt",
    )
    frist = ved_grunnlag(
        "frist",
        {"beregnings_resultat": "godkjent", "godkjent_dager": 10},
        resultat="avslatt",
    )
    assert decision_summary(vederlag) == (
        "Prinsipalt avslått (ansvarsgrunnlaget) · Subsidiært delvis godkjent: 150 000 kr"
    )
    assert decision_summary(frist) == (
        "Prinsipalt avslått (ansvarsgrunnlaget) · Subsidiært godkjent: 10 dager"
    )


def test_subsidiaert_standpunkt_i_svaret_gaar_foran_ved_avslatt_grunnlag():
    item = ved_grunnlag(
        "frist",
        {
            "beregnings_resultat": "avslatt",
            "godkjent_dager": 0,
            "subsidiaer_resultat": "delvis_godkjent",
            "subsidiaer_godkjent_dager": 4,
        },
        resultat="avslatt",
    )
    assert decision_summary(item) == (
        "Prinsipalt avslått (ansvarsgrunnlaget) · Subsidiært delvis godkjent: 4 dager"
    )


@pytest.mark.parametrize(
    ("underkategori", "forventet"),
    [
        ("EO", "Godkjent · 150 000 kr"),
        ("IRREG", "Prinsipalt avslått (ansvarsgrunnlaget) · Subsidiært godkjent: 150 000 kr"),
    ],
)
def test_32_2_gjelder_bare_endring_uten_formell_endringsordre(underkategori, forventet):
    item = ved_grunnlag(
        "vederlag",
        {"beregnings_resultat": "godkjent", "total_godkjent_belop": 150000},
        resultat="godkjent",
        varsletITide=False,
        hovedkategori="ENDRING",
        underkategori=underkategori,
    )
    assert decision_summary(item) == forventet


def test_pdf_is_generated_from_frozen_recipient_text():
    letter = {
        "title": "Svar på endringsmelding",
        "caseId": "c1",
        "caseTitle": "Fundament",
        "sender": "Entreprenør & Sønner",
        "recipient": "Byggherre",
        "date": "11. september 2026",
        "introduction": "Vurdering av < 10 enheter & oppmåling.",
        "closing": "Med vennlig hilsen",
        "items": [
            {
                "track": "grunnlag",
                "data": {
                    "resultat": "godkjent",
                    "begrunnelse": "<p>Dokumentert &amp; kontrollert.</p>",
                },
            }
        ],
    }
    public = snapshot(letter, "p1")
    assert (
        public.seksjoner.begrunnelse.redigertTekst
        == "Ansvarsgrunnlag\nGodkjent\n\nDokumentert & kontrollert."
    )
    generated = pdf_bytes(public)
    assert generated.startswith(b"%PDF-")
    assert len(generated) > 1000
