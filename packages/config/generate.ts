import { writeFileSync, mkdirSync } from 'fs'
import { module as site_config_module } from './src/site.config.0.0.1'
import { module as system_config_module } from './src/system.config.0.0.1'

// Write generated file
mkdirSync('./src/generated', { recursive: true })
writeFileSync(
  './src/generated/site.config.parser.ts',
  `// @ts-nocheck\n` + site_config_module,
)
writeFileSync(
  './src/generated/system.config.parser.ts',
  `// @ts-nocheck\n` + system_config_module,
)

// Note: you can uncomment this to help get editor support for exports
// export { parser as siteConfigParser } from './src/generated/site.config.parser'
// export type { R3plySiteConfig } from './src/generated/site.config.parser'
// export { parser as systemConfigParser } from './src/generated/system.config.parser'
// export type { R3plySystemConfig } from './src/generated/system.config.parser'

// Export generated files
let index_ts = `
export { parser as siteConfigParser } from './site.config.parser'
export type { R3plySiteConfig } from './site.config.parser'
export { parser as systemConfigParser } from './system.config.parser'
export type { R3plySystemConfig } from './system.config.parser'
`
writeFileSync('./src/generated/index.ts', index_ts)
