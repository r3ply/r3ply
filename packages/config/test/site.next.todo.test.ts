import { describe, test } from 'vitest'
import { R3plySiteConfig as imported_r3ply_site_config_parser } from '../src/schema/site.config.0.0.1'
import { R3plySiteConfig as compiled_r3ply_site_config_parser } from '../dist'

// A list of implementations of the parser that are to be tested under the same conditions
const implementations: [string, typeof imported_r3ply_site_config_parser][] = [
  ['Parser [Imported TS]', imported_r3ply_site_config_parser],
  ['Parser [Statically Compiled]', compiled_r3ply_site_config_parser],
]

// The tests here loop through the `implementations` and apply all the tests to each one
describe.each(implementations)('%s', (_, SiteConfig) => {
  test('toml', async () => {
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

    // const result = site_parser(config)
    const result = SiteConfig.parse(config).value!
    const gen1 = SiteConfig({ site: result.site })
    console.log('GEN1')
    console.log(gen1)
    // expect(result.valid).toBe(true)
  })
})
