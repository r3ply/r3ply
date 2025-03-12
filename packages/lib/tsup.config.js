// packages/lib/tsup.config.js
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/r3ply.ts'],
  dts: true,
  clean: true,
  define: {
    'import.meta.vitest': 'false', // Strip test code
  },
  loader: {
    '.eml': 'text', // Handle .eml files as text
  },
  target: 'es2022', // Allow top-level await
  format: 'esm', // Force ESM output (avoid CJS errors)
});