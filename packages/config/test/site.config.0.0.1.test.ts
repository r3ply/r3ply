import { describe, expect } from 'vitest'
import {
  schema_ts,
  R3plySiteConfig,
  parser as imported_r3ply_site_config_parser,
  module,
  TypedParseResult,
} from '../src/site.config.0.0.1'
import esbuild from 'esbuild'

import { test } from 'vitest'

import { siteConfigParser as compiled_r3ply_site_config_parser } from '../dist/index.cjs'

// This code dynamically compiles the code made produced by the schema's 'module'
async function transpileAndImport(code: string) {
  const result = await esbuild.transform(code, {
    loader: 'ts',
    target: 'es2019',
  })
  const dataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(result.code)}`
  return import(dataUrl)
}
const dynamically_compiled_r3ply_site_config_parser = (
  await transpileAndImport(module)
).parser

// Create a type alias for the schema's parser's interface, a fn that takes string and returns a config
type R3plyConfigParser = (input: string) => TypedParseResult<R3plySiteConfig>

// A list of implementations of the parser that are to be tested under the same conditions
const implementations: [string, R3plyConfigParser][] = [
  ['Parser [Imported TS]', imported_r3ply_site_config_parser],
  [
    'Parser [Dynamically Compiled]',
    dynamically_compiled_r3ply_site_config_parser,
  ],
  ['Parser [Statically Compiled]', compiled_r3ply_site_config_parser],
]

// The tests here loop through the `implementations` and apply all the tests to each one
describe.each(implementations)('%s', (_, parse) => {
  let webhook_test = { type: 'webhook', url: 'https://example.com' }
  let github_test = {
    type: 'github',
    repo: 'https://github.com/example/your-repo',
    'file_path_{}': '{{ comment.id }}.txt',
  }
  const minimum_config = {
    version: '0.0.1',
    domain: 'example.com',
    r3ply: ['r3ply.com', 'my-test-r3ply-server.com'],
    comments: { email: { moderation: webhook_test } },
  }
  test('configs must be well formed', () => {
    expect(parse('').valid).toBe(false)
    expect(parse('just some text').valid).toBe(false)
    expect(parse('{}').valid).toBe(false)
    expect(parse('{ version: "0.0.1" }').valid).toBe(false)
  })
  test('the minimum config parses', () =>
    expect(parse(JSON.stringify(minimum_config)).valid).toBe(true))
  test('additional properties forbidden at top-level', () =>
    expect(
      parse(JSON.stringify({ ...minimum_config, occupation: 'pirate' })).valid,
    ).toBe(false))
  describe('the root object', () => {
    describe('required fields', () => {
      let expected_fields = ['version', 'domain', 'r3ply', 'comments']
      test(`expected fields: ${JSON.stringify(expected_fields)}`, () =>
        expect(new Set(schema_ts.required)).toStrictEqual(
          new Set(expected_fields),
        ))
      test('version number must be valid', () => {
        expect(
          parse(JSON.stringify({ ...minimum_config, version: '0.0.1' })).valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, version: '0.0.2' })).valid,
        ).toBe(false)
      })
      test('`domain` must be a valid hostname', () => {
        expect(
          parse(JSON.stringify({ ...minimum_config, domain: 'example.com' }))
            .valid,
        ).toBe(true)
        expect(
          parse(
            JSON.stringify({
              ...minimum_config,
              domain: 'subdomain.example.com',
            }),
          ).valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, domain: 'domain' })).valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, domain: 'localhost' }))
            .valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, domain: '127.0.0.1' }))
            .valid,
        ).toBe(true)
        expect(
          parse(
            JSON.stringify({
              ...minimum_config,
              domain: `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`,
            }),
          ).valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, domain: 'xn--v4h.com' }))
            .valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, domain: 'hello world' }))
            .valid,
        ).toBe(false)
        expect(
          parse(JSON.stringify({ ...minimum_config, domain: 'localhost:1234' }))
            .valid,
        ).toBe(false)
        expect(
          parse(
            JSON.stringify({ ...minimum_config, domain: 'https://google.com' }),
          ).valid,
        ).toBe(false)
        expect(
          parse(
            JSON.stringify({ ...minimum_config, domain: 'example.com/path/' }),
          ).valid,
        ).toBe(false)
        expect(
          parse(
            JSON.stringify({
              ...minimum_config,
              domain: `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(62)}`,
            }),
          ).valid,
        ).toBe(false)
        expect(
          parse(JSON.stringify({ ...minimum_config, domain: '☮️.com' })).valid,
        ).toBe(false)
      })
      test('`r3ply` must only have valid hostnames', () => {
        expect(
          parse(JSON.stringify({ ...minimum_config, r3ply: ['example.com'] }))
            .valid,
        ).toBe(true)
        expect(
          parse(
            JSON.stringify({
              ...minimum_config,
              r3ply: ['subdomain.example.com'],
            }),
          ).valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, r3ply: ['domain'] })).valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, r3ply: ['localhost'] }))
            .valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, r3ply: ['127.0.0.1'] }))
            .valid,
        ).toBe(true)
        expect(
          parse(
            JSON.stringify({
              ...minimum_config,
              r3ply: [
                `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`,
              ],
            }),
          ).valid,
        ).toBe(true)
        expect(
          parse(JSON.stringify({ ...minimum_config, r3ply: ['xn--v4h.com'] }))
            .valid,
        ).toBe(true)
        expect(
          parse(
            JSON.stringify({
              ...minimum_config,
              r3ply: ['example.com', 'not valid'],
            }),
          ).valid,
        ).toBe(false)
        expect(
          parse(JSON.stringify({ ...minimum_config, r3ply: ['hello world'] }))
            .valid,
        ).toBe(false)
        expect(
          parse(
            JSON.stringify({ ...minimum_config, r3ply: ['localhost:1234'] }),
          ).valid,
        ).toBe(false)
        expect(
          parse(
            JSON.stringify({
              ...minimum_config,
              r3ply: ['https://google.com'],
            }),
          ).valid,
        ).toBe(false)
        expect(
          parse(
            JSON.stringify({ ...minimum_config, r3ply: ['example.com/path/'] }),
          ).valid,
        ).toBe(false)
        expect(
          parse(
            JSON.stringify({
              ...minimum_config,
              r3ply: [
                `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(62)}`,
              ],
            }),
          ).valid,
        ).toBe(false)
        expect(
          parse(JSON.stringify({ ...minimum_config, r3ply: ['☮️.com'] })).valid,
        ).toBe(false)
      })
    })
    describe('optional fields', () => {
      let optional_fields = new Set(
        Object.keys(schema_ts.properties).filter((field) =>
          (schema_ts.required as any).includes(field) ? false : true,
        ),
      )
      test(`expected optional fields: ${JSON.stringify(['enabled'])}`, () =>
        expect(optional_fields).toStrictEqual(new Set(['enabled'])))
      let default_fields = Object.entries(schema_ts.properties)
        .filter(
          (field, _) => optional_fields.has(field[0]) && 'default' in field[1],
        )
        .map((field) => field[0])
      test(`expected default fields: ${JSON.stringify(['enabled'])}`, () =>
        expect(new Set(default_fields)).toStrictEqual(new Set(['enabled'])))
      describe('expected default values', () => {
        test('`enabled` should be true', () => {
          let config = parse(JSON.stringify(minimum_config)).value!
          expect((config.enabled = true))
        })
      })
    })
  })
  describe('the `comments` object', () => {
    let comments_subschema = schema_ts.definitions.comments_config
    describe(`required fields`, () => {
      test(`expected fields: ${JSON.stringify(['email'])}`, () =>
        expect(new Set(['email'])).toStrictEqual(
          new Set(comments_subschema.required),
        ))
      describe('the `email` object', () => {
        let email_subschema = comments_subschema.properties.email
        describe('required fields', () => {
          let required_fields = ['moderation']
          test(`expected fields: ${JSON.stringify(required_fields)}`, () =>
            expect(new Set(required_fields)).toStrictEqual(
              new Set(email_subschema.required),
            ))
          describe('email moderation', () => {
            let moderation_subschema = schema_ts.definitions.moderation_config
            describe('required fields', () => {
              let moderation_required_fields = ['type']
              test(`expected fields: ${JSON.stringify(moderation_required_fields)}`, () =>
                expect(new Set(moderation_required_fields)).toStrictEqual(
                  new Set(moderation_subschema.required),
                ))
              let moderation_types = [
                { enum: ['github'] },
                { enum: ['webhook'] },
              ]
              test(`expected moderation types: ${JSON.stringify(moderation_types)}`, () =>
                expect(moderation_types).toStrictEqual(
                  moderation_subschema.oneOf.map(
                    (mod_type) => mod_type.properties.type,
                  ),
                ))
              test('type: github moderation', () => {
                let github_subschema =
                  schema_ts.definitions.moderation_config.oneOf[0]
                // first test required values
                expect(new Set(['repo', 'type', 'file_path_{}'])).toStrictEqual(
                  new Set(github_subschema.required),
                )
                // first test required values
                let github_moderation = parse(
                  JSON.stringify({
                    ...minimum_config,
                    comments: { email: { moderation: github_test } },
                  }),
                ).value!.comments.email.moderation
                if (github_moderation.type != 'github') expect.fail()
                expect(github_moderation.repo).toBe(github_test.repo)
                expect(github_moderation['file_path_{}']).toBe(
                  github_test['file_path_{}'],
                )
                // GitHub api doesn't allow leading slashes for file paths!
                expect(
                  parse(
                    JSON.stringify({
                      ...minimum_config,
                      comments: {
                        email: {
                          moderation: {
                            ...github_test,
                            'file_path_{}': '/comment.txt',
                          },
                        },
                      },
                    }),
                  ).valid,
                ).toBe(false)
                expect(
                  parse(
                    JSON.stringify({
                      ...minimum_config,
                      comments: {
                        email: {
                          moderation: {
                            ...github_test,
                            'file_path_{}': '     /comment.txt',
                          },
                        },
                      },
                    }),
                  ).valid,
                ).toBe(false)
                // then test optional values
                let optional_fields = new Set(
                  Object.keys(github_subschema.properties).filter((field) =>
                    (github_subschema.required as any).includes(field)
                      ? false
                      : true,
                  ),
                )
                expect(
                  new Set([
                    'allow_list',
                    'commit_msg_{}',
                    'pr_body_{}',
                    'pr_title_{}',
                    'target_branch_{}',
                    'source_branch',
                    'enabled',
                  ]),
                ).toStrictEqual(optional_fields)
                expect(github_moderation.allow_list).toStrictEqual([])
                expect(github_moderation['commit_msg_{}']).toBe('TODO')
                expect(github_moderation['pr_body_{}']).toBe('TODO')
                expect(github_moderation['pr_title_{}']).toBe('TODO')
                expect(github_moderation['target_branch_{}']).toBe(
                  'comment-{{ comment.ts_rcvd }}-{{ comment.id_8 }}.md',
                )
                expect(github_moderation['source_branch']).toBe('main')
                expect(github_moderation['enabled']).toBe(true)
              })
              test('type: webhook moderation', () => {
                let webhook_subschema =
                  schema_ts.definitions.moderation_config.oneOf[1]
                // first test required values
                expect(new Set(['url', 'type'])).toStrictEqual(
                  new Set(webhook_subschema.required),
                )
                let webhook_moderation = parse(
                  JSON.stringify({
                    ...minimum_config,
                    comments: { email: { moderation: webhook_test } },
                  }),
                ).value!.comments.email.moderation
                if (webhook_moderation.type != 'webhook') expect.fail()
                expect(webhook_moderation.url).toBe(webhook_test.url)
                // then test optional values
                let optional_fields = new Set(
                  Object.keys(webhook_subschema.properties).filter((field) =>
                    (webhook_subschema.required as any).includes(field)
                      ? false
                      : true,
                  ),
                )
                expect(new Set(['allow_list', 'enabled'])).toStrictEqual(
                  optional_fields,
                )
                expect(webhook_moderation.allow_list).toStrictEqual([])
                expect(webhook_moderation.enabled).toBe(true)
              })
            })
          })
        })
        describe('optional fields', () => {
          let optional_fields = new Set(
            Object.keys(comments_subschema.properties.email.properties).filter(
              (field) =>
                (email_subschema.required as any).includes(field)
                  ? false
                  : true,
            ),
          )
          let expected_optional_fields = [
            'enabled',
            'subject',
            'attachments',
            'max_size_bytes',
            'block_list',
            'comment_{}',
            'comment_{}_mime',
            'notify',
            'comment_separator',
          ].sort()
          test(`expected fields: ${JSON.stringify(expected_optional_fields)}`, () =>
            expect(new Set(expected_optional_fields)).toStrictEqual(
              optional_fields,
            ))
          describe('default fields', () => {
            let default_fields = Object.entries(email_subschema.properties)
              .filter(
                (field, _) =>
                  optional_fields.has(field[0]) && 'default' in field[1],
              )
              .map((field) => field[0])
            let expected_defaults: [
              string,
              { field: string; expected_value: any; test: boolean },
            ][] = [
              [
                '`attachments` is false',
                { test: true, field: 'attachments', expected_value: false },
              ],
              [
                '`block_list` is []',
                { test: true, field: 'block_list', expected_value: [] },
              ],
              [
                '`enabled` is true',
                { test: true, field: 'enabled', expected_value: true },
              ],
              [
                '`max_size_bytes` is 1 MB',
                {
                  test: true,
                  field: 'max_size_bytes',
                  expected_value: 1048576,
                },
              ],
              [
                '[notify test skipped, see dedicated notified test]',
                {
                  field: 'notify',
                  expected_value: 'see dedicated notify test',
                  test: false,
                },
              ],
              [
                '`subject` is "path',
                { test: true, field: 'subject', expected_value: 'url' },
              ],
              [
                '`comment_separator` is \n',
                {
                  test: true,
                  field: 'comment_separator',
                  expected_value: '\n',
                },
              ],
              [
                '`comment_{}_mime` is "text/plain"',
                {
                  test: true,
                  field: 'comment_{}_mime',
                  expected_value: 'text/plain',
                },
              ],
            ]
            let expected_default_fields = expected_defaults
              .map((field_default) => field_default[1].field)
              .sort()
            test(`expected default fields: ${JSON.stringify(expected_default_fields)}`, () =>
              expect(
                new Set(
                  expected_defaults.map(
                    (field_default) => field_default[1].field,
                  ),
                ),
              ).toStrictEqual(new Set(default_fields)))
            let email = parse(JSON.stringify(minimum_config)).value!.comments
              .email
            test.each(expected_defaults)(
              '%s',
              (_, { field, expected_value, test }) => {
                if (test)
                  expect((email as any)[field]).toStrictEqual(expected_value)
              },
            )
            describe('`notify` configuration', () => {
              let notify_subschema = schema_ts.definitions.notify_config

              describe('required fields', () => {
                let expected_required_fields: string[] = []
                test(`expected fields: ${JSON.stringify(expected_required_fields)}`, () =>
                  expect(new Set([])).toStrictEqual(
                    new Set(notify_subschema.required),
                  ))
              })
              describe('optional fields', () => {
                let optional_fields = new Set(
                  Object.keys(notify_subschema.properties).filter((field) =>
                    (notify_subschema.required as any).includes(field)
                      ? false
                      : true,
                  ),
                )
                let expected_optional_fields = [
                  'commenter',
                  'notify_commenter_upon_submission',
                  'comment_submitted_notif_{}',
                  'moderator',
                  'notify_moderator_upon_receipt',
                  'comment_received_notif_{}',
                ]
                test(`expected fields: ${JSON.stringify(expected_optional_fields)}`, () => {
                  expect(new Set(expected_optional_fields)).toStrictEqual(
                    new Set(optional_fields),
                  )
                })
                let default_fields = Object.entries(notify_subschema.properties)
                  .filter(
                    (field, _) =>
                      optional_fields.has(field[0]) && 'default' in field[1],
                  )
                  .map((field) => field[0])
                let expected_defaults: [
                  string,
                  { field: string; expected_value: any; test: boolean },
                ][] = [
                  [
                    '`commenter` is true',
                    { test: true, field: 'commenter', expected_value: true },
                  ],
                  [
                    '`notify_commenter_upon_submission` is true',
                    {
                      test: true,
                      field: 'notify_commenter_upon_submission',
                      expected_value: true,
                    },
                  ],
                  [
                    '`comment_submitted_notif_{}` is "TODO',
                    {
                      test: true,
                      field: 'comment_submitted_notif_{}',
                      expected_value: 'TODO',
                    },
                  ],
                  [
                    '`moderator` is true',
                    { test: true, field: 'moderator', expected_value: true },
                  ],
                  [
                    '`notify_moderator_upon_receipt` is "all"',
                    {
                      test: true,
                      field: 'notify_moderator_upon_receipt',
                      expected_value: 'all',
                    },
                  ],
                  [
                    '`comment_received_notif_{}` is "TODO',
                    {
                      test: true,
                      field: 'comment_received_notif_{}',
                      expected_value: 'TODO',
                    },
                  ],
                ]
                let expected_default_fields = expected_defaults.map(
                  (field_default) => field_default[1].field,
                )
                test(`expected default fields: ${JSON.stringify(expected_default_fields)}`, () =>
                  expect(new Set(expected_default_fields)).toStrictEqual(
                    new Set(default_fields),
                  ))
                test('expected fields', () =>
                  expect(
                    new Set(
                      expected_defaults.map(
                        (field_default) => field_default[1].field,
                      ),
                    ),
                  ).toStrictEqual(new Set(default_fields)))
                let notify = parse(JSON.stringify(minimum_config)).value!
                  .comments.email.notify
                test.each(expected_defaults)(
                  '%s',
                  (_, { field, expected_value, test }) => {
                    if (test)
                      expect((notify as any)[field]).toStrictEqual(
                        expected_value,
                      )
                  },
                )
              })
            })
          })
        })
      })
    })
    describe('optional fields', () => {
      let optional_fields = new Set(
        Object.keys(comments_subschema.properties).filter((field) =>
          (comments_subschema.required as any).includes(field) ? false : true,
        ),
      )
      let expected_optional_fields = [
        'enabled',
        'paths',
        'cache',
        'md_to_html',
        'sanitize_html',
        'allow_tags',
      ]
      test(`expected fields: ${JSON.stringify(expected_optional_fields)}`, () =>
        expect(new Set(expected_optional_fields)).toStrictEqual(
          optional_fields,
        ))
      let default_fields = Object.entries(comments_subschema.properties)
        .filter(
          (field, _) => optional_fields.has(field[0]) && 'default' in field[1],
        )
        .map((field) => field[0])
      let expected_default_fields = [
        'enabled',
        'paths',
        'cache',
        'md_to_html',
        'sanitize_html',
        'allow_tags',
      ]
      test(`expected defaults: ${JSON.stringify(expected_default_fields)}`, () =>
        expect(new Set(expected_default_fields)).toStrictEqual(
          new Set(default_fields),
        ))
      let expected_defaults: [
        string,
        { field: string; expected_value: any; test: boolean },
      ][] = [
        [
          '`enabled` is true',
          { test: true, field: 'enabled', expected_value: true },
        ],
        [
          '`paths` is `["/**"]`',
          { test: true, field: 'paths', expected_value: ['/**'] },
        ],
        [
          '`cache` is true',
          { test: true, field: 'cache', expected_value: true },
        ],
        [
          '`md_to_html` is true',
          { test: true, field: 'md_to_html', expected_value: true },
        ],
        [
          '`sanitize_html` is trie',
          { test: true, field: 'sanitize_html', expected_value: true },
        ],
        [
          '`allow_tags` uses default tags',
          {
            test: true,
            field: 'allow_tags',
            expected_value: [
              'a',
              'br',
              'p',
              'span',
              'strong',
              's',
              'del',
              'em',
              'u',
              'ul',
              'ol',
              'li',
              'blockquote',
              'hr',
              'code',
              'pre',
              'table',
              'tr',
              'td',
              'th',
              'caption',
              'thead',
              'tbody',
              'tfoot',
              'kbd',
              'mark',
              'sub',
              'small',
            ],
          },
        ],
      ]
      let comments = parse(JSON.stringify(minimum_config)).value!.comments
      test.each(expected_defaults)(
        '%s',
        (_, { field, expected_value, test }) => {
          if (test)
            expect((comments as any)[field]).toStrictEqual(expected_value)
        },
      )
    })
  })
})
