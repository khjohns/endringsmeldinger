# Fase 0: Prosjektoppsett — Implementeringsplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kjørende SvelteKit-prosjekt i `~/Projects/endringsmeldinger` med kopierte domenefiler, grønne domenetester, Tailwind v4 dark theme, og Cloud Run-deployment-oppsett.

**Architecture:** SvelteKit 2 SPA (`adapter-static`, `ssr: false`) med Svelte 5 runes. Snakker til unified-timeline Flask-backend via API. Deployes som statisk SPA på Cloud Run via nginx.

**Tech Stack:** SvelteKit 2, Svelte 5.49+, Vite 7, Tailwind CSS v4, Vitest, Playwright, TypeScript 5.8+

**Kildekode:** Domenefiler kopieres fra `~/Projects/Catenda/unified-timeline/src/`

---

### Task 1: Opprett repo og initialiser SvelteKit-prosjekt

**Files:**
- Create: `~/Projects/endringsmeldinger/` (hele prosjektet)

**Step 1: Opprett prosjekt med sv create**

```bash
npx sv create ~/Projects/endringsmeldinger
```

Velg i promptene:
- Template: **SvelteKit minimal**
- Type checking: **TypeScript**
- Add-ons: **Tailwind CSS, ESLint, Vitest, Playwright**

**Step 2: Verifiser Vite 7**

```bash
cd ~/Projects/endringsmeldinger
cat package.json | grep vite
```

Forventet: `"vite": "^7.x.x"`. Hvis Vite 6 — kjør:

```bash
npm install vite@latest @sveltejs/vite-plugin-svelte@latest
```

**Step 3: Installer og verifiser**

```bash
npm install
npm run dev
```

Forventet: Dev server starter på http://localhost:5173

**Step 4: Initialiser git**

```bash
cd ~/Projects/endringsmeldinger
git init
git add -A
git commit -m "chore: initial SvelteKit project via sv create"
```

---

### Task 2: Konfigurer SPA-modus med adapter-static

**Files:**
- Modify: `svelte.config.js`
- Create: `src/routes/+layout.ts`

**Step 1: Konfigurer adapter-static med fallback**

`svelte.config.js` — sørg for at den ser slik ut:

```javascript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		})
	}
};

export default config;
```

**Step 2: Deaktiver SSR**

Opprett `src/routes/+layout.ts`:

```typescript
export const ssr = false;
export const prerender = false;
```

**Step 3: Verifiser at build fungerer**

```bash
npm run build
ls build/index.html
```

Forventet: `build/index.html` finnes. Ingen SSR-feil.

**Step 4: Commit**

```bash
git add svelte.config.js src/routes/+layout.ts
git commit -m "feat: configure adapter-static SPA mode with fallback"
```

---

### Task 3: Sett opp Analysebordet-designtokens (dark-only)

**Files:**
- Modify: `src/app.css`
- Modify: `src/app.html`

**Step 1: Erstatt app.css med Analysebordet dark theme**

Erstatt innholdet i `src/app.css` med:

