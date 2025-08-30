import { JSONSchema } from 'json-schema-to-ts'
import { parser } from '@exodus/schemasafe'
import { github } from './moderation/github'
import { webhook } from './moderation/webhook'
import { moderation } from './moderation'
import { notify } from './notify'
import { comments } from './comments'
import { signet } from './signet'
import { make_config_parser, make_typed_parser, ConfigParser } from '../util'
import {
  mk_r3ply_singleton,
  R3plySiteConfig as R3plySignetConfigGenerated,
} from '../generate'
export const site = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply site config schema v0.0.1',
  description:
    "JSON Schema to describe a site's configuration for use with the r3ply commenting system. See https://r3ply.com for more info.",
  type: 'object',
  required: ['version', 'site', 'comments'],
  additionalProperties: false,
  properties: {
    version: {
      type: 'string',
      enum: ['0.0.1'],
      description: 'The version of the config file.',
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
        $ref: 'https://r3ply.com/schema/signet',
      },
    },
    comments: {
      $ref: 'https://r3ply.com/schema/comments',
    },
  },
} as const satisfies JSONSchema
export const raw_site_parser = parser(site as any, {
  useDefaults: true,
  includeErrors: true,
  allErrors: true,
  schemas: [signet, comments, moderation, github, webhook, notify],
})
const site_parser: ConfigParser<R3plySignetConfigGenerated> =
  make_config_parser(
    make_typed_parser<R3plySignetConfigGenerated>(raw_site_parser),
  )
export const R3plySiteConfig = mk_r3ply_singleton(site_parser)
export type R3plySiteConfig = R3plySignetConfigGenerated
