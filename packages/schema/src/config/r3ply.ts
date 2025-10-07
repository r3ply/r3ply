import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { parser, Schema } from '@exodus/schemasafe'
import { ConfigParser, make_config_parser, make_typed_parser } from '../util'
import { mk_r3ply_singleton } from '../codegen/r3ply'

export const r3ply = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/r3ply.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply system config schema v0.0.1',
  description:
    'JSON Schema to describe the configuration of a r3ply system. See https://r3ply.com for more info.',
  type: 'object',
  required: ['domains'],
  additionalProperties: false,
  properties: {
    version: {
      description:
        'used to determine what version of the schema to use (and the version of r3ply)',
      type: 'string',
      enum: ['0.0.1'],
      default: '0.0.1',
    },
    domains: {
      description: 'The r3ply domains that configuration applies to',
      type: 'array',
      items: [
        {
          type: 'string',
          format: 'hostname',
        },
      ],
      additionalItems: {
        type: 'string',
        format: 'hostname',
      },
      minItems: 1,
      examples: [['r3ply.com'], ['test.r3ply.com']],
      $comment: 'must match the domain that serves the config',
    },
    enabled: {
      description: 'If false, system will skip any requests it receives',
      type: 'boolean',
      default: true,
    },
    'sites*': {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[\\S]*$',
        maxLength: 128,
      },
      default: ['**'],
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
        attachments: false,
        max_size_bytes: 5242880,
        'block*': [],
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
          const: false,
          $comment:
            'Warning: if disabled, site configs for attachments will be ignored',
        },
        'block*': {
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
} as const satisfies JSONSchema & Schema
export const raw_system_parser = parser(r3ply, {
  useDefaults: true,
  includeErrors: true,
  allErrors: true,
})
export const system_parser: ConfigParser<R3plySystemConfig> =
  make_config_parser(make_typed_parser<R3plySystemConfig>(raw_system_parser))
export const R3plySystemConfig = mk_r3ply_singleton(system_parser)
export type R3plySystemConfig = FromSchema<typeof r3ply>
export type MinimalR3plySystemConfig = FromSchema<
  typeof r3ply,
  {
    keepDefaultedPropertiesOptional: true
  }
>
