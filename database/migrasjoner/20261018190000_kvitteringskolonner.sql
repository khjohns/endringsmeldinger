-- Kjøretiden leser bare kolonnene «levert» i visningen av saken trenger (#805):
-- hvilket oppdrag, hvilken operasjon og når den ble kvittert. Catenda-ID-en, forsøket,
-- forutsetningen og prosjektet leses av kjøreveien gjennom prosedyrene, ikke av
-- kjøretiden. Filterpredikatet gjelder fortsatt hver rad.

REVOKE SELECT ON koe.leveringskvittering FROM koe_runtime;
GRANT SELECT ON koe.leveringskvittering (leveringsoppdrag_id, operasjon, kvittert) TO koe_runtime;
