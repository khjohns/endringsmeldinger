-- Anvendt mot gwdxadexwktegkklyobv 2026-09-21 som versjon 20260921093936.
--
-- KR-02: topic-oppslaget filtrerer nå på serveren framfor å hente hver sak i
-- hvert prosjekt. Filteret er uindeksert, og oppslaget ligger på
-- webhookstien — én gang per innkommende topic.
-- Se docs/audit-korrekthet-2026-09-21.md (KR-02).
--
-- Delvis indeks: bare sak_opprettet bærer en topic-GUID, og det er den eneste
-- hendelsestypen spørringen ser på.

CREATE INDEX IF NOT EXISTS idx_hendelse_catenda_topic
    ON public.hendelse ((data->>'catenda_topic_id'))
    WHERE event_type = 'sak_opprettet';;
