import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  resolve: {
    preserveSymlinks: true
  },
  test: {
    deps: {
			optimizer: {
				ssr: {
					enabled: true,
					include: ["vitest"],
				},
			},
		},
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});