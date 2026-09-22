-- To prosjekter, fire team i A (BH, BH-rådgiver, TE) og to i B.
-- Kjøres som superbruker etter 02_b02_lag.sql.

INSERT INTO public.projects (id, name, organisasjon_id) VALUES
    ('prosjekt-a', 'Prosjekt A', 'org-1'),
    ('prosjekt-b', 'Prosjekt B', 'org-1');

INSERT INTO public.catenda_project_configs (internal_project_id, catenda_project_id, library_id) VALUES
    ('prosjekt-a', 'c0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-00000000000a'),
    ('prosjekt-b', 'c0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-00000000000b');

INSERT INTO public.app_users (id, email, name) VALUES
    ('00000000-0000-4000-8000-0000000000a1', 'bh@a', 'BH i A'),
    ('00000000-0000-4000-8000-0000000000a2', 'raad@a', 'Rådgiver i A'),
    ('00000000-0000-4000-8000-0000000000a3', 'te@a', 'TE i A'),
    ('00000000-0000-4000-8000-0000000000a4', 'viewer@a', 'Leser i A'),
    ('00000000-0000-4000-8000-0000000000ab', 'begge@ab', 'Medlem av A og B'),
    ('00000000-0000-4000-8000-0000000000b1', 'te@b', 'TE i B');

INSERT INTO public.app_identities (user_id, provider, issuer, subject)
SELECT id, 'catenda', 'https://api.catenda.com', 'sub-' || right(id::text, 2)
FROM public.app_users;

INSERT INTO public.app_project_memberships
    (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override)
SELECT p, u::uuid, 'sub-' || right(u, 2), '', '', 'member', v
FROM (VALUES
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000a1', false),
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000a2', false),
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000a3', false),
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000a4', true),
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000ab', false),
    ('prosjekt-b', '00000000-0000-4000-8000-0000000000ab', false),
    ('prosjekt-b', '00000000-0000-4000-8000-0000000000b1', false)
) AS m(p, u, v);

INSERT INTO public.sak_metadata (sak_id, prosjekt_id, created_by) VALUES
    ('sak-a1', 'prosjekt-a', 'test'),
    ('sak-b1', 'prosjekt-b', 'test');

INSERT INTO public.notat (notat_id, sak_id, prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, tekst) VALUES
    ('e0000000-0000-4000-8000-0000000000a1', 'sak-a1', 'prosjekt-a', '00000000-0000-4000-8000-0000000000a1', 'BH', 'team-bh-a', 'BHs notat i A'),
    ('e0000000-0000-4000-8000-0000000000a2', 'sak-a1', 'prosjekt-a', '00000000-0000-4000-8000-0000000000a2', 'BH', 'team-raad-a', 'Rådgiverens notat i A'),
    ('e0000000-0000-4000-8000-0000000000a3', 'sak-a1', 'prosjekt-a', '00000000-0000-4000-8000-0000000000a3', 'TE', 'team-te-a', 'TEs notat i A'),
    ('e0000000-0000-4000-8000-0000000000b1', 'sak-b1', 'prosjekt-b', '00000000-0000-4000-8000-0000000000ab', 'BH', 'team-bh-b', 'BHs notat i B');

-- Journalen kan bare skrives gjennom kommandoen, også av superbrukeren her.
SELECT set_config('request.jwt.claims', '{"koe_aktor":"00000000-0000-4000-8000-0000000000a1","koe_prosjekt":"prosjekt-a","koe_team":"team-bh-a","koe_side":"BH"}', true);
SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', '{"tekst":"varsel i A"}', 0);
SELECT set_config('request.jwt.claims', '{"koe_aktor":"00000000-0000-4000-8000-0000000000b1","koe_prosjekt":"prosjekt-b","koe_team":"team-te-b","koe_side":"TE"}', true);
SELECT koe_api.send_varsel('sak-b1', 'grunnlag_varsel', '{"tekst":"varsel i B"}', 0);
