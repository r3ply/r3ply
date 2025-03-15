import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { parser as schemasafe_parser, ParseResult } from '@exodus/schemasafe'

export const schema_ts = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply system config schema v0.0.1',
  description:
    'JSON Schema to describe the configuration of a r3ply system. See https://r3ply.com for more info.',
  type: 'object',
  required: ['version', 'domain', 'admin'],
  additionalProperties: false,
  properties: {
    version: {
      description:
        'used to determine what version of the schema to use (and the version of r3ply)',
      type: 'string',
      enum: ['0.0.1'],
    },
    domain: {
      description:
        'this is the domain that is hosting the r3ply system, e.g. where emails are sent to',
      type: 'string',
      pattern:
        '^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.(?!-)(?:[A-Za-z0-9-]{1,63}\\.)*[A-Za-z]{2,63}$',
      maxLength: 253,
      examples: ['r3ply.com'],
    },
    enabled: {
      description: 'If false, system will skip any requests it receives',
      type: 'boolean',
      default: true,
    },
    sites: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[\\S]*$',
        maxLength: 128,
      },
      default: ['*'],
    },
    admin: {
      type: 'array',
      description: 'list of system-wide admins',
      minItems: 1,
      maxItems: 99,
      uniqueItems: true,
      items: {
        description: 'a name + email pair of each admin',
        type: 'object',
        required: ['name', 'email'],
        additionalProperties: false,
        properties: {
          name: {
            description: 'human readble name of the admin',
            type: 'string',
            pattern: '^[\\s\\S]*$',
            examples: ['Guybrush Threepwood'],
          },
          email: {
            description: 'the email of the admin',
            type: 'string',
            format: 'email',
            examples: ['guybrush@example.com'],
            $comment:
              'Do not use mailbox format, e.g. "Le Chuck GP <ghostlechuck@lucasart.com>"',
          },
        },
      },
    },
    email: {
      description:
        'Configure parameters related to processing comments via email for sites',
      type: 'object',
      required: [],
      additionalProperties: false,
      default: {
        enabled: true,
        moderation: false,
        attachments: true,
        max_size_bytes: 5242880,
        block_list: [],
      },
      properties: {
        enabled: {
          description: 'If false, all emails are ignored',
          type: 'boolean',
          default: true,
          $comment:
            '⚠️: if disabled, site configs for `enabed` will be ignored',
        },
        moderation: {
          description:
            'If false, replies to comments from site moderators are ignored',
          type: 'boolean',
          default: true,
          $comment:
            'Note: emails concerning moderation MUST have dkim, dmarc, and spf enabled',
        },
        max_size_bytes: {
          description:
            'Emails are ignored if their size (in bytes) exceed the min(system, site) configs',
          type: 'number',
          default: 5242880,
          $comment: 'Note: default is 5 MB',
          minimum: 0,
        },
        attachments: {
          description: 'If false attachments are ignored',
          type: 'boolean',
          default: false,
          $comment:
            'Warning: if disabled, site configs for attachments will be ignored',
        },
        block_list: {
          description:
            'system-wide block list, works upstream of site blocklists',
          type: 'array',
          default: [],
          items: {
            type: 'string',
            pattern: '^[\\s\\S]*$',
          },
          $comment:
            'globbing patterns can be used, otherwise matches must be exact',
        },
      },
    },
  },
} as const satisfies JSONSchema
export const schema_str = JSON.stringify(schema_ts)
export const schema = JSON.parse(schema_str)
const raw_parser_str = schemasafe_parser(schema, {
  useDefaults: true,
  includeErrors: true,
  allErrors: true,
}).toModule()
const raw_parser = eval(raw_parser_str)
export type TypedParseResult<T> = Omit<ParseResult, 'value'> & {
  value?: T
}
export type R3plySystemConfig = FromSchema<typeof schema_ts>
export const parser = (input: string) => {
  let parse_result = raw_parser(input) as ParseResult
  return parse_result as TypedParseResult<R3plySystemConfig>
}

export const module = `/** This file is generated. DO NOT EDIT. */
import { ParseResult } from '@exodus/schemasafe'
import { FromSchema } from 'json-schema-to-ts'

const schema = ${JSON.stringify(schema)} as const;

type TypedParseResult<T> = Omit<ParseResult, 'value'> & {
  value?: T
}

export type R3plySystemConfig = FromSchema<typeof schema>

// The generated raw parser function.
const raw_parser = ${raw_parser_str}

// A wrapper that adds type safety.
export const parser = (input: string): TypedParseResult<R3plySystemConfig> => {
  const parse_result = raw_parser(input) as ParseResult
  return parse_result as TypedParseResult<R3plySystemConfig>
}
`
