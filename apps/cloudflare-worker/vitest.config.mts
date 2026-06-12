import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'

export default defineConfig({
  resolve: {
    alias: {
      mimetext: fileURLToPath(
        new URL(
          './node_modules/mimetext/dist/mimetext.browser.es.js',
          import.meta.url,
        ),
      ),
    },
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        d1Databases: { TEST_DB: { id: 'TEST_DB' } },
      },
    }),
  ],
  test: {
    includeSource: ['src/**/*.{js,ts}'],
  },
})
