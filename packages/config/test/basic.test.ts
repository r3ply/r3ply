import { describe, expect, test } from 'vitest'
import { R3plySiteConfig as imported_r3ply_site_config_parser } from '../src/schema/site'
import { R3plySiteConfig as compiled_r3ply_site_config_parser } from '../dist'
import { R3plySystemConfig as imported_r3ply_system_config_parser } from '../src/schema/r3ply'
import { R3plySystemConfig as compiled_r3ply_system_config_parser } from '../dist'
// A list of implementations of the parser that are to be tested under the same conditions
const site_implementations: [
  string,
  typeof imported_r3ply_site_config_parser,
][] = [
  ['Parser [Imported TS]', imported_r3ply_site_config_parser],
  // ['Parser [Statically Compiled]', compiled_r3ply_site_config_parser],
]

// The tests here loop through the `implementations` and apply all the tests to each one
describe.each(site_implementations)('%s', (_, SiteConfig) => {
  test('site', async () => {
    const config = `version = "0.0.1"

[[site]]
domain = "example.com"
r3ply = "r3ply.com"
signet = "qhQ6YSUvQNLb1lCds3kDRg"
issued = 2025-08-22

[comments.email]
attachments = false

[[comments.email.moderation]]
type = 'github'
owner = "asimpletune"
repo = "spenc.es"
"file_path_{}" = "abc"
"allow*" = []
`

    const result = SiteConfig.parse(config).value!
    const gen1 = SiteConfig({ site: result.site })
    expect(gen1.valid).toBe(true)
  })
})

// A list of implementations of the parser that are to be tested under the same conditions
const r3ply_implementations: [
  string,
  typeof imported_r3ply_system_config_parser,
][] = [
  ['Parser [Imported TS]', imported_r3ply_system_config_parser],
  ['Parser [Statically Compiled]', compiled_r3ply_system_config_parser],
]
describe.each(r3ply_implementations)('%s', (_, SystemConfig) => {
  test('system', async () => {
    const config = `version = "0.0.1"
domains = ["r3ply.com"]
[[admin]]
name = "Herman Toothrot"
email = "monkeyisland@lucasfilm.com"
`
    const result = SystemConfig.parse(config)
    console.log('SYSTEM')

    console.log(result)

    // const gen1 = R3plySystemConfig({ site: result.site })
    // expect(gen1.valid).toBe(true)
  })
})
