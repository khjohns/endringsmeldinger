import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/** Bygget av kjernen for nettleseren i språkprøven. Ingen rammeverk; appens oppsett brukes ikke. */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  logLevel: 'warn',
  build: { target: 'es2022', emptyOutDir: true },
});
