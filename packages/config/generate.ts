import { writeFileSync, mkdirSync } from 'fs'
import {
  module as site_config_module,
  site_schema as site_config_schema,
} from './src/schema/site.config.0.0.1'
import {
  module as system_config_module,
  schema as system_config_schema,
} from './src/schema/system.config.0.0.1'

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

export type { R3plySiteConfig } from './site.config.parser'
export type { R3plySignetConfig } from '../subschema/signet'
export type { R3plyNotifyConfig } from '../subschema/notify'
export type { R3plyModerationConfig } from '../subschema/moderation/moderation'
export type { R3plyCommentsConfig } from '../subschema/comments'

export { parser as systemConfigParser } from './system.config.parser'
// import { parser as systemConfigParser } from './system.config.parser'
export { parser as siteConfigParser } from './site.config.parser'
export type { R3plySystemConfig } from './system.config.parser'

import { make_generic_parser } from '../util'
import { parser } from './site.config.parser'
import { site } from '../site.config.0.0.1'
import { FromSchema } from 'json-schema-to-ts'

// export type R3plySiteConfig = FromSchema<typeof site>
// export const R3plySiteConfig: any = {}
// R3plySiteConfig['parse'] = make_generic_parser<R3plySiteConfig>(parser)
// export const foo = make_generic_parser(systemConfigParser)


`
writeFileSync('./src/generated/index.ts', index_ts)
writeFileSync(
  './src/generated/site.config.schema.json',
  JSON.stringify(site_config_schema, null, 2),
)
writeFileSync(
  './src/generated/system.config.schema.json',
  JSON.stringify(system_config_schema, null, 2),
)
