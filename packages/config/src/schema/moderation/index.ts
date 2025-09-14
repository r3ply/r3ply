import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { github } from './github'
import { webhook } from './webhook'
import { local } from './local'
import { options } from './options'
export * from './options'
export * from './github'
export * from './webhook'
export * from './local'

export const moderation = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Moderation configuration',
  description:
    "Configure the various channels, i.e. what should happen to comment after they've been processed.",
  type: 'object',
  required: [],
  unevaluatedProperties: false,
  properties: {
    enabled: {
      title: 'Toggle on/off',
      description: 'If false, moderation is off entirely. Default is true.',
      type: 'boolean',
      default: true,
    },
    github: {
      type: 'array',
      items: {
        $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/github.v0.0.1.json',
      },
      default: [],
    },
    webhook: {
      type: 'array',
      items: {
        $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json',
      },
      default: [],
    },
    local: {
      type: 'array',
      items: {
        $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/local.v0.0.1.json',
      },
      default: [],
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyModerationConfig = FromSchema<
  typeof moderation,
  {
    references: [typeof github, typeof webhook, typeof local, typeof options]
  }
>
