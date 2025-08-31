import { describe, expect, test } from 'vitest'
import { R3plySiteConfig as imported_r3ply_site_config_parser } from '../src/schema/site'
import { R3plySiteConfig as compiled_r3ply_site_config_parser } from '../dist'
import { R3plySystemConfig as imported_r3ply_system_config_parser } from '../src/schema/r3ply'
import { R3plySystemConfig as compiled_r3ply_system_config_parser } from '../dist'
import { FromExtendedSchema, FromSchema, JSONSchema } from 'json-schema-to-ts'
import { Schema } from '@exodus/schemasafe'
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
  // ['Parser [Statically Compiled]', compiled_r3ply_system_config_parser],
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

describe('code gen to derive minimum types', () => {
  const example = {
    type: "object",
    required: ['a', 'b', 'g'],
    properties: {
      a: {
        type: "string"
      },
      b: {
        type: "number",
        default: 123
      },
      c: {
        type: "boolean",
        default: false
      },
      d: {
        type: "null"
      },
      e: {
        type: "object",
        properties: {
          f: {
            type: "string",
          }
        },
        default: {
          f: "foo"
        }
      },
      g: {
        type: "object",
        required: ["h"],
        properties: {
          h: {
            const: "h",
          }
        }
      }
    }
  } as const satisfies JSONSchema & Schema
  type User3 = ApplyOptionals<User1, User2>;
  type User4 = ApplyOptionalsDeep<User1, User2>
  type User1 = FromSchema<typeof example>
  type User2 = FromSchema<
    typeof example,
    {
      deserialize: [
        {
          pattern: {
            default: {},
          },
          output: { required: false }
        },
        {
          pattern: {
            const: {},
          },
          output: { required: false }
        },
      ]
    }
  >
type ApplyOptionals<
  Base extends Record<string, any>,
  Markers extends Record<keyof Base, any>
> = {
  [K in keyof Base as Markers[K] extends { required: false } ? K : never]?: Base[K];
} & {
  [K in keyof Base as Markers[K] extends { required: false } ? never : K]: Base[K];
};

type ApplyOptionalsDeep<
  Base,
  Markers
> =
  // Case 1: marker says this is optional
  Markers extends { required: false }
    ? Base | undefined

    // Case 2: objects
    : Base extends Record<string, any>
      ? Markers extends Record<string, any>
        ? {
            [K in keyof Base as K extends keyof Markers
              ? Markers[K] extends { required: false } ? K : never
              : never]?: ApplyOptionalsDeep<Base[K], K extends keyof Markers ? Markers[K] : never>
          } & {
            [K in keyof Base as K extends keyof Markers
              ? Markers[K] extends { required: false } ? never : K
              : K]: ApplyOptionalsDeep<Base[K], K extends keyof Markers ? Markers[K] : never>
          }
        : Base
      // Case 3: arrays
      : Base extends Array<infer U>
        ? Markers extends Array<infer M>
          ? ApplyOptionalsDeep<U, M>[]
          : Base
        : Base;

  type user4 = ApplyOptionalsDeep<User1, User2>

})
