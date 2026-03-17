import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		conditions: ['browser', 'svelte']
	},
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true
			}
		}
	},
	test: {
		include: ['src/**/*.test.ts'],
		environmentMatchGlobs: [
			['src/lib/components/**/*.test.ts', 'jsdom']
		],
		setupFiles: ['src/test-setup.ts']
	}
});
