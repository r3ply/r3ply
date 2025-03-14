import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { defineConfig } from 'vitest/config.js';

export default defineWorkersConfig(({ mode }) => {
	return {
		resolve: {
			// preserveSymlinks: mode !== 'test',
			preserveSymlinks: false
		},
		test: {
			deps: {
				optimizer: {
					ssr: {
						enabled: true,
						include: ["@r3ply/wasm"],
					},
				},
			},
			poolOptions: {
				workers: {
					wrangler: { configPath: './wrangler.jsonc' },
				},
			},
		}
	}
})
