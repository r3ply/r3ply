import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { parser, Schema } from '@exodus/schemasafe'
import { ConfigParser, make_config_parser, make_typed_parser } from '../util'
import { mk_r3ply_singleton } from '../codegen/r3ply'

export const r3ply = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/r3ply.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply system config',
  description:
    'Used to configure a system that provides r3ply commenting functionality.',
  $comment: 'See https://r3ply.com/docs for more info.',
  type: 'object',
  required: ['domains'],
  additionalProperties: false,
  properties: {
    version: {
      title: 'r3ply version',
      description: 'Declares what version of r3ply this config conforms to.',
      type: 'string',
      enum: ['0.0.1'],
      default: '0.0.1',
    },
    domains: {
      title: 'r3ply domains',
      description: 'The domains that configuration applies to. Hostname only.',
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
      examples: [['r3ply.com', 'test.r3ply.com'], ['your-r3ply-app.com']],
      $comment: 'must match the domain that serves the config',
    },
    enabled: {
      title: 'Enable r3ply',
      description:
        'False completely turns off r3ply, including any downstream processes.',
      type: 'boolean',
      default: true,
      $comment: '⚠️: if disabled, downstream sites will be affected.',
    },
    'sites*': {
      title: 'Allowed sites',
      description: 'Specifies what sites to accepts comments on behalf of.',
      $comment: 'If undefined then all sites are allowed.',
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[\\S]*$',
        maxLength: 128,
      },
    },
    admin: {
      type: 'array',
      title: 'Admin',
      description: 'Contact list for r3ply system admins.',
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
      title: 'Email processing',
      description:
        'Configure parameters related to processing comments via email for sites.',
      type: 'object',
      required: [],
      additionalProperties: false,
      default: {
        enabled: true,
        attachments: false,
        max_size_bytes: 5242880,
      },
      properties: {
        enabled: {
          title: 'Enable email comments',
          description: 'If false, all emails are ignored.',
          type: 'boolean',
          default: true,
          $comment: '⚠️: if disabled, downstream sites will be affected.',
        },
        max_size_bytes: {
          title: 'Max size (bytes)',
          description:
            'Emails are ignored if their size (in bytes) exceed the min(system, site) configs',
          type: 'number',
          default: 5242880,
          $comment: 'i.e. 5 MB.',
          minimum: 0,
        },
        attachments: {
          title: 'Email attachments',
          description:
            'Attachments are currently disabled but support will be added in the future.',
          const: false,
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
