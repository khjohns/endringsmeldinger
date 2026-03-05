<script lang="ts">
	import { browser } from '$app/environment';

	let override = $state<'light' | 'dark' | null>(
		browser ? (localStorage.getItem('koe-theme') as 'light' | 'dark' | null) : null
	);

	let systemDark = $state(
		browser ? matchMedia('(prefers-color-scheme: dark)').matches : false
	);

	let resolved = $derived<'light' | 'dark'>(
		override ?? (systemDark ? 'dark' : 'light')
	);

	if (browser) {
		const mq = matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', (e) => {
			systemDark = e.matches;
		});
	}

	$effect(() => {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', resolved === 'dark');
	});

	function toggle() {
		// Flip to the opposite of current resolved theme
		const next = resolved === 'dark' ? 'light' : 'dark';
		// If that matches system, clear override; otherwise set it
		const systemTheme = systemDark ? 'dark' : 'light';
		override = next === systemTheme ? null : next;
		if (browser) {
			if (override) {
				localStorage.setItem('koe-theme', override);
			} else {
				localStorage.removeItem('koe-theme');
			}
		}
	}
</script>

<button class="theme-toggle" onclick={toggle} title="Bytt tema" aria-label="Tema: {resolved}">
	{#if resolved === 'light'}
		<svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="5"/>
			<line x1="12" y1="1" x2="12" y2="3"/>
			<line x1="12" y1="21" x2="12" y2="23"/>
			<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
			<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
			<line x1="1" y1="12" x2="3" y2="12"/>
			<line x1="21" y1="12" x2="23" y2="12"/>
			<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
			<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
		</svg>
	{:else}
		<svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
		</svg>
	{/if}
	<span class="theme-label">{resolved}</span>
</button>

<style>
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
		background: var(--color-felt);
		color: var(--color-ink-secondary);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: border-color 150ms ease, color 150ms ease;
		line-height: 1;
	}

	.theme-toggle:hover {
		border-color: var(--color-wire-focus);
		color: var(--color-ink);
	}

	.theme-icon {
		flex-shrink: 0;
	}

	.theme-label {
		user-select: none;
	}
</style>