```css
@import "tailwindcss";

@theme inline {
	/* ── Analysebordet — dark theme tokens ── */

	/* Canvas & surfaces */
	--color-canvas: #0c0e14;
	--color-felt: #12151e;
	--color-felt-raised: #181c28;
	--color-felt-hover: #1e2233;
	--color-felt-active: #242840;

	/* Ink hierarchy */
	--color-ink: #e2e5ef;
	--color-ink-secondary: #8890a4;
	--color-ink-muted: #7b829b;
	--color-ink-ghost: #5a6178;

	/* Wire — borders */
	--color-wire: rgba(255, 255, 255, 0.06);
	--color-wire-strong: rgba(255, 255, 255, 0.10);
	--color-wire-focus: rgba(232, 168, 56, 0.35);

	/* Vekt — weight accent (amber) */
	--color-vekt: #e8a838;
	--color-vekt-dim: #c49030;
	--color-vekt-bg: rgba(232, 168, 56, 0.08);
	--color-vekt-bg-strong: rgba(232, 168, 56, 0.14);

	/* Score semantics */
	--color-score-high: #3d9a6e;
	--color-score-high-bg: rgba(61, 154, 110, 0.10);
	--color-score-mid: #8890a4;
	--color-score-low: #c45858;
	--color-score-low-bg: rgba(196, 88, 88, 0.10);

	/* Tipex editor */
	--color-tipex-bg: #0c0e14;
	--color-tipex-text: #e2e5ef;
	--color-tipex-toolbar-bg: #181c28;
	--color-tipex-toolbar-text: #8890a4;
	--color-tipex-accent: #e8a838;

	/* Typography */
	--font-data: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
	--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

	/* Spacing (4px grid) */
	--spacing-1: 4px;
	--spacing-2: 8px;
	--spacing-3: 12px;
	--spacing-4: 16px;
	--spacing-5: 20px;
	--spacing-6: 24px;
	--spacing-8: 32px;
	--spacing-10: 40px;
	--spacing-12: 48px;

	/* Radius (skarpere enn standard) */
	--radius-sm: 2px;
	--radius-md: 4px;
	--radius-lg: 6px;
}

/* ── Reset ── */
*,
*::before,
*::after {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

body {
	font-family: var(--font-ui);
	background: var(--color-canvas);
	color: var(--color-ink);
	line-height: 1.5;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	overflow-x: hidden;
}

.visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
}
```

**Step 2: Oppdater app.html med fonter**

Erstatt `src/app.html`:

```html
<!doctype html>
<html lang="nb">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
		<title>Endringsmeldinger</title>
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

**Step 3: Verifiser at Tailwind-tokens fungerer**

Erstatt `src/routes/+page.svelte` med en enkel testside:

```svelte
<div class="p-6">
	<h1 class="text-ink text-2xl font-semibold font-[family-name:var(--font-ui)]">Endringsmeldinger</h1>
	<p class="text-ink-secondary mt-2">Analysebordet — dark theme aktiv</p>
	<div class="mt-4 flex gap-3">
		<div class="w-16 h-16 rounded-md bg-felt border border-wire"></div>
		<div class="w-16 h-16 rounded-md bg-felt-raised border border-wire"></div>
		<div class="w-16 h-16 rounded-md bg-vekt-bg border border-wire-strong"></div>
	</div>
</div>
```

```bash
npm run dev
```

Forventet: Mørk bakgrunn (#0c0e14), lyse bokstaver, tre fargede bokser synlige.

**Step 4: Commit**

```bash
git add src/app.css src/app.html src/routes/+page.svelte
git commit -m "feat: Analysebordet dark theme tokens + font loading"
```

---

### Task 4: Installer prosjektavhengigheter

**Files:**
- Modify: `package.json`

**Step 1: Installer runtime-avhengigheter**

```bash
npm install @friendofsvelte/tipex @tiptap/extension-character-count @tiptap/extension-placeholder bits-ui @tanstack/svelte-query zod date-fns lucide-svelte sveltekit-superforms formsnap
```

**Step 2: Verifiser**

```bash
npm run check
```

Forventet: Ingen type-feil. (Noen warnings er ok.)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install project dependencies (Tipex, Bits UI, TanStack Query, Superforms, etc.)"
```

---

### Task 5: Kopier domenefiler fra unified-timeline

**Files:**
- Create: `src/lib/domain/` (5 filer + __tests__/)
- Create: `src/lib/types/` (5 filer — scope-relevant)
- Create: `src/lib/constants/` (10 filer — scope-relevant)
- Create: `src/lib/utils/` (5 filer — scope-relevant)

**Kilde:** `~/Projects/Catenda/unified-timeline/src/`

