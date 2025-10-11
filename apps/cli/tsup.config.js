// packages/cli/tsup.config.js
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  onSuccess:
    'cp src/comment_generation/comments-markov-model.json dist/ || true',
  dts: true,
  clean: false,
  target: 'node20',
  outExtension: ({ format }) => ({
    // Add this
    js: format === 'esm' ? '.mjs' : '.js',
  }),
})
