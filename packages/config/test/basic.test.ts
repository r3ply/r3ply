import { describe, expect, test } from 'vitest'
import {
  R3plySiteConfig as imported_r3ply_site_config_parser,
  R3plySystemConfig as imported_r3ply_system_config_parser,
} from '../src/schema'
import {
  R3plySiteConfig as compiled_r3ply_site_config_parser,
  R3plySystemConfig as compiled_r3ply_system_config_parser,
} from '../dist'
// A list of implementations of the parser that are to be tested under the same conditions
const site_implementations: [
  string,
  typeof imported_r3ply_site_config_parser,
][] = [
  ['R3plySiteConfig [Imported TS]', imported_r3ply_site_config_parser],
  ['R3plySiteConfig [Statically Compiled]', compiled_r3ply_site_config_parser],
]

// The tests here loop through the `implementations` and apply all the tests to each one
describe.each(site_implementations)('%s', (_, SiteConfig) => {
  test('minimal site config', async () => {
    const generated_min_config = SiteConfig({
      site: [],
      comments: { email: {} },
    })
    const toml = `
    site = []
    [comments.email]`
    const parsed_min_config = SiteConfig.parse(toml)
    expect(parsed_min_config.valid).toBe(true)
    expect(generated_min_config.valid).toBe(true)
    expect(parsed_min_config.value!).toStrictEqual(generated_min_config.value!)
  })
})

// A list of implementations of the parser that are to be tested under the same conditions
const r3ply_implementations: [
  string,
  typeof imported_r3ply_system_config_parser,
][] = [
  ['R3plySystemConfig [Imported TS]', imported_r3ply_system_config_parser],
  [
    'R3plySystemConfig [Statically Compiled]',
    compiled_r3ply_system_config_parser,
  ],
]
describe.each(r3ply_implementations)('%s', (_, SystemConfig) => {
  test('system', async () => {
    const config = `domains = ["foo"]`
    const gen_system_config = SystemConfig({
      domains: ['foo'],
    })
    const parsed_system_config = SystemConfig.parse(config)
    expect(gen_system_config.valid).toBe(true)
    expect(parsed_system_config.valid).toBe(true)
    expect(parsed_system_config.value).toStrictEqual(gen_system_config.value)
  })
})
