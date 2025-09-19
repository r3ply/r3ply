import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { github } from './github'
import { webhook } from './webhook'
import { local } from './local'
export * from './github'
export * from './webhook'
export * from './local'

/**
 * This schema was being used as a reference within [comments.ts](./comments.ts) at the key `moderation` (type: 'array'), but for some reason it was causing an `error TS2589: Type instantiation is excessively deep and possibly infinite.` error. Substituting the `oneOf` here for the reference fixed the issue but the underlying issue is still unclear.
 */
export const moderation = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Moderation configuration',
  description:
    "Configure the various channels, i.e. what should happen to comment after they've been processed.",
  type: 'object',
  definitions: {
    options: {
      title: 'Moderation options',
      description: 'Shared options across all moderation channels',
      type: 'object',
      required: [],
      properties: {
        enabled: {
          title: 'Toggle on/off',
          description:
            'If false, the moderation channel is off. Default is true.',
          type: 'boolean',
          default: true,
        },
        'allow*': {
          title: 'Allow list for this moderation channel',
          description:
            'If a comment author matches this list, e.g. their pseudonym, then that information will be passed to whatever is handling the moderation. Usually this will result in comment bypassing moderation, although it depends on how the moderation channel is implemented. The name that is matched against will depend on the upstream commenting channel. For example, comments via email will be a pseudo-anonymized string of the commenter\'s email address. The "allow*" name means glob syntax is allowed. Default is `[]`.',
          type: 'array',
          items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
          default: [],
          examples: ['*@alice.com', 'bob@example.com'],
          $comment: 'Glob pattern.',
        },
        comments: {
          title: 'Comment sources',
          description:
            'Specify which commenting sources to allow for this moderation channel. Default is all comment sources.',
          type: 'array',
          items: {
            enum: ['email'],
          },
          default: ['email'],
        },
        'filter*': {
          title: 'Filter site',
          description:
            "Specifies which sites, by label, will have comments moderated. The 'filter*' name means a glob pattern can be provided. See `site` config key for more details. Default is ['**'] (all sites).",
          type: 'array',
          items: { type: 'string', pattern: '^[\\s\\S]*$' },
          default: ['**'],
          examples: ['test*', '!local'],
        },
      },
    },
  },
  required: [],
  unevaluatedProperties: false,
  properties: {
    github: {
      type: 'array',
      items: {
        allOf: [
          {
            $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json#/definitions/options',
          },
          {
            $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/github.v0.0.1.json',
          },
        ],
      },
      default: [],
    },
    webhook: {
      type: 'array',
      items: {
        allOf: [
          {
            $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json#/definitions/options',
          },
          {
            $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json',
          },
        ],
      },
      default: [],
    },
    local: {
      type: 'array',
      items: {
        allOf: [
          {
            $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json#/definitions/options',
          },
          {
            $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/local.v0.0.1.json',
          },
        ],
      },
      default: [],
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyModerationConfig = FromSchema<
  typeof moderation,
  {
    references: [typeof moderation, typeof github, typeof webhook, typeof local]
  }
>
export type R3plyGithubConfig = R3plyModerationConfig['github'][number]
export type R3plyWebhookConfig = R3plyModerationConfig['webhook'][number]
export type R3plyLocalModerationConfig = R3plyModerationConfig['local'][number]
