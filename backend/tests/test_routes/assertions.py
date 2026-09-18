"""Delte påstander for ruteprøver."""


def assert_ingen_intern_feiltekst(response):
    """Et 500-svar skal ikke gjengi unntakstekst til klienten.

    Egenskapen er generisk og gjelder enhver rute, så den bor ett sted framfor
    å skrives på nytt per rute (se RV-13, som gjelder ca. 35 gjenstående ruter).
    """
    assert response.status_code == 500, response.get_data(as_text=True)
    kropp = response.get_data(as_text=True)
    for lekkasje in ("password", "Traceback", "psycopg", "supabase.co"):
        assert lekkasje not in kropp, f"Feilsvaret lekker intern tekst: {lekkasje}"