**Step 1: Kopier domain/**

```bash
mkdir -p src/lib/domain
cp ~/Projects/Catenda/unified-timeline/src/domain/grunnlagDomain.ts src/lib/domain/
cp ~/Projects/Catenda/unified-timeline/src/domain/vederlagDomain.ts src/lib/domain/
cp ~/Projects/Catenda/unified-timeline/src/domain/fristDomain.ts src/lib/domain/
cp ~/Projects/Catenda/unified-timeline/src/domain/fristSubmissionDomain.ts src/lib/domain/
cp ~/Projects/Catenda/unified-timeline/src/domain/vederlagSubmissionDomain.ts src/lib/domain/
cp -r ~/Projects/Catenda/unified-timeline/src/domain/__tests__ src/lib/domain/
```

**Step 2: Kopier types/ (kun scope-relevante)**

```bash
mkdir -p src/lib/types
cp ~/Projects/Catenda/unified-timeline/src/types/timeline.ts src/lib/types/
cp ~/Projects/Catenda/unified-timeline/src/types/api.ts src/lib/types/
cp ~/Projects/Catenda/unified-timeline/src/types/project.ts src/lib/types/
cp ~/Projects/Catenda/unified-timeline/src/types/membership.ts src/lib/types/
cp ~/Projects/Catenda/unified-timeline/src/types/index.ts src/lib/types/
```

**NB:** `types/index.ts` re-eksporterer muligens fravik, dalux, integration, letter, approval — fjern disse re-eksportene hvis de refererer til filer som ikke er kopiert. Sjekk med:

```bash
head -30 src/lib/types/index.ts
```

Fjern linjer som importerer fra filer utenfor scope (fravik, dalux, integration, letter, approval).

**Step 3: Kopier constants/ (kun scope-relevante)**

```bash
mkdir -p src/lib/constants
for f in categories.ts varslingsregler.ts responseOptions.ts statusStyles.ts paymentMethods.ts statusLabels.ts eventTypeLabels.ts fristVarselTypes.ts varselMetoder.ts index.ts; do
  cp ~/Projects/Catenda/unified-timeline/src/constants/$f src/lib/constants/
done
```

**NB:** `constants/index.ts` kan re-eksportere filer utenfor scope (approvalConfig, fravikLabels, queryConfig). Fjern slike re-eksporter.

**Step 4: Kopier utils/ (kun scope-relevante)**

```bash
mkdir -p src/lib/utils
for f in begrunnelseGenerator.ts preklusjonssjekk.ts formatters.ts dateFormatters.ts fileUtils.ts; do
  cp ~/Projects/Catenda/unified-timeline/src/utils/$f src/lib/utils/
done
```

**Step 5: Fiks import-stier**

Kildekoden bruker `@/`-alias (`@/types/timeline`, `@/constants/categories`, etc.). SvelteKit bruker `$lib/`. Erstatt globalt:

```bash
cd ~/Projects/endringsmeldinger
find src/lib -name '*.ts' -exec sed -i '' "s|from '@/|from '\$lib/|g" {} +
find src/lib -name '*.ts' -exec sed -i '' "s|from \"@/|from \"\$lib/|g" {} +
```

**Step 6: Verifiser at TypeScript kompilerer**

```bash
npm run check
```

Forventet: Feil kun fra manglende re-eksporter (fikset i step 2/3) eller ubrukte imports. Fiks iterativt.

**Step 7: Commit**

```bash
git add src/lib/domain src/lib/types src/lib/constants src/lib/utils
git commit -m "feat: copy domain files from unified-timeline (grunnlag, vederlag, frist)"
```

---

### Task 6: Sett opp Vitest og verifiser domenetester

**Files:**
- Modify: `vitest.config.ts` (eller `vite.config.ts`)

**Step 1: Sjekk Vitest-konfigurasjon**

`sv create` med Vitest-addon setter opp Vitest automatisk. Verifiser at `$lib`-alias er konfigurert for testene. Sjekk `vite.config.ts`:

```bash
cat vite.config.ts
```

SvelteKit-pluginen setter opp `$lib`-alias automatisk. Vitest arver dette via `vite.config.ts`.

**Step 2: Kjør domenetestene**

```bash
npx vitest run src/lib/domain/__tests__/ --reporter=verbose
```

Forventet: Alle domenetester passerer. Mulige feil:
- Import-stier (`@/` → `$lib/`) ikke fullstendig erstattet → fiks manuelt
- Manglende type-eksporter → legg til i `types/index.ts`
- `vitest` globals ikke konfigurert → legg til `globals: true` i vitest-config

**Step 3: Hvis feil — fiks iterativt**

Vanligste feilkilde: manglende typer i `types/index.ts`. Sjekk hva testene importerer:

```bash
grep -r "from.*\$lib/types" src/lib/domain/__tests__/
```

Legg til manglende re-eksporter i `src/lib/types/index.ts`.

**Step 4: Verifiser alle tester grønne**

```bash
npx vitest run src/lib/domain/__tests__/ --reporter=verbose
```

Forventet: 5 testfiler, alle grønne:
- `grunnlagDomain.test.ts` — 367 linjer
- `vederlagDomain.test.ts` — 879 linjer
- `fristDomain.test.ts` — 489 linjer
- `fristSubmissionDomain.test.ts` — 335 linjer
- `vederlagSubmissionDomain.test.ts` — 505 linjer

**Step 5: Commit**

```bash
git add -A
git commit -m "test: verify all domain tests pass (grunnlag, vederlag, frist)"
```

---

### Checkpoint A: Rydd kopierte filer

> **Skill:** `simplify`

Kjør `simplify`-skillen på alle kopierte filer i `src/lib/`. Fokusområder:
- Døde imports (referanser til filer utenfor scope: fravik, dalux, integration, etc.)
- Ubrukte re-eksporter i `index.ts`-filer
- `@/`-aliaser som ikke ble erstattet med `$lib/`
- Ubrukte variabler eller funksjoner som kun var relevante for React-versjonen

Fiks alt som dukker opp, kjør domenetestene på nytt for å verifisere:

```bash
npx vitest run src/lib/domain/__tests__/ --reporter=verbose
```

Commit etter opprydding:

```bash
git add src/lib/
git commit -m "refactor: clean up copied domain files (dead imports, unused exports)"
```

---

### Task 7: Sett opp rutingstruktur

**Files:**
- Create: `src/routes/[prosjektId]/+layout.svelte`
- Create: `src/routes/[prosjektId]/+page.svelte`
- Create: `src/routes/[prosjektId]/[sakId]/+page.svelte`
- Create: `src/routes/[prosjektId]/[sakId]/[spor]/+page.svelte`
- Modify: `src/routes/+layout.svelte`

**Step 1: Opprett app shell layout**

`src/routes/+layout.svelte`:

```svelte
<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

{@render children()}
```

**Step 2: Opprett prosjekt-layout**

`src/routes/[prosjektId]/+layout.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const prosjektId = $derived(page.params.prosjektId);
</script>

<div class="min-h-screen bg-canvas text-ink">
	<header class="h-12 border-b border-wire flex items-center px-4">
		<span class="text-ink-secondary text-sm font-medium">Prosjekt {prosjektId}</span>
	</header>
	<main>
		{@render children()}
	</main>
</div>
```

**Step 3: Opprett placeholder-sider**

`src/routes/[prosjektId]/+page.svelte` (saksliste):

```svelte
<script lang="ts">
	import { page } from '$app/state';
	const prosjektId = $derived(page.params.prosjektId);
</script>

<div class="p-6">
	<h1 class="text-xl font-semibold">Saker i prosjekt {prosjektId}</h1>
	<p class="text-ink-secondary mt-2">Saksliste — implementeres i Fase 2</p>
</div>
```

`src/routes/[prosjektId]/[sakId]/+page.svelte` (Forhandlingsbordet):

```svelte
<script lang="ts">
	import { page } from '$app/state';
	const sakId = $derived(page.params.sakId);
</script>

<div class="p-6">
	<h1 class="text-xl font-semibold">Forhandlingsbordet — Sak {sakId}</h1>
	<p class="text-ink-secondary mt-2">CasePage — implementeres i Fase 2</p>
</div>
```

`src/routes/[prosjektId]/[sakId]/[spor]/+page.svelte` (Spordetalj):

```svelte
<script lang="ts">
	import { page } from '$app/state';
	const spor = $derived(page.params.spor);
	const sakId = $derived(page.params.sakId);
</script>

<div class="p-6">
	<h1 class="text-xl font-semibold capitalize">{spor} — Sak {sakId}</h1>
	<p class="text-ink-secondary mt-2">Spordetalj — implementeres i Fase 3-5</p>
</div>
```

**Step 4: Oppdater +page.svelte (root) med redirect**

Erstatt `src/routes/+page.svelte`:

```svelte
<div class="min-h-screen bg-canvas flex items-center justify-center">
	<div class="text-center">
		<h1 class="text-2xl font-semibold text-ink">Endringsmeldinger</h1>
		<p class="text-ink-secondary mt-2">Navigér til /[prosjektId] for å starte</p>
	</div>
</div>
```

**Step 5: Verifiser ruting**

```bash
npm run dev
```

Test i nettleser:
- `http://localhost:5173/` → Landingsside
- `http://localhost:5173/abc123` → Saksliste for prosjekt abc123
- `http://localhost:5173/abc123/sak-1` → Forhandlingsbordet
- `http://localhost:5173/abc123/sak-1/grunnlag` → Spordetalj grunnlag

**Step 6: Commit**

```bash
git add src/routes/
git commit -m "feat: routing structure /[prosjektId]/[sakId]/[spor]"
```

---

### Task 8: Kopier API-klient og konfigurer Vite-proxy

**Files:**
- Create: `src/lib/api/` (6 filer)
- Modify: `vite.config.ts`

**Step 1: Kopier API-filer (kun scope-relevante)**

```bash
mkdir -p src/lib/api
for f in client.ts state.ts events.ts cases.ts projects.ts membership.ts; do
  cp ~/Projects/Catenda/unified-timeline/src/api/$f src/lib/api/
done
```

**Step 2: Fiks import-stier**

```bash
find src/lib/api -name '*.ts' -exec sed -i '' "s|from '@/|from '\$lib/|g" {} +
find src/lib/api -name '*.ts' -exec sed -i '' "s|from \"@/|from \"\$lib/|g" {} +
```

**Step 3: Tilpass client.ts for SvelteKit**

Åpne `src/lib/api/client.ts` og:
1. Fjern eventuelle React-imports
2. Legg til browser-guard for localStorage-tilgang:

```typescript
import { browser } from '$app/environment';
```

Erstatt direkte `localStorage`-kall med:

```typescript
if (browser) {
  localStorage.getItem(...)
}
```

3. Fjern eventuelle Supabase auth-kall (auth implementeres i Fase 6).
   Kommentér ut eller erstatt med en TODO.

**Step 4: Konfigurer Vite proxy**

Legg til proxy i `vite.config.ts`:

```typescript
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:5001',
				changeOrigin: true
			}
		}
	}
});
```

(Port 5001 = unified-timeline Flask-backend. Juster ved behov.)

**Step 5: Verifiser typesjekk**

```bash
npm run check
```

Forventet: Eventuelle feil fra auth-kode i client.ts. Fiks ved å kommentere ut eller stubbes.

**Step 6: Commit**

```bash
git add src/lib/api vite.config.ts
git commit -m "feat: API client + Vite proxy to Flask backend"
```

---

### Checkpoint B: Review API-klient

> **Skill:** `simplify`

Kjør `simplify`-skillen på `src/lib/api/`. Fokusområder:
- React-rester (useEffect, useState, React-imports)
- Auth-kode som burde vært stubbet ut (Supabase-kall, token-refresh)
- CSRF-håndtering som kan være overflødig for SPA-modus
- Hardkodede URL-er som burde være konfigurerbare
- Browser-guards (`import { browser }`) der localStorage brukes

Fiks, verifiser typesjekk:

```bash
npm run check
```

Commit:

```bash
git add src/lib/api/
git commit -m "refactor: clean up API client for SvelteKit (remove React patterns, stub auth)"
```

---

### Task 9: Sett opp Dockerfile og Cloud Run-deployment

**Files:**
- Create: `Dockerfile`
- Create: `nginx.conf`
- Create: `deploy.sh`
- Create: `.dockerignore`

**Step 1: Opprett .dockerignore**

```
node_modules
.svelte-kit
build
.git
*.md
tests
e2e
```

**Step 2: Opprett nginx.conf**

```nginx
server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — alle ruter til index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache statiske assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Helsejekk
    location /health {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
```

**Step 3: Opprett Dockerfile**

```dockerfile
# Stage 1: Build SvelteKit static SPA
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

**Step 4: Opprett deploy.sh**

```bash
#!/usr/bin/env bash
# Deploy SPA til Cloud Run (nginx-container).
set -euo pipefail

gcloud run deploy endringsmeldinger-web \
  --source . \
  --region europe-north1 \
  --project=procurement-mcp \
  --port=8080 \
  --min-instances=0 \
  --max-instances=2 \
  --memory=128Mi \
  --allow-unauthenticated
```

```bash
chmod +x deploy.sh
```

**Step 5: Test Docker-build lokalt**

```bash
docker build -t endringsmeldinger .
docker run -p 8080:8080 endringsmeldinger
```

Test: `http://localhost:8080/abc123/sak-1` → Forhandlingsbordet-placeholder.

**Step 6: Commit**

```bash
git add Dockerfile nginx.conf deploy.sh .dockerignore
git commit -m "feat: Cloud Run deployment (nginx + static SPA)"
```

---

### Task 10: Sluttverifisering og commit

**Step 1: Kjør alle sjekker**

```bash
npm run check          # TypeScript
npx vitest run         # Domenetester
npm run build          # Produksjons-build
npm run lint           # ESLint
```

Forventet: Alt grønt. Eventuelle lint-warnings er ok (nye filer fra kopiering).

**Step 2: Verifiser prosjektstruktur**

```bash
find src/lib -type f -name '*.ts' | head -30
find src/routes -type f | sort
```

Forventet struktur:

```
src/lib/
├── domain/        (5 filer + __tests__/)
├── types/         (5 filer)
├── constants/     (10 filer)
├── utils/         (5 filer)
└── api/           (6 filer)

src/routes/
├── +layout.svelte
├── +layout.ts
├── +page.svelte
└── [prosjektId]/
    ├── +layout.svelte
    ├── +page.svelte
    └── [sakId]/
        ├── +page.svelte
        └── [spor]/
            └── +page.svelte
```

**Step 3: Finaler commit (om noe gjenstår)**

```bash
git add -A
git status
# Commit kun hvis det er ustaged endringer
git commit -m "chore: Fase 0 complete — project setup verified"
```

---

### Checkpoint C: Sluttreview

> **Skills:** `superpowers:verification-before-completion` + `superpowers:requesting-code-review`

Kjør begge skills i sekvens:

1. **verification-before-completion** — Verifiser at alle suksesskriterier faktisk er oppfylt. Kjør alle kommandoer og bekreft output:
   ```bash
   npm run check && npx vitest run && npm run build && npm run lint
   ```

2. **requesting-code-review** — Full review av hele prosjektet mot kravene i PLAN_SVELTE_GREENFIELD.md §Fase 0. Sjekk:
   - Alle Fase 0-sjekkpunkter oppfylt
   - Ingen sikkerhetsproblemer (hardkodede secrets, åpne endpoints)
   - Korrekt prosjektstruktur
   - Designtokens matcher Analysebordet-spesifikasjonen

Fiks eventuelle funn, commit:

```bash
git add -A
git commit -m "fix: address review findings from Fase 0 completion review"
```

---

## Fase 0 suksesskriterier

- [x] Domenetester grønne (5 testfiler)
- [x] `npm run check` passerer
- [x] `npm run build` produserer `build/index.html`
- [x] Tailwind-tokens fungerer (mørk bakgrunn, korrekte farger)
- [x] Ruting fungerer (`/prosjektId/sakId/spor`)
- [x] Docker-build fungerer
- [x] Vite 7 brukes (ikke 6)
- [x] `@theme inline` brukes for CSS-tokens

## Beslutninger tatt underveis

- **`createContext` vs module-level singletons:** Evalueres i Fase 1 når første store opprettes. Foreløpig anbefaling: prøv `createContext` for TanStack Query-provider, bruk module-level singleton for enklere stores.
- **`uv` for backend:** Utenfor scope — backend lever i unified-timeline-repoet.
- **API-autentisering:** Stubbet ut i Fase 0. Implementeres i Fase 6.
