-- RB2-review: kommandoen kontrollerer medlemskap, men slipper gjennom leserollen.
DO $$
BEGIN
    EXECUTE replace(
        pg_get_functiondef('koe_api.send_varsel(text,text,jsonb,integer)'::regprocedure),
        'OR NOT koe_privat.har_handlingsrett()',
        'OR NOT koe_privat.er_medlem()');
END $$;
