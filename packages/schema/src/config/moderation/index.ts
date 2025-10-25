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
  title: 'Moderation config',
  description: 'Control the various moderation channels',
  $comment: "i.e. what should happen to comment after they've been processed.",
  type: 'object',
  definitions: {
    options: {
      title: 'Moderation options',
      description: 'Shared options across all moderation channels',
      type: 'object',
      required: [],
      properties: {
        enabled: {
          title: 'Enable moderation',
          description:
            'False completely turns off moderation for this channel.',
          type: 'boolean',
          default: true,
          $comment: 'See `moderation.enabled`.',
        },
        'allow*': {
          title: 'Allow list',
          description: 'Plain text email or pseudonym bypassing moderation.',
          type: 'array',
          items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
          default: [],
          examples: ['*@alice.com', 'bob@example.com'],
        },
        comments: {
          title: 'Comment sources',
          description:
            'Specify which commenting sources to allow for this moderation channel.',
          type: 'array',
          items: {
            enum: ['email'],
          },
        },
        'filter*': {
          title: 'Filter site',
          description: 'Specifies which sites (by label) will be processed.',
          type: 'array',
          items: { type: 'string', pattern: '^[\\s\\S]*$' },
          examples: ['*', '!local'],
        },
      },
    },
  },
  required: [],
  unevaluatedProperties: false,
  properties: {
    enabled: {
      title: 'Enable moderation',
      description: 'False completely disables moderation.',
      type: 'boolean',
      default: true,
    },
    github: {
      type: 'array',
      items: {
        $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/github.v0.0.1.json',
      },
      maxItems: 2,
      default: [],
    },
    webhook: {
      type: 'array',
      items: {
        $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json',
      },
      maxItems: 5,
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
    references: [typeof moderation, typeof github, typeof webhook, typeof local]
  }
>
// actually declaring `unevaluatedProperties` on options requires `anyOf`, which blows up the parser
export type R3plyModerationOptions = FromSchema<
  typeof moderation.definitions.options & { unevaluatedProperties: false }
>
export type R3plyGithubConfig = R3plyModerationConfig['github'][number]
export type R3plyWebhookConfig = R3plyModerationConfig['webhook'][number]
export type R3plyLocalModerationConfig = R3plyModerationConfig['local'][number]
export type R3plyModerationChannelType = Exclude<
  keyof R3plyModerationConfig,
  'enabled'
>
export type R3plyModerationChannelConfig = R3plyModerationConfig[Exclude<
  keyof R3plyModerationConfig,
  'enabled'
>][number]
