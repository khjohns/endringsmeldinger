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
        decision_summary(item) == "Prinsipalt avslått · 0 kr · Subsidiært: 500 000 kr"
    )


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
