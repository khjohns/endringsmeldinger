# Flyttet

Migrasjonene som lå her er flyttet til `supabase/migrations/` 2026-09-20 (DA-03).

Mappa var merket «legacy — already applied», men fire av filene var fortsatt
nødvendige for å bygge databasen, og de måtte kjøres midt inne i
`supabase/migrations`-sekvensen. Så lenge det var tilfelle, kunne ikke
migrasjonsmappa være eneste kilde, og `supabase db push` kunne ikke virke.

| Var | Er nå |
| --- | --- |
| `003_sak_relations.sql` | `supabase/migrations/20260911073700_sak_relations.sql` |
| `004_projects_table.sql` | `supabase/migrations/20260911073600_projects.sql` |
| `005_project_rls_policies.sql` | `supabase/migrations/20260911080600_project_rls_policies.sql` |
| `006_bim_tables.sql` | `supabase/migrations/20260911073800_bim_tables.sql` |

**Legg ikke nye migrasjoner her.** Mappa beholdes bare fordi dokumentkjeden
viser til den.
