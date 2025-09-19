import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { extra } from './extra'
import { signet } from './signet'
import { comments, email } from './comments'
import { moderation, github, webhook, local } from './moderation'
import { notify } from './notify'
import { make_config_parser, make_typed_parser, ConfigParser } from '../util'
import { mk_site_singleton } from '../codegen/site'
import { parser, Schema } from '@exodus/schemasafe'
export const site = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/site.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply config',
  description:
    'Describe a configuration for use with the r3ply commenting system. See https://r3ply.com/docs for more info.',
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    version: {
      title: 'r3ply version',
      description: 'Declares what version of r3ply this config conforms to.',
      type: 'string',
      enum: ['0.0.1'],
      default: '0.0.1',
    },
    enabled: {
      title: 'Toggle on/off',
      description: 'Turn off r3ply altogether. Default is true.',
      type: 'boolean',
      default: true,
    },
    site: {
      title: 'New site configuration',
      description:
        'Declares a new site this config applies to, consisting of domain x r3ply service, and signet. See docs for more info.',
      type: 'array',
      items: {
        $ref: 'https://r3ply.com/schemas/v0.0.1/config/signet.v0.0.1.json',
      },
      default: [],
    },
    comments: {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/comments.v0.0.1.json',
    },
    moderation: {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json',
    },
    extra: {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/extra.v0.0.1.json',
    },
  },
} as const satisfies JSONSchema & Schema
export const raw_site_parser = parser(site, {
  useDefaults: true,
  includeErrors: true,
  allErrors: true,
  schemas: [
    extra,
    signet,
    comments,
    email,
    moderation,
    github,
    webhook,
    local,
    notify,
  ],
})
export const site_schema = raw_site_parser.toJSON()
const site_parser: ConfigParser<R3plySiteConfig> = make_config_parser(
  make_typed_parser<R3plySiteConfig>(raw_site_parser),
)
export const R3plySiteConfig = mk_site_singleton(site_parser)
export type R3plySiteConfig = FromSchema<
  typeof site,
  {
    references: [
      typeof extra,
      typeof signet,
      typeof comments,
      typeof email,
      typeof moderation,
      typeof github,
      typeof webhook,
      typeof local,
      typeof notify,
    ]
  }
>
export type MinimalR3plySiteConfig = FromSchema<
  typeof site,
  {
    keepDefaultedPropertiesOptional: true
    references: [
      typeof extra,
      typeof signet,
      typeof comments,
      typeof email,
      typeof moderation,
      typeof github,
      typeof webhook,
      typeof local,
      typeof notify,
    ]
  }
>
