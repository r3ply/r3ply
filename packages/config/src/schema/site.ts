import {
  FromSchema,
  FromSchemaDefaultOptions,
  JSONSchema,
} from 'json-schema-to-ts'
import {
  signet,
  comments,
  moderation,
  notify,
  github,
  // webhook,
} from '../schema'
import { make_config_parser, make_typed_parser, ConfigParser } from '../util'
import { mk_site_singleton } from '../codegen/site'
import { parser, Schema } from '@exodus/schemasafe'
export const site = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/site.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply site config schema v0.0.1',
  description:
    "JSON Schema to describe a site's configuration for use with the r3ply commenting system. See https://r3ply.com for more info.",
  type: 'object',
  required: ['site', 'comments'],
  additionalProperties: false,
  properties: {
    version: {
      type: 'string',
      enum: ['0.0.1'],
      description: 'The version of the config file.',
      default: '0.0.1',
    },
    enabled: {
      type: 'boolean',
      description:
        'Comments will not be processed if set to false. Default is true.',
      default: true,
    },
    site: {
      type: 'array',
      items: {
        $ref: 'https://r3ply.com/schemas/v0.0.1/config/signet.v0.0.1.json',
      },
      default: [],
    },
    comments: {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/comments.v0.0.1.json',
    },
  },
} as const satisfies JSONSchema & Schema
export const raw_site_parser = parser(site, {
  useDefaults: true,
  includeErrors: true,
  allErrors: true,
  schemas: [
    signet,
    comments,
    moderation,
    github,
    // webhook,
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
  FromSchemaDefaultOptions & {
    // prettier-ignore
    references: [ typeof signet, typeof comments, typeof moderation, typeof github,
      // typeof webhook,
      typeof notify]
  }
>
export type MinimalR3plySiteConfig = FromSchema<
  typeof site,
  {
    keepDefaultedPropertiesOptional: true
    // prettier-ignore
    references: [ typeof signet, typeof comments, typeof moderation, typeof github,
      // typeof webhook,
      typeof notify]
  }
>
