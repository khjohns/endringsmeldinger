-- RB2-01/07: forespørselsvakten fjernet. service_role og lange token slipper inn i Data API.
ALTER ROLE authenticator RESET pgrst.db_pre_request;
