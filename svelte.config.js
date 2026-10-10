import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
    // TS-kjernen (B-14, B-15). Grensetesten i src/lib/kjernegrense.test.ts holder kjerne/tester/ ute.
    alias: {
      $kjerne: 'kjerne',
    },
  },
};

export default config;
