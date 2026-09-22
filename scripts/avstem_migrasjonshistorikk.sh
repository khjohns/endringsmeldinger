#!/usr/bin/env bash
# DA-03: gjør supabase_migrations.schema_migrations i prosjektet lik
# supabase/migrations/, slik at `supabase migration list` viser samme versjoner
# på begge sider og `supabase db push` kan brukes.
#
# Endrer bare historikktabellen, ikke skjemaet. Teksten i radene som slettes
# er arkivert byte-likt i docs/vedlegg/migrasjonshistorikk-2026-09-22/.
# Forutsetter `supabase login`; databasepassord trengs ikke.
set -euo pipefail

rot="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$rot"

arkiv="docs/vedlegg/migrasjonshistorikk-2026-09-22"
if [[ ! -f "$arkiv/20260911073526_002_koe_indexes.sql" ]]; then
  echo "Arkivet $arkiv mangler. Avbryter før noe slettes." >&2
  exit 1
fi

supabase link --project-ref gwdxadexwktegkklyobv

echo "Før:"
supabase migration list

# Rader uten fil. 002–006 er dumpen som kjerneskjemafila (073512) rekonstruerer.
# De fem siste ble stemplet med apply_migrations eget tidsstempel; teksten er
# identisk med filene 091208, 093936, 102148, 153900 og 164900.
supabase migration repair --status reverted \
  20260911073526 20260911073539 20260911073557 20260911075826 20260911080204 \
  20260921091758 20260921094013 20260921105303 20260921153902 20260921165158

# Filer uten rad. De ti første er anvendt gjennom 001–006 eller utenfor
# historikken, og katalogen er lik det de bygger (F0-notatet, avsnitt 3).
supabase migration repair --status applied \
  20260911073600 20260911073700 20260911073800 20260911080500 20260911080600 \
  20260912140000 20260912150635 20260916130000 20260916133000 20260920160000 \
  20260921091208 20260921093936 20260921102148 20260921153900 20260921164900

echo "Etter:"
supabase migration list
supabase db push --dry-run
