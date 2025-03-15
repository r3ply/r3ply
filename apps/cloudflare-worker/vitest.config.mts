import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  resolve: {
    preserveSymlinks: false,
  },
  test: {
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ['@r3ply/wasm'],
        },
      },
    },
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          d1Databases: ['TEST_DB'],
        },
      },
    },
  },
})
