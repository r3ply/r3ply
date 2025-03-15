// packages/lib/tsup.config.js
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  clean: true,
  define: { 'import.meta.vitest': 'false' },
  loader: { '.eml': 'text' },
  target: 'es2022',
  format: ['esm', 'cjs'],
  outDir: 'dist',
})
