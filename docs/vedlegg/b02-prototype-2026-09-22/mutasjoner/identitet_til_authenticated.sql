-- RB2-review: en vanlig Data API-rolle får kjøre identitetsfunksjonen.
GRANT EXECUTE ON FUNCTION public.koe_resolve_identity(TEXT,TEXT,TEXT,TEXT,TEXT)
    TO authenticated;
