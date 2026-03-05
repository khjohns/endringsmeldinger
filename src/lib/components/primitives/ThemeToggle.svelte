<script lang="ts">
	import { browser } from '$app/environment';

	type Theme = 'light' | 'dark' | 'system';

	let userChoice = $state<Theme>(
		browser ? (localStorage.getItem('koe-theme') as Theme) ?? 'system' : 'system'
	);

	let systemDark = $state(
		browser ? matchMedia('(prefers-color-scheme: dark)').matches : false
	);

	let resolved = $derived<'light' | 'dark'>(
		userChoice === 'system' ? (systemDark ? 'dark' : 'light') : userChoice
	);

	// Listen for system changes
	if (browser) {
		const mq = matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', (e) => {
			systemDark = e.matches;
		});
	}

	// Apply .dark class to <html>
	$effect(() => {
		if (!browser) return;
		const html = document.documentElement;
		if (resolved === 'dark') {
			html.classList.add('dark');
		} else {
			html.classList.remove('dark');
		}
	});

	function cycle() {
		// Three-way: system → light → dark → system
		const order: Theme[] = ['system', 'light', 'dark'];
		const idx = order.indexOf(userChoice);
		userChoice = order[(idx + 1) % order.length];
		if (browser) {
			localStorage.setItem('koe-theme', userChoice);
		}
	}
</script>

<button class="theme-toggle" onclick={cycle} title="Bytt tema" aria-label="Tema: {userChoice}">
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
	<span class="theme-label">{userChoice === 'system' ? 'auto' : userChoice}</span>
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
