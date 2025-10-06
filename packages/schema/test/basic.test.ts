import { describe, expect, test } from 'vitest'
import {
  R3plySiteConfig as imported_r3ply_site_config_parser,
  R3plySystemConfig as imported_r3ply_system_config_parser,
} from '@r3ply/schema/config'
import {
  R3plySiteConfig as compiled_r3ply_site_config_parser,
  R3plySystemConfig as compiled_r3ply_system_config_parser,
} from '../dist/generated'
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
    const generated_min_config = SiteConfig({})
    const toml = ``
    const parsed_min_config = SiteConfig.parse(toml)
    expect(parsed_min_config.valid).toBe(true)
    expect(generated_min_config.valid).toBe(true)
    expect(parsed_min_config.value!).toStrictEqual(generated_min_config.value!)
  })
  describe('moderation', async () => {
    const github_moderation = SiteConfig({
      moderation: {
        github: [
          {
            owner: 'bob',
            repo: 'blog',
            'file_path_{}': 'foo.txt',
          },
        ],
      },
    })
    const webhook_moderation = SiteConfig({
      moderation: {
        webhook: [
          {
            url: 'https://example.com/webook',
          },
        ],
      },
    })
    const local_moderation = SiteConfig({
      moderation: {
        local: [
          {
            'file_path_{}': 'foo.txt',
          },
        ],
      },
    })
    test('github', async () => {
      expect(github_moderation.valid).toBe(true)
      expect(github_moderation).toStrictEqual(
        SiteConfig.parse(`
      [[moderation.github]]
      owner = "bob"
      repo = "blog"
      'file_path_{}' = 'foo.txt'
      `),
      )
    })
    test('webhook', async () => {
      expect(webhook_moderation.valid).toBe(true)
      expect(webhook_moderation).toStrictEqual(
        SiteConfig.parse(`
      [[moderation.webhook]]
      url = "https://example.com/webook"
      `),
      )
    })
    test('local', async () => {
      expect(local_moderation.valid).toBe(true)
      expect(local_moderation).toStrictEqual(
        SiteConfig.parse(`
      [[moderation.local]]
      "file_path_{}" = "foo.txt"
      `),
      )
    })
    test('options', async () => {
      const github = github_moderation.value!.moderation?.github[0]!
      const webhook = webhook_moderation.value!.moderation?.webhook[0]!
      const local = local_moderation.value!.moderation?.local[0]!
      for (const options of [github, webhook, local]) {
        expect(options.enabled).toBe(true)
        expect(options['allow*']).toStrictEqual([])
        expect(options['filter*']).toBeUndefined()
        expect(options.comments).toBeUndefined()
      }
    })
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
