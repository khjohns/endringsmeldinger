-- RB2-05: runtime får den generiske identitetsfunksjonen med fri issuer og provider.
GRANT EXECUTE ON FUNCTION public.koe_resolve_identity(TEXT, TEXT, TEXT, TEXT, TEXT) TO koe_runtime;
