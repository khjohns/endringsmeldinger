-- To prosjekter. I A: BH, BH-rådgiver (samme side) og TE. I B: BH og TE.
-- Subjekter og team har catenda_id()-formen. Kjøres som postgres i én
-- transaksjon. Saker, hendelser og notater skrives gjennom kommandoene.

INSERT INTO public.projects (id, name, organisasjon_id) VALUES
    ('prosjekt-a', 'Prosjekt A', 'org-1'),
    ('prosjekt-b', 'Prosjekt B', 'org-1');

INSERT INTO public.catenda_project_configs (internal_project_id, catenda_project_id, library_id) VALUES
    ('prosjekt-a', 'c0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-00000000000a'),
    ('prosjekt-b', 'c0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-00000000000b');

INSERT INTO public.catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES
    ('prosjekt-a', 'ba0000000000400080000000000000a1', 'BH'),
    ('prosjekt-a', 'ba0000000000400080000000000000a2', 'BH'),
    ('prosjekt-a', 'ea0000000000400080000000000000a3', 'TE'),
    ('prosjekt-b', 'bb0000000000400080000000000000b1', 'BH'),
    ('prosjekt-b', 'eb0000000000400080000000000000b2', 'TE');

INSERT INTO public.app_users (id, email, name) VALUES
    ('00000000-0000-4000-8000-0000000000a1', 'bh@a', 'BH i A'),
    ('00000000-0000-4000-8000-0000000000a2', 'raad@a', 'Rådgiver i A'),
    ('00000000-0000-4000-8000-0000000000a3', 'te@a', 'TE i A'),
    ('00000000-0000-4000-8000-0000000000a4', 'viewer@a', 'Leser i A'),
    ('00000000-0000-4000-8000-0000000000ab', 'begge@ab', 'Medlem av A og B'),
    ('00000000-0000-4000-8000-0000000000b1', 'te@b', 'TE i B');

INSERT INTO public.app_identities (user_id, provider, issuer, subject)
SELECT id, 'catenda', 'https://api.catenda.com', '5a00000000004000800000000000' || lpad(right(id::text, 4), 4, '0')
FROM public.app_users;

INSERT INTO public.app_project_memberships
    (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override)
SELECT p, u::uuid, '5a00000000004000800000000000' || lpad(right(u, 4), 4, '0'), '', '', 'member', v
FROM (VALUES
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000a1', false),
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000a2', false),
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000a3', false),
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000a4', true),
    ('prosjekt-a', '00000000-0000-4000-8000-0000000000ab', false),
    ('prosjekt-b', '00000000-0000-4000-8000-0000000000ab', false),
    ('prosjekt-b', '00000000-0000-4000-8000-0000000000b1', false)
) AS m(p, u, v);

-- Før rollebyttet: runtime har ikke TEMP.
CREATE FUNCTION pg_temp.som(p_aktor TEXT, p_prosjekt TEXT, p_team TEXT, p_side TEXT) RETURNS VOID
LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims', jsonb_build_object(
        'koe_aktor', '00000000-0000-4000-8000-0000000000' || p_aktor,
        'koe_prosjekt', p_prosjekt, 'koe_team', p_team, 'koe_side', p_side)::text, true)
$$;

SET LOCAL ROLE koe_runtime;

SELECT pg_temp.som('a1', 'prosjekt-a', 'ba0000000000400080000000000000a1', 'BH');
SELECT koe_api.opprett_sak('sak-a1', 'KOE');
SELECT koe_api.send_varsel('sak-a1', 'grunnlag_varsel', '{"tekst":"varsel i A"}', 0);
SELECT koe_api.skriv_notat('sak-a1', 'BHs notat i A');

SELECT pg_temp.som('a2', 'prosjekt-a', 'ba0000000000400080000000000000a2', 'BH');
SELECT koe_api.skriv_notat('sak-a1', 'Rådgiverens notat i A');

SELECT pg_temp.som('a3', 'prosjekt-a', 'ea0000000000400080000000000000a3', 'TE');
SELECT koe_api.skriv_notat('sak-a1', 'TEs notat i A');

SELECT pg_temp.som('b1', 'prosjekt-b', 'eb0000000000400080000000000000b2', 'TE');
SELECT koe_api.opprett_sak('sak-b1', 'KOE');
SELECT koe_api.send_varsel('sak-b1', 'grunnlag_varsel', '{"tekst":"varsel i B"}', 0);

SELECT pg_temp.som('ab', 'prosjekt-b', 'bb0000000000400080000000000000b1', 'BH');
SELECT koe_api.skriv_notat('sak-b1', 'BHs notat i B');
