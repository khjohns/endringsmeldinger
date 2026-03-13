<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';
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
		<Sun class="theme-icon" size={14} strokeWidth={2} aria-hidden="true" />
	{:else}
		<Moon class="theme-icon" size={14} strokeWidth={2} aria-hidden="true" />
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
