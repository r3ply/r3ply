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
  title: 'r3ply schema for moderation of comments via email',
  description:
    "JSON Schema to configure what should happen to comments received via email, after they've been processed.",
  type: 'object',
  definitions: {
    options: {
      type: 'object',
      required: [],
      properties: {
        enabled: {
          type: 'boolean',
          description: 'If false, comment is not sent for moderation.',
          default: true,
        },
        'allow*': {
          type: 'array',
          description: 'Pseudonym/email address allow list.',
          items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
          default: [],
          examples: ['*@alice.com', 'bob@example.com'],
          $comment: 'Glob pattern.',
        },
        comments: {
          type: 'array',
          items: {
            enum: ['email'],
          },
          default: ['email'],
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
            $ref: 'https://r3ply.com/schemas/v0.0.1/config/github.v0.0.1.json',
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
            $ref: 'https://r3ply.com/schemas/v0.0.1/config/webhook.v0.0.1.json',
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
          { $ref: 'https://r3ply.com/schemas/v0.0.1/config/local.v0.0.1.json' },
        ],
      },
      default: [],
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyModerationConfig = FromSchema<
  typeof moderation,
  {
    references: [typeof github, typeof webhook, typeof local]
  }
>
