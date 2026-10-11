import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Kjøres fra `kjor.sh`, ikke av `npm test` i roten (#395).
export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  test: {
    include: ['prove/azuresql/tester/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 300_000,
  },
});
