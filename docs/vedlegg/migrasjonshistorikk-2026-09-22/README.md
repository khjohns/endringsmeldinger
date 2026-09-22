# Migrasjonshistorikken i basen før avstemmingen

**Dato:** 2026-09-22. **Kilde:** `supabase_migrations.schema_migrations` i
prosjekt `gwdxadexwktegkklyobv`, hentet med `supabase migration fetch` (CLI 2.75.0)
før DA-03-avstemmingen. Se [gjennomføringsnotatet](../../gjennomforing-f0-postgresql-ci-2026-09-22.md).

Filene er tekstene basen faktisk kjørte, én fil per historikkrad. De er arkiv,
ikke migrasjoner: de ligger utenfor `supabase/migrations/` og skal ikke kjøres.
Radene `002`–`006` ble slettet fra historikken i avstemmingen; dette er eneste
kopi av teksten deres. `001`–`006` er originalene som
`20260911073512_koe_kjerneskjema_rekonstruert.sql` rekonstruerer, og motsier
den filas påstand om at teksten ikke er gjenopprettbar.

`fetch` legger til `;\n` på slutten. Uten dem er hver fil byte-lik med
raden: `md5` under er tatt over filinnholdet uten de to tegnene, og er
kontrollert mot `md5(array_to_string(statements, E'\n'))` i basen.

| Versjon | Navn | Fil | md5 |
| --- | --- | --- | --- |
| `20260911073512` | `001_koe_core_tables` | [20260911073512_001_koe_core_tables.sql](20260911073512_001_koe_core_tables.sql) | `24c4d8cf626e9a556026608fac6a25dc` |
| `20260911073526` | `002_koe_indexes` | [20260911073526_002_koe_indexes.sql](20260911073526_002_koe_indexes.sql) | `9996dfb316548e2122d02ef1ec27dce0` |
| `20260911073539` | `003_koe_functions_triggers` | [20260911073539_003_koe_functions_triggers.sql](20260911073539_003_koe_functions_triggers.sql) | `c14cf47943760b9386dc759d9c61c4e9` |
| `20260911073557` | `004_koe_rls_policies` | [20260911073557_004_koe_rls_policies.sql](20260911073557_004_koe_rls_policies.sql) | `f2dbf7994ff76ff18d271979a1c799bc` |
| `20260911075826` | `005_koe_security_hardening` | [20260911075826_005_koe_security_hardening.sql](20260911075826_005_koe_security_hardening.sql) | `7340869d147feda60c2b09c3634d0029` |
| `20260911080204` | `006_koe_rls_performance` | [20260911080204_006_koe_rls_performance.sql](20260911080204_006_koe_rls_performance.sql) | `dabfbcc74a010e48c5dd8993d14aa7fa` |
| `20260918131137` | `lock_down_data_api` | [20260918131137_lock_down_data_api.sql](20260918131137_lock_down_data_api.sql) | `b3354f52020d806ebc270ac647e072b5` |
| `20260918131223` | `lock_down_data_api_public_execute` | [20260918131223_lock_down_data_api_public_execute.sql](20260918131223_lock_down_data_api_public_execute.sql) | `6db1153fc50a89ab3748d3f44e422f77` |
| `20260918131332` | `fix_trigger_search_path` | [20260918131332_fix_trigger_search_path.sql](20260918131332_fix_trigger_search_path.sql) | `723c21ff4669df2f1ce7c87180bee413` |
| `20260920053427` | `tenant_attribution_prosjekt_id` | [20260920053427_tenant_attribution_prosjekt_id.sql](20260920053427_tenant_attribution_prosjekt_id.sql) | `f3a26ed2d85b8fc54afaafe1bdbb8bef` |
| `20260920152042` | `event_tables_actorteam` | [20260920152042_event_tables_actorteam.sql](20260920152042_event_tables_actorteam.sql) | `8684e10a8bb4f27d25e0dd8384678bb8` |
| `20260920192448` | `organisasjon_id_paa_projects` | [20260920192448_organisasjon_id_paa_projects.sql](20260920192448_organisasjon_id_paa_projects.sql) | `7b43ae2eaad5280c8c15bb8dfe0b0940` |
| `20260920193558` | `hendelse_tabell` | [20260920193558_hendelse_tabell.sql](20260920193558_hendelse_tabell.sql) | `1488e3054c7c22098c768806761725a8` |
| `20260921091758` | `koe_register_project_organisasjon_id` | [20260921091758_koe_register_project_organisasjon_id.sql](20260921091758_koe_register_project_organisasjon_id.sql) | `b49b47b4556b4ca86c20553d44213b43` |
| `20260921094013` | `indeks_hendelse_catenda_topic` | [20260921094013_indeks_hendelse_catenda_topic.sql](20260921094013_indeks_hendelse_catenda_topic.sql) | `2c07c857b246c258e5de216cda260b71` |
| `20260921105303` | `indeks_app_identities_provider_subject` | [20260921105303_indeks_app_identities_provider_subject.sql](20260921105303_indeks_app_identities_provider_subject.sql) | `d6447c875cf64a07aef299251c46e0ca` |
| `20260921153902` | `notat_tabell` | [20260921153902_notat_tabell.sql](20260921153902_notat_tabell.sql) | `b1a703e677eb4518840a32f7b2fd8c57` |
| `20260921165158` | `koe_resolve_identity_coalesce` | [20260921165158_koe_resolve_identity_coalesce.sql](20260921165158_koe_resolve_identity_coalesce.sql) | `89f1ec204d9391dda139b0e1093267b0` |
